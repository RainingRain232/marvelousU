// ---------------------------------------------------------------------------
// Caesar – Housing evolution system
// ---------------------------------------------------------------------------

import { CB } from "../config/CaesarBalance";
import { CaesarBuildingType, HOUSING_REQUIREMENTS, type CaesarServiceType } from "../config/CaesarBuildingDefs";
import { CaesarResourceType } from "../config/CaesarResourceDefs";
import type { CaesarState } from "../state/CaesarState";
import type { CaesarBuilding } from "../state/CaesarBuilding";
import { tileAt, inBounds } from "../state/CaesarMap";

function getHousingServices(state: CaesarState, b: CaesarBuilding): Set<CaesarServiceType> {
  const services = new Set<CaesarServiceType>();
  const tile = tileAt(state.map, b.tileX, b.tileY);
  if (!tile) return services;

  if (tile.serviceWater > 0) services.add("water");
  if (tile.serviceFood > 0) services.add("food");
  if (tile.serviceReligion > 0) services.add("religion");
  if (tile.serviceSafety > 0) services.add("safety");
  if (tile.serviceEntertainment > 0) services.add("entertainment");
  if (tile.serviceCommerce > 0) services.add("commerce");

  return services;
}

/**
 * Check if the required goods for a tier are available globally.
 */
function hasRequiredGoods(state: CaesarState, tier: number): boolean {
  const req = HOUSING_REQUIREMENTS[tier];
  if (!req) return true;
  for (const good of req.requiresGoods) {
    if (good === "cloth" && (state.resources.get(CaesarResourceType.CLOTH) ?? 0) <= 0) return false;
    if (good === "tools" && (state.resources.get(CaesarResourceType.TOOLS) ?? 0) <= 0) return false;
  }
  return true;
}

function getMaxTierForServices(state: CaesarState, services: Set<CaesarServiceType>, desirability: number): number {
  for (let tier = HOUSING_REQUIREMENTS.length - 1; tier >= 0; tier--) {
    const req = HOUSING_REQUIREMENTS[tier];
    if (desirability < req.minDesirability) continue;
    const hasAll = req.services.every((s) => services.has(s));
    if (!hasAll) continue;
    // Check goods availability for evolving TO this tier
    if (!hasRequiredGoods(state, tier)) continue;
    return tier;
  }
  return 0;
}

/**
 * Update housing evolution / devolution.
 */
export function updateHousing(state: CaesarState, dt: number): void {
  // Decay service timers on tiles
  for (const tile of state.map.tiles) {
    if (tile.serviceFood > 0) tile.serviceFood = Math.max(0, tile.serviceFood - dt);
    if (tile.serviceReligion > 0) tile.serviceReligion = Math.max(0, tile.serviceReligion - dt);
    if (tile.serviceSafety > 0) tile.serviceSafety = Math.max(0, tile.serviceSafety - dt);
    if (tile.serviceEntertainment > 0) tile.serviceEntertainment = Math.max(0, tile.serviceEntertainment - dt);
    if (tile.serviceCommerce > 0) tile.serviceCommerce = Math.max(0, tile.serviceCommerce - dt);
    if (tile.serviceWater > 0) tile.serviceWater = Math.max(0, tile.serviceWater - dt);
  }

  for (const b of state.buildings.values()) {
    if (b.type !== CaesarBuildingType.HOUSING) continue;
    if (!b.built) continue;

    const services = getHousingServices(state, b);
    b.services = services;

    const tile = tileAt(state.map, b.tileX, b.tileY);
    const desirability = tile ? tile.desirability : 0;
    const maxTier = getMaxTierForServices(state, services, desirability);

    if (b.evolveCooldown > 0) {
      b.evolveCooldown = Math.max(0, b.evolveCooldown - dt);
    }

    if (maxTier > b.housingTier) {
      if (b.evolveCooldown <= 0) {
        b.housingTier = Math.min(b.housingTier + 1, 4);
        b.evolveCooldown = CB.HOUSING_EVOLVE_COOLDOWN;
        b.devolveTimer = 0;
      }
    } else if (maxTier < b.housingTier) {
      b.devolveTimer += dt;
      if (b.devolveTimer >= CB.HOUSING_DEVOLVE_DELAY) {
        b.housingTier = Math.max(maxTier, b.housingTier - 1);
        b.devolveTimer = 0;
        const cap = CB.HOUSING_CAPACITY[b.housingTier];
        if (b.residents > cap) {
          const evicted = b.residents - cap;
          b.residents = cap;
          state.population = Math.max(0, state.population - evicted);
        }
      }
    } else {
      b.devolveTimer = 0;
    }
  }

  // Recalculate max population
  let maxPop = 0;
  for (const b of state.buildings.values()) {
    if (b.type === CaesarBuildingType.HOUSING && b.built) {
      maxPop += CB.HOUSING_CAPACITY[b.housingTier];
    }
  }
  state.maxPopulation = maxPop;
}

/**
 * Consume cloth/tools for high-tier housing. Called periodically from economy system.
 */
export function consumeHousingGoods(state: CaesarState): void {
  let clothNeeded = 0;
  let toolsNeeded = 0;

  for (const b of state.buildings.values()) {
    if (b.type !== CaesarBuildingType.HOUSING || !b.built || b.residents === 0) continue;
    if (b.housingTier >= 3) clothNeeded += CB.HOUSING_CLOTH_PER_MANOR;
    if (b.housingTier >= 4) toolsNeeded += CB.HOUSING_TOOLS_PER_ESTATE;
  }

  if (clothNeeded > 0) {
    const cloth = state.resources.get(CaesarResourceType.CLOTH) ?? 0;
    state.resources.set(CaesarResourceType.CLOTH, Math.max(0, cloth - clothNeeded));
  }
  if (toolsNeeded > 0) {
    const tools = state.resources.get(CaesarResourceType.TOOLS) ?? 0;
    state.resources.set(CaesarResourceType.TOOLS, Math.max(0, tools - toolsNeeded));
  }
}

/**
 * Apply service coverage from a walker at position (wx, wy) with given radius.
 */
export function applyServiceCoverage(
  state: CaesarState,
  wx: number,
  wy: number,
  service: CaesarServiceType,
  radius: number,
): void {
  const tx = Math.floor(wx);
  const ty = Math.floor(wy);

  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const nx = tx + dx;
      const ny = ty + dy;
      if (!inBounds(state.map, nx, ny)) continue;
      if (Math.abs(dx) + Math.abs(dy) > radius) continue;

      const tile = tileAt(state.map, nx, ny);
      if (!tile) continue;

      switch (service) {
        case "food": tile.serviceFood = CB.SERVICE_DURATION; break;
        case "religion": tile.serviceReligion = CB.SERVICE_DURATION; break;
        case "safety": tile.serviceSafety = CB.SERVICE_DURATION; break;
        case "entertainment": tile.serviceEntertainment = CB.SERVICE_DURATION; break;
        case "commerce": tile.serviceCommerce = CB.SERVICE_DURATION; break;
        case "water": tile.serviceWater = CB.SERVICE_DURATION; break;
      }
    }
  }
}
