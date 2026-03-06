import type { RPGItem } from "@rpg/state/RPGState";

export interface CraftingRecipe {
  id: string;
  name: string;
  description: string;
  ingredients: { itemId: string; quantity: number }[];
  result: RPGItem;
}

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
