// Turn management for world mode.
//
// Controls the flow: Player Turn → End Turn → Battles → AI Turns → Next Turn.

import {
  type WorldState,
  WorldPhase,
  currentPlayer,
  nextId,
} from "@world/state/WorldState";
import type { WorldCity } from "@world/state/WorldCity";
import { createWorldArmy } from "@world/state/WorldArmy";
import { processEconomy } from "@world/systems/WorldEconomySystem";
import { advanceResearch } from "@world/systems/ResearchSystem";

// ---------------------------------------------------------------------------
// Turn flow
// ---------------------------------------------------------------------------

/** Called at the start of each player's turn. Resets movement, collects resources. */
export function beginTurn(state: WorldState): void {
  const player = currentPlayer(state);

  // Reset army movement points for this player
  for (const army of state.armies.values()) {
    if (army.owner === player.id && !army.isGarrison) {
      army.movementPoints = army.maxMovementPoints;
    }
  }

  // Collect resources from all cities this player owns
  processEconomy(state, player.id);

  // Advance research
  advanceResearch(player, state);

  // Process recruitment — deliver units that are ready
  for (const city of state.cities.values()) {
    if (city.owner !== player.id) continue;
    _processRecruitment(city, state);
  }
}

/** End the current player's turn. Advance construction, check battles, move to next. */
export function endTurn(state: WorldState): void {
  const player = currentPlayer(state);

  // Advance construction in all cities owned by current player
  for (const city of state.cities.values()) {
    if (city.owner !== player.id) continue;
    _advanceConstruction(city);
    _tickRecruitment(city);
  }

  // Check for pending battles (army collisions)
  // This will be filled in by ArmySystem when armies move into enemy hexes

  if (state.pendingBattles.length > 0) {
    state.phase = WorldPhase.BATTLE;
    return;
  }

  _advanceToNextPlayer(state);
}

/** After all battles resolved, continue to next player. */
export function onBattlesResolved(state: WorldState): void {
  state.pendingBattles = [];
  _advanceToNextPlayer(state);
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

function _advanceToNextPlayer(state: WorldState): void {
  // Move to next alive player
  let nextIndex = state.currentPlayerIndex;
  const count = state.playerOrder.length;

  for (let i = 0; i < count; i++) {
    nextIndex = (nextIndex + 1) % count;
    const pid = state.playerOrder[nextIndex];
    const player = state.players.get(pid)!;
    if (player.isAlive) break;
  }

  // Check if we wrapped around to a new turn
  if (nextIndex <= state.currentPlayerIndex) {
    state.turn++;
  }

  state.currentPlayerIndex = nextIndex;

  const next = currentPlayer(state);
  if (next.isAI) {
    state.phase = WorldPhase.AI_TURN;
  } else {
    state.phase = WorldPhase.PLAYER_TURN;
  }

  // Check victory — if only one player remains alive
  const alive = state.playerOrder.filter(
    (pid) => state.players.get(pid)!.isAlive,
  );
  if (alive.length <= 1) {
    state.winnerId = alive[0] ?? null;
    state.phase = WorldPhase.GAME_OVER;
    return;
  }

  beginTurn(state);
}

/** Advance a city's construction queue. */
function _advanceConstruction(city: WorldCity): void {
  if (!city.constructionQueue || city.isUnderSiege) return;

  // Production is gathered from economy; here we just invest it
  // For now, use a simple flat production rate based on population
  const production = city.population * 2; // base production per pop
  city.constructionQueue.invested += production;

  if (city.constructionQueue.invested >= city.constructionQueue.cost) {
    // Construction complete
    city.buildings.push({
      type: city.constructionQueue.buildingType,
      completedTurn: 0, // will be set by caller if needed
    });
    city.constructionQueue = null;
  }
}

/** Tick recruitment countdowns. */
function _tickRecruitment(city: WorldCity): void {
  if (city.isUnderSiege) return;

  for (const entry of city.recruitmentQueue) {
    if (entry.turnsLeft > 0) {
      entry.turnsLeft--;
    }
  }
}

/** Deliver ready recruits to the garrison army. */
function _processRecruitment(
  city: WorldCity,
  state: WorldState,
): void {
  const ready = city.recruitmentQueue.filter((e) => e.turnsLeft <= 0);
  if (ready.length === 0) return;

  // Get or create garrison army
  let garrison = city.garrisonArmyId
    ? state.armies.get(city.garrisonArmyId) ?? null
    : null;

  if (!garrison) {
    const id = nextId(state, "army");
    garrison = createWorldArmy(id, city.owner, city.position, [], true);
    state.armies.set(id, garrison);
    city.garrisonArmyId = id;
  }

  for (const entry of ready) {
    // Add to garrison — merge if same unit type exists
    const existing = garrison!.units.find((u) => u.unitType === entry.unitType);
    if (existing) {
      existing.count += entry.count;
    } else {
      garrison!.units.push({
        unitType: entry.unitType,
        count: entry.count,
        hpPerUnit: 100,
      });
    }
  }

  // Remove delivered entries
  city.recruitmentQueue = city.recruitmentQueue.filter((e) => e.turnsLeft > 0);
}
