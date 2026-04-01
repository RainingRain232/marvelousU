// ---------------------------------------------------------------------------
// Owls: Night Hunter — state types & factory
// ---------------------------------------------------------------------------

import { OWL } from "../config/OwlsConfig";

// --- Phase ---
export type OwlsPhase = "menu" | "hunting" | "rest" | "game_over";

// --- Prey ---
export type PreyType = "mouse" | "vole" | "rabbit" | "frog" | "moth";
export type PreyState = "roaming" | "alert" | "fleeing" | "stunned" | "caught";

export interface Prey {
  id: string;
  type: PreyType;
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  state: PreyState;
  alertTimer: number;
  stunTimer: number;
  catchAnim: number;
  roamAngle: number;
  roamTimer: number;
  hopTimer: number;
}

// --- Tree ---
export type TreeType = "oak" | "pine" | "birch";

export interface Tree {
  x: number; z: number;
  height: number;
  trunkRadius: number;
  canopyRadius: number;
  type: TreeType;
}

// --- Rock ---
export interface Rock {
  x: number; z: number;
  scale: number;
  rotY: number;
  type: number;
}

// --- Mushroom ---
export interface Mushroom {
  x: number; z: number;
  scale: number;
  glowPhase: number;
  hue: number;
}

// --- Firefly ---
export interface Firefly {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  brightness: number;
  phase: number;
}

// --- Ambient Leaf ---
export interface AmbientLeaf {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  spin: number;
  spinSpeed: number;
  life: number;
  maxLife: number;
  size: number;
  color: number;
}

// --- Moonlight Orb ---
export interface MoonlightOrb {
  id: string;
  typeIndex: number;       // index into OWL.ORB_TYPES
  x: number; y: number; z: number;
  life: number;            // despawn countdown
  collected: boolean;
  collectAnim: number;
  bobPhase: number;
}

// --- Active Buff ---
export interface ActiveBuff {
  id: string;
  name: string;
  color: number;
  timer: number;
  maxTimer: number;
}

// --- Particle ---
export interface OwlParticle {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  life: number; maxLife: number;
  size: number;
  color: number;
  type: "feather" | "stun_ring" | "catch_sparkle" | "moonbeam" | "leaf" | "speed_line" | "wing_trail" | "alert_ring";
}

// --- Notification ---
export interface OwlNotification {
  text: string;
  color: string;
  timer: number;
  y: number;
}

// --- Score popup ---
export interface ScorePopup {
  x: number; y: number; z: number;
  value: number;
  timer: number;
  combo: number;
}

// --- Wave Stats ---
export interface WaveStats {
  caught: number;
  total: number;
  perfectWave: boolean;
  modifier: string;
  scoreEarned: number;
  bestCombo: number;
}

// --- Alert Pulse (visual ring at prey that just became alert) ---
export interface AlertPulse {
  x: number; y: number; z: number;
  timer: number;
  maxTimer: number;
}

// --- Player Owl ---
export interface OwlPlayer {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  yaw: number;
  pitch: number;
  speed: number;
  stamina: number;
  isDiving: boolean;
  isSilentGlide: boolean;
  screechCooldown: number;
  bankAngle: number;

  // Health
  hp: number;
  invulnTimer: number;
  lastHitTimer: number;     // time since last damage (for regen delay)

  // Barrel roll
  barrelRollTimer: number;
  barrelRollCooldown: number;
  barrelRollAngle: number;

  // Scoring
  combo: number;
  comboTimer: number;
  bestCombo: number;
  score: number;
  totalCaught: number;
  totalMissed: number;
  waveScoreStart: number;

  // Upgrades
  upgrades: Record<string, number>;

  // Wing animation
  wingPhase: number;
  wingAngle: number;
  wingTrailTimer: number;   // cooldown for spawning wing trail particles
}

// --- Main State ---
export interface OwlsState {
  phase: OwlsPhase;
  tick: number;
  gameTime: number;

  // Player
  player: OwlPlayer;

  // World
  trees: Tree[];
  rocks: Rock[];
  mushrooms: Mushroom[];
  fireflies: Firefly[];
  ambientLeaves: AmbientLeaf[];

  // Prey
  prey: Map<string, Prey>;
  preyIdCounter: number;

  // Moonlight orbs
  orbs: MoonlightOrb[];
  orbSpawnTimer: number;
  orbIdCounter: number;
  activeBuff: ActiveBuff | null;

  // Effects
  particles: OwlParticle[];
  notifications: OwlNotification[];
  scorePopups: ScorePopup[];
  alertPulses: AlertPulse[];

  // Wave
  wave: number;
  nightTimer: number;
  preyCaughtThisWave: number;
  preyTotalThisWave: number;
  quota: number;
  bestWave: number;
  waveModifierIndex: number;
  lastWaveStats: WaveStats | null;

  // Dawn transition (0 = full night, 1 = full dawn)
  dawnProgress: number;

  // Grace period (extra seconds after timer expires before game over)
  gracePeriod: boolean;
  gracePeriodTimer: number;

  // Tutorial
  tutorialWave: boolean; // true if this is the first wave (show hints)

  // Hit stop
  hitStopTimer: number;
  hitStopScale: number;

  // Camera shake
  cameraShakeIntensity: number;
  cameraShakeX: number;
  cameraShakeY: number;

  // Screen effects
  screenFlash: number;
  screenFlashColor: string;
  nearMissTimer: number;

  // Pending visual events
  pendingScreechRing: boolean;
  pendingCatchFlash: { x: number; y: number; z: number } | null;
  shootingStarTimer: number;
  shootingStar: { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number } | null;

  // Input
  keys: Set<string>;
  mouseX: number; mouseY: number;
  mouseDown: boolean; rightMouseDown: boolean;
  pointerLocked: boolean;
  mouseDX: number; mouseDY: number;

  // Screen
  screenW: number; screenH: number;
  paused: boolean;

  // Difficulty
  difficulty: "easy" | "normal" | "hard";
}

// --- Factory ---
let _nextPreyId = 0;
export function nextPreyId(): string { return `prey_${_nextPreyId++}`; }
let _nextOrbId = 0;
export function nextOrbId(): string { return `orb_${_nextOrbId++}`; }

function _generateTrees(): Tree[] {
  const trees: Tree[] = [];
  const types: TreeType[] = ["oak", "oak", "oak", "pine", "pine", "birch"];
  for (let i = 0; i < OWL.TREE_COUNT; i++) {
    let x: number, z: number, dist: number;
    do {
      const angle = Math.random() * Math.PI * 2;
      const r = OWL.CLEARING_RADIUS + Math.random() * (OWL.ARENA_RADIUS - OWL.CLEARING_RADIUS - 10);
      x = Math.cos(angle) * r;
      z = Math.sin(angle) * r;
      dist = Math.sqrt(x * x + z * z);
    } while (dist < OWL.CLEARING_RADIUS);

    const type = types[Math.floor(Math.random() * types.length)];
    const height = OWL.TREE_HEIGHT_MIN + Math.random() * (OWL.TREE_HEIGHT_MAX - OWL.TREE_HEIGHT_MIN);
    const canopyRadius = OWL.TREE_CANOPY_RADIUS_MIN + Math.random() * (OWL.TREE_CANOPY_RADIUS_MAX - OWL.TREE_CANOPY_RADIUS_MIN);
    trees.push({
      x, z, height,
      trunkRadius: OWL.TREE_TRUNK_RADIUS * (0.7 + Math.random() * 0.6),
      canopyRadius: type === "pine" ? canopyRadius * 0.7 : canopyRadius,
      type,
    });
  }
  return trees;
}

function _generateRocks(): Rock[] {
  const rocks: Rock[] = [];
  for (let i = 0; i < OWL.ROCK_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = OWL.CLEARING_RADIUS * 0.8 + Math.random() * (OWL.ARENA_RADIUS * 0.8);
    rocks.push({
      x: Math.cos(angle) * r, z: Math.sin(angle) * r,
      scale: 0.5 + Math.random() * 1.5,
      rotY: Math.random() * Math.PI * 2,
      type: Math.floor(Math.random() * 3),
    });
  }
  return rocks;
}

function _generateMushrooms(trees: Tree[]): Mushroom[] {
  const mushrooms: Mushroom[] = [];
  for (let i = 0; i < OWL.MUSHROOM_COUNT; i++) {
    const tree = trees[Math.floor(Math.random() * trees.length)];
    const angle = Math.random() * Math.PI * 2;
    const r = tree.trunkRadius + 1 + Math.random() * 4;
    mushrooms.push({
      x: tree.x + Math.cos(angle) * r, z: tree.z + Math.sin(angle) * r,
      scale: 0.3 + Math.random() * 0.5,
      glowPhase: Math.random() * Math.PI * 2,
      hue: Math.floor(Math.random() * 3),
    });
  }
  return mushrooms;
}

function _generateFireflies(): Firefly[] {
  const fireflies: Firefly[] = [];
  for (let i = 0; i < OWL.FIREFLY_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * OWL.ARENA_RADIUS * 0.8;
    fireflies.push({
      x: Math.cos(angle) * r, y: 2 + Math.random() * 15, z: Math.sin(angle) * r,
      vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 0.5, vz: (Math.random() - 0.5) * 2,
      brightness: Math.random(), phase: Math.random() * Math.PI * 2,
    });
  }
  return fireflies;
}

export function createOwlsState(sw: number, sh: number): OwlsState {
  const trees = _generateTrees();
  return {
    phase: "menu",
    tick: 0,
    gameTime: 0,

    player: {
      x: 0, y: 30, z: 0,
      vx: 0, vy: 0, vz: 0,
      yaw: 0, pitch: -0.1,
      speed: OWL.FLY_SPEED,
      stamina: OWL.STAMINA_MAX,
      isDiving: false,
      isSilentGlide: false,
      screechCooldown: 0,
      bankAngle: 0,
      hp: OWL.HP_MAX,
      invulnTimer: 0,
      lastHitTimer: 99,
      barrelRollTimer: 0,
      barrelRollCooldown: 0,
      barrelRollAngle: 0,
      combo: 0,
      comboTimer: 0,
      bestCombo: 0,
      score: 0,
      totalCaught: 0,
      totalMissed: 0,
      waveScoreStart: 0,
      upgrades: { swift: 0, keen: 0, silent: 0, talons: 0, vision: 0, screech: 0 },
      wingPhase: 0,
      wingAngle: 0,
      wingTrailTimer: 0,
    },

    trees,
    rocks: _generateRocks(),
    mushrooms: _generateMushrooms(trees),
    fireflies: _generateFireflies(),
    ambientLeaves: [],

    prey: new Map(),
    preyIdCounter: 0,

    orbs: [],
    orbSpawnTimer: OWL.ORB_SPAWN_INTERVAL * 0.5,
    orbIdCounter: 0,
    activeBuff: null,

    particles: [],
    notifications: [],
    scorePopups: [],
    alertPulses: [],

    wave: 0,
    nightTimer: OWL.NIGHT_DURATION,
    preyCaughtThisWave: 0,
    preyTotalThisWave: 0,
    quota: 0,
    bestWave: 0,
    waveModifierIndex: 0,
    lastWaveStats: null,

    dawnProgress: 0,
    gracePeriod: false,
    gracePeriodTimer: 0,
    tutorialWave: true,

    hitStopTimer: 0,
    hitStopScale: 1,

    cameraShakeIntensity: 0,
    cameraShakeX: 0,
    cameraShakeY: 0,

    screenFlash: 0,
    screenFlashColor: "#ffdd44",
    nearMissTimer: 0,

    pendingScreechRing: false,
    pendingCatchFlash: null,
    shootingStarTimer: 10 + Math.random() * 20,
    shootingStar: null,

    keys: new Set(),
    mouseX: sw / 2, mouseY: sh / 2,
    mouseDown: false, rightMouseDown: false,
    pointerLocked: false,
    mouseDX: 0, mouseDY: 0,

    screenW: sw, screenH: sh,
    paused: false,

    difficulty: "normal",
  };
}
