// RandomEventSystem — fires a random game event every RANDOM_EVENT_INTERVAL seconds
// during the BATTLE phase. Each event awards gold or other bonuses to all players
// and emits a "randomEvent" event so the view can display a banner.

import type { GameState } from "@sim/state/GameState";
import { GamePhase } from "@/types";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { EventBus } from "@sim/core/EventBus";

// ---------------------------------------------------------------------------
// Event definitions
// ---------------------------------------------------------------------------

interface RandomEventDef {
  type: string;
  title: string;
  description: string;
  apply(state: GameState): void;
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
