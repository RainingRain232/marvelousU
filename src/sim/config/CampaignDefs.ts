// Campaign scenario definitions.
// Each scenario specifies its unlock code, narrative, map settings, and the
// new units/buildings/races/leaders it grants when the player wins.
//
// Progression: start with nothing unlocked (swordsman only, no buildings).
// Each victory reveals a 4-digit code that is shown on the victory screen.
// Entering a code on the scenario select screen unlocks the next scenario.

import { UnitType, BuildingType, UpgradeType } from "@/types";
import type { RaceId } from "@sim/config/RaceDefs";
import type { LeaderId } from "@sim/config/LeaderDefs";
import type { ArmoryItemId } from "@sim/config/ArmoryItemDefs";

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
  items?: ArmoryItemId[];
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
  /**
   * If true, P1 cannot build anything — castle shop, blueprints, and firepit
   * are all emptied. The player must win with what they start with.
   */
  p1NoBuild?: boolean;
  /**
   * Upgrade types that P1 starts with already purchased (level 1).
   */
  p1StartUpgrades?: import("@/types").UpgradeType[];
  /**
   * Extra gold granted to P1 at the start of this scenario,
   * on top of the normal starting gold.
   */
  p1ExtraGold?: number;
  /**
   * Force the AI (p2) to use a specific race.
   * If omitted, the AI uses default (no race applied).
   */
  aiRace?: RaceId;
  /**
   * Override map size for this scenario.
   * If omitted, uses the player's chosen map size.
   */
  mapSizeLabel?: "STANDARD" | "DOUBLE" | "TRIPLE" | "QUADRUPLE" | "QUINTUPLE";
  /**
   * Number of players (2-4). If omitted, defaults to 2.
   */
  playerCount?: number;
  /**
   * Player IDs that are allied with p1. E.g. ["p3"] makes p3 friendly.
   */
  alliedPlayerIds?: string[];
}

// ---------------------------------------------------------------------------
// Definitions — 25 scenarios
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
      items: ["longsword", "spear"],
    },
  },
  {
    number: 2,
    title: "Firepit Frenzy",
    briefing:
      "The firepit units of the land have gathered in protest. Calm them down with a show of force — swords, shields, bows and a little holy magic should do the trick.",
    victoryCode: "4591",
    type: "battlefield",
    unlocks: {
      buildings: [BuildingType.FIREPIT, BuildingType.FARM],
    },
  },
  {
    number: 3,
    title: "The Barracks",
    briefing:
      "With your first victory secured, you've earned enough gold to erect proper barracks. Train more soldiers and push back the enemy's advance. Your archers can rain death from a distance now — use them wisely.",
    victoryCode: "3847",
    unlocks: {
      units: [UnitType.PIKEMAN],
      buildings: [BuildingType.ARCHERY_RANGE],
      items: ["leather_armor", "leather_sandals"],
    },
    disableEvents: true,
    aiBlueprints: [BuildingType.TOWER, BuildingType.WALL],
    aiExtraGold: 4000,
  },
  {
    number: 4,
    title: "The Art of War",
    briefing:
      "A training ground to master the art of war. Watch your clerics heal under fire, lancers charge with devastating force, master mages unleash destructive spells, and siege hunters track down enemy siege engines. Knowledge is the sharpest weapon.",
    victoryCode: "1337",
    type: "battlefield",
    unlocks: {},
  },
  {
    number: 5,
    title: "The Dark Savant",
    briefing:
      "A lone Dark Savant stands against an entrenched enemy. You cannot build or train — only your savant's fireballs and natural regeneration can carry the day. Use the rally flag to pull back, heal, and strike again.",
    victoryCode: "6639",
    unlocks: {},
    p1NoBuild: true,
    p1StartUpgrades: [UpgradeType.FLAG],
    disableEvents: true,
    aiExtraGold: 5000,
  },
  {
    number: 6,
    title: "The First Skirmish",
    briefing:
      "Merlin has granted you a generous war chest and access to all the troops and buildings you have earned so far. This is your first true skirmish — a proper battle with full freedom to build, expand, and experiment. Use your new troops and buildings well, commander.",
    victoryCode: "5283",
    unlocks: {},
    p1ExtraGold: 2000,
  },
  {
    number: 7,
    title: "The Long Road",
    briefing:
      "The road ahead stretches far across a vast territory. A friendly pixie colony in the northeast has pledged their swarm to your cause — their speed and numbers may prove invaluable. Together, push back the enemy and claim this land.",
    victoryCode: "7193",
    unlocks: {
      units: [UnitType.LONGBOWMAN, UnitType.CROSSBOWMAN, UnitType.QUESTING_KNIGHT],
      buildings: [BuildingType.STABLES],
      items: ["steel_shield"],
    },
    mapSizeLabel: "DOUBLE",
    playerCount: 3,
    alliedPlayerIds: ["p3"],
  },
  {
    number: 8,
    title: "The Sword in the Stone",
    briefing:
      "Arthur has drawn Caliburn from the stone, but the lesser kings refuse to bend the knee. Three rival lords converge on Camelot to challenge the boy-king's claim. Sir Ector's household rides from the southwest to honour the foster-father's oath. Neutral stone circles dot the land — capture them and the minor lords within will swear fealty to your banner.",
    victoryCode: "5512",
    unlocks: {
      units: [UnitType.KNIGHT],
      buildings: [BuildingType.TOWER],
      items: ["war_axe"],
    },
    mapSizeLabel: "TRIPLE",
    playerCount: 4,
    alliedPlayerIds: ["p4"],
  },
  {
    number: 9,
    title: "The Green Chapel",
    briefing:
      "Sir Gawain accepted the Green Knight's challenge and must journey to the Green Chapel to receive the return blow. Towers along the road are waypoints — hold them to protect the pilgrimage. But beware: the Green Knight himself stalks the centre of the map, a towering figure who regenerates from every wound. Only by controlling the towers can your archers thin his strength before he reaches your lines.",
    victoryCode: "9034",
    unlocks: {
      units: [UnitType.SHORTBOW],
      buildings: [BuildingType.FARM],
      leaders: ["arthur"],
      items: ["chainmail"],
    },
  },
  {
    number: 10,
    title: "The Fisher King's Lands",
    briefing:
      "The Fisher King lies wounded and his domain withers. The land itself is dying — corrupted creatures crawl from blighted ground. Farms you build slowly restore fertility and income, but the wasteland spawns spiders and void snails from the decay. The enemy suffers no such curse. You must out-earn the blight and purify the land by capturing neutral hamlets before the corruption overwhelms you.",
    victoryCode: "2781",
    unlocks: {
      units: [UnitType.SCOUT_CAVALRY, UnitType.HORSE_ARCHER],
      buildings: [BuildingType.MARKET],
      items: ["iron_boots"],
    },
  },
  {
    number: 11,
    title: "Morgan's Bargain",
    briefing:
      "Morgan le Fay offers a devil's bargain — her enchanted markets generate gold faster than anything in the realm, but her agents sell to both sides. Markets on the map are guarded by Fay creatures — faery queens and pixie swarms that must be defeated before you can claim the riches within. Control Morgan's markets and the gold flows; lose them and your enemy grows fat on enchanted coin.",
    victoryCode: "6650",
    unlocks: {
      units: [UnitType.MAGE_HUNTER],
      buildings: [BuildingType.MAGE_TOWER],
      items: ["flaming_sword"],
    },
  },
  {
    number: 12,
    title: "The Siege Perilous",
    briefing:
      "The Siege Perilous — the forbidden seat at the Round Table — has been activated by a rogue sorcerer. Arcane energy floods the battlefield and the enemy fields fire mages channelling power from ley lines. A mage tower will let you counter their arts. At the centre of the map sits the Siege Perilous itself — capture it, and a champion knight will rally to your cause each round. Leave it unguarded, and hostile storm mages will pour from the ley-line nodes instead.",
    victoryCode: "4423",
    unlocks: {
      units: [UnitType.FIRE_MAGE],
      buildings: [BuildingType.BLACKSMITH],
      items: ["elven_bow"],
    },
  },
  {
    number: 13,
    title: "The Black Knight",
    briefing:
      "A mysterious Black Knight holds the only bridge across the river, slaying all who dare to cross. Your blacksmith can forge weapons strong enough to challenge him, but until your army is properly equipped, his elite cavalry will cut down anything that attempts the crossing. The enemy sits safely on the far side, building freely. Upgrade your forces and break through — or be trapped forever on this bank.",
    victoryCode: "8817",
    unlocks: {
      units: [UnitType.GLADIATOR, UnitType.HALBERDIER],
      leaders: ["guinevere"],
      items: ["plate_armor"],
    },
  },
  {
    number: 14,
    title: "The Questing Beast",
    briefing:
      "King Pellinore's legendary quarry — the Questing Beast — rampages across the battlefield, attacking all who cross its path. It is fast, powerful, and regenerates from every wound. Meanwhile, a rival king has declared war. You must survive the Beast's rampages while breaking the enemy's forces. Slay the creature and a bounty of gold is yours — but it will return, drawn by the scent of battle.",
    victoryCode: "1199",
    unlocks: {
      units: [UnitType.STORM_MAGE],
      buildings: [BuildingType.SIEGE_WORKSHOP],
      races: ["man"],
      items: ["winged_boots"],
    },
  },
  {
    number: 15,
    title: "The Dolorous Stroke",
    briefing:
      "Sir Balin has struck the Dolorous Stroke with the Spear of Longinus, wounding the Fisher King and shattering three kingdoms. Castle walls crumble and the dead rise from the ruins. Your siege workshop is the only way to breach the enemy's damaged fortifications, while undead warriors crawl from every shattered ruin on the map. Capture the ruins to lay the dead to rest — or be overwhelmed by the restless fallen.",
    victoryCode: "3362",
    unlocks: {
      units: [UnitType.BATTERING_RAM, UnitType.BALLISTA],
      buildings: [BuildingType.CREATURE_DEN],
      items: ["mace_of_might"],
    },
  },
  {
    number: 16,
    title: "The Perilous Forest",
    briefing:
      "The Perilous Forest — where no knight enters without facing a trial. Your creature den lets you tame the forest's inhabitants, but the forest fights back. Waves of hostile creatures — spiders from dark hollows, giant frogs from the marshes, void snails from the deep — pour from the tree line at intervals. The enemy has their own summoners deep within the woods. Tame the wild or be consumed by it.",
    victoryCode: "7745",
    unlocks: {
      units: [UnitType.SPIDER, UnitType.GIANT_FROG, UnitType.SUMMONER],
      buildings: [BuildingType.ELITE_HALL],
      items: ["halberd"],
    },
  },
  {
    number: 17,
    title: "The Tournament at Camelot",
    briefing:
      "Arthur has called a grand tournament to find the realm's greatest champions. The Elite Hall represents the tournament grounds — lancers, elite infantry, and veteran knights stand ready to prove their worth. But Mordred has entered his own champions under false banners. Neutral heralds appear at intervals announcing new challengers — powerful knights who attack both sides indiscriminately. Only the strongest will survive the tournament grounds.",
    victoryCode: "9901",
    unlocks: {
      units: [UnitType.LANCER, UnitType.ELITE_LANCER, UnitType.KNIGHT_LANCER],
      buildings: [BuildingType.TEMPLE],
      races: ["elf"],
      items: ["enchanted_cloak"],
    },
  },
  {
    number: 18,
    title: "The Chapel of the Grail",
    briefing:
      "Three knights — Galahad, Percival, and Bors — have found the path to the Grail Chapel. Your temple trains the clerics and monks who tend the wounded along this sacred road. But the chapel is guarded by angelic wardens who test all who approach — saints and holy warriors of terrible power. Capture the chapel and its divine blessing will heal your base and grant you holy reinforcements each round.",
    victoryCode: "5538",
    unlocks: {
      units: [UnitType.MONK, UnitType.CLERIC],
      buildings: [BuildingType.EMBASSY],
      items: ["giants_belt"],
    },
  },
  {
    number: 19,
    title: "Lancelot's Betrayal",
    briefing:
      "Lancelot has been discovered with Guinevere. Half the Round Table's knights defect to his cause. The enemy starts with extra forces — knights who abandoned your banner. But scattered across the map, groups of wavering knights have yet to choose a side. Send your diplomats to win them back before the enemy claims their loyalty. The fate of Camelot hangs on whose words they believe.",
    victoryCode: "2266",
    unlocks: {
      units: [UnitType.DIPLOMAT, UnitType.SAINT],
      buildings: [BuildingType.HAMLET],
      leaders: ["merlin"],
      items: ["dragonscale_mail"],
    },
    aiExtraGold: 3000,
  },
  {
    number: 20,
    title: "The Isle of Avalon",
    briefing:
      "Avalon's enchanted hamlets are hidden behind mist. Cold mages can freeze the mist-rivers to create paths, while the island's Fay guardians — faery queens and frost drakes — defend each settlement fiercely. Nimue watches from the lake, her ancient power suffusing the isle. Control Avalon's hamlets to fund the final war, but respect the island's guardians or they will sweep your forces into the enchanted waters.",
    victoryCode: "8843",
    unlocks: {
      units: [UnitType.COLD_MAGE, UnitType.DISTORTION_MAGE],
      buildings: [BuildingType.MILL],
      items: ["storm_lance"],
    },
  },
  {
    number: 21,
    title: "The Grail War",
    briefing:
      "The Holy Grail has been sighted, and every kingdom marches to claim it. Mills and farms fuel the largest armies the realm has ever seen. Distortion mages warp reality around the Grail's resting place — void snails and distortion fields surround it in a ring of twisted space. The enemy has unlocked dragons. Capture the Grail at the centre of the map and a saint will rally to your cause each round. This will be a hard fight.",
    victoryCode: "6671",
    unlocks: {
      units: [UnitType.VOID_SNAIL, UnitType.DEVOURER, UnitType.FAERY_QUEEN],
      buildings: [BuildingType.WALL],
      items: ["crown_of_valor"],
    },
  },
  {
    number: 22,
    title: "The Walls of Camelot",
    briefing:
      "Mordred's army besieges Camelot. Walls are your lifeline — fortify your territory and channel the enemy's advance. Mordred fields cyclops siege-breakers and massed infantry to smash through your defences. Loyalist knights from outlying castles will ride to your aid, but only while those castles still stand. Protect your flanks or Mordred's siege engines will reduce everything to rubble.",
    victoryCode: "4417",
    unlocks: {
      units: [UnitType.RED_DRAGON, UnitType.BOLT_THROWER, UnitType.SIEGE_HUNTER],
      items: ["shadow_dagger"],
    },
    aiExtraGold: 4000,
  },
  {
    number: 23,
    title: "The Dragon of the White Tower",
    briefing:
      "Beneath Vortigern's White Tower, two dragons — one red, one white — have been locked in eternal combat since before Arthur's birth. Merlin prophesied their release, and now both are loose. The Red Dragon of Britain fights for your cause; the White Dragon of the Saxons fights for the enemy. Meanwhile, wild frost dragons descend from the northern wastes, attacking whoever is closest. Command the skies or be burned from them.",
    victoryCode: "9920",
    unlocks: {
      units: [UnitType.FROST_DRAGON, UnitType.CYCLOPS],
      buildings: [BuildingType.FACTION_HALL],
      leaders: ["nimue"],
    },
  },
  {
    number: 24,
    title: "The Road to Avalon",
    briefing:
      "The path to Avalon lies through a vast battlefield. You have amassed a war chest of 30,000 gold and every unit in the realm answers your call. But the Men of the East have rallied 40,000 gold worth of disciplined soldiers. Spend wisely during preparation — this fight will test everything you have learned.",
    victoryCode: "3141",
    unlocks: {},
    p1ExtraGold: 28500,
    aiExtraGold: 38500,
    aiRace: "man",
  },
  {
    number: 25,
    title: "The Last Stand",
    briefing:
      "Merlin has foreseen a cataclysmic battle. The enemy has summoned ancient giants and archmages of terrifying power — tier VII warriors that can crush entire armies. You have everything at your disposal and extra gold to prepare, but do not underestimate what approaches. This is the very hard end battle.",
    victoryCode: "7777",
    unlocks: {},
    p1ExtraGold: 3000,
    aiExtraGold: 8000,
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
