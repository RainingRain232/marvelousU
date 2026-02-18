// Global tuning: spawn rates, gold income, group thresholds, tile size
export const BalanceConfig = {
  TILE_SIZE:          64,
  GOLD_INCOME_RATE:   10,    // gold per second
  DEFAULT_GROUP_THRESHOLD: 3,
  BASE_HEALTH:        1000,
  SIM_TICK_MS:        1000 / 60,
} as const;
