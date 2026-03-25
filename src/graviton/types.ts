// ---------------------------------------------------------------------------
// Graviton — Type definitions
// A gravity manipulation game: pull asteroids into orbit, fling them at enemies
// ---------------------------------------------------------------------------

export enum GPhase {
  START = "start",
  PLAYING = "playing",
  PAUSED = "paused",
  DEAD = "dead",
}

export interface GBody {
  x: number; y: number;
  vx: number; vy: number;
  radius: number;
  kind: "asteroid" | "gold_asteroid" | "bomb";
  orbiting: boolean;    // true = captured in player orbit
  orbitAngle: number;   // current angle around player
  orbitDist: number;    // distance from player center
  flung: boolean;
  life: number;
  fuseTimer: number;    // bomb fuse countdown (only for bombs in orbit)
}

export interface GEnemy {
  x: number; y: number;
  vx: number; vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  kind: "scout" | "fighter" | "tank" | "splitter" | "phaser" | "mini";
  alive: boolean;
  flashTimer: number;
  state: "approach" | "orbit" | "dash" | "charge" | "windup"; // AI state
  stateTimer: number;
  armor: boolean;       // tank armor (deflects first hit)
  phaseTimer: number;   // phaser teleport cooldown
}

export interface GParticle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  color: number; size: number;
}

export interface GFloatText {
  x: number; y: number;
  text: string; color: number;
  life: number; maxLife: number;
  scale: number;
}

export interface GPowerup {
  x: number; y: number;
  kind: "shield" | "magnet" | "rapid";
  life: number;
}

export interface GState {
  phase: GPhase;
  // Arena
  arenaRadius: number;
  arenaCX: number; arenaCY: number;
  // Player
  playerX: number; playerY: number;
  playerRadius: number;
  hp: number; maxHp: number;
  // Gravity
  pulling: boolean;
  pullRadius: number;
  pullEnergy: number;     // 0-1, drains while pulling
  // Aim
  aimAngle: number;       // direction to fling (based on last movement)
  // Orbiting ring
  orbitCount: number;   // how many objects currently orbiting
  orbitCapacity: number;
  // Objects
  bodies: GBody[];
  enemies: GEnemy[];
  bodySpawnTimer: number;
  enemySpawnTimer: number;
  // Fling
  flingCooldown: number;
  flingHoldTimer: number;  // how long Shift has been held
  flingHeld: boolean;      // currently holding Shift
  // Score
  score: number; highScore: number;
  enemiesKilled: number;
  asteroidsCaptured: number;
  asteroidsLaunched: number;
  // Wave
  wave: number; waveTimer: number;
  waveEvent: string;
  // Combo
  comboCount: number;
  comboTimer: number;  // resets after 2s without a kill
  // Hitstop
  hitstopFrames: number;
  // Threat level (0-1 for visual reactivity)
  threatLevel: number;
  // Active mutation + derived multipliers
  activeMutation: string;
  flingDamageMult: number;
  pullDrainMult: number;
  bombChanceOverride: number; // -1 = use default
  // Perfect wave tracking
  waveDamageTaken: boolean;
  // Power-ups
  powerups: GPowerup[];
  activeEffects: { shield: number; magnet: number; rapid: number };
  // Effects
  particles: GParticle[];
  floatTexts: GFloatText[];
  screenShake: number;
  screenFlashColor: number;
  screenFlashTimer: number;
  // Timing
  time: number;
}

export interface GMeta {
  highScore: number;
  bestWave: number;
  gamesPlayed: number;
  totalKills: number;
  unlocks: string[];
}
