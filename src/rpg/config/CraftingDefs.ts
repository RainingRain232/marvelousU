import type { RPGItem } from "@rpg/state/RPGState";

export interface CraftingRecipe {
  id: string;
  name: string;
  description: string;
  ingredients: { itemId: string; quantity: number }[];
  result: RPGItem;
  /** Crafting station required (null = any). */
  station?: "forge" | "alchemy" | "enchanter" | null;
}

// ---------------------------------------------------------------------------
// Crafting station definitions (placed in towns)
// ---------------------------------------------------------------------------

export interface CraftingStation {
  id: string;
  name: string;
  type: "forge" | "alchemy" | "enchanter";
  description: string;
}

export const CRAFTING_STATIONS: CraftingStation[] = [
  { id: "station_forge", name: "Blacksmith Forge", type: "forge", description: "A roaring forge for weapons and armor." },
  { id: "station_alchemy", name: "Alchemy Lab", type: "alchemy", description: "A bubbling lab for potions and elixirs." },
  { id: "station_enchanter", name: "Enchanter's Table", type: "enchanter", description: "A runed table for crafting magical accessories." },
];

/** Towns that have crafting stations: townEntityId -> station types available. */
export const TOWN_CRAFTING_STATIONS: Record<string, ("forge" | "alchemy" | "enchanter")[]> = {
  town_starter: ["forge", "alchemy"],
  town_port: ["alchemy", "enchanter"],
  town_mountain: ["forge", "enchanter"],
  town_capital: ["forge", "alchemy", "enchanter"],
};

// ---------------------------------------------------------------------------
// Common crafting materials (found in the world, dropped by enemies, bought in shops)
// ---------------------------------------------------------------------------

export const COMMON_CRAFT_MATERIALS: RPGItem[] = [
  { id: "mat_iron_ore", name: "Iron Ore", type: "key", stats: {}, description: "A chunk of raw iron ore. Used in smithing.", value: 15 },
  { id: "mat_steel_ingot", name: "Steel Ingot", type: "key", stats: {}, description: "A refined steel ingot. Stronger than iron.", value: 40 },
  { id: "mat_wood", name: "Wood", type: "key", stats: {}, description: "A sturdy plank of wood. Useful for weapon handles.", value: 8 },
  { id: "mat_leather", name: "Leather", type: "key", stats: {}, description: "Tanned animal leather. Good for light armor.", value: 12 },
  { id: "mat_thread", name: "Thread", type: "key", stats: {}, description: "Strong thread spun from silk. Used in armor crafting.", value: 10 },
  { id: "mat_herb", name: "Crafting Herb", type: "key", stats: {}, description: "A potent herb used in alchemy.", value: 6 },
  { id: "mat_water", name: "Pure Water", type: "key", stats: {}, description: "Crystal-clear water from a sacred spring.", value: 5 },
  { id: "mat_crystal", name: "Crystal", type: "key", stats: {}, description: "A shimmering mana crystal. Resonates with magical energy.", value: 25 },
  { id: "mat_ruby", name: "Ruby", type: "key", stats: {}, description: "A deep red gemstone that pulses with heat.", value: 50 },
  { id: "mat_sapphire", name: "Sapphire", type: "key", stats: {}, description: "A brilliant blue gemstone. Cool to the touch.", value: 50 },
  { id: "mat_gold_chain", name: "Gold Chain", type: "key", stats: {}, description: "A delicate chain of pure gold.", value: 35 },
  { id: "mat_silver", name: "Silver", type: "key", stats: {}, description: "A bar of refined silver.", value: 30 },
  { id: "mat_dragon_scale", name: "Dragon Scale", type: "key", stats: {}, description: "A scale shed by a dragon. Incredibly tough.", value: 80 },
  { id: "mat_shadow_silk", name: "Shadow Silk", type: "key", stats: {}, description: "Silk woven from captured shadows. Nearly weightless.", value: 60 },
  { id: "mat_phoenix_feather", name: "Phoenix Feather", type: "key", stats: {}, description: "A feather that glows with inner warmth.", value: 70 },
  { id: "mat_emerald", name: "Emerald", type: "key", stats: {}, description: "A vivid green gemstone associated with nature.", value: 50 },
];

// Crafting material items (boss drops / rare finds)
export const CRAFT_MATERIALS: RPGItem[] = [
  {
    id: "craft_crown_shard",
    name: "Crown Shard",
    type: "key",
    stats: {},
    description: "A fragment of the Shattered Crown. Radiates ancient power.",
    value: 0,
  },
  {
    id: "craft_dragon_heart",
    name: "Dragon Heart",
    type: "key",
    stats: {},
    description: "The still-burning heart of a dragon. Pulses with fire.",
    value: 0,
  },
  {
    id: "craft_lich_phylactery",
    name: "Lich Phylactery",
    type: "key",
    stats: {},
    description: "The vessel that once held the Lich Lord's soul.",
    value: 0,
  },
  {
    id: "craft_demon_core",
    name: "Demon Core",
    type: "key",
    stats: {},
    description: "A crystallized shard of demonic essence.",
    value: 0,
  },
  {
    id: "craft_void_essence",
    name: "Void Essence",
    type: "key",
    stats: {},
    description: "Pure concentrated darkness from The Dark One.",
    value: 0,
  },
];

export const CRAFTING_RECIPES: CraftingRecipe[] = [
  // =========================================================================
  // Common recipes — Weapons (forge)
  // =========================================================================
  {
    id: "recipe_iron_sword",
    name: "Iron Sword",
    description: "A reliable sword forged from iron ore and wood.",
    station: "forge",
    ingredients: [
      { itemId: "mat_iron_ore", quantity: 2 },
      { itemId: "mat_wood", quantity: 1 },
    ],
    result: {
      id: "crafted_iron_sword", name: "Iron Sword", type: "weapon",
      stats: { atk: 6 }, description: "A sturdy iron sword. T1 crafted weapon.", value: 60,
    },
  },
  {
    id: "recipe_steel_blade",
    name: "Steel Blade",
    description: "A finely forged steel blade wrapped in leather.",
    station: "forge",
    ingredients: [
      { itemId: "mat_steel_ingot", quantity: 2 },
      { itemId: "mat_leather", quantity: 1 },
    ],
    result: {
      id: "crafted_steel_blade", name: "Steel Blade", type: "weapon",
      stats: { atk: 12 }, description: "A razor-sharp steel blade. T2 crafted weapon.", value: 150,
    },
  },
  {
    id: "recipe_dragonbone_axe",
    name: "Dragonbone Axe",
    description: "A fearsome axe reinforced with dragon scales.",
    station: "forge",
    ingredients: [
      { itemId: "mat_steel_ingot", quantity: 3 },
      { itemId: "mat_dragon_scale", quantity: 2 },
      { itemId: "mat_wood", quantity: 1 },
    ],
    result: {
      id: "crafted_dragonbone_axe", name: "Dragonbone Axe", type: "weapon",
      stats: { atk: 20, critChance: 0.05 }, description: "An axe edged with dragon bone. T3 crafted weapon.", value: 400,
    },
  },
  // =========================================================================
  // Common recipes — Armor (forge)
  // =========================================================================
  {
    id: "recipe_leather_armor",
    name: "Leather Armor",
    description: "Light armor sewn from tanned leather.",
    station: "forge",
    ingredients: [
      { itemId: "mat_leather", quantity: 3 },
      { itemId: "mat_thread", quantity: 1 },
    ],
    result: {
      id: "crafted_leather_armor", name: "Leather Armor", type: "armor",
      stats: { def: 4, speed: 1 }, description: "Flexible leather armor. T1 crafted armor.", value: 55,
    },
  },
  {
    id: "recipe_chain_mail",
    name: "Chain Mail",
    description: "Interlocking iron rings woven with strong thread.",
    station: "forge",
    ingredients: [
      { itemId: "mat_iron_ore", quantity: 5 },
      { itemId: "mat_thread", quantity: 2 },
    ],
    result: {
      id: "crafted_chain_mail", name: "Chain Mail", type: "armor",
      stats: { def: 8, hp: 10 }, description: "Sturdy chain mail. T2 crafted armor.", value: 130,
    },
  },
  {
    id: "recipe_dragonscale_plate",
    name: "Dragonscale Plate",
    description: "Heavy plate armor reinforced with dragon scales.",
    station: "forge",
    ingredients: [
      { itemId: "mat_dragon_scale", quantity: 3 },
      { itemId: "mat_steel_ingot", quantity: 2 },
      { itemId: "mat_thread", quantity: 2 },
    ],
    result: {
      id: "crafted_dragonscale_plate", name: "Dragonscale Plate", type: "armor",
      stats: { def: 16, hp: 25 }, description: "Nearly impenetrable plate armor. T3 crafted armor.", value: 500,
    },
  },
  {
    id: "recipe_iron_shield",
    name: "Iron Shield",
    description: "A solid iron shield with a wooden grip.",
    station: "forge",
    ingredients: [
      { itemId: "mat_iron_ore", quantity: 3 },
      { itemId: "mat_wood", quantity: 2 },
    ],
    result: {
      id: "crafted_iron_shield", name: "Iron Shield", type: "shield",
      stats: { def: 5, block: 0.1 }, description: "A dependable iron shield. T1 crafted shield.", value: 70,
    },
  },
  // =========================================================================
  // Common recipes — Potions (alchemy)
  // =========================================================================
  {
    id: "recipe_health_potion",
    name: "Health Potion",
    description: "A potion brewed from herbs and pure water.",
    station: "alchemy",
    ingredients: [
      { itemId: "mat_herb", quantity: 2 },
      { itemId: "mat_water", quantity: 1 },
    ],
    result: {
      id: "health_potion", name: "Health Potion", type: "consumable",
      stats: { hp: 50 }, description: "Restores 50 HP.", value: 25,
    },
  },
  {
    id: "recipe_mana_potion",
    name: "Mana Potion",
    description: "A potion infused with crystallized mana.",
    station: "alchemy",
    ingredients: [
      { itemId: "mat_crystal", quantity: 2 },
      { itemId: "mat_water", quantity: 1 },
    ],
    result: {
      id: "mana_potion", name: "Mana Potion", type: "consumable",
      stats: { mp: 30 }, description: "Restores 30 MP.", value: 30,
    },
  },
  {
    id: "recipe_greater_health_potion",
    name: "Greater Health Potion",
    description: "A potent healing draught brewed with rare herbs.",
    station: "alchemy",
    ingredients: [
      { itemId: "mat_herb", quantity: 4 },
      { itemId: "mat_water", quantity: 2 },
      { itemId: "mat_crystal", quantity: 1 },
    ],
    result: {
      id: "greater_health_potion", name: "Greater Health Potion", type: "consumable",
      stats: { hp: 150 }, description: "Restores 150 HP.", value: 80,
    },
  },
  {
    id: "recipe_antidote",
    name: "Antidote",
    description: "A cleansing tonic that cures poison.",
    station: "alchemy",
    ingredients: [
      { itemId: "mat_herb", quantity: 3 },
      { itemId: "mat_water", quantity: 1 },
    ],
    result: {
      id: "crafted_antidote", name: "Antidote", type: "consumable",
      stats: {}, description: "Cures poison status.", value: 20,
    },
  },
  {
    id: "recipe_phoenix_elixir",
    name: "Phoenix Elixir",
    description: "A legendary elixir that revives fallen allies.",
    station: "alchemy",
    ingredients: [
      { itemId: "mat_phoenix_feather", quantity: 1 },
      { itemId: "mat_herb", quantity: 3 },
      { itemId: "mat_water", quantity: 2 },
    ],
    result: {
      id: "crafted_phoenix_elixir", name: "Phoenix Elixir", type: "consumable",
      stats: { hp: 9999 }, description: "Revives a fallen ally with full HP.", value: 300,
    },
  },
  // =========================================================================
  // Common recipes — Accessories (enchanter)
  // =========================================================================
  {
    id: "recipe_amulet_of_fire",
    name: "Amulet of Fire",
    description: "An amulet set with a ruby that radiates warmth.",
    station: "enchanter",
    ingredients: [
      { itemId: "mat_ruby", quantity: 1 },
      { itemId: "mat_gold_chain", quantity: 1 },
    ],
    result: {
      id: "crafted_amulet_fire", name: "Amulet of Fire", type: "accessory",
      stats: { atk: 5, hp: 10 }, description: "An amulet that enhances fire affinity. T2 crafted accessory.", value: 120,
    },
  },
  {
    id: "recipe_ring_of_speed",
    name: "Ring of Speed",
    description: "A silver ring enchanted with haste magic.",
    station: "enchanter",
    ingredients: [
      { itemId: "mat_sapphire", quantity: 1 },
      { itemId: "mat_silver", quantity: 1 },
    ],
    result: {
      id: "crafted_ring_speed", name: "Ring of Speed", type: "ring",
      stats: { speed: 2 }, description: "A ring that quickens the wearer. T2 crafted ring.", value: 110,
    },
  },
  {
    id: "recipe_emerald_pendant",
    name: "Emerald Pendant",
    description: "A pendant of living green that bolsters vitality.",
    station: "enchanter",
    ingredients: [
      { itemId: "mat_emerald", quantity: 1 },
      { itemId: "mat_gold_chain", quantity: 1 },
    ],
    result: {
      id: "crafted_emerald_pendant", name: "Emerald Pendant", type: "accessory",
      stats: { hp: 20, def: 3 }, description: "A pendant that boosts vitality. T2 crafted accessory.", value: 115,
    },
  },
  {
    id: "recipe_shadow_cloak",
    name: "Shadow Cloak",
    description: "A cloak of shadow silk that makes the wearer harder to hit.",
    station: "enchanter",
    ingredients: [
      { itemId: "mat_shadow_silk", quantity: 2 },
      { itemId: "mat_thread", quantity: 2 },
    ],
    result: {
      id: "crafted_shadow_cloak", name: "Shadow Cloak", type: "armor",
      stats: { def: 6, speed: 2, critChance: 0.05 }, description: "A cloak woven from shadows. T3 crafted armor.", value: 250,
    },
  },
  {
    id: "recipe_crystal_staff",
    name: "Crystal Staff",
    description: "A staff crowned with a mana crystal. Perfect for spellcasters.",
    station: "enchanter",
    ingredients: [
      { itemId: "mat_crystal", quantity: 3 },
      { itemId: "mat_wood", quantity: 2 },
    ],
    result: {
      id: "crafted_crystal_staff", name: "Crystal Staff", type: "weapon",
      stats: { atk: 8, mp: 15 }, description: "A staff that amplifies magic. T2 crafted weapon.", value: 140,
    },
  },
  // =========================================================================
  // Legendary recipes (boss drops)
  // =========================================================================
  {
    id: "recipe_crown_of_flames",
    name: "Crown of Flames",
    description: "A blazing crown forged from dragon fire and a shard of the ancient Crown.",
    ingredients: [
      { itemId: "craft_dragon_heart", quantity: 1 },
      { itemId: "craft_crown_shard", quantity: 1 },
    ],
    result: {
      id: "crown_of_flames",
      name: "Crown of Flames",
      type: "helmet",
      stats: { atk: 15, def: 8, hp: 30 },
      description: "A crown wreathed in eternal dragonfire. T5 legendary helmet.",
      value: 5000,
    },
  },
  {
    id: "recipe_staff_of_undeath",
    name: "Staff of Undeath",
    description: "A staff that channels the boundary between life and death.",
    ingredients: [
      { itemId: "craft_lich_phylactery", quantity: 1 },
      { itemId: "craft_crown_shard", quantity: 1 },
    ],
    result: {
      id: "staff_of_undeath",
      name: "Staff of Undeath",
      type: "weapon",
      stats: { atk: 25, mp: 20 },
      description: "A staff pulsing with necrotic energy. T5 legendary weapon.",
      value: 5000,
    },
  },
  {
    id: "recipe_infernal_plate",
    name: "Infernal Plate",
    description: "Armor forged in hellfire, nearly indestructible.",
    ingredients: [
      { itemId: "craft_demon_core", quantity: 1 },
      { itemId: "craft_crown_shard", quantity: 1 },
    ],
    result: {
      id: "infernal_plate",
      name: "Infernal Plate",
      type: "armor",
      stats: { def: 20, hp: 50 },
      description: "Plate armor infused with demonic resilience. T5 legendary armor.",
      value: 5000,
    },
  },
  {
    id: "recipe_hellfire_blade",
    name: "Hellfire Blade",
    description: "A sword that burns with the fires of the abyss.",
    ingredients: [
      { itemId: "craft_dragon_heart", quantity: 1 },
      { itemId: "craft_demon_core", quantity: 1 },
    ],
    result: {
      id: "hellfire_blade",
      name: "Hellfire Blade",
      type: "weapon",
      stats: { atk: 30, critChance: 0.1 },
      description: "A blade forged from dragon fire and demon essence. T5 legendary weapon.",
      value: 5500,
    },
  },
  {
    id: "recipe_cloak_of_shadows",
    name: "Cloak of Shadows",
    description: "A cloak woven from pure darkness and lingering death.",
    ingredients: [
      { itemId: "craft_lich_phylactery", quantity: 1 },
      { itemId: "craft_void_essence", quantity: 1 },
    ],
    result: {
      id: "cloak_of_shadows",
      name: "Cloak of Shadows",
      type: "armor",
      stats: { def: 12, speed: 2, critChance: 0.05 },
      description: "A cloak that bends light and shadow around its wearer. T5 legendary armor.",
      value: 5000,
    },
  },
  {
    id: "recipe_orb_of_creation",
    name: "Orb of Creation",
    description: "An orb that holds a fragment of the Crown's creative power.",
    ingredients: [
      { itemId: "craft_void_essence", quantity: 1 },
      { itemId: "craft_crown_shard", quantity: 1 },
    ],
    result: {
      id: "orb_of_creation",
      name: "Orb of Creation",
      type: "accessory",
      stats: { atk: 10, def: 10, mp: 15 },
      description: "An orb swirling with primordial energy. T5 legendary accessory.",
      value: 5000,
    },
  },
  {
    id: "recipe_phoenix_mail",
    name: "Phoenix Mail",
    description: "Armor blessed by dragonfire and defying death itself.",
    ingredients: [
      { itemId: "craft_dragon_heart", quantity: 1 },
      { itemId: "craft_lich_phylactery", quantity: 1 },
    ],
    result: {
      id: "phoenix_mail",
      name: "Phoenix Mail",
      type: "armor",
      stats: { def: 18, hp: 40 },
      description: "Armor that glows with the warmth of rebirth. T5 legendary armor.",
      value: 5200,
    },
  },
  {
    id: "recipe_abyssal_ring",
    name: "Abyssal Ring",
    description: "A ring that channels the power of the void.",
    ingredients: [
      { itemId: "craft_demon_core", quantity: 1 },
      { itemId: "craft_void_essence", quantity: 1 },
    ],
    result: {
      id: "abyssal_ring",
      name: "Abyssal Ring",
      type: "ring",
      stats: { atk: 8, critChance: 0.15 },
      description: "A ring that pulses with abyssal energy. T5 legendary ring.",
      value: 4800,
    },
  },
  {
    id: "recipe_crown_of_unity",
    name: "Crown of Unity",
    description: "The legendary Crown reforged from all five shards. The ultimate artifact.",
    ingredients: [
      { itemId: "craft_crown_shard", quantity: 1 },
      { itemId: "craft_dragon_heart", quantity: 1 },
      { itemId: "craft_lich_phylactery", quantity: 1 },
      { itemId: "craft_demon_core", quantity: 1 },
      { itemId: "craft_void_essence", quantity: 1 },
    ],
    result: {
      id: "crown_of_unity",
      name: "Crown of Unity",
      type: "helmet",
      stats: { atk: 20, def: 20, hp: 50, mp: 30 },
      description: "The Crown of Unity, reforged at last. Its light banishes all darkness. T6 legendary helmet.",
      value: 99999,
    },
  },
];
