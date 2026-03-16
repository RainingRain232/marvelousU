// GTACombatSystem.ts – Combat helpers, particles, and notifications. No PixiJS.
import type { MedievalGTAState, GTAVec2, GTANPC, GTAProjectile } from '../state/MedievalGTAState';
import { GTAConfig, getEquipmentById, SKILL_DEFS, REPUTATION_EFFECTS } from '../config/MedievalGTAConfig';
// Skill and faction types used by the reputation/skill systems above
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

  // Award XP for the kill
  awardXP(state, GTAConfig.XP_PER_KILL);

  // Wanted level consequences + reputation effects
  if (_isGuardType(npc)) {
    const stars = npc.type === 'knight' ? 2 : 1;
    increaseWanted(state, stars);
    addNotification(
      state,
      `Guard slain! +${stars} Star${stars > 1 ? 's' : ''}`,
      0xff0000,
    );
    // Apply reputation for killing guard/knight
    const repAction = npc.type === 'knight' ? 'kill_knight' : 'kill_guard';
    applyReputationEffects(state, repAction);
  } else if (_isCivilian(npc)) {
    increaseWanted(state, 2);
    addNotification(state, 'Innocent killed! +2 Stars', 0xff0000);
    applyReputationEffects(state, 'kill_civilian');
  } else if (_isOutlaw(npc)) {
    if (state.player.wantedLevel === 0) {
      addNotification(state, `${npc.name} slain.`, 0xaaaaaa);
    }
    applyReputationEffects(state, 'kill_criminal');
  }

  // Kill streak
  state.player.killStreak++;
  state.player.killStreakTimer = 3.0;
  if (state.player.killStreak === 2) {
    addNotification(state, 'DOUBLE KILL!', 0xff8800);
  } else if (state.player.killStreak === 3) {
    addNotification(state, 'TRIPLE KILL!', 0xff0000);
  } else if (state.player.killStreak === 5) {
    addNotification(state, 'RAMPAGE!', 0xff2222);
  } else if (state.player.killStreak === 10) {
    addNotification(state, 'UNSTOPPABLE!', 0xffd700);
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

  // Equipment defense reduces incoming damage
  const equipBonuses = computeEquipmentBonuses(state);
  dmg = Math.max(1, dmg - equipBonuses.defenseBonus);

  // Blocking check (with skill-enhanced block reduction)
  if (p.state === 'blocking' || p.blockTimer > 0) {
    const skillBonuses = computeSkillBonuses(state);
    const blockReduction = GTAConfig.BLOCK_REDUCTION + skillBonuses.blockReduction;
    dmg = Math.floor(dmg * (1.0 - blockReduction));
    addNotification(state, 'Blocked!', 0xaaddff);
    if (dmg <= 0) return;
  }

  p.hp = Math.max(0, p.hp - dmg);
  p.invincibleTimer = 0.35;

  // Flash notification
  addNotification(state, `- ${dmg} HP`, 0xff4444);

  // Second Wind skill: chance to survive lethal blow
  if (p.hp <= 0) {
    const skillBonuses = computeSkillBonuses(state);
    if (skillBonuses.secondWindChance > 0 && Math.random() < skillBonuses.secondWindChance) {
      p.hp = 1;
      p.invincibleTimer = 1.0;
      addNotification(state, 'Second Wind! Survived at 1 HP!', 0xff8800);
      return;
    }

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

  // Sprint attack bonus: 1.5x damage when running fast
  const speed = Math.sqrt(p.vel.x * p.vel.x + p.vel.y * p.vel.y);
  const isSprinting = speed > GTAConfig.RUN_SPEED * 0.8;
  const sprintMultiplier = isSprinting ? 1.5 : 1.0;
  if (isSprinting && p.weapon !== 'bow') {
    addNotification(state, 'Sprint attack!', 0xff8800);
  }

  // Bow: spawn projectile instead of instant hit
  if (p.weapon === 'bow') {
    const projSpeed = 400;
    const proj: GTAProjectile = {
      id: `proj_${state.nextId++}`,
      pos: { x: p.pos.x, y: p.pos.y },
      vel: { x: Math.cos(p.facing) * projSpeed, y: Math.sin(p.facing) * projSpeed },
      damage: Math.floor(GTAConfig.BOW_DAMAGE * sprintMultiplier),
      life: 2.0,
      ownedByPlayer: true,
    };
    state.projectiles.push(proj);
    return;
  }

  // Melee: determine range and damage based on weapon + equipment + skills
  let range: number;
  let damage: number;
  const CONE_HALF_ANGLE = Math.PI / 6; // 30 degrees each side = 60 degree cone

  // Equipment and skill bonuses
  const equipBonuses = computeEquipmentBonuses(state);
  const skillBonuses = computeSkillBonuses(state);

  // Sprint attack multiplier includes skill bonus
  const adjustedSprintMult = isSprinting
    ? sprintMultiplier + skillBonuses.sprintDamageMult
    : 1.0;

  // Melee damage multiplier from skills
  const meleeMult = 1.0 + skillBonuses.meleeDamageMult;

  switch (p.weapon) {
    case 'sword':
      range = GTAConfig.ATTACK_RANGE_MELEE + 25; // sword has extra reach
      damage = Math.floor((GTAConfig.SWORD_DAMAGE + equipBonuses.damageBonus) * adjustedSprintMult * meleeMult);
      break;
    case 'fists':
    default:
      range = GTAConfig.ATTACK_RANGE_MELEE;
      damage = Math.floor((GTAConfig.FIST_DAMAGE + equipBonuses.damageBonus) * adjustedSprintMult * meleeMult);
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

  if (!hitAny) {
    // Swing miss - spawn small white particles at attack point
    const missX = p.pos.x + Math.cos(p.facing) * range * 0.7;
    const missY = p.pos.y + Math.sin(p.facing) * range * 0.7;
    spawnHitParticles(state, { x: missX, y: missY }, 0xcccccc, 2);
  }
}

// ─── Projectile system ──────────────────────────────────────────────────────

function updateProjectiles(state: MedievalGTAState, dt: number): void {
  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const proj = state.projectiles[i];

    // Move
    proj.pos.x += proj.vel.x * dt;
    proj.pos.y += proj.vel.y * dt;

    // Decrease life
    proj.life -= dt;
    if (proj.life <= 0) {
      state.projectiles.splice(i, 1);
      continue;
    }

    // Remove if out of world bounds
    if (proj.pos.x < 0 || proj.pos.x > state.worldWidth || proj.pos.y < 0 || proj.pos.y > state.worldHeight) {
      state.projectiles.splice(i, 1);
      continue;
    }

    // Check collision with buildings (remove on hit)
    let hitBuilding = false;
    for (const bld of state.buildings) {
      if (!bld.blocksMovement) continue;
      if (proj.pos.x >= bld.x && proj.pos.x <= bld.x + bld.w &&
          proj.pos.y >= bld.y && proj.pos.y <= bld.y + bld.h) {
        hitBuilding = true;
        break;
      }
    }
    if (hitBuilding) {
      spawnHitParticles(state, proj.pos, 0x888888, 3);
      state.projectiles.splice(i, 1);
      continue;
    }

    // Check collision with NPCs (player-owned projectiles only)
    if (proj.ownedByPlayer) {
      let hitNpc = false;
      for (const [npcId, npc] of state.npcs) {
        if (npc.dead) continue;
        const dx = npc.pos.x - proj.pos.x;
        const dy = npc.pos.y - proj.pos.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 12) {
          dealDamageToNPC(state, npcId, proj.damage);
          spawnHitParticles(state, proj.pos, 0xffff88, 5);
          hitNpc = true;
          break;
        }
      }
      if (hitNpc) {
        state.projectiles.splice(i, 1);
        continue;
      }
    }
  }
}

// ─── Equipment Stat Computation ──────────────────────────────────────────────

export interface GTAEquipmentBonuses {
  damageBonus: number;
  defenseBonus: number;
  speedMult: number;
  staminaRegenBonus: number;
}

/** Compute total stat bonuses from all equipped items. */
export function computeEquipmentBonuses(state: MedievalGTAState): GTAEquipmentBonuses {
  const equip = state.player.equipment;
  const result: GTAEquipmentBonuses = {
    damageBonus: 0,
    defenseBonus: 0,
    speedMult: 1.0,
    staminaRegenBonus: 0,
  };

  const slots: (keyof typeof equip)[] = ['weapon', 'armor', 'helmet', 'shield', 'boots', 'ring'];
  for (const slot of slots) {
    const itemId = equip[slot];
    if (!itemId) continue;
    const def = getEquipmentById(itemId);
    if (!def) continue;
    result.damageBonus += def.damage;
    result.defenseBonus += def.defense;
    result.speedMult *= def.speedMult;
    result.staminaRegenBonus += def.staminaRegen;
  }

  return result;
}

/** Apply equipment bonuses to player stats each frame. */
function applyEquipmentBonuses(state: MedievalGTAState): void {
  const bonuses = computeEquipmentBonuses(state);

  // Stamina regen is recalculated each frame
  state.player.runStaminaRegen = GTAConfig.STAMINA_REGEN + bonuses.staminaRegenBonus;
}

// ─── Skill System ────────────────────────────────────────────────────────────

export interface GTASkillBonuses {
  meleeDamageMult: number;
  attackSpeedMult: number;
  sprintDamageMult: number;
  blockReduction: number;
  pickpocketChance: number;
  detectionMult: number;
  sneakSpeedMult: number;
  backstabMult: number;
  priceReduction: number;
  bribeChance: number;
  intimidateChance: number;
  repGainBonus: number;
  maxHpBonus: number;
  staminaRegenBonus: number;
  secondWindChance: number;
  potionHealMult: number;
}

/** Compute total skill bonuses from allocated skill points. */
export function computeSkillBonuses(state: MedievalGTAState): GTASkillBonuses {
  const result: GTASkillBonuses = {
    meleeDamageMult: 0,
    attackSpeedMult: 0,
    sprintDamageMult: 0,
    blockReduction: 0,
    pickpocketChance: 0,
    detectionMult: 0,
    sneakSpeedMult: 0,
    backstabMult: 0,
    priceReduction: 0,
    bribeChance: 0,
    intimidateChance: 0,
    repGainBonus: 0,
    maxHpBonus: 0,
    staminaRegenBonus: 0,
    secondWindChance: 0,
    potionHealMult: 0,
  };

  const skills = state.player.skills;
  for (const skillDef of SKILL_DEFS) {
    const rank = skills[skillDef.id] ?? 0;
    if (rank <= 0) continue;
    for (const eff of skillDef.effectPerRank) {
      if (eff.stat in result) {
        (result as unknown as Record<string, number>)[eff.stat] += eff.value * rank;
      }
    }
  }

  return result;
}

/** Apply skill bonuses to player stats each frame. */
function applySkillBonuses(state: MedievalGTAState): void {
  const bonuses = computeSkillBonuses(state);
  const p = state.player;

  // Max HP from toughness skill
  p.maxHp = GTAConfig.PLAYER_MAX_HP + bonuses.maxHpBonus;

  // Stamina regen also includes skill bonuses
  p.runStaminaRegen += bonuses.staminaRegenBonus;
}

/**
 * Attempt to allocate a skill point. Returns true on success.
 */
export function allocateSkillPoint(
  state: MedievalGTAState,
  skillId: string,
): boolean {
  const p = state.player;
  if (p.skillPoints <= 0) return false;

  const skillDef = SKILL_DEFS.find(s => s.id === skillId);
  if (!skillDef) return false;

  const currentRank = p.skills[skillId] ?? 0;
  if (currentRank >= skillDef.maxRank) return false;

  // Check branch prerequisites
  let branchPoints = 0;
  for (const s of SKILL_DEFS) {
    if (s.branch === skillDef.branch) {
      branchPoints += p.skills[s.id] ?? 0;
    }
  }
  if (branchPoints < skillDef.branchPointsRequired) return false;

  // Allocate
  p.skills[skillId] = currentRank + 1;
  p.skillPoints -= 1;

  return true;
}

// ─── XP & Leveling ───────────────────────────────────────────────────────────

/** Calculate XP required for the next level. */
export function xpForLevel(level: number): number {
  return Math.floor(GTAConfig.XP_PER_LEVEL_BASE * Math.pow(GTAConfig.XP_LEVEL_SCALE, level - 1));
}

/** Award XP to the player. Handles leveling up. */
export function awardXP(state: MedievalGTAState, amount: number): void {
  const p = state.player;
  if (p.level >= GTAConfig.MAX_LEVEL) return;

  p.xp += amount;

  // Check for level up
  while (p.level < GTAConfig.MAX_LEVEL) {
    const needed = xpForLevel(p.level);
    if (p.xp < needed) break;

    p.xp -= needed;
    p.level += 1;
    p.skillPoints += GTAConfig.SKILL_POINTS_PER_LEVEL;

    state.notifications.push({
      id: `notif_${state.nextId++}`,
      text: `LEVEL UP! You are now level ${p.level}!`,
      timer: 4.0,
      color: 0xffdd00,
    });
  }
}

// ─── Reputation Effects ──────────────────────────────────────────────────────

/** Apply reputation effects for an action (e.g., 'kill_guard', 'steal_merchant'). */
export function applyReputationEffects(
  state: MedievalGTAState,
  actionId: string,
): void {
  const effects = REPUTATION_EFFECTS[actionId];
  if (!effects) return;

  // Get rep gain bonus from skills
  const skillBonuses = computeSkillBonuses(state);

  for (const eff of effects) {
    let amount = eff.amount;
    // Apply silver tongue bonus to positive rep gains
    if (amount > 0) {
      amount += skillBonuses.repGainBonus;
    }
    const current = state.player.reputation[eff.faction] ?? 0;
    state.player.reputation[eff.faction] = Math.max(-100, Math.min(100, current + amount));
  }
}

// ─── Main combat update ─────────────────────────────────────────────────────

/**
 * Call once per frame. Resolves player attacks against NPCs,
 * updates particles (gravity/life), and ticks notification timers.
 */
export function updateCombat(state: MedievalGTAState, dt: number): void {
  if (!state.paused && !state.gameOver) {
    // Apply equipment and skill bonuses every frame
    applyEquipmentBonuses(state);
    applySkillBonuses(state);

    resolvePlayerAttacks(state, dt);
    updateProjectiles(state, dt);
  }
  updateParticles(state, dt);
  tickNotifications(state, dt);
}

/** @deprecated Use updateCombat instead. Kept for backward compatibility. */
export function updateCombatFrame(state: MedievalGTAState, dt: number): void {
  updateCombat(state, dt);
}
