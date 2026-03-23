// ---------------------------------------------------------------------------
// The Shifting Labyrinth – Types & Enums
// ---------------------------------------------------------------------------

export enum LabyrinthPhase {
  MENU = "menu",
  PLAYING = "playing",
  PAUSED = "paused",
  VICTORY = "victory",
  DEAD = "dead",
}

export enum CellType {
  WALL = 0,
  FLOOR = 1,
  EXIT = 2,
  ALCOVE = 3,
}

export enum PickupKind {
  RUNE = "rune",
  TORCH_FUEL = "torch_fuel",
  SPEED_BOOST = "speed_boost",
  INVISIBILITY = "invisibility",
  DECOY = "decoy",
  TREASURE = "treasure",
  STONE = "stone",             // throwable stun projectile
}

export enum TrapType {
  SPIKE = "spike",
  ARROW = "arrow",
  GAS = "gas",
}

export enum MoveMode {
  WALK = "walk",
  SPRINT = "sprint",           // faster but much louder (2x hearing range)
  SNEAK = "sneak",             // slower but nearly silent (0.3x hearing range)
}

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

export interface LabyrinthPlayer {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: number;
  speed: number;
  torchFuel: number;
  torchRadius: number;
  runesCollected: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  speedBoostTimer: number;
  invisTimer: number;
  footstepTimer: number;
  invincibleTimer: number;
  walkCycle: number;
  decoys: number;
  stones: number;              // throwable stun stones
  moveMode: MoveMode;
}

export interface Decoy {
  x: number;
  y: number;
  life: number;
  active: boolean;
}

export interface ThrownStone {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  active: boolean;
}

export interface Minotaur {
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  path: { x: number; y: number }[];
  pathTimer: number;
  alerted: boolean;
  roarTimer: number;
  stunTimer: number;
  breathTimer: number;
  facing: number;
  id: number;
  luredByDecoy: boolean;
  variant: MinotaurVariant;
}

export interface Trap {
  row: number;
  col: number;
  type: TrapType;
  timer: number;
  active: boolean;
  direction: number;
  triggered: boolean;
}

export interface LabyrinthPickup {
  x: number;
  y: number;
  kind: PickupKind;
  collected: boolean;
  bobPhase: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: number;
  size: number;
  type: "spark" | "dust" | "rune" | "debris" | "blood" | "gas" | "flash";
}

export interface Footprint {
  x: number;
  y: number;
  age: number;
}

export interface MazeGrid {
  width: number;
  height: number;
  cells: CellType[][];
  exitRow: number;
  exitCol: number;
}

export interface ScreenShake {
  intensity: number;
  duration: number;
  frequency: number;
}

export enum FloorModifier {
  NONE = "none",
  DARKNESS = "darkness",
  MIST = "mist",
  HUNTERS_MOON = "hunters_moon",
  CURSED = "cursed",
  LABYRINTHINE = "labyrinthine",
}

export enum MinotaurVariant {
  NORMAL = "normal",
  TRACKER = "tracker",
  BERSERKER = "berserker",
  STALKER = "stalker",
}

// ---------------------------------------------------------------------------
// Challenge Heat (Hades-like pact system)
// ---------------------------------------------------------------------------

export interface HeatPact {
  id: string;
  name: string;
  desc: string;
  maxTier: number;
  coinBonus: number;    // bonus coins per tier per floor cleared
}

export interface LabyrinthState {
  phase: LabyrinthPhase;
  maze: MazeGrid;
  player: LabyrinthPlayer;
  minotaurs: Minotaur[];
  decoys: Decoy[];
  thrownStones: ThrownStone[];
  pickups: LabyrinthPickup[];
  traps: Trap[];
  particles: Particle[];
  footprints: Footprint[];
  explored: Set<number>;
  runesRequired: number;
  floor: number;
  time: number;
  shiftTimer: number;
  shiftWarning: boolean;
  shiftAnimTimer: number;
  score: number;
  highScore: number;
  screenShake: ScreenShake;
  screenFlash: number;
  events: Record<string, number>;
  compassAngle: number;
  modifier: FloorModifier;
  runeChainTimer: number;
  runeChainCount: number;
  heatLevel: number;           // total active pact tiers
  heatTorchBurnMult: number;   // torch burn rate multiplier from dim_torch pact
}

export interface LabyrinthMeta {
  highScore: number;
  bestFloor: number;
  totalRunes: number;
  totalCoins: number;
  totalDeaths: number;
  gamesPlayed: number;
  floorsCleared: number;       // total floors ever cleared (for unlock gating)
  // Permanent upgrades
  extraFuel: number;
  fasterSpeed: number;
  minotaurSlow: number;
  extraHp: number;
  compassUnlocked: boolean;
  stoneThrowUnlocked: boolean; // active ability: stun stones
  // Heat pact tiers (persisted between runs)
  heatPacts: Record<string, number>;
}
