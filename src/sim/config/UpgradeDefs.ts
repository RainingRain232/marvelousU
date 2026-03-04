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
  isSpell?: boolean; // If true, this is a repeatable spell summon (no permanent level)
  summonUnit?: UnitType; // Unit type summoned by spell placement
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
  [UpgradeType.SUMMON_UNICORN]: {
    type: UpgradeType.SUMMON_UNICORN,
    cost: 0,
    manaCost: 100,
    maxLevel: 99,
    effect: 0,
    description: "Summon a majestic unicorn at the target location. Costs 100 mana.",
    appliesTo: [],
    isSpell: true,
    summonUnit: UnitType.UNICORN,
  },
  [UpgradeType.SUMMON_PIXIE]: {
    type: UpgradeType.SUMMON_PIXIE,
    cost: 0,
    manaCost: 50,
    maxLevel: 99,
    effect: 0,
    description: "Summon a pixie at the target location. Costs 50 mana.",
    appliesTo: [],
    isSpell: true,
    summonUnit: UnitType.PIXIE,
  },
  [UpgradeType.SUMMON_FIRE_ELEMENTAL]: {
    type: UpgradeType.SUMMON_FIRE_ELEMENTAL,
    cost: 0,
    manaCost: 150,
    maxLevel: 99,
    effect: 0,
    description: "Conjure a fire elemental from the arcane flames. Costs 150 mana.",
    appliesTo: [],
    isSpell: true,
    summonUnit: UnitType.FIRE_ELEMENTAL,
  },
  [UpgradeType.SUMMON_ICE_ELEMENTAL]: {
    type: UpgradeType.SUMMON_ICE_ELEMENTAL,
    cost: 0,
    manaCost: 150,
    maxLevel: 99,
    effect: 0,
    description: "Crystallize an ice elemental from frozen mana. Costs 150 mana.",
    appliesTo: [],
    isSpell: true,
    summonUnit: UnitType.ICE_ELEMENTAL,
  },
  [UpgradeType.SUMMON_RED_DRAGON]: {
    type: UpgradeType.SUMMON_RED_DRAGON,
    cost: 0,
    manaCost: 500,
    maxLevel: 99,
    effect: 0,
    description: "Call forth a fearsome red dragon from the arcane depths. Costs 500 mana.",
    appliesTo: [],
    isSpell: true,
    summonUnit: UnitType.RED_DRAGON,
  },
  [UpgradeType.SUMMON_FROST_DRAGON]: {
    type: UpgradeType.SUMMON_FROST_DRAGON,
    cost: 0,
    manaCost: 500,
    maxLevel: 99,
    effect: 0,
    description: "Summon an ancient frost dragon wreathed in blizzard. Costs 500 mana.",
    appliesTo: [],
    isSpell: true,
    summonUnit: UnitType.FROST_DRAGON,
  },
  [UpgradeType.SUMMON_SPIDER_BROOD]: {
    type: UpgradeType.SUMMON_SPIDER_BROOD,
    cost: 0,
    manaCost: 30,
    maxLevel: 99,
    effect: 0,
    description: "Spawn a venomous spider from shadow webs. Costs 30 mana.",
    appliesTo: [],
    isSpell: true,
    summonUnit: UnitType.SPIDER,
  },
  [UpgradeType.SUMMON_TROLL]: {
    type: UpgradeType.SUMMON_TROLL,
    cost: 0,
    manaCost: 120,
    maxLevel: 99,
    effect: 0,
    description: "Summon a regenerating troll warrior. Costs 120 mana.",
    appliesTo: [],
    isSpell: true,
    summonUnit: UnitType.TROLL,
  },
  [UpgradeType.SUMMON_ANGEL]: {
    type: UpgradeType.SUMMON_ANGEL,
    cost: 0,
    manaCost: 300,
    maxLevel: 99,
    effect: 0,
    description: "Call down a divine angel from the heavens. Costs 300 mana.",
    appliesTo: [],
    isSpell: true,
    summonUnit: UnitType.ANGEL,
  },
  [UpgradeType.SUMMON_CYCLOPS]: {
    type: UpgradeType.SUMMON_CYCLOPS,
    cost: 0,
    manaCost: 400,
    maxLevel: 99,
    effect: 0,
    description: "Awaken a mighty cyclops from its ancient slumber. Costs 400 mana.",
    appliesTo: [],
    isSpell: true,
    summonUnit: UnitType.CYCLOPS,
  },
  [UpgradeType.SUMMON_BAT_SWARM]: {
    type: UpgradeType.SUMMON_BAT_SWARM,
    cost: 0,
    manaCost: 25,
    maxLevel: 99,
    effect: 0,
    description: "Release a bat from the archive belfry. Costs 25 mana.",
    appliesTo: [],
    isSpell: true,
    summonUnit: UnitType.BAT,
  },
  [UpgradeType.SUMMON_DARK_SAVANT]: {
    type: UpgradeType.SUMMON_DARK_SAVANT,
    cost: 0,
    manaCost: 250,
    maxLevel: 99,
    effect: 0,
    description: "Bind a dark savant from the forbidden tomes. Costs 250 mana.",
    appliesTo: [],
    isSpell: true,
    summonUnit: UnitType.DARK_SAVANT,
  },
};
