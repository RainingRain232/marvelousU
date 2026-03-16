// AI difficulty configuration.
//
// Affects AI gold income multiplier and decision speed.
// Selected from the menu before starting a game.

import { CampaignDifficulty } from "@/types";

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

// ---------------------------------------------------------------------------
// Campaign difficulty tier system
// ---------------------------------------------------------------------------

export interface CampaignDifficultyModifiers {
  /** Multiplier for AI gold income (1.0 = normal). */
  aiGoldMultiplier: number;
  /** Bonus HP multiplier for AI units (0 = no bonus, 0.15 = +15%). */
  aiUnitHpBonus: number;
  /** Bonus ATK multiplier for AI units (0 = no bonus, 0.15 = +15%). */
  aiUnitAtkBonus: number;
  /** Cooldown rate multiplier for AI abilities (1.0 = normal, 1.2 = 20% faster). */
  aiAbilityCooldownRate: number;
  /** PREP phase duration override in seconds (0 = use default). */
  prepDurationOverride: number;
  /** Label for display. */
  label: string;
}

export const CAMPAIGN_DIFFICULTY_MODIFIERS: Record<CampaignDifficulty, CampaignDifficultyModifiers> = {
  [CampaignDifficulty.NORMAL]: {
    aiGoldMultiplier: 1.0,
    aiUnitHpBonus: 0,
    aiUnitAtkBonus: 0,
    aiAbilityCooldownRate: 1.0,
    prepDurationOverride: 0,
    label: "NORMAL",
  },
  [CampaignDifficulty.HARD]: {
    aiGoldMultiplier: 1.3,
    aiUnitHpBonus: 0.15,
    aiUnitAtkBonus: 0,
    aiAbilityCooldownRate: 1.2,
    prepDurationOverride: 0,
    label: "HARD",
  },
  [CampaignDifficulty.NIGHTMARE]: {
    aiGoldMultiplier: 1.6,
    aiUnitHpBonus: 0.30,
    aiUnitAtkBonus: 0.15,
    aiAbilityCooldownRate: 1.4,
    prepDurationOverride: 20,
    label: "NIGHTMARE",
  },
};

/** Current campaign difficulty tier. Set before starting a campaign game. */
let _currentCampaignDifficulty = CampaignDifficulty.NORMAL;

export function setCampaignDifficulty(d: CampaignDifficulty): void {
  _currentCampaignDifficulty = d;
}

export function getCampaignDifficulty(): CampaignDifficulty {
  return _currentCampaignDifficulty;
}

export function getCampaignDifficultyModifiers(): CampaignDifficultyModifiers {
  return CAMPAIGN_DIFFICULTY_MODIFIERS[_currentCampaignDifficulty];
}
