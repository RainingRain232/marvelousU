// ---------------------------------------------------------------------------
// Terraria – 2D Chunk data structure (16 wide x 256 tall)
// ---------------------------------------------------------------------------

import { TB } from "../config/TerrariaBalance";
import { BlockType } from "../config/TerrariaBlockDefs";
import type { WallType } from "../config/TerrariaBlockDefs";

const CW = TB.CHUNK_W;
const CH = TB.WORLD_HEIGHT;

export class TerrariaChunk {
  readonly cx: number;
  readonly blocks: Uint16Array;
  readonly walls: Uint8Array;
  readonly lightMap: Uint8Array;
  readonly heightMap: Uint8Array;  // per-column highest solid block Y
  dirty = true;
  lightDirty = true;
  populated = false;

  constructor(cx: number) {
    this.cx = cx;
    this.blocks = new Uint16Array(CW * CH);
    this.walls = new Uint8Array(CW * CH);
    this.lightMap = new Uint8Array(CW * CH);
    this.heightMap = new Uint8Array(CW);
  }

  private _idx(lx: number, y: number): number {
    return y * CW + lx;
  }

  getBlock(lx: number, y: number): BlockType {
    if (lx < 0 || lx >= CW || y < 0 || y >= CH) return BlockType.AIR;
    return this.blocks[this._idx(lx, y)] as BlockType;
  }

  setBlock(lx: number, y: number, block: BlockType): void {
    if (lx < 0 || lx >= CW || y < 0 || y >= CH) return;
    this.blocks[this._idx(lx, y)] = block;
    this.dirty = true;
    this.lightDirty = true;
    // Update height map
    if (block !== BlockType.AIR) {
      if (y > this.heightMap[lx]) this.heightMap[lx] = y;
    } else if (y === this.heightMap[lx]) {
      // Recalculate height for this column
      let h = 0;
      for (let sy = CH - 1; sy >= 0; sy--) {
        if (this.blocks[this._idx(lx, sy)] !== BlockType.AIR) { h = sy; break; }
      }
      this.heightMap[lx] = h;
    }
  }

  getWall(lx: number, y: number): WallType {
    if (lx < 0 || lx >= CW || y < 0 || y >= CH) return 0;
    return this.walls[this._idx(lx, y)];
  }

  setWall(lx: number, y: number, wall: WallType): void {
    if (lx < 0 || lx >= CW || y < 0 || y >= CH) return;
    this.walls[this._idx(lx, y)] = wall;
    this.dirty = true;
  }

  getLight(lx: number, y: number): number {
    if (lx < 0 || lx >= CW || y < 0 || y >= CH) return 0;
    return this.lightMap[this._idx(lx, y)];
  }

  setLight(lx: number, y: number, level: number): void {
    if (lx < 0 || lx >= CW || y < 0 || y >= CH) return;
    this.lightMap[this._idx(lx, y)] = level;
  }

  /** Recompute heightMap for all 16 columns. */
  rebuildHeightMap(): void {
    for (let lx = 0; lx < CW; lx++) {
      let h = 0;
      for (let y = CH - 1; y >= 0; y--) {
        if (this.blocks[this._idx(lx, y)] !== BlockType.AIR) { h = y; break; }
      }
      this.heightMap[lx] = h;
    }
  }
}

/** Convert world X to chunk index. */
export function worldToChunkX(wx: number): number {
  return Math.floor(wx / CW);
}

/** Convert world X to local X within chunk. */
export function worldToLocalX(wx: number): number {
  return ((wx % CW) + CW) % CW;
}
