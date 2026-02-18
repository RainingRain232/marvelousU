// Generic Finite State Machine used by units (IDLE, MOVE, ATTACK, CAST, DIE)

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Defines a valid state transition.
 * `from` can be a single state, an array of states, or `"*"` (any state).
 */
export interface StateTransition<S extends string> {
  from: S | S[] | "*";
  to: S;
}

/**
 * Callbacks for a single state.
 * All are optional — omit any you don't need.
 */
export interface StateConfig<S extends string> {
  onEnter?: (prevState: S | null) => void;
  onExit?: (nextState: S) => void;
  onUpdate?: (dt: number) => void;
}

// ---------------------------------------------------------------------------
// StateMachine
// ---------------------------------------------------------------------------

export class StateMachine<S extends string> {
  private _current: S;
  private transitions: StateTransition<S>[];
  private states: Partial<Record<S, StateConfig<S>>>;

  /**
   * @param initial     - Starting state (onEnter will be called immediately).
   * @param transitions - Allowed transitions. Use `from: "*"` for any-state rules.
   * @param states      - Optional per-state lifecycle callbacks.
   */
  constructor(
    initial: S,
    transitions: StateTransition<S>[],
    states: Partial<Record<S, StateConfig<S>>> = {},
  ) {
    this._current = initial;
    this.transitions = transitions;
    this.states = states;

    // Fire onEnter for the initial state (prev = null)
    this.states[initial]?.onEnter?.(null as unknown as S);
  }

  // ---------------------------------------------------------------------------
  // Read
  // ---------------------------------------------------------------------------

  /** Current active state. */
  get currentState(): S {
    return this._current;
  }

  /** Returns true if a transition from the current state to `to` is allowed. */
  canTransition(to: S): boolean {
    return this.transitions.some((t) => {
      if (t.to !== to) return false;
      if (t.from === "*") return true;
      const froms = Array.isArray(t.from) ? t.from : [t.from];
      return froms.includes(this._current);
    });
  }

  // ---------------------------------------------------------------------------
  // Mutation
  // ---------------------------------------------------------------------------

  /**
   * Attempt to transition to `newState`.
   * - Calls `onExit` on the current state.
   * - Calls `onEnter` on the new state.
   * @returns `true` if the transition succeeded, `false` if it was not allowed.
   */
  setState(newState: S): boolean {
    if (!this.canTransition(newState)) return false;

    const prev = this._current;
    this.states[prev]?.onExit?.(newState);
    this._current = newState;
    this.states[newState]?.onEnter?.(prev);

    return true;
  }

  /**
   * Tick the current state's `onUpdate` callback.
   * Call once per simulation tick.
   */
  update(dt: number): void {
    this.states[this._current]?.onUpdate?.(dt);
  }

  /**
   * Force-set state without checking transition rules.
   * Use only for initialisation or emergency resets.
   * Fires `onExit` / `onEnter` as normal.
   */
  forceState(newState: S): void {
    const prev = this._current;
    this.states[prev]?.onExit?.(newState);
    this._current = newState;
    this.states[newState]?.onEnter?.(prev);
  }
}
