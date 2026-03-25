// ---------------------------------------------------------------------------
// Merlin's Duel — Main Game Orchestrator
// ---------------------------------------------------------------------------

import { Ticker } from "pixi.js";
import { viewManager } from "../view/ViewManager";
import { DuelPhase, Element } from "./types";
import type { DuelState } from "./types";
import { DUEL_BALANCE as B } from "./config/DuelBalance";
import { createDuelState, loadDuelMeta, saveDuelMeta } from "./state/DuelState";
import {
  updateDuel, castSpell, startRound, buyShopItem,
  selectElement, getAvailableSpells, calculateShards,
} from "./systems/DuelGameSystem";
import { DuelRenderer } from "./view/DuelRenderer";
import {
  playDuelFireSpell, playDuelIceSpell, playDuelLightningSpell, playDuelArcaneSpell,
  playDuelShield, playDuelHit, playDuelBlock, playDuelVictory, playDuelDefeat,
  playDuelCountdown, playDuelFight, playDuelCritical, playDuelManaRestore,
  startDuelAmbience, stopDuelAmbience,
} from "./systems/DuelAudio";

export class MerlinDuelGame {
  private _state!: DuelState;
  private _renderer = new DuelRenderer();
  private _tickerCb: ((ticker: Ticker) => void) | null = null;
  private _meta = loadDuelMeta();
  private _keyDownHandler: ((e: KeyboardEvent) => void) | null = null;
  private _keyUpHandler: ((e: KeyboardEvent) => void) | null = null;

  private _prevPlayerHp = 0;
  private _prevEnemyHp = 0;
  private _prevPhase: DuelPhase = DuelPhase.START;

  async boot(): Promise<void> {
    viewManager.clearWorld();
    viewManager.camera.zoom = 1;
    viewManager.camera.keyboardEnabled = false;
    viewManager.camera.manualControlMode = true;
    const sw = viewManager.screenWidth, sh = viewManager.screenHeight;
    this._meta = loadDuelMeta();
    this._state = createDuelState(this._meta);
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
    stopDuelAmbience();
  }

  // -------------------------------------------------------------------------
  // Input
  // -------------------------------------------------------------------------

  private _initInput(): void {
    this._keyDownHandler = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const s = this._state;

      // --- START screen ---
      if (s.phase === DuelPhase.START) {
        if (e.code === "Space" || e.code === "Enter") { this._startRun(); e.preventDefault(); }
        else if (e.code === "Escape") { this._exit(); e.preventDefault(); }
        return;
      }

      // --- DEFEAT screen ---
      if (s.phase === DuelPhase.DEFEAT) {
        // Number keys for upgrades
        if (e.code >= "Digit1" && e.code <= "Digit5") {
          this._tryUpgrade(parseInt(e.code.charAt(5)) - 1);
          e.preventDefault();
          return;
        }
        if (e.code === "KeyR" || e.code === "Space" || e.code === "Enter") { this._startRun(); e.preventDefault(); }
        else if (e.code === "Escape") { this._exit(); e.preventDefault(); }
        return;
      }

      // --- VICTORY screen ---
      if (s.phase === DuelPhase.VICTORY) {
        if (e.code >= "Digit1" && e.code <= "Digit5") {
          this._tryUpgrade(parseInt(e.code.charAt(5)) - 1);
          e.preventDefault();
          return;
        }
        if (e.code === "Space" || e.code === "Enter") { this._startRun(); e.preventDefault(); }
        else if (e.code === "Escape") { this._exit(); e.preventDefault(); }
        return;
      }

      // --- SHOP screen ---
      if (s.phase === DuelPhase.SHOP) {
        if (e.code >= "Digit1" && e.code <= "Digit8") {
          const idx = parseInt(e.code.charAt(5)) - 1;
          if (buyShopItem(s, idx)) playDuelManaRestore();
          e.preventDefault();
          return;
        }
        if (e.code === "Space" || e.code === "Enter") {
          // Advance to next round
          startRound(s, s.round + 1);
          e.preventDefault();
          return;
        }
        if (e.code === "Escape") { this._exit(); e.preventDefault(); }
        return;
      }

      // --- Pause toggle ---
      if (e.code === "Escape" || e.code === "KeyP") {
        if (s.phase === DuelPhase.FIGHTING) s.phase = DuelPhase.PAUSED;
        else if (s.phase === DuelPhase.PAUSED) s.phase = DuelPhase.FIGHTING;
        e.preventDefault();
        return;
      }

      if (s.phase !== DuelPhase.FIGHTING) return;

      // --- Element selection (1-4) ---
      if (e.code === "Digit1") { selectElement(s, Element.FIRE); e.preventDefault(); return; }
      if (e.code === "Digit2") { selectElement(s, Element.ICE); e.preventDefault(); return; }
      if (e.code === "Digit3") { selectElement(s, Element.LIGHTNING); e.preventDefault(); return; }
      if (e.code === "Digit4") { selectElement(s, Element.ARCANE); e.preventDefault(); return; }

      // --- Spell casting (Q/W/E) ---
      if (e.code === "KeyQ" || e.code === "KeyW" || e.code === "KeyE") {
        const slotIndex = e.code === "KeyQ" ? 0 : e.code === "KeyW" ? 1 : 2;
        const available = getAvailableSpells(s);
        if (slotIndex < available.length) {
          const spell = available[slotIndex];
          if (castSpell(s, spell.id)) {
            this._playSpellAudio(spell.element);
          }
        }
        e.preventDefault();
        return;
      }

      // --- Space: cast first available spell ---
      if (e.code === "Space") {
        const available = getAvailableSpells(s);
        for (const spell of available) {
          if (castSpell(s, spell.id)) {
            this._playSpellAudio(spell.element);
            break;
          }
        }
        e.preventDefault();
        return;
      }

      // --- Movement ---
      if (e.code === "ArrowUp" || e.code === "KeyW") { /* handled above for KeyW */ }
      if (e.code === "ArrowUp") { s.moveUp = true; e.preventDefault(); return; }
      if (e.code === "ArrowDown") { s.moveDown = true; e.preventDefault(); return; }

      // --- Shield ---
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
        s.shieldActive = true;
        playDuelShield();
        e.preventDefault();
        return;
      }
    };

    this._keyUpHandler = (e: KeyboardEvent) => {
      const s = this._state;
      if (e.code === "ArrowUp") { s.moveUp = false; e.preventDefault(); }
      if (e.code === "ArrowDown") { s.moveDown = false; e.preventDefault(); }
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
        s.shieldActive = false;
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", this._keyDownHandler);
    window.addEventListener("keyup", this._keyUpHandler);
  }

  private _destroyInput(): void {
    if (this._keyDownHandler) { window.removeEventListener("keydown", this._keyDownHandler); this._keyDownHandler = null; }
    if (this._keyUpHandler) { window.removeEventListener("keyup", this._keyUpHandler); this._keyUpHandler = null; }
  }

  // -------------------------------------------------------------------------
  // Game loop
  // -------------------------------------------------------------------------

  private _loop(rawDt: number): void {
    if (!this._state) return;
    const dt = Math.min(rawDt, 0.1);
    const sw = viewManager.screenWidth, sh = viewManager.screenHeight;
    const s = this._state;

    // --- COUNTDOWN ---
    if (s.phase === DuelPhase.COUNTDOWN) {
      const prevSec = Math.ceil(s.countdownTimer);
      s.countdownTimer -= dt;
      const curSec = Math.ceil(s.countdownTimer);
      if (curSec !== prevSec && curSec > 0) playDuelCountdown();
      if (s.countdownTimer <= 0) {
        s.phase = DuelPhase.FIGHTING;
        playDuelFight();
        startDuelAmbience();
      }
    }

    // --- FIGHTING ---
    if (s.phase === DuelPhase.FIGHTING) {
      this._prevPlayerHp = s.playerHp;
      this._prevEnemyHp = s.enemy?.hp ?? 0;
      updateDuel(s, dt);

      this._triggerAudio(s);
    }

    // Track phase transitions
    if (s.phase !== this._prevPhase) {
      if (s.phase === DuelPhase.VICTORY) {
        playDuelVictory();
        stopDuelAmbience();
        this._saveRunResults();
      } else if (s.phase === DuelPhase.DEFEAT) {
        playDuelDefeat();
        stopDuelAmbience();
        this._saveRunResults();
      } else if (s.phase === DuelPhase.SHOP) {
        stopDuelAmbience();
      }
      this._prevPhase = s.phase;
    }

    this._renderer.render(s, sw, sh, this._meta);
  }

  // -------------------------------------------------------------------------
  // Audio triggers
  // -------------------------------------------------------------------------

  private _playSpellAudio(element: Element): void {
    switch (element) {
      case Element.FIRE: playDuelFireSpell(); break;
      case Element.ICE: playDuelIceSpell(); break;
      case Element.LIGHTNING: playDuelLightningSpell(); break;
      case Element.ARCANE: playDuelArcaneSpell(); break;
    }
  }

  private _triggerAudio(s: DuelState): void {
    // Player took damage
    if (s.playerHp < this._prevPlayerHp) {
      if (s.shieldActive) playDuelBlock();
      else playDuelHit();
    }
    // Enemy took damage
    if (s.enemy && s.enemy.hp < this._prevEnemyHp) {
      const dmg = this._prevEnemyHp - s.enemy.hp;
      if (dmg > 30) playDuelCritical();
      else playDuelHit();
    }
  }

  // -------------------------------------------------------------------------
  // Run lifecycle
  // -------------------------------------------------------------------------

  private _startRun(): void {
    this._meta = loadDuelMeta();
    this._state = createDuelState(this._meta);
    startRound(this._state, 1);
    this._prevPlayerHp = this._state.playerHp;
    this._prevEnemyHp = this._state.enemy?.hp ?? 0;
    this._prevPhase = DuelPhase.COUNTDOWN;
  }

  private _saveRunResults(): void {
    const s = this._state;
    const meta = loadDuelMeta();
    const shards = calculateShards(s);
    meta.shards += shards;
    if (s.round > meta.highestRound) meta.highestRound = s.round;
    if (s.phase === DuelPhase.VICTORY) meta.totalWins++;
    saveDuelMeta(meta);
    this._meta = meta;
  }

  private _tryUpgrade(index: number): void {
    const meta = this._meta;
    const keys = ["maxHp", "manaRegen", "spellPower", "shieldEfficiency", "startingGold"] as const;
    type UpKey = typeof keys[number];
    const key: UpKey | undefined = keys[index];
    if (!key) return;
    const costTable = B.UPGRADE_COSTS as Record<string, number[]>;
    const costs = costTable[key];
    if (!costs) return;
    const currentLevel = meta.upgrades[key];
    if (currentLevel >= costs.length) return;
    const cost = costs[currentLevel];
    if (meta.shards < cost) return;
    meta.shards -= cost;
    meta.upgrades[key] = currentLevel + 1;
    saveDuelMeta(meta);
    playDuelManaRestore();
  }

  private _exit(): void { window.dispatchEvent(new Event("merlinduelExit")); }
}
