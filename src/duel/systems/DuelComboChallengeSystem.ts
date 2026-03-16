// ---------------------------------------------------------------------------
// Duel mode – combo challenge system (tracks player input vs preset combos)
// ---------------------------------------------------------------------------

import type { DuelComboChallenge } from "../config/DuelComboChallenges";
import { DUEL_COMBO_CHALLENGES } from "../config/DuelComboChallenges";

// ---- Challenge state --------------------------------------------------------

export interface DuelComboChallengeState {
  characterId: string;
  challengeIndex: number;
  /** Current progress through the sequence */
  sequenceIndex: number;
  /** Whether the current challenge is complete */
  completed: boolean;
  /** All completed challenge IDs (persisted) */
  completedChallenges: Set<string>;
  /** Timestamp of last successful input */
  lastInputFrame: number;
  /** Max frames allowed between combo inputs before reset */
  inputTimeout: number;
  /** Whether challenge mode is active */
  active: boolean;
}

export function createComboChallengeState(characterId: string): DuelComboChallengeState {
  return {
    characterId,
    challengeIndex: 0,
    sequenceIndex: 0,
    completed: false,
    completedChallenges: new Set(),
    lastInputFrame: 0,
    inputTimeout: 90, // 1.5 seconds at 60fps
    active: false,
  };
}

// ---- System -----------------------------------------------------------------

export const DuelComboChallengeSystem = {
  /** Get the current challenge definition. */
  getCurrentChallenge(challengeState: DuelComboChallengeState): DuelComboChallenge | null {
    const charCombos = DUEL_COMBO_CHALLENGES[challengeState.characterId];
    if (!charCombos) return null;
    return charCombos.challenges[challengeState.challengeIndex] ?? null;
  },

  /** Check if a move matches the next expected input in the combo sequence.
   *  Call this when P1 starts a new move in training/challenge mode. */
  onMoveExecuted(
    challengeState: DuelComboChallengeState,
    moveId: string,
    frameCount: number,
  ): ComboChallengeResult {
    if (!challengeState.active || challengeState.completed) {
      return { status: "inactive" };
    }

    const challenge = this.getCurrentChallenge(challengeState);
    if (!challenge) return { status: "inactive" };

    // Check for timeout (too long between inputs -> reset)
    if (
      challengeState.sequenceIndex > 0 &&
      frameCount - challengeState.lastInputFrame > challengeState.inputTimeout
    ) {
      challengeState.sequenceIndex = 0;
    }

    const expectedMove = challenge.sequence[challengeState.sequenceIndex];

    if (moveId === expectedMove) {
      // Correct input!
      challengeState.sequenceIndex++;
      challengeState.lastInputFrame = frameCount;

      if (challengeState.sequenceIndex >= challenge.sequence.length) {
        // Challenge complete!
        challengeState.completed = true;
        challengeState.completedChallenges.add(challenge.id);
        return {
          status: "complete",
          challengeId: challenge.id,
          reward: challenge.reward,
        };
      }

      return {
        status: "progress",
        current: challengeState.sequenceIndex,
        total: challenge.sequence.length,
      };
    } else {
      // Wrong input — reset sequence
      challengeState.sequenceIndex = 0;

      // Check if the wrong input happens to be the first in the sequence
      if (moveId === challenge.sequence[0]) {
        challengeState.sequenceIndex = 1;
        challengeState.lastInputFrame = frameCount;
        return {
          status: "progress",
          current: 1,
          total: challenge.sequence.length,
        };
      }

      return { status: "reset" };
    }
  },

  /** Advance to the next challenge for this character. */
  nextChallenge(challengeState: DuelComboChallengeState): boolean {
    const charCombos = DUEL_COMBO_CHALLENGES[challengeState.characterId];
    if (!charCombos) return false;

    if (challengeState.challengeIndex < charCombos.challenges.length - 1) {
      challengeState.challengeIndex++;
      challengeState.sequenceIndex = 0;
      challengeState.completed = false;
      return true;
    }
    return false;
  },

  /** Go to the previous challenge. */
  prevChallenge(challengeState: DuelComboChallengeState): boolean {
    if (challengeState.challengeIndex > 0) {
      challengeState.challengeIndex--;
      challengeState.sequenceIndex = 0;
      challengeState.completed = false;
      return true;
    }
    return false;
  },

  /** Reset the current challenge attempt. */
  resetChallenge(challengeState: DuelComboChallengeState): void {
    challengeState.sequenceIndex = 0;
    challengeState.completed = false;
    challengeState.lastInputFrame = 0;
  },

  /** Get total challenges and completed count for a character. */
  getProgress(challengeState: DuelComboChallengeState): { total: number; completed: number } {
    const charCombos = DUEL_COMBO_CHALLENGES[challengeState.characterId];
    if (!charCombos) return { total: 0, completed: 0 };

    let completed = 0;
    for (const ch of charCombos.challenges) {
      if (challengeState.completedChallenges.has(ch.id)) completed++;
    }
    return { total: charCombos.challenges.length, completed };
  },
};

export type ComboChallengeResult =
  | { status: "inactive" }
  | { status: "progress"; current: number; total: number }
  | { status: "complete"; challengeId: string; reward: string }
  | { status: "reset" };
