// ---------------------------------------------------------------------------
// Rampart — game state
// ---------------------------------------------------------------------------

import { RAMPART, DIFFICULTIES } from "../config/RampartConfig";
import type { TowerDef, EnemyDef, DifficultyDef } from "../config/RampartConfig";

export type RampartPhase = "menu" | "prep" | "wave" | "gameover" | "victory";

export type TargetMode = "first" | "strongest" | "weakest" | "closest";

export interface RampartTower {
  id: number;
  def: TowerDef;
  col: number;
  row: number;
  x: number;
  z: number;
  y: number;
  cooldown: number;
  kills: number;
  totalDamage: number;
  level: number;
  targetMode: TargetMode;
  muzzleFlash: number;  // time remaining for muzzle flash (0 = no flash)
}

export interface RampartEnemy {
  id: number;
  def: EnemyDef;
  x: number;
  y: number;
  z: number;
  hp: number;
  maxHp: number;
  speed: number;
  slowTimer: number;
  slowFactor: number;
  alive: boolean;
  pathIndex: number;
  reachedEnd: boolean;
  armor: number;
}

export interface RampartProjectile {
  id: number;
  x: number;
  y: number;
  z: number;
  targetId: number;
  towerId: number;
  tx: number;
  ty: number;
  tz: number;
  speed: number;
  damage: number;
  color: number;
  splash: number;
  slowAmount: number;
  alive: boolean;
}

export interface Explosion {
  x: number;
  y: number;
  z: number;
  radius: number;
  life: number;
  maxLife: number;
  color: number;
}

export interface RampartParticle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  color: number;
  size: number;
}

export interface DamageNumber {
  x: number;
  y: number;
  z: number;
  value: number;
  life: number;
  color: number;
}

export interface PathNode {
  col: number;
  row: number;
  x: number;
  z: number;
}

export interface RampartState {
  phase: RampartPhase;
  difficulty: DifficultyDef;
  tick: number;
  gameTime: number;

  // Grid: 0 = buildable, 1 = path, 2 = tower, 3 = castle, 4 = spawn
  grid: number[][];
  path: PathNode[];

  // Castle
  castleHp: number;
  castleMaxHp: number;

  // Resources
  gold: number;
  score: number;
  totalKills: number;

  // Waves
  wave: number;
  waveTimer: number;
  spawnQueue: string[];
  spawnTimer: number;
  enemiesAlive: number;
  waveActive: boolean;

  // Entities
  towers: RampartTower[];
  enemies: RampartEnemy[];
  projectiles: RampartProjectile[];
  particles: RampartParticle[];
  explosions: Explosion[];
  damageNumbers: DamageNumber[];

  // IDs
  nextTowerId: number;
  nextEnemyId: number;
  nextProjectileId: number;

  // Input
  keys: Set<string>;
  mouseX: number;
  mouseY: number;
  mouseDown: boolean;
  hoverCol: number;
  hoverRow: number;

  // UI state
  selectedTower: string | null;  // tower def id to place
  selectedPlacedTower: number | null;  // id of a placed tower being inspected
  paused: boolean;
  gameSpeed: number;

  // Camera
  camAngle: number;
  camDistance: number;
  camTargetX: number;
  camTargetZ: number;
  camShake: number;           // shake intensity (decays to 0)

  // Wave clear message
  waveClearMessage: string;
  waveClearTimer: number;

  // Audio flags
  audioShoot: boolean;
  audioHit: boolean;
  audioKill: boolean;
  audioWaveStart: boolean;
  audioBuild: boolean;
  audioCastleDamage: boolean;
  audioSell: boolean;
  audioUpgrade: boolean;

  // Screen dimensions
  sw: number;
  sh: number;
}

export function createRampartState(sw: number, sh: number): RampartState {
  const cols = RAMPART.GRID_COLS;
  const rows = RAMPART.GRID_ROWS;
  const grid: number[][] = [];

  // Initialize grid as all buildable
  for (let r = 0; r < rows; r++) {
    grid[r] = [];
    for (let c = 0; c < cols; c++) {
      grid[r][c] = 0;
    }
  }

  // Define a winding path from bottom to top
  const path = generatePath(cols, rows);
  for (const node of path) {
    grid[node.row][node.col] = 1;
    // Widen path slightly
    if (node.col > 0) grid[node.row][node.col - 1] = 1;
    if (node.col < cols - 1) grid[node.row][node.col + 1] = 1;
  }

  // Castle zone at top rows
  for (let r = 0; r < 2; r++) {
    for (let c = Math.floor(cols / 2) - 3; c <= Math.floor(cols / 2) + 3; c++) {
      if (c >= 0 && c < cols) grid[r][c] = 3;
    }
  }

  // Spawn zone at bottom rows
  for (let c = Math.floor(cols / 2) - 2; c <= Math.floor(cols / 2) + 2; c++) {
    if (c >= 0 && c < cols) grid[rows - 1][c] = 4;
  }

  return {
    phase: "menu",
    difficulty: DIFFICULTIES[1], // Normal by default
    tick: 0,
    gameTime: 0,
    grid,
    path,
    castleHp: RAMPART.CASTLE_MAX_HP,
    castleMaxHp: RAMPART.CASTLE_MAX_HP,
    gold: RAMPART.START_GOLD,
    score: 0,
    totalKills: 0,
    wave: 0,
    waveTimer: RAMPART.FIRST_WAVE_DELAY,
    spawnQueue: [],
    spawnTimer: 0,
    enemiesAlive: 0,
    waveActive: false,
    towers: [],
    enemies: [],
    projectiles: [],
    particles: [],
    explosions: [],
    damageNumbers: [],
    nextTowerId: 1,
    nextEnemyId: 1,
    nextProjectileId: 1,
    keys: new Set(),
    mouseX: 0,
    mouseY: 0,
    mouseDown: false,
    hoverCol: -1,
    hoverRow: -1,
    selectedTower: "archer",
    selectedPlacedTower: null,
    paused: false,
    gameSpeed: 1,
    camAngle: 0,
    camDistance: RAMPART.CAM_DISTANCE,
    camTargetX: (cols * RAMPART.CELL_SIZE) / 2,
    camTargetZ: (rows * RAMPART.CELL_SIZE) / 2,
    camShake: 0,
    waveClearMessage: "",
    waveClearTimer: 0,
    audioShoot: false,
    audioHit: false,
    audioKill: false,
    audioWaveStart: false,
    audioBuild: false,
    audioCastleDamage: false,
    audioSell: false,
    audioUpgrade: false,
    sw,
    sh,
  };
}

function generatePath(cols: number, rows: number): PathNode[] {
  const path: PathNode[] = [];
  const mid = Math.floor(cols / 2);
  const cs = RAMPART.CELL_SIZE;

  // Start at bottom center
  let col = mid;

  // Create a winding path from bottom to top
  for (let row = rows - 1; row >= 2; row--) {
    path.push({ col, row, x: col * cs + cs / 2, z: row * cs + cs / 2 });

    // Zigzag pattern
    if (row === rows - 4) col = Math.min(col + 4, cols - 3);
    else if (row === rows - 8) col = Math.max(col - 6, 2);
    else if (row === rows - 12) col = Math.min(col + 5, cols - 3);
    else if (row === rows - 16) col = Math.max(col - 4, 2);
  }

  // End at castle entrance
  const lastNode = path[path.length - 1];
  if (lastNode) {
    // Connect to castle center
    const targetCol = mid;
    const step = targetCol > lastNode.col ? 1 : -1;
    for (let c = lastNode.col + step; c !== targetCol + step; c += step) {
      path.push({ col: c, row: 2, x: c * cs + cs / 2, z: 2 * cs + cs / 2 });
    }
  }
  path.push({ col: mid, row: 1, x: mid * cs + cs / 2, z: 1 * cs + cs / 2 });

  return path;
}
