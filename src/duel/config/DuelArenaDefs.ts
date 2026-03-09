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

// ---------------------------------------------------------------------------
// New stages
// ---------------------------------------------------------------------------

export const ROUND_TABLE: DuelArenaDef = {
  id: "round_table",
  name: "The Round Table",
  stageWidth: 800,
  stageFloorY: 400,
  leftWall: 50,
  rightWall: 750,
  skyTop: 0x1a0a22,
  skyBottom: 0x2a1a44,
  groundColor: 0x554433,
  groundHighlight: 0x665544,
  accentColor: 0xddaa33,
  fogColor: 0x332244,
  fogAlpha: 0.08,
};

export const MORDRED_THRONE: DuelArenaDef = {
  id: "mordred_throne",
  name: "Mordred's Throne",
  stageWidth: 800,
  stageFloorY: 400,
  leftWall: 50,
  rightWall: 750,
  skyTop: 0x0a0008,
  skyBottom: 0x1a0015,
  groundColor: 0x332233,
  groundHighlight: 0x443344,
  accentColor: 0xcc44ff,
  fogColor: 0x220022,
  fogAlpha: 0.18,
};

export const GLASTONBURY_ABBEY: DuelArenaDef = {
  id: "glastonbury",
  name: "Glastonbury Abbey",
  stageWidth: 800,
  stageFloorY: 400,
  leftWall: 50,
  rightWall: 750,
  skyTop: 0x334466,
  skyBottom: 0x667799,
  groundColor: 0x887766,
  groundHighlight: 0x998877,
  accentColor: 0xeedd88,
  fogColor: 0xbbbbaa,
  fogAlpha: 0.1,
};

export const ORKNEY_WASTES: DuelArenaDef = {
  id: "orkney",
  name: "Orkney Wastes",
  stageWidth: 800,
  stageFloorY: 400,
  leftWall: 50,
  rightWall: 750,
  skyTop: 0x334455,
  skyBottom: 0x667788,
  groundColor: 0x665544,
  groundHighlight: 0x776655,
  accentColor: 0xbbaa88,
  fogColor: 0x998877,
  fogAlpha: 0.22,
};

export const LAKE_SANCTUARY: DuelArenaDef = {
  id: "lake",
  name: "Lake Sanctuary",
  stageWidth: 800,
  stageFloorY: 400,
  leftWall: 50,
  rightWall: 750,
  skyTop: 0x224466,
  skyBottom: 0x5588aa,
  groundColor: 0x446655,
  groundHighlight: 0x558866,
  accentColor: 0x66ddff,
  fogColor: 0x88aacc,
  fogAlpha: 0.16,
};

export const DRAGON_PEAK: DuelArenaDef = {
  id: "dragon_peak",
  name: "Dragon's Peak",
  stageWidth: 800,
  stageFloorY: 400,
  leftWall: 50,
  rightWall: 750,
  skyTop: 0x110808,
  skyBottom: 0x331818,
  groundColor: 0x3a2a1a,
  groundHighlight: 0x4a3a2a,
  accentColor: 0xff6622,
  fogColor: 0x442211,
  fogAlpha: 0.14,
};

export const GRAIL_CHAPEL: DuelArenaDef = {
  id: "grail_chapel",
  name: "Grail Chapel",
  stageWidth: 800,
  stageFloorY: 400,
  leftWall: 50,
  rightWall: 750,
  skyTop: 0x222244,
  skyBottom: 0x444488,
  groundColor: 0x776655,
  groundHighlight: 0x887766,
  accentColor: 0xffee99,
  fogColor: 0xddddbb,
  fogAlpha: 0.06,
};

export const CORNWALL_COAST: DuelArenaDef = {
  id: "cornwall",
  name: "Cornwall Coast",
  stageWidth: 800,
  stageFloorY: 400,
  leftWall: 50,
  rightWall: 750,
  skyTop: 0x4466aa,
  skyBottom: 0x7799cc,
  groundColor: 0xaa9977,
  groundHighlight: 0xbbaa88,
  accentColor: 0xffffff,
  fogColor: 0xbbccdd,
  fogAlpha: 0.12,
};

export const SHADOW_KEEP: DuelArenaDef = {
  id: "shadow_keep",
  name: "Shadow Keep",
  stageWidth: 800,
  stageFloorY: 400,
  leftWall: 50,
  rightWall: 750,
  skyTop: 0x050510,
  skyBottom: 0x0a0a22,
  groundColor: 0x222230,
  groundHighlight: 0x333340,
  accentColor: 0x8844cc,
  fogColor: 0x110022,
  fogAlpha: 0.25,
};

export const CAMLANN_BATTLEFIELD: DuelArenaDef = {
  id: "camlann",
  name: "Camlann Battlefield",
  stageWidth: 800,
  stageFloorY: 400,
  leftWall: 50,
  rightWall: 750,
  skyTop: 0x2a2222,
  skyBottom: 0x443333,
  groundColor: 0x554840,
  groundHighlight: 0x665850,
  accentColor: 0xcc3333,
  fogColor: 0x664444,
  fogAlpha: 0.2,
};

// ---- Registry -------------------------------------------------------------

export const DUEL_ARENAS: Record<string, DuelArenaDef> = {
  camelot: CAMELOT_COURTYARD,
  avalon: AVALON_SHORE,
  excalibur: EXCALIBUR_STONE,
  broceliande: BROCELIANDE_FOREST,
  tintagel: TINTAGEL_CLIFFS,
  round_table: ROUND_TABLE,
  mordred_throne: MORDRED_THRONE,
  glastonbury: GLASTONBURY_ABBEY,
  orkney: ORKNEY_WASTES,
  lake: LAKE_SANCTUARY,
  dragon_peak: DRAGON_PEAK,
  grail_chapel: GRAIL_CHAPEL,
  cornwall: CORNWALL_COAST,
  shadow_keep: SHADOW_KEEP,
  camlann: CAMLANN_BATTLEFIELD,
};

export const DUEL_ARENA_IDS = [
  "camelot", "avalon", "excalibur", "broceliande", "tintagel",
  "round_table", "mordred_throne", "glastonbury", "orkney", "lake",
  "dragon_peak", "grail_chapel", "cornwall", "shadow_keep", "camlann",
] as const;
