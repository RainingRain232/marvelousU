// ---------------------------------------------------------------------------
// Hunt mode — archery hunting configuration
// ---------------------------------------------------------------------------

export type PreyType = "rabbit" | "deer" | "boar" | "wolf" | "bear" | "stag" | "pheasant" | "fox";

export interface PreyDef {
  id: PreyType;
  name: string;
  hp: number;
  speed: number; // pixels/sec
  value: number;
  color: number;
  size: number;
  fleeSpeed: number; // speed when startled
  awareness: number; // 0-1, how quickly they notice the player
  penalty: boolean; // true = lose points for hitting (villager)
}

export const PREY: Record<PreyType, PreyDef> = {
  rabbit:   { id: "rabbit",   name: "Rabbit",   hp: 1, speed: 100, value: 5,  color: 0xaa8866, size: 12, fleeSpeed: 180, awareness: 0.3, penalty: false },
  pheasant: { id: "pheasant", name: "Pheasant", hp: 1, speed: 60,  value: 8,  color: 0x886644, size: 14, fleeSpeed: 200, awareness: 0.5, penalty: false },
  fox:      { id: "fox",      name: "Fox",      hp: 1, speed: 90,  value: 12, color: 0xcc6622, size: 15, fleeSpeed: 160, awareness: 0.6, penalty: false },
  deer:     { id: "deer",     name: "Deer",     hp: 2, speed: 70,  value: 15, color: 0xaa8844, size: 20, fleeSpeed: 150, awareness: 0.4, penalty: false },
  boar:     { id: "boar",     name: "Boar",     hp: 3, speed: 50,  value: 20, color: 0x664422, size: 22, fleeSpeed: 80,  awareness: 0.2, penalty: false },
  stag:     { id: "stag",     name: "Royal Stag", hp: 2, speed: 80, value: 30, color: 0xddaa44, size: 22, fleeSpeed: 170, awareness: 0.7, penalty: false },
  wolf:     { id: "wolf",     name: "Wolf",     hp: 2, speed: 85,  value: 25, color: 0x777788, size: 18, fleeSpeed: 120, awareness: 0.5, penalty: false },
  bear:     { id: "bear",     name: "Bear",     hp: 5, speed: 40,  value: 40, color: 0x553322, size: 28, fleeSpeed: 60,  awareness: 0.3, penalty: false },
};

export interface BowDef {
  id: string;
  name: string;
  damage: number;
  arrowSpeed: number;
  drawTime: number; // seconds to fully draw
  cost: number;
}

export const BOWS: BowDef[] = [
  { id: "shortbow",  name: "Shortbow",  damage: 1, arrowSpeed: 350, drawTime: 0.5, cost: 0 },
  { id: "longbow",   name: "Longbow",   damage: 2, arrowSpeed: 450, drawTime: 0.8, cost: 50 },
  { id: "composite",  name: "Composite Bow", damage: 3, arrowSpeed: 500, drawTime: 0.6, cost: 120 },
  { id: "crossbow",  name: "Crossbow",  damage: 4, arrowSpeed: 400, drawTime: 1.2, cost: 200 },
];

export const HuntConfig = {
  FIELD_WIDTH: 1600,
  FIELD_HEIGHT: 900,
  ROUND_DURATION: 90, // seconds
  MAX_PREY: 8,
  SPAWN_INTERVAL: 4, // seconds
  ARROW_LIFETIME: 2, // seconds
  STARTLED_DURATION: 3, // seconds prey flees after hearing arrow
  MISS_PENALTY: -2, // score penalty for missing
} as const;

export const SPAWN_TABLE: { weight: number; type: PreyType }[][] = [
  // Round 1 — easy prey
  [{ weight: 4, type: "rabbit" }, { weight: 3, type: "pheasant" }, { weight: 2, type: "deer" }],
  // Round 2 — medium
  [{ weight: 3, type: "deer" }, { weight: 2, type: "fox" }, { weight: 2, type: "boar" }, { weight: 1, type: "wolf" }],
  // Round 3 — hard
  [{ weight: 2, type: "boar" }, { weight: 2, type: "wolf" }, { weight: 2, type: "stag" }, { weight: 1, type: "bear" }],
];
