// ---------------------------------------------------------------------------
// Graviton — Balance constants
// ---------------------------------------------------------------------------

export const G = {
  ARENA_RADIUS: 300,
  PLAYER_SPEED: 160,
  PLAYER_RADIUS: 8,
  PLAYER_HP: 5,

  // Gravity
  PULL_RADIUS: 100,
  PULL_STRENGTH: 200,
  ORBIT_SPEED: 2.5, // radians/sec
  ORBIT_DIST_MIN: 20,
  ORBIT_DIST_MAX: 45,
  ORBIT_CAPACITY: 8,

  // Pull energy
  PULL_ENERGY_DRAIN: 0.25,   // per second while pulling
  PULL_ENERGY_REGEN: 0.35,   // per second while not pulling
  PULL_SPEED_PENALTY: 0.65,  // movement speed multiplier while pulling

  // Bodies
  ASTEROID_RADIUS: 5,
  ASTEROID_SPEED: 30,
  ASTEROID_SPAWN_INTERVAL: 1.5,
  GOLD_CHANCE: 0.12,
  BOMB_CHANCE: 0.08,
  BOMB_RADIUS: 6,
  BOMB_DAMAGE_RADIUS: 60,
  BODY_MAX: 20,
  BODY_LIFETIME: 15,

  // Fling
  FLING_SPEED: 350,
  FLING_COOLDOWN: 0.6,
  FLING_DAMAGE: 1,
  GOLD_FLING_DAMAGE: 2,
  FLING_SPREAD: 0.4,
  FLING_PARTIAL_COUNT: 2,
  FLING_PARTIAL_COOLDOWN: 0.3,
  FLING_HOLD_THRESHOLD: 0.25, // seconds before full volley

  // Bombs
  BOMB_FUSE_DURATION: 3.5,
  BOMB_AOE_DAMAGE: 2,

  // Enemies
  ENEMY_SPAWN_INTERVAL: 3.0,
  ENEMY_MAX: 8,
  SCOUT_SPEED: 60, SCOUT_HP: 1, SCOUT_RADIUS: 7, SCOUT_CHARGE_DIST: 50, SCOUT_CHARGE_SPEED: 180,
  FIGHTER_SPEED: 45, FIGHTER_HP: 2, FIGHTER_RADIUS: 9, FIGHTER_ORBIT_DIST: 80, FIGHTER_DASH_INTERVAL: 3.0,
  TANK_SPEED: 30, TANK_HP: 4, TANK_RADIUS: 12,

  // Waves
  WAVE_INTERVAL: 20,
  WAVE_EVENT_INTERVAL: 3, // event every 3rd wave

  // Scoring
  SCORE_PER_SECOND: 1,
  SCORE_KILL_SCOUT: 10,
  SCORE_KILL_FIGHTER: 20,
  SCORE_KILL_TANK: 40,
  SCORE_CAPTURE: 2,
  SCORE_GOLD_CAPTURE: 8,

  // Effects
  SHAKE_DURATION: 0.2, SHAKE_INTENSITY: 4,
  FLASH_DURATION: 0.15, PARTICLE_LIFETIME: 0.6,

  // Grades
  GRADE_THRESHOLDS: [
    { min: 400, grade: "S", color: 0xffd700 },
    { min: 200, grade: "A", color: 0x44ff44 },
    { min: 100, grade: "B", color: 0x4488ff },
    { min: 50,  grade: "C", color: 0xcccccc },
    { min: 20,  grade: "D", color: 0xaa8866 },
  ],

  // Colors
  COLOR_BG: 0x02020a,
  COLOR_PLAYER: 0x44ccff,
  COLOR_PLAYER_CORE: 0xaaeeff,
  COLOR_PULL: 0x2266aa,
  COLOR_ORBIT_RING: 0x225588,
  COLOR_ASTEROID: 0x888899,
  COLOR_GOLD: 0xffd700,
  COLOR_BOMB: 0xff4422,
  COLOR_ENEMY_SCOUT: 0xff4466,
  COLOR_ENEMY_FIGHTER: 0xcc2244,
  COLOR_ENEMY_TANK: 0x882244,
  COLOR_FLUNG: 0x66ddff,
  COLOR_ARENA: 0x112244,
  COLOR_DANGER: 0xff2244,
} as const;

export function getGGrade(score: number): { grade: string; color: number } {
  for (const t of G.GRADE_THRESHOLDS) { if (score >= t.min) return t; }
  return { grade: "F", color: 0x886644 };
}
