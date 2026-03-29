// ---------------------------------------------------------------------------
// Panzer Dragoon mode — balance config, enemy definitions, skill definitions
// ---------------------------------------------------------------------------

import {
  DragoonClassId, DragoonEnemyType, DragoonSkillId, DragoonSubclassId, EnemyPattern, SubclassSkillNode,
  DragoonPathId, DragonEvolutionStage, DestructibleType,
} from "../state/DragoonState";
import type { DragoonForkPoint, DragonEvolutionDef } from "../state/DragoonState";

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
  MANA_COST_DIVINE_SHIELD: 35,

  PICKUP_DROP_CHANCE: 0.20,
  PICKUP_HEALTH_AMOUNT: 15,
  PICKUP_MANA_AMOUNT: 20,
  PICKUP_SCORE_MULT: 2.0,
  PICKUP_SCORE_MULT_DURATION: 8,
  PICKUP_LIFETIME: 10,
  PICKUP_COLLECT_RADIUS: 35,

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

  SUBCLASS_LEVEL: 5,           // subclass selection now at level 5 (was 20)
  SUBCLASS_POINT_LEVELS: [5, 10, 15, 20] as readonly number[],  // levels that grant subclass skill points

  /** World width as a multiplier of screen width (camera range). */
  WORLD_WIDTH_MULT: 1.5,

  /** Fork choice display time (seconds) before auto-picking left path. */
  FORK_CHOICE_TIMEOUT: 10,
  /** Seconds between fork choice appearance and wave resume. */
  FORK_TRANSITION_PAUSE: 2.0,

  /** Evolution point gain per enemy kill (based on score value). */
  EVOLUTION_POINTS_PER_KILL: 1.0,
  /** Duration of evolution transition visual effect. */
  EVOLUTION_TRANSITION_DURATION: 1.5,

  /** Destructible spawn margin (pixels offscreen right). */
  DESTRUCTIBLE_SPAWN_MARGIN: 60,
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
  [DragoonEnemyType.SHADOW_WRAITH]: {
    type: DragoonEnemyType.SHADOW_WRAITH, hp: 40, speed: 80, size: 1.1,
    pattern: EnemyPattern.TELEPORT, fireRate: 2.0,
    color: 0x220044, glowColor: 0xaa00ff, scoreValue: 130, isBoss: false, isGround: false,
  },
  [DragoonEnemyType.SKY_VIPER]: {
    type: DragoonEnemyType.SKY_VIPER, hp: 30, speed: 200, size: 0.9,
    pattern: EnemyPattern.ZIGZAG, fireRate: 0,
    color: 0x336600, glowColor: 0x66ff00, scoreValue: 90, isBoss: false, isGround: false,
  },
  [DragoonEnemyType.DARK_FALCON_SQUAD]: {
    type: DragoonEnemyType.DARK_FALCON_SQUAD, hp: 25, speed: 160, size: 0.85,
    pattern: EnemyPattern.V_FORMATION, fireRate: 2.5,
    color: 0x333344, glowColor: 0x6666aa, scoreValue: 70, isBoss: false, isGround: false,
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
  [DragoonEnemyType.GROUND_SIEGE_ENGINE]: {
    type: DragoonEnemyType.GROUND_SIEGE_ENGINE, hp: 120, speed: 20, size: 2.2,
    pattern: EnemyPattern.GROUND_SLOW, fireRate: 3.0,
    color: 0x443322, glowColor: 0x886644, scoreValue: 200, isBoss: false, isGround: true,
  },
  [DragoonEnemyType.GROUND_CAVALRY]: {
    type: DragoonEnemyType.GROUND_CAVALRY, hp: 40, speed: 160, size: 1.1,
    pattern: EnemyPattern.GROUND_CHARGE, fireRate: 0,
    color: 0x555566, glowColor: 0xaaaacc, scoreValue: 110, isBoss: false, isGround: true,
  },
  [DragoonEnemyType.GROUND_SHIELD_WALL]: {
    type: DragoonEnemyType.GROUND_SHIELD_WALL, hp: 200, speed: 25, size: 1.8,
    pattern: EnemyPattern.GROUND_SLOW, fireRate: 0,
    color: 0x777788, glowColor: 0xbbbbcc, scoreValue: 160, isBoss: false, isGround: true,
  },
  [DragoonEnemyType.GROUND_WAR_CATAPULT]: {
    type: DragoonEnemyType.GROUND_WAR_CATAPULT, hp: 70, speed: 30, size: 1.6,
    pattern: EnemyPattern.GROUND, fireRate: 2.0,
    color: 0x664422, glowColor: 0xcc8844, scoreValue: 140, isBoss: false, isGround: true,
  },
  [DragoonEnemyType.GROUND_DARK_MAGE_CIRCLE]: {
    type: DragoonEnemyType.GROUND_DARK_MAGE_CIRCLE, hp: 60, speed: 0, size: 1.5,
    pattern: EnemyPattern.GROUND_STATIONARY, fireRate: 1.2,
    color: 0x440066, glowColor: 0xaa00ff, scoreValue: 180, isBoss: false, isGround: true,
  },
  [DragoonEnemyType.GROUND_ARCHER]: {
    type: DragoonEnemyType.GROUND_ARCHER, hp: 20, speed: 35, size: 1.0,
    pattern: EnemyPattern.GROUND, fireRate: 2.2,
    color: 0x553322, glowColor: 0xccaa66, scoreValue: 60, isBoss: false, isGround: true,
  },
  [DragoonEnemyType.GROUND_INFANTRYMAN]: {
    type: DragoonEnemyType.GROUND_INFANTRYMAN, hp: 15, speed: 50, size: 0.9,
    pattern: EnemyPattern.GROUND, fireRate: 0,
    color: 0x666655, glowColor: 0x999988, scoreValue: 30, isBoss: false, isGround: true,
  },
  [DragoonEnemyType.GROUND_SPEARMAN]: {
    type: DragoonEnemyType.GROUND_SPEARMAN, hp: 25, speed: 30, size: 1.1,
    pattern: EnemyPattern.GROUND, fireRate: 5.0,
    color: 0x554444, glowColor: 0xaa7766, scoreValue: 70, isBoss: false, isGround: true,
  },
  // --- Chasers & Snipers ---
  [DragoonEnemyType.HELL_WASP]: {
    type: DragoonEnemyType.HELL_WASP, hp: 18, speed: 220, size: 0.9,
    pattern: EnemyPattern.CHASE, fireRate: 0,
    color: 0xcc4400, glowColor: 0xff6622, scoreValue: 60, isBoss: false, isGround: false,
  },
  [DragoonEnemyType.DARK_ARCHER]: {
    type: DragoonEnemyType.DARK_ARCHER, hp: 35, speed: 80, size: 1.1,
    pattern: EnemyPattern.SNIPE, fireRate: 1.2,
    color: 0x2a1a3a, glowColor: 0x8844cc, scoreValue: 100, isBoss: false, isGround: false,
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
  // --- New Arthurian bosses ---
  [DragoonEnemyType.BOSS_DRAGON_PENDRAGON]: {
    type: DragoonEnemyType.BOSS_DRAGON_PENDRAGON, hp: 1800, speed: 55, size: 4.8,
    pattern: EnemyPattern.BOSS_PATTERN, fireRate: 0.5,
    color: 0xcc8800, glowColor: 0xffcc00, scoreValue: 8000, isBoss: true, isGround: false,
  },
  [DragoonEnemyType.BOSS_QUESTING_BEAST]: {
    type: DragoonEnemyType.BOSS_QUESTING_BEAST, hp: 1400, speed: 70, size: 4.0,
    pattern: EnemyPattern.BOSS_PATTERN, fireRate: 0.6,
    color: 0x226622, glowColor: 0x44ff44, scoreValue: 6500, isBoss: true, isGround: false,
  },
  [DragoonEnemyType.BOSS_BLACK_KNIGHT]: {
    type: DragoonEnemyType.BOSS_BLACK_KNIGHT, hp: 2000, speed: 40, size: 3.5,
    pattern: EnemyPattern.BOSS_PATTERN, fireRate: 0.4,
    color: 0x111111, glowColor: 0x444444, scoreValue: 7500, isBoss: true, isGround: false,
  },
  [DragoonEnemyType.BOSS_MORGANA_WYRM]: {
    type: DragoonEnemyType.BOSS_MORGANA_WYRM, hp: 2200, speed: 50, size: 4.5,
    pattern: EnemyPattern.BOSS_PATTERN, fireRate: 0.35,
    color: 0x660044, glowColor: 0xff00aa, scoreValue: 9000, isBoss: true, isGround: false,
  },
  [DragoonEnemyType.BOSS_GRAIL_GUARDIAN]: {
    type: DragoonEnemyType.BOSS_GRAIL_GUARDIAN, hp: 3000, speed: 30, size: 5.5,
    pattern: EnemyPattern.BOSS_PATTERN, fireRate: 0.25,
    color: 0xddaa00, glowColor: 0xffffff, scoreValue: 15000, isBoss: true, isGround: false,
  },
};

// Which enemies can appear in each wave tier
export const WAVE_ENEMY_POOL: DragoonEnemyType[][] = [
  // Waves 1-4
  [DragoonEnemyType.DARK_CROW, DragoonEnemyType.SHADOW_BAT, DragoonEnemyType.HELL_WASP, DragoonEnemyType.DARK_ARCHER, DragoonEnemyType.GROUND_ARCHER, DragoonEnemyType.GROUND_INFANTRYMAN],
  // Waves 5-8
  [DragoonEnemyType.DARK_CROW, DragoonEnemyType.SHADOW_BAT, DragoonEnemyType.WYVERN, DragoonEnemyType.FIRE_SPRITE, DragoonEnemyType.GROUND_CATAPULT, DragoonEnemyType.SKY_VIPER, DragoonEnemyType.DARK_FALCON_SQUAD, DragoonEnemyType.GROUND_CAVALRY, DragoonEnemyType.HELL_WASP, DragoonEnemyType.DARK_ARCHER, DragoonEnemyType.GROUND_ARCHER, DragoonEnemyType.GROUND_INFANTRYMAN, DragoonEnemyType.GROUND_SPEARMAN],
  // Waves 9-12
  [DragoonEnemyType.WYVERN, DragoonEnemyType.FIRE_SPRITE, DragoonEnemyType.STORM_HAWK, DragoonEnemyType.FLOATING_EYE, DragoonEnemyType.GROUND_CATAPULT, DragoonEnemyType.GROUND_BALLISTA, DragoonEnemyType.SKY_VIPER, DragoonEnemyType.DARK_FALCON_SQUAD, DragoonEnemyType.GROUND_CAVALRY, DragoonEnemyType.GROUND_WAR_CATAPULT, DragoonEnemyType.HELL_WASP, DragoonEnemyType.DARK_ARCHER, DragoonEnemyType.GROUND_ARCHER, DragoonEnemyType.GROUND_SPEARMAN],
  // Waves 13-16
  [DragoonEnemyType.STORM_HAWK, DragoonEnemyType.FLOATING_EYE, DragoonEnemyType.DARK_ANGEL, DragoonEnemyType.GROUND_MAGE_TOWER, DragoonEnemyType.GROUND_BALLISTA, DragoonEnemyType.SHADOW_WRAITH, DragoonEnemyType.GROUND_SIEGE_ENGINE, DragoonEnemyType.GROUND_SHIELD_WALL, DragoonEnemyType.GROUND_DARK_MAGE_CIRCLE, DragoonEnemyType.HELL_WASP, DragoonEnemyType.DARK_ARCHER],
  // Waves 17-20
  [DragoonEnemyType.DARK_ANGEL, DragoonEnemyType.FLOATING_EYE, DragoonEnemyType.STORM_HAWK, DragoonEnemyType.WYVERN, DragoonEnemyType.GROUND_MAGE_TOWER, DragoonEnemyType.SHADOW_WRAITH, DragoonEnemyType.GROUND_SIEGE_ENGINE, DragoonEnemyType.GROUND_SHIELD_WALL, DragoonEnemyType.GROUND_DARK_MAGE_CIRCLE, DragoonEnemyType.GROUND_WAR_CATAPULT, DragoonEnemyType.HELL_WASP, DragoonEnemyType.DARK_ARCHER],
];

// Boss order (cycles if needed)
export const BOSS_ORDER: DragoonEnemyType[] = [
  DragoonEnemyType.BOSS_DRAKE,
  DragoonEnemyType.BOSS_QUESTING_BEAST,
  DragoonEnemyType.BOSS_CHIMERA,
  DragoonEnemyType.BOSS_BLACK_KNIGHT,
  DragoonEnemyType.BOSS_LICH_KING,
  DragoonEnemyType.BOSS_DRAGON_PENDRAGON,
  DragoonEnemyType.BOSS_STORM_TITAN,
  DragoonEnemyType.BOSS_MORGANA_WYRM,
  DragoonEnemyType.BOSS_VOID_SERPENT,
  DragoonEnemyType.BOSS_GRAIL_GUARDIAN,
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
  // =========================================================================
  // ARCANE MAGE
  // =========================================================================
  [DragoonSkillId.ARCANE_BOLT]: {
    id: DragoonSkillId.ARCANE_BOLT,
    name: "Arcane Bolt",
    description: "Rapid-fire magic bolts",
    damage: 8, manaCost: 0, cooldown: 0.12, duration: 0,
    color: 0x88ccff, key: "LMB",
  },
  [DragoonSkillId.STARFALL]: {
    id: DragoonSkillId.STARFALL,
    name: "Starfall",
    description: "Homing star projectiles seek enemies",
    damage: 18, manaCost: 20, cooldown: 4, duration: 2,
    color: 0xffdd44, key: "1",
  },
  [DragoonSkillId.THUNDERSTORM]: {
    id: DragoonSkillId.THUNDERSTORM,
    name: "Thunderstorm",
    description: "Lightning strikes around cursor",
    damage: 35, manaCost: 30, cooldown: 6, duration: 1.5,
    color: 0x44aaff, key: "2",
  },
  [DragoonSkillId.FROST_NOVA]: {
    id: DragoonSkillId.FROST_NOVA,
    name: "Frost Nova",
    description: "Radial burst that slows and damages",
    damage: 25, manaCost: 25, cooldown: 8, duration: 0,
    color: 0x88eeff, key: "3",
  },
  [DragoonSkillId.METEOR_SHOWER]: {
    id: DragoonSkillId.METEOR_SHOWER,
    name: "Meteor Shower",
    description: "Devastating rain of fire from above",
    damage: 60, manaCost: 50, cooldown: 14, duration: 3,
    color: 0xff4400, key: "4",
  },
  [DragoonSkillId.DIVINE_SHIELD]: {
    id: DragoonSkillId.DIVINE_SHIELD,
    name: "Divine Shield",
    description: "Holy barrier blocks all damage",
    damage: 0, manaCost: 35, cooldown: 18, duration: 2.5,
    color: 0xffdd88, key: "5",
  },
  // Chronomancer
  [DragoonSkillId.TIME_WARP]: {
    id: DragoonSkillId.TIME_WARP,
    name: "Time Warp",
    description: "Slow all enemies, boost your speed",
    damage: 0, manaCost: 45, cooldown: 16, duration: 4,
    color: 0xcc88ff, key: "4",
  },
  [DragoonSkillId.TEMPORAL_LOOP]: {
    id: DragoonSkillId.TEMPORAL_LOOP,
    name: "Temporal Loop",
    description: "Reverse all enemy projectiles back at them",
    damage: 0, manaCost: 40, cooldown: 12, duration: 0,
    color: 0xaa66ff, key: "5",
  },
  // Void Weaver
  [DragoonSkillId.SINGULARITY]: {
    id: DragoonSkillId.SINGULARITY,
    name: "Singularity",
    description: "Black hole pulls enemies in and crushes them",
    damage: 40, manaCost: 50, cooldown: 14, duration: 3,
    color: 0x6600aa, key: "4",
  },
  [DragoonSkillId.MIRROR_IMAGE]: {
    id: DragoonSkillId.MIRROR_IMAGE,
    name: "Mirror Image",
    description: "Summon shadow clones that fire bolts",
    damage: 6, manaCost: 35, cooldown: 16, duration: 5,
    color: 0x8844cc, key: "5",
  },

  // =========================================================================
  // STORM RANGER
  // =========================================================================
  [DragoonSkillId.WIND_ARROW]: {
    id: DragoonSkillId.WIND_ARROW,
    name: "Wind Arrow",
    description: "Swift piercing wind bolts",
    damage: 6, manaCost: 0, cooldown: 0.09, duration: 0,
    color: 0x88ffcc, key: "LMB",
  },
  [DragoonSkillId.CHAIN_LIGHTNING]: {
    id: DragoonSkillId.CHAIN_LIGHTNING,
    name: "Chain Lightning",
    description: "Lightning that bounces between 5 enemies",
    damage: 22, manaCost: 20, cooldown: 4, duration: 0,
    color: 0x44ddff, key: "1",
  },
  [DragoonSkillId.GALE_FORCE]: {
    id: DragoonSkillId.GALE_FORCE,
    name: "Gale Force",
    description: "Blast of wind knocks enemies back",
    damage: 15, manaCost: 20, cooldown: 6, duration: 0,
    color: 0xaaffdd, key: "2",
  },
  [DragoonSkillId.HAWK_COMPANION]: {
    id: DragoonSkillId.HAWK_COMPANION,
    name: "Hawk Companion",
    description: "Summon a hawk that auto-attacks enemies",
    damage: 10, manaCost: 25, cooldown: 10, duration: 6,
    color: 0xddaa44, key: "3",
  },
  [DragoonSkillId.TORNADO]: {
    id: DragoonSkillId.TORNADO,
    name: "Tornado",
    description: "A swirling vortex that tears through enemies",
    damage: 30, manaCost: 40, cooldown: 12, duration: 4,
    color: 0x66ccaa, key: "4",
  },
  [DragoonSkillId.WIND_WALK]: {
    id: DragoonSkillId.WIND_WALK,
    name: "Wind Walk",
    description: "Phase through projectiles with speed boost",
    damage: 0, manaCost: 30, cooldown: 14, duration: 3,
    color: 0xccffee, key: "5",
  },
  // Tempest Lord
  [DragoonSkillId.HURRICANE]: {
    id: DragoonSkillId.HURRICANE,
    name: "Hurricane",
    description: "Massive storm damages all visible enemies",
    damage: 20, manaCost: 50, cooldown: 16, duration: 4,
    color: 0x22aadd, key: "4",
  },
  [DragoonSkillId.THUNDER_ARMOR]: {
    id: DragoonSkillId.THUNDER_ARMOR,
    name: "Thunder Armor",
    description: "Lightning aura zaps enemies, reduces damage taken",
    damage: 15, manaCost: 40, cooldown: 18, duration: 6,
    color: 0x44ccff, key: "5",
  },
  // Beastmaster
  [DragoonSkillId.WOLF_PACK]: {
    id: DragoonSkillId.WOLF_PACK,
    name: "Wolf Pack",
    description: "Summon 3 spectral wolves to hunt enemies",
    damage: 12, manaCost: 45, cooldown: 16, duration: 8,
    color: 0x88aa66, key: "4",
  },
  [DragoonSkillId.EAGLE_FURY]: {
    id: DragoonSkillId.EAGLE_FURY,
    name: "Eagle Fury",
    description: "Your eagle dives across the screen dealing massive damage",
    damage: 80, manaCost: 50, cooldown: 20, duration: 0,
    color: 0xffcc44, key: "5",
  },

  // =========================================================================
  // BLOOD KNIGHT
  // =========================================================================
  [DragoonSkillId.BLOOD_LANCE]: {
    id: DragoonSkillId.BLOOD_LANCE,
    name: "Blood Lance",
    description: "Short-range high-damage lance of blood",
    damage: 14, manaCost: 0, cooldown: 0.18, duration: 0,
    color: 0xcc2222, key: "LMB",
  },
  [DragoonSkillId.CRIMSON_SLASH]: {
    id: DragoonSkillId.CRIMSON_SLASH,
    name: "Crimson Slash",
    description: "Cone of blood rips enemies apart",
    damage: 20, manaCost: 18, cooldown: 3, duration: 0,
    color: 0xff4444, key: "1",
  },
  [DragoonSkillId.BLOOD_SHIELD]: {
    id: DragoonSkillId.BLOOD_SHIELD,
    name: "Blood Shield",
    description: "Block next 3 hits and convert to healing",
    damage: 0, manaCost: 25, cooldown: 10, duration: 8,
    color: 0x880000, key: "2",
  },
  [DragoonSkillId.HEMORRHAGE]: {
    id: DragoonSkillId.HEMORRHAGE,
    name: "Hemorrhage",
    description: "Mark area, enemies inside bleed over time",
    damage: 8, manaCost: 22, cooldown: 6, duration: 4,
    color: 0xaa0000, key: "3",
  },
  [DragoonSkillId.EXECUTION]: {
    id: DragoonSkillId.EXECUTION,
    name: "Execution",
    description: "Massive damage to the weakest enemy",
    damage: 120, manaCost: 45, cooldown: 14, duration: 0,
    color: 0xff0000, key: "4",
  },
  [DragoonSkillId.WAR_CRY]: {
    id: DragoonSkillId.WAR_CRY,
    name: "War Cry",
    description: "Boost all damage by 80% for 5s",
    damage: 0, manaCost: 35, cooldown: 16, duration: 5,
    color: 0xff8800, key: "5",
  },
  // Death Knight
  [DragoonSkillId.RAISE_DEAD]: {
    id: DragoonSkillId.RAISE_DEAD,
    name: "Raise Dead",
    description: "Resurrect fallen enemies to fight for you",
    damage: 0, manaCost: 50, cooldown: 20, duration: 8,
    color: 0x44aa44, key: "4",
  },
  [DragoonSkillId.SOUL_HARVEST]: {
    id: DragoonSkillId.SOUL_HARVEST,
    name: "Soul Harvest",
    description: "Kills cause chain explosions for 6s",
    damage: 35, manaCost: 40, cooldown: 18, duration: 6,
    color: 0x22cc66, key: "5",
  },
  // Paladin
  [DragoonSkillId.HOLY_NOVA]: {
    id: DragoonSkillId.HOLY_NOVA,
    name: "Holy Nova",
    description: "Massive radial heal + heavy damage",
    damage: 50, manaCost: 50, cooldown: 16, duration: 0,
    color: 0xffdd44, key: "4",
  },
  [DragoonSkillId.CONSECRATION]: {
    id: DragoonSkillId.CONSECRATION,
    name: "Consecration",
    description: "Holy zone: regen HP + burn enemies nearby",
    damage: 12, manaCost: 40, cooldown: 18, duration: 5,
    color: 0xffcc00, key: "5",
  },

  // =========================================================================
  // SHADOW ASSASSIN
  // =========================================================================
  [DragoonSkillId.SHURIKEN]: {
    id: DragoonSkillId.SHURIKEN,
    name: "Shuriken",
    description: "Rapid shurikens that pierce through enemies",
    damage: 5, manaCost: 0, cooldown: 0.07, duration: 0,
    color: 0xaaaaaa, key: "LMB",
  },
  [DragoonSkillId.FAN_OF_KNIVES]: {
    id: DragoonSkillId.FAN_OF_KNIVES,
    name: "Fan of Knives",
    description: "Burst of 8 blades in all directions",
    damage: 15, manaCost: 18, cooldown: 3.5, duration: 0,
    color: 0xcccccc, key: "1",
  },
  [DragoonSkillId.POISON_CLOUD]: {
    id: DragoonSkillId.POISON_CLOUD,
    name: "Poison Cloud",
    description: "Lingering toxic cloud at cursor",
    damage: 6, manaCost: 22, cooldown: 5, duration: 4,
    color: 0x44cc44, key: "2",
  },
  [DragoonSkillId.SHADOW_STEP]: {
    id: DragoonSkillId.SHADOW_STEP,
    name: "Shadow Step",
    description: "Teleport to cursor with brief invincibility",
    damage: 0, manaCost: 20, cooldown: 4, duration: 0.5,
    color: 0x6644aa, key: "3",
  },
  [DragoonSkillId.MARK_FOR_DEATH]: {
    id: DragoonSkillId.MARK_FOR_DEATH,
    name: "Mark for Death",
    description: "Target enemy takes 3x damage for 5s",
    damage: 0, manaCost: 30, cooldown: 10, duration: 5,
    color: 0xff2222, key: "4",
  },
  [DragoonSkillId.SMOKE_BOMB]: {
    id: DragoonSkillId.SMOKE_BOMB,
    name: "Smoke Bomb",
    description: "Vanish: enemies can't target you for 3s",
    damage: 0, manaCost: 30, cooldown: 14, duration: 3,
    color: 0x666666, key: "5",
  },
  // Ninja
  [DragoonSkillId.SHADOW_CLONE_ARMY]: {
    id: DragoonSkillId.SHADOW_CLONE_ARMY,
    name: "Shadow Clones",
    description: "4 shadow clones fire shurikens for 6s",
    damage: 5, manaCost: 45, cooldown: 16, duration: 6,
    color: 0x8866cc, key: "4",
  },
  [DragoonSkillId.BLADE_STORM]: {
    id: DragoonSkillId.BLADE_STORM,
    name: "Blade Storm",
    description: "Spinning ring of blades shreds nearby enemies",
    damage: 10, manaCost: 40, cooldown: 14, duration: 4,
    color: 0xdddddd, key: "5",
  },
  // Phantom
  [DragoonSkillId.SOUL_SIPHON]: {
    id: DragoonSkillId.SOUL_SIPHON,
    name: "Soul Siphon",
    description: "Channel: drain enemy HP and heal yourself",
    damage: 18, manaCost: 35, cooldown: 12, duration: 3,
    color: 0x44ff88, key: "4",
  },
  [DragoonSkillId.PHASE_SHIFT]: {
    id: DragoonSkillId.PHASE_SHIFT,
    name: "Phase Shift",
    description: "Become intangible: immune + 2x damage for 4s",
    damage: 0, manaCost: 45, cooldown: 20, duration: 4,
    color: 0xaa88ff, key: "5",
  },

  // =========================================================================
  // UNLOCKABLE UNIVERSAL SKILLS (earned through leveling)
  // =========================================================================
  [DragoonSkillId.FIREBALL_BARRAGE]: {
    id: DragoonSkillId.FIREBALL_BARRAGE,
    name: "Fireball Barrage",
    description: "Launches a volley of 5 fireballs in a spread pattern",
    damage: 28, manaCost: 30, cooldown: 8, duration: 0,
    color: 0xff6600, key: "6",
  },
  [DragoonSkillId.ARCANE_SHIELD]: {
    id: DragoonSkillId.ARCANE_SHIELD,
    name: "Arcane Shield",
    description: "Absorbs all damage for 3 seconds",
    damage: 0, manaCost: 25, cooldown: 15, duration: 3,
    color: 0x66aaff, key: "6",
  },
  [DragoonSkillId.SPEED_SURGE]: {
    id: DragoonSkillId.SPEED_SURGE,
    name: "Speed Surge",
    description: "Double movement speed for 4 seconds",
    damage: 0, manaCost: 20, cooldown: 12, duration: 4,
    color: 0x44ffaa, key: "6",
  },
  [DragoonSkillId.CHAIN_NOVA]: {
    id: DragoonSkillId.CHAIN_NOVA,
    name: "Chain Nova",
    description: "Lightning chains between up to 8 nearby enemies",
    damage: 20, manaCost: 28, cooldown: 7, duration: 0,
    color: 0x44ddff, key: "6",
  },
  [DragoonSkillId.HEALING_LIGHT]: {
    id: DragoonSkillId.HEALING_LIGHT,
    name: "Healing Light",
    description: "Restore 40 HP instantly",
    damage: 0, manaCost: 35, cooldown: 18, duration: 0,
    color: 0x44ff44, key: "6",
  },
  [DragoonSkillId.AOE_BOMB]: {
    id: DragoonSkillId.AOE_BOMB,
    name: "Arcane Bomb",
    description: "Massive explosion dealing heavy damage in a huge area",
    damage: 55, manaCost: 45, cooldown: 14, duration: 0,
    color: 0xff44cc, key: "6",
  },
  [DragoonSkillId.HOMING_MISSILES]: {
    id: DragoonSkillId.HOMING_MISSILES,
    name: "Homing Missiles",
    description: "Launch 6 homing projectiles that seek enemies",
    damage: 15, manaCost: 32, cooldown: 10, duration: 0,
    color: 0xffaa22, key: "6",
  },
  [DragoonSkillId.TIME_SLOW]: {
    id: DragoonSkillId.TIME_SLOW,
    name: "Time Slow",
    description: "All enemies move at half speed for 5 seconds",
    damage: 0, manaCost: 30, cooldown: 16, duration: 5,
    color: 0xcc88ff, key: "6",
  },
};

// ---------------------------------------------------------------------------
// Unlockable skill definitions — which levels unlock which skills
// ---------------------------------------------------------------------------

export const UNLOCKABLE_SKILLS: { level: number; skillId: DragoonSkillId }[] = [
  { level: 3,  skillId: DragoonSkillId.SPEED_SURGE },
  { level: 5,  skillId: DragoonSkillId.HEALING_LIGHT },
  { level: 8,  skillId: DragoonSkillId.FIREBALL_BARRAGE },
  { level: 10, skillId: DragoonSkillId.ARCANE_SHIELD },
  { level: 13, skillId: DragoonSkillId.CHAIN_NOVA },
  { level: 15, skillId: DragoonSkillId.HOMING_MISSILES },
  { level: 18, skillId: DragoonSkillId.AOE_BOMB },
  { level: 22, skillId: DragoonSkillId.TIME_SLOW },
];

// ---------------------------------------------------------------------------
// Class definitions
// ---------------------------------------------------------------------------

export interface ClassDefinition {
  id: DragoonClassId;
  name: string;
  description: string;
  color: number;
  basicAttack: DragoonSkillId;
  skills: [DragoonSkillId, DragoonSkillId, DragoonSkillId, DragoonSkillId, DragoonSkillId]; // keys 1-5
  subclasses: [DragoonSubclassId, DragoonSubclassId];
  // Class stat modifiers
  hpMod: number;    // multiplier
  manaMod: number;
  manaRegenMod: number;
  speedMod: number;
}

export const CLASS_DEFINITIONS: Record<DragoonClassId, ClassDefinition> = {
  [DragoonClassId.ARCANE_MAGE]: {
    id: DragoonClassId.ARCANE_MAGE,
    name: "Arcane Mage",
    description: "Master of arcane magic. Versatile spellcaster with powerful AoE.",
    color: 0x88ccff,
    basicAttack: DragoonSkillId.ARCANE_BOLT,
    skills: [DragoonSkillId.STARFALL, DragoonSkillId.THUNDERSTORM, DragoonSkillId.FROST_NOVA, DragoonSkillId.METEOR_SHOWER, DragoonSkillId.DIVINE_SHIELD],
    subclasses: [DragoonSubclassId.CHRONOMANCER, DragoonSubclassId.VOID_WEAVER],
    hpMod: 1, manaMod: 1.2, manaRegenMod: 1.1, speedMod: 1,
  },
  [DragoonClassId.STORM_RANGER]: {
    id: DragoonClassId.STORM_RANGER,
    name: "Storm Ranger",
    description: "Swift wind warrior. Fast attacks, companions, and crowd control.",
    color: 0x44ddaa,
    basicAttack: DragoonSkillId.WIND_ARROW,
    skills: [DragoonSkillId.CHAIN_LIGHTNING, DragoonSkillId.GALE_FORCE, DragoonSkillId.HAWK_COMPANION, DragoonSkillId.TORNADO, DragoonSkillId.WIND_WALK],
    subclasses: [DragoonSubclassId.TEMPEST_LORD, DragoonSubclassId.BEASTMASTER],
    hpMod: 0.9, manaMod: 1, manaRegenMod: 1.2, speedMod: 1.15,
  },
  [DragoonClassId.BLOOD_KNIGHT]: {
    id: DragoonClassId.BLOOD_KNIGHT,
    name: "Blood Knight",
    description: "Brutal warrior of blood magic. High damage, self-healing, tanky.",
    color: 0xcc2222,
    basicAttack: DragoonSkillId.BLOOD_LANCE,
    skills: [DragoonSkillId.CRIMSON_SLASH, DragoonSkillId.BLOOD_SHIELD, DragoonSkillId.HEMORRHAGE, DragoonSkillId.EXECUTION, DragoonSkillId.WAR_CRY],
    subclasses: [DragoonSubclassId.DEATH_KNIGHT, DragoonSubclassId.PALADIN],
    hpMod: 1.3, manaMod: 0.9, manaRegenMod: 0.9, speedMod: 0.95,
  },
  [DragoonClassId.SHADOW_ASSASSIN]: {
    id: DragoonClassId.SHADOW_ASSASSIN,
    name: "Shadow Assassin",
    description: "Lightning-fast rogue. Extreme fire rate, evasion, and debuffs.",
    color: 0xaa88cc,
    basicAttack: DragoonSkillId.SHURIKEN,
    skills: [DragoonSkillId.FAN_OF_KNIVES, DragoonSkillId.POISON_CLOUD, DragoonSkillId.SHADOW_STEP, DragoonSkillId.MARK_FOR_DEATH, DragoonSkillId.SMOKE_BOMB],
    subclasses: [DragoonSubclassId.NINJA, DragoonSubclassId.PHANTOM],
    hpMod: 0.8, manaMod: 1, manaRegenMod: 1.3, speedMod: 1.2,
  },
};

// ---------------------------------------------------------------------------
// Subclass definitions
// ---------------------------------------------------------------------------

export interface SubclassDefinition {
  id: DragoonSubclassId;
  classId: DragoonClassId;
  name: string;
  description: string;
  color: number;
  // Replaces skills at index 3 and 4 (keys 4 and 5)
  replaceSkill4: DragoonSkillId;
  replaceSkill5: DragoonSkillId;
}

export const SUBCLASS_DEFINITIONS: Record<DragoonSubclassId, SubclassDefinition> = {
  [DragoonSubclassId.CHRONOMANCER]: {
    id: DragoonSubclassId.CHRONOMANCER,
    classId: DragoonClassId.ARCANE_MAGE,
    name: "Chronomancer",
    description: "Manipulate time itself. Slow enemies and reverse projectiles.",
    color: 0xcc88ff,
    replaceSkill4: DragoonSkillId.TIME_WARP,
    replaceSkill5: DragoonSkillId.TEMPORAL_LOOP,
  },
  [DragoonSubclassId.VOID_WEAVER]: {
    id: DragoonSubclassId.VOID_WEAVER,
    classId: DragoonClassId.ARCANE_MAGE,
    name: "Void Weaver",
    description: "Command the void. Black holes and shadow duplicates.",
    color: 0x6600aa,
    replaceSkill4: DragoonSkillId.SINGULARITY,
    replaceSkill5: DragoonSkillId.MIRROR_IMAGE,
  },
  [DragoonSubclassId.TEMPEST_LORD]: {
    id: DragoonSubclassId.TEMPEST_LORD,
    classId: DragoonClassId.STORM_RANGER,
    name: "Tempest Lord",
    description: "Become the storm. Screen-wide devastation and lightning armor.",
    color: 0x22aadd,
    replaceSkill4: DragoonSkillId.HURRICANE,
    replaceSkill5: DragoonSkillId.THUNDER_ARMOR,
  },
  [DragoonSubclassId.BEASTMASTER]: {
    id: DragoonSubclassId.BEASTMASTER,
    classId: DragoonClassId.STORM_RANGER,
    name: "Beastmaster",
    description: "Command wolf packs and unleash your eagle's fury.",
    color: 0x88aa66,
    replaceSkill4: DragoonSkillId.WOLF_PACK,
    replaceSkill5: DragoonSkillId.EAGLE_FURY,
  },
  [DragoonSubclassId.DEATH_KNIGHT]: {
    id: DragoonSubclassId.DEATH_KNIGHT,
    classId: DragoonClassId.BLOOD_KNIGHT,
    name: "Death Knight",
    description: "Raise the dead and harvest souls. Kills fuel chain explosions.",
    color: 0x44aa44,
    replaceSkill4: DragoonSkillId.RAISE_DEAD,
    replaceSkill5: DragoonSkillId.SOUL_HARVEST,
  },
  [DragoonSubclassId.PALADIN]: {
    id: DragoonSubclassId.PALADIN,
    classId: DragoonClassId.BLOOD_KNIGHT,
    name: "Paladin",
    description: "Holy warrior. Heal yourself while smiting foes with divine power.",
    color: 0xffdd44,
    replaceSkill4: DragoonSkillId.HOLY_NOVA,
    replaceSkill5: DragoonSkillId.CONSECRATION,
  },
  [DragoonSubclassId.NINJA]: {
    id: DragoonSubclassId.NINJA,
    classId: DragoonClassId.SHADOW_ASSASSIN,
    name: "Ninja",
    description: "Army of shadows. Clone yourself and unleash blade storms.",
    color: 0x8866cc,
    replaceSkill4: DragoonSkillId.SHADOW_CLONE_ARMY,
    replaceSkill5: DragoonSkillId.BLADE_STORM,
  },
  [DragoonSubclassId.PHANTOM]: {
    id: DragoonSubclassId.PHANTOM,
    classId: DragoonClassId.SHADOW_ASSASSIN,
    name: "Phantom",
    description: "Between worlds. Drain souls and become untouchable.",
    color: 0xaa88ff,
    replaceSkill4: DragoonSkillId.SOUL_SIPHON,
    replaceSkill5: DragoonSkillId.PHASE_SHIFT,
  },
};

// ---------------------------------------------------------------------------
// Boss descriptions (for UI / lore display)
// ---------------------------------------------------------------------------

export interface BossDescription {
  name: string;
  displayName: string;
  description: string;
  phases: string[];
  mechanics: string[];
}

export const BOSS_DESCRIPTIONS: Record<string, BossDescription> = {
  [DragoonEnemyType.BOSS_DRAKE]: {
    name: "boss_drake",
    displayName: "Ignis the Fire Drake",
    description: "A lesser dragon fueled by primal flame. Its fiery breath scorches the skies.",
    phases: ["Flame Breath Barrage", "Inferno Dive", "Ember Storm"],
    mechanics: ["Leaves fire trails that linger", "Summons fire sprites as minions"],
  },
  [DragoonEnemyType.BOSS_CHIMERA]: {
    name: "boss_chimera",
    displayName: "The Chimera of Dread",
    description: "A monstrous fusion of lion, goat, and serpent. Each head attacks independently.",
    phases: ["Triple Head Assault", "Poison Serpent Spray", "Berserk Charge"],
    mechanics: ["Three simultaneous bullet patterns", "Poison clouds on death of each head phase"],
  },
  [DragoonEnemyType.BOSS_LICH_KING]: {
    name: "boss_lich_king",
    displayName: "Mordrath the Lich King",
    description: "An undead sorcerer-king who commands legions of spectral warriors.",
    phases: ["Necrotic Barrage", "Soul Drain Vortex", "Spectral Army Summon", "Death Nova"],
    mechanics: ["Raises defeated enemies as allies", "Drains player mana with vortex", "Regenerates HP through soul harvest"],
  },
  [DragoonEnemyType.BOSS_STORM_TITAN]: {
    name: "boss_storm_titan",
    displayName: "Thalassor, Storm Titan",
    description: "A colossal being of living lightning that commands the tempest itself.",
    phases: ["Thunder Barrage", "Lightning Chain Grid", "Eye of the Storm", "Thunderclap Nova"],
    mechanics: ["Creates lightning walls that sweep the screen", "Teleports via lightning bolts", "Shield regenerates when not taking damage"],
  },
  [DragoonEnemyType.BOSS_VOID_SERPENT]: {
    name: "boss_void_serpent",
    displayName: "Nyx, the Void Serpent",
    description: "A world-serpent from the spaces between stars. Reality bends in its presence.",
    phases: ["Void Breath", "Dimensional Rift", "Gravity Well", "Cosmic Annihilation"],
    mechanics: ["Warps bullet trajectories near its body", "Creates void zones that damage over time", "Spawns shadow duplicates of the player"],
  },
  [DragoonEnemyType.BOSS_DRAGON_PENDRAGON]: {
    name: "boss_dragon_pendragon",
    displayName: "Y Ddraig Goch, Dragon of Pendragon",
    description: "The legendary red dragon of Arthurian prophecy, awoken from its slumber beneath Dinas Emrys.",
    phases: ["Regal Fire Breath", "Wing Gust Shockwave", "Pendragon's Fury", "Golden Flame Spiral"],
    mechanics: ["Deploys a golden shield that reflects projectiles", "Summons wyvern minions in V-formations", "Fire breath covers wide arcs"],
  },
  [DragoonEnemyType.BOSS_QUESTING_BEAST]: {
    name: "boss_questing_beast",
    displayName: "Glatisant, the Questing Beast",
    description: "The impossible creature pursued by King Pellinore. Its belly howls like thirty hounds.",
    phases: ["Hound's Howl Barrage", "Serpent Strike Rush", "Stag Leap Assault"],
    mechanics: ["Erratic zigzag movement makes it hard to hit", "Spawns hound-like projectiles that track the player", "Periodically becomes untargetable while leaping"],
  },
  [DragoonEnemyType.BOSS_BLACK_KNIGHT]: {
    name: "boss_black_knight",
    displayName: "The Black Knight of Annwn",
    description: "An indestructible dark knight from the Otherworld. Immune to fear and nearly immune to harm.",
    phases: ["Shield Bash Charge", "Dark Sword Rain", "Impenetrable Guard", "Phantom Army"],
    mechanics: ["Frontal shield blocks all projectiles — must be flanked", "Summons spectral knights that charge in formation", "Regenerates armor plating between phases"],
  },
  [DragoonEnemyType.BOSS_MORGANA_WYRM]: {
    name: "boss_morgana_wyrm",
    displayName: "Morgana's Wyrm, the Fae Serpent",
    description: "A magical wyrm created by Morgan le Fay. It weaves illusions and dark enchantments.",
    phases: ["Illusion Split", "Fae Fire Storm", "Enchantment Web", "Mirror Maze"],
    mechanics: ["Creates illusory copies that also attack", "Hexes the player, reversing controls briefly", "Fires seeking fae-fire orbs that orbit before striking"],
  },
  [DragoonEnemyType.BOSS_GRAIL_GUARDIAN]: {
    name: "boss_grail_guardian",
    displayName: "Seraphiel, Guardian of the Grail",
    description: "The ultimate celestial protector of the Holy Grail. A being of pure radiant light.",
    phases: ["Holy Ray Barrage", "Judgement Pillars", "Radiant Nova", "Grail's Wrath", "Divine Ascension"],
    mechanics: ["Heals itself with Grail radiance", "Creates pillars of light that sweep the arena", "Final phase envelops entire screen in holy fire", "Spawns celestial minions with halos"],
  },
};

// ---------------------------------------------------------------------------
// Subclass skill trees — 4 nodes per subclass, unlocked at levels 5, 10, 15, 20
// ---------------------------------------------------------------------------

export function getSubclassSkillTree(subclassId: DragoonSubclassId): SubclassSkillNode[] {
  const trees: Record<DragoonSubclassId, SubclassSkillNode[]> = {
    [DragoonSubclassId.CHRONOMANCER]: [
      { level: 5,  name: "Temporal Insight",    description: "Enemy bullets move 20% slower",       unlocked: false, skillId: null, statBonus: { speed: 10 } },
      { level: 10, name: "Rewind",              description: "Gain Time Warp ability",              unlocked: false, skillId: DragoonSkillId.TIME_WARP },
      { level: 15, name: "Chronostasis",        description: "+30 max mana, +20% mana regen",       unlocked: false, skillId: null, statBonus: { mana: 30 } },
      { level: 20, name: "Temporal Mastery",     description: "Gain Temporal Loop ability",          unlocked: false, skillId: DragoonSkillId.TEMPORAL_LOOP },
    ],
    [DragoonSubclassId.VOID_WEAVER]: [
      { level: 5,  name: "Void Touched",        description: "+15% damage to all attacks",          unlocked: false, skillId: null, statBonus: { damage: 15 } },
      { level: 10, name: "Event Horizon",       description: "Gain Singularity ability",            unlocked: false, skillId: DragoonSkillId.SINGULARITY },
      { level: 15, name: "Dark Matter",         description: "+25 max HP, attacks pierce +1",       unlocked: false, skillId: null, statBonus: { hp: 25 } },
      { level: 20, name: "Dimensional Rift",    description: "Gain Mirror Image ability",           unlocked: false, skillId: DragoonSkillId.MIRROR_IMAGE },
    ],
    [DragoonSubclassId.TEMPEST_LORD]: [
      { level: 5,  name: "Storm's Edge",        description: "+10% movement speed",                 unlocked: false, skillId: null, statBonus: { speed: 15 } },
      { level: 10, name: "Tempest Rising",      description: "Gain Hurricane ability",              unlocked: false, skillId: DragoonSkillId.HURRICANE },
      { level: 15, name: "Static Charge",       description: "Attacks chain to 1 nearby enemy",     unlocked: false, skillId: null, statBonus: { damage: 10 } },
      { level: 20, name: "Eye of the Storm",    description: "Gain Thunder Armor ability",          unlocked: false, skillId: DragoonSkillId.THUNDER_ARMOR },
    ],
    [DragoonSubclassId.BEASTMASTER]: [
      { level: 5,  name: "Animal Bond",         description: "Hawk Companion lasts 2s longer",      unlocked: false, skillId: null, statBonus: { hp: 15 } },
      { level: 10, name: "Pack Leader",         description: "Gain Wolf Pack ability",              unlocked: false, skillId: DragoonSkillId.WOLF_PACK },
      { level: 15, name: "Primal Fury",         description: "+20% damage when companions active",  unlocked: false, skillId: null, statBonus: { damage: 12 } },
      { level: 20, name: "Alpha Strike",        description: "Gain Eagle Fury ability",             unlocked: false, skillId: DragoonSkillId.EAGLE_FURY },
    ],
    [DragoonSubclassId.DEATH_KNIGHT]: [
      { level: 5,  name: "Necrotic Touch",      description: "Attacks apply a weak DoT",            unlocked: false, skillId: null, statBonus: { damage: 10 } },
      { level: 10, name: "Undead Legion",       description: "Gain Raise Dead ability",             unlocked: false, skillId: DragoonSkillId.RAISE_DEAD },
      { level: 15, name: "Death's Embrace",     description: "+30 max HP, lifesteal on kills",      unlocked: false, skillId: null, statBonus: { hp: 30 } },
      { level: 20, name: "Harvest of Souls",    description: "Gain Soul Harvest ability",           unlocked: false, skillId: DragoonSkillId.SOUL_HARVEST },
    ],
    [DragoonSubclassId.PALADIN]: [
      { level: 5,  name: "Holy Blessing",       description: "+20 max HP, slight passive regen",    unlocked: false, skillId: null, statBonus: { hp: 20 } },
      { level: 10, name: "Smite",               description: "Gain Holy Nova ability",              unlocked: false, skillId: DragoonSkillId.HOLY_NOVA },
      { level: 15, name: "Aura of Protection",  description: "Reduce all damage taken by 10%",      unlocked: false, skillId: null, statBonus: { hp: 15 } },
      { level: 20, name: "Sacred Ground",       description: "Gain Consecration ability",           unlocked: false, skillId: DragoonSkillId.CONSECRATION },
    ],
    [DragoonSubclassId.NINJA]: [
      { level: 5,  name: "Swift Blades",        description: "+15% attack speed",                   unlocked: false, skillId: null, statBonus: { speed: 12 } },
      { level: 10, name: "Kage Bunshin",        description: "Gain Shadow Clones ability",          unlocked: false, skillId: DragoonSkillId.SHADOW_CLONE_ARMY },
      { level: 15, name: "Critical Edge",       description: "+20% crit chance",                    unlocked: false, skillId: null, statBonus: { damage: 15 } },
      { level: 20, name: "Whirlwind",           description: "Gain Blade Storm ability",            unlocked: false, skillId: DragoonSkillId.BLADE_STORM },
    ],
    [DragoonSubclassId.PHANTOM]: [
      { level: 5,  name: "Ethereal Form",       description: "10% dodge chance on all attacks",     unlocked: false, skillId: null, statBonus: { speed: 10 } },
      { level: 10, name: "Life Drain",          description: "Gain Soul Siphon ability",            unlocked: false, skillId: DragoonSkillId.SOUL_SIPHON },
      { level: 15, name: "Spectral Power",      description: "+25 max mana, +15% damage",           unlocked: false, skillId: null, statBonus: { mana: 25, damage: 15 } },
      { level: 20, name: "Between Worlds",      description: "Gain Phase Shift ability",            unlocked: false, skillId: DragoonSkillId.PHASE_SHIFT },
    ],
  };
  return trees[subclassId] ?? [];
}

// ---------------------------------------------------------------------------
// Branching Path definitions — fork points and path configurations
// ---------------------------------------------------------------------------

export const FORK_POINTS: DragoonForkPoint[] = [
  {
    afterWave: 4,
    choices: [
      {
        pathId: DragoonPathId.MOUNTAIN_PASS,
        label: "Mountain Pass",
        description: "Rocky highlands — wyverns and storm hawks guard the peaks",
        color: 0x886644,
        enemyPool: [DragoonEnemyType.WYVERN, DragoonEnemyType.STORM_HAWK, DragoonEnemyType.DARK_CROW, DragoonEnemyType.GROUND_BALLISTA],
        bossType: DragoonEnemyType.BOSS_DRAKE,
        difficultyMod: 1.0,
        bonusScoreMult: 1.0,
      },
      {
        pathId: DragoonPathId.FOREST_CANYON,
        label: "Forest Canyon",
        description: "Dense woodland — shadow bats and dark angels lurk in the canopy",
        color: 0x336622,
        enemyPool: [DragoonEnemyType.SHADOW_BAT, DragoonEnemyType.DARK_ANGEL, DragoonEnemyType.SKY_VIPER, DragoonEnemyType.GROUND_CATAPULT],
        bossType: DragoonEnemyType.BOSS_QUESTING_BEAST,
        difficultyMod: 1.1,
        bonusScoreMult: 1.15,
      },
    ],
  },
  {
    afterWave: 8,
    choices: [
      {
        pathId: DragoonPathId.DARK_FORTRESS,
        label: "Dark Fortress",
        description: "A heavily fortified citadel — siege engines and shield walls",
        color: 0x443333,
        enemyPool: [DragoonEnemyType.GROUND_SIEGE_ENGINE, DragoonEnemyType.GROUND_SHIELD_WALL, DragoonEnemyType.GROUND_MAGE_TOWER, DragoonEnemyType.DARK_FALCON_SQUAD],
        bossType: DragoonEnemyType.BOSS_BLACK_KNIGHT,
        difficultyMod: 1.2,
        bonusScoreMult: 1.25,
      },
      {
        pathId: DragoonPathId.COASTAL_CLIFFS,
        label: "Coastal Cliffs",
        description: "Wind-swept shores — fire sprites and floating eyes patrol the coast",
        color: 0x336688,
        enemyPool: [DragoonEnemyType.FIRE_SPRITE, DragoonEnemyType.FLOATING_EYE, DragoonEnemyType.STORM_HAWK, DragoonEnemyType.GROUND_WAR_CATAPULT],
        bossType: DragoonEnemyType.BOSS_CHIMERA,
        difficultyMod: 1.0,
        bonusScoreMult: 1.1,
      },
    ],
  },
  {
    afterWave: 12,
    choices: [
      {
        pathId: DragoonPathId.VOLCANIC_RIDGE,
        label: "Volcanic Ridge",
        description: "Molten earth — fire sprites and wyverns swarm the lava fields",
        color: 0xaa3300,
        enemyPool: [DragoonEnemyType.FIRE_SPRITE, DragoonEnemyType.WYVERN, DragoonEnemyType.DARK_ANGEL, DragoonEnemyType.GROUND_DARK_MAGE_CIRCLE],
        bossType: DragoonEnemyType.BOSS_DRAGON_PENDRAGON,
        difficultyMod: 1.3,
        bonusScoreMult: 1.35,
      },
      {
        pathId: DragoonPathId.FROZEN_WASTES,
        label: "Frozen Wastes",
        description: "Icy tundra — shadow wraiths and spectral forces haunt the frost",
        color: 0x88ccee,
        enemyPool: [DragoonEnemyType.SHADOW_WRAITH, DragoonEnemyType.FLOATING_EYE, DragoonEnemyType.DARK_ANGEL, DragoonEnemyType.GROUND_SIEGE_ENGINE],
        bossType: DragoonEnemyType.BOSS_LICH_KING,
        difficultyMod: 1.2,
        bonusScoreMult: 1.2,
      },
    ],
  },
  {
    afterWave: 16,
    choices: [
      {
        pathId: DragoonPathId.SHADOW_REALM,
        label: "Shadow Realm",
        description: "The void between worlds — elite wraiths and dark angels",
        color: 0x330066,
        enemyPool: [DragoonEnemyType.SHADOW_WRAITH, DragoonEnemyType.DARK_ANGEL, DragoonEnemyType.FLOATING_EYE, DragoonEnemyType.GROUND_DARK_MAGE_CIRCLE],
        bossType: DragoonEnemyType.BOSS_VOID_SERPENT,
        difficultyMod: 1.5,
        bonusScoreMult: 1.5,
      },
      {
        pathId: DragoonPathId.CELESTIAL_HEIGHTS,
        label: "Celestial Heights",
        description: "The sky realm above the clouds — the final ascent to the Grail",
        color: 0xddaa44,
        enemyPool: [DragoonEnemyType.STORM_HAWK, DragoonEnemyType.DARK_FALCON_SQUAD, DragoonEnemyType.FLOATING_EYE, DragoonEnemyType.GROUND_MAGE_TOWER],
        bossType: DragoonEnemyType.BOSS_GRAIL_GUARDIAN,
        difficultyMod: 1.4,
        bonusScoreMult: 1.4,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Dragon Evolution definitions — stages tied to upgrade thresholds
// ---------------------------------------------------------------------------

export const DRAGON_EVOLUTION_STAGES: DragonEvolutionDef[] = [
  {
    stage: DragonEvolutionStage.HATCHLING,
    name: "Hatchling Eagle",
    description: "A young white eagle, nimble but fragile",
    upgradeThreshold: 0,
    wingSpan: 1.0,
    bodyScale: 1.0,
    armorPlates: 0,
    color: 0xffffff,
    glowColor: 0xaaccff,
    trailEffect: "feather",
    statBonus: { hpMult: 1.0, damageMult: 1.0, speedMult: 1.0 },
  },
  {
    stage: DragonEvolutionStage.FLEDGLING,
    name: "Fledgling Raptor",
    description: "Larger wings, sharper talons — a hint of golden plumage",
    upgradeThreshold: 2000,
    wingSpan: 1.15,
    bodyScale: 1.1,
    armorPlates: 0,
    color: 0xffeedd,
    glowColor: 0xddaa44,
    trailEffect: "feather",
    statBonus: { hpMult: 1.05, damageMult: 1.05, speedMult: 1.02 },
  },
  {
    stage: DragonEvolutionStage.DRAKE,
    name: "War Drake",
    description: "Armored plates emerge along the spine — wings shimmer with energy",
    upgradeThreshold: 6000,
    wingSpan: 1.3,
    bodyScale: 1.25,
    armorPlates: 3,
    color: 0xddccaa,
    glowColor: 0xff8844,
    trailEffect: "ember",
    statBonus: { hpMult: 1.12, damageMult: 1.1, speedMult: 1.0 },
  },
  {
    stage: DragonEvolutionStage.WYRM,
    name: "Storm Wyrm",
    description: "Massive wingspan with crackling lightning — armor plates harden",
    upgradeThreshold: 15000,
    wingSpan: 1.5,
    bodyScale: 1.4,
    armorPlates: 5,
    color: 0xaabbdd,
    glowColor: 0x44aaff,
    trailEffect: "star",
    statBonus: { hpMult: 1.2, damageMult: 1.18, speedMult: 1.05 },
  },
  {
    stage: DragonEvolutionStage.ELDER_DRAGON,
    name: "Elder Dragon",
    description: "Full dragon form — golden armor, blazing aura, and devastating presence",
    upgradeThreshold: 30000,
    wingSpan: 1.7,
    bodyScale: 1.6,
    armorPlates: 8,
    color: 0xffcc44,
    glowColor: 0xffdd88,
    trailEffect: "ember",
    statBonus: { hpMult: 1.3, damageMult: 1.25, speedMult: 1.08 },
  },
  {
    stage: DragonEvolutionStage.ANCIENT_WYRM,
    name: "Ancient Wyrm of Camelot",
    description: "Legendary form — celestial radiance, impervious scales, wings blot the sky",
    upgradeThreshold: 60000,
    wingSpan: 2.0,
    bodyScale: 1.8,
    armorPlates: 12,
    color: 0xffffff,
    glowColor: 0xffd700,
    trailEffect: "star",
    statBonus: { hpMult: 1.5, damageMult: 1.4, speedMult: 1.12 },
  },
];

// ---------------------------------------------------------------------------
// Score Attack Mode — balance constants
// ---------------------------------------------------------------------------

export const ScoreAttackBalance = {
  /** Multiplier increase per consecutive hit */
  CHAIN_INCREMENT: 0.05,
  /** Maximum chain multiplier */
  CHAIN_MAX: 10.0,
  /** Seconds before chain starts decaying after last hit */
  CHAIN_GRACE_PERIOD: 1.5,
  /** Multiplier decay per second once grace period expires */
  CHAIN_DECAY_PER_SEC: 0.5,
  /** Bonus multiplier for perfect wave (no damage taken) */
  PERFECT_WAVE_BONUS: 0.25,
  /** Grace period (seconds) after firing before a "miss" is counted */
  MISS_GRACE_PERIOD: 0.8,
  /** Multiplier penalty on miss (subtracted) */
  MISS_PENALTY: 0.3,
  /** Score attack mode starts at higher difficulty */
  ENEMY_HP_BONUS: 0.15,
  /** Maximum high scores to persist */
  MAX_HIGH_SCORES: 10,
} as const;

// ---------------------------------------------------------------------------
// Environmental Destructible templates
// ---------------------------------------------------------------------------

export interface DestructibleTemplate {
  type: DestructibleType;
  hp: number;
  width: number;
  height: number;
  color: number;
  collapseDuration: number;
  areaDamage: number;
  areaDamageRadius: number;
  scoreValue: number;
  debrisCount: number;
}

export const DESTRUCTIBLE_TEMPLATES: Record<DestructibleType, DestructibleTemplate> = {
  [DestructibleType.BRIDGE]: {
    type: DestructibleType.BRIDGE,
    hp: 80,
    width: 120,
    height: 30,
    color: 0x886644,
    collapseDuration: 1.2,
    areaDamage: 60,
    areaDamageRadius: 100,
    scoreValue: 200,
    debrisCount: 8,
  },
  [DestructibleType.TOWER]: {
    type: DestructibleType.TOWER,
    hp: 120,
    width: 40,
    height: 80,
    color: 0x666677,
    collapseDuration: 1.5,
    areaDamage: 80,
    areaDamageRadius: 80,
    scoreValue: 300,
    debrisCount: 10,
  },
  [DestructibleType.TREE]: {
    type: DestructibleType.TREE,
    hp: 30,
    width: 30,
    height: 50,
    color: 0x336622,
    collapseDuration: 0.8,
    areaDamage: 25,
    areaDamageRadius: 50,
    scoreValue: 50,
    debrisCount: 5,
  },
  [DestructibleType.WALL]: {
    type: DestructibleType.WALL,
    hp: 100,
    width: 80,
    height: 40,
    color: 0x777777,
    collapseDuration: 1.0,
    areaDamage: 50,
    areaDamageRadius: 70,
    scoreValue: 150,
    debrisCount: 7,
  },
  [DestructibleType.BOULDER]: {
    type: DestructibleType.BOULDER,
    hp: 60,
    width: 35,
    height: 35,
    color: 0x555544,
    collapseDuration: 0.6,
    areaDamage: 40,
    areaDamageRadius: 60,
    scoreValue: 100,
    debrisCount: 6,
  },
  [DestructibleType.WATCHTOWER]: {
    type: DestructibleType.WATCHTOWER,
    hp: 150,
    width: 35,
    height: 100,
    color: 0x554433,
    collapseDuration: 1.8,
    areaDamage: 100,
    areaDamageRadius: 90,
    scoreValue: 400,
    debrisCount: 12,
  },
};

/** Which destructible types can appear in each wave tier (indices match WAVE_ENEMY_POOL tiers). */
export const DESTRUCTIBLE_POOL: DestructibleType[][] = [
  // Waves 1-4: simple
  [DestructibleType.TREE, DestructibleType.BOULDER],
  // Waves 5-8
  [DestructibleType.TREE, DestructibleType.BOULDER, DestructibleType.WALL, DestructibleType.BRIDGE],
  // Waves 9-12
  [DestructibleType.TREE, DestructibleType.WALL, DestructibleType.BRIDGE, DestructibleType.TOWER],
  // Waves 13-16
  [DestructibleType.WALL, DestructibleType.BRIDGE, DestructibleType.TOWER, DestructibleType.WATCHTOWER],
  // Waves 17-20
  [DestructibleType.BRIDGE, DestructibleType.TOWER, DestructibleType.WATCHTOWER, DestructibleType.WALL],
];

/** Number of destructibles to spawn per wave. */
export const DESTRUCTIBLES_PER_WAVE_BASE = 2;
export const DESTRUCTIBLES_PER_WAVE_GROWTH = 0.5;
