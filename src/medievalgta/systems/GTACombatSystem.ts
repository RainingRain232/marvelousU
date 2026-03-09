// GTACombatSystem.ts – Combat helpers, particles, and notifications. No PixiJS.
import type { MedievalGTAState, GTAVec2, GTANPC } from '../state/MedievalGTAState';
import { GTAConfig } from '../config/MedievalGTAConfig';
import { increaseWanted } from './GTAWantedSystem';

// ─── Particles ───────────────────────────────────────────────────────────────

export function spawnHitParticles(
  state: MedievalGTAState,
  pos: GTAVec2,
  color: number,
  count: number,
): void {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd   = 40 + Math.random() * 80;
    state.particles.push({
      pos:     { x: pos.x + (Math.random() - 0.5) * 6, y: pos.y + (Math.random() - 0.5) * 6 },
      vel:     { x: Math.cos(angle) * spd, y: Math.sin(angle) * spd },
      life:    0.3 + Math.random() * 0.3,
      maxLife: 0.6,
      color,
      size:    2 + Math.random() * 3,
    });
  }
}

export function spawnBloodParticles(state: MedievalGTAState, pos: GTAVec2): void {
  const count = 6 + Math.floor(Math.random() * 6);
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd   = 30 + Math.random() * 90;
    state.particles.push({
      pos:     { x: pos.x + (Math.random() - 0.5) * 4, y: pos.y + (Math.random() - 0.5) * 4 },
      vel:     { x: Math.cos(angle) * spd, y: Math.sin(angle) * spd - 20 }, // slight upward bias
      life:    0.5 + Math.random() * 0.5,
      maxLife: 1.0,
      color:   0xcc0000,
      size:    2 + Math.random() * 4,
    });
  }
}

export function updateParticles(state: MedievalGTAState, dt: number): void {
  const GRAVITY = 160; // pixels/s²
  let i = state.particles.length;
  while (i--) {
    const p = state.particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      state.particles.splice(i, 1);
      continue;
    }
    // Blood-red particles get gravity; all others are flat
    if (p.color === 0xcc0000 || p.color === 0xff0000) {
      p.vel.y += GRAVITY * dt;
    }
    p.pos.x += p.vel.x * dt;
    p.pos.y += p.vel.y * dt;
    // Simple friction
    p.vel.x *= 0.96;
    p.vel.y *= 0.98;
  }
}

// ─── Notifications ───────────────────────────────────────────────────────────

export function addNotification(
  state: MedievalGTAState,
  text: string,
  color: number,
): void {
  // Deduplicate identical recent notifications
  const existing = state.notifications.find(n => n.text === text && n.timer > 0.5);
  if (existing) {
    existing.timer = GTAConfig.NOTIFICATION_DURATION;
    return;
  }
  state.notifications.push({
    id:    `notif_${state.nextId++}`,
    text,
    timer: GTAConfig.NOTIFICATION_DURATION,
    color,
  });
}

function tickNotifications(state: MedievalGTAState, dt: number): void {
  let i = state.notifications.length;
  while (i--) {
    state.notifications[i].timer -= dt;
    if (state.notifications[i].timer <= 0) {
      state.notifications.splice(i, 1);
    }
  }
}

// ─── Classify NPC for wanted consequences ───────────────────────────────────

function _isCivilian(npc: GTANPC): boolean {
  return (
    npc.type === 'civilian_m' ||
    npc.type === 'civilian_f' ||
    npc.type === 'merchant'   ||
    npc.type === 'blacksmith_npc' ||
    npc.type === 'priest'     ||
    npc.type === 'bard'       ||
    npc.type === 'stable_master' ||
    npc.type === 'tavern_keeper'
  );
}

function _isGuardType(npc: GTANPC): boolean {
  return (
    npc.type === 'guard' ||
    npc.type === 'knight' ||
    npc.type === 'archer_guard' ||
    npc.type === 'army_soldier'
  );
}

function _isOutlaw(npc: GTANPC): boolean {
  return npc.type === 'criminal' || npc.type === 'bandit';
}

// ─── dealDamageToNPC ──────────────────────────────────────────────────────────

export function dealDamageToNPC(
  state: MedievalGTAState,
  npcId: string,
  dmg: number,
): void {
  const npc = state.npcs.get(npcId);
  if (!npc || npc.dead) return;

  npc.hp -= dmg;

  // Spawn hit particles
  spawnBloodParticles(state, npc.pos);

  if (npc.hp > 0) {
    // NPC is hurt – civilians scream and flee
    if (_isCivilian(npc)) {
      npc.behavior = 'flee';
      increaseWanted(state, 1);
      addNotification(state, 'Assault! +1 Star', 0xff8800);
    }
    return;
  }

  // ── NPC is dead ──────────────────────────────────────────────────────────
  npc.hp         = 0;
  npc.dead       = true;
  npc.behavior   = 'dead';
  npc.deathTimer = 8.0;
  npc.vel.x      = 0;
  npc.vel.y      = 0;

  // Wanted level consequences
  if (_isGuardType(npc)) {
    const stars = npc.type === 'knight' ? 2 : 1;
    increaseWanted(state, stars);
    addNotification(
      state,
      `Guard slain! +${stars} Star${stars > 1 ? 's' : ''}`,
      0xff0000,
    );
  } else if (_isCivilian(npc)) {
    increaseWanted(state, 2);
    addNotification(state, 'Innocent killed! +2 Stars', 0xff0000);
  } else if (_isOutlaw(npc) && state.player.wantedLevel === 0) {
    // No penalty for killing criminals/bandits at 0 stars
    addNotification(state, `${npc.name} slain.`, 0xaaaaaa);
  }

  // Death particles
  spawnHitParticles(state, npc.pos, 0xcc0000, 12);

  // Drop gold
  const goldAmt = 5 + Math.floor(Math.random() * 20);
  state.items.push({
    id:        `item_drop_${state.nextId++}`,
    type:      'gold_pile',
    pos:       { x: npc.pos.x + (Math.random() - 0.5) * 20, y: npc.pos.y + (Math.random() - 0.5) * 20 },
    amount:    goldAmt,
    collected: false,
  });

  // Update kill objectives in active quests
  _onNPCKilledQuestUpdate(state, npc);
}

function _onNPCKilledQuestUpdate(state: MedievalGTAState, npc: GTANPC): void {
  for (const quest of state.quests) {
    if (quest.status !== 'active') continue;
    for (const obj of quest.objectives) {
      if (obj.completed) continue;
      if (obj.type === 'kill' && obj.targetNpcType === npc.type) {
        obj.killCurrent = (obj.killCurrent ?? 0) + 1;
        if (obj.killCurrent >= (obj.killCount ?? 1)) {
          obj.completed = true;
        }
      }
    }
  }
}

// ─── dealDamageToPlayer ───────────────────────────────────────────────────────

export function dealDamageToPlayer(state: MedievalGTAState, dmg: number): void {
  const p = state.player;

  if (p.invincibleTimer > 0) return;
  if (p.state === 'dead') return;

  // Blocking check
  if (p.state === 'blocking' || p.blockTimer > 0) {
    dmg = Math.floor(dmg * 0.15); // 85% damage reduction
    addNotification(state, 'Blocked!', 0xaaddff);
    if (dmg <= 0) return;
  }

  p.hp = Math.max(0, p.hp - dmg);
  p.invincibleTimer = 0.35;

  // Flash notification
  addNotification(state, `- ${dmg} HP`, 0xff4444);

  if (p.hp <= 0) {
    (p as { state: string }).state = 'dead';
    p.vel.x      = 0;
    p.vel.y      = 0;
    state.gameOver = true;
    addNotification(state, 'You have fallen!', 0xff0000);
  }
}

// ─── Player attack resolution (cone check) ─────────────────────────────────

/** Angle difference wrapped to [-PI, PI]. */
function angleDiff(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * Resolves player melee/ranged attacks against NPCs each frame.
 * Called when player.attackTimer transitions from 0 to >0 (attack just started).
 * We track this with a simple flag: resolve hits only on the first frame of the attack
 * (attackTimer is near its max value, i.e. within one dt of PLAYER_ATTACK_DURATION).
 */
let _lastAttackTimer = 0;

function resolvePlayerAttacks(state: MedievalGTAState, _dt: number): void {
  const p = state.player;

  // Detect the rising edge of an attack: attackTimer went from 0 to >0
  const attackJustStarted = p.attackTimer > 0 && _lastAttackTimer <= 0;
  _lastAttackTimer = p.attackTimer;

  if (!attackJustStarted) return;
  if (p.state === 'dead') return;

  // Determine range and damage based on weapon
  let range: number;
  let damage: number;
  const CONE_HALF_ANGLE = Math.PI / 6; // 30 degrees each side = 60 degree cone

  switch (p.weapon) {
    case 'sword':
      range = GTAConfig.ATTACK_RANGE_MELEE + 25; // sword has extra reach
      damage = GTAConfig.SWORD_DAMAGE;
      break;
    case 'bow':
      range = GTAConfig.ATTACK_RANGE_BOW;
      damage = GTAConfig.BOW_DAMAGE;
      break;
    case 'fists':
    default:
      range = GTAConfig.ATTACK_RANGE_MELEE;
      damage = GTAConfig.FIST_DAMAGE;
      break;
  }

  let hitAny = false;

  for (const [npcId, npc] of state.npcs) {
    if (npc.dead) continue;

    const dx = npc.pos.x - p.pos.x;
    const dy = npc.pos.y - p.pos.y;
    const d = Math.sqrt(dx * dx + dy * dy);

    if (d > range) continue;

    // Check facing cone
    const angleToNpc = Math.atan2(dy, dx);
    const diff = Math.abs(angleDiff(angleToNpc, p.facing));
    if (diff > CONE_HALF_ANGLE) continue;

    // Hit this NPC
    dealDamageToNPC(state, npcId, damage);
    hitAny = true;

    // Spawn hit spark particles at impact point
    const hitX = p.pos.x + dx * 0.6;
    const hitY = p.pos.y + dy * 0.6;
    if (p.weapon === 'sword') {
      spawnHitParticles(state, { x: hitX, y: hitY }, 0xffff88, 4); // yellow sparks
    } else if (p.weapon === 'fists') {
      spawnHitParticles(state, { x: hitX, y: hitY }, 0xffaa44, 3); // orange sparks
    }
  }

  if (!hitAny && p.weapon !== 'bow') {
    // Swing miss - spawn small white particles at attack point
    const missX = p.pos.x + Math.cos(p.facing) * range * 0.7;
    const missY = p.pos.y + Math.sin(p.facing) * range * 0.7;
    spawnHitParticles(state, { x: missX, y: missY }, 0xcccccc, 2);
  }
}

// ─── Main combat update ─────────────────────────────────────────────────────

/**
 * Call once per frame. Resolves player attacks against NPCs,
 * updates particles (gravity/life), and ticks notification timers.
 */
export function updateCombat(state: MedievalGTAState, dt: number): void {
  if (!state.paused && !state.gameOver) {
    resolvePlayerAttacks(state, dt);
  }
  updateParticles(state, dt);
  tickNotifications(state, dt);
}

/** @deprecated Use updateCombat instead. Kept for backward compatibility. */
export function updateCombatFrame(state: MedievalGTAState, dt: number): void {
  updateCombat(state, dt);
}
