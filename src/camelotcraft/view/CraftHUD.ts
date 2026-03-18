// ---------------------------------------------------------------------------
// Camelot Craft – HUD (hotbar, health, inventory, crafting, quests, messages)
// ---------------------------------------------------------------------------

import { CB } from "../config/CraftBalance";
import { BLOCK_DEFS, BlockType } from "../config/CraftBlockDefs";
import type { ItemStack } from "../config/CraftRecipeDefs";
import type { CraftState } from "../state/CraftState";
import { getWorldBlock } from "../state/CraftState";
import { worldToChunk } from "../state/CraftChunk";

export class CraftHUD {
  private _root!: HTMLDivElement;
  private _hotbar!: HTMLDivElement;
  private _healthBar!: HTMLDivElement;
  private _hungerBar!: HTMLDivElement;
  private _xpBar!: HTMLDivElement;
  private _timeDisplay!: HTMLDivElement;
  private _messageLog!: HTMLDivElement;
  private _inventoryOverlay!: HTMLDivElement;
  private _questPanel!: HTMLDivElement;
  private _miningBar!: HTMLDivElement;
  private _miningBarFill!: HTMLDivElement;
  private _debugInfo!: HTMLDivElement;
  private _blockTooltip!: HTMLDivElement;
  private _minimap!: HTMLCanvasElement;
  private _minimapCtx!: CanvasRenderingContext2D;
  private _waterOverlay!: HTMLDivElement;
  private _damageFlash!: HTMLDivElement;
  private _lastHp = 20;
  private _compassEl!: HTMLDivElement;
  private _weatherEl!: HTMLDivElement;
  private _armorEl!: HTMLDivElement;

  /** Callbacks */
  onCraftSlotClick?: (slotIndex: number) => void;
  onInventorySlotClick?: (section: "hotbar" | "main", index: number) => void;
  onCraftResultClick?: () => void;

  build(): void {
    this._root = document.createElement("div");
    this._root.id = "craft-hud";
    this._root.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:5;font-family:'Segoe UI',sans-serif;`;
    document.body.appendChild(this._root);

    this._buildHotbar();
    this._buildStatusBars();
    this._buildMiningBar();
    this._buildTimeDisplay();
    this._buildMessageLog();
    this._buildInventoryOverlay();
    this._buildQuestPanel();
    this._buildDebugInfo();
    this._buildBlockTooltip();
    this._buildMinimap();
    this._buildWaterOverlay();
    this._buildDamageFlash();
    this._buildCompass();
    this._buildWeatherIndicator();
    this._buildArmorDisplay();
  }

  // --- Hotbar ---
  private _buildHotbar(): void {
    this._hotbar = document.createElement("div");
    this._hotbar.style.cssText = `
      position:absolute; bottom:8px; left:50%; transform:translateX(-50%);
      display:flex; gap:2px; pointer-events:auto;
    `;
    for (let i = 0; i < CB.HOTBAR_SLOTS; i++) {
      const slot = document.createElement("div");
      slot.className = "hotbar-slot";
      slot.dataset.index = String(i);
      slot.style.cssText = `
        width:48px; height:48px; border:2px solid #555; background:rgba(0,0,0,0.6);
        display:flex; align-items:center; justify-content:center; position:relative;
        font-size:10px; color:white; cursor:pointer; border-radius:4px;
      `;
      // Slot number
      const num = document.createElement("span");
      num.style.cssText = `position:absolute;top:1px;left:3px;font-size:9px;opacity:0.6;`;
      num.textContent = String(i + 1);
      slot.appendChild(num);
      this._hotbar.appendChild(slot);
    }
    this._root.appendChild(this._hotbar);
  }

  // --- Health / Hunger / XP ---
  private _buildStatusBars(): void {
    const container = document.createElement("div");
    container.style.cssText = `position:absolute;bottom:64px;left:50%;transform:translateX(-50%);display:flex;gap:8px;align-items:center;`;

    // Health
    this._healthBar = this._createBar("❤", "#e53935", 100);
    container.appendChild(this._healthBar);

    // Hunger
    this._hungerBar = this._createBar("🍖", "#FF9800", 100);
    container.appendChild(this._hungerBar);

    this._root.appendChild(container);

    // XP bar below hotbar
    this._xpBar = document.createElement("div");
    this._xpBar.style.cssText = `
      position:absolute; bottom:58px; left:50%; transform:translateX(-50%);
      width:${CB.HOTBAR_SLOTS * 50 + 8}px; height:4px; background:rgba(0,0,0,0.4); border-radius:2px;
    `;
    const xpFill = document.createElement("div");
    xpFill.style.cssText = `width:0%;height:100%;background:#7CFC00;border-radius:2px;transition:width 0.3s;`;
    xpFill.className = "xp-fill";
    this._xpBar.appendChild(xpFill);
    this._root.appendChild(this._xpBar);
  }

  private _createBar(icon: string, color: string, width: number): HTMLDivElement {
    const bar = document.createElement("div");
    bar.style.cssText = `display:flex;align-items:center;gap:4px;`;
    const label = document.createElement("span");
    label.textContent = icon;
    label.style.cssText = `font-size:14px;`;
    bar.appendChild(label);
    const track = document.createElement("div");
    track.style.cssText = `width:${width}px;height:8px;background:rgba(0,0,0,0.4);border-radius:4px;overflow:hidden;`;
    const fill = document.createElement("div");
    fill.style.cssText = `width:100%;height:100%;background:${color};border-radius:4px;transition:width 0.3s;`;
    fill.className = "bar-fill";
    track.appendChild(fill);
    bar.appendChild(track);
    const text = document.createElement("span");
    text.style.cssText = `font-size:11px;color:white;min-width:30px;`;
    text.className = "bar-text";
    bar.appendChild(text);
    return bar;
  }

  // --- Mining progress ---
  private _buildMiningBar(): void {
    this._miningBar = document.createElement("div");
    this._miningBar.style.cssText = `
      position:absolute; top:55%; left:50%; transform:translate(-50%,-50%);
      width:120px; height:6px; background:rgba(0,0,0,0.5); border-radius:3px;
      display:none;
    `;
    this._miningBarFill = document.createElement("div");
    this._miningBarFill.style.cssText = `width:0%;height:100%;background:#FFD700;border-radius:3px;`;
    this._miningBar.appendChild(this._miningBarFill);
    this._root.appendChild(this._miningBar);
  }

  // --- Time display ---
  private _buildTimeDisplay(): void {
    this._timeDisplay = document.createElement("div");
    this._timeDisplay.style.cssText = `
      position:absolute; top:8px; left:50%; transform:translateX(-50%);
      color:white; font-size:14px; text-shadow:1px 1px 2px black;
      background:rgba(0,0,0,0.3); padding:4px 12px; border-radius:8px;
    `;
    this._root.appendChild(this._timeDisplay);
  }

  // --- Message log ---
  private _buildMessageLog(): void {
    this._messageLog = document.createElement("div");
    this._messageLog.style.cssText = `
      position:absolute; bottom:120px; left:8px; max-width:400px;
      font-size:13px; color:white; text-shadow:1px 1px 2px black;
    `;
    this._root.appendChild(this._messageLog);
  }

  // --- Inventory overlay ---
  private _buildInventoryOverlay(): void {
    this._inventoryOverlay = document.createElement("div");
    this._inventoryOverlay.style.cssText = `
      position:absolute; top:0; left:0; width:100%; height:100%;
      background:rgba(0,0,0,0.7); display:none; pointer-events:auto;
      display:none; justify-content:center; align-items:center;
    `;

    const card = document.createElement("div");
    card.style.cssText = `
      background:rgba(40,30,20,0.95); border:2px solid #8B6914;
      border-radius:8px; padding:20px; color:white;
      box-shadow: 0 0 30px rgba(139,105,20,0.3);
    `;
    card.innerHTML = `
      <h2 style="text-align:center;margin:0 0 16px;color:#FFD700;font-size:18px;">⚔ Inventory & Crafting ⚔</h2>
      <div style="display:flex;gap:20px;">
        <div>
          <div style="font-size:12px;color:#aaa;margin-bottom:4px;">Crafting Grid (3×3)</div>
          <div id="craft-grid" style="display:grid;grid-template-columns:repeat(3,48px);gap:2px;margin-bottom:8px;"></div>
          <div style="text-align:center;font-size:18px;">↓</div>
          <div id="craft-result" style="width:48px;height:48px;border:2px solid #FFD700;background:rgba(0,0,0,0.5);margin:4px auto;display:flex;align-items:center;justify-content:center;cursor:pointer;border-radius:4px;"></div>
        </div>
        <div>
          <div style="font-size:12px;color:#aaa;margin-bottom:4px;">Inventory</div>
          <div id="inv-main" style="display:grid;grid-template-columns:repeat(${CB.INVENTORY_COLS},48px);gap:2px;margin-bottom:12px;"></div>
          <div style="font-size:12px;color:#aaa;margin-bottom:4px;">Hotbar</div>
          <div id="inv-hotbar" style="display:grid;grid-template-columns:repeat(${CB.HOTBAR_SLOTS},48px);gap:2px;"></div>
        </div>
      </div>
    `;
    this._inventoryOverlay.appendChild(card);
    this._root.appendChild(this._inventoryOverlay);
  }

  // --- Quest panel ---
  private _buildQuestPanel(): void {
    this._questPanel = document.createElement("div");
    this._questPanel.style.cssText = `
      position:absolute; top:40px; right:8px; width:240px;
      font-size:12px; color:white; text-shadow:1px 1px 2px black;
      background:rgba(0,0,0,0.3); padding:8px; border-radius:6px;
    `;
    this._root.appendChild(this._questPanel);
  }

  // --- Debug info ---
  private _buildDebugInfo(): void {
    this._debugInfo = document.createElement("div");
    this._debugInfo.style.cssText = `
      position:absolute; top:8px; left:8px;
      font-size:11px; color:white; text-shadow:1px 1px 2px black; opacity:0.6;
    `;
    this._root.appendChild(this._debugInfo);
  }

  // --- Block tooltip ---
  private _buildBlockTooltip(): void {
    this._blockTooltip = document.createElement("div");
    this._blockTooltip.style.cssText = `
      position:absolute; top:calc(50% + 20px); left:50%; transform:translateX(-50%);
      color:white; font-size:12px; text-shadow:1px 1px 2px black;
      background:rgba(0,0,0,0.5); padding:3px 10px; border-radius:4px;
      display:none; white-space:nowrap;
    `;
    this._root.appendChild(this._blockTooltip);
  }

  // --- Minimap ---
  private _buildMinimap(): void {
    this._minimap = document.createElement("canvas");
    this._minimap.width = 100;
    this._minimap.height = 100;
    this._minimap.style.cssText = `
      position:absolute; top:40px; left:8px;
      border:2px solid rgba(139,105,20,0.6); border-radius:4px;
      background:rgba(0,0,0,0.4); image-rendering:pixelated;
    `;
    this._minimapCtx = this._minimap.getContext("2d")!;
    this._root.appendChild(this._minimap);
  }

  // --- Water overlay ---
  private _buildWaterOverlay(): void {
    this._waterOverlay = document.createElement("div");
    this._waterOverlay.style.cssText = `
      position:absolute; top:0; left:0; width:100%; height:100%;
      background:rgba(33,150,243,0.25); pointer-events:none;
      display:none; transition:opacity 0.3s;
    `;
    this._root.appendChild(this._waterOverlay);
  }

  // --- Damage flash ---
  private _buildDamageFlash(): void {
    this._damageFlash = document.createElement("div");
    this._damageFlash.style.cssText = `
      position:absolute; top:0; left:0; width:100%; height:100%;
      background:rgba(229,57,53,0.0); pointer-events:none;
      transition: background 0.1s ease-out;
    `;
    this._root.appendChild(this._damageFlash);
  }

  // =========================================================================
  // Update
  // =========================================================================

  update(state: CraftState): void {
    this._updateHotbar(state);
    this._updateStatusBars(state);
    this._updateMiningBar(state);
    this._updateTimeDisplay(state);
    this._updateMessages(state);
    this._updateQuests(state);
    this._updateDebug(state);
    this._updateBlockTooltip(state);
    this._updateMinimap(state);
    this._updateWaterOverlay(state);
    this._updateDamageFlash(state);
    this._updateCompass(state);
    this._updateArmorDisplay(state);

    // Inventory overlay visibility
    if (state.inventoryOpen || state.craftingOpen) {
      this._inventoryOverlay.style.display = "flex";
      this._updateInventoryOverlay(state);
    } else {
      this._inventoryOverlay.style.display = "none";
    }
  }

  private _updateHotbar(state: CraftState): void {
    const inv = state.player.inventory;
    const slots = this._hotbar.children;
    for (let i = 0; i < CB.HOTBAR_SLOTS; i++) {
      const slot = slots[i] as HTMLDivElement;
      const item = inv.hotbar[i];
      const isSelected = i === inv.selectedSlot;

      slot.style.borderColor = isSelected ? "#FFD700" : "#555";
      slot.style.boxShadow = isSelected ? "0 0 8px rgba(255,215,0,0.5)" : "none";

      // Clear previous item display (keep slot number)
      while (slot.children.length > 1) slot.removeChild(slot.lastChild!);

      if (item) {
        const itemDiv = document.createElement("div");
        const c = item.color;
        const r = (c >> 16) & 0xFF, g = (c >> 8) & 0xFF, b = c & 0xFF;
        itemDiv.style.cssText = `
          width:32px;height:32px;background:rgb(${r},${g},${b});
          border-radius:3px;border:1px solid rgba(255,255,255,0.2);
        `;
        slot.appendChild(itemDiv);

        if (item.count > 1) {
          const cnt = document.createElement("span");
          cnt.style.cssText = `position:absolute;bottom:1px;right:3px;font-size:10px;font-weight:bold;text-shadow:1px 1px 1px black;`;
          cnt.textContent = String(item.count);
          slot.appendChild(cnt);
        }

        // Durability bar for tools
        if (item.durability !== undefined && item.maxDurability) {
          const pct = item.durability / item.maxDurability;
          const durBar = document.createElement("div");
          durBar.style.cssText = `
            position:absolute;bottom:2px;left:4px;right:4px;height:2px;
            background:rgba(0,0,0,0.5);border-radius:1px;overflow:hidden;
          `;
          const fill = document.createElement("div");
          const hue = pct * 120; // green→red
          fill.style.cssText = `width:${pct*100}%;height:100%;background:hsl(${hue},80%,50%);`;
          durBar.appendChild(fill);
          slot.appendChild(durBar);
        }
      }
    }
  }

  private _updateStatusBars(state: CraftState): void {
    const p = state.player;
    const hpPct = (p.hp / p.maxHp) * 100;
    const hungerPct = (p.hunger / p.maxHunger) * 100;

    const hpFill = this._healthBar.querySelector(".bar-fill") as HTMLDivElement;
    const hpText = this._healthBar.querySelector(".bar-text") as HTMLSpanElement;
    hpFill.style.width = `${hpPct}%`;
    hpText.textContent = `${p.hp}/${p.maxHp}`;

    const hungerFill = this._hungerBar.querySelector(".bar-fill") as HTMLDivElement;
    const hungerText = this._hungerBar.querySelector(".bar-text") as HTMLSpanElement;
    hungerFill.style.width = `${hungerPct}%`;
    hungerText.textContent = `${p.hunger}/${p.maxHunger}`;

    // XP
    const xpForNext = p.level * 10;
    const xpPct = (p.xp / xpForNext) * 100;
    const xpFill = this._xpBar.querySelector(".xp-fill") as HTMLDivElement;
    xpFill.style.width = `${Math.min(100, xpPct)}%`;
  }

  private _updateMiningBar(state: CraftState): void {
    const target = state.player.miningTarget;
    if (target && target.progress > 0) {
      this._miningBar.style.display = "block";
      this._miningBarFill.style.width = `${target.progress * 100}%`;
    } else {
      this._miningBar.style.display = "none";
    }
  }

  private _updateTimeDisplay(state: CraftState): void {
    const hours = Math.floor(state.timeOfDay * 24);
    const minutes = Math.floor((state.timeOfDay * 24 * 60) % 60);
    const hh = String(hours).padStart(2, "0");
    const mm = String(minutes).padStart(2, "0");
    const period = state.timeOfDay < 0.25 || state.timeOfDay > 0.75 ? "🌙" : "☀";
    this._timeDisplay.textContent = `Day ${state.dayNumber}  ${hh}:${mm} ${period}`;
  }

  private _updateMessages(state: CraftState): void {
    const recent = state.messages.filter((m) => state.totalTime - m.time < 5);
    this._messageLog.innerHTML = recent
      .map((m) => {
        const c = m.color;
        const r = (c >> 16) & 0xFF, g = (c >> 8) & 0xFF, b = c & 0xFF;
        const age = state.totalTime - m.time;
        const opacity = Math.max(0, 1 - age / 5);
        return `<div style="color:rgb(${r},${g},${b});opacity:${opacity};margin:2px 0;">${m.text}</div>`;
      })
      .join("");
  }

  private _updateQuests(state: CraftState): void {
    const active = state.quests.filter((q) => !q.completed).slice(0, 4);
    if (active.length === 0) {
      this._questPanel.innerHTML = `<div style="color:#FFD700;font-weight:bold;">⚔ All Quests Complete! ⚔</div>`;
      return;
    }
    this._questPanel.innerHTML = `<div style="color:#FFD700;font-weight:bold;margin-bottom:6px;">⚔ Quests</div>` +
      active.map((q) => {
        const pct = Math.min(100, (q.progress / q.goal) * 100);
        return `
          <div style="margin-bottom:6px;">
            <div style="font-size:11px;color:#E0D0A0;">${q.name}</div>
            <div style="font-size:10px;opacity:0.7;">${q.description}</div>
            <div style="height:3px;background:rgba(255,255,255,0.1);border-radius:2px;margin-top:2px;">
              <div style="width:${pct}%;height:100%;background:#FFD700;border-radius:2px;"></div>
            </div>
          </div>
        `;
      }).join("");
  }

  private _updateDebug(state: CraftState): void {
    const p = state.player;
    this._debugInfo.textContent = [
      `XYZ: ${p.position.x.toFixed(1)}, ${p.position.y.toFixed(1)}, ${p.position.z.toFixed(1)}`,
      `Chunks: ${state.chunks.size}`,
      `Mobs: ${state.mobs.length}`,
    ].join(" | ");
  }

  private _updateInventoryOverlay(state: CraftState): void {
    const inv = state.player.inventory;

    // Crafting grid
    const gridEl = this._inventoryOverlay.querySelector("#craft-grid") as HTMLDivElement;
    gridEl.innerHTML = "";
    for (let i = 0; i < 9; i++) {
      const slot = this._makeSlot(inv.craftGrid[i]);
      slot.style.pointerEvents = "auto";
      slot.style.cursor = "pointer";
      const idx = i;
      slot.onclick = () => this.onCraftSlotClick?.(idx);
      gridEl.appendChild(slot);
    }

    // Craft result
    const resultEl = this._inventoryOverlay.querySelector("#craft-result") as HTMLDivElement;
    resultEl.innerHTML = "";
    if (inv.craftResult) {
      resultEl.appendChild(this._makeItemDisplay(inv.craftResult));
      resultEl.onclick = () => this.onCraftResultClick?.();
    }

    // Main inventory
    const mainEl = this._inventoryOverlay.querySelector("#inv-main") as HTMLDivElement;
    mainEl.innerHTML = "";
    for (let i = 0; i < inv.main.length; i++) {
      const slot = this._makeSlot(inv.main[i]);
      slot.onclick = () => this.onInventorySlotClick?.("main", i);
      mainEl.appendChild(slot);
    }

    // Hotbar in overlay
    const hotbarEl = this._inventoryOverlay.querySelector("#inv-hotbar") as HTMLDivElement;
    hotbarEl.innerHTML = "";
    for (let i = 0; i < inv.hotbar.length; i++) {
      const slot = this._makeSlot(inv.hotbar[i]);
      slot.onclick = () => this.onInventorySlotClick?.("hotbar", i);
      hotbarEl.appendChild(slot);
    }
  }

  private _makeSlot(item: ItemStack | null): HTMLDivElement {
    const slot = document.createElement("div");
    slot.style.cssText = `
      width:48px;height:48px;border:1px solid #555;background:rgba(0,0,0,0.5);
      display:flex;align-items:center;justify-content:center;position:relative;
      cursor:pointer;border-radius:3px;pointer-events:auto;
    `;
    if (item) {
      slot.appendChild(this._makeItemDisplay(item));
    }
    return slot;
  }

  private _makeItemDisplay(item: ItemStack): HTMLDivElement {
    const wrap = document.createElement("div");
    wrap.style.cssText = `position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center;`;
    const c = item.color;
    const r = (c >> 16) & 0xFF, g = (c >> 8) & 0xFF, b = c & 0xFF;
    const icon = document.createElement("div");
    icon.style.cssText = `width:32px;height:32px;background:rgb(${r},${g},${b});border-radius:3px;border:1px solid rgba(255,255,255,0.2);`;
    icon.title = item.displayName;
    wrap.appendChild(icon);
    if (item.count > 1) {
      const cnt = document.createElement("span");
      cnt.style.cssText = `position:absolute;bottom:0;right:2px;font-size:10px;color:white;font-weight:bold;text-shadow:1px 1px 1px black;`;
      cnt.textContent = String(item.count);
      wrap.appendChild(cnt);
    }
    return wrap;
  }

  // =========================================================================
  // New HUD elements
  // =========================================================================

  private _updateBlockTooltip(state: CraftState): void {
    const target = state.player.miningTarget;
    if (target) {
      const block = getWorldBlock(state, target.wx, target.wy, target.wz);
      const def = BLOCK_DEFS[block];
      if (def && block !== BlockType.AIR) {
        this._blockTooltip.style.display = "block";
        const toolHint = def.bestTool !== "none" ? ` (${def.bestTool})` : "";
        this._blockTooltip.textContent = `${def.name}${toolHint}`;
        return;
      }
    }
    this._blockTooltip.style.display = "none";
  }

  private _minimapTimer = 0;

  private _updateMinimap(state: CraftState): void {
    this._minimapTimer++;
    if (this._minimapTimer % 10 !== 0) return; // update every 10 frames

    const ctx = this._minimapCtx;
    const size = 100;
    const px = Math.floor(state.player.position.x);
    const pz = Math.floor(state.player.position.z);
    const scale = 2; // each pixel = 2 blocks

    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, size, size);

    const half = Math.floor(size / 2);

    for (let mx = 0; mx < size; mx++) {
      for (let mz = 0; mz < size; mz++) {
        const wx = px + (mx - half) * scale;
        const wz = pz + (mz - half) * scale;

        // Find surface block
        const cx = worldToChunk(wx);
        const cz = worldToChunk(wz);
        const chunk = state.chunks.get(`${cx},${cz}`);
        if (!chunk || !chunk.populated) continue;

        const lx = ((wx % 16) + 16) % 16;
        const lz = ((wz % 16) + 16) % 16;
        const h = chunk.getHeight(lx, lz);
        const block = chunk.getBlock(lx, h, lz);
        const def = BLOCK_DEFS[block];
        if (!def) continue;

        const c = def.topColor ?? def.color;
        const r = (c >> 16) & 0xFF, g = (c >> 8) & 0xFF, b = c & 0xFF;
        // Height shading
        const shade = Math.max(0.3, Math.min(1.0, h / 40));
        ctx.fillStyle = `rgb(${Math.floor(r*shade)},${Math.floor(g*shade)},${Math.floor(b*shade)})`;
        ctx.fillRect(mx, mz, 1, 1);
      }
    }

    // Mob dots
    for (const mob of state.mobs) {
      const dx = Math.floor((mob.position.x - px) / scale) + half;
      const dz = Math.floor((mob.position.z - pz) / scale) + half;
      if (dx >= 0 && dx < size && dz >= 0 && dz < size) {
        ctx.fillStyle = "#e53935";
        ctx.fillRect(dx - 1, dz - 1, 3, 3);
      }
    }

    // Player dot (center)
    ctx.fillStyle = "#FFD700";
    ctx.fillRect(half - 1, half - 1, 3, 3);

    // Player direction indicator
    const dirX = Math.sin(state.player.yaw);
    const dirZ = Math.cos(state.player.yaw);
    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(half, half);
    ctx.lineTo(half - dirX * 6, half - dirZ * 6);
    ctx.stroke();
  }

  private _updateWaterOverlay(state: CraftState): void {
    this._waterOverlay.style.display = state.player.inWater ? "block" : "none";
  }

  private _updateDamageFlash(state: CraftState): void {
    if (state.player.hp < this._lastHp) {
      // Took damage — flash red
      this._damageFlash.style.background = "rgba(229,57,53,0.4)";
      setTimeout(() => {
        this._damageFlash.style.background = "rgba(229,57,53,0.0)";
      }, 200);
    }
    this._lastHp = state.player.hp;

    // Low HP vignette
    if (state.player.hp <= 4 && state.player.hp > 0) {
      const pulse = Math.sin(state.totalTime * 3) * 0.1 + 0.15;
      this._damageFlash.style.background = `rgba(229,57,53,${pulse})`;
    }
  }

  // --- Compass ---
  private _buildCompass(): void {
    this._compassEl = document.createElement("div");
    this._compassEl.style.cssText = `
      position:absolute; top:30px; left:50%; transform:translateX(-50%);
      color:white; font-size:11px; text-shadow:1px 1px 2px black;
      letter-spacing:8px; opacity:0.6;
    `;
    this._root.appendChild(this._compassEl);
  }

  private _updateCompass(state: CraftState): void {
    const yaw = state.player.yaw;
    const deg = ((yaw * 180 / Math.PI) % 360 + 360) % 360;
    const dirs = ["S", "SW", "W", "NW", "N", "NE", "E", "SE"];
    const idx = Math.round(deg / 45) % 8;
    const compass = dirs.map((d, i) => {
      const active = i === idx;
      return `<span style="color:${active ? (d === "N" ? "#e53935" : "#FFD700") : "#666"};font-weight:${active ? "bold" : "normal"}">${d}</span>`;
    }).join(" ");
    this._compassEl.innerHTML = compass;
  }

  // --- Weather indicator ---
  private _buildWeatherIndicator(): void {
    this._weatherEl = document.createElement("div");
    this._weatherEl.style.cssText = `
      position:absolute; top:8px; right:8px;
      color:white; font-size:18px; text-shadow:1px 1px 2px black; opacity:0.7;
    `;
    this._root.appendChild(this._weatherEl);
  }

  setWeather(weather: string): void {
    const icons: Record<string, string> = {
      clear: "☀", rain: "🌧", snow: "❄", storm: "⛈",
    };
    this._weatherEl.textContent = icons[weather] ?? "☀";
  }

  // --- Armor display ---
  private _buildArmorDisplay(): void {
    this._armorEl = document.createElement("div");
    this._armorEl.style.cssText = `
      position:absolute; bottom:70px; right:8px;
      display:flex; flex-direction:column; gap:2px; opacity:0.8;
    `;
    const slots = ["helmet", "chestplate", "leggings", "boots"];
    const icons = ["⛑", "🛡", "👖", "👢"];
    for (let i = 0; i < 4; i++) {
      const slot = document.createElement("div");
      slot.id = `armor-${slots[i]}`;
      slot.style.cssText = `
        width:28px; height:28px; border:1px solid #555; background:rgba(0,0,0,0.4);
        display:flex; align-items:center; justify-content:center;
        font-size:14px; border-radius:3px;
      `;
      slot.textContent = icons[i];
      slot.title = slots[i];
      this._armorEl.appendChild(slot);
    }
    this._root.appendChild(this._armorEl);
  }

  private _updateArmorDisplay(state: CraftState): void {
    const armor = state.player.inventory.armor;
    const slots = [
      { key: "helmet", item: armor.helmet },
      { key: "chestplate", item: armor.chestplate },
      { key: "leggings", item: armor.leggings },
      { key: "boots", item: armor.boots },
    ];
    for (const { key, item } of slots) {
      const el = document.getElementById(`armor-${key}`);
      if (!el) continue;
      if (item) {
        const c = item.color;
        const r = (c >> 16) & 0xFF, g = (c >> 8) & 0xFF, b = c & 0xFF;
        el.style.background = `rgba(${r},${g},${b},0.5)`;
        el.style.borderColor = "#FFD700";
        el.title = item.displayName;
      } else {
        el.style.background = "rgba(0,0,0,0.4)";
        el.style.borderColor = "#555";
      }
    }
  }

  destroy(): void {
    this._root.remove();
  }
}
