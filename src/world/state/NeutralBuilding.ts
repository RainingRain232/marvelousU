// Neutral building state for world mode.
//
// Neutral buildings are tile improvements that spawn on the map and can be
// captured by players. They provide gold income and are defended by neutral armies.

import type { HexCoord } from "@world/hex/HexCoord";
import type { ArmyUnit } from "@world/state/WorldArmy";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NeutralBuildingType = "farm" | "mill" | "tower";

export interface NeutralBuilding {
  id: string;
  type: NeutralBuildingType;
  position: HexCoord;
  /** Owner player id (null = uncaptured neutral). */
  owner: string | null;
  /** Defending army (null once captured). */
  defenders: ArmyUnit[];
  /** Gold income per turn when owned. */
  goldIncome: number;
  /** Whether the defenders have been defeated. */
  captured: boolean;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createNeutralBuilding(
  id: string,
  type: NeutralBuildingType,
  position: HexCoord,
  defenders: ArmyUnit[],
): NeutralBuilding {
  const goldIncome = type === "tower" ? 2 : 1;

  return {
    id,
    type,
    position,
    owner: null,
    defenders,
    goldIncome,
    captured: false,
  };
}
