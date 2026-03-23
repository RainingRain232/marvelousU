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
  particles: { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: number; size: number }[];
  announcements: { text: string; color: number; timer: number }[];
  totalKills: number;
  elapsedTime: number;
}

// ---------------------------------------------------------------------------
// Map generation — S-shaped path with buildable areas
// ---------------------------------------------------------------------------

export function createSiegeMap(): { grid: MapCell[][]; path: { x: number; y: number }[] } {
  const { GRID_COLS, GRID_ROWS } = SiegeConfig;
  const grid: MapCell[][] = [];
  for (let y = 0; y < GRID_ROWS; y++) {
    grid[y] = [];
    for (let x = 0; x < GRID_COLS; x++) {
      grid[y][x] = { type: "buildable", towerId: null };
    }
  }

  // Create S-shaped path
  const path: { x: number; y: number }[] = [];
  // Enter from left, row 2
  let cx = 0, cy = 2;
  // Right across
  for (; cx < GRID_COLS - 4; cx++) { path.push({ x: cx, y: cy }); grid[cy][cx].type = "path"; }
  // Down
  for (; cy < GRID_ROWS - 3; cy++) { path.push({ x: cx, y: cy }); grid[cy][cx].type = "path"; }
  // Left across
  for (; cx > 3; cx--) { path.push({ x: cx, y: cy }); grid[cy][cx].type = "path"; }
  // Down
  for (; cy < GRID_ROWS - 1; cy++) { path.push({ x: cx, y: cy }); grid[cy][cx].type = "path"; }
  // Right to castle
  for (; cx < GRID_COLS; cx++) { path.push({ x: cx, y: cy }); grid[cy][cx].type = "path"; }

  // Mark spawn and castle
  grid[2][0].type = "spawn";
  grid[GRID_ROWS - 1][GRID_COLS - 1].type = "castle";

  // Block some cells for variety
  const blocked = [[1, 0], [1, 1], [0, 0], [0, 1], [GRID_COLS - 1, 0], [GRID_COLS - 2, 0]];
  for (const [bx, by] of blocked) {
    if (by < GRID_ROWS && bx < GRID_COLS && grid[by][bx].type === "buildable") {
      grid[by][bx].type = "blocked";
    }
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
    particles: [],
    announcements: [{ text: "Place towers to defend!", color: 0xffaa44, timer: 3 }],
    totalKills: 0,
    elapsedTime: 0,
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
