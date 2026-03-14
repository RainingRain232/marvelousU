// ---------------------------------------------------------------------------
// Panzer Dragoon mode — game state
// ---------------------------------------------------------------------------

import type { Vec2 } from "@/types";

// ---------------------------------------------------------------------------
// Class & Subclass definitions
// ---------------------------------------------------------------------------

export enum DragoonClassId {
  ARCANE_MAGE = "arcane_mage",
  STORM_RANGER = "storm_ranger",
  BLOOD_KNIGHT = "blood_knight",
  SHADOW_ASSASSIN = "shadow_assassin",
}

export enum DragoonSubclassId {
  // Arcane Mage subclasses
  CHRONOMANCER = "chronomancer",
  VOID_WEAVER = "void_weaver",
  // Storm Ranger subclasses
  TEMPEST_LORD = "tempest_lord",
  BEASTMASTER = "beastmaster",
  // Blood Knight subclasses
  DEATH_KNIGHT = "death_knight",
  PALADIN = "paladin",
  // Shadow Assassin subclasses
  NINJA = "ninja",
  PHANTOM = "phantom",
}

// ---------------------------------------------------------------------------
// Skill definitions
// ---------------------------------------------------------------------------

export enum DragoonSkillId {
  // Arcane Mage
  ARCANE_BOLT = "arcane_bolt",
  STARFALL = "starfall",
  THUNDERSTORM = "thunderstorm",
  FROST_NOVA = "frost_nova",
  METEOR_SHOWER = "meteor_shower",
  DIVINE_SHIELD = "divine_shield",
  // Chronomancer
  TIME_WARP = "time_warp",
  TEMPORAL_LOOP = "temporal_loop",
  // Void Weaver
  SINGULARITY = "singularity",
  MIRROR_IMAGE = "mirror_image",

  // Storm Ranger
  WIND_ARROW = "wind_arrow",
  CHAIN_LIGHTNING = "chain_lightning",
  GALE_FORCE = "gale_force",
  HAWK_COMPANION = "hawk_companion",
  TORNADO = "tornado",
  WIND_WALK = "wind_walk",
  // Tempest Lord
  HURRICANE = "hurricane",
  THUNDER_ARMOR = "thunder_armor",
  // Beastmaster
  WOLF_PACK = "wolf_pack",
  EAGLE_FURY = "eagle_fury",

  // Blood Knight
  BLOOD_LANCE = "blood_lance",
  CRIMSON_SLASH = "crimson_slash",
  BLOOD_SHIELD = "blood_shield",
  HEMORRHAGE = "hemorrhage",
  EXECUTION = "execution",
  WAR_CRY = "war_cry",
  // Death Knight
  RAISE_DEAD = "raise_dead",
  SOUL_HARVEST = "soul_harvest",
  // Paladin
  HOLY_NOVA = "holy_nova",
  CONSECRATION = "consecration",

  // Shadow Assassin
  SHURIKEN = "shuriken",
  FAN_OF_KNIVES = "fan_of_knives",
  POISON_CLOUD = "poison_cloud",
  SHADOW_STEP = "shadow_step",
  MARK_FOR_DEATH = "mark_for_death",
  SMOKE_BOMB = "smoke_bomb",
  // Ninja
  SHADOW_CLONE_ARMY = "shadow_clone_army",
  BLADE_STORM = "blade_storm",
  // Phantom
  SOUL_SIPHON = "soul_siphon",
  PHASE_SHIFT = "phase_shift",
}

export interface DragoonSkillState {
  id: DragoonSkillId;
  cooldown: number;      // current cooldown remaining (seconds)
  maxCooldown: number;   // total cooldown (seconds)
  active: boolean;       // is the skill currently firing
  activeTimer: number;   // remaining active duration
}

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

export interface DragoonPlayer {
  position: Vec2;        // world position
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  manaRegen: number;     // per second
  invincTimer: number;   // invincibility frames timer
  comboCount: number;
  comboTimer: number;
  score: number;
  shieldActive: boolean;
  shieldTimer: number;
  scoreMultiplier: number;
  scoreMultTimer: number;

  // Leveling
  level: number;
  xp: number;
  xpToNext: number;

  // Class buffs (generic timers for active effects)
  speedMultiplier: number;
  speedMultTimer: number;
  damageMultiplier: number;
  damageMultTimer: number;
  bloodShieldCharges: number;
  soulHarvestTimer: number;
  thunderArmorTimer: number;
  consecrateTimer: number;
  phaseShiftTimer: number;
  bladeStormTimer: number;
}

export interface DragoonCompanion {
  id: number;
  position: Vec2;
  velocity: Vec2;
  lifetime: number;
  attackTimer: number;
  type: "hawk" | "wolf" | "clone";
  damage: number;
}

export interface DragoonEnemy {
  id: number;
  type: DragoonEnemyType;
  position: Vec2;
  velocity: Vec2;
  hp: number;
  maxHp: number;
  alive: boolean;
  isBoss: boolean;
  bossPhase: number;
  attackTimer: number;   // cooldown until next attack
  hitTimer: number;      // flash timer
  deathTimer: number;    // death animation
  slowFactor: number;
  slowTimer: number;
  size: number;          // radius multiplier
  scoreValue: number;
  // Movement pattern
  pattern: EnemyPattern;
  patternTimer: number;
  patternParam: number;
  // Firing
  fireRate: number;
  // Display
  color: number;
  glowColor: number;
  // DoT / debuffs
  dotDamage: number;
  dotTimer: number;
  damageAmp: number;     // incoming damage multiplier (Mark for Death)
  damageAmpTimer: number;
  // For raised dead
  isAllied: boolean;
  alliedTimer: number;
}

export enum DragoonEnemyType {
  // Sky enemies
  DARK_CROW = "dark_crow",
  WYVERN = "wyvern",
  SHADOW_BAT = "shadow_bat",
  FIRE_SPRITE = "fire_sprite",
  STORM_HAWK = "storm_hawk",
  FLOATING_EYE = "floating_eye",
  DARK_ANGEL = "dark_angel",
  SHADOW_WRAITH = "shadow_wraith",
  SKY_VIPER = "sky_viper",
  DARK_FALCON_SQUAD = "dark_falcon_squad",
  // Ground enemies
  GROUND_CATAPULT = "ground_catapult",
  GROUND_MAGE_TOWER = "ground_mage_tower",
  GROUND_BALLISTA = "ground_ballista",
  // Bosses
  BOSS_DRAKE = "boss_drake",
  BOSS_CHIMERA = "boss_chimera",
  BOSS_LICH_KING = "boss_lich_king",
  BOSS_STORM_TITAN = "boss_storm_titan",
  BOSS_VOID_SERPENT = "boss_void_serpent",
}

export enum EnemyPattern {
  STRAIGHT = "straight",       // fly in a straight line
  SINE_WAVE = "sine_wave",     // sinusoidal path
  CIRCLE = "circle",           // orbit a point
  DIVE = "dive",               // dive toward player
  HOVER = "hover",             // hover and shoot
  GROUND = "ground",           // scroll along bottom
  BOSS_PATTERN = "boss",       // boss-specific AI
  ZIGZAG = "zigzag",           // zigzag left with alternating Y
  V_FORMATION = "v_formation", // V-shape formation flight
  TELEPORT = "teleport",       // slow drift, teleport periodically
}

// ---------------------------------------------------------------------------
// Pickups
// ---------------------------------------------------------------------------

export enum DragoonPickupType {
  HEALTH_ORB = "health_orb",
  MANA_ORB = "mana_orb",
  SCORE_MULTIPLIER = "score_multiplier",
}

export interface DragoonPickup {
  id: number;
  position: Vec2;
  velocity: Vec2;
  type: DragoonPickupType;
  lifetime: number;
  bobTimer: number;
  collected: boolean;
}

export interface DragoonProjectile {
  id: number;
  position: Vec2;
  velocity: Vec2;
  damage: number;
  radius: number;         // hit radius
  lifetime: number;
  isPlayerOwned: boolean;
  skillId: DragoonSkillId | null;
  color: number;
  trailColor: number;
  pierce: number;         // remaining pierce
  hitEnemies: Set<number>;
  homing: boolean;
  homingTarget: number | null;
  // Visual
  size: number;
  glowIntensity: number;
}

export interface DragoonExplosion {
  id: number;
  position: Vec2;
  radius: number;
  maxRadius: number;
  timer: number;
  maxTimer: number;
  color: number;
  damage: number;
  hitEnemies: Set<number>;
}

export interface DragoonParticle {
  position: Vec2;
  velocity: Vec2;
  life: number;
  maxLife: number;
  color: number;
  size: number;
  type: "spark" | "cloud" | "star" | "feather" | "ember";
}

// ---------------------------------------------------------------------------
// Poison cloud (lingering AoE)
// ---------------------------------------------------------------------------

export interface DragoonPoisonCloud {
  id: number;
  position: Vec2;
  radius: number;
  timer: number;
  maxTimer: number;
  damagePerTick: number;
  tickAccumulator: number;
  color: number;
}

// ---------------------------------------------------------------------------
// Scrolling layers (parallax sky background)
// ---------------------------------------------------------------------------

export interface SkyLayer {
  speed: number;     // pixels per second
  offset: number;    // current scroll offset
}

// ---------------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------------

export interface DragoonState {
  gameTime: number;
  paused: boolean;
  gameOver: boolean;
  victory: boolean;

  // Class system
  classId: DragoonClassId;
  subclassId: DragoonSubclassId | null;
  classSelectActive: boolean;
  subclassChoiceActive: boolean;
  subclassOptions: [DragoonSubclassId, DragoonSubclassId] | null;
  subclassUnlocked: boolean; // prevent re-triggering

  player: DragoonPlayer;
  enemies: DragoonEnemy[];
  projectiles: DragoonProjectile[];
  explosions: DragoonExplosion[];
  particles: DragoonParticle[];
  pickups: DragoonPickup[];
  companions: DragoonCompanion[];
  poisonClouds: DragoonPoisonCloud[];

  skills: DragoonSkillState[];

  // Wave system
  wave: number;
  waveTimer: number;        // time in current wave
  waveDuration: number;     // seconds per wave
  waveEnemiesSpawned: number;
  waveEnemiesTotal: number;
  betweenWaves: boolean;
  betweenWaveTimer: number;
  bossActive: boolean;
  bossWaveInterval: number; // boss every N waves
  totalWaves: number;
  bossEntranceTimer: number;
  bossEntranceName: string;

  // Scrolling
  scrollSpeed: number;
  groundOffset: number;
  skyLayers: SkyLayer[];

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
    mouseX: number;
    mouseY: number;
  };

  // ID counter
  nextId: number;

  // Screen dims (cached)
  screenW: number;
  screenH: number;

  // World extents (wider than screen)
  worldWidth: number;
  cameraX: number;

  // Dead enemies for Raise Dead
  recentDeadEnemies: { type: DragoonEnemyType; position: Vec2; size: number; color: number; glowColor: number }[];
}

// ---------------------------------------------------------------------------
// XP helpers
// ---------------------------------------------------------------------------

export function xpForLevel(level: number): number {
  return level * 150;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createDragoonState(screenW: number, screenH: number): DragoonState {
  return {
    gameTime: 0,
    paused: false,
    gameOver: false,
    victory: false,

    classId: DragoonClassId.ARCANE_MAGE,
    subclassId: null,
    classSelectActive: true,
    subclassChoiceActive: false,
    subclassOptions: null,
    subclassUnlocked: false,

    player: {
      position: { x: screenW * 3 * 0.5, y: screenH * 0.5 },
      hp: 100,
      maxHp: 100,
      mana: 100,
      maxMana: 100,
      manaRegen: 8,
      invincTimer: 0,
      comboCount: 0,
      comboTimer: 0,
      score: 0,
      shieldActive: false,
      shieldTimer: 0,
      scoreMultiplier: 1,
      scoreMultTimer: 0,
      level: 1,
      xp: 0,
      xpToNext: xpForLevel(2),
      speedMultiplier: 1,
      speedMultTimer: 0,
      damageMultiplier: 1,
      damageMultTimer: 0,
      bloodShieldCharges: 0,
      soulHarvestTimer: 0,
      thunderArmorTimer: 0,
      consecrateTimer: 0,
      phaseShiftTimer: 0,
      bladeStormTimer: 0,
    },

    enemies: [],
    projectiles: [],
    explosions: [],
    particles: [],
    pickups: [],
    companions: [],
    poisonClouds: [],

    skills: [
      { id: DragoonSkillId.ARCANE_BOLT, cooldown: 0, maxCooldown: 0.12, active: false, activeTimer: 0 },
      { id: DragoonSkillId.STARFALL, cooldown: 0, maxCooldown: 4, active: false, activeTimer: 0 },
      { id: DragoonSkillId.THUNDERSTORM, cooldown: 0, maxCooldown: 6, active: false, activeTimer: 0 },
      { id: DragoonSkillId.FROST_NOVA, cooldown: 0, maxCooldown: 8, active: false, activeTimer: 0 },
      { id: DragoonSkillId.METEOR_SHOWER, cooldown: 0, maxCooldown: 14, active: false, activeTimer: 0 },
      { id: DragoonSkillId.DIVINE_SHIELD, cooldown: 0, maxCooldown: 18, active: false, activeTimer: 0 },
    ],

    wave: 0,
    waveTimer: 0,
    waveDuration: 20,
    waveEnemiesSpawned: 0,
    waveEnemiesTotal: 0,
    betweenWaves: true,
    betweenWaveTimer: 3,
    bossActive: false,
    bossWaveInterval: 4,
    totalWaves: 20,
    bossEntranceTimer: 0,
    bossEntranceName: "",

    scrollSpeed: 60,
    groundOffset: 0,
    skyLayers: [
      { speed: 5, offset: 0 },   // distant clouds
      { speed: 15, offset: 0 },  // mid clouds
      { speed: 30, offset: 0 },  // near clouds
    ],

    input: {
      left: false, right: false, up: false, down: false,
      fire: false,
      skill1: false, skill2: false, skill3: false, skill4: false, skill5: false,
      mouseX: screenW * 0.5, mouseY: screenH * 0.5,
    },

    nextId: 1,
    screenW,
    screenH,

    worldWidth: screenW * 3,
    cameraX: 0,

    recentDeadEnemies: [],
  };
}
