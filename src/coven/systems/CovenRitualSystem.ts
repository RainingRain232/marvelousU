// ---------------------------------------------------------------------------
// Coven mode — Grand Ritual system
// ---------------------------------------------------------------------------

import { hexKey } from "@world/hex/HexCoord";
import type { CovenState } from "../state/CovenState";
import { CovenPhase, addCovenLog } from "../state/CovenState";
import { CovenConfig } from "../config/CovenConfig";

type RitualCallback = (success: boolean, message: string) => void;
let _ritualCallback: RitualCallback | null = null;

export class CovenRitualSystem {
  static setRitualCallback(cb: RitualCallback | null): void { _ritualCallback = cb; }

  static canPerformRitual(state: CovenState): boolean {
    if (state.ritualComponents.length < CovenConfig.RITUAL_COMPONENTS_NEEDED) return false;
    // Must be on a ley line hex
    const hex = state.hexes.get(hexKey(state.playerPosition.q, state.playerPosition.r));
    return hex?.terrain === "ley_line";
  }

  static getProgress(state: CovenState): { found: number; needed: number; components: string[] } {
    return {
      found: state.ritualComponents.length,
      needed: CovenConfig.RITUAL_COMPONENTS_NEEDED,
      components: state.ritualComponents.map((c) => c.replace(/_/g, " ")),
    };
  }

  static performRitual(state: CovenState): boolean {
    if (!this.canPerformRitual(state)) {
      if (state.ritualComponents.length < CovenConfig.RITUAL_COMPONENTS_NEEDED) {
        addCovenLog(state, `Not enough ritual components. (${state.ritualComponents.length}/${CovenConfig.RITUAL_COMPONENTS_NEEDED})`, 0xff8844);
        _ritualCallback?.(false, "Need more components.");
      } else {
        addCovenLog(state, "You must stand on a ley line to perform the ritual.", 0xff8844);
        _ritualCallback?.(false, "Must be on a ley line.");
      }
      return false;
    }

    // Perform the ritual — costs all mana
    state.mana = 0;
    state.ritualComplete = true;
    state.victory = true;
    state.phase = CovenPhase.VICTORY;

    addCovenLog(state, "The Grand Ritual is complete. The gate to the Otherworld opens. You step through.", 0xffd700);
    _ritualCallback?.(true, "The Otherworld awaits.");
    return true;
  }

  static cleanup(): void { _ritualCallback = null; }
}
