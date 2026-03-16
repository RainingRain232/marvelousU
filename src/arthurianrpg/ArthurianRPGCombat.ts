// ============================================================================
// ArthurianRPGCombat.ts – Real-time combat system for an Arthurian RPG
// ============================================================================

// ---------------------------------------------------------------------------
// Types & Config imports
// ---------------------------------------------------------------------------

import type {
  ArthurianRPGState,
  CombatantState,
  ActiveEffect,
  CombatAction,
  EnemyAIProfile,
  BossPhase,
  CompanionCombatRole,
  DamageInstance,
  HitResult,
  ComboState,
  WeatherModifiers,
} from "./ArthurianRPGState";

import {
  ElementalType,
  CombatActionType,
  MagicSchool,
} from "./ArthurianRPGConfig";

import { getWeatherModifiers } from "./ArthurianRPGState";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LIGHT_ATTACK_COOLDOWN = 0.45; // seconds
const HEAVY_ATTACK_COOLDOWN = 1.2;
const BLOCK_STAMINA_COST_PER_SEC = 8;
const DODGE_ROLL_COOLDOWN = 0.8;
const DODGE_ROLL_STAMINA_COST = 25;
const DODGE_IFRAME_DURATION = 0.3;
const SPELL_CAST_BASE_TIME = 0.9;
const HEALING_ANIMATION_LOCK = 1.5;
const COMBO_WINDOW = 0.8; // seconds to chain next light attack
const MAX_COMBO_CHAIN = 5;
const COMBO_DAMAGE_BONUS_PER_HIT = 0.1; // +10 % per chain
const CRIT_BASE_CHANCE = 0.05;
const CRIT_DAMAGE_MULTIPLIER = 2.0;
export const STAGGER_THRESHOLD = 30; // poise damage to stagger
const STAGGER_DURATION = 1.0;
const RESPAWN_DELAY = 5.0;

export const BOSS_PHASE_HP_THRESHOLDS = [0.75, 0.5, 0.25]; // transition at 75/50/25 %

// ---------------------------------------------------------------------------
// Elemental effectiveness matrix  (attacker → defender → multiplier)
// ---------------------------------------------------------------------------

const ELEMENTAL_MATRIX: Record<ElementalType, Partial<Record<ElementalType, number>>> = {
  [ElementalType.Fire]: { [ElementalType.Ice]: 1.5, [ElementalType.Dark]: 1.25, [ElementalType.Nature]: 1.5 },
  [ElementalType.Ice]: { [ElementalType.Lightning]: 1.5, [ElementalType.Fire]: 0.75, [ElementalType.Nature]: 0.75 },
  [ElementalType.Lightning]: { [ElementalType.Fire]: 1.5, [ElementalType.Ice]: 0.75 },
  [ElementalType.Holy]: { [ElementalType.Dark]: 2.0 },
  [ElementalType.Dark]: { [ElementalType.Holy]: 2.0, [ElementalType.Physical]: 1.1, [ElementalType.Nature]: 1.25 },
  [ElementalType.Physical]: {},
  [ElementalType.Nature]: { [ElementalType.Ice]: 1.25, [ElementalType.Fire]: 0.75, [ElementalType.Dark]: 1.25 },
  [ElementalType.Arcane]: { [ElementalType.Physical]: 1.25 },
};

// ---------------------------------------------------------------------------
// Damage calculation helpers
// ---------------------------------------------------------------------------

/**
 * Core damage formula.
 *
 *   baseDamage = weaponDamage + (attribute * scaling)
 *   skillBonus  = 1 + (skillLevel * 0.01)
 *   comboBonus  = 1 + (comboChain * COMBO_DAMAGE_BONUS_PER_HIT)
 *   raw         = baseDamage * skillBonus * comboBonus * perkMultiplier
 *   elemental   = raw * elementalEffectiveness
 *   afterArmor  = elemental * (1 - armorMitigation)
 */
/**
 * Returns the weather-based damage multiplier for the given element.
 * Fire, Lightning, and Ice are affected by weather conditions.
 */
function getWeatherElementMult(element: ElementalType, weatherMods: WeatherModifiers): number {
  switch (element) {
    case ElementalType.Fire: return weatherMods.fireDamageMult;
    case ElementalType.Lightning: return weatherMods.lightningDamageMult;
    case ElementalType.Ice: return weatherMods.iceDamageMult;
    default: return 1.0;
  }
}

function calculateDamage(
  attacker: CombatantState,
  defender: CombatantState,
  action: CombatAction,
  combo: ComboState,
  weatherMods?: WeatherModifiers,
): DamageInstance {
  const weapon = attacker.equipment.mainHand;
  const weaponDamage = weapon ? weapon.baseDamage : 5; // unarmed fallback
  const element = weapon?.element ?? ElementalType.Physical;
  const attribute = getRelevantAttribute(attacker, action);
  const scaling = weapon?.attributeScaling ?? 1.0;

  const baseDamage = weaponDamage + attribute * scaling;

  // Skill bonus
  const skillKey = getSkillKeyForAction(action);
  const skillLevel = attacker.skills[skillKey] ?? 0;
  const skillBonus = 1 + skillLevel * 0.01;

  // Combo
  const comboBonus =
    action.type === CombatActionType.LightAttack
      ? 1 + combo.chain * COMBO_DAMAGE_BONUS_PER_HIT
      : 1;

  // Perk multiplier  (aggregated from equipped perks)
  const perkMult = computePerkMultiplier(attacker, action);

  let raw = baseDamage * skillBonus * comboBonus * perkMult;

  // Heavy attack bonus
  if (action.type === CombatActionType.HeavyAttack) {
    raw *= 1.75;
  }

  // Weather-based elemental damage modifier
  const wMods = weatherMods ?? getWeatherModifiers("clear");
  const weatherEleMult = getWeatherElementMult(element, wMods);

  // Elemental effectiveness
  const defElement = defender.primaryElement ?? ElementalType.Physical;
  const eleMult = ELEMENTAL_MATRIX[element]?.[defElement] ?? 1.0;
  const elemental = raw * eleMult * weatherEleMult;

  // Armor mitigation: reduction = armor / (armor + 100)
  const armor = computeTotalArmor(defender);
  const mitigation = armor / (armor + 100);
  const afterArmor = elemental * (1 - mitigation);

  // Critical hit
  const critChance = CRIT_BASE_CHANCE + skillLevel * 0.002;
  const isCrit = Math.random() < critChance;
  const finalDamage = isCrit ? afterArmor * CRIT_DAMAGE_MULTIPLIER : afterArmor;

  return {
    amount: Math.max(1, Math.round(finalDamage)),
    element,
    isCritical: isCrit,
    isBlocked: false,
    staggerDamage: action.type === CombatActionType.HeavyAttack ? 20 : 10,
  };
}

function getRelevantAttribute(c: CombatantState, action: CombatAction): number {
  switch (action.type) {
    case CombatActionType.SpellCast: {
      // Restoration and Nature scale with wisdom; Destruction and Conjuration with intelligence
      const spell = action.spellId
        ? SPELL_BOOK.find((s) => s.id === action.spellId)
        : null;
      if (spell && (spell.school === MagicSchool.Restoration || spell.school === MagicSchool.Nature)) {
        return c.attributes.wisdom;
      }
      return c.attributes.intelligence;
    }
    case CombatActionType.HeavyAttack:
      return c.attributes.strength;
    default:
      return c.attributes.dexterity;
  }
}

function getSkillKeyForSchool(school: MagicSchool): string {
  switch (school) {
    case MagicSchool.Destruction:
      return "destruction";
    case MagicSchool.Restoration:
      return "restoration";
    case MagicSchool.Conjuration:
      return "conjuration";
    case MagicSchool.Nature:
      return "nature";
  }
}

function getSkillKeyForAction(action: CombatAction): string {
  switch (action.type) {
    case CombatActionType.SpellCast: {
      // Look up the spell to determine its school
      const spell = action.spellId
        ? SPELL_BOOK.find((s) => s.id === action.spellId)
        : null;
      return spell ? getSkillKeyForSchool(spell.school) : "destruction";
    }
    case CombatActionType.HeavyAttack:
      return "twoHanded";
    default:
      return "oneHanded";
  }
}

function computePerkMultiplier(c: CombatantState, _action: CombatAction): number {
  let mult = 1.0;
  for (const perk of c.perks) {
    mult *= perk.damageMultiplier ?? 1.0;
  }
  return mult;
}

function computeTotalArmor(c: CombatantState): number {
  const g = c.equipment;
  let total = 0;
  if (g.head) total += g.head.armorValue;
  if (g.chest) total += g.chest.armorValue;
  if (g.legs) total += g.legs.armorValue;
  if (g.feet) total += g.feet.armorValue;
  if (g.offHand?.armorValue) total += g.offHand.armorValue;
  return total;
}

// ---------------------------------------------------------------------------
// Combo tracker
// ---------------------------------------------------------------------------

export class ComboTracker {
  chain = 0;
  lastHitTime = 0;

  registerHit(time: number): number {
    if (time - this.lastHitTime <= COMBO_WINDOW && this.chain < MAX_COMBO_CHAIN) {
      this.chain++;
    } else {
      this.chain = 1;
    }
    this.lastHitTime = time;
    return this.chain;
  }

  getState(): ComboState {
    return { chain: this.chain, lastHitTime: this.lastHitTime };
  }

  reset(): void {
    this.chain = 0;
    this.lastHitTime = 0;
  }
}

// ---------------------------------------------------------------------------
// Stagger / Poise system
// ---------------------------------------------------------------------------

export class PoiseTracker {
  private currentPoise: number;
  private maxPoise: number;
  private staggerTimer = 0;
  isStaggered = false;

  constructor(maxPoise: number) {
    this.maxPoise = maxPoise;
    this.currentPoise = maxPoise;
  }

  applyPoiseDamage(amount: number): boolean {
    if (this.isStaggered) return false;
    this.currentPoise -= amount;
    if (this.currentPoise <= 0) {
      this.isStaggered = true;
      this.staggerTimer = STAGGER_DURATION;
      return true; // stagger triggered
    }
    return false;
  }

  update(dt: number): void {
    if (this.isStaggered) {
      this.staggerTimer -= dt;
      if (this.staggerTimer <= 0) {
        this.isStaggered = false;
        this.currentPoise = this.maxPoise;
      }
    } else {
      // Regenerate poise slowly
      this.currentPoise = Math.min(this.maxPoise, this.currentPoise + dt * 10);
    }
  }
}

// ---------------------------------------------------------------------------
// Block system
// ---------------------------------------------------------------------------

function processBlock(
  defender: CombatantState,
  incoming: DamageInstance,
): DamageInstance {
  if (!defender.isBlocking) return incoming;

  const shield = defender.equipment.offHand;
  const blockEfficiency = shield ? shield.blockEfficiency ?? 0.6 : 0.3;
  const reducedAmount = Math.round(incoming.amount * (1 - blockEfficiency));

  return {
    ...incoming,
    amount: Math.max(0, reducedAmount),
    isBlocked: true,
    staggerDamage: Math.round(incoming.staggerDamage * 0.5),
  };
}

// ---------------------------------------------------------------------------
// Dodge roll
// ---------------------------------------------------------------------------

export class DodgeRollHandler {
  private cooldownRemaining = 0;
  private iFrameRemaining = 0;
  isRolling = false;
  isInvincible = false;
  rollDirection = { x: 0, z: 0 };

  attempt(dirX: number, dirZ: number, stamina: number): boolean {
    if (this.cooldownRemaining > 0 || stamina < DODGE_ROLL_STAMINA_COST) {
      return false;
    }
    this.isRolling = true;
    this.isInvincible = true;
    this.iFrameRemaining = DODGE_IFRAME_DURATION;
    this.cooldownRemaining = DODGE_ROLL_COOLDOWN;
    const mag = Math.sqrt(dirX * dirX + dirZ * dirZ) || 1;
    this.rollDirection = { x: dirX / mag, z: dirZ / mag };
    return true;
  }

  update(dt: number): void {
    if (this.iFrameRemaining > 0) {
      this.iFrameRemaining -= dt;
      if (this.iFrameRemaining <= 0) {
        this.isInvincible = false;
        this.isRolling = false;
      }
    }
    if (this.cooldownRemaining > 0) {
      this.cooldownRemaining -= dt;
    }
  }
}

// ---------------------------------------------------------------------------
// Active Effects (buffs / debuffs / DoTs)
// ---------------------------------------------------------------------------

function applyActiveEffects(
  combatant: CombatantState,
  effects: ActiveEffect[],
  dt: number,
): ActiveEffect[] {
  const remaining: ActiveEffect[] = [];

  for (const eff of effects) {
    eff.elapsed += dt;

    // Periodic tick
    if (eff.tickInterval > 0) {
      const ticksDue = Math.floor(eff.elapsed / eff.tickInterval) -
        Math.floor((eff.elapsed - dt) / eff.tickInterval);
      for (let i = 0; i < ticksDue; i++) {
        if (eff.damagePerTick) {
          combatant.hp = Math.max(0, combatant.hp - eff.damagePerTick);
        }
        if (eff.healPerTick) {
          combatant.hp = Math.min(combatant.maxHp, combatant.hp + eff.healPerTick);
        }
      }
    }

    if (eff.elapsed < eff.duration) {
      remaining.push(eff);
    }
  }

  return remaining;
}

// ---------------------------------------------------------------------------
// Healing action (with animation lock)
// ---------------------------------------------------------------------------

export class HealingHandler {
  isLocked = false;
  private lockTimer = 0;

  beginHeal(combatant: CombatantState, healAmount: number): boolean {
    if (this.isLocked || combatant.hp >= combatant.maxHp) return false;
    this.isLocked = true;
    this.lockTimer = HEALING_ANIMATION_LOCK;
    combatant.hp = Math.min(combatant.maxHp, combatant.hp + healAmount);
    return true;
  }

  update(dt: number): void {
    if (this.isLocked) {
      this.lockTimer -= dt;
      if (this.lockTimer <= 0) {
        this.isLocked = false;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Spell casting
// ---------------------------------------------------------------------------

export interface SpellDef {
  id: string;
  name: string;
  school: MagicSchool;
  manaCost: number;
  castTime: number; // multiplier on SPELL_CAST_BASE_TIME
  damage: number; // negative = heal
  element: ElementalType;
  cooldown: number;
  range: number; // max cast range in units (0 = self)
  areaRadius: number; // 0 = single target
  requiredSkillLevel: number; // minimum skill level in the spell's school
  description: string;
  effect?: Partial<ActiveEffect>;
}

const SPELL_BOOK: SpellDef[] = [
  // =========================================================================
  // DESTRUCTION (12 spells)
  // =========================================================================
  {
    id: "firebolt",
    name: "Firebolt",
    school: MagicSchool.Destruction,
    manaCost: 15,
    castTime: 0.5,
    damage: 25,
    element: ElementalType.Fire,
    cooldown: 1.5,
    range: 30,
    areaRadius: 0,
    requiredSkillLevel: 0,
    description: "A quick bolt of fire that scorches a single target. The first spell any apprentice learns.",
  },
  {
    id: "fireball",
    name: "Fireball",
    school: MagicSchool.Destruction,
    manaCost: 35,
    castTime: 1.0,
    damage: 50,
    element: ElementalType.Fire,
    cooldown: 3.0,
    range: 25,
    areaRadius: 3,
    requiredSkillLevel: 15,
    description: "A blazing sphere that explodes on impact, engulfing nearby foes in flame.",
    effect: {
      id: "burn",
      name: "Burning",
      duration: 4,
      tickInterval: 1,
      damagePerTick: 8,
      elapsed: 0,
    },
  },
  {
    id: "fire_wall",
    name: "Fire Wall",
    school: MagicSchool.Destruction,
    manaCost: 50,
    castTime: 1.2,
    damage: 20,
    element: ElementalType.Fire,
    cooldown: 10.0,
    range: 20,
    areaRadius: 6,
    requiredSkillLevel: 40,
    description: "Conjures a roaring wall of flame that persists on the ground, burning any who pass through.",
    effect: {
      id: "fire_wall_burn",
      name: "Searing Ground",
      duration: 8,
      tickInterval: 1,
      damagePerTick: 15,
      elapsed: 0,
    },
  },
  {
    id: "ice_spike",
    name: "Ice Spike",
    school: MagicSchool.Destruction,
    manaCost: 20,
    castTime: 0.6,
    damage: 30,
    element: ElementalType.Ice,
    cooldown: 2.0,
    range: 28,
    areaRadius: 0,
    requiredSkillLevel: 5,
    description: "Hurls a jagged shard of ice that pierces a single enemy, slowing their movement.",
    effect: {
      id: "chill",
      name: "Chilled",
      duration: 3,
      tickInterval: 0,
      elapsed: 0,
      statModifiers: { dexterity: -4 },
    },
  },
  {
    id: "frost_nova",
    name: "Frost Nova",
    school: MagicSchool.Destruction,
    manaCost: 40,
    castTime: 0.8,
    damage: 35,
    element: ElementalType.Ice,
    cooldown: 8.0,
    range: 0,
    areaRadius: 5,
    requiredSkillLevel: 25,
    description: "A burst of freezing energy radiates outward from the caster, chilling all nearby enemies.",
    effect: {
      id: "deep_freeze",
      name: "Frozen",
      duration: 2,
      tickInterval: 0,
      elapsed: 0,
      statModifiers: { dexterity: -8 },
    },
  },
  {
    id: "blizzard",
    name: "Blizzard",
    school: MagicSchool.Destruction,
    manaCost: 70,
    castTime: 1.8,
    damage: 20,
    element: ElementalType.Ice,
    cooldown: 15.0,
    range: 25,
    areaRadius: 8,
    requiredSkillLevel: 60,
    description: "Calls down a howling blizzard over a wide area, pelting foes with ice and slowing them to a crawl.",
    effect: {
      id: "blizzard_dot",
      name: "Frostbitten",
      duration: 6,
      tickInterval: 1,
      damagePerTick: 12,
      elapsed: 0,
      statModifiers: { dexterity: -6 },
    },
  },
  {
    id: "lightning_bolt",
    name: "Lightning Bolt",
    school: MagicSchool.Destruction,
    manaCost: 30,
    castTime: 0.7,
    damage: 45,
    element: ElementalType.Lightning,
    cooldown: 3.0,
    range: 35,
    areaRadius: 0,
    requiredSkillLevel: 10,
    description: "A crackling bolt of lightning that strikes a single target with searing electric force.",
  },
  {
    id: "chain_lightning",
    name: "Chain Lightning",
    school: MagicSchool.Destruction,
    manaCost: 55,
    castTime: 1.0,
    damage: 40,
    element: ElementalType.Lightning,
    cooldown: 6.0,
    range: 30,
    areaRadius: 4,
    requiredSkillLevel: 35,
    description: "Lightning arcs from the primary target to up to three nearby enemies, shocking each in turn.",
  },
  {
    id: "thunderstorm",
    name: "Thunderstorm",
    school: MagicSchool.Destruction,
    manaCost: 80,
    castTime: 2.0,
    damage: 30,
    element: ElementalType.Lightning,
    cooldown: 18.0,
    range: 20,
    areaRadius: 10,
    requiredSkillLevel: 65,
    description: "Summons a raging electrical storm overhead that randomly strikes enemies in a massive area.",
    effect: {
      id: "thunderstorm_dot",
      name: "Electrified",
      duration: 6,
      tickInterval: 1.5,
      damagePerTick: 18,
      elapsed: 0,
    },
  },
  {
    id: "arcane_missile",
    name: "Arcane Missile",
    school: MagicSchool.Destruction,
    manaCost: 25,
    castTime: 0.4,
    damage: 35,
    element: ElementalType.Arcane,
    cooldown: 2.0,
    range: 32,
    areaRadius: 0,
    requiredSkillLevel: 10,
    description: "Launches a seeking bolt of pure arcane energy that never misses its mark.",
  },
  {
    id: "meteor",
    name: "Meteor",
    school: MagicSchool.Destruction,
    manaCost: 100,
    castTime: 2.5,
    damage: 120,
    element: ElementalType.Fire,
    cooldown: 25.0,
    range: 30,
    areaRadius: 7,
    requiredSkillLevel: 75,
    description: "Calls down a massive flaming rock from the heavens. Devastates everything in the impact zone.",
    effect: {
      id: "meteor_burn",
      name: "Scorched Earth",
      duration: 5,
      tickInterval: 1,
      damagePerTick: 20,
      elapsed: 0,
    },
  },
  {
    id: "disintegrate",
    name: "Disintegrate",
    school: MagicSchool.Destruction,
    manaCost: 90,
    castTime: 2.0,
    damage: 150,
    element: ElementalType.Arcane,
    cooldown: 20.0,
    range: 20,
    areaRadius: 0,
    requiredSkillLevel: 85,
    description: "A focused beam of pure destructive energy that unravels the target at a fundamental level.",
  },

  // =========================================================================
  // RESTORATION (10 spells)
  // =========================================================================
  {
    id: "healing_touch",
    name: "Healing Touch",
    school: MagicSchool.Restoration,
    manaCost: 20,
    castTime: 0.8,
    damage: -40,
    element: ElementalType.Holy,
    cooldown: 3.0,
    range: 0,
    areaRadius: 0,
    requiredSkillLevel: 0,
    description: "Channels holy energy through the caster's hands, mending minor wounds on touch.",
  },
  {
    id: "healing_aura",
    name: "Healing Aura",
    school: MagicSchool.Restoration,
    manaCost: 35,
    castTime: 1.0,
    damage: -15,
    element: ElementalType.Holy,
    cooldown: 6.0,
    range: 0,
    areaRadius: 5,
    requiredSkillLevel: 15,
    description: "Radiates a warm aura of restorative light, slowly healing all nearby allies.",
    effect: {
      id: "healing_aura_hot",
      name: "Rejuvenating Aura",
      duration: 8,
      tickInterval: 2,
      healPerTick: 12,
      elapsed: 0,
    },
  },
  {
    id: "greater_heal",
    name: "Greater Heal",
    school: MagicSchool.Restoration,
    manaCost: 55,
    castTime: 1.6,
    damage: -100,
    element: ElementalType.Holy,
    cooldown: 8.0,
    range: 15,
    areaRadius: 0,
    requiredSkillLevel: 30,
    description: "A powerful healing spell that mends even grievous injuries with a surge of divine power.",
  },
  {
    id: "regeneration",
    name: "Regeneration",
    school: MagicSchool.Restoration,
    manaCost: 30,
    castTime: 0.6,
    damage: 0,
    element: ElementalType.Holy,
    cooldown: 12.0,
    range: 10,
    areaRadius: 0,
    requiredSkillLevel: 20,
    description: "Blesses the target with accelerated healing, restoring health over time.",
    effect: {
      id: "regen_hot",
      name: "Regenerating",
      duration: 12,
      tickInterval: 2,
      healPerTick: 15,
      elapsed: 0,
    },
  },
  {
    id: "cure_poison",
    name: "Cure Poison",
    school: MagicSchool.Restoration,
    manaCost: 25,
    castTime: 0.8,
    damage: -20,
    element: ElementalType.Holy,
    cooldown: 5.0,
    range: 10,
    areaRadius: 0,
    requiredSkillLevel: 10,
    description: "Purges toxins from the target's body and restores a small amount of health.",
  },
  {
    id: "ward_shield",
    name: "Ward Shield",
    school: MagicSchool.Restoration,
    manaCost: 40,
    castTime: 0.5,
    damage: 0,
    element: ElementalType.Holy,
    cooldown: 10.0,
    range: 0,
    areaRadius: 0,
    requiredSkillLevel: 25,
    description: "Erects a shimmering ward that absorbs incoming spell damage for a short duration.",
    effect: {
      id: "ward_active",
      name: "Warded",
      duration: 6,
      tickInterval: 0,
      elapsed: 0,
      statModifiers: { constitution: 10 },
    },
  },
  {
    id: "turn_undead",
    name: "Turn Undead",
    school: MagicSchool.Restoration,
    manaCost: 35,
    castTime: 1.0,
    damage: 60,
    element: ElementalType.Holy,
    cooldown: 8.0,
    range: 15,
    areaRadius: 4,
    requiredSkillLevel: 30,
    description: "Unleashes a blast of holy radiance that sends undead creatures fleeing in terror and sears their flesh.",
  },
  {
    id: "circle_of_protection",
    name: "Circle of Protection",
    school: MagicSchool.Restoration,
    manaCost: 60,
    castTime: 1.5,
    damage: 0,
    element: ElementalType.Holy,
    cooldown: 20.0,
    range: 0,
    areaRadius: 6,
    requiredSkillLevel: 50,
    description: "Inscribes a glowing circle on the ground that bolsters the defenses of all allies standing within.",
    effect: {
      id: "circle_buff",
      name: "Protected",
      duration: 10,
      tickInterval: 0,
      elapsed: 0,
      statModifiers: { constitution: 8, wisdom: 4 },
    },
  },
  {
    id: "resurrection",
    name: "Resurrection",
    school: MagicSchool.Restoration,
    manaCost: 120,
    castTime: 3.0,
    damage: -200,
    element: ElementalType.Holy,
    cooldown: 60.0,
    range: 5,
    areaRadius: 0,
    requiredSkillLevel: 75,
    description: "Calls upon the divine to restore a fallen companion to life with a portion of their health.",
  },
  {
    id: "divine_light",
    name: "Divine Light",
    school: MagicSchool.Restoration,
    manaCost: 80,
    castTime: 2.0,
    damage: -80,
    element: ElementalType.Holy,
    cooldown: 15.0,
    range: 0,
    areaRadius: 8,
    requiredSkillLevel: 60,
    description: "A brilliant column of light descends from the heavens, healing allies and scorching undead in a wide area.",
  },

  // =========================================================================
  // CONJURATION (10 spells)
  // =========================================================================
  {
    id: "summon_familiar",
    name: "Summon Familiar",
    school: MagicSchool.Conjuration,
    manaCost: 25,
    castTime: 1.2,
    damage: 0,
    element: ElementalType.Arcane,
    cooldown: 30.0,
    range: 5,
    areaRadius: 0,
    requiredSkillLevel: 0,
    description: "Summons a spectral wolf familiar that fights alongside the caster for 60 seconds.",
    effect: {
      id: "summon_familiar_active",
      name: "Familiar Active",
      duration: 60,
      tickInterval: 0,
      elapsed: 0,
    },
  },
  {
    id: "summon_skeleton",
    name: "Summon Skeleton",
    school: MagicSchool.Conjuration,
    manaCost: 35,
    castTime: 1.5,
    damage: 0,
    element: ElementalType.Dark,
    cooldown: 35.0,
    range: 5,
    areaRadius: 0,
    requiredSkillLevel: 15,
    description: "Raises a skeletal warrior from the earth to serve as a melee combatant for 90 seconds.",
    effect: {
      id: "summon_skeleton_active",
      name: "Skeleton Active",
      duration: 90,
      tickInterval: 0,
      elapsed: 0,
    },
  },
  {
    id: "summon_atronach",
    name: "Summon Atronach",
    school: MagicSchool.Conjuration,
    manaCost: 60,
    castTime: 2.0,
    damage: 0,
    element: ElementalType.Fire,
    cooldown: 45.0,
    range: 5,
    areaRadius: 0,
    requiredSkillLevel: 40,
    description: "Conjures a flame atronach, a powerful elemental that hurls fireballs at enemies for 120 seconds.",
    effect: {
      id: "summon_atronach_active",
      name: "Atronach Active",
      duration: 120,
      tickInterval: 0,
      elapsed: 0,
    },
  },
  {
    id: "bound_sword",
    name: "Bound Sword",
    school: MagicSchool.Conjuration,
    manaCost: 30,
    castTime: 0.8,
    damage: 0,
    element: ElementalType.Arcane,
    cooldown: 5.0,
    range: 0,
    areaRadius: 0,
    requiredSkillLevel: 10,
    description: "Conjures a weightless blade of pure magical energy in the caster's hand. Lasts 120 seconds.",
    effect: {
      id: "bound_sword_active",
      name: "Bound Sword",
      duration: 120,
      tickInterval: 0,
      elapsed: 0,
      statModifiers: { strength: 6 },
    },
  },
  {
    id: "bound_bow",
    name: "Bound Bow",
    school: MagicSchool.Conjuration,
    manaCost: 35,
    castTime: 1.0,
    damage: 0,
    element: ElementalType.Arcane,
    cooldown: 5.0,
    range: 0,
    areaRadius: 0,
    requiredSkillLevel: 20,
    description: "Manifests an ethereal bow with limitless spectral arrows. Lasts 120 seconds.",
    effect: {
      id: "bound_bow_active",
      name: "Bound Bow",
      duration: 120,
      tickInterval: 0,
      elapsed: 0,
      statModifiers: { dexterity: 6 },
    },
  },
  {
    id: "soul_trap",
    name: "Soul Trap",
    school: MagicSchool.Conjuration,
    manaCost: 25,
    castTime: 0.6,
    damage: 15,
    element: ElementalType.Dark,
    cooldown: 4.0,
    range: 25,
    areaRadius: 0,
    requiredSkillLevel: 15,
    description: "Marks a target; if slain within the duration, its soul is captured in an empty soul gem.",
    effect: {
      id: "soul_trap_mark",
      name: "Soul Trapped",
      duration: 30,
      tickInterval: 0,
      elapsed: 0,
    },
  },
  {
    id: "banish_daedra",
    name: "Banish Daedra",
    school: MagicSchool.Conjuration,
    manaCost: 50,
    castTime: 1.2,
    damage: 80,
    element: ElementalType.Holy,
    cooldown: 12.0,
    range: 20,
    areaRadius: 0,
    requiredSkillLevel: 45,
    description: "Sends a conjured or daedric creature back to the plane from which it came, dealing massive damage.",
  },
  {
    id: "conjure_wall",
    name: "Conjure Wall",
    school: MagicSchool.Conjuration,
    manaCost: 40,
    castTime: 1.0,
    damage: 0,
    element: ElementalType.Arcane,
    cooldown: 15.0,
    range: 15,
    areaRadius: 5,
    requiredSkillLevel: 30,
    description: "Raises a translucent barrier of solidified magic that blocks projectiles and slows enemies passing through.",
    effect: {
      id: "conjure_wall_active",
      name: "Arcane Wall",
      duration: 10,
      tickInterval: 0,
      elapsed: 0,
    },
  },
  {
    id: "summon_champion",
    name: "Summon Champion",
    school: MagicSchool.Conjuration,
    manaCost: 90,
    castTime: 2.5,
    damage: 0,
    element: ElementalType.Arcane,
    cooldown: 60.0,
    range: 5,
    areaRadius: 0,
    requiredSkillLevel: 65,
    description: "Conjures a spectral knight of the Round Table to fight by your side for 180 seconds.",
    effect: {
      id: "summon_champion_active",
      name: "Champion Active",
      duration: 180,
      tickInterval: 0,
      elapsed: 0,
    },
  },
  {
    id: "portal",
    name: "Portal",
    school: MagicSchool.Conjuration,
    manaCost: 80,
    castTime: 3.0,
    damage: 0,
    element: ElementalType.Arcane,
    cooldown: 120.0,
    range: 5,
    areaRadius: 2,
    requiredSkillLevel: 80,
    description: "Tears open a shimmering rift in space, allowing instant travel to a previously visited location.",
  },

  // =========================================================================
  // NATURE / DRUID (8 spells)
  // =========================================================================
  {
    id: "entangle",
    name: "Entangle",
    school: MagicSchool.Nature,
    manaCost: 25,
    castTime: 0.8,
    damage: 10,
    element: ElementalType.Nature,
    cooldown: 6.0,
    range: 20,
    areaRadius: 4,
    requiredSkillLevel: 0,
    description: "Thorny vines erupt from the ground, rooting enemies in place and dealing minor damage over time.",
    effect: {
      id: "entangle_root",
      name: "Entangled",
      duration: 4,
      tickInterval: 1,
      damagePerTick: 5,
      elapsed: 0,
      statModifiers: { dexterity: -10 },
    },
  },
  {
    id: "thorn_whip",
    name: "Thorn Whip",
    school: MagicSchool.Nature,
    manaCost: 15,
    castTime: 0.5,
    damage: 28,
    element: ElementalType.Nature,
    cooldown: 2.0,
    range: 15,
    areaRadius: 0,
    requiredSkillLevel: 5,
    description: "Lashes out with a vine covered in razor-sharp thorns, pulling the target closer to the caster.",
  },
  {
    id: "natures_grasp",
    name: "Nature's Grasp",
    school: MagicSchool.Nature,
    manaCost: 35,
    castTime: 1.0,
    damage: 20,
    element: ElementalType.Nature,
    cooldown: 8.0,
    range: 18,
    areaRadius: 3,
    requiredSkillLevel: 20,
    description: "Massive roots burst upward, crushing enemies caught in the area and briefly immobilizing them.",
    effect: {
      id: "nature_grasp_hold",
      name: "Grasped",
      duration: 3,
      tickInterval: 1,
      damagePerTick: 8,
      elapsed: 0,
      statModifiers: { dexterity: -12 },
    },
  },
  {
    id: "wild_shape",
    name: "Wild Shape",
    school: MagicSchool.Nature,
    manaCost: 50,
    castTime: 1.5,
    damage: 0,
    element: ElementalType.Nature,
    cooldown: 30.0,
    range: 0,
    areaRadius: 0,
    requiredSkillLevel: 35,
    description: "The caster transforms into a fearsome bear, gaining increased health, armor, and melee damage.",
    effect: {
      id: "wild_shape_bear",
      name: "Bear Form",
      duration: 30,
      tickInterval: 0,
      elapsed: 0,
      statModifiers: { strength: 8, constitution: 10, dexterity: -4 },
    },
  },
  {
    id: "summon_beast",
    name: "Summon Beast",
    school: MagicSchool.Nature,
    manaCost: 40,
    castTime: 1.5,
    damage: 0,
    element: ElementalType.Nature,
    cooldown: 35.0,
    range: 5,
    areaRadius: 0,
    requiredSkillLevel: 25,
    description: "Calls a great forest beast to aid the caster in battle for 90 seconds.",
    effect: {
      id: "summon_beast_active",
      name: "Beast Companion",
      duration: 90,
      tickInterval: 0,
      elapsed: 0,
    },
  },
  {
    id: "regrowth",
    name: "Regrowth",
    school: MagicSchool.Nature,
    manaCost: 30,
    castTime: 0.8,
    damage: -25,
    element: ElementalType.Nature,
    cooldown: 5.0,
    range: 10,
    areaRadius: 0,
    requiredSkillLevel: 10,
    description: "Infuses the target with primal life energy, restoring health immediately and over time.",
    effect: {
      id: "regrowth_hot",
      name: "Regrowing",
      duration: 8,
      tickInterval: 2,
      healPerTick: 10,
      elapsed: 0,
    },
  },
  {
    id: "earthquake",
    name: "Earthquake",
    school: MagicSchool.Nature,
    manaCost: 75,
    castTime: 2.0,
    damage: 60,
    element: ElementalType.Nature,
    cooldown: 20.0,
    range: 0,
    areaRadius: 10,
    requiredSkillLevel: 55,
    description: "The earth itself heaves and cracks, dealing heavy damage and staggering all enemies in a huge radius.",
  },
  {
    id: "storm_call",
    name: "Storm Call",
    school: MagicSchool.Nature,
    manaCost: 90,
    castTime: 2.5,
    damage: 45,
    element: ElementalType.Lightning,
    cooldown: 25.0,
    range: 0,
    areaRadius: 12,
    requiredSkillLevel: 70,
    description: "Invokes the fury of the sky, calling down a relentless barrage of wind, rain, and lightning across the battlefield.",
    effect: {
      id: "storm_call_dot",
      name: "Stormswept",
      duration: 6,
      tickInterval: 1.5,
      damagePerTick: 15,
      elapsed: 0,
      statModifiers: { dexterity: -4, perception: -4 },
    },
  },
];

export class SpellCaster {
  private cooldowns: Map<string, number> = new Map();
  private castingSpell: SpellDef | null = null;
  private castProgress = 0;
  isCasting = false;

  getSpellBook(): SpellDef[] {
    return SPELL_BOOK;
  }

  /** Returns all spells belonging to a specific magic school. */
  getSpellsBySchool(school: MagicSchool): SpellDef[] {
    return SPELL_BOOK.filter((s) => s.school === school);
  }

  /** Returns all spells the caster qualifies for based on their skill levels. */
  getAvailableSpells(skills: Record<string, number>): SpellDef[] {
    return SPELL_BOOK.filter((spell) => {
      const skillKey = getSkillKeyForSchool(spell.school);
      const skillLevel = skills[skillKey] ?? 0;
      return skillLevel >= spell.requiredSkillLevel;
    });
  }

  /**
   * Attempt to begin casting a spell.
   * @param spellId     Unique identifier of the spell.
   * @param mana        Caster's current mana pool.
   * @param casterSkills  Caster's skill levels (optional – when provided the
   *                      required skill level for the spell's school is enforced).
   */
  beginCast(
    spellId: string,
    mana: number,
    casterSkills?: Record<string, number>,
  ): SpellDef | null {
    const spell = SPELL_BOOK.find((s) => s.id === spellId);
    if (!spell) return null;
    if (mana < spell.manaCost) return null;
    const cd = this.cooldowns.get(spellId) ?? 0;
    if (cd > 0) return null;

    // Enforce school skill-level requirement
    if (casterSkills) {
      const skillKey = getSkillKeyForSchool(spell.school);
      const skillLevel = casterSkills[skillKey] ?? 0;
      if (skillLevel < spell.requiredSkillLevel) return null;
    }

    this.castingSpell = spell;
    this.castProgress = 0;
    this.isCasting = true;
    return spell;
  }

  update(dt: number): SpellDef | null {
    // Tick cooldowns
    for (const [id, cd] of this.cooldowns) {
      const next = cd - dt;
      if (next <= 0) this.cooldowns.delete(id);
      else this.cooldowns.set(id, next);
    }

    if (!this.castingSpell) return null;
    this.castProgress += dt;
    const needed = this.castingSpell.castTime * SPELL_CAST_BASE_TIME;
    if (this.castProgress >= needed) {
      const spell = this.castingSpell;
      this.cooldowns.set(spell.id, spell.cooldown);
      this.castingSpell = null;
      this.isCasting = false;
      this.castProgress = 0;
      return spell; // spell fires
    }
    return null;
  }

  cancelCast(): void {
    this.castingSpell = null;
    this.isCasting = false;
    this.castProgress = 0;
  }

  getCastProgress(): number {
    if (!this.castingSpell) return 0;
    return this.castProgress / (this.castingSpell.castTime * SPELL_CAST_BASE_TIME);
  }
}

// ---------------------------------------------------------------------------
// Enemy Combat AI
// ---------------------------------------------------------------------------

export class EnemyCombatAI {
  private decisionTimer = 0;
  private circleDirection = 1;
  private attackCooldown = 0;

  constructor(private profile: EnemyAIProfile) {}

  update(
    self: CombatantState,
    target: CombatantState,
    dt: number,
  ): CombatAction | null {
    this.decisionTimer -= dt;
    this.attackCooldown -= dt;

    const dx = target.position.x - self.position.x;
    const dz = target.position.z - self.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    // Flee at low HP
    if (self.hp / self.maxHp < (this.profile.fleeThreshold ?? 0.15)) {
      return {
        type: CombatActionType.Dodge,
        direction: { x: -dx / dist, z: -dz / dist },
      };
    }

    // Too far – approach
    if (dist > this.profile.attackRange) {
      return {
        type: CombatActionType.Move,
        direction: { x: dx / dist, z: dz / dist },
      };
    }

    // Within attack range
    if (this.decisionTimer <= 0) {
      this.decisionTimer = this.profile.decisionInterval ?? 0.8;
      this.circleDirection *= Math.random() < 0.3 ? -1 : 1;
    }

    // Circle strafe between attacks
    if (this.attackCooldown > 0) {
      const perpX = -dz / dist * this.circleDirection;
      const perpZ = dx / dist * this.circleDirection;
      return { type: CombatActionType.Move, direction: { x: perpX, z: perpZ } };
    }

    // Choose attack
    const roll = Math.random();
    if (roll < this.profile.heavyAttackChance) {
      this.attackCooldown = HEAVY_ATTACK_COOLDOWN + (this.profile.attackDelay ?? 0);
      return { type: CombatActionType.HeavyAttack };
    } else if (roll < this.profile.heavyAttackChance + (this.profile.blockChance ?? 0.1)) {
      return { type: CombatActionType.Block };
    } else {
      this.attackCooldown = LIGHT_ATTACK_COOLDOWN + (this.profile.attackDelay ?? 0);
      return { type: CombatActionType.LightAttack };
    }
  }
}

// ---------------------------------------------------------------------------
// Boss Combat AI  (multi-phase)
// ---------------------------------------------------------------------------

export class BossCombatAI {
  private currentPhaseIndex = 0;
  private phaseTimer = 0;
  private specialCooldown = 0;
  private summonCooldown = 0;

  constructor(private phases: BossPhase[]) {}

  get currentPhase(): BossPhase {
    return this.phases[this.currentPhaseIndex];
  }

  update(
    self: CombatantState,
    target: CombatantState,
    dt: number,
  ): CombatAction | null {
    this.phaseTimer += dt;
    this.specialCooldown -= dt;
    this.summonCooldown -= dt;

    // Phase transitions
    const hpPercent = self.hp / self.maxHp;
    for (let i = this.currentPhaseIndex + 1; i < this.phases.length; i++) {
      if (hpPercent <= this.phases[i].hpThreshold) {
        this.currentPhaseIndex = i;
        this.phaseTimer = 0;
        // Return a phase-transition action for the HUD to show
        return {
          type: CombatActionType.Special,
          specialId: "phase_transition",
          data: { phase: i, name: this.phases[i].name },
        };
      }
    }

    const phase = this.currentPhase;

    // Summon adds
    if (phase.canSummon && this.summonCooldown <= 0) {
      this.summonCooldown = phase.summonCooldown ?? 15;
      return {
        type: CombatActionType.Special,
        specialId: "summon_adds",
        data: { count: phase.summonCount ?? 2, enemyType: phase.summonType ?? "skeleton" },
      };
    }

    // Special attack
    if (this.specialCooldown <= 0 && phase.specialAttacks.length > 0) {
      const idx = Math.floor(Math.random() * phase.specialAttacks.length);
      const special = phase.specialAttacks[idx];
      this.specialCooldown = special.cooldown;
      return {
        type: CombatActionType.Special,
        specialId: special.id,
        data: {
          damage: special.damage,
          element: special.element,
          areaRadius: special.areaRadius,
        },
      };
    }

    // Default melee
    const dx = target.position.x - self.position.x;
    const dz = target.position.z - self.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist > (phase.attackRange ?? 3)) {
      return { type: CombatActionType.Move, direction: { x: dx / dist, z: dz / dist } };
    }

    return {
      type: Math.random() < 0.4
        ? CombatActionType.HeavyAttack
        : CombatActionType.LightAttack,
    };
  }
}

// ---------------------------------------------------------------------------
// Companion Combat AI
// ---------------------------------------------------------------------------

export class CompanionCombatAI {
  private healCooldown = 0;

  constructor(private role: CompanionCombatRole) {}

  update(
    self: CombatantState,
    player: CombatantState,
    enemies: CombatantState[],
    dt: number,
  ): CombatAction | null {
    this.healCooldown -= dt;

    switch (this.role) {
      case "healer":
        return this.healerBehavior(self, player, enemies);
      case "defender":
        return this.defenderBehavior(self, player, enemies);
      case "attacker":
      default:
        return this.attackerBehavior(self, player, enemies);
    }
  }

  private healerBehavior(
    self: CombatantState,
    player: CombatantState,
    _enemies: CombatantState[],
  ): CombatAction | null {
    // Heal player if low
    if (player.hp / player.maxHp < 0.5 && self.mp >= 35 && this.healCooldown <= 0) {
      this.healCooldown = 8;
      return { type: CombatActionType.SpellCast, spellId: "healing_touch", target: player };
    }
    // Stay near player
    const dx = player.position.x - self.position.x;
    const dz = player.position.z - self.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > 5) {
      return { type: CombatActionType.Move, direction: { x: dx / dist, z: dz / dist } };
    }
    return null;
  }

  private defenderBehavior(
    self: CombatantState,
    player: CombatantState,
    enemies: CombatantState[],
  ): CombatAction | null {
    // Interpose between player and closest enemy
    const closest = this.closestEnemy(player, enemies);
    if (!closest) return null;

    const midX = (player.position.x + closest.position.x) / 2;
    const midZ = (player.position.z + closest.position.z) / 2;
    const dx = midX - self.position.x;
    const dz = midZ - self.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist > 2) {
      return { type: CombatActionType.Move, direction: { x: dx / dist, z: dz / dist } };
    }

    return { type: CombatActionType.Block };
  }

  private attackerBehavior(
    self: CombatantState,
    _player: CombatantState,
    enemies: CombatantState[],
  ): CombatAction | null {
    const closest = this.closestEnemy(self, enemies);
    if (!closest) return null;

    const dx = closest.position.x - self.position.x;
    const dz = closest.position.z - self.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist > 2) {
      return { type: CombatActionType.Move, direction: { x: dx / dist, z: dz / dist } };
    }

    return {
      type: Math.random() < 0.7
        ? CombatActionType.LightAttack
        : CombatActionType.HeavyAttack,
    };
  }

  private closestEnemy(
    ref: CombatantState,
    enemies: CombatantState[],
  ): CombatantState | null {
    let best: CombatantState | null = null;
    let bestDist = Infinity;
    for (const e of enemies) {
      if (e.hp <= 0) continue;
      const dx = e.position.x - ref.position.x;
      const dz = e.position.z - ref.position.z;
      const d = dx * dx + dz * dz;
      if (d < bestDist) {
        bestDist = d;
        best = e;
      }
    }
    return best;
  }
}

// ---------------------------------------------------------------------------
// Death & Respawn
// ---------------------------------------------------------------------------

export class DeathRespawnHandler {
  isDead = false;
  private timer = 0;
  private respawnPosition = { x: 0, y: 0, z: 0 };

  setRespawnPoint(pos: { x: number; y: number; z: number }): void {
    this.respawnPosition = { ...pos };
  }

  die(): void {
    this.isDead = true;
    this.timer = RESPAWN_DELAY;
  }

  update(dt: number): { x: number; y: number; z: number } | null {
    if (!this.isDead) return null;
    this.timer -= dt;
    if (this.timer <= 0) {
      this.isDead = false;
      return { ...this.respawnPosition };
    }
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main CombatSystem – orchestrates everything per frame
// ---------------------------------------------------------------------------

export class ArthurianRPGCombatSystem {
  private comboTracker = new ComboTracker();
  private dodgeHandler = new DodgeRollHandler();
  private healingHandler = new HealingHandler();
  private spellCaster = new SpellCaster();
  private deathHandler = new DeathRespawnHandler();
  private poiseTrackers: Map<string, PoiseTracker> = new Map();
  private activeEffects: Map<string, ActiveEffect[]> = new Map();
  private enemyAIs: Map<string, EnemyCombatAI> = new Map();
  private bossAI: BossCombatAI | null = null;
  private companionAIs: Map<string, CompanionCombatAI> = new Map();

  private pendingHits: HitResult[] = [];

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  registerEnemy(id: string, profile: EnemyAIProfile, maxPoise: number): void {
    this.enemyAIs.set(id, new EnemyCombatAI(profile));
    this.poiseTrackers.set(id, new PoiseTracker(maxPoise));
    this.activeEffects.set(id, []);
  }

  registerBoss(phases: BossPhase[], maxPoise: number): void {
    this.bossAI = new BossCombatAI(phases);
    this.poiseTrackers.set("boss", new PoiseTracker(maxPoise));
    this.activeEffects.set("boss", []);
  }

  registerCompanion(id: string, role: CompanionCombatRole): void {
    this.companionAIs.set(id, new CompanionCombatAI(role));
    this.activeEffects.set(id, []);
  }

  setRespawnPoint(pos: { x: number; y: number; z: number }): void {
    this.deathHandler.setRespawnPoint(pos);
  }

  // -----------------------------------------------------------------------
  // Player actions
  // -----------------------------------------------------------------------

  playerLightAttack(player: CombatantState, target: CombatantState, time: number): HitResult | null {
    if (this.healingHandler.isLocked || this.spellCaster.isCasting) return null;
    const action: CombatAction = { type: CombatActionType.LightAttack };
    this.comboTracker.registerHit(time);
    return this.resolveHit(player, target, action);
  }

  playerHeavyAttack(player: CombatantState, target: CombatantState): HitResult | null {
    if (this.healingHandler.isLocked || this.spellCaster.isCasting) return null;
    this.comboTracker.reset();
    const action: CombatAction = { type: CombatActionType.HeavyAttack };
    return this.resolveHit(player, target, action);
  }

  playerBlock(player: CombatantState, dt: number): void {
    const cost = BLOCK_STAMINA_COST_PER_SEC * dt;
    if (player.stamina >= cost) {
      player.isBlocking = true;
      player.stamina -= cost;
    } else {
      player.isBlocking = false;
    }
  }

  playerStopBlock(player: CombatantState): void {
    player.isBlocking = false;
  }

  playerDodge(dirX: number, dirZ: number, player: CombatantState): boolean {
    const ok = this.dodgeHandler.attempt(dirX, dirZ, player.stamina);
    if (ok) player.stamina -= DODGE_ROLL_STAMINA_COST;
    return ok;
  }

  playerCastSpell(spellId: string, player: CombatantState): boolean {
    if (this.healingHandler.isLocked) return false;
    const spell = this.spellCaster.beginCast(spellId, player.mp);
    if (spell) {
      player.mp -= spell.manaCost;
      return true;
    }
    return false;
  }

  playerHeal(player: CombatantState, healAmount: number): boolean {
    return this.healingHandler.beginHeal(player, healAmount);
  }

  // -----------------------------------------------------------------------
  // Hit resolution
  // -----------------------------------------------------------------------

  private resolveHit(
    attacker: CombatantState,
    defender: CombatantState,
    action: CombatAction,
  ): HitResult {
    let dmg = calculateDamage(attacker, defender, action, this.comboTracker.getState());

    // Dodge i-frames check
    if (this.dodgeHandler.isInvincible) {
      return { damage: 0, blocked: false, dodged: true, critical: false, staggered: false, killed: false };
    }

    // Block mitigation
    dmg = processBlock(defender, dmg);

    // Apply damage
    defender.hp = Math.max(0, defender.hp - dmg.amount);

    // Poise / stagger
    const poise = this.poiseTrackers.get(defender.id);
    let staggered = false;
    if (poise && !dmg.isBlocked) {
      staggered = poise.applyPoiseDamage(dmg.staggerDamage);
    }

    // Apply on-hit effects (e.g. burning)
    const weaponEffect = attacker.equipment.mainHand?.onHitEffect;
    if (weaponEffect) {
      const effects = this.activeEffects.get(defender.id) ?? [];
      effects.push({ ...weaponEffect, elapsed: 0 });
      this.activeEffects.set(defender.id, effects);
    }

    const result: HitResult = {
      damage: dmg.amount,
      blocked: dmg.isBlocked,
      dodged: false,
      critical: dmg.isCritical,
      staggered,
      killed: defender.hp <= 0,
    };
    this.pendingHits.push(result);
    return result;
  }

  // -----------------------------------------------------------------------
  // Frame update
  // -----------------------------------------------------------------------

  update(state: ArthurianRPGState, dt: number): HitResult[] {
    this.pendingHits = [];

    // Update subsystems
    this.dodgeHandler.update(dt);
    this.healingHandler.update(dt);

    // Spell casting tick
    const firedSpell = this.spellCaster.update(dt);
    if (firedSpell && state.player.target) {
      const target = state.player.target;
      if (firedSpell.damage < 0) {
        // heal
        state.player.combatant.hp = Math.min(
          state.player.combatant.maxHp,
          state.player.combatant.hp - firedSpell.damage,
        );
      } else {
        target.hp = Math.max(0, target.hp - firedSpell.damage);
        if (firedSpell.effect) {
          const effects = this.activeEffects.get(target.id) ?? [];
          effects.push({ ...firedSpell.effect, elapsed: 0 } as ActiveEffect);
          this.activeEffects.set(target.id, effects);
        }
      }
    }

    // Poise updates
    for (const [, pt] of this.poiseTrackers) {
      pt.update(dt);
    }

    // Active effects
    for (const [id, effects] of this.activeEffects) {
      const combatant = state.getCombatantById(id);
      if (combatant) {
        this.activeEffects.set(id, applyActiveEffects(combatant, effects, dt));
      }
    }

    // Enemy AI decisions
    for (const [id, ai] of this.enemyAIs) {
      const enemy = state.getCombatantById(id);
      if (!enemy || enemy.hp <= 0) continue;
      const action = ai.update(enemy, state.player.combatant, dt);
      if (action && action.type === CombatActionType.LightAttack) {
        this.resolveHit(enemy, state.player.combatant, action);
      } else if (action && action.type === CombatActionType.HeavyAttack) {
        this.resolveHit(enemy, state.player.combatant, action);
      }
    }

    // Boss AI
    if (this.bossAI) {
      const boss = state.getCombatantById("boss");
      if (boss && boss.hp > 0) {
        const action = this.bossAI.update(boss, state.player.combatant, dt);
        if (action) {
          if (
            action.type === CombatActionType.LightAttack ||
            action.type === CombatActionType.HeavyAttack
          ) {
            this.resolveHit(boss, state.player.combatant, action);
          }
          // Special actions are emitted via pendingHits for the HUD
        }
      }
    }

    // Companion AI
    const aliveEnemies = state.getAliveEnemies();
    for (const [id, ai] of this.companionAIs) {
      const companion = state.getCombatantById(id);
      if (!companion || companion.hp <= 0) continue;
      const action = ai.update(companion, state.player.combatant, aliveEnemies, dt);
      if (action && (
        action.type === CombatActionType.LightAttack ||
        action.type === CombatActionType.HeavyAttack
      )) {
        const target = this.closestTo(companion, aliveEnemies);
        if (target) this.resolveHit(companion, target, action);
      }
    }

    // Player death check
    if (state.player.combatant.hp <= 0 && !this.deathHandler.isDead) {
      this.deathHandler.die();
    }
    const respawnPos = this.deathHandler.update(dt);
    if (respawnPos) {
      state.player.combatant.hp = state.player.combatant.maxHp;
      state.player.combatant.mp = state.player.combatant.maxMp;
      state.player.combatant.stamina = state.player.combatant.maxStamina;
      state.player.combatant.position = respawnPos;
    }

    // Stamina / mana regen
    const pc = state.player.combatant;
    if (!pc.isBlocking && !this.dodgeHandler.isRolling) {
      pc.stamina = Math.min(pc.maxStamina, pc.stamina + 12 * dt);
    }
    pc.mp = Math.min(pc.maxMp, pc.mp + 3 * dt);

    return this.pendingHits;
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  private closestTo(ref: CombatantState, list: CombatantState[]): CombatantState | null {
    let best: CombatantState | null = null;
    let bestD = Infinity;
    for (const c of list) {
      const dx = c.position.x - ref.position.x;
      const dz = c.position.z - ref.position.z;
      const d = dx * dx + dz * dz;
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  }

  getComboChain(): number {
    return this.comboTracker.chain;
  }

  isPlayerDead(): boolean {
    return this.deathHandler.isDead;
  }

  getSpellCastProgress(): number {
    return this.spellCaster.getCastProgress();
  }

  getSpellBook(): SpellDef[] {
    return this.spellCaster.getSpellBook();
  }

  isDodging(): boolean {
    return this.dodgeHandler.isRolling;
  }

  isHealing(): boolean {
    return this.healingHandler.isLocked;
  }
}
