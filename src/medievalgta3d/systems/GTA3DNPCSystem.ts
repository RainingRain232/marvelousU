// Medieval GTA 3D – NPC AI, movement, behaviors
import type { GTA3DState, NPC3D, Vec3 } from '../state/GTA3DState';
import { genId3D } from '../state/GTA3DState';
import { GTA3D } from '../config/GTA3DConfig';

/* ── Helpers ─────────────────────────────────────── */

function dist3D(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function normalize(v: Vec3): Vec3 {
  const len = Math.sqrt(v.x * v.x + v.z * v.z);
  if (len === 0) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: 0, z: v.z / len };
}

function collidesBuilding(state: GTA3DState, px: number, pz: number, radius: number): boolean {
  for (const b of state.buildings) {
    if (!b.blocksMovement) continue;
    const halfW = b.size.x / 2;
    const halfD = b.size.z / 2;
    const closestX = clamp(px, b.pos.x - halfW, b.pos.x + halfW);
    const closestZ = clamp(pz, b.pos.z - halfD, b.pos.z + halfD);
    const dx = px - closestX;
    const dz = pz - closestZ;
    if (dx * dx + dz * dz < radius * radius) return true;
  }
  return false;
}

/* ── Type checks ─────────────────────────────────── */

function isGuardType(type: string): boolean {
  return type === 'guard' || type === 'soldier';
}

function isKnightType(type: string): boolean {
  return type === 'knight';
}

function isArcherType(type: string): boolean {
  return type === 'archer';
}

function isCivilianType(type: string): boolean {
  return type === 'civilian_m' || type === 'civilian_f' || type === 'merchant' ||
         type === 'blacksmith' || type === 'priest' || type === 'bard' ||
         type === 'tavern_keeper' || type === 'stable_master';
}

/* ── Main update ─────────────────────────────────── */

export function updateNPCs3D(state: GTA3DState, dt: number): void {
  if (state.paused || state.gameOver) return;
  const p = state.player;

  const toRemove: string[] = [];

  state.npcs.forEach((npc) => {
    if (npc.dead) {
      npc.deathTimer -= dt;
      if (npc.deathTimer <= 0) {
        toRemove.push(npc.id);
      }
      return;
    }

    const distToPlayer = dist3D(npc.pos, p.pos);

    // ── AI behavior decision ──
    updateBehaviorAI(state, npc, distToPlayer, dt);

    // ── Execute behavior ──
    switch (npc.behavior) {
      case 'wander':
        doWander(state, npc, dt);
        break;
      case 'patrol':
        doPatrol(state, npc, dt);
        break;
      case 'stand':
      case 'idle':
        npc.vel.x = 0;
        npc.vel.z = 0;
        break;
      case 'flee':
        doFlee(state, npc, dt);
        break;
      case 'chase_player':
        doChase(state, npc, distToPlayer, dt);
        break;
      case 'attack_player':
        doAttackStance(state, npc, distToPlayer, dt);
        break;
    }

    // Apply velocity & friction
    applyNPCMovement(state, npc, dt);
  });

  // Remove dead NPCs whose death timer expired
  for (const id of toRemove) {
    state.npcs.delete(id);
  }
}

/* ── AI decision layer ───────────────────────────── */

function updateBehaviorAI(state: GTA3DState, npc: NPC3D, distToPlayer: number, dt: number): void {
  const p = state.player;
  if (p.state === 'dead') return;

  const alertRadius = npc.alertRadius + p.wantedLevel * GTA3D.WANTED_ALERT_RADIUS_PER_STAR;

  // Guards: chase at wanted >= 2
  if (isGuardType(npc.type)) {
    if (p.wantedLevel >= 2 && distToPlayer < alertRadius) {
      npc.behavior = distToPlayer <= GTA3D.NPC_ATTACK_RANGE ? 'attack_player' : 'chase_player';
      npc.chaseTimer = 10;
      return;
    }
    // Decay chase
    if (npc.behavior === 'chase_player' || npc.behavior === 'attack_player') {
      npc.chaseTimer -= dt;
      if (npc.chaseTimer <= 0 || p.wantedLevel < 2) {
        npc.behavior = npc.patrolPath.length > 0 ? 'patrol' : 'wander';
      }
      return;
    }
  }

  // Knights: chase at wanted >= 3
  if (isKnightType(npc.type)) {
    if (p.wantedLevel >= 3 && distToPlayer < alertRadius) {
      npc.behavior = distToPlayer <= GTA3D.NPC_ATTACK_RANGE ? 'attack_player' : 'chase_player';
      npc.chaseTimer = 15;
      return;
    }
    if (npc.behavior === 'chase_player' || npc.behavior === 'attack_player') {
      npc.chaseTimer -= dt;
      if (npc.chaseTimer <= 0 || p.wantedLevel < 3) {
        npc.behavior = npc.patrolPath.length > 0 ? 'patrol' : 'wander';
      }
      return;
    }
  }

  // Archers: shoot arrows at wanted >= 2
  if (isArcherType(npc.type)) {
    if (p.wantedLevel >= 2 && distToPlayer < GTA3D.ATTACK_RANGE_BOW && distToPlayer > 5) {
      npc.behavior = 'attack_player';
      npc.chaseTimer = 10;
      // Archer attack handled specially: shoot projectiles
      npc.attackTimer -= dt;
      if (npc.attackTimer <= 0) {
        shootArrow(state, npc);
        npc.attackTimer = npc.attackCooldown;
      }
      return;
    }
    if (p.wantedLevel >= 2 && distToPlayer <= 5) {
      // Too close, back up or chase
      npc.behavior = 'chase_player';
      npc.chaseTimer = 10;
      return;
    }
    if (npc.behavior === 'chase_player' || npc.behavior === 'attack_player') {
      npc.chaseTimer -= dt;
      if (npc.chaseTimer <= 0 || p.wantedLevel < 2) {
        npc.behavior = npc.patrolPath.length > 0 ? 'patrol' : 'stand';
      }
      return;
    }
  }

  // Criminals: attack player if close
  if (npc.type === 'criminal') {
    if (distToPlayer < npc.aggroRadius) {
      npc.behavior = distToPlayer <= GTA3D.NPC_ATTACK_RANGE ? 'attack_player' : 'chase_player';
      npc.chaseTimer = 8;
      return;
    }
    if (npc.behavior === 'chase_player' || npc.behavior === 'attack_player') {
      npc.chaseTimer -= dt;
      if (npc.chaseTimer <= 0 || distToPlayer > npc.alertRadius) {
        npc.behavior = 'wander';
      }
      return;
    }
  }

  // Bandits: always aggressive
  if (npc.type === 'bandit') {
    if (distToPlayer < npc.alertRadius) {
      npc.behavior = distToPlayer <= GTA3D.NPC_ATTACK_RANGE ? 'attack_player' : 'chase_player';
      npc.chaseTimer = 15;
      return;
    }
    if (npc.behavior === 'chase_player' || npc.behavior === 'attack_player') {
      npc.chaseTimer -= dt;
      if (npc.chaseTimer <= 0) {
        npc.behavior = 'wander';
      }
      return;
    }
  }

  // Assassin: aggressive + fast
  if (npc.type === 'assassin') {
    if (distToPlayer < npc.alertRadius) {
      npc.behavior = distToPlayer <= GTA3D.NPC_ATTACK_RANGE ? 'attack_player' : 'chase_player';
      npc.chaseTimer = 20;
      return;
    }
    if (npc.behavior === 'chase_player' || npc.behavior === 'attack_player') {
      npc.chaseTimer -= dt;
      if (npc.chaseTimer <= 0) {
        npc.behavior = 'wander';
      }
      return;
    }
  }

  // Civilians: flee when wanted > 0 and player is near
  if (isCivilianType(npc.type)) {
    if (p.wantedLevel > 0 && distToPlayer < 12) {
      npc.behavior = 'flee';
      return;
    }
    if (npc.behavior === 'flee' && (p.wantedLevel <= 0 || distToPlayer > 20)) {
      npc.behavior = 'wander';
    }
  }
}

/* ── Behavior implementations ────────────────────── */

function doWander(_state: GTA3DState, npc: NPC3D, dt: number): void {
  npc.wanderTimer -= dt;

  if (!npc.wanderTarget || npc.wanderTimer <= 0 || dist3D(npc.pos, npc.wanderTarget) < 1.0) {
    // Pick new target near homePos
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * GTA3D.NPC_WANDER_RADIUS;
    npc.wanderTarget = {
      x: npc.homePos.x + Math.cos(angle) * radius,
      y: 0,
      z: npc.homePos.z + Math.sin(angle) * radius,
    };
    npc.wanderTimer = 3 + Math.random() * 4;
  }

  const dir = normalize({
    x: npc.wanderTarget.x - npc.pos.x,
    y: 0,
    z: npc.wanderTarget.z - npc.pos.z,
  });

  npc.vel.x = dir.x * GTA3D.NPC_WANDER_SPEED;
  npc.vel.z = dir.z * GTA3D.NPC_WANDER_SPEED;
  if (dir.x !== 0 || dir.z !== 0) {
    npc.rotation = Math.atan2(dir.x, -dir.z);
  }
}

function doPatrol(_state: GTA3DState, npc: NPC3D, _dt: number): void {
  if (npc.patrolPath.length === 0) {
    npc.behavior = 'stand';
    return;
  }

  const target = npc.patrolPath[npc.patrolIndex];
  const d = dist3D(npc.pos, target);

  if (d < 1.0) {
    // Advance to next patrol point
    npc.patrolIndex += npc.patrolDir;
    if (npc.patrolIndex >= npc.patrolPath.length) {
      npc.patrolDir = -1;
      npc.patrolIndex = npc.patrolPath.length - 1;
    } else if (npc.patrolIndex < 0) {
      npc.patrolDir = 1;
      npc.patrolIndex = 0;
    }
    return;
  }

  const dir = normalize({ x: target.x - npc.pos.x, y: 0, z: target.z - npc.pos.z });
  npc.vel.x = dir.x * GTA3D.NPC_WANDER_SPEED * 1.2;
  npc.vel.z = dir.z * GTA3D.NPC_WANDER_SPEED * 1.2;
  npc.rotation = Math.atan2(dir.x, -dir.z);
}

function doFlee(state: GTA3DState, npc: NPC3D, _dt: number): void {
  const p = state.player;
  const dx = npc.pos.x - p.pos.x;
  const dz = npc.pos.z - p.pos.z;
  const dir = normalize({ x: dx, y: 0, z: dz });

  npc.vel.x = dir.x * GTA3D.NPC_FLEE_SPEED;
  npc.vel.z = dir.z * GTA3D.NPC_FLEE_SPEED;
  if (dir.x !== 0 || dir.z !== 0) {
    npc.rotation = Math.atan2(dir.x, -dir.z);
  }
}

function doChase(state: GTA3DState, npc: NPC3D, distToPlayer: number, _dt: number): void {
  const p = state.player;

  // If close enough, switch to attack
  if (distToPlayer <= GTA3D.NPC_ATTACK_RANGE) {
    npc.behavior = 'attack_player';
    npc.vel.x = 0;
    npc.vel.z = 0;
    return;
  }

  const dir = normalize({ x: p.pos.x - npc.pos.x, y: 0, z: p.pos.z - npc.pos.z });
  const chaseSpeed = isKnightType(npc.type) ? GTA3D.KNIGHT_CHASE_SPEED :
                     isGuardType(npc.type) ? GTA3D.GUARD_CHASE_SPEED :
                     npc.speed;

  npc.vel.x = dir.x * chaseSpeed;
  npc.vel.z = dir.z * chaseSpeed;
  npc.rotation = Math.atan2(dir.x, -dir.z);
}

function doAttackStance(state: GTA3DState, npc: NPC3D, distToPlayer: number, _dt: number): void {
  const p = state.player;

  // Face player
  const dir = normalize({ x: p.pos.x - npc.pos.x, y: 0, z: p.pos.z - npc.pos.z });
  npc.rotation = Math.atan2(dir.x, -dir.z);

  // If player moved out of range, chase
  if (distToPlayer > GTA3D.NPC_ATTACK_RANGE * 1.5 && !isArcherType(npc.type)) {
    npc.behavior = 'chase_player';
    return;
  }

  npc.vel.x = 0;
  npc.vel.z = 0;

  // Attack timer handled in CombatSystem updateNPCAttacks
}

function shootArrow(state: GTA3DState, npc: NPC3D): void {
  const p = state.player;
  const dir = normalize({ x: p.pos.x - npc.pos.x, y: 0, z: p.pos.z - npc.pos.z });
  const speed = 25;

  state.projectiles.push({
    id: genId3D(state),
    pos: { x: npc.pos.x, y: 1.2, z: npc.pos.z },
    vel: { x: dir.x * speed, y: 0, z: dir.z * speed },
    damage: npc.damage,
    life: 2.0,
    ownedByPlayer: false,
  });
}

/* ── Movement & collision ────────────────────────── */

function applyNPCMovement(state: GTA3DState, npc: NPC3D, dt: number): void {
  const half = state.worldSize / 2;
  const radius = 0.4;

  let newX = npc.pos.x + npc.vel.x * dt;
  let newZ = npc.pos.z + npc.vel.z * dt;

  // Building collision
  if (collidesBuilding(state, newX, npc.pos.z, radius)) {
    newX = npc.pos.x;
    npc.vel.x = 0;
  }
  if (collidesBuilding(state, newX, newZ, radius)) {
    newZ = npc.pos.z;
    npc.vel.z = 0;
  }

  // World bounds
  newX = clamp(newX, -half + radius, half - radius);
  newZ = clamp(newZ, -half + radius, half - radius);

  npc.pos.x = newX;
  npc.pos.z = newZ;
  npc.pos.y = 0;

  // Friction for wandering NPCs
  if (npc.behavior === 'stand' || npc.behavior === 'idle' || npc.behavior === 'dead') {
    npc.vel.x *= 0.85;
    npc.vel.z *= 0.85;
  }
}
