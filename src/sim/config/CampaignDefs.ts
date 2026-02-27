// Campaign scenario definitions.
// Each scenario specifies its unlock code, narrative, map settings, and the
// new units/buildings/races/leaders it grants when the player wins.
//
// Progression: start with nothing unlocked (swordsman only, no buildings).
// Each victory reveals a 4-digit code that is shown on the victory screen.
// Entering a code on the scenario select screen unlocks the next scenario.

import { UnitType, BuildingType } from "@/types";
import type { RaceId } from "@sim/config/RaceDefs";
import type { LeaderId } from "@sim/config/LeaderDefs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * The gameplay type of a scenario — controls how the map is set up at boot.
 *
 * "standard"    — PREP phase, castles present, towns and neutral buildings spawn.
 * "battlefield" — No buildings, no PREP phase, no random events. Both sides
 *                 start with units already on the map near each other.
 */
export type ScenarioType = "standard" | "battlefield";

export interface ScenarioUnlocks {
  units?: UnitType[];
  buildings?: BuildingType[];
  races?: RaceId[];
  leaders?: LeaderId[];
}

export interface ScenarioDef {
  /** 1-based scenario number. */
  number: number;
  /** Short title shown in the scenario card. */
  title: string;
  /** One-paragraph lore/briefing shown in the detail panel. */
  briefing: string;
  /** 4-digit code revealed on victory that also unlocks the next scenario. */
  victoryCode: string;
  /** What becomes available to the player after completing this scenario. */
  unlocks: ScenarioUnlocks;
  /**
   * Controls the map setup for this scenario.
   * Defaults to "standard" if omitted.
   */
  type?: ScenarioType;
  /**
   * If true, random events are disabled for this scenario (eventTimer = Infinity).
   * Neutral units from events will never appear.
   */
  disableEvents?: boolean;
  /**
   * Restricts the AI (p2) castle blueprints to only these building types.
   * If omitted, the AI has access to all blueprints as normal.
   */
  aiBlueprints?: BuildingType[];
  /**
   * Extra gold granted to the AI (p2) at the start of this scenario,
   * on top of the normal starting gold.
   */
  aiExtraGold?: number;
}

// ---------------------------------------------------------------------------
// Definitions — 20 scenarios
// ---------------------------------------------------------------------------

export const SCENARIO_DEFINITIONS: ScenarioDef[] = [
  {
    number: 1,
    title: "First Blood",
    briefing:
      "The realm is at war. Your castle stands alone against a rival lord who commands the eastern lands. You have a handful of swordsmen and raw determination. Hold the line — and prove your worth as a commander.",
    victoryCode: "6226",
    type: "battlefield",
    unlocks: {
      units: [UnitType.ARCHER],
      buildings: [BuildingType.BARRACKS],
    },
  },
  {
    number: 2,
    title: "The Barracks",
    briefing:
      "With your first victory secured, you've earned enough gold to erect proper barracks. Train more soldiers and push back the enemy's advance. Your archers can rain death from a distance now — use them wisely.",
    victoryCode: "3847",
    unlocks: {
      units: [UnitType.PIKEMAN],
      buildings: [BuildingType.ARCHERY_RANGE],
    },
    disableEvents: true,
    aiBlueprints: [BuildingType.TOWER, BuildingType.WALL],
    aiExtraGold: 4000,
  },
  {
    number: 3,
    title: "The Long Road",
    briefing:
      "The enemy has fortified their position with towers and a ring of pikemen. Break through their lines. Your archery range will let you mass ranged units for the first time.",
    victoryCode: "7193",
    unlocks: {
      units: [UnitType.LONGBOWMAN, UnitType.CROSSBOWMAN],
      buildings: [BuildingType.STABLES],
    },
  },
  {
    number: 4,
    title: "Steel and Saddle",
    briefing:
      "A mounted enemy force has been spotted moving through the hills. Speed and reach will be your greatest weapons. Build a stable and field cavalry before they outmanoeuvre you.",
    victoryCode: "5512",
    unlocks: {
      units: [UnitType.KNIGHT],
      buildings: [BuildingType.TOWER],
    },
  },
  {
    number: 5,
    title: "The Watchtower",
    briefing:
      "Intelligence reports show the enemy massing troops near neutral towns. Control the high ground. Towers will give you a defensive advantage — station your archers and hold every neutral building you can reach.",
    victoryCode: "9034",
    unlocks: {
      units: [UnitType.SHORTBOW],
      buildings: [BuildingType.FARM],
      leaders: ["arthur"],
    },
  },
  {
    number: 6,
    title: "Fields of Plenty",
    briefing:
      "A prolonged campaign drains gold fast. Farms boost your income and sustain larger armies. The enemy has learned from their defeats and brings a mixed force. Do not underestimate them.",
    victoryCode: "2781",
    unlocks: {
      units: [UnitType.SCOUT_CAVALRY, UnitType.HORSE_ARCHER],
      buildings: [BuildingType.MARKET],
    },
  },
  {
    number: 7,
    title: "The Merchant War",
    briefing:
      "A rival merchant guild has hired sellswords to protect their trade routes — which run straight through your territory. Markets generate gold fast, but they also make tempting targets. Protect your economy while destroying theirs.",
    victoryCode: "6650",
    unlocks: {
      units: [UnitType.MAGE_HUNTER],
      buildings: [BuildingType.MAGE_TOWER],
    },
  },
  {
    number: 8,
    title: "Arcane Uprising",
    briefing:
      "Mages have taken sides in this war. Your enemies now field fire mages who can burn entire formations. A mage tower will let you study their arts — and counter them. Do not let them roam unchecked.",
    victoryCode: "4423",
    unlocks: {
      units: [UnitType.FIRE_MAGE],
      buildings: [BuildingType.BLACKSMITH],
    },
  },
  {
    number: 9,
    title: "Iron Forged",
    briefing:
      "Your blacksmith lets you upgrade the quality of your forces. Better-equipped soldiers mean fewer losses. The enemy has hired a knight commander who drives their cavalry relentlessly. Break the charge and hold your ground.",
    victoryCode: "8817",
    unlocks: {
      units: [UnitType.GLADIATOR, UnitType.HALBERDIER],
      leaders: ["joan"],
    },
  },
  {
    number: 10,
    title: "The Gladiator's Oath",
    briefing:
      "Freed gladiators and veteran halberdiers have sworn service to your banner. A new challenger has risen — a warlord who has conquered three kingdoms. This is the midpoint of the campaign. Prove you can face a true opponent.",
    victoryCode: "1199",
    unlocks: {
      units: [UnitType.STORM_MAGE],
      buildings: [BuildingType.SIEGE_WORKSHOP],
      races: ["man"],
    },
  },
  {
    number: 11,
    title: "The Storm Rises",
    briefing:
      "Storms now answer your call. Siege workshops let you deploy battering rams and bolt throwers to smash enemy fortifications. The warlord's castle walls will not stand forever.",
    victoryCode: "3362",
    unlocks: {
      units: [UnitType.BATTERING_RAM, UnitType.BALLISTA],
      buildings: [BuildingType.CREATURE_DEN],
    },
  },
  {
    number: 12,
    title: "Creatures of the Dark",
    briefing:
      "Strange allies emerge from the wild — spiders, giant frogs, and other creatures. A creature den lets you harness their power. The enemy fields summoners who call forth minions from thin air. Meet dark with dark.",
    victoryCode: "7745",
    unlocks: {
      units: [UnitType.SPIDER, UnitType.GIANT_FROG, UnitType.SUMMONER],
      buildings: [BuildingType.ELITE_HALL],
    },
  },
  {
    number: 13,
    title: "Hall of Champions",
    briefing:
      "The Elite Hall unlocks the finest warriors your realm can produce. Lancers, elite infantry, and veteran champions stand ready. But the enemy has done the same — expect to face elite forces of their own.",
    victoryCode: "9901",
    unlocks: {
      units: [UnitType.LANCER, UnitType.ELITE_LANCER, UnitType.KNIGHT_LANCER],
      buildings: [BuildingType.TEMPLE],
      races: ["elf"],
    },
  },
  {
    number: 14,
    title: "The Sacred Order",
    briefing:
      "Monks and clerics have joined your army after you liberated their temple. Healing in the field can turn the tide of a long battle. The elven forests have also sent emissaries — a new race fights beside you.",
    victoryCode: "5538",
    unlocks: {
      units: [UnitType.MONK, UnitType.CLERIC],
      buildings: [BuildingType.EMBASSY],
    },
  },
  {
    number: 15,
    title: "The Diplomat",
    briefing:
      "Diplomats can change allegiances on the battlefield — turning enemy units to your cause without a fight. But the enemy has discovered this too. Guard your ranks and exploit every opening. The war reaches its penultimate act.",
    victoryCode: "2266",
    unlocks: {
      units: [UnitType.DIPLOMAT, UnitType.SAINT],
      buildings: [BuildingType.HAMLET],
      leaders: ["merlin"],
    },
  },
  {
    number: 16,
    title: "The Hidden Village",
    briefing:
      "Hamlets cluster around the map, generating steady income for whoever controls them. A cold mage has emerged from the northern glaciers and offered their services. Use their frost abilities to slow enemy advances.",
    victoryCode: "8843",
    unlocks: {
      units: [UnitType.COLD_MAGE, UnitType.DISTORTION_MAGE],
      buildings: [BuildingType.MILL],
    },
  },
  {
    number: 17,
    title: "The Grinding Mills",
    briefing:
      "Mills accelerate your gold income from farms and hamlets. Distortion mages can warp space itself — teleporting friendlies or displacing enemies. The enemy commander has unlocked dragons. This will be a hard fight.",
    victoryCode: "6671",
    unlocks: {
      units: [UnitType.VOID_SNAIL, UnitType.DEVOURER, UnitType.FAERY_QUEEN],
      buildings: [BuildingType.WALL],
    },
  },
  {
    number: 18,
    title: "Walls of Stone",
    briefing:
      "Walls now let you fortify your territory and channel enemy movement. Exotic creatures join your ranks. A giant cyclops has been sighted among the enemy forces — bring heavy armour and siege weapons.",
    victoryCode: "4417",
    unlocks: {
      units: [UnitType.RED_DRAGON, UnitType.BOLT_THROWER, UnitType.SIEGE_HUNTER],
      buildings: [BuildingType.FIREPIT],
    },
  },
  {
    number: 19,
    title: "The Dragon's Roar",
    briefing:
      "Dragons soar above the battlefield, breathing fire and frost. Firepits power your creatures and boost their morale. Only one final barrier remains between you and total victory — the enemy's mightiest champion and their full army.",
    victoryCode: "9920",
    unlocks: {
      units: [UnitType.FROST_DRAGON, UnitType.CYCLOPS],
      buildings: [BuildingType.FACTION_HALL],
      leaders: ["boudicca"],
    },
  },
  {
    number: 20,
    title: "The Final War",
    briefing:
      "Every unit. Every building. Every hero. All of it comes down to this last engagement. The enemy commander has had as long as you to prepare. There will be no second chance. Win — and the realm is yours forever.",
    victoryCode: "0000",
    unlocks: {},
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getScenario(number: number): ScenarioDef | undefined {
  return SCENARIO_DEFINITIONS.find((s) => s.number === number);
}

/** Return the scenario unlocked by a given 4-digit code, or undefined. */
export function getScenarioByCode(code: string): ScenarioDef | undefined {
  return SCENARIO_DEFINITIONS.find((s) => s.victoryCode === code);
}
