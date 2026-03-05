// Shop overlay — opens when a player clicks an owned building
// Redesigned: preview area + stats + icon grid layout
import {
  Container,
  Graphics,
  Text,
  TextStyle,
  AnimatedSprite,
  Texture,
  RenderTexture,
  Sprite,
  type Renderer,
} from "pixi.js";
import type { GameState } from "@sim/state/GameState";
import type { ViewManager } from "@view/ViewManager";
import { EventBus } from "@sim/core/EventBus";
import { addToQueue } from "@sim/systems/SpawnSystem";
import { BUILDING_DEFINITIONS } from "@sim/config/BuildingDefs";
import { UNIT_DEFINITIONS } from "@sim/config/UnitDefinitions";
import { UPGRADE_DEFINITIONS } from "@sim/config/UpgradeDefs";
import { UpgradeSystem } from "@sim/systems/UpgradeSystem";
import {
  BuildingType,
  BuildingState,
  UnitType,
  UnitState,
  UpgradeType,
} from "@/types";
import { buildingPlacer } from "@view/ui/BuildingPlacer";
import { animationManager } from "@view/animation/AnimationManager";
import gsap from "gsap";
import { CastleRenderer } from "@view/entities/CastleRenderer";
import { TowerRenderer } from "@view/entities/TowerRenderer";
import { LightningTowerRenderer } from "@view/entities/LightningTowerRenderer";
import { IceTowerRenderer } from "@view/entities/IceTowerRenderer";
import { FireTowerRenderer } from "@view/entities/FireTowerRenderer";
import { WarpTowerRenderer } from "@view/entities/WarpTowerRenderer";
import { HealingTowerRenderer } from "@view/entities/HealingTowerRenderer";
import { BallistaTowerRenderer } from "@view/entities/BallistaTowerRenderer";
import { RepeaterTowerRenderer } from "@view/entities/RepeaterTowerRenderer";
import { ArchitectsGuildRenderer } from "@view/entities/ArchitectsGuildRenderer";
import { FarmRenderer } from "@view/entities/FarmRenderer";
import { WallRenderer } from "@view/entities/WallRenderer";
import { TempleRenderer } from "@view/entities/TempleRenderer";
import { MageTowerRenderer } from "@view/entities/MageTowerRenderer";
import { ArcheryRangeRenderer } from "@view/entities/ArcheryRangeRenderer";
import { BarracksRenderer } from "@view/entities/BarracksRenderer";
import { StableRenderer } from "@view/entities/StableRenderer";
import { SiegeWorkshopRenderer } from "@view/entities/SiegeWorkshopRenderer";
import { BlacksmithRenderer } from "@view/entities/BlacksmithRenderer";
import { EmbassyRenderer } from "@view/entities/EmbassyRenderer";
import { CreatureDenRenderer } from "@view/entities/CreatureDenRenderer";
import { MillRenderer } from "@view/entities/MillRenderer";
import { HamletRenderer } from "@view/entities/HamletRenderer";
import { EliteHallRenderer } from "@view/entities/EliteHallRenderer";
import { MarketRenderer } from "@view/entities/MarketRenderer";
import { FactionHallRenderer } from "@view/entities/FactionHallRenderer";
import { House1Renderer } from "@view/entities/House1Renderer";
import { House2Renderer } from "@view/entities/House2Renderer";
import { House3Renderer } from "@view/entities/House3Renderer";
import { EliteBarracksRenderer } from "@view/entities/EliteBarracksRenderer";
import { EliteArcheryRangeRenderer } from "@view/entities/EliteArcheryRangeRenderer";
import { EliteSiegeWorkshopRenderer } from "@view/entities/EliteSiegeWorkshopRenderer";
import { EliteMageTowerRenderer } from "@view/entities/EliteMageTowerRenderer";
import { EliteStableRenderer } from "@view/entities/EliteStableRenderer";
import { ArchiveRenderer } from "@view/entities/ArchiveRenderer";

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

const PANEL_W = 286;
const PANEL_PAD = 15;
const CORNER_R = 8;

const BG_COLOR = 0x0d0d1e;
const BG_ALPHA = 0.93;
const BORDER_COLOR = 0xffd700;
const BORDER_W = 1.5;

const HEADER_H = 42;
const PREVIEW_H = 88;
const STATS_H = 77;
const DESC_H = 26;
const FIXED_TOP_H = HEADER_H + PREVIEW_H + STATS_H + DESC_H;

const ICONS_PER_ROW = 4;
/** Units costing this much or more require an Elite Hall to purchase. */
const ELITE_HALL_COST_THRESHOLD = 800;
const ICON_GAP = 5;
const ICON_SIZE = Math.floor(
  (PANEL_W - 2 * PANEL_PAD - ICON_GAP * (ICONS_PER_ROW - 1)) / ICONS_PER_ROW,
);

const SECTION_LABEL_H = 24;
const CLOSE_SIZE = 20;

const MAX_PANEL_H = 440;
const SCROLL_WIDTH = 10;
const SCROLL_MARGIN = 4;

// Text styles
const STYLE_TITLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 14,
  fill: 0xffd700,
  fontWeight: "bold",
  letterSpacing: 1,
});
const STYLE_SECTION = new TextStyle({
  fontFamily: "monospace",
  fontSize: 11,
  fill: 0x778899,
  letterSpacing: 2,
});
const STYLE_CLOSE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 15,
  fill: 0xaaaaaa,
  fontWeight: "bold",
});
const STYLE_PREVIEW_NAME = new TextStyle({
  fontFamily: "monospace",
  fontSize: 13,
  fill: 0xdddddd,
  fontWeight: "bold",
});
const STYLE_STAT = new TextStyle({
  fontFamily: "monospace",
  fontSize: 11,
  fill: 0xbbccdd,
});
const STYLE_SPAWN = new TextStyle({
  fontFamily: "monospace",
  fontSize: 11,
  fill: 0x668866,
});
const STYLE_ICON_COST = new TextStyle({
  fontFamily: "monospace",
  fontSize: 9,
  fill: 0xffd700,
  fontWeight: "bold",
});
const STYLE_ICON_COST_UNAFFORDABLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 9,
  fill: 0x885522,
  fontWeight: "bold",
});
const STYLE_REQUIREMENTS = new TextStyle({
  fontFamily: "monospace",
  fontSize: 11,
  fill: 0xffd700,
  fontWeight: "bold",
});
const STYLE_MAX_COUNT = new TextStyle({
  fontFamily: "monospace",
  fontSize: 11,
  fill: 0xff4444,
  fontWeight: "bold",
});

// Building display names
const BUILDING_LABELS: Record<BuildingType, string> = {
  [BuildingType.CASTLE]: "Castle",
  [BuildingType.BARRACKS]: "Barracks",
  [BuildingType.STABLES]: "Stables",
  [BuildingType.MAGE_TOWER]: "Mage Tower",
  [BuildingType.ARCHERY_RANGE]: "Archery Range",
  [BuildingType.SIEGE_WORKSHOP]: "Siege Workshop",
  [BuildingType.BLACKSMITH]: "Blacksmith",
  [BuildingType.TOWN]: "Town",
  [BuildingType.CREATURE_DEN]: "Creature Den",
  [BuildingType.TOWER]: "Tower",
  [BuildingType.FARM]: "Farm",
  [BuildingType.HAMLET]: "Hamlet",
  [BuildingType.EMBASSY]: "Embassy",
  [BuildingType.TEMPLE]: "Temple",
  [BuildingType.WALL]: "Wall",
  [BuildingType.FIREPIT]: "Firepit",
  [BuildingType.MILL]: "Mill",
  [BuildingType.ELITE_HALL]: "Elite Hall",
  [BuildingType.MARKET]: "Market",
  [BuildingType.FACTION_HALL]: "Faction Hall",
  [BuildingType.LIGHTNING_TOWER]: "Lightning Tower",
  [BuildingType.ICE_TOWER]: "Ice Tower",
  [BuildingType.HEALING_TOWER]: "Healing Tower",
  [BuildingType.FIRE_TOWER]: "Fire Tower",
  [BuildingType.WARP_TOWER]: "Warp Tower",
  [BuildingType.BALLISTA_TOWER]: "Ballista Tower",
  [BuildingType.REPEATER_TOWER]: "Repeater Tower",
  [BuildingType.ARCHITECTS_GUILD]: "Architects Guild",
  [BuildingType.HOUSE1]: "House I",
  [BuildingType.HOUSE2]: "House II",
  [BuildingType.HOUSE3]: "House III",
  [BuildingType.ELITE_BARRACKS]: "Elite Barracks",
  [BuildingType.ELITE_ARCHERY_RANGE]: "Elite Archery Range",
  [BuildingType.ELITE_SIEGE_WORKSHOP]: "Elite Siege Workshop",
  [BuildingType.ELITE_MAGE_TOWER]: "Elite Mage Tower",
  [BuildingType.ELITE_STABLES]: "Elite Stables",
  [BuildingType.FORWARD_CASTLE]: "Forward Castle",
  [BuildingType.FORWARD_TOWER]: "Forward Tower",
  [BuildingType.ARCHIVE]: "Archive",
};

// Unit display names
const UNIT_LABELS: Record<UnitType, string> = {
  [UnitType.SWORDSMAN]: "Swordsman",
  [UnitType.TEMPLAR]: "Templar",
  [UnitType.ASSASSIN]: "Assassin",
  [UnitType.ARCHER]: "Archer",
  [UnitType.KNIGHT]: "Knight",
  [UnitType.FIRE_MAGE]: "Fire Mage",
  [UnitType.STORM_MAGE]: "Storm Mage",
  [UnitType.MAGE_HUNTER]: "Mage Hunter",
  [UnitType.PIKEMAN]: "Pikeman",
  [UnitType.SUMMONED]: "Summoned",
  [UnitType.BATTERING_RAM]: "Battering Ram",
  [UnitType.JAVELINEER]: "Javelineer",
  [UnitType.ARBALESTIER]: "Arbelestier",
  [UnitType.ROYAL_ARBALESTIER]: "Royal Arbelestier",
  [UnitType.SIEGE_HUNTER]: "Siege Hunter",
  [UnitType.SUMMONER]: "Summoner",
  [UnitType.CONSTRUCTIONIST]: "Constructionist",
  [UnitType.COLD_MAGE]: "Cold Mage",
  [UnitType.SPIDER]: "Spider",
  [UnitType.GLADIATOR]: "Gladiator",
  [UnitType.DIPLOMAT]: "Diplomat",
  [UnitType.DISTORTION_MAGE]: "Distortion Mage",
  [UnitType.FIRE_ADEPT_MAGE]: "Fire Adept Mage",
  [UnitType.COLD_ADEPT_MAGE]: "Cold Adept Mage",
  [UnitType.LIGHTNING_ADEPT_MAGE]: "Lightning Adept Mage",
  [UnitType.DISTORTION_ADEPT_MAGE]: "Distortion Adept Mage",
  [UnitType.FIRE_MASTER_MAGE]: "Fire Master Mage",
  [UnitType.COLD_MASTER_MAGE]: "Cold Master Mage",
  [UnitType.LIGHTNING_MASTER_MAGE]: "Lightning Master Mage",
  [UnitType.DISTORTION_MASTER_MAGE]: "Distortion Master Mage",
  [UnitType.VOID_SNAIL]: "Void Snail",
  [UnitType.FAERY_QUEEN]: "Faery Queen",
  [UnitType.GIANT_FROG]: "Giant Frog",
  [UnitType.LONGBOWMAN]: "Longbowman",
  [UnitType.CROSSBOWMAN]: "Crossbowman",
  [UnitType.REPEATER]: "Repeater",
  [UnitType.DEVOURER]: "Devourer",
  [UnitType.TROLL]: "Troll",
  [UnitType.RHINO]: "Rhino",
  [UnitType.PIXIE]: "Pixie",
  [UnitType.FIRE_IMP]: "Fire Imp",
  [UnitType.ICE_IMP]: "Ice Imp",
  [UnitType.LIGHTNING_IMP]: "Lightning Imp",
  [UnitType.DISTORTION_IMP]: "Distortion Imp",
  [UnitType.BAT]: "Bat",
    [UnitType.VAMPIRE_BAT]: "Vampire Bat",
  [UnitType.HORSE_ARCHER]: "Horse Archer",
  [UnitType.SHORTBOW]: "Shortbow",
  [UnitType.BALLISTA]: "Ballista",
  [UnitType.BOLT_THROWER]: "Bolt Thrower",
  [UnitType.CATAPULT]: "Catapult",
  [UnitType.SIEGE_CATAPULT]: "Siege Catapult",
  [UnitType.TREBUCHET]: "Trebuchet",
  [UnitType.WAR_WAGON]: "War Wagon",
  [UnitType.BOMBARD]: "Bombard",
  [UnitType.SIEGE_TOWER]: "Siege Tower",
  [UnitType.HELLFIRE_MORTAR]: "Hellfire Mortar",
  [UnitType.SCOUT_CAVALRY]: "Scout Cavalry",
  [UnitType.LANCER]: "Lancer",
  [UnitType.ELITE_LANCER]: "Elite Lancer",
  [UnitType.KNIGHT_LANCER]: "Knight Lancer",
  [UnitType.ROYAL_LANCER]: "Royal Lancer",
  [UnitType.MONK]: "Monk",
  [UnitType.CLERIC]: "Cleric",
  [UnitType.SAINT]: "Saint",
  [UnitType.RED_DRAGON]: "Red Dragon",
  [UnitType.FROST_DRAGON]: "Frost Dragon",
  [UnitType.CYCLOPS]: "Cyclops",
  [UnitType.HALBERDIER]: "Halberdier",
  [UnitType.ELVEN_ARCHER]: "Elven Archer",
  [UnitType.HERO]: "Hero",
  [UnitType.QUESTING_KNIGHT]: "Questing Knight",
  [UnitType.ANGEL]: "Angel",
  [UnitType.DARK_SAVANT]: "Dark Savant",
  [UnitType.DEFENDER]: "Defender",
  [UnitType.PHALANX]: "Phalanx",
  [UnitType.ROYAL_PHALANX]: "Royal Phalanx",
  [UnitType.ROYAL_DEFENDER]: "Royal Defender",
  [UnitType.AXEMAN]: "Axeman",
  [UnitType.BERSERKER]: "Berserker",
  [UnitType.ANCIENT_DEFENDER]: "Ancient Defender",
  [UnitType.ANCIENT_PHALANX]: "Ancient Phalanx",
  [UnitType.ANCIENT_AXEMAN]: "Ancient Axeman",
  [UnitType.ANCIENT_ARCHER]: "Ancient Archer",
  [UnitType.ANCIENT_LONGBOWMAN]: "Ancient Longbowman",
  [UnitType.ANCIENT_CROSSBOWMAN]: "Ancient Crossbowman",
  [UnitType.ELDER_ARCHER]: "Elder Archer",
  [UnitType.ELDER_REPEATER]: "Elder Repeater",
  [UnitType.ELDER_JAVELINEER]: "Elder Javelineer",
  [UnitType.ELDER_HORSE_ARCHER]: "Elder Horse Archer",
  [UnitType.ELDER_DEFENDER]: "Elder Defender",
  [UnitType.ELDER_PHALANX]: "Elder Phalanx",
  [UnitType.ELDER_AXEMAN]: "Elder Axeman",
  [UnitType.WARCHIEF]: "Warchief",
  [UnitType.ARCHMAGE]: "Archmage",
  [UnitType.RUFUS]: "Rufus",
  [UnitType.TROUBADOUR]: "Troubadour",
  [UnitType.GIANT_COURT_JESTER]: "Giant Court Jester",
  [UnitType.FISHERMAN]: "Fisherman",
  [UnitType.FIRE_ELEMENTAL]: "Fire Elemental",
  [UnitType.ICE_ELEMENTAL]: "Ice Elemental",
  [UnitType.MINOR_FIRE_ELEMENTAL]: "Minor Fire Elemental",
  [UnitType.MINOR_ICE_ELEMENTAL]: "Minor Ice Elemental",
  [UnitType.LIGHTNING_ELEMENTAL]: "Lightning Elemental",
  [UnitType.DISTORTION_ELEMENTAL]: "Distortion Elemental",
  [UnitType.MINOR_LIGHTNING_ELEMENTAL]: "Minor Lightning Elemental",
  [UnitType.MINOR_DISTORTION_ELEMENTAL]: "Minor Distortion Elemental",
  [UnitType.EARTH_ELEMENTAL]: "Earth Elemental",
  [UnitType.MINOR_EARTH_ELEMENTAL]: "Minor Earth Elemental",
  [UnitType.GIANT_WARRIOR]: "Giant Warrior",
  [UnitType.GIANT_ARCHER]: "Giant Archer",
  [UnitType.GIANT_SIEGE]: "Giant Siege",
  [UnitType.GIANT_MAGE]: "Giant Mage",
  [UnitType.GIANT_CAVALRY]: "Giant Cavalry",
  [UnitType.ROYAL_GUARD]: "Royal Guard",
  [UnitType.MARKSMAN]: "Marksman",
  [UnitType.CANNON]: "Cannon",
  [UnitType.BATTLEMAGE]: "Battlemage",
  [UnitType.CATAPHRACT]: "Cataphract",
  [UnitType.SETTLER]: "Settler",
  [UnitType.ENGINEER]: "Engineer",
  [UnitType.UNICORN]: "Unicorn",
  [UnitType.NATIONAL_MAGE_T1]: "National Mage I",
  [UnitType.NATIONAL_MAGE_T2]: "National Mage II",
  [UnitType.NATIONAL_MAGE_T3]: "National Mage III",
  [UnitType.NATIONAL_MAGE_T4]: "National Mage IV",
  [UnitType.NATIONAL_MAGE_T5]: "National Mage V",
  [UnitType.NATIONAL_MAGE_T6]: "National Mage VI",
  [UnitType.NATIONAL_MAGE_T7]: "National Mage VII",
};

// ---------------------------------------------------------------------------
// Upgrade Labels
// ---------------------------------------------------------------------------

const UPGRADE_LABELS: Record<UpgradeType, string> = {
  [UpgradeType.MELEE_DAMAGE]: "Melee",
  [UpgradeType.MELEE_HEALTH]: "Defence",
  [UpgradeType.RANGED_DAMAGE]: "Ranged",
  [UpgradeType.RANGED_HEALTH]: "Resilience",
  [UpgradeType.SIEGE_DAMAGE]: "Siege",
  [UpgradeType.SIEGE_HEALTH]: "Siege",
  [UpgradeType.CREATURE_DAMAGE]: "Creature",
  [UpgradeType.CREATURE_HEALTH]: "Creature",
  [UpgradeType.MAGE_RANGE]: "Range",
  [UpgradeType.FLAG]: "Flag",
  [UpgradeType.TOWER_RANGE]: "Twr Range",
  [UpgradeType.TOWER_DAMAGE]: "Twr Dmg",
  [UpgradeType.TOWER_HEALTH]: "Twr HP",
  [UpgradeType.TOWER_COST]: "Twr Cost",
  [UpgradeType.SETTLER]: "Settler",
  [UpgradeType.ENGINEER]: "Engineer",
  [UpgradeType.SUMMON_UNICORN]: "Unicorn",
  [UpgradeType.SUMMON_PIXIE]: "Pixie",
  [UpgradeType.SUMMON_FIRE_ELEMENTAL]: "Fire Elem",
  [UpgradeType.SUMMON_ICE_ELEMENTAL]: "Ice Elem",
  [UpgradeType.SUMMON_RED_DRAGON]: "Dragon",
  [UpgradeType.SUMMON_FROST_DRAGON]: "Frost Drg",
  [UpgradeType.SUMMON_SPIDER_BROOD]: "Spider",
  [UpgradeType.SUMMON_TROLL]: "Troll",
  [UpgradeType.SUMMON_ANGEL]: "Angel",
  [UpgradeType.SUMMON_CYCLOPS]: "Cyclops",
  [UpgradeType.SUMMON_BAT_SWARM]: "Bat",
  [UpgradeType.SUMMON_DARK_SAVANT]: "Savant",
  [UpgradeType.SPELL_ARCANE_MISSILE]: "Arcane",
  [UpgradeType.SPELL_FIREBALL]: "Fireball",
  [UpgradeType.SPELL_BLIZZARD]: "Blizzard",
  [UpgradeType.SPELL_LIGHTNING_STRIKE]: "Lightning",
  [UpgradeType.SPELL_EARTHQUAKE]: "Quake",
  [UpgradeType.SPELL_METEOR_STRIKE]: "Meteor",
  [UpgradeType.SPELL_VOID_RIFT]: "Void Rift",
  [UpgradeType.SPELL_HOLY_SMITE]: "Smite",
  [UpgradeType.SPELL_POISON_CLOUD]: "Poison",
  [UpgradeType.SPELL_ARCANE_STORM]: "Storm",
  [UpgradeType.SPELL_HEALING_WAVE]: "Heal",
  [UpgradeType.SPELL_DIVINE_RESTORATION]: "Restore",
  // New spells
  [UpgradeType.SPELL_FROST_NOVA]: "Frost Nova",
  [UpgradeType.SPELL_CHAIN_LIGHTNING]: "Chain Ltn",
  [UpgradeType.SPELL_INFERNO]: "Inferno",
  [UpgradeType.SPELL_MANA_SURGE]: "Mana Surg",
  [UpgradeType.SPELL_ARCANE_BARRAGE]: "Barrage",
  [UpgradeType.SPELL_TEMPORAL_BLAST]: "Temporal",
  [UpgradeType.SPELL_BLESSING_OF_LIGHT]: "Blessing",
  [UpgradeType.SPELL_PURIFYING_FLAME]: "Purify",
  [UpgradeType.SPELL_RADIANT_NOVA]: "Radiance",
  [UpgradeType.SPELL_CELESTIAL_WRATH]: "Celestial",
  [UpgradeType.SPELL_SHADOW_BOLT]: "Shd Bolt",
  [UpgradeType.SPELL_CURSE_OF_DARKNESS]: "Curse",
  [UpgradeType.SPELL_DEATH_COIL]: "Death Coil",
  [UpgradeType.SPELL_NETHER_STORM]: "Nether",
  [UpgradeType.SPELL_SIPHON_SOUL]: "Siphon",
  // Gap-fill spells
  [UpgradeType.SPELL_FLAME_SPARK]: "Flame",
  [UpgradeType.SPELL_PYROCLASM]: "Pyroclasm",
  [UpgradeType.SPELL_GLACIAL_CRUSH]: "Glacial",
  [UpgradeType.SPELL_ABSOLUTE_ZERO]: "Abs Zero",
  [UpgradeType.SPELL_SPARK]: "Spark",
  [UpgradeType.SPELL_THUNDERSTORM]: "Thunder",
  [UpgradeType.SPELL_BALL_LIGHTNING]: "Ball Ltn",
  [UpgradeType.SPELL_MJOLNIR_STRIKE]: "Mjolnir",
  [UpgradeType.SPELL_STONE_SHARD]: "Stone",
  [UpgradeType.SPELL_LANDSLIDE]: "Landslide",
  [UpgradeType.SPELL_TECTONIC_RUIN]: "Tectonic",
  [UpgradeType.SPELL_ARCANE_CATACLYSM]: "Cataclysm",
  [UpgradeType.SPELL_DIVINE_MIRACLE]: "Miracle",
  [UpgradeType.SPELL_SHADOW_PLAGUE]: "Plague",
  [UpgradeType.SPELL_OBLIVION]: "Oblivion",
  [UpgradeType.SPELL_VENOMOUS_SPRAY]: "Venom",
  [UpgradeType.SPELL_PLAGUE_SWARM]: "Swarm",
  [UpgradeType.SPELL_TOXIC_MIASMA]: "Miasma",
  [UpgradeType.SPELL_PANDEMIC]: "Pandemic",
  [UpgradeType.SPELL_VOID_SPARK]: "Void Spk",
  [UpgradeType.SPELL_DIMENSIONAL_TEAR]: "Dim Tear",
  [UpgradeType.SPELL_SINGULARITY]: "Singular",
  [UpgradeType.SPELL_NECROTIC_TOUCH]: "Necrotic",
  [UpgradeType.SPELL_SOUL_REND]: "Soul Rend",
  [UpgradeType.SPELL_APOCALYPSE]: "Apocalyps",
  [UpgradeType.SPELL_THORN_BARRAGE]: "Thorns",
  [UpgradeType.SPELL_NATURES_WRATH]: "Nat Wrath",
  [UpgradeType.SPELL_PRIMAL_STORM]: "Primal",
  // Round 2 — fire
  [UpgradeType.SPELL_EMBER_BOLT]: "Ember",
  [UpgradeType.SPELL_FLAME_WAVE]: "Flm Wave",
  [UpgradeType.SPELL_MAGMA_BURST]: "Magma",
  [UpgradeType.SPELL_FIRE_STORM]: "Firestorm",
  [UpgradeType.SPELL_DRAGONS_BREATH]: "Drg Brth",
  // Round 2 — ice
  [UpgradeType.SPELL_ICE_SHARD]: "Ice Shard",
  [UpgradeType.SPELL_FROSTBITE]: "Frostbite",
  [UpgradeType.SPELL_ICE_STORM]: "Ice Storm",
  [UpgradeType.SPELL_FROZEN_TOMB]: "Frz Tomb",
  [UpgradeType.SPELL_PERMAFROST]: "Permafrst",
  // Round 2 — lightning
  [UpgradeType.SPELL_STATIC_SHOCK]: "Static",
  [UpgradeType.SPELL_ARC_BOLT]: "Arc Bolt",
  [UpgradeType.SPELL_STORM_SURGE]: "Stm Surge",
  [UpgradeType.SPELL_THUNDER_CLAP]: "Thndr Clp",
  [UpgradeType.SPELL_ZEUS_WRATH]: "Zeus",
  // Round 2 — earth
  [UpgradeType.SPELL_MUD_SPLASH]: "Mud",
  [UpgradeType.SPELL_ROCK_THROW]: "Rock",
  [UpgradeType.SPELL_AVALANCHE]: "Avalanche",
  [UpgradeType.SPELL_SEISMIC_SLAM]: "Seismic",
  [UpgradeType.SPELL_WORLD_BREAKER]: "Wld Brkr",
  // Round 2 — arcane
  [UpgradeType.SPELL_MANA_BOLT]: "Mana Bolt",
  [UpgradeType.SPELL_ARCANE_PULSE]: "Arc Pulse",
  [UpgradeType.SPELL_ETHER_BLAST]: "Ether",
  [UpgradeType.SPELL_ARCANE_TORRENT]: "Torrent",
  [UpgradeType.SPELL_ASTRAL_RIFT]: "Astral",
  // Round 2 — holy
  [UpgradeType.SPELL_SACRED_STRIKE]: "Sacred",
  [UpgradeType.SPELL_HOLY_LIGHT]: "Holy Lght",
  [UpgradeType.SPELL_JUDGMENT]: "Judgment",
  [UpgradeType.SPELL_DIVINE_SHIELD]: "Div Shld",
  [UpgradeType.SPELL_HEAVENS_GATE]: "Hvn Gate",
  // Round 2 — shadow
  [UpgradeType.SPELL_DARK_PULSE]: "Drk Pulse",
  [UpgradeType.SPELL_SHADOW_STRIKE]: "Shd Strk",
  [UpgradeType.SPELL_NIGHTMARE]: "Nightmre",
  [UpgradeType.SPELL_DARK_VOID]: "Drk Void",
  [UpgradeType.SPELL_ECLIPSE]: "Eclipse",
  // Round 2 — poison
  [UpgradeType.SPELL_TOXIC_DART]: "Tox Dart",
  [UpgradeType.SPELL_ACID_SPLASH]: "Acid",
  [UpgradeType.SPELL_BLIGHT]: "Blight",
  [UpgradeType.SPELL_CORROSION]: "Corrode",
  [UpgradeType.SPELL_PLAGUE_WIND]: "Plg Wind",
  // Round 2 — void
  [UpgradeType.SPELL_PHASE_SHIFT]: "Phase",
  [UpgradeType.SPELL_WARP_BOLT]: "Warp",
  [UpgradeType.SPELL_RIFT_STORM]: "Rft Storm",
  [UpgradeType.SPELL_VOID_CRUSH]: "Vd Crush",
  [UpgradeType.SPELL_EVENT_HORIZON]: "Evt Hrzn",
  // Round 2 — death
  [UpgradeType.SPELL_GRAVE_CHILL]: "Grave",
  [UpgradeType.SPELL_WITHER]: "Wither",
  [UpgradeType.SPELL_CORPSE_EXPLOSION]: "Corpse Ex",
  [UpgradeType.SPELL_DOOM]: "Doom",
  [UpgradeType.SPELL_REQUIEM]: "Requiem",
  // Round 2 — nature
  [UpgradeType.SPELL_VINE_WHIP]: "Vine",
  [UpgradeType.SPELL_BRAMBLE_BURST]: "Bramble",
  [UpgradeType.SPELL_ENTANGLE]: "Entangle",
  [UpgradeType.SPELL_OVERGROWTH]: "Ovrgrowth",
  [UpgradeType.SPELL_GAIAS_FURY]: "Gaia",
  // Tier 6 & 7 — fire
  [UpgradeType.SPELL_HELLFIRE_ERUPTION]: "Hellfire Eruption",
  [UpgradeType.SPELL_SOLAR_FURY]: "Solar Fury",
  [UpgradeType.SPELL_SUPERNOVA]: "Supernova",
  [UpgradeType.SPELL_WORLD_BLAZE]: "World Blaze",
  // Tier 6 & 7 — ice
  [UpgradeType.SPELL_FROZEN_ABYSS]: "Frozen Abyss",
  [UpgradeType.SPELL_ARCTIC_DEVASTATION]: "Arctic Devastation",
  [UpgradeType.SPELL_ETERNAL_WINTER]: "Eternal Winter",
  [UpgradeType.SPELL_ICE_AGE]: "Ice Age",
  // Tier 6 & 7 — lightning
  [UpgradeType.SPELL_DIVINE_THUNDER]: "Divine Thunder",
  [UpgradeType.SPELL_TEMPEST_FURY]: "Tempest Fury",
  [UpgradeType.SPELL_RAGNAROK_BOLT]: "Ragnarok Bolt",
  [UpgradeType.SPELL_COSMIC_STORM]: "Cosmic Storm",
  // Tier 6 & 7 — earth
  [UpgradeType.SPELL_CONTINENTAL_CRUSH]: "Continental Crush",
  [UpgradeType.SPELL_MAGMA_CORE]: "Magma Core",
  [UpgradeType.SPELL_CATACLYSM]: "Cataclysm",
  [UpgradeType.SPELL_PLANET_SHATTER]: "Planet Shatter",
  // Tier 6 & 7 — arcane
  [UpgradeType.SPELL_ARCANE_ANNIHILATION]: "Arcane Annihilation",
  [UpgradeType.SPELL_REALITY_WARP]: "Reality Warp",
  [UpgradeType.SPELL_COSMIC_RIFT]: "Cosmic Rift",
  [UpgradeType.SPELL_OMNISCIENCE]: "Omniscience",
  // Tier 6 & 7 — holy
  [UpgradeType.SPELL_SERAPHIMS_LIGHT]: "Seraphim's Light",
  [UpgradeType.SPELL_WRATH_OF_GOD]: "Wrath of God",
  [UpgradeType.SPELL_ASCENSION]: "Ascension",
  [UpgradeType.SPELL_DIVINE_JUDGMENT]: "Divine Judgment",
  // Tier 6 & 7 — shadow
  [UpgradeType.SPELL_ETERNAL_DARKNESS]: "Eternal Darkness",
  [UpgradeType.SPELL_VOID_CORRUPTION]: "Void Corruption",
  [UpgradeType.SPELL_ABYSSAL_DOOM]: "Abyssal Doom",
  [UpgradeType.SPELL_SHADOW_ANNIHILATION]: "Shadow Annihilation",
  // Tier 6 & 7 — poison
  [UpgradeType.SPELL_EXTINCTION_CLOUD]: "Extinction Cloud",
  [UpgradeType.SPELL_PLAGUE_OF_AGES]: "Plague of Ages",
  [UpgradeType.SPELL_DEATH_BLOSSOM]: "Death Blossom",
  [UpgradeType.SPELL_TOXIC_APOCALYPSE]: "Toxic Apocalypse",
  // Tier 6 & 7 — void
  [UpgradeType.SPELL_REALITY_COLLAPSE]: "Reality Collapse",
  [UpgradeType.SPELL_DIMENSIONAL_IMPLOSION]: "Dimensional Implosion",
  [UpgradeType.SPELL_ENTROPY]: "Entropy",
  [UpgradeType.SPELL_END_OF_ALL]: "End of All",
  // Tier 6 & 7 — death
  [UpgradeType.SPELL_MASS_EXTINCTION]: "Mass Extinction",
  [UpgradeType.SPELL_GRIM_HARVEST]: "Grim Harvest",
  [UpgradeType.SPELL_ARMAGEDDON]: "Armageddon",
  [UpgradeType.SPELL_DEATH_INCARNATE]: "Death Incarnate",
  // Tier 6 & 7 — nature
  [UpgradeType.SPELL_WORLD_TREES_FURY]: "World Tree's Fury",
  [UpgradeType.SPELL_ELEMENTAL_CHAOS]: "Elemental Chaos",
  [UpgradeType.SPELL_GENESIS_STORM]: "Genesis Storm",
  [UpgradeType.SPELL_WRATH_OF_GAIA]: "Wrath of Gaia",
  // Extra T1 & T2 — fire
  [UpgradeType.SPELL_CANDLE_FLAME]: "Candle Flame",
  [UpgradeType.SPELL_HEAT_WAVE]: "Heat Wave",
  [UpgradeType.SPELL_SCORCH]: "Scorch",
  // Extra T1 & T2 — ice
  [UpgradeType.SPELL_CHILL_TOUCH]: "Chill Touch",
  [UpgradeType.SPELL_ICICLE]: "Icicle",
  [UpgradeType.SPELL_COLD_SNAP]: "Cold Snap",
  // Extra T1 & T2 — lightning
  [UpgradeType.SPELL_JOLT]: "Jolt",
  [UpgradeType.SPELL_ZAP]: "Zap",
  [UpgradeType.SPELL_SHOCK_WAVE]: "Shock Wave",
  // Extra T1 & T2 — earth
  [UpgradeType.SPELL_PEBBLE_TOSS]: "Pebble Toss",
  [UpgradeType.SPELL_DUST_DEVIL]: "Dust Devil",
  [UpgradeType.SPELL_TREMOR]: "Tremor",
  // Extra T1 & T2 — arcane
  [UpgradeType.SPELL_MAGIC_DART]: "Magic Dart",
  [UpgradeType.SPELL_SPARKLE_BURST]: "Sparkle Burst",
  [UpgradeType.SPELL_ARCANE_BOLT]: "Arcane Bolt",
  // Extra T1 & T2 — holy
  [UpgradeType.SPELL_HOLY_TOUCH]: "Holy Touch",
  [UpgradeType.SPELL_SMITE]: "Smite",
  [UpgradeType.SPELL_CONSECRATE]: "Consecrate",
  // Extra T1 & T2 — shadow
  [UpgradeType.SPELL_DARK_WHISPER]: "Dark Whisper",
  [UpgradeType.SPELL_SHADOW_FLICKER]: "Shadow Flicker",
  [UpgradeType.SPELL_NIGHT_SHADE]: "Night Shade",
  // Extra T1 & T2 — poison
  [UpgradeType.SPELL_STING]: "Sting",
  [UpgradeType.SPELL_NOXIOUS_PUFF]: "Noxious Puff",
  [UpgradeType.SPELL_VENOM_STRIKE]: "Venom Strike",
  // Extra T1 & T2 — void
  [UpgradeType.SPELL_NULL_BOLT]: "Null Bolt",
  [UpgradeType.SPELL_VOID_TOUCH]: "Void Touch",
  [UpgradeType.SPELL_RIFT_PULSE]: "Rift Pulse",
  // Extra T1 & T2 — death
  [UpgradeType.SPELL_DEATHS_GRASP]: "Death's Grasp",
  [UpgradeType.SPELL_BONE_CHILL]: "Bone Chill",
  [UpgradeType.SPELL_DRAIN_LIFE]: "Drain Life",
  // Extra T1 & T2 — nature
  [UpgradeType.SPELL_LEAF_BLADE]: "Leaf Blade",
  [UpgradeType.SPELL_THORN_PRICK]: "Thorn Prick",
  [UpgradeType.SPELL_ROOT_SNARE]: "Root Snare",
};

// ---------------------------------------------------------------------------
// ShopPanel
// ---------------------------------------------------------------------------

export class ShopPanel {
  readonly container = new Container();

  onOpen: (() => void) | null = null;
  onClose: (() => void) | null = null;

  private _vm!: ViewManager;
  private _state!: GameState;
  private _localPlayerId = "";

  private _openBuildingId: string | null = null;

  // Preview + stats (fixed area)
  private _previewContainer = new Container();
  private _previewSprite: AnimatedSprite | null = null;
  private _statsContainer = new Container();
  private _descContainer = new Container();
  private _defaultBuildingType: BuildingType | null = null;

  // Cache of rendered building textures (castle, tower) keyed by BuildingType
  private _buildingTextureCache = new Map<BuildingType, RenderTexture>();

  // Icon button refs for affordability
  private _unitIcons: {
    type: UnitType;
    costText: Text;
    bg: Graphics;
    btn: Container;
    locked: boolean;
  }[] = [];
  private _bpIcons: {
    type: BuildingType;
    costText: Text;
    bg: Graphics;
    locked: boolean;
  }[] = [];

  // Scrolling
  private _scrollContainer = new Container();
  private _mask = new Graphics();
  private _scrollbarTrack = new Graphics();
  private _scrollbarThumb = new Graphics();
  private _scrollY = 0;
  private _isDragging = false;
  private _dragStartY = 0;
  private _thumbStartY = 0;
  private _contentH = 0;
  private _viewH = 0;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  init(vm: ViewManager, state: GameState, localPlayerId: string): void {
    this._vm = vm;
    this._state = state;
    this._localPlayerId = localPlayerId;

    this.container.visible = false;
    vm.addToLayer("ui", this.container);

    this._scrollContainer.label = "scrollContent";
    this._scrollContainer.mask = this._mask;
    this.container.addChild(this._scrollContainer);
    this.container.addChild(this._mask);

    this._scrollbarTrack.label = "scrollTrack";
    this.container.addChild(this._scrollbarTrack);
    this.container.addChild(this._scrollbarThumb);

    this.container.eventMode = "static";
    this.container.on("wheel", (e) => {
      if (!this.container.visible || this._contentH <= this._scrollableH())
        return;
      this._scrollY = Math.max(
        0,
        Math.min(
          this._contentH - this._scrollableH(),
          this._scrollY + e.deltaY,
        ),
      );
      this._applyScroll();
    });
  }

  setPlayerId(playerId: string): void {
    this._localPlayerId = playerId;
    this.close();
  }

  destroy(): void {
    this._clearPreview();
    for (const rt of this._buildingTextureCache.values()) rt.destroy();
    this._buildingTextureCache.clear();
    this.container.destroy({ children: true });
  }

  // ---------------------------------------------------------------------------
  // Open / close
  // ---------------------------------------------------------------------------

  open(buildingId: string): void {
    this._openBuildingId = buildingId;
    this._rebuild();
    this.container.visible = true;
    this.onOpen?.();
  }

  close(): void {
    const wasOpen = this._openBuildingId !== null;
    this._openBuildingId = null;
    this._clearPreview();
    this.container.visible = false;
    if (wasOpen) this.onClose?.();
  }

  readonly update = (_state: GameState): void => {
    if (!this.container.visible || !this._openBuildingId) return;
    this._updateAffordability();
  };

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private _scrollableH(): number {
    return this._viewH - FIXED_TOP_H;
  }

  // ---------------------------------------------------------------------------
  // Panel construction
  // ---------------------------------------------------------------------------

  private _rebuild(): void {
    this._unitIcons = [];
    this._bpIcons = [];
    this._scrollContainer.removeChildren();
    this.container.removeChildren();
    this._clearPreview();

    const building = this._openBuildingId
      ? this._state.buildings.get(this._openBuildingId)
      : null;
    if (!building) return;

    this._defaultBuildingType = building.type;

    // Re-add persistent scroll components
    this.container.addChild(this._scrollContainer);
    this.container.addChild(this._mask);
    this.container.addChild(this._scrollbarTrack);
    this.container.addChild(this._scrollbarThumb);

    // Calculate icon grid content height
    const unitCount = building.shopInventory.length;
    const unitRowCount = Math.ceil(unitCount / ICONS_PER_ROW);
    const unitSectionH =
      unitCount > 0
        ? SECTION_LABEL_H + unitRowCount * (ICON_SIZE + ICON_GAP)
        : 0;

    // Calculate upgrade section height
    const hasUpgrades =
      building.type === BuildingType.BLACKSMITH ||
      (building.upgradeInventory && building.upgradeInventory.length > 0);
    let upgradeSectionH = 0;
    if (hasUpgrades) {
      if (building.type === BuildingType.ARCHIVE && building.upgradeInventory) {
        // Archive: calculate height with per-school section headers
        const schoolKeys = ["elemental", "arcane", "divine", "shadow", "conjuration"];
        for (const sk of schoolKeys) {
          const count = building.upgradeInventory.filter((u) => {
            const d = UPGRADE_DEFINITIONS[u];
            return (d as any).spellSchool === sk;
          }).length;
          if (count > 0) {
            upgradeSectionH += SECTION_LABEL_H + Math.ceil(count / ICONS_PER_ROW) * (ICON_SIZE + ICON_GAP);
          }
        }
      } else {
        const upgradeCount = building.type === BuildingType.BLACKSMITH
          ? 9
          : building.upgradeInventory?.length || 0;
        const upgradeRowCount = Math.ceil(upgradeCount / ICONS_PER_ROW);
        upgradeSectionH = SECTION_LABEL_H + upgradeRowCount * (ICON_SIZE + ICON_GAP);
      }
    }

    // Calculate economic and other building counts for height calculation
    const economicTypes = new Set([
      BuildingType.FARM,
      BuildingType.EMBASSY,
      BuildingType.MARKET,
      BuildingType.MILL,
      BuildingType.HAMLET,
    ]);

    const economicBuildings = building.blueprints.filter((bp) =>
      economicTypes.has(bp),
    );
    const otherBuildings = building.blueprints.filter(
      (bp) => !economicTypes.has(bp),
    );

    // Define the specific order for ECONOMY section
    const economyOrder = [
      BuildingType.FARM,
      BuildingType.EMBASSY,
      BuildingType.MARKET,
      BuildingType.MILL,
      BuildingType.HAMLET,
    ];

    // Sort economicBuildings according to the defined order
    const orderedEconomyBuildings = economicBuildings.sort((a, b) => {
      const indexA = economyOrder.indexOf(a);
      const indexB = economyOrder.indexOf(b);
      return indexA - indexB;
    });

    // Define the specific order for BUILD section
    const buildOrder = [
      BuildingType.BARRACKS,
      BuildingType.ARCHERY_RANGE,
      BuildingType.TEMPLE,
      BuildingType.WALL,
      BuildingType.STABLES,
      BuildingType.BLACKSMITH,
      BuildingType.MAGE_TOWER,
      BuildingType.SIEGE_WORKSHOP,
      BuildingType.TOWER,
      BuildingType.CREATURE_DEN,
      BuildingType.FACTION_HALL,
      BuildingType.ELITE_HALL,
      BuildingType.ELITE_BARRACKS,
      BuildingType.ELITE_ARCHERY_RANGE,
      BuildingType.ELITE_SIEGE_WORKSHOP,
      BuildingType.ELITE_MAGE_TOWER,
      BuildingType.ELITE_STABLES,
    ];

    // Sort otherBuildings according to the defined order
    const orderedBuildings = otherBuildings.sort((a, b) => {
      const indexA = buildOrder.indexOf(a);
      const indexB = buildOrder.indexOf(b);
      return indexA - indexB;
    });

    const econRowCount = Math.ceil(
      orderedEconomyBuildings.length / ICONS_PER_ROW,
    );
    const otherRowCount = Math.ceil(orderedBuildings.length / ICONS_PER_ROW);

    const econSectionH =
      orderedEconomyBuildings.length > 0
        ? SECTION_LABEL_H + econRowCount * (ICON_SIZE + ICON_GAP)
        : 0;
    const otherSectionH =
      otherBuildings.length > 0
        ? SECTION_LABEL_H + otherRowCount * (ICON_SIZE + ICON_GAP)
        : 0;

    this._contentH =
      unitSectionH + upgradeSectionH + econSectionH + otherSectionH + PANEL_PAD;
    const maxScrollableH = MAX_PANEL_H - FIXED_TOP_H;
    const scrollableH = Math.min(maxScrollableH, this._contentH);
    this._viewH = FIXED_TOP_H + scrollableH;

    // Background + border
    const bg = new Graphics()
      .roundRect(0, 0, PANEL_W, this._viewH, CORNER_R)
      .fill({ color: BG_COLOR, alpha: BG_ALPHA })
      .roundRect(0, 0, PANEL_W, this._viewH, CORNER_R)
      .stroke({ color: BORDER_COLOR, alpha: 0.55, width: BORDER_W });
    this.container.addChildAt(bg, 0);

    // Title
    const title = new Text({
      text: BUILDING_LABELS[building.type],
      style: STYLE_TITLE,
    });
    title.position.set(PANEL_PAD, 10);
    this.container.addChild(title);

    // Close button
    const closeBtn = new Text({ text: "✕", style: STYLE_CLOSE });
    closeBtn.position.set(PANEL_W - CLOSE_SIZE - 6, 8);
    closeBtn.eventMode = "static";
    closeBtn.cursor = "pointer";
    closeBtn.on("pointerdown", (e) => {
      e.stopPropagation();
      this.close();
    });
    this.container.addChild(closeBtn);

    // Divider under header
    this.container.addChild(
      new Graphics()
        .rect(PANEL_PAD, HEADER_H - 4, PANEL_W - PANEL_PAD * 2, 1)
        .fill({ color: 0x334455 }),
    );

    // ---- Preview area ----
    this._previewContainer = new Container();
    this._previewContainer.position.set(0, HEADER_H);
    this.container.addChild(this._previewContainer);
    this._showBuildingPreview(building.type);

    // ---- Stats area ----
    this._statsContainer = new Container();
    this._statsContainer.position.set(0, HEADER_H + PREVIEW_H);
    this.container.addChild(this._statsContainer);
    this._showBuildingStats(building.type);

    // ---- Description area ----
    this._descContainer = new Container();
    this._descContainer.position.set(0, HEADER_H + PREVIEW_H + STATS_H);
    this.container.addChild(this._descContainer);

    // Divider above scroll area
    this.container.addChild(
      new Graphics()
        .rect(PANEL_PAD, FIXED_TOP_H - 2, PANEL_W - PANEL_PAD * 2, 1)
        .fill({ color: 0x334455 }),
    );

    // Mask for scroll area
    this._mask
      .clear()
      .rect(0, FIXED_TOP_H, PANEL_W, scrollableH)
      .fill({ color: 0x000000 });

    // ---- Icon grid (scrollable) ----
    let cursorY = 0;

    // TRAIN section
    if (unitCount > 0) {
      const label = new Text({ text: "TRAIN", style: STYLE_SECTION });
      label.position.set(PANEL_PAD, cursorY + 4);
      this._scrollContainer.addChild(label);
      cursorY += SECTION_LABEL_H;

      for (let i = 0; i < unitCount; i++) {
        const col = i % ICONS_PER_ROW;
        const row = Math.floor(i / ICONS_PER_ROW);
        const x = PANEL_PAD + col * (ICON_SIZE + ICON_GAP);
        const y = cursorY + row * (ICON_SIZE + ICON_GAP);
        const icon = this._makeUnitIcon(
          building.id,
          building.shopInventory[i],
          x,
          y,
        );
        this._scrollContainer.addChild(icon);
      }
      cursorY += unitRowCount * (ICON_SIZE + ICON_GAP);
    }

    // UPGRADES section (if blacksmith)
    if (
      building.type === BuildingType.BLACKSMITH ||
      (building.upgradeInventory && building.upgradeInventory.length > 0)
    ) {
      // Get upgrades from building inventory or use blacksmith defaults
      const upgrades =
        building.upgradeInventory && building.upgradeInventory.length > 0
          ? building.upgradeInventory
          : [
              UpgradeType.MELEE_DAMAGE,
              UpgradeType.MELEE_HEALTH,
              UpgradeType.RANGED_DAMAGE,
              UpgradeType.RANGED_HEALTH,
              UpgradeType.SIEGE_DAMAGE,
              UpgradeType.SIEGE_HEALTH,
              UpgradeType.CREATURE_DAMAGE,
              UpgradeType.CREATURE_HEALTH,
              UpgradeType.MAGE_RANGE,
            ];

      // Archive: group spells by school with colored section headers
      if (building.type === BuildingType.ARCHIVE) {
        const schoolOrder: Array<{ key: string; label: string; color: number }> = [
          { key: "elemental", label: "ELEMENTAL", color: 0xff6622 },
          { key: "arcane", label: "ARCANE", color: 0x9966ff },
          { key: "divine", label: "DIVINE", color: 0xffdd44 },
          { key: "shadow", label: "SHADOW", color: 0x663399 },
          { key: "conjuration", label: "CONJURATION", color: 0x4488ff },
        ];

        for (const school of schoolOrder) {
          const schoolUpgrades = upgrades.filter((u) => {
            const def = UPGRADE_DEFINITIONS[u];
            return (def as any).spellSchool === school.key;
          });
          if (schoolUpgrades.length === 0) continue;

          // School section header
          const sLabel = new Text({
            text: school.label,
            style: new TextStyle({
              fontFamily: "monospace",
              fontSize: 10,
              fill: school.color,
              letterSpacing: 2,
              fontWeight: "bold",
            }),
          });
          sLabel.position.set(PANEL_PAD, cursorY + 4);
          this._scrollContainer.addChild(sLabel);
          cursorY += SECTION_LABEL_H;

          for (let i = 0; i < schoolUpgrades.length; i++) {
            const col = i % ICONS_PER_ROW;
            const row = Math.floor(i / ICONS_PER_ROW);
            const x = PANEL_PAD + col * (ICON_SIZE + ICON_GAP);
            const y = cursorY + row * (ICON_SIZE + ICON_GAP);
            const icon = this._makeUpgradeIcon(building.id, schoolUpgrades[i], x, y);
            this._scrollContainer.addChild(icon);
          }
          cursorY +=
            Math.ceil(schoolUpgrades.length / ICONS_PER_ROW) * (ICON_SIZE + ICON_GAP);
        }
      } else {
        const label = new Text({ text: "UPGRADES", style: STYLE_SECTION });
        label.position.set(PANEL_PAD, cursorY + 4);
        this._scrollContainer.addChild(label);
        cursorY += SECTION_LABEL_H;

        for (let i = 0; i < upgrades.length; i++) {
          const col = i % ICONS_PER_ROW;
          const row = Math.floor(i / ICONS_PER_ROW);
          const x = PANEL_PAD + col * (ICON_SIZE + ICON_GAP);
          const y = cursorY + row * (ICON_SIZE + ICON_GAP);
          const icon = this._makeUpgradeIcon(building.id, upgrades[i], x, y);
          this._scrollContainer.addChild(icon);
        }
        cursorY +=
          Math.ceil(upgrades.length / ICONS_PER_ROW) * (ICON_SIZE + ICON_GAP);
      }
    }

    // BUILD section (non-economic buildings)
    if (orderedBuildings.length > 0) {
      const label = new Text({ text: "BUILD", style: STYLE_SECTION });
      label.position.set(PANEL_PAD, cursorY + 4);
      this._scrollContainer.addChild(label);
      cursorY += SECTION_LABEL_H;

      for (let i = 0; i < orderedBuildings.length; i++) {
        const col = i % ICONS_PER_ROW;
        const row = Math.floor(i / ICONS_PER_ROW);
        const x = PANEL_PAD + col * (ICON_SIZE + ICON_GAP);
        const y = cursorY + row * (ICON_SIZE + ICON_GAP);
        const icon = this._makeBuildingIcon(orderedBuildings[i], x, y);
        this._scrollContainer.addChild(icon);
      }
      cursorY += otherRowCount * (ICON_SIZE + ICON_GAP);
    }

    // ECONOMY section - separate economic buildings
    // orderedEconomyBuildings already calculated above

    // ECONOMY section
    if (orderedEconomyBuildings.length > 0) {
      const econRowCount = Math.ceil(
        orderedEconomyBuildings.length / ICONS_PER_ROW,
      );
      const label = new Text({ text: "ECONOMY", style: STYLE_SECTION });
      label.position.set(PANEL_PAD, cursorY + 4);
      this._scrollContainer.addChild(label);
      cursorY += SECTION_LABEL_H;

      for (let i = 0; i < orderedEconomyBuildings.length; i++) {
        const col = i % ICONS_PER_ROW;
        const row = Math.floor(i / ICONS_PER_ROW);
        const x = PANEL_PAD + col * (ICON_SIZE + ICON_GAP);
        const y = cursorY + row * (ICON_SIZE + ICON_GAP);
        const icon = this._makeBuildingIcon(orderedEconomyBuildings[i], x, y);
        this._scrollContainer.addChild(icon);
      }
      cursorY += econRowCount * (ICON_SIZE + ICON_GAP);
    }

    this._scrollContainer.position.y = FIXED_TOP_H;

    // Scrollbar
    const hasScroll = this._contentH > scrollableH;
    this._scrollbarTrack.visible = hasScroll;
    this._scrollbarThumb.visible = hasScroll;

    if (hasScroll) {
      const trackX = PANEL_W - SCROLL_WIDTH - SCROLL_MARGIN;
      const trackY = FIXED_TOP_H + SCROLL_MARGIN;
      const trackH = scrollableH - SCROLL_MARGIN * 2;

      this._scrollbarTrack
        .clear()
        .roundRect(0, 0, SCROLL_WIDTH, trackH, SCROLL_WIDTH / 2)
        .fill({ color: 0x000000, alpha: 0.3 });
      this._scrollbarTrack.position.set(trackX, trackY);

      const thumbH = Math.max(20, (scrollableH / this._contentH) * trackH);
      this._scrollbarThumb
        .clear()
        .roundRect(0, 0, SCROLL_WIDTH, thumbH, SCROLL_WIDTH / 2)
        .fill({ color: 0x556677 });
      this._scrollbarThumb.position.x = trackX;

      this._scrollbarThumb.eventMode = "static";
      this._scrollbarThumb.cursor = "pointer";
      this._scrollbarThumb.removeAllListeners();
      this._scrollbarThumb.on("pointerdown", (e) => this._onThumbDragStart(e));
    }

    // Reset scroll
    this._scrollY = 0;
    this._applyScroll();

    // Position panel: bottom-left of screen
    const screenH = this._vm.screenHeight;
    this.container.position.set(PANEL_PAD, screenH - this._viewH - PANEL_PAD);

    this._updateAffordability();
  }

  // ---------------------------------------------------------------------------
  // Preview
  // ---------------------------------------------------------------------------

  private _showUnitPreview(unitType: UnitType): void {
    this._clearPreview();

    const frames = animationManager.getFrames(unitType, UnitState.IDLE);
    if (frames.length > 0 && frames[0] !== Texture.WHITE) {
      const sprite = new AnimatedSprite(frames);
      sprite.anchor.set(0.5, 0.5);
      sprite.width = 64;
      sprite.height = 64;
      sprite.position.set(PANEL_W / 2, PREVIEW_H / 2);
      const frameSet = animationManager.getFrameSet(unitType, UnitState.IDLE);
      sprite.animationSpeed = frameSet.fps / 60;
      sprite.loop = true;
      sprite.play();
      this._previewSprite = sprite;
      this._previewContainer.addChild(sprite);
    } else {
      // Fallback: colored circle with first letter
      const g = new Graphics()
        .circle(PANEL_W / 2, PREVIEW_H / 2, 24)
        .fill({ color: 0x334466 })
        .circle(PANEL_W / 2, PREVIEW_H / 2, 24)
        .stroke({ color: 0x5588aa, width: 1 });
      this._previewContainer.addChild(g);
      const letter = new Text({
        text: UNIT_LABELS[unitType].charAt(0),
        style: new TextStyle({
          fontFamily: "monospace",
          fontSize: 20,
          fill: 0xdddddd,
          fontWeight: "bold",
        }),
      });
      letter.anchor.set(0.5, 0.5);
      letter.position.set(PANEL_W / 2, PREVIEW_H / 2);
      this._previewContainer.addChild(letter);
    }
  }

  private _showBuildingPreview(buildingType: BuildingType): void {
    this._clearPreview();

    const tex = this._getBuildingTexture(buildingType);
    if (tex) {
      const sprite = new Sprite(tex);
      // Scale to fit within PREVIEW_H - 8px padding, keep aspect ratio
      const maxSize = PREVIEW_H - 8;
      const scale = Math.min(maxSize / tex.width, maxSize / tex.height);
      sprite.scale.set(scale);
      sprite.anchor.set(0.5, 0.5);
      sprite.position.set(PANEL_W / 2, PREVIEW_H / 2);
      this._previewContainer.addChild(sprite);
      return;
    }

    // Fallback: letter placeholder for buildings without a renderer
    const g = new Graphics()
      .roundRect(PANEL_W / 2 - 24, PREVIEW_H / 2 - 24, 48, 48, 6)
      .fill({ color: 0x334466 })
      .roundRect(PANEL_W / 2 - 24, PREVIEW_H / 2 - 24, 48, 48, 6)
      .stroke({ color: BORDER_COLOR, alpha: 0.4, width: 1 });
    this._previewContainer.addChild(g);

    const letter = new Text({
      text: BUILDING_LABELS[buildingType].charAt(0),
      style: new TextStyle({
        fontFamily: "monospace",
        fontSize: 22,
        fill: 0xffd700,
        fontWeight: "bold",
      }),
    });
    letter.anchor.set(0.5, 0.5);
    letter.position.set(PANEL_W / 2, PREVIEW_H / 2);
    this._previewContainer.addChild(letter);
  }

  /** Render a building container to a cached RenderTexture for preview use. */
  private _getBuildingTexture(
    buildingType: BuildingType,
  ): RenderTexture | null {
    if (this._buildingTextureCache.has(buildingType)) {
      return this._buildingTextureCache.get(buildingType)!;
    }

    const renderer = this._vm.app.renderer as Renderer;
    let buildingContainer: Container | null = null;
    let texW = 64;
    let texH = 64;

    if (buildingType === BuildingType.CASTLE) {
      const cr = new CastleRenderer(null);
      buildingContainer = cr.container;
      texW = 256;
      texH = 256;
    } else if (buildingType === BuildingType.TOWER) {
      const tr = new TowerRenderer(null);
      buildingContainer = tr.container;
      texW = 64;
      texH = 64;
    } else if (buildingType === BuildingType.FARM) {
      const fr = new FarmRenderer(null);
      buildingContainer = fr.container;
      texW = 128;
      texH = 128;
    } else if (buildingType === BuildingType.HAMLET) {
      const hr = new HamletRenderer(null);
      buildingContainer = hr.container;
      texW = 128;
      texH = 128;
    } else if (buildingType === BuildingType.WALL) {
      const wr = new WallRenderer();
      buildingContainer = wr.container;
      texW = 64;
      texH = 192;
    } else if (buildingType === BuildingType.TEMPLE) {
      const tr = new TempleRenderer(null);
      buildingContainer = tr.container;
      texW = 128;
      texH = 192;
    } else if (buildingType === BuildingType.EMBASSY) {
      const er = new EmbassyRenderer(null);
      buildingContainer = er.container;
      texW = 128;
      texH = 128;
    } else if (buildingType === BuildingType.BLACKSMITH) {
      const bsr = new BlacksmithRenderer(null);
      buildingContainer = bsr.container;
      texW = 128;
      texH = 128;
    } else if (buildingType === BuildingType.CREATURE_DEN) {
      const cdr = new CreatureDenRenderer(null);
      buildingContainer = cdr.container;
      texW = 128;
      texH = 128;
    } else if (buildingType === BuildingType.MILL) {
      const mr = new MillRenderer(null);
      buildingContainer = mr.container;
      texW = 64;
      texH = 128;
    } else if (buildingType === BuildingType.ELITE_HALL) {
      const ehr = new EliteHallRenderer(null);
      buildingContainer = ehr.container;
      texW = 128;
      texH = 128;
    } else if (buildingType === BuildingType.MAGE_TOWER) {
      const mtr = new MageTowerRenderer(null);
      buildingContainer = mtr.container;
      texW = 128;
      texH = 128;
    } else if (buildingType === BuildingType.SIEGE_WORKSHOP) {
      const swr = new SiegeWorkshopRenderer(null);
      buildingContainer = swr.container;
      texW = 128;
      texH = 128;
    } else if (buildingType === BuildingType.ARCHERY_RANGE) {
      const arr = new ArcheryRangeRenderer(null);
      buildingContainer = arr.container;
      texW = 128;
      texH = 128;
    } else if (buildingType === BuildingType.STABLES) {
      const sr = new StableRenderer(null);
      buildingContainer = sr.container;
      texW = 192;
      texH = 128;
    } else if (buildingType === BuildingType.BARRACKS) {
      const br = new BarracksRenderer(null);
      buildingContainer = br.container;
      texW = 128;
      texH = 128;
    } else if (buildingType === BuildingType.MARKET) {
      const mr = new MarketRenderer(null);
      buildingContainer = mr.container;
      texW = 128;
      texH = 128;
    } else if (buildingType === BuildingType.FACTION_HALL) {
      const fhr = new FactionHallRenderer(null);
      buildingContainer = fhr.container;
      texW = 128;
      texH = 128;
    } else if (buildingType === BuildingType.LIGHTNING_TOWER) {
      const ltr = new LightningTowerRenderer(null);
      buildingContainer = ltr.container;
      texW = 128;
      texH = 128;
    } else if (buildingType === BuildingType.ICE_TOWER) {
      const itr = new IceTowerRenderer(null);
      buildingContainer = itr.container;
      texW = 128;
      texH = 128;
    } else if (buildingType === BuildingType.FIRE_TOWER) {
      const ftr = new FireTowerRenderer(null);
      buildingContainer = ftr.container;
      texW = 128;
      texH = 128;
    } else if (buildingType === BuildingType.WARP_TOWER) {
      const wtr = new WarpTowerRenderer(null);
      buildingContainer = wtr.container;
      texW = 128;
      texH = 128;
    } else if (buildingType === BuildingType.HEALING_TOWER) {
      const htr = new HealingTowerRenderer(null);
      buildingContainer = htr.container;
      texW = 128;
      texH = 128;
    } else if (buildingType === BuildingType.BALLISTA_TOWER) {
      const btr = new BallistaTowerRenderer(null);
      buildingContainer = btr.container;
      texW = 128;
      texH = 128;
    } else if (buildingType === BuildingType.REPEATER_TOWER) {
      const rtr = new RepeaterTowerRenderer(null);
      buildingContainer = rtr.container;
      texW = 128;
      texH = 128;
    } else if (buildingType === BuildingType.ARCHITECTS_GUILD) {
      buildingContainer = new ArchitectsGuildRenderer(null).container;
      texW = 192;
      texH = 128;
    } else if (buildingType === BuildingType.HOUSE1) {
      buildingContainer = new House1Renderer(null).container;
      texW = 64;
      texH = 128;
    } else if (buildingType === BuildingType.HOUSE2) {
      buildingContainer = new House2Renderer(null).container;
      texW = 64;
      texH = 128;
    } else if (buildingType === BuildingType.HOUSE3) {
      buildingContainer = new House3Renderer(null).container;
      texW = 64;
      texH = 128;
    } else if (buildingType === BuildingType.ELITE_BARRACKS) {
      buildingContainer = new EliteBarracksRenderer(null).container;
      texW = 128;
      texH = 128;
    } else if (buildingType === BuildingType.ELITE_ARCHERY_RANGE) {
      buildingContainer = new EliteArcheryRangeRenderer(null).container;
      texW = 256;
      texH = 128;
    } else if (buildingType === BuildingType.ELITE_SIEGE_WORKSHOP) {
      buildingContainer = new EliteSiegeWorkshopRenderer(null).container;
      texW = 128;
      texH = 128;
    } else if (buildingType === BuildingType.ELITE_MAGE_TOWER) {
      buildingContainer = new EliteMageTowerRenderer(null).container;
      texW = 128;
      texH = 128;
    } else if (buildingType === BuildingType.ELITE_STABLES) {
      buildingContainer = new EliteStableRenderer(null).container;
      texW = 128;
      texH = 128;
    } else if (buildingType === BuildingType.ARCHIVE) {
      buildingContainer = new ArchiveRenderer(null).container;
      texW = 128;
      texH = 128;
    }

    if (!buildingContainer) return null;

    const rt = RenderTexture.create({ width: texW, height: texH });
    renderer.render({ container: buildingContainer, target: rt });
    buildingContainer.destroy({ children: true });

    this._buildingTextureCache.set(buildingType, rt);
    return rt;
  }

  private _clearPreview(): void {
    if (this._previewSprite) {
      this._previewSprite.stop();
      this._previewSprite.destroy();
      this._previewSprite = null;
    }
    this._previewContainer.removeChildren();
  }

  // ---------------------------------------------------------------------------
  // Stats
  // ---------------------------------------------------------------------------

  private _showUnitStats(unitType: UnitType): void {
    this._statsContainer.removeChildren();
    const def = UNIT_DEFINITIONS[unitType];

    const name = new Text({
      text: UNIT_LABELS[unitType],
      style: STYLE_PREVIEW_NAME,
    });
    name.position.set(PANEL_PAD, 0);
    this._statsContainer.addChild(name);

    // Flavor text if available
    if (def.description) {
      const maxLineLength = 35; // Maximum characters per line
      const words = def.description.split(" ");
      let currentLine = "";
      let yOffset = 16;
      let actualLineCount = 0;

      for (const word of words) {
        if (
          (currentLine + word).length > maxLineLength &&
          currentLine.length > 0
        ) {
          // Create text for current line
          const flavorText = new Text({
            text: currentLine.trim(),
            style: { ...STYLE_STAT, fontSize: 10, fill: 0xaaaadd },
          });
          flavorText.position.set(PANEL_PAD, yOffset);
          this._statsContainer.addChild(flavorText);

          // Start new line
          currentLine = word + " ";
          yOffset += 12;
          actualLineCount++;
        } else {
          currentLine += word + " ";
        }
      }

      // Add the last line
      if (currentLine.trim().length > 0) {
        const flavorText = new Text({
          text: currentLine.trim(),
          style: { ...STYLE_STAT, fontSize: 10, fill: 0xaaaadd },
        });
        flavorText.position.set(PANEL_PAD, yOffset);
        this._statsContainer.addChild(flavorText);
        yOffset += 12;
        actualLineCount++;
      }

      // Adjust subsequent lines based on actual flavor lines used
      const baseY = 16 + actualLineCount * 12;

      const tierTag = def.tier ? `  T${def.tier}` : "";
      const line1 = new Text({
        text: `HP:${def.hp}  ATK:${def.atk}  SPD:${def.speed}${tierTag}`,
        style: STYLE_STAT,
      });
      line1.position.set(PANEL_PAD, baseY + 8);
      this._statsContainer.addChild(line1);

      const line2 = new Text({
        text: `RNG:${def.range}  AS:${def.attackSpeed}  COST:${def.cost}g`,
        style: STYLE_STAT,
      });
      line2.position.set(PANEL_PAD, baseY + 20);
      this._statsContainer.addChild(line2);

      let extraLine = `Spawn: ${def.spawnTime}s`;
      if (def.abilityTypes.length > 0) {
        extraLine += `  ${def.abilityTypes.join(", ")}`;
      }
      const line3 = new Text({ text: extraLine, style: STYLE_SPAWN });
      line3.position.set(PANEL_PAD, baseY + 32);
      this._statsContainer.addChild(line3);
    } else {
      // No description - use original layout
      const tierTag2 = def.tier ? `  T${def.tier}` : "";
      const line1 = new Text({
        text: `HP:${def.hp}  ATK:${def.atk}  SPD:${def.speed}${tierTag2}`,
        style: STYLE_STAT,
      });
      line1.position.set(PANEL_PAD, 16);
      this._statsContainer.addChild(line1);

      const line2 = new Text({
        text: `RNG:${def.range}  AS:${def.attackSpeed}  COST:${def.cost}g`,
        style: STYLE_STAT,
      });
      line2.position.set(PANEL_PAD, 28);
      this._statsContainer.addChild(line2);

      let extraLine = `Spawn: ${def.spawnTime}s`;
      if (def.abilityTypes.length > 0) {
        extraLine += `  ${def.abilityTypes.join(", ")}`;
      }
      const line3 = new Text({ text: extraLine, style: STYLE_SPAWN });
      line3.position.set(PANEL_PAD, 40);
      this._statsContainer.addChild(line3);
    }
  }

  private _showBuildingStats(buildingType: BuildingType): void {
    this._statsContainer.removeChildren();
    const def = BUILDING_DEFINITIONS[buildingType];

    const name = new Text({
      text: BUILDING_LABELS[buildingType],
      style: STYLE_PREVIEW_NAME,
    });
    name.position.set(PANEL_PAD, 0);
    this._statsContainer.addChild(name);

    // Flavor text if available
    if (def.description) {
      const maxLineLength = 35; // Maximum characters per line
      const words = def.description.split(" ");
      let currentLine = "";
      let yOffset = 16;
      let actualLineCount = 0;

      for (const word of words) {
        if (
          (currentLine + word).length > maxLineLength &&
          currentLine.length > 0
        ) {
          // Create text for current line
          const flavorText = new Text({
            text: currentLine.trim(),
            style: { ...STYLE_STAT, fontSize: 10, fill: 0xaaaadd },
          });
          flavorText.position.set(PANEL_PAD, yOffset);
          this._statsContainer.addChild(flavorText);

          // Start new line
          currentLine = word + " ";
          yOffset += 12;
          actualLineCount++;
        } else {
          currentLine += word + " ";
        }
      }

      // Add the last line
      if (currentLine.trim().length > 0) {
        const flavorText = new Text({
          text: currentLine.trim(),
          style: { ...STYLE_STAT, fontSize: 10, fill: 0xaaaadd },
        });
        flavorText.position.set(PANEL_PAD, yOffset);
        this._statsContainer.addChild(flavorText);
        yOffset += 12;
        actualLineCount++;
      }

      // Adjust subsequent lines based on actual flavor lines used
      const baseY = 16 + actualLineCount * 12;

      const line1 = new Text({
        text: `HP:${def.hp}  COST:${def.cost}g  INCOME:${def.goldIncome}g/s`,
        style: STYLE_STAT,
      });
      line1.position.set(PANEL_PAD, baseY + 8);
      this._statsContainer.addChild(line1);

      const line2 = new Text({
        text: `Size: ${def.footprint.w}×${def.footprint.h}`,
        style: STYLE_STAT,
      });
      line2.position.set(PANEL_PAD, baseY + 20);
      this._statsContainer.addChild(line2);

      // Add requirements line if building has prerequisites or max count
      if (def.prerequisite || def.maxCount) {
        let xPos = PANEL_PAD;

        // Add requirements in gold if present
        if (def.prerequisite) {
          const reqText =
            def.prerequisite.minCount > 1
              ? `Requires: ${def.prerequisite.minCount} ${def.prerequisite.types.map((type) => BUILDING_LABELS[type]).join(", ")}`
              : `Requires: ${def.prerequisite.types.map((type) => BUILDING_LABELS[type]).join(", ")}`;

          const requirementsLine = new Text({
            text: reqText,
            style: STYLE_REQUIREMENTS,
          });
          requirementsLine.position.set(xPos, baseY + 32);
          this._statsContainer.addChild(requirementsLine);

          // Measure text width to position max count after it
          xPos += requirementsLine.width + 5;
        }

        // Add max count in red if present
        if (def.maxCount) {
          const maxText = `(Max: ${def.maxCount})`;
          const maxLine = new Text({
            text: maxText,
            style: STYLE_MAX_COUNT,
          });
          maxLine.position.set(xPos, baseY + 32);
          this._statsContainer.addChild(maxLine);
        }
      }
    } else {
      // No description - use original layout
      const line1 = new Text({
        text: `HP:${def.hp}  COST:${def.cost}g  INCOME:${def.goldIncome}g/s`,
        style: STYLE_STAT,
      });
      line1.position.set(PANEL_PAD, 16);
      this._statsContainer.addChild(line1);

      const line2 = new Text({
        text: `Size: ${def.footprint.w}×${def.footprint.h}`,
        style: STYLE_STAT,
      });
      line2.position.set(PANEL_PAD, 28);
      this._statsContainer.addChild(line2);

      // Add requirements line if building has prerequisites or max count
      if (def.prerequisite || def.maxCount) {
        let xPos = PANEL_PAD;

        // Add requirements in gold if present
        if (def.prerequisite) {
          const reqText =
            def.prerequisite.minCount > 1
              ? `Requires: ${def.prerequisite.minCount} ${def.prerequisite.types.map((type) => BUILDING_LABELS[type]).join(", ")}`
              : `Requires: ${def.prerequisite.types.map((type) => BUILDING_LABELS[type]).join(", ")}`;

          const requirementsLine = new Text({
            text: reqText,
            style: STYLE_REQUIREMENTS,
          });
          requirementsLine.position.set(xPos, 40);
          this._statsContainer.addChild(requirementsLine);

          // Measure text width to position max count after it
          xPos += requirementsLine.width + 5;
        }

        // Add max count in red if present
        if (def.maxCount) {
          const maxText = `(Max: ${def.maxCount})`;
          const maxLine = new Text({
            text: maxText,
            style: STYLE_MAX_COUNT,
          });
          maxLine.position.set(xPos, 40);
          this._statsContainer.addChild(maxLine);
        }
      }
    }
  }

  private _showDefaultPreviewAndStats(): void {
    if (this._defaultBuildingType !== null) {
      this._showBuildingPreview(this._defaultBuildingType);
      this._showBuildingStats(this._defaultBuildingType);
    }
  }

  // ---------------------------------------------------------------------------
  // Icon button factories
  // ---------------------------------------------------------------------------

  private _makeUnitIcon(
    buildingId: string,
    unitType: UnitType,
    x: number,
    y: number,
  ): Container {
    const btn = new Container();
    btn.position.set(x, y);
    btn.eventMode = "static";
    btn.cursor = "pointer";

    const def = UNIT_DEFINITIONS[unitType];
    const needsEliteHall = def.cost >= ELITE_HALL_COST_THRESHOLD;
    const hasEliteHall = this._countOwnedType(BuildingType.ELITE_HALL) > 0;
    const atMaxCount =
      def.maxCount !== undefined &&
      this._countOwnedUnits(unitType) >= def.maxCount;
    const locked = (needsEliteHall && !hasEliteHall) || atMaxCount;

    const bg = new Graphics()
      .roundRect(0, 0, ICON_SIZE, ICON_SIZE, 4)
      .fill({ color: 0x111122 })
      .roundRect(0, 0, ICON_SIZE, ICON_SIZE, 4)
      .stroke({ color: locked ? 0x443322 : 0x334455, width: 1 });
    btn.addChild(bg);

    // Unit sprite icon
    if (animationManager.isLoaded) {
      const frames = animationManager.getFrames(unitType, UnitState.IDLE);
      if (frames.length > 0 && frames[0] !== Texture.WHITE) {
        const icon = new AnimatedSprite(frames);
        icon.anchor.set(0.5, 0.5);
        icon.width = ICON_SIZE - 8;
        icon.height = ICON_SIZE - 8;
        icon.position.set(ICON_SIZE / 2, ICON_SIZE / 2 - 4);
        icon.animationSpeed = 0.1;
        icon.loop = true;
        icon.play();
        if (locked) icon.alpha = 0.35;
        btn.addChild(icon);
      }
    }

    // Cost text at bottom (or lock indicator)
    const costText = locked
      ? new Text({ text: "🔒", style: STYLE_ICON_COST })
      : new Text({ text: `${def.cost}g`, style: STYLE_ICON_COST });
    costText.anchor.set(0.5, 1);
    costText.position.set(ICON_SIZE / 2, ICON_SIZE - 1);
    btn.addChild(costText);

    // Hover: show preview + stats
    btn.on("pointerover", () => {
      if (!entry.locked) bg.tint = 0x334466;
      this._showUnitPreview(unitType);
      this._showUnitStats(unitType);
    });
    btn.on("pointerout", () => {
      bg.tint = 0xffffff;
      this._showDefaultPreviewAndStats();
    });
    btn.on("pointerdown", (e) => {
      e.stopPropagation();
      if (!entry.locked) this._buyUnit(buildingId, unitType);
    });

    const entry = { type: unitType, costText, bg, btn, locked };
    this._unitIcons.push(entry);
    return btn;
  }

  private _makeUpgradeIcon(
    buildingId: string,
    upgradeType: UpgradeType,
    x: number,
    y: number,
  ): Container {
    const btn = new Container();
    btn.position.set(x, y);
    btn.eventMode = "static";
    btn.cursor = "pointer";

    const bg = new Graphics()
      .roundRect(0, 0, ICON_SIZE, ICON_SIZE, 4)
      .fill({ color: 0x334455 })
      .roundRect(0, 0, ICON_SIZE, ICON_SIZE, 4)
      .stroke({ color: 0x667788, width: 2 });
    btn.addChild(bg);

    // Cost and level info
    const def = UPGRADE_DEFINITIONS[upgradeType];

    // Spell-specific animated icon or generic upgrade icon
    const spellDef = def as any;
    if (spellDef.isSpell) {
      this._addSpellIcon(btn, upgradeType, spellDef);
    } else {
      // Generic upgrade icon (circle + arrow + label)
      const upgradeIcon = new Graphics()
        .circle(ICON_SIZE / 2, ICON_SIZE / 2 - 6, (ICON_SIZE - 14) / 2)
        .fill({ color: 0x778899 })
        .circle(ICON_SIZE / 2, ICON_SIZE / 2 - 6, (ICON_SIZE - 18) / 2)
        .fill({ color: 0x556677 });
      btn.addChild(upgradeIcon);

      const arrow = new Graphics()
        .moveTo(ICON_SIZE / 2, ICON_SIZE / 2 - 12)
        .lineTo(ICON_SIZE / 2 - 4, ICON_SIZE / 2 - 4)
        .moveTo(ICON_SIZE / 2, ICON_SIZE / 2 - 12)
        .lineTo(ICON_SIZE / 2 + 4, ICON_SIZE / 2 - 4)
        .stroke({ color: 0xffffff, width: 2 });
      btn.addChild(arrow);

      const label = new Text({
        text: UPGRADE_LABELS[upgradeType],
        style: new TextStyle({
          fontFamily: "monospace",
          fontSize: 7,
          fill: 0xffffff,
          align: "center",
          fontWeight: "bold",
        }),
      });
      label.anchor.set(0.5, 0.5);
      label.position.set(ICON_SIZE / 2, ICON_SIZE / 2 + 6);
      btn.addChild(label);
    }
    const currentLevel = UpgradeSystem.getUpgradeLevel(
      this._localPlayerId,
      upgradeType,
    );
    const manaCost = (def as any).manaCost as number | undefined;
    const cost = currentLevel < def.maxLevel ? (manaCost && manaCost > 0 ? manaCost : def.cost) : 0;

    const costText = new Text({
      text: currentLevel >= def.maxLevel ? "MAX" : (manaCost && manaCost > 0 ? `${cost}m` : `${cost}g`),
      style: STYLE_ICON_COST,
    });
    costText.anchor.set(0.5, 1);
    costText.position.set(ICON_SIZE / 2, ICON_SIZE - 1);
    btn.addChild(costText);

    // Level indicator
    if (currentLevel > 0) {
      const levelText = new Text({
        text: `${currentLevel}/${def.maxLevel}`,
        style: new TextStyle({
          fontFamily: "monospace",
          fontSize: 6,
          fill: 0x88ff88,
          align: "center",
          fontWeight: "bold",
        }),
      });
      levelText.anchor.set(1, 0);
      levelText.position.set(ICON_SIZE - 2, 2);
      btn.addChild(levelText);
    }

    // Spell magic type + tier badge (top-left, e.g. "FIRE II")
    const spellSchool = (def as any).spellSchool as string | undefined;
    const tierNum = (def as any).spellTier as number | undefined;
    const magicType = (def as any).spellMagicType as string | undefined;
    if (tierNum && spellSchool) {
      const tierNumerals = ["", "I", "II", "III", "IV", "V", "VI", "VII"];
      const magicTypeColors: Record<string, number> = {
        fire: 0xff4422, ice: 0x66ccff, lightning: 0xffff44,
        earth: 0xaa8844, arcane: 0x9966ff, holy: 0xffdd44,
        shadow: 0xaa66cc, poison: 0x66cc44, void: 0x8833cc,
        death: 0x44aa88, nature: 0x44cc44,
      };
      const tierText = tierNumerals[tierNum] || "";
      const typeLabel = magicType ? magicType.toUpperCase() : spellSchool.toUpperCase();
      const badgeColor = magicType
        ? (magicTypeColors[magicType] ?? 0xffffff)
        : 0xffffff;
      const tierBadge = new Text({
        text: `${typeLabel} ${tierText}`,
        style: new TextStyle({
          fontFamily: "monospace",
          fontSize: 6,
          fill: badgeColor,
          fontWeight: "bold",
        }),
      });
      tierBadge.anchor.set(0, 0);
      tierBadge.position.set(1, 1);
      btn.addChild(tierBadge);
    }

    // Hover: show upgrade info
    btn.on("pointerover", () => {
      bg.tint = 0x556677;
      this._showUpgradePreview(upgradeType);
      this._showUpgradeStats(upgradeType);
    });
    btn.on("pointerout", () => {
      bg.tint = 0xffffff;
      this._showDefaultPreviewAndStats();
    });
    btn.on("pointerdown", (e) => {
      e.stopPropagation();
      this._buyUpgrade(buildingId, upgradeType);
    });

    return btn;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Spell icon mini-animations — each spell draws a unique looping graphic
  // ═══════════════════════════════════════════════════════════════════════════

  private _addSpellIcon(btn: Container, upgradeType: UpgradeType, spellDef: any): void {
    const cx = ICON_SIZE / 2;
    const cy = ICON_SIZE / 2 - 4;
    const S = ICON_SIZE * 0.32; // base scale for icon art
    const TAU = Math.PI * 2;
    const iconC = new Container();
    iconC.position.set(cx, cy);
    btn.addChild(iconC);

    // Spell label at bottom of icon area
    const label = new Text({
      text: UPGRADE_LABELS[upgradeType],
      style: new TextStyle({
        fontFamily: "monospace",
        fontSize: 6,
        fill: 0xdddddd,
        align: "center",
        fontWeight: "bold",
      }),
    });
    label.anchor.set(0.5, 0.5);
    label.position.set(cx, ICON_SIZE / 2 + 10);
    btn.addChild(label);

    const school = spellDef.spellSchool as string;

    switch (upgradeType) {
      // ── ELEMENTAL ───────────────────────────────────────────────────────
      case UpgradeType.SPELL_FIREBALL: {
        // Flickering fireball orb
        const glow = new Graphics().circle(0, 0, S * 0.9).fill({ color: 0xff6622, alpha: 0.3 });
        const core = new Graphics().circle(0, 0, S * 0.55).fill({ color: 0xff4400, alpha: 0.8 });
        const hot = new Graphics().circle(0, 0, S * 0.25).fill({ color: 0xffffaa, alpha: 0.9 });
        iconC.addChild(glow, core, hot);
        gsap.to(glow, { scale: 1.3, alpha: 0.15, duration: 0.6, yoyo: true, repeat: -1, ease: "sine.inOut" });
        gsap.to(core, { scale: 1.1, duration: 0.4, yoyo: true, repeat: -1, ease: "sine.inOut" });
        // Tiny ember particles rising
        for (let i = 0; i < 3; i++) {
          const ember = new Graphics().circle(0, 0, 1.2).fill({ color: 0xffaa44, alpha: 0.7 });
          ember.position.set((Math.random() - 0.5) * S * 0.6, S * 0.2);
          iconC.addChild(ember);
          gsap.to(ember, { y: -S * 0.9, alpha: 0, duration: 0.8 + i * 0.2, repeat: -1, delay: i * 0.25, ease: "power1.out" });
        }
        break;
      }
      case UpgradeType.SPELL_METEOR_STRIKE: {
        // Meteor body with trail
        const trail = new Graphics().moveTo(S * 0.5, -S * 0.8).lineTo(-S * 0.2, S * 0.1).lineTo(S * 0.8, -S * 0.6).closePath().fill({ color: 0xff6622, alpha: 0.25 });
        const meteorG = new Graphics().circle(0, 0, S * 0.4).fill({ color: 0xffaa22, alpha: 0.9 }).circle(0, 0, S * 0.2).fill({ color: 0xffffcc, alpha: 0.8 });
        iconC.addChild(trail, meteorG);
        gsap.to(meteorG, { scale: 1.15, duration: 0.5, yoyo: true, repeat: -1, ease: "sine.inOut" });
        gsap.to(trail, { alpha: 0.1, duration: 0.6, yoyo: true, repeat: -1 });
        break;
      }
      case UpgradeType.SPELL_BLIZZARD: {
        // Swirling snowflakes
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * TAU;
          const flake = new Graphics();
          const sz = 1.5 + Math.random();
          flake.moveTo(0, -sz).lineTo(sz * 0.4, 0).lineTo(0, sz).lineTo(-sz * 0.4, 0).closePath().fill({ color: [0xaaddff, 0xcceeff, 0xddeeff][i % 3], alpha: 0.8 });
          flake.position.set(Math.cos(a) * S * 0.5, Math.sin(a) * S * 0.5);
          iconC.addChild(flake);
          gsap.to(flake, { rotation: TAU, duration: 2.5 + i * 0.3, repeat: -1, ease: "none" });
        }
        const wind = new Graphics().circle(0, 0, S * 0.7).stroke({ color: 0x88bbdd, width: 1, alpha: 0.3 });
        iconC.addChild(wind);
        gsap.to(wind, { rotation: TAU, duration: 3, repeat: -1, ease: "none" });
        break;
      }
      case UpgradeType.SPELL_LIGHTNING_STRIKE: {
        // Jagged bolt
        const bolt = new Graphics();
        bolt.moveTo(0, -S).lineTo(S * 0.25, -S * 0.35).lineTo(-S * 0.1, -S * 0.2).lineTo(S * 0.15, S * 0.4).lineTo(-S * 0.05, S * 0.2).lineTo(0, S);
        bolt.stroke({ color: 0xffffff, width: 2, alpha: 0.9 });
        const boltGlow = new Graphics();
        boltGlow.moveTo(0, -S).lineTo(S * 0.25, -S * 0.35).lineTo(-S * 0.1, -S * 0.2).lineTo(S * 0.15, S * 0.4).lineTo(-S * 0.05, S * 0.2).lineTo(0, S);
        boltGlow.stroke({ color: 0x4488ff, width: 4, alpha: 0.3 });
        iconC.addChild(boltGlow, bolt);
        gsap.to(bolt, { alpha: 0.4, duration: 0.08, yoyo: true, repeat: -1, repeatDelay: 0.8 });
        gsap.to(boltGlow, { alpha: 0.1, duration: 0.08, yoyo: true, repeat: -1, repeatDelay: 0.8 });
        break;
      }
      case UpgradeType.SPELL_EARTHQUAKE: {
        // Cracked ground with rocks
        const crack1 = new Graphics().moveTo(-S * 0.8, 0).lineTo(-S * 0.2, -S * 0.15).lineTo(S * 0.1, S * 0.1).lineTo(S * 0.8, -S * 0.05);
        crack1.stroke({ color: 0x886633, width: 1.5, alpha: 0.7 });
        const crack2 = new Graphics().moveTo(0, -S * 0.6).lineTo(S * 0.15, -S * 0.1).lineTo(-S * 0.1, S * 0.2).lineTo(S * 0.05, S * 0.6);
        crack2.stroke({ color: 0x775533, width: 1.5, alpha: 0.6 });
        iconC.addChild(crack1, crack2);
        for (let i = 0; i < 3; i++) {
          const rock = new Graphics();
          const rs = 2 + Math.random() * 2;
          rock.moveTo(-rs, 0).lineTo(0, -rs).lineTo(rs, 0).lineTo(0, rs * 0.6).closePath().fill({ color: [0x886633, 0xaa8855, 0x664422][i], alpha: 0.8 });
          rock.position.set((Math.random() - 0.5) * S, (Math.random() - 0.5) * S * 0.6);
          iconC.addChild(rock);
          gsap.to(rock, { y: rock.position.y - 3, duration: 0.3, yoyo: true, repeat: -1, delay: i * 0.15, ease: "power1.out" });
        }
        // Shake
        gsap.to(iconC, { x: cx + 1, duration: 0.05, yoyo: true, repeat: -1, repeatDelay: 1.5 });
        break;
      }
      case UpgradeType.SPELL_FROST_NOVA: {
        // Ice ring expanding/contracting
        const ring = new Graphics().circle(0, 0, S * 0.7).stroke({ color: 0x88ddff, width: 1.5, alpha: 0.6 });
        const core = new Graphics().circle(0, 0, S * 0.25).fill({ color: 0xeeffff, alpha: 0.7 });
        iconC.addChild(ring, core);
        gsap.to(ring, { scale: 1.2, alpha: 0.2, duration: 1, yoyo: true, repeat: -1, ease: "sine.inOut" });
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * TAU;
          const shard = new Graphics();
          shard.moveTo(0, -2.5).lineTo(1.2, 0).lineTo(0, 1.5).lineTo(-1.2, 0).closePath().fill({ color: 0xaaddff, alpha: 0.7 });
          shard.position.set(Math.cos(a) * S * 0.55, Math.sin(a) * S * 0.55);
          shard.rotation = a;
          iconC.addChild(shard);
        }
        break;
      }
      case UpgradeType.SPELL_CHAIN_LIGHTNING: {
        // Multiple small bolts connecting dots
        const pts = [{ x: -S * 0.6, y: -S * 0.4 }, { x: S * 0.2, y: -S * 0.6 }, { x: S * 0.5, y: S * 0.1 }, { x: -S * 0.3, y: S * 0.5 }];
        for (const p of pts) {
          const dot = new Graphics().circle(0, 0, 2).fill({ color: 0x4488ff, alpha: 0.7 });
          dot.position.set(p.x, p.y);
          iconC.addChild(dot);
        }
        for (let i = 0; i < pts.length - 1; i++) {
          const line = new Graphics();
          const f = pts[i]; const t = pts[i + 1];
          const mx = (f.x + t.x) / 2 + (Math.random() - 0.5) * 5;
          const my = (f.y + t.y) / 2 + (Math.random() - 0.5) * 5;
          line.moveTo(f.x, f.y).lineTo(mx, my).lineTo(t.x, t.y).stroke({ color: 0xccddff, width: 1.5, alpha: 0.8 });
          iconC.addChild(line);
          gsap.to(line, { alpha: 0.2, duration: 0.1, yoyo: true, repeat: -1, repeatDelay: 0.6 + i * 0.15 });
        }
        break;
      }
      case UpgradeType.SPELL_INFERNO: {
        // Towering flame pillar
        const flame1 = new Graphics().rect(-S * 0.3, -S * 0.9, S * 0.6, S * 1.4).fill({ color: 0xff4400, alpha: 0.35 });
        const flame2 = new Graphics().rect(-S * 0.12, -S * 0.9, S * 0.24, S * 1.4).fill({ color: 0xffdd00, alpha: 0.5 });
        iconC.addChild(flame1, flame2);
        gsap.to(flame1, { scaleX: 1.2, scaleY: 1.05, alpha: 0.2, duration: 0.4, yoyo: true, repeat: -1, ease: "sine.inOut" });
        gsap.to(flame2, { scaleX: 0.8, scaleY: 1.05, alpha: 0.3, duration: 0.3, yoyo: true, repeat: -1, ease: "sine.inOut" });
        for (let i = 0; i < 4; i++) {
          const ember = new Graphics().circle(0, 0, 1).fill({ color: [0xffaa44, 0xff6622][i % 2], alpha: 0.8 });
          ember.position.set((Math.random() - 0.5) * S * 0.5, S * 0.3);
          iconC.addChild(ember);
          gsap.to(ember, { y: -S, x: (Math.random() - 0.5) * S * 0.8, alpha: 0, duration: 0.9 + i * 0.15, repeat: -1, delay: i * 0.2, ease: "power1.out" });
        }
        break;
      }

      // ── ARCANE ──────────────────────────────────────────────────────────
      case UpgradeType.SPELL_ARCANE_MISSILE: {
        // Arcane bolt with trail
        const trail = new Graphics().moveTo(S * 0.6, -S * 0.5).lineTo(-S * 0.2, S * 0.1).lineTo(S * 0.7, -S * 0.4).closePath().fill({ color: 0x9966ff, alpha: 0.2 });
        const orb = new Graphics().circle(0, 0, S * 0.35).fill({ color: 0x9966ff, alpha: 0.7 }).circle(0, 0, S * 0.15).fill({ color: 0xddaaff, alpha: 0.9 });
        iconC.addChild(trail, orb);
        gsap.to(orb, { scale: 1.2, duration: 0.5, yoyo: true, repeat: -1, ease: "sine.inOut" });
        gsap.to(trail, { alpha: 0.08, duration: 0.5, yoyo: true, repeat: -1 });
        break;
      }
      case UpgradeType.SPELL_MANA_SURGE: {
        // Spiraling mana particles around a core
        const core = new Graphics().circle(0, 0, S * 0.3).fill({ color: 0x6644cc, alpha: 0.6 }).circle(0, 0, S * 0.15).fill({ color: 0xeeddff, alpha: 0.8 });
        iconC.addChild(core);
        gsap.to(core, { scale: 1.3, duration: 0.5, yoyo: true, repeat: -1, ease: "sine.inOut" });
        for (let i = 0; i < 4; i++) {
          const p = new Graphics().circle(0, 0, 1.5).fill({ color: [0x9966ff, 0xddaaff][i % 2], alpha: 0.7 });
          const a = (i / 4) * TAU;
          p.position.set(Math.cos(a) * S * 0.55, Math.sin(a) * S * 0.55);
          iconC.addChild(p);
          gsap.to(p, { rotation: 0, duration: 0 }); // just to init
        }
        // Rotate the whole icon container for spiral effect
        gsap.to(iconC, { rotation: TAU, duration: 3, repeat: -1, ease: "none" });
        break;
      }
      case UpgradeType.SPELL_ARCANE_BARRAGE: {
        // Multiple small arcane dots raining
        for (let i = 0; i < 5; i++) {
          const dot = new Graphics().circle(0, 0, 1.5).fill({ color: [0x9966ff, 0xddaaff][i % 2], alpha: 0.8 });
          dot.position.set((i - 2) * S * 0.3, -S * 0.8);
          iconC.addChild(dot);
          gsap.to(dot, { y: S * 0.5, alpha: 0, duration: 0.6, repeat: -1, delay: i * 0.12, ease: "power1.in" });
        }
        break;
      }
      case UpgradeType.SPELL_ARCANE_STORM: {
        // Vortex with bolts
        const vortex = new Graphics().circle(0, 0, S * 0.6).stroke({ color: 0x9966ff, width: 1.5, alpha: 0.4 });
        const inner = new Graphics().circle(0, 0, S * 0.3).stroke({ color: 0xddaaff, width: 1, alpha: 0.3 });
        iconC.addChild(vortex, inner);
        gsap.to(vortex, { rotation: TAU, duration: 2, repeat: -1, ease: "none" });
        gsap.to(inner, { rotation: -TAU, duration: 1.5, repeat: -1, ease: "none" });
        // Small bolts
        for (let i = 0; i < 2; i++) {
          const bolt = new Graphics().moveTo(0, -S * 0.4).lineTo(S * 0.1, 0).lineTo(-S * 0.05, S * 0.1).lineTo(0, S * 0.4);
          bolt.stroke({ color: 0xddaaff, width: 1, alpha: 0.6 });
          bolt.rotation = (i / 2) * Math.PI;
          iconC.addChild(bolt);
          gsap.to(bolt, { alpha: 0.15, duration: 0.12, yoyo: true, repeat: -1, repeatDelay: 0.5 + i * 0.3 });
        }
        break;
      }
      case UpgradeType.SPELL_TEMPORAL_BLAST: {
        // Clock-like rune with golden rings
        const rune = new Graphics();
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * TAU;
          const len = i % 3 === 0 ? S * 0.7 : S * 0.45;
          rune.moveTo(Math.cos(a) * S * 0.3, Math.sin(a) * S * 0.3).lineTo(Math.cos(a) * len, Math.sin(a) * len);
        }
        rune.stroke({ color: 0xffeeaa, width: 1, alpha: 0.6 });
        const ring = new Graphics().circle(0, 0, S * 0.7).stroke({ color: 0xeeddff, width: 1.5, alpha: 0.5 });
        iconC.addChild(ring, rune);
        gsap.to(rune, { rotation: TAU, duration: 4, repeat: -1, ease: "none" });
        gsap.to(ring, { scale: 1.15, alpha: 0.2, duration: 1, yoyo: true, repeat: -1 });
        break;
      }

      // ── DIVINE ──────────────────────────────────────────────────────────
      case UpgradeType.SPELL_HEALING_WAVE: {
        // Green ripple rings
        const ring1 = new Graphics().circle(0, 0, S * 0.4).stroke({ color: 0x22cc44, width: 1.5, alpha: 0.5 });
        const ring2 = new Graphics().circle(0, 0, S * 0.65).stroke({ color: 0x33dd55, width: 1, alpha: 0.35 });
        const core = new Graphics().circle(0, 0, S * 0.2).fill({ color: 0x88ff99, alpha: 0.5 });
        iconC.addChild(ring2, ring1, core);
        gsap.to(ring1, { scale: 1.4, alpha: 0.1, duration: 1, repeat: -1, ease: "power1.out" });
        gsap.to(ring2, { scale: 1.3, alpha: 0.05, duration: 1.2, repeat: -1, delay: 0.3, ease: "power1.out" });
        gsap.to(core, { scale: 1.3, duration: 0.6, yoyo: true, repeat: -1, ease: "sine.inOut" });
        break;
      }
      case UpgradeType.SPELL_HOLY_SMITE: {
        // Golden beam from above with cross
        const beam = new Graphics().rect(-2, -S, 4, S * 1.5).fill({ color: 0xffdd44, alpha: 0.35 });
        iconC.addChild(beam);
        gsap.to(beam, { alpha: 0.1, duration: 0.5, yoyo: true, repeat: -1, ease: "sine.inOut" });
        // Cross
        for (let i = 0; i < 4; i++) {
          const ray = new Graphics().rect(-0.8, 0, 1.6, S * 0.5).fill({ color: 0xffdd44, alpha: 0.4 });
          ray.rotation = (i / 4) * TAU;
          iconC.addChild(ray);
        }
        const flash = new Graphics().circle(0, 0, S * 0.15).fill({ color: 0xffffff, alpha: 0.6 });
        iconC.addChild(flash);
        gsap.to(flash, { scale: 1.5, alpha: 0.2, duration: 0.6, yoyo: true, repeat: -1 });
        break;
      }
      case UpgradeType.SPELL_DIVINE_RESTORATION: {
        // Golden pillar with ascending motes
        const pillar = new Graphics().rect(-S * 0.15, -S, S * 0.3, S * 1.6).fill({ color: 0xffdd44, alpha: 0.3 });
        const pillarOut = new Graphics().rect(-S * 0.35, -S, S * 0.7, S * 1.6).fill({ color: 0xffdd44, alpha: 0.12 });
        iconC.addChild(pillarOut, pillar);
        gsap.to(pillar, { alpha: 0.15, duration: 0.8, yoyo: true, repeat: -1 });
        for (let i = 0; i < 3; i++) {
          const mote = new Graphics().circle(0, 0, 1.2).fill({ color: [0xffffaa, 0xffee88, 0xffffff][i], alpha: 0.7 });
          mote.position.set((Math.random() - 0.5) * S * 0.5, S * 0.4);
          iconC.addChild(mote);
          gsap.to(mote, { y: -S * 0.8, alpha: 0, duration: 1 + i * 0.2, repeat: -1, delay: i * 0.3, ease: "power1.out" });
        }
        break;
      }
      case UpgradeType.SPELL_BLESSING_OF_LIGHT: {
        // Soft golden glow pulsing down
        const glow = new Graphics().circle(0, 0, S * 0.5).fill({ color: 0xffee88, alpha: 0.25 });
        iconC.addChild(glow);
        gsap.to(glow, { scale: 1.4, alpha: 0.08, duration: 1, yoyo: true, repeat: -1, ease: "sine.inOut" });
        // Downward sparkles
        for (let i = 0; i < 3; i++) {
          const sp = new Graphics().circle(0, 0, 1).fill({ color: 0xffffcc, alpha: 0.8 });
          sp.position.set((i - 1) * S * 0.35, -S * 0.6);
          iconC.addChild(sp);
          gsap.to(sp, { y: S * 0.4, alpha: 0, duration: 0.9, repeat: -1, delay: i * 0.25, ease: "power1.out" });
        }
        break;
      }
      case UpgradeType.SPELL_PURIFYING_FLAME: {
        // White-gold fire
        const f1 = new Graphics().circle(0, S * 0.1, S * 0.4).fill({ color: 0xffee88, alpha: 0.5 });
        const f2 = new Graphics().circle(0, -S * 0.1, S * 0.25).fill({ color: 0xffffff, alpha: 0.5 });
        iconC.addChild(f1, f2);
        gsap.to(f1, { scaleX: 1.2, scaleY: 0.85, duration: 0.3, yoyo: true, repeat: -1, ease: "sine.inOut" });
        gsap.to(f2, { scaleX: 0.85, scaleY: 1.2, duration: 0.35, yoyo: true, repeat: -1, ease: "sine.inOut" });
        // Cross overlay
        const cross = new Graphics();
        cross.rect(-0.6, -S * 0.5, 1.2, S).fill({ color: 0xffdd44, alpha: 0.3 });
        cross.rect(-S * 0.35, -0.6, S * 0.7, 1.2).fill({ color: 0xffdd44, alpha: 0.3 });
        iconC.addChild(cross);
        break;
      }
      case UpgradeType.SPELL_RADIANT_NOVA: {
        // Expanding golden ring with sparkles
        const ring = new Graphics().circle(0, 0, S * 0.4).stroke({ color: 0xffdd44, width: 2, alpha: 0.6 });
        iconC.addChild(ring);
        gsap.to(ring, { scale: 1.6, alpha: 0.1, duration: 1.2, repeat: -1, ease: "power1.out" });
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU;
          const sp = new Graphics().circle(0, 0, 1.2).fill({ color: 0xffffaa, alpha: 0.7 });
          sp.position.set(Math.cos(a) * S * 0.5, Math.sin(a) * S * 0.5);
          iconC.addChild(sp);
          gsap.to(sp, { alpha: 0.2, duration: 0.6, yoyo: true, repeat: -1, delay: i * 0.1 });
        }
        break;
      }
      case UpgradeType.SPELL_CELESTIAL_WRATH: {
        // Multiple beams + star
        for (let i = 0; i < 3; i++) {
          const beam = new Graphics().rect(-1.5 + (i - 1) * S * 0.35, -S, 3, S * 1.5).fill({ color: 0xffdd44, alpha: 0.3 });
          iconC.addChild(beam);
          gsap.to(beam, { alpha: 0.08, duration: 0.3, yoyo: true, repeat: -1, delay: i * 0.15 });
        }
        // 8-pointed star
        const star = new Graphics();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * TAU;
          star.moveTo(0, 0).lineTo(Math.cos(a) * S * 0.4, Math.sin(a) * S * 0.4);
        }
        star.stroke({ color: 0xffee88, width: 1, alpha: 0.5 });
        iconC.addChild(star);
        gsap.to(star, { rotation: TAU / 8, duration: 2, repeat: -1, ease: "none" });
        break;
      }

      // ── SHADOW ──────────────────────────────────────────────────────────
      case UpgradeType.SPELL_POISON_CLOUD: {
        // Green toxic clouds
        for (let i = 0; i < 3; i++) {
          const cloud = new Graphics().circle(0, 0, S * (0.3 + i * 0.1)).fill({ color: [0x44aa33, 0x338822, 0x55bb44][i], alpha: 0.25 });
          cloud.position.set((i - 1) * S * 0.25, (Math.random() - 0.5) * S * 0.3);
          iconC.addChild(cloud);
          gsap.to(cloud, { scaleX: 1.3, scaleY: 1.2, alpha: 0.08, x: cloud.position.x + (Math.random() - 0.5) * 4, duration: 1 + i * 0.2, yoyo: true, repeat: -1, ease: "sine.inOut" });
        }
        // Bubbles
        for (let i = 0; i < 2; i++) {
          const b = new Graphics().circle(0, 0, 1.5).stroke({ color: 0x88dd66, width: 0.8, alpha: 0.5 });
          b.position.set((i - 0.5) * S * 0.5, S * 0.3);
          iconC.addChild(b);
          gsap.to(b, { y: -S * 0.5, alpha: 0, scale: 1.5, duration: 0.8, repeat: -1, delay: i * 0.4, ease: "power1.out" });
        }
        break;
      }
      case UpgradeType.SPELL_VOID_RIFT: {
        // Dark portal with swirling arcs
        const core = new Graphics().circle(0, 0, S * 0.3).fill({ color: 0x110022, alpha: 0.8 });
        const arc1 = new Graphics().arc(0, 0, S * 0.55, 0, Math.PI).stroke({ color: 0x9933cc, width: 2, alpha: 0.6 });
        const arc2 = new Graphics().arc(0, 0, S * 0.55, Math.PI, TAU).stroke({ color: 0x6633aa, width: 2, alpha: 0.6 });
        iconC.addChild(core, arc1, arc2);
        gsap.to(arc1, { rotation: TAU, duration: 2, repeat: -1, ease: "none" });
        gsap.to(arc2, { rotation: -TAU, duration: 2, repeat: -1, ease: "none" });
        gsap.to(core, { scale: 1.3, duration: 0.7, yoyo: true, repeat: -1, ease: "sine.inOut" });
        break;
      }
      case UpgradeType.SPELL_SHADOW_BOLT: {
        // Dark bolt with trail
        const trail = new Graphics().moveTo(S * 0.5, S * 0.4).lineTo(-S * 0.15, 0).lineTo(S * 0.6, S * 0.3).closePath().fill({ color: 0x663399, alpha: 0.2 });
        const orb = new Graphics().circle(0, 0, S * 0.35).fill({ color: 0x220033, alpha: 0.8 }).circle(0, 0, S * 0.15).fill({ color: 0x9966cc, alpha: 0.8 });
        iconC.addChild(trail, orb);
        gsap.to(orb, { scale: 1.15, duration: 0.5, yoyo: true, repeat: -1, ease: "sine.inOut" });
        gsap.to(trail, { alpha: 0.08, duration: 0.5, yoyo: true, repeat: -1 });
        break;
      }
      case UpgradeType.SPELL_CURSE_OF_DARKNESS: {
        // Dark fog swirling inward
        for (let i = 0; i < 4; i++) {
          const fog = new Graphics().circle(0, 0, S * 0.35).fill({ color: [0x220033, 0x330044, 0x110022, 0x2a0040][i], alpha: 0.2 });
          const a = (i / 4) * TAU;
          fog.position.set(Math.cos(a) * S * 0.4, Math.sin(a) * S * 0.4);
          iconC.addChild(fog);
          gsap.to(fog, { x: 0, y: 0, scale: 0.5, duration: 1.2, yoyo: true, repeat: -1, delay: i * 0.15, ease: "sine.inOut" });
        }
        break;
      }
      case UpgradeType.SPELL_DEATH_COIL: {
        // Spiraling green/purple coil
        const coilC = new Container();
        iconC.addChild(coilC);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU;
          const r = S * 0.5;
          const dot = new Graphics().circle(0, 0, 1.5 + (i % 2)).fill({ color: [0x44aa44, 0x663399][i % 2], alpha: 0.7 });
          dot.position.set(Math.cos(a) * r, Math.sin(a) * r);
          coilC.addChild(dot);
        }
        gsap.to(coilC, { rotation: TAU, duration: 1.5, repeat: -1, ease: "none" });
        const core = new Graphics().circle(0, 0, S * 0.2).fill({ color: 0xaaffaa, alpha: 0.5 });
        iconC.addChild(core);
        gsap.to(core, { scale: 1.3, duration: 0.5, yoyo: true, repeat: -1 });
        break;
      }
      case UpgradeType.SPELL_SIPHON_SOUL: {
        // Wisps pulled inward
        const center = new Graphics().circle(0, 0, S * 0.2).fill({ color: 0x220033, alpha: 0.7 });
        iconC.addChild(center);
        gsap.to(center, { scale: 1.4, duration: 0.8, yoyo: true, repeat: -1, ease: "sine.inOut" });
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU;
          const wisp = new Graphics().circle(0, 0, 1.5).fill({ color: [0xaa88cc, 0xddbbff][i % 2], alpha: 0.6 });
          wisp.position.set(Math.cos(a) * S * 0.7, Math.sin(a) * S * 0.7);
          iconC.addChild(wisp);
          gsap.to(wisp, { x: 0, y: 0, alpha: 0.1, duration: 1, repeat: -1, delay: i * 0.15, ease: "power2.in" });
        }
        // Boundary ring
        const bound = new Graphics().circle(0, 0, S * 0.7).stroke({ color: 0x663399, width: 1, alpha: 0.3 });
        iconC.addChild(bound);
        break;
      }
      case UpgradeType.SPELL_NETHER_STORM: {
        // Dark vortex with void bolts
        const vortex = new Graphics().circle(0, 0, S * 0.6).stroke({ color: 0x663399, width: 1.5, alpha: 0.4 });
        const inner = new Graphics().circle(0, 0, S * 0.35).stroke({ color: 0x442266, width: 1, alpha: 0.35 });
        iconC.addChild(vortex, inner);
        gsap.to(vortex, { rotation: TAU, duration: 2.5, repeat: -1, ease: "none" });
        gsap.to(inner, { rotation: -TAU, duration: 1.8, repeat: -1, ease: "none" });
        // Void bolt flashes
        for (let i = 0; i < 3; i++) {
          const bolt = new Graphics();
          bolt.moveTo((Math.random() - 0.5) * S, -S * 0.7).lineTo((Math.random() - 0.5) * 3, (Math.random() - 0.5) * S * 0.4);
          bolt.stroke({ color: 0x9966ff, width: 1.5, alpha: 0.6 });
          iconC.addChild(bolt);
          gsap.to(bolt, { alpha: 0.05, duration: 0.1, yoyo: true, repeat: -1, repeatDelay: 0.7 + i * 0.25 });
        }
        break;
      }

      // ── GAP-FILL: FIRE ──────────────────────────────────────────────────
      case UpgradeType.SPELL_FLAME_SPARK: {
        const sparkCore = new Graphics().circle(0, 0, S * 0.3).fill({ color: 0xff6622, alpha: 0.8 });
        const sparkGlow = new Graphics().circle(0, 0, S * 0.5).fill({ color: 0xff4400, alpha: 0.2 });
        iconC.addChild(sparkGlow, sparkCore);
        gsap.to(sparkCore, { scale: 1.3, alpha: 0.5, duration: 0.3, yoyo: true, repeat: -1, ease: "sine.inOut" });
        gsap.to(sparkGlow, { scale: 1.4, alpha: 0.05, duration: 0.4, yoyo: true, repeat: -1, ease: "sine.inOut" });
        for (let i = 0; i < 2; i++) {
          const sp = new Graphics().circle(0, 0, 0.8).fill({ color: 0xffaa44, alpha: 0.7 });
          sp.position.set((Math.random() - 0.5) * S * 0.3, 0);
          iconC.addChild(sp);
          gsap.to(sp, { y: -S * 0.6, alpha: 0, duration: 0.5 + i * 0.2, repeat: -1, delay: i * 0.2 });
        }
        break;
      }
      case UpgradeType.SPELL_PYROCLASM: {
        // Massive volcanic eruption
        const lavaBase = new Graphics().ellipse(0, S * 0.15, S * 0.7, S * 0.25).fill({ color: 0xff2200, alpha: 0.6 });
        const pillar = new Graphics().rect(-S * 0.3, -S * 0.8, S * 0.6, S * 0.9).fill({ color: 0xff4400, alpha: 0.5 });
        const hotTop = new Graphics().circle(0, -S * 0.7, S * 0.25).fill({ color: 0xffffaa, alpha: 0.6 });
        iconC.addChild(lavaBase, pillar, hotTop);
        gsap.to(pillar, { scaleX: 1.2, scaleY: 1.1, duration: 0.3, yoyo: true, repeat: -1 });
        gsap.to(hotTop, { scale: 1.4, alpha: 0.2, duration: 0.4, yoyo: true, repeat: -1 });
        for (let i = 0; i < 5; i++) {
          const ash = new Graphics().circle(0, 0, 1).fill({ color: 0xff6633, alpha: 0.6 });
          ash.position.set((Math.random() - 0.5) * S, 0);
          iconC.addChild(ash);
          gsap.to(ash, { y: -S, x: ash.position.x + (Math.random() - 0.5) * S * 0.5, alpha: 0, duration: 0.6 + i * 0.1, repeat: -1, delay: i * 0.12 });
        }
        break;
      }
      // ── GAP-FILL: ICE ───────────────────────────────────────────────────
      case UpgradeType.SPELL_GLACIAL_CRUSH: {
        // Ice shards crushing inward
        for (let i = 0; i < 5; i++) {
          const angle = (i / 5) * Math.PI * 2;
          const shard = new Graphics().moveTo(0, -S * 0.15).lineTo(S * 0.06, S * 0.15).lineTo(-S * 0.06, S * 0.15).closePath()
            .fill({ color: 0x88ccff, alpha: 0.7 });
          shard.position.set(Math.cos(angle) * S * 0.5, Math.sin(angle) * S * 0.5);
          shard.rotation = angle + Math.PI;
          iconC.addChild(shard);
          gsap.to(shard, { x: Math.cos(angle) * S * 0.1, y: Math.sin(angle) * S * 0.1, duration: 0.6, yoyo: true, repeat: -1, ease: "power2.in", delay: i * 0.05 });
        }
        const iceCenter = new Graphics().circle(0, 0, S * 0.15).fill({ color: 0xcceeFF, alpha: 0.5 });
        iconC.addChild(iceCenter);
        gsap.to(iceCenter, { scale: 1.3, alpha: 0.2, duration: 0.6, yoyo: true, repeat: -1 });
        break;
      }
      case UpgradeType.SPELL_ABSOLUTE_ZERO: {
        // Crystal lattice freezing everything
        const frostField = new Graphics().circle(0, 0, S * 0.7).fill({ color: 0x66bbff, alpha: 0.12 });
        iconC.addChild(frostField);
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2;
          const crystal = new Graphics().moveTo(0, -S * 0.35).lineTo(S * 0.04, 0).lineTo(0, S * 0.05).lineTo(-S * 0.04, 0).closePath()
            .fill({ color: 0xcceeFF, alpha: 0.6 });
          crystal.rotation = angle;
          iconC.addChild(crystal);
          gsap.to(crystal, { alpha: 0.2, duration: 0.8, yoyo: true, repeat: -1, delay: i * 0.12 });
        }
        const frozenCore = new Graphics().circle(0, 0, S * 0.12).fill({ color: 0xffffff, alpha: 0.8 });
        iconC.addChild(frozenCore);
        gsap.to(frostField, { scale: 1.2, alpha: 0.04, duration: 1, yoyo: true, repeat: -1 });
        break;
      }
      // ── GAP-FILL: LIGHTNING ─────────────────────────────────────────────
      case UpgradeType.SPELL_SPARK: {
        const sparkFlash = new Graphics().circle(0, 0, S * 0.2).fill({ color: 0xffff66, alpha: 0.8 });
        const sparkBolt = new Graphics().moveTo(0, -S * 0.4).lineTo(S * 0.08, -S * 0.1).lineTo(-S * 0.05, -S * 0.05).lineTo(0, S * 0.3)
          .stroke({ color: 0xffff44, width: 1.5 });
        iconC.addChild(sparkBolt, sparkFlash);
        gsap.to(sparkFlash, { alpha: 0.2, scale: 1.3, duration: 0.2, yoyo: true, repeat: -1 });
        gsap.to(sparkBolt, { alpha: 0.3, duration: 0.15, yoyo: true, repeat: -1 });
        break;
      }
      case UpgradeType.SPELL_THUNDERSTORM: {
        // Multiple bolts
        const stormCloud = new Graphics().ellipse(0, -S * 0.4, S * 0.6, S * 0.2).fill({ color: 0x334466, alpha: 0.6 });
        iconC.addChild(stormCloud);
        for (let i = 0; i < 3; i++) {
          const bx = (i - 1) * S * 0.35;
          const bolt = new Graphics().moveTo(bx, -S * 0.25).lineTo(bx + S * 0.05, 0).lineTo(bx - S * 0.03, S * 0.05).lineTo(bx + S * 0.02, S * 0.35)
            .stroke({ color: 0xffff44, width: 1.5, alpha: 0.8 });
          iconC.addChild(bolt);
          gsap.to(bolt, { alpha: 0.1, duration: 0.15, yoyo: true, repeat: -1, repeatDelay: 0.5 + i * 0.3 });
        }
        gsap.to(stormCloud, { x: 2, duration: 1.5, yoyo: true, repeat: -1, ease: "sine.inOut" });
        break;
      }
      case UpgradeType.SPELL_BALL_LIGHTNING: {
        // Orbiting plasma sphere
        const plasma = new Graphics().circle(0, 0, S * 0.35).fill({ color: 0xaaddff, alpha: 0.4 });
        const plasmaCore = new Graphics().circle(0, 0, S * 0.18).fill({ color: 0xffffff, alpha: 0.7 });
        iconC.addChild(plasma, plasmaCore);
        gsap.to(plasma, { scale: 1.2, alpha: 0.15, duration: 0.4, yoyo: true, repeat: -1 });
        for (let i = 0; i < 4; i++) {
          const arc = new Graphics();
          const a = (i / 4) * Math.PI * 2;
          arc.moveTo(Math.cos(a) * S * 0.3, Math.sin(a) * S * 0.3).lineTo(Math.cos(a + 0.5) * S * 0.5, Math.sin(a + 0.5) * S * 0.5);
          arc.stroke({ color: 0xffff66, width: 1, alpha: 0.7 });
          iconC.addChild(arc);
          gsap.to(arc, { alpha: 0.1, duration: 0.2, yoyo: true, repeat: -1, repeatDelay: 0.4 + i * 0.15 });
        }
        break;
      }
      case UpgradeType.SPELL_MJOLNIR_STRIKE: {
        // Massive hammer-bolt from sky
        const hammerHead = new Graphics().rect(-S * 0.2, -S * 0.15, S * 0.4, S * 0.3).fill({ color: 0xcccccc, alpha: 0.8 });
        const hammerHandle = new Graphics().rect(-S * 0.04, S * 0.15, S * 0.08, S * 0.4).fill({ color: 0x886644 });
        const mjolGlow = new Graphics().circle(0, 0, S * 0.6).fill({ color: 0xffff44, alpha: 0.1 });
        iconC.addChild(mjolGlow, hammerHandle, hammerHead);
        // Lightning arcs from hammer
        for (let i = 0; i < 3; i++) {
          const arc = new Graphics().moveTo((Math.random() - 0.5) * S * 0.3, -S * 0.1)
            .lineTo((Math.random() - 0.5) * S * 0.6, (Math.random() - 0.5) * S * 0.4);
          arc.stroke({ color: 0xffff88, width: 1, alpha: 0.6 });
          iconC.addChild(arc);
          gsap.to(arc, { alpha: 0.05, duration: 0.1, yoyo: true, repeat: -1, repeatDelay: 0.4 + i * 0.2 });
        }
        gsap.to(mjolGlow, { scale: 1.3, alpha: 0.03, duration: 0.5, yoyo: true, repeat: -1 });
        gsap.to(hammerHead, { y: -2, duration: 0.6, yoyo: true, repeat: -1, ease: "sine.inOut" });
        break;
      }
      // ── GAP-FILL: EARTH ─────────────────────────────────────────────────
      case UpgradeType.SPELL_STONE_SHARD: {
        const rock = new Graphics().moveTo(0, -S * 0.3).lineTo(S * 0.2, -S * 0.05).lineTo(S * 0.1, S * 0.25)
          .lineTo(-S * 0.15, S * 0.2).lineTo(-S * 0.2, -S * 0.1).closePath().fill({ color: 0x887766, alpha: 0.9 });
        const dust = new Graphics().circle(0, S * 0.15, S * 0.3).fill({ color: 0xaa9977, alpha: 0.15 });
        iconC.addChild(dust, rock);
        gsap.to(rock, { y: -2, rotation: 0.1, duration: 0.5, yoyo: true, repeat: -1, ease: "sine.inOut" });
        gsap.to(dust, { scale: 1.3, alpha: 0.05, duration: 0.6, yoyo: true, repeat: -1 });
        break;
      }
      case UpgradeType.SPELL_LANDSLIDE: {
        // Tumbling boulders
        for (let i = 0; i < 4; i++) {
          const boulder = new Graphics().circle(0, 0, S * 0.12 + i * 1.5).fill({ color: 0x776655 - i * 0x111111, alpha: 0.8 });
          boulder.position.set(-S * 0.4 + i * S * 0.25, -S * 0.2 + i * S * 0.15);
          iconC.addChild(boulder);
          gsap.to(boulder, { x: boulder.position.x + S * 0.15, y: boulder.position.y + 2, duration: 0.4 + i * 0.1, yoyo: true, repeat: -1, ease: "sine.inOut" });
        }
        const dirtWave = new Graphics().ellipse(0, S * 0.2, S * 0.6, S * 0.15).fill({ color: 0x998866, alpha: 0.3 });
        iconC.addChild(dirtWave);
        gsap.to(dirtWave, { scale: 1.1, alpha: 0.1, duration: 0.5, yoyo: true, repeat: -1 });
        break;
      }
      case UpgradeType.SPELL_TECTONIC_RUIN: {
        // Ground splitting
        const crack1 = new Graphics().moveTo(0, -S * 0.6).lineTo(S * 0.05, -S * 0.2).lineTo(-S * 0.03, 0).lineTo(S * 0.08, S * 0.4).lineTo(0, S * 0.6)
          .stroke({ color: 0xff4400, width: 2, alpha: 0.7 });
        const crack2 = new Graphics().moveTo(-S * 0.3, -S * 0.3).lineTo(-S * 0.1, 0).lineTo(-S * 0.25, S * 0.3)
          .stroke({ color: 0xff6622, width: 1.5, alpha: 0.5 });
        const earthGlow = new Graphics().circle(0, 0, S * 0.6).fill({ color: 0xff4400, alpha: 0.08 });
        iconC.addChild(earthGlow, crack1, crack2);
        gsap.to(crack1, { alpha: 0.3, duration: 0.4, yoyo: true, repeat: -1 });
        gsap.to(earthGlow, { scale: 1.3, alpha: 0.02, duration: 0.6, yoyo: true, repeat: -1 });
        for (let i = 0; i < 3; i++) {
          const debris = new Graphics().rect(0, 0, 2, 2).fill({ color: 0x887766 });
          debris.position.set((Math.random() - 0.5) * S * 0.4, S * 0.1);
          iconC.addChild(debris);
          gsap.to(debris, { y: -S * 0.6, alpha: 0, duration: 0.5, repeat: -1, delay: i * 0.15 });
        }
        break;
      }
      // ── GAP-FILL: NATURE ────────────────────────────────────────────────
      case UpgradeType.SPELL_THORN_BARRAGE: {
        for (let i = 0; i < 5; i++) {
          const thorn = new Graphics().moveTo(0, -S * 0.2).lineTo(S * 0.03, S * 0.05).lineTo(-S * 0.03, S * 0.05).closePath()
            .fill({ color: 0x44aa33, alpha: 0.8 });
          thorn.position.set((Math.random() - 0.5) * S * 0.8, -S * 0.5);
          iconC.addChild(thorn);
          gsap.to(thorn, { y: S * 0.5, alpha: 0.2, duration: 0.4 + i * 0.08, repeat: -1, delay: i * 0.1 });
        }
        break;
      }
      case UpgradeType.SPELL_NATURES_WRATH: {
        // Roots and vines
        for (let i = 0; i < 4; i++) {
          const angle = (i / 4) * Math.PI * 2;
          const vine = new Graphics().moveTo(0, 0).quadraticCurveTo(Math.cos(angle) * S * 0.3, Math.sin(angle) * S * 0.3,
            Math.cos(angle) * S * 0.55, Math.sin(angle) * S * 0.55);
          vine.stroke({ color: 0x338822, width: 1.5, alpha: 0.7 });
          iconC.addChild(vine);
          gsap.to(vine, { scale: 1.15, alpha: 0.3, duration: 0.5 + i * 0.1, yoyo: true, repeat: -1, ease: "sine.inOut" });
        }
        const leafGlow = new Graphics().circle(0, 0, S * 0.15).fill({ color: 0x66cc44, alpha: 0.4 });
        iconC.addChild(leafGlow);
        gsap.to(leafGlow, { scale: 1.3, alpha: 0.1, duration: 0.6, yoyo: true, repeat: -1 });
        break;
      }
      case UpgradeType.SPELL_PRIMAL_STORM: {
        // Chaotic nature storm
        const windRing = new Graphics().circle(0, 0, S * 0.55).stroke({ color: 0x44cc44, width: 1.5, alpha: 0.3 });
        iconC.addChild(windRing);
        gsap.to(windRing, { rotation: Math.PI * 2, duration: 2, repeat: -1, ease: "none" });
        for (let i = 0; i < 4; i++) {
          const leaf = new Graphics().ellipse(0, 0, 2, 1).fill({ color: 0x44aa33, alpha: 0.7 });
          const a = (i / 4) * Math.PI * 2;
          leaf.position.set(Math.cos(a) * S * 0.35, Math.sin(a) * S * 0.35);
          iconC.addChild(leaf);
          gsap.to(leaf, { rotation: Math.PI * 4, duration: 1.5, repeat: -1, ease: "none" });
          gsap.to(leaf, { x: Math.cos(a + Math.PI) * S * 0.35, y: Math.sin(a + Math.PI) * S * 0.35, duration: 1.5, repeat: -1, ease: "none" });
        }
        const centerFlash = new Graphics().circle(0, 0, S * 0.12).fill({ color: 0xaaff66, alpha: 0.5 });
        iconC.addChild(centerFlash);
        gsap.to(centerFlash, { scale: 1.5, alpha: 0.1, duration: 0.5, yoyo: true, repeat: -1 });
        break;
      }
      // ── GAP-FILL: ARCANE ────────────────────────────────────────────────
      case UpgradeType.SPELL_ARCANE_CATACLYSM: {
        const arcRing1 = new Graphics().circle(0, 0, S * 0.5).stroke({ color: 0x9966ff, width: 2, alpha: 0.5 });
        const arcRing2 = new Graphics().circle(0, 0, S * 0.35).stroke({ color: 0xbb88ff, width: 1.5, alpha: 0.4 });
        const arcCore = new Graphics().circle(0, 0, S * 0.15).fill({ color: 0xffffff, alpha: 0.7 });
        iconC.addChild(arcRing1, arcRing2, arcCore);
        gsap.to(arcRing1, { scale: 1.3, alpha: 0.1, duration: 0.5, yoyo: true, repeat: -1 });
        gsap.to(arcRing2, { rotation: Math.PI * 2, duration: 2, repeat: -1, ease: "none" });
        gsap.to(arcCore, { scale: 1.5, alpha: 0.3, duration: 0.3, yoyo: true, repeat: -1 });
        for (let i = 0; i < 4; i++) {
          const bolt = new Graphics().moveTo((Math.random() - 0.5) * S, -S * 0.6).lineTo((Math.random() - 0.5) * S * 0.3, (Math.random() - 0.5) * S * 0.3);
          bolt.stroke({ color: 0xaa77ff, width: 1, alpha: 0.5 });
          iconC.addChild(bolt);
          gsap.to(bolt, { alpha: 0.05, duration: 0.1, yoyo: true, repeat: -1, repeatDelay: 0.5 + i * 0.2 });
        }
        break;
      }
      // ── GAP-FILL: HOLY ──────────────────────────────────────────────────
      case UpgradeType.SPELL_DIVINE_MIRACLE: {
        const miracleGlow = new Graphics().circle(0, 0, S * 0.7).fill({ color: 0xffee88, alpha: 0.1 });
        const miracleBeam = new Graphics().rect(-S * 0.12, -S * 0.7, S * 0.24, S * 1.4).fill({ color: 0xffdd44, alpha: 0.25 });
        const miracleCore = new Graphics().circle(0, 0, S * 0.2).fill({ color: 0xffffff, alpha: 0.7 });
        iconC.addChild(miracleGlow, miracleBeam, miracleCore);
        gsap.to(miracleGlow, { scale: 1.3, alpha: 0.03, duration: 0.7, yoyo: true, repeat: -1 });
        gsap.to(miracleBeam, { alpha: 0.08, duration: 0.5, yoyo: true, repeat: -1 });
        gsap.to(miracleCore, { scale: 1.3, alpha: 0.4, duration: 0.6, yoyo: true, repeat: -1, ease: "sine.inOut" });
        for (let i = 0; i < 5; i++) {
          const sparkle = new Graphics().circle(0, 0, 0.8).fill({ color: 0xffffcc, alpha: 0.8 });
          sparkle.position.set((Math.random() - 0.5) * S, (Math.random() - 0.5) * S);
          iconC.addChild(sparkle);
          gsap.to(sparkle, { y: sparkle.position.y - S * 0.3, alpha: 0, duration: 0.7, repeat: -1, delay: i * 0.15 });
        }
        break;
      }
      // ── GAP-FILL: SHADOW ────────────────────────────────────────────────
      case UpgradeType.SPELL_SHADOW_PLAGUE: {
        const plagueCloud = new Graphics().circle(0, 0, S * 0.5).fill({ color: 0x442266, alpha: 0.25 });
        iconC.addChild(plagueCloud);
        for (let i = 0; i < 5; i++) {
          const tendril = new Graphics();
          const angle = (i / 5) * Math.PI * 2;
          tendril.moveTo(0, 0).quadraticCurveTo(Math.cos(angle) * S * 0.3, Math.sin(angle) * S * 0.3,
            Math.cos(angle) * S * 0.6, Math.sin(angle) * S * 0.6);
          tendril.stroke({ color: 0x663399, width: 1.5, alpha: 0.5 });
          iconC.addChild(tendril);
          gsap.to(tendril, { alpha: 0.1, scale: 1.1, duration: 0.6 + i * 0.1, yoyo: true, repeat: -1, ease: "sine.inOut" });
        }
        gsap.to(plagueCloud, { scale: 1.2, alpha: 0.1, duration: 0.8, yoyo: true, repeat: -1 });
        break;
      }
      case UpgradeType.SPELL_OBLIVION: {
        // Darkness vortex
        const voidBg = new Graphics().circle(0, 0, S * 0.65).fill({ color: 0x110022, alpha: 0.6 });
        const vortex1 = new Graphics().circle(0, 0, S * 0.45).stroke({ color: 0x6622aa, width: 1.5, alpha: 0.4 });
        const vortex2 = new Graphics().circle(0, 0, S * 0.3).stroke({ color: 0x8833cc, width: 1, alpha: 0.3 });
        const darkCore = new Graphics().circle(0, 0, S * 0.12).fill({ color: 0x000000, alpha: 0.9 });
        iconC.addChild(voidBg, vortex1, vortex2, darkCore);
        gsap.to(vortex1, { rotation: Math.PI * 2, duration: 2, repeat: -1, ease: "none" });
        gsap.to(vortex2, { rotation: -Math.PI * 2, duration: 1.5, repeat: -1, ease: "none" });
        gsap.to(voidBg, { scale: 1.15, alpha: 0.3, duration: 0.8, yoyo: true, repeat: -1 });
        break;
      }
      // ── GAP-FILL: POISON ────────────────────────────────────────────────
      case UpgradeType.SPELL_VENOMOUS_SPRAY: {
        for (let i = 0; i < 5; i++) {
          const drop = new Graphics().circle(0, 0, S * 0.06 + Math.random() * 2).fill({ color: 0x66cc44, alpha: 0.7 });
          drop.position.set((Math.random() - 0.5) * S * 0.3, -S * 0.1);
          iconC.addChild(drop);
          gsap.to(drop, { x: (Math.random() - 0.5) * S * 0.8, y: S * 0.4, alpha: 0.1, duration: 0.5 + i * 0.08, repeat: -1, delay: i * 0.08 });
        }
        break;
      }
      case UpgradeType.SPELL_PLAGUE_SWARM: {
        for (let i = 0; i < 7; i++) {
          const bug = new Graphics().circle(0, 0, 1.2).fill({ color: 0x334411, alpha: 0.8 });
          const bx = (Math.random() - 0.5) * S;
          const by = (Math.random() - 0.5) * S * 0.6;
          bug.position.set(bx, by);
          iconC.addChild(bug);
          gsap.to(bug, { x: bx + (Math.random() - 0.5) * S * 0.4, y: by + (Math.random() - 0.5) * S * 0.3, duration: 0.3 + Math.random() * 0.3, yoyo: true, repeat: -1 });
        }
        const haze = new Graphics().circle(0, 0, S * 0.45).fill({ color: 0x448822, alpha: 0.1 });
        iconC.addChild(haze);
        gsap.to(haze, { scale: 1.2, alpha: 0.03, duration: 0.7, yoyo: true, repeat: -1 });
        break;
      }
      case UpgradeType.SPELL_TOXIC_MIASMA: {
        const fog1 = new Graphics().ellipse(-S * 0.15, 0, S * 0.35, S * 0.25).fill({ color: 0x44aa22, alpha: 0.2 });
        const fog2 = new Graphics().ellipse(S * 0.15, -S * 0.1, S * 0.3, S * 0.3).fill({ color: 0x338811, alpha: 0.15 });
        iconC.addChild(fog1, fog2);
        gsap.to(fog1, { x: -S * 0.15 + 3, scaleX: 1.2, scaleY: 1.1, alpha: 0.08, duration: 0.9, yoyo: true, repeat: -1, ease: "sine.inOut" });
        gsap.to(fog2, { x: S * 0.15 - 3, scaleX: 1.1, scaleY: 1.2, alpha: 0.06, duration: 1.1, yoyo: true, repeat: -1, ease: "sine.inOut" });
        for (let i = 0; i < 3; i++) {
          const bubble = new Graphics().circle(0, 0, 1.5).stroke({ color: 0x66cc33, width: 0.8, alpha: 0.5 });
          bubble.position.set((Math.random() - 0.5) * S * 0.4, S * 0.15);
          iconC.addChild(bubble);
          gsap.to(bubble, { y: -S * 0.3, alpha: 0, scale: 1.5, duration: 0.8, repeat: -1, delay: i * 0.3 });
        }
        break;
      }
      case UpgradeType.SPELL_PANDEMIC: {
        const toxicWave = new Graphics().circle(0, 0, S * 0.5).fill({ color: 0x44aa22, alpha: 0.15 });
        const toxicWave2 = new Graphics().circle(0, 0, S * 0.35).fill({ color: 0x338811, alpha: 0.2 });
        const toxicCore = new Graphics().circle(0, 0, S * 0.15).fill({ color: 0x66ff33, alpha: 0.5 });
        iconC.addChild(toxicWave, toxicWave2, toxicCore);
        gsap.to(toxicWave, { scale: 1.4, alpha: 0.03, duration: 0.6, yoyo: true, repeat: -1 });
        gsap.to(toxicWave2, { scale: 1.3, alpha: 0.05, duration: 0.5, yoyo: true, repeat: -1 });
        gsap.to(toxicCore, { scale: 1.5, alpha: 0.2, duration: 0.4, yoyo: true, repeat: -1 });
        for (let i = 0; i < 4; i++) {
          const spl = new Graphics().circle(0, 0, 1).fill({ color: 0x88ff44, alpha: 0.6 });
          spl.position.set((Math.random() - 0.5) * S * 0.5, 0);
          iconC.addChild(spl);
          gsap.to(spl, { y: -S * 0.7, alpha: 0, duration: 0.5 + i * 0.1, repeat: -1, delay: i * 0.12 });
        }
        break;
      }
      // ── GAP-FILL: VOID ──────────────────────────────────────────────────
      case UpgradeType.SPELL_VOID_SPARK: {
        const vsPop = new Graphics().circle(0, 0, S * 0.25).fill({ color: 0x6622aa, alpha: 0.6 });
        const vsCore = new Graphics().circle(0, 0, S * 0.1).fill({ color: 0x220044, alpha: 0.9 });
        iconC.addChild(vsPop, vsCore);
        gsap.to(vsPop, { scale: 1.4, alpha: 0.1, duration: 0.3, yoyo: true, repeat: -1 });
        gsap.to(vsCore, { scale: 1.2, duration: 0.25, yoyo: true, repeat: -1 });
        break;
      }
      case UpgradeType.SPELL_DIMENSIONAL_TEAR: {
        const tear = new Graphics().moveTo(0, -S * 0.5).quadraticCurveTo(S * 0.15, 0, 0, S * 0.5);
        tear.stroke({ color: 0xaa44ff, width: 2, alpha: 0.7 });
        const tearGlow = new Graphics().moveTo(0, -S * 0.5).quadraticCurveTo(S * 0.15, 0, 0, S * 0.5);
        tearGlow.stroke({ color: 0xcc66ff, width: 4, alpha: 0.15 });
        iconC.addChild(tearGlow, tear);
        gsap.to(tear, { alpha: 0.3, duration: 0.4, yoyo: true, repeat: -1 });
        gsap.to(tearGlow, { scaleX: 1.2, scaleY: 1.1, alpha: 0.05, duration: 0.6, yoyo: true, repeat: -1 });
        // Distortion particles
        for (let i = 0; i < 3; i++) {
          const p = new Graphics().circle(0, 0, 0.8).fill({ color: 0xbb66ff, alpha: 0.6 });
          p.position.set(S * 0.1, (i - 1) * S * 0.25);
          iconC.addChild(p);
          gsap.to(p, { x: -S * 0.1, alpha: 0.1, duration: 0.5, yoyo: true, repeat: -1, delay: i * 0.15 });
        }
        break;
      }
      case UpgradeType.SPELL_SINGULARITY: {
        // Black hole pulling inward
        const eventHorizon = new Graphics().circle(0, 0, S * 0.55).fill({ color: 0x110022, alpha: 0.5 });
        const blackHole = new Graphics().circle(0, 0, S * 0.18).fill({ color: 0x000000, alpha: 0.95 });
        const accDisk = new Graphics().circle(0, 0, S * 0.4).stroke({ color: 0xaa44ff, width: 1.5, alpha: 0.4 });
        iconC.addChild(eventHorizon, accDisk, blackHole);
        gsap.to(accDisk, { rotation: Math.PI * 2, duration: 1.5, repeat: -1, ease: "none" });
        gsap.to(eventHorizon, { scale: 0.85, alpha: 0.7, duration: 0.6, yoyo: true, repeat: -1, ease: "sine.inOut" });
        // Particles being sucked in
        for (let i = 0; i < 5; i++) {
          const angle = (i / 5) * Math.PI * 2;
          const part = new Graphics().circle(0, 0, 0.8).fill({ color: 0xcc88ff, alpha: 0.6 });
          part.position.set(Math.cos(angle) * S * 0.6, Math.sin(angle) * S * 0.6);
          iconC.addChild(part);
          gsap.to(part, { x: 0, y: 0, alpha: 0, duration: 0.8, repeat: -1, delay: i * 0.15, ease: "power2.in" });
        }
        break;
      }
      // ── GAP-FILL: DEATH ─────────────────────────────────────────────────
      case UpgradeType.SPELL_NECROTIC_TOUCH: {
        const necBurst = new Graphics().circle(0, 0, S * 0.3).fill({ color: 0x44aa66, alpha: 0.4 });
        const necCore = new Graphics().circle(0, 0, S * 0.12).fill({ color: 0x226633, alpha: 0.8 });
        iconC.addChild(necBurst, necCore);
        gsap.to(necBurst, { scale: 1.4, alpha: 0.08, duration: 0.35, yoyo: true, repeat: -1 });
        gsap.to(necCore, { scale: 1.2, duration: 0.3, yoyo: true, repeat: -1 });
        break;
      }
      case UpgradeType.SPELL_SOUL_REND: {
        // Ghostly wisps being torn
        for (let i = 0; i < 4; i++) {
          const wisp = new Graphics().ellipse(0, 0, S * 0.08, S * 0.2).fill({ color: 0x88ffaa, alpha: 0.4 });
          const angle = (i / 4) * Math.PI * 2;
          wisp.position.set(Math.cos(angle) * S * 0.25, Math.sin(angle) * S * 0.25);
          wisp.rotation = angle;
          iconC.addChild(wisp);
          gsap.to(wisp, { x: Math.cos(angle) * S * 0.5, y: Math.sin(angle) * S * 0.5, alpha: 0, duration: 0.7, yoyo: true, repeat: -1, delay: i * 0.12 });
        }
        const rendCore = new Graphics().circle(0, 0, S * 0.15).fill({ color: 0x336644, alpha: 0.5 });
        iconC.addChild(rendCore);
        gsap.to(rendCore, { scale: 1.3, alpha: 0.2, duration: 0.5, yoyo: true, repeat: -1 });
        break;
      }
      case UpgradeType.SPELL_APOCALYPSE: {
        // Death wave
        const deathField = new Graphics().circle(0, 0, S * 0.65).fill({ color: 0x112211, alpha: 0.4 });
        const deathRing = new Graphics().circle(0, 0, S * 0.5).stroke({ color: 0x44aa66, width: 2, alpha: 0.4 });
        const skullG = new Graphics().circle(0, -S * 0.05, S * 0.15).fill({ color: 0xddddcc, alpha: 0.6 });
        // Skull eyes
        skullG.circle(-S * 0.05, -S * 0.08, 1.5).fill({ color: 0x44ff66, alpha: 0.8 });
        skullG.circle(S * 0.05, -S * 0.08, 1.5).fill({ color: 0x44ff66, alpha: 0.8 });
        iconC.addChild(deathField, deathRing, skullG);
        gsap.to(deathField, { scale: 1.2, alpha: 0.15, duration: 0.7, yoyo: true, repeat: -1 });
        gsap.to(deathRing, { scale: 1.3, alpha: 0.1, duration: 0.5, yoyo: true, repeat: -1 });
        gsap.to(skullG, { y: -S * 0.05 - 1, duration: 0.8, yoyo: true, repeat: -1, ease: "sine.inOut" });
        break;
      }

      // ── CONJURATION ──────────────────────────────────────────────────────
      case UpgradeType.SUMMON_BAT_SWARM: {
        // Cluster of small dark bat silhouettes fluttering
        for (let i = 0; i < 5; i++) {
          const bat = new Graphics();
          const bx = (Math.random() - 0.5) * S * 1.2;
          const by = (Math.random() - 0.5) * S * 0.8;
          // Bat wings: two triangles
          bat.moveTo(-3, 0).lineTo(-1, -2).lineTo(0, 0).closePath().fill({ color: 0x332244, alpha: 0.9 });
          bat.moveTo(3, 0).lineTo(1, -2).lineTo(0, 0).closePath().fill({ color: 0x332244, alpha: 0.9 });
          bat.circle(0, -0.5, 1).fill({ color: 0x221133 });
          bat.position.set(bx, by);
          iconC.addChild(bat);
          gsap.to(bat, { y: by - 3, x: bx + (Math.random() - 0.5) * 4, duration: 0.4 + Math.random() * 0.3, yoyo: true, repeat: -1, ease: "sine.inOut" });
          gsap.to(bat, { scaleX: 1, scaleY: 0.6, duration: 0.15 + Math.random() * 0.1, yoyo: true, repeat: -1 });
        }
        break;
      }
      case UpgradeType.SUMMON_SPIDER_BROOD: {
        // Spider body with legs
        const body = new Graphics().ellipse(0, 0, S * 0.25, S * 0.2).fill({ color: 0x443322, alpha: 0.9 });
        const head = new Graphics().circle(0, -S * 0.25, S * 0.12).fill({ color: 0x332211 });
        // Eyes
        head.circle(-1.5, -S * 0.27, 0.8).fill({ color: 0xff2222, alpha: 0.8 });
        head.circle(1.5, -S * 0.27, 0.8).fill({ color: 0xff2222, alpha: 0.8 });
        iconC.addChild(body, head);
        // Legs
        for (let side = -1; side <= 1; side += 2) {
          for (let j = 0; j < 4; j++) {
            const leg = new Graphics();
            const angle = (-0.4 + j * 0.25) * Math.PI;
            leg.moveTo(0, 0).lineTo(side * S * 0.45, Math.sin(angle) * S * 0.3);
            leg.stroke({ color: 0x443322, width: 1 });
            iconC.addChild(leg);
          }
        }
        gsap.to(body, { y: -1, duration: 0.5, yoyo: true, repeat: -1, ease: "sine.inOut" });
        gsap.to(head, { y: -S * 0.25 - 1, duration: 0.5, yoyo: true, repeat: -1, ease: "sine.inOut" });
        break;
      }
      case UpgradeType.SUMMON_PIXIE: {
        // Glowing fairy with sparkle wings
        const pixieBody = new Graphics().ellipse(0, 0, S * 0.12, S * 0.25).fill({ color: 0xffaaff, alpha: 0.9 });
        const glow = new Graphics().circle(0, 0, S * 0.5).fill({ color: 0xff88ff, alpha: 0.15 });
        iconC.addChild(glow, pixieBody);
        // Wings
        for (let side = -1; side <= 1; side += 2) {
          const wing = new Graphics().ellipse(side * S * 0.25, -S * 0.05, S * 0.18, S * 0.3).fill({ color: 0xffccff, alpha: 0.4 });
          iconC.addChild(wing);
          gsap.to(wing, { scaleX: 0.7, scaleY: 1, duration: 0.2, yoyo: true, repeat: -1 });
        }
        // Sparkles
        for (let i = 0; i < 4; i++) {
          const spark = new Graphics().circle(0, 0, 0.8).fill({ color: 0xffffff, alpha: 0.8 });
          spark.position.set((Math.random() - 0.5) * S, (Math.random() - 0.5) * S);
          iconC.addChild(spark);
          gsap.to(spark, { alpha: 0, duration: 0.5, yoyo: true, repeat: -1, delay: i * 0.15 });
        }
        gsap.to(pixieBody, { y: -2, duration: 0.6, yoyo: true, repeat: -1, ease: "sine.inOut" });
        gsap.to(glow, { scale: 1.3, alpha: 0.05, duration: 0.7, yoyo: true, repeat: -1, ease: "sine.inOut" });
        break;
      }
      case UpgradeType.SUMMON_UNICORN: {
        // Horse silhouette with glowing horn
        const bodyU = new Graphics().ellipse(0, S * 0.05, S * 0.4, S * 0.22).fill({ color: 0xeeeeff, alpha: 0.9 });
        const headU = new Graphics().ellipse(S * 0.3, -S * 0.15, S * 0.12, S * 0.1).fill({ color: 0xeeeeff, alpha: 0.9 });
        // Horn
        const horn = new Graphics().moveTo(S * 0.35, -S * 0.25).lineTo(S * 0.4, -S * 0.55).lineTo(S * 0.45, -S * 0.25).closePath().fill({ color: 0xffdd88, alpha: 0.9 });
        const hornGlow = new Graphics().circle(S * 0.4, -S * 0.5, S * 0.12).fill({ color: 0xffee66, alpha: 0.3 });
        // Legs
        const legs = new Graphics();
        legs.rect(-S * 0.2, S * 0.2, 2, S * 0.3).fill({ color: 0xddddee });
        legs.rect(S * 0.1, S * 0.2, 2, S * 0.3).fill({ color: 0xddddee });
        iconC.addChild(legs, bodyU, headU, horn, hornGlow);
        gsap.to(hornGlow, { scale: 1.5, alpha: 0.1, duration: 0.6, yoyo: true, repeat: -1, ease: "sine.inOut" });
        gsap.to(bodyU, { y: S * 0.05 - 1, duration: 0.7, yoyo: true, repeat: -1, ease: "sine.inOut" });
        break;
      }
      case UpgradeType.SUMMON_TROLL: {
        // Hulking troll figure
        const trollBody = new Graphics().ellipse(0, 0, S * 0.3, S * 0.4).fill({ color: 0x556633, alpha: 0.9 });
        const trollHead = new Graphics().circle(0, -S * 0.45, S * 0.18).fill({ color: 0x668844 });
        // Eyes
        trollHead.circle(-S * 0.07, -S * 0.47, 1.2).fill({ color: 0xffff44, alpha: 0.8 });
        trollHead.circle(S * 0.07, -S * 0.47, 1.2).fill({ color: 0xffff44, alpha: 0.8 });
        // Arms
        const armL = new Graphics().moveTo(-S * 0.3, -S * 0.1).lineTo(-S * 0.5, S * 0.25).stroke({ color: 0x556633, width: 3 });
        const armR = new Graphics().moveTo(S * 0.3, -S * 0.1).lineTo(S * 0.5, S * 0.25).stroke({ color: 0x556633, width: 3 });
        iconC.addChild(trollBody, trollHead, armL, armR);
        gsap.to(trollBody, { scaleX: 1.05, scaleY: 0.95, duration: 0.8, yoyo: true, repeat: -1, ease: "sine.inOut" });
        gsap.to(trollHead, { y: -S * 0.45 - 1, duration: 0.8, yoyo: true, repeat: -1, ease: "sine.inOut" });
        break;
      }
      case UpgradeType.SUMMON_FIRE_ELEMENTAL: {
        // Flame creature - living fire
        const fireBase = new Graphics().ellipse(0, S * 0.1, S * 0.3, S * 0.2).fill({ color: 0xff4400, alpha: 0.7 });
        const fireCore = new Graphics().ellipse(0, -S * 0.1, S * 0.22, S * 0.35).fill({ color: 0xff6622, alpha: 0.8 });
        const fireTop = new Graphics().moveTo(0, -S * 0.6).lineTo(-S * 0.15, -S * 0.2).lineTo(S * 0.15, -S * 0.2).closePath().fill({ color: 0xffaa22, alpha: 0.7 });
        const hotCore = new Graphics().circle(0, -S * 0.1, S * 0.1).fill({ color: 0xffffaa, alpha: 0.8 });
        // Eyes
        fireCore.circle(-S * 0.08, -S * 0.15, 1.2).fill({ color: 0xffffff, alpha: 0.9 });
        fireCore.circle(S * 0.08, -S * 0.15, 1.2).fill({ color: 0xffffff, alpha: 0.9 });
        iconC.addChild(fireBase, fireCore, fireTop, hotCore);
        gsap.to(fireTop, { y: -2, scaleX: 1.2, scaleY: 1.3, duration: 0.3, yoyo: true, repeat: -1, ease: "sine.inOut" });
        gsap.to(fireCore, { scaleX: 1.05, scaleY: 1.1, duration: 0.4, yoyo: true, repeat: -1, ease: "sine.inOut" });
        for (let i = 0; i < 3; i++) {
          const spark = new Graphics().circle(0, 0, 1).fill({ color: 0xffcc44, alpha: 0.7 });
          spark.position.set((Math.random() - 0.5) * S * 0.4, 0);
          iconC.addChild(spark);
          gsap.to(spark, { y: -S * 0.8, alpha: 0, duration: 0.6 + i * 0.15, repeat: -1, delay: i * 0.2, ease: "power1.out" });
        }
        break;
      }
      case UpgradeType.SUMMON_ICE_ELEMENTAL: {
        // Icy crystalline creature
        const iceBody = new Graphics();
        // Jagged crystal body
        iceBody.moveTo(0, -S * 0.5).lineTo(S * 0.25, -S * 0.15).lineTo(S * 0.3, S * 0.2).lineTo(S * 0.1, S * 0.4)
          .lineTo(-S * 0.1, S * 0.4).lineTo(-S * 0.3, S * 0.2).lineTo(-S * 0.25, -S * 0.15).closePath()
          .fill({ color: 0x88ccff, alpha: 0.7 });
        const iceCoreG = new Graphics();
        iceCoreG.moveTo(0, -S * 0.3).lineTo(S * 0.12, 0).lineTo(0, S * 0.2).lineTo(-S * 0.12, 0).closePath()
          .fill({ color: 0xcceeFF, alpha: 0.6 });
        // Eyes
        iceBody.circle(-S * 0.08, -S * 0.15, 1).fill({ color: 0xffffff, alpha: 0.9 });
        iceBody.circle(S * 0.08, -S * 0.15, 1).fill({ color: 0xffffff, alpha: 0.9 });
        const iceGlow = new Graphics().circle(0, 0, S * 0.55).fill({ color: 0x66bbff, alpha: 0.1 });
        iconC.addChild(iceGlow, iceBody, iceCoreG);
        gsap.to(iceGlow, { scale: 1.3, alpha: 0.02, duration: 0.8, yoyo: true, repeat: -1, ease: "sine.inOut" });
        gsap.to(iceCoreG, { alpha: 0.3, duration: 0.6, yoyo: true, repeat: -1, ease: "sine.inOut" });
        // Frost particles
        for (let i = 0; i < 3; i++) {
          const frost = new Graphics().circle(0, 0, 0.7).fill({ color: 0xffffff, alpha: 0.6 });
          frost.position.set((Math.random() - 0.5) * S * 0.8, (Math.random() - 0.5) * S * 0.6);
          iconC.addChild(frost);
          gsap.to(frost, { alpha: 0, scale: 0.3, duration: 0.7, yoyo: true, repeat: -1, delay: i * 0.2 });
        }
        break;
      }
      case UpgradeType.SUMMON_DARK_SAVANT: {
        // Hooded dark mage figure
        const robe = new Graphics().moveTo(0, -S * 0.35).lineTo(S * 0.25, S * 0.4).lineTo(-S * 0.25, S * 0.4).closePath()
          .fill({ color: 0x220033, alpha: 0.9 });
        const hood = new Graphics().circle(0, -S * 0.3, S * 0.18).fill({ color: 0x331144, alpha: 0.9 });
        // Glowing eyes
        hood.circle(-S * 0.05, -S * 0.32, 1).fill({ color: 0xaa44ff, alpha: 0.9 });
        hood.circle(S * 0.05, -S * 0.32, 1).fill({ color: 0xaa44ff, alpha: 0.9 });
        // Staff
        const staff = new Graphics().moveTo(S * 0.3, -S * 0.5).lineTo(S * 0.25, S * 0.4).stroke({ color: 0x664488, width: 1.5 });
        const staffOrb = new Graphics().circle(S * 0.3, -S * 0.5, S * 0.08).fill({ color: 0xbb66ff, alpha: 0.8 });
        const staffGlow = new Graphics().circle(S * 0.3, -S * 0.5, S * 0.15).fill({ color: 0x9944ff, alpha: 0.2 });
        iconC.addChild(robe, hood, staff, staffGlow, staffOrb);
        gsap.to(staffGlow, { scale: 1.5, alpha: 0.05, duration: 0.6, yoyo: true, repeat: -1, ease: "sine.inOut" });
        gsap.to(staffOrb, { scale: 1.2, duration: 0.4, yoyo: true, repeat: -1, ease: "sine.inOut" });
        // Dark aura
        const aura = new Graphics().circle(0, 0, S * 0.55).fill({ color: 0x6622aa, alpha: 0.08 });
        iconC.addChild(aura);
        gsap.to(aura, { scale: 1.3, alpha: 0.02, duration: 0.9, yoyo: true, repeat: -1 });
        break;
      }
      case UpgradeType.SUMMON_ANGEL: {
        // Radiant winged figure
        const angelBody = new Graphics().ellipse(0, 0, S * 0.12, S * 0.3).fill({ color: 0xffffee, alpha: 0.9 });
        const angelHead = new Graphics().circle(0, -S * 0.35, S * 0.1).fill({ color: 0xffffdd });
        // Halo
        const halo = new Graphics().circle(0, -S * 0.5, S * 0.12).stroke({ color: 0xffdd44, width: 1.5, alpha: 0.8 });
        // Wings
        const wingL = new Graphics().ellipse(-S * 0.3, -S * 0.1, S * 0.2, S * 0.35).fill({ color: 0xffffff, alpha: 0.4 });
        const wingR = new Graphics().ellipse(S * 0.3, -S * 0.1, S * 0.2, S * 0.35).fill({ color: 0xffffff, alpha: 0.4 });
        // Divine glow
        const divGlow = new Graphics().circle(0, -S * 0.1, S * 0.6).fill({ color: 0xffee88, alpha: 0.1 });
        iconC.addChild(divGlow, wingL, wingR, angelBody, angelHead, halo);
        gsap.to(wingL, { scaleX: 0.8, scaleY: 1, duration: 0.5, yoyo: true, repeat: -1, ease: "sine.inOut" });
        gsap.to(wingR, { scaleX: 0.8, scaleY: 1, duration: 0.5, yoyo: true, repeat: -1, ease: "sine.inOut" });
        gsap.to(divGlow, { scale: 1.2, alpha: 0.04, duration: 0.8, yoyo: true, repeat: -1, ease: "sine.inOut" });
        gsap.to(halo, { alpha: 0.4, duration: 0.5, yoyo: true, repeat: -1, ease: "sine.inOut" });
        gsap.to(angelBody, { y: -1, duration: 0.7, yoyo: true, repeat: -1, ease: "sine.inOut" });
        break;
      }
      case UpgradeType.SUMMON_CYCLOPS: {
        // Large one-eyed brute
        const cycBody = new Graphics().ellipse(0, S * 0.05, S * 0.35, S * 0.35).fill({ color: 0x887766, alpha: 0.9 });
        const cycHead = new Graphics().circle(0, -S * 0.35, S * 0.22).fill({ color: 0x998877 });
        // Single big eye
        const eyeWhite = new Graphics().circle(0, -S * 0.35, S * 0.1).fill({ color: 0xffffee });
        const eyePupil = new Graphics().circle(0, -S * 0.35, S * 0.05).fill({ color: 0xaa2200 });
        // Arms
        const cArmL = new Graphics().moveTo(-S * 0.35, -S * 0.05).lineTo(-S * 0.55, S * 0.3).stroke({ color: 0x887766, width: 3 });
        const cArmR = new Graphics().moveTo(S * 0.35, -S * 0.05).lineTo(S * 0.55, S * 0.3).stroke({ color: 0x887766, width: 3 });
        iconC.addChild(cycBody, cycHead, eyeWhite, eyePupil, cArmL, cArmR);
        gsap.to(cycBody, { scaleX: 1.03, scaleY: 0.97, duration: 0.9, yoyo: true, repeat: -1, ease: "sine.inOut" });
        gsap.to(eyePupil, { x: 1.5, duration: 1.2, yoyo: true, repeat: -1, ease: "sine.inOut" });
        break;
      }
      case UpgradeType.SUMMON_RED_DRAGON: {
        // Fearsome red dragon
        const dBody = new Graphics().ellipse(0, 0, S * 0.4, S * 0.2).fill({ color: 0xcc2200, alpha: 0.9 });
        const dHead = new Graphics().ellipse(S * 0.35, -S * 0.15, S * 0.15, S * 0.1).fill({ color: 0xdd3300 });
        // Eye
        dHead.circle(S * 0.4, -S * 0.17, 1).fill({ color: 0xffff00, alpha: 0.9 });
        // Wings
        const dWingL = new Graphics().moveTo(-S * 0.1, -S * 0.15).lineTo(-S * 0.5, -S * 0.55).lineTo(-S * 0.35, -S * 0.1).closePath()
          .fill({ color: 0xaa1100, alpha: 0.6 });
        const dWingR = new Graphics().moveTo(S * 0.1, -S * 0.15).lineTo(S * 0.1, -S * 0.55).lineTo(S * 0.3, -S * 0.1).closePath()
          .fill({ color: 0xaa1100, alpha: 0.6 });
        // Tail
        const dTail = new Graphics().moveTo(-S * 0.4, 0).quadraticCurveTo(-S * 0.6, S * 0.3, -S * 0.5, S * 0.15)
          .stroke({ color: 0xcc2200, width: 2 });
        // Fire breath
        const breath = new Graphics().moveTo(S * 0.48, -S * 0.15).lineTo(S * 0.75, -S * 0.3).lineTo(S * 0.7, -S * 0.1).closePath()
          .fill({ color: 0xff6622, alpha: 0.5 });
        iconC.addChild(dTail, dBody, dWingL, dWingR, dHead, breath);
        gsap.to(dWingL, { y: 3, rotation: 0.15, duration: 0.4, yoyo: true, repeat: -1, ease: "sine.inOut" });
        gsap.to(dWingR, { y: 3, rotation: -0.15, duration: 0.4, yoyo: true, repeat: -1, ease: "sine.inOut" });
        gsap.to(breath, { alpha: 0.1, scale: 1.3, duration: 0.5, yoyo: true, repeat: -1, ease: "sine.inOut" });
        gsap.to(dBody, { y: -1, duration: 0.6, yoyo: true, repeat: -1, ease: "sine.inOut" });
        break;
      }
      case UpgradeType.SUMMON_FROST_DRAGON: {
        // Icy blue dragon
        const fdBody = new Graphics().ellipse(0, 0, S * 0.4, S * 0.2).fill({ color: 0x4488cc, alpha: 0.9 });
        const fdHead = new Graphics().ellipse(S * 0.35, -S * 0.15, S * 0.15, S * 0.1).fill({ color: 0x55aadd });
        // Eye
        fdHead.circle(S * 0.4, -S * 0.17, 1).fill({ color: 0xccffff, alpha: 0.9 });
        // Wings
        const fdWingL = new Graphics().moveTo(-S * 0.1, -S * 0.15).lineTo(-S * 0.5, -S * 0.55).lineTo(-S * 0.35, -S * 0.1).closePath()
          .fill({ color: 0x3377aa, alpha: 0.6 });
        const fdWingR = new Graphics().moveTo(S * 0.1, -S * 0.15).lineTo(S * 0.1, -S * 0.55).lineTo(S * 0.3, -S * 0.1).closePath()
          .fill({ color: 0x3377aa, alpha: 0.6 });
        // Tail
        const fdTail = new Graphics().moveTo(-S * 0.4, 0).quadraticCurveTo(-S * 0.6, S * 0.3, -S * 0.5, S * 0.15)
          .stroke({ color: 0x4488cc, width: 2 });
        // Frost breath
        const frostBreath = new Graphics().moveTo(S * 0.48, -S * 0.15).lineTo(S * 0.75, -S * 0.3).lineTo(S * 0.7, -S * 0.1).closePath()
          .fill({ color: 0x88ddff, alpha: 0.4 });
        const frostGlow = new Graphics().circle(S * 0.6, -S * 0.2, S * 0.15).fill({ color: 0x66ccff, alpha: 0.15 });
        iconC.addChild(fdTail, fdBody, fdWingL, fdWingR, fdHead, frostBreath, frostGlow);
        gsap.to(fdWingL, { y: 3, rotation: 0.15, duration: 0.4, yoyo: true, repeat: -1, ease: "sine.inOut" });
        gsap.to(fdWingR, { y: 3, rotation: -0.15, duration: 0.4, yoyo: true, repeat: -1, ease: "sine.inOut" });
        gsap.to(frostBreath, { alpha: 0.1, scale: 1.2, duration: 0.6, yoyo: true, repeat: -1, ease: "sine.inOut" });
        gsap.to(frostGlow, { scale: 1.4, alpha: 0.04, duration: 0.5, yoyo: true, repeat: -1 });
        gsap.to(fdBody, { y: -1, duration: 0.6, yoyo: true, repeat: -1, ease: "sine.inOut" });
        break;
      }

      // ── FALLBACK (any unknown) ─────────────────────────────────────────────
      default: {
        // Default: school-colored orb
        const schoolColors: Record<string, number> = {
          elemental: 0xff6622,
          arcane: 0x9966ff,
          divine: 0xffdd44,
          shadow: 0x663399,
          conjuration: 0x4488ff,
        };
        const color = schoolColors[school] ?? 0x778899;
        const orb = new Graphics().circle(0, 0, S * 0.5).fill({ color, alpha: 0.5 }).circle(0, 0, S * 0.25).fill({ color: 0xffffff, alpha: 0.3 });
        iconC.addChild(orb);
        gsap.to(orb, { scale: 1.2, duration: 0.7, yoyo: true, repeat: -1, ease: "sine.inOut" });

        const labelFallback = new Text({
          text: UPGRADE_LABELS[upgradeType],
          style: new TextStyle({ fontFamily: "monospace", fontSize: 6, fill: 0xffffff, align: "center", fontWeight: "bold" }),
        });
        labelFallback.anchor.set(0.5, 0.5);
        labelFallback.position.set(0, S * 0.6);
        iconC.addChild(labelFallback);
        break;
      }
    }
  }

  private _makeBuildingIcon(
    bpType: BuildingType,
    x: number,
    y: number,
  ): Container {
    const btn = new Container();
    btn.position.set(x, y);
    btn.eventMode = "static";
    btn.cursor = "pointer";

    const def = BUILDING_DEFINITIONS[bpType];

    // Check build constraints
    const maxCount = def.maxCount;
    const prereq = def.prerequisite;
    const ownedCount =
      maxCount !== undefined ? this._countOwnedType(bpType) : 0;
    const isOp = this._state.p1RaceId === "op";
    const prereqMet =
      isOp ||
      !prereq ||
      prereq.types.every(
        (type) => this._countOwnedType(type) >= prereq.minCount,
      );
    const atMax = maxCount !== undefined && ownedCount >= maxCount;
    const locked = atMax || !prereqMet;

    const bg = new Graphics()
      .roundRect(0, 0, ICON_SIZE, ICON_SIZE, 4)
      .fill({ color: 0x111122 })
      .roundRect(0, 0, ICON_SIZE, ICON_SIZE, 4)
      .stroke({ color: locked ? 0x443322 : 0x334455, width: 1 });
    btn.addChild(bg);

    // Building icon: use rendered texture if available, else letter placeholder
    const tex = this._getBuildingTexture(bpType);
    if (tex) {
      const iconSprite = new Sprite(tex);
      const iconArea = ICON_SIZE - 10;
      const scale = Math.min(iconArea / tex.width, iconArea / tex.height);
      iconSprite.scale.set(scale);
      iconSprite.anchor.set(0.5, 0.5);
      iconSprite.position.set(ICON_SIZE / 2, ICON_SIZE / 2 - 4);
      if (locked) iconSprite.alpha = 0.5;
      btn.addChild(iconSprite);
    } else {
      const iconG = new Graphics()
        .roundRect(8, 4, ICON_SIZE - 16, ICON_SIZE - 16, 3)
        .fill({ color: locked ? 0x222222 : 0x223344 });
      btn.addChild(iconG);

      const displayLabel = BUILDING_LABELS[bpType] ?? String(bpType);
      const firstChar =
        typeof displayLabel === "string" ? displayLabel.charAt(0) : "?";
      const letter = new Text({
        text: firstChar,
        style: new TextStyle({
          fontFamily: "monospace",
          fontSize: 14,
          fill: locked ? 0x667788 : 0xdddddd,
          fontWeight: "bold",
        }),
      });
      letter.anchor.set(0.5, 0.5);
      letter.position.set(ICON_SIZE / 2, ICON_SIZE / 2 - 4);
      btn.addChild(letter);
    }

    // Cost text (use discounted cost for tower building types)
    const displayCost = UpgradeSystem.getTowerBuildingCost(
      bpType,
      this._localPlayerId,
    );
    const costText = new Text({
      text: `${displayCost}g`,
      style: locked ? STYLE_ICON_COST_UNAFFORDABLE : STYLE_ICON_COST,
    });
    costText.anchor.set(0.5, 1);
    costText.position.set(ICON_SIZE / 2, ICON_SIZE - 1);
    btn.addChild(costText);

    if (locked) btn.alpha = 0.5;

    btn.on("pointerover", () => {
      bg.tint = 0x334466;
      this._showBuildingPreview(bpType);
      this._showBuildingStats(bpType);
    });
    btn.on("pointerout", () => {
      bg.tint = 0xffffff;
      this._showDefaultPreviewAndStats();
    });
    btn.on("pointerdown", (e) => {
      e.stopPropagation();
      if (!locked) this._buyBlueprint(bpType);
    });

    this._bpIcons.push({ type: bpType, costText, bg, locked });
    return btn;
  }

  // ---------------------------------------------------------------------------
  // Scroll
  // ---------------------------------------------------------------------------

  private _applyScroll(): void {
    const scrollableH = this._scrollableH();
    const maxScroll = Math.max(0, this._contentH - scrollableH);
    this._scrollY = Math.max(0, Math.min(maxScroll, this._scrollY));

    this._scrollContainer.position.y = FIXED_TOP_H - this._scrollY;

    const trackH = scrollableH - SCROLL_MARGIN * 2;
    const thumbH = this._scrollbarThumb.height;
    const maxThumbY = trackH - thumbH;
    const thumbY = maxScroll > 0 ? (this._scrollY / maxScroll) * maxThumbY : 0;

    this._scrollbarThumb.position.y = FIXED_TOP_H + SCROLL_MARGIN + thumbY;
  }

  private _onThumbDragStart(e: any): void {
    e.stopPropagation();
    this._isDragging = true;
    this._dragStartY = e.global.y;
    this._thumbStartY = this._scrollY;

    const stage = this._vm.app.stage;
    stage.on("pointermove", (e) => this._onThumbDragMove(e));
    stage.on("pointerup", () => this._onThumbDragEnd());
    stage.on("pointerupoutside", () => this._onThumbDragEnd());
  }

  private _onThumbDragMove(e: any): void {
    if (!this._isDragging) return;

    const deltaY = e.global.y - this._dragStartY;
    const scrollableH = this._scrollableH();
    const trackH = scrollableH - SCROLL_MARGIN * 2;
    const thumbH = this._scrollbarThumb.height;
    const maxThumbY = trackH - thumbH;
    const maxScroll = Math.max(0, this._contentH - scrollableH);

    if (maxThumbY > 0) {
      const scrollDelta = (deltaY / maxThumbY) * maxScroll;
      this._scrollY = this._thumbStartY + scrollDelta;
      this._applyScroll();
    }
  }

  private _onThumbDragEnd(): void {
    this._isDragging = false;
    const stage = this._vm.app.stage;
    stage.off("pointermove");
    stage.off("pointerup");
    stage.off("pointerupoutside");
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private _countOwnedType(type: BuildingType): number {
    const player = this._state.players.get(this._localPlayerId);
    if (!player) return 0;
    let count = 0;
    for (const id of player.ownedBuildings) {
      const b = this._state.buildings.get(id);
      if (b && b.type === type && b.state !== BuildingState.DESTROYED) count++;
    }
    return count;
  }

  private _countOwnedUnits(unitType: UnitType): number {
    let count = 0;
    // Count living units on the field
    for (const unit of this._state.units.values()) {
      if (
        unit.owner === this._localPlayerId &&
        unit.type === unitType &&
        unit.state !== UnitState.DIE
      ) {
        count++;
      }
    }
    // Count units still in spawn queues
    for (const b of this._state.buildings.values()) {
      if (b.owner !== this._localPlayerId) continue;
      for (const entry of b.spawnQueue.entries) {
        if (entry.unitType === unitType) count++;
      }
      for (const ready of b.spawnQueue.readyUnits) {
        if (ready === unitType) count++;
      }
    }
    return count;
  }

  // ---------------------------------------------------------------------------
  // Sim commands
  // ---------------------------------------------------------------------------

  private _buyUnit(buildingId: string, unitType: UnitType): void {
    const player = this._state.players.get(this._localPlayerId);
    if (!player) return;
    const def = UNIT_DEFINITIONS[unitType];
    const cost = def.cost;
    if (player.gold < cost) return;
    // Require Elite Hall for high-cost units
    if (
      cost >= ELITE_HALL_COST_THRESHOLD &&
      this._countOwnedType(BuildingType.ELITE_HALL) === 0
    )
      return;
    // Enforce unit max count
    if (
      def.maxCount !== undefined &&
      this._countOwnedUnits(unitType) >= def.maxCount
    )
      return;

    player.gold -= cost;
    addToQueue(this._state, buildingId, unitType);

    EventBus.emit("goldChanged", {
      playerId: this._localPlayerId,
      amount: player.gold,
    });

    this._updateAffordability();
  }

  private _buyBlueprint(bpType: BuildingType): void {
    const player = this._state.players.get(this._localPlayerId);
    if (!player) return;
    const cost = UpgradeSystem.getTowerBuildingCost(
      bpType,
      this._localPlayerId,
    );
    if (player.gold < cost) return;

    player.gold -= cost;
    EventBus.emit("goldChanged", {
      playerId: this._localPlayerId,
      amount: player.gold,
    });

    this.close();
    buildingPlacer.activate(bpType);
  }

  // ---------------------------------------------------------------------------
  // Affordability tints
  // ---------------------------------------------------------------------------

  private _updateAffordability(): void {
    const player = this._state.players.get(this._localPlayerId);
    const gold = player?.gold ?? 0;
    const hasEliteHall = this._countOwnedType(BuildingType.ELITE_HALL) > 0;

    for (const entry of this._unitIcons) {
      const def = UNIT_DEFINITIONS[entry.type];
      const atMaxCount =
        def.maxCount !== undefined &&
        this._countOwnedUnits(entry.type) >= def.maxCount;
      const nowLocked =
        (def.cost >= ELITE_HALL_COST_THRESHOLD && !hasEliteHall) || atMaxCount;

      if (nowLocked !== entry.locked) {
        // Lock state changed — rebuild the panel to reflect it
        entry.locked = nowLocked;
        this._rebuild();
        return; // _rebuild calls _updateAffordability again
      }

      if (entry.locked) continue;

      const cost = def.cost;
      entry.costText.style =
        cost <= gold ? STYLE_ICON_COST : STYLE_ICON_COST_UNAFFORDABLE;
    }

    for (const entry of this._bpIcons) {
      if (entry.locked) continue;
      const cost = UpgradeSystem.getTowerBuildingCost(
        entry.type,
        this._localPlayerId,
      );
      entry.costText.text = `${cost}g`;
      entry.costText.style =
        cost <= gold ? STYLE_ICON_COST : STYLE_ICON_COST_UNAFFORDABLE;
    }
  }

  // ---------------------------------------------------------------------------
  // Upgrade methods
  // ---------------------------------------------------------------------------

  private _showUpgradePreview(upgradeType: UpgradeType): void {
    this._previewContainer.removeChildren();

    const def = UPGRADE_DEFINITIONS[upgradeType];

    // Show upgrade icon
    const preview = new Graphics()
      .circle(PANEL_W / 2, PREVIEW_H / 2 - 10, 25)
      .fill({ color: 0x445566 })
      .circle(PANEL_W / 2, PREVIEW_H / 2 - 10, 20)
      .fill({ color: 0x667788 });
    this._previewContainer.addChild(preview);

    // Upgrade label
    const label = new Text({
      text: UPGRADE_LABELS[upgradeType],
      style: new TextStyle({
        fontFamily: "monospace",
        fontSize: 14,
        fill: 0xffffff,
        align: "center",
        fontWeight: "bold",
      }),
    });
    label.anchor.set(0.5, 0.5);
    label.position.set(PANEL_W / 2, PREVIEW_H / 2 - 10);
    this._previewContainer.addChild(label);

    // Description text below the icon
    const descText = new Text({
      text: def.description,
      style: new TextStyle({
        fontFamily: "monospace",
        fontSize: 9,
        fill: 0xaaaadd,
        align: "center",
        wordWrap: true,
        wordWrapWidth: PANEL_W - 30,
      }),
    });
    descText.anchor.set(0.5, 0);
    descText.position.set(PANEL_W / 2, PREVIEW_H / 2 + 20);
    this._previewContainer.addChild(descText);
  }

  private _showUpgradeStats(upgradeType: UpgradeType): void {
    this._statsContainer.removeChildren();

    const def = UPGRADE_DEFINITIONS[upgradeType];
    const currentLevel = UpgradeSystem.getUpgradeLevel(
      this._localPlayerId,
      upgradeType,
    );
    const statsW = PANEL_W - 2 * PANEL_PAD;

    // School + magic type header for spells
    const spellDef = def as any;
    let yPos = 8;
    if (spellDef.spellSchool) {
      const tierNumerals = ["", "I", "II", "III", "IV", "V", "VI", "VII"];
      const schoolName = (spellDef.spellSchool as string).charAt(0).toUpperCase() + (spellDef.spellSchool as string).slice(1);
      const magicType = spellDef.spellMagicType as string | undefined;
      const tierNum = spellDef.spellTier as number | undefined;
      const typeName = magicType ? magicType.charAt(0).toUpperCase() + magicType.slice(1) : "";
      const tierLabel = tierNum ? tierNumerals[tierNum] : "";
      const schoolColors: Record<string, number> = {
        elemental: 0xff6622, arcane: 0x9966ff, divine: 0xffdd44,
        shadow: 0xaa66cc, conjuration: 0x4488ff,
      };
      const magicTypeColors: Record<string, number> = {
        fire: 0xff4422, ice: 0x66ccff, lightning: 0xffff44,
        earth: 0xaa8844, arcane: 0x9966ff, holy: 0xffdd44,
        shadow: 0xaa66cc, poison: 0x66cc44, void: 0x8833cc,
        death: 0x44aa88, nature: 0x44cc44,
      };
      // Line 1: School name (e.g. "Elemental School")
      const schoolLabel = new Text({
        text: `${schoolName} School`,
        style: new TextStyle({
          fontFamily: "monospace", fontSize: 9,
          fill: schoolColors[spellDef.spellSchool] ?? 0xffffff,
          fontWeight: "bold",
        }),
      });
      schoolLabel.position.set(10, yPos);
      this._statsContainer.addChild(schoolLabel);
      yPos += 13;
      // Line 2: Magic type + tier (e.g. "Fire Tier II")
      if (magicType && tierLabel) {
        const typeLabel = new Text({
          text: `${typeName} Tier ${tierLabel}`,
          style: new TextStyle({
            fontFamily: "monospace", fontSize: 9,
            fill: magicTypeColors[magicType] ?? 0xffffff,
          }),
        });
        typeLabel.position.set(10, yPos);
        this._statsContainer.addChild(typeLabel);
        yPos += 13;
      }
      yPos += 2;
    }

    // Description
    const desc = new Text({
      text: def.description,
      style: new TextStyle({
        fontFamily: "monospace",
        fontSize: 10,
        fill: 0xaaaadd,
        align: "center",
        wordWrap: true,
        wordWrapWidth: statsW - 20,
      }),
    });
    desc.position.set(10, yPos);
    this._statsContainer.addChild(desc);
    yPos += 24;

    // Level and cost info
    const levelText = new Text({
      text: `Level: ${currentLevel}/${def.maxLevel}`,
      style: new TextStyle({
        fontFamily: "monospace",
        fontSize: 10,
        fill: 0xffffff,
        align: "left",
      }),
    });
    levelText.position.set(10, yPos);
    this._statsContainer.addChild(levelText);

    if (currentLevel < def.maxLevel) {
      const manaCost = (def as any).manaCost as number | undefined;
      const costLabel = manaCost && manaCost > 0
        ? `Cost: ${manaCost}m`
        : `Next upgrade: ${def.cost}g`;
      const costText = new Text({
        text: costLabel,
        style: new TextStyle({
          fontFamily: "monospace",
          fontSize: 10,
          fill: manaCost && manaCost > 0 ? 0x4488ff : 0xffd700,
          align: "left",
        }),
      });
      costText.position.set(10, yPos + 15);
      this._statsContainer.addChild(costText);
    } else {
      const maxText = new Text({
        text: "MAX LEVEL",
        style: new TextStyle({
          fontFamily: "monospace",
          fontSize: 10,
          fill: 0x88ff88,
          align: "left",
        }),
      });
      maxText.position.set(10, yPos + 15);
      this._statsContainer.addChild(maxText);
    }
  }

  private _buyUpgrade(_buildingId: string, upgradeType: UpgradeType): void {
    // Special handling for construction upgrades (settler/engineer)
    if (upgradeType === UpgradeType.SETTLER || upgradeType === UpgradeType.ENGINEER) {
      this._buyConstructionUpgrade(upgradeType);
      return;
    }

    // Special handling for spell upgrades (summon, damage, heal)
    const upgDef = UPGRADE_DEFINITIONS[upgradeType];
    if (upgDef.isSpell && upgDef.spellType) {
      this._buySpellUpgrade(upgradeType);
      return;
    }

    const success = UpgradeSystem.purchaseUpgrade(
      this._state,
      this._localPlayerId,
      upgradeType,
    );

    if (success) {
      // Refresh the shop panel to show new level
      this._rebuild();

      // Update affordability
      this._updateAffordability();
    }
  }

  private _buyConstructionUpgrade(upgradeType: UpgradeType): void {
    const success = UpgradeSystem.purchaseUpgrade(
      this._state,
      this._localPlayerId,
      upgradeType,
    );
    if (!success) return;

    this.close();

    const bpType = upgradeType === UpgradeType.SETTLER
      ? BuildingType.FORWARD_CASTLE
      : BuildingType.FORWARD_TOWER;

    const unitType = upgradeType === UpgradeType.SETTLER
      ? UnitType.SETTLER
      : UnitType.ENGINEER;

    buildingPlacer.activateConstruction(bpType, upgradeType, unitType, this._localPlayerId);
  }

  private _buySpellUpgrade(upgradeType: UpgradeType): void {
    const success = UpgradeSystem.purchaseUpgrade(
      this._state,
      this._localPlayerId,
      upgradeType,
    );
    if (!success) return;

    this.close();

    const def = UPGRADE_DEFINITIONS[upgradeType];
    if (def.summonUnit) {
      buildingPlacer.activateSpellPlacement(upgradeType, def.summonUnit, this._localPlayerId);
    } else {
      buildingPlacer.activateAoeSpell(upgradeType, this._localPlayerId);
    }
  }
}

export const shopPanel = new ShopPanel();
