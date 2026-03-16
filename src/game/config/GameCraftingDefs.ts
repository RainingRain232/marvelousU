// ---------------------------------------------------------------------------
// Quest for the Grail — Crafting, Enchantment & Material Definitions
// ---------------------------------------------------------------------------

import type { ItemDef } from "./GameConfig";
import { ItemType, ItemRarity } from "./GameConfig";

// ---------------------------------------------------------------------------
// Crafting Materials (dropped by enemies, found in chests, gathered)
// ---------------------------------------------------------------------------

export interface CraftingMaterial {
  id: string;
  name: string;
  color: number;
  rarity: ItemRarity;
  desc: string;
  dropWeight: number;      // relative drop chance weight
  enemyCategories?: string[];  // if set, only drops from these enemy categories
}

export const CRAFTING_MATERIALS: Record<string, CraftingMaterial> = {
  // Common
  iron_ore: { id: "iron_ore", name: "Iron Ore", color: 0x888888, rarity: ItemRarity.COMMON, desc: "Raw iron. Used in smithing.", dropWeight: 20 },
  leather_scrap: { id: "leather_scrap", name: "Leather Scrap", color: 0x886644, rarity: ItemRarity.COMMON, desc: "Tanned hide. Good for light armor.", dropWeight: 18, enemyCategories: ["beast", "bandit"] },
  bone_dust: { id: "bone_dust", name: "Bone Dust", color: 0xccccaa, rarity: ItemRarity.COMMON, desc: "Ground bones. Used in alchemy.", dropWeight: 15, enemyCategories: ["undead"] },
  herb_sprig: { id: "herb_sprig", name: "Herb Sprig", color: 0x44aa44, rarity: ItemRarity.COMMON, desc: "A potent herb for potions.", dropWeight: 16 },
  wood_plank: { id: "wood_plank", name: "Wood Plank", color: 0x996633, rarity: ItemRarity.COMMON, desc: "Sturdy wood for handles and staves.", dropWeight: 14 },
  // Uncommon
  steel_ingot: { id: "steel_ingot", name: "Steel Ingot", color: 0xaaaacc, rarity: ItemRarity.UNCOMMON, desc: "Refined steel. Stronger than iron.", dropWeight: 8 },
  fae_silk: { id: "fae_silk", name: "Fae Silk", color: 0x88ffaa, rarity: ItemRarity.UNCOMMON, desc: "Shimmering silk from the Otherworld.", dropWeight: 6, enemyCategories: ["fae"] },
  arcane_dust: { id: "arcane_dust", name: "Arcane Dust", color: 0x8844ff, rarity: ItemRarity.UNCOMMON, desc: "Magical residue. Thrums with power.", dropWeight: 7, enemyCategories: ["fae", "elemental", "demon"] },
  venom_sac: { id: "venom_sac", name: "Venom Sac", color: 0x44aa44, rarity: ItemRarity.UNCOMMON, desc: "Poisonous gland from a creature.", dropWeight: 6, enemyCategories: ["beast"] },
  holy_water: { id: "holy_water", name: "Holy Water", color: 0x88ccff, rarity: ItemRarity.UNCOMMON, desc: "Blessed water from a sacred spring.", dropWeight: 5 },
  // Rare
  dragon_scale: { id: "dragon_scale", name: "Dragon Scale", color: 0xff4400, rarity: ItemRarity.RARE, desc: "A scale of incredible toughness.", dropWeight: 3, enemyCategories: ["beast", "elemental"] },
  shadow_essence: { id: "shadow_essence", name: "Shadow Essence", color: 0x442266, rarity: ItemRarity.RARE, desc: "Concentrated darkness from the Abyss.", dropWeight: 2, enemyCategories: ["undead", "demon"] },
  crystal_shard: { id: "crystal_shard", name: "Crystal Shard", color: 0x44aaff, rarity: ItemRarity.RARE, desc: "A mana crystal fragment. Resonates with magic.", dropWeight: 3 },
  phoenix_feather: { id: "phoenix_feather", name: "Phoenix Feather", color: 0xffaa44, rarity: ItemRarity.RARE, desc: "Glows with inner warmth. Extremely rare.", dropWeight: 1 },
};

// Material drop table by difficulty tier
export const MATERIAL_DROP_TABLES: Record<string, { matId: string; weight: number }[]> = {
  easy: [
    { matId: "iron_ore", weight: 20 }, { matId: "leather_scrap", weight: 18 },
    { matId: "bone_dust", weight: 15 }, { matId: "herb_sprig", weight: 16 },
    { matId: "wood_plank", weight: 14 }, { matId: "steel_ingot", weight: 3 },
  ],
  medium: [
    { matId: "iron_ore", weight: 10 }, { matId: "leather_scrap", weight: 8 },
    { matId: "bone_dust", weight: 8 }, { matId: "herb_sprig", weight: 10 },
    { matId: "steel_ingot", weight: 10 }, { matId: "fae_silk", weight: 6 },
    { matId: "arcane_dust", weight: 7 }, { matId: "venom_sac", weight: 6 },
    { matId: "holy_water", weight: 5 }, { matId: "crystal_shard", weight: 2 },
  ],
  hard: [
    { matId: "steel_ingot", weight: 8 }, { matId: "fae_silk", weight: 6 },
    { matId: "arcane_dust", weight: 8 }, { matId: "holy_water", weight: 5 },
    { matId: "dragon_scale", weight: 4 }, { matId: "shadow_essence", weight: 3 },
    { matId: "crystal_shard", weight: 5 }, { matId: "phoenix_feather", weight: 2 },
  ],
};

// ---------------------------------------------------------------------------
// Crafting Recipes
// ---------------------------------------------------------------------------

export interface CraftingRecipe {
  id: string;
  name: string;
  desc: string;
  category: "weapon" | "armor" | "potion" | "scroll";
  ingredients: { matId: string; quantity: number }[];
  resultItemId: string;    // references ITEM_DEFS or creates new item
  resultItem?: ItemDef;    // inline item definition for crafted items not in base ITEM_DEFS
}

export const CRAFTING_RECIPES: CraftingRecipe[] = [
  // Weapons
  {
    id: "craft_iron_sword", name: "Iron Sword", desc: "Forge a solid iron blade.",
    category: "weapon",
    ingredients: [{ matId: "iron_ore", quantity: 3 }, { matId: "wood_plank", quantity: 1 }],
    resultItemId: "crafted_iron_sword",
    resultItem: {
      id: "crafted_iron_sword", name: "Iron Sword", type: ItemType.WEAPON, rarity: ItemRarity.COMMON,
      color: 0x888888, attackBonus: 4, defenseBonus: 0, hpBonus: 0, speedBonus: 0,
      desc: "A sturdy iron blade, hammer-forged.",
    },
  },
  {
    id: "craft_steel_longsword", name: "Steel Longsword", desc: "A keen blade of tempered steel.",
    category: "weapon",
    ingredients: [{ matId: "steel_ingot", quantity: 2 }, { matId: "leather_scrap", quantity: 1 }],
    resultItemId: "crafted_steel_longsword",
    resultItem: {
      id: "crafted_steel_longsword", name: "Steel Longsword", type: ItemType.WEAPON, rarity: ItemRarity.UNCOMMON,
      color: 0xaaaacc, attackBonus: 8, defenseBonus: 0, hpBonus: 0, speedBonus: 0,
      desc: "A well-balanced blade of forged steel.",
    },
  },
  {
    id: "craft_dragon_blade", name: "Dragon Blade", desc: "A weapon forged with dragon scale.",
    category: "weapon",
    ingredients: [{ matId: "dragon_scale", quantity: 2 }, { matId: "steel_ingot", quantity: 2 }, { matId: "arcane_dust", quantity: 1 }],
    resultItemId: "crafted_dragon_blade",
    resultItem: {
      id: "crafted_dragon_blade", name: "Dragon Blade", type: ItemType.WEAPON, rarity: ItemRarity.RARE,
      color: 0xff6600, attackBonus: 14, defenseBonus: 0, hpBonus: 0, speedBonus: 1,
      specialEffect: "fire_strike", desc: "Burns with dragonfire on each swing.",
    },
  },
  {
    id: "craft_shadow_dagger", name: "Shadow Dagger", desc: "A blade wreathed in darkness.",
    category: "weapon",
    ingredients: [{ matId: "shadow_essence", quantity: 2 }, { matId: "steel_ingot", quantity: 1 }],
    resultItemId: "crafted_shadow_dagger",
    resultItem: {
      id: "crafted_shadow_dagger", name: "Shadow Dagger", type: ItemType.WEAPON, rarity: ItemRarity.RARE,
      color: 0x442266, attackBonus: 11, defenseBonus: 0, hpBonus: 0, speedBonus: 2,
      specialEffect: "backstab", desc: "Deals double damage from behind.",
    },
  },
  // Armor
  {
    id: "craft_leather_vest", name: "Leather Vest", desc: "Stitch together leather protection.",
    category: "armor",
    ingredients: [{ matId: "leather_scrap", quantity: 3 }],
    resultItemId: "crafted_leather_vest",
    resultItem: {
      id: "crafted_leather_vest", name: "Leather Vest", type: ItemType.ARMOR, rarity: ItemRarity.COMMON,
      color: 0x886644, attackBonus: 0, defenseBonus: 4, hpBonus: 10, speedBonus: 0,
      desc: "Hand-stitched leather armor.",
    },
  },
  {
    id: "craft_fae_robes", name: "Fae Robes", desc: "Woven from Otherworld silk.",
    category: "armor",
    ingredients: [{ matId: "fae_silk", quantity: 3 }, { matId: "arcane_dust", quantity: 1 }],
    resultItemId: "crafted_fae_robes",
    resultItem: {
      id: "crafted_fae_robes", name: "Fae Robes", type: ItemType.ARMOR, rarity: ItemRarity.RARE,
      color: 0x88ffaa, attackBonus: 3, defenseBonus: 8, hpBonus: 15, speedBonus: 1,
      specialEffect: "magic_resist", desc: "Shimmers with protective fae magic.",
    },
  },
  {
    id: "craft_dragonscale_mail", name: "Dragonscale Mail", desc: "Armor of dragon scales.",
    category: "armor",
    ingredients: [{ matId: "dragon_scale", quantity: 3 }, { matId: "steel_ingot", quantity: 2 }],
    resultItemId: "crafted_dragonscale_mail",
    resultItem: {
      id: "crafted_dragonscale_mail", name: "Dragonscale Mail", type: ItemType.ARMOR, rarity: ItemRarity.LEGENDARY,
      color: 0xff4400, attackBonus: 3, defenseBonus: 16, hpBonus: 30, speedBonus: 0,
      specialEffect: "fire_resist", desc: "Nearly impervious to flame and blade.",
    },
  },
  // Potions
  {
    id: "craft_health_potion", name: "Health Potion", desc: "Brew a restorative draught.",
    category: "potion",
    ingredients: [{ matId: "herb_sprig", quantity: 2 }, { matId: "holy_water", quantity: 1 }],
    resultItemId: "health_potion",
  },
  {
    id: "craft_greater_health_potion", name: "Greater Health Potion", desc: "A powerful healing brew.",
    category: "potion",
    ingredients: [{ matId: "herb_sprig", quantity: 3 }, { matId: "holy_water", quantity: 1 }, { matId: "phoenix_feather", quantity: 1 }],
    resultItemId: "crafted_greater_health_potion",
    resultItem: {
      id: "crafted_greater_health_potion", name: "Greater Health Potion", type: ItemType.CONSUMABLE, rarity: ItemRarity.RARE,
      color: 0xff2222, attackBonus: 0, defenseBonus: 0, hpBonus: 0, speedBonus: 0,
      specialEffect: "heal_60", desc: "Restores 60 HP.",
    },
  },
  {
    id: "craft_antidote", name: "Antidote", desc: "Cures poison and cleanses debuffs.",
    category: "potion",
    ingredients: [{ matId: "herb_sprig", quantity: 2 }, { matId: "venom_sac", quantity: 1 }],
    resultItemId: "crafted_antidote",
    resultItem: {
      id: "crafted_antidote", name: "Antidote", type: ItemType.CONSUMABLE, rarity: ItemRarity.UNCOMMON,
      color: 0x44ff44, attackBonus: 0, defenseBonus: 0, hpBonus: 0, speedBonus: 0,
      specialEffect: "cleanse", desc: "Removes all negative status effects.",
    },
  },
  // Scrolls
  {
    id: "craft_scroll_fire", name: "Scroll of Fire", desc: "Infuse arcane energy into a fire scroll.",
    category: "scroll",
    ingredients: [{ matId: "arcane_dust", quantity: 2 }, { matId: "phoenix_feather", quantity: 1 }],
    resultItemId: "crafted_scroll_fire",
    resultItem: {
      id: "crafted_scroll_fire", name: "Scroll of Fire", type: ItemType.CONSUMABLE, rarity: ItemRarity.RARE,
      color: 0xff6600, attackBonus: 0, defenseBonus: 0, hpBonus: 0, speedBonus: 0,
      specialEffect: "fire_all", desc: "Burns all enemies on screen for 30 damage.",
    },
  },
  {
    id: "craft_scroll_shield", name: "Scroll of Protection", desc: "A warding scroll.",
    category: "scroll",
    ingredients: [{ matId: "arcane_dust", quantity: 1 }, { matId: "holy_water", quantity: 1 }],
    resultItemId: "crafted_scroll_shield",
    resultItem: {
      id: "crafted_scroll_shield", name: "Scroll of Protection", type: ItemType.CONSUMABLE, rarity: ItemRarity.UNCOMMON,
      color: 0x44aaff, attackBonus: 0, defenseBonus: 0, hpBonus: 0, speedBonus: 0,
      specialEffect: "temp_shield", desc: "Grants invulnerability for 5 seconds.",
    },
  },
];

// ---------------------------------------------------------------------------
// Enchantment Definitions
// ---------------------------------------------------------------------------

export interface EnchantmentDef {
  id: string;
  name: string;
  desc: string;
  color: number;
  applicableTo: ("weapon" | "armor" | "relic")[];
  attackBonus: number;
  defenseBonus: number;
  hpBonus: number;
  speedBonus: number;
  specialEffect?: string;
  maxLevel: number;
  baseCost: { matId: string; quantity: number }[];
  successRate: number;    // 0..1 base success chance (decreases per level)
}

export const ENCHANTMENT_DEFS: EnchantmentDef[] = [
  {
    id: "ench_sharpness", name: "Sharpness", desc: "+ATK per level",
    color: 0xff4444, applicableTo: ["weapon"], attackBonus: 3, defenseBonus: 0, hpBonus: 0, speedBonus: 0,
    maxLevel: 5, baseCost: [{ matId: "iron_ore", quantity: 2 }, { matId: "arcane_dust", quantity: 1 }],
    successRate: 0.9,
  },
  {
    id: "ench_fortify", name: "Fortify", desc: "+DEF per level",
    color: 0x4488ff, applicableTo: ["armor"], attackBonus: 0, defenseBonus: 3, hpBonus: 0, speedBonus: 0,
    maxLevel: 5, baseCost: [{ matId: "steel_ingot", quantity: 1 }, { matId: "arcane_dust", quantity: 1 }],
    successRate: 0.85,
  },
  {
    id: "ench_vitality", name: "Vitality", desc: "+HP per level",
    color: 0xff4444, applicableTo: ["armor", "relic"], attackBonus: 0, defenseBonus: 0, hpBonus: 10, speedBonus: 0,
    maxLevel: 5, baseCost: [{ matId: "herb_sprig", quantity: 2 }, { matId: "crystal_shard", quantity: 1 }],
    successRate: 0.85,
  },
  {
    id: "ench_swiftness", name: "Swiftness", desc: "+SPD per level",
    color: 0x44ff44, applicableTo: ["weapon", "armor"], attackBonus: 0, defenseBonus: 0, hpBonus: 0, speedBonus: 1,
    maxLevel: 3, baseCost: [{ matId: "fae_silk", quantity: 1 }, { matId: "arcane_dust", quantity: 1 }],
    successRate: 0.8,
  },
  {
    id: "ench_holy", name: "Holy", desc: "Extra damage to undead/demon",
    color: 0xffd700, applicableTo: ["weapon"], attackBonus: 2, defenseBonus: 0, hpBonus: 0, speedBonus: 0,
    specialEffect: "holy_damage", maxLevel: 3,
    baseCost: [{ matId: "holy_water", quantity: 2 }, { matId: "crystal_shard", quantity: 1 }],
    successRate: 0.75,
  },
  {
    id: "ench_lifesteal", name: "Lifesteal", desc: "Heal on hit",
    color: 0xff0044, applicableTo: ["weapon"], attackBonus: 0, defenseBonus: 0, hpBonus: 0, speedBonus: 0,
    specialEffect: "lifesteal", maxLevel: 3,
    baseCost: [{ matId: "shadow_essence", quantity: 1 }, { matId: "venom_sac", quantity: 1 }],
    successRate: 0.7,
  },
  {
    id: "ench_thorns", name: "Thorns", desc: "Reflect damage on hit",
    color: 0xaa4444, applicableTo: ["armor"], attackBonus: 0, defenseBonus: 0, hpBonus: 0, speedBonus: 0,
    specialEffect: "thorns", maxLevel: 3,
    baseCost: [{ matId: "dragon_scale", quantity: 1 }, { matId: "iron_ore", quantity: 2 }],
    successRate: 0.7,
  },
];

// ---------------------------------------------------------------------------
// Socket Gem/Rune Definitions
// ---------------------------------------------------------------------------

export interface SocketGem {
  id: string;
  name: string;
  color: number;
  rarity: ItemRarity;
  desc: string;
  attackBonus: number;
  defenseBonus: number;
  hpBonus: number;
  speedBonus: number;
  specialEffect?: string;
}

export const SOCKET_GEMS: Record<string, SocketGem> = {
  gem_ruby: {
    id: "gem_ruby", name: "Ruby", color: 0xff2222, rarity: ItemRarity.RARE,
    desc: "+5 ATK", attackBonus: 5, defenseBonus: 0, hpBonus: 0, speedBonus: 0,
  },
  gem_sapphire: {
    id: "gem_sapphire", name: "Sapphire", color: 0x2244ff, rarity: ItemRarity.RARE,
    desc: "+5 DEF", attackBonus: 0, defenseBonus: 5, hpBonus: 0, speedBonus: 0,
  },
  gem_emerald: {
    id: "gem_emerald", name: "Emerald", color: 0x22ff44, rarity: ItemRarity.RARE,
    desc: "+20 HP", attackBonus: 0, defenseBonus: 0, hpBonus: 20, speedBonus: 0,
  },
  gem_diamond: {
    id: "gem_diamond", name: "Diamond", color: 0xeeeeff, rarity: ItemRarity.LEGENDARY,
    desc: "+3 ATK, +3 DEF, +10 HP", attackBonus: 3, defenseBonus: 3, hpBonus: 10, speedBonus: 0,
  },
  rune_fire: {
    id: "rune_fire", name: "Rune of Fire", color: 0xff4400, rarity: ItemRarity.RARE,
    desc: "Fire damage on hit", attackBonus: 2, defenseBonus: 0, hpBonus: 0, speedBonus: 0,
    specialEffect: "fire_damage",
  },
  rune_frost: {
    id: "rune_frost", name: "Rune of Frost", color: 0x88ccff, rarity: ItemRarity.RARE,
    desc: "Slow enemies on hit", attackBonus: 0, defenseBonus: 2, hpBonus: 0, speedBonus: 0,
    specialEffect: "frost_slow",
  },
  rune_life: {
    id: "rune_life", name: "Rune of Life", color: 0x44ff44, rarity: ItemRarity.RARE,
    desc: "Regen 1 HP/s", attackBonus: 0, defenseBonus: 0, hpBonus: 0, speedBonus: 0,
    specialEffect: "regen",
  },
};

// Gem drop table (from bosses and high-tier chests)
export const GEM_DROP_TABLE: { gemId: string; weight: number }[] = [
  { gemId: "gem_ruby", weight: 6 },
  { gemId: "gem_sapphire", weight: 6 },
  { gemId: "gem_emerald", weight: 6 },
  { gemId: "gem_diamond", weight: 1 },
  { gemId: "rune_fire", weight: 4 },
  { gemId: "rune_frost", weight: 4 },
  { gemId: "rune_life", weight: 4 },
];
