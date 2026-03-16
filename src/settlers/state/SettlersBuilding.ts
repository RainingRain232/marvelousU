// ---------------------------------------------------------------------------
// Settlers – Building entity
// ---------------------------------------------------------------------------

import { SettlersBuildingType, ResourceStack } from "../config/SettlersBuildingDefs";

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
}
