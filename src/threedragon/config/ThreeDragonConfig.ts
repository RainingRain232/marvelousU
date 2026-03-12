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

  ENEMY_SPAWN_RATE_BASE: 1.3,
  ENEMY_SPAWN_RATE_MIN: 0.3,
  ENEMY_COUNT_BASE: 8,
  ENEMY_COUNT_GROWTH: 3,
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
