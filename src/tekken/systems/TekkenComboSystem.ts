import { TekkenFighterState } from "../../types";
import type { TekkenState, TekkenFighter, TekkenMoveDef } from "../state/TekkenState";
import { TB } from "../config/TekkenBalanceConfig";
import { TEKKEN_CHARACTERS } from "../config/TekkenCharacterDefs";

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

  /**
   * Validate that a combo route can actually connect given current positioning.
   * Checks that each successive move in the combo can reach the opponent
   * based on the move's hitbox range and advance distance vs current distance.
   * Returns the index at which the combo would drop, or -1 if fully valid.
   */
  validateComboRoute(
    attacker: TekkenFighter,
    defender: TekkenFighter,
    comboRoute: string[],
  ): number {
    const charDef = TEKKEN_CHARACTERS.find(c => c.id === attacker.characterId);
    if (!charDef) return 0;

    // Simulate positioning through the combo
    let simulatedAttackerX = attacker.position.x;
    let simulatedDefenderX = defender.position.x;
    let simulatedDefenderY = defender.position.y;
    let simulatedDefenderAirborne = defender.juggle.isAirborne;

    for (let i = 0; i < comboRoute.length; i++) {
      const moveId = comboRoute[i];
      const moveDef = this._findMoveDef(charDef.id, moveId);
      if (!moveDef) {
        return i; // Move not found, combo drops
      }

      // Calculate distance between fighters
      const dist = Math.abs(simulatedAttackerX - simulatedDefenderX);

      // Effective range = hitbox width + advance distance + tolerance
      const effectiveRange = moveDef.hitbox.w + moveDef.advanceDistance + 0.3;

      // If the opponent is out of range, the combo drops here
      if (dist > effectiveRange) {
        return i;
      }

      // If the defender has landed (not airborne) and the move isn't a launcher,
      // the juggle combo drops
      if (i > 0 && !simulatedDefenderAirborne && !moveDef.isLauncher) {
        return i;
      }

      // Simulate position changes from this move
      const dir = simulatedAttackerX < simulatedDefenderX ? 1 : -1;
      simulatedAttackerX += moveDef.advanceDistance * dir;
      simulatedDefenderX += moveDef.knockback * 0.3 * dir;

      // Simulate gravity effect on airborne defender
      if (simulatedDefenderAirborne) {
        simulatedDefenderY -= TB.GRAVITY * 3; // rough estimate per move duration
        if (simulatedDefenderY <= TB.FLOOR_Y) {
          simulatedDefenderY = TB.FLOOR_Y;
          // If the move is a bound or screw, keep airborne
          if (moveDef.isBound || moveDef.isScrew) {
            simulatedDefenderY = 0.05;
          } else {
            simulatedDefenderAirborne = false;
          }
        }
      }

      // Clamp to stage boundaries
      simulatedAttackerX = Math.max(-TB.STAGE_HALF_WIDTH, Math.min(TB.STAGE_HALF_WIDTH, simulatedAttackerX));
      simulatedDefenderX = Math.max(-TB.STAGE_HALF_WIDTH, Math.min(TB.STAGE_HALF_WIDTH, simulatedDefenderX));
    }

    return -1; // Fully valid
  }

  /**
   * Check if the next move in a combo can reach the opponent from current positions.
   * Used in real-time to detect if a combo should drop.
   */
  canNextMoveConnect(
    attacker: TekkenFighter,
    defender: TekkenFighter,
    moveId: string,
  ): boolean {
    const moveDef = this._findMoveDef(attacker.characterId, moveId);
    if (!moveDef) return false;

    const dist = Math.abs(attacker.position.x - defender.position.x);
    const effectiveRange = moveDef.hitbox.w + moveDef.advanceDistance + 0.3;

    return dist <= effectiveRange;
  }

  private _findMoveDef(characterId: string, moveId: string): TekkenMoveDef | null {
    const charDef = TEKKEN_CHARACTERS.find(c => c.id === characterId);
    if (!charDef) return null;

    // Check rage art
    if (moveId === charDef.rageArt.id) return charDef.rageArt;

    // Search move list
    for (const entry of charDef.moveList) {
      if (entry.move.id === moveId) return entry.move;
    }

    // Try parsing as a direction+button combo (e.g. "d/f+1")
    // These refer to universal/shared moves that are in the move list by input
    const numToBtn: Record<string, string> = { "1": "lp", "2": "rp", "3": "lk", "4": "rk" };
    const isDirectionCombo = /^(n|f|b|d|u|d\/f|d\/b|u\/f|u\/b)\+[1-4]/.test(moveId);
    const isBareNum = /^[1-4]$/.test(moveId);

    if (isDirectionCombo) {
      const parts = moveId.split("+");
      const dir = parts[0];
      const btns = parts.slice(1).map(n => numToBtn[n] || n);
      for (const entry of charDef.moveList) {
        if (entry.input.length !== 1) continue;
        const cmd = entry.input[0];
        if (cmd.direction === dir &&
            cmd.buttons.length === btns.length &&
            cmd.buttons.every(b => btns.includes(b))) {
          return entry.move;
        }
      }
    } else if (isBareNum) {
      const btn = numToBtn[moveId];
      for (const entry of charDef.moveList) {
        if (entry.input.length !== 1) continue;
        const cmd = entry.input[0];
        if (cmd.direction === "n" && cmd.buttons.length === 1 && cmd.buttons[0] === btn) {
          return entry.move;
        }
      }
    }

    return null;
  }
}
