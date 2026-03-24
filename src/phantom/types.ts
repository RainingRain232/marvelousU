// ---------------------------------------------------------------------------
// Phantom — Type definitions (v3)
// ---------------------------------------------------------------------------

export enum PhantomPhase {
  START = "start",
  PLAYING = "playing",
  PAUSED = "paused",
  CAUGHT = "caught",
  FLOOR_CLEAR = "floor_clear",
  GAME_OVER = "game_over",
  VICTORY = "victory",
}

export enum TileType {
  FLOOR = 0,
  WALL = 1,
  SHADOW = 2,
  EXIT = 3,
  RELIC = 4,
  TRAP = 5,
  DISTRACTION = 6,
  LOCKED_DOOR = 7,
  KEY = 8,
  SMOKE = 9,
}

export enum GuardType {
  PATROL = "patrol",
  SENTRY = "sentry",
  HOUND = "hound",
}

export enum GuardState {
  PATROL = "patrol",
  ALERT = "alert",
  CHASE = "chase",
  STUNNED = "stunned",
  KNOCKOUT = "knockout",
  SLEEPING = "sleeping",        // asleep — wakes from nearby noise
}

export enum StealthRating {
  GHOST = "ghost",
  SHADOW = "shadow",
  EXPOSED = "exposed",
}

export enum FloorModifier {
  NONE = "none",
  DARKNESS = "darkness",       // reduced player visibility range
  ALARM = "alarm",             // when one guard chases, ALL guards chase
  REINFORCED = "reinforced",   // +50% more guards
  TREASURY = "treasury",       // extra relics + extra guards
  CURSED = "cursed",           // double traps, no stone pickups
  SWIFT = "swift",             // guards move faster, but more shadows
}

export interface Cell { x: number; y: number; }

export interface Guard {
  x: number;
  y: number;
  dir: number;
  state: GuardState;
  type: GuardType;
  patrol: Cell[];
  patrolIndex: number;
  moveTimer: number;
  alertTimer: number;
  stunTimer: number;
  visionRange: number;
  visionAngle: number;
  speed: number;
  proximityRange: number;
  lastKnownPlayerX: number;
  lastKnownPlayerY: number;
}

export interface ThrownStone {
  x: number; y: number;
  targetX: number; targetY: number;
  timer: number; landed: boolean; noiseTimer: number;
}

export interface Torch {
  x: number; y: number;
  radius: number; flicker: number;
}

export interface SmokeTile {
  x: number; y: number; life: number;
}

export interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; color: number; size: number;
}

export interface FloatingText {
  x: number; y: number; text: string; color: number;
  life: number; maxLife: number;
}

/** Persistent upgrades bought with shadow coins */
export interface PhantomUpgrades {
  extraLife: number;          // 0-2, each adds +1 start life
  quickDash: number;          // 0-2, each reduces dash cooldown by 1.5s
  keenEyes: number;           // 0-2, each adds +1 visibility range
  lightFeet: number;          // 0-2, each reduces footstep noise chance by 10%
  extraSmoke: number;         // 0-1, +1 starting smoke bomb
}

export interface PhantomState {
  phase: PhantomPhase;
  cols: number;
  rows: number;
  tiles: TileType[][];
  revealed: boolean[][];

  // Player
  playerX: number;
  playerY: number;
  playerDir: number;
  hidden: boolean;
  stones: number;
  maxStones: number;
  lives: number;
  maxLives: number;
  keys: number;
  invincibleTimer: number;

  // Peeking
  peeking: boolean;            // currently holding peek key
  peekDir: number;             // direction peeking

  // Abilities
  shadowDashCooldown: number;
  smokeBombCooldown: number;
  smokeBombs: number;
  maxSmokeBombs: number;
  dashTrail: Cell[];
  dashTrailTimer: number;

  // Floor progression
  floor: number;
  floorModifier: FloorModifier;
  relicsCollected: number;
  relicsRequired: number;
  exitOpen: boolean;
  totalRelicsCollected: number;
  totalFloorsCleared: number;
  totalBackstabs: number;

  // Stealth tracking (per floor)
  floorDetected: boolean;
  floorCaught: boolean;
  floorStealthRating: StealthRating;

  // Guards
  guards: Guard[];
  thrownStones: ThrownStone[];

  // Environment
  torches: Torch[];
  smokeTiles: SmokeTile[];

  // Throwing mode
  throwing: boolean;
  throwTargetX: number;
  throwTargetY: number;

  // Movement interpolation
  prevPlayerX: number;
  prevPlayerY: number;
  moveFraction: number;         // 0→1, for smooth visual lerp

  // Timing
  time: number;
  floorTime: number;
  moveTimer: number;
  stepsSinceLastSound: number;

  // Guard noise reaction (for visual flash)
  guardNoiseFlash: Map<Guard, number>;

  // Relic combo
  relicComboTimer: number;      // seconds since last relic pickup
  relicComboCount: number;      // consecutive relics in combo window
  bestCombo: number;

  // Floor transition
  floorTransitionTimer: number; // >0 = fading in/out between floors

  // Quick throw
  throwDistance: number;        // 1-6 tiles, adjustable

  // Score
  score: number;
  highScore: number;

  // VFX
  particles: Particle[];
  floatingTexts: FloatingText[];
  screenShake: number;
  screenFlashColor: number;
  screenFlashTimer: number;
  alertPulse: number;
  ambientParticles: Particle[];

  // Detection
  detectionMeter: number;
  detectionDecay: number;

  // Upgrade-derived values
  visibilityRange: number;
  footstepNoiseChance: number;
}

export interface PhantomMeta {
  highScore: number;
  bestFloor: number;
  totalRelics: number;
  totalFloors: number;
  totalBackstabs: number;
  totalGhostFloors: number;
  gamesPlayed: number;
  shadowCoins: number;
  upgrades: PhantomUpgrades;
}
