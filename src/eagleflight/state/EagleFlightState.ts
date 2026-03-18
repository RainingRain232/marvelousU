// ---------------------------------------------------------------------------
// Eagle Flight — game state
// Merlin rides an eagle over the city of Camelot.
// ---------------------------------------------------------------------------

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface EFPlayer {
  position: Vec3;
  /** Euler angles in radians: pitch (nose up/down), yaw (heading), roll (banking) */
  pitch: number;
  yaw: number;
  roll: number;
  /** Current forward speed */
  speed: number;
  /** Target speed (throttle) */
  targetSpeed: number;
  /** Eagle wing flap phase for animation */
  flapPhase: number;
  /** Eagle bank angle (visual smoothing) */
  bankAngle: number;
}

export interface EagleFlightState {
  player: EFPlayer;
  screenW: number;
  screenH: number;
  paused: boolean;
  gameTime: number;
  dayPhase: number;
  /** Wind direction & strength for atmosphere */
  windAngle: number;
  windStrength: number;
}

// ---------------------------------------------------------------------------
// Balance constants
// ---------------------------------------------------------------------------

export const EFBalance = {
  SIM_TICK_MS: 16,
  MIN_SPEED: 8,
  MAX_SPEED: 45,
  CRUISE_SPEED: 22,
  ACCELERATION: 12,
  PITCH_RATE: 1.4,
  YAW_RATE: 1.6,
  ROLL_RATE: 2.8,
  ROLL_RETURN_RATE: 2.0,
  MAX_PITCH: Math.PI * 0.4,
  /** World bounds — the city area */
  WORLD_RADIUS: 320,
  /** Minimum altitude (ground collision) */
  MIN_ALT: 3,
  /** Maximum altitude */
  MAX_ALT: 200,
  /** Starting altitude */
  START_ALT: 60,
} as const;

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createEagleFlightState(sw: number, sh: number): EagleFlightState {
  return {
    player: {
      position: { x: 0, y: EFBalance.START_ALT, z: -80 },
      pitch: 0,
      yaw: 0,
      roll: 0,
      speed: EFBalance.CRUISE_SPEED,
      targetSpeed: EFBalance.CRUISE_SPEED,
      flapPhase: 0,
      bankAngle: 0,
    },
    screenW: sw,
    screenH: sh,
    paused: false,
    gameTime: 0,
    dayPhase: 0.25,
    windAngle: Math.PI * 0.3,
    windStrength: 2,
  };
}
