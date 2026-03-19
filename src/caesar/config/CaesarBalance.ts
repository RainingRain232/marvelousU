// ---------------------------------------------------------------------------
// Caesar – Balance constants
// ---------------------------------------------------------------------------

export const CB = {
  // Map
  MAP_WIDTH: 60,             // tiles
  MAP_HEIGHT: 40,            // tiles
  TILE_SIZE: 32,             // pixels per tile (larger = more detail room)

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
  HOUSING_EVOLVE_COOLDOWN: 15, // seconds cooldown between evolutions per house
  HOUSING_DEVOLVE_DELAY: 30,   // seconds before devolving if services lost

  // Housing tiers: 0=Hovel, 1=Cottage, 2=House, 3=Manor, 4=Estate
  HOUSING_TAX_PER_PERSON: [0.5, 1, 2, 4, 8] as readonly number[],
  TAX_INTERVAL: 15,          // seconds between tax collection

  // Walker
  WALKER_SPEED: 2.5,         // tiles per second
  WALKER_RANGE: 20,          // max tiles a walker will roam
  WALKER_SPAWN_INTERVAL: 8,  // seconds between walker spawns from a building
  WALKER_SERVICE_RADIUS: 2,  // tiles around walker that receive service
  SERVICE_DURATION: 30,      // seconds a service "lasts" after walker visit

  // Production times (seconds per output)
  PROD_FARM: 20,
  PROD_MILL: 12,
  PROD_BAKERY: 14,
  PROD_BUTCHER: 16,
  PROD_LUMBER: 12,
  PROD_QUARRY: 16,
  PROD_IRON_MINE: 18,       // was 22, slightly faster
  PROD_BLACKSMITH: 16,      // was 18
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

  // Building maintenance (gold per tax interval per building)
  MAINTENANCE_SMALL: 2,
  MAINTENANCE_MEDIUM: 5,
  MAINTENANCE_LARGE: 10,
  MAINTENANCE_MILITARY: 8,

  // Resource storage (base caps before granary/warehouse bonuses)
  BASE_STORAGE_CAP: 300,       // max resources without storage buildings
  GRANARY_FOOD_BONUS: 200,     // extra food cap per granary
  GRANARY_WHEAT_BONUS: 100,    // extra wheat cap per granary
  WAREHOUSE_BONUS: 150,        // extra cap per resource type per warehouse

  // Goods consumption for housing evolution (consumed per tax interval)
  HOUSING_CLOTH_PER_MANOR: 1,  // cloth consumed per Manor per tax interval
  HOUSING_TOOLS_PER_ESTATE: 1, // tools consumed per Estate per tax interval

  // Trade (guild hall)
  TRADE_INTERVAL: 20,         // seconds between trade ticks at guild hall
  TRADE_SELL_RATE: 3,         // sell 3 of resource to get 1 of another
  TRADE_GOLD_PER_TOOL: 15,    // gold gained per tool sold
  TRADE_GOLD_PER_CLOTH: 12,   // gold gained per cloth sold

  // Starting resources
  START_GOLD: 3500,
  START_FOOD: 120,
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
  TRIBUTE_BASE_AMOUNT: 150,  // base gold per tribute
  TRIBUTE_PER_POP: 0.15,     // additional gold per population
  FAVOR_PER_TRIBUTE: 10,     // favor gained per tribute paid
  FAVOR_PENALTY: -15,        // favor lost per missed tribute

  // Threats
  RAID_INTERVAL_MIN: 180,    // seconds
  RAID_INTERVAL_MAX: 360,
  RAID_BASE_SIZE: 3,         // bandits per raid
  RAID_SCALE_PER_POP: 0.005, // extra bandits per population
  BANDIT_HP: 15,
  BANDIT_ATK: 3,
  BANDIT_SPEED: 1.5,
  MILITIA_HP: 25,
  MILITIA_ATK: 5,
  MILITIA_SPEED: 2.0,
  MELEE_RANGE: 1.2,          // tiles
  TOWER_ATK: 8,
  TOWER_RANGE: 5,            // tiles
  TOWER_FIRE_RATE: 2.0,      // seconds between shots
  WALL_HP: 100,
  MAX_MILITIA_GLOBAL: 20,    // hard cap on total militia

  // Random events
  EVENT_CHECK_INTERVAL: 45,  // seconds between event rolls
  EVENT_CHANCE: 0.4,         // chance of an event happening per roll
  PLAGUE_POP_LOSS: 0.08,     // percent of pop lost to plague
  FESTIVAL_CULTURE_BOOST: 8, // temporary culture rating boost
  BOUNTIFUL_HARVEST_MULT: 2, // food production multiplier
  EVENT_DURATION: 30,        // seconds most events last

  // Fire
  FIRE_CHECK_INTERVAL: 20,     // seconds between fire risk checks
  FIRE_BASE_CHANCE: 0.03,      // chance per check per building (3%)
  FIRE_SPREAD_RANGE: 3,        // tiles fire can spread
  FIRE_SPREAD_CHANCE: 0.15,    // chance of spreading to adjacent building
  FIRE_DAMAGE_PER_SEC: 5,      // HP damage per second while on fire
  FIRE_DURATION: 15,           // seconds a fire burns
  FIRE_WATCHPOST_SUPPRESS: 0.8, // chance reduction if watchpost/barracks nearby

  // Building upgrades
  UPGRADE_COST_MULT: 0.6,     // upgrade costs 60% of original build cost
  UPGRADE_BUILD_TIME_MULT: 0.5,
  UPGRADE_SPEED_BONUS: 0.25,  // 25% faster production per level
  UPGRADE_OUTPUT_BONUS: 0.15, // 15% more output per level (floor to int)
  MAX_BUILDING_LEVEL: 3,

  // Morale
  MORALE_BASE: 70,            // default morale
  MORALE_FOOD_BONUS: 10,      // +10 if food > 50
  MORALE_FOOD_PENALTY: -20,   // -20 if food = 0
  MORALE_UNEMPLOYMENT_PENALTY: -15, // -15 if unemployment > 40%
  MORALE_TAX_PENALTY: -10,    // -10 per missed tribute
  MORALE_RAID_PENALTY: -15,   // -15 during active raid
  MORALE_ENTERTAINMENT_BONUS: 10,
  MORALE_RELIGION_BONUS: 5,
  LOW_MORALE_EMIGRATION: 0.5, // people leave per second when morale < 30
  LOW_MORALE_PROD_MULT: 0.6,  // production speed when morale < 40

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
  maintenanceMult: number;
}> = {
  easy:   { startGoldMult: 1.5, taxMult: 1.3, raidSizeMult: 0.6, raidIntervalMult: 1.4, tributeMult: 0.7, immigrantMult: 1.3, maintenanceMult: 0.5 },
  normal: { startGoldMult: 1.0, taxMult: 1.0, raidSizeMult: 1.0, raidIntervalMult: 1.0, tributeMult: 1.0, immigrantMult: 1.0, maintenanceMult: 1.0 },
  hard:   { startGoldMult: 0.7, taxMult: 0.8, raidSizeMult: 1.5, raidIntervalMult: 0.7, tributeMult: 1.4, immigrantMult: 0.7, maintenanceMult: 1.3 },
};
