// ---------------------------------------------------------------------------
// Grail Quest — Roguelike dungeon crawler types
// ---------------------------------------------------------------------------

export enum GrailPhase {
  START = "start",
  PLAYING = "playing",
  INVENTORY = "inventory",
  LEVEL_UP = "level_up",
  DEAD = "dead",
  VICTORY = "victory",
  PAUSED = "paused",
}

export enum TileType {
  FLOOR = 0, WALL = 1, DOOR = 2, LOCKED_DOOR = 3,
  STAIRS_DOWN = 4, CHEST = 5, SHRINE = 6,
  TRAP_SPIKE = 7, TRAP_PIT = 8, TRAP_POISON = 9,
}

export enum EntityType {
  RAT = "rat", SKELETON = "skeleton", GOBLIN_ARCHER = "goblin_archer",
  DARK_KNIGHT = "dark_knight", WRAITH = "wraith",
  ENCHANTED_ARMOR = "enchanted_armor", BOSS = "boss",
}

export enum ItemKind {
  HEALING_POTION = "healing_potion", FIREBALL_SCROLL = "fireball_scroll",
  REVEAL_SCROLL = "reveal_scroll", SHIELD_CHARM = "shield_charm",
  SPEED_POTION = "speed_potion", TELEPORT_SCROLL = "teleport_scroll",
  KEY = "key", TORCH = "torch",
}

export enum RoomType {
  PLAIN = "plain",
  TREASURE = "treasure",
  LIBRARY = "library",
  ARMORY = "armory",
  TRAP = "trap",
  ALTAR = "altar",
}

export enum WeaponId {
  RUSTY_SWORD = "rusty_sword", KNIGHTS_BLADE = "knights_blade",
  EXCALIBUR_SHARD = "excalibur_shard", MORGUL_MACE = "morgul_mace",
  HOLY_LANCE = "holy_lance",
}

export enum ArmorId {
  LEATHER = "leather", CHAINMAIL = "chainmail",
  PLATE_ARMOR = "plate_armor", ENCHANTED_ROBES = "enchanted_robes",
}

export enum RelicId {
  NONE = "none", GRAIL_COMPASS = "grail_compass", PHOENIX_FEATHER = "phoenix_feather",
  RING_OF_SHADOWS = "ring_of_shadows", GAUNTLET_OF_MIGHT = "gauntlet_of_might",
  CHALICE_OF_VIGOR = "chalice_of_vigor",
}

export interface Entity {
  id: string;
  type: EntityType;
  x: number; y: number;
  hp: number; maxHp: number;
  attack: number; defense: number;
  alive: boolean;
  stunTimer: number; // turns stunned
  poisonTimer: number;
  // AI state
  alerted: boolean; // has spotted player
  lastKnownPlayerX: number; lastKnownPlayerY: number;
  // Goblin archer
  fireDirection: { dx: number; dy: number } | null;
  // Wraith
  phasing: boolean;
  // Boss phase tracking
  bossPhase: number; // 1, 2, or 3
  bossSummonCooldown: number; // turns until next summon
}

export interface ItemStack {
  kind: ItemKind;
  count: number;
}

export interface Weapon {
  id: WeaponId;
  name: string;
  damage: number;
  range: number; // 1 = melee, 2 = lance
  effect: string; // "" or "heal_on_kill" or "stun"
}

export interface Armor {
  id: ArmorId;
  name: string;
  defense: number;
  perceptionMod: number;
}

export interface Relic {
  id: RelicId;
  name: string;
  desc: string;
}

export interface Room {
  x: number; y: number; w: number; h: number;
  roomType: RoomType;
}

export interface Projectile {
  x: number; y: number;
  dx: number; dy: number;
  damage: number;
  ownerId: string;
  alive: boolean;
}

export interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  color: number; size: number;
}

export interface FloatingText {
  x: number; y: number;
  text: string; color: number;
  timer: number; maxTimer: number;
}

export interface DungeonFloor {
  tiles: TileType[][];
  rooms: Room[];
  cols: number; rows: number;
  stairsX: number; stairsY: number;
  spawnX: number; spawnY: number;
}

export interface GrailState {
  phase: GrailPhase;
  floor: number; // 1-10
  dungeon: DungeonFloor;
  visible: boolean[][];
  explored: boolean[][];

  // Player
  playerX: number; playerY: number;
  playerHp: number; playerMaxHp: number;
  playerAttack: number; playerDefense: number;
  playerPerception: number;
  playerXp: number; playerLevel: number;
  playerXpToNext: number;
  weapon: Weapon;
  armor: Armor;
  relic: Relic;
  inventory: (ItemStack | null)[]; // 4-6 slots
  keys: number;
  gold: number;
  shieldCharges: number;
  speedTurns: number; // speed potion remaining turns
  phoenixUsed: boolean;

  // Entities
  entities: Entity[];
  projectiles: Projectile[];
  entityIdCounter: number;

  // Visual state
  particles: Particle[];
  floatTexts: FloatingText[];
  screenShake: number;
  screenFlash: number;
  turnAnimating: boolean; // true while turn animation plays
  animTimer: number;
  lastMoveDir: { dx: number; dy: number };

  // Level up choices
  levelUpChoices: string[];

  // Stats for end screen
  enemiesKilled: number;
  floorsCleared: number;
  itemsUsed: number;
  damageDealt: number;
  damageTaken: number;
  chestsOpened: number;
  trapsTriggered: number;

  // Turn counter
  turnCount: number;

  // Torch mechanic
  torchTurns: number;

  // Auto-explore
  autoExploring: boolean;

  // Messages log (last 5)
  messages: { text: string; color: number }[];
}

export interface GrailUpgrades {
  sturdierStart: number; // 0-3, +2 max HP per level
  sharperBlade: number; // 0-2, +1 starting attack
  trapSense: number; // 0-3, +1 perception per level
  luckyFind: number; // 0-2, +10% better items
  deepPockets: number; // 0-2, +1 inventory slot
  squireBlessing: number; // 0-1, start with potion
}

export interface GrailMeta {
  highScore: number; // deepest floor
  totalRuns: number;
  totalKills: number;
  totalFloors: number;
  grailsFound: number; // times reached floor 10
  shards: number;
  upgrades: GrailUpgrades;
}
