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

  // Stall
  isStalling: boolean;
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
  type: "peasant" | "knight" | "merchant" | "sheep";
  lookingUp: boolean;
  lookTimer: number;
  scared: boolean;
  scareTimer: number;
}

export interface EFDragon {
  position: Vec3;
  targetX: number;
  targetZ: number;
  speed: number;
  yaw: number;
  fireTimer: number;
  fireCooldown: number;
  fireActive: boolean;
  circleCenter: Vec3;
  circleRadius: number;
  circleAngle: number;
}

export interface EFDelivery {
  active: boolean;
  pickupPos: Vec3;
  deliverPos: Vec3;
  pickupLabel: string;
  deliverLabel: string;
  pickedUp: boolean;
  timeLimit: number;
  timeRemaining: number;
  reward: number;
}

export interface EFRace {
  active: boolean;
  waypoints: Vec3[];
  currentWaypoint: number;
  timeElapsed: number;
  goldTime: number;
  silverTime: number;
  bronzeTime: number;
  finished: boolean;
  medal: "" | "gold" | "silver" | "bronze";
}

export interface EFAchievement {
  id: string;
  name: string;
  unlocked: boolean;
}

export interface EFBirdFlock {
  center: Vec3;
  birds: { x: number; y: number; z: number; vx: number; vy: number; vz: number }[];
  scattered: boolean;
  scatterTimer: number;
}

export type WeatherType = "clear" | "rain" | "storm" | "fog";

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

  // Weather
  weather: WeatherType;
  weatherTimer: number;
  weatherIntensity: number;
  rainDrops: { x: number; y: number; z: number }[];

  // Wind gusts
  gustTimer: number;
  gustStrength: number;
  gustAngle: number;

  // Stall
  stalling: boolean;
  stallTimer: number;

  // Dragons
  dragons: EFDragon[];

  // Delivery quests
  delivery: EFDelivery;

  // Race
  race: EFRace;

  // Achievements
  achievements: EFAchievement[];

  // Bird flocks
  birdFlocks: EFBirdFlock[];

  // Landmark discovery
  discoveredLandmarks: Set<string>;
  landmarkCount: number;
  totalLandmarks: number;

  // Landing
  isLanding: boolean;
  landingTimer: number;

  // Spell effects
  lightningStrikePos: Vec3 | null;
  lightningTimer: number;
  fireworkScareActive: boolean;
  fireworkScareTimer: number;
  fireworkScarePos: Vec3 | null;
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
// Terrain height sampling (matches _buildTerrain procedural formula)
// ---------------------------------------------------------------------------

/** Returns approximate terrain height at world (x, z). */
export function getTerrainHeight(x: number, z: number): number {
  const dist = Math.sqrt(x * x + z * z);
  let h = 0;
  if (dist > 100) {
    h += (dist - 100) * 0.05 * (Math.sin(x * 0.02) * Math.cos(z * 0.03) + 0.5);
    h += Math.sin(x * 0.01 + z * 0.015) * 8;
    h += Math.sin(x * 0.035 + z * 0.02) * 4;
    h += Math.sin(x * 0.06 - z * 0.04) * 2;
    h += 1; // average of rng()*2 noise
  }
  h += Math.sin(x * 0.1) * Math.cos(z * 0.1) * 0.5;
  h += Math.sin(x * 0.05 + z * 0.07) * 1.5;
  return h;
}

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
// Landmarks for discovery system
// ---------------------------------------------------------------------------

export const LANDMARKS: { name: string; x: number; z: number; radius: number }[] = [
  { name: "Camelot Castle", x: 0, z: 30, radius: 40 },
  { name: "Cathedral", x: 35, z: -30, radius: 25 },
  { name: "Market Square", x: -30, z: -35, radius: 20 },
  { name: "The Prancing Pony", x: 45, z: 10, radius: 15 },
  { name: "Blacksmith", x: -45, z: 5, radius: 15 },
  { name: "Training Yard", x: -50, z: 45, radius: 20 },
  { name: "Cemetery", x: 50, z: -55, radius: 15 },
  { name: "Noble Quarter", x: 25, z: 0, radius: 20 },
  { name: "Wizard Tower", x: 450, z: -350, radius: 30 },
  { name: "Distant Village", x: -400, z: 300, radius: 35 },
  { name: "Windmill Hill", x: 140, z: -60, radius: 20 },
  { name: "Western Windmill", x: -120, z: 90, radius: 20 },
  { name: "Southern Ruins", x: 180, z: 80, radius: 20 },
  { name: "Northern Ruins", x: -160, z: -100, radius: 20 },
  { name: "Stone Circle", x: 450, z: -350, radius: 20 },
  { name: "Eastern Village", x: 150, z: 40, radius: 20 },
  { name: "Western Village", x: -130, z: -60, radius: 20 },
  { name: "Northern Hamlet", x: 50, z: -300, radius: 25 },
  { name: "Southern Settlement", x: -80, z: 350, radius: 25 },
  { name: "Far East Village", x: 380, z: 150, radius: 25 },
  { name: "Riverside Village", x: -250, z: -200, radius: 25 },
  { name: "Hilltop Village", x: 300, z: -250, radius: 25 },
];

// ---------------------------------------------------------------------------
// Achievement definitions
// ---------------------------------------------------------------------------

const ACHIEVEMENT_DEFS: { id: string; name: string }[] = [
  { id: "first_flight", name: "First Flight" },
  { id: "speed_demon", name: "Speed Demon (30+ knots)" },
  { id: "low_rider", name: "Low Rider (fly under 5ft)" },
  { id: "explorer", name: "Explorer (discover 10 landmarks)" },
  { id: "full_map", name: "Cartographer (all landmarks)" },
  { id: "ring_master", name: "Ring Master (all rings)" },
  { id: "orb_collector", name: "Orb Collector (20 orbs)" },
  { id: "dragon_dodger", name: "Dragon Dodger (survive dragon)" },
  { id: "delivery_complete", name: "Express Delivery" },
  { id: "race_gold", name: "Gold Medal Racer" },
  { id: "barrel_roll", name: "Do a Barrel Roll!" },
  { id: "high_flyer", name: "High Flyer (300+ altitude)" },
  { id: "night_owl", name: "Night Owl (fly at night)" },
  { id: "storm_rider", name: "Storm Rider (fly in storm)" },
  { id: "flock_scatter", name: "Bird Watcher (scatter flock)" },
  { id: "combo_5", name: "Combo Master (5x combo)" },
];

// ---------------------------------------------------------------------------
// Race course waypoints
// ---------------------------------------------------------------------------

const RACE_WAYPOINTS: Vec3[] = [
  { x: 0, y: 60, z: -80 },
  { x: 80, y: 50, z: -40 },
  { x: 120, y: 40, z: 30 },
  { x: 60, y: 55, z: 80 },
  { x: -40, y: 45, z: 60 },
  { x: -100, y: 50, z: 0 },
  { x: -60, y: 60, z: -60 },
  { x: 0, y: 65, z: -80 },
];

// ---------------------------------------------------------------------------
// Bird flock spawn positions
// ---------------------------------------------------------------------------

function _createBirdFlocks(rng: () => number): EFBirdFlock[] {
  const flocks: EFBirdFlock[] = [];
  for (let f = 0; f < 8; f++) {
    const angle = rng() * Math.PI * 2;
    const dist = 80 + rng() * 400;
    const cx = Math.cos(angle) * dist;
    const cz = Math.sin(angle) * dist;
    const cy = 30 + rng() * 60;
    const birds: EFBirdFlock["birds"] = [];
    const count = 6 + Math.floor(rng() * 8);
    for (let b = 0; b < count; b++) {
      birds.push({
        x: cx + (rng() - 0.5) * 10,
        y: cy + (rng() - 0.5) * 5,
        z: cz + (rng() - 0.5) * 10,
        vx: 0, vy: 0, vz: 0,
      });
    }
    flocks.push({ center: { x: cx, y: cy, z: cz }, birds, scattered: false, scatterTimer: 0 });
  }
  return flocks;
}

// ---------------------------------------------------------------------------
// Dragon spawn data
// ---------------------------------------------------------------------------

function _createDragons(): EFDragon[] {
  return [
    {
      position: { x: 350, y: 80, z: -200 },
      targetX: 350, targetZ: -200, speed: 15, yaw: 0,
      fireTimer: 0, fireCooldown: 0, fireActive: false,
      circleCenter: { x: 350, y: 80, z: -200 }, circleRadius: 80, circleAngle: 0,
    },
    {
      position: { x: -300, y: 90, z: 200 },
      targetX: -300, targetZ: 200, speed: 12, yaw: Math.PI,
      fireTimer: 0, fireCooldown: 0, fireActive: false,
      circleCenter: { x: -300, y: 90, z: 200 }, circleRadius: 100, circleAngle: Math.PI,
    },
  ];
}

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
  // City streets — dense population throughout Camelot
  for (let i = 0; i < 60; i++) {
    const angle = rng() * Math.PI * 2;
    const dist = 15 + rng() * 70;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    if (Math.sqrt(x * x + (z - 30) ** 2) < 25) continue; // skip castle
    npcs.push({
      position: { x, y: 0, z },
      targetX: x + (rng() - 0.5) * 20,
      targetZ: z + (rng() - 0.5) * 20,
      speed: 1 + rng() * 2,
      type: types[Math.floor(rng() * types.length)],
      lookingUp: false,
      lookTimer: 0,
      scared: false,
      scareTimer: 0,
    });
  }
  // Market crowd — bustling market square
  for (let i = 0; i < 20; i++) {
    npcs.push({
      position: { x: -30 + (rng() - 0.5) * 25, y: 0, z: -35 + (rng() - 0.5) * 25 },
      targetX: -30 + (rng() - 0.5) * 25,
      targetZ: -35 + (rng() - 0.5) * 25,
      speed: 0.5 + rng(),
      type: rng() < 0.6 ? "merchant" : "peasant",
      lookingUp: false,
      lookTimer: 0,
      scared: false,
      scareTimer: 0,
    });
  }
  // Cathedral congregation
  for (let i = 0; i < 10; i++) {
    npcs.push({
      position: { x: 35 + (rng() - 0.5) * 14, y: 0, z: -30 + (rng() - 0.5) * 14 },
      targetX: 35 + (rng() - 0.5) * 14,
      targetZ: -30 + (rng() - 0.5) * 14,
      speed: 0.3 + rng() * 0.7,
      type: "peasant",
      lookingUp: false,
      lookTimer: 0,
      scared: false,
      scareTimer: 0,
    });
  }
  // Tavern patrons milling about outside The Prancing Pony
  for (let i = 0; i < 8; i++) {
    npcs.push({
      position: { x: 45 + (rng() - 0.5) * 12, y: 0, z: 10 + (rng() - 0.5) * 12 },
      targetX: 45 + (rng() - 0.5) * 12,
      targetZ: 10 + (rng() - 0.5) * 12,
      speed: 0.4 + rng() * 0.8,
      type: rng() < 0.4 ? "knight" : "peasant",
      lookingUp: false,
      lookTimer: 0,
      scared: false,
      scareTimer: 0,
    });
  }
  // Blacksmith area workers
  for (let i = 0; i < 5; i++) {
    npcs.push({
      position: { x: -45 + (rng() - 0.5) * 10, y: 0, z: 5 + (rng() - 0.5) * 10 },
      targetX: -45 + (rng() - 0.5) * 10,
      targetZ: 5 + (rng() - 0.5) * 10,
      speed: 0.6 + rng() * 0.8,
      type: "peasant",
      lookingUp: false,
      lookTimer: 0,
      scared: false,
      scareTimer: 0,
    });
  }
  // Noble quarter strollers
  for (let i = 0; i < 6; i++) {
    npcs.push({
      position: { x: 25 + (rng() - 0.5) * 16, y: 0, z: (rng() - 0.5) * 16 },
      targetX: 25 + (rng() - 0.5) * 20,
      targetZ: (rng() - 0.5) * 20,
      speed: 0.8 + rng() * 1.2,
      type: rng() < 0.3 ? "knight" : "merchant",
      lookingUp: false,
      lookTimer: 0,
      scared: false,
      scareTimer: 0,
    });
  }
  // Training yard soldiers
  for (let i = 0; i < 8; i++) {
    npcs.push({
      position: { x: -50 + (rng() - 0.5) * 14, y: 0, z: 45 + (rng() - 0.5) * 14 },
      targetX: -50 + (rng() - 0.5) * 14,
      targetZ: 45 + (rng() - 0.5) * 14,
      speed: 1.5 + rng() * 1.5,
      type: "knight",
      lookingUp: false,
      lookTimer: 0,
      scared: false,
      scareTimer: 0,
    });
  }
  // Gate crowds — people coming and going through the main gates
  const gates = [
    { x: 0, z: -85 },  // north gate
    { x: 0, z: 85 },   // south gate
    { x: 85, z: 0 },   // east gate
    { x: -85, z: 0 },  // west gate
  ];
  for (const gate of gates) {
    for (let i = 0; i < 4; i++) {
      npcs.push({
        position: { x: gate.x + (rng() - 0.5) * 10, y: 0, z: gate.z + (rng() - 0.5) * 10 },
        targetX: gate.x + (rng() - 0.5) * 30,
        targetZ: gate.z + (rng() - 0.5) * 30,
        speed: 1.2 + rng() * 1.8,
        type: types[Math.floor(rng() * types.length)],
        lookingUp: false,
        lookTimer: 0,
        scared: false,
        scareTimer: 0,
      });
    }
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
      scared: false,
      scareTimer: 0,
    });
  }
  // Travelling sheep flocks across the countryside
  for (let flock = 0; flock < 6; flock++) {
    const flockAngle = rng() * Math.PI * 2;
    const flockDist = 150 + rng() * 350;
    const fx = Math.cos(flockAngle) * flockDist;
    const fz = Math.sin(flockAngle) * flockDist;
    const flockSize = 4 + Math.floor(rng() * 5);
    for (let s = 0; s < flockSize; s++) {
      npcs.push({
        position: { x: fx + (rng() - 0.5) * 8, y: 0, z: fz + (rng() - 0.5) * 8 },
        targetX: fx + (rng() - 0.5) * 40,
        targetZ: fz + (rng() - 0.5) * 40,
        speed: 0.4 + rng() * 0.6,
        type: "sheep",
        lookingUp: false,
        lookTimer: 0,
        scared: false,
        scareTimer: 0,
      });
    }
  }
  return npcs;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createEagleFlightState(sw: number, sh: number): EagleFlightState {
  return {
    player: {
      position: { x: 490, y: EFBalance.START_ALT, z: -380 },
      pitch: 0,
      yaw: Math.atan2(-490, 380),
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
      isStalling: false,
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

    // Weather
    weather: "clear" as WeatherType,
    weatherTimer: 60 + Math.random() * 120, // first weather change in 1-3 min
    weatherIntensity: 0,
    rainDrops: [],

    // Wind gusts
    gustTimer: 5 + Math.random() * 10,
    gustStrength: 0,
    gustAngle: 0,

    // Stall
    stalling: false,
    stallTimer: 0,

    // Dragons
    dragons: _createDragons(),

    // Delivery quests
    delivery: {
      active: false,
      pickupPos: { x: 450, y: 35, z: -350 },
      deliverPos: { x: 0, y: 10, z: 0 },
      pickupLabel: "Wizard Tower",
      deliverLabel: "Camelot",
      pickedUp: false,
      timeLimit: 90,
      timeRemaining: 90,
      reward: 500,
    },

    // Race
    race: {
      active: false,
      waypoints: RACE_WAYPOINTS,
      currentWaypoint: 0,
      timeElapsed: 0,
      goldTime: 30,
      silverTime: 45,
      bronzeTime: 60,
      finished: false,
      medal: "",
    },

    // Achievements
    achievements: ACHIEVEMENT_DEFS.map((a) => ({ ...a, unlocked: false })),

    // Bird flocks
    birdFlocks: _createBirdFlocks(_seededRng(7777)),

    // Landmark discovery
    discoveredLandmarks: new Set<string>(),
    landmarkCount: 0,
    totalLandmarks: LANDMARKS.length,

    // Landing
    isLanding: false,
    landingTimer: 0,

    // Spell effects
    lightningStrikePos: null,
    lightningTimer: 0,
    fireworkScareActive: false,
    fireworkScareTimer: 0,
    fireworkScarePos: null,
  };
}
