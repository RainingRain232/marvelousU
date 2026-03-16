// ---------------------------------------------------------------------------
// Rift Wizard level generator
// ---------------------------------------------------------------------------

import { BuildingType } from "@/types";
import {
  RWBalance,
  getMapDimensions,
  getRoomCount,
  getEnemyCountForLevel,
  isBossLevel,
} from "../config/RiftWizardConfig";
import {
  ENEMY_DEFS,
  getEnemyPoolForLevel,
  getBossForLevel,
  scaleEnemyStats,
  SPAWNER_ENEMY_IDS,
} from "../config/RiftWizardEnemyDefs";
import {
  type LevelState,
  type RWEnemyInstance,
  type SpawnerInstance,
  type ShrineInstance,
  type SpellCircleInstance,
  type ItemOnGround,
  type RoomInfo,
  type GridPos,
  RWTileType,
  SpellSchool,
} from "../state/RiftWizardState";

// ---------------------------------------------------------------------------
// Seeded RNG (simple xorshift32)
// ---------------------------------------------------------------------------

let _seed = 1;

export function setSeed(seed: number): void {
  _seed = seed | 0 || 1;
}

function rand(): number {
  _seed ^= _seed << 13;
  _seed ^= _seed >> 17;
  _seed ^= _seed << 5;
  return ((_seed >>> 0) % 10000) / 10000;
}

function randInt(min: number, max: number): number {
  return min + Math.floor(rand() * (max - min + 1));
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ---------------------------------------------------------------------------
// ID counter (module-level, reset per generation)
// ---------------------------------------------------------------------------

let _nextId = 1;

function nextId(): number {
  return _nextId++;
}

// ---------------------------------------------------------------------------
// Room placement
// ---------------------------------------------------------------------------

function tryPlaceRoom(
  tiles: RWTileType[][],
  width: number,
  height: number,
  minSize: number,
  maxSize: number,
  existingRooms: RoomInfo[],
): RoomInfo | null {
  const rw = randInt(minSize, maxSize);
  const rh = randInt(minSize, maxSize);
  const rx = randInt(1, width - rw - 1);
  const ry = randInt(1, height - rh - 1);

  // Check overlap with padding
  for (const room of existingRooms) {
    const pad = RWBalance.ROOM_PADDING;
    if (
      rx < room.x + room.w + pad &&
      rx + rw + pad > room.x &&
      ry < room.y + room.h + pad &&
      ry + rh + pad > room.y
    ) {
      return null;
    }
  }

  // Carve room
  for (let y = ry; y < ry + rh; y++) {
    for (let x = rx; x < rx + rw; x++) {
      tiles[y][x] = RWTileType.FLOOR;
    }
  }

  return { x: rx, y: ry, w: rw, h: rh };
}

function roomCenter(room: RoomInfo): GridPos {
  return {
    col: Math.floor(room.x + room.w / 2),
    row: Math.floor(room.y + room.h / 2),
  };
}

// ---------------------------------------------------------------------------
// Corridor carving
// ---------------------------------------------------------------------------

function carveCorridor(
  tiles: RWTileType[][],
  from: GridPos,
  to: GridPos,
): void {
  let { col: x, row: y } = from;
  const { col: tx, row: ty } = to;

  // Horizontal first, then vertical (L-shaped)
  while (x !== tx) {
    if (y >= 0 && y < tiles.length && x >= 0 && x < tiles[0].length) {
      if (tiles[y][x] === RWTileType.WALL) {
        tiles[y][x] = RWTileType.CORRIDOR;
      }
    }
    x += x < tx ? 1 : -1;
  }
  while (y !== ty) {
    if (y >= 0 && y < tiles.length && x >= 0 && x < tiles[0].length) {
      if (tiles[y][x] === RWTileType.WALL) {
        tiles[y][x] = RWTileType.CORRIDOR;
      }
    }
    y += y < ty ? 1 : -1;
  }
}

// ---------------------------------------------------------------------------
// Environmental hazard placement
// ---------------------------------------------------------------------------

function placeHazards(
  tiles: RWTileType[][],
  width: number,
  height: number,
  levelNum: number,
  _rooms: RoomInfo[],
  entranceRoom: RoomInfo,
): void {
  const floorTiles: GridPos[] = [];
  const ec = roomCenter(entranceRoom);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (tiles[y][x] !== RWTileType.FLOOR) continue;
      // Avoid entrance area
      if (Math.abs(x - ec.col) + Math.abs(y - ec.row) < 3) continue;
      floorTiles.push({ col: x, row: y });
    }
  }

  shuffle(floorTiles);

  const hazardCount = Math.floor(floorTiles.length * RWBalance.HAZARD_DENSITY);
  let placed = 0;

  for (const pos of floorTiles) {
    if (placed >= hazardCount) break;

    if (levelNum >= RWBalance.LAVA_MIN_LEVEL && rand() < 0.4) {
      tiles[pos.row][pos.col] = RWTileType.LAVA;
      placed++;
    } else if (levelNum >= RWBalance.ICE_MIN_LEVEL && rand() < 0.4) {
      tiles[pos.row][pos.col] = RWTileType.ICE;
      placed++;
    } else if (levelNum >= RWBalance.CHASM_MIN_LEVEL && rand() < 0.3) {
      tiles[pos.row][pos.col] = RWTileType.CHASM;
      placed++;
    }
  }
}

// ---------------------------------------------------------------------------
// Entity placement helpers
// ---------------------------------------------------------------------------

function getRandomFloorTile(
  tiles: RWTileType[][],
  width: number,
  height: number,
  avoid: GridPos[],
  minDistFromAvoid: number = 2,
): GridPos | null {
  const candidates: GridPos[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const t = tiles[y][x];
      if (t !== RWTileType.FLOOR && t !== RWTileType.CORRIDOR) continue;
      let tooClose = false;
      for (const a of avoid) {
        if (Math.abs(x - a.col) + Math.abs(y - a.row) < minDistFromAvoid) {
          tooClose = true;
          break;
        }
      }
      if (!tooClose) candidates.push({ col: x, row: y });
    }
  }
  if (candidates.length === 0) return null;
  return pick(candidates);
}

function getRandomPosInRoom(
  room: RoomInfo,
  tiles: RWTileType[][],
  avoid: GridPos[],
): GridPos | null {
  const candidates: GridPos[] = [];
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      const t = tiles[y][x];
      if (t !== RWTileType.FLOOR) continue;
      let taken = false;
      for (const a of avoid) {
        if (a.col === x && a.row === y) {
          taken = true;
          break;
        }
      }
      if (!taken) candidates.push({ col: x, row: y });
    }
  }
  if (candidates.length === 0) return null;
  return pick(candidates);
}

// ---------------------------------------------------------------------------
// Enemy creation
// ---------------------------------------------------------------------------

function createEnemy(
  defId: string,
  col: number,
  row: number,
  levelNum: number,
): RWEnemyInstance {
  const def = ENEMY_DEFS[defId];
  if (!def) throw new Error(`Unknown enemy def: ${defId}`);
  const scaled = scaleEnemyStats(def, levelNum);
  return {
    id: nextId(),
    defId,
    unitType: def.unitType,
    col,
    row,
    hp: scaled.hp,
    maxHp: scaled.hp,
    damage: scaled.damage,
    range: def.range,
    moveSpeed: def.moveSpeed,
    aiType: def.aiType,
    school: def.school,
    abilities: [...def.abilities],
    abilityCooldowns: def.abilities.map(() => 0),
    alive: true,
    statusEffects: [],
    stunTurns: 0,
    isBoss: def.isBoss,
    bossPhase: 0,
  };
}

// ---------------------------------------------------------------------------
// Main generation function
// ---------------------------------------------------------------------------

export function generateLevel(
  levelNum: number,
  startingEntityId: number,
): LevelState {
  _nextId = startingEntityId;
  setSeed(Date.now() + levelNum * 7919);

  const { width, height } = getMapDimensions(levelNum);
  const roomCount = getRoomCount(levelNum);

  // 1. Fill with walls
  const tiles: RWTileType[][] = [];
  for (let y = 0; y < height; y++) {
    tiles.push(new Array(width).fill(RWTileType.WALL));
  }

  // 2. Place rooms
  const rooms: RoomInfo[] = [];
  for (let attempt = 0; attempt < RWBalance.MAX_ROOM_ATTEMPTS && rooms.length < roomCount; attempt++) {
    const room = tryPlaceRoom(
      tiles,
      width,
      height,
      RWBalance.ROOM_SIZE_MIN,
      RWBalance.ROOM_SIZE_MAX,
      rooms,
    );
    if (room) rooms.push(room);
  }

  // Guarantee at least 2 rooms
  if (rooms.length < 2) {
    // Force two rooms
    const r1: RoomInfo = { x: 2, y: 2, w: 5, h: 5 };
    const r2: RoomInfo = { x: width - 8, y: height - 8, w: 5, h: 5 };
    for (const r of [r1, r2]) {
      for (let y = r.y; y < r.y + r.h; y++) {
        for (let x = r.x; x < r.x + r.w; x++) {
          if (y < height && x < width) tiles[y][x] = RWTileType.FLOOR;
        }
      }
    }
    rooms.length = 0;
    rooms.push(r1, r2);
  }

  // 3. Connect rooms with corridors
  for (let i = 0; i < rooms.length - 1; i++) {
    carveCorridor(tiles, roomCenter(rooms[i]), roomCenter(rooms[i + 1]));
  }
  // Extra connection for loops
  if (rooms.length >= 4) {
    const a = randInt(0, rooms.length - 1);
    let b = randInt(0, rooms.length - 1);
    while (b === a) b = randInt(0, rooms.length - 1);
    carveCorridor(tiles, roomCenter(rooms[a]), roomCenter(rooms[b]));
  }

  // 4. Place environmental hazards
  placeHazards(tiles, width, height, levelNum, rooms, rooms[0]);

  // 5. Entrance position (center of first room)
  const entrancePos = roomCenter(rooms[0]);

  // 6. Place enemies
  const occupied: GridPos[] = [entrancePos];
  const enemies: RWEnemyInstance[] = [];
  const enemyPool = getEnemyPoolForLevel(levelNum);
  const enemyCount = getEnemyCountForLevel(levelNum);

  // Place regular enemies in rooms 1+ (not the entrance room)
  const enemyRooms = rooms.slice(1);
  for (let i = 0; i < enemyCount; i++) {
    const room = enemyRooms.length > 0 ? pick(enemyRooms) : rooms[rooms.length - 1];
    const pos = getRandomPosInRoom(room, tiles, occupied);
    if (!pos) continue;
    occupied.push(pos);
    const defId = pick(enemyPool);
    enemies.push(createEnemy(defId, pos.col, pos.row, levelNum));
  }

  // Place boss
  if (isBossLevel(levelNum)) {
    const bossRoom = rooms[rooms.length - 1];
    const bossPos = roomCenter(bossRoom);
    // Clear any existing enemy at boss position
    const bossDefId = getBossForLevel(levelNum);
    enemies.push(createEnemy(bossDefId, bossPos.col, bossPos.row, levelNum));
    occupied.push(bossPos);
  }

  // 7. Place spawners (level 7+)
  const spawners: SpawnerInstance[] = [];
  if (levelNum >= RWBalance.SPAWNER_MIN_LEVEL) {
    const spawnerCount = Math.min(Math.floor((levelNum - 6) / 4) + 1, 3);
    const tier = Math.min(Math.floor(levelNum / 5), 4);
    const spawnerEnemies = SPAWNER_ENEMY_IDS[tier] ?? SPAWNER_ENEMY_IDS[0]!;

    for (let i = 0; i < spawnerCount; i++) {
      const room = enemyRooms.length > 0 ? pick(enemyRooms) : rooms[rooms.length - 1];
      const pos = getRandomPosInRoom(room, tiles, occupied);
      if (!pos) continue;
      occupied.push(pos);
      spawners.push({
        id: nextId(),
        col: pos.col,
        row: pos.row,
        hp: RWBalance.SPAWNER_HP + levelNum * 5,
        maxHp: RWBalance.SPAWNER_HP + levelNum * 5,
        spawnDefId: pick(spawnerEnemies),
        spawnInterval: RWBalance.SPAWNER_INTERVAL,
        turnsSinceSpawn: 0,
        alive: true,
        buildingType: pick([BuildingType.CREATURE_DEN, BuildingType.MAGE_TOWER]),
      });
    }
  }

  // 8. Place shrines (1-2 per level)
  const allSchools = Object.values(SpellSchool);
  const shrineEffects = ["damage", "range", "charges", "aoe", "bounces"] as const;
  const shrines: ShrineInstance[] = [];
  const shrineCount = randInt(1, 2);
  for (let i = 0; i < shrineCount; i++) {
    const pos = getRandomFloorTile(tiles, width, height, occupied, 3);
    if (!pos) continue;
    occupied.push(pos);
    tiles[pos.row][pos.col] = RWTileType.SHRINE;
    shrines.push({
      id: nextId(),
      col: pos.col,
      row: pos.row,
      school: pick(allSchools),
      effect: pick(shrineEffects),
      magnitude: randInt(1, 3),
      used: false,
    });
  }

  // 9. Place spell circles (0-1 per level)
  const spellCircles: SpellCircleInstance[] = [];
  if (rand() < 0.5) {
    const pos = getRandomFloorTile(tiles, width, height, occupied, 3);
    if (pos) {
      occupied.push(pos);
      tiles[pos.row][pos.col] = RWTileType.SPELL_CIRCLE;
      spellCircles.push({
        id: nextId(),
        col: pos.col,
        row: pos.row,
        school: pick(allSchools),
      });
    }
  }

  // 10. Place items
  const items: ItemOnGround[] = [];
  for (const room of rooms) {
    if (rand() < RWBalance.ITEM_SPAWN_CHANCE) {
      const pos = getRandomPosInRoom(room, tiles, occupied);
      if (!pos) continue;
      occupied.push(pos);
      const itemType = rand() < 0.6
        ? "health_potion" as const
        : rand() < 0.7
          ? "charge_scroll" as const
          : "shield_scroll" as const;
      items.push({
        id: nextId(),
        col: pos.col,
        row: pos.row,
        type: itemType,
        picked: false,
      });
    }
  }

  return {
    width,
    height,
    tiles,
    enemies,
    spawners,
    shrines,
    spellCircles,
    riftPortals: [], // spawned after level clear
    items,
    summons: [],
    rooms,
    cleared: false,
    entrancePos,
  };
}

// ---------------------------------------------------------------------------
// Rift portal spawning (called after level clear)
// ---------------------------------------------------------------------------

const RIFT_THEMES: {
  school: SpellSchool;
  buildingType: BuildingType;
  label: string;
}[] = [
  { school: SpellSchool.FIRE, buildingType: BuildingType.FIRE_TOWER, label: "Fire Rift" },
  { school: SpellSchool.ICE, buildingType: BuildingType.ICE_TOWER, label: "Ice Cavern" },
  { school: SpellSchool.LIGHTNING, buildingType: BuildingType.LIGHTNING_TOWER, label: "Lightning Spire" },
  { school: SpellSchool.ARCANE, buildingType: BuildingType.WARP_TOWER, label: "Arcane Void" },
  { school: SpellSchool.HOLY, buildingType: BuildingType.TEMPLE, label: "Holy Sanctum" },
  { school: SpellSchool.NATURE, buildingType: BuildingType.CREATURE_DEN, label: "Wild Grove" },
  { school: SpellSchool.DARK, buildingType: BuildingType.ARCHIVE, label: "Dark Crypt" },
];

export function spawnRiftPortals(level: LevelState): void {
  const count = Math.min(RWBalance.RIFT_PORTAL_COUNT, RIFT_THEMES.length);
  const themes = shuffle([...RIFT_THEMES]).slice(0, count);
  const occupied: GridPos[] = [level.entrancePos];

  for (const theme of themes) {
    const pos = getRandomFloorTile(
      level.tiles,
      level.width,
      level.height,
      occupied,
      3,
    );
    if (!pos) continue;
    occupied.push(pos);
    level.tiles[pos.row][pos.col] = RWTileType.RIFT_PORTAL;
    level.riftPortals.push({
      id: nextId(),
      col: pos.col,
      row: pos.row,
      buildingType: theme.buildingType,
      theme: theme.school,
      label: theme.label,
    });
  }
}

/** Get the next entity ID after generation (for the state counter). */
export function getNextEntityId(): number {
  return _nextId;
}
