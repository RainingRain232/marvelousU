export const SB = {
  NUM_PLATFORMS: 7,
  PLATFORM_RADIUS: 6.5,
  PLATFORM_HEIGHT: 1.8,
  PLATFORM_FLOAT_SPEED: 0.45,
  PLATFORM_FLOAT_AMP: 0.28,

  CYCLE_DURATION: 90,
  DAY_FRACTION: 0.5,

  POINTS_TO_WIN: 3,
  ALIGNMENT_MAJORITY: 4,
  ALIGNMENT_FLASH_DURATION: 3.0,

  ESSENCE_PER_PLATFORM: 4,
  ESSENCE_CENTER_BONUS: 4,
  START_ESSENCE: 80,

  UNITS: {
    guardian: { hp: 90,  dps: 9,  speed: 3.5, cost: 25, label: "GUARDIAN" },
    warden:   { hp: 55,  dps: 16, speed: 2.8, cost: 42, label: "WARDEN"   },
    invoker:  { hp: 38,  dps: 30, speed: 2.0, cost: 68, label: "INVOKER"  },
  } as const,

  ATTACK_INTERVAL: 0.85,
  CAPTURE_RATE: 0.18,
  CAPTURE_DECAY: 0.04,

  BONUS_MULT: 1.4,

  AI_SPAWN_INTERVAL: 7,
  AI_THINK_INTERVAL: 2,

  MAX_UNITS_PER_SIDE: 12,
  BRIDGE_RADIUS: 0.14,
};
