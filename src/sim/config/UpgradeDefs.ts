// Upgrade definitions for blacksmith
import { UpgradeType } from "@/types";

export interface UpgradeDef {
  type: UpgradeType;
  cost: number;
  maxLevel: number;
  effect: number; // percentage multiplier (e.g., 0.2 for 20%)
  description: string;
  appliesTo: UnitType[];
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
};
