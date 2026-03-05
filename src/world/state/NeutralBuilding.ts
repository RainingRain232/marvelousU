// Neutral building state for world mode.
//
// Neutral buildings are tile improvements that spawn on the map and can be
// captured by players. They provide gold income and are defended by neutral armies.

import type { HexCoord } from "@world/hex/HexCoord";
import type { ArmyUnit } from "@world/state/WorldArmy";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NeutralBuildingType = "farm" | "mill" | "tower" | "mage_tower" | "blacksmith" | "market" | "temple" | "embassy" | "faction_hall" | "stables" | "barracks" | "elite_barracks" | "elite_stables" | "elite_hall";

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
  /** Mana income per turn when owned (mage_tower). */
  manaIncome: number;
  /** Whether the defenders have been defeated. */
  captured: boolean;
  /** Whether the one-time armory reward has been claimed (blacksmith). */
  armoryRewardClaimed: boolean;
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
  const eliteTypes: NeutralBuildingType[] = ["elite_barracks", "elite_stables", "elite_hall"];
  const milTypes: NeutralBuildingType[] = ["faction_hall", "stables", "barracks"];
  const goldIncome = type === "market" ? 20 : type === "embassy" ? 20 : eliteTypes.includes(type) ? 10 : milTypes.includes(type) ? 5 : type === "tower" ? 2 : type === "blacksmith" ? 2 : type === "mage_tower" ? 0 : type === "temple" ? 0 : 1;
  const manaIncome = type === "mage_tower" ? 10 : type === "temple" ? 20 : 0;

  return {
    id,
    type,
    position,
    owner: null,
    defenders,
    goldIncome,
    manaIncome,
    captured: false,
    armoryRewardClaimed: false,
  };
}
