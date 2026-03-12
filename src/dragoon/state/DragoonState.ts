// ---------------------------------------------------------------------------
// Panzer Dragoon mode — game state
// ---------------------------------------------------------------------------

import type { Vec2 } from "@/types";

// ---------------------------------------------------------------------------
// Skill definitions
// ---------------------------------------------------------------------------

export enum DragoonSkillId {
  ARCANE_BOLT = "arcane_bolt",       // Basic rapid-fire magic bolt
  STARFALL = "starfall",             // Homing star projectiles
  THUNDERSTORM = "thunderstorm",     // AoE lightning strike at cursor
  FROST_NOVA = "frost_nova",         // Radial slow + damage burst
  METEOR_SHOWER = "meteor_shower",   // Heavy damage rain from above
  DIVINE_SHIELD = "divine_shield",   // Holy barrier blocks all damage
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

  player: DragoonPlayer;
  enemies: DragoonEnemy[];
  projectiles: DragoonProjectile[];
  explosions: DragoonExplosion[];
  particles: DragoonParticle[];
  pickups: DragoonPickup[];

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

    player: {
      position: { x: screenW * 0.3, y: screenH * 0.5 },
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
    },

    enemies: [],
    projectiles: [],
    explosions: [],
    particles: [],
    pickups: [],

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
  };
}
