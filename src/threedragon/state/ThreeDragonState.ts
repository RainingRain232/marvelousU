// ---------------------------------------------------------------------------
// 3Dragon mode — game state
// Arthur rides a great white eagle through stunning 3D skies
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Skill definitions
// ---------------------------------------------------------------------------

export enum TDSkillId {
  ARCANE_BOLT = "td_arcane_bolt",
  CELESTIAL_LANCE = "td_celestial_lance",
  THUNDERSTORM = "td_thunderstorm",
  FROST_NOVA = "td_frost_nova",
  METEOR_SHOWER = "td_meteor_shower",
  DIVINE_SHIELD = "td_divine_shield",
  BOOST = "td_boost",
  // Unlockable skills
  FIRE_BREATH = "td_fire_breath",
  ICE_STORM = "td_ice_storm",
  LIGHTNING_BOLT = "td_lightning_bolt",
  DRAGON_ROAR = "td_dragon_roar",
  WING_GUST = "td_wing_gust",
  HEALING_FLAME = "td_healing_flame",
  SHADOW_DIVE = "td_shadow_dive",
  CHAIN_LIGHTNING = "td_chain_lightning",
}

export interface TDSkillState {
  id: TDSkillId;
  cooldown: number;
  maxCooldown: number;
  active: boolean;
  activeTimer: number;
}

// ---------------------------------------------------------------------------
// 3D position
// ---------------------------------------------------------------------------

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

// ---------------------------------------------------------------------------
// Status effects on enemies
// ---------------------------------------------------------------------------

export interface TDStatusEffects {
  frozen: number;       // remaining duration
  burning: number;
  wet: number;
  stunned: number;
}

// ---------------------------------------------------------------------------
// Environmental hazards
// ---------------------------------------------------------------------------

export type TDHazardType = "lava_geyser" | "blizzard_wind" | "crystal_shard" | "lightning_strike" | "water_spout" | "leaf_tornado" | "pressure_wave" | "petal_storm";

export interface TDHazard {
  id: number;
  type: TDHazardType;
  position: Vec3;
  velocity: Vec3;
  timer: number;        // time until activation / current lifetime
  phase: "warning" | "active" | "fading";
  radius: number;
  damage: number;
  duration: number;     // total active phase duration
  warningDuration: number;
  hitEntities: Set<number>; // avoid multi-hit per hazard pulse
}

// ---------------------------------------------------------------------------
// Wave modifiers
// ---------------------------------------------------------------------------

export type TDWaveModifierId = "armored" | "haste" | "multiplied" | "aerial" | "vampiric" | "explosive";

export interface TDWaveModifier {
  id: TDWaveModifierId;
  name: string;
  description: string;
  icon: string;
  color: string;
}

// ---------------------------------------------------------------------------
// Between-wave upgrades
// ---------------------------------------------------------------------------

export type TDUpgradeId = "max_hp" | "max_mana" | "damage" | "mana_regen" | "crit_chance" | "move_speed" | "cooldown_reduction";

export interface TDUpgradeChoice {
  id: TDUpgradeId;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export interface TDUpgradeState {
  damageMult: number;
  critChanceBonus: number;
  moveSpeedMult: number;
  cooldownReduction: number;
  upgrades: TDUpgradeId[];     // history of picked upgrades
}

// ---------------------------------------------------------------------------
// Boss mechanic state
// ---------------------------------------------------------------------------

export interface TDBossMechanicState {
  // Ancient Dragon fire breath
  fireBreathActive: boolean;
  fireBreathTimer: number;
  fireBreathAngle: number;    // direction of cone
  fireBreathCooldown: number;

  // Storm Colossus lightning zones
  lightningZones: { position: Vec3; timer: number; radius: number }[];
  lightningZoneCooldown: number;

  // Death Knight shadow clones
  shadowCloneIds: number[];
  shadowCloneCooldown: number;

  // Celestial Hydra heads
  hydraHeads: { alive: boolean; hp: number; maxHp: number; attackTimer: number; pattern: number }[];
  hydraInitialized: boolean;

  // Void Emperor teleport
  voidTeleportTimer: number;
  voidTeleportCooldown: number;
  voidInvincible: boolean;
  voidInvincibleTimer: number;
  voidZones: { position: Vec3; timer: number; radius: number }[];
}

// ---------------------------------------------------------------------------
// Synergy popup
// ---------------------------------------------------------------------------

export interface TDSynergyPopup {
  text: string;
  color: string;
  position: Vec3;
  timer: number;
}

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

export interface TDPlayer {
  position: Vec3;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  manaRegen: number;
  invincTimer: number;
  comboCount: number;
  comboTimer: number;
  score: number;
  shieldActive: boolean;
  shieldTimer: number;
  // Boost
  boostTimer: number;
  boostCooldown: number;
  boostMaxCooldown: number;
  boostActive: boolean;
  // Visual
  eagleBankAngle: number;
  eagleFlapPhase: number;
  // XP / Level system for unlockable skills
  xp: number;
  level: number;
  xpToNextLevel: number;
  // Shadow Dive state
  shadowDiveActive: boolean;
  shadowDiveTimer: number;
}

export interface TDEnemy {
  id: number;
  type: TDEnemyType;
  position: Vec3;
  velocity: Vec3;
  hp: number;
  maxHp: number;
  alive: boolean;
  isBoss: boolean;
  isElite: boolean;
  bossPhase: number;
  attackTimer: number;
  hitTimer: number;
  deathTimer: number;
  slowFactor: number;
  slowTimer: number;
  size: number;
  scoreValue: number;
  pattern: TDEnemyPattern;
  patternTimer: number;
  patternParam: number;
  fireRate: number;
  color: number;
  glowColor: number;
  // 3D specific
  rotationY: number;
  rotationSpeed: number;
  // Status effects
  statusEffects: TDStatusEffects;
  // Boss-specific mechanic state (only for bosses)
  bossMechanics?: TDBossMechanicState;
  // Shadow clone flag for Death Knight clones
  isShadowClone?: boolean;
  parentBossId?: number;
}

export enum TDEnemyType {
  // Sky enemies
  SHADOW_RAVEN = "shadow_raven",
  CRYSTAL_WYVERN = "crystal_wyvern",
  EMBER_PHOENIX = "ember_phoenix",
  STORM_HARPY = "storm_harpy",
  VOID_WRAITH = "void_wraith",
  SPECTRAL_KNIGHT = "spectral_knight",
  ARCANE_ORB = "arcane_orb",
  // Ground enemies
  DARK_TOWER = "dark_tower",
  SIEGE_GOLEM = "siege_golem",
  CANNON_FORT = "cannon_fort",
  // Bosses
  BOSS_ANCIENT_DRAGON = "boss_ancient_dragon",
  BOSS_STORM_COLOSSUS = "boss_storm_colossus",
  BOSS_DEATH_KNIGHT = "boss_death_knight",
  BOSS_CELESTIAL_HYDRA = "boss_celestial_hydra",
  BOSS_VOID_EMPEROR = "boss_void_emperor",
}

export enum TDEnemyPattern {
  STRAIGHT = "straight",
  SINE_WAVE = "sine_wave",
  SPIRAL = "spiral",
  DIVE = "dive",
  HOVER = "hover",
  GROUND = "ground",
  BOSS_PATTERN = "boss",
  SWARM = "swarm",
}

export interface TDProjectile {
  id: number;
  position: Vec3;
  velocity: Vec3;
  damage: number;
  radius: number;
  lifetime: number;
  isPlayerOwned: boolean;
  skillId: TDSkillId | null;
  color: number;
  trailColor: number;
  pierce: number;
  hitEnemies: Set<number>;
  homing: boolean;
  homingTarget: number | null;
  size: number;
  glowIntensity: number;
}

export interface TDExplosion {
  id: number;
  position: Vec3;
  radius: number;
  maxRadius: number;
  timer: number;
  maxTimer: number;
  color: number;
  damage: number;
  hitEnemies: Set<number>;
}

export interface TDParticle {
  position: Vec3;
  velocity: Vec3;
  life: number;
  maxLife: number;
  color: number;
  size: number;
  type: "spark" | "cloud" | "star" | "feather" | "ember" | "holy" | "ice";
}

export interface TDPowerUp {
  id: number;
  position: Vec3;
  velocity: Vec3;
  type: "health" | "mana";
  value: number;
  lifetime: number;
  collected: boolean;
  magnetTimer: number;
}

// ---------------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------------

export interface ThreeDragonState {
  gameTime: number;
  paused: boolean;
  gameOver: boolean;
  victory: boolean;

  player: TDPlayer;
  enemies: TDEnemy[];
  projectiles: TDProjectile[];
  explosions: TDExplosion[];
  particles: TDParticle[];
  powerUps: TDPowerUp[];

  skills: TDSkillState[];

  // Wave system
  wave: number;
  waveTimer: number;
  waveDuration: number;
  waveEnemiesSpawned: number;
  waveEnemiesTotal: number;
  betweenWaves: boolean;
  betweenWaveTimer: number;
  bossActive: boolean;
  swarmWave: boolean;
  bossWaveInterval: number;
  totalWaves: number;

  // Slow-motion effect
  slowMoTimer: number;
  slowMoFactor: number;

  // World scrolling
  scrollSpeed: number;
  worldZ: number;

  // Map
  mapId: string;

  // Unlockable skills
  unlockedSkills: TDSkillId[];
  equippedSkills: TDSkillId[];  // 5 active skill slots (keys 1-5)
  pendingUnlocks: TDSkillId[];  // queue of skills to show unlock notification for

  // Day/night cycle
  dayPhase: number;

  // Input
  input: {
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;
    fire: boolean;
    skill1: boolean;
    skill2: boolean;
    skill3: boolean;
    skill4: boolean;
    skill5: boolean;
    boost: boolean;
    mouseX: number;
    mouseY: number;
  };

  nextId: number;
  screenW: number;
  screenH: number;

  // --- New systems ---

  // Environmental hazards
  hazards: TDHazard[];
  hazardSpawnTimers: Record<string, number>;

  // Wave modifiers
  activeModifiers: TDWaveModifierId[];
  modifierAnnounceTimer: number;

  // Between-wave upgrade system
  upgradeState: TDUpgradeState;
  upgradeChoicesActive: boolean;
  upgradeChoices: TDUpgradeChoice[];

  // Synergy popups
  synergyPopups: TDSynergyPopup[];

  // Wing Gust timestamp for Resonance synergy
  lastWingGustTime: number;
  // Shadow Dive attack flag for Shadow Strike synergy
  shadowDiveAttackedDuringInvuln: boolean;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createThreeDragonState(screenW: number, screenH: number, mapId = "enchanted_valley"): ThreeDragonState {
  return {
    gameTime: 0,
    paused: false,
    gameOver: false,
    victory: false,

    player: {
      position: { x: 0, y: 8, z: 0 },
      hp: 120,
      maxHp: 120,
      mana: 100,
      maxMana: 100,
      manaRegen: 7,
      invincTimer: 0,
      comboCount: 0,
      comboTimer: 0,
      score: 0,
      shieldActive: false,
      shieldTimer: 0,
      boostTimer: 0,
      boostCooldown: 0,
      boostMaxCooldown: 5,
      boostActive: false,
      eagleBankAngle: 0,
      eagleFlapPhase: 0,
      xp: 0,
      level: 1,
      xpToNextLevel: 100,
      shadowDiveActive: false,
      shadowDiveTimer: 0,
    },

    enemies: [],
    projectiles: [],
    explosions: [],
    particles: [],
    powerUps: [],

    skills: [
      { id: TDSkillId.ARCANE_BOLT, cooldown: 0, maxCooldown: 0.12, active: false, activeTimer: 0 },
      { id: TDSkillId.CELESTIAL_LANCE, cooldown: 0, maxCooldown: 3.5, active: false, activeTimer: 0 },
      { id: TDSkillId.THUNDERSTORM, cooldown: 0, maxCooldown: 6, active: false, activeTimer: 0 },
      { id: TDSkillId.FROST_NOVA, cooldown: 0, maxCooldown: 8, active: false, activeTimer: 0 },
      { id: TDSkillId.METEOR_SHOWER, cooldown: 0, maxCooldown: 14, active: false, activeTimer: 0 },
      { id: TDSkillId.DIVINE_SHIELD, cooldown: 0, maxCooldown: 20, active: false, activeTimer: 0 },
    ],

    wave: 0,
    waveTimer: 0,
    waveDuration: 22,
    waveEnemiesSpawned: 0,
    waveEnemiesTotal: 0,
    betweenWaves: true,
    betweenWaveTimer: 4,
    bossActive: false,
    swarmWave: false,
    bossWaveInterval: 4,
    totalWaves: 20,

    slowMoTimer: 0,
    slowMoFactor: 1,

    mapId,

    // Start with base 5 skills unlocked; new ones unlock via leveling
    unlockedSkills: [
      TDSkillId.CELESTIAL_LANCE,
      TDSkillId.THUNDERSTORM,
      TDSkillId.FROST_NOVA,
      TDSkillId.METEOR_SHOWER,
      TDSkillId.DIVINE_SHIELD,
    ],
    equippedSkills: [
      TDSkillId.CELESTIAL_LANCE,
      TDSkillId.THUNDERSTORM,
      TDSkillId.FROST_NOVA,
      TDSkillId.METEOR_SHOWER,
      TDSkillId.DIVINE_SHIELD,
    ],
    pendingUnlocks: [],

    scrollSpeed: 20,
    worldZ: 0,
    dayPhase: 0,

    input: {
      left: false, right: false, up: false, down: false,
      fire: false,
      skill1: false, skill2: false, skill3: false, skill4: false, skill5: false,
      boost: false,
      mouseX: screenW * 0.5, mouseY: screenH * 0.5,
    },

    nextId: 1,
    screenW,
    screenH,

    // --- New systems ---
    hazards: [],
    hazardSpawnTimers: {},

    activeModifiers: [],
    modifierAnnounceTimer: 0,

    upgradeState: {
      damageMult: 1,
      critChanceBonus: 0,
      moveSpeedMult: 1,
      cooldownReduction: 0,
      upgrades: [],
    },
    upgradeChoicesActive: false,
    upgradeChoices: [],

    synergyPopups: [],

    lastWingGustTime: -10,
    shadowDiveAttackedDuringInvuln: false,
  };
}
