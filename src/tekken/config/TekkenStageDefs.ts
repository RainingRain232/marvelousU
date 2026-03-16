// ---------------------------------------------------------------------------
// Tekken mode – Stage transition definitions (breakable walls)
// Defines wall zones that can break and transition to a new area.
// ---------------------------------------------------------------------------

export interface BreakableWallZone {
  id: string;
  /** X position of the wall zone (left/right boundary) */
  side: "left" | "right";
  /** X coordinate of the wall */
  xPosition: number;
  /** How much damage/momentum is needed to break the wall */
  breakThreshold: number;
  /** Whether this wall has already been broken */
  broken: boolean;
  /** Health of the wall (accumulates from hits near it) */
  health: number;
  /** Visual crack level 0-1 */
  crackLevel: number;
}

export interface StageTransitionArea {
  id: string;
  name: string;
  /** New stage half-width after transition */
  stageHalfWidth: number;
  /** Floor color for the new area */
  floorColor: number;
  /** Ambient color for the new area */
  ambientColor: number;
  /** Key light color for the new area */
  keyLightColor: number;
  /** Key light intensity for the new area */
  keyLightIntensity: number;
}

export interface StageTransitionDef {
  /** Which arena ID supports transitions */
  arenaId: string;
  /** Wall zones in this arena that can break */
  walls: BreakableWallZone[];
  /** The area that is revealed after breaking through */
  transitionArea: StageTransitionArea;
  /** Bonus damage dealt to the opponent on wall break */
  breakDamage: number;
  /** Frames of stun applied on wall break */
  breakStunFrames: number;
}

export const STAGE_TRANSITIONS: StageTransitionDef[] = [
  {
    arenaId: "throne_room",
    walls: [
      { id: "throne_wall_left",  side: "left",  xPosition: -3.5, breakThreshold: 40, broken: false, health: 40, crackLevel: 0 },
      { id: "throne_wall_right", side: "right", xPosition: 3.5,  breakThreshold: 40, broken: false, health: 40, crackLevel: 0 },
    ],
    transitionArea: {
      id: "throne_balcony",
      name: "Royal Balcony",
      stageHalfWidth: 5.0,
      floorColor: 0x5a5050,
      ambientColor: 0x445566,
      keyLightColor: 0xffffff,
      keyLightIntensity: 3.5,
    },
    breakDamage: 20,
    breakStunFrames: 40,
  },
  {
    arenaId: "volcanic_forge",
    walls: [
      { id: "forge_wall_right", side: "right", xPosition: 3.5, breakThreshold: 35, broken: false, health: 35, crackLevel: 0 },
    ],
    transitionArea: {
      id: "forge_exterior",
      name: "Volcano Rim",
      stageHalfWidth: 4.5,
      floorColor: 0x3a2a1a,
      ambientColor: 0x553311,
      keyLightColor: 0xff8844,
      keyLightIntensity: 2.8,
    },
    breakDamage: 25,
    breakStunFrames: 45,
  },
  {
    arenaId: "ruined_cathedral",
    walls: [
      { id: "cath_wall_left",  side: "left",  xPosition: -3.5, breakThreshold: 30, broken: false, health: 30, crackLevel: 0 },
      { id: "cath_wall_right", side: "right", xPosition: 3.5,  breakThreshold: 30, broken: false, health: 30, crackLevel: 0 },
    ],
    transitionArea: {
      id: "cathedral_graveyard",
      name: "Cathedral Graveyard",
      stageHalfWidth: 5.5,
      floorColor: 0x2a2a28,
      ambientColor: 0x334433,
      keyLightColor: 0x88ccaa,
      keyLightIntensity: 2.0,
    },
    breakDamage: 15,
    breakStunFrames: 35,
  },
  {
    arenaId: "ancient_dojo",
    walls: [
      { id: "dojo_wall_left",  side: "left",  xPosition: -3.5, breakThreshold: 25, broken: false, health: 25, crackLevel: 0 },
    ],
    transitionArea: {
      id: "dojo_garden",
      name: "Zen Garden",
      stageHalfWidth: 4.0,
      floorColor: 0x4a5a3a,
      ambientColor: 0x334422,
      keyLightColor: 0xddeecc,
      keyLightIntensity: 2.6,
    },
    breakDamage: 15,
    breakStunFrames: 35,
  },
  {
    arenaId: "colosseum_ruins",
    walls: [
      { id: "colo_wall_left",  side: "left",  xPosition: -3.5, breakThreshold: 45, broken: false, health: 45, crackLevel: 0 },
      { id: "colo_wall_right", side: "right", xPosition: 3.5,  breakThreshold: 45, broken: false, health: 45, crackLevel: 0 },
    ],
    transitionArea: {
      id: "colosseum_underground",
      name: "Colosseum Underground",
      stageHalfWidth: 4.5,
      floorColor: 0x3a3028,
      ambientColor: 0x332211,
      keyLightColor: 0xffaa66,
      keyLightIntensity: 1.8,
    },
    breakDamage: 20,
    breakStunFrames: 40,
  },
];

/** Get stage transition definition for an arena, or null if it has no breakable walls */
export function getStageTransition(arenaId: string): StageTransitionDef | null {
  return STAGE_TRANSITIONS.find(st => st.arenaId === arenaId) ?? null;
}

/** Create a fresh copy of wall zones (so state is not shared between matches) */
export function createWallZones(arenaId: string): BreakableWallZone[] {
  const def = getStageTransition(arenaId);
  if (!def) return [];
  return def.walls.map(w => ({ ...w }));
}
