// ---------------------------------------------------------------------------
// Settlers – A* pathfinding for soldiers
// ---------------------------------------------------------------------------

import { SB } from "../config/SettlersBalance";
import { Biome, type SettlersMap, inBounds, tileIdx } from "../state/SettlersMap";

/** Waypoint in world coordinates */
export interface Waypoint {
  x: number;
  z: number;
}

/** Tile coordinate */
interface TileCoord {
  tx: number;
  tz: number;
}

/** Check if a tile is walkable (not water, not mountain) */
function isWalkable(map: SettlersMap, tx: number, tz: number): boolean {
  if (!inBounds(map, tx, tz)) return false;
  const biome = map.biomes[tileIdx(map, tx, tz)];
  return biome !== Biome.WATER && biome !== Biome.MOUNTAIN;
}

// 8-directional neighbors (cardinal + diagonal)
const DIRS: [number, number][] = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
];

const SQRT2 = Math.SQRT2;

/**
 * A* pathfinding on the tile grid. Returns an array of world-coordinate
 * waypoints from start toward goal, or an empty array if no path exists.
 * The start position is NOT included; the goal IS included.
 */
export function findPath(
  map: SettlersMap,
  startWorldX: number,
  startWorldZ: number,
  goalWorldX: number,
  goalWorldZ: number,
): Waypoint[] {
  const startTx = Math.floor(startWorldX / SB.TILE_SIZE);
  const startTz = Math.floor(startWorldZ / SB.TILE_SIZE);
  const goalTx = Math.floor(goalWorldX / SB.TILE_SIZE);
  const goalTz = Math.floor(goalWorldZ / SB.TILE_SIZE);

  // Clamp to map bounds
  const sTx = Math.max(0, Math.min(map.width - 1, startTx));
  const sTz = Math.max(0, Math.min(map.height - 1, startTz));
  const gTx = Math.max(0, Math.min(map.width - 1, goalTx));
  const gTz = Math.max(0, Math.min(map.height - 1, goalTz));

  // Trivial case
  if (sTx === gTx && sTz === gTz) {
    return [{ x: goalWorldX, z: goalWorldZ }];
  }

  // If goal tile itself is impassable, still allow pathing to it
  // (soldiers need to reach enemy buildings which may be on mountains, etc.)
  const goalPassable = isWalkable(map, gTx, gTz);

  const w = map.width;
  const key = (tx: number, tz: number) => tz * w + tx;

  // Open set as a simple sorted array (good enough for 64x64)
  const gScore = new Float32Array(w * map.height).fill(Infinity);
  const fScore = new Float32Array(w * map.height).fill(Infinity);
  const cameFrom = new Int32Array(w * map.height).fill(-1);
  const closed = new Uint8Array(w * map.height);

  const startKey = key(sTx, sTz);
  gScore[startKey] = 0;
  fScore[startKey] = heuristic(sTx, sTz, gTx, gTz);

  // Min-heap using an array of keys sorted by fScore
  const open: number[] = [startKey];
  const inOpen = new Uint8Array(w * map.height);
  inOpen[startKey] = 1;

  while (open.length > 0) {
    // Find node with lowest fScore (linear scan - fine for 64x64)
    let bestIdx = 0;
    let bestF = fScore[open[0]];
    for (let i = 1; i < open.length; i++) {
      if (fScore[open[i]] < bestF) {
        bestF = fScore[open[i]];
        bestIdx = i;
      }
    }

    const currentKey = open[bestIdx];
    open[bestIdx] = open[open.length - 1];
    open.pop();
    inOpen[currentKey] = 0;

    const cx = currentKey % w;
    const cz = (currentKey - cx) / w;

    if (cx === gTx && cz === gTz) {
      // Reconstruct path
      return reconstructPath(cameFrom, currentKey, w, goalWorldX, goalWorldZ);
    }

    closed[currentKey] = 1;

    for (const [dx, dz] of DIRS) {
      const nx = cx + dx;
      const nz = cz + dz;

      // Allow stepping onto goal even if impassable
      const isGoal = nx === gTx && nz === gTz;
      if (!isGoal && !isWalkable(map, nx, nz)) continue;
      if (isGoal && !goalPassable && !isWalkable(map, nx, nz)) {
        // Allow reaching impassable goal
      }

      if (!inBounds(map, nx, nz)) continue;

      const nKey = key(nx, nz);
      if (closed[nKey]) continue;

      // Diagonal moves cost sqrt(2), cardinal cost 1
      const isDiag = dx !== 0 && dz !== 0;

      // For diagonal moves, check that both adjacent cardinal tiles are walkable
      // to prevent cutting through corners
      if (isDiag) {
        if (!isWalkable(map, cx + dx, cz) && !isWalkable(map, cx, cz + dz)) continue;
      }

      const moveCost = isDiag ? SQRT2 : 1;
      const tentG = gScore[currentKey] + moveCost;

      if (tentG < gScore[nKey]) {
        cameFrom[nKey] = currentKey;
        gScore[nKey] = tentG;
        fScore[nKey] = tentG + heuristic(nx, nz, gTx, gTz);

        if (!inOpen[nKey]) {
          open.push(nKey);
          inOpen[nKey] = 1;
        }
      }
    }
  }

  // No path found - return direct waypoint as fallback
  return [{ x: goalWorldX, z: goalWorldZ }];
}

/** Octile distance heuristic (consistent for 8-directional movement) */
function heuristic(ax: number, az: number, bx: number, bz: number): number {
  const dx = Math.abs(ax - bx);
  const dz = Math.abs(az - bz);
  return Math.max(dx, dz) + (SQRT2 - 1) * Math.min(dx, dz);
}

/** Reconstruct path from cameFrom map, converting tile coords to world coords */
function reconstructPath(
  cameFrom: Int32Array,
  goalKey: number,
  w: number,
  goalWorldX: number,
  goalWorldZ: number,
): Waypoint[] {
  const tilePath: TileCoord[] = [];
  let current = goalKey;

  while (current !== -1) {
    const tx = current % w;
    const tz = (current - tx) / w;
    tilePath.push({ tx, tz });
    current = cameFrom[current];
  }

  tilePath.reverse();

  // Skip the first tile (start position) and convert to world coordinates
  // Use tile centers as waypoints
  const waypoints: Waypoint[] = [];
  for (let i = 1; i < tilePath.length - 1; i++) {
    const t = tilePath[i];
    waypoints.push({
      x: (t.tx + 0.5) * SB.TILE_SIZE,
      z: (t.tz + 0.5) * SB.TILE_SIZE,
    });
  }

  // Last waypoint is the exact goal position (not tile center)
  waypoints.push({ x: goalWorldX, z: goalWorldZ });

  return waypoints;
}
