// ---------------------------------------------------------------------------
// Terraria – Balance & tuning constants
// ---------------------------------------------------------------------------

export const TB = {
  // World
  WORLD_WIDTH: 1200,
  WORLD_HEIGHT: 256,
  CHUNK_W: 16,
  TILE_SIZE: 16,

  // Depth layers (Y values, Y=0 is bottom)
  SURFACE_Y: 180,
  UNDERGROUND_Y: 120,
  CAVERN_Y: 50,
  UNDERWORLD_Y: 10,
  SEA_LEVEL: 190,

  // Terrain generation
  TERRAIN_SCALE: 0.02,
  TERRAIN_OCTAVES: 4,
  TERRAIN_PERSISTENCE: 0.45,
  TERRAIN_LACUNARITY: 2.0,
  TERRAIN_HEIGHT_RANGE: 20,
  CAVE_SCALE: 0.06,
  CAVE_THRESHOLD: 0.55,
  LARGE_CAVE_SCALE: 0.03,
  LARGE_CAVE_THRESHOLD: 0.62,
  TREE_CHANCE: 0.08,

  // Player physics
  PLAYER_SPEED: 9,
  PLAYER_SPRINT_MULT: 1.6,
  JUMP_VELOCITY: 13,
  GRAVITY: 38,
  MAX_FALL_SPEED: 35,
  FRICTION: 0.78,
  PLAYER_WIDTH: 0.8,
  PLAYER_HEIGHT: 1.5,
  SWIM_SPEED: 5,
  SWIM_BOOST: 6,

  // Player stats
  PLAYER_MAX_HP: 100,
  PLAYER_MAX_MANA: 50,
  PLAYER_REACH: 5.5,
  INVULN_TIME: 0.6,

  // Fall damage
  FALL_DAMAGE_THRESHOLD: 8,     // blocks before damage starts
  FALL_DAMAGE_MULT: 3,          // damage per block above threshold

  // Mining (faster = more satisfying)
  BASE_MINE_TIME: 0.45,
  TOOL_SPEED_MULT: 0.4,

  // Combat
  KNOCKBACK_STRENGTH: 7,
  KNOCKBACK_UP: 5,
  ATTACK_COOLDOWN: 0.3,
  DODGE_COOLDOWN: 1.2,
  DODGE_SPEED: 18,
  DODGE_DURATION: 0.15,
  DODGE_INVULN: 0.3,

  // Mobs
  MOB_SPAWN_INTERVAL: 2.5,
  MOB_SPAWN_RADIUS_MIN: 24,
  MOB_SPAWN_RADIUS_MAX: 48,
  MOB_DESPAWN_RADIUS: 64,
  MAX_MOBS: 30,
  MOB_DETECT_RANGE: 16,
  MOB_KNOCKBACK_STUN: 0.25,    // seconds stunned after knockback

  // Pickup
  PICKUP_RANGE: 2.5,
  PICKUP_MAGNET_RANGE: 4.0,
  PICKUP_MAGNET_SPEED: 8,

  // Day/night
  DAY_LENGTH: 180,

  // Lighting
  MAX_LIGHT: 15,
  SUNLIGHT_LEVEL: 15,

  // Save
  AUTOSAVE_INTERVAL: 60,
  SAVE_KEY: "terraria_save",
} as const;
