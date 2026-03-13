// ============================================================
// DiabloTypes.ts — Complete type definitions for a Diablo 3-style ARPG
// ============================================================

// ── Enums ────────────────────────────────────────────────────

export enum DiabloClass {
  WARRIOR = 'WARRIOR',
  MAGE = 'MAGE',
  RANGER = 'RANGER',
}

export enum DiabloMapId {
  FOREST = 'FOREST',
  ELVEN_VILLAGE = 'ELVEN_VILLAGE',
  NECROPOLIS_DUNGEON = 'NECROPOLIS_DUNGEON',
  VOLCANIC_WASTES = 'VOLCANIC_WASTES',
  ABYSSAL_RIFT = 'ABYSSAL_RIFT',
  DRAGONS_SANCTUM = 'DRAGONS_SANCTUM',
  CAMELOT = 'CAMELOT',
}

export enum DiabloDifficulty {
  DAGGER = 'DAGGER',
  CLEAVER = 'CLEAVER',
  LONGSWORD = 'LONGSWORD',
  BASTARD_SWORD = 'BASTARD_SWORD',
  CLAYMORE = 'CLAYMORE',
  FLAMBERGE = 'FLAMBERGE',
}

export enum DiabloPhase {
  CLASS_SELECT = 'CLASS_SELECT',
  MAP_SELECT = 'MAP_SELECT',
  INVENTORY = 'INVENTORY',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY',
}

export enum TimeOfDay {
  DAY = "day",
  DAWN = "dawn",
  DUSK = "dusk",
  NIGHT = "night",
}

export enum ItemRarity {
  COMMON = 'COMMON',           // white
  UNCOMMON = 'UNCOMMON',       // green
  RARE = 'RARE',               // blue
  EPIC = 'EPIC',               // purple
  LEGENDARY = 'LEGENDARY',     // orange
  MYTHIC = 'MYTHIC',           // red
  DIVINE = 'DIVINE',           // gold
}

export enum ItemSlot {
  HELMET = 'HELMET',
  BODY = 'BODY',
  GAUNTLETS = 'GAUNTLETS',
  LEGS = 'LEGS',
  FEET = 'FEET',
  ACCESSORY_1 = 'ACCESSORY_1',
  ACCESSORY_2 = 'ACCESSORY_2',
  WEAPON = 'WEAPON',
}

export enum ItemType {
  SWORD = 'SWORD',
  AXE = 'AXE',
  MACE = 'MACE',
  BOW = 'BOW',
  STAFF = 'STAFF',
  WAND = 'WAND',
  DAGGER = 'DAGGER',
  SHIELD = 'SHIELD',
  HELMET = 'HELMET',
  CHEST_ARMOR = 'CHEST_ARMOR',
  GAUNTLETS = 'GAUNTLETS',
  LEG_ARMOR = 'LEG_ARMOR',
  BOOTS = 'BOOTS',
  RING = 'RING',
  AMULET = 'AMULET',
  NECKLACE = 'NECKLACE',
}

export enum EnemyType {
  // Forest enemies
  WOLF = 'WOLF',
  BANDIT = 'BANDIT',
  BEAR = 'BEAR',
  FOREST_SPIDER = 'FOREST_SPIDER',
  TREANT = 'TREANT',
  // Elven Village enemies
  CORRUPTED_ELF = 'CORRUPTED_ELF',
  DARK_RANGER = 'DARK_RANGER',
  SHADOW_BEAST = 'SHADOW_BEAST',
  // Necropolis Dungeon enemies
  SKELETON_WARRIOR = 'SKELETON_WARRIOR',
  ZOMBIE = 'ZOMBIE',
  NECROMANCER = 'NECROMANCER',
  BONE_GOLEM = 'BONE_GOLEM',
  WRAITH = 'WRAITH',
  // Volcanic Wastes enemies
  FIRE_IMP = 'FIRE_IMP',
  LAVA_ELEMENTAL = 'LAVA_ELEMENTAL',
  INFERNAL_KNIGHT = 'INFERNAL_KNIGHT',
  MAGMA_SERPENT = 'MAGMA_SERPENT',
  MOLTEN_COLOSSUS = 'MOLTEN_COLOSSUS',
  // Abyssal Rift enemies
  VOID_STALKER = 'VOID_STALKER',
  SHADOW_WEAVER = 'SHADOW_WEAVER',
  ABYSSAL_HORROR = 'ABYSSAL_HORROR',
  RIFT_WALKER = 'RIFT_WALKER',
  ENTROPY_LORD = 'ENTROPY_LORD',
  // Dragon's Sanctum enemies
  DRAGONKIN_WARRIOR = 'DRAGONKIN_WARRIOR',
  WYRM_PRIEST = 'WYRM_PRIEST',
  DRAKE_GUARDIAN = 'DRAKE_GUARDIAN',
  DRAGON_WHELP = 'DRAGON_WHELP',
  ELDER_DRAGON = 'ELDER_DRAGON',
  // Special
  TREASURE_MIMIC = 'TREASURE_MIMIC',
  // Night bosses (unique per map)
  NIGHT_FOREST_WENDIGO = 'NIGHT_FOREST_WENDIGO',
  NIGHT_ELVEN_BANSHEE_QUEEN = 'NIGHT_ELVEN_BANSHEE_QUEEN',
  NIGHT_NECRO_DEATH_KNIGHT = 'NIGHT_NECRO_DEATH_KNIGHT',
  NIGHT_VOLCANIC_INFERNO_TITAN = 'NIGHT_VOLCANIC_INFERNO_TITAN',
  NIGHT_RIFT_VOID_EMPEROR = 'NIGHT_RIFT_VOID_EMPEROR',
  NIGHT_DRAGON_SHADOW_WYRM = 'NIGHT_DRAGON_SHADOW_WYRM',
}

export enum SkillId {
  // Warrior skills
  CLEAVE = 'CLEAVE',
  SHIELD_BASH = 'SHIELD_BASH',
  WHIRLWIND = 'WHIRLWIND',
  BATTLE_CRY = 'BATTLE_CRY',
  GROUND_SLAM = 'GROUND_SLAM',
  BLADE_FURY = 'BLADE_FURY',
  // Mage skills
  FIREBALL = 'FIREBALL',
  ICE_NOVA = 'ICE_NOVA',
  LIGHTNING_BOLT = 'LIGHTNING_BOLT',
  METEOR = 'METEOR',
  ARCANE_SHIELD = 'ARCANE_SHIELD',
  CHAIN_LIGHTNING = 'CHAIN_LIGHTNING',
  // Ranger skills
  MULTI_SHOT = 'MULTI_SHOT',
  RAIN_OF_ARROWS = 'RAIN_OF_ARROWS',
  POISON_ARROW = 'POISON_ARROW',
  EVASIVE_ROLL = 'EVASIVE_ROLL',
  EXPLOSIVE_TRAP = 'EXPLOSIVE_TRAP',
  PIERCING_SHOT = 'PIERCING_SHOT',
}

export enum DamageType {
  PHYSICAL = 'PHYSICAL',
  FIRE = 'FIRE',
  ICE = 'ICE',
  LIGHTNING = 'LIGHTNING',
  POISON = 'POISON',
  ARCANE = 'ARCANE',
  SHADOW = 'SHADOW',
  HOLY = 'HOLY',
}

export enum EnemyState {
  IDLE = 'IDLE',
  PATROL = 'PATROL',
  CHASE = 'CHASE',
  ATTACK = 'ATTACK',
  HURT = 'HURT',
  DYING = 'DYING',
  DEAD = 'DEAD',
}

export enum VendorType {
  BLACKSMITH = 'BLACKSMITH',
  ARCANIST = 'ARCANIST',
  ALCHEMIST = 'ALCHEMIST',
  JEWELER = 'JEWELER',
  GENERAL_MERCHANT = 'GENERAL_MERCHANT',
}

export enum StatusEffect {
  BURNING = 'BURNING',
  FROZEN = 'FROZEN',
  SHOCKED = 'SHOCKED',
  POISONED = 'POISONED',
  SLOWED = 'SLOWED',
  STUNNED = 'STUNNED',
  BLEEDING = 'BLEEDING',
  WEAKENED = 'WEAKENED',
}

// ── Interfaces ───────────────────────────────────────────────

export interface DiabloVec3 {
  x: number;
  y: number;
  z: number;
}

export interface DiabloSkillDef {
  id: SkillId;
  name: string;
  description: string;
  icon: string;
  cooldown: number;
  manaCost: number;
  damageType: DamageType;
  damageMultiplier: number;
  range: number;
  aoeRadius?: number;
  duration?: number;
  statusEffect?: StatusEffect;
  class: DiabloClass;
}

export interface DiabloItemStats {
  strength?: number;
  dexterity?: number;
  intelligence?: number;
  vitality?: number;
  armor?: number;
  critChance?: number;
  critDamage?: number;
  attackSpeed?: number;
  moveSpeed?: number;
  fireResist?: number;
  iceResist?: number;
  lightningResist?: number;
  poisonResist?: number;
  lifeSteal?: number;
  manaRegen?: number;
  bonusDamage?: number;
  bonusHealth?: number;
  bonusMana?: number;
}

export interface DiabloItem {
  id: string;
  name: string;
  type: ItemType;
  slot: ItemSlot;
  rarity: ItemRarity;
  level: number;
  stats: DiabloItemStats;
  description: string;
  setName?: string;
  legendaryAbility?: string;
  icon: string;
  value: number;
}

export interface DiabloSetBonus {
  setName: string;
  pieces: number;
  bonusDescription: string;
  bonusStats: DiabloItemStats;
}

export interface DiabloEquipment {
  helmet: DiabloItem | null;
  body: DiabloItem | null;
  gauntlets: DiabloItem | null;
  legs: DiabloItem | null;
  feet: DiabloItem | null;
  accessory1: DiabloItem | null;
  accessory2: DiabloItem | null;
  weapon: DiabloItem | null;
}

export interface DiabloInventorySlot {
  item: DiabloItem | null;
}

export interface DiabloPlayerState {
  x: number;
  y: number;
  z: number;
  angle: number;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  class: DiabloClass;
  level: number;
  xp: number;
  xpToNext: number;
  gold: number;
  equipment: DiabloEquipment;
  inventory: DiabloInventorySlot[];
  skills: SkillId[];
  skillCooldowns: Map<SkillId, number>;
  statusEffects: { effect: StatusEffect; duration: number; source: string }[];
  strength: number;
  dexterity: number;
  intelligence: number;
  vitality: number;
  armor: number;
  moveSpeed: number;
  attackSpeed: number;
  critChance: number;
  critDamage: number;
  isAttacking: boolean;
  isBlocking: boolean;
  attackTimer: number;
  blockTimer: number;
  invulnTimer: number;
  activeSkillAnimTimer: number;
  activeSkillId: SkillId | null;
}

export interface DiabloEnemy {
  id: string;
  type: EnemyType;
  x: number;
  y: number;
  z: number;
  angle: number;
  hp: number;
  maxHp: number;
  damage: number;
  armor: number;
  speed: number;
  state: EnemyState;
  targetId: string | null;
  attackTimer: number;
  attackRange: number;
  aggroRange: number;
  xpReward: number;
  lootTable: { itemId: string; chance: number }[];
  deathTimer: number;
  stateTimer: number;
  patrolTarget: DiabloVec3 | null;
  statusEffects: { effect: StatusEffect; duration: number; source: string }[];
  isBoss: boolean;
  bossName?: string;
  scale: number;
  level: number;
}

export interface DiabloProjectile {
  id: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  speed: number;
  damage: number;
  damageType: DamageType;
  radius: number;
  ownerId: string;
  isPlayerOwned: boolean;
  lifetime: number;
  maxLifetime: number;
  skillId?: SkillId;
}

export interface DiabloLoot {
  id: string;
  item: DiabloItem;
  x: number;
  y: number;
  z: number;
  timer: number;
}

export interface DiabloTreasureChest {
  id: string;
  x: number;
  y: number;
  z: number;
  opened: boolean;
  rarity: ItemRarity;
  items: DiabloItem[];
}

export interface DiabloVendor {
  id: string;
  type: VendorType;
  name: string;
  x: number;
  z: number;
  inventory: DiabloItem[];
  icon: string;
}

export interface DiabloAOE {
  id: string;
  x: number;
  y: number;
  z: number;
  radius: number;
  damage: number;
  damageType: DamageType;
  duration: number;
  timer: number;
  ownerId: string;
  tickInterval: number;
  lastTickTimer: number;
  statusEffect?: StatusEffect;
}

export interface DiabloFloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  z: number;
  color: string;
  timer: number;
  vy: number;
}

export interface DiabloParticle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface DiabloMapConfig {
  id: DiabloMapId;
  name: string;
  description: string;
  width: number;
  depth: number;
  enemyTypes: EnemyType[];
  maxEnemies: number;
  spawnInterval: number;
  treasureCount: number;
  ambientColor: string;
  fogColor: string;
  fogDensity: number;
  groundColor: string;
  backgroundMusic?: string;
}

export interface DiabloState {
  phase: DiabloPhase;
  player: DiabloPlayerState;
  enemies: DiabloEnemy[];
  projectiles: DiabloProjectile[];
  loot: DiabloLoot[];
  treasureChests: DiabloTreasureChest[];
  aoeEffects: DiabloAOE[];
  floatingTexts: DiabloFloatingText[];
  particles: DiabloParticle[];
  vendors: DiabloVendor[];
  currentMap: DiabloMapId;
  camera: {
    x: number;
    y: number;
    z: number;
    targetX: number;
    targetY: number;
    targetZ: number;
    angle: number;
    pitch: number;
    distance: number;
  };
  time: number;
  killCount: number;
  totalEnemiesSpawned: number;
  spawnTimer: number;
  selectedInventorySlot: number;
  hoveredInventorySlot: number;
  persistentInventory: DiabloInventorySlot[];
  persistentGold: number;
  persistentLevel: number;
  persistentXp: number;
  timeOfDay: TimeOfDay;
  persistentStash: DiabloInventorySlot[];
  mapCleared: boolean[];
  difficulty: DiabloDifficulty;
}

// ── Rarity color map (for UI rendering) ──────────────────────

export const RARITY_COLORS: Record<ItemRarity, string> = {
  [ItemRarity.COMMON]: '#ffffff',
  [ItemRarity.UNCOMMON]: '#00ff00',
  [ItemRarity.RARE]: '#4488ff',
  [ItemRarity.EPIC]: '#aa44ff',
  [ItemRarity.LEGENDARY]: '#ff8800',
  [ItemRarity.MYTHIC]: '#ff2222',
  [ItemRarity.DIVINE]: '#ffd700',
};

// ── Factory functions ────────────────────────────────────────

function createEmptyEquipment(): DiabloEquipment {
  return {
    helmet: null,
    body: null,
    gauntlets: null,
    legs: null,
    feet: null,
    accessory1: null,
    accessory2: null,
    weapon: null,
  };
}

function createEmptyInventory(size: number): DiabloInventorySlot[] {
  return Array.from({ length: size }, () => ({ item: null }));
}

export function createDefaultPlayer(cls: DiabloClass): DiabloPlayerState {
  // Base stats that vary by class
  let strength = 10;
  let dexterity = 10;
  let intelligence = 10;
  let vitality = 10;
  let maxHp = 100;
  let maxMana = 50;
  let armor = 0;
  let moveSpeed = 5;
  let attackSpeed = 1.0;
  let critChance = 0.05;
  let critDamage = 1.5;
  let skills: SkillId[] = [];

  switch (cls) {
    case DiabloClass.WARRIOR:
      strength = 25;
      dexterity = 8;
      intelligence = 5;
      vitality = 22;
      maxHp = 200;
      maxMana = 60;
      armor = 15;
      moveSpeed = 4.5;
      attackSpeed = 0.9;
      critChance = 0.08;
      critDamage = 1.6;
      skills = [
        SkillId.CLEAVE,
        SkillId.SHIELD_BASH,
        SkillId.WHIRLWIND,
        SkillId.BATTLE_CRY,
        SkillId.GROUND_SLAM,
        SkillId.BLADE_FURY,
      ];
      break;

    case DiabloClass.MAGE:
      strength = 5;
      dexterity = 8;
      intelligence = 28;
      vitality = 14;
      maxHp = 120;
      maxMana = 200;
      armor = 5;
      moveSpeed = 4.8;
      attackSpeed = 0.8;
      critChance = 0.06;
      critDamage = 1.8;
      skills = [
        SkillId.FIREBALL,
        SkillId.ICE_NOVA,
        SkillId.LIGHTNING_BOLT,
        SkillId.METEOR,
        SkillId.ARCANE_SHIELD,
        SkillId.CHAIN_LIGHTNING,
      ];
      break;

    case DiabloClass.RANGER:
      strength = 8;
      dexterity = 26;
      intelligence = 7;
      vitality = 16;
      maxHp = 150;
      maxMana = 100;
      armor = 8;
      moveSpeed = 5.5;
      attackSpeed = 1.3;
      critChance = 0.12;
      critDamage = 1.7;
      skills = [
        SkillId.MULTI_SHOT,
        SkillId.RAIN_OF_ARROWS,
        SkillId.POISON_ARROW,
        SkillId.EVASIVE_ROLL,
        SkillId.EXPLOSIVE_TRAP,
        SkillId.PIERCING_SHOT,
      ];
      break;
  }

  return {
    x: 0,
    y: 0,
    z: 0,
    angle: 0,
    hp: maxHp,
    maxHp,
    mana: maxMana,
    maxMana,
    class: cls,
    level: 1,
    xp: 0,
    xpToNext: 100,
    gold: 0,
    equipment: createEmptyEquipment(),
    inventory: createEmptyInventory(40),
    skills,
    skillCooldowns: new Map<SkillId, number>(),
    statusEffects: [],
    strength,
    dexterity,
    intelligence,
    vitality,
    armor,
    moveSpeed,
    attackSpeed,
    critChance,
    critDamage,
    isAttacking: false,
    isBlocking: false,
    attackTimer: 0,
    blockTimer: 0,
    invulnTimer: 0,
    activeSkillAnimTimer: 0,
    activeSkillId: null,
  };
}

export function createDefaultState(): DiabloState {
  return {
    phase: DiabloPhase.CLASS_SELECT,
    player: createDefaultPlayer(DiabloClass.WARRIOR),
    enemies: [],
    projectiles: [],
    loot: [],
    treasureChests: [],
    aoeEffects: [],
    floatingTexts: [],
    particles: [],
    vendors: [],
    currentMap: DiabloMapId.FOREST,
    camera: {
      x: 0,
      y: 20,
      z: 15,
      targetX: 0,
      targetY: 0,
      targetZ: 0,
      angle: 0,
      pitch: -0.8,
      distance: 25,
    },
    time: 0,
    killCount: 0,
    totalEnemiesSpawned: 0,
    spawnTimer: 0,
    selectedInventorySlot: -1,
    hoveredInventorySlot: -1,
    persistentInventory: createEmptyInventory(40),
    persistentGold: 0,
    persistentLevel: 1,
    persistentXp: 0,
    timeOfDay: TimeOfDay.DAY,
    persistentStash: Array.from({ length: 100 }, () => ({ item: null })),
    mapCleared: [false, false, false, false, false, false, false],
    difficulty: DiabloDifficulty.DAGGER,
  };
}
