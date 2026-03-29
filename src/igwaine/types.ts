// ---------------------------------------------------------------------------
// Igwaine — Types & State
// Solar knight arena survival
// ---------------------------------------------------------------------------

export enum IgwainePhase {
  START = "start",
  PLAYING = "playing",
  PAUSED = "paused",
  DEAD = "dead",
  WAVE_CLEAR = "wave_clear",
}

export enum Virtue {
  FELLOWSHIP = "fellowship",
  GENEROSITY = "generosity",
  CHASTITY = "chastity",
  COURTESY = "courtesy",
  PIETY = "piety",
}

export enum EnemyKind {
  WRAITH = "wraith",
  DARK_KNIGHT = "dark_knight",
  SHADE = "shade",
  SPECTER = "specter",
  REVENANT = "revenant",
  BANSHEE = "banshee",
  GREEN_KNIGHT = "green_knight",
}

export const enum EnemyAI {
  CHASE = 0,
  CIRCLE = 1,
  FLANK = 2,
  RANGED = 3,
  BOSS = 4,
  BANSHEE = 5,
}

export interface Projectile {
  x: number; y: number;
  vx: number; vy: number;
  dmg: number;
  life: number;
  fromPlayer: boolean;
  radius: number;
  color: number;
  pierce: number;
  trail: boolean;
  charged: boolean; // charged shot — bigger, knockback
}

export interface Enemy {
  x: number; y: number;
  vx: number; vy: number;
  hp: number; maxHp: number;
  kind: EnemyKind;
  ai: EnemyAI;
  speed: number;
  dmg: number;
  radius: number;
  attackCd: number;
  attackTimer: number;
  color: number;
  regenRate: number;
  stunTimer: number;
  flashTimer: number;
  // AI state
  circleAngle: number;
  shootCd: number;
  shootTimer: number;
  // Boss state
  chargeTimer: number;
  chargeCd: number;
  charging: boolean;
  chargeTargetX: number;
  chargeTargetY: number;
  slamCd: number;
  slamTimer: number;
  spawnFlash: number;
  // Boss ranged attack (later bosses)
  bossShootCd: number;
  bossSummonCd: number;
  // Revenant
  splitCount: number;
  // Wraith phase
  phaseTimer: number;
  phaseCd: number;
  // Spawn immunity
  spawnImmunity: number;
  // Shielded modifier — damage resistance timer (3 seconds)
  shieldedTimer: number; // >0 means takes 50% reduced damage
  // Banshee
  screamCd: number; // cooldown until next fear scream
  teleportCd: number; // cooldown until next blink
  // Elite variant
  elite: boolean; // elite enemies have crown, 2x HP, guaranteed drops
  // Boss enrage
  enraged: boolean; // Green Knight below 30% HP
}

export interface HpOrb {
  x: number; y: number;
  healAmount: number;
  life: number;
}

export enum PerkId {
  ATK_SPEED = "atk_speed",
  PROJ_SIZE = "proj_size",
  MAX_HP = "max_hp",
  MAX_ENERGY = "max_energy",
  LIFESTEAL = "lifesteal",
  EXPLOSION_ON_KILL = "explosion_on_kill",
  PROJ_SPEED = "proj_speed",
  DASH_RESET_ON_KILL = "dash_reset",
  THORNS = "thorns",
  SOLAR_INTENSITY = "solar_intensity",
  DOUBLE_VIRTUE = "double_virtue",
  MAGNETIC_RANGE = "magnetic_range",
  CHAIN_LIGHTNING = "chain_lightning",
  ORBITAL_BLADES = "orbital_blades",
}

export interface PerkDef {
  id: PerkId;
  name: string;
  desc: string;
  color: number;
}

export interface PerkChoice {
  options: PerkDef[];
}

export enum Difficulty {
  EASY = "easy",
  NORMAL = "normal",
  HARD = "hard",
}

export enum WaveModifier {
  NONE = "none",
  SWIFT = "swift",         // enemies 40% faster
  ARMORED = "armored",     // enemies +50% HP
  VAMPIRIC = "vampiric",   // enemies heal on hit
  SWARM = "swarm",         // +50% more enemies, smaller
  VOLATILE = "volatile",   // enemies explode on death
  SHIELDED = "shielded",   // enemies take 50% less damage for first 2s
  MOONLIT = "moonlit",     // forces nighttime for this wave
  CURSED = "cursed",       // enemies deal 2x damage, player earns 2x score
}

export interface ArenaHazard {
  angle: number; // center angle of the hazard zone
  arcWidth: number; // radians wide
  innerRadius: number; // distance from center
  outerRadius: number;
  rotSpeed: number; // radians/sec
  dmg: number; // damage/sec
  color: number;
}

export interface VirtuePickup {
  x: number; y: number;
  virtue: Virtue;
  life: number;
}

export interface FloatingText {
  x: number; y: number;
  text: string;
  life: number;
  color: number;
  scale: number;
}

export interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  color: number;
  size: number;
}

export interface Shockwave {
  x: number; y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: number;
  dmg: number;
  fromPlayer: boolean;
  hit: Set<number>;
}

export interface IgwaineState {
  phase: IgwainePhase;
  difficulty: Difficulty;
  screenW: number;
  screenH: number;

  // Player
  px: number; py: number;
  pvx: number; pvy: number;
  hp: number; maxHp: number;
  energy: number; maxEnergy: number;
  shielding: boolean;
  attackCd: number;
  dashCd: number;
  dashTimer: number;
  invulnTimer: number;
  aimDirX: number; aimDirY: number;
  stunTimer: number; // player stun from Dark Knight bash

  // Charged attack
  chargeTime: number; // how long arrow has been held (0 if not charging)
  chargeAimX: number; chargeAimY: number;

  // Solar Flare ultimate
  solarFlareReady: boolean;
  solarFlareCd: number;

  // Solar cycle
  sunPhase: number;
  sunSpeed: number;

  // Combat
  score: number;
  kills: number;
  wave: number;
  enemiesRemaining: number;
  enemies: Enemy[];
  projectiles: Projectile[];
  shockwaves: Shockwave[];
  virtuePickups: VirtuePickup[];
  floatingTexts: FloatingText[];
  particles: Particle[];

  // Combo system
  combo: number;
  comboTimer: number;
  bestCombo: number;

  // Level-up / perks
  killsToLevel: number; // kills remaining until next level
  level: number;
  perks: PerkId[];
  perkChoice: PerkChoice | null; // non-null = perk selection screen active
  perkCounts: Record<PerkId, number>; // how many times each perk has been taken

  // HP orbs
  hpOrbs: HpOrb[];

  // Pentangle Synergy
  pentangleSynergyReady: boolean; // true when all 5 virtues >= 1
  pentangleSynergyCd: number;
  pentangleBurstTimer: number; // visual timer

  // Kill streaks
  streakTimer: number; // rapid kill window
  streakCount: number; // kills within window
  streakText: string;
  streakTextTimer: number;

  // Slow-motion
  slowMoTimer: number;
  slowMoFactor: number; // <1 means slow

  // Screen flash
  screenFlashTimer: number;
  screenFlashColor: number;

  // Arena hazards
  hazards: ArenaHazard[];

  // Eclipse event
  eclipseTimer: number;
  eclipseNext: number;
  preEclipseSunPhase: number; // sun position before eclipse started

  // Virtues collected
  virtues: Record<Virtue, number>;

  // Timing
  waveDelay: number;
  waveAnnounceTimer: number;
  waveClearBonusTimer: number;
  waveModifier: WaveModifier;
  waveModifierText: string;
  screenShake: number;
  gameTime: number;
  bestWave: number;
  bestScore: number;
  deathTimer: number;

  // Golden Hour (dawn/dusk power spike)
  goldenHourTimer: number; // >0 means golden hour is active
  goldenHourTriggered: boolean; // prevents re-triggering same transition

  // Banshee fear debuff
  fearTimer: number; // >0 means player is slowed by banshee scream
  fearSlowFactor: number; // movement speed multiplier during fear

  // Riposte (perfect shield timing)
  riposteWindow: number; // >0 means shield was JUST activated, eligible for riposte
  riposteFlashTimer: number; // visual feedback

  // Orbital Blades perk
  orbitalAngle: number; // current rotation angle for orbital blades

  // Perk synergy bonuses
  activeSynergies: string[]; // names of active perk synergies

  // Combo milestone tracking
  lastComboReward: number; // highest combo milestone already rewarded

  // Meta-progression (persistent across runs)
  shardsEarned: number; // shards earned THIS run (shown on death)
}

// ---------------------------------------------------------------------------
// Meta-progression — persistent upgrades
// ---------------------------------------------------------------------------

export enum MetaUpgradeId {
  STARTING_HP = "meta_hp",
  STARTING_ENERGY = "meta_energy",
  BASE_DAMAGE = "meta_dmg",
  MOVE_SPEED = "meta_speed",
  VIRTUE_LUCK = "meta_virtue",
  STARTING_PERK = "meta_perk",
}

export interface MetaUpgrade {
  id: MetaUpgradeId;
  name: string;
  desc: string;
  maxLevel: number;
  costPerLevel: number;
}

export interface MetaSave {
  shards: number;
  upgrades: Record<MetaUpgradeId, number>;
  totalRuns: number;
  bestWave: number;
  bestScore: number;
}
