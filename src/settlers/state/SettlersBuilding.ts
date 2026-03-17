// ---------------------------------------------------------------------------
// Settlers – Building entity
// ---------------------------------------------------------------------------

import { SettlersBuildingType, ResourceStack } from "../config/SettlersBuildingDefs";
import type { ResourceType } from "../config/SettlersResourceDefs";

/** An item in a building's production queue */
export interface ProductionQueueItem {
  /** What to produce (e.g. "soldier" for barracks) */
  type: string;
  /** Time remaining for this item (seconds); -1 means not yet started */
  timeRemaining: number;
}

export interface SettlersBuilding {
  id: string;
  type: SettlersBuildingType;
  owner: string;
  tileX: number;
  tileZ: number;

  /** 0..1 – when < 1 the building is under construction */
  constructionProgress: number;
  /** Materials still needed to complete construction */
  constructionNeeds: ResourceStack[];

  /** True when construction complete and worker assigned (or military/storage) */
  active: boolean;
  /** Assigned worker ID (null if unassigned or non-production building) */
  workerId: string | null;

  /** Countdown timer (seconds) for current production cycle */
  productionTimer: number;
  /** Resources waiting to be consumed */
  inputStorage: ResourceStack[];
  /** Produced resources waiting to be picked up */
  outputStorage: ResourceStack[];

  /** For military buildings */
  garrisonSlots: number;
  garrison: string[]; // soldier IDs
  hp: number;
  maxHp: number;

  /** The flag at this building's entrance */
  flagId: string;

  /** Queued production orders (processed one at a time, first-in-first-out) */
  productionQueue: ProductionQueueItem[];

  /** Building upgrade level (1 = base, max 3) */
  level: number;
  /** 0..1 – upgrade progress (when > 0 and < 1, upgrade is in progress) */
  upgradeProgress: number;

  /** Market trade state (only for MARKET buildings) */
  marketSellResource: ResourceType | null;
  marketBuyResource: ResourceType | null;

  /** Seconds elapsed since construction started (for fallback delivery) */
  constructionElapsed: number;
}
