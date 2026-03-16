import type { RPGState } from "@rpg/state/RPGState";
import type { Vec2 } from "@/types";
import { createCraftingDiscoveryState } from "@rpg/systems/CraftingDiscoverySystem";

/** Create a New Game+ state from a completed game. */
export function createNewGamePlus(oldState: RPGState, startPosition: Vec2): RPGState {
  // Keep party members but reset levels to 1 (keep promotions/unitType)
  const newParty = oldState.party.map(m => ({
    ...m,
    level: 1,
    xp: 0,
    xpToNext: 100,
    // Reset stats to base (will be recalculated by PartyFactory)
    hp: m.maxHp,
    mp: m.maxMp,
    statusEffects: [],
    battlesFought: 0,
  }));

  return {
    phase: "overworld" as RPGState["phase"],
    party: newParty,
    inventory: { items: oldState.inventory.items.filter(s => s.item.type !== "key"), maxSlots: 20 },
    quests: [],
    gold: Math.floor(oldState.gold * 0.5),
    overworldPosition: { ...startPosition },
    currentDungeonId: null,
    currentFloor: 0,
    dungeonPosition: null,
    visitedDungeons: new Set(),
    completedQuests: new Set(),
    gameTime: 0,
    battleMode: oldState.battleMode,
    seed: oldState.seed + 1,
    stepsSinceLastTown: 0,
    recruitSeed: oldState.seed + 1,
    formation: { ...oldState.formation },
    metLeaders: new Set(),
    leaderBlessings: [],
    // Narrative reset
    mainQuestStep: 0,
    collectedLore: new Set(oldState.collectedLore), // keep lore
    townReputation: {},
    karma: oldState.karma,
    // World
    timeOfDay: 60,
    weather: "clear",
    weatherTimer: 40,
    discoveredTowns: new Set(),
    // Party Identity
    affinity: { ...oldState.affinity }, // keep affinity
    hiredUniqueRecruits: new Set(),
    // QoL
    bestiary: { ...oldState.bestiary }, // keep bestiary
    achievements: new Set(oldState.achievements), // keep achievements
    difficulty: oldState.difficulty,
    tutorialFlags: oldState.tutorialFlags,
    battleSpeed: oldState.battleSpeed,
    // Endgame
    ngPlusCount: oldState.ngPlusCount + 1,
    abyssRecord: oldState.abyssRecord,
    // Economy
    townPurchases: {},
    arenaFightsLeft: 3,
    randomEncounterRate: oldState.randomEncounterRate,
    roamingEncounterRate: oldState.roamingEncounterRate,
    // Crafting Discovery: carry over discovered recipes
    craftingDiscovery: {
      ...createCraftingDiscoveryState(),
      discoveredRecipes: new Set(oldState.craftingDiscovery.discoveredRecipes),
      knownRecipes: new Set(oldState.craftingDiscovery.knownRecipes),
    },
  };
}

/** Get the NG+ enemy level bonus */
export function getNGPlusEnemyBonus(ngPlusCount: number): number {
  return ngPlusCount * 5; // +5 levels per NG+ cycle
}

/** Get NG+ boss level bonus */
export function getNGPlusBossBonus(ngPlusCount: number): number {
  return ngPlusCount * 10; // +10 levels per NG+ cycle
}
