// ---------------------------------------------------------------------------
// Camelot Craft – Mob spawning, AI, damage, and spatial queries
// ---------------------------------------------------------------------------

import * as THREE from "three";
import { MobType, MOB_DEFS, type MobDef } from "../config/CraftMobDefs";
import type { CraftState, MobInstance } from "../state/CraftState";
import { addMessage, isWorldSolid } from "../state/CraftState";
import { CB } from "../config/CraftBalance";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dist2D(a: THREE.Vector3, b: THREE.Vector3): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function isNight(t: number): boolean {
  return t > 0.75 || t < 0.25;
}

function randomPointAround(center: THREE.Vector3, minR: number, maxR: number): THREE.Vector3 {
  const angle = Math.random() * Math.PI * 2;
  const r = rand(minR, maxR);
  return new THREE.Vector3(center.x + Math.cos(angle) * r, center.y, center.z + Math.sin(angle) * r);
}

// ---------------------------------------------------------------------------
// Spawning
// ---------------------------------------------------------------------------

let _spawnAccum = 0;

export function spawnMobs(state: CraftState, dt: number): void {
  _spawnAccum += dt;
  if (_spawnAccum < 2) return;
  _spawnAccum -= 2;

  if (state.mobs.length >= CB.MOB_MAX_COUNT) return;

  const night = isNight(state.timeOfDay);

  // Build weighted candidate list
  const candidates: { type: MobType; def: MobDef; weight: number }[] = [];
  let totalWeight = 0;

  for (const [type, def] of Object.entries(MOB_DEFS) as [MobType, MobDef][]) {
    if (def.spawnWeight <= 0) continue;
    if (def.nightOnly && !night) continue;
    candidates.push({ type, def, weight: def.spawnWeight });
    totalWeight += def.spawnWeight;
  }

  if (totalWeight === 0) return;

  let roll = Math.random() * totalWeight;
  let chosen = candidates[0];
  for (const c of candidates) {
    roll -= c.weight;
    if (roll <= 0) { chosen = c; break; }
  }

  const spawnPos = randomPointAround(state.player.position, CB.MOB_SPAWN_RADIUS_MIN, CB.MOB_SPAWN_RADIUS_MAX);
  spawnPos.y = state.player.position.y;

  const mob: MobInstance = {
    id: state.nextMobId++,
    type: chosen.type,
    position: spawnPos,
    velocity: new THREE.Vector3(),
    hp: chosen.def.hp,
    maxHp: chosen.def.hp,
    yaw: Math.random() * Math.PI * 2,
    target: null,
    attackTimer: 0,
    hurtTimer: 0,
    despawnTimer: 0,
    aiState: "idle",
    aiTimer: rand(1, 3),
  };

  state.mobs.push(mob);
}

// ---------------------------------------------------------------------------
// AI update
// ---------------------------------------------------------------------------

export function updateMobs(state: CraftState, dt: number): void {
  const playerPos = state.player.position;

  for (let i = state.mobs.length - 1; i >= 0; i--) {
    const mob = state.mobs[i];
    const def = MOB_DEFS[mob.type];
    if (!def) { state.mobs.splice(i, 1); continue; }

    const distToPlayer = dist2D(mob.position, playerPos);
    const isHostile = def.behavior === "hostile";

    // Despawn
    if (distToPlayer > CB.MOB_DESPAWN_RADIUS) {
      state.mobs.splice(i, 1);
      continue;
    }

    // Timers
    mob.attackTimer = Math.max(0, mob.attackTimer - dt);
    mob.hurtTimer = Math.max(0, mob.hurtTimer - dt);
    mob.aiTimer -= dt;

    switch (mob.aiState) {
      case "idle":
        if (isHostile && distToPlayer <= def.detectionRange) {
          mob.aiState = "chase";
          break;
        }
        if (mob.aiTimer <= 0) {
          mob.aiState = "wander";
          mob.target = randomPointAround(mob.position, 2, 6);
          mob.aiTimer = rand(2, 5);
        }
        break;

      case "wander":
        if (isHostile && distToPlayer <= def.detectionRange) {
          mob.aiState = "chase";
          break;
        }
        if (mob.target) {
          moveToward(mob, mob.target, def.speed * dt, state);
          if (dist2D(mob.position, mob.target) < 0.5) {
            mob.aiState = "idle";
            mob.aiTimer = rand(1, 4);
            mob.target = null;
          }
        }
        if (mob.aiTimer <= 0) {
          mob.aiState = "idle";
          mob.aiTimer = rand(1, 3);
        }
        break;

      case "chase":
        if (distToPlayer > def.detectionRange * 1.5) {
          mob.aiState = "idle";
          mob.aiTimer = rand(1, 3);
          break;
        }
        moveToward(mob, playerPos, def.speed * dt, state);
        if (distToPlayer <= def.attackRange) {
          mob.aiState = "attack";
        }
        break;

      case "attack":
        if (distToPlayer > def.attackRange * 1.2) {
          mob.aiState = "chase";
          break;
        }
        if (mob.attackTimer <= 0 && def.damage > 0) {
          if (state.player.invulnTimer <= 0) {
            let dmg = def.damage;
            // Shield blocking reduces damage by 60%
            if (state.player.blocking) {
              dmg = Math.ceil(dmg * 0.4);
              addMessage(state, `Blocked! ${def.name} deals ${dmg} damage.`, 0x90CAF9);
            } else {
              addMessage(state, `${def.name} strikes you for ${dmg} damage!`, 0xFF4444);
            }
            // Armor reduces damage + degrades
            const armorSlots = state.player.inventory.armor;
            let armorDef = 0;
            const armorPieces = [armorSlots.helmet, armorSlots.chestplate, armorSlots.leggings, armorSlots.boots] as const;
            const armorKeys = ["helmet", "chestplate", "leggings", "boots"] as const;
            const armorValues = [1, 3, 2, 1];
            for (let ai = 0; ai < 4; ai++) {
              const piece = armorPieces[ai];
              if (piece) {
                armorDef += armorValues[ai];
                // Degrade armor durability
                if (piece.durability !== undefined) {
                  piece.durability--;
                  if (piece.durability <= 0) {
                    armorSlots[armorKeys[ai]] = null;
                    addMessage(state, `Your ${piece.displayName} broke!`, 0xFF6600);
                  }
                }
              }
            }
            dmg = Math.max(1, dmg - Math.floor(armorDef * 0.4));

            state.player.hp = Math.max(0, state.player.hp - dmg);
            state.player.invulnTimer = CB.INVULNERABILITY_TIME;
          }
          mob.attackTimer = def.attackCooldown;
        }
        break;

      case "flee": {
        const away = new THREE.Vector3().subVectors(mob.position, playerPos).normalize();
        const fleeTgt = mob.position.clone().addScaledVector(away, 8);
        moveToward(mob, fleeTgt, def.speed * 1.3 * dt, state);
        if (mob.aiTimer <= 0 || distToPlayer > def.detectionRange) {
          mob.aiState = "idle";
          mob.aiTimer = rand(2, 5);
        }
        break;
      }
    }

    // Apply velocity drag
    mob.position.add(mob.velocity.clone().multiplyScalar(dt));
    mob.velocity.multiplyScalar(0.9);
  }
}

function moveToward(mob: MobInstance, target: THREE.Vector3, step: number, state?: CraftState): void {
  const dir = new THREE.Vector3().subVectors(target, mob.position).setY(0);
  if (dir.length() < 0.01) return;
  dir.normalize();

  // If no state provided, fall back to simple movement (no collision)
  if (!state) {
    mob.position.addScaledVector(dir, step);
    mob.yaw = Math.atan2(-dir.x, -dir.z);
    return;
  }

  const pos = mob.position;
  const footY = Math.floor(pos.y);
  const headY = footY + 1;

  // Helper: check if a position is blocked at foot or head height
  const isBlocked = (x: number, z: number): boolean => {
    return isWorldSolid(state, x, footY, z) || isWorldSolid(state, x, headY, z);
  };

  // Try 1: direct movement
  const nextX = pos.x + dir.x * step;
  const nextZ = pos.z + dir.z * step;

  if (!isBlocked(nextX, nextZ)) {
    pos.x = nextX;
    pos.z = nextZ;
    mob.yaw = Math.atan2(-dir.x, -dir.z);
    return;
  }

  // Try 2: slide along X axis only
  if (Math.abs(dir.x) > 0.01) {
    const slideX = pos.x + dir.x * step;
    if (!isBlocked(slideX, pos.z)) {
      pos.x = slideX;
      mob.yaw = Math.atan2(-dir.x, 0);
      return;
    }
  }

  // Try 3: slide along Z axis only
  if (Math.abs(dir.z) > 0.01) {
    const slideZ = pos.z + dir.z * step;
    if (!isBlocked(pos.x, slideZ)) {
      pos.z = slideZ;
      mob.yaw = Math.atan2(0, -dir.z);
      return;
    }
  }

  // Try 4: random perpendicular direction
  const sign = Math.random() < 0.5 ? 1 : -1;
  const perpX = -dir.z * sign;
  const perpZ = dir.x * sign;
  const perpNextX = pos.x + perpX * step;
  const perpNextZ = pos.z + perpZ * step;

  if (!isBlocked(perpNextX, perpNextZ)) {
    pos.x = perpNextX;
    pos.z = perpNextZ;
    mob.yaw = Math.atan2(-perpX, -perpZ);
  }
}

// ---------------------------------------------------------------------------
// Damage
// ---------------------------------------------------------------------------

export function damageMob(
  state: CraftState, mobId: number, damage: number, knockback?: THREE.Vector3,
): void {
  const idx = state.mobs.findIndex((m) => m.id === mobId);
  if (idx === -1) return;

  const mob = state.mobs[idx];
  const def = MOB_DEFS[mob.type];

  mob.hp -= damage;
  mob.hurtTimer = 0.3;

  if (knockback) mob.velocity.add(knockback);

  // Passive mobs flee
  if (def && (def.behavior === "passive" || def.behavior === "neutral")) {
    mob.aiState = "flee";
    mob.aiTimer = rand(3, 6);
  }

  if (mob.hp <= 0) {
    // Award XP
    if (def) state.player.xp += def.xpDrop;

    addMessage(state, `You slew a ${def?.name ?? mob.type}!`, 0xFFD700);
    state.mobs.splice(idx, 1);
  }
}

// ---------------------------------------------------------------------------
// Spatial query
// ---------------------------------------------------------------------------

export function getMobsNear(state: CraftState, pos: THREE.Vector3, radius: number): MobInstance[] {
  const r2 = radius * radius;
  return state.mobs.filter((m) => {
    const dx = m.position.x - pos.x;
    const dy = m.position.y - pos.y;
    const dz = m.position.z - pos.z;
    return dx * dx + dy * dy + dz * dz <= r2;
  });
}
