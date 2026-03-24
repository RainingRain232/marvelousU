// ---------------------------------------------------------------------------
// The Last Flame — Type definitions
// A darkness-survival game: you are a candle flame in an endless cavern
// ---------------------------------------------------------------------------

export enum LFPhase {
  START = "start",
  PLAYING = "playing",
  PAUSED = "paused",
  DYING = "dying",  // flame extinguishing animation
  DEAD = "dead",
}

export type ShadowVariant = "normal" | "brute" | "swarm" | "stalker";

export interface LFShadow {
  x: number; y: number;
  vx: number; vy: number;
  state: "lurk" | "telegraph" | "dart" | "flee" | "wind"; // telegraph = pre-dart warning, wind = brute telegraph
  dartTimer: number;
  dartDuration: number;
  hp: number;
  radius: number;
  eyePhase: number;
  alive: boolean;
  variant: ShadowVariant;
  fuelDamage: number; // how much fuel to drain on hit
}

export interface LFOilDrop {
  x: number; y: number;
  amount: number; // fuel restored (0-1 range)
  age: number;
  pulse: number;
}

export interface LFPillar {
  x: number; y: number;
  radius: number;
}

export interface LFParticle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  color: number; size: number;
}

export interface LFFloatText {
  x: number; y: number;
  text: string; color: number;
  life: number; maxLife: number;
  scale: number;
}

export interface LFState {
  phase: LFPhase;
  // Arena
  arenaW: number; arenaH: number;
  // Player
  playerX: number; playerY: number;
  playerSpeed: number;
  // Fuel & light
  fuel: number;       // 0-1 (1 = full)
  lightRadius: number; // current light radius in pixels
  maxLightRadius: number;
  // Flare
  flareCooldown: number;
  flareTimer: number;
  flareRadius: number;
  flareCharges: number;    // current charges (1 or 2)
  flareMaxCharges: number; // max charges (1, or 2 with upgrade)
  // Shadows
  shadows: LFShadow[];
  shadowSpawnTimer: number;
  // Items
  oilDrops: LFOilDrop[];
  oilSpawnTimer: number;
  // Terrain
  pillars: LFPillar[];
  // Invulnerability after hit
  invulnTimer: number;
  // Sprint
  sprinting: boolean;
  // Score
  score: number;
  highScore: number;
  shadowsBurned: number;
  oilCollected: number;
  flaresUsed: number;
  hitsAbsorbed: number;
  // Effects
  particles: LFParticle[];
  floatTexts: LFFloatText[];
  screenShake: number;
  screenFlashColor: number;
  screenFlashTimer: number;
  // Wave
  wave: number;
  waveTimer: number;
  // Upgrade-derived values
  lightRecoveryRate: number;
  oilMagnetRadius: number;
  flareCooldownBase: number;
  oilSpawnInterval: number;   // effective oil spawn interval (from upgrade)
  // Room progression
  roomDepth: number;
  roomConfig: LFRoomConfig;
  roomTransitionTimer: number;
  // Run mutators (chosen at Respite waves)
  activeMutators: string[];
  mutatorChoices: Array<{ id: string; name: string; desc: string }>;
  choosingMutator: boolean;
  // Death
  deathCause: string;
  dyingTimer: number;
  // Wave announcement pause
  waveAnnounceTimer: number;
  waveName: string;
  // Tutorial first-occurrence flags
  tutFirstOil: boolean;
  tutFirstFlare: boolean;
  tutFirstHit: boolean;
  tutFirstSprint: boolean;
  tutFirstLowFuel: boolean;
  // Timing
  time: number;
}

export interface LFUpgrades {
  startFuel: number;      // 0-2: each +5% starting fuel
  flareCooldown: number;  // 0-2: each -0.5s flare cooldown
  lightRecovery: number;  // 0-2: faster max light radius recovery
  oilMagnet: number;      // 0-1: slight oil pull radius
  // Advanced tiers (unlock after all base maxed)
  doubleFlare: number;    // 0-1: flare has 2 charges
  oilFrequency: number;   // 0-2: oil spawns faster
  startingMutator: number; // 0-1: start with a random mutator
}

export interface LFRoomConfig {
  arenaW: number; arenaH: number;
  pillarCount: number;
  pillarRadiusMin: number; pillarRadiusMax: number;
  floorDark: number; floorLight: number;
  bgColor: number;
  roomName: string;
  hazard: "none" | "wind" | "damp" | "oil_floor";
}

export interface LFRunSummary {
  score: number;
  wave: number;
  time: number;
  mutators: string[];
  deathCause: string;
}

export interface LFMeta {
  highScore: number;
  bestTime: number;
  gamesPlayed: number;
  totalShadowsBurned: number;
  totalOilCollected: number;
  embers: number;
  upgrades: LFUpgrades;
  milestones: string[];
  runHistory: LFRunSummary[];
}
