// ---------------------------------------------------------------------------
// Terraria – Balance & tuning constants
// ---------------------------------------------------------------------------

export const TB = {
  // World
  WORLD_WIDTH: 400,
  WORLD_HEIGHT: 256,
  CHUNK_W: 16,
  TILE_SIZE: 16,        // pixels per block

  // Depth layers (Y values, Y=0 is bottom)
  SURFACE_Y: 180,
  UNDERGROUND_Y: 120,
  CAVERN_Y: 50,
  UNDERWORLD_Y: 10,
  SEA_LEVEL: 190,       // default surface height center

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
  PLAYER_SPEED: 8,
  PLAYER_SPRINT_MULT: 1.5,
  JUMP_VELOCITY: 12,
  GRAVITY: 35,
  MAX_FALL_SPEED: 30,
  FRICTION: 0.82,
  PLAYER_WIDTH: 0.8,
  PLAYER_HEIGHT: 1.5,

  // Player stats
  PLAYER_MAX_HP: 100,
  PLAYER_MAX_MANA: 50,
  PLAYER_REACH: 5,
  INVULN_TIME: 0.5,

  // Mining
  BASE_MINE_TIME: 1.0,
  TOOL_SPEED_MULT: 0.25,

  // Combat
  KNOCKBACK_STRENGTH: 6,
  KNOCKBACK_UP: 4,
  ATTACK_COOLDOWN: 0.35,

  // Mobs
  MOB_SPAWN_INTERVAL: 2.0,
  MOB_SPAWN_RADIUS_MIN: 24,
  MOB_SPAWN_RADIUS_MAX: 48,
  MOB_DESPAWN_RADIUS: 64,
  MAX_MOBS: 30,
  MOB_DETECT_RANGE: 16,

  // Day/night
  DAY_LENGTH: 180,      // seconds per full cycle

  // Lighting
  MAX_LIGHT: 15,
  SUNLIGHT_LEVEL: 15,

  // Save
  AUTOSAVE_INTERVAL: 60,
  SAVE_KEY: "terraria_save",
} as const;
