// Grail Breaker – Balance Configuration

export const BREAKER_BALANCE = {
  // Field
  FIELD_W: 1000,
  FIELD_H: 800,
  FIELD_X: 100,  // offset from left edge
  FIELD_Y: 60,

  // Bricks
  BRICK_COLS: 12,
  BRICK_ROWS: 8,
  BRICK_W: 80,
  BRICK_H: 28,
  BRICK_PAD: 3,

  // Paddle
  PADDLE_Y: 740,
  PADDLE_W: 130,
  PADDLE_H: 18,
  PADDLE_WIDE_W: 195,
  PADDLE_SPEED: 800,
  PADDLE_ACCEL: 3600,      // pixels/sec² acceleration
  PADDLE_FRICTION: 0.88,   // velocity damping per frame

  // Ball
  BALL_RADIUS: 8,
  BALL_SPEED: 480,
  BALL_MAX_SPEED: 800,
  BALL_SPEED_INCREMENT: 16,  // speed up per brick hit

  // Power-ups
  POWERUP_DROP_CHANCE: 0.15,
  POWERUP_FALL_SPEED: 195,
  WIDE_DURATION: 10,
  SLOW_DURATION: 5,
  SLOW_FACTOR: 0.5,
  LASER_DURATION: 8,
  LASER_COOLDOWN: 0.3,
  LASER_SPEED: 650,

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
