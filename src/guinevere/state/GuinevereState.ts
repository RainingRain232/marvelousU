// ---------------------------------------------------------------------------
// Guinevere: The Astral Garden — state types & factory
// ---------------------------------------------------------------------------

import { GUIN } from "../config/GuinevereConfig";

export interface Vec3 { x: number; y: number; z: number; }

// ---- ID ----
let _nextId = 1;
export function genGuinId(): number { return _nextId++; }

// ---- Phases ----
export type GuineverePhase =
  | "menu"
  | "day"
  | "dusk"
  | "night"
  | "dawn"
  | "game_over";

// ---- Seed Types ----
export type SeedType = (typeof GUIN.SEED_TYPES)[number];

// ---- Plants ----
export interface GardenPlant {
  id: number;
  type: SeedType;
  pos: Vec3;
  growthStage: number;   // 0=seed, 1=sprout, 2=bloom, 3=radiant
  growthTimer: number;   // time until next stage
  hp: number;
  maxHp: number;
  harvestReady: boolean;
  withering: boolean;
  glowIntensity: number; // for rendering
  bobPhase: number;
  // Sentinel
  awakened: boolean;
  sentinelTimer: number;
}

// ---- Player ----
export interface GuineverePlayer {
  pos: Vec3;
  vel: Vec3;
  yaw: number;
  pitch: number;
  hp: number;
  maxHp: number;
  stamina: number;
  grounded: boolean;
  essence: number;       // starlight essence (currency)
  totalEssence: number;
  selectedSeed: SeedType;
  planting: boolean;
  plantTimer: number;
  harvesting: boolean;
  harvestTimer: number;
  harvestTarget: number; // plant id
  combo: number;
  comboTimer: number;
  hitFlash: number;
  invincibleTimer: number;
  // Dodge
  dodgeTimer: number;
  dodgeCooldown: number;
  dodgeDir: Vec3;
  // Perfect dodge
  perfectDodgeTimer: number;   // buff active timer
  perfectDodgeDamageMult: number;
  // Celestial convergence
  celestialCd: number;
  celestialActive: number;     // duration of active burst
  celestialReady: boolean;     // true when all 5 plant types blooming
  // Charged moonbeam
  moonbeamCharging: boolean;
  moonbeamChargeTime: number;    // 0 to CHARGE_TIME
  // Abilities
  moonbeamCd: number;
  thornWallCd: number;
  blossomBurstCd: number;
  rootBindCd: number;
  auroraShieldCd: number;
  auroraShieldHp: number;
  auroraShieldTimer: number;
  // Upgrades
  moonbeamLevel: number;
  thornLevel: number;
  blossomLevel: number;
  rootLevel: number;
  shieldLevel: number;
  gardenLevel: number;   // increases max plants + growth speed
  harvestLevel: number;  // increases harvest yield
}

// ---- Enemies ----
export type EnemyType = "wisp" | "crawler" | "stag" | "moth" | "shambler" | "wither_lord";
export type EnemyBehavior = "approaching" | "attacking" | "chasing" | "charging" | "casting" | "stunned" | "rooted" | "dead";

export interface GuinevereEnemy {
  id: number;
  type: EnemyType;
  pos: Vec3;
  vel: Vec3;
  yaw: number;
  hp: number;
  maxHp: number;
  damage: number;
  speed: number;
  behavior: EnemyBehavior;
  attackTimer: number;
  stunTimer: number;
  rootTimer: number;
  deathTimer: number;
  hitFlash: number;
  flying: boolean;
  bobPhase: number;
  targetPlant: number;  // plant id being targeted, -1 for player
  // Stag charge
  chargeCd: number;
  chargeTimer: number;
  chargeDir: Vec3;
  // Moth projectile
  projectileCd: number;
  // Wither Lord
  slamCd: number;
  blightCd: number;
  bossPhase: number;
  spawnTimer: number;
  elite: boolean;
}

// ---- Thorn Wall ----
export interface ThornWall {
  id: number;
  pos: Vec3;
  yaw: number;
  hp: number;
  maxHp: number;
  life: number;
}

// ---- Projectiles ----
export interface Projectile {
  id: number;
  pos: Vec3;
  vel: Vec3;
  damage: number;
  life: number;
  fromEnemy: boolean;
  type: "moonbeam" | "blight_bolt" | "moth_spit";
}

// ---- Particles ----
export interface GuinevereParticle {
  pos: Vec3;
  vel: Vec3;
  life: number;
  maxLife: number;
  color: number;
  size: number;
  type: "petal" | "star" | "frost" | "essence" | "root" | "aurora" | "wither" | "moonlight" | "impact";
}

// ---- Damage Numbers ----
export interface DamageNumber {
  pos: Vec3;
  value: number;
  timer: number;
  color: number;
  crit: boolean;
}

// ---- Notifications ----
export interface GuinevereNotification {
  text: string;
  timer: number;
  color: string;
}

// ---- Garden Island ----
export interface GardenIsland {
  id: number;
  pos: Vec3;      // center position
  radius: number;
  unlocked: boolean;
  plants: number[]; // plant ids on this island
}

// ---- Wave Modifiers ----
export type WaveModifier = "none" | "frost_storm" | "void_tide" | "blight_rain" | "starfall" | "eclipse";

export const WAVE_MODIFIER_NAMES: Record<WaveModifier, string> = {
  none: "",
  frost_storm: "FROST STORM",
  void_tide: "VOID TIDE",
  blight_rain: "BLIGHT RAIN",
  starfall: "STARFALL",
  eclipse: "ECLIPSE",
};

export const WAVE_MODIFIER_COLORS: Record<WaveModifier, string> = {
  none: "#ffffff",
  frost_storm: "#88ddff",
  void_tide: "#8844cc",
  blight_rain: "#44aa44",
  starfall: "#ffd700",
  eclipse: "#ff4466",
};

export type Difficulty = "easy" | "normal" | "hard" | "nightmare";

// ---- Artifacts ----
export type ArtifactType =
  | "starlight_crown"     // +15% essence from all sources
  | "thornheart"          // thorn walls last 50% longer
  | "moonstone_ring"      // moonbeam +30% damage, -20% cooldown
  | "void_pendant"        // void lily synergy range doubled
  | "crystal_veil"        // +20 max HP, +5% HP regen
  | "bloom_scepter"       // blossom burst +40% radius
  | "root_anchor"         // root bind +2s duration
  | "aurora_mantle"       // aurora shield +40% HP, starts regen
  | "fury_seed"           // +15% damage when below 30% HP
  | "garden_heart";       // plants grow 30% faster

export const ARTIFACT_INFO: Record<ArtifactType, { name: string; desc: string; color: string; icon: string }> = {
  starlight_crown:  { name: "Starlight Crown",  desc: "+15% essence from all sources",          color: "#ffd700", icon: "👑" },
  thornheart:       { name: "Thornheart",        desc: "Thorn walls last 50% longer",            color: "#44aa44", icon: "🌿" },
  moonstone_ring:   { name: "Moonstone Ring",    desc: "+30% moonbeam damage, -20% cooldown",    color: "#88ccff", icon: "💍" },
  void_pendant:     { name: "Void Pendant",      desc: "Void lily synergy range doubled",        color: "#aa44ff", icon: "🔮" },
  crystal_veil:     { name: "Crystal Veil",      desc: "+20 max HP, +5% HP regen",               color: "#88ffaa", icon: "🛡" },
  bloom_scepter:    { name: "Bloom Scepter",     desc: "Blossom burst +40% radius",              color: "#ff88cc", icon: "🌸" },
  root_anchor:      { name: "Root Anchor",       desc: "Root bind +2s duration",                 color: "#66cc44", icon: "⚓" },
  aurora_mantle:    { name: "Aurora Mantle",      desc: "Aurora shield +40% HP, slow regen",      color: "#44ccff", icon: "✨" },
  fury_seed:        { name: "Fury Seed",         desc: "+15% damage when below 30% HP",          color: "#ff4444", icon: "🔥" },
  garden_heart:     { name: "Garden Heart",      desc: "Plants grow 30% faster",                 color: "#44ff88", icon: "💚" },
};

export interface ArtifactDrop {
  id: number;
  type: ArtifactType;
  pos: Vec3;
  bobPhase: number;
  life: number;
}

// ---- Attack Telegraphs ----
export interface AttackTelegraph {
  pos: Vec3;
  radius: number;
  timer: number;
  maxTimer: number;
  color: string;
}

// ---- Upgrades ----
export interface Upgrade {
  id: string;
  name: string;
  description: string;
  baseCost: number;
  maxLevel: number;
  field: keyof Pick<GuineverePlayer,
    "moonbeamLevel" | "thornLevel" | "blossomLevel" | "rootLevel" | "shieldLevel" | "gardenLevel" | "harvestLevel">;
}

export const UPGRADES: Upgrade[] = [
  { id: "moonbeam", name: "Lunar Focus", description: "+25% moonbeam damage", baseCost: 8, maxLevel: 4, field: "moonbeamLevel" },
  { id: "thorn", name: "Ironwood Thorns", description: "+30% thorn wall HP & damage", baseCost: 10, maxLevel: 3, field: "thornLevel" },
  { id: "blossom", name: "Radiant Bloom", description: "+20% burst radius & heal", baseCost: 12, maxLevel: 3, field: "blossomLevel" },
  { id: "root", name: "Deep Roots", description: "+1s bind duration, +15% radius", baseCost: 10, maxLevel: 3, field: "rootLevel" },
  { id: "shield", name: "Prismatic Ward", description: "+30 shield HP, +10% reflect", baseCost: 12, maxLevel: 3, field: "shieldLevel" },
  { id: "garden", name: "Green Thumb", description: "+4 max plants, +15% growth speed", baseCost: 8, maxLevel: 3, field: "gardenLevel" },
  { id: "harvest", name: "Bountiful Harvest", description: "+25% harvest yield", baseCost: 6, maxLevel: 4, field: "harvestLevel" },
];

export function getUpgradeCost(upg: Upgrade, currentLevel: number): number {
  return Math.ceil(upg.baseCost * Math.pow(GUIN.UPGRADE_COST_SCALE, currentLevel));
}

// ---- Game Stats ----
export interface GameStats {
  damageDealt: number;
  damageTaken: number;
  plantsGrown: number;
  plantsLost: number;
  essenceHarvested: number;
  enemiesKilled: number;
}

// ---- Main State ----
export interface GuinevereState {
  phase: GuineverePhase;
  tick: number;
  gameTime: number;
  wave: number;
  waveTimer: number;
  waveModifier: WaveModifier;
  paused: boolean;
  difficulty: Difficulty;

  // Day/night cycle
  cycleTime: number;    // current position in cycle (0 to CYCLE_DURATION)
  isNight: boolean;
  dayNightBlend: number; // 0=full day, 1=full night (for rendering)

  // Player
  player: GuineverePlayer;

  // Garden
  plants: Map<number, GardenPlant>;
  islands: GardenIsland[];
  currentIsland: number;

  // Enemies
  enemies: GuinevereEnemy[];
  spawnQueue: { type: EnemyType; delay: number }[];
  spawnTimer: number;

  // Thorn walls
  thornWalls: ThornWall[];

  // Projectiles
  projectiles: Projectile[];

  // Effects
  particles: GuinevereParticle[];
  damageNumbers: DamageNumber[];
  notifications: GuinevereNotification[];
  screenShake: number;
  hitStopTimer: number;
  hitStopScale: number;
  screenFlash: { color: string; intensity: number; timer: number };
  waveTitle: { text: string; timer: number; color: string };

  // Pending visual events
  pendingBlossomBurst: { x: number; z: number } | null;
  pendingRootBind: { x: number; z: number } | null;
  pendingAuroraFlash: boolean;
  pendingMoonbeam: { x: number; z: number; dx: number; dz: number; range: number } | null;
  pendingCelestialBurst: boolean;
  pendingBossEntrance: boolean;
  pendingPerfectDodge: boolean;

  // Death sequence
  deathSequenceTimer: number;
  slowMotionTimer: number;
  slowMotionScale: number;

  // Artifacts
  artifacts: ArtifactType[];          // collected artifacts
  artifactDrops: ArtifactDrop[];      // on-ground pickups
  pendingArtifactPickup: ArtifactType | null;

  // Attack telegraphs
  telegraphs: AttackTelegraph[];

  // Wave countdown
  waveCountdown: number;              // seconds until next wave spawns

  // Synergy zones (computed each tick for renderer)
  activeSynergies: { type: SeedType; pos: Vec3; radius: number }[];

  // Stats
  totalKills: number;
  bestWave: number;
  stats: GameStats;

  // Input
  screenW: number;
  screenH: number;
  keys: Set<string>;
  mouseX: number;
  mouseY: number;
  mouseDown: boolean;
  rightMouseDown: boolean;
  mouseDX: number;
  mouseDY: number;
  pointerLocked: boolean;
}

// ---- Factory ----

function generateIslands(): GardenIsland[] {
  const islands: GardenIsland[] = [];
  // Central island
  islands.push({ id: 0, pos: { x: 0, y: 0, z: 0 }, radius: GUIN.ISLAND_RADIUS, unlocked: true, plants: [] });
  // 4 surrounding islands connected by bridges
  const dist = GUIN.ISLAND_RADIUS * 2 + GUIN.BRIDGE_LENGTH;
  islands.push({ id: 1, pos: { x: dist, y: 0, z: 0 }, radius: GUIN.ISLAND_RADIUS * 0.8, unlocked: false, plants: [] });
  islands.push({ id: 2, pos: { x: -dist, y: 0, z: 0 }, radius: GUIN.ISLAND_RADIUS * 0.8, unlocked: false, plants: [] });
  islands.push({ id: 3, pos: { x: 0, y: 0, z: dist }, radius: GUIN.ISLAND_RADIUS * 0.8, unlocked: false, plants: [] });
  islands.push({ id: 4, pos: { x: 0, y: 0, z: -dist }, radius: GUIN.ISLAND_RADIUS * 0.8, unlocked: false, plants: [] });
  return islands;
}

export function createGuinevereState(sw: number, sh: number): GuinevereState {
  return {
    phase: "menu",
    tick: 0,
    gameTime: 0,
    wave: 0,
    waveTimer: 0,
    waveModifier: "none",
    paused: false,
    difficulty: "normal",

    cycleTime: 0,
    isNight: false,
    dayNightBlend: 0,

    player: {
      pos: { x: 0, y: 1, z: 0 },
      vel: { x: 0, y: 0, z: 0 },
      yaw: 0,
      pitch: 0,
      hp: GUIN.MAX_HP,
      maxHp: GUIN.MAX_HP,
      stamina: GUIN.STAMINA_MAX,
      grounded: true,
      essence: 20,
      totalEssence: 0,
      selectedSeed: "crystal_rose",
      planting: false,
      plantTimer: 0,
      harvesting: false,
      harvestTimer: 0,
      harvestTarget: -1,
      combo: 0,
      comboTimer: 0,
      hitFlash: 0,
      invincibleTimer: 0,
      dodgeTimer: 0,
      dodgeCooldown: 0,
      dodgeDir: { x: 0, y: 0, z: 0 },
      perfectDodgeTimer: 0,
      perfectDodgeDamageMult: 1,
      celestialCd: 0,
      celestialActive: 0,
      celestialReady: false,
      moonbeamCharging: false,
      moonbeamChargeTime: 0,
      moonbeamCd: 0,
      thornWallCd: 0,
      blossomBurstCd: 0,
      rootBindCd: 0,
      auroraShieldCd: 0,
      auroraShieldHp: 0,
      auroraShieldTimer: 0,
      moonbeamLevel: 0,
      thornLevel: 0,
      blossomLevel: 0,
      rootLevel: 0,
      shieldLevel: 0,
      gardenLevel: 0,
      harvestLevel: 0,
    },

    plants: new Map(),
    islands: generateIslands(),
    currentIsland: 0,

    enemies: [],
    spawnQueue: [],
    spawnTimer: 0,
    thornWalls: [],
    projectiles: [],

    particles: [],
    damageNumbers: [],
    notifications: [],
    screenShake: 0,
    hitStopTimer: 0,
    hitStopScale: 0.1,
    screenFlash: { color: "transparent", intensity: 0, timer: 0 },
    waveTitle: { text: "", timer: 0, color: "#fff" },
    pendingBlossomBurst: null,
    pendingRootBind: null,
    pendingAuroraFlash: false,
    pendingMoonbeam: null,
    pendingCelestialBurst: false,
    pendingBossEntrance: false,
    pendingPerfectDodge: false,
    pendingArtifactPickup: null,
    artifacts: [],
    artifactDrops: [],
    telegraphs: [],
    waveCountdown: 0,
    deathSequenceTimer: 0,
    slowMotionTimer: 0,
    slowMotionScale: 1,
    activeSynergies: [],

    totalKills: 0,
    bestWave: 0,
    stats: { damageDealt: 0, damageTaken: 0, plantsGrown: 0, plantsLost: 0, essenceHarvested: 0, enemiesKilled: 0 },

    screenW: sw,
    screenH: sh,
    keys: new Set(),
    mouseX: 0,
    mouseY: 0,
    mouseDown: false,
    rightMouseDown: false,
    mouseDX: 0,
    mouseDY: 0,
    pointerLocked: false,
  };
}
