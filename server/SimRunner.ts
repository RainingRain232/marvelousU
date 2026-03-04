// Headless simulation runner for the authoritative server.
//
// Wraps SimLoop to run the game without any view layer.
// Produces serialized state snapshots at configurable intervals.

import type { GameState } from "@sim/state/GameState";
import { simTick } from "@sim/core/SimLoop";
import { serializeState } from "@net/serialization";
import type { SerializedGameState } from "@net/protocol";
import { GamePhase } from "@/types";

/** How often to broadcast snapshots during BATTLE (every N ticks). */
const SNAPSHOT_INTERVAL = 6; // 10 Hz at 60 ticks/sec

/** dt in seconds per tick (matches SimLoop). */
const SIM_TICK_MS = 1000 / 60;

export class SimRunner {
  private _state: GameState;
  private _timer: ReturnType<typeof setInterval> | null = null;
  private _onSnapshot: ((snapshot: SerializedGameState, tick: number) => void) | null = null;
  private _onPhaseChange: ((phase: GamePhase, timer: number) => void) | null = null;
  private _onGameOver: ((winnerId: string | null) => void) | null = null;
  private _lastPhase: GamePhase;
  private _ticksSinceSnapshot = 0;

  constructor(state: GameState) {
    this._state = state;
    this._lastPhase = state.phase;
  }

  get state(): GameState {
    return this._state;
  }

  /** Register callback for periodic state snapshots. */
  onSnapshot(cb: (snapshot: SerializedGameState, tick: number) => void): void {
    this._onSnapshot = cb;
  }

  /** Register callback for phase transitions. */
  onPhaseChange(cb: (phase: GamePhase, timer: number) => void): void {
    this._onPhaseChange = cb;
  }

  /** Register callback for game over. */
  onGameOver(cb: (winnerId: string | null) => void): void {
    this._onGameOver = cb;
  }

  /** Start the simulation loop. */
  start(): void {
    if (this._timer) return;
    this._timer = setInterval(() => this._tick(), SIM_TICK_MS);
  }

  /** Stop the simulation loop. */
  stop(): void {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  /** Get a full serialized snapshot of the current state. */
  getSnapshot(): SerializedGameState {
    return serializeState(this._state);
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private _tick(): void {
    simTick(this._state);
    this._ticksSinceSnapshot++;

    // Check for phase change
    if (this._state.phase !== this._lastPhase) {
      const newPhase = this._state.phase;
      this._lastPhase = newPhase;
      this._onPhaseChange?.(newPhase, this._state.phaseTimer);

      // Send immediate snapshot on phase change
      this._broadcastSnapshot();

      // Check for game over
      if (newPhase === GamePhase.RESOLVE && this._state.winnerId !== null) {
        this._onGameOver?.(this._state.winnerId);
      }
    }

    // Periodic snapshot during BATTLE
    if (
      this._state.phase === GamePhase.BATTLE &&
      this._ticksSinceSnapshot >= SNAPSHOT_INTERVAL
    ) {
      this._broadcastSnapshot();
    }
  }

  private _broadcastSnapshot(): void {
    this._ticksSinceSnapshot = 0;
    this._onSnapshot?.(serializeState(this._state), this._state.tick);
  }
}
