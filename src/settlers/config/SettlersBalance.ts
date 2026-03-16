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

  // Military
  SOLDIER_BASE_HP: 20,
  SOLDIER_BASE_ATK: 4,
  SOLDIER_RANK_HP_BONUS: 5,
  SOLDIER_RANK_ATK_BONUS: 2,
  SOLDIER_SWING_INTERVAL: 1.5, // seconds
  SOLDIER_MARCH_SPEED: 1.5,    // tiles per second
  MAX_SOLDIER_RANK: 4,

  // Building HP
  HP_SMALL: 50,
  HP_MEDIUM: 80,
  HP_LARGE: 120,
  HP_HQ: 200,
  HP_GUARD_HOUSE: 60,
  HP_WATCHTOWER: 100,
  HP_FORTRESS: 160,

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

  // AI
  AI_TICK_INTERVAL: 2.0,     // seconds between AI decisions

  // Rendering
  ROAD_WIDTH: 0.3,           // world units
  FLAG_HEIGHT: 0.8,          // world units
  CARRIER_HEIGHT: 0.3,       // world units
  SOLDIER_HEIGHT: 0.5,       // world units
} as const;
