// Colosseum persistent data — localStorage save/load
// Follows the SurvivorPersistence pattern exactly.

import type { PartyMember } from "@rpg/state/RPGState";

const STORAGE_KEY = "marvelousU_colosseum";

// ---------------------------------------------------------------------------
// Data types
// ---------------------------------------------------------------------------

export interface ColosseumSaveData {
  gold: number;
  elo: number;
  season: number;
  seasonWins: number;
  seasonLosses: number;
  tournamentsWon: number;
  tournamentsPlayed: number;
  savedParty: PartyMember[];
  savedFormation: Record<string, 1 | 2>;
  highScores: ColosseumHighScore[];
}

export interface ColosseumHighScore {
  elo: number;
  tournamentsWon: number;
  season: number;
  date: number;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_SAVE: ColosseumSaveData = {
  gold: 500,
  elo: 1000,
  season: 1,
  seasonWins: 0,
  seasonLosses: 0,
  tournamentsWon: 0,
  tournamentsPlayed: 0,
  savedParty: [],
  savedFormation: {},
  highScores: [],
};

const MAX_HIGH_SCORES = 10;

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

export const ColosseumPersistence = {
  load(): ColosseumSaveData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_SAVE, savedParty: [], savedFormation: {}, highScores: [] };
      const data = JSON.parse(raw) as Partial<ColosseumSaveData>;
      return {
        gold: data.gold ?? DEFAULT_SAVE.gold,
        elo: data.elo ?? DEFAULT_SAVE.elo,
        season: data.season ?? DEFAULT_SAVE.season,
        seasonWins: data.seasonWins ?? 0,
        seasonLosses: data.seasonLosses ?? 0,
        tournamentsWon: data.tournamentsWon ?? 0,
        tournamentsPlayed: data.tournamentsPlayed ?? 0,
        savedParty: data.savedParty ?? [],
        savedFormation: data.savedFormation ?? {},
        highScores: data.highScores ?? [],
      };
    } catch {
      return { ...DEFAULT_SAVE, savedParty: [], savedFormation: {}, highScores: [] };
    }
  },

  save(data: ColosseumSaveData): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Ignore quota errors
    }
  },

  addGold(amount: number): number {
    const data = this.load();
    data.gold += amount;
    this.save(data);
    return data.gold;
  },

  updateElo(newElo: number): void {
    const data = this.load();
    data.elo = newElo;
    this.save(data);
  },

  addHighScore(entry: ColosseumHighScore): void {
    const data = this.load();
    data.highScores.push(entry);
    data.highScores.sort((a, b) => b.elo - a.elo);
    data.highScores = data.highScores.slice(0, MAX_HIGH_SCORES);
    this.save(data);
  },
};
