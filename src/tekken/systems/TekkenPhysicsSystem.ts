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
      // Use per-move launchGravity if set on the juggle state, otherwise fall back to global gravity
      const baseGravity = fighter.juggle.currentLaunchGravity > 0 ? fighter.juggle.currentLaunchGravity : TB.GRAVITY;
      const gravity = baseGravity * fighter.juggle.gravityScale;
      fighter.juggle.velocity.y -= gravity;
      fighter.position.y += fighter.juggle.velocity.y;
      fighter.position.x += fighter.juggle.velocity.x;

      // Air friction
      fighter.juggle.velocity.x *= 0.98;

      // Wall collision during juggle - triggers wall splat
      if (Math.abs(fighter.position.x) >= TB.STAGE_HALF_WIDTH - 0.1 && !fighter.juggle.isWallSplatted) {
        const speed = Math.abs(fighter.juggle.velocity.x);
        if (speed > 0.005) {
          // Wall splat! Opponent hit the wall while airborne with momentum
          fighter.juggle.isWallSplatted = true;
          fighter.juggle.wallSplatFrames = TB.WALL_SPLAT_DURATION;
          fighter.juggle.wallSplatActive = true;
          fighter.juggle.wallSplatTimer = TB.WALL_SPLAT_DURATION;
          fighter.juggle.velocity.x = 0;
          fighter.juggle.velocity.y = Math.max(fighter.juggle.velocity.y, 0.02); // slight upward to keep airborne
          fighter.state = TekkenFighterState.WALL_SPLAT;
          fighter.stateTimer = 0;
          state.cameraState.shakeIntensity = TB.CAMERA_SHAKE_HEAVY;
        }
      }

      // Ground collision
      if (fighter.position.y <= TB.FLOOR_Y) {
        fighter.position.y = TB.FLOOR_Y;
        fighter.juggle.isAirborne = false;
        fighter.juggle.velocity = { x: 0, y: 0, z: 0 };
        fighter.grounded = true;
        fighter.juggle.isWallSplatted = false;
        fighter.juggle.wallSplatFrames = 0;

        if (fighter.state === TekkenFighterState.JUGGLE || fighter.state === TekkenFighterState.WALL_SPLAT) {
          fighter.state = TekkenFighterState.KNOCKDOWN;
          fighter.stateTimer = 0;
        }
      }
    }

    // Wall splat timer (applies to both airborne and grounded wall splats)
    if (fighter.juggle.wallSplatActive) {
      fighter.juggle.wallSplatTimer--;
      fighter.velocity.x = 0;
      if (fighter.juggle.wallSplatTimer <= 0) {
        fighter.juggle.wallSplatActive = false;
      }
    }

    // Wall splat frames countdown (for wall-specific followups window)
    if (fighter.juggle.isWallSplatted && fighter.juggle.wallSplatFrames > 0) {
      fighter.juggle.wallSplatFrames--;
      if (fighter.juggle.wallSplatFrames <= 0) {
        fighter.juggle.isWallSplatted = false;
        // If still in wall splat state, transition to juggle/knockdown
        if (fighter.state === TekkenFighterState.WALL_SPLAT) {
          if (fighter.juggle.isAirborne) {
            fighter.state = TekkenFighterState.JUGGLE;
          } else {
            fighter.state = TekkenFighterState.KNOCKDOWN;
            fighter.stateTimer = 0;
          }
        }
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
