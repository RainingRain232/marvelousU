// ---------------------------------------------------------------------------
// Camelot Craft – Balance & tuning constants
// ---------------------------------------------------------------------------

export const CB = {
  // --- Chunk / world ---
  CHUNK_SIZE: 16,
  CHUNK_HEIGHT: 64,
  RENDER_DISTANCE: 6, // chunks in each direction
  SEA_LEVEL: 20,
  WORLD_BOTTOM: 0,

  // --- Terrain generation ---
  TERRAIN_SCALE: 0.012,
  TERRAIN_OCTAVES: 4,
  TERRAIN_PERSISTENCE: 0.45,
  TERRAIN_LACUNARITY: 2.0,
  CAVE_SCALE: 0.05,
  CAVE_THRESHOLD: 0.10,
  ORE_RARITY_IRON: 0.02,
  ORE_RARITY_GOLD: 0.005,
  ORE_RARITY_CRYSTAL: 0.003,
  ORE_RARITY_DRAGON_BONE: 0.001,
  TREE_DENSITY: 0.015,
  BIOME_SCALE: 0.004,

  // --- Player ---
  PLAYER_SPEED: 5.0,
  PLAYER_SPRINT_MULT: 1.6,
  PLAYER_JUMP_VELOCITY: 8.0,
  PLAYER_GRAVITY: -22.0,
  PLAYER_HEIGHT: 1.75,
  PLAYER_EYE_HEIGHT: 1.62,
  PLAYER_REACH: 5.0,
  PLAYER_MAX_HP: 20,
  PLAYER_MAX_HUNGER: 20,
  PLAYER_ATTACK_DAMAGE: 1,
  PLAYER_ATTACK_COOLDOWN: 0.4,

  // --- Inventory ---
  HOTBAR_SLOTS: 9,
  INVENTORY_ROWS: 3,
  INVENTORY_COLS: 9,
  CRAFT_GRID_SIZE: 3,
  MAX_STACK_SIZE: 64,

  // --- Block mining ---
  MINE_BASE_TIME: 1.0, // seconds for bare-hand mining of stone
  MINE_TOOL_MULT: 0.25, // multiplier when using correct tool
  MINE_EXCALIBUR_MULT: 0.1, // Excalibur instant-mines almost everything

  // --- Day / night ---
  DAY_LENGTH: 600, // seconds for a full day cycle
  DAWN_START: 0.2,
  DAWN_END: 0.3,
  DUSK_START: 0.7,
  DUSK_END: 0.8,
  NIGHT_MOB_SPAWN_RATE: 0.02,
  SAXON_RAID_INTERVAL: 900, // seconds between Saxon raids

  // --- Mobs ---
  MOB_SPAWN_RADIUS_MIN: 24,
  MOB_SPAWN_RADIUS_MAX: 48,
  MOB_DESPAWN_RADIUS: 64,
  MOB_MAX_COUNT: 40,
  MOB_PATHFIND_RANGE: 32,

  // --- Combat ---
  KNOCKBACK_FORCE: 4.0,
  INVULNERABILITY_TIME: 0.5,

  // --- Quests ---
  CAMELOT_MIN_ROOMS: 5,
  ROUND_TABLE_KNIGHTS_NEEDED: 12,
  GRAIL_DUNGEON_DEPTH: 25,

  // --- Audio ---
  MUSIC_VOLUME: 0.3,
  SFX_VOLUME: 0.6,
  AMBIENT_VOLUME: 0.4,

  // --- Block size (world units) ---
  BLOCK_SIZE: 1.0,
} as const;

export type CraftBalanceKey = keyof typeof CB;
