// ---------------------------------------------------------------------------
// Settlers – Map state
// ---------------------------------------------------------------------------

export enum Biome {
  WATER = 0,
  MEADOW = 1,
  FOREST = 2,
  MOUNTAIN = 3,
  DESERT = 4,
}

/** Per-tile resource deposit type (0 = none) */
/** Per-tile fog of war visibility (per player) */
export enum Visibility {
  HIDDEN = 0,
  EXPLORED = 1,
  VISIBLE = 2,
}

export enum Deposit {
  NONE = 0,
  IRON = 1,
  GOLD = 2,
  COAL = 3,
  STONE = 4,
  FISH = 5,
}

export interface SettlersMap {
  width: number;
  height: number;
  tileSize: number;

  /** Vertex heights – (width+1)*(height+1) floats */
  heightmap: Float32Array;

  /** Per-tile biome */
  biomes: Uint8Array;

  /** Per-tile resource deposit */
  deposits: Uint8Array;

  /** Per-tile territory owner (-1 = neutral) */
  territory: Int8Array;

  /**
   * Per-tile buildability:
   *  0 = unbuildable (water, too steep)
   *  1 = small only
   *  2 = small or medium
   *  3 = any size
   */
  buildable: Uint8Array;

  /** Per-tile building ID occupying this tile (empty string = free) */
  occupied: string[];

  /**
   * Per-player visibility grids: playerIndex -> Uint8Array of Visibility values.
   * Index 0 = human player (p0), index 1 = AI (p1).
   */
  visibility: Uint8Array[];

  /** Tree positions for rendering (subset of forest tiles) */
  trees: { x: number; z: number; scale: number; variant: number }[];
  /** Rock positions for rendering */
  rocks: { x: number; z: number; scale: number }[];
}

/** Get heightmap vertex at (vx, vz) where 0 <= vx <= width, 0 <= vz <= height */
export function getVertex(map: SettlersMap, vx: number, vz: number): number {
  return map.heightmap[vz * (map.width + 1) + vx];
}

/** Interpolated height at any world position */
export function getHeightAt(map: SettlersMap, worldX: number, worldZ: number): number {
  const tx = worldX / map.tileSize;
  const tz = worldZ / map.tileSize;
  const ix = Math.floor(tx);
  const iz = Math.floor(tz);
  const fx = tx - ix;
  const fz = tz - iz;
  const cx = Math.min(ix, map.width - 1);
  const cz = Math.min(iz, map.height - 1);
  const cx1 = Math.min(cx + 1, map.width);
  const cz1 = Math.min(cz + 1, map.height);
  const h00 = getVertex(map, cx, cz);
  const h10 = getVertex(map, cx1, cz);
  const h01 = getVertex(map, cx, cz1);
  const h11 = getVertex(map, cx1, cz1);
  const top = h00 + (h10 - h00) * fx;
  const bot = h01 + (h11 - h01) * fx;
  return top + (bot - top) * fz;
}

/** Tile index from tile coords */
export function tileIdx(map: SettlersMap, tx: number, tz: number): number {
  return tz * map.width + tx;
}

/** Check if tile coords are in bounds */
export function inBounds(map: SettlersMap, tx: number, tz: number): boolean {
  return tx >= 0 && tx < map.width && tz >= 0 && tz < map.height;
}
