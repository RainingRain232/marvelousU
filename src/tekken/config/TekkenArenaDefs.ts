// ---------------------------------------------------------------------------
// Tekken mode – Arena/Stage definitions
// ---------------------------------------------------------------------------

export interface TekkenArenaHazardDef {
  id: string;
  type: "fire_brazier" | "acid_patch" | "breakable_pillar";
  position: { x: number; y: number; z: number };
  damage: number;
  radius: number;
}

export interface TekkenArenaDef {
  id: string;
  name: string;
  floorColor: number;
  ambientColor: number;
  fogColor: number;
  fogDensity: number;
  skyColor: number;
  keyLightColor: number;
  keyLightIntensity: number;
  fillLightColor: number;
  torchColor: number;
  hazards: TekkenArenaHazardDef[];
}

export const TEKKEN_ARENAS: TekkenArenaDef[] = [
  {
    id: "castle_courtyard",
    name: "Castle Courtyard",
    floorColor: 0x3a3530,
    ambientColor: 0x443344,
    fogColor: 0x0a0a14,
    fogDensity: 0.04,
    skyColor: 0x0a0a18,
    keyLightColor: 0xffeedd,
    keyLightIntensity: 2.8,
    fillLightColor: 0x6688cc,
    torchColor: 0xff8833,
    hazards: [
      { id: "fire_left", type: "fire_brazier", position: { x: -6, y: 0, z: 0 }, damage: 5, radius: 0.5 },
      { id: "fire_right", type: "fire_brazier", position: { x: 6, y: 0, z: 0 }, damage: 5, radius: 0.5 },
    ],
  },
  {
    id: "underground_pit",
    name: "The Underground Pit",
    floorColor: 0x2a2520,
    ambientColor: 0x222211,
    fogColor: 0x050508,
    fogDensity: 0.06,
    skyColor: 0x050508,
    keyLightColor: 0xffbb88,
    keyLightIntensity: 1.8,
    fillLightColor: 0x446633,
    torchColor: 0x44ff44,
    hazards: [
      { id: "acid_left", type: "acid_patch", position: { x: -2.5, y: 0, z: 0 }, damage: 2, radius: 0.6 },
      { id: "acid_right", type: "acid_patch", position: { x: 2.5, y: 0, z: 0 }, damage: 2, radius: 0.6 },
    ],
  },
  {
    id: "throne_room",
    name: "The Throne Room",
    floorColor: 0x4a4040,
    ambientColor: 0x554444,
    fogColor: 0x100a0a,
    fogDensity: 0.03,
    skyColor: 0x100a0a,
    keyLightColor: 0xffffdd,
    keyLightIntensity: 3.0,
    fillLightColor: 0x8866aa,
    torchColor: 0xffaa44,
    hazards: [
      { id: "pillar_left", type: "breakable_pillar", position: { x: -3.0, y: 0, z: 0 }, damage: 10, radius: 0.4 },
      { id: "pillar_right", type: "breakable_pillar", position: { x: 3.0, y: 0, z: 0 }, damage: 10, radius: 0.4 },
    ],
  },

  // ── Volcanic Forge ──────────────────────────────────────────────────────
  {
    id: "volcanic_forge",
    name: "Volcanic Forge",
    floorColor: 0x2a1a10,
    ambientColor: 0x442211,
    fogColor: 0x1a0800,
    fogDensity: 0.05,
    skyColor: 0x1a0800,
    keyLightColor: 0xff6622,
    keyLightIntensity: 2.5,
    fillLightColor: 0x883311,
    torchColor: 0xff4400,
    hazards: [
      { id: "forge_fire_l", type: "fire_brazier", position: { x: -4, y: 0, z: 0 }, damage: 6, radius: 0.6 },
      { id: "forge_fire_r", type: "fire_brazier", position: { x: 4, y: 0, z: 0 }, damage: 6, radius: 0.6 },
    ],
  },

  // ── Forest Clearing ─────────────────────────────────────────────────────
  {
    id: "forest_clearing",
    name: "Forest Clearing",
    floorColor: 0x3a4a2a,
    ambientColor: 0x334422,
    fogColor: 0x0a1408,
    fogDensity: 0.035,
    skyColor: 0x1a2a18,
    keyLightColor: 0xccddaa,
    keyLightIntensity: 2.2,
    fillLightColor: 0x668844,
    torchColor: 0xaacc44,
    hazards: [],
  },

  // ── Frozen Lake ─────────────────────────────────────────────────────────
  {
    id: "frozen_lake",
    name: "Frozen Lake",
    floorColor: 0x8899aa,
    ambientColor: 0x446688,
    fogColor: 0x0a1020,
    fogDensity: 0.03,
    skyColor: 0x0a1020,
    keyLightColor: 0xccddff,
    keyLightIntensity: 2.6,
    fillLightColor: 0x88aacc,
    torchColor: 0x66aaff,
    hazards: [],
  },

  // ── Ancient Dojo ────────────────────────────────────────────────────────
  {
    id: "ancient_dojo",
    name: "Ancient Dojo",
    floorColor: 0x5a4530,
    ambientColor: 0x443322,
    fogColor: 0x0a0808,
    fogDensity: 0.025,
    skyColor: 0x0a0808,
    keyLightColor: 0xffeedd,
    keyLightIntensity: 2.4,
    fillLightColor: 0x886644,
    torchColor: 0xffaa44,
    hazards: [
      { id: "dojo_pillar_l", type: "breakable_pillar", position: { x: -4.0, y: 0, z: 0 }, damage: 8, radius: 0.4 },
      { id: "dojo_pillar_r", type: "breakable_pillar", position: { x: 4.0, y: 0, z: 0 }, damage: 8, radius: 0.4 },
    ],
  },

  // ── Ruined Cathedral ────────────────────────────────────────────────────
  {
    id: "ruined_cathedral",
    name: "Ruined Cathedral",
    floorColor: 0x4a4048,
    ambientColor: 0x443355,
    fogColor: 0x0a0810,
    fogDensity: 0.04,
    skyColor: 0x0a0810,
    keyLightColor: 0xeeddff,
    keyLightIntensity: 2.0,
    fillLightColor: 0x8866aa,
    torchColor: 0xcc88ff,
    hazards: [
      { id: "cath_pillar_l", type: "breakable_pillar", position: { x: -3.5, y: 0, z: 0 }, damage: 10, radius: 0.4 },
      { id: "cath_pillar_r", type: "breakable_pillar", position: { x: 3.5, y: 0, z: 0 }, damage: 10, radius: 0.4 },
    ],
  },

  // ── Desert Marketplace ──────────────────────────────────────────────────
  {
    id: "desert_marketplace",
    name: "Desert Marketplace",
    floorColor: 0x8a7a5a,
    ambientColor: 0x665544,
    fogColor: 0x1a1408,
    fogDensity: 0.03,
    skyColor: 0x2a2010,
    keyLightColor: 0xffeecc,
    keyLightIntensity: 3.2,
    fillLightColor: 0xccaa66,
    torchColor: 0xffcc44,
    hazards: [
      { id: "market_fire", type: "fire_brazier", position: { x: 5, y: 0, z: 0 }, damage: 4, radius: 0.5 },
    ],
  },

  // ── Harbor Docks ────────────────────────────────────────────────────────
  {
    id: "harbor_docks",
    name: "Harbor Docks",
    floorColor: 0x4a3a28,
    ambientColor: 0x334455,
    fogColor: 0x0a0e14,
    fogDensity: 0.04,
    skyColor: 0x0a1018,
    keyLightColor: 0xddddff,
    keyLightIntensity: 2.0,
    fillLightColor: 0x668899,
    torchColor: 0xffaa33,
    hazards: [],
  },

  // ── Dark Dungeon ────────────────────────────────────────────────────────
  {
    id: "dark_dungeon",
    name: "Dark Dungeon",
    floorColor: 0x1a1a1a,
    ambientColor: 0x111111,
    fogColor: 0x050505,
    fogDensity: 0.07,
    skyColor: 0x050505,
    keyLightColor: 0xffbb88,
    keyLightIntensity: 1.5,
    fillLightColor: 0x443322,
    torchColor: 0xff6633,
    hazards: [
      { id: "dungeon_acid_l", type: "acid_patch", position: { x: -3, y: 0, z: 0 }, damage: 3, radius: 0.5 },
      { id: "dungeon_acid_r", type: "acid_patch", position: { x: 3, y: 0, z: 0 }, damage: 3, radius: 0.5 },
      { id: "dungeon_fire", type: "fire_brazier", position: { x: 0, y: 0, z: -2 }, damage: 5, radius: 0.5 },
    ],
  },

  // ── Mountain Peak ───────────────────────────────────────────────────────
  {
    id: "mountain_peak",
    name: "Mountain Peak",
    floorColor: 0x5a5a5a,
    ambientColor: 0x556677,
    fogColor: 0x889aaa,
    fogDensity: 0.05,
    skyColor: 0x4466aa,
    keyLightColor: 0xffffff,
    keyLightIntensity: 3.5,
    fillLightColor: 0x99bbdd,
    torchColor: 0xffffff,
    hazards: [],
  },

  // ── Haunted Graveyard ───────────────────────────────────────────────────
  {
    id: "haunted_graveyard",
    name: "Haunted Graveyard",
    floorColor: 0x2a2a28,
    ambientColor: 0x223322,
    fogColor: 0x0a0e0a,
    fogDensity: 0.06,
    skyColor: 0x0a0e0a,
    keyLightColor: 0x88ccaa,
    keyLightIntensity: 1.8,
    fillLightColor: 0x447744,
    torchColor: 0x44ff88,
    hazards: [
      { id: "grave_fire_l", type: "fire_brazier", position: { x: -5, y: 0, z: 0 }, damage: 4, radius: 0.5 },
      { id: "grave_fire_r", type: "fire_brazier", position: { x: 5, y: 0, z: 0 }, damage: 4, radius: 0.5 },
    ],
  },
];
