// Global tuning — all balance numbers live here, never in system logic
export const BalanceConfig = {
  // Grid
  TILE_SIZE: 64, // pixels per tile
  GRID_WIDTH: 30, // tiles wide
  GRID_HEIGHT: 20, // tiles tall

  // Base positions (tile coords, top-left of 3×3 footprint)
  // West base sits near the left edge; east base mirrors it on the right.
  BASE_WEST_POSITION: { x: 1, y: 9 } as { x: number; y: number },
  BASE_EAST_POSITION: { x: 26, y: 9 } as { x: number; y: number },

  // Where units appear relative to the base top-left tile
  BASE_WEST_SPAWN_OFFSET: { x: 4, y: 1 } as { x: number; y: number },
  BASE_EAST_SPAWN_OFFSET: { x: -1, y: 1 } as { x: number; y: number },

  // Economy
  START_GOLD: 100,
  GOLD_INCOME_RATE: 10, // gold per second during battle

  // Spawning
  DEFAULT_GROUP_THRESHOLD: 3, // units ready before group deploys

  // Combat
  BASE_HEALTH: 1000,
  DEFAULT_ATTACK_SPEED: 1.0, // attacks per second
  AGGRO_RANGE: 6, // tiles — how far a unit scans for enemies
  UNIT_DEATH_LINGER: 1.0, // seconds a dead unit stays before removal

  // Simulation
  SIM_TICK_MS: 1000 / 60, // ~16.67 ms fixed timestep
} as const;

export type BalanceConfigKey = keyof typeof BalanceConfig;
