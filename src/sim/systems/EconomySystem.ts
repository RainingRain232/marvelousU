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
import { GamePhase, GameMode, BuildingState } from "@/types";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { BUILDING_DEFINITIONS } from "@sim/config/BuildingDefs";
import { EventBus } from "@sim/core/EventBus";
import { getDifficultySettings } from "@sim/config/DifficultyConfig";

export const EconomySystem = {
  update(state: GameState, dt: number): void {
    // No income during RESOLVE (non-RTS modes only)
    if (state.phase === GamePhase.RESOLVE && state.gameMode !== GameMode.RTS) return;

    // RTS mode: no battle bonus, income always ticks
    const isBattle = state.gameMode === GameMode.RTS
      ? false
      : state.phase === GamePhase.BATTLE;

    const diffSettings = getDifficultySettings();

    for (const player of state.players.values()) {
      let rate = _incomeRate(state, player.id, isBattle);

      // Apply AI gold income multiplier based on difficulty
      if (player.isAI) {
        rate *= diffSettings.aiGoldMultiplier;
      }

      if (rate > 0) {
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

      // Mana income (from Archive buildings)
      const manaRate = _manaIncomeRate(state, player.id);
      if (manaRate > 0) {
        player.manaAccum += manaRate * dt;
        const manaWhole = Math.floor(player.manaAccum);
        if (manaWhole >= 1) {
          player.mana += manaWhole;
          player.manaAccum -= manaWhole;
          EventBus.emit("manaChanged", {
            playerId: player.id,
            amount: player.mana,
          });
        }
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

/**
 * Calculate the total mana/sec for a player from owned active buildings.
 */
export function _manaIncomeRate(
  state: GameState,
  playerId: string,
): number {
  let rate = BalanceConfig.MANA_INCOME_RATE;

  for (const building of state.buildings.values()) {
    if (building.owner !== playerId) continue;
    if (building.state !== BuildingState.ACTIVE) continue;
    const def = BUILDING_DEFINITIONS[building.type];
    rate += def.manaIncome ?? 0;
  }

  return rate;
}
