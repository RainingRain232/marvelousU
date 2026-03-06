// Tile-based overworld map state
import type { OverworldTileType, Vec2 } from "@/types";
import type { RPGItem } from "./RPGState";
import type { ShopTier } from "@rpg/config/RPGItemDefs";

// ---------------------------------------------------------------------------
// Tiles
// ---------------------------------------------------------------------------

export interface OverworldTile {
  x: number;
  y: number;
  type: OverworldTileType;
  walkable: boolean;
  movementCost: number;
  entityId: string | null;
  discovered: boolean;
  encounterRate: number;
}

// ---------------------------------------------------------------------------
// Entities on the overworld
// ---------------------------------------------------------------------------

export interface RecruitData {
  id: string;
  name: string;
  unitType: string;
  level: number;
  description: string;
  cost: number;
  abilityTypes?: string[];
  startingSpells?: string[];
}

export interface TownData {
  shopItems: RPGItem[];
  shopTier: ShopTier;
  innCost: number;
  quests: string[];
  recruits?: RecruitData[];
  /** Spells available for purchase at the magic shop (max 5, spell UpgradeType ids). */
  magicShopSpells?: string[];
}

/** Data for the Arcane Library — sells higher-tier spells (T4+). */
export interface ArcaneLibraryData {
  /** Spells for sale (UpgradeType ids). */
  spells: string[];
}

export interface DungeonEntranceData {
  dungeonId: string;
  requiredLevel: number;
  requiredKeyItem?: string;
}

export interface NPCData {
  dialogue: string[];
  questId?: string;
  /** If set, this NPC is a legendary leader from LeaderEncounterDefs. */
  leaderId?: string;
}

export interface ChestData {
  items: RPGItem[];
  opened: boolean;
}

export type OverworldEntityData = TownData | DungeonEntranceData | NPCData | ChestData | ArcaneLibraryData;

export interface OverworldEntity {
  id: string;
  type: "town" | "dungeon_entrance" | "npc" | "chest" | "landmark" | "arcane_library";
  position: Vec2;
  name: string;
  data: OverworldEntityData;
}

// ---------------------------------------------------------------------------
// OverworldState
// ---------------------------------------------------------------------------

export interface OverworldState {
  grid: OverworldTile[][];
  width: number;
  height: number;
  entities: Map<string, OverworldEntity>;
  partyPosition: Vec2;
  stepsSinceLastEncounter: number;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createOverworldState(
  grid: OverworldTile[][],
  width: number,
  height: number,
  startPosition: Vec2,
): OverworldState {
  return {
    grid,
    width,
    height,
    entities: new Map(),
    partyPosition: { ...startPosition },
    stepsSinceLastEncounter: 0,
  };
}
