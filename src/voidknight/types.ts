// ---------------------------------------------------------------------------
// Void Knight — Type definitions (v2)
// ---------------------------------------------------------------------------

export enum VKPhase {
  START = "start",
  PLAYING = "playing",
  PAUSED = "paused",
  DEAD = "dead",
  UPGRADE = "upgrade", // between-wave perk selection
}

export enum ProjectilePattern {
  STRAIGHT = "straight",
  SPIRAL = "spiral",
  RING = "ring",
  AIMED = "aimed",
  WAVE = "wave",
  CROSS = "cross",
}

export interface VKProjectile {
  x: number; y: number;
  vx: number; vy: number;
  radius: number;
  color: number;
  life: number;
  pattern: ProjectilePattern;
  grazed: boolean; // already counted for graze this pass
}

export interface VKOrb {
  x: number; y: number;
  kind: "score" | "shield" | "slow" | "magnet" | "reflect" | "bomb";
  age: number;
  pulse: number;
}

export interface VKParticle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  color: number; size: number;
}

export interface VKFloatText {
  x: number; y: number;
  text: string; color: number;
  life: number; maxLife: number;
  scale: number;
}

export interface VKSpawner {
  angle: number;
  fireTimer: number;
  pattern: ProjectilePattern;
  burstCount: number;
  burstIndex: number;
  burstDelay: number;
  alive: boolean;
  hp: number;
  maxHp: number;
  flashTimer: number;
  isBoss: boolean;
  telegraphTimer: number;
  damagedThisDash: boolean;
  movement: "orbit" | "oscillate" | "stationary";
  phase: number; // boss phase (0, 1, 2) — changes at HP thresholds
}

/** Expanding shockwave ring on spawner death */
export interface VKShockwave {
  x: number; y: number;
  radius: number;
  maxRadius: number;
  life: number;
  color: number;
}

/** Upgrade perk offered between waves */
export interface VKPerk {
  id: string;
  name: string;
  desc: string;
  color: number;
}

export interface VKState {
  phase: VKPhase;
  // Arena
  arenaRadius: number;
  arenaCenterX: number;
  arenaCenterY: number;
  // Player
  playerX: number; playerY: number;
  playerVX: number; playerVY: number;
  playerRadius: number;
  playerSpeed: number;
  // Dash
  dashCooldown: number;
  dashTimer: number;
  dashDirX: number; dashDirY: number;
  dashKills: number; // projectiles destroyed this dash
  // Shield
  shieldHits: number;
  // Slow time
  slowTimer: number;
  // Magnet
  magnetTimer: number;
  // Reflect
  reflectTimer: number;
  // Score
  score: number;
  highScore: number;
  nearMisses: number;
  orbsCollected: number;
  // Multiplier
  multiplier: number;     // 1.0x base, increases with near-misses
  multiplierDecay: number; // timer before multiplier starts decaying
  // Graze meter
  grazeMeter: number;     // 0-100, fills from sustained near-miss proximity
  grazeBurstReady: boolean;
  // Hitstop
  hitstopTimer: number;
  // Wave
  wave: number;
  waveTimer: number;
  spawners: VKSpawner[];
  // Projectiles
  projectiles: VKProjectile[];
  orbs: VKOrb[];
  orbTimer: number; // moved from module-level
  // Particles
  particles: VKParticle[];
  floatTexts: VKFloatText[];
  // Effects
  screenShake: number;
  screenFlashColor: number;
  screenFlashTimer: number;
  nearMissFlash: number;
  // Shockwaves
  shockwaves: VKShockwave[];
  // Wave mutators
  waveMutators: string[];
  // Upgrade perks
  selectedPerks: string[];
  perkChoices: VKPerk[];
  // Timing
  time: number;
  // Stats
  wavesCleared: number;
  spawnersDestroyed: number;
  totalDodged: number;
  dashKillsTotal: number;
  peakMultiplier: number;
  // Near-miss streak for announcer
  nearMissStreak: number;
  nearMissStreakTimer: number;
  // Last Stand
  lastStandUsed: boolean;
  lastStandActive: boolean;
  // Tutorial (wave 0 for first-time players)
  tutorialStep: number; // 0=not active, 1=move, 2=dash, 3=spawner, 4=done
  tutorialTimer: number;
  tutorialSpawned: boolean;
  // Wave intro freeze
  waveIntroTimer: number;
  // Death replay
  deathSlowTimer: number;
  deathX: number; deathY: number;
  killerColor: number;
  killerX: number; killerY: number;
}

/** Curated wave template */
export interface VKWaveTemplate {
  name: string;
  spawners: Array<{ pattern: ProjectilePattern; movement: "orbit" | "oscillate" | "stationary"; isBoss?: boolean }>;
  mutator?: string;
}

export interface VKMeta {
  highScore: number;
  bestWave: number;
  bestMultiplier: number;
  gamesPlayed: number;
  totalNearMisses: number;
  totalOrbsCollected: number;
  totalSpawnersDestroyed: number;
  unlocks: string[];
}
