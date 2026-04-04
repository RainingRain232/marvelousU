// ---------------------------------------------------------------------------
// Kingdom – Procedural Level Generator (improved)
// Much more varied terrain, floating coins, better formations
// ---------------------------------------------------------------------------

import { TileType, EnemyType, ItemType } from "../types";
import type { LevelData, EnemySpawn, FloatingCoin, MovingPlatformSpawn, PipeEntrance } from "../types";
import { LEVEL_HEIGHT, GROUND_ROW, MIN_LEVEL_WIDTH, MAX_LEVEL_WIDTH, PLATFORM_DEFAULT_SPEED, getDifficultyForLevel } from "../config/KingdomConfig";

// ---------------------------------------------------------------------------
// Seeded PRNG
// ---------------------------------------------------------------------------

function seededRng(seed: number): () => number {
  let s = seed | 0;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}
function pick<T>(rng: () => number, arr: T[]): T { return arr[Math.floor(rng() * arr.length)]; }
function between(rng: () => number, lo: number, hi: number): number { return lo + Math.floor(rng() * (hi - lo + 1)); }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function create2D(rows: number, cols: number): TileType[][] {
  return Array.from({ length: rows }, () => new Array(cols).fill(TileType.EMPTY));
}
function set(tiles: TileType[][], r: number, c: number, t: TileType): void {
  if (r >= 0 && r < tiles.length && c >= 0 && c < tiles[0].length) tiles[r][c] = t;
}
function get(tiles: TileType[][], r: number, c: number): TileType {
  if (r < 0 || r >= tiles.length || c < 0 || c >= tiles[0].length) return TileType.EMPTY;
  return tiles[r][c];
}
function fillGround(tiles: TileType[][], c0: number, c1: number, castle = false): void {
  const gt = castle ? TileType.CASTLE_FLOOR : TileType.GROUND_TOP;
  const gb = castle ? TileType.CASTLE_FLOOR : TileType.GROUND;
  for (let c = c0; c < Math.min(c1, tiles[0].length); c++) {
    set(tiles, GROUND_ROW, c, gt);
    set(tiles, GROUND_ROW + 1, c, gb);
  }
}
function clearColumn(tiles: TileType[][], c: number): void {
  for (let r = 0; r < LEVEL_HEIGHT; r++) set(tiles, r, c, TileType.EMPTY);
}
function fillGroundRaised(tiles: TileType[][], c0: number, c1: number, topRow: number, castle = false): void {
  const gt = castle ? TileType.CASTLE_FLOOR : TileType.GROUND_TOP;
  const gb = castle ? TileType.CASTLE_FLOOR : TileType.GROUND;
  for (let c = c0; c < Math.min(c1, tiles[0].length); c++) {
    set(tiles, topRow, c, gt);
    for (let r = topRow + 1; r <= GROUND_ROW + 1; r++) set(tiles, r, c, gb);
  }
}
function findGroundY(tiles: TileType[][], col: number): number {
  for (let r = 0; r < LEVEL_HEIGHT; r++) {
    const t = get(tiles, r, col);
    if (t === TileType.GROUND || t === TileType.GROUND_TOP || t === TileType.CASTLE_FLOOR) return r;
  }
  return GROUND_ROW;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface LevelGenResult extends LevelData {
  floatingCoins: FloatingCoin[];
  movingPlatforms: MovingPlatformSpawn[];
  pipeEntrances: PipeEntrance[];
}

export function generateLevel(world: number, level: number): LevelGenResult {
  const rng = seededRng(world * 1000 + level * 7 + 42);
  const isCastle = level === 4;
  const difficulty = getDifficultyForLevel(world, level);

  const width = between(rng, MIN_LEVEL_WIDTH, MAX_LEVEL_WIDTH) + Math.floor(difficulty * 8);
  const tiles = create2D(LEVEL_HEIGHT, width);
  const enemies: EnemySpawn[] = [];
  const floatingCoins: FloatingCoin[] = [];
  const movingPlatforms: MovingPlatformSpawn[] = [];
  const pipeEntrances: PipeEntrance[] = [];

  // Fill base ground
  fillGround(tiles, 0, width, isCastle);

  const safeEnd = 8;
  let col = safeEnd;

  if (!isCastle) {
    col = genOutdoor(tiles, enemies, floatingCoins, movingPlatforms, col, width, rng, world, difficulty);
    placeFlagPole(tiles, width - 14);
    placeFlagApproachBlocks(tiles, width - 14, world, level);
    placeEndCastle(tiles, width - 6);
  } else {
    col = genCastle(tiles, enemies, floatingCoins, movingPlatforms, col, width, rng, world, difficulty);
    placeBossRoom(tiles, enemies, width - 32, world);
  }

  // Block formations
  placeBlockFormations(tiles, rng, safeEnd, width - 20, isCastle, difficulty);

  // Enemies
  placeEnemies(tiles, enemies, rng, safeEnd + 6, width - 20, world, isCastle, difficulty);

  // Starting coin trail
  for (let i = 0; i < 3; i++) {
    floatingCoins.push({ x: 4 + i * 1.5, y: GROUND_ROW - 3, collected: false, bobOffset: i * 0.7 });
  }

  const startX = 2;
  const startY = findGroundY(tiles, startX) - 1;

  // Place spring blocks
  placeSpringBlocks(tiles, rng, safeEnd, width - 20, difficulty);

  // Place hidden blocks (secrets)
  placeHiddenBlocks(tiles, rng, safeEnd, width - 20, difficulty);

  // Place bonus pipe (coin room) in first half of outdoor levels
  if (!isCastle && rng() < 0.75 + world * 0.05) {
    placeBonusPipe(tiles, pipeEntrances, rng, safeEnd + 20, Math.floor(width * 0.5));
  }
  // Place warp pipe (next world) in second half of outdoor levels — worlds 1–3 only
  if (!isCastle && world < 4) {
    placeWarpPipe(tiles, pipeEntrances, rng, Math.floor(width * 0.55), width - 40, world + 1, 1);
  }

  // Hand-designed signature section per world (placed at ~30% through level)
  if (!isCastle) {
    placeWorldSignature(tiles, floatingCoins, enemies, Math.floor(width * 0.3), world, rng);
  }

  return { tiles, enemies, width, height: LEVEL_HEIGHT, startX, startY, floatingCoins, movingPlatforms, pipeEntrances };
}

function placeSpringBlocks(tiles: TileType[][], rng: () => number, c0: number, c1: number, difficulty: number): void {
  for (let c = c0; c < c1; c += between(rng, 30, 50)) {
    if (rng() < 0.3 + difficulty * 0.02) {
      const gy = findGroundY(tiles, c);
      if (gy < LEVEL_HEIGHT && gy > 4 && get(tiles, gy - 1, c) === TileType.EMPTY) {
        set(tiles, gy - 1, c, TileType.SPRING);
      }
    }
  }
}

function placeHiddenBlocks(tiles: TileType[][], rng: () => number, c0: number, c1: number, difficulty: number): void {
  // Place 2-4 hidden blocks per level in strategic locations (above gaps, above platforms)
  const count = 2 + Math.floor(difficulty * 0.2);
  for (let i = 0; i < count; i++) {
    const c = c0 + Math.floor(rng() * (c1 - c0));
    // Look for a column with empty air above ground level
    const gy = findGroundY(tiles, c);
    if (gy >= LEVEL_HEIGHT) continue;
    // Place hidden block 3-5 rows above ground
    const hr = gy - between(rng, 3, 5);
    if (hr > 1 && get(tiles, hr, c) === TileType.EMPTY) {
      set(tiles, hr, c, TileType.HIDDEN);
    }
  }
}

function placeBonusPipe(tiles: TileType[][], entrances: PipeEntrance[], rng: () => number, c0: number, c1: number): void {
  for (let attempts = 0; attempts < 10; attempts++) {
    const c = c0 + Math.floor(rng() * Math.max(1, c1 - c0));
    const gy = findGroundY(tiles, c);
    if (gy >= LEVEL_HEIGHT || gy < 4) continue;
    if (get(tiles, gy - 1, c) !== TileType.EMPTY || get(tiles, gy - 1, c + 1) !== TileType.EMPTY) continue;
    const pipeH = 3;
    const topRow = gy - pipeH;
    set(tiles, topRow, c, TileType.PIPE_ENTER_L);
    set(tiles, topRow, c + 1, TileType.PIPE_ENTER_R);
    for (let r = topRow + 1; r < gy; r++) {
      set(tiles, r, c, TileType.PIPE_BL);
      set(tiles, r, c + 1, TileType.PIPE_BR);
    }
    entrances.push({ col: c, row: topRow, bonusRoomIdx: 0, type: 'bonus' });
    return;
  }
}

function placeWarpPipe(tiles: TileType[][], entrances: PipeEntrance[], rng: () => number, c0: number, c1: number, warpWorld: number, warpLevel: number): void {
  for (let attempts = 0; attempts < 10; attempts++) {
    const c = c0 + Math.floor(rng() * Math.max(1, c1 - c0));
    const gy = findGroundY(tiles, c);
    if (gy >= LEVEL_HEIGHT || gy < 4) continue;
    if (get(tiles, gy - 1, c) !== TileType.EMPTY || get(tiles, gy - 1, c + 1) !== TileType.EMPTY) continue;
    // Don't overlap an existing entrance
    if (entrances.some(pe => Math.abs(pe.col - c) < 4)) continue;
    const pipeH = 3;
    const topRow = gy - pipeH;
    set(tiles, topRow, c, TileType.PIPE_WARP_L);
    set(tiles, topRow, c + 1, TileType.PIPE_WARP_R);
    for (let r = topRow + 1; r < gy; r++) {
      set(tiles, r, c, TileType.PIPE_BL);
      set(tiles, r, c + 1, TileType.PIPE_BR);
    }
    entrances.push({ col: c, row: topRow, bonusRoomIdx: 0, type: 'warp', warpWorld, warpLevel });
    return;
  }
}

// ---------------------------------------------------------------------------
// World signature sections — memorable hand-designed challenges
// ---------------------------------------------------------------------------

function placeWorldSignature(
  tiles: TileType[][], coins: FloatingCoin[], enemies: EnemySpawn[],
  col: number, world: number, rng: () => number,
): void {
  // Ensure ground exists before and after
  fillGround(tiles, col - 3, col + 30);

  switch (world) {
    case 1: {
      // "The Great Staircase" — ascending platforms with coin trails
      for (let i = 0; i < 6; i++) {
        const r = GROUND_ROW - 2 - i;
        const c = col + i * 3;
        set(tiles, r, c, TileType.BRICK);
        set(tiles, r, c + 1, TileType.QUESTION);
        set(tiles, r, c + 2, TileType.BRICK);
        coins.push({ x: c + 1.5, y: r - 1.5, collected: false, bobOffset: i * 0.5 });
      }
      // Reward at top
      const topR = GROUND_ROW - 2 - 6;
      set(tiles, topR, col + 18, TileType.HIDDEN); // Secret 1-up
      coins.push({ x: col + 18.5, y: topR - 1, collected: false, bobOffset: 0 });
      break;
    }
    case 2: {
      // "The Canopy Run" — floating one-way platforms with no ground
      for (let c = col; c < col + 20; c++) {
        // Remove ground
        set(tiles, GROUND_ROW, c, TileType.EMPTY);
        set(tiles, GROUND_ROW + 1, c, TileType.EMPTY);
      }
      // Place one-way platforms at varying heights
      for (let i = 0; i < 7; i++) {
        const pr = between(rng, 8, 12);
        const pc = col + 1 + i * 3;
        for (let j = 0; j < 2; j++) set(tiles, pr, pc + j, TileType.ONE_WAY);
        if (i % 2 === 0) coins.push({ x: pc + 1, y: pr - 1.5, collected: false, bobOffset: i * 0.4 });
      }
      // Restore ground after
      fillGround(tiles, col + 20, col + 25);
      break;
    }
    case 3: {
      // "The Lava Gauntlet" — series of small lava pits with crumbling platforms
      for (let i = 0; i < 4; i++) {
        const pc = col + i * 6;
        for (let c = pc + 1; c < pc + 4; c++) {
          set(tiles, GROUND_ROW, c, TileType.LAVA);
          set(tiles, GROUND_ROW + 1, c, TileType.LAVA);
        }
        // Small bridge
        set(tiles, GROUND_ROW - 1, pc + 2, TileType.BRICK);
        coins.push({ x: pc + 2.5, y: GROUND_ROW - 3, collected: false, bobOffset: i * 0.6 });
      }
      // Skeleton on high platform overlooking the gauntlet
      set(tiles, 7, col + 10, TileType.CASTLE_FLOOR);
      set(tiles, 7, col + 11, TileType.CASTLE_FLOOR);
      set(tiles, 7, col + 12, TileType.CASTLE_FLOOR);
      enemies.push({ type: EnemyType.SKELETON, col: col + 11, row: 6 });
      break;
    }
    case 4: {
      // "The Dark Corridor" — enclosed with wall gaps to navigate
      for (let c = col; c < col + 24; c++) {
        set(tiles, 2, c, TileType.CASTLE_WALL);
        set(tiles, 3, c, TileType.CASTLE_WALL);
      }
      // Walls with gaps
      for (let i = 0; i < 3; i++) {
        const wc = col + 4 + i * 7;
        for (let r = 4; r < GROUND_ROW; r++) {
          if (r < 7 || r > 9) { // Gap at rows 7-9
            set(tiles, r, wc, TileType.CASTLE_WALL);
          }
        }
        coins.push({ x: wc + 0.5, y: 8, collected: false, bobOffset: i * 0.5 });
      }
      enemies.push({ type: EnemyType.SKELETON, col: col + 18, row: GROUND_ROW - 1 });
      break;
    }
    case 5: {
      // "The Floating Maze" — aerial labyrinth, no ground, two diverging routes
      // Remove ground for the entire section
      for (let c = col; c < col + 28; c++) {
        set(tiles, GROUND_ROW, c, TileType.EMPTY);
        set(tiles, GROUND_ROW + 1, c, TileType.EMPTY);
      }
      // Lower route: staggered one-way platforms with alternating heights
      for (let i = 0; i < 5; i++) {
        const pc = col + i * 5;
        const pr = 11 + (i % 2 === 0 ? 0 : 1);
        for (let j = 0; j < 4; j++) set(tiles, pr, pc + j, TileType.ONE_WAY);
        if (i % 2 === 0) coins.push({ x: pc + 2, y: pr - 1.5, collected: false, bobOffset: i * 0.4 });
      }
      // Upper route: brick platforms with a hidden reward at the end
      for (let i = 0; i < 3; i++) {
        const pc = col + 3 + i * 8;
        for (let j = 0; j < 5; j++) set(tiles, 7, pc + j, TileType.BRICK);
        if (i === 1) set(tiles, 6, pc + 2, TileType.QUESTION);
        coins.push({ x: pc + 2.5, y: 5.5, collected: false, bobOffset: i * 0.6 });
      }
      set(tiles, 6, col + 24, TileType.HIDDEN); // Secret block at the far end
      // Dividing wall that forces the route choice
      for (let r = 3; r < 11; r++) {
        if (r < 7 || r > 9) set(tiles, r, col + 14, TileType.CASTLE_WALL);
      }
      // Bat sentinels flanking the routes; wraith guards the far end
      enemies.push({ type: EnemyType.BAT, col: col + 7, row: 6 });
      enemies.push({ type: EnemyType.BAT, col: col + 21, row: 10 });
      enemies.push({ type: EnemyType.WRAITH, col: col + 24, row: 8 });
      // Restore ground after the maze
      fillGround(tiles, col + 28, col + 33);
      break;
    }
    case 6: {
      // "The Infernal Crucible" — relentless lava gauntlet with overhead pressure
      for (let i = 0; i < 5; i++) {
        const pc = col + i * 6;
        // Lava pit spanning most of the gap
        for (let c = pc + 1; c < pc + 5; c++) {
          set(tiles, GROUND_ROW, c, TileType.LAVA);
          set(tiles, GROUND_ROW + 1, c, TileType.LAVA);
        }
        // Tiny bridge tile as a stepping stone
        set(tiles, GROUND_ROW - 1, pc + 2, TileType.BRIDGE);
        set(tiles, GROUND_ROW - 1, pc + 3, TileType.BRIDGE);
        // Low ceiling wall obstacle on every other gap — forces crouch or careful jump
        if (i % 2 === 0) {
          set(tiles, GROUND_ROW - 4, pc + 5, TileType.CASTLE_WALL);
          set(tiles, GROUND_ROW - 3, pc + 5, TileType.CASTLE_WALL);
          set(tiles, GROUND_ROW - 2, pc + 5, TileType.CASTLE_WALL);
        }
        coins.push({ x: pc + 2.5, y: GROUND_ROW - 3, collected: false, bobOffset: i * 0.5 });
      }
      // Hellhound ambush at the start, boar mid-section
      enemies.push({ type: EnemyType.HELLHOUND, col: col + 5, row: GROUND_ROW - 1 });
      enemies.push({ type: EnemyType.BOAR, col: col + 23, row: GROUND_ROW - 1 });
      // Skeleton sniper on an elevated platform overlooking the gauntlet
      set(tiles, 6, col + 13, TileType.CASTLE_FLOOR);
      set(tiles, 6, col + 14, TileType.CASTLE_FLOOR);
      set(tiles, 6, col + 15, TileType.CASTLE_FLOOR);
      enemies.push({ type: EnemyType.SKELETON, col: col + 14, row: 5 });
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Outdoor generation — many chunk types
// ---------------------------------------------------------------------------

function genOutdoor(
  tiles: TileType[][], enemies: EnemySpawn[], coins: FloatingCoin[], platforms: MovingPlatformSpawn[],
  startCol: number, width: number, rng: () => number, world: number, difficulty: number,
): number {
  let col = startCol;
  const end = width - 20;

  while (col < end) {
    const r = rng();
    const remaining = end - col;
    if (remaining < 8) { col = end; break; }

    if (r < 0.08 && col > 15) {
      // Small gap (2-3)
      const gw = between(rng, 2, 3);
      for (let c = col; c < col + gw; c++) clearColumn(tiles, c);
      // Floating coin over gap
      coins.push({ x: col + gw / 2, y: GROUND_ROW - 4, collected: false, bobOffset: col * 0.3 });
      col += gw;
      fillGround(tiles, col, col + 3);
      col += 3;
    } else if (r < 0.15 && col > 15 && difficulty > 3) {
      // Large gap (4-5) with platform
      const gw = between(rng, 4, Math.min(5, 3 + Math.floor(difficulty / 5)));
      for (let c = col; c < col + gw; c++) clearColumn(tiles, c);
      // Stepping stone platform in middle
      const platC = col + Math.floor(gw / 2);
      set(tiles, GROUND_ROW - 2, platC, TileType.BRICK);
      coins.push({ x: platC + 0.5, y: GROUND_ROW - 4, collected: false, bobOffset: col * 0.2 });
      col += gw;
      fillGround(tiles, col, col + 3);
      col += 3;
    } else if (r < 0.24) {
      // Pipe (various heights)
      const ph = between(rng, 2, 5);
      col = placePipe(tiles, col, ph);
      // Coin on top of pipe
      if (ph >= 3) {
        coins.push({ x: col - 3 + 1, y: GROUND_ROW - ph - 1, collected: false, bobOffset: col * 0.4 });
      }
    } else if (r < 0.34) {
      // Staircase pyramid
      const sh = between(rng, 3, Math.min(6, 3 + Math.floor(difficulty / 3)));
      col = placeStaircase(tiles, col, sh, end);
    } else if (r < 0.42) {
      // Elevated brick platform with coins above
      const pw = between(rng, 4, 7);
      const pr = between(rng, 8, 10);
      for (let c = col; c < col + pw && c < end; c++) {
        set(tiles, pr, c, TileType.BRICK);
      }
      // Coin row above platform
      for (let i = 0; i < pw; i++) {
        coins.push({ x: col + i + 0.5, y: pr - 2, collected: false, bobOffset: i * 0.5 });
      }
      col += pw + 3;
    } else if (r < 0.50) {
      // Coin arc (parabolic coins in the air)
      const arcW = between(rng, 5, 8);
      const arcH = between(rng, 3, 5);
      for (let i = 0; i < arcW; i++) {
        const t = i / (arcW - 1);
        const cy = GROUND_ROW - 2 - arcH * 4 * t * (1 - t);
        coins.push({ x: col + i + 0.5, y: cy, collected: false, bobOffset: i * 0.3 });
      }
      col += arcW + 2;
    } else if (r < 0.57) {
      // Hill (raised ground section)
      const hw = between(rng, 6, 10);
      const hh = between(rng, 2, 3);
      // Ramp up
      for (let i = 0; i < hh; i++) {
        fillGroundRaised(tiles, col + i, col + i + 1, GROUND_ROW - i - 1);
      }
      // Flat top
      fillGroundRaised(tiles, col + hh, col + hw - hh, GROUND_ROW - hh);
      // Enemies like to be on hills
      if (rng() < 0.5) {
        enemies.push({ type: EnemyType.GOBLIN, col: col + Math.floor(hw / 2), row: GROUND_ROW - hh - 1 });
      }
      // Ramp down
      for (let i = 0; i < hh; i++) {
        fillGroundRaised(tiles, col + hw - hh + i, col + hw - hh + i + 1, GROUND_ROW - hh + i);
      }
      col += hw + 2;
    } else if (r < 0.63) {
      // Double-height block formation (question + bricks)
      const bw = between(rng, 4, 6);
      const lowR = 9;
      const highR = 5;
      for (let i = 0; i < bw && col + i < end; i++) {
        if (i === 0 || i === bw - 1) {
          set(tiles, lowR, col + i, TileType.QUESTION);
        } else {
          set(tiles, lowR, col + i, TileType.BRICK);
        }
      }
      // Higher row (fewer blocks)
      for (let i = 1; i < bw - 1 && col + i < end; i++) {
        set(tiles, highR, col + i, i === Math.floor(bw / 2) ? TileType.QUESTION : TileType.BRICK);
      }
      col += bw + 3;
    } else if (r < 0.70) {
      // Floating platform staircase (ascending platforms)
      const steps = between(rng, 3, 5);
      for (let i = 0; i < steps; i++) {
        const pr = GROUND_ROW - 3 - i * 2;
        const pc = col + i * 3;
        for (let j = 0; j < 3 && pc + j < end; j++) {
          set(tiles, pr, pc + j, TileType.BRICK);
        }
        // Coin on top platform
        coins.push({ x: pc + 1.5, y: pr - 1.5, collected: false, bobOffset: i * 0.6 });
      }
      col += steps * 3 + 3;
    } else if (r < 0.76) {
      // Pipe corridor (2 pipes close together with enemy between)
      col = placePipe(tiles, col, between(rng, 2, 3));
      fillGround(tiles, col, col + 4);
      if (rng() < 0.6) {
        enemies.push({ type: pick(rng, [EnemyType.GOBLIN, EnemyType.DARK_KNIGHT]), col: col + 2, row: GROUND_ROW - 1 });
      }
      col += 4;
      col = placePipe(tiles, col, between(rng, 2, 4));
    } else if (r < 0.82) {
      // Coin column (vertical stack of coins)
      const ch = between(rng, 3, 6);
      for (let i = 0; i < ch; i++) {
        coins.push({ x: col + 0.5, y: GROUND_ROW - 2 - i * 1.2, collected: false, bobOffset: i * 0.4 });
      }
      col += 3;
    } else if (r < 0.88) {
      // Question block row at varying heights
      const qw = between(rng, 2, 4);
      for (let i = 0; i < qw && col + i * 3 < end; i++) {
        const qr = between(rng, 6, 10);
        set(tiles, qr, col + i * 3, TileType.QUESTION);
      }
      col += qw * 3 + 2;
    } else if (r < 0.91 && difficulty > 2) {
      // Moving platform over gap
      const gw = between(rng, 5, 7);
      for (let c = col; c < col + gw; c++) clearColumn(tiles, c);
      const platY = GROUND_ROW - between(rng, 2, 4);
      const vertical = rng() < 0.4;
      if (vertical) {
        platforms.push({ x: col + gw / 2 - 1, y: platY, width: 3, endX: col + gw / 2 - 1, endY: platY - 3, speed: PLATFORM_DEFAULT_SPEED });
      } else {
        platforms.push({ x: col + 1, y: platY, width: 3, endX: col + gw - 3, endY: platY, speed: PLATFORM_DEFAULT_SPEED });
      }
      coins.push({ x: col + gw / 2, y: platY - 2, collected: false, bobOffset: col * 0.2 });
      col += gw;
      fillGround(tiles, col, col + 3);
      col += 3;
    } else if (r < 0.94 && difficulty > 5) {
      // Multi-coin block
      const mcR = between(rng, 7, 10);
      if (get(tiles, mcR, col) === TileType.EMPTY) {
        set(tiles, mcR, col, TileType.COIN_BLOCK);
      }
      col += 4;
    } else {
      // Flat section with coin trail
      const fw = between(rng, 5, 10);
      if (rng() < 0.4) {
        for (let i = 1; i < fw - 1; i += 2) {
          coins.push({ x: col + i + 0.5, y: GROUND_ROW - 3, collected: false, bobOffset: i * 0.3 });
        }
      }
      col += fw;
    }

    if (col >= end) col = end;
  }
  return col;
}

// ---------------------------------------------------------------------------
// Castle generation
// ---------------------------------------------------------------------------

function genCastle(
  tiles: TileType[][], enemies: EnemySpawn[], coins: FloatingCoin[], platforms: MovingPlatformSpawn[],
  startCol: number, width: number, rng: () => number, world: number, difficulty: number,
): number {
  let col = startCol;
  const end = width - 37;

  // Ceiling
  for (let c = 0; c < width; c++) {
    set(tiles, 0, c, TileType.CASTLE_WALL);
    set(tiles, 1, c, TileType.CASTLE_WALL);
  }

  while (col < end) {
    const r = rng();
    if (r < 0.18) {
      // Lava pit
      const pw = between(rng, 3, 5);
      for (let c = col; c < col + pw && c < end; c++) {
        set(tiles, GROUND_ROW, c, TileType.LAVA);
        set(tiles, GROUND_ROW + 1, c, TileType.LAVA);
      }
      col += pw;
      fillGround(tiles, col, Math.min(col + 3, end), true);
      col += 3;
    } else if (r < 0.30) {
      // Lava pit with bridge platform
      const pw = between(rng, 4, 6);
      for (let c = col; c < col + pw && c < end; c++) {
        set(tiles, GROUND_ROW, c, TileType.LAVA);
        set(tiles, GROUND_ROW + 1, c, TileType.LAVA);
      }
      // Bridge
      for (let c = col + 1; c < col + pw - 1 && c < end; c++) {
        set(tiles, GROUND_ROW - 1, c, TileType.BRIDGE);
      }
      coins.push({ x: col + pw / 2, y: GROUND_ROW - 3, collected: false, bobOffset: col * 0.2 });
      col += pw;
      fillGround(tiles, col, Math.min(col + 2, end), true);
      col += 2;
    } else if (r < 0.42) {
      // Floating platforms (stepping stones)
      const steps = between(rng, 2, 4);
      for (let i = 0; i < steps; i++) {
        const pr = between(rng, 8, 11);
        const pc = col + i * 4;
        for (let j = 0; j < 3 && pc + j < end; j++) {
          set(tiles, pr, pc + j, TileType.CASTLE_FLOOR);
        }
        coins.push({ x: pc + 1.5, y: pr - 1.5, collected: false, bobOffset: i * 0.5 });
      }
      col += steps * 4 + 2;
    } else if (r < 0.52) {
      // Wall obstacle with gap
      const gapR = between(rng, 5, 9);
      for (let rr = 2; rr < GROUND_ROW; rr++) {
        if (rr < gapR || rr > gapR + 2) {
          set(tiles, rr, col, TileType.CASTLE_WALL);
          set(tiles, rr, col + 1, TileType.CASTLE_WALL);
        }
      }
      col += 4;
    } else if (r < 0.60) {
      // Elevated corridor with lava below
      const ew = between(rng, 6, 10);
      for (let c = col; c < col + ew && c < end; c++) {
        set(tiles, GROUND_ROW, c, TileType.LAVA);
        set(tiles, GROUND_ROW + 1, c, TileType.LAVA);
        set(tiles, GROUND_ROW - 3, c, TileType.CASTLE_FLOOR);
      }
      col += ew + 2;
    } else {
      // Flat corridor with coin trail
      const fw = between(rng, 5, 10);
      if (rng() < 0.5) {
        for (let i = 1; i < fw - 1; i += 2) {
          coins.push({ x: col + i + 0.5, y: GROUND_ROW - 3, collected: false, bobOffset: i * 0.3 });
        }
      }
      col += fw;
    }
    if (col >= end) col = end;
  }
  return col;
}

// ---------------------------------------------------------------------------
// Chunk helpers
// ---------------------------------------------------------------------------

function placePipe(tiles: TileType[][], col: number, height: number): number {
  const topRow = GROUND_ROW - height;
  set(tiles, topRow, col, TileType.PIPE_TL);
  set(tiles, topRow, col + 1, TileType.PIPE_TR);
  for (let r = topRow + 1; r < GROUND_ROW; r++) {
    set(tiles, r, col, TileType.PIPE_BL);
    set(tiles, r, col + 1, TileType.PIPE_BR);
  }
  return col + 4;
}

function placeStaircase(tiles: TileType[][], col: number, maxH: number, endZone: number): number {
  // Ascending
  for (let h = 1; h <= maxH && col < endZone; h++) {
    for (let r = GROUND_ROW - h; r < GROUND_ROW; r++) {
      set(tiles, r, col, TileType.GROUND);
    }
    set(tiles, GROUND_ROW - h, col, TileType.GROUND_TOP);
    col++;
  }
  // Flat top
  for (let i = 0; i < 2 && col < endZone; i++) {
    for (let r = GROUND_ROW - maxH; r < GROUND_ROW; r++) {
      set(tiles, r, col, TileType.GROUND);
    }
    set(tiles, GROUND_ROW - maxH, col, TileType.GROUND_TOP);
    col++;
  }
  // Descending
  for (let h = maxH - 1; h >= 1 && col < endZone; h--) {
    for (let r = GROUND_ROW - h; r < GROUND_ROW; r++) {
      set(tiles, r, col, TileType.GROUND);
    }
    set(tiles, GROUND_ROW - h, col, TileType.GROUND_TOP);
    col++;
  }
  return col + 2;
}

// ---------------------------------------------------------------------------
// Block formations
// ---------------------------------------------------------------------------

function placeBlockFormations(
  tiles: TileType[][], rng: () => number,
  c0: number, c1: number, isCastle: boolean, difficulty: number,
): void {
  const rows = [9, 5, 7];

  for (let c = c0; c < c1; c++) {
    // Only above walkable ground
    const gy = findGroundY(tiles, c);
    if (gy >= LEVEL_HEIGHT) continue;

    if (rng() < 0.035) {
      // Single question block
      const row = pick(rng, rows);
      if (get(tiles, row, c) === TileType.EMPTY) {
        set(tiles, row, c, TileType.QUESTION);
      }
    } else if (rng() < 0.025) {
      // Block row
      const row = pick(rng, rows);
      const len = between(rng, 3, 7);
      for (let i = 0; i < len && c + i < c1; i++) {
        if (get(tiles, row, c + i) !== TileType.EMPTY) continue;
        if (i === 0 || i === len - 1 || (len > 4 && i === Math.floor(len / 2))) {
          set(tiles, row, c + i, TileType.QUESTION);
        } else {
          set(tiles, row, c + i, TileType.BRICK);
        }
      }
      c += len;
    } else if (rng() < 0.008 && difficulty > 4) {
      // Brick pyramid (3 high)
      for (let layer = 0; layer < 3; layer++) {
        for (let i = layer; i < 5 - layer && c + i < c1; i++) {
          const row = 10 - layer;
          if (get(tiles, row, c + i) === TileType.EMPTY) {
            set(tiles, row, c + i, TileType.BRICK);
          }
        }
      }
      c += 6;
    }
  }
}

// ---------------------------------------------------------------------------
// Enemy placement
// ---------------------------------------------------------------------------

function placeEnemies(
  tiles: TileType[][], enemies: EnemySpawn[], rng: () => number,
  c0: number, c1: number, world: number, isCastle: boolean, difficulty: number,
): void {
  const baseChance = 0.03 + difficulty * 0.004;

  for (let c = c0; c < c1; c++) {
    const gy = findGroundY(tiles, c);
    if (gy >= LEVEL_HEIGHT) continue;
    if (get(tiles, gy - 1, c) !== TileType.EMPTY) continue;
    // No enemies too close to each other
    if (enemies.some(e => Math.abs(e.col - c) < 4)) continue;

    if (rng() < baseChance) {
      const type = pickEnemyType(rng, world, isCastle);
      // Bats spawn high in the air, not on ground
      const spawnRow = type === EnemyType.BAT ? Math.max(3, gy - between(rng, 4, 7)) : gy - 1;
      // Skeletons prefer elevated positions
      const finalRow = type === EnemyType.SKELETON && gy > 6 ? Math.max(4, gy - between(rng, 2, 4)) : spawnRow;
      enemies.push({ type, col: c, row: finalRow });
      c += 4;
    }

    // Enemy pairs (harder worlds)
    if (rng() < 0.008 * world && c + 2 < c1) {
      const gy2 = findGroundY(tiles, c + 2);
      if (gy2 < LEVEL_HEIGHT && get(tiles, gy2 - 1, c + 2) === TileType.EMPTY) {
        enemies.push({ type: EnemyType.GOBLIN, col: c, row: gy - 1 });
        enemies.push({ type: EnemyType.GOBLIN, col: c + 2, row: gy2 - 1 });
        c += 5;
      }
    }
  }
}

function pickEnemyType(rng: () => number, world: number, isCastle: boolean): EnemyType {
  const r = rng();
  if (world === 1) {
    if (r < 0.55) return EnemyType.GOBLIN;
    if (r < 0.85) return EnemyType.DARK_KNIGHT;
    return EnemyType.BAT;
  }
  if (world === 2) {
    if (r < 0.3) return EnemyType.GOBLIN;
    if (r < 0.55) return EnemyType.DARK_KNIGHT;
    if (r < 0.7) return EnemyType.BAT;
    if (r < 0.85) return EnemyType.BOAR;
    return EnemyType.SKELETON;
  }
  // World 5 — airborne horrors, wraiths haunt the void
  if (world === 5) {
    if (r < 0.08) return EnemyType.GOBLIN;
    if (r < 0.2) return EnemyType.DARK_KNIGHT;
    if (r < 0.44) return EnemyType.BAT;
    if (r < 0.56) return EnemyType.BOAR;
    if (r < 0.78) return EnemyType.SKELETON;
    return EnemyType.WRAITH;
  }
  // World 6 — hellhounds and undead rule the infernal keep
  if (world >= 6) {
    if (r < 0.04) return EnemyType.GOBLIN;
    if (r < 0.12) return EnemyType.DARK_KNIGHT;
    if (r < 0.24) return EnemyType.BAT;
    if (r < 0.42) return EnemyType.BOAR;
    if (r < 0.66) return EnemyType.SKELETON;
    if (r < 0.84) return EnemyType.HELLHOUND;
    return EnemyType.WRAITH; // wraiths still appear, rarer
  }
  // World 3-4
  if (r < 0.2) return EnemyType.GOBLIN;
  if (r < 0.4) return EnemyType.DARK_KNIGHT;
  if (r < 0.55) return EnemyType.BAT;
  if (r < 0.7) return EnemyType.BOAR;
  return EnemyType.SKELETON;
}

// ---------------------------------------------------------------------------
// Flag pole & end structures
// ---------------------------------------------------------------------------

function placeFlagApproachBlocks(tiles: TileType[][], flagCol: number, world: number, level: number): void {
  // Vary the layout per level using a simple hash
  const variant = (world * 4 + level) % 4;
  if (variant === 0) {
    // Hidden coin block 3 tiles left of flag at mid height — boosts players up
    set(tiles, GROUND_ROW - 5, flagCol - 3, TileType.HIDDEN);
  } else if (variant === 1) {
    // Brick staircase leading up to flag: 3 steps
    set(tiles, GROUND_ROW - 1, flagCol - 4, TileType.BRICK);
    set(tiles, GROUND_ROW - 2, flagCol - 3, TileType.BRICK);
    set(tiles, GROUND_ROW - 2, flagCol - 4, TileType.BRICK);
    set(tiles, GROUND_ROW - 3, flagCol - 2, TileType.BRICK);
    set(tiles, GROUND_ROW - 3, flagCol - 3, TileType.BRICK);
    set(tiles, GROUND_ROW - 3, flagCol - 4, TileType.BRICK);
  } else if (variant === 2) {
    // Two hidden coin blocks at different heights — secret double boost
    set(tiles, GROUND_ROW - 4, flagCol - 5, TileType.HIDDEN);
    set(tiles, GROUND_ROW - 7, flagCol - 3, TileType.HIDDEN);
  } else {
    // Floating brick platform with a hidden block above for boost
    set(tiles, GROUND_ROW - 4, flagCol - 4, TileType.BRICK);
    set(tiles, GROUND_ROW - 4, flagCol - 3, TileType.BRICK);
    set(tiles, GROUND_ROW - 7, flagCol - 4, TileType.HIDDEN);
  }
}

function placeFlagPole(tiles: TileType[][], col: number): void {
  fillGround(tiles, col - 2, col + 6);
  for (let r = 3; r < GROUND_ROW; r++) set(tiles, r, col, TileType.FLAG_POLE);
  set(tiles, 2, col, TileType.FLAG_TOP);
}

function placeEndCastle(tiles: TileType[][], col: number): void {
  fillGround(tiles, col - 2, col + 5);
  for (let r = 8; r < GROUND_ROW; r++) {
    for (let c = col; c < col + 4; c++) set(tiles, r, c, TileType.CASTLE_WALL);
  }
  set(tiles, 7, col, TileType.CASTLE_WALL); set(tiles, 7, col + 3, TileType.CASTLE_WALL);
  set(tiles, 6, col, TileType.CASTLE_WALL); set(tiles, 6, col + 3, TileType.CASTLE_WALL);
}

// ---------------------------------------------------------------------------
// Boss room
// ---------------------------------------------------------------------------

function placeBossRoom(tiles: TileType[][], enemies: EnemySpawn[], col: number, world: number): void {
  const bridgeStart = col;
  const bridgeLen = 14;

  for (let c = bridgeStart; c < bridgeStart + bridgeLen; c++) {
    set(tiles, GROUND_ROW, c, TileType.LAVA);
    set(tiles, GROUND_ROW + 1, c, TileType.LAVA);
  }
  for (let c = bridgeStart; c < bridgeStart + bridgeLen; c++) {
    set(tiles, GROUND_ROW - 1, c, TileType.BRIDGE);
  }

  // Axe / lever to break bridge
  set(tiles, GROUND_ROW - 3, bridgeStart + bridgeLen - 1, TileType.QUESTION);

  // Ground after bridge (victory area)
  fillGround(tiles, bridgeStart + bridgeLen, bridgeStart + bridgeLen + 12, true);

  // Boss platforms for more interesting fight
  set(tiles, GROUND_ROW - 5, bridgeStart + 3, TileType.CASTLE_FLOOR);
  set(tiles, GROUND_ROW - 5, bridgeStart + 4, TileType.CASTLE_FLOOR);
  set(tiles, GROUND_ROW - 5, bridgeStart + 5, TileType.CASTLE_FLOOR);
  set(tiles, GROUND_ROW - 5, bridgeStart + 9, TileType.CASTLE_FLOOR);
  set(tiles, GROUND_ROW - 5, bridgeStart + 10, TileType.CASTLE_FLOOR);

  enemies.push({ type: EnemyType.DRAGON, col: bridgeStart + 5, row: GROUND_ROW - 4 });
}
