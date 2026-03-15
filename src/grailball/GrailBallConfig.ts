// ---------------------------------------------------------------------------
// Grail Ball -- Configuration & Team/Player Definitions
// Fantasy medieval team ball sport in the Arthurian universe.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Player class enum
// ---------------------------------------------------------------------------
export enum GBPlayerClass {
  GATEKEEPER = "gatekeeper",
  KNIGHT = "knight",
  ROGUE = "rogue",
  MAGE = "mage",
}

// ---------------------------------------------------------------------------
// Match phase
// ---------------------------------------------------------------------------
export enum GBMatchPhase {
  PRE_GAME = "pre_game",
  KICKOFF = "kickoff",
  PLAYING = "playing",
  GOAL_SCORED = "goal_scored",
  HALFTIME = "halftime",
  FULL_MATCH = "full_match",
  OVERTIME = "overtime",
  POST_GAME = "post_game",
}

// ---------------------------------------------------------------------------
// Power-up types
// ---------------------------------------------------------------------------
export enum GBPowerUpType {
  SPEED_BOOST = "speed_boost",
  STRENGTH = "strength",
  MAGIC_SURGE = "magic_surge",
}

// ---------------------------------------------------------------------------
// Foul types
// ---------------------------------------------------------------------------
export enum GBFoulType {
  EXCESSIVE_FORCE = "excessive_force",
  ILLEGAL_MAGIC = "illegal_magic",
  HOLDING = "holding",
  DELAY_OF_GAME = "delay_of_game",
}

// ---------------------------------------------------------------------------
// Ability definitions per class
// ---------------------------------------------------------------------------
export interface GBAbilityDef {
  name: string;
  cooldown: number;   // seconds
  staminaCost: number;
  duration: number;   // seconds (0 = instant)
  description: string;
}

export const GB_ABILITIES: Record<GBPlayerClass, GBAbilityDef> = {
  [GBPlayerClass.GATEKEEPER]: {
    name: "Fortress Wall",
    cooldown: 18,
    staminaCost: 30,
    duration: 3,
    description: "Deploys an impenetrable magical barrier in front of the gate for 3 seconds.",
  },
  [GBPlayerClass.KNIGHT]: {
    name: "Shield Charge",
    cooldown: 12,
    staminaCost: 25,
    duration: 0.6,
    description: "Charge forward with shield, knocking back any opponent in the way and stealing the orb.",
  },
  [GBPlayerClass.ROGUE]: {
    name: "Shadow Step",
    cooldown: 8,
    staminaCost: 20,
    duration: 0.3,
    description: "Teleport a short distance in the facing direction, passing through opponents.",
  },
  [GBPlayerClass.MAGE]: {
    name: "Arcane Blast",
    cooldown: 10,
    staminaCost: 30,
    duration: 0,
    description: "Launch the orb at extreme speed with a magical shockwave, stunning nearby enemies.",
  },
};

// ---------------------------------------------------------------------------
// Class stat templates
// ---------------------------------------------------------------------------
export interface GBClassStats {
  maxStamina: number;
  staminaRegen: number;   // per second
  speed: number;          // units/s
  sprintMultiplier: number;
  tacklePower: number;
  throwPower: number;
  catchRadius: number;
  size: number;           // collision radius
}

export const GB_CLASS_STATS: Record<GBPlayerClass, GBClassStats> = {
  [GBPlayerClass.GATEKEEPER]: {
    maxStamina: 120,
    staminaRegen: 6,
    speed: 6,
    sprintMultiplier: 1.2,
    tacklePower: 9,
    throwPower: 14,
    catchRadius: 3.5,
    size: 1.2,
  },
  [GBPlayerClass.KNIGHT]: {
    maxStamina: 100,
    staminaRegen: 5,
    speed: 8,
    sprintMultiplier: 1.4,
    tacklePower: 10,
    throwPower: 12,
    catchRadius: 2.2,
    size: 1.0,
  },
  [GBPlayerClass.ROGUE]: {
    maxStamina: 90,
    staminaRegen: 7,
    speed: 11,
    sprintMultiplier: 1.5,
    tacklePower: 5,
    throwPower: 10,
    catchRadius: 2.8,
    size: 0.8,
  },
  [GBPlayerClass.MAGE]: {
    maxStamina: 80,
    staminaRegen: 6,
    speed: 7.5,
    sprintMultiplier: 1.3,
    tacklePower: 3,
    throwPower: 16,
    catchRadius: 2.5,
    size: 0.85,
  },
};

// ---------------------------------------------------------------------------
// Team formation (positions are normalized 0..1 on their half)
// ---------------------------------------------------------------------------
export interface GBFormationSlot {
  cls: GBPlayerClass;
  baseX: number;  // 0=own gate, 1=midfield
  baseZ: number;  // -1=left sideline, 1=right sideline
}

export const GB_FORMATION: GBFormationSlot[] = [
  { cls: GBPlayerClass.GATEKEEPER, baseX: 0.05, baseZ: 0 },
  { cls: GBPlayerClass.KNIGHT,     baseX: 0.25, baseZ: -0.4 },
  { cls: GBPlayerClass.KNIGHT,     baseX: 0.25, baseZ: 0.4 },
  { cls: GBPlayerClass.ROGUE,      baseX: 0.55, baseZ: -0.3 },
  { cls: GBPlayerClass.ROGUE,      baseX: 0.55, baseZ: 0.3 },
  { cls: GBPlayerClass.MAGE,       baseX: 0.80, baseZ: -0.35 },
  { cls: GBPlayerClass.MAGE,       baseX: 0.80, baseZ: 0.35 },
];

// ---------------------------------------------------------------------------
// Team definitions
// ---------------------------------------------------------------------------
export interface GBTeamDef {
  id: string;
  name: string;
  shortName: string;
  primaryColor: number;    // hex color
  secondaryColor: number;
  accentColor: number;
  motto: string;
  playStyle: "balanced" | "defensive" | "aggressive" | "magic_heavy" | "speed";
  homeFieldTheme: string;
  speedMod: number;
  tackleMod: number;
  magicMod: number;
}

export const GB_TEAMS: GBTeamDef[] = [
  {
    id: "camelot_lions",
    name: "Camelot Lions",
    shortName: "CAM",
    primaryColor: 0xdaa520,
    secondaryColor: 0x1a1a8e,
    accentColor: 0xffffff,
    motto: "For King and Glory!",
    playStyle: "balanced",
    homeFieldTheme: "royal_court",
    speedMod: 1.0, tackleMod: 1.0, magicMod: 1.0,
  },
  {
    id: "avalon_mystics",
    name: "Avalon Mystics",
    shortName: "AVA",
    primaryColor: 0x7b2ff7,
    secondaryColor: 0xc0c0c0,
    accentColor: 0x00ffcc,
    motto: "By the Mists of Avalon",
    playStyle: "magic_heavy",
    homeFieldTheme: "enchanted_isle",
    speedMod: 0.95, tackleMod: 0.85, magicMod: 1.25,
  },
  {
    id: "saxon_wolves",
    name: "Saxon Wolves",
    shortName: "SAX",
    primaryColor: 0x555555,
    secondaryColor: 0x8b0000,
    accentColor: 0xcccccc,
    motto: "Strength Through Iron",
    playStyle: "aggressive",
    homeFieldTheme: "war_camp",
    speedMod: 1.05, tackleMod: 1.2, magicMod: 0.8,
  },
  {
    id: "orkney_ravens",
    name: "Orkney Ravens",
    shortName: "ORK",
    primaryColor: 0x1a1a1a,
    secondaryColor: 0x6a0dad,
    accentColor: 0xff4500,
    motto: "From Shadows We Strike",
    playStyle: "speed",
    homeFieldTheme: "dark_fortress",
    speedMod: 1.15, tackleMod: 0.9, magicMod: 1.05,
  },
  {
    id: "cornwall_griffins",
    name: "Cornwall Griffins",
    shortName: "COR",
    primaryColor: 0xb8860b,
    secondaryColor: 0x228b22,
    accentColor: 0xffd700,
    motto: "Claws of the Coast",
    playStyle: "defensive",
    homeFieldTheme: "coastal_arena",
    speedMod: 0.95, tackleMod: 1.1, magicMod: 0.95,
  },
  {
    id: "northumbria_bears",
    name: "Northumbria Bears",
    shortName: "NOR",
    primaryColor: 0x8b4513,
    secondaryColor: 0x2f4f4f,
    accentColor: 0xffa500,
    motto: "Unyielding as the North",
    playStyle: "defensive",
    homeFieldTheme: "mountain_hold",
    speedMod: 0.9, tackleMod: 1.25, magicMod: 0.85,
  },
  {
    id: "wessex_eagles",
    name: "Wessex Eagles",
    shortName: "WES",
    primaryColor: 0xffffff,
    secondaryColor: 0x000080,
    accentColor: 0xffd700,
    motto: "Soar Above All",
    playStyle: "balanced",
    homeFieldTheme: "grand_cathedral",
    speedMod: 1.05, tackleMod: 1.0, magicMod: 1.0,
  },
  {
    id: "lothian_stags",
    name: "Lothian Stags",
    shortName: "LOT",
    primaryColor: 0x006400,
    secondaryColor: 0x8b6914,
    accentColor: 0xadff2f,
    motto: "Swift and Noble",
    playStyle: "speed",
    homeFieldTheme: "forest_glade",
    speedMod: 1.1, tackleMod: 0.95, magicMod: 1.0,
  },
];

// ---------------------------------------------------------------------------
// Field dimensions (world units)
// ---------------------------------------------------------------------------
export const GB_FIELD = {
  LENGTH: 100,       // x-axis total
  WIDTH: 60,         // z-axis total
  HALF_LENGTH: 50,
  HALF_WIDTH: 30,
  GATE_WIDTH: 8,
  GATE_HEIGHT: 5,
  GATE_DEPTH: 2,
  CENTER_CIRCLE_RADIUS: 8,
  PENALTY_AREA_LENGTH: 14,
  PENALTY_AREA_WIDTH: 28,
  BOUNDARY_HEIGHT: 2,
  TOWER_RADIUS: 2,
  TOWER_HEIGHT: 12,
};

// ---------------------------------------------------------------------------
// Physics constants
// ---------------------------------------------------------------------------
export const GB_PHYSICS = {
  GRAVITY: -20,
  ORB_FRICTION: 0.98,
  ORB_BOUNCE: 0.6,
  ORB_RADIUS: 0.4,
  TACKLE_RANGE: 2.5,
  TACKLE_COOLDOWN: 1.5,     // seconds
  TACKLE_STUN_DURATION: 0.8,
  PASS_SPEED: 28,
  SHOT_SPEED: 35,
  LOB_SPEED: 20,
  LOB_ANGLE: 0.7,          // radians
  STEAL_RANGE: 1.8,
  AUTO_PICKUP_RANGE: 1.2,
  PLAYER_DECELERATION: 0.92,
  MAX_THROW_CHARGE: 1.5,   // seconds of holding = max power
};

// ---------------------------------------------------------------------------
// Match timing
// ---------------------------------------------------------------------------
export const GB_MATCH = {
  HALF_DURATION: 300,       // 5 minutes in seconds
  HALFTIME_DURATION: 5,     // seconds of halftime break
  GOAL_CELEBRATION: 4,      // seconds after goal
  KICKOFF_DELAY: 2,         // seconds before play starts
  OVERTIME_DURATION: 120,   // 2 minutes sudden death
  SIM_TICK_MS: 16,          // ~60fps sim rate
  POWERUP_SPAWN_INTERVAL: 25,  // seconds between spawns
  POWERUP_DURATION: 8,      // seconds a power-up lasts when picked up
  FOUL_PENALTY_TIME: 3,     // seconds player sits out after foul
};

// ---------------------------------------------------------------------------
// Power-up spawn positions (normalized field coords)
// ---------------------------------------------------------------------------
export const GB_POWERUP_POSITIONS = [
  { x: 0.25, z: 0.0 },
  { x: 0.75, z: 0.0 },
  { x: 0.5, z: -0.4 },
  { x: 0.5, z: 0.4 },
  { x: 0.15, z: -0.35 },
  { x: 0.85, z: 0.35 },
];

// ---------------------------------------------------------------------------
// Camera defaults
// ---------------------------------------------------------------------------
export const GB_CAMERA = {
  DEFAULT_HEIGHT: 30,
  DEFAULT_DISTANCE: 40,
  FOLLOW_SMOOTHING: 0.06,
  GOAL_ZOOM_DISTANCE: 15,
  GOAL_ZOOM_HEIGHT: 10,
  SHAKE_DECAY: 0.9,
  MAX_SHAKE: 0.8,
};

// ---------------------------------------------------------------------------
// Rules text (shown in the rules menu)
// ---------------------------------------------------------------------------
export const GB_RULES_TEXT = `
=== GRAIL BALL - OFFICIAL RULES ===

OBJECTIVE
Two teams of 7 players compete on a tournament field to score by hurling
the enchanted Grail Orb through the opponent's mystical Gate.

TEAMS
Each team consists of:
  - 1 Gatekeeper: Guards the gate. Massive armor and tower shield.
  - 2 Knights: Defensive line. Heavy armor, can tackle and shield-block.
  - 2 Rogues: Midfield. Light and fast, can dodge and steal the orb.
  - 2 Mages: Attackers. Can cast spells to assist and boost throws.

THE GRAIL ORB
  - Starts at center field at each kickoff
  - Can be carried, thrown, or magically launched
  - Glows golden with a holy aura trail
  - Bounces off walls and gate frames

SCORING
  - Throw or carry the orb through the opponent's Gate
  - Each goal = 1 point
  - The Gate is a stone archway with a magical barrier that shatters on score

SPECIAL ABILITIES (on cooldown)
  - Knight: Shield Charge - Knock back opponents, steal the orb
  - Rogue: Shadow Step - Teleport short distance, pass through enemies
  - Mage: Arcane Blast - Supercharged throw with stun shockwave
  - Gatekeeper: Fortress Wall - Impenetrable barrier for 3 seconds

STAMINA
  - All actions consume stamina (sprinting, tackling, abilities)
  - Stamina regenerates over time
  - Running out of stamina slows the player significantly

FOULS
  - Merlin (hovering referee) calls fouls for:
    * Excessive force (repeated tackles on same player)
    * Illegal magic (using abilities on players without the orb)
    * Holding (grabbing opponents)
  - Fouled player gets a free throw from the foul spot

POWER-UPS
  - Spawn periodically on the field:
    * Speed Boost (blue) - Increased movement speed
    * Strength (red) - Enhanced tackle and throw power
    * Magic Surge (purple) - Reduced ability cooldowns

MATCH STRUCTURE
  - 2 halves of 5 minutes each
  - Halftime break with team switch
  - If tied after full time: 2-minute sudden death overtime

CONTROLS
  Arrow Keys / WASD - Move selected player
  Space - Pass (tap) / Shoot (hold & release toward gate)
  Shift - Tackle / Use special ability
  Tab - Switch selected player
  E - Lob pass
  Q - Call for pass (AI teammate throws to you)
  Escape - Pause menu
`;
