// ---------------------------------------------------------------------------
// Labyrinth mode — maze generation, minotaur AI, physics, game logic
// ---------------------------------------------------------------------------

import type { LabyrinthState, MazeCell, FloorDecor } from "../state/LabyrinthState";
import { cellToPixel, pixelToCell } from "../state/LabyrinthState";
import { LabyrinthConfig, FLOORS, ITEMS, INSCRIPTIONS, DIFFICULTIES, type ItemType, type TrapType, type HazardType } from "../config/LabyrinthConfig";

/** Emit a floating score popup at the player's position. */
function _scorePopup(state: LabyrinthState, text: string, color: number): void {
  state.scorePopups.push({ x: state.px, y: state.py, text, color, life: 1.5, maxLife: 1.5 });
}

// ---- Maze generation (recursive backtracker) --------------------------------

export function generateMaze(state: LabyrinthState): void {
  const { maze, cols, rows } = state;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      maze[r][c] = { top: true, right: true, bottom: true, left: true, visited: false, explored: false };
    }
  }

  const stack: { col: number; row: number }[] = [];
  const start = { col: 1, row: 1 };
  maze[start.row][start.col].visited = true;
  stack.push(start);

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const neighbors = _unvisitedNeighbors(maze, current.col, current.row, cols, rows);
    if (neighbors.length === 0) {
      stack.pop();
    } else {
      const next = neighbors[Math.floor(Math.random() * neighbors.length)];
      _removeWall(maze, current.col, current.row, next.col, next.row);
      maze[next.row][next.col].visited = true;
      stack.push(next);
    }
  }

  // Extra passages for loops
  const extraPassages = Math.floor(cols * rows * 0.04);
  for (let i = 0; i < extraPassages; i++) {
    const c = 1 + Math.floor(Math.random() * (cols - 2));
    const r = 1 + Math.floor(Math.random() * (rows - 2));
    const dir = Math.floor(Math.random() * 4);
    if (dir === 0 && r > 0) _removeWall(maze, c, r, c, r - 1);
    else if (dir === 1 && c < cols - 1) _removeWall(maze, c, r, c + 1, r);
    else if (dir === 2 && r < rows - 1) _removeWall(maze, c, r, c, r + 1);
    else if (dir === 3 && c > 0) _removeWall(maze, c, r, c - 1, r);
  }

  maze[1][1].explored = true;

  // Carve open rooms (2x2 clearings)
  _carveRooms(state);

  _placeRelics(state);
  _placeItems(state);
  _placeTraps(state);
  _placeHazards(state);
  _placeDecor(state);
  _placeSconces(state);
  _placeSecrets(state);
  _placeInscriptions(state);
  _initAmbientDust(state);

  // Place minotaur
  const minoStart = cellToPixel(cols - 2, rows - 2);
  state.mx = minoStart.x;
  state.my = minoStart.y;
  state.mCol = cols - 2;
  state.mRow = rows - 2;

  state.exitCol = Math.floor(cols / 2);
  state.exitRow = Math.floor(rows / 2);

  // Floor 1 on Easy/Normal: minotaur starts sleeping (onboarding)
  if (state.floor === 0 && (state.difficulty === "easy" || state.difficulty === "normal")) {
    state.minoState = "sleep" as any;
    state.minoStateTimer = LabyrinthConfig.MINO_SLEEP_DURATION * 2; // extra long initial sleep
  }

  // Shadow minotaur on floor 3 (or all floors on nightmare)
  const fc = FLOORS[Math.min(state.floor, FLOORS.length - 1)];
  const nightmareMode = state.difficulty === "nightmare";
  if (fc.minotaurCount >= 2 || nightmareMode) {
    const sp = cellToPixel(1, rows - 2);
    state.shadow = {
      x: sp.x, y: sp.y,
      col: 1, row: rows - 2,
      speed: fc.minoSpeedBase * LabyrinthConfig.SHADOW_SPEED_MULT,
      path: [], angle: 0, stunTimer: 0, patrolTarget: null,
    };
  }
}

function _unvisitedNeighbors(
  maze: MazeCell[][], col: number, row: number, cols: number, rows: number,
): { col: number; row: number }[] {
  const n: { col: number; row: number }[] = [];
  if (row > 0 && !maze[row - 1][col].visited) n.push({ col, row: row - 1 });
  if (row < rows - 1 && !maze[row + 1][col].visited) n.push({ col, row: row + 1 });
  if (col > 0 && !maze[row][col - 1].visited) n.push({ col: col - 1, row });
  if (col < cols - 1 && !maze[row][col + 1].visited) n.push({ col: col + 1, row });
  return n;
}

function _removeWall(maze: MazeCell[][], c1: number, r1: number, c2: number, r2: number): void {
  if (c2 === c1 + 1) { maze[r1][c1].right = false; maze[r2][c2].left = false; }
  if (c2 === c1 - 1) { maze[r1][c1].left = false; maze[r2][c2].right = false; }
  if (r2 === r1 + 1) { maze[r1][c1].bottom = false; maze[r2][c2].top = false; }
  if (r2 === r1 - 1) { maze[r1][c1].top = false; maze[r2][c2].bottom = false; }
}

// ---- Placement helpers ------------------------------------------------------

function _placeRelics(state: LabyrinthState): void {
  const { maze, cols, rows } = state;
  const fc = FLOORS[Math.min(state.floor, FLOORS.length - 1)];
  state.relics = [];
  const candidates: { col: number; row: number; score: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const dist = Math.abs(c - 1) + Math.abs(r - 1);
      const wallCount = [maze[r][c].top, maze[r][c].right, maze[r][c].bottom, maze[r][c].left].filter(Boolean).length;
      if (c <= 2 && r <= 2) continue;
      if (c === state.exitCol && r === state.exitRow) continue;
      candidates.push({ col: c, row: r, score: dist + wallCount * 3 + Math.random() * 5 });
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  const placed: { col: number; row: number }[] = [];
  let idx = 0;
  while (state.relics.length < fc.relicCount && idx < candidates.length) {
    const cand = candidates[idx++];
    if (placed.some(p => Math.abs(p.col - cand.col) + Math.abs(p.row - cand.row) < 4)) continue;
    placed.push(cand);
    state.relics.push({ col: cand.col, row: cand.row, collected: false, glow: Math.random() * Math.PI * 2 });
  }
}

function _placeItems(state: LabyrinthState): void {
  const { cols, rows } = state;
  const fc = FLOORS[Math.min(state.floor, FLOORS.length - 1)];
  state.items = [];
  const pool: ItemType[] = [
    "torch", "torch", "speed", "speed", "caltrops", "caltrops", "reveal", "invis",
    ...(state.floor >= 1 ? ["shield", "compass", "decoy"] as ItemType[] : []),
    ...(state.floor >= 2 ? ["shield", "speed", "invis", "decoy"] as ItemType[] : []),
  ];
  const used = _occupiedSet(state);
  for (let i = 0; i < fc.itemCount && i < pool.length; i++) {
    const pos = _randomFreeCell(cols, rows, used);
    state.items.push({ col: pos.col, row: pos.row, type: pool[i], collected: false });
  }
}

function _placeTraps(state: LabyrinthState): void {
  const { cols, rows } = state;
  const fc = FLOORS[Math.min(state.floor, FLOORS.length - 1)];
  state.traps = [];
  const trapTypes: TrapType[] = ["spike", "alarm", "web", "crumble"];
  const used = _occupiedSet(state);
  for (let i = 0; i < fc.trapCount; i++) {
    const pos = _randomFreeCell(cols, rows, used, true);
    const type = trapTypes[Math.floor(Math.random() * trapTypes.length)];
    state.traps.push({ col: pos.col, row: pos.row, type, triggered: false, crumbleTimer: 0, visible: type === "web" });
  }
}

function _placeDecor(state: LabyrinthState): void {
  const { cols, rows } = state;
  state.decor = [];
  const types: FloorDecor["type"][] = ["bones", "crack", "moss", "bloodstain", "rubble", "cobweb"];
  const count = Math.floor(cols * rows * 0.15);
  for (let i = 0; i < count; i++) {
    state.decor.push({
      col: Math.floor(Math.random() * cols), row: Math.floor(Math.random() * rows),
      type: types[Math.floor(Math.random() * types.length)],
      rotation: Math.random() * Math.PI * 2, size: 0.5 + Math.random() * 0.8,
    });
  }
}

function _placeSconces(state: LabyrinthState): void {
  const { maze, cols, rows } = state;
  const cs = LabyrinthConfig.CELL_SIZE;
  state.sconces = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = maze[r][c];
      // Place sconces on walls at random with configured density
      if (cell.top && Math.random() < LabyrinthConfig.SCONCE_DENSITY) {
        state.sconces.push({ x: c * cs + cs / 2, y: r * cs + 2, col: c, row: r, flicker: Math.random() * Math.PI * 2 });
      }
      if (cell.left && Math.random() < LabyrinthConfig.SCONCE_DENSITY) {
        state.sconces.push({ x: c * cs + 2, y: r * cs + cs / 2, col: c, row: r, flicker: Math.random() * Math.PI * 2 });
      }
    }
  }
}

function _carveRooms(state: LabyrinthState): void {
  const { maze, cols, rows } = state;
  const fc = FLOORS[Math.min(state.floor, FLOORS.length - 1)];
  for (let i = 0; i < fc.roomCount; i++) {
    const rc = 3 + Math.floor(Math.random() * (cols - 6));
    const rr = 3 + Math.floor(Math.random() * (rows - 6));
    // Clear internal walls of a 2x2 block
    _removeWall(maze, rc, rr, rc + 1, rr);
    _removeWall(maze, rc, rr, rc, rr + 1);
    _removeWall(maze, rc + 1, rr, rc + 1, rr + 1);
    _removeWall(maze, rc, rr + 1, rc + 1, rr + 1);
  }
}

function _placeHazards(state: LabyrinthState): void {
  const { cols, rows } = state;
  const fc = FLOORS[Math.min(state.floor, FLOORS.length - 1)];
  state.hazards = [];
  const used = _occupiedSet(state);
  const types: HazardType[] = ["water", "water", "darkness"];
  for (let i = 0; i < fc.hazardCount; i++) {
    const pos = _randomFreeCell(cols, rows, used, true);
    state.hazards.push({ col: pos.col, row: pos.row, type: types[i % types.length] });
  }
}

/** BFS-based corridor distance (respects walls). Returns -1 if unreachable within maxDist. */
function _corridorDistance(
  maze: MazeCell[][], fromCol: number, fromRow: number, toCol: number, toRow: number,
  cols: number, rows: number, maxDist: number,
): number {
  if (fromCol === toCol && fromRow === toRow) return 0;
  const visited = new Set<string>();
  const queue: { col: number; row: number; dist: number }[] = [];
  queue.push({ col: fromCol, row: fromRow, dist: 0 });
  visited.add(`${fromCol},${fromRow}`);
  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (cur.dist >= maxDist) continue;
    const cell = maze[cur.row][cur.col];
    const dirs: [boolean, number, number][] = [
      [!cell.top, 0, -1], [!cell.right, 1, 0], [!cell.bottom, 0, 1], [!cell.left, -1, 0],
    ];
    for (const [open, dc, dr] of dirs) {
      if (!open) continue;
      const nc = cur.col + dc, nr = cur.row + dr;
      if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
      if (nc === toCol && nr === toRow) return cur.dist + 1;
      const key = `${nc},${nr}`;
      if (visited.has(key)) continue;
      visited.add(key);
      queue.push({ col: nc, row: nr, dist: cur.dist + 1 });
    }
  }
  return -1; // unreachable
}

function _placeSecrets(state: LabyrinthState): void {
  const { maze, cols, rows } = state;
  const fc = FLOORS[Math.min(state.floor, FLOORS.length - 1)];
  state.secrets = [];
  const bonusItems: ItemType[] = ["shield", "reveal", "invis", "compass", "decoy", "speed"];

  for (let i = 0; i < fc.secretCount; i++) {
    let attempts = 0;
    while (attempts < 80) {
      attempts++;
      const c = 2 + Math.floor(Math.random() * (cols - 4));
      const r = 2 + Math.floor(Math.random() * (rows - 4));
      // Find a wall that's present and has a cell on the other side
      const dirs: (0 | 1 | 2 | 3)[] = [];
      if (maze[r][c].top && r > 0) dirs.push(0);
      if (maze[r][c].right && c < cols - 1) dirs.push(1);
      if (maze[r][c].bottom && r < rows - 1) dirs.push(2);
      if (maze[r][c].left && c > 0) dirs.push(3);
      if (dirs.length === 0) continue;
      const dir = dirs[Math.floor(Math.random() * dirs.length)];
      // Check no other secret at this location
      if (state.secrets.some(s => s.col === c && s.row === r && s.dir === dir)) continue;
      state.secrets.push({
        col: c, row: r, dir,
        hitsRemaining: LabyrinthConfig.SECRET_WALL_HITS,
        revealed: false,
        bonusItem: bonusItems[Math.floor(Math.random() * bonusItems.length)],
      });
      break;
    }
  }
}

function _placeInscriptions(state: LabyrinthState): void {
  const { cols, rows } = state;
  const fc = FLOORS[Math.min(state.floor, FLOORS.length - 1)];
  state.inscriptions = [];
  const used = _occupiedSet(state);
  const shuffled = [...INSCRIPTIONS].sort(() => Math.random() - 0.5);
  for (let i = 0; i < fc.inscriptionCount && i < shuffled.length; i++) {
    const pos = _randomFreeCell(cols, rows, used);
    state.inscriptions.push({ col: pos.col, row: pos.row, text: shuffled[i], seen: false });
  }
}

function _initAmbientDust(state: LabyrinthState): void {
  state.ambientDust = [];
  const cs = LabyrinthConfig.CELL_SIZE;
  for (let i = 0; i < LabyrinthConfig.AMBIENT_DUST_COUNT; i++) {
    state.ambientDust.push({
      x: Math.random() * state.cols * cs,
      y: Math.random() * state.rows * cs,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 4 - 2,
      life: 3 + Math.random() * 5,
      maxLife: 8,
      size: 0.5 + Math.random() * 1,
    });
  }
}

function _occupiedSet(state: LabyrinthState): Set<string> {
  const used = new Set<string>();
  used.add("1,1");
  used.add(`${state.exitCol},${state.exitRow}`);
  for (const relic of state.relics) used.add(`${relic.col},${relic.row}`);
  for (const item of state.items) used.add(`${item.col},${item.row}`);
  for (const trap of state.traps) used.add(`${trap.col},${trap.row}`);
  return used;
}

function _randomFreeCell(cols: number, rows: number, used: Set<string>, interior = false): { col: number; row: number } {
  let col: number, row: number, attempts = 0;
  const min = interior ? 1 : 0;
  const colMax = interior ? cols - 2 : cols;
  const rowMax = interior ? rows - 2 : rows;
  do {
    col = min + Math.floor(Math.random() * (colMax - min));
    row = min + Math.floor(Math.random() * (rowMax - min));
    attempts++;
  } while (used.has(`${col},${row}`) && attempts < 100);
  used.add(`${col},${row}`);
  return { col, row };
}

// ---- Maze shifting ----------------------------------------------------------

export function shiftMaze(state: LabyrinthState): void {
  const { maze, cols, rows } = state;
  const fc = FLOORS[Math.min(state.floor, FLOORS.length - 1)];
  for (let i = 0; i < fc.shiftWalls; i++) {
    const c = 1 + Math.floor(Math.random() * (cols - 2));
    const r = 1 + Math.floor(Math.random() * (rows - 2));
    const dir = Math.floor(Math.random() * 4);
    if (dir === 0 && r > 0) { maze[r][c].top = !maze[r][c].top; maze[r - 1][c].bottom = !maze[r - 1][c].bottom; }
    else if (dir === 1 && c < cols - 1) { maze[r][c].right = !maze[r][c].right; maze[r][c + 1].left = !maze[r][c + 1].left; }
    else if (dir === 2 && r < rows - 1) { maze[r][c].bottom = !maze[r][c].bottom; maze[r + 1][c].top = !maze[r + 1][c].top; }
    else if (dir === 3 && c > 0) { maze[r][c].left = !maze[r][c].left; maze[r][c - 1].right = !maze[r][c - 1].right; }
  }
  _ensureNotTrapped(maze, state.pCol, state.pRow, cols, rows);
  _ensureNotTrapped(maze, state.mCol, state.mRow, cols, rows);
  _ensureNotTrapped(maze, state.exitCol, state.exitRow, cols, rows);
  if (state.shadow) _ensureNotTrapped(maze, state.shadow.col, state.shadow.row, cols, rows);

  // Verify exit is reachable from player — if not, open a path
  const pathToExit = _bfs(maze, state.pCol, state.pRow, state.exitCol, state.exitRow, cols, rows);
  if (pathToExit.length === 0 && (state.pCol !== state.exitCol || state.pRow !== state.exitRow)) {
    // Emergency: carve a direct corridor from player toward exit
    let cc = state.pCol, cr = state.pRow;
    for (let step = 0; step < cols + rows; step++) {
      if (cc === state.exitCol && cr === state.exitRow) break;
      if (cc < state.exitCol && cc < cols - 1) { _removeWall(maze, cc, cr, cc + 1, cr); cc++; }
      else if (cc > state.exitCol && cc > 0) { _removeWall(maze, cc, cr, cc - 1, cr); cc--; }
      else if (cr < state.exitRow && cr < rows - 1) { _removeWall(maze, cc, cr, cc, cr + 1); cr++; }
      else if (cr > state.exitRow && cr > 0) { _removeWall(maze, cc, cr, cc, cr - 1); cr--; }
      else break;
    }
  }

  state.shiftCount++;
  state.shiftFlash = 1;
  state.screenShake = 0.3;
  state.announcements.push({ text: "The labyrinth shifts...", color: 0x8866aa, timer: 2 });
  state.minoPath = [];
  if (state.shadow) state.shadow.path = [];
}

function _ensureNotTrapped(maze: MazeCell[][], col: number, row: number, cols: number, rows: number): void {
  const cell = maze[row][col];
  if ([cell.top, cell.right, cell.bottom, cell.left].filter(Boolean).length < 4) return;
  const options: number[] = [];
  if (row > 0) options.push(0);
  if (col < cols - 1) options.push(1);
  if (row < rows - 1) options.push(2);
  if (col > 0) options.push(3);
  const dir = options[Math.floor(Math.random() * options.length)];
  if (dir === 0) { cell.top = false; maze[row - 1][col].bottom = false; }
  else if (dir === 1) { cell.right = false; maze[row][col + 1].left = false; }
  else if (dir === 2) { cell.bottom = false; maze[row + 1][col].top = false; }
  else if (dir === 3) { cell.left = false; maze[row][col - 1].right = false; }
}

// ---- BFS pathfinding --------------------------------------------------------

function _bfs(
  maze: MazeCell[][], fromCol: number, fromRow: number, toCol: number, toRow: number,
  cols: number, rows: number,
): { col: number; row: number }[] {
  const visited = new Set<string>();
  const queue: { col: number; row: number; path: { col: number; row: number }[] }[] = [];
  queue.push({ col: fromCol, row: fromRow, path: [] });
  visited.add(`${fromCol},${fromRow}`);
  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (cur.col === toCol && cur.row === toRow) return cur.path;
    const cell = maze[cur.row][cur.col];
    const dirs: [boolean, number, number][] = [
      [!cell.top, 0, -1], [!cell.right, 1, 0], [!cell.bottom, 0, 1], [!cell.left, -1, 0],
    ];
    for (const [open, dc, dr] of dirs) {
      if (!open) continue;
      const nc = cur.col + dc, nr = cur.row + dr;
      if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
      const key = `${nc},${nr}`;
      if (visited.has(key)) continue;
      visited.add(key);
      queue.push({ col: nc, row: nr, path: [...cur.path, { col: nc, row: nr }] });
    }
  }
  return [];
}

function _hasLineOfSight(
  maze: MazeCell[][], fromCol: number, fromRow: number, toCol: number, toRow: number,
): boolean {
  if (fromCol !== toCol && fromRow !== toRow) return false;
  if (fromCol === toCol) {
    const minR = Math.min(fromRow, toRow), maxR = Math.max(fromRow, toRow);
    for (let r = minR; r < maxR; r++) { if (maze[r][fromCol].bottom) return false; }
    return true;
  }
  const minC = Math.min(fromCol, toCol), maxC = Math.max(fromCol, toCol);
  for (let c = minC; c < maxC; c++) { if (maze[fromRow][c].right) return false; }
  return true;
}

function _passableNeighbors(
  maze: MazeCell[][], col: number, row: number, cols: number, rows: number,
): { col: number; row: number }[] {
  const cell = maze[row][col];
  const n: { col: number; row: number }[] = [];
  if (!cell.top && row > 0) n.push({ col, row: row - 1 });
  if (!cell.bottom && row < rows - 1) n.push({ col, row: row + 1 });
  if (!cell.left && col > 0) n.push({ col: col - 1, row });
  if (!cell.right && col < cols - 1) n.push({ col: col + 1, row });
  return n;
}

// ---- Main update ------------------------------------------------------------

export function updateLabyrinth(state: LabyrinthState, dt: number): void {
  if (state.gameOver || state.floorComplete) return;
  state.elapsed += dt;
  state.floorElapsed += dt;
  const fc = FLOORS[Math.min(state.floor, FLOORS.length - 1)];

  // ---- Torch drain (faster when sprinting) ----
  const sprintMult = state.sprinting ? LabyrinthConfig.SPRINT_TORCH_DRAIN_MULT : 1;
  const drainMult = (1 + state.elapsed / 60 * LabyrinthConfig.DARKNESS_RATE) * sprintMult;
  state.torchFuel = Math.max(0, state.torchFuel - fc.torchDrain * drainMult * dt);

  // ---- Effect timers ----
  if (state.speedTimer > 0) state.speedTimer = Math.max(0, state.speedTimer - dt);
  if (state.invisTimer > 0) state.invisTimer = Math.max(0, state.invisTimer - dt);
  if (state.revealTimer > 0) state.revealTimer = Math.max(0, state.revealTimer - dt);
  if (state.compassTimer > 0) state.compassTimer = Math.max(0, state.compassTimer - dt);
  if (state.webTimer > 0) state.webTimer = Math.max(0, state.webTimer - dt);
  if (state.invulnTimer > 0) state.invulnTimer = Math.max(0, state.invulnTimer - dt);
  if (state.screenShake > 0) state.screenShake = Math.max(0, state.screenShake - dt);
  if (state.minoRoarFlash > 0) state.minoRoarFlash = Math.max(0, state.minoRoarFlash - dt * 2);
  if (state.invFullCooldown > 0) state.invFullCooldown = Math.max(0, state.invFullCooldown - dt);
  if (state.inscriptionTimer > 0) {
    state.inscriptionTimer = Math.max(0, state.inscriptionTimer - dt);
    if (state.inscriptionTimer <= 0) state.activeInscription = null;
  }

  // ---- Hazard checks ----
  const wasInWater = state.inWater;
  const wasInDarkness = state.inDarkness;
  state.inWater = state.hazards.some(h => h.type === "water" && h.col === state.pCol && h.row === state.pRow);
  state.inDarkness = state.hazards.some(h => h.type === "darkness" && h.col === state.pCol && h.row === state.pRow);
  if (state.inWater) {
    state.torchFuel = Math.max(0, state.torchFuel - LabyrinthConfig.WATER_TORCH_DRAIN * dt);
  }
  // Entry announcements
  if (state.inWater && !wasInWater && state.torchFuel > 0) state.announcements.push({ text: "Water! Torch draining fast!", color: 0x4488cc, timer: 2 });
  if (state.inDarkness && !wasInDarkness) state.announcements.push({ text: "Darkness... vision failing...", color: 0x555566, timer: 2 });

  // ---- Noise system ----
  const moving = state.moveUp || state.moveDown || state.moveLeft || state.moveRight;
  let targetNoise = !moving ? LabyrinthConfig.NOISE_IDLE
    : state.sprinting ? LabyrinthConfig.NOISE_SPRINT
    : LabyrinthConfig.NOISE_WALK;
  if (state.inWater && moving) targetNoise += LabyrinthConfig.WATER_SPLASH_NOISE;
  state.noiseLevel += (targetNoise - state.noiseLevel) * Math.min(1, dt * 5);

  // ---- Player movement ----
  _movePlayer(state, dt);

  // ---- Mark explored cells ----
  _markExplored(state);

  // ---- Footprints ----
  _updateFootprints(state, dt);

  // ---- Trap checks ----
  _checkTraps(state, dt);

  // ---- Secret wall bumps ----
  _checkSecrets(state);

  // ---- Inscriptions ----
  for (const ins of state.inscriptions) {
    if (ins.seen) continue;
    if (state.pCol === ins.col && state.pRow === ins.row) {
      ins.seen = true;
      state.activeInscription = ins.text;
      state.inscriptionTimer = 4;
    }
  }

  // ---- Collect relics ----
  for (const relic of state.relics) {
    if (relic.collected) continue;
    relic.glow += dt * 2;
    if (state.pCol === relic.col && state.pRow === relic.row) {
      relic.collected = true;
      state.relicsCollected++;
      state.totalRelicsCollected++;
      const relicPts = Math.floor(LabyrinthConfig.SCORE_RELIC * state.scoreMult);
      state.score += relicPts;
      _scorePopup(state, `+${relicPts} RELIC!`, 0xffd700);
      state.announcements.push({ text: `Relic ${state.relicsCollected}/${fc.relicCount}!`, color: 0xffd700, timer: 2 });
      const cp = cellToPixel(relic.col, relic.row);
      for (let i = 0; i < 12; i++) {
        state.particles.push({ x: cp.x, y: cp.y, vx: (Math.random() - 0.5) * 100, vy: -50 - Math.random() * 50, life: 0.8, maxLife: 0.8, color: 0xffd700, size: 2 + Math.random() * 3 });
      }
      if (state.relicsCollected >= fc.relicCount) {
        state.exitOpen = true;
        state.announcements.push({ text: "The exit is open! Escape!", color: 0x44ff44, timer: 3 });
      }
    }
  }

  // ---- Collect items ----
  for (const item of state.items) {
    if (item.collected) continue;
    if (state.pCol === item.col && state.pRow === item.row) {
      if (item.type === "torch") {
        item.collected = true;
        state.itemsUsed++;
        _applyItem(state, item.type);
      } else if (state.inventory.length < LabyrinthConfig.MAX_INVENTORY) {
        item.collected = true;
        state.inventory.push({ type: item.type });
        state.announcements.push({ text: `${ITEMS[item.type].icon} ${ITEMS[item.type].name} [${state.inventory.length}]`, color: ITEMS[item.type].color, timer: 2 });
      } else if (state.invFullCooldown <= 0) {
        state.invFullCooldown = 1.5;
        state.announcements.push({ text: "Inventory full! (1/2/3 use, Q drop)", color: 0xaa6644, timer: 1.5 });
      }
    }
  }

  // ---- Check exit ----
  if (state.exitOpen && state.pCol === state.exitCol && state.pRow === state.exitRow) {
    const timeBonus = Math.max(0, Math.floor((LabyrinthConfig.PAR_TIME_PER_FLOOR - state.floorElapsed) * LabyrinthConfig.SCORE_TIME_BONUS));
    state.score += Math.floor((LabyrinthConfig.SCORE_FLOOR_CLEAR + timeBonus) * state.scoreMult);
    if (state.hitsTaken === 0) state.score += Math.floor(LabyrinthConfig.SCORE_NO_HIT * state.scoreMult);
    // Trap avoidance bonus: for each trap on the floor that wasn't triggered
    const trapsNotTriggered = state.traps.filter(t => !t.triggered).length;
    state.trapsAvoided = trapsNotTriggered;
    if (trapsNotTriggered > 0) state.score += Math.floor(trapsNotTriggered * LabyrinthConfig.SCORE_TRAP_AVOID * state.scoreMult);
    // Achievements
    if (state.hitsTaken === 0) state.achievements.push("Flawless");
    if (state.floorElapsed < LabyrinthConfig.PAR_TIME_PER_FLOOR) state.achievements.push("Speed Clear");
    if (state.secretsFound >= (FLOORS[Math.min(state.floor, FLOORS.length - 1)].secretCount)) state.achievements.push("Secret Hunter");
    if (state.trapsTriggered === 0) state.achievements.push("Trap Dodger");

    if (state.floor >= state.totalFloors - 1) {
      state.gameOver = true;
      state.won = true;
      if (state.bestNoHitStreak >= state.elapsed * 0.8) state.achievements.push("Ghost");
      state.announcements.push({ text: "ESCAPED THE LABYRINTH!", color: 0x44ff44, timer: 5 });
    } else {
      state.floorComplete = true;
      state.announcements.push({ text: `Floor ${state.floor + 1} cleared!`, color: 0x44ff88, timer: 3 });
    }
    return;
  }

  // ---- Maze shift ----
  state.shiftTimer -= dt;
  state.shiftWarning = state.shiftTimer <= 5;
  if (state.shiftTimer <= 0) {
    shiftMaze(state);
    state.shiftTimer = fc.shiftInterval;
  }
  if (state.shiftFlash > 0) state.shiftFlash = Math.max(0, state.shiftFlash - dt * 2);

  // ---- Decoy noise sources ----
  for (let i = state.decoys.length - 1; i >= 0; i--) {
    state.decoys[i].life -= dt;
    if (state.decoys[i].life <= 0) { state.decoys.splice(i, 1); continue; }
    // Emit particles
    if (Math.random() < 0.3) {
      const d = state.decoys[i];
      state.particles.push({ x: d.x, y: d.y, vx: (Math.random() - 0.5) * 20, vy: -10 - Math.random() * 10, life: 0.5, maxLife: 0.5, color: 0xcc66cc, size: 1.5 });
    }
  }

  // ---- Minotaur AI ----
  _updateMinotaur(state, dt);

  // ---- Shadow minotaur ----
  if (state.shadow) _updateShadow(state, dt);

  // ---- Caltrop decay + collision ----
  _decayCaltrops(state, dt);
  _checkCaltrops(state);

  // ---- Danger ----
  const dxM = state.mx - state.px, dyM = state.my - state.py;
  const distToMino = Math.sqrt(dxM * dxM + dyM * dyM);
  const cs = LabyrinthConfig.CELL_SIZE;
  const heartDist = 6 * cs;
  state.heartbeat = distToMino < heartDist ? 1 - distToMino / heartDist : 0;
  state.dangerDir = Math.atan2(dyM, dxM);

  // Shadow proximity boost
  if (state.shadow) {
    const sdx = state.shadow.x - state.px, sdy = state.shadow.y - state.py;
    const sDist = Math.sqrt(sdx * sdx + sdy * sdy);
    if (sDist < heartDist) {
      state.heartbeat = Math.max(state.heartbeat, (1 - sDist / heartDist) * 0.7);
    }
  }

  // ---- Check caught (main minotaur) ----
  if (distToMino < (LabyrinthConfig.PLAYER_RADIUS + LabyrinthConfig.MINO_SIZE) && state.minoStunTimer <= 0) {
    _playerCaught(state);
  }
  // Shadow catch
  if (state.shadow && state.shadow.stunTimer <= 0) {
    const sdx = state.shadow.x - state.px, sdy = state.shadow.y - state.py;
    if (Math.sqrt(sdx * sdx + sdy * sdy) < (LabyrinthConfig.PLAYER_RADIUS + LabyrinthConfig.SHADOW_SIZE)) {
      _playerCaught(state);
    }
  }

  // ---- Relic proximity hum ----
  state.relicHumStrength = 0;
  state.relicHumDir = 0;
  for (const relic of state.relics) {
    if (relic.collected) continue;
    const rp = cellToPixel(relic.col, relic.row);
    const rdx = rp.x - state.px, rdy = rp.y - state.py;
    const rDist = Math.sqrt(rdx * rdx + rdy * rdy);
    const humRange = LabyrinthConfig.RELIC_HUM_RANGE * cs;
    if (rDist < humRange) {
      const strength = 1 - rDist / humRange;
      if (strength > state.relicHumStrength) {
        state.relicHumStrength = strength;
        state.relicHumDir = Math.atan2(rdy, rdx);
      }
    }
  }

  // ---- Near-miss tracking ----
  if (state.nearMissCooldown > 0) state.nearMissCooldown -= dt;
  const nearDist = LabyrinthConfig.NEAR_MISS_DIST * cs;
  if (distToMino < nearDist && distToMino > (LabyrinthConfig.PLAYER_RADIUS + LabyrinthConfig.MINO_SIZE) * 2 && state.nearMissCooldown <= 0 && state.minoStunTimer <= 0) {
    state.nearMisses++;
    state.nearMissCooldown = 5;
    const nearPts = Math.floor(LabyrinthConfig.SCORE_NEAR_MISS * state.scoreMult);
    state.score += nearPts;
    _scorePopup(state, `+${nearPts} CLOSE CALL!`, 0xff8844);
    state.announcements.push({ text: "Close call!", color: 0xff8844, timer: 1.5 });
  }

  // ---- Ambient particles ----
  _updateAmbient(state, dt);

  // ---- No-hit streak ----
  if (state.alive && !state.gameOver) {
    state.noHitStreak += dt;
    if (state.noHitStreak > state.bestNoHitStreak) state.bestNoHitStreak = state.noHitStreak;
  }

  // ---- Score popups decay ----
  for (let i = state.scorePopups.length - 1; i >= 0; i--) {
    state.scorePopups[i].life -= dt;
    if (state.scorePopups[i].life <= 0) state.scorePopups.splice(i, 1);
  }

  // ---- Particles & announcements ----
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 30 * dt; p.life -= dt;
    if (p.life <= 0) state.particles.splice(i, 1);
  }
  for (let i = state.announcements.length - 1; i >= 0; i--) {
    state.announcements[i].timer -= dt;
    if (state.announcements[i].timer <= 0) state.announcements.splice(i, 1);
  }
}

function _playerCaught(state: LabyrinthState): void {
  if (state.invulnTimer > 0) return; // brief invulnerability after shield break
  if (state.shieldActive) {
    state.shieldActive = false;
    state.minoStunTimer = 2;
    state.minoCharging = false;
    state.invulnTimer = 0.8; // brief grace period after shield breaks
    state.screenShake = 0.5;
    state.hitsTaken++;
    state.noHitStreak = 0;
    state.announcements.push({ text: "Shield shattered!", color: 0x44aaff, timer: 2 });
    for (let p = 0; p < 10; p++) {
      state.particles.push({ x: state.px, y: state.py, vx: (Math.random() - 0.5) * 80, vy: (Math.random() - 0.5) * 80, life: 0.5, maxLife: 0.5, color: 0x44aaff, size: 2 + Math.random() * 2 });
    }
  } else {
    state.alive = false;
    state.gameOver = true;
    state.won = false;
    state.screenShake = 1;
    state.deathCause = "Caught by the Minotaur";
    state.deathFloor = state.floor;
    state.deathTorchPct = state.torchFuel / LabyrinthConfig.TORCH_MAX;
    state.announcements.push({ text: "The Minotaur caught you!", color: 0xff2222, timer: 5 });
  }
}

// ---- Explored cells ---------------------------------------------------------

function _markExplored(state: LabyrinthState): void {
  const cs = LabyrinthConfig.CELL_SIZE;
  const torchPct = state.torchFuel / LabyrinthConfig.TORCH_MAX;
  const diff = DIFFICULTIES.find(d => d.id === state.difficulty) ?? DIFFICULTIES[1];
  // Non-linear vision decay: drops sharply below 20% torch fuel
  let adjTorchPct = torchPct;
  if (torchPct > 0 && torchPct < 0.2) adjTorchPct = torchPct * torchPct / 0.2; // quadratic drop
  let effectiveVision = adjTorchPct <= 0 ? LabyrinthConfig.DEAD_TORCH_VISION
    : LabyrinthConfig.MIN_VISION + (LabyrinthConfig.BASE_VISION + diff.visionBonus - LabyrinthConfig.MIN_VISION) * adjTorchPct;
  if (state.inDarkness) effectiveVision *= LabyrinthConfig.DARKNESS_ZONE_VISION_MULT;
  const visionCells = Math.ceil(effectiveVision);
  const visionR = effectiveVision * cs;

  if (state.revealTimer > 0) {
    for (let r = 0; r < state.rows; r++) for (let c = 0; c < state.cols; c++) state.maze[r][c].explored = true;
    return;
  }
  const minR = Math.max(0, state.pRow - visionCells);
  const maxR = Math.min(state.rows - 1, state.pRow + visionCells);
  const minC = Math.max(0, state.pCol - visionCells);
  const maxC = Math.min(state.cols - 1, state.pCol + visionCells);
  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      const cx = c * cs + cs / 2, cy = r * cs + cs / 2;
      if (Math.sqrt((cx - state.px) ** 2 + (cy - state.py) ** 2) <= visionR) state.maze[r][c].explored = true;
    }
  }
}

// ---- Footprints -------------------------------------------------------------

function _updateFootprints(state: LabyrinthState, dt: number): void {
  const moving = state.moveUp || state.moveDown || state.moveLeft || state.moveRight;
  if (moving) {
    state.footprintTimer -= dt;
    if (state.footprintTimer <= 0) {
      state.footprintTimer = state.sprinting ? LabyrinthConfig.FOOTPRINT_INTERVAL * 0.6 : LabyrinthConfig.FOOTPRINT_INTERVAL;
      state.footprints.push({ x: state.px, y: state.py, life: LabyrinthConfig.FOOTPRINT_LIFETIME, maxLife: LabyrinthConfig.FOOTPRINT_LIFETIME });
      if (state.footprints.length > LabyrinthConfig.FOOTPRINT_MAX) state.footprints.shift();
    }
  }
  for (let i = state.footprints.length - 1; i >= 0; i--) {
    state.footprints[i].life -= dt;
    if (state.footprints[i].life <= 0) state.footprints.splice(i, 1);
  }
}

// ---- Traps ------------------------------------------------------------------

function _checkTraps(state: LabyrinthState, dt: number): void {
  for (const trap of state.traps) {
    if (!trap.visible) {
      if (Math.abs(state.pCol - trap.col) + Math.abs(state.pRow - trap.row) <= 1) trap.visible = true;
    }
    if (trap.type === "crumble" && trap.crumbleTimer > 0) {
      trap.crumbleTimer -= dt;
      if (trap.crumbleTimer <= 0) {
        trap.triggered = true;
        const cell = state.maze[trap.row][trap.col];
        if (!cell.top && trap.row > 0) { cell.top = true; state.maze[trap.row - 1][trap.col].bottom = true; }
        if (!cell.bottom && trap.row < state.rows - 1) { cell.bottom = true; state.maze[trap.row + 1][trap.col].top = true; }
        if (!cell.left && trap.col > 0) { cell.left = true; state.maze[trap.row][trap.col - 1].right = true; }
        if (!cell.right && trap.col < state.cols - 1) { cell.right = true; state.maze[trap.row][trap.col + 1].left = true; }
        _ensureNotTrapped(state.maze, state.pCol, state.pRow, state.cols, state.rows);
        state.screenShake = 0.3;
        state.announcements.push({ text: "The floor crumbles!", color: 0x886644, timer: 2 });
        const cp = cellToPixel(trap.col, trap.row);
        for (let p = 0; p < 6; p++) state.particles.push({ x: cp.x, y: cp.y, vx: (Math.random() - 0.5) * 40, vy: 10 + Math.random() * 30, life: 0.7, maxLife: 0.7, color: 0x665544, size: 3 });
      }
    }
    if (trap.triggered) continue;
    if (state.pCol !== trap.col || state.pRow !== trap.row) continue;
    switch (trap.type) {
      case "spike":
        trap.triggered = true;
        state.trapsTriggered++;
        state.hitsTaken++;
        state.screenShake = 0.4;
        if (state.shieldActive) {
          state.shieldActive = false;
          state.announcements.push({ text: "Shield blocked the spikes!", color: 0x44aaff, timer: 2 });
        } else {
          state.alive = false; state.gameOver = true; state.won = false;
          state.deathCause = "Impaled by spike trap";
          state.deathFloor = state.floor;
          state.deathTorchPct = state.torchFuel / LabyrinthConfig.TORCH_MAX;
          state.announcements.push({ text: "Impaled by spike trap!", color: 0xff2222, timer: 5 });
        }
        for (let p = 0; p < 8; p++) state.particles.push({ x: state.px, y: state.py, vx: (Math.random() - 0.5) * 50, vy: -20 - Math.random() * 30, life: 0.5, maxLife: 0.5, color: 0x884433, size: 2 });
        break;
      case "alarm":
        trap.triggered = true;
        state.trapsTriggered++;
        state.screenShake = 0.3;
        state.minoLastHeard = { col: state.pCol, row: state.pRow };
        state.minoAlerted = true;
        state.minoPath = [];
        if (state.minoState === "sleep") state.minoState = "hunt";
        state.announcements.push({ text: "ALARM! The Minotaur heard you!", color: 0xff4444, timer: 2.5 });
        // Expanding ring particles to visualize alarm radius
        for (let ai = 0; ai < 16; ai++) {
          const angle = (ai / 16) * Math.PI * 2;
          const ringSpeed = LabyrinthConfig.ALARM_RADIUS * LabyrinthConfig.CELL_SIZE * 0.4;
          state.particles.push({ x: state.px, y: state.py, vx: Math.cos(angle) * ringSpeed, vy: Math.sin(angle) * ringSpeed, life: 1.2, maxLife: 1.2, color: 0xff4444, size: 2 });
        }
        for (let p = 0; p < 6; p++) state.particles.push({ x: state.px, y: state.py, vx: (Math.random() - 0.5) * 60, vy: (Math.random() - 0.5) * 60, life: 0.4, maxLife: 0.4, color: 0xff4444, size: 3 });
        break;
      case "web": {
        trap.triggered = true;
        state.trapsTriggered++;
        // Scale web duration: shorter on harder difficulties (already more traps)
        const webMult = state.difficulty === "hard" ? 0.75 : state.difficulty === "nightmare" ? 0.6 : 1;
        state.webTimer = LabyrinthConfig.WEB_DURATION * webMult;
        state.announcements.push({ text: "Caught in a web! Slowed...", color: 0xcccccc, timer: 2 });
        break;
      }
      case "crumble":
        if (trap.crumbleTimer <= 0) {
          trap.crumbleTimer = LabyrinthConfig.CRUMBLE_DELAY;
          state.trapsTriggered++;
          state.announcements.push({ text: "The floor is cracking! MOVE!", color: 0xaa8866, timer: 1.5 });
          state.screenShake = 0.15;
        } else {
          // Repeated warning while standing on active crumble
          state.screenShake = Math.max(state.screenShake, 0.1);
        }
        break;
    }
  }
}

// ---- Secret walls -----------------------------------------------------------

function _checkSecrets(state: LabyrinthState): void {
  const moving = state.moveUp || state.moveDown || state.moveLeft || state.moveRight;
  if (!moving) return;
  for (const sec of state.secrets) {
    if (sec.revealed) continue;
    // Check if player is bumping into this wall
    let bumping = false;
    if (sec.dir === 0 && state.pCol === sec.col && state.pRow === sec.row && state.moveUp) bumping = true;
    if (sec.dir === 1 && state.pCol === sec.col && state.pRow === sec.row && state.moveRight) bumping = true;
    if (sec.dir === 2 && state.pCol === sec.col && state.pRow === sec.row && state.moveDown) bumping = true;
    if (sec.dir === 3 && state.pCol === sec.col && state.pRow === sec.row && state.moveLeft) bumping = true;
    if (!bumping) continue;
    // Check the wall actually exists
    const cell = state.maze[sec.row][sec.col];
    const wallPresent = sec.dir === 0 ? cell.top : sec.dir === 1 ? cell.right : sec.dir === 2 ? cell.bottom : cell.left;
    if (!wallPresent) continue;
    sec.hitsRemaining--;
    if (sec.hitsRemaining <= 0) {
      sec.revealed = true;
      state.secretsFound++;
      const secPts = Math.floor(LabyrinthConfig.SCORE_SECRET_FOUND * state.scoreMult);
      state.score += secPts;
      _scorePopup(state, `+${secPts} SECRET!`, 0xffaa44);
      // Open the wall
      if (sec.dir === 0 && sec.row > 0) { cell.top = false; state.maze[sec.row - 1][sec.col].bottom = false; }
      else if (sec.dir === 1 && sec.col < state.cols - 1) { cell.right = false; state.maze[sec.row][sec.col + 1].left = false; }
      else if (sec.dir === 2 && sec.row < state.rows - 1) { cell.bottom = false; state.maze[sec.row + 1][sec.col].top = false; }
      else if (sec.dir === 3 && sec.col > 0) { cell.left = false; state.maze[sec.row][sec.col - 1].right = false; }
      // Spawn bonus item in adjacent cell
      const adjCol = sec.dir === 1 ? sec.col + 1 : sec.dir === 3 ? sec.col - 1 : sec.col;
      const adjRow = sec.dir === 2 ? sec.row + 1 : sec.dir === 0 ? sec.row - 1 : sec.row;
      state.items.push({ col: adjCol, row: adjRow, type: sec.bonusItem, collected: false });
      state.screenShake = 0.2;
      state.announcements.push({ text: `Secret passage! ${ITEMS[sec.bonusItem].icon}`, color: 0xffaa44, timer: 3 });
      const cp = cellToPixel(sec.col, sec.row);
      for (let p = 0; p < 8; p++) state.particles.push({ x: cp.x, y: cp.y, vx: (Math.random() - 0.5) * 60, vy: (Math.random() - 0.5) * 60, life: 0.6, maxLife: 0.6, color: 0xffaa44, size: 2 + Math.random() * 2 });
    } else {
      // Crack feedback
      state.screenShake = 0.05;
    }
  }
}

// ---- Player movement --------------------------------------------------------

function _movePlayer(state: LabyrinthState, dt: number): void {
  // Speed: sprint and speed boost stack; web overrides all
  let speed: number = LabyrinthConfig.PLAYER_SPEED;
  if (state.sprinting) speed = LabyrinthConfig.PLAYER_SPEED_SPRINT;
  if (state.speedTimer > 0) speed = Math.max(speed, LabyrinthConfig.PLAYER_SPEED_BOOSTED);
  if (state.speedTimer > 0 && state.sprinting) speed = LabyrinthConfig.PLAYER_SPEED_BOOSTED * 1.15; // stack bonus
  if (state.webTimer > 0) speed = LabyrinthConfig.PLAYER_SPEED_WEBBED;
  else if (state.inWater && state.speedTimer <= 0) speed = Math.min(speed, LabyrinthConfig.PLAYER_SPEED_WATER);
  let dx = 0, dy = 0;
  if (state.moveUp) dy -= 1;
  if (state.moveDown) dy += 1;
  if (state.moveLeft) dx -= 1;
  if (state.moveRight) dx += 1;
  if (dx === 0 && dy === 0) return;
  const len = Math.sqrt(dx * dx + dy * dy);
  dx = dx / len * speed * dt;
  dy = dy / len * speed * dt;
  const cs = LabyrinthConfig.CELL_SIZE;
  const r = LabyrinthConfig.PLAYER_RADIUS;
  const nx = state.px + dx;
  if (!_collidesWall(state, nx, state.py, r, cs)) state.px = nx;
  const ny = state.py + dy;
  if (!_collidesWall(state, state.px, ny, r, cs)) state.py = ny;
  state.px = Math.max(r, Math.min(state.cols * cs - r, state.px));
  state.py = Math.max(r, Math.min(state.rows * cs - r, state.py));
  const cell = pixelToCell(state.px, state.py);
  state.pCol = Math.max(0, Math.min(state.cols - 1, cell.col));
  state.pRow = Math.max(0, Math.min(state.rows - 1, cell.row));
}

function _collidesWall(state: LabyrinthState, x: number, y: number, r: number, cs: number): boolean {
  const { maze, cols, rows } = state;
  const col = Math.floor(x / cs);
  const row = Math.floor(y / cs);
  if (col < 0 || col >= cols || row < 0 || row >= rows) return true;
  const cell = maze[row][col];
  if (cell.top && y - r < row * cs) return true;
  if (cell.bottom && y + r > (row + 1) * cs) return true;
  if (cell.left && x - r < col * cs) return true;
  if (cell.right && x + r > (col + 1) * cs) return true;
  return false;
}

// ---- Caltrops ---------------------------------------------------------------

function _checkCaltrops(state: LabyrinthState): void {
  for (let i = state.caltrops.length - 1; i >= 0; i--) {
    const ct = state.caltrops[i];
    // Main minotaur
    let hit = false;
    const dx1 = state.mx - ct.x, dy1 = state.my - ct.y;
    if (dx1 * dx1 + dy1 * dy1 < 15 * 15 && state.minoStunTimer <= 0) {
      state.minoStunTimer = LabyrinthConfig.MINO_STUN_DURATION;
      state.minoCharging = false;
      state.caltropHits++;
      const stunPts = Math.floor(200 * state.scoreMult);
      state.score += stunPts;
      _scorePopup(state, `+${stunPts} STUN!`, 0xffaa44);
      state.announcements.push({ text: "Minotaur stunned!", color: 0xffaa44, timer: 2 });
      hit = true;
      for (let p = 0; p < 8; p++) state.particles.push({ x: state.mx, y: state.my, vx: (Math.random() - 0.5) * 50, vy: (Math.random() - 0.5) * 50, life: 0.6, maxLife: 0.6, color: 0xcc8844, size: 2 + Math.random() });
    }
    // Shadow minotaur
    if (!hit && state.shadow && state.shadow.stunTimer <= 0) {
      const dx2 = state.shadow.x - ct.x, dy2 = state.shadow.y - ct.y;
      if (dx2 * dx2 + dy2 * dy2 < 15 * 15) {
        state.shadow.stunTimer = LabyrinthConfig.MINO_STUN_DURATION;
        state.caltropHits++;
        state.score += Math.floor(200 * state.scoreMult);
        state.announcements.push({ text: "Shadow stunned!", color: 0x9966cc, timer: 2 });
        hit = true;
      }
    }
    if (hit) state.caltrops.splice(i, 1);
  }
}

/** Decay caltrop lifetimes — called once per frame from main update. */
function _decayCaltrops(state: LabyrinthState, dt: number): void {
  for (let i = state.caltrops.length - 1; i >= 0; i--) {
    state.caltrops[i].life -= dt;
    if (state.caltrops[i].life <= 0) state.caltrops.splice(i, 1);
  }
}

// ---- Minotaur AI ------------------------------------------------------------

function _updateMinotaur(state: LabyrinthState, dt: number): void {
  // Stun + enrage state
  if (state.minoStunTimer > 0) {
    state.minoStunTimer -= dt;
    state.minoCharging = false;
    if (state.minoStunTimer <= 0) {
      // Enter enrage after stun wears off
      state.minoState = "enrage";
      state.minoEnrageTimer = LabyrinthConfig.MINO_ENRAGE_DURATION;
      state.announcements.push({ text: "The Minotaur is ENRAGED!", color: 0xff2222, timer: 2 });
      state.screenShake = 0.3;
    }
    return;
  }

  const fc = FLOORS[Math.min(state.floor, FLOORS.length - 1)];
  const diff = DIFFICULTIES.find(d => d.id === state.difficulty) ?? DIFFICULTIES[1];
  let baseSpeed = Math.min(fc.minoSpeedMax * diff.minoSpeedMult, (fc.minoSpeedBase + state.elapsed * LabyrinthConfig.MINO_ACCEL) * diff.minoSpeedMult);

  // Enrage timer
  if (state.minoEnrageTimer > 0) {
    state.minoEnrageTimer -= dt;
    if (state.minoEnrageTimer <= 0) state.minoState = "patrol";
  }

  // Speed based on state
  if (state.minoState === "enrage") baseSpeed *= LabyrinthConfig.MINO_ENRAGE_SPEED_MULT;
  else if (state.minoState === "sleep") baseSpeed = 0;
  state.minoSpeed = baseSpeed;

  // Roar
  state.minoRoarTimer -= dt;
  if (state.minoRoarTimer <= 0 && state.minoState !== "sleep") {
    state.minoRoarTimer = LabyrinthConfig.MINO_ROAR_INTERVAL + Math.random() * 4;
    state.minoRoarFlash = 1;
    state.screenShake = 0.15;
    state.announcements.push({ text: "ROOOAARRR!", color: 0xcc4444, timer: 1.5 });
  }

  // Effective hearing (corridor-based, boosted when torch is out or player is noisy)
  let hearing = Math.ceil(fc.minoHearing * diff.minoHearingMult);
  if (state.torchFuel <= 0) hearing = Math.ceil(hearing * LabyrinthConfig.MINO_TORCH_OUT_HEARING_MULT);
  if (state.noiseLevel > 0.6) hearing = Math.ceil(hearing * LabyrinthConfig.NOISE_HEARING_MULT);

  // ---- Sleep state: wakes on proximity or noise ----
  if (state.minoState === "sleep") {
    state.minoStateTimer -= dt;
    const cellDist = Math.abs(state.pCol - state.mCol) + Math.abs(state.pRow - state.mRow);
    if (cellDist <= LabyrinthConfig.MINO_SLEEP_WAKE_RANGE || state.minoStateTimer <= 0) {
      state.minoState = "patrol";
      state.announcements.push({ text: "The Minotaur stirs...", color: 0x886644, timer: 2 });
    }
    return;
  }

  // ---- Corridor-based hearing (BFS through open passages, not manhattan) ----
  const corridorDist = state.invisTimer <= 0
    ? _corridorDistance(state.maze, state.mCol, state.mRow, state.pCol, state.pRow, state.cols, state.rows, hearing)
    : -1;
  const canHear = corridorDist >= 0 && corridorDist <= hearing;

  if (canHear) {
    state.minoLastHeard = { col: state.pCol, row: state.pRow };
    state.minoAlerted = true;
    if (state.minoState !== "enrage") state.minoState = "hunt";
  }

  // Decoy attraction (corridor-based like player hearing)
  for (const decoy of state.decoys) {
    const decoyCorridorDist = _corridorDistance(state.maze, state.mCol, state.mRow, decoy.col, decoy.row, state.cols, state.rows, Math.ceil(LabyrinthConfig.DECOY_RADIUS));
    if (decoyCorridorDist >= 0 && decoyCorridorDist <= LabyrinthConfig.DECOY_RADIUS) {
      state.minoLastHeard = { col: decoy.col, row: decoy.row };
      state.minoAlerted = true;
      if (state.minoState !== "enrage") state.minoState = "hunt";
      break;
    }
  }

  // Smell: follow footprints
  if (!state.minoAlerted && state.invisTimer <= 0) {
    for (const fp of state.footprints) {
      const fpCell = pixelToCell(fp.x, fp.y);
      const fpDist = Math.abs(fpCell.col - state.mCol) + Math.abs(fpCell.row - state.mRow);
      if (fpDist <= LabyrinthConfig.MINO_SMELL_RANGE && fp.life > fp.maxLife * 0.3) {
        state.minoLastHeard = { col: fpCell.col, row: fpCell.row };
        state.minoAlerted = true;
        if (state.minoState !== "enrage") state.minoState = "hunt";
        break;
      }
    }
  }

  // Charge
  const cellDist = Math.abs(state.pCol - state.mCol) + Math.abs(state.pRow - state.mRow);
  if (state.minoAlerted && !state.minoCharging && state.invisTimer <= 0) {
    if (cellDist <= LabyrinthConfig.MINO_CHARGE_DIST) {
      if (_hasLineOfSight(state.maze, state.mCol, state.mRow, state.pCol, state.pRow)) {
        state.minoCharging = true;
        state.announcements.push({ text: "The Minotaur charges!", color: 0xff4444, timer: 1.5 });
        state.screenShake = 0.2;
      }
    }
  }

  // Pathfinding
  if (state.minoPath.length === 0) {
    if (state.minoLastHeard) {
      state.minoPath = _bfs(state.maze, state.mCol, state.mRow, state.minoLastHeard.col, state.minoLastHeard.row, state.cols, state.rows);
      if (state.minoPath.length === 0) {
        state.minoLastHeard = null;
        state.minoAlerted = false;
        state.minoCharging = false;
        // Transition to sleep after losing interest
        if (state.minoState === "hunt") {
          state.minoState = "sleep";
          state.minoStateTimer = LabyrinthConfig.MINO_SLEEP_DURATION;
        }
      }
    }
    if (state.minoPath.length === 0) {
      if (!state.minoPatrolTarget || (state.mCol === state.minoPatrolTarget.col && state.mRow === state.minoPatrolTarget.row)) {
        state.minoPatrolTarget = {
          col: Math.max(1, Math.min(state.cols - 2, state.mCol + Math.floor(Math.random() * LabyrinthConfig.MINO_PATROL_RADIUS * 2) - LabyrinthConfig.MINO_PATROL_RADIUS)),
          row: Math.max(1, Math.min(state.rows - 2, state.mRow + Math.floor(Math.random() * LabyrinthConfig.MINO_PATROL_RADIUS * 2) - LabyrinthConfig.MINO_PATROL_RADIUS)),
        };
      }
      state.minoPath = _bfs(state.maze, state.mCol, state.mRow, state.minoPatrolTarget.col, state.minoPatrolTarget.row, state.cols, state.rows);
      if (state.minoPath.length === 0) {
        state.minoPatrolTarget = null;
        const neighbors = _passableNeighbors(state.maze, state.mCol, state.mRow, state.cols, state.rows);
        if (neighbors.length > 0) state.minoPath = [neighbors[Math.floor(Math.random() * neighbors.length)]];
      }
    }
  }

  // Move
  if (state.minoPath.length > 0) {
    const target = state.minoPath[0];
    const tp = cellToPixel(target.col, target.row);
    const dx = tp.x - state.mx, dy = tp.y - state.my;
    const dist = Math.sqrt(dx * dx + dy * dy);
    let speed = state.minoAlerted ? state.minoSpeed * 1.2 : state.minoSpeed * 0.7;
    if (state.minoCharging) speed = state.minoSpeed * LabyrinthConfig.MINO_CHARGE_SPEED_MULT;
    if (dist > 1) state.minoAngle = Math.atan2(dy, dx);
    if (dist < 3) {
      state.mx = tp.x; state.my = tp.y; state.mCol = target.col; state.mRow = target.row;
      state.minoPath.shift();
      if (state.minoCharging && state.minoPath.length === 0) state.minoCharging = false;
    } else {
      state.mx += (dx / dist) * speed * dt;
      state.my += (dy / dist) * speed * dt;
    }
  }
  const mc = pixelToCell(state.mx, state.my);
  state.mCol = Math.max(0, Math.min(state.cols - 1, mc.col));
  state.mRow = Math.max(0, Math.min(state.rows - 1, mc.row));
}

// ---- Shadow minotaur --------------------------------------------------------

function _updateShadow(state: LabyrinthState, dt: number): void {
  const s = state.shadow!;
  if (s.stunTimer > 0) { s.stunTimer -= dt; return; }

  // Shadow always vaguely knows player direction — pathfinds toward a cell near the player
  if (s.path.length === 0) {
    // Target a cell offset from player by 2-4 cells (doesn't beeline perfectly)
    const offsetC = state.pCol + Math.floor(Math.random() * 5) - 2;
    const offsetR = state.pRow + Math.floor(Math.random() * 5) - 2;
    const tc = Math.max(0, Math.min(state.cols - 1, offsetC));
    const tr = Math.max(0, Math.min(state.rows - 1, offsetR));
    s.path = _bfs(state.maze, s.col, s.row, tc, tr, state.cols, state.rows);
    if (s.path.length === 0) {
      const neighbors = _passableNeighbors(state.maze, s.col, s.row, state.cols, state.rows);
      if (neighbors.length > 0) s.path = [neighbors[Math.floor(Math.random() * neighbors.length)]];
    }
  }

  if (s.path.length > 0) {
    const target = s.path[0];
    const tp = cellToPixel(target.col, target.row);
    const dx = tp.x - s.x, dy = tp.y - s.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 1) s.angle = Math.atan2(dy, dx);
    if (dist < 3) {
      s.x = tp.x; s.y = tp.y; s.col = target.col; s.row = target.row; s.path.shift();
    } else {
      s.x += (dx / dist) * s.speed * dt;
      s.y += (dy / dist) * s.speed * dt;
    }
  }
  const mc = pixelToCell(s.x, s.y);
  s.col = Math.max(0, Math.min(state.cols - 1, mc.col));
  s.row = Math.max(0, Math.min(state.rows - 1, mc.row));
}

// ---- Ambient particles ------------------------------------------------------

function _updateAmbient(state: LabyrinthState, dt: number): void {
  const cs = LabyrinthConfig.CELL_SIZE;
  // Dust motes
  for (let i = state.ambientDust.length - 1; i >= 0; i--) {
    const d = state.ambientDust[i];
    d.x += d.vx * dt; d.y += d.vy * dt; d.life -= dt;
    if (d.life <= 0) {
      // Respawn near player
      d.x = state.px + (Math.random() - 0.5) * 8 * cs;
      d.y = state.py + (Math.random() - 0.5) * 6 * cs;
      d.vx = (Math.random() - 0.5) * 6;
      d.vy = (Math.random() - 0.5) * 4 - 2;
      d.life = 3 + Math.random() * 5;
      d.maxLife = d.life;
    }
  }

  // Torch ember particles
  if (state.torchFuel > 5) {
    state.emberTimer -= dt;
    if (state.emberTimer <= 0) {
      state.emberTimer = LabyrinthConfig.AMBIENT_EMBER_RATE;
      state.particles.push({
        x: state.px + 4, y: state.py - 6,
        vx: (Math.random() - 0.5) * 15, vy: -15 - Math.random() * 10,
        life: 0.4 + Math.random() * 0.3, maxLife: 0.7,
        color: Math.random() > 0.5 ? 0xff8833 : 0xffcc44, size: 1 + Math.random(),
      });
    }
  }
}

// ---- Item application -------------------------------------------------------

export function useInventoryItem(state: LabyrinthState, slotIndex: number): void {
  if (slotIndex < 0 || slotIndex >= state.inventory.length) return;
  if (state.gameOver || state.floorComplete) return;
  const item = state.inventory[slotIndex];
  state.inventory.splice(slotIndex, 1);
  state.itemsUsed++;
  state.score += Math.floor(LabyrinthConfig.SCORE_ITEM_USE * state.scoreMult);
  _applyItem(state, item.type);
}

/** Drop an inventory item on the ground at the player's position. */
export function dropInventoryItem(state: LabyrinthState, slotIndex: number): void {
  if (slotIndex < 0 || slotIndex >= state.inventory.length) return;
  if (state.gameOver || state.floorComplete) return;
  const item = state.inventory[slotIndex];
  state.inventory.splice(slotIndex, 1);
  // Place as a ground item
  state.items.push({ col: state.pCol, row: state.pRow, type: item.type, collected: false });
  state.announcements.push({ text: `Dropped ${ITEMS[item.type].icon} ${ITEMS[item.type].name}`, color: 0x888888, timer: 1.5 });
}

function _applyItem(state: LabyrinthState, type: ItemType): void {
  const def = ITEMS[type];
  state.announcements.push({ text: `${def.icon} ${def.name}!`, color: def.color, timer: 2 });
  switch (type) {
    case "torch":
      state.torchFuel = Math.min(LabyrinthConfig.TORCH_MAX, state.torchFuel + LabyrinthConfig.TORCH_REFILL);
      break;
    case "speed": state.speedTimer = def.duration; break;
    case "caltrops":
      state.caltrops.push({ x: state.px, y: state.py, life: LabyrinthConfig.CALTROP_LIFETIME });
      break;
    case "reveal": state.revealTimer = def.duration; break;
    case "invis":
      state.invisTimer = def.duration;
      state.minoLastHeard = null; state.minoPath = []; state.minoAlerted = false; state.minoCharging = false;
      break;
    case "shield": state.shieldActive = true; break;
    case "compass": state.compassTimer = def.duration; break;
    case "decoy": {
      const dCell = pixelToCell(state.px, state.py);
      state.decoys.push({ x: state.px, y: state.py, col: dCell.col, row: dCell.row, life: def.duration });
      break;
    }
  }
}
