// ---------------------------------------------------------------------------
// Camelot Craft – Mob definitions
// ---------------------------------------------------------------------------

export enum MobType {
  // Hostile
  SAXON_WARRIOR = "saxon_warrior",
  SAXON_ARCHER = "saxon_archer",
  SAXON_CHIEFTAIN = "saxon_chieftain",
  DARK_KNIGHT = "dark_knight",
  ENCHANTED_WOLF = "enchanted_wolf",
  MORGANS_CONSTRUCT = "morgans_construct",
  CAVE_SPIDER = "cave_spider",
  SKELETON = "skeleton",
  WRAITH = "wraith",
  DRAGON = "dragon",

  // Passive / friendly
  FAERIE = "faerie",
  DEER = "deer",
  HORSE = "horse",
  KNIGHT_NPC = "knight_npc",
  MERLIN = "merlin",
  LADY_OF_LAKE = "lady_of_lake",
  VILLAGER = "villager",
}

export type MobBehavior = "hostile" | "passive" | "neutral" | "friendly";

export interface MobDef {
  type: MobType;
  name: string;
  hp: number;
  damage: number;
  speed: number;
  behavior: MobBehavior;
  spawnWeight: number;     // relative spawn chance (0 = doesn't spawn naturally)
  nightOnly: boolean;
  bodyColor: number;
  bodyWidth: number;
  bodyHeight: number;
  bodyDepth: number;
  xpDrop: number;
  /** Special drops as [specialId, chance] */
  drops: [string, number][];
  detectionRange: number;
  attackRange: number;
  attackCooldown: number;
  knockbackResist: number; // 0-1
}

export const MOB_DEFS: Record<MobType, MobDef> = {
  // --- Hostile ---
  [MobType.SAXON_WARRIOR]: {
    type: MobType.SAXON_WARRIOR, name: "Saxon Warrior",
    hp: 20, damage: 4, speed: 3.5, behavior: "hostile",
    spawnWeight: 10, nightOnly: false,
    bodyColor: 0x8B4513, bodyWidth: 0.6, bodyHeight: 1.8, bodyDepth: 0.4,
    xpDrop: 5, drops: [["iron_nugget", 0.3], ["saxon_helm", 0.05]],
    detectionRange: 16, attackRange: 2.0, attackCooldown: 1.0, knockbackResist: 0.1,
  },
  [MobType.SAXON_ARCHER]: {
    type: MobType.SAXON_ARCHER, name: "Saxon Archer",
    hp: 14, damage: 3, speed: 3.0, behavior: "hostile",
    spawnWeight: 6, nightOnly: false,
    bodyColor: 0x6B4226, bodyWidth: 0.6, bodyHeight: 1.8, bodyDepth: 0.4,
    xpDrop: 5, drops: [["arrow", 0.5], ["bow", 0.1]],
    detectionRange: 24, attackRange: 16.0, attackCooldown: 2.0, knockbackResist: 0.0,
  },
  [MobType.SAXON_CHIEFTAIN]: {
    type: MobType.SAXON_CHIEFTAIN, name: "Saxon Chieftain",
    hp: 40, damage: 7, speed: 3.0, behavior: "hostile",
    spawnWeight: 1, nightOnly: false,
    bodyColor: 0x5D2906, bodyWidth: 0.7, bodyHeight: 2.0, bodyDepth: 0.5,
    xpDrop: 20, drops: [["gold_nugget", 0.5], ["saxon_crown", 0.1]],
    detectionRange: 20, attackRange: 2.5, attackCooldown: 1.2, knockbackResist: 0.4,
  },
  [MobType.DARK_KNIGHT]: {
    type: MobType.DARK_KNIGHT, name: "Dark Knight",
    hp: 30, damage: 6, speed: 3.5, behavior: "hostile",
    spawnWeight: 3, nightOnly: true,
    bodyColor: 0x1A1A2E, bodyWidth: 0.7, bodyHeight: 2.0, bodyDepth: 0.5,
    xpDrop: 15, drops: [["dark_steel", 0.3], ["dark_helm", 0.05]],
    detectionRange: 20, attackRange: 2.5, attackCooldown: 0.8, knockbackResist: 0.3,
  },
  [MobType.ENCHANTED_WOLF]: {
    type: MobType.ENCHANTED_WOLF, name: "Enchanted Wolf",
    hp: 12, damage: 3, speed: 5.0, behavior: "hostile",
    spawnWeight: 8, nightOnly: true,
    bodyColor: 0x607D8B, bodyWidth: 0.8, bodyHeight: 0.8, bodyDepth: 1.2,
    xpDrop: 3, drops: [["wolf_pelt", 0.4]],
    detectionRange: 20, attackRange: 1.5, attackCooldown: 0.6, knockbackResist: 0.0,
  },
  [MobType.MORGANS_CONSTRUCT]: {
    type: MobType.MORGANS_CONSTRUCT, name: "Morgan's Construct",
    hp: 50, damage: 8, speed: 2.0, behavior: "hostile",
    spawnWeight: 1, nightOnly: true,
    bodyColor: 0x4A148C, bodyWidth: 1.2, bodyHeight: 2.5, bodyDepth: 1.2,
    xpDrop: 30, drops: [["enchanted_shard", 0.5], ["dark_crystal", 0.1]],
    detectionRange: 16, attackRange: 3.0, attackCooldown: 1.5, knockbackResist: 0.6,
  },
  [MobType.CAVE_SPIDER]: {
    type: MobType.CAVE_SPIDER, name: "Cave Spider",
    hp: 8, damage: 2, speed: 4.0, behavior: "hostile",
    spawnWeight: 12, nightOnly: false,
    bodyColor: 0x3E2723, bodyWidth: 0.8, bodyHeight: 0.5, bodyDepth: 0.8,
    xpDrop: 2, drops: [["spider_silk", 0.5]],
    detectionRange: 12, attackRange: 1.5, attackCooldown: 0.5, knockbackResist: 0.0,
  },
  [MobType.SKELETON]: {
    type: MobType.SKELETON, name: "Skeleton",
    hp: 16, damage: 3, speed: 3.0, behavior: "hostile",
    spawnWeight: 8, nightOnly: true,
    bodyColor: 0xE0D8C8, bodyWidth: 0.5, bodyHeight: 1.8, bodyDepth: 0.3,
    xpDrop: 5, drops: [["bone", 0.6], ["ancient_coin", 0.1]],
    detectionRange: 16, attackRange: 2.0, attackCooldown: 1.0, knockbackResist: 0.0,
  },
  [MobType.WRAITH]: {
    type: MobType.WRAITH, name: "Wraith",
    hp: 20, damage: 5, speed: 4.0, behavior: "hostile",
    spawnWeight: 2, nightOnly: true,
    bodyColor: 0x212121, bodyWidth: 0.6, bodyHeight: 2.0, bodyDepth: 0.3,
    xpDrop: 10, drops: [["ectoplasm", 0.4], ["wraith_cloak", 0.05]],
    detectionRange: 24, attackRange: 2.0, attackCooldown: 1.0, knockbackResist: 0.0,
  },
  [MobType.DRAGON]: {
    type: MobType.DRAGON, name: "Dragon",
    hp: 200, damage: 15, speed: 6.0, behavior: "hostile",
    spawnWeight: 0, nightOnly: false, // boss, doesn't spawn naturally
    bodyColor: 0xB71C1C, bodyWidth: 3.0, bodyHeight: 3.0, bodyDepth: 5.0,
    xpDrop: 100, drops: [["dragon_scale", 1.0], ["dragon_heart", 0.5]],
    detectionRange: 48, attackRange: 5.0, attackCooldown: 2.0, knockbackResist: 0.9,
  },

  // --- Passive / friendly ---
  [MobType.FAERIE]: {
    type: MobType.FAERIE, name: "Faerie",
    hp: 4, damage: 0, speed: 4.0, behavior: "friendly",
    spawnWeight: 5, nightOnly: false,
    bodyColor: 0xE1BEE7, bodyWidth: 0.3, bodyHeight: 0.5, bodyDepth: 0.2,
    xpDrop: 1, drops: [["faerie_dust", 0.8]],
    detectionRange: 8, attackRange: 0, attackCooldown: 0, knockbackResist: 0.0,
  },
  [MobType.DEER]: {
    type: MobType.DEER, name: "Deer",
    hp: 8, damage: 0, speed: 5.5, behavior: "passive",
    spawnWeight: 8, nightOnly: false,
    bodyColor: 0x8D6E63, bodyWidth: 0.8, bodyHeight: 1.2, bodyDepth: 1.4,
    xpDrop: 1, drops: [["venison", 0.8], ["leather", 0.5]],
    detectionRange: 12, attackRange: 0, attackCooldown: 0, knockbackResist: 0.0,
  },
  [MobType.HORSE]: {
    type: MobType.HORSE, name: "Horse",
    hp: 20, damage: 0, speed: 7.0, behavior: "passive",
    spawnWeight: 3, nightOnly: false,
    bodyColor: 0x795548, bodyWidth: 1.0, bodyHeight: 1.6, bodyDepth: 2.0,
    xpDrop: 1, drops: [],
    detectionRange: 10, attackRange: 0, attackCooldown: 0, knockbackResist: 0.2,
  },
  [MobType.KNIGHT_NPC]: {
    type: MobType.KNIGHT_NPC, name: "Knight of the Round Table",
    hp: 40, damage: 6, speed: 3.5, behavior: "friendly",
    spawnWeight: 0, nightOnly: false, // only spawns via quest
    bodyColor: 0xC0C0C0, bodyWidth: 0.7, bodyHeight: 1.9, bodyDepth: 0.5,
    xpDrop: 0, drops: [],
    detectionRange: 16, attackRange: 2.5, attackCooldown: 0.8, knockbackResist: 0.3,
  },
  [MobType.MERLIN]: {
    type: MobType.MERLIN, name: "Merlin",
    hp: 100, damage: 0, speed: 2.0, behavior: "friendly",
    spawnWeight: 0, nightOnly: false,
    bodyColor: 0x3F51B5, bodyWidth: 0.6, bodyHeight: 1.9, bodyDepth: 0.4,
    xpDrop: 0, drops: [],
    detectionRange: 20, attackRange: 0, attackCooldown: 0, knockbackResist: 1.0,
  },
  [MobType.LADY_OF_LAKE]: {
    type: MobType.LADY_OF_LAKE, name: "Lady of the Lake",
    hp: 100, damage: 0, speed: 0, behavior: "friendly",
    spawnWeight: 0, nightOnly: false,
    bodyColor: 0x80D8FF, bodyWidth: 0.6, bodyHeight: 1.8, bodyDepth: 0.4,
    xpDrop: 0, drops: [],
    detectionRange: 16, attackRange: 0, attackCooldown: 0, knockbackResist: 1.0,
  },
  [MobType.VILLAGER]: {
    type: MobType.VILLAGER, name: "Villager",
    hp: 16, damage: 0, speed: 2.5, behavior: "passive",
    spawnWeight: 4, nightOnly: false,
    bodyColor: 0xA1887F, bodyWidth: 0.6, bodyHeight: 1.8, bodyDepth: 0.4,
    xpDrop: 0, drops: [],
    detectionRange: 8, attackRange: 0, attackCooldown: 0, knockbackResist: 0.0,
  },
};
