// Upgrade definitions for blacksmith
import { UpgradeType } from "@/types";

export interface UpgradeDef {
  type: UpgradeType;
  cost: number;
  manaCost?: number; // If set, deducts mana instead of gold
  maxLevel: number;
  effect: number; // percentage multiplier (e.g., 0.2 for 20%)
  description: string;
  appliesTo: UnitType[];
  isSpell?: boolean; // If true, this is a repeatable spell (no permanent level)
  summonUnit?: UnitType; // Unit type summoned by spell placement
  spellType?: "summon" | "damage" | "heal"; // Type of spell effect
  spellDamage?: number; // Damage dealt to enemies in radius
  spellHeal?: number; // HP restored to friendlies in radius
  spellRadius?: number; // Area of effect radius in tiles
  spellSchool?: "elemental" | "arcane" | "divine" | "shadow" | "conjuration";
  spellTier?: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  spellMagicType?: "fire" | "ice" | "lightning" | "earth" | "arcane" | "holy" | "shadow" | "poison" | "void" | "death" | "nature";
  // Debuff effects applied by the spell projectile
  spellSlowDuration?: number;   // Seconds of slow to apply on hit
  spellSlowFactor?: number;     // Speed multiplier while slowed (e.g. 0.5 = 50%)
  spellTeleportDistance?: number; // Random displacement on hit (tiles)
}

import { UnitType } from "@/types";

export const UPGRADE_DEFINITIONS: Record<UpgradeType, UpgradeDef> = {
  [UpgradeType.MELEE_DAMAGE]: {
    type: UpgradeType.MELEE_DAMAGE,
    cost: 500,
    maxLevel: 3,
    effect: 0.2, // 20% damage increase per level
    description: "Increases melee unit damage by 20%.",
    appliesTo: [
      UnitType.SWORDSMAN,
      UnitType.PIKEMAN,
      UnitType.KNIGHT,
      UnitType.QUESTING_KNIGHT,
      UnitType.MAGE_HUNTER,
      UnitType.GLADIATOR,
      UnitType.HERO,
    ],
  },
  [UpgradeType.MELEE_HEALTH]: {
    type: UpgradeType.MELEE_HEALTH,
    cost: 500,
    maxLevel: 3,
    effect: 0.2, // 20% health increase per level
    description: "Increases melee unit health by 20%.",
    appliesTo: [
      UnitType.SWORDSMAN,
      UnitType.PIKEMAN,
      UnitType.KNIGHT,
      UnitType.QUESTING_KNIGHT,
      UnitType.MAGE_HUNTER,
      UnitType.GLADIATOR,
      UnitType.HERO,
    ],
  },
  [UpgradeType.RANGED_DAMAGE]: {
    type: UpgradeType.RANGED_DAMAGE,
    cost: 500,
    maxLevel: 3,
    effect: 0.2, // 20% damage increase per level
    description: "Increases ranged unit damage by 20%.",
    appliesTo: [
      UnitType.ARCHER,
      UnitType.CROSSBOWMAN,
      UnitType.LONGBOWMAN,
      UnitType.ELVEN_ARCHER,
    ],
  },
  [UpgradeType.RANGED_HEALTH]: {
    type: UpgradeType.RANGED_HEALTH,
    cost: 500,
    maxLevel: 3,
    effect: 0.2, // 20% health increase per level
    description: "Increases ranged unit health by 20%.",
    appliesTo: [
      UnitType.ARCHER,
      UnitType.CROSSBOWMAN,
      UnitType.LONGBOWMAN,
      UnitType.ELVEN_ARCHER,
    ],
  },
  [UpgradeType.SIEGE_DAMAGE]: {
    type: UpgradeType.SIEGE_DAMAGE,
    cost: 500,
    maxLevel: 3,
    effect: 0.2, // 20% damage increase per level
    description: "Increases siege unit damage by 20%.",
    appliesTo: [
      UnitType.BALLISTA,
      UnitType.BATTERING_RAM,
    ],
  },
  [UpgradeType.SIEGE_HEALTH]: {
    type: UpgradeType.SIEGE_HEALTH,
    cost: 500,
    maxLevel: 3,
    effect: 0.2, // 20% health increase per level
    description: "Increases siege unit health by 20%.",
    appliesTo: [
      UnitType.BALLISTA,
      UnitType.BATTERING_RAM,
    ],
  },
  [UpgradeType.CREATURE_DAMAGE]: {
    type: UpgradeType.CREATURE_DAMAGE,
    cost: 500,
    maxLevel: 3,
    effect: 0.2, // 20% damage increase per level
    description: "Increases creature unit damage by 20%.",
    appliesTo: [
      UnitType.CYCLOPS,
      UnitType.RED_DRAGON,
      UnitType.FROST_DRAGON,
    ],
  },
  [UpgradeType.CREATURE_HEALTH]: {
    type: UpgradeType.CREATURE_HEALTH,
    cost: 500,
    maxLevel: 3,
    effect: 0.2, // 20% health increase per level
    description: "Increases creature unit health by 20%.",
    appliesTo: [
      UnitType.CYCLOPS,
      UnitType.RED_DRAGON,
      UnitType.FROST_DRAGON,
    ],
  },
  [UpgradeType.MAGE_RANGE]: {
    type: UpgradeType.MAGE_RANGE,
    cost: 500,
    maxLevel: 3,
    effect: 0.1, // 10% range increase per level
    description: "Increases mage unit range by 10%.",
    appliesTo: [
      UnitType.FIRE_MAGE,
      UnitType.STORM_MAGE,
      UnitType.COLD_MAGE,
      UnitType.DISTORTION_MAGE,
      UnitType.SUMMONER,
    ],
  },
  [UpgradeType.FLAG]: {
    type: UpgradeType.FLAG,
    cost: 500,
    maxLevel: 1,
    effect: 0,
    description: "Unlock rally flag (F key, 100g per use).",
    appliesTo: [],
  },
  [UpgradeType.TOWER_RANGE]: {
    type: UpgradeType.TOWER_RANGE,
    cost: 500,
    maxLevel: 3,
    effect: 1, // +1 tile range per level (additive)
    description: "Increases all tower turret range by 1 tile.",
    appliesTo: [],
  },
  [UpgradeType.TOWER_DAMAGE]: {
    type: UpgradeType.TOWER_DAMAGE,
    cost: 500,
    maxLevel: 3,
    effect: 0.2, // 20% damage increase per level
    description: "Increases all tower turret damage by 20%.",
    appliesTo: [],
  },
  [UpgradeType.TOWER_HEALTH]: {
    type: UpgradeType.TOWER_HEALTH,
    cost: 500,
    maxLevel: 3,
    effect: 0.3, // 30% health increase per level
    description: "Increases all tower building health by 30%.",
    appliesTo: [],
  },
  [UpgradeType.TOWER_COST]: {
    type: UpgradeType.TOWER_COST,
    cost: 500,
    maxLevel: 3,
    effect: 0.15, // 15% cost reduction per level
    description: "Reduces the gold cost of all tower buildings by 15%.",
    appliesTo: [],
  },
  [UpgradeType.SETTLER]: {
    type: UpgradeType.SETTLER,
    cost: 600,
    maxLevel: 5,
    effect: 0,
    description: "Deploy a settler to construct a forward castle on neutral land.",
    appliesTo: [],
  },
  [UpgradeType.ENGINEER]: {
    type: UpgradeType.ENGINEER,
    cost: 350,
    maxLevel: 5,
    effect: 0,
    description: "Deploy an engineer to construct a forward tower on neutral land.",
    appliesTo: [],
  },
  // ═══════════════════════════════════════════════════════════════
  // CONJURATION SCHOOL — Summoning creatures
  // ═══════════════════════════════════════════════════════════════

  [UpgradeType.SUMMON_BAT_SWARM]: {
    type: UpgradeType.SUMMON_BAT_SWARM, cost: 0, manaCost: 25, maxLevel: 99, effect: 0,
    description: "Release a bat from the archive belfry.", appliesTo: [],
    isSpell: true, spellType: "summon", summonUnit: UnitType.BAT,
    spellSchool: "conjuration", spellTier: 1, spellMagicType: "nature",
  },
  [UpgradeType.SUMMON_SPIDER_BROOD]: {
    type: UpgradeType.SUMMON_SPIDER_BROOD, cost: 0, manaCost: 30, maxLevel: 99, effect: 0,
    description: "Spawn a venomous spider from shadow webs.", appliesTo: [],
    isSpell: true, spellType: "summon", summonUnit: UnitType.SPIDER,
    spellSchool: "conjuration", spellTier: 1, spellMagicType: "nature",
  },
  [UpgradeType.SUMMON_PIXIE]: {
    type: UpgradeType.SUMMON_PIXIE, cost: 0, manaCost: 50, maxLevel: 99, effect: 0,
    description: "Summon a pixie at the target location.", appliesTo: [],
    isSpell: true, spellType: "summon", summonUnit: UnitType.PIXIE,
    spellSchool: "conjuration", spellTier: 1, spellMagicType: "nature",
  },
  [UpgradeType.SUMMON_UNICORN]: {
    type: UpgradeType.SUMMON_UNICORN, cost: 0, manaCost: 100, maxLevel: 99, effect: 0,
    description: "Summon a majestic unicorn at the target location.", appliesTo: [],
    isSpell: true, spellType: "summon", summonUnit: UnitType.UNICORN,
    spellSchool: "conjuration", spellTier: 2, spellMagicType: "nature",
  },
  [UpgradeType.SUMMON_TROLL]: {
    type: UpgradeType.SUMMON_TROLL, cost: 0, manaCost: 120, maxLevel: 99, effect: 0,
    description: "Summon a regenerating troll warrior.", appliesTo: [],
    isSpell: true, spellType: "summon", summonUnit: UnitType.TROLL,
    spellSchool: "conjuration", spellTier: 2, spellMagicType: "earth",
  },
  [UpgradeType.SUMMON_FIRE_ELEMENTAL]: {
    type: UpgradeType.SUMMON_FIRE_ELEMENTAL, cost: 0, manaCost: 150, maxLevel: 99, effect: 0,
    description: "Conjure a fire elemental from the arcane flames.", appliesTo: [],
    isSpell: true, spellType: "summon", summonUnit: UnitType.FIRE_ELEMENTAL,
    spellSchool: "conjuration", spellTier: 2, spellMagicType: "fire",
  },
  [UpgradeType.SUMMON_ICE_ELEMENTAL]: {
    type: UpgradeType.SUMMON_ICE_ELEMENTAL, cost: 0, manaCost: 150, maxLevel: 99, effect: 0,
    description: "Crystallize an ice elemental from frozen mana.", appliesTo: [],
    isSpell: true, spellType: "summon", summonUnit: UnitType.ICE_ELEMENTAL,
    spellSchool: "conjuration", spellTier: 2, spellMagicType: "ice",
  },
  [UpgradeType.SUMMON_DARK_SAVANT]: {
    type: UpgradeType.SUMMON_DARK_SAVANT, cost: 0, manaCost: 250, maxLevel: 99, effect: 0,
    description: "Bind a dark savant from the forbidden tomes.", appliesTo: [],
    isSpell: true, spellType: "summon", summonUnit: UnitType.DARK_SAVANT,
    spellSchool: "conjuration", spellTier: 3, spellMagicType: "shadow",
  },
  [UpgradeType.SUMMON_ANGEL]: {
    type: UpgradeType.SUMMON_ANGEL, cost: 0, manaCost: 300, maxLevel: 99, effect: 0,
    description: "Call down a divine angel from the heavens.", appliesTo: [],
    isSpell: true, spellType: "summon", summonUnit: UnitType.ANGEL,
    spellSchool: "conjuration", spellTier: 3, spellMagicType: "holy",
  },
  [UpgradeType.SUMMON_CYCLOPS]: {
    type: UpgradeType.SUMMON_CYCLOPS, cost: 0, manaCost: 400, maxLevel: 99, effect: 0,
    description: "Awaken a mighty cyclops from its ancient slumber.", appliesTo: [],
    isSpell: true, spellType: "summon", summonUnit: UnitType.CYCLOPS,
    spellSchool: "conjuration", spellTier: 3, spellMagicType: "earth",
  },
  [UpgradeType.SUMMON_RED_DRAGON]: {
    type: UpgradeType.SUMMON_RED_DRAGON, cost: 0, manaCost: 500, maxLevel: 99, effect: 0,
    description: "Call forth a fearsome red dragon from the arcane depths.", appliesTo: [],
    isSpell: true, spellType: "summon", summonUnit: UnitType.RED_DRAGON,
    spellSchool: "conjuration", spellTier: 4, spellMagicType: "fire",
  },
  [UpgradeType.SUMMON_FROST_DRAGON]: {
    type: UpgradeType.SUMMON_FROST_DRAGON, cost: 0, manaCost: 500, maxLevel: 99, effect: 0,
    description: "Summon an ancient frost dragon wreathed in blizzard.", appliesTo: [],
    isSpell: true, spellType: "summon", summonUnit: UnitType.FROST_DRAGON,
    spellSchool: "conjuration", spellTier: 4, spellMagicType: "ice",
  },

  // ═══════════════════════════════════════════════════════════════
  // ELEMENTAL SCHOOL — Fire, ice, lightning, earth
  // ═══════════════════════════════════════════════════════════════

  [UpgradeType.SPELL_FROST_NOVA]: {
    type: UpgradeType.SPELL_FROST_NOVA, cost: 0, manaCost: 35, maxLevel: 99, effect: 0,
    description: "Freezing burst that radiates outward.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 18, spellRadius: 2,
    spellSchool: "elemental", spellTier: 1, spellMagicType: "ice",
    spellSlowDuration: 1.5, spellSlowFactor: 0.6,
  },
  [UpgradeType.SPELL_LIGHTNING_STRIKE]: {
    type: UpgradeType.SPELL_LIGHTNING_STRIKE, cost: 0, manaCost: 50, maxLevel: 99, effect: 0,
    description: "Call down a focused lightning bolt on a single point.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 45, spellRadius: 1,
    spellSchool: "elemental", spellTier: 2, spellMagicType: "lightning",
  },
  [UpgradeType.SPELL_FIREBALL]: {
    type: UpgradeType.SPELL_FIREBALL, cost: 0, manaCost: 60, maxLevel: 99, effect: 0,
    description: "Hurl a blazing fireball that explodes on impact.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 35, spellRadius: 2,
    spellSchool: "elemental", spellTier: 2, spellMagicType: "fire",
  },
  [UpgradeType.SPELL_CHAIN_LIGHTNING]: {
    type: UpgradeType.SPELL_CHAIN_LIGHTNING, cost: 0, manaCost: 65, maxLevel: 99, effect: 0,
    description: "Arcing bolts bounce between foes.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 28, spellRadius: 2.5,
    spellSchool: "elemental", spellTier: 2, spellMagicType: "lightning",
  },
  [UpgradeType.SPELL_BLIZZARD]: {
    type: UpgradeType.SPELL_BLIZZARD, cost: 0, manaCost: 80, maxLevel: 99, effect: 0,
    description: "Unleash a freezing blizzard across a wide area.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 25, spellRadius: 3,
    spellSchool: "elemental", spellTier: 2, spellMagicType: "ice",
    spellSlowDuration: 2.0, spellSlowFactor: 0.5,
  },
  [UpgradeType.SPELL_EARTHQUAKE]: {
    type: UpgradeType.SPELL_EARTHQUAKE, cost: 0, manaCost: 120, maxLevel: 99, effect: 0,
    description: "Shake the earth beneath your foes across a vast area.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 30, spellRadius: 4,
    spellSchool: "elemental", spellTier: 3, spellMagicType: "earth",
  },
  [UpgradeType.SPELL_METEOR_STRIKE]: {
    type: UpgradeType.SPELL_METEOR_STRIKE, cost: 0, manaCost: 200, maxLevel: 99, effect: 0,
    description: "Summon a devastating meteor from the heavens.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 60, spellRadius: 2.5,
    spellSchool: "elemental", spellTier: 3, spellMagicType: "fire",
  },
  [UpgradeType.SPELL_INFERNO]: {
    type: UpgradeType.SPELL_INFERNO, cost: 0, manaCost: 350, maxLevel: 99, effect: 0,
    description: "Massive column of flame engulfs the area.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 55, spellRadius: 3.5,
    spellSchool: "elemental", spellTier: 4, spellMagicType: "fire",
  },

  // ═══════════════════════════════════════════════════════════════
  // ARCANE SCHOOL — Pure magical energy
  // ═══════════════════════════════════════════════════════════════

  [UpgradeType.SPELL_ARCANE_MISSILE]: {
    type: UpgradeType.SPELL_ARCANE_MISSILE, cost: 0, manaCost: 30, maxLevel: 99, effect: 0,
    description: "Launch an arcane bolt that damages enemies in a small area.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 20, spellRadius: 1.5,
    spellSchool: "arcane", spellTier: 1, spellMagicType: "arcane",
  },
  [UpgradeType.SPELL_MANA_SURGE]: {
    type: UpgradeType.SPELL_MANA_SURGE, cost: 0, manaCost: 85, maxLevel: 99, effect: 0,
    description: "Raw mana detonation that sears all nearby.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 32, spellRadius: 2,
    spellSchool: "arcane", spellTier: 2, spellMagicType: "arcane",
  },
  [UpgradeType.SPELL_ARCANE_BARRAGE]: {
    type: UpgradeType.SPELL_ARCANE_BARRAGE, cost: 0, manaCost: 170, maxLevel: 99, effect: 0,
    description: "Rapid bombardment of arcane bolts.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 45, spellRadius: 2.5,
    spellSchool: "arcane", spellTier: 3, spellMagicType: "arcane",
  },
  [UpgradeType.SPELL_ARCANE_STORM]: {
    type: UpgradeType.SPELL_ARCANE_STORM, cost: 0, manaCost: 250, maxLevel: 99, effect: 0,
    description: "Conjure a massive arcane tempest that ravages a huge area.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 40, spellRadius: 3.5,
    spellSchool: "arcane", spellTier: 3, spellMagicType: "arcane",
  },
  [UpgradeType.SPELL_TEMPORAL_BLAST]: {
    type: UpgradeType.SPELL_TEMPORAL_BLAST, cost: 0, manaCost: 400, maxLevel: 99, effect: 0,
    description: "Time-warping explosion tears the fabric of reality.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 75, spellRadius: 3,
    spellSchool: "arcane", spellTier: 4, spellMagicType: "arcane",
  },

  // ═══════════════════════════════════════════════════════════════
  // DIVINE SCHOOL — Holy damage + healing
  // ═══════════════════════════════════════════════════════════════

  [UpgradeType.SPELL_BLESSING_OF_LIGHT]: {
    type: UpgradeType.SPELL_BLESSING_OF_LIGHT, cost: 0, manaCost: 30, maxLevel: 99, effect: 0,
    description: "Small restorative blessing upon nearby allies.", appliesTo: [],
    isSpell: true, spellType: "heal", spellHeal: 20, spellRadius: 1.5,
    spellSchool: "divine", spellTier: 1, spellMagicType: "holy",
  },
  [UpgradeType.SPELL_HEALING_WAVE]: {
    type: UpgradeType.SPELL_HEALING_WAVE, cost: 0, manaCost: 50, maxLevel: 99, effect: 0,
    description: "Send a wave of restorative energy to heal nearby allies.", appliesTo: [],
    isSpell: true, spellType: "heal", spellHeal: 30, spellRadius: 2,
    spellSchool: "divine", spellTier: 1, spellMagicType: "holy",
  },
  [UpgradeType.SPELL_HOLY_SMITE]: {
    type: UpgradeType.SPELL_HOLY_SMITE, cost: 0, manaCost: 70, maxLevel: 99, effect: 0,
    description: "Strike enemies with divine radiance.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 30, spellRadius: 1.5,
    spellSchool: "divine", spellTier: 2, spellMagicType: "holy",
  },
  [UpgradeType.SPELL_PURIFYING_FLAME]: {
    type: UpgradeType.SPELL_PURIFYING_FLAME, cost: 0, manaCost: 75, maxLevel: 99, effect: 0,
    description: "Holy fire scorches the impure.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 28, spellRadius: 2,
    spellSchool: "divine", spellTier: 2, spellMagicType: "holy",
  },
  [UpgradeType.SPELL_DIVINE_RESTORATION]: {
    type: UpgradeType.SPELL_DIVINE_RESTORATION, cost: 0, manaCost: 120, maxLevel: 99, effect: 0,
    description: "Call upon divine power to restore health to all allies in a large area.", appliesTo: [],
    isSpell: true, spellType: "heal", spellHeal: 60, spellRadius: 3,
    spellSchool: "divine", spellTier: 3, spellMagicType: "holy",
  },
  [UpgradeType.SPELL_RADIANT_NOVA]: {
    type: UpgradeType.SPELL_RADIANT_NOVA, cost: 0, manaCost: 160, maxLevel: 99, effect: 0,
    description: "Burst of radiant healing energy.", appliesTo: [],
    isSpell: true, spellType: "heal", spellHeal: 50, spellRadius: 2.5,
    spellSchool: "divine", spellTier: 3, spellMagicType: "holy",
  },
  [UpgradeType.SPELL_CELESTIAL_WRATH]: {
    type: UpgradeType.SPELL_CELESTIAL_WRATH, cost: 0, manaCost: 350, maxLevel: 99, effect: 0,
    description: "Grand divine judgment from above.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 65, spellRadius: 3,
    spellSchool: "divine", spellTier: 4, spellMagicType: "holy",
  },

  // ═══════════════════════════════════════════════════════════════
  // SHADOW SCHOOL — Dark, void, poison
  // ═══════════════════════════════════════════════════════════════

  [UpgradeType.SPELL_SHADOW_BOLT]: {
    type: UpgradeType.SPELL_SHADOW_BOLT, cost: 0, manaCost: 30, maxLevel: 99, effect: 0,
    description: "Focused bolt of dark energy.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 22, spellRadius: 1,
    spellSchool: "shadow", spellTier: 1, spellMagicType: "shadow",
  },
  [UpgradeType.SPELL_POISON_CLOUD]: {
    type: UpgradeType.SPELL_POISON_CLOUD, cost: 0, manaCost: 40, maxLevel: 99, effect: 0,
    description: "Release a noxious cloud that weakens enemies in a wide area.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 15, spellRadius: 3,
    spellSchool: "shadow", spellTier: 1, spellMagicType: "poison",
    spellSlowDuration: 3.0, spellSlowFactor: 0.7,
  },
  [UpgradeType.SPELL_CURSE_OF_DARKNESS]: {
    type: UpgradeType.SPELL_CURSE_OF_DARKNESS, cost: 0, manaCost: 65, maxLevel: 99, effect: 0,
    description: "Draining darkness spreads across the land.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 20, spellRadius: 2.5,
    spellSchool: "shadow", spellTier: 2, spellMagicType: "shadow",
  },
  [UpgradeType.SPELL_DEATH_COIL]: {
    type: UpgradeType.SPELL_DEATH_COIL, cost: 0, manaCost: 90, maxLevel: 99, effect: 0,
    description: "Spiraling necrotic energy strikes a focused area.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 38, spellRadius: 1.5,
    spellSchool: "shadow", spellTier: 2, spellMagicType: "death",
  },
  [UpgradeType.SPELL_SIPHON_SOUL]: {
    type: UpgradeType.SPELL_SIPHON_SOUL, cost: 0, manaCost: 140, maxLevel: 99, effect: 0,
    description: "Tears life force from enemies.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 42, spellRadius: 2,
    spellSchool: "shadow", spellTier: 3, spellMagicType: "death",
  },
  [UpgradeType.SPELL_VOID_RIFT]: {
    type: UpgradeType.SPELL_VOID_RIFT, cost: 0, manaCost: 150, maxLevel: 99, effect: 0,
    description: "Tear a rift in reality that damages all caught within.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 50, spellRadius: 2,
    spellSchool: "shadow", spellTier: 3, spellMagicType: "void",
    spellTeleportDistance: 3.0,
  },
  [UpgradeType.SPELL_NETHER_STORM]: {
    type: UpgradeType.SPELL_NETHER_STORM, cost: 0, manaCost: 380, maxLevel: 99, effect: 0,
    description: "Massive shadow tempest of void energy.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 60, spellRadius: 3.5,
    spellSchool: "shadow", spellTier: 4, spellMagicType: "void",
    spellTeleportDistance: 3.5,
  },
  // ═══════════════════════════════════════════════════════════════════════════
  // Gap-fill spells — ensuring every magic type has tiers 1-5
  // ═══════════════════════════════════════════════════════════════════════════
  // ── FIRE ────────────────────────────────────────────────────────────────────
  [UpgradeType.SPELL_FLAME_SPARK]: {
    type: UpgradeType.SPELL_FLAME_SPARK, cost: 0, manaCost: 25, maxLevel: 99, effect: 0,
    description: "A quick burst of flame that scorches nearby enemies.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 15, spellRadius: 1.5,
    spellSchool: "elemental", spellTier: 1, spellMagicType: "fire",
  },
  [UpgradeType.SPELL_PYROCLASM]: {
    type: UpgradeType.SPELL_PYROCLASM, cost: 0, manaCost: 600, maxLevel: 99, effect: 0,
    description: "Volcanic eruption of molten fire consumes the battlefield.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 90, spellRadius: 4,
    spellSchool: "elemental", spellTier: 5, spellMagicType: "fire",
  },
  // ── ICE ─────────────────────────────────────────────────────────────────────
  [UpgradeType.SPELL_GLACIAL_CRUSH]: {
    type: UpgradeType.SPELL_GLACIAL_CRUSH, cost: 0, manaCost: 140, maxLevel: 99, effect: 0,
    description: "Massive ice shards slam inward, crushing all within.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 40, spellRadius: 2.5,
    spellSchool: "elemental", spellTier: 3, spellMagicType: "ice",
    spellSlowDuration: 2.0, spellSlowFactor: 0.4,
  },
  [UpgradeType.SPELL_ABSOLUTE_ZERO]: {
    type: UpgradeType.SPELL_ABSOLUTE_ZERO, cost: 0, manaCost: 600, maxLevel: 99, effect: 0,
    description: "All warmth is extinguished in an instant freeze.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 85, spellRadius: 3.5,
    spellSchool: "elemental", spellTier: 5, spellMagicType: "ice",
    spellSlowDuration: 3.0, spellSlowFactor: 0.3,
  },
  // ── LIGHTNING ───────────────────────────────────────────────────────────────
  [UpgradeType.SPELL_SPARK]: {
    type: UpgradeType.SPELL_SPARK, cost: 0, manaCost: 25, maxLevel: 99, effect: 0,
    description: "A small electric jolt strikes a single target.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 14, spellRadius: 1,
    spellSchool: "elemental", spellTier: 1, spellMagicType: "lightning",
  },
  [UpgradeType.SPELL_THUNDERSTORM]: {
    type: UpgradeType.SPELL_THUNDERSTORM, cost: 0, manaCost: 150, maxLevel: 99, effect: 0,
    description: "A raging thunderstorm rains lightning across the area.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 42, spellRadius: 3,
    spellSchool: "elemental", spellTier: 3, spellMagicType: "lightning",
    spellTeleportDistance: 2.0,
  },
  [UpgradeType.SPELL_BALL_LIGHTNING]: {
    type: UpgradeType.SPELL_BALL_LIGHTNING, cost: 0, manaCost: 350, maxLevel: 99, effect: 0,
    description: "A devastating sphere of plasma arcs electricity to all nearby.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 62, spellRadius: 3,
    spellSchool: "elemental", spellTier: 4, spellMagicType: "lightning",
    spellTeleportDistance: 2.5,
  },
  [UpgradeType.SPELL_MJOLNIR_STRIKE]: {
    type: UpgradeType.SPELL_MJOLNIR_STRIKE, cost: 0, manaCost: 650, maxLevel: 99, effect: 0,
    description: "A divine hammer of lightning crashes down from the heavens.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 95, spellRadius: 4,
    spellSchool: "elemental", spellTier: 5, spellMagicType: "lightning",
    spellTeleportDistance: 3.0,
  },
  // ── EARTH ───────────────────────────────────────────────────────────────────
  [UpgradeType.SPELL_STONE_SHARD]: {
    type: UpgradeType.SPELL_STONE_SHARD, cost: 0, manaCost: 30, maxLevel: 99, effect: 0,
    description: "Hurls a sharp rock shard at nearby enemies.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 16, spellRadius: 1.5,
    spellSchool: "elemental", spellTier: 1, spellMagicType: "earth",
  },
  [UpgradeType.SPELL_LANDSLIDE]: {
    type: UpgradeType.SPELL_LANDSLIDE, cost: 0, manaCost: 320, maxLevel: 99, effect: 0,
    description: "A wall of tumbling boulders crashes through the area.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 58, spellRadius: 3.5,
    spellSchool: "elemental", spellTier: 4, spellMagicType: "earth",
  },
  [UpgradeType.SPELL_TECTONIC_RUIN]: {
    type: UpgradeType.SPELL_TECTONIC_RUIN, cost: 0, manaCost: 600, maxLevel: 99, effect: 0,
    description: "The ground itself splits apart in catastrophic upheaval.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 88, spellRadius: 4,
    spellSchool: "elemental", spellTier: 5, spellMagicType: "earth",
  },
  // ── ARCANE ──────────────────────────────────────────────────────────────────
  [UpgradeType.SPELL_ARCANE_CATACLYSM]: {
    type: UpgradeType.SPELL_ARCANE_CATACLYSM, cost: 0, manaCost: 650, maxLevel: 99, effect: 0,
    description: "An overwhelming detonation of pure arcane energy.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 100, spellRadius: 3.5,
    spellSchool: "arcane", spellTier: 5, spellMagicType: "arcane",
  },
  // ── HOLY ────────────────────────────────────────────────────────────────────
  [UpgradeType.SPELL_DIVINE_MIRACLE]: {
    type: UpgradeType.SPELL_DIVINE_MIRACLE, cost: 0, manaCost: 600, maxLevel: 99, effect: 0,
    description: "A miraculous burst of heavenly light restores all allies.", appliesTo: [],
    isSpell: true, spellType: "heal", spellHeal: 100, spellRadius: 4,
    spellSchool: "divine", spellTier: 5, spellMagicType: "holy",
  },
  // ── SHADOW ──────────────────────────────────────────────────────────────────
  [UpgradeType.SPELL_SHADOW_PLAGUE]: {
    type: UpgradeType.SPELL_SHADOW_PLAGUE, cost: 0, manaCost: 350, maxLevel: 99, effect: 0,
    description: "Creeping dark tendrils spread disease and decay.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 58, spellRadius: 3,
    spellSchool: "shadow", spellTier: 4, spellMagicType: "shadow",
  },
  [UpgradeType.SPELL_OBLIVION]: {
    type: UpgradeType.SPELL_OBLIVION, cost: 0, manaCost: 650, maxLevel: 99, effect: 0,
    description: "A vortex of pure darkness consumes all in its path.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 92, spellRadius: 4,
    spellSchool: "shadow", spellTier: 5, spellMagicType: "shadow",
  },
  // ── POISON ──────────────────────────────────────────────────────────────────
  [UpgradeType.SPELL_VENOMOUS_SPRAY]: {
    type: UpgradeType.SPELL_VENOMOUS_SPRAY, cost: 0, manaCost: 60, maxLevel: 99, effect: 0,
    description: "A fan of toxic venom sprays across nearby foes.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 22, spellRadius: 2,
    spellSchool: "shadow", spellTier: 2, spellMagicType: "poison",
    spellSlowDuration: 2.5, spellSlowFactor: 0.6,
  },
  [UpgradeType.SPELL_PLAGUE_SWARM]: {
    type: UpgradeType.SPELL_PLAGUE_SWARM, cost: 0, manaCost: 130, maxLevel: 99, effect: 0,
    description: "A cloud of diseased insects devours the living.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 35, spellRadius: 3,
    spellSchool: "shadow", spellTier: 3, spellMagicType: "poison",
    spellSlowDuration: 3.0, spellSlowFactor: 0.5,
  },
  [UpgradeType.SPELL_TOXIC_MIASMA]: {
    type: UpgradeType.SPELL_TOXIC_MIASMA, cost: 0, manaCost: 300, maxLevel: 99, effect: 0,
    description: "A dense cloud of lethal poison fills the area.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 52, spellRadius: 3.5,
    spellSchool: "shadow", spellTier: 4, spellMagicType: "poison",
    spellSlowDuration: 3.5, spellSlowFactor: 0.45,
  },
  [UpgradeType.SPELL_PANDEMIC]: {
    type: UpgradeType.SPELL_PANDEMIC, cost: 0, manaCost: 600, maxLevel: 99, effect: 0,
    description: "An unstoppable wave of pestilence sweeps across the land.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 80, spellRadius: 4,
    spellSchool: "shadow", spellTier: 5, spellMagicType: "poison",
    spellSlowDuration: 4.0, spellSlowFactor: 0.4,
  },
  // ── VOID ────────────────────────────────────────────────────────────────────
  [UpgradeType.SPELL_VOID_SPARK]: {
    type: UpgradeType.SPELL_VOID_SPARK, cost: 0, manaCost: 30, maxLevel: 99, effect: 0,
    description: "A small burst of void energy distorts the space around it.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 18, spellRadius: 1,
    spellSchool: "shadow", spellTier: 1, spellMagicType: "void",
    spellTeleportDistance: 1.5,
  },
  [UpgradeType.SPELL_DIMENSIONAL_TEAR]: {
    type: UpgradeType.SPELL_DIMENSIONAL_TEAR, cost: 0, manaCost: 70, maxLevel: 99, effect: 0,
    description: "A crackling rip in the fabric of space damages all nearby.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 26, spellRadius: 2,
    spellSchool: "shadow", spellTier: 2, spellMagicType: "void",
    spellTeleportDistance: 2.0,
  },
  [UpgradeType.SPELL_SINGULARITY]: {
    type: UpgradeType.SPELL_SINGULARITY, cost: 0, manaCost: 700, maxLevel: 99, effect: 0,
    description: "A collapsing black hole pulls everything inward and destroys it.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 100, spellRadius: 3,
    spellSchool: "shadow", spellTier: 5, spellMagicType: "void",
    spellTeleportDistance: 4.0,
  },
  // ── DEATH ───────────────────────────────────────────────────────────────────
  [UpgradeType.SPELL_NECROTIC_TOUCH]: {
    type: UpgradeType.SPELL_NECROTIC_TOUCH, cost: 0, manaCost: 25, maxLevel: 99, effect: 0,
    description: "A withering touch of decay eats at the living.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 16, spellRadius: 1,
    spellSchool: "shadow", spellTier: 1, spellMagicType: "death",
  },
  [UpgradeType.SPELL_SOUL_REND]: {
    type: UpgradeType.SPELL_SOUL_REND, cost: 0, manaCost: 320, maxLevel: 99, effect: 0,
    description: "Tears the very soul from enemies, leaving empty husks.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 55, spellRadius: 3,
    spellSchool: "shadow", spellTier: 4, spellMagicType: "death",
  },
  [UpgradeType.SPELL_APOCALYPSE]: {
    type: UpgradeType.SPELL_APOCALYPSE, cost: 0, manaCost: 700, maxLevel: 99, effect: 0,
    description: "Death incarnate sweeps the battlefield — none are spared.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 95, spellRadius: 4,
    spellSchool: "shadow", spellTier: 5, spellMagicType: "death",
  },
  // ── NATURE ──────────────────────────────────────────────────────────────────
  [UpgradeType.SPELL_THORN_BARRAGE]: {
    type: UpgradeType.SPELL_THORN_BARRAGE, cost: 0, manaCost: 150, maxLevel: 99, effect: 0,
    description: "A volley of razor-sharp thorns rains down on enemies.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 38, spellRadius: 2.5,
    spellSchool: "elemental", spellTier: 3, spellMagicType: "nature",
    spellSlowDuration: 2.5, spellSlowFactor: 0.4,
  },
  [UpgradeType.SPELL_NATURES_WRATH]: {
    type: UpgradeType.SPELL_NATURES_WRATH, cost: 0, manaCost: 320, maxLevel: 99, effect: 0,
    description: "Roots erupt and vines lash out with primal fury.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 55, spellRadius: 3.5,
    spellSchool: "elemental", spellTier: 4, spellMagicType: "nature",
    spellSlowDuration: 3.0, spellSlowFactor: 0.35,
  },
  [UpgradeType.SPELL_PRIMAL_STORM]: {
    type: UpgradeType.SPELL_PRIMAL_STORM, cost: 0, manaCost: 600, maxLevel: 99, effect: 0,
    description: "Nature unleashes its full wrath — wind, thorns, and raw power.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 85, spellRadius: 4,
    spellSchool: "elemental", spellTier: 5, spellMagicType: "nature",
    spellSlowDuration: 3.0, spellSlowFactor: 0.35,
  },
  // ═══════════════════════════════════════════════════════════════════════════
  // Round 2 — 1 extra spell per tier per magic type (55 new)
  // ═══════════════════════════════════════════════════════════════════════════
  // ── FIRE ────────────────────────────────────────────────────────────────────
  [UpgradeType.SPELL_EMBER_BOLT]: {
    type: UpgradeType.SPELL_EMBER_BOLT, cost: 0, manaCost: 30, maxLevel: 99, effect: 0,
    description: "A quick bolt of burning embers.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 16, spellRadius: 1,
    spellSchool: "elemental", spellTier: 1, spellMagicType: "fire",
  },
  [UpgradeType.SPELL_FLAME_WAVE]: {
    type: UpgradeType.SPELL_FLAME_WAVE, cost: 0, manaCost: 70, maxLevel: 99, effect: 0,
    description: "A rolling wave of fire sweeps through enemies.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 28, spellRadius: 2,
    spellSchool: "elemental", spellTier: 2, spellMagicType: "fire",
  },
  [UpgradeType.SPELL_MAGMA_BURST]: {
    type: UpgradeType.SPELL_MAGMA_BURST, cost: 0, manaCost: 160, maxLevel: 99, effect: 0,
    description: "Molten magma erupts from the ground.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 44, spellRadius: 2.5,
    spellSchool: "elemental", spellTier: 3, spellMagicType: "fire",
  },
  [UpgradeType.SPELL_FIRE_STORM]: {
    type: UpgradeType.SPELL_FIRE_STORM, cost: 0, manaCost: 380, maxLevel: 99, effect: 0,
    description: "A raging storm of fire engulfs the area.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 65, spellRadius: 3.5,
    spellSchool: "elemental", spellTier: 4, spellMagicType: "fire",
  },
  [UpgradeType.SPELL_DRAGONS_BREATH]: {
    type: UpgradeType.SPELL_DRAGONS_BREATH, cost: 0, manaCost: 700, maxLevel: 99, effect: 0,
    description: "Unleash the breath of an ancient dragon.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 92, spellRadius: 4,
    spellSchool: "elemental", spellTier: 5, spellMagicType: "fire",
  },
  // ── ICE ─────────────────────────────────────────────────────────────────────
  [UpgradeType.SPELL_ICE_SHARD]: {
    type: UpgradeType.SPELL_ICE_SHARD, cost: 0, manaCost: 30, maxLevel: 99, effect: 0,
    description: "A sharp shard of ice pierces enemies.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 16, spellRadius: 1,
    spellSchool: "elemental", spellTier: 1, spellMagicType: "ice",
    spellSlowDuration: 1.0, spellSlowFactor: 0.7,
  },
  [UpgradeType.SPELL_FROSTBITE]: {
    type: UpgradeType.SPELL_FROSTBITE, cost: 0, manaCost: 65, maxLevel: 99, effect: 0,
    description: "Bitter cold bites at all nearby foes.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 24, spellRadius: 2,
    spellSchool: "elemental", spellTier: 2, spellMagicType: "ice",
    spellSlowDuration: 2.5, spellSlowFactor: 0.5,
  },
  [UpgradeType.SPELL_ICE_STORM]: {
    type: UpgradeType.SPELL_ICE_STORM, cost: 0, manaCost: 150, maxLevel: 99, effect: 0,
    description: "A howling storm of ice and hail.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 42, spellRadius: 3,
    spellSchool: "elemental", spellTier: 3, spellMagicType: "ice",
    spellSlowDuration: 2.5, spellSlowFactor: 0.4,
  },
  [UpgradeType.SPELL_FROZEN_TOMB]: {
    type: UpgradeType.SPELL_FROZEN_TOMB, cost: 0, manaCost: 340, maxLevel: 99, effect: 0,
    description: "Encases the area in a tomb of solid ice.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 60, spellRadius: 3,
    spellSchool: "elemental", spellTier: 4, spellMagicType: "ice",
    spellSlowDuration: 3.0, spellSlowFactor: 0.35,
  },
  [UpgradeType.SPELL_PERMAFROST]: {
    type: UpgradeType.SPELL_PERMAFROST, cost: 0, manaCost: 650, maxLevel: 99, effect: 0,
    description: "Eternal ice spreads across the land, freezing all.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 88, spellRadius: 3.5,
    spellSchool: "elemental", spellTier: 5, spellMagicType: "ice",
    spellSlowDuration: 3.5, spellSlowFactor: 0.3,
  },
  // ── LIGHTNING ───────────────────────────────────────────────────────────────
  [UpgradeType.SPELL_STATIC_SHOCK]: {
    type: UpgradeType.SPELL_STATIC_SHOCK, cost: 0, manaCost: 30, maxLevel: 99, effect: 0,
    description: "A sudden jolt of static electricity.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 15, spellRadius: 1,
    spellSchool: "elemental", spellTier: 1, spellMagicType: "lightning",
    spellTeleportDistance: 1.5,
  },
  [UpgradeType.SPELL_ARC_BOLT]: {
    type: UpgradeType.SPELL_ARC_BOLT, cost: 0, manaCost: 70, maxLevel: 99, effect: 0,
    description: "An arcing bolt of electricity leaps between targets.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 26, spellRadius: 1.5,
    spellSchool: "elemental", spellTier: 2, spellMagicType: "lightning",
    spellSlowDuration: 1.0, spellSlowFactor: 0.6,
  },
  [UpgradeType.SPELL_STORM_SURGE]: {
    type: UpgradeType.SPELL_STORM_SURGE, cost: 0, manaCost: 160, maxLevel: 99, effect: 0,
    description: "A surging wave of electrical energy.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 44, spellRadius: 2.5,
    spellSchool: "elemental", spellTier: 3, spellMagicType: "lightning",
    spellSlowDuration: 1.5, spellSlowFactor: 0.5,
  },
  [UpgradeType.SPELL_THUNDER_CLAP]: {
    type: UpgradeType.SPELL_THUNDER_CLAP, cost: 0, manaCost: 360, maxLevel: 99, effect: 0,
    description: "A deafening clap of thunder shatters the air.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 64, spellRadius: 3.5,
    spellSchool: "elemental", spellTier: 4, spellMagicType: "lightning",
    spellSlowDuration: 1.5, spellSlowFactor: 0.5,
  },
  [UpgradeType.SPELL_ZEUS_WRATH]: {
    type: UpgradeType.SPELL_ZEUS_WRATH, cost: 0, manaCost: 700, maxLevel: 99, effect: 0,
    description: "The wrath of the storm god strikes the earth.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 98, spellRadius: 4,
    spellSchool: "elemental", spellTier: 5, spellMagicType: "lightning",
    spellSlowDuration: 2.0, spellSlowFactor: 0.4,
  },
  // ── EARTH ───────────────────────────────────────────────────────────────────
  [UpgradeType.SPELL_MUD_SPLASH]: {
    type: UpgradeType.SPELL_MUD_SPLASH, cost: 0, manaCost: 28, maxLevel: 99, effect: 0,
    description: "A splash of heavy mud slows and damages.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 14, spellRadius: 1.5,
    spellSchool: "elemental", spellTier: 1, spellMagicType: "earth",
  },
  [UpgradeType.SPELL_ROCK_THROW]: {
    type: UpgradeType.SPELL_ROCK_THROW, cost: 0, manaCost: 65, maxLevel: 99, effect: 0,
    description: "Hurls a massive boulder at the enemy.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 24, spellRadius: 2,
    spellSchool: "elemental", spellTier: 2, spellMagicType: "earth",
  },
  [UpgradeType.SPELL_AVALANCHE]: {
    type: UpgradeType.SPELL_AVALANCHE, cost: 0, manaCost: 155, maxLevel: 99, effect: 0,
    description: "An avalanche of rocks and debris.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 40, spellRadius: 3,
    spellSchool: "elemental", spellTier: 3, spellMagicType: "earth",
  },
  [UpgradeType.SPELL_SEISMIC_SLAM]: {
    type: UpgradeType.SPELL_SEISMIC_SLAM, cost: 0, manaCost: 340, maxLevel: 99, effect: 0,
    description: "A devastating slam that cracks the earth.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 56, spellRadius: 3,
    spellSchool: "elemental", spellTier: 4, spellMagicType: "earth",
  },
  [UpgradeType.SPELL_WORLD_BREAKER]: {
    type: UpgradeType.SPELL_WORLD_BREAKER, cost: 0, manaCost: 650, maxLevel: 99, effect: 0,
    description: "Shatters the very foundations of the world.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 90, spellRadius: 4,
    spellSchool: "elemental", spellTier: 5, spellMagicType: "earth",
  },
  // ── ARCANE ──────────────────────────────────────────────────────────────────
  [UpgradeType.SPELL_MANA_BOLT]: {
    type: UpgradeType.SPELL_MANA_BOLT, cost: 0, manaCost: 28, maxLevel: 99, effect: 0,
    description: "A focused bolt of raw mana.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 14, spellRadius: 1,
    spellSchool: "arcane", spellTier: 1, spellMagicType: "arcane",
  },
  [UpgradeType.SPELL_ARCANE_PULSE]: {
    type: UpgradeType.SPELL_ARCANE_PULSE, cost: 0, manaCost: 75, maxLevel: 99, effect: 0,
    description: "A pulsing wave of arcane energy.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 28, spellRadius: 2,
    spellSchool: "arcane", spellTier: 2, spellMagicType: "arcane",
  },
  [UpgradeType.SPELL_ETHER_BLAST]: {
    type: UpgradeType.SPELL_ETHER_BLAST, cost: 0, manaCost: 165, maxLevel: 99, effect: 0,
    description: "A blast from the ethereal plane.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 43, spellRadius: 2.5,
    spellSchool: "arcane", spellTier: 3, spellMagicType: "arcane",
  },
  [UpgradeType.SPELL_ARCANE_TORRENT]: {
    type: UpgradeType.SPELL_ARCANE_TORRENT, cost: 0, manaCost: 380, maxLevel: 99, effect: 0,
    description: "A torrential flood of arcane power.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 68, spellRadius: 3,
    spellSchool: "arcane", spellTier: 4, spellMagicType: "arcane",
  },
  [UpgradeType.SPELL_ASTRAL_RIFT]: {
    type: UpgradeType.SPELL_ASTRAL_RIFT, cost: 0, manaCost: 680, maxLevel: 99, effect: 0,
    description: "Opens a rift to the astral plane, unraveling reality.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 96, spellRadius: 3.5,
    spellSchool: "arcane", spellTier: 5, spellMagicType: "arcane",
  },
  // ── HOLY ────────────────────────────────────────────────────────────────────
  [UpgradeType.SPELL_SACRED_STRIKE]: {
    type: UpgradeType.SPELL_SACRED_STRIKE, cost: 0, manaCost: 35, maxLevel: 99, effect: 0,
    description: "A strike of sacred energy smites the unholy.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 18, spellRadius: 1.5,
    spellSchool: "divine", spellTier: 1, spellMagicType: "holy",
  },
  [UpgradeType.SPELL_HOLY_LIGHT]: {
    type: UpgradeType.SPELL_HOLY_LIGHT, cost: 0, manaCost: 65, maxLevel: 99, effect: 0,
    description: "A warm beam of holy light mends wounds.", appliesTo: [],
    isSpell: true, spellType: "heal", spellHeal: 35, spellRadius: 2,
    spellSchool: "divine", spellTier: 2, spellMagicType: "holy",
  },
  [UpgradeType.SPELL_JUDGMENT]: {
    type: UpgradeType.SPELL_JUDGMENT, cost: 0, manaCost: 155, maxLevel: 99, effect: 0,
    description: "Divine judgment falls upon the wicked.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 42, spellRadius: 2.5,
    spellSchool: "divine", spellTier: 3, spellMagicType: "holy",
  },
  [UpgradeType.SPELL_DIVINE_SHIELD]: {
    type: UpgradeType.SPELL_DIVINE_SHIELD, cost: 0, manaCost: 340, maxLevel: 99, effect: 0,
    description: "A divine barrier heals and protects allies.", appliesTo: [],
    isSpell: true, spellType: "heal", spellHeal: 70, spellRadius: 3.5,
    spellSchool: "divine", spellTier: 4, spellMagicType: "holy",
  },
  [UpgradeType.SPELL_HEAVENS_GATE]: {
    type: UpgradeType.SPELL_HEAVENS_GATE, cost: 0, manaCost: 680, maxLevel: 99, effect: 0,
    description: "The gates of heaven open, raining divine fury.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 98, spellRadius: 4,
    spellSchool: "divine", spellTier: 5, spellMagicType: "holy",
  },
  // ── SHADOW ──────────────────────────────────────────────────────────────────
  [UpgradeType.SPELL_DARK_PULSE]: {
    type: UpgradeType.SPELL_DARK_PULSE, cost: 0, manaCost: 28, maxLevel: 99, effect: 0,
    description: "A pulse of dark energy radiates outward.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 15, spellRadius: 1,
    spellSchool: "shadow", spellTier: 1, spellMagicType: "shadow",
  },
  [UpgradeType.SPELL_SHADOW_STRIKE]: {
    type: UpgradeType.SPELL_SHADOW_STRIKE, cost: 0, manaCost: 65, maxLevel: 99, effect: 0,
    description: "A swift strike from the shadows.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 24, spellRadius: 2,
    spellSchool: "shadow", spellTier: 2, spellMagicType: "shadow",
  },
  [UpgradeType.SPELL_NIGHTMARE]: {
    type: UpgradeType.SPELL_NIGHTMARE, cost: 0, manaCost: 155, maxLevel: 99, effect: 0,
    description: "Inflicts living nightmares upon all in the area.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 40, spellRadius: 2.5,
    spellSchool: "shadow", spellTier: 3, spellMagicType: "shadow",
  },
  [UpgradeType.SPELL_DARK_VOID]: {
    type: UpgradeType.SPELL_DARK_VOID, cost: 0, manaCost: 360, maxLevel: 99, effect: 0,
    description: "Opens a void of pure darkness.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 60, spellRadius: 3.5,
    spellSchool: "shadow", spellTier: 4, spellMagicType: "shadow",
  },
  [UpgradeType.SPELL_ECLIPSE]: {
    type: UpgradeType.SPELL_ECLIPSE, cost: 0, manaCost: 680, maxLevel: 99, effect: 0,
    description: "Blots out the sun, engulfing all in shadow.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 94, spellRadius: 4,
    spellSchool: "shadow", spellTier: 5, spellMagicType: "shadow",
  },
  // ── POISON ──────────────────────────────────────────────────────────────────
  [UpgradeType.SPELL_TOXIC_DART]: {
    type: UpgradeType.SPELL_TOXIC_DART, cost: 0, manaCost: 25, maxLevel: 99, effect: 0,
    description: "A small poisoned dart strikes a target.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 13, spellRadius: 1,
    spellSchool: "shadow", spellTier: 1, spellMagicType: "poison",
    spellSlowDuration: 2.0, spellSlowFactor: 0.6,
  },
  [UpgradeType.SPELL_ACID_SPLASH]: {
    type: UpgradeType.SPELL_ACID_SPLASH, cost: 0, manaCost: 65, maxLevel: 99, effect: 0,
    description: "Splashes corrosive acid across the area.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 24, spellRadius: 2,
    spellSchool: "shadow", spellTier: 2, spellMagicType: "poison",
    spellSlowDuration: 3.0, spellSlowFactor: 0.6,
  },
  [UpgradeType.SPELL_BLIGHT]: {
    type: UpgradeType.SPELL_BLIGHT, cost: 0, manaCost: 145, maxLevel: 99, effect: 0,
    description: "A creeping blight withers everything it touches.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 36, spellRadius: 3,
    spellSchool: "shadow", spellTier: 3, spellMagicType: "poison",
    spellSlowDuration: 3.5, spellSlowFactor: 0.5,
  },
  [UpgradeType.SPELL_CORROSION]: {
    type: UpgradeType.SPELL_CORROSION, cost: 0, manaCost: 320, maxLevel: 99, effect: 0,
    description: "Powerful acid corrodes armor and flesh alike.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 54, spellRadius: 3,
    spellSchool: "shadow", spellTier: 4, spellMagicType: "poison",
    spellSlowDuration: 3.5, spellSlowFactor: 0.45,
  },
  [UpgradeType.SPELL_PLAGUE_WIND]: {
    type: UpgradeType.SPELL_PLAGUE_WIND, cost: 0, manaCost: 650, maxLevel: 99, effect: 0,
    description: "A wind carrying death spreads across the land.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 82, spellRadius: 4,
    spellSchool: "shadow", spellTier: 5, spellMagicType: "poison",
    spellSlowDuration: 4.0, spellSlowFactor: 0.4,
  },
  // ── VOID ────────────────────────────────────────────────────────────────────
  [UpgradeType.SPELL_PHASE_SHIFT]: {
    type: UpgradeType.SPELL_PHASE_SHIFT, cost: 0, manaCost: 28, maxLevel: 99, effect: 0,
    description: "Shifts the phase of space, damaging all within.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 16, spellRadius: 1,
    spellSchool: "shadow", spellTier: 1, spellMagicType: "void",
    spellTeleportDistance: 1.5,
  },
  [UpgradeType.SPELL_WARP_BOLT]: {
    type: UpgradeType.SPELL_WARP_BOLT, cost: 0, manaCost: 75, maxLevel: 99, effect: 0,
    description: "A bolt of warped space-time distortion.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 28, spellRadius: 2,
    spellSchool: "shadow", spellTier: 2, spellMagicType: "void",
    spellTeleportDistance: 2.5,
  },
  [UpgradeType.SPELL_RIFT_STORM]: {
    type: UpgradeType.SPELL_RIFT_STORM, cost: 0, manaCost: 160, maxLevel: 99, effect: 0,
    description: "Multiple rifts tear through the area.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 44, spellRadius: 2.5,
    spellSchool: "shadow", spellTier: 3, spellMagicType: "void",
    spellTeleportDistance: 3.0,
  },
  [UpgradeType.SPELL_VOID_CRUSH]: {
    type: UpgradeType.SPELL_VOID_CRUSH, cost: 0, manaCost: 350, maxLevel: 99, effect: 0,
    description: "The void crushes inward, annihilating all.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 58, spellRadius: 3,
    spellSchool: "shadow", spellTier: 4, spellMagicType: "void",
    spellTeleportDistance: 3.5,
  },
  [UpgradeType.SPELL_EVENT_HORIZON]: {
    type: UpgradeType.SPELL_EVENT_HORIZON, cost: 0, manaCost: 720, maxLevel: 99, effect: 0,
    description: "The boundary beyond which nothing escapes.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 98, spellRadius: 3.5,
    spellSchool: "shadow", spellTier: 5, spellMagicType: "void",
    spellTeleportDistance: 4.0,
  },
  // ── DEATH ───────────────────────────────────────────────────────────────────
  [UpgradeType.SPELL_GRAVE_CHILL]: {
    type: UpgradeType.SPELL_GRAVE_CHILL, cost: 0, manaCost: 28, maxLevel: 99, effect: 0,
    description: "The cold of the grave seeps into the living.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 15, spellRadius: 1,
    spellSchool: "shadow", spellTier: 1, spellMagicType: "death",
  },
  [UpgradeType.SPELL_WITHER]: {
    type: UpgradeType.SPELL_WITHER, cost: 0, manaCost: 70, maxLevel: 99, effect: 0,
    description: "Life force withers and decays rapidly.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 25, spellRadius: 2,
    spellSchool: "shadow", spellTier: 2, spellMagicType: "death",
  },
  [UpgradeType.SPELL_CORPSE_EXPLOSION]: {
    type: UpgradeType.SPELL_CORPSE_EXPLOSION, cost: 0, manaCost: 150, maxLevel: 99, effect: 0,
    description: "The dead erupt in a shower of necrotic energy.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 40, spellRadius: 3,
    spellSchool: "shadow", spellTier: 3, spellMagicType: "death",
  },
  [UpgradeType.SPELL_DOOM]: {
    type: UpgradeType.SPELL_DOOM, cost: 0, manaCost: 340, maxLevel: 99, effect: 0,
    description: "Marks all in the area for certain death.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 56, spellRadius: 3,
    spellSchool: "shadow", spellTier: 4, spellMagicType: "death",
  },
  [UpgradeType.SPELL_REQUIEM]: {
    type: UpgradeType.SPELL_REQUIEM, cost: 0, manaCost: 680, maxLevel: 99, effect: 0,
    description: "A final song of death echoes across the battlefield.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 92, spellRadius: 4,
    spellSchool: "shadow", spellTier: 5, spellMagicType: "death",
  },
  // ── NATURE ──────────────────────────────────────────────────────────────────
  [UpgradeType.SPELL_VINE_WHIP]: {
    type: UpgradeType.SPELL_VINE_WHIP, cost: 0, manaCost: 25, maxLevel: 99, effect: 0,
    description: "A lashing vine strikes nearby enemies.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 14, spellRadius: 1.5,
    spellSchool: "elemental", spellTier: 1, spellMagicType: "nature",
    spellSlowDuration: 2.0, spellSlowFactor: 0.5,
  },
  [UpgradeType.SPELL_BRAMBLE_BURST]: {
    type: UpgradeType.SPELL_BRAMBLE_BURST, cost: 0, manaCost: 65, maxLevel: 99, effect: 0,
    description: "Thorny brambles burst from the ground.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 22, spellRadius: 2,
    spellSchool: "elemental", spellTier: 2, spellMagicType: "nature",
    spellSlowDuration: 2.5, spellSlowFactor: 0.5,
  },
  [UpgradeType.SPELL_ENTANGLE]: {
    type: UpgradeType.SPELL_ENTANGLE, cost: 0, manaCost: 140, maxLevel: 99, effect: 0,
    description: "Grasping roots entangle and crush enemies.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 36, spellRadius: 2.5,
    spellSchool: "elemental", spellTier: 3, spellMagicType: "nature",
    spellSlowDuration: 3.0, spellSlowFactor: 0.3,
  },
  [UpgradeType.SPELL_OVERGROWTH]: {
    type: UpgradeType.SPELL_OVERGROWTH, cost: 0, manaCost: 320, maxLevel: 99, effect: 0,
    description: "Explosive plant growth overwhelms the area.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 52, spellRadius: 3.5,
    spellSchool: "elemental", spellTier: 4, spellMagicType: "nature",
    spellSlowDuration: 2.5, spellSlowFactor: 0.4,
  },
  [UpgradeType.SPELL_GAIAS_FURY]: {
    type: UpgradeType.SPELL_GAIAS_FURY, cost: 0, manaCost: 650, maxLevel: 99, effect: 0,
    description: "The earth mother unleashes her primal fury.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 86, spellRadius: 4,
    spellSchool: "elemental", spellTier: 5, spellMagicType: "nature",
    spellSlowDuration: 3.0, spellSlowFactor: 0.35,
  },

  // ─── Tier 6 (Epic) & Tier 7 (Mythic) ───────────────────────────

  // Fire T6
  [UpgradeType.SPELL_HELLFIRE_ERUPTION]: {
    type: UpgradeType.SPELL_HELLFIRE_ERUPTION, cost: 0, manaCost: 850, maxLevel: 99, effect: 0,
    description: "Hellfire erupts from the depths, consuming everything.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 120, spellRadius: 4,
    spellSchool: "elemental", spellTier: 6, spellMagicType: "fire",
  },
  [UpgradeType.SPELL_SOLAR_FURY]: {
    type: UpgradeType.SPELL_SOLAR_FURY, cost: 0, manaCost: 900, maxLevel: 99, effect: 0,
    description: "The fury of the sun scorches the battlefield.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 130, spellRadius: 4.5,
    spellSchool: "elemental", spellTier: 6, spellMagicType: "fire",
  },
  // Fire T7
  [UpgradeType.SPELL_SUPERNOVA]: {
    type: UpgradeType.SPELL_SUPERNOVA, cost: 0, manaCost: 1200, maxLevel: 99, effect: 0,
    description: "A dying star explodes with cataclysmic force.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 170, spellRadius: 5,
    spellSchool: "elemental", spellTier: 7, spellMagicType: "fire",
  },
  [UpgradeType.SPELL_WORLD_BLAZE]: {
    type: UpgradeType.SPELL_WORLD_BLAZE, cost: 0, manaCost: 1400, maxLevel: 99, effect: 0,
    description: "The entire world is engulfed in primordial flame.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 200, spellRadius: 5.5,
    spellSchool: "elemental", spellTier: 7, spellMagicType: "fire",
  },

  // Ice T6
  [UpgradeType.SPELL_FROZEN_ABYSS]: {
    type: UpgradeType.SPELL_FROZEN_ABYSS, cost: 0, manaCost: 850, maxLevel: 99, effect: 0,
    description: "An abyssal cold freezes enemies to their core.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 118, spellRadius: 4,
    spellSchool: "elemental", spellTier: 6, spellMagicType: "ice",
    spellSlowDuration: 3.5, spellSlowFactor: 0.25,
  },
  [UpgradeType.SPELL_ARCTIC_DEVASTATION]: {
    type: UpgradeType.SPELL_ARCTIC_DEVASTATION, cost: 0, manaCost: 900, maxLevel: 99, effect: 0,
    description: "Arctic winds tear across the land with devastating force.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 128, spellRadius: 4.5,
    spellSchool: "elemental", spellTier: 6, spellMagicType: "ice",
    spellSlowDuration: 3.5, spellSlowFactor: 0.25,
  },
  // Ice T7
  [UpgradeType.SPELL_ETERNAL_WINTER]: {
    type: UpgradeType.SPELL_ETERNAL_WINTER, cost: 0, manaCost: 1200, maxLevel: 99, effect: 0,
    description: "An endless winter descends, freezing time itself.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 165, spellRadius: 5,
    spellSchool: "elemental", spellTier: 7, spellMagicType: "ice",
    spellSlowDuration: 4.0, spellSlowFactor: 0.2,
  },
  [UpgradeType.SPELL_ICE_AGE]: {
    type: UpgradeType.SPELL_ICE_AGE, cost: 0, manaCost: 1400, maxLevel: 99, effect: 0,
    description: "A new ice age begins, nothing survives the cold.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 195, spellRadius: 5.5,
    spellSchool: "elemental", spellTier: 7, spellMagicType: "ice",
    spellSlowDuration: 4.0, spellSlowFactor: 0.2,
  },

  // Lightning T6
  [UpgradeType.SPELL_DIVINE_THUNDER]: {
    type: UpgradeType.SPELL_DIVINE_THUNDER, cost: 0, manaCost: 850, maxLevel: 99, effect: 0,
    description: "Thunder from the heavens strikes with divine wrath.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 125, spellRadius: 4,
    spellSchool: "elemental", spellTier: 6, spellMagicType: "lightning",
    spellTeleportDistance: 3.0,
  },
  [UpgradeType.SPELL_TEMPEST_FURY]: {
    type: UpgradeType.SPELL_TEMPEST_FURY, cost: 0, manaCost: 900, maxLevel: 99, effect: 0,
    description: "The fury of a thousand tempests unleashed at once.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 135, spellRadius: 4.5,
    spellSchool: "elemental", spellTier: 6, spellMagicType: "lightning",
    spellSlowDuration: 2.5, spellSlowFactor: 0.35,
  },
  // Lightning T7
  [UpgradeType.SPELL_RAGNAROK_BOLT]: {
    type: UpgradeType.SPELL_RAGNAROK_BOLT, cost: 0, manaCost: 1200, maxLevel: 99, effect: 0,
    description: "The final lightning bolt that heralds the end of days.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 175, spellRadius: 5,
    spellSchool: "elemental", spellTier: 7, spellMagicType: "lightning",
    spellTeleportDistance: 3.5,
  },
  [UpgradeType.SPELL_COSMIC_STORM]: {
    type: UpgradeType.SPELL_COSMIC_STORM, cost: 0, manaCost: 1400, maxLevel: 99, effect: 0,
    description: "A storm of cosmic energy tears reality apart.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 205, spellRadius: 5.5,
    spellSchool: "elemental", spellTier: 7, spellMagicType: "lightning",
    spellSlowDuration: 3.0, spellSlowFactor: 0.3,
  },

  // Earth T6
  [UpgradeType.SPELL_CONTINENTAL_CRUSH]: {
    type: UpgradeType.SPELL_CONTINENTAL_CRUSH, cost: 0, manaCost: 850, maxLevel: 99, effect: 0,
    description: "Continents collide with earth-shattering force.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 115, spellRadius: 4.5,
    spellSchool: "elemental", spellTier: 6, spellMagicType: "earth",
  },
  [UpgradeType.SPELL_MAGMA_CORE]: {
    type: UpgradeType.SPELL_MAGMA_CORE, cost: 0, manaCost: 900, maxLevel: 99, effect: 0,
    description: "The planet's molten core erupts through the surface.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 125, spellRadius: 4.5,
    spellSchool: "elemental", spellTier: 6, spellMagicType: "earth",
  },
  // Earth T7
  [UpgradeType.SPELL_CATACLYSM]: {
    type: UpgradeType.SPELL_CATACLYSM, cost: 0, manaCost: 1200, maxLevel: 99, effect: 0,
    description: "A world-ending cataclysm reshapes the very land.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 160, spellRadius: 5.5,
    spellSchool: "elemental", spellTier: 7, spellMagicType: "earth",
  },
  [UpgradeType.SPELL_PLANET_SHATTER]: {
    type: UpgradeType.SPELL_PLANET_SHATTER, cost: 0, manaCost: 1400, maxLevel: 99, effect: 0,
    description: "The planet itself cracks apart under impossible force.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 190, spellRadius: 5.5,
    spellSchool: "elemental", spellTier: 7, spellMagicType: "earth",
  },

  // Arcane T6
  [UpgradeType.SPELL_ARCANE_ANNIHILATION]: {
    type: UpgradeType.SPELL_ARCANE_ANNIHILATION, cost: 0, manaCost: 850, maxLevel: 99, effect: 0,
    description: "Pure arcane energy annihilates all it touches.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 125, spellRadius: 4,
    spellSchool: "arcane", spellTier: 6, spellMagicType: "arcane",
  },
  [UpgradeType.SPELL_REALITY_WARP]: {
    type: UpgradeType.SPELL_REALITY_WARP, cost: 0, manaCost: 900, maxLevel: 99, effect: 0,
    description: "Reality bends and warps, unmaking everything within.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 135, spellRadius: 4,
    spellSchool: "arcane", spellTier: 6, spellMagicType: "arcane",
  },
  // Arcane T7
  [UpgradeType.SPELL_COSMIC_RIFT]: {
    type: UpgradeType.SPELL_COSMIC_RIFT, cost: 0, manaCost: 1200, maxLevel: 99, effect: 0,
    description: "A rift in the cosmos tears through the battlefield.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 175, spellRadius: 5,
    spellSchool: "arcane", spellTier: 7, spellMagicType: "arcane",
  },
  [UpgradeType.SPELL_OMNISCIENCE]: {
    type: UpgradeType.SPELL_OMNISCIENCE, cost: 0, manaCost: 1400, maxLevel: 99, effect: 0,
    description: "All-knowing power unmakes enemies from existence.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 210, spellRadius: 5,
    spellSchool: "arcane", spellTier: 7, spellMagicType: "arcane",
  },

  // Holy T6
  [UpgradeType.SPELL_SERAPHIMS_LIGHT]: {
    type: UpgradeType.SPELL_SERAPHIMS_LIGHT, cost: 0, manaCost: 850, maxLevel: 99, effect: 0,
    description: "The light of the seraphim restores all wounds.", appliesTo: [],
    isSpell: true, spellType: "heal", spellHeal: 120, spellRadius: 4.5,
    spellSchool: "divine", spellTier: 6, spellMagicType: "holy",
  },
  [UpgradeType.SPELL_WRATH_OF_GOD]: {
    type: UpgradeType.SPELL_WRATH_OF_GOD, cost: 0, manaCost: 900, maxLevel: 99, effect: 0,
    description: "Divine wrath smites the unholy with blinding fury.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 130, spellRadius: 4.5,
    spellSchool: "divine", spellTier: 6, spellMagicType: "holy",
  },
  // Holy T7
  [UpgradeType.SPELL_ASCENSION]: {
    type: UpgradeType.SPELL_ASCENSION, cost: 0, manaCost: 1200, maxLevel: 99, effect: 0,
    description: "Allies ascend beyond mortal limits, fully restored.", appliesTo: [],
    isSpell: true, spellType: "heal", spellHeal: 180, spellRadius: 5.5,
    spellSchool: "divine", spellTier: 7, spellMagicType: "holy",
  },
  [UpgradeType.SPELL_DIVINE_JUDGMENT]: {
    type: UpgradeType.SPELL_DIVINE_JUDGMENT, cost: 0, manaCost: 1400, maxLevel: 99, effect: 0,
    description: "The ultimate divine judgment erases all evil.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 200, spellRadius: 5.5,
    spellSchool: "divine", spellTier: 7, spellMagicType: "holy",
  },

  // Shadow T6
  [UpgradeType.SPELL_ETERNAL_DARKNESS]: {
    type: UpgradeType.SPELL_ETERNAL_DARKNESS, cost: 0, manaCost: 850, maxLevel: 99, effect: 0,
    description: "Eternal darkness engulfs the world, snuffing out all light.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 120, spellRadius: 4,
    spellSchool: "shadow", spellTier: 6, spellMagicType: "shadow",
  },
  [UpgradeType.SPELL_VOID_CORRUPTION]: {
    type: UpgradeType.SPELL_VOID_CORRUPTION, cost: 0, manaCost: 900, maxLevel: 99, effect: 0,
    description: "Void energy corrupts flesh, bone, and soul.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 130, spellRadius: 4.5,
    spellSchool: "shadow", spellTier: 6, spellMagicType: "shadow",
  },
  // Shadow T7
  [UpgradeType.SPELL_ABYSSAL_DOOM]: {
    type: UpgradeType.SPELL_ABYSSAL_DOOM, cost: 0, manaCost: 1200, maxLevel: 99, effect: 0,
    description: "The abyss itself rises to consume all living things.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 168, spellRadius: 5,
    spellSchool: "shadow", spellTier: 7, spellMagicType: "shadow",
  },
  [UpgradeType.SPELL_SHADOW_ANNIHILATION]: {
    type: UpgradeType.SPELL_SHADOW_ANNIHILATION, cost: 0, manaCost: 1400, maxLevel: 99, effect: 0,
    description: "Shadow consumes reality, leaving only the void.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 198, spellRadius: 5.5,
    spellSchool: "shadow", spellTier: 7, spellMagicType: "shadow",
  },

  // Poison T6
  [UpgradeType.SPELL_EXTINCTION_CLOUD]: {
    type: UpgradeType.SPELL_EXTINCTION_CLOUD, cost: 0, manaCost: 850, maxLevel: 99, effect: 0,
    description: "A toxic cloud so deadly it causes mass extinction.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 110, spellRadius: 4.5,
    spellSchool: "shadow", spellTier: 6, spellMagicType: "poison",
    spellSlowDuration: 4.0, spellSlowFactor: 0.35,
  },
  [UpgradeType.SPELL_PLAGUE_OF_AGES]: {
    type: UpgradeType.SPELL_PLAGUE_OF_AGES, cost: 0, manaCost: 900, maxLevel: 99, effect: 0,
    description: "An ancient plague resurfaces, devouring all life.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 120, spellRadius: 4.5,
    spellSchool: "shadow", spellTier: 6, spellMagicType: "poison",
    spellSlowDuration: 4.0, spellSlowFactor: 0.35,
  },
  // Poison T7
  [UpgradeType.SPELL_DEATH_BLOSSOM]: {
    type: UpgradeType.SPELL_DEATH_BLOSSOM, cost: 0, manaCost: 1200, maxLevel: 99, effect: 0,
    description: "Flowers of death bloom, releasing lethal spores.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 155, spellRadius: 5.5,
    spellSchool: "shadow", spellTier: 7, spellMagicType: "poison",
    spellSlowDuration: 4.5, spellSlowFactor: 0.3,
  },
  [UpgradeType.SPELL_TOXIC_APOCALYPSE]: {
    type: UpgradeType.SPELL_TOXIC_APOCALYPSE, cost: 0, manaCost: 1400, maxLevel: 99, effect: 0,
    description: "A toxic apocalypse poisons the world beyond salvation.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 185, spellRadius: 5.5,
    spellSchool: "shadow", spellTier: 7, spellMagicType: "poison",
    spellSlowDuration: 4.5, spellSlowFactor: 0.3,
  },

  // Void T6
  [UpgradeType.SPELL_REALITY_COLLAPSE]: {
    type: UpgradeType.SPELL_REALITY_COLLAPSE, cost: 0, manaCost: 850, maxLevel: 99, effect: 0,
    description: "Reality itself collapses inward, erasing what was.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 125, spellRadius: 4,
    spellSchool: "shadow", spellTier: 6, spellMagicType: "void",
    spellTeleportDistance: 4.5,
  },
  [UpgradeType.SPELL_DIMENSIONAL_IMPLOSION]: {
    type: UpgradeType.SPELL_DIMENSIONAL_IMPLOSION, cost: 0, manaCost: 900, maxLevel: 99, effect: 0,
    description: "Dimensions fold in on themselves in a violent implosion.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 135, spellRadius: 4.5,
    spellSchool: "shadow", spellTier: 6, spellMagicType: "void",
    spellTeleportDistance: 4.5,
  },
  // Void T7
  [UpgradeType.SPELL_ENTROPY]: {
    type: UpgradeType.SPELL_ENTROPY, cost: 0, manaCost: 1200, maxLevel: 99, effect: 0,
    description: "Entropy accelerates — order dissolves into nothing.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 175, spellRadius: 5,
    spellSchool: "shadow", spellTier: 7, spellMagicType: "void",
    spellTeleportDistance: 5.0,
  },
  [UpgradeType.SPELL_END_OF_ALL]: {
    type: UpgradeType.SPELL_END_OF_ALL, cost: 0, manaCost: 1400, maxLevel: 99, effect: 0,
    description: "The final void spell — existence itself ceases.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 210, spellRadius: 5,
    spellSchool: "shadow", spellTier: 7, spellMagicType: "void",
    spellTeleportDistance: 5.0,
  },

  // Death T6
  [UpgradeType.SPELL_MASS_EXTINCTION]: {
    type: UpgradeType.SPELL_MASS_EXTINCTION, cost: 0, manaCost: 850, maxLevel: 99, effect: 0,
    description: "Death magic triggers mass extinction across the field.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 118, spellRadius: 4.5,
    spellSchool: "shadow", spellTier: 6, spellMagicType: "death",
  },
  [UpgradeType.SPELL_GRIM_HARVEST]: {
    type: UpgradeType.SPELL_GRIM_HARVEST, cost: 0, manaCost: 900, maxLevel: 99, effect: 0,
    description: "The reaper harvests souls by the thousands.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 128, spellRadius: 4.5,
    spellSchool: "shadow", spellTier: 6, spellMagicType: "death",
  },
  // Death T7
  [UpgradeType.SPELL_ARMAGEDDON]: {
    type: UpgradeType.SPELL_ARMAGEDDON, cost: 0, manaCost: 1200, maxLevel: 99, effect: 0,
    description: "The final battle between life and death begins.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 168, spellRadius: 5.5,
    spellSchool: "shadow", spellTier: 7, spellMagicType: "death",
  },
  [UpgradeType.SPELL_DEATH_INCARNATE]: {
    type: UpgradeType.SPELL_DEATH_INCARNATE, cost: 0, manaCost: 1400, maxLevel: 99, effect: 0,
    description: "Death itself takes physical form and walks the earth.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 200, spellRadius: 5.5,
    spellSchool: "shadow", spellTier: 7, spellMagicType: "death",
  },

  // Nature T6
  [UpgradeType.SPELL_WORLD_TREES_FURY]: {
    type: UpgradeType.SPELL_WORLD_TREES_FURY, cost: 0, manaCost: 850, maxLevel: 99, effect: 0,
    description: "The world tree unleashes its ancient fury.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 115, spellRadius: 4.5,
    spellSchool: "elemental", spellTier: 6, spellMagicType: "nature",
    spellSlowDuration: 3.5, spellSlowFactor: 0.3,
  },
  [UpgradeType.SPELL_ELEMENTAL_CHAOS]: {
    type: UpgradeType.SPELL_ELEMENTAL_CHAOS, cost: 0, manaCost: 900, maxLevel: 99, effect: 0,
    description: "All elements of nature combine in chaotic fury.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 125, spellRadius: 4.5,
    spellSchool: "elemental", spellTier: 6, spellMagicType: "nature",
    spellSlowDuration: 3.5, spellSlowFactor: 0.3,
  },
  // Nature T7
  [UpgradeType.SPELL_GENESIS_STORM]: {
    type: UpgradeType.SPELL_GENESIS_STORM, cost: 0, manaCost: 1200, maxLevel: 99, effect: 0,
    description: "A primordial storm of creation remakes the world.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 160, spellRadius: 5.5,
    spellSchool: "elemental", spellTier: 7, spellMagicType: "nature",
    spellSlowDuration: 4.0, spellSlowFactor: 0.25,
  },
  [UpgradeType.SPELL_WRATH_OF_GAIA]: {
    type: UpgradeType.SPELL_WRATH_OF_GAIA, cost: 0, manaCost: 1400, maxLevel: 99, effect: 0,
    description: "Mother Earth rises in wrath, reshaping all existence.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 195, spellRadius: 5.5,
    spellSchool: "elemental", spellTier: 7, spellMagicType: "nature",
    spellSlowDuration: 4.0, spellSlowFactor: 0.25,
  },

  // ─── Extra T1 & T2 spells ──────────────────────────────────────

  // Fire T1 ×2, T2 ×1
  [UpgradeType.SPELL_CANDLE_FLAME]: {
    type: UpgradeType.SPELL_CANDLE_FLAME, cost: 0, manaCost: 20, maxLevel: 99, effect: 0,
    description: "A small candle flame flickers to life and burns.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 12, spellRadius: 1,
    spellSchool: "elemental", spellTier: 1, spellMagicType: "fire",
  },
  [UpgradeType.SPELL_HEAT_WAVE]: {
    type: UpgradeType.SPELL_HEAT_WAVE, cost: 0, manaCost: 25, maxLevel: 99, effect: 0,
    description: "A wave of scorching heat washes over enemies.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 14, spellRadius: 1.5,
    spellSchool: "elemental", spellTier: 1, spellMagicType: "fire",
  },
  [UpgradeType.SPELL_SCORCH]: {
    type: UpgradeType.SPELL_SCORCH, cost: 0, manaCost: 55, maxLevel: 99, effect: 0,
    description: "Scorching flames sear enemies in the area.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 20, spellRadius: 2,
    spellSchool: "elemental", spellTier: 2, spellMagicType: "fire",
  },

  // Ice T1 ×2, T2 ×1
  [UpgradeType.SPELL_CHILL_TOUCH]: {
    type: UpgradeType.SPELL_CHILL_TOUCH, cost: 0, manaCost: 20, maxLevel: 99, effect: 0,
    description: "An icy touch chills enemies to the bone.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 12, spellRadius: 1,
    spellSchool: "elemental", spellTier: 1, spellMagicType: "ice",
  },
  [UpgradeType.SPELL_ICICLE]: {
    type: UpgradeType.SPELL_ICICLE, cost: 0, manaCost: 25, maxLevel: 99, effect: 0,
    description: "A sharp icicle launches at the target.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 14, spellRadius: 1,
    spellSchool: "elemental", spellTier: 1, spellMagicType: "ice",
  },
  [UpgradeType.SPELL_COLD_SNAP]: {
    type: UpgradeType.SPELL_COLD_SNAP, cost: 0, manaCost: 55, maxLevel: 99, effect: 0,
    description: "A sudden cold snap freezes nearby enemies.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 20, spellRadius: 2,
    spellSchool: "elemental", spellTier: 2, spellMagicType: "ice",
  },

  // Lightning T1 ×2, T2 ×1
  [UpgradeType.SPELL_JOLT]: {
    type: UpgradeType.SPELL_JOLT, cost: 0, manaCost: 20, maxLevel: 99, effect: 0,
    description: "A quick jolt of electricity zaps the target.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 13, spellRadius: 1,
    spellSchool: "elemental", spellTier: 1, spellMagicType: "lightning",
  },
  [UpgradeType.SPELL_ZAP]: {
    type: UpgradeType.SPELL_ZAP, cost: 0, manaCost: 25, maxLevel: 99, effect: 0,
    description: "Zap! A small bolt of lightning strikes.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 15, spellRadius: 1,
    spellSchool: "elemental", spellTier: 1, spellMagicType: "lightning",
  },
  [UpgradeType.SPELL_SHOCK_WAVE]: {
    type: UpgradeType.SPELL_SHOCK_WAVE, cost: 0, manaCost: 55, maxLevel: 99, effect: 0,
    description: "An electric shockwave ripples outward.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 21, spellRadius: 2,
    spellSchool: "elemental", spellTier: 2, spellMagicType: "lightning",
  },

  // Earth T1 ×2, T2 ×1
  [UpgradeType.SPELL_PEBBLE_TOSS]: {
    type: UpgradeType.SPELL_PEBBLE_TOSS, cost: 0, manaCost: 20, maxLevel: 99, effect: 0,
    description: "A handful of pebbles flung with magical force.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 13, spellRadius: 1,
    spellSchool: "elemental", spellTier: 1, spellMagicType: "earth",
  },
  [UpgradeType.SPELL_DUST_DEVIL]: {
    type: UpgradeType.SPELL_DUST_DEVIL, cost: 0, manaCost: 25, maxLevel: 99, effect: 0,
    description: "A small whirlwind of dust and debris.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 15, spellRadius: 1.5,
    spellSchool: "elemental", spellTier: 1, spellMagicType: "earth",
  },
  [UpgradeType.SPELL_TREMOR]: {
    type: UpgradeType.SPELL_TREMOR, cost: 0, manaCost: 55, maxLevel: 99, effect: 0,
    description: "The ground trembles, shaking enemies off balance.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 20, spellRadius: 2,
    spellSchool: "elemental", spellTier: 2, spellMagicType: "earth",
  },

  // Arcane T1 ×2, T2 ×1
  [UpgradeType.SPELL_MAGIC_DART]: {
    type: UpgradeType.SPELL_MAGIC_DART, cost: 0, manaCost: 20, maxLevel: 99, effect: 0,
    description: "A small dart of pure magical energy.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 12, spellRadius: 1,
    spellSchool: "arcane", spellTier: 1, spellMagicType: "arcane",
  },
  [UpgradeType.SPELL_SPARKLE_BURST]: {
    type: UpgradeType.SPELL_SPARKLE_BURST, cost: 0, manaCost: 25, maxLevel: 99, effect: 0,
    description: "A burst of glittering arcane sparkles.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 14, spellRadius: 1.5,
    spellSchool: "arcane", spellTier: 1, spellMagicType: "arcane",
  },
  [UpgradeType.SPELL_ARCANE_BOLT]: {
    type: UpgradeType.SPELL_ARCANE_BOLT, cost: 0, manaCost: 55, maxLevel: 99, effect: 0,
    description: "A bolt of concentrated arcane energy.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 21, spellRadius: 2,
    spellSchool: "arcane", spellTier: 2, spellMagicType: "arcane",
  },

  // Holy T1 ×2, T2 ×1
  [UpgradeType.SPELL_HOLY_TOUCH]: {
    type: UpgradeType.SPELL_HOLY_TOUCH, cost: 0, manaCost: 20, maxLevel: 99, effect: 0,
    description: "A gentle holy touch mends minor wounds.", appliesTo: [],
    isSpell: true, spellType: "heal", spellHeal: 12, spellRadius: 1,
    spellSchool: "divine", spellTier: 1, spellMagicType: "holy",
  },
  [UpgradeType.SPELL_SMITE]: {
    type: UpgradeType.SPELL_SMITE, cost: 0, manaCost: 25, maxLevel: 99, effect: 0,
    description: "Divine light smites an enemy.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 14, spellRadius: 1,
    spellSchool: "divine", spellTier: 1, spellMagicType: "holy",
  },
  [UpgradeType.SPELL_CONSECRATE]: {
    type: UpgradeType.SPELL_CONSECRATE, cost: 0, manaCost: 55, maxLevel: 99, effect: 0,
    description: "Consecrate the ground, healing allies who stand upon it.", appliesTo: [],
    isSpell: true, spellType: "heal", spellHeal: 25, spellRadius: 2,
    spellSchool: "divine", spellTier: 2, spellMagicType: "holy",
  },

  // Shadow T1 ×2, T2 ×1
  [UpgradeType.SPELL_DARK_WHISPER]: {
    type: UpgradeType.SPELL_DARK_WHISPER, cost: 0, manaCost: 20, maxLevel: 99, effect: 0,
    description: "A dark whisper saps the life from enemies.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 13, spellRadius: 1,
    spellSchool: "shadow", spellTier: 1, spellMagicType: "shadow",
  },
  [UpgradeType.SPELL_SHADOW_FLICKER]: {
    type: UpgradeType.SPELL_SHADOW_FLICKER, cost: 0, manaCost: 25, maxLevel: 99, effect: 0,
    description: "Shadows flicker and strike at the unwary.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 15, spellRadius: 1,
    spellSchool: "shadow", spellTier: 1, spellMagicType: "shadow",
  },
  [UpgradeType.SPELL_NIGHT_SHADE]: {
    type: UpgradeType.SPELL_NIGHT_SHADE, cost: 0, manaCost: 55, maxLevel: 99, effect: 0,
    description: "Nightshade venom seeps from the shadows.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 21, spellRadius: 2,
    spellSchool: "shadow", spellTier: 2, spellMagicType: "shadow",
  },

  // Poison T1 ×2, T2 ×1
  [UpgradeType.SPELL_STING]: {
    type: UpgradeType.SPELL_STING, cost: 0, manaCost: 20, maxLevel: 99, effect: 0,
    description: "A venomous sting pricks the target.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 11, spellRadius: 1,
    spellSchool: "shadow", spellTier: 1, spellMagicType: "poison",
    spellSlowDuration: 2.0, spellSlowFactor: 0.7,
  },
  [UpgradeType.SPELL_NOXIOUS_PUFF]: {
    type: UpgradeType.SPELL_NOXIOUS_PUFF, cost: 0, manaCost: 25, maxLevel: 99, effect: 0,
    description: "A small puff of noxious gas.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 13, spellRadius: 1.5,
    spellSchool: "shadow", spellTier: 1, spellMagicType: "poison",
    spellSlowDuration: 2.5, spellSlowFactor: 0.7,
  },
  [UpgradeType.SPELL_VENOM_STRIKE]: {
    type: UpgradeType.SPELL_VENOM_STRIKE, cost: 0, manaCost: 55, maxLevel: 99, effect: 0,
    description: "A strike laced with potent venom.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 19, spellRadius: 2,
    spellSchool: "shadow", spellTier: 2, spellMagicType: "poison",
    spellSlowDuration: 2.5, spellSlowFactor: 0.6,
  },

  // Void T1 ×2, T2 ×1
  [UpgradeType.SPELL_NULL_BOLT]: {
    type: UpgradeType.SPELL_NULL_BOLT, cost: 0, manaCost: 20, maxLevel: 99, effect: 0,
    description: "A bolt of null energy erases matter.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 14, spellRadius: 1,
    spellSchool: "shadow", spellTier: 1, spellMagicType: "void",
    spellTeleportDistance: 1.5,
  },
  [UpgradeType.SPELL_VOID_TOUCH]: {
    type: UpgradeType.SPELL_VOID_TOUCH, cost: 0, manaCost: 25, maxLevel: 99, effect: 0,
    description: "The void reaches out and touches the target.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 16, spellRadius: 1,
    spellSchool: "shadow", spellTier: 1, spellMagicType: "void",
    spellTeleportDistance: 1.5,
  },
  [UpgradeType.SPELL_RIFT_PULSE]: {
    type: UpgradeType.SPELL_RIFT_PULSE, cost: 0, manaCost: 55, maxLevel: 99, effect: 0,
    description: "A pulse of rift energy distorts the area.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 22, spellRadius: 2,
    spellSchool: "shadow", spellTier: 2, spellMagicType: "void",
    spellTeleportDistance: 2.0,
  },

  // Death T1 ×2, T2 ×1
  [UpgradeType.SPELL_DEATHS_GRASP]: {
    type: UpgradeType.SPELL_DEATHS_GRASP, cost: 0, manaCost: 20, maxLevel: 99, effect: 0,
    description: "Death's cold grasp reaches for the living.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 13, spellRadius: 1,
    spellSchool: "shadow", spellTier: 1, spellMagicType: "death",
  },
  [UpgradeType.SPELL_BONE_CHILL]: {
    type: UpgradeType.SPELL_BONE_CHILL, cost: 0, manaCost: 25, maxLevel: 99, effect: 0,
    description: "A chill that seeps into the bones of the living.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 15, spellRadius: 1,
    spellSchool: "shadow", spellTier: 1, spellMagicType: "death",
  },
  [UpgradeType.SPELL_DRAIN_LIFE]: {
    type: UpgradeType.SPELL_DRAIN_LIFE, cost: 0, manaCost: 55, maxLevel: 99, effect: 0,
    description: "Drains the life force from nearby enemies.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 20, spellRadius: 2,
    spellSchool: "shadow", spellTier: 2, spellMagicType: "death",
  },

  // Nature T1 ×2, T2 ×1
  [UpgradeType.SPELL_LEAF_BLADE]: {
    type: UpgradeType.SPELL_LEAF_BLADE, cost: 0, manaCost: 20, maxLevel: 99, effect: 0,
    description: "Razor-sharp leaves slice through the air.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 12, spellRadius: 1,
    spellSchool: "elemental", spellTier: 1, spellMagicType: "nature",
    spellSlowDuration: 1.5, spellSlowFactor: 0.6,
  },
  [UpgradeType.SPELL_THORN_PRICK]: {
    type: UpgradeType.SPELL_THORN_PRICK, cost: 0, manaCost: 25, maxLevel: 99, effect: 0,
    description: "Thorny vines prick and scratch enemies.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 14, spellRadius: 1,
    spellSchool: "elemental", spellTier: 1, spellMagicType: "nature",
    spellSlowDuration: 1.5, spellSlowFactor: 0.6,
  },
  [UpgradeType.SPELL_ROOT_SNARE]: {
    type: UpgradeType.SPELL_ROOT_SNARE, cost: 0, manaCost: 55, maxLevel: 99, effect: 0,
    description: "Roots burst from the ground, snaring and crushing.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 19, spellRadius: 2,
    spellSchool: "elemental", spellTier: 2, spellMagicType: "nature",
    spellSlowDuration: 2.5, spellSlowFactor: 0.45,
  },
};
