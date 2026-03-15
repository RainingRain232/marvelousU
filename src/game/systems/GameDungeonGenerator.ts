// ---------------------------------------------------------------------------
// Quest for the Grail — Procedural Dungeon Generator
// BSP-based room placement with corridor carving, traps, and treasure.
// ---------------------------------------------------------------------------

import {
  TileType, ENEMY_DEFS, ENEMY_POOLS, ITEM_DEFS, LOOT_TABLES,
  GameBalance,
} from "../config/GameConfig";
import type { FloorParams, EnemyDef, ItemDef, QuestGenreDef } from "../config/GameConfig";
import type {
  FloorState, EnemyInstance, TreasureChest, GridPos, Direction,
} from "../state/GameState";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function generateFloor(
  floorNum: number,
  params: FloorParams,
  genre: QuestGenreDef,
  enemyIdStart: number,
): FloorState {
  const { width, height } = params;
  const tiles = createGrid(width, height);
  const rooms: { x: number; y: number; w: number; h: number }[] = [];

  // Place rooms via random attempts
  const attempts = (params.roomCountMax + params.roomCountMin) * 8;
  const targetRooms = randInt(params.roomCountMin, params.roomCountMax);

  for (let i = 0; i < attempts && rooms.length < targetRooms; i++) {
    const rw = randInt(params.roomSizeMin, params.roomSizeMax);
    const rh = randInt(params.roomSizeMin, params.roomSizeMax);
    const rx = randInt(1, width - rw - 1);
    const ry = randInt(1, height - rh - 1);

    if (!overlapsAny(rx, ry, rw, rh, rooms, 2)) {
      carveRoom(tiles, rx, ry, rw, rh);
      rooms.push({ x: rx, y: ry, w: rw, h: rh });
    }
  }

  // Connect rooms with corridors
  for (let i = 1; i < rooms.length; i++) {
    const a = roomCenter(rooms[i - 1]);
    const b = roomCenter(rooms[i]);
    carveCorridor(tiles, a.col, a.row, b.col, b.row);
  }
  // Extra random connections for loops
  for (let i = 0; i < Math.floor(rooms.length / 3); i++) {
    const a = roomCenter(rooms[randInt(0, rooms.length - 1)]);
    const b = roomCenter(rooms[randInt(0, rooms.length - 1)]);
    carveCorridor(tiles, a.col, a.row, b.col, b.row);
  }

  // Place entrance (first room) and stairs (last room)
  const entranceRoom = rooms[0];
  const stairsRoom = rooms[rooms.length - 1];
  const entrancePos: GridPos = roomCenter(entranceRoom);
  const stairsPos: GridPos = roomCenter(stairsRoom);
  tiles[entrancePos.row][entrancePos.col] = TileType.ENTRANCE;
  tiles[stairsPos.row][stairsPos.col] = TileType.STAIRS_DOWN;

  // Place traps in corridors
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (tiles[r][c] === TileType.CORRIDOR && Math.random() < params.trapChance) {
        // Don't put traps adjacent to entrance/stairs
        if (Math.abs(r - entrancePos.row) + Math.abs(c - entrancePos.col) > 3 &&
            Math.abs(r - stairsPos.row) + Math.abs(c - stairsPos.col) > 3) {
          tiles[r][c] = TileType.TRAP;
        }
      }
    }
  }

  // Place treasures in rooms
  const treasures: TreasureChest[] = [];
  const difficulty = getDifficulty(floorNum, params);
  for (let ri = 1; ri < rooms.length - 1; ri++) {
    if (Math.random() < params.treasureChance) {
      const room = rooms[ri];
      const tc = room.x + randInt(1, room.w - 2);
      const tr = room.y + randInt(1, room.h - 2);
      if (tiles[tr][tc] === TileType.FLOOR) {
        tiles[tr][tc] = TileType.TREASURE;
        treasures.push({
          col: tc, row: tr, opened: false,
          item: rollLoot(difficulty),
        });
      }
    }
  }

  // Spawn enemies
  const enemies: EnemyInstance[] = [];
  let eid = enemyIdStart;
  const enemyCount = randInt(params.enemyCountMin, params.enemyCountMax);
  const pool = getEnemyPool(difficulty, genre);

  for (let i = 0; i < enemyCount; i++) {
    const room = rooms[randInt(1, rooms.length - 1)]; // skip entrance room
    const ec = room.x + randInt(1, room.w - 2);
    const er = room.y + randInt(1, room.h - 2);
    if (tiles[er][ec] === TileType.FLOOR) {
      const defId = pool[randInt(0, pool.length - 1)];
      const def = ENEMY_DEFS[defId];
      if (def) {
        enemies.push(createEnemy(eid++, def, ec, er));
      }
    }
  }

  // Spawn boss if applicable
  if (params.hasBoss && genre.bossPool.length > 0) {
    const bossId = genre.bossPool[randInt(0, genre.bossPool.length - 1)];
    const bossDef = ENEMY_DEFS[bossId];
    if (bossDef) {
      // Place boss in the stairs room
      const bc = stairsRoom.x + Math.floor(stairsRoom.w / 2);
      const br = stairsRoom.y + Math.floor(stairsRoom.h / 2);
      if (br !== stairsPos.row || bc !== stairsPos.col) {
        enemies.push(createEnemy(eid++, bossDef, bc, br));
      } else {
        // Offset by 1
        enemies.push(createEnemy(eid++, bossDef, bc + 1, br));
      }
    }
  }

  // Build explored grid (start unexplored)
  const explored: boolean[][] = [];
  for (let r = 0; r < height; r++) {
    explored.push(new Array(width).fill(false));
  }

  return {
    floorNum,
    params,
    tiles,
    width,
    height,
    rooms,
    enemies,
    treasures,
    stairsPos,
    entrancePos,
    explored,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createGrid(w: number, h: number): TileType[][] {
  const grid: TileType[][] = [];
  for (let r = 0; r < h; r++) {
    grid.push(new Array(w).fill(TileType.WALL));
  }
  return grid;
}

function carveRoom(grid: TileType[][], x: number, y: number, w: number, h: number): void {
  for (let r = y; r < y + h; r++) {
    for (let c = x; c < x + w; c++) {
      if (r >= 0 && r < grid.length && c >= 0 && c < grid[0].length) {
        grid[r][c] = TileType.FLOOR;
      }
    }
  }
}

function carveCorridor(grid: TileType[][], x1: number, y1: number, x2: number, y2: number): void {
  let cx = x1, cy = y1;
  while (cx !== x2) {
    if (cy >= 0 && cy < grid.length && cx >= 0 && cx < grid[0].length) {
      if (grid[cy][cx] === TileType.WALL) grid[cy][cx] = TileType.CORRIDOR;
    }
    cx += cx < x2 ? 1 : -1;
  }
  while (cy !== y2) {
    if (cy >= 0 && cy < grid.length && cx >= 0 && cx < grid[0].length) {
      if (grid[cy][cx] === TileType.WALL) grid[cy][cx] = TileType.CORRIDOR;
    }
    cy += cy < y2 ? 1 : -1;
  }
}

function overlapsAny(
  x: number, y: number, w: number, h: number,
  rooms: { x: number; y: number; w: number; h: number }[],
  padding: number,
): boolean {
  for (const r of rooms) {
    if (
      x - padding < r.x + r.w && x + w + padding > r.x &&
      y - padding < r.y + r.h && y + h + padding > r.y
    ) return true;
  }
  return false;
}

function roomCenter(room: { x: number; y: number; w: number; h: number }): GridPos {
  return {
    col: Math.floor(room.x + room.w / 2),
    row: Math.floor(room.y + room.h / 2),
  };
}

function getDifficulty(floorNum: number, _params: FloorParams): string {
  if (floorNum <= 2) return "easy";
  if (floorNum <= 5) return "medium";
  return "hard";
}

function getEnemyPool(difficulty: string, genre: QuestGenreDef): string[] {
  const base = ENEMY_POOLS[difficulty] || ENEMY_POOLS["easy"];
  // Bias toward genre-preferred enemy categories
  const biased = base.filter((eid) => {
    const def = ENEMY_DEFS[eid];
    return def && genre.enemyBias.includes(def.category);
  });
  return biased.length >= 3 ? biased : base;
}

function rollLoot(difficulty: string): ItemDef {
  const table = LOOT_TABLES[difficulty] || LOOT_TABLES["easy"];
  const totalWeight = table.reduce((s, e) => s + e.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const entry of table) {
    roll -= entry.weight;
    if (roll <= 0) {
      return ITEM_DEFS[entry.itemId] || ITEM_DEFS["health_potion"];
    }
  }
  return ITEM_DEFS["health_potion"];
}

function createEnemy(id: number, def: EnemyDef, col: number, row: number): EnemyInstance {
  return {
    id,
    def,
    x: col * GameBalance.TILE_SIZE + GameBalance.TILE_SIZE / 2,
    y: row * GameBalance.TILE_SIZE + GameBalance.TILE_SIZE / 2,
    hp: def.hp,
    maxHp: def.hp,
    alive: true,
    aggroed: false,
    attackCooldown: 0,
    stunTurns: 0,
    statusEffects: [],
    facing: 2 as Direction, // DOWN
    pathTarget: null,
    bossPhase: 0,
  };
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ---------------------------------------------------------------------------
// Fog of war reveal
// ---------------------------------------------------------------------------

export function revealAround(floor: FloorState, col: number, row: number, radius: number): void {
  for (let dr = -radius; dr <= radius; dr++) {
    for (let dc = -radius; dc <= radius; dc++) {
      const r = row + dr;
      const c = col + dc;
      if (r >= 0 && r < floor.height && c >= 0 && c < floor.width) {
        if (dr * dr + dc * dc <= radius * radius) {
          floor.explored[r][c] = true;
        }
      }
    }
  }
}
