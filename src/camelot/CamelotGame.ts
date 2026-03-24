// ---------------------------------------------------------------------------
// Prince of Camelot — Main Game Orchestrator
// ---------------------------------------------------------------------------

import { Ticker } from "pixi.js";
import { viewManager } from "../view/ViewManager";
import { CamelotPhase } from "./types";
import type { CamelotState } from "./types";
import { createInitialState, loadLevel } from "./state/CamelotState";
import {
  updatePlayer, updateEnemy, updateProjectiles, updateMovingPlatforms,
  updateParticles, updateFloatingTexts, updateTraps, updateCamera,
  updateFade, fadeToBlack, updateShop, pollGamepad, spawnAmbientDust,
  checkExit, spawnFloatingText, updateWeather, loadHighScore, updateBloodMoon,
} from "./systems/CamelotGameSystem";
import { playSound, startMusic, stopMusic, updateMusicMood, resumeAudio } from "./systems/CamelotAudio";
import { LEVEL_DIALOGUES, ENDING_DIALOGUE } from "./systems/CamelotLevels";
import { CamelotRenderer } from "./view/CamelotRenderer";
import { TILE, LEVEL_NAMES } from "./config/CamelotConfig";

export class CamelotGame {
  private _state!: CamelotState;
  private _renderer = new CamelotRenderer();
  private _tickerCb: ((ticker: Ticker) => void) | null = null;
  private _keyDownHandler: ((e: KeyboardEvent) => void) | null = null;
  private _keyUpHandler: ((e: KeyboardEvent) => void) | null = null;

  async boot(): Promise<void> {
    viewManager.clearWorld();
    viewManager.camera.zoom = 1;
    const sw = viewManager.screenWidth, sh = viewManager.screenHeight;
    this._state = createInitialState();
    this._renderer.init(sw, sh);
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
    stopMusic();
  }

  private _initInput(): void {
    this._keyDownHandler = (e: KeyboardEvent) => {
      const s = this._state;
      if (!s) return;
      resumeAudio();

      // Start screen
      if (s.phase === CamelotPhase.START) {
        if (e.code === "Space" || e.code === "Enter") { this._startGame(); e.preventDefault(); }
        else if (e.code === "Escape") { this._exit(); e.preventDefault(); }
        return;
      }

      // Dead / Win screen
      if (s.phase === CamelotPhase.DEAD || s.phase === CamelotPhase.WIN) {
        if (e.code === "Space" || e.code === "Enter") { this._restartGame(); e.preventDefault(); }
        else if (e.code === "Escape") { this._exit(); e.preventDefault(); }
        return;
      }

      // Score tally
      if (s.phase === CamelotPhase.SCORE_TALLY) {
        if ((e.code === "Space" || e.code === "Enter") && s.tallyTimer >= 60) {
          this._advancePastTally();
        }
        e.preventDefault();
        return;
      }

      // Dialogue
      if (s.dialogueActive) {
        this._advanceDialogue();
        e.preventDefault();
        return;
      }

      // Pause toggle
      if (e.code === "KeyP" || e.code === "Escape") {
        this._togglePause();
        e.preventDefault();
        return;
      }

      // CRT toggle
      if (e.code === "Tab") { s.crtEnabled = !s.crtEnabled; e.preventDefault(); return; }

      if (s.phase === CamelotPhase.PAUSED) return;

      if (!s.keys[e.code]) s.justPressed[e.code] = true;
      s.keys[e.code] = true;
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
    };

    this._keyUpHandler = (e: KeyboardEvent) => {
      if (this._state) this._state.keys[e.code] = false;
    };

    window.addEventListener("keydown", this._keyDownHandler);
    window.addEventListener("keyup", this._keyUpHandler);
  }

  private _destroyInput(): void {
    if (this._keyDownHandler) { window.removeEventListener("keydown", this._keyDownHandler); this._keyDownHandler = null; }
    if (this._keyUpHandler) { window.removeEventListener("keyup", this._keyUpHandler); this._keyUpHandler = null; }
  }

  private _loop(_rawDt: number): void {
    const s = this._state;
    if (!s) return;
    const sw = viewManager.screenWidth, sh = viewManager.screenHeight;

    // Score tally timer
    if (s.phase === CamelotPhase.SCORE_TALLY) {
      s.tallyTimer++;
      this._renderer.render(s, sw, sh);
      this._clearJustPressed();
      return;
    }

    // Shop update
    if (s.shopActive) {
      updateShop(s);
      if (!s.shopActive) {
        // Shop was closed — load the level
        loadLevel(s, s.currentLevel);
        s.gameRunning = true;
        if (LEVEL_DIALOGUES[s.currentLevel]) this._showDialogue(LEVEL_DIALOGUES[s.currentLevel]);
      }
    }

    // Hit freeze
    if (s.hitFreeze > 0) { s.hitFreeze--; updateFade(s); this._renderer.render(s, sw, sh); this._clearJustPressed(); return; }

    pollGamepad(s);

    if (s.phase === CamelotPhase.PAUSED) { this._renderer.render(s, sw, sh); this._clearJustPressed(); return; }

    if (s.gameRunning) {
      s.gameTime++; s.totalTime++;

      // Intro camera
      if (s.introCamera) {
        s.introCamera.timer++;
        if (s.currentLevel === 3 && s.introCamera.timer < 90) {
          const bossx = 48 * TILE, bossy = (s.levelData.height - 10) * TILE;
          const t = Math.min(s.introCamera.timer / 90, 1);
          const ease = t * t * (3 - 2 * t);
          s.camera.x = bossx - sw / 2 + (s.introCamera.tx - bossx + sw / 2) * ease;
          s.camera.y = bossy - sh / 2 + (s.introCamera.ty - bossy + sh / 2) * ease;
          if (s.introCamera.timer === 1) { playSound("boss_roar"); s.shake = 8; }
          if (s.introCamera.timer === 30) spawnFloatingText(s, bossx + 20, bossy - 20, "MORDRATH THE DARK", "#c050c0");
          if (s.introCamera.timer < 30) s.cameraZoom = 1.1 - ease * 0.1;
        } else if (s.introCamera.timer > 90 || (s.currentLevel !== 3 && s.introCamera.timer > 60)) {
          s.introCamera = null; s.cameraZoom = 1.0;
        }
      }

      updatePlayer(s);

      // Check exit
      if (checkExit(s)) {
        this._nextLevel();
        this._clearJustPressed();
        return;
      }

      s.enemies = s.enemies.filter(e => updateEnemy(s, e));
      updateProjectiles(s);
      updateMovingPlatforms(s);
      updateParticles(s);
      updateFloatingTexts(s);
      updateTraps(s, sw, sh);
      spawnAmbientDust(s, sw, sh);
      updateWeather(s, sw, sh);
      updateBloodMoon(s);
      updateMusicMood(
        s.enemies.some(e => e.type === "boss" && !e.dead),
        s.player.hp <= 2,
      );
      updateCamera(s, sw, sh);
    }

    s.cameraZoom += (1.0 - s.cameraZoom) * 0.1;
    updateFade(s);
    if (s.vignetteTimer > 0) s.vignetteTimer--;

    this._renderer.render(s, sw, sh);
    this._clearJustPressed();
  }

  private _clearJustPressed(): void {
    const s = this._state;
    for (const k in s.justPressed) s.justPressed[k] = false;
    for (const k in s.gpJustPressed) (s.gpJustPressed as Record<string, boolean>)[k] = false;
  }

  private _startGame(): void {
    const s = this._state;
    s.phase = CamelotPhase.PLAYING;
    s.gameRunning = true;
    s.currentLevel = 0;
    s.totalKills = 0; s.totalCoins = 0; s.totalTime = 0;
    s.playerXP = 0; s.playerLevel = 1; s.lives = 3;
    s.checkpointActive = null;
    s.persistentState = { swordLevel: 0, hasDoubleJump: false, hasShield: false, shieldHP: 0, maxHpBonus: 0, staminaBonus: 0 };
    loadLevel(s, 0);
    loadHighScore(s);
    startMusic();
    if (LEVEL_DIALOGUES[0]) this._showDialogue(LEVEL_DIALOGUES[0]);
  }

  private _restartGame(): void {
    const s = this._state;
    s.phase = CamelotPhase.PLAYING;
    s.gameRunning = true;
    s.currentLevel = 0;
    s.totalKills = 0; s.totalCoins = 0; s.totalTime = 0;
    s.playerXP = 0; s.playerLevel = 1; s.lives = 3;
    s.checkpointActive = null;
    s.persistentState = { swordLevel: 0, hasDoubleJump: false, hasShield: false, shieldHP: 0, maxHpBonus: 0, staminaBonus: 0 };
    loadLevel(s, 0);
    startMusic();
  }

  private _nextLevel(): void {
    const s = this._state;
    // Show score tally before transitioning
    const prevLevel = s.currentLevel;
    s.tallyData = {
      kills: s.totalKills,
      coins: s.totalCoins,
      time: s.totalTime,
      levelName: LEVEL_NAMES[prevLevel] || "UNKNOWN",
    };
    s.tallyTimer = 0;
    s.phase = CamelotPhase.SCORE_TALLY;
    s.gameRunning = false;
  }

  private _advancePastTally(): void {
    const s = this._state;
    s.tallyData = null;
    fadeToBlack(s, () => {
      s.currentLevel++;
      s.checkpointActive = null;
      if (s.currentLevel >= s.allLevels.length) {
        s.gameRunning = false;
        this._showDialogue(ENDING_DIALOGUE);
        const check = setInterval(() => {
          if (!s.dialogueActive) {
            clearInterval(check);
            s.phase = CamelotPhase.WIN;
          }
        }, 200);
        return;
      }
      s.phase = CamelotPhase.PLAYING;
      if (s.totalCoins > 0) {
        this._showShop();
      } else {
        loadLevel(s, s.currentLevel);
        s.gameRunning = true;
        if (LEVEL_DIALOGUES[s.currentLevel]) this._showDialogue(LEVEL_DIALOGUES[s.currentLevel]);
      }
    });
  }

  private _showDialogue(lines: Array<{ speaker: string; text: string }>): void {
    const s = this._state;
    s.dialogueQueue = [...lines];
    s.dialogueActive = true;
    s.gameRunning = false;
  }

  private _advanceDialogue(): void {
    const s = this._state;
    s.dialogueQueue.shift();
    if (s.dialogueQueue.length === 0) {
      s.dialogueActive = false;
      s.gameRunning = true;
    }
  }

  private _togglePause(): void {
    const s = this._state;
    if (s.dialogueActive || s.player.dead || !s.gameRunning) return;
    s.phase = s.phase === CamelotPhase.PAUSED ? CamelotPhase.PLAYING : CamelotPhase.PAUSED;
  }

  private _showShop(): void {
    const s = this._state;
    s.shopActive = true;
    s.gameRunning = false;
    s.shopItems = [
      { name: "+1 MAX HP", cost: 10, action: () => { s.persistentState.maxHpBonus++; } },
      { name: "STAMINA BOOST", cost: 8, action: () => { s.persistentState.staminaBonus += 15; } },
      { name: "HEAL FULL", cost: 5, action: () => { /* healed on level load */ } },
      { name: "EXTRA LIFE", cost: 15, action: () => { s.lives++; } },
    ];
    s.shopSelection = 0;
  }

  private _exit(): void { window.dispatchEvent(new Event("camelotExit")); }
}
