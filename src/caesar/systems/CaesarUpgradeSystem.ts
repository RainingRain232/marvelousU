// ---------------------------------------------------------------------------
// Caesar – Building upgrade system
// ---------------------------------------------------------------------------

import { CB } from "../config/CaesarBalance";
import { CaesarBuildingType, CAESAR_BUILDING_DEFS } from "../config/CaesarBuildingDefs";
import { CaesarResourceType } from "../config/CaesarResourceDefs";
import type { CaesarState } from "../state/CaesarState";
import type { CaesarBuilding } from "../state/CaesarBuilding";

/**
 * Check if a building can be upgraded.
 */
export function canUpgrade(state: CaesarState, building: CaesarBuilding): { ok: boolean; cost: number; reason: string } {
  if (!building.built) return { ok: false, cost: 0, reason: "Still under construction" };
  if (building.upgrading) return { ok: false, cost: 0, reason: "Already upgrading" };
  if (building.level >= CB.MAX_BUILDING_LEVEL) return { ok: false, cost: 0, reason: "Maximum level reached" };
  if (building.onFire) return { ok: false, cost: 0, reason: "Building is on fire!" };

  // Only production buildings can be upgraded
  const bdef = CAESAR_BUILDING_DEFS[building.type];
  if (bdef.productionTime <= 0 && !bdef.walkerService) {
    return { ok: false, cost: 0, reason: "This building type cannot be upgraded" };
  }

  // Non-upgradeable types
  if (building.type === CaesarBuildingType.ROAD || building.type === CaesarBuildingType.WALL ||
      building.type === CaesarBuildingType.GATE || building.type === CaesarBuildingType.HOUSING) {
    return { ok: false, cost: 0, reason: "This building type cannot be upgraded" };
  }

  const cost = Math.floor(bdef.cost * CB.UPGRADE_COST_MULT * building.level);
  const gold = state.resources.get(CaesarResourceType.GOLD) ?? 0;
  if (gold < cost) return { ok: false, cost, reason: `Need ${cost} gold (have ${Math.floor(gold)})` };

  return { ok: true, cost, reason: "" };
}

/**
 * Start upgrading a building.
 */
export function startUpgrade(state: CaesarState, buildingId: number): boolean {
  const b = state.buildings.get(buildingId);
  if (!b) return false;

  const check = canUpgrade(state, b);
  if (!check.ok) return false;

  const gold = state.resources.get(CaesarResourceType.GOLD) ?? 0;
  state.resources.set(CaesarResourceType.GOLD, gold - check.cost);

  b.upgrading = true;
  b.upgradeProgress = 0;
  return true;
}

/**
 * Update building upgrade progress.
 */
export function updateUpgrades(state: CaesarState, dt: number): void {
  for (const b of state.buildings.values()) {
    if (!b.upgrading) continue;

    const bdef = CAESAR_BUILDING_DEFS[b.type];
    const upgradeTime = bdef.buildTime * CB.UPGRADE_BUILD_TIME_MULT;

    b.upgradeProgress += dt / upgradeTime;
    if (b.upgradeProgress >= 1) {
      b.upgradeProgress = 0;
      b.upgrading = false;
      b.level++;
      // Increase max HP with level
      b.maxHp = Math.floor(b.maxHp * 1.2);
      b.hp = b.maxHp;
    }
  }
}

/**
 * Get the production speed multiplier from building level.
 */
export function getLevelSpeedMult(level: number): number {
  return 1 + (level - 1) * CB.UPGRADE_SPEED_BONUS;
}

/**
 * Get the output multiplier from building level.
 */
export function getLevelOutputMult(level: number): number {
  return 1 + (level - 1) * CB.UPGRADE_OUTPUT_BONUS;
}
