// ---------------------------------------------------------------------------
// Grail Derby -- Main Game Orchestrator
// Boots the game, runs the loop, delegates to systems and renderer.
// Uses PixiJS via the shared ViewManager.
// ---------------------------------------------------------------------------

import { Ticker } from "pixi.js";
import { viewManager } from "../view/ViewManager";
import { DerbyPhase } from "./types";
import type { DerbyState } from "./types";
import { createDerbyState, loadDerbyMeta, saveDerbyMeta } from "./state/DerbyState";
import type { DerbyMeta } from "./types";
import { updateRacing } from "./systems/DerbyPhysicsSystem";
import { generateContent, resetGenerator } from "./systems/DerbyGeneratorSystem";
import { updateAI, resetAI } from "./systems/DerbyAISystem";
import { DerbyRenderer } from "./view/DerbyRenderer";
import { DERBY_BALANCE as B } from "./config/DerbyBalance";

// Player screen-X for FX positioning
const PLAYER_SCREEN_X = 160;

// ---------------------------------------------------------------------------
// DerbyGame
// ---------------------------------------------------------------------------

export class DerbyGame {
  private _state!: DerbyState;
  private _renderer = new DerbyRenderer();
  private _tickerCb: ((ticker: Ticker) => void) | null = null;
  private _meta: DerbyMeta = loadDerbyMeta();

  // Key state
  private _keys = new Set<string>();
  private _keyDownHandler: ((e: KeyboardEvent) => void) | null = null;
  private _keyUpHandler: ((e: KeyboardEvent) => void) | null = null;

  // Track previous state for FX triggers
  private _prevCoins = 0;
  private _prevScore = 0;
  private _prevAIAlive = [true, true, true];
  private _prevHp = 3;
  private _prevBoost = 0;
  private _prevShield = 0;
  private _prevSpeed = 0;

  // ---------------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------------

  async boot(): Promise<void> {
    viewManager.clearWorld();
    viewManager.camera.zoom = 1;

    const sw = viewManager.screenWidth;
    const sh = viewManager.screenHeight;

    this._meta = loadDerbyMeta();
    this._state = createDerbyState();

    // Build renderer
    this._renderer.build(sw, sh);
    viewManager.addToLayer("background", this._renderer.container);

    // Wire pause menu callbacks
    this._renderer.onResume = () => {
      if (this._state.phase === DerbyPhase.PAUSED) {
        this._state.phase = DerbyPhase.RACING;
      }
    };
    this._renderer.onExitToMenu = () => this._exitToMenu();

    // Input
    this._initInput();

    // Reset procedural systems
    resetGenerator();
    resetAI();

    // Start game loop via Pixi ticker
    this._tickerCb = (ticker: Ticker) => {
      this._gameLoop(ticker.deltaMS / 1000);
    };
    viewManager.app.ticker.add(this._tickerCb);
  }

  // ---------------------------------------------------------------------------
  // Destroy
  // ---------------------------------------------------------------------------

  destroy(): void {
    if (this._tickerCb) {
      viewManager.app.ticker.remove(this._tickerCb);
      this._tickerCb = null;
    }
    this._destroyInput();
    viewManager.clearWorld();
  }

  // ---------------------------------------------------------------------------
  // Game Loop
  // ---------------------------------------------------------------------------

  private _gameLoop(rawDt: number): void {
    if (!this._state) return;
    const dt = Math.min(rawDt, 0.1); // clamp to avoid spiral of death
    const sw = viewManager.screenWidth;
    const sh = viewManager.screenHeight;

    // --- MENU ---
    if (this._state.phase === DerbyPhase.MENU) {
      if (this._keys.has(" ")) {
        this._startRace();
      }
      this._state.time += dt; // for menu animation
      this._renderer.render(this._state, sw, sh);
      return;
    }

    // --- PAUSE toggle ---
    // ESC is handled via keydown event (edge-triggered), not here.
    // Phase may already be PAUSED.

    // --- PAUSED ---
    if (this._state.phase === DerbyPhase.PAUSED) {
      this._renderer.render(this._state, sw, sh);
      return;
    }

    // --- RACING ---
    if (this._state.phase === DerbyPhase.RACING) {
      // Input: lane switching
      if (this._keys.has("ArrowUp")) {
        if (this._state.player.lane > 0) {
          this._state.player.lane -= 1;
        }
        this._keys.delete("ArrowUp"); // edge trigger
      }
      if (this._keys.has("ArrowDown")) {
        if (this._state.player.lane < B.LANE_COUNT - 1) {
          this._state.player.lane += 1;
        }
        this._keys.delete("ArrowDown"); // edge trigger
      }

      // Sprint
      this._state.player.sprinting = this._keys.has("Shift") || this._keys.has("ShiftLeft") || this._keys.has("ShiftRight");

      // Shoot at archery target (Space key)
      if (this._keys.has(" ") && this._state.archeryTarget?.active && !this._state.archeryTarget.hitBy) {
        this._keys.delete(" ");
        this._state.archeryTarget.hitBy = "player";
        this._state.player.score += 50;
        this._state.player.coins += 5;
        this._renderer.spawnCoinCollect(
          PLAYER_SCREEN_X + this._state.archeryTarget.x - this._state.scrollX,
          this._state.archeryTarget.y,
        );
        this._renderer.spawnComboText(
          PLAYER_SCREEN_X + this._state.archeryTarget.x - this._state.scrollX,
          this._state.archeryTarget.y - 20,
          "+50 BULLSEYE!",
        );
      }

      // Run systems
      updateRacing(this._state, dt);
      generateContent(this._state);
      updateAI(this._state, dt);
      this._updateArcheryTarget(dt);

      // --- FX triggers ---
      const p = this._state.player;
      const py = p.laneY;

      // Coin collect sparkle + combo display
      if (p.coins > this._prevCoins) {
        this._renderer.spawnCoinCollect(PLAYER_SCREEN_X, py);
        if (p.coinStreak > 2) {
          const mult = Math.min(1 + p.coinStreak * 0.25, 5).toFixed(1);
          this._renderer.spawnComboText(PLAYER_SCREEN_X + 30, py - 20, `${mult}x`);
        }
      }

      // Distance milestones (every 1000m)
      const currentMilestone = Math.floor(p.distance / 1000);
      if (currentMilestone > p.lastMilestone && currentMilestone > 0) {
        p.lastMilestone = currentMilestone;
        this._renderer.spawnMilestone(currentMilestone);
      }

      // Boost activated
      if (p.boostTimer > 0 && this._prevBoost <= 0) {
        this._renderer.spawnBoostFlash();
      }

      // Joust detection: score jumped by JOUST amount
      const scoreGain = p.score - this._prevScore;
      if (scoreGain >= B.SCORE_PER_JOUST && p.lanceTimer > 0) {
        this._renderer.spawnJoustSparks(PLAYER_SCREEN_X + 30, py);
        this._renderer.spawnComboText(PLAYER_SCREEN_X + 50, py - 30, "+100 JOUST!");
      }

      // AI crash explosions
      for (let ai = 0; ai < this._state.aiRiders.length; ai++) {
        const rider = this._state.aiRiders[ai];
        if (this._prevAIAlive[ai] && !rider.alive) {
          const aiScreenX = PLAYER_SCREEN_X + rider.x;
          const aiY = B.LANE_Y_START + rider.lane * B.LANE_SPACING;
          if (aiScreenX > -50 && aiScreenX < B.SCREEN_W + 50) {
            this._renderer.spawnCrashExplosion(aiScreenX, aiY);
          }
        }
        this._prevAIAlive[ai] = rider.alive;
      }

      // Damage taken
      if (p.hp < this._prevHp) {
        this._renderer.spawnCrashExplosion(PLAYER_SCREEN_X, py);
      }

      // Shield break (was active, now gone — absorbed a hit)
      if (this._prevShield > 0 && p.shieldTimer <= 0 && p.hp >= this._prevHp) {
        this._renderer.spawnShieldBreak(PLAYER_SCREEN_X, py);
      }

      // Mud slowdown (speed dropped significantly without sprinting change)
      if (p.speed < this._prevSpeed * 0.7 && this._prevSpeed > B.BASE_SPEED * 0.8) {
        this._renderer.spawnMudSplash(PLAYER_SCREEN_X, py);
      }

      // Crashed transition (phase was RACING at block entry; check if it changed)
      if ((this._state.phase as string) === DerbyPhase.CRASHED) {
        this._onCrash();
      }

      this._prevCoins = p.coins;
      this._prevHp = p.hp;
      this._prevScore = p.score;
      this._prevBoost = p.boostTimer;
      this._prevShield = p.shieldTimer;
      this._prevSpeed = p.speed;
    }

    // --- CRASHED ---
    if (this._state.phase === DerbyPhase.CRASHED) {
      if (this._keys.has(" ")) {
        this._keys.delete(" ");
        this._restart();
      }
      // Shop purchases (number keys 1-5)
      for (let k = 1; k <= 5; k++) {
        if (this._keys.has(String(k))) {
          this._keys.delete(String(k));
          this._tryPurchase(k - 1);
        }
      }
    }

    // Update shop data for renderer
    this._renderer.shopItems = this.getShopItems();
    this._renderer.shopCoins = this._meta.totalCoins;

    // Always render
    this._renderer.render(this._state, sw, sh);
  }

  // ---------------------------------------------------------------------------
  // State transitions
  // ---------------------------------------------------------------------------

  private _updateArcheryTarget(dt: number): void {
    const state = this._state;

    // Spawn timer
    if (!state.archeryTarget) {
      state.archerySpawnTimer -= dt;
      if (state.archerySpawnTimer <= 0) {
        // Spawn target in the lower part of screen, ahead of player
        state.archeryTarget = {
          x: state.scrollX + 400 + Math.random() * 300,
          y: B.GROUND_Y + 30 + Math.random() * 80,
          active: true,
          hitBy: null,
          timer: 4 + Math.random() * 2, // 4-6 seconds to hit
          radius: 25,
        };
        state.archerySpawnTimer = 10 + Math.random() * 8; // next target in 10-18s
      }
    }

    // Update active target
    if (state.archeryTarget) {
      const t = state.archeryTarget;
      t.timer -= dt;

      // AI riders try to shoot (each has a chance per second)
      if (t.active && !t.hitBy) {
        for (const rider of state.aiRiders) {
          if (!rider.alive) continue;
          const screenX = PLAYER_SCREEN_X + rider.x;
          // Only shoot if target is on-screen and rider is reasonably close
          const targetScreenX = t.x - state.scrollX;
          if (targetScreenX > 0 && targetScreenX < B.SCREEN_W && Math.abs(screenX - targetScreenX) < 400) {
            // Varying accuracy: 5-15% chance per second
            const accuracy = 0.05 + Math.random() * 0.1;
            if (Math.random() < accuracy * dt) {
              t.hitBy = rider.name;
              t.active = false;
              this._renderer.spawnComboText(targetScreenX, t.y - 20, `${rider.name} hit!`);
            }
          }
        }
      }

      // Player hit
      if (t.hitBy === "player") {
        t.active = false;
      }

      // Expired
      if (t.timer <= 0) {
        state.archeryTarget = null;
      } else if (!t.active && t.timer < t.timer) {
        // Show hit result briefly, then remove
        t.timer = Math.min(t.timer, 1.0); // keep for 1 more second after hit
      }

      // Remove hit targets after brief display
      if (t && !t.active && t.timer <= 0) {
        state.archeryTarget = null;
      }
    }
  }

  private _startRace(): void {
    this._keys.delete(" ");
    this._state.phase = DerbyPhase.RACING;
    // Reset renderer overlays for fresh crash/menu on next transition
    this._renderer.resetOverlays();
    this._prevCoins = 0;
    this._prevScore = 0;
    this._prevAIAlive = [true, true, true];
    this._prevHp = this._state.player.hp;
    this._prevShield = 0;
    this._prevSpeed = B.BASE_SPEED;

    this._prevBoost = 0;
  }

  private _onCrash(): void {
    // Save meta
    const p = this._state.player;
    this._meta.totalRaces += 1;
    this._meta.totalCoins += p.coins;
    if (p.score > this._meta.highScore) this._meta.highScore = p.score;
    if (p.distance > this._meta.bestDistance) this._meta.bestDistance = p.distance;
    saveDerbyMeta(this._meta);

    // Crash explosion + tumble animation
    this._renderer.spawnCrashExplosion(PLAYER_SCREEN_X, p.laneY);
    this._renderer.spawnHorseTumble(PLAYER_SCREEN_X, p.laneY);

    // Reset overlay built flags so crash screen rebuilds with new stats
    this._renderer.resetOverlays();
  }

  private static SHOP_ITEMS = [
    { key: "extraHp" as const, name: "Extra HP", cost: 30, max: 2, desc: "+1 starting HP" },
    { key: "staminaRegenBonus" as const, name: "Stamina Regen+", cost: 25, max: 2, desc: "+5 regen/sec" },
    { key: "boostDurationBonus" as const, name: "Boost Duration+", cost: 20, max: 2, desc: "+0.5s boost" },
    { key: "magnetRangeBonus" as const, name: "Magnet Range+", cost: 20, max: 2, desc: "+30 range" },
    { key: "luckBonus" as const, name: "Lucky Horseshoe", cost: 35, max: 2, desc: "More pickups" },
  ];

  private _tryPurchase(idx: number): void {
    const item = DerbyGame.SHOP_ITEMS[idx];
    if (!item) return;
    const current = this._meta[item.key] as number;
    if (current >= item.max) return;
    if (this._meta.totalCoins < item.cost) return;
    this._meta.totalCoins -= item.cost;
    (this._meta as any)[item.key] = current + 1;
    saveDerbyMeta(this._meta);
    this._renderer.resetOverlays(); // rebuild crash screen with updated shop
  }

  /** Get shop items for renderer. */
  getShopItems(): Array<{ name: string; cost: number; max: number; current: number; desc: string }> {
    return DerbyGame.SHOP_ITEMS.map(item => ({
      name: item.name,
      cost: item.cost,
      max: item.max,
      current: this._meta[item.key] as number,
      desc: item.desc,
    }));
  }

  private _restart(): void {
    // Create fresh state, preserving meta high scores
    this._state = createDerbyState();
    this._state.phase = DerbyPhase.RACING;

    // Reset systems
    resetGenerator();
    resetAI();

    this._renderer.resetOverlays();
    this._prevCoins = 0;
    this._prevScore = 0;
    this._prevAIAlive = [true, true, true];
    this._prevHp = this._state.player.hp;
    this._prevShield = 0;
    this._prevSpeed = B.BASE_SPEED;

    this._prevBoost = 0;
  }

  // ---------------------------------------------------------------------------
  // Input
  // ---------------------------------------------------------------------------

  private _exitToMenu(): void {
    window.dispatchEvent(new CustomEvent("derbyExit"));
  }

  private _initInput(): void {
    // WASD keys are not used in derby — block them so they don't scroll the page
    const BLOCKED_KEYS = new Set(["w", "a", "s", "d", "W", "A", "S", "D"]);

    this._keyDownHandler = (e: KeyboardEvent) => {
      if (BLOCKED_KEYS.has(e.key)) {
        e.preventDefault();
        return;
      }
      this._keys.add(e.key);

      // ESC: open pause menu; when paused, ESC also resumes
      if (e.key === "Escape") {
        if (this._state.phase === DerbyPhase.RACING) {
          this._state.phase = DerbyPhase.PAUSED;
        } else if (this._state.phase === DerbyPhase.PAUSED) {
          this._state.phase = DerbyPhase.RACING;
        }
      }
    };

    this._keyUpHandler = (e: KeyboardEvent) => {
      this._keys.delete(e.key);
    };

    window.addEventListener("keydown", this._keyDownHandler);
    window.addEventListener("keyup", this._keyUpHandler);
  }

  private _destroyInput(): void {
    if (this._keyDownHandler) {
      window.removeEventListener("keydown", this._keyDownHandler);
      this._keyDownHandler = null;
    }
    if (this._keyUpHandler) {
      window.removeEventListener("keyup", this._keyUpHandler);
      this._keyUpHandler = null;
    }
    this._keys.clear();
  }
}
