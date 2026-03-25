// ---------------------------------------------------------------------------
// Runeblade — Type definitions
// Fast-paced melee combat with elemental rune enchantments
// ---------------------------------------------------------------------------

export enum RBPhase {
  START = "start",
  PLAYING = "playing",
  PAUSED = "paused",
  DEAD = "dead",
}

export type RuneType = "fire" | "ice" | "lightning" | "shadow";
export type EnemyKind = "skeleton" | "archer" | "knight" | "wraith" | "necromancer";
export type BossKind = "dark_knight" | "lich_king" | "dragon_wyrm";

export interface RBEnemy {
  eid: string;
  x: number; y: number; hp: number; maxHp: number;
  kind: EnemyKind; alive: boolean; radius: number;
  speed: number; flashTimer: number;
  state: "approach" | "attack" | "stunned" | "frozen";
  stateTimer: number; frozenTimer: number;
  summonCount?: number; // necromancer: number of active summons
  ownerEid?: string;    // skeleton summoned by necromancer: owner eid
  burnTimer: number; burnDamage: number;
  parryStunned: boolean;
  spawnTimer: number; // portal effect timer on spawn
  elite: boolean; // elite variant: 2x HP, gold border, 2x score
}

export interface RBBoss {
  x: number; y: number; hp: number; maxHp: number;
  kind: BossKind;
  radius: number; speed: number;
  phase: number; // attack phase (cycles through patterns)
  phaseTimer: number; attackTimer: number;
  alive: boolean; flashTimer: number;
  shieldHP: number; // regenerating shield
}

export interface RBHazard {
  x: number; y: number; kind: "spike_pit" | "flame_vent" | "ice_patch";
  radius: number; activeTimer: number; active: boolean;
}

export interface RBProjectile {
  x: number; y: number; vx: number; vy: number;
  damage: number; radius: number; life: number;
  color: number; fromEnemy: boolean;
}

export interface RBSlash {
  x: number; y: number; angle: number; radius: number;
  life: number; maxLife: number; rune: RuneType; damage: number;
  hitIds: string[];
}

export interface RBSlashGhost {
  x: number; y: number; angle: number; radius: number;
  life: number; maxLife: number; rune: RuneType;
}

export interface RBBloodStain {
  x: number; y: number; size: number; alpha: number;
}

export interface RBParticle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; color: number; size: number;
}

export interface RBFloatText {
  x: number; y: number; text: string; color: number;
  life: number; maxLife: number; scale: number;
}

export interface RBShockwave {
  x: number; y: number; radius: number; maxRadius: number;
  life: number; maxLife: number; color: number;
}

export interface RBPickup {
  x: number; y: number; kind: "health" | "rune_charge" | "score_orb";
  life: number; radius: number;
}

export interface RBFireTrail {
  x: number; y: number; life: number; maxLife: number; radius: number;
}

export interface RBLightningChain {
  x1: number; y1: number; x2: number; y2: number;
  life: number; maxLife: number;
}

export interface RBState {
  phase: RBPhase; time: number;
  // Arena
  arenaW: number; arenaH: number;
  // Player
  playerX: number; playerY: number; playerRadius: number;
  playerHP: number; maxHP: number;
  aimAngle: number; moveAngle: number;
  attackTimer: number; attackCooldown: number;
  dodgeTimer: number; dodgeCooldown: number; dodgeCooldownMax: number;
  dodging: boolean; dodgeAngle: number;
  invulnTimer: number;
  // Runes
  currentRune: RuneType; runeCharges: Record<RuneType, number>;
  prevRune: RuneType; runeSwitchTimer: number;
  // Rune ultimate
  runeUltCharge: number; ultimateActive: string; ultimateTimer: number;
  // Combat
  comboCount: number; comboTimer: number;
  slashes: RBSlash[];
  enemies: RBEnemy[];
  projectiles: RBProjectile[];
  particles: RBParticle[];
  floatTexts: RBFloatText[];
  fireTrails: RBFireTrail[];
  lightningChains: RBLightningChain[];
  shockwaves: RBShockwave[];
  // Wave
  wave: number; waveTimer: number; enemySpawnTimer: number;
  enemiesKilled: number; totalKills: number;
  waveEventActive: string; waveSpeedBoost: number;
  // Scoring
  score: number; screenShake: number;
  screenFlashTimer: number; screenFlashColor: number;
  // Parry / Perfect dodge
  slowTimer: number;
  // Meta
  hitstopFrames: number;
  nextEnemyId: number;
  // Rune mastery
  runeKills: Record<RuneType, number>;
  runeMastery: Record<RuneType, number>;
  // Meta-progression applied values
  ultChargeBonus: number;   // extra ult charge per kill from upgrades
  runepowerBonus: number;   // rune effect multiplier bonus from upgrades (0.25 per level)
  // Rune synergy combos
  lastKillRune: RuneType | null;
  synergyBonus: string;
  synergyTimer: number;
  // Execution mechanic
  executeTimer: number;
  // Blood moon wave event
  bloodMoonActive: boolean;
  // Slash trail persistence (ghost arcs)
  slashGhosts: RBSlashGhost[];
  // Footstep dust
  footstepTimer: number;
  // Rune ambient particles (stored separately from combat particles)
  ambientParticles: RBParticle[];
  // Blood stains on kills
  bloodStains: RBBloodStain[];
  // Synergy bonuses applied to next attack
  synergyVoidBoltActive: boolean;   // next shadow attack has 80px range
  synergyDarkFlameActive: boolean;  // next fire trail lasts 2x longer
  // Boss system
  boss: RBBoss | null;
  bossWave: boolean;
  bossAnnounceTimer: number;
  // Arena hazards
  arenaHazards: RBHazard[];
  hazardDamageCooldown: number; // cooldown for spike pit damage to player
  // Dash attack
  dashStrikeUsed: boolean;
  // Pickups
  pickups: RBPickup[];
  killStreakTimer: number;
  killStreakCount: number;
}

export interface RBMeta {
  highScore: number; bestWave: number; gamesPlayed: number;
  shards: number;
  upgrades: {
    maxHP: number;        // +1 HP per level (max 3)
    attackSpeed: number;  // -0.03s cooldown per level (max 3)
    dodgeCooldown: number; // -0.1s dodge CD per level (max 3)
    runepower: number;    // +25% rune effect per level (max 3)
    ultCharge: number;    // +3 charge per kill per level (max 2)
  };
}
