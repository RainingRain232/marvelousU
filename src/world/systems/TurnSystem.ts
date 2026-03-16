// Turn management for world mode.
//
// Controls the flow: Player Turn → End Turn → Battles → AI Turns → Next Turn.

import {
  type WorldState,
  WorldPhase,
  currentPlayer,
  nextId,
} from "@world/state/WorldState";
import { RESEARCH_DEFINITIONS } from "@world/config/ResearchDefs";
import type { WorldCity } from "@world/state/WorldCity";
import { createWorldArmy } from "@world/state/WorldArmy";
import { processEconomy } from "@world/systems/WorldEconomySystem";
import { advanceResearch, advanceMagicResearch } from "@world/systems/ResearchSystem";
import { updateVisibility } from "@world/systems/FogOfWarSystem";
import { spawnNeutralRaiders } from "@world/systems/NeutralCitySystem";
import { processOverlandSpells, getSpellMovementBonus } from "@world/systems/OverlandSpellSystem";
import { processMorgaineEscalation, type MorgaineEvent } from "@world/systems/MorgaineEscalation";

/** Morgaine escalation events from the most recent turn cycle. Consumed by the UI. */
export let lastMorgaineEvents: MorgaineEvent[] = [];

// ---------------------------------------------------------------------------
// Turn flow
// ---------------------------------------------------------------------------

/** Called at the start of each player's turn. Resets movement, collects resources. */
export function beginTurn(state: WorldState): void {
  const player = currentPlayer(state);

  // Process overland spell effects (cooldowns, durations, per-turn effects)
  processOverlandSpells(state, player.id);

  // Reset army movement points for this player (with spell bonuses)
  const moveBonus = getSpellMovementBonus(player);
  for (const army of state.armies.values()) {
    if (army.owner === player.id && !army.isGarrison) {
      army.movementPoints = army.maxMovementPoints + moveBonus;
    }
  }

  // Collect resources from all cities this player owns
  processEconomy(state, player.id);

  // Advance research (normal + magic)
  advanceResearch(player, state);
  advanceMagicResearch(player, state);

  // Process recruitment — deliver units that are ready
  for (const city of state.cities.values()) {
    if (city.owner !== player.id) continue;
    _processRecruitment(city, state);
  }

  // Update fog of war visibility
  updateVisibility(state, player.id);
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

    // Spawn neutral city raiders every 5 turns
    if (state.turn > 0 && state.turn % 5 === 0) {
      spawnNeutralRaiders(state);
    }

    // Morgaine escalation — spawn armies, expand corruption, cast curses
    lastMorgaineEvents = processMorgaineEscalation(state);
  }

  state.currentPlayerIndex = nextIndex;

  const next = currentPlayer(state);
  if (next.isAI) {
    state.phase = WorldPhase.AI_TURN;
  } else {
    state.phase = WorldPhase.PLAYER_TURN;
  }

  // Check all victory conditions — domination, city control, research
  if (_checkVictoryConditions(state)) return;

  beginTurn(state);
}

/**
 * Check all victory conditions. If one is met, sets `state.winnerId` and
 * `state.phase = WorldPhase.GAME_OVER` and returns true. Otherwise false.
 *
 * Conditions checked (in order):
 *  1. Domination   — only 1 alive player remains.
 *  2. City Control — a single player owns every city on the map.
 *  3. Research     — a player has completed at least one tech from each of
 *                    the 5 research branches (military, magic, economic,
 *                    siege, buildings).
 */
function _checkVictoryConditions(state: WorldState): boolean {
  // ---- 1. Domination: only one (or zero) alive player remains ----
  const alive = state.playerOrder.filter(
    (pid) => state.players.get(pid)!.isAlive,
  );
  if (alive.length <= 1) {
    state.winnerId = alive[0] ?? null;
    state.phase = WorldPhase.GAME_OVER;
    return true;
  }

  // ---- 2. City Control: one player owns ALL cities on the map ----
  if (state.cities.size > 0) {
    const cities = Array.from(state.cities.values());
    const firstOwner = cities[0].owner;
    const allSameOwner = cities.every((c) => c.owner === firstOwner);
    if (allSameOwner && state.players.get(firstOwner)?.isAlive) {
      state.winnerId = firstOwner;
      state.phase = WorldPhase.GAME_OVER;
      return true;
    }
  }

  // ---- 3. Research Victory: a player has completed at least one tech
  //         from each of the 5 research branches ----
  const ALL_BRANCHES = ["military", "magic", "economic", "siege", "buildings"] as const;

  // Pre-build a lookup: branchName → set of research IDs in that branch.
  // We compute this once per check from the static definitions.
  const branchIds: Record<string, Set<string>> = {};
  for (const branch of ALL_BRANCHES) {
    branchIds[branch] = new Set();
  }
  for (const def of Object.values(RESEARCH_DEFINITIONS)) {
    branchIds[def.branch]?.add(def.id);
  }

  for (const pid of alive) {
    const player = state.players.get(pid)!;
    const completed = player.completedResearch;
    const hasAllBranches = ALL_BRANCHES.every((branch) => {
      // Player has completed at least one tech that belongs to this branch
      for (const id of branchIds[branch]) {
        if (completed.has(id)) return true;
      }
      return false;
    });
    if (hasAllBranches) {
      state.winnerId = pid;
      state.phase = WorldPhase.GAME_OVER;
      return true;
    }
  }

  return false;
}

/** Advance a city's construction queue. */
function _advanceConstruction(city: WorldCity): void {
  if (city.constructionQueue.length === 0 || city.isUnderSiege) return;

  const item = city.constructionQueue[0];
  const production = city.population * 2;
  item.invested += production;

  if (item.invested >= item.cost) {
    city.buildings.push({
      type: item.buildingType,
      completedTurn: 0,
    });
    city.constructionQueue.shift();
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
