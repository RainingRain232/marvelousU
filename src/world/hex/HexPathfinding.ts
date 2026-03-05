// A* pathfinding on the hex grid with terrain movement costs.

import type { HexCoord } from "@world/hex/HexCoord";
import { hexDistance, hexKey, hexNeighbors } from "@world/hex/HexCoord";
import type { HexGrid } from "@world/hex/HexGrid";
import { TERRAIN_DEFINITIONS } from "@world/config/TerrainDefs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HexPathResult {
  /** Ordered hex path from start to goal (inclusive). */
  path: HexCoord[];
  /** Total movement cost of the path. */
  totalCost: number;
  /** Movement points remaining after traversing the path. */
  remainingMP: number;
}

// ---------------------------------------------------------------------------
// A* pathfinding
// ---------------------------------------------------------------------------

/**
 * Find the shortest path from `start` to `goal` on the hex grid.
 * Returns null if no path exists (e.g., goal is impassable or unreachable).
 *
 * @param grid          The hex grid to search.
 * @param start         Starting hex coordinate.
 * @param goal          Destination hex coordinate.
 * @param movementBudget  Maximum total movement cost allowed (Infinity for unlimited).
 */
export function findHexPath(
  grid: HexGrid,
  start: HexCoord,
  goal: HexCoord,
  movementBudget = Infinity,
): HexPathResult | null {
  const startKey = hexKey(start.q, start.r);
  const goalKey = hexKey(goal.q, goal.r);

  // Check that goal tile exists
  const goalTile = grid.getTile(goal.q, goal.r);
  if (!goalTile) return null;

  // Goal must be a tile armies can stand on (not impassable)
  const goalTerrain = TERRAIN_DEFINITIONS[goalTile.terrain];
  if (!isFinite(goalTerrain.movementCost)) return null;

  // Open set (priority queue as sorted array — fine for ~700 hexes)
  const open: Array<{ key: string; f: number }> = [{ key: startKey, f: 0 }];
  const gScore = new Map<string, number>();
  const cameFrom = new Map<string, string>();

  gScore.set(startKey, 0);

  while (open.length > 0) {
    // Pop lowest f-score
    open.sort((a, b) => a.f - b.f);
    const current = open.shift()!;

    if (current.key === goalKey) {
      // Reconstruct path
      return _reconstructPath(cameFrom, goalKey, gScore.get(goalKey)!, movementBudget);
    }

    const currentCoord = _parseKey(current.key);
    const currentG = gScore.get(current.key)!;

    for (const neighbor of hexNeighbors(currentCoord)) {
      const nKey = hexKey(neighbor.q, neighbor.r);
      const tile = grid.getTile(neighbor.q, neighbor.r);
      if (!tile) continue;

      const terrain = TERRAIN_DEFINITIONS[tile.terrain];
      if (!isFinite(terrain.movementCost)) continue; // impassable

      const tentativeG = currentG + terrain.movementCost;
      // Allow the first step even if it exceeds the budget (guaranteed 1-tile move)
      if (tentativeG > movementBudget && currentG > 0) continue;

      const prevG = gScore.get(nKey);
      if (prevG !== undefined && tentativeG >= prevG) continue; // not better

      gScore.set(nKey, tentativeG);
      cameFrom.set(nKey, current.key);

      const h = hexDistance(neighbor, goal);
      const f = tentativeG + h;

      // Add to open set (may already be there with worse score)
      open.push({ key: nKey, f });
    }
  }

  return null; // no path found
}

// ---------------------------------------------------------------------------
// Reachability
// ---------------------------------------------------------------------------

/**
 * Get all hexes reachable from `start` within `movementBudget`.
 * Returns a Map from hex key to remaining movement points.
 */
export function getReachableHexes(
  grid: HexGrid,
  start: HexCoord,
  movementBudget: number,
): Map<string, number> {
  const startKey = hexKey(start.q, start.r);
  const visited = new Map<string, number>(); // key → cost to reach
  visited.set(startKey, 0);

  // BFS with cost tracking
  const queue: Array<{ coord: HexCoord; cost: number }> = [
    { coord: start, cost: 0 },
  ];

  while (queue.length > 0) {
    const { coord, cost } = queue.shift()!;

    for (const neighbor of hexNeighbors(coord)) {
      const tile = grid.getTile(neighbor.q, neighbor.r);
      if (!tile) continue;

      const terrain = TERRAIN_DEFINITIONS[tile.terrain];
      if (!isFinite(terrain.movementCost)) continue;

      const newCost = cost + terrain.movementCost;
      // Allow the first step even if it exceeds the budget (guaranteed 1-tile move)
      if (newCost > movementBudget && cost > 0) continue;

      const nKey = hexKey(neighbor.q, neighbor.r);
      const prevCost = visited.get(nKey);
      if (prevCost !== undefined && newCost >= prevCost) continue;

      visited.set(nKey, newCost);
      queue.push({ coord: neighbor, cost: newCost });
    }
  }

  // Convert cost-to-reach → remaining movement
  const result = new Map<string, number>();
  for (const [key, cost] of visited) {
    result.set(key, movementBudget - cost);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _parseKey(key: string): HexCoord {
  const [q, r] = key.split(",").map(Number);
  return { q, r };
}

function _reconstructPath(
  cameFrom: Map<string, string>,
  goalKey: string,
  totalCost: number,
  movementBudget: number,
): HexPathResult {
  const path: HexCoord[] = [];
  let current: string | undefined = goalKey;

  while (current !== undefined) {
    path.unshift(_parseKey(current));
    current = cameFrom.get(current);
  }

  return { path, totalCost, remainingMP: movementBudget - totalCost };
}
