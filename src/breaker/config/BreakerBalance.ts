// Grail Breaker – Balance Configuration

export const BREAKER_BALANCE = {
  // Field
  FIELD_W: 600,
  FIELD_H: 500,
  FIELD_X: 100,  // offset from left edge of 800px screen
  FIELD_Y: 50,

  // Bricks
  BRICK_COLS: 12,
  BRICK_ROWS: 8,
  BRICK_W: 48,
  BRICK_H: 18,
  BRICK_PAD: 2,

  // Paddle
  PADDLE_Y: 460,
  PADDLE_W: 80,
  PADDLE_H: 12,
  PADDLE_WIDE_W: 120,
  PADDLE_SPEED: 500,
  PADDLE_ACCEL: 2200,      // pixels/sec² acceleration
  PADDLE_FRICTION: 0.88,   // velocity damping per frame

  // Ball
  BALL_RADIUS: 5,
  BALL_SPEED: 300,
  BALL_MAX_SPEED: 500,
  BALL_SPEED_INCREMENT: 10,  // speed up per brick hit

  // Power-ups
  POWERUP_DROP_CHANCE: 0.15,
  POWERUP_FALL_SPEED: 120,
  WIDE_DURATION: 10,
  SLOW_DURATION: 5,
  SLOW_FACTOR: 0.5,
  LASER_DURATION: 8,
  LASER_COOLDOWN: 0.3,
  LASER_SPEED: 400,

  // Lives
  STARTING_LIVES: 3,

  // Scoring
  SCORE_NORMAL: 10,
  SCORE_STRONG: 25,
  SCORE_METAL: 50,
  SCORE_EXPLOSIVE: 30,

  // Levels
  TOTAL_LEVELS: 10,
} as const;

// Brick colors per type
export const BRICK_COLORS: Record<string, number> = {
  normal: 0xcc6644,
  strong: 0x888888,
  metal: 0xaaaacc,
  gold: 0xffd700,
  explosive: 0xff4422,
};

// Brick HP per type
export const BRICK_HP: Record<string, number> = {
  normal: 1,
  strong: 2,
  metal: 3,
  gold: 999,  // indestructible
  explosive: 1,
};
