// ---------------------------------------------------------------------------
// Age of Wonders — DOM-based HUD Overlay
// ---------------------------------------------------------------------------

import {
  type AoWGameState, type AoWSpellDef,
} from "../AoWTypes";
import { getFactionDef, getSpellDef, AOW_SPELLS, AOW_TERRAIN } from "../config/AoWConfig";

export class AoWHUD {
  private _container: HTMLDivElement | null = null;
  private _topBar: HTMLDivElement | null = null;
  private _bottomPanel: HTMLDivElement | null = null;
  private _sidePanel: HTMLDivElement | null = null;
  private _logPanel: HTMLDivElement | null = null;
  private _spellPanel: HTMLDivElement | null = null;
  private _combatPanel: HTMLDivElement | null = null;
  private _victoryPanel: HTMLDivElement | null = null;
  private _tooltip: HTMLDivElement | null = null;
  private _minimapCanvas: HTMLCanvasElement | null = null;
  private _minimapCtx: CanvasRenderingContext2D | null = null;

  // Callbacks
  onEndTurn: (() => void) | null = null;
  onCastSpell: ((spell: AoWSpellDef) => void) | null = null;
  onBuyUnit: ((unitId: string, cityId: string) => void) | null = null;
  onExit: (() => void) | null = null;
  onNextArmy: (() => void) | null = null;
  onNextCity: (() => void) | null = null;

  init(): void {
    this._container = document.createElement("div");
    this._container.id = "aow-hud";
    this._container.style.cssText = `
      position:absolute;top:0;left:0;width:100%;height:100%;z-index:15;
      pointer-events:none;font-family:'Segoe UI',monospace;color:#e0d5c0;
      user-select:none;
    `;
    document.body.appendChild(this._container);

    this._createTopBar();
    this._createBottomPanel();
    this._createSidePanel();
    this._createLogPanel();
    this._createSpellPanel();
    this._createTooltip();
    this._createMinimap();
  }

  // ---------------------------------------------------------------------------
  // Top Bar: Resources, turn, faction
  // ---------------------------------------------------------------------------

  private _createTopBar(): void {
    this._topBar = document.createElement("div");
    this._topBar.style.cssText = `
      position:absolute;top:0;left:0;width:100%;height:44px;
      background:linear-gradient(180deg,rgba(10,8,20,0.92),rgba(10,8,20,0.7));
      border-bottom:1px solid rgba(218,165,32,0.3);
      display:flex;align-items:center;justify-content:space-between;
      padding:0 16px;box-sizing:border-box;pointer-events:auto;
      font-size:13px;
    `;
    this._container!.appendChild(this._topBar);
  }

  // ---------------------------------------------------------------------------
  // Bottom Panel: Selected army/city info
  // ---------------------------------------------------------------------------

  private _createBottomPanel(): void {
    this._bottomPanel = document.createElement("div");
    this._bottomPanel.style.cssText = `
      position:absolute;bottom:0;left:0;width:100%;height:140px;
      background:linear-gradient(0deg,rgba(10,8,20,0.92),rgba(10,8,20,0.7));
      border-top:1px solid rgba(218,165,32,0.3);
      display:flex;align-items:flex-start;padding:10px 16px;
      box-sizing:border-box;pointer-events:auto;font-size:12px;
      gap:16px;
    `;
    this._container!.appendChild(this._bottomPanel);
  }

  // ---------------------------------------------------------------------------
  // Side Panel: Minimap placeholder & buttons
  // ---------------------------------------------------------------------------

  private _createSidePanel(): void {
    this._sidePanel = document.createElement("div");
    this._sidePanel.style.cssText = `
      position:absolute;top:50px;right:8px;width:180px;
      background:rgba(10,8,20,0.85);border:1px solid rgba(218,165,32,0.3);
      border-radius:6px;padding:8px;pointer-events:auto;font-size:11px;
    `;
    this._container!.appendChild(this._sidePanel);
  }

  // ---------------------------------------------------------------------------
  // Minimap
  // ---------------------------------------------------------------------------

  private _createMinimap(): void {
    this._minimapCanvas = document.createElement("canvas");
    this._minimapCanvas.width = 150;
    this._minimapCanvas.height = 150;
    this._minimapCanvas.style.cssText = `
      position:absolute;right:8px;bottom:150px;width:150px;height:150px;
      border:1px solid rgba(218,165,32,0.3);border-radius:4px;
      background:rgba(10,8,20,0.85);pointer-events:auto;
    `;
    this._container!.appendChild(this._minimapCanvas);
    this._minimapCtx = this._minimapCanvas.getContext("2d");
  }

  private _updateMinimap(state: AoWGameState): void {
    if (!this._minimapCtx || !this._minimapCanvas) return;
    const ctx = this._minimapCtx;
    const w = this._minimapCanvas.width;
    const h = this._minimapCanvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(10,8,20,1)";
    ctx.fillRect(0, 0, w, h);

    // Calculate bounds from map radius for scaling
    const radius = state.mapRadius;
    // Hex to pixel: x = 3/2 * q, z = sqrt(3)/2 * q + sqrt(3) * r
    // Scale to fit 150x150 with padding
    const pad = 8;
    const usable = w - pad * 2;
    // Max extent in hex coords: about radius * 1.5 for x, radius * sqrt(3) for z
    const maxExtentX = radius * 1.5;
    const maxExtentZ = radius * Math.sqrt(3);
    const scale = Math.min(usable / (maxExtentX * 2), usable / (maxExtentZ * 2));
    const cx = w / 2;
    const cy = h / 2;

    // Draw hexes
    for (const [, hex] of state.hexes) {
      const px = cx + (1.5 * hex.q) * scale;
      const py = cy + (Math.sqrt(3) / 2 * hex.q + Math.sqrt(3) * hex.r) * scale;

      if (px < -5 || px > w + 5 || py < -5 || py > h + 5) continue;

      if (!hex.explored[0]) {
        // Unexplored: dark
        ctx.fillStyle = "#111118";
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }

      // Terrain color
      const tDef = AOW_TERRAIN[hex.terrain];
      const color = tDef.color;
      const r = (color >> 16) & 0xff;
      const g = (color >> 8) & 0xff;
      const b = color & 0xff;
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw cities as squares
    for (const city of state.cities) {
      const px = cx + (1.5 * city.q) * scale;
      const py = cy + (Math.sqrt(3) / 2 * city.q + Math.sqrt(3) * city.r) * scale;

      if (city.playerId >= 0) {
        const fDef = getFactionDef(state.players[city.playerId].faction);
        ctx.fillStyle = fDef.colorHex;
      } else {
        ctx.fillStyle = "#888888";
      }
      ctx.fillRect(px - 3, py - 3, 6, 6);
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(px - 3, py - 3, 6, 6);
    }

    // Draw armies as triangles
    for (const army of state.armies) {
      const hex = state.hexes.get(`${army.q},${army.r}`);
      if (hex && !hex.explored[0] && army.playerId !== 0) continue;

      const px = cx + (1.5 * army.q) * scale;
      const py = cy + (Math.sqrt(3) / 2 * army.q + Math.sqrt(3) * army.r) * scale;

      const fDef = getFactionDef(state.players[army.playerId].faction);
      ctx.fillStyle = fDef.colorHex;
      ctx.beginPath();
      ctx.moveTo(px, py - 4);
      ctx.lineTo(px - 3, py + 3);
      ctx.lineTo(px + 3, py + 3);
      ctx.closePath();
      ctx.fill();
    }

    // Draw viewport rectangle (white)
    // Approximate: show a small white rectangle around center of map for now
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - 18, cy - 12, 36, 24);
  }

  // ---------------------------------------------------------------------------
  // Log Panel
  // ---------------------------------------------------------------------------

  private _createLogPanel(): void {
    this._logPanel = document.createElement("div");
    this._logPanel.style.cssText = `
      position:absolute;top:50px;left:8px;width:260px;max-height:200px;
      background:rgba(10,8,20,0.8);border:1px solid rgba(100,80,60,0.3);
      border-radius:6px;padding:6px 10px;pointer-events:auto;font-size:10px;
      overflow-y:auto;color:#887766;line-height:1.4;
    `;
    this._container!.appendChild(this._logPanel);
  }

  // ---------------------------------------------------------------------------
  // Spell Panel
  // ---------------------------------------------------------------------------

  private _createSpellPanel(): void {
    this._spellPanel = document.createElement("div");
    this._spellPanel.style.cssText = `
      position:absolute;bottom:150px;left:50%;transform:translateX(-50%);
      background:rgba(10,8,20,0.9);border:1px solid rgba(100,50,200,0.4);
      border-radius:8px;padding:8px;pointer-events:auto;font-size:11px;
      display:none;max-width:600px;
    `;
    this._container!.appendChild(this._spellPanel);
  }

  // ---------------------------------------------------------------------------
  // Tooltip
  // ---------------------------------------------------------------------------

  private _createTooltip(): void {
    this._tooltip = document.createElement("div");
    this._tooltip.style.cssText = `
      position:absolute;background:rgba(10,8,20,0.95);
      border:1px solid rgba(218,165,32,0.5);border-radius:4px;
      padding:6px 10px;pointer-events:none;font-size:11px;
      display:none;max-width:250px;z-index:20;color:#e0d5c0;
    `;
    this._container!.appendChild(this._tooltip);
  }

  showTooltip(x: number, y: number, text: string): void {
    if (!this._tooltip) return;
    this._tooltip.innerHTML = text;
    this._tooltip.style.display = "block";
    this._tooltip.style.left = `${x + 12}px`;
    this._tooltip.style.top = `${y + 12}px`;
  }

  hideTooltip(): void {
    if (this._tooltip) this._tooltip.style.display = "none";
  }

  // ---------------------------------------------------------------------------
  // Update HUD with current state
  // ---------------------------------------------------------------------------

  update(state: AoWGameState): void {
    if (!state || !this._container) return;

    const player = state.players[0]; // human player
    const fDef = getFactionDef(player.faction);

    // Top bar
    if (this._topBar) {
      const enemyPlayer = state.players[1];
      const enemyFDef = enemyPlayer ? getFactionDef(enemyPlayer.faction) : null;
      this._topBar.innerHTML = `
        <div style="display:flex;gap:20px;align-items:center">
          <span style="color:${fDef.colorHex};font-weight:bold;font-size:14px">${fDef.name}</span>
          <span style="color:#daa520">Turn ${state.turn}</span>
        </div>
        <div style="display:flex;gap:20px;align-items:center">
          <span title="Gold">&#9733; ${player.gold} <span style="color:#666">(+${player.goldPerTurn})</span></span>
          <span title="Mana" style="color:#88aaff">&#9671; ${player.mana} <span style="color:#666">(+${player.manaPerTurn})</span></span>
          <span style="color:#666">|</span>
          <span style="color:#888">Cities: ${state.cities.filter(c => c.playerId === 0).length}</span>
          <span style="color:#888">Armies: ${state.armies.filter(a => a.playerId === 0).length}</span>
          ${enemyFDef ? `<span style="color:${enemyFDef.colorHex};opacity:0.6">${enemyFDef.name}</span>` : ""}
        </div>
      `;
    }

    // Bottom panel: selected army or hovered city
    this._updateBottomPanel(state);

    // Side panel: buttons
    this._updateSidePanel(state);

    // Log
    this._updateLogPanel(state);

    // Minimap
    this._updateMinimap(state);
  }

  private _updateBottomPanel(state: AoWGameState): void {
    if (!this._bottomPanel) return;

    const selectedArmy = state.selectedArmyId
      ? state.armies.find(a => a.id === state.selectedArmyId)
      : null;

    if (selectedArmy && selectedArmy.playerId === 0) {
      const player = state.players[0];
      const fDef = getFactionDef(player.faction);

      // Calculate total power score
      let totalPower = 0;
      for (const unit of selectedArmy.units) {
        totalPower += unit.attack * (unit.hp / unit.maxHp);
      }

      let unitsHtml = "";
      for (const unit of selectedArmy.units) {
        const hpPct = Math.round((unit.hp / unit.maxHp) * 100);
        const hpColor = hpPct > 60 ? "#4a4" : hpPct > 30 ? "#aa4" : "#a44";
        const xpForNext = unit.level * 100;
        const xpPct = Math.min(100, Math.round((unit.xp / xpForNext) * 100));
        const heroTag = unit.isHero
          ? `<span style="color:${fDef.colorHex};font-weight:bold">&#9813; </span>`
          : "";
        unitsHtml += `
          <div style="min-width:100px;padding:4px 8px;background:rgba(40,35,30,0.6);border:1px solid rgba(100,80,60,0.3);border-radius:4px;position:relative;overflow:hidden">
            <div style="position:absolute;top:0;left:0;width:${hpPct}%;height:100%;background:${hpColor};opacity:0.12;pointer-events:none"></div>
            ${heroTag}<b style="color:#ddd">${unit.isHero ? unit.heroName : unit.defId.replace(/^[a-z]+_/, "")}</b>
            <div style="margin-top:2px">
              <span style="color:${hpColor}">HP ${unit.hp}/${unit.maxHp}</span>
              <span style="color:#888"> ATK ${unit.attack} DEF ${unit.defense}</span>
            </div>
            <div style="height:3px;background:rgba(30,30,30,0.8);margin-top:2px;border-radius:1px">
              <div style="height:100%;width:${xpPct}%;background:#8866cc;border-radius:1px"></div>
            </div>
            <div style="color:#666;font-size:9px">Lv${unit.level} XP ${unit.xp}/${xpForNext} ${unit.abilities.join(", ")}</div>
          </div>
        `;
      }

      this._bottomPanel.innerHTML = `
        <div>
          <div style="font-weight:bold;color:${fDef.colorHex};margin-bottom:4px">
            Army (${selectedArmy.units.length} units)
          </div>
          <div style="color:#888;font-size:10px">
            Movement: ${selectedArmy.movementLeft}/${selectedArmy.maxMovement}
          </div>
          <div style="color:#aa8844;font-size:10px;margin-top:2px">
            Power: ${totalPower.toFixed(1)}
          </div>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;overflow-x:auto">
          ${unitsHtml}
        </div>
      `;
    } else {
      // Show hovered hex info or general info
      if (state.hoveredHex) {
        const hex = state.hexes.get(`${state.hoveredHex.q},${state.hoveredHex.r}`);
        if (hex) {
          const city = hex.cityId ? state.cities.find(c => c.id === hex.cityId) : null;
          const armyHere = state.armies.find(a => a.q === hex.q && a.r === hex.r);

          let info = `<b style="color:#ddd">${hex.terrain.toUpperCase()}</b> (${hex.q}, ${hex.r})`;
          if (hex.decoration !== "none") info += ` — ${hex.decoration}`;
          if (city) {
            const owner = city.playerId >= 0 ? state.players[city.playerId].name : "Neutral";
            info += `<br><span style="color:#daa520">City: ${city.name}</span> (${owner}, pop ${city.population})`;
          }
          if (armyHere) {
            const owner = state.players[armyHere.playerId]?.name || "Unknown";
            info += `<br>Army: ${armyHere.units.length} units (${owner})`;
          }

          this._bottomPanel.innerHTML = `<div>${info}</div>`;
        }
      } else {
        this._bottomPanel.innerHTML = `<div style="color:#666">Select an army or hover over the map</div>`;
      }
    }
  }

  private _updateSidePanel(state: AoWGameState): void {
    if (!this._sidePanel) return;

    const player = state.players[0];
    const hasResearch = player.currentResearch !== null;

    this._sidePanel.innerHTML = `
      <div style="margin-bottom:8px;font-weight:bold;color:#daa520;text-align:center">COMMANDS</div>

      <button id="aow-end-turn" style="${this._btnStyle("#daa520")}">
        END TURN
      </button>

      <button id="aow-next-army" style="${this._btnStyle("#88aa44")}; margin-top:4px">
        NEXT ARMY (Tab)
      </button>

      <button id="aow-spell-book" style="${this._btnStyle("#8855cc")}; margin-top:4px">
        SPELL BOOK (B)
      </button>

      <button id="aow-next-city" style="${this._btnStyle("#44aacc")}; margin-top:4px">
        NEXT CITY (C)
      </button>

      ${hasResearch ? `
        <div style="margin-top:8px;padding:4px;background:rgba(100,50,200,0.15);border-radius:4px">
          <div style="color:#8855cc;font-size:10px">Researching:</div>
          <div style="color:#aa88dd">${player.currentResearch}</div>
          <div style="color:#666;font-size:9px">${player.researchProgress}/30</div>
        </div>
      ` : ""}

      <div style="margin-top:10px;border-top:1px solid rgba(100,80,60,0.3);padding-top:6px">
        <div style="color:#666;font-size:10px;text-align:center">CONTROLS</div>
        <div style="color:#555;font-size:9px;line-height:1.6;margin-top:4px">
          WASD — pan camera<br>
          Q/E — rotate camera<br>
          Scroll — zoom<br>
          Click — select army<br>
          Right-click — move/attack<br>
          Tab — next army<br>
          C — next city<br>
          B — spell book<br>
          H — heal army<br>
          1-5 — quick cast spell<br>
          ESC — deselect
        </div>
      </div>

      <button id="aow-exit" style="${this._btnStyle("#884444")}; margin-top:10px">
        EXIT
      </button>
    `;

    // Wire up buttons
    const endTurnBtn = document.getElementById("aow-end-turn");
    if (endTurnBtn) {
      endTurnBtn.onclick = () => this.onEndTurn?.();
    }

    const nextArmyBtn = document.getElementById("aow-next-army");
    if (nextArmyBtn) {
      nextArmyBtn.onclick = () => this.onNextArmy?.();
    }

    const spellBtn = document.getElementById("aow-spell-book");
    if (spellBtn) {
      spellBtn.onclick = () => this._toggleSpellBook(state);
    }

    const nextCityBtn = document.getElementById("aow-next-city");
    if (nextCityBtn) {
      nextCityBtn.onclick = () => this.onNextCity?.();
    }

    const exitBtn = document.getElementById("aow-exit");
    if (exitBtn) {
      exitBtn.onclick = () => this.onExit?.();
    }
  }

  private _updateLogPanel(state: AoWGameState): void {
    if (!this._logPanel) return;
    const recent = state.log.slice(-15);
    this._logPanel.innerHTML = recent.map(l => `<div>${l}</div>`).join("");
    this._logPanel.scrollTop = this._logPanel.scrollHeight;
  }

  // ---------------------------------------------------------------------------
  // Spell book
  // ---------------------------------------------------------------------------

  private _toggleSpellBook(state: AoWGameState): void {
    if (!this._spellPanel) return;
    const visible = this._spellPanel.style.display !== "none";
    if (visible) {
      this._spellPanel.style.display = "none";
      return;
    }

    const player = state.players[0];
    const researched = player.researchedSpells;
    const available = AOW_SPELLS.filter(s => researched.includes(s.id));
    const locked = AOW_SPELLS.filter(s => !researched.includes(s.id));

    let html = `<div style="font-weight:bold;color:#8855cc;margin-bottom:8px;text-align:center">SPELL BOOK</div>`;
    html += `<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center">`;

    for (let i = 0; i < available.length; i++) {
      const spell = available[i];
      const affordable = player.mana >= spell.manaCost;
      const domainColor = this._getDomainColor(spell.domain);
      const targetLabel = spell.targetType.toUpperCase();
      const hotkeyLabel = i < 5 ? `<span style="color:#555;font-size:8px">[${i + 1}]</span> ` : "";
      html += `
        <button class="aow-spell-btn" data-spell="${spell.id}" style="
          padding:6px 10px;border:1px solid ${domainColor};border-radius:4px;
          background:rgba(20,15,30,0.8);color:${affordable ? "#ddd" : "#555"};
          cursor:${affordable ? "pointer" : "not-allowed"};font-family:inherit;
          font-size:10px;text-align:left;min-width:120px;
          opacity:${affordable ? "1" : "0.5"};
          pointer-events:auto;position:relative;
        ">
          <div style="color:${domainColor};font-weight:bold">${hotkeyLabel}${spell.name}</div>
          <div style="color:#888;font-size:9px">${spell.domain} — ${spell.manaCost} mana — <span style="color:#666">${targetLabel}</span></div>
        </button>
      `;
    }

    html += `</div>`;

    if (locked.length > 0) {
      html += `<div style="margin-top:8px;color:#444;font-size:9px;text-align:center">
        ${locked.length} spells locked (research to unlock)
      </div>`;
    }

    this._spellPanel.innerHTML = html;
    this._spellPanel.style.display = "block";

    // Wire spell buttons with hover tooltip
    const btns = this._spellPanel.querySelectorAll(".aow-spell-btn");
    btns.forEach(btn => {
      const el = btn as HTMLElement;
      el.onclick = () => {
        const spellId = el.dataset.spell;
        if (spellId) {
          const spell = getSpellDef(spellId);
          if (spell) {
            this.onCastSpell?.(spell);
            this._spellPanel!.style.display = "none";
          }
        }
      };
      el.onmouseenter = (e: MouseEvent) => {
        const spellId = el.dataset.spell;
        if (spellId) {
          const spell = getSpellDef(spellId);
          if (spell) {
            this.showTooltip(e.clientX, e.clientY, `<b>${spell.name}</b><br><span style="color:#aaa">${spell.description}</span>`);
          }
        }
      };
      el.onmouseleave = () => {
        this.hideTooltip();
      };
    });
  }

  private _getDomainColor(domain: string): string {
    switch (domain) {
      case "fire": return "#ff4400";
      case "ice": return "#44aaff";
      case "life": return "#44ff44";
      case "death": return "#aa44aa";
      case "earth": return "#aa8844";
      case "arcane": return "#aa88ff";
      default: return "#888";
    }
  }

  // ---------------------------------------------------------------------------
  // Combat panel
  // ---------------------------------------------------------------------------

  showCombatResult(log: string[], result: string, attackerBefore?: number, attackerAfter?: number, defenderBefore?: number, defenderAfter?: number): void {
    if (this._combatPanel) {
      this._container?.removeChild(this._combatPanel);
    }

    this._combatPanel = document.createElement("div");
    this._combatPanel.style.cssText = `
      position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
      background:rgba(10,8,20,0.95);border:2px solid rgba(218,165,32,0.5);
      border-radius:10px;padding:20px;pointer-events:auto;font-size:12px;
      max-width:400px;max-height:60vh;overflow-y:auto;text-align:center;
    `;

    const resultColor = result === "attacker_wins" ? "#4a4" : result === "defender_wins" ? "#a44" : "#aa4";
    const resultText = result === "attacker_wins" ? "VICTORY!" : result === "defender_wins" ? "DEFEAT!" : "DRAW";

    // Color-code log entries: kills in red, survivors in green
    const coloredLog = log.map(l => {
      if (l.includes("killed") || l.includes("destroyed") || l.includes("slain") || l.includes("fell")) {
        return `<div style="color:#cc4444">${l}</div>`;
      } else if (l.includes("survived") || l.includes("healed") || l.includes("victory")) {
        return `<div style="color:#44cc44">${l}</div>`;
      }
      return `<div>${l}</div>`;
    }).join("");

    // Summary line
    let summaryHtml = "";
    if (attackerBefore !== undefined && attackerAfter !== undefined &&
        defenderBefore !== undefined && defenderAfter !== undefined) {
      summaryHtml = `
        <div style="margin-bottom:8px;font-size:11px;padding:4px 8px;background:rgba(40,35,30,0.5);border-radius:4px">
          Attacker: <span style="color:#4a4">${attackerAfter}</span>/<span style="color:#888">${attackerBefore}</span> survived |
          Defender: <span style="color:#4a4">${defenderAfter}</span>/<span style="color:#888">${defenderBefore}</span> survived
        </div>
      `;
    }

    this._combatPanel.innerHTML = `
      <div style="font-size:22px;font-weight:bold;color:${resultColor};margin-bottom:10px">${resultText}</div>
      ${summaryHtml}
      <div style="text-align:left;color:#887766;line-height:1.5;max-height:200px;overflow-y:auto;margin-bottom:12px;font-size:10px">
        ${coloredLog}
      </div>
      <button id="aow-combat-close" style="${this._btnStyle("#daa520")}">
        CONTINUE
      </button>
    `;
    this._container!.appendChild(this._combatPanel);

    document.getElementById("aow-combat-close")!.onclick = () => {
      this._container?.removeChild(this._combatPanel!);
      this._combatPanel = null;
    };
  }

  // ---------------------------------------------------------------------------
  // Victory / Defeat
  // ---------------------------------------------------------------------------

  showVictory(message: string): void {
    if (this._victoryPanel) return;

    this._victoryPanel = document.createElement("div");
    this._victoryPanel.style.cssText = `
      position:absolute;top:0;left:0;width:100%;height:100%;
      background:rgba(5,4,10,0.85);display:flex;flex-direction:column;
      align-items:center;justify-content:center;pointer-events:auto;
      z-index:25;
    `;

    this._victoryPanel.innerHTML = `
      <div style="font-size:48px;font-weight:bold;color:#daa520;text-shadow:0 0 30px rgba(218,165,32,0.5);margin-bottom:10px">
        ${message.includes("DEFEAT") ? "DEFEAT" : "VICTORY"}
      </div>
      <div style="font-size:16px;color:#887766;margin-bottom:30px">${message}</div>
      <button id="aow-victory-exit" style="${this._btnStyle("#daa520")}; font-size:16px; padding:12px 32px">
        RETURN TO MENU
      </button>
    `;
    this._container!.appendChild(this._victoryPanel);

    document.getElementById("aow-victory-exit")!.onclick = () => this.onExit?.();
  }

  // ---------------------------------------------------------------------------
  // Utility
  // ---------------------------------------------------------------------------

  private _btnStyle(color: string): string {
    return `
      display:block;width:100%;padding:6px 12px;border:1px solid ${color};
      border-radius:4px;background:rgba(20,15,10,0.6);color:${color};
      cursor:pointer;font-family:inherit;font-size:11px;font-weight:bold;
      letter-spacing:1px;text-align:center;
    `;
  }

  destroy(): void {
    if (this._container && this._container.parentElement) {
      this._container.parentElement.removeChild(this._container);
    }
    this._container = null;
  }
}
