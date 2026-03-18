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

  // Barrel roll
  barrelRollTimer: number;
  barrelRollCooldown: number;
  barrelRollDirection: number;

  // Stats
  distanceFlown: number;
  topSpeed: number;
  checkpointsHit: number;
  nearMisses: number;
  trickScore: number;
  orbsCollected: number;

  // Combo
  comboMultiplier: number;
  comboTimer: number;
  lastComboScore: number;

  // Spells
  spellCooldowns: [number, number, number]; // firework, lightning, trail
  magicTrailActive: boolean;

  // Mount/dismount
  mounted: boolean;
  mountTransition: number; // 0-1, animation progress for mount/dismount
  mountTransitionDir: 1 | -1; // 1 = mounting, -1 = dismounting
  walkPhase: number; // walking animation phase
}

export interface EFCheckpoint {
  position: Vec3;
  radius: number;
  collected: boolean;
  glowPhase: number;
}

export interface EFOrb {
  position: Vec3;
  collected: boolean;
  phase: number;
}

export interface EFNPC {
  position: Vec3;
  targetX: number;
  targetZ: number;
  speed: number;
  type: "peasant" | "knight" | "merchant";
  lookingUp: boolean;
  lookTimer: number;
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

  // Photo mode
  photoMode: boolean;

  // Near-ground effects
  nearGround: boolean;
  nearWater: boolean;

  // Notifications
  notification: string;
  notificationTimer: number;

  // Checkpoints & orbs
  checkpoints: EFCheckpoint[];
  orbs: EFOrb[];

  // NPCs
  npcs: EFNPC[];

  // Day cycle (0-1: 0=midnight, 0.25=dawn, 0.5=noon, 0.75=dusk)
  sunAngle: number;
}

// ---------------------------------------------------------------------------
// Balance
// ---------------------------------------------------------------------------

export const EFBalance = {
  SIM_TICK_MS: 16,
  MIN_SPEED: 4,
  MAX_SPEED: 22,
  BOOST_SPEED: 32,
  CRUISE_SPEED: 11,
  ACCELERATION: 6,
  PITCH_RATE: 1.4,
  YAW_RATE: 1.6,
  ROLL_RATE: 2.8,
  ROLL_RETURN_RATE: 2.0,
  MAX_PITCH: Math.PI * 0.4,
  WORLD_RADIUS: 650,
  MIN_ALT: 3,
  MAX_ALT: 350,
  START_ALT: 80,
  BOOST_DURATION: 2.0,
  BOOST_COOLDOWN: 5.0,
  MOUSE_SENSITIVITY: 0.003,
  INTRO_DURATION: 8.0,
  COMBO_WINDOW: 3.0,
  SPELL_COOLDOWNS: [3, 5, 0] as readonly number[],
  WALK_SPEED: 6,
  WALK_RUN_SPEED: 12,
  WALK_TURN_RATE: 3.0,
  MOUNT_TRANSITION_TIME: 0.8,
} as const;

// ---------------------------------------------------------------------------
// Checkpoint positions
// ---------------------------------------------------------------------------

const CHECKPOINT_POSITIONS: Vec3[] = [
  { x: 0, y: 55, z: 30 },
  { x: 35, y: 40, z: -30 },
  { x: -85, y: 30, z: 0 },
  { x: 0, y: 25, z: -85 },
  { x: 85, y: 35, z: 0 },
  { x: 140, y: 20, z: -60 },
  { x: -120, y: 25, z: 90 },
  { x: -180, y: 15, z: -25 },
  { x: 0, y: 70, z: 0 },
  { x: 60, y: 45, z: 50 },
];

// ---------------------------------------------------------------------------
// Magic orb positions (at interesting/tricky locations)
// ---------------------------------------------------------------------------

const ORB_POSITIONS: Vec3[] = [
  // Under bridges
  { x: 0, y: 2, z: 15 }, { x: -60, y: 2, z: -35 }, { x: 70, y: 2, z: -18 },
  // Castle area
  { x: 0, y: 50, z: 30 }, { x: 15, y: 10, z: 20 }, { x: -15, y: 10, z: 40 },
  // Cathedral spire area
  { x: 35, y: 50, z: -16 }, { x: 35, y: 15, z: -30 },
  // Along aqueduct
  { x: -40, y: 12, z: 45 }, { x: -20, y: 12, z: 30 }, { x: 10, y: 12, z: 10 },
  // Market area (low)
  { x: -30, y: 5, z: -35 }, { x: -25, y: 8, z: -30 },
  // Windmill blade height
  { x: 140, y: 12, z: -60 }, { x: -120, y: 12, z: 90 },
  // Harbor
  { x: -180, y: 4, z: -25 }, { x: -175, y: 8, z: -30 },
  // Skimming water
  { x: 50, y: 2, z: -15 }, { x: -100, y: 2, z: -25 }, { x: 120, y: 2, z: -20 },
  // Noble quarter
  { x: 55, y: 12, z: 50 }, { x: 50, y: 20, z: 55 },
  // Training yard
  { x: -25, y: 5, z: 55 },
  // Cemetery yew trees
  { x: 50, y: 8, z: -45 },
  // Wall towers
  { x: 85, y: 16, z: 0 }, { x: 0, y: 16, z: 85 }, { x: -85, y: 16, z: 0 }, { x: 0, y: 16, z: -85 },
  // High altitude
  { x: -50, y: 90, z: -50 }, { x: 80, y: 100, z: 60 }, { x: -100, y: 80, z: -80 },
  // Between buildings
  { x: 20, y: 6, z: 5 }, { x: -15, y: 6, z: -10 },
  // Outskirts
  { x: 180, y: 8, z: 80 }, { x: -160, y: 10, z: -100 },
  // River path
  { x: -40, y: 3, z: -20 }, { x: 30, y: 3, z: 10 },
  // Ruins
  { x: 180, y: 5, z: 80 }, { x: -160, y: 6, z: -100 },
  // Villages
  { x: 150, y: 6, z: 40 }, { x: -130, y: 6, z: -60 },
];

// ---------------------------------------------------------------------------
// NPC spawn data
// ---------------------------------------------------------------------------

function _seededRng(seed: number): () => number {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

function _createNPCs(): EFNPC[] {
  const rng = _seededRng(3333);
  const npcs: EFNPC[] = [];
  const types: EFNPC["type"][] = ["peasant", "knight", "merchant"];
  // City streets
  for (let i = 0; i < 30; i++) {
    const angle = rng() * Math.PI * 2;
    const dist = 15 + rng() * 60;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    if (Math.sqrt(x * x + (z - 30) ** 2) < 30) continue; // skip castle
    npcs.push({
      position: { x, y: 0, z },
      targetX: x + (rng() - 0.5) * 20,
      targetZ: z + (rng() - 0.5) * 20,
      speed: 1 + rng() * 2,
      type: types[Math.floor(rng() * types.length)],
      lookingUp: false,
      lookTimer: 0,
    });
  }
  // Market crowd
  for (let i = 0; i < 8; i++) {
    npcs.push({
      position: { x: -30 + (rng() - 0.5) * 15, y: 0, z: -35 + (rng() - 0.5) * 15 },
      targetX: -30 + (rng() - 0.5) * 15,
      targetZ: -35 + (rng() - 0.5) * 15,
      speed: 0.5 + rng(),
      type: "merchant",
      lookingUp: false,
      lookTimer: 0,
    });
  }
  // Wall patrol guards
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    npcs.push({
      position: { x: Math.cos(a) * 85, y: 8, z: Math.sin(a) * 85 },
      targetX: Math.cos(a + 0.3) * 85,
      targetZ: Math.sin(a + 0.3) * 85,
      speed: 1.5,
      type: "knight",
      lookingUp: false,
      lookTimer: 0,
    });
  }
  return npcs;
}

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
      barrelRollTimer: 0,
      barrelRollCooldown: 0,
      barrelRollDirection: 1,
      distanceFlown: 0,
      topSpeed: 0,
      checkpointsHit: 0,
      nearMisses: 0,
      trickScore: 0,
      orbsCollected: 0,
      comboMultiplier: 1,
      comboTimer: 0,
      lastComboScore: 0,
      spellCooldowns: [0, 0, 0],
      magicTrailActive: false,
      mounted: true,
      mountTransition: 1,
      mountTransitionDir: 1,
      walkPhase: 0,
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
    photoMode: false,
    nearGround: false,
    nearWater: false,
    notification: "",
    notificationTimer: 0,
    checkpoints: CHECKPOINT_POSITIONS.map((p) => ({
      position: { ...p },
      radius: 8,
      collected: false,
      glowPhase: Math.random() * Math.PI * 2,
    })),
    orbs: ORB_POSITIONS.map((p) => ({
      position: { ...p },
      collected: false,
      phase: Math.random() * Math.PI * 2,
    })),
    npcs: _createNPCs(),
    sunAngle: 0.8, // start at golden hour
  };
}
