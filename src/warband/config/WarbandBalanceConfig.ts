// ---------------------------------------------------------------------------
// Warband mode – balance constants
// ---------------------------------------------------------------------------

/** Axis-aligned wall rectangle for siege collision */
export interface SiegeWallRect {
  minX: number; maxX: number;
  minZ: number; maxZ: number;
}

/** All siege wall collision segments (XZ plane AABBs) */
export const SIEGE_WALLS: SiegeWallRect[] = [
  // Front wall — left of gate
  { minX: -21, maxX: -2.5, minZ: -16, maxZ: -14 },
  // Front wall — right of gate
  { minX: 2.5, maxX: 21, minZ: -16, maxZ: -14 },
  // Left side wall
  { minX: -21, maxX: -19, minZ: -36, maxZ: -15 },
  // Right side wall
  { minX: 19, maxX: 21, minZ: -36, maxZ: -15 },
  // Back wall
  { minX: -21, maxX: 21, minZ: -36, maxZ: -34 },
  // Left inner wall (creates left corridor)
  { minX: -11, maxX: -9, minZ: -30, maxZ: -20 },
  // Right inner wall (creates right corridor)
  { minX: 9, maxX: 11, minZ: -30, maxZ: -20 },
  // Centre barricade (forces flanking in middle route)
  { minX: -3, maxX: 3, minZ: -22.5, maxZ: -21.5 },
];

export const WB = {
  // Tick / timing
  SIM_TICK_MS: 16.667, // 60 FPS fixed timestep
  TICKS_PER_SEC: 60,

  // Movement
  WALK_SPEED: 3.5,
  RUN_SPEED: 6.0,
  STRAFE_SPEED: 3.0,
  BACK_SPEED: 1.8,
  TURN_SPEED: 0.06, // radians per frame (mouse sensitivity base)
  GRAVITY: -20,
  JUMP_VELOCITY: 8,

  // Combat phases (in ticks)
  WINDUP_TICKS_BASE: 18, // ~300ms base windup
  RELEASE_TICKS_BASE: 8, // ~133ms release window
  RECOVERY_TICKS_BASE: 20, // ~333ms recovery
  BLOCK_RAISE_TICKS: 6, // time to raise block
  STAGGER_TICKS: 30, // stagger on blocked attack
  PARRY_WINDOW_TICKS: 8, // perfect parry window

  // Stamina
  STAMINA_MAX: 100,
  STAMINA_REGEN: 0.3, // per tick
  STAMINA_ATTACK_COST: 15,
  STAMINA_BLOCK_COST: 5, // per blocked hit
  STAMINA_SPRINT_COST: 0.5, // per tick

  // Hitbox damage multipliers
  HEAD_MULT: 2.0,
  TORSO_MULT: 1.0,
  GAUNTLETS_MULT: 0.6,
  LEGS_MULT: 0.75,
  BOOTS_MULT: 0.5,

  // Economy
  GOLD_PER_KILL: 50,
  GOLD_HEADSHOT_BONUS: 25,
  STARTING_GOLD: 500,

  // Arena size
  ARENA_WIDTH: 80,
  ARENA_DEPTH: 80,

  // Teams
  TEAM_SIZE: 5,

  // Projectile
  ARROW_SPEED: 40,
  BOLT_SPEED: 55,
  THROWN_SPEED: 25,
  ARROW_GRAVITY: -8,
  PROJECTILE_DAMAGE_FALLOFF: 0.7, // min damage at max range

  // Camera
  THIRD_PERSON_DIST: 5,
  THIRD_PERSON_HEIGHT: 2.5,
  FIRST_PERSON_HEIGHT: 1.65,

  // Fighter dimensions
  FIGHTER_HEIGHT: 1.8,
  FIGHTER_RADIUS: 0.35,

  // Horse
  HORSE_WALK_SPEED: 5.5,
  HORSE_RUN_SPEED: 10.0,
  HORSE_STRAFE_SPEED: 3.5,
  HORSE_BACK_SPEED: 2.5,
  HORSE_HP_LIGHT: 80,
  HORSE_HP_MEDIUM: 120,
  HORSE_HP_HEAVY: 160,
  HORSE_DEF_LIGHT: 5,
  HORSE_DEF_MEDIUM: 12,
  HORSE_DEF_HEAVY: 22,
  HORSE_COST_LIGHT: 200,
  HORSE_COST_MEDIUM: 400,
  HORSE_COST_HEAVY: 700,
  HORSE_CHARGE_MULT: 1.5,
  HORSE_CHARGE_MIN_SPEED: 4.0,
  MOUNT_RANGE: 3.0,
  HORSE_HEIGHT: 1.3,
  HORSE_RADIUS: 0.8,

  // Siege layout
  SIEGE_FRONT_Z: -15,
  SIEGE_BACK_Z: -35,
  SIEGE_LEFT_X: -20,
  SIEGE_RIGHT_X: 20,
  SIEGE_WALL_THICK: 2,
  SIEGE_WALL_HEIGHT: 8,
  SIEGE_GATE_HALF_W: 2.5,
  SIEGE_GATE_HEIGHT: 5,
  SIEGE_CAPTURE_X: 0,
  SIEGE_CAPTURE_Z: -28,
  SIEGE_CAPTURE_RADIUS: 5,
  SIEGE_CAPTURE_TICKS: 60 * 60, // 60 seconds to capture
  SIEGE_BATTLE_TICKS: 300 * 60, // 5 minute time limit

  // AI
  AI_REACTION_TICKS_EASY: 30,
  AI_REACTION_TICKS_NORMAL: 18,
  AI_REACTION_TICKS_HARD: 8,
  AI_BLOCK_CHANCE_EASY: 0.3,
  AI_BLOCK_CHANCE_NORMAL: 0.55,
  AI_BLOCK_CHANCE_HARD: 0.8,
};
