// AI difficulty configuration.
//
// Affects AI gold income multiplier and decision speed.
// Selected from the menu before starting a game.

export enum Difficulty {
  EASY = "easy",
  NORMAL = "normal",
  HARD = "hard",
  BRUTAL = "brutal",
}

export interface DifficultySettings {
  label: string;
  /** Gold income multiplier for AI players (1.0 = no bonus). */
  aiGoldMultiplier: number;
  /** AI starting gold multiplier. */
  aiStartGoldMultiplier: number;
  /** AI decision interval multiplier (lower = faster decisions). */
  aiSpeedMultiplier: number;
}

export const DIFFICULTY_SETTINGS: Record<Difficulty, DifficultySettings> = {
  [Difficulty.EASY]: {
    label: "EASY",
    aiGoldMultiplier: 0.7,
    aiStartGoldMultiplier: 0.7,
    aiSpeedMultiplier: 1.5,
  },
  [Difficulty.NORMAL]: {
    label: "NORMAL",
    aiGoldMultiplier: 1.0,
    aiStartGoldMultiplier: 1.0,
    aiSpeedMultiplier: 1.0,
  },
  [Difficulty.HARD]: {
    label: "HARD",
    aiGoldMultiplier: 1.4,
    aiStartGoldMultiplier: 1.3,
    aiSpeedMultiplier: 0.7,
  },
  [Difficulty.BRUTAL]: {
    label: "BRUTAL",
    aiGoldMultiplier: 2.0,
    aiStartGoldMultiplier: 1.6,
    aiSpeedMultiplier: 0.5,
  },
};

/** Current active difficulty. Set before starting a game. */
let _currentDifficulty = Difficulty.NORMAL;

export function setDifficulty(d: Difficulty): void {
  _currentDifficulty = d;
}

export function getDifficulty(): Difficulty {
  return _currentDifficulty;
}

export function getDifficultySettings(): DifficultySettings {
  return DIFFICULTY_SETTINGS[_currentDifficulty];
}
