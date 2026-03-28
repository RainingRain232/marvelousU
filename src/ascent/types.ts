// Camelot Ascent – Vertical Platformer Types

export enum AscentPhase {
  MENU = "menu",
  START = "start",
  PLAYING = "playing",
  DEAD = "dead",
  PAUSED = "paused",
}

export interface Vec2 {
  x: number;
  y: number;
}

export interface AscentPlayer {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  facing: 1 | -1; // 1 = right, -1 = left
  grounded: boolean;
  jumpsLeft: number;
  maxJumps: number;
  hp: number;
  maxHp: number;
  invincibleTimer: number;
  shieldActive: boolean;
  speedBoostTimer: number;
  score: number;
  coins: number;
  highestY: number;
  floor: number;
  combo: number;
  comboTimer: number;  // resets to 0 when timer expires
  highestCombo: number;
  attackCooldown: number;
  wallSliding: boolean;
  dashTimer: number;
}

export enum PlatformType {
  NORMAL = "normal",
  MOVING = "moving",
  CRUMBLING = "crumbling",
  SPIKE = "spike",
  SPRING = "spring",
}

export interface Platform {
  x: number;
  y: number;
  width: number;
  type: PlatformType;
  moveSpeed: number; // for MOVING platforms
  moveRange: number;
  movePhase: number;
  crumbleTimer: number; // for CRUMBLING
  active: boolean;
}

export enum EnemyType {
  PATROL = "patrol",    // walks back and forth
  ARCHER = "archer",    // stands still, shoots arrows
  BAT = "bat",          // flies in sine wave
  BOMBER = "bomber",    // drops bombs downward
}

export interface Enemy {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  type: EnemyType;
  hp: number;
  alive: boolean;
  patrolMin: number;
  patrolMax: number;
  shootTimer: number;
  phase: number; // for sine wave movement
}

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fromPlayer: boolean;
  damage: number;
  lifetime: number;
}

export enum PickupType {
  COIN = "coin",
  HEART = "heart",
  DOUBLE_JUMP = "double_jump",
  SHIELD = "shield",
  SPEED = "speed",
  MAGNET = "magnet",
}

export interface Pickup {
  x: number;
  y: number;
  type: PickupType;
  collected: boolean;
  bobPhase: number;
}

export interface AscentState {
  phase: AscentPhase;
  player: AscentPlayer;
  platforms: Platform[];
  enemies: Enemy[];
  projectiles: Projectile[];
  pickups: Pickup[];
  cameraY: number;
  time: number;
  floor: number;
  bossActive: boolean;
  bossHp: number;
  bossMaxHp: number;
  highScore: number;
  deathCount: number;
  lastBossShootTime: number;
}

export interface AscentMeta {
  highScore: number;
  bestFloor: number;
  totalCoins: number;
  totalDeaths: number;
  gamesPlayed: number;
  // Unlockables
  unlockedDash: boolean;
  unlockedTripleJump: boolean;
  unlockedProjectile: boolean;
  permanentExtraHp: number; // 0-2 extra starting HP
}
