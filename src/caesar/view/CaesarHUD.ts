// ---------------------------------------------------------------------------
// Caesar – HUD (HTML overlay)
// ---------------------------------------------------------------------------

import { CB } from "../config/CaesarBalance";
import {
  CaesarBuildingType,
  CAESAR_BUILDING_DEFS,
  HOUSING_TIER_NAMES,
  type CaesarBuildingCategory,
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
      <div style="text-align:left; font-size:12px; color:#aa9977; margin-bottom:12px; padding:8px; background:#1a1208; border-radius:4px;">
        <b style="color:#cdb891;">How to play:</b><br>
        - Place roads, then buildings adjacent to roads<br>
        - Build farms → mills → bakeries for food chains<br>
        - Markets deliver food, chapels deliver religion<br>
        - Housing evolves with services + cloth/tools for high tiers<br>
        - Build granaries/warehouses to increase storage capacity<br>
        - Guild halls trade surplus cloth/tools for gold<br>
        - Pay the King's tribute to maintain favor<br>
        <b style="color:#cdb891;">Controls:</b> WASD pan, scroll zoom, shift+drag pan, 1-4 tools, F5 save, F9 load
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
      background: linear-gradient(180deg, rgba(26,18,8,0.95), rgba(26,18,8,0.8));
      display: flex; align-items: center; padding: 0 12px; gap: 16px;
      font-size: 13px; pointer-events: all; border-bottom: 1px solid #5a4020;
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
      background: linear-gradient(0deg, rgba(26,18,8,0.95), rgba(26,18,8,0.8));
      padding: 6px 12px; pointer-events: all; border-top: 1px solid #5a4020;
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

    // Tooltip (follows mouse near bottom bar)
    this._tooltip = document.createElement("div");
    this._tooltip.style.cssText = `
      position: absolute; bottom: 100px; left: 50%; transform: translateX(-50%);
      background: rgba(0,0,0,0.85); padding: 4px 12px; border-radius: 3px;
      font-size: 12px; pointer-events: none; display: none; color: #ff6b6b;
      white-space: nowrap;
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
      if (e.key === "Escape") this.onSelectTool?.("select");
      if (e.key === "F5") { e.preventDefault(); this.onSave?.(); }
      if (e.key === "F9") { e.preventDefault(); this.onLoad?.(); }
    });
  }

  private _forceBuildMenuUpdate = false;
  private _lastBuildCat: CaesarBuildingCategory | null = null;

  showNotification(msg: string): void {
    if (!this._notification) return;
    this._notification.textContent = msg;
    this._notification.style.display = "block";
    if (this._notifyTimeout) clearTimeout(this._notifyTimeout);
    this._notifyTimeout = window.setTimeout(() => {
      if (this._notification) this._notification.style.display = "none";
    }, 2500);
  }

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
      resHTML += `<span style="color:${atCap ? "#f44336" : meta.color}">${meta.label}: ${amount}${capStr}</span>`;
    }

    // Population with color
    const popColor = state.population >= state.goals.population ? "#4caf50" : "#f0e6d2";
    resHTML += `<span style="color:${popColor}">Pop: ${state.population}/${state.maxPopulation}</span>`;

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
      this._ratingPanel.innerHTML = `
        <span style="color:${r.prosperity >= g.prosperity ? '#4caf50' : '#ff9800'}">Pros: ${Math.floor(r.prosperity)}/${g.prosperity}</span>
        <span style="color:${r.culture >= g.culture ? '#4caf50' : '#ff9800'}">Cult: ${Math.floor(r.culture)}/${g.culture}</span>
        <span style="color:${r.peace >= g.peace ? '#4caf50' : '#ff9800'}">Peace: ${Math.floor(r.peace)}/${g.peace}</span>
        <span style="color:${r.favor >= g.favor ? '#4caf50' : '#ff9800'}">Favor: ${Math.floor(r.favor)}/${g.favor}</span>
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

    const btn = document.createElement("button");
    btn.textContent = `${bdef.label} (${costStr})`;
    btn.title = `${bdef.description}${maint > 0 ? `\nMaintenance: ${maint}g/tax` : ""}${bdef.woodCost > 0 ? `\nWood: ${bdef.woodCost}` : ""}${bdef.stoneCost > 0 ? `\nStone: ${bdef.stoneCost}` : ""}`;
    btn.style.cssText = `
      padding: 3px 8px; font-size: 11px;
      background: ${canAfford ? "#3a2a15" : "#2a1a0a"};
      color: ${canAfford ? "#f0e6d2" : "#665544"};
      border: 1px solid ${state.selectedBuildingType === type ? "#ffd700" : "#5a4020"};
      border-radius: 3px; cursor: ${canAfford ? "pointer" : "not-allowed"};
    `;
    btn.addEventListener("click", () => {
      if (canAfford) this.onSelectBuildingType?.(type);
    });
    container.appendChild(btn);
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

    let html = `<b style="color:#ffd700">${bdef.label}</b>`;
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
      html += `<br><span style="color:#ff4444;font-weight:bold">ON FIRE! (${Math.ceil(b.fireTimer)}s)</span>`;
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

    let html = `<div style="color:#ffd700;font-size:14px;font-weight:bold;margin-bottom:6px;">
      Merchant Caravan <span style="color:#aa9977;font-size:11px">(${Math.ceil(c.timer)}s remaining)</span>
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
  }

  private _updateTooltip(state: CaesarState): void {
    if (!this._tooltip) return;
    if (state.tooltipText && (state.selectedTool === "build" || state.selectedTool === "road")) {
      this._tooltip.textContent = state.tooltipText;
      this._tooltip.style.display = "block";
    } else {
      this._tooltip.style.display = "none";
    }
  }

  private _updateEventBanner(state: CaesarState): void {
    if (!this._eventBanner) return;
    if (state.activeEvent) {
      this._eventBanner.textContent = `${state.activeEvent.message} (${Math.ceil(state.activeEvent.timer)}s)`;
      this._eventBanner.style.display = "block";
    } else {
      this._eventBanner.style.display = "none";
    }
  }

  private _updateGameOver(state: CaesarState): void {
    if (!this._gameOverOverlay) return;

    if (!state.gameOver) {
      this._gameOverOverlay.style.display = "none";
      return;
    }

    this._gameOverOverlay.style.display = "flex";
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
        <button onclick="window.dispatchEvent(new Event('caesarExit'))" style="
          padding:10px 28px; font-size:16px; background:#8b6914; color:#fff;
          border:none; border-radius:4px; cursor:pointer; margin-top:16px;
        ">Return to Menu</button>
      </div>
    `;
  }

  destroy(): void {
    if (this._root) {
      this._root.remove();
      this._root = null;
    }
    if (this._notifyTimeout) clearTimeout(this._notifyTimeout);
  }
}
