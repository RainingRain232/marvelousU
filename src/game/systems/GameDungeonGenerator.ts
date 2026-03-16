// ---------------------------------------------------------------------------
// Quest for the Grail — Procedural Dungeon Generator
// BSP-based room placement with corridor carving, traps, and treasure.
// ---------------------------------------------------------------------------

import {
  TileType, RoomType, ENEMY_DEFS, ENEMY_POOLS, ITEM_DEFS, LOOT_TABLES,
  GameBalance,
} from "../config/GameConfig";
import type { FloorParams, EnemyDef, ItemDef, QuestGenreDef } from "../config/GameConfig";
import type {
  FloorState, EnemyInstance, TreasureChest, GridPos, Direction, RoomInfo,
  TrapInstance, PuzzleRoomState, ArenaHazardInstance, CompanionNPC,
} from "../state/GameState";
import { PUZZLE_DEFS, MINI_BOSS_DEFS, COMPANION_DEFS } from "../config/GameArtifactDefs";
import type { TrapVariant } from "../config/GameArtifactDefs";

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
  const rawRooms: { x: number; y: number; w: number; h: number }[] = [];

  // Place rooms via random attempts
  const attempts = (params.roomCountMax + params.roomCountMin) * 8;
  const targetRooms = randInt(params.roomCountMin, params.roomCountMax);

  for (let i = 0; i < attempts && rawRooms.length < targetRooms; i++) {
    const rw = randInt(params.roomSizeMin, params.roomSizeMax);
    const rh = randInt(params.roomSizeMin, params.roomSizeMax);
    const rx = randInt(1, width - rw - 1);
    const ry = randInt(1, height - rh - 1);

    if (!overlapsAny(rx, ry, rw, rh, rawRooms, 2)) {
      carveRoom(tiles, rx, ry, rw, rh);
      rawRooms.push({ x: rx, y: ry, w: rw, h: rh });
    }
  }

  // Assign room types
  const rooms: RoomInfo[] = rawRooms.map((r, idx) => {
    let type = RoomType.NORMAL;
    if (idx === 0 || idx === rawRooms.length - 1) {
      type = RoomType.NORMAL; // entrance/stairs rooms stay normal
    } else if (idx === 1 && rawRooms.length > 3) {
      // Second room: shrine
      type = RoomType.SHRINE;
    } else if (idx === rawRooms.length - 2 && rawRooms.length > 4) {
      // Second-to-last: champion arena
      type = RoomType.CHAMPION_ARENA;
    } else if (idx === 2 && rawRooms.length > 5) {
      // Third room: treasure vault
      type = RoomType.TREASURE_VAULT;
    } else if (idx === 3 && rawRooms.length > 6 && Math.random() < 0.4) {
      // Fourth room: puzzle room (40% chance)
      type = RoomType.PUZZLE;
    } else if (idx === rawRooms.length - 3 && rawRooms.length > 7 && Math.random() < 0.25) {
      // Companion encounter room (25% chance)
      type = RoomType.COMPANION;
    }
    return { ...r, type };
  });

  // Boss arena: upgrade stairs room to BOSS_ARENA if floor has boss
  if (params.hasBoss) {
    const stairsRoomIdxForArena = rawRooms.length - 1;
    if (stairsRoomIdxForArena > 0) {
      rooms[stairsRoomIdxForArena].type = RoomType.BOSS_ARENA;
    }
  }

  // Secret room (30% chance per floor)
  if (Math.random() < 0.3 && rooms.length > 2) {
    const secretW = randInt(4, 6);
    const secretH = randInt(4, 6);
    for (let att = 0; att < 20; att++) {
      const sx = randInt(1, width - secretW - 1);
      const sy = randInt(1, height - secretH - 1);
      if (!overlapsAny(sx, sy, secretW, secretH, rawRooms, 2)) {
        carveRoom(tiles, sx, sy, secretW, secretH);
        rooms.push({ x: sx, y: sy, w: secretW, h: secretH, type: RoomType.SECRET });
        // Connect secret room to nearest room with a hidden corridor
        let nearest = rooms[1];
        let bestDist = Infinity;
        for (let ri = 0; ri < rooms.length - 1; ri++) {
          const rc = roomCenter(rooms[ri]);
          const sc = { col: sx + Math.floor(secretW / 2), row: sy + Math.floor(secretH / 2) };
          const d = Math.abs(rc.col - sc.col) + Math.abs(rc.row - sc.row);
          if (d < bestDist) { bestDist = d; nearest = rooms[ri]; }
        }
        const sc = { col: sx + Math.floor(secretW / 2), row: sy + Math.floor(secretH / 2) };
        carveCorridor(tiles, sc.col, sc.row, roomCenter(nearest).col, roomCenter(nearest).row);
        break;
      }
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

  // Place entrance (first room) and stairs (last non-secret room)
  const entranceRoom = rooms[0];
  // Find last normal/champion room for stairs
  let stairsRoomIdx = rooms.length - 1;
  for (let i = rooms.length - 1; i >= 0; i--) {
    if (rooms[i].type !== RoomType.SECRET) { stairsRoomIdx = i; break; }
  }
  const stairsRoom = rooms[stairsRoomIdx];
  const entrancePos: GridPos = roomCenter(entranceRoom);
  const stairsPos: GridPos = roomCenter(stairsRoom);
  tiles[entrancePos.row][entrancePos.col] = TileType.ENTRANCE;
  tiles[stairsPos.row][stairsPos.col] = TileType.STAIRS_DOWN;

  // Place shop tile on even floors (2, 4, 6, 8 = floorNum 1, 3, 5, 7)
  const isShopFloor = (floorNum + 1) % 2 === 0; // floors 2,4,6,8 (0-indexed: 1,3,5,7)
  if (isShopFloor && entranceRoom.w >= 3 && entranceRoom.h >= 3) {
    const shopC = entranceRoom.x + 1;
    const shopR = entranceRoom.y + 1;
    if (tiles[shopR][shopC] === TileType.FLOOR) {
      tiles[shopR][shopC] = TileType.SHOP;
    }
  }

  // Place shrine tiles in shrine rooms
  for (const room of rooms) {
    if (room.type === RoomType.SHRINE) {
      const center = roomCenter(room);
      if (tiles[center.row][center.col] === TileType.FLOOR) {
        tiles[center.row][center.col] = TileType.SHRINE;
      }
    }
  }

  // Place traps in corridors
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (tiles[r][c] === TileType.CORRIDOR && Math.random() < params.trapChance) {
        if (Math.abs(r - entrancePos.row) + Math.abs(c - entrancePos.col) > 3 &&
            Math.abs(r - stairsPos.row) + Math.abs(c - stairsPos.col) > 3) {
          tiles[r][c] = TileType.TRAP;
        }
      }
    }
  }

  // ---- Per-floor environmental hazard tiles ----
  placeEnvironmentalTiles(tiles, rooms, floorNum, width, height, entrancePos, stairsPos);

  // Place treasures in rooms
  const treasures: TreasureChest[] = [];
  const difficulty = getDifficulty(floorNum, params);
  for (let ri = 1; ri < rooms.length; ri++) {
    const room = rooms[ri];
    if (ri === stairsRoomIdx) continue; // skip stairs room

    const isVault = room.type === RoomType.TREASURE_VAULT;
    const isSecret = room.type === RoomType.SECRET;
    const chance = isVault || isSecret ? 1.0 : params.treasureChance;

    if (Math.random() < chance) {
      const tc = room.x + randInt(1, Math.max(1, room.w - 2));
      const tr = room.y + randInt(1, Math.max(1, room.h - 2));
      if (tiles[tr][tc] === TileType.FLOOR) {
        tiles[tr][tc] = TileType.TREASURE;
        // Secret and champion rooms get guaranteed rare+ loot
        const loot = (isSecret || room.type === RoomType.CHAMPION_ARENA)
          ? rollLoot("hard") : rollLoot(difficulty);
        treasures.push({ col: tc, row: tr, opened: false, item: loot });
      }
    }
  }

  // Spawn enemies
  const enemies: EnemyInstance[] = [];
  let eid = enemyIdStart;
  const enemyCount = randInt(params.enemyCountMin, params.enemyCountMax);
  const pool = getEnemyPool(difficulty, genre);

  for (let i = 0; i < enemyCount; i++) {
    // Pick a room (skip entrance and shrine rooms)
    const candidates = rooms.filter((r, idx) => idx > 0 && r.type !== RoomType.SHRINE);
    if (candidates.length === 0) continue;
    const room = candidates[randInt(0, candidates.length - 1)];
    const ec = room.x + randInt(1, Math.max(1, room.w - 2));
    const er = room.y + randInt(1, Math.max(1, room.h - 2));
    if (tiles[er][ec] === TileType.FLOOR) {
      const defId = pool[randInt(0, pool.length - 1)];
      const def = ENEMY_DEFS[defId];
      if (def) {
        enemies.push(createEnemy(eid++, def, ec, er));
      }
    }
  }

  // Champion arena: spawn single powerful elite
  for (const room of rooms) {
    if (room.type === RoomType.CHAMPION_ARENA) {
      const hardPool = ENEMY_POOLS["hard"] || [];
      if (hardPool.length > 0) {
        const eliteDefId = hardPool[randInt(0, hardPool.length - 1)];
        const eliteDef = ENEMY_DEFS[eliteDefId];
        if (eliteDef) {
          const center = roomCenter(room);
          // Buffed elite (1.5x stats)
          const buffedDef: EnemyDef = {
            ...eliteDef,
            name: `Champion ${eliteDef.name}`,
            hp: Math.floor(eliteDef.hp * 1.5),
            attack: Math.floor(eliteDef.attack * 1.3),
            defense: Math.floor(eliteDef.defense * 1.3),
            xpReward: Math.floor(eliteDef.xpReward * 2),
            goldReward: Math.floor(eliteDef.goldReward * 2),
          };
          enemies.push(createEnemy(eid++, buffedDef, center.col, center.row));
        }
      }
    }
  }

  // Treasure vault: extra enemies
  for (const room of rooms) {
    if (room.type === RoomType.TREASURE_VAULT) {
      for (let i = 0; i < 3; i++) {
        const ec = room.x + randInt(1, Math.max(1, room.w - 2));
        const er = room.y + randInt(1, Math.max(1, room.h - 2));
        if (tiles[er][ec] === TileType.FLOOR) {
          const defId = pool[randInt(0, pool.length - 1)];
          const def = ENEMY_DEFS[defId];
          if (def) enemies.push(createEnemy(eid++, def, ec, er));
        }
      }
    }
  }

  // Spawn boss if applicable
  if (params.hasBoss && genre.bossPool.length > 0) {
    const bossId = genre.bossPool[randInt(0, genre.bossPool.length - 1)];
    const bossDef = ENEMY_DEFS[bossId];
    if (bossDef) {
      const bc = stairsRoom.x + Math.floor(stairsRoom.w / 2);
      const br = stairsRoom.y + Math.floor(stairsRoom.h / 2);
      if (br !== stairsPos.row || bc !== stairsPos.col) {
        enemies.push(createEnemy(eid++, bossDef, bc, br));
      } else {
        enemies.push(createEnemy(eid++, bossDef, bc + 1, br));
      }
    }
  }

  // --- Mini-boss encounters on non-boss floors ---
  if (!params.hasBoss && floorNum > 1 && Math.random() < 0.35) {
    const miniBossKeys = Object.keys(MINI_BOSS_DEFS);
    const miniBossKey = miniBossKeys[randInt(0, miniBossKeys.length - 1)];
    const mbDef = MINI_BOSS_DEFS[miniBossKey];
    const baseDef = ENEMY_DEFS[mbDef.baseId];
    if (baseDef) {
      // Find a suitable room (not entrance, shrine, or stairs)
      const mbRooms = rooms.filter((r, idx) => idx > 0 && r.type === RoomType.NORMAL);
      if (mbRooms.length > 0) {
        const room = mbRooms[randInt(0, mbRooms.length - 1)];
        const center = roomCenter(room);
        const buffedDef: EnemyDef = {
          ...baseDef,
          id: `mini_${mbDef.baseId}`,
          name: mbDef.name,
          hp: Math.floor(baseDef.hp * mbDef.hpMult),
          attack: Math.floor(baseDef.attack * mbDef.atkMult),
          defense: Math.floor(baseDef.defense * mbDef.defMult),
          xpReward: Math.floor(baseDef.xpReward * mbDef.xpMult),
          goldReward: Math.floor(baseDef.goldReward * mbDef.goldMult),
          abilities: mbDef.abilities,
          bossPhases: 2,
        };
        enemies.push(createEnemy(eid++, buffedDef, center.col, center.row));
      }
    }
  }

  // --- Destructible walls near secret rooms ---
  for (const room of rooms) {
    if (room.type === RoomType.SECRET) {
      // Mark some walls adjacent to secret room as destructible
      const cx = room.x + Math.floor(room.w / 2);
      const cy = room.y + Math.floor(room.h / 2);
      // Check cardinal directions for walls that could be made destructible
      const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (const [dc, dr] of directions) {
        for (let d = 1; d <= 3; d++) {
          const wc = cx + dc * d;
          const wr = cy + dr * d;
          if (wc >= 0 && wc < width && wr >= 0 && wr < height && tiles[wr][wc] === TileType.WALL) {
            // Check if breaking this wall would connect to a non-secret room
            const nc = wc + dc;
            const nr = wr + dr;
            if (nc >= 0 && nc < width && nr >= 0 && nr < height &&
                tiles[nr][nc] !== TileType.WALL && tiles[nr][nc] !== undefined) {
              tiles[wr][wc] = TileType.DESTRUCTIBLE_WALL;
              break;
            }
          } else {
            break;
          }
        }
      }
    }
  }

  // Build explored grid (start unexplored)
  const explored: boolean[][] = [];
  for (let r = 0; r < height; r++) {
    explored.push(new Array(width).fill(false));
  }

  // --- Enhanced traps: assign variant types to trap tiles ---
  const traps: TrapInstance[] = [];
  const trapVariants: TrapVariant[] = ["spike", "poison_gas", "falling_rocks", "teleport", "alarm"];
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (tiles[r][c] === TileType.TRAP) {
        const variant = trapVariants[randInt(0, trapVariants.length - 1)];
        traps.push({ col: c, row: r, variant, detected: false, disarmed: false });
      }
    }
  }

  // --- Puzzle rooms ---
  const puzzleRooms: PuzzleRoomState[] = [];
  for (let ri = 0; ri < rooms.length; ri++) {
    if (rooms[ri].type === RoomType.PUZZLE) {
      const puzzleDef = PUZZLE_DEFS[randInt(0, PUZZLE_DEFS.length - 1)];
      const seqLen = puzzleDef.type === "sequence" || puzzleDef.type === "pressure_plates"
        ? 3 + puzzleDef.difficulty : 0;
      const sequence = seqLen > 0 ? Array.from({ length: seqLen }, () => randInt(1, 4)) : undefined;
      puzzleRooms.push({
        roomIndex: ri,
        puzzleType: puzzleDef.type,
        difficulty: puzzleDef.difficulty,
        solved: false,
        sequence,
        playerSequence: sequence ? [] : undefined,
        timeRemaining: puzzleDef.timeLimit,
        rewardTier: puzzleDef.rewardTier,
      });

      // Place puzzle plates in the room
      const room = rooms[ri];
      if (puzzleDef.type === "pressure_plates" || puzzleDef.type === "sequence") {
        for (let pi = 0; pi < Math.min(seqLen, 4); pi++) {
          const pc = room.x + 1 + (pi % (room.w - 2));
          const pr = room.y + Math.floor(room.h / 2);
          if (pc < room.x + room.w && tiles[pr][pc] === TileType.FLOOR) {
            tiles[pr][pc] = TileType.PUZZLE_PLATE;
          }
        }
      }
    }
  }

  // --- Boss arena hazards ---
  const arenaHazards: ArenaHazardInstance[] = [];

  // --- Companion NPCs ---
  const companionNPCs: CompanionNPC[] = [];
  for (const room of rooms) {
    if (room.type === RoomType.COMPANION) {
      const eligible = COMPANION_DEFS.filter(d => d.recruitFloorMin <= floorNum);
      if (eligible.length > 0) {
        const compDef = eligible[randInt(0, eligible.length - 1)];
        const center = roomCenter(room);
        companionNPCs.push({ def: compDef, col: center.col, row: center.row, recruited: false });
        tiles[center.row][center.col] = TileType.COMPANION_NPC;
      }
    }
  }

  // --- Secret room levers ---
  const secretTriggers: { col: number; row: number; activated: boolean; targetRoomIdx: number }[] = [];
  for (let ri = 0; ri < rooms.length; ri++) {
    if (rooms[ri].type === RoomType.SECRET) {
      // Place a lever in an adjacent connected room
      const neighbors = rooms.filter((r, idx) => idx !== ri && r.type !== RoomType.SECRET);
      if (neighbors.length > 0) {
        const neighbor = neighbors[randInt(0, neighbors.length - 1)];
        const lc = neighbor.x + randInt(1, Math.max(1, neighbor.w - 2));
        const lr = neighbor.y + randInt(1, Math.max(1, neighbor.h - 2));
        if (tiles[lr][lc] === TileType.FLOOR) {
          tiles[lr][lc] = TileType.LEVER;
          secretTriggers.push({ col: lc, row: lr, activated: false, targetRoomIdx: ri });
        }
      }
    }
  }

  // --- Crafting bench and enchant table on shop floors ---
  const isShopFloorCheck = (floorNum + 1) % 2 === 0;
  if (isShopFloorCheck && entranceRoom.w >= 4 && entranceRoom.h >= 4) {
    const benchC = entranceRoom.x + entranceRoom.w - 2;
    const benchR = entranceRoom.y + 1;
    if (tiles[benchR][benchC] === TileType.FLOOR) {
      tiles[benchR][benchC] = TileType.CRAFTING_BENCH;
    }
    const enchC = entranceRoom.x + entranceRoom.w - 2;
    const enchR = entranceRoom.y + entranceRoom.h - 2;
    if (tiles[enchR][enchC] === TileType.FLOOR) {
      tiles[enchR][enchC] = TileType.ENCHANT_TABLE;
    }
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
    reanimationQueue: [],
    darknessTimer: 0,
    burningTrails: [],
    projectiles: [],
    poisonTrails: [],
    traps,
    puzzleRooms,
    arenaHazards,
    companionNPCs,
    secretTriggers,
  };
}

// ---------------------------------------------------------------------------
// Environmental tile placement per floor theme
// ---------------------------------------------------------------------------

function placeEnvironmentalTiles(
  tiles: TileType[][], rooms: RoomInfo[], floorNum: number,
  width: number, height: number,
  entrancePos: GridPos, stairsPos: GridPos,
): void {
  const themeFloor = Math.min(floorNum, 7);
  const isFinal = themeFloor === 7;
  const intensity = isFinal ? 0.4 : 1.0; // reduced on final floor

  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (tiles[r][c] !== TileType.FLOOR) continue;
      // Don't place near entrance/stairs
      if (Math.abs(r - entrancePos.row) + Math.abs(c - entrancePos.col) <= 3) continue;
      if (Math.abs(r - stairsPos.row) + Math.abs(c - stairsPos.col) <= 3) continue;
      // Don't place in shrine rooms
      const inShrine = rooms.some(rm =>
        rm.type === RoomType.SHRINE && c >= rm.x && c < rm.x + rm.w && r >= rm.y && r < rm.y + rm.h);
      if (inShrine) continue;

      const roll = Math.random();

      if ((themeFloor === 1 || isFinal) && roll < 0.06 * intensity) {
        // Enchanted Forest: vine tiles
        tiles[r][c] = TileType.VINE;
      } else if ((themeFloor === 3 || isFinal) && roll < 0.08 * intensity) {
        // Frozen Depths: ice tiles
        tiles[r][c] = TileType.ICE;
      } else if ((themeFloor === 4 || isFinal) && roll < 0.04 * intensity) {
        // Volcanic Tunnels: lava tiles
        tiles[r][c] = TileType.LAVA;
      } else if ((themeFloor === 5 || isFinal) && roll < 0.03 * intensity) {
        // Faerie Hollows: illusion tiles
        tiles[r][c] = TileType.ILLUSION;
      }
    }
  }
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
    aiAbilityCooldown: 2 + Math.random() * 2,
    aiSummonCooldown: 8 + Math.random() * 4,
    aiRallyCooldown: 6 + Math.random() * 3,
    aiHealCooldown: 3 + Math.random() * 2,
    bossPhaseTransitioned: [],
    bossArmorReduction: def.id === "black_knight" ? 0.5 : 0,
    bossEnraged: false,
    bossShieldThrown: false,
    bossChallengeTimer: 0,
    rallyDamageBuff: 0,
    rallyBuffTimer: 0,
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
