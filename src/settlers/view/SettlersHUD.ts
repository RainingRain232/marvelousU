// ---------------------------------------------------------------------------
// Settlers – HTML overlay HUD
// ---------------------------------------------------------------------------

import { BUILDING_DEFS, SettlersBuildingType } from "../config/SettlersBuildingDefs";
import { RESOURCE_META, ResourceType } from "../config/SettlersResourceDefs";
import type { SettlersState, SettlersTool } from "../state/SettlersState";

export class SettlersHUD {
  private _root!: HTMLDivElement;
  private _resourceBar!: HTMLDivElement;
  private _buildMenu!: HTMLDivElement;
  private _infoPanel!: HTMLDivElement;
  private _toolIndicator!: HTMLDivElement;
  private _pauseOverlay!: HTMLDivElement;
  private _gameOverOverlay!: HTMLDivElement;

  // Callbacks
  onSelectBuildingType: ((type: SettlersBuildingType) => void) | null = null;
  onSelectTool: ((tool: SettlersTool) => void) | null = null;
  onExit: (() => void) | null = null;

  build(): void {
    this._root = document.createElement("div");
    this._root.id = "settlers-hud";
    this._root.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      pointer-events: none; z-index: 20; font-family: monospace; color: #e0d8c8;
    `;
    document.body.appendChild(this._root);

    // --- Resource bar (top) ---
    this._resourceBar = document.createElement("div");
    this._resourceBar.style.cssText = `
      position: absolute; top: 0; left: 0; right: 0; height: 36px;
      background: rgba(16,16,42,0.85); display: flex; align-items: center;
      padding: 0 12px; gap: 14px; font-size: 13px; pointer-events: auto;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    `;
    this._root.appendChild(this._resourceBar);

    // --- Tool indicator (top-right) ---
    this._toolIndicator = document.createElement("div");
    this._toolIndicator.style.cssText = `
      position: absolute; top: 44px; right: 12px; padding: 6px 14px;
      background: rgba(16,16,42,0.85); border-radius: 6px; font-size: 14px;
      pointer-events: auto; border: 1px solid rgba(255,255,255,0.15);
    `;
    this._root.appendChild(this._toolIndicator);

    // --- Build menu (bottom) ---
    this._buildMenu = document.createElement("div");
    this._buildMenu.style.cssText = `
      position: absolute; bottom: 0; left: 0; right: 0;
      background: rgba(16,16,42,0.9); padding: 8px 12px;
      pointer-events: auto; display: flex; flex-wrap: wrap; gap: 4px;
      border-top: 1px solid rgba(255,255,255,0.1); max-height: 160px;
      overflow-y: auto;
    `;
    this._root.appendChild(this._buildMenu);
    this._buildBuildMenu();

    // --- Info panel (right) ---
    this._infoPanel = document.createElement("div");
    this._infoPanel.style.cssText = `
      position: absolute; top: 80px; right: 12px; width: 200px;
      background: rgba(16,16,42,0.88); border-radius: 8px; padding: 10px;
      pointer-events: auto; font-size: 12px; display: none;
      border: 1px solid rgba(255,255,255,0.12);
    `;
    this._root.appendChild(this._infoPanel);

    // --- Pause overlay ---
    this._pauseOverlay = document.createElement("div");
    this._pauseOverlay.style.cssText = `
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      font-size: 48px; color: #ffd700; text-shadow: 2px 2px 8px #000;
      display: none; pointer-events: none;
    `;
    this._pauseOverlay.textContent = "PAUSED";
    this._root.appendChild(this._pauseOverlay);

    // --- Game over overlay ---
    this._gameOverOverlay = document.createElement("div");
    this._gameOverOverlay.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.7); display: none; align-items: center;
      justify-content: center; flex-direction: column; pointer-events: auto;
    `;
    this._root.appendChild(this._gameOverOverlay);
  }

  private _buildBuildMenu(): void {
    // Tool buttons
    const tools: { tool: SettlersTool; label: string; key: string }[] = [
      { tool: "select", label: "Select", key: "ESC" },
      { tool: "road", label: "Road", key: "R" },
      { tool: "flag", label: "Flag", key: "F" },
      { tool: "demolish", label: "Demolish", key: "X" },
      { tool: "attack", label: "Attack", key: "T" },
    ];

    for (const t of tools) {
      const btn = document.createElement("button");
      btn.style.cssText = `
        padding: 4px 10px; background: #2a2a4a; color: #e0d8c8; border: 1px solid #444;
        border-radius: 4px; cursor: pointer; font-family: monospace; font-size: 12px;
      `;
      btn.textContent = `[${t.key}] ${t.label}`;
      btn.onclick = () => this.onSelectTool?.(t.tool);
      this._buildMenu.appendChild(btn);
    }

    // Separator
    const sep = document.createElement("div");
    sep.style.cssText = "width: 100%; height: 1px; background: #444; margin: 4px 0;";
    this._buildMenu.appendChild(sep);

    // Building buttons by category
    const categories = ["economy", "military", "infrastructure"] as const;
    for (const cat of categories) {
      const catLabel = document.createElement("span");
      catLabel.style.cssText = "color: #aaa; font-size: 11px; margin-right: 6px; text-transform: uppercase;";
      catLabel.textContent = cat + ":";
      this._buildMenu.appendChild(catLabel);

      for (const def of Object.values(BUILDING_DEFS)) {
        if (def.category !== cat) continue;
        if (def.type === SettlersBuildingType.HEADQUARTERS) continue; // can't build HQ

        const btn = document.createElement("button");
        btn.style.cssText = `
          padding: 3px 8px; background: #1a3a2a; color: #c0d0b0; border: 1px solid #3a5a3a;
          border-radius: 3px; cursor: pointer; font-family: monospace; font-size: 11px;
        `;
        btn.textContent = def.label;
        btn.title = this._buildingTooltip(def);
        btn.onclick = () => {
          this.onSelectBuildingType?.(def.type);
          this.onSelectTool?.("build");
        };
        this._buildMenu.appendChild(btn);
      }
    }
  }

  private _buildingTooltip(def: (typeof BUILDING_DEFS)[SettlersBuildingType]): string {
    let tip = `${def.label} (${def.size})\n`;
    if (def.constructionCost.length > 0) {
      tip += "Cost: " + def.constructionCost.map((c) => `${c.amount} ${RESOURCE_META[c.type].label}`).join(", ") + "\n";
    }
    if (def.inputs.length > 0) {
      tip += "In: " + def.inputs.map((i) => RESOURCE_META[i.type].label).join(", ") + "\n";
    }
    if (def.outputs.length > 0) {
      tip += "Out: " + def.outputs.map((o) => RESOURCE_META[o.type].label).join(", ") + "\n";
    }
    if (def.garrisonSlots > 0) tip += `Garrison: ${def.garrisonSlots} soldiers\n`;
    if (def.territoryRadius > 0) tip += `Territory: ${def.territoryRadius} tiles\n`;
    if (def.requiresTerrain) tip += `Requires: ${def.requiresTerrain}\n`;
    return tip;
  }

  update(state: SettlersState): void {
    // Resource bar
    const player = state.players.get("p0");
    if (player) {
      let html = "";
      const show: ResourceType[] = [
        ResourceType.WOOD, ResourceType.PLANKS, ResourceType.STONE,
        ResourceType.IRON_ORE, ResourceType.IRON, ResourceType.COAL,
        ResourceType.GOLD_ORE, ResourceType.GOLD,
        ResourceType.WHEAT, ResourceType.FLOUR, ResourceType.BREAD,
        ResourceType.FISH, ResourceType.MEAT, ResourceType.BEER,
        ResourceType.SWORD, ResourceType.SHIELD,
      ];
      for (const r of show) {
        const count = player.storage.get(r) || 0;
        if (count > 0 || r === ResourceType.PLANKS || r === ResourceType.STONE || r === ResourceType.WOOD) {
          const meta = RESOURCE_META[r];
          const hexColor = "#" + meta.color.toString(16).padStart(6, "0");
          html += `<span style="color:${hexColor}">${meta.label}:${count}</span> `;
        }
      }
      html += `<span style="color:#88aacc">Workers:${player.availableWorkers}</span>`;
      this._resourceBar.innerHTML = html;
    }

    // Tool indicator
    this._toolIndicator.textContent = `Tool: ${state.selectedTool.toUpperCase()}${
      state.selectedBuildingType ? " - " + BUILDING_DEFS[state.selectedBuildingType].label : ""
    }`;

    // Pause
    this._pauseOverlay.style.display = state.paused ? "block" : "none";

    // Game over
    if (state.gameOver) {
      this._gameOverOverlay.style.display = "flex";
      this._gameOverOverlay.innerHTML = `
        <div style="font-size: 48px; color: ${state.winner === "p0" ? "#ffd700" : "#ff4444"}; text-shadow: 2px 2px 8px #000;">
          ${state.winner === "p0" ? "VICTORY!" : "DEFEAT"}
        </div>
        <button id="settlers-exit-btn" style="margin-top: 20px; padding: 10px 30px; font-size: 18px;
          background: #2a2a4a; color: #e0d8c8; border: 1px solid #666; border-radius: 6px; cursor: pointer;">
          Exit
        </button>
      `;
      const exitBtn = document.getElementById("settlers-exit-btn");
      if (exitBtn) exitBtn.onclick = () => this.onExit?.();
    }

    // Info panel for selected building
    if (state.selectedBuildingId) {
      const building = state.buildings.get(state.selectedBuildingId);
      if (building) {
        this._infoPanel.style.display = "block";
        const def = BUILDING_DEFS[building.type];
        let html = `<div style="font-size:14px;color:#ffd700;margin-bottom:6px;">${def.label}</div>`;
        html += `<div>HP: ${building.hp}/${building.maxHp}</div>`;
        if (building.constructionProgress < 1) {
          html += `<div>Building: ${Math.floor(building.constructionProgress * 100)}%</div>`;
          if (building.constructionNeeds.length > 0) {
            html += `<div>Needs: ${building.constructionNeeds.map((n) => `${n.amount} ${RESOURCE_META[n.type].label}`).join(", ")}</div>`;
          }
        } else {
          if (building.inputStorage.length > 0) {
            html += `<div>Input: ${building.inputStorage.map((s) => `${s.amount} ${RESOURCE_META[s.type].label}`).join(", ")}</div>`;
          }
          if (building.outputStorage.length > 0) {
            html += `<div>Output: ${building.outputStorage.map((s) => `${s.amount} ${RESOURCE_META[s.type].label}`).join(", ")}</div>`;
          }
          if (building.garrison.length > 0) {
            html += `<div>Garrison: ${building.garrison.length}/${building.garrisonSlots}</div>`;
          }
        }
        this._infoPanel.innerHTML = html;
      } else {
        this._infoPanel.style.display = "none";
      }
    } else {
      this._infoPanel.style.display = "none";
    }
  }

  destroy(): void {
    this._root.remove();
  }
}
