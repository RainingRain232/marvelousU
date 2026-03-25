// ---------------------------------------------------------------------------
// Voidwalker — Type definitions
// Portal-based shadow combat: place void portals, teleport, control space
// ---------------------------------------------------------------------------

export enum VWPhase { START = "start", PLAYING = "playing", PAUSED = "paused", DEAD = "dead" }
export type VWEnemyKind = "cultist" | "dark_archer" | "void_golem" | "phase_stalker" | "warlock";

export interface VWPortal {
  x: number; y: number;
  life: number; maxLife: number;
  radius: number;
  id: number;
  stormBoltTimer: number;
}

export interface VWEnemy {
  eid: string;
  x: number; y: number; hp: number; maxHp: number;
  kind: VWEnemyKind; alive: boolean; radius: number;
  speed: number; baseSpeed: number; flashTimer: number;
  state: "approach" | "attack" | "stunned";
  stateTimer: number; stunTimer: number;
  spawnTimer: number; elite: boolean;
  fireTimer: number;
  summonTimer: number;
  teleportTimer: number;
}

export interface VWProjectile {
  x: number; y: number; vx: number; vy: number;
  damage: number; radius: number; life: number;
  color: number; fromEnemy: boolean;
  homing: boolean; homingStrength: number;
}

export interface VWParticle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; color: number; size: number;
}

export interface VWFloatText {
  x: number; y: number; text: string; color: number;
  life: number; maxLife: number; scale: number;
}

export interface VWShockwave {
  x: number; y: number; radius: number; maxRadius: number;
  life: number; maxLife: number; color: number;
}

export interface VWPickup {
  x: number; y: number;
  kind: "health" | "void_charge" | "score_orb";
  life: number; radius: number;
}

export interface VWHazard {
  x: number; y: number;
  kind: "void_rift" | "shadow_pool" | "energy_well";
  radius: number;
  life: number; maxLife: number;
  active: boolean; activeTimer: number;
}

export interface VWBoss {
  x: number; y: number; hp: number; maxHp: number;
  kind: "void_lord" | "portal_beast" | "shadow_king";
  radius: number; speed: number;
  phase: number; phaseTimer: number;
  attackTimer: number; alive: boolean; flashTimer: number;
}

export interface VWState {
  phase: VWPhase; time: number;
  arenaW: number; arenaH: number;
  // Player
  playerX: number; playerY: number; playerRadius: number;
  playerHP: number; maxHP: number;
  aimAngle: number; moveAngle: number;
  invulnTimer: number;
  // Portals (max 2 active)
  portals: VWPortal[];
  nextPortalId: number;
  portalTeleportCooldown: number;
  // Abilities
  boltCooldown: number;
  dashCooldown: number; dashCooldownMax: number;
  dashing: boolean; dashAngle: number; dashTimer: number;
  pulseCooldown: number; pulseCooldownMax: number;
  stormCooldown: number; stormCooldownMax: number;
  stormActive: boolean; stormTimer: number;
  // Combat
  enemies: VWEnemy[];
  projectiles: VWProjectile[];
  particles: VWParticle[];
  floatTexts: VWFloatText[];
  shockwaves: VWShockwave[];
  pickups: VWPickup[];
  // Arena hazards
  arenaHazards: VWHazard[];
  // Boss
  boss: VWBoss | null;
  bossWave: boolean;
  bossAnnounceTimer: number;
  // Wave
  wave: number; waveTimer: number; enemySpawnTimer: number;
  enemiesKilled: number; totalKills: number;
  waveEventActive: string; waveAnnounceTimer: number;
  // Scoring
  score: number; comboCount: number; comboTimer: number;
  killStreakCount: number; killStreakTimer: number;
  bestCombo: number;
  // Screen effects
  screenShake: number; screenFlashTimer: number; screenFlashColor: number;
  hitstopFrames: number;
  // Meta
  nextEnemyId: number;
  bloodStains: Array<{ x: number; y: number; size: number; alpha: number }>;
  footstepTimer: number;
  // Upgrade levels applied
  boltPowerLevel: number;
  dashPowerLevel: number;
  portalPowerLevel: number;
  // Ability synergy
  lastAbilityUsed: string;
  synergyTimer: number;
  synergyBonus: string;
}

export interface VWMeta {
  highScore: number; bestWave: number; gamesPlayed: number;
  shards: number;
  upgrades: {
    maxHP: number;        // +1 HP per level (max 3)
    boltPower: number;    // +25% bolt damage (max 3)
    dashPower: number;    // -0.5s dash CD (max 3)
    portalPower: number;  // +5s portal duration (max 3)
    stormPower: number;   // +1s storm duration (max 2)
  };
}
