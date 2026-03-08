// ---------------------------------------------------------------------------
// Duel mode – arena definitions
// ---------------------------------------------------------------------------

export interface DuelArenaDef {
  id: string;
  name: string;
  stageWidth: number;
  stageFloorY: number;
  leftWall: number;
  rightWall: number;
  // Background palette
  skyTop: number;
  skyBottom: number;
  groundColor: number;
  groundHighlight: number;
  accentColor: number;
  fogColor: number;
  fogAlpha: number;
}

export const CAMELOT_COURTYARD: DuelArenaDef = {
  id: "camelot",
  name: "Camelot Courtyard",
  stageWidth: 800,
  stageFloorY: 400,
  leftWall: 50,
  rightWall: 750,
  skyTop: 0x3355aa,
  skyBottom: 0x667dbb,
  groundColor: 0x888880,
  groundHighlight: 0x9a9a92,
  accentColor: 0xcc2222,
  fogColor: 0xcccccc,
  fogAlpha: 0.05,
};

export const AVALON_SHORE: DuelArenaDef = {
  id: "avalon",
  name: "Avalon Shore",
  stageWidth: 800,
  stageFloorY: 400,
  leftWall: 50,
  rightWall: 750,
  skyTop: 0x445588,
  skyBottom: 0x7799bb,
  groundColor: 0x556644,
  groundHighlight: 0x668855,
  accentColor: 0x88ccff,
  fogColor: 0xaabbcc,
  fogAlpha: 0.15,
};

export const EXCALIBUR_STONE: DuelArenaDef = {
  id: "excalibur",
  name: "Excalibur's Stone",
  stageWidth: 800,
  stageFloorY: 400,
  leftWall: 50,
  rightWall: 750,
  skyTop: 0x112233,
  skyBottom: 0x223344,
  groundColor: 0x334422,
  groundHighlight: 0x445533,
  accentColor: 0xffdd88,
  fogColor: 0x224433,
  fogAlpha: 0.1,
};

export const BROCELIANDE_FOREST: DuelArenaDef = {
  id: "broceliande",
  name: "Brocéliande Forest",
  stageWidth: 800,
  stageFloorY: 400,
  leftWall: 50,
  rightWall: 750,
  skyTop: 0x0a1a0a,
  skyBottom: 0x1a3322,
  groundColor: 0x3a3020,
  groundHighlight: 0x4a4030,
  accentColor: 0x44dd66,
  fogColor: 0x446644,
  fogAlpha: 0.2,
};

export const TINTAGEL_CLIFFS: DuelArenaDef = {
  id: "tintagel",
  name: "Tintagel Cliffs",
  stageWidth: 800,
  stageFloorY: 400,
  leftWall: 50,
  rightWall: 750,
  skyTop: 0x223344,
  skyBottom: 0x556688,
  groundColor: 0x555550,
  groundHighlight: 0x666660,
  accentColor: 0xeebb55,
  fogColor: 0x889999,
  fogAlpha: 0.12,
};

export const DUEL_ARENAS: Record<string, DuelArenaDef> = {
  camelot: CAMELOT_COURTYARD,
  avalon: AVALON_SHORE,
  excalibur: EXCALIBUR_STONE,
  broceliande: BROCELIANDE_FOREST,
  tintagel: TINTAGEL_CLIFFS,
};

export const DUEL_ARENA_IDS = ["camelot", "avalon", "excalibur", "broceliande", "tintagel"] as const;
