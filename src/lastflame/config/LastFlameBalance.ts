// ---------------------------------------------------------------------------
// The Last Flame — Balance constants
// ---------------------------------------------------------------------------

export const LF = {
  // Arena
  ARENA_W: 800, ARENA_H: 600,

  // Player
  PLAYER_SPEED: 140,
  PLAYER_RADIUS: 5,

  // Fuel & light
  FUEL_DRAIN_PER_SEC: 0.018,
  FUEL_START: 0.85,
  LIGHT_RADIUS_MIN: 30,
  LIGHT_RADIUS_MAX: 180,
  LIGHT_FLICKER_AMOUNT: 4,

  // Flare
  FLARE_COST: 0.12,
  FLARE_DURATION: 0.4,
  FLARE_RADIUS_MULT: 3.0,
  FLARE_COOLDOWN: 3.0,
  FLARE_DAMAGE_RADIUS: 120,

  // Damage system
  SHADOW_HIT_FUEL_COST: 0.20,  // normal shadow hit drains 20% fuel
  INVULN_DURATION: 1.0,         // invulnerability after hit

  // Sprint
  SPRINT_SPEED_MULT: 2.0,
  SPRINT_DRAIN_MULT: 3.0,       // fuel drains 3x while sprinting
  MOVE_DRAIN_MULT: 1.4,         // fuel drains 1.4x while moving

  // Shadows
  SHADOW_SPEED_LURK: 40,
  SHADOW_SPEED_DART: 200,
  SHADOW_RADIUS: 8,
  SHADOW_DART_INTERVAL_MIN: 2.5,
  SHADOW_DART_INTERVAL_MAX: 5.0,
  SHADOW_DART_DURATION: 0.6,
  SHADOW_SPAWN_INTERVAL: 4.0,
  SHADOW_MAX: 12,
  SHADOW_LURK_DISTANCE: 25,

  // Shadow variants
  BRUTE_RADIUS: 14,
  BRUTE_HP: 2,
  BRUTE_SPEED_MULT: 0.6,
  BRUTE_FUEL_DAMAGE: 0.30,
  SWARM_RADIUS: 4,
  SWARM_DART_INTERVAL: 1.5,
  STALKER_LIGHT_DRAIN: 5, // reduce maxLightRadius per second while alive
  STALKER_START_WAVE: 3,
  // Phantom variant
  PHANTOM_RADIUS: 6,
  PHANTOM_SPEED: 55,
  PHANTOM_DART_INTERVAL: 2.5,
  PHANTOM_TELEGRAPH_DURATION: 0.2,
  PHANTOM_START_WAVE: 6,
  // Nest variant
  NEST_RADIUS: 10,
  NEST_HP: 2,
  NEST_SPEED_MULT: 0.7,  // 35 / 50 ≈ 0.7 of lurk speed
  NEST_START_WAVE: 8,
  NEST_SPAWN_COUNT: 2,  // swarms spawned on death
  // Combo scoring
  COMBO_WINDOW: 2.0,    // seconds to chain kills
  COMBO_BONUS: 5,       // bonus points per combo level
  // Wind hazard
  WIND_FORCE: 30,       // pixels per second push
  WIND_CHANGE_INTERVAL: 10, // seconds between direction changes

  // Oil
  OIL_SPAWN_INTERVAL: 5.0,
  OIL_MAX: 4,
  OIL_AMOUNT_MIN: 0.15,
  OIL_AMOUNT_MAX: 0.30,
  OIL_RADIUS: 6,
  OIL_LIFETIME: 20,

  // Pillars
  PILLAR_COUNT: 6,
  PILLAR_RADIUS_MIN: 12,
  PILLAR_RADIUS_MAX: 22,

  // Waves
  WAVE_INTERVAL: 20,

  // Embers & upgrades
  EMBERS_PER_10_SCORE: 1,
  UPGRADE_COSTS: {
    startFuel: [10, 25],
    flareCooldown: [15, 30],
    lightRecovery: [12, 28],
    oilMagnet: [20],
    // Advanced tiers
    doubleFlare: [60],
    oilFrequency: [40, 80],
    startingMutator: [100],
  } as Record<string, number[]>,

  // Brute telegraph
  BRUTE_WIND_DURATION: 0.8,

  // Pincer detection
  PINCER_ANGLE_THRESHOLD: 2.5, // radians — nearly opposite sides

  // Deterministic eclipse
  ECLIPSE_WAVE_INTERVAL: 4,

  // Shadow telegraph
  TELEGRAPH_DURATION: 0.35,

  // Death sequence
  DYING_DURATION: 2.5,

  // Wave announcement
  WAVE_ANNOUNCE_DURATION: 1.5,
  CALM_WAVE_INTERVAL: 5,  // every 5th wave is calm

  // Scoring
  SCORE_PER_SECOND: 1,
  SCORE_SHADOW_BURN: 15,
  SCORE_OIL: 5,
  SCORE_FLARE_MULTI: 10, // bonus per shadow burned in one flare
  SCORE_DODGE_BONUS: 20,       // bonus for 15s without a hit
  DODGE_BONUS_INTERVAL: 15,    // seconds without taking a hit
  SCORE_WAVE_CLEAR: 30,        // bonus for clearing all wave shadows before next wave
  PYROMANIAC_RADIUS: 20,       // chain explosion radius
  BEACON_ATTRACT_MULT: 3.0,    // oil attract distance multiplier
  BEACON_SHADOW_SPEED_MULT: 1.2, // shadow speed multiplier with beacon

  // Effects
  SHAKE_DURATION: 0.2,
  SHAKE_INTENSITY: 4,
  FLASH_DURATION: 0.15,
  PARTICLE_LIFETIME: 0.6,

  // Grades
  GRADE_THRESHOLDS: [
    { min: 200, grade: "S", color: 0xffd700 },
    { min: 120, grade: "A", color: 0xff8844 },
    { min: 70, grade: "B", color: 0x44aaff },
    { min: 40, grade: "C", color: 0xcccccc },
    { min: 15, grade: "D", color: 0xaa8866 },
  ],

  // Colors
  COLOR_BG: 0x020208,
  COLOR_FLAME: 0xffaa33,
  COLOR_FLAME_CORE: 0xffee88,
  COLOR_FLAME_OUTER: 0xff6600,
  COLOR_LIGHT: 0xffcc66,
  COLOR_LIGHT_EDGE: 0x553311,
  COLOR_DARKNESS: 0x010106,
  COLOR_SHADOW_BODY: 0x1a0e2e,
  COLOR_SHADOW_EYE: 0xcc44ff,
  COLOR_SHADOW_DART: 0x8822cc,
  COLOR_OIL: 0xffdd44,
  COLOR_OIL_GLOW: 0xffaa22,
  COLOR_PILLAR: 0x1a1a28,
  COLOR_PILLAR_EDGE: 0x2a2a3a,
  COLOR_FLARE: 0xffeedd,
  COLOR_FLOOR_DARK: 0x08060e,
  COLOR_FLOOR_LIGHT: 0x0e0c16,
  COLOR_DANGER: 0xff2244,
} as const;

export function getLFGrade(score: number): { grade: string; color: number } {
  for (const t of LF.GRADE_THRESHOLDS) { if (score >= t.min) return t; }
  return { grade: "F", color: 0x886644 };
}
