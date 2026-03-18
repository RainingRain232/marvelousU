// ---------------------------------------------------------------------------
// Camelot Craft – Chunk data structure
// ---------------------------------------------------------------------------

import { CB } from "../config/CraftBalance";
import { BlockType } from "../config/CraftBlockDefs";

const S = CB.CHUNK_SIZE;
const H = CB.CHUNK_HEIGHT;

/**
 * A chunk stores a CHUNK_SIZE x CHUNK_HEIGHT x CHUNK_SIZE column of blocks.
 * Block data is stored in a flat Uint8Array for memory efficiency.
 * Index: y * S * S + z * S + x   (y is vertical / up)
 */
export class CraftChunk {
  /** Chunk coordinates (in chunk space, not world blocks). */
  readonly cx: number;
  readonly cz: number;

  /** Raw block data. */
  readonly blocks: Uint8Array;

  /** Dirty flag — set when blocks change, cleared after mesh rebuild. */
  dirty = true;

  /** Whether this chunk has been populated with terrain. */
  populated = false;

  /** Height-map cache: max solid y per column. Updated on block changes. */
  readonly heightMap: Uint8Array;

  constructor(cx: number, cz: number) {
    this.cx = cx;
    this.cz = cz;
    this.blocks = new Uint8Array(S * H * S); // defaults to 0 = AIR
    this.heightMap = new Uint8Array(S * S);
  }

  // --- Accessors --------------------------------------------------------

  private _idx(x: number, y: number, z: number): number {
    return y * S * S + z * S + x;
  }

  /** Get block at local coords (0..S-1, 0..H-1, 0..S-1). */
  getBlock(x: number, y: number, z: number): BlockType {
    if (x < 0 || x >= S || y < 0 || y >= H || z < 0 || z >= S) return BlockType.AIR;
    return this.blocks[this._idx(x, y, z)] as BlockType;
  }

  /** Set block at local coords. Returns previous block type. */
  setBlock(x: number, y: number, z: number, block: BlockType): BlockType {
    if (x < 0 || x >= S || y < 0 || y >= H || z < 0 || z >= S) return BlockType.AIR;
    const idx = this._idx(x, y, z);
    const prev = this.blocks[idx] as BlockType;
    this.blocks[idx] = block;
    this.dirty = true;

    // Update height map
    const hIdx = z * S + x;
    if (block !== BlockType.AIR && y >= this.heightMap[hIdx]) {
      this.heightMap[hIdx] = y;
    } else if (block === BlockType.AIR && y >= this.heightMap[hIdx]) {
      // Recalculate column height
      let h = 0;
      for (let iy = H - 1; iy >= 0; iy--) {
        if (this.blocks[this._idx(x, iy, z)] !== BlockType.AIR) {
          h = iy;
          break;
        }
      }
      this.heightMap[hIdx] = h;
    }

    return prev;
  }

  /** Get the highest solid block at column (x, z). */
  getHeight(x: number, z: number): number {
    if (x < 0 || x >= S || z < 0 || z >= S) return 0;
    return this.heightMap[z * S + x];
  }

  /** Rebuild height map from scratch. */
  rebuildHeightMap(): void {
    for (let x = 0; x < S; x++) {
      for (let z = 0; z < S; z++) {
        let h = 0;
        for (let y = H - 1; y >= 0; y--) {
          if (this.blocks[this._idx(x, y, z)] !== BlockType.AIR) {
            h = y;
            break;
          }
        }
        this.heightMap[z * S + x] = h;
      }
    }
  }

  /** World-space origin of this chunk. */
  get worldX(): number { return this.cx * S; }
  get worldZ(): number { return this.cz * S; }
}

/** Key string for chunk coordinates, used as map key. */
export function chunkKey(cx: number, cz: number): string {
  return `${cx},${cz}`;
}

/** Convert world block coordinate to chunk coordinate. */
export function worldToChunk(wx: number): number {
  return Math.floor(wx / S);
}

/** Convert world block coordinate to local-in-chunk coordinate. */
export function worldToLocal(wx: number): number {
  return ((wx % S) + S) % S;
}
