// ---------------------------------------------------------------------------
// Terraria – HUD overlay (health, mana, hotbar, inventory, messages, quests)
// ---------------------------------------------------------------------------

import { TB } from "../config/TerrariaBalance";
import type { TerrariaState } from "../state/TerrariaState";
import type { ItemStack } from "../state/TerrariaInventory";

export class TerrariaHUD {
  private _overlay: HTMLDivElement | null = null;
  private _hotbarEl: HTMLDivElement | null = null;
  private _healthEl: HTMLDivElement | null = null;
  private _manaEl: HTMLDivElement | null = null;
  private _messageEl: HTMLDivElement | null = null;
  private _questEl: HTMLDivElement | null = null;
  private _inventoryEl: HTMLDivElement | null = null;
  private _pauseEl: HTMLDivElement | null = null;
  private _depthEl: HTMLDivElement | null = null;
  private _timeEl: HTMLDivElement | null = null;

  onExit: (() => void) | null = null;

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

    // Time/depth display
    this._timeEl = document.createElement("div");
    this._timeEl.style.cssText = "position:absolute;top:10px;right:10px;color:#FFD700;font-size:12px;text-align:right;text-shadow:1px 1px 2px #000;";
    this._overlay.appendChild(this._timeEl);

    this._depthEl = document.createElement("div");
    this._depthEl.style.cssText = "position:absolute;top:28px;right:10px;color:#AAAAAA;font-size:11px;text-align:right;text-shadow:1px 1px 2px #000;";
    this._overlay.appendChild(this._depthEl);

    // Hotbar
    this._hotbarEl = document.createElement("div");
    this._hotbarEl.style.cssText = "position:absolute;bottom:10px;left:50%;transform:translateX(-50%);display:flex;gap:2px;";
    this._overlay.appendChild(this._hotbarEl);

    // Messages
    this._messageEl = document.createElement("div");
    this._messageEl.style.cssText = "position:absolute;bottom:60px;left:10px;color:#FFFFFF;font-size:12px;text-shadow:1px 1px 2px #000;max-width:400px;";
    this._overlay.appendChild(this._messageEl);

    // Quest tracker
    this._questEl = document.createElement("div");
    this._questEl.style.cssText = "position:absolute;top:60px;right:10px;color:#FFD700;font-size:11px;text-align:right;text-shadow:1px 1px 2px #000;max-width:250px;";
    this._overlay.appendChild(this._questEl);

    // Inventory overlay (hidden by default)
    this._inventoryEl = document.createElement("div");
    this._inventoryEl.style.cssText = "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(20,10,5,0.92);border:2px solid #8B6914;border-radius:8px;padding:16px;display:none;pointer-events:auto;min-width:380px;";
    this._overlay.appendChild(this._inventoryEl);

    // Pause overlay
    this._pauseEl = document.createElement("div");
    this._pauseEl.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);display:none;flex-direction:column;align-items:center;justify-content:center;pointer-events:auto;";
    this._pauseEl.innerHTML = `
      <div style="color:#FFD700;font-size:36px;font-family:Georgia,serif;text-shadow:0 0 10px rgba(255,215,0,0.5);">PAUSED</div>
      <div style="margin-top:30px;display:flex;flex-direction:column;gap:12px;">
        <button id="terraria-resume" style="padding:8px 32px;background:#2a1a0a;color:#FFD700;border:1px solid #8B6914;border-radius:4px;cursor:pointer;font-family:Georgia,serif;font-size:16px;">Resume</button>
        <button id="terraria-exit" style="padding:8px 32px;background:#2a1a0a;color:#FF6644;border:1px solid #8B6914;border-radius:4px;cursor:pointer;font-family:Georgia,serif;font-size:16px;">Exit to Menu</button>
      </div>
    `;
    this._overlay.appendChild(this._pauseEl);

    document.body.appendChild(this._overlay);

    // Button listeners
    document.getElementById("terraria-resume")?.addEventListener("click", () => {
      this._resumeCallback?.();
    });
    document.getElementById("terraria-exit")?.addEventListener("click", () => {
      this.onExit?.();
    });
  }

  private _resumeCallback: (() => void) | null = null;
  setResumeCallback(cb: () => void): void { this._resumeCallback = cb; }

  update(state: TerrariaState): void {
    if (!this._overlay) return;

    // Health
    if (this._healthEl) {
      const pct = state.player.hp / state.player.maxHp;
      this._healthEl.innerHTML = `
        <div style="font-size:11px;color:#FF4444;margin-bottom:2px;">HP ${state.player.hp}/${state.player.maxHp}</div>
        <div style="width:160px;height:8px;background:#333;border-radius:4px;overflow:hidden;">
          <div style="width:${pct * 100}%;height:100%;background:linear-gradient(90deg,#CC0000,#FF4444);"></div>
        </div>
      `;
    }

    // Mana
    if (this._manaEl) {
      const pct = state.player.mana / state.player.maxMana;
      this._manaEl.innerHTML = `
        <div style="font-size:11px;color:#4488FF;margin-bottom:2px;">MP ${state.player.mana}/${state.player.maxMana}</div>
        <div style="width:160px;height:8px;background:#333;border-radius:4px;overflow:hidden;">
          <div style="width:${pct * 100}%;height:100%;background:linear-gradient(90deg,#2244AA,#4488FF);"></div>
        </div>
      `;
    }

    // Time
    if (this._timeEl) {
      const t = state.timeOfDay;
      const hours = Math.floor(t * 24);
      const mins = Math.floor((t * 24 - hours) * 60);
      const period = hours >= 12 ? "PM" : "AM";
      const h12 = hours % 12 || 12;
      this._timeEl.textContent = `Day ${state.dayNumber} ${h12}:${mins.toString().padStart(2, "0")} ${period}`;
    }

    // Depth
    if (this._depthEl) {
      const y = Math.floor(state.player.y);
      let layer = "Surface";
      if (y < TB.UNDERWORLD_Y) layer = "Underworld";
      else if (y < TB.CAVERN_Y) layer = "Caverns";
      else if (y < TB.UNDERGROUND_Y) layer = "Underground";
      else if (y < TB.SURFACE_Y) layer = "Shallow Underground";
      this._depthEl.textContent = `Depth: ${TB.SEA_LEVEL - y}  (${layer})`;
    }

    // Hotbar
    if (this._hotbarEl) {
      this._hotbarEl.innerHTML = "";
      for (let i = 0; i < 9; i++) {
        const slot = state.player.inventory.hotbar[i];
        const selected = i === state.player.inventory.selectedSlot;
        const div = document.createElement("div");
        div.style.cssText = `width:36px;height:36px;background:${selected ? "rgba(255,215,0,0.3)" : "rgba(0,0,0,0.5)"};border:${selected ? "2px solid #FFD700" : "1px solid #555"};border-radius:3px;display:flex;align-items:center;justify-content:center;position:relative;`;
        if (slot) {
          const color = `#${slot.color.toString(16).padStart(6, "0")}`;
          div.innerHTML = `<div style="width:20px;height:20px;background:${color};border-radius:2px;"></div>`;
          if (slot.count > 1) {
            div.innerHTML += `<span style="position:absolute;bottom:0;right:2px;font-size:9px;color:white;text-shadow:1px 1px 1px #000;">${slot.count}</span>`;
          }
        }
        // Hotbar number
        div.innerHTML += `<span style="position:absolute;top:0;left:2px;font-size:8px;color:#888;">${i + 1}</span>`;
        this._hotbarEl.appendChild(div);
      }
    }

    // Messages (show last 5, fade old ones)
    if (this._messageEl) {
      const recent = state.messages.slice(-5);
      this._messageEl.innerHTML = recent.map(m => {
        const age = state.totalTime - m.time;
        const alpha = Math.max(0, 1 - age / 8);
        const color = `#${m.color.toString(16).padStart(6, "0")}`;
        return `<div style="opacity:${alpha};color:${color};margin-bottom:2px;">${m.text}</div>`;
      }).join("");
    }

    // Quest tracker
    if (this._questEl) {
      const active = state.quests.filter(q => q.unlocked && !q.completed).slice(0, 3);
      this._questEl.innerHTML = active.map(q =>
        `<div style="margin-bottom:4px;"><span style="color:#C0A060;">${q.name}</span><br><span style="color:#888;font-size:10px;">${q.progress}/${q.goal}</span></div>`
      ).join("");
    }

    // Pause menu
    if (this._pauseEl) {
      this._pauseEl.style.display = state.paused ? "flex" : "none";
    }
  }

  showInventory(state: TerrariaState): void {
    if (!this._inventoryEl) return;
    this._inventoryEl.style.display = "block";
    this._rebuildInventoryUI(state);
  }

  hideInventory(): void {
    if (!this._inventoryEl) return;
    this._inventoryEl.style.display = "none";
  }

  private _rebuildInventoryUI(state: TerrariaState): void {
    if (!this._inventoryEl) return;
    const inv = state.player.inventory;
    let html = `<div style="color:#FFD700;font-size:16px;font-family:Georgia,serif;margin-bottom:12px;text-align:center;">Inventory</div>`;

    // Armor slots
    html += `<div style="display:flex;gap:4px;margin-bottom:12px;justify-content:center;">`;
    const armorSlots = [inv.armor.helmet, inv.armor.chestplate, inv.armor.leggings, inv.armor.boots];
    const armorLabels = ["Helm", "Chest", "Legs", "Boots"];
    for (let i = 0; i < 4; i++) {
      const slot = armorSlots[i];
      html += `<div style="width:36px;height:36px;background:rgba(50,30,10,0.8);border:1px solid #8B6914;border-radius:3px;display:flex;align-items:center;justify-content:center;position:relative;">`;
      if (slot) {
        html += `<div style="width:20px;height:20px;background:#${slot.color.toString(16).padStart(6, "0")};border-radius:2px;"></div>`;
      } else {
        html += `<span style="font-size:7px;color:#555;">${armorLabels[i]}</span>`;
      }
      html += `</div>`;
    }
    html += `</div>`;

    // Hotbar
    html += this._renderSlotRow(inv.hotbar, "Hotbar");

    // Main inventory (3 rows of 9)
    for (let row = 0; row < 3; row++) {
      const slots = inv.main.slice(row * 9, row * 9 + 9);
      html += this._renderSlotRow(slots, row === 0 ? "Inventory" : "");
    }

    this._inventoryEl.innerHTML = html;
  }

  private _renderSlotRow(slots: (ItemStack | null)[], label: string): string {
    let html = "";
    if (label) html += `<div style="color:#888;font-size:10px;margin:8px 0 2px;">${label}</div>`;
    html += `<div style="display:flex;gap:2px;">`;
    for (const slot of slots) {
      html += `<div style="width:36px;height:36px;background:rgba(50,30,10,0.6);border:1px solid #555;border-radius:3px;display:flex;align-items:center;justify-content:center;position:relative;">`;
      if (slot) {
        html += `<div style="width:20px;height:20px;background:#${slot.color.toString(16).padStart(6, "0")};border-radius:2px;"></div>`;
        if (slot.count > 1) {
          html += `<span style="position:absolute;bottom:0;right:2px;font-size:9px;color:white;text-shadow:1px 1px 1px #000;">${slot.count}</span>`;
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
