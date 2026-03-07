// RTS command processor — translates player/AI commands into unit state changes.
// Runs before AISystem so commanded units skip auto-battle behavior.

import type { GameState } from "@sim/state/GameState";
import type { Unit } from "@sim/entities/Unit";
import { CommandType } from "@sim/state/CommandTypes";
import { UnitState, GameMode } from "@/types";
import { startMoving } from "@sim/systems/MovementSystem";
import { distanceSq } from "@sim/utils/math";

export const CommandSystem = {
  update(state: GameState, _dt: number): void {
    if (state.gameMode !== GameMode.RTS) return;

    for (const unit of state.units.values()) {
      if (unit.state === UnitState.DIE) continue;
      if (!unit.command) continue;

      _processCommand(state, unit);
    }
  },
};

function _processCommand(state: GameState, unit: Unit): void {
  const cmd = unit.command!;

  switch (cmd.type) {
    case CommandType.MOVE:
      _handleMove(state, unit);
      break;
    case CommandType.ATTACK_MOVE:
      _handleAttackMove(state, unit);
      break;
    case CommandType.ATTACK:
      _handleAttack(state, unit);
      break;
    case CommandType.HOLD:
      _handleHold(unit);
      break;
    case CommandType.STOP:
      _handleStop(unit);
      break;
    case CommandType.PATROL:
      _handlePatrol(state, unit);
      break;
    case CommandType.GATHER:
      // Handled by ResourceSystem
      break;
    case CommandType.BUILD:
      // Handled by ConstructionSystem
      break;
  }
}

function _handleMove(state: GameState, unit: Unit): void {
  const cmd = unit.command!;
  if (!cmd.targetPosition) { _advanceQueue(unit); return; }

  if (unit.state === UnitState.IDLE || unit.state === UnitState.MOVE) {
    // Check if arrived
    const dsq = distanceSq(unit.position, cmd.targetPosition);
    if (dsq < 1.5) {
      _advanceQueue(unit);
      return;
    }
    // Start/continue moving
    if (unit.state === UnitState.IDLE || !unit.path || unit.path.length === 0) {
      startMoving(state, unit, cmd.targetPosition);
    }
  }
}

function _handleAttackMove(state: GameState, unit: Unit): void {
  const cmd = unit.command!;
  if (!cmd.targetPosition) { _advanceQueue(unit); return; }

  // If unit is attacking an enemy, let CombatSystem handle it — don't interrupt
  if (unit.state === UnitState.ATTACK && unit.targetId) return;

  // Otherwise move toward target position (CombatSystem will auto-engage enemies in range)
  if (unit.state === UnitState.IDLE || unit.state === UnitState.MOVE) {
    const dsq = distanceSq(unit.position, cmd.targetPosition);
    if (dsq < 1.5) {
      _advanceQueue(unit);
      return;
    }
    if (unit.state === UnitState.IDLE || !unit.path || unit.path.length === 0) {
      startMoving(state, unit, cmd.targetPosition);
    }
  }
}

function _handleAttack(state: GameState, unit: Unit): void {
  const cmd = unit.command!;
  if (!cmd.targetEntityId) { _advanceQueue(unit); return; }

  // Check if target still exists
  const targetUnit = state.units.get(cmd.targetEntityId);
  const targetBuilding = state.buildings.get(cmd.targetEntityId);

  if (!targetUnit && !targetBuilding) {
    _advanceQueue(unit);
    return;
  }

  if (targetUnit && targetUnit.state === UnitState.DIE) {
    _advanceQueue(unit);
    return;
  }

  // Set the target for CombatSystem to pick up
  unit.targetId = cmd.targetEntityId;

  // Move toward target if not in range
  const targetPos = targetUnit?.position ?? targetBuilding?.position;
  if (targetPos && unit.state !== UnitState.ATTACK) {
    const dsq = distanceSq(unit.position, targetPos);
    if (dsq > unit.range * unit.range) {
      startMoving(state, unit, targetPos);
    }
  }
}

function _handleHold(unit: Unit): void {
  unit.holdPosition = true;
  unit.path = null;
  unit.pathIndex = 0;
  if (unit.state === UnitState.MOVE) {
    unit.state = UnitState.IDLE;
  }
  // Hold is persistent — don't advance queue
}

function _handleStop(unit: Unit): void {
  unit.holdPosition = false;
  unit.path = null;
  unit.pathIndex = 0;
  unit.targetId = null;
  if (unit.state === UnitState.MOVE) {
    unit.state = UnitState.IDLE;
  }
  unit.command = null;
  unit.commandQueue = [];
}

function _handlePatrol(state: GameState, unit: Unit): void {
  const cmd = unit.command!;
  if (!cmd.targetPosition) { _advanceQueue(unit); return; }

  // Patrol alternates between current position and target
  // If attacking, let combat handle it
  if (unit.state === UnitState.ATTACK) return;

  if (unit.state === UnitState.IDLE || !unit.path || unit.path.length === 0) {
    const dsq = distanceSq(unit.position, cmd.targetPosition);
    if (dsq < 1.5) {
      // Arrived at patrol point — swap to return position
      // Store current position as new target, swap
      const returnPos = { ...unit.position };
      cmd.targetPosition = returnPos;
    }
    startMoving(state, unit, cmd.targetPosition);
  }
}

/** Advance to next queued command, or clear command if queue is empty. */
function _advanceQueue(unit: Unit): void {
  if (unit.commandQueue.length > 0) {
    unit.command = unit.commandQueue.shift()!;
  } else {
    unit.command = null;
    unit.holdPosition = false;
  }
}
