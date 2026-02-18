// Tile grid: walkability, building slots, A* pathfinding
import type { Vec2 } from "@/types";
import type { BattlefieldState, Tile } from "@sim/state/BattlefieldState";

export function getTile(state: BattlefieldState, x: number, y: number): Tile | null {
  if (x < 0 || y < 0 || x >= state.width || y >= state.height) return null;
  return state.grid[y][x];
}

export function isWalkable(state: BattlefieldState, x: number, y: number): boolean {
  const tile = getTile(state, x, y);
  return tile !== null && tile.walkable && tile.buildingId === null;
}

// A* pathfinding — returns tile path from start to goal, or null if unreachable
export function findPath(state: BattlefieldState, start: Vec2, goal: Vec2): Vec2[] | null {
  const key = (v: Vec2) => `${v.x},${v.y}`;
  const heuristic = (a: Vec2, b: Vec2) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

  const open  = new Map<string, { pos: Vec2; g: number; f: number; parent: string | null }>();
  const closed = new Set<string>();

  const startKey = key(start);
  open.set(startKey, { pos: start, g: 0, f: heuristic(start, goal), parent: null });

  const DIRS: Vec2[] = [{ x:1,y:0 },{ x:-1,y:0 },{ x:0,y:1 },{ x:0,y:-1 }];

  while (open.size > 0) {
    // Pick node with lowest f
    let bestKey = "";
    let bestF   = Infinity;
    for (const [k, node] of open) {
      if (node.f < bestF) { bestF = node.f; bestKey = k; }
    }

    const current = open.get(bestKey)!;
    open.delete(bestKey);
    closed.add(bestKey);

    if (current.pos.x === goal.x && current.pos.y === goal.y) {
      // Reconstruct path
      const path: Vec2[] = [];
      let   ck: string | null = bestKey;
      const all = new Map<string, typeof current>();
      all.set(bestKey, current);
      // Re-collect parents (stored in open remnants + we need to track them)
      // Simple reconstruction using the closed map we build inline:
      const parents = new Map<string, string | null>();
      parents.set(bestKey, current.parent);
      while (ck !== null) {
        const [cx, cy] = ck.split(",").map(Number);
        path.unshift({ x: cx, y: cy });
        ck = parents.get(ck) ?? null;
      }
      return path;
    }

    for (const dir of DIRS) {
      const nx = current.pos.x + dir.x;
      const ny = current.pos.y + dir.y;
      const nk = key({ x: nx, y: ny });
      if (closed.has(nk)) continue;
      if (!isWalkable(state, nx, ny) && !(nx === goal.x && ny === goal.y)) continue;

      const g = current.g + 1;
      const existing = open.get(nk);
      if (!existing || g < existing.g) {
        open.set(nk, { pos: { x: nx, y: ny }, g, f: g + heuristic({ x:nx,y:ny }, goal), parent: bestKey });
      }
    }
  }

  return null;
}
