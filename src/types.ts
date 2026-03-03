// Shared type aliases and enums used across sim/ and view/

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/** Integer or fractional tile coordinate pair. */
export interface Vec2 {
  x: number;
  y: number;
}

/** Strict integer tile coordinate (x, y must be whole numbers). */
export interface TileCoord {
  x: number;
  y: number;
}

/** Opaque string identifying a player. */
export type PlayerId = string;

/** Sentinel used for neutral / unowned entities. */
export const NEUTRAL_PLAYER: PlayerId = "__neutral__";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export enum Direction {
  WEST = "west",
  EAST = "east",
  NORTH = "north",
  SOUTH = "south",
}

export enum UnitType {
  SWORDSMAN = "swordsman",
  TEMPLAR = "templar",
  ARCHER = "archer",
  LONGBOWMAN = "longbowman",
  CROSSBOWMAN = "crossbowman",
  KNIGHT = "knight",
  FIRE_MAGE = "fire_mage",
  STORM_MAGE = "storm_mage",
  PIKEMAN = "pikeman",
  SUMMONED = "summoned",
  BATTERING_RAM = "battering_ram",
  MAGE_HUNTER = "mage_hunter",
  SIEGE_HUNTER = "siege_hunter",
  ASSASSIN = "assassin",
  REPEATER = "repeater",
  SUMMONER = "summoner",
  CONSTRUCTIONIST = "constructionist",
  COLD_MAGE = "cold_mage",
  SPIDER = "spider",
  GLADIATOR = "gladiator",
  DIPLOMAT = "diplomat",
  DISTORTION_MAGE = "distortion_mage",
  FIRE_ADEPT_MAGE = "fire_adept_mage",
  COLD_ADEPT_MAGE = "cold_adept_mage",
  LIGHTNING_ADEPT_MAGE = "lightning_adept_mage",
  DISTORTION_ADEPT_MAGE = "distortion_adept_mage",
  FIRE_MASTER_MAGE = "fire_master_mage",
  COLD_MASTER_MAGE = "cold_master_mage",
  LIGHTNING_MASTER_MAGE = "lightning_master_mage",
  DISTORTION_MASTER_MAGE = "distortion_master_mage",
  VOID_SNAIL = "void_snail",
  FAERY_QUEEN = "faery_queen",
  GIANT_FROG = "giant_frog",
  DEVOURER = "devourer",
  TROLL = "troll",
  RHINO = "rhino",
  PIXIE = "pixie",
  FIRE_IMP = "fire_imp",
  ICE_IMP = "ice_imp",
  LIGHTNING_IMP = "lightning_imp",
  DISTORTION_IMP = "distortion_imp",
  BAT = "bat",
  HORSE_ARCHER = "horse_archer",
  SHORTBOW = "shortbow",
  BALLISTA = "ballista",
  BOLT_THROWER = "bolt_thrower",
  CATAPULT = "catapult",
  SIEGE_CATAPULT = "siege_catapult",
  TREBUCHET = "trebuchet",
  SCOUT_CAVALRY = "scout_cavalry",
  LANCER = "lancer",
  ELITE_LANCER = "elite_lancer",
  ROYAL_LANCER = "royal_lancer",
  KNIGHT_LANCER = "knight_lancer",
  MONK = "monk",
  CLERIC = "cleric",
  SAINT = "saint",
  RED_DRAGON = "red_dragon",
  FROST_DRAGON = "frost_dragon",
  CYCLOPS = "cyclops",
  HALBERDIER = "halberdier",
  ELVEN_ARCHER = "elven_archer",
  HERO = "hero",
  QUESTING_KNIGHT = "questing_knight",
  ANGEL = "angel",
  DARK_SAVANT = "dark_savant",
  DEFENDER = "defender",
  PHALANX = "phalanx",
  ROYAL_PHALANX = "royal_phalanx",
  ROYAL_DEFENDER = "royal_defender",
  AXEMAN = "axeman",
  BERSERKER = "berserker",
  JAVELINEER = "javelin",
  ARBALESTIER = "arbelestier",
  ROYAL_ARBALESTIER = "royal_arbelestier",
  WARCHIEF = "warchief",
  ARCHMAGE = "archmage",
}

export enum BuildingType {
  CASTLE = "castle",
  BARRACKS = "barracks",
  STABLES = "stables",
  MAGE_TOWER = "mage_tower",
  ARCHERY_RANGE = "archery_range",
  SIEGE_WORKSHOP = "siege_workshop",
  BLACKSMITH = "blacksmith",
  TOWN = "town",
  CREATURE_DEN = "creature_den",
  TOWER = "tower",
  FARM = "farm",
  HAMLET = "hamlet",
  EMBASSY = "embassy",
  TEMPLE = "temple",
  WALL = "wall",
  FIREPIT = "firepit",
  MILL = "mill",
  ELITE_HALL = "elite_hall",
  MARKET = "market",
  FACTION_HALL = "faction_hall",
  LIGHTNING_TOWER = "lightning_tower",
  ICE_TOWER = "ice_tower",
  FIRE_TOWER = "fire_tower",
  WARP_TOWER = "warp_tower",
  HEALING_TOWER = "healing_tower",
  BALLISTA_TOWER = "ballista_tower",
  REPEATER_TOWER = "repeater_tower",
  ARCHITECTS_GUILD = "architects_guild",
  HOUSE1 = "house1",
  HOUSE2 = "house2",
  HOUSE3 = "house3",
}

export enum AbilityType {
  FIREBALL = "fireball",
  CHAIN_LIGHTNING = "chain_lightning",
  WARP = "warp",
  SUMMON = "summon",
  FIRE_IMP_SUMMON = "fire_imp_summon",
  ICE_IMP_SUMMON = "ice_imp_summon",
  LIGHTNING_IMP_SUMMON = "lightning_imp_summon",
  DISTORTION_IMP_SUMMON = "distortion_imp_summon",
  FIRE_MASTER_IMP_SUMMON = "fire_master_imp_summon",
  ICE_MASTER_IMP_SUMMON = "ice_master_imp_summon",
  LIGHTNING_MASTER_IMP_SUMMON = "lightning_master_imp_summon",
  DISTORTION_MASTER_IMP_SUMMON = "distortion_master_imp_summon",
  ICE_BALL = "ice_ball",
  WEB = "web",
  GLADIATOR_NET = "gladiator_net",
  DISTORTION_BLAST = "distortion_blast",
  VOID_DISTORTION = "void_distortion",
  FAERY_DISTORTION = "faery_distortion",
  FROG_TONGUE = "frog_tongue",
  DEVOUR_PULL = "devour_pull",
  HEAL = "heal",
  FIRE_BREATH = "fire_breath",
  FROST_BREATH = "frost_breath",
}

export enum UpgradeType {
  MELEE_DAMAGE = "melee_damage",
  MELEE_HEALTH = "melee_health",
  RANGED_DAMAGE = "ranged_damage",
  RANGED_HEALTH = "ranged_health",
  SIEGE_DAMAGE = "siege_damage",
  SIEGE_HEALTH = "siege_health",
  CREATURE_DAMAGE = "creature_damage",
  CREATURE_HEALTH = "creature_health",
  MAGE_RANGE = "mage_range",
  FLAG = "flag",
  TOWER_RANGE = "tower_range",
  TOWER_DAMAGE = "tower_damage",
  TOWER_HEALTH = "tower_health",
  TOWER_COST = "tower_cost",
}

export enum UnitState {
  IDLE = "idle",
  MOVE = "move",
  ATTACK = "attack",
  CAST = "cast",
  DIE = "die",
}

export enum BuildingState {
  GHOST = "ghost",
  ACTIVE = "active",
  DESTROYED = "destroyed",
}

export enum GamePhase {
  PREP = "prep",
  BATTLE = "battle",
  RESOLVE = "resolve",
}

export enum GameMode {
  STANDARD = "standard",
  DEATHMATCH = "deathmatch",
  BATTLEFIELD = "battlefield",
  CAMPAIGN = "campaign",
  ROGUELIKE = "roguelike",
}

export enum MapType {
  MEADOW = "meadow",
  GRASS = "grass",
  PLAINS = "plains",
  FOREST = "forest",
  FANTASIA = "fantasia",
  TUNDRA = "tundra",
  SWAMP = "swamp",
  VOLCANIC = "volcanic",
  OCEAN = "ocean",
}
