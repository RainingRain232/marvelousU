// ---------------------------------------------------------------------------
// Age of Wonders — Main Game Class
// ---------------------------------------------------------------------------

import { viewManager } from "../view/ViewManager";
import type { Ticker } from "pixi.js";
import {
  AoWPhase, AoWFaction,
  type AoWGameState, type AoWArmy, type AoWCity, type AoWSpellDef,
  hexKey, hexDistance, hexNeighbors, hexToWorld,
} from "./AoWTypes";
import { AOW_TERRAIN, AOW_FACTIONS, AOW_BALANCE, AOW_SPELLS, getUnitsForFaction, getSpellDef } from "./config/AoWConfig";
import { createAoWGameState, revealHexes, createUnit } from "./state/AoWState";
import { AoWCombatSystem } from "./systems/AoWCombatSystem";
import { AoWAISystem } from "./systems/AoWAISystem";
import { AoWSceneManager } from "./view/AoWSceneManager";
import { AoWHexRenderer } from "./view/AoWHexRenderer";
import { AoWUnitRenderer } from "./view/AoWUnitRenderer";
import { AoWFXManager } from "./view/AoWFXManager";
import { AoWHUD } from "./view/AoWHUD";
import { aowAudio } from "./view/AoWAudioManager";

export class AoWGame {
  private _state: AoWGameState | null = null;
  private _tickerCb: ((ticker: Ticker) => void) | null = null;

  // Systems
  private _combatSystem = new AoWCombatSystem();
  private _aiSystem = new AoWAISystem();

  // View
  private _sceneManager!: AoWSceneManager;
  private _hexRenderer!: AoWHexRenderer;
  private _unitRenderer!: AoWUnitRenderer;
  private _fxManager!: AoWFXManager;
  private _hud!: AoWHUD;
  private _battleAnimator: import("./view/AoWBattleAnimator").AoWBattleAnimator | null = null;

  // Input
  private _keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private _mouseHandler: ((e: MouseEvent) => void) | null = null;
  private _contextHandler: ((e: MouseEvent) => void) | null = null;
  private _wheelHandler: ((e: WheelEvent) => void) | null = null;
  private _moveHandler: ((e: MouseEvent) => void) | null = null;

  // Faction select
  private _factionSelectDiv: HTMLDivElement | null = null;

  // Camera key state
  private _keys: Record<string, boolean> = {};

  // Cycling indices for hotkeys
  private _armyCycleIdx = 0;
  private _cityCycleIdx = 0;

  // ---------------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------------

  async boot(): Promise<void> {
    viewManager.clearWorld();
    this._showFactionSelect();
  }

  // ---------------------------------------------------------------------------
  // Faction selection screen
  // ---------------------------------------------------------------------------

  private _showFactionSelect(): void {
    this._factionSelectDiv = document.createElement("div");
    this._factionSelectDiv.style.cssText = `
      position:absolute;top:0;left:0;width:100%;height:100%;z-index:30;
      background:rgba(5,4,15,0.97);display:flex;flex-direction:column;
      align-items:center;justify-content:center;font-family:'Segoe UI',monospace;color:#e0d5c0;
    `;

    this._factionSelectDiv.innerHTML = `
      <div style="font-size:11px;letter-spacing:8px;color:#553388;margin-bottom:8px">3D</div>
      <h1 style="font-size:42px;color:#daa520;text-shadow:0 0 30px rgba(218,165,32,0.4);margin:0 0 4px;letter-spacing:4px">
        AGE OF WONDERS
      </h1>
      <div style="width:250px;height:2px;background:linear-gradient(90deg,transparent,#daa520,transparent);margin-bottom:6px"></div>
      <p style="color:#887755;margin-bottom:30px;font-size:14px">Choose your faction to begin</p>

      <div style="display:flex;flex-wrap:wrap;gap:14px;max-width:700px;justify-content:center">
        ${AOW_FACTIONS.map(f => `
          <button class="aow-faction-btn" data-faction="${f.id}" style="
            width:150px;padding:16px 12px;border:2px solid ${f.colorHex};border-radius:10px;
            background:rgba(20,15,25,0.8);color:${f.colorHex};cursor:pointer;
            font-family:inherit;font-size:14px;font-weight:bold;
            transition:all 0.2s;text-align:center;
          ">
            ${f.name}
            <span style="display:block;font-size:10px;color:#887766;margin-top:4px;font-weight:normal">${f.title}</span>
            <span style="display:block;font-size:9px;color:#665544;margin-top:6px;font-weight:normal;line-height:1.3">
              ${f.bonuses.join("<br>")}
            </span>
          </button>
        `).join("")}
      </div>

      <p style="color:#443355;margin-top:30px;font-size:11px;max-width:500px;text-align:center;line-height:1.5">
        Conquer all enemy cities or discover the Holy Grail to win.
        Lead your hero, recruit armies, cast powerful spells, and dominate the realm!
      </p>

      <button id="aow-back-btn" style="
        margin-top:20px;padding:8px 24px;border:1px solid #553333;border-radius:6px;
        background:rgba(20,15,10,0.6);color:#884444;cursor:pointer;
        font-family:inherit;font-size:12px;
      ">BACK TO MENU</button>
    `;

    document.body.appendChild(this._factionSelectDiv);

    // Wire buttons
    const btns = this._factionSelectDiv.querySelectorAll(".aow-faction-btn");
    btns.forEach(btn => {
      (btn as HTMLElement).onmouseenter = () => {
        (btn as HTMLElement).style.background = "rgba(40,30,50,0.9)";
        (btn as HTMLElement).style.transform = "scale(1.05)";
      };
      (btn as HTMLElement).onmouseleave = () => {
        (btn as HTMLElement).style.background = "rgba(20,15,25,0.8)";
        (btn as HTMLElement).style.transform = "scale(1)";
      };
      (btn as HTMLElement).onclick = () => {
        const faction = (btn as HTMLElement).dataset.faction as AoWFaction;
        this._startGame(faction);
      };
    });

    document.getElementById("aow-back-btn")!.onclick = () => {
      this._removeFactionSelect();
      window.dispatchEvent(new Event("aowExit"));
    };
  }

  private _removeFactionSelect(): void {
    if (this._factionSelectDiv && this._factionSelectDiv.parentElement) {
      this._factionSelectDiv.parentElement.removeChild(this._factionSelectDiv);
    }
    this._factionSelectDiv = null;
  }

  // ---------------------------------------------------------------------------
  // Start game
  // ---------------------------------------------------------------------------

  private _startGame(playerFaction: AoWFaction): void {
    this._removeFactionSelect();

    // Pick AI faction (different from player)
    const aiFactions = Object.values(AoWFaction).filter(f => f !== playerFaction);
    const aiFaction = aiFactions[Math.floor(Math.random() * aiFactions.length)];

    // Create state
    this._state = createAoWGameState(playerFaction, aiFaction, AOW_BALANCE.MAP_RADIUS_MEDIUM);

    // Init 3D scene
    this._sceneManager = new AoWSceneManager();
    this._sceneManager.init();

    this._hexRenderer = new AoWHexRenderer(this._sceneManager);
    this._unitRenderer = new AoWUnitRenderer(this._sceneManager);
    this._fxManager = new AoWFXManager(this._sceneManager);

    // Build map
    this._hexRenderer.buildMap(this._state);
    this._unitRenderer.updateArmies(this._state);

    // Center camera on player capital
    const playerCity = this._state.cities.find(c => c.playerId === 0);
    if (playerCity) {
      const pos = hexToWorld(playerCity.q, playerCity.r, 0);
      this._sceneManager.setCameraTarget(pos.x, 0, pos.z);
    }

    // Init HUD
    this._hud = new AoWHUD();
    this._hud.init();
    this._hud.onEndTurn = () => this._endTurn();
    this._hud.onCastSpell = (spell) => this._startCastSpell(spell);
    this._hud.onExit = () => this._exitGame();
    this._hud.onNextArmy = () => this._cycleNextArmy();
    this._hud.onNextCity = () => this._cycleNextCity();
    this._hud.update(this._state);

    // Input
    this._setupInput();

    // Game loop
    this._tickerCb = (ticker: Ticker) => this._gameLoop(ticker.deltaMS / 1000);
    viewManager.app.ticker.add(this._tickerCb);

    this._state.log.push("Welcome to the Age of Wonders! Select your army and explore the realm.");

    // Start ambient music
    aowAudio.startAmbient();
  }

  // ---------------------------------------------------------------------------
  // Game loop
  // ---------------------------------------------------------------------------

  private _gameLoop(dt: number): void {
    if (!this._state) return;

    // Battle animation mode
    if (this._battleAnimator) {
      this._battleAnimator.tick(dt / 60); // dt is in frames, convert to seconds
      this._sceneManager.render();
      return;
    }

    // Camera movement from keys
    const panSpeed = 0.15;
    if (this._keys["w"] || this._keys["arrowup"]) this._sceneManager.panCamera(0, -panSpeed);
    if (this._keys["s"] || this._keys["arrowdown"]) this._sceneManager.panCamera(0, panSpeed);
    if (this._keys["a"] || this._keys["arrowleft"]) this._sceneManager.panCamera(-panSpeed, 0);
    if (this._keys["d"] || this._keys["arrowright"]) this._sceneManager.panCamera(panSpeed, 0);
    if (this._keys["q"]) this._sceneManager.rotateCamera(-0.02);
    if (this._keys["e"]) this._sceneManager.rotateCamera(0.02);

    // Update visuals
    this._sceneManager.tick(dt);
    this._unitRenderer.tick(dt);
    this._hexRenderer.tick(dt);
    this._fxManager.tick(dt);

    // Render
    this._sceneManager.render();
  }

  // ---------------------------------------------------------------------------
  // Input setup
  // ---------------------------------------------------------------------------

  private _setupInput(): void {
    this._keyHandler = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (e.type === "keydown") {
        this._keys[key] = true;
        if (key === "escape") this._deselect();
        if (key === " ") this._endTurn();
        if (key === "tab") { e.preventDefault(); this._cycleNextArmy(); }
        if (key === "c") this._cycleNextCity();
        if (key === "b") this._openSpellBook();
        if (key === "h") this._hotkeyHealArmy();
        if (key === "1" || key === "2" || key === "3" || key === "4" || key === "5") {
          this._quickCastSpell(parseInt(key) - 1);
        }
      } else {
        this._keys[key] = false;
      }
    };
    window.addEventListener("keydown", this._keyHandler);
    window.addEventListener("keyup", this._keyHandler);

    this._mouseHandler = (e: MouseEvent) => this._onClick(e);
    this._sceneManager.canvas.addEventListener("click", this._mouseHandler);

    this._contextHandler = (e: MouseEvent) => {
      e.preventDefault();
      this._onRightClick(e);
    };
    this._sceneManager.canvas.addEventListener("contextmenu", this._contextHandler);

    this._wheelHandler = (e: WheelEvent) => {
      e.preventDefault();
      this._sceneManager.zoomCamera(e.deltaY * 0.01);
    };
    this._sceneManager.canvas.addEventListener("wheel", this._wheelHandler, { passive: false });

    this._moveHandler = (e: MouseEvent) => this._onMouseMove(e);
    this._sceneManager.canvas.addEventListener("mousemove", this._moveHandler);
  }

  // ---------------------------------------------------------------------------
  // Mouse interactions
  // ---------------------------------------------------------------------------

  private _worldToHex(worldX: number, worldZ: number): { q: number; r: number } | null {
    // Inverse of hexToWorld
    const size = 1.0;
    const q = (2 / 3 * worldX) / size;
    const r = (-1 / 3 * worldX + Math.sqrt(3) / 3 * worldZ) / size;

    // Round to nearest hex
    let rq = Math.round(q);
    let rr = Math.round(r);
    const rs = Math.round(-q - r);

    const dq = Math.abs(rq - q);
    const dr = Math.abs(rr - r);
    const ds = Math.abs(rs - (-q - r));

    if (dq > dr && dq > ds) rq = -rr - rs;
    else if (dr > ds) rr = -rq - rs;

    if (this._state?.hexes.has(hexKey(rq, rr))) {
      return { q: rq, r: rr };
    }
    return null;
  }

  private _onClick(e: MouseEvent): void {
    if (!this._state || this._state.currentPlayer !== 0) return;

    const worldPos = this._sceneManager.screenToWorld(e.clientX, e.clientY);
    if (!worldPos) return;

    const hex = this._worldToHex(worldPos.x, worldPos.z);
    if (!hex) return;

    const hexData = this._state.hexes.get(hexKey(hex.q, hex.r));
    if (!hexData || !hexData.explored[0]) return;

    // Spell targeting
    if (this._state.castingSpell) {
      this._resolveSpell(this._state.castingSpell, hex.q, hex.r);
      return;
    }

    // Check if clicking on own army
    const army = this._state.armies.find(
      a => a.playerId === 0 && a.q === hex.q && a.r === hex.r,
    );
    if (army) {
      this._state.selectedArmyId = army.id;
      this._state.log.push(`Selected army at (${hex.q}, ${hex.r})`);
      aowAudio.playSelect();
      this._hud.update(this._state);
      this._unitRenderer.updateArmies(this._state);
      return;
    }

    // Check if clicking on own city (show buy menu)
    const city = this._state.cities.find(
      c => c.playerId === 0 && c.q === hex.q && c.r === hex.r,
    );
    if (city) {
      this._showCityMenu(city);
      return;
    }
  }

  private _onRightClick(e: MouseEvent): void {
    if (!this._state || this._state.currentPlayer !== 0) return;
    if (!this._state.selectedArmyId) return;

    const worldPos = this._sceneManager.screenToWorld(e.clientX, e.clientY);
    if (!worldPos) return;

    const hex = this._worldToHex(worldPos.x, worldPos.z);
    if (!hex) return;

    const army = this._state.armies.find(a => a.id === this._state!.selectedArmyId);
    if (!army) return;

    // Try to move army toward target hex
    this._moveArmy(army, hex.q, hex.r);
  }

  private _onMouseMove(e: MouseEvent): void {
    if (!this._state) return;

    const worldPos = this._sceneManager.screenToWorld(e.clientX, e.clientY);
    if (!worldPos) return;

    const hex = this._worldToHex(worldPos.x, worldPos.z);
    if (!hex) return;

    const hexData = this._state.hexes.get(hexKey(hex.q, hex.r));
    if (!hexData) return;

    this._state.hoveredHex = hex;

    if (hexData.explored[0]) {
      this._hexRenderer.setHighlight(hex.q, hex.r, hexData.elevation);

      // Show move path if army selected
      if (this._state.selectedArmyId) {
        const army = this._state.armies.find(a => a.id === this._state!.selectedArmyId);
        if (army && (army.q !== hex.q || army.r !== hex.r)) {
          const path = this._findPath(army.q, army.r, hex.q, hex.r);
          if (path.length > 0) {
            this._hexRenderer.showPath(path, this._state.hexes);
          }
        }
      }
    } else {
      this._hexRenderer.clearHighlight();
    }

    // Update HUD for hover info
    this._hud.update(this._state);
  }

  private _deselect(): void {
    if (!this._state) return;
    this._state.selectedArmyId = null;
    this._state.castingSpell = null;
    this._hexRenderer.clearPath();
    this._unitRenderer.updateArmies(this._state);
    this._hud.update(this._state);
  }

  private _cycleNextArmy(): void {
    if (!this._state || this._state.phase !== AoWPhase.PLAYING) return;
    const playerArmies = this._state.armies.filter(a => a.playerId === 0);
    if (playerArmies.length === 0) return;
    this._armyCycleIdx = this._armyCycleIdx % playerArmies.length;
    const army = playerArmies[this._armyCycleIdx];
    this._armyCycleIdx = (this._armyCycleIdx + 1) % playerArmies.length;
    this._state.selectedArmyId = army.id;
    const pos = hexToWorld(army.q, army.r, 0);
    this._sceneManager.setCameraTarget(pos.x, 0, pos.z);
    this._unitRenderer.updateArmies(this._state);
    this._hud.update(this._state);
  }

  private _cycleNextCity(): void {
    if (!this._state || this._state.phase !== AoWPhase.PLAYING) return;
    const playerCities = this._state.cities.filter(c => c.playerId === 0);
    if (playerCities.length === 0) return;
    this._cityCycleIdx = this._cityCycleIdx % playerCities.length;
    const city = playerCities[this._cityCycleIdx];
    this._cityCycleIdx = (this._cityCycleIdx + 1) % playerCities.length;
    const pos = hexToWorld(city.q, city.r, 0);
    this._sceneManager.setCameraTarget(pos.x, 0, pos.z);
    this._showCityMenu(city);
  }

  private _openSpellBook(): void {
    if (!this._state || this._state.phase !== AoWPhase.PLAYING) return;
    // Trigger spell book via a dummy spell selection flow — open the panel
    // We just need to trigger the HUD's spell book toggle. We'll use
    // _startCastSpell with a null-like approach: show the spell panel via HUD callback
    // Actually, the simplest approach: simulate clicking the spell book button
    const spellBtn = document.getElementById("aow-spell-book");
    if (spellBtn) spellBtn.click();
  }

  private _quickCastSpell(index: number): void {
    if (!this._state || this._state.phase !== AoWPhase.PLAYING) return;
    const player = this._state.players[0];
    const researched = player.researchedSpells;
    const available = AOW_SPELLS.filter(s => researched.includes(s.id));
    if (index >= available.length) return;
    const spell = available[index];
    if (player.mana < spell.manaCost) {
      this._state.log.push(`Not enough mana for ${spell.name}!`);
      this._hud.update(this._state);
      return;
    }
    this._startCastSpell(spell);
  }

  private _hotkeyHealArmy(): void {
    if (!this._state || this._state.phase !== AoWPhase.PLAYING) return;
    if (!this._state.selectedArmyId) {
      this._state.log.push("Select an army first to heal.");
      this._hud.update(this._state);
      return;
    }
    const player = this._state.players[0];
    if (!player.researchedSpells.includes("heal")) {
      this._state.log.push("Heal spell not researched yet!");
      this._hud.update(this._state);
      return;
    }
    const healSpell = getSpellDef("heal");
    if (!healSpell) return;
    if (player.mana < healSpell.manaCost) {
      this._state.log.push("Not enough mana to heal!");
      this._hud.update(this._state);
      return;
    }
    const army = this._state.armies.find(a => a.id === this._state!.selectedArmyId);
    if (!army || army.playerId !== 0) return;
    this._resolveSpell(healSpell, army.q, army.r);
  }

  // ---------------------------------------------------------------------------
  // Army movement with pathfinding
  // ---------------------------------------------------------------------------

  private _findPath(fromQ: number, fromR: number, toQ: number, toR: number): { q: number; r: number }[] {
    if (!this._state) return [];

    // A* on hex grid with proper parent tracking
    const openSet = new Map<string, { q: number; r: number; g: number; f: number }>();
    const closedSet = new Set<string>();
    const parentMap = new Map<string, string>(); // child -> parent
    const startKey = hexKey(fromQ, fromR);
    const endKey = hexKey(toQ, toR);

    openSet.set(startKey, { q: fromQ, r: fromR, g: 0, f: hexDistance(fromQ, fromR, toQ, toR) });

    let iterations = 0;
    while (openSet.size > 0) {
      if (++iterations > 500) break; // safety limit

      // Find lowest f
      let bestKey = "";
      let bestF = Infinity;
      for (const [k, n] of openSet) {
        if (n.f < bestF) { bestF = n.f; bestKey = k; }
      }

      const current = openSet.get(bestKey)!;
      openSet.delete(bestKey);
      closedSet.add(bestKey);

      if (bestKey === endKey) {
        // Reconstruct path from endKey back to startKey
        const path: { q: number; r: number }[] = [];
        let ck: string | null = endKey;
        while (ck && ck !== startKey) {
          const parts = ck.split(",").map(Number);
          path.unshift({ q: parts[0], r: parts[1] });
          ck = parentMap.get(ck) ?? null;
        }
        return path;
      }

      const neighbors = hexNeighbors(current.q, current.r);
      for (const [nq, nr] of neighbors) {
        const nk = hexKey(nq, nr);
        if (closedSet.has(nk)) continue;

        const hex = this._state.hexes.get(nk);
        if (!hex) continue;
        const tDef = AOW_TERRAIN[hex.terrain];
        if (!tDef.passable) continue;

        const g = current.g + tDef.moveCost;
        const f = g + hexDistance(nq, nr, toQ, toR);

        const existing = openSet.get(nk);
        if (!existing || g < existing.g) {
          openSet.set(nk, { q: nq, r: nr, g, f });
          parentMap.set(nk, bestKey);
        }
      }
    }

    return this._simplePath(fromQ, fromR, toQ, toR);
  }

  /** Simple greedy path for display purposes */
  private _simplePath(fromQ: number, fromR: number, toQ: number, toR: number): { q: number; r: number }[] {
    if (!this._state) return [];
    const path: { q: number; r: number }[] = [];
    let cq = fromQ, cr = fromR;

    for (let step = 0; step < 20; step++) {
      if (cq === toQ && cr === toR) break;

      const neighbors = hexNeighbors(cq, cr);
      let bestN: [number, number] | null = null;
      let bestD = hexDistance(cq, cr, toQ, toR);

      for (const [nq, nr] of neighbors) {
        const hex = this._state.hexes.get(hexKey(nq, nr));
        if (!hex || !AOW_TERRAIN[hex.terrain].passable) continue;
        const d = hexDistance(nq, nr, toQ, toR);
        if (d < bestD) {
          bestD = d;
          bestN = [nq, nr];
        }
      }

      if (!bestN) break;
      cq = bestN[0];
      cr = bestN[1];
      path.push({ q: cq, r: cr });
    }

    return path;
  }

  private _moveArmy(army: AoWArmy, targetQ: number, targetR: number): void {
    if (!this._state) return;

    const path = this._findPath(army.q, army.r, targetQ, targetR);
    if (path.length === 0) return;
    aowAudio.playMove();

    let movesLeft = army.movementLeft;

    for (const step of path) {
      const hex = this._state.hexes.get(hexKey(step.q, step.r));
      if (!hex) break;

      const cost = AOW_TERRAIN[hex.terrain].moveCost;
      if (cost > movesLeft) break;
      movesLeft -= cost;

      army.q = step.q;
      army.r = step.r;

      // Reveal fog
      revealHexes(this._state.hexes, army.q, army.r, 2, 0);
      this._hexRenderer.updateFog(this._state);

      // Check for enemy army combat
      const enemyArmy = this._state.armies.find(
        a => a.playerId !== 0 && a.q === army.q && a.r === army.r,
      );
      if (enemyArmy) {
        this._initCombat(army, enemyArmy, null);
        break;
      }

      // Check for city capture
      const enemyCity = this._state.cities.find(
        c => c.playerId !== 0 && c.q === army.q && c.r === army.r,
      );
      if (enemyCity) {
        if (enemyCity.garrisonUnits.length > 0) {
          this._initCombat(army, null, enemyCity);
        } else {
          // Capture undefended city
          const prevOwner = enemyCity.playerId;
          if (prevOwner >= 0) {
            this._state.players[prevOwner].goldPerTurn -= enemyCity.goldPerTurn;
            this._state.players[prevOwner].manaPerTurn -= enemyCity.manaPerTurn;
          }
          enemyCity.playerId = 0;
          this._state.players[0].goldPerTurn += enemyCity.goldPerTurn;
          this._state.players[0].manaPerTurn += enemyCity.manaPerTurn;
          this._state.log.push(`Captured ${enemyCity.name}!`);
          this._hexRenderer.updateCities(this._state);
          aowAudio.playCityCapture();

          // FX
          this._fxManager.spawnHealEffect(army.q, army.r, hex.elevation);
        }
        break;
      }

      // Check for grail
      if (hex.decoration === "grail") {
        this._state.grailFound = true;
        this._state.log.push("YOU FOUND THE HOLY GRAIL! VICTORY IS YOURS!");
        aowAudio.playVictory();
        this._fxManager.spawnExplosion(army.q, army.r, hex.elevation, 0xffd700);
        this._fxManager.spawnLightningEffect(army.q, army.r, hex.elevation);
        this._state.phase = AoWPhase.VICTORY;
        this._hud.showVictory("The Holy Grail has been found! Your legend echoes through eternity.");
        break;
      }

      // Check for shrine (mana bonus)
      if (hex.decoration === "shrine") {
        this._state.players[0].mana += 15;
        this._state.log.push("Found a magical shrine! +15 mana");
        hex.decoration = "none";
        this._fxManager.spawnHealEffect(army.q, army.r, hex.elevation);
      }

      // Check for ruins (possible items/gold)
      if (hex.decoration === "ruins") {
        const goldFind = 20 + Math.floor(Math.random() * 30);
        this._state.players[0].gold += goldFind;
        this._state.log.push(`Explored ancient ruins! Found ${goldFind} gold`);
        hex.decoration = "none";
      }
    }

    army.movementLeft = Math.max(0, movesLeft);
    this._unitRenderer.updateArmies(this._state);
    this._hud.update(this._state);
    this._checkVictory();
  }

  // ---------------------------------------------------------------------------
  // Combat
  // ---------------------------------------------------------------------------

  private _initCombat(attackerArmy: AoWArmy, defenderArmy: AoWArmy | null, defenderCity: AoWCity | null): void {
    if (!this._state) return;

    this._combatSystem.initCombat(this._state, attackerArmy, defenderArmy, defenderCity);
    aowAudio.playCombat();

    // Show combat FX
    const hex = this._state.hexes.get(hexKey(attackerArmy.q, attackerArmy.r));
    const elev = hex?.elevation || 0;
    this._fxManager.spawnCombatSlash(attackerArmy.q, attackerArmy.r, elev);
    this._fxManager.spawnExplosion(attackerArmy.q, attackerArmy.r, elev, 0xff4400);
    this._sceneManager.triggerShake(0.2, 0.4);

    // Auto-resolve (generates timeline for animation)
    const result = this._combatSystem.autoResolveCombat(this._state);
    const log = this._state.combat?.log || [];
    const timeline = this._state.combat?.timeline;

    if (timeline) {
      // Hide hex map objects during battle animation
      this._sceneManager.setHexGroupVisible(false);

      // Start animated battle replay
      import("./view/AoWBattleAnimator").then(({ AoWBattleAnimator }) => {
        this._battleAnimator = new AoWBattleAnimator(
          this._sceneManager.scene,
          this._sceneManager.camera,
          this._sceneManager.renderer,
          timeline,
          () => {
            // Animation complete — apply results
            this._battleAnimator = null;
            this._sceneManager.setHexGroupVisible(true);
            this._sceneManager.restoreCamera();
            this._combatSystem.applyCombatResults(this._state!);
            this._unitRenderer.updateArmies(this._state!);
            this._hexRenderer.updateCities(this._state!);
            const resultText = result === "attacker_wins" ? "Victory!" :
              result === "defender_wins" ? "Defeat!" : "Draw!";
            this._state!.log.push(`Battle result: ${resultText}`);
            this._hud.showCombatResult(log, result);
            this._hud.update(this._state!);
            if (!this._state!.armies.find(a => a.id === this._state!.selectedArmyId)) {
              this._state!.selectedArmyId = null;
            }
          },
        );
      });
    } else {
      // Fallback: instant resolution (no timeline)
      this._combatSystem.applyCombatResults(this._state);
      this._unitRenderer.updateArmies(this._state);
      this._hexRenderer.updateCities(this._state);
      const resultText = result === "attacker_wins" ? "Victory!" :
        result === "defender_wins" ? "Defeat!" : "Draw!";
      this._state.log.push(`Battle result: ${resultText}`);
      this._hud.showCombatResult(log, result);
      this._hud.update(this._state);
      if (!this._state.armies.find(a => a.id === this._state!.selectedArmyId)) {
        this._state.selectedArmyId = null;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Spell casting
  // ---------------------------------------------------------------------------

  private _startCastSpell(spell: AoWSpellDef): void {
    if (!this._state) return;
    const player = this._state.players[0];
    if (player.mana < spell.manaCost) {
      this._state.log.push("Not enough mana!");
      return;
    }

    if (spell.targetType === "global") {
      this._resolveGlobalSpell(spell);
    } else {
      this._state.castingSpell = spell;
      this._state.log.push(`Casting ${spell.name} — select a target...`);
      this._hud.update(this._state);
    }
  }

  private _resolveSpell(spell: AoWSpellDef, targetQ: number, targetR: number): void {
    if (!this._state) return;
    const player = this._state.players[0];
    player.mana -= spell.manaCost;
    aowAudio.playSpellCast(spell.domain);

    const hex = this._state.hexes.get(hexKey(targetQ, targetR));
    const elev = hex?.elevation || 0;

    switch (spell.effect) {
      case "damage_all": {
        const army = this._state.armies.find(a => a.q === targetQ && a.r === targetR && a.playerId !== 0);
        if (army) {
          for (const unit of army.units) {
            const dmg = spell.damage || 20;
            unit.hp -= dmg;
          }
          army.units = army.units.filter(u => u.hp > 0);
          if (army.units.length === 0) {
            this._state.armies = this._state.armies.filter(a => a.id !== army.id);
          }
          this._fxManager.spawnFireball(targetQ - 2, targetR, targetQ, targetR, elev);
          this._fxManager.spawnExplosion(targetQ, targetR, elev, 0xff4400);
          this._state.log.push(`${spell.name} devastates enemy army!`);
        } else {
          this._state.log.push("No enemy army at target.");
          player.mana += spell.manaCost; // Refund
        }
        break;
      }
      case "heal_all": {
        const army = this._state.armies.find(a => a.q === targetQ && a.r === targetR && a.playerId === 0);
        if (army) {
          for (const unit of army.units) {
            unit.hp = Math.min(unit.maxHp, unit.hp + (spell.heal || 20));
          }
          this._fxManager.spawnHealEffect(targetQ, targetR, elev);
          this._state.log.push(`${spell.name} restores your army!`);
        } else {
          this._state.log.push("No friendly army at target.");
          player.mana += spell.manaCost;
        }
        break;
      }
      case "damage_hex": {
        // Damage everything on hex
        for (const army of this._state.armies) {
          if (army.q === targetQ && army.r === targetR) {
            for (const unit of army.units) {
              unit.hp -= (spell.damage || 40);
            }
            army.units = army.units.filter(u => u.hp > 0);
          }
        }
        this._state.armies = this._state.armies.filter(a => a.units.length > 0);
        this._fxManager.spawnExplosion(targetQ, targetR, elev, 0xff8800);
        this._fxManager.spawnLightningEffect(targetQ, targetR, elev);
        this._state.log.push(`${spell.name} strikes the earth!`);
        break;
      }
      case "slow": {
        const army = this._state.armies.find(a => a.q === targetQ && a.r === targetR && a.playerId !== 0);
        if (army) {
          army.movementLeft = 0;
          army.maxMovement = Math.max(1, Math.floor(army.maxMovement / 2));
          this._fxManager.spawnIceEffect(targetQ, targetR, elev);
          this._state.log.push(`${spell.name} freezes enemy army!`);
        } else {
          player.mana += spell.manaCost;
          this._state.log.push("No enemy army at target.");
        }
        break;
      }
      case "drain": {
        const army = this._state.armies.find(a => a.q === targetQ && a.r === targetR && a.playerId !== 0);
        if (army && army.units.length > 0) {
          const target = army.units.reduce((a, b) => a.hp > b.hp ? a : b);
          target.hp -= (spell.damage || 15);
          if (target.hp <= 0) {
            army.units = army.units.filter(u => u.id !== target.id);
            if (army.units.length === 0) {
              this._state.armies = this._state.armies.filter(a => a.id !== army.id);
            }
          }
          this._fxManager.spawnExplosion(targetQ, targetR, elev, 0xaa44aa);
          this._state.log.push(`${spell.name} drains life from the enemy!`);
        } else {
          player.mana += spell.manaCost;
          this._state.log.push("No enemy army at target.");
        }
        break;
      }
      case "root": {
        const army = this._state.armies.find(a => a.q === targetQ && a.r === targetR && a.playerId !== 0);
        if (army) {
          army.movementLeft = 0;
          this._fxManager.spawnHealEffect(targetQ, targetR, elev);
          this._state.log.push(`${spell.name} entangles the enemy!`);
        } else {
          player.mana += spell.manaCost;
        }
        break;
      }
      case "earthquake": {
        // Damage + destroy walls
        const city = this._state.cities.find(c => c.q === targetQ && c.r === targetR);
        if (city) city.walls = false;
        for (const army of this._state.armies) {
          if (army.q === targetQ && army.r === targetR) {
            for (const unit of army.units) {
              unit.hp -= (spell.damage || 25);
            }
            army.units = army.units.filter(u => u.hp > 0);
          }
        }
        this._state.armies = this._state.armies.filter(a => a.units.length > 0);
        this._fxManager.spawnExplosion(targetQ, targetR, elev, 0xaa8844);
        this._state.log.push(`${spell.name} shakes the ground!`);
        break;
      }
      case "summon": {
        if (spell.summonId) {
          // Create army with summoned units
          const def = { id: "und_skeleton", name: "Skeleton", faction: AoWFaction.UNDEAD, tier: 1, hp: 20, attack: 5, defense: 3, damage: [2, 4] as [number, number], speed: 3, range: 0, abilities: ["undead"], cost: 15, description: "" };
          const units = [createUnit(def.id, 0, def), createUnit(def.id, 0, def)];
          this._state.armies.push({
            id: `aow_summon_${Date.now()}`,
            playerId: 0,
            units,
            q: targetQ,
            r: targetR,
            movementLeft: 0,
            maxMovement: 3,
          });
          this._fxManager.spawnExplosion(targetQ, targetR, elev, 0x6b8e6b);
          this._state.log.push(`${spell.name} raises the dead!`);
        }
        break;
      }
      case "buff_defense": {
        const army = this._state.armies.find(a => a.q === targetQ && a.r === targetR && a.playerId === 0);
        if (army) {
          for (const unit of army.units) {
            unit.defense += 4;
          }
          this._fxManager.spawnIceEffect(targetQ, targetR, elev);
          this._state.log.push(`${spell.name} fortifies your army!`);
        } else {
          player.mana += spell.manaCost;
        }
        break;
      }
      case "debuff_attack": {
        const army = this._state.armies.find(a => a.q === targetQ && a.r === targetR && a.playerId !== 0);
        if (army) {
          for (const unit of army.units) {
            unit.attack = Math.max(1, unit.attack - 3);
          }
          this._fxManager.spawnExplosion(targetQ, targetR, elev, 0xaa44aa);
          this._state.log.push(`${spell.name} weakens the enemy!`);
        } else {
          player.mana += spell.manaCost;
        }
        break;
      }
      default:
        this._state.log.push(`Cast ${spell.name}!`);
        this._fxManager.spawnExplosion(targetQ, targetR, elev, 0xaa88ff);
    }

    this._state.castingSpell = null;
    this._unitRenderer.updateArmies(this._state);
    this._hud.update(this._state);
    this._checkVictory();
  }

  private _resolveGlobalSpell(spell: AoWSpellDef): void {
    if (!this._state) return;
    const player = this._state.players[0];
    player.mana -= spell.manaCost;

    switch (spell.effect) {
      case "global_damage": {
        for (const army of this._state.armies) {
          if (army.playerId !== 0) {
            for (const unit of army.units) {
              unit.hp -= (spell.damage || 30);
            }
            army.units = army.units.filter(u => u.hp > 0);
            if (army.units.length > 0) {
              const hex = this._state.hexes.get(hexKey(army.q, army.r));
              this._fxManager.spawnIceEffect(army.q, army.r, hex?.elevation || 0);
            }
          }
        }
        this._state.armies = this._state.armies.filter(a => a.units.length > 0);
        this._state.log.push(`${spell.name} devastates all enemies!`);
        break;
      }
      case "reveal_grail": {
        // Find grail hex and reveal it
        for (const [, hex] of this._state.hexes) {
          if (hex.decoration === "grail") {
            hex.explored[0] = true;
            revealHexes(this._state.hexes, hex.q, hex.r, 2, 0);
            this._hexRenderer.updateFog(this._state);
            this._fxManager.spawnLightningEffect(hex.q, hex.r, hex.elevation);
            this._state.log.push(`The Grail Vision reveals the Holy Grail at (${hex.q}, ${hex.r})!`);
            break;
          }
        }
        break;
      }
    }

    this._unitRenderer.updateArmies(this._state);
    this._hud.update(this._state);
    this._checkVictory();
  }

  // ---------------------------------------------------------------------------
  // City menu (buy units)
  // ---------------------------------------------------------------------------

  private _showCityMenu(city: AoWCity): void {
    if (!this._state) return;
    const player = this._state.players[0];
    const factionUnits = getUnitsForFaction(player.faction);

    // Check if army exists on city
    let armyOnCity = this._state.armies.find(a => a.playerId === 0 && a.q === city.q && a.r === city.r);
    const armyFull = armyOnCity && armyOnCity.units.length >= AOW_BALANCE.MAX_ARMY_SIZE;

    const div = document.createElement("div");
    div.style.cssText = `
      position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
      background:rgba(10,8,20,0.95);border:2px solid rgba(218,165,32,0.5);
      border-radius:10px;padding:20px;z-index:25;font-family:'Segoe UI',monospace;
      color:#e0d5c0;min-width:300px;
    `;

    let html = `
      <div style="font-size:18px;font-weight:bold;color:#daa520;margin-bottom:4px">${city.name}</div>
      <div style="color:#888;font-size:11px;margin-bottom:12px">
        Pop: ${city.population} | Gold: +${city.goldPerTurn}/turn | Mana: +${city.manaPerTurn}/turn
        ${city.walls ? " | Walled" : ""}
      </div>
      <div style="color:#aaa;font-size:12px;margin-bottom:8px">Recruit Units (Gold: ${player.gold})</div>
    `;

    if (armyFull) {
      html += `<div style="color:#884444;font-size:11px;margin-bottom:8px">Army is full (${AOW_BALANCE.MAX_ARMY_SIZE} units max)</div>`;
    }

    for (const def of factionUnits) {
      const canAfford = player.gold >= def.cost && !armyFull;
      html += `
        <button class="aow-buy-btn" data-unit="${def.id}" style="
          display:block;width:100%;padding:8px 12px;margin-bottom:4px;
          border:1px solid ${canAfford ? "#daa520" : "#333"};border-radius:4px;
          background:rgba(20,15,10,0.6);color:${canAfford ? "#ddd" : "#555"};
          cursor:${canAfford ? "pointer" : "not-allowed"};font-family:inherit;
          font-size:11px;text-align:left;
          pointer-events:${canAfford ? "auto" : "none"};
        ">
          <b>${def.name}</b> — ${def.cost}g
          <span style="color:#888;font-size:10px"> | HP:${def.hp} ATK:${def.attack} DEF:${def.defense} SPD:${def.speed}</span>
        </button>
      `;
    }

    // Build walls button
    if (!city.walls) {
      const canWall = player.gold >= AOW_BALANCE.WALL_BUILD_COST;
      html += `
        <button id="aow-build-walls" style="
          display:block;width:100%;padding:8px 12px;margin-top:8px;
          border:1px solid ${canWall ? "#888" : "#333"};border-radius:4px;
          background:rgba(20,15,10,0.6);color:${canWall ? "#aaa" : "#555"};
          cursor:${canWall ? "pointer" : "not-allowed"};font-family:inherit;font-size:11px;
          pointer-events:${canWall ? "auto" : "none"};
        ">
          Build Walls — ${AOW_BALANCE.WALL_BUILD_COST}g
        </button>
      `;
    }

    html += `
      <button id="aow-city-close" style="
        display:block;width:100%;padding:6px 12px;margin-top:10px;
        border:1px solid #553333;border-radius:4px;
        background:rgba(20,15,10,0.6);color:#884444;cursor:pointer;
        font-family:inherit;font-size:11px;
      ">CLOSE</button>
    `;

    div.innerHTML = html;
    document.body.appendChild(div);

    // Wire buy buttons
    const buyBtns = div.querySelectorAll(".aow-buy-btn");
    buyBtns.forEach(btn => {
      (btn as HTMLElement).onclick = () => {
        const unitId = (btn as HTMLElement).dataset.unit!;
        this._buyUnit(city, unitId);
        document.body.removeChild(div);
        this._showCityMenu(city); // Refresh
      };
    });

    const wallsBtn = div.querySelector("#aow-build-walls");
    if (wallsBtn) {
      (wallsBtn as HTMLElement).onclick = () => {
        player.gold -= AOW_BALANCE.WALL_BUILD_COST;
        city.walls = true;
        this._state!.log.push(`Built walls in ${city.name}!`);
        document.body.removeChild(div);
        this._hud.update(this._state!);
      };
    }

    document.getElementById("aow-city-close")!.onclick = () => {
      document.body.removeChild(div);
    };
  }

  private _buyUnit(city: AoWCity, unitDefId: string): void {
    if (!this._state) return;
    const player = this._state.players[0];
    const factionUnits = getUnitsForFaction(player.faction);
    const def = factionUnits.find(u => u.id === unitDefId);
    if (!def || player.gold < def.cost) return;

    player.gold -= def.cost;
    const unit = createUnit(def.id, 0, def);

    let army = this._state.armies.find(a => a.playerId === 0 && a.q === city.q && a.r === city.r);
    if (army) {
      if (army.units.length >= AOW_BALANCE.MAX_ARMY_SIZE) return;
      army.units.push(unit);
    } else {
      army = {
        id: `aow_buy_${Date.now()}`,
        playerId: 0,
        units: [unit],
        q: city.q,
        r: city.r,
        movementLeft: 0,
        maxMovement: def.speed,
      };
      this._state.armies.push(army);
    }

    this._state.log.push(`Recruited ${def.name} in ${city.name}`);
    this._unitRenderer.updateArmies(this._state);
    this._hud.update(this._state);
  }

  // ---------------------------------------------------------------------------
  // End turn
  // ---------------------------------------------------------------------------

  private _endTurn(): void {
    if (!this._state || this._state.phase !== AoWPhase.PLAYING) return;
    if (this._state.currentPlayer !== 0) return;

    const player = this._state.players[0];

    // Collect income
    player.gold += player.goldPerTurn;
    player.mana += player.manaPerTurn;
    aowAudio.playGold();

    // Research
    if (player.currentResearch) {
      player.researchProgress += AOW_BALANCE.RESEARCH_PER_TURN;
      if (player.researchProgress >= 30) {
        player.researchedSpells.push(player.currentResearch);
        this._state.log.push(`Researched: ${player.currentResearch}!`);
        // Auto-pick next research
        const unresearched = player.spellBook.filter(s => !player.researchedSpells.includes(s));
        player.currentResearch = unresearched.length > 0
          ? unresearched[Math.floor(Math.random() * unresearched.length)]
          : null;
        player.researchProgress = 0;
      }
    } else {
      const unresearched = player.spellBook.filter(s => !player.researchedSpells.includes(s));
      if (unresearched.length > 0) {
        player.currentResearch = unresearched[Math.floor(Math.random() * unresearched.length)];
        player.researchProgress = 0;
      }
    }

    // Reset movement for all player armies
    for (const army of this._state.armies) {
      if (army.playerId === 0) {
        army.movementLeft = army.maxMovement;
      }
    }

    // Heal units standing in a friendly city (10% max HP per turn)
    for (const army of this._state.armies) {
      if (army.playerId === 0) {
        const inFriendlyCity = this._state.cities.some(
          c => c.playerId === 0 && c.q === army.q && c.r === army.r,
        );
        if (inFriendlyCity) {
          for (const unit of army.units) {
            const healAmt = Math.ceil(unit.maxHp * 0.1);
            if (unit.hp < unit.maxHp) {
              unit.hp = Math.min(unit.maxHp, unit.hp + healAmt);
            }
          }
        }
      }
    }

    // Level up units with enough XP
    for (const army of this._state.armies) {
      if (army.playerId === 0) {
        for (const unit of army.units) {
          while (unit.xp >= AOW_BALANCE.XP_PER_LEVEL * unit.level) {
            unit.xp -= AOW_BALANCE.XP_PER_LEVEL * unit.level;
            unit.level++;
            unit.maxHp += AOW_BALANCE.LEVEL_HP_BONUS;
            unit.hp = Math.min(unit.hp + AOW_BALANCE.LEVEL_HP_BONUS, unit.maxHp);
            unit.attack += AOW_BALANCE.LEVEL_ATK_BONUS;
            unit.defense += AOW_BALANCE.LEVEL_DEF_BONUS;
            this._state.log.push(`${unit.isHero ? unit.heroName : unit.defId} leveled up to Lv${unit.level}!`);
          }
        }
      }
    }

    // AI turn
    this._state.currentPlayer = 1;
    this._state.log.push(`--- AI Turn ---`);
    this._aiSystem.executeTurn(this._state, 1);

    // Update fog (AI may have been destroyed and revealed areas)
    this._hexRenderer.updateFog(this._state);
    this._hexRenderer.updateCities(this._state);

    // Check for AI defeat / player defeat
    this._checkVictory();

    // Back to player
    this._state.currentPlayer = 0;
    this._state.turn++;
    this._state.log.push(`--- Turn ${this._state.turn} ---`);

    // Update everything
    this._unitRenderer.updateArmies(this._state);
    this._hud.update(this._state);
  }

  // ---------------------------------------------------------------------------
  // Victory check
  // ---------------------------------------------------------------------------

  private _checkVictory(): void {
    if (!this._state || this._state.phase !== AoWPhase.PLAYING) return;

    // Check grail
    if (this._state.grailFound) return; // Already handled

    // Check if AI defeated
    const aiPlayer = this._state.players[1];
    if (aiPlayer.defeated) {
      this._state.phase = AoWPhase.VICTORY;
      aowAudio.playVictory();
      this._hud.showVictory("All enemies have been vanquished! Your dominion is complete.");
      return;
    }

    // Check if human defeated
    const humanPlayer = this._state.players[0];
    if (humanPlayer.defeated) {
      this._state.phase = AoWPhase.DEFEAT;
      aowAudio.playDefeat();
      this._hud.showVictory("DEFEAT — Your forces have been destroyed. The realm falls to darkness.");
    }
  }

  // ---------------------------------------------------------------------------
  // Exit
  // ---------------------------------------------------------------------------

  private _exitGame(): void {
    this.destroy();
    window.dispatchEvent(new Event("aowExit"));
  }

  // ---------------------------------------------------------------------------
  // Destroy
  // ---------------------------------------------------------------------------

  destroy(): void {
    if (this._tickerCb) {
      viewManager.app.ticker.remove(this._tickerCb);
      this._tickerCb = null;
    }

    // Remove input handlers
    if (this._keyHandler) {
      window.removeEventListener("keydown", this._keyHandler);
      window.removeEventListener("keyup", this._keyHandler);
      this._keyHandler = null;
    }
    if (this._mouseHandler && this._sceneManager?.canvas) {
      this._sceneManager.canvas.removeEventListener("click", this._mouseHandler);
    }
    if (this._contextHandler && this._sceneManager?.canvas) {
      this._sceneManager.canvas.removeEventListener("contextmenu", this._contextHandler);
    }
    if (this._wheelHandler && this._sceneManager?.canvas) {
      this._sceneManager.canvas.removeEventListener("wheel", this._wheelHandler);
    }
    if (this._moveHandler && this._sceneManager?.canvas) {
      this._sceneManager.canvas.removeEventListener("mousemove", this._moveHandler);
    }

    this._removeFactionSelect();
    aowAudio.stopAmbient();

    if (this._hexRenderer) this._hexRenderer.clear();
    if (this._unitRenderer) this._unitRenderer.clear();
    if (this._fxManager) this._fxManager.clear();
    if (this._hud) this._hud.destroy();
    if (this._sceneManager) this._sceneManager.destroy();

    this._state = null;
  }
}
