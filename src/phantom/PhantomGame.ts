// ---------------------------------------------------------------------------
// Phantom — Main Game Orchestrator (v3)
// Held-key movement, peek, upgrade shop, floor modifiers
// ---------------------------------------------------------------------------

import { Ticker } from "pixi.js";
import { viewManager } from "../view/ViewManager";
import { PhantomPhase, StealthRating } from "./types";
import type { PhantomState } from "./types";
import { createPhantomState, loadPhantomMeta, savePhantomMeta, advanceFloor, calcShadowCoins } from "./state/PhantomState";
import {
  tryMovePlayer, throwStone, quickThrowStone, tryShadowDash, trySmokeBomb,
  updateGuards, updateDetection, updateSmokeTiles,
  updateStones, updateVisibility, updateAmbientParticles,
  updateTimers, updateParticles, updateFloatingTexts, updateGuardNoiseFlash,
  resumeFromCaught,
} from "./systems/PhantomGameSystem";
import {
  playStep, playRelicCollect, playKeyCollect, playDoorUnlock,
  playStonePickup, playStoneThrow, playStoneLand,
  playDetected, playCaught, playExitOpen, playFloorClear, playTrapTriggered,
  playHide, playGameOver, playVictory,
  playShadowDash, playSmokeBomb, playBackstab, playGhostRating,
  startDrone, stopDrone,
} from "./systems/PhantomAudio";
import { PhantomRenderer } from "./view/PhantomRenderer";
import { PHANTOM_BALANCE as B } from "./config/PhantomBalance";

const MAX_FLOORS = 20;
const DIR_DX = [0, 1, 0, -1];
const DIR_DY = [-1, 0, 1, 0];

export class PhantomGame {
  private _state!: PhantomState;
  private _renderer = new PhantomRenderer();
  private _tickerCb: ((ticker: Ticker) => void) | null = null;
  private _meta = loadPhantomMeta();
  private _keyDownHandler: ((e: KeyboardEvent) => void) | null = null;
  private _keyUpHandler: ((e: KeyboardEvent) => void) | null = null;

  // Audio tracking
  private _wasDetected = false;
  private _prevLives = 0;

  // Held-key movement
  private _heldDir = -1;
  private _heldTimer = 0;
  private _heldFirst = true; // is this the first repeat?

  // Pause menu
  private _pauseIndex = 0;
  private _pauseSubpage = ""; // "" = main menu, "controls", "howto", "about"

  async boot(): Promise<void> {
    viewManager.clearWorld();
    viewManager.camera.zoom = 1;
    const sw = viewManager.screenWidth, sh = viewManager.screenHeight;
    const { cols, rows } = this._gridSize(sw, sh);
    this._meta = loadPhantomMeta();
    this._state = createPhantomState(cols, rows, this._meta);
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

  private _gridSize(sw: number, sh: number) {
    return {
      cols: Math.max(B.MIN_COLS, Math.floor(sw / B.CELL_SIZE) + 8),
      rows: Math.max(B.MIN_ROWS, Math.floor(sh / B.CELL_SIZE) + 6),
    };
  }

  private _dirFromCode(code: string): number {
    switch (code) {
      case "ArrowUp": case "KeyW": return 0;
      case "ArrowRight": case "KeyD": return 1;
      case "ArrowDown": case "KeyS": return 2;
      case "ArrowLeft": case "KeyA": return 3;
      default: return -1;
    }
  }

  private _initInput(): void {
    this._keyDownHandler = (e: KeyboardEvent) => {
      const s = this._state;

      // Start screen
      if (s.phase === PhantomPhase.START) {
        if (e.code === "Space" || e.code === "Enter") { this._startGame(); e.preventDefault(); }
        else if (e.code === "Escape") { this._exit(); e.preventDefault(); }
        return;
      }

      // Game over — upgrade shop + retry
      if (s.phase === PhantomPhase.GAME_OVER || s.phase === PhantomPhase.VICTORY) {
        // Number keys for upgrades
        if (e.code >= "Digit1" && e.code <= "Digit5") {
          this._tryUpgrade(parseInt(e.code.charAt(5)) - 1);
          e.preventDefault(); return;
        }
        if (e.code === "Space" || e.code === "Enter") { this._startGame(); e.preventDefault(); }
        else if (e.code === "Escape") { this._exit(); e.preventDefault(); }
        return;
      }

      if (s.phase === PhantomPhase.FLOOR_CLEAR) {
        if (e.code === "Space" || e.code === "Enter") { this._nextFloor(); e.preventDefault(); }
        else if (e.code === "Escape") { this._exit(); e.preventDefault(); }
        return;
      }
      if (s.phase === PhantomPhase.CAUGHT) {
        if (e.code === "Space" || e.code === "Enter") { resumeFromCaught(s); e.preventDefault(); }
        else if (e.code === "Escape") { this._exit(); e.preventDefault(); }
        return;
      }

      if (e.code === "Escape") {
        if (s.phase === PhantomPhase.PLAYING) {
          s.phase = PhantomPhase.PAUSED;
          this._pauseIndex = 0;
          this._pauseSubpage = "";
        } else if (s.phase === PhantomPhase.PAUSED) {
          if (this._pauseSubpage) { this._pauseSubpage = ""; }
          else { s.phase = PhantomPhase.PLAYING; }
        }
        e.preventDefault(); return;
      }

      // Pause menu navigation
      if (s.phase === PhantomPhase.PAUSED) {
        if (this._pauseSubpage) {
          // Any key goes back to main pause menu
          if (e.code === "Space" || e.code === "Enter" || e.code === "Backspace") {
            this._pauseSubpage = "";
            e.preventDefault();
          }
          return;
        }
        const menuItems = 4; // Resume, Controls, How to Play, Exit
        if (e.code === "ArrowUp" || e.code === "KeyW") {
          this._pauseIndex = (this._pauseIndex - 1 + menuItems) % menuItems;
          e.preventDefault();
        } else if (e.code === "ArrowDown" || e.code === "KeyS") {
          this._pauseIndex = (this._pauseIndex + 1) % menuItems;
          e.preventDefault();
        } else if (e.code === "Space" || e.code === "Enter") {
          if (this._pauseIndex === 0) { s.phase = PhantomPhase.PLAYING; }
          else if (this._pauseIndex === 1) { this._pauseSubpage = "controls"; }
          else if (this._pauseIndex === 2) { this._pauseSubpage = "howto"; }
          else if (this._pauseIndex === 3) { this._exit(); }
          e.preventDefault();
        }
        return;
      }

      if (s.phase !== PhantomPhase.PLAYING) return;

      // Throw mode (legacy cursor mode if active)
      if (s.throwing) {
        let dx = 0, dy = 0;
        switch (e.code) {
          case "ArrowUp": case "KeyW": dy = -1; break;
          case "ArrowRight": case "KeyD": dx = 1; break;
          case "ArrowDown": case "KeyS": dy = 1; break;
          case "ArrowLeft": case "KeyA": dx = -1; break;
          case "Enter": case "Space":
            if (throwStone(s, s.throwTargetX, s.throwTargetY)) {
              playStoneThrow();
              setTimeout(() => playStoneLand(), B.STONE_FLY_TIME * 1000);
            }
            e.preventDefault(); return;
          case "Escape": case "KeyT": s.throwing = false; e.preventDefault(); return;
        }
        if (dx !== 0 || dy !== 0) {
          s.throwTargetX = Math.max(0, Math.min(s.cols - 1, s.throwTargetX + dx));
          s.throwTargetY = Math.max(0, Math.min(s.rows - 1, s.throwTargetY + dy));
          e.preventDefault();
        }
        return;
      }

      // Peek (Shift) — locks direction when first pressed
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
        if (!s.peeking) {
          s.peeking = true;
          s.peekDir = s.playerDir; // lock to current facing
        }
        e.preventDefault(); return;
      }

      if (e.code === "KeyQ") {
        if (tryShadowDash(s)) playShadowDash();
        else if (s.shadowDashCooldown > 0) { /* on cooldown, silently fail */ }
        // else: no shadow found, feedback was added in executeDash returning false
        e.preventDefault(); return;
      }
      if (e.code === "KeyE") {
        if (trySmokeBomb(s)) playSmokeBomb();
        e.preventDefault(); return;
      }
      // T = quick-throw in facing direction, Shift+T = cursor aim mode
      if (e.code === "KeyT" && s.stones > 0) {
        if (e.shiftKey) {
          // Cursor aim mode
          s.throwing = true;
          s.throwTargetX = Math.max(0, Math.min(s.cols - 1, s.playerX + DIR_DX[s.playerDir] * s.throwDistance));
          s.throwTargetY = Math.max(0, Math.min(s.rows - 1, s.playerY + DIR_DY[s.playerDir] * s.throwDistance));
        } else {
          // Quick throw
          if (quickThrowStone(s)) {
            playStoneThrow();
            setTimeout(() => playStoneLand(), B.STONE_FLY_TIME * 1000);
          }
        }
        e.preventDefault(); return;
      }
      // Adjust throw distance with [ and ]
      if (e.code === "BracketLeft") {
        s.throwDistance = Math.max(B.MIN_THROW_DISTANCE, s.throwDistance - 1);
        e.preventDefault(); return;
      }
      if (e.code === "BracketRight") {
        s.throwDistance = Math.min(B.MAX_THROW_DISTANCE, s.throwDistance + 1);
        e.preventDefault(); return;
      }
      if (e.code === "Space") { s.moveTimer = 0; e.preventDefault(); return; }

      // Movement (initial press)
      const dir = this._dirFromCode(e.code);
      if (dir >= 0 && !e.repeat) {
        this._heldDir = dir;
        this._heldTimer = 0;
        this._heldFirst = true;
        this._doMove(dir);
        e.preventDefault();
      }
    };

    this._keyUpHandler = (e: KeyboardEvent) => {
      const dir = this._dirFromCode(e.code);
      if (dir >= 0 && dir === this._heldDir) {
        this._heldDir = -1;
      }
      // Release peek
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
        this._state.peeking = false;
      }
    };

    window.addEventListener("keydown", this._keyDownHandler);
    window.addEventListener("keyup", this._keyUpHandler);
  }

  private _destroyInput(): void {
    if (this._keyDownHandler) { window.removeEventListener("keydown", this._keyDownHandler); this._keyDownHandler = null; }
    if (this._keyUpHandler) { window.removeEventListener("keyup", this._keyUpHandler); this._keyUpHandler = null; }
  }

  private _doMove(dir: number): void {
    const s = this._state;
    if (s.phase !== PhantomPhase.PLAYING) return;
    const result = tryMovePlayer(s, dir);
    if (result.moved) {
      if (s.stepsSinceLastSound % 2 === 0) playStep();
      if (result.collectedRelic) playRelicCollect();
      if (result.collectedKey) playKeyCollect();
      if (result.collectedStone) playStonePickup();
      if (result.enteredShadow) playHide();
      if (result.exitOpened) playExitOpen();
      if (result.floorCleared) {
        playFloorClear();
        if (s.floorStealthRating === StealthRating.GHOST) playGhostRating();
      }
      if (result.trappedTriggered) playTrapTriggered();
      if (result.backstabbed) playBackstab();
      if (result.unlockedDoor) playDoorUnlock();
      if (s.lives < this._prevLives) playCaught();
      this._prevLives = s.lives;
    }
  }

  private _loop(rawDt: number): void {
    if (!this._state) return;
    const dt = Math.min(rawDt, 0.1);
    const sw = viewManager.screenWidth, sh = viewManager.screenHeight;
    const s = this._state;

    // Held-key continuous movement
    if (this._heldDir >= 0 && s.phase === PhantomPhase.PLAYING && !s.throwing) {
      this._heldTimer += dt;
      const delay = this._heldFirst ? B.HELD_KEY_FIRST_DELAY : B.HELD_KEY_REPEAT;
      if (this._heldTimer >= delay) {
        this._heldTimer -= delay;
        this._heldFirst = false;
        this._doMove(this._heldDir);
      }
    }

    if (s.phase === PhantomPhase.PLAYING) {
      updateGuards(s, dt);
      updateDetection(s, dt);
      updateStones(s, dt);
      updateSmokeTiles(s, dt);
      updateVisibility(s);
      updateAmbientParticles(s, dt);
      updateGuardNoiseFlash(s, dt);

      const isDetected = s.detectionMeter > 0.3;
      if (isDetected && !this._wasDetected) playDetected();
      this._wasDetected = isDetected;

      s.score += B.SCORE_PER_SECOND * dt;
    }

    if (s.phase === PhantomPhase.GAME_OVER && this._prevLives > 0) {
      playGameOver(); stopDrone(); this._saveMeta(); this._prevLives = 0;
    }

    updateTimers(s, dt);
    updateParticles(s, dt);
    updateFloatingTexts(s, dt);

    this._renderer.render(s, sw, sh, this._meta, this._pauseIndex, this._pauseSubpage);
  }

  private _startGame(): void {
    const sw = viewManager.screenWidth, sh = viewManager.screenHeight;
    const { cols, rows } = this._gridSize(sw, sh);
    this._meta = loadPhantomMeta();
    this._state = createPhantomState(cols, rows, this._meta);
    this._state.phase = PhantomPhase.PLAYING;
    this._prevLives = this._state.lives;
    this._wasDetected = false;
    this._heldDir = -1;
    updateVisibility(this._state);
    startDrone();
  }

  private _nextFloor(): void {
    const s = this._state;
    if (s.floorStealthRating === StealthRating.GHOST) {
      const meta = loadPhantomMeta();
      meta.totalGhostFloors++;
      savePhantomMeta(meta);
      this._meta = meta;
    }
    if (s.floor >= MAX_FLOORS) {
      s.phase = PhantomPhase.VICTORY;
      playVictory(); stopDrone(); this._saveMeta();
      return;
    }
    advanceFloor(s, this._meta);
    updateVisibility(s);
    s.floorTransitionTimer = B.FLOOR_TRANSITION_DURATION;
    this._prevLives = s.lives;
  }

  private _saveMeta(): void {
    const s = this._state;
    const meta = loadPhantomMeta();
    meta.gamesPlayed++;
    const score = Math.floor(s.score);
    if (score > meta.highScore) meta.highScore = score;
    if (s.floor > meta.bestFloor) meta.bestFloor = s.floor;
    meta.totalRelics += s.totalRelicsCollected;
    meta.totalFloors += s.totalFloorsCleared;
    meta.totalBackstabs += s.totalBackstabs;
    meta.shadowCoins += calcShadowCoins(s);
    savePhantomMeta(meta);
    this._meta = meta;
  }

  private _tryUpgrade(index: number): void {
    const meta = this._meta;
    const keys = ["extraLife", "quickDash", "keenEyes", "lightFeet", "extraSmoke"] as const;
    type UpKey = typeof keys[number];
    const key: UpKey | undefined = keys[index];
    if (!key) return;
    const costTable = B.UPGRADE_COSTS as Record<string, number[]>;
    const costs = costTable[key];
    if (!costs) return;
    const currentLevel = meta.upgrades[key];
    if (currentLevel >= costs.length) return;
    const cost = costs[currentLevel];
    if (meta.shadowCoins < cost) return;
    meta.shadowCoins -= cost;
    meta.upgrades[key] = currentLevel + 1;
    savePhantomMeta(meta);
  }

  private _exit(): void {
    stopDrone();
    window.dispatchEvent(new Event("phantomExit"));
  }
}
