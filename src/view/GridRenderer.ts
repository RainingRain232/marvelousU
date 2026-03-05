// Background grid rendering — zone colors, walkability, terrain details
import { Graphics } from "pixi.js";
import type { BattlefieldState } from "@sim/state/BattlefieldState";
import type { ViewManager } from "@view/ViewManager";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { MapType } from "@/types";

// ---------------------------------------------------------------------------
// Deterministic hash for procedural placement
// ---------------------------------------------------------------------------

function tileHash(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 1274126177) | 0;
  h = ((h ^ (h >> 13)) * 1103515245) | 0;
  return ((h ^ (h >> 16)) >>> 0) / 0x100000000; // 0..1
}

function colorShift(base: number, amount: number, hash: number): number {
  const r = (base >> 16) & 0xff;
  const g = (base >> 8) & 0xff;
  const b = base & 0xff;
  const offset = Math.round((hash - 0.5) * 2 * amount);
  const clamp = (v: number) => Math.max(0, Math.min(255, v + offset));
  return (clamp(r) << 16) | (clamp(g) << 8) | clamp(b);
}

function colorDarken(base: number, factor: number): number {
  const r = Math.round(((base >> 16) & 0xff) * factor);
  const g = Math.round(((base >> 8) & 0xff) * factor);
  const b = Math.round((base & 0xff) * factor);
  return (r << 16) | (g << 8) | b;
}

function colorLighten(base: number, factor: number): number {
  const r = Math.min(255, Math.round(((base >> 16) & 0xff) * factor));
  const g = Math.min(255, Math.round(((base >> 8) & 0xff) * factor));
  const b = Math.min(255, Math.round((base & 0xff) * factor));
  return (r << 16) | (g << 8) | b;
}

// ---------------------------------------------------------------------------
// Tile color palette
// ---------------------------------------------------------------------------

type TileColorSet = {
  west_walkable: number;
  west_unwalkable: number;
  neutral_walkable: number;
  neutral_unwalkable: number;
  east_walkable: number;
  east_unwalkable: number;
};

/** Fill colors per zone × walkability combination (0xRRGGBB). */
const TILE_COLORS_MEADOW: TileColorSet = {
  west_walkable: 0x2d4c2d, // muted green — west territory
  west_unwalkable: 0x1e331e, // dark muted green — impassable west
  neutral_walkable: 0x3a5a30, // vibrant green — contested zone
  neutral_unwalkable: 0x203518, // dark green — impassable neutral
  east_walkable: 0x5c4d2d, // brownish green — east territory
  east_unwalkable: 0x3d331e, // dark brownish green — impassable east
};

const TILE_COLORS_GRASS: TileColorSet = {
  west_walkable: 0x3a6b2a, // lush green — west territory
  west_unwalkable: 0x2a5020, // deep green — impassable west
  neutral_walkable: 0x4a8035, // bright verdant — contested zone
  neutral_unwalkable: 0x2d5a1e, // deep verdant — impassable neutral
  east_walkable: 0x3d7030, // rich green — east territory
  east_unwalkable: 0x2c5522, // dark rich green — impassable east
};

const TILE_COLORS_PLAINS: TileColorSet = {
  west_walkable: 0x8a7d48, // warm golden tan — west territory
  west_unwalkable: 0x6b5f38, // darker tan — impassable west
  neutral_walkable: 0x9c8e52, // sun-bleached gold — contested zone
  neutral_unwalkable: 0x746840, // dusty brown — impassable neutral
  east_walkable: 0x7d7040, // dry straw — east territory
  east_unwalkable: 0x5e5430, // deep straw — impassable east
};

const TILE_COLORS_FOREST: TileColorSet = {
  west_walkable: 0x1a3318, // deep shadowed moss
  west_unwalkable: 0x0f1f0e, // near-black undergrowth
  neutral_walkable: 0x1e3a1a, // dark emerald floor
  neutral_unwalkable: 0x122210, // pitch-dark thicket
  east_walkable: 0x1d3520, // twilight green
  east_unwalkable: 0x112015, // deep shadow
};

const TILE_COLORS_FANTASIA: TileColorSet = {
  west_walkable: 0x3a6a35, // enchanted forest green
  west_unwalkable: 0x2a4a28, // mystical woodland
  neutral_walkable: 0x4a7a45, // glowing emerald floor
  neutral_unwalkable: 0x2a4a28, // enchanted thicket
  east_walkable: 0x4a6a40, // magical twilight green
  east_unwalkable: 0x2a4a30, // ethereal shadow
};

const TILE_COLORS_TUNDRA: TileColorSet = {
  west_walkable: 0x8899aa,   // cold grey-blue
  west_unwalkable: 0x667788, // dark frozen
  neutral_walkable: 0x99aabb, // icy blue
  neutral_unwalkable: 0x778899, // frozen shadow
  east_walkable: 0x8a9aaa,   // frosty grey
  east_unwalkable: 0x6a7a8a, // deep frost
};

const TILE_COLORS_SWAMP: TileColorSet = {
  west_walkable: 0x3a5a2a,   // murky green
  west_unwalkable: 0x2a3a1a, // dark bog
  neutral_walkable: 0x4a6a35, // sickly green
  neutral_unwalkable: 0x2a4a20, // deep mire
  east_walkable: 0x3d5a30,   // mossy brown-green
  east_unwalkable: 0x2a3d20, // dark swamp
};

const TILE_COLORS_VOLCANIC: TileColorSet = {
  west_walkable: 0x4a3a3a,   // dark ashen
  west_unwalkable: 0x2a1a1a, // charred black
  neutral_walkable: 0x5a4040, // warm ash
  neutral_unwalkable: 0x3a2020, // dark cinder
  east_walkable: 0x4a3535,   // scorched earth
  east_unwalkable: 0x2a1515, // blackened rock
};

const TILE_COLORS_OCEAN: TileColorSet = {
  west_walkable: 0x2a5588,   // deep sea blue
  west_unwalkable: 0x1a3a66, // abyss
  neutral_walkable: 0x336699, // ocean blue
  neutral_unwalkable: 0x224477, // deep water
  east_walkable: 0x2a5a8a,   // coastal blue
  east_unwalkable: 0x1a3a6a, // dark depths
};

const TILE_COLORS_HILLS: TileColorSet = {
  west_walkable: 0x7a6a3a,   // brown hillside
  west_unwalkable: 0x5a4a2a, // rocky shadow
  neutral_walkable: 0x8a7a48, // sunlit ridge
  neutral_unwalkable: 0x6a5a38, // shaded slope
  east_walkable: 0x7d6d40,   // dry ridge
  east_unwalkable: 0x5d4d30, // dark ravine
};

const TILE_COLORS_MOUNTAINS: TileColorSet = {
  west_walkable: 0x707070,   // grey stone
  west_unwalkable: 0x505050, // dark rock
  neutral_walkable: 0x808080, // granite
  neutral_unwalkable: 0x5a5a5a, // deep stone
  east_walkable: 0x757575,   // weathered rock
  east_unwalkable: 0x555555, // mountain shadow
};

const TILE_COLORS_DESERT: TileColorSet = {
  west_walkable: 0xc4a850,   // warm sand
  west_unwalkable: 0xa48838, // dark dune shadow
  neutral_walkable: 0xd4b860, // bright sand
  neutral_unwalkable: 0xb49840, // shaded sand
  east_walkable: 0xbca048,   // dry sand
  east_unwalkable: 0x9c8038, // deep shade
};

const TILE_COLORS: Record<string, TileColorSet> = {
  [MapType.MEADOW]: TILE_COLORS_MEADOW,
  [MapType.GRASS]: TILE_COLORS_GRASS,
  [MapType.PLAINS]: TILE_COLORS_PLAINS,
  [MapType.FOREST]: TILE_COLORS_FOREST,
  [MapType.FANTASIA]: TILE_COLORS_FANTASIA,
  [MapType.TUNDRA]: TILE_COLORS_TUNDRA,
  [MapType.SWAMP]: TILE_COLORS_SWAMP,
  [MapType.VOLCANIC]: TILE_COLORS_VOLCANIC,
  [MapType.OCEAN]: TILE_COLORS_OCEAN,
  [MapType.HILLS]: TILE_COLORS_HILLS,
  [MapType.MOUNTAINS]: TILE_COLORS_MOUNTAINS,
  [MapType.DESERT]: TILE_COLORS_DESERT,
};

const TILE_COLORS_DEFAULT = TILE_COLORS_MEADOW;

/** Tint applied over a tile occupied by a building (additive alpha blend). */
const BUILDING_TINT_COLOR = 0x000000; // darker footprint
const BUILDING_TINT_ALPHA = 0; // Set to 0 to keep background visible

// ---------------------------------------------------------------------------
// Terrain detail configuration per map type
// ---------------------------------------------------------------------------

interface TerrainDetailConfig {
  // Grass tufts / vegetation
  grassCount: number;        // how many grass tufts per tile
  grassColor: number;        // base color for grass blades
  grassHeight: [number, number]; // min/max height of grass blades

  // Small rocks / pebbles
  rockCount: number;
  rockColor: number;
  rockSize: [number, number]; // min/max radius

  // Decorative accents (flowers for meadow, mushrooms for forest, etc.)
  accentCount: number;
  accentColors: number[];
  accentSize: [number, number];

  // Dirt / soil patches
  patchCount: number;
  patchColor: number;
  patchSize: [number, number]; // min/max radius

  // Color variation per tile
  tileColorVariation: number; // how much to shift the base tile color (0-30)
}

const DETAIL_MEADOW: TerrainDetailConfig = {
  grassCount: 8,
  grassColor: 0x3d6630,
  grassHeight: [4, 10],
  rockCount: 2,
  rockColor: 0x6b6b60,
  rockSize: [1.5, 3],
  accentCount: 3,
  accentColors: [0xdddd44, 0xee8833, 0xcc55aa, 0xeeeedd],
  accentSize: [1.5, 3],
  patchCount: 2,
  patchColor: 0x4a3a20,
  patchSize: [4, 8],
  tileColorVariation: 12,
};

const DETAIL_GRASS: TerrainDetailConfig = {
  grassCount: 12,
  grassColor: 0x4a8530,
  grassHeight: [5, 14],
  rockCount: 1,
  rockColor: 0x5a5a50,
  rockSize: [1.5, 2.5],
  accentCount: 2,
  accentColors: [0xccdd33, 0x88cc44],
  accentSize: [1, 2.5],
  patchCount: 1,
  patchColor: 0x2a4a18,
  patchSize: [5, 10],
  tileColorVariation: 15,
};

const DETAIL_PLAINS: TerrainDetailConfig = {
  grassCount: 6,
  grassColor: 0xa09050,
  grassHeight: [3, 8],
  rockCount: 3,
  rockColor: 0x8a8070,
  rockSize: [2, 4],
  accentCount: 1,
  accentColors: [0xbbaa55, 0xccbb66],
  accentSize: [1.5, 3],
  patchCount: 3,
  patchColor: 0x6a5a30,
  patchSize: [5, 12],
  tileColorVariation: 10,
};

const DETAIL_FOREST: TerrainDetailConfig = {
  grassCount: 5,
  grassColor: 0x1a4418,
  grassHeight: [3, 8],
  rockCount: 2,
  rockColor: 0x3a3a30,
  rockSize: [2, 4],
  accentCount: 3,
  accentColors: [0x884422, 0xcc4433, 0xddaa33], // mushrooms and fallen leaves
  accentSize: [2, 4],
  patchCount: 3,
  patchColor: 0x0e1e0c,
  patchSize: [6, 14],
  tileColorVariation: 8,
};

const DETAIL_FANTASIA: TerrainDetailConfig = {
  grassCount: 7,
  grassColor: 0x44aa55,
  grassHeight: [4, 11],
  rockCount: 2,
  rockColor: 0x6655aa,
  rockSize: [2, 3.5],
  accentCount: 4,
  accentColors: [0xaa44ff, 0x44ddff, 0xff44aa, 0xffdd44], // magical glowing bits
  accentSize: [1.5, 3.5],
  patchCount: 2,
  patchColor: 0x224422,
  patchSize: [5, 10],
  tileColorVariation: 18,
};

const DETAIL_TUNDRA: TerrainDetailConfig = {
  grassCount: 4,
  grassColor: 0x88aaaa,
  grassHeight: [2, 6],
  rockCount: 4,
  rockColor: 0x8899aa,
  rockSize: [2, 5],
  accentCount: 2,
  accentColors: [0xccddee, 0xaabbdd, 0xeeeeff], // ice crystals, frost
  accentSize: [1.5, 3],
  patchCount: 3,
  patchColor: 0x99aabb,
  patchSize: [5, 12],
  tileColorVariation: 8,
};

const DETAIL_SWAMP: TerrainDetailConfig = {
  grassCount: 10,
  grassColor: 0x3a6a28,
  grassHeight: [4, 12],
  rockCount: 1,
  rockColor: 0x4a4a38,
  rockSize: [2, 4],
  accentCount: 4,
  accentColors: [0x556b2f, 0x8fbc8f, 0x6b8e23, 0x9acd32], // mosses, algae
  accentSize: [2, 4],
  patchCount: 4,
  patchColor: 0x2a3a18,
  patchSize: [6, 14],
  tileColorVariation: 10,
};

const DETAIL_VOLCANIC: TerrainDetailConfig = {
  grassCount: 2,
  grassColor: 0x3a2a1a,
  grassHeight: [2, 5],
  rockCount: 5,
  rockColor: 0x3a2a2a,
  rockSize: [2, 5],
  accentCount: 3,
  accentColors: [0xcc4400, 0xff6600, 0xffaa00], // lava glow, embers
  accentSize: [1.5, 3.5],
  patchCount: 3,
  patchColor: 0x1a1010,
  patchSize: [5, 12],
  tileColorVariation: 6,
};

const DETAIL_OCEAN: TerrainDetailConfig = {
  grassCount: 0,
  grassColor: 0x336699,
  grassHeight: [2, 4],
  rockCount: 0,
  rockColor: 0x445566,
  rockSize: [1, 3],
  accentCount: 3,
  accentColors: [0x66aadd, 0x88ccee, 0xaaddff], // foam, whitecaps
  accentSize: [2, 5],
  patchCount: 4,
  patchColor: 0x224466,
  patchSize: [8, 16],
  tileColorVariation: 12,
};

const DETAIL_HILLS: TerrainDetailConfig = {
  grassCount: 6,
  grassColor: 0x7a8a40,
  grassHeight: [3, 8],
  rockCount: 4,
  rockColor: 0x8a7a60,
  rockSize: [2.5, 5],
  accentCount: 2,
  accentColors: [0xbbaa55, 0x998844, 0xaa9955],
  accentSize: [1.5, 3],
  patchCount: 3,
  patchColor: 0x5a4a28,
  patchSize: [5, 12],
  tileColorVariation: 12,
};

const DETAIL_MOUNTAINS: TerrainDetailConfig = {
  grassCount: 2,
  grassColor: 0x556655,
  grassHeight: [2, 5],
  rockCount: 6,
  rockColor: 0x777777,
  rockSize: [3, 6],
  accentCount: 2,
  accentColors: [0xcccccc, 0xdddddd, 0xbbbbbb], // snow patches
  accentSize: [2, 4],
  patchCount: 2,
  patchColor: 0x555555,
  patchSize: [5, 10],
  tileColorVariation: 8,
};

const DETAIL_DESERT: TerrainDetailConfig = {
  grassCount: 2,
  grassColor: 0xb0a050,
  grassHeight: [2, 5],
  rockCount: 3,
  rockColor: 0xaa9060,
  rockSize: [2, 4],
  accentCount: 1,
  accentColors: [0xccaa55, 0xddbb66],
  accentSize: [1, 2.5],
  patchCount: 3,
  patchColor: 0xb09040,
  patchSize: [6, 14],
  tileColorVariation: 8,
};

const DETAIL_CONFIGS: Record<string, TerrainDetailConfig> = {
  [MapType.MEADOW]: DETAIL_MEADOW,
  [MapType.GRASS]: DETAIL_GRASS,
  [MapType.PLAINS]: DETAIL_PLAINS,
  [MapType.FOREST]: DETAIL_FOREST,
  [MapType.FANTASIA]: DETAIL_FANTASIA,
  [MapType.TUNDRA]: DETAIL_TUNDRA,
  [MapType.SWAMP]: DETAIL_SWAMP,
  [MapType.VOLCANIC]: DETAIL_VOLCANIC,
  [MapType.OCEAN]: DETAIL_OCEAN,
  [MapType.HILLS]: DETAIL_HILLS,
  [MapType.MOUNTAINS]: DETAIL_MOUNTAINS,
  [MapType.DESERT]: DETAIL_DESERT,
};

const DETAIL_DEFAULT = DETAIL_MEADOW;

// ---------------------------------------------------------------------------
// GridRenderer
// ---------------------------------------------------------------------------

/**
 * Renders the tile grid as stacked Graphics objects in the "background" layer:
 *   1. `_tiles`   — solid colored rectangles per tile (zone + walkability)
 *   2. `_details` — procedural terrain details (grass, rocks, flowers, etc.)
 *   3. `_tints`   — building footprint highlights
 *   4. `_lines`   — hairline grid overlay
 *
 * The grid is static — call `draw(battlefield)` once at startup and again
 * whenever the battlefield state changes (e.g., a building is placed).
 */
export class GridRenderer {
  private _tiles = new Graphics();
  private _details = new Graphics();
  private _lines = new Graphics();
  private _tints = new Graphics(); // building footprint highlights

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /** Add the grid graphics to the ViewManager background layer. */
  init(vm: ViewManager): void {
    vm.addToLayer("background", this._tiles);
    vm.addToLayer("background", this._details);
    vm.addToLayer("background", this._tints);
    vm.addToLayer("background", this._lines);
  }

  /** Remove from the scene and free GPU resources. */
  destroy(): void {
    this._tiles.destroy();
    this._details.destroy();
    this._tints.destroy();
    this._lines.destroy();
  }

  // ---------------------------------------------------------------------------
  // Drawing
  // ---------------------------------------------------------------------------

  /**
   * (Re-)draw the entire grid from the given battlefield state.
   * Safe to call every time buildings change.
   */
  draw(battlefield: BattlefieldState, mapType: MapType = MapType.MEADOW): void {
    this._drawTiles(battlefield, mapType);
    this._drawDetails(battlefield, mapType);
    this._drawBuildingTints(battlefield);
    this._drawLines(battlefield);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private _drawTiles(bf: BattlefieldState, mapType: MapType): void {
    const g = this._tiles;
    const ts = BalanceConfig.TILE_SIZE;
    const palette = TILE_COLORS[mapType] ?? TILE_COLORS_DEFAULT;
    const detail = DETAIL_CONFIGS[mapType] ?? DETAIL_DEFAULT;
    g.clear();

    for (const row of bf.grid) {
      for (const tile of row) {
        const isActuallyWalkable = tile.walkable || tile.buildingId !== null;
        const zoneKey = tile.zone === "nw" || tile.zone === "sw" ? "west"
          : tile.zone === "ne" || tile.zone === "se" ? "east"
          : tile.zone;
        const key =
          `${zoneKey}_${isActuallyWalkable ? "walkable" : "unwalkable"}` as keyof TileColorSet;
        const baseColor = palette[key];

        // Vary the base tile color slightly per tile for natural look
        const h = tileHash(tile.x, tile.y, 0);
        const color = colorShift(baseColor, detail.tileColorVariation, h);
        g.rect(tile.x * ts, tile.y * ts, ts, ts).fill({ color });
      }
    }
  }

  private _drawDetails(bf: BattlefieldState, mapType: MapType): void {
    const g = this._details;
    const ts = BalanceConfig.TILE_SIZE;
    const detail = DETAIL_CONFIGS[mapType] ?? DETAIL_DEFAULT;
    g.clear();

    for (const row of bf.grid) {
      for (const tile of row) {
        const ox = tile.x * ts;
        const oy = tile.y * ts;
        const tx = tile.x;
        const ty = tile.y;

        // --- Dirt / soil patches (drawn first, behind everything) ---
        for (let i = 0; i < detail.patchCount; i++) {
          const h1 = tileHash(tx, ty, 100 + i * 3);
          const h2 = tileHash(tx, ty, 101 + i * 3);
          const h3 = tileHash(tx, ty, 102 + i * 3);
          if (h1 > 0.5) continue; // only ~50% of patches appear
          const px = ox + h2 * (ts - 8) + 4;
          const py = oy + h3 * (ts - 8) + 4;
          const [minR, maxR] = detail.patchSize;
          const r = minR + h1 * 2 * (maxR - minR);
          g.circle(px, py, r).fill({ color: detail.patchColor, alpha: 0.3 });
        }

        // --- Small rocks / pebbles ---
        for (let i = 0; i < detail.rockCount; i++) {
          const h1 = tileHash(tx, ty, 200 + i * 4);
          const h2 = tileHash(tx, ty, 201 + i * 4);
          const h3 = tileHash(tx, ty, 202 + i * 4);
          const h4 = tileHash(tx, ty, 203 + i * 4);
          if (h1 > 0.45) continue; // ~45% chance per rock
          const px = ox + 4 + h2 * (ts - 8);
          const py = oy + 4 + h3 * (ts - 8);
          const [minR, maxR] = detail.rockSize;
          const r = minR + h4 * (maxR - minR);
          const rockCol = colorShift(detail.rockColor, 20, h1);
          // Slightly elliptical rock
          g.ellipse(px, py, r * 1.3, r * 0.8).fill({ color: rockCol, alpha: 0.7 });
          // Highlight on top-left
          g.ellipse(px - r * 0.3, py - r * 0.2, r * 0.5, r * 0.3)
            .fill({ color: colorLighten(rockCol, 1.4), alpha: 0.3 });
        }

        // --- Grass tufts / vegetation ---
        for (let i = 0; i < detail.grassCount; i++) {
          const h1 = tileHash(tx, ty, 300 + i * 5);
          const h2 = tileHash(tx, ty, 301 + i * 5);
          const h3 = tileHash(tx, ty, 302 + i * 5);
          const h4 = tileHash(tx, ty, 303 + i * 5);
          const h5 = tileHash(tx, ty, 304 + i * 5);
          if (h1 > 0.7) continue; // ~70% appear
          const px = ox + 3 + h2 * (ts - 6);
          const py = oy + 6 + h3 * (ts - 8);
          const [minH, maxH] = detail.grassHeight;
          const bladeH = minH + h4 * (maxH - minH);
          const lean = (h5 - 0.5) * 6; // slight lean left or right
          const grassCol = colorShift(detail.grassColor, 15, h1);

          // Draw 2-3 blades per tuft
          const bladeCount = h5 > 0.5 ? 3 : 2;
          for (let b = 0; b < bladeCount; b++) {
            const spread = (b - (bladeCount - 1) / 2) * 2.5;
            const bx = px + spread;
            // A blade is a thin triangle
            g.moveTo(bx - 0.6, py)
              .lineTo(bx + lean, py - bladeH)
              .lineTo(bx + 0.6, py)
              .fill({ color: grassCol, alpha: 0.75 });
          }
        }

        // --- Decorative accents (flowers, mushrooms, sparkles) ---
        for (let i = 0; i < detail.accentCount; i++) {
          const h1 = tileHash(tx, ty, 400 + i * 4);
          const h2 = tileHash(tx, ty, 401 + i * 4);
          const h3 = tileHash(tx, ty, 402 + i * 4);
          const h4 = tileHash(tx, ty, 403 + i * 4);
          if (h1 > 0.35) continue; // ~35% chance — sparse accents
          const px = ox + 5 + h2 * (ts - 10);
          const py = oy + 5 + h3 * (ts - 10);
          const [minS, maxS] = detail.accentSize;
          const s = minS + h4 * (maxS - minS);
          const accentCol = detail.accentColors[
            Math.floor(h1 * detail.accentColors.length * 2.8) % detail.accentColors.length
          ];

          if (mapType === MapType.FANTASIA) {
            // Glowing dots for fantasia
            g.circle(px, py, s).fill({ color: accentCol, alpha: 0.6 });
            g.circle(px, py, s * 0.5).fill({ color: 0xffffff, alpha: 0.3 });
          } else if (mapType === MapType.FOREST || mapType === MapType.SWAMP) {
            // Mushroom shapes for forest/swamp — cap + stem
            g.rect(px - 0.5, py - s * 0.5, 1, s * 0.6)
              .fill({ color: colorDarken(accentCol, 0.7), alpha: 0.7 });
            g.ellipse(px, py - s * 0.5, s * 1.0, s * 0.5)
              .fill({ color: accentCol, alpha: 0.65 });
          } else if (mapType === MapType.VOLCANIC) {
            // Glowing ember dots for volcanic
            g.circle(px, py, s).fill({ color: accentCol, alpha: 0.5 });
            g.circle(px, py, s * 0.4).fill({ color: 0xffcc00, alpha: 0.4 });
          } else if (mapType === MapType.TUNDRA) {
            // Ice crystal shapes — diamond
            g.moveTo(px, py - s).lineTo(px + s * 0.6, py)
              .lineTo(px, py + s).lineTo(px - s * 0.6, py)
              .fill({ color: accentCol, alpha: 0.4 });
          } else if (mapType === MapType.MOUNTAINS) {
            // Snow patches — irregular blobs
            g.ellipse(px, py, s * 1.2, s * 0.7)
              .fill({ color: accentCol, alpha: 0.35 });
          } else if (mapType === MapType.OCEAN) {
            // Foam / wave crests
            g.ellipse(px, py, s * 1.5, s * 0.4)
              .fill({ color: accentCol, alpha: 0.3 });
          } else {
            // Flower dots for meadow/grass/plains — petal ring
            const petalR = s * 0.5;
            for (let p = 0; p < 4; p++) {
              const angle = (p / 4) * Math.PI * 2 + h2 * 1.5;
              const cx = px + Math.cos(angle) * petalR;
              const cy = py + Math.sin(angle) * petalR;
              g.circle(cx, cy, s * 0.4).fill({ color: accentCol, alpha: 0.6 });
            }
            g.circle(px, py, s * 0.3).fill({ color: 0xeeee55, alpha: 0.7 });
          }
        }
      }
    }
  }

  private _drawBuildingTints(bf: BattlefieldState): void {
    const g = this._tints;
    const ts = BalanceConfig.TILE_SIZE;
    g.clear();

    for (const row of bf.grid) {
      for (const tile of row) {
        if (tile.buildingId !== null) {
          g.rect(tile.x * ts, tile.y * ts, ts, ts).fill({
            color: BUILDING_TINT_COLOR,
            alpha: BUILDING_TINT_ALPHA,
          });
        }
      }
    }
  }

  private _drawLines(_bf: BattlefieldState): void {
    this._lines.clear();
  }
}

/** Singleton — one GridRenderer per application. */
export const gridRenderer = new GridRenderer();
