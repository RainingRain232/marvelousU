// RTS resource gathering system — workers harvest from resource nodes
// and deliver to drop-off buildings.
//
// Worker cycle: IDLE at node (gathering) → MOVE to drop-off → deliver → MOVE back → repeat
// Workers just idle at the node while gathering — no special GATHER state needed.

import type { GameState } from "@sim/state/GameState";
import type { Unit } from "@sim/entities/Unit";
import { UnitState, GameMode, BuildingState } from "@/types";
import { UNIT_DEFINITIONS } from "@sim/config/UnitDefinitions";
import { BUILDING_DEFINITIONS } from "@sim/config/BuildingDefs";
import { startMoving } from "@sim/systems/MovementSystem";
import { distanceSq } from "@sim/utils/math";
import { EventBus } from "@sim/core/EventBus";

const GATHER_RANGE_SQ = 6.25; // 2.5 tiles squared — close enough to gather

export const ResourceSystem = {
  update(state: GameState, dt: number): void {
    if (state.gameMode !== GameMode.RTS) return;

    for (const unit of state.units.values()) {
      if (unit.state === UnitState.DIE) continue;

      const def = UNIT_DEFINITIONS[unit.type];
      if (!def.isWorker) continue;

      // Worker is idle near a resource node — gather
      if (unit.gatherTargetId && unit.state === UnitState.IDLE && !unit.dropOffBuildingId) {
        _tickGathering(state, unit, dt);
      }
      // Worker is full — head to drop-off
      else if (unit.gatherTargetId && unit.carryAmount >= (def.carryCapacity ?? 10) && !unit.dropOffBuildingId) {
        _moveToDropOff(state, unit);
      }
      // Worker is carrying and moving to drop-off — check arrival
      else if (unit.dropOffBuildingId && unit.carryAmount > 0 && unit.state === UnitState.IDLE) {
        _checkDropOff(state, unit);
      }
    }
  },
};

function _tickGathering(state: GameState, unit: Unit, dt: number): void {
  const node = unit.gatherTargetId ? state.resourceNodes.get(unit.gatherTargetId) : null;
  if (!node || node.remaining <= 0) {
    unit.gatherTargetId = null;
    if (node && node.remaining <= 0) {
      EventBus.emit("resourceNodeDepleted", { nodeId: node.id });
    }
    _findNearestNode(state, unit);
    return;
  }

  // Check if close enough to gather
  const dsq = distanceSq(unit.position, node.position);
  if (dsq > GATHER_RANGE_SQ) {
    // Too far — walk closer
    startMoving(state, unit, node.position);
    return;
  }

  const def = UNIT_DEFINITIONS[unit.type];
  const gatherRate = def.gatherRate ?? 5;
  const carryCapacity = def.carryCapacity ?? 10;

  const gathered = Math.min(gatherRate * dt, node.remaining, carryCapacity - unit.carryAmount);
  unit.carryAmount += gathered;
  unit.carryType = node.type;
  node.remaining -= gathered;

  if (unit.carryAmount >= carryCapacity) {
    node.currentGatherers.delete(unit.id);
    _moveToDropOff(state, unit);
  }
}

function _moveToDropOff(state: GameState, unit: Unit): void {
  let nearest: { id: string; pos: { x: number; y: number } } | null = null;
  let nearestDsq = Infinity;

  for (const building of state.buildings.values()) {
    if (building.owner !== unit.owner) continue;
    if (building.state !== BuildingState.ACTIVE) continue;
    const bdef = BUILDING_DEFINITIONS[building.type];
    if (!bdef.isDropOff) continue;

    const dsq = distanceSq(unit.position, building.position);
    if (dsq < nearestDsq) {
      nearest = { id: building.id, pos: { ...building.position } };
      nearestDsq = dsq;
    }
  }

  if (nearest) {
    unit.dropOffBuildingId = nearest.id;
    startMoving(state, unit, nearest.pos);
  }
}

function _checkDropOff(state: GameState, unit: Unit): void {
  if (!unit.dropOffBuildingId) return;
  const building = state.buildings.get(unit.dropOffBuildingId);
  if (!building || building.state !== BuildingState.ACTIVE) {
    unit.dropOffBuildingId = null;
    _moveToDropOff(state, unit);
    return;
  }

  const dsq = distanceSq(unit.position, building.position);
  if (dsq < GATHER_RANGE_SQ + 4) {
    // Deliver resources
    const player = state.players.get(unit.owner);
    if (player && unit.carryType) {
      switch (unit.carryType) {
        case "gold":
          player.gold += Math.floor(unit.carryAmount);
          EventBus.emit("goldChanged", { playerId: player.id, amount: player.gold });
          break;
        case "wood":
          player.wood += Math.floor(unit.carryAmount);
          break;
        case "stone":
          player.stone += Math.floor(unit.carryAmount);
          break;
      }
      EventBus.emit("resourceDelivered", {
        playerId: player.id,
        resourceType: unit.carryType,
        amount: Math.floor(unit.carryAmount),
      });
    }

    unit.carryAmount = 0;
    unit.carryType = null;
    unit.dropOffBuildingId = null;

    // Return to the same resource node
    if (unit.gatherTargetId) {
      const node = state.resourceNodes.get(unit.gatherTargetId);
      if (node && node.remaining > 0) {
        startMoving(state, unit, node.position);
        return;
      }
    }
    _findNearestNode(state, unit);
  }
}

function _findNearestNode(state: GameState, unit: Unit): void {
  let nearest: { id: string; pos: { x: number; y: number } } | null = null;
  let nearestDsq = Infinity;

  for (const node of state.resourceNodes.values()) {
    if (node.remaining <= 0) continue;
    if (node.currentGatherers.size >= node.gatherersMax) continue;

    const dsq = distanceSq(unit.position, node.position);
    if (dsq < nearestDsq) {
      nearest = { id: node.id, pos: { ...node.position } };
      nearestDsq = dsq;
    }
  }

  if (nearest) {
    unit.gatherTargetId = nearest.id;
    startMoving(state, unit, nearest.pos);
  }
}
