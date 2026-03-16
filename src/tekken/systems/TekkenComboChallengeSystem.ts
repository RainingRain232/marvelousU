// ---------------------------------------------------------------------------
// Tekken mode – Combo Challenge practice system
// Checks player input sequences against combo challenge definitions
// ---------------------------------------------------------------------------

import type { TekkenFighter } from "../state/TekkenState";
import type { ComboChallenge, ComboChallengeStep } from "../config/TekkenComboChallenges";
import { TEKKEN_CHARACTERS } from "../config/TekkenCharacterDefs";

export interface ComboChallengeState {
  /** Currently active challenge (null if none) */
  activeChallenge: ComboChallenge | null;
  /** Index of the next step the player needs to execute */
  currentStepIndex: number;
  /** Whether the current challenge was completed */
  completed: boolean;
  /** Number of times this challenge was completed in current session */
  completionCount: number;
  /** Timer for resetting after missed input */
  resetTimer: number;
  /** Last failed step index (for UI feedback) */
  lastFailedStep: number;
  /** Total damage dealt during current attempt */
  currentDamage: number;
}

export class TekkenComboChallengeSystem {
  private _state: ComboChallengeState = {
    activeChallenge: null,
    currentStepIndex: 0,
    completed: false,
    completionCount: 0,
    resetTimer: 0,
    lastFailedStep: -1,
    currentDamage: 0,
  };

  get state(): ComboChallengeState { return this._state; }

  /** Start a combo challenge */
  startChallenge(challenge: ComboChallenge): void {
    this._state = {
      activeChallenge: challenge,
      currentStepIndex: 0,
      completed: false,
      completionCount: 0,
      resetTimer: 0,
      lastFailedStep: -1,
      currentDamage: 0,
    };
  }

  /** Stop the current challenge */
  stopChallenge(): void {
    this._state.activeChallenge = null;
    this._state.currentStepIndex = 0;
    this._state.completed = false;
  }

  /** Reset the current attempt (keep the same challenge) */
  resetAttempt(): void {
    this._state.currentStepIndex = 0;
    this._state.completed = false;
    this._state.resetTimer = 0;
    this._state.lastFailedStep = -1;
    this._state.currentDamage = 0;
  }

  /**
   * Update the challenge system each frame.
   * Checks if the player's current move matches the expected step.
   */
  update(player: TekkenFighter): void {
    const challenge = this._state.activeChallenge;
    if (!challenge || this._state.completed) return;

    // Reset timer countdown
    if (this._state.resetTimer > 0) {
      this._state.resetTimer--;
      if (this._state.resetTimer <= 0) {
        this.resetAttempt();
      }
      return;
    }

    const stepIndex = this._state.currentStepIndex;
    if (stepIndex >= challenge.steps.length) return;

    const expectedStep = challenge.steps[stepIndex];

    // Check if player is currently executing the expected move
    if (player.currentMove && player.movePhase === "active") {
      const moveId = player.currentMove;
      if (this._moveMatchesStep(moveId, expectedStep, player.characterId)) {
        // Step matched
        this._state.currentStepIndex++;
        this._state.currentDamage = player.comboDamage;

        // Check completion
        if (this._state.currentStepIndex >= challenge.steps.length) {
          this._state.completed = true;
          this._state.completionCount++;
        }
      } else if (stepIndex > 0) {
        // Wrong move mid-combo: mark failure and schedule reset
        this._state.lastFailedStep = stepIndex;
        this._state.resetTimer = 60; // 1 second to reset
      }
    }

    // If the combo drops (player returns to neutral mid-challenge), reset
    if (stepIndex > 0 && player.comboCount === 0 && player.movePhase === "none") {
      this._state.lastFailedStep = stepIndex;
      this._state.resetTimer = 30;
    }
  }

  /** Check if a move ID matches a challenge step input */
  private _moveMatchesStep(moveId: string, step: ComboChallengeStep, characterId: string): boolean {
    // Direct ID match
    if (moveId === step.input) return true;

    // Resolve notation-style inputs (e.g., "d/f+1") to move IDs
    const resolvedId = this._resolveNotation(step.input, characterId);
    if (resolvedId && moveId === resolvedId) return true;

    return false;
  }

  /** Resolve a notation string like "d/f+1" to a move ID */
  private _resolveNotation(notation: string, characterId: string): string | null {
    const numToBtn: Record<string, string> = { "1": "lp", "2": "rp", "3": "lk", "4": "rk" };
    const charDef = TEKKEN_CHARACTERS.find(c => c.id === characterId);
    if (!charDef) return null;

    // Check bare number notation (e.g., "3" -> neutral + lk)
    if (/^[1-4]$/.test(notation)) {
      const btn = numToBtn[notation];
      for (const entry of charDef.moveList) {
        if (entry.input.length !== 1) continue;
        const cmd = entry.input[0];
        if (cmd.direction === "n" && cmd.buttons.length === 1 && cmd.buttons[0] === btn) {
          return entry.move.id;
        }
      }
      return null;
    }

    // Check direction+button notation (e.g., "d/f+1")
    const match = notation.match(/^(n|f|b|d|u|d\/f|d\/b|u\/f|u\/b)\+(.+)$/);
    if (match) {
      const dir = match[1];
      const btns = match[2].split("+").map(n => numToBtn[n] || n);
      for (const entry of charDef.moveList) {
        if (entry.input.length !== 1) continue;
        const cmd = entry.input[0];
        if (cmd.direction === dir &&
            cmd.buttons.length === btns.length &&
            cmd.buttons.every(b => btns.includes(b))) {
          return entry.move.id;
        }
      }
    }

    return null;
  }
}
