// Campaign progress state — persisted to localStorage.
// Tracks which scenarios are unlocked, which units/buildings/races/leaders
// the player has earned, and the last chosen loadout (race, leader) so
// "Return to Campaign" can restore it.

import {
  SCENARIO_DEFINITIONS,
  getScenarioByCode,
  type ScenarioUnlocks,
} from "@sim/config/CampaignDefs";
import type { ScenarioDef } from "@sim/config/CampaignDefs";
import { UnitType, BuildingType } from "@/types";
import type { RaceId } from "@sim/config/RaceDefs";
import type { LeaderId } from "@sim/config/LeaderDefs";

const STORAGE_KEY = "campaign_progress_v1";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CampaignProgress {
  /** Set of unlocked scenario numbers (always includes 1). */
  unlockedScenarios: number[];
  /** Set of unit types the player may use in campaign games. */
  unlockedUnits: UnitType[];
  /** Set of building types the player may build (castle blueprints are filtered). */
  unlockedBuildings: BuildingType[];
  /** Set of race IDs available on the race select screen. */
  unlockedRaces: RaceId[];
  /** Set of leader IDs available on the leader select screen. */
  unlockedLeaders: LeaderId[];
  /** Last selected scenario number (for "Return to Campaign" UX). */
  lastScenario: number;
}

// ---------------------------------------------------------------------------
// Initial state — scenario 1 unlocked, only swordsman available
// ---------------------------------------------------------------------------

function _defaultProgress(): CampaignProgress {
  return {
    unlockedScenarios: [1],
    unlockedUnits: [UnitType.SWORDSMAN],
    unlockedBuildings: [],
    unlockedRaces: [],
    unlockedLeaders: [],
    lastScenario: 1,
  };
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

function _load(): CampaignProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CampaignProgress;
      // Ensure scenario 1 is always unlocked and swordsman always available
      if (!parsed.unlockedScenarios.includes(1)) parsed.unlockedScenarios.push(1);
      if (!parsed.unlockedUnits.includes(UnitType.SWORDSMAN))
        parsed.unlockedUnits.push(UnitType.SWORDSMAN);
      return parsed;
    }
  } catch {
    // corrupted storage — reset
  }
  return _defaultProgress();
}

function _save(progress: CampaignProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // storage unavailable — ignore
  }
}

// ---------------------------------------------------------------------------
// CampaignState class
// ---------------------------------------------------------------------------

export class CampaignState {
  private _progress: CampaignProgress;

  constructor() {
    this._progress = _load();
  }

  // ---------------------------------------------------------------------------
  // Read accessors
  // ---------------------------------------------------------------------------

  get unlockedScenarios(): number[] {
    return [...this._progress.unlockedScenarios];
  }

  get unlockedUnits(): UnitType[] {
    return [...this._progress.unlockedUnits];
  }

  get unlockedBuildings(): BuildingType[] {
    return [...this._progress.unlockedBuildings];
  }

  get unlockedRaces(): RaceId[] {
    return [...this._progress.unlockedRaces];
  }

  get unlockedLeaders(): LeaderId[] {
    return [...this._progress.unlockedLeaders];
  }

  get lastScenario(): number {
    return this._progress.lastScenario;
  }

  isScenarioUnlocked(number: number): boolean {
    return this._progress.unlockedScenarios.includes(number);
  }

  isUnitUnlocked(type: UnitType): boolean {
    return this._progress.unlockedUnits.includes(type);
  }

  isBuildingUnlocked(type: BuildingType): boolean {
    return this._progress.unlockedBuildings.includes(type);
  }

  isRaceUnlocked(id: RaceId): boolean {
    return this._progress.unlockedRaces.includes(id);
  }

  isLeaderUnlocked(id: LeaderId): boolean {
    return this._progress.unlockedLeaders.includes(id);
  }

  /** Return the scenario def for the given number, or undefined. */
  getScenario(number: number): ScenarioDef | undefined {
    return SCENARIO_DEFINITIONS.find((s) => s.number === number);
  }

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  setLastScenario(number: number): void {
    this._progress.lastScenario = number;
    _save(this._progress);
  }

  /**
   * Apply a victory: grant unlocks from the completed scenario and
   * unlock the next scenario.
   */
  applyVictory(scenarioNumber: number): void {
    const scenario = this.getScenario(scenarioNumber);
    if (!scenario) return;
    this._applyUnlocks(scenario.unlocks);
    // Unlock next scenario
    const nextNum = scenarioNumber + 1;
    if (
      nextNum <= SCENARIO_DEFINITIONS.length &&
      !this._progress.unlockedScenarios.includes(nextNum)
    ) {
      this._progress.unlockedScenarios.push(nextNum);
    }
    _save(this._progress);
  }

  /**
   * Try to redeem a 4-digit code. Returns the scenario that was unlocked,
   * or null if the code is invalid or already redeemed.
   */
  redeemCode(code: string): ScenarioDef | null {
    const scenario = getScenarioByCode(code.trim());
    if (!scenario) return null;

    // The code unlocks the NEXT scenario (it's the victory code from the previous one)
    // Find which scenario this code belongs to
    const sourceScenario = scenario; // the one that HAS this victoryCode
    const nextNum = sourceScenario.number + 1;

    let changed = false;

    // Apply the source scenario's unlocks if not already done
    // (allow partial re-application — only add what's missing)
    const u = sourceScenario.unlocks;
    if (u.units) {
      for (const t of u.units) {
        if (!this._progress.unlockedUnits.includes(t)) {
          this._progress.unlockedUnits.push(t);
          changed = true;
        }
      }
    }
    if (u.buildings) {
      for (const b of u.buildings) {
        if (!this._progress.unlockedBuildings.includes(b)) {
          this._progress.unlockedBuildings.push(b);
          changed = true;
        }
      }
    }
    if (u.races) {
      for (const r of u.races) {
        if (!this._progress.unlockedRaces.includes(r)) {
          this._progress.unlockedRaces.push(r);
          changed = true;
        }
      }
    }
    if (u.leaders) {
      for (const l of u.leaders) {
        if (!this._progress.unlockedLeaders.includes(l)) {
          this._progress.unlockedLeaders.push(l);
          changed = true;
        }
      }
    }

    // Unlock the source scenario itself (so the player can replay it)
    if (!this._progress.unlockedScenarios.includes(sourceScenario.number)) {
      this._progress.unlockedScenarios.push(sourceScenario.number);
      changed = true;
    }

    // Unlock next scenario
    if (
      nextNum <= SCENARIO_DEFINITIONS.length &&
      !this._progress.unlockedScenarios.includes(nextNum)
    ) {
      this._progress.unlockedScenarios.push(nextNum);
      changed = true;
    }

    if (changed) _save(this._progress);
    return sourceScenario;
  }

  /** Reset all campaign progress back to default. */
  reset(): void {
    this._progress = _defaultProgress();
    _save(this._progress);
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private _applyUnlocks(unlocks: ScenarioUnlocks): void {
    for (const t of unlocks.units ?? []) {
      if (!this._progress.unlockedUnits.includes(t)) this._progress.unlockedUnits.push(t);
    }
    for (const b of unlocks.buildings ?? []) {
      if (!this._progress.unlockedBuildings.includes(b))
        this._progress.unlockedBuildings.push(b);
    }
    for (const r of unlocks.races ?? []) {
      if (!this._progress.unlockedRaces.includes(r)) this._progress.unlockedRaces.push(r);
    }
    for (const l of unlocks.leaders ?? []) {
      if (!this._progress.unlockedLeaders.includes(l))
        this._progress.unlockedLeaders.push(l);
    }
  }
}

// Singleton — import this wherever campaign progress is needed.
export const campaignState = new CampaignState();
