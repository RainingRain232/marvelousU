import { TekkenFighterState } from "../../types";
import type { TekkenState } from "../state/TekkenState";
import { TB } from "../config/TekkenBalanceConfig";

export class TekkenComboSystem {
  update(state: TekkenState): void {
    for (const fighter of state.fighters) {
      // Reset combo when fighter returns to neutral
      if (fighter.comboCount > 0 && (
        fighter.state === TekkenFighterState.IDLE ||
        fighter.state === TekkenFighterState.WALK_FORWARD ||
        fighter.state === TekkenFighterState.WALK_BACK
      )) {
        // Wait a few frames before resetting (combo drop threshold)
        fighter.stateTimer++;
        if (fighter.stateTimer > TB.COMBO_DROP_THRESHOLD) {
          fighter.comboCount = 0;
          fighter.comboDamage = 0;
          fighter.comboDamageScaling = 1;
        }
      }

      // Cap juggle hits
      if (fighter.juggle.hitCount >= TB.MAX_JUGGLE_HITS) {
        fighter.juggle.gravityScale = 5; // extreme gravity to end juggle
      }
    }
  }
}
