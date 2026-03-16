// ---------------------------------------------------------------------------
// Quest for the Grail — Infinite Scaling Mode
// Endless dungeon with scaling difficulty, leaderboards, rest floors
// ---------------------------------------------------------------------------

import { INFINITE_MODE } from "../config/GameArtifactDefs";
import { ENEMY_DEFS, ENEMY_POOLS, GameBalance } from "../config/GameConfig";
import type { EnemyDef, FloorParams } from "../config/GameConfig";
import type { GrailGameState } from "../state/GameState";

// ---------------------------------------------------------------------------
// Leaderboard
// ---------------------------------------------------------------------------

export interface LeaderboardEntry {
  knightId: string;
  knightName: string;
  deepestFloor: number;
  score: number;
  totalKills: number;
  date: string;
}

export function loadLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(INFINITE_MODE.LEADERBOARD_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

export function saveLeaderboardEntry(entry: LeaderboardEntry): void {
  const board = loadLeaderboard();
  board.push(entry);
  board.sort((a, b) => b.score - a.score);
  // Keep top 10
  const trimmed = board.slice(0, 10);
  try {
    localStorage.setItem(INFINITE_MODE.LEADERBOARD_KEY, JSON.stringify(trimmed));
  } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Floor Parameters for Infinite Mode
// ---------------------------------------------------------------------------

export function getInfiniteFloorParams(floorNum: number): FloorParams {
  const isRestFloor = floorNum > 0 && floorNum % INFINITE_MODE.REST_FLOOR_INTERVAL === 0;

  if (isRestFloor) {
    return {
      width: 20,
      height: 15,
      roomCountMin: 2,
      roomCountMax: 3,
      roomSizeMin: 5,
      roomSizeMax: 7,
      enemyCountMin: 0,
      enemyCountMax: 0,
      trapChance: 0,
      treasureChance: 0.8,
      hasBoss: false,
    };
  }

  const tier = Math.floor(floorNum / INFINITE_MODE.NEW_ENEMY_TIER_INTERVAL);
  const t = Math.min(floorNum / 50, 1); // progress 0..1 over 50 floors

  return {
    width: Math.floor(40 + t * 25 + tier * 5),
    height: Math.floor(30 + t * 20 + tier * 3),
    roomCountMin: Math.floor(5 + t * 5 + tier),
    roomCountMax: Math.floor(8 + t * 8 + tier * 2),
    roomSizeMin: 4,
    roomSizeMax: Math.floor(8 + t * 4),
    enemyCountMin: Math.floor(6 + floorNum * 0.8),
    enemyCountMax: Math.floor(10 + floorNum * 1.2),
    trapChance: Math.min(0.1, 0.02 + floorNum * 0.003),
    treasureChance: Math.max(0.15, 0.4 - floorNum * 0.005),
    hasBoss: floorNum % 5 === 4,   // boss every 5th floor (5, 10, 15...)
  };
}

// ---------------------------------------------------------------------------
// Enemy Scaling
// ---------------------------------------------------------------------------

export function getScaledEnemyDef(baseDef: EnemyDef, floorNum: number): EnemyDef {
  const scale = (base: number, mult: number) =>
    Math.floor(base * Math.pow(mult, floorNum));

  return {
    ...baseDef,
    hp: scale(baseDef.hp, INFINITE_MODE.BASE_ENEMY_HP_SCALE),
    attack: scale(baseDef.attack, INFINITE_MODE.BASE_ENEMY_ATK_SCALE),
    defense: scale(baseDef.defense, INFINITE_MODE.BASE_ENEMY_DEF_SCALE),
    xpReward: Math.floor(baseDef.xpReward * (1 + floorNum * 0.1)),
    goldReward: Math.floor(baseDef.goldReward * (1 + floorNum * 0.08)),
  };
}

// Get enemy pool for infinite mode — adds harder enemies at higher tiers
export function getInfiniteEnemyPool(floorNum: number): string[] {
  const tier = Math.floor(floorNum / INFINITE_MODE.NEW_ENEMY_TIER_INTERVAL);
  const base = [...ENEMY_POOLS["easy"]];

  if (tier >= 1) base.push(...ENEMY_POOLS["medium"]);
  if (tier >= 2) base.push(...ENEMY_POOLS["hard"]);

  // At very high tiers, include even boss-tier regular enemies
  if (tier >= 4) {
    base.push("rogue_knight", "fire_elemental", "revenant_knight", "wyvern");
  }

  return base;
}

// ---------------------------------------------------------------------------
// Score Calculation
// ---------------------------------------------------------------------------

export function calculateFloorScore(state: GrailGameState, floorClearTimeMs: number): number {
  const floorNum = state.currentFloor;
  let score = INFINITE_MODE.SCORE_BASE_PER_FLOOR * (floorNum + 1);

  // Kill score
  score += state.totalKills * INFINITE_MODE.SCORE_KILL_MULT;

  // Speed bonus
  if (floorClearTimeMs < INFINITE_MODE.SPEED_BONUS_THRESHOLD_S * 1000) {
    score = Math.floor(score * INFINITE_MODE.SPEED_BONUS_MULT);
  }

  // Style bonus from kill streaks
  if (state.killStreakCount >= INFINITE_MODE.STYLE_BONUS_STREAK) {
    score = Math.floor(score * INFINITE_MODE.STYLE_BONUS_MULT);
  }

  return score;
}

export function calculateTotalScore(state: GrailGameState): number {
  return state.infiniteScore;
}

// ---------------------------------------------------------------------------
// Rest Floor Features
// ---------------------------------------------------------------------------

export function isRestFloor(floorNum: number): boolean {
  return floorNum > 0 && floorNum % INFINITE_MODE.REST_FLOOR_INTERVAL === 0;
}

export function getRestFloorShopPriceMultiplier(floorNum: number): number {
  // Shop prices increase with depth
  return 1 + Math.floor(floorNum / 10) * 0.25;
}
