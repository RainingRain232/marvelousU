// ---------------------------------------------------------------------------
// Shadowhand mode — heist target definitions
// ---------------------------------------------------------------------------

export type TargetTier = 1 | 2 | 3 | 4 | 5;
export type RoomType = "entrance" | "hallway" | "guard_room" | "bedroom" | "treasury" | "vault" | "chapel" | "kitchen" | "armory" | "library" | "cellar" | "throne" | "tower" | "courtyard" | "sewer";

export interface LootDef {
  id: string;
  name: string;
  value: number;
  weight: number; // 1=light, 2=medium, 3=heavy (needs brawler)
  icon: string;
}

export interface TargetDef {
  id: string;
  name: string;
  tier: TargetTier;
  desc: string;
  color: number;
  guardCount: [number, number]; // [min, max]
  roomCount: [number, number];
  lootTable: LootDef[];
  primaryLoot: LootDef; // the main prize
  hasTraps: boolean;
  hasMagicWards: boolean;
  hasDogs: boolean;
  entryPoints: number; // how many entry points available
  floorCount: number;
  mapWidth: number;
  mapHeight: number;
}

export const LOOT_TABLE: Record<string, LootDef> = {
  gold_coins: { id: "gold_coins", name: "Gold Coins", value: 25, weight: 1, icon: "coin" },
  silver_plate: { id: "silver_plate", name: "Silver Plate", value: 40, weight: 1, icon: "plate" },
  jeweled_goblet: { id: "jeweled_goblet", name: "Jeweled Goblet", value: 75, weight: 1, icon: "goblet" },
  noble_signet: { id: "noble_signet", name: "Noble Signet Ring", value: 60, weight: 1, icon: "ring" },
  silk_tapestry: { id: "silk_tapestry", name: "Silk Tapestry", value: 90, weight: 2, icon: "tapestry" },
  enchanted_scroll: { id: "enchanted_scroll", name: "Enchanted Scroll", value: 120, weight: 1, icon: "scroll" },
  holy_relic: { id: "holy_relic", name: "Holy Relic", value: 200, weight: 2, icon: "relic" },
  dragon_egg: { id: "dragon_egg", name: "Dragon Egg", value: 350, weight: 3, icon: "egg" },
  crown_jewel: { id: "crown_jewel", name: "Crown Jewel", value: 500, weight: 2, icon: "crown" },
  excalibur_shard: { id: "excalibur_shard", name: "Excalibur Shard", value: 750, weight: 3, icon: "shard" },
  grail_fragment: { id: "grail_fragment", name: "Grail Fragment", value: 1000, weight: 3, icon: "grail" },
  ancient_tome: { id: "ancient_tome", name: "Ancient Tome", value: 150, weight: 2, icon: "tome" },
  ruby_necklace: { id: "ruby_necklace", name: "Ruby Necklace", value: 110, weight: 1, icon: "necklace" },
  golden_chalice: { id: "golden_chalice", name: "Golden Chalice", value: 180, weight: 2, icon: "chalice" },
  ivory_chess_set: { id: "ivory_chess_set", name: "Ivory Chess Set", value: 130, weight: 2, icon: "chess" },
};

export const TARGET_DEFS: TargetDef[] = [
  // Tier 1 — Easy
  {
    id: "merchant_house",
    name: "Merchant's House",
    tier: 1,
    desc: "A wealthy merchant sleeps upstairs. His strongbox is in the study.",
    color: 0x8b7355,
    guardCount: [1, 2],
    roomCount: [4, 6],
    lootTable: [LOOT_TABLE.gold_coins, LOOT_TABLE.silver_plate, LOOT_TABLE.noble_signet],
    primaryLoot: LOOT_TABLE.jeweled_goblet,
    hasTraps: false,
    hasMagicWards: false,
    hasDogs: false,
    entryPoints: 3,
    floorCount: 1,
    mapWidth: 30,
    mapHeight: 24,
  },
  {
    id: "village_chapel",
    name: "Village Chapel",
    tier: 1,
    desc: "The offering box and reliquary are poorly guarded after vespers.",
    color: 0x9b8b7b,
    guardCount: [1, 2],
    roomCount: [3, 5],
    lootTable: [LOOT_TABLE.gold_coins, LOOT_TABLE.silver_plate],
    primaryLoot: LOOT_TABLE.holy_relic,
    hasTraps: false,
    hasMagicWards: false,
    hasDogs: false,
    entryPoints: 2,
    floorCount: 1,
    mapWidth: 26,
    mapHeight: 22,
  },
  // Tier 2 — Medium
  {
    id: "noble_manor",
    name: "Noble's Manor",
    tier: 2,
    desc: "Lord Aldric's manor. Guards patrol the halls. Dogs in the courtyard.",
    color: 0x6b5b4b,
    guardCount: [3, 5],
    roomCount: [6, 9],
    lootTable: [LOOT_TABLE.gold_coins, LOOT_TABLE.jeweled_goblet, LOOT_TABLE.silk_tapestry, LOOT_TABLE.ruby_necklace],
    primaryLoot: LOOT_TABLE.ancient_tome,
    hasTraps: false,
    hasMagicWards: false,
    hasDogs: true,
    entryPoints: 3,
    floorCount: 1,
    mapWidth: 36,
    mapHeight: 28,
  },
  {
    id: "guild_hall",
    name: "Merchants' Guild Hall",
    tier: 2,
    desc: "The guild vault holds records of every merchant's fortune.",
    color: 0x7b6b5b,
    guardCount: [3, 4],
    roomCount: [5, 8],
    lootTable: [LOOT_TABLE.gold_coins, LOOT_TABLE.noble_signet, LOOT_TABLE.ivory_chess_set, LOOT_TABLE.golden_chalice],
    primaryLoot: LOOT_TABLE.enchanted_scroll,
    hasTraps: true,
    hasMagicWards: false,
    hasDogs: false,
    entryPoints: 3,
    floorCount: 1,
    mapWidth: 34,
    mapHeight: 26,
  },
  // Tier 3 — Hard
  {
    id: "castle_keep",
    name: "Castle Keep",
    tier: 3,
    desc: "The Baron's castle. Elite guards, locked doors, and magical wards.",
    color: 0x5b4b3b,
    guardCount: [5, 8],
    roomCount: [8, 12],
    lootTable: [LOOT_TABLE.jeweled_goblet, LOOT_TABLE.silk_tapestry, LOOT_TABLE.enchanted_scroll, LOOT_TABLE.golden_chalice, LOOT_TABLE.ruby_necklace],
    primaryLoot: LOOT_TABLE.crown_jewel,
    hasTraps: true,
    hasMagicWards: true,
    hasDogs: true,
    entryPoints: 4,
    floorCount: 2,
    mapWidth: 42,
    mapHeight: 34,
  },
  {
    id: "cathedral",
    name: "Grand Cathedral",
    tier: 3,
    desc: "The Archbishop's cathedral. Ancient relics behind consecrated vaults.",
    color: 0x8b8b9b,
    guardCount: [4, 7],
    roomCount: [7, 11],
    lootTable: [LOOT_TABLE.holy_relic, LOOT_TABLE.enchanted_scroll, LOOT_TABLE.ancient_tome, LOOT_TABLE.golden_chalice],
    primaryLoot: LOOT_TABLE.excalibur_shard,
    hasTraps: true,
    hasMagicWards: true,
    hasDogs: false,
    entryPoints: 3,
    floorCount: 2,
    mapWidth: 40,
    mapHeight: 32,
  },
  // Tier 4 — Very Hard
  {
    id: "royal_palace",
    name: "Royal Palace",
    tier: 4,
    desc: "The King's palace. The crown jewels are guarded by the finest knights.",
    color: 0x4b3b2b,
    guardCount: [8, 12],
    roomCount: [10, 14],
    lootTable: [LOOT_TABLE.crown_jewel, LOOT_TABLE.silk_tapestry, LOOT_TABLE.enchanted_scroll, LOOT_TABLE.dragon_egg, LOOT_TABLE.ruby_necklace],
    primaryLoot: LOOT_TABLE.excalibur_shard,
    hasTraps: true,
    hasMagicWards: true,
    hasDogs: true,
    entryPoints: 4,
    floorCount: 2,
    mapWidth: 48,
    mapHeight: 38,
  },
  // Tier 5 — Legendary
  {
    id: "grail_vault",
    name: "The Grail Vault",
    tier: 5,
    desc: "Beneath Camelot itself. One chance. The Grail awaits.",
    color: 0xffd700,
    guardCount: [12, 16],
    roomCount: [12, 14],
    lootTable: [LOOT_TABLE.crown_jewel, LOOT_TABLE.excalibur_shard, LOOT_TABLE.dragon_egg, LOOT_TABLE.enchanted_scroll],
    primaryLoot: LOOT_TABLE.grail_fragment,
    hasTraps: true,
    hasMagicWards: true,
    hasDogs: true,
    entryPoints: 2,
    floorCount: 3,
    mapWidth: 52,
    mapHeight: 42,
  },
];

export function getTargetsForTier(tier: TargetTier): TargetDef[] {
  return TARGET_DEFS.filter(t => t.tier === tier);
}

export function getTargetById(id: string): TargetDef | undefined {
  return TARGET_DEFS.find(t => t.id === id);
}
