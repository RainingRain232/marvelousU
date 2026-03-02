// Fixed-timestep simulation loop — 60 ticks/sec, decoupled from render framerate.
//
// Architecture:
//   - Uses the accumulator pattern: real elapsed time is accumulated and consumed
//     in discrete SIM_TICK_MS chunks. This keeps simulation deterministic regardless
//     of render framerate.
//   - The loop drives itself via setTimeout (not requestAnimationFrame) so that
//     sim/ stays free of DOM APIs and the loop can run in Node (for tests).
//   - The view layer hooks in via onTick callback to read interpolated state.
//
// System update order (matches claude.md §4.3):
//   Spawn → Ability → Movement → Combat → Projectile → Building → AI

import { BalanceConfig } from "@sim/config/BalanceConfig";
import type { GameState } from "@sim/state/GameState";
import { UnitType, BuildingType, UnitState } from "@/types";
import { SpawnSystem } from "@sim/systems/SpawnSystem";
import { AbilitySystem } from "@sim/systems/AbilitySystem";
import { MovementSystem } from "@sim/systems/MovementSystem";
import { CombatSystem } from "@sim/systems/CombatSystem";
import { ProjectileSystem } from "@sim/systems/ProjectileSystem";
import { BuildingSystem } from "@sim/systems/BuildingSystem";
import { AISystem } from "@sim/systems/AISystem";
import { PhaseSystem } from "@sim/systems/PhaseSystem";
import { EconomySystem } from "@sim/systems/EconomySystem";
import { UnitBehaviorSystem } from "@sim/systems/UnitBehaviorSystem";
import { RandomEventSystem } from "@sim/systems/RandomEventSystem";
import { RegenSystem } from "@sim/systems/RegenSystem";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Called after each sim tick. `alpha` is the fractional remainder [0,1]
 *  that the view can use to interpolate between the previous and current state. */
export type TickCallback = (state: GameState, alpha: number) => void;

// ---------------------------------------------------------------------------
// Internal tick function — pure, testable
// ---------------------------------------------------------------------------

/** Maximum ms of elapsed time processed per frame (prevents spiral-of-death). */
const MAX_DELTA_MS = 200;

/** dt in seconds passed to each system. */
const DT = BalanceConfig.SIM_TICK_MS / 1000;

export function simTick(state: GameState): void {
  PhaseSystem.update(state, DT);
  RandomEventSystem.update(state, DT);
  EconomySystem.update(state, DT);
  UnitBehaviorSystem.update(state, DT);
  RegenSystem.update(state, DT);
  SpawnSystem.update(state, DT);
  AbilitySystem.update(state, DT);
  MovementSystem.update(state, DT);
  CombatSystem.update(state, DT);
  ProjectileSystem.update(state, DT);
  BuildingSystem.update(state, DT);
  AISystem.update(state, DT);
  
  // Questing Knight special behavior - run last to override other systems
  for (const unit of state.units.values()) {
    if (unit.type === UnitType.QUESTING_KNIGHT && unit.questingKnightTimer && unit.questingKnightTimer > 0) {
      // Check if Questing Knight is actually near the friendly castle (4 tiles away)
      let isNearFriendlyCastle = false;
      let friendlyCastlePos = null;
      
      for (const building of state.buildings.values()) {
        if (building.owner === unit.owner && building.type === BuildingType.CASTLE) {
          friendlyCastlePos = building.position;
          // Check distance (4 tiles away means distance <= 4.5)
          const dx = Math.abs(unit.position.x - friendlyCastlePos.x);
          const dy = Math.abs(unit.position.y - friendlyCastlePos.y);
          if (dx <= 4.5 && dy <= 4.5) {
            isNearFriendlyCastle = true;
          }
          break;
        }
      }
      
      if (isNearFriendlyCastle) {
        // Force unit to stay in IDLE state and count down
        unit.state = UnitState.IDLE;
        unit.questingKnightTimer -= DT;
        
        if (unit.questingKnightTimer <= 0) {
          unit.questingKnightTimer = undefined;
          unit.targetId = null; // Clear friendly castle target, now it can behave normally
          // Unit can now move normally - continue to regular behavior
        }
      } else {
        // Not near friendly castle yet, force it to move there
        // Force direct path to friendly castle instead of just targetId
        for (const building of state.buildings.values()) {
          if (building.owner === unit.owner && building.type === BuildingType.CASTLE) {
            // Set direct path to castle position (4 tiles away)
            unit.path = [{ x: building.position.x + 4, y: building.position.y + 4 }];
            unit.pathIndex = 0;
            unit.targetId = building.id;
            unit.state = UnitState.MOVE;
            break;
          }
        }
      }
    }
  }
  
  state.tick++;
}

// ---------------------------------------------------------------------------
// SimLoop class
// ---------------------------------------------------------------------------

export class SimLoop {
  private state: GameState;
  private running: boolean = false;
  private paused: boolean = false;
  private accumulator: number = 0; // ms
  private lastTime: number = 0; // ms (from performance.now())
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private onTick: TickCallback | null = null;

  /** Game speed multiplier. 1.0 = normal, 1.1 = 10% faster, 0.9 = 10% slower. */
  private _timeScale: number = 1.0;

  // ---------------------------------------------------------------------------
  // Cinematic speed ramp system for scenario 1
  // ---------------------------------------------------------------------------

  private _cinematicSpeedActive = false;
  private _startTime = 0; // When the cinematic speed started
  private _originalTimeScale = 1.0;

  constructor(state: GameState, onTick?: TickCallback) {
    this.state = state;
    this.onTick = onTick ?? null;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  get isRunning(): boolean {
    return this.running;
  }

  get isPaused(): boolean {
    return this.paused;
  }

  /** Current game speed multiplier. */
  get timeScale(): number {
    if (this._cinematicSpeedActive) {
      const speed = this._getCinematicSpeed();
      console.log(`Cinematic speed active: ${speed}`);
      return speed;
    }
    console.log(`Normal speed: ${this._timeScale}`);
    return this._timeScale;
  }

  /**
   * Start cinematic speed ramp for scenario 1 - gradually increase from 20% to 100% over 5 seconds
   */
  startCinematicSpeed(): void {
    if (this._cinematicSpeedActive) return;
    
    console.log("Starting cinematic speed ramp");
    this._cinematicSpeedActive = true;
    this._startTime = performance.now();
    this._originalTimeScale = this._timeScale;
    console.log(`Original time scale: ${this._originalTimeScale}`);
  }

  /**
   * Stop cinematic speed ramp and return to normal speed control
   */
  stopCinematicSpeed(): void {
    this._cinematicSpeedActive = false;
    this._timeScale = this._originalTimeScale;
  }

  /**
   * Check if cinematic speed ramp is currently active
   */
  get isCinematicSpeedActive(): boolean {
    return this._cinematicSpeedActive;
  }

  /**
   * Calculate the current cinematic speed based on progress
   * 0-5s: 20%, 5-10s: 40%, 10-15s: 60%, 15-20s: 80%, 20s+: 100%
   */
  private _getCinematicSpeed(): number {
    const elapsed = (performance.now() - this._startTime) / 1000; // Convert to seconds
    
    // Debug logging
    if (elapsed % 2 < 0.1) { // Log every ~2 seconds
      console.log(`Cinematic speed: ${elapsed.toFixed(1)}s elapsed`);
    }
    
    if (elapsed < 5) {
      console.log(`Setting speed to 20% (elapsed: ${elapsed.toFixed(1)}s)`);
      return 0.2; // 20% for first 5 seconds
    } else if (elapsed < 10) {
      console.log(`Setting speed to 40% (elapsed: ${elapsed.toFixed(1)}s)`);
      return 0.4; // 40% for next 5 seconds
    } else if (elapsed < 15) {
      console.log(`Setting speed to 60% (elapsed: ${elapsed.toFixed(1)}s)`);
      return 0.6; // 60% for next 5 seconds
    } else if (elapsed < 20) {
      console.log(`Setting speed to 80% (elapsed: ${elapsed.toFixed(1)}s)`);
      return 0.8; // 80% for next 5 seconds
    } else {
      // After 20 seconds, return to normal speed
      console.log(`Cinematic speed complete, returning to normal speed`);
      this._cinematicSpeedActive = false;
      this._timeScale = this._originalTimeScale;
      return this._timeScale;
    }
  }

  /** Increase game speed by 20%. */
  speedUp(): void {
    if (this._cinematicSpeedActive) {
      console.log("Speed up blocked - cinematic speed active");
      return; // Don't allow speed changes during cinematic
    }
    this._timeScale = Math.round((this._timeScale + 0.2) * 100) / 100;
  }

  /** Decrease game speed by 20% (minimum 0.2). */
  speedDown(): void {
    if (this._cinematicSpeedActive) {
      console.log("Speed down blocked - cinematic speed active");
      return; // Don't allow speed changes during cinematic
    }
    this._timeScale = Math.max(0.2, Math.round((this._timeScale - 0.2) * 100) / 100);
  }

  /** Pause the simulation. No-op if already paused or not running. */
  pause(): void {
    if (!this.running || this.paused) return;
    this.paused = true;
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  /** Resume after a pause. Resets lastTime so no time is counted while paused. */
  resume(): void {
    if (!this.running || !this.paused) return;
    this.paused = false;
    this.lastTime = performance.now(); // discard elapsed time during pause
    this.accumulator = 0;
    this.schedule();
  }

  /** Toggle between paused and running. */
  togglePause(): void {
    if (this.paused) this.resume(); else this.pause();
  }

  /** Start the loop. Safe to call multiple times — no-ops if already running. */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.schedule();
  }

  /** Stop the loop. */
  stop(): void {
    this.running = false;
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  /**
   * Manually advance the simulation by exactly one tick.
   * Intended for tests and replay systems — does NOT require the loop to be running.
   */
  manualStep(): void {
    simTick(this.state);
    this.onTick?.(this.state, 0);
  }

  /**
   * Feed elapsed milliseconds into the accumulator and drain full ticks.
   * Exposed for testing without needing real timers.
   */
  advance(elapsedMs: number): void {
    const clamped = Math.min(elapsedMs, MAX_DELTA_MS);
    this.accumulator += clamped * this._timeScale;

    while (this.accumulator >= BalanceConfig.SIM_TICK_MS) {
      simTick(this.state);
      this.accumulator -= BalanceConfig.SIM_TICK_MS;
    }

    const alpha = this.accumulator / BalanceConfig.SIM_TICK_MS;
    this.onTick?.(this.state, alpha);
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private schedule(): void {
    if (!this.running) return;
    // Target the next tick ~16ms from now; real elapsed time measured on wakeup.
    this.timerId = setTimeout(this.loop, BalanceConfig.SIM_TICK_MS);
  }

  private loop = (): void => {
    if (!this.running) return;

    const now = performance.now();
    const elapsed = now - this.lastTime;
    this.lastTime = now;

    this.advance(elapsed);
    this.schedule();
  };
}
