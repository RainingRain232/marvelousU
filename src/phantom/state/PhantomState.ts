// ---------------------------------------------------------------------------
// Phantom — State factory & persistence (v3)
// ---------------------------------------------------------------------------

import type { PhantomState, PhantomMeta, PhantomUpgrades, Guard, Cell, Torch } from "../types";
import { PhantomPhase, TileType, GuardState, GuardType, StealthRating, FloorModifier } from "../types";
import { PHANTOM_BALANCE as B } from "../config/PhantomBalance";

const META_KEY = "phantom_meta_v3";

const DEFAULT_UPGRADES: PhantomUpgrades = {
  extraLife: 0, quickDash: 0, keenEyes: 0, lightFeet: 0, extraSmoke: 0,
};

// ---------------------------------------------------------------------------
// Meta persistence
// ---------------------------------------------------------------------------

export function loadPhantomMeta(): PhantomMeta {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (raw) {
      const m = JSON.parse(raw) as PhantomMeta;
      if (!m.upgrades) m.upgrades = { ...DEFAULT_UPGRADES };
      if (m.shadowCoins === undefined) m.shadowCoins = 0;
      return m;
    }
  } catch { /* ignore */ }
  return {
    highScore: 0, bestFloor: 0, totalRelics: 0, totalFloors: 0,
    totalBackstabs: 0, totalGhostFloors: 0, gamesPlayed: 0,
    shadowCoins: 0, upgrades: { ...DEFAULT_UPGRADES },
  };
}

export function savePhantomMeta(m: PhantomMeta): void {
  try { localStorage.setItem(META_KEY, JSON.stringify(m)); } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Shadow coin calculation
// ---------------------------------------------------------------------------

export function calcShadowCoins(s: PhantomState): number {
  let coins = s.totalFloorsCleared * B.COINS_PER_FLOOR;
  coins += s.totalRelicsCollected * B.COINS_PER_RELIC;
  return coins;
}

// ---------------------------------------------------------------------------
// Seeded RNG
// ---------------------------------------------------------------------------

let _seed = Date.now();
function seedRng(s: number) { _seed = s; }
function rng(): number {
  _seed = (_seed * 1664525 + 1013904223) & 0x7fffffff;
  return _seed / 0x7fffffff;
}
function rngInt(min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

// ---------------------------------------------------------------------------
// Floor modifier selection
// ---------------------------------------------------------------------------

function rollFloorModifier(floor: number): FloorModifier {
  if (floor < B.MODIFIER_START_FLOOR) return FloorModifier.NONE;
  const mods = [
    FloorModifier.DARKNESS, FloorModifier.ALARM, FloorModifier.REINFORCED,
    FloorModifier.TREASURY, FloorModifier.CURSED, FloorModifier.SWIFT,
  ];
  // ~40% chance of a modifier, increasing with floor
  if (rng() > 0.3 + floor * 0.02) return FloorModifier.NONE;
  return mods[rngInt(0, mods.length - 1)];
}

// ---------------------------------------------------------------------------
// Floor generation
// ---------------------------------------------------------------------------

interface Room { x: number; y: number; w: number; h: number; }

function generateFloor(cols: number, rows: number, floor: number, modifier: FloorModifier): {
  tiles: TileType[][]; guards: Guard[];
  torches: Torch[]; playerStart: Cell; relicCount: number;
} {
  seedRng(Date.now() + floor * 9973);

  const tiles: TileType[][] = [];
  for (let r = 0; r < rows; r++) {
    tiles[r] = [];
    for (let c = 0; c < cols; c++) tiles[r][c] = TileType.WALL;
  }

  const numRooms = Math.min(14, B.ROOMS_BASE + Math.floor(floor * B.ROOMS_PER_FLOOR));
  const rooms: Room[] = [];

  for (let attempt = 0; attempt < numRooms * 25 && rooms.length < numRooms; attempt++) {
    const w = rngInt(B.ROOM_MIN, B.ROOM_MAX);
    const h = rngInt(B.ROOM_MIN, B.ROOM_MAX);
    const x = rngInt(1, cols - w - 2);
    const y = rngInt(1, rows - h - 2);

    let ok = true;
    for (const r of rooms) {
      if (x < r.x + r.w + 1 && x + w + 1 > r.x && y < r.y + r.h + 1 && y + h + 1 > r.y) {
        ok = false; break;
      }
    }
    if (!ok) continue;

    rooms.push({ x, y, w, h });
    for (let ry = y; ry < y + h; ry++) {
      for (let rx = x; rx < x + w; rx++) tiles[ry][rx] = TileType.FLOOR;
    }
  }

  // Connect rooms with corridors
  for (let i = 1; i < rooms.length; i++) {
    carveCorridor(tiles, rooms[i - 1], rooms[i], cols, rows);
  }
  // Loop back for more interesting layouts
  if (rooms.length >= 4) {
    carveCorridor(tiles, rooms[rooms.length - 1], rooms[0], cols, rows, true);
  }

  // Collect floor cells
  const floorCells: Cell[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (tiles[r][c] === TileType.FLOOR) floorCells.push({ x: c, y: r });
    }
  }
  for (let i = floorCells.length - 1; i > 0; i--) {
    const j = rngInt(0, i);
    [floorCells[i], floorCells[j]] = [floorCells[j], floorCells[i]];
  }

  // Shadows
  const shadowChance = modifier === FloorModifier.SWIFT
    ? B.SHADOW_CHANCE + B.SWIFT_EXTRA_SHADOWS
    : B.SHADOW_CHANCE;
  for (const cell of floorCells) {
    if (rng() < shadowChance) {
      const hasWall = adjWall(tiles, cell.x, cell.y, rows, cols);
      if (hasWall) tiles[cell.y][cell.x] = TileType.SHADOW;
    }
  }

  // Torches
  const torches: Torch[] = [];
  for (let r = 1; r < rows - 1; r++) {
    for (let c = 1; c < cols - 1; c++) {
      if (tiles[r][c] !== TileType.WALL) continue;
      const adj = adjFloor(tiles, c, r, rows, cols);
      if (adj && rng() < B.TORCH_CHANCE) {
        torches.push({ x: c, y: r, radius: B.TORCH_RADIUS, flicker: rng() * Math.PI * 2 });
      }
    }
  }

  // Traps
  const trapChance = modifier === FloorModifier.CURSED ? B.TRAP_CHANCE * B.CURSED_TRAP_MULT : B.TRAP_CHANCE;
  for (const cell of floorCells) {
    if (tiles[cell.y][cell.x] === TileType.FLOOR && rng() < trapChance) {
      tiles[cell.y][cell.x] = TileType.TRAP;
    }
  }

  // Stone pickups (none on cursed floors)
  if (modifier !== FloorModifier.CURSED) {
    for (const cell of floorCells) {
      if (tiles[cell.y][cell.x] === TileType.FLOOR && rng() < B.STONE_PICKUP_CHANCE) {
        tiles[cell.y][cell.x] = TileType.DISTRACTION;
      }
    }
  }

  // Keys & locked doors
  if (floor >= B.LOCKED_DOOR_START_FLOOR && rooms.length >= 4) {
    const numDoors = Math.min(2, Math.floor((floor - B.LOCKED_DOOR_START_FLOOR) / 2) + 1);
    for (let d = 0; d < numDoors; d++) {
      const corridorIdx = rngInt(1, rooms.length - 1);
      const a = rooms[corridorIdx - 1], b = rooms[corridorIdx];
      const midX = Math.floor((a.x + a.w / 2 + b.x + b.w / 2) / 2);
      const midY = Math.floor((a.y + a.h / 2 + b.y + b.h / 2) / 2);
      if (midY >= 0 && midY < rows && midX >= 0 && midX < cols && tiles[midY][midX] === TileType.FLOOR) {
        tiles[midY][midX] = TileType.LOCKED_DOOR;
        const keyRoomIdx = rngInt(0, Math.max(0, corridorIdx - 2));
        const keyRoom = rooms[keyRoomIdx];
        const kx = rngInt(keyRoom.x, keyRoom.x + keyRoom.w - 1);
        const ky = rngInt(keyRoom.y, keyRoom.y + keyRoom.h - 1);
        if (tiles[ky][kx] === TileType.FLOOR) tiles[ky][kx] = TileType.KEY;
      }
    }
  }

  // Relics
  let relicCount = B.RELICS_BASE + Math.floor(floor / 3) * B.RELICS_PER_3_FLOORS;
  if (modifier === FloorModifier.TREASURY) relicCount += B.TREASURY_EXTRA_RELICS;
  const relicRooms = [...rooms].sort(() => rng() - 0.5);
  let relicsPlaced = 0;
  for (let i = 0; i < relicRooms.length && relicsPlaced < relicCount; i++) {
    const rm = relicRooms[i];
    const rx = Math.floor(rm.x + rm.w / 2);
    const ry = Math.floor(rm.y + rm.h / 2);
    if (tiles[ry][rx] === TileType.FLOOR || tiles[ry][rx] === TileType.SHADOW) {
      tiles[ry][rx] = TileType.RELIC;
      relicsPlaced++;
    }
  }

  // Exit
  const exitRoom = rooms[rooms.length - 1];
  placeExit(tiles, exitRoom);

  // Player start
  const startRoom = rooms[0];
  const playerStart = { x: Math.floor(startRoom.x + startRoom.w / 2), y: Math.floor(startRoom.y + startRoom.h / 2) };
  tiles[playerStart.y][playerStart.x] = TileType.FLOOR;

  // Guards
  let guardCount = Math.min(B.MAX_GUARDS, Math.floor(B.GUARDS_BASE + floor * B.GUARDS_PER_FLOOR));
  if (modifier === FloorModifier.REINFORCED) guardCount = Math.min(B.MAX_GUARDS, Math.ceil(guardCount * B.REINFORCED_GUARD_MULT));
  if (modifier === FloorModifier.TREASURY) guardCount = Math.min(B.MAX_GUARDS, guardCount + B.TREASURY_EXTRA_GUARDS);
  const guards: Guard[] = [];
  const guardRooms = rooms.slice(1);

  for (let g = 0; g < guardCount && guardRooms.length > 0; g++) {
    const rm = guardRooms[g % guardRooms.length];
    const gx = rngInt(rm.x + 1, Math.min(cols - 2, rm.x + rm.w - 2));
    const gy = rngInt(rm.y + 1, Math.min(rows - 2, rm.y + rm.h - 2));

    let type = GuardType.PATROL;
    if (floor >= B.HOUND_START_FLOOR && rng() < 0.2) type = GuardType.HOUND;
    else if (floor >= B.SENTRY_START_FLOOR && rng() < 0.25) type = GuardType.SENTRY;

    const patrol: Cell[] = [{ x: gx, y: gy }];
    if (type !== GuardType.SENTRY) {
      const numWaypoints = rngInt(2, 4);
      for (let w = 0; w < numWaypoints; w++) {
        const wx = rngInt(Math.max(1, rm.x - 3), Math.min(cols - 2, rm.x + rm.w + 3));
        const wy = rngInt(Math.max(1, rm.y - 3), Math.min(rows - 2, rm.y + rm.h + 3));
        if (tiles[wy]?.[wx] !== undefined && tiles[wy][wx] !== TileType.WALL) {
          patrol.push({ x: wx, y: wy });
        }
      }
    }

    let visionRange: number, visionAngle: number, speed: number, proximityRange: number;
    switch (type) {
      case GuardType.SENTRY:
        visionRange = B.SENTRY_VISION_RANGE + Math.min(floor * 0.2, 2);
        visionAngle = B.SENTRY_VISION_ANGLE;
        speed = B.GUARD_MOVE_INTERVAL;
        proximityRange = 0;
        break;
      case GuardType.HOUND:
        visionRange = 0;
        visionAngle = 0;
        speed = B.HOUND_SPEED;
        proximityRange = B.HOUND_PROXIMITY_RANGE + Math.min(floor * 0.15, 2);
        break;
      default:
        visionRange = B.GUARD_VISION_RANGE + Math.min(floor * 0.3, 3);
        visionAngle = B.GUARD_VISION_ANGLE;
        speed = Math.max(0.2, B.GUARD_MOVE_INTERVAL - floor * 0.01);
        proximityRange = 0;
        break;
    }

    // Swift modifier: faster guards
    if (modifier === FloorModifier.SWIFT) speed *= B.SWIFT_GUARD_SPEED_MULT;

    // Some patrol guards fall asleep on later floors
    let startState = GuardState.PATROL;
    if (type === GuardType.PATROL && floor >= B.SLEEPING_GUARD_START_FLOOR && rng() < B.SLEEPING_GUARD_CHANCE) {
      startState = GuardState.SLEEPING;
    }

    guards.push({
      x: gx, y: gy, dir: rngInt(0, 3),
      state: startState, type,
      patrol, patrolIndex: 0,
      moveTimer: rng() * speed,
      alertTimer: 0, stunTimer: 0,
      visionRange, visionAngle, speed, proximityRange,
      lastKnownPlayerX: -1, lastKnownPlayerY: -1,
    });
  }

  return { tiles, guards, torches, playerStart, relicCount: relicsPlaced };
}

// Helpers
function carveCorridor(tiles: TileType[][], a: Room, b: Room, cols: number, rows: number, vertical = false): void {
  const ax = Math.floor(a.x + a.w / 2), ay = Math.floor(a.y + a.h / 2);
  const bx = Math.floor(b.x + b.w / 2), by = Math.floor(b.y + b.h / 2);
  let cx = ax, cy = ay;
  if (vertical) {
    while (cy !== by) { carveAt(tiles, cx, cy, cols, rows); cy += cy < by ? 1 : -1; }
    while (cx !== bx) { carveAt(tiles, cx, cy, cols, rows); cx += cx < bx ? 1 : -1; }
  } else {
    while (cx !== bx) { carveAt(tiles, cx, cy, cols, rows); cx += cx < bx ? 1 : -1; }
    while (cy !== by) { carveAt(tiles, cx, cy, cols, rows); cy += cy < by ? 1 : -1; }
  }
}
function carveAt(tiles: TileType[][], x: number, y: number, cols: number, rows: number): void {
  if (y >= 0 && y < rows && x >= 0 && x < cols && tiles[y][x] === TileType.WALL) tiles[y][x] = TileType.FLOOR;
}
function adjWall(tiles: TileType[][], x: number, y: number, rows: number, cols: number): boolean {
  return (y > 0 && tiles[y - 1][x] === TileType.WALL) || (y < rows - 1 && tiles[y + 1][x] === TileType.WALL) ||
    (x > 0 && tiles[y][x - 1] === TileType.WALL) || (x < cols - 1 && tiles[y][x + 1] === TileType.WALL);
}
function adjFloor(tiles: TileType[][], x: number, y: number, rows: number, cols: number): boolean {
  return (y > 0 && tiles[y - 1][x] === TileType.FLOOR) || (y < rows - 1 && tiles[y + 1][x] === TileType.FLOOR) ||
    (x > 0 && tiles[y][x - 1] === TileType.FLOOR) || (x < cols - 1 && tiles[y][x + 1] === TileType.FLOOR);
}
function placeExit(tiles: TileType[][], room: Room): void {
  const ex = Math.floor(room.x + room.w / 2), ey = Math.floor(room.y + room.h / 2);
  if (tiles[ey][ex] === TileType.FLOOR) { tiles[ey][ex] = TileType.EXIT; return; }
  for (let dy = 0; dy < room.h; dy++) {
    for (let dx = 0; dx < room.w; dx++) {
      if (tiles[room.y + dy][room.x + dx] === TileType.FLOOR) {
        tiles[room.y + dy][room.x + dx] = TileType.EXIT; return;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// State creation
// ---------------------------------------------------------------------------

export function createPhantomState(cols: number, rows: number, meta: PhantomMeta): PhantomState {
  const modifier = FloorModifier.NONE; // first floor has no modifier
  const { tiles, guards, torches, playerStart, relicCount } = generateFloor(cols, rows, 0, modifier);
  const revealed: boolean[][] = [];
  for (let r = 0; r < rows; r++) {
    revealed[r] = [];
    for (let c = 0; c < cols; c++) revealed[r][c] = false;
  }

  const up = meta.upgrades || DEFAULT_UPGRADES;

  return {
    phase: PhantomPhase.START,
    cols, rows, tiles, revealed,
    playerX: playerStart.x, playerY: playerStart.y, playerDir: 2,
    hidden: false, stones: B.START_STONES, maxStones: B.MAX_STONES,
    lives: B.START_LIVES + up.extraLife,
    maxLives: B.START_LIVES + up.extraLife,
    keys: 0, invincibleTimer: 0,
    peeking: false, peekDir: 2,
    shadowDashCooldown: 0,
    smokeBombCooldown: 0,
    smokeBombs: B.START_SMOKE_BOMBS + up.extraSmoke,
    maxSmokeBombs: B.MAX_SMOKE_BOMBS,
    dashTrail: [], dashTrailTimer: 0,
    floor: 1, floorModifier: modifier,
    relicsCollected: 0, relicsRequired: relicCount, exitOpen: false,
    totalRelicsCollected: 0, totalFloorsCleared: 0, totalBackstabs: 0,
    floorDetected: false, floorCaught: false, floorStealthRating: StealthRating.GHOST,
    guards, thrownStones: [],
    torches, smokeTiles: [],
    throwing: false, throwTargetX: 0, throwTargetY: 0,
    prevPlayerX: playerStart.x, prevPlayerY: playerStart.y, moveFraction: 1,
    time: 0, floorTime: 0, moveTimer: 0, stepsSinceLastSound: 0,
    guardNoiseFlash: new Map(),
    relicComboTimer: 0, relicComboCount: 0, bestCombo: 0,
    floorTransitionTimer: 0,
    throwDistance: B.DEFAULT_THROW_DISTANCE,
    score: 0, highScore: meta.highScore,
    particles: [], floatingTexts: [],
    screenShake: 0, screenFlashColor: 0, screenFlashTimer: 0,
    alertPulse: 0, ambientParticles: [],
    detectionMeter: 0, detectionDecay: B.DETECTION_DECAY,
    visibilityRange: B.BASE_VISIBILITY_RANGE + up.keenEyes,
    footstepNoiseChance: Math.max(0.05, B.FOOTSTEP_NOISE_CHANCE - up.lightFeet * 0.10),
  };
}

export function advanceFloor(state: PhantomState, meta: PhantomMeta): void {
  const modifier = rollFloorModifier(state.floor);
  const { tiles, guards, torches, playerStart, relicCount } = generateFloor(state.cols, state.rows, state.floor, modifier);
  state.tiles = tiles;
  state.guards = guards;
  state.torches = torches;
  state.smokeTiles = [];
  state.playerX = playerStart.x;
  state.playerY = playerStart.y;
  state.playerDir = 2;
  state.hidden = false;
  state.peeking = false;
  state.relicsCollected = 0;
  state.relicsRequired = relicCount;
  state.exitOpen = false;
  state.thrownStones = [];
  state.throwing = false;
  state.detectionMeter = 0;
  state.moveTimer = 0;
  state.floorTime = 0;
  state.floorDetected = false;
  state.floorCaught = false;
  state.floorStealthRating = StealthRating.GHOST;
  state.floorModifier = modifier;
  state.dashTrail = [];
  state.dashTrailTimer = 0;
  state.guardNoiseFlash = new Map();
  state.moveFraction = 1;
  state.prevPlayerX = playerStart.x;
  state.prevPlayerY = playerStart.y;
  state.relicComboTimer = 0;
  state.relicComboCount = 0;
  state.floor++;
  state.phase = PhantomPhase.PLAYING;

  // Apply darkness modifier
  if (modifier === FloorModifier.DARKNESS) {
    state.visibilityRange = B.DARKNESS_VISIBILITY + (meta.upgrades?.keenEyes || 0);
  } else {
    state.visibilityRange = B.BASE_VISIBILITY_RANGE + (meta.upgrades?.keenEyes || 0);
  }

  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) state.revealed[r][c] = false;
  }

  if (state.floor % 3 === 0 && state.stones < state.maxStones) state.stones++;
  if (state.floor % 4 === 0 && state.smokeBombs < state.maxSmokeBombs) state.smokeBombs++;
}
