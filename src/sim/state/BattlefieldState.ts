// Grid, tile ownership, neutral zones
import type { PlayerId } from "@/types";

export interface Tile {
  x:         number;
  y:         number;
  walkable:  boolean;
  owner:     PlayerId | null;
  buildingId: string | null;
}

export interface BattlefieldState {
  grid:   Tile[][];
  width:  number;
  height: number;
}

export function createBattlefieldState(width: number, height: number): BattlefieldState {
  const grid: Tile[][] = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => ({
      x, y, walkable: true, owner: null, buildingId: null,
    }))
  );
  return { grid, width, height };
}
