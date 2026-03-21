// ---------------------------------------------------------------------------
// Morgan -- Procedural Level Generator
// Generates castle floor layouts with rooms, corridors, torches, shadows,
// traps, locked doors, keys, potions, and varied guard types
// ---------------------------------------------------------------------------

import {
  FLOOR_W, FLOOR_H, TileType, CELL_SIZE, GuardType, PickupType,
  type LevelDef,
} from "./MorganConfig";
import {
  type Vec2, v2, createGuard, createArtifact, createPickup, createTrap,
  type Guard, type Artifact, type Pickup, type Trap,
} from "./MorganState";

interface Room {
  x: number; y: number; w: number; h: number;
  cx: number; cy: number;
  tag?: "treasure" | "guard" | "normal" | "secret";
}

function rng(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function roomsOverlap(a: Room, b: Room, pad = 1): boolean {
  return !(a.x + a.w + pad <= b.x || b.x + b.w + pad <= a.x ||
           a.y + a.h + pad <= b.y || b.y + b.h + pad <= a.y);
}
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export interface GeneratedLevel {
  tiles: TileType[][];
  guards: Guard[];
  artifacts: Artifact[];
  pickups: Pickup[];
  traps: Trap[];
  playerStart: Vec2;
  exitPos: Vec2;
  torchPositions: Vec2[];
  rooms: Room[];
}

export function generateLevel(def: LevelDef): GeneratedLevel {
  // Init all walls
  const tiles: TileType[][] = [];
  for (let y = 0; y < FLOOR_H; y++) {
    tiles[y] = [];
    for (let x = 0; x < FLOOR_W; x++) {
      tiles[y][x] = TileType.WALL;
    }
  }

  // Generate rooms using BSP-lite
  const rooms: Room[] = [];
  const targetRooms = 8 + def.level * 2;
  let attempts = 0;
  while (rooms.length < targetRooms && attempts < 500) {
    attempts++;
    const w = rng(4, 8);
    const h = rng(4, 8);
    const x = rng(1, FLOOR_W - w - 2);
    const y = rng(1, FLOOR_H - h - 2);
    const room: Room = { x, y, w, h, cx: Math.floor(x + w / 2), cy: Math.floor(y + h / 2) };
    if (rooms.some(r => roomsOverlap(r, room, 2))) continue;
    rooms.push(room);
    // Carve room
    for (let ry = y; ry < y + h; ry++) {
      for (let rx = x; rx < x + w; rx++) {
        tiles[ry][rx] = TileType.FLOOR;
      }
    }
      // L-shaped extension (30% chance for larger rooms)
      if (room.w >= 5 && room.h >= 5 && Math.random() < 0.3 && rooms.length > 2) {
        const extW = rng(3, Math.min(5, room.w - 1));
        const extH = rng(3, Math.min(5, room.h - 1));
        const extX = room.x + (Math.random() < 0.5 ? room.w : -extW);
        const extY = room.y + rng(0, room.h - extH);
        if (extX >= 2 && extX + extW < FLOOR_W - 2 && extY >= 2 && extY + extH < FLOOR_H - 2) {
          const extRoom: Room = { x: extX, y: extY, w: extW, h: extH, cx: extX + Math.floor(extW / 2), cy: extY + Math.floor(extH / 2) };
          if (!rooms.some(r => r !== room && roomsOverlap(r, extRoom))) {
            // Carve extension
            for (let ey = extRoom.y; ey < extRoom.y + extRoom.h; ey++) {
              for (let ex = extRoom.x; ex < extRoom.x + extRoom.w; ex++) {
                tiles[ey][ex] = TileType.FLOOR;
              }
            }
          }
        }
      }
  }

  // Sort rooms by position for corridor connectivity
  rooms.sort((a, b) => a.cx + a.cy - (b.cx + b.cy));

  // Tag rooms
  rooms[0].tag = "normal"; // start room
  rooms[rooms.length - 1].tag = "normal"; // exit room
  for (let i = 1; i < rooms.length - 1; i++) {
    const r = Math.random();
    if (r < 0.15) rooms[i].tag = "treasure";
    else if (r < 0.35) rooms[i].tag = "guard";
    else if (r < 0.45) rooms[i].tag = "secret";
    else rooms[i].tag = "normal";
  }

  // Connect rooms with L-shaped corridors
  // Track which corridor indices get locked doors so we can place keys BEFORE them
  const lockedDoorIndices: number[] = [];
  for (let i = 0; i < rooms.length - 1; i++) {
    const a = rooms[i], b = rooms[i + 1];
    const x1 = a.cx, y1 = a.cy;
    const x2 = b.cx, y2 = b.cy;
    const sx = x1 < x2 ? 1 : -1;
    for (let x = x1; x !== x2 + sx; x += sx) {
      if (x >= 0 && x < FLOOR_W && tiles[y1][x] === TileType.WALL) tiles[y1][x] = TileType.FLOOR;
    }
    const sy = y1 < y2 ? 1 : -1;
    for (let y = y1; y !== y2 + sy; y += sy) {
      if (y >= 0 && y < FLOOR_H && tiles[y][x2] === TileType.WALL) tiles[y][x2] = TileType.FLOOR;
    }
    // Place door or locked door at corridor-room junction
    // Only lock corridors at index >= 3 so rooms 0-2 are always accessible for keys
    if (lockedDoorIndices.length < def.lockedDoors && i >= 3 && Math.random() < 0.35 && b.tag === "treasure") {
      tiles[y1][x2] = TileType.LOCKED_DOOR;
      lockedDoorIndices.push(i);
    } else if (Math.random() < 0.4) {
      tiles[y1][x2] = TileType.DOOR;
    }
  }

  // Place shadow alcoves (multiple per room for variety)
  for (const room of rooms) {
    const shadowCount = room.tag === "secret" ? rng(2, 4) : (Math.random() < 0.6 ? rng(1, 2) : 0);
    for (let s = 0; s < shadowCount; s++) {
      const sx = room.x + rng(0, room.w - 1);
      const sy = room.y + rng(0, room.h - 1);
      if (tiles[sy][sx] === TileType.FLOOR) {
        tiles[sy][sx] = TileType.SHADOW;
      }
    }

      // Wall alcoves (hiding spots) - indent single tiles from walls
      if (Math.random() < 0.25 && room.w >= 5) {
        const alcoveCount = rng(1, 2);
        for (let al = 0; al < alcoveCount; al++) {
          // Find a wall-adjacent floor tile
          const wallSide = rng(0, 3); // 0=top, 1=right, 2=bottom, 3=left
          let ax: number, ay: number;
          switch (wallSide) {
            case 0: ax = room.x + rng(1, room.w - 2); ay = room.y - 1; break;
            case 1: ax = room.x + room.w; ay = room.y + rng(1, room.h - 2); break;
            case 2: ax = room.x + rng(1, room.w - 2); ay = room.y + room.h; break;
            default: ax = room.x - 1; ay = room.y + rng(1, room.h - 2); break;
          }
          if (ax >= 1 && ax < FLOOR_W - 1 && ay >= 1 && ay < FLOOR_H - 1 && tiles[ay][ax] === TileType.WALL) {
            tiles[ay][ax] = TileType.SHADOW;
          }
        }
      }
  }

  // Place torches
  const torchPositions: Vec2[] = [];
  for (const room of rooms) {
    const numTorches = room.tag === "secret" ? 0 : rng(1, 3);
    for (let t = 0; t < numTorches; t++) {
      const side = rng(0, 3);
      let tx: number, ty: number;
      switch (side) {
        case 0: tx = room.x - 1; ty = room.y + rng(0, room.h - 1); break;
        case 1: tx = room.x + room.w; ty = room.y + rng(0, room.h - 1); break;
        case 2: tx = room.x + rng(0, room.w - 1); ty = room.y - 1; break;
        default: tx = room.x + rng(0, room.w - 1); ty = room.y + room.h; break;
      }
      if (tx >= 0 && tx < FLOOR_W && ty >= 0 && ty < FLOOR_H && tiles[ty][tx] === TileType.WALL) {
        tiles[ty][tx] = TileType.TORCH;
        torchPositions.push(v2(tx * CELL_SIZE + CELL_SIZE / 2, ty * CELL_SIZE + CELL_SIZE / 2));
      }
    }
  }

  // Player starts in first room
  const startRoom = rooms[0];
  const playerStart = v2(startRoom.cx * CELL_SIZE + CELL_SIZE / 2, startRoom.cy * CELL_SIZE + CELL_SIZE / 2);

  // Exit in last room
  const exitRoom = rooms[rooms.length - 1];
  const exitPos = v2(exitRoom.cx * CELL_SIZE + CELL_SIZE / 2, exitRoom.cy * CELL_SIZE + CELL_SIZE / 2);
  tiles[exitRoom.cy][exitRoom.cx] = TileType.EXIT;

  // Place artifacts in random rooms (not start/exit)
  const artifacts: Artifact[] = [];
  const artifactTypes: Artifact["type"][] = ["chalice", "scroll", "amulet", "crystal", "tome"];
  const artRooms = shuffle(rooms.slice(1, -1));
  for (let i = 0; i < def.artifactCount && artRooms.length > 0; i++) {
    const room = artRooms[i % artRooms.length];
    const ax = room.x + rng(1, Math.max(1, room.w - 2));
    const ay = room.y + rng(1, Math.max(1, room.h - 2));
    artifacts.push(createArtifact(
      v2(ax * CELL_SIZE + CELL_SIZE / 2, ay * CELL_SIZE + CELL_SIZE / 2),
      artifactTypes[i % artifactTypes.length],
    ));
  }

  // Place pickups
  const pickups: Pickup[] = [];
  // Keys: one per locked door, placed in rooms BEFORE the lock to prevent deadlocks
  for (const lockIdx of lockedDoorIndices) {
    // Key must be in a room with index < lockIdx (guaranteed accessible before the lock)
    const eligibleRooms = rooms.slice(0, lockIdx);
    if (eligibleRooms.length === 0) continue;
    const room = eligibleRooms[rng(0, eligibleRooms.length - 1)];
    pickups.push(createPickup(
      v2((room.x + rng(1, Math.max(1, room.w - 2))) * CELL_SIZE + CELL_SIZE / 2,
         (room.y + rng(1, Math.max(1, room.h - 2))) * CELL_SIZE + CELL_SIZE / 2),
      PickupType.KEY,
    ));
  }
  // Potions: scattered in treasure rooms and randomly
  for (const room of rooms) {
    if (room.tag === "treasure") {
      pickups.push(createPickup(
        v2((room.x + rng(1, Math.max(1, room.w - 2))) * CELL_SIZE + CELL_SIZE / 2,
           (room.y + rng(1, Math.max(1, room.h - 2))) * CELL_SIZE + CELL_SIZE / 2),
        Math.random() < 0.5 ? PickupType.HEALTH_POTION : PickupType.MANA_POTION,
      ));
    } else if (Math.random() < 0.15 && room !== rooms[0]) {
      pickups.push(createPickup(
        v2((room.x + rng(1, Math.max(1, room.w - 2))) * CELL_SIZE + CELL_SIZE / 2,
           (room.y + rng(1, Math.max(1, room.h - 2))) * CELL_SIZE + CELL_SIZE / 2),
        Math.random() < 0.5 ? PickupType.HEALTH_POTION : PickupType.MANA_POTION,
      ));
    }
  }

  // Extra mana potions on later levels
  if (def.level >= 4) {
    const extraManaRooms = shuffle([...rooms]).slice(0, 2);
    for (const room of extraManaRooms) {
      const mx = room.cx * CELL_SIZE + CELL_SIZE / 2 + (Math.random() - 0.5) * 2;
      const mz = room.cy * CELL_SIZE + CELL_SIZE / 2 + (Math.random() - 0.5) * 2;
      pickups.push(createPickup(v2(mx, mz), PickupType.MANA_POTION));
    }
  }

  // Place traps
  const traps: Trap[] = [];
  const trapRooms = shuffle(rooms.slice(1, -1));
  for (let i = 0; i < def.trapCount && trapRooms.length > 0; i++) {
    const room = trapRooms[i % trapRooms.length];
    const tx = room.x + rng(1, Math.max(1, room.w - 2));
    const ty = room.y + rng(1, Math.max(1, room.h - 2));
    const trapType = Math.random() < 0.5 ? "pressure" as const : "ward" as const;
    if (trapType === "pressure") {
      tiles[ty][tx] = TileType.TRAP_PRESSURE;
    } else {
      tiles[ty][tx] = TileType.TRAP_WARD;
    }
    traps.push(createTrap(
      v2(tx * CELL_SIZE + CELL_SIZE / 2, ty * CELL_SIZE + CELL_SIZE / 2),
      trapType,
    ));
  }

  // Place environmental hazards
  const hazardRooms = shuffle(rooms.slice(1, -1));
  let waterPlaced = 0, firePlaced = 0;
  for (const room of hazardRooms) {
    // Water tiles
    while (waterPlaced < def.waterTiles) {
      const wx = room.x + rng(1, Math.max(1, room.w - 2));
      const wy = room.y + rng(1, Math.max(1, room.h - 2));
      if (tiles[wy][wx] === TileType.FLOOR) {
        tiles[wy][wx] = TileType.WATER;
        waterPlaced++;
      }
      if (waterPlaced >= def.waterTiles) break;
    }
    // Fire grates
    while (firePlaced < def.fireTiles) {
      const fx = room.x + rng(1, Math.max(1, room.w - 2));
      const fy = room.y + rng(1, Math.max(1, room.h - 2));
      if (tiles[fy][fx] === TileType.FLOOR) {
        tiles[fy][fx] = TileType.FIRE_GRATE;
        firePlaced++;
      }
      if (firePlaced >= def.fireTiles) break;
    }
  }

  // Place guards with varied types and patrol paths
  const guards: Guard[] = [];
  const guardRooms = rooms.slice(1); // not in start room
  // Decide guard type distribution
  const typePool: GuardType[] = [];
  for (let i = 0; i < def.guardCount; i++) {
    if (def.hasHound && i % 5 === 4) typePool.push(GuardType.HOUND);
    else if (def.hasMage && i % 4 === 3) typePool.push(GuardType.MAGE);
    else if (def.hasHeavy && i % 3 === 2) typePool.push(GuardType.HEAVY);
    else typePool.push(GuardType.NORMAL);
  }

  for (let i = 0; i < def.guardCount; i++) {
    const room = guardRooms[i % guardRooms.length];
    const gx = room.x + rng(1, Math.max(1, room.w - 2));
    const gy = room.y + rng(1, Math.max(1, room.h - 2));
    // Patrol path: some guards patrol corridors (multi-room), others stay in room
    const patrolPath: Vec2[] = [];
    const jitter = () => (Math.random() - 0.5) * 2;
    const corridorPatrol = Math.random() < 0.3 && i < guardRooms.length - 1;
    if (corridorPatrol) {
      // Patrol between two rooms
      const nextRoom = guardRooms[(i + 1) % guardRooms.length];
      patrolPath.push(v2(
        room.cx * CELL_SIZE + CELL_SIZE / 2 + jitter(),
        room.cy * CELL_SIZE + CELL_SIZE / 2 + jitter(),
      ));
      patrolPath.push(v2(
        nextRoom.cx * CELL_SIZE + CELL_SIZE / 2 + jitter(),
        nextRoom.cy * CELL_SIZE + CELL_SIZE / 2 + jitter(),
      ));
    } else {
      const numWaypoints = rng(2, 4);
      for (let w = 0; w < numWaypoints; w++) {
        patrolPath.push(v2(
          (room.x + rng(1, Math.max(1, room.w - 2))) * CELL_SIZE + CELL_SIZE / 2 + jitter(),
          (room.y + rng(1, Math.max(1, room.h - 2))) * CELL_SIZE + CELL_SIZE / 2 + jitter(),
        ));
      }
    }
    guards.push(createGuard(
      v2(gx * CELL_SIZE + CELL_SIZE / 2, gy * CELL_SIZE + CELL_SIZE / 2),
      patrolPath,
      def.hasBoss && i === 0,
      def.hasBoss && i === 0 ? GuardType.NORMAL : typePool[i],
    ));
  }

  return { tiles, guards, artifacts, pickups, traps, playerStart, exitPos, torchPositions, rooms };
}
