// ---------------------------------------------------------------------------
// Round Table – Meta Progression System
// ---------------------------------------------------------------------------

import { RTRunState, RTMetaState, KnightId } from "../types";
import { loadMetaState, saveMetaState } from "../state/RoundTableState";
import { RT_BALANCE } from "../config/RoundTableBalance";

export const RoundTableMetaSystem = {

  /** Called when a run ends. Update meta stats. */
  endRun(run: RTRunState, won: boolean): RTMetaState {
    const meta = loadMetaState();

    meta.totalRuns++;
    meta.totalGold += run.gold;

    // Score
    let score = run.score;
    if (won) score += RT_BALANCE.SCORE_WIN_BONUS;
    score += Math.abs(run.purity - 50) * RT_BALANCE.SCORE_PER_PURITY_POINT;
    score = Math.floor(score * (1 + run.ascension * RT_BALANCE.SCORE_ASCENSION_MULTIPLIER));

    if (score > meta.bestScore) meta.bestScore = score;

    if (won) {
      meta.totalWins++;
      // Unlock next ascension for this knight
      const currentAsc = meta.ascensionPerKnight[run.knightId] ?? 0;
      if (run.ascension >= currentAsc) {
        meta.ascensionPerKnight[run.knightId] = Math.min(20, run.ascension + 1);
      }

      // Unlock knights based on wins
      if (meta.totalWins >= 1 && !meta.unlockedKnights.includes(KnightId.GAWAIN)) {
        meta.unlockedKnights.push(KnightId.GAWAIN);
      }
      if (meta.totalWins >= 3 && !meta.unlockedKnights.includes(KnightId.MORGAUSE)) {
        meta.unlockedKnights.push(KnightId.MORGAUSE);
      }
      if (meta.totalWins >= 5 && !meta.unlockedKnights.includes(KnightId.TRISTAN)) {
        meta.unlockedKnights.push(KnightId.TRISTAN);
      }
    }

    saveMetaState(meta);
    return meta;
  },

  /** Get the max ascension unlocked for a knight. */
  getMaxAscension(knightId: KnightId): number {
    const meta = loadMetaState();
    return meta.ascensionPerKnight[knightId] ?? 0;
  },

  /** Check if a knight is unlocked. */
  isKnightUnlocked(knightId: KnightId): boolean {
    const meta = loadMetaState();
    return meta.unlockedKnights.includes(knightId);
  },

  /** Get current meta state. */
  getMeta(): RTMetaState {
    return loadMetaState();
  },
};
