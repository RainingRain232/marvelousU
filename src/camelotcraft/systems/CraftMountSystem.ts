// ---------------------------------------------------------------------------
// Camelot Craft – Horse riding / mount system
// ---------------------------------------------------------------------------

import type { CraftState, MobInstance } from "../state/CraftState";
import { addMessage } from "../state/CraftState";
import { MobType, MOB_DEFS } from "../config/CraftMobDefs";
import { CB } from "../config/CraftBalance";

const MOUNT_RANGE = 3.0;
const DISMOUNT_KEY_CD = 0.5;

export interface MountState {
  mounted: boolean;
  mountId: number | null;
  dismountCd: number;
}

export function createMountState(): MountState {
  return { mounted: false, mountId: null, dismountCd: 0 };
}

/** Try to mount the nearest horse. Returns true if mounted. */
export function tryMount(state: CraftState, mount: MountState): boolean {
  if (mount.mounted) return false;

  const pPos = state.player.position;
  let closest: MobInstance | null = null;
  let closestDist = MOUNT_RANGE;

  for (const mob of state.mobs) {
    if (mob.type !== MobType.HORSE) continue;
    const d = pPos.distanceTo(mob.position);
    if (d < closestDist) {
      closestDist = d;
      closest = mob;
    }
  }

  if (!closest) return false;

  mount.mounted = true;
  mount.mountId = closest.id;
  mount.dismountCd = DISMOUNT_KEY_CD;
  addMessage(state, "Mounted horse! Press F to dismount.", 0x795548);
  return true;
}

/** Dismount the current mount. */
export function dismount(state: CraftState, mount: MountState): void {
  if (!mount.mounted) return;
  mount.mounted = false;
  mount.mountId = null;
  mount.dismountCd = DISMOUNT_KEY_CD;
  addMessage(state, "Dismounted.", 0x795548);
}

/** Update mount physics. Call each frame when mounted. */
export function updateMount(
  state: CraftState, mount: MountState, dt: number,
  keys: Record<string, boolean>,
): void {
  if (!mount.mounted || mount.mountId === null) return;

  mount.dismountCd = Math.max(0, mount.dismountCd - dt);

  // Find the horse mob
  const horse = state.mobs.find((m) => m.id === mount.mountId);
  if (!horse) {
    // Horse died or despawned
    dismount(state, mount);
    return;
  }

  const horseDef = MOB_DEFS[MobType.HORSE];
  const p = state.player;
  const speed = horseDef.speed * 1.2; // slightly faster when ridden

  // Movement based on player yaw
  const sinY = Math.sin(p.yaw);
  const cosY = Math.cos(p.yaw);
  let mx = 0, mz = 0;

  if (keys["KeyW"]) { mx -= sinY; mz -= cosY; }
  if (keys["KeyS"]) { mx += sinY; mz += cosY; }
  if (keys["KeyA"]) { mx -= cosY; mz += sinY; }
  if (keys["KeyD"]) { mx += cosY; mz -= sinY; }

  const mag = Math.sqrt(mx * mx + mz * mz);
  if (mag > 0) { mx /= mag; mz /= mag; }

  // Move horse
  horse.position.x += mx * speed * dt;
  horse.position.z += mz * speed * dt;
  horse.yaw = p.yaw;

  // Snap player to horse position (ride on top)
  p.position.x = horse.position.x;
  p.position.y = horse.position.y + horseDef.bodyHeight + 0.3;
  p.position.z = horse.position.z;
  p.velocity.set(mx * speed, 0, mz * speed);
  p.onGround = true;

  // Horse jump
  if (keys["Space"] && p.onGround) {
    horse.position.y += 0.5;
    horse.velocity.y = CB.PLAYER_JUMP_VELOCITY * 0.8;
  }

  // Apply gravity to horse
  horse.velocity.y += CB.PLAYER_GRAVITY * dt;
  horse.position.y += horse.velocity.y * dt;
  if (horse.position.y < 0) {
    horse.position.y = 0;
    horse.velocity.y = 0;
  }
}
