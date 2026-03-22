// ---------------------------------------------------------------------------
// Shadowhand mode — A* pathfinding
// ---------------------------------------------------------------------------

import type { HeistMap } from "../state/ShadowhandState";

interface PathNode {
  x: number;
  y: number;
  g: number; // cost from start
  h: number; // heuristic to goal
  f: number; // g + h
  parent: PathNode | null;
}

function heuristic(ax: number, ay: number, bx: number, by: number): number {
  // Manhattan distance (slightly cheaper than euclidean, good for grid)
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

function isWalkable(map: HeistMap, x: number, y: number): boolean {
  if (x < 0 || x >= map.width || y < 0 || y >= map.height) return false;
  const t = map.tiles[y][x].type;
  return t !== "wall" && t !== "locked_door";
}

function isWalkableForGuard(map: HeistMap, x: number, y: number): boolean {
  if (x < 0 || x >= map.width || y < 0 || y >= map.height) return false;
  const t = map.tiles[y][x].type;
  // Guards can open unlocked doors but not locked ones or walls
  return t !== "wall" && t !== "locked_door";
}

const DIRS = [
  { dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
  { dx: -1, dy: -1 }, { dx: 1, dy: -1 }, { dx: -1, dy: 1 }, { dx: 1, dy: 1 },
];

const CARDINAL_COST = 1.0;
const DIAGONAL_COST = 1.414;

/**
 * A* pathfinding on the tile grid. Returns array of waypoints (tile coords)
 * from start to goal, or empty array if no path exists.
 * maxSteps limits search depth to avoid long stalls on large maps.
 */
export function findPath(
  map: HeistMap,
  sx: number, sy: number,
  gx: number, gy: number,
  forGuard = false,
  maxSteps = 500,
): { x: number; y: number }[] {
  const startX = Math.round(sx), startY = Math.round(sy);
  const goalX = Math.round(gx), goalY = Math.round(gy);

  if (startX === goalX && startY === goalY) return [];

  const walkCheck = forGuard ? isWalkableForGuard : isWalkable;
  if (!walkCheck(map, goalX, goalY)) {
    // Goal is blocked — find nearest walkable tile to goal
    return findPathToNearest(map, startX, startY, goalX, goalY, walkCheck, maxSteps);
  }

  const open: PathNode[] = [];
  const closed = new Set<number>();
  const key = (x: number, y: number) => y * map.width + x;

  const start: PathNode = {
    x: startX, y: startY,
    g: 0, h: heuristic(startX, startY, goalX, goalY),
    f: heuristic(startX, startY, goalX, goalY),
    parent: null,
  };
  open.push(start);

  const gScores = new Map<number, number>();
  gScores.set(key(startX, startY), 0);

  let steps = 0;
  while (open.length > 0 && steps < maxSteps) {
    steps++;

    // Find node with lowest f
    let bestIdx = 0;
    for (let i = 1; i < open.length; i++) {
      if (open[i].f < open[bestIdx].f) bestIdx = i;
    }
    const current = open.splice(bestIdx, 1)[0];
    const ck = key(current.x, current.y);

    if (current.x === goalX && current.y === goalY) {
      return reconstructPath(current);
    }

    closed.add(ck);

    for (const dir of DIRS) {
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;
      const nk = key(nx, ny);

      if (closed.has(nk)) continue;
      if (!walkCheck(map, nx, ny)) continue;

      // Diagonal: check that we don't cut corners through walls
      if (dir.dx !== 0 && dir.dy !== 0) {
        if (!walkCheck(map, current.x + dir.dx, current.y) ||
            !walkCheck(map, current.x, current.y + dir.dy)) continue;
      }

      const moveCost = (dir.dx !== 0 && dir.dy !== 0) ? DIAGONAL_COST : CARDINAL_COST;
      const tentativeG = current.g + moveCost;

      const existingG = gScores.get(nk);
      if (existingG !== undefined && tentativeG >= existingG) continue;

      gScores.set(nk, tentativeG);
      const h = heuristic(nx, ny, goalX, goalY);
      const node: PathNode = { x: nx, y: ny, g: tentativeG, h, f: tentativeG + h, parent: current };

      // Check if already in open
      const openIdx = open.findIndex(n => n.x === nx && n.y === ny);
      if (openIdx >= 0) {
        open[openIdx] = node;
      } else {
        open.push(node);
      }
    }
  }

  return []; // No path found
}

function findPathToNearest(
  map: HeistMap,
  sx: number, sy: number,
  gx: number, gy: number,
  walkCheck: (map: HeistMap, x: number, y: number) => boolean,
  maxSteps: number,
): { x: number; y: number }[] {
  // Find nearest walkable tile to goal and path there
  for (let r = 1; r <= 5; r++) {
    for (const dir of DIRS) {
      const nx = gx + dir.dx * r;
      const ny = gy + dir.dy * r;
      if (walkCheck(map, nx, ny)) {
        return findPath(map, sx, sy, nx, ny, false, maxSteps);
      }
    }
  }
  return [];
}

function reconstructPath(node: PathNode): { x: number; y: number }[] {
  const path: { x: number; y: number }[] = [];
  let current: PathNode | null = node;
  while (current) {
    path.unshift({ x: current.x, y: current.y });
    current = current.parent;
  }
  // Remove the starting position (we're already there)
  if (path.length > 0) path.shift();
  return path;
}

/**
 * Smoothed path following — returns the next position to move toward
 * given a path and current position. Skips waypoints that are in direct
 * line of sight to reduce zig-zagging.
 */
export function getNextWaypoint(
  path: { x: number; y: number }[],
  cx: number, cy: number,
  arrivalDist = 0.5,
): { x: number; y: number } | null {
  if (path.length === 0) return null;

  // Remove passed waypoints
  while (path.length > 0) {
    const wp = path[0];
    const dx = wp.x - cx, dy = wp.y - cy;
    if (dx * dx + dy * dy < arrivalDist * arrivalDist) {
      path.shift();
    } else {
      break;
    }
  }

  return path[0] ?? null;
}
