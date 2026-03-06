// Procedural overworld map generator using Perlin-like noise
import { OverworldTileType } from "@/types";
import type { Vec2 } from "@/types";
import { SeededRandom } from "@sim/utils/random";
import type { OverworldTile, OverworldEntity, OverworldState } from "@rpg/state/OverworldState";
import { createOverworldState } from "@rpg/state/OverworldState";
import type { DungeonEntranceData, TownData } from "@rpg/state/OverworldState";
import { RPGBalance } from "@rpg/config/RPGBalanceConfig";
import { STARTER_TOWN_SHOP, MID_TOWN_SHOP, LATE_TOWN_SHOP } from "@rpg/config/RPGItemDefs";

// ---------------------------------------------------------------------------
// Simple 2D value noise (seeded)
// ---------------------------------------------------------------------------

function _createNoise(rng: SeededRandom): (x: number, y: number) => number {
  const GRID = 256;
  const perm: number[] = [];
  for (let i = 0; i < GRID; i++) perm.push(i);
  // Fisher-Yates shuffle
  for (let i = GRID - 1; i > 0; i--) {
    const j = rng.int(0, i + 1);
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  // Double for wrapping
  for (let i = 0; i < GRID; i++) perm.push(perm[i]);

  const gradients: Vec2[] = [];
  for (let i = 0; i < GRID; i++) {
    const angle = rng.float(0, Math.PI * 2);
    gradients.push({ x: Math.cos(angle), y: Math.sin(angle) });
  }

  function fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  function dot(gi: number, x: number, y: number): number {
    const g = gradients[gi % gradients.length];
    return g.x * x + g.y * y;
  }

  function lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  return (x: number, y: number): number => {
    const xi = Math.floor(x) & (GRID - 1);
    const yi = Math.floor(y) & (GRID - 1);
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const u = fade(xf);
    const v = fade(yf);

    const aa = perm[perm[xi] + yi];
    const ab = perm[perm[xi] + yi + 1];
    const ba = perm[perm[xi + 1] + yi];
    const bb = perm[perm[xi + 1] + yi + 1];

    const x1 = lerp(dot(aa, xf, yf), dot(ba, xf - 1, yf), u);
    const x2 = lerp(dot(ab, xf, yf - 1), dot(bb, xf - 1, yf - 1), u);

    return lerp(x1, x2, v);
  };
}

// ---------------------------------------------------------------------------
// Terrain selection
// ---------------------------------------------------------------------------

function _selectTerrain(
  elevation: number,
  moisture: number,
  distFromCenter: number,
  maxDist: number,
): { type: OverworldTileType; walkable: boolean; movementCost: number; encounterRate: number } {
  // Edge of map is water
  const edgeFactor = distFromCenter / maxDist;
  if (edgeFactor > 0.9) {
    return { type: OverworldTileType.WATER, walkable: false, movementCost: Infinity, encounterRate: 0 };
  }

  if (elevation < -0.3) {
    return { type: OverworldTileType.WATER, walkable: false, movementCost: Infinity, encounterRate: 0 };
  }
  if (elevation > 0.55) {
    return { type: OverworldTileType.MOUNTAIN, walkable: false, movementCost: Infinity, encounterRate: 0 };
  }
  if (elevation > 0.4) {
    // Snow near peaks
    return { type: OverworldTileType.SNOW, walkable: true, movementCost: 1.5, encounterRate: 0.06 };
  }
  if (moisture > 0.25) {
    return { type: OverworldTileType.FOREST, walkable: true, movementCost: 1.5, encounterRate: 0.12 };
  }
  if (moisture < -0.25) {
    return { type: OverworldTileType.SAND, walkable: true, movementCost: 1.3, encounterRate: 0.08 };
  }
  return { type: OverworldTileType.GRASS, walkable: true, movementCost: 1, encounterRate: 0.08 };
}

// ---------------------------------------------------------------------------
// Path carving (connects towns)
// ---------------------------------------------------------------------------

function _carvePath(grid: OverworldTile[][], from: Vec2, to: Vec2): void {
  let x = from.x;
  let y = from.y;
  while (x !== to.x || y !== to.y) {
    if (x >= 0 && x < grid[0].length && y >= 0 && y < grid.length) {
      const tile = grid[y][x];
      tile.type = OverworldTileType.PATH;
      tile.walkable = true;
      tile.movementCost = 0.5;
      tile.encounterRate = 0.03;
    }
    // Step toward target (Manhattan-ish)
    if (Math.abs(to.x - x) > Math.abs(to.y - y)) {
      x += to.x > x ? 1 : -1;
    } else {
      y += to.y > y ? 1 : -1;
    }
  }
}

// ---------------------------------------------------------------------------
// Find placement position
// ---------------------------------------------------------------------------

function _findPlacement(
  grid: OverworldTile[][],
  rng: SeededRandom,
  width: number,
  height: number,
  existing: Vec2[],
  minDist: number,
): Vec2 | null {
  for (let attempt = 0; attempt < 200; attempt++) {
    const x = rng.int(4, width - 4);
    const y = rng.int(4, height - 4);
    const tile = grid[y][x];
    if (!tile.walkable) continue;
    if (tile.entityId) continue;

    // Check minimum distance from existing placements
    let tooClose = false;
    for (const e of existing) {
      const dist = Math.abs(e.x - x) + Math.abs(e.y - y);
      if (dist < minDist) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) continue;

    return { x, y };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------

export function generateOverworld(seed: number): { state: OverworldState; startPosition: Vec2 } {
  const rng = new SeededRandom(seed);
  const width = RPGBalance.OVERWORLD_WIDTH;
  const height = RPGBalance.OVERWORLD_HEIGHT;

  const elevationNoise = _createNoise(rng);
  const moistureNoise = _createNoise(rng);

  const centerX = width / 2;
  const centerY = height / 2;
  const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);

  // Generate terrain
  const scale1 = 0.06;
  const scale2 = 0.12;

  const grid: OverworldTile[][] = [];
  for (let y = 0; y < height; y++) {
    const row: OverworldTile[] = [];
    for (let x = 0; x < width; x++) {
      const e1 = elevationNoise(x * scale1, y * scale1);
      const e2 = elevationNoise(x * scale2 + 100, y * scale2 + 100) * 0.5;
      const elevation = e1 + e2;

      const m1 = moistureNoise(x * scale1 + 200, y * scale1 + 200);
      const m2 = moistureNoise(x * scale2 + 300, y * scale2 + 300) * 0.5;
      const moisture = m1 + m2;

      const dx = x - centerX;
      const dy = y - centerY;
      const distFromCenter = Math.sqrt(dx * dx + dy * dy);

      const terrain = _selectTerrain(elevation, moisture, distFromCenter, maxDist);

      row.push({
        x,
        y,
        type: terrain.type,
        walkable: terrain.walkable,
        movementCost: terrain.movementCost,
        entityId: null,
        discovered: false,
        encounterRate: terrain.encounterRate,
      });
    }
    grid.push(row);
  }

  const placements: Vec2[] = [];

  // Place towns (4 towns)
  const townDefs = [
    { name: "Haven Village", shop: STARTER_TOWN_SHOP, innCost: 20 },
    { name: "Ironhold", shop: MID_TOWN_SHOP, innCost: 40 },
    { name: "Stormgate", shop: MID_TOWN_SHOP, innCost: 50 },
    { name: "Dragonrest", shop: LATE_TOWN_SHOP, innCost: 80 },
  ];

  const townPositions: Vec2[] = [];
  const entities = new Map<string, OverworldEntity>();

  for (let i = 0; i < townDefs.length; i++) {
    const pos = _findPlacement(grid, rng, width, height, placements, 12);
    if (!pos) continue;
    placements.push(pos);
    townPositions.push(pos);

    const townId = `town_${i}`;
    grid[pos.y][pos.x].entityId = townId;
    grid[pos.y][pos.x].encounterRate = 0; // No encounters on town tile

    const townData: TownData = {
      shopItems: townDefs[i].shop,
      innCost: townDefs[i].innCost,
      quests: [],
    };

    entities.set(townId, {
      id: townId,
      type: "town",
      position: pos,
      name: townDefs[i].name,
      data: townData,
    });
  }

  // Connect towns with paths
  for (let i = 0; i < townPositions.length - 1; i++) {
    _carvePath(grid, townPositions[i], townPositions[i + 1]);
  }

  // Place dungeon entrances (3 dungeons)
  const dungeonIds = ["goblin_caves", "dark_crypt", "dragon_lair"];
  const dungeonNames = ["Goblin Caves", "Dark Crypt", "Dragon's Lair"];
  const dungeonLevels = [3, 6, 10];

  for (let i = 0; i < dungeonIds.length; i++) {
    const pos = _findPlacement(grid, rng, width, height, placements, 8);
    if (!pos) continue;
    placements.push(pos);

    const entityId = `dungeon_${i}`;
    grid[pos.y][pos.x].entityId = entityId;
    grid[pos.y][pos.x].encounterRate = 0;

    const data: DungeonEntranceData = {
      dungeonId: dungeonIds[i],
      requiredLevel: dungeonLevels[i],
    };

    entities.set(entityId, {
      id: entityId,
      type: "dungeon_entrance",
      position: pos,
      name: dungeonNames[i],
      data,
    });
  }

  // Start position: near first town or center
  const startPosition = townPositions.length > 0
    ? { x: townPositions[0].x, y: townPositions[0].y + 1 }
    : { x: Math.floor(width / 2), y: Math.floor(height / 2) };

  // Make sure start is walkable
  if (!grid[startPosition.y]?.[startPosition.x]?.walkable) {
    grid[startPosition.y][startPosition.x].walkable = true;
    grid[startPosition.y][startPosition.x].type = OverworldTileType.GRASS;
    grid[startPosition.y][startPosition.x].movementCost = 1;
  }

  const state = createOverworldState(grid, width, height, startPosition);
  state.entities = entities;

  // Discover tiles around start
  const vr = RPGBalance.VISION_RADIUS;
  for (let dy = -vr; dy <= vr; dy++) {
    for (let dx = -vr; dx <= vr; dx++) {
      const tx = startPosition.x + dx;
      const ty = startPosition.y + dy;
      if (tx >= 0 && tx < width && ty >= 0 && ty < height) {
        grid[ty][tx].discovered = true;
      }
    }
  }

  return { state, startPosition };
}
