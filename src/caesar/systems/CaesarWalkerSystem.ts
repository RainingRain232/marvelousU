// ---------------------------------------------------------------------------
// Caesar – Walker movement & service delivery
// ---------------------------------------------------------------------------

import { CB } from "../config/CaesarBalance";
import { CaesarBuildingType, CAESAR_BUILDING_DEFS } from "../config/CaesarBuildingDefs";
import type { CaesarState } from "../state/CaesarState";
import { nextEntityId } from "../state/CaesarState";
import { createServiceWalker, type CaesarWalker } from "../state/CaesarWalker";
import { tileAt, inBounds } from "../state/CaesarMap";
import { applyServiceCoverage } from "./CaesarHousingSystem";

// ---- Walker spawning from service buildings ----

export function updateWalkerSpawning(state: CaesarState, dt: number): void {
  for (const b of state.buildings.values()) {
    if (!b.built) continue;

    const bdef = CAESAR_BUILDING_DEFS[b.type];
    if (!bdef.walkerService) continue;

    b.walkerTimer += dt;
    if (b.walkerTimer >= CB.WALKER_SPAWN_INTERVAL) {
      b.walkerTimer -= CB.WALKER_SPAWN_INTERVAL;

      // Don't spawn if already have an active walker from this building
      let hasActiveWalker = false;
      for (const w of state.walkers.values()) {
        if (w.sourceBuilding === b.id && w.alive && w.walkerType === "service") {
          hasActiveWalker = true;
          break;
        }
      }
      if (hasActiveWalker) continue;

      // Spawn walker at building center
      const cx = b.tileX + Math.floor(bdef.footprint.w / 2) + 0.5;
      const cy = b.tileY + Math.floor(bdef.footprint.h / 2) + 0.5;

      const walker = createServiceWalker(
        nextEntityId(state),
        cx, cy,
        bdef.walkerService,
        b.id,
        CB.WALKER_SPEED,
        bdef.walkerRange,
        CB.WALKER_SERVICE_RADIUS,
      );

      // Generate random road-following path
      walker.path = generateRandomRoadPath(state, Math.floor(cx), Math.floor(cy), bdef.walkerRange);

      state.walkers.set(walker.id, walker);
    }
  }
}

/**
 * Generate a random path along roads from a starting tile.
 * Walker follows roads randomly, like in Caesar.
 */
function generateRandomRoadPath(
  state: CaesarState,
  startX: number,
  startY: number,
  maxSteps: number,
): { x: number; y: number }[] {
  const path: { x: number; y: number }[] = [];
  const visited = new Set<string>();
  let cx = startX;
  let cy = startY;
  visited.add(`${cx},${cy}`);

  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  for (let step = 0; step < maxSteps; step++) {
    // Find adjacent road tiles not yet visited
    const candidates: { x: number; y: number }[] = [];
    for (const [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      const key = `${nx},${ny}`;
      if (visited.has(key)) continue;
      if (!inBounds(state.map, nx, ny)) continue;

      // Check if there's a road here
      let isRoad = false;
      for (const b of state.buildings.values()) {
        if ((b.type === CaesarBuildingType.ROAD || b.type === CaesarBuildingType.GATE) &&
            b.tileX === nx && b.tileY === ny) {
          isRoad = true;
          break;
        }
      }
      if (isRoad) {
        candidates.push({ x: nx, y: ny });
      }
    }

    if (candidates.length === 0) break;

    // Pick random direction
    const next = candidates[Math.floor(Math.random() * candidates.length)];
    path.push({ x: next.x + 0.5, y: next.y + 0.5 });
    visited.add(`${next.x},${next.y}`);
    cx = next.x;
    cy = next.y;
  }

  return path;
}

// ---- Walker movement ----

export function updateWalkerMovement(state: CaesarState, dt: number): void {
  const toRemove: number[] = [];

  for (const w of state.walkers.values()) {
    if (!w.alive) {
      toRemove.push(w.id);
      continue;
    }

    // Skip combat walkers (handled by threat system)
    if (w.walkerType === "bandit" || w.walkerType === "militia") continue;

    if (w.path.length === 0 || w.pathIndex >= w.path.length) {
      // Walker has completed its path — remove it
      toRemove.push(w.id);
      continue;
    }

    const target = w.path[w.pathIndex];
    const dx = target.x - w.x;
    const dy = target.y - w.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 0.1) {
      w.pathIndex++;
    } else {
      const step = w.speed * dt;
      const move = Math.min(step, dist);
      w.x += (dx / dist) * move;
      w.y += (dy / dist) * move;
      w.distanceTraveled += move;
    }

    // Apply service while walking
    if (w.service) {
      applyServiceCoverage(state, w.x, w.y, w.service, w.serviceRadius);
    }

    // Check max distance
    if (w.distanceTraveled >= w.maxDistance) {
      toRemove.push(w.id);
    }
  }

  for (const id of toRemove) {
    state.walkers.delete(id);
  }
}
