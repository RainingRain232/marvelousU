// ---------------------------------------------------------------------------
// The Shifting Labyrinth – Maze Generation & Wall Shifting
// ---------------------------------------------------------------------------
// Randomized DFS + extra loop passages for interesting navigation.
// Trap placement, pickup distribution, wall shifting with connectivity.
// ---------------------------------------------------------------------------

import type { MazeGrid, LabyrinthState, LabyrinthPickup, Trap } from "../types";
import { CellType, PickupKind, TrapType } from "../types";
import { LABYRINTH_BALANCE as B } from "../config/LabyrinthBalance";

// ---------------------------------------------------------------------------
// Maze generation (randomized DFS + extra loops)
// ---------------------------------------------------------------------------

export function generateMaze(width: number, height: number, floor: number): MazeGrid {
  const w = width % 2 === 0 ? width + 1 : width;
  const h = height % 2 === 0 ? height + 1 : height;

  const cells: CellType[][] = [];
  for (let r = 0; r < h; r++) {
    cells[r] = [];
    for (let c = 0; c < w; c++) {
      cells[r][c] = CellType.WALL;
    }
  }

  // DFS carve from (1,1)
  const stack: [number, number][] = [[1, 1]];
  cells[1][1] = CellType.FLOOR;
  const dirs: [number, number][] = [[0, 2], [0, -2], [2, 0], [-2, 0]];

  while (stack.length > 0) {
    const [cr, cc] = stack[stack.length - 1];
    const shuffled = dirs.slice().sort(() => Math.random() - 0.5);
    let carved = false;

    for (const [dr, dc] of shuffled) {
      const nr = cr + dr;
      const nc = cc + dc;
      if (nr > 0 && nr < h - 1 && nc > 0 && nc < w - 1 && cells[nr][nc] === CellType.WALL) {
        cells[cr + dr / 2][cc + dc / 2] = CellType.FLOOR;
        cells[nr][nc] = CellType.FLOOR;
        stack.push([nr, nc]);
        carved = true;
        break;
      }
    }
    if (!carved) stack.pop();
  }

  // Carve extra loop passages (remove some walls to create alternate routes)
  const extraPassages = B.EXTRA_PASSAGES + Math.floor((floor - 1) * B.EXTRA_PASSAGES_PER_FLOOR);
  const wallCandidates: [number, number][] = [];
  for (let r = 2; r < h - 2; r++) {
    for (let c = 2; c < w - 2; c++) {
      if (cells[r][c] !== CellType.WALL) continue;
      // Wall between two floor cells (horizontal or vertical)
      const horizOpen = c > 0 && c < w - 1 &&
        cells[r][c - 1] === CellType.FLOOR && cells[r][c + 1] === CellType.FLOOR;
      const vertOpen = r > 0 && r < h - 1 &&
        cells[r - 1][c] === CellType.FLOOR && cells[r + 1][c] === CellType.FLOOR;
      if (horizOpen || vertOpen) wallCandidates.push([r, c]);
    }
  }
  _shuffle(wallCandidates);
  for (let i = 0; i < Math.min(extraPassages, wallCandidates.length); i++) {
    const [r, c] = wallCandidates[i];
    cells[r][c] = CellType.FLOOR;
  }

  // Place exit
  let exitRow = h - 2;
  let exitCol = w - 2;
  if (exitRow % 2 === 0) exitRow--;
  if (exitCol % 2 === 0) exitCol--;
  cells[exitRow][exitCol] = CellType.EXIT;

  return { width: w, height: h, cells, exitRow, exitCol };
}

// ---------------------------------------------------------------------------
// Populate pickups
// ---------------------------------------------------------------------------

export function populatePickups(state: LabyrinthState, stoneUnlocked = false): void {
  const { maze, runesRequired, floor } = state;
  const floorCells = _collectFloorCells(maze);
  _shuffle(floorCells);

  const cs = B.CELL_SIZE;
  const pickups: LabyrinthPickup[] = [];
  let idx = 0;

  // Runes
  for (let i = 0; i < runesRequired && idx < floorCells.length; i++, idx++) {
    const [r, c] = floorCells[idx];
    pickups.push({
      x: (c + 0.5) * cs, y: (r + 0.5) * cs,
      kind: PickupKind.RUNE, collected: false,
      bobPhase: Math.random() * Math.PI * 2,
    });
  }

  // Fuel & special pickups
  const fuelCount = B.FUEL_PICKUPS_BASE + Math.floor(floor * B.FUEL_PICKUPS_PER_FLOOR);
  for (let i = 0; i < fuelCount && idx < floorCells.length; i++, idx++) {
    const [r, c] = floorCells[idx];
    let kind: PickupKind = PickupKind.TORCH_FUEL;
    if (Math.random() < B.SPECIAL_PICKUP_CHANCE) {
      const roll = Math.random();
      if (roll < B.DECOY_PICKUP_CHANCE) {
        kind = PickupKind.DECOY;
      } else if (roll < 0.5) {
        kind = PickupKind.SPEED_BOOST;
      } else {
        kind = PickupKind.INVISIBILITY;
      }
    }
    pickups.push({
      x: (c + 0.5) * cs, y: (r + 0.5) * cs,
      kind, collected: false,
      bobPhase: Math.random() * Math.PI * 2,
    });
  }

  // Treasure chests
  for (let i = 0; i < B.TREASURE_PER_FLOOR && idx < floorCells.length; i++, idx++) {
    const [r, c] = floorCells[idx];
    pickups.push({
      x: (c + 0.5) * cs, y: (r + 0.5) * cs,
      kind: PickupKind.TREASURE, collected: false,
      bobPhase: Math.random() * Math.PI * 2,
    });
  }

  // Stone pickups (if unlocked — check state doesn't carry meta, so always place them;
  // collection gated by stoneThrowUnlocked in the game loop)
  const stoneCount = stoneUnlocked ? B.STONE_PICKUPS_PER_FLOOR : 0;
  for (let i = 0; i < stoneCount && idx < floorCells.length; i++, idx++) {
    const [r, c] = floorCells[idx];
    pickups.push({
      x: (c + 0.5) * cs, y: (r + 0.5) * cs,
      kind: PickupKind.STONE, collected: false,
      bobPhase: Math.random() * Math.PI * 2,
    });
  }

  state.pickups = pickups;
}

// ---------------------------------------------------------------------------
// Populate traps
// ---------------------------------------------------------------------------

export function populateTraps(state: LabyrinthState): void {
  const { maze, floor } = state;
  if (floor < B.TRAP_START_FLOOR) { state.traps = []; return; }

  const floorCells = _collectFloorCells(maze);
  _shuffle(floorCells);

  const trapCount = Math.min(
    B.TRAPS_BASE + (floor - B.TRAP_START_FLOOR) * B.TRAPS_PER_FLOOR,
    B.TRAPS_MAX,
  );

  // Skip cells near pickups
  const cs = B.CELL_SIZE;
  const pickupCells = new Set(state.pickups.map(p =>
    Math.floor(p.y / cs) * maze.width + Math.floor(p.x / cs)
  ));

  const traps: Trap[] = [];
  let placed = 0;

  for (const [r, c] of floorCells) {
    if (placed >= trapCount) break;
    if (pickupCells.has(r * maze.width + c)) continue;
    // Don't place near start
    if (r <= 3 && c <= 3) continue;

    // Choose trap type based on context
    const roll = Math.random();
    let type: TrapType;
    if (roll < 0.45) {
      type = TrapType.SPIKE;
    } else if (roll < 0.75) {
      // Arrow trap needs a wall on one side
      const dir = _findArrowDir(maze, r, c);
      if (dir < 0) continue;
      traps.push({
        row: r, col: c, type: TrapType.ARROW,
        timer: Math.random() * B.ARROW_FIRE_INTERVAL,
        active: false, direction: dir, triggered: false,
      });
      placed++;
      continue;
    } else {
      type = TrapType.GAS;
    }

    traps.push({
      row: r, col: c, type,
      timer: Math.random() * (type === TrapType.SPIKE ? B.SPIKE_CYCLE_TIME : B.GAS_CYCLE_TIME),
      active: false, direction: 0, triggered: false,
    });
    placed++;
  }

  state.traps = traps;
}

// ---------------------------------------------------------------------------
// Populate safe alcoves (minotaur-free rooms)
// ---------------------------------------------------------------------------

export function populateAlcoves(state: LabyrinthState, disabled = false): void {
  if (disabled) return;
  const { maze, floor } = state;
  const count = Math.min(
    Math.floor(B.ALCOVE_COUNT_BASE + (floor - 1) * B.ALCOVE_COUNT_PER_FLOOR),
    B.ALCOVE_MAX,
  );

  // Find dead-end cells (floor cells with exactly 1 non-wall neighbor)
  const deadEnds: [number, number][] = [];
  for (let r = 1; r < maze.height - 1; r++) {
    for (let c = 1; c < maze.width - 1; c++) {
      if (maze.cells[r][c] !== CellType.FLOOR) continue;
      if (r <= 2 && c <= 2) continue; // not near spawn
      if (r === maze.exitRow && c === maze.exitCol) continue;
      let neighbors = 0;
      for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        if (maze.cells[r + dr]?.[c + dc] !== CellType.WALL) neighbors++;
      }
      if (neighbors === 1) deadEnds.push([r, c]);
    }
  }

  _shuffle(deadEnds);
  for (let i = 0; i < Math.min(count, deadEnds.length); i++) {
    const [r, c] = deadEnds[i];
    maze.cells[r][c] = CellType.ALCOVE;
  }
}

/** Find a direction for an arrow trap (wall on one side, open corridor) */
function _findArrowDir(maze: MazeGrid, r: number, c: number): number {
  const { cells, width, height } = maze;
  const dirs = [
    { dr: 0, dc: 1, d: 0 },  // right
    { dr: 1, dc: 0, d: 1 },  // down
    { dr: 0, dc: -1, d: 2 }, // left
    { dr: -1, dc: 0, d: 3 }, // up
  ];
  const valid: number[] = [];
  for (const { dr, dc, d } of dirs) {
    const wr = r - dr;
    const wc = c - dc;
    const tr = r + dr;
    const tc = c + dc;
    // Wall behind, floor in front
    if (wr >= 0 && wr < height && wc >= 0 && wc < width &&
        tr >= 0 && tr < height && tc >= 0 && tc < width) {
      if (cells[wr][wc] === CellType.WALL && cells[tr][tc] !== CellType.WALL) {
        valid.push(d);
      }
    }
  }
  if (valid.length === 0) return -1;
  return valid[Math.floor(Math.random() * valid.length)];
}

// ---------------------------------------------------------------------------
// Wall shifting
// ---------------------------------------------------------------------------

export function shiftWalls(state: LabyrinthState): void {
  const { maze } = state;
  const { cells, width, height } = maze;
  const cs = B.CELL_SIZE;

  const totalInner = (width - 2) * (height - 2);
  const flipsTarget = Math.max(4, Math.floor(totalInner * B.SHIFT_FRACTION));

  const candidates: [number, number][] = [];
  for (let r = 1; r < height - 1; r++) {
    for (let c = 1; c < width - 1; c++) {
      if (r <= 2 && c <= 2) continue;
      if (r === maze.exitRow && c === maze.exitCol) continue;
      candidates.push([r, c]);
    }
  }
  _shuffle(candidates);

  const pickupCells = new Set(
    state.pickups.filter(p => !p.collected).map(p =>
      Math.floor(p.y / cs) * width + Math.floor(p.x / cs))
  );
  const trapCells = new Set(state.traps.map(t => t.row * width + t.col));

  let flips = 0;
  for (const [r, c] of candidates) {
    if (flips >= flipsTarget) break;

    const key = r * width + c;

    // Skip occupied cells
    const px = Math.floor(state.player.x / cs);
    const py = Math.floor(state.player.y / cs);
    if (c === px && r === py) continue;
    let minoOccupied = false;
    for (const m of state.minotaurs) {
      if (Math.floor(m.x / cs) === c && Math.floor(m.y / cs) === r) {
        minoOccupied = true;
        break;
      }
    }
    if (minoOccupied) continue;
    if (pickupCells.has(key) || trapCells.has(key)) continue;

    if (cells[r][c] === CellType.WALL) {
      cells[r][c] = CellType.FLOOR;
      flips++;
    } else if (cells[r][c] === CellType.FLOOR) {
      cells[r][c] = CellType.WALL;
      flips++;
    }
  }

  ensureConnectivity(state);
}

// ---------------------------------------------------------------------------
// Connectivity
// ---------------------------------------------------------------------------

function ensureConnectivity(state: LabyrinthState): void {
  const { maze } = state;
  const cs = B.CELL_SIZE;
  const pc = Math.floor(state.player.x / cs);
  const pr = Math.floor(state.player.y / cs);

  const visited = new Set<number>();
  const queue: [number, number][] = [[pr, pc]];
  visited.add(pr * maze.width + pc);

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= maze.height || nc < 0 || nc >= maze.width) continue;
      const key = nr * maze.width + nc;
      if (visited.has(key)) continue;
      if (maze.cells[nr][nc] === CellType.WALL) continue;
      visited.add(key);
      queue.push([nr, nc]);
    }
  }

  if (!visited.has(maze.exitRow * maze.width + maze.exitCol)) {
    _carvePath(maze, pr, pc, maze.exitRow, maze.exitCol);
  }
  for (const pickup of state.pickups) {
    if (pickup.collected) continue;
    const pkc = Math.floor(pickup.x / cs);
    const pkr = Math.floor(pickup.y / cs);
    if (!visited.has(pkr * maze.width + pkc)) {
      _carvePath(maze, pr, pc, pkr, pkc);
    }
  }
}

function _carvePath(maze: MazeGrid, r1: number, c1: number, r2: number, c2: number): void {
  let r = r1, c = c1;
  while (r !== r2 || c !== c2) {
    if (maze.cells[r][c] === CellType.WALL) maze.cells[r][c] = CellType.FLOOR;
    if (r !== r2 && (c === c2 || Math.random() < 0.5)) r += r < r2 ? 1 : -1;
    else if (c !== c2) c += c < c2 ? 1 : -1;
  }
  if (maze.cells[r][c] === CellType.WALL) maze.cells[r][c] = CellType.FLOOR;
}

// ---------------------------------------------------------------------------
// BFS pathfinding
// ---------------------------------------------------------------------------

export function findPath(
  maze: MazeGrid,
  startR: number, startC: number,
  goalR: number, goalC: number,
  canEnterAlcoves = false,
): { x: number; y: number }[] {
  if (startR === goalR && startC === goalC) return [];

  const { width, height, cells } = maze;
  const visited = new Set<number>();
  const parent = new Map<number, number>();
  const key = (r: number, c: number) => r * width + c;
  const startKey = key(startR, startC);
  const goalKey = key(goalR, goalC);

  const queue: number[] = [startKey];
  visited.add(startKey);

  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (cur === goalKey) break;
    const cr = Math.floor(cur / width);
    const cc = cur % width;

    for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nr = cr + dr;
      const nc = cc + dc;
      if (nr < 0 || nr >= height || nc < 0 || nc >= width) continue;
      const nk = key(nr, nc);
      if (visited.has(nk)) continue;
      if (cells[nr][nc] === CellType.WALL) continue;
      if (cells[nr][nc] === CellType.ALCOVE && !canEnterAlcoves) continue;
      visited.add(nk);
      parent.set(nk, cur);
      queue.push(nk);
    }
  }

  if (!parent.has(goalKey) && startKey !== goalKey) return [];

  const path: { x: number; y: number }[] = [];
  let cur = goalKey;
  while (cur !== startKey) {
    const r = Math.floor(cur / width);
    const c = cur % width;
    path.unshift({ x: c, y: r });
    const p = parent.get(cur);
    if (p === undefined) break;
    cur = p;
  }
  return path;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _collectFloorCells(maze: MazeGrid): [number, number][] {
  const result: [number, number][] = [];
  for (let r = 1; r < maze.height - 1; r++) {
    for (let c = 1; c < maze.width - 1; c++) {
      if (maze.cells[r][c] !== CellType.WALL && !(r <= 2 && c <= 2)) {
        if (r !== maze.exitRow || c !== maze.exitCol) {
          result.push([r, c]);
        }
      }
    }
  }
  return result;
}

function _shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
