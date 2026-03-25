// ---------------------------------------------------------------------------
// Grail Quest — Balance constants
// ---------------------------------------------------------------------------

import { EntityType, WeaponId, ArmorId, RelicId, ItemKind } from "../types";

export const GRAIL_BALANCE = {
  // Grid
  COLS: 40, ROWS: 28, CELL_SIZE: 20,

  // Player base stats
  PLAYER_BASE_HP: 10,
  PLAYER_BASE_ATTACK: 1,
  PLAYER_BASE_DEFENSE: 0,
  PLAYER_BASE_PERCEPTION: 5,

  // XP curve: XP needed = XP_PER_LEVEL * currentLevel
  XP_PER_LEVEL: 15,
  MAX_LEVEL: 20,

  // Level up stat gains (player picks one of three)
  LEVEL_UP_HP_GAIN: 3,
  LEVEL_UP_ATTACK_GAIN: 1,
  LEVEL_UP_DEFENSE_GAIN: 1,
  LEVEL_UP_PERCEPTION_GAIN: 2,

  // FOV
  FOV_RADIUS_BASE: 6,

  // Dungeon generation
  ROOM_MIN_SIZE: 4, ROOM_MAX_SIZE: 9,
  ROOMS_MIN: 6, ROOMS_MAX: 12,
  CORRIDOR_WIDTH: 1,
  DOOR_CHANCE: 0.3,
  LOCKED_DOOR_CHANCE: 0.15,

  // Total dungeon floors
  MAX_FLOORS: 10,

  // Inventory
  BASE_INVENTORY_SLOTS: 4,

  // Combat
  HIT_CHANCE_BASE: 0.85,
  STUN_DURATION: 2, // turns

  // Traps
  TRAP_SPIKE_DAMAGE: 3,
  TRAP_PIT_DAMAGE: 5,
  TRAP_POISON_DURATION: 4, // turns
  TRAP_POISON_DAMAGE_PER_TURN: 1,

  // Shield charm
  SHIELD_CHARGES: 3,

  // Speed potion
  SPEED_POTION_TURNS: 5, // extra move per turn

  // Healing
  HEALING_POTION_AMOUNT: 6,

  // Fireball
  FIREBALL_RADIUS: 2,
  FIREBALL_DAMAGE: 8,

  // Reveal scroll
  REVEAL_RADIUS: 12,

  // Teleport scroll
  TELEPORT_SAFE_RADIUS: 3, // min distance from enemies

  // Shrine
  SHRINE_HEAL: 4,
  SHRINE_XP: 10,

  // Chest
  CHEST_GOLD_MIN: 5, CHEST_GOLD_MAX: 20,
  CHEST_ITEM_CHANCE: 0.6,
  CHEST_WEAPON_CHANCE: 0.15,
  CHEST_ARMOR_CHANCE: 0.1,
  CHEST_RELIC_CHANCE: 0.05,

  // Gold from enemies
  GOLD_DROP_CHANCE: 0.3,
  GOLD_DROP_MIN: 1, GOLD_DROP_MAX: 5,

  // Shard calculation: base + floor bonus + kill bonus
  SHARDS_BASE_PER_RUN: 5,
  SHARDS_PER_FLOOR: 3,
  SHARDS_PER_10_KILLS: 2,
  SHARDS_GRAIL_BONUS: 50, // bonus for reaching floor 10

  // Phoenix feather: revive with this fraction of max HP
  PHOENIX_REVIVE_FRACTION: 0.5,

  // Relic: Gauntlet of Might
  GAUNTLET_ATTACK_BONUS: 2,

  // Relic: Chalice of Vigor
  CHALICE_REGEN_TURNS: 10, // heal 1 HP every N turns

  // Relic: Ring of Shadows
  SHADOW_FOV_BONUS: 2,
  SHADOW_ALERT_DELAY: 2, // extra turns before enemies alert

  // Relic: Grail Compass
  COMPASS_STAIRS_HINT_RADIUS: 99, // always shows stairs direction

  // Upgrade costs (shards)
  UPGRADE_COSTS: {
    sturdierStart: [20, 50, 100],
    sharperBlade: [40, 100],
    trapSense: [15, 35, 70],
    luckyFind: [30, 80],
    deepPockets: [50, 120],
    squireBlessing: [60],
  } as Record<string, number[]>,

  // Upgrade effects
  UPGRADE_HP_PER_LEVEL: 2,         // sturdierStart
  UPGRADE_ATTACK_PER_LEVEL: 1,     // sharperBlade
  UPGRADE_PERCEPTION_PER_LEVEL: 1, // trapSense
  UPGRADE_LUCK_PER_LEVEL: 0.10,    // luckyFind (10% per tier)
  UPGRADE_SLOTS_PER_LEVEL: 1,      // deepPockets

  // Grade thresholds (based on deepest floor reached)
  GRADE_THRESHOLDS: [
    { min: 10, grade: "S", color: 0xffd700 },
    { min: 8,  grade: "A", color: 0x44ff44 },
    { min: 6,  grade: "B", color: 0x4488ff },
    { min: 4,  grade: "C", color: 0xcccccc },
    { min: 2,  grade: "D", color: 0xaa8866 },
  ],

  // Spawn weights per floor
  ENEMIES_PER_ROOM_MIN: 1,
  ENEMIES_PER_ROOM_MAX: 4,
  ENEMIES_PER_ROOM_FLOOR_SCALE: 0.3, // +0.3 max enemies per floor
  ITEM_PER_ROOM_CHANCE: 0.25,
  TRAP_PER_ROOM_CHANCE: 0.15,
  TRAP_FLOOR_SCALE: 0.03, // +3% trap chance per floor

  // Torch mechanic
  TORCH_DURATION: 100,
  TORCH_MIN_FOV: 2,

  // Critical hits
  CRIT_CHANCE: 0.1,
  CRIT_MULTIPLIER: 2.0,

  // Enemy drops
  ENEMY_DROP_CHANCE: 0.35,
  ENEMY_KEY_DROP_CHANCE: 0.08,
  ENEMY_POTION_DROP_CHANCE: 0.15,
  ENEMY_GOLD_DROP_CHANCE: 0.30,
  ENEMY_GOLD_DROP_MIN: 2, ENEMY_GOLD_DROP_MAX: 8,

  // Boss phases
  BOSS_PHASE2_HP_THRESHOLD: 0.66,
  BOSS_PHASE3_HP_THRESHOLD: 0.33,
  BOSS_PHASE2_SUMMON_INTERVAL: 4,
  BOSS_PHASE3_DAMAGE_MULTIPLIER: 2,

  // Dark Knight charge
  DARK_KNIGHT_CHARGE_DISTANCE: 2,
  DARK_KNIGHT_CHARGE_CHANCE: 0.3,

  // Skeleton flanking
  SKELETON_FLANK_CHANCE: 0.6,

  // Goblin Archer flee distance
  GOBLIN_FLEE_DISTANCE: 2,

  // Room type chances
  ROOM_TYPE_TREASURE_CHANCE: 0.10,
  ROOM_TYPE_LIBRARY_CHANCE: 0.10,
  ROOM_TYPE_ARMORY_CHANCE: 0.10,
  ROOM_TYPE_TRAP_CHANCE: 0.10,
  ROOM_TYPE_ALTAR_CHANCE: 0.08,

  // Interfloor scaling
  ENEMY_HP_SCALE_PER_FLOOR: 0.15,
  ENEMY_ATTACK_SCALE_PER_FLOOR: 0.15,

  // Visual
  SHAKE_DURATION: 0.25, SHAKE_INTENSITY: 4,
  FLASH_DURATION: 0.15,
  FLOAT_TEXT_DURATION: 1.0,
  PARTICLE_COUNT_HIT: 8,
  PARTICLE_COUNT_KILL: 16,
  PARTICLE_COUNT_CHEST: 12,
  PARTICLE_COUNT_LEVEL_UP: 24,
  PARTICLE_COUNT_FIREBALL: 20,
  PARTICLE_COUNT_HEAL: 10,
  PARTICLE_LIFETIME: 0.6,
  TURN_ANIM_DURATION: 0.12,

  // Message log
  MAX_MESSAGES: 5,

  // Colors
  COLOR_BG: 0x0d0d1a,
  COLOR_FLOOR: 0x1a1a2e,
  COLOR_FLOOR_ALT: 0x1c1c30,
  COLOR_WALL: 0x3a3a5c,
  COLOR_WALL_HIGHLIGHT: 0x4a4a6c,
  COLOR_DOOR: 0x8b6914,
  COLOR_LOCKED_DOOR: 0xaa4422,
  COLOR_STAIRS: 0x44ddff,
  COLOR_CHEST: 0xffd700,
  COLOR_SHRINE: 0xcc88ff,
  COLOR_TRAP_SPIKE: 0x884422,
  COLOR_TRAP_PIT: 0x222222,
  COLOR_TRAP_POISON: 0x44aa44,
  COLOR_PLAYER: 0x44aaff,
  COLOR_PLAYER_HURT: 0xff4444,
  COLOR_HEAL: 0x44ff88,
  COLOR_XP: 0xdddd44,
  COLOR_GOLD: 0xffd700,
  COLOR_DAMAGE: 0xff4444,
  COLOR_ENEMY_DAMAGE: 0xffaa44,
  COLOR_CRIT: 0xff2222,
  COLOR_SHIELD: 0x44aaff,
  COLOR_POISON: 0x66cc44,
  COLOR_STUN: 0xffff44,
  COLOR_MISS: 0x888888,
  COLOR_MESSAGE_DEFAULT: 0xcccccc,
  COLOR_MESSAGE_ALERT: 0xff6644,
  COLOR_MESSAGE_PICKUP: 0x44ff88,
  COLOR_MESSAGE_DANGER: 0xff4444,
  COLOR_LEVEL_UP: 0xffdd44,
  COLOR_FOG: 0x050510,
  COLOR_EXPLORED: 0x0a0a18,
  COLOR_MINIMAP_PLAYER: 0x44aaff,
  COLOR_MINIMAP_ENEMY: 0xff4444,
  COLOR_MINIMAP_STAIRS: 0x44ddff,
  COLOR_MINIMAP_WALL: 0x333355,
  COLOR_SHARD: 0xaa66ff,
  COLOR_RELIC: 0xff88cc,

  // Minimap
  MINIMAP_SIZE: 120, MINIMAP_MARGIN: 8, MINIMAP_CELL: 3,
} as const;

// ---------------------------------------------------------------------------
// Enemy stats table
// ---------------------------------------------------------------------------

export interface EnemyDef {
  hp: number; attack: number; defense: number;
  xpReward: number;
  minFloor: number; maxFloor: number;
  color: number;
  speed: "slow" | "normal" | "fast";
  spawnWeight: number; // relative weight for spawn selection
}

export const ENEMY_TABLE: Record<string, EnemyDef> = {
  [EntityType.RAT]:             { hp: 2,  attack: 1, defense: 0, xpReward: 3,  minFloor: 1, maxFloor: 4,  color: 0x886644, speed: "fast",   spawnWeight: 30 },
  [EntityType.SKELETON]:        { hp: 4,  attack: 2, defense: 1, xpReward: 6,  minFloor: 1, maxFloor: 7,  color: 0xccccaa, speed: "normal", spawnWeight: 25 },
  [EntityType.GOBLIN_ARCHER]:   { hp: 3,  attack: 2, defense: 0, xpReward: 8,  minFloor: 2, maxFloor: 8,  color: 0x66aa44, speed: "normal", spawnWeight: 15 },
  [EntityType.DARK_KNIGHT]:     { hp: 7,  attack: 3, defense: 2, xpReward: 12, minFloor: 4, maxFloor: 10, color: 0x4444aa, speed: "slow",   spawnWeight: 12 },
  [EntityType.WRAITH]:          { hp: 5,  attack: 4, defense: 0, xpReward: 14, minFloor: 5, maxFloor: 10, color: 0x8844cc, speed: "fast",   spawnWeight: 8  },
  [EntityType.ENCHANTED_ARMOR]: { hp: 10, attack: 3, defense: 3, xpReward: 16, minFloor: 6, maxFloor: 10, color: 0xaa8844, speed: "slow",   spawnWeight: 6  },
  [EntityType.BOSS]:            { hp: 20, attack: 5, defense: 3, xpReward: 40, minFloor: 5, maxFloor: 10, color: 0xcc2244, speed: "normal", spawnWeight: 0  },
};

// Enemy stat scaling per floor beyond minFloor — now 15% for both HP and attack
export const ENEMY_HP_SCALE_PER_FLOOR = 0.15; // +15% HP per floor above minFloor
export const ENEMY_ATTACK_SCALE_PER_FLOOR = 0.15; // +15% attack per floor above minFloor

// ---------------------------------------------------------------------------
// Weapon stats table
// ---------------------------------------------------------------------------

export interface WeaponDef {
  id: string; name: string; damage: number; range: number; effect: string; minFloor: number; color: number;
}

export const WEAPON_TABLE: Record<string, WeaponDef> = {
  [WeaponId.RUSTY_SWORD]:      { id: WeaponId.RUSTY_SWORD,      name: "Rusty Sword",      damage: 1, range: 1, effect: "",             minFloor: 1, color: 0x886644 },
  [WeaponId.KNIGHTS_BLADE]:    { id: WeaponId.KNIGHTS_BLADE,     name: "Knight's Blade",   damage: 3, range: 1, effect: "",             minFloor: 2, color: 0xaaaacc },
  [WeaponId.EXCALIBUR_SHARD]:  { id: WeaponId.EXCALIBUR_SHARD,   name: "Excalibur Shard",  damage: 5, range: 1, effect: "heal_on_kill", minFloor: 6, color: 0xffd700 },
  [WeaponId.MORGUL_MACE]:      { id: WeaponId.MORGUL_MACE,       name: "Morgul Mace",      damage: 4, range: 1, effect: "stun",         minFloor: 4, color: 0x8844aa },
  [WeaponId.HOLY_LANCE]:       { id: WeaponId.HOLY_LANCE,        name: "Holy Lance",       damage: 3, range: 2, effect: "",             minFloor: 3, color: 0xddddff },
};

// ---------------------------------------------------------------------------
// Armor stats table
// ---------------------------------------------------------------------------

export interface ArmorDef {
  id: string; name: string; defense: number; perceptionMod: number; minFloor: number; color: number;
}

export const ARMOR_TABLE: Record<string, ArmorDef> = {
  [ArmorId.LEATHER]:         { id: ArmorId.LEATHER,         name: "Leather Armor",    defense: 1, perceptionMod: 0,  minFloor: 1, color: 0x8b6914 },
  [ArmorId.CHAINMAIL]:       { id: ArmorId.CHAINMAIL,       name: "Chainmail",        defense: 2, perceptionMod: -1, minFloor: 3, color: 0xaaaaaa },
  [ArmorId.PLATE_ARMOR]:     { id: ArmorId.PLATE_ARMOR,     name: "Plate Armor",      defense: 4, perceptionMod: -2, minFloor: 5, color: 0xccccdd },
  [ArmorId.ENCHANTED_ROBES]: { id: ArmorId.ENCHANTED_ROBES, name: "Enchanted Robes",  defense: 2, perceptionMod: 3,  minFloor: 4, color: 0x8844cc },
};

// ---------------------------------------------------------------------------
// Relic definitions
// ---------------------------------------------------------------------------

export interface RelicDef {
  id: string; name: string; desc: string; minFloor: number; color: number;
}

export const RELIC_TABLE: Record<string, RelicDef> = {
  [RelicId.GRAIL_COMPASS]:      { id: RelicId.GRAIL_COMPASS,      name: "Grail Compass",      desc: "Always shows the direction to the stairs.",         minFloor: 1, color: 0x44ddff },
  [RelicId.PHOENIX_FEATHER]:    { id: RelicId.PHOENIX_FEATHER,     name: "Phoenix Feather",    desc: "Revive once at 50% HP upon death.",                 minFloor: 3, color: 0xff6622 },
  [RelicId.RING_OF_SHADOWS]:    { id: RelicId.RING_OF_SHADOWS,     name: "Ring of Shadows",    desc: "Increased FOV and enemies take longer to notice you.", minFloor: 2, color: 0x6644aa },
  [RelicId.GAUNTLET_OF_MIGHT]:  { id: RelicId.GAUNTLET_OF_MIGHT,   name: "Gauntlet of Might",  desc: "+2 attack power.",                                  minFloor: 4, color: 0xcc8844 },
  [RelicId.CHALICE_OF_VIGOR]:   { id: RelicId.CHALICE_OF_VIGOR,    name: "Chalice of Vigor",   desc: "Regenerate 1 HP every 10 turns.",                   minFloor: 5, color: 0x44ff88 },
};

// ---------------------------------------------------------------------------
// Item definitions
// ---------------------------------------------------------------------------

export interface ItemDef {
  name: string; desc: string; color: number; spawnWeight: number;
}

export const ITEM_TABLE: Record<string, ItemDef> = {
  [ItemKind.HEALING_POTION]:   { name: "Healing Potion",   desc: "Restores 6 HP.",                      color: 0xff4466, spawnWeight: 30 },
  [ItemKind.FIREBALL_SCROLL]:  { name: "Fireball Scroll",  desc: "Deals 8 damage in radius 2.",         color: 0xff6600, spawnWeight: 10 },
  [ItemKind.REVEAL_SCROLL]:    { name: "Reveal Scroll",    desc: "Reveals map in a large radius.",      color: 0x44ddff, spawnWeight: 12 },
  [ItemKind.SHIELD_CHARM]:     { name: "Shield Charm",     desc: "Absorbs 3 incoming hits.",            color: 0x4488ff, spawnWeight: 8  },
  [ItemKind.SPEED_POTION]:     { name: "Speed Potion",     desc: "Extra move per turn for 5 turns.",    color: 0x44ffaa, spawnWeight: 10 },
  [ItemKind.TELEPORT_SCROLL]:  { name: "Teleport Scroll",  desc: "Teleport to a random safe location.", color: 0xaa44ff, spawnWeight: 8  },
  [ItemKind.KEY]:              { name: "Key",              desc: "Opens one locked door.",               color: 0xffd700, spawnWeight: 15 },
  [ItemKind.TORCH]:            { name: "Torch",            desc: "Resets torch timer, restoring vision.", color: 0xff8822, spawnWeight: 12 },
};

// ---------------------------------------------------------------------------
// Enemy drop tables — items enemies can drop on death
// ---------------------------------------------------------------------------

export interface EnemyDrop {
  item: ItemKind;
  chance: number; // 0-1, probability of this specific drop
}

export const ENEMY_DROP_TABLE: Record<string, EnemyDrop[]> = {
  [EntityType.RAT]:             [{ item: ItemKind.HEALING_POTION, chance: 0.08 }],
  [EntityType.SKELETON]:        [{ item: ItemKind.KEY, chance: 0.10 }, { item: ItemKind.HEALING_POTION, chance: 0.12 }],
  [EntityType.GOBLIN_ARCHER]:   [{ item: ItemKind.SPEED_POTION, chance: 0.10 }, { item: ItemKind.TORCH, chance: 0.15 }],
  [EntityType.DARK_KNIGHT]:     [{ item: ItemKind.SHIELD_CHARM, chance: 0.12 }, { item: ItemKind.KEY, chance: 0.10 }, { item: ItemKind.HEALING_POTION, chance: 0.15 }],
  [EntityType.WRAITH]:          [{ item: ItemKind.TELEPORT_SCROLL, chance: 0.12 }, { item: ItemKind.FIREBALL_SCROLL, chance: 0.10 }],
  [EntityType.ENCHANTED_ARMOR]: [{ item: ItemKind.SHIELD_CHARM, chance: 0.18 }, { item: ItemKind.HEALING_POTION, chance: 0.15 }],
  [EntityType.BOSS]:            [{ item: ItemKind.FIREBALL_SCROLL, chance: 0.50 }, { item: ItemKind.HEALING_POTION, chance: 0.80 }, { item: ItemKind.SHIELD_CHARM, chance: 0.40 }],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getLetterGrade(floor: number): { grade: string; color: number } {
  for (const t of GRAIL_BALANCE.GRADE_THRESHOLDS) { if (floor >= t.min) return t; }
  return { grade: "F", color: 0x886644 };
}
