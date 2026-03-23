// Grail Breaker – Game Orchestrator
// Lifecycle: boot() → _gameLoop(dt) → destroy()

import type { Application } from "pixi.js";
import type { BreakerState, BreakerMeta } from "./types.ts";
import { BreakerPhase } from "./types.ts";
import { BREAKER_BALANCE as B } from "./config/BreakerBalance.ts";
import { updatePhysics, respawnBall } from "./systems/BreakerPhysicsSystem.ts";
import { generateLevel } from "./state/BreakerState.ts";
import { BreakerRenderer } from "./view/BreakerRenderer.ts";

// ---------------------------------------------------------------------------
// Default state factory
// ---------------------------------------------------------------------------

function createDefaultState(meta: BreakerMeta): BreakerState {
  return {
    phase: BreakerPhase.MENU,
    paddle: {
      x: B.FIELD_W / 2,
      width: B.PADDLE_W,
      baseWidth: B.PADDLE_W,
      wideTimer: 0,
      laserTimer: 0,
      laserCooldown: 0,
      vx: 0,
    },
    balls: [],
    bricks: [],
    powerUps: [],
    lasers: [],
    level: 1,
    score: 0,
    lives: B.STARTING_LIVES,
    time: 0,
    slowTimer: 0,
    highScore: meta.highScore,
    combo: 0,
    bestCombo: 0,
    ballOnPaddle: true,
    aimDir: 0,
    launchCharge: 0,
    launchCharging: false,
    events: {},
  };
}

// ---------------------------------------------------------------------------
// Meta persistence (localStorage)
// ---------------------------------------------------------------------------

const META_KEY = "grailBreaker_meta";

function loadMeta(): BreakerMeta {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (raw) return JSON.parse(raw) as BreakerMeta;
  } catch { /* ignore */ }
  return { highScore: 0, bestLevel: 0, totalBricks: 0, gamesPlayed: 0 };
}

function saveMeta(meta: BreakerMeta): void {
  try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// BreakerGame
// ---------------------------------------------------------------------------

export class BreakerGame {
  private app: Application;
  private renderer = new BreakerRenderer();
  private state!: BreakerState;
  private meta: BreakerMeta;

  // Input state
  private keys = new Set<string>();
  private mouseX = -1;
  private useMouseControl = false;

  // Level clear delay
  private levelClearTimer = 0;
  private static readonly LEVEL_CLEAR_DELAY = 2.0; // seconds
  private prevPhase: BreakerPhase = BreakerPhase.MENU;

  // Bound handlers for cleanup
  private _onKeyDown = (e: KeyboardEvent) => this.onKeyDown(e);
  private _onKeyUp = (e: KeyboardEvent) => this.onKeyUp(e);
  private _onMouseMove = (e: MouseEvent) => this.onMouseMove(e);

  constructor(app: Application) {
    this.app = app;
    this.meta = loadMeta();
  }

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  boot(): void {
    this.state = createDefaultState(this.meta);
    this.renderer.build(this.app.screen.width, this.app.screen.height);
    this.app.stage.addChild(this.renderer.root);

    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
    window.addEventListener("mousemove", this._onMouseMove);

    this.app.ticker.add(this.tickHandler);
  }

  destroy(): void {
    this.app.ticker.remove(this.tickHandler);
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
    window.removeEventListener("mousemove", this._onMouseMove);
    this.renderer.destroy();
  }

  // -----------------------------------------------------------------------
  // Tick (bound arrow so `this` is stable)
  // -----------------------------------------------------------------------

  private tickHandler = (ticker: { deltaMS: number }): void => {
    const dt = ticker.deltaMS / 1000;
    this._gameLoop(dt);
  };

  // -----------------------------------------------------------------------
  // Main game loop
  // -----------------------------------------------------------------------

  _gameLoop(dt: number): void {
    switch (this.state.phase) {
      case BreakerPhase.MENU:
        // Wait for space
        break;

      case BreakerPhase.PLAYING:
        this.handlePaddleMovement(dt);
        this.handleLaserFiring();
        this.moveBallWithPaddle();
        this.updateAimDir();
        if (this.state.launchCharging) {
          this.state.launchCharge = Math.min(1, this.state.launchCharge + dt / 0.6);
        }
        updatePhysics(this.state, dt);
        break;

      case BreakerPhase.PAUSED:
        // Render only, no physics
        break;

      case BreakerPhase.LEVEL_CLEAR:
        this.levelClearTimer -= dt;
        if (this.levelClearTimer <= 0) {
          this.advanceLevel();
        }
        break;

      case BreakerPhase.GAME_OVER:
      case BreakerPhase.VICTORY:
        // Wait for space to restart
        break;
    }

    // Detect phase transitions
    if (this.state.phase !== this.prevPhase) {
      if (this.state.phase === BreakerPhase.LEVEL_CLEAR) {
        this.levelClearTimer = BreakerGame.LEVEL_CLEAR_DELAY;
      }
      if (this.state.phase === BreakerPhase.GAME_OVER || this.state.phase === BreakerPhase.VICTORY) {
        this.saveMetaOnEnd();
      }
    }
    this.prevPhase = this.state.phase;

    this.renderer.render(this.state, dt);
  }

  // -----------------------------------------------------------------------
  // Paddle movement
  // -----------------------------------------------------------------------

  private handlePaddleMovement(dt: number): void {
    const pad = this.state.paddle;
    const halfW = pad.width / 2;
    const minX = halfW;
    const maxX = B.FIELD_W - halfW;

    if (this.useMouseControl && this.mouseX >= 0) {
      // Mouse: accelerate toward target with inertia
      const target = Math.max(minX, Math.min(maxX, this.mouseX - B.FIELD_X));
      const dx = target - pad.x;
      pad.vx += dx * 12 * dt; // spring-like towards mouse
      pad.vx *= B.PADDLE_FRICTION;
    } else {
      // Keyboard: accelerate in held direction
      let dir = 0;
      if (this.keys.has("ArrowLeft") || this.keys.has("a")) dir -= 1;
      if (this.keys.has("ArrowRight") || this.keys.has("d")) dir += 1;
      if (dir !== 0) {
        pad.vx += dir * B.PADDLE_ACCEL * dt;
      }
      pad.vx *= B.PADDLE_FRICTION;
    }

    // Clamp velocity
    pad.vx = Math.max(-B.PADDLE_SPEED, Math.min(B.PADDLE_SPEED, pad.vx));
    // Apply velocity
    pad.x += pad.vx * dt;
    // Clamp position & bounce off walls
    if (pad.x < minX) { pad.x = minX; pad.vx = 0; }
    if (pad.x > maxX) { pad.x = maxX; pad.vx = 0; }
  }

  /** If ball is sitting on paddle (not launched), track paddle position. */
  private moveBallWithPaddle(): void {
    for (const ball of this.state.balls) {
      if (ball.vx === 0 && ball.vy === 0) {
        ball.x = this.state.paddle.x;
      }
    }
  }

  /** Update launch aim direction from held keys. */
  private updateAimDir(): void {
    if (!this.state.ballOnPaddle) { this.state.aimDir = 0; return; }
    let dir = 0;
    if (this.keys.has("ArrowLeft") || this.keys.has("a")) dir -= 1;
    if (this.keys.has("ArrowRight") || this.keys.has("d")) dir += 1;
    this.state.aimDir = dir;
  }

  // -----------------------------------------------------------------------
  // Laser firing
  // -----------------------------------------------------------------------

  private handleLaserFiring(): void {
    if (this.state.paddle.laserTimer <= 0) return;
    if (this.state.paddle.laserCooldown > 0) return;

    // Auto-fire while laser is active
    this.state.paddle.laserCooldown = B.LASER_COOLDOWN;
    const pw = this.state.paddle.width;
    this.state.lasers.push(
      { x: this.state.paddle.x - pw / 2 + 4, y: B.PADDLE_Y - 4, vy: -B.LASER_SPEED, active: true },
      { x: this.state.paddle.x + pw / 2 - 4, y: B.PADDLE_Y - 4, vy: -B.LASER_SPEED, active: true },
    );
  }

  // -----------------------------------------------------------------------
  // Level management
  // -----------------------------------------------------------------------

  private bindEvents(): void {
    const r = this.renderer;
    this.state.events = {
      onBrickDestroyed: (wx, wy, color) => {
        r.spawnBrickBreakFx(B.FIELD_X + wx, B.FIELD_Y + wy, color);
        r.spawnImpactRing(B.FIELD_X + wx, B.FIELD_Y + wy, color);
        r.triggerShake(1.5);
      },
      onBrickHit: (wx, wy, color) => {
        r.spawnBrickHitFx(B.FIELD_X + wx, B.FIELD_Y + wy, color);
        r.spawnImpactRing(B.FIELD_X + wx, B.FIELD_Y + wy, color);
      },
      onPaddleHit: (wx, wy, edgeHit) => {
        r.spawnImpactRing(B.FIELD_X + wx, B.FIELD_Y + wy, edgeHit ? 0xffdd44 : 0x6699cc);
        if (edgeHit) {
          r.triggerShake(1.5);
          r.spawnBrickBreakFx(B.FIELD_X + wx, B.FIELD_Y + wy, 0xffdd44);
        } else {
          r.triggerShake(0.6);
          r.spawnCollectFlash(B.FIELD_X + wx, B.FIELD_Y + wy, 0x6699cc);
        }
      },
      onPowerUpCollected: (wx, wy, color) => {
        r.spawnCollectFlash(B.FIELD_X + wx, B.FIELD_Y + wy, color);
        r.spawnImpactRing(B.FIELD_X + wx, B.FIELD_Y + wy, color);
        r.triggerShake(2);
      },
    };
  }

  private startGame(): void {
    this.state = createDefaultState(this.meta);
    this.state.phase = BreakerPhase.PLAYING;
    generateLevel(this.state, 1);
    this.bindEvents();
    respawnBall(this.state);
  }

  private advanceLevel(): void {
    const nextLevel = this.state.level + 1;
    generateLevel(this.state, nextLevel);
    respawnBall(this.state);
    this.state.phase = BreakerPhase.PLAYING;
  }

  private launchBall(): void {
    this.state.ballOnPaddle = false;
    // Power multiplier: 0.75x at zero charge, 1.25x at full charge
    const powerMult = 0.75 + this.state.launchCharge * 0.5;
    for (const ball of this.state.balls) {
      if (ball.vx === 0 && ball.vy === 0) {
        // Directional launch: hold left/right to aim, otherwise straight up
        let angle = -Math.PI / 2; // straight up
        if (this.keys.has("ArrowLeft") || this.keys.has("a")) {
          angle -= Math.PI / 6; // -30° from vertical
        } else if (this.keys.has("ArrowRight") || this.keys.has("d")) {
          angle += Math.PI / 6; // +30° from vertical
        }
        ball.vx = Math.cos(angle) * B.BALL_SPEED * powerMult;
        ball.vy = Math.sin(angle) * B.BALL_SPEED * powerMult;
      }
    }
    this.state.launchCharge = 0;
  }

  private saveMetaOnEnd(): void {
    this.meta.gamesPlayed++;
    if (this.state.score > this.meta.highScore) this.meta.highScore = this.state.score;
    if (this.state.level > this.meta.bestLevel) this.meta.bestLevel = this.state.level;
    saveMeta(this.meta);
  }

  // -----------------------------------------------------------------------
  // Input handlers
  // -----------------------------------------------------------------------

  private onKeyDown(e: KeyboardEvent): void {
    this.keys.add(e.key);
    this.useMouseControl = false;

    if (e.key === " " || e.key === "Space") {
      e.preventDefault();
      switch (this.state.phase) {
        case BreakerPhase.MENU:
          this.startGame();
          break;
        case BreakerPhase.PLAYING:
          if (this.state.ballOnPaddle && !this.state.launchCharging) {
            // Start charging – launch happens on key up
            this.state.launchCharging = true;
            this.state.launchCharge = 0;
          }
          break;
        case BreakerPhase.GAME_OVER:
        case BreakerPhase.VICTORY:
          this.saveMetaOnEnd();
          this.startGame();
          break;
      }
    }

    if (e.key === "Escape") {
      if (this.state.phase === BreakerPhase.PLAYING) {
        this.state.phase = BreakerPhase.PAUSED;
      } else if (this.state.phase === BreakerPhase.PAUSED) {
        this.state.phase = BreakerPhase.PLAYING;
      }
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.key);
    // Release space → fire charged ball
    if ((e.key === " " || e.key === "Space") && this.state.launchCharging) {
      this.state.launchCharging = false;
      this.launchBall();
    }
  }

  private onMouseMove(e: MouseEvent): void {
    this.mouseX = e.clientX;
    this.useMouseControl = true;
  }
}
