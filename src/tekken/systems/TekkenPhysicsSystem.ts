import { TekkenFighterState } from "../../types";
import type { TekkenFighter, TekkenState } from "../state/TekkenState";
import { TB } from "../config/TekkenBalanceConfig";

export class TekkenPhysicsSystem {
  update(fighter: TekkenFighter, state: TekkenState): void {
    // Apply velocity
    fighter.position.x += fighter.velocity.x;
    fighter.position.y += fighter.velocity.y;
    fighter.position.z += fighter.velocity.z;

    // Friction (ground)
    if (fighter.grounded) {
      fighter.velocity.x *= 0.85;
      if (Math.abs(fighter.velocity.x) < 0.001) fighter.velocity.x = 0;
    }

    // Gravity for airborne fighters
    if (fighter.juggle.isAirborne) {
      const gravity = TB.GRAVITY * fighter.juggle.gravityScale;
      fighter.juggle.velocity.y -= gravity;
      fighter.position.y += fighter.juggle.velocity.y;
      fighter.position.x += fighter.juggle.velocity.x;

      // Air friction
      fighter.juggle.velocity.x *= 0.98;

      // Ground collision
      if (fighter.position.y <= TB.FLOOR_Y) {
        fighter.position.y = TB.FLOOR_Y;
        fighter.juggle.isAirborne = false;
        fighter.juggle.velocity = { x: 0, y: 0, z: 0 };
        fighter.grounded = true;

        if (fighter.state === TekkenFighterState.JUGGLE) {
          fighter.state = TekkenFighterState.KNOCKDOWN;
          fighter.stateTimer = 0;
        }
      }
    }

    // Wall splat timer
    if (fighter.juggle.wallSplatActive) {
      fighter.juggle.wallSplatTimer--;
      fighter.velocity.x = 0;
      if (fighter.juggle.wallSplatTimer <= 0) {
        fighter.juggle.wallSplatActive = false;
      }
    }

    // Stage boundaries (walls)
    if (fighter.position.x > TB.STAGE_HALF_WIDTH) {
      fighter.position.x = TB.STAGE_HALF_WIDTH;
      fighter.velocity.x = 0;
      if (fighter.juggle.isAirborne) {
        fighter.juggle.velocity.x = -Math.abs(fighter.juggle.velocity.x) * 0.3;
      }
    }
    if (fighter.position.x < -TB.STAGE_HALF_WIDTH) {
      fighter.position.x = -TB.STAGE_HALF_WIDTH;
      fighter.velocity.x = 0;
      if (fighter.juggle.isAirborne) {
        fighter.juggle.velocity.x = Math.abs(fighter.juggle.velocity.x) * 0.3;
      }
    }

    // Update wall distance
    fighter.wallDistance = TB.STAGE_HALF_WIDTH - Math.abs(fighter.position.x);

    // Prevent fighters from overlapping (push apart)
    const other = state.fighters[0] === fighter ? state.fighters[1] : state.fighters[0];
    const dx = fighter.position.x - other.position.x;
    const minDist = 0.4;
    if (Math.abs(dx) < minDist) {
      const push = (minDist - Math.abs(dx)) / 2;
      const sign = dx >= 0 ? 1 : -1;
      fighter.position.x += push * sign;
      other.position.x -= push * sign;
    }

    // Z-axis boundaries
    fighter.position.z = Math.max(-TB.STAGE_HALF_DEPTH, Math.min(TB.STAGE_HALF_DEPTH, fighter.position.z));

    // Ensure grounded when on floor and not juggled
    if (fighter.position.y <= TB.FLOOR_Y && !fighter.juggle.isAirborne) {
      fighter.position.y = TB.FLOOR_Y;
      fighter.grounded = true;
    }
  }
}
