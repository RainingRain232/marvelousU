// ---------------------------------------------------------------------------
// Camelot Craft – Structure generation system
// Generates pre-built structures deterministically from the world seed.
// Called after terrain generation to overlay structures onto chunks.
// ---------------------------------------------------------------------------

import { CB } from "../config/CraftBalance";
import { BlockType } from "../config/CraftBlockDefs";
import { BiomeType } from "../config/CraftBiomeDefs";
import { CraftChunk } from "../state/CraftChunk";
import { getChestContents } from "./CraftContainerSystem";
import { ItemType, type ItemStack } from "../config/CraftRecipeDefs";

// ---------------------------------------------------------------------------
// Loot tables for structure chests
// ---------------------------------------------------------------------------

function populateChestLoot(wx: number, wy: number, wz: number, tier: "common" | "rare" | "epic", seed: number): void {
  const contents = getChestContents(wx, wy, wz);
  const rng = (i: number) => {
    let h = seed ^ (wx * 374761 + wy * 668265 + wz * 127412 + i * 99991);
    h = Math.imul(h ^ (h >>> 13), 1103515245);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };

  const blockItem = (bt: BlockType, count: number, name: string, color: number): ItemStack => ({
    itemType: ItemType.BLOCK, blockType: bt, count, displayName: name, color,
  });
  const toolItem = (id: string, name: string, color: number, dur: number): ItemStack => ({
    itemType: ItemType.TOOL, specialId: id, count: 1, displayName: name, color, durability: dur, maxDurability: dur,
  });
  const weaponItem = (id: string, name: string, color: number, dur: number): ItemStack => ({
    itemType: ItemType.WEAPON, specialId: id, count: 1, displayName: name, color, durability: dur, maxDurability: dur,
  });

  const commonLoot: (() => ItemStack)[] = [
    () => blockItem(BlockType.OAK_PLANKS, 4 + Math.floor(rng(50) * 12), "Oak Planks", 0xB8860B),
    () => blockItem(BlockType.COBBLESTONE, 6 + Math.floor(rng(51) * 16), "Cobblestone", 0x6B6B6B),
    () => blockItem(BlockType.TORCH, 3 + Math.floor(rng(52) * 6), "Torch", 0xFFA726),
    () => blockItem(BlockType.IRON_ORE, 2 + Math.floor(rng(53) * 4), "Iron Ore", 0xA0826D),
    () => ({ itemType: ItemType.FOOD, specialId: "apple", count: 2 + Math.floor(rng(54) * 3), displayName: "Apple", color: 0xE53935 }),
    () => blockItem(BlockType.OAK_LOG, 3 + Math.floor(rng(55) * 8), "Oak Log", 0x6B4226),
  ];

  const rareLoot: (() => ItemStack)[] = [
    ...commonLoot,
    () => blockItem(BlockType.GOLD_ORE, 2 + Math.floor(rng(60) * 4), "Gold Ore", 0xD4AF37),
    () => toolItem("iron_pickaxe", "Iron Pickaxe", 0xC0C0C0, 251),
    () => weaponItem("iron_sword", "Iron Sword", 0xC0C0C0, 251),
    () => blockItem(BlockType.ENCHANTED_CRYSTAL_ORE, 1 + Math.floor(rng(61) * 3), "Enchanted Crystal", 0x9C27B0),
    () => ({ itemType: ItemType.SPECIAL, specialId: "iron_helmet", count: 1, displayName: "Iron Helmet", color: 0xC0C0C0, durability: 165, maxDurability: 165 }),
  ];

  const epicLoot: (() => ItemStack)[] = [
    ...rareLoot,
    () => blockItem(BlockType.DRAGON_BONE_ORE, 1 + Math.floor(rng(70) * 2), "Dragon Bone", 0xE0D8C8),
    () => weaponItem("crystal_sword", "Crystal Sword", 0xCE93D8, 500),
    () => ({ itemType: ItemType.SPECIAL, specialId: "crystal_chestplate", count: 1, displayName: "Crystal Chestplate", color: 0xCE93D8, durability: 528, maxDurability: 528 }),
    () => blockItem(BlockType.ENCHANTED_TORCH, 4 + Math.floor(rng(71) * 8), "Enchanted Torch", 0xAB47BC),
  ];

  const pool = tier === "epic" ? epicLoot : tier === "rare" ? rareLoot : commonLoot;
  const numItems = tier === "epic" ? 4 + Math.floor(rng(80) * 3) : tier === "rare" ? 3 + Math.floor(rng(80) * 3) : 2 + Math.floor(rng(80) * 2);

  for (let i = 0; i < numItems && i < contents.length; i++) {
    const idx = Math.floor(rng(100 + i) * pool.length);
    contents[i] = pool[idx]();
  }
}

const S = CB.CHUNK_SIZE;
const H = CB.CHUNK_HEIGHT;

// ---------------------------------------------------------------------------
// Deterministic hash utilities
// ---------------------------------------------------------------------------

/** Integer hash — returns an unsigned 32-bit integer. */
function ihash(a: number, b: number, c: number): number {
  let h = (a * 374761393 + b * 668265263 + c * 1274126177) | 0;
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  h = h ^ (h >>> 16);
  return h >>> 0;
}

/** Float hash in [0, 1). */
function fhash(a: number, b: number, c: number): number {
  return ihash(a, b, c) / 4294967296;
}

/** Seeded hash combining seed + coords, returns [0, 1). */
function shash(seed: number, x: number, z: number): number {
  return fhash(seed, x, z);
}

/** Multi-purpose seeded hash with an extra salt. */
function shash2(seed: number, x: number, z: number, salt: number): number {
  return fhash(seed ^ salt, x, z);
}

// ---------------------------------------------------------------------------
// Unique location helpers (Excalibur & Grail)
// ---------------------------------------------------------------------------

/**
 * Return the deterministic world-block position for Excalibur's crystal cave.
 * Guaranteed unique per seed — picks a spot in a large ring around origin.
 */
export function getExcaliburLocation(seed: number): { wx: number; wz: number } {
  const angle = fhash(seed, 112233, 445566) * Math.PI * 2;
  const radius = 200 + fhash(seed, 778899, 101010) * 300;
  const wx = Math.round(Math.cos(angle) * radius);
  const wz = Math.round(Math.sin(angle) * radius);
  return { wx, wz };
}

/**
 * Return the deterministic world-block position for the Grail dungeon.
 * Placed in a different quadrant from Excalibur to keep them apart.
 */
export function getGrailLocation(seed: number): { wx: number; wz: number } {
  const angle = fhash(seed, 334455, 667788) * Math.PI * 2;
  const radius = 250 + fhash(seed, 990011, 223344) * 350;
  const wx = Math.round(Math.cos(angle) * radius);
  const wz = Math.round(Math.sin(angle) * radius);
  return { wx, wz };
}

// ---------------------------------------------------------------------------
// Safe block setter — only places blocks within chunk bounds
// ---------------------------------------------------------------------------

function safeSet(chunk: CraftChunk, lx: number, y: number, lz: number, block: BlockType): void {
  if (lx >= 0 && lx < S && lz >= 0 && lz < S && y >= 1 && y < H) {
    chunk.setBlock(lx, y, lz, block);
  }
}

/** Place a block only if the target is air (non-destructive overlay). */
function safeSetAir(chunk: CraftChunk, lx: number, y: number, lz: number, block: BlockType): void {
  if (lx >= 0 && lx < S && lz >= 0 && lz < S && y >= 1 && y < H) {
    if (chunk.getBlock(lx, y, lz) === BlockType.AIR) {
      chunk.setBlock(lx, y, lz, block);
    }
  }
}

/** Clear a block to air. */
function safeClear(chunk: CraftChunk, lx: number, y: number, lz: number): void {
  safeSet(chunk, lx, y, lz, BlockType.AIR);
}

/** Get surface height at a local column by scanning downward from top. */
function getSurfaceY(chunk: CraftChunk, lx: number, lz: number): number {
  for (let y = H - 1; y >= 0; y--) {
    const b = chunk.getBlock(lx, y, lz);
    if (b !== BlockType.AIR && b !== BlockType.WATER && b !== BlockType.HOLY_WATER_SOURCE) {
      return y;
    }
  }
  return 0;
}

// ---------------------------------------------------------------------------
// 1. Ancient Ruins
// ---------------------------------------------------------------------------

function generateAncientRuins(
  chunk: CraftChunk, seed: number, originLx: number, originLz: number,
): void {
  const surfY = getSurfaceY(chunk, originLx, originLz);
  if (surfY < CB.SEA_LEVEL + 1 || surfY > H - 10) return;

  // Place moss_stone foundation around origin (irregular footprint)
  for (let dx = -3; dx <= 3; dx++) {
    for (let dz = -3; dz <= 3; dz++) {
      const lx = originLx + dx;
      const lz = originLz + dz;
      if (lx < 0 || lx >= S || lz < 0 || lz >= S) continue;
      const colSurf = getSurfaceY(chunk, lx, lz);
      if (colSurf < 1) continue;

      // Moss stone base layer
      if (Math.abs(dx) + Math.abs(dz) <= 4) {
        safeSet(chunk, lx, colSurf, lz, BlockType.MOSS_STONE);
      }
    }
  }

  // Ruined walls — two partial L-shaped walls
  const wallHeight = 3 + Math.floor(fhash(seed, originLx + 50, originLz + 50) * 3); // 3-5

  // Wall segment A: runs along +X from origin
  for (let dx = -2; dx <= 3; dx++) {
    const lx = originLx + dx;
    if (lx < 0 || lx >= S) continue;
    const colSurf = getSurfaceY(chunk, lx, originLz);
    // Partial: some columns shorter to look ruined
    const h = wallHeight - Math.floor(fhash(seed, lx * 7, originLz * 13) * 2);
    for (let dy = 0; dy < h; dy++) {
      const block = dy === 0 ? BlockType.MOSS_STONE : BlockType.STONE_BRICKS;
      safeSet(chunk, lx, colSurf + 1 + dy, originLz, block);
    }
  }

  // Wall segment B: runs along +Z from origin
  for (let dz = 0; dz <= 3; dz++) {
    const lz = originLz + dz;
    if (lz < 0 || lz >= S) continue;
    const colSurf = getSurfaceY(chunk, originLx, lz);
    const h = wallHeight - Math.floor(fhash(seed, originLx * 11, lz * 17) * 2);
    for (let dy = 0; dy < h; dy++) {
      const block = dy === 0 ? BlockType.MOSS_STONE : BlockType.STONE_BRICKS;
      safeSet(chunk, originLx, colSurf + 1 + dy, lz, block);
    }
  }

  // Broken marble pillars (2-3 pillars scattered around)
  const pillarOffsets: [number, number][] = [
    [2, -2], [-2, 2], [3, 3],
  ];
  for (let pi = 0; pi < pillarOffsets.length; pi++) {
    const [pdx, pdz] = pillarOffsets[pi];
    const plx = originLx + pdx;
    const plz = originLz + pdz;
    if (plx < 0 || plx >= S || plz < 0 || plz >= S) continue;
    const colSurf = getSurfaceY(chunk, plx, plz);
    const pillarH = 2 + Math.floor(fhash(seed, plx * 23, plz * 29) * 3);
    for (let dy = 0; dy < pillarH; dy++) {
      safeSet(chunk, plx, colSurf + 1 + dy, plz, BlockType.MARBLE_PILLAR);
    }
    // Moss at base
    safeSet(chunk, plx, colSurf, plz, BlockType.MOSS_STONE);
  }

  // Chest with loot (1-2 chests)
  const chestLx = originLx + 1;
  const chestLz = originLz + 1;
  if (chestLx >= 0 && chestLx < S && chestLz >= 0 && chestLz < S) {
    const cs = getSurfaceY(chunk, chestLx, chestLz);
    safeSet(chunk, chestLx, cs + 1, chestLz, BlockType.CHEST);
    populateChestLoot(chunk.worldX + chestLx, cs + 1, chunk.worldZ + chestLz, "rare", seed);
  }

  // Second chest if hash permits
  if (fhash(seed, originLx + 77, originLz + 99) > 0.4) {
    const c2x = originLx - 1;
    const c2z = originLz + 2;
    if (c2x >= 0 && c2x < S && c2z >= 0 && c2z < S) {
      const cs2 = getSurfaceY(chunk, c2x, c2z);
      safeSet(chunk, c2x, cs2 + 1, c2z, BlockType.CHEST);
      populateChestLoot(chunk.worldX + c2x, cs2 + 1, chunk.worldZ + c2z, "common", seed);
    }
  }
}

// ---------------------------------------------------------------------------
// 2. Crystal Cave Entrance (Excalibur)
// ---------------------------------------------------------------------------

function generateCrystalCave(
  chunk: CraftChunk, _seed: number, originLx: number, originLz: number,
): void {
  const surfY = getSurfaceY(chunk, originLx, originLz);
  if (surfY < 20 || surfY > H - 6) return;

  // Entrance: 3x3 hole going down from the surface
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      const lx = originLx + dx;
      const lz = originLz + dz;
      if (lx < 0 || lx >= S || lz < 0 || lz >= S) continue;

      // Clear from surface down to chamber level
      for (let y = surfY; y >= 8; y--) {
        safeClear(chunk, lx, y, lz);
      }
    }
  }

  // Enchanted stone walls lining the shaft (ring around the 3x3 hole)
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      if (Math.abs(dx) <= 1 && Math.abs(dz) <= 1) continue; // skip the hole itself
      if (Math.abs(dx) > 2 || Math.abs(dz) > 2) continue;
      const lx = originLx + dx;
      const lz = originLz + dz;
      if (lx < 0 || lx >= S || lz < 0 || lz >= S) continue;
      // Only on the immediate border
      if (Math.abs(dx) === 2 || Math.abs(dz) === 2) {
        for (let y = surfY; y >= 8; y--) {
          safeSet(chunk, lx, y, lz, BlockType.ENCHANTED_STONE);
        }
      }
    }
  }

  // Spiral stairs along the inside walls of the shaft
  // One stair block every 2 Y-levels, rotating around the 3x3 shaft
  const stairPositions: [number, number][] = [
    [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1],
  ];
  let stairIdx = 0;
  for (let y = surfY - 1; y >= 10; y -= 1) {
    const [sdx, sdz] = stairPositions[stairIdx % stairPositions.length];
    const lx = originLx + sdx;
    const lz = originLz + sdz;
    safeSet(chunk, lx, y, lz, BlockType.COBBLESTONE);
    stairIdx++;
  }

  // Chamber at the bottom (y = 8-12), widen to 5x5
  const chamberY = 8;
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      const lx = originLx + dx;
      const lz = originLz + dz;
      if (lx < 0 || lx >= S || lz < 0 || lz >= S) continue;

      // Floor
      safeSet(chunk, lx, chamberY, lz, BlockType.ENCHANTED_STONE);

      // Clear chamber air space
      for (let dy = 1; dy <= 4; dy++) {
        safeClear(chunk, lx, chamberY + dy, lz);
      }

      // Ceiling
      safeSet(chunk, lx, chamberY + 5, lz, BlockType.ENCHANTED_STONE);

      // Crystal blocks embedded in walls
      if (Math.abs(dx) === 2 || Math.abs(dz) === 2) {
        safeSet(chunk, lx, chamberY + 2, lz, BlockType.CRYSTAL_BLOCK);
        safeSet(chunk, lx, chamberY + 3, lz, BlockType.ENCHANTED_STONE);
      }
    }
  }

  // Enchanted torches in chamber corners
  const torchCorners: [number, number][] = [[-2, -2], [2, -2], [-2, 2], [2, 2]];
  for (const [tdx, tdz] of torchCorners) {
    const tlx = originLx + tdx;
    const tlz = originLz + tdz;
    safeSetAir(chunk, tlx, chamberY + 1, tlz, BlockType.ENCHANTED_TORCH);
  }

  // --- Excalibur Pedestal ---
  // Center of chamber: gold block base with enchanted crystal on top
  safeSet(chunk, originLx, chamberY + 1, originLz, BlockType.GOLD_BLOCK);
  safeSet(chunk, originLx, chamberY + 2, originLz, BlockType.CRYSTAL_BLOCK);

  // Surrounding gold accents
  safeSet(chunk, originLx + 1, chamberY + 1, originLz, BlockType.GOLD_BLOCK);
  safeSet(chunk, originLx - 1, chamberY + 1, originLz, BlockType.GOLD_BLOCK);
  safeSet(chunk, originLx, chamberY + 1, originLz + 1, BlockType.GOLD_BLOCK);
  safeSet(chunk, originLx, chamberY + 1, originLz - 1, BlockType.GOLD_BLOCK);
}

// ---------------------------------------------------------------------------
// 3. Grail Dungeon Entrance
// ---------------------------------------------------------------------------

function generateGrailDungeon(
  chunk: CraftChunk, _seed: number, originLx: number, originLz: number,
): void {
  const surfY = getSurfaceY(chunk, originLx, originLz);
  if (surfY < 24 || surfY > H - 8) return;

  // 5x5 entrance hole
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      const lx = originLx + dx;
      const lz = originLz + dz;
      if (lx < 0 || lx >= S || lz < 0 || lz >= S) continue;

      // Clear from surface down to dungeon level
      for (let y = surfY; y >= 5; y--) {
        safeClear(chunk, lx, y, lz);
      }
    }
  }

  // Dark stone walls lining the shaft (ring around 5x5)
  for (let dx = -3; dx <= 3; dx++) {
    for (let dz = -3; dz <= 3; dz++) {
      if (Math.abs(dx) <= 2 && Math.abs(dz) <= 2) continue;
      if (Math.abs(dx) > 3 || Math.abs(dz) > 3) continue;
      const lx = originLx + dx;
      const lz = originLz + dz;
      if (lx < 0 || lx >= S || lz < 0 || lz >= S) continue;
      for (let y = surfY; y >= 5; y--) {
        safeSet(chunk, lx, y, lz, BlockType.DARK_STONE);
      }
    }
  }

  // Stairway: cobblestone steps spiraling down inside the 5x5
  const stairRing: [number, number][] = [
    [2, 0], [2, 1], [2, 2], [1, 2], [0, 2],
    [-1, 2], [-2, 2], [-2, 1], [-2, 0], [-2, -1],
    [-2, -2], [-1, -2], [0, -2], [1, -2], [2, -2], [2, -1],
  ];
  let si = 0;
  for (let y = surfY - 1; y >= 7; y--) {
    const [sdx, sdz] = stairRing[si % stairRing.length];
    safeSet(chunk, originLx + sdx, y, originLz + sdz, BlockType.DARK_STONE);
    si++;
  }

  // Enchanted torches along the shaft
  for (let y = surfY - 2; y >= 8; y -= 4) {
    safeSetAir(chunk, originLx, y, originLz + 2, BlockType.ENCHANTED_TORCH);
    safeSetAir(chunk, originLx, y, originLz - 2, BlockType.ENCHANTED_TORCH);
  }

  // --- Dungeon rooms at bottom ---
  const dungeonY = 5;

  // Room 1: Entry hall (centered on origin, 7x4x7)
  buildRoom(chunk, originLx, dungeonY, originLz, 7, 4, 7,
    BlockType.DARK_STONE, BlockType.DARK_STONE);

  // Corridor heading +X to Room 2 (3 wide, 3 tall, 5 long)
  const corridorStartX = originLx + 4;
  for (let cdx = 0; cdx < 5; cdx++) {
    for (let cdz = -1; cdz <= 1; cdz++) {
      for (let cdy = 1; cdy <= 3; cdy++) {
        const lx = corridorStartX + cdx;
        const lz = originLz + cdz;
        if (lx >= 0 && lx < S && lz >= 0 && lz < S) {
          safeClear(chunk, lx, dungeonY + cdy, lz);
        }
      }
      // Floor
      const lx = corridorStartX + cdx;
      const lz = originLz + cdz;
      safeSet(chunk, lx, dungeonY, lz, BlockType.DARK_STONE);
    }
  }
  // Torch in corridor
  safeSetAir(chunk, corridorStartX + 2, dungeonY + 2, originLz + 1, BlockType.ENCHANTED_TORCH);

  // Room 2: Mob spawner room (east of corridor)
  const room2X = originLx + 9;
  if (room2X + 3 < S) {
    buildRoom(chunk, room2X, dungeonY, originLz, 5, 4, 5,
      BlockType.DARK_STONE, BlockType.DARK_STONE);
    // Mob spawner markers (dark_stone + enchanted_torch on top as marker)
    safeSet(chunk, room2X, dungeonY + 1, originLz, BlockType.DARK_STONE);
    safeSet(chunk, room2X, dungeonY + 2, originLz, BlockType.ENCHANTED_TORCH);
  }

  // Room 3 (Grail room): corridor heading -X from entry, then south
  const grailRoomX = originLx - 5;
  if (grailRoomX - 3 >= 0) {
    // Corridor heading -X
    for (let cdx = 1; cdx <= 4; cdx++) {
      for (let cdz = -1; cdz <= 1; cdz++) {
        for (let cdy = 1; cdy <= 3; cdy++) {
          safeClear(chunk, originLx - 3 - cdx, dungeonY + cdy, originLz + cdz);
        }
        safeSet(chunk, originLx - 3 - cdx, dungeonY, originLz + cdz, BlockType.DARK_STONE);
      }
    }

    // Grail chamber (7x5x7) — taller, more grand
    buildRoom(chunk, grailRoomX, dungeonY, originLz, 7, 5, 7,
      BlockType.DARK_STONE, BlockType.ENCHANTED_STONE);

    // Grail pedestal in center
    safeSet(chunk, grailRoomX, dungeonY + 1, originLz, BlockType.HOLY_STONE);
    safeSet(chunk, grailRoomX, dungeonY + 2, originLz, BlockType.GRAIL_PEDESTAL);

    // Holy water pool around pedestal
    for (const [hdx, hdz] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as [number, number][]) {
      safeSet(chunk, grailRoomX + hdx, dungeonY + 1, originLz + hdz, BlockType.HOLY_WATER_SOURCE);
    }

    // Enchanted torches in grail chamber corners
    for (const [cdx, cdz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]] as [number, number][]) {
      safeSetAir(chunk, grailRoomX + cdx, dungeonY + 2, originLz + cdz, BlockType.ENCHANTED_TORCH);
    }

    // Mob spawner marker in spawner room (skeleton / dark knight)
    safeSet(chunk, grailRoomX + 2, dungeonY + 1, originLz + 2, BlockType.DARK_STONE);
    safeSet(chunk, grailRoomX + 2, dungeonY + 2, originLz + 2, BlockType.ENCHANTED_TORCH);
    safeSet(chunk, grailRoomX - 2, dungeonY + 1, originLz - 2, BlockType.DARK_STONE);
    safeSet(chunk, grailRoomX - 2, dungeonY + 2, originLz - 2, BlockType.ENCHANTED_TORCH);
  }
}

/** Carve a room with floor, walls, and ceiling. Origin is center of floor. */
function buildRoom(
  chunk: CraftChunk,
  cx: number, floorY: number, cz: number,
  width: number, height: number, depth: number,
  floorBlock: BlockType, wallBlock: BlockType,
): void {
  const hw = Math.floor(width / 2);
  const hd = Math.floor(depth / 2);

  for (let dx = -hw; dx <= hw; dx++) {
    for (let dz = -hd; dz <= hd; dz++) {
      const lx = cx + dx;
      const lz = cz + dz;
      if (lx < 0 || lx >= S || lz < 0 || lz >= S) continue;

      const isWall = Math.abs(dx) === hw || Math.abs(dz) === hd;

      // Floor
      safeSet(chunk, lx, floorY, lz, floorBlock);

      // Ceiling
      safeSet(chunk, lx, floorY + height + 1, lz, wallBlock);

      // Interior or walls
      for (let dy = 1; dy <= height; dy++) {
        if (isWall) {
          safeSet(chunk, lx, floorY + dy, lz, wallBlock);
        } else {
          safeClear(chunk, lx, floorY + dy, lz);
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 4. Saxon Camp
// ---------------------------------------------------------------------------

function generateSaxonCamp(
  chunk: CraftChunk, seed: number, originLx: number, originLz: number,
): void {
  const surfY = getSurfaceY(chunk, originLx, originLz);
  if (surfY < CB.SEA_LEVEL + 1 || surfY > H - 10) return;

  const baseY = surfY + 1;

  // Wooden palisade wall (rough circle, radius ~5)
  const palisadeR = 5;
  for (let angle = 0; angle < 24; angle++) {
    const rad = (angle / 24) * Math.PI * 2;
    const px = Math.round(Math.cos(rad) * palisadeR);
    const pz = Math.round(Math.sin(rad) * palisadeR);
    const lx = originLx + px;
    const lz = originLz + pz;
    if (lx < 0 || lx >= S || lz < 0 || lz >= S) continue;
    const colSurf = getSurfaceY(chunk, lx, lz);
    // Palisade posts: 3-4 blocks tall
    const postH = 3 + Math.floor(fhash(seed, lx * 37, lz * 41) * 2);
    for (let dy = 0; dy < postH; dy++) {
      safeSet(chunk, lx, colSurf + 1 + dy, lz, BlockType.OAK_LOG);
    }
  }

  // Gap for entrance (clear two palisade columns on one side)
  const entranceLz = originLz + palisadeR;
  if (entranceLz < S) {
    const colS = getSurfaceY(chunk, originLx, entranceLz);
    for (let dy = 1; dy <= 4; dy++) {
      safeClear(chunk, originLx, colS + dy, entranceLz);
    }
  }

  // Hut 1: small structure near center-north
  buildSaxonHut(chunk, seed, originLx - 2, originLz - 2);

  // Hut 2: another near center-south
  buildSaxonHut(chunk, seed + 1, originLx + 2, originLz + 1);

  // Campfire: torch on cobblestone in center
  safeSet(chunk, originLx, baseY - 1, originLz, BlockType.COBBLESTONE);
  safeSet(chunk, originLx, baseY, originLz, BlockType.TORCH);
  // Cobblestone ring around fire
  for (const [fdx, fdz] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as [number, number][]) {
    const flx = originLx + fdx;
    const flz = originLz + fdz;
    if (flx >= 0 && flx < S && flz >= 0 && flz < S) {
      const fs = getSurfaceY(chunk, flx, flz);
      safeSet(chunk, flx, fs, flz, BlockType.COBBLESTONE);
    }
  }
}

function buildSaxonHut(chunk: CraftChunk, _seed: number, cx: number, cz: number): void {
  if (cx < 1 || cx >= S - 3 || cz < 1 || cz >= S - 3) return;
  const surfY = getSurfaceY(chunk, cx, cz);
  if (surfY < 1) return;
  const baseY = surfY + 1;

  // 3x3 hut: log frame corners, plank walls, plank roof
  // Corners: oak log pillars (3 high)
  for (const [dx, dz] of [[0, 0], [2, 0], [0, 2], [2, 2]] as [number, number][]) {
    for (let dy = 0; dy < 3; dy++) {
      safeSet(chunk, cx + dx, baseY + dy, cz + dz, BlockType.OAK_LOG);
    }
  }

  // Walls: planks between corners (skip one side for door)
  // Back wall (dz=0)
  safeSet(chunk, cx + 1, baseY, cz, BlockType.OAK_PLANKS);
  safeSet(chunk, cx + 1, baseY + 1, cz, BlockType.OAK_PLANKS);
  // Left wall (dx=0)
  safeSet(chunk, cx, baseY, cz + 1, BlockType.OAK_PLANKS);
  safeSet(chunk, cx, baseY + 1, cz + 1, BlockType.OAK_PLANKS);
  // Right wall (dx=2)
  safeSet(chunk, cx + 2, baseY, cz + 1, BlockType.OAK_PLANKS);
  safeSet(chunk, cx + 2, baseY + 1, cz + 1, BlockType.OAK_PLANKS);
  // Front wall (dz=2) — door in center (cx+1, cz+2 is open)
  safeSet(chunk, cx, baseY, cz + 2, BlockType.OAK_PLANKS);
  safeSet(chunk, cx + 2, baseY, cz + 2, BlockType.OAK_PLANKS);
  safeSet(chunk, cx, baseY + 1, cz + 2, BlockType.OAK_PLANKS);
  safeSet(chunk, cx + 2, baseY + 1, cz + 2, BlockType.OAK_PLANKS);

  // Interior air
  safeClear(chunk, cx + 1, baseY, cz + 1);
  safeClear(chunk, cx + 1, baseY + 1, cz + 1);

  // Roof: planks across top
  for (let dx = 0; dx <= 2; dx++) {
    for (let dz = 0; dz <= 2; dz++) {
      safeSet(chunk, cx + dx, baseY + 3, cz + dz, BlockType.OAK_PLANKS);
    }
  }
}

// ---------------------------------------------------------------------------
// 5. Village
// ---------------------------------------------------------------------------

function generateVillage(
  chunk: CraftChunk, seed: number, originLx: number, originLz: number,
): void {
  const surfY = getSurfaceY(chunk, originLx, originLz);
  if (surfY < CB.SEA_LEVEL + 1 || surfY > H - 12) return;

  // Central well
  buildWell(chunk, originLx, originLz);

  // Houses arranged around the well (3-5 depending on hash)
  const houseCount = 3 + Math.floor(fhash(seed, originLx + 200, originLz + 200) * 3);
  const housePositions: [number, number][] = [
    [-6, -4], [4, -4], [-6, 4], [5, 3], [-1, -6],
  ];

  for (let hi = 0; hi < houseCount && hi < housePositions.length; hi++) {
    const [hdx, hdz] = housePositions[hi];
    const hlx = originLx + hdx;
    const hlz = originLz + hdz;
    if (hlx < 1 && hlx >= S - 5 || hlz < 1 || hlz >= S - 5) continue;
    buildVillageHouse(chunk, seed + hi, hlx, hlz, hi);
  }

  // Market stalls near well
  buildMarketStall(chunk, originLx + 3, originLz - 1);
  buildMarketStall(chunk, originLx - 4, originLz + 1);
}

function buildWell(chunk: CraftChunk, cx: number, cz: number): void {
  const surfY = getSurfaceY(chunk, cx, cz);
  if (surfY < 2) return;

  // Cobblestone ring (3x3 with center open)
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      const lx = cx + dx;
      const lz = cz + dz;
      if (lx < 0 || lx >= S || lz < 0 || lz >= S) continue;

      if (dx === 0 && dz === 0) {
        // Water column in center going down 4 blocks
        for (let dy = 0; dy >= -4; dy--) {
          safeSet(chunk, lx, surfY + dy, lz, BlockType.WATER);
        }
      } else {
        // Cobblestone wall ring (2 blocks tall)
        safeSet(chunk, lx, surfY, lz, BlockType.COBBLESTONE);
        safeSet(chunk, lx, surfY + 1, lz, BlockType.COBBLESTONE);
      }
    }
  }

  // Roof supports (log pillars at corners + plank roof)
  for (const [pdx, pdz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as [number, number][]) {
    const plx = cx + pdx;
    const plz = cz + pdz;
    if (plx >= 0 && plx < S && plz >= 0 && plz < S) {
      safeSet(chunk, plx, surfY + 2, plz, BlockType.OAK_LOG);
      safeSet(chunk, plx, surfY + 3, plz, BlockType.OAK_PLANKS);
    }
  }
  // Center roof
  safeSet(chunk, cx, surfY + 3, cz, BlockType.OAK_PLANKS);
}

function buildVillageHouse(
  chunk: CraftChunk, _seed: number, cx: number, cz: number, index: number,
): void {
  if (cx < 0 || cx + 4 >= S || cz < 0 || cz + 4 >= S) return;
  const surfY = getSurfaceY(chunk, cx, cz);
  if (surfY < 2) return;
  const baseY = surfY + 1;

  // 4x4 house footprint
  // Cobblestone foundation
  for (let dx = 0; dx < 4; dx++) {
    for (let dz = 0; dz < 4; dz++) {
      safeSet(chunk, cx + dx, surfY, cz + dz, BlockType.COBBLESTONE);
    }
  }

  // Log frame at corners (4 high)
  for (const [dx, dz] of [[0, 0], [3, 0], [0, 3], [3, 3]] as [number, number][]) {
    for (let dy = 0; dy < 4; dy++) {
      safeSet(chunk, cx + dx, baseY + dy, cz + dz, BlockType.OAK_LOG);
    }
  }

  // Plank walls
  // Back (dz=0)
  for (let dx = 1; dx <= 2; dx++) {
    for (let dy = 0; dy < 3; dy++) {
      safeSet(chunk, cx + dx, baseY + dy, cz, BlockType.OAK_PLANKS);
    }
  }
  // Left (dx=0)
  for (let dz = 1; dz <= 2; dz++) {
    for (let dy = 0; dy < 3; dy++) {
      safeSet(chunk, cx, baseY + dy, cz + dz, BlockType.OAK_PLANKS);
    }
  }
  // Right (dx=3)
  for (let dz = 1; dz <= 2; dz++) {
    for (let dy = 0; dy < 3; dy++) {
      safeSet(chunk, cx + 3, baseY + dy, cz + dz, BlockType.OAK_PLANKS);
    }
  }
  // Front (dz=3) — door gap at dx=1
  safeSet(chunk, cx + 2, baseY, cz + 3, BlockType.OAK_PLANKS);
  safeSet(chunk, cx + 2, baseY + 1, cz + 3, BlockType.OAK_PLANKS);
  safeSet(chunk, cx + 2, baseY + 2, cz + 3, BlockType.OAK_PLANKS);
  // Door
  safeSet(chunk, cx + 1, baseY, cz + 3, BlockType.WOODEN_DOOR);
  safeClear(chunk, cx + 1, baseY + 1, cz + 3); // upper door space

  // Clear interior
  for (let dx = 1; dx <= 2; dx++) {
    for (let dz = 1; dz <= 2; dz++) {
      for (let dy = 0; dy < 3; dy++) {
        safeClear(chunk, cx + dx, baseY + dy, cz + dz);
      }
    }
  }

  // Roof (planks, flat for simplicity)
  for (let dx = 0; dx < 4; dx++) {
    for (let dz = 0; dz < 4; dz++) {
      safeSet(chunk, cx + dx, baseY + 4, cz + dz, BlockType.OAK_PLANKS);
    }
  }

  // Interior furnishings vary by house index
  if (index === 0 || index === 2) {
    // Crafting table + furnace house
    safeSet(chunk, cx + 1, baseY, cz + 1, BlockType.CRAFTING_TABLE);
    safeSet(chunk, cx + 2, baseY, cz + 1, BlockType.FURNACE);
  } else if (index === 1) {
    // Chest house with loot
    safeSet(chunk, cx + 1, baseY, cz + 1, BlockType.CHEST);
    populateChestLoot(chunk.worldX + cx + 1, baseY, chunk.worldZ + cz + 1, "common", index * 7919);
  } else {
    // Torch inside
    safeSet(chunk, cx + 2, baseY, cz + 2, BlockType.TORCH);
  }
}

function buildMarketStall(chunk: CraftChunk, cx: number, cz: number): void {
  if (cx < 0 || cx + 2 >= S || cz < 0 || cz + 1 >= S) return;
  const surfY = getSurfaceY(chunk, cx, cz);
  if (surfY < 2) return;
  const baseY = surfY + 1;

  // Counter: planks on top of cobblestone
  for (let dx = 0; dx <= 2; dx++) {
    safeSet(chunk, cx + dx, baseY, cz, BlockType.COBBLESTONE);
    safeSet(chunk, cx + dx, baseY + 1, cz, BlockType.OAK_PLANKS);
  }

  // Roof poles
  safeSet(chunk, cx, baseY + 2, cz, BlockType.OAK_LOG);
  safeSet(chunk, cx + 2, baseY + 2, cz, BlockType.OAK_LOG);
  // Roof planks
  for (let dx = 0; dx <= 2; dx++) {
    safeSet(chunk, cx + dx, baseY + 3, cz, BlockType.OAK_PLANKS);
    if (cz + 1 < S) {
      safeSet(chunk, cx + dx, baseY + 3, cz + 1, BlockType.OAK_PLANKS);
    }
  }

  // Banner
  safeSetAir(chunk, cx + 1, baseY + 2, cz, BlockType.BANNER_BLOCK);
}

// ---------------------------------------------------------------------------
// Structure spawn chance thresholds per biome
// ---------------------------------------------------------------------------

const STRUCTURE_SPAWN_CHANCE = 0.08; // 8% chance per chunk in eligible biome
const VILLAGE_SPAWN_CHANCE = 0.04;   // villages are rarer

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Decorate a chunk with structures after terrain generation.
 * Uses a deterministic hash of (seed + chunk coords) to decide placement.
 */
export function decorateChunkStructures(
  chunk: CraftChunk, seed: number, biome: BiomeType,
): void {
  const cx = chunk.worldX;
  const cz = chunk.worldZ;

  // --- Unique structures: Excalibur cave & Grail dungeon ---
  // These override biome rules — they only spawn in their exact chunk.

  const excalibur = getExcaliburLocation(seed);
  const excChunkX = Math.floor(excalibur.wx / S) * S;
  const excChunkZ = Math.floor(excalibur.wz / S) * S;
  if (cx === excChunkX && cz === excChunkZ) {
    const localX = ((excalibur.wx % S) + S) % S;
    const localZ = ((excalibur.wz % S) + S) % S;
    // Clamp to safe interior range
    const clampedX = Math.max(3, Math.min(S - 4, localX));
    const clampedZ = Math.max(3, Math.min(S - 4, localZ));
    generateCrystalCave(chunk, seed, clampedX, clampedZ);
    return; // don't overlay other structures on the same chunk
  }

  const grail = getGrailLocation(seed);
  const grailChunkX = Math.floor(grail.wx / S) * S;
  const grailChunkZ = Math.floor(grail.wz / S) * S;
  if (cx === grailChunkX && cz === grailChunkZ) {
    const localX = ((grail.wx % S) + S) % S;
    const localZ = ((grail.wz % S) + S) % S;
    const clampedX = Math.max(4, Math.min(S - 5, localX));
    const clampedZ = Math.max(4, Math.min(S - 5, localZ));
    generateGrailDungeon(chunk, seed, clampedX, clampedZ);
    return;
  }

  // --- Biome-based structures ---

  // Primary roll: does this chunk get a structure at all?
  const roll = shash(seed + 55555, cx, cz);

  // Pick a local origin inside the chunk (avoid edges for clearance)
  const originLx = 4 + Math.floor(shash2(seed, cx, cz, 111) * (S - 8));
  const originLz = 4 + Math.floor(shash2(seed, cx, cz, 222) * (S - 8));

  switch (biome) {
    case BiomeType.ANCIENT_RUINS:
    case BiomeType.SACRED_HILLS:
      if (roll < STRUCTURE_SPAWN_CHANCE) {
        generateAncientRuins(chunk, seed, originLx, originLz);
      }
      // Villages can also appear in sacred hills
      if (biome === BiomeType.SACRED_HILLS) {
        const villageRoll = shash2(seed, cx, cz, 777);
        if (villageRoll < VILLAGE_SPAWN_CHANCE && roll >= STRUCTURE_SPAWN_CHANCE) {
          generateVillage(chunk, seed, originLx, originLz);
        }
      }
      break;

    case BiomeType.DARK_CAVERNS:
      // Grail dungeon entrance only spawns via getGrailLocation (handled above).
      // But small ruins can still appear.
      if (roll < STRUCTURE_SPAWN_CHANCE * 0.5) {
        generateAncientRuins(chunk, seed, originLx, originLz);
      }
      break;

    case BiomeType.SAXON_WASTES:
      if (roll < STRUCTURE_SPAWN_CHANCE) {
        generateSaxonCamp(chunk, seed, originLx, originLz);
      }
      break;

    case BiomeType.ENCHANTED_FOREST:
      // Villages in forest clearings (rare)
      if (roll < VILLAGE_SPAWN_CHANCE) {
        generateVillage(chunk, seed, originLx, originLz);
      }
      break;

    case BiomeType.MISTY_MARSHLANDS:
      // Occasional ruins in the marshes
      if (roll < STRUCTURE_SPAWN_CHANCE * 0.3) {
        generateAncientRuins(chunk, seed, originLx, originLz);
      }
      break;

    case BiomeType.CRYSTAL_LAKE:
      // No surface structures — lake biome
      break;

    case BiomeType.SNOW_PEAKS:
      // Rare ruins at high altitude
      if (roll < STRUCTURE_SPAWN_CHANCE * 0.2) {
        generateAncientRuins(chunk, seed, originLx, originLz);
      }
      break;
  }
}
