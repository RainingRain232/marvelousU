// ---------------------------------------------------------------------------
// Caesar – Threat system: bandit raids & combat
// ---------------------------------------------------------------------------

import { CB, DIFFICULTY_MODS } from "../config/CaesarBalance";
import { CaesarBuildingType, CAESAR_BUILDING_DEFS } from "../config/CaesarBuildingDefs";
import type { CaesarState } from "../state/CaesarState";
import { nextEntityId } from "../state/CaesarState";
import { createBandit, createMilitia, type CaesarWalker } from "../state/CaesarWalker";
import { inBounds } from "../state/CaesarMap";

/**
 * Spawn bandit raids periodically.
 */
export function updateRaids(state: CaesarState, dt: number): void {
  const mod = DIFFICULTY_MODS[state.difficulty];

  state.raidTimer -= dt;
  if (state.raidTimer > 0) return;

  // Schedule next raid
  const minInterval = CB.RAID_INTERVAL_MIN * mod.raidIntervalMult;
  const maxInterval = CB.RAID_INTERVAL_MAX * mod.raidIntervalMult;
  state.raidTimer = minInterval + Math.random() * (maxInterval - minInterval);

  // Don't raid if population is very low
  if (state.population < 20) return;

  // Calculate raid size
  const baseSize = CB.RAID_BASE_SIZE + Math.floor(state.population * CB.RAID_SCALE_PER_POP);
  const raidSize = Math.max(1, Math.floor(baseSize * mod.raidSizeMult));

  // Pick spawn edge
  const map = state.map;
  const edge = Math.floor(Math.random() * 4); // 0=top, 1=right, 2=bottom, 3=left

  for (let i = 0; i < raidSize; i++) {
    let sx: number, sy: number;
    const offset = Math.floor(Math.random() * Math.max(map.width, map.height));

    switch (edge) {
      case 0: sx = offset % map.width; sy = 0; break;
      case 1: sx = map.width - 1; sy = offset % map.height; break;
      case 2: sx = offset % map.width; sy = map.height - 1; break;
      default: sx = 0; sy = offset % map.height; break;
    }

    // Skip water tiles
    const tile = map.tiles[sy * map.width + sx];
    if (tile && tile.terrain === "water") continue;

    const bandit = createBandit(
      nextEntityId(state),
      sx + 0.5,
      sy + 0.5,
      CB.BANDIT_HP,
      CB.BANDIT_ATK,
    );

    // Path toward town center
    bandit.path = generatePathToCenter(state, sx, sy);
    state.walkers.set(bandit.id, bandit);
  }
}

/**
 * Simple path from edge toward center of populated area.
 */
function generatePathToCenter(
  state: CaesarState,
  startX: number,
  startY: number,
): { x: number; y: number }[] {
  const path: { x: number; y: number }[] = [];

  // Find center of buildings
  let cx = state.map.width / 2;
  let cy = state.map.height / 2;
  let buildingCount = 0;
  for (const b of state.buildings.values()) {
    if (b.built) {
      cx += b.tileX;
      cy += b.tileY;
      buildingCount++;
    }
  }
  if (buildingCount > 0) {
    cx = cx / (buildingCount + 1);
    cy = cy / (buildingCount + 1);
  }

  // Simple straight-line waypoints
  const steps = 30;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const px = startX + (cx - startX) * t;
    const py = startY + (cy - startY) * t;
    path.push({ x: px + 0.5, y: py + 0.5 });
  }

  return path;
}

/**
 * Spawn militia from barracks/watchposts to fight bandits.
 */
export function spawnDefenders(state: CaesarState): void {
  // Check if there are active bandits
  let hasBandits = false;
  for (const w of state.walkers.values()) {
    if (w.walkerType === "bandit" && w.alive) {
      hasBandits = true;
      break;
    }
  }
  if (!hasBandits) return;

  // Check if we already have enough militia
  let militiaCount = 0;
  for (const w of state.walkers.values()) {
    if (w.walkerType === "militia" && w.alive) militiaCount++;
  }

  // Spawn from military buildings (max 2 per building)
  for (const b of state.buildings.values()) {
    if (!b.built) continue;
    if (b.type !== CaesarBuildingType.WATCHPOST && b.type !== CaesarBuildingType.BARRACKS) continue;

    // Count militia from this building
    let fromThis = 0;
    for (const w of state.walkers.values()) {
      if (w.walkerType === "militia" && w.sourceBuilding === b.id && w.alive) fromThis++;
    }

    const maxPerBuilding = b.type === CaesarBuildingType.BARRACKS ? 4 : 2;
    if (fromThis >= maxPerBuilding) continue;

    const bdef = CAESAR_BUILDING_DEFS[b.type];
    const cx = b.tileX + Math.floor(bdef.footprint.w / 2) + 0.5;
    const cy = b.tileY + Math.floor(bdef.footprint.h / 2) + 0.5;

    const militia = createMilitia(
      nextEntityId(state),
      cx, cy,
      CB.MILITIA_HP,
      CB.MILITIA_ATK,
    );
    militia.sourceBuilding = b.id;

    state.walkers.set(militia.id, militia);
  }
}

/**
 * Update combat between militia/towers and bandits.
 */
export function updateCombat(state: CaesarState, dt: number): void {
  const bandits: CaesarWalker[] = [];
  const militia: CaesarWalker[] = [];

  for (const w of state.walkers.values()) {
    if (!w.alive) continue;
    if (w.walkerType === "bandit") bandits.push(w);
    if (w.walkerType === "militia") militia.push(w);
  }

  // Move militia toward nearest bandit
  for (const m of militia) {
    let nearest: CaesarWalker | null = null;
    let nearDist = Infinity;

    for (const b of bandits) {
      if (!b.alive) continue;
      const dx = b.x - m.x;
      const dy = b.y - m.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearDist) {
        nearDist = dist;
        nearest = b;
      }
    }

    if (!nearest) continue;

    if (nearDist < 1.2) {
      // In melee range — fight
      m.attackTimer += dt;
      if (m.attackTimer >= 1.0) {
        m.attackTimer -= 1.0;
        nearest.hp -= m.atk;
        if (nearest.hp <= 0) {
          nearest.alive = false;
        }
      }
    } else {
      // Move toward bandit
      const dx = nearest.x - m.x;
      const dy = nearest.y - m.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      m.x += (dx / dist) * m.speed * dt;
      m.y += (dy / dist) * m.speed * dt;
    }
  }

  // Bandits attack buildings and militia
  for (const b of bandits) {
    if (!b.alive) continue;

    // Move along path
    if (b.path.length > 0 && b.pathIndex < b.path.length) {
      const target = b.path[b.pathIndex];
      const dx = target.x - b.x;
      const dy = target.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 0.3) {
        b.pathIndex++;
      } else {
        b.x += (dx / dist) * b.speed * dt;
        b.y += (dy / dist) * b.speed * dt;
      }
    }

    // Check if near a militia — fight back
    for (const m of militia) {
      if (!m.alive) continue;
      const dx = m.x - b.x;
      const dy = m.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1.2) {
        b.attackTimer += dt;
        if (b.attackTimer >= 1.2) {
          b.attackTimer -= 1.2;
          m.hp -= b.atk;
          if (m.hp <= 0) m.alive = false;
        }
        break;
      }
    }

    // Damage nearby buildings
    for (const building of state.buildings.values()) {
      if (!building.built) continue;
      const bdef = CAESAR_BUILDING_DEFS[building.type];
      if (building.hp <= 0) continue;
      const bcx = building.tileX + bdef.footprint.w / 2;
      const bcy = building.tileY + bdef.footprint.h / 2;
      const dx = bcx - b.x;
      const dy = bcy - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 2) {
        b.attackTimer += dt;
        if (b.attackTimer >= 1.5) {
          b.attackTimer -= 1.5;
          building.hp -= b.atk;
          if (building.hp <= 0) {
            // Building destroyed
            state.buildings.delete(building.id);
            state.desirabilityDirty = true;
            if (building.type === CaesarBuildingType.ROAD) state.roadDirty = true;
          }
        }
        break;
      }
    }
  }

  // Tower attacks
  for (const building of state.buildings.values()) {
    if (!building.built || building.type !== CaesarBuildingType.TOWER) continue;
    const bdef = CAESAR_BUILDING_DEFS[building.type];
    const tcx = building.tileX + bdef.footprint.w / 2;
    const tcy = building.tileY + bdef.footprint.h / 2;

    for (const b of bandits) {
      if (!b.alive) continue;
      const dx = b.x - tcx;
      const dy = b.y - tcy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= CB.TOWER_RANGE) {
        // Tower shoots (once per 2 seconds, tracked via building production timer)
        building.productionTimer += dt;
        if (building.productionTimer >= 2.0) {
          building.productionTimer -= 2.0;
          b.hp -= CB.TOWER_ATK;
          if (b.hp <= 0) b.alive = false;
        }
        break; // One target at a time
      }
    }
  }

  // Clean up dead walkers and track raid completion
  let remainingBandits = 0;
  const toRemove: number[] = [];
  for (const [id, w] of state.walkers) {
    if (!w.alive) {
      toRemove.push(id);
      continue;
    }
    if (w.walkerType === "bandit") remainingBandits++;
  }

  for (const id of toRemove) {
    state.walkers.delete(id);
  }

  // If all bandits defeated, increment raid counter
  if (bandits.length > 0 && remainingBandits === 0) {
    state.raidsDefeated++;
    // Remove militia (they return to barracks)
    for (const m of militia) {
      state.walkers.delete(m.id);
    }
  }
}
