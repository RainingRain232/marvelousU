// ---------------------------------------------------------------------------
// Chronomancer — Type definitions
// Time-manipulation combat arena
// ---------------------------------------------------------------------------

export enum CMPhase {
  START = "start",
  PLAYING = "playing",
  PAUSED = "paused",
  DEAD = "dead",
}

export type CMEnemyKind = "footman" | "archer" | "shieldbearer" | "chrono_knight" | "time_wraith";

export type CMBossKind = "temporal_titan" | "clockwork_hydra" | "void_sovereign";

export interface CMBoss {
  x: number; y: number;
  hp: number; maxHp: number;
  kind: CMBossKind;
  radius: number; speed: number;
  phase: number; phaseTimer: number;
  attackTimer: number;
  alive: boolean; flashTimer: number;
  shieldHP: number;
}

export interface CMEnemy {
  eid: string;
  x: number; y: number;
  hp: number; maxHp: number;
  kind: CMEnemyKind;
  alive: boolean;
  radius: number;
  speed: number;
  baseSpeed: number;
  flashTimer: number;
  state: "approach" | "attack" | "stunned";
  stateTimer: number;
  slowFactor: number; // 0-1, how much time-slowed (1 = normal speed, 0.3 = very slow)
  slowTimer: number;
  frozenTimer: number; // completely frozen (time stop)
  spawnTimer: number;
  elite: boolean;
  // Archer specific
  fireTimer: number;
  // Shieldbearer: blocks frontal attacks
  shieldAngle: number;
  // Time wraith: teleport cooldown
  teleportTimer: number;
}

export interface CMProjectile {
  x: number; y: number;
  vx: number; vy: number;
  damage: number;
  radius: number;
  life: number;
  color: number;
  fromEnemy: boolean;
  slowOnHit: boolean; // time bolts slow enemies
  piercing: boolean; // passes through enemies
}

export interface CMTimeZone {
  x: number; y: number;
  radius: number;
  life: number; maxLife: number;
  slowFactor: number; // enemies inside are slowed to this factor
  kind: "pulse" | "echo_blast" | "chrono_field";
}

export interface CMTemporalEcho {
  x: number; y: number;
  life: number; maxLife: number;
  explodeRadius: number;
  damage: number;
}

export interface CMParticle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  color: number; size: number;
}

export interface CMFloatText {
  x: number; y: number;
  text: string; color: number;
  life: number; maxLife: number;
  scale: number;
}

export interface CMShockwave {
  x: number; y: number;
  radius: number; maxRadius: number;
  life: number; maxLife: number;
  color: number;
}

export interface CMPositionSnapshot {
  x: number; y: number;
  hp: number;
  time: number;
}

export interface CMPickup {
  x: number; y: number;
  kind: "health" | "chrono_charge" | "score_orb";
  life: number; radius: number;
}

export interface CMHazard {
  x: number; y: number;
  kind: "temporal_rift" | "time_accelerator" | "void_well";
  radius: number;
  life: number; maxLife: number;
  active: boolean;
  activeTimer: number;
}

export interface CMState {
  phase: CMPhase;
  time: number;
  // Arena
  arenaW: number; arenaH: number;
  // Player
  playerX: number; playerY: number;
  playerRadius: number;
  playerHP: number; maxHP: number;
  aimAngle: number;
  moveAngle: number;
  invulnTimer: number;
  // Abilities
  boltCooldown: number;
  dashCooldown: number; dashCooldownMax: number;
  dashTimer: number; dashAngle: number; dashing: boolean;
  pulseCooldown: number; pulseCooldownMax: number;
  chronoShiftCooldown: number; chronoShiftCooldownMax: number;
  chronoShiftActive: boolean; chronoShiftTimer: number;
  // Time aura (passive)
  timeAuraRadius: number;
  // Combat
  enemies: CMEnemy[];
  projectiles: CMProjectile[];
  timeZones: CMTimeZone[];
  temporalEchoes: CMTemporalEcho[];
  particles: CMParticle[];
  floatTexts: CMFloatText[];
  shockwaves: CMShockwave[];
  pickups: CMPickup[];
  // Position history for chrono shift
  positionHistory: CMPositionSnapshot[];
  // Wave
  wave: number; waveTimer: number;
  enemySpawnTimer: number;
  enemiesKilled: number; totalKills: number;
  waveEventActive: string;
  // Scoring
  score: number;
  comboCount: number; comboTimer: number;
  killStreakCount: number; killStreakTimer: number;
  // Screen effects
  screenShake: number;
  screenFlashTimer: number; screenFlashColor: number;
  hitstopFrames: number;
  // Time distortion visual
  timeDistortion: number; // 0-1, visual warp intensity
  // Boss
  boss: CMBoss | null;
  bossWave: boolean;
  bossAnnounceTimer: number;
  // Time freeze ability (freezes all non-chrono-knight enemies)
  timeFreezeActive: boolean;
  timeFreezeTimer: number;
  timeFreezeCooldown: number;
  timeFreezeCooldownMax: number;
  // Piercing bolt upgrade tracker
  boltPowerLevel: number;
  // Charged bolt
  chargingBolt: boolean;
  chargeTime: number;
  maxChargeTime: number;
  // Wave announcement
  waveAnnounceTimer: number;
  // Arena hazards
  arenaHazards: CMHazard[];
  // Ability synergies
  lastAbilityUsed: string;
  synergyTimer: number;
  synergyBonus: string;
  // Best combo tracking
  bestCombo: number;
  // Meta
  nextEnemyId: number;
  // Blood stains
  bloodStains: Array<{ x: number; y: number; size: number; alpha: number }>;
  // Footstep timer
  footstepTimer: number;
}

export interface CMMeta {
  highScore: number;
  bestWave: number;
  gamesPlayed: number;
  shards: number;
  upgrades: {
    maxHP: number;       // +1 HP per level (max 3)
    boltPower: number;   // +25% bolt damage per level (max 3)
    dashCooldown: number; // -0.5s dash CD per level (max 3)
    pulsePower: number;  // +20% pulse radius per level (max 3)
    chronoShift: number; // +1s rewind duration per level (max 2)
  };
}
