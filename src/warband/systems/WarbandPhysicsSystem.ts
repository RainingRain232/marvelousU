// ---------------------------------------------------------------------------
// Warband mode – physics system
// Movement integration, gravity, collisions, arena boundaries
// ---------------------------------------------------------------------------

import {
  type WarbandState,
  BattleType,
  FighterCombatState,
  vec3DistXZ,
} from "../state/WarbandState";
import { WB, SIEGE_WALLS, type SiegeWallRect } from "../config/WarbandBalanceConfig";
import { getTerrainHeight } from "../view/WarbandSceneManager";

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

      // Ground collision (terrain-following)
      const groundY = getTerrainHeight(fighter.position.x, fighter.position.z);

      // If fighter is above ground and not moving downward, clear onGround so gravity kicks in
      if (fighter.onGround && fighter.position.y > groundY + 0.05) {
        fighter.onGround = false;
      }

      // Gravity
      if (!fighter.onGround) {
        fighter.velocity.y += WB.GRAVITY * dt;
      }

      // Snap to ground when at or below terrain height
      if (fighter.position.y <= groundY) {
        fighter.position.y = groundY;
        fighter.velocity.y = 0;
        fighter.onGround = true;
      }

      // Arena boundaries
      fighter.position.x = Math.max(-halfW, Math.min(halfW, fighter.position.x));
      fighter.position.z = Math.max(-halfD, Math.min(halfD, fighter.position.z));

      // Siege wall collision
      if (state.battleType === BattleType.SIEGE) {
        const r = fighter.creatureRadius;
        for (const wall of SIEGE_WALLS) {
          this._pushOutOfWall(fighter.position, r, wall);
        }
      }

      // Fighter-fighter collision (push apart)
      for (const other of state.fighters) {
        if (other.id === fighter.id) continue;
        if (other.combatState === FighterCombatState.DEAD) continue;

        const dist = vec3DistXZ(fighter.position, other.position);
        const minDist = fighter.creatureRadius + other.creatureRadius + 0.3; // extra gap to prevent weapon clipping

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

    // Sync horse positions with mounted riders
    for (const horse of state.horses) {
      if (!horse.alive) continue;
      if (horse.riderId) {
        const rider = state.fighters.find(f => f.id === horse.riderId);
        if (rider && rider.combatState !== FighterCombatState.DEAD) {
          horse.position.x = rider.position.x;
          horse.position.y = rider.position.y;
          horse.position.z = rider.position.z;
          horse.rotation = rider.rotation;
        } else {
          // Rider is dead — dismount
          horse.riderId = null;
          if (rider) {
            rider.mountId = null;
            rider.isMounted = false;
          }
        }
      } else {
        // Riderless horse: apply arena bounds + terrain
        const groundY = getTerrainHeight(horse.position.x, horse.position.z);
        horse.position.y = groundY;
        horse.position.x = Math.max(-halfW, Math.min(halfW, horse.position.x));
        horse.position.z = Math.max(-halfD, Math.min(halfD, horse.position.z));
      }

      // Siege wall collision for horses
      if (state.battleType === BattleType.SIEGE) {
        const r = WB.HORSE_RADIUS;
        for (const wall of SIEGE_WALLS) {
          this._pushOutOfWall(horse.position, r, wall);
        }
      }
    }

    // Mounted fighters have larger collision radius
    for (const fighter of state.fighters) {
      if (fighter.combatState === FighterCombatState.DEAD) continue;
      if (!fighter.isMounted) continue;

      for (const other of state.fighters) {
        if (other.id === fighter.id) continue;
        if (other.combatState === FighterCombatState.DEAD) continue;
        if (other.team === fighter.team && other.isMounted) continue; // don't push ally horses

        const dist = vec3DistXZ(fighter.position, other.position);
        const minDist = WB.HORSE_RADIUS + WB.FIGHTER_RADIUS;

        if (dist < minDist && dist > 0.001) {
          const overlap = minDist - dist;
          const pushX = ((fighter.position.x - other.position.x) / dist) * overlap * 0.5;
          const pushZ = ((fighter.position.z - other.position.z) / dist) * overlap * 0.5;
          // Mounted fighter pushes harder
          other.position.x -= pushX * 1.5;
          other.position.z -= pushZ * 1.5;
          fighter.position.x += pushX * 0.5;
          fighter.position.z += pushZ * 0.5;
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

  /** Push a position out of a wall AABB (resolve smallest overlap axis) */
  private _pushOutOfWall(
    pos: { x: number; z: number },
    radius: number,
    wall: SiegeWallRect,
  ): void {
    // Expand wall by radius for circle-vs-AABB
    const minX = wall.minX - radius;
    const maxX = wall.maxX + radius;
    const minZ = wall.minZ - radius;
    const maxZ = wall.maxZ + radius;

    if (pos.x <= minX || pos.x >= maxX || pos.z <= minZ || pos.z >= maxZ) return;

    // Inside — push out along shortest overlap axis
    const dLeft = pos.x - minX;
    const dRight = maxX - pos.x;
    const dFront = pos.z - minZ;
    const dBack = maxZ - pos.z;
    const minOverlap = Math.min(dLeft, dRight, dFront, dBack);

    if (minOverlap === dLeft) pos.x = minX;
    else if (minOverlap === dRight) pos.x = maxX;
    else if (minOverlap === dFront) pos.z = minZ;
    else pos.z = maxZ;
  }
}
