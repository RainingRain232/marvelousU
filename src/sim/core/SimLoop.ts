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
import { SpawnSystem } from "@sim/systems/SpawnSystem";
import { AbilitySystem } from "@sim/systems/AbilitySystem";
import { MovementSystem } from "@sim/systems/MovementSystem";
import { CombatSystem } from "@sim/systems/CombatSystem";
import { ProjectileSystem } from "@sim/systems/ProjectileSystem";
import { BuildingSystem } from "@sim/systems/BuildingSystem";
import { AISystem } from "@sim/systems/AISystem";

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
  SpawnSystem.update(state, DT);
  AbilitySystem.update(state, DT);
  MovementSystem.update(state, DT);
  CombatSystem.update(state, DT);
  ProjectileSystem.update(state, DT);
  BuildingSystem.update(state, DT);
  AISystem.update(state, DT);
  state.tick++;
}

// ---------------------------------------------------------------------------
// SimLoop class
// ---------------------------------------------------------------------------

export class SimLoop {
  private state: GameState;
  private running: boolean = false;
  private accumulator: number = 0; // ms
  private lastTime: number = 0; // ms (from performance.now())
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private onTick: TickCallback | null = null;

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
    this.accumulator += clamped;

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
