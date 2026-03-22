// ---------------------------------------------------------------------------
// Caravan hazard system — biome-specific environmental hazards
// ---------------------------------------------------------------------------

import type { CaravanState } from "../state/CaravanState";
import { getBiome } from "../config/CaravanBiomeDefs";

type HazardCallback = ((type: string, x: number, y: number) => void) | null;
let _hazardCallback: HazardCallback = null;

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

// Hazard types per biome
const BIOME_HAZARDS: Record<string, { type: string; dmg: number; slow: number; interval: number }> = {
  forest:   { type: "poison_cloud", dmg: 3, slow: 0.5, interval: 12 },
  tundra:   { type: "ice_patch",    dmg: 0, slow: 0.4, interval: 10 },
  desert:   { type: "sandstorm",    dmg: 2, slow: 0.3, interval: 14 },
  volcanic: { type: "lava_vent",    dmg: 5, slow: 0,   interval: 8 },
  meadow:   { type: "none",         dmg: 0, slow: 0,   interval: 999 },
};

export const CaravanHazardSystem = {
  setHazardCallback(cb: HazardCallback): void { _hazardCallback = cb; },

  update(state: CaravanState, dt: number): void {
    if (state.phase !== "travel") return;

    const biome = getBiome(state.segment);
    const hazDef = BIOME_HAZARDS[biome.id] ?? BIOME_HAZARDS.meadow;
    if (hazDef.type === "none") return;

    // Parry timer
    if (state.parryTimer > 0) state.parryTimer -= dt;
    if (state.parryCooldown > 0) state.parryCooldown -= dt;

    // Spawn hazards periodically
    state.hazardSpawnTimer -= dt;
    if (state.hazardSpawnTimer <= 0) {
      state.hazardSpawnTimer = hazDef.interval + Math.random() * 4;
      _spawnHazard(state, hazDef.type);
    }

    // Update existing hazards
    for (let i = state.hazards.length - 1; i >= 0; i--) {
      const h = state.hazards[i];
      h.lifetime -= dt;
      if (h.lifetime <= 0) {
        state.hazards.splice(i, 1);
        continue;
      }

      // Check if player/caravan is in hazard
      const isParrying = state.parryTimer > 0;
      const parryMult = isParrying ? 0.3 : 1.0;

      // Damage player
      const dPlayer = dist(state.player.position.x, state.player.position.y, h.x, h.y);
      if (dPlayer < h.radius && hazDef.dmg > 0) {
        if (state.player.invincibilityTimer <= 0) {
          const dmg = Math.round(hazDef.dmg * parryMult * dt * 10);
          if (dmg > 0) {
            state.player.hp -= dmg;
            if (state.player.hp <= 0) { state.player.hp = 0; state.gameOver = true; state.defeatReason = "hero_died"; }
          }
        }
      }

      // Slow player if in hazard
      if (dPlayer < h.radius && hazDef.slow > 0 && !isParrying) {
        // Applied via speed check in input system (we just flag it)
      }

      // Damage caravan
      const dCaravan = dist(state.caravan.position.x, state.caravan.position.y, h.x, h.y);
      if (dCaravan < h.radius && hazDef.dmg > 0) {
        const cdmg = Math.round(hazDef.dmg * parryMult * dt * 5);
        if (cdmg > 0) {
          state.caravan.hp -= cdmg;
          if (state.caravan.hp <= 0) { state.caravan.hp = 0; state.gameOver = true; state.defeatReason = "caravan_destroyed"; }
        }
      }
    }
  },
};

function _spawnHazard(state: CaravanState, type: string): void {
  const cx = state.caravan.position.x;
  const cy = state.caravan.position.y;
  // Spawn near the road, ahead of caravan
  const x = cx + 5 + Math.random() * 15;
  const y = cy + (Math.random() - 0.5) * 8;
  const radius = 2 + Math.random() * 2;

  state.hazards.push({
    id: state.nextEnemyId++, // reuse ID counter
    x, y, type, radius,
    lifetime: 4 + Math.random() * 3,
  });

  _hazardCallback?.(type, x, y);
}
