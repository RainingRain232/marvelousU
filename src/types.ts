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

/** Map corner slot for a player's base in multi-player games. */
export type PlayerSlot = "nw" | "ne" | "sw" | "se";

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
  SETTLER = "settler",
  ENGINEER = "engineer",
  UNICORN = "unicorn",
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
  VAMPIRE_BAT = "vampire_bat",
  HORSE_ARCHER = "horse_archer",
  SHORTBOW = "shortbow",
  BALLISTA = "ballista",
  BOLT_THROWER = "bolt_thrower",
  CATAPULT = "catapult",
  SIEGE_CATAPULT = "siege_catapult",
  TREBUCHET = "trebuchet",
  WAR_WAGON = "war_wagon",
  BOMBARD = "bombard",
  SIEGE_TOWER = "siege_tower",
  HELLFIRE_MORTAR = "hellfire_mortar",
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
  FIRE_DRAGON = "fire_dragon",
  ICE_DRAGON = "ice_dragon",
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
  ANCIENT_DEFENDER = "ancient_defender",
  ANCIENT_PHALANX = "ancient_phalanx",
  ANCIENT_AXEMAN = "ancient_axeman",
  ELDER_DEFENDER = "elder_defender",
  ELDER_PHALANX = "elder_phalanx",
  ELDER_AXEMAN = "elder_axeman",
  ANCIENT_ARCHER = "ancient_archer",
  ANCIENT_LONGBOWMAN = "ancient_longbowman",
  ANCIENT_CROSSBOWMAN = "ancient_crossbowman",
  ELDER_ARCHER = "elder_archer",
  ELDER_REPEATER = "elder_repeater",
  ELDER_JAVELINEER = "elder_javelineer",
  ELDER_HORSE_ARCHER = "elder_horse_archer",
  JAVELINEER = "javelin",
  ARBALESTIER = "arbelestier",
  ROYAL_ARBALESTIER = "royal_arbelestier",
  WARCHIEF = "warchief",
  ARCHMAGE = "archmage",
  RUFUS = "rufus",
  TROUBADOUR = "troubadour",
  GIANT_COURT_JESTER = "giant_court_jester",
  FISHERMAN = "fisherman",
  FIRE_ELEMENTAL = "fire_elemental",
  ICE_ELEMENTAL = "ice_elemental",
  MINOR_FIRE_ELEMENTAL = "minor_fire_elemental",
  MINOR_ICE_ELEMENTAL = "minor_ice_elemental",
  LIGHTNING_ELEMENTAL = "lightning_elemental",
  DISTORTION_ELEMENTAL = "distortion_elemental",
  MINOR_LIGHTNING_ELEMENTAL = "minor_lightning_elemental",
  MINOR_DISTORTION_ELEMENTAL = "minor_distortion_elemental",
  EARTH_ELEMENTAL = "earth_elemental",
  MINOR_EARTH_ELEMENTAL = "minor_earth_elemental",
  GIANT_WARRIOR = "giant_warrior",
  GIANT_ARCHER = "giant_archer",
  GIANT_SIEGE = "giant_siege",
  GIANT_MAGE = "giant_mage",
  GIANT_CAVALRY = "giant_cavalry",
  ROYAL_GUARD = "royal_guard",
  MARKSMAN = "marksman",
  CANNON = "cannon",
  BATTLEMAGE = "battlemage",
  CATAPHRACT = "cataphract",
  NATIONAL_MAGE_T1 = "national_mage_t1",
  NATIONAL_MAGE_T2 = "national_mage_t2",
  NATIONAL_MAGE_T3 = "national_mage_t3",
  NATIONAL_MAGE_T4 = "national_mage_t4",
  NATIONAL_MAGE_T5 = "national_mage_t5",
  NATIONAL_MAGE_T6 = "national_mage_t6",
  NATIONAL_MAGE_T7 = "national_mage_t7",
  HALFLING_SLINGER = "halfling_slinger",
  HALFLING_CHEF = "halfling_chef",
  MAGMA_GOLEM = "magma_golem",
  LAVA_SHAMAN = "lava_shaman",
  // Dwarf faction
  DWARVEN_GUARDIAN = "dwarven_guardian",
  RUNESMITH = "runesmith",
  // Orc faction
  ORC_BRUTE = "orc_brute",
  ORC_DRUMMER = "orc_drummer",
  // Undead faction
  DEATH_KNIGHT = "death_knight",
  NECROMANCER = "necromancer",
  // Demon faction
  PIT_LORD = "pit_lord",
  HELLFIRE_WARLOCK = "hellfire_warlock",
  // Angel faction
  SERAPHIM = "seraphim",
  DIVINE_CHAMPION = "divine_champion",
  // Beastkin faction
  ALPHA_WOLF = "alpha_wolf",
  BEAST_SHAMAN = "beast_shaman",
  // Golem faction
  WAR_GOLEM = "war_golem",
  RUNE_CORE = "rune_core",
  // Pirate faction
  PIRATE_CAPTAIN = "pirate_captain",
  CORSAIR_GUNNER = "corsair_gunner",
  // Elements faction
  ELEMENTAL_AVATAR = "elemental_avatar",
  // Additional faction units
  KNIGHT_COMMANDER = "knight_commander",
  BLADEDANCER = "bladedancer",
  BOAR_RIDER = "boar_rider",
  CHRONOMANCER = "chronomancer",
  STORM_CONDUIT = "storm_conduit",
  HALFLING_BURGLAR = "halfling_burglar",
  OBSIDIAN_SENTINEL = "obsidian_sentinel",
  DWARVEN_CANNON = "dwarven_cannon",
  ORC_SHAMAN = "orc_shaman",
  BANSHEE = "banshee",
  SUCCUBUS = "succubus",
  VALKYRIE = "valkyrie",
  THUNDERHAWK = "thunderhawk",
  SIEGE_AUTOMATON = "siege_automaton",
  POWDER_MONKEY = "powder_monkey",
  // Wave 2 faction units (2 per race)
  // Man
  WAR_CHAPLAIN = "war_chaplain",
  SHIELD_CAPTAIN = "shield_captain",
  // Elves
  TREANT_GUARDIAN = "treant_guardian",
  MOONWEAVER = "moonweaver",
  // Horde
  SIEGE_TROLL = "siege_troll",
  BLOOD_BERSERKER = "blood_berserker",
  // Adept
  SPELL_WEAVER = "spell_weaver",
  MANA_WRAITH = "mana_wraith",
  // Elements
  FROST_WYRM = "frost_wyrm",
  MAGMA_TITAN = "magma_titan",
  // Halflings
  HALFLING_RIDER = "halfling_rider",
  HALFLING_ALCHEMIST = "halfling_alchemist",
  // Lava Children
  CINDER_WRAITH = "cinder_wraith",
  VOLCANIC_BEHEMOTH = "volcanic_behemoth",
  // Dwarves
  IRONBREAKER = "ironbreaker",
  THUNDERER = "thunderer",
  // Orcs
  WYVERN_RIDER = "wyvern_rider",
  PIT_FIGHTER = "pit_fighter",
  // Undead
  BONE_COLOSSUS = "bone_colossus",
  WRAITH_LORD = "wraith_lord",
  // Demons
  DOOM_GUARD = "doom_guard",
  IMP_OVERLORD = "imp_overlord",
  // Angels
  ARCHON = "archon",
  CELESTIAL_ARCHER = "celestial_archer",
  // Beastkin
  DIRE_BEAR = "dire_bear",
  SERPENT_PRIEST = "serpent_priest",
  // Golem Collective
  CRYSTAL_GOLEM = "crystal_golem",
  IRON_COLOSSUS = "iron_colossus",
  // Pirates
  SEA_WITCH = "sea_witch",
  BOARDING_MASTER = "boarding_master",
  // --- New units ---
  NOVICE_PRIEST = "novice_priest",
  SKIRMISHER = "skirmisher",
  HEAVY_LANCER = "heavy_lancer",
  HORDE_ARCHER = "horde_archer",
  HORDE_HEALER = "horde_healer",
  STONE_FIST = "stone_fist",
  BLADE_ADEPT = "blade_adept",
  BUCCANEER = "buccaneer",
  DEBUFFER_WARLOCK = "debuffer_warlock",
  WAR_DRUMMER = "war_drummer",
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
  FORWARD_CASTLE = "forward_castle",
  FORWARD_TOWER = "forward_tower",
  ARCHIVE = "archive",
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
  ELITE_BARRACKS = "elite_barracks",
  ELITE_ARCHERY_RANGE = "elite_archery_range",
  ELITE_SIEGE_WORKSHOP = "elite_siege_workshop",
  ELITE_MAGE_TOWER = "elite_mage_tower",
  ELITE_STABLES = "elite_stables",
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
  FISHERMAN_NET = "fisherman_net",
  FIRE_AURA = "fire_aura",
  ICE_AURA = "ice_aura",
  MINOR_FIRE_AURA = "minor_fire_aura",
  MINOR_ICE_AURA = "minor_ice_aura",
  LIGHTNING_AURA = "lightning_aura",
  DISTORTION_AURA = "distortion_aura",
  MINOR_LIGHTNING_AURA = "minor_lightning_aura",
  MINOR_DISTORTION_AURA = "minor_distortion_aura",
  NATIONAL_T1_SPELL_A = "national_t1_spell_a",
  NATIONAL_T1_SPELL_B = "national_t1_spell_b",
  NATIONAL_T2_SPELL_A = "national_t2_spell_a",
  NATIONAL_T2_SPELL_B = "national_t2_spell_b",
  NATIONAL_T3_SPELL = "national_t3_spell",
  NATIONAL_T4_SPELL = "national_t4_spell",
  NATIONAL_T5_SPELL = "national_t5_spell",
  NATIONAL_T6_SPELL = "national_t6_spell",
  NATIONAL_T7_SPELL = "national_t7_spell",
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
  SETTLER = "settler",
  ENGINEER = "engineer",
  SUMMON_UNICORN = "summon_unicorn",
  SUMMON_PIXIE = "summon_pixie",
  SUMMON_FIRE_ELEMENTAL = "summon_fire_elemental",
  SUMMON_ICE_ELEMENTAL = "summon_ice_elemental",
  SUMMON_RED_DRAGON = "summon_red_dragon",
  SUMMON_FROST_DRAGON = "summon_frost_dragon",
  SUMMON_FIRE_DRAGON = "summon_fire_dragon",
  SUMMON_ICE_DRAGON = "summon_ice_dragon",
  SUMMON_SPIDER_BROOD = "summon_spider_brood",
  SUMMON_TROLL = "summon_troll",
  SUMMON_ANGEL = "summon_angel",
  SUMMON_CYCLOPS = "summon_cyclops",
  SUMMON_BAT_SWARM = "summon_bat_swarm",
  SUMMON_DARK_SAVANT = "summon_dark_savant",
  SPELL_ARCANE_MISSILE = "spell_arcane_missile",
  SPELL_FIREBALL = "spell_fireball",
  SPELL_BLIZZARD = "spell_blizzard",
  SPELL_LIGHTNING_STRIKE = "spell_lightning_strike",
  SPELL_EARTHQUAKE = "spell_earthquake",
  SPELL_METEOR_STRIKE = "spell_meteor_strike",
  SPELL_VOID_RIFT = "spell_void_rift",
  SPELL_HOLY_SMITE = "spell_holy_smite",
  SPELL_POISON_CLOUD = "spell_poison_cloud",
  SPELL_ARCANE_STORM = "spell_arcane_storm",
  SPELL_HEALING_WAVE = "spell_healing_wave",
  SPELL_DIVINE_RESTORATION = "spell_divine_restoration",
  // Elemental
  SPELL_FROST_NOVA = "spell_frost_nova",
  SPELL_CHAIN_LIGHTNING = "spell_chain_lightning",
  SPELL_INFERNO = "spell_inferno",
  // Arcane
  SPELL_MANA_SURGE = "spell_mana_surge",
  SPELL_ARCANE_BARRAGE = "spell_arcane_barrage",
  SPELL_TEMPORAL_BLAST = "spell_temporal_blast",
  // Divine
  SPELL_BLESSING_OF_LIGHT = "spell_blessing_of_light",
  SPELL_PURIFYING_FLAME = "spell_purifying_flame",
  SPELL_RADIANT_NOVA = "spell_radiant_nova",
  SPELL_CELESTIAL_WRATH = "spell_celestial_wrath",
  // Shadow
  SPELL_SHADOW_BOLT = "spell_shadow_bolt",
  SPELL_CURSE_OF_DARKNESS = "spell_curse_of_darkness",
  SPELL_DEATH_COIL = "spell_death_coil",
  SPELL_NETHER_STORM = "spell_nether_storm",
  SPELL_SIPHON_SOUL = "spell_siphon_soul",
  // Fire gap-fill
  SPELL_FLAME_SPARK = "spell_flame_spark",
  SPELL_PYROCLASM = "spell_pyroclasm",
  // Ice gap-fill
  SPELL_GLACIAL_CRUSH = "spell_glacial_crush",
  SPELL_ABSOLUTE_ZERO = "spell_absolute_zero",
  // Lightning gap-fill
  SPELL_SPARK = "spell_spark",
  SPELL_THUNDERSTORM = "spell_thunderstorm",
  SPELL_BALL_LIGHTNING = "spell_ball_lightning",
  SPELL_MJOLNIR_STRIKE = "spell_mjolnir_strike",
  // Earth gap-fill
  SPELL_STONE_SHARD = "spell_stone_shard",
  SPELL_LANDSLIDE = "spell_landslide",
  SPELL_TECTONIC_RUIN = "spell_tectonic_ruin",
  // Arcane gap-fill
  SPELL_ARCANE_CATACLYSM = "spell_arcane_cataclysm",
  // Holy gap-fill
  SPELL_DIVINE_MIRACLE = "spell_divine_miracle",
  // Shadow gap-fill
  SPELL_SHADOW_PLAGUE = "spell_shadow_plague",
  SPELL_OBLIVION = "spell_oblivion",
  // Poison gap-fill
  SPELL_VENOMOUS_SPRAY = "spell_venomous_spray",
  SPELL_PLAGUE_SWARM = "spell_plague_swarm",
  SPELL_TOXIC_MIASMA = "spell_toxic_miasma",
  SPELL_PANDEMIC = "spell_pandemic",
  // Void gap-fill
  SPELL_VOID_SPARK = "spell_void_spark",
  SPELL_DIMENSIONAL_TEAR = "spell_dimensional_tear",
  SPELL_SINGULARITY = "spell_singularity",
  // Death gap-fill
  SPELL_NECROTIC_TOUCH = "spell_necrotic_touch",
  SPELL_SOUL_REND = "spell_soul_rend",
  SPELL_APOCALYPSE = "spell_apocalypse",
  // Nature gap-fill
  SPELL_THORN_BARRAGE = "spell_thorn_barrage",
  SPELL_NATURES_WRATH = "spell_natures_wrath",
  SPELL_PRIMAL_STORM = "spell_primal_storm",
  // Round 2 — 1 extra spell per tier per magic type
  // Fire
  SPELL_EMBER_BOLT = "spell_ember_bolt",
  SPELL_FLAME_WAVE = "spell_flame_wave",
  SPELL_MAGMA_BURST = "spell_magma_burst",
  SPELL_FIRE_STORM = "spell_fire_storm",
  SPELL_DRAGONS_BREATH = "spell_dragons_breath",
  // Ice
  SPELL_ICE_SHARD = "spell_ice_shard",
  SPELL_FROSTBITE = "spell_frostbite",
  SPELL_ICE_STORM = "spell_ice_storm",
  SPELL_FROZEN_TOMB = "spell_frozen_tomb",
  SPELL_PERMAFROST = "spell_permafrost",
  // Lightning
  SPELL_STATIC_SHOCK = "spell_static_shock",
  SPELL_ARC_BOLT = "spell_arc_bolt",
  SPELL_STORM_SURGE = "spell_storm_surge",
  SPELL_THUNDER_CLAP = "spell_thunder_clap",
  SPELL_ZEUS_WRATH = "spell_zeus_wrath",
  // Earth
  SPELL_MUD_SPLASH = "spell_mud_splash",
  SPELL_ROCK_THROW = "spell_rock_throw",
  SPELL_AVALANCHE = "spell_avalanche",
  SPELL_SEISMIC_SLAM = "spell_seismic_slam",
  SPELL_WORLD_BREAKER = "spell_world_breaker",
  // Arcane
  SPELL_MANA_BOLT = "spell_mana_bolt",
  SPELL_ARCANE_PULSE = "spell_arcane_pulse",
  SPELL_ETHER_BLAST = "spell_ether_blast",
  SPELL_ARCANE_TORRENT = "spell_arcane_torrent",
  SPELL_ASTRAL_RIFT = "spell_astral_rift",
  // Holy
  SPELL_SACRED_STRIKE = "spell_sacred_strike",
  SPELL_HOLY_LIGHT = "spell_holy_light",
  SPELL_JUDGMENT = "spell_judgment",
  SPELL_DIVINE_SHIELD = "spell_divine_shield",
  SPELL_HEAVENS_GATE = "spell_heavens_gate",
  // Shadow
  SPELL_DARK_PULSE = "spell_dark_pulse",
  SPELL_SHADOW_STRIKE = "spell_shadow_strike",
  SPELL_NIGHTMARE = "spell_nightmare",
  SPELL_DARK_VOID = "spell_dark_void",
  SPELL_ECLIPSE = "spell_eclipse",
  // Poison
  SPELL_TOXIC_DART = "spell_toxic_dart",
  SPELL_ACID_SPLASH = "spell_acid_splash",
  SPELL_BLIGHT = "spell_blight",
  SPELL_CORROSION = "spell_corrosion",
  SPELL_PLAGUE_WIND = "spell_plague_wind",
  // Void
  SPELL_PHASE_SHIFT = "spell_phase_shift",
  SPELL_WARP_BOLT = "spell_warp_bolt",
  SPELL_RIFT_STORM = "spell_rift_storm",
  SPELL_VOID_CRUSH = "spell_void_crush",
  SPELL_EVENT_HORIZON = "spell_event_horizon",
  // Death
  SPELL_GRAVE_CHILL = "spell_grave_chill",
  SPELL_WITHER = "spell_wither",
  SPELL_CORPSE_EXPLOSION = "spell_corpse_explosion",
  SPELL_DOOM = "spell_doom",
  SPELL_REQUIEM = "spell_requiem",
  // Nature
  SPELL_VINE_WHIP = "spell_vine_whip",
  SPELL_BRAMBLE_BURST = "spell_bramble_burst",
  SPELL_ENTANGLE = "spell_entangle",
  SPELL_OVERGROWTH = "spell_overgrowth",
  SPELL_GAIAS_FURY = "spell_gaias_fury",
  // Tier 6 & 7 — Epic & Mythic spells
  // Fire
  SPELL_HELLFIRE_ERUPTION = "spell_hellfire_eruption",
  SPELL_SOLAR_FURY = "spell_solar_fury",
  SPELL_SUPERNOVA = "spell_supernova",
  SPELL_WORLD_BLAZE = "spell_world_blaze",
  // Ice
  SPELL_FROZEN_ABYSS = "spell_frozen_abyss",
  SPELL_ARCTIC_DEVASTATION = "spell_arctic_devastation",
  SPELL_ETERNAL_WINTER = "spell_eternal_winter",
  SPELL_ICE_AGE = "spell_ice_age",
  // Lightning
  SPELL_DIVINE_THUNDER = "spell_divine_thunder",
  SPELL_TEMPEST_FURY = "spell_tempest_fury",
  SPELL_RAGNAROK_BOLT = "spell_ragnarok_bolt",
  SPELL_COSMIC_STORM = "spell_cosmic_storm",
  // Earth
  SPELL_CONTINENTAL_CRUSH = "spell_continental_crush",
  SPELL_MAGMA_CORE = "spell_magma_core",
  SPELL_CATACLYSM = "spell_cataclysm",
  SPELL_PLANET_SHATTER = "spell_planet_shatter",
  // Arcane
  SPELL_ARCANE_ANNIHILATION = "spell_arcane_annihilation",
  SPELL_REALITY_WARP = "spell_reality_warp",
  SPELL_COSMIC_RIFT = "spell_cosmic_rift",
  SPELL_OMNISCIENCE = "spell_omniscience",
  // Holy
  SPELL_SERAPHIMS_LIGHT = "spell_seraphims_light",
  SPELL_WRATH_OF_GOD = "spell_wrath_of_god",
  SPELL_ASCENSION = "spell_ascension",
  SPELL_DIVINE_JUDGMENT = "spell_divine_judgment",
  // Shadow
  SPELL_ETERNAL_DARKNESS = "spell_eternal_darkness",
  SPELL_VOID_CORRUPTION = "spell_void_corruption",
  SPELL_ABYSSAL_DOOM = "spell_abyssal_doom",
  SPELL_SHADOW_ANNIHILATION = "spell_shadow_annihilation",
  // Poison
  SPELL_EXTINCTION_CLOUD = "spell_extinction_cloud",
  SPELL_PLAGUE_OF_AGES = "spell_plague_of_ages",
  SPELL_DEATH_BLOSSOM = "spell_death_blossom",
  SPELL_TOXIC_APOCALYPSE = "spell_toxic_apocalypse",
  // Void
  SPELL_REALITY_COLLAPSE = "spell_reality_collapse",
  SPELL_DIMENSIONAL_IMPLOSION = "spell_dimensional_implosion",
  SPELL_ENTROPY = "spell_entropy",
  SPELL_END_OF_ALL = "spell_end_of_all",
  // Death
  SPELL_MASS_EXTINCTION = "spell_mass_extinction",
  SPELL_GRIM_HARVEST = "spell_grim_harvest",
  SPELL_ARMAGEDDON = "spell_armageddon",
  SPELL_DEATH_INCARNATE = "spell_death_incarnate",
  // Nature
  SPELL_WORLD_TREES_FURY = "spell_world_trees_fury",
  SPELL_ELEMENTAL_CHAOS = "spell_elemental_chaos",
  SPELL_GENESIS_STORM = "spell_genesis_storm",
  SPELL_WRATH_OF_GAIA = "spell_wrath_of_gaia",
  // Extra T1 & T2 spells
  // Fire
  SPELL_CANDLE_FLAME = "spell_candle_flame",
  SPELL_HEAT_WAVE = "spell_heat_wave",
  SPELL_SCORCH = "spell_scorch",
  // Ice
  SPELL_CHILL_TOUCH = "spell_chill_touch",
  SPELL_ICICLE = "spell_icicle",
  SPELL_COLD_SNAP = "spell_cold_snap",
  // Lightning
  SPELL_JOLT = "spell_jolt",
  SPELL_ZAP = "spell_zap",
  SPELL_SHOCK_WAVE = "spell_shock_wave",
  // Earth
  SPELL_PEBBLE_TOSS = "spell_pebble_toss",
  SPELL_DUST_DEVIL = "spell_dust_devil",
  SPELL_TREMOR = "spell_tremor",
  // Arcane
  SPELL_MAGIC_DART = "spell_magic_dart",
  SPELL_SPARKLE_BURST = "spell_sparkle_burst",
  SPELL_ARCANE_BOLT = "spell_arcane_bolt",
  // Holy
  SPELL_HOLY_TOUCH = "spell_holy_touch",
  SPELL_SMITE = "spell_smite",
  SPELL_CONSECRATE = "spell_consecrate",
  // Shadow
  SPELL_DARK_WHISPER = "spell_dark_whisper",
  SPELL_SHADOW_FLICKER = "spell_shadow_flicker",
  SPELL_NIGHT_SHADE = "spell_night_shade",
  // Poison
  SPELL_STING = "spell_sting",
  SPELL_NOXIOUS_PUFF = "spell_noxious_puff",
  SPELL_VENOM_STRIKE = "spell_venom_strike",
  // Void
  SPELL_NULL_BOLT = "spell_null_bolt",
  SPELL_VOID_TOUCH = "spell_void_touch",
  SPELL_RIFT_PULSE = "spell_rift_pulse",
  // Death
  SPELL_DEATHS_GRASP = "spell_deaths_grasp",
  SPELL_BONE_CHILL = "spell_bone_chill",
  SPELL_DRAIN_LIFE = "spell_drain_life",
  // Nature
  SPELL_LEAF_BLADE = "spell_leaf_blade",
  SPELL_THORN_PRICK = "spell_thorn_prick",
  SPELL_ROOT_SNARE = "spell_root_snare",
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
  DRAFT = "draft", // Battlefield mode: unit selection phase before battle
}

export enum GameMode {
  STANDARD = "standard",
  DEATHMATCH = "deathmatch",
  BATTLEFIELD = "battlefield",
  CAMPAIGN = "campaign",

  WORLD = "world",
  WAVE = "wave",
  RPG = "rpg",
  SURVIVOR = "survivor",
  COLOSSEUM = "colosseum",
  DUEL = "duel",
  MEDIEVAL_GTA = "medieval_gta",
  WARBAND = "warband",
  TEKKEN = "tekken",
  DRAGOON = "dragoon",
  THREE_DRAGON = "three_dragon",
  MEDIEVAL_GTA_3D = "medieval_gta_3d",
  DIABLO = "diablo",
  MAGE_WARS = "mage_wars",
  WARBAND_CAMPAIGN = "warband_campaign",
  GAME = "game",
  GRAIL_BALL = "grail_ball",
  GRAIL_MANAGER = "grail_manager",
  ARTHURIAN_RPG = "arthurian_rpg",
  RIFT_WIZARD = "rift_wizard",
  SETTLERS = "settlers",
  CAESAR = "caesar",
  CAMELOT_CRAFT = "camelot_craft",
  EAGLE_FLIGHT = "eagle_flight",
  TERRARIA = "terraria",
  CIVILIZATION = "civilization",
  MORGAN = "morgan",
  JOUSTING = "jousting",
  EXODUS = "exodus",
  COVEN = "coven",
  CARAVAN = "caravan",
  SHADOWHAND = "shadowhand",
  ALCHEMIST = "alchemist",
  SIEGE = "siege",
  TAVERN = "tavern",
  HUNT = "hunt",
  RACE = "race",
  ROUND_TABLE = "round_table",
  CAMELOT_ASCENT = "camelot_ascent",
  GRAIL_BLOCKS = "grail_blocks",
  GRAIL_DERBY = "grail_derby",
  GRAIL_BREAKER = "grail_breaker",
  NECROMANCER = "necromancer",
  BARD = "bard",
  LABYRINTH = "labyrinth",
  PLAGUE = "plague",
  PLAGUE_RT = "plague_rt",
  WYRM = "wyrm",
  PRINCE_CAMELOT = "prince_camelot",
  PHANTOM = "phantom",
  CONJURER = "conjurer",
  FLUX = "flux",
  ECHO = "echo",
  VOID_KNIGHT = "void_knight",
  LAST_FLAME = "last_flame",
  GRAVITON = "graviton",
  GRAIL_QUEST = "grail_quest",
  MERLIN_DUEL = "merlin_duel",
  KOTH = "koth",
  RUNEBLADE = "runeblade",
  CHRONOMANCER = "chronomancer",
  SHAPESHIFTER = "shapeshifter",
  VOIDWALKER = "voidwalker",
  AGE_OF_WONDERS = "age_of_wonders",
  LANCELOT = "lancelot",
  SEWER_SPLASH = "sewer_splash",
  LAKE_OF_AVALON = "lake_of_avalon",
  TREBUCHET = "trebuchet",
  GRAIL_KEEPER = "grail_keeper",
  GARGOYLE = "gargoyle",
  LOT = "lot",
  GUINEVERE = "guinevere",
  FOREST = "forest",
  PENDULUM = "pendulum",
  LEVIATHAN = "leviathan",
  SWORD_OF_AVALON = "sword_of_avalon",
  DEPTHS = "depths",
  CHARIOT = "chariot",
  BEARING = "bearing",
  MATRIX = "matrix",
  KNIGHT_BALL = "knight_ball",
  EPSILON = "epsilon",
  GRAND = "grand",
  RAMPART = "rampart",
  IGWAINE = "igwaine",
  KINGDOM = "kingdom",
  WORMS_3D = "worms_3d",
  WORMS_2D = "worms_2d",
}

// ---------------------------------------------------------------------------
// Tekken fighter mode enums
// ---------------------------------------------------------------------------

export enum TekkenPhase {
  MAIN_MENU = "tekken_main_menu",
  CHAR_SELECT = "tekken_char_select",
  INTRO = "tekken_intro",
  FIGHTING = "tekken_fighting",
  ROUND_END = "tekken_round_end",
  MATCH_END = "tekken_match_end",
}

export enum TekkenFighterState {
  IDLE = "idle",
  WALK_FORWARD = "walk_forward",
  WALK_BACK = "walk_back",
  CROUCH = "crouch",
  CROUCH_IDLE = "crouch_idle",
  SIDESTEP_UP = "sidestep_up",
  SIDESTEP_DOWN = "sidestep_down",
  ATTACK = "attack",
  BLOCK_STAND = "block_stand",
  BLOCK_CROUCH = "block_crouch",
  HIT_STUN_HIGH = "hit_stun_high",
  HIT_STUN_MID = "hit_stun_mid",
  HIT_STUN_LOW = "hit_stun_low",
  JUGGLE = "juggle",
  KNOCKDOWN = "knockdown",
  GROUND_ROLL = "ground_roll",
  GET_UP = "get_up",
  GET_UP_ATTACK = "get_up_attack",
  DASH_FORWARD = "dash_forward",
  DASH_BACK = "dash_back",
  GRAB = "grab",
  GRABBED = "grabbed",
  RAGE_ART = "rage_art",
  WALL_SPLAT = "wall_splat",
  VICTORY = "victory",
  DEFEAT = "defeat",
}

export enum TekkenAttackHeight {
  HIGH = "high",
  MID = "mid",
  LOW = "low",
  OVERHEAD = "overhead",
}

export enum TekkenLimb {
  LEFT_PUNCH = "left_punch",
  RIGHT_PUNCH = "right_punch",
  LEFT_KICK = "left_kick",
  RIGHT_KICK = "right_kick",
}

// ---------------------------------------------------------------------------
// Colosseum mode enums
// ---------------------------------------------------------------------------

export enum ColosseumPhase {
  MAIN_MENU = "colosseum_main_menu",
  PARTY_SETUP = "colosseum_party_setup",
  TOURNAMENT_BRACKET = "colosseum_tournament_bracket",
  PRE_MATCH = "colosseum_pre_match",
  BATTLE_TURN = "colosseum_battle_turn",
  BATTLE_AUTO = "colosseum_battle_auto",
  SPECTATE = "colosseum_spectate",
  POST_MATCH = "colosseum_post_match",
  TOURNAMENT_RESULTS = "colosseum_tournament_results",
  RANKINGS = "colosseum_rankings",
}

// ---------------------------------------------------------------------------
// Duel mode enums
// ---------------------------------------------------------------------------

export enum DuelPhase {
  CHAR_SELECT = "duel_char_select",
  ARENA_SELECT = "duel_arena_select",
  INTRO = "duel_intro",
  FIGHTING = "duel_fighting",
  ROUND_END = "duel_round_end",
  MATCH_END = "duel_match_end",
}

export enum DuelFighterState {
  IDLE = "idle",
  WALK_FORWARD = "walk_forward",
  WALK_BACK = "walk_back",
  CROUCH = "crouch",
  CROUCH_IDLE = "crouch_idle",
  JUMP = "jump",
  JUMP_FORWARD = "jump_forward",
  JUMP_BACK = "jump_back",
  ATTACK = "attack",
  BLOCK_STAND = "block_stand",
  BLOCK_CROUCH = "block_crouch",
  HIT_STUN = "hit_stun",
  KNOCKDOWN = "knockdown",
  GET_UP = "get_up",
  DASH_FORWARD = "dash_forward",
  DASH_BACK = "dash_back",
  GRAB = "grab",
  GRABBED = "grabbed",
  VICTORY = "victory",
  DEFEAT = "defeat",
}

export enum AttackHeight {
  HIGH = "high",
  LOW = "low",
  MID = "mid",
  OVERHEAD = "overhead",
}

// ---------------------------------------------------------------------------
// RPG mode enums
// ---------------------------------------------------------------------------

export enum RPGPhase {
  MAIN_MENU = "main_menu",
  OVERWORLD = "overworld",
  DUNGEON = "dungeon",
  BATTLE_TURN = "battle_turn",
  BATTLE_AUTO = "battle_auto",
  TOWN_MENU = "town_menu",
  OPTIONS = "options",
  GAME_OVER = "game_over",
}

export enum DungeonTileType {
  WALL = "wall",
  FLOOR = "floor",
  DOOR = "door",
  STAIRS_DOWN = "stairs_down",
  STAIRS_UP = "stairs_up",
  CHEST = "chest",
  TRAP = "trap",
}

export enum TurnBattleAction {
  ATTACK = "attack",
  ABILITY = "ability",
  DEFEND = "defend",
  ITEM = "item",
  FLEE = "flee",
  SWAP_ROW = "swap_row",
  LIMIT_BREAK = "limit_break",
}

export enum RPGElementType {
  PHYSICAL = "physical",
  FIRE = "fire",
  COLD = "cold",
  LIGHTNING = "lightning",
  NATURE = "nature",
  HOLY = "holy",
  DARK = "dark",
}

export enum TurnBattlePhase {
  INITIATIVE = "initiative",
  SELECT_ACTION = "select_action",
  SELECT_TARGET = "select_target",
  EXECUTE = "execute",
  ENEMY_TURN = "enemy_turn",
  CHECK_END = "check_end",
  VICTORY = "victory",
  DEFEAT = "defeat",
  FLED = "fled",
}

export enum OverworldTileType {
  GRASS = "grass",
  FOREST = "forest",
  MOUNTAIN = "mountain",
  WATER = "water",
  PATH = "path",
  SAND = "sand",
  SNOW = "snow",
}

export enum ArthurianPhase {
  MAIN_MENU = "arthurian_main_menu",
  CHARACTER_CREATE = "arthurian_character_create",
  PLAYING = "arthurian_playing",
  INVENTORY = "arthurian_inventory",
  CHARACTER_SHEET = "arthurian_character_sheet",
  MAP = "arthurian_map",
  DIALOGUE = "arthurian_dialogue",
  SHOP = "arthurian_shop",
  DEAD = "arthurian_dead",
  LOADING = "arthurian_loading",
  HELP = "arthurian_help",
  DUNGEON = "arthurian_dungeon",
  CRAFTING = "arthurian_crafting",
}

export enum ArthurianClass {
  KNIGHT = "knight",
  RANGER = "ranger",
  MAGE = "mage",
  ROGUE = "rogue",
  PALADIN = "paladin",
  DRUID = "druid",
}

// ---------------------------------------------------------------------------
// Campaign difficulty tiers
// ---------------------------------------------------------------------------

export enum CampaignDifficulty {
  NORMAL = "normal",
  HARD = "hard",
  NIGHTMARE = "nightmare",
}

// ---------------------------------------------------------------------------
// Campaign achievement conditions
// ---------------------------------------------------------------------------

export enum CampaignAchievementCondition {
  NO_DAMAGE = "no_damage",
  SPEED_CLEAR = "speed_clear",
  NO_BUILDINGS_LOST = "no_buildings_lost",
  NO_UNITS_LOST = "no_units_lost",
  GOLD_HOARDER = "gold_hoarder",
}

// ---------------------------------------------------------------------------
// AI Personality (Standard autobattler)
// ---------------------------------------------------------------------------

export enum AIPersonality {
  BALANCED = "balanced",
  AGGRESSIVE = "aggressive",
  DEFENSIVE = "defensive",
  ECONOMY = "economy",
}

// ---------------------------------------------------------------------------
// Terrain types (Standard autobattler)
// ---------------------------------------------------------------------------

export enum TerrainType {
  PLAINS = "plains",
  FOREST = "forest",
  RIVER = "river",
  HIGH_GROUND = "high_ground",
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
  HILLS = "hills",
  MOUNTAINS = "mountains",
  DESERT = "desert",
}
