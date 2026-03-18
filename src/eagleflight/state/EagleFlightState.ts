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

  // Stats
  distanceFlown: number;
  topSpeed: number;
  checkpointsHit: number;
}

export interface EFCheckpoint {
  position: Vec3;
  radius: number;
  collected: boolean;
  glowPhase: number;
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

  // Intro cinematic
  introActive: boolean;
  introTimer: number;
  introDuration: number;

  // Thermals
  thermalBoost: number;

  // Checkpoints
  checkpoints: EFCheckpoint[];
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
  START_ALT: 80,
  BOOST_DURATION: 2.0,
  BOOST_COOLDOWN: 5.0,
  MOUSE_SENSITIVITY: 0.003,
  INTRO_DURATION: 8.0,
} as const;

// ---------------------------------------------------------------------------
// Checkpoint positions (rings to fly through)
// ---------------------------------------------------------------------------

const CHECKPOINT_POSITIONS: Vec3[] = [
  { x: 0, y: 55, z: 30 },     // Above castle
  { x: 35, y: 40, z: -30 },   // Cathedral spire
  { x: -85, y: 30, z: 0 },    // West gate
  { x: 0, y: 25, z: -85 },    // South gate
  { x: 85, y: 35, z: 0 },     // East gate
  { x: 140, y: 20, z: -60 },  // Windmill
  { x: -120, y: 25, z: 90 },  // Windmill 2
  { x: -180, y: 15, z: -25 }, // Harbor
  { x: 0, y: 70, z: 0 },      // High above center
  { x: 60, y: 45, z: 50 },    // Noble quarter
];

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
      distanceFlown: 0,
      topSpeed: 0,
      checkpointsHit: 0,
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
    introActive: true,
    introTimer: 0,
    introDuration: EFBalance.INTRO_DURATION,
    thermalBoost: 0,
    checkpoints: CHECKPOINT_POSITIONS.map((p) => ({
      position: { ...p },
      radius: 8,
      collected: false,
      glowPhase: Math.random() * Math.PI * 2,
    })),
  };
}
