// ---------------------------------------------------------------------------
// Camelot Craft – HUD (hotbar, health, inventory, crafting, quests, messages)
// ---------------------------------------------------------------------------

import { CB } from "../config/CraftBalance";
import { BLOCK_DEFS, BlockType } from "../config/CraftBlockDefs";
import { ItemType, type ItemStack } from "../config/CraftRecipeDefs";
import type { CraftState } from "../state/CraftState";
import { getWorldBlock } from "../state/CraftState";
import { worldToChunk } from "../state/CraftChunk";
import { matchRecipe } from "../systems/CraftCraftingSystem";
import { RECIPES } from "../config/CraftRecipeDefs";
import { addToInventory } from "../state/CraftInventory";

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
  private _itemNameEl!: HTMLDivElement;
  private _crosshairV!: HTMLDivElement;
  private _crosshairH!: HTMLDivElement;
  private _lastSelectedSlot = -1;
  private _itemNameTimer = 0;
  private _invRefreshCounter = 0;
  private _recipeBook!: HTMLDivElement;
  private _recipeBookOpen = false;

  /** Callbacks */
  onCraftSlotClick?: (slotIndex: number) => void;
  onInventorySlotClick?: (section: "hotbar" | "main", index: number) => void;
  onCraftResultClick?: () => void;
  private _unequipArmor?: (slot: "helmet" | "chestplate" | "leggings" | "boots" | "weapon") => void;

  /** Set the state reference for armor unequip. */
  setUnequipHandler(state: CraftState): void {
    this._unequipArmor = (slot) => {
      const armor = state.player.inventory.armor;
      const item = armor[slot];
      if (!item) return;
      // Put into first empty hotbar or main slot
      const inv = state.player.inventory;
      for (let i = 0; i < inv.hotbar.length; i++) {
        if (!inv.hotbar[i]) { inv.hotbar[i] = item; armor[slot] = null; return; }
      }
      for (let i = 0; i < inv.main.length; i++) {
        if (!inv.main[i]) { inv.main[i] = item; armor[slot] = null; return; }
      }
    };
  }

  /** Cursor item for drag-and-drop in inventory. */
  private _cursorItem: ItemStack | null = null;
  private _cursorEl!: HTMLDivElement;

  /** Get/set the cursor item for external use. */
  getCursorItem(): ItemStack | null { return this._cursorItem; }

  /** Right-click: split stack in half or place one item. */
  handleRightClick(slots: (ItemStack | null)[], index: number): void {
    if (this._cursorItem === null) {
      // Pick up half the stack
      const item = slots[index];
      if (item && item.count > 1) {
        const half = Math.ceil(item.count / 2);
        this._cursorItem = { ...item, count: half };
        item.count -= half;
      } else if (item) {
        this._cursorItem = item;
        slots[index] = null;
      }
    } else {
      // Place one item from cursor into slot
      if (slots[index] === null) {
        slots[index] = { ...this._cursorItem, count: 1 };
        this._cursorItem.count--;
        if (this._cursorItem.count <= 0) this._cursorItem = null;
      } else if (
        slots[index]!.blockType !== undefined &&
        this._cursorItem.blockType === slots[index]!.blockType &&
        slots[index]!.count < 64
      ) {
        slots[index]!.count++;
        this._cursorItem.count--;
        if (this._cursorItem.count <= 0) this._cursorItem = null;
      }
    }
  }

  /** Handle inventory slot click: pick up or swap items. */
  handleSlotClick(slots: (ItemStack | null)[], index: number): void {
    if (this._cursorItem === null) {
      // Pick up item
      if (slots[index]) {
        this._cursorItem = slots[index];
        slots[index] = null;
      }
    } else {
      // Put down or swap
      if (slots[index] === null) {
        slots[index] = this._cursorItem;
        this._cursorItem = null;
      } else if (
        slots[index]!.blockType !== undefined &&
        this._cursorItem.blockType !== undefined &&
        slots[index]!.blockType === this._cursorItem.blockType &&
        slots[index]!.count < 64
      ) {
        // Stack matching items
        const space = 64 - slots[index]!.count;
        const transfer = Math.min(space, this._cursorItem.count);
        slots[index]!.count += transfer;
        this._cursorItem.count -= transfer;
        if (this._cursorItem.count <= 0) this._cursorItem = null;
      } else {
        // Swap
        const temp = slots[index];
        slots[index] = this._cursorItem;
        this._cursorItem = temp;
      }
    }
  }

  /** Shift-click: move item between hotbar and main inventory. */
  handleShiftClick(state: CraftState, section: "hotbar" | "main", index: number): void {
    const inv = state.player.inventory;
    const from = section === "hotbar" ? inv.hotbar : inv.main;
    const to = section === "hotbar" ? inv.main : inv.hotbar;
    const item = from[index];
    if (!item) return;

    // Check if item is armor — auto-equip instead of moving
    if (item.specialId && this._tryEquipArmor(inv, item, from, index)) return;

    // Find first empty slot in target, or stack
    for (let i = 0; i < to.length; i++) {
      if (to[i] === null) {
        to[i] = item;
        from[index] = null;
        return;
      }
    }
  }

  /** Try to equip an armor or weapon item. Returns true if equipped. */
  private _tryEquipArmor(
    inv: import("../state/CraftInventory").CraftInventory,
    item: ItemStack,
    fromSlots: (ItemStack | null)[],
    fromIndex: number,
  ): boolean {
    const id = item.specialId ?? "";
    let slot: "helmet" | "chestplate" | "leggings" | "boots" | "weapon" | null = null;
    if (id.includes("helmet")) slot = "helmet";
    else if (id.includes("chestplate")) slot = "chestplate";
    else if (id.includes("leggings")) slot = "leggings";
    else if (id.includes("boots")) slot = "boots";
    else if (item.itemType === ItemType.WEAPON) slot = "weapon";
    if (!slot) return false;

    // Swap with currently equipped item
    const current = inv.armor[slot];
    inv.armor[slot] = item;
    fromSlots[fromIndex] = current; // put old item back (or null)
    return true;
  }

  build(): void {
    // Inject global CSS animations
    if (!document.getElementById("cc-style")) {
      const style = document.createElement("style");
      style.id = "cc-style";
      style.textContent = `
        @keyframes ccFadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes ccSlideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
        @keyframes ccPulse { 0%,100% { opacity:0.7; } 50% { opacity:1; } }
        @keyframes ccGlow { 0%,100% { box-shadow:0 0 4px rgba(255,215,0,0.3); } 50% { box-shadow:0 0 12px rgba(255,215,0,0.6); } }
        @keyframes ccBounce { 0%,100% { transform:scale(1); } 50% { transform:scale(1.1); } }
        .cc-btn { transition: all 0.2s ease !important; }
        .cc-btn:hover { transform: scale(1.05) !important; filter: brightness(1.2) !important; box-shadow: 0 0 15px rgba(255,215,0,0.3) !important; }
        .cc-panel { animation: ccFadeIn 0.3s ease; }
        .cc-slide { animation: ccSlideIn 0.3s ease; }
        .cc-hotbar-sel { animation: ccGlow 1.5s ease infinite; }
        #craft-hud * { font-family: Georgia, 'Segoe UI', sans-serif; }
      `;
      document.head.appendChild(style);
    }

    this._root = document.createElement("div");
    this._root.id = "craft-hud";
    this._root.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:5;font-family:Georgia,'Segoe UI',sans-serif;`;
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
    this._buildRecipeBook();
    this._buildCursorItem();
    this._buildItemNameDisplay();
    this._buildDynamicCrosshair();
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
        <div style="display:flex;flex-direction:column;gap:2px;min-width:52px;">
          <div style="font-size:12px;color:#aaa;margin-bottom:4px;text-align:center;">Equipment</div>
          <div id="equip-helmet" class="equip-slot" title="Helmet" style="width:48px;height:48px;border:1px solid #555;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;cursor:pointer;border-radius:3px;font-size:16px;">⛑</div>
          <div id="equip-chestplate" class="equip-slot" title="Chestplate" style="width:48px;height:48px;border:1px solid #555;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;cursor:pointer;border-radius:3px;font-size:16px;">🛡</div>
          <div id="equip-leggings" class="equip-slot" title="Leggings" style="width:48px;height:48px;border:1px solid #555;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;cursor:pointer;border-radius:3px;font-size:16px;">👖</div>
          <div id="equip-boots" class="equip-slot" title="Boots" style="width:48px;height:48px;border:1px solid #555;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;cursor:pointer;border-radius:3px;font-size:16px;">👢</div>
          <div style="height:8px;"></div>
          <div id="equip-weapon" class="equip-slot" title="Weapon" style="width:48px;height:48px;border:1px solid #555;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;cursor:pointer;border-radius:3px;font-size:16px;">⚔</div>
        </div>
      </div>
    `;

    const recipeBtn = document.createElement("button");
    recipeBtn.textContent = "Recipe Book";
    recipeBtn.style.cssText = `
      display:block;margin:12px auto 0;padding:8px 20px;
      background:rgba(0,0,0,0.4);color:#4CAF50;border:1px solid #4CAF50;
      border-radius:4px;cursor:pointer;font-size:14px;font-family:Georgia,serif;
      pointer-events:auto;letter-spacing:1px;
    `;
    recipeBtn.onmouseenter = () => { recipeBtn.style.background = "rgba(76,175,80,0.2)"; };
    recipeBtn.onmouseleave = () => { recipeBtn.style.background = "rgba(0,0,0,0.4)"; };
    recipeBtn.onclick = () => {
      this._recipeBookOpen = !this._recipeBookOpen;
      this._recipeBook.style.display = this._recipeBookOpen ? "block" : "none";
    };
    card.appendChild(recipeBtn);

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
    this._updateItemName(state);
    this._updateCrosshair(state);

    // Inventory overlay visibility (throttle rebuild to every 5 frames for perf + drag stability)
    if (state.inventoryOpen || state.craftingOpen) {
      this._inventoryOverlay.style.display = "flex";
      this._invRefreshCounter = (this._invRefreshCounter ?? 0) + 1;
      if (this._invRefreshCounter % 5 === 0) {
        this._updateInventoryOverlay(state);
      }
    } else {
      this._inventoryOverlay.style.display = "none";
      this._invRefreshCounter = 0;
      // Return cursor item to inventory if closing while holding
      if (this._cursorItem && this._cursorItem.count > 0) {
        addToInventory(state.player.inventory, this._cursorItem);
        this._cursorItem = null;
      }
      if (this._recipeBookOpen) {
        this._recipeBookOpen = false;
        this._recipeBook.style.display = "none";
      }
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
      slot.style.boxShadow = isSelected ? "0 0 12px rgba(255,215,0,0.5)" : "none";
      slot.style.transform = isSelected ? "scale(1.08)" : "scale(1)";
      slot.style.transition = "all 0.15s ease";
      if (isSelected) slot.classList.add("cc-hotbar-sel");
      else slot.classList.remove("cc-hotbar-sel");

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
        itemDiv.title = item.displayName; // Tooltip on hover
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
    const active = state.quests.filter((q) => !q.completed && q.unlocked).slice(0, 4);
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

    // Crafting grid — click to place/pickup items
    const gridEl = this._inventoryOverlay.querySelector("#craft-grid") as HTMLDivElement;
    gridEl.innerHTML = "";
    for (let i = 0; i < 9; i++) {
      const slot = this._makeSlot(inv.craftGrid[i]);
      slot.style.pointerEvents = "auto";
      slot.style.cursor = "pointer";
      const idx = i;
      slot.onclick = (e) => {
        if (e.shiftKey && inv.craftGrid[idx]) {
          // Shift-click: move back to inventory
          this.handleShiftClick(state, "main", -1); // dummy, handled below
          const item = inv.craftGrid[idx];
          if (item) {
            for (let j = 0; j < inv.hotbar.length; j++) {
              if (!inv.hotbar[j]) { inv.hotbar[j] = item; inv.craftGrid[idx] = null; break; }
            }
            if (inv.craftGrid[idx]) { // still not moved
              for (let j = 0; j < inv.main.length; j++) {
                if (!inv.main[j]) { inv.main[j] = item; inv.craftGrid[idx] = null; break; }
              }
            }
          }
        } else {
          this.handleSlotClick(inv.craftGrid, idx);
        }
        // Live-update crafting result
        inv.craftResult = matchRecipe(inv.craftGrid, 3);
      };
      gridEl.appendChild(slot);
    }

    // Craft result — click to take crafted item
    const resultEl = this._inventoryOverlay.querySelector("#craft-result") as HTMLDivElement;
    resultEl.innerHTML = "";
    if (inv.craftResult) {
      resultEl.appendChild(this._makeItemDisplay(inv.craftResult));
      resultEl.style.pointerEvents = "auto";
      resultEl.style.cursor = "pointer";
      resultEl.onclick = () => this.onCraftResultClick?.();
    }

    // Main inventory (click = pick up / place, shift-click = move to hotbar)
    const mainEl = this._inventoryOverlay.querySelector("#inv-main") as HTMLDivElement;
    mainEl.innerHTML = "";
    for (let i = 0; i < inv.main.length; i++) {
      const slot = this._makeSlot(inv.main[i]);
      const idx = i;
      slot.onclick = (e) => {
        if (e.shiftKey) this.handleShiftClick(state, "main", idx);
        else this.handleSlotClick(inv.main, idx);
      };
      slot.oncontextmenu = (e) => { e.preventDefault(); this.handleRightClick(inv.main, idx); };
      mainEl.appendChild(slot);
    }

    // Hotbar in overlay (click = pick up / place, shift-click = move to main)
    const hotbarEl = this._inventoryOverlay.querySelector("#inv-hotbar") as HTMLDivElement;
    hotbarEl.innerHTML = "";
    for (let i = 0; i < inv.hotbar.length; i++) {
      const slot = this._makeSlot(inv.hotbar[i]);
      const idx = i;
      slot.onclick = (e) => {
        if (e.shiftKey) this.handleShiftClick(state, "hotbar", idx);
        else this.handleSlotClick(inv.hotbar, idx);
      };
      slot.oncontextmenu = (e) => { e.preventDefault(); this.handleRightClick(inv.hotbar, idx); };
      hotbarEl.appendChild(slot);
    }

    // Equipment slots
    const equipSlots: Array<{ key: "helmet" | "chestplate" | "leggings" | "boots" | "weapon"; icon: string }> = [
      { key: "helmet", icon: "⛑" },
      { key: "chestplate", icon: "🛡" },
      { key: "leggings", icon: "👖" },
      { key: "boots", icon: "👢" },
      { key: "weapon", icon: "⚔" },
    ];
    for (const { key, icon } of equipSlots) {
      const el = this._inventoryOverlay.querySelector(`#equip-${key}`) as HTMLDivElement;
      if (!el) continue;
      const equipped = inv.armor[key];
      el.innerHTML = "";
      if (equipped) {
        el.appendChild(this._makeItemDisplay(equipped));
        const c = equipped.color;
        const r = (c >> 16) & 0xFF, g = (c >> 8) & 0xFF, b = c & 0xFF;
        el.style.background = `rgba(${r},${g},${b},0.3)`;
        el.style.borderColor = "#FFD700";
        el.title = equipped.displayName;
      } else {
        el.textContent = icon;
        el.style.background = "rgba(0,0,0,0.5)";
        el.style.borderColor = "#555";
        el.title = key.charAt(0).toUpperCase() + key.slice(1);
      }
      el.style.pointerEvents = "auto";
      el.style.cursor = "pointer";
      el.onclick = () => this._unequipArmor?.(key);
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
    if (state.player.inWater) {
      this._waterOverlay.style.display = "block";
      // Underwater distortion: wobbly edge via animated border-radius + blur
      const t = state.totalTime;
      const wobble = Math.sin(t * 2) * 3 + Math.cos(t * 1.3) * 2;
      this._waterOverlay.style.backdropFilter = `blur(${1 + wobble * 0.3}px)`;
      this._waterOverlay.style.background = `radial-gradient(ellipse at center,
        rgba(33,150,243,0.15) 0%,
        rgba(13,71,161,0.35) 100%)`;
    } else {
      this._waterOverlay.style.display = "none";
      this._waterOverlay.style.backdropFilter = "none";
    }
  }

  private _updateDamageFlash(state: CraftState): void {
    const p = state.player;

    if (p.hp < this._lastHp) {
      // Took damage — red flash with radial vignette
      this._damageFlash.style.background = `radial-gradient(ellipse at center, rgba(229,57,53,0.0) 40%, rgba(229,57,53,0.5) 100%)`;
      setTimeout(() => {
        if (p.hp > 4) this._damageFlash.style.background = "rgba(229,57,53,0.0)";
      }, 250);
    }
    this._lastHp = p.hp;

    // Low HP: pulsing red vignette that intensifies as HP drops
    if (p.hp <= 6 && p.hp > 0) {
      const intensity = (1 - p.hp / 6) * 0.4; // 0 at 6hp, 0.4 at 1hp
      const pulse = Math.sin(state.totalTime * 3) * intensity * 0.4 + intensity;
      this._damageFlash.style.background =
        `radial-gradient(ellipse at center, rgba(229,57,53,0.0) 30%, rgba(229,57,53,${pulse}) 100%)`;
    } else if (p.hp > 6) {
      // Ensure it's clear when HP is fine
      if (!this._damageFlash.style.background.includes("0.0)")) {
        this._damageFlash.style.background = "rgba(229,57,53,0.0)";
      }
    }

    // Near-death heartbeat visual (screen pulse at very low HP)
    if (p.hp <= 3 && p.hp > 0) {
      const beat = Math.abs(Math.sin(state.totalTime * 4));
      this._damageFlash.style.transform = `scale(${1 + beat * 0.01})`;
    } else {
      this._damageFlash.style.transform = "scale(1)";
    }
  }

  // --- Recipe Book ---
  private _buildRecipeBook(): void {
    this._recipeBook = document.createElement("div");
    this._recipeBook.style.cssText = `
      position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:110;
      background:rgba(30,20,10,0.95);border:2px solid #4CAF50;border-radius:8px;
      padding:20px;color:white;font-family:'Segoe UI',sans-serif;
      max-height:70vh;max-width:500px;overflow-y:auto;display:none;
      box-shadow:0 0 30px rgba(76,175,80,0.3);pointer-events:auto;
    `;

    const header = document.createElement("div");
    header.style.cssText = `display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;`;
    header.innerHTML = `<h3 style="color:#4CAF50;margin:0;font-size:18px;">Recipe Book</h3>`;
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "X";
    closeBtn.style.cssText = `background:none;border:1px solid #666;color:#aaa;padding:2px 8px;cursor:pointer;border-radius:3px;font-size:14px;`;
    closeBtn.onclick = () => {
      this._recipeBookOpen = false;
      this._recipeBook.style.display = "none";
    };
    header.appendChild(closeBtn);
    this._recipeBook.appendChild(header);

    // Group recipes by type
    const shaped = RECIPES.filter(r => r.type === "shaped");
    const shapeless = RECIPES.filter(r => r.type === "shapeless");
    const smelting = RECIPES.filter(r => r.type === "smelt");

    const addSection = (title: string, recipes: typeof RECIPES) => {
      if (recipes.length === 0) return;
      const sec = document.createElement("div");
      sec.style.cssText = `margin-bottom:12px;`;
      sec.innerHTML = `<div style="color:#FFD700;font-size:13px;font-weight:bold;margin-bottom:6px;border-bottom:1px solid #333;padding-bottom:4px;">${title}</div>`;

      for (const recipe of recipes) {
        const row = document.createElement("div");
        row.style.cssText = `display:flex;align-items:center;gap:8px;margin-bottom:6px;padding:4px;border-radius:3px;background:rgba(255,255,255,0.03);`;

        // Result icon
        const resultColor = recipe.result.color;
        const rr = (resultColor >> 16) & 0xFF, rg = (resultColor >> 8) & 0xFF, rb = resultColor & 0xFF;
        const resultIcon = document.createElement("div");
        resultIcon.style.cssText = `width:24px;height:24px;background:rgb(${rr},${rg},${rb});border-radius:3px;border:1px solid rgba(255,255,255,0.2);flex-shrink:0;`;
        resultIcon.title = recipe.result.displayName;

        // Result name
        const resultName = document.createElement("span");
        resultName.style.cssText = `color:#E0D0A0;font-size:12px;min-width:120px;`;
        resultName.textContent = recipe.result.displayName + (recipe.result.count > 1 ? ` x${recipe.result.count}` : "");

        // Ingredients
        const ingredients = document.createElement("span");
        ingredients.style.cssText = `color:#888;font-size:11px;`;

        if (recipe.type === "shaped") {
          const blocks = recipe.pattern.flat().filter(b => b !== null);
          const counts = new Map<string, number>();
          for (const b of blocks) {
            const name = BLOCK_DEFS[b!]?.name ?? `Block#${b}`;
            counts.set(name, (counts.get(name) ?? 0) + 1);
          }
          ingredients.textContent = [...counts.entries()].map(([n, c]) => c > 1 ? `${n} x${c}` : n).join(", ");
        } else if (recipe.type === "shapeless") {
          const counts = new Map<string, number>();
          for (const b of recipe.ingredients) {
            const name = BLOCK_DEFS[b]?.name ?? `Block#${b}`;
            counts.set(name, (counts.get(name) ?? 0) + 1);
          }
          ingredients.textContent = [...counts.entries()].map(([n, c]) => c > 1 ? `${n} x${c}` : n).join(", ");
        } else if (recipe.type === "smelt") {
          const name = BLOCK_DEFS[recipe.input]?.name ?? `Block#${recipe.input}`;
          ingredients.textContent = `${name} (smelt ${recipe.time}s)`;
        }

        row.appendChild(resultIcon);
        row.appendChild(resultName);
        row.appendChild(ingredients);
        sec.appendChild(row);
      }

      this._recipeBook.appendChild(sec);
    };

    addSection("Crafting Recipes", shaped);
    addSection("Shapeless Recipes", shapeless);
    addSection("Smelting Recipes", smelting);

    document.body.appendChild(this._recipeBook);
  }

  // --- Cursor item (drag-and-drop) ---
  private _buildCursorItem(): void {
    this._cursorEl = document.createElement("div");
    this._cursorEl.style.cssText = `
      position:fixed; pointer-events:none; z-index:100;
      width:32px; height:32px; display:none;
    `;
    document.body.appendChild(this._cursorEl);

    // Track mouse for cursor item position
    document.addEventListener("mousemove", (e) => {
      if (this._cursorItem) {
        this._cursorEl.style.left = `${e.clientX - 16}px`;
        this._cursorEl.style.top = `${e.clientY - 16}px`;
        this._cursorEl.style.display = "block";
        const c = this._cursorItem.color;
        const r = (c >> 16) & 0xFF, g = (c >> 8) & 0xFF, b = c & 0xFF;
        this._cursorEl.style.background = `rgb(${r},${g},${b})`;
        this._cursorEl.style.borderRadius = "4px";
        this._cursorEl.style.border = "2px solid rgba(255,255,255,0.5)";
        this._cursorEl.style.boxShadow = "0 0 8px rgba(0,0,0,0.5)";
      } else {
        this._cursorEl.style.display = "none";
      }
    });
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
    const slots = ["helmet", "chestplate", "leggings", "boots", "weapon"];
    const icons = ["⛑", "🛡", "👖", "👢", "⚔"];
    for (let i = 0; i < 5; i++) {
      const slot = document.createElement("div");
      slot.id = `armor-${slots[i]}`;
      slot.style.cssText = `
        width:28px; height:28px; border:1px solid #555; background:rgba(0,0,0,0.4);
        display:flex; align-items:center; justify-content:center;
        font-size:14px; border-radius:3px;
      `;
      slot.textContent = icons[i];
      slot.title = `${slots[i]} (click to unequip)`;
      slot.style.cursor = "pointer";
      slot.style.pointerEvents = "auto";
      const slotName = slots[i] as "helmet" | "chestplate" | "leggings" | "boots" | "weapon";
      slot.onclick = () => this._unequipArmor?.(slotName);
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
      { key: "weapon", item: armor.weapon },
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

  // --- Selected item name display ---
  private _buildItemNameDisplay(): void {
    this._itemNameEl = document.createElement("div");
    this._itemNameEl.style.cssText = `
      position:absolute; bottom:68px; left:50%; transform:translateX(-50%);
      color:#FFD700; font-size:13px; text-shadow:1px 1px 3px black, 0 0 8px rgba(255,215,0,0.3);
      font-family:Georgia,serif; letter-spacing:1px; opacity:0;
      transition:opacity 0.3s ease; white-space:nowrap;
    `;
    this._root.appendChild(this._itemNameEl);
  }

  private _updateItemName(state: CraftState): void {
    const slot = state.player.inventory.selectedSlot;
    const item = state.player.inventory.hotbar[slot];

    if (slot !== this._lastSelectedSlot) {
      this._lastSelectedSlot = slot;
      this._itemNameTimer = 3;
      if (item) {
        this._itemNameEl.textContent = item.displayName;
        this._itemNameEl.style.opacity = "1";
      } else {
        this._itemNameEl.style.opacity = "0";
      }
    }

    if (this._itemNameTimer > 0) {
      this._itemNameTimer -= 0.016;
      if (this._itemNameTimer <= 0.5) {
        this._itemNameEl.style.opacity = String(Math.max(0, this._itemNameTimer / 0.5));
      }
    }
  }

  // --- Dynamic crosshair ---
  private _buildDynamicCrosshair(): void {
    this._crosshairV = document.createElement("div");
    this._crosshairV.style.cssText = `
      position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
      width:2px; height:16px; background:rgba(255,255,255,0.9); pointer-events:none; z-index:10;
      transition: all 0.15s ease; border-radius:1px;
      box-shadow: 0 0 4px rgba(0,0,0,0.8);
    `;
    document.body.appendChild(this._crosshairV);

    this._crosshairH = document.createElement("div");
    this._crosshairH.style.cssText = `
      position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
      width:16px; height:2px; background:rgba(255,255,255,0.9); pointer-events:none; z-index:10;
      transition: all 0.15s ease; border-radius:1px;
      box-shadow: 0 0 4px rgba(0,0,0,0.8);
    `;
    document.body.appendChild(this._crosshairH);
  }

  private _updateCrosshair(state: CraftState): void {
    if (!this._crosshairV || !this._crosshairH) return;

    const target = state.player.miningTarget;
    const held = state.player.inventory.hotbar[state.player.inventory.selectedSlot];

    if (target && target.progress > 0) {
      // Mining: expand + orange
      const sp = 4 + target.progress * 10;
      this._crosshairV.style.height = `${16 + sp * 2}px`;
      this._crosshairH.style.width = `${16 + sp * 2}px`;
      this._crosshairV.style.background = this._crosshairH.style.background = "#FF9800";
    } else if (state.player.blocking) {
      this._crosshairV.style.height = this._crosshairH.style.width = "10px";
      this._crosshairV.style.background = this._crosshairH.style.background = "#42A5F5";
    } else if (held?.itemType === "weapon") {
      this._crosshairV.style.height = this._crosshairH.style.width = "20px";
      this._crosshairV.style.background = this._crosshairH.style.background = "#e53935";
    } else if (held?.itemType === "block") {
      this._crosshairV.style.height = this._crosshairH.style.width = "12px";
      this._crosshairV.style.background = this._crosshairH.style.background = "#4CAF50";
    } else {
      this._crosshairV.style.height = this._crosshairH.style.width = "16px";
      this._crosshairV.style.background = this._crosshairH.style.background = "rgba(255,255,255,0.9)";
    }

    const vis = (state.inventoryOpen || state.craftingOpen) ? "none" : "block";
    this._crosshairV.style.display = this._crosshairH.style.display = vis;
  }

  destroy(): void {
    this._root.remove();
    this._recipeBook?.remove();
    this._crosshairV?.remove();
    this._crosshairH?.remove();
    this._cursorEl?.remove();
    document.getElementById("cc-style")?.remove();
  }
}
