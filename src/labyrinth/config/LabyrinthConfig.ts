// ---------------------------------------------------------------------------
// Labyrinth mode — configuration & definitions
// ---------------------------------------------------------------------------

export type ItemType = "torch" | "speed" | "caltrops" | "reveal" | "invis" | "shield" | "compass" | "decoy";

export interface ItemDef {
  id: ItemType;
  name: string;
  color: number;
  duration: number;
  desc: string;
  icon: string;
}

export const ITEMS: Record<ItemType, ItemDef> = {
  torch:    { id: "torch",    name: "Torch Oil",        color: 0xffaa44, duration: 0,  desc: "+50% torch fuel",               icon: "\u{1F525}" },
  speed:    { id: "speed",    name: "Swiftness Draught", color: 0x44ccff, duration: 8,  desc: "Move faster for 8s",            icon: "\u26A1" },
  caltrops: { id: "caltrops", name: "Caltrops",         color: 0xcc8844, duration: 0,  desc: "Drop — stuns the Minotaur",      icon: "\u{1F4CC}" },
  reveal:   { id: "reveal",   name: "Reveal Scroll",    color: 0xddddff, duration: 5,  desc: "See the whole maze for 5s",      icon: "\u{1F4DC}" },
  invis:    { id: "invis",    name: "Cloak of Shadows",  color: 0x8844cc, duration: 6,  desc: "Minotaur loses your trail",      icon: "\u{1F47B}" },
  shield:   { id: "shield",   name: "Aegis Charm",      color: 0x44aaff, duration: 0,  desc: "Survive one hit",                icon: "\u{1F6E1}\uFE0F" },
  compass:  { id: "compass",  name: "Relic Compass",    color: 0xffdd44, duration: 10, desc: "Points to nearest relic for 10s", icon: "\u{1FA7C}" },
  decoy:    { id: "decoy",    name: "Echo Stone",       color: 0xcc66cc, duration: 8,  desc: "Creates noise at drop point for 8s", icon: "\u{1F48E}" },
};

export type TrapType = "spike" | "alarm" | "crumble" | "web";

export interface TrapDef {
  id: TrapType;
  name: string;
  color: number;
}

export const TRAPS: Record<TrapType, TrapDef> = {
  spike:   { id: "spike",   name: "Spike Trap",      color: 0x886644 },
  alarm:   { id: "alarm",   name: "Alarm Tile",      color: 0xcc4444 },
  crumble: { id: "crumble", name: "Crumbling Floor",  color: 0x665544 },
  web:     { id: "web",     name: "Spider Web",      color: 0xcccccc },
};

export type HazardType = "water" | "darkness";

export interface Hazard {
  col: number;
  row: number;
  type: HazardType;
}

// ---- Difficulty system ----

export type DifficultyId = "easy" | "normal" | "hard" | "nightmare";

export interface DifficultyDef {
  id: DifficultyId;
  name: string;
  color: number;
  desc: string;
  minoSpeedMult: number;
  minoHearingMult: number;
  torchDrainMult: number;
  itemCountMult: number;
  trapCountMult: number;
  shiftIntervalMult: number;
  scoreMult: number;
  extraShields: number;      // bonus shields at start
  visionBonus: number;       // added to base vision
}

export const DIFFICULTIES: DifficultyDef[] = [
  {
    id: "easy", name: "Apprentice", color: 0x44aa44,
    desc: "Slower minotaur, more items, extra shield",
    minoSpeedMult: 0.75, minoHearingMult: 0.7, torchDrainMult: 0.7,
    itemCountMult: 1.3, trapCountMult: 0.6, shiftIntervalMult: 1.3,
    scoreMult: 0.5, extraShields: 1, visionBonus: 1.0,
  },
  {
    id: "normal", name: "Knight", color: 0xccaa44,
    desc: "The intended experience",
    minoSpeedMult: 1.0, minoHearingMult: 1.0, torchDrainMult: 1.0,
    itemCountMult: 1.0, trapCountMult: 1.0, shiftIntervalMult: 1.0,
    scoreMult: 1.0, extraShields: 0, visionBonus: 0,
  },
  {
    id: "hard", name: "Champion", color: 0xcc6644,
    desc: "Faster minotaur, fewer items, more traps",
    minoSpeedMult: 1.2, minoHearingMult: 1.3, torchDrainMult: 1.3,
    itemCountMult: 0.7, trapCountMult: 1.5, shiftIntervalMult: 0.8,
    scoreMult: 1.5, extraShields: 0, visionBonus: -0.5,
  },
  {
    id: "nightmare", name: "Labyrinth Master", color: 0xcc2244,
    desc: "Two minotaurs on every floor. No mercy.",
    minoSpeedMult: 1.4, minoHearingMult: 1.5, torchDrainMult: 1.6,
    itemCountMult: 0.5, trapCountMult: 2.0, shiftIntervalMult: 0.6,
    scoreMult: 2.5, extraShields: 0, visionBonus: -1.0,
  },
];

// ---- Minotaur behavior states ----

export type MinoState = "sleep" | "patrol" | "hunt" | "enrage";

/** Per-floor visual theme colors. */
export interface FloorTheme {
  warmLight: number;    // floor tint near player
  coolDark: number;     // floor tint far from player
  wallWarm: number;     // wall near torch
  wallCool: number;     // wall far from torch
  wallShift: number;    // wall during shift warning
  fogColor: number;     // fog/darkness color
  bgColor: number;      // background outside maze
  floorAccent: number;  // mortar/grid accent
  sconceColor: number;  // sconce flame color
  ambientDust: number;  // dust particle color near torch
}

export const FLOOR_THEMES: FloorTheme[] = [
  // Floor 1: Gray stone upper passages
  { warmLight: 0x2a1e10, coolDark: 0x080614, wallWarm: 0x665544, wallCool: 0x332244,
    wallShift: 0x775588, fogColor: 0x030206, bgColor: 0x030206, floorAccent: 0x000000,
    sconceColor: 0xffaa44, ambientDust: 0xddaa77 },
  // Floor 2: Deep green cavern corridors
  { warmLight: 0x1a2810, coolDark: 0x061408, wallWarm: 0x4a5544, wallCool: 0x223322,
    wallShift: 0x558855, fogColor: 0x020604, bgColor: 0x020604, floorAccent: 0x001100,
    sconceColor: 0x88cc44, ambientDust: 0xaacc88 },
  // Floor 3: Volcanic lair — red/orange
  { warmLight: 0x2a1208, coolDark: 0x140608, wallWarm: 0x664433, wallCool: 0x442222,
    wallShift: 0x885544, fogColor: 0x060203, bgColor: 0x060203, floorAccent: 0x110000,
    sconceColor: 0xff6622, ambientDust: 0xddaa88 },
];

export interface FloorConfig {
  cols: number;
  rows: number;
  relicCount: number;
  minoSpeedBase: number;
  minoSpeedMax: number;
  minoHearing: number;
  shiftInterval: number;
  shiftWalls: number;
  itemCount: number;
  trapCount: number;
  torchDrain: number;
  name: string;
  secretCount: number;
  minotaurCount: number;
  inscriptionCount: number;
  hazardCount: number;
  roomCount: number;          // open 2x2 rooms in the maze
}

export const FLOORS: FloorConfig[] = [
  {
    cols: 17, rows: 13, relicCount: 3, minoSpeedBase: 50, minoSpeedMax: 85,
    minoHearing: 5, shiftInterval: 35, shiftWalls: 8, itemCount: 8, trapCount: 4,
    torchDrain: 2.0, name: "The Upper Passages", secretCount: 2, minotaurCount: 1,
    inscriptionCount: 3, hazardCount: 3, roomCount: 2,
  },
  {
    cols: 21, rows: 15, relicCount: 4, minoSpeedBase: 60, minoSpeedMax: 100,
    minoHearing: 6, shiftInterval: 28, shiftWalls: 12, itemCount: 10, trapCount: 7,
    torchDrain: 2.8, name: "The Deep Corridors", secretCount: 3, minotaurCount: 1,
    inscriptionCount: 4, hazardCount: 5, roomCount: 3,
  },
  {
    cols: 25, rows: 17, relicCount: 5, minoSpeedBase: 72, minoSpeedMax: 120,
    minoHearing: 7, shiftInterval: 22, shiftWalls: 16, itemCount: 12, trapCount: 10,
    torchDrain: 3.5, name: "The Minotaur's Lair", secretCount: 4, minotaurCount: 2,
    inscriptionCount: 5, hazardCount: 7, roomCount: 4,
  },
];

export const INSCRIPTIONS: string[] = [
  "The beast remembers every sound...",
  "These walls have moved a thousand times.",
  "Only the relics can break the seal.",
  "The darkness feeds the labyrinth.",
  "He who built this maze never escaped it.",
  "Listen for the hooves upon the stone.",
  "The shadows between the walls are watching.",
  "Light is borrowed time down here.",
  "Others came before you. None returned.",
  "The Minotaur does not sleep.",
  "Every passage leads deeper into madness.",
  "The walls remember where you walked.",
  "Trust not the silence. It means he is close.",
  "The exit opens only for the worthy.",
  "Your torch betrays you as much as it saves you.",
];

export const LabyrinthConfig = {
  CELL_SIZE: 42,

  // Player
  PLAYER_SPEED: 90,
  PLAYER_SPEED_BOOSTED: 150,
  PLAYER_SPEED_SPRINT: 130,
  PLAYER_SPEED_WEBBED: 40,
  PLAYER_SPEED_WATER: 55,        // slowed in water
  TORCH_MAX: 100,
  TORCH_REFILL: 50,
  BASE_VISION: 4.5,
  MIN_VISION: 1.8,
  DEAD_TORCH_VISION: 1.0,
  DARKNESS_ZONE_VISION_MULT: 0.5,
  PLAYER_RADIUS: 5,
  MAX_INVENTORY: 3,

  // Noise
  NOISE_IDLE: 0.0,
  NOISE_WALK: 0.4,
  NOISE_SPRINT: 1.0,
  NOISE_WATER_BONUS: 0.3,       // extra noise in water
  NOISE_DECAY: 2.0,
  NOISE_HEARING_MULT: 1.5,

  // Sprint
  SPRINT_TORCH_DRAIN_MULT: 1.8,

  // Minotaur
  MINO_ACCEL: 0.6,
  MINO_STUN_DURATION: 4.5,
  MINO_SIZE: 8,
  MINO_CHARGE_SPEED_MULT: 1.8,
  MINO_CHARGE_DIST: 3,
  MINO_ROAR_INTERVAL: 12,
  MINO_PATROL_RADIUS: 5,
  MINO_SMELL_RANGE: 3,
  MINO_TORCH_OUT_HEARING_MULT: 2.0,
  // Behavior state timings
  MINO_SLEEP_DURATION: 8,       // seconds the minotaur sleeps after losing interest
  MINO_ENRAGE_DURATION: 6,      // seconds of enrage after stun wears off
  MINO_ENRAGE_SPEED_MULT: 1.4,  // speed multiplier during enrage
  MINO_SLEEP_WAKE_RANGE: 3,     // cells — wakes up if player this close

  // Shadow
  SHADOW_SPEED_MULT: 0.7,
  SHADOW_HEARING: 10,
  SHADOW_SIZE: 6,

  // Traps
  SPIKE_DAMAGE: 1,
  ALARM_RADIUS: 8,
  WEB_DURATION: 3,
  CRUMBLE_DELAY: 0.6,

  // Hazards
  WATER_TORCH_DRAIN: 8,         // extra torch drain per second in water
  WATER_SPLASH_NOISE: 0.3,

  // Items
  CALTROP_LIFETIME: 25,
  DECOY_RADIUS: 8,

  // Footprints
  FOOTPRINT_INTERVAL: 0.3,
  FOOTPRINT_LIFETIME: 20,
  FOOTPRINT_MAX: 80,

  // Secret passages
  SECRET_WALL_HITS: 3,

  // Ambient
  AMBIENT_DUST_COUNT: 15,
  AMBIENT_EMBER_RATE: 0.4,
  SCONCE_DENSITY: 0.06,        // fraction of wall segments that get a sconce
  SCONCE_LIGHT_R: 2.5,         // cells radius of sconce light pool

  // Relic proximity
  RELIC_HUM_RANGE: 5,           // cells — relic hum visible within this range

  // Near-miss
  NEAR_MISS_DIST: 2,            // cells — counts as "close call"

  // Minimap
  MINIMAP_SIZE: 165,
  MINIMAP_CELL: 6,
  MINIMAP_ALPHA: 0.7,

  // Escalation
  DARKNESS_RATE: 0.12,

  // Scoring
  SCORE_RELIC: 500,
  SCORE_FLOOR_CLEAR: 2000,
  SCORE_TIME_BONUS: 50,
  SCORE_ITEM_USE: 100,
  SCORE_TRAP_AVOID: 150,
  SCORE_NO_HIT: 1000,
  SCORE_SECRET_FOUND: 300,
  SCORE_NEAR_MISS: 75,
  PAR_TIME_PER_FLOOR: 120,
} as const;
