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
    id: "meadow", name: "Meadow Circuit", laps: 3, width: 70,
    waypoints: [
      { x: 170, y: 580 }, { x: 510, y: 580 }, { x: 855, y: 500 },
      { x: 1025, y: 335 }, { x: 855, y: 165 }, { x: 510, y: 135 },
      { x: 255, y: 250 }, { x: 170, y: 415 },
    ],
    obstacles: [],
    color: 0x3a5a3a, weather: "clear", terrain: "grass",
  },
  {
    id: "forest", name: "Forest Trail", laps: 2, width: 65,
    waypoints: [
      { x: 135, y: 635 }, { x: 425, y: 635 }, { x: 685, y: 535 },
      { x: 940, y: 335 }, { x: 1025, y: 165 }, { x: 770, y: 100 },
      { x: 425, y: 135 }, { x: 170, y: 250 }, { x: 135, y: 470 },
    ],
    obstacles: [{ x: 600, y: 470, r: 20 }, { x: 855, y: 250, r: 18 }, { x: 340, y: 200, r: 20 }],
    color: 0x2a4a2a, weather: "rain", terrain: "dirt",
  },
  {
    id: "castle", name: "Castle Grand Prix", laps: 3, width: 60,
    waypoints: [
      { x: 170, y: 670 }, { x: 600, y: 670 }, { x: 1025, y: 580 },
      { x: 1110, y: 335 }, { x: 940, y: 135 }, { x: 600, y: 85 },
      { x: 255, y: 135 }, { x: 85, y: 335 }, { x: 100, y: 500 },
    ],
    obstacles: [{ x: 685, y: 580, r: 18 }, { x: 1025, y: 415, r: 16 }, { x: 425, y: 115, r: 20 }, { x: 170, y: 335, r: 17 }],
    color: 0x4a4a5a, weather: "fog", terrain: "stone",
  },
  {
    id: "marsh", name: "Marshland Dash", laps: 2, width: 62,
    waypoints: [
      { x: 135, y: 670 }, { x: 340, y: 580 }, { x: 650, y: 635 },
      { x: 855, y: 500 }, { x: 1060, y: 580 }, { x: 1110, y: 335 },
      { x: 990, y: 135 }, { x: 685, y: 85 }, { x: 340, y: 135 },
      { x: 135, y: 335 },
    ],
    obstacles: [{ x: 510, y: 600, r: 20 }, { x: 960, y: 535, r: 18 }, { x: 1080, y: 235, r: 20 }, { x: 510, y: 110, r: 17 }, { x: 240, y: 235, r: 18 }],
    color: 0x3a4a3a, weather: "mud", terrain: "dirt",
  },
  {
    id: "mountain", name: "Mountain Pass", laps: 2, width: 58,
    waypoints: [
      { x: 100, y: 700 }, { x: 310, y: 635 }, { x: 600, y: 670 },
      { x: 855, y: 580 }, { x: 1060, y: 470 }, { x: 1130, y: 250 },
      { x: 990, y: 100 }, { x: 720, y: 65 }, { x: 480, y: 135 },
      { x: 275, y: 235 }, { x: 135, y: 415 },
    ],
    obstacles: [{ x: 445, y: 650, r: 20 }, { x: 960, y: 515, r: 17 }, { x: 1095, y: 335, r: 21 }, { x: 855, y: 85, r: 18 }, { x: 580, y: 100, r: 16 }, { x: 205, y: 315, r: 20 }],
    color: 0x5a5a6a, weather: "clear", terrain: "stone",
  },
];

export const RaceConfig = {
  FIELD_WIDTH: 1200,
  FIELD_HEIGHT: 750,
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
