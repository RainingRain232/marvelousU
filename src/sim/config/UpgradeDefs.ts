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
};
