// ---------------------------------------------------------------------------
// Race mode — horse racing configuration
// ---------------------------------------------------------------------------

export interface TrackDef {
  id: string;
  name: string;
  laps: number;
  waypoints: { x: number; y: number }[];
  width: number; // track width in pixels
  obstacles: { x: number; y: number; r: number }[];
  color: number;
  weather: "clear" | "rain" | "mud" | "fog";
  terrain: "grass" | "dirt" | "stone";
}

export interface HorseDef {
  id: string;
  name: string;
  maxSpeed: number;
  acceleration: number;
  handling: number; // turn rate multiplier
  stamina: number;
  staminaRegen: number;
  color: number;
  cost: number;
}

export const HORSES: HorseDef[] = [
  { id: "pony", name: "Farm Pony", maxSpeed: 180, acceleration: 120, handling: 1.2, stamina: 100, staminaRegen: 8, color: 0xaa8855, cost: 0 },
  { id: "courser", name: "Courser", maxSpeed: 220, acceleration: 140, handling: 1.0, stamina: 90, staminaRegen: 6, color: 0x885522, cost: 80 },
  { id: "destrier", name: "Destrier", maxSpeed: 200, acceleration: 180, handling: 0.8, stamina: 120, staminaRegen: 7, color: 0x444455, cost: 150 },
  { id: "arabian", name: "Arabian", maxSpeed: 260, acceleration: 160, handling: 1.1, stamina: 80, staminaRegen: 10, color: 0xddcc88, cost: 250 },
];

export const TRACKS: TrackDef[] = [
  {
    id: "meadow", name: "Meadow Circuit", laps: 3, width: 50,
    waypoints: [
      { x: 100, y: 350 }, { x: 300, y: 350 }, { x: 500, y: 300 },
      { x: 600, y: 200 }, { x: 500, y: 100 }, { x: 300, y: 80 },
      { x: 150, y: 150 }, { x: 100, y: 250 },
    ],
    obstacles: [],
    color: 0x3a5a3a, weather: "clear", terrain: "grass",
  },
  {
    id: "forest", name: "Forest Trail", laps: 2, width: 45,
    waypoints: [
      { x: 80, y: 380 }, { x: 250, y: 380 }, { x: 400, y: 320 },
      { x: 550, y: 200 }, { x: 600, y: 100 }, { x: 450, y: 60 },
      { x: 250, y: 80 }, { x: 100, y: 150 }, { x: 80, y: 280 },
    ],
    obstacles: [{ x: 350, y: 280, r: 15 }, { x: 500, y: 150, r: 12 }, { x: 200, y: 120, r: 14 }],
    color: 0x2a4a2a, weather: "rain", terrain: "dirt",
  },
  {
    id: "castle", name: "Castle Grand Prix", laps: 3, width: 40,
    waypoints: [
      { x: 100, y: 400 }, { x: 350, y: 400 }, { x: 600, y: 350 },
      { x: 650, y: 200 }, { x: 550, y: 80 }, { x: 350, y: 50 },
      { x: 150, y: 80 }, { x: 50, y: 200 }, { x: 60, y: 300 },
    ],
    obstacles: [{ x: 400, y: 350, r: 12 }, { x: 600, y: 250, r: 10 }, { x: 250, y: 70, r: 13 }, { x: 100, y: 200, r: 11 }],
    color: 0x4a4a5a, weather: "fog", terrain: "stone",
  },
  {
    id: "marsh", name: "Marshland Dash", laps: 2, width: 42,
    waypoints: [
      { x: 80, y: 400 }, { x: 200, y: 350 }, { x: 380, y: 380 },
      { x: 500, y: 300 }, { x: 620, y: 350 }, { x: 650, y: 200 },
      { x: 580, y: 80 }, { x: 400, y: 50 }, { x: 200, y: 80 },
      { x: 80, y: 200 },
    ],
    obstacles: [{ x: 300, y: 360, r: 14 }, { x: 560, y: 320, r: 12 }, { x: 630, y: 140, r: 13 }, { x: 300, y: 65, r: 11 }, { x: 140, y: 140, r: 12 }],
    color: 0x3a4a3a, weather: "mud", terrain: "dirt",
  },
  {
    id: "mountain", name: "Mountain Pass", laps: 2, width: 38,
    waypoints: [
      { x: 60, y: 420 }, { x: 180, y: 380 }, { x: 350, y: 400 },
      { x: 500, y: 350 }, { x: 620, y: 280 }, { x: 660, y: 150 },
      { x: 580, y: 60 }, { x: 420, y: 40 }, { x: 280, y: 80 },
      { x: 160, y: 140 }, { x: 80, y: 250 },
    ],
    obstacles: [{ x: 260, y: 390, r: 13 }, { x: 560, y: 310, r: 11 }, { x: 640, y: 200, r: 14 }, { x: 500, y: 50, r: 12 }, { x: 340, y: 60, r: 10 }, { x: 120, y: 190, r: 13 }],
    color: 0x5a5a6a, weather: "clear", terrain: "stone",
  },
];

export const RaceConfig = {
  FIELD_WIDTH: 700,
  FIELD_HEIGHT: 450,
  GALLOP_STAMINA_COST: 25, // per second
  SPRINT_SPEED_MULT: 1.4,
  OBSTACLE_SLOWDOWN: 0.3, // speed multiplier when hitting obstacle
  OBSTACLE_STAMINA_LOSS: 15, // stamina lost when hitting an obstacle
  AI_COUNT: 3, // number of AI racers
  STARTING_GOLD: 50,
  BET_OPTIONS: [10, 25, 50],
  WIN_PAYOUT: 3,
  PLACE_PAYOUT: 1.5,
  // Difficulty scaling per track index
  AI_SPEED_SCALE_PER_TRACK: 0.08, // AI gets 8% faster per track
  EXTRA_OBSTACLES_PER_TRACK: 2, // additional obstacles per track index
  // Drafting / slipstream
  DRAFT_DISTANCE: 40, // max distance behind another racer to draft
  DRAFT_ANGLE_TOLERANCE: 0.6, // radians — how closely you must be behind them
  DRAFT_SPEED_BONUS: 0.08, // 8% speed boost when drafting
  // Stamina exhaustion
  EXHAUSTION_SPEED_MULT: 0.6, // max speed multiplier when stamina is 0
  EXHAUSTION_THRESHOLD: 5, // stamina below this triggers partial exhaustion
  // Dust particles
  DUST_SPAWN_RATE: 0.5, // chance per frame when fast
  DUST_SPEED_THRESHOLD: 0.6, // fraction of maxSpeed to start spawning dust
  // Weather effects
  WEATHER_GRIP: { clear: 1.0, rain: 0.75, mud: 0.6, fog: 0.9 } as Record<string, number>,
  WEATHER_SPEED: { clear: 1.0, rain: 0.9, mud: 0.75, fog: 1.0 } as Record<string, number>,
  WEATHER_STAMINA_DRAIN: { clear: 1.0, rain: 1.2, mud: 1.5, fog: 1.0 } as Record<string, number>,
  // Terrain effects
  TERRAIN_ACCEL: { grass: 1.0, dirt: 0.9, stone: 1.1 } as Record<string, number>,
  // Championship
  CHAMPIONSHIP_POINTS: [10, 7, 5, 3] as readonly number[], // points for 1st-4th place
} as const;
