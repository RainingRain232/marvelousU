// ---------------------------------------------------------------------------
// Panzer Dragoon mode — balance config, enemy definitions, skill definitions
// ---------------------------------------------------------------------------

import { DragoonEnemyType, DragoonSkillId, EnemyPattern } from "../state/DragoonState";

// ---------------------------------------------------------------------------
// Balance
// ---------------------------------------------------------------------------

export const DragoonBalance = {
  SIM_TICK_MS: 16,              // ~60fps

  PLAYER_SPEED: 320,            // pixels/second
  PLAYER_HIT_RADIUS: 14,
  PLAYER_INVINCIBILITY: 1.5,    // seconds after hit

  COMBO_TIMEOUT: 2.0,           // seconds before combo resets
  COMBO_SCORE_MULT: 0.1,        // bonus per combo hit

  MANA_COST_STARFALL: 20,
  MANA_COST_THUNDERSTORM: 30,
  MANA_COST_FROST_NOVA: 25,
  MANA_COST_METEOR: 50,

  SCROLL_SPEED_BASE: 60,
  SCROLL_SPEED_WAVE_MULT: 2,    // scroll gets slightly faster each wave

  BOSS_WAVE_INTERVAL: 4,        // boss every N waves
  TOTAL_WAVES: 20,

  WAVE_DURATION_BASE: 18,
  WAVE_DURATION_GROWTH: 2,      // +2s per wave
  BETWEEN_WAVE_PAUSE: 3.5,

  ENEMY_SPAWN_RATE_BASE: 1.2,   // seconds between spawns
  ENEMY_SPAWN_RATE_MIN: 0.3,
  ENEMY_COUNT_BASE: 8,
  ENEMY_COUNT_GROWTH: 3,
  ENEMY_HP_SCALE: 0.12,         // +12% per wave
  ENEMY_DMG_SCALE: 0.08,        // +8% per wave

  PROJECTILE_CLEANUP_MARGIN: 100,
} as const;

// ---------------------------------------------------------------------------
// Enemy templates
// ---------------------------------------------------------------------------

export interface EnemyTemplate {
  type: DragoonEnemyType;
  hp: number;
  speed: number;
  size: number;
  pattern: EnemyPattern;
  fireRate: number;      // 0 = doesn't shoot
  color: number;
  glowColor: number;
  scoreValue: number;
  isBoss: boolean;
  isGround: boolean;
}

export const ENEMY_TEMPLATES: Record<string, EnemyTemplate> = {
  // --- Sky enemies ---
  [DragoonEnemyType.DARK_CROW]: {
    type: DragoonEnemyType.DARK_CROW, hp: 15, speed: 140, size: 1,
    pattern: EnemyPattern.STRAIGHT, fireRate: 0,
    color: 0x1a1a2e, glowColor: 0x4a0066, scoreValue: 50, isBoss: false, isGround: false,
  },
  [DragoonEnemyType.SHADOW_BAT]: {
    type: DragoonEnemyType.SHADOW_BAT, hp: 20, speed: 180, size: 0.8,
    pattern: EnemyPattern.SINE_WAVE, fireRate: 0,
    color: 0x2d1b4e, glowColor: 0x8844cc, scoreValue: 60, isBoss: false, isGround: false,
  },
  [DragoonEnemyType.WYVERN]: {
    type: DragoonEnemyType.WYVERN, hp: 45, speed: 100, size: 1.5,
    pattern: EnemyPattern.HOVER, fireRate: 1.8,
    color: 0x663322, glowColor: 0xff6622, scoreValue: 120, isBoss: false, isGround: false,
  },
  [DragoonEnemyType.FIRE_SPRITE]: {
    type: DragoonEnemyType.FIRE_SPRITE, hp: 25, speed: 200, size: 0.7,
    pattern: EnemyPattern.CIRCLE, fireRate: 2.5,
    color: 0xff4400, glowColor: 0xffaa00, scoreValue: 80, isBoss: false, isGround: false,
  },
  [DragoonEnemyType.STORM_HAWK]: {
    type: DragoonEnemyType.STORM_HAWK, hp: 35, speed: 250, size: 1.2,
    pattern: EnemyPattern.DIVE, fireRate: 0,
    color: 0x3344aa, glowColor: 0x66bbff, scoreValue: 100, isBoss: false, isGround: false,
  },
  [DragoonEnemyType.FLOATING_EYE]: {
    type: DragoonEnemyType.FLOATING_EYE, hp: 60, speed: 50, size: 1.3,
    pattern: EnemyPattern.HOVER, fireRate: 1.2,
    color: 0x990044, glowColor: 0xff0066, scoreValue: 150, isBoss: false, isGround: false,
  },
  [DragoonEnemyType.DARK_ANGEL]: {
    type: DragoonEnemyType.DARK_ANGEL, hp: 80, speed: 120, size: 1.6,
    pattern: EnemyPattern.SINE_WAVE, fireRate: 1.5,
    color: 0x220033, glowColor: 0xaa00ff, scoreValue: 200, isBoss: false, isGround: false,
  },
  // --- Ground enemies ---
  [DragoonEnemyType.GROUND_CATAPULT]: {
    type: DragoonEnemyType.GROUND_CATAPULT, hp: 50, speed: 40, size: 1.4,
    pattern: EnemyPattern.GROUND, fireRate: 2.5,
    color: 0x665533, glowColor: 0xccaa66, scoreValue: 100, isBoss: false, isGround: true,
  },
  [DragoonEnemyType.GROUND_MAGE_TOWER]: {
    type: DragoonEnemyType.GROUND_MAGE_TOWER, hp: 80, speed: 30, size: 1.8,
    pattern: EnemyPattern.GROUND, fireRate: 1.8,
    color: 0x334466, glowColor: 0x6699ff, scoreValue: 150, isBoss: false, isGround: true,
  },
  [DragoonEnemyType.GROUND_BALLISTA]: {
    type: DragoonEnemyType.GROUND_BALLISTA, hp: 35, speed: 45, size: 1.2,
    pattern: EnemyPattern.GROUND, fireRate: 1.5,
    color: 0x554433, glowColor: 0xaa8855, scoreValue: 80, isBoss: false, isGround: true,
  },
  // --- Bosses ---
  [DragoonEnemyType.BOSS_DRAKE]: {
    type: DragoonEnemyType.BOSS_DRAKE, hp: 600, speed: 60, size: 3.5,
    pattern: EnemyPattern.BOSS_PATTERN, fireRate: 0.8,
    color: 0x881100, glowColor: 0xff4400, scoreValue: 2000, isBoss: true, isGround: false,
  },
  [DragoonEnemyType.BOSS_CHIMERA]: {
    type: DragoonEnemyType.BOSS_CHIMERA, hp: 900, speed: 50, size: 4.0,
    pattern: EnemyPattern.BOSS_PATTERN, fireRate: 0.6,
    color: 0x553300, glowColor: 0xffaa00, scoreValue: 3500, isBoss: true, isGround: false,
  },
  [DragoonEnemyType.BOSS_LICH_KING]: {
    type: DragoonEnemyType.BOSS_LICH_KING, hp: 1200, speed: 40, size: 3.8,
    pattern: EnemyPattern.BOSS_PATTERN, fireRate: 0.5,
    color: 0x110033, glowColor: 0x9900ff, scoreValue: 5000, isBoss: true, isGround: false,
  },
  [DragoonEnemyType.BOSS_STORM_TITAN]: {
    type: DragoonEnemyType.BOSS_STORM_TITAN, hp: 1600, speed: 35, size: 4.5,
    pattern: EnemyPattern.BOSS_PATTERN, fireRate: 0.4,
    color: 0x003344, glowColor: 0x00ccff, scoreValue: 7000, isBoss: true, isGround: false,
  },
  [DragoonEnemyType.BOSS_VOID_SERPENT]: {
    type: DragoonEnemyType.BOSS_VOID_SERPENT, hp: 2500, speed: 45, size: 5.0,
    pattern: EnemyPattern.BOSS_PATTERN, fireRate: 0.3,
    color: 0x0a0a0a, glowColor: 0xff00ff, scoreValue: 10000, isBoss: true, isGround: false,
  },
};

// Which enemies can appear in each wave tier
export const WAVE_ENEMY_POOL: DragoonEnemyType[][] = [
  // Waves 1-4
  [DragoonEnemyType.DARK_CROW, DragoonEnemyType.SHADOW_BAT],
  // Waves 5-8
  [DragoonEnemyType.DARK_CROW, DragoonEnemyType.SHADOW_BAT, DragoonEnemyType.WYVERN, DragoonEnemyType.FIRE_SPRITE, DragoonEnemyType.GROUND_CATAPULT],
  // Waves 9-12
  [DragoonEnemyType.WYVERN, DragoonEnemyType.FIRE_SPRITE, DragoonEnemyType.STORM_HAWK, DragoonEnemyType.FLOATING_EYE, DragoonEnemyType.GROUND_CATAPULT, DragoonEnemyType.GROUND_BALLISTA],
  // Waves 13-16
  [DragoonEnemyType.STORM_HAWK, DragoonEnemyType.FLOATING_EYE, DragoonEnemyType.DARK_ANGEL, DragoonEnemyType.GROUND_MAGE_TOWER, DragoonEnemyType.GROUND_BALLISTA],
  // Waves 17-20
  [DragoonEnemyType.DARK_ANGEL, DragoonEnemyType.FLOATING_EYE, DragoonEnemyType.STORM_HAWK, DragoonEnemyType.WYVERN, DragoonEnemyType.GROUND_MAGE_TOWER],
];

// Boss order (cycles if needed)
export const BOSS_ORDER: DragoonEnemyType[] = [
  DragoonEnemyType.BOSS_DRAKE,
  DragoonEnemyType.BOSS_CHIMERA,
  DragoonEnemyType.BOSS_LICH_KING,
  DragoonEnemyType.BOSS_STORM_TITAN,
  DragoonEnemyType.BOSS_VOID_SERPENT,
];

// ---------------------------------------------------------------------------
// Skill configs
// ---------------------------------------------------------------------------

export interface SkillConfig {
  id: DragoonSkillId;
  name: string;
  description: string;
  damage: number;
  manaCost: number;
  cooldown: number;
  duration: number;     // for channeled skills
  color: number;
  key: string;          // keyboard binding display
}

export const SKILL_CONFIGS: Record<DragoonSkillId, SkillConfig> = {
  [DragoonSkillId.ARCANE_BOLT]: {
    id: DragoonSkillId.ARCANE_BOLT,
    name: "Arcane Bolt",
    description: "Rapid-fire magic bolts",
    damage: 8,
    manaCost: 0,
    cooldown: 0.12,
    duration: 0,
    color: 0x88ccff,
    key: "LMB",
  },
  [DragoonSkillId.STARFALL]: {
    id: DragoonSkillId.STARFALL,
    name: "Starfall",
    description: "Homing star projectiles seek enemies",
    damage: 18,
    manaCost: 20,
    cooldown: 4,
    duration: 2,
    color: 0xffdd44,
    key: "1",
  },
  [DragoonSkillId.THUNDERSTORM]: {
    id: DragoonSkillId.THUNDERSTORM,
    name: "Thunderstorm",
    description: "Lightning strikes around cursor",
    damage: 35,
    manaCost: 30,
    cooldown: 6,
    duration: 1.5,
    color: 0x44aaff,
    key: "2",
  },
  [DragoonSkillId.FROST_NOVA]: {
    id: DragoonSkillId.FROST_NOVA,
    name: "Frost Nova",
    description: "Radial burst that slows and damages",
    damage: 25,
    manaCost: 25,
    cooldown: 8,
    duration: 0,
    color: 0x88eeff,
    key: "3",
  },
  [DragoonSkillId.METEOR_SHOWER]: {
    id: DragoonSkillId.METEOR_SHOWER,
    name: "Meteor Shower",
    description: "Devastating rain of fire from above",
    damage: 60,
    manaCost: 50,
    cooldown: 14,
    duration: 3,
    color: 0xff4400,
    key: "4",
  },
};
