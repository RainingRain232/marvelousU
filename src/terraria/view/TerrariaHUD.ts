// ---------------------------------------------------------------------------
// Terraria – HUD overlay (health, mana, hotbar, inventory, crafting, quests)
// ---------------------------------------------------------------------------

import { TB } from "../config/TerrariaBalance";
import type { TerrariaState } from "../state/TerrariaState";
import type { ItemStack } from "../state/TerrariaInventory";
import { getHeldItem } from "../state/TerrariaInventory";
import { BLOCK_DEFS } from "../config/TerrariaBlockDefs";
import { getAvailableRecipes, craftRecipe } from "../systems/TerrariaCraftingSystem";
import { onCrafted } from "../systems/TerrariaQuestSystem";
import type { CraftingRecipe } from "../config/TerrariaRecipeDefs";

export class TerrariaHUD {
  private _overlay: HTMLDivElement | null = null;
  private _hotbarEl: HTMLDivElement | null = null;
  private _healthEl: HTMLDivElement | null = null;
  private _manaEl: HTMLDivElement | null = null;
  private _defenseEl: HTMLDivElement | null = null;
  private _messageEl: HTMLDivElement | null = null;
  private _questEl: HTMLDivElement | null = null;
  private _inventoryEl: HTMLDivElement | null = null;
  private _pauseEl: HTMLDivElement | null = null;
  private _depthEl: HTMLDivElement | null = null;
  private _timeEl: HTMLDivElement | null = null;
  private _tooltipEl: HTMLDivElement | null = null;
  private _gameOverEl: HTMLDivElement | null = null;
  private _minimapEl: HTMLCanvasElement | null = null;
  private _minimapCtx: CanvasRenderingContext2D | null = null;
  private _crosshairEl: HTMLDivElement | null = null;

  onExit: (() => void) | null = null;
  onRespawn: (() => void) | null = null;
  private _craftCallback: ((recipe: CraftingRecipe) => void) | null = null;
  private _resumeCallback: (() => void) | null = null;

  setCraftCallback(cb: (recipe: CraftingRecipe) => void): void { this._craftCallback = cb; }
  setResumeCallback(cb: () => void): void { this._resumeCallback = cb; }

  build(): void {
    this._overlay = document.createElement("div");
    this._overlay.id = "terraria-hud";
    this._overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10;font-family:monospace;";

    // Health bar
    this._healthEl = document.createElement("div");
    this._healthEl.style.cssText = "position:absolute;top:10px;left:10px;";
    this._overlay.appendChild(this._healthEl);

    // Mana bar
    this._manaEl = document.createElement("div");
    this._manaEl.style.cssText = "position:absolute;top:36px;left:10px;";
    this._overlay.appendChild(this._manaEl);

    // Defense display
    this._defenseEl = document.createElement("div");
    this._defenseEl.style.cssText = "position:absolute;top:60px;left:10px;color:#AAAAAA;font-size:11px;text-shadow:1px 1px 2px #000;";
    this._overlay.appendChild(this._defenseEl);

    // Time/depth display
    this._timeEl = document.createElement("div");
    this._timeEl.style.cssText = "position:absolute;top:10px;right:90px;color:#FFD700;font-size:12px;text-align:right;text-shadow:1px 1px 2px #000;";
    this._overlay.appendChild(this._timeEl);

    this._depthEl = document.createElement("div");
    this._depthEl.style.cssText = "position:absolute;top:28px;right:90px;color:#AAAAAA;font-size:11px;text-align:right;text-shadow:1px 1px 2px #000;";
    this._overlay.appendChild(this._depthEl);

    // Minimap
    this._minimapEl = document.createElement("canvas");
    this._minimapEl.width = 80;
    this._minimapEl.height = 80;
    this._minimapEl.style.cssText = "position:absolute;top:8px;right:6px;border:1px solid #8B6914;border-radius:4px;image-rendering:pixelated;background:#111;";
    this._minimapCtx = this._minimapEl.getContext("2d");
    this._overlay.appendChild(this._minimapEl);

    // Hotbar
    this._hotbarEl = document.createElement("div");
    this._hotbarEl.style.cssText = "position:absolute;bottom:10px;left:50%;transform:translateX(-50%);display:flex;gap:2px;";
    this._overlay.appendChild(this._hotbarEl);

    // Item tooltip
    this._tooltipEl = document.createElement("div");
    this._tooltipEl.style.cssText = "position:absolute;bottom:56px;left:50%;transform:translateX(-50%);color:#FFD700;font-size:11px;text-align:center;text-shadow:1px 1px 2px #000;pointer-events:none;";
    this._overlay.appendChild(this._tooltipEl);

    // Crosshair
    this._crosshairEl = document.createElement("div");
    this._crosshairEl.style.cssText = "position:fixed;top:50%;left:50%;width:2px;height:2px;background:white;transform:translate(-50%,-50%);pointer-events:none;opacity:0.4;box-shadow:0 -4px 0 white,0 4px 0 white,-4px 0 0 white,4px 0 0 white;";
    this._overlay.appendChild(this._crosshairEl);

    // Messages
    this._messageEl = document.createElement("div");
    this._messageEl.style.cssText = "position:absolute;bottom:60px;left:10px;color:#FFFFFF;font-size:12px;text-shadow:1px 1px 2px #000;max-width:400px;";
    this._overlay.appendChild(this._messageEl);

    // Quest tracker
    this._questEl = document.createElement("div");
    this._questEl.style.cssText = "position:absolute;top:95px;right:6px;color:#FFD700;font-size:10px;text-align:right;text-shadow:1px 1px 2px #000;max-width:180px;";
    this._overlay.appendChild(this._questEl);

    // Inventory overlay (hidden by default)
    this._inventoryEl = document.createElement("div");
    this._inventoryEl.style.cssText = "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(20,10,5,0.95);border:2px solid #8B6914;border-radius:8px;padding:16px;display:none;pointer-events:auto;min-width:500px;max-height:80vh;overflow-y:auto;";
    this._overlay.appendChild(this._inventoryEl);

    // Game over overlay
    this._gameOverEl = document.createElement("div");
    this._gameOverEl.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(40,0,0,0.75);display:none;flex-direction:column;align-items:center;justify-content:center;pointer-events:auto;";
    this._gameOverEl.innerHTML = `
      <div style="color:#FF4444;font-size:48px;font-family:Georgia,serif;text-shadow:0 0 20px rgba(255,0,0,0.5);">YOU HAVE FALLEN</div>
      <p style="color:#CC8888;font-size:14px;margin:12px 0 30px;font-style:italic;">The quest for the Grail continues...</p>
      <div style="display:flex;gap:12px;">
        <button id="terraria-respawn" style="padding:10px 32px;background:#2a1a0a;color:#FFD700;border:1px solid #8B6914;border-radius:4px;cursor:pointer;font-family:Georgia,serif;font-size:16px;">Respawn</button>
        <button id="terraria-gameover-exit" style="padding:10px 32px;background:#2a0a0a;color:#FF6644;border:1px solid #8B6914;border-radius:4px;cursor:pointer;font-family:Georgia,serif;font-size:16px;">Exit</button>
      </div>
    `;
    this._overlay.appendChild(this._gameOverEl);

    // Pause overlay
    this._pauseEl = document.createElement("div");
    this._pauseEl.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);display:none;flex-direction:column;align-items:center;justify-content:center;pointer-events:auto;";
    this._pauseEl.innerHTML = `
      <div style="color:#FFD700;font-size:36px;font-family:Georgia,serif;text-shadow:0 0 10px rgba(255,215,0,0.5);">PAUSED</div>
      <div style="margin-top:30px;display:flex;flex-direction:column;gap:12px;">
        <button id="terraria-resume" style="padding:8px 32px;background:#2a1a0a;color:#FFD700;border:1px solid #8B6914;border-radius:4px;cursor:pointer;font-family:Georgia,serif;font-size:16px;">Resume</button>
        <button id="terraria-save-quit" style="padding:8px 32px;background:#1a1a2a;color:#88AAFF;border:1px solid #8B6914;border-radius:4px;cursor:pointer;font-family:Georgia,serif;font-size:16px;">Save & Quit</button>
        <button id="terraria-exit" style="padding:8px 32px;background:#2a1a0a;color:#FF6644;border:1px solid #8B6914;border-radius:4px;cursor:pointer;font-family:Georgia,serif;font-size:16px;">Exit without Saving</button>
      </div>
    `;
    this._overlay.appendChild(this._pauseEl);

    document.body.appendChild(this._overlay);

    // Button listeners
    document.getElementById("terraria-resume")?.addEventListener("click", () => this._resumeCallback?.());
    document.getElementById("terraria-save-quit")?.addEventListener("click", () => this.onExit?.());
    document.getElementById("terraria-exit")?.addEventListener("click", () => this.onExit?.());
    document.getElementById("terraria-respawn")?.addEventListener("click", () => this.onRespawn?.());
    document.getElementById("terraria-gameover-exit")?.addEventListener("click", () => this.onExit?.());
  }

  // ---------------------------------------------------------------------------
  // Per-frame update
  // ---------------------------------------------------------------------------

  update(state: TerrariaState): void {
    if (!this._overlay) return;

    // Health
    if (this._healthEl) {
      const hp = Math.ceil(state.player.hp);
      const pct = hp / state.player.maxHp;
      const low = pct < 0.3;
      this._healthEl.innerHTML = `
        <div style="font-size:11px;color:${low ? "#FF2222" : "#FF4444"};margin-bottom:2px;${low ? "animation:blink 0.5s infinite;" : ""}">HP ${hp}/${state.player.maxHp}</div>
        <div style="width:160px;height:10px;background:#222;border:1px solid #444;border-radius:4px;overflow:hidden;">
          <div style="width:${pct * 100}%;height:100%;background:linear-gradient(90deg,#880000,${low ? "#FF2222" : "#CC3333"});transition:width 0.2s;"></div>
        </div>
      `;
    }

    // Mana
    if (this._manaEl) {
      const mp = Math.ceil(state.player.mana);
      const pct = mp / state.player.maxMana;
      this._manaEl.innerHTML = `
        <div style="font-size:11px;color:#4488FF;margin-bottom:2px;">MP ${mp}/${state.player.maxMana}</div>
        <div style="width:160px;height:10px;background:#222;border:1px solid #444;border-radius:4px;overflow:hidden;">
          <div style="width:${pct * 100}%;height:100%;background:linear-gradient(90deg,#112266,#3366CC);transition:width 0.2s;"></div>
        </div>
      `;
    }

    // Defense
    if (this._defenseEl) {
      const def = state.player.defense;
      this._defenseEl.textContent = def > 0 ? `Defense: ${def}` : "";
    }

    // Time
    if (this._timeEl) {
      const t = state.timeOfDay;
      const hours = Math.floor(t * 24);
      const mins = Math.floor((t * 24 - hours) * 60);
      const period = hours >= 12 ? "PM" : "AM";
      const h12 = hours % 12 || 12;
      const isNight = t > 0.75 || t < 0.25;
      this._timeEl.innerHTML = `<span style="color:${isNight ? "#8888CC" : "#FFD700"};">Day ${state.dayNumber}  ${h12}:${mins.toString().padStart(2, "0")} ${period}</span>`;
    }

    // Depth
    if (this._depthEl) {
      const y = Math.floor(state.player.y);
      const depth = TB.SEA_LEVEL - y;
      let layer: string, layerColor: string;
      if (y < TB.UNDERWORLD_Y) { layer = "Underworld"; layerColor = "#FF4444"; }
      else if (y < TB.CAVERN_Y) { layer = "Caverns"; layerColor = "#AA66FF"; }
      else if (y < TB.UNDERGROUND_Y) { layer = "Underground"; layerColor = "#AAAAAA"; }
      else if (y < TB.SURFACE_Y) { layer = "Shallow"; layerColor = "#88AA88"; }
      else { layer = "Surface"; layerColor = "#88CC44"; }
      this._depthEl.innerHTML = depth > 0
        ? `<span style="color:${layerColor};">${depth}ft deep — ${layer}</span>`
        : `<span style="color:${layerColor};">${-depth}ft high — ${layer}</span>`;
    }

    // Hotbar with durability bars and item names
    this._updateHotbar(state);

    // Held item tooltip
    if (this._tooltipEl) {
      const held = getHeldItem(state.player.inventory);
      if (held) {
        let tip = held.displayName;
        if (held.damage) tip += ` (${held.damage} dmg)`;
        if (held.defense) tip += ` (${held.defense} def)`;
        if (held.durability !== undefined && held.maxDurability) {
          const pct = Math.floor((held.durability / held.maxDurability) * 100);
          tip += ` [${pct}%]`;
        }
        this._tooltipEl.textContent = tip;
      } else {
        this._tooltipEl.textContent = "";
      }
    }

    // Messages
    if (this._messageEl) {
      const recent = state.messages.slice(-6);
      this._messageEl.innerHTML = recent.map(m => {
        const age = state.totalTime - m.time;
        const alpha = Math.max(0, 1 - age / 8);
        if (alpha < 0.01) return "";
        const color = `#${m.color.toString(16).padStart(6, "0")}`;
        return `<div style="opacity:${alpha.toFixed(2)};color:${color};margin-bottom:2px;font-size:12px;">${m.text}</div>`;
      }).join("");
    }

    // Quest tracker
    if (this._questEl) {
      const active = state.quests.filter(q => q.unlocked && !q.completed).slice(0, 3);
      if (active.length > 0) {
        this._questEl.innerHTML = `<div style="color:#8B6914;font-size:9px;margin-bottom:4px;border-bottom:1px solid #333;padding-bottom:2px;">QUESTS</div>` +
          active.map(q => {
            const pct = Math.floor((q.progress / q.goal) * 100);
            return `<div style="margin-bottom:6px;">
              <div style="color:#C0A060;font-size:10px;">${q.name}</div>
              <div style="width:80px;height:3px;background:#333;border-radius:2px;margin-top:2px;">
                <div style="width:${pct}%;height:100%;background:#8B6914;border-radius:2px;"></div>
              </div>
              <div style="color:#666;font-size:9px;">${q.progress}/${q.goal}</div>
            </div>`;
          }).join("");
      }
    }

    // Minimap
    this._drawMinimap(state);

    // Game over
    if (this._gameOverEl) {
      this._gameOverEl.style.display = state.gameOver ? "flex" : "none";
    }

    // Pause menu
    if (this._pauseEl) {
      this._pauseEl.style.display = state.paused ? "flex" : "none";
    }

    // Victory banner
    if (state.victory && !state.gameOver && !state.paused) {
      // Show victory glow effect on quest panel
      if (this._questEl) {
        this._questEl.innerHTML = `<div style="color:#FFD700;font-size:14px;font-family:Georgia,serif;text-shadow:0 0 10px rgba(255,215,0,0.5);">THE HOLY GRAIL<br>IS FOUND!</div>`;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Hotbar
  // ---------------------------------------------------------------------------

  private _updateHotbar(state: TerrariaState): void {
    if (!this._hotbarEl) return;
    this._hotbarEl.innerHTML = "";
    for (let i = 0; i < 9; i++) {
      const slot = state.player.inventory.hotbar[i];
      const selected = i === state.player.inventory.selectedSlot;
      const div = document.createElement("div");
      div.style.cssText = `width:40px;height:40px;background:${selected ? "rgba(255,215,0,0.25)" : "rgba(10,5,2,0.7)"};border:${selected ? "2px solid #FFD700" : "1px solid #555"};border-radius:4px;display:flex;align-items:center;justify-content:center;position:relative;flex-direction:column;`;

      if (slot) {
        const color = `#${slot.color.toString(16).padStart(6, "0")}`;
        let icon = `<div style="width:22px;height:22px;background:${color};border-radius:2px;border:1px solid rgba(255,255,255,0.15);"></div>`;
        div.innerHTML = icon;
        if (slot.count > 1) {
          div.innerHTML += `<span style="position:absolute;bottom:1px;right:3px;font-size:9px;color:white;text-shadow:1px 1px 1px #000;font-weight:bold;">${slot.count}</span>`;
        }
        // Durability bar
        if (slot.durability !== undefined && slot.maxDurability) {
          const durPct = slot.durability / slot.maxDurability;
          const durColor = durPct > 0.5 ? "#44CC44" : durPct > 0.2 ? "#CCAA22" : "#CC2222";
          div.innerHTML += `<div style="position:absolute;bottom:0;left:2px;right:2px;height:2px;background:#333;border-radius:1px;"><div style="width:${durPct * 100}%;height:100%;background:${durColor};border-radius:1px;"></div></div>`;
        }
      }
      div.innerHTML += `<span style="position:absolute;top:1px;left:3px;font-size:8px;color:#666;">${i + 1}</span>`;
      this._hotbarEl.appendChild(div);
    }
  }

  // ---------------------------------------------------------------------------
  // Minimap
  // ---------------------------------------------------------------------------

  private _drawMinimap(state: TerrariaState): void {
    if (!this._minimapCtx || !this._minimapEl) return;
    const ctx = this._minimapCtx;
    const mw = this._minimapEl.width;
    const mh = this._minimapEl.height;
    const scale = mw / state.worldWidth;

    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, mw, mh);

    // Draw terrain outline (just surface)
    for (let wx = 0; wx < state.worldWidth; wx++) {
      const cx = Math.floor(wx / TB.CHUNK_W);
      const chunk = state.chunks.get(cx);
      if (!chunk) continue;
      const lx = ((wx % TB.CHUNK_W) + TB.CHUNK_W) % TB.CHUNK_W;
      const h = chunk.heightMap[lx];
      const mx = wx * scale;
      const my = mh - (h / state.worldHeight) * mh;
      ctx.fillStyle = h > TB.SURFACE_Y ? "#3a5a2a" : h > TB.UNDERGROUND_Y ? "#5a4a3a" : "#4a4a4a";
      ctx.fillRect(mx, my, Math.max(1, scale), mh - my);
    }

    // Player dot
    const px = state.player.x * scale;
    const py = mh - (state.player.y / state.worldHeight) * mh;
    ctx.fillStyle = "#FFD700";
    ctx.fillRect(px - 1, py - 1, 3, 3);
  }

  // ---------------------------------------------------------------------------
  // Inventory + Crafting
  // ---------------------------------------------------------------------------

  showInventory(state: TerrariaState): void {
    if (!this._inventoryEl) return;
    this._inventoryEl.style.display = "block";
    this._rebuildInventoryUI(state);
  }

  hideInventory(): void {
    if (!this._inventoryEl) return;
    this._inventoryEl.style.display = "none";
  }

  refreshInventory(state: TerrariaState): void {
    if (this._inventoryEl?.style.display !== "none") {
      this._rebuildInventoryUI(state);
    }
  }

  private _rebuildInventoryUI(state: TerrariaState): void {
    if (!this._inventoryEl) return;
    const inv = state.player.inventory;

    let html = `<div style="display:flex;gap:20px;">`;

    // LEFT PANEL: Inventory
    html += `<div style="flex:1;">`;
    html += `<div style="color:#FFD700;font-size:16px;font-family:Georgia,serif;margin-bottom:10px;text-align:center;">Inventory</div>`;

    // Armor slots
    html += `<div style="display:flex;gap:4px;margin-bottom:10px;justify-content:center;">`;
    const armorSlots = [inv.armor.helmet, inv.armor.chestplate, inv.armor.leggings, inv.armor.boots];
    const armorLabels = ["Helm", "Chest", "Legs", "Boots"];
    const armorIcons = ["👑", "🛡", "⚔", "👢"];
    for (let i = 0; i < 4; i++) {
      const slot = armorSlots[i];
      html += `<div style="width:40px;height:40px;background:rgba(50,30,10,0.8);border:1px solid #8B6914;border-radius:3px;display:flex;align-items:center;justify-content:center;position:relative;" title="${armorLabels[i]}">`;
      if (slot) {
        html += `<div style="width:24px;height:24px;background:#${slot.color.toString(16).padStart(6, "0")};border-radius:2px;border:1px solid rgba(255,255,255,0.1);"></div>`;
        html += `<span style="position:absolute;bottom:0;font-size:7px;color:#888;">${slot.defense ?? 0}</span>`;
      } else {
        html += `<span style="font-size:14px;opacity:0.3;">${armorIcons[i]}</span>`;
      }
      html += `</div>`;
    }
    html += `</div>`;

    // Hotbar
    html += this._renderSlotRow(inv.hotbar, "Hotbar");

    // Main inventory
    for (let row = 0; row < 3; row++) {
      const slots = inv.main.slice(row * 9, row * 9 + 9);
      html += this._renderSlotRow(slots, row === 0 ? "Inventory" : "");
    }
    html += `</div>`;

    // RIGHT PANEL: Crafting recipes
    html += `<div style="min-width:200px;border-left:1px solid #333;padding-left:16px;">`;
    const station = state.craftingStation;
    const stationName = station === "forge" ? "Forge" : station === "round_table" ? "Round Table" : "Hand Craft";
    html += `<div style="color:#FFD700;font-size:14px;font-family:Georgia,serif;margin-bottom:8px;text-align:center;">${stationName}</div>`;

    const recipes = getAvailableRecipes(state);
    if (recipes.length === 0) {
      html += `<div style="color:#666;font-size:11px;text-align:center;margin-top:20px;">No recipes available.<br><span style="font-size:9px;">Gather materials or use a crafting station.</span></div>`;
    } else {
      html += `<div style="max-height:300px;overflow-y:auto;">`;
      for (const recipe of recipes) {
        const outColor = `#${recipe.output.color.toString(16).padStart(6, "0")}`;
        const inputsStr = recipe.inputs.map(inp => {
          const name = inp.blockType !== undefined ? (BLOCK_DEFS[inp.blockType]?.name ?? "?") : "?";
          return `${inp.count}x ${name}`;
        }).join(", ");

        html += `<div class="td-recipe" data-recipe-id="${recipe.id}" style="display:flex;align-items:center;gap:8px;padding:6px 8px;margin-bottom:3px;background:rgba(50,30,10,0.5);border:1px solid #333;border-radius:4px;cursor:pointer;transition:all 0.15s;" onmouseenter="this.style.background='rgba(80,50,20,0.7)';this.style.borderColor='#8B6914';" onmouseleave="this.style.background='rgba(50,30,10,0.5)';this.style.borderColor='#333';">`;
        html += `<div style="width:24px;height:24px;background:${outColor};border-radius:3px;border:1px solid rgba(255,255,255,0.15);flex-shrink:0;"></div>`;
        html += `<div style="flex:1;min-width:0;">`;
        html += `<div style="color:#DDCCAA;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${recipe.output.displayName}${recipe.output.count > 1 ? ` x${recipe.output.count}` : ""}</div>`;
        html += `<div style="color:#777;font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${inputsStr}</div>`;
        html += `</div></div>`;
      }
      html += `</div>`;
    }
    html += `</div>`;
    html += `</div>`;

    // Close hint
    html += `<div style="text-align:center;margin-top:10px;color:#555;font-size:9px;">Press E or ESC to close</div>`;

    this._inventoryEl.innerHTML = html;

    // Wire craft click handlers
    const recipeEls = this._inventoryEl.querySelectorAll(".td-recipe");
    recipeEls.forEach(el => {
      el.addEventListener("click", () => {
        const id = (el as HTMLElement).dataset.recipeId;
        const recipe = recipes.find(r => r.id === id);
        if (recipe) {
          if (craftRecipe(state, recipe)) {
            onCrafted(state);
            this._rebuildInventoryUI(state); // refresh
          }
        }
      });
    });
  }

  private _renderSlotRow(slots: (ItemStack | null)[], label: string): string {
    let html = "";
    if (label) html += `<div style="color:#777;font-size:9px;margin:6px 0 2px;text-transform:uppercase;letter-spacing:1px;">${label}</div>`;
    html += `<div style="display:flex;gap:2px;">`;
    for (const slot of slots) {
      html += `<div style="width:36px;height:36px;background:rgba(40,25,10,0.6);border:1px solid #444;border-radius:3px;display:flex;align-items:center;justify-content:center;position:relative;">`;
      if (slot) {
        const c = `#${slot.color.toString(16).padStart(6, "0")}`;
        html += `<div style="width:20px;height:20px;background:${c};border-radius:2px;border:1px solid rgba(255,255,255,0.1);" title="${slot.displayName}"></div>`;
        if (slot.count > 1) {
          html += `<span style="position:absolute;bottom:0;right:2px;font-size:9px;color:white;text-shadow:1px 1px 1px #000;">${slot.count}</span>`;
        }
        if (slot.durability !== undefined && slot.maxDurability) {
          const dp = slot.durability / slot.maxDurability;
          const dc = dp > 0.5 ? "#4a4" : dp > 0.2 ? "#aa8" : "#a44";
          html += `<div style="position:absolute;bottom:0;left:1px;right:1px;height:2px;background:#222;"><div style="width:${dp * 100}%;height:100%;background:${dc};"></div></div>`;
        }
      }
      html += `</div>`;
    }
    html += `</div>`;
    return html;
  }

  cleanup(): void {
    if (this._overlay) {
      this._overlay.remove();
      this._overlay = null;
    }
  }
}
