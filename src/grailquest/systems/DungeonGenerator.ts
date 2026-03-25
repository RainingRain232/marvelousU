// ---------------------------------------------------------------------------
// Grail Quest — Procedural Dungeon Generator (BSP)
// Generates dungeon floors with rooms, corridors, enemies, items, and traps.
// ---------------------------------------------------------------------------

import {
  TileType,
  EntityType,
  RoomType,
  type DungeonFloor,
  type Room,
  type Entity,
} from "../types";
import { GRAIL_BALANCE as B } from "../config/GrailBalance";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIN_REGION_W = 8;
const MIN_REGION_H = 6;
const MIN_ROOM_W = 4;
const MIN_ROOM_H = 3;
const MAX_ROOM_W = 10;
const MAX_ROOM_H = 8;
const CORRIDOR_WIDTH = 2;

// Enemy unlock floors — enemies appear at or above this floor number
const ENEMY_MIN_FLOOR: Record<EntityType, number> = {
  [EntityType.RAT]:              1,
  [EntityType.SKELETON]:         2,
  [EntityType.GOBLIN_ARCHER]:    3,
  [EntityType.ENCHANTED_ARMOR]:  4,
  [EntityType.WRAITH]:           6,
  [EntityType.DARK_KNIGHT]:      8,
  [EntityType.BOSS]:            10,
};

// Base stats per enemy type
const ENEMY_BASE_STATS: Record<
  EntityType,
  { hp: number; atk: number; def: number; xp: number }
> = {
  [EntityType.RAT]:             { hp: 8,   atk: 3,  def: 0,  xp: 5   },
  [EntityType.SKELETON]:        { hp: 18,  atk: 5,  def: 2,  xp: 10  },
  [EntityType.GOBLIN_ARCHER]:   { hp: 14,  atk: 6,  def: 1,  xp: 8   },
  [EntityType.ENCHANTED_ARMOR]: { hp: 30,  atk: 8,  def: 4,  xp: 18  },
  [EntityType.WRAITH]:          { hp: 22,  atk: 10, def: 5,  xp: 22  },
  [EntityType.DARK_KNIGHT]:     { hp: 40,  atk: 12, def: 7,  xp: 30  },
  [EntityType.BOSS]:            { hp: 120, atk: 18, def: 10, xp: 100 },
};

// Spawn weight per enemy type — higher = more likely
function enemyWeight(type: EntityType, floor: number): number {
  const minFloor = ENEMY_MIN_FLOOR[type];
  if (floor < minFloor) return 0;
  // Enemies are most common a few floors after unlock, then taper
  const floorsAbove = floor - minFloor;
  if (type === EntityType.BOSS) return 0; // bosses placed manually
  return Math.max(1, 10 - Math.abs(floorsAbove - 2));
}

// ---------------------------------------------------------------------------
// RNG helper — simple seedless helpers (Math.random)
// ---------------------------------------------------------------------------

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------------------
// Tile helpers
// ---------------------------------------------------------------------------

export function isWalkable(tile: TileType): boolean {
  return (
    tile === TileType.FLOOR ||
    tile === TileType.DOOR ||
    tile === TileType.STAIRS_DOWN ||
    tile === TileType.CHEST ||
    tile === TileType.SHRINE ||
    tile === TileType.TRAP_SPIKE ||
    tile === TileType.TRAP_PIT ||
    tile === TileType.TRAP_POISON
  );
}

export function roomCenter(room: Room): { x: number; y: number } {
  return {
    x: Math.floor(room.x + room.w / 2),
    y: Math.floor(room.y + room.h / 2),
  };
}

// ---------------------------------------------------------------------------
// BSP split
// ---------------------------------------------------------------------------

interface BSPNode {
  x: number;
  y: number;
  w: number;
  h: number;
  left?: BSPNode;
  right?: BSPNode;
  room?: Room;
}

export function bspSplit(
  x: number,
  y: number,
  w: number,
  h: number,
  depth: number,
): Room[] {
  const root = buildBSP(x, y, w, h, depth);
  const rooms: Room[] = [];
  collectRooms(root, rooms);
  return rooms;
}

function buildBSP(
  x: number,
  y: number,
  w: number,
  h: number,
  depth: number,
): BSPNode {
  const node: BSPNode = { x, y, w, h };

  if (depth <= 0 || w < MIN_REGION_W * 2 || h < MIN_REGION_H * 2) {
    // Leaf — carve a room inside this region
    const rw = randInt(MIN_ROOM_W, Math.min(MAX_ROOM_W, w - 2));
    const rh = randInt(MIN_ROOM_H, Math.min(MAX_ROOM_H, h - 2));
    const rx = x + randInt(1, w - rw - 1);
    const ry = y + randInt(1, h - rh - 1);
    node.room = { x: rx, y: ry, w: rw, h: rh, roomType: RoomType.PLAIN };
    return node;
  }

  // Decide split direction — prefer splitting the longer axis
  const splitH = w > h ? false : h > w ? true : Math.random() < 0.5;

  if (splitH) {
    const split = randInt(MIN_REGION_H, h - MIN_REGION_H);
    node.left = buildBSP(x, y, w, split, depth - 1);
    node.right = buildBSP(x, y + split, w, h - split, depth - 1);
  } else {
    const split = randInt(MIN_REGION_W, w - MIN_REGION_W);
    node.left = buildBSP(x, y, split, h, depth - 1);
    node.right = buildBSP(x + split, y, w - split, h, depth - 1);
  }

  return node;
}

function collectRooms(node: BSPNode, rooms: Room[]): void {
  if (node.room) {
    rooms.push(node.room);
    return;
  }
  if (node.left) collectRooms(node.left, rooms);
  if (node.right) collectRooms(node.right, rooms);
}

// ---------------------------------------------------------------------------
// Carve helpers
// ---------------------------------------------------------------------------

function carveRect(
  tiles: TileType[][],
  x: number,
  y: number,
  w: number,
  h: number,
  cols: number,
  rows: number,
): void {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const tx = x + dx;
      const ty = y + dy;
      if (tx >= 0 && tx < cols && ty >= 0 && ty < rows) {
        tiles[ty][tx] = TileType.FLOOR;
      }
    }
  }
}

function carveCircle(
  tiles: TileType[][],
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  cols: number,
  rows: number,
): void {
  for (let dy = -ry; dy <= ry; dy++) {
    for (let dx = -rx; dx <= rx; dx++) {
      const nx = cx + dx;
      const ny = cy + dy;
      // Ellipse check
      if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1.0) {
        if (nx >= 1 && nx < cols - 1 && ny >= 1 && ny < rows - 1) {
          tiles[ny][nx] = TileType.FLOOR;
        }
      }
    }
  }
}

export function carveCorridor(
  tiles: TileType[][],
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): void {
  const cols = tiles[0].length;
  const rows = tiles.length;

  // L-shaped corridor: go horizontal first, then vertical (or vice versa)
  const goHorizFirst = Math.random() < 0.5;

  const midX = goHorizFirst ? x2 : x1;
  const midY = goHorizFirst ? y1 : y2;

  carveLineSegment(tiles, x1, y1, midX, midY, cols, rows);
  carveLineSegment(tiles, midX, midY, x2, y2, cols, rows);
}

function carveLineSegment(
  tiles: TileType[][],
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  cols: number,
  rows: number,
): void {
  const dx = Math.sign(x2 - x1);
  const dy = Math.sign(y2 - y1);

  let cx = x1;
  let cy = y1;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    // Carve a 2-tile wide corridor
    for (let t = 0; t < CORRIDOR_WIDTH; t++) {
      const tx = dx !== 0 ? cx : cx + t;
      const ty = dy !== 0 ? cy : cy + t;
      if (tx >= 1 && tx < cols - 1 && ty >= 1 && ty < rows - 1) {
        if (tiles[ty][tx] === TileType.WALL) {
          tiles[ty][tx] = TileType.FLOOR;
        }
      }
    }
    if (cx === x2 && cy === y2) break;
    if (cx !== x2) cx += dx;
    else if (cy !== y2) cy += dy;
  }
}

// ---------------------------------------------------------------------------
// BFS distance
// ---------------------------------------------------------------------------

export function bfsDistance(
  tiles: TileType[][],
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): number {
  const rows = tiles.length;
  const cols = tiles[0].length;
  const visited = new Uint8Array(rows * cols);
  const queue: number[] = [];

  const idx = (x: number, y: number) => y * cols + x;

  visited[idx(startX, startY)] = 1;
  queue.push(startX, startY, 0);

  const DX = [0, 1, 0, -1];
  const DY = [-1, 0, 1, 0];

  let head = 0;
  while (head < queue.length) {
    const cx = queue[head++];
    const cy = queue[head++];
    const dist = queue[head++];

    if (cx === endX && cy === endY) return dist;

    for (let d = 0; d < 4; d++) {
      const nx = cx + DX[d];
      const ny = cy + DY[d];
      if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
      const ni = idx(nx, ny);
      if (visited[ni]) continue;
      if (!isWalkable(tiles[ny][nx])) continue;
      visited[ni] = 1;
      queue.push(nx, ny, dist + 1);
    }
  }

  return -1; // unreachable
}

// ---------------------------------------------------------------------------
// Entity creation
// ---------------------------------------------------------------------------

export function createEntity(
  type: EntityType,
  x: number,
  y: number,
  floor: number,
  idCounter: number,
): Entity {
  const base = ENEMY_BASE_STATS[type];
  const minFloor = ENEMY_MIN_FLOOR[type];
  const floorsAboveMin = Math.max(0, floor - minFloor);
  const hpScale = 1 + floorsAboveMin * 0.15;
  const atkScale = 1 + floorsAboveMin * 0.15;

  return {
    id: String(idCounter),
    type,
    x,
    y,
    hp: Math.round(base.hp * hpScale),
    maxHp: Math.round(base.hp * hpScale),
    attack: Math.round(base.atk * atkScale),
    defense: Math.round(base.def * hpScale),
    alive: true,
    stunTimer: 0,
    poisonTimer: 0,
    alerted: false,
    lastKnownPlayerX: -1,
    lastKnownPlayerY: -1,
    fireDirection: null,
    phasing: type === EntityType.WRAITH,
    bossPhase: type === EntityType.BOSS ? 1 : 0,
    bossSummonCooldown: 0,
  };
}

// ---------------------------------------------------------------------------
// Weighted enemy picker
// ---------------------------------------------------------------------------

function pickWeightedEnemy(floor: number): EntityType {
  const types = Object.values(EntityType).filter(
    (t) => t !== EntityType.BOSS,
  ) as EntityType[];

  const weights = types.map((t) => enemyWeight(t, floor));
  const total = weights.reduce((s, w) => s + w, 0);
  if (total === 0) return EntityType.RAT;

  let roll = Math.random() * total;
  for (let i = 0; i < types.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return types[i];
  }
  return types[types.length - 1];
}

// ---------------------------------------------------------------------------
// Floor-tile coordinate helpers
// ---------------------------------------------------------------------------

function floorTiles(
  tiles: TileType[][],
  room: Room,
): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let dy = 0; dy < room.h; dy++) {
    for (let dx = 0; dx < room.w; dx++) {
      const tx = room.x + dx;
      const ty = room.y + dy;
      if (tiles[ty]?.[tx] === TileType.FLOOR) {
        out.push({ x: tx, y: ty });
      }
    }
  }
  return out;
}

function corridorTiles(tiles: TileType[][]): { x: number; y: number }[] {
  const rows = tiles.length;
  const cols = tiles[0].length;
  const out: { x: number; y: number }[] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (tiles[y][x] !== TileType.FLOOR) continue;
      // A corridor tile is a floor tile surrounded by at most 2 floor
      // neighbours on opposite sides (narrow passage)
      let adjacent = 0;
      if (x > 0 && isWalkable(tiles[y][x - 1])) adjacent++;
      if (x < cols - 1 && isWalkable(tiles[y][x + 1])) adjacent++;
      if (y > 0 && isWalkable(tiles[y - 1][x])) adjacent++;
      if (y < rows - 1 && isWalkable(tiles[y + 1][x])) adjacent++;
      if (adjacent <= 2) out.push({ x, y });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Room type assignment — assigns special types to non-spawn, non-stairs rooms
// ---------------------------------------------------------------------------

function assignRoomTypes(rooms: Room[], spawnRoom: Room, stairsRoom: Room): void {
  const candidates = rooms.filter(r => r !== spawnRoom && r !== stairsRoom);
  const shuffled = shuffle(candidates);

  // Each special type gets at most one room per floor
  const typePool: { type: RoomType; chance: number }[] = [
    { type: RoomType.TREASURE, chance: B.ROOM_TYPE_TREASURE_CHANCE },
    { type: RoomType.LIBRARY,  chance: B.ROOM_TYPE_LIBRARY_CHANCE },
    { type: RoomType.ARMORY,   chance: B.ROOM_TYPE_ARMORY_CHANCE },
    { type: RoomType.TRAP,     chance: B.ROOM_TYPE_TRAP_CHANCE },
    { type: RoomType.ALTAR,    chance: B.ROOM_TYPE_ALTAR_CHANCE },
  ];

  let assigned = 0;
  for (const entry of typePool) {
    if (assigned >= shuffled.length) break;
    // Higher floors have better odds of special rooms
    const adjustedChance = entry.chance * 3.0; // roughly 30% chance each
    if (Math.random() < adjustedChance) {
      shuffled[assigned].roomType = entry.type;
      assigned++;
    }
  }
}

// ---------------------------------------------------------------------------
// Populate special rooms with appropriate content
// ---------------------------------------------------------------------------

function populateSpecialRooms(
  tiles: TileType[][],
  rooms: Room[],
  entities: Entity[],
  floor: number,
  idCounter: { value: number },
  _cols: number,
  _rows: number,
): void {
  for (const room of rooms) {
    const ft = floorTiles(tiles, room);
    if (ft.length === 0) continue;

    switch (room.roomType) {
      case RoomType.TREASURE: {
        // Extra chests (3-4), guarded by a tougher enemy
        const chestCount = randInt(3, 4);
        const shuffledTiles = shuffle(ft);
        for (let i = 0; i < Math.min(chestCount, shuffledTiles.length); i++) {
          const spot = shuffledTiles[i];
          if (tiles[spot.y][spot.x] === TileType.FLOOR) {
            tiles[spot.y][spot.x] = TileType.CHEST;
          }
        }
        // Spawn a tough guard — dark knight or enchanted armor
        const guardType = floor >= 6 ? EntityType.ENCHANTED_ARMOR : EntityType.DARK_KNIGHT;
        const guardSpot = shuffledTiles.find(s => tiles[s.y][s.x] === TileType.FLOOR);
        if (guardSpot) {
          const guard = createEntity(guardType, guardSpot.x, guardSpot.y, floor, idCounter.value++);
          guard.hp = Math.round(guard.hp * 1.3); // tougher
          guard.maxHp = guard.hp;
          guard.alerted = true;
          entities.push(guard);
        }
        break;
      }
      case RoomType.LIBRARY: {
        // Contains reveal scrolls as chests + shrine for buffs
        const scrollCount = randInt(1, 2);
        const shuffledTiles = shuffle(ft);
        for (let i = 0; i < Math.min(scrollCount, shuffledTiles.length); i++) {
          const spot = shuffledTiles[i];
          if (tiles[spot.y][spot.x] === TileType.FLOOR) {
            tiles[spot.y][spot.x] = TileType.CHEST; // will contain scrolls/buffs
          }
        }
        // Place a shrine for perception/attack buff
        const shrineSpot = shuffledTiles.find(s => tiles[s.y][s.x] === TileType.FLOOR);
        if (shrineSpot) {
          tiles[shrineSpot.y][shrineSpot.x] = TileType.SHRINE;
        }
        break;
      }
      case RoomType.ARMORY: {
        // Contains weapon and armor drop chests (2-3)
        const count = randInt(2, 3);
        const shuffledTiles = shuffle(ft);
        for (let i = 0; i < Math.min(count, shuffledTiles.length); i++) {
          const spot = shuffledTiles[i];
          if (tiles[spot.y][spot.x] === TileType.FLOOR) {
            tiles[spot.y][spot.x] = TileType.CHEST;
          }
        }
        break;
      }
      case RoomType.TRAP: {
        // Dense with traps but good loot at center
        const center = roomCenter(room);
        const trapTypes = [TileType.TRAP_SPIKE, TileType.TRAP_PIT, TileType.TRAP_POISON];
        for (const spot of ft) {
          // Don't trap the center — that's where the loot goes
          if (spot.x === center.x && spot.y === center.y) continue;
          if (Math.random() < 0.45 && tiles[spot.y][spot.x] === TileType.FLOOR) {
            tiles[spot.y][spot.x] = pick(trapTypes);
          }
        }
        // Place a chest at center
        if (tiles[center.y]?.[center.x] === TileType.FLOOR) {
          tiles[center.y][center.x] = TileType.CHEST;
        }
        break;
      }
      case RoomType.ALTAR: {
        // Shrine with guaranteed full heal
        const center = roomCenter(room);
        if (tiles[center.y]?.[center.x] !== undefined) {
          tiles[center.y][center.x] = TileType.SHRINE;
        }
        break;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------

export function generateFloor(
  floor: number,
  cols: number,
  rows: number,
): { dungeon: DungeonFloor; entities: Entity[] } {
  // 1. Init all walls
  const tiles: TileType[][] = [];
  for (let y = 0; y < rows; y++) {
    tiles.push(new Array(cols).fill(TileType.WALL));
  }

  // 2. BSP — deeper floors get more splits for complexity
  const bspDepth = Math.min(4 + Math.floor(floor / 3), 8);
  const rooms = bspSplit(1, 1, cols - 2, rows - 2, bspDepth);

  // 3. Carve rooms (some circular for variety)
  for (const room of rooms) {
    const circular = Math.random() < 0.25;
    if (circular) {
      const center = roomCenter(room);
      const rx = Math.floor(room.w / 2) - 1;
      const ry = Math.floor(room.h / 2) - 1;
      if (rx >= 2 && ry >= 1) {
        carveCircle(tiles, center.x, center.y, rx, ry, cols, rows);
      } else {
        carveRect(tiles, room.x, room.y, room.w, room.h, cols, rows);
      }
    } else {
      carveRect(tiles, room.x, room.y, room.w, room.h, cols, rows);
    }
  }

  // 4. Connect adjacent rooms with corridors
  // Sort rooms by distance from top-left so connections are sensible
  const sorted = [...rooms].sort((a, b) => {
    const ca = roomCenter(a);
    const cb = roomCenter(b);
    return ca.x + ca.y - (cb.x + cb.y);
  });

  for (let i = 0; i < sorted.length - 1; i++) {
    const ca = roomCenter(sorted[i]);
    const cb = roomCenter(sorted[i + 1]);
    carveCorridor(tiles, ca.x, ca.y, cb.x, cb.y);
  }

  // Extra connections for loops (makes dungeon more interesting)
  for (let i = 0; i < sorted.length - 2; i++) {
    if (Math.random() < 0.3) {
      const ca = roomCenter(sorted[i]);
      const cb = roomCenter(sorted[i + 2]);
      carveCorridor(tiles, ca.x, ca.y, cb.x, cb.y);
    }
  }

  // 5. Choose spawn room (first room) and stairs room (furthest by BFS)
  const spawnRoom = sorted[0];
  const spawnPos = roomCenter(spawnRoom);

  let stairsRoom = sorted[sorted.length - 1];
  let maxDist = -1;
  for (const room of sorted) {
    if (room === spawnRoom) continue;
    const rc = roomCenter(room);
    const dist = bfsDistance(tiles, spawnPos.x, spawnPos.y, rc.x, rc.y);
    if (dist > maxDist) {
      maxDist = dist;
      stairsRoom = room;
    }
  }

  const stairsPos = roomCenter(stairsRoom);

  // Ensure stairs are reachable — if BFS returned -1, force a corridor
  if (bfsDistance(tiles, spawnPos.x, spawnPos.y, stairsPos.x, stairsPos.y) < 0) {
    carveCorridor(tiles, spawnPos.x, spawnPos.y, stairsPos.x, stairsPos.y);
  }

  tiles[stairsPos.y][stairsPos.x] = TileType.STAIRS_DOWN;

  // 5b. Assign room types
  assignRoomTypes(sorted, spawnRoom, stairsRoom);

  // 6. Place items
  const nonSpawnRooms = sorted.filter((r) => r !== spawnRoom);

  // Chests — 2 to 4
  const chestCount = randInt(2, 4);
  const chestRooms = shuffle(nonSpawnRooms).slice(0, chestCount);
  for (const room of chestRooms) {
    const ft = floorTiles(tiles, room);
    if (ft.length > 0) {
      const spot = pick(ft);
      tiles[spot.y][spot.x] = TileType.CHEST;
    }
  }

  // Shrine — 0 to 1
  if (Math.random() < 0.5 && nonSpawnRooms.length > 0) {
    const shrineRoom = pick(nonSpawnRooms);
    const ft = floorTiles(tiles, shrineRoom);
    if (ft.length > 0) {
      const spot = pick(ft);
      tiles[spot.y][spot.x] = TileType.SHRINE;
    }
  }

  // Traps — floor * 2, placed in corridors
  const trapCount = floor * 2;
  const trapTypes = [TileType.TRAP_SPIKE, TileType.TRAP_PIT, TileType.TRAP_POISON];
  const corrTiles = shuffle(corridorTiles(tiles));
  for (let i = 0; i < Math.min(trapCount, corrTiles.length); i++) {
    tiles[corrTiles[i].y][corrTiles[i].x] = pick(trapTypes);
  }

  // Doors — 1 to 2 between rooms and corridors
  const doorCount = randInt(1, 2);
  let doorsPlaced = 0;
  for (const room of shuffle(nonSpawnRooms)) {
    if (doorsPlaced >= doorCount) break;
    // Find an edge tile of the room that connects to a corridor
    const edges = roomEdgeTiles(room, tiles, cols, rows);
    for (const edge of shuffle(edges)) {
      if (doorsPlaced >= doorCount) break;
      tiles[edge.y][edge.x] = TileType.DOOR;
      doorsPlaced++;
    }
  }

  // Locked door + key — 0 to 1
  if (Math.random() < 0.6 && nonSpawnRooms.length >= 2) {
    const [lockRoom, keyRoom] = shuffle(nonSpawnRooms);
    // Place locked door on the edge of lockRoom
    const edges = roomEdgeTiles(lockRoom, tiles, cols, rows);
    if (edges.length > 0) {
      const doorSpot = pick(edges);
      tiles[doorSpot.y][doorSpot.x] = TileType.LOCKED_DOOR;

      // Place key item in keyRoom on a floor tile
      const ft = floorTiles(tiles, keyRoom);
      if (ft.length > 0) {
        const keySpot = pick(ft);
        tiles[keySpot.y][keySpot.x] = TileType.CHEST;
      }
    }
  }

  // 7. Place enemies
  const entities: Entity[] = [];
  let idCounter = 1;
  const totalEnemies = 6 + floor * 3;
  const enemyRooms = nonSpawnRooms.filter((r) => r !== stairsRoom || floor !== 10);

  for (let i = 0; i < totalEnemies; i++) {
    if (enemyRooms.length === 0) break;
    const room = pick(enemyRooms);
    const ft = floorTiles(tiles, room);
    if (ft.length === 0) continue;
    const spot = pick(ft);
    // Avoid placing on special tiles
    if (tiles[spot.y][spot.x] !== TileType.FLOOR) continue;

    const type = pickWeightedEnemy(floor);
    entities.push(createEntity(type, spot.x, spot.y, floor, idCounter++));
  }

  // Boss on floor 5+ in the stairs room (floor 5 mini-boss, floor 10 final boss)
  if (floor >= 5 && floor % 5 === 0) {
    const ft = floorTiles(tiles, stairsRoom);
    if (ft.length > 0) {
      const spot = pick(ft);
      entities.push(createEntity(EntityType.BOSS, spot.x, spot.y, floor, idCounter++));
    }
  }

  // 7b. Populate special room types with extra content
  const idCounterObj = { value: idCounter };
  populateSpecialRooms(tiles, sorted, entities, floor, idCounterObj, cols, rows);
  idCounter = idCounterObj.value;

  // 8. Build dungeon object
  const dungeon: DungeonFloor = {
    cols,
    rows,
    tiles,
    rooms: sorted,
    spawnX: spawnPos.x,
    spawnY: spawnPos.y,
    stairsX: stairsPos.x,
    stairsY: stairsPos.y,
  };

  return { dungeon, entities };
}

// ---------------------------------------------------------------------------
// Room edge detection — finds floor tiles on room border adjacent to corridor
// ---------------------------------------------------------------------------

function roomEdgeTiles(
  room: Room,
  tiles: TileType[][],
  cols: number,
  rows: number,
): { x: number; y: number }[] {
  const edges: { x: number; y: number }[] = [];

  const check = (x: number, y: number) => {
    if (x < 1 || x >= cols - 1 || y < 1 || y >= rows - 1) return;
    if (tiles[y][x] !== TileType.FLOOR) return;

    // Must be on the border of the room
    const onEdge =
      x === room.x ||
      x === room.x + room.w - 1 ||
      y === room.y ||
      y === room.y + room.h - 1;
    if (!onEdge) return;

    // Must have a wall neighbour (so the door separates room from corridor)
    const hasWall =
      tiles[y - 1]?.[x] === TileType.WALL ||
      tiles[y + 1]?.[x] === TileType.WALL ||
      tiles[y]?.[x - 1] === TileType.WALL ||
      tiles[y]?.[x + 1] === TileType.WALL;
    if (!hasWall) return;

    edges.push({ x, y });
  };

  // Top and bottom edges
  for (let dx = 0; dx < room.w; dx++) {
    check(room.x + dx, room.y);
    check(room.x + dx, room.y + room.h - 1);
  }
  // Left and right edges
  for (let dy = 1; dy < room.h - 1; dy++) {
    check(room.x, room.y + dy);
    check(room.x + room.w - 1, room.y + dy);
  }

  return edges;
}
