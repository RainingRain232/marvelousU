// ---------------------------------------------------------------------------
// Camelot Ascent – Main Game Orchestrator
// Boots the game, runs the loop, delegates to systems and renderer
// ---------------------------------------------------------------------------

import { Ticker } from "pixi.js";
import { viewManager } from "../view/ViewManager";
import { AscentPhase } from "./types";
import type { AscentState } from "./types";
import { createAscentState, loadAscentMeta, saveAscentMeta } from "./state/AscentState";
import { updatePhysics } from "./systems/AscentPhysicsSystem";
import { generatePlatforms, cleanupOffscreen, resetGenerator } from "./systems/AscentGeneratorSystem";
import { initInput, destroyInput, getInput, applyInput, getNumberKeyOnce, type InputState } from "./systems/AscentInputSystem";
import { AscentRenderer } from "./view/AscentRenderer";
import { ASCENT_BALANCE as B } from "./config/AscentBalance";

// ---------------------------------------------------------------------------
// Shop configuration
// ---------------------------------------------------------------------------

interface ShopItem {
  name: string;
  cost: number;
  metaKey: "permanentExtraHp" | "unlockedProjectile" | "unlockedTripleJump" | "unlockedDash";
  maxValue?: number; // for permanentExtraHp
}

const SHOP_ITEMS: ShopItem[] = [
  { name: "Extra HP (+1)", cost: 100, metaKey: "permanentExtraHp", maxValue: 2 },
  { name: "Projectile Attack", cost: 200, metaKey: "unlockedProjectile" },
  { name: "Triple Jump", cost: 150, metaKey: "unlockedTripleJump" },
  { name: "Dash", cost: 250, metaKey: "unlockedDash" },
];

// ---------------------------------------------------------------------------
// AscentGame
// ---------------------------------------------------------------------------

export class AscentGame {
  private _state!: AscentState;
  private _renderer = new AscentRenderer();
  private _tickerCb: ((ticker: Ticker) => void) | null = null;
  private _wasGrounded = false;
  private _prevVy = 0;
  private _prevHp = 3;
  private _prevCoins = 0;
  private _prevEnemyCount = 0;
  private _prevFloor = 0;
  private _prevBossActive = false;
  private _meta = loadAscentMeta();

  // ---------------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------------

  async boot(): Promise<void> {
    viewManager.clearWorld();

    // Disable camera pan/zoom — Ascent manages its own camera via cameraY
    viewManager.camera.zoom = 1;

    const sw = viewManager.screenWidth;
    const sh = viewManager.screenHeight;

    // Create initial state — start on START screen
    this._meta = loadAscentMeta();
    this._state = createAscentState(AscentPhase.START);

    // Build renderer and add to layers
    this._renderer.build(sw, sh);
    viewManager.addToLayer("background", this._renderer.container);

    // Input
    initInput();

    // Reset generator state
    resetGenerator();

    // Start game loop
    this._tickerCb = (ticker: Ticker) => {
      this._gameLoop(ticker.deltaMS / 1000);
    };
    viewManager.app.ticker.add(this._tickerCb);
  }

  // ---------------------------------------------------------------------------
  // Game Loop
  // ---------------------------------------------------------------------------

  private _gameLoop(rawDt: number): void {
    if (!this._state) return;

    // Clamp delta to avoid spiral of death on tab-out
    const dt = Math.min(rawDt, 0.1);
    const sw = viewManager.screenWidth;
    const sh = viewManager.screenHeight;

    // Read input once per frame
    const frameInput = getInput();

    // --- Start Screen ---
    if (this._state.phase === AscentPhase.START) {
      if (frameInput.jump) {
        this._startGame();
      }
      // Accumulate time for animations on start screen
      this._state.time += dt;
      this._renderer.render(this._state, sw, sh);
      return;
    }

    // --- Pause toggle ---
    if (this._state.phase === AscentPhase.PLAYING || this._state.phase === AscentPhase.PAUSED) {
      if (frameInput.pause) {
        if (this._state.phase === AscentPhase.PLAYING) {
          this._state.phase = AscentPhase.PAUSED;
        } else {
          this._state.phase = AscentPhase.PLAYING;
        }
      }
    }

    // --- Paused: only render ---
    if (this._state.phase === AscentPhase.PAUSED) {
      this._renderer.render(this._state, sw, sh);
      return;
    }

    if (this._state.phase === AscentPhase.PLAYING) {
      // --- Input → player velocity ---
      this._handleInput(dt, frameInput);

      // --- Physics ---
      updatePhysics(this._state, dt);

      // --- Generator: spawn new platforms above camera, despawn below ---
      const generateUpTo = this._state.cameraY - B.GENERATION_BUFFER;
      generatePlatforms(this._state, generateUpTo);
      cleanupOffscreen(this._state);

      // --- Update camera (follow player upward) ---
      // Camera should follow the player but only move upward (negative Y = higher)
      const targetCamY = this._state.player.y - sh * 0.6;
      if (targetCamY < this._state.cameraY) {
        this._state.cameraY = targetCamY;
      }

      // --- Track highest point & floor ---
      if (this._state.player.y < this._state.player.highestY) {
        this._state.player.highestY = this._state.player.y;
        // Floor is based on how far up we've climbed (negative Y = higher)
        this._state.floor = Math.floor(
          Math.abs(this._state.player.highestY) / B.PLATFORM_SPACING_Y,
        );
        this._state.player.floor = this._state.floor;
        // Score increases with floor
        this._state.player.score = Math.max(
          this._state.player.score,
          this._state.floor * B.SCORE_PER_FLOOR +
            this._state.player.coins * B.SCORE_PER_COIN,
        );
      }

      // --- Death check: fell below camera ---
      if (this._state.player.y > this._state.cameraY + sh + 200) {
        this._die();
      }

      // --- Death check: HP depleted ---
      if (this._state.player.hp <= 0) {
        this._die();
      }

      // --- Accumulate time ---
      this._state.time += dt;

      // ── Zone transition banner ──
      if (this._state.floor !== this._prevFloor) {
        const prevZone = Math.min(Math.floor(this._prevFloor / B.ZONE_FLOORS), B.ZONES.length - 1);
        const currZone = Math.min(Math.floor(this._state.floor / B.ZONE_FLOORS), B.ZONES.length - 1);
        if (currZone !== prevZone) {
          this._renderer.spawnScorePopup(sw / 2, 200, B.ZONES[currZone].name);
        }
        this._prevFloor = this._state.floor;
      }

      // ── Visual feedback triggers ──
      const p = this._state.player;
      const screenY = p.y - this._state.cameraY;

      // Jump dust (was grounded, now not)
      if (this._wasGrounded && !p.grounded && p.vy < 0) {
        this._renderer.spawnJumpDust(p.x, screenY + p.height);
      }
      // Land dust (was not grounded, now is)
      if (!this._wasGrounded && p.grounded) {
        this._renderer.spawnLandDust(p.x, screenY + p.height);
        // Heavy landing shake (if fell fast)
        if (this._prevVy > 400) {
          this._renderer.spawnScreenShake();
        }
      }
      // Fall speed lines (falling fast)
      if (p.vy > 350 && !p.grounded && Math.random() < 0.4) {
        this._renderer.spawnFallLines(p.x + p.width / 2, screenY + p.height / 2);
      }
      // Damage flash
      if (p.hp < this._prevHp) {
        this._renderer.spawnDamageFlash();
        this._renderer.spawnScreenShake();
      }
      // Coin collect
      if (p.coins > this._prevCoins) {
        this._renderer.spawnCoinCollect(p.x, screenY - 10, (p.coins - this._prevCoins) * B.COIN_VALUE);
      }
      // Combo timer countdown
      if (p.comboTimer > 0) {
        p.comboTimer -= dt;
        if (p.comboTimer <= 0) {
          p.combo = 0;
        }
      }

      // Enemy killed (stomp or projectile)
      const currentAliveEnemies = this._state.enemies.filter(e => e.alive).length;
      const killCount = this._prevEnemyCount - currentAliveEnemies;
      if (killCount > 0) {
        p.combo += killCount;
        p.comboTimer = 2.0; // 2 seconds to chain
        if (p.combo > p.highestCombo) p.highestCombo = p.combo;

        // Combo multiplier: bonus score
        const comboMult = Math.min(p.combo, 10); // cap at 10x
        const bonusScore = killCount * B.SCORE_PER_ENEMY_KILL * (comboMult - 1);
        if (bonusScore > 0) p.score += bonusScore;

        // Visual: show combo count if > 1
        if (p.combo > 1) {
          this._renderer.spawnComboText(p.x, screenY - 30, p.combo);
        }
        this._renderer.spawnEnemyKill(p.x, screenY);
      }

      // Boss defeated celebration
      if (this._prevBossActive && !this._state.bossActive) {
        this._renderer.spawnBossVictory();
      }

      this._wasGrounded = p.grounded;
      this._prevVy = p.vy;
      this._prevHp = p.hp;
      this._prevCoins = p.coins;
      this._prevEnemyCount = currentAliveEnemies;
      this._prevBossActive = this._state.bossActive;
    }

    if (this._state.phase === AscentPhase.DEAD) {
      // Check for space to restart
      if (frameInput.jump) {
        this._startGame();
      }

      // Shop purchases on death screen
      const numKey = getNumberKeyOnce();
      if (numKey >= 1 && numKey <= SHOP_ITEMS.length) {
        this._tryPurchase(numKey - 1);
      }
    }

    // Always render
    this._renderer.render(this._state, sw, sh);
  }

  // ---------------------------------------------------------------------------
  // Input handling (supplements applyInput with speed boost + screen wrap)
  // ---------------------------------------------------------------------------

  private _handleInput(_dt: number, input: InputState): void {
    const player = this._state.player;

    // Apply base input (sets vx, handles jump with consumed-key logic)
    applyInput(this._state, input);

    // --- Attack (projectile spawn) ---
    if (input.attack && player.attackCooldown <= 0 && this._meta.unlockedProjectile) {
      player.attackCooldown = 0.4;
      const projX = player.x + player.width / 2;
      const projScreenY = player.y + player.height / 2 - this._state.cameraY;
      this._state.projectiles.push({
        x: projX,
        y: player.y + player.height / 2,
        vx: 400 * player.facing,
        vy: 0,
        fromPlayer: true,
        damage: 1,
        lifetime: 1.5,
      });
      // Muzzle flash
      this._renderer.spawnMuzzleFlash(projX + player.facing * 12, projScreenY);
    }

    // --- Dash ---
    if (input.dash && player.dashTimer <= 0 && this._meta.unlockedDash) {
      player.dashTimer = 0.8; // cooldown
      player.vx = player.facing * 500;
      player.invincibleTimer = Math.max(player.invincibleTimer, 0.2);
      // Dash burst effect
      const dashScreenY = player.y - this._state.cameraY + player.height / 2;
      this._renderer.spawnDashBurst(player.x + player.width / 2, dashScreenY, player.facing);
    }

    // Update facing direction
    if (player.vx < 0) player.facing = -1;
    else if (player.vx > 0) player.facing = 1;

  }

  // ---------------------------------------------------------------------------
  // Shop purchase
  // ---------------------------------------------------------------------------

  private _tryPurchase(index: number): void {
    const item = SHOP_ITEMS[index];
    if (!item) return;

    const meta = loadAscentMeta();

    // Check if already maxed
    if (item.metaKey === "permanentExtraHp") {
      if (meta.permanentExtraHp >= (item.maxValue ?? 2)) return;
    } else {
      if (meta[item.metaKey]) return; // already unlocked
    }

    if (meta.totalCoins < item.cost) return;

    // Purchase
    meta.totalCoins -= item.cost;
    if (item.metaKey === "permanentExtraHp") {
      meta.permanentExtraHp += 1;
    } else {
      (meta[item.metaKey] as boolean) = true;
    }

    saveAscentMeta(meta);
    this._meta = meta;

    // Force death screen to rebuild with updated shop data
    this._renderer.invalidateDeathScreen();
  }

  // ---------------------------------------------------------------------------
  // Start / Restart
  // ---------------------------------------------------------------------------

  private _startGame(): void {
    this._meta = loadAscentMeta();
    resetGenerator();
    this._state = createAscentState(AscentPhase.PLAYING);
    this._wasGrounded = false;
    this._prevVy = 0;
    this._prevHp = this._state.player.hp;
    this._prevCoins = 0;
    this._prevEnemyCount = 0;
    this._prevFloor = 0;
    this._prevBossActive = false;
  }

  // ---------------------------------------------------------------------------
  // Death
  // ---------------------------------------------------------------------------

  private _die(): void {
    if (this._state.phase === AscentPhase.DEAD) return;
    this._state.phase = AscentPhase.DEAD;

    // Death explosion effect
    const screenY = this._state.player.y - this._state.cameraY;
    this._renderer.spawnDeathExplosion(this._state.player.x, screenY);

    // Update high score & meta
    const meta = loadAscentMeta();
    meta.gamesPlayed++;
    meta.totalDeaths++;
    meta.totalCoins += this._state.player.coins;
    if (this._state.player.score > meta.highScore) {
      meta.highScore = this._state.player.score;
    }
    if (this._state.floor > meta.bestFloor) {
      meta.bestFloor = this._state.floor;
    }
    saveAscentMeta(meta);
    this._meta = meta;

    this._state.highScore = meta.highScore;
    this._state.deathCount = meta.totalDeaths;
  }

  // ---------------------------------------------------------------------------
  // Cleanup / Destroy
  // ---------------------------------------------------------------------------

  private _cleanup(): void {
    if (this._tickerCb) {
      viewManager.app.ticker.remove(this._tickerCb);
      this._tickerCb = null;
    }
    destroyInput();
    this._renderer.cleanup();
    viewManager.removeFromLayer("background", this._renderer.container);
    viewManager.clearWorld();
  }

  destroy(): void {
    this._cleanup();
  }
}
