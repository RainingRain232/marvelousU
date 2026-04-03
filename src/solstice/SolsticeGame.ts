import { Ticker } from "pixi.js";
import { viewManager } from "../view/ViewManager";
import { SB } from "./config/SolsticeBalance";
import {
  SolsticeState,
  createSolsticeState,
  spawnUnit,
  findNextHop,
  SolUnit,
  UnitKind,
} from "./state/SolsticeState";
import { SolsticeSceneManager } from "./view/SolsticeSceneManager";
import { SolsticeHUD } from "./view/SolsticeHUD";
import { SolsticeEscapeMenu } from "./view/SolsticeEscapeMenu";
import { updateAI } from "./systems/SolsticeAISystem";

// ---------------------------------------------------------------------------
// SolsticeGame — main orchestrator
// ---------------------------------------------------------------------------

export class SolsticeGame {
  private _state!:  SolsticeState;
  private _scene!:  SolsticeSceneManager;
  private _hud!:    SolsticeHUD;
  private _menu!:   SolsticeEscapeMenu;
  private _paused   = false;
  private _ticker:  ((t: Ticker) => void) | null = null;

  // Input tracking
  private _keys    = new Set<string>();
  private _dragStart: { x: number; y: number } | null = null;
  private _lastMouse = { x: 0, y: 0 };
  private _isDragging = false;
  private _keyHandler!:   (e: KeyboardEvent) => void;
  private _pointerDown!:  (e: PointerEvent) => void;
  private _pointerMove!:  (e: PointerEvent) => void;
  private _pointerUp!:    (e: PointerEvent) => void;
  private _wheelHandler!: (e: WheelEvent)   => void;

  // Unit movement decision timer
  private _playerMoveTimer = 0;
  private _prevCycleT = 0.08;

  async boot(): Promise<void> {
    viewManager.clearWorld();

    this._state = createSolsticeState();

    // Spawn a few starter units for both sides
    spawnUnit(this._state, "player", "guardian", 0);
    spawnUnit(this._state, "player", "guardian", 0);
    spawnUnit(this._state, "ai",     "guardian", 6);
    spawnUnit(this._state, "ai",     "guardian", 6);

    this._scene = new SolsticeSceneManager();
    this._scene.init();
    this._scene.buildWorld(this._state);

    this._hud = new SolsticeHUD();
    this._hud.onSpawn = (kind) => this._playerSpawn(kind);
    this._hud.onExit  = () => this._openMenu();
    viewManager.addToLayer("ui", this._hud.container);

    this._menu = new SolsticeEscapeMenu();
    this._menu.onResume = () => this._closeMenu();
    this._menu.onQuit   = () => this._exit();
    viewManager.addToLayer("ui", this._menu.container);

    this._initInput();

    this._ticker = (ticker) => this._loop(ticker.deltaMS / 1000);
    viewManager.app.ticker.add(this._ticker);
  }

  // ---------------------------------------------------------------------------
  // Input
  // ---------------------------------------------------------------------------

  private _initInput(): void {
    this._keyHandler = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === "Escape") {
        if (this._state.phase !== "playing") { this._exit(); return; }
        this._paused ? this._closeMenu() : this._openMenu();
        return;
      }
      if (this._paused) return;
      if (e.code === "Digit1") this._playerSpawn("guardian");
      if (e.code === "Digit2") this._playerSpawn("warden");
      if (e.code === "Digit3") this._playerSpawn("invoker");
    };
    window.addEventListener("keydown", this._keyHandler);

    this._pointerDown = (e: PointerEvent) => {
      this._dragStart = { x: e.clientX, y: e.clientY };
      this._lastMouse = { x: e.clientX, y: e.clientY };
      this._isDragging = false;
    };

    this._pointerMove = (e: PointerEvent) => {
      if (!this._dragStart) return;
      const dx = e.clientX - this._lastMouse.x;
      const dy = e.clientY - this._lastMouse.y;
      const totalDx = e.clientX - this._dragStart.x;
      const totalDy = e.clientY - this._dragStart.y;
      if (Math.abs(totalDx) + Math.abs(totalDy) > 4) this._isDragging = true;
      if (this._isDragging) this._scene.onOrbit(dx, dy);
      this._lastMouse = { x: e.clientX, y: e.clientY };
    };

    this._pointerUp = (e: PointerEvent) => {
      if (!this._isDragging && this._dragStart) {
        const platId = this._scene.raycastPlatform(e.clientX, e.clientY);
        if (platId !== null) {
          this._state.rallyPlatId = platId;
        }
      }
      this._dragStart  = null;
      this._isDragging = false;
    };

    this._wheelHandler = (e: WheelEvent) => {
      this._scene.onZoom(e.deltaY);
    };

    this._scene.canvas.addEventListener("pointerdown",  this._pointerDown);
    this._scene.canvas.addEventListener("pointermove",  this._pointerMove);
    this._scene.canvas.addEventListener("pointerup",    this._pointerUp);
    this._scene.canvas.addEventListener("wheel",        this._wheelHandler);
  }

  private _destroyInput(): void {
    window.removeEventListener("keydown", this._keyHandler);
    this._scene.canvas.removeEventListener("pointerdown",  this._pointerDown);
    this._scene.canvas.removeEventListener("pointermove",  this._pointerMove);
    this._scene.canvas.removeEventListener("pointerup",    this._pointerUp);
    this._scene.canvas.removeEventListener("wheel",        this._wheelHandler);
  }

  // ---------------------------------------------------------------------------
  // Spawn
  // ---------------------------------------------------------------------------

  private _playerSpawn(kind: UnitKind): void {
    if (this._state.phase !== "playing") return;
    const cost  = SB.UNITS[kind].cost;
    const count = [...this._state.units.values()].filter(u => u.owner === "player" && !u.isDead).length;
    if (this._state.playerEssence < cost || count >= SB.MAX_UNITS_PER_SIDE) return;
    this._state.playerEssence -= cost;
    spawnUnit(this._state, "player", kind, 0);
  }

  // ---------------------------------------------------------------------------
  // Main loop
  // ---------------------------------------------------------------------------

  private _loop(dt: number): void {
    dt = Math.min(dt, 0.1); // cap delta to avoid spiral of death

    if (this._paused) {
      this._scene.update(this._state, 0);
      return;
    }

    if (this._state.phase === "playing") {
      this._updateTime(dt);
      this._updateEssence(dt);
      this._updateUnits(dt);
      this._updateCapture(dt);
      this._updateAlignment();
      this._checkVictory();
      updateAI(this._state, dt);
    } else {
      // Still decrement flash timer on defeat/victory so the visual resolves
      if (this._state.alignmentFlash > 0) this._state.alignmentFlash -= dt;
    }

    this._scene.update(this._state, dt);
    this._hud.update(this._state, dt);
  }

  // ---------------------------------------------------------------------------
  // Time & alignment
  // ---------------------------------------------------------------------------

  private _updateTime(dt: number): void {
    const prev = this._state.cycleT;
    this._prevCycleT = prev;
    this._state.elapsed += dt;
    this._state.cycleT  = (this._state.elapsed % SB.CYCLE_DURATION) / SB.CYCLE_DURATION;
  }

  private _updateAlignment(): void {
    const t    = this._state.cycleT;
    const prev = this._prevCycleT;

    // Two alignment points per cycle: at 25% (dawn) and 75% (dusk)
    for (const pt of [0.25, 0.75]) {
      if ((prev < pt && t >= pt) || (t < prev && prev < pt + 0.05 && pt > 0.95)) {
        this._fireAlignment();
      }
    }

    if (this._state.alignmentFlash > 0) {
      this._state.alignmentFlash = Math.max(0, this._state.alignmentFlash - 0.016);
    }
  }

  private _fireAlignment(): void {
    const playerCount = this._state.platforms.filter(p => p.owner === "player").length;
    const aiCount     = this._state.platforms.filter(p => p.owner === "ai").length;

    let msg = "GRAND ALIGNMENT";
    let sub = "";

    if (playerCount >= SB.ALIGNMENT_MAJORITY && playerCount > aiCount) {
      this._state.playerScore++;
      msg = "GRAND ALIGNMENT — YOU PREVAIL";
      sub = `+1 POINT  •  ${this._state.playerScore}/${SB.POINTS_TO_WIN}`;
    } else if (aiCount >= SB.ALIGNMENT_MAJORITY && aiCount > playerCount) {
      this._state.aiScore++;
      msg = "GRAND ALIGNMENT — ENEMY PREVAILS";
      sub = `ENEMY +1  •  ${this._state.aiScore}/${SB.POINTS_TO_WIN}`;
    } else {
      msg = "GRAND ALIGNMENT — BALANCE";
      sub = `Neither faction holds the majority`;
    }

    this._state.alignmentFlash = SB.ALIGNMENT_FLASH_DURATION;
    this._state.alignmentMsg   = `${msg}\n${sub}`;
  }

  // ---------------------------------------------------------------------------
  // Essence income
  // ---------------------------------------------------------------------------

  private _updateEssence(dt: number): void {
    let rate = 0;
    for (const p of this._state.platforms) {
      if (p.owner === "player") {
        const bonus = p.isCenter ? SB.ESSENCE_CENTER_BONUS : 0;
        rate += SB.ESSENCE_PER_PLATFORM + bonus;
      } else if (p.owner === "ai") {
        const bonus = p.isCenter ? SB.ESSENCE_CENTER_BONUS : 0;
        this._state.aiEssence += (SB.ESSENCE_PER_PLATFORM + bonus) * dt;
      }
    }
    this._state.playerEssence += rate * dt;
    this._state.essenceRate    = rate;
  }

  // ---------------------------------------------------------------------------
  // Unit movement & combat
  // ---------------------------------------------------------------------------

  private _updateUnits(dt: number): void {
    const adj = this._state.platforms.map(p => p.adjacentIds);

    // Decide movement for player units periodically
    this._playerMoveTimer -= dt;
    if (this._playerMoveTimer <= 0) {
      this._playerMoveTimer = 1.5;
      this._decidePlayerMovement(adj);
    }

    for (const unit of this._state.units.values()) {
      if (unit.isDead) continue;

      // Decrement spawn flash
      if (unit.spawnFlash > 0) unit.spawnFlash = Math.max(0, unit.spawnFlash - dt * 2);

      // Movement along bridge
      if (unit.destPlatId !== null) {
        this._movAlongBridge(unit, dt);
      } else {
        // Position on platform
        this._setPlatformPos(unit);
      }

      // Combat
      unit.attackTimer -= dt;
      if (unit.attackTimer <= 0) {
        unit.attackTimer = SB.ATTACK_INTERVAL;
        this._doAttack(unit);
      }
    }

    // Remove dead units
    for (const [id, unit] of this._state.units) {
      if (unit.isDead) this._state.units.delete(id);
    }
  }

  private _movAlongBridge(unit: SolUnit, dt: number): void {
    const src  = this._state.platforms[unit.platId].pos;
    const dst  = this._state.platforms[unit.destPlatId!].pos;
    const dist = Math.sqrt(
      (dst.x - src.x) ** 2 + (dst.y - src.y) ** 2 + (dst.z - src.z) ** 2,
    );
    const speed = SB.UNITS[unit.kind].speed;
    unit.bridgeT += (speed / Math.max(1, dist)) * dt;

    if (unit.bridgeT >= 1.0) {
      unit.platId     = unit.destPlatId!;
      unit.destPlatId = null;
      unit.bridgeT    = 0;
      this._setPlatformPos(unit);
    } else {
      // Interpolate along a gentle arc
      const t   = unit.bridgeT;
      const arc = Math.sin(t * Math.PI) * 2.5;
      unit.x = src.x + (dst.x - src.x) * t + unit.offsetX * (1 - Math.abs(t - 0.5) * 2);
      unit.y = src.y + (dst.y - src.y) * t + arc;
      unit.z = src.z + (dst.z - src.z) * t + unit.offsetZ * (1 - Math.abs(t - 0.5) * 2);
    }
  }

  private _setPlatformPos(unit: SolUnit): void {
    const p  = this._state.platforms[unit.platId];
    unit.x   = p.pos.x + unit.offsetX;
    unit.y   = p.pos.y + SB.PLATFORM_HEIGHT + 0.5;
    unit.z   = p.pos.z + unit.offsetZ;
  }

  private _doAttack(attacker: SolUnit): void {
    // Find weakest enemy on the same platform
    let target: SolUnit | null = null;
    let lowestHp = Infinity;
    for (const u of this._state.units.values()) {
      if (u.owner === attacker.owner || u.isDead) continue;
      if (u.destPlatId !== null || u.platId !== attacker.platId) continue;
      if (u.hp < lowestHp) { lowestHp = u.hp; target = u; }
    }
    if (!target) return;

    const isDay    = this._state.cycleT < SB.DAY_FRACTION;
    const dayBonus = isDay && attacker.owner === "player";
    const nightBonus = !isDay && attacker.owner === "ai";
    const mult   = (dayBonus || nightBonus) ? SB.BONUS_MULT : 1.0;
    const dmg    = SB.UNITS[attacker.kind].dps * SB.ATTACK_INTERVAL * mult;
    target.hp   -= dmg;
    if (target.hp <= 0) target.isDead = true;
  }

  private _decidePlayerMovement(adj: number[][]): void {
    const playerUnits = [...this._state.units.values()].filter(u => u.owner === "player" && !u.isDead && u.destPlatId === null);
    const rally       = this._state.rallyPlatId;

    for (const unit of playerUnits) {
      // Don't move if enemies are present on this platform
      const hasEnemiesHere = [...this._state.units.values()].some(u => u.owner === "ai" && !u.isDead && u.platId === unit.platId && u.destPlatId === null);
      if (hasEnemiesHere) continue;

      const target = rally !== null ? rally : this._findPlayerTarget(unit, adj);
      if (target === null || target === unit.platId) continue;

      const hop = findNextHop(unit.platId, target, adj);
      if (hop !== null) {
        unit.destPlatId = hop;
        unit.bridgeT    = 0;
      }
    }
  }

  private _findPlayerTarget(unit: SolUnit, adj: number[][]): number | null {
    const plats = this._state.platforms;

    // Nearest non-player platform
    let best: number | null = null;
    let bestDist = Infinity;
    for (const p of plats) {
      if (p.owner === "player") continue;
      const d = this._bfsDist(unit.platId, p.id, adj);
      if (d < bestDist) { bestDist = d; best = p.id; }
    }
    return best;
  }

  private _bfsDist(from: number, to: number, adj: number[][]): number {
    if (from === to) return 0;
    const vis = new Set([from]);
    const q: [number, number][] = adj[from].map(n => [n, 1]);
    for (let i = 0; i < q.length; i++) {
      const [cur, d] = q[i];
      if (cur === to) return d;
      if (!vis.has(cur)) { vis.add(cur); for (const nb of adj[cur]) if (!vis.has(nb)) q.push([nb, d + 1]); }
    }
    return Infinity;
  }

  // ---------------------------------------------------------------------------
  // Capture
  // ---------------------------------------------------------------------------

  private _updateCapture(dt: number): void {
    for (const p of this._state.platforms) {
      const playerOn = [...this._state.units.values()].filter(u => u.owner === "player" && !u.isDead && u.platId === p.id && u.destPlatId === null).length;
      const aiOn     = [...this._state.units.values()].filter(u => u.owner === "ai"     && !u.isDead && u.platId === p.id && u.destPlatId === null).length;

      const advantage = aiOn - playerOn; // positive = AI pushing, negative = player pushing
      const rate      = SB.CAPTURE_RATE * Math.abs(advantage) * dt;

      if (advantage < 0 && !p.isBase) {
        p.captureProgress = Math.max(0, p.captureProgress - rate);
      } else if (advantage > 0 && !p.isBase) {
        p.captureProgress = Math.min(1, p.captureProgress + rate);
      } else if (advantage === 0 && !p.isBase) {
        // Slow decay toward neutral (0.5) if no one is present
        if (playerOn === 0 && aiOn === 0) {
          p.captureProgress += (0.5 - p.captureProgress) * SB.CAPTURE_DECAY * dt;
        }
      }

      // Bases resist capture more — need overwhelming force
      if (p.isBase) {
        if (p.id === 0 && advantage > 1) {
          p.captureProgress = Math.min(1, p.captureProgress + rate * 0.35);
        } else if (p.id === 6 && advantage < -1) {
          p.captureProgress = Math.max(0, p.captureProgress - rate * 0.35);
        }
      }

      // Assign owner
      if (p.captureProgress <= 0.12) p.owner = "player";
      else if (p.captureProgress >= 0.88) p.owner = "ai";
      else p.owner = "neutral";
    }
  }

  // ---------------------------------------------------------------------------
  // Victory check
  // ---------------------------------------------------------------------------

  private _checkVictory(): void {
    if (this._state.playerScore >= SB.POINTS_TO_WIN) {
      this._state.phase          = "victory";
      this._state.victoryMessage = "SOLSTICE VICTORY";
    } else if (this._state.aiScore >= SB.POINTS_TO_WIN) {
      this._state.phase          = "defeat";
      this._state.victoryMessage = "DEFEAT — THE DARKNESS REIGNS";
    }
  }

  // ---------------------------------------------------------------------------
  // Exit
  // ---------------------------------------------------------------------------

  private _openMenu(): void {
    this._paused = true;
    this._menu.show();
  }

  private _closeMenu(): void {
    this._paused = false;
    this._menu.hide();
  }

  private _exit(): void {
    window.dispatchEvent(new Event("solsticeExit"));
  }

  // ---------------------------------------------------------------------------
  // Destroy
  // ---------------------------------------------------------------------------

  destroy(): void {
    if (this._ticker) viewManager.app.ticker.remove(this._ticker);
    this._destroyInput();
    this._scene.destroy();
    viewManager.removeFromLayer("ui", this._hud.container);
    this._hud.destroy();
    viewManager.removeFromLayer("ui", this._menu.container);
    this._menu.destroy();
    viewManager.clearWorld();
  }
}
