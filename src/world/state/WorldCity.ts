// City entity for world mode.

import type { HexCoord } from "@world/hex/HexCoord";
import type { BuildingType } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A building constructed inside a world city. */
export interface WorldCityBuilding {
  type: BuildingType;
  /** Turn the building was completed. */
  completedTurn: number;
}

/** An item currently under construction. */
export interface ConstructionItem {
  buildingType: BuildingType;
  /** Production points already invested. */
  invested: number;
  /** Total production cost. */
  cost: number;
}

/** A batch of units being recruited. */
export interface RecruitmentEntry {
  unitType: string; // UnitType enum value
  count: number;
  goldCost: number;
  /** Turns remaining until units are ready (0 = ready this turn). */
  turnsLeft: number;
}

export interface WorldCity {
  id: string;
  name: string;
  owner: string; // player id
  position: HexCoord;

  population: number;
  foodStockpile: number;

  /** Buildings completed in this city. */
  buildings: WorldCityBuilding[];
  /** Construction queue (first item is active). */
  constructionQueue: ConstructionItem[];
  /** Units being recruited (multiple batches allowed). */
  recruitmentQueue: RecruitmentEntry[];

  /** Hexes this city is working for yields. */
  workedTiles: HexCoord[];
  /** All hexes in this city's territory. */
  territory: HexCoord[];

  /** True if an enemy army is on or adjacent to this city. */
  isUnderSiege: boolean;
  /** Army garrisoned in this city (null = no garrison). */
  garrisonArmyId: string | null;

  /** Is this the player's capital? */
  isCapital: boolean;
}

// ---------------------------------------------------------------------------
// City name pool
// ---------------------------------------------------------------------------

const CITY_NAMES = [
  "Stonekeep", "Ashford", "Ironhold", "Thornwall", "Duskreach",
  "Brightmere", "Coldspire", "Ravenmoor", "Goldcrest", "Silverpeak",
  "Deepholm", "Stormwatch", "Oakenvale", "Frostgate", "Emberhall",
  "Shadowfen", "Crystalvale", "Windmere", "Dragonspire", "Sunhaven",
  "Greymount", "Blackthorn", "Whitecliff", "Redwater", "Bluecrest",
  "Lionheart", "Wolfden", "Hawkridge", "Serpentine", "Dawnbreak",
];

let _nameIndex = 0;

export function nextCityName(): string {
  const name = CITY_NAMES[_nameIndex % CITY_NAMES.length];
  _nameIndex++;
  return name;
}

export function resetCityNames(): void {
  _nameIndex = 0;
}

export function setCityNameIndex(n: number): void {
  _nameIndex = n;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createWorldCity(
  id: string,
  owner: string,
  position: HexCoord,
  isCapital: boolean,
): WorldCity {
  return {
    id,
    name: nextCityName(),
    owner,
    position,
    population: 1,
    foodStockpile: 0,
    buildings: [],
    constructionQueue: [],
    recruitmentQueue: [],
    workedTiles: [position],
    territory: [position],
    isUnderSiege: false,
    garrisonArmyId: null,
    isCapital,
  };
}
