// ---------------------------------------------------------------------------
// Leviathan — The Deep Descent — state types & factory
// ---------------------------------------------------------------------------

import { LEVIATHAN } from "../config/LeviathanConfig";

export interface Vec3 { x: number; y: number; z: number; }

// ---- Phases ----
export type LeviathanPhase = "menu" | "playing" | "game_over";

// ---- Player ----
export type PlayerAction = "idle" | "swimming" | "sprinting" | "dashing" | "grabbed" | "dead";

export interface LeviathanPlayer {
  pos: Vec3;
  vel: Vec3;
  yaw: number;
  pitch: number;
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  oxygen: number;
  maxOxygen: number;
  action: PlayerAction;
  depth: number;               // current depth (0 = surface, positive = deeper)
  depthLevel: number;          // discrete depth zone 0..DEPTH_LEVELS-1
  // Abilities
  tridentCD: number;
  harpoonCD: number;
  sonarCD: number;
  pressureWaveCD: number;
  lanternFlareCD: number;
  dashCD: number;
  // Active effects
  sonarActive: number;
  lanternFlareTimer: number;
  // Dash
  dashTimer: number;
  dashDir: Vec3;
  invincibleTimer: number;
  // Combo
  combo: number;
  comboTimer: number;
  maxCombo: number;
  comboStep: number;
  comboStepTimer: number;
  // Fragments collected
  fragments: number;
  // Upgrades
  tridentLevel: number;
  armorLevel: number;
  lungLevel: number;           // oxygen capacity
  lanternLevel: number;
  harpoonLevel: number;
  sonarLevel: number;
  // Grabbed state
  grabbedTimer: number;
  grabbedBy: string | null;
  // Blocking
  blocking: boolean;
  // Currency for upgrades
  relicPoints: number;
}

// ---- Upgrades ----
export interface LeviathanUpgrade {
  id: string;
  name: string;
  description: string;
  baseCost: number;
  maxLevel: number;
  field: keyof Pick<LeviathanPlayer,
    "tridentLevel" | "armorLevel" | "lungLevel" | "lanternLevel" | "harpoonLevel" | "sonarLevel">;
}

export const UPGRADES: LeviathanUpgrade[] = [
  { id: "trident", name: "Abyssal Trident", description: "+20% melee damage, +0.5 range", baseCost: 2, maxLevel: 4, field: "tridentLevel" },
  { id: "armor", name: "Pressure Suit", description: "+15 HP, +8% DR", baseCost: 3, maxLevel: 4, field: "armorLevel" },
  { id: "lung", name: "Deep Lungs", description: "-12% oxygen drain, +10 max O2", baseCost: 2, maxLevel: 4, field: "lungLevel" },
  { id: "lantern", name: "Enchanted Lantern", description: "+3m light range", baseCost: 2, maxLevel: 3, field: "lanternLevel" },
  { id: "harpoon", name: "Forged Harpoon", description: "+25% harpoon damage", baseCost: 3, maxLevel: 3, field: "harpoonLevel" },
  { id: "sonar", name: "Echo Mastery", description: "+20% sonar radius, -1s CD", baseCost: 2, maxLevel: 3, field: "sonarLevel" },
];

export function getUpgradeCost(upg: LeviathanUpgrade, currentLevel: number): number {
  return Math.ceil(upg.baseCost * Math.pow(LEVIATHAN.UPGRADE_COST_SCALE, currentLevel));
}

// ---- Enemies ----
export type EnemyType = "angler" | "jellyfish" | "coral_golem" | "tentacle" | "siren" | "abyssal_knight";

export type EnemyBehavior = "idle" | "approaching" | "attacking" | "charging" | "stunned" | "dead" | "lurking";

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
  revealed: boolean;           // sonar-revealed
  revealTimer: number;
  aggroed: boolean;
  colorVariant: number;
  hitFlash: number;
  bobPhase: number;
  glowIntensity: number;       // bioluminescent glow
  // Type-specific
  fireCD: number;
  slamCD: number;
  chargeCD: number;
  chargeTimer: number;
  chargeDir: Vec3;
  grabTimer: number;           // tentacle grab active
  shockCD: number;             // jellyfish shock
  spawnCD: number;             // boss spawns
  bossPhase: number;
  knockbackVel: Vec3;
  knockbackTimer: number;
}

// ---- Air Pockets ----
export interface AirPocket {
  pos: Vec3;
  radius: number;
  bubblePhase: number;
}

// ---- Excalibur Fragments ----
export interface ExcaliburFragment {
  pos: Vec3;
  collected: boolean;
  glowPhase: number;
  depthLevel: number;
}

// ---- Underwater Currents ----
export interface Current {
  startPos: Vec3;
  endPos: Vec3;
  width: number;
  speed: number;
  direction: Vec3;             // normalized
}

// ---- Cathedral Decoration ----
export interface CathedralPillar {
  pos: Vec3;
  height: number;
  broken: boolean;
  leanAngle: number;
}

export interface CoralCluster {
  pos: Vec3;
  size: number;
  type: "brain" | "fan" | "tube" | "fire";
  glowColor: number;
}

export interface Ruin {
  pos: Vec3;
  size: number;
  type: "arch" | "wall" | "altar" | "statue" | "chest";
  rotation: number;
}

// ---- Particles ----
export interface LeviathanParticle {
  pos: Vec3;
  vel: Vec3;
  life: number;
  maxLife: number;
  color: number;
  size: number;
  type: "bubble" | "debris" | "blood" | "glow" | "spark" | "ink" | "silt" | "trail";
}

// ---- Projectiles ----
export type ProjectileOwner = "player" | "enemy";
export interface Projectile {
  id: string;
  pos: Vec3;
  vel: Vec3;
  damage: number;
  life: number;
  type: "harpoon" | "siren_bolt" | "ink_cloud";
  owner: ProjectileOwner;
  ownerId: string;
}

// ---- Damage Numbers ----
export interface DamageNumber {
  pos: Vec3;
  value: number;
  timer: number;
  color: number;
  crit: boolean;
}

// ---- Relic Shards (pickups) ----
export interface RelicShard {
  pos: Vec3;
  vel: Vec3;
  life: number;
  hpRestore: number;
  oxygenRestore: number;
}

// ---- Environmental Hazards ----
export interface AbyssalVent {
  pos: Vec3;
  radius: number;
  damage: number;
  active: boolean;
  pulsePhase: number;
}

export interface PoisonCloud {
  pos: Vec3;
  radius: number;
  damage: number;
  timer: number;
  vel: Vec3;
}

export interface BioMine {
  pos: Vec3;
  radius: number;
  damage: number;
  armed: boolean;
  glowPhase: number;
}

// ---- Notifications ----
export interface LeviathanNotification {
  text: string;
  timer: number;
  color: number;
}

// ---- Sonar Ping ----
export interface SonarPing {
  pos: Vec3;
  radius: number;
  maxRadius: number;
  timer: number;
}

export interface GameStats {
  damageDealt: number;
  damageTaken: number;
  oxygenUsed: number;
  deepestDepth: number;
  abilitiesUsed: number;
}

// ---- Main State ----
export interface LeviathanState {
  phase: LeviathanPhase;
  tick: number;
  gameTime: number;
  paused: boolean;
  hitStopTimer: number;
  hitStopScale: number;
  // Core entities
  player: LeviathanPlayer;
  enemies: Map<string, Enemy>;
  airPockets: AirPocket[];
  fragments: ExcaliburFragment[];
  currents: Current[];
  cathedralPillars: CathedralPillar[];
  corals: CoralCluster[];
  ruins: Ruin[];
  // Active effects
  sonarPings: SonarPing[];
  // Visual
  particles: LeviathanParticle[];
  notifications: LeviathanNotification[];
  damageNumbers: DamageNumber[];
  relicShards: RelicShard[];
  projectiles: Projectile[];
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
  stats: GameStats;
  deathSequenceTimer: number;
  screenFlash: { color: string; intensity: number; timer: number };
  // Boss
  bossId: string | null;
  bossSpawned: boolean;
  // Victory
  victory: boolean;
  escaping: boolean;             // surfacing phase after collecting all fragments
  // Upgrade UI
  upgradeMenuOpen: boolean;
  nearAltar: boolean;            // near a ruin of type "altar"
  // Environmental hazards
  vents: AbyssalVent[];
  poisonClouds: PoisonCloud[];
  mines: BioMine[];
  // Depth zone tracking
  lastDepthLevel: number;
  totalKills: number;
  // Fragment milestones
  milestoneReached: number;   // highest milestone triggered (0, 3, 5)
  // Escape timer
  escapeTimer: number;        // seconds remaining to escape (0 = no limit)
  // Charged attack
  chargeHoldTimer: number;    // how long LMB held for heavy attack
  // Ambient
  ambientParticleTimer: number;
  // Difficulty
  difficulty: "easy" | "normal" | "hard" | "nightmare";
}

// ---- Factory ----

function generateAirPockets(): AirPocket[] {
  const pockets: AirPocket[] = [];
  for (let i = 0; i < LEVIATHAN.AIR_POCKET_COUNT; i++) {
    const depth = (i / LEVIATHAN.AIR_POCKET_COUNT) * LEVIATHAN.MAX_DEPTH * 0.8;
    pockets.push({
      pos: {
        x: (Math.random() - 0.5) * LEVIATHAN.CATHEDRAL_WIDTH * 0.7,
        y: -depth,
        z: (Math.random() - 0.5) * 30,
      },
      radius: LEVIATHAN.AIR_POCKET_RADIUS,
      bubblePhase: Math.random() * Math.PI * 2,
    });
  }
  return pockets;
}

function generateFragments(): ExcaliburFragment[] {
  const frags: ExcaliburFragment[] = [];
  for (let i = 0; i < LEVIATHAN.FRAGMENT_COUNT; i++) {
    const depthLevel = Math.floor((i / LEVIATHAN.FRAGMENT_COUNT) * LEVIATHAN.DEPTH_LEVELS);
    const depth = (depthLevel + 0.5) * LEVIATHAN.DEPTH_ZONE_SIZE;
    frags.push({
      pos: {
        x: (Math.random() - 0.5) * LEVIATHAN.CATHEDRAL_WIDTH * 0.6,
        y: -depth,
        z: (Math.random() - 0.5) * 25,
      },
      collected: false,
      glowPhase: Math.random() * Math.PI * 2,
      depthLevel,
    });
  }
  return frags;
}

function generateCurrents(): Current[] {
  const currents: Current[] = [];
  for (let i = 0; i < LEVIATHAN.CURRENT_COUNT; i++) {
    const depth = -((i + 0.5) / LEVIATHAN.CURRENT_COUNT) * LEVIATHAN.MAX_DEPTH;
    const angle = Math.random() * Math.PI * 2;
    const dir = { x: Math.cos(angle), y: (Math.random() - 0.5) * 0.3, z: Math.sin(angle) };
    const len = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z);
    currents.push({
      startPos: { x: (Math.random() - 0.5) * 40, y: depth, z: (Math.random() - 0.5) * 20 },
      endPos: { x: (Math.random() - 0.5) * 40, y: depth + (Math.random() - 0.5) * 10, z: (Math.random() - 0.5) * 20 },
      width: LEVIATHAN.CURRENT_WIDTH,
      speed: LEVIATHAN.CURRENT_SPEED_BOOST,
      direction: { x: dir.x / len, y: dir.y / len, z: dir.z / len },
    });
  }
  return currents;
}

function generateCathedralPillars(): CathedralPillar[] {
  const pillars: CathedralPillar[] = [];
  const hw = LEVIATHAN.CATHEDRAL_WIDTH / 2;
  for (let i = 0; i < LEVIATHAN.PILLAR_COUNT; i++) {
    const row = Math.floor(i / 2);
    const side = i % 2 === 0 ? -1 : 1;
    const depth = -(row / (LEVIATHAN.PILLAR_COUNT / 2)) * LEVIATHAN.MAX_DEPTH;
    pillars.push({
      pos: { x: side * (hw * 0.7), y: depth, z: (Math.random() - 0.5) * 6 },
      height: 15 + Math.random() * 10,
      broken: Math.random() < 0.3,
      leanAngle: (Math.random() - 0.5) * 0.3,
    });
  }
  return pillars;
}

function generateCorals(): CoralCluster[] {
  const corals: CoralCluster[] = [];
  const types: CoralCluster["type"][] = ["brain", "fan", "tube", "fire"];
  const colors = [0x44ffaa, 0xff44aa, 0x44aaff, 0xffaa44, 0xaa44ff];
  for (let i = 0; i < LEVIATHAN.CORAL_COUNT; i++) {
    corals.push({
      pos: {
        x: (Math.random() - 0.5) * LEVIATHAN.CATHEDRAL_WIDTH,
        y: -(Math.random() * LEVIATHAN.MAX_DEPTH),
        z: (Math.random() - 0.5) * 30,
      },
      size: 0.5 + Math.random() * 2,
      type: types[Math.floor(Math.random() * types.length)],
      glowColor: colors[Math.floor(Math.random() * colors.length)],
    });
  }
  return corals;
}

function generateRuins(): Ruin[] {
  const ruins: Ruin[] = [];
  const types: Ruin["type"][] = ["arch", "wall", "altar", "statue", "chest"];
  for (let i = 0; i < LEVIATHAN.RUIN_COUNT; i++) {
    ruins.push({
      pos: {
        x: (Math.random() - 0.5) * LEVIATHAN.CATHEDRAL_WIDTH * 0.8,
        y: -(Math.random() * LEVIATHAN.MAX_DEPTH),
        z: (Math.random() - 0.5) * 25,
      },
      size: 1 + Math.random() * 3,
      type: types[Math.floor(Math.random() * types.length)],
      rotation: Math.random() * Math.PI * 2,
    });
  }
  return ruins;
}

function generateVents(): AbyssalVent[] {
  const vents: AbyssalVent[] = [];
  for (let i = 0; i < 6; i++) {
    const depth = -(30 + (i / 6) * (LEVIATHAN.MAX_DEPTH - 30));
    vents.push({
      pos: {
        x: (Math.random() - 0.5) * LEVIATHAN.CATHEDRAL_WIDTH * 0.6,
        y: depth,
        z: (Math.random() - 0.5) * 15,
      },
      radius: 3 + Math.random() * 2,
      damage: 5 + i * 2,
      active: true,
      pulsePhase: Math.random() * Math.PI * 2,
    });
  }
  return vents;
}

function generateMines(): BioMine[] {
  const mines: BioMine[] = [];
  for (let i = 0; i < 10; i++) {
    mines.push({
      pos: {
        x: (Math.random() - 0.5) * LEVIATHAN.CATHEDRAL_WIDTH * 0.7,
        y: -(20 + Math.random() * (LEVIATHAN.MAX_DEPTH - 20)),
        z: (Math.random() - 0.5) * 20,
      },
      radius: 2,
      damage: 20 + Math.floor(i / 3) * 5,
      armed: true,
      glowPhase: Math.random() * Math.PI * 2,
    });
  }
  return mines;
}

export function createLeviathanState(sw: number, sh: number): LeviathanState {
  return {
    phase: "menu",
    tick: 0,
    gameTime: 0,
    paused: false,
    hitStopTimer: 0,
    hitStopScale: 1,
    player: {
      pos: { x: 0, y: -2, z: 0 },
      vel: { x: 0, y: 0, z: 0 },
      yaw: 0,
      pitch: 0,
      hp: LEVIATHAN.MAX_HP,
      maxHp: LEVIATHAN.MAX_HP,
      stamina: LEVIATHAN.STAMINA_MAX,
      maxStamina: LEVIATHAN.STAMINA_MAX,
      oxygen: LEVIATHAN.OXYGEN_MAX,
      maxOxygen: LEVIATHAN.OXYGEN_MAX,
      action: "idle",
      depth: 2,
      depthLevel: 0,
      tridentCD: 0, harpoonCD: 0, sonarCD: 0, pressureWaveCD: 0, lanternFlareCD: 0, dashCD: 0,
      sonarActive: 0, lanternFlareTimer: 0,
      dashTimer: 0, dashDir: { x: 0, y: 0, z: 0 }, invincibleTimer: 0,
      combo: 0, comboTimer: 0, maxCombo: 0, comboStep: 0, comboStepTimer: 0,
      fragments: 0,
      tridentLevel: 0, armorLevel: 0, lungLevel: 0, lanternLevel: 0, harpoonLevel: 0, sonarLevel: 0,
      grabbedTimer: 0, grabbedBy: null,
      blocking: false,
      relicPoints: 0,
    },
    enemies: new Map(),
    airPockets: generateAirPockets(),
    fragments: generateFragments(),
    currents: generateCurrents(),
    cathedralPillars: generateCathedralPillars(),
    corals: generateCorals(),
    ruins: generateRuins(),
    sonarPings: [],
    particles: [],
    notifications: [],
    damageNumbers: [],
    relicShards: [],
    projectiles: [],
    screenW: sw,
    screenH: sh,
    keys: new Set(),
    mouseX: 0, mouseY: 0,
    mouseDown: false, rightMouseDown: false,
    nextId: 1,
    pointerLocked: false,
    mouseDX: 0, mouseDY: 0,
    screenShake: 0, screenShakeIntensity: 0,
    stats: { damageDealt: 0, damageTaken: 0, oxygenUsed: 0, deepestDepth: 0, abilitiesUsed: 0 },
    deathSequenceTimer: 0,
    screenFlash: { color: "transparent", intensity: 0, timer: 0 },
    bossId: null,
    bossSpawned: false,
    victory: false,
    escaping: false,
    upgradeMenuOpen: false,
    nearAltar: false,
    vents: generateVents(),
    poisonClouds: [],
    mines: generateMines(),
    lastDepthLevel: 0,
    totalKills: 0,
    milestoneReached: 0,
    escapeTimer: 0,
    chargeHoldTimer: 0,
    ambientParticleTimer: 0,
    difficulty: "normal",
  };
}

export function genLeviathanId(state: LeviathanState): string {
  return `lev_${state.nextId++}`;
}
