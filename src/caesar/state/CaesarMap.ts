// ---------------------------------------------------------------------------
// Caesar – Tile map
// ---------------------------------------------------------------------------

import { CB } from "../config/CaesarBalance";

export type CaesarTerrain =
  | "grass"
  | "water"
  | "forest"
  | "hill"
  | "stone_deposit"
  | "iron_deposit";

export interface CaesarTile {
  terrain: CaesarTerrain;
  elevation: number;          // 0-1
  roadConnected: boolean;     // reachable from town center via roads
  desirability: number;       // cached desirability score
  // Service coverage timers (seconds remaining until service expires)
  serviceFood: number;
  serviceReligion: number;
  serviceSafety: number;
  serviceEntertainment: number;
  serviceCommerce: number;
  serviceWater: number;
}

export interface CaesarMapData {
  width: number;
  height: number;
  tiles: CaesarTile[];
}

export function createMap(w: number, h: number): CaesarMapData {
  const tiles: CaesarTile[] = [];
  for (let i = 0; i < w * h; i++) {
    tiles.push({
      terrain: "grass",
      elevation: 0,
      roadConnected: false,
      desirability: 0,
      serviceFood: 0,
      serviceReligion: 0,
      serviceSafety: 0,
      serviceEntertainment: 0,
      serviceCommerce: 0,
      serviceWater: 0,
    });
  }
  return { width: w, height: h, tiles };
}

export function tileAt(map: CaesarMapData, x: number, y: number): CaesarTile | null {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return null;
  return map.tiles[y * map.width + x];
}

export function tileIdx(map: CaesarMapData, x: number, y: number): number {
  return y * map.width + x;
}

export function inBounds(map: CaesarMapData, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < map.width && y < map.height;
}
