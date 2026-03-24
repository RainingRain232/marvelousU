// ---------------------------------------------------------------------------
// Conjurer — Main Game Orchestrator
// Bullet-hell spell arena survival
// ---------------------------------------------------------------------------

import { Ticker } from "pixi.js";
import { viewManager } from "../view/ViewManager";
import { ConjurerPhase, SpellElement } from "./types";
import type { ConjurerState } from "./types";
import { createConjurerState, loadConjurerMeta, saveConjurerMeta, calcArcaneShards } from "./state/ConjurerState";
import {
  movePlayer, setAim, castSpell, canCast, cycleElement, tryDodge, tryUltimate,
  updateWaves, updateEnemies, updateProjectiles, updateSpellEffects,
  updateManaCrystals, updateTimers, updateParticles, updateFloatingTexts,
  updatePassiveAura, trackCooldowns,
} from "./systems/ConjurerGameSystem";
import {
  playFireCast, playIceCast, playLightningCast, playVoidCast,
  playDamage, playWaveClear, playDeath, playVictory, playCycle, playDodge, playUltimate, playCooldownReady,
} from "./systems/ConjurerAudio";
import { ConjurerRenderer } from "./view/ConjurerRenderer";
import { CONJURER_BALANCE as B } from "./config/ConjurerBalance";

export class ConjurerGame {
  private _state!: ConjurerState;
  private _renderer = new ConjurerRenderer();
  private _tickerCb: ((ticker: Ticker) => void) | null = null;
  private _meta = loadConjurerMeta();
  private _keyDownHandler: ((e: KeyboardEvent) => void) | null = null;
  private _keyUpHandler: ((e: KeyboardEvent) => void) | null = null;

  // Held keys
  private _keys = new Set<string>();
  private _prevHp = 0;
  private _prevWave = 0;

  async boot(): Promise<void> {
    viewManager.clearWorld();
    viewManager.camera.zoom = 1;
    const sw = viewManager.screenWidth, sh = viewManager.screenHeight;
    this._meta = loadConjurerMeta();
    this._state = createConjurerState(sw, sh, this._meta);
    this._renderer.build();
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
    viewManager.clearWorld();
  }

  private _initInput(): void {
    this._keyDownHandler = (e: KeyboardEvent) => {
      this._keys.add(e.code);
      const s = this._state;

      if (s.phase === ConjurerPhase.START) {
        if (e.code === "Space" || e.code === "Enter") { this._startGame(); e.preventDefault(); }
        else if (e.code === "Escape") { this._exit(); e.preventDefault(); }
        return;
      }
      if (s.phase === ConjurerPhase.DEAD || s.phase === ConjurerPhase.VICTORY) {
        // Upgrade shop (1-5 keys)
        if (e.code >= "Digit1" && e.code <= "Digit5") {
          this._tryUpgrade(parseInt(e.code.charAt(5)) - 1);
          e.preventDefault(); return;
        }
        if (e.code === "Space" || e.code === "Enter") { this._startGame(); e.preventDefault(); }
        else if (e.code === "Escape") { this._exit(); e.preventDefault(); }
        return;
      }
      if (e.code === "Escape") {
        if (s.phase === ConjurerPhase.PLAYING || s.phase === ConjurerPhase.WAVE_CLEAR) s.phase = ConjurerPhase.PAUSED;
        else if (s.phase === ConjurerPhase.PAUSED) s.phase = ConjurerPhase.PLAYING;
        e.preventDefault(); return;
      }
      if (s.phase !== ConjurerPhase.PLAYING) return;

      // Cast spell
      if (e.code === "Space") {
        if (castSpell(s)) {
          switch (s.activeElement) {
            case SpellElement.FIRE: playFireCast(); break;
            case SpellElement.ICE: playIceCast(); break;
            case SpellElement.LIGHTNING: playLightningCast(); break;
            case SpellElement.VOID: playVoidCast(); break;
          }
        } else {
          // Failed cast feedback
          const reason = canCast(s);
          if (reason === "no_mana") {
            s.screenFlashColor = 0x4444ff;
            s.screenFlashTimer = 0.06;
          }
        }
        e.preventDefault(); return;
      }

      // Dodge roll (Shift)
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
        let dx = 0, dy = 0;
        if (this._keys.has("KeyW")) dy -= 1;
        if (this._keys.has("KeyS")) dy += 1;
        if (this._keys.has("KeyA")) dx -= 1;
        if (this._keys.has("KeyD")) dx += 1;
        if (tryDodge(s, dx, dy)) playDodge();
        e.preventDefault(); return;
      }

      // Ultimate (R)
      if (e.code === "KeyR") {
        if (tryUltimate(s)) playUltimate();
        e.preventDefault(); return;
      }

      // Cycle element
      if (e.code === "Tab") { cycleElement(s, 1); playCycle(); e.preventDefault(); return; }
      if (e.code === "Digit1") { s.activeElement = SpellElement.FIRE; playCycle(); e.preventDefault(); return; }
      if (e.code === "Digit2") { s.activeElement = SpellElement.ICE; playCycle(); e.preventDefault(); return; }
      if (e.code === "Digit3") { s.activeElement = SpellElement.LIGHTNING; playCycle(); e.preventDefault(); return; }
      if (e.code === "Digit4") { s.activeElement = SpellElement.VOID; playCycle(); e.preventDefault(); return; }
    };

    this._keyUpHandler = (e: KeyboardEvent) => { this._keys.delete(e.code); };
    window.addEventListener("keydown", this._keyDownHandler);
    window.addEventListener("keyup", this._keyUpHandler);
  }

  private _destroyInput(): void {
    if (this._keyDownHandler) { window.removeEventListener("keydown", this._keyDownHandler); this._keyDownHandler = null; }
    if (this._keyUpHandler) { window.removeEventListener("keyup", this._keyUpHandler); this._keyUpHandler = null; }
  }

  private _loop(rawDt: number): void {
    if (!this._state) return;
    const dt = Math.min(rawDt, 0.1);
    const sw = viewManager.screenWidth, sh = viewManager.screenHeight;
    const s = this._state;

    if (s.phase === ConjurerPhase.PLAYING) {
      // Continuous movement (WASD)
      let mx = 0, my = 0;
      if (this._keys.has("KeyW") || this._keys.has("ArrowUp")) my -= 1;
      if (this._keys.has("KeyS") || this._keys.has("ArrowDown")) my += 1;
      if (this._keys.has("KeyA") || this._keys.has("ArrowLeft")) mx -= 1;
      if (this._keys.has("KeyD") || this._keys.has("ArrowRight")) mx += 1;

      // WASD moves, arrows aim — but if only arrows held and no WASD, arrows move
      const hasWASD = this._keys.has("KeyW") || this._keys.has("KeyA") || this._keys.has("KeyS") || this._keys.has("KeyD");
      const hasArrows = this._keys.has("ArrowUp") || this._keys.has("ArrowDown") || this._keys.has("ArrowLeft") || this._keys.has("ArrowRight");

      if (hasWASD) {
        // WASD moves
        let wmx = 0, wmy = 0;
        if (this._keys.has("KeyW")) wmy -= 1;
        if (this._keys.has("KeyS")) wmy += 1;
        if (this._keys.has("KeyA")) wmx -= 1;
        if (this._keys.has("KeyD")) wmx += 1;
        movePlayer(s, wmx, wmy, dt);
        // Arrows aim
        if (hasArrows) {
          let ax = 0, ay = 0;
          if (this._keys.has("ArrowUp")) ay -= 1;
          if (this._keys.has("ArrowDown")) ay += 1;
          if (this._keys.has("ArrowLeft")) ax -= 1;
          if (this._keys.has("ArrowRight")) ax += 1;
          setAim(s, ax, ay);
        }
      } else if (hasArrows) {
        // Arrows move if no WASD
        let amx = 0, amy = 0;
        if (this._keys.has("ArrowUp")) amy -= 1;
        if (this._keys.has("ArrowDown")) amy += 1;
        if (this._keys.has("ArrowLeft")) amx -= 1;
        if (this._keys.has("ArrowRight")) amx += 1;
        movePlayer(s, amx, amy, dt);
      }

      // Auto-cast when holding space
      if (this._keys.has("Space")) {
        if (castSpell(s)) {
          switch (s.activeElement) {
            case SpellElement.FIRE: playFireCast(); break;
            case SpellElement.ICE: playIceCast(); break;
            case SpellElement.LIGHTNING: playLightningCast(); break;
            case SpellElement.VOID: playVoidCast(); break;
          }
        }
      }

      this._prevHp = s.hp;
      this._prevWave = s.wave;

      updateWaves(s, dt);
      updateEnemies(s, dt);
      updateProjectiles(s, dt);
      updateSpellEffects(s, dt);
      updateManaCrystals(s, dt);
      updatePassiveAura(s, dt);

      // Audio
      if (s.hp < this._prevHp) playDamage();
      if (s.wave > this._prevWave && s.wave > 1) playWaveClear();
      if (trackCooldowns(s)) playCooldownReady();
    }

    // Death/victory
    if (s.phase === ConjurerPhase.DEAD && this._prevHp > 0) {
      playDeath(); this._saveMeta(); this._prevHp = 0;
    }
    if (s.phase === ConjurerPhase.VICTORY) {
      playVictory(); this._saveMeta();
    }

    updateTimers(s, dt);
    updateParticles(s, dt);
    updateFloatingTexts(s, dt);

    this._renderer.render(s, sw, sh, this._meta);
  }

  private _startGame(): void {
    const sw = viewManager.screenWidth, sh = viewManager.screenHeight;
    this._meta = loadConjurerMeta();
    this._state = createConjurerState(sw, sh, this._meta);
    this._state.phase = ConjurerPhase.PLAYING;
    this._prevHp = this._state.hp;
    this._prevWave = 0;
  }

  private _saveMeta(): void {
    const s = this._state;
    const meta = loadConjurerMeta();
    meta.gamesPlayed++;
    const score = Math.floor(s.score);
    if (score > meta.highScore) meta.highScore = score;
    if (s.wave > meta.bestWave) meta.bestWave = s.wave;
    if (s.bestCombo > meta.bestCombo) meta.bestCombo = s.bestCombo;
    meta.totalKills += s.totalKills;
    meta.arcaneShards += calcArcaneShards(s);
    saveConjurerMeta(meta);
    this._meta = meta;
  }

  private _tryUpgrade(index: number): void {
    const meta = this._meta;
    const keys = ["maxHp", "manaRegen", "auraRange", "magnetRange", "dodgeSpeed"] as const;
    type UpKey = typeof keys[number];
    const key: UpKey | undefined = keys[index];
    if (!key) return;
    const costTable = B.UPGRADE_COSTS as Record<string, number[]>;
    const costs = costTable[key];
    if (!costs) return;
    const lvl = meta.upgrades[key];
    if (lvl >= costs.length) return;
    if (meta.arcaneShards < costs[lvl]) return;
    meta.arcaneShards -= costs[lvl];
    meta.upgrades[key] = lvl + 1;
    saveConjurerMeta(meta);
  }

  private _exit(): void {
    window.dispatchEvent(new Event("conjurerExit"));
  }
}
