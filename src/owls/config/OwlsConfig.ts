// ---------------------------------------------------------------------------
// Owls: Night Hunter — balance & configuration constants
// Soar as a great horned owl through an enchanted moonlit forest.
// ---------------------------------------------------------------------------

export const OWL = {
  // Simulation
  SIM_TICK_MS: 16,

  // --- Movement ---
  FLY_SPEED: 28,
  FLY_SPEED_MAX: 50,
  DIVE_SPEED: 65,
  DIVE_ACCEL: 80,
  CLIMB_DECEL: 0.6,
  TURN_RATE: 2.2,
  PITCH_MIN: -1.2,
  PITCH_MAX: 0.7,
  GRAVITY: 18,
  LIFT: 20,
  MIN_HEIGHT: 1.5,
  MAX_HEIGHT: 90,
  BANK_LERP: 5,
  BANK_MAX: 0.6,

  // --- Health ---
  HP_MAX: 100,
  HP_REGEN: 3,
  TREE_DAMAGE: 18,
  INVULN_DURATION: 0.6,
  HP_REGEN_DELAY: 3,
  LOW_HP_THRESHOLD: 30,

  // --- Stamina ---
  STAMINA_MAX: 100,
  STAMINA_REGEN: 12,
  DIVE_STAMINA_COST: 25,
  SCREECH_STAMINA_COST: 35,
  SILENT_GLIDE_DRAIN: 15,
  BARREL_ROLL_STAMINA: 15,

  // --- Abilities ---
  CATCH_RADIUS: 3.5,
  CATCH_SPEED_MIN: 15,
  DIVE_CATCH_BONUS: 1.8,
  SCREECH_RADIUS: 25,
  SCREECH_STUN_DURATION: 3,
  SCREECH_COOLDOWN: 8,
  SILENT_GLIDE_DETECT_MULT: 0.3,
  COMBO_DECAY_TIME: 4,
  BARREL_ROLL_DURATION: 0.5,
  BARREL_ROLL_COOLDOWN: 2,
  NEAR_MISS_RADIUS: 6,

  // --- Hit Stop ---
  HIT_STOP_DURATION: 0.12,
  HIT_STOP_SCALE: 0.15,

  // --- Camera ---
  CAMERA_DISTANCE: 10,
  CAMERA_HEIGHT: 3.5,
  CAMERA_LOOK_AHEAD: 8,
  CAMERA_SMOOTHING: 4,
  CAMERA_FOV: 70,
  CAMERA_DIVE_FOV: 90,
  CAMERA_SHAKE_SCREECH: 4,
  CAMERA_SHAKE_TREE_HIT: 6,
  CAMERA_SHAKE_CATCH: 2,
  CAMERA_SHAKE_DECAY: 8,

  // --- Forest ---
  ARENA_RADIUS: 280,
  CLEARING_RADIUS: 35,
  TREE_COUNT: 180,
  TREE_HEIGHT_MIN: 18,
  TREE_HEIGHT_MAX: 40,
  TREE_TRUNK_RADIUS: 0.8,
  TREE_CANOPY_RADIUS_MIN: 4,
  TREE_CANOPY_RADIUS_MAX: 9,
  MUSHROOM_COUNT: 100,
  FIREFLY_COUNT: 250,
  STREAM_WIDTH: 6,
  ROCK_COUNT: 60,
  LEAF_COUNT: 80,

  // --- Moonlight Orbs ---
  ORB_SPAWN_INTERVAL: 12,   // seconds between orb spawns
  ORB_LIFETIME: 15,         // seconds before orb despawns
  ORB_COLLECT_RADIUS: 4,
  ORB_FLOAT_HEIGHT: 3,
  ORB_TYPES: [
    { id: "swiftness", name: "SWIFTNESS",   color: 0x44ffaa, duration: 8,  desc: "+50% speed" },
    { id: "magnet",    name: "PREY MAGNET",  color: 0xffaa44, duration: 6,  desc: "+100% catch radius" },
    { id: "timestop",  name: "FROZEN NIGHT", color: 0x8888ff, duration: 5,  desc: "Prey frozen" },
    { id: "frenzy",    name: "BLOOD FRENZY", color: 0xff4444, duration: 10, desc: "2x score" },
    { id: "restore",   name: "MOONHEAL",     color: 0x44ff44, duration: 0,  desc: "Restore HP" },
  ] as { id: string; name: string; color: number; duration: number; desc: string }[],

  // --- Dawn Transition ---
  DAWN_WARNING_TIME: 20,     // seconds before night ends, sky starts lightening

  // --- Prey ---
  PREY_TYPES: {
    mouse:  { speed: 5,  awareness: 0.3, points: 10, fleeSpeed: 8,  size: 0.4, color: 0x887766 },
    vole:   { speed: 6,  awareness: 0.5, points: 15, fleeSpeed: 10, size: 0.5, color: 0x665544 },
    rabbit: { speed: 10, awareness: 0.8, points: 25, fleeSpeed: 16, size: 0.7, color: 0xaa9977 },
    frog:   { speed: 2,  awareness: 0.6, points: 20, fleeSpeed: 14, size: 0.4, color: 0x44aa44 },
    moth:   { speed: 3,  awareness: 0.2, points: 35, fleeSpeed: 5,  size: 0.3, color: 0xccccbb },
  } as Record<string, { speed: number; awareness: number; points: number; fleeSpeed: number; size: number; color: number }>,
  HERD_ALERT_RADIUS: 15,

  // --- Waves ---
  WAVE_BASE_PREY: 10,
  WAVE_PREY_INCREMENT: 3,
  WAVE_PREY_CAP: 50,          // max prey count (logarithmic scaling kicks in before this)
  NIGHT_DURATION: 90,
  NIGHT_EXTENSION_PER_WAVE: 5,
  QUOTA_PERCENT: 0.5,
  REST_DURATION: 10,
  GRACE_PERIOD: 5,            // seconds after timer hits 0 to still catch remaining quota

  // --- Difficulty Multipliers ---
  DIFFICULTY: {
    easy:   { preySpeedMult: 0.7, awarenessMult: 0.5, quotaMult: 0.4, timerMult: 1.3, scoreMult: 0.7, damageMult: 0.5, orbMult: 1.3 },
    normal: { preySpeedMult: 1.0, awarenessMult: 1.0, quotaMult: 0.5, timerMult: 1.0, scoreMult: 1.0, damageMult: 1.0, orbMult: 1.0 },
    hard:   { preySpeedMult: 1.3, awarenessMult: 1.5, quotaMult: 0.6, timerMult: 0.85, scoreMult: 1.5, damageMult: 1.2, orbMult: 0.7 },
  } as Record<string, { preySpeedMult: number; awarenessMult: number; quotaMult: number; timerMult: number; scoreMult: number; damageMult: number; orbMult: number }>,

  // --- Wave Modifiers ---
  WAVE_MODIFIERS: [
    { id: "none",     name: "",             color: "#888888", fogMult: 1,   preySpeedMult: 1,   preyCountMult: 1,   awarenessMult: 1 },
    { id: "fog",      name: "THICK FOG",    color: "#667788", fogMult: 2.5, preySpeedMult: 0.8, preyCountMult: 1,   awarenessMult: 0.6 },
    { id: "swarm",    name: "SWARM",        color: "#ffaa22", fogMult: 1,   preySpeedMult: 1,   preyCountMult: 1.8, awarenessMult: 0.8 },
    { id: "moonlit",  name: "MOONLIT",      color: "#aabbff", fogMult: 0.4, preySpeedMult: 1,   preyCountMult: 1,   awarenessMult: 1.5 },
    { id: "frenzy",   name: "FRENZY",       color: "#ff4444", fogMult: 1,   preySpeedMult: 1.4, preyCountMult: 1.2, awarenessMult: 1.3 },
    { id: "ethereal", name: "ETHEREAL",     color: "#aa44ff", fogMult: 1.5, preySpeedMult: 0.6, preyCountMult: 0.8, awarenessMult: 0.4 },
  ] as const,

  // --- Upgrades ---
  UPGRADE_BASE_COST: 50,
  UPGRADE_COST_SCALE: 1.6,

  // --- Scoring ---
  COMBO_MULTIPLIER: 0.25,
  STREAK_BONUS_THRESHOLD: 5,
  STREAK_BONUS_POINTS: 50,
  PERFECT_WAVE_BONUS: 200,

  // --- Visual ---
  FOG_NEAR: 60,
  FOG_FAR: 220,
  WING_FLAP_SPEED: 3.5,
  WING_GLIDE_ANGLE: 0.3,
  WING_DIVE_ANGLE: -0.8,
  SPEED_LINE_COUNT: 30,
  WING_TRAIL_RATE: 0.15,    // seconds between wing trail particles
} as const;

// Upgrade definitions
export const UPGRADES = [
  { id: "swift",   name: "Swift Wings",     desc: "Fly faster",                  maxLevel: 3, effect: "+15% speed (28 → 32 → 37 → 42)" },
  { id: "keen",    name: "Keen Eyes",        desc: "Larger catch radius",         maxLevel: 3, effect: "+20% radius (3.5 → 4.2 → 4.9 → 5.6)" },
  { id: "silent",  name: "Silent Feathers", desc: "Silent glide stamina cost",   maxLevel: 3, effect: "-25% drain per level (cumulative)" },
  { id: "talons",  name: "Iron Talons",     desc: "Catch at lower speeds",       maxLevel: 3, effect: "-20% min speed (15 → 12 → 9 → 6)" },
  { id: "vision",  name: "Night Vision",    desc: "See further through fog",     maxLevel: 3, effect: "+30% visibility per level" },
  { id: "screech", name: "Banshee Screech", desc: "Larger stun radius",          maxLevel: 3, effect: "+30% radius (25 → 33 → 40 → 48)" },
] as const;

export function getUpgradeCost(level: number): number {
  return Math.round(OWL.UPGRADE_BASE_COST * Math.pow(OWL.UPGRADE_COST_SCALE, level));
}
