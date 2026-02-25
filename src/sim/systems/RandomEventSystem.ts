// RandomEventSystem — fires a random game event every RANDOM_EVENT_INTERVAL seconds
// during the BATTLE phase. Each event awards gold or other bonuses to all players
// and emits a "randomEvent" event so the view can display a banner.

import type { GameState } from "@sim/state/GameState";
import { GamePhase, UnitType, NEUTRAL_PLAYER } from "@/types";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { EventBus } from "@sim/core/EventBus";
import { createUnit } from "@sim/entities/Unit";

// ---------------------------------------------------------------------------
// Event definitions
// ---------------------------------------------------------------------------

interface RandomEventDef {
  type: string;
  title: string;
  description: string;
  apply(state: GameState): void;
}

/** Spawn offsets for a 4-unit cluster (2×2 spread around an anchor). */
const BANDIT_OFFSETS: { x: number; y: number }[] = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: 1, y: 1 },
];

/**
 * Find neutral buildings (owner === null) in the neutral zone (centre third of
 * the map) and return one at random. Returns null if none exist.
 */
function _pickNeutralBuilding(state: GameState): { x: number; y: number } | null {
  const width = state.battlefield.width;
  const westEnd = Math.floor(width / 3);
  const eastStart = Math.ceil((width * 2) / 3);

  const candidates = [...state.buildings.values()].filter(
    (b) => b.owner === null && b.position.x >= westEnd && b.position.x < eastStart,
  );

  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)].position;
}

const RANDOM_EVENTS: RandomEventDef[] = [
  {
    type: "gold_bounty_small",
    title: "GOLD BOUNTY",
    description: "A merchant caravan passes through — both players receive 200 gold!",
    apply(state) {
      for (const player of state.players.values()) {
        player.gold += 200;
        EventBus.emit("goldChanged", { playerId: player.id, amount: player.gold });
      }
    },
  },
  {
    type: "gold_bounty_large",
    title: "RICH HARVEST",
    description: "Abundant resources discovered — both players receive 400 gold!",
    apply(state) {
      for (const player of state.players.values()) {
        player.gold += 400;
        EventBus.emit("goldChanged", { playerId: player.id, amount: player.gold });
      }
    },
  },
  {
    type: "bandit_raid",
    title: "BANDIT RAID",
    description: "Brigands emerge from the wilderness! Hostile swordsmen attack near a central town!",
    apply(state) {
      const anchor = _pickNeutralBuilding(state);
      // Fall back to map centre if no neutral building exists
      const base = anchor ?? {
        x: Math.floor(state.battlefield.width / 2),
        y: Math.floor(state.battlefield.height / 2),
      };

      for (const offset of BANDIT_OFFSETS) {
        const unit = createUnit({
          type: UnitType.SWORDSMAN,
          owner: NEUTRAL_PLAYER,
          position: { x: base.x + offset.x, y: base.y + offset.y },
        });
        state.units.set(unit.id, unit);
        EventBus.emit("unitSpawned", {
          unitId: unit.id,
          buildingId: "",
          position: { ...unit.position },
        });
      }
    },
  },
];

// ---------------------------------------------------------------------------
// System
// ---------------------------------------------------------------------------

export const RandomEventSystem = {
  update(state: GameState, dt: number): void {
    // Only runs during battle
    if (state.phase !== GamePhase.BATTLE) return;

    state.eventTimer -= dt;
    if (state.eventTimer > 0) return;

    // Reset timer for the next event
    state.eventTimer = BalanceConfig.RANDOM_EVENT_INTERVAL;

    // Pick a random event with equal probability
    const def = RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)];

    // Apply the event's effect
    def.apply(state);

    // Notify the view
    EventBus.emit("randomEvent", {
      eventType: def.type,
      title: def.title,
      description: def.description,
    });
  },
};
