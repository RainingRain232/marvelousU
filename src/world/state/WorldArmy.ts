// Army entity for world mode.

import type { HexCoord } from "@world/hex/HexCoord";
import { WorldBalance } from "@world/config/WorldConfig";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A stack of units of one type inside an army. */
export interface ArmyUnit {
  unitType: string; // UnitType enum value
  count: number;
  /** HP per individual unit (for tracking battle damage). */
  hpPerUnit: number;
}

export interface WorldArmy {
  id: string;
  name: string;
  owner: string; // player id
  position: HexCoord;

  /** Unit stacks in this army. */
  units: ArmyUnit[];

  /** Movement points remaining this turn. */
  movementPoints: number;
  /** Maximum movement points per turn. */
  maxMovementPoints: number;

  /** Planned path (null = none). */
  path: HexCoord[] | null;

  /** True if this army is a city garrison (not on the world map). */
  isGarrison: boolean;
}

// ---------------------------------------------------------------------------
// Army name pool
// ---------------------------------------------------------------------------

let _armyIndex = 0;

export function nextArmyName(): string {
  _armyIndex++;
  return `Army ${_armyIndex}`;
}

export function resetArmyNames(): void {
  _armyIndex = 0;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createWorldArmy(
  id: string,
  owner: string,
  position: HexCoord,
  units: ArmyUnit[],
  isGarrison = false,
): WorldArmy {
  return {
    id,
    name: isGarrison ? "Garrison" : nextArmyName(),
    owner,
    position,
    units: [...units],
    movementPoints: WorldBalance.BASE_MOVEMENT_POINTS,
    maxMovementPoints: WorldBalance.BASE_MOVEMENT_POINTS,
    path: null,
    isGarrison,
  };
}

/** Total number of individual units in an army. */
export function armyUnitCount(army: WorldArmy): number {
  let total = 0;
  for (const u of army.units) total += u.count;
  return total;
}
