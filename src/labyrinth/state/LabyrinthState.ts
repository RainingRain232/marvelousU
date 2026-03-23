// ---------------------------------------------------------------------------
// Labyrinth mode — game state
// ---------------------------------------------------------------------------

import type { ItemType, TrapType, HazardType, DifficultyId, MinoState } from "../config/LabyrinthConfig";
import { LabyrinthConfig, FLOORS, DIFFICULTIES } from "../config/LabyrinthConfig";

export interface MazeCell {
  top: boolean;
  right: boolean;
  bottom: boolean;
  left: boolean;
  visited: boolean;
  explored: boolean;
}

export interface Relic {
  col: number;
  row: number;
  collected: boolean;
  glow: number;
}

export interface MazeItem {
  col: number;
  row: number;
  type: ItemType;
  collected: boolean;
}

export interface InventorySlot {
  type: ItemType;
}

export interface Caltrop {
  x: number;
  y: number;
  life: number;
}

export interface Decoy {
  x: number;
  y: number;
  col: number;
  row: number;
  life: number;
}

export interface Trap {
  col: number;
  row: number;
  type: TrapType;
  triggered: boolean;
  crumbleTimer: number;
  visible: boolean;
}

export interface Footprint {
  x: number;
  y: number;
  life: number;
  maxLife: number;
}

export interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  color: number; size: number;
}

export interface FloorDecor {
  col: number;
  row: number;
  type: "bones" | "crack" | "moss" | "bloodstain" | "rubble" | "cobweb";
  rotation: number;
  size: number;
}

export interface SecretWall {
  col: number;
  row: number;
  dir: 0 | 1 | 2 | 3;   // 0=top, 1=right, 2=bottom, 3=left
  hitsRemaining: number;
  revealed: boolean;
  bonusItem: ItemType;
}

export interface Inscription {
  col: number;
  row: number;
  text: string;
  seen: boolean;
}

export interface Sconce {
  x: number; y: number;       // pixel position
  col: number; row: number;
  flicker: number;             // animation phase offset
}

export interface AmbientDust {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number;
}

export interface Hazard {
  col: number;
  row: number;
  type: HazardType;
}

/** Second minotaur data (floor 3). */
export interface ShadowMinotaur {
  x: number; y: number;
  col: number; row: number;
  speed: number;
  path: { col: number; row: number }[];
  angle: number;
  stunTimer: number;
  patrolTarget: { col: number; row: number } | null;
}

export interface LabyrinthState {
  // Difficulty
  difficulty: DifficultyId;
  scoreMult: number;

  // Floor
  floor: number;
  totalFloors: number;
  floorRelicCount: number;

  // Maze
  maze: MazeCell[][];
  cols: number;
  rows: number;

  // Player
  px: number; py: number;
  pCol: number; pRow: number;
  torchFuel: number;
  speedTimer: number;
  invisTimer: number;
  revealTimer: number;
  compassTimer: number;
  webTimer: number;
  shieldActive: boolean;
  invulnTimer: number;        // brief invulnerability after shield break
  alive: boolean;
  hitsTaken: number;
  sprinting: boolean;
  noiseLevel: number;         // 0-1, current noise output

  // Inventory
  inventory: InventorySlot[];
  invFullCooldown: number;    // prevents spam

  // Minotaur
  mx: number; my: number;
  mCol: number; mRow: number;
  minoSpeed: number;
  minoStunTimer: number;
  minoTargetX: number; minoTargetY: number;
  minoPath: { col: number; row: number }[];
  minoLastHeard: { col: number; row: number } | null;
  minoAlerted: boolean;
  minoCharging: boolean;
  minoRoarTimer: number;
  minoRoarFlash: number;
  minoPatrolTarget: { col: number; row: number } | null;
  minoAngle: number;
  minoState: MinoState;
  minoStateTimer: number;        // time remaining in current state
  minoEnrageTimer: number;       // enrage countdown after stun

  // Shadow minotaur (floor 3)
  shadow: ShadowMinotaur | null;

  // Relics
  relics: Relic[];
  relicsCollected: number;
  totalRelicsCollected: number;

  // Exit
  exitCol: number;
  exitRow: number;
  exitOpen: boolean;

  // Items, caltrops, traps, decoys
  items: MazeItem[];
  caltrops: Caltrop[];
  traps: Trap[];
  decoys: Decoy[];

  // Hazards
  hazards: Hazard[];
  inWater: boolean;
  inDarkness: boolean;

  // Secrets & inscriptions
  secrets: SecretWall[];
  secretsFound: number;
  inscriptions: Inscription[];
  activeInscription: string | null;
  inscriptionTimer: number;

  // Footprints
  footprints: Footprint[];
  footprintTimer: number;

  // Decorations
  decor: FloorDecor[];

  // Ambient
  ambientDust: AmbientDust[];
  emberTimer: number;
  sconces: Sconce[];

  // Maze shifting
  shiftTimer: number;
  shiftCount: number;
  shiftFlash: number;
  shiftWarning: boolean;

  // Timing
  elapsed: number;
  floorElapsed: number;
  gameOver: boolean;
  won: boolean;
  floorComplete: boolean;

  // Input
  moveUp: boolean;
  moveDown: boolean;
  moveLeft: boolean;
  moveRight: boolean;

  // FX
  particles: Particle[];
  announcements: { text: string; color: number; timer: number }[];
  heartbeat: number;
  screenShake: number;
  dangerDir: number;

  // Minimap
  minimapVisible: boolean;

  // Relic proximity
  relicHumDir: number;           // angle to nearest relic
  relicHumStrength: number;      // 0-1

  // Near-miss tracking
  nearMisses: number;
  nearMissCooldown: number;

  // Score
  score: number;
  itemsUsed: number;
  caltropHits: number;
  trapsTriggered: number;
  trapsAvoided: number;

  // Score popups (floating text)
  scorePopups: { x: number; y: number; text: string; color: number; life: number; maxLife: number }[];

  // Streaks
  noHitStreak: number;          // seconds since last hit
  bestNoHitStreak: number;

  // Achievements earned this run
  achievements: string[];

  // Death context
  deathCause: string;
  deathFloor: number;
  deathTorchPct: number;

  // Endless mode
  endless: boolean;
}

export function cellToPixel(col: number, row: number): { x: number; y: number } {
  return {
    x: col * LabyrinthConfig.CELL_SIZE + LabyrinthConfig.CELL_SIZE / 2,
    y: row * LabyrinthConfig.CELL_SIZE + LabyrinthConfig.CELL_SIZE / 2,
  };
}

export function pixelToCell(x: number, y: number): { col: number; row: number } {
  return {
    col: Math.floor(x / LabyrinthConfig.CELL_SIZE),
    row: Math.floor(y / LabyrinthConfig.CELL_SIZE),
  };
}

export function createLabyrinthState(floor = 0, difficulty: DifficultyId = "normal"): LabyrinthState {
  const fc = FLOORS[Math.min(floor, FLOORS.length - 1)];
  const diff = DIFFICULTIES.find(d => d.id === difficulty) ?? DIFFICULTIES[1];
  const cols = fc.cols;
  const rows = fc.rows;

  const maze: MazeCell[][] = [];
  for (let r = 0; r < rows; r++) {
    maze[r] = [];
    for (let c = 0; c < cols; c++) {
      maze[r][c] = { top: true, right: true, bottom: true, left: true, visited: false, explored: false };
    }
  }

  const start = cellToPixel(1, 1);

  return {
    difficulty, scoreMult: diff.scoreMult,

    floor, totalFloors: FLOORS.length,
    floorRelicCount: fc.relicCount,

    maze, cols, rows,
    px: start.x, py: start.y,
    pCol: 1, pRow: 1,
    torchFuel: LabyrinthConfig.TORCH_MAX,
    speedTimer: 0, invisTimer: 0, revealTimer: 0, compassTimer: 0,
    webTimer: 0, shieldActive: diff.extraShields > 0, invulnTimer: 0,
    alive: true, hitsTaken: 0,
    sprinting: false, noiseLevel: 0,

    inventory: [],
    invFullCooldown: 0,

    mx: 0, my: 0,
    mCol: cols - 2, mRow: rows - 2,
    minoSpeed: fc.minoSpeedBase * diff.minoSpeedMult,
    minoStunTimer: 0,
    minoTargetX: 0, minoTargetY: 0,
    minoPath: [],
    minoLastHeard: null,
    minoAlerted: false,
    minoCharging: false,
    minoRoarTimer: 8 + Math.random() * 4,
    minoRoarFlash: 0,
    minoPatrolTarget: null,
    minoAngle: 0,
    minoState: "patrol" as MinoState,
    minoStateTimer: 0,
    minoEnrageTimer: 0,

    shadow: null,

    relics: [],
    relicsCollected: 0,
    totalRelicsCollected: 0,

    exitCol: Math.floor(cols / 2),
    exitRow: Math.floor(rows / 2),
    exitOpen: false,

    items: [],
    caltrops: [],
    traps: [],
    decoys: [],

    hazards: [],
    inWater: false,
    inDarkness: false,

    secrets: [],
    secretsFound: 0,
    inscriptions: [],
    activeInscription: null,
    inscriptionTimer: 0,

    footprints: [],
    footprintTimer: 0,

    decor: [],

    ambientDust: [],
    emberTimer: 0,
    sconces: [],

    shiftTimer: fc.shiftInterval,
    shiftCount: 0,
    shiftFlash: 0,
    shiftWarning: false,

    elapsed: 0,
    floorElapsed: 0,
    gameOver: false,
    won: false,
    floorComplete: false,

    moveUp: false, moveDown: false, moveLeft: false, moveRight: false,

    particles: [],
    announcements: [{ text: `Floor ${floor + 1}: ${fc.name}`, color: 0xddcc88, timer: 3 }],
    heartbeat: 0,
    screenShake: 0,
    dangerDir: 0,

    minimapVisible: true,

    relicHumDir: 0,
    relicHumStrength: 0,

    nearMisses: 0,
    nearMissCooldown: 0,

    score: 0,
    itemsUsed: 0,
    caltropHits: 0,
    trapsTriggered: 0,
    trapsAvoided: 0,

    scorePopups: [],
    noHitStreak: 0,
    bestNoHitStreak: 0,
    achievements: [],
    deathCause: "",
    deathFloor: 0,
    deathTorchPct: 0,
    endless: false,
  };
}
