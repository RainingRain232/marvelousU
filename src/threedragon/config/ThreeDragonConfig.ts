// ---------------------------------------------------------------------------
// 3Dragon mode — balance config, enemy & skill definitions
// ---------------------------------------------------------------------------

import { TDEnemyType, TDSkillId, TDEnemyPattern } from "../state/ThreeDragonState";
import type { TDHazardType, TDWaveModifierId, TDWaveModifier, TDUpgradeChoice } from "../state/ThreeDragonState";

// ---------------------------------------------------------------------------
// Balance
// ---------------------------------------------------------------------------

export const TDBalance = {
  SIM_TICK_MS: 16,

  PLAYER_SPEED: 18,
  PLAYER_HIT_RADIUS: 1.5,
  PLAYER_INVINCIBILITY: 1.5,

  COMBO_TIMEOUT: 2.0,
  COMBO_SCORE_MULT: 0.1,

  MANA_COST_CELESTIAL_LANCE: 18,
  MANA_COST_THUNDERSTORM: 30,
  MANA_COST_FROST_NOVA: 25,
  MANA_COST_METEOR: 50,
  MANA_COST_DIVINE_SHIELD: 40,

  SCROLL_SPEED_BASE: 20,

  BOSS_WAVE_INTERVAL: 4,
  TOTAL_WAVES: 20,

  WAVE_DURATION_BASE: 20,
  WAVE_DURATION_GROWTH: 2,
  BETWEEN_WAVE_PAUSE: 4,

  ENEMY_SPAWN_RATE_BASE: 0.7,
  ENEMY_SPAWN_RATE_MIN: 0.15,
  ENEMY_COUNT_BASE: 18,
  ENEMY_COUNT_GROWTH: 7,
  ENEMY_HP_SCALE: 0.12,
  ENEMY_DMG_SCALE: 0.08,

  BOOST_DURATION: 1.5,
  BOOST_COOLDOWN: 5,
  BOOST_SPEED_MULT: 2.0,
  BOOST_SCROLL_MULT: 1.8,

  PROJECTILE_CLEANUP_DIST: 80,

  // Power-ups
  POWERUP_DROP_CHANCE: 0.25,
  POWERUP_HEALTH_RATIO: 0.4,
  POWERUP_HEALTH_VALUE: 10,
  POWERUP_MANA_VALUE: 15,
  POWERUP_LIFETIME: 8,
  POWERUP_MAGNET_RADIUS: 12,
  POWERUP_COLLECT_RADIUS: 2.5,
  POWERUP_MAGNET_SPEED: 25,

  // 3D world bounds
  WORLD_X_MIN: -40,
  WORLD_X_MAX: 40,
  WORLD_Y_MIN: 2,
  WORLD_Y_MAX: 22,

  // XP & Levels
  XP_PER_KILL_BASE: 10,
  XP_PER_KILL_BOSS: 200,
  XP_LEVEL_BASE: 100,
  XP_LEVEL_GROWTH: 50,
} as const;

// ---------------------------------------------------------------------------
// Skill unlock order — unlocked at specific levels
// ---------------------------------------------------------------------------

export const TD_SKILL_UNLOCK_ORDER: { level: number; skillId: TDSkillId }[] = [
  { level: 2, skillId: TDSkillId.FIRE_BREATH },
  { level: 3, skillId: TDSkillId.LIGHTNING_BOLT },
  { level: 4, skillId: TDSkillId.WING_GUST },
  { level: 5, skillId: TDSkillId.ICE_STORM },
  { level: 6, skillId: TDSkillId.DRAGON_ROAR },
  { level: 7, skillId: TDSkillId.HEALING_FLAME },
  { level: 8, skillId: TDSkillId.SHADOW_DIVE },
  { level: 9, skillId: TDSkillId.CHAIN_LIGHTNING },
];

// ---------------------------------------------------------------------------
// Enemy templates
// ---------------------------------------------------------------------------

export interface TDEnemyTemplate {
  type: TDEnemyType;
  hp: number;
  speed: number;
  size: number;
  pattern: TDEnemyPattern;
  fireRate: number;
  color: number;
  glowColor: number;
  scoreValue: number;
  isBoss: boolean;
  isGround: boolean;
}

export const TD_ENEMY_TEMPLATES: Record<string, TDEnemyTemplate> = {
  // --- Sky enemies ---
  [TDEnemyType.SHADOW_RAVEN]: {
    type: TDEnemyType.SHADOW_RAVEN, hp: 18, speed: 12, size: 1,
    pattern: TDEnemyPattern.STRAIGHT, fireRate: 0,
    color: 0x1a1a2e, glowColor: 0x6600aa, scoreValue: 50, isBoss: false, isGround: false,
  },
  [TDEnemyType.CRYSTAL_WYVERN]: {
    type: TDEnemyType.CRYSTAL_WYVERN, hp: 50, speed: 8, size: 1.8,
    pattern: TDEnemyPattern.HOVER, fireRate: 2.0,
    color: 0x4488aa, glowColor: 0x66ddff, scoreValue: 130, isBoss: false, isGround: false,
  },
  [TDEnemyType.EMBER_PHOENIX]: {
    type: TDEnemyType.EMBER_PHOENIX, hp: 30, speed: 15, size: 1.2,
    pattern: TDEnemyPattern.SINE_WAVE, fireRate: 2.5,
    color: 0xff4400, glowColor: 0xffaa22, scoreValue: 90, isBoss: false, isGround: false,
  },
  [TDEnemyType.STORM_HARPY]: {
    type: TDEnemyType.STORM_HARPY, hp: 35, speed: 18, size: 1.3,
    pattern: TDEnemyPattern.DIVE, fireRate: 0,
    color: 0x3355bb, glowColor: 0x77bbff, scoreValue: 100, isBoss: false, isGround: false,
  },
  [TDEnemyType.VOID_WRAITH]: {
    type: TDEnemyType.VOID_WRAITH, hp: 65, speed: 6, size: 1.5,
    pattern: TDEnemyPattern.HOVER, fireRate: 1.3,
    color: 0x220033, glowColor: 0xaa00ff, scoreValue: 160, isBoss: false, isGround: false,
  },
  [TDEnemyType.SPECTRAL_KNIGHT]: {
    type: TDEnemyType.SPECTRAL_KNIGHT, hp: 80, speed: 10, size: 1.6,
    pattern: TDEnemyPattern.SINE_WAVE, fireRate: 1.5,
    color: 0x113355, glowColor: 0x44aaff, scoreValue: 180, isBoss: false, isGround: false,
  },
  [TDEnemyType.ARCANE_ORB]: {
    type: TDEnemyType.ARCANE_ORB, hp: 25, speed: 14, size: 0.8,
    pattern: TDEnemyPattern.SWARM, fireRate: 3.0,
    color: 0x882288, glowColor: 0xff44ff, scoreValue: 70, isBoss: false, isGround: false,
  },
  [TDEnemyType.BLOOD_HUNTER]: {
    type: TDEnemyType.BLOOD_HUNTER, hp: 22, speed: 20, size: 1.1,
    pattern: TDEnemyPattern.CHASE, fireRate: 0,
    color: 0x880022, glowColor: 0xff3344, scoreValue: 65, isBoss: false, isGround: false,
  },
  [TDEnemyType.RUNIC_SENTINEL]: {
    type: TDEnemyType.RUNIC_SENTINEL, hp: 40, speed: 6, size: 1.3,
    pattern: TDEnemyPattern.SNIPE, fireRate: 1.0,
    color: 0x224466, glowColor: 0x44ddff, scoreValue: 110, isBoss: false, isGround: false,
  },
  // --- Ground enemies ---
  [TDEnemyType.DARK_TOWER]: {
    type: TDEnemyType.DARK_TOWER, hp: 90, speed: 3, size: 2.0,
    pattern: TDEnemyPattern.GROUND, fireRate: 1.8,
    color: 0x334466, glowColor: 0x6699ff, scoreValue: 150, isBoss: false, isGround: true,
  },
  [TDEnemyType.SIEGE_GOLEM]: {
    type: TDEnemyType.SIEGE_GOLEM, hp: 60, speed: 5, size: 1.8,
    pattern: TDEnemyPattern.GROUND, fireRate: 2.5,
    color: 0x665533, glowColor: 0xccaa66, scoreValue: 110, isBoss: false, isGround: true,
  },
  [TDEnemyType.CANNON_FORT]: {
    type: TDEnemyType.CANNON_FORT, hp: 45, speed: 4, size: 1.5,
    pattern: TDEnemyPattern.GROUND, fireRate: 1.5,
    color: 0x554433, glowColor: 0xaa8855, scoreValue: 90, isBoss: false, isGround: true,
  },
  // --- Bosses ---
  [TDEnemyType.BOSS_ANCIENT_DRAGON]: {
    type: TDEnemyType.BOSS_ANCIENT_DRAGON, hp: 700, speed: 5, size: 4.0,
    pattern: TDEnemyPattern.BOSS_PATTERN, fireRate: 0.8,
    color: 0x881100, glowColor: 0xff4400, scoreValue: 2500, isBoss: true, isGround: false,
  },
  [TDEnemyType.BOSS_STORM_COLOSSUS]: {
    type: TDEnemyType.BOSS_STORM_COLOSSUS, hp: 1000, speed: 4, size: 5.0,
    pattern: TDEnemyPattern.BOSS_PATTERN, fireRate: 0.6,
    color: 0x003355, glowColor: 0x00ccff, scoreValue: 4000, isBoss: true, isGround: false,
  },
  [TDEnemyType.BOSS_DEATH_KNIGHT]: {
    type: TDEnemyType.BOSS_DEATH_KNIGHT, hp: 1300, speed: 6, size: 3.5,
    pattern: TDEnemyPattern.BOSS_PATTERN, fireRate: 0.5,
    color: 0x110033, glowColor: 0x9900ff, scoreValue: 5500, isBoss: true, isGround: false,
  },
  [TDEnemyType.BOSS_CELESTIAL_HYDRA]: {
    type: TDEnemyType.BOSS_CELESTIAL_HYDRA, hp: 1800, speed: 3, size: 5.5,
    pattern: TDEnemyPattern.BOSS_PATTERN, fireRate: 0.4,
    color: 0x005533, glowColor: 0x44ffaa, scoreValue: 7500, isBoss: true, isGround: false,
  },
  [TDEnemyType.BOSS_VOID_EMPEROR]: {
    type: TDEnemyType.BOSS_VOID_EMPEROR, hp: 2800, speed: 5, size: 6.0,
    pattern: TDEnemyPattern.BOSS_PATTERN, fireRate: 0.3,
    color: 0x0a0a0a, glowColor: 0xff00ff, scoreValue: 12000, isBoss: true, isGround: false,
  },
};

// Wave enemy pools
export const TD_WAVE_ENEMY_POOL: TDEnemyType[][] = [
  // Waves 1-4
  [TDEnemyType.SHADOW_RAVEN, TDEnemyType.ARCANE_ORB, TDEnemyType.BLOOD_HUNTER, TDEnemyType.RUNIC_SENTINEL],
  // Waves 5-8
  [TDEnemyType.SHADOW_RAVEN, TDEnemyType.CRYSTAL_WYVERN, TDEnemyType.EMBER_PHOENIX, TDEnemyType.CANNON_FORT, TDEnemyType.BLOOD_HUNTER, TDEnemyType.RUNIC_SENTINEL],
  // Waves 9-12
  [TDEnemyType.CRYSTAL_WYVERN, TDEnemyType.STORM_HARPY, TDEnemyType.VOID_WRAITH, TDEnemyType.SIEGE_GOLEM, TDEnemyType.CANNON_FORT, TDEnemyType.BLOOD_HUNTER, TDEnemyType.RUNIC_SENTINEL],
  // Waves 13-16
  [TDEnemyType.STORM_HARPY, TDEnemyType.VOID_WRAITH, TDEnemyType.SPECTRAL_KNIGHT, TDEnemyType.DARK_TOWER, TDEnemyType.SIEGE_GOLEM, TDEnemyType.BLOOD_HUNTER, TDEnemyType.RUNIC_SENTINEL],
  // Waves 17-20
  [TDEnemyType.SPECTRAL_KNIGHT, TDEnemyType.VOID_WRAITH, TDEnemyType.EMBER_PHOENIX, TDEnemyType.DARK_TOWER, TDEnemyType.BLOOD_HUNTER, TDEnemyType.RUNIC_SENTINEL],
];

export const TD_BOSS_ORDER: TDEnemyType[] = [
  TDEnemyType.BOSS_ANCIENT_DRAGON,
  TDEnemyType.BOSS_STORM_COLOSSUS,
  TDEnemyType.BOSS_DEATH_KNIGHT,
  TDEnemyType.BOSS_CELESTIAL_HYDRA,
  TDEnemyType.BOSS_VOID_EMPEROR,
];

// ---------------------------------------------------------------------------
// Skill configs
// ---------------------------------------------------------------------------

export interface TDSkillConfig {
  id: TDSkillId;
  name: string;
  description: string;
  damage: number;
  manaCost: number;
  cooldown: number;
  duration: number;
  color: number;
  key: string;
}

// ---------------------------------------------------------------------------
// Map configs — visual themes for different environments
// ---------------------------------------------------------------------------

export interface TDMapConfig {
  id: string;
  name: string;
  description: string;
  preview: string; // short flavour text for the menu

  // Sky
  skyTopColor: number;
  skyMidColor: number;
  skyHorizonColor: number;
  skySunColor: number;
  sunPosition: [number, number, number];
  moonPosition: [number, number, number];

  // Fog
  fogColor: number;
  fogDensity: number;

  // Lighting
  ambientColor: number;
  ambientIntensity: number;
  sunLightColor: number;
  sunLightIntensity: number;
  hemiSkyColor: number;
  hemiGroundColor: number;
  rimLightColor: number;

  // Ground
  groundColor: number;
  groundHueVariation: number;

  // Water
  waterColor: number;
  waterHighlight: number;
  waterAlpha: number;
  waterY: number;

  // Mountains
  mountainBaseHue: number;
  mountainSatRange: [number, number];
  mountainLightRange: [number, number];
  snowColor: number;
  snowThreshold: number; // mountain height above which snow appears

  // Vegetation
  grassColors: number[];
  treeCanopyColors: number[];
  trunkColor: number;
  flowerColors: number[];
  rockColor: number;

  // Clouds
  cloudLightColors: number[];
  cloudDarkColors: number[];
  cloudMidColors: number[];
  cloudHighlightColor: number;
  cloudCount: number;

  // Terrain shape (optional — defaults applied at runtime)
  mountainCount?: number;       // how many mountain groups (default 45)
  mountainHeightMin?: number;   // min peak height (default 15)
  mountainHeightMax?: number;   // max peak height (default 60)
  mountainSpreadX?: number;     // how far out to the sides (default 100)

  // Environmental hazards for this map
  hazards?: {
    type: TDHazardType;
    interval: number;       // seconds between spawns
    damage: number;
    radius: number;
    warningDuration: number;
    activeDuration: number;
  }[];
}

export const TD_MAPS: TDMapConfig[] = [
  // -------------------------------------------------------------------------
  // 1. Enchanted Valley (original default)
  // -------------------------------------------------------------------------
  {
    id: "enchanted_valley",
    name: "Enchanted Valley",
    description: "Rolling green hills beneath a golden sunset sky",
    preview: "Lush meadows and ancient forests bathed in golden light",

    skyTopColor: 0x0b0e2a,
    skyMidColor: 0x1a2555,
    skyHorizonColor: 0xdd6633,
    skySunColor: 0xffcc44,
    sunPosition: [80, 60, -120],
    moonPosition: [-90, 70, -80],

    fogColor: 0x1a1833,
    fogDensity: 0.006,

    ambientColor: 0x334466,
    ambientIntensity: 0.5,
    sunLightColor: 0xffeedd,
    sunLightIntensity: 1.6,
    hemiSkyColor: 0x7799dd,
    hemiGroundColor: 0x224422,
    rimLightColor: 0xff9966,

    groundColor: 0x1e4a1e,
    groundHueVariation: 0.03,

    waterColor: 0x0d1f3c,
    waterHighlight: 0x3388bb,
    waterAlpha: 0.65,
    waterY: -3,

    mountainBaseHue: 0.28,
    mountainSatRange: [0.25, 0.40],
    mountainLightRange: [0.15, 0.27],
    snowColor: 0xddeeff,
    snowThreshold: 22,

    grassColors: [0x2a6e2a, 0x337733, 0x448833, 0x557722],
    treeCanopyColors: [0x225522, 0x2a5e2a, 0x4a7a2a, 0x886622, 0x994422, 0x553322],
    trunkColor: 0x553311,
    flowerColors: [0xff6688, 0xffaa44, 0xcc88ff, 0x88ccff, 0xffff66, 0xff4466],
    rockColor: 0x445544,

    cloudLightColors: [0xddccaa, 0xeeddbb, 0xccbb99, 0xddbb88],
    cloudDarkColors: [0x556688, 0x667799, 0x445577, 0x778899],
    cloudMidColors: [0x99aabb, 0xaabbcc, 0x8899aa, 0xbbaa99],
    cloudHighlightColor: 0xffeedd,
    cloudCount: 55,
    // No special hazards for enchanted valley (base map)
  },

  // -------------------------------------------------------------------------
  // 2. Frozen Wastes
  // -------------------------------------------------------------------------
  {
    id: "frozen_wastes",
    name: "Frozen Wastes",
    description: "An endless expanse of ice and snow under pale skies",
    preview: "Glacial plains where blizzards howl and auroras dance",

    skyTopColor: 0x0a1528,
    skyMidColor: 0x1a3355,
    skyHorizonColor: 0x8899bb,
    skySunColor: 0xccddff,
    sunPosition: [60, 25, -130],
    moonPosition: [-70, 80, -60],

    fogColor: 0x223344,
    fogDensity: 0.005,

    ambientColor: 0x446688,
    ambientIntensity: 0.6,
    sunLightColor: 0xccddff,
    sunLightIntensity: 1.2,
    hemiSkyColor: 0x99bbdd,
    hemiGroundColor: 0x334466,
    rimLightColor: 0x88aacc,

    groundColor: 0x667788,
    groundHueVariation: 0.01,

    waterColor: 0x112233,
    waterHighlight: 0x5599cc,
    waterAlpha: 0.75,
    waterY: -3,

    mountainBaseHue: 0.58,
    mountainSatRange: [0.10, 0.20],
    mountainLightRange: [0.30, 0.50],
    snowColor: 0xeef4ff,
    snowThreshold: 12,

    grassColors: [0x556677, 0x667788, 0x5577888, 0x445566],
    treeCanopyColors: [0x1a3322, 0x223828, 0x2a4433, 0x445566, 0x334455, 0x556688],
    trunkColor: 0x443333,
    flowerColors: [0x88ccff, 0xaaddff, 0x66bbee, 0xccddff, 0x99bbdd, 0xffffff],
    rockColor: 0x556677,

    cloudLightColors: [0xccddee, 0xddeeff, 0xbbccdd, 0xaabbcc],
    cloudDarkColors: [0x445566, 0x556677, 0x334455, 0x667788],
    cloudMidColors: [0x8899aa, 0x99aabb, 0x7788999, 0xaabbcc],
    cloudHighlightColor: 0xeef4ff,
    cloudCount: 65,
    hazards: [
      { type: "blizzard_wind", interval: 5, damage: 0, radius: 100, warningDuration: 0.5, activeDuration: 2 },
    ],
  },

  // -------------------------------------------------------------------------
  // 3. Volcanic Ashlands
  // -------------------------------------------------------------------------
  {
    id: "volcanic_ashlands",
    name: "Volcanic Ashlands",
    description: "Charred wastelands glowing with rivers of molten lava",
    preview: "Smoldering crags and ember-lit skies of a dying land",

    skyTopColor: 0x0a0505,
    skyMidColor: 0x2a1010,
    skyHorizonColor: 0xcc4411,
    skySunColor: 0xff6622,
    sunPosition: [40, 30, -100],
    moonPosition: [-80, 50, -90],

    fogColor: 0x1a0808,
    fogDensity: 0.008,

    ambientColor: 0x331111,
    ambientIntensity: 0.4,
    sunLightColor: 0xff8844,
    sunLightIntensity: 1.4,
    hemiSkyColor: 0x663322,
    hemiGroundColor: 0x331100,
    rimLightColor: 0xff4400,

    groundColor: 0x1a1a1a,
    groundHueVariation: 0.01,

    waterColor: 0x441100,
    waterHighlight: 0xff4400,
    waterAlpha: 0.85,
    waterY: -3,

    mountainBaseHue: 0.02,
    mountainSatRange: [0.10, 0.25],
    mountainLightRange: [0.08, 0.18],
    snowColor: 0x332222,
    snowThreshold: 50, // no snow on volcanic mountains

    grassColors: [0x222211, 0x2a2a18, 0x333320, 0x1a1a10],
    treeCanopyColors: [0x1a1008, 0x221510, 0x2a1a12, 0x332010, 0x110808, 0x1a0c0c],
    trunkColor: 0x221100,
    flowerColors: [0xff4400, 0xff6622, 0xffaa00, 0xcc3300, 0xff8800, 0xffcc22],
    rockColor: 0x2a2222,

    cloudLightColors: [0x663322, 0x774433, 0x553311, 0x884433],
    cloudDarkColors: [0x221111, 0x331818, 0x1a0c0c, 0x2a1515],
    cloudMidColors: [0x442222, 0x553322, 0x332211, 0x443322],
    cloudHighlightColor: 0xff6633,
    cloudCount: 40,
    hazards: [
      { type: "lava_geyser", interval: 3, damage: 15, radius: 4, warningDuration: 1, activeDuration: 1.5 },
    ],
  },

  // -------------------------------------------------------------------------
  // 4. Crystal Caverns
  // -------------------------------------------------------------------------
  {
    id: "crystal_caverns",
    name: "Crystal Caverns",
    description: "A vast underground realm of luminous crystal formations",
    preview: "Bioluminescent flora and towering crystal spires",

    skyTopColor: 0x0a0520,
    skyMidColor: 0x1a1040,
    skyHorizonColor: 0x6633aa,
    skySunColor: 0xaa66ff,
    sunPosition: [50, 70, -100],
    moonPosition: [-60, 60, -70],

    fogColor: 0x120822,
    fogDensity: 0.007,

    ambientColor: 0x2a1155,
    ambientIntensity: 0.5,
    sunLightColor: 0xcc88ff,
    sunLightIntensity: 1.3,
    hemiSkyColor: 0x6644aa,
    hemiGroundColor: 0x221144,
    rimLightColor: 0xaa44ff,

    groundColor: 0x1a1033,
    groundHueVariation: 0.04,

    waterColor: 0x0a1122,
    waterHighlight: 0x22ddaa,
    waterAlpha: 0.70,
    waterY: -3,

    mountainBaseHue: 0.75,
    mountainSatRange: [0.30, 0.50],
    mountainLightRange: [0.12, 0.25],
    snowColor: 0xcc88ff,
    snowThreshold: 18,

    grassColors: [0x2a1a44, 0x331f55, 0x3a2266, 0x221544],
    treeCanopyColors: [0x442266, 0x553388, 0x3a2255, 0x6633aa, 0x8844cc, 0x2a1155],
    trunkColor: 0x331155,
    flowerColors: [0xaa44ff, 0x66ddaa, 0xff44cc, 0x44ccff, 0xffaa66, 0x88ff88],
    rockColor: 0x2a1a44,

    cloudLightColors: [0x8855bb, 0x9966cc, 0x7744aa, 0xaa77dd],
    cloudDarkColors: [0x221133, 0x331944, 0x1a0c2a, 0x2a1540],
    cloudMidColors: [0x553377, 0x664488, 0x443366, 0x775599],
    cloudHighlightColor: 0xcc88ff,
    cloudCount: 35,
    hazards: [
      { type: "crystal_shard", interval: 4, damage: 12, radius: 3, warningDuration: 1.2, activeDuration: 0.5 },
    ],
  },

  // -------------------------------------------------------------------------
  // 5. Celestial Peaks
  // -------------------------------------------------------------------------
  {
    id: "celestial_peaks",
    name: "Celestial Peaks",
    description: "Soaring above the clouds among the highest mountain spires",
    preview: "Where the stars feel close enough to touch",

    skyTopColor: 0x020510,
    skyMidColor: 0x081530,
    skyHorizonColor: 0x334488,
    skySunColor: 0xffeebb,
    sunPosition: [100, 80, -90],
    moonPosition: [-50, 90, -50],

    fogColor: 0x0a1020,
    fogDensity: 0.004,

    ambientColor: 0x223355,
    ambientIntensity: 0.45,
    sunLightColor: 0xffeedd,
    sunLightIntensity: 1.8,
    hemiSkyColor: 0x5577bb,
    hemiGroundColor: 0x222233,
    rimLightColor: 0xffcc88,

    groundColor: 0x334433,
    groundHueVariation: 0.02,

    waterColor: 0x0a1833,
    waterHighlight: 0x4488cc,
    waterAlpha: 0.55,
    waterY: -5,

    mountainBaseHue: 0.60,
    mountainSatRange: [0.08, 0.18],
    mountainLightRange: [0.20, 0.35],
    snowColor: 0xeeeeff,
    snowThreshold: 15,

    grassColors: [0x334433, 0x3a4a3a, 0x445544, 0x2a3a2a],
    treeCanopyColors: [0x1a3322, 0x223828, 0x2a4030, 0x334433, 0x445544, 0x223322],
    trunkColor: 0x443322,
    flowerColors: [0xaabbff, 0xddddff, 0x88aaee, 0xccbbff, 0xffffff, 0xeeddff],
    rockColor: 0x444455,

    cloudLightColors: [0xddddee, 0xeeeeff, 0xccccdd, 0xddeeff],
    cloudDarkColors: [0x334455, 0x445566, 0x223344, 0x556677],
    cloudMidColors: [0x8899aa, 0x99aabb, 0x778899, 0xaabbcc],
    cloudHighlightColor: 0xffeedd,
    cloudCount: 70,
  },

  // -------------------------------------------------------------------------
  // 6. Sunken Archipelago — tropical islands with few mountains, lots of water
  // -------------------------------------------------------------------------
  {
    id: "sunken_archipelago",
    name: "Sunken Archipelago",
    description: "Scattered tropical islands rising from turquoise shallows",
    preview: "Coral reefs, palm groves, and warm ocean breezes",

    skyTopColor: 0x041833,
    skyMidColor: 0x1a4488,
    skyHorizonColor: 0x55aadd,
    skySunColor: 0xffee88,
    sunPosition: [90, 75, -100],
    moonPosition: [-80, 60, -70],

    fogColor: 0x1a3355,
    fogDensity: 0.004,

    ambientColor: 0x336688,
    ambientIntensity: 0.6,
    sunLightColor: 0xfff4dd,
    sunLightIntensity: 1.7,
    hemiSkyColor: 0x88bbee,
    hemiGroundColor: 0x225544,
    rimLightColor: 0xffdd88,

    groundColor: 0x44886a,
    groundHueVariation: 0.04,

    waterColor: 0x0a3355,
    waterHighlight: 0x33ccaa,
    waterAlpha: 0.55,
    waterY: -1,

    mountainBaseHue: 0.32,
    mountainSatRange: [0.30, 0.50],
    mountainLightRange: [0.18, 0.32],
    snowColor: 0xeeffee,
    snowThreshold: 50, // no snow — tropical

    grassColors: [0x33aa55, 0x44bb66, 0x55cc44, 0x228844],
    treeCanopyColors: [0x228833, 0x33aa44, 0x55bb33, 0x117722, 0x44cc55, 0x339944],
    trunkColor: 0x665533,
    flowerColors: [0xff5588, 0xffaa33, 0xff3366, 0x44ddff, 0xffdd44, 0xff66aa],
    rockColor: 0x557766,

    cloudLightColors: [0xeeeeff, 0xddeeff, 0xccddee, 0xffffff],
    cloudDarkColors: [0x446677, 0x557788, 0x335566, 0x668899],
    cloudMidColors: [0x99bbcc, 0xaaccdd, 0x88aabb, 0xbbddee],
    cloudHighlightColor: 0xfff8ee,
    cloudCount: 40,
    hazards: [
      { type: "water_spout", interval: 4, damage: 8, radius: 3.5, warningDuration: 0.8, activeDuration: 1.5 },
    ],

    mountainCount: 18,
    mountainHeightMin: 8,
    mountainHeightMax: 25,
    mountainSpreadX: 80,
  },

  // -------------------------------------------------------------------------
  // 7. Stormspire Crags — jagged, dense mountain maze with dark storms
  // -------------------------------------------------------------------------
  {
    id: "stormspire_crags",
    name: "Stormspire Crags",
    description: "A labyrinth of towering stone spires lashed by perpetual storms",
    preview: "Lightning-scarred pinnacles piercing angry skies",

    skyTopColor: 0x050810,
    skyMidColor: 0x101828,
    skyHorizonColor: 0x334455,
    skySunColor: 0x889aaa,
    sunPosition: [30, 20, -120],
    moonPosition: [-60, 40, -80],

    fogColor: 0x0c1018,
    fogDensity: 0.009,

    ambientColor: 0x222833,
    ambientIntensity: 0.35,
    sunLightColor: 0xaabbcc,
    sunLightIntensity: 0.9,
    hemiSkyColor: 0x445566,
    hemiGroundColor: 0x111822,
    rimLightColor: 0x556688,

    groundColor: 0x222830,
    groundHueVariation: 0.015,

    waterColor: 0x081018,
    waterHighlight: 0x224466,
    waterAlpha: 0.80,
    waterY: -4,

    mountainBaseHue: 0.58,
    mountainSatRange: [0.05, 0.12],
    mountainLightRange: [0.12, 0.22],
    snowColor: 0x99aabb,
    snowThreshold: 28,

    grassColors: [0x1a2228, 0x222a33, 0x283038, 0x1e2830],
    treeCanopyColors: [0x112018, 0x1a281e, 0x223020, 0x0e1814, 0x182820, 0x142018],
    trunkColor: 0x2a2218,
    flowerColors: [0x4466aa, 0x5577bb, 0x3355aa, 0x88aaff, 0x6688cc, 0xaaccff],
    rockColor: 0x333a44,

    cloudLightColors: [0x556677, 0x667788, 0x445566, 0x778899],
    cloudDarkColors: [0x1a2030, 0x222a38, 0x141c28, 0x2a3240],
    cloudMidColors: [0x3a4455, 0x445566, 0x334050, 0x556070],
    cloudHighlightColor: 0x8899aa,
    cloudCount: 80,
    hazards: [
      { type: "lightning_strike", interval: 2, damage: 18, radius: 4.5, warningDuration: 0.7, activeDuration: 0.3 },
    ],

    mountainCount: 75,
    mountainHeightMin: 20,
    mountainHeightMax: 70,
    mountainSpreadX: 70,
  },

  // -------------------------------------------------------------------------
  // 8. Autumn Serpentine — winding river valley in fall colors
  // -------------------------------------------------------------------------
  {
    id: "autumn_serpentine",
    name: "Autumn Serpentine",
    description: "A winding golden valley where the river carves through ancient hills",
    preview: "Crimson maples and amber oaks along a meandering river",

    skyTopColor: 0x0a0814,
    skyMidColor: 0x1e1830,
    skyHorizonColor: 0xcc7744,
    skySunColor: 0xffaa55,
    sunPosition: [70, 45, -100],
    moonPosition: [-80, 70, -60],

    fogColor: 0x1a1420,
    fogDensity: 0.005,

    ambientColor: 0x443322,
    ambientIntensity: 0.5,
    sunLightColor: 0xffcc88,
    sunLightIntensity: 1.5,
    hemiSkyColor: 0x886644,
    hemiGroundColor: 0x332211,
    rimLightColor: 0xffaa66,

    groundColor: 0x3a4422,
    groundHueVariation: 0.05,

    waterColor: 0x0d1a2a,
    waterHighlight: 0x4488aa,
    waterAlpha: 0.60,
    waterY: -2,

    mountainBaseHue: 0.08,
    mountainSatRange: [0.20, 0.40],
    mountainLightRange: [0.14, 0.25],
    snowColor: 0xddd8cc,
    snowThreshold: 35,

    grassColors: [0x886622, 0x997733, 0xaa8833, 0x665522],
    treeCanopyColors: [0xcc4422, 0xdd6633, 0xee8844, 0xbb3311, 0xff9944, 0x994422],
    trunkColor: 0x443322,
    flowerColors: [0xffcc44, 0xff8833, 0xcc5522, 0xffee66, 0xddaa33, 0xff6644],
    rockColor: 0x554433,

    cloudLightColors: [0xddbb88, 0xeecc99, 0xccaa77, 0xddaa66],
    cloudDarkColors: [0x443322, 0x554433, 0x332211, 0x665544],
    cloudMidColors: [0x887766, 0x998877, 0x776655, 0xaa9977],
    cloudHighlightColor: 0xffcc88,
    cloudCount: 50,
    hazards: [
      { type: "leaf_tornado", interval: 6, damage: 5, radius: 5, warningDuration: 0, activeDuration: 5 },
    ],

    mountainCount: 35,
    mountainHeightMin: 10,
    mountainHeightMax: 40,
    mountainSpreadX: 90,
  },

  // -------------------------------------------------------------------------
  // 9. Abyssal Depths — deep ocean trench with bioluminescent atmosphere
  // -------------------------------------------------------------------------
  {
    id: "abyssal_depths",
    name: "Abyssal Depths",
    description: "A crushing deep-ocean trench where bioluminescent life casts eerie glows through the perpetual darkness. Pressure waves ripple through the abyss.",
    preview: "Descend into the lightless deep where ancient creatures glow.",

    skyTopColor: 0x000508,
    skyMidColor: 0x001122,
    skyHorizonColor: 0x002233,
    skySunColor: 0x004455,
    sunPosition: [0.2, 0.05, -1],
    moonPosition: [-0.5, 0.3, 1],

    fogColor: 0x001a2a,
    fogDensity: 0.04,

    ambientColor: 0x00cccc,
    ambientIntensity: 0.25,
    sunLightColor: 0x33eecc,
    sunLightIntensity: 0.3,
    hemiSkyColor: 0x003344,
    hemiGroundColor: 0x001a22,
    rimLightColor: 0x00ffaa,

    groundColor: 0x0a1e2e,
    groundHueVariation: 0.06,

    waterColor: 0x001520,
    waterHighlight: 0x00ffcc,
    waterAlpha: 0.85,
    waterY: -1,

    mountainBaseHue: 0.52,
    mountainSatRange: [0.25, 0.45],
    mountainLightRange: [0.08, 0.2],
    snowColor: 0x224455,
    snowThreshold: 0.85,

    grassColors: [0x0a2233, 0x0d2d44, 0x082838, 0x113344, 0x00334d],
    treeCanopyColors: [0x004455, 0x005566, 0x003344, 0x006666, 0x007777, 0x005555],
    trunkColor: 0x112233,
    flowerColors: [0x00ffdd, 0x33ffaa, 0xff00ff, 0x00ffff, 0x66ff99, 0xcc44ff],
    rockColor: 0x1a2a3a,

    cloudLightColors: [0x0a3344, 0x0d4455, 0x083838, 0x114455],
    cloudDarkColors: [0x001118, 0x000a12, 0x00080e, 0x001520],
    cloudMidColors: [0x052530, 0x063040, 0x042028, 0x073545],
    cloudHighlightColor: 0x00ddbb,
    cloudCount: 30,
    hazards: [
      { type: "pressure_wave", interval: 4, damage: 10, radius: 5, warningDuration: 1.0, activeDuration: 1.0 },
    ],

    mountainCount: 40,
    mountainHeightMin: 12,
    mountainHeightMax: 45,
    mountainSpreadX: 85,
  },

  // -------------------------------------------------------------------------
  // 10. Sakura Highlands — Japanese cherry blossom mountain realm
  // -------------------------------------------------------------------------
  {
    id: "sakura_highlands",
    name: "Sakura Highlands",
    description: "A serene mountain realm where cherry blossoms drift on warm twilight breezes. Petal storms sweep through the valleys with deceptive grace.",
    preview: "Walk among the blossoms on misty sacred peaks.",

    skyTopColor: 0x2a1533,
    skyMidColor: 0x6b3a6e,
    skyHorizonColor: 0xdd8899,
    skySunColor: 0xffbb88,
    sunPosition: [-0.6, 0.15, -0.8],
    moonPosition: [0.5, 0.6, 0.8],

    fogColor: 0xddaacc,
    fogDensity: 0.012,

    ambientColor: 0xffaacc,
    ambientIntensity: 0.5,
    sunLightColor: 0xffddaa,
    sunLightIntensity: 0.7,
    hemiSkyColor: 0xcc88aa,
    hemiGroundColor: 0x556644,
    rimLightColor: 0xffccdd,

    groundColor: 0x3a6633,
    groundHueVariation: 0.12,

    waterColor: 0x6677aa,
    waterHighlight: 0xccaadd,
    waterAlpha: 0.5,
    waterY: -4,

    mountainBaseHue: 0.08,
    mountainSatRange: [0.2, 0.4],
    mountainLightRange: [0.3, 0.55],
    snowColor: 0xffeeff,
    snowThreshold: 0.6,

    grassColors: [0x447733, 0x558844, 0x669944, 0x3a6b2a, 0x5a8a3a],
    treeCanopyColors: [0xff88aa, 0xffaacc, 0xff6699, 0xee77aa, 0x88bb66, 0xaacc77],
    trunkColor: 0x6b4433,
    flowerColors: [0xffaacc, 0xffeeff, 0xcc88dd, 0xffdd66, 0xff99bb, 0xeeccff],
    rockColor: 0x887766,

    cloudLightColors: [0xffccdd, 0xffddee, 0xeebbcc, 0xffbbcc],
    cloudDarkColors: [0x775566, 0x886677, 0x664455, 0x775566],
    cloudMidColors: [0xcc99aa, 0xddaabb, 0xbb8899, 0xddbbcc],
    cloudHighlightColor: 0xffeedd,
    cloudCount: 45,
    hazards: [
      { type: "petal_storm", interval: 5, damage: 6, radius: 4, warningDuration: 0.5, activeDuration: 3 },
    ],

    mountainCount: 50,
    mountainHeightMin: 12,
    mountainHeightMax: 50,
    mountainSpreadX: 95,
  },
];

export const TD_MAP_BY_ID: Record<string, TDMapConfig> = {};
for (const m of TD_MAPS) TD_MAP_BY_ID[m.id] = m;

// ---------------------------------------------------------------------------
// Skill configs
// ---------------------------------------------------------------------------

export const TD_SKILL_CONFIGS: Record<TDSkillId, TDSkillConfig> = {
  [TDSkillId.ARCANE_BOLT]: {
    id: TDSkillId.ARCANE_BOLT,
    name: "Arcane Bolt",
    description: "Rapid-fire magic bolts from the wand",
    damage: 9,
    manaCost: 0,
    cooldown: 0.12,
    duration: 0,
    color: 0x88ccff,
    key: "LMB",
  },
  [TDSkillId.CELESTIAL_LANCE]: {
    id: TDSkillId.CELESTIAL_LANCE,
    name: "Celestial Lance",
    description: "Piercing beam of holy light",
    damage: 45,
    manaCost: 18,
    cooldown: 3.5,
    duration: 0,
    color: 0xffffaa,
    key: "1",
  },
  [TDSkillId.THUNDERSTORM]: {
    id: TDSkillId.THUNDERSTORM,
    name: "Thunderstorm",
    description: "Lightning strikes from the heavens",
    damage: 35,
    manaCost: 30,
    cooldown: 6,
    duration: 2,
    color: 0x44aaff,
    key: "2",
  },
  [TDSkillId.FROST_NOVA]: {
    id: TDSkillId.FROST_NOVA,
    name: "Frost Nova",
    description: "Radial burst of freezing energy",
    damage: 28,
    manaCost: 25,
    cooldown: 8,
    duration: 0,
    color: 0x88eeff,
    key: "3",
  },
  [TDSkillId.METEOR_SHOWER]: {
    id: TDSkillId.METEOR_SHOWER,
    name: "Meteor Shower",
    description: "Rain of fire from the skies above",
    damage: 65,
    manaCost: 50,
    cooldown: 14,
    duration: 3,
    color: 0xff4400,
    key: "4",
  },
  [TDSkillId.DIVINE_SHIELD]: {
    id: TDSkillId.DIVINE_SHIELD,
    name: "Divine Shield",
    description: "Holy barrier absorbs all damage",
    damage: 0,
    manaCost: 40,
    cooldown: 20,
    duration: 3,
    color: 0xffdd88,
    key: "5",
  },
  [TDSkillId.BOOST]: {
    id: TDSkillId.BOOST,
    name: "Boost",
    description: "Surge forward at incredible speed",
    damage: 0,
    manaCost: 0,
    cooldown: 5,
    duration: 1.5,
    color: 0x44ccff,
    key: "Shift",
  },
  // Unlockable skills
  [TDSkillId.FIRE_BREATH]: {
    id: TDSkillId.FIRE_BREATH,
    name: "Fire Breath",
    description: "Cone of searing dragonfire ahead",
    damage: 22,
    manaCost: 20,
    cooldown: 5,
    duration: 1.5,
    color: 0xff6600,
    key: "1",
  },
  [TDSkillId.ICE_STORM]: {
    id: TDSkillId.ICE_STORM,
    name: "Ice Storm",
    description: "Hail of ice shards that slow enemies",
    damage: 18,
    manaCost: 28,
    cooldown: 8,
    duration: 2.5,
    color: 0x88ddff,
    key: "2",
  },
  [TDSkillId.LIGHTNING_BOLT]: {
    id: TDSkillId.LIGHTNING_BOLT,
    name: "Lightning Bolt",
    description: "Instant high-damage bolt to nearest enemy",
    damage: 55,
    manaCost: 22,
    cooldown: 4,
    duration: 0,
    color: 0xffff44,
    key: "3",
  },
  [TDSkillId.DRAGON_ROAR]: {
    id: TDSkillId.DRAGON_ROAR,
    name: "Dragon Roar",
    description: "Stuns all nearby enemies for 2 seconds",
    damage: 15,
    manaCost: 30,
    cooldown: 12,
    duration: 2,
    color: 0xff8844,
    key: "4",
  },
  [TDSkillId.WING_GUST]: {
    id: TDSkillId.WING_GUST,
    name: "Wing Gust",
    description: "Powerful wind blast that pushes enemies away",
    damage: 12,
    manaCost: 18,
    cooldown: 6,
    duration: 0,
    color: 0xaaddcc,
    key: "5",
  },
  [TDSkillId.HEALING_FLAME]: {
    id: TDSkillId.HEALING_FLAME,
    name: "Healing Flame",
    description: "Sacred flame that restores health over time",
    damage: 0,
    manaCost: 35,
    cooldown: 15,
    duration: 4,
    color: 0x44ff88,
    key: "1",
  },
  [TDSkillId.SHADOW_DIVE]: {
    id: TDSkillId.SHADOW_DIVE,
    name: "Shadow Dive",
    description: "Phase into shadows, becoming invulnerable and dealing damage on exit",
    damage: 40,
    manaCost: 25,
    cooldown: 10,
    duration: 1.5,
    color: 0x6600aa,
    key: "2",
  },
  [TDSkillId.CHAIN_LIGHTNING]: {
    id: TDSkillId.CHAIN_LIGHTNING,
    name: "Chain Lightning",
    description: "Lightning arcs between up to 6 enemies",
    damage: 30,
    manaCost: 32,
    cooldown: 7,
    duration: 0,
    color: 0x44ddff,
    key: "3",
  },
};

// ---------------------------------------------------------------------------
// Synergy definitions
// ---------------------------------------------------------------------------

export interface TDSynergyDef {
  id: string;
  name: string;
  color: string;
  description: string;
}

export const TD_SYNERGIES: Record<string, TDSynergyDef> = {
  shatter: { id: "shatter", name: "SHATTER!", color: "#88ddff", description: "Frozen enemies take +50% physical damage" },
  conductor: { id: "conductor", name: "CONDUCTOR!", color: "#ffff44", description: "Lightning deals +30% to wet/frozen enemies" },
  ignite: { id: "ignite", name: "IGNITE!", color: "#ff6600", description: "Fire on frozen enemies causes steam explosion" },
  resonance: { id: "resonance", name: "RESONANCE!", color: "#ff8844", description: "Dragon Roar after Wing Gust doubles stun" },
  shadow_strike: { id: "shadow_strike", name: "SHADOW STRIKE!", color: "#aa00ff", description: "Attacks during Shadow Dive deal 2x damage" },
};

// Physical skill IDs (for Shatter synergy)
export const TD_PHYSICAL_SKILLS: TDSkillId[] = [
  TDSkillId.ARCANE_BOLT,
  TDSkillId.CELESTIAL_LANCE,
];

// Lightning skill IDs (for Conductor synergy)
export const TD_LIGHTNING_SKILLS: TDSkillId[] = [
  TDSkillId.LIGHTNING_BOLT,
  TDSkillId.CHAIN_LIGHTNING,
  TDSkillId.THUNDERSTORM,
];

// Fire skill IDs (for Ignite synergy)
export const TD_FIRE_SKILLS: TDSkillId[] = [
  TDSkillId.FIRE_BREATH,
  TDSkillId.METEOR_SHOWER,
];

// ---------------------------------------------------------------------------
// Wave modifier definitions
// ---------------------------------------------------------------------------

export const TD_WAVE_MODIFIERS: TDWaveModifier[] = [
  { id: "armored", name: "Armored", description: "Enemies take 40% less damage", icon: "\u{1F6E1}", color: "#aabbcc" },
  { id: "haste", name: "Haste", description: "Enemies move 50% faster", icon: "\u{26A1}", color: "#ffcc44" },
  { id: "multiplied", name: "Multiplied", description: "2x enemies, half HP each", icon: "\u{2716}", color: "#ff88aa" },
  { id: "aerial", name: "Aerial", description: "All enemies become sky type", icon: "\u{1F985}", color: "#88ccff" },
  { id: "vampiric", name: "Vampiric", description: "Enemies heal 10% of damage dealt", icon: "\u{1FA78}", color: "#cc44aa" },
  { id: "explosive", name: "Explosive", description: "Enemies explode on death", icon: "\u{1F4A5}", color: "#ff6622" },
];

export const TD_WAVE_MODIFIER_BY_ID: Record<TDWaveModifierId, TDWaveModifier> = {} as Record<TDWaveModifierId, TDWaveModifier>;
for (const m of TD_WAVE_MODIFIERS) (TD_WAVE_MODIFIER_BY_ID as Record<string, TDWaveModifier>)[m.id] = m;

// ---------------------------------------------------------------------------
// Upgrade definitions (between-wave choices)
// ---------------------------------------------------------------------------

export const TD_UPGRADE_POOL: TDUpgradeChoice[] = [
  { id: "max_hp", name: "+15 Max HP", description: "Increases maximum health by 15", icon: "\u{2764}", color: "#ff4444" },
  { id: "max_mana", name: "+20 Max Mana", description: "Increases maximum mana by 20", icon: "\u{1F4A7}", color: "#4488ff" },
  { id: "damage", name: "+10% Damage", description: "All damage increased by 10%", icon: "\u{2694}", color: "#ff8844" },
  { id: "mana_regen", name: "+1 Mana/s", description: "Mana regeneration +1 per second", icon: "\u{2728}", color: "#88aaff" },
  { id: "crit_chance", name: "+5% Crit", description: "Critical hit chance +5%", icon: "\u{1F4AB}", color: "#ffdd44" },
  { id: "move_speed", name: "+10% Speed", description: "Movement speed increased by 10%", icon: "\u{1F3C3}", color: "#44ff88" },
  { id: "cooldown_reduction", name: "-15% Cooldowns", description: "All skill cooldowns reduced by 15%", icon: "\u{23F1}", color: "#cc88ff" },
];
