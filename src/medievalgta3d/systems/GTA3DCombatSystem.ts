// Medieval GTA 3D – Combat, projectiles, particles, notifications
import type { GTA3DState, NPC3D, Vec3, WeaponType } from '../state/GTA3DState';
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
  if (len === 0) return { x: 0, y: 0, z: -1 };
  return { x: v.x / len, y: 0, z: v.z / len };
}

function angleBetween(a: Vec3, b: Vec3): number {
  const dot = a.x * b.x + a.z * b.z;
  return Math.acos(clamp(dot, -1, 1));
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

/* ── Weapon helpers ──────────────────────────────── */

function getWeaponDamage(w: WeaponType): number {
  switch (w) {
    case 'fists': return GTA3D.FIST_DAMAGE;
    case 'sword': return GTA3D.SWORD_DAMAGE;
    case 'axe': return GTA3D.AXE_DAMAGE;
    case 'mace': return GTA3D.MACE_DAMAGE;
    case 'spear': return GTA3D.SPEAR_DAMAGE;
    case 'bow': return GTA3D.BOW_DAMAGE;
    case 'crossbow': return GTA3D.CROSSBOW_DAMAGE;
    default: return 10;
  }
}

function isRanged(w: WeaponType): boolean {
  return w === 'bow' || w === 'crossbow';
}

function getAttackRange(w: WeaponType): number {
  if (w === 'spear') return GTA3D.ATTACK_RANGE_SPEAR;
  if (isRanged(w)) return GTA3D.ATTACK_RANGE_BOW;
  return GTA3D.ATTACK_RANGE_MELEE;
}

/* ── Exported helpers ────────────────────────────── */

export function addNotification3D(state: GTA3DState, text: string, color: number): void {
  state.notifications.push({
    id: genId3D(state),
    text,
    timer: GTA3D.NOTIFICATION_DURATION,
    color,
  });
  // Cap at 8
  if (state.notifications.length > 8) state.notifications.shift();
}

export function increaseWanted3D(state: GTA3DState, amount: number): void {
  const prev = state.player.wantedLevel;
  state.player.wantedLevel = Math.min(GTA3D.WANTED_MAX, state.player.wantedLevel + amount);
  state.player.wantedDecayTimer = GTA3D.WANTED_DECAY_TIME;
  if (state.player.wantedLevel > prev) {
    const stars = '★'.repeat(state.player.wantedLevel);
    addNotification3D(state, `Wanted level: ${stars}`, 0xff4444);
  }
}

/* ── Damage functions ────────────────────────────── */

export function dealDamageToNPC3D(state: GTA3DState, npc: NPC3D, damage: number): void {
  if (npc.dead) return;
  npc.hp -= damage;
  spawnParticles3D(state, npc.pos, 0xcc0000, 5);

  if (npc.hp <= 0) {
    npc.hp = 0;
    npc.dead = true;
    npc.behavior = 'dead';
    npc.deathTimer = 5;
    npc.vel = { x: 0, y: 0, z: 0 };

    // Reward
    const goldDrop = npc.type === 'merchant' ? 30 : npc.type === 'bandit' ? 15 : 5;
    state.player.gold += goldDrop;
    addNotification3D(state, `+${goldDrop} gold`, 0xffcc00);

    // Kill streak
    state.player.killStreak++;
    state.player.killStreakTimer = 5;
    if (state.player.killStreak >= 3) {
      addNotification3D(state, `Kill streak x${state.player.killStreak}!`, 0xff6600);
    }

    // Wanted increase for killing non-criminals
    const criminalTypes: string[] = ['criminal', 'bandit', 'assassin'];
    if (!criminalTypes.includes(npc.type)) {
      const amount = (npc.type === 'guard' || npc.type === 'knight' || npc.type === 'soldier') ? 2 : 1;
      increaseWanted3D(state, amount);
    }
  } else {
    // Aggro the NPC
    if (['wander', 'patrol', 'stand', 'idle'].includes(npc.behavior)) {
      const aggressiveTypes: string[] = ['guard', 'knight', 'soldier', 'criminal', 'bandit', 'assassin', 'archer'];
      if (aggressiveTypes.includes(npc.type)) {
        npc.behavior = 'chase_player';
      } else {
        npc.behavior = 'flee';
      }
    }
  }
}

export function dealDamageToPlayer3D(state: GTA3DState, damage: number): void {
  const p = state.player;
  if (p.invincibleTimer > 0) return;
  if (p.state === 'dead') return;

  let finalDamage = damage;
  if (p.state === 'blocking') {
    finalDamage *= (1 - GTA3D.BLOCK_REDUCTION);
    spawnParticles3D(state, p.pos, 0x8888ff, 3);
  }

  p.hp -= finalDamage;
  p.invincibleTimer = GTA3D.INVINCIBLE_DURATION;
  spawnParticles3D(state, p.pos, 0xff0000, 4);

  if (p.hp <= 0) {
    p.hp = 0;
    p.state = 'dead';
    state.gameOver = true;
    addNotification3D(state, 'You are dead!', 0xff0000);
  }
}

/* ── Particles ───────────────────────────────────── */

export function spawnParticles3D(state: GTA3DState, pos: Vec3, color: number, count: number): void {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd = 1 + Math.random() * 3;
    state.particles.push({
      pos: { x: pos.x, y: pos.y + 0.5, z: pos.z },
      vel: { x: Math.cos(angle) * spd, y: 2 + Math.random() * 3, z: Math.sin(angle) * spd },
      life: 0.4 + Math.random() * 0.4,
      maxLife: 0.8,
      color,
      size: 0.15 + Math.random() * 0.15,
    });
  }
}

/* ── Main combat update ──────────────────────────── */

export function updateCombat3D(state: GTA3DState, dt: number): void {
  if (state.paused || state.gameOver) return;
  const p = state.player;

  // Rising edge of attackTimer: perform attack
  if (p.attackTimer > 0 && p.attackCooldown > 0 &&
      p.attackTimer <= p.attackCooldown * 0.4 &&
      p.attackTimer + dt > p.attackCooldown * 0.4) {
    performPlayerAttack(state);
  }

  // Update projectiles
  updateProjectiles(state, dt);

  // Update particles
  updateParticles(state, dt);

  // Update notifications
  updateNotifications(state, dt);

  // NPC attacks against player
  updateNPCAttacks(state, dt);
}

function performPlayerAttack(state: GTA3DState): void {
  const p = state.player;
  const weapon = p.weapon;
  const damage = getWeaponDamage(weapon);
  const facing = normalize({ x: Math.sin(p.rotation), y: 0, z: -Math.cos(p.rotation) });

  if (isRanged(weapon)) {
    // Spawn projectile
    const speed = 30;
    state.projectiles.push({
      id: genId3D(state),
      pos: { x: p.pos.x, y: 1.0, z: p.pos.z },
      vel: { x: facing.x * speed, y: 0, z: facing.z * speed },
      damage,
      life: 2.0,
      ownedByPlayer: true,
    });
  } else {
    // Melee cone check
    const range = getAttackRange(weapon);
    const coneAngle = Math.PI / 3; // 60 degree cone

    state.npcs.forEach((npc) => {
      if (npc.dead) return;
      const d = dist3D(p.pos, npc.pos);
      if (d > range) return;

      const toNPC = normalize({ x: npc.pos.x - p.pos.x, y: 0, z: npc.pos.z - p.pos.z });
      const angle = angleBetween(facing, toNPC);
      if (angle <= coneAngle) {
        dealDamageToNPC3D(state, npc, damage);
      }
    });
  }
}

function updateProjectiles(state: GTA3DState, dt: number): void {
  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const proj = state.projectiles[i];
    proj.pos.x += proj.vel.x * dt;
    proj.pos.z += proj.vel.z * dt;
    proj.life -= dt;

    // Remove expired
    if (proj.life <= 0) {
      state.projectiles.splice(i, 1);
      continue;
    }

    // Building collision
    if (collidesBuilding(state, proj.pos.x, proj.pos.z, 0.2)) {
      spawnParticles3D(state, proj.pos, 0x886644, 3);
      state.projectiles.splice(i, 1);
      continue;
    }

    if (proj.ownedByPlayer) {
      // Hit NPCs
      let hit = false;
      state.npcs.forEach((npc) => {
        if (hit || npc.dead) return;
        if (dist3D(proj.pos, npc.pos) < 1.2) {
          dealDamageToNPC3D(state, npc, proj.damage);
          hit = true;
        }
      });
      if (hit) {
        state.projectiles.splice(i, 1);
        continue;
      }
    } else {
      // Hit player
      if (dist3D(proj.pos, state.player.pos) < 1.0) {
        dealDamageToPlayer3D(state, proj.damage);
        state.projectiles.splice(i, 1);
        continue;
      }
    }
  }
}

function updateParticles(state: GTA3DState, dt: number): void {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const part = state.particles[i];
    part.pos.x += part.vel.x * dt;
    part.pos.y += part.vel.y * dt;
    part.pos.z += part.vel.z * dt;
    part.vel.y -= 9.8 * dt; // gravity
    part.life -= dt;
    if (part.life <= 0) {
      state.particles.splice(i, 1);
    }
  }
}

function updateNotifications(state: GTA3DState, dt: number): void {
  for (let i = state.notifications.length - 1; i >= 0; i--) {
    state.notifications[i].timer -= dt;
    if (state.notifications[i].timer <= 0) {
      state.notifications.splice(i, 1);
    }
  }
}

function updateNPCAttacks(state: GTA3DState, dt: number): void {
  const p = state.player;
  if (p.state === 'dead') return;

  state.npcs.forEach((npc) => {
    if (npc.dead) return;
    if (npc.behavior !== 'attack_player') return;

    npc.attackTimer -= dt;
    if (npc.attackTimer <= 0) {
      const d = dist3D(npc.pos, p.pos);
      if (d <= GTA3D.NPC_ATTACK_RANGE) {
        dealDamageToPlayer3D(state, npc.damage);
        spawnParticles3D(state, p.pos, 0xff4444, 3);
      }
      npc.attackTimer = npc.attackCooldown;
    }
  });
}
