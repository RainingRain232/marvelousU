// ---------------------------------------------------------------------------
// Rift Wizard mode – leaderboard persistence via localStorage
// ---------------------------------------------------------------------------

import type { RWRunStats } from "./RiftWizardRunStats";

export interface LeaderboardEntry {
  score: number;
  floorsCleared: number;
  enemiesKilled: number;
  difficulty: string;
  seed: number;
  date: number;
  duration: string;
  spellsLearned: number;
  won: boolean;
}

const LEADERBOARD_KEY = "rift_wizard_leaderboard";
const MAX_ENTRIES = 20;

/** Save a new score entry to the leaderboard */
export function saveScore(entry: LeaderboardEntry): void {
  const board = getLeaderboard();
  board.push(entry);

  // Sort by floorsCleared descending, then score descending
  board.sort((a, b) => {
    if (b.floorsCleared !== a.floorsCleared) return b.floorsCleared - a.floorsCleared;
    return b.score - a.score;
  });

  // Trim to max entries
  if (board.length > MAX_ENTRIES) {
    board.length = MAX_ENTRIES;
  }

  try {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(board));
  } catch (e) {
    console.warn("Failed to save leaderboard:", e);
  }
}

/** Load the leaderboard from localStorage, sorted */
export function getLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    if (!raw) return [];
    const board = JSON.parse(raw) as LeaderboardEntry[];
    if (!Array.isArray(board)) return [];

    // Ensure sorted order
    board.sort((a, b) => {
      if (b.floorsCleared !== a.floorsCleared) return b.floorsCleared - a.floorsCleared;
      return b.score - a.score;
    });
    return board;
  } catch {
    return [];
  }
}

/** Clear all leaderboard data */
export function clearLeaderboard(): void {
  localStorage.removeItem(LEADERBOARD_KEY);
}

/** Compute a final score from run statistics */
export function computeScore(stats: RWRunStats, floorsCleared: number, won: boolean): number {
  return (
    stats.enemiesKilled * 10 +
    floorsCleared * 100 +
    (won ? 5000 : 0) +
    stats.totalDamageDealt
  );
}
