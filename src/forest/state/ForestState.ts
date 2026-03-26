// ---------------------------------------------------------------------------
// Forest of Camelot — state types & factory
// ---------------------------------------------------------------------------

import { FOREST } from "../config/ForestConfig";

export interface Vec3 { x: number; y: number; z: number; }

// ---- Phases ----
export type ForestPhase =
  | "menu"
  | "playing"
  | "intermission"   // between waves — upgrade & heal
  | "game_over";

// ---- Seasons ----
export type Season = "spring" | "summer" | "autumn" | "winter";
export type SeasonTransition = "active" | "transitioning";

// ---- Player ----
export type PlayerAction =
  | "idle"
  | "walking"
  | "sprinting"
  | "dodging"
  | "root_travelling"
  | "casting"
  | "dead";

export interface ForestPlayer {
  pos: Vec3;
  vel: Vec3;
  yaw: number;
  pitch: number;
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  action: PlayerAction;
  onGround: boolean;
  // Abilities
  vineSnareCD: number;
  thornBarrageCD: number;
  leafStormCD: number;
  rootCrushCD: number;
  staffCD: number;
  rootTravelCD: number;
  // Active effects
  leafStormTimer: number;
  leafStormTickTimer: number;
  rootTravelTimer: number;         // time in root network
  rootTravelTarget: Vec3 | null;
  rootCrushPending: number;        // delay before crush triggers
  rootCrushPos: Vec3 | null;
  // Dodge
  dodgeCD: number;
  dodgeTimer: number;
  dodgeDir: Vec3;
  invincibleTimer: number;
  // Combo
  combo: number;
  comboTimer: number;
  maxCombo: number;
  // Resources
  essence: number;
  // Upgrades
  staffLevel: number;
  armorLevel: number;
  speedLevel: number;
  thornLevel: number;
  rootLevel: number;
  groveLevel: number;
  wispLevel: number;
  // Staff combo chain
  staffComboStep: number;      // 0-2 for 3-hit combo
  staffComboTimer: number;     // window to continue combo
  // Kill streak
  killStreak: number;
  killStreakTimer: number;
  // Purification
  purifyingGroveIdx: number;   // -1 = not purifying
  // Block
  blocking: boolean;
  blockTimer: number;
}

// ---- Enemies ----
export type EnemyType =
  | "blightling"
  | "rot_archer"
  | "bark_golem"
  | "shadow_stag"
  | "blight_mother"
  | "wisp_corruptor"
  | "corruption_avatar";

export type EnemyBehavior =
  | "approaching"
  | "attacking"
  | "chasing"
  | "charging"
  | "leaping"
  | "casting"
  | "retreating"
  | "stunned"
  | "dead";

export interface Enemy {
  id: string;
  type: EnemyType;
  pos: Vec3;
  vel: Vec3;
  rotation: number;
  hp: number;
  maxHp: number;
  damage: number;
  speed: number;
  behavior: EnemyBehavior;
  attackTimer: number;
  stunTimer: number;
  deathTimer: number;
  target: "oak" | "grove" | "player";
  targetGroveIdx: number;
  flying: boolean;
  colorVariant: number;
  hitFlash: number;
  bobPhase: number;
  // Type-specific
  fireCD: number;           // rot_archer
  chargeCD: number;         // bark_golem
  chargeTimer: number;
  chargeDir: Vec3;
  leapCD: number;           // shadow_stag
  leapTimer: number;
  slamCD: number;           // blight_mother
  spawnCD: number;           // blight_mother
  healCD: number;            // wisp_corruptor
  snaredTimer: number;       // vine snare slow
  // Boss phase (blight_mother)
  bossPhase: number;           // 0, 1, 2
  spitCD: number;
  // Knockback
  knockbackVel: Vec3;
  knockbackTimer: number;
}

// ---- Great Oak ----
export interface GreatOak {
  hp: number;
  maxHp: number;
}

// ---- Sacred Groves ----
export type GroveStatus = "pure" | "contested" | "corrupted";

export interface SacredGrove {
  pos: Vec3;
  hp: number;
  maxHp: number;
  status: GroveStatus;
  purifyProgress: number;   // 0-1, player stands in range to purify
}

// ---- Root Nodes (fast travel) ----
export interface RootNode {
  pos: Vec3;
  active: boolean;          // unlocked for travel
  glowPhase: number;
}

// ---- Will-o-Wisp Allies ----
export interface WispAlly {
  id: string;
  pos: Vec3;
  vel: Vec3;
  hp: number;
  maxHp: number;
  attackTimer: number;
  targetId: string | null;
  bobPhase: number;
}

// ---- Particles ----
export interface ForestParticle {
  pos: Vec3;
  vel: Vec3;
  life: number;
  maxLife: number;
  color: number;
  size: number;
  type: "leaf" | "petal" | "ember" | "snow" | "spore" | "root" | "blight" | "heal" | "impact" | "trail";
}

// ---- Floating damage numbers ----
export interface DamageNumber {
  pos: Vec3;
  value: number;
  timer: number;
  color: number;
  crit: boolean;
}

// ---- Essence Orbs ----
export interface EssenceOrb {
  pos: Vec3;
  vel: Vec3;
  value: number;
  life: number;
  attracted: boolean;
}

// ---- Heal Sap ----
export interface HealSap {
  pos: Vec3;
  vel: Vec3;
  heal: number;
  life: number;
}

// ---- Projectiles ----
export type ProjectileOwner = "player" | "enemy";
export interface Projectile {
  id: string;
  pos: Vec3;
  vel: Vec3;
  damage: number;
  life: number;
  type: "thorn" | "rot_arrow" | "blight_spit";
  owner: ProjectileOwner;
  ownerId: string;
}

// ---- Spawn Queue ----
export interface SpawnEntry {
  type: EnemyType;
  delay: number;
  targetGroveIdx: number;   // -1 = target oak
}

// ---- Wave Modifiers ----
export type WaveModifier = "none" | "blood_blight" | "deep_fog" | "swarm" | "frostbite" | "wildfire";
export type Difficulty = "easy" | "normal" | "hard" | "nightmare";

export interface GameStats {
  damageDealt: number;
  damageTaken: number;
  oakDamage: number;
  grovesLost: number;
  essenceEarned: number;
  abilitiesUsed: number;
}

export const WAVE_MODIFIER_NAMES: Record<WaveModifier, string> = {
  none: "",
  blood_blight: "BLOOD BLIGHT",
  deep_fog: "DEEP FOG",
  swarm: "SWARM",
  frostbite: "FROSTBITE",
  wildfire: "WILDFIRE",
};

export const WAVE_MODIFIER_COLORS: Record<WaveModifier, number> = {
  none: 0xffffff,
  blood_blight: 0xcc2233,
  deep_fog: 0x667788,
  swarm: 0xcc4433,
  frostbite: 0x88ccff,
  wildfire: 0xff6622,
};

// ---- Wave Objectives ----
export type ObjectiveType = "kills" | "no_damage" | "speed_clear" | "grove_defense" | "parry_kills";

export interface WaveObjective {
  description: string;
  type: ObjectiveType;
  progress: number;
  target: number;
  reward: number;
  active: boolean;
  timer: number;  // time limit for speed objectives
}

// ---- Challenge Types ----
export type ChallengeType = "normal" | "elite_rush" | "boss_duel" | "grove_siege" | "blitz";

export const CHALLENGE_NAMES: Record<ChallengeType, string> = {
  normal: "",
  elite_rush: "ELITE RUSH",
  boss_duel: "BOSS DUEL",
  grove_siege: "GROVE SIEGE",
  blitz: "BLITZ",
};

export const CHALLENGE_DESCS: Record<ChallengeType, string> = {
  normal: "",
  elite_rush: "Swarms of fast Shadow Stags!",
  boss_duel: "Face a powerful Blight Mother alone!",
  grove_siege: "All groves under heavy attack!",
  blitz: "30 seconds — kill everything!",
};

// ---- Buffs (chosen after wave clear) ----
export type BuffId = "iron_bark" | "thorn_aura" | "swift_roots" | "essence_bloom" | "verdant_fury" | "stone_heart" | "wild_growth";

export interface ActiveBuff {
  id: BuffId;
  name: string;
  description: string;
  duration: number;     // -1 = permanent
  remaining: number;    // ticks remaining (duration * 100), -1 = permanent
}

export const BUFF_POOL: { id: BuffId; name: string; description: string; duration: number }[] = [
  { id: "iron_bark", name: "Iron Bark", description: "+20% damage reduction", duration: -1 },
  { id: "thorn_aura", name: "Thorn Aura", description: "Enemies near you take 3 dmg/s", duration: 3 },
  { id: "swift_roots", name: "Swift Roots", description: "+25% move speed", duration: 2 },
  { id: "essence_bloom", name: "Essence Bloom", description: "+50% essence drops", duration: 2 },
  { id: "verdant_fury", name: "Verdant Fury", description: "+35% damage dealt", duration: 2 },
  { id: "stone_heart", name: "Stone Heart", description: "+40 max HP", duration: -1 },
  { id: "wild_growth", name: "Wild Growth", description: "Groves regen 5 HP/s", duration: 3 },
];

// ---- Notifications ----
export interface ForestNotification {
  text: string;
  timer: number;
  color: number;
}

// ---- Upgrades ----
export interface Upgrade {
  id: string;
  name: string;
  description: string;
  baseCost: number;
  maxLevel: number;
  field: keyof Pick<ForestPlayer,
    "staffLevel" | "armorLevel" | "speedLevel" | "thornLevel" | "rootLevel" | "groveLevel" | "wispLevel">;
}

export const UPGRADES: Upgrade[] = [
  { id: "staff", name: "Ironwood Staff", description: "+25% melee damage. Lv3: staff hits restore 1 essence", baseCost: 3, maxLevel: 4, field: "staffLevel" },
  { id: "armor", name: "Bark Skin", description: "+12 HP, +8% DR. Lv3: parry window +0.15s", baseCost: 4, maxLevel: 4, field: "armorLevel" },
  { id: "speed", name: "Swift Root", description: "+12% speed, +10 stamina. Lv3: dodge spawns thorns", baseCost: 3, maxLevel: 4, field: "speedLevel" },
  { id: "thorn", name: "Piercing Thorns", description: "+30% thorn dmg, +2 projectiles. Lv3: thorns pierce", baseCost: 5, maxLevel: 4, field: "thornLevel" },
  { id: "root", name: "Deep Roots", description: "+25% crush radius & dmg. Lv3: crush generates essence", baseCost: 5, maxLevel: 4, field: "rootLevel" },
  { id: "grove", name: "Grove Warden", description: "Groves +2 HP/s, +30 HP. Lv3: pure groves buff damage +5%", baseCost: 4, maxLevel: 3, field: "groveLevel" },
  { id: "wisp", name: "Wisp Bond", description: "+1 max wisp, +30% wisp dmg. Lv3: wisps heal you 1HP/s", baseCost: 4, maxLevel: 3, field: "wispLevel" },
];

export function getUpgradeCost(upg: Upgrade, currentLevel: number): number {
  return Math.ceil(upg.baseCost * Math.pow(FOREST.UPGRADE_COST_SCALE, currentLevel));
}

// ---- Decorative Trees ----
export interface ForestTree {
  pos: Vec3;
  height: number;
  radius: number;
  type: "oak" | "pine" | "birch" | "willow";
  corrupted: boolean;
  swayPhase: number;
}

// ---- Main State ----
export interface ForestState {
  phase: ForestPhase;
  tick: number;
  gameTime: number;
  wave: number;
  waveTimer: number;
  phaseTimer: number;
  waveModifier: WaveModifier;
  paused: boolean;
  hitStopTimer: number;
  hitStopScale: number;
  // Season
  season: Season;
  seasonTimer: number;
  seasonTransition: SeasonTransition;
  transitionTimer: number;
  nextSeason: Season;
  // Core entities
  player: ForestPlayer;
  enemies: Map<string, Enemy>;
  greatOak: GreatOak;
  groves: SacredGrove[];
  rootNodes: RootNode[];
  wispAllies: WispAlly[];
  trees: ForestTree[];
  // Visual
  particles: ForestParticle[];
  notifications: ForestNotification[];
  damageNumbers: DamageNumber[];
  essenceOrbs: EssenceOrb[];
  healSaps: HealSap[];
  projectiles: Projectile[];
  spawnQueue: SpawnEntry[];
  spawnTimer: number;
  // Corruption
  corruption: number;         // 0-1, how blighted the forest is
  // Stats
  enemiesKilled: number;
  totalKills: number;
  bestWave: number;
  // Screen
  screenW: number;
  screenH: number;
  // Input
  keys: Set<string>;
  mouseX: number;
  mouseY: number;
  mouseDown: boolean;
  rightMouseDown: boolean;
  nextId: number;
  pointerLocked: boolean;
  mouseDX: number;
  mouseDY: number;
  screenShake: number;
  screenShakeIntensity: number;
  difficulty: Difficulty;
  stats: GameStats;
  deathSequenceTimer: number;
  screenFlash: { color: string; intensity: number; timer: number };
  waveTitle: { text: string; timer: number; color: string };
  // Pending visual events
  pendingRootCrush: { x: number; z: number } | null;
  pendingLeafStormPos: Vec3 | null;
  pendingVineSnarePos: Vec3 | null;
  // Wave modifier effect timers
  wildfireDotTimer: number;
  // Enemy count tracking
  aliveEnemyCount: number;
  // Pending visual effects (for renderer)
  pendingBossRoar: boolean;
  pendingPurifyGroveIdx: number;   // -1 = none
  // Leaf storm active position (follows player)
  leafStormActive: boolean;
  // Wave objective
  objective: WaveObjective;
  // Challenge type
  challengeType: ChallengeType;
  // Buff selection
  activeBuffs: ActiveBuff[];
  buffChoices: { id: BuffId; name: string; description: string; duration: number }[];
  buffSelectActive: boolean;
  // Grove threat indicators
  groveUnderAttack: number[];  // indices of groves being attacked
  // Time survived
  timeSurvived: number;
  // Ambient timer (dt-based particle spawning)
  ambientParticleTimer: number;
}

// ---- Factory ----

function generateGroves(): SacredGrove[] {
  const groves: SacredGrove[] = [];
  const spread = FOREST.GROVE_SPREAD;
  const positions = [
    { x: spread, y: 0, z: 0 },
    { x: -spread, y: 0, z: 0 },
    { x: 0, y: 0, z: spread },
    { x: 0, y: 0, z: -spread },
  ];
  for (const pos of positions) {
    const status: GroveStatus = "pure";
    groves.push({
      pos,
      hp: FOREST.GROVE_HP,
      maxHp: FOREST.GROVE_HP,
      status,
      purifyProgress: status === "pure" ? 1 : 0,
    });
  }
  return groves;
}

function generateRootNodes(): RootNode[] {
  const nodes: RootNode[] = [];
  // One at center (Great Oak), one at each grove, plus some extra
  nodes.push({ pos: { x: 0, y: 0, z: 0 }, active: true, glowPhase: 0 });
  const spread = FOREST.GROVE_SPREAD;
  const positions = [
    { x: spread, y: 0, z: 0 },
    { x: -spread, y: 0, z: 0 },
    { x: 0, y: 0, z: spread },
    { x: 0, y: 0, z: -spread },
    { x: spread * 0.6, y: 0, z: spread * 0.6 },
    { x: -spread * 0.6, y: 0, z: -spread * 0.6 },
  ];
  for (let i = 0; i < positions.length; i++) {
    nodes.push({ pos: positions[i], active: true, glowPhase: Math.random() * Math.PI * 2 });
  }
  return nodes;
}

function generateTrees(): ForestTree[] {
  const trees: ForestTree[] = [];
  const types: ForestTree["type"][] = ["oak", "pine", "birch", "willow"];
  const half = FOREST.GROUND_SIZE / 2;
  for (let i = 0; i < FOREST.TREE_COUNT; i++) {
    const x = (Math.random() - 0.5) * (half * 1.8);
    const z = (Math.random() - 0.5) * (half * 1.8);
    // Don't place too close to center or groves
    const distCenter = Math.sqrt(x * x + z * z);
    if (distCenter < 12) continue;
    let tooCloseToGrove = false;
    const spread = FOREST.GROVE_SPREAD;
    const grovePositions = [
      { x: spread, z: 0 }, { x: -spread, z: 0 },
      { x: 0, z: spread }, { x: 0, z: -spread },
    ];
    for (const gp of grovePositions) {
      const dx = x - gp.x, dz = z - gp.z;
      if (Math.sqrt(dx * dx + dz * dz) < 8) { tooCloseToGrove = true; break; }
    }
    if (tooCloseToGrove) continue;
    trees.push({
      pos: { x, y: 0, z },
      height: 6 + Math.random() * 10,
      radius: 0.8 + Math.random() * 1.5,
      type: types[Math.floor(Math.random() * types.length)],
      corrupted: false,
      swayPhase: Math.random() * Math.PI * 2,
    });
  }
  return trees;
}

export function createForestState(sw: number, sh: number): ForestState {
  return {
    phase: "menu",
    tick: 0,
    gameTime: 0,
    wave: 0,
    waveTimer: 0,
    phaseTimer: 0,
    waveModifier: "none",
    paused: false,
    hitStopTimer: 0,
    hitStopScale: 1,
    season: "spring",
    seasonTimer: FOREST.SPRING_DURATION,
    seasonTransition: "active",
    transitionTimer: 0,
    nextSeason: "summer",
    player: {
      pos: { x: 0, y: 0, z: -15 },
      vel: { x: 0, y: 0, z: 0 },
      yaw: 0,
      pitch: 0,
      hp: FOREST.MAX_HP,
      maxHp: FOREST.MAX_HP,
      stamina: FOREST.STAMINA_MAX,
      maxStamina: FOREST.STAMINA_MAX,
      action: "idle",
      onGround: true,
      vineSnareCD: 0,
      thornBarrageCD: 0,
      leafStormCD: 0,
      rootCrushCD: 0,
      staffCD: 0,
      rootTravelCD: 0,
      leafStormTimer: 0,
      leafStormTickTimer: 0,
      rootTravelTimer: 0,
      rootTravelTarget: null,
      rootCrushPending: 0,
      rootCrushPos: null,
      dodgeCD: 0,
      dodgeTimer: 0,
      dodgeDir: { x: 0, y: 0, z: 0 },
      invincibleTimer: 0,
      combo: 0,
      comboTimer: 0,
      maxCombo: 0,
      essence: 0,
      staffLevel: 0,
      armorLevel: 0,
      speedLevel: 0,
      thornLevel: 0,
      rootLevel: 0,
      groveLevel: 0,
      wispLevel: 0,
      staffComboStep: 0,
      staffComboTimer: 0,
      killStreak: 0,
      killStreakTimer: 0,
      purifyingGroveIdx: -1,
      blocking: false,
      blockTimer: 0,
    },
    enemies: new Map(),
    greatOak: {
      hp: FOREST.GREAT_OAK_HP,
      maxHp: FOREST.GREAT_OAK_HP,
    },
    groves: generateGroves(),
    rootNodes: generateRootNodes(),
    wispAllies: [],
    trees: generateTrees(),
    particles: [],
    notifications: [],
    damageNumbers: [],
    essenceOrbs: [],
    healSaps: [],
    projectiles: [],
    spawnQueue: [],
    spawnTimer: 0,
    corruption: 0,
    enemiesKilled: 0,
    totalKills: 0,
    bestWave: 0,
    screenW: sw,
    screenH: sh,
    keys: new Set(),
    mouseX: 0,
    mouseY: 0,
    mouseDown: false,
    rightMouseDown: false,
    nextId: 1,
    pointerLocked: false,
    mouseDX: 0,
    mouseDY: 0,
    screenShake: 0,
    screenShakeIntensity: 0,
    difficulty: "normal",
    stats: { damageDealt: 0, damageTaken: 0, oakDamage: 0, grovesLost: 0, essenceEarned: 0, abilitiesUsed: 0 },
    deathSequenceTimer: 0,
    screenFlash: { color: "transparent", intensity: 0, timer: 0 },
    waveTitle: { text: "", timer: 0, color: "#fff" },
    pendingRootCrush: null,
    pendingLeafStormPos: null,
    pendingVineSnarePos: null,
    wildfireDotTimer: 0,
    aliveEnemyCount: 0,
    pendingBossRoar: false,
    pendingPurifyGroveIdx: -1,
    leafStormActive: false,
    objective: { description: "", type: "kills", progress: 0, target: 0, reward: 0, active: false, timer: 0 },
    challengeType: "normal",
    activeBuffs: [],
    buffChoices: [],
    buffSelectActive: false,
    groveUnderAttack: [],
    timeSurvived: 0,
    ambientParticleTimer: 0,
  };
}

export function genForestId(state: ForestState): string {
  return `fst_${state.nextId++}`;
}
