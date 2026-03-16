// Procedural dungeon generation using BSP (Binary Space Partition)
import { DungeonTileType } from "@/types";
import type { Vec2 } from "@/types";
import { SeededRandom } from "@sim/utils/random";
import type { DungeonFloor, DungeonRoom, DungeonTile, TrapType } from "@rpg/state/DungeonState";
import type { DungeonState } from "@rpg/state/DungeonState";
import type { DungeonDef } from "@rpg/config/DungeonDefs";
import { rollDungeonModifiers, mergeModifierEffects } from "@rpg/config/DungeonModifierDefs";
import type { DungeonModifierDef, DungeonModifierEffects } from "@rpg/config/DungeonModifierDefs";

// ---------------------------------------------------------------------------
// BSP Node
// ---------------------------------------------------------------------------

interface BSPNode {
  x: number;
  y: number;
  w: number;
  h: number;
  left: BSPNode | null;
  right: BSPNode | null;
  room: { x: number; y: number; w: number; h: number } | null;
}

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

export function generateDungeon(def: DungeonDef, seed: number): DungeonState {
  const rng = new SeededRandom(seed);

  // Roll dungeon modifiers for this run
  const modifiers = rollDungeonModifiers(rng);
  const mergedEffects = mergeModifierEffects(modifiers);

  const floors: DungeonFloor[] = [];

  for (let level = 0; level < def.floors; level++) {
    const floor = _generateFloor(def, level, rng, mergedEffects);
    floors.push(floor);
  }

  return {
    dungeonId: def.id,
    name: def.name,
    theme: def.theme,
    floors,
    currentFloor: 0,
    partyPosition: { ...floors[0].stairsUp },
    totalFloors: def.floors,
    bossDefeated: false,
    modifiers,
    mergedEffects,
  };
}

// ---------------------------------------------------------------------------
// Floor generation
// ---------------------------------------------------------------------------

function _generateFloor(def: DungeonDef, level: number, rng: SeededRandom, _modEffects?: DungeonModifierEffects): DungeonFloor {
  const width = def.gridWidth;
  const height = def.gridHeight;

  // Initialize grid with walls
  const grid: DungeonTile[][] = [];
  for (let y = 0; y < height; y++) {
    const row: DungeonTile[] = [];
    for (let x = 0; x < width; x++) {
      row.push({
        x,
        y,
        type: DungeonTileType.WALL,
        walkable: false,
        visible: false,
        revealed: false,
        roomId: null,
      });
    }
    grid.push(row);
  }

  // BSP split
  const root: BSPNode = { x: 1, y: 1, w: width - 2, h: height - 2, left: null, right: null, room: null };
  _splitBSP(root, def.minRoomSize, def.maxRoomSize, rng, 0);

  // Place rooms
  const rooms: DungeonRoom[] = [];
  _placeRooms(root, grid, rooms, rng, def.minRoomSize, def.maxRoomSize);

  // Connect rooms via corridors
  const corridors: Vec2[][] = [];
  _connectBSP(root, grid, corridors, rng);

  // Assign room types
  const isLastFloor = level === def.floors - 1;
  _assignRoomTypes(rooms, isLastFloor, rng);

  // Place encounters in rooms
  _placeEncounters(rooms, def.encounterTable, def.bossEncounterId, rng);

  // Place stairs
  const entranceRoom = rooms.find(r => r.type === "entrance")!;
  const exitRoom = rooms.find(r => r.type === "exit");

  const stairsUp: Vec2 = {
    x: entranceRoom.bounds.x + Math.floor(entranceRoom.bounds.width / 2),
    y: entranceRoom.bounds.y + Math.floor(entranceRoom.bounds.height / 2),
  };
  grid[stairsUp.y][stairsUp.x].type = DungeonTileType.STAIRS_UP;

  let stairsDown: Vec2 | null = null;
  if (exitRoom && !isLastFloor) {
    stairsDown = {
      x: exitRoom.bounds.x + Math.floor(exitRoom.bounds.width / 2),
      y: exitRoom.bounds.y + Math.floor(exitRoom.bounds.height / 2),
    };
    grid[stairsDown.y][stairsDown.x].type = DungeonTileType.STAIRS_DOWN;
  }

  // Place treasure chests in treasure rooms
  for (const room of rooms) {
    if (room.type === "treasure") {
      const cx = room.bounds.x + Math.floor(room.bounds.width / 2);
      const cy = room.bounds.y + Math.floor(room.bounds.height / 2);
      if (grid[cy][cx].type === DungeonTileType.FLOOR) {
        grid[cy][cx].type = DungeonTileType.CHEST;
      }
    }
  }

  // --- Secret rooms: 15% chance per floor ---
  if (rng.next() < 0.15) {
    _placeSecretRoom(grid, rooms, width, height, rng, def.minRoomSize);
  }

  // --- Puzzle room: 1 per floor ---
  _placePuzzleRoom(rooms, rng);

  // --- Traps: 10% of corridor tiles ---
  _placeTraps(grid, corridors, rng);

  return {
    level,
    grid,
    width,
    height,
    rooms,
    corridors,
    stairsDown,
    stairsUp,
  };
}

// ---------------------------------------------------------------------------
// BSP splitting
// ---------------------------------------------------------------------------

function _splitBSP(
  node: BSPNode,
  minSize: number,
  _maxSize: number,
  rng: SeededRandom,
  depth: number,
): void {
  if (depth > 8) return;

  const canSplitH = node.h >= minSize * 2 + 2;
  const canSplitV = node.w >= minSize * 2 + 2;

  if (!canSplitH && !canSplitV) return;

  // Choose split direction
  let splitHorizontal: boolean;
  if (!canSplitH) splitHorizontal = false;
  else if (!canSplitV) splitHorizontal = true;
  else splitHorizontal = rng.next() < 0.5;

  if (splitHorizontal) {
    const splitY = rng.int(node.y + minSize, node.y + node.h - minSize);
    node.left = { x: node.x, y: node.y, w: node.w, h: splitY - node.y, left: null, right: null, room: null };
    node.right = { x: node.x, y: splitY, w: node.w, h: node.y + node.h - splitY, left: null, right: null, room: null };
  } else {
    const splitX = rng.int(node.x + minSize, node.x + node.w - minSize);
    node.left = { x: node.x, y: node.y, w: splitX - node.x, h: node.h, left: null, right: null, room: null };
    node.right = { x: splitX, y: node.y, w: node.x + node.w - splitX, h: node.h, left: null, right: null, room: null };
  }

  _splitBSP(node.left, minSize, _maxSize, rng, depth + 1);
  _splitBSP(node.right, minSize, _maxSize, rng, depth + 1);
}

// ---------------------------------------------------------------------------
// Room placement
// ---------------------------------------------------------------------------

function _placeRooms(
  node: BSPNode,
  grid: DungeonTile[][],
  rooms: DungeonRoom[],
  rng: SeededRandom,
  minSize: number,
  maxSize: number,
): void {
  if (node.left || node.right) {
    if (node.left) _placeRooms(node.left, grid, rooms, rng, minSize, maxSize);
    if (node.right) _placeRooms(node.right, grid, rooms, rng, minSize, maxSize);
    return;
  }

  // Leaf node — place a room
  const roomW = rng.int(minSize, Math.min(maxSize, node.w - 1) + 1);
  const roomH = rng.int(minSize, Math.min(maxSize, node.h - 1) + 1);
  const roomX = rng.int(node.x, node.x + node.w - roomW);
  const roomY = rng.int(node.y, node.y + node.h - roomH);

  node.room = { x: roomX, y: roomY, w: roomW, h: roomH };

  const roomId = `room_${rooms.length}`;
  rooms.push({
    id: roomId,
    bounds: { x: roomX, y: roomY, width: roomW, height: roomH },
    type: "normal",
    cleared: false,
    encounterId: null,
    loot: [],
  });

  // Carve room into grid
  for (let y = roomY; y < roomY + roomH; y++) {
    for (let x = roomX; x < roomX + roomW; x++) {
      if (y >= 0 && y < grid.length && x >= 0 && x < grid[0].length) {
        grid[y][x].type = DungeonTileType.FLOOR;
        grid[y][x].walkable = true;
        grid[y][x].roomId = roomId;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Corridor connection
// ---------------------------------------------------------------------------

function _getRoom(node: BSPNode): { x: number; y: number; w: number; h: number } | null {
  if (node.room) return node.room;
  if (node.left) {
    const r = _getRoom(node.left);
    if (r) return r;
  }
  if (node.right) {
    const r = _getRoom(node.right);
    if (r) return r;
  }
  return null;
}

function _connectBSP(
  node: BSPNode,
  grid: DungeonTile[][],
  corridors: Vec2[][],
  rng: SeededRandom,
): void {
  if (!node.left || !node.right) return;

  _connectBSP(node.left, grid, corridors, rng);
  _connectBSP(node.right, grid, corridors, rng);

  const roomA = _getRoom(node.left);
  const roomB = _getRoom(node.right);
  if (!roomA || !roomB) return;

  // Connect centers with L-shaped corridor
  const ax = Math.floor(roomA.x + roomA.w / 2);
  const ay = Math.floor(roomA.y + roomA.h / 2);
  const bx = Math.floor(roomB.x + roomB.w / 2);
  const by = Math.floor(roomB.y + roomB.h / 2);

  const corridor: Vec2[] = [];

  if (rng.next() < 0.5) {
    // Horizontal first, then vertical
    _carveHorizontal(grid, ax, bx, ay, corridor);
    _carveVertical(grid, ay, by, bx, corridor);
  } else {
    // Vertical first, then horizontal
    _carveVertical(grid, ay, by, ax, corridor);
    _carveHorizontal(grid, ax, bx, by, corridor);
  }

  corridors.push(corridor);
}

function _carveHorizontal(
  grid: DungeonTile[][],
  x1: number,
  x2: number,
  y: number,
  corridor: Vec2[],
): void {
  const start = Math.min(x1, x2);
  const end = Math.max(x1, x2);
  for (let x = start; x <= end; x++) {
    if (y >= 0 && y < grid.length && x >= 0 && x < grid[0].length) {
      if (grid[y][x].type === DungeonTileType.WALL) {
        grid[y][x].type = DungeonTileType.FLOOR;
        grid[y][x].walkable = true;
      }
      corridor.push({ x, y });
    }
  }
}

function _carveVertical(
  grid: DungeonTile[][],
  y1: number,
  y2: number,
  x: number,
  corridor: Vec2[],
): void {
  const start = Math.min(y1, y2);
  const end = Math.max(y1, y2);
  for (let y = start; y <= end; y++) {
    if (y >= 0 && y < grid.length && x >= 0 && x < grid[0].length) {
      if (grid[y][x].type === DungeonTileType.WALL) {
        grid[y][x].type = DungeonTileType.FLOOR;
        grid[y][x].walkable = true;
      }
      corridor.push({ x, y });
    }
  }
}

// ---------------------------------------------------------------------------
// Secret rooms
// ---------------------------------------------------------------------------

function _placeSecretRoom(
  grid: DungeonTile[][],
  rooms: DungeonRoom[],
  width: number,
  height: number,
  rng: SeededRandom,
  minRoomSize: number,
): void {
  // Find a wall adjacent to an existing room to place the secret room
  // Try to carve a small room on the opposite side of a random room's wall
  const normalRooms = rooms.filter(r => r.type === "normal" || r.type === "treasure");
  if (normalRooms.length === 0) return;

  const hostRoom = rng.pick(normalRooms);
  const roomSize = Math.max(3, Math.min(minRoomSize, 5));

  // Try each direction from the host room
  const directions = [
    { dx: -1, dy: 0, wallX: hostRoom.bounds.x - 1, wallY: hostRoom.bounds.y + Math.floor(hostRoom.bounds.height / 2) },
    { dx: 1, dy: 0, wallX: hostRoom.bounds.x + hostRoom.bounds.width, wallY: hostRoom.bounds.y + Math.floor(hostRoom.bounds.height / 2) },
    { dx: 0, dy: -1, wallX: hostRoom.bounds.x + Math.floor(hostRoom.bounds.width / 2), wallY: hostRoom.bounds.y - 1 },
    { dx: 0, dy: 1, wallX: hostRoom.bounds.x + Math.floor(hostRoom.bounds.width / 2), wallY: hostRoom.bounds.y + hostRoom.bounds.height },
  ];

  for (const dir of directions) {
    const secretX = dir.dx < 0 ? dir.wallX - roomSize : dir.dx > 0 ? dir.wallX + 1 : hostRoom.bounds.x;
    const secretY = dir.dy < 0 ? dir.wallY - roomSize : dir.dy > 0 ? dir.wallY + 1 : hostRoom.bounds.y;

    // Bounds check
    if (secretX < 1 || secretY < 1 || secretX + roomSize >= width - 1 || secretY + roomSize >= height - 1) continue;

    // Check that the area is all walls (not overlapping other rooms)
    let canPlace = true;
    for (let y = secretY; y < secretY + roomSize && canPlace; y++) {
      for (let x = secretX; x < secretX + roomSize && canPlace; x++) {
        if (grid[y][x].type !== DungeonTileType.WALL) canPlace = false;
      }
    }
    if (!canPlace) continue;

    // Place the secret room
    const secretRoomId = `room_secret_${rooms.length}`;
    const secretRoom: DungeonRoom = {
      id: secretRoomId,
      bounds: { x: secretX, y: secretY, width: roomSize, height: roomSize },
      type: "secret",
      cleared: false,
      encounterId: null,
      loot: [],
      secretRevealed: false,
    };
    rooms.push(secretRoom);

    // Carve the room
    for (let y = secretY; y < secretY + roomSize; y++) {
      for (let x = secretX; x < secretX + roomSize; x++) {
        grid[y][x].type = DungeonTileType.FLOOR;
        grid[y][x].walkable = true;
        grid[y][x].roomId = secretRoomId;
      }
    }

    // Place a chest in the center with rare loot
    const cx = secretX + Math.floor(roomSize / 2);
    const cy = secretY + Math.floor(roomSize / 2);
    grid[cy][cx].type = DungeonTileType.CHEST;

    // Mark the wall tile as a secret wall (the doorway)
    if (dir.wallY >= 0 && dir.wallY < height && dir.wallX >= 0 && dir.wallX < width) {
      const wallTile = grid[dir.wallY][dir.wallX];
      wallTile.isSecretWall = true;
      wallTile.secretRoomId = secretRoomId;
      // Secret wall is walkable once discovered but starts as wall
      wallTile.type = DungeonTileType.WALL;
      wallTile.walkable = false;
    }

    return; // Only one secret room per floor
  }
}

// ---------------------------------------------------------------------------
// Puzzle rooms
// ---------------------------------------------------------------------------

function _placePuzzleRoom(rooms: DungeonRoom[], rng: SeededRandom): void {
  // Convert one "normal" room to a puzzle room (if available)
  const normalRooms = rooms.filter(r => r.type === "normal" && !r.encounterId);
  if (normalRooms.length === 0) return;

  const puzzleRoom = rng.pick(normalRooms);
  puzzleRoom.type = "puzzle";
  puzzleRoom.puzzleSolved = false;

  // Pick a puzzle type
  const puzzleTypes: DungeonRoom["puzzleType"][] = ["lever_order", "pressure_plates", "symbol_match"];
  puzzleRoom.puzzleType = rng.pick(puzzleTypes);

  // Generate a solution (3-5 step sequence)
  const solutionLength = rng.int(3, 6);
  const solution: number[] = [];
  for (let i = 0; i < solutionLength; i++) {
    solution.push(rng.int(0, 4)); // 0-3 positions
  }
  puzzleRoom.puzzleSolution = solution;
}

// ---------------------------------------------------------------------------
// Traps
// ---------------------------------------------------------------------------

function _placeTraps(
  grid: DungeonTile[][],
  corridors: Vec2[][],
  rng: SeededRandom,
): void {
  const trapTypes: TrapType[] = ["spike", "poison", "alarm"];

  for (const corridor of corridors) {
    for (const pos of corridor) {
      if (rng.next() >= 0.10) continue; // 10% chance per corridor tile
      const tile = grid[pos.y]?.[pos.x];
      if (!tile || tile.type !== DungeonTileType.FLOOR) continue;

      tile.type = DungeonTileType.TRAP;
      tile.walkable = true; // Traps are on walkable floor
      tile.trapType = rng.pick(trapTypes);
      tile.trapTriggered = false;
      tile.trapDetected = false;
    }
  }
}

// ---------------------------------------------------------------------------
// Room type assignment
// ---------------------------------------------------------------------------

function _assignRoomTypes(rooms: DungeonRoom[], isLastFloor: boolean, rng: SeededRandom): void {
  if (rooms.length === 0) return;

  // First room = entrance
  rooms[0].type = "entrance";

  // Last room = exit (or boss on final floor)
  if (rooms.length > 1) {
    rooms[rooms.length - 1].type = isLastFloor ? "boss" : "exit";
  }

  // Assign remaining rooms
  for (let i = 1; i < rooms.length - 1; i++) {
    const roll = rng.next();
    if (roll < 0.15) {
      rooms[i].type = "treasure";
    } else if (roll < 0.25) {
      rooms[i].type = "safe";
    } else {
      rooms[i].type = "normal";
    }
  }
}

// ---------------------------------------------------------------------------
// Encounter placement
// ---------------------------------------------------------------------------

function _placeEncounters(
  rooms: DungeonRoom[],
  encounterTable: string[],
  bossEncounterId: string,
  rng: SeededRandom,
): void {
  for (const room of rooms) {
    switch (room.type) {
      case "normal":
        // 70% chance of encounter
        if (rng.next() < 0.7 && encounterTable.length > 0) {
          room.encounterId = rng.pick(encounterTable);
        }
        break;
      case "boss":
        room.encounterId = bossEncounterId;
        break;
      case "treasure":
        // 50% chance of guardian encounter
        if (rng.next() < 0.5 && encounterTable.length > 0) {
          room.encounterId = rng.pick(encounterTable);
        }
        break;
      // entrance, exit, safe = no encounters
    }
  }
}
