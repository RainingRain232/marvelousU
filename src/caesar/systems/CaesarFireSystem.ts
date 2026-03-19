// ---------------------------------------------------------------------------
// Caesar – Fire system: buildings catch fire, spread, watchposts suppress
// ---------------------------------------------------------------------------

import { CB } from "../config/CaesarBalance";
import { CaesarBuildingType, CAESAR_BUILDING_DEFS } from "../config/CaesarBuildingDefs";
import type { CaesarState } from "../state/CaesarState";

/**
 * Check for new fires and process burning buildings.
 */
export function updateFires(state: CaesarState, dt: number): void {
  // --- Process existing fires ---
  const destroyed: number[] = [];

  for (const b of state.buildings.values()) {
    if (!b.onFire) continue;

    b.fireTimer -= dt;
    b.hp -= CB.FIRE_DAMAGE_PER_SEC * dt;

    if (b.hp <= 0) {
      destroyed.push(b.id);
      continue;
    }

    if (b.fireTimer <= 0) {
      // Fire burns out
      b.onFire = false;
      b.fireTimer = 0;
    }
  }

  // Destroy burned-down buildings
  for (const id of destroyed) {
    const b = state.buildings.get(id);
    if (b) {
      if (b.type === CaesarBuildingType.HOUSING) {
        state.population = Math.max(0, state.population - b.residents);
      }
      // Remove associated walkers
      for (const [wid, w] of state.walkers) {
        if (w.sourceBuilding === id) state.walkers.delete(wid);
      }
      state.buildings.delete(id);
      state.roadDirty = true;
      state.desirabilityDirty = true;
    }
  }

  // --- Fire spread check (every second approximately) ---
  for (const b of state.buildings.values()) {
    if (!b.onFire || !b.built) continue;

    // Chance to spread to nearby buildings
    if (Math.random() > CB.FIRE_SPREAD_CHANCE * dt) continue;

    const bdef = CAESAR_BUILDING_DEFS[b.type];
    const bcx = b.tileX + bdef.footprint.w / 2;
    const bcy = b.tileY + bdef.footprint.h / 2;

    for (const other of state.buildings.values()) {
      if (other.id === b.id || other.onFire || !other.built) continue;
      if (other.type === CaesarBuildingType.ROAD || other.type === CaesarBuildingType.WELL) continue;

      const odef = CAESAR_BUILDING_DEFS[other.type];
      const ocx = other.tileX + odef.footprint.w / 2;
      const ocy = other.tileY + odef.footprint.h / 2;
      const dist = Math.sqrt((bcx - ocx) ** 2 + (bcy - ocy) ** 2);

      if (dist <= CB.FIRE_SPREAD_RANGE) {
        // Check if suppressed by nearby watchpost/barracks
        if (!isFireSuppressed(state, other.tileX, other.tileY)) {
          other.onFire = true;
          other.fireTimer = CB.FIRE_DURATION * (0.7 + Math.random() * 0.6);
        }
      }
    }
  }

  // --- Random fire ignition ---
  state.fireCheckTimer -= dt;
  if (state.fireCheckTimer > 0) return;
  state.fireCheckTimer = CB.FIRE_CHECK_INTERVAL;

  for (const b of state.buildings.values()) {
    if (!b.built || b.onFire) continue;
    // Some buildings don't catch fire
    if (b.type === CaesarBuildingType.ROAD || b.type === CaesarBuildingType.WELL ||
        b.type === CaesarBuildingType.WALL || b.type === CaesarBuildingType.GATE) continue;

    let chance = CB.FIRE_BASE_CHANCE;

    // Production buildings with active production are riskier
    const bdef = CAESAR_BUILDING_DEFS[b.type];
    if (bdef.productionTime > 0 && b.workers > 0) chance *= 1.5;

    // Blacksmith/bakery extra risk
    if (b.type === CaesarBuildingType.BLACKSMITH || b.type === CaesarBuildingType.BAKERY) chance *= 1.5;

    // Suppressed by nearby watchpost
    if (isFireSuppressed(state, b.tileX, b.tileY)) chance *= (1 - CB.FIRE_WATCHPOST_SUPPRESS);

    if (Math.random() < chance) {
      b.onFire = true;
      b.fireTimer = CB.FIRE_DURATION;
    }
  }
}

function isFireSuppressed(state: CaesarState, tx: number, ty: number): boolean {
  for (const b of state.buildings.values()) {
    if (!b.built) continue;
    if (b.type !== CaesarBuildingType.WATCHPOST && b.type !== CaesarBuildingType.BARRACKS) continue;
    const bdef = CAESAR_BUILDING_DEFS[b.type];
    const range = b.type === CaesarBuildingType.BARRACKS ? 10 : 7;
    const bcx = b.tileX + bdef.footprint.w / 2;
    const bcy = b.tileY + bdef.footprint.h / 2;
    const dist = Math.abs(bcx - tx) + Math.abs(bcy - ty);
    if (dist <= range) return true;
  }
  return false;
}
