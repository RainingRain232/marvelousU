// ---------------------------------------------------------------------------
// Plague Doctor RT — state creation & persistence
// ---------------------------------------------------------------------------

import {
  PlagueRTPhase, TileType, HouseState, HerbType, VillageLayout,
} from "../types";
import type {
  House, PlagueRTState, PlagueRTMeta, PlagueRTPlayer,
} from "../types";
import { PLAGUE_RT_BALANCE as B } from "../config/PlagueRTBalance";

// ---------------------------------------------------------------------------
// Seeded RNG
// ---------------------------------------------------------------------------

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}

// ---------------------------------------------------------------------------
// Village generation
// ---------------------------------------------------------------------------

function generateTiles(
  w: number, h: number, layout: VillageLayout, rng: () => number,
): TileType[][] {
  const tiles: TileType[][] = [];
  for (let y = 0; y < h; y++) {
    tiles[y] = [];
    for (let x = 0; x < w; x++) tiles[y][x] = TileType.GRASS;
  }

  const midX = Math.floor(w / 2);
  const midY = Math.floor(h / 2);

  switch (layout) {
    case VillageLayout.CROSS:
      for (let x = 1; x < w - 1; x++) tiles[midY][x] = TileType.PATH;
      for (let y = 1; y < h - 1; y++) tiles[y][midX] = TileType.PATH;
      break;

    case VillageLayout.CLUSTERS: {
      // Several small road clusters
      const cx = [Math.floor(w * 0.25), Math.floor(w * 0.75), midX, Math.floor(w * 0.25), Math.floor(w * 0.75)];
      const cy = [Math.floor(h * 0.25), Math.floor(h * 0.25), midY, Math.floor(h * 0.75), Math.floor(h * 0.75)];
      for (let c = 0; c < cx.length; c++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = cx[c] + dx, ny = cy[c] + dy;
            if (nx >= 0 && nx < w && ny >= 0 && ny < h) tiles[ny][nx] = TileType.PATH;
          }
        }
      }
      // Connect clusters
      for (let x = cx[0]; x <= cx[1]; x++) tiles[cy[0]][x] = TileType.PATH;
      for (let x = cx[3]; x <= cx[4]; x++) tiles[cy[3]][x] = TileType.PATH;
      for (let y = cy[0]; y <= cy[3]; y++) tiles[y][cx[2]] = TileType.PATH;
      break;
    }

    case VillageLayout.RING: {
      const rx = Math.floor(w * 0.35);
      const ry = Math.floor(h * 0.35);
      for (let a = 0; a < 64; a++) {
        const angle = (a / 64) * Math.PI * 2;
        const px = midX + Math.round(Math.cos(angle) * rx);
        const py = midY + Math.round(Math.sin(angle) * ry);
        if (px >= 0 && px < w && py >= 0 && py < h) tiles[py][px] = TileType.PATH;
      }
      // Cross roads through center
      for (let x = midX - 2; x <= midX + 2; x++) {
        if (x >= 0 && x < w) tiles[midY][x] = TileType.PATH;
      }
      for (let y = midY - 2; y <= midY + 2; y++) {
        if (y >= 0 && y < h) tiles[y][midX] = TileType.PATH;
      }
      break;
    }

    case VillageLayout.MAINSTREET:
      for (let x = 1; x < w - 1; x++) tiles[midY][x] = TileType.PATH;
      // Side streets
      for (let i = 0; i < 4; i++) {
        const sx = 2 + Math.floor(rng() * (w - 4));
        const len = 2 + Math.floor(rng() * 3);
        for (let dy = -len; dy <= len; dy++) {
          const ny = midY + dy;
          if (ny >= 0 && ny < h) tiles[ny][sx] = TileType.PATH;
        }
      }
      break;
  }

  // Add a few random alley paths
  for (let a = 0; a < 6; a++) {
    const sx = 1 + Math.floor(rng() * (w - 2));
    const sy = 1 + Math.floor(rng() * (h - 2));
    const horiz = rng() < 0.5;
    const len = 2 + Math.floor(rng() * 3);
    for (let i = 0; i < len; i++) {
      const nx = horiz ? sx + i : sx;
      const ny = horiz ? sy : sy + i;
      if (nx >= 0 && nx < w && ny >= 0 && ny < h) tiles[ny][nx] = TileType.PATH;
    }
  }

  return tiles;
}

function placeHouses(
  tiles: TileType[][], w: number, h: number, count: number, rng: () => number,
): House[] {
  const houses: House[] = [];
  let id = 0;
  const midX = Math.floor(w / 2);
  const midY = Math.floor(h / 2);
  const maxDist = Math.sqrt(midX * midX + midY * midY);

  // Find candidate positions adjacent to paths
  const candidates: { gx: number; gy: number }[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (tiles[y][x] !== TileType.GRASS) continue;
      let adjPath = false;
      if (y > 0 && tiles[y - 1][x] === TileType.PATH) adjPath = true;
      if (y < h - 1 && tiles[y + 1][x] === TileType.PATH) adjPath = true;
      if (x > 0 && tiles[y][x - 1] === TileType.PATH) adjPath = true;
      if (x < w - 1 && tiles[y][x + 1] === TileType.PATH) adjPath = true;
      if (adjPath) candidates.push({ gx: x, gy: y });
    }
  }

  // Shuffle candidates
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  const placed = Math.min(count, candidates.length);
  for (let i = 0; i < placed; i++) {
    const c = candidates[i];
    const dist = Math.sqrt((c.gx - midX) ** 2 + (c.gy - midY) ** 2);
    const distRatio = dist / maxDist;
    const bonusVillagers = distRatio > 0.5 ? 1 : 0;
    const villagers = Math.min(
      B.HOUSE_MAX_VILLAGERS,
      B.HOUSE_MIN_VILLAGERS + Math.floor(rng() * (B.HOUSE_MAX_VILLAGERS - B.HOUSE_MIN_VILLAGERS)) + bonusVillagers,
    );
    tiles[c.gy][c.gx] = TileType.HOUSE;
    houses.push({
      id: id++,
      gx: c.gx,
      gy: c.gy,
      infection: 0,
      state: HouseState.HEALTHY,
      villagers,
      protectionTimer: 0,
      treatProgress: 0,
      shakeTimer: 0,
      deathFlash: 0,
      cureFlash: 0,
      lastInfection: 0,
    });
  }

  return houses;
}

// ---------------------------------------------------------------------------
// State factory
// ---------------------------------------------------------------------------

export function createPlagueRTState(): PlagueRTState {
  const seed = Date.now() % 2147483647;
  const rng = seededRandom(seed);

  const layouts = [VillageLayout.CROSS, VillageLayout.CLUSTERS, VillageLayout.RING, VillageLayout.MAINSTREET];
  const layout = layouts[Math.floor(rng() * layouts.length)];

  const w = B.GRID_W;
  const h = B.GRID_H;
  const tiles = generateTiles(w, h, layout, rng);

  // Place well at center
  const midX = Math.floor(w / 2);
  const midY = Math.floor(h / 2);
  tiles[midY][midX] = TileType.WELL;
  const wellPos = { gx: midX, gy: midY };

  // Place church nearby
  let churchPos: { gx: number; gy: number } | null = null;
  const churchCandidates = [
    { gx: midX - 2, gy: midY - 1 },
    { gx: midX + 2, gy: midY - 1 },
    { gx: midX - 2, gy: midY + 1 },
    { gx: midX + 2, gy: midY + 1 },
  ];
  for (const cc of churchCandidates) {
    if (cc.gx >= 0 && cc.gx < w && cc.gy >= 0 && cc.gy < h) {
      tiles[cc.gy][cc.gx] = TileType.CHURCH;
      churchPos = { gx: cc.gx, gy: cc.gy };
      break;
    }
  }

  // Place houses
  const houses = placeHouses(tiles, w, h, B.HOUSE_COUNT, rng);

  // One random house starts infected at 35%
  let plagueOriginId = -1;
  if (houses.length > 0) {
    const idx = Math.floor(rng() * houses.length);
    houses[idx].infection = 35;
    houses[idx].state = HouseState.INFECTED;
    plagueOriginId = houses[idx].id;
  }

  // Total villagers
  let totalVillagers = 0;
  for (const h2 of houses) totalVillagers += h2.villagers;

  // Cache grass tiles
  const grassTiles: { gx: number; gy: number }[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (tiles[y][x] === TileType.GRASS) grassTiles.push({ gx: x, gy: y });
    }
  }

  // Player starts at center
  const player: PlagueRTPlayer = {
    x: midX,
    y: midY,
    speed: B.PLAYER_SPEED,
    herbs: {
      [HerbType.LAVENDER]: 3,
      [HerbType.WORMWOOD]: 1,
      [HerbType.MANDRAKE]: 0,
      [HerbType.GARLIC]: 1,
    },
    remedies: 2,
    smokeBombs: 0,
    incense: 0,
    ratTraps: 0,
    treating: null,
    treatTimer: 0,
    garlicAuraTimer: 0,
    villagersSaved: 0,
    villagersLost: 0,
    curesPerformed: 0,
    velX: 0,
    velY: 0,
    cureStreak: 0,
    bestStreak: 0,
    streakTimer: 0,
    comboMultiplier: 1.0,
  };

  return {
    phase: PlagueRTPhase.MENU,
    time: 0,
    dayTime: 0,
    day: 1,
    gridW: w,
    gridH: h,
    tileSize: B.TILE_SIZE,
    tiles,
    houses,
    herbs: [],
    rats: [],
    smokes: [],
    floatingTexts: [],
    healBeams: [],
    player,
    nextHerbSpawn: B.HERB_SPAWN_INTERVAL,
    nextRatSpawn: B.RAT_SPAWN_INTERVAL,
    totalVillagers,
    plagueOriginId,
    difficulty: 1.0,
    wave: 0,
    ratsKilled: 0,
    screenShake: 0,
    churchPos,
    wellPos,
    grassTiles,
    layout,
    lastNightState: false,
    dayTransitionTimer: 0,
    dayTransitionText: "",
    wavePreviewTimer: 0,
    wavePreviewCount: 0,
    wellActive: false,
    wellHealingHouses: [],
    mandrakeBlastTimer: 0,
    mandrakeBlastX: 0,
    mandrakeBlastY: 0,
  };
}

// ---------------------------------------------------------------------------
// Meta persistence
// ---------------------------------------------------------------------------

const META_KEY = "plague_rt_meta";

export function loadPlagueRTMeta(): PlagueRTMeta {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (raw) return JSON.parse(raw) as PlagueRTMeta;
  } catch { /* ignore */ }
  return { highScore: 0, bestSaved: 0, bestDay: 0, totalGames: 0, totalSaved: 0, bestStreak: 0 };
}

export function savePlagueRTMeta(meta: PlagueRTMeta): void {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

export function calculateScore(state: PlagueRTState): number {
  const p = state.player;
  const savedPts = p.villagersSaved * B.SCORE_SAVED;
  const dayPts = state.day * B.SCORE_DAY;
  const curePts = Math.floor(p.curesPerformed * B.SCORE_CURE * p.comboMultiplier);
  const ratPts = state.ratsKilled * B.SCORE_RAT_KILL;
  const streakPts = p.bestStreak * B.STREAK_BONUS;
  const pctSaved = state.totalVillagers > 0 ? p.villagersSaved / state.totalVillagers : 0;
  const pctBonus = Math.floor(pctSaved * 100) * B.SCORE_PCT_BONUS;
  return savedPts + dayPts + curePts + ratPts + streakPts + pctBonus;
}

export function scoreBreakdown(state: PlagueRTState): {
  saved: number; day: number; cures: number; rats: number;
  streak: number; pctBonus: number; total: number;
} {
  const p = state.player;
  const saved = p.villagersSaved * B.SCORE_SAVED;
  const day = state.day * B.SCORE_DAY;
  const cures = Math.floor(p.curesPerformed * B.SCORE_CURE * p.comboMultiplier);
  const rats = state.ratsKilled * B.SCORE_RAT_KILL;
  const streak = p.bestStreak * B.STREAK_BONUS;
  const pctSaved = state.totalVillagers > 0 ? p.villagersSaved / state.totalVillagers : 0;
  const pctBonus = Math.floor(pctSaved * 100) * B.SCORE_PCT_BONUS;
  const total = saved + day + cures + rats + streak + pctBonus;
  return { saved, day, cures, rats, streak, pctBonus, total };
}
