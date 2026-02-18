// Global tuning — all balance numbers live here, never in system logic
export const BalanceConfig = {
  // Grid
  TILE_SIZE: 64, // pixels per tile
  GRID_WIDTH: 30, // tiles wide
  GRID_HEIGHT: 20, // tiles tall

  // Economy
  START_GOLD: 100,
  GOLD_INCOME_RATE: 10, // gold per second during battle

  // Spawning
  DEFAULT_GROUP_THRESHOLD: 3, // units ready before group deploys

  // Combat
  BASE_HEALTH: 1000,
  DEFAULT_ATTACK_SPEED: 1.0, // attacks per second

  // Simulation
  SIM_TICK_MS: 1000 / 60, // ~16.67 ms fixed timestep
} as const;

export type BalanceConfigKey = keyof typeof BalanceConfig;
