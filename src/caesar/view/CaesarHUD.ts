// ---------------------------------------------------------------------------
// Caesar – HUD (HTML overlay)
// ---------------------------------------------------------------------------

import { CB } from "../config/CaesarBalance";
import {
  CaesarBuildingType,
  CAESAR_BUILDING_DEFS,
  HOUSING_TIER_NAMES,
  type CaesarBuildingCategory,
  type CaesarBuildingDef,
  getMaintenanceCost,
} from "../config/CaesarBuildingDefs";
import { CaesarResourceType, RESOURCE_META } from "../config/CaesarResourceDefs";
import type { CaesarState, CaesarTool } from "../state/CaesarState";
import { getGameDateString, SCENARIOS } from "../state/CaesarState";
import { hasSave } from "../systems/CaesarSaveSystem";
import { isBuildingRoadConnected } from "../systems/CaesarBuildingSystem";
import { canUpgrade } from "../systems/CaesarUpgradeSystem";

export class CaesarHUD {
  private _root: HTMLDivElement | null = null;
  private _topBar: HTMLDivElement | null = null;
  private _bottomBar: HTMLDivElement | null = null;
  private _infoPanel: HTMLDivElement | null = null;
  private _ratingPanel: HTMLDivElement | null = null;
  private _advisorPanel: HTMLDivElement | null = null;
  private _notification: HTMLDivElement | null = null;
  private _eventBanner: HTMLDivElement | null = null;
  private _tooltip: HTMLDivElement | null = null;
  private _gameOverOverlay: HTMLDivElement | null = null;
  private _settingsOverlay: HTMLDivElement | null = null;
  private _notifyTimeout: number | null = null;
  private _selectedCategory: CaesarBuildingCategory = "food";
  private _toolButtons: Map<string, HTMLButtonElement> = new Map();
  private _helpOverlay: HTMLDivElement | null = null;
  private _statsOverlay: HTMLDivElement | null = null;
  private _escapeMenu: HTMLDivElement | null = null;
  private _wikiOverlay: HTMLDivElement | null = null;

  // Callbacks
  onSelectTool: ((tool: CaesarTool) => void) | null = null;
  onSelectBuildingType: ((type: CaesarBuildingType) => void) | null = null;
  onStartGame: ((difficulty: string, scenarioId: number) => void) | null = null;
  onExit: (() => void) | null = null;
  onSpeedChange: ((speed: number) => void) | null = null;
  onSave: (() => void) | null = null;
  onLoad: (() => void) | null = null;
  onUpgrade: ((buildingId: number) => void) | null = null;
  onSetPriority: ((buildingId: number, priority: "high" | "normal" | "low") => void) | null = null;
  onCaravanBuy: ((index: number) => void) | null = null;
  onCaravanSell: ((index: number) => void) | null = null;
  onUndo: (() => void) | null = null;

  build(): void {
    this._root = document.createElement("div");
    this._root.id = "caesar-hud";
    this._root.style.cssText = `
      position: fixed; inset: 0; pointer-events: none; z-index: 100;
      font-family: 'Segoe UI', system-ui, sans-serif; color: #f0e6d2;
    `;
    document.body.appendChild(this._root);

    this._buildSettingsOverlay();
  }

  private _buildSettingsOverlay(): void {
    this._settingsOverlay = document.createElement("div");
    this._settingsOverlay.style.cssText = `
      position: fixed; inset: 0; display: flex; align-items: center; justify-content: center;
      background: rgba(0,0,0,0.85); pointer-events: all; z-index: 200;
    `;

    const box = document.createElement("div");
    box.style.cssText = `
      background: #2a1f14; border: 2px solid #8b6914; border-radius: 8px;
      padding: 32px 40px; text-align: center; min-width: 360px;
    `;

    // Build scenario options
    let scenarioHTML = "";
    for (const s of SCENARIOS) {
      scenarioHTML += `<option value="${s.id}"${s.id === 0 ? " selected" : ""}>${s.title} — Pop ${s.goals.population}</option>`;
    }

    box.innerHTML = `
      <h1 style="font-size:28px; margin:0 0 4px; color:#ffd700; font-family:serif;">Medieval Caesar</h1>
      <p style="font-size:13px; margin:0 0 16px; color:#cdb891;">
        Build a thriving medieval town for the King.
      </p>
      <div style="text-align:left; font-size:12px; color:#aa9977; margin-bottom:12px; padding:10px; background:#1a1208; border-radius:6px; border:1px solid #332a14; line-height:1.6;">
        <b style="color:#ffd700; font-size:13px;">⚜ How to Play ⚜</b><br><br>
        <b style="color:#cdb891;">Building Your Town:</b><br>
        · Place <b style="color:#ddd;">roads</b> first — buildings must be adjacent to roads<br>
        · Build <b style="color:#8c8;">farms</b> → <b style="color:#8c8;">mills</b> → <b style="color:#8c8;">bakeries</b> for food production chains<br>
        · <b style="color:#8c8;">Markets</b> deliver food to housing, <b style="color:#88c;">chapels</b> deliver religion<br>
        · Housing evolves with services + cloth/tools for higher tiers<br><br>
        <b style="color:#cdb891;">Economy & Resources:</b><br>
        · Build <b style="color:#cc8;">granaries</b> and <b style="color:#cc8;">warehouses</b> to increase storage capacity<br>
        · <b style="color:#cc8;">Guild halls</b> trade surplus cloth/tools for gold<br>
        · Pay the King's tribute each year to maintain favor<br>
        · Trade caravans arrive periodically — buy and sell resources<br><br>
        <b style="color:#cdb891;">Controls:</b><br>
        · <b style="color:#ddd;">WASD</b> / arrows: pan camera &nbsp;|&nbsp; <b style="color:#ddd;">Scroll</b>: zoom<br>
        · <b style="color:#ddd;">1-4</b>: tools (select/build/road/demolish)<br>
        · <b style="color:#ddd;">Shift+drag</b>: pan &nbsp;|&nbsp; <b style="color:#ddd;">F5</b>: save &nbsp;|&nbsp; <b style="color:#ddd;">F9</b>: load<br>
        · <b style="color:#ddd;">0</b>: pause &nbsp; <b style="color:#ddd;">-</b>: normal &nbsp; <b style="color:#ddd;">=</b>: fast &nbsp; <b style="color:#ddd;">+</b>: fastest<br>
        · <b style="color:#ddd;">Ctrl+Z</b>: undo last build &nbsp;|&nbsp; <b style="color:#ddd;">Tab</b>: town statistics<br>
        · <b style="color:#ddd;">Click+drag</b>: place roads/housing continuously<br>
        · <b style="color:#ddd;">Escape</b>: deselect tool &nbsp;|&nbsp; <b style="color:#ddd;">?</b>: show this help in-game
      </div>
      <div style="margin-bottom:12px;">
        <label style="font-size:14px;">Scenario:</label><br>
        <select id="caesar-scenario" style="
          margin-top:4px; padding:6px 12px; font-size:13px; background:#1a1208;
          color:#f0e6d2; border:1px solid #8b6914; border-radius:4px; cursor:pointer; width:100%;
        ">${scenarioHTML}</select>
        <div id="caesar-scenario-desc" style="margin-top:4px; font-size:11px; color:#8a7a60; min-height:24px;"></div>
      </div>
      <div style="margin-bottom:16px;">
        <label style="font-size:14px;">Difficulty:</label><br>
        <select id="caesar-difficulty" style="
          margin-top:4px; padding:6px 12px; font-size:14px; background:#1a1208;
          color:#f0e6d2; border:1px solid #8b6914; border-radius:4px; cursor:pointer;
        ">
          <option value="easy">Easy</option>
          <option value="normal" selected>Normal</option>
          <option value="hard">Hard</option>
        </select>
      </div>
      <button id="caesar-start-btn" style="
        padding: 10px 32px; font-size: 16px; background: #8b6914; color: #fff;
        border: none; border-radius: 4px; cursor: pointer; margin-right: 8px;
      ">Start Game</button>
      ${hasSave() ? `<button id="caesar-load-btn" style="
        padding: 10px 24px; font-size: 16px; background: #2a5a2a; color: #fff;
        border: none; border-radius: 4px; cursor: pointer; margin-right: 8px;
      ">Load Save</button>` : ""}
      <button id="caesar-back-btn" style="
        padding: 10px 24px; font-size: 16px; background: #444; color: #ccc;
        border: none; border-radius: 4px; cursor: pointer;
      ">Back</button>
    `;

    this._settingsOverlay.appendChild(box);
    this._root!.appendChild(this._settingsOverlay);

    // Scenario description update
    const scenarioSelect = box.querySelector("#caesar-scenario") as HTMLSelectElement;
    const scenarioDesc = box.querySelector("#caesar-scenario-desc") as HTMLDivElement;
    const updateDesc = () => {
      const s = SCENARIOS[parseInt(scenarioSelect.value)] ?? SCENARIOS[0];
      scenarioDesc.textContent = s.briefing;
    };
    scenarioSelect.addEventListener("change", updateDesc);
    updateDesc();

    box.querySelector("#caesar-start-btn")!.addEventListener("click", () => {
      const diff = (box.querySelector("#caesar-difficulty") as HTMLSelectElement).value;
      const scen = parseInt(scenarioSelect.value);
      this._settingsOverlay!.style.display = "none";
      this._buildGameHUD();
      this.onStartGame?.(diff, scen);
    });

    const loadBtn = box.querySelector("#caesar-load-btn");
    if (loadBtn) {
      loadBtn.addEventListener("click", () => {
        this._settingsOverlay!.style.display = "none";
        this._buildGameHUD();
        // Start with default, then load overwrites
        this.onStartGame?.("normal", 0);
        setTimeout(() => this.onLoad?.(), 100);
      });
    }

    box.querySelector("#caesar-back-btn")!.addEventListener("click", () => {
      this.onExit?.();
    });
  }

  private _buildGameHUD(): void {
    // Top bar
    this._topBar = document.createElement("div");
    this._topBar.style.cssText = `
      position: absolute; top: 0; left: 0; right: 0; height: 36px;
      background: linear-gradient(180deg, #2a1f14 0%, #1a150f 100%);
      display: flex; align-items: center; padding: 0 12px; gap: 16px;
      font-size: 13px; pointer-events: all; border-bottom: 2px solid #8b6914;
    `;
    this._root!.appendChild(this._topBar);

    this._ratingPanel = document.createElement("div");
    this._ratingPanel.style.cssText = `margin-left: auto; display: flex; gap: 14px; font-size: 12px;`;
    this._topBar.appendChild(this._ratingPanel);

    // Event banner
    this._eventBanner = document.createElement("div");
    this._eventBanner.style.cssText = `
      position: absolute; top: 40px; left: 50%; transform: translateX(-50%);
      background: rgba(139,105,20,0.95); padding: 6px 20px; border-radius: 4px;
      font-size: 13px; pointer-events: none; display: none; white-space: nowrap;
      border: 1px solid #ffd700;
    `;
    this._root!.appendChild(this._eventBanner);

    // Bottom bar
    this._bottomBar = document.createElement("div");
    this._bottomBar.style.cssText = `
      position: absolute; bottom: 0; left: 0; right: 200px;
      background: linear-gradient(0deg, #1a150f 0%, #2a1f14 100%);
      padding: 6px 12px; pointer-events: all; border-top: 2px solid #8b6914;
    `;
    this._root!.appendChild(this._bottomBar);

    // Tool buttons row
    const toolRow = document.createElement("div");
    toolRow.style.cssText = `display: flex; gap: 6px; margin-bottom: 6px;`;

    const tools: { tool: CaesarTool; label: string; key: string }[] = [
      { tool: "select", label: "Select (1)", key: "1" },
      { tool: "build", label: "Build (2)", key: "2" },
      { tool: "road", label: "Road (3)", key: "3" },
      { tool: "demolish", label: "Demolish (4)", key: "4" },
    ];

    for (const t of tools) {
      const btn = document.createElement("button");
      btn.textContent = t.label;
      btn.dataset.tool = t.tool;
      btn.style.cssText = `
        padding: 4px 10px; font-size: 12px; background: #3a2a15; color: #f0e6d2;
        border: 1px solid #5a4020; border-radius: 3px; cursor: pointer;
      `;
      btn.addEventListener("click", () => this.onSelectTool?.(t.tool));
      toolRow.appendChild(btn);
      this._toolButtons.set(t.tool, btn);
    }

    // Speed controls
    const speedBtns = [
      { label: "||", speed: 0 },
      { label: ">", speed: 1 },
      { label: ">>", speed: 2 },
      { label: ">>>", speed: 4 },
    ];
    const spacer = document.createElement("div");
    spacer.style.cssText = `flex:1;`;
    toolRow.appendChild(spacer);

    for (const sb of speedBtns) {
      const btn = document.createElement("button");
      btn.textContent = sb.label;
      btn.style.cssText = `
        padding: 4px 8px; font-size: 11px; background: #2a1f14; color: #cdb891;
        border: 1px solid #5a4020; border-radius: 3px; cursor: pointer; min-width: 32px;
      `;
      btn.addEventListener("click", () => this.onSpeedChange?.(sb.speed));
      toolRow.appendChild(btn);
    }

    this._bottomBar.appendChild(toolRow);

    // Category tabs row
    const catRow = document.createElement("div");
    catRow.id = "caesar-cat-row";
    catRow.style.cssText = `display: none; gap: 4px; margin-bottom: 4px;`;
    this._bottomBar.appendChild(catRow);

    const categories: { cat: CaesarBuildingCategory; label: string }[] = [
      { cat: "housing", label: "Housing" },
      { cat: "infrastructure", label: "Infra" },
      { cat: "food", label: "Food" },
      { cat: "industry", label: "Industry" },
      { cat: "religion", label: "Religion" },
      { cat: "safety", label: "Military" },
      { cat: "entertainment", label: "Fun" },
      { cat: "commerce", label: "Commerce" },
    ];

    for (const c of categories) {
      const btn = document.createElement("button");
      btn.textContent = c.label;
      btn.dataset.cat = c.cat;
      btn.style.cssText = `
        padding: 2px 8px; font-size: 11px; background: #2a1f14; color: #aa9977;
        border: 1px solid #3a2a15; border-radius: 3px; cursor: pointer;
      `;
      btn.addEventListener("click", () => {
        this._selectedCategory = c.cat;
        this._forceBuildMenuUpdate = true;
      });
      catRow.appendChild(btn);
    }

    // Building buttons row
    const buildRow = document.createElement("div");
    buildRow.id = "caesar-build-row";
    buildRow.style.cssText = `display: none; gap: 4px; flex-wrap: wrap; max-height: 64px; overflow-y: auto;`;
    this._bottomBar.appendChild(buildRow);

    const shortcutHint = document.createElement("div");
    shortcutHint.style.cssText = "font-size:9px; color:#8a7a60; text-align:center; margin-top:2px;";
    shortcutHint.textContent = "1:Select 2:Build 3:Road 4:Demolish | ?:Help Tab:Stats Ctrl+Z:Undo";
    this._bottomBar.appendChild(shortcutHint);

    // Info panel
    this._infoPanel = document.createElement("div");
    this._infoPanel.style.cssText = `
      position: absolute; right: 8px; top: 44px; width: 230px;
      background: rgba(26,18,8,0.9); border: 1px solid #5a4020; border-radius: 4px;
      padding: 8px; font-size: 12px; pointer-events: all; display: none;
    `;
    this._root!.appendChild(this._infoPanel);

    // Advisor panel (left side)
    this._advisorPanel = document.createElement("div");
    this._advisorPanel.style.cssText = `
      position: absolute; left: 8px; top: 44px; width: 260px;
      pointer-events: none; display: flex; flex-direction: column; gap: 4px;
    `;
    this._root!.appendChild(this._advisorPanel);

    // Tooltip (follows mouse — rich HTML version)
    this._tooltip = document.createElement("div");
    this._tooltip.style.cssText = `
      position: fixed; z-index: 350;
      background: rgba(20,14,8,0.95); padding: 10px 14px; border-radius: 6px;
      font-size: 12px; pointer-events: none; display: none; color: #f0e6d2;
      border: 1px solid #8b6914; box-shadow: 0 4px 16px rgba(0,0,0,0.6);
      max-width: 320px; line-height: 1.5;
    `;
    this._root!.appendChild(this._tooltip);

    // Notification toast
    this._notification = document.createElement("div");
    this._notification.style.cssText = `
      position: absolute; top: 64px; left: 50%; transform: translateX(-50%);
      background: rgba(139,105,20,0.9); padding: 6px 16px; border-radius: 4px;
      font-size: 14px; pointer-events: none; display: none;
    `;
    this._root!.appendChild(this._notification);

    // Game over
    this._gameOverOverlay = document.createElement("div");
    this._gameOverOverlay.style.cssText = `
      position: fixed; inset: 0; display: none; align-items: center; justify-content: center;
      background: rgba(0,0,0,0.8); pointer-events: all; z-index: 200;
    `;
    this._root!.appendChild(this._gameOverOverlay);

    // Keyboard shortcuts
    window.addEventListener("keydown", (e) => {
      if (e.key === "1") this.onSelectTool?.("select");
      if (e.key === "2") this.onSelectTool?.("build");
      if (e.key === "3") this.onSelectTool?.("road");
      if (e.key === "4") this.onSelectTool?.("demolish");
      if (e.key === "Delete" || e.key === "Backspace") this.onSelectTool?.("demolish");
      if (e.key === "Escape") {
        if (this._wikiOverlay) { this._hideWikiOverlay(); }
        else if (this._helpOverlay) { this._hideHelpOverlay(); }
        else if (this._statsOverlay) { this._hideStatsOverlay(); }
        else if (this._escapeMenu) { this._hideEscapeMenu(); }
        else { this._showEscapeMenu(); }
      }
      if (e.key === "?" || e.key === "/") { this._showHelpOverlay(); }
      if (e.key === "F5") { e.preventDefault(); this.onSave?.(); }
      if (e.key === "F9") { e.preventDefault(); this.onLoad?.(); }
      if (e.key === "0") this.onSpeedChange?.(0); // pause
      if (e.key === "-") this.onSpeedChange?.(1); // normal speed
      if (e.key === "=") this.onSpeedChange?.(2); // fast
      if (e.key === "+") this.onSpeedChange?.(3); // fastest
      if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); this.onUndo?.(); }
      if (e.key === "Tab") { e.preventDefault(); this._toggleStatsOverlay(); }
    });
  }

  private _forceBuildMenuUpdate = false;
  private _lastBuildCat: CaesarBuildingCategory | null = null;

  clearInfoPanel(): void {
    if (this._infoPanel) this._infoPanel.style.display = "none";
  }

  showNotification(msg: string): void {
    if (!this._notification) return;
    this._notification.textContent = msg;
    this._notification.style.display = "block";
    if (this._notifyTimeout) clearTimeout(this._notifyTimeout);
    this._notifyTimeout = window.setTimeout(() => {
      if (this._notification) this._notification.style.display = "none";
    }, 2500);
  }

  private _showHelpOverlay(): void {
    if (this._helpOverlay) return; // already showing
    this._helpOverlay = document.createElement("div");
    this._helpOverlay.style.cssText = `
      position: fixed; inset: 0; display: flex; align-items: center; justify-content: center;
      background: rgba(0,0,0,0.8); pointer-events: all; z-index: 300;
    `;
    const box = document.createElement("div");
    box.style.cssText = `
      background: #2a1f14; border: 2px solid #8b6914; border-radius: 10px;
      padding: 28px 36px; max-width: 580px; max-height: 80vh; overflow-y: auto;
      box-shadow: 0 0 40px rgba(0,0,0,0.5);
    `;
    box.innerHTML = `
      <h2 style="margin:0 0 12px; color:#ffd700; font-family:serif; text-align:center; font-size:22px;">⚜ Medieval Caesar — How to Play ⚜</h2>
      <div style="font-size:12px; color:#cdb891; line-height:1.7;">
        <b style="color:#ffd700;">Building Your Town:</b><br>
        · Place <b>roads</b> first — all buildings must touch a road<br>
        · Build <b>farms → mills → bakeries</b> for food chains<br>
        · <b>Markets</b> distribute food to housing<br>
        · <b>Chapels/churches</b> provide religion services<br>
        · Housing evolves when services + resources are available<br><br>

        <b style="color:#ffd700;">Economy:</b><br>
        · <b>Granaries/warehouses</b> increase storage capacity<br>
        · <b>Guild halls</b> convert cloth/tools into gold<br>
        · Trade with <b>caravans</b> that visit periodically<br>
        · Pay the <b>King's tribute</b> each year to maintain favor<br><br>

        <b style="color:#ffd700;">Housing Evolution:</b><br>
        · Tent → Shack → Cottage → House → Villa → Mansion<br>
        · Each tier requires more services and resources<br>
        · Higher tiers = more population = more workers<br><br>

        <b style="color:#ffd700;">Controls:</b><br>
        · <b>WASD</b> / arrows: pan &nbsp;|&nbsp; <b>Scroll</b>: zoom &nbsp;|&nbsp; <b>Shift+drag</b>: pan<br>
        · <b>1</b>: Select &nbsp; <b>2</b>: Build &nbsp; <b>3</b>: Road &nbsp; <b>4</b>: Demolish<br>
        · <b>F5</b>: Save &nbsp;|&nbsp; <b>F9</b>: Load &nbsp;|&nbsp; <b>Esc</b>: Deselect/Close<br>
        · <b>0</b>: Pause &nbsp; <b>-</b>: Normal &nbsp; <b>=</b>: Fast &nbsp; <b>+</b>: Fastest<br>
        · <b>Ctrl+Z</b>: Undo last placement &nbsp;|&nbsp; <b>Tab</b>: Town statistics<br>
        · <b>Click+drag</b>: Place roads/housing continuously<br>
        · <b>?</b>: Show this help<br><br>

        <b style="color:#ffd700;">Tips:</b><br>
        · Keep unemployment low — idle workers reduce housing desirability<br>
        · Build wells and fountains to boost desirability<br>
        · Watch your gold — running out means you can't pay tribute!
      </div>
      <div style="text-align:center; margin-top:16px;">
        <button id="caesar-help-close" style="
          padding:8px 28px; font-size:14px; background:#8b6914; color:#fff;
          border:none; border-radius:4px; cursor:pointer;
        ">Close (Esc)</button>
      </div>
    `;
    this._helpOverlay.appendChild(box);

    // Close on backdrop click
    this._helpOverlay.addEventListener("click", (e) => {
      if (e.target === this._helpOverlay) this._hideHelpOverlay();
    });

    this._root!.appendChild(this._helpOverlay);

    box.querySelector("#caesar-help-close")!.addEventListener("click", () => this._hideHelpOverlay());
  }

  private _hideHelpOverlay(): void {
    if (this._helpOverlay && this._helpOverlay.parentNode) {
      this._helpOverlay.parentNode.removeChild(this._helpOverlay);
    }
    this._helpOverlay = null;
  }

  private _toggleStatsOverlay(): void {
    if (this._statsOverlay) { this._hideStatsOverlay(); return; }
    this._statsOverlay = document.createElement("div");
    this._statsOverlay.style.cssText = `
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: #2a1f14; border: 2px solid #8b6914; border-radius: 10px;
      padding: 24px 32px; z-index: 250; pointer-events: all; min-width: 350px;
      color: #f0e6d2; font-family: serif;
    `;
    this._statsOverlay.innerHTML = `
      <h2 style="margin:0 0 12px; color:#ffd700; text-align:center;">Town Statistics</h2>
      <div id="caesar-stats-body" style="font-size:13px; line-height:1.8;"></div>
      <div style="text-align:center; margin-top:12px;">
        <button id="caesar-stats-close" style="padding:6px 20px; background:#8b6914; color:#fff; border:none; border-radius:4px; cursor:pointer;">Close (Tab)</button>
      </div>
    `;
    this._statsOverlay.querySelector("#caesar-stats-close")!.addEventListener("click", () => this._hideStatsOverlay());
    this._root!.appendChild(this._statsOverlay);
  }

  private _hideStatsOverlay(): void {
    if (this._statsOverlay?.parentNode) this._statsOverlay.parentNode.removeChild(this._statsOverlay);
    this._statsOverlay = null;
  }

  showHelpPanel(): void { this._showHelpOverlay(); }
  hideHelpPanel(): void { this._hideHelpOverlay(); }

  update(state: CaesarState): void {
    this._updateTopBar(state);
    this._updateToolHighlight(state);
    this._updateBuildMenu(state);
    this._updateInfoPanel(state);
    this._updateAdvisorPanel(state);
    this._updateCaravanPanel(state);
    this._updateTooltip(state);
    this._updateEventBanner(state);
    this._updateGameOver(state);
    this._updateStatsOverlay(state);
  }

  private _updateTopBar(state: CaesarState): void {
    if (!this._topBar) return;

    const resTypes = [
      CaesarResourceType.GOLD,
      CaesarResourceType.FOOD,
      CaesarResourceType.WOOD,
      CaesarResourceType.STONE,
      CaesarResourceType.IRON,
      CaesarResourceType.CLOTH,
      CaesarResourceType.TOOLS,
    ];

    let resContainer = this._topBar.querySelector("#caesar-res") as HTMLDivElement;
    if (!resContainer) {
      resContainer = document.createElement("div");
      resContainer.id = "caesar-res";
      resContainer.style.cssText = `display:flex; gap:12px;`;
      this._topBar.insertBefore(resContainer, this._ratingPanel);
    }

    let resHTML = "";
    for (const rt of resTypes) {
      const meta = RESOURCE_META[rt];
      const amount = Math.floor(state.resources.get(rt) ?? 0);
      const cap = state.resourceCaps.get(rt) ?? 999;
      const atCap = rt !== CaesarResourceType.GOLD && amount >= cap;
      const capStr = rt !== CaesarResourceType.GOLD ? `/${cap}` : "";
      let tooltip = "";
      if (rt === CaesarResourceType.GOLD) {
        tooltip = ` title="Income: ${state.monthlyIncome}/month&#10;Expenses: ${state.monthlyExpense}/month&#10;Net: ${state.monthlyIncome - state.monthlyExpense}/month"`;
      }
      resHTML += `<span${tooltip} style="color:${atCap ? "#f44336" : meta.color}">${meta.label}: ${amount}${capStr}</span>`;
    }

    // Population with color
    const popColor = state.population >= state.goals.population ? "#4caf50" : "#f0e6d2";
    const employed = state.population - state.unemployed;
    const idleColor = state.unemployed > state.population * 0.3 ? "#f44336" : "#aa9977";
    resHTML += `<span style="color:${popColor}">Pop: ${state.population}/${state.maxPopulation}</span>`;
    resHTML += `<span style="color:${idleColor}">(${employed} working, ${state.unemployed} idle)</span>`;

    // Income/expense
    const net = state.monthlyIncome - state.monthlyExpense;
    const netColor = net >= 0 ? "#4caf50" : "#f44336";
    resHTML += `<span style="color:${netColor}">${net >= 0 ? "+" : ""}${net}g/tax</span>`;

    // Morale
    const moraleColor = state.morale > 60 ? "#4caf50" : state.morale > 35 ? "#ff9800" : "#f44336";
    resHTML += `<span style="color:${moraleColor}">Morale: ${Math.floor(state.morale)}</span>`;

    // Game date
    resHTML += `<span style="color:#8a7a60">${getGameDateString(state)}</span>`;

    resContainer.innerHTML = resHTML;

    // Ratings
    if (this._ratingPanel) {
      const r = state.ratings;
      const g = state.goals;
      const ratingColor = (current: number, goal: number) => {
        if (current >= goal) return "#44ff44"; // goal met
        if (current >= goal * 0.7) return "#ffcc44"; // close
        return "#ff6644"; // far
      };
      this._ratingPanel.innerHTML = `
        <span style="color:${ratingColor(r.prosperity, g.prosperity)}">Pros: ${Math.floor(r.prosperity)}/${g.prosperity}</span>
        <span style="color:${ratingColor(r.culture, g.culture)}">Cult: ${Math.floor(r.culture)}/${g.culture}</span>
        <span style="color:${ratingColor(r.peace, g.peace)}">Peace: ${Math.floor(r.peace)}/${g.peace}</span>
        <span style="color:${ratingColor(r.favor, g.favor)}">Favor: ${Math.floor(r.favor)}/${g.favor}</span>
        <span style="color:#aaa">Tribute: ${Math.floor(state.tributeTimer)}s</span>
      `;
    }
  }

  private _updateToolHighlight(state: CaesarState): void {
    for (const [tool, btn] of this._toolButtons) {
      const active = state.selectedTool === tool;
      btn.style.background = active ? "#8b6914" : "#3a2a15";
      btn.style.borderColor = active ? "#ffd700" : "#5a4020";
    }
  }

  private _updateBuildMenu(state: CaesarState): void {
    if (!this._bottomBar) return;
    const catRow = this._bottomBar.querySelector("#caesar-cat-row") as HTMLDivElement;
    const buildRow = this._bottomBar.querySelector("#caesar-build-row") as HTMLDivElement;
    if (!catRow || !buildRow) return;

    if (state.selectedTool !== "build") {
      catRow.style.display = "none";
      buildRow.style.display = "none";
      this._lastBuildCat = null;
      return;
    }
    catRow.style.display = "flex";
    buildRow.style.display = "flex";

    // Highlight active category tab
    for (const btn of catRow.children) {
      const el = btn as HTMLButtonElement;
      const active = el.dataset.cat === this._selectedCategory;
      el.style.background = active ? "#5a4020" : "#2a1f14";
      el.style.color = active ? "#ffd700" : "#aa9977";
      el.style.borderColor = active ? "#8b6914" : "#3a2a15";
      el.style.borderBottom = active ? "3px solid #ffd700" : "1px solid #3a2a15";
    }

    // Only rebuild buttons when category changes
    if (this._lastBuildCat === this._selectedCategory && !this._forceBuildMenuUpdate) return;
    this._lastBuildCat = this._selectedCategory;
    this._forceBuildMenuUpdate = false;

    buildRow.innerHTML = "";

    for (const type of Object.values(CaesarBuildingType)) {
      if (type === CaesarBuildingType.ROAD) continue;
      const bdef = CAESAR_BUILDING_DEFS[type as CaesarBuildingType];
      if (bdef.category !== this._selectedCategory) continue;
      this._addBuildButton(buildRow, type as CaesarBuildingType, state);
    }
  }

  private _addBuildButton(container: HTMLDivElement, type: CaesarBuildingType, state: CaesarState): void {
    const bdef = CAESAR_BUILDING_DEFS[type];
    const gold = state.resources.get(CaesarResourceType.GOLD) ?? 0;
    const wood = state.resources.get(CaesarResourceType.WOOD) ?? 0;
    const stone = state.resources.get(CaesarResourceType.STONE) ?? 0;
    const canAfford = gold >= bdef.cost && wood >= bdef.woodCost && stone >= bdef.stoneCost;
    const maint = getMaintenanceCost(type);

    // Cost label: show materials if needed
    let costStr = `${bdef.cost}g`;
    if (bdef.woodCost > 0) costStr += ` ${bdef.woodCost}w`;
    if (bdef.stoneCost > 0) costStr += ` ${bdef.stoneCost}s`;

    // Terrain requirement label
    let terrainStr = "";
    if (bdef.requiresTerrain) {
      const terrainNames: Record<string, string> = { forest: "Forest", hill: "Hill", stone_deposit: "Stone deposit", iron_deposit: "Iron deposit", meadow: "Grass/Meadow" };
      terrainStr = terrainNames[bdef.requiresTerrain] || bdef.requiresTerrain;
    }

    const btn = document.createElement("button");
    btn.textContent = `${bdef.label} (${costStr})`;
    if (terrainStr) {
      const terrainTag = document.createElement("span");
      terrainTag.textContent = `Requires ${terrainStr.toLowerCase()} terrain`;
      terrainTag.style.cssText = `display:block; font-size:9px; color:#ff8844; margin-top:1px;`;
      btn.appendChild(terrainTag);
    }
    btn.style.cssText = `
      padding: 3px 8px; font-size: 11px; text-align: left;
      background: ${canAfford ? "#3a2a15" : "#2a1a0a"};
      color: ${canAfford ? "#f0e6d2" : "#665544"};
      border: 1px solid ${state.selectedBuildingType === type ? "#ffd700" : "#5a4020"};
      border-radius: 3px; cursor: ${canAfford ? "pointer" : "not-allowed"};
    `;
    btn.addEventListener("click", () => {
      if (canAfford) this.onSelectBuildingType?.(type);
    });
    btn.addEventListener("mouseenter", (e) => {
      if (this._tooltip) {
        this._tooltip.innerHTML = this._buildRichTooltip(bdef, maint, canAfford, gold, wood, stone);
        this._tooltip.style.display = "block";
        // Position above the cursor
        const tx = Math.min(e.clientX, window.innerWidth - 340);
        this._tooltip.style.left = tx + "px";
        this._tooltip.style.top = "auto";
        this._tooltip.style.bottom = (window.innerHeight - e.clientY + 12) + "px";
        this._tooltip.style.transform = "none";
      }
    });
    btn.addEventListener("mousemove", (e) => {
      if (this._tooltip && this._tooltip.style.display !== "none") {
        const tx = Math.min(e.clientX, window.innerWidth - 340);
        this._tooltip.style.left = tx + "px";
        this._tooltip.style.bottom = (window.innerHeight - e.clientY + 12) + "px";
      }
    });
    btn.addEventListener("mouseleave", () => {
      if (this._tooltip) this._tooltip.style.display = "none";
    });
    container.appendChild(btn);
  }

  private _buildRichTooltip(bdef: CaesarBuildingDef, maint: number, canAfford: boolean, gold: number, wood: number, stone: number): string {
    const sizeLabel = bdef.size === "large" ? `${bdef.footprint.w}x${bdef.footprint.h} (large)` : bdef.size === "medium" ? `${bdef.footprint.w}x${bdef.footprint.h} (medium)` : "1x1 (small)";
    const goldOk = gold >= bdef.cost;
    const woodOk = wood >= bdef.woodCost;
    const stoneOk = stone >= bdef.stoneCost;

    let html = `<div style="color:#ffd700; font-size:14px; font-weight:bold; margin-bottom:4px; border-bottom:1px solid #5a4020; padding-bottom:4px;">${bdef.label}</div>`;
    html += `<div style="color:#cdb891; margin-bottom:6px; font-style:italic;">${bdef.description}</div>`;

    // Cost section
    html += `<div style="margin-bottom:4px;">`;
    html += `<span style="color:#aa9977;">Cost:</span> `;
    html += `<span style="color:${goldOk ? "#ffd700" : "#ff4444"}">${bdef.cost}g</span>`;
    if (bdef.woodCost > 0) html += ` + <span style="color:${woodOk ? "#8bc34a" : "#ff4444"}">${bdef.woodCost} wood</span>`;
    if (bdef.stoneCost > 0) html += ` + <span style="color:${stoneOk ? "#90a4ae" : "#ff4444"}">${bdef.stoneCost} stone</span>`;
    if (!canAfford) html += ` <span style="color:#ff4444; font-size:10px;">(insufficient)</span>`;
    html += `</div>`;

    if (maint > 0) html += `<div><span style="color:#aa9977;">Maintenance:</span> <span style="color:#ff9800;">${maint}g/tax period</span></div>`;

    // Size and workers
    html += `<div><span style="color:#aa9977;">Size:</span> ${sizeLabel}`;
    if (bdef.maxWorkers > 0) html += ` &nbsp;|&nbsp; <span style="color:#aa9977;">Workers:</span> ${bdef.maxWorkers}`;
    html += `</div>`;

    // Build time
    if (bdef.buildTime > 0) html += `<div><span style="color:#aa9977;">Build time:</span> ${bdef.buildTime}s</div>`;

    // Production
    if (bdef.outputs.length > 0 || bdef.inputs.length > 0) {
      html += `<div style="margin-top:4px; padding-top:4px; border-top:1px solid #3a2a15;">`;
      if (bdef.inputs.length > 0) {
        html += `<div><span style="color:#ff8a65;">Consumes:</span> ${bdef.inputs.map(i => `<span style="color:#ffab91">${i.amount} ${RESOURCE_META[i.type].label}</span>`).join(", ")}</div>`;
      }
      if (bdef.outputs.length > 0) {
        html += `<div><span style="color:#66bb6a;">Produces:</span> ${bdef.outputs.map(o => `<span style="color:#a5d6a7">${o.amount} ${RESOURCE_META[o.type].label}</span>`).join(", ")}`;
        if (bdef.productionTime > 0) html += ` <span style="color:#777; font-size:10px;">every ${bdef.productionTime}s</span>`;
        html += `</div>`;
      }
      html += `</div>`;
    }

    // Services
    if (bdef.walkerService) {
      html += `<div><span style="color:#aa9977;">Service:</span> <span style="color:#64b5f6;">${bdef.walkerService}</span> (range: ${bdef.walkerRange} tiles)</div>`;
    }

    // Storage
    if (bdef.storageCapacity > 0) {
      html += `<div><span style="color:#aa9977;">Storage:</span> +${bdef.storageCapacity} capacity</div>`;
    }

    // Desirability
    if (bdef.desirability !== 0) {
      const dColor = bdef.desirability > 0 ? "#4caf50" : "#f44336";
      html += `<div><span style="color:#aa9977;">Desirability:</span> <span style="color:${dColor}">${bdef.desirability > 0 ? "+" : ""}${bdef.desirability}</span> (range: ${bdef.desirabilityRange} tiles)</div>`;
    }

    // Terrain requirement
    if (bdef.requiresTerrain) {
      const terrainNames: Record<string, string> = { forest: "Forest", hill: "Hill", stone_deposit: "Stone deposit", iron_deposit: "Iron deposit", meadow: "Grass/Meadow" };
      html += `<div style="color:#ff8844; margin-top:2px;">Requires ${terrainNames[bdef.requiresTerrain] || bdef.requiresTerrain} terrain</div>`;
    }

    // Military
    if (bdef.garrisonSlots > 0) {
      html += `<div><span style="color:#aa9977;">Garrison:</span> ${bdef.garrisonSlots} slots</div>`;
    }
    if (bdef.hp > 0) {
      html += `<div><span style="color:#aa9977;">HP:</span> ${bdef.hp}</div>`;
    }

    return html;
  }

  private _updateInfoPanel(state: CaesarState): void {
    if (!this._infoPanel) return;

    if (state.selectedBuildingId == null) {
      this._infoPanel.style.display = "none";
      return;
    }

    const b = state.buildings.get(state.selectedBuildingId);
    if (!b) {
      this._infoPanel.style.display = "none";
      return;
    }

    this._infoPanel.style.display = "block";
    const bdef = CAESAR_BUILDING_DEFS[b.type];

    const categoryIcons: Record<string, string> = {
      housing: "\u{1F3E0}", infrastructure: "\u{1F6E4}\uFE0F", food: "\u{1F33E}", industry: "\u2692\uFE0F",
      religion: "\u26EA", safety: "\u2694\uFE0F", entertainment: "\u{1F3AD}", commerce: "\u{1F4B0}",
    };
    const catIcon = categoryIcons[bdef.category] ?? "";

    let html = `<b style="color:#ffd700">${catIcon} ${bdef.label}</b>`;
    html += `<br><span style="color:#aa9977">${bdef.description}</span>`;

    if (!b.built) {
      html += `<br>Building: ${Math.floor(b.constructionProgress * 100)}%`;
    }

    if (b.type === CaesarBuildingType.HOUSING) {
      html += `<br>Tier: <b>${HOUSING_TIER_NAMES[b.housingTier]}</b>`;
      html += `<br>Residents: ${b.residents}/${CB.HOUSING_CAPACITY[b.housingTier]}`;
      const svcList = [...b.services];
      html += `<br>Services: ${svcList.length > 0 ? svcList.map(s => `<span style="color:#4caf50">${s}</span>`).join(", ") : '<span style="color:#666">none</span>'}`;
      const tile = state.map.tiles[b.tileY * state.map.width + b.tileX];
      if (tile) {
        const d = tile.desirability;
        const dColor = d > 0 ? "#4caf50" : d < 0 ? "#f44336" : "#aaa";
        html += `<br>Desirability: <span style="color:${dColor}">${d.toFixed(1)}</span>`;
      }
      const tax = b.residents * CB.HOUSING_TAX_PER_PERSON[b.housingTier];
      html += `<br>Tax income: ${tax.toFixed(0)}g/tax`;
    }

    if (bdef.maxWorkers > 0) {
      const eff = bdef.maxWorkers > 0 ? Math.floor((b.workers / bdef.maxWorkers) * 100) : 100;
      html += `<br>Workers: ${b.workers}/${bdef.maxWorkers} (${eff}% efficiency)`;
    }

    if (bdef.outputs.length > 0) {
      html += `<br>Produces: ${bdef.outputs.map((o) => RESOURCE_META[o.type].label).join(", ")}`;
    }
    if (bdef.inputs.length > 0) {
      html += `<br>Requires: ${bdef.inputs.map((i) => RESOURCE_META[i.type].label).join(", ")}`;
    }

    const maint = getMaintenanceCost(b.type);
    if (maint > 0) html += `<br>Maintenance: ${maint}g/tax`;

    // Road connectivity status
    if (b.type !== CaesarBuildingType.ROAD && b.type !== CaesarBuildingType.WALL &&
        b.type !== CaesarBuildingType.GATE && b.type !== CaesarBuildingType.HOUSING) {
      const connected = isBuildingRoadConnected(state, b);
      if (!connected) {
        html += `<br><span style="color:#f44336">Not connected to road network!</span>`;
      }
    }

    // Housing goods requirements
    if (b.type === CaesarBuildingType.HOUSING && b.housingTier >= 3) {
      const cloth = state.resources.get(CaesarResourceType.CLOTH) ?? 0;
      const tools = state.resources.get(CaesarResourceType.TOOLS) ?? 0;
      html += `<br>Needs: ${b.housingTier >= 3 ? `<span style="color:${cloth > 0 ? "#4caf50" : "#f44336"}">cloth</span>` : ""}`;
      if (b.housingTier >= 4) html += ` + <span style="color:${tools > 0 ? "#4caf50" : "#f44336"}">tools</span>`;
    }

    if (b.hp > 0 && b.maxHp > 0) {
      const hpColor = b.hp / b.maxHp > 0.5 ? "#4caf50" : "#f44336";
      html += `<br>HP: <span style="color:${hpColor}">${Math.ceil(b.hp)}</span>/${b.maxHp}`;
    }

    // Fire!
    if (b.onFire) {
      html += `<br><span style="color:#ff4444;font-weight:bold;font-size:14px">ON FIRE! (${Math.ceil(b.fireTimer)}s)</span>`;
      html += `<br><span style="color:#ff6644;font-size:11px">Click to extinguish (-20g)</span>`;
    }

    // Level and upgrade
    if (b.level > 1 || b.upgrading) {
      html += `<br>Level: ${b.level}/${CB.MAX_BUILDING_LEVEL}`;
    }
    if (b.upgrading) {
      html += ` <span style="color:#ff9800">(upgrading ${Math.floor(b.upgradeProgress * 100)}%)</span>`;
    }

    this._infoPanel.innerHTML = html;

    // Upgrade button (dynamic — append after innerHTML)
    const check = canUpgrade(state, b);
    if (check.ok || (b.level < CB.MAX_BUILDING_LEVEL && b.built && !b.upgrading && !b.onFire)) {
      const btn = document.createElement("button");
      btn.textContent = check.ok ? `Upgrade Lv${b.level + 1} (${check.cost}g)` : check.reason;
      btn.disabled = !check.ok;
      btn.style.cssText = `
        margin-top:4px; padding:3px 8px; font-size:11px; width:100%;
        background:${check.ok ? "#5a4020" : "#2a1a0a"};
        color:${check.ok ? "#ffd700" : "#665544"};
        border:1px solid ${check.ok ? "#8b6914" : "#3a2a15"};
        border-radius:3px; cursor:${check.ok ? "pointer" : "not-allowed"};
      `;
      if (check.ok) btn.addEventListener("click", () => this.onUpgrade?.(b.id));
      this._infoPanel.appendChild(btn);
    }

    // Worker priority buttons (for production/service buildings)
    const bdef2 = CAESAR_BUILDING_DEFS[b.type];
    if (b.built && bdef2.maxWorkers > 0) {
      const prioDiv = document.createElement("div");
      prioDiv.style.cssText = `margin-top:4px; display:flex; gap:3px; align-items:center; font-size:10px;`;
      prioDiv.innerHTML = `<span style="color:#aa9977">Workers:</span>`;
      for (const p of ["high", "normal", "low"] as const) {
        const pb = document.createElement("button");
        pb.textContent = p[0].toUpperCase() + p.slice(1);
        const isActive = b.workerPriority === p;
        pb.style.cssText = `
          padding:1px 5px; font-size:10px; border-radius:2px; cursor:pointer;
          background:${isActive ? "#8b6914" : "#2a1a0a"};
          color:${isActive ? "#fff" : "#887766"};
          border:1px solid ${isActive ? "#ffd700" : "#3a2a15"};
        `;
        pb.addEventListener("click", () => this.onSetPriority?.(b.id, p));
        prioDiv.appendChild(pb);
      }
      this._infoPanel.appendChild(prioDiv);
    }
  }

  private _updateCaravanPanel(state: CaesarState): void {
    // Show caravan popup when a merchant arrives
    let panel = this._root?.querySelector("#caesar-caravan") as HTMLDivElement | null;
    if (!state.activeCaravan) {
      if (panel) panel.style.display = "none";
      return;
    }

    if (!panel) {
      panel = document.createElement("div");
      panel.id = "caesar-caravan";
      panel.style.cssText = `
        position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background: rgba(26,18,8,0.95); border: 2px solid #ffd700; border-radius: 8px;
        padding: 12px 16px; min-width: 300px; pointer-events: all; z-index: 150;
        font-size: 12px;
      `;
      this._root!.appendChild(panel);
    }

    panel.style.display = "block";
    const c = state.activeCaravan;

    // Only rebuild DOM when caravan first appears (timer near max) or panel is empty
    // Update only the timer text each frame to avoid destroying click handlers
    const timerSpan = panel.querySelector("#caesar-caravan-timer") as HTMLElement | null;
    if (timerSpan) {
      timerSpan.textContent = `(${Math.ceil(c.timer)}s remaining)`;
      return;
    }

    let html = `<div style="color:#ffd700;font-size:14px;font-weight:bold;margin-bottom:6px;">
      Merchant Caravan <span id="caesar-caravan-timer" style="color:#aa9977;font-size:11px">(${Math.ceil(c.timer)}s remaining)</span>
    </div>`;

    if (c.selling.length > 0) {
      html += `<div style="color:#cdb891;margin-bottom:4px;font-size:11px">Buy from merchant:</div>`;
      c.selling.forEach((s, i) => {
        const meta = RESOURCE_META[s.type];
        const gold = state.resources.get(CaesarResourceType.GOLD) ?? 0;
        const canAfford = gold >= s.price;
        html += `<button data-caravan-buy="${i}" style="
          display:block; width:100%; margin-bottom:3px; padding:3px 8px; font-size:11px;
          background:${canAfford ? "#3a4a20" : "#2a1a0a"}; color:${canAfford ? "#f0e6d2" : "#665544"};
          border:1px solid ${canAfford ? "#6a8a30" : "#3a2a15"}; border-radius:3px;
          cursor:${canAfford ? "pointer" : "not-allowed"}; text-align:left;
        "><span style="color:${meta.color}">${s.amount} ${meta.label}</span> for <span style="color:#ffd700">${s.price}g</span></button>`;
      });
    }

    if (c.buying.length > 0) {
      html += `<div style="color:#cdb891;margin:6px 0 4px;font-size:11px">Sell to merchant:</div>`;
      c.buying.forEach((b, i) => {
        const meta = RESOURCE_META[b.type];
        const have = state.resources.get(b.type) ?? 0;
        const canSell = have >= b.amount;
        html += `<button data-caravan-sell="${i}" style="
          display:block; width:100%; margin-bottom:3px; padding:3px 8px; font-size:11px;
          background:${canSell ? "#4a3020" : "#2a1a0a"}; color:${canSell ? "#f0e6d2" : "#665544"};
          border:1px solid ${canSell ? "#8b6914" : "#3a2a15"}; border-radius:3px;
          cursor:${canSell ? "pointer" : "not-allowed"}; text-align:left;
        "><span style="color:${meta.color}">${b.amount} ${meta.label}</span> (have ${Math.floor(have)}) → <span style="color:#ffd700">${b.price}g</span></button>`;
      });
    }

    html += `<button id="caesar-caravan-dismiss" style="
      margin-top:6px; padding:3px 12px; font-size:11px; background:#444; color:#ccc;
      border:1px solid #666; border-radius:3px; cursor:pointer;
    ">Dismiss Caravan</button>`;

    panel.innerHTML = html;

    // Wire buttons
    panel.querySelectorAll("[data-caravan-buy]").forEach((el) => {
      el.addEventListener("click", () => {
        const idx = parseInt((el as HTMLElement).dataset.caravanBuy!);
        this.onCaravanBuy?.(idx);
      });
    });
    panel.querySelectorAll("[data-caravan-sell]").forEach((el) => {
      el.addEventListener("click", () => {
        const idx = parseInt((el as HTMLElement).dataset.caravanSell!);
        this.onCaravanSell?.(idx);
      });
    });
    panel.querySelector("#caesar-caravan-dismiss")?.addEventListener("click", () => {
      state.activeCaravan = null;
    });
  }

  private _updateAdvisorPanel(state: CaesarState): void {
    if (!this._advisorPanel) return;
    this._advisorPanel.innerHTML = "";

    for (const msg of state.advisorMessages) {
      const div = document.createElement("div");
      const bgColor = msg.severity === "critical" ? "rgba(180,30,30,0.85)"
        : msg.severity === "warning" ? "rgba(180,120,20,0.85)"
        : "rgba(26,18,8,0.85)";
      const borderColor = msg.severity === "critical" ? "#f44336"
        : msg.severity === "warning" ? "#ff9800"
        : "#5a4020";
      div.style.cssText = `
        background: ${bgColor}; border: 1px solid ${borderColor}; border-radius: 4px;
        padding: 4px 8px; font-size: 11px; color: #f0e6d2; line-height: 1.3;
      `;
      const icon = msg.severity === "critical" ? "!!" : msg.severity === "warning" ? "!" : "i";
      div.textContent = `[${icon}] ${msg.text}`;
      this._advisorPanel.appendChild(div);
    }

    // Building count summary
    const buildingCount = state.buildings.size;
    const housingCount = Array.from(state.buildings.values()).filter(b => b.type === CaesarBuildingType.HOUSING).length;
    const summaryDiv = document.createElement("div");
    summaryDiv.style.cssText = `
      background: rgba(26,18,8,0.85); border: 1px solid #3a2a15; border-radius: 4px;
      padding: 4px 8px; font-size: 11px; color: #aa9977; line-height: 1.3;
    `;
    summaryDiv.textContent = `Buildings: ${buildingCount} (${housingCount} housing) | Pop: ${state.population}/${state.maxPopulation}`;
    this._advisorPanel.appendChild(summaryDiv);
  }

  private _updateTooltip(state: CaesarState): void {
    if (!this._tooltip) return;
    // Only show placement error tooltip when not already showing a building hover tooltip
    if (state.tooltipText && (state.selectedTool === "build" || state.selectedTool === "road")) {
      // Don't overwrite building button hover tooltips
      if (this._tooltip.style.display === "block" && this._tooltip.children.length > 0) return;
      this._tooltip.innerHTML = `<span style="color:#ff6b6b;">${state.tooltipText}</span>`;
      this._tooltip.style.display = "block";
      this._tooltip.style.left = "50%";
      this._tooltip.style.top = "auto";
      this._tooltip.style.bottom = "100px";
      this._tooltip.style.transform = "translateX(-50%)";
    }
  }

  private _updateEventBanner(state: CaesarState): void {
    if (!this._eventBanner) return;
    if (state.activeEvent) {
      // Color based on event type
      let eventColor = "#f0e6d2"; // default
      let borderColor = "#ffd700";
      switch (state.activeEvent.type) {
        case "plague": eventColor = "#ff4444"; borderColor = "#cc2222"; break;
        case "drought": eventColor = "#cc8844"; borderColor = "#aa6622"; break;
        case "bountiful_harvest": case "royal_festival": eventColor = "#44cc44"; borderColor = "#22aa22"; break;
        case "bandit_ambush": eventColor = "#ff6644"; borderColor = "#cc4422"; break;
        case "merchant_caravan": eventColor = "#44aaff"; borderColor = "#2288dd"; break;
      }
      this._eventBanner.textContent = `${state.activeEvent.message} (${Math.ceil(state.activeEvent.timer)}s)`;
      this._eventBanner.style.display = "block";
      this._eventBanner.style.color = eventColor;
      this._eventBanner.style.borderColor = borderColor;
    } else {
      this._eventBanner.style.display = "none";
    }
  }

  private _updateGameOver(state: CaesarState): void {
    if (!this._gameOverOverlay) return;

    if (!state.gameOver) {
      this._gameOverOverlay.style.display = "none";
      this._gameOverOverlay.dataset.built = "";
      return;
    }

    this._gameOverOverlay.style.display = "flex";
    // Only rebuild if content changed (avoid resetting innerHTML every frame)
    if (this._gameOverOverlay.dataset.built === "1") return;
    this._gameOverOverlay.dataset.built = "1";
    const date = getGameDateString(state);
    this._gameOverOverlay.innerHTML = `
      <div style="background:#2a1f14; border:2px solid ${state.victory ? '#4caf50' : '#f44336'};
        border-radius:8px; padding:32px; text-align:center; max-width:400px;">
        <h1 style="color:${state.victory ? '#4caf50' : '#f44336'}; font-family:serif; margin:0 0 12px;">
          ${state.victory ? "VICTORY!" : "DEFEAT"}
        </h1>
        <p style="color:#cdb891; margin:0 0 8px;">
          ${state.victory
            ? "You have built a thriving medieval town worthy of the King's praise!"
            : "The King is displeased with your governance."}
        </p>
        <p style="color:#aaa; font-size:13px; margin:0 0 4px;">
          ${date} | Population: ${state.population}<br>
          Prosperity: ${Math.floor(state.ratings.prosperity)} | Culture: ${Math.floor(state.ratings.culture)}<br>
          Peace: ${Math.floor(state.ratings.peace)} | Favor: ${Math.floor(state.ratings.favor)}<br>
          Raids defeated: ${state.raidsDefeated} | Tributes paid: ${state.tributesPaid}
        </p>
      </div>
    `;
    const btn = document.createElement("button");
    btn.textContent = "Return to Menu";
    btn.style.cssText = "padding:10px 28px; font-size:16px; background:#8b6914; color:#fff; border:none; border-radius:4px; cursor:pointer; margin-top:16px;";
    btn.addEventListener("click", () => window.dispatchEvent(new Event("caesarExit")));
    this._gameOverOverlay.querySelector("div")!.appendChild(btn);
  }

  private _updateStatsOverlay(state: CaesarState): void {
    if (!this._statsOverlay) return;
    const body = this._statsOverlay.querySelector("#caesar-stats-body");
    if (!body) return;
    const gold = state.resources.get(CaesarResourceType.GOLD) ?? 0;
    const food = state.resources.get(CaesarResourceType.FOOD) ?? 0;
    const buildingCount = state.buildings.size;
    const housingCount = Array.from(state.buildings.values()).filter(b => b.type === CaesarBuildingType.HOUSING).length;
    body.innerHTML = `
      Population: ${state.population} / ${state.maxPopulation}<br>
      Employed: ${state.population - state.unemployed} &middot; Idle: ${state.unemployed}<br>
      Buildings: ${buildingCount} (${housingCount} housing)<br>
      Gold: ${Math.floor(gold)}<br>
      Food: ${Math.floor(food)}<br>
      Morale: ${Math.floor(state.morale)}%<br>
      Tributes Paid: ${state.tributesPaid} &middot; Missed: ${state.tributesMissed}<br>
      Trade Profit: ${Math.floor(state.tradeProfit)}<br>
      Raids Defeated: ${state.raidsDefeated}<br>
    `;
  }

  // ---- Escape Menu ----

  private _showEscapeMenu(): void {
    if (this._escapeMenu) return;
    this._escapeMenu = document.createElement("div");
    this._escapeMenu.style.cssText = `
      position: fixed; inset: 0; display: flex; align-items: center; justify-content: center;
      background: rgba(0,0,0,0.75); pointer-events: all; z-index: 300;
    `;
    const box = document.createElement("div");
    box.style.cssText = `
      background: #2a1f14; border: 2px solid #8b6914; border-radius: 10px;
      padding: 28px 36px; min-width: 300px; text-align: center;
      box-shadow: 0 0 40px rgba(0,0,0,0.6);
    `;
    box.innerHTML = `
      <h2 style="margin:0 0 20px; color:#ffd700; font-family:serif; font-size:22px;">Menu</h2>
    `;

    const buttons: { label: string; action: () => void; color?: string }[] = [
      { label: "Resume", action: () => this._hideEscapeMenu(), color: "#5a8a20" },
      { label: "Save Game (F5)", action: () => { this.onSave?.(); this._hideEscapeMenu(); }, color: "#2a6a4a" },
      { label: "Load Game (F9)", action: () => { this.onLoad?.(); this._hideEscapeMenu(); }, color: "#2a5a6a" },
      { label: "Controls", action: () => { this._hideEscapeMenu(); this._showHelpOverlay(); } },
      { label: "Game Wiki", action: () => { this._showWikiOverlay(); } },
      { label: "Tutorial", action: () => { this._hideEscapeMenu(); this._showTutorialOverlay(); } },
      { label: "Game Concepts", action: () => { this._hideEscapeMenu(); this._showConceptsOverlay(); } },
      { label: "Exit to Menu", action: () => { this._hideEscapeMenu(); this.onExit?.(); }, color: "#6a2a2a" },
    ];

    for (const b of buttons) {
      const btn = document.createElement("button");
      btn.textContent = b.label;
      btn.style.cssText = `
        display: block; width: 100%; margin-bottom: 8px; padding: 10px 20px;
        font-size: 14px; background: ${b.color || "#3a2a15"}; color: #f0e6d2;
        border: 1px solid #5a4020; border-radius: 5px; cursor: pointer;
        transition: background 0.15s;
      `;
      btn.addEventListener("mouseenter", () => { btn.style.background = "#8b6914"; });
      btn.addEventListener("mouseleave", () => { btn.style.background = b.color || "#3a2a15"; });
      btn.addEventListener("click", b.action);
      box.appendChild(btn);
    }

    const escHint = document.createElement("div");
    escHint.style.cssText = "color:#8a7a60; font-size:11px; margin-top:8px;";
    escHint.textContent = "Press Escape to close";
    box.appendChild(escHint);

    this._escapeMenu.appendChild(box);
    this._escapeMenu.addEventListener("click", (e) => {
      if (e.target === this._escapeMenu) this._hideEscapeMenu();
    });
    this._root!.appendChild(this._escapeMenu);
  }

  private _hideEscapeMenu(): void {
    if (this._escapeMenu?.parentNode) this._escapeMenu.parentNode.removeChild(this._escapeMenu);
    this._escapeMenu = null;
  }

  // ---- Wiki Overlay ----

  private _showWikiOverlay(): void {
    if (this._wikiOverlay) return;
    this._wikiOverlay = document.createElement("div");
    this._wikiOverlay.style.cssText = `
      position: fixed; inset: 0; display: flex; align-items: center; justify-content: center;
      background: rgba(0,0,0,0.85); pointer-events: all; z-index: 350;
    `;
    const box = document.createElement("div");
    box.style.cssText = `
      background: #2a1f14; border: 2px solid #8b6914; border-radius: 10px;
      padding: 24px 28px; max-width: 700px; width: 90vw; max-height: 80vh; overflow-y: auto;
      box-shadow: 0 0 40px rgba(0,0,0,0.6);
    `;

    // Build wiki content from building defs
    let buildingsByCategory: Record<string, string[]> = {};
    for (const type of Object.values(CaesarBuildingType)) {
      const bdef = CAESAR_BUILDING_DEFS[type as CaesarBuildingType];
      if (!buildingsByCategory[bdef.category]) buildingsByCategory[bdef.category] = [];
      const maint = getMaintenanceCost(type as CaesarBuildingType);
      let entry = `<div style="margin-bottom:8px; padding:6px 10px; background:#1a1208; border-radius:4px; border:1px solid #3a2a15;">`;
      entry += `<b style="color:#ffd700;">${bdef.label}</b>`;
      entry += ` <span style="color:#8a7a60; font-size:10px;">${bdef.footprint.w}x${bdef.footprint.h} | ${bdef.cost}g`;
      if (bdef.woodCost > 0) entry += ` ${bdef.woodCost}w`;
      if (bdef.stoneCost > 0) entry += ` ${bdef.stoneCost}s`;
      entry += `</span>`;
      entry += `<br><span style="color:#cdb891;">${bdef.description}</span>`;
      if (bdef.outputs.length > 0) entry += `<br><span style="color:#66bb6a;">Produces:</span> ${bdef.outputs.map(o => `${o.amount} ${RESOURCE_META[o.type].label}`).join(", ")}`;
      if (bdef.inputs.length > 0) entry += `<br><span style="color:#ff8a65;">Requires:</span> ${bdef.inputs.map(i => `${i.amount} ${RESOURCE_META[i.type].label}`).join(", ")}`;
      if (bdef.walkerService) entry += `<br><span style="color:#64b5f6;">Service:</span> ${bdef.walkerService} (${bdef.walkerRange} tiles)`;
      if (bdef.storageCapacity > 0) entry += `<br><span style="color:#aa9977;">Storage:</span> +${bdef.storageCapacity}`;
      if (maint > 0) entry += `<br><span style="color:#ff9800;">Maintenance:</span> ${maint}g/tax`;
      if (bdef.requiresTerrain) entry += `<br><span style="color:#ff8844;">Requires: ${bdef.requiresTerrain} terrain</span>`;
      if (bdef.maxWorkers > 0) entry += ` &nbsp;|&nbsp; <span style="color:#aaa;">Workers: ${bdef.maxWorkers}</span>`;
      entry += `</div>`;
      buildingsByCategory[bdef.category].push(entry);
    }

    const categoryLabels: Record<string, string> = {
      housing: "Housing", infrastructure: "Infrastructure", food: "Food Production & Distribution",
      industry: "Industry", religion: "Religion", safety: "Military & Safety",
      entertainment: "Entertainment", commerce: "Commerce & Trade",
    };

    let wikiHTML = `<h2 style="margin:0 0 16px; color:#ffd700; font-family:serif; text-align:center; font-size:20px;">Building Wiki</h2>`;
    for (const [cat, entries] of Object.entries(buildingsByCategory)) {
      wikiHTML += `<h3 style="color:#cdb891; margin:12px 0 6px; border-bottom:1px solid #3a2a15; padding-bottom:4px;">${categoryLabels[cat] || cat}</h3>`;
      wikiHTML += entries.join("");
    }

    wikiHTML += `<div style="text-align:center; margin-top:16px;">
      <button id="caesar-wiki-close" style="padding:8px 28px; font-size:14px; background:#8b6914; color:#fff; border:none; border-radius:4px; cursor:pointer;">Close (Esc)</button>
    </div>`;

    box.innerHTML = wikiHTML;
    this._wikiOverlay.appendChild(box);
    this._wikiOverlay.addEventListener("click", (e) => {
      if (e.target === this._wikiOverlay) this._hideWikiOverlay();
    });
    this._root!.appendChild(this._wikiOverlay);
    box.querySelector("#caesar-wiki-close")!.addEventListener("click", () => this._hideWikiOverlay());
  }

  private _hideWikiOverlay(): void {
    if (this._wikiOverlay?.parentNode) this._wikiOverlay.parentNode.removeChild(this._wikiOverlay);
    this._wikiOverlay = null;
  }

  // ---- Tutorial Overlay ----

  private _showTutorialOverlay(): void {
    if (this._helpOverlay) return;
    this._helpOverlay = document.createElement("div");
    this._helpOverlay.style.cssText = `
      position: fixed; inset: 0; display: flex; align-items: center; justify-content: center;
      background: rgba(0,0,0,0.85); pointer-events: all; z-index: 300;
    `;
    const box = document.createElement("div");
    box.style.cssText = `
      background: #2a1f14; border: 2px solid #8b6914; border-radius: 10px;
      padding: 24px 32px; max-width: 600px; max-height: 80vh; overflow-y: auto;
      box-shadow: 0 0 40px rgba(0,0,0,0.5);
    `;
    box.innerHTML = `
      <h2 style="margin:0 0 16px; color:#ffd700; font-family:serif; text-align:center;">Step-by-Step Tutorial</h2>
      <div style="font-size:12px; color:#cdb891; line-height:1.8;">
        <div style="background:#1a1208; padding:8px 12px; border-radius:6px; margin-bottom:8px; border-left:3px solid #ffd700;">
          <b style="color:#ffd700;">Step 1: Roads First</b><br>
          Press <b style="color:#fff;">3</b> or click "Road" to enter road mode. Click and drag to lay roads.
          All buildings must be placed adjacent to a road.
        </div>
        <div style="background:#1a1208; padding:8px 12px; border-radius:6px; margin-bottom:8px; border-left:3px solid #8bc34a;">
          <b style="color:#8bc34a;">Step 2: Housing</b><br>
          Press <b style="color:#fff;">2</b> for Build mode, select Housing. Place housing plots next to roads.
          Residents will move in automatically. More services = higher tier housing.
        </div>
        <div style="background:#1a1208; padding:8px 12px; border-radius:6px; margin-bottom:8px; border-left:3px solid #ff9800;">
          <b style="color:#ff9800;">Step 3: Food Chain</b><br>
          Build Farms on grass/meadow tiles, then Mills to grind wheat into flour,
          then Bakeries to bake food. Build a Market to distribute food to housing.
        </div>
        <div style="background:#1a1208; padding:8px 12px; border-radius:6px; margin-bottom:8px; border-left:3px solid #64b5f6;">
          <b style="color:#64b5f6;">Step 4: Services</b><br>
          Build Wells for water, Chapels for religion, Taverns for entertainment.
          Housing needs these services to evolve to higher tiers.
        </div>
        <div style="background:#1a1208; padding:8px 12px; border-radius:6px; margin-bottom:8px; border-left:3px solid #ce93d8;">
          <b style="color:#ce93d8;">Step 5: Industry</b><br>
          Lumber Camps (on forest), Quarries (on stone), Iron Mines (on iron deposits).
          Weavers make cloth, Blacksmiths make tools — both needed for high-tier housing.
        </div>
        <div style="background:#1a1208; padding:8px 12px; border-radius:6px; margin-bottom:8px; border-left:3px solid #ef5350;">
          <b style="color:#ef5350;">Step 6: Safety</b><br>
          Build Watchposts to prevent fires and provide safety. Barracks train soldiers
          to defend against raids. Walls and towers fortify your town.
        </div>
        <div style="background:#1a1208; padding:8px 12px; border-radius:6px; margin-bottom:8px; border-left:3px solid #ffd700;">
          <b style="color:#ffd700;">Step 7: Win!</b><br>
          Meet all scenario goals (population, prosperity, culture, peace, favor)
          to achieve victory. Pay tribute to the King each year to maintain Favor.
        </div>
      </div>
      <div style="text-align:center; margin-top:12px;">
        <button id="caesar-tut-close" style="padding:8px 28px; font-size:14px; background:#8b6914; color:#fff; border:none; border-radius:4px; cursor:pointer;">Close (Esc)</button>
      </div>
    `;
    this._helpOverlay.appendChild(box);
    this._helpOverlay.addEventListener("click", (e) => {
      if (e.target === this._helpOverlay) this._hideHelpOverlay();
    });
    this._root!.appendChild(this._helpOverlay);
    box.querySelector("#caesar-tut-close")!.addEventListener("click", () => this._hideHelpOverlay());
  }

  // ---- Concepts Overlay ----

  private _showConceptsOverlay(): void {
    if (this._helpOverlay) return;
    this._helpOverlay = document.createElement("div");
    this._helpOverlay.style.cssText = `
      position: fixed; inset: 0; display: flex; align-items: center; justify-content: center;
      background: rgba(0,0,0,0.85); pointer-events: all; z-index: 300;
    `;
    const box = document.createElement("div");
    box.style.cssText = `
      background: #2a1f14; border: 2px solid #8b6914; border-radius: 10px;
      padding: 24px 32px; max-width: 620px; max-height: 80vh; overflow-y: auto;
      box-shadow: 0 0 40px rgba(0,0,0,0.5);
    `;
    box.innerHTML = `
      <h2 style="margin:0 0 16px; color:#ffd700; font-family:serif; text-align:center;">Game Concepts</h2>
      <div style="font-size:12px; color:#cdb891; line-height:1.7;">

        <h3 style="color:#ffd700; margin:12px 0 4px;">Ratings</h3>
        <b style="color:#4caf50;">Prosperity</b> — Reflects your town's economic health. Grows with population, trade, and gold reserves. Declines with unemployment and poverty.<br>
        <b style="color:#64b5f6;">Culture</b> — Measures cultural development. Build churches, cathedrals, taverns, and festival grounds. Higher housing tiers also boost culture.<br>
        <b style="color:#ff9800;">Peace</b> — Military security rating. Build watchposts, barracks, walls, and towers. Successfully defending raids boosts peace.<br>
        <b style="color:#ef5350;">Favor</b> — The King's opinion of you. Pay tribute on time! Missing tributes severely damages favor. Starts at 50.<br><br>

        <h3 style="color:#ffd700; margin:12px 0 4px;">Housing Evolution</h3>
        Housing evolves through 6 tiers as you provide services:<br>
        <span style="color:#888;">Tent</span> → <span style="color:#aaa;">Shack</span> → <span style="color:#ccc;">Cottage</span> → <span style="color:#ddd;">House</span> → <span style="color:#eee;">Villa</span> → <span style="color:#fff;">Mansion</span><br>
        Each tier needs: more services (food, water, religion, entertainment), higher desirability, and advanced goods (cloth at tier 4, tools at tier 5).<br>
        Higher tiers house more people and pay more tax.<br><br>

        <h3 style="color:#ffd700; margin:12px 0 4px;">Walkers & Services</h3>
        Service buildings spawn walkers that travel along roads. When a walker passes housing, that housing receives the service.
        Walkers have a limited range — place service buildings close to the housing they serve.
        Services include: food (market), water (well), religion (chapel/church), entertainment (tavern), safety (watchpost), and commerce (guild hall).<br><br>

        <h3 style="color:#ffd700; margin:12px 0 4px;">Desirability</h3>
        Each tile has a desirability score affected by nearby buildings. Wells, churches, and parks increase desirability.
        Farms, industry buildings, and some structures decrease it. Housing needs positive desirability to evolve.<br><br>

        <h3 style="color:#ffd700; margin:12px 0 4px;">Production Chains</h3>
        <span style="color:#8bc34a;">Food:</span> Farm (wheat) → Mill (flour) → Bakery (food) → Market (distributes)<br>
        <span style="color:#8bc34a;">Alt Food:</span> Farm (wheat) → Butcher (food) → Market<br>
        <span style="color:#ff9800;">Cloth:</span> Farm → Weaver (cloth) → Housing needs / Guild hall (gold)<br>
        <span style="color:#90a4ae;">Tools:</span> Iron Mine (iron) → Blacksmith (tools) → Housing needs / Guild hall (gold)<br>
        <span style="color:#8d6e63;">Building:</span> Lumber Camp (wood) + Quarry (stone) → Construction materials<br><br>

        <h3 style="color:#ffd700; margin:12px 0 4px;">Trade & Tribute</h3>
        Merchant caravans arrive periodically with goods to buy and sell. Guild halls convert surplus cloth/tools into gold.
        Every year the King demands tribute — pay it to maintain Favor. Missing tribute can lead to defeat.<br><br>

        <h3 style="color:#ffd700; margin:12px 0 4px;">Fires & Raids</h3>
        Buildings can catch fire! Watchposts reduce fire risk. Click a burning building to extinguish it (costs 20g).
        Bandits may raid your town — build barracks and walls to defend. Soldiers automatically engage enemies.<br><br>

        <h3 style="color:#ffd700; margin:12px 0 4px;">Employment</h3>
        Workers are drawn from your housing population. Buildings need workers to function — understaffed buildings produce less.
        Set worker priority (High/Normal/Low) on individual buildings to control allocation. High unemployment lowers morale.

      </div>
      <div style="text-align:center; margin-top:12px;">
        <button id="caesar-concepts-close" style="padding:8px 28px; font-size:14px; background:#8b6914; color:#fff; border:none; border-radius:4px; cursor:pointer;">Close (Esc)</button>
      </div>
    `;
    this._helpOverlay.appendChild(box);
    this._helpOverlay.addEventListener("click", (e) => {
      if (e.target === this._helpOverlay) this._hideHelpOverlay();
    });
    this._root!.appendChild(this._helpOverlay);
    box.querySelector("#caesar-concepts-close")!.addEventListener("click", () => this._hideHelpOverlay());
  }

  destroy(): void {
    if (this._root) {
      this._root.remove();
      this._root = null;
    }
    if (this._notifyTimeout) clearTimeout(this._notifyTimeout);
  }
}
