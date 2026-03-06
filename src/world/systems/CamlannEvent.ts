// Camlann — The Final Battle
//
// If both Arthur and Mordred are in the game (as player or AI), after turn 40,
// Mordred declares war on Arthur. When their armies clash, a special "Battle of
// Camlann" event triggers with dramatic stakes.

import type { WorldState } from "@world/state/WorldState";
import type { WorldPlayer } from "@world/state/WorldPlayer";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface CamlannState {
  /** Whether the Camlann war declaration has occurred. */
  warDeclared: boolean;
  /** Whether the final battle dialog has been shown. */
  battleTriggered: boolean;
}

export function createCamlannState(): CamlannState {
  return {
    warDeclared: false,
    battleTriggered: false,
  };
}

// ---------------------------------------------------------------------------
// Event
// ---------------------------------------------------------------------------

export interface CamlannEvent {
  title: string;
  description: string;
  color: number;
}

// ---------------------------------------------------------------------------
// Find Arthur and Mordred
// ---------------------------------------------------------------------------

function _findLeaderPlayer(state: WorldState, leaderId: string): WorldPlayer | null {
  for (const [, p] of state.players) {
    if (p.leaderId === leaderId && p.isAlive) return p;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Process — called each turn
// ---------------------------------------------------------------------------

export function processCamlann(
  state: WorldState,
  camlannState: CamlannState,
): CamlannEvent | null {
  if (camlannState.warDeclared) return null;
  if (state.turn < 40) return null;

  const arthur = _findLeaderPlayer(state, "arthur");
  const mordred = _findLeaderPlayer(state, "mordred");
  if (!arthur || !mordred) return null;

  // Both must be alive and in the game
  const relation = arthur.diplomacy.get(mordred.id);
  if (relation === "war") return null; // Already at war

  // Mordred declares war on Arthur!
  camlannState.warDeclared = true;
  arthur.diplomacy.set(mordred.id, "war");
  mordred.diplomacy.set(arthur.id, "war");

  return {
    title: "The Battle of Camlann Approaches!",
    description: "Mordred has betrayed the peace and declared war upon Arthur! The prophecy of Camlann unfolds — father and son shall meet on the field of destiny.",
    color: 0xff4444,
  };
}

/**
 * Check if a battle between Arthur's and Mordred's armies should trigger
 * the Camlann special dialog.
 */
export function isCamlannBattle(
  state: WorldState,
  camlannState: CamlannState,
  attackerOwner: string,
  defenderOwner: string,
): boolean {
  if (camlannState.battleTriggered) return false;
  if (!camlannState.warDeclared) return false;

  const arthur = _findLeaderPlayer(state, "arthur");
  const mordred = _findLeaderPlayer(state, "mordred");
  if (!arthur || !mordred) return false;

  const isArthurVsMordred =
    (attackerOwner === arthur.id && defenderOwner === mordred.id) ||
    (attackerOwner === mordred.id && defenderOwner === arthur.id);

  if (isArthurVsMordred) {
    camlannState.battleTriggered = true;
    return true;
  }

  return false;
}
