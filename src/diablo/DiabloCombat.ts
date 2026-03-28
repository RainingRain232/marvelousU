// ──────────────────────────────────────────────────────────────
//  DiabloCombat.ts — Extracted combat & skill system
// ──────────────────────────────────────────────────────────────

import {
  DiabloState, DiabloEnemy, DiabloProjectile, DiabloAOE,
  DiabloClass, DiabloEquipment,
  SkillId, EnemyState, EnemyType, StatusEffect, DamageType,
  DiabloItem, PotionType,
  TalentEffectType,
  ParticleType, Weather,
  MapModifier, GreaterRiftState,
  RuneType, SkillRuneEffect,
  LegendaryEffectDef,
  ItemRarity,
} from "./DiabloTypes";
import {
  SKILL_DEFS, MAP_CONFIGS, SKILL_BRANCHES, SKILL_RUNES,
  LEGENDARY_EFFECTS, GREATER_RIFT_CONFIG,
} from "./DiabloConfig";

// ──────────────────────────────────────────────────────────────
//  CombatContext — everything the combat system needs from the game
// ──────────────────────────────────────────────────────────────

export interface CombatContext {
  state: DiabloState;

  // Utility
  addFloatingText: (x: number, y: number, z: number, text: string, color: string) => void;
  genId: () => string;
  dist: (x1: number, z1: number, x2: number, z2: number) => number;
  playSound: (type: string) => void;
  recalculatePlayerStats: () => void;

  // Renderer bridge
  renderer: {
    shakeCamera: (intensity: number, duration: number) => void;
    spawnParticles: (type: ParticleType, x: number, y: number, z: number, count: number, particles: any[]) => void;
    flashEnemy: (id: string) => void;
    showSwingArc: (x: number, y: number, z: number, angle: number, color: number) => void;
    showSkillFlash: (color: string) => void;
    showCastOverlay: (damageType: DamageType, duration: number) => void;
    destroyNearbyProps: (x: number, z: number, radius: number) => void;
    spawnImpactEffect: (x: number, y: number, z: number, damageType: string, isBig?: boolean) => void;
  };

  // Callbacks into DiabloGame
  incrementAchievement: (id: string, amount?: number) => void;
  updateAchievement: (id: string, progress: number) => void;
  killEnemy: (enemy: DiabloEnemy) => void;
  triggerDeath: () => void;
  getMouseWorldPos: () => { x: number; z: number };
  getWeaponDamage: () => number;
  getTalentBonuses: () => Partial<Record<TalentEffectType, number>>;
  getLifeSteal: () => number;
  spawnHitParticles: (enemy: DiabloEnemy, damageType: DamageType) => void;
  rollLoot: (enemy: DiabloEnemy) => DiabloItem[];
  pickRandomItemOfRarity: (rarity: ItemRarity) => DiabloItem | null;
  grantPetXp: (amount: number) => void;
  rollPetDrop: (isBoss: boolean) => void;
  rollMaterialDrop: (enemy: DiabloEnemy) => void;
  onRiftGuardianKill: () => void;
  onRiftEnemyKill: () => void;
  updateDailyProgress: (type: string, amount?: number) => void;
  updateQuestProgress: (type: any, context: any) => void;

  // Network
  network: { isConnected: boolean; sendEnemyDamage: (id: string, dmg: number) => void };

  // Mutable game fields (passed by reference via object)
  mutableState: {
    mouseDown: boolean;
    targetEnemyId: string | null;
    combatLog: { time: number; damage: number }[];
    hitFreezeTimer: number;
    comboCount: number;
    comboTimer: number;
    comboMultiplier: number;
    slowMotionTimer: number;
    slowMotionScale: number;
    goldEarnedTotal: number;
    totalKills: number;
    queuedSkillIdx: number;
    skillMasteryXp: Map<SkillId, number>;
    equipDirty: boolean;
    cachedLegendaryEffects: LegendaryEffectDef[];
  };
}

// ──────────────────────────────────────────────────────────────
//  damageTypeColor
// ──────────────────────────────────────────────────────────────
export function damageTypeColor(type: DamageType): string {
  switch (type) {
    case DamageType.FIRE: return '#ff6622';
    case DamageType.ICE: return '#44ddff';
    case DamageType.LIGHTNING: return '#ffff44';
    case DamageType.POISON: return '#44ff44';
    case DamageType.ARCANE: return '#cc44ff';
    case DamageType.SHADOW: return '#aa66cc';
    case DamageType.HOLY: return '#ffffaa';
    default: return '#ffff44'; // physical = yellow
  }
}

// ──────────────────────────────────────────────────────────────
//  damageTypeToParticle
// ──────────────────────────────────────────────────────────────
export function damageTypeToParticle(dmgType: DamageType): ParticleType {
  switch (dmgType) {
    case DamageType.FIRE: return ParticleType.FIRE;
    case DamageType.ICE: return ParticleType.ICE;
    case DamageType.LIGHTNING: return ParticleType.LIGHTNING;
    case DamageType.POISON: return ParticleType.POISON;
    case DamageType.ARCANE: return ParticleType.SPARK;
    case DamageType.SHADOW: return ParticleType.DUST;
    case DamageType.HOLY: return ParticleType.HEAL;
    default: return ParticleType.BLOOD;
  }
}

// ──────────────────────────────────────────────────────────────
//  getSkillDamage
// ──────────────────────────────────────────────────────────────
export function getSkillDamage(ctx: CombatContext, def: any): number {
  const p = ctx.state.player;
  let base = 0;
  const weaponBonus = ctx.getWeaponDamage();
  switch (p.class) {
    case DiabloClass.WARRIOR:
      base = p.strength * 1.5 + weaponBonus;
      break;
    case DiabloClass.MAGE:
      base = p.intelligence * 1.2 + weaponBonus;
      break;
    case DiabloClass.RANGER:
      base = p.dexterity * 1.3 + weaponBonus;
      break;
    case DiabloClass.PALADIN:
      base = p.strength * 1.3 + p.vitality * 0.5 + weaponBonus;
      break;
    case DiabloClass.NECROMANCER:
      base = p.intelligence * 1.1 + p.vitality * 0.4 + weaponBonus;
      break;
    case DiabloClass.ASSASSIN:
      base = p.dexterity * 1.4 + p.strength * 0.3 + weaponBonus;
      break;
  }
  const hasBattleCry = p.statusEffects.some((e) => e.source === "BATTLE_CRY");
  if (hasBattleCry) base *= 1.3;

  // Apply equipped bonus damage
  let bonusDmg = 0;
  const equipKeys: (keyof DiabloEquipment)[] = [
    "helmet", "body", "gauntlets", "legs", "feet", "accessory1", "accessory2", "weapon", "lantern",
  ];
  for (const key of equipKeys) {
    const item = p.equipment[key];
    if (item) {
      const stats = item.stats as any;
      if (stats.bonusDamage) bonusDmg += stats.bonusDamage;
    }
  }

  let total = (base + bonusDmg) * (def.damageMultiplier || 1);

  const talentBonusesSkill = ctx.getTalentBonuses();
  if (talentBonusesSkill[TalentEffectType.BONUS_DAMAGE_PERCENT]) {
    total *= (1 + talentBonusesSkill[TalentEffectType.BONUS_DAMAGE_PERCENT]! / 100);
  }

  // Strength potion buff
  for (const buff of p.activePotionBuffs) {
    if (buff.type === PotionType.STRENGTH) {
      total *= (1 + buff.value / 100);
    }
  }

  return total;
}

// ──────────────────────────────────────────────────────────────
//  getEquippedLegendaryEffects
// ──────────────────────────────────────────────────────────────
export function getEquippedLegendaryEffects(ctx: CombatContext): LegendaryEffectDef[] {
  if (!ctx.mutableState.equipDirty) return ctx.mutableState.cachedLegendaryEffects;
  const effects: LegendaryEffectDef[] = [];
  const equipment = ctx.state.player.equipment;
  const slots = ['helmet', 'body', 'gauntlets', 'legs', 'feet', 'accessory1', 'accessory2', 'weapon', 'lantern'] as const;
  for (const slot of slots) {
    const item = equipment[slot];
    if (item && item.legendaryAbility && LEGENDARY_EFFECTS[item.legendaryAbility]) {
      effects.push(LEGENDARY_EFFECTS[item.legendaryAbility]);
    }
  }
  ctx.mutableState.cachedLegendaryEffects = effects;
  ctx.mutableState.equipDirty = false;
  return effects;
}

// ──────────────────────────────────────────────────────────────
//  getPassiveLegendaryBonusDamage
// ──────────────────────────────────────────────────────────────
export function getPassiveLegendaryBonusDamage(ctx: CombatContext): number {
  const effects = getEquippedLegendaryEffects(ctx);
  const p = ctx.state.player;
  let bonus = 0;
  for (const eff of effects) {
    if (eff.triggerType === 'passive' && eff.effect.bonusDamagePercent) {
      // Berserker's Wrath: bonus when below 30% HP
      if (eff.id === 'bonus_damage_low_hp' && p.hp / p.maxHp <= 0.3) {
        bonus += eff.effect.bonusDamagePercent;
      }
    }
  }
  return bonus;
}

// ──────────────────────────────────────────────────────────────
//  checkElementalReaction
// ──────────────────────────────────────────────────────────────
export function checkElementalReaction(ctx: CombatContext, enemy: DiabloEnemy, newEffect: StatusEffect): void {
  const effects = enemy.statusEffects;

  const has = (e: StatusEffect) => effects.some(s => s.effect === e);

  let reaction: { name: string; damage: number; radius: number; color: string } | null = null;

  // Steam Cloud: Fire + Ice
  if ((newEffect === StatusEffect.BURNING && has(StatusEffect.FROZEN)) ||
      (newEffect === StatusEffect.FROZEN && has(StatusEffect.BURNING))) {
    reaction = { name: 'STEAM CLOUD!', damage: enemy.maxHp * 0.15, radius: 4, color: '#aaddff' };
  }
  // Toxic Explosion: Poison + Fire
  else if ((newEffect === StatusEffect.POISONED && has(StatusEffect.BURNING)) ||
           (newEffect === StatusEffect.BURNING && has(StatusEffect.POISONED))) {
    reaction = { name: 'TOXIC EXPLOSION!', damage: enemy.maxHp * 0.20, radius: 5, color: '#88ff00' };
  }
  // Shatter: Physical hit + Frozen (we check STUNNED as proxy for physical impact)
  else if (newEffect === StatusEffect.STUNNED && has(StatusEffect.FROZEN)) {
    reaction = { name: 'SHATTER!', damage: enemy.maxHp * 0.25, radius: 3, color: '#88ccff' };
  }
  // Overload: Lightning + Fire
  else if ((newEffect === StatusEffect.SHOCKED && has(StatusEffect.BURNING)) ||
           (newEffect === StatusEffect.BURNING && has(StatusEffect.SHOCKED))) {
    reaction = { name: 'OVERLOAD!', damage: enemy.maxHp * 0.18, radius: 5, color: '#ffaa00' };
  }
  // Chain Burst: Lightning + Ice
  else if ((newEffect === StatusEffect.SHOCKED && has(StatusEffect.FROZEN)) ||
           (newEffect === StatusEffect.FROZEN && has(StatusEffect.SHOCKED))) {
    reaction = { name: 'CHAIN BURST!', damage: enemy.maxHp * 0.15, radius: 6, color: '#44ddff' };
  }
  // Frostbite: Ice + Poison
  else if ((newEffect === StatusEffect.FROZEN && has(StatusEffect.POISONED)) ||
           (newEffect === StatusEffect.POISONED && has(StatusEffect.FROZEN))) {
    reaction = { name: 'FROSTBITE!', damage: enemy.maxHp * 0.12, radius: 3, color: '#44ff88' };
  }

  if (reaction) {
    // Apply AoE damage to all enemies in radius
    ctx.addFloatingText(enemy.x, enemy.y + 3, enemy.z, reaction.name, reaction.color);

    for (const target of ctx.state.enemies) {
      if (target.state === EnemyState.DYING || target.state === EnemyState.DEAD) continue;
      const dist = Math.sqrt((target.x - enemy.x) ** 2 + (target.z - enemy.z) ** 2);
      if (dist <= reaction.radius) {
        target.hp -= reaction.damage;
        ctx.addFloatingText(target.x, target.y + 2, target.z, `${Math.round(reaction.damage)}`, reaction.color);
        if (target.hp <= 0) ctx.killEnemy(target);
      }
    }

    // Clear the consumed status effects
    enemy.statusEffects = enemy.statusEffects.filter(e =>
      e.effect !== StatusEffect.BURNING && e.effect !== StatusEffect.FROZEN &&
      e.effect !== StatusEffect.SHOCKED && e.effect !== StatusEffect.POISONED
    );

    // Screen shake for big reactions
    ctx.renderer.shakeCamera(0.2, 0.3);
    ctx.playSound('crit');

    ctx.incrementAchievement('crit_master');
    // Spawn reaction particles
    const particleType = ParticleType.SPARK;
    ctx.renderer.spawnParticles(particleType, enemy.x, enemy.y + 1, enemy.z, 15, ctx.state.particles);
  }
}

// ──────────────────────────────────────────────────────────────
//  triggerLegendaryEffects
// ──────────────────────────────────────────────────────────────
export function triggerLegendaryEffects(
  ctx: CombatContext,
  trigger: 'on_hit' | 'on_kill' | 'on_skill' | 'on_crit' | 'on_take_damage',
  context: {
    targetX?: number; targetZ?: number; damage?: number; enemyMaxHp?: number; skillId?: SkillId;
    enemyStatusEffects?: { effect: StatusEffect; duration: number; source: string }[];
  }
): void {
  const effects = getEquippedLegendaryEffects(ctx);
  const p = ctx.state.player;

  for (const legendaryEffect of effects) {
    if (legendaryEffect.triggerType !== trigger) continue;
    if (Math.random() > legendaryEffect.procChance) continue;

    const eff = legendaryEffect.effect;
    const tx = context.targetX ?? p.x;
    const tz = context.targetZ ?? p.z;

    // Healing effects
    if (eff.healPercent && context.damage) {
      const heal = context.damage * eff.healPercent / 100;
      p.hp = Math.min(p.maxHp, p.hp + heal);
      ctx.addFloatingText(p.x, p.y + 2, p.z, `+${Math.round(heal)} HP`, '#44ff44');
    }

    // Mana restore
    if (eff.manaRestorePercent) {
      const restore = p.maxMana * eff.manaRestorePercent / 100;
      p.mana = Math.min(p.maxMana, p.mana + restore);
      ctx.addFloatingText(p.x, p.y + 2.5, p.z, `+${Math.round(restore)} MP`, '#4488ff');
    }

    // AoE damage
    if (eff.aoeRadius && eff.damageMultiplier) {
      const baseDmg = (context.damage || p.strength * 1.5) * eff.damageMultiplier;

      // Deal damage to enemies in range
      for (const enemy of ctx.state.enemies) {
        if (enemy.state === EnemyState.DYING || enemy.state === EnemyState.DEAD) continue;
        const dist = Math.sqrt((enemy.x - tx) ** 2 + (enemy.z - tz) ** 2);
        if (dist <= eff.aoeRadius) {
          enemy.hp -= baseDmg;
          ctx.addFloatingText(enemy.x, enemy.y + 2, enemy.z, `${Math.round(baseDmg)}`, '#ff8800');
          if (eff.statusEffect) {
            if (!enemy.statusEffects.some(e => e.effect === eff.statusEffect)) {
              enemy.statusEffects.push({ effect: eff.statusEffect!, duration: 3, source: legendaryEffect.id });
              checkElementalReaction(ctx, enemy, eff.statusEffect!);
            }
          }
        }
      }
    }

    // Shield
    if (eff.shieldAmount) {
      p.invulnTimer = Math.max(p.invulnTimer, 5);
      ctx.addFloatingText(p.x, p.y + 3, p.z, `SHIELD!`, '#ffd700');
    }

    // Speed boost
    if (eff.speedBoost && eff.speedBoostDuration) {
      if (!p.activePotionBuffs.some(b => b.type === PotionType.SPEED && (b as any).source === legendaryEffect.id)) {
        p.activePotionBuffs.push({ type: PotionType.SPEED, value: 50, remaining: eff.speedBoostDuration, source: legendaryEffect.id } as any);
        ctx.addFloatingText(p.x, p.y + 2, p.z, 'SPEED BOOST!', '#44ffff');
      }
    }

    // Cooldown reduction
    if (eff.cooldownReduction) {
      for (const [skillId, cd] of p.skillCooldowns) {
        if (cd > 0) {
          p.skillCooldowns.set(skillId, Math.max(0, cd - eff.cooldownReduction));
        }
      }
    }

    // Double strike (on_hit with damageMultiplier and no aoe)
    if (trigger === 'on_hit' && eff.damageMultiplier && !eff.aoeRadius && context.damage) {
      // Deal extra hit
      const extraDmg = context.damage * eff.damageMultiplier;
      // Find nearest enemy to target position
      let nearest: DiabloEnemy | null = null;
      let nearestDist = 5;
      for (const enemy of ctx.state.enemies) {
        if (enemy.state === EnemyState.DYING || enemy.state === EnemyState.DEAD) continue;
        const d = Math.sqrt((enemy.x - tx) ** 2 + (enemy.z - tz) ** 2);
        if (d < nearestDist) { nearestDist = d; nearest = enemy; }
      }
      if (nearest) {
        nearest.hp -= extraDmg;
        ctx.addFloatingText(nearest.x, nearest.y + 2.5, nearest.z, `ECHO ${Math.round(extraDmg)}`, '#ffaa00');
      }
    }
  }
}

// ──────────────────────────────────────────────────────────────
//  getSkillBranchModifiers
// ──────────────────────────────────────────────────────────────
export function getSkillBranchModifiers(ctx: CombatContext, skillId: SkillId): {
  damageMult: number; cooldownMult: number; manaCostMult: number;
  aoeRadiusMult: number; extraProjectiles: number;
  statusOverride: string | null; bonusEffects: Set<string>;
} {
  const result = {
    damageMult: 1, cooldownMult: 1, manaCostMult: 1,
    aoeRadiusMult: 1, extraProjectiles: 0,
    statusOverride: null as string | null, bonusEffects: new Set<string>(),
  };
  const branches = ctx.state.player.skillBranches;
  for (const bd of SKILL_BRANCHES) {
    if (bd.skillId !== skillId) continue;
    const key = `${skillId}_b${bd.tier}`;
    const choice = branches[key];
    if (!choice) continue;
    const opt = choice === 1 ? bd.optionA : bd.optionB;
    if (opt.damageMult) result.damageMult *= opt.damageMult;
    if (opt.cooldownMult) result.cooldownMult *= opt.cooldownMult;
    if (opt.manaCostMult) result.manaCostMult *= opt.manaCostMult;
    if (opt.aoeRadiusMult) result.aoeRadiusMult *= opt.aoeRadiusMult;
    if (opt.extraProjectiles) result.extraProjectiles += opt.extraProjectiles;
    if (opt.statusOverride) result.statusOverride = opt.statusOverride;
    if (opt.bonusEffect) result.bonusEffects.add(opt.bonusEffect);
  }
  return result;
}

// ──────────────────────────────────────────────────────────────
//  createProjectile
// ──────────────────────────────────────────────────────────────
export function createProjectile(
  ctx: CombatContext,
  x: number, y: number, z: number,
  angle: number, damage: number,
  def: any, skillId: SkillId
): void {
  const speed = 20;
  const proj: DiabloProjectile = {
    id: ctx.genId(),
    x, y, z,
    vx: Math.sin(angle) * speed,
    vy: 0,
    vz: Math.cos(angle) * speed,
    speed,
    damage,
    damageType: def.damageType,
    radius: 0.3,
    ownerId: "player",
    isPlayerOwned: true,
    lifetime: 0,
    maxLifetime: 3.0,
    skillId,
  };
  ctx.state.projectiles.push(proj);
}

// ──────────────────────────────────────────────────────────────
//  chainLightningBounce
// ──────────────────────────────────────────────────────────────
export function chainLightningBounce(ctx: CombatContext, fromEnemy: DiabloEnemy, damage: number, bouncesLeft: number): void {
  if (bouncesLeft <= 0) return;

  let nearest: DiabloEnemy | null = null;
  let nearestDist = 10;
  for (const enemy of ctx.state.enemies) {
    if (enemy.id === fromEnemy.id) continue;
    if (enemy.state === EnemyState.DYING || enemy.state === EnemyState.DEAD) continue;
    const d = ctx.dist(fromEnemy.x, fromEnemy.z, enemy.x, enemy.z);
    if (d < nearestDist) {
      nearestDist = d;
      nearest = enemy;
    }
  }

  if (nearest) {
    const finalDmg = Math.max(1, damage - nearest.armor * 0.1);
    nearest.hp -= finalDmg;
    ctx.addFloatingText(nearest.x, nearest.y + 2, nearest.z, `${Math.round(finalDmg)}`, "#8888ff");

    if (nearest.hp <= 0) {
      ctx.killEnemy(nearest);
    }

    // Apply shocked
    nearest.statusEffects.push({
      effect: StatusEffect.SHOCKED,
      duration: 2,
      source: "chain_lightning",
    });
    checkElementalReaction(ctx, nearest, StatusEffect.SHOCKED);

    chainLightningBounce(ctx, nearest, damage * 0.7, bouncesLeft - 1);
  }
}

// ──────────────────────────────────────────────────────────────
//  doDodgeRoll
// ──────────────────────────────────────────────────────────────
export function doDodgeRoll(ctx: CombatContext): void {
  const p = ctx.state.player;
  if (p.invulnTimer > 0) return;
  const worldMouse = ctx.getMouseWorldPos();
  const angle = Math.atan2(worldMouse.x - p.x, worldMouse.z - p.z);
  p.x += Math.sin(angle) * 4;
  p.z += Math.cos(angle) * 4;
  p.invulnTimer = 0.4;

  // Clamp to map bounds
  const mapCfg = MAP_CONFIGS[ctx.state.currentMap];
  const halfW = mapCfg.width / 2;
  const halfD = ((mapCfg as any).depth || (mapCfg as any).height || mapCfg.width) / 2;
  p.x = Math.max(-halfW, Math.min(halfW, p.x));
  p.z = Math.max(-halfD, Math.min(halfD, p.z));
}

// ──────────────────────────────────────────────────────────────
//  tickAOEDamage
// ──────────────────────────────────────────────────────────────
export function tickAOEDamage(ctx: CombatContext, aoe: DiabloAOE): void {
  if (aoe.ownerId === "player") {
    // Only destroy props on the first tick (timer near 0) to avoid repeated expensive calls
    if (aoe.timer < 0.05) {
      ctx.renderer.destroyNearbyProps(aoe.x, aoe.z, aoe.radius);
    }
    for (const enemy of ctx.state.enemies) {
      if (enemy.state === EnemyState.DYING || enemy.state === EnemyState.DEAD) continue;
      const dist = ctx.dist(aoe.x, aoe.z, enemy.x, enemy.z);
      if (dist <= aoe.radius) {
        const finalDmg = Math.max(1, aoe.damage - enemy.armor * 0.15);
        enemy.hp -= finalDmg;
        ctx.addFloatingText(enemy.x, enemy.y + 2, enemy.z, `${Math.round(finalDmg)}`, damageTypeColor(aoe.damageType));

        ctx.spawnHitParticles(enemy, aoe.damageType);
        ctx.renderer.flashEnemy(enemy.id);
        ctx.renderer.spawnImpactEffect(enemy.x, enemy.y + 0.5, enemy.z, aoe.damageType, true);
        // AOE hit knockback — push enemy away from impact center
        const aoHkAngle = Math.atan2(enemy.z - aoe.z, enemy.x - aoe.x);
        const aoHkDist = 0.5;
        enemy.x += Math.cos(aoHkAngle) * aoHkDist;
        enemy.z += Math.sin(aoHkAngle) * aoHkDist;
        // Spawn extra AoE impact particles (limited to avoid particle explosion)
        if (ctx.state.particles.length < 200) {
          switch (aoe.damageType) {
            case DamageType.FIRE:
              ctx.renderer.spawnParticles(ParticleType.FIRE, enemy.x, enemy.y + 0.5, enemy.z, 2, ctx.state.particles);
              break;
            case DamageType.ICE:
              ctx.renderer.spawnParticles(ParticleType.ICE, enemy.x, enemy.y + 0.5, enemy.z, 2, ctx.state.particles);
              break;
            case DamageType.LIGHTNING:
              ctx.renderer.spawnParticles(ParticleType.LIGHTNING, enemy.x, enemy.y + 0.5, enemy.z, 2, ctx.state.particles);
              break;
            case DamageType.POISON:
              ctx.renderer.spawnParticles(ParticleType.POISON, enemy.x, enemy.y + 0.3, enemy.z, 2, ctx.state.particles);
              break;
          }
        }

        if (aoe.statusEffect) {
          const existing = enemy.statusEffects.find((e) => e.effect === aoe.statusEffect);
          if (existing) {
            existing.duration = Math.max(existing.duration, 3);
          } else {
            enemy.statusEffects.push({
              effect: aoe.statusEffect,
              duration: 3,
              source: "aoe",
            });
            checkElementalReaction(ctx, enemy, aoe.statusEffect!);
          }
        }

        if (enemy.hp <= 0) {
          ctx.killEnemy(enemy);
        // Death knockback from AOE center
        const aoKbAngle = Math.atan2(enemy.z - aoe.z, enemy.x - aoe.x);
        const aoKbDist = 1.5 + Math.random() * 1.5;
        enemy.x += Math.cos(aoKbAngle) * aoKbDist;
        enemy.z += Math.sin(aoKbAngle) * aoKbDist;
        }
      }
    }
  } else {
    const pp = ctx.state.player;
    if (pp.invulnTimer <= 0) {
      const dist = ctx.dist(aoe.x, aoe.z, pp.x, pp.z);
      if (dist <= aoe.radius) {
        const mitigated = Math.max(1, aoe.damage - pp.armor * 0.3);
        pp.hp -= mitigated;
        ctx.addFloatingText(pp.x, pp.y + 2, pp.z, `-${Math.round(mitigated)}`, "#ff4444");
        if (pp.hp <= 0) { pp.hp = 0; ctx.triggerDeath(); }
      }
    }
  }
}

// ──────────────────────────────────────────────────────────────
//  updateAOE
// ──────────────────────────────────────────────────────────────
export function updateAOE(ctx: CombatContext, dt: number): void {
  const toRemove = new Set<string>();

  for (const aoe of ctx.state.aoeEffects) {
    aoe.timer += dt;
    aoe.lastTickTimer += dt;

    if (aoe.lastTickTimer >= aoe.tickInterval) {
      tickAOEDamage(ctx, aoe);
      aoe.lastTickTimer = 0;
    }

    // Explosive trap proximity trigger
    if (aoe.tickInterval >= 10) {
      for (const enemy of ctx.state.enemies) {
        if (enemy.state === EnemyState.DYING || enemy.state === EnemyState.DEAD) continue;
        const dist = ctx.dist(aoe.x, aoe.z, enemy.x, enemy.z);
        if (dist < aoe.radius) {
          tickAOEDamage(ctx, aoe);
          aoe.timer = aoe.duration; // Force removal
          break;
        }
      }
    }

    if (aoe.timer >= aoe.duration) {
      toRemove.add(aoe.id);
    }
  }

  ctx.state.aoeEffects = ctx.state.aoeEffects.filter((a) => !toRemove.has(a.id));
}

// ──────────────────────────────────────────────────────────────
//  updateProjectiles
// ──────────────────────────────────────────────────────────────
export function updateProjectiles(ctx: CombatContext, dt: number): void {
  const toRemove = new Set<string>();

  for (const proj of ctx.state.projectiles) {
    proj.x += proj.vx * dt;
    proj.y += proj.vy * dt;
    proj.z += proj.vz * dt;
    proj.lifetime += dt;

    if (proj.lifetime > proj.maxLifetime) {
      toRemove.add(proj.id);
      continue;
    }

    // Bounds check
    const mapCfg = MAP_CONFIGS[ctx.state.currentMap];
    const halfW = mapCfg.width / 2 + 10;
    if (Math.abs(proj.x) > halfW || Math.abs(proj.z) > halfW) {
      toRemove.add(proj.id);
      continue;
    }

    if (proj.isPlayerOwned) {
      let hitCount = 0;
      for (const enemy of ctx.state.enemies) {
        if (enemy.state === EnemyState.DYING || enemy.state === EnemyState.DEAD) continue;
        const dist = ctx.dist(proj.x, proj.z, enemy.x, enemy.z);
        if (dist < proj.radius + 0.5) {
          // Hit
          let finalDmg = Math.max(1, proj.damage - enemy.armor * 0.15);
          if (enemy.shieldActive) finalDmg *= 0.2;
          if (enemy.bossShieldTimer && enemy.bossShieldTimer > 0) finalDmg *= 0.1;
          enemy.hp -= finalDmg;
          ctx.addFloatingText(enemy.x, enemy.y + 2, enemy.z, `${Math.round(finalDmg)}`, "#ffff44");

          ctx.spawnHitParticles(enemy, proj.damageType);
          ctx.renderer.flashEnemy(enemy.id);
          ctx.renderer.spawnImpactEffect(enemy.x, enemy.y + 0.5, enemy.z, proj.damageType, false);
          // Projectile hit knockback
          const projAngle = Math.atan2(proj.vz, proj.vx);
          const projKb = 0.4;
          enemy.x += Math.cos(projAngle) * projKb;
          enemy.z += Math.sin(projAngle) * projKb;
          ctx.renderer.shakeCamera(0.12, 0.15);

          // Apply status effect if applicable
          const def = proj.skillId ? SKILL_DEFS[proj.skillId] : null;
          if (def && def.statusEffect) {
            enemy.statusEffects.push({
              effect: def.statusEffect,
              duration: 3,
              source: proj.skillId || "projectile",
            });
            checkElementalReaction(ctx, enemy, def.statusEffect);
          }

          // Chain lightning bounce
          if (proj.skillId === SkillId.CHAIN_LIGHTNING) {
            chainLightningBounce(ctx, enemy, proj.damage * 0.7, 4);
          }

          if (enemy.hp <= 0) {
            ctx.killEnemy(enemy);
          } else if (!enemy.isBoss && Math.random() < 0.2) {
            enemy.state = EnemyState.HURT;
            enemy.stateTimer = 0;
          }

          hitCount++;
          // Piercing shot can hit up to 5
          if (proj.skillId === SkillId.PIERCING_SHOT) {
            if (hitCount >= 5) {
              toRemove.add(proj.id);
              break;
            }
          } else {
            toRemove.add(proj.id);
            break;
          }
        }
      }
    } else {
      const pp = ctx.state.player;
      if (pp.invulnTimer <= 0) {
        const dist = ctx.dist(proj.x, proj.z, pp.x, pp.z);
        if (dist < proj.radius + 0.5) {
          const mitigated = Math.max(1, proj.damage - pp.armor * 0.3);
          pp.hp -= mitigated;
          ctx.addFloatingText(pp.x, pp.y + 2, pp.z, `-${Math.round(mitigated)}`, "#ff4444");
          toRemove.add(proj.id);
          if (pp.hp <= 0) {
            pp.hp = 0;
            ctx.triggerDeath();
            break;
          }
        }
      }
    }
  }

  ctx.state.projectiles = ctx.state.projectiles.filter((p) => !toRemove.has(p.id));
}

// ──────────────────────────────────────────────────────────────
//  updateCombat
// ──────────────────────────────────────────────────────────────
export function updateCombat(ctx: CombatContext, dt: number): void {
  const ms = ctx.mutableState;
  if (!ms.targetEnemyId) return;
  const p = ctx.state.player;
  const target = ctx.state.enemies.find((e) => e.id === ms.targetEnemyId);
  if (!target || target.state === EnemyState.DYING || target.state === EnemyState.DEAD) {
    ms.targetEnemyId = null;
    return;
  }

  const dist = ctx.dist(p.x, p.z, target.x, target.z);
  const attackRange = 3.0; // base melee range

  if (dist > attackRange) {
    // Move toward target if holding mouse
    if (ms.mouseDown) {
      const dx = target.x - p.x;
      const dz = target.z - p.z;
      const len = Math.sqrt(dx * dx + dz * dz);
      if (len > 0) {
        p.x += (dx / len) * p.moveSpeed * dt;
        p.z += (dz / len) * p.moveSpeed * dt;
      }
    }
    return;
  }

  if (p.attackTimer > 0) return;

  // Calculate damage
  let baseDamage = 0;
  const weaponBonus = ctx.getWeaponDamage();
  switch (p.class) {
    case DiabloClass.WARRIOR:
      baseDamage = p.strength * 1.5 + weaponBonus;
      break;
    case DiabloClass.MAGE:
      baseDamage = p.intelligence * 1.2 + weaponBonus;
      break;
    case DiabloClass.RANGER:
      baseDamage = p.dexterity * 1.3 + weaponBonus;
      break;
    case DiabloClass.PALADIN:
      baseDamage = p.strength * 1.3 + p.vitality * 0.5 + weaponBonus;
      break;
    case DiabloClass.NECROMANCER:
      baseDamage = p.intelligence * 1.1 + p.vitality * 0.4 + weaponBonus;
      break;
    case DiabloClass.ASSASSIN:
      baseDamage = p.dexterity * 1.4 + p.strength * 0.3 + weaponBonus;
      break;
  }

  // Check for buff
  const hasBattleCry = p.statusEffects.some((e) => e.source === "BATTLE_CRY");
  if (hasBattleCry) baseDamage *= 1.3;

  // Talent damage bonus (ad1a2850)
  const talentBonuses = ctx.getTalentBonuses();
  if (talentBonuses[TalentEffectType.BONUS_DAMAGE_PERCENT]) {
    baseDamage *= (1 + talentBonuses[TalentEffectType.BONUS_DAMAGE_PERCENT]! / 100);
  }
  for (const buff of p.activePotionBuffs) {
    if (buff.type === PotionType.STRENGTH) baseDamage *= (1 + buff.value / 100);
  }

  // Legendary passive damage bonus
  const legendaryBonusPct = getPassiveLegendaryBonusDamage(ctx);
  if (legendaryBonusPct > 0) baseDamage *= (1 + legendaryBonusPct / 100);

  // Crit check
  const isCrit = Math.random() < p.critChance;
  if (isCrit) baseDamage *= p.critDamage;

  let finalDamage = Math.max(1, baseDamage - target.armor * 0.2);
  if (target.shieldActive) finalDamage *= 0.2;
  if (target.bossShieldTimer && target.bossShieldTimer > 0) finalDamage *= 0.1;

  target.hp -= finalDamage;

  if (ctx.network.isConnected) {
    ctx.network.sendEnemyDamage(target.id, finalDamage);
  }

  // Map modifier: Thorns
  if (ctx.state.activeMapModifiers.includes(MapModifier.ENEMY_THORNS)) {
    const thornsDmg = finalDamage * 0.15;
    p.hp -= thornsDmg;
    ctx.addFloatingText(p.x, p.y + 2, p.z, `${Math.round(thornsDmg)} thorns`, '#ff4488');
    if (p.hp <= 0) { p.hp = 0; ctx.triggerDeath(); return; }
  }

  ms.combatLog.push({ time: performance.now(), damage: finalDamage });

  // Floating text + sound
  if (isCrit) {
    ctx.addFloatingText(target.x, target.y + 2.5, target.z, `CRIT! ${Math.round(finalDamage)}`, "#ff4444");
    ctx.renderer.shakeCamera(0.25, 0.3);
    ms.hitFreezeTimer = 0.04; // 40ms freeze frame on crit
    ctx.playSound('crit');
    ctx.incrementAchievement('crit_master');
    ctx.renderer.spawnImpactEffect(target.x, target.y + 0.5, target.z, DamageType.PHYSICAL, true);
  } else {
    ctx.addFloatingText(target.x, target.y + 2, target.z, `${Math.round(finalDamage)}`, "#ffff44");
    ctx.playSound('hit');
    ctx.renderer.shakeCamera(0.08, 0.1); // subtle hit feedback
    ms.hitFreezeTimer = 0.02; // 20ms micro-freeze on normal hits
    ctx.renderer.spawnImpactEffect(target.x, target.y + 0.5, target.z, DamageType.PHYSICAL, false);
  }

  ctx.spawnHitParticles(target, DamageType.PHYSICAL);
  ctx.renderer.flashEnemy(target.id);

  // Hit knockback — push enemy away from player on impact
  const hkAngle = Math.atan2(target.z - p.z, target.x - p.x);
  const hkDist = isCrit ? 0.8 : 0.3;
  target.x += Math.cos(hkAngle) * hkDist;
  target.z += Math.sin(hkAngle) * hkDist;

  // Hit stagger — brief freeze on impact
  target.staggerTimer = isCrit ? 0.2 : 0.1;

  // Stat tracking: damage dealt
  p.stats.totalDamageDealt += finalDamage;
  p.stats.highestCrit = Math.max(p.stats.highestCrit, isCrit ? finalDamage : 0);
  if (isCrit) p.stats.totalCritsLanded++;

  // Trigger legendary on_hit effects
  triggerLegendaryEffects(ctx, 'on_hit', { targetX: target.x, targetZ: target.z, damage: finalDamage });
  if (isCrit) {
    triggerLegendaryEffects(ctx, 'on_crit', { targetX: target.x, targetZ: target.z, damage: finalDamage });
  }

  // Life steal
  const lifeStealPct = ctx.getLifeSteal();
  if (lifeStealPct > 0) {
    const healed = finalDamage * lifeStealPct / 100;
    p.hp = Math.min(p.maxHp, p.hp + healed);
    if (healed > 1) {
      ctx.renderer.spawnParticles(ParticleType.HEAL, p.x, p.y + 0.5, p.z, 5 + Math.floor(Math.random() * 4), ctx.state.particles);
    }
  }

  // Reset attack timer
  p.attackTimer = 1.0 / p.attackSpeed;
  p.isAttacking = true;
  const swingAngle = Math.atan2(target.x - p.x, target.z - p.z);
  ctx.renderer.showSwingArc(p.x, p.y, p.z, swingAngle, 0xffeedd);

  // Check enemy death
  if (target.hp <= 0) {
    target.hp = 0;
    // Death knockback — push enemy away from player
    const kbAngle = Math.atan2(target.z - p.z, target.x - p.x);
    const kbDist = target.isBoss ? 1.0 : 2.0 + Math.random() * 1.5;
    target.x += Math.cos(kbAngle) * kbDist;
    target.z += Math.sin(kbAngle) * kbDist;
    if (target.isBoss) {
      ms.slowMotionTimer = 1.5;
      ms.slowMotionScale = 0.3;
      ctx.renderer.shakeCamera(0.8, 1.2);
      ctx.renderer.spawnImpactEffect(target.x, target.y + 1.0, target.z, DamageType.PHYSICAL, true);
    }
    // Combo system
    ms.comboCount++;
    ms.comboTimer = 3.0; // 3 second window
    ms.comboMultiplier = 1.0 + Math.min(ms.comboCount * 0.05, 1.0); // up to 2x at 20 combo
    if (ms.comboCount >= 3) {
      ctx.addFloatingText(p.x, p.y + 3.5, p.z, `${ms.comboCount}x COMBO`, '#ffaa00');
    }
    ms.targetEnemyId = null;

    // Let killEnemy handle all rewards, loot, quest tracking, achievements, etc.
    ctx.killEnemy(target);
  } else {
    // Stagger
    if (!target.isBoss && Math.random() < 0.3) {
      target.state = EnemyState.HURT;
      target.stateTimer = 0;
    }
  }
}

// ──────────────────────────────────────────────────────────────
//  activateSkill
// ──────────────────────────────────────────────────────────────
export function activateSkill(ctx: CombatContext, idx: number): void {
  const p = ctx.state.player;
  if (idx >= p.skills.length) return;
  const skillId = p.skills[idx];
  const baseDef = SKILL_DEFS[skillId];
  if (!baseDef) return;

  // Apply active rune modifications
  let runeEffect: SkillRuneEffect | undefined;
  const activeRune = p.activeRunes[skillId];
  if (activeRune && activeRune !== RuneType.NONE) {
    const runes = SKILL_RUNES[skillId];
    runeEffect = runes?.find(r => r.runeType === activeRune);
  }
  const def: typeof baseDef = runeEffect ? {
    ...baseDef,
    damageMultiplier: baseDef.damageMultiplier + runeEffect.damageMultiplierMod,
    cooldown: Math.max(0.5, baseDef.cooldown + runeEffect.cooldownMod),
    manaCost: Math.max(0, baseDef.manaCost + runeEffect.manaCostMod),
    aoeRadius: (baseDef.aoeRadius || 0) + (runeEffect.aoeRadiusMod || 0),
    range: baseDef.range + (runeEffect.rangeMod || 0),
    damageType: runeEffect.replaceDamageType || baseDef.damageType,
    statusEffect: runeEffect.replaceStatusEffect || baseDef.statusEffect,
  } : baseDef;

  const cd = p.skillCooldowns.get(skillId) || 0;
  if (cd > 0) {
    ctx.mutableState.queuedSkillIdx = idx; // Queue this skill
    return;
  }
  const branchMods = getSkillBranchModifiers(ctx, skillId);
  // Add rune extra projectiles to branch mods
  if (runeEffect?.extraProjectiles) branchMods.extraProjectiles += runeEffect.extraProjectiles;
  if (p.mana < Math.ceil(def.manaCost * branchMods.manaCostMult)) return;

  p.mana -= Math.ceil(def.manaCost * branchMods.manaCostMult);
  ctx.playSound('skill');

  // Skill screen flash by damage type
  const flashColors: Record<string, string> = {
    [DamageType.FIRE]: 'rgba(255,100,0,0.5)',
    [DamageType.ICE]: 'rgba(100,200,255,0.5)',
    [DamageType.LIGHTNING]: 'rgba(255,255,100,0.5)',
    [DamageType.POISON]: 'rgba(100,255,100,0.5)',
    [DamageType.ARCANE]: 'rgba(180,80,255,0.5)',
    [DamageType.SHADOW]: 'rgba(120,80,180,0.5)',
    [DamageType.HOLY]: 'rgba(255,255,200,0.5)',
    [DamageType.PHYSICAL]: 'rgba(255,230,200,0.3)',
  };
  const skillFlashColor = flashColors[def.damageType] || flashColors[DamageType.PHYSICAL];
  ctx.renderer.showSkillFlash(skillFlashColor);

  const talentBonusesCd = ctx.getTalentBonuses();
  const cdReduction = talentBonusesCd[TalentEffectType.SKILL_COOLDOWN_REDUCTION] || 0;
  const effectiveCooldown = def.cooldown * branchMods.cooldownMult * (1 - cdReduction / 100);
  p.skillCooldowns.set(skillId, effectiveCooldown);
  p.activeSkillId = skillId;
  p.activeSkillAnimTimer = 0.5;

  // Mastery XP: increment and check thresholds
  {
    const prevXp = ctx.mutableState.skillMasteryXp.get(skillId) || 0;
    const newXp = prevXp + 1;
    ctx.mutableState.skillMasteryXp.set(skillId, newXp);
    const skillName = baseDef.name.toUpperCase();
    if (prevXp < 100 && newXp >= 100) {
      ctx.addFloatingText(p.x, p.y + 4, p.z, `${skillName} MASTERED!`, '#ffd700');
    } else if (prevXp < 500 && newXp >= 500) {
      ctx.addFloatingText(p.x, p.y + 4, p.z, `${skillName} LEVEL 2!`, '#ff8800');
    } else if (prevXp < 2000 && newXp >= 2000) {
      ctx.addFloatingText(p.x, p.y + 4, p.z, `${skillName} LEVEL 3!`, '#ff4400');
    }
  }

  // Aim at targeted enemy if one is selected, otherwise aim at mouse
  let aimX: number, aimZ: number;
  const targetId = ctx.mutableState.targetEnemyId;
  const targetEnemy = targetId ? ctx.state.enemies.find(e => e.id === targetId) : null;
  if (targetEnemy) {
    aimX = targetEnemy.x;
    aimZ = targetEnemy.z;
  } else {
    const worldMouse = ctx.getMouseWorldPos();
    aimX = worldMouse.x;
    aimZ = worldMouse.z;
  }
  const angle = Math.atan2(aimX - p.x, aimZ - p.z);
  // Face the aim direction
  p.angle = angle;
  const baseDmg = getSkillDamage(ctx, def);
  const modDmg = baseDmg * branchMods.damageMult;
  const modRadius = (r: number) => r * branchMods.aoeRadiusMult;
  const modStatus = branchMods.statusOverride
    ? branchMods.statusOverride as StatusEffect
    : def.statusEffect;

  switch (skillId) {
    // ── PROJECTILE SKILLS ──
    case SkillId.FIREBALL:
    case SkillId.LIGHTNING_BOLT:
    case SkillId.POISON_ARROW:
    case SkillId.PIERCING_SHOT:
    case SkillId.SMITE:
    case SkillId.BONE_SPEAR:
    case SkillId.HOLY_BOLT:
    case SkillId.SPIRIT_BARRAGE:
    case SkillId.CRIPPLING_THROW: {
      createProjectile(ctx, p.x, p.y + 1, p.z, angle, modDmg, def, skillId);
      // Branch effect: extra projectiles for projectile skills
      if (branchMods.extraProjectiles > 0) {
        for (let i = 1; i <= branchMods.extraProjectiles; i++) {
          const offsetAngle = (i % 2 === 0 ? 1 : -1) * Math.ceil(i / 2) * 0.15;
          createProjectile(ctx, p.x, p.y + 1, p.z, angle + offsetAngle, modDmg, def, skillId);
        }
      }
      // Branch effect: HEAL_ON_BURN
      if (branchMods.bonusEffects.has('HEAL_ON_BURN')) {
        p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.10));
        ctx.addFloatingText(p.x, p.y + 3, p.z, `+${Math.round(p.maxHp * 0.10)} HP`, "#44ff44");
      }
      // Branch effect: GUARANTEED_CRIT
      if (branchMods.bonusEffects.has('GUARANTEED_CRIT')) {
        // Damage already boosted via damageMult; add visual cue
        ctx.addFloatingText(p.x, p.y + 3, p.z, "CRITICAL!", "#ff4444");
      }
      break;
    }

    case SkillId.MULTI_SHOT: {
      const spread = 0.3;
      const arrowCount = 5 + branchMods.extraProjectiles;
      const half = Math.floor(arrowCount / 2);
      for (let i = -half; i <= half; i++) {
        createProjectile(ctx, p.x, p.y + 1, p.z, angle + i * spread, modDmg * 0.8, def, skillId);
      }
      break;
    }

    case SkillId.CHAIN_LIGHTNING: {
      // Fires a projectile that, on hit, chains to nearby enemies
      createProjectile(ctx, p.x, p.y + 1, p.z, angle, modDmg, def, skillId);
      break;
    }

    // ── AOE AT PLAYER ──
    case SkillId.CLEAVE:
    case SkillId.WHIRLWIND:
    case SkillId.ICE_NOVA:
    case SkillId.GROUND_SLAM:
    case SkillId.BLADE_FURY:
    case SkillId.SHIELD_BASH:
    case SkillId.HOLY_STRIKE:
    case SkillId.CONSECRATION:
    case SkillId.JUDGMENT:
    case SkillId.HOLY_NOVA:
    case SkillId.CORPSE_EXPLOSION:
    case SkillId.DEATH_NOVA:
    case SkillId.POISON_NOVA:
    case SkillId.SHADOW_STAB:
    case SkillId.FAN_OF_KNIVES:
    case SkillId.BLADE_FLURRY:
    case SkillId.VENOMOUS_STRIKE:
    case SkillId.BLADE_DANCE:
    case SkillId.BLESSED_HAMMER:
    case SkillId.LIFE_TAP: {
      const radius = modRadius(def.aoeRadius || 3);
      const aoe: DiabloAOE = {
        id: ctx.genId(),
        x: p.x,
        y: 0,
        z: p.z,
        radius,
        damage: modDmg,
        damageType: def.damageType,
        duration: 0.3,
        timer: 0,
        ownerId: "player",
        tickInterval: 0.3,
        lastTickTimer: 0,
        statusEffect: modStatus,
      };
      ctx.state.aoeEffects.push(aoe);
      // Immediate damage tick for melee AOE
      tickAOEDamage(ctx, aoe);
      // Visual burst for melee AoE skills
      const skillParticle = damageTypeToParticle(def.damageType);
      if (skillId === SkillId.WHIRLWIND) {
        ctx.renderer.shakeCamera(0.2, 0.3);
        ctx.renderer.spawnParticles(ParticleType.DUST, p.x, 0, p.z, 10, ctx.state.particles);
        ctx.renderer.spawnParticles(skillParticle, p.x, 0.5, p.z, 6, ctx.state.particles);
      } else if (skillId === SkillId.ICE_NOVA) {
        ctx.renderer.shakeCamera(0.25, 0.35);
        ctx.renderer.spawnParticles(ParticleType.ICE, p.x, 0.5, p.z, 15, ctx.state.particles);
        ctx.renderer.spawnParticles(ParticleType.ICE, p.x, 1.0, p.z, 8, ctx.state.particles);
      } else if (skillId === SkillId.GROUND_SLAM) {
        ctx.renderer.shakeCamera(0.35, 0.5);
        ctx.renderer.spawnParticles(ParticleType.DUST, p.x, 0, p.z, 15, ctx.state.particles);
        ctx.renderer.spawnParticles(skillParticle, p.x, 0.3, p.z, 8, ctx.state.particles);
      } else if (skillId === SkillId.BLADE_FURY) {
        ctx.renderer.shakeCamera(0.15, 0.25);
        ctx.renderer.spawnParticles(skillParticle, p.x, 1.0, p.z, 10, ctx.state.particles);
      } else if (skillId === SkillId.SHIELD_BASH) {
        ctx.renderer.shakeCamera(0.2, 0.2);
        ctx.renderer.spawnParticles(skillParticle, p.x, 1.0, p.z, 6, ctx.state.particles);
      }
      // Branch effect: LIFE_STEAL_AOE — heal 15% of damage dealt
      if (branchMods.bonusEffects.has('LIFE_STEAL_AOE')) {
        const healAmt = Math.round(modDmg * 0.15);
        p.hp = Math.min(p.maxHp, p.hp + healAmt);
        ctx.addFloatingText(p.x, p.y + 3, p.z, `+${healAmt} HP`, "#44ff44");
      }
      // Branch effect: GUARANTEED_CRIT — multiply by crit damage
      if (branchMods.bonusEffects.has('GUARANTEED_CRIT')) {
        ctx.addFloatingText(p.x, p.y + 3, p.z, "CRITICAL!", "#ff4444");
      }
      // Branch effect: EXECUTE_LOW_HP
      if (branchMods.bonusEffects.has('EXECUTE_LOW_HP')) {
        ctx.addFloatingText(p.x, p.y + 3.5, p.z, "EXECUTE!", "#ff2222");
      }
      break;
    }

    // ── AOE AT TARGET ──
    case SkillId.METEOR: {
      const radius = modRadius(def.aoeRadius || 6);
      const aoe: DiabloAOE = {
        id: ctx.genId(),
        x: aimX,
        y: 0,
        z: aimZ,
        radius,
        damage: modDmg,
        damageType: def.damageType,
        duration: 1.5,
        timer: 0,
        ownerId: "player",
        tickInterval: 0.5,
        lastTickTimer: 0,
        statusEffect: modStatus,
      };
      ctx.state.aoeEffects.push(aoe);
      // Massive meteor impact visuals
      ctx.renderer.shakeCamera(0.6, 0.8);
      ctx.renderer.spawnParticles(damageTypeToParticle(def.damageType), aimX, 0.5, aimZ, 25, ctx.state.particles);
      ctx.renderer.spawnParticles(damageTypeToParticle(def.damageType), aimX, 1.5, aimZ, 15, ctx.state.particles);
      ctx.renderer.spawnParticles(ParticleType.DUST, aimX, 0, aimZ, 12, ctx.state.particles);
      ctx.renderer.spawnParticles(damageTypeToParticle(def.damageType), aimX, 1.0, aimZ, 10, ctx.state.particles);
      break;
    }

    case SkillId.RAIN_OF_ARROWS: {
      const radius = modRadius(def.aoeRadius || 6);
      const aoe: DiabloAOE = {
        id: ctx.genId(),
        x: aimX,
        y: 0,
        z: aimZ,
        radius,
        damage: modDmg,
        damageType: def.damageType,
        duration: 2.0,
        timer: 0,
        ownerId: "player",
        tickInterval: 0.4,
        lastTickTimer: 0,
        statusEffect: modStatus,
      };
      ctx.state.aoeEffects.push(aoe);
      break;
    }

    case SkillId.EXPLOSIVE_TRAP: {
      const radius = modRadius(def.aoeRadius || 4);
      const trapStatus = modStatus || StatusEffect.BURNING;
      const aoe: DiabloAOE = {
        id: ctx.genId(),
        x: aimX,
        y: 0,
        z: aimZ,
        radius,
        damage: modDmg,
        damageType: def.damageType,
        duration: 10.0, // trap lasts 10 seconds
        timer: 0,
        ownerId: "player",
        tickInterval: 10.0, // only triggers once
        lastTickTimer: 0,
        statusEffect: trapStatus,
      };
      ctx.state.aoeEffects.push(aoe);
      break;
    }

    // ── BUFFS ──
    case SkillId.BATTLE_CRY: {
      p.statusEffects.push({
        effect: StatusEffect.STUNNED, // Placeholder effect type; source is what matters
        duration: 10,
        source: "BATTLE_CRY",
      });
      ctx.addFloatingText(p.x, p.y + 3, p.z, "BATTLE CRY!", "#ffd700");
      // Branch effect: BUFF_ATTACK_SPEED
      if (branchMods.bonusEffects.has('BUFF_ATTACK_SPEED')) {
        p.attackSpeed *= 1.3;
        ctx.addFloatingText(p.x, p.y + 3.5, p.z, "Attack Speed UP!", "#88ff88");
      }
      // Branch effect: DEBUFF_ENEMIES
      if (branchMods.bonusEffects.has('DEBUFF_ENEMIES')) {
        ctx.addFloatingText(p.x, p.y + 3.5, p.z, "Enemies Weakened!", "#ff8844");
      }
      // Branch effect: HEAL_ON_CRY
      if (branchMods.bonusEffects.has('HEAL_ON_CRY')) {
        const healAmt = Math.round(p.maxHp * 0.10);
        p.hp = Math.min(p.maxHp, p.hp + healAmt);
        ctx.addFloatingText(p.x, p.y + 4, p.z, `+${healAmt} HP`, "#44ff44");
      }
      // Branch effect: BERSERKER_MODE
      if (branchMods.bonusEffects.has('BERSERKER_MODE')) {
        ctx.addFloatingText(p.x, p.y + 4, p.z, "BERSERKER!", "#ff2222");
      }
      break;
    }

    case SkillId.ARCANE_SHIELD:
    case SkillId.DIVINE_SHIELD:
    case SkillId.AVENGING_WRATH:
    case SkillId.LAY_ON_HANDS:
    case SkillId.AEGIS_OF_LIGHT:
    case SkillId.RIGHTEOUS_FURY:
    case SkillId.RAISE_SKELETON: {
      // Summon a skeleton warrior ally that fights for the player
      const skelAngle = Math.random() * Math.PI * 2;
      const skelX = p.x + Math.cos(skelAngle) * 3;
      const skelZ = p.z + Math.sin(skelAngle) * 3;
      const skelDmg = modDmg * 0.4;
      const skelHp = p.maxHp * 0.3;
      const skelEnemy: DiabloEnemy = {
        id: ctx.genId(),
        type: EnemyType.SKELETON_WARRIOR,
        x: skelX, y: 0, z: skelZ,
        angle: p.angle,
        hp: skelHp, maxHp: skelHp,
        damage: skelDmg, damageType: DamageType.PHYSICAL, armor: 5, speed: 3.5,
        state: EnemyState.CHASE, targetId: null,
        attackTimer: 1.0, attackRange: 2.0, aggroRange: 15,
        xpReward: 0, lootTable: [], deathTimer: 0, stateTimer: 0,
        patrolTarget: null, statusEffects: [], isBoss: false,
        scale: 0.85, level: p.level,
      };
      // Mark as player-owned so it attacks enemies, not the player
      (skelEnemy as any).isPlayerMinion = true;
      ctx.state.enemies.push(skelEnemy);
      ctx.renderer.spawnParticles(ParticleType.DUST, skelX, 0.3, skelZ, 8, ctx.state.particles);
      ctx.renderer.spawnParticles(ParticleType.LIGHTNING, skelX, 0.5, skelZ, 5, ctx.state.particles);
      ctx.addFloatingText(p.x, p.y + 3, p.z, "Rise!", "#44ff88");
      break;
    }
    case SkillId.BLOOD_GOLEM:
    case SkillId.ARMY_OF_THE_DEAD:
    case SkillId.BONE_ARMOR:
    case SkillId.REVIVE:
    case SkillId.SMOKE_SCREEN:
    case SkillId.DEATH_MARK:
    case SkillId.SHADOW_CLONE:
    case SkillId.VANISH:
    case SkillId.ASSASSINATE:
    case SkillId.EXECUTE:
    case SkillId.CURSE_OF_FRAILTY: {
      p.invulnTimer = 8;
      const buffName = def.name || skillId;
      ctx.addFloatingText(p.x, p.y + 3, p.z, `${buffName}!`, "#aa44ff");
      break;
    }

    case SkillId.EVASIVE_ROLL: {
      // Dash forward, brief invuln
      const dashDist = 6;
      p.x += Math.sin(angle) * dashDist;
      p.z += Math.cos(angle) * dashDist;
      p.invulnTimer = 0.8;
      ctx.addFloatingText(p.x, p.y + 2, p.z, "DODGE!", "#44ff44");
      break;
    }

    // ── WARRIOR UNLOCKABLE SKILLS ──
    case SkillId.LEAP: {
      // Leap to target location, AOE on landing
      const leapDist = Math.min(12, Math.sqrt((aimX - p.x) ** 2 + (aimZ - p.z) ** 2));
      p.x += Math.sin(angle) * leapDist;
      p.z += Math.cos(angle) * leapDist;
      p.invulnTimer = 0.5;
      const radius = modRadius(def.aoeRadius || 4);
      const aoe: DiabloAOE = {
        id: ctx.genId(), x: p.x, y: 0, z: p.z, radius,
        damage: modDmg, damageType: def.damageType, duration: 0.3, timer: 0,
        ownerId: "player", tickInterval: 0.3, lastTickTimer: 0, statusEffect: modStatus,
      };
      ctx.state.aoeEffects.push(aoe);
      tickAOEDamage(ctx, aoe);
      ctx.addFloatingText(p.x, p.y + 3, p.z, "LEAP!", "#ffd700");
      ctx.renderer.spawnParticles(ParticleType.DUST, p.x, 0, p.z, 10, ctx.state.particles);
      // Clamp to map bounds
      const mapLeap = MAP_CONFIGS[ctx.state.currentMap];
      p.x = Math.max(-mapLeap.width / 2, Math.min(mapLeap.width / 2, p.x));
      p.z = Math.max(-((mapLeap as any).depth || mapLeap.width) / 2, Math.min(((mapLeap as any).depth || mapLeap.width) / 2, p.z));
      break;
    }

    case SkillId.IRON_SKIN: {
      p.statusEffects.push({ effect: StatusEffect.STUNNED, duration: 8, source: "IRON_SKIN" });
      ctx.addFloatingText(p.x, p.y + 3, p.z, "IRON SKIN!", "#aaaaff");
      // Temporary armor boost handled via source check in damage calc
      break;
    }

    case SkillId.TAUNT: {
      const tauntRadius = modRadius(def.aoeRadius || 8);
      for (const enemy of ctx.state.enemies) {
        const d = ctx.dist(p.x, p.z, enemy.x, enemy.z);
        if (d < tauntRadius && enemy.state !== EnemyState.DEAD && enemy.state !== EnemyState.DYING) {
          enemy.state = EnemyState.CHASE;
          enemy.targetId = "player";
        }
      }
      ctx.addFloatingText(p.x, p.y + 3, p.z, "TAUNT!", "#ff8844");
      break;
    }

    case SkillId.CRUSHING_BLOW: {
      // Single target melee — use AOE with tiny radius
      const cbRadius = modRadius(2.5);
      const cbAoe: DiabloAOE = {
        id: ctx.genId(), x: p.x + Math.sin(angle) * 2, y: 0, z: p.z + Math.cos(angle) * 2,
        radius: cbRadius, damage: modDmg, damageType: def.damageType, duration: 0.2, timer: 0,
        ownerId: "player", tickInterval: 0.2, lastTickTimer: 0, statusEffect: modStatus,
      };
      ctx.state.aoeEffects.push(cbAoe);
      tickAOEDamage(ctx, cbAoe);
      ctx.addFloatingText(p.x, p.y + 3, p.z, "CRUSH!", "#ff4444");
      break;
    }

    case SkillId.INTIMIDATING_ROAR:
    case SkillId.EARTHQUAKE:
    case SkillId.FROST_BARRIER:
    case SkillId.MANA_SIPHON:
    case SkillId.TIME_WARP:
    case SkillId.NET_TRAP: {
      // AOE centered on player (or target for NET_TRAP)
      const aoeCenterX = skillId === SkillId.NET_TRAP ? aimX : p.x;
      const aoeCenterZ = skillId === SkillId.NET_TRAP ? aimZ : p.z;
      const aoeR = modRadius(def.aoeRadius || 6);
      const bigAoe: DiabloAOE = {
        id: ctx.genId(), x: aoeCenterX, y: 0, z: aoeCenterZ, radius: aoeR,
        damage: modDmg, damageType: def.damageType,
        duration: def.duration || 1.0, timer: 0,
        ownerId: "player", tickInterval: 0.5, lastTickTimer: 0, statusEffect: modStatus,
      };
      ctx.state.aoeEffects.push(bigAoe);
      tickAOEDamage(ctx, bigAoe);
      const labels: Partial<Record<SkillId, string>> = {
        [SkillId.INTIMIDATING_ROAR]: "ROAR!",
        [SkillId.EARTHQUAKE]: "EARTHQUAKE!",
        [SkillId.FROST_BARRIER]: "FROST BARRIER!",
        [SkillId.MANA_SIPHON]: "SIPHON!",
        [SkillId.TIME_WARP]: "TIME WARP!",
        [SkillId.NET_TRAP]: "TRAPPED!",
      };
      ctx.addFloatingText(p.x, p.y + 3, p.z, labels[skillId] || "!", "#44ffff");
      // Mana Siphon: restore mana
      if (skillId === SkillId.MANA_SIPHON) {
        const manaGain = Math.round(p.maxMana * 0.25);
        p.mana = Math.min(p.maxMana, p.mana + manaGain);
        const hpGain = Math.round(p.maxHp * 0.10);
        p.hp = Math.min(p.maxHp, p.hp + hpGain);
        ctx.addFloatingText(p.x, p.y + 3.5, p.z, `+${manaGain} Mana +${hpGain} HP`, "#4488ff");
      }
      if (skillId === SkillId.EARTHQUAKE) {
        ctx.renderer.shakeCamera(0.7, 1.0);
        ctx.renderer.spawnParticles(ParticleType.DUST, p.x, 0, p.z, 25, ctx.state.particles);
        ctx.renderer.spawnParticles(ParticleType.DUST, p.x + 2, 0, p.z + 2, 10, ctx.state.particles);
        ctx.renderer.spawnParticles(ParticleType.DUST, p.x - 2, 0, p.z - 2, 10, ctx.state.particles);
        ctx.renderer.spawnParticles(damageTypeToParticle(def.damageType), p.x, 0.3, p.z, 8, ctx.state.particles);
      }
      if (skillId === SkillId.FROST_BARRIER) {
        ctx.renderer.shakeCamera(0.2, 0.3);
        ctx.renderer.spawnParticles(ParticleType.ICE, p.x, 0.5, p.z, 12, ctx.state.particles);
      }
      if (skillId === SkillId.TIME_WARP) {
        ctx.renderer.shakeCamera(0.15, 0.25);
        ctx.renderer.spawnParticles(damageTypeToParticle(def.damageType), p.x, 1.0, p.z, 10, ctx.state.particles);
      }
      if (skillId === SkillId.INTIMIDATING_ROAR) {
        ctx.renderer.shakeCamera(0.3, 0.4);
        ctx.renderer.spawnParticles(ParticleType.DUST, p.x, 0.5, p.z, 8, ctx.state.particles);
      }
      break;
    }

    // ── MAGE UNLOCKABLE SKILLS ──
    case SkillId.SUMMON_ELEMENTAL: {
      // Spawn a temporary allied "elemental" enemy that fights for the player
      // Implemented as a series of AOE ticks around a projected point
      const summonX = p.x + Math.sin(angle) * 3;
      const summonZ = p.z + Math.cos(angle) * 3;
      const elemAoe: DiabloAOE = {
        id: ctx.genId(), x: summonX, y: 0, z: summonZ,
        radius: modRadius(3), damage: modDmg,
        damageType: def.damageType, duration: 15, timer: 0,
        ownerId: "player", tickInterval: 1.5, lastTickTimer: 0,
        statusEffect: modStatus || StatusEffect.BURNING,
      };
      ctx.state.aoeEffects.push(elemAoe);
      ctx.addFloatingText(summonX, 2, summonZ, "ELEMENTAL!", "#ff8844");
      ctx.renderer.spawnParticles(ParticleType.FIRE, summonX, 0.5, summonZ, 12, ctx.state.particles);
      break;
    }

    case SkillId.BLINK: {
      // Teleport to target location
      const blinkDist = Math.min(15, Math.sqrt((aimX - p.x) ** 2 + (aimZ - p.z) ** 2));
      // Damage at departure point
      if (modDmg > 0) {
        const departAoe: DiabloAOE = {
          id: ctx.genId(), x: p.x, y: 0, z: p.z,
          radius: modRadius(def.aoeRadius || 2), damage: modDmg,
          damageType: DamageType.ARCANE, duration: 0.3, timer: 0,
          ownerId: "player", tickInterval: 0.3, lastTickTimer: 0,
        };
        ctx.state.aoeEffects.push(departAoe);
        tickAOEDamage(ctx, departAoe);
      }
      ctx.renderer.spawnParticles(damageTypeToParticle(def.damageType), p.x, 1, p.z, 8, ctx.state.particles);
      p.x += Math.sin(angle) * blinkDist;
      p.z += Math.cos(angle) * blinkDist;
      p.invulnTimer = 0.3;
      // Clamp to map bounds
      const mapBlink = MAP_CONFIGS[ctx.state.currentMap];
      p.x = Math.max(-mapBlink.width / 2, Math.min(mapBlink.width / 2, p.x));
      p.z = Math.max(-((mapBlink as any).depth || mapBlink.width) / 2, Math.min(((mapBlink as any).depth || mapBlink.width) / 2, p.z));
      ctx.renderer.spawnParticles(damageTypeToParticle(def.damageType), p.x, 1, p.z, 8, ctx.state.particles);
      ctx.addFloatingText(p.x, p.y + 3, p.z, "BLINK!", "#aa44ff");
      break;
    }

    case SkillId.ARCANE_MISSILES: {
      // Fire multiple projectiles in a spread
      const missileCount = 5 + branchMods.extraProjectiles;
      const spread = 0.2;
      const half = Math.floor(missileCount / 2);
      for (let i = -half; i <= half; i++) {
        if (missileCount % 2 === 0 && i === 0) continue;
        createProjectile(ctx, p.x, p.y + 1, p.z, angle + i * spread, modDmg * 0.6, def, skillId);
      }
      ctx.addFloatingText(p.x, p.y + 3, p.z, "ARCANE MISSILES!", "#aa44ff");
      break;
    }

    // ── RANGER UNLOCKABLE SKILLS ──
    case SkillId.GRAPPLING_HOOK: {
      // Dash to target location
      const hookDist = Math.min(15, Math.sqrt((aimX - p.x) ** 2 + (aimZ - p.z) ** 2));
      p.x += Math.sin(angle) * hookDist;
      p.z += Math.cos(angle) * hookDist;
      p.invulnTimer = 0.3;
      // Clamp to map bounds
      const mapHook = MAP_CONFIGS[ctx.state.currentMap];
      p.x = Math.max(-mapHook.width / 2, Math.min(mapHook.width / 2, p.x));
      p.z = Math.max(-((mapHook as any).depth || mapHook.width) / 2, Math.min(((mapHook as any).depth || mapHook.width) / 2, p.z));
      // Damage on arrival
      if (modDmg > 0) {
        const hookAoe: DiabloAOE = {
          id: ctx.genId(), x: p.x, y: 0, z: p.z,
          radius: 2, damage: modDmg,
          damageType: def.damageType, duration: 0.2, timer: 0,
          ownerId: "player", tickInterval: 0.2, lastTickTimer: 0,
        };
        ctx.state.aoeEffects.push(hookAoe);
        tickAOEDamage(ctx, hookAoe);
      }
      ctx.addFloatingText(p.x, p.y + 2, p.z, "HOOK!", "#88ff44");
      break;
    }

    case SkillId.CAMOUFLAGE: {
      p.invulnTimer = 5;
      p.statusEffects.push({ effect: StatusEffect.STUNNED, duration: 5, source: "CAMOUFLAGE" });
      // Drop aggro from all enemies
      for (const enemy of ctx.state.enemies) {
        if (enemy.state === EnemyState.CHASE) {
          enemy.state = EnemyState.IDLE;
          enemy.stateTimer = 0;
        }
      }
      ctx.addFloatingText(p.x, p.y + 3, p.z, "CAMOUFLAGE!", "#44aa44");
      break;
    }

    case SkillId.FIRE_VOLLEY: {
      const arrowCount = 7 + branchMods.extraProjectiles;
      const fvSpread = 0.25;
      const fvHalf = Math.floor(arrowCount / 2);
      for (let i = -fvHalf; i <= fvHalf; i++) {
        createProjectile(ctx, p.x, p.y + 1, p.z, angle + i * fvSpread, modDmg * 0.7, def, skillId);
      }
      ctx.addFloatingText(p.x, p.y + 3, p.z, "FIRE VOLLEY!", "#ff6622");
      break;
    }

    case SkillId.WIND_WALK: {
      p.statusEffects.push({ effect: StatusEffect.STUNNED, duration: 5, source: "WIND_WALK" });
      p.moveSpeed *= 1.8;
      p.invulnTimer = 0.5;
      ctx.addFloatingText(p.x, p.y + 3, p.z, "WIND WALK!", "#88ffff");
      break;
    }

    case SkillId.SHADOW_STRIKE: {
      // Find nearest enemy and teleport behind them
      let nearestEnemy: DiabloEnemy | null = null;
      let nearestDist = 12;
      for (const enemy of ctx.state.enemies) {
        if (enemy.state === EnemyState.DEAD || enemy.state === EnemyState.DYING) continue;
        const d = ctx.dist(p.x, p.z, enemy.x, enemy.z);
        if (d < nearestDist) {
          nearestDist = d;
          nearestEnemy = enemy;
        }
      }
      if (nearestEnemy) {
        const behindAngle = Math.atan2(p.x - nearestEnemy.x, p.z - nearestEnemy.z);
        p.x = nearestEnemy.x + Math.sin(behindAngle) * 1.5;
        p.z = nearestEnemy.z + Math.cos(behindAngle) * 1.5;
        // Deal damage
        const ssAoe: DiabloAOE = {
          id: ctx.genId(), x: nearestEnemy.x, y: 0, z: nearestEnemy.z,
          radius: modRadius(2), damage: modDmg,
          damageType: def.damageType, duration: 0.2, timer: 0,
          ownerId: "player", tickInterval: 0.2, lastTickTimer: 0,
        };
        ctx.state.aoeEffects.push(ssAoe);
        tickAOEDamage(ctx, ssAoe);
        ctx.addFloatingText(nearestEnemy.x, 3, nearestEnemy.z, "BACKSTAB!", "#ff44ff");
        ctx.renderer.spawnParticles(damageTypeToParticle(def.damageType), nearestEnemy.x, 1, nearestEnemy.z, 8, ctx.state.particles);
      } else {
        ctx.addFloatingText(p.x, p.y + 2, p.z, "No target!", "#ff4444");
        // Refund mana
        p.mana = Math.min(p.maxMana, p.mana + Math.ceil(def.manaCost * branchMods.manaCostMult));
        p.skillCooldowns.set(skillId, 0);
      }
      break;
    }
  }

  // Trigger legendary on_skill effects
  triggerLegendaryEffects(ctx, 'on_skill', { targetX: aimX, targetZ: aimZ, damage: modDmg, skillId: skillId });

  // Rune visual feedback
  if (runeEffect) {
    ctx.addFloatingText(p.x, p.y + 1.5, p.z, runeEffect.name, '#aa44ff');
  }

  // Extra projectiles from rune (for non-projectile skills that don't already handle extraProjectiles)
  if (runeEffect && runeEffect.extraProjectiles) {
    for (let ep = 0; ep < runeEffect.extraProjectiles; ep++) {
      const spreadAngle = angle + (ep - runeEffect.extraProjectiles / 2) * 0.2;
      const extraProj: DiabloProjectile = {
        id: ctx.genId(),
        x: p.x, y: p.y + 1, z: p.z,
        vx: Math.sin(spreadAngle) * 15,
        vy: 0,
        vz: Math.cos(spreadAngle) * 15,
        speed: 15,
        damage: modDmg * 0.6,
        damageType: def.damageType,
        radius: 0.3,
        ownerId: 'player',
        isPlayerOwned: true,
        lifetime: 0,
        maxLifetime: 2,
        skillId: skillId,
      };
      ctx.state.projectiles.push(extraProj);
    }
  }

  // Apply rune leech healing
  if (runeEffect?.leechPercent && modDmg > 0) {
    const leechHeal = Math.round(modDmg * runeEffect.leechPercent / 100);
    p.hp = Math.min(p.maxHp, p.hp + leechHeal);
    ctx.addFloatingText(p.x, p.y + 3.5, p.z, `+${leechHeal} HP`, "#44ff44");
  }

  // Skill cast particles at player position
  const castParticle = damageTypeToParticle(def.damageType);
  ctx.renderer.spawnParticles(castParticle, p.x, p.y + 1, p.z, 8, ctx.state.particles);

  // Cast effect screen overlay matching damage type
  ctx.renderer.showCastOverlay(def.damageType, 0.3);
}
