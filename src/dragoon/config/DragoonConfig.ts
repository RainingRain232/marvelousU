// ---------------------------------------------------------------------------
// Panzer Dragoon mode — balance config, enemy definitions, skill definitions
// ---------------------------------------------------------------------------

import { DragoonClassId, DragoonEnemyType, DragoonSkillId, DragoonSubclassId, EnemyPattern } from "../state/DragoonState";

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

  SUBCLASS_LEVEL: 20,
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
  [DragoonEnemyType.DARK_CROW, DragoonEnemyType.SHADOW_BAT, DragoonEnemyType.WYVERN, DragoonEnemyType.FIRE_SPRITE, DragoonEnemyType.GROUND_CATAPULT, DragoonEnemyType.SKY_VIPER, DragoonEnemyType.DARK_FALCON_SQUAD],
  // Waves 9-12
  [DragoonEnemyType.WYVERN, DragoonEnemyType.FIRE_SPRITE, DragoonEnemyType.STORM_HAWK, DragoonEnemyType.FLOATING_EYE, DragoonEnemyType.GROUND_CATAPULT, DragoonEnemyType.GROUND_BALLISTA, DragoonEnemyType.SKY_VIPER, DragoonEnemyType.DARK_FALCON_SQUAD],
  // Waves 13-16
  [DragoonEnemyType.STORM_HAWK, DragoonEnemyType.FLOATING_EYE, DragoonEnemyType.DARK_ANGEL, DragoonEnemyType.GROUND_MAGE_TOWER, DragoonEnemyType.GROUND_BALLISTA, DragoonEnemyType.SHADOW_WRAITH],
  // Waves 17-20
  [DragoonEnemyType.DARK_ANGEL, DragoonEnemyType.FLOATING_EYE, DragoonEnemyType.STORM_HAWK, DragoonEnemyType.WYVERN, DragoonEnemyType.GROUND_MAGE_TOWER, DragoonEnemyType.SHADOW_WRAITH],
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
};

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
