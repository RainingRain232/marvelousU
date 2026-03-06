// Top-level phase manager for RPG mode
import { RPGPhase } from "@/types";
import { StateMachine } from "@sim/core/StateMachine";
import type { StateTransition } from "@sim/core/StateMachine";
import { EventBus } from "@sim/core/EventBus";

// ---------------------------------------------------------------------------
// Transitions
// ---------------------------------------------------------------------------

const RPG_TRANSITIONS: StateTransition<RPGPhase>[] = [
  // Main menu transitions
  { from: RPGPhase.MAIN_MENU, to: RPGPhase.OVERWORLD },
  { from: RPGPhase.MAIN_MENU, to: RPGPhase.OPTIONS },
  // Options returns
  { from: RPGPhase.OPTIONS, to: RPGPhase.MAIN_MENU },
  { from: RPGPhase.OPTIONS, to: RPGPhase.OVERWORLD },
  // Overworld transitions
  { from: RPGPhase.OVERWORLD, to: RPGPhase.DUNGEON },
  { from: RPGPhase.OVERWORLD, to: RPGPhase.BATTLE_TURN },
  { from: RPGPhase.OVERWORLD, to: RPGPhase.BATTLE_AUTO },
  { from: RPGPhase.OVERWORLD, to: RPGPhase.TOWN_MENU },
  { from: RPGPhase.OVERWORLD, to: RPGPhase.MAIN_MENU },
  // Dungeon transitions
  { from: RPGPhase.DUNGEON, to: RPGPhase.BATTLE_TURN },
  { from: RPGPhase.DUNGEON, to: RPGPhase.BATTLE_AUTO },
  { from: RPGPhase.DUNGEON, to: RPGPhase.OVERWORLD },
  // Battle returns
  { from: RPGPhase.BATTLE_TURN, to: RPGPhase.OVERWORLD },
  { from: RPGPhase.BATTLE_TURN, to: RPGPhase.DUNGEON },
  { from: RPGPhase.BATTLE_AUTO, to: RPGPhase.OVERWORLD },
  { from: RPGPhase.BATTLE_AUTO, to: RPGPhase.DUNGEON },
  // Town returns
  { from: RPGPhase.TOWN_MENU, to: RPGPhase.OVERWORLD },
  // Game over from any
  { from: "*", to: RPGPhase.GAME_OVER },
  // Game over to main menu
  { from: RPGPhase.GAME_OVER, to: RPGPhase.MAIN_MENU },
];

// ---------------------------------------------------------------------------
// RPGStateMachine
// ---------------------------------------------------------------------------

export class RPGStateMachine {
  private fsm: StateMachine<RPGPhase>;
  private _previousPhase: RPGPhase = RPGPhase.OVERWORLD;

  constructor(initialPhase: RPGPhase = RPGPhase.MAIN_MENU) {
    this.fsm = new StateMachine<RPGPhase>(initialPhase, RPG_TRANSITIONS);
  }

  get currentPhase(): RPGPhase {
    return this.fsm.currentState;
  }

  get previousPhase(): RPGPhase {
    return this._previousPhase;
  }

  transition(to: RPGPhase): boolean {
    if (!this.fsm.canTransition(to)) return false;
    this._previousPhase = this.fsm.currentState;
    const ok = this.fsm.setState(to);
    if (ok) {
      EventBus.emit("rpgPhaseChanged", {
        phase: to,
        previousPhase: this._previousPhase,
      });
    }
    return ok;
  }

  /** Return to the phase we came from (used after battle/town). */
  returnToPrevious(): boolean {
    return this.transition(this._previousPhase);
  }
}
