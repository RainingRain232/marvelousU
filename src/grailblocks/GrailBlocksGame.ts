// Grail Blocks – Main Game Orchestrator

import { Container } from "pixi.js";
import { viewManager } from "../view/ViewManager.ts";
import { GBState, GBPhase, ActivePiece } from "./types.ts";
import { createGBState, spawnPiece, loadGBMeta, saveGBMeta } from "./state/GBState.ts";
import * as Piece from "./systems/GBPieceSystem.ts";
import { GBRenderer } from "./view/GBRenderer.ts";
import { GB_BALANCE as B } from "./config/GBBalance.ts";

// ---------------------------------------------------------------------------
// DAS (Delayed Auto Shift) tracker
// ---------------------------------------------------------------------------

interface DASState {
  left: boolean;
  right: boolean;
  down: boolean;
  holdTime: number; // seconds key has been held
  repeating: boolean;
  repeatAccum: number;
}

function createDAS(): DASState {
  return { left: false, right: false, down: false, holdTime: 0, repeating: false, repeatAccum: 0 };
}

// ---------------------------------------------------------------------------
// GrailBlocksGame
// ---------------------------------------------------------------------------

export class GrailBlocksGame {
  private _state!: GBState;
  private _renderer!: GBRenderer;
  private _container!: Container;
  private _das: DASState = createDAS();

  // Bound listeners (for removal)
  private _boundKeyDown!: (e: KeyboardEvent) => void;
  private _boundKeyUp!: (e: KeyboardEvent) => void;
  private _boundTick!: (ticker: { deltaTime: number; deltaMS: number }) => void;

  // Track whether line-clear flash is pending (small delay before clearing)
  private _lineClearDelay = 0;
  private _garbageTimer = 0;

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  boot(): void {
    // Clear the main world layers so Grail Blocks has a clean slate
    viewManager.clearWorld();

    this._state = createGBState();
    this._renderer = new GBRenderer();
    this._container = new Container();

    const sw = viewManager.screenWidth;
    const sh = viewManager.screenHeight;

    this._renderer.build(sw, sh);
    this._container.addChild(this._renderer.root);
    viewManager.layers.ui.addChild(this._container);

    this._renderer.render(this._state);

    // Input
    this._boundKeyDown = this._onKeyDown.bind(this);
    this._boundKeyUp = this._onKeyUp.bind(this);
    window.addEventListener("keydown", this._boundKeyDown);
    window.addEventListener("keyup", this._boundKeyUp);

    // Ticker
    this._boundTick = this._gameLoop.bind(this);
    viewManager.app.ticker.add(this._boundTick);
  }

  destroy(): void {
    viewManager.app.ticker.remove(this._boundTick);
    window.removeEventListener("keydown", this._boundKeyDown);
    window.removeEventListener("keyup", this._boundKeyUp);
    this._renderer.destroy();
    if (this._container.parent) {
      this._container.parent.removeChild(this._container);
    }
  }

  // -----------------------------------------------------------------------
  // Game loop
  // -----------------------------------------------------------------------

  private _gameLoop(ticker: { deltaTime: number; deltaMS: number }): void {
    const dt = ticker.deltaMS / 1000;
    const s = this._state;
    s.time += dt;

    switch (s.phase) {
      case GBPhase.MENU:
        // Just render menu — space key transitions us out
        break;

      case GBPhase.PLAYING:
        this._updatePlaying(dt);
        break;

      case GBPhase.PAUSED:
        // Render paused overlay, input handled in _onKeyDown
        break;

      case GBPhase.GAME_OVER:
        // Render game-over, space key transitions out
        break;
    }

    this._renderer.render(s);
  }

  private _updatePlaying(dt: number): void {
    const s = this._state;

    // Handle line-clear animation delay
    if (this._lineClearDelay > 0) {
      this._lineClearDelay -= dt;
      if (this._lineClearDelay <= 0) {
        this._finishLineClear();
      }
      return;
    }

    // Spawn piece if needed
    if (!s.activePiece) {
      spawnPiece(s);
      if (s.activePiece && !Piece.canPlace(s.grid, s.activePiece)) {
        this._triggerGameOver();
        return;
      }
    }

    // DAS (auto-repeat for held keys)
    this._updateDAS(dt);

    // Gravity drop
    const dropInterval = Piece.getDropInterval(s.level);
    s.dropTimer += dt;
    if (s.dropTimer >= dropInterval) {
      s.dropTimer -= dropInterval;
      if (!Piece.softDrop(s)) {
        // Piece can't move down — accumulate lock timer
        s.lockTimer += dropInterval;
      }
    }

    // Lock delay
    if (s.activePiece) {
      const below: ActivePiece = { ...s.activePiece, y: s.activePiece.y + 1 };
      if (!Piece.canPlace(s.grid, below)) {
        s.lockTimer += dt;
        if (s.lockTimer >= B.LOCK_DELAY) {
          this._lockAndCheck();
        }
      }
    }

    // Garbage lines (marathon mode, level 5+)
    if (s.mode === "marathon" && s.level >= B.GARBAGE_START_LEVEL) {
      this._garbageTimer += dt;
      const interval = Math.max(B.GARBAGE_INTERVAL_MIN, B.GARBAGE_INTERVAL - (s.level - B.GARBAGE_START_LEVEL) * 2);
      if (this._garbageTimer >= interval) {
        this._garbageTimer -= interval;
        Piece.addGarbageLines(s, B.GARBAGE_LINES_PER_PUSH);
        this._renderer.spawnClearText("GARBAGE!", 1);
      }
    }
  }

  // -----------------------------------------------------------------------
  // DAS
  // -----------------------------------------------------------------------

  private _updateDAS(dt: number): void {
    const das = this._das;
    const dir = das.left ? -1 : das.right ? 1 : 0;

    if (dir === 0) {
      das.holdTime = 0;
      das.repeating = false;
      das.repeatAccum = 0;
      return;
    }

    das.holdTime += dt;
    if (!das.repeating) {
      if (das.holdTime >= B.DAS_DELAY) {
        das.repeating = true;
        das.repeatAccum = 0;
        this._moveDir(dir);
      }
    } else {
      das.repeatAccum += dt;
      while (das.repeatAccum >= B.DAS_REPEAT) {
        das.repeatAccum -= B.DAS_REPEAT;
        this._moveDir(dir);
      }
    }

    // Soft drop auto-repeat (down arrow held)
    if (das.down) {
      // soft drop is handled by reducing drop timer effectively — we just
      // call softDrop every frame tick equivalent
      Piece.softDrop(this._state);
    }
  }

  private _moveDir(dir: number): void {
    if (dir < 0) Piece.moveLeft(this._state);
    else if (dir > 0) Piece.moveRight(this._state);
  }

  // -----------------------------------------------------------------------
  // Lock + line clear
  // -----------------------------------------------------------------------

  private _lockedPieceType: string = "";
  private _newRecordShown = false;
  private _lockedPieceX = 0;
  private _lockedPieceY = 0;

  private _lockAndCheck(): void {
    const s = this._state;

    // Save piece info for T-spin detection
    if (s.activePiece) {
      this._lockedPieceType = s.activePiece.type;
      this._lockedPieceX = s.activePiece.x;
      this._lockedPieceY = s.activePiece.y;
    }

    // Lock particle burst at piece center
    const lockCx = this._lockedPieceX * B.CELL_SIZE + 2 * B.CELL_SIZE;
    const lockCy = this._lockedPieceY * B.CELL_SIZE + 2 * B.CELL_SIZE;
    this._renderer.spawnLockParticles(lockCx, lockCy);

    Piece.lockPiece(s);

    const fullRows = Piece.getFullRows(s.grid);
    if (fullRows.length > 0) {
      // Start line-clear animation
      this._lineClearDelay = 0.25; // brief flash pause
      this._renderer.triggerLineClearFX(fullRows);
    } else {
      this._afterLock();
    }
  }

  private _finishLineClear(): void {
    const prevLvl = this._state.level;
    const prevScore = this._state.score;
    const linesCleared = Piece.clearLines(
      this._state,
      this._lockedPieceType as any,
      this._lockedPieceX,
      this._lockedPieceY,
    );
    // Score popup showing points earned
    const earned = this._state.score - prevScore;
    if (earned > 0) {
      this._renderer.spawnScorePopup(earned);
    }
    // Show clear text popup
    if (linesCleared > 0 && this._state.lastClearText) {
      this._renderer.spawnClearText(this._state.lastClearText, linesCleared);
    }
    // Level-up visual
    if (this._state.level > prevLvl) {
      this._renderer.spawnLevelUp(this._state.level);
    }
    // New high score notification (live during gameplay)
    if (this._state.score > this._state.highScore && !this._newRecordShown) {
      this._newRecordShown = true;
      this._renderer.spawnNewRecord();
    }
    this._afterLock();
  }

  private _afterLock(): void {
    const s = this._state;
    // Sprint mode: check if target reached
    if (s.mode === "sprint" && s.linesCleared >= s.sprintTarget) {
      this._triggerGameOver(); // victory in sprint = game end with score
      return;
    }
    if (Piece.isGameOver(s)) {
      this._triggerGameOver();
    }
  }

  // -----------------------------------------------------------------------
  // Game over
  // -----------------------------------------------------------------------

  private _triggerGameOver(): void {
    const s = this._state;
    s.phase = GBPhase.GAME_OVER;

    // Update meta
    const meta = loadGBMeta();
    meta.gamesPlayed += 1;
    meta.totalLines += s.linesCleared;
    if (s.score > meta.highScore) {
      meta.highScore = s.score;
      s.highScore = s.score;
    }
    if (s.level > meta.bestLevel) {
      meta.bestLevel = s.level;
    }
    // Sprint best time
    if (s.mode === "sprint" && s.linesCleared >= s.sprintTarget) {
      if (meta.sprintBestTime === 0 || s.time < meta.sprintBestTime) {
        meta.sprintBestTime = s.time;
      }
    }
    saveGBMeta(meta);
  }

  // -----------------------------------------------------------------------
  // Input
  // -----------------------------------------------------------------------

  private _onKeyDown(e: KeyboardEvent): void {
    if (e.repeat && (e.code === "ArrowLeft" || e.code === "ArrowRight" || e.code === "ArrowDown")) {
      // DAS handles repeats, ignore browser repeat
      return;
    }

    const s = this._state;

    // Menu: space to start
    if (s.phase === GBPhase.MENU) {
      if (e.code === "Space") {
        e.preventDefault();
        s.phase = GBPhase.PLAYING;
        spawnPiece(s);
      }
      // M key toggles mode
      if (e.code === "KeyM") {
        s.mode = s.mode === "marathon" ? "sprint" : "marathon";
      }
      return;
    }

    // Game over: space to restart
    if (s.phase === GBPhase.GAME_OVER) {
      if (e.code === "Space") {
        e.preventDefault();
        this._restart();
      }
      return;
    }

    // Pause toggle
    if (e.code === "Escape") {
      if (s.phase === GBPhase.PLAYING) {
        s.phase = GBPhase.PAUSED;
      } else if (s.phase === GBPhase.PAUSED) {
        s.phase = GBPhase.PLAYING;
      }
      return;
    }

    // Paused: ignore gameplay input
    if (s.phase === GBPhase.PAUSED) return;

    // Playing
    if (s.phase === GBPhase.PLAYING) {
      switch (e.code) {
        case "ArrowLeft":
          e.preventDefault();
          this._das.left = true;
          this._das.right = false;
          this._das.holdTime = 0;
          this._das.repeating = false;
          Piece.moveLeft(s);
          break;

        case "ArrowRight":
          e.preventDefault();
          this._das.left = false;
          this._das.right = true;
          this._das.holdTime = 0;
          this._das.repeating = false;
          Piece.moveRight(s);
          break;

        case "ArrowDown":
          e.preventDefault();
          this._das.down = true;
          Piece.softDrop(s);
          break;

        case "ArrowUp":
          e.preventDefault();
          Piece.rotate(s);
          break;

        case "KeyZ":
          e.preventDefault();
          Piece.rotateCCW(s);
          break;

        case "KeyA":
          // 180 rotation (only when not moving left — A is also left key via WASD)
          if (!e.ctrlKey) break;
          e.preventDefault();
          Piece.rotate180(s);
          break;

        case "Space":
          e.preventDefault();
          if (s.activePiece) {
            const startRow = s.activePiece.y;
            const dropType = s.activePiece.type;
            const dropRot = s.activePiece.rotation;
            const dropX = s.activePiece.x;
            const endRow = Piece.ghostY(s.grid, s.activePiece);
            Piece.hardDrop(s);
            // Hard drop trail visual
            if (endRow > startRow) {
              this._renderer.spawnHardDropTrail(dropX, startRow, endRow, dropType, dropRot);
            }
            this._renderer.spawnLockParticles(dropX * B.CELL_SIZE + 2 * B.CELL_SIZE, endRow * B.CELL_SIZE + 2 * B.CELL_SIZE);
            const fullRows = Piece.getFullRows(s.grid);
            if (fullRows.length > 0) {
              this._lineClearDelay = 0.25;
              this._renderer.triggerLineClearFX(fullRows);
            } else {
              this._afterLock();
            }
          }
          break;

        case "KeyC":
          Piece.holdPiece(s);
          break;

        case "KeyG":
          if (Piece.activateGrailPower(s)) {
            this._renderer.triggerGrailFX();
          }
          break;
      }
    }
  }

  private _onKeyUp(e: KeyboardEvent): void {
    switch (e.code) {
      case "ArrowLeft":
        this._das.left = false;
        break;
      case "ArrowRight":
        this._das.right = false;
        break;
      case "ArrowDown":
        this._das.down = false;
        break;
    }
  }

  // -----------------------------------------------------------------------
  // Restart
  // -----------------------------------------------------------------------

  private _restart(): void {
    const highScore = this._state.highScore;
    this._state = createGBState();
    // Preserve loaded high score if meta didn't update yet
    if (this._state.highScore < highScore) {
      this._state.highScore = highScore;
    }
    this._das = createDAS();
    this._lineClearDelay = 0;
    this._garbageTimer = 0;
    this._newRecordShown = false;
  }
}
