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
  pitch: number;
  yaw: number;
  roll: number;
  speed: number;
  targetSpeed: number;
  flapPhase: number;
  bankAngle: number;

  // Boost
  boostActive: boolean;
  boostTimer: number;
  boostCooldown: number;

  // Camera
  freeLook: boolean;
  freeLookYaw: number;
  freeLookPitch: number;
}

export interface EagleFlightState {
  player: EFPlayer;
  screenW: number;
  screenH: number;
  paused: boolean;
  gameTime: number;
  dayPhase: number;
  windAngle: number;
  windStrength: number;

  // Camera shake
  shakeTimer: number;
  shakeMag: number;
}

// ---------------------------------------------------------------------------
// Balance constants
// ---------------------------------------------------------------------------

export const EFBalance = {
  SIM_TICK_MS: 16,
  MIN_SPEED: 8,
  MAX_SPEED: 45,
  BOOST_SPEED: 65,
  CRUISE_SPEED: 22,
  ACCELERATION: 12,
  PITCH_RATE: 1.4,
  YAW_RATE: 1.6,
  ROLL_RATE: 2.8,
  ROLL_RETURN_RATE: 2.0,
  MAX_PITCH: Math.PI * 0.4,
  WORLD_RADIUS: 320,
  MIN_ALT: 3,
  MAX_ALT: 200,
  START_ALT: 60,
  BOOST_DURATION: 2.0,
  BOOST_COOLDOWN: 5.0,
  MOUSE_SENSITIVITY: 0.003,
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
      boostActive: false,
      boostTimer: 0,
      boostCooldown: 0,
      freeLook: false,
      freeLookYaw: 0,
      freeLookPitch: 0,
    },
    screenW: sw,
    screenH: sh,
    paused: false,
    gameTime: 0,
    dayPhase: 0.25,
    windAngle: Math.PI * 0.3,
    windStrength: 2,
    shakeTimer: 0,
    shakeMag: 0,
  };
}
