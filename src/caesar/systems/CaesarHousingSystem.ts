// ---------------------------------------------------------------------------
// Caesar – Housing evolution system
// ---------------------------------------------------------------------------

import { CB } from "../config/CaesarBalance";
import { CaesarBuildingType, HOUSING_REQUIREMENTS, type CaesarServiceType } from "../config/CaesarBuildingDefs";
import type { CaesarState } from "../state/CaesarState";
import type { CaesarBuilding } from "../state/CaesarBuilding";
import { tileAt, inBounds } from "../state/CaesarMap";

const SERVICE_DURATION = 30; // seconds a service "lasts" after walker visit

/**
 * Check what services a housing plot currently has access to
 * based on tile service coverage timers.
 */
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
 * Determine the maximum tier this housing can reach based on current services
 */
function getMaxTierForServices(services: Set<CaesarServiceType>, desirability: number): number {
  for (let tier = HOUSING_REQUIREMENTS.length - 1; tier >= 0; tier--) {
    const req = HOUSING_REQUIREMENTS[tier];
    if (desirability < req.minDesirability) continue;
    const hasAll = req.services.every((s) => services.has(s));
    if (hasAll) return tier;
  }
  return 0;
}

/**
 * Update housing evolution / devolution.
 * Called periodically (every HOUSING_EVOLVE_CHECK seconds).
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

  // Process each housing building
  for (const b of state.buildings.values()) {
    if (b.type !== CaesarBuildingType.HOUSING) continue;
    if (!b.built) continue;

    const services = getHousingServices(state, b);
    b.services = services;

    const tile = tileAt(state.map, b.tileX, b.tileY);
    const desirability = tile ? tile.desirability : 0;
    const maxTier = getMaxTierForServices(services, desirability);

    if (maxTier > b.housingTier) {
      // Evolve!
      b.housingTier = Math.min(b.housingTier + 1, maxTier);
      b.devolveTimer = 0;
      // Update capacity
      const newCap = CB.HOUSING_CAPACITY[b.housingTier];
      // Residents stay, but capacity increases allowing immigration
    } else if (maxTier < b.housingTier) {
      // Start devolve countdown
      b.devolveTimer += dt;
      if (b.devolveTimer >= CB.HOUSING_DEVOLVE_DELAY) {
        b.housingTier = Math.max(maxTier, b.housingTier - 1);
        b.devolveTimer = 0;
        // Evict excess residents
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
        case "food": tile.serviceFood = SERVICE_DURATION; break;
        case "religion": tile.serviceReligion = SERVICE_DURATION; break;
        case "safety": tile.serviceSafety = SERVICE_DURATION; break;
        case "entertainment": tile.serviceEntertainment = SERVICE_DURATION; break;
        case "commerce": tile.serviceCommerce = SERVICE_DURATION; break;
        case "water": tile.serviceWater = SERVICE_DURATION; break;
      }
    }
  }
}
