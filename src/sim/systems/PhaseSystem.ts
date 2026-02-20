// Phase system — drives the PREP → BATTLE → RESOLVE → PREP cycle.
//
// Phase rules:
//
//   PREP     (phaseTimer counts down from PREP_DURATION)
//     → BATTLE when phaseTimer reaches 0.
//     Units may not be on the battlefield during PREP; any that remain from
//     a previous round are cleared on entry.
//
//   BATTLE   (phaseTimer = -1, runs until a win condition is met)
//     → RESOLVE when:
//       (a) A base's health reaches 0, OR
//       (b) One side has no units AND no buildings capable of producing more
//           (i.e. all buildings are destroyed) — this prevents a stalemate.
//     The `state.winnerId` is set to the surviving player's ID.
//     If both bases fall simultaneously it is a draw (winnerId = null).
//
//   RESOLVE  (phaseTimer counts down from RESOLVE_DURATION)
//     → PREP when phaseTimer reaches 0.
//     On transition back to PREP: clear all units, reset base health,
//     replenish player gold, reset phaseTimer to PREP_DURATION.
//
// Each transition emits "phaseChanged" on the EventBus so the view can react.

import type { GameState } from "@sim/state/GameState";
import { GamePhase } from "@/types";
import { BuildingState, UnitState } from "@/types";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { EventBus } from "@sim/core/EventBus";

// ---------------------------------------------------------------------------
// Public system
// ---------------------------------------------------------------------------

export const PhaseSystem = {
  update(state: GameState, dt: number): void {
    switch (state.phase) {
      case GamePhase.PREP:
        _tickPrep(state, dt);
        break;
      case GamePhase.BATTLE:
        _tickBattle(state);
        break;
      case GamePhase.RESOLVE:
        _tickResolve(state, dt);
        break;
    }
  },
};

// ---------------------------------------------------------------------------
// PREP tick
// ---------------------------------------------------------------------------

function _tickPrep(state: GameState, dt: number): void {
  state.phaseTimer -= dt;
  if (state.phaseTimer <= 0) {
    _enterBattle(state);
  }
}

// ---------------------------------------------------------------------------
// BATTLE tick
// ---------------------------------------------------------------------------

function _tickBattle(state: GameState): void {
  const winResult = _checkWinCondition(state);
  if (winResult !== undefined) {
    state.winnerId = winResult; // null = draw, string = winner PlayerId
    _enterResolve(state);
  }
}

// ---------------------------------------------------------------------------
// RESOLVE tick
// ---------------------------------------------------------------------------

function _tickResolve(state: GameState, dt: number): void {
  state.phaseTimer -= dt;
  if (state.phaseTimer <= 0) {
    _enterPrep(state);
  }
}

// ---------------------------------------------------------------------------
// Phase transitions
// ---------------------------------------------------------------------------

function _enterBattle(state: GameState): void {
  state.phase = GamePhase.BATTLE;
  state.phaseTimer = -1; // no countdown during battle
  EventBus.emit("phaseChanged", { phase: GamePhase.BATTLE });
}

function _enterResolve(state: GameState): void {
  state.phase = GamePhase.RESOLVE;
  state.phaseTimer = BalanceConfig.RESOLVE_DURATION;
  EventBus.emit("phaseChanged", { phase: GamePhase.RESOLVE });
}

function _enterPrep(state: GameState): void {
  // Clear all living units from the field
  for (const unit of state.units.values()) {
    if (unit.state !== UnitState.DIE) {
      unit.state = UnitState.DIE; // mark as dead so CombatSystem removes them
    }
  }
  // Hard-clear the unit map so we start fresh immediately
  state.units.clear();

  // Reset base health
  for (const base of state.bases.values()) {
    base.health = base.maxHealth;
  }

  // Replenish player gold to starting amount
  for (const player of state.players.values()) {
    player.gold = BalanceConfig.START_GOLD;
    player.goldAccum = 0;
    EventBus.emit("goldChanged", { playerId: player.id, amount: player.gold });
  }

  // Clear winner from previous round
  state.winnerId = null;

  state.phase = GamePhase.PREP;
  state.phaseTimer = BalanceConfig.PREP_DURATION;
  EventBus.emit("phaseChanged", { phase: GamePhase.PREP });
}

// ---------------------------------------------------------------------------
// Win condition check
// ---------------------------------------------------------------------------

/**
 * Returns:
 *   - `undefined`  — battle is still ongoing
 *   - `null`       — draw (both sides simultaneously destroyed)
 *   - `string`     — PlayerId of the surviving/winning player
 *
 * Win conditions (checked in order):
 *   1. Any base has hp ≤ 0 → the base owner loses (opponent wins).
 *   2. One side has zero living units AND zero active buildings (total wipe).
 *      Only fires when at least one side has something on the field — prevents
 *      an instant win-on-empty-battlefield at the start of the BATTLE phase.
 */
function _checkWinCondition(state: GameState): string | null | undefined {
  // 1. Base health — collect all eliminated player IDs
  const eliminated = new Set<string>();
  for (const base of state.bases.values()) {
    if (base.health <= 0) {
      eliminated.add(base.owner);
    }
  }

  if (eliminated.size > 0) {
    // Identify surviving players
    const allPlayers = [...state.players.keys()];
    const survivors = allPlayers.filter((id) => !eliminated.has(id));
    if (survivors.length === 0) return null; // mutual destruction — draw
    if (survivors.length === 1) return survivors[0];
    // survivors.length >= 2: multiple players still standing — keep fighting
  }

  // 2. Total wipe: a player has no living units and no active buildings.
  // Guard: skip if the entire field is empty (start of battle, nothing deployed yet).
  const anyEntitiesOnField = _anyEntitiesExist(state);
  if (!anyEntitiesOnField) return undefined;

  for (const [playerId] of state.players) {
    const hasUnits = _hasLivingUnits(state, playerId);
    const hasBuildings = _hasActiveBuildings(state, playerId);
    if (!hasUnits && !hasBuildings) {
      // This player is totally wiped — opponents win
      const opponents = [...state.players.keys()].filter(
        (id) => id !== playerId,
      );
      if (opponents.length === 1) return opponents[0];
      // Multiple opponents — declare no single winner (keep fighting)
    }
  }

  return undefined; // ongoing
}

/**
 * Returns true if at least one player has a living unit OR an active building.
 * Used to prevent the wipe-condition from firing on an empty BATTLE field.
 */
function _anyEntitiesExist(state: GameState): boolean {
  for (const unit of state.units.values()) {
    if (unit.state !== UnitState.DIE) return true;
  }
  for (const building of state.buildings.values()) {
    if (building.state === BuildingState.ACTIVE) return true;
  }
  return false;
}

function _hasLivingUnits(state: GameState, playerId: string): boolean {
  for (const unit of state.units.values()) {
    if (unit.owner === playerId && unit.state !== UnitState.DIE) return true;
  }
  return false;
}

function _hasActiveBuildings(state: GameState, playerId: string): boolean {
  for (const building of state.buildings.values()) {
    if (
      building.owner === playerId &&
      building.state === BuildingState.ACTIVE
    ) {
      return true;
    }
  }
  return false;
}
