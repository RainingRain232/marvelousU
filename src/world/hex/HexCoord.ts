// Hex coordinate math for pointy-top hexagonal grids.
//
// Uses axial coordinates (q, r) as primary representation.
// Cube coordinates (q, r, s where s = -q - r) used internally for
// distance calculations and line drawing.
//
// Pointy-top orientation: flat sides on left/right, points on top/bottom.
// This gives a natural vertical map layout.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Axial hex coordinate. */
export interface HexCoord {
  q: number;
  r: number;
}

/** Cube hex coordinate (q + r + s = 0). */
export interface CubeCoord {
  q: number;
  r: number;
  s: number;
}

/** 2D pixel position. */
export interface HexPixel {
  x: number;
  y: number;
}

// ---------------------------------------------------------------------------
// Conversions
// ---------------------------------------------------------------------------

/** Convert axial to cube coordinates. */
export function axialToCube(hex: HexCoord): CubeCoord {
  return { q: hex.q, r: hex.r, s: -hex.q - hex.r };
}

/** Convert cube to axial coordinates. */
export function cubeToAxial(cube: CubeCoord): HexCoord {
  return { q: cube.q, r: cube.r };
}

/** Round fractional cube coordinates to the nearest hex. */
export function cubeRound(frac: CubeCoord): CubeCoord {
  let rq = Math.round(frac.q);
  let rr = Math.round(frac.r);
  let rs = Math.round(frac.s);

  const dq = Math.abs(rq - frac.q);
  const dr = Math.abs(rr - frac.r);
  const ds = Math.abs(rs - frac.s);

  if (dq > dr && dq > ds) {
    rq = -rr - rs;
  } else if (dr > ds) {
    rr = -rq - rs;
  } else {
    rs = -rq - rr;
  }

  return { q: rq, r: rr, s: rs };
}

// ---------------------------------------------------------------------------
// Key helper
// ---------------------------------------------------------------------------

/** Create a string key for Map lookups: "q,r". */
export function hexKey(q: number, r: number): string {
  return `${q},${r}`;
}

/** Create a string key from a HexCoord. */
export function hexKeyOf(hex: HexCoord): string {
  return `${hex.q},${hex.r}`;
}

/** Parse a "q,r" key back to HexCoord. */
export function parseHexKey(key: string): HexCoord {
  const [q, r] = key.split(",").map(Number);
  return { q, r };
}

// ---------------------------------------------------------------------------
// Distance
// ---------------------------------------------------------------------------

/** Manhattan distance between two hexes (number of hex steps). */
export function hexDistance(a: HexCoord, b: HexCoord): number {
  const ac = axialToCube(a);
  const bc = axialToCube(b);
  return Math.max(
    Math.abs(ac.q - bc.q),
    Math.abs(ac.r - bc.r),
    Math.abs(ac.s - bc.s),
  );
}

// ---------------------------------------------------------------------------
// Neighbors (pointy-top, 6 directions)
// ---------------------------------------------------------------------------

/** The 6 axial direction offsets for pointy-top hexes. */
export const HEX_DIRECTIONS: readonly HexCoord[] = [
  { q: +1, r:  0 }, // E
  { q: +1, r: -1 }, // NE
  { q:  0, r: -1 }, // NW
  { q: -1, r:  0 }, // W
  { q: -1, r: +1 }, // SW
  { q:  0, r: +1 }, // SE
];

/** Get the neighbor of a hex in a given direction (0–5). */
export function hexNeighbor(hex: HexCoord, direction: number): HexCoord {
  const d = HEX_DIRECTIONS[direction];
  return { q: hex.q + d.q, r: hex.r + d.r };
}

/** Get all 6 neighbors of a hex. */
export function hexNeighbors(hex: HexCoord): HexCoord[] {
  return HEX_DIRECTIONS.map((d) => ({ q: hex.q + d.q, r: hex.r + d.r }));
}

// ---------------------------------------------------------------------------
// Ring & spiral
// ---------------------------------------------------------------------------

/** Get all hexes at exactly `radius` steps from center. */
export function hexRing(center: HexCoord, radius: number): HexCoord[] {
  if (radius <= 0) return [center];

  const results: HexCoord[] = [];
  // Start at center + direction[4] * radius (SW corner)
  let hex: HexCoord = {
    q: center.q + HEX_DIRECTIONS[4].q * radius,
    r: center.r + HEX_DIRECTIONS[4].r * radius,
  };

  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < radius; j++) {
      results.push(hex);
      hex = hexNeighbor(hex, i);
    }
  }

  return results;
}

/** Get all hexes within `radius` steps from center (inclusive), spiraling outward. */
export function hexSpiral(center: HexCoord, radius: number): HexCoord[] {
  const results: HexCoord[] = [center];
  for (let r = 1; r <= radius; r++) {
    results.push(...hexRing(center, r));
  }
  return results;
}

// ---------------------------------------------------------------------------
// Line drawing
// ---------------------------------------------------------------------------

function cubeLerp(a: CubeCoord, b: CubeCoord, t: number): CubeCoord {
  return {
    q: a.q + (b.q - a.q) * t,
    r: a.r + (b.r - a.r) * t,
    s: a.s + (b.s - a.s) * t,
  };
}

/** Draw a line of hexes between a and b (inclusive). */
export function hexLinedraw(a: HexCoord, b: HexCoord): HexCoord[] {
  const N = hexDistance(a, b);
  if (N === 0) return [a];

  const ac = axialToCube(a);
  const bc = axialToCube(b);
  const results: HexCoord[] = [];

  for (let i = 0; i <= N; i++) {
    const t = i / N;
    // Add small epsilon to avoid rounding ties
    const lerped = cubeLerp(
      { q: ac.q + 1e-6, r: ac.r + 1e-6, s: ac.s - 2e-6 },
      { q: bc.q + 1e-6, r: bc.r + 1e-6, s: bc.s - 2e-6 },
      t,
    );
    const rounded = cubeRound(lerped);
    results.push(cubeToAxial(rounded));
  }

  return results;
}

// ---------------------------------------------------------------------------
// Pixel conversions (pointy-top)
// ---------------------------------------------------------------------------

const SQRT3 = Math.sqrt(3);

/** Convert hex coordinate to pixel center (pointy-top). */
export function hexToPixel(hex: HexCoord, size: number): HexPixel {
  const x = size * (SQRT3 * hex.q + (SQRT3 / 2) * hex.r);
  const y = size * ((3 / 2) * hex.r);
  return { x, y };
}

/** Convert pixel position to fractional hex coordinate (pointy-top). */
export function pixelToHex(px: number, py: number, size: number): HexCoord {
  const q = ((SQRT3 / 3) * px - (1 / 3) * py) / size;
  const r = ((2 / 3) * py) / size;
  // Round to nearest hex
  const cube = cubeRound({ q, r, s: -q - r });
  return cubeToAxial(cube);
}

/** Get the 6 corner pixel positions of a hex (for drawing outlines). */
export function hexCorners(center: HexPixel, size: number): HexPixel[] {
  const corners: HexPixel[] = [];
  for (let i = 0; i < 6; i++) {
    // Pointy-top: first corner at 30 degrees
    const angleDeg = 60 * i - 30;
    const angleRad = (Math.PI / 180) * angleDeg;
    corners.push({
      x: center.x + size * Math.cos(angleRad),
      y: center.y + size * Math.sin(angleRad),
    });
  }
  return corners;
}

// ---------------------------------------------------------------------------
// Equality
// ---------------------------------------------------------------------------

/** Check if two hex coordinates are equal. */
export function hexEquals(a: HexCoord, b: HexCoord): boolean {
  return a.q === b.q && a.r === b.r;
}
