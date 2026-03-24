// ---------------------------------------------------------------------------
// Flux — Type definitions
// Gravity manipulation arena — no weapons, only physics
// ---------------------------------------------------------------------------

export enum FluxPhase {
  START = "start",
  PLAYING = "playing",
  PAUSED = "paused",
  WAVE_CLEAR = "wave_clear",
  DEAD = "dead",
  VICTORY = "victory",
}

export enum EnemyType {
  DRONE = "drone",       // floats toward player, melee
  SHOOTER = "shooter",   // fires projectiles at player
  TANK = "tank",         // large, slow, heavy — hard to move
  SWARM = "swarm",       // tiny, fast, comes in packs
  BOMBER = "bomber",     // explodes on death, damaging nearby enemies
}

export interface Vec2 { x: number; y: number; }

export interface GravityWell {
  x: number; y: number;
  strength: number;       // pull force
  radius: number;         // effect radius
  life: number;           // seconds remaining
  maxLife: number;
}

export interface FluxEnemy {
  x: number; y: number;
  vx: number; vy: number;
  type: EnemyType;
  hp: number; maxHp: number;
  radius: number;
  mass: number;            // heavier = harder to pull
  speed: number;
  color: number;
  alive: boolean;
  deathTimer: number;
  flashTimer: number;
  // Shooter
  attackTimer: number;
  // Bomber
  explodeRadius: number;
}

export interface Projectile {
  x: number; y: number;
  vx: number; vy: number;
  radius: number;
  damage: number;
  color: number;
  life: number;
  fromEnemy: boolean;     // true = enemy projectile, can be redirected
  redirected: boolean;    // true = pulled by well, now damages enemies
}

export interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  color: number; size: number;
}

export interface FloatingText {
  x: number; y: number;
  text: string; color: number;
  life: number; maxLife: number;
}

export interface FluxState {
  phase: FluxPhase;
  arenaW: number; arenaH: number;

  // Player (floats freely in zero-G)
  px: number; py: number;
  pvx: number; pvy: number;    // velocity (momentum-based movement)
  hp: number; maxHp: number;
  invincibleTimer: number;

  // Gravity wells
  wells: GravityWell[];
  wellCharges: number;         // how many wells you can place
  maxWellCharges: number;
  wellRechargeTimer: number;

  // Slingshot dash
  dashCooldown: number;

  // Gravity Bomb (charged ultimate)
  gravBombCharge: number;    // 0-60
  gravBombActive: number;    // >0 = bomb is active

  // Repulsor (push field)
  repulsorCooldown: number;

  // Wave upgrades (temporary per-run buffs chosen between waves)
  upgradeWellStrength: number;  // bonus multiplier
  upgradeWellRadius: number;
  upgradeRechargeSpeed: number;
  upgradeMaxCharges: number;    // bonus charges

  // Spawn warnings
  spawnWarnings: { x: number; y: number; timer: number }[];

  // Combat
  enemies: FluxEnemy[];
  projectiles: Projectile[];

  // Waves
  wave: number;
  waveTimer: number;
  waveSpawnCount: number;
  waveSpawnTimer: number;
  waveClearTimer: number;

  // Score
  score: number; highScore: number;
  combo: number; comboTimer: number; bestCombo: number;
  totalKills: number;
  totalRedirects: number;      // projectiles redirected
  totalCollisions: number;     // enemy-on-enemy kills

  // Audio event flags (cleared each frame by orchestrator)
  frameKills: number;
  frameCollisions: number;
  frameRedirects: number;
  frameExplosions: number;

  // Aim
  aimAngle: number;

  // Tutorial hints (shown once per mechanic)
  tutorialStep: number;        // 0=place well, 1=redirect, 2=collision, 3=slingshot, 4=done
  tutorialTimer: number;       // countdown to auto-dismiss

  // Timing
  time: number;

  // VFX
  particles: Particle[];
  floatingTexts: FloatingText[];
  screenShake: number;
  screenFlashColor: number;
  screenFlashTimer: number;
  arenaPulse: number;
}

export interface FluxUpgrades {
  maxHp: number;       // 0-2
  wellPower: number;   // 0-2
  extraCharge: number; // 0-2
  bombCharge: number;  // 0-2 (faster bomb charging)
}

export interface FluxMeta {
  highScore: number;
  bestWave: number;
  bestCombo: number;
  totalKills: number;
  gamesPlayed: number;
  voidShards: number;
  upgrades: FluxUpgrades;
}
