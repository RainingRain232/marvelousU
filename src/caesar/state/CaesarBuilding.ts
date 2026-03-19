// ---------------------------------------------------------------------------
// Caesar – Building entity
// ---------------------------------------------------------------------------

import { CaesarBuildingType, type CaesarServiceType } from "../config/CaesarBuildingDefs";
import { CaesarResourceType } from "../config/CaesarResourceDefs";

export interface CaesarBuilding {
  id: number;
  type: CaesarBuildingType;
  tileX: number;
  tileY: number;

  // Construction
  built: boolean;             // false while under construction
  constructionProgress: number; // 0-1

  // Production
  productionTimer: number;    // seconds accumulated
  inputStorage: Map<CaesarResourceType, number>;
  outputStorage: Map<CaesarResourceType, number>;

  // Housing-specific
  housingTier: number;        // 0-4 (Hovel..Estate)
  residents: number;          // current population in this house
  services: Set<CaesarServiceType>; // services currently received
  devolveTimer: number;       // seconds until devolve if services lost

  // Walker spawning
  walkerTimer: number;        // seconds until next walker spawn

  // Health
  hp: number;
  maxHp: number;

  // Workers assigned
  workers: number;
}

export function createBuilding(
  id: number,
  type: CaesarBuildingType,
  tileX: number,
  tileY: number,
  maxHp: number,
): CaesarBuilding {
  return {
    id, type, tileX, tileY,
    built: false,
    constructionProgress: 0,
    productionTimer: 0,
    inputStorage: new Map(),
    outputStorage: new Map(),
    housingTier: 0,
    residents: 0,
    services: new Set(),
    devolveTimer: 0,
    walkerTimer: 0,
    hp: maxHp,
    maxHp,
    workers: 0,
  };
}
