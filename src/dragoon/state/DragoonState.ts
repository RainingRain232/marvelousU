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

  // Unlockable universal skills (earned through leveling)
  FIREBALL_BARRAGE = "fireball_barrage",
  ARCANE_SHIELD = "arcane_shield",
  SPEED_SURGE = "speed_surge",
  CHAIN_NOVA = "chain_nova",
  HEALING_LIGHT = "healing_light",
  AOE_BOMB = "aoe_bomb",
  HOMING_MISSILES = "homing_missiles",
  TIME_SLOW = "time_slow",
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
  GROUND_SIEGE_ENGINE = "ground_siege_engine",
  GROUND_CAVALRY = "ground_cavalry",
  GROUND_SHIELD_WALL = "ground_shield_wall",
  GROUND_WAR_CATAPULT = "ground_war_catapult",
  GROUND_DARK_MAGE_CIRCLE = "ground_dark_mage_circle",
  // Bosses
  BOSS_DRAKE = "boss_drake",
  BOSS_CHIMERA = "boss_chimera",
  BOSS_LICH_KING = "boss_lich_king",
  BOSS_STORM_TITAN = "boss_storm_titan",
  BOSS_VOID_SERPENT = "boss_void_serpent",
  BOSS_DRAGON_PENDRAGON = "boss_dragon_pendragon",
  BOSS_QUESTING_BEAST = "boss_questing_beast",
  BOSS_BLACK_KNIGHT = "boss_black_knight",
  BOSS_MORGANA_WYRM = "boss_morgana_wyrm",
  BOSS_GRAIL_GUARDIAN = "boss_grail_guardian",
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
  GROUND_CHARGE = "ground_charge",   // fast ground charge toward player X
  GROUND_SLOW = "ground_slow",       // slow ground movement, heavy attacks
  GROUND_STATIONARY = "ground_stationary", // stationary, fires projectiles
}

// ---------------------------------------------------------------------------
// Difficulty
// ---------------------------------------------------------------------------

export enum DragoonDifficulty {
  EASY = "easy",
  NORMAL = "normal",
  HARD = "hard",
  NIGHTMARE = "nightmare",
}

export interface DifficultyModifiers {
  enemyHpMult: number;
  enemyDamageMult: number;
  bulletSpeedMult: number;
  spawnRateMult: number;    // lower = faster spawns
  scoreMultiplier: number;
  label: string;
  color: number;
}

// ---------------------------------------------------------------------------
// Leaderboard
// ---------------------------------------------------------------------------

export interface LeaderboardEntry {
  playerName: string;
  score: number;
  difficulty: DragoonDifficulty;
  classId: DragoonClassId;
  date: string;               // ISO date string
  wave: number;
}

// ---------------------------------------------------------------------------
// Run Statistics
// ---------------------------------------------------------------------------

export interface RunStatistics {
  enemiesKilled: number;
  bossesDefeated: number;
  damageDealt: number;
  damageTaken: number;
  itemsCollected: number;
  timeSurvived: number;       // seconds
  highestCombo: number;
  projectilesFired: number;
}

// ---------------------------------------------------------------------------
// Cosmetic Unlocks
// ---------------------------------------------------------------------------

export enum DragonSkinId {
  DEFAULT = "default",
  CRIMSON_FLAME = "crimson_flame",
  FROST_WING = "frost_wing",
  SHADOW_SCALE = "shadow_scale",
  GOLDEN_LIGHT = "golden_light",
  VOID_PURPLE = "void_purple",
  STORM_BLUE = "storm_blue",
  EMERALD_NATURE = "emerald_nature",
  BONE_WHITE = "bone_white",
  NIGHTMARE_BLACK = "nightmare_black",
}

export interface CosmeticUnlock {
  id: DragonSkinId;
  name: string;
  description: string;
  color: number;
  unlocked: boolean;
}

// ---------------------------------------------------------------------------
// Meta-Progression (persisted across runs)
// ---------------------------------------------------------------------------

export interface DragoonMetaProgression {
  highScores: Record<DragoonDifficulty, number>;
  totalRunsCompleted: number;
  bestStageReached: Record<DragoonDifficulty, number>;
  unlockedSkins: DragonSkinId[];
  leaderboard: LeaderboardEntry[];      // top 10
}

// ---------------------------------------------------------------------------
// Subclass Skill Tree
// ---------------------------------------------------------------------------

export interface SubclassSkillNode {
  level: number;             // level at which this point is earned (5, 10, 15, 20)
  name: string;
  description: string;
  unlocked: boolean;
  skillId: DragoonSkillId | null;       // skill granted, if any
  statBonus?: { hp?: number; mana?: number; damage?: number; speed?: number };
}

// ---------------------------------------------------------------------------
// Branching Paths
// ---------------------------------------------------------------------------

export enum DragoonPathId {
  MOUNTAIN_PASS = "mountain_pass",
  FOREST_CANYON = "forest_canyon",
  DARK_FORTRESS = "dark_fortress",
  COASTAL_CLIFFS = "coastal_cliffs",
  VOLCANIC_RIDGE = "volcanic_ridge",
  FROZEN_WASTES = "frozen_wastes",
  SHADOW_REALM = "shadow_realm",
  CELESTIAL_HEIGHTS = "celestial_heights",
}

export interface DragoonForkChoice {
  pathId: DragoonPathId;
  label: string;
  description: string;
  color: number;
  enemyPool: DragoonEnemyType[];
  bossType: DragoonEnemyType | null;
  difficultyMod: number;         // multiplier on enemy HP/damage for this path
  bonusScoreMult: number;        // extra score multiplier for harder path
}

export interface DragoonForkPoint {
  afterWave: number;             // fork appears after this wave completes
  choices: [DragoonForkChoice, DragoonForkChoice];
}

export interface DragoonBranchState {
  forkActive: boolean;           // is the player currently choosing a fork
  currentFork: DragoonForkPoint | null;
  chosenPath: DragoonPathId | null;
  pathHistory: DragoonPathId[];  // history of chosen paths this run
  pathDifficultyMod: number;     // current path's difficulty modifier
  pathScoreMult: number;         // current path's score bonus
  pathEnemyPool: DragoonEnemyType[] | null; // overrides wave enemy pool when set
  pathBoss: DragoonEnemyType | null;        // overrides boss for next boss wave
}

// ---------------------------------------------------------------------------
// Dragon Evolution
// ---------------------------------------------------------------------------

export enum DragonEvolutionStage {
  HATCHLING = "hatchling",
  FLEDGLING = "fledgling",
  DRAKE = "drake",
  WYRM = "wyrm",
  ELDER_DRAGON = "elder_dragon",
  ANCIENT_WYRM = "ancient_wyrm",
}

export interface DragonEvolutionDef {
  stage: DragonEvolutionStage;
  name: string;
  description: string;
  upgradeThreshold: number;       // total upgrade points (kills/score milestone) to reach this stage
  wingSpan: number;               // visual wing size multiplier
  bodyScale: number;              // body size multiplier
  armorPlates: number;            // number of armor plate segments to render
  color: number;                  // primary body color
  glowColor: number;              // aura glow color
  trailEffect: string;            // visual trail type
  statBonus: { hpMult: number; damageMult: number; speedMult: number };
}

export interface DragonEvolutionState {
  currentStage: DragonEvolutionStage;
  evolutionPoints: number;        // accumulated from kills and score milestones
  stageIndex: number;             // index into evolution stages array
  transitionTimer: number;        // visual transition animation timer (>0 = transitioning)
}

// ---------------------------------------------------------------------------
// Score Attack Mode
// ---------------------------------------------------------------------------

export interface ScoreAttackState {
  enabled: boolean;               // true when playing score attack mode
  chainMultiplier: number;        // current combo chain multiplier (1.0x base)
  chainDecayTimer: number;        // time remaining before multiplier decays
  chainDecayRate: number;         // how fast the multiplier decays per second
  maxChainMultiplier: number;     // highest multiplier reached this run
  consecutiveHits: number;        // hits without missing
  missTimer: number;              // grace period after last shot before "miss" registered
  highScores: number[];           // top 10 scores for score attack mode
  totalBonusScore: number;        // bonus score earned from multiplier chains
  perfectWaves: number;           // waves completed without taking damage
  currentWaveDamageTaken: boolean; // has the player taken damage this wave
}

// ---------------------------------------------------------------------------
// Environmental Destruction
// ---------------------------------------------------------------------------

export enum DestructibleType {
  BRIDGE = "bridge",
  TOWER = "tower",
  TREE = "tree",
  WALL = "wall",
  BOULDER = "boulder",
  WATCHTOWER = "watchtower",
}

export interface DragoonDestructible {
  id: number;
  type: DestructibleType;
  position: Vec2;
  hp: number;
  maxHp: number;
  width: number;                  // collision/visual width
  height: number;                 // collision/visual height
  color: number;
  destroyed: boolean;
  collapseTimer: number;          // >0 means collapsing animation active
  collapseDuration: number;       // total collapse animation duration
  areaDamage: number;             // damage dealt to enemies in collapse zone
  areaDamageRadius: number;       // radius of collapse damage
  hitTimer: number;               // flash timer when hit
  scoreValue: number;             // score granted on destruction
  debrisCount: number;            // number of debris particles on collapse
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

  // Difficulty
  difficulty: DragoonDifficulty;
  difficultyMods: DifficultyModifiers;

  // Class system
  classId: DragoonClassId;
  subclassId: DragoonSubclassId | null;
  classSelectActive: boolean;
  subclassChoiceActive: boolean;
  subclassOptions: [DragoonSubclassId, DragoonSubclassId] | null;
  subclassUnlocked: boolean; // prevent re-triggering

  // Subclass skill tree (gradual progression)
  subclassPoints: number;           // earned at levels 5, 10, 15, 20
  subclassSkillTree: SubclassSkillNode[];
  subclassSelected: boolean;        // has the player chosen a subclass path (at level 5)

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

  // Input (arrows = player movement, WASD = camera)
  input: {
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;
    camLeft: boolean;
    camRight: boolean;
    camUp: boolean;
    camDown: boolean;
    fire: boolean;
    skill1: boolean;
    skill2: boolean;
    skill3: boolean;
    skill4: boolean;
    skill5: boolean;
    skill6: boolean;
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

  // Unlockable skill system
  unlockedSkills: DragoonSkillId[];        // all unlocked universal skills
  equippedUnlockSkill: DragoonSkillId | null; // currently equipped unlockable skill (key 6)
  unlockSkillState: DragoonSkillState | null; // runtime state for equipped unlock skill

  // Escape menu
  escapeMenuOpen: boolean;

  // Run statistics (tracked per run)
  runStats: RunStatistics;

  // Meta-progression (persisted across runs)
  metaProgression: DragoonMetaProgression;

  // Cosmetics
  cosmeticUnlocks: CosmeticUnlock[];
  equippedSkin: DragonSkinId;

  // Leaderboard
  leaderboard: LeaderboardEntry[];

  // Branching paths
  branchState: DragoonBranchState;

  // Dragon evolution
  evolutionState: DragonEvolutionState;

  // Score attack mode
  scoreAttack: ScoreAttackState;

  // Environmental destruction
  destructibles: DragoonDestructible[];
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

// ---------------------------------------------------------------------------
// Difficulty definitions
// ---------------------------------------------------------------------------

export const DIFFICULTY_MODIFIERS: Record<DragoonDifficulty, DifficultyModifiers> = {
  [DragoonDifficulty.EASY]: {
    enemyHpMult: 0.7,
    enemyDamageMult: 0.6,
    bulletSpeedMult: 0.8,
    spawnRateMult: 1.3,       // slower spawns
    scoreMultiplier: 0.75,
    label: "Easy",
    color: 0x44cc44,
  },
  [DragoonDifficulty.NORMAL]: {
    enemyHpMult: 1.0,
    enemyDamageMult: 1.0,
    bulletSpeedMult: 1.0,
    spawnRateMult: 1.0,
    scoreMultiplier: 1.0,
    label: "Normal",
    color: 0x4488ff,
  },
  [DragoonDifficulty.HARD]: {
    enemyHpMult: 1.5,
    enemyDamageMult: 1.4,
    bulletSpeedMult: 1.25,
    spawnRateMult: 0.75,      // faster spawns
    scoreMultiplier: 1.5,
    label: "Hard",
    color: 0xff8800,
  },
  [DragoonDifficulty.NIGHTMARE]: {
    enemyHpMult: 2.2,
    enemyDamageMult: 2.0,
    bulletSpeedMult: 1.5,
    spawnRateMult: 0.55,      // much faster spawns
    scoreMultiplier: 2.5,
    label: "Nightmare",
    color: 0xff0044,
  },
};

// ---------------------------------------------------------------------------
// Cosmetic definitions
// ---------------------------------------------------------------------------

export function createDefaultCosmetics(): CosmeticUnlock[] {
  return [
    { id: DragonSkinId.DEFAULT, name: "Royal White", description: "The noble white eagle of Camelot", color: 0xffffff, unlocked: true },
    { id: DragonSkinId.CRIMSON_FLAME, name: "Crimson Flame", description: "Defeat the Fire Drake boss", color: 0xff2200, unlocked: false },
    { id: DragonSkinId.FROST_WING, name: "Frost Wing", description: "Reach a combo of 50", color: 0x88eeff, unlocked: false },
    { id: DragonSkinId.SHADOW_SCALE, name: "Shadow Scale", description: "Defeat the Void Serpent boss", color: 0x330066, unlocked: false },
    { id: DragonSkinId.GOLDEN_LIGHT, name: "Golden Light", description: "Score 100,000 points in a single run", color: 0xffd700, unlocked: false },
    { id: DragonSkinId.VOID_PURPLE, name: "Void Purple", description: "Beat the game on Hard difficulty", color: 0x9900ff, unlocked: false },
    { id: DragonSkinId.STORM_BLUE, name: "Storm Blue", description: "Defeat the Storm Titan boss", color: 0x00ccff, unlocked: false },
    { id: DragonSkinId.EMERALD_NATURE, name: "Emerald Nature", description: "Collect 200 items in a single run", color: 0x22cc44, unlocked: false },
    { id: DragonSkinId.BONE_WHITE, name: "Bone White", description: "Complete 10 total runs", color: 0xddccaa, unlocked: false },
    { id: DragonSkinId.NIGHTMARE_BLACK, name: "Nightmare Black", description: "Beat the game on Nightmare difficulty", color: 0x110011, unlocked: false },
  ];
}

// ---------------------------------------------------------------------------
// Meta-progression helpers
// ---------------------------------------------------------------------------

export function createDefaultMetaProgression(): DragoonMetaProgression {
  return {
    highScores: {
      [DragoonDifficulty.EASY]: 0,
      [DragoonDifficulty.NORMAL]: 0,
      [DragoonDifficulty.HARD]: 0,
      [DragoonDifficulty.NIGHTMARE]: 0,
    },
    totalRunsCompleted: 0,
    bestStageReached: {
      [DragoonDifficulty.EASY]: 0,
      [DragoonDifficulty.NORMAL]: 0,
      [DragoonDifficulty.HARD]: 0,
      [DragoonDifficulty.NIGHTMARE]: 0,
    },
    unlockedSkins: [DragonSkinId.DEFAULT],
    leaderboard: [],
  };
}

export function loadMetaProgression(): DragoonMetaProgression {
  try {
    const raw = localStorage.getItem("dragoon_meta");
    if (raw) return JSON.parse(raw) as DragoonMetaProgression;
  } catch { /* ignore parse errors */ }
  return createDefaultMetaProgression();
}

export function saveMetaProgression(meta: DragoonMetaProgression): void {
  try {
    localStorage.setItem("dragoon_meta", JSON.stringify(meta));
  } catch { /* ignore storage errors */ }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createDragoonState(screenW: number, screenH: number, difficulty: DragoonDifficulty = DragoonDifficulty.NORMAL): DragoonState {
  const diffMods = DIFFICULTY_MODIFIERS[difficulty];
  const meta = loadMetaProgression();

  return {
    gameTime: 0,
    paused: false,
    gameOver: false,
    victory: false,

    difficulty,
    difficultyMods: diffMods,

    classId: DragoonClassId.ARCANE_MAGE,
    subclassId: null,
    classSelectActive: true,
    subclassChoiceActive: false,
    subclassOptions: null,
    subclassUnlocked: false,

    subclassPoints: 0,
    subclassSkillTree: [],
    subclassSelected: false,

    player: {
      position: { x: screenW * 1.5 * 0.5, y: screenH * 0.5 },
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
      camLeft: false, camRight: false, camUp: false, camDown: false,
      fire: false,
      skill1: false, skill2: false, skill3: false, skill4: false, skill5: false, skill6: false,
      mouseX: screenW * 0.5, mouseY: screenH * 0.5,
    },

    nextId: 1,
    screenW,
    screenH,

    worldWidth: screenW * 1.5,
    cameraX: 0,

    recentDeadEnemies: [],

    unlockedSkills: [],
    equippedUnlockSkill: null,
    unlockSkillState: null,

    escapeMenuOpen: false,

    runStats: {
      enemiesKilled: 0,
      bossesDefeated: 0,
      damageDealt: 0,
      damageTaken: 0,
      itemsCollected: 0,
      timeSurvived: 0,
      highestCombo: 0,
      projectilesFired: 0,
    },

    metaProgression: meta,

    cosmeticUnlocks: createDefaultCosmetics(),
    equippedSkin: DragonSkinId.DEFAULT,

    leaderboard: meta.leaderboard,

    // Branching paths
    branchState: {
      forkActive: false,
      currentFork: null,
      chosenPath: null,
      pathHistory: [],
      pathDifficultyMod: 1,
      pathScoreMult: 1,
      pathEnemyPool: null,
      pathBoss: null,
    },

    // Dragon evolution
    evolutionState: {
      currentStage: DragonEvolutionStage.HATCHLING,
      evolutionPoints: 0,
      stageIndex: 0,
      transitionTimer: 0,
    },

    // Score attack mode
    scoreAttack: {
      enabled: false,
      chainMultiplier: 1,
      chainDecayTimer: 0,
      chainDecayRate: 0.5,
      maxChainMultiplier: 1,
      consecutiveHits: 0,
      missTimer: 0,
      highScores: [],
      totalBonusScore: 0,
      perfectWaves: 0,
      currentWaveDamageTaken: false,
    },

    // Environmental destruction
    destructibles: [],
  };
}
