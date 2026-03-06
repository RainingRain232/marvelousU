// Save/Load system using localStorage
import type { RPGState, ActiveBlessing } from "@rpg/state/RPGState";
import type { OverworldState } from "@rpg/state/OverworldState";

const SAVE_KEY_PREFIX = "rpg_save_";
const SAVE_META_KEY = "rpg_save_meta";
const MAX_SLOTS = 4;
const AUTO_SAVE_SLOT = 3;

// ---------------------------------------------------------------------------
// Save metadata (for showing slot info in menus)
// ---------------------------------------------------------------------------

export interface SaveSlotMeta {
  slot: number;
  timestamp: number;
  partyLevel: number;
  gold: number;
  playtime: number;
  location: string;
}

// ---------------------------------------------------------------------------
// Serializable save data
// ---------------------------------------------------------------------------

interface SaveData {
  rpgState: SerializedRPGState;
  overworldSeed: number;
  version: number;
}

interface SerializedRPGState {
  party: RPGState["party"];
  inventory: RPGState["inventory"];
  quests: RPGState["quests"];
  gold: number;
  overworldPosition: RPGState["overworldPosition"];
  currentDungeonId: string | null;
  currentFloor: number;
  dungeonPosition: RPGState["dungeonPosition"];
  visitedDungeons: string[];
  completedQuests: string[];
  gameTime: number;
  battleMode: "turn" | "auto";
  seed: number;
  stepsSinceLastTown: number;
  recruitSeed: number;
  formation: Record<string, 1 | 2>;
  metLeaders: string[];
  leaderBlessings: ActiveBlessing[];
  // Narrative
  mainQuestStep: number;
  collectedLore: string[];
  townReputation: Record<string, number>;
  karma: number;
  // World
  timeOfDay: number;
  weather: "clear" | "rain" | "snow" | "fog";
  weatherTimer: number;
  discoveredTowns: string[];
  // Party Identity
  affinity: Record<string, Record<string, number>>;
  hiredUniqueRecruits: string[];
  // QoL
  bestiary: RPGState["bestiary"];
  achievements: string[];
  difficulty: "easy" | "normal" | "hard";
  tutorialFlags: Record<string, boolean>;
  battleSpeed: 1 | 2 | 4;
  // Endgame
  ngPlusCount: number;
  abyssRecord: number;
  // Economy
  townPurchases: Record<string, number>;
  arenaFightsLeft: number;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getSaveSlots(): (SaveSlotMeta | null)[] {
  try {
    const raw = localStorage.getItem(SAVE_META_KEY);
    if (!raw) return Array(MAX_SLOTS).fill(null);
    const meta: (SaveSlotMeta | null)[] = JSON.parse(raw);
    while (meta.length < MAX_SLOTS) meta.push(null);
    return meta.slice(0, MAX_SLOTS);
  } catch {
    return Array(MAX_SLOTS).fill(null);
  }
}

export function hasSaveData(): boolean {
  return getSaveSlots().some(s => s !== null);
}

export function saveGame(
  slot: number,
  rpgState: RPGState,
  _overworldState: OverworldState,
): boolean {
  if (slot < 0 || slot >= MAX_SLOTS) return false;

  try {
    const data: SaveData = {
      rpgState: _serializeRPGState(rpgState),
      overworldSeed: rpgState.seed,
      version: 1,
    };

    localStorage.setItem(SAVE_KEY_PREFIX + slot, JSON.stringify(data));

    // Update metadata
    const slots = getSaveSlots();
    const avgLevel = rpgState.party.length > 0
      ? Math.round(rpgState.party.reduce((sum, m) => sum + m.level, 0) / rpgState.party.length)
      : 1;

    slots[slot] = {
      slot,
      timestamp: Date.now(),
      partyLevel: avgLevel,
      gold: rpgState.gold,
      playtime: rpgState.gameTime,
      location: rpgState.currentDungeonId ? "Dungeon" : "Overworld",
    };

    localStorage.setItem(SAVE_META_KEY, JSON.stringify(slots));
    return true;
  } catch {
    return false;
  }
}

export function loadGame(slot: number): { rpgState: SerializedRPGState; seed: number } | null {
  if (slot < 0 || slot >= MAX_SLOTS) return null;

  try {
    const raw = localStorage.getItem(SAVE_KEY_PREFIX + slot);
    if (!raw) return null;

    const data: SaveData = JSON.parse(raw);
    return {
      rpgState: data.rpgState,
      seed: data.overworldSeed,
    };
  } catch {
    return null;
  }
}

export function deleteSave(slot: number): void {
  if (slot < 0 || slot >= MAX_SLOTS) return;
  localStorage.removeItem(SAVE_KEY_PREFIX + slot);

  const slots = getSaveSlots();
  slots[slot] = null;
  localStorage.setItem(SAVE_META_KEY, JSON.stringify(slots));
}

export function autoSave(
  rpgState: RPGState,
  overworldState: OverworldState,
): boolean {
  return saveGame(AUTO_SAVE_SLOT, rpgState, overworldState);
}

export function restoreRPGState(
  serialized: SerializedRPGState,
): RPGState {
  // Backward compat: ensure all equipment slots exist on loaded party members
  for (const member of serialized.party) {
    member.equipment.helmet ??= null;
    member.equipment.shield ??= null;
    member.equipment.legs ??= null;
    member.equipment.boots ??= null;
    member.equipment.ring ??= null;
  }

  return {
    phase: "overworld" as RPGState["phase"],
    party: serialized.party,
    inventory: serialized.inventory,
    quests: serialized.quests,
    gold: serialized.gold,
    overworldPosition: serialized.overworldPosition,
    currentDungeonId: null, // Always start on overworld after load
    currentFloor: 0,
    dungeonPosition: null,
    visitedDungeons: new Set(serialized.visitedDungeons),
    completedQuests: new Set(serialized.completedQuests),
    gameTime: serialized.gameTime,
    battleMode: serialized.battleMode,
    seed: serialized.seed,
    stepsSinceLastTown: serialized.stepsSinceLastTown ?? 0,
    recruitSeed: serialized.recruitSeed ?? serialized.seed,
    formation: serialized.formation ?? {},
    metLeaders: new Set(serialized.metLeaders ?? []),
    leaderBlessings: serialized.leaderBlessings ?? [],
    // Narrative
    mainQuestStep: serialized.mainQuestStep ?? 0,
    collectedLore: new Set(serialized.collectedLore ?? []),
    townReputation: serialized.townReputation ?? {},
    karma: serialized.karma ?? 0,
    // World
    timeOfDay: serialized.timeOfDay ?? 60,
    weather: serialized.weather ?? "clear",
    weatherTimer: serialized.weatherTimer ?? 40,
    discoveredTowns: new Set(serialized.discoveredTowns ?? []),
    // Party Identity
    affinity: serialized.affinity ?? {},
    hiredUniqueRecruits: new Set(serialized.hiredUniqueRecruits ?? []),
    // QoL
    bestiary: serialized.bestiary ?? {},
    achievements: new Set(serialized.achievements ?? []),
    difficulty: serialized.difficulty ?? "normal",
    tutorialFlags: serialized.tutorialFlags ?? {},
    battleSpeed: serialized.battleSpeed ?? 1,
    // Endgame
    ngPlusCount: serialized.ngPlusCount ?? 0,
    abyssRecord: serialized.abyssRecord ?? 0,
    // Economy
    townPurchases: serialized.townPurchases ?? {},
    arenaFightsLeft: serialized.arenaFightsLeft ?? 3,
  };
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function _serializeRPGState(state: RPGState): SerializedRPGState {
  return {
    party: state.party,
    inventory: state.inventory,
    quests: state.quests,
    gold: state.gold,
    overworldPosition: state.overworldPosition,
    currentDungeonId: state.currentDungeonId,
    currentFloor: state.currentFloor,
    dungeonPosition: state.dungeonPosition,
    visitedDungeons: Array.from(state.visitedDungeons),
    completedQuests: Array.from(state.completedQuests),
    gameTime: state.gameTime,
    battleMode: state.battleMode,
    seed: state.seed,
    stepsSinceLastTown: state.stepsSinceLastTown,
    recruitSeed: state.recruitSeed,
    formation: state.formation,
    metLeaders: Array.from(state.metLeaders),
    leaderBlessings: state.leaderBlessings,
    // Narrative
    mainQuestStep: state.mainQuestStep,
    collectedLore: Array.from(state.collectedLore),
    townReputation: state.townReputation,
    karma: state.karma,
    // World
    timeOfDay: state.timeOfDay,
    weather: state.weather,
    weatherTimer: state.weatherTimer,
    discoveredTowns: Array.from(state.discoveredTowns),
    // Party Identity
    affinity: state.affinity,
    hiredUniqueRecruits: Array.from(state.hiredUniqueRecruits),
    // QoL
    bestiary: state.bestiary,
    achievements: Array.from(state.achievements),
    difficulty: state.difficulty,
    tutorialFlags: state.tutorialFlags,
    battleSpeed: state.battleSpeed,
    // Endgame
    ngPlusCount: state.ngPlusCount,
    abyssRecord: state.abyssRecord,
    // Economy
    townPurchases: state.townPurchases,
    arenaFightsLeft: state.arenaFightsLeft,
  };
}
