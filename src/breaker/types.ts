// Grail Breaker – Medieval Brick-Breaker Types

export enum BreakerPhase {
  MENU = "menu",
  PLAYING = "playing",
  PAUSED = "paused",
  LEVEL_CLEAR = "level_clear",
  GAME_OVER = "game_over",
  VICTORY = "victory",
}

export enum BrickType {
  NORMAL = "normal",    // 1 hit
  STRONG = "strong",    // 2 hits
  METAL = "metal",      // 3 hits
  GOLD = "gold",        // indestructible
  EXPLOSIVE = "explosive", // damages neighbors
}

export enum PowerUpType {
  WIDE_PADDLE = "wide",
  MULTI_BALL = "multi",
  FIREBALL = "fireball",   // ball passes through bricks
  SLOW = "slow",
  EXTRA_LIFE = "life",
  LASER = "laser",         // paddle shoots lasers
}

export interface Brick {
  col: number;
  row: number;
  type: BrickType;
  hp: number;
  active: boolean;
}

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  fireball: boolean;
  active: boolean;
}

export interface PowerUp {
  x: number;
  y: number;
  vy: number;
  type: PowerUpType;
  collected: boolean;
}

export interface Laser {
  x: number;
  y: number;
  vy: number;
  active: boolean;
}

export interface BreakerPaddle {
  x: number;
  width: number;
  baseWidth: number;
  wideTimer: number;
  laserTimer: number;
  laserCooldown: number;
  vx: number;           // current velocity for inertia
}

/** Gameplay event callbacks – set by orchestrator, fired by physics. */
export interface BreakerEvents {
  onBrickDestroyed?: (worldX: number, worldY: number, color: number) => void;
  onBrickHit?: (worldX: number, worldY: number, color: number) => void;
  onPaddleHit?: (worldX: number, worldY: number, edgeHit: boolean) => void;
  onPowerUpCollected?: (worldX: number, worldY: number, color: number) => void;
}

export interface BreakerState {
  phase: BreakerPhase;
  paddle: BreakerPaddle;
  balls: Ball[];
  bricks: Brick[];
  powerUps: PowerUp[];
  lasers: Laser[];
  level: number;
  score: number;
  lives: number;
  time: number;
  slowTimer: number;
  highScore: number;
  combo: number;        // consecutive brick hits without paddle touch
  bestCombo: number;
  ballOnPaddle: boolean; // true when ball is sitting on paddle before launch
  aimDir: number;        // -1 left, 0 center, +1 right (launch aim indicator)
  launchCharge: number;  // 0..1, how long space has been held for power launch
  launchCharging: boolean; // true while space is held before launch
  events: BreakerEvents;
}

export interface BreakerMeta {
  highScore: number;
  bestLevel: number;
  totalBricks: number;
  gamesPlayed: number;
}
