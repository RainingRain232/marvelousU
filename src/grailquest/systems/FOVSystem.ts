// ---------------------------------------------------------------------------
// Grail Quest — Field of View (recursive shadowcasting)
// ---------------------------------------------------------------------------

import type { GrailState } from "../types";
import { TileType } from "../types";
import { GRAIL_BALANCE as B } from "../config/GrailBalance";

// ---------------------------------------------------------------------------
// Opacity check
// ---------------------------------------------------------------------------

export function isOpaque(tile: TileType): boolean {
  return tile === TileType.WALL || tile === TileType.LOCKED_DOOR;
}

// ---------------------------------------------------------------------------
// 8-octant recursive shadowcasting
// ---------------------------------------------------------------------------

// Octant multipliers for transforming (row, col) into (dx, dy).
// Each octant is [xx, xy, yx, yy].
const OCTANT_MULT: [number, number, number, number][] = [
  [ 1,  0,  0,  1],
  [ 0,  1,  1,  0],
  [ 0, -1,  1,  0],
  [-1,  0,  0,  1],
  [-1,  0,  0, -1],
  [ 0, -1, -1,  0],
  [ 0,  1, -1,  0],
  [ 1,  0,  0, -1],
];

function castOctant(
  state: GrailState,
  cx: number, cy: number,
  radius: number,
  oct: number,
  startSlope: number,
  endSlope: number,
  row: number,
): void {
  const { tiles, cols, rows } = state.dungeon;
  const [xx, xy, yx, yy] = OCTANT_MULT[oct];

  if (startSlope < endSlope) return;

  let nextStartSlope = startSlope;

  for (let r = row; r <= radius; r++) {
    let blocked = false;

    for (let col = -r; col <= 0; col++) {
      const leftSlope  = (col - 0.5) / (r + 0.5);
      const rightSlope = (col + 0.5) / (r - 0.5);

      if (startSlope < rightSlope) continue;
      if (endSlope > leftSlope) break;

      // Map position
      const dx = col * xx + r * xy;
      const dy = col * yx + r * yy;
      const mapX = cx + dx;
      const mapY = cy + dy;

      // Range check (circular)
      const dist2 = dx * dx + dy * dy;
      const inRadius = dist2 <= radius * radius;

      if (mapX >= 0 && mapX < cols && mapY >= 0 && mapY < rows) {
        if (inRadius) {
          state.visible[mapY][mapX] = true;
          state.explored[mapY][mapX] = true;
        }

        const tileBlocks = isOpaque(tiles[mapY][mapX]);

        if (blocked) {
          if (tileBlocks) {
            // Still in shadow — adjust start slope
            nextStartSlope = rightSlope;
          } else {
            // End of shadow — recurse with new start slope
            blocked = false;
            startSlope = nextStartSlope;
          }
        } else if (tileBlocks && r < radius) {
          // Hit a wall — recurse for the remaining lit portion
          blocked = true;
          castOctant(state, cx, cy, radius, oct, startSlope, leftSlope, r + 1);
          nextStartSlope = rightSlope;
        }
      }
    }

    if (blocked) break;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function computeFOV(state: GrailState): void {
  const { cols, rows } = state.dungeon;

  // Reset current visibility
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      state.visible[y][x] = false;
    }
  }

  const px = state.playerX;
  const py = state.playerY;
  const radius = B.FOV_RADIUS_BASE + state.playerPerception;

  // Player tile is always visible
  state.visible[py][px] = true;
  state.explored[py][px] = true;

  // Cast all 8 octants
  for (let oct = 0; oct < 8; oct++) {
    castOctant(state, px, py, radius, oct, 1.0, 0.0, 1);
  }
}
