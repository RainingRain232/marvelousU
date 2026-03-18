// ---------------------------------------------------------------------------
// Rift Wizard balance constants
// ---------------------------------------------------------------------------

export const RWBalance = {
  // Map dimensions (scale with level)
  MAP_MIN_WIDTH: 20,
  MAP_MAX_WIDTH: 30,
  MAP_MIN_HEIGHT: 15,
  MAP_MAX_HEIGHT: 20,

  // Rooms
  ROOM_COUNT_BASE: 4,
  ROOM_COUNT_PER_5_LEVELS: 1,
  ROOM_SIZE_MIN: 4,
  ROOM_SIZE_MAX: 8,
  ROOM_PADDING: 2,
  CORRIDOR_WIDTH: 1,
  MAX_ROOM_ATTEMPTS: 80,

  // Wizard
  WIZARD_BASE_HP: 100,
  WIZARD_HP_PER_LEVEL: 5, // max HP grows slightly each level

  // SP economy
  SP_PER_LEVEL_EARLY: 3, // levels 0-4
  SP_PER_LEVEL_MID: 4, // levels 5-14
  SP_PER_LEVEL_LATE: 5, // levels 15-24
  SP_BONUS_SHRINE: 1,
  SP_BONUS_SPAWNER_KILL: 1,
  SP_BONUS_FLAWLESS_BOSS: 2,

  // Enemy counts (scale with level)
  ENEMY_COUNT_BASE: 3,
  ENEMY_COUNT_SCALE: 0.4, // +0.4 per level
  ENEMY_COUNT_MAX: 14,

  // Boss levels
  BOSS_LEVELS: [4, 9, 14, 19, 24] as readonly number[],
  TOTAL_LEVELS: 25,

  // Spawner config
  SPAWNER_MIN_LEVEL: 7, // spawners appear from level 7+
  SPAWNER_INTERVAL: 3, // spawn every N turns
  SPAWNER_HP: 80,

  // Environmental hazards
  LAVA_DAMAGE: 15, // damage per turn standing on lava
  LAVA_MIN_LEVEL: 5,
  ICE_MIN_LEVEL: 3,
  CHASM_MIN_LEVEL: 10,
  HAZARD_DENSITY: 0.04, // fraction of floor tiles

  // Rift portals
  RIFT_PORTAL_COUNT: 3,

  // Consumables
  HEALTH_POTION_HEAL: 30,
  CHARGE_SCROLL_RESTORE: 3, // restores 3 charges to selected spell
  ITEM_SPAWN_CHANCE: 0.15, // chance per room

  // Animation
  SPELL_ANIM_DURATION: 0.3,
  MELEE_ANIM_DURATION: 0.15,
  DEATH_ANIM_DURATION: 0.25,
  DAMAGE_NUMBER_DURATION: 0.4,

  // Tile size for rendering
  TILE_SIZE: 32,

  // Summon lifespan
  SUMMON_DEFAULT_TURNS: 15,

  // Enemy drop chances
  ENEMY_DROP_CHANCE: 0.1,
  BOSS_DROP_CHANCE: 1.0,
  ELITE_DROP_CHANCE: 0.3,
} as const;

export const DIFFICULTY_MULTIPLIERS = {
  easy: { enemyHp: 0.7, enemyDmg: 0.7, spBonus: 2, wizardHpMult: 1.3 },
  normal: { enemyHp: 1.0, enemyDmg: 1.0, spBonus: 0, wizardHpMult: 1.0 },
  hard: { enemyHp: 1.4, enemyDmg: 1.3, spBonus: 0, wizardHpMult: 0.8 },
} as const;

export type Difficulty = "easy" | "normal" | "hard";

// SP awarded for clearing a level
export function getSPForLevel(levelNum: number, difficulty?: Difficulty): number {
  let sp: number;
  if (levelNum < 5) sp = RWBalance.SP_PER_LEVEL_EARLY;
  else if (levelNum < 15) sp = RWBalance.SP_PER_LEVEL_MID;
  else sp = RWBalance.SP_PER_LEVEL_LATE;

  if (difficulty === "easy") {
    sp += DIFFICULTY_MULTIPLIERS.easy.spBonus;
  }

  return sp;
}

// Enemy count for a level
export function getEnemyCountForLevel(levelNum: number): number {
  const count = Math.floor(
    RWBalance.ENEMY_COUNT_BASE + levelNum * RWBalance.ENEMY_COUNT_SCALE,
  );
  return Math.min(count, RWBalance.ENEMY_COUNT_MAX);
}

// Map dimensions for a level
export function getMapDimensions(levelNum: number): {
  width: number;
  height: number;
} {
  const t = levelNum / (RWBalance.TOTAL_LEVELS - 1);
  const width = Math.floor(
    RWBalance.MAP_MIN_WIDTH +
      t * (RWBalance.MAP_MAX_WIDTH - RWBalance.MAP_MIN_WIDTH),
  );
  const height = Math.floor(
    RWBalance.MAP_MIN_HEIGHT +
      t * (RWBalance.MAP_MAX_HEIGHT - RWBalance.MAP_MIN_HEIGHT),
  );
  return { width, height };
}

// Room count for a level
export function getRoomCount(levelNum: number): number {
  return (
    RWBalance.ROOM_COUNT_BASE +
    Math.floor(levelNum / 5) * RWBalance.ROOM_COUNT_PER_5_LEVELS
  );
}

// Is this a boss level?
export function isBossLevel(levelNum: number): boolean {
  return (RWBalance.BOSS_LEVELS as readonly number[]).includes(levelNum);
}
