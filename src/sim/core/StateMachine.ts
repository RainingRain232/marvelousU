// Generic FSM used by units (IDLE, MOVE, ATTACK, CAST, DIE)
export type Transition<S extends string> = {
  from: S | S[];
  to:   S;
};

export class StateMachine<S extends string> {
  private current: S;
  private transitions: Transition<S>[];

  constructor(initial: S, transitions: Transition<S>[]) {
    this.current     = initial;
    this.transitions = transitions;
  }

  getState(): S {
    return this.current;
  }

  canTransition(to: S): boolean {
    return this.transitions.some(t => {
      const froms = Array.isArray(t.from) ? t.from : [t.from];
      return froms.includes(this.current) && t.to === to;
    });
  }

  transition(to: S): boolean {
    if (!this.canTransition(to)) return false;
    this.current = to;
    return true;
  }
}
