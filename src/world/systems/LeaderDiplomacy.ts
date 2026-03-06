// Leader diplomatic affinities — Arthurian lore relationships that affect AI diplomacy.
//
// Natural allies tend toward peace; natural enemies refuse peace.
// Family ties create moderate affinity.

import type { WorldState } from "@world/state/WorldState";
import type { WorldPlayer } from "@world/state/WorldPlayer";

// ---------------------------------------------------------------------------
// Relationship definitions
// ---------------------------------------------------------------------------

export type Affinity = "ally" | "enemy" | "family";

export interface LeaderRelationship {
  leaderA: string;
  leaderB: string;
  affinity: Affinity;
}

/** Lore-based relationships between Arthurian leaders. */
export const LEADER_RELATIONSHIPS: LeaderRelationship[] = [
  // Natural allies — loyal Round Table knights
  { leaderA: "arthur", leaderB: "gawain", affinity: "ally" },
  { leaderA: "arthur", leaderB: "bedivere", affinity: "ally" },
  { leaderA: "arthur", leaderB: "kay", affinity: "ally" },
  { leaderA: "arthur", leaderB: "percival", affinity: "ally" },
  { leaderA: "arthur", leaderB: "galahad", affinity: "ally" },

  // Grail knights — brothers in purpose
  { leaderA: "galahad", leaderB: "percival", affinity: "ally" },
  { leaderA: "galahad", leaderB: "bors", affinity: "ally" },
  { leaderA: "percival", leaderB: "bors", affinity: "ally" },

  // Natural enemies
  { leaderA: "arthur", leaderB: "mordred", affinity: "enemy" },
  { leaderA: "merlin", leaderB: "morgan", affinity: "enemy" },
  { leaderA: "lancelot", leaderB: "mordred", affinity: "enemy" },
  { leaderA: "gawain", leaderB: "mordred", affinity: "enemy" },

  // Family ties
  { leaderA: "lot", leaderB: "gawain", affinity: "family" },       // father/son
  { leaderA: "igraine", leaderB: "arthur", affinity: "family" },    // mother/son
  { leaderA: "igraine", leaderB: "morgan", affinity: "family" },    // mother/daughter
  { leaderA: "uther", leaderB: "arthur", affinity: "family" },      // father/son
  { leaderA: "ector", leaderB: "arthur", affinity: "family" },      // foster father
  { leaderA: "ector", leaderB: "kay", affinity: "family" },         // father/son
  { leaderA: "lancelot", leaderB: "galahad", affinity: "family" },  // father/son
  { leaderA: "lancelot", leaderB: "elaine", affinity: "family" },   // lovers
  { leaderA: "nimue", leaderB: "lancelot", affinity: "family" },    // raised him
  { leaderA: "tristan", leaderB: "lancelot", affinity: "ally" },    // fellow knights
];

// ---------------------------------------------------------------------------
// Lookup
// ---------------------------------------------------------------------------

/** Get the affinity between two leaders (order-independent). Returns null if no relationship. */
export function getLeaderAffinity(leaderA: string, leaderB: string): Affinity | null {
  for (const rel of LEADER_RELATIONSHIPS) {
    if (
      (rel.leaderA === leaderA && rel.leaderB === leaderB) ||
      (rel.leaderA === leaderB && rel.leaderB === leaderA)
    ) {
      return rel.affinity;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// AI diplomacy logic — called during AI turn processing
// ---------------------------------------------------------------------------

/**
 * Process AI diplomatic decisions based on leader affinities.
 * Called once per AI player per turn.
 *
 * - Allies: 30% chance to propose peace each turn if at war
 * - Family: 20% chance to propose peace each turn if at war
 * - Enemies: if at peace, 15% chance to declare war each turn (after turn 10)
 */
export function processAIDiplomacy(state: WorldState, aiPlayer: WorldPlayer): void {
  if (!aiPlayer.isAI || !aiPlayer.isAlive || !aiPlayer.leaderId) return;

  for (const [otherId, otherPlayer] of state.players) {
    if (otherId === aiPlayer.id) continue;
    if (!otherPlayer.isAlive) continue;
    if (otherId === "morgaine") continue; // Never make peace with Morgaine
    if (!otherPlayer.leaderId) continue;

    const affinity = getLeaderAffinity(aiPlayer.leaderId, otherPlayer.leaderId);
    if (!affinity) continue;

    const currentRelation = aiPlayer.diplomacy.get(otherId) ?? "war";

    if (affinity === "ally" || affinity === "family") {
      if (currentRelation === "war") {
        const peaceChance = affinity === "ally" ? 0.30 : 0.20;
        if (Math.random() < peaceChance) {
          // Propose peace
          aiPlayer.diplomacy.set(otherId, "peace");
          otherPlayer.diplomacy.set(aiPlayer.id, "peace");
        }
      }
    } else if (affinity === "enemy") {
      if (currentRelation === "peace" && state.turn >= 10) {
        if (Math.random() < 0.15) {
          // Betray peace — declare war
          aiPlayer.diplomacy.set(otherId, "war");
          otherPlayer.diplomacy.set(aiPlayer.id, "war");
        }
      }
      // Enemies at war refuse peace — handled by blocking peace proposals in UI
    }
  }
}

/**
 * Check if an AI player would accept a peace proposal based on leader affinity.
 * Returns true if they accept, false if they refuse.
 */
export function wouldAcceptPeace(aiPlayer: WorldPlayer, proposingPlayer: WorldPlayer): boolean {
  if (!aiPlayer.leaderId || !proposingPlayer.leaderId) return true;

  const affinity = getLeaderAffinity(aiPlayer.leaderId, proposingPlayer.leaderId);

  if (affinity === "enemy") {
    // Lore enemies refuse peace 80% of the time
    return Math.random() < 0.2;
  }
  if (affinity === "ally" || affinity === "family") {
    // Lore allies always accept peace
    return true;
  }

  // No relationship — 60% accept
  return Math.random() < 0.6;
}

/**
 * Apply initial diplomatic affinities at game start.
 * Sets lore allies to peace immediately.
 */
export function applyInitialAffinities(state: WorldState): void {
  for (const [pidA, pA] of state.players) {
    if (!pA.leaderId) continue;
    if (pidA === "morgaine") continue;

    for (const [pidB, pB] of state.players) {
      if (pidA === pidB) continue;
      if (!pB.leaderId) continue;
      if (pidB === "morgaine") continue;

      const affinity = getLeaderAffinity(pA.leaderId, pB.leaderId);
      if (affinity === "ally") {
        // Lore allies start at peace
        pA.diplomacy.set(pidB, "peace");
        pB.diplomacy.set(pidA, "peace");
      }
    }
  }
}
