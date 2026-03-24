// ---------------------------------------------------------------------------
// Wyrm — Main Game Orchestrator (v7)
// ---------------------------------------------------------------------------

import { Ticker } from "pixi.js";
import { viewManager } from "../view/ViewManager";
import { WyrmPhase, Direction } from "./types";
import type { WyrmState } from "./types";
import { createWyrmState, loadWyrmMeta, saveWyrmMeta } from "./state/WyrmState";
import {
  updateMovement, updateFireBreath, updatePickupSpawning, agePickups,
  updateWaves, updateSpeed, updateTimers, updateParticles, updateFloatingTexts,
  updateCombo, updateKnights, updateBoss, updateTrail, updateDeathSegments,
  updatePoisonTiles, checkKnightBodyCollisions,
  updateArchers, updateProjectiles, updateSynergies,
  updateWrath, tryTailWhip,
  prepareBlessingChoice, selectBlessing,
  spawnDeathScatter, spawnParticles, spawnFloatingText, enqueueDirection,
  checkMilestones, checkEvolution, calcDragonCoins, tryLunge, triggerHitstop,
} from "./systems/WyrmGameSystem";
import {
  playEat, playCombo, playPowerup, playFire,
  playShieldBreak, playDeath, playTurn, playWave,
  playPortal, playBossHit, playMilestone,
  startDrone, stopDrone,
} from "./systems/WyrmAudio";
import { WyrmRenderer } from "./view/WyrmRenderer";
import { WYRM_BALANCE as B } from "./config/WyrmBalance";

export class WyrmGame {
  private _state!: WyrmState;
  private _renderer = new WyrmRenderer();
  private _tickerCb: ((ticker: Ticker) => void) | null = null;
  private _meta = loadWyrmMeta();
  private _keyDownHandler: ((e: KeyboardEvent) => void) | null = null;

  private _prevCombo = 0;
  private _prevFire = 0;
  private _prevShieldHits = 0;
  private _prevWave = 0;
  private _prevLength = 0;
  private _prevSpeed = 0;
  private _prevBossAlive = false;
  private _prevBossHp = 0;

  async boot(): Promise<void> {
    viewManager.clearWorld();
    viewManager.camera.zoom = 1;
    viewManager.camera.keyboardEnabled = false;
    viewManager.camera.manualControlMode = true;
    const sw = viewManager.screenWidth, sh = viewManager.screenHeight;
    const { cols, rows } = this._gridSize(sw, sh);
    this._meta = loadWyrmMeta();
    this._state = createWyrmState(cols, rows, this._meta);
    this._renderer.build(sw, sh);
    viewManager.addToLayer("background", this._renderer.container);
    this._initInput();
    this._tickerCb = (ticker: Ticker) => this._loop(ticker.deltaMS / 1000);
    viewManager.app.ticker.add(this._tickerCb);
  }

  destroy(): void {
    if (this._tickerCb) { viewManager.app.ticker.remove(this._tickerCb); this._tickerCb = null; }
    this._destroyInput();
    this._renderer.destroy();
    viewManager.removeFromLayer("background", this._renderer.container);
    viewManager.camera.keyboardEnabled = true;
    viewManager.camera.manualControlMode = false;
    viewManager.clearWorld();
  }

  private _gridSize(sw: number, sh: number) {
    const m = 8;
    return { cols: Math.max(B.MIN_COLS, Math.floor((sw - m * 2) / B.CELL_SIZE)), rows: Math.max(B.MIN_ROWS, Math.floor((sh - m * 2) / B.CELL_SIZE)) };
  }

  private _initInput(): void {
    this._keyDownHandler = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const s = this._state;
      if (s.phase === WyrmPhase.START) {
        if (e.code === "Space" || e.code === "Enter") { this._start(); e.preventDefault(); }
        else if (e.code === "Escape") { this._exit(); e.preventDefault(); }
        return;
      }
      if (s.phase === WyrmPhase.DEAD) {
        if (e.code >= "Digit1" && e.code <= "Digit6") {
          this._tryUpgrade(parseInt(e.code.charAt(5)) - 1);
          e.preventDefault();
          return;
        }
        if (e.code === "KeyR" || e.code === "Space" || e.code === "Enter") { this._start(); e.preventDefault(); }
        else if (e.code === "Escape") { this._exit(); e.preventDefault(); }
        return;
      }
      // Blessing selection
      if (s.phase === WyrmPhase.BLESSING) {
        if (e.code === "Digit1") { selectBlessing(s, 0); playPowerup(); e.preventDefault(); }
        else if (e.code === "Digit2") { selectBlessing(s, 1); playPowerup(); e.preventDefault(); }
        else if (e.code === "Digit3") { selectBlessing(s, 2); playPowerup(); e.preventDefault(); }
        return;
      }
      if (e.code === "Escape") {
        s.phase = s.phase === WyrmPhase.PLAYING ? WyrmPhase.PAUSED : WyrmPhase.PLAYING;
        e.preventDefault(); return;
      }
      if (s.phase !== WyrmPhase.PLAYING) return;

      // Lunge on Space
      if (e.code === "Space") {
        const lunged = tryLunge(s, this._meta.upgrades || { fasterLunge: 0 });
        if (lunged) playEat();
        e.preventDefault();
        return;
      }

      // Tail whip on Shift or E
      if (e.code === "ShiftLeft" || e.code === "ShiftRight" || e.code === "KeyE") {
        const whipped = tryTailWhip(s);
        if (whipped) playShieldBreak(); // metallic sound fits
        e.preventDefault();
        return;
      }

      let d: Direction | null = null;
      switch (e.code) {
        case "ArrowUp": case "KeyW": d = Direction.UP; break;
        case "ArrowRight": case "KeyD": d = Direction.RIGHT; break;
        case "ArrowDown": case "KeyS": d = Direction.DOWN; break;
        case "ArrowLeft": case "KeyA": d = Direction.LEFT; break;
      }
      if (d !== null) { enqueueDirection(s, d); playTurn(); e.preventDefault(); }
    };
    window.addEventListener("keydown", this._keyDownHandler);
  }

  private _destroyInput(): void {
    if (this._keyDownHandler) { window.removeEventListener("keydown", this._keyDownHandler); this._keyDownHandler = null; }
  }

  private _loop(rawDt: number): void {
    if (!this._state) return;
    const dt = Math.min(rawDt, 0.1);
    const sw = viewManager.screenWidth, sh = viewManager.screenHeight;
    const s = this._state;

    if (s.phase === WyrmPhase.PLAYING) {
      // Hitstop: skip gameplay update but still render
      if (s.hitstopTimer > 0) {
        s.hitstopTimer -= dt;
        // Still update visual-only stuff
        updateParticles(s, dt);
        updateFloatingTexts(s, dt);
        updateDeathSegments(s, dt);
        this._renderer.render(s, sw, sh, this._meta);
        return;
      }

      this._prevCombo = s.comboCount;
      this._prevFire = s.fireBreathTimer;
      this._prevShieldHits = s.shieldHits;
      this._prevWave = s.wave;
      this._prevLength = s.length;
      this._prevSpeed = s.speedBoostTimer;
      this._prevBossAlive = !!(s.boss && s.boss.alive);
      this._prevBossHp = s.boss?.hp ?? 0;

      const died = updateMovement(s, dt);
      if (died) { this._die(); }
      else {
        updateFireBreath(s, dt);
        updatePickupSpawning(s, dt);
        agePickups(s, dt);
        updateKnights(s, dt);
        updateBoss(s, dt);
        updateArchers(s, dt);
        updateProjectiles(s, dt);
        updatePoisonTiles(s, dt);
        checkKnightBodyCollisions(s);
        updateWaves(s, dt);
        updateCombo(s, dt);
        updateSpeed(s);
        updateTimers(s, dt);
        updateTrail(s, dt);
        updateSynergies(s);
        updateWrath(s, dt);

        // Score milestones
        const milestone = checkMilestones(s);
        if (milestone) {
          spawnFloatingText(s, s.body[0].x, s.body[0].y - 2, milestone + "!", B.COLOR_MILESTONE, 2.0);
          s.screenFlashColor = B.COLOR_MILESTONE; s.screenFlashTimer = B.FLASH_DURATION * 2;
          playMilestone();
        }

        // Evolution tier announcement + blessing offer
        const evo = checkEvolution(s);
        if (evo) {
          spawnFloatingText(s, s.body[0].x, s.body[0].y - 3, `EVOLVED: ${evo}!`, B.COLOR_MILESTONE, 2.2);
          s.screenFlashColor = B.COLOR_MILESTONE; s.screenFlashTimer = B.FLASH_DURATION * 3;
          s.screenShake = B.SHAKE_DURATION;
          playMilestone();
          // Offer blessing choice
          prepareBlessingChoice(s);
        }

        this._audio(s);
      }
    }

    updateParticles(s, dt);
    updateFloatingTexts(s, dt);
    updateDeathSegments(s, dt);
    if (s.phase !== WyrmPhase.PLAYING) s.time += dt;

    this._renderer.render(s, sw, sh, this._meta);
  }

  private _audio(s: WyrmState): void {
    if (s.length > this._prevLength) playEat();
    if (s.comboCount > this._prevCombo && s.comboCount >= 3) playCombo(s.comboCount);
    if (s.fireBreathTimer > 0 && this._prevFire <= 0) { playFire(); playPowerup(); }
    if (this._prevShieldHits > 0 && s.shieldHits < this._prevShieldHits) playShieldBreak();
    if (s.shieldHits > 0 && this._prevShieldHits === 0) playPowerup();
    if (s.speedBoostTimer > 0 && this._prevSpeed <= 0) playPowerup();
    if (s.wave > this._prevWave) playWave();
    if (s.portalUsedThisFrame) { playPortal(); s.portalUsedThisFrame = false; }
    if (s.boss && s.boss.alive && s.boss.hp < this._prevBossHp) playBossHit();
    if (this._prevBossAlive && (!s.boss || !s.boss.alive)) playMilestone();
    // Synergy activation
    if (s.synergyAnnouncedThisFrame) { playPowerup(); s.synergyAnnouncedThisFrame = false; }
    if (s.wrathAnnouncedThisFrame) { playFire(); playPowerup(); s.wrathAnnouncedThisFrame = false; }
  }

  private _start(): void {
    const sw = viewManager.screenWidth, sh = viewManager.screenHeight;
    const { cols, rows } = this._gridSize(sw, sh);
    this._meta = loadWyrmMeta();
    this._state = createWyrmState(cols, rows, this._meta);
    this._state.phase = WyrmPhase.PLAYING;
    this._prevCombo = 0; this._prevFire = 0; this._prevShieldHits = 0;
    this._prevWave = 0; this._prevLength = this._state.length; this._prevSpeed = 0;
    this._prevBossAlive = false; this._prevBossHp = 0;
    startDrone();
  }

  private _die(): void {
    const s = this._state;
    if (s.phase === WyrmPhase.DEAD) return;
    s.phase = WyrmPhase.DEAD;
    spawnDeathScatter(s);
    spawnParticles(s, s.body[0].x, s.body[0].y, B.PARTICLE_COUNT_DEATH, B.COLOR_WYRM_HEAD);
    s.screenShake = B.SHAKE_DURATION * 2;
    s.screenFlashColor = 0xff0000; s.screenFlashTimer = B.FLASH_DURATION * 2.5;
    triggerHitstop(s, B.HITSTOP_DEATH);
    playDeath();
    stopDrone();

    const meta = loadWyrmMeta();
    meta.gamesPlayed++;
    meta.totalSheepEaten += s.sheepEaten;
    meta.totalKnightsEaten += s.knightsEaten;
    meta.totalTimePlayed += Math.floor(s.time);
    meta.totalBossesKilled += s.bossesKilled;
    const score = Math.floor(s.score);
    const coins = calcDragonCoins(score);
    meta.dragonCoins += coins;
    if (score > meta.highScore) meta.highScore = score;
    if (s.length > meta.bestLength) meta.bestLength = s.length;
    if (s.bestCombo > meta.bestCombo) meta.bestCombo = s.bestCombo;
    saveWyrmMeta(meta);
    this._meta = meta;
  }

  private _tryUpgrade(index: number): void {
    const meta = this._meta;
    if (!meta.upgrades) return;
    const keys = ["extraStartLength", "longerFire", "fasterLunge", "thickerShield", "poisonResist", "comboKeeper"] as const;
    type UpKey = typeof keys[number];
    const key: UpKey | undefined = keys[index];
    if (!key) return;
    const costTable = B.UPGRADE_COSTS as Record<string, number[]>;
    const costs = costTable[key];
    if (!costs) return;
    const currentLevel = meta.upgrades[key];
    if (currentLevel >= costs.length) return;
    const cost = costs[currentLevel];
    if (meta.dragonCoins < cost) return;
    meta.dragonCoins -= cost;
    meta.upgrades[key] = currentLevel + 1;
    saveWyrmMeta(meta);
    playPowerup();
  }

  private _exit(): void { window.dispatchEvent(new Event("wyrmExit")); }
}
