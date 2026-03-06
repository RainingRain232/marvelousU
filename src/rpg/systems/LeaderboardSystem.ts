const LEADERBOARD_KEY = "rpg_leaderboards";

export interface LeaderboardEntry {
  name: string;
  value: number;
  timestamp: number;
}

export interface Leaderboards {
  abyssDepth: LeaderboardEntry[];
  highestLevel: LeaderboardEntry[];
  mostGold: LeaderboardEntry[];
  fastestBossKill: LeaderboardEntry[];
}

function _load(): Leaderboards {
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { abyssDepth: [], highestLevel: [], mostGold: [], fastestBossKill: [] };
}

function _save(boards: Leaderboards): void {
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(boards));
}

/** Submit a score to a leaderboard category. Keeps top 10. */
export function submitScore(
  category: keyof Leaderboards,
  name: string,
  value: number,
): void {
  const boards = _load();
  boards[category].push({ name, value, timestamp: Date.now() });
  boards[category].sort((a, b) => b.value - a.value);
  boards[category] = boards[category].slice(0, 10);
  _save(boards);
}

/** Get top scores for a category */
export function getLeaderboard(category: keyof Leaderboards): LeaderboardEntry[] {
  return _load()[category];
}

/** Get all leaderboards */
export function getAllLeaderboards(): Leaderboards {
  return _load();
}
