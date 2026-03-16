// ---------------------------------------------------------------------------
// Settlers – Player state
// ---------------------------------------------------------------------------

import { ResourceType } from "../config/SettlersResourceDefs";

export interface SettlersPlayer {
  id: string;
  name: string;
  color: number;       // hex color for territory/units
  isAI: boolean;

  /** Global resource storage (sum of all storehouses + HQ) */
  storage: Map<ResourceType, number>;

  /** Available workers (not yet assigned to buildings) */
  availableWorkers: number;
  /** Total soldiers not garrisoned */
  freeSoldiers: number;

  /** HQ building ID */
  hqId: string;

  /** Has this player been eliminated? */
  defeated: boolean;
}
