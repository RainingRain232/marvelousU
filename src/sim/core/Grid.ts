// Tile grid: walkability, building slots, A* pathfinding
import type { PlayerId, Vec2 } from "@/types";
import type { BattlefieldState, Tile } from "@sim/state/BattlefieldState";

// ---------------------------------------------------------------------------
// Tile accessors
// ---------------------------------------------------------------------------

export function getTile(
  state: BattlefieldState,
  x: number,
  y: number,
): Tile | null {
  if (x < 0 || y < 0 || x >= state.width || y >= state.height) return null;
  return state.grid[y][x];
}

export function isWalkable(
  state: BattlefieldState,
  x: number,
  y: number,
): boolean {
  const tile = getTile(state, x, y);
  return tile !== null && tile.walkable && tile.buildingId === null;
}

// ---------------------------------------------------------------------------
// Tile mutation
// ---------------------------------------------------------------------------

export function setWalkable(
  state: BattlefieldState,
  x: number,
  y: number,
  walkable: boolean,
): void {
  const tile = getTile(state, x, y);
  if (tile) tile.walkable = walkable;
}

export function setBuilding(
  state: BattlefieldState,
  x: number,
  y: number,
  buildingId: string | null,
): void {
  const tile = getTile(state, x, y);
  if (tile) tile.buildingId = buildingId;
}

export function setOwner(
  state: BattlefieldState,
  x: number,
  y: number,
  owner: PlayerId | null,
): void {
  const tile = getTile(state, x, y);
  if (tile) tile.owner = owner;
}

// ---------------------------------------------------------------------------
// Neighbors
// ---------------------------------------------------------------------------

const CARDINAL_DIRS: Vec2[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

/** Returns the 4 cardinal neighbors that exist within grid bounds (regardless of walkability). */
export function getNeighbors(
  state: BattlefieldState,
  x: number,
  y: number,
): Tile[] {
  const result: Tile[] = [];
  for (const dir of CARDINAL_DIRS) {
    const tile = getTile(state, x + dir.x, y + dir.y);
    if (tile) result.push(tile);
  }
  return result;
}

/** Returns walkable cardinal neighbors. */
export function getWalkableNeighbors(
  state: BattlefieldState,
  x: number,
  y: number,
): Tile[] {
  return getNeighbors(state, x, y).filter(
    (t) => t.walkable && t.buildingId === null,
  );
}

// ---------------------------------------------------------------------------
// A* pathfinding
// ---------------------------------------------------------------------------

interface AStarNode {
  x: number;
  y: number;
  g: number; // Cost from start
  f: number; // g + heuristic
  parent: string | null; // Key of parent node
}

function nodeKey(x: number, y: number): string {
  return `${x},${y}`;
}

function heuristic(ax: number, ay: number, bx: number, by: number): number {
  // Manhattan distance — admissible for 4-directional grid
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

/**
 * A* pathfinding on a 4-directional tile grid.
 *
 * @param state  - The battlefield state containing the tile grid.
 * @param start  - Start position (tile coords, will be floored).
 * @param goal   - Goal position (tile coords, will be floored).
 * @returns Ordered array of tile coords from start to goal (inclusive),
 *          or `null` if no path exists.
 */
export function findPath(
  state: BattlefieldState,
  start: Vec2,
  goal: Vec2,
): Vec2[] | null {
  const sx = Math.floor(start.x);
  const sy = Math.floor(start.y);
  const gx = Math.floor(goal.x);
  const gy = Math.floor(goal.y);

  // Trivial case
  if (sx === gx && sy === gy) return [{ x: sx, y: sy }];

  // Goal must be in bounds
  if (getTile(state, gx, gy) === null) return null;

  const open = new Map<string, AStarNode>(); // keyed by "x,y"
  const closed = new Set<string>();
  const all = new Map<string, AStarNode>(); // for reconstruction

  const startKey = nodeKey(sx, sy);
  const startNode: AStarNode = {
    x: sx,
    y: sy,
    g: 0,
    f: heuristic(sx, sy, gx, gy),
    parent: null,
  };
  open.set(startKey, startNode);
  all.set(startKey, startNode);

  while (open.size > 0) {
    // Pop node with lowest f score
    let bestKey = "";
    let bestF = Infinity;
    for (const [k, node] of open) {
      if (node.f < bestF) {
        bestF = node.f;
        bestKey = k;
      }
    }

    const current = open.get(bestKey)!;
    open.delete(bestKey);
    closed.add(bestKey);

    if (current.x === gx && current.y === gy) {
      return reconstructPath(all, bestKey);
    }

    for (const dir of CARDINAL_DIRS) {
      const nx = current.x + dir.x;
      const ny = current.y + dir.y;
      const nk = nodeKey(nx, ny);

      if (closed.has(nk)) continue;

      // Allow goal tile even if blocked by a building (units can attack into it)
      const goalTile = nx === gx && ny === gy;
      if (!goalTile && !isWalkable(state, nx, ny)) continue;
      if (!goalTile && getTile(state, nx, ny) === null) continue;
      if (getTile(state, nx, ny) === null) continue;

      const g = current.g + 1;
      const existing = open.get(nk);

      if (!existing || g < existing.g) {
        const node: AStarNode = {
          x: nx,
          y: ny,
          g,
          f: g + heuristic(nx, ny, gx, gy),
          parent: bestKey,
        };
        open.set(nk, node);
        all.set(nk, node);
      }
    }
  }

  return null; // No path
}

function reconstructPath(all: Map<string, AStarNode>, goalKey: string): Vec2[] {
  const path: Vec2[] = [];
  let key: string | null = goalKey;
  while (key !== null) {
    const node: AStarNode = all.get(key)!;
    path.unshift({ x: node.x, y: node.y });
    key = node.parent;
  }
  return path;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Finds the furthest walkable tile from 'from' on the line towards 'target', up to 'maxDist'.
 */
export function findWalkableTowards(
  state: BattlefieldState,
  from: Vec2,
  target: Vec2,
  maxDist: number,
): Vec2 | null {
  const dx = target.x - from.x;
  const dy = target.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist === 0) return null;

  const steps = Math.ceil(maxDist * 2); // Check every 0.5 tiles
  let lastWalkable: Vec2 | null = null;

  for (let i = 1; i <= steps; i++) {
    const t = (i / steps) * (maxDist / dist);
    if (t > 1) break;

    const x = Math.floor(from.x + dx * t);
    const y = Math.floor(from.y + dy * t);

    if (isWalkable(state, x, y)) {
      lastWalkable = { x, y };
    } else {
      // Hit a wall/building, stop here
      break;
    }
  }

  return lastWalkable;
}

/**
 * Finds a random walkable tile within a certain distance of the center.
 * Useful for "scatter" or teleport effects.
 */
export function findRandomWalkableNearby(
  state: BattlefieldState,
  center: Vec2,
  maxDist: number,
): Vec2 | null {
  const cx = Math.floor(center.x);
  const cy = Math.floor(center.y);
  const d = Math.ceil(maxDist);

  const candidates: Vec2[] = [];

  for (let x = cx - d; x <= cx + d; x++) {
    for (let y = cy - d; y <= cy + d; y++) {
      if (x === cx && y === cy) continue;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (dist <= maxDist && isWalkable(state, x, y)) {
        candidates.push({ x, y });
      }
    }
  }

  if (candidates.length === 0) return null;

  return candidates[Math.floor(Math.random() * candidates.length)];
}
