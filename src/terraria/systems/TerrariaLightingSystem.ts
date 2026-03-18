// ---------------------------------------------------------------------------
// Terraria – 2D BFS flood-fill light propagation
// ---------------------------------------------------------------------------

import { TB } from "../config/TerrariaBalance";
import { BLOCK_DEFS } from "../config/TerrariaBlockDefs";
import type { TerrariaState } from "../state/TerrariaState";
import { getWorldBlock } from "../state/TerrariaState";
import { worldToChunkX, worldToLocalX } from "../state/TerrariaChunk";

const CW = TB.CHUNK_W;
const WH = TB.WORLD_HEIGHT;

// ---------------------------------------------------------------------------
// Full light recalculation for visible area
// ---------------------------------------------------------------------------

export function recalcLighting(state: TerrariaState): void {
  // Clear all light maps
  for (const chunk of state.chunks.values()) {
    if (!chunk.lightDirty) continue;
    chunk.lightMap.fill(0);
  }

  // BFS queue: [worldX, worldY, lightLevel]
  const queue: [number, number, number][] = [];

  // Seed sunlight from above
  for (let wx = 0; wx < state.worldWidth; wx++) {
    const cx = worldToChunkX(wx);
    const chunk = state.chunks.get(cx);
    if (!chunk) continue;
    const lx = worldToLocalX(wx);

    // Trace sunlight downward from top
    let sunBlocked = false;
    for (let y = WH - 1; y >= 0; y--) {
      const bt = chunk.getBlock(lx, y);
      const def = BLOCK_DEFS[bt];
      if (def && def.solid && !def.transparent) {
        sunBlocked = true;
      }
      if (!sunBlocked) {
        const level = state.sunlightLevel;
        chunk.setLight(lx, y, level);
        // Only add edges to BFS (where light might spread into caves)
        if (_hasOpaqueNeighbor(state, wx, y)) {
          queue.push([wx, y, level]);
        }
      }
    }
  }

  // Seed light-emitting blocks
  for (const chunk of state.chunks.values()) {
    const baseX = chunk.cx * CW;
    for (let lx = 0; lx < CW; lx++) {
      for (let y = 0; y < WH; y++) {
        const bt = chunk.getBlock(lx, y);
        const def = BLOCK_DEFS[bt];
        if (def && def.lightEmit > 0) {
          const wx = baseX + lx;
          const current = chunk.getLight(lx, y);
          if (def.lightEmit > current) {
            chunk.setLight(lx, y, def.lightEmit);
            queue.push([wx, y, def.lightEmit]);
          }
        }
      }
    }
  }

  // BFS propagation
  const dirs: [number, number][] = [[1,0],[-1,0],[0,1],[0,-1]];
  while (queue.length > 0) {
    const [wx, wy, level] = queue.shift()!;
    if (level <= 1) continue;

    for (const [dx, dy] of dirs) {
      const nx = wx + dx;
      const ny = wy + dy;
      if (nx < 0 || nx >= state.worldWidth || ny < 0 || ny >= WH) continue;

      const ncx = worldToChunkX(nx);
      const nchunk = state.chunks.get(ncx);
      if (!nchunk) continue;
      const nlx = worldToLocalX(nx);

      const bt = nchunk.getBlock(nlx, ny);
      const def = BLOCK_DEFS[bt];
      // Light passes through transparent blocks and air; solid opaque blocks stop light
      if (def && def.solid && !def.transparent) continue;

      const newLevel = level - 1;
      if (newLevel > nchunk.getLight(nlx, ny)) {
        nchunk.setLight(nlx, ny, newLevel);
        queue.push([nx, ny, newLevel]);
      }
    }
  }

  // Mark chunks as light-clean
  for (const chunk of state.chunks.values()) {
    chunk.lightDirty = false;
  }
}

function _hasOpaqueNeighbor(state: TerrariaState, wx: number, wy: number): boolean {
  const dirs: [number, number][] = [[1,0],[-1,0],[0,1],[0,-1]];
  for (const [dx, dy] of dirs) {
    const nx = wx + dx;
    const ny = wy + dy;
    if (nx < 0 || nx >= state.worldWidth || ny < 0 || ny >= WH) continue;
    const bt = getWorldBlock(state, nx, ny);
    const def = BLOCK_DEFS[bt];
    if (def && def.solid && !def.transparent) return true;
  }
  return false;
}

/** Recalculate lighting only for chunks near the given world position. */
export function recalcLightingLocal(state: TerrariaState, wx: number, _wy: number, radius = 20): void {
  // Mark affected chunks as dirty
  const minCX = worldToChunkX(Math.max(0, wx - radius));
  const maxCX = worldToChunkX(Math.min(state.worldWidth - 1, wx + radius));
  for (let cx = minCX; cx <= maxCX; cx++) {
    const chunk = state.chunks.get(cx);
    if (chunk) chunk.lightDirty = true;
  }
  recalcLighting(state);
}
