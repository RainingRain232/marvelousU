// ---------------------------------------------------------------------------
// Warband mode – balance constants
// ---------------------------------------------------------------------------

export const WB = {
  // Tick / timing
  SIM_TICK_MS: 16.667, // 60 FPS fixed timestep
  TICKS_PER_SEC: 60,

  // Movement
  WALK_SPEED: 3.5,
  RUN_SPEED: 6.0,
  STRAFE_SPEED: 3.0,
  BACK_SPEED: 2.5,
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

  // AI
  AI_REACTION_TICKS_EASY: 30,
  AI_REACTION_TICKS_NORMAL: 18,
  AI_REACTION_TICKS_HARD: 8,
  AI_BLOCK_CHANCE_EASY: 0.3,
  AI_BLOCK_CHANCE_NORMAL: 0.55,
  AI_BLOCK_CHANCE_HARD: 0.8,
};
