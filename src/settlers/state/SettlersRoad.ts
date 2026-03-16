// ---------------------------------------------------------------------------
// Settlers – Road & flag entities
// ---------------------------------------------------------------------------

import { ResourceType } from "../config/SettlersResourceDefs";

export interface SettlersFlag {
  id: string;
  tileX: number;
  tileZ: number;
  owner: string;

  /** Goods waiting at this flag, max SB.FLAG_MAX_INVENTORY */
  inventory: FlagItem[];

  /** Connected road segment IDs */
  connectedRoads: string[];

  /** If this flag belongs to a building entrance */
  buildingId: string | null;
}

export interface FlagItem {
  type: ResourceType;
  /** Target building ID this resource is routed to (empty = unrouted) */
  targetBuildingId: string;
  /** Next flag ID in the shortest path toward target */
  nextFlagId: string;
}

export interface SettlersRoadSegment {
  id: string;
  owner: string;
  flagA: string; // flag ID
  flagB: string; // flag ID

  /** Tile positions along the road (including flag tiles at both ends) */
  path: { x: number; z: number }[];

  /** Assigned carrier ID (one carrier per road segment) */
  carrierId: string | null;
}
