// ---------------------------------------------------------------------------
// Caesar – Central game state
// ---------------------------------------------------------------------------

import { CB, type CaesarDifficulty } from "../config/CaesarBalance";
import { CaesarResourceType } from "../config/CaesarResourceDefs";
import { CaesarBuildingType, type CaesarBuildingCategory } from "../config/CaesarBuildingDefs";
import { createMap, type CaesarMapData } from "./CaesarMap";
import type { CaesarBuilding } from "./CaesarBuilding";
import type { CaesarWalker } from "./CaesarWalker";

export interface CaesarRatings {
  prosperity: number;  // 0-100
  culture: number;     // 0-100
  peace: number;       // 0-100
  favor: number;       // 0-100
}

export interface CaesarGoals {
  population: number;
  prosperity: number;
  culture: number;
  peace: number;
  favor: number;
}

export type CaesarTool =
  | "select"
  | "build"
  | "road"
  | "demolish";

export interface CaesarState {
  // Map
  map: CaesarMapData;

  // Entities
  buildings: Map<number, CaesarBuilding>;
  walkers: Map<number, CaesarWalker>;
  nextId: number;

  // Resources
  resources: Map<CaesarResourceType, number>;

  // Population
  population: number;
  maxPopulation: number;      // sum of housing capacity
  unemployed: number;

  // Ratings
  ratings: CaesarRatings;
  goals: CaesarGoals;

  // Economy
  taxTimer: number;
  tributeTimer: number;
  tributesPaid: number;
  tributesMissed: number;
  monthlyIncome: number;      // last tax collection amount
  monthlyExpense: number;     // running expense tracker

  // Immigration
  immigrantTimer: number;

  // Threats
  raidTimer: number;
  raidsPending: number;       // bandits still to spawn
  raidsDefeated: number;

  // Time
  gameTick: number;           // total ticks elapsed
  gameSpeed: number;          // multiplier (1 = normal)
  paused: boolean;
  gameOver: boolean;
  victory: boolean;

  // Difficulty
  difficulty: CaesarDifficulty;

  // UI state
  selectedTool: CaesarTool;
  selectedBuildingType: CaesarBuildingType | null;
  selectedBuildingId: number | null;
  hoveredTileX: number;
  hoveredTileY: number;

  // Screen
  screenW: number;
  screenH: number;

  // Road connectivity dirty flag
  roadDirty: boolean;
  desirabilityDirty: boolean;
}

export function createCaesarState(
  screenW: number,
  screenH: number,
  difficulty: CaesarDifficulty = "normal",
): CaesarState {
  const resources = new Map<CaesarResourceType, number>();
  resources.set(CaesarResourceType.GOLD, CB.START_GOLD);
  resources.set(CaesarResourceType.FOOD, CB.START_FOOD);
  resources.set(CaesarResourceType.WOOD, CB.START_WOOD);
  resources.set(CaesarResourceType.STONE, CB.START_STONE);
  resources.set(CaesarResourceType.WHEAT, 0);
  resources.set(CaesarResourceType.FLOUR, 0);
  resources.set(CaesarResourceType.BREAD, 0);
  resources.set(CaesarResourceType.MEAT, 0);
  resources.set(CaesarResourceType.IRON, 0);
  resources.set(CaesarResourceType.TOOLS, 0);
  resources.set(CaesarResourceType.CLOTH, 0);

  return {
    map: createMap(CB.MAP_WIDTH, CB.MAP_HEIGHT),
    buildings: new Map(),
    walkers: new Map(),
    nextId: 1,
    resources,
    population: 0,
    maxPopulation: 0,
    unemployed: 0,
    ratings: { prosperity: 50, culture: 0, peace: 100, favor: 50 },
    goals: { population: 500, prosperity: 60, culture: 50, peace: 50, favor: 40 },
    taxTimer: 0,
    tributeTimer: CB.TRIBUTE_INTERVAL,
    tributesPaid: 0,
    tributesMissed: 0,
    monthlyIncome: 0,
    monthlyExpense: 0,
    immigrantTimer: CB.IMMIGRANT_INTERVAL,
    raidTimer: CB.RAID_INTERVAL_MIN + Math.random() * (CB.RAID_INTERVAL_MAX - CB.RAID_INTERVAL_MIN),
    raidsPending: 0,
    raidsDefeated: 0,
    gameTick: 0,
    gameSpeed: 1,
    paused: false,
    gameOver: false,
    victory: false,
    difficulty,
    selectedTool: "select",
    selectedBuildingType: null,
    selectedBuildingId: null,
    hoveredTileX: -1,
    hoveredTileY: -1,
    screenW, screenH,
    roadDirty: true,
    desirabilityDirty: true,
  };
}

export function nextEntityId(state: CaesarState): number {
  return state.nextId++;
}
