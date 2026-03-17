// ---------------------------------------------------------------------------
// Settlers – Top-level game state + factory
// ---------------------------------------------------------------------------

import { SB } from "../config/SettlersBalance";
import type { SettlersBuildingType } from "../config/SettlersBuildingDefs";
import type { SettlersMap } from "./SettlersMap";
import type { SettlersBuilding } from "./SettlersBuilding";
import type { SettlersFlag, SettlersRoadSegment } from "./SettlersRoad";
import type { SettlersCarrier, SettlersSoldier, SettlersCombat } from "./SettlersUnit";
import type { SettlersPlayer } from "./SettlersPlayer";

// Re-export for convenience
export type { SettlersMap, SettlersBuilding, SettlersFlag, SettlersRoadSegment };
export type { SettlersCarrier, SettlersSoldier, SettlersCombat, SettlersPlayer };

export type SettlersTool = "select" | "build" | "road" | "flag" | "demolish" | "attack";
export type SettlersDifficulty = "easy" | "normal" | "hard";

export interface SettlersState {
  tick: number;
  paused: boolean;
  gameOver: boolean;
  winner: string | null;

  map: SettlersMap;
  players: Map<string, SettlersPlayer>;
  buildings: Map<string, SettlersBuilding>;
  flags: Map<string, SettlersFlag>;
  roads: Map<string, SettlersRoadSegment>;
  carriers: Map<string, SettlersCarrier>;
  soldiers: Map<string, SettlersSoldier>;
  combats: SettlersCombat[];

  nextId: number;

  // UI state
  selectedTool: SettlersTool;
  selectedBuildingType: SettlersBuildingType | null;
  hoveredTile: { x: number; z: number } | null;
  selectedBuildingId: string | null;

  // Road drawing mode
  roadDrawing: {
    active: boolean;
    startFlagId: string | null;
    path: { x: number; z: number }[];
  };

  screenW: number;
  screenH: number;

  /** AI difficulty level */
  difficulty: SettlersDifficulty;

  /** Game speed multiplier (1 = 100%, max 10 = 1000%) */
  gameSpeed: number;

  /** Dirty flag – set when buildings are placed, destroyed, or captured */
  territoryDirty: boolean;

  /** Dirty flag for fog of war recalculation */
  fogDirty: boolean;
}

/** Generate a unique ID */
export function nextId(state: SettlersState): string {
  return `s${state.nextId++}`;
}

/** Create initial state (map populated by TerrainSystem, buildings placed later) */
export function createSettlersState(screenW: number, screenH: number): SettlersState {
  const totalTiles = SB.MAP_WIDTH * SB.MAP_HEIGHT;
  const totalVerts = (SB.MAP_WIDTH + 1) * (SB.MAP_HEIGHT + 1);

  const map: SettlersMap = {
    width: SB.MAP_WIDTH,
    height: SB.MAP_HEIGHT,
    tileSize: SB.TILE_SIZE,
    heightmap: new Float32Array(totalVerts),
    biomes: new Uint8Array(totalTiles),
    deposits: new Uint8Array(totalTiles),
    territory: new Int8Array(totalTiles).fill(-1),
    buildable: new Uint8Array(totalTiles),
    occupied: new Array(totalTiles).fill(""),
    visibility: [
      new Uint8Array(totalTiles), // p0 – all HIDDEN (0)
      new Uint8Array(totalTiles), // p1 – all HIDDEN (0)
    ],
    trees: [],
    rocks: [],
  };

  return {
    tick: 0,
    paused: false,
    gameOver: false,
    winner: null,
    map,
    players: new Map(),
    buildings: new Map(),
    flags: new Map(),
    roads: new Map(),
    carriers: new Map(),
    soldiers: new Map(),
    combats: [],
    nextId: 1,
    selectedTool: "select",
    selectedBuildingType: null,
    hoveredTile: null,
    selectedBuildingId: null,
    roadDrawing: { active: false, startFlagId: null, path: [] },
    screenW,
    screenH,
    difficulty: "normal",
    gameSpeed: 1,
    territoryDirty: true,
    fogDirty: true,
  };
}
