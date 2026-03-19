// ---------------------------------------------------------------------------
// Caesar – Balance constants
// ---------------------------------------------------------------------------

export const CB = {
  // Map
  MAP_WIDTH: 60,             // tiles
  MAP_HEIGHT: 40,            // tiles
  TILE_SIZE: 24,             // pixels per tile

  // Simulation
  SIM_TPS: 60,               // ticks per second
  SIM_TICK_MS: 1000 / 60,    // ~16.67ms

  // Terrain generation
  WATER_LEVEL: 0.18,
  HILL_LEVEL: 0.62,
  FOREST_DENSITY: 0.3,
  STONE_DEPOSIT_CHANCE: 0.02,
  IRON_DEPOSIT_CHANCE: 0.01,

  // Population
  IMMIGRANT_INTERVAL: 8,     // seconds between immigrant waves
  IMMIGRANTS_PER_WAVE: 4,    // people per wave
  MAX_POPULATION: 2000,
  HOUSING_CAPACITY: [4, 8, 14, 22, 32] as readonly number[],   // per tier 0-4

  // Housing evolution
  HOUSING_EVOLVE_CHECK: 10,  // seconds between evolution checks
  HOUSING_DEVOLVE_DELAY: 30, // seconds before devolving if services lost

  // Housing tiers: 0=Hovel, 1=Cottage, 2=House, 3=Manor, 4=Estate
  HOUSING_TAX_PER_PERSON: [0.5, 1, 2, 4, 8] as readonly number[],
  TAX_INTERVAL: 15,          // seconds between tax collection

  // Walker
  WALKER_SPEED: 2.5,         // tiles per second
  WALKER_RANGE: 20,          // max tiles a walker will roam
  WALKER_SPAWN_INTERVAL: 8,  // seconds between walker spawns from a building
  WALKER_SERVICE_RADIUS: 2,  // tiles around walker that receive service

  // Production times (seconds per output)
  PROD_FARM: 20,
  PROD_MILL: 12,
  PROD_BAKERY: 14,
  PROD_BUTCHER: 16,
  PROD_LUMBER: 12,
  PROD_QUARRY: 16,
  PROD_IRON_MINE: 22,
  PROD_BLACKSMITH: 18,
  PROD_WEAVER: 15,

  // Construction times (seconds)
  BUILD_TIME_SMALL: 8,
  BUILD_TIME_MEDIUM: 14,
  BUILD_TIME_LARGE: 22,

  // Construction costs (gold)
  COST_ROAD: 5,
  COST_WELL: 30,
  COST_FARM: 80,
  COST_MILL: 120,
  COST_BAKERY: 150,
  COST_BUTCHER: 140,
  COST_GRANARY: 200,
  COST_MARKET: 250,
  COST_LUMBER_CAMP: 80,
  COST_QUARRY: 100,
  COST_IRON_MINE: 180,
  COST_BLACKSMITH: 200,
  COST_WEAVER: 160,
  COST_CHAPEL: 150,
  COST_CHURCH: 400,
  COST_CATHEDRAL: 1200,
  COST_WATCHPOST: 100,
  COST_BARRACKS: 300,
  COST_WALL: 20,
  COST_GATE: 60,
  COST_TOWER: 250,
  COST_TAVERN: 180,
  COST_FESTIVAL_GROUND: 350,
  COST_JOUSTING_ARENA: 600,
  COST_GUILD_HALL: 500,
  COST_WAREHOUSE: 300,
  COST_HOUSING: 20,

  // Starting resources
  START_GOLD: 3000,
  START_FOOD: 100,
  START_WOOD: 80,
  START_STONE: 40,

  // Desirability
  DESIRABILITY_DECAY: 0.15,  // per tile distance
  MARKET_DESIRABILITY: 8,
  CHAPEL_DESIRABILITY: 6,
  CHURCH_DESIRABILITY: 10,
  CATHEDRAL_DESIRABILITY: 16,
  TAVERN_DESIRABILITY: 4,
  FESTIVAL_DESIRABILITY: 8,
  JOUSTING_DESIRABILITY: 12,
  GUILD_DESIRABILITY: 6,
  WELL_DESIRABILITY: 4,
  FARM_DESIRABILITY: -4,
  QUARRY_DESIRABILITY: -6,
  IRON_MINE_DESIRABILITY: -8,
  BLACKSMITH_DESIRABILITY: -3,
  BARRACKS_DESIRABILITY: -4,

  // Ratings (0-100 each)
  RATING_PROSPERITY_TARGET: 60,
  RATING_CULTURE_TARGET: 50,
  RATING_PEACE_TARGET: 50,
  RATING_FAVOR_TARGET: 40,

  // Favor (king's tribute)
  TRIBUTE_INTERVAL: 120,     // seconds between tribute demands
  TRIBUTE_AMOUNT: 200,       // gold per tribute
  FAVOR_PER_TRIBUTE: 10,     // favor gained per tribute paid
  FAVOR_PENALTY: -15,        // favor lost per missed tribute

  // Threats
  RAID_INTERVAL_MIN: 180,    // seconds
  RAID_INTERVAL_MAX: 360,
  RAID_BASE_SIZE: 3,         // bandits per raid
  RAID_SCALE_PER_POP: 0.005, // extra bandits per population
  BANDIT_HP: 15,
  BANDIT_ATK: 3,
  MILITIA_HP: 25,
  MILITIA_ATK: 5,
  TOWER_ATK: 8,
  TOWER_RANGE: 5,            // tiles
  WALL_HP: 100,

  // Map sizes
  MAP_SIZE_SMALL:  { width: 40, height: 30 },
  MAP_SIZE_NORMAL: { width: 60, height: 40 },
  MAP_SIZE_LARGE:  { width: 80, height: 55 },
} as const;

export type CaesarDifficulty = "easy" | "normal" | "hard";

export const DIFFICULTY_MODS: Record<CaesarDifficulty, {
  startGoldMult: number;
  taxMult: number;
  raidSizeMult: number;
  raidIntervalMult: number;
  tributeMult: number;
  immigrantMult: number;
}> = {
  easy:   { startGoldMult: 1.5, taxMult: 1.3, raidSizeMult: 0.6, raidIntervalMult: 1.4, tributeMult: 0.7, immigrantMult: 1.3 },
  normal: { startGoldMult: 1.0, taxMult: 1.0, raidSizeMult: 1.0, raidIntervalMult: 1.0, tributeMult: 1.0, immigrantMult: 1.0 },
  hard:   { startGoldMult: 0.7, taxMult: 0.8, raidSizeMult: 1.5, raidIntervalMult: 0.7, tributeMult: 1.4, immigrantMult: 0.7 },
};
