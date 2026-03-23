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
    color: 0x3a5a3a,
  },
  {
    id: "forest", name: "Forest Trail", laps: 2, width: 45,
    waypoints: [
      { x: 80, y: 380 }, { x: 250, y: 380 }, { x: 400, y: 320 },
      { x: 550, y: 200 }, { x: 600, y: 100 }, { x: 450, y: 60 },
      { x: 250, y: 80 }, { x: 100, y: 150 }, { x: 80, y: 280 },
    ],
    obstacles: [{ x: 350, y: 280, r: 15 }, { x: 500, y: 150, r: 12 }, { x: 200, y: 120, r: 14 }],
    color: 0x2a4a2a,
  },
  {
    id: "castle", name: "Castle Grand Prix", laps: 3, width: 40,
    waypoints: [
      { x: 100, y: 400 }, { x: 350, y: 400 }, { x: 600, y: 350 },
      { x: 650, y: 200 }, { x: 550, y: 80 }, { x: 350, y: 50 },
      { x: 150, y: 80 }, { x: 50, y: 200 }, { x: 60, y: 300 },
    ],
    obstacles: [{ x: 400, y: 350, r: 12 }, { x: 600, y: 250, r: 10 }, { x: 250, y: 70, r: 13 }, { x: 100, y: 200, r: 11 }],
    color: 0x4a4a5a,
  },
];

export const RaceConfig = {
  FIELD_WIDTH: 700,
  FIELD_HEIGHT: 450,
  GALLOP_STAMINA_COST: 25, // per second
  SPRINT_SPEED_MULT: 1.4,
  OBSTACLE_SLOWDOWN: 0.3, // speed multiplier when hitting obstacle
  AI_COUNT: 3, // number of AI racers
  STARTING_GOLD: 50,
  BET_OPTIONS: [10, 25, 50],
  WIN_PAYOUT: 3,
  PLACE_PAYOUT: 1.5,
} as const;
