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
  GRAVITY: 0.8,
  STAGE_WIDTH: 800,
  STAGE_FLOOR_Y: 400,
  STAGE_LEFT: 50,
  STAGE_RIGHT: 750,
  PUSH_BACK_SPEED: 2,

  // Combo
  COMBO_DAMAGE_SCALING: 0.9,
  MIN_DAMAGE_SCALING: 0.3,

  // Blocking
  CHIP_DAMAGE_MULT: 0.2,

  // Input
  INPUT_BUFFER_FRAMES: 8,
  SIMULTANEOUS_WINDOW: 4,

  // Hit effects
  HIT_FREEZE_FRAMES: 6,
  KO_SLOWDOWN_FRAMES: 30,

  // Projectiles
  MAX_PROJECTILES: 3,
  PROJECTILE_DESPAWN_X: 100, // margin past stage edges

  // Grab
  GRAB_RANGE: 45,
  GRAB_WHIFF_RECOVERY: 30,

  // Rounds
  BEST_OF: 3,
  ROUND_START_DELAY: 90, // frames before "FIGHT"
  ROUND_END_DELAY: 120,

  // Positions
  P1_START_X: 250,
  P2_START_X: 550,

  // Fighter body (hurtbox)
  STAND_HURTBOX_W: 40,
  STAND_HURTBOX_H: 90,
  CROUCH_HURTBOX_H: 55,

  // Jump
  DEFAULT_JUMP_VELOCITY: -14,
  JUMP_FORWARD_SPEED: 4,
} as const;
