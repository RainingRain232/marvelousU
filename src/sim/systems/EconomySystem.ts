// Gold income system — ticks passive income for all players each frame.
//
// Income formula (per player, per second):
//
//   gold/sec = GOLD_INCOME_RATE                       (flat base)
//            + sum(building.goldIncome)                (per owned active building)
//            + sum(building.goldIncome) for neutral    (per captured neutral building)
//            + GOLD_INCOME_BATTLE_BONUS                (flat bonus during BATTLE only)
//
// Income ticks during both PREP and BATTLE phases.
// No income during RESOLVE.
//
// Emits "goldChanged" whenever a player's gold value changes.

import type { GameState } from "@sim/state/GameState";
import { GamePhase, BuildingState } from "@/types";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { BUILDING_DEFINITIONS } from "@sim/config/BuildingDefs";
import { EventBus } from "@sim/core/EventBus";

export const EconomySystem = {
  update(state: GameState, dt: number): void {
    // No income during RESOLVE
    if (state.phase === GamePhase.RESOLVE) return;

    const isBattle = state.phase === GamePhase.BATTLE;

    for (const player of state.players.values()) {
      const rate = _incomeRate(state, player.id, isBattle);
      if (rate <= 0) continue;

      player.goldAccum += rate * dt;
      const whole = Math.floor(player.goldAccum);
      if (whole >= 1) {
        player.gold += whole;
        player.goldAccum -= whole;
        EventBus.emit("goldChanged", {
          playerId: player.id,
          amount: player.gold,
        });
      }
    }
  },
};

// ---------------------------------------------------------------------------
// Income rate calculation
// ---------------------------------------------------------------------------

/**
 * Calculate the total gold/sec for a player given the current game state.
 * Exported for testability.
 */
export function _incomeRate(
  state: GameState,
  playerId: string,
  isBattle: boolean,
): number {
  let rate = BalanceConfig.GOLD_INCOME_RATE;

  if (isBattle) {
    rate += BalanceConfig.GOLD_INCOME_BATTLE_BONUS;
  }

  // Sum income from all active buildings owned by this player (including
  // neutral buildings they have captured — these have owner === playerId
  // because capturing sets the owner field).
  for (const building of state.buildings.values()) {
    if (building.owner !== playerId) continue;
    if (building.state !== BuildingState.ACTIVE) continue;
    const def = BUILDING_DEFINITIONS[building.type];
    rate += def.goldIncome;
  }

  return rate;
}
