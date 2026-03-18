// ---------------------------------------------------------------------------
// Terraria – HUD, Menus & Overlays (polished)
// ---------------------------------------------------------------------------

import { TB } from "../config/TerrariaBalance";
import type { TerrariaState } from "../state/TerrariaState";
import type { ItemStack } from "../state/TerrariaInventory";
import { getHeldItem } from "../state/TerrariaInventory";
import { getAllStationRecipes, hasIngredients, getIngredientStatus, getInputName, craftRecipe } from "../systems/TerrariaCraftingSystem";
import { onCrafted } from "../systems/TerrariaQuestSystem";

// ---------------------------------------------------------------------------
// Shared CSS injected once
// ---------------------------------------------------------------------------

const HUD_CSS = `
  @keyframes td-pulse{0%,100%{opacity:1}50%{opacity:0.5}}
  @keyframes td-slideIn{from{opacity:0;transform:translate(-50%,-50%) scale(0.95)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}
  @keyframes td-glow{0%,100%{box-shadow:0 0 8px rgba(255,215,0,0.3)}50%{box-shadow:0 0 16px rgba(255,215,0,0.5)}}
  .td-panel{background:linear-gradient(180deg,rgba(25,15,8,0.95),rgba(15,8,4,0.97));border:1px solid #5a4010;border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,0.6),inset 0 1px 0 rgba(255,255,255,0.04)}
  .td-bar{height:12px;background:#151010;border:1px solid #333;border-radius:6px;overflow:hidden;position:relative}
  .td-bar-fill{height:100%;border-radius:5px;transition:width 0.3s ease-out}
  .td-bar-label{position:absolute;top:0;left:0;right:0;height:100%;display:flex;align-items:center;justify-content:center;font-size:9px;color:rgba(255,255,255,0.8);text-shadow:0 1px 2px rgba(0,0,0,0.8);font-family:'Segoe UI',sans-serif;letter-spacing:0.5px}
  .td-bar-shine{position:absolute;top:0;left:0;right:0;height:45%;background:linear-gradient(180deg,rgba(255,255,255,0.1),transparent);border-radius:5px 5px 0 0;pointer-events:none}
  .td-slot{width:42px;height:42px;background:linear-gradient(180deg,rgba(50,35,18,0.7),rgba(30,20,10,0.8));border:1px solid #444;border-radius:5px;display:flex;align-items:center;justify-content:center;position:relative;box-shadow:inset 0 1px 3px rgba(0,0,0,0.3)}
  .td-slot-sel{border-color:#daa520;background:linear-gradient(180deg,rgba(80,60,20,0.5),rgba(50,35,10,0.6));animation:td-glow 2s infinite;box-shadow:inset 0 1px 3px rgba(0,0,0,0.2),0 0 8px rgba(255,215,0,0.2)}
  .td-btn2{padding:10px 24px;font-family:Georgia,serif;font-size:15px;border:1px solid #5a4010;border-radius:8px;cursor:pointer;transition:all 0.2s;min-width:200px;text-align:center;position:relative;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.3);letter-spacing:0.5px}
  .td-btn2:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,0,0,0.4);border-color:#aa8030;filter:brightness(1.1)}
  .td-btn2:active{transform:translateY(1px)}
  .td-btn2::after{content:'';position:absolute;top:0;left:0;right:0;height:45%;background:linear-gradient(180deg,rgba(255,255,255,0.05),transparent);pointer-events:none}
  .td-recipe-row{display:flex;align-items:center;gap:8px;padding:7px 10px;margin-bottom:3px;background:rgba(40,28,14,0.5);border:1px solid rgba(80,60,20,0.3);border-radius:6px;cursor:pointer;transition:all 0.15s}
  .td-recipe-row:hover{background:rgba(70,50,20,0.6);border-color:#8B6914;transform:translateX(2px)}
  .td-section{font-size:10px;color:#6a5a30;text-transform:uppercase;letter-spacing:2px;margin:10px 0 5px;padding-bottom:3px;border-bottom:1px solid rgba(100,80,30,0.2)}
`;

let _cssInjected = false;
function _injectCSS(): void {
  if (_cssInjected) return;
  _cssInjected = true;
  const style = document.createElement("style");
  style.textContent = HUD_CSS;
  document.head.appendChild(style);
}

// ---------------------------------------------------------------------------

export class TerrariaHUD {
  private _el: HTMLDivElement | null = null;

  // HUD elements
  private _barsEl: HTMLDivElement | null = null;
  private _hotbarEl: HTMLDivElement | null = null;
  private _tooltipEl: HTMLDivElement | null = null;
  private _msgEl: HTMLDivElement | null = null;
  private _questEl: HTMLDivElement | null = null;
  private _infoEl: HTMLDivElement | null = null;
  private _minimapCanvas: HTMLCanvasElement | null = null;
  private _minimapCtx: CanvasRenderingContext2D | null = null;

  // Overlay panels
  private _invEl: HTMLDivElement | null = null;
  private _pauseEl: HTMLDivElement | null = null;
  private _gameOverEl: HTMLDivElement | null = null;
  private _helpEl: HTMLDivElement | null = null;

  // Callbacks
  onExit: (() => void) | null = null;
  onRespawn: (() => void) | null = null;
  private _resumeCb: (() => void) | null = null;

  setResumeCallback(cb: () => void): void { this._resumeCb = cb; }

  // Track help key
  private _helpKeyHandler: ((e: KeyboardEvent) => void) | null = null;

  // ---------------------------------------------------------------------------
  // Build
  // ---------------------------------------------------------------------------

  build(): void {
    _injectCSS();
    this._el = document.createElement("div");
    this._el.id = "terraria-hud";
    this._el.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:10;font-family:'Segoe UI',Arial,sans-serif;";

    // ---- Top-left: HP / Mana / Defense ----
    this._barsEl = document.createElement("div");
    this._barsEl.style.cssText = "position:absolute;top:12px;left:12px;width:180px;";
    this._el.appendChild(this._barsEl);

    // ---- Top-right: Time, Depth, Minimap ----
    this._infoEl = document.createElement("div");
    this._infoEl.style.cssText = "position:absolute;top:12px;right:12px;text-align:right;";
    this._el.appendChild(this._infoEl);

    // Minimap
    this._minimapCanvas = document.createElement("canvas");
    this._minimapCanvas.width = 120;
    this._minimapCanvas.height = 80;
    this._minimapCanvas.style.cssText = "border:1px solid #5a4010;border-radius:6px;image-rendering:pixelated;background:#0a0a0a;margin-bottom:6px;box-shadow:0 2px 8px rgba(0,0,0,0.4);";
    this._minimapCtx = this._minimapCanvas.getContext("2d");
    this._infoEl.appendChild(this._minimapCanvas);

    // ---- Bottom-center: Hotbar ----
    this._hotbarEl = document.createElement("div");
    this._hotbarEl.style.cssText = "position:absolute;bottom:12px;left:50%;transform:translateX(-50%);display:flex;gap:3px;padding:6px 10px;background:rgba(10,6,3,0.6);border:1px solid rgba(90,64,16,0.3);border-radius:10px;backdrop-filter:blur(4px);";
    this._el.appendChild(this._hotbarEl);

    // ---- Bottom-center above hotbar: Tooltip ----
    this._tooltipEl = document.createElement("div");
    this._tooltipEl.style.cssText = "position:absolute;bottom:68px;left:50%;transform:translateX(-50%);text-align:center;pointer-events:none;transition:opacity 0.2s;";
    this._el.appendChild(this._tooltipEl);

    // ---- Bottom-left: Messages ----
    this._msgEl = document.createElement("div");
    this._msgEl.style.cssText = "position:absolute;bottom:72px;left:12px;max-width:380px;";
    this._el.appendChild(this._msgEl);

    // ---- Right side: Quests ----
    this._questEl = document.createElement("div");
    this._questEl.style.cssText = "position:absolute;top:110px;right:12px;max-width:170px;";
    this._el.appendChild(this._questEl);

    // ---- Inventory overlay ----
    this._invEl = document.createElement("div");
    this._invEl.className = "td-panel";
    this._invEl.style.cssText += ";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);padding:20px 24px;display:none;pointer-events:auto;min-width:540px;max-height:82vh;overflow-y:auto;animation:td-slideIn 0.2s ease-out;";
    this._el.appendChild(this._invEl);

    // ---- Game over overlay ----
    this._gameOverEl = document.createElement("div");
    this._gameOverEl.style.cssText = "position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;pointer-events:auto;overflow:hidden;";
    this._gameOverEl.innerHTML = `
      <div style="position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba(60,0,0,0.7) 0%,rgba(20,0,0,0.9) 100%);"></div>
      <div style="position:relative;text-align:center;animation:td-fadeIn 0.6s ease-out;">
        <div style="font-size:56px;color:#CC2222;font-family:Georgia,serif;text-shadow:0 0 30px rgba(200,0,0,0.5),0 4px 8px rgba(0,0,0,0.6);letter-spacing:4px;">YOU HAVE FALLEN</div>
        <div style="width:200px;height:1px;background:linear-gradient(90deg,transparent,#882222,transparent);margin:14px auto;"></div>
        <p style="color:#996666;font-size:14px;font-style:italic;font-family:Georgia,serif;margin:0 0 8px;">The quest for the Grail continues...</p>
        <div id="td-death-stats" style="color:#664444;font-size:12px;margin-bottom:28px;"></div>
        <div style="display:flex;gap:14px;justify-content:center;">
          <button class="td-btn2" id="td-respawn" style="background:linear-gradient(180deg,#3a2a12,#2a1a08);color:#FFD700;">Respawn</button>
          <button class="td-btn2" id="td-go-exit" style="background:linear-gradient(180deg,#2a1212,#1a0808);color:#CC7766;">Exit</button>
        </div>
      </div>`;
    this._el.appendChild(this._gameOverEl);

    // ---- Pause overlay ----
    this._pauseEl = document.createElement("div");
    this._pauseEl.style.cssText = "position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;pointer-events:auto;background:rgba(0,0,0,0.55);backdrop-filter:blur(3px);";
    this._pauseEl.innerHTML = `
      <div class="td-panel" style="padding:28px 36px;text-align:center;min-width:280px;animation:td-slideIn 0.2s ease-out;">
        <div style="font-size:28px;color:#FFD700;font-family:Georgia,serif;text-shadow:0 0 12px rgba(255,215,0,0.3);letter-spacing:3px;">PAUSED</div>
        <div style="width:120px;height:1px;background:linear-gradient(90deg,transparent,#5a4010,transparent);margin:12px auto 20px;"></div>
        <div style="display:flex;flex-direction:column;gap:10px;align-items:center;">
          <button class="td-btn2" id="td-resume" style="background:linear-gradient(180deg,#2a2010,#1a1408);color:#FFD700;">Resume</button>
          <button class="td-btn2" id="td-help-btn" style="background:linear-gradient(180deg,#1a1a28,#101018);color:#8899CC;">Controls & Help</button>
          <div style="width:100%;height:1px;background:rgba(90,64,16,0.2);margin:4px 0;"></div>
          <button class="td-btn2" id="td-save-quit" style="background:linear-gradient(180deg,#1a2020,#101818);color:#88AAAA;">Save & Exit</button>
          <button class="td-btn2" id="td-exit-nosave" style="background:linear-gradient(180deg,#281414,#180c0c);color:#AA7766;font-size:13px;">Exit without Saving</button>
        </div>
        <div id="td-pause-stats" style="margin-top:18px;padding-top:12px;border-top:1px solid rgba(90,64,16,0.15);font-size:11px;color:#555;text-align:left;"></div>
      </div>`;
    this._el.appendChild(this._pauseEl);

    // ---- Help overlay ----
    this._helpEl = document.createElement("div");
    this._helpEl.className = "td-panel";
    this._helpEl.style.cssText += ";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);padding:24px 32px;display:none;pointer-events:auto;min-width:460px;max-height:80vh;overflow-y:auto;animation:td-slideIn 0.2s ease-out;";
    this._helpEl.innerHTML = `
      <div style="text-align:center;margin-bottom:16px;">
        <div style="font-size:20px;color:#FFD700;font-family:Georgia,serif;letter-spacing:2px;">Controls & Help</div>
        <div style="width:100px;height:1px;background:linear-gradient(90deg,transparent,#5a4010,transparent);margin:8px auto;"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;font-size:12px;">
        <div>
          <div class="td-section">Movement</div>
          ${_helpRow("A / D or Arrows", "Move left / right")}
          ${_helpRow("Space or W", "Jump")}
          ${_helpRow("Shift", "Sprint")}
        </div>
        <div>
          <div class="td-section">Actions</div>
          ${_helpRow("Left Mouse", "Mine / Attack")}
          ${_helpRow("Right Mouse", "Place block / Interact")}
          ${_helpRow("W or Up near NPC", "Talk to NPC")}
        </div>
        <div>
          <div class="td-section">Inventory</div>
          ${_helpRow("E", "Open / Close inventory")}
          ${_helpRow("1 – 9", "Select hotbar slot")}
          ${_helpRow("Scroll Wheel", "Cycle hotbar")}
        </div>
        <div>
          <div class="td-section">System</div>
          ${_helpRow("Escape", "Pause / Close menus")}
          ${_helpRow("F1", "Toggle this help")}
        </div>
      </div>
      <div style="margin-top:18px;padding-top:12px;border-top:1px solid rgba(90,64,16,0.15);">
        <div class="td-section">Crafting Stations</div>
        <div style="font-size:11px;color:#888;line-height:1.6;">
          <b style="color:#A0785A;">Round Table</b> — basic crafting (tools, building materials)<br>
          <b style="color:#8B4513;">Forge</b> — smelting ores, advanced weapons & armor<br>
          <b style="color:#aaa;">Hand</b> — planks, torches, basic items (no station needed)
        </div>
      </div>
      <div style="margin-top:14px;padding-top:10px;border-top:1px solid rgba(90,64,16,0.15);">
        <div class="td-section">Quest Progression</div>
        <div style="font-size:11px;color:#888;line-height:1.6;">
          Build shelter → Craft tools → Mine iron → Find Excalibur → Build Camelot → Recruit knights → Defeat the Dragon → <span style="color:#FFD700;">Find the Holy Grail</span>
        </div>
      </div>
      <div style="text-align:center;margin-top:16px;">
        <button class="td-btn2" id="td-help-close" style="background:linear-gradient(180deg,#2a2010,#1a1408);color:#FFD700;min-width:120px;font-size:13px;">Close</button>
      </div>`;
    this._el.appendChild(this._helpEl);

    document.body.appendChild(this._el);

    // --- Wire button listeners ---
    document.getElementById("td-resume")?.addEventListener("click", () => this._resumeCb?.());
    document.getElementById("td-help-btn")?.addEventListener("click", () => this._toggleHelp(true));
    document.getElementById("td-help-close")?.addEventListener("click", () => this._toggleHelp(false));
    document.getElementById("td-save-quit")?.addEventListener("click", () => this.onExit?.());
    document.getElementById("td-exit-nosave")?.addEventListener("click", () => this.onExit?.());
    document.getElementById("td-respawn")?.addEventListener("click", () => this.onRespawn?.());
    document.getElementById("td-go-exit")?.addEventListener("click", () => this.onExit?.());

    // F1 help key
    this._helpKeyHandler = (e: KeyboardEvent) => {
      if (e.code === "F1") { e.preventDefault(); this._toggleHelp(); }
    };
    window.addEventListener("keydown", this._helpKeyHandler);
  }

  private _toggleHelp(show?: boolean): void {
    if (!this._helpEl) return;
    const visible = this._helpEl.style.display !== "none";
    this._helpEl.style.display = (show ?? !visible) ? "block" : "none";
  }

  // ---------------------------------------------------------------------------
  // Per-frame update
  // ---------------------------------------------------------------------------

  update(state: TerrariaState): void {
    if (!this._el) return;

    this._updateBars(state);
    this._updateInfo(state);
    this._updateHotbar(state);
    this._updateTooltip(state);
    this._updateMessages(state);
    this._updateQuests(state);
    this._updateMinimap(state);

    // Game over
    if (this._gameOverEl) {
      this._gameOverEl.style.display = state.gameOver ? "flex" : "none";
      if (state.gameOver) {
        const stats = document.getElementById("td-death-stats");
        if (stats) stats.innerHTML = `Day ${state.dayNumber} &nbsp;|&nbsp; ${state.player.blocksMined} blocks mined &nbsp;|&nbsp; ${state.player.mobsKilled} mobs slain`;
      }
    }

    // Pause
    if (this._pauseEl) {
      this._pauseEl.style.display = state.paused ? "flex" : "none";
      if (state.paused) {
        const stats = document.getElementById("td-pause-stats");
        if (stats) {
          const mins = Math.floor(state.totalTime / 60);
          const secs = Math.floor(state.totalTime % 60);
          stats.innerHTML = `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;">
              <span style="color:#777;">Playtime</span><span style="color:#aaa;">${mins}m ${secs}s</span>
              <span style="color:#777;">Day</span><span style="color:#aaa;">${state.dayNumber}</span>
              <span style="color:#777;">Blocks mined</span><span style="color:#aaa;">${state.player.blocksMined}</span>
              <span style="color:#777;">Blocks placed</span><span style="color:#aaa;">${state.player.blocksPlaced}</span>
              <span style="color:#777;">Mobs slain</span><span style="color:#aaa;">${state.player.mobsKilled}</span>
              <span style="color:#777;">Knights</span><span style="color:#aaa;">${state.player.knightsRecruited}</span>
            </div>`;
        }
      }
    }

    // Victory
    if (state.victory && !state.gameOver && !state.paused && this._questEl) {
      this._questEl.innerHTML = `<div style="text-align:center;padding:8px;background:rgba(40,30,10,0.6);border:1px solid #5a4010;border-radius:8px;">
        <div style="font-size:14px;color:#FFD700;font-family:Georgia,serif;text-shadow:0 0 10px rgba(255,215,0,0.4);animation:td-pulse 2s infinite;">THE HOLY GRAIL<br>IS FOUND!</div>
      </div>`;
    }
  }

  // ---------------------------------------------------------------------------
  // HP / Mana / Defense bars
  // ---------------------------------------------------------------------------

  private _updateBars(state: TerrariaState): void {
    if (!this._barsEl) return;
    const p = state.player;
    const hp = Math.ceil(p.hp);
    const hpPct = hp / p.maxHp;
    const mp = Math.ceil(p.mana);
    const mpPct = mp / p.maxMana;
    const low = hpPct < 0.3;

    let html = `
      <!-- HP -->
      <div class="td-bar" style="margin-bottom:6px;">
        <div class="td-bar-fill" style="width:${hpPct * 100}%;background:linear-gradient(90deg,#881111,${low ? "#dd2222" : "#cc3333"});${low ? "animation:td-pulse 0.6s infinite;" : ""}"></div>
        <div class="td-bar-shine"></div>
        <div class="td-bar-label">${hp} / ${p.maxHp}</div>
      </div>
      <!-- Mana -->
      <div class="td-bar" style="margin-bottom:6px;">
        <div class="td-bar-fill" style="width:${mpPct * 100}%;background:linear-gradient(90deg,#112266,#3366CC);"></div>
        <div class="td-bar-shine"></div>
        <div class="td-bar-label">${mp} / ${p.maxMana}</div>
      </div>`;
    if (p.defense > 0) {
      html += `<div style="font-size:11px;color:#8899AA;text-shadow:0 1px 2px rgba(0,0,0,0.6);">
        <span style="color:#6688AA;">&#9632;</span> Defense: ${p.defense}
      </div>`;
    }
    this._barsEl.innerHTML = html;
  }

  // ---------------------------------------------------------------------------
  // Time / Depth info
  // ---------------------------------------------------------------------------

  private _updateInfo(state: TerrariaState): void {
    if (!this._infoEl) return;
    const t = state.timeOfDay;
    const hours = Math.floor(t * 24);
    const mins = Math.floor((t * 24 - hours) * 60);
    const period = hours >= 12 ? "PM" : "AM";
    const h12 = hours % 12 || 12;
    const isNight = t > 0.75 || t < 0.25;

    const y = Math.floor(state.player.y);
    const depth = TB.SEA_LEVEL - y;
    let layer: string, lc: string;
    if (y < TB.UNDERWORLD_Y) { layer = "Underworld"; lc = "#FF4444"; }
    else if (y < TB.CAVERN_Y) { layer = "Caverns"; lc = "#AA66FF"; }
    else if (y < TB.UNDERGROUND_Y) { layer = "Underground"; lc = "#999"; }
    else if (y < TB.SURFACE_Y) { layer = "Shallow"; lc = "#88AA88"; }
    else { layer = "Surface"; lc = "#88CC44"; }

    // Only update the text nodes below minimap (canvas is preserved)
    const infoHTML = `
      <div style="font-size:12px;color:${isNight ? "#8888CC" : "#daa520"};text-shadow:0 1px 3px rgba(0,0,0,0.6);margin-bottom:2px;">
        Day ${state.dayNumber} &nbsp; ${h12}:${mins.toString().padStart(2, "0")} ${period}
      </div>
      <div style="font-size:11px;text-shadow:0 1px 3px rgba(0,0,0,0.6);">
        <span style="color:${lc};">${depth > 0 ? `${depth}ft deep` : `${-depth}ft high`} — ${layer}</span>
      </div>`;

    // Preserve minimap canvas
    if (this._minimapCanvas && !this._infoEl.contains(this._minimapCanvas)) {
      this._infoEl.innerHTML = "";
      this._infoEl.appendChild(this._minimapCanvas);
    }
    // Update or create text container
    let textEl = this._infoEl.querySelector(".td-info-text") as HTMLDivElement;
    if (!textEl) {
      textEl = document.createElement("div");
      textEl.className = "td-info-text";
      this._infoEl.appendChild(textEl);
    }
    textEl.innerHTML = infoHTML;
  }

  // ---------------------------------------------------------------------------
  // Hotbar
  // ---------------------------------------------------------------------------

  private _updateHotbar(state: TerrariaState): void {
    if (!this._hotbarEl) return;
    this._hotbarEl.innerHTML = "";
    for (let i = 0; i < 9; i++) {
      const slot = state.player.inventory.hotbar[i];
      const sel = i === state.player.inventory.selectedSlot;
      const div = document.createElement("div");
      div.className = sel ? "td-slot td-slot-sel" : "td-slot";
      let inner = `<span style="position:absolute;top:2px;left:3px;font-size:9px;color:${sel ? "#daa520" : "#555"};font-weight:${sel ? "bold" : "normal"};text-shadow:0 1px 1px rgba(0,0,0,0.5);">${i + 1}</span>`;
      if (slot) {
        const c = `#${slot.color.toString(16).padStart(6, "0")}`;
        inner += `<div style="width:24px;height:24px;background:${c};border-radius:3px;border:1px solid rgba(255,255,255,0.1);box-shadow:inset 0 -2px 4px rgba(0,0,0,0.2);"></div>`;
        if (slot.count > 1) inner += `<span style="position:absolute;bottom:2px;right:3px;font-size:10px;color:#eee;text-shadow:0 1px 2px rgba(0,0,0,0.8);font-weight:bold;">${slot.count}</span>`;
        if (slot.durability !== undefined && slot.maxDurability) {
          const dp = slot.durability / slot.maxDurability;
          const dc = dp > 0.5 ? "#44CC44" : dp > 0.2 ? "#CCAA22" : "#CC2222";
          inner += `<div style="position:absolute;bottom:1px;left:3px;right:3px;height:2px;background:#1a1a1a;border-radius:1px;"><div style="width:${dp * 100}%;height:100%;background:${dc};border-radius:1px;"></div></div>`;
        }
      }
      div.innerHTML = inner;
      this._hotbarEl.appendChild(div);
    }
  }

  // ---------------------------------------------------------------------------
  // Tooltip
  // ---------------------------------------------------------------------------

  private _updateTooltip(state: TerrariaState): void {
    if (!this._tooltipEl) return;
    const held = getHeldItem(state.player.inventory);
    if (!held) { this._tooltipEl.innerHTML = ""; return; }
    let tip = `<span style="color:#daa520;font-size:13px;font-family:Georgia,serif;text-shadow:0 1px 3px rgba(0,0,0,0.7);">${held.displayName}</span>`;
    const details: string[] = [];
    if (held.damage) details.push(`<span style="color:#dd6644;">${held.damage} dmg</span>`);
    if (held.defense) details.push(`<span style="color:#6688aa;">${held.defense} def</span>`);
    if (held.durability !== undefined && held.maxDurability) {
      const p = Math.floor((held.durability / held.maxDurability) * 100);
      const c = p > 50 ? "#6a6" : p > 20 ? "#aa8" : "#a44";
      details.push(`<span style="color:${c};">${p}%</span>`);
    }
    if (details.length) tip += `<br><span style="font-size:10px;">${details.join(" &nbsp; ")}</span>`;
    this._tooltipEl.innerHTML = tip;
  }

  // ---------------------------------------------------------------------------
  // Messages
  // ---------------------------------------------------------------------------

  private _updateMessages(state: TerrariaState): void {
    if (!this._msgEl) return;
    const recent = state.messages.slice(-7);
    this._msgEl.innerHTML = recent.map(m => {
      const age = state.totalTime - m.time;
      const alpha = Math.max(0, 1 - age / 10);
      if (alpha < 0.01) return "";
      const c = `#${m.color.toString(16).padStart(6, "0")}`;
      return `<div style="opacity:${alpha.toFixed(2)};color:${c};font-size:12px;margin-bottom:3px;text-shadow:0 1px 3px rgba(0,0,0,0.7);transition:opacity 0.3s;">${m.text}</div>`;
    }).join("");
  }

  // ---------------------------------------------------------------------------
  // Quest tracker
  // ---------------------------------------------------------------------------

  private _updateQuests(state: TerrariaState): void {
    if (!this._questEl || state.victory) return;
    const active = state.quests.filter(q => q.unlocked && !q.completed).slice(0, 3);
    if (!active.length) { this._questEl.innerHTML = ""; return; }
    let html = `<div style="padding:8px 10px;background:rgba(15,10,5,0.6);border:1px solid rgba(90,64,16,0.2);border-radius:8px;">
      <div style="font-size:9px;color:#5a4a20;text-transform:uppercase;letter-spacing:2px;margin-bottom:6px;">Quests</div>`;
    for (const q of active) {
      const pct = Math.min(100, Math.floor((q.progress / q.goal) * 100));
      html += `<div style="margin-bottom:7px;">
        <div style="font-size:10px;color:#c0a060;margin-bottom:2px;">${q.name}</div>
        <div style="display:flex;align-items:center;gap:6px;">
          <div style="flex:1;height:4px;background:#1a1510;border-radius:2px;overflow:hidden;">
            <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,#5a4010,#8B6914);border-radius:2px;transition:width 0.4s;"></div>
          </div>
          <span style="font-size:9px;color:#666;min-width:28px;text-align:right;">${q.progress}/${q.goal}</span>
        </div>
      </div>`;
    }
    html += `</div>`;
    this._questEl.innerHTML = html;
  }

  // ---------------------------------------------------------------------------
  // Minimap
  // ---------------------------------------------------------------------------

  private _updateMinimap(state: TerrariaState): void {
    if (!this._minimapCtx || !this._minimapCanvas) return;
    const ctx = this._minimapCtx;
    const mw = this._minimapCanvas.width;
    const mh = this._minimapCanvas.height;
    const scale = mw / state.worldWidth;

    ctx.fillStyle = "#080808";
    ctx.fillRect(0, 0, mw, mh);

    // Terrain
    for (let wx = 0; wx < state.worldWidth; wx++) {
      const cx = Math.floor(wx / TB.CHUNK_W);
      const chunk = state.chunks.get(cx);
      if (!chunk) continue;
      const lx = ((wx % TB.CHUNK_W) + TB.CHUNK_W) % TB.CHUNK_W;
      const h = chunk.heightMap[lx];
      const mx = wx * scale;
      const my = mh - (h / state.worldHeight) * mh;
      ctx.fillStyle = h > TB.SURFACE_Y ? "#3a6a2a" : h > TB.UNDERGROUND_Y ? "#6a5a3a" : "#5a5a5a";
      ctx.fillRect(mx, my, Math.max(1, scale), mh - my);
    }

    // Mobs (red dots)
    ctx.fillStyle = "#ff4444";
    for (const mob of state.mobs) {
      const mx = mob.x * scale;
      const my = mh - (mob.y / state.worldHeight) * mh;
      ctx.fillRect(mx, my, 1, 1);
    }

    // NPCs (green dots)
    ctx.fillStyle = "#44ff44";
    for (const npc of state.npcs) {
      const mx = npc.x * scale;
      const my = mh - (npc.y / state.worldHeight) * mh;
      ctx.fillRect(mx - 1, my - 1, 2, 2);
    }

    // Player (gold dot)
    ctx.fillStyle = "#FFD700";
    const px = state.player.x * scale;
    const py = mh - (state.player.y / state.worldHeight) * mh;
    ctx.fillRect(px - 1, py - 1, 3, 3);

    // Border frame
    ctx.strokeStyle = "#3a2810";
    ctx.strokeRect(0, 0, mw, mh);
  }

  // ---------------------------------------------------------------------------
  // Inventory & Crafting
  // ---------------------------------------------------------------------------

  showInventory(state: TerrariaState): void {
    if (!this._invEl) return;
    this._invEl.style.display = "block";
    this._rebuildInventory(state);
  }

  hideInventory(): void {
    if (!this._invEl) return;
    this._invEl.style.display = "none";
  }

  refreshInventory(state: TerrariaState): void {
    if (this._invEl?.style.display !== "none") this._rebuildInventory(state);
  }

  private _rebuildInventory(state: TerrariaState): void {
    if (!this._invEl) return;
    const inv = state.player.inventory;
    const station = state.craftingStation;
    const stationName = station === "forge" ? "Forge" : station === "round_table" ? "Round Table" : "Hand Craft";
    const stationIcon = station === "forge" ? "&#128293;" : station === "round_table" ? "&#9878;" : "&#9995;";

    let html = `<div style="display:flex;gap:24px;">`;

    // === LEFT: Inventory ===
    html += `<div style="flex:1;">`;
    html += `<div style="text-align:center;margin-bottom:12px;"><span style="font-size:18px;color:#daa520;font-family:Georgia,serif;letter-spacing:2px;">Inventory</span></div>`;

    // Armor
    html += `<div style="display:flex;gap:4px;margin-bottom:12px;justify-content:center;">`;
    const armorSlots = [inv.armor.helmet, inv.armor.chestplate, inv.armor.leggings, inv.armor.boots];
    const armorLabels = ["Helmet", "Chest", "Greaves", "Boots"];
    for (let i = 0; i < 4; i++) {
      const slot = armorSlots[i];
      html += `<div class="td-slot" style="width:44px;height:44px;border-color:#5a4010;" title="${armorLabels[i]}">`;
      if (slot) {
        html += `<div style="width:26px;height:26px;background:#${slot.color.toString(16).padStart(6, "0")};border-radius:3px;border:1px solid rgba(255,255,255,0.1);"></div>`;
        if (slot.defense) html += `<span style="position:absolute;bottom:1px;right:2px;font-size:8px;color:#6688aa;">+${slot.defense}</span>`;
      } else {
        html += `<span style="font-size:8px;color:#3a3020;">${armorLabels[i]}</span>`;
      }
      html += `</div>`;
    }
    html += `</div>`;

    // Hotbar
    html += `<div class="td-section">Hotbar</div>`;
    html += this._slotRow(inv.hotbar);

    // Main
    html += `<div class="td-section">Backpack</div>`;
    for (let r = 0; r < 3; r++) html += this._slotRow(inv.main.slice(r * 9, r * 9 + 9));
    html += `</div>`;

    // === RIGHT: Crafting ===
    html += `<div style="min-width:210px;border-left:1px solid rgba(90,64,16,0.15);padding-left:20px;">`;
    html += `<div style="text-align:center;margin-bottom:10px;">
      <span style="font-size:16px;color:#daa520;font-family:Georgia,serif;">${stationIcon} ${stationName}</span>
    </div>`;

    const allRecipes = getAllStationRecipes(state);
    if (!allRecipes.length) {
      html += `<div style="text-align:center;padding:24px 0;color:#555;font-size:12px;">
        No recipes at this station.<br><span style="font-size:10px;color:#444;">Use a Round Table<br>or Forge for more.</span>
      </div>`;
    } else {
      // Craftable first, then unavailable
      const craftable = allRecipes.filter(r => hasIngredients(inv, r));
      const unavailable = allRecipes.filter(r => !hasIngredients(inv, r));
      const sorted = [...craftable, ...unavailable];

      html += `<div style="max-height:340px;overflow-y:auto;padding-right:4px;">`;
      let shownDivider = false;
      for (const recipe of sorted) {
        const canCraft = hasIngredients(inv, recipe);
        if (!canCraft && !shownDivider && craftable.length > 0) {
          html += `<div style="margin:6px 0;height:1px;background:rgba(90,64,16,0.2);"></div>`;
          html += `<div style="font-size:8px;color:#4a3a20;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Need Materials</div>`;
          shownDivider = true;
        }
        const oc = `#${recipe.output.color.toString(16).padStart(6, "0")}`;
        const inputs = recipe.inputs.map(inp => {
          const name = getInputName(inp);
          const { have, need } = getIngredientStatus(inv, inp);
          const enough = have >= need;
          const haveColor = enough ? "#66aa55" : "#aa4444";
          return `<span style="color:${haveColor};">${have}/${need}</span> <span style="color:${canCraft ? "#aa9060" : "#665540"};">${name}</span>`;
        }).join(", ");
        const rowAlpha = canCraft ? "1" : "0.5";
        const cursor = canCraft ? "cursor:pointer;" : "cursor:default;opacity:0.6;";
        html += `<div class="${canCraft ? "td-recipe-row" : ""}" data-rid="${recipe.id}" data-craftable="${canCraft}" style="display:flex;align-items:center;gap:8px;padding:7px 10px;margin-bottom:3px;background:rgba(40,28,14,${canCraft ? "0.5" : "0.25"});border:1px solid rgba(80,60,20,${canCraft ? "0.3" : "0.1"});border-radius:6px;${cursor}">
          <div style="width:26px;height:26px;background:${oc};border-radius:4px;border:1px solid rgba(255,255,255,${canCraft ? "0.1" : "0.04"});flex-shrink:0;box-shadow:inset 0 -2px 4px rgba(0,0,0,0.2);opacity:${rowAlpha};"></div>
          <div style="flex:1;min-width:0;">
            <div style="color:${canCraft ? "#ddccaa" : "#776650"};font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${recipe.output.displayName}${recipe.output.count > 1 ? ` <span style="color:#888;">x${recipe.output.count}</span>` : ""}</div>
            <div style="font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${inputs}</div>
          </div>
        </div>`;
      }
      html += `</div>`;
    }
    html += `</div></div>`;
    html += `<div style="text-align:center;margin-top:14px;font-size:10px;color:#3a3020;">Press <span style="color:#5a4a20;">E</span> or <span style="color:#5a4a20;">ESC</span> to close</div>`;

    this._invEl.innerHTML = html;

    // Wire craft clicks (only on craftable rows)
    this._invEl.querySelectorAll("[data-craftable='true']").forEach(el => {
      el.addEventListener("click", () => {
        const id = (el as HTMLElement).dataset.rid;
        const recipe = allRecipes.find(r => r.id === id);
        if (recipe && craftRecipe(state, recipe)) {
          onCrafted(state);
          this._rebuildInventory(state);
        }
      });
    });
  }

  private _slotRow(slots: (ItemStack | null)[]): string {
    let html = `<div style="display:flex;gap:3px;margin-bottom:3px;">`;
    for (const slot of slots) {
      html += `<div class="td-slot">`;
      if (slot) {
        const c = `#${slot.color.toString(16).padStart(6, "0")}`;
        html += `<div style="width:22px;height:22px;background:${c};border-radius:3px;border:1px solid rgba(255,255,255,0.08);box-shadow:inset 0 -2px 3px rgba(0,0,0,0.2);" title="${slot.displayName}${slot.damage ? ` (${slot.damage} dmg)` : ""}${slot.defense ? ` (${slot.defense} def)` : ""}"></div>`;
        if (slot.count > 1) html += `<span style="position:absolute;bottom:1px;right:2px;font-size:9px;color:#ddd;text-shadow:0 1px 2px #000;">${slot.count}</span>`;
        if (slot.durability !== undefined && slot.maxDurability) {
          const dp = slot.durability / slot.maxDurability;
          const dc = dp > 0.5 ? "#4a4" : dp > 0.2 ? "#aa8" : "#a44";
          html += `<div style="position:absolute;bottom:1px;left:2px;right:2px;height:2px;background:#111;border-radius:1px;"><div style="width:${dp * 100}%;height:100%;background:${dc};border-radius:1px;"></div></div>`;
        }
      }
      html += `</div>`;
    }
    html += `</div>`;
    return html;
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  cleanup(): void {
    if (this._helpKeyHandler) window.removeEventListener("keydown", this._helpKeyHandler);
    if (this._el) { this._el.remove(); this._el = null; }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _helpRow(key: string, desc: string): string {
  return `<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid rgba(60,40,15,0.15);">
    <span style="color:#aa9050;font-size:11px;">${key}</span>
    <span style="color:#777;font-size:11px;">${desc}</span>
  </div>`;
}
