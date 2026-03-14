// ---------------------------------------------------------------------------
// 3Dragon mode — balance config, enemy & skill definitions
// ---------------------------------------------------------------------------

import { TDEnemyType, TDSkillId, TDEnemyPattern } from "../state/ThreeDragonState";

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
} as const;

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
  [TDEnemyType.SHADOW_RAVEN, TDEnemyType.ARCANE_ORB],
  // Waves 5-8
  [TDEnemyType.SHADOW_RAVEN, TDEnemyType.CRYSTAL_WYVERN, TDEnemyType.EMBER_PHOENIX, TDEnemyType.CANNON_FORT],
  // Waves 9-12
  [TDEnemyType.CRYSTAL_WYVERN, TDEnemyType.STORM_HARPY, TDEnemyType.VOID_WRAITH, TDEnemyType.SIEGE_GOLEM, TDEnemyType.CANNON_FORT],
  // Waves 13-16
  [TDEnemyType.STORM_HARPY, TDEnemyType.VOID_WRAITH, TDEnemyType.SPECTRAL_KNIGHT, TDEnemyType.DARK_TOWER, TDEnemyType.SIEGE_GOLEM],
  // Waves 17-20
  [TDEnemyType.SPECTRAL_KNIGHT, TDEnemyType.VOID_WRAITH, TDEnemyType.EMBER_PHOENIX, TDEnemyType.DARK_TOWER],
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
};
