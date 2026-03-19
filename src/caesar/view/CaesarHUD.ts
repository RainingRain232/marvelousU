// ---------------------------------------------------------------------------
// Caesar – HUD (HTML overlay)
// ---------------------------------------------------------------------------

import { CB } from "../config/CaesarBalance";
import {
  CaesarBuildingType,
  CAESAR_BUILDING_DEFS,
  HOUSING_TIER_NAMES,
  type CaesarBuildingCategory,
} from "../config/CaesarBuildingDefs";
import { CaesarResourceType, RESOURCE_META } from "../config/CaesarResourceDefs";
import type { CaesarState, CaesarTool } from "../state/CaesarState";

export class CaesarHUD {
  private _root: HTMLDivElement | null = null;
  private _topBar: HTMLDivElement | null = null;
  private _bottomBar: HTMLDivElement | null = null;
  private _infoPanel: HTMLDivElement | null = null;
  private _ratingPanel: HTMLDivElement | null = null;
  private _notification: HTMLDivElement | null = null;
  private _gameOverOverlay: HTMLDivElement | null = null;
  private _settingsOverlay: HTMLDivElement | null = null;
  private _notifyTimeout: number | null = null;

  // Callbacks
  onSelectTool: ((tool: CaesarTool) => void) | null = null;
  onSelectBuildingType: ((type: CaesarBuildingType) => void) | null = null;
  onStartGame: ((difficulty: string) => void) | null = null;
  onExit: (() => void) | null = null;
  onSpeedChange: ((speed: number) => void) | null = null;

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
      padding: 32px 40px; text-align: center; min-width: 320px;
    `;

    box.innerHTML = `
      <h1 style="font-size:28px; margin:0 0 8px; color:#ffd700; font-family:serif;">Medieval Caesar</h1>
      <p style="font-size:14px; margin:0 0 24px; color:#cdb891;">
        Build a thriving medieval town for the King.<br>
        Meet population and rating goals to win!
      </p>
      <div style="margin-bottom:20px;">
        <label style="font-size:14px;">Difficulty:</label><br>
        <select id="caesar-difficulty" style="
          margin-top:6px; padding:6px 12px; font-size:14px; background:#1a1208;
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
      <button id="caesar-back-btn" style="
        padding: 10px 24px; font-size: 16px; background: #444; color: #ccc;
        border: none; border-radius: 4px; cursor: pointer;
      ">Back</button>
    `;

    this._settingsOverlay.appendChild(box);
    this._root!.appendChild(this._settingsOverlay);

    box.querySelector("#caesar-start-btn")!.addEventListener("click", () => {
      const diff = (box.querySelector("#caesar-difficulty") as HTMLSelectElement).value;
      this._settingsOverlay!.style.display = "none";
      this._buildGameHUD();
      this.onStartGame?.(diff);
    });

    box.querySelector("#caesar-back-btn")!.addEventListener("click", () => {
      this.onExit?.();
    });
  }

  private _buildGameHUD(): void {
    // Top bar: resources + ratings
    this._topBar = document.createElement("div");
    this._topBar.style.cssText = `
      position: absolute; top: 0; left: 0; right: 0; height: 36px;
      background: linear-gradient(180deg, rgba(26,18,8,0.95), rgba(26,18,8,0.8));
      display: flex; align-items: center; padding: 0 12px; gap: 16px;
      font-size: 13px; pointer-events: all; border-bottom: 1px solid #5a4020;
    `;
    this._root!.appendChild(this._topBar);

    // Rating panel (right side of top bar)
    this._ratingPanel = document.createElement("div");
    this._ratingPanel.style.cssText = `
      margin-left: auto; display: flex; gap: 14px; font-size: 12px;
    `;
    this._topBar.appendChild(this._ratingPanel);

    // Bottom bar: tools + building categories
    this._bottomBar = document.createElement("div");
    this._bottomBar.style.cssText = `
      position: absolute; bottom: 0; left: 0; right: 0;
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

    // Building categories + buttons
    const buildRow = document.createElement("div");
    buildRow.id = "caesar-build-row";
    buildRow.style.cssText = `display: flex; gap: 4px; flex-wrap: wrap; max-height: 80px; overflow-y: auto;`;
    this._bottomBar.appendChild(buildRow);

    // Info panel (right side)
    this._infoPanel = document.createElement("div");
    this._infoPanel.style.cssText = `
      position: absolute; right: 8px; top: 44px; width: 220px;
      background: rgba(26,18,8,0.9); border: 1px solid #5a4020; border-radius: 4px;
      padding: 8px; font-size: 12px; pointer-events: all; display: none;
    `;
    this._root!.appendChild(this._infoPanel);

    // Notification toast
    this._notification = document.createElement("div");
    this._notification.style.cssText = `
      position: absolute; top: 44px; left: 50%; transform: translateX(-50%);
      background: rgba(139,105,20,0.9); padding: 6px 16px; border-radius: 4px;
      font-size: 14px; pointer-events: none; display: none;
    `;
    this._root!.appendChild(this._notification);

    // Game over overlay
    this._gameOverOverlay = document.createElement("div");
    this._gameOverOverlay.style.cssText = `
      position: fixed; inset: 0; display: none; align-items: center; justify-content: center;
      background: rgba(0,0,0,0.8); pointer-events: all; z-index: 200;
    `;
    this._root!.appendChild(this._gameOverOverlay);

    // Keyboard shortcuts for tools
    window.addEventListener("keydown", (e) => {
      if (e.key === "1") this.onSelectTool?.("select");
      if (e.key === "2") this.onSelectTool?.("build");
      if (e.key === "3") this.onSelectTool?.("road");
      if (e.key === "4") this.onSelectTool?.("demolish");
      if (e.key === "Escape") this.onSelectTool?.("select");
    });
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

  update(state: CaesarState): void {
    this._updateTopBar(state);
    this._updateBuildMenu(state);
    this._updateInfoPanel(state);
    this._updateGameOver(state);
  }

  private _updateTopBar(state: CaesarState): void {
    if (!this._topBar) return;

    // Resources (left side) — update in place
    const resTypes = [
      CaesarResourceType.GOLD,
      CaesarResourceType.FOOD,
      CaesarResourceType.WOOD,
      CaesarResourceType.STONE,
      CaesarResourceType.IRON,
    ];

    // Only update text content, don't recreate elements
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
      resHTML += `<span style="color:${meta.color}">${meta.label}: ${amount}</span>`;
    }
    resHTML += `<span style="color:#aaa">Pop: ${state.population}/${state.maxPopulation}</span>`;
    resHTML += `<span style="color:#aaa">Unemployed: ${state.unemployed}</span>`;
    resContainer.innerHTML = resHTML;

    // Ratings
    if (this._ratingPanel) {
      const r = state.ratings;
      const g = state.goals;
      this._ratingPanel.innerHTML = `
        <span style="color:${r.prosperity >= g.prosperity ? '#4caf50' : '#ff9800'}">Prosperity: ${Math.floor(r.prosperity)}/${g.prosperity}</span>
        <span style="color:${r.culture >= g.culture ? '#4caf50' : '#ff9800'}">Culture: ${Math.floor(r.culture)}/${g.culture}</span>
        <span style="color:${r.peace >= g.peace ? '#4caf50' : '#ff9800'}">Peace: ${Math.floor(r.peace)}/${g.peace}</span>
        <span style="color:${r.favor >= g.favor ? '#4caf50' : '#ff9800'}">Favor: ${Math.floor(r.favor)}/${g.favor}</span>
        <span style="color:#aaa">Tribute: ${Math.floor(state.tributeTimer)}s</span>
      `;
    }
  }

  private _updateBuildMenu(state: CaesarState): void {
    if (!this._bottomBar) return;
    const buildRow = this._bottomBar.querySelector("#caesar-build-row") as HTMLDivElement;
    if (!buildRow) return;

    // Only show when build tool selected
    if (state.selectedTool !== "build") {
      buildRow.style.display = "none";
      return;
    }
    buildRow.style.display = "flex";

    // Only rebuild if changed
    const currentCount = buildRow.children.length;
    const buildableTypes = Object.values(CaesarBuildingType).filter(
      (t) => t !== CaesarBuildingType.ROAD && t !== CaesarBuildingType.HOUSING,
    );

    if (currentCount === buildableTypes.length) return;

    buildRow.innerHTML = "";

    // Housing first
    this._addBuildButton(buildRow, CaesarBuildingType.HOUSING, state);

    // Group by category
    const categories: CaesarBuildingCategory[] = [
      "infrastructure", "food", "industry", "religion", "safety", "entertainment", "commerce",
    ];

    for (const cat of categories) {
      for (const type of buildableTypes) {
        const bdef = CAESAR_BUILDING_DEFS[type as CaesarBuildingType];
        if (bdef.category === cat) {
          this._addBuildButton(buildRow, type as CaesarBuildingType, state);
        }
      }
    }
  }

  private _addBuildButton(container: HTMLDivElement, type: CaesarBuildingType, state: CaesarState): void {
    const bdef = CAESAR_BUILDING_DEFS[type];
    const gold = state.resources.get(CaesarResourceType.GOLD) ?? 0;
    const canAfford = gold >= bdef.cost;

    const btn = document.createElement("button");
    btn.textContent = `${bdef.label} (${bdef.cost}g)`;
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

    let html = `<b>${bdef.label}</b>`;
    if (!b.built) {
      html += `<br>Building: ${Math.floor(b.constructionProgress * 100)}%`;
    }

    if (b.type === CaesarBuildingType.HOUSING) {
      html += `<br>Tier: ${HOUSING_TIER_NAMES[b.housingTier]}`;
      html += `<br>Residents: ${b.residents}/${CB.HOUSING_CAPACITY[b.housingTier]}`;
      html += `<br>Services: ${[...b.services].join(", ") || "none"}`;
      const tile = state.map.tiles[b.tileY * state.map.width + b.tileX];
      if (tile) html += `<br>Desirability: ${tile.desirability.toFixed(1)}`;
    }

    if (bdef.maxWorkers > 0) {
      html += `<br>Workers: ${b.workers}/${bdef.maxWorkers}`;
    }

    if (bdef.outputs.length > 0) {
      html += `<br>Produces: ${bdef.outputs.map((o) => RESOURCE_META[o.type].label).join(", ")}`;
    }
    if (bdef.inputs.length > 0) {
      html += `<br>Requires: ${bdef.inputs.map((i) => RESOURCE_META[i.type].label).join(", ")}`;
    }

    if (b.hp > 0 && b.hp < b.maxHp) {
      html += `<br>HP: ${b.hp}/${b.maxHp}`;
    }

    this._infoPanel.innerHTML = html;
  }

  private _updateGameOver(state: CaesarState): void {
    if (!this._gameOverOverlay) return;

    if (!state.gameOver) {
      this._gameOverOverlay.style.display = "none";
      return;
    }

    this._gameOverOverlay.style.display = "flex";
    this._gameOverOverlay.innerHTML = `
      <div style="background:#2a1f14; border:2px solid ${state.victory ? '#4caf50' : '#f44336'};
        border-radius:8px; padding:32px; text-align:center;">
        <h1 style="color:${state.victory ? '#4caf50' : '#f44336'}; font-family:serif; margin:0 0 12px;">
          ${state.victory ? "VICTORY!" : "DEFEAT"}
        </h1>
        <p style="color:#cdb891; margin:0 0 8px;">
          ${state.victory ? "You have built a thriving medieval town!" : "The King is displeased."}
        </p>
        <p style="color:#aaa; font-size:13px; margin:0 0 20px;">
          Population: ${state.population} | Prosperity: ${Math.floor(state.ratings.prosperity)}<br>
          Culture: ${Math.floor(state.ratings.culture)} | Peace: ${Math.floor(state.ratings.peace)} | Favor: ${Math.floor(state.ratings.favor)}
        </p>
        <button onclick="window.dispatchEvent(new Event('caesarExit'))" style="
          padding:10px 28px; font-size:16px; background:#8b6914; color:#fff;
          border:none; border-radius:4px; cursor:pointer;
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
