// Server-side validation for incoming player actions.
//
// Ensures actions are legal before applying them to the authoritative GameState.
// Returns an error string if invalid, null if valid.

import type { GameState } from "@sim/state/GameState";
import type { PlayerAction } from "@net/protocol";
import type { PlayerId } from "@/types";
import { GamePhase } from "@/types";
import { BUILDING_DEFINITIONS } from "@sim/config/BuildingDefs";
import { UNIT_DEFINITIONS } from "@sim/config/UnitDefinitions";

/**
 * Validate a player action against the current game state.
 * Returns null if the action is valid, or an error string describing why it's invalid.
 */
export function validateAction(
  state: GameState,
  playerId: PlayerId,
  action: PlayerAction,
): string | null {
  const player = state.players.get(playerId);
  if (!player) return "Unknown player";

  switch (action.type) {
    case "place_building": {
      if (state.phase !== GamePhase.PREP) return "Can only place buildings during PREP phase";
      const def = BUILDING_DEFINITIONS[action.buildingType];
      if (!def) return "Unknown building type";
      // Basic gold check — confirmPlacement does full validation
      if (player.gold < (def.cost ?? 0)) return "Not enough gold";
      return null;
    }

    case "queue_unit": {
      if (state.phase !== GamePhase.PREP) return "Can only queue units during PREP phase";
      const building = state.buildings.get(action.buildingId);
      if (!building) return "Building not found";
      if (building.owner !== playerId) return "Not your building";
      const unitDef = UNIT_DEFINITIONS[action.unitType];
      if (!unitDef) return "Unknown unit type";
      if (player.gold < unitDef.cost) return "Not enough gold";
      if (!building.shopInventory.includes(action.unitType)) return "Building cannot train this unit";
      return null;
    }

    case "buy_upgrade": {
      if (state.phase !== GamePhase.PREP) return "Can only buy upgrades during PREP phase";
      return null; // UpgradeSystem.purchaseUpgrade does its own validation
    }

    case "place_flag": {
      if (action.x < 0 || action.y < 0) return "Invalid flag position";
      if (action.x >= state.battlefield.grid[0].length) return "Flag out of bounds";
      if (action.y >= state.battlefield.grid.length) return "Flag out of bounds";
      return null;
    }

    case "toggle_queue": {
      const building = state.buildings.get(action.buildingId);
      if (!building) return "Building not found";
      if (building.owner !== playerId) return "Not your building";
      return null;
    }

    case "set_ready":
    case "skip_prep":
      return null;

    default:
      return "Unknown action type";
  }
}
