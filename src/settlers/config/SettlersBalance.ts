// ---------------------------------------------------------------------------
// Settlers – Balance constants
// ---------------------------------------------------------------------------

export const SB = {
  // Map
  MAP_WIDTH: 64,             // tiles
  MAP_HEIGHT: 64,            // tiles
  TILE_SIZE: 2.0,            // world units per tile

  // Simulation
  SIM_TPS: 60,               // ticks per second
  SIM_TICK_MS: 1000 / 60,    // ~16.67ms

  // Terrain generation
  WATER_LEVEL: 0.15,         // height below which = water
  MOUNTAIN_LEVEL: 0.65,      // height above which = mountain
  MAX_HEIGHT: 8.0,           // peak terrain height in world units
  TREE_DENSITY: 0.35,        // probability of tree in forest tile

  // Territory radii (in tiles)
  HQ_RADIUS: 7,
  GUARD_HOUSE_RADIUS: 5,
  WATCHTOWER_RADIUS: 8,
  FORTRESS_RADIUS: 11,

  // Construction costs (planks, stone)
  COST_SMALL:  { planks: 2, stone: 2 },
  COST_MEDIUM: { planks: 4, stone: 3 },
  COST_LARGE:  { planks: 6, stone: 5 },

  // Carrier
  CARRIER_SPEED: 2.0,        // tiles per second
  FLAG_MAX_INVENTORY: 8,     // max goods waiting at a flag

  // Building production (seconds per output)
  PROD_WOODCUTTER: 15,
  PROD_SAWMILL: 10,
  PROD_QUARRY: 18,
  PROD_FISHER: 16,
  PROD_HUNTER: 20,
  PROD_FARM: 25,
  PROD_MILL: 10,
  PROD_BAKERY: 12,
  PROD_BREWERY: 14,
  PROD_IRON_MINE: 20,
  PROD_GOLD_MINE: 25,
  PROD_COAL_MINE: 18,
  PROD_SMELTER: 14,
  PROD_MINT: 16,
  PROD_SWORD_SMITH: 18,
  PROD_SHIELD_SMITH: 18,
  PROD_BARRACKS: 30,
  PROD_BOWYER: 16,
  PROD_ARCHERY_RANGE: 28,
  PROD_STABLE: 40,

  // Production queue
  MAX_PRODUCTION_QUEUE: 5,     // max items in a building's production queue

  // Military – Swordsman (default)
  SOLDIER_BASE_HP: 20,
  SOLDIER_BASE_ATK: 4,
  SOLDIER_RANK_HP_BONUS: 5,
  SOLDIER_RANK_ATK_BONUS: 2,
  SOLDIER_SWING_INTERVAL: 1.5, // seconds
  SOLDIER_MARCH_SPEED: 1.5,    // tiles per second
  MAX_SOLDIER_RANK: 4,

  // Military – Archer
  ARCHER_BASE_HP: 15,
  ARCHER_BASE_ATK: 3,
  ARCHER_SWING_INTERVAL: 2.0,  // seconds
  ARCHER_MARCH_SPEED: 1.5,     // tiles per second
  ARCHER_RANGE: 3,             // tiles

  // Military – Knight
  KNIGHT_BASE_HP: 25,
  KNIGHT_BASE_ATK: 5,
  KNIGHT_SWING_INTERVAL: 1.2,  // seconds
  KNIGHT_MARCH_SPEED: 2.5,     // tiles per second

  // Military – Catapult tower
  CATAPULT_TOWER_RANGE: 4,     // tiles
  CATAPULT_TOWER_DAMAGE: 2,    // damage per tick

  // Building HP
  HP_SMALL: 50,
  HP_MEDIUM: 80,
  HP_LARGE: 120,
  HP_HQ: 200,
  HP_GUARD_HOUSE: 60,
  HP_WATCHTOWER: 100,
  HP_FORTRESS: 160,
  HP_WALL: 80,
  HP_GATE: 80,
  HP_CATAPULT_TOWER: 120,

  // Starting resources in HQ
  START_PLANKS: 8,
  START_STONE: 8,
  START_WOOD: 4,
  START_FISH: 4,
  START_BREAD: 4,
  START_SWORDS: 2,
  START_SHIELDS: 2,
  START_BEER: 2,
  START_WORKERS: 12,
  START_SOLDIERS: 2,

  // AI – base values (modified by difficulty)
  AI_TICK_INTERVAL: 2.0,     // seconds between AI decisions (Normal)

  // AI difficulty presets
  AI_DIFFICULTY: {
    easy: {
      tickInterval: 3.5,        // slower decisions
      attackThreshold: 8,        // needs more soldiers before attacking
      attackGroupSize: 2,        // sends fewer soldiers per attack
      buildEfficiency: 0.6,      // 60% chance to actually build each tick
      startingResourceMult: 0.8, // AI gets fewer starting resources
      playerResourceMult: 1.3,   // player gets more starting resources
      defensePriority: 0.3,      // low priority on defensive placement
    },
    normal: {
      tickInterval: 2.0,
      attackThreshold: 5,
      attackGroupSize: 4,
      buildEfficiency: 0.85,
      startingResourceMult: 1.0,
      playerResourceMult: 1.0,
      defensePriority: 0.6,
    },
    hard: {
      tickInterval: 1.2,        // faster decisions
      attackThreshold: 3,        // attacks earlier
      attackGroupSize: 6,        // sends more soldiers
      buildEfficiency: 1.0,      // always builds
      startingResourceMult: 1.4, // AI gets more starting resources
      playerResourceMult: 0.8,   // player gets fewer starting resources
      defensePriority: 0.9,      // high priority on defensive placement
    },
  },

  // Rendering
  ROAD_WIDTH: 0.8,           // world units
  FLAG_HEIGHT: 0.8,          // world units
  CARRIER_HEIGHT: 0.7,       // world units
  SOLDIER_HEIGHT: 0.5,       // world units
} as const;
