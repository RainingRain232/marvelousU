// ---------------------------------------------------------------------------
// Gargoyle: Cathedral Guardian — state types & factory
// ---------------------------------------------------------------------------

import { GARG } from "../config/GargoyleConfig";

export interface Vec3 { x: number; y: number; z: number; }

// ---- Phases ----
export type GargoylePhase =
  | "menu"
  | "night"
  | "dawn"
  | "day"
  | "dusk"
  | "game_over";

// ---- Player ----
export type GargoyleAction =
  | "perched"
  | "flying"
  | "diving"
  | "gliding"
  | "frozen";

export interface GargoylePlayer {
  pos: Vec3;
  vel: Vec3;
  yaw: number;
  pitch: number;
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  action: GargoyleAction;
  diveBombCD: number;
  stoneBreathCD: number;
  wingGustCD: number;
  talonCD: number;
  consecrateCD: number;
  attacking: boolean;
  attackTimer: number;
  invincibleTimer: number;
  combo: number;
  comboTimer: number;
  maxCombo: number;
  soulEssence: number;
  talonLevel: number;
  armorLevel: number;
  wingLevel: number;
  breathLevel: number;
  diveBombLevel: number;
  fortifyLevel: number;
  consecrateLevel: number;
  // Perch buff
  perchBonus: string;
  perchBuffTimer: number;
  perchBuffType: "tower" | "wall" | "spire" | "none";
  // Dash
  dashCD: number;
  dashTimer: number;
  dashDir: Vec3;
  stoneSkinCD: number;
  stoneSkinTimer: number;
}

// ---- Demons ----
export type DemonType = "imp" | "fiend" | "brute" | "wraith" | "hellion" | "necromancer";

export type DemonBehavior =
  | "approaching"
  | "climbing"
  | "attacking"
  | "chasing"
  | "charging"     // brute charge attack
  | "casting"      // necromancer resurrect
  | "retreating"   // low HP flee
  | "stunned"
  | "dead";

export interface Demon {
  id: string;
  type: DemonType;
  pos: Vec3;
  vel: Vec3;
  rotation: number;
  hp: number;
  maxHp: number;
  damage: number;
  speed: number;
  behavior: DemonBehavior;
  attackTimer: number;
  stunTimer: number;
  deathTimer: number;
  targetY: number;
  flying: boolean;
  colorVariant: number;
  hitFlash: number;
  bobPhase: number;
  slamCD: number;
  fireCD: number;
  // Fiend fireball
  fireballCD: number;
  // Brute charge
  chargeCD: number;
  chargeTimer: number;
  chargeDir: Vec3;
  // Necromancer
  resurrectCD: number;
  castTimer: number;
}

// ---- Cathedral ----
export interface PerchPoint {
  pos: Vec3;
  occupied: boolean;
}

export interface Cathedral {
  hp: number;
  maxHp: number;
  perchPoints: PerchPoint[];
}

// ---- Particles ----
export interface GargoyleParticle {
  pos: Vec3;
  vel: Vec3;
  life: number;
  maxLife: number;
  color: number;
  size: number;
  type: "soul" | "stone" | "fire" | "impact" | "debris" | "portal" | "speed_line" | "trail" | "holy" | "heal";
}

// ---- Floating damage numbers ----
export interface DamageNumber {
  pos: Vec3;
  value: number;
  timer: number;
  color: number;
  crit: boolean;
}

// ---- Soul Orbs ----
export interface SoulOrb {
  pos: Vec3;
  vel: Vec3;
  value: number;
  life: number;
  attracted: boolean;
}

// ---- Health Orbs ----
export interface HealthOrb {
  pos: Vec3;
  vel: Vec3;
  heal: number;
  life: number;
}

// ---- Projectiles (fiend fireballs) ----
export interface Projectile {
  id: string;
  pos: Vec3;
  vel: Vec3;
  damage: number;
  life: number;
  type: "fireball";
  ownerId: string;
}

// ---- Spawn Queue ----
export interface SpawnEntry {
  type: DemonType;
  delay: number;
}

// ---- Wave Modifiers ----
export type WaveModifier = "none" | "blood_moon" | "fog_night" | "siege" | "swarm" | "spirit";
export type Difficulty = "easy" | "normal" | "hard" | "nightmare";

export interface GameStats {
  damageDealt: number;
  damageTaken: number;
  cathedralDamage: number;
  closeKills: number;
  soulsEarned: number;
  abilitiesUsed: number;
}

export const WAVE_MODIFIER_NAMES: Record<WaveModifier, string> = {
  none: "",
  blood_moon: "BLOOD MOON",
  fog_night: "FOG NIGHT",
  siege: "SIEGE NIGHT",
  swarm: "SWARM NIGHT",
  spirit: "SPIRIT NIGHT",
};

export const WAVE_MODIFIER_COLORS: Record<WaveModifier, number> = {
  none: 0xffffff,
  blood_moon: 0xff2222,
  fog_night: 0x88aacc,
  siege: 0xcc8822,
  swarm: 0xcc4433,
  spirit: 0x6644aa,
};

// ---- Notifications ----
export interface GargoyleNotification {
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
  field: keyof Pick<GargoylePlayer,
    "talonLevel" | "armorLevel" | "wingLevel" | "breathLevel" | "diveBombLevel" | "fortifyLevel" | "consecrateLevel">;
}

export const UPGRADES: Upgrade[] = [
  { id: "talon", name: "Razor Talons", description: "+25% talon damage", baseCost: 3, maxLevel: 4, field: "talonLevel" },
  { id: "armor", name: "Stone Hide", description: "+10% DR, +15 HP", baseCost: 4, maxLevel: 4, field: "armorLevel" },
  { id: "wing", name: "Mighty Wings", description: "+15% speed, +10 stamina", baseCost: 3, maxLevel: 4, field: "wingLevel" },
  { id: "breath", name: "Gorgon Breath", description: "+1s petrify, +20% range", baseCost: 5, maxLevel: 4, field: "breathLevel" },
  { id: "divebomb", name: "Meteor Strike", description: "+30% dive damage & radius", baseCost: 5, maxLevel: 4, field: "diveBombLevel" },
  { id: "fortify", name: "Fortify", description: "Repair +25 cathedral HP/night", baseCost: 4, maxLevel: 3, field: "fortifyLevel" },
  { id: "consecrate", name: "Consecrate", description: "R: holy AoE burst (unlocks)", baseCost: 6, maxLevel: 3, field: "consecrateLevel" },
];

export function getUpgradeCost(upg: Upgrade, currentLevel: number): number {
  return Math.ceil(upg.baseCost * Math.pow(GARG.UPGRADE_COST_SCALE, currentLevel));
}

// ---- Main State ----
export interface WaveObjective {
  description: string;
  progress: number;
  target: number;
  reward: number;
  active: boolean;
  type: "kills" | "no_damage" | "speed_kills" | "close_kills";
  timer: number;
}

export interface GargoyleState {
  phase: GargoylePhase;
  tick: number;
  gameTime: number;
  wave: number;
  waveTimer: number;
  phaseTimer: number;
  waveModifier: WaveModifier;
  paused: boolean;
  hitStopTimer: number;
  hitStopScale: number;
  objective: WaveObjective;
  tutorialTips: string[];
  tutorialShown: boolean;
  player: GargoylePlayer;
  demons: Map<string, Demon>;
  cathedral: Cathedral;
  particles: GargoyleParticle[];
  notifications: GargoyleNotification[];
  damageNumbers: DamageNumber[];
  soulOrbs: SoulOrb[];
  healthOrbs: HealthOrb[];
  projectiles: Projectile[];
  spawnQueue: SpawnEntry[];
  spawnTimer: number;
  demonsKilled: number;
  totalKills: number;
  bestWave: number;
  screenW: number;
  screenH: number;
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
  bellTriggered: boolean[];
  reinforcementTimer: number;
  // Visual event triggers (consumed by renderer each frame)
  pendingCraters: { x: number; z: number }[];
  pendingConsecrateRing: boolean;
  deathSequenceTimer: number;
  // Screen edge flashes (consumed by HUD)
  screenFlash: { color: string; intensity: number; timer: number };
  // Wave title card
  waveTitle: { text: string; timer: number; color: string };
  // Pending visual events for renderer
  pendingGustRing: boolean;
  pendingBreathCone: { yaw: number; pitch: number; range: number } | null;
}

// ---- Factory ----

function generatePerchPoints(): PerchPoint[] {
  const points: PerchPoint[] = [];
  const hw = GARG.CATHEDRAL_WIDTH / 2;
  const hl = GARG.CATHEDRAL_LENGTH / 2;
  const h = GARG.CATHEDRAL_HEIGHT;
  const th = GARG.TOWER_HEIGHT;

  points.push({ pos: { x: 0, y: h + 2, z: -hl + 5 }, occupied: false });
  points.push({ pos: { x: 0, y: h + 2, z: 0 }, occupied: false });
  points.push({ pos: { x: 0, y: h + 2, z: hl - 5 }, occupied: false });
  points.push({ pos: { x: -hw, y: th, z: -hl }, occupied: false });
  points.push({ pos: { x: hw, y: th, z: -hl }, occupied: false });
  points.push({ pos: { x: -hw, y: th, z: hl }, occupied: false });
  points.push({ pos: { x: hw, y: th, z: hl }, occupied: false });
  points.push({ pos: { x: -hw - 1, y: h * 0.7, z: -8 }, occupied: false });
  points.push({ pos: { x: hw + 1, y: h * 0.7, z: -8 }, occupied: false });
  points.push({ pos: { x: -hw - 1, y: h * 0.7, z: 8 }, occupied: false });
  points.push({ pos: { x: hw + 1, y: h * 0.7, z: 8 }, occupied: false });
  points.push({ pos: { x: 0, y: GARG.SPIRE_HEIGHT, z: -hl + 2 }, occupied: false });

  return points;
}

export function createGargoyleState(sw: number, sh: number): GargoyleState {
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
    objective: { description: "", progress: 0, target: 0, reward: 0, active: false, type: "kills", timer: 0 },
    tutorialTips: [],
    tutorialShown: false,
    player: {
      pos: { x: 0, y: GARG.SPIRE_HEIGHT, z: -18 },
      vel: { x: 0, y: 0, z: 0 },
      yaw: 0,
      pitch: 0,
      hp: GARG.MAX_HP,
      maxHp: GARG.MAX_HP,
      stamina: GARG.STAMINA_MAX,
      maxStamina: GARG.STAMINA_MAX,
      action: "perched",
      diveBombCD: 0,
      stoneBreathCD: 0,
      wingGustCD: 0,
      talonCD: 0,
      consecrateCD: 0,
      attacking: false,
      attackTimer: 0,
      invincibleTimer: 0,
      combo: 0,
      comboTimer: 0,
      maxCombo: 0,
      soulEssence: 0,
      talonLevel: 0,
      armorLevel: 0,
      wingLevel: 0,
      breathLevel: 0,
      diveBombLevel: 0,
      fortifyLevel: 0,
      consecrateLevel: 0,
      perchBonus: "",
      perchBuffTimer: 0,
      perchBuffType: "none",
      dashCD: 0,
      dashTimer: 0,
      dashDir: { x: 0, y: 0, z: 0 },
      stoneSkinCD: 0,
      stoneSkinTimer: 0,
    },
    demons: new Map(),
    cathedral: {
      hp: GARG.CATHEDRAL_HP,
      maxHp: GARG.CATHEDRAL_HP,
      perchPoints: generatePerchPoints(),
    },
    particles: [],
    notifications: [],
    damageNumbers: [],
    soulOrbs: [],
    healthOrbs: [],
    projectiles: [],
    spawnQueue: [],
    spawnTimer: 0,
    demonsKilled: 0,
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
    stats: { damageDealt: 0, damageTaken: 0, cathedralDamage: 0, closeKills: 0, soulsEarned: 0, abilitiesUsed: 0 },
    bellTriggered: [false, false, false],
    reinforcementTimer: GARG.REINFORCEMENT_CHECK_INTERVAL,
    pendingCraters: [],
    pendingConsecrateRing: false,
    deathSequenceTimer: 0,
    screenFlash: { color: "transparent", intensity: 0, timer: 0 },
    waveTitle: { text: "", timer: 0, color: "#fff" },
    pendingGustRing: false,
    pendingBreathCone: null,
  };
}

export function genGargoyleId(state: GargoyleState): string {
  return `garg_${state.nextId++}`;
}
