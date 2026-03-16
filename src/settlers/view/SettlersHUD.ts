// ---------------------------------------------------------------------------
// Settlers – HTML overlay HUD (enhanced with minimap, wiki, save/load, etc.)
// ---------------------------------------------------------------------------

import { BUILDING_DEFS, SettlersBuildingType } from "../config/SettlersBuildingDefs";
import { RESOURCE_META, ResourceType } from "../config/SettlersResourceDefs";
import { Biome, Deposit } from "../state/SettlersMap";
import { SB } from "../config/SettlersBalance";
import type { SettlersState, SettlersTool } from "../state/SettlersState";
import { calculateScore } from "../systems/SettlersMilitarySystem";

// Production chain data for the wiki panel
const PRODUCTION_CHAINS: { name: string; steps: string[] }[] = [
  { name: "Construction", steps: ["Wood -> Sawmill -> Planks", "Mountain -> Quarry -> Stone"] },
  { name: "Food", steps: ["Forest -> Hunter -> Meat", "Water -> Fisher -> Fish", "Meadow -> Farm -> Wheat -> Mill -> Flour", "Flour + Water -> Bakery -> Bread"] },
  { name: "Beer", steps: ["Wheat + Water -> Brewery -> Beer"] },
  { name: "Iron", steps: ["Mountain -> Iron Mine (food) -> Iron Ore", "Mountain -> Coal Mine (food) -> Coal", "Iron Ore + Coal -> Smelter -> Iron"] },
  { name: "Gold", steps: ["Mountain -> Gold Mine (food) -> Gold Ore", "Gold Ore + Coal -> Mint -> Gold"] },
  { name: "Military", steps: ["Iron + Coal -> Swordsmith -> Sword", "Iron + Coal -> Shieldsmith -> Shield", "Sword + Shield + Beer -> Barracks -> Soldier"] },
];

export class SettlersHUD {
  private _root!: HTMLDivElement;
  private _resourceBar!: HTMLDivElement;
  private _buildMenu!: HTMLDivElement;
  private _infoPanel!: HTMLDivElement;
  private _toolIndicator!: HTMLDivElement;
  private _pauseOverlay!: HTMLDivElement;
  private _gameOverOverlay!: HTMLDivElement;
  private _minimap!: HTMLCanvasElement;
  private _minimapCtx!: CanvasRenderingContext2D;
  private _wikiPanel!: HTMLDivElement;
  private _notification!: HTMLDivElement;
  private _notificationTimer = 0;
  private _wikiVisible = false;

  // Callbacks
  onSelectBuildingType: ((type: SettlersBuildingType) => void) | null = null;
  onSelectTool: ((tool: SettlersTool) => void) | null = null;
  onExit: (() => void) | null = null;
  onSave: (() => void) | null = null;
  onLoad: (() => void) | null = null;

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
      position: absolute; top: 80px; right: 12px; width: 220px;
      background: rgba(16,16,42,0.88); border-radius: 8px; padding: 10px;
      pointer-events: auto; font-size: 12px; display: none;
      border: 1px solid rgba(255,255,255,0.12);
    `;
    this._root.appendChild(this._infoPanel);

    // --- Minimap (bottom-left) ---
    this._minimap = document.createElement("canvas");
    this._minimap.width = 160;
    this._minimap.height = 160;
    this._minimap.style.cssText = `
      position: absolute; bottom: 170px; left: 8px;
      background: rgba(16,16,42,0.9); border: 1px solid rgba(255,255,255,0.2);
      border-radius: 4px; pointer-events: auto; image-rendering: pixelated;
    `;
    this._root.appendChild(this._minimap);
    this._minimapCtx = this._minimap.getContext("2d")!;

    // --- Wiki panel (toggleable) ---
    this._wikiPanel = document.createElement("div");
    this._wikiPanel.style.cssText = `
      position: absolute; top: 80px; left: 12px; width: 280px; max-height: 400px;
      background: rgba(16,16,42,0.92); border-radius: 8px; padding: 12px;
      pointer-events: auto; font-size: 11px; display: none; overflow-y: auto;
      border: 1px solid rgba(255,255,255,0.12);
    `;
    this._buildWikiPanel();
    this._root.appendChild(this._wikiPanel);

    // --- Notification ---
    this._notification = document.createElement("div");
    this._notification.style.cssText = `
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      font-size: 22px; color: #ffd700; text-shadow: 2px 2px 8px #000;
      display: none; pointer-events: none; transition: opacity 0.3s;
    `;
    this._root.appendChild(this._notification);

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

  showNotification(text: string): void {
    this._notification.textContent = text;
    this._notification.style.display = "block";
    this._notification.style.opacity = "1";
    this._notificationTimer = 2.0;
  }

  private _buildWikiPanel(): void {
    let html = `<div style="font-size:14px;color:#ffd700;margin-bottom:8px;">Production Chains</div>`;
    for (const chain of PRODUCTION_CHAINS) {
      html += `<div style="color:#aaddff;margin-top:6px;font-weight:bold;">${chain.name}</div>`;
      for (const step of chain.steps) {
        html += `<div style="color:#b8c8a0;padding-left:8px;">${step}</div>`;
      }
    }
    html += `<div style="margin-top:12px;color:#888;">Press [H] to toggle this panel</div>`;
    this._wikiPanel.innerHTML = html;
  }

  toggleWiki(): void {
    this._wikiVisible = !this._wikiVisible;
    this._wikiPanel.style.display = this._wikiVisible ? "block" : "none";
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

    // Save/Load/Wiki buttons
    const utilBtns: { label: string; action: () => void }[] = [
      { label: "[F5] Save", action: () => this.onSave?.() },
      { label: "[F9] Load", action: () => this.onLoad?.() },
      { label: "[H] Wiki", action: () => this.toggleWiki() },
    ];
    for (const u of utilBtns) {
      const btn = document.createElement("button");
      btn.style.cssText = `
        padding: 4px 10px; background: #3a2a4a; color: #d0c8e8; border: 1px solid #554;
        border-radius: 4px; cursor: pointer; font-family: monospace; font-size: 12px;
      `;
      btn.textContent = u.label;
      btn.onclick = u.action;
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
        if (def.type === SettlersBuildingType.HEADQUARTERS) continue;

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
    if (def.productionTime > 0) tip += `Production: ${def.productionTime}s per cycle\n`;
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
      html += ` <span style="color:#cc8888">Soldiers:${player.freeSoldiers}</span>`;
      const score = calculateScore(state, "p0");
      html += ` <span style="color:#ffd700">Score:${score}</span>`;
      // Gold victory progress
      const gold = player.storage.get(ResourceType.GOLD) || 0;
      if (gold > 0) html += ` <span style="color:#ffa500">Gold Victory:${gold}/50</span>`;
      this._resourceBar.innerHTML = html;
    }

    // Tool indicator
    this._toolIndicator.textContent = `Tool: ${state.selectedTool.toUpperCase()}${
      state.selectedBuildingType ? " - " + BUILDING_DEFS[state.selectedBuildingType].label : ""
    }`;

    // Pause
    this._pauseOverlay.style.display = state.paused ? "block" : "none";

    // Notification fade
    if (this._notificationTimer > 0) {
      this._notificationTimer -= 1 / 60;
      if (this._notificationTimer <= 0.5) {
        this._notification.style.opacity = String(this._notificationTimer / 0.5);
      }
      if (this._notificationTimer <= 0) {
        this._notification.style.display = "none";
      }
    }

    // Game over
    if (state.gameOver) {
      this._gameOverOverlay.style.display = "flex";
      const isVictory = state.winner === "p0";
      const p0Score = calculateScore(state, "p0");
      const p1Score = calculateScore(state, "p1");
      // Determine victory type
      const p0Gold = state.players.get("p0")?.storage.get(ResourceType.GOLD) || 0;
      const p1Gold = state.players.get("p1")?.storage.get(ResourceType.GOLD) || 0;
      let victoryType = "Conquest";
      if (p0Gold >= 50 || p1Gold >= 50) victoryType = "Economic";
      // Check territory
      const map = state.map;
      let p0Territory = 0;
      let p1Territory = 0;
      let buildable = 0;
      for (let i = 0; i < map.width * map.height; i++) {
        if (map.buildable[i] === 0) continue;
        buildable++;
        if (map.territory[i] === 0) p0Territory++;
        else if (map.territory[i] === 1) p1Territory++;
      }
      if (buildable > 0 && (p0Territory / buildable > 0.7 || p1Territory / buildable > 0.7)) victoryType = "Dominance";

      this._gameOverOverlay.innerHTML = `
        <div style="font-size: 48px; color: ${isVictory ? "#ffd700" : "#ff4444"}; text-shadow: 2px 2px 8px #000;">
          ${isVictory ? "VICTORY!" : "DEFEAT"}
        </div>
        <div style="font-size: 18px; color: #ccc; margin-top: 10px;">${victoryType} Victory</div>
        <div style="font-size: 16px; color: #aaa; margin-top: 8px;">Your Score: ${p0Score} | Enemy Score: ${p1Score}</div>
        <button id="settlers-exit-btn" style="margin-top: 20px; padding: 10px 30px; font-size: 18px;
          background: #2a2a4a; color: #e0d8c8; border: 1px solid #666; border-radius: 6px; cursor: pointer;">
          Exit
        </button>
      `;
      const exitBtn = document.getElementById("settlers-exit-btn");
      if (exitBtn) exitBtn.onclick = () => this.onExit?.();
    }

    // Info panel for selected building
    this._updateInfoPanel(state);

    // Minimap (every 15 ticks to save perf)
    if (state.tick % 15 === 0) {
      this._updateMinimap(state);
    }
  }

  private _updateInfoPanel(state: SettlersState): void {
    if (state.selectedBuildingId) {
      const building = state.buildings.get(state.selectedBuildingId);
      if (building) {
        this._infoPanel.style.display = "block";
        const def = BUILDING_DEFS[building.type];
        let html = `<div style="font-size:14px;color:#ffd700;margin-bottom:6px;">${def.label}</div>`;

        // HP bar
        const hpPct = Math.max(0, building.hp / building.maxHp);
        const hpColor = hpPct > 0.5 ? "#4a4" : hpPct > 0.25 ? "#aa4" : "#a44";
        html += `<div style="margin-bottom:4px;">HP: ${building.hp}/${building.maxHp}</div>`;
        html += `<div style="background:#333;height:6px;border-radius:3px;margin-bottom:6px;">
          <div style="width:${hpPct * 100}%;height:100%;background:${hpColor};border-radius:3px;"></div></div>`;

        if (building.constructionProgress < 1) {
          const pct = Math.floor(building.constructionProgress * 100);
          html += `<div>Building: ${pct}%</div>`;
          html += `<div style="background:#333;height:6px;border-radius:3px;margin:4px 0;">
            <div style="width:${pct}%;height:100%;background:#4488cc;border-radius:3px;"></div></div>`;
          if (building.constructionNeeds.length > 0) {
            html += `<div style="color:#ff8;">Needs: ${building.constructionNeeds.filter(n => n.amount > 0).map((n) => `${n.amount} ${RESOURCE_META[n.type].label}`).join(", ")}</div>`;
          }
        } else {
          // Production timer
          if (def.productionTime > 0 && def.type !== SettlersBuildingType.BARRACKS) {
            const prodPct = Math.max(0, 1 - building.productionTimer / def.productionTime);
            html += `<div style="margin-top:4px;">Production: ${Math.floor(prodPct * 100)}%</div>`;
            html += `<div style="background:#333;height:4px;border-radius:2px;margin:2px 0;">
              <div style="width:${prodPct * 100}%;height:100%;background:#88cc44;border-radius:2px;"></div></div>`;
          }

          if (building.inputStorage.length > 0) {
            html += `<div style="margin-top:4px;color:#aaddff;">Input: ${building.inputStorage.map((s) => `${s.amount} ${RESOURCE_META[s.type].label}`).join(", ")}</div>`;
          }
          if (building.outputStorage.length > 0) {
            html += `<div style="color:#aaffaa;">Output: ${building.outputStorage.map((s) => `${s.amount} ${RESOURCE_META[s.type].label}`).join(", ")}</div>`;
          }
          if (building.garrisonSlots > 0) {
            html += `<div style="margin-top:4px;">Garrison: ${building.garrison.length}/${building.garrisonSlots}</div>`;
          }

          // Show chain info
          if (def.inputs.length > 0 || def.outputs.length > 0) {
            html += `<div style="margin-top:6px;color:#888;border-top:1px solid #444;padding-top:4px;">`;
            if (def.inputs.length > 0) html += `Consumes: ${def.inputs.map(i => RESOURCE_META[i.type].label).join(", ")}<br>`;
            if (def.outputs.length > 0) html += `Produces: ${def.outputs.map(o => RESOURCE_META[o.type].label).join(", ")}`;
            html += `</div>`;
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

  private _updateMinimap(state: SettlersState): void {
    const ctx = this._minimapCtx;
    const cw = this._minimap.width;
    const ch = this._minimap.height;
    const map = state.map;
    const sx = cw / map.width;
    const sz = ch / map.height;

    ctx.clearRect(0, 0, cw, ch);

    // Draw terrain biomes
    for (let tz = 0; tz < map.height; tz++) {
      for (let tx = 0; tx < map.width; tx++) {
        const idx = tz * map.width + tx;
        const biome = map.biomes[idx];
        const territory = map.territory[idx];

        let color: string;
        switch (biome) {
          case Biome.WATER: color = "#1a6090"; break;
          case Biome.MEADOW: color = "#5da040"; break;
          case Biome.FOREST: color = "#3a7a2c"; break;
          case Biome.MOUNTAIN: color = "#8a8a7e"; break;
          case Biome.DESERT: color = "#c4a854"; break;
          default: color = "#444"; break;
        }

        ctx.fillStyle = color;
        ctx.fillRect(tx * sx, tz * sz, sx + 0.5, sz + 0.5);

        // Territory tint overlay
        if (territory >= 0) {
          ctx.fillStyle = territory === 0 ? "rgba(51,136,255,0.25)" : "rgba(255,51,51,0.25)";
          ctx.fillRect(tx * sx, tz * sz, sx + 0.5, sz + 0.5);
        }

        // Resource deposit indicators
        const deposit = map.deposits[idx];
        if (deposit !== Deposit.NONE) {
          let dColor: string;
          switch (deposit) {
            case Deposit.IRON: dColor = "#7a4e2e"; break;
            case Deposit.GOLD: dColor = "#ffd700"; break;
            case Deposit.COAL: dColor = "#333"; break;
            case Deposit.STONE: dColor = "#999"; break;
            case Deposit.FISH: dColor = "#5599bb"; break;
            default: dColor = "#fff"; break;
          }
          ctx.fillStyle = dColor;
          ctx.fillRect(tx * sx + 0.5, tz * sz + 0.5, Math.max(1, sx - 1), Math.max(1, sz - 1));
        }
      }
    }

    // Draw buildings
    for (const [, building] of state.buildings) {
      const def = BUILDING_DEFS[building.type];
      ctx.fillStyle = building.owner === "p0" ? "#4488ff" : "#ff4444";
      ctx.fillRect(
        building.tileX * sx,
        building.tileZ * sz,
        def.footprint.w * sx,
        def.footprint.h * sz,
      );
    }

    // Draw soldiers
    for (const [, soldier] of state.soldiers) {
      if (soldier.state === "garrisoned") continue;
      ctx.fillStyle = soldier.owner === "p0" ? "#88bbff" : "#ff8888";
      const stx = soldier.position.x / SB.TILE_SIZE;
      const stz = soldier.position.z / SB.TILE_SIZE;
      ctx.fillRect(stx * sx - 1, stz * sz - 1, 2, 2);
    }
  }

  destroy(): void {
    this._root.remove();
  }
}
