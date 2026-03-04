// Derive EventBus events by diffing two consecutive serialized snapshots.
//
// In online mode the sim doesn't run locally, so no events are emitted.
// The SnapshotDiffer compares the previous and current snapshot to synthesize
// the most important events so the view layer (animations, sounds) still works.

import { EventBus } from "@sim/core/EventBus";
import { UnitState, GamePhase } from "@/types";
import type { SerializedGameState } from "@net/protocol";

/**
 * Compare two snapshots and emit EventBus events for changes the view needs.
 * Called by RoomManager before applySnapshot so views react correctly.
 */
export function diffSnapshots(
  prev: SerializedGameState,
  next: SerializedGameState,
): void {
  // --- Phase change ---
  if (prev.phase !== next.phase) {
    EventBus.emit("phaseChanged", { phase: next.phase });
  }

  // --- Units spawned (in next but not in prev) ---
  for (const id of Object.keys(next.units)) {
    if (!(id in prev.units)) {
      const unit = next.units[id];
      EventBus.emit("unitSpawned", {
        unitId: id,
        buildingId: "",
        position: { ...unit.position },
      });
    }
  }

  // --- Units died (in prev but not in next, or state changed to DIE) ---
  for (const id of Object.keys(prev.units)) {
    const prevUnit = prev.units[id];
    const nextUnit = next.units[id];

    if (!nextUnit) {
      // Unit removed entirely
      EventBus.emit("unitDied", { unitId: id });
      continue;
    }

    // State changed to DIE
    if (prevUnit.state !== UnitState.DIE && nextUnit.state === UnitState.DIE) {
      EventBus.emit("unitDied", { unitId: id });
    }

    // Unit took damage
    if (nextUnit.hp < prevUnit.hp) {
      EventBus.emit("unitDamaged", {
        unitId: id,
        amount: prevUnit.hp - nextUnit.hp,
        attackerId: "",
      });
    }

    // Unit healed
    if (nextUnit.hp > prevUnit.hp && nextUnit.state !== UnitState.DIE) {
      EventBus.emit("unitHealed", {
        unitId: id,
        amount: nextUnit.hp - prevUnit.hp,
        position: { ...nextUnit.position },
      });
    }

    // Level up
    if (nextUnit.level > prevUnit.level) {
      EventBus.emit("unitLevelUp", {
        unitId: id,
        newLevel: nextUnit.level,
      });
    }
  }

  // --- Buildings placed (in next but not in prev) ---
  for (const id of Object.keys(next.buildings)) {
    if (!(id in prev.buildings)) {
      const building = next.buildings[id];
      EventBus.emit("buildingPlaced", {
        buildingId: id,
        position: { ...building.position },
        owner: building.owner,
      });
    }
  }

  // --- Buildings destroyed (in prev but not in next) ---
  for (const id of Object.keys(prev.buildings)) {
    if (!(id in next.buildings)) {
      EventBus.emit("buildingDestroyed", { buildingId: id });
    }
  }

  // --- Buildings captured (owner changed) ---
  for (const id of Object.keys(next.buildings)) {
    const prevB = prev.buildings[id];
    const nextB = next.buildings[id];
    if (prevB && nextB && prevB.owner !== nextB.owner) {
      EventBus.emit("buildingCaptured", {
        buildingId: id,
        newOwner: nextB.owner,
      });
    }
  }

  // --- Gold changes ---
  for (const id of Object.keys(next.players)) {
    const prevP = prev.players[id];
    const nextP = next.players[id];
    if (prevP && nextP && prevP.gold !== nextP.gold) {
      EventBus.emit("goldChanged", {
        playerId: id,
        amount: nextP.gold,
      });
    }
  }

  // --- Rally flags ---
  for (const id of Object.keys(next.rallyFlags)) {
    const prevFlag = prev.rallyFlags[id];
    const nextFlag = next.rallyFlags[id];
    if (!prevFlag || prevFlag.x !== nextFlag.x || prevFlag.y !== nextFlag.y) {
      EventBus.emit("flagPlaced", {
        playerId: id,
        position: { ...nextFlag },
      });
    }
  }
}
