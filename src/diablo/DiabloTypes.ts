// ============================================================
// DiabloTypes.ts — Complete type definitions for a Diablo 3-style ARPG
// ============================================================

// ── Enums ────────────────────────────────────────────────────

export enum DiabloClass {
  WARRIOR = 'WARRIOR',
  MAGE = 'MAGE',
  RANGER = 'RANGER',
  PALADIN = 'PALADIN',
  NECROMANCER = 'NECROMANCER',
  ASSASSIN = 'ASSASSIN',
}

export enum DiabloMapId {
  FOREST = 'FOREST',
  ELVEN_VILLAGE = 'ELVEN_VILLAGE',
  NECROPOLIS_DUNGEON = 'NECROPOLIS_DUNGEON',
  VOLCANIC_WASTES = 'VOLCANIC_WASTES',
  ABYSSAL_RIFT = 'ABYSSAL_RIFT',
  DRAGONS_SANCTUM = 'DRAGONS_SANCTUM',
  SUNSCORCH_DESERT = 'SUNSCORCH_DESERT',
  EMERALD_GRASSLANDS = 'EMERALD_GRASSLANDS',
  // New maps
  WHISPERING_MARSH = 'WHISPERING_MARSH',
  CRYSTAL_CAVERNS = 'CRYSTAL_CAVERNS',
  FROZEN_TUNDRA = 'FROZEN_TUNDRA',
  HAUNTED_CATHEDRAL = 'HAUNTED_CATHEDRAL',
  THORNWOOD_THICKET = 'THORNWOOD_THICKET',
  CLOCKWORK_FOUNDRY = 'CLOCKWORK_FOUNDRY',
  CRIMSON_CITADEL = 'CRIMSON_CITADEL',
  STORMSPIRE_PEAK = 'STORMSPIRE_PEAK',
  SHADOW_REALM = 'SHADOW_REALM',
  PRIMORDIAL_ABYSS = 'PRIMORDIAL_ABYSS',
  // New maps wave 2
  MOONLIT_GROVE = 'MOONLIT_GROVE',
  CORAL_DEPTHS = 'CORAL_DEPTHS',
  ANCIENT_LIBRARY = 'ANCIENT_LIBRARY',
  JADE_TEMPLE = 'JADE_TEMPLE',
  ASHEN_BATTLEFIELD = 'ASHEN_BATTLEFIELD',
  FUNGAL_DEPTHS = 'FUNGAL_DEPTHS',
  OBSIDIAN_FORTRESS = 'OBSIDIAN_FORTRESS',
  CELESTIAL_RUINS = 'CELESTIAL_RUINS',
  INFERNAL_THRONE = 'INFERNAL_THRONE',
  ASTRAL_VOID = 'ASTRAL_VOID',
  // New maps wave 3
  SHATTERED_COLOSSEUM = 'SHATTERED_COLOSSEUM',
  PETRIFIED_GARDEN = 'PETRIFIED_GARDEN',
  SUNKEN_CITADEL = 'SUNKEN_CITADEL',
  WYRMSCAR_CANYON = 'WYRMSCAR_CANYON',
  PLAGUEROT_SEWERS = 'PLAGUEROT_SEWERS',
  ETHEREAL_SANCTUM = 'ETHEREAL_SANCTUM',
  IRON_WASTES = 'IRON_WASTES',
  BLIGHTED_THRONE = 'BLIGHTED_THRONE',
  CHRONO_LABYRINTH = 'CHRONO_LABYRINTH',
  ELDRITCH_NEXUS = 'ELDRITCH_NEXUS',
  CAMELOT = 'CAMELOT',
  // City maps
  CITY_RUINS = 'CITY_RUINS',
  CITY = 'CITY',
}

export enum DiabloDifficulty {
  DAGGER = 'DAGGER',
  CLEAVER = 'CLEAVER',
  LONGSWORD = 'LONGSWORD',
  BASTARD_SWORD = 'BASTARD_SWORD',
  CLAYMORE = 'CLAYMORE',
  FLAMBERGE = 'FLAMBERGE',
}

export enum DiabloPhase {
  CLASS_SELECT = 'CLASS_SELECT',
  MAP_SELECT = 'MAP_SELECT',
  INVENTORY = 'INVENTORY',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY',
}

export enum TimeOfDay {
  DAY = "day",
  DAWN = "dawn",
  DUSK = "dusk",
  NIGHT = "night",
}

export enum ItemRarity {
  COMMON = 'COMMON',           // white
  UNCOMMON = 'UNCOMMON',       // green
  RARE = 'RARE',               // blue
  EPIC = 'EPIC',               // purple
  LEGENDARY = 'LEGENDARY',     // orange
  MYTHIC = 'MYTHIC',           // red
  DIVINE = 'DIVINE',           // gold
}

export enum ItemSlot {
  HELMET = 'HELMET',
  BODY = 'BODY',
  GAUNTLETS = 'GAUNTLETS',
  LEGS = 'LEGS',
  FEET = 'FEET',
  ACCESSORY_1 = 'ACCESSORY_1',
  ACCESSORY_2 = 'ACCESSORY_2',
  WEAPON = 'WEAPON',
  LANTERN = 'LANTERN',
}

export enum ItemType {
  SWORD = 'SWORD',
  AXE = 'AXE',
  MACE = 'MACE',
  BOW = 'BOW',
  STAFF = 'STAFF',
  WAND = 'WAND',
  DAGGER = 'DAGGER',
  SHIELD = 'SHIELD',
  HELMET = 'HELMET',
  CHEST_ARMOR = 'CHEST_ARMOR',
  GAUNTLETS = 'GAUNTLETS',
  LEG_ARMOR = 'LEG_ARMOR',
  BOOTS = 'BOOTS',
  RING = 'RING',
  AMULET = 'AMULET',
  NECKLACE = 'NECKLACE',
  LANTERN = 'LANTERN',
}

export enum EnemyType {
  // Forest enemies
  WOLF = 'WOLF',
  BANDIT = 'BANDIT',
  BEAR = 'BEAR',
  FOREST_SPIDER = 'FOREST_SPIDER',
  TREANT = 'TREANT',
  // Elven Village enemies
  CORRUPTED_ELF = 'CORRUPTED_ELF',
  DARK_RANGER = 'DARK_RANGER',
  SHADOW_BEAST = 'SHADOW_BEAST',
  // Necropolis Dungeon enemies
  SKELETON_WARRIOR = 'SKELETON_WARRIOR',
  ZOMBIE = 'ZOMBIE',
  NECROMANCER = 'NECROMANCER',
  BONE_GOLEM = 'BONE_GOLEM',
  WRAITH = 'WRAITH',
  // Volcanic Wastes enemies
  FIRE_IMP = 'FIRE_IMP',
  LAVA_ELEMENTAL = 'LAVA_ELEMENTAL',
  INFERNAL_KNIGHT = 'INFERNAL_KNIGHT',
  MAGMA_SERPENT = 'MAGMA_SERPENT',
  MOLTEN_COLOSSUS = 'MOLTEN_COLOSSUS',
  // Abyssal Rift enemies
  VOID_STALKER = 'VOID_STALKER',
  SHADOW_WEAVER = 'SHADOW_WEAVER',
  ABYSSAL_HORROR = 'ABYSSAL_HORROR',
  RIFT_WALKER = 'RIFT_WALKER',
  ENTROPY_LORD = 'ENTROPY_LORD',
  // Dragon's Sanctum enemies
  DRAGONKIN_WARRIOR = 'DRAGONKIN_WARRIOR',
  WYRM_PRIEST = 'WYRM_PRIEST',
  DRAKE_GUARDIAN = 'DRAKE_GUARDIAN',
  DRAGON_WHELP = 'DRAGON_WHELP',
  ELDER_DRAGON = 'ELDER_DRAGON',
  // Desert enemies
  SAND_SCORPION = 'SAND_SCORPION',
  DESERT_BANDIT = 'DESERT_BANDIT',
  SAND_WURM = 'SAND_WURM',
  DUST_WRAITH = 'DUST_WRAITH',
  SAND_GOLEM = 'SAND_GOLEM',
  // Grassland enemies
  WILD_BOAR = 'WILD_BOAR',
  PLAINS_RAIDER = 'PLAINS_RAIDER',
  GIANT_HAWK = 'GIANT_HAWK',
  BISON_BEAST = 'BISON_BEAST',
  CENTAUR_WARCHIEF = 'CENTAUR_WARCHIEF',
  // Whispering Marsh enemies
  BOG_LURKER = 'BOG_LURKER',
  MARSH_HAG = 'MARSH_HAG',
  TOXIC_TOAD = 'TOXIC_TOAD',
  SWAMP_VINE = 'SWAMP_VINE',
  HYDRA_MATRIARCH = 'HYDRA_MATRIARCH',
  // Crystal Caverns enemies
  CRYSTAL_SPIDER = 'CRYSTAL_SPIDER',
  GEM_GOLEM = 'GEM_GOLEM',
  CAVE_BAT_SWARM = 'CAVE_BAT_SWARM',
  QUARTZ_ELEMENTAL = 'QUARTZ_ELEMENTAL',
  PRISMATIC_WYRM = 'PRISMATIC_WYRM',
  // Frozen Tundra enemies
  FROST_WOLF = 'FROST_WOLF',
  ICE_WRAITH = 'ICE_WRAITH',
  YETI = 'YETI',
  FROZEN_REVENANT = 'FROZEN_REVENANT',
  GLACIAL_TITAN = 'GLACIAL_TITAN',
  // Haunted Cathedral enemies
  PHANTOM_KNIGHT = 'PHANTOM_KNIGHT',
  GARGOYLE = 'GARGOYLE',
  CURSED_PRIEST = 'CURSED_PRIEST',
  SHADOW_ACOLYTE = 'SHADOW_ACOLYTE',
  CATHEDRAL_DEMON = 'CATHEDRAL_DEMON',
  // Thornwood Thicket enemies
  THORN_CRAWLER = 'THORN_CRAWLER',
  BLIGHT_SPRITE = 'BLIGHT_SPRITE',
  FUNGAL_BRUTE = 'FUNGAL_BRUTE',
  ROTWOOD_LICH = 'ROTWOOD_LICH',
  THORNMOTHER = 'THORNMOTHER',
  // Clockwork Foundry enemies
  CLOCKWORK_SOLDIER = 'CLOCKWORK_SOLDIER',
  STEAM_GOLEM = 'STEAM_GOLEM',
  GEAR_SPIDER = 'GEAR_SPIDER',
  FORGE_MASTER = 'FORGE_MASTER',
  IRON_COLOSSUS = 'IRON_COLOSSUS',
  // Crimson Citadel enemies
  BLOOD_KNIGHT = 'BLOOD_KNIGHT',
  CRIMSON_MAGE = 'CRIMSON_MAGE',
  GARGOYLE_SENTINEL = 'GARGOYLE_SENTINEL',
  BLOOD_FIEND = 'BLOOD_FIEND',
  VAMPIRE_LORD = 'VAMPIRE_LORD',
  // Stormspire Peak enemies
  STORM_HARPY = 'STORM_HARPY',
  THUNDER_ELEMENTAL = 'THUNDER_ELEMENTAL',
  LIGHTNING_DRAKE = 'LIGHTNING_DRAKE',
  WIND_SHAMAN = 'WIND_SHAMAN',
  TEMPEST_TITAN = 'TEMPEST_TITAN',
  // Shadow Realm enemies
  NIGHTMARE_STALKER = 'NIGHTMARE_STALKER',
  DREAD_PHANTOM = 'DREAD_PHANTOM',
  SOUL_DEVOURER = 'SOUL_DEVOURER',
  SHADOW_COLOSSUS = 'SHADOW_COLOSSUS',
  NIGHTMARE_KING = 'NIGHTMARE_KING',
  // Primordial Abyss enemies
  ABYSSAL_LEVIATHAN = 'ABYSSAL_LEVIATHAN',
  VOID_REAPER = 'VOID_REAPER',
  CHAOS_SPAWN = 'CHAOS_SPAWN',
  ELDER_VOID_FIEND = 'ELDER_VOID_FIEND',
  PRIMORDIAL_ONE = 'PRIMORDIAL_ONE',
  // Moonlit Grove enemies
  MOONLIT_SPRITE = 'MOONLIT_SPRITE',
  FAE_DANCER = 'FAE_DANCER',
  SHADOW_STAG = 'SHADOW_STAG',
  LUNAR_MOTH = 'LUNAR_MOTH',
  MOONBEAST_ALPHA = 'MOONBEAST_ALPHA',
  // Coral Depths enemies
  REEF_CRAWLER = 'REEF_CRAWLER',
  SIREN_WITCH = 'SIREN_WITCH',
  ABYSSAL_ANGLER = 'ABYSSAL_ANGLER',
  BARNACLE_GOLEM = 'BARNACLE_GOLEM',
  LEVIATHAN_HATCHLING = 'LEVIATHAN_HATCHLING',
  // Ancient Library enemies
  ANIMATED_TOME = 'ANIMATED_TOME',
  INK_WRAITH = 'INK_WRAITH',
  SCROLL_GOLEM = 'SCROLL_GOLEM',
  ARCANE_CURATOR = 'ARCANE_CURATOR',
  FORBIDDEN_GRIMOIRE = 'FORBIDDEN_GRIMOIRE',
  // Jade Temple enemies
  TEMPLE_GUARDIAN = 'TEMPLE_GUARDIAN',
  VINE_SERPENT = 'VINE_SERPENT',
  JADE_CONSTRUCT = 'JADE_CONSTRUCT',
  JUNGLE_SHAMAN = 'JUNGLE_SHAMAN',
  ANCIENT_IDOL = 'ANCIENT_IDOL',
  // Ashen Battlefield enemies
  FALLEN_SOLDIER = 'FALLEN_SOLDIER',
  WAR_SPECTER = 'WAR_SPECTER',
  SIEGE_WRAITH = 'SIEGE_WRAITH',
  ASHEN_COMMANDER = 'ASHEN_COMMANDER',
  DREAD_GENERAL = 'DREAD_GENERAL',
  // Fungal Depths enemies
  SPORE_CRAWLER = 'SPORE_CRAWLER',
  MYCELIUM_HORROR = 'MYCELIUM_HORROR',
  TOXIC_SHROOM = 'TOXIC_SHROOM',
  FUNGAL_SHAMBLER = 'FUNGAL_SHAMBLER',
  SPOREQUEEN = 'SPOREQUEEN',
  // Obsidian Fortress enemies
  OBSIDIAN_SENTINEL = 'OBSIDIAN_SENTINEL',
  HELLFIRE_ARCHER = 'HELLFIRE_ARCHER',
  DARK_INQUISITOR = 'DARK_INQUISITOR',
  DOOM_HOUND = 'DOOM_HOUND',
  OBSIDIAN_WARLORD = 'OBSIDIAN_WARLORD',
  // Celestial Ruins enemies
  STAR_WISP = 'STAR_WISP',
  ASTRAL_GUARDIAN = 'ASTRAL_GUARDIAN',
  COMET_DRAKE = 'COMET_DRAKE',
  VOID_MONK = 'VOID_MONK',
  CELESTIAL_ARCHON = 'CELESTIAL_ARCHON',
  // Infernal Throne enemies
  PIT_FIEND = 'PIT_FIEND',
  HELLBORN_MAGE = 'HELLBORN_MAGE',
  INFERNAL_BRUTE = 'INFERNAL_BRUTE',
  SOUL_COLLECTOR = 'SOUL_COLLECTOR',
  DEMON_OVERLORD = 'DEMON_OVERLORD',
  // Astral Void enemies
  REALITY_SHREDDER = 'REALITY_SHREDDER',
  TEMPORAL_WRAITH = 'TEMPORAL_WRAITH',
  DIMENSION_WEAVER = 'DIMENSION_WEAVER',
  VOID_TITAN = 'VOID_TITAN',
  ASTRAL_ANNIHILATOR = 'ASTRAL_ANNIHILATOR',
  // Shattered Colosseum enemies
  SPECTRAL_GLADIATOR = 'SPECTRAL_GLADIATOR',
  ARENA_BEAST = 'ARENA_BEAST',
  GHOSTLY_RETIARIUS = 'GHOSTLY_RETIARIUS',
  CURSED_CHAMPION = 'CURSED_CHAMPION',
  COLOSSEUM_WARDEN = 'COLOSSEUM_WARDEN',
  // Petrified Garden enemies
  STONE_NYMPH = 'STONE_NYMPH',
  BASILISK_HATCHLING = 'BASILISK_HATCHLING',
  GRANITE_GOLEM = 'GRANITE_GOLEM',
  PETRIFIED_TREANT = 'PETRIFIED_TREANT',
  GORGON_MATRIARCH = 'GORGON_MATRIARCH',
  // Sunken Citadel enemies
  DROWNED_KNIGHT = 'DROWNED_KNIGHT',
  DEPTH_LURKER = 'DEPTH_LURKER',
  TIDAL_PHANTOM = 'TIDAL_PHANTOM',
  CORAL_ABOMINATION = 'CORAL_ABOMINATION',
  ABYSSAL_WARDEN = 'ABYSSAL_WARDEN',
  // Wyrmscar Canyon enemies
  CANYON_RAPTOR = 'CANYON_RAPTOR',
  SCORCH_WYVERN = 'SCORCH_WYVERN',
  DRAKE_BROODLING = 'DRAKE_BROODLING',
  WYRMFIRE_SHAMAN = 'WYRMFIRE_SHAMAN',
  CANYON_WYRMLORD = 'CANYON_WYRMLORD',
  // Plaguerot Sewers enemies
  SEWER_RAT_SWARM = 'SEWER_RAT_SWARM',
  PLAGUE_BEARER = 'PLAGUE_BEARER',
  BILE_ELEMENTAL = 'BILE_ELEMENTAL',
  AFFLICTED_BRUTE = 'AFFLICTED_BRUTE',
  PESTILENCE_LORD = 'PESTILENCE_LORD',
  // Ethereal Sanctum enemies
  PHASE_WALKER = 'PHASE_WALKER',
  ETHEREAL_SENTINEL = 'ETHEREAL_SENTINEL',
  SPIRIT_WEAVER = 'SPIRIT_WEAVER',
  PLANAR_GUARDIAN = 'PLANAR_GUARDIAN',
  SANCTUM_OVERSEER = 'SANCTUM_OVERSEER',
  // Iron Wastes enemies
  SCRAP_AUTOMATON = 'SCRAP_AUTOMATON',
  RUST_REVENANT = 'RUST_REVENANT',
  SIEGE_CRAWLER = 'SIEGE_CRAWLER',
  WAR_ENGINE_CORE = 'WAR_ENGINE_CORE',
  IRON_JUGGERNAUT = 'IRON_JUGGERNAUT',
  // Blighted Throne enemies
  CORRUPTED_ROYAL_GUARD = 'CORRUPTED_ROYAL_GUARD',
  BLIGHT_COURTIER = 'BLIGHT_COURTIER',
  THRONE_REVENANT = 'THRONE_REVENANT',
  DARK_HERALD = 'DARK_HERALD',
  BLIGHTED_KING = 'BLIGHTED_KING',
  // Chrono Labyrinth enemies
  TEMPORAL_ECHO = 'TEMPORAL_ECHO',
  CLOCKWORK_MINOTAUR = 'CLOCKWORK_MINOTAUR',
  PARADOX_MAGE = 'PARADOX_MAGE',
  TIME_DEVOURER = 'TIME_DEVOURER',
  CHRONO_TITAN = 'CHRONO_TITAN',
  // Eldritch Nexus enemies
  ELDRITCH_TENDRIL = 'ELDRITCH_TENDRIL',
  MIND_FLAYER = 'MIND_FLAYER',
  NEXUS_ABERRATION = 'NEXUS_ABERRATION',
  DIMENSIONAL_HORROR = 'DIMENSIONAL_HORROR',
  ELDRITCH_OVERMIND = 'ELDRITCH_OVERMIND',
  // Forest extra enemies
  MOSSY_LURKER = 'MOSSY_LURKER',
  DIRE_STAG = 'DIRE_STAG',
  WOODLAND_WISP = 'WOODLAND_WISP',
  // Elven Village extra enemies
  CORRUPTED_SENTINEL = 'CORRUPTED_SENTINEL',
  GLOOM_ARCHER = 'GLOOM_ARCHER',
  FEY_ABOMINATION = 'FEY_ABOMINATION',
  // Necropolis extra enemies
  CRYPT_SHADE = 'CRYPT_SHADE',
  BONE_ARCHER = 'BONE_ARCHER',
  LICH_ACOLYTE = 'LICH_ACOLYTE',
  // Volcanic Wastes extra enemies
  EMBER_FIEND = 'EMBER_FIEND',
  VOLCANIC_SCORPION = 'VOLCANIC_SCORPION',
  ASH_WRAITH = 'ASH_WRAITH',
  // Abyssal Rift extra enemies
  VOID_TENDRIL = 'VOID_TENDRIL',
  RIFT_SCREAMER = 'RIFT_SCREAMER',
  DIMENSIONAL_STALKER = 'DIMENSIONAL_STALKER',
  // Dragon's Sanctum extra enemies
  SCALED_SORCERER = 'SCALED_SORCERER',
  DRAGONSPAWN_BERSERKER = 'DRAGONSPAWN_BERSERKER',
  FLAME_HERALD = 'FLAME_HERALD',
  // Desert extra enemies
  DUNE_REAVER = 'DUNE_REAVER',
  SANDSTORM_ELEMENTAL = 'SANDSTORM_ELEMENTAL',
  OASIS_SERPENT = 'OASIS_SERPENT',
  // Grassland extra enemies
  STEPPE_STALKER = 'STEPPE_STALKER',
  THUNDER_RAM = 'THUNDER_RAM',
  PRAIRIE_WITCH = 'PRAIRIE_WITCH',
  // Whispering Marsh extra enemies
  FEN_CRAWLER = 'FEN_CRAWLER',
  MIRE_SPECTER = 'MIRE_SPECTER',
  LEECH_SWARM = 'LEECH_SWARM',
  // Crystal Caverns extra enemies
  SHARD_SENTINEL = 'SHARD_SENTINEL',
  GEODE_BEETLE = 'GEODE_BEETLE',
  CRYSTAL_SHADE = 'CRYSTAL_SHADE',
  // Frozen Tundra extra enemies
  PERMAFROST_SPIDER = 'PERMAFROST_SPIDER',
  BLIZZARD_PHANTOM = 'BLIZZARD_PHANTOM',
  FROST_TROLL = 'FROST_TROLL',
  // Haunted Cathedral extra enemies
  BELL_WRAITH = 'BELL_WRAITH',
  DESECRATED_MONK = 'DESECRATED_MONK',
  STAINED_GLASS_GOLEM = 'STAINED_GLASS_GOLEM',
  // Thornwood Thicket extra enemies
  BRIAR_WOLF = 'BRIAR_WOLF',
  SPORE_MOTH = 'SPORE_MOTH',
  NETTLE_ELEMENTAL = 'NETTLE_ELEMENTAL',
  // Clockwork Foundry extra enemies
  BRASS_BEETLE = 'BRASS_BEETLE',
  PISTON_GOLEM = 'PISTON_GOLEM',
  ARC_DRONE = 'ARC_DRONE',
  // Crimson Citadel extra enemies
  BLOODTHORN_BAT = 'BLOODTHORN_BAT',
  SCARLET_ASSASSIN = 'SCARLET_ASSASSIN',
  CRIMSON_SHADE = 'CRIMSON_SHADE',
  // Stormspire Peak extra enemies
  GALE_FALCON = 'GALE_FALCON',
  STATIC_GOLEM = 'STATIC_GOLEM',
  STORM_CALLER = 'STORM_CALLER',
  // Shadow Realm extra enemies
  FEAR_CRAWLER = 'FEAR_CRAWLER',
  UMBRAL_ASSASSIN = 'UMBRAL_ASSASSIN',
  VOID_ECHO = 'VOID_ECHO',
  // Primordial Abyss extra enemies
  ENTROPY_WORM = 'ENTROPY_WORM',
  GENESIS_SHADE = 'GENESIS_SHADE',
  NULL_SENTINEL = 'NULL_SENTINEL',
  // Moonlit Grove extra enemies
  THORN_FAIRY = 'THORN_FAIRY',
  NOCTURNAL_PREDATOR = 'NOCTURNAL_PREDATOR',
  LUNAR_WISP = 'LUNAR_WISP',
  // Coral Depths extra enemies
  TIDE_LURKER = 'TIDE_LURKER',
  PEARL_GOLEM = 'PEARL_GOLEM',
  DEEP_SEA_PHANTOM = 'DEEP_SEA_PHANTOM',
  // Ancient Library extra enemies
  QUILL_FIEND = 'QUILL_FIEND',
  PAPER_GOLEM = 'PAPER_GOLEM',
  RUNE_SPIRIT = 'RUNE_SPIRIT',
  // Jade Temple extra enemies
  JADE_VIPER = 'JADE_VIPER',
  TEMPLE_MONK = 'TEMPLE_MONK',
  STONE_IDOL_FRAGMENT = 'STONE_IDOL_FRAGMENT',
  // Ashen Battlefield extra enemies
  EMBER_KNIGHT = 'EMBER_KNIGHT',
  WAR_DRUMMER = 'WAR_DRUMMER',
  CARRION_SWARM = 'CARRION_SWARM',
  // Fungal Depths extra enemies
  CORDYCEPS_HOST = 'CORDYCEPS_HOST',
  LUMINOUS_JELLY = 'LUMINOUS_JELLY',
  ROT_BORER = 'ROT_BORER',
  // Obsidian Fortress extra enemies
  MAGMA_IMP = 'MAGMA_IMP',
  OBSIDIAN_HOUND = 'OBSIDIAN_HOUND',
  SHADOW_INQUISITOR = 'SHADOW_INQUISITOR',
  // Celestial Ruins extra enemies
  NOVA_SPRITE = 'NOVA_SPRITE',
  CONSTELLATION_GOLEM = 'CONSTELLATION_GOLEM',
  GRAVITY_WELL = 'GRAVITY_WELL',
  // Infernal Throne extra enemies
  CHAIN_DEVIL = 'CHAIN_DEVIL',
  BRIMSTONE_CRAWLER = 'BRIMSTONE_CRAWLER',
  WRATH_SPECTER = 'WRATH_SPECTER',
  // Astral Void extra enemies
  PARADOX_SHADE = 'PARADOX_SHADE',
  ANTIMATTER_WISP = 'ANTIMATTER_WISP',
  FRACTURE_BEAST = 'FRACTURE_BEAST',
  // Shattered Colosseum extra enemies
  LION_SPIRIT = 'LION_SPIRIT',
  PIT_FIGHTER_GHOST = 'PIT_FIGHTER_GHOST',
  MIRMILLO_SPECTER = 'MIRMILLO_SPECTER',
  // Petrified Garden extra enemies
  MOSS_BASILISK = 'MOSS_BASILISK',
  CALCIFIED_NYMPH = 'CALCIFIED_NYMPH',
  STONE_SERPENT = 'STONE_SERPENT',
  // Sunken Citadel extra enemies
  BARNACLE_KNIGHT = 'BARNACLE_KNIGHT',
  PRESSURE_PHANTOM = 'PRESSURE_PHANTOM',
  KELP_HORROR = 'KELP_HORROR',
  // Wyrmscar Canyon extra enemies
  CLIFF_RAPTOR = 'CLIFF_RAPTOR',
  NEST_GUARDIAN = 'NEST_GUARDIAN',
  MAGMA_DRAKE = 'MAGMA_DRAKE',
  // Plaguerot Sewers extra enemies
  BLOAT_RAT = 'BLOAT_RAT',
  PESTILENT_SLIME = 'PESTILENT_SLIME',
  SEWER_HARPY = 'SEWER_HARPY',
  // Ethereal Sanctum extra enemies
  ETHER_WISP = 'ETHER_WISP',
  SPECTRAL_MONK = 'SPECTRAL_MONK',
  PHASE_SPIDER = 'PHASE_SPIDER',
  // Iron Wastes extra enemies
  JUNK_GOLEM = 'JUNK_GOLEM',
  SCRAP_HAWK = 'SCRAP_HAWK',
  RUST_MITE_SWARM = 'RUST_MITE_SWARM',
  // Blighted Throne extra enemies
  PLAGUE_KNIGHT = 'PLAGUE_KNIGHT',
  BLIGHTED_NOBLE = 'BLIGHTED_NOBLE',
  ROT_JESTER = 'ROT_JESTER',
  // Chrono Labyrinth extra enemies
  PHASE_BEETLE = 'PHASE_BEETLE',
  TIMELOST_SOLDIER = 'TIMELOST_SOLDIER',
  ENTROPY_WEAVER = 'ENTROPY_WEAVER',
  // Eldritch Nexus extra enemies
  TENTACLE_HORROR = 'TENTACLE_HORROR',
  GIBBERING_MOUTHER = 'GIBBERING_MOUTHER',
  PSYCHIC_LEECH = 'PSYCHIC_LEECH',
  // City Ruins enemies
  RUINS_WATCHMAN = 'RUINS_WATCHMAN',
  FALLEN_SENTINEL = 'FALLEN_SENTINEL',
  RUBBLE_LURKER = 'RUBBLE_LURKER',
  ALLEY_STALKER = 'ALLEY_STALKER',
  RUINED_CAPTAIN = 'RUINED_CAPTAIN',
  // City Ruins extra enemies
  COLLAPSED_GOLEM = 'COLLAPSED_GOLEM',
  GUTTER_RAT_SWARM = 'GUTTER_RAT_SWARM',
  TOWER_SHADE = 'TOWER_SHADE',
  // City enemies
  CORRUPT_GUARD = 'CORRUPT_GUARD',
  GATE_ENFORCER = 'GATE_ENFORCER',
  ROOFTOP_ARCHER = 'ROOFTOP_ARCHER',
  ALLEY_THUG = 'ALLEY_THUG',
  CITY_WARDEN = 'CITY_WARDEN',
  // City extra enemies
  MARKET_BRUTE = 'MARKET_BRUTE',
  SEWER_CREEPER = 'SEWER_CREEPER',
  BELL_TOWER_SENTINEL = 'BELL_TOWER_SENTINEL',
  // Special
  TREASURE_MIMIC = 'TREASURE_MIMIC',
  // Night bosses (unique per map)
  NIGHT_FOREST_WENDIGO = 'NIGHT_FOREST_WENDIGO',
  NIGHT_ELVEN_BANSHEE_QUEEN = 'NIGHT_ELVEN_BANSHEE_QUEEN',
  NIGHT_NECRO_DEATH_KNIGHT = 'NIGHT_NECRO_DEATH_KNIGHT',
  NIGHT_VOLCANIC_INFERNO_TITAN = 'NIGHT_VOLCANIC_INFERNO_TITAN',
  NIGHT_RIFT_VOID_EMPEROR = 'NIGHT_RIFT_VOID_EMPEROR',
  NIGHT_DRAGON_SHADOW_WYRM = 'NIGHT_DRAGON_SHADOW_WYRM',
  NIGHT_DESERT_SANDSTORM_DJINN = 'NIGHT_DESERT_SANDSTORM_DJINN',
  NIGHT_GRASSLAND_STAMPEDE_KING = 'NIGHT_GRASSLAND_STAMPEDE_KING',
  NIGHT_MARSH_SWAMP_MOTHER = 'NIGHT_MARSH_SWAMP_MOTHER',
  NIGHT_CAVERNS_CRYSTAL_KING = 'NIGHT_CAVERNS_CRYSTAL_KING',
  NIGHT_TUNDRA_FROST_EMPRESS = 'NIGHT_TUNDRA_FROST_EMPRESS',
  NIGHT_CATHEDRAL_ARCH_LICH = 'NIGHT_CATHEDRAL_ARCH_LICH',
  NIGHT_THORNWOOD_BLIGHT_LORD = 'NIGHT_THORNWOOD_BLIGHT_LORD',
  NIGHT_FOUNDRY_IRON_TYRANT = 'NIGHT_FOUNDRY_IRON_TYRANT',
  NIGHT_CITADEL_BLOOD_EMPEROR = 'NIGHT_CITADEL_BLOOD_EMPEROR',
  NIGHT_STORMSPIRE_THUNDER_GOD = 'NIGHT_STORMSPIRE_THUNDER_GOD',
  NIGHT_SHADOW_DREAM_EATER = 'NIGHT_SHADOW_DREAM_EATER',
  NIGHT_ABYSS_WORLD_ENDER = 'NIGHT_ABYSS_WORLD_ENDER',
  // Night bosses wave 2
  NIGHT_GROVE_MOONFALL_DRYAD = 'NIGHT_GROVE_MOONFALL_DRYAD',
  NIGHT_CORAL_TIDE_KRAKEN = 'NIGHT_CORAL_TIDE_KRAKEN',
  NIGHT_LIBRARY_LOREKEEPER = 'NIGHT_LIBRARY_LOREKEEPER',
  NIGHT_TEMPLE_JADE_EMPEROR = 'NIGHT_TEMPLE_JADE_EMPEROR',
  NIGHT_BATTLEFIELD_DEATH_MARSHAL = 'NIGHT_BATTLEFIELD_DEATH_MARSHAL',
  NIGHT_FUNGAL_MYCORRHIZA_QUEEN = 'NIGHT_FUNGAL_MYCORRHIZA_QUEEN',
  NIGHT_OBSIDIAN_DARK_SOVEREIGN = 'NIGHT_OBSIDIAN_DARK_SOVEREIGN',
  NIGHT_CELESTIAL_FALLEN_SERAPH = 'NIGHT_CELESTIAL_FALLEN_SERAPH',
  NIGHT_INFERNAL_ARCH_DEMON = 'NIGHT_INFERNAL_ARCH_DEMON',
  NIGHT_ASTRAL_REALITY_BREAKER = 'NIGHT_ASTRAL_REALITY_BREAKER',
  // Night bosses wave 3
  NIGHT_COLOSSEUM_ETERNAL_CHAMPION = 'NIGHT_COLOSSEUM_ETERNAL_CHAMPION',
  NIGHT_GARDEN_MEDUSA_QUEEN = 'NIGHT_GARDEN_MEDUSA_QUEEN',
  NIGHT_CITADEL_DROWNED_ADMIRAL = 'NIGHT_CITADEL_DROWNED_ADMIRAL',
  NIGHT_CANYON_ELDER_WYRM = 'NIGHT_CANYON_ELDER_WYRM',
  NIGHT_SEWERS_PLAGUE_FATHER = 'NIGHT_SEWERS_PLAGUE_FATHER',
  NIGHT_SANCTUM_PLANAR_TYRANT = 'NIGHT_SANCTUM_PLANAR_TYRANT',
  NIGHT_WASTES_WAR_COLOSSUS = 'NIGHT_WASTES_WAR_COLOSSUS',
  NIGHT_THRONE_UNDYING_EMPEROR = 'NIGHT_THRONE_UNDYING_EMPEROR',
  NIGHT_LABYRINTH_TIME_WEAVER = 'NIGHT_LABYRINTH_TIME_WEAVER',
  NIGHT_NEXUS_ELDER_BRAIN = 'NIGHT_NEXUS_ELDER_BRAIN',
  // Night bosses city maps
  NIGHT_RUINS_REVENANT_KING = 'NIGHT_RUINS_REVENANT_KING',
  NIGHT_CITY_SHADOW_MAGISTRATE = 'NIGHT_CITY_SHADOW_MAGISTRATE',
  // Day bosses (easier than night bosses, spawn when not night)
  DAY_FOREST_STAG_GUARDIAN = 'DAY_FOREST_STAG_GUARDIAN',
  DAY_ELVEN_CORRUPTED_SENTINEL = 'DAY_ELVEN_CORRUPTED_SENTINEL',
  DAY_NECRO_BONE_GOLEM = 'DAY_NECRO_BONE_GOLEM',
  DAY_VOLCANIC_EMBER_BRUTE = 'DAY_VOLCANIC_EMBER_BRUTE',
  DAY_RIFT_VOID_STALKER = 'DAY_RIFT_VOID_STALKER',
  DAY_DRAGON_DRAKE_MATRIARCH = 'DAY_DRAGON_DRAKE_MATRIARCH',
  DAY_DESERT_SAND_GOLEM = 'DAY_DESERT_SAND_GOLEM',
  DAY_GRASSLAND_BULL_CHIEFTAIN = 'DAY_GRASSLAND_BULL_CHIEFTAIN',
  DAY_MARSH_BOG_TROLL = 'DAY_MARSH_BOG_TROLL',
  DAY_CAVERNS_CRYSTAL_SPIDER = 'DAY_CAVERNS_CRYSTAL_SPIDER',
  DAY_TUNDRA_FROST_BEAR = 'DAY_TUNDRA_FROST_BEAR',
  DAY_CATHEDRAL_FALLEN_TEMPLAR = 'DAY_CATHEDRAL_FALLEN_TEMPLAR',
  DAY_THORNWOOD_VINE_COLOSSUS = 'DAY_THORNWOOD_VINE_COLOSSUS',
  DAY_FOUNDRY_BRONZE_SENTINEL = 'DAY_FOUNDRY_BRONZE_SENTINEL',
  DAY_CITADEL_BLOODHOUND_ALPHA = 'DAY_CITADEL_BLOODHOUND_ALPHA',
  DAY_STORMSPIRE_WIND_ELEMENTAL = 'DAY_STORMSPIRE_WIND_ELEMENTAL',
  DAY_SHADOW_SHADE_STALKER = 'DAY_SHADOW_SHADE_STALKER',
  DAY_ABYSS_LESSER_HORROR = 'DAY_ABYSS_LESSER_HORROR',
  DAY_RUINS_FALLEN_CAPTAIN = 'DAY_RUINS_FALLEN_CAPTAIN',
  DAY_CITY_CORRUPT_WARDEN = 'DAY_CITY_CORRUPT_WARDEN',
}

export enum SkillId {
  // Warrior skills
  CLEAVE = 'CLEAVE',
  SHIELD_BASH = 'SHIELD_BASH',
  WHIRLWIND = 'WHIRLWIND',
  BATTLE_CRY = 'BATTLE_CRY',
  GROUND_SLAM = 'GROUND_SLAM',
  BLADE_FURY = 'BLADE_FURY',
  // Mage skills
  FIREBALL = 'FIREBALL',
  ICE_NOVA = 'ICE_NOVA',
  LIGHTNING_BOLT = 'LIGHTNING_BOLT',
  METEOR = 'METEOR',
  ARCANE_SHIELD = 'ARCANE_SHIELD',
  CHAIN_LIGHTNING = 'CHAIN_LIGHTNING',
  // Ranger skills
  MULTI_SHOT = 'MULTI_SHOT',
  RAIN_OF_ARROWS = 'RAIN_OF_ARROWS',
  POISON_ARROW = 'POISON_ARROW',
  EVASIVE_ROLL = 'EVASIVE_ROLL',
  EXPLOSIVE_TRAP = 'EXPLOSIVE_TRAP',
  PIERCING_SHOT = 'PIERCING_SHOT',
  // Warrior unlockable skills
  LEAP = 'LEAP',
  IRON_SKIN = 'IRON_SKIN',
  TAUNT = 'TAUNT',
  CRUSHING_BLOW = 'CRUSHING_BLOW',
  INTIMIDATING_ROAR = 'INTIMIDATING_ROAR',
  EARTHQUAKE = 'EARTHQUAKE',
  // Mage unlockable skills
  SUMMON_ELEMENTAL = 'SUMMON_ELEMENTAL',
  BLINK = 'BLINK',
  FROST_BARRIER = 'FROST_BARRIER',
  ARCANE_MISSILES = 'ARCANE_MISSILES',
  MANA_SIPHON = 'MANA_SIPHON',
  TIME_WARP = 'TIME_WARP',
  // Ranger unlockable skills
  GRAPPLING_HOOK = 'GRAPPLING_HOOK',
  CAMOUFLAGE = 'CAMOUFLAGE',
  NET_TRAP = 'NET_TRAP',
  FIRE_VOLLEY = 'FIRE_VOLLEY',
  WIND_WALK = 'WIND_WALK',
  SHADOW_STRIKE = 'SHADOW_STRIKE',
  // Paladin skills
  HOLY_STRIKE = 'HOLY_STRIKE',
  DIVINE_SHIELD = 'DIVINE_SHIELD',
  CONSECRATION = 'CONSECRATION',
  JUDGMENT = 'JUDGMENT',
  SMITE = 'SMITE',
  HOLY_NOVA = 'HOLY_NOVA',
  // Paladin unlockable skills
  AVENGING_WRATH = 'AVENGING_WRATH',
  LAY_ON_HANDS = 'LAY_ON_HANDS',
  HOLY_BOLT = 'HOLY_BOLT',
  BLESSED_HAMMER = 'BLESSED_HAMMER',
  AEGIS_OF_LIGHT = 'AEGIS_OF_LIGHT',
  RIGHTEOUS_FURY = 'RIGHTEOUS_FURY',
  // Necromancer skills
  BONE_SPEAR = 'BONE_SPEAR',
  RAISE_SKELETON = 'RAISE_SKELETON',
  CORPSE_EXPLOSION = 'CORPSE_EXPLOSION',
  CURSE_OF_FRAILTY = 'CURSE_OF_FRAILTY',
  DEATH_NOVA = 'DEATH_NOVA',
  BLOOD_GOLEM = 'BLOOD_GOLEM',
  // Necromancer unlockable skills
  ARMY_OF_THE_DEAD = 'ARMY_OF_THE_DEAD',
  BONE_ARMOR = 'BONE_ARMOR',
  LIFE_TAP = 'LIFE_TAP',
  SPIRIT_BARRAGE = 'SPIRIT_BARRAGE',
  POISON_NOVA = 'POISON_NOVA',
  REVIVE = 'REVIVE',
  // Assassin skills
  SHADOW_STAB = 'SHADOW_STAB',
  FAN_OF_KNIVES = 'FAN_OF_KNIVES',
  BLADE_FLURRY = 'BLADE_FLURRY',
  SMOKE_SCREEN = 'SMOKE_SCREEN',
  VENOMOUS_STRIKE = 'VENOMOUS_STRIKE',
  DEATH_MARK = 'DEATH_MARK',
  // Assassin unlockable skills
  ASSASSINATE = 'ASSASSINATE',
  SHADOW_CLONE = 'SHADOW_CLONE',
  BLADE_DANCE = 'BLADE_DANCE',
  VANISH = 'VANISH',
  CRIPPLING_THROW = 'CRIPPLING_THROW',
  EXECUTE = 'EXECUTE',
}

export enum RuneType {
  NONE = 'NONE',
  RUNE_A = 'RUNE_A', // Damage variant
  RUNE_B = 'RUNE_B', // AoE variant
  RUNE_C = 'RUNE_C', // Utility variant
  RUNE_D = 'RUNE_D', // Element variant
  RUNE_E = 'RUNE_E', // Ultimate variant
}

export enum DamageType {
  PHYSICAL = 'PHYSICAL',
  FIRE = 'FIRE',
  ICE = 'ICE',
  LIGHTNING = 'LIGHTNING',
  POISON = 'POISON',
  ARCANE = 'ARCANE',
  SHADOW = 'SHADOW',
  HOLY = 'HOLY',
}

export enum EnemyState {
  IDLE = 'IDLE',
  PATROL = 'PATROL',
  CHASE = 'CHASE',
  ATTACK = 'ATTACK',
  HURT = 'HURT',
  DYING = 'DYING',
  DEAD = 'DEAD',
}

export enum VendorType {
  BLACKSMITH = 'BLACKSMITH',
  ARCANIST = 'ARCANIST',
  ALCHEMIST = 'ALCHEMIST',
  JEWELER = 'JEWELER',
  GENERAL_MERCHANT = 'GENERAL_MERCHANT',
}

export enum BossAbility {
  GROUND_SLAM = 'GROUND_SLAM',
  CHARGE = 'CHARGE',
  SUMMON_ADDS = 'SUMMON_ADDS',
  ENRAGE = 'ENRAGE',
  SHIELD = 'SHIELD',
  METEOR_RAIN = 'METEOR_RAIN',
}

export interface BossPhaseConfig {
  hpThreshold: number;
  name: string;
  damageMultiplier: number;
  speedMultiplier: number;
  abilities: BossAbility[];
}

export enum EnemyBehavior {
  MELEE_BASIC = 'MELEE_BASIC',
  RANGED = 'RANGED',
  SHIELDED = 'SHIELDED',
  HEALER = 'HEALER',
  FLANKER = 'FLANKER',
}

export enum QuestType {
  KILL_COUNT = 'KILL_COUNT',
  KILL_SPECIFIC = 'KILL_SPECIFIC',
  CLEAR_MAP = 'CLEAR_MAP',
  BOSS_KILL = 'BOSS_KILL',
  NIGHT_BOSS = 'NIGHT_BOSS',
  COLLECT_GOLD = 'COLLECT_GOLD',
  TREASURE_HUNT = 'TREASURE_HUNT',
}

export enum CraftType {
  UPGRADE_RARITY = 'UPGRADE_RARITY',
  REROLL_STATS = 'REROLL_STATS',
  SOCKET_GEM = 'SOCKET_GEM',
  SALVAGE = 'SALVAGE',
}

export enum StatusEffect {
  BURNING = 'BURNING',
  FROZEN = 'FROZEN',
  SHOCKED = 'SHOCKED',
  POISONED = 'POISONED',
  SLOWED = 'SLOWED',
  STUNNED = 'STUNNED',
  BLEEDING = 'BLEEDING',
  WEAKENED = 'WEAKENED',
}

export enum TalentEffectType {
  BONUS_DAMAGE_PERCENT = 'BONUS_DAMAGE_PERCENT',
  BONUS_HP_PERCENT = 'BONUS_HP_PERCENT',
  BONUS_MANA_PERCENT = 'BONUS_MANA_PERCENT',
  BONUS_ARMOR = 'BONUS_ARMOR',
  BONUS_CRIT_CHANCE = 'BONUS_CRIT_CHANCE',
  BONUS_CRIT_DAMAGE = 'BONUS_CRIT_DAMAGE',
  BONUS_ATTACK_SPEED = 'BONUS_ATTACK_SPEED',
  BONUS_MOVE_SPEED = 'BONUS_MOVE_SPEED',
  SKILL_COOLDOWN_REDUCTION = 'SKILL_COOLDOWN_REDUCTION',
  LIFE_STEAL_PERCENT = 'LIFE_STEAL_PERCENT',
  MANA_REGEN = 'MANA_REGEN',
  BONUS_AOE_RADIUS = 'BONUS_AOE_RADIUS',
  RESISTANCE_ALL = 'RESISTANCE_ALL',
}

export enum PotionType {
  HEALTH = 'HEALTH',
  MANA = 'MANA',
  REJUVENATION = 'REJUVENATION',
  STRENGTH = 'STRENGTH',
  SPEED = 'SPEED',
}

export enum ParticleType {
  BLOOD = 'BLOOD',
  SPARK = 'SPARK',
  FIRE = 'FIRE',
  ICE = 'ICE',
  POISON = 'POISON',
  DUST = 'DUST',
  GOLD = 'GOLD',
  HEAL = 'HEAL',
  LIGHTNING = 'LIGHTNING',
  LEVEL_UP = 'LEVEL_UP',
}

export enum Weather {
  NORMAL = 'NORMAL',
  FOGGY = 'FOGGY',
  CLEAR = 'CLEAR',
  STORMY = 'STORMY',
}

export enum MapModifier {
  NONE = 'NONE',
  ENEMY_SPEED = 'ENEMY_SPEED',        // Enemies 40% faster
  ENEMY_FIRE_RESIST = 'ENEMY_FIRE_RESIST', // Enemies have 50% fire resist
  ENEMY_ICE_RESIST = 'ENEMY_ICE_RESIST',
  ENEMY_LIGHTNING_RESIST = 'ENEMY_LIGHTNING_RESIST',
  ENEMY_THORNS = 'ENEMY_THORNS',      // Enemies reflect 15% damage
  ENEMY_REGEN = 'ENEMY_REGEN',        // Enemies regen 2% HP/s
  EXTRA_ELITES = 'EXTRA_ELITES',      // 50% more boss spawns
  EXPLOSIVE_DEATH = 'EXPLOSIVE_DEATH', // Enemies explode on death
  DOUBLE_HP = 'DOUBLE_HP',            // Enemies have 2x HP
  VAMPIRIC = 'VAMPIRIC',             // Enemies heal 5% on hit
}

export enum ElementalReaction {
  STEAM_CLOUD = 'STEAM_CLOUD',       // Fire + Ice
  CHAIN_BURST = 'CHAIN_BURST',       // Lightning + Wet/Ice
  TOXIC_EXPLOSION = 'TOXIC_EXPLOSION', // Poison + Fire
  SHATTER = 'SHATTER',               // Physical + Frozen
  OVERLOAD = 'OVERLOAD',             // Lightning + Fire
  FROSTBITE = 'FROSTBITE',           // Ice + Poison
}

export enum LootFilterLevel {
  SHOW_ALL = 'SHOW_ALL',
  HIDE_COMMON = 'HIDE_COMMON',
  RARE_PLUS = 'RARE_PLUS',
  EPIC_PLUS = 'EPIC_PLUS',
}

// ── Greater Rift System ──────────────────────────────────────

export enum GreaterRiftState {
  NOT_ACTIVE = 'NOT_ACTIVE',
  IN_PROGRESS = 'IN_PROGRESS',
  BOSS_SPAWNED = 'BOSS_SPAWNED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

// ── Pet System Enums ─────────────────────────────────────────

export enum PetType {
  COMBAT = 'COMBAT',
  LOOT = 'LOOT',
  UTILITY = 'UTILITY',
}

export enum PetSpecies {
  // Combat pets
  WOLF_PUP = 'WOLF_PUP',
  FIRE_SPRITE = 'FIRE_SPRITE',
  SHADOW_HOUND = 'SHADOW_HOUND',
  STORM_FALCON = 'STORM_FALCON',
  BONE_MINION = 'BONE_MINION',
  // Loot pets
  TREASURE_IMP = 'TREASURE_IMP',
  GOLD_SCARAB = 'GOLD_SCARAB',
  MAGPIE_FAMILIAR = 'MAGPIE_FAMILIAR',
  // Utility pets
  HEALING_WISP = 'HEALING_WISP',
  SHIELD_GOLEM = 'SHIELD_GOLEM',
  MANA_SPRITE = 'MANA_SPRITE',
  LANTERN_FAIRY = 'LANTERN_FAIRY',
}

export enum PetAIState {
  FOLLOWING = 'FOLLOWING',
  ATTACKING = 'ATTACKING',
  COLLECTING_LOOT = 'COLLECTING_LOOT',
  IDLE = 'IDLE',
  RETURNING = 'RETURNING',
}

// ── Advanced Crafting Enums ──────────────────────────────────

export enum CraftingStationType {
  BLACKSMITH_FORGE = 'BLACKSMITH_FORGE',
  JEWELER_BENCH = 'JEWELER_BENCH',
  ALCHEMIST_TABLE = 'ALCHEMIST_TABLE',
  ENCHANTER_ALTAR = 'ENCHANTER_ALTAR',
}

export enum MaterialType {
  IRON_ORE = 'IRON_ORE',
  STEEL_INGOT = 'STEEL_INGOT',
  MITHRIL_SHARD = 'MITHRIL_SHARD',
  DRAGON_SCALE = 'DRAGON_SCALE',
  ARCANE_DUST = 'ARCANE_DUST',
  VOID_ESSENCE = 'VOID_ESSENCE',
  CRYSTAL_FRAGMENT = 'CRYSTAL_FRAGMENT',
  ENCHANTED_LEATHER = 'ENCHANTED_LEATHER',
  PHOENIX_FEATHER = 'PHOENIX_FEATHER',
  SOUL_GEM = 'SOUL_GEM',
}

// ── Talent & Potion interfaces ──────────────────────────────

export interface TalentEffect {
  type: TalentEffectType;
  value: number;
}

export interface TalentNode {
  id: string;
  name: string;
  description: string;
  icon: string;
  maxRank: number;
  currentRank: number;
  requires?: string;
  branch: number;
  tier: number;
  effects: TalentEffect[];
}

export interface DiabloPotion {
  id: string;
  name: string;
  icon: string;
  type: PotionType;
  value: number;
  duration?: number;
  cooldown: number;
  cost: number;
}

// ── Quest & Crafting Interfaces ──────────────────────────────

export interface QuestTarget {
  enemyType?: EnemyType;
  mapId?: DiabloMapId;
  timeOfDay?: TimeOfDay;
}

export interface QuestReward {
  gold: number;
  xp: number;
  itemRarity?: ItemRarity;
}

export interface DiabloQuest {
  id: string;
  name: string;
  description: string;
  type: QuestType;
  target: QuestTarget;
  progress: number;
  required: number;
  mapId?: DiabloMapId;
  rewards: QuestReward;
  isComplete: boolean;
  isActive: boolean;
}

export interface MapCompletionReward {
  gold: number;
  xp: number;
  guaranteedDropRarity: ItemRarity;
  bonusMessage: string;
}

export interface CraftingRecipe {
  id: string;
  name: string;
  description: string;
  type: CraftType;
  cost: number;
  inputRarity?: ItemRarity;
  inputCount?: number;
  outputRarity?: ItemRarity;
  successChance: number;
  materialCost?: number;
}

// ── Interfaces ───────────────────────────────────────────────

export interface DiabloVec3 {
  x: number;
  y: number;
  z: number;
}

export interface DiabloSkillDef {
  id: SkillId;
  name: string;
  description: string;
  icon: string;
  cooldown: number;
  manaCost: number;
  damageType: DamageType;
  damageMultiplier: number;
  range: number;
  aoeRadius?: number;
  duration?: number;
  statusEffect?: StatusEffect;
  class: DiabloClass;
}

export interface SkillRuneEffect {
  runeType: RuneType;
  name: string;
  description: string;
  icon: string;
  damageMultiplierMod: number; // added to base multiplier
  cooldownMod: number; // added to base cooldown (can be negative)
  manaCostMod: number; // added to base mana cost
  aoeRadiusMod?: number; // added to base aoe radius
  rangeMod?: number; // added to base range
  replaceDamageType?: DamageType; // changes damage type
  replaceStatusEffect?: StatusEffect; // changes status effect
  extraProjectiles?: number; // splits into multiple projectiles
  chainTargets?: number; // bounces to additional targets
  leechPercent?: number; // % of damage returned as healing
  unlocksAtLevel: number;
}

export interface DiabloItemStats {
  strength?: number;
  dexterity?: number;
  intelligence?: number;
  vitality?: number;
  armor?: number;
  critChance?: number;
  critDamage?: number;
  attackSpeed?: number;
  moveSpeed?: number;
  fireResist?: number;
  iceResist?: number;
  lightningResist?: number;
  poisonResist?: number;
  lifeSteal?: number;
  manaRegen?: number;
  bonusDamage?: number;
  bonusHealth?: number;
  bonusMana?: number;
}

export interface DiabloItem {
  id: string;
  name: string;
  type: ItemType;
  slot: ItemSlot;
  rarity: ItemRarity;
  level: number;
  stats: DiabloItemStats;
  description: string;
  setName?: string;
  legendaryAbility?: string;
  icon: string;
  value: number;
}

export interface DiabloSetBonus {
  setName: string;
  pieces: number;
  bonusDescription: string;
  bonusStats: DiabloItemStats;
}

export interface DiabloEquipment {
  helmet: DiabloItem | null;
  body: DiabloItem | null;
  gauntlets: DiabloItem | null;
  legs: DiabloItem | null;
  feet: DiabloItem | null;
  accessory1: DiabloItem | null;
  accessory2: DiabloItem | null;
  weapon: DiabloItem | null;
  lantern: DiabloItem | null;
}

export interface DiabloInventorySlot {
  item: DiabloItem | null;
}

export interface DiabloPlayerState {
  x: number;
  y: number;
  z: number;
  angle: number;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  class: DiabloClass;
  level: number;
  xp: number;
  xpToNext: number;
  gold: number;
  equipment: DiabloEquipment;
  inventory: DiabloInventorySlot[];
  skills: SkillId[];
  skillCooldowns: Map<SkillId, number>;
  statusEffects: { effect: StatusEffect; duration: number; source: string }[];
  strength: number;
  dexterity: number;
  intelligence: number;
  vitality: number;
  armor: number;
  moveSpeed: number;
  attackSpeed: number;
  critChance: number;
  critDamage: number;
  isAttacking: boolean;
  isBlocking: boolean;
  attackTimer: number;
  blockTimer: number;
  invulnTimer: number;
  activeSkillAnimTimer: number;
  activeSkillId: SkillId | null;
  talentPoints: number;
  talents: Record<string, number>;
  potions: DiabloPotion[];
  potionSlots: [DiabloPotion | null, DiabloPotion | null, DiabloPotion | null, DiabloPotion | null];
  potionCooldown: number;
  activePotionBuffs: { type: PotionType; value: number; remaining: number }[];
  salvageMaterials: number;
  lanternOn: boolean;
  skillBranches: Record<string, number>; // keys like "CLEAVE_b1" → 1 or 2 (0 = not chosen)
  unlockedSkills: SkillId[]; // bonus skills unlocked via leveling
  // Dodge roll
  dodgeCooldown: number;
  dodgeTimer: number;
  isDodging: boolean;
  dodgeVx: number;
  dodgeVz: number;
  // Paragon
  paragonLevel: number;
  paragonXp: number;
  paragonXpToNext: number;
  paragonBonuses: Record<string, number>;
  // Skill queue
  queuedSkillIdx: number;
  // Loot filter
  lootFilter: LootFilterLevel;
  // DPS tracking
  damageDealtLog: { time: number; damage: number }[];
  dpsDisplayVisible: boolean;
  // Pet system
  pets: DiabloPet[];
  activePetId: string | null;
  maxPets: number;
  // Crafting system
  crafting: CraftingState;
  // Click-to-move pathfinding
  moveTarget: { x: number; z: number } | null;
  movePath: { x: number; z: number }[];
  movePathIndex: number;
  isMovingToTarget: boolean;
  // Skill Rune system
  activeRunes: Record<string, RuneType>; // key is SkillId, value is active rune
  unlockedRunes: string[]; // "FIREBALL_RUNE_A" format
}

export interface DiabloEnemy {
  id: string;
  type: EnemyType;
  x: number;
  y: number;
  z: number;
  angle: number;
  hp: number;
  maxHp: number;
  damage: number;
  damageType: DamageType;
  armor: number;
  speed: number;
  state: EnemyState;
  targetId: string | null;
  attackTimer: number;
  attackRange: number;
  aggroRange: number;
  xpReward: number;
  lootTable: { itemId: string; chance: number }[];
  deathTimer: number;
  stateTimer: number;
  patrolTarget: DiabloVec3 | null;
  statusEffects: { effect: StatusEffect; duration: number; source: string }[];
  isBoss: boolean;
  bossName?: string;
  scale: number;
  level: number;
  behavior?: EnemyBehavior;
  bossPhase?: number;
  bossAbilityCooldown?: number;
  bossEnraged?: boolean;
  bossShieldTimer?: number;
  rangedCooldown?: number;
  shieldCooldown?: number;
  shieldActive?: boolean;
  healTarget?: string | null;
  flankerAngle?: number;
}

export interface DiabloProjectile {
  id: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  speed: number;
  damage: number;
  damageType: DamageType;
  radius: number;
  ownerId: string;
  isPlayerOwned: boolean;
  lifetime: number;
  maxLifetime: number;
  skillId?: SkillId;
}

export interface DiabloLoot {
  id: string;
  item: DiabloItem;
  x: number;
  y: number;
  z: number;
  timer: number;
}

export interface DiabloTreasureChest {
  id: string;
  x: number;
  y: number;
  z: number;
  opened: boolean;
  rarity: ItemRarity;
  items: DiabloItem[];
}

export interface DiabloVendor {
  id: string;
  type: VendorType;
  name: string;
  x: number;
  z: number;
  inventory: DiabloItem[];
  icon: string;
}

export type TownfolkRole = 'peasant' | 'noble' | 'guard' | 'maiden' | 'monk' | 'bard' | 'child';

export interface DiabloTownfolk {
  id: string;
  role: TownfolkRole;
  name: string;
  x: number;
  y: number;
  z: number;
  angle: number;
  speed: number;
  wanderTarget: { x: number; z: number } | null;
  wanderTimer: number;
  homeX: number;
  homeZ: number;
  wanderRadius: number;
}

export interface DiabloAOE {
  id: string;
  x: number;
  y: number;
  z: number;
  radius: number;
  damage: number;
  damageType: DamageType;
  duration: number;
  timer: number;
  ownerId: string;
  tickInterval: number;
  lastTickTimer: number;
  statusEffect?: StatusEffect;
}

export interface DiabloFloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  z: number;
  color: string;
  timer: number;
  vy: number;
}

export interface DiabloParticle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  color: number;
  size: number;
  type: ParticleType;
}

export interface DiabloMapConfig {
  id: DiabloMapId;
  name: string;
  description: string;
  width: number;
  depth: number;
  enemyTypes: EnemyType[];
  maxEnemies: number;
  spawnInterval: number;
  treasureCount: number;
  ambientColor: string;
  fogColor: string;
  fogDensity: number;
  groundColor: string;
  backgroundMusic?: string;
}

// ── Pet System Interfaces ────────────────────────────────────

export interface PetAbility {
  id: string;
  name: string;
  description: string;
  cooldown: number;
  damageMultiplier?: number;
  healAmount?: number;
  buffType?: string;
  buffDuration?: number;
  icon: string;
  unlocksAtLevel: number;
}

export interface PetEquipSlot {
  collar: DiabloItem | null;
  charm: DiabloItem | null;
}

export interface DiabloPetDef {
  species: PetSpecies;
  name: string;
  petType: PetType;
  icon: string;
  description: string;
  baseHp: number;
  baseDamage: number;
  baseArmor: number;
  moveSpeed: number;
  attackRange: number;
  attackSpeed: number;
  aggroRange: number;
  lootPickupRange?: number;
  abilities: PetAbility[];
  hpPerLevel: number;
  damagePerLevel: number;
  armorPerLevel: number;
}

export interface DiabloPet {
  id: string;
  species: PetSpecies;
  petType: PetType;
  customName: string;
  icon: string;
  level: number;
  xp: number;
  xpToNext: number;
  hp: number;
  maxHp: number;
  damage: number;
  armor: number;
  moveSpeed: number;
  attackRange: number;
  attackSpeed: number;
  aggroRange: number;
  lootPickupRange: number;
  x: number;
  y: number;
  z: number;
  angle: number;
  aiState: PetAIState;
  targetId: string | null;
  attackTimer: number;
  abilityCooldowns: Record<string, number>;
  equipment: PetEquipSlot;
  isSummoned: boolean;
  loyalty: number; // 0-100, affects performance
}

// ── Advanced Crafting Interfaces ─────────────────────────────

export interface CraftingMaterial {
  type: MaterialType;
  name: string;
  icon: string;
  description: string;
  rarity: ItemRarity;
}

export interface AdvancedCraftingRecipe {
  id: string;
  name: string;
  description: string;
  station: CraftingStationType;
  materials: { type: MaterialType; count: number }[];
  goldCost: number;
  salvageCost: number;
  outputItemId?: string;
  outputRarity?: ItemRarity;
  outputSlot?: ItemSlot;
  successChance: number;
  levelRequired: number;
  isDiscovered: boolean;
  icon: string;
}

// ── Procedural Dungeon Generation ────────────────────────────

export interface DungeonRoom {
  x: number;
  z: number;
  width: number;
  height: number;
  type: 'normal' | 'start' | 'boss' | 'treasure' | 'secret';
  connected: number[]; // indices of connected rooms
  enemies: number; // number of enemies to spawn
  cleared: boolean;
}

export interface DungeonCorridor {
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  width: number;
}

export interface DungeonLayout {
  rooms: DungeonRoom[];
  corridors: DungeonCorridor[];
  walls: { x: number; z: number; w: number; h: number }[];
  hazards: { x: number; z: number; radius: number; type: 'lava' | 'spikes' | 'poison' | 'ice' }[];
  spawnRoom: number; // index of the spawn room
  bossRoom: number; // index of the boss room
}

export interface CraftingState {
  discoveredRecipes: string[];
  craftingLevel: number;
  craftingXp: number;
  craftingXpToNext: number;
  materials: Record<MaterialType, number>;
  activeStation: CraftingStationType | null;
  craftingQueue: { recipeId: string; progress: number; duration: number }[];
}

// ── Greater Rift System ──────────────────────────────────────

export interface GreaterRiftData {
  level: number;
  state: GreaterRiftState;
  progressBar: number; // 0-100, boss spawns at 100
  timeLimit: number; // seconds
  timeRemaining: number; // seconds
  enemyHpMultiplier: number;
  enemyDamageMultiplier: number;
  xpMultiplier: number;
  lootBonusMultiplier: number;
  killsForProgress: number;
  currentKills: number;
  bestRiftLevel: number;
  keystones: number; // rift keystones in inventory
}

export interface DiabloState {
  phase: DiabloPhase;
  player: DiabloPlayerState;
  enemies: DiabloEnemy[];
  projectiles: DiabloProjectile[];
  loot: DiabloLoot[];
  treasureChests: DiabloTreasureChest[];
  aoeEffects: DiabloAOE[];
  floatingTexts: DiabloFloatingText[];
  particles: DiabloParticle[];
  vendors: DiabloVendor[];
  townfolk: DiabloTownfolk[];
  currentMap: DiabloMapId;
  camera: {
    x: number;
    y: number;
    z: number;
    targetX: number;
    targetY: number;
    targetZ: number;
    angle: number;
    pitch: number;
    distance: number;
  };
  time: number;
  killCount: number;
  totalEnemiesSpawned: number;
  spawnTimer: number;
  selectedInventorySlot: number;
  hoveredInventorySlot: number;
  persistentInventory: DiabloInventorySlot[];
  persistentGold: number;
  persistentLevel: number;
  persistentXp: number;
  timeOfDay: TimeOfDay;
  persistentStash: DiabloInventorySlot[];
  mapCleared: boolean[];
  difficulty: DiabloDifficulty;
  deathCount: number;
  respawnTimer: number;
  deathGoldLoss: number;
  weather: Weather;
  exploredGrid: boolean[][];
  activeQuests: DiabloQuest[];
  completedQuestIds: string[];
  completedMaps: Record<string, boolean>;
  activeMapModifiers: MapModifier[];
  hitFreezeTimer: number;
  slowMotionTimer: number;
  slowMotionScale: number;
  dungeonLayout: DungeonLayout | null;
  greaterRift: GreaterRiftData;
}

// ── Rarity color map (for UI rendering) ──────────────────────

export const RARITY_COLORS: Record<ItemRarity, string> = {
  [ItemRarity.COMMON]: '#ffffff',
  [ItemRarity.UNCOMMON]: '#00ff00',
  [ItemRarity.RARE]: '#4488ff',
  [ItemRarity.EPIC]: '#aa44ff',
  [ItemRarity.LEGENDARY]: '#ff8800',
  [ItemRarity.MYTHIC]: '#ff2222',
  [ItemRarity.DIVINE]: '#ffd700',
};

// ── Factory functions ────────────────────────────────────────

function createEmptyEquipment(): DiabloEquipment {
  return {
    helmet: null,
    body: null,
    gauntlets: null,
    legs: null,
    feet: null,
    accessory1: null,
    accessory2: null,
    weapon: null,
    lantern: null,
  };
}

function createEmptyInventory(size: number): DiabloInventorySlot[] {
  return Array.from({ length: size }, () => ({ item: null }));
}

export function createDefaultCraftingState(): CraftingState {
  const materials: Record<MaterialType, number> = {
    [MaterialType.IRON_ORE]: 0,
    [MaterialType.STEEL_INGOT]: 0,
    [MaterialType.MITHRIL_SHARD]: 0,
    [MaterialType.DRAGON_SCALE]: 0,
    [MaterialType.ARCANE_DUST]: 0,
    [MaterialType.VOID_ESSENCE]: 0,
    [MaterialType.CRYSTAL_FRAGMENT]: 0,
    [MaterialType.ENCHANTED_LEATHER]: 0,
    [MaterialType.PHOENIX_FEATHER]: 0,
    [MaterialType.SOUL_GEM]: 0,
  };
  return {
    discoveredRecipes: [
      'adv_craft_iron_sword', 'adv_craft_iron_helmet', 'adv_craft_leather_boots',
      'adv_craft_health_potion', 'adv_craft_mana_potion',
    ],
    craftingLevel: 1,
    craftingXp: 0,
    craftingXpToNext: 100,
    materials,
    activeStation: null,
    craftingQueue: [],
  };
}

export function createDefaultPlayer(cls: DiabloClass): DiabloPlayerState {
  // Base stats that vary by class
  let strength = 10;
  let dexterity = 10;
  let intelligence = 10;
  let vitality = 10;
  let maxHp = 100;
  let maxMana = 50;
  let armor = 0;
  let moveSpeed = 5;
  let attackSpeed = 1.0;
  let critChance = 0.05;
  let critDamage = 1.5;
  let skills: SkillId[] = [];

  switch (cls) {
    case DiabloClass.WARRIOR:
      strength = 25;
      dexterity = 8;
      intelligence = 5;
      vitality = 22;
      maxHp = 200;
      maxMana = 60;
      armor = 15;
      moveSpeed = 4.5;
      attackSpeed = 0.9;
      critChance = 0.08;
      critDamage = 1.6;
      skills = [
        SkillId.CLEAVE,
        SkillId.SHIELD_BASH,
      ];
      break;

    case DiabloClass.MAGE:
      strength = 5;
      dexterity = 8;
      intelligence = 28;
      vitality = 14;
      maxHp = 120;
      maxMana = 200;
      armor = 5;
      moveSpeed = 4.8;
      attackSpeed = 0.8;
      critChance = 0.06;
      critDamage = 1.8;
      skills = [
        SkillId.FIREBALL,
        SkillId.ICE_NOVA,
      ];
      break;

    case DiabloClass.RANGER:
      strength = 8;
      dexterity = 26;
      intelligence = 7;
      vitality = 16;
      maxHp = 150;
      maxMana = 100;
      armor = 8;
      moveSpeed = 5.5;
      attackSpeed = 1.3;
      critChance = 0.12;
      critDamage = 1.7;
      skills = [
        SkillId.MULTI_SHOT,
        SkillId.POISON_ARROW,
      ];
      break;

    case DiabloClass.PALADIN:
      strength = 20;
      dexterity = 8;
      intelligence = 15;
      vitality = 24;
      maxHp = 220;
      maxMana = 120;
      armor = 18;
      moveSpeed = 4.2;
      attackSpeed = 0.85;
      critChance = 0.06;
      critDamage = 1.5;
      skills = [
        SkillId.HOLY_STRIKE,
        SkillId.DIVINE_SHIELD,
      ];
      break;

    case DiabloClass.NECROMANCER:
      strength = 6;
      dexterity = 10;
      intelligence = 25;
      vitality = 16;
      maxHp = 140;
      maxMana = 180;
      armor = 6;
      moveSpeed = 4.6;
      attackSpeed = 0.75;
      critChance = 0.07;
      critDamage = 1.9;
      skills = [
        SkillId.BONE_SPEAR,
        SkillId.RAISE_SKELETON,
      ];
      break;

    case DiabloClass.ASSASSIN:
      strength = 14;
      dexterity = 28;
      intelligence = 6;
      vitality = 15;
      maxHp = 160;
      maxMana = 90;
      armor = 7;
      moveSpeed = 6.0;
      attackSpeed = 1.5;
      critChance = 0.15;
      critDamage = 2.0;
      skills = [
        SkillId.SHADOW_STAB,
        SkillId.FAN_OF_KNIVES,
      ];
      break;
  }

  return {
    x: 0,
    y: 0,
    z: 0,
    angle: 0,
    hp: maxHp,
    maxHp,
    mana: maxMana,
    maxMana,
    class: cls,
    level: 1,
    xp: 0,
    xpToNext: 100,
    gold: 0,
    equipment: {
      ...createEmptyEquipment(),
      lantern: {
        id: 'starter-lantern',
        name: 'Traveler\'s Lantern',
        icon: '🏮',
        rarity: ItemRarity.UNCOMMON,
        type: ItemType.LANTERN,
        slot: ItemSlot.LANTERN,
        level: 1,
        value: 40,
        stats: {} as DiabloItemStats,
        description: 'A sturdy brass lantern with a warm, steady flame. A reliable companion in the dark.',
      },
    },
    inventory: createEmptyInventory(40),
    skills,
    skillCooldowns: new Map<SkillId, number>(),
    statusEffects: [],
    strength,
    dexterity,
    intelligence,
    vitality,
    armor,
    moveSpeed,
    attackSpeed,
    critChance,
    critDamage,
    isAttacking: false,
    isBlocking: false,
    attackTimer: 0,
    blockTimer: 0,
    invulnTimer: 0,
    activeSkillAnimTimer: 0,
    activeSkillId: null,
    talentPoints: 0,
    talents: {},
    potions: [],
    potionSlots: [null, null, null, null],
    potionCooldown: 0,
    activePotionBuffs: [],
    salvageMaterials: 0,
    lanternOn: false,
    skillBranches: {},
    unlockedSkills: [],
    dodgeCooldown: 0,
    dodgeTimer: 0,
    isDodging: false,
    dodgeVx: 0,
    dodgeVz: 0,
    paragonLevel: 0,
    paragonXp: 0,
    paragonXpToNext: 1000,
    paragonBonuses: {},
    queuedSkillIdx: -1,
    lootFilter: LootFilterLevel.SHOW_ALL,
    damageDealtLog: [],
    dpsDisplayVisible: false,
    pets: [],
    activePetId: null,
    maxPets: 5,
    crafting: createDefaultCraftingState(),
    moveTarget: null,
    movePath: [],
    movePathIndex: 0,
    isMovingToTarget: false,
    activeRunes: {},
    unlockedRunes: [],
  };
}

export function createDefaultState(): DiabloState {
  return {
    phase: DiabloPhase.CLASS_SELECT,
    player: createDefaultPlayer(DiabloClass.WARRIOR),
    enemies: [],
    projectiles: [],
    loot: [],
    treasureChests: [],
    aoeEffects: [],
    floatingTexts: [],
    particles: [],
    vendors: [],
    townfolk: [],
    currentMap: DiabloMapId.FOREST,
    camera: {
      x: 0,
      y: 20,
      z: 15,
      targetX: 0,
      targetY: 0,
      targetZ: 0,
      angle: 0,
      pitch: -0.8,
      distance: 25,
    },
    time: 0,
    killCount: 0,
    totalEnemiesSpawned: 0,
    spawnTimer: 0,
    selectedInventorySlot: -1,
    hoveredInventorySlot: -1,
    persistentInventory: createEmptyInventory(40),
    persistentGold: 0,
    persistentLevel: 1,
    persistentXp: 0,
    timeOfDay: TimeOfDay.DAY,
    persistentStash: Array.from({ length: 150 }, () => ({ item: null })),
    mapCleared: [false, false, false, false, false, false, false],
    difficulty: DiabloDifficulty.DAGGER,
    deathCount: 0,
    respawnTimer: 0,
    deathGoldLoss: 0,
    weather: Weather.NORMAL,
    exploredGrid: [],
    activeQuests: [],
    completedQuestIds: [],
    completedMaps: {},
    activeMapModifiers: [],
    hitFreezeTimer: 0,
    slowMotionTimer: 0,
    slowMotionScale: 1,
    dungeonLayout: null,
    greaterRift: {
      level: 0,
      state: GreaterRiftState.NOT_ACTIVE,
      progressBar: 0,
      timeLimit: 0,
      timeRemaining: 0,
      enemyHpMultiplier: 1,
      enemyDamageMultiplier: 1,
      xpMultiplier: 1,
      lootBonusMultiplier: 1,
      killsForProgress: 0,
      currentKills: 0,
      bestRiftLevel: 0,
      keystones: 3,
    },
  };
}
