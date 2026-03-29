// ---------------------------------------------------------------------------
// Void Knight — Main Game Orchestrator (v2)
// ---------------------------------------------------------------------------

import { Ticker } from "pixi.js";
import { viewManager } from "../view/ViewManager";
import { VKPhase } from "./types";
import type { VKState } from "./types";
import { createVKState, loadVKMeta, saveVKMeta } from "./state/VoidKnightState";
import {
  updatePlayer, tryDash, tryGrazeBurst, updateSpawners, updateProjectiles,
  updateOrbs, updateWave, updateTimers, updateMultiplier,
  updateParticles, updateFloatTexts, updateShockwaves, updateStreak,
  spawnWave, spawnDeathEffect, preparePerkChoice, selectPerk,
  checkUnlocks, spawnFloatText,
  startTutorial, updateTutorial,
} from "./systems/VoidKnightSystem";
import { VK } from "./config/VoidKnightBalance";
import {
  playVKDash, playVKCollect, playVKNearMiss, playVKHit, playVKDeath,
  playVKWave, playVKDashReady, playVKMultMilestone,
  startVKDrone, stopVKDrone, updateVKAudio,
} from "./systems/VoidKnightAudio";
import { VoidKnightRenderer } from "./view/VoidKnightRenderer";

export class VoidKnightGame {
  private _state!: VKState;
  private _renderer = new VoidKnightRenderer();
  private _tickerCb: ((ticker: Ticker) => void) | null = null;
  private _meta = loadVKMeta();
  private _keys = new Set<string>();
  private _keyDownHandler: ((e: KeyboardEvent) => void) | null = null;
  private _keyUpHandler: ((e: KeyboardEvent) => void) | null = null;

  private _prevNearMisses = 0;
  private _prevOrbCount = 0;
  private _prevWave = 0;
  private _prevShield = 0;
  private _prevDashCD = 0;
  private _prevMultFloor = 1;
  private _escMenuDiv: HTMLDivElement | null = null;

  async boot(): Promise<void> {
    viewManager.clearWorld();
    viewManager.camera.zoom = 1;
    viewManager.camera.keyboardEnabled = false;
    viewManager.camera.manualControlMode = true;
    const sw = viewManager.screenWidth, sh = viewManager.screenHeight;
    this._meta = loadVKMeta();
    this._state = createVKState(sw, sh, this._meta);
    this._renderer.build(sw, sh);
    viewManager.addToLayer("background", this._renderer.container);
    this._initInput();
    this._tickerCb = (ticker: Ticker) => this._loop(ticker.deltaMS / 1000);
    viewManager.app.ticker.add(this._tickerCb);
  }

  private _openEscMenu(): void {
    if (this._escMenuDiv) return;
    const div = document.createElement("div");
    div.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(2,2,8,0.85);z-index:40;display:flex;align-items:center;justify-content:center;font-family:'Segoe UI',sans-serif;";
    const panel = document.createElement("div");
    panel.style.cssText = "background:rgba(8,8,20,0.97);border:2px solid rgba(100,80,200,0.5);border-radius:12px;padding:28px 36px;min-width:460px;max-width:560px;color:#d0c8e0;";
    let tab = "controls";
    const s = this._state;
    const render = () => {
      let c = "";
      if (tab === "controls") {
        c = `<div style="font-size:13px;line-height:2;text-align:left">
          <div><span style="display:inline-block;min-width:110px;color:#8866ff;font-weight:bold">WASD / Arrows</span> Move</div>
          <div><span style="display:inline-block;min-width:110px;color:#8866ff;font-weight:bold">Space / Shift</span> Dash (invincible dodge)</div>
          <div><span style="display:inline-block;min-width:110px;color:#8866ff;font-weight:bold">E</span> Graze Burst (when charged)</div>
          <div><span style="display:inline-block;min-width:110px;color:#8866ff;font-weight:bold">Q</span> Time Warp (slow-mo)</div>
          <div><span style="display:inline-block;min-width:110px;color:#8866ff;font-weight:bold">1 / 2 / 3</span> Select perk (upgrade screen)</div>
          <div><span style="display:inline-block;min-width:110px;color:#8866ff;font-weight:bold">R</span> Restart (when dead)</div>
          <div><span style="display:inline-block;min-width:110px;color:#8866ff;font-weight:bold">ESC</span> Pause / Resume</div>
        </div>`;
      } else if (tab === "intro") {
        c = `<div style="font-size:13px;line-height:1.7;color:#aaa8bb">
          <p><b style="color:#8866ff">Void Knight</b> is a bullet-hell survivor. You are a spectral knight trapped in the Void, surrounded by endless waves of eldritch spawners that fire spiraling projectile patterns.</p>
          <p><b style="color:#ffd700">Survive</b> as long as you can. Collect orbs to build your score multiplier. Near-misses (grazing bullets) charge your Graze Burst ability.</p>
          <p style="margin-top:10px"><b style="color:#ffd700">Dash</b> makes you invincible for a brief moment — time it to phase through dense bullet patterns.</p>
          <p><b style="color:#ffd700">Orbs:</b> Yellow = points, Blue = shield, Green = magnet, Red = reflect, Purple = time slow</p>
          <p><b style="color:#ffd700">Multiplier:</b> Collecting orbs without getting hit builds your multiplier up to 8x. Getting hit resets it.</p>
        </div>`;
      } else {
        c = `<div style="font-size:13px;line-height:1.7;color:#aaa8bb">
          <p><b style="color:#ffd700">Spawners</b> — Eldritch entities that orbit the arena and fire bullet patterns. Destroy them to clear waves.</p>
          <p><b style="color:#ffd700">Bullet Patterns:</b></p>
          <div style="display:grid;grid-template-columns:auto 1fr;gap:2px 12px;margin:6px 0">
            <b style="color:#ff4466">Aimed</b><span>Tracks your position</span>
            <b style="color:#ff8844">Ring</b><span>Circular burst outward</span>
            <b style="color:#44aaff">Spiral</b><span>Rotating spiral arms</span>
            <b style="color:#ffaa44">Cross</b><span>Cardinal direction burst</span>
            <b style="color:#aa44ff">Helix</b><span>Double helix pattern</span>
            <b style="color:#ff66aa">Shotgun</b><span>Narrow cone of pellets</span>
          </div>
          <p><b style="color:#ffd700">Perks:</b> Every few waves you choose from 3 random upgrades — speed, dash cooldown, extra shields, larger magnet, etc.</p>
          <p><b style="color:#ffd700">Mutators:</b> Later waves add modifiers like Phantom (invisible bullets), Homing, or Speed Up.</p>
        </div>`;
      }
      panel.innerHTML = `
        <div style="font-size:28px;font-weight:bold;color:#8866ff;text-align:center;margin-bottom:4px;letter-spacing:4px;text-shadow:0 0 15px rgba(136,102,255,0.4)">PAUSED</div>
        <div style="text-align:center;color:#556;font-size:12px;margin-bottom:16px">Wave ${s.wave} | Score: ${Math.floor(s.score)} | Multiplier: ${s.multiplier.toFixed(1)}x</div>
        <div style="display:flex;gap:4px;margin-bottom:14px;justify-content:center">
          ${["controls","intro","concepts"].map(t=>`<button class="vk-tab" data-t="${t}" style="padding:6px 14px;font-size:12px;font-weight:bold;background:${tab===t?"rgba(136,102,255,0.2)":"rgba(20,20,40,0.6)"};color:${tab===t?"#8866ff":"#777"};border:1px solid ${tab===t?"#8866ff":"#444"};border-radius:4px;cursor:pointer;pointer-events:auto">${t==="concepts"?"Enemies & Perks":t.charAt(0).toUpperCase()+t.slice(1)}</button>`).join("")}
        </div>
        <div style="min-height:210px;margin-bottom:18px">${c}</div>
        <div style="display:flex;flex-direction:column;gap:8px;align-items:center">
          <button id="vk-resume" style="width:100%;padding:10px;font-size:16px;font-weight:bold;background:linear-gradient(180deg,rgba(136,102,255,0.15),rgba(136,102,255,0.05));color:#8866ff;border:2px solid rgba(136,102,255,0.5);border-radius:6px;cursor:pointer;letter-spacing:2px;pointer-events:auto">RESUME</button>
          <button id="vk-exit" style="width:100%;padding:8px;font-size:13px;background:none;color:#884444;border:1px solid #553333;border-radius:4px;cursor:pointer;pointer-events:auto">EXIT TO MENU</button>
        </div>`;
      panel.querySelectorAll(".vk-tab").forEach(b=>(b as HTMLElement).onclick=()=>{tab=(b as HTMLElement).dataset.t!;render();});
      (panel.querySelector("#vk-resume") as HTMLElement).onclick=()=>this._closeEscMenu();
      (panel.querySelector("#vk-exit") as HTMLElement).onclick=()=>{this._closeEscMenu();this._exit();};
    };
    div.appendChild(panel);
    document.body.appendChild(div);
    this._escMenuDiv = div;
    render();
  }

  private _closeEscMenu(): void {
    if (this._escMenuDiv) { this._escMenuDiv.remove(); this._escMenuDiv = null; }
    this._state.phase = VKPhase.PLAYING;
  }

  destroy(): void {
    if (this._escMenuDiv) { this._escMenuDiv.remove(); this._escMenuDiv = null; }
    if (this._tickerCb) { viewManager.app.ticker.remove(this._tickerCb); this._tickerCb = null; }
    this._destroyInput();
    this._renderer.destroy();
    viewManager.removeFromLayer("background", this._renderer.container);
    viewManager.camera.keyboardEnabled = true;
    viewManager.camera.manualControlMode = false;
    viewManager.clearWorld();
  }

  private _initInput(): void {
    this._keyDownHandler = (e: KeyboardEvent) => {
      this._keys.add(e.code);
      if (e.repeat) return;
      const s = this._state;

      if (s.phase === VKPhase.START) {
        if (e.code === "Space" || e.code === "Enter") { this._start(); e.preventDefault(); }
        else if (e.code === "Escape") { this._exit(); e.preventDefault(); }
        return;
      }
      if (s.phase === VKPhase.DEAD) {
        if (e.code === "KeyR" || e.code === "Space" || e.code === "Enter") { this._start(); e.preventDefault(); }
        else if (e.code === "Escape") { this._exit(); e.preventDefault(); }
        return;
      }
      // Perk selection
      if (s.phase === VKPhase.UPGRADE) {
        if (e.code === "Digit1") { selectPerk(s, 0); playVKCollect(); e.preventDefault(); }
        else if (e.code === "Digit2") { selectPerk(s, 1); playVKCollect(); e.preventDefault(); }
        else if (e.code === "Digit3") { selectPerk(s, 2); playVKCollect(); e.preventDefault(); }
        return;
      }
      if (e.code === "Escape") {
        if (this._escMenuDiv) { this._closeEscMenu(); e.preventDefault(); return; }
        if (s.phase === VKPhase.PLAYING) { s.phase = VKPhase.PAUSED; this._openEscMenu(); e.preventDefault(); return; }
        if (s.phase === VKPhase.PAUSED) { this._closeEscMenu(); e.preventDefault(); return; }
      }
      if (s.phase !== VKPhase.PLAYING) return;

      // Dash
      if (e.code === "Space" || e.code === "ShiftLeft" || e.code === "ShiftRight") {
        if (tryDash(s, this._keys)) playVKDash();
        e.preventDefault();
      }
      // Graze burst
      if (e.code === "KeyE" || e.code === "KeyQ") {
        if (tryGrazeBurst(s)) playVKWave();
        e.preventDefault();
      }
    };
    this._keyUpHandler = (e: KeyboardEvent) => { this._keys.delete(e.code); };
    window.addEventListener("keydown", this._keyDownHandler);
    window.addEventListener("keyup", this._keyUpHandler);
  }

  private _destroyInput(): void {
    if (this._keyDownHandler) { window.removeEventListener("keydown", this._keyDownHandler); this._keyDownHandler = null; }
    if (this._keyUpHandler) { window.removeEventListener("keyup", this._keyUpHandler); this._keyUpHandler = null; }
    this._keys.clear();
  }

  private _loop(rawDt: number): void {
    if (!this._state) return;
    const dt = Math.min(rawDt, 0.1);
    const sw = viewManager.screenWidth, sh = viewManager.screenHeight;
    const s = this._state;

    if (s.phase === VKPhase.PLAYING) {
      // Hitstop: skip gameplay but still render
      if (s.hitstopTimer > 0) {
        s.hitstopTimer -= dt;
        updateParticles(s, dt);
        updateFloatTexts(s, dt);
        this._renderer.render(s, sw, sh, this._meta);
        return;
      }

      // Death replay slow-motion
      if (s.deathSlowTimer > 0) {
        const slowDt = dt * VK.DEATH_SLOW_FACTOR;
        updatePlayer(s, slowDt, this._keys);
        updateProjectiles(s, slowDt);
        updateParticles(s, slowDt);
        updateFloatTexts(s, slowDt);
        updateShockwaves(s, slowDt);
        updateTimers(s, dt); // real dt for the death timer itself
        this._renderer.render(s, sw, sh, this._meta);
        if (s.deathSlowTimer <= 0) {
          this._die();
        }
        return;
      }

      // Tutorial
      if (s.tutorialStep > 0 && s.tutorialStep <= 3) {
        updatePlayer(s, dt, this._keys);
        updateProjectiles(s, dt);
        updateSpawners(s, dt);
        updateTutorial(s, dt);
        updateParticles(s, dt);
        updateFloatTexts(s, dt);
        updateTimers(s, dt);
        this._renderer.render(s, sw, sh, this._meta);
        return;
      }

      this._prevNearMisses = s.nearMisses;
      this._prevOrbCount = s.orbsCollected;
      this._prevWave = s.wave;
      this._prevShield = s.shieldHits;
      this._prevDashCD = s.dashCooldown;
      this._prevMultFloor = Math.floor(s.multiplier);

      updatePlayer(s, dt, this._keys);
      const died = updateProjectiles(s, dt);

      if (died) {
        // Don't immediately die — enter death slow-mo first
        if (s.deathSlowTimer <= 0) {
          spawnDeathEffect(s);
          playVKDeath();
          // deathSlowTimer was set by triggerDeathReplay in updateProjectiles
          // If it somehow wasn't set, die immediately
          if (s.deathSlowTimer <= 0) this._die();
        }
      } else {
        updateSpawners(s, dt);
        updateOrbs(s, dt);
        updateWave(s, dt);
        updateMultiplier(s, dt);
        updateShockwaves(s, dt);
        updateStreak(s, dt);
        updateTimers(s, dt);
        this._audio(s);
        const hasBoss = s.spawners.some(sp => sp.alive && sp.isBoss);
        updateVKAudio(s.multiplier, s.projectiles.length, s.wave, hasBoss, s.slowTimer > 0);
        if (s.wavesCleared > 0 && s.wavesCleared % 2 === 0 && s.perkChoices.length === 0 && s.wave > this._prevWave) {
          preparePerkChoice(s);
        }
      }
    }

    updateParticles(s, dt);
    updateFloatTexts(s, dt);
    if (s.phase !== VKPhase.PLAYING) s.time += dt;

    this._renderer.render(s, sw, sh, this._meta);
  }

  private _audio(s: VKState): void {
    if (s.nearMisses > this._prevNearMisses) playVKNearMiss();
    if (s.orbsCollected > this._prevOrbCount) playVKCollect();
    if (s.wave > this._prevWave) playVKWave();
    if (s.shieldHits < this._prevShield && this._prevShield > 0) playVKHit();
    // Dash ready audio cue
    if (s.dashCooldown <= 0 && this._prevDashCD > 0) playVKDashReady();
    // Multiplier milestone audio
    const multFloor = Math.floor(s.multiplier);
    if (multFloor > this._prevMultFloor && multFloor >= 2) playVKMultMilestone(multFloor);
  }

  private _start(): void {
    const sw = viewManager.screenWidth, sh = viewManager.screenHeight;
    this._meta = loadVKMeta();
    this._state = createVKState(sw, sh, this._meta);
    this._state.phase = VKPhase.PLAYING;
    this._prevNearMisses = 0; this._prevOrbCount = 0; this._prevWave = 0; this._prevShield = 0;
    // Tutorial for first-time players
    if (this._meta.gamesPlayed === 0) {
      startTutorial(this._state);
    } else {
      spawnWave(this._state);
    }
    startVKDrone();
  }

  private _die(): void {
    const s = this._state;
    if (s.phase === VKPhase.DEAD) return;
    s.phase = VKPhase.DEAD;
    spawnDeathEffect(s);
    playVKDeath();
    stopVKDrone();

    const meta = loadVKMeta();
    meta.gamesPlayed++;
    meta.totalNearMisses += s.nearMisses;
    meta.totalOrbsCollected += s.orbsCollected;
    meta.totalSpawnersDestroyed += s.spawnersDestroyed;
    const score = Math.floor(s.score);
    if (score > meta.highScore) meta.highScore = score;
    if (s.wave > meta.bestWave) meta.bestWave = s.wave;
    if (s.peakMultiplier > meta.bestMultiplier) meta.bestMultiplier = s.peakMultiplier;
    // Check for new unlocks
    const newUnlocks = checkUnlocks(meta);
    for (const u of newUnlocks) {
      spawnFloatText(s, s.arenaCenterX, s.arenaCenterY + 40, `UNLOCKED: ${u}`, 0xffd700, 2.0);
    }
    saveVKMeta(meta);
    this._meta = meta;
  }

  private _exit(): void { window.dispatchEvent(new Event("voidknightExit")); }
}
