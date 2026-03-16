// Global tuning — all balance numbers live here, never in system logic
export const BalanceConfig = {
  // Grid
  TILE_SIZE: 64, // pixels per tile
  GRID_WIDTH: 44, // tiles wide
  GRID_HEIGHT: 25, // tiles tall

  // Base positions (tile coords, top-left of 4×4 footprint)
  // West base sits near the left edge; east base mirrors it on the right.
  BASE_WEST_POSITION: { x: 1, y: 10 } as { x: number; y: number },
  BASE_EAST_POSITION: { x: 39, y: 10 } as { x: number; y: number },

  // Where units appear relative to the base top-left tile
  BASE_WEST_SPAWN_OFFSET: { x: 5, y: 1 } as { x: number; y: number },
  BASE_EAST_SPAWN_OFFSET: { x: -1, y: 1 } as { x: number; y: number },

  // Economy
  START_GOLD: 1500,
  GOLD_INCOME_RATE: 5, // base gold/sec (both phases)
  GOLD_PER_BUILDING: 1, // additional gold/sec per owned or captured building
  GOLD_INCOME_BATTLE_BONUS: 3, // extra flat gold/sec added during BATTLE phase
  MANA_INCOME_RATE: 0, // base mana/sec (only Archive buildings generate mana)

  // Spawning
  DEFAULT_GROUP_THRESHOLD: 3, // units ready before group deploys

  // Combat
  BASE_HEALTH: 1000,
  DEFAULT_ATTACK_SPEED: 1.0, // attacks per second
  AGGRO_RANGE: 12, // tiles — how far a unit scans for enemies
  UNIT_DEATH_LINGER: 1.0, // seconds a dead unit stays before removal

  // Critical hit & block
  DEFAULT_CRIT_CHANCE: 0.05, // 5% baseline for all units
  CRIT_DAMAGE_MULTIPLIER: 2.5, // crits deal 2.5x damage
  DEFAULT_BLOCK_CHANCE: 0.0, // 0% baseline — only shield units override

  // Capture
  CAPTURE_TIME: 5, // seconds a unit must stand on a neutral building to capture it
  CAPTURE_RANGE: 1.5, // tile radius — unit must be within this distance of building position

  // Phase durations (seconds)
  PREP_DURATION: 30, // seconds players have to buy/build before battle starts
  RESOLVE_DURATION: 5, // seconds the RESOLVE screen shows before cycling back to PREP
  RANDOM_EVENT_INTERVAL: 30, // seconds between random events during BATTLE

  // Deathmatch mode overrides
  DEATHMATCH_PREP_DURATION: 15, // shorter prep phase for deathmatch
  DEATHMATCH_RANDOM_EVENT_INTERVAL: 15, // more frequent random events in deathmatch
  DEATHMATCH_ALLIANCES_DISABLED: true, // alliances cannot be formed in deathmatch

  // Sudden death (deathmatch only)
  SUDDEN_DEATH_START_TIME: 600, // seconds (10 minutes) of total game time before sudden death
  SUDDEN_DEATH_BASE_DPS: 10, // damage per second to both bases when sudden death starts
  SUDDEN_DEATH_ESCALATION_DPS: 5, // additional DPS added every 60 seconds after sudden death starts

  // Battlefield mode
  BATTLEFIELD_DRAFT_DURATION: 15, // seconds for the draft phase
  BATTLEFIELD_DRAFT_BUDGET: 30000, // gold budget for drafting units
  BATTLEFIELD_SHRINK_START_TIME: 180, // seconds (3 minutes) before arena starts shrinking
  BATTLEFIELD_SHRINK_INTERVAL: 30, // seconds between each shrink step
  BATTLEFIELD_SHRINK_TILES: 2, // tiles removed from each edge per shrink step
  BATTLEFIELD_SHRINK_DPS: 20, // damage per second to units outside the shrink boundary
  BATTLEFIELD_RIVER_SLOW_FACTOR: 0.6, // movement speed multiplier on river tiles (40% slow)

  // Neutral placement
  NEUTRAL_COUNTS: {
    STANDARD: { towers: 1, farms: 2 },
    DOUBLE: { towers: 2, farms: 4 },
    TRIPLE: { towers: 2, farms: 4 },
    QUADRUPLE: { towers: 2, farms: 4 },
  } as Record<string, { towers: number; farms: number }>,

  // Escalation (stalemate prevention)
  ESCALATION_START_TIME: 300, // seconds of total battle time before escalation begins (5 minutes)
  ESCALATION_SPAWN_INTERVAL: 30, // seconds between neutral threat spawns
  ESCALATION_BASE_HP: 200, // base HP of neutral threat units
  ESCALATION_BASE_ATK: 30, // base ATK of neutral threat units
  ESCALATION_BASE_SPEED: 3, // base speed (tiles/sec) of neutral threat units
  ESCALATION_SCALING_PER_MINUTE: 0.25, // strength multiplier added per minute past escalation start

  // Terrain modifiers
  TERRAIN_FOREST_SPEED_MULT: 0.8, // 20% slower in forest
  TERRAIN_FOREST_DEFENSE_MULT: 0.85, // 15% less damage taken in forest (multiply incoming damage)
  TERRAIN_RIVER_SPEED_MULT: 0.6, // 40% slower in river
  TERRAIN_HIGH_GROUND_ATK_MULT: 1.10, // +10% attack damage from high ground to lower ground

  // AI Personality tuning
  AI_AGGRESSIVE_AGGRO_RANGE_BONUS: 4, // extra aggro range tiles for aggressive AI
  AI_DEFENSIVE_PATROL_RANGE: 8, // defensive AI patrol range near own base
  AI_ECONOMY_CAPTURE_PRIORITY_RANGE: 20, // economy AI prioritizes neutral buildings within this range

  // Simulation
  SIM_TICK_MS: 1000 / 60, // ~16.67 ms fixed timestep
} as const;

export type BalanceConfigKey = keyof typeof BalanceConfig;

/** Mutable runtime toggles — set by SettingsScreen via main.ts before game start. */
export const CombatOptions = {
  critEnabled: true,
  blockEnabled: true,
};
