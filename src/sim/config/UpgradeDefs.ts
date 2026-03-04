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
  spellTier?: 1 | 2 | 3 | 4 | 5;
  spellMagicType?: "fire" | "ice" | "lightning" | "earth" | "arcane" | "holy" | "shadow" | "poison" | "void" | "death" | "nature";
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
  },
  [UpgradeType.SPELL_NETHER_STORM]: {
    type: UpgradeType.SPELL_NETHER_STORM, cost: 0, manaCost: 380, maxLevel: 99, effect: 0,
    description: "Massive shadow tempest of void energy.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 60, spellRadius: 3.5,
    spellSchool: "shadow", spellTier: 4, spellMagicType: "void",
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
  },
  [UpgradeType.SPELL_ABSOLUTE_ZERO]: {
    type: UpgradeType.SPELL_ABSOLUTE_ZERO, cost: 0, manaCost: 600, maxLevel: 99, effect: 0,
    description: "All warmth is extinguished in an instant freeze.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 85, spellRadius: 3.5,
    spellSchool: "elemental", spellTier: 5, spellMagicType: "ice",
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
  },
  [UpgradeType.SPELL_BALL_LIGHTNING]: {
    type: UpgradeType.SPELL_BALL_LIGHTNING, cost: 0, manaCost: 350, maxLevel: 99, effect: 0,
    description: "A devastating sphere of plasma arcs electricity to all nearby.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 62, spellRadius: 3,
    spellSchool: "elemental", spellTier: 4, spellMagicType: "lightning",
  },
  [UpgradeType.SPELL_MJOLNIR_STRIKE]: {
    type: UpgradeType.SPELL_MJOLNIR_STRIKE, cost: 0, manaCost: 650, maxLevel: 99, effect: 0,
    description: "A divine hammer of lightning crashes down from the heavens.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 95, spellRadius: 4,
    spellSchool: "elemental", spellTier: 5, spellMagicType: "lightning",
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
  },
  [UpgradeType.SPELL_PLAGUE_SWARM]: {
    type: UpgradeType.SPELL_PLAGUE_SWARM, cost: 0, manaCost: 130, maxLevel: 99, effect: 0,
    description: "A cloud of diseased insects devours the living.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 35, spellRadius: 3,
    spellSchool: "shadow", spellTier: 3, spellMagicType: "poison",
  },
  [UpgradeType.SPELL_TOXIC_MIASMA]: {
    type: UpgradeType.SPELL_TOXIC_MIASMA, cost: 0, manaCost: 300, maxLevel: 99, effect: 0,
    description: "A dense cloud of lethal poison fills the area.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 52, spellRadius: 3.5,
    spellSchool: "shadow", spellTier: 4, spellMagicType: "poison",
  },
  [UpgradeType.SPELL_PANDEMIC]: {
    type: UpgradeType.SPELL_PANDEMIC, cost: 0, manaCost: 600, maxLevel: 99, effect: 0,
    description: "An unstoppable wave of pestilence sweeps across the land.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 80, spellRadius: 4,
    spellSchool: "shadow", spellTier: 5, spellMagicType: "poison",
  },
  // ── VOID ────────────────────────────────────────────────────────────────────
  [UpgradeType.SPELL_VOID_SPARK]: {
    type: UpgradeType.SPELL_VOID_SPARK, cost: 0, manaCost: 30, maxLevel: 99, effect: 0,
    description: "A small burst of void energy distorts the space around it.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 18, spellRadius: 1,
    spellSchool: "shadow", spellTier: 1, spellMagicType: "void",
  },
  [UpgradeType.SPELL_DIMENSIONAL_TEAR]: {
    type: UpgradeType.SPELL_DIMENSIONAL_TEAR, cost: 0, manaCost: 70, maxLevel: 99, effect: 0,
    description: "A crackling rip in the fabric of space damages all nearby.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 26, spellRadius: 2,
    spellSchool: "shadow", spellTier: 2, spellMagicType: "void",
  },
  [UpgradeType.SPELL_SINGULARITY]: {
    type: UpgradeType.SPELL_SINGULARITY, cost: 0, manaCost: 700, maxLevel: 99, effect: 0,
    description: "A collapsing black hole pulls everything inward and destroys it.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 100, spellRadius: 3,
    spellSchool: "shadow", spellTier: 5, spellMagicType: "void",
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
  },
  [UpgradeType.SPELL_NATURES_WRATH]: {
    type: UpgradeType.SPELL_NATURES_WRATH, cost: 0, manaCost: 320, maxLevel: 99, effect: 0,
    description: "Roots erupt and vines lash out with primal fury.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 55, spellRadius: 3.5,
    spellSchool: "elemental", spellTier: 4, spellMagicType: "nature",
  },
  [UpgradeType.SPELL_PRIMAL_STORM]: {
    type: UpgradeType.SPELL_PRIMAL_STORM, cost: 0, manaCost: 600, maxLevel: 99, effect: 0,
    description: "Nature unleashes its full wrath — wind, thorns, and raw power.", appliesTo: [],
    isSpell: true, spellType: "damage", spellDamage: 85, spellRadius: 4,
    spellSchool: "elemental", spellTier: 5, spellMagicType: "nature",
  },
};
