// ---------------------------------------------------------------------------
// Void Knight — Balance constants
// ---------------------------------------------------------------------------

export const VK = {
  // Arena
  ARENA_BASE_RADIUS: 280,
  ARENA_SHRINK_PER_WAVE: 8,
  ARENA_MIN_RADIUS: 140,
  ARENA_BORDER_WIDTH: 3,

  // Player
  PLAYER_SPEED: 220,
  PLAYER_RADIUS: 6,
  DASH_SPEED_MULT: 3.5,
  DASH_DURATION: 0.15,
  DASH_COOLDOWN: 1.8,
  DASH_TRAIL_COUNT: 6,

  // Projectiles
  PROJ_BASE_SPEED: 120,
  PROJ_RADIUS: 4,
  PROJ_LIFETIME: 8,
  NEAR_MISS_DISTANCE: 18,

  // Spawners
  SPAWNER_HP: 3,
  SPAWNER_FIRE_INTERVAL: 1.2,
  SPAWNER_BURST_DELAY: 0.15,
  SPAWNERS_PER_WAVE: 3,
  SPAWNER_RADIUS: 14,

  // Waves
  WAVE_DURATION: 20,
  WAVE_TRANSITION: 2,

  // Orbs
  ORB_SPAWN_INTERVAL: 3.5,
  ORB_RADIUS: 8,
  ORB_LIFETIME: 10,
  ORB_WEIGHTS: { score: 40, shield: 12, slow: 16, magnet: 12, reflect: 10, bomb: 10 } as Record<string, number>,
  SLOW_DURATION: 3,
  SLOW_FACTOR: 0.35,
  MAGNET_DURATION: 5,
  MAGNET_RADIUS: 100,
  REFLECT_DURATION: 2.5,
  BOMB_RADIUS: 120,

  // Scoring
  SCORE_PER_SECOND: 2,
  SCORE_ORB: 15,
  SCORE_NEAR_MISS: 5,
  SCORE_SPAWNER_KILL: 50,
  SCORE_WAVE_CLEAR: 100,
  SCORE_DASH_KILL: 3,
  SCORE_GRAZE_BURST: 30,

  // Multiplier (rebalanced: slower decay, more achievable)
  MULT_GAIN_NEAR_MISS: 0.2,
  MULT_GAIN_DASH_KILL: 0.12,
  MULT_GAIN_GRAZE: 0.03,
  MULT_MAX: 8.0,
  MULT_DECAY_DELAY: 3.0,  // seconds before decay starts
  MULT_DECAY_RATE: 0.3,   // per second (was 0.5)
  MULT_MILESTONES: [2, 3, 4, 5, 6, 7, 8] as readonly number[],

  // Graze
  GRAZE_DISTANCE: 25,     // slightly larger than near-miss
  GRAZE_FILL_RATE: 15,    // per second while grazing
  GRAZE_DRAIN_RATE: 5,    // per second passively
  GRAZE_MAX: 100,
  GRAZE_BURST_RADIUS: 80,
  GRAZE_BURST_DAMAGE: 1,

  // Dash combat
  DASH_DESTROY_RADIUS: 20, // radius around player during dash that destroys projectiles
  DASH_SPAWNER_DAMAGE: 1,  // damage to spawner per dash-through

  // Boss spawner
  BOSS_WAVE_INTERVAL: 5,
  BOSS_HP: 8,
  BOSS_SIZE_MULT: 1.8,

  // Boss phases
  BOSS_PHASE_2_HP_RATIO: 0.66,  // switch to phase 1 below 66% HP
  BOSS_PHASE_3_HP_RATIO: 0.33,  // switch to phase 2 below 33% HP

  // Last Stand
  LAST_STAND_GRAZE_COST: 50, // minimum graze meter needed to trigger
  LAST_STAND_HITSTOP: 0.5,

  // Wave intro
  WAVE_INTRO_DURATION: 1.8,

  // Death replay
  DEATH_SLOW_DURATION: 1.2,
  DEATH_SLOW_FACTOR: 0.08,

  // Tutorial
  TUTORIAL_STEP_DURATION: 4.0,

  // Spawner telegraph
  TELEGRAPH_DURATION: 0.35,

  // Wave mutators
  MUTATOR_START_WAVE: 2,

  // Shockwave
  SHOCKWAVE_SPEED: 200,
  SHOCKWAVE_MAX_RADIUS: 120,
  SHOCKWAVE_LIFE: 0.5,

  // Near-miss streak announcer
  STREAK_TIMEOUT: 1.5,

  // Emergency dash (costs multiplier)
  EMERGENCY_DASH_MULT_COST: 0.5, // lose 50% of current multiplier

  // Orb
  ORB_MAX_COUNT: 5,

  // Hitstop
  HITSTOP_NEAR_MISS_STREAK: 0.02,
  HITSTOP_SPAWNER_KILL: 0.06,
  HITSTOP_DEATH: 0.1,
  HITSTOP_GRAZE_BURST: 0.04,
  HITSTOP_DASH_MULTI: 0.03,

  // Effects
  SHAKE_DURATION: 0.2,
  SHAKE_INTENSITY: 5,
  FLASH_DURATION: 0.15,
  NEAR_MISS_FLASH_DUR: 0.3,

  // Particles
  PARTICLE_LIFETIME: 0.6,
  PARTICLE_COUNT_DEATH: 30,
  PARTICLE_COUNT_ORB: 8,
  PARTICLE_COUNT_SPAWNER: 12,
  PARTICLE_COUNT_NEAR_MISS: 4,
  PARTICLE_COUNT_DASH: 3,

  // Grades
  GRADE_THRESHOLDS: [
    { min: 3000, grade: "S", color: 0xffd700 },
    { min: 1500, grade: "A", color: 0x44ff44 },
    { min: 800, grade: "B", color: 0x4488ff },
    { min: 400, grade: "C", color: 0xcccccc },
    { min: 150, grade: "D", color: 0xaa8866 },
  ],

  // Colors
  COLOR_BG: 0x0a0816,
  COLOR_ARENA_BORDER: 0x4422aa,
  COLOR_ARENA_GLOW: 0x3318aa,
  COLOR_ARENA_FLOOR: 0x0e0c20,
  COLOR_PLAYER: 0xeebb33,
  COLOR_PLAYER_DASH: 0xffffff,
  COLOR_SHIELD: 0x44aaff,
  COLOR_PROJ_DEFAULT: 0xff4466,
  COLOR_PROJ_SPIRAL: 0xff88cc,
  COLOR_PROJ_RING: 0xffaa44,
  COLOR_PROJ_AIMED: 0xff2222,
  COLOR_PROJ_WAVE: 0x66ccff,
  COLOR_ORB_SCORE: 0xffd700,
  COLOR_ORB_SHIELD: 0x44aaff,
  COLOR_ORB_SLOW: 0x88ffaa,
  COLOR_ORB_MAGNET: 0xff66aa,
  COLOR_SPAWNER: 0xaa44cc,
  COLOR_NEAR_MISS: 0xffee44,
  COLOR_DANGER: 0xff2244,
  COLOR_SLOW_TINT: 0x88ffcc,
  COLOR_ORB_REFLECT: 0xccddff,
  COLOR_ORB_BOMB: 0xff6622,
  COLOR_GRAZE: 0xddccff,
  COLOR_MULTIPLIER: 0xffdd44,
  COLOR_BOSS_SPAWNER: 0xff2288,
} as const;

export function getVKGrade(score: number): { grade: string; color: number } {
  for (const t of VK.GRADE_THRESHOLDS) { if (score >= t.min) return t; }
  return { grade: "F", color: 0x886644 };
}
