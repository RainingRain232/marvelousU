// ---------------------------------------------------------------------------
// Echo — Balance constants (v2)
// ---------------------------------------------------------------------------

export const ECHO_BALANCE = {
  ARENA_PADDING: 40,
  PLAYER_SPEED: 220,
  PLAYER_RADIUS: 9,
  PLAYER_HP: 6,
  PLAYER_INVINCIBLE: 1.2,
  SHOOT_COOLDOWN: 0.18,
  BULLET_SPEED: 380,
  BULLET_DAMAGE: 1,
  BULLET_RADIUS: 3,
  BULLET_LIFE: 1.5,
  GHOST_BULLET_ALPHA: 0.6,

  LOOP_DURATION: 18,           // longer loops (was 12)
  MAX_LOOPS: 5,
  RECORD_FPS: 30,

  // Enemy scaling (steeper late-loop)
  ENEMY_BASE_HP: 2,
  ENEMY_HP_PER_LOOP: 2,        // +2 HP per loop (was 1)
  ENEMY_BASE_SPEED: 55,
  ENEMY_SPEED_PER_LOOP: 10,    // +10 speed per loop (was 6)
  ENEMY_RADIUS: 9,
  ENEMY_SPAWN_INTERVAL: 2.2,
  ENEMY_SPAWN_INTERVAL_PER_LOOP: -0.25, // faster scaling (was -0.15)
  ENEMY_MIN_SPAWN_INTERVAL: 0.5,  // harder cap (was 0.7)
  ENEMIES_PER_LOOP: 2,
  ENEMY_ATTACK_INTERVAL: 2.5,
  ENEMY_PROJ_SPEED: 140,
  ENEMY_SCORE: 15,

  // Elite enemies (appear loop 3+)
  ELITE_CHANCE: 0.15,
  ELITE_HP_MULT: 3,
  ELITE_SIZE_MULT: 1.5,
  ELITE_SCORE_MULT: 3,
  ELITE_COLOR: 0xff8844,

  // Rusher enemies (appear loop 2+, fast melee only)
  RUSHER_CHANCE: 0.2,
  RUSHER_SPEED_MULT: 2.0,
  RUSHER_HP_MULT: 0.5,
  RUSHER_COLOR: 0xaacc33,

  // Loop boss (spawns at end of each loop)
  BOSS_HP_BASE: 15,
  BOSS_HP_PER_LOOP: 10,
  BOSS_SPEED: 40,
  BOSS_RADIUS: 18,
  BOSS_SCORE: 100,
  BOSS_PROJ_SPEED: 120,
  BOSS_ATTACK_INTERVAL: 1.5,
  BOSS_SPAWN_TIME: 14,         // seconds into loop when boss spawns
  BOSS_COLOR: 0xdd44ff,

  // Time stop ability (unlocked at 3 ghosts)
  TIME_STOP_DURATION: 2.0,
  TIME_STOP_COOLDOWN: 15.0,

  // Loop upgrade options (2 choices per loop, exclusive)
  UPGRADE_FIRE_RATE: 0.8,      // stronger per level (was 0.85)
  UPGRADE_BULLET_SIZE: 1.4,    // stronger per level (was 1.3)
  UPGRADE_SPEED: 1.2,          // stronger per level (was 1.15)
  UPGRADE_MAX_HP: 2,           // +2 per level (was 1)

  // Combo
  COMBO_WINDOW: 2.5,

  // Visual
  SHAKE_DURATION: 0.2,
  SHAKE_INTENSITY: 4,
  FLASH_DURATION: 0.15,
  PARTICLE_LIFETIME: 0.8,

  // Ghost colors per loop
  GHOST_COLORS: [0x44aaff, 0x44ffaa, 0xffaa44, 0xff44aa, 0xaaff44] as readonly number[],

  // Colors
  COLOR_BG: 0x080818,
  COLOR_ARENA_GRID: 0x101030,
  COLOR_ARENA_BORDER: 0x202055,
  COLOR_PLAYER: 0x44ccff,
  COLOR_PLAYER_GLOW: 0x2288cc,
  COLOR_ENEMY: 0xcc5544,
  COLOR_ENEMY_PROJ: 0xff6644,
  COLOR_GHOST_BULLET: 0x88ccff,
  COLOR_HP: 0xff4444,
  COLOR_TIMER: 0x44ccff,
  COLOR_LOOP: 0xffcc44,
  COLOR_TEXT: 0xccccee,
  COLOR_GOLD: 0xffd700,
  COLOR_DANGER: 0xff2222,
  COLOR_SUCCESS: 0x44ff88,
  COLOR_COMBO: 0xffaa44,
} as const;
