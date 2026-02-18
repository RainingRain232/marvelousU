import { describe, it, expect, beforeEach } from "vitest";
import { createBattlefieldState } from "@sim/state/BattlefieldState";
import {
  getTile,
  isWalkable,
  setWalkable,
  setBuilding,
  getNeighbors,
  getWalkableNeighbors,
  findPath,
} from "@sim/core/Grid";
import type { BattlefieldState } from "@sim/state/BattlefieldState";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeGrid(w: number, h: number): BattlefieldState {
  return createBattlefieldState(w, h);
}

/** Block every tile in a row to create a horizontal wall with a gap at gapX. */
function blockRow(state: BattlefieldState, y: number, gapX: number): void {
  for (let x = 0; x < state.width; x++) {
    if (x !== gapX) setWalkable(state, x, y, false);
  }
}

/** Stringify a path for readable assertion failures. */
function pathStr(path: { x: number; y: number }[] | null): string {
  if (!path) return "null";
  return path.map(p => `(${p.x},${p.y})`).join(" → ");
}

// ---------------------------------------------------------------------------
// getTile
// ---------------------------------------------------------------------------

describe("getTile", () => {
  it("returns a tile for in-bounds coords", () => {
    const s = makeGrid(5, 5);
    const t = getTile(s, 2, 3);
    expect(t).not.toBeNull();
    expect(t?.x).toBe(2);
    expect(t?.y).toBe(3);
  });

  it("returns null for negative coords", () => {
    expect(getTile(makeGrid(5, 5), -1, 0)).toBeNull();
    expect(getTile(makeGrid(5, 5), 0, -1)).toBeNull();
  });

  it("returns null for out-of-bounds coords", () => {
    expect(getTile(makeGrid(5, 5), 5, 0)).toBeNull();
    expect(getTile(makeGrid(5, 5), 0, 5)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// isWalkable / setWalkable / setBuilding
// ---------------------------------------------------------------------------

describe("isWalkable", () => {
  it("all tiles walkable by default", () => {
    const s = makeGrid(4, 4);
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++)
        expect(isWalkable(s, x, y)).toBe(true);
  });

  it("returns false after setWalkable(false)", () => {
    const s = makeGrid(4, 4);
    setWalkable(s, 2, 2, false);
    expect(isWalkable(s, 2, 2)).toBe(false);
    expect(isWalkable(s, 1, 2)).toBe(true); // neighbours unchanged
  });

  it("returns false when a building occupies the tile", () => {
    const s = makeGrid(4, 4);
    setBuilding(s, 1, 1, "building-1");
    expect(isWalkable(s, 1, 1)).toBe(false);
  });

  it("returns true after removing a building", () => {
    const s = makeGrid(4, 4);
    setBuilding(s, 1, 1, "building-1");
    setBuilding(s, 1, 1, null);
    expect(isWalkable(s, 1, 1)).toBe(true);
  });

  it("returns false for out-of-bounds coords", () => {
    expect(isWalkable(makeGrid(4, 4), -1, 0)).toBe(false);
    expect(isWalkable(makeGrid(4, 4), 99, 0)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getNeighbors / getWalkableNeighbors
// ---------------------------------------------------------------------------

describe("getNeighbors", () => {
  it("center tile has 4 neighbours", () => {
    expect(getNeighbors(makeGrid(5, 5), 2, 2)).toHaveLength(4);
  });

  it("corner tile has 2 neighbours", () => {
    expect(getNeighbors(makeGrid(5, 5), 0, 0)).toHaveLength(2);
  });

  it("edge tile has 3 neighbours", () => {
    expect(getNeighbors(makeGrid(5, 5), 0, 2)).toHaveLength(3);
  });
});

describe("getWalkableNeighbors", () => {
  it("excludes blocked tiles", () => {
    const s = makeGrid(5, 5);
    setWalkable(s, 3, 2, false); // block east neighbour of (2,2)
    const neighbors = getWalkableNeighbors(s, 2, 2);
    expect(neighbors.some(t => t.x === 3 && t.y === 2)).toBe(false);
    expect(neighbors).toHaveLength(3);
  });

  it("excludes tiles occupied by buildings", () => {
    const s = makeGrid(5, 5);
    setBuilding(s, 2, 1, "b1"); // block north neighbour of (2,2)
    const neighbors = getWalkableNeighbors(s, 2, 2);
    expect(neighbors.some(t => t.x === 2 && t.y === 1)).toBe(false);
    expect(neighbors).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// findPath — A*
// ---------------------------------------------------------------------------

describe("findPath", () => {
  let s: BattlefieldState;

  beforeEach(() => {
    s = makeGrid(10, 10);
  });

  it("returns a single-element path when start equals goal", () => {
    const path = findPath(s, { x: 3, y: 3 }, { x: 3, y: 3 });
    expect(path).toEqual([{ x: 3, y: 3 }]);
  });

  it("finds a straight horizontal path on open grid", () => {
    const path = findPath(s, { x: 0, y: 0 }, { x: 4, y: 0 });
    expect(path).not.toBeNull();
    expect(path![0]).toEqual({ x: 0, y: 0 });
    expect(path![path!.length - 1]).toEqual({ x: 4, y: 0 });
    expect(path!.length).toBe(5); // optimal: 5 steps
  });

  it("finds a straight vertical path on open grid", () => {
    const path = findPath(s, { x: 0, y: 0 }, { x: 0, y: 4 });
    expect(path).not.toBeNull();
    expect(path!.length).toBe(5);
    expect(path![path!.length - 1]).toEqual({ x: 0, y: 4 });
  });

  it("path length equals Manhattan distance + 1 on open grid", () => {
    const path = findPath(s, { x: 1, y: 1 }, { x: 5, y: 4 });
    expect(path).not.toBeNull();
    // Manhattan distance = |5-1| + |4-1| = 7, path has 8 nodes
    expect(path!.length).toBe(8);
  });

  it("navigates around a wall with a single gap", () => {
    // Block row y=3 except at x=5 (the gap)
    blockRow(s, 3, 5);
    const path = findPath(s, { x: 2, y: 1 }, { x: 2, y: 6 });
    expect(path, `path: ${pathStr(path)}`).not.toBeNull();
    // Path must cross y=3 at x=5
    const crossesThroughGap = path!.some(p => p.x === 5 && p.y === 3);
    expect(crossesThroughGap).toBe(true);
  });

  it("returns null when goal is completely enclosed", () => {
    // Surround (5,5) on all 4 sides
    setWalkable(s, 5, 4, false);
    setWalkable(s, 5, 6, false);
    setWalkable(s, 4, 5, false);
    setWalkable(s, 6, 5, false);
    const path = findPath(s, { x: 0, y: 0 }, { x: 5, y: 5 });
    expect(path).toBeNull();
  });

  it("returns null for out-of-bounds goal", () => {
    const path = findPath(s, { x: 0, y: 0 }, { x: 99, y: 99 });
    expect(path).toBeNull();
  });

  it("path is contiguous — each step is exactly 1 tile away", () => {
    blockRow(s, 3, 5);
    const path = findPath(s, { x: 0, y: 0 }, { x: 9, y: 9 });
    expect(path).not.toBeNull();
    for (let i = 1; i < path!.length; i++) {
      const dx = Math.abs(path![i].x - path![i - 1].x);
      const dy = Math.abs(path![i].y - path![i - 1].y);
      expect(dx + dy).toBe(1); // exactly one step
    }
  });

  it("path starts at start and ends at goal", () => {
    const path = findPath(s, { x: 1, y: 2 }, { x: 8, y: 7 });
    expect(path).not.toBeNull();
    expect(path![0]).toEqual({ x: 1, y: 2 });
    expect(path![path!.length - 1]).toEqual({ x: 8, y: 7 });
  });

  it("floors fractional coordinates before searching", () => {
    const path = findPath(s, { x: 0.9, y: 0.9 }, { x: 3.1, y: 0.1 });
    expect(path).not.toBeNull();
    expect(path![0]).toEqual({ x: 0, y: 0 });
    expect(path![path!.length - 1]).toEqual({ x: 3, y: 0 });
  });

  it("allows pathing through a tile blocked by building at goal (attack destination)", () => {
    // Unit walks toward a building — the goal tile has a building
    setBuilding(s, 5, 5, "enemy-castle");
    const path = findPath(s, { x: 0, y: 5 }, { x: 5, y: 5 });
    expect(path).not.toBeNull();
    expect(path![path!.length - 1]).toEqual({ x: 5, y: 5 });
  });

  it("finds optimal path — no unnecessary detours on open grid", () => {
    const path = findPath(s, { x: 0, y: 0 }, { x: 3, y: 3 });
    expect(path).not.toBeNull();
    // Optimal path on open grid = Manhattan distance + 1 = 7 nodes
    expect(path!.length).toBe(7);
  });
});
