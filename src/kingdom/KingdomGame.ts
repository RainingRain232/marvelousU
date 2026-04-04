// ---------------------------------------------------------------------------
// Kingdom – Main Game Orchestrator (v4)
// ---------------------------------------------------------------------------

import { Ticker } from "pixi.js";
import { viewManager } from "../view/ViewManager";
import { audioManager } from "../audio/AudioManager";
import { KingdomPhase, KingdomChar, PowerState, CHAR_LIST } from "./types";
import type { KingdomState } from "./types";
import { createKingdomState, resetPlayerForLevel, saveHighScore } from "./state/KingdomState";
import { generateLevel } from "./systems/KingdomLevelGen";
import type { LevelGenResult } from "./systems/KingdomLevelGen";
import {
  updatePlayer, updateEnemies, updateItems, updateProjectiles,
  updateParticles, updateBlockAnims, updateCoinAnims, updateScorePopups,
  updateCamera, updateTimer, checkLevelClear, updateFlagSlide,
  checkPlayerEnemyCollision, killPlayer, cleanupEntities,
  createEnemyFromSpawn, updateFloatingCoins, updateScreenShake,
  updateMovingPlatforms, updateBossDeath, checkBonusRoomExit, exitBonusRoom,
} from "./systems/KingdomSystem";
import type { InputKeys } from "./systems/KingdomSystem";
import { KingdomRenderer } from "./view/KingdomRenderer";
import { LEVEL_TIME, LEVEL_INTRO_TIME } from "./config/KingdomConfig";

const MAX_WORLDS = 6;
const LEVELS_PER_WORLD = 4;

export class KingdomGame {
  private _state!: KingdomState;
  private _renderer = new KingdomRenderer();
  private _tickerCb: ((ticker: Ticker) => void) | null = null;
  private _keyDownHandler: ((e: KeyboardEvent) => void) | null = null;
  private _keyUpHandler: ((e: KeyboardEvent) => void) | null = null;
  private _keys = new Set<string>();
  private _justPressed = new Set<string>();

  async boot(): Promise<void> {
    viewManager.clearWorld();
    viewManager.camera.zoom = 1;
    viewManager.camera.keyboardEnabled = false;
    audioManager.playGameMusic();
    const sw = viewManager.screenWidth, sh = viewManager.screenHeight;
    this._state = createKingdomState(sw, sh);
    this._renderer.build();
    viewManager.addToLayer("background", this._renderer.container);
    this._initInput();
    this._tickerCb = (ticker: Ticker) => this._loop(ticker.deltaMS / 1000);
    viewManager.app.ticker.add(this._tickerCb);
  }

  destroy(): void {
    viewManager.camera.keyboardEnabled = true;
    if (this._tickerCb) { viewManager.app.ticker.remove(this._tickerCb); this._tickerCb = null; }
    this._destroyInput();
    this._renderer.destroy();
    viewManager.removeFromLayer("background", this._renderer.container);
    viewManager.clearWorld();
  }

  private _initInput(): void {
    this._keyDownHandler = (e: KeyboardEvent) => {
      if (!this._keys.has(e.code)) this._justPressed.add(e.code);
      this._keys.add(e.code);
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
           "Space", "KeyZ", "KeyX", "KeyC", "ShiftLeft", "ShiftRight",
           "Enter", "Escape"].includes(e.code)) e.preventDefault();
      this._handleMenuInput(e.code);
    };
    this._keyUpHandler = (e: KeyboardEvent) => { this._keys.delete(e.code); };
    window.addEventListener("keydown", this._keyDownHandler);
    window.addEventListener("keyup", this._keyUpHandler);
  }

  private _destroyInput(): void {
    if (this._keyDownHandler) window.removeEventListener("keydown", this._keyDownHandler);
    if (this._keyUpHandler) window.removeEventListener("keyup", this._keyUpHandler);
    this._keyDownHandler = null; this._keyUpHandler = null;
  }

  private _getInput(): InputKeys {
    return {
      left: this._keys.has("ArrowLeft"),
      right: this._keys.has("ArrowRight"),
      jump: this._keys.has("ArrowUp") || this._keys.has("Space"),
      jumpPressed: this._justPressed.has("ArrowUp") || this._justPressed.has("Space"),
      run: this._keys.has("KeyZ") || this._keys.has("ShiftLeft") || this._keys.has("ShiftRight"),
      runPressed: this._justPressed.has("KeyZ"),
      fire: this._keys.has("KeyX"),
      firePressed: this._justPressed.has("KeyX"),
      special: this._keys.has("KeyC"),
      specialPressed: this._justPressed.has("KeyC"),
      down: this._keys.has("ArrowDown"),
      downPressed: this._justPressed.has("ArrowDown"),
    };
  }

  private _handleMenuInput(code: string): void {
    const s = this._state;
    const PAUSE_ITEMS = 5;
    switch (s.phase) {
      case KingdomPhase.TITLE:
        if (code === "Enter" || code === "Space") s.phase = KingdomPhase.CHAR_SELECT;
        else if (code === "Escape") this._exit();
        break;
      case KingdomPhase.CHAR_SELECT:
        if (code === "ArrowLeft") s.charSelectIndex = (s.charSelectIndex - 1 + CHAR_LIST.length) % CHAR_LIST.length;
        else if (code === "ArrowRight") s.charSelectIndex = (s.charSelectIndex + 1) % CHAR_LIST.length;
        else if (code === "Enter" || code === "Space") { s.character = CHAR_LIST[s.charSelectIndex]; this._startNewGame(); }
        else if (code === "Escape") s.phase = KingdomPhase.TITLE;
        break;
      case KingdomPhase.PLAYING:
      case KingdomPhase.BONUS_ROOM:
        if (code === "Escape") { s.phase = KingdomPhase.PAUSED; s.pauseMenuIndex = 0; }
        break;
      case KingdomPhase.PAUSED:
        if (code === "Escape") s.phase = s.bonusRoom ? KingdomPhase.BONUS_ROOM : KingdomPhase.PLAYING;
        else if (code === "ArrowUp") s.pauseMenuIndex = (s.pauseMenuIndex - 1 + PAUSE_ITEMS) % PAUSE_ITEMS;
        else if (code === "ArrowDown") s.pauseMenuIndex = (s.pauseMenuIndex + 1) % PAUSE_ITEMS;
        else if (code === "Enter" || code === "Space") {
          switch (s.pauseMenuIndex) {
            case 0: s.phase = s.bonusRoom ? KingdomPhase.BONUS_ROOM : KingdomPhase.PLAYING; break;
            case 1: s.phase = KingdomPhase.PAUSE_CONTROLS; break;
            case 2: s.phase = KingdomPhase.PAUSE_INTRO; break;
            case 3: s.phase = KingdomPhase.PAUSE_CONCEPTS; break;
            case 4: this._exit(); break;
          }
        }
        break;
      case KingdomPhase.PAUSE_CONTROLS:
      case KingdomPhase.PAUSE_INTRO:
      case KingdomPhase.PAUSE_CONCEPTS:
        if (code === "Escape" || code === "Enter" || code === "Space") s.phase = KingdomPhase.PAUSED;
        break;
      case KingdomPhase.GAME_OVER:
        if (code === "Enter" || code === "Space") s.phase = KingdomPhase.CHAR_SELECT;
        else if (code === "Escape") this._exit();
        break;
      case KingdomPhase.VICTORY:
        if (code === "Enter" || code === "Space") s.phase = KingdomPhase.CHAR_SELECT;
        else if (code === "Escape") this._exit();
        break;
    }
  }

  private _startNewGame(): void {
    const s = this._state;
    s.score = 0; s.coins = 0; s.lives = 3;
    s.world = 1; s.level = 1;
    s.player.power = PowerState.SMALL; s.player.height = 0.9;
    s.totalEnemiesKilled = 0; s.totalCoinsCollected = 0;
    this._loadLevel();
  }

  private _loadLevel(): void {
    const s = this._state;
    const data: LevelGenResult = generateLevel(s.world, s.level);
    s.tiles = data.tiles; s.levelWidth = data.width; s.levelHeight = data.height;
    s.enemies = data.enemies.map(e => createEnemyFromSpawn(e));
    s.items = []; s.projectiles = []; s.particles = [];
    s.blockAnims = []; s.coinAnims = []; s.scorePopups = [];
    s.floatingCoins = data.floatingCoins;
    s.movingPlatforms = data.movingPlatforms.map(mp => ({
      x: mp.x, y: mp.y, width: mp.width,
      startX: mp.x, startY: mp.y, endX: mp.endX, endY: mp.endY,
      speed: mp.speed, progress: 0, direction: 1,
    }));
    s.pipeEntrances = data.pipeEntrances;
    s.questionBlockItems = new Map();
    s.coinBlockHits = new Map();
    s.bonusRoom = null; s.bonusRoomSavedTiles = null;
    s.bossDeathActive = false; s.bossDeathTimer = 0;
    s.hasCheckpoint = false; s.checkpointX = -1; s.checkpointY = -1;

    resetPlayerForLevel(s, data.startX, data.startY);
    s.cameraX = 0; s.cameraTargetX = 0;
    s.screenShakeTimer = 0; s.screenShakeIntensity = 0;
    s.time = LEVEL_TIME;
    s.flagSliding = false; s.walkingToEnd = false; s.levelClearTimer = 0;
    s.phase = KingdomPhase.LEVEL_INTRO;
    s.levelIntroTimer = LEVEL_INTRO_TIME;
  }

  private _nextLevel(): void {
    const s = this._state;
    s.level++;
    if (s.level > LEVELS_PER_WORLD) { s.level = 1; s.world++;
      if (s.world > MAX_WORLDS) { s.phase = KingdomPhase.VICTORY; saveHighScore(s.highScore); return; }
    }
    this._loadLevel();
  }

  private _respawnOrGameOver(): void {
    const s = this._state;
    s.lives--;
    if (s.lives < 0) { s.phase = KingdomPhase.GAME_OVER; saveHighScore(s.highScore); }
    else {
      // If has checkpoint, respawn there instead of reloading
      if (s.hasCheckpoint && !s.bonusRoom) {
        resetPlayerForLevel(s, s.checkpointX, s.checkpointY);
        s.enemies = s.enemies.filter(e => {
          // Only keep enemies ahead of checkpoint
          return e.x > s.checkpointX - 5;
        });
        s.items = []; s.projectiles = []; s.particles = [];
        s.blockAnims = []; s.coinAnims = []; s.scorePopups = [];
        s.cameraX = Math.max(0, s.checkpointX - (s.sw / s.tileSize) * 0.35);
        s.cameraTargetX = s.cameraX;
        s.time = Math.max(200, s.time);
        s.flagSliding = false; s.walkingToEnd = false;
        s.bossDeathActive = false;
        s.phase = KingdomPhase.LEVEL_INTRO;
        s.levelIntroTimer = 1.5;
      } else {
        this._loadLevel();
      }
    }
  }

  private _exit(): void {
    saveHighScore(this._state.highScore);
    window.dispatchEvent(new Event("kingdomExit"));
  }

  private _loop(rawDt: number): void {
    const dt = Math.min(rawDt, 0.05);
    const s = this._state;
    const input = this._getInput();
    this._justPressed.clear();

    s.sw = viewManager.screenWidth; s.sh = viewManager.screenHeight;
    s.tileSize = Math.floor(s.sh / 15);

    switch (s.phase) {
      case KingdomPhase.LEVEL_INTRO:
        s.levelIntroTimer -= dt;
        if (s.levelIntroTimer <= 0) s.phase = KingdomPhase.PLAYING;
        break;
      case KingdomPhase.PLAYING:
        this._updatePlaying(s, input, dt);
        break;
      case KingdomPhase.BONUS_ROOM:
        this._updateBonusRoom(s, input, dt);
        break;
      case KingdomPhase.DYING:
        s.player.deathTimer -= dt;
        s.player.vy += 30 * dt; s.player.y += s.player.vy * dt;
        updateScreenShake(s, dt);
        if (s.player.deathTimer <= 0) this._respawnOrGameOver();
        break;
      case KingdomPhase.LEVEL_CLEAR:
        s.levelClearTimer -= dt;
        if (s.levelClearTimer <= 0) this._nextLevel();
        break;
      default: break;
    }

    this._renderer.draw(s);
  }

  private _updatePlaying(s: KingdomState, input: InputKeys, dt: number): void {
    // Warp pipe teleport
    if (s.warpPending) {
      const { world, level } = s.warpPending;
      s.warpPending = null;
      s.world = world; s.level = level;
      this._loadLevel();
      return;
    }

    // Boss death sequence
    if (s.bossDeathActive) {
      updateBossDeath(s, dt);
      updateParticles(s, dt);
      updateScorePopups(s, dt);
      updateScreenShake(s, dt);
      return;
    }

    if (s.flagSliding || s.walkingToEnd) {
      updateFlagSlide(s, dt); updateCamera(s, dt);
      updateParticles(s, dt); updateScorePopups(s, dt); updateScreenShake(s, dt);
      return;
    }

    updateMovingPlatforms(s, dt);
    updatePlayer(s, input, dt);
    updateEnemies(s, dt);
    updateItems(s, dt);
    updateProjectiles(s, dt);
    updateFloatingCoins(s, dt);
    checkPlayerEnemyCollision(s);
    checkLevelClear(s);
    updateCamera(s, dt);
    updateTimer(s, dt);
    updateParticles(s, dt);
    updateBlockAnims(s, dt);
    updateCoinAnims(s, dt);
    updateScorePopups(s, dt);
    updateScreenShake(s, dt);
    cleanupEntities(s);
  }

  private _updateBonusRoom(s: KingdomState, input: InputKeys, dt: number): void {
    updatePlayer(s, input, dt);
    updateFloatingCoins(s, dt);
    updateParticles(s, dt);
    updateScorePopups(s, dt);
    updateTimer(s, dt);

    // Check exit pipe
    if (input.downPressed || input.runPressed) {
      checkBonusRoomExit(s);
    }
    // Auto-exit if time runs low
    if (s.time <= 0 && s.bonusRoom) {
      exitBonusRoom(s);
    }
  }
}
