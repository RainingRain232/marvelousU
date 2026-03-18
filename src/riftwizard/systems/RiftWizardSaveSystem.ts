// Save/Load system for Rift Wizard — persists game state to localStorage

import type { RiftWizardState } from "../state/RiftWizardState";
import { createRunStats } from "./RiftWizardRunStats";

const SAVE_KEY = "rift_wizard_save";
const SETTINGS_KEY = "rift_wizard_settings";

export interface RWSettings {
  musicVolume: number;
  sfxVolume: number;
  showMinimap: boolean;
  showCombatLog: boolean;
  screenShake: boolean;
}

const DEFAULT_SETTINGS: RWSettings = {
  musicVolume: 0.7,
  sfxVolume: 0.8,
  showMinimap: true,
  showCombatLog: true,
  screenShake: true,
};

/** Save the current game state to localStorage */
export function saveGame(state: RiftWizardState): boolean {
  // Serialize the state - need to handle only serializable data
  // Create a clean copy without any non-serializable refs
  try {
    const saveData = {
      version: 1,
      timestamp: Date.now(),
      state: serializeState(state),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
    return true;
  } catch (e) {
    console.warn("Failed to save game:", e);
    return false;
  }
}

/** Load game state from localStorage, returns null if no save */
export function loadGame(): Partial<RiftWizardState> | null {
  // Return the saved state data or null
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const saveData = JSON.parse(raw);
    if (!saveData || saveData.version !== 1) return null;
    const state = saveData.state as Partial<RiftWizardState>;
    // Ensure runStats has all fields by merging with defaults (handles old saves missing new fields)
    if (state.runStats) {
      state.runStats = { ...createRunStats(), ...state.runStats };
    }
    return state;
  } catch (e) {
    console.warn("Failed to load game:", e);
    return null;
  }
}

/** Check if a save exists */
export function hasSave(): boolean {
  return localStorage.getItem(SAVE_KEY) !== null;
}

/** Delete saved game */
export function deleteSave(): void {
  localStorage.removeItem(SAVE_KEY);
}

/** Get save metadata without loading full state */
export function getSaveInfo(): { timestamp: number; level: number; hp: number } | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const saveData = JSON.parse(raw);
    if (!saveData?.state) return null;
    return {
      timestamp: saveData.timestamp,
      level: saveData.state.currentLevel ?? 0,
      hp: saveData.state.wizard?.hp ?? 0,
    };
  } catch {
    return null;
  }
}

/** Save settings */
export function saveSettings(settings: RWSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn("Failed to save settings:", e);
  }
}

/** Load settings */
export function loadSettings(): RWSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

// Internal serialization helper - strips out anything non-serializable
function serializeState(state: RiftWizardState): Record<string, unknown> {
  // Deep clone via JSON round-trip, which naturally strips functions/symbols.
  // RWRunStats is all plain data (numbers, Records, startTime timestamp),
  // so JSON round-trip preserves it correctly including startTime.
  // The animationQueue can be dropped since it's transient.
  const clone = JSON.parse(JSON.stringify(state));
  // Clear transient data
  if (clone.animationQueue) clone.animationQueue = [];
  // Ensure runStats is explicitly included in the serialized output
  if (state.runStats) {
    clone.runStats = JSON.parse(JSON.stringify(state.runStats));
  }
  return clone;
}
