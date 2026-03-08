// Phase FSM for the Colosseum mode — follows RPGStateMachine pattern
import { ColosseumPhase } from "@/types";
import { StateMachine } from "@sim/core/StateMachine";
import type { StateTransition } from "@sim/core/StateMachine";

// ---------------------------------------------------------------------------
// Transitions
// ---------------------------------------------------------------------------

const COLOSSEUM_TRANSITIONS: StateTransition<ColosseumPhase>[] = [
  // Main menu
  { from: ColosseumPhase.MAIN_MENU, to: ColosseumPhase.PARTY_SETUP },
  { from: ColosseumPhase.MAIN_MENU, to: ColosseumPhase.RANKINGS },
  // Party setup
  { from: ColosseumPhase.PARTY_SETUP, to: ColosseumPhase.TOURNAMENT_BRACKET },
  { from: ColosseumPhase.PARTY_SETUP, to: ColosseumPhase.MAIN_MENU },
  // Tournament bracket
  { from: ColosseumPhase.TOURNAMENT_BRACKET, to: ColosseumPhase.PRE_MATCH },
  { from: ColosseumPhase.TOURNAMENT_BRACKET, to: ColosseumPhase.TOURNAMENT_RESULTS },
  // Pre-match → battle/spectate
  { from: ColosseumPhase.PRE_MATCH, to: ColosseumPhase.BATTLE_TURN },
  { from: ColosseumPhase.PRE_MATCH, to: ColosseumPhase.BATTLE_AUTO },
  { from: ColosseumPhase.PRE_MATCH, to: ColosseumPhase.SPECTATE },
  { from: ColosseumPhase.PRE_MATCH, to: ColosseumPhase.TOURNAMENT_BRACKET },
  // Post-match
  { from: ColosseumPhase.BATTLE_TURN, to: ColosseumPhase.POST_MATCH },
  { from: ColosseumPhase.BATTLE_AUTO, to: ColosseumPhase.POST_MATCH },
  { from: ColosseumPhase.SPECTATE, to: ColosseumPhase.POST_MATCH },
  // After match
  { from: ColosseumPhase.POST_MATCH, to: ColosseumPhase.TOURNAMENT_BRACKET },
  { from: ColosseumPhase.POST_MATCH, to: ColosseumPhase.TOURNAMENT_RESULTS },
  // Tournament end
  { from: ColosseumPhase.TOURNAMENT_RESULTS, to: ColosseumPhase.MAIN_MENU },
  // Rankings
  { from: ColosseumPhase.RANKINGS, to: ColosseumPhase.MAIN_MENU },
  // Wildcard back to menu
  { from: "*", to: ColosseumPhase.MAIN_MENU },
];

// ---------------------------------------------------------------------------
// ColosseumStateMachine
// ---------------------------------------------------------------------------

export class ColosseumStateMachine {
  private fsm: StateMachine<ColosseumPhase>;
  private _previousPhase: ColosseumPhase = ColosseumPhase.MAIN_MENU;

  constructor(initialPhase: ColosseumPhase = ColosseumPhase.MAIN_MENU) {
    this.fsm = new StateMachine<ColosseumPhase>(initialPhase, COLOSSEUM_TRANSITIONS);
  }

  get currentPhase(): ColosseumPhase {
    return this.fsm.currentState;
  }

  get previousPhase(): ColosseumPhase {
    return this._previousPhase;
  }

  transition(to: ColosseumPhase): boolean {
    if (!this.fsm.canTransition(to)) return false;
    this._previousPhase = this.fsm.currentState;
    return this.fsm.setState(to);
  }
}
