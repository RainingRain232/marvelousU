// ---------------------------------------------------------------------------
// Pendulum — The Clockwork Knight — main game orchestrator
// Guard the Clock Tower. Master Time. Survive the Automaton Siege.
// ---------------------------------------------------------------------------

import { PENDULUM } from "./config/PendulumConfig";
import { createPendulumState } from "./state/PendulumState";
import type { PendulumState } from "./state/PendulumState";
import {
  updatePlayer, useAbilities, updateEnemies, updateTurrets,
  updateProjectiles, updateGearFragments, updateRepairKits,
  updateTimeSlowZones, updateDashTrails, updatePillars, updateDamageNumbers,
  updateParticles, updateNotifications, updateSpawnQueue, updatePhase,
  updateEntropy, updateWaveModifiers, updatePendulum, updateClockHour,
} from "./systems/PendulumSystem";
import { PendulumRenderer } from "./view/PendulumRenderer";
import { PendulumHUD } from "./view/PendulumHUD";

const DT = PENDULUM.SIM_TICK_MS / 1000;

export class PendulumGame {
  private _state!: PendulumState;
  private _renderer = new PendulumRenderer();
  private _hud = new PendulumHUD();
  private _rafId: number | null = null;
  private _lastTime = 0;
  private _simAccumulator = 0;
  private _bestWave = 0;

  private _escMenuDiv: HTMLDivElement | null = null;
  private _onKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private _onKeyUp: ((e: KeyboardEvent) => void) | null = null;
  private _onMouseMove: ((e: MouseEvent) => void) | null = null;
  private _onMouseDown: ((e: MouseEvent) => void) | null = null;
  private _onMouseUp: ((e: MouseEvent) => void) | null = null;
  private _onContextMenu: ((e: Event) => void) | null = null;
  private _onPointerLockChange: (() => void) | null = null;
  private _onClick: ((e: MouseEvent) => void) | null = null;
  private _onRestartHandler: (() => void) | null = null;
  private _onResizeHandler: (() => void) | null = null;

  async boot(): Promise<void> {
    const sw = window.innerWidth;
    const sh = window.innerHeight;

    const pixiCanvas = document.querySelector("#pixi-container canvas") as HTMLCanvasElement | null;
    if (pixiCanvas) pixiCanvas.style.display = "none";

    this._state = createPendulumState(sw, sh);
    this._state.bestWave = this._bestWave;

    this._renderer.init(sw, sh);
    document.body.appendChild(this._renderer.canvas);

    this._hud.build(() => this.destroy());

    this._registerInput();

    this._onRestartHandler = () => this._restart();
    window.addEventListener("pendulumRestart", this._onRestartHandler);

    this._onResizeHandler = () => {
      const w = window.innerWidth, h = window.innerHeight;
      this._renderer.resize(w, h);
      this._state.screenW = w;
      this._state.screenH = h;
    };
    window.addEventListener("resize", this._onResizeHandler);

    this._lastTime = performance.now();
    this._rafId = requestAnimationFrame((t) => this._gameLoop(t));
  }

  private _gameLoop(timestamp: number): void {
    if (!this._state) return;

    const rawDt = Math.min((timestamp - this._lastTime) / 1000, 0.1);
    this._lastTime = timestamp;

    if (this._state.phase !== "menu" && this._state.phase !== "game_over" && !this._state.paused) {
      const timeScale = this._state.hitStopTimer > 0 ? this._state.hitStopScale : 1;
      this._simAccumulator += rawDt * timeScale;
      while (this._simAccumulator >= DT) {
        this._simAccumulator -= DT;
        this._simTick(DT);
      }
      this._state.gameTime += rawDt;
    }

    // Release pointer lock on game over so player can click UI buttons
    if (this._state.phase === "game_over" && document.pointerLockElement) {
      document.exitPointerLock();
    }

    this._renderer.update(this._state, rawDt);
    this._hud.update(this._state);

    this._rafId = requestAnimationFrame((t) => this._gameLoop(t));
  }

  private _simTick(dt: number): void {
    const state = this._state;

    updatePendulum(state, dt);
    updatePlayer(state, dt);
    useAbilities(state);
    updateEnemies(state, dt);
    updateTurrets(state, dt);
    updateProjectiles(state, dt);
    updateGearFragments(state, dt);
    updateRepairKits(state, dt);
    updateTimeSlowZones(state, dt);
    updateDashTrails(state, dt);
    updatePillars(state, dt);
    updateDamageNumbers(state, dt);
    updateSpawnQueue(state, dt);
    updateClockHour(state, dt);
    updateWaveModifiers(state, dt);
    updateEntropy(state);
    updateParticles(state, dt);
    updateNotifications(state, dt);
    updatePhase(state, dt);

    state.tick++;
  }

  private _registerInput(): void {
    this._onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      this._state.keys.add(key);
      if (key === "escape") {
        if (document.pointerLockElement) document.exitPointerLock();
        if (this._escMenuDiv) { this._closeEscMenu(); return; }
        if (this._state.phase === "playing" || this._state.phase === "intermission") {
          this._state.paused = true;
          this._openEscMenu();
        }
      }
    };
    this._onKeyUp = (e: KeyboardEvent) => { this._state.keys.delete(e.key.toLowerCase()); };
    this._onMouseMove = (e: MouseEvent) => {
      this._state.mouseX = e.clientX; this._state.mouseY = e.clientY;
      if (this._state.pointerLocked) { this._state.mouseDX += e.movementX; this._state.mouseDY += e.movementY; }
    };
    this._onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) this._state.mouseDown = true;
      if (e.button === 2) this._state.rightMouseDown = true;
    };
    this._onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) this._state.mouseDown = false;
      if (e.button === 2) this._state.rightMouseDown = false;
    };
    this._onContextMenu = (e: Event) => e.preventDefault();
    this._onClick = () => {
      if (this._state.phase === "playing") {
        this._renderer.canvas.requestPointerLock();
      }
    };
    this._onPointerLockChange = () => {
      this._state.pointerLocked = document.pointerLockElement === this._renderer.canvas;
    };

    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
    window.addEventListener("mousemove", this._onMouseMove);
    window.addEventListener("mousedown", this._onMouseDown);
    window.addEventListener("mouseup", this._onMouseUp);
    window.addEventListener("contextmenu", this._onContextMenu);
    this._renderer.canvas.addEventListener("click", this._onClick);
    document.addEventListener("pointerlockchange", this._onPointerLockChange);
  }

  private _unregisterInput(): void {
    if (this._onKeyDown) window.removeEventListener("keydown", this._onKeyDown);
    if (this._onKeyUp) window.removeEventListener("keyup", this._onKeyUp);
    if (this._onMouseMove) window.removeEventListener("mousemove", this._onMouseMove);
    if (this._onMouseDown) window.removeEventListener("mousedown", this._onMouseDown);
    if (this._onMouseUp) window.removeEventListener("mouseup", this._onMouseUp);
    if (this._onContextMenu) window.removeEventListener("contextmenu", this._onContextMenu);
    if (this._onClick) this._renderer.canvas.removeEventListener("click", this._onClick);
    if (this._onPointerLockChange) document.removeEventListener("pointerlockchange", this._onPointerLockChange);
    if (this._onRestartHandler) window.removeEventListener("pendulumRestart", this._onRestartHandler);
    if (this._onResizeHandler) window.removeEventListener("resize", this._onResizeHandler);
    if (document.pointerLockElement) document.exitPointerLock();
  }

  private _restart(): void {
    this._bestWave = Math.max(this._bestWave, this._state.bestWave, this._state.wave);
    const sw = this._state.screenW, sh = this._state.screenH;
    this._state = createPendulumState(sw, sh);
    this._state.bestWave = this._bestWave;
    this._state.phase = "intermission";
    this._state.phaseTimer = 3;
    this._simAccumulator = 0;
  }

  private _openEscMenu(): void {
    if (this._escMenuDiv) return;
    const div = document.createElement("div");
    div.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(10,8,18,0.85);z-index:40;display:flex;align-items:center;justify-content:center;font-family:'Segoe UI',sans-serif;";
    const panel = document.createElement("div");
    panel.style.cssText = "background:rgba(15,12,25,0.97);border:2px solid rgba(204,170,68,0.5);border-radius:12px;padding:28px 36px;min-width:460px;max-width:560px;color:#d5d0c0;";
    const s = this._state;
    let tab = "controls";
    const render = () => {
      let c = "";
      if (tab === "controls") {
        c = `<div style="font-size:13px;line-height:2;text-align:left">
          <div><span style="display:inline-block;min-width:110px;color:#ccaa44;font-weight:bold">WASD</span> Move</div>
          <div><span style="display:inline-block;min-width:110px;color:#ccaa44;font-weight:bold">Mouse</span> Look / Aim</div>
          <div><span style="display:inline-block;min-width:110px;color:#ccaa44;font-weight:bold">Left Click</span> Strike (sword attack)</div>
          <div><span style="display:inline-block;min-width:110px;color:#ccaa44;font-weight:bold">Q</span> Gear Cast (ranged)</div>
          <div><span style="display:inline-block;min-width:110px;color:#ccaa44;font-weight:bold">E</span> Slow Zone</div>
          <div><span style="display:inline-block;min-width:110px;color:#ccaa44;font-weight:bold">R</span> Reversal</div>
          <div><span style="display:inline-block;min-width:110px;color:#ccaa44;font-weight:bold">X</span> Time Stop</div>
          <div><span style="display:inline-block;min-width:110px;color:#ccaa44;font-weight:bold">C</span> Chrono Dash</div>
          <div><span style="display:inline-block;min-width:110px;color:#ccaa44;font-weight:bold">T</span> Place / collect turret</div>
          <div><span style="display:inline-block;min-width:110px;color:#ccaa44;font-weight:bold">ESC</span> Pause / Resume</div>
        </div>`;
      } else if (tab === "intro") {
        c = `<div style="font-size:13px;line-height:1.7;color:#aaa8a0">
          <p><b style="color:#ccaa44">Pendulum</b> — Guard the Clock Tower as the Clockwork Knight. The great pendulum swings, and its rhythm is your power.</p>
          <p>When the pendulum is at its <b style="color:#ffd700">apex</b> (maximum swing), your attacks deal bonus damage. Time your strikes to the pendulum's rhythm for maximum effect.</p>
          <p style="margin-top:10px"><b style="color:#ffd700">Chrono Power:</b> Builds as you fight. Higher power means stronger abilities, faster movement, and greater damage.</p>
          <p><b style="color:#ffd700">Gear Pillars:</b> 4 pillars surround the tower. If all are destroyed, the tower is vulnerable. Repair them with Repair Kits.</p>
          <p><b style="color:#ffd700">Waves:</b> Survive waves of clockwork automatons. Every few waves a boss appears.</p>
        </div>`;
      } else {
        c = `<div style="font-size:13px;line-height:1.7;color:#aaa8a0">
          <p><b style="color:#ffd700">Enemies:</b></p>
          <div style="display:grid;grid-template-columns:auto 1fr;gap:2px 12px;margin-bottom:10px">
            <b style="color:#997744">Gear Drone</b><span>Floating gear, basic attacker</span>
            <b style="color:#556655">Spring Knight</b><span>Armored melee, bounces toward you</span>
            <b style="color:#665544">Coil Archer</b><span>Ranged bolts, keeps distance</span>
            <b style="color:#aa8844">Brass Golem</b><span>Slow, massive HP, heavy hits</span>
            <b style="color:#554455">Clock Spider</b><span>Fast, low HP, swarms</span>
            <b style="color:#882244">Chronovore</b><span>Boss — drains time, multi-armed</span>
          </div>
          <p><b style="color:#ffd700">Abilities:</b> Strike (melee), Gear Cast (ranged projectile), Slow Zone (area slow), Reversal (rewind enemies), Time Stop (freeze all), Chrono Dash (invincible dodge)</p>
          <p><b style="color:#ffd700">Pendulum Rhythm:</b> Watch the pendulum swing. Strike at the apex for 1.5-1.8x damage multiplier!</p>
        </div>`;
      }
      panel.innerHTML = `
        <div style="font-size:28px;font-weight:bold;color:#ccaa44;text-align:center;margin-bottom:4px;letter-spacing:4px;text-shadow:0 0 12px rgba(204,170,68,0.4)">PAUSED</div>
        <div style="text-align:center;color:#665;font-size:12px;margin-bottom:16px">Wave ${s.wave} | HP: ${Math.ceil(s.playerHp)}/${s.playerMaxHp} | Tower: ${Math.ceil(s.towerHp)}/${s.towerMaxHp}</div>
        <div style="display:flex;gap:4px;margin-bottom:14px;justify-content:center">
          ${["controls","intro","concepts"].map(t=>`<button class="pd-tab" data-t="${t}" style="padding:6px 14px;font-size:12px;font-weight:bold;background:${tab===t?"rgba(204,170,68,0.2)":"rgba(20,15,30,0.6)"};color:${tab===t?"#ccaa44":"#777"};border:1px solid ${tab===t?"#ccaa44":"#444"};border-radius:4px;cursor:pointer;pointer-events:auto">${t==="concepts"?"Enemies & Abilities":t.charAt(0).toUpperCase()+t.slice(1)}</button>`).join("")}
        </div>
        <div style="min-height:210px;margin-bottom:18px">${c}</div>
        <div style="display:flex;flex-direction:column;gap:8px;align-items:center">
          <button id="pd-resume" style="width:100%;padding:10px;font-size:16px;font-weight:bold;background:linear-gradient(180deg,rgba(204,170,68,0.15),rgba(204,170,68,0.05));color:#ccaa44;border:2px solid rgba(204,170,68,0.5);border-radius:6px;cursor:pointer;letter-spacing:2px;pointer-events:auto">RESUME</button>
          <button id="pd-exit" style="width:100%;padding:8px;font-size:13px;background:none;color:#884444;border:1px solid #553333;border-radius:4px;cursor:pointer;pointer-events:auto">EXIT TO MENU</button>
        </div>`;
      panel.querySelectorAll(".pd-tab").forEach(b=>(b as HTMLElement).onclick=()=>{tab=(b as HTMLElement).dataset.t!;render();});
      (panel.querySelector("#pd-resume") as HTMLElement).onclick=()=>this._closeEscMenu();
      (panel.querySelector("#pd-exit") as HTMLElement).onclick=()=>{this._closeEscMenu();this.destroy();};
    };
    div.appendChild(panel);
    document.body.appendChild(div);
    this._escMenuDiv = div;
    render();
  }

  private _closeEscMenu(): void {
    if (this._escMenuDiv) { this._escMenuDiv.remove(); this._escMenuDiv = null; }
    this._state.paused = false;
  }

  destroy(): void {
    if (this._escMenuDiv) { this._escMenuDiv.remove(); this._escMenuDiv = null; }
    if (this._rafId !== null) { cancelAnimationFrame(this._rafId); this._rafId = null; }
    this._unregisterInput();
    this._renderer.cleanup();
    this._hud.cleanup();
    const pixiCanvas = document.querySelector("#pixi-container canvas") as HTMLCanvasElement | null;
    if (pixiCanvas) pixiCanvas.style.display = "";
    window.dispatchEvent(new Event("pendulumExit"));
  }
}
