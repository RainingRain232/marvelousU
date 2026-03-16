// ---------------------------------------------------------------------------
// Quest for the Grail — Daily Challenge System
// A date-seeded dungeon run that is identical for all players on the same day.
// Includes a leaderboard with local persistence.
// ---------------------------------------------------------------------------

import { generateFloor } from "./GameDungeonGenerator";
import { getFloorParams, QUEST_GENRE_DEFS } from "../config/GameConfig";
import type { QuestGenreDef, FloorParams } from "../config/GameConfig";
import type { FloorState, GrailGameState } from "../state/GameState";

// ---------------------------------------------------------------------------
// Seed generation
// ---------------------------------------------------------------------------

/**
 * Generate a deterministic seed from a date string (YYYY-MM-DD).
 * The same date always produces the same seed.
 */
export function dateSeed(dateStr?: string): number {
  const d = dateStr ?? new Date().toISOString().slice(0, 10);
  let hash = 0;
  for (let i = 0; i < d.length; i++) {
    hash = ((hash << 5) - hash + d.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Get today's date string in YYYY-MM-DD format.
 */
export function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Daily Challenge Config
// ---------------------------------------------------------------------------

export interface DailyChallengeConfig {
  /** The date of the challenge (YYYY-MM-DD). */
  date: string;
  /** Deterministic seed for generation. */
  seed: number;
  /** Number of floors. */
  totalFloors: number;
  /** The genre for this daily run. */
  genre: QuestGenreDef;
  /** Modifiers description (textual, for display). */
  modifiers: DailyModifier[];
}

export interface DailyModifier {
  id: string;
  name: string;
  description: string;
}

/** Available daily modifiers — one or two are picked each day. */
const DAILY_MODIFIERS: DailyModifier[] = [
  { id: "dm_no_shops", name: "No Merchants", description: "Shops do not appear on any floor." },
  { id: "dm_double_enemies", name: "Double Trouble", description: "Twice as many enemies spawn." },
  { id: "dm_glass_cannon", name: "Glass Cannon", description: "Deal +50% damage but take +50% damage." },
  { id: "dm_fog_of_war", name: "Thick Fog", description: "Vision radius reduced to 2 tiles." },
  { id: "dm_speed_run", name: "Speed Demon", description: "Bonus score for completing floors quickly." },
  { id: "dm_no_healing", name: "No Rest", description: "Health potions are disabled." },
  { id: "dm_treasure_hunt", name: "Treasure Hunt", description: "Extra treasure rooms, but enemies guard them." },
  { id: "dm_ironman", name: "Ironman", description: "Death is permanent — no second chances." },
];

// ---------------------------------------------------------------------------
// Seeded RNG (simple, self-contained for daily challenge)
// ---------------------------------------------------------------------------

function seededRand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

// ---------------------------------------------------------------------------
// Generate Daily Challenge Config
// ---------------------------------------------------------------------------

/**
 * Build the daily challenge configuration for a given date.
 * Deterministic: same date = same config.
 */
export function getDailyChallengeConfig(date?: string): DailyChallengeConfig {
  const dateStr = date ?? todayString();
  const seed = dateSeed(dateStr);
  const rand = seededRand(seed);

  // Pick genre deterministically
  const genreIdx = Math.floor(rand() * QUEST_GENRE_DEFS.length);
  const genre = QUEST_GENRE_DEFS[genreIdx];

  // Pick 1-2 modifiers
  const modCount = rand() < 0.5 ? 1 : 2;
  const modPool = [...DAILY_MODIFIERS];
  const modifiers: DailyModifier[] = [];
  for (let i = 0; i < modCount && modPool.length > 0; i++) {
    const idx = Math.floor(rand() * modPool.length);
    modifiers.push(modPool[idx]);
    modPool.splice(idx, 1);
  }

  return {
    date: dateStr,
    seed,
    totalFloors: 6,
    genre,
    modifiers,
  };
}

// ---------------------------------------------------------------------------
// Generate a daily challenge floor (uses the date seed + floor number)
// ---------------------------------------------------------------------------

export function generateDailyFloor(
  config: DailyChallengeConfig,
  floorNum: number,
  enemyIdStart: number,
): FloorState {
  // Override Math.random temporarily with seeded version for deterministic generation
  const floorSeed = config.seed + floorNum * 7919; // Offset per floor
  const rand = seededRand(floorSeed);
  const origRandom = Math.random;
  Math.random = rand;

  try {
    const params = getFloorParams(floorNum, config.totalFloors);
    return generateFloor(floorNum, params, config.genre, enemyIdStart);
  } finally {
    Math.random = origRandom;
  }
}

// ---------------------------------------------------------------------------
// Leaderboard
// ---------------------------------------------------------------------------

export interface DailyLeaderboardEntry {
  /** Player display name. */
  name: string;
  /** Knight used. */
  knightId: string;
  /** Final score. */
  score: number;
  /** Deepest floor reached. */
  floorsCleared: number;
  /** Total kills. */
  kills: number;
  /** Run duration in ms. */
  durationMs: number;
  /** Date of the challenge. */
  date: string;
  /** Timestamp when submitted. */
  timestamp: number;
}

const DAILY_LB_KEY = "grailquest_daily_leaderboard";

/**
 * Load the daily leaderboard from local storage.
 * Returns entries for the given date, sorted by score descending.
 */
export function loadDailyLeaderboard(date?: string): DailyLeaderboardEntry[] {
  const dateStr = date ?? todayString();
  try {
    const raw = localStorage.getItem(DAILY_LB_KEY);
    if (!raw) return [];
    const all: DailyLeaderboardEntry[] = JSON.parse(raw);
    return all
      .filter(e => e.date === dateStr)
      .sort((a, b) => b.score - a.score);
  } catch {
    return [];
  }
}

/**
 * Submit a score to the daily leaderboard.
 */
export function submitDailyScore(entry: DailyLeaderboardEntry): void {
  try {
    const raw = localStorage.getItem(DAILY_LB_KEY);
    const all: DailyLeaderboardEntry[] = raw ? JSON.parse(raw) : [];

    all.push(entry);

    // Keep only last 7 days of entries, max 50 per day
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const filtered = all.filter(e => e.timestamp > cutoff);

    localStorage.setItem(DAILY_LB_KEY, JSON.stringify(filtered));
  } catch { /* ignore storage errors */ }
}

/**
 * Calculate the daily challenge score from game state.
 */
export function calculateDailyScore(state: GrailGameState): number {
  let score = 0;

  // Base score from kills
  score += state.totalKills * 100;

  // Floor progress bonus
  score += state.currentFloor * 500;

  // Gold collected bonus
  score += state.totalGold * 2;

  // Speed bonus (faster = more points, up to 600 seconds)
  const elapsedSec = (Date.now() - state.startTime) / 1000;
  const speedBonus = Math.max(0, Math.floor((600 - elapsedSec) * 5));
  score += speedBonus;

  // Level bonus
  score += state.player.level * 200;

  // Kill streak bonus
  score += state.killStreakCount * 50;

  // Boss kills bonus
  score += state.killedBosses.length * 1000;

  // Relic bonus
  score += state.foundRelics.length * 300;

  return score;
}

/**
 * Check if the player has already submitted a score for today.
 */
export function hasSubmittedToday(playerName: string): boolean {
  const today = todayString();
  const board = loadDailyLeaderboard(today);
  return board.some(e => e.name === playerName);
}
