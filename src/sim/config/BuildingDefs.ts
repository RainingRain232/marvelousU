// Building types, costs, shop inventories, placement rules
import { BuildingType, UnitType, UpgradeType } from "@/types";
import type { BuildingTurret } from "@sim/entities/Building";

/** Which territory zone a building may be placed in. */
export type PlacementZone = "own" | "neutral" | "any";

export interface BuildingDef {
  type: BuildingType;
  cost: number; // gold cost (0 = starting/Castle)
  hp: number;
  goldIncome: number; // additional gold/sec this building contributes when owned/captured
  shopInventory: UnitType[]; // unit types this building can train
  blueprints: BuildingType[]; // building blueprints sold from this building's shop
  upgradeInventory?: UpgradeType[]; // upgrade types this building can sell
  footprint: { w: number; h: number };
  placementZone: PlacementZone;
  /** If true, enemy units can recapture this building even after it is owned. */
  capturable?: boolean;
  /** Turrets the building starts with (omit attackTimer/targetId — set to 0/null at spawn). */
  defaultTurrets?: Omit<BuildingTurret, "attackTimer" | "targetId">[];
  /** Maximum number of this building type a single player may own at once. */
  maxCount?: number;
  /** Blueprint is only purchasable once the player owns at least minCount of the given type(s). */
  prerequisite?: { types: BuildingType[]; minCount: number };
  /** Flavor text for shop description */
  description?: string;
}

export const BUILDING_DEFINITIONS: Record<BuildingType, BuildingDef> = {
  [BuildingType.CASTLE]: {
    type: BuildingType.CASTLE,
    cost: 0,
    hp: 500,
    goldIncome: 2,
    shopInventory: [UnitType.SWORDSMAN, UnitType.ARCHER],
    blueprints: [
      BuildingType.BARRACKS,
      BuildingType.STABLES,
      BuildingType.MAGE_TOWER,
      BuildingType.ARCHERY_RANGE,
      BuildingType.SIEGE_WORKSHOP,
      BuildingType.BLACKSMITH,
      BuildingType.CREATURE_DEN,
      BuildingType.TOWER,
      BuildingType.FARM,
      BuildingType.HAMLET,
      BuildingType.EMBASSY,
      BuildingType.TEMPLE,
      BuildingType.WALL,
      BuildingType.MILL,
      BuildingType.ELITE_HALL,
      BuildingType.MARKET,
      BuildingType.FACTION_HALL,
    ],
    footprint: { w: 4, h: 4 },
    placementZone: "own",
    upgradeInventory: [UpgradeType.FLAG],
    defaultTurrets: [
      { projectileTag: "arrow", damage: 12, range: 6, attackSpeed: 1.0 },
    ],
    description:
      "The heart of your kingdom. Trains basic units and provides defensive turrets.",
  },
  [BuildingType.BARRACKS]: {
    type: BuildingType.BARRACKS,
    cost: 500,
    hp: 200,
    goldIncome: 1,
    shopInventory: [
      UnitType.SWORDSMAN,
      UnitType.PIKEMAN,
      UnitType.ASSASSIN,
      UnitType.MAGE_HUNTER,
      UnitType.GLADIATOR,
    ],
    blueprints: [],
    footprint: { w: 2, h: 2 },
    placementZone: "own",
    description:
      "Military training grounds for infantry and specialized warriors.",
  },
  [BuildingType.STABLES]: {
    type: BuildingType.STABLES,
    cost: 600,
    hp: 200,
    goldIncome: 1,
    shopInventory: [
      UnitType.KNIGHT,
      UnitType.SIEGE_HUNTER,
      UnitType.HORSE_ARCHER,
      UnitType.SCOUT_CAVALRY,
      UnitType.LANCER,
      UnitType.ELITE_LANCER,
      UnitType.KNIGHT_LANCER,
      UnitType.ROYAL_LANCER,
    ],
    blueprints: [],
    footprint: { w: 2, h: 2 },
    placementZone: "own",
    prerequisite: { types: [BuildingType.BARRACKS], minCount: 1 },
    description:
      "Houses and trains mounted cavalry units for swift battlefield mobility.",
  },
  [BuildingType.MAGE_TOWER]: {
    type: BuildingType.MAGE_TOWER,
    cost: 1200,
    hp: 180,
    goldIncome: 2,
    shopInventory: [
      UnitType.FIRE_MAGE,
      UnitType.STORM_MAGE,
      UnitType.COLD_MAGE,
      UnitType.DISTORTION_MAGE,
      UnitType.SUMMONER,
      UnitType.CONSTRUCTIONIST,
      UnitType.DARK_SAVANT,
    ],
    blueprints: [],
    footprint: { w: 2, h: 2 },
    placementZone: "own",
    prerequisite: { types: [BuildingType.ARCHERY_RANGE], minCount: 1 },
    defaultTurrets: [
      { projectileTag: "lightning", damage: 40, range: 5, attackSpeed: 0.5 },
    ],
    description:
      "Arcane academy that defends with chain lightning that strikes any who dare approach.",
  },
  [BuildingType.ARCHERY_RANGE]: {
    type: BuildingType.ARCHERY_RANGE,
    cost: 500,
    hp: 150,
    goldIncome: 1,
    shopInventory: [
      UnitType.ARCHER,
      UnitType.CROSSBOWMAN,
      UnitType.LONGBOWMAN,
      UnitType.REPEATER,
    ],
    blueprints: [],
    footprint: { w: 4, h: 2 },
    placementZone: "own",
    description:
      "Training grounds for marksmen who strike from distance with deadly precision.",
  },
  [BuildingType.SIEGE_WORKSHOP]: {
    type: BuildingType.SIEGE_WORKSHOP,
    cost: 600,
    hp: 180,
    goldIncome: 1,
    shopInventory: [UnitType.BALLISTA, UnitType.BATTERING_RAM],
    blueprints: [],
    footprint: { w: 2, h: 2 },
    placementZone: "own",
    prerequisite: { types: [BuildingType.ARCHERY_RANGE], minCount: 1 },
    description:
      "Forge where devastating siege weapons are crafted for destroying fortifications.",
  },
  [BuildingType.BLACKSMITH]: {
    type: BuildingType.BLACKSMITH,
    cost: 500,
    hp: 150,
    goldIncome: 2,
    shopInventory: [],
    blueprints: [],
    upgradeInventory: [
      UpgradeType.MELEE_DAMAGE,
      UpgradeType.MELEE_HEALTH,
      UpgradeType.RANGED_DAMAGE,
      UpgradeType.RANGED_HEALTH,
      UpgradeType.SIEGE_DAMAGE,
      UpgradeType.SIEGE_HEALTH,
      UpgradeType.CREATURE_DAMAGE,
      UpgradeType.CREATURE_HEALTH,
      UpgradeType.MAGE_RANGE,
    ],
    footprint: { w: 2, h: 2 },
    placementZone: "own",
    prerequisite: { types: [BuildingType.BARRACKS], minCount: 1 },
    description:
      "Enhances unit equipment and provides additional gold income through metalworking.",
  },
  [BuildingType.TOWN]: {
    type: BuildingType.TOWN,
    cost: 0,
    hp: 200,
    goldIncome: 3,
    shopInventory: [],
    blueprints: [],
    footprint: { w: 2, h: 2 },
    placementZone: "neutral",
    capturable: true,
  },
  [BuildingType.CREATURE_DEN]: {
    type: BuildingType.CREATURE_DEN,
    cost: 650,
    hp: 200,
    goldIncome: 1,
    shopInventory: [
      UnitType.SPIDER,
      UnitType.VOID_SNAIL,
      UnitType.FAERY_QUEEN,
      UnitType.GIANT_FROG,
      UnitType.DEVOURER,
      UnitType.RED_DRAGON,
      UnitType.FROST_DRAGON,
      UnitType.CYCLOPS,
      UnitType.TROLL,
      UnitType.BAT,
    ],
    blueprints: [],
    footprint: { w: 2, h: 2 },
    placementZone: "own",
    prerequisite: { types: [BuildingType.MARKET], minCount: 1 },
    description:
      "Mystical habitat where legendary creatures are tamed for battle.",
  },
  [BuildingType.TOWER]: {
    type: BuildingType.TOWER,
    cost: 400,
    hp: 250,
    goldIncome: 0,
    shopInventory: [],
    blueprints: [],
    footprint: { w: 1, h: 1 },
    placementZone: "own",
    capturable: true,
    prerequisite: { types: [BuildingType.BLACKSMITH], minCount: 1 },
    defaultTurrets: [
      { projectileTag: "arrow", damage: 9, range: 6, attackSpeed: 1.0 },
    ],
    description:
      "Defensive structure with arrow turrets that can be captured by enemies.",
  },
  [BuildingType.FARM]: {
    type: BuildingType.FARM,
    cost: 300,
    hp: 150,
    goldIncome: 3,
    shopInventory: [],
    blueprints: [],
    footprint: { w: 2, h: 2 },
    placementZone: "own",
    capturable: true,
    maxCount: 5,
    description:
      "Agricultural center that provides steady gold income through food production.",
  },
  [BuildingType.HAMLET]: {
    type: BuildingType.HAMLET,
    cost: 1000,
    hp: 200,
    goldIncome: 15,
    shopInventory: [],
    blueprints: [],
    footprint: { w: 2, h: 2 },
    placementZone: "own",
    maxCount: 1,
    prerequisite: { types: [BuildingType.FARM], minCount: 5 },
    description:
      "Upgraded settlement that provides substantial gold income once farms are established.",
  },
  [BuildingType.EMBASSY]: {
    type: BuildingType.EMBASSY,
    cost: 600,
    hp: 200,
    goldIncome: 3,
    shopInventory: [UnitType.DIPLOMAT],
    blueprints: [],
    footprint: { w: 2, h: 2 },
    placementZone: "own",
    maxCount: 2,
    description:
      "Diplomatic center that trains units to capture neutral buildings peacefully.",
  },
  [BuildingType.TEMPLE]: {
    type: BuildingType.TEMPLE,
    cost: 750,
    hp: 200,
    goldIncome: 1,
    shopInventory: [
      UnitType.MONK,
      UnitType.CLERIC,
      UnitType.SAINT,
      UnitType.TEMPLAR,
      UnitType.ANGEL,
    ],
    blueprints: [],
    footprint: { w: 2, h: 3 },
    placementZone: "own",
    description:
      "Sacred sanctuary where healers and holy warriors are trained to support allies.",
  },
  [BuildingType.WALL]: {
    type: BuildingType.WALL,
    cost: 250,
    hp: 500,
    goldIncome: 0,
    shopInventory: [],
    blueprints: [],
    footprint: { w: 1, h: 3 },
    placementZone: "own",
    capturable: false,
    description:
      "Impenetrable barrier that blocks enemy movement and cannot be captured.",
  },
  [BuildingType.FIREPIT]: {
    type: BuildingType.FIREPIT,
    cost: 0,
    hp: 100,
    goldIncome: 0,
    shopInventory: [],
    blueprints: [],
    footprint: { w: 2, h: 1 },
    placementZone: "any",
    capturable: false,
    description:
      "Neutral bonfire that provides light and warmth to the battlefield.",
  },
  [BuildingType.MILL]: {
    type: BuildingType.MILL,
    cost: 1000,
    hp: 300,
    goldIncome: 8,
    shopInventory: [],
    blueprints: [],
    footprint: { w: 1, h: 2 },
    placementZone: "own",
    capturable: false,
    maxCount: 2,
    prerequisite: { types: [BuildingType.FARM], minCount: 3 },
    description:
      "Industrial facility that processes resources into substantial gold income.",
  },
  [BuildingType.ELITE_HALL]: {
    type: BuildingType.ELITE_HALL,
    cost: 1500,
    hp: 400,
    goldIncome: 5,
    shopInventory: [UnitType.HERO],
    blueprints: [],
    footprint: { w: 2, h: 2 },
    placementZone: "own",
    capturable: false,
    maxCount: 1,
    prerequisite: {
      types: [BuildingType.MAGE_TOWER, BuildingType.BLACKSMITH],
      minCount: 1,
    },
    description:
      "Prestigious center that provides massive gold income through advanced commerce.",
  },
  [BuildingType.MARKET]: {
    type: BuildingType.MARKET,
    cost: 1250,
    hp: 250,
    goldIncome: 10,
    shopInventory: [],
    blueprints: [],
    footprint: { w: 2, h: 2 },
    placementZone: "own",
    capturable: false,
    maxCount: 1,
    prerequisite: { types: [BuildingType.FARM], minCount: 1 },
    description:
      "Grand trading hub that generates the highest gold income through commerce.",
  },
  [BuildingType.FACTION_HALL]: {
    type: BuildingType.FACTION_HALL,
    cost: 1000,
    hp: 300,
    goldIncome: 2,
    shopInventory: [], // populated at runtime based on player race
    blueprints: [],
    footprint: { w: 2, h: 2 },
    placementZone: "own",
    capturable: false,
    prerequisite: { types: [BuildingType.TEMPLE], minCount: 1 },
    description:
      "The hall of your people. Trains powerful faction-exclusive units unavailable to other races.",
  },
};
