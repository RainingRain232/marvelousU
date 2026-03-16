// ---------------------------------------------------------------------------
// Duel mode – balance constants
// ---------------------------------------------------------------------------

export const DuelBalance = {
  // Timing
  SIM_FPS: 60,
  FRAME_MS: 1000 / 60,
  ROUND_TIME_SECONDS: 99,
  ROUND_TIME_FRAMES: 99 * 60,

  // Physics
  GRAVITY: 1.2,
  STAGE_FLOOR_RATIO: 0.82, // floor Y as fraction of screen height
  PUSH_BACK_SPEED: 3,
  STAGE_MARGIN: 60, // left/right wall margin from screen edge

  // Combo
  COMBO_DAMAGE_SCALING: 0.85,
  MIN_DAMAGE_SCALING: 0.3,

  // Counter-hit
  COUNTER_HIT_DAMAGE_MULT: 1.2,
  COUNTER_HIT_EXTRA_HITSTUN: 3,

  // Tech roll
  TECH_ROLL_WINDOW: 10,         // frames after knockdown where tech input is accepted
  TECH_ROLL_DISTANCE: 80,       // pixels to roll
  TECH_ROLL_RECOVERY: 12,       // faster recovery frames after tech roll (vs normal 40 knockdown + 20 getup)

  // Wave mode difficulty scaling
  WAVE_HP_SCALING: 0.10,        // +10% enemy HP per wave
  WAVE_DMG_SCALING: 0.05,       // +5% enemy damage per wave

  // Blocking
  CHIP_DAMAGE_MULT: 0.2,

  // Input
  INPUT_BUFFER_FRAMES: 8,
  SIMULTANEOUS_WINDOW: 4,
  DASH_TAP_WINDOW: 12, // max frames between taps for a dash

  // Dash
  DASH_FORWARD_SPEED: 14, // pixels per frame
  DASH_BACK_SPEED: 11,
  DASH_DURATION: 10, // frames
  DASH_BACK_INVINCIBLE: 4, // i-frames at start of backdash

  // Hit effects
  HIT_FREEZE_FRAMES: 6,
  KO_SLOWDOWN_FRAMES: 30,

  // Projectiles
  MAX_PROJECTILES: 3,
  PROJECTILE_DESPAWN_X: 100, // margin past stage edges

  // Grab
  GRAB_RANGE: 75,
  GRAB_WHIFF_RECOVERY: 30,

  // Rounds
  BEST_OF: 3,
  ROUND_START_DELAY: 90, // frames before "FIGHT"
  ROUND_END_DELAY: 120,

  // Positions (ratios of screen width for dynamic sizing)
  P1_START_RATIO: 0.3,
  P2_START_RATIO: 0.7,

  // Fighter body (hurtbox) — scaled up for ~200px tall fighters
  STAND_HURTBOX_W: 60,
  STAND_HURTBOX_H: 190,
  CROUCH_HURTBOX_H: 130,

  // Jump
  DEFAULT_JUMP_VELOCITY: -20,
  JUMP_FORWARD_SPEED: 6,

  // Fighter visual scale
  FIGHTER_SCALE: 1.0, // base scale for skeleton drawing

  // Zeal (ultimate meter)
  ZEAL_MAX: 100,
  ZEAL_GAIN_ON_HIT: 8,   // attacker gains when landing a hit
  ZEAL_GAIN_ON_HURT: 5,   // defender gains when getting hit
  ZEAL_1_COST: 50,
  ZEAL_2_COST: 100,
} as const;
