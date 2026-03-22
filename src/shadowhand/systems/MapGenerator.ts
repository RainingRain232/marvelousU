// ---------------------------------------------------------------------------
// Shadowhand mode — procedural floor plan generator
// ---------------------------------------------------------------------------

import type { HeistMap, MapTile, Room } from "../state/ShadowhandState";
import type { TargetDef } from "../config/TargetDefs";
import { ShadowhandConfig } from "../config/ShadowhandConfig";
import { seedRng } from "../state/ShadowhandState";

const ROOM_TYPES_BY_TIER: Record<number, string[]> = {
  1: ["entrance", "hallway", "bedroom", "kitchen", "cellar"],
  2: ["entrance", "hallway", "bedroom", "kitchen", "guard_room", "library", "courtyard"],
  3: ["entrance", "hallway", "guard_room", "bedroom", "treasury", "chapel", "armory", "library", "tower"],
  4: ["entrance", "hallway", "guard_room", "bedroom", "treasury", "chapel", "armory", "library", "throne", "tower", "courtyard"],
  5: ["entrance", "hallway", "guard_room", "treasury", "vault", "chapel", "armory", "throne", "tower", "sewer"],
};

function createTile(x: number, y: number): MapTile {
  return {
    x, y,
    type: "wall",
    roomId: -1,
    lit: false,
    torchSource: false,
    revealed: false,
    hasGuard: false,
    loot: null,
    trapArmed: false,
    smoke: 0,
    caltrops: false,
  };
}

function carveRoom(map: MapTile[][], room: Room): void {
  for (let ry = room.y; ry < room.y + room.h; ry++) {
    for (let rx = room.x; rx < room.x + room.w; rx++) {
      if (ry >= 0 && ry < map.length && rx >= 0 && rx < map[0].length) {
        map[ry][rx].type = "floor";
        map[ry][rx].roomId = room.id;
      }
    }
  }
}

function carveCorridor(map: MapTile[][], x1: number, y1: number, x2: number, y2: number, rng: () => number): void {
  let cx = x1, cy = y1;
  // L-shaped corridor: go horizontal first, then vertical (or vice versa)
  const horizFirst = rng() < 0.5;

  if (horizFirst) {
    while (cx !== x2) {
      if (cy >= 0 && cy < map.length && cx >= 0 && cx < map[0].length) {
        if (map[cy][cx].type === "wall") {
          map[cy][cx].type = "floor";
          map[cy][cx].roomId = -1;
        }
      }
      cx += cx < x2 ? 1 : -1;
    }
    while (cy !== y2) {
      if (cy >= 0 && cy < map.length && cx >= 0 && cx < map[0].length) {
        if (map[cy][cx].type === "wall") {
          map[cy][cx].type = "floor";
          map[cy][cx].roomId = -1;
        }
      }
      cy += cy < y2 ? 1 : -1;
    }
  } else {
    while (cy !== y2) {
      if (cy >= 0 && cy < map.length && cx >= 0 && cx < map[0].length) {
        if (map[cy][cx].type === "wall") {
          map[cy][cx].type = "floor";
          map[cy][cx].roomId = -1;
        }
      }
      cy += cy < y2 ? 1 : -1;
    }
    while (cx !== x2) {
      if (cy >= 0 && cy < map.length && cx >= 0 && cx < map[0].length) {
        if (map[cy][cx].type === "wall") {
          map[cy][cx].type = "floor";
          map[cy][cx].roomId = -1;
        }
      }
      cx += cx < x2 ? 1 : -1;
    }
  }
}

function placeDoors(map: MapTile[][], _rooms: Room[], rng: () => number): void {
  // Find transition points between rooms/corridors and place doors
  for (let y = 1; y < map.length - 1; y++) {
    for (let x = 1; x < map[0].length - 1; x++) {
      if (map[y][x].type !== "floor") continue;
      // Check if this is a narrow passage (walls on two opposite sides, floor on other two)
      const wallH = map[y][x - 1].type === "wall" && map[y][x + 1].type === "wall";
      const wallV = map[y - 1][x].type === "wall" && map[y + 1][x].type === "wall";
      const floorH = map[y][x - 1].type === "floor" || map[y][x + 1].type === "floor";
      const floorV = map[y - 1][x].type === "floor" || map[y + 1][x].type === "floor";

      if ((wallH && floorV) || (wallV && floorH)) {
        if (rng() < 0.3) {
          map[y][x].type = rng() < 0.4 ? "locked_door" : "door";
        }
      }
    }
  }
}

function placeTraps(map: MapTile[][], target: TargetDef, rng: () => number): void {
  if (!target.hasTraps) return;
  const trapCount = 2 + Math.floor(rng() * target.tier);
  let placed = 0;
  for (let attempts = 0; attempts < 200 && placed < trapCount; attempts++) {
    const x = 2 + Math.floor(rng() * (map[0].length - 4));
    const y = 2 + Math.floor(rng() * (map.length - 4));
    if (map[y][x].type === "floor" && !map[y][x].trapArmed && !map[y][x].loot) {
      map[y][x].type = "trap";
      map[y][x].trapArmed = true;
      placed++;
    }
  }
}

function placeTorches(map: MapTile[][], rng: () => number): void {
  // Place torches in rooms, along walls
  for (let y = 1; y < map.length - 1; y++) {
    for (let x = 1; x < map[0].length - 1; x++) {
      if (map[y][x].type !== "floor") continue;
      // Adjacent to wall?
      const adjWall =
        map[y - 1][x].type === "wall" ||
        map[y + 1][x].type === "wall" ||
        map[y][x - 1].type === "wall" ||
        map[y][x + 1].type === "wall";
      if (adjWall && rng() < 0.08) {
        map[y][x].torchSource = true;
        map[y][x].lit = true;
      }
    }
  }
  // Propagate torch light
  propagateLight(map);
}

function propagateLight(map: MapTile[][]): void {
  const radius = ShadowhandConfig.TORCH_RADIUS;
  const r2 = radius * radius;
  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[0].length; x++) {
      if (!map[y][x].torchSource) continue;
      for (let dy = -Math.ceil(radius); dy <= Math.ceil(radius); dy++) {
        for (let dx = -Math.ceil(radius); dx <= Math.ceil(radius); dx++) {
          const ny = y + dy, nx = x + dx;
          if (ny < 0 || ny >= map.length || nx < 0 || nx >= map[0].length) continue;
          if (dx * dx + dy * dy <= r2 && map[ny][nx].type !== "wall") {
            map[ny][nx].lit = true;
          }
        }
      }
    }
  }
}

function placeLoot(map: MapTile[][], rooms: Room[], target: TargetDef, rng: () => number): { x: number; y: number } {
  // Place primary loot in deepest room (farthest from entrance)
  const entrance = rooms.find(r => r.type === "entrance") ?? rooms[0];
  let farthest = rooms[0];
  let maxDist = 0;
  for (const room of rooms) {
    const d = Math.abs(room.x - entrance.x) + Math.abs(room.y - entrance.y);
    if (d > maxDist && room.type !== "entrance") {
      maxDist = d;
      farthest = room;
    }
  }
  const plx = farthest.x + Math.floor(farthest.w / 2);
  const ply = farthest.y + Math.floor(farthest.h / 2);
  if (ply < map.length && plx < map[0].length) {
    map[ply][plx].type = "primary_loot";
    map[ply][plx].loot = target.primaryLoot;
  }

  // Scatter secondary loot
  for (const lootDef of target.lootTable) {
    const count = 1 + Math.floor(rng() * 2);
    for (let i = 0; i < count; i++) {
      for (let attempts = 0; attempts < 50; attempts++) {
        const room = rooms[Math.floor(rng() * rooms.length)];
        const lx = room.x + 1 + Math.floor(rng() * (room.w - 2));
        const ly = room.y + 1 + Math.floor(rng() * (room.h - 2));
        if (ly < map.length && lx < map[0].length && map[ly][lx].type === "floor" && !map[ly][lx].loot) {
          map[ly][lx].type = "loot_spot";
          map[ly][lx].loot = lootDef;
          break;
        }
      }
    }
  }

  return { x: plx, y: ply };
}

function placeEntryPoints(map: MapTile[][], target: TargetDef, rng: () => number): { x: number; y: number }[] {
  const entries: { x: number; y: number }[] = [];
  const w = map[0].length, h = map.length;
  const count = target.entryPoints;

  // Place entries on edges
  const edges: { x: number; y: number }[] = [];
  for (let x = 1; x < w - 1; x++) {
    if (map[1][x].type === "floor") edges.push({ x, y: 0 });
    if (map[h - 2][x].type === "floor") edges.push({ x, y: h - 1 });
  }
  for (let y = 1; y < h - 1; y++) {
    if (map[y][1].type === "floor") edges.push({ x: 0, y });
    if (map[y][w - 2].type === "floor") edges.push({ x: w - 1, y });
  }

  // If not enough edge entries, use room positions near edges
  if (edges.length < count) {
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        if (map[y][x].type === "floor" && (x <= 2 || x >= w - 3 || y <= 2 || y >= h - 3)) {
          edges.push({ x, y });
        }
      }
    }
  }

  for (let i = 0; i < count && edges.length > 0; i++) {
    const idx = Math.floor(rng() * edges.length);
    const entry = edges.splice(idx, 1)[0];
    map[entry.y][entry.x].type = "entry_point";
    entries.push(entry);
  }

  // Ensure at least one entry
  if (entries.length === 0) {
    // Fallback: first floor tile on top edge
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        if (map[y][x].type === "floor") {
          map[y][x].type = "entry_point";
          entries.push({ x, y });
          break;
        }
      }
      if (entries.length > 0) break;
    }
  }

  return entries;
}

export function generateHeistMap(target: TargetDef, seed: number): HeistMap {
  const rng = seedRng(seed);
  const w = target.mapWidth;
  const h = target.mapHeight;

  // Initialize all walls
  const tiles: MapTile[][] = [];
  for (let y = 0; y < h; y++) {
    tiles[y] = [];
    for (let x = 0; x < w; x++) {
      tiles[y][x] = createTile(x, y);
    }
  }

  // Generate rooms
  const roomCount = target.roomCount[0] + Math.floor(rng() * (target.roomCount[1] - target.roomCount[0] + 1));
  const roomTypes = ROOM_TYPES_BY_TIER[target.tier] ?? ROOM_TYPES_BY_TIER[1];
  const rooms: Room[] = [];

  for (let i = 0; i < roomCount; i++) {
    const rw = ShadowhandConfig.MIN_ROOM_SIZE + Math.floor(rng() * (ShadowhandConfig.MAX_ROOM_SIZE - ShadowhandConfig.MIN_ROOM_SIZE));
    const rh = ShadowhandConfig.MIN_ROOM_SIZE + Math.floor(rng() * (ShadowhandConfig.MAX_ROOM_SIZE - ShadowhandConfig.MIN_ROOM_SIZE));
    const rx = 2 + Math.floor(rng() * (w - rw - 4));
    const ry = 2 + Math.floor(rng() * (h - rh - 4));

    // Check overlap with slight padding
    let overlap = false;
    for (const other of rooms) {
      if (rx < other.x + other.w + 1 && rx + rw + 1 > other.x &&
          ry < other.y + other.h + 1 && ry + rh + 1 > other.y) {
        overlap = true;
        break;
      }
    }
    if (overlap) continue;

    const roomType = i === 0 ? "entrance" : roomTypes[Math.floor(rng() * roomTypes.length)];
    const room: Room = { id: rooms.length, x: rx, y: ry, w: rw, h: rh, type: roomType, connected: [] };
    rooms.push(room);
    carveRoom(tiles, room);
  }

  // Connect rooms with corridors (minimum spanning tree + some extras)
  for (let i = 1; i < rooms.length; i++) {
    const a = rooms[i];
    // Find nearest unconnected room
    let nearest = rooms[0];
    let minDist = Infinity;
    for (let j = 0; j < i; j++) {
      const b = rooms[j];
      const d = Math.abs(a.x + a.w / 2 - b.x - b.w / 2) + Math.abs(a.y + a.h / 2 - b.y - b.h / 2);
      if (d < minDist) { minDist = d; nearest = b; }
    }
    const ax = Math.floor(a.x + a.w / 2);
    const ay = Math.floor(a.y + a.h / 2);
    const bx = Math.floor(nearest.x + nearest.w / 2);
    const by = Math.floor(nearest.y + nearest.h / 2);
    carveCorridor(tiles, ax, ay, bx, by, rng);
    a.connected.push(nearest.id);
    nearest.connected.push(a.id);
  }

  // Add some extra corridors for loops
  for (let i = 0; i < rooms.length; i++) {
    if (rng() < 0.3 && rooms.length > 2) {
      const j = Math.floor(rng() * rooms.length);
      if (j !== i) {
        const a = rooms[i], b = rooms[j];
        carveCorridor(tiles, Math.floor(a.x + a.w / 2), Math.floor(a.y + a.h / 2),
          Math.floor(b.x + b.w / 2), Math.floor(b.y + b.h / 2), rng);
      }
    }
  }

  // Place features
  placeDoors(tiles, rooms, rng);
  placeTorches(tiles, rng);
  if (target.hasTraps) placeTraps(tiles, target, rng);
  const primaryLootPos = placeLoot(tiles, rooms, target, rng);
  const entryPoints = placeEntryPoints(tiles, target, rng);

  // Exit points = entry points (must escape the way you came)
  const exitPoints = [...entryPoints];

  return {
    width: w,
    height: h,
    tiles,
    rooms,
    entryPoints,
    primaryLootPos,
    exitPoints,
  };
}

export function recalculateLight(map: HeistMap): void {
  // Reset all light
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      map.tiles[y][x].lit = map.tiles[y][x].torchSource;
    }
  }
  propagateLight(map.tiles);
}
