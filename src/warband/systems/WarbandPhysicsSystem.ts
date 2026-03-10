// ---------------------------------------------------------------------------
// Warband mode – physics system
// Movement integration, gravity, collisions, arena boundaries
// ---------------------------------------------------------------------------

import {
  type WarbandState,
  FighterCombatState,
  vec3DistXZ,
} from "../state/WarbandState";
import { WB } from "../config/WarbandBalanceConfig";

export class WarbandPhysicsSystem {
  update(state: WarbandState): void {
    const dt = WB.SIM_TICK_MS / 1000;
    const halfW = WB.ARENA_WIDTH / 2 - 1;
    const halfD = WB.ARENA_DEPTH / 2 - 1;

    for (const fighter of state.fighters) {
      if (fighter.combatState === FighterCombatState.DEAD) continue;

      // Apply velocity
      fighter.position.x += fighter.velocity.x * dt;
      fighter.position.y += fighter.velocity.y * dt;
      fighter.position.z += fighter.velocity.z * dt;

      // Gravity
      if (!fighter.onGround) {
        fighter.velocity.y += WB.GRAVITY * dt;
      }

      // Ground collision (simple flat ground at y=0)
      if (fighter.position.y <= 0) {
        fighter.position.y = 0;
        fighter.velocity.y = 0;
        fighter.onGround = true;
      }

      // Arena boundaries
      fighter.position.x = Math.max(-halfW, Math.min(halfW, fighter.position.x));
      fighter.position.z = Math.max(-halfD, Math.min(halfD, fighter.position.z));

      // Fighter-fighter collision (push apart)
      for (const other of state.fighters) {
        if (other.id === fighter.id) continue;
        if (other.combatState === FighterCombatState.DEAD) continue;

        const dist = vec3DistXZ(fighter.position, other.position);
        const minDist = WB.FIGHTER_RADIUS * 2;

        if (dist < minDist && dist > 0.001) {
          const overlap = minDist - dist;
          const pushX =
            ((fighter.position.x - other.position.x) / dist) * overlap * 0.5;
          const pushZ =
            ((fighter.position.z - other.position.z) / dist) * overlap * 0.5;

          fighter.position.x += pushX;
          fighter.position.z += pushZ;
          other.position.x -= pushX;
          other.position.z -= pushZ;
        }
      }
    }

    // Pickup aging
    for (let i = state.pickups.length - 1; i >= 0; i--) {
      state.pickups[i].age++;
      // Remove old pickups after 60 seconds
      if (state.pickups[i].age > 60 * WB.TICKS_PER_SEC) {
        state.pickups.splice(i, 1);
      }
    }
  }
}
