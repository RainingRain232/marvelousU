// Procedural overworld map generator using Perlin-like noise
import { OverworldTileType } from "@/types";
import type { Vec2 } from "@/types";
import { SeededRandom } from "@sim/utils/random";
import type { OverworldTile, OverworldEntity, OverworldState } from "@rpg/state/OverworldState";
import { createOverworldState } from "@rpg/state/OverworldState";
import type { DungeonEntranceData, TownData, NPCData } from "@rpg/state/OverworldState";
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
  for (let attempt = 0; attempt < 500; attempt++) {
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

  // Generate terrain (scales adjusted for larger map so biomes are proportionally sized)
  const scale1 = 0.03;
  const scale2 = 0.06;

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

  // Place towns (10 towns for the larger world)
  const townDefs = [
    { name: "Haven Village", shop: STARTER_TOWN_SHOP, innCost: 20 },
    { name: "Millbrook", shop: STARTER_TOWN_SHOP, innCost: 25 },
    { name: "Ironhold", shop: MID_TOWN_SHOP, innCost: 40 },
    { name: "Stormgate", shop: MID_TOWN_SHOP, innCost: 50 },
    { name: "Sunhaven", shop: MID_TOWN_SHOP, innCost: 45 },
    { name: "Frostpeak", shop: MID_TOWN_SHOP, innCost: 55 },
    { name: "Dustwind Outpost", shop: MID_TOWN_SHOP, innCost: 50 },
    { name: "Shadowfen", shop: LATE_TOWN_SHOP, innCost: 70 },
    { name: "Dragonrest", shop: LATE_TOWN_SHOP, innCost: 80 },
    { name: "Crystal Citadel", shop: LATE_TOWN_SHOP, innCost: 90 },
  ];

  const townPositions: Vec2[] = [];
  const entities = new Map<string, OverworldEntity>();

  for (let i = 0; i < townDefs.length; i++) {
    const pos = _findPlacement(grid, rng, width, height, placements, 25);
    if (!pos) continue;
    placements.push(pos);
    townPositions.push(pos);

    const townId = `town_${i}`;
    grid[pos.y][pos.x].entityId = townId;
    grid[pos.y][pos.x].encounterRate = 0;

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

  // Connect towns with paths (chain + cross-links for better connectivity)
  for (let i = 0; i < townPositions.length - 1; i++) {
    _carvePath(grid, townPositions[i], townPositions[i + 1]);
  }
  // Add a few cross-connections for a road network
  if (townPositions.length >= 6) {
    _carvePath(grid, townPositions[0], townPositions[3]);
    _carvePath(grid, townPositions[2], townPositions[5]);
    _carvePath(grid, townPositions[4], townPositions[7] ?? townPositions[townPositions.length - 1]);
  }

  // Place dungeon entrances (7 dungeons for the larger world)
  const dungeonIds = [
    "goblin_caves", "dark_crypt", "dragon_lair",
    "goblin_caves", "dark_crypt", "dragon_lair", "goblin_caves",
  ];
  const dungeonNames = [
    "Goblin Caves", "Dark Crypt", "Dragon's Lair",
    "Sunken Tunnels", "Bone Crypts", "Wyrm Peak", "Bandit Hideout",
  ];
  const dungeonLevels = [3, 6, 10, 2, 8, 12, 4];

  for (let i = 0; i < dungeonIds.length; i++) {
    const pos = _findPlacement(grid, rng, width, height, placements, 18);
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

  // Place NPCs (12 NPCs scattered across the larger map)
  const npcDefs: { name: string; dialogue: string[] }[] = [
    {
      name: "Wandering Scholar",
      dialogue: [
        "Ah, a fellow traveler! These lands hold many secrets.",
        "I've heard the Goblin Caves are infested with vermin. Low-level adventurers cut their teeth there.",
        "Stock up on potions at the towns before venturing into dungeons. You'll thank me later.",
      ],
    },
    {
      name: "Old Hermit",
      dialogue: [
        "You look like trouble... the good kind.",
        "Deep in the Dark Crypt lies a Lich Lord. You'll need to be at least level 6 to stand a chance.",
        "Equip your party well. Visit the towns — each has different gear for sale.",
      ],
    },
    {
      name: "Traveling Merchant",
      dialogue: [
        "Business has been slow since the monsters moved in.",
        "I've heard the Dragon's Lair holds treasures beyond imagination, but only the strongest survive.",
        "If you defeat monsters, they sometimes drop useful equipment. Keep an eye out!",
      ],
    },
    {
      name: "Lost Knight",
      dialogue: [
        "I was separated from my company after an ambush in the forest.",
        "Press T to toggle between turn-based and auto-battle modes.",
        "Defending in battle halves the damage you take. Use it wisely against powerful foes.",
      ],
    },
    {
      name: "Forest Witch",
      dialogue: [
        "The spirits of this forest whisper of a great evil stirring...",
        "Resting at an inn in town will fully restore your party and cure ailments.",
        "The deeper you go into a dungeon, the stronger the monsters become. But so do the rewards.",
      ],
    },
    {
      name: "Desert Nomad",
      dialogue: [
        "The sands shift, but the roads between towns are safe enough.",
        "Dustwind Outpost is a rough place, but the gear they sell is solid.",
        "Watch for bandits in the wastelands — they're tougher than they look.",
      ],
    },
    {
      name: "Mountain Sage",
      dialogue: [
        "From these peaks, I can see the whole world spread below.",
        "Frostpeak village sits high in the mountains. They forge the finest steel.",
        "The Wyrm Peak dungeon is said to house an ancient dragon. Tread carefully.",
      ],
    },
    {
      name: "Retired Adventurer",
      dialogue: [
        "I used to be an adventurer like you... until I found enough gold to retire.",
        "Press Escape to open the pause menu. You can save your game there!",
        "The Crystal Citadel has the best equipment money can buy.",
      ],
    },
    {
      name: "Mysterious Stranger",
      dialogue: [
        "You have the look of someone destined for greatness... or doom.",
        "The Sunken Tunnels beneath the marshes hold ancient treasures.",
        "Not all who wander are lost. But some definitely are.",
      ],
    },
    {
      name: "Village Elder",
      dialogue: [
        "Welcome, young adventurer. Our villages need heroes like you.",
        "There are many towns across these lands. Each has unique supplies for sale.",
        "The roads between towns are the safest paths. Stick to them when you can.",
      ],
    },
    {
      name: "Young Apprentice",
      dialogue: [
        "I'm studying magic! One day I'll be as powerful as Elara the Fire Mage.",
        "Did you know you can use items during battle? They can turn the tide!",
        "I heard there's a hidden dungeon near the Bone Crypts. Spooky!",
      ],
    },
    {
      name: "Fisherman",
      dialogue: [
        "The waters around here are too dangerous for fishing these days.",
        "Shadowfen village sits at the edge of the dark marshlands. Brave folks live there.",
        "If you find yourself low on health, head to the nearest inn. It's worth the gold.",
      ],
    },
  ];

  for (let i = 0; i < npcDefs.length; i++) {
    const pos = _findPlacement(grid, rng, width, height, placements, 12);
    if (!pos) continue;
    placements.push(pos);

    const npcId = `npc_${i}`;
    grid[pos.y][pos.x].entityId = npcId;
    grid[pos.y][pos.x].encounterRate = 0;

    const data: NPCData = {
      dialogue: npcDefs[i].dialogue,
      questId: `npc_${i}`,
    };

    entities.set(npcId, {
      id: npcId,
      type: "npc",
      position: pos,
      name: npcDefs[i].name,
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
