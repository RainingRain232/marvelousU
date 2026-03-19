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
  built: boolean;
  constructionProgress: number; // 0-1

  // Production
  productionTimer: number;
  inputStorage: Map<CaesarResourceType, number>;
  outputStorage: Map<CaesarResourceType, number>;

  // Housing-specific
  housingTier: number;        // 0-4 (Hovel..Estate)
  residents: number;
  services: Set<CaesarServiceType>;
  devolveTimer: number;
  evolveCooldown: number;

  // Walker spawning
  walkerTimer: number;

  // Health
  hp: number;
  maxHp: number;

  // Workers assigned
  workers: number;
  workerPriority: "high" | "normal" | "low";

  // Tower attack timer
  attackTimer: number;

  // Building level (upgrades)
  level: number;              // 1-3
  upgrading: boolean;
  upgradeProgress: number;    // 0-1

  // Fire
  onFire: boolean;
  fireTimer: number;          // seconds remaining
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
    evolveCooldown: 0,
    walkerTimer: 0,
    hp: maxHp,
    maxHp,
    workers: 0,
    workerPriority: "normal",
    attackTimer: 0,
    level: 1,
    upgrading: false,
    upgradeProgress: 0,
    onFire: false,
    fireTimer: 0,
  };
}
