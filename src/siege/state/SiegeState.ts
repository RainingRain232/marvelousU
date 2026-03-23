// ---------------------------------------------------------------------------
// Siege mode — core state
// ---------------------------------------------------------------------------

import type { TowerType, EnemyType } from "../config/SiegeConfig";
import { SiegeConfig, ENEMIES } from "../config/SiegeConfig";

export enum SiegePhase {
  BUILDING = "building",  // between waves — place towers
  WAVE = "wave",          // enemies attacking
  VICTORY = "victory",
  DEFEAT = "defeat",
}

export type CellType = "path" | "buildable" | "blocked" | "spawn" | "castle";

export interface MapCell {
  type: CellType;
  towerId: string | null;
}

export interface Tower {
  id: string;
  type: TowerType;
  x: number; // grid col
  y: number; // grid row
  cooldown: number;
  kills: number;
  level: number;
}

export interface Enemy {
  id: string;
  type: EnemyType;
  hp: number;
  maxHp: number;
  speed: number;
  armor: number;
  x: number; // pixel position
  y: number;
  pathIndex: number;
  slowTimer: number;
  slowAmount: number;
  alive: boolean;
  reachedEnd: boolean;
}

export interface Projectile {
  x: number;
  y: number;
  targetId: string;
  damage: number;
  speed: number;
  color: number;
  splashRadius: number;
  slowAmount: number;
  slowDuration: number;
  towerId: string;
}

export interface SiegeState {
  phase: SiegePhase;
  grid: MapCell[][];
  path: { x: number; y: number }[];
  towers: Tower[];
  enemies: Enemy[];
  projectiles: Projectile[];
  gold: number;
  lives: number;
  score: number;
  wave: number;
  waveTimer: number;
  spawnQueue: { type: EnemyType; delay: number }[];
  spawnTimer: number;
  enemyIdCounter: number;
  towerIdCounter: number;
  selectedTower: TowerType | null;
  inspectedTowerId: string | null; // clicked tower to inspect/sell
  speedMult: number; // 1, 2, 3
  particles: { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: number; size: number }[];
  announcements: { text: string; color: number; timer: number }[];
  totalKills: number;
  elapsedTime: number;
  // Power-ups
  freezeTimer: number; // seconds remaining of global freeze
  meteorCooldown: number; // seconds until meteor available again
}

// ---------------------------------------------------------------------------
// Map generation — S-shaped path with buildable areas
// ---------------------------------------------------------------------------

export function createSiegeMap(variant?: number): { grid: MapCell[][]; path: { x: number; y: number }[] } {
  const { GRID_COLS, GRID_ROWS } = SiegeConfig;
  const grid: MapCell[][] = [];
  for (let y = 0; y < GRID_ROWS; y++) {
    grid[y] = [];
    for (let x = 0; x < GRID_COLS; x++) {
      grid[y][x] = { type: "buildable", towerId: null };
    }
  }

  const v = variant ?? Math.floor(Math.random() * 3);
  const path: { x: number; y: number }[] = [];

  const carve = (x: number, y: number) => {
    if (y >= 0 && y < GRID_ROWS && x >= 0 && x < GRID_COLS) {
      path.push({ x, y }); grid[y][x].type = "path";
    }
  };

  if (v === 0) {
    // S-shape (classic)
    let cx = 0, cy = 2;
    for (; cx < GRID_COLS - 4; cx++) carve(cx, cy);
    for (; cy < GRID_ROWS - 3; cy++) carve(cx, cy);
    for (; cx > 3; cx--) carve(cx, cy);
    for (; cy < GRID_ROWS - 1; cy++) carve(cx, cy);
    for (; cx < GRID_COLS; cx++) carve(cx, cy);
  } else if (v === 1) {
    // Z-shape (top-right to bottom-left to bottom-right)
    let cx = 0, cy = 1;
    for (; cx < GRID_COLS - 3; cx++) carve(cx, cy);
    for (; cy < GRID_ROWS - 4; cy++) { carve(cx, cy); cx = Math.max(3, cx - 1); }
    for (; cx >= 2; cx--) carve(cx, cy);
    for (; cy < GRID_ROWS - 1; cy++) carve(cx, cy);
    for (; cx < GRID_COLS; cx++) carve(cx, cy);
  } else {
    // Spiral (inward clockwise)
    let cx = 0, cy = 1;
    // Right across top
    for (; cx < GRID_COLS - 2; cx++) carve(cx, cy);
    // Down right side
    for (; cy < GRID_ROWS - 2; cy++) carve(cx, cy);
    // Left across bottom
    for (; cx > 4; cx--) carve(cx, cy);
    // Up left-center
    for (; cy > 4; cy--) carve(cx, cy);
    // Right to center
    for (; cx < GRID_COLS - 6; cx++) carve(cx, cy);
    // Down to exit
    for (; cy < GRID_ROWS - 1; cy++) carve(cx, cy);
    for (; cx < GRID_COLS; cx++) carve(cx, cy);
  }

  // Mark spawn and castle
  if (path.length > 0) grid[path[0].y][path[0].x].type = "spawn";
  if (path.length > 1) grid[path[path.length - 1].y][path[path.length - 1].x].type = "castle";

  // Random blocked cells
  for (let bi = 0; bi < 6; bi++) {
    const bx = Math.floor(Math.random() * GRID_COLS);
    const by = Math.floor(Math.random() * GRID_ROWS);
    if (grid[by][bx].type === "buildable") grid[by][bx].type = "blocked";
  }

  return { grid, path };
}

export function createSiegeState(): SiegeState {
  const { grid, path } = createSiegeMap();
  return {
    phase: SiegePhase.BUILDING,
    grid, path,
    towers: [],
    enemies: [],
    projectiles: [],
    gold: SiegeConfig.STARTING_GOLD,
    lives: SiegeConfig.STARTING_LIVES,
    score: 0,
    wave: 0,
    waveTimer: 5,
    spawnQueue: [],
    spawnTimer: 0,
    enemyIdCounter: 0,
    towerIdCounter: 0,
    selectedTower: null,
    inspectedTowerId: null,
    speedMult: 1,
    particles: [],
    announcements: [{ text: "Place towers to defend!", color: 0xffaa44, timer: 3 }],
    totalKills: 0,
    elapsedTime: 0,
    freezeTimer: 0,
    meteorCooldown: 0,
  };
}

export function spawnEnemy(state: SiegeState, type: EnemyType): void {
  const def = ENEMIES[type];
  const spawn = state.path[0];
  const T = SiegeConfig.TILE_SIZE;
  state.enemies.push({
    id: `enemy_${state.enemyIdCounter++}`,
    type, hp: def.hp, maxHp: def.hp, speed: def.speed, armor: def.armor,
    x: spawn.x * T + T / 2, y: spawn.y * T + T / 2,
    pathIndex: 0, slowTimer: 0, slowAmount: 0,
    alive: true, reachedEnd: false,
  });
}
