// ---------------------------------------------------------------------------
// Duel mode – state machine
// ---------------------------------------------------------------------------

import {
  StateMachine,
  type StateTransition,
} from "../sim/core/StateMachine";
import { DuelPhase } from "../types";

const DUEL_TRANSITIONS: StateTransition<DuelPhase>[] = [
  { from: DuelPhase.CHAR_SELECT, to: DuelPhase.ARENA_SELECT },
  { from: DuelPhase.ARENA_SELECT, to: DuelPhase.CHAR_SELECT },
  { from: DuelPhase.ARENA_SELECT, to: DuelPhase.INTRO },
  { from: DuelPhase.INTRO, to: DuelPhase.FIGHTING },
  { from: DuelPhase.FIGHTING, to: DuelPhase.ROUND_END },
  { from: DuelPhase.ROUND_END, to: DuelPhase.FIGHTING },
  { from: DuelPhase.ROUND_END, to: DuelPhase.MATCH_END },
  { from: DuelPhase.MATCH_END, to: DuelPhase.CHAR_SELECT },
  { from: "*", to: DuelPhase.CHAR_SELECT },
];

export class DuelStateMachine {
  private fsm: StateMachine<DuelPhase>;

  constructor(initial: DuelPhase = DuelPhase.CHAR_SELECT) {
    this.fsm = new StateMachine<DuelPhase>(initial, DUEL_TRANSITIONS);
  }

  get currentPhase(): DuelPhase {
    return this.fsm.currentState;
  }

  transition(to: DuelPhase): boolean {
    return this.fsm.setState(to);
  }

  canTransition(to: DuelPhase): boolean {
    return this.fsm.canTransition(to);
  }
}
