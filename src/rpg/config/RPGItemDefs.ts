// RPG item definitions
import { AbilityType } from "@/types";
import type { RPGItem } from "@rpg/state/RPGState";

// ---------------------------------------------------------------------------
// Consumables
// ---------------------------------------------------------------------------

export const ITEM_HEALTH_POTION: RPGItem = {
  id: "health_potion",
  name: "Health Potion",
  type: "consumable",
  stats: { hp: 50 },
  description: "Restores 50 HP to one ally.",
  value: 25,
};

export const ITEM_GREATER_HEALTH_POTION: RPGItem = {
  id: "greater_health_potion",
  name: "Greater Health Potion",
  type: "consumable",
  stats: { hp: 150 },
  description: "Restores 150 HP to one ally.",
  value: 80,
};

export const ITEM_MANA_POTION: RPGItem = {
  id: "mana_potion",
  name: "Mana Potion",
  type: "consumable",
  stats: { mp: 30 },
  description: "Restores 30 MP to one ally.",
  value: 30,
};

export const ITEM_ANTIDOTE: RPGItem = {
  id: "antidote",
  name: "Antidote",
  type: "consumable",
  stats: {},
  description: "Cures poison.",
  value: 15,
};

export const ITEM_FIRE_SCROLL: RPGItem = {
  id: "fire_scroll",
  name: "Fire Scroll",
  type: "consumable",
  stats: {},
  description: "Casts Fireball on all enemies.",
  abilityType: AbilityType.FIREBALL,
  value: 60,
};

// ---------------------------------------------------------------------------
// Weapons
// ---------------------------------------------------------------------------

export const ITEM_IRON_SWORD: RPGItem = {
  id: "iron_sword",
  name: "Iron Sword",
  type: "weapon",
  stats: { atk: 5 },
  description: "A sturdy iron blade.",
  value: 50,
};

export const ITEM_STEEL_SWORD: RPGItem = {
  id: "steel_sword",
  name: "Steel Sword",
  type: "weapon",
  stats: { atk: 12 },
  description: "A finely forged steel sword.",
  value: 150,
};

export const ITEM_MAGIC_STAFF: RPGItem = {
  id: "magic_staff",
  name: "Magic Staff",
  type: "weapon",
  stats: { atk: 8, mp: 15 },
  description: "A staff imbued with arcane power.",
  value: 120,
};

export const ITEM_WAR_AXE: RPGItem = {
  id: "war_axe",
  name: "War Axe",
  type: "weapon",
  stats: { atk: 15 },
  description: "A heavy war axe.",
  value: 200,
};

// ---------------------------------------------------------------------------
// Armor
// ---------------------------------------------------------------------------

export const ITEM_LEATHER_ARMOR: RPGItem = {
  id: "leather_armor",
  name: "Leather Armor",
  type: "armor",
  stats: { def: 4 },
  description: "Simple leather protection.",
  value: 40,
};

export const ITEM_CHAINMAIL: RPGItem = {
  id: "chainmail",
  name: "Chainmail",
  type: "armor",
  stats: { def: 8 },
  description: "Interlocking iron rings.",
  value: 120,
};

export const ITEM_PLATE_ARMOR: RPGItem = {
  id: "plate_armor",
  name: "Plate Armor",
  type: "armor",
  stats: { def: 15, speed: -0.2 },
  description: "Heavy plate. Slower but tough.",
  value: 300,
};

// ---------------------------------------------------------------------------
// Helmets
// ---------------------------------------------------------------------------

export const ITEM_LEATHER_CAP: RPGItem = {
  id: "leather_cap",
  name: "Leather Cap",
  type: "helmet",
  stats: { def: 2 },
  description: "A simple leather cap.",
  value: 25,
};

export const ITEM_IRON_HELM: RPGItem = {
  id: "iron_helm",
  name: "Iron Helm",
  type: "helmet",
  stats: { def: 5 },
  description: "Sturdy iron helmet.",
  value: 80,
};

export const ITEM_GREAT_HELM: RPGItem = {
  id: "great_helm",
  name: "Great Helm",
  type: "helmet",
  stats: { def: 9, speed: -0.1 },
  description: "A massive helm. Heavy but protective.",
  value: 200,
};

// ---------------------------------------------------------------------------
// Shields
// ---------------------------------------------------------------------------

export const ITEM_WOODEN_SHIELD: RPGItem = {
  id: "wooden_shield",
  name: "Wooden Shield",
  type: "shield",
  stats: { def: 3 },
  description: "A basic wooden shield.",
  value: 30,
};

export const ITEM_IRON_SHIELD: RPGItem = {
  id: "iron_shield",
  name: "Iron Shield",
  type: "shield",
  stats: { def: 7 },
  description: "A solid iron shield.",
  value: 100,
};

export const ITEM_TOWER_SHIELD: RPGItem = {
  id: "tower_shield",
  name: "Tower Shield",
  type: "shield",
  stats: { def: 12, speed: -0.2 },
  description: "Massive tower shield. Very heavy.",
  value: 250,
};

// ---------------------------------------------------------------------------
// Legs
// ---------------------------------------------------------------------------

export const ITEM_CLOTH_PANTS: RPGItem = {
  id: "cloth_pants",
  name: "Cloth Pants",
  type: "legs",
  stats: { def: 1 },
  description: "Simple cloth legwear.",
  value: 20,
};

export const ITEM_CHAIN_LEGGINGS: RPGItem = {
  id: "chain_leggings",
  name: "Chain Leggings",
  type: "legs",
  stats: { def: 5 },
  description: "Chainmail leg protection.",
  value: 90,
};

export const ITEM_PLATE_GREAVES: RPGItem = {
  id: "plate_greaves",
  name: "Plate Greaves",
  type: "legs",
  stats: { def: 10, speed: -0.1 },
  description: "Heavy plate leg armor.",
  value: 220,
};

// ---------------------------------------------------------------------------
// Boots
// ---------------------------------------------------------------------------

export const ITEM_SANDALS: RPGItem = {
  id: "sandals",
  name: "Sandals",
  type: "boots",
  stats: { speed: 0.1 },
  description: "Light and breezy.",
  value: 15,
};

export const ITEM_LEATHER_BOOTS: RPGItem = {
  id: "leather_boots",
  name: "Leather Boots",
  type: "boots",
  stats: { def: 2, speed: 0.2 },
  description: "Sturdy leather boots.",
  value: 50,
};

export const ITEM_IRON_GREAVES: RPGItem = {
  id: "iron_greaves",
  name: "Iron Greaves",
  type: "boots",
  stats: { def: 5, speed: -0.1 },
  description: "Heavy iron boots.",
  value: 140,
};

export const ITEM_WINGED_BOOTS: RPGItem = {
  id: "winged_boots",
  name: "Winged Boots",
  type: "boots",
  stats: { speed: 0.5, def: 3 },
  description: "Enchanted boots that grant great speed.",
  value: 280,
};

// ---------------------------------------------------------------------------
// Rings
// ---------------------------------------------------------------------------

export const ITEM_COPPER_RING: RPGItem = {
  id: "copper_ring",
  name: "Copper Ring",
  type: "ring",
  stats: { atk: 2 },
  description: "A simple copper ring.",
  value: 30,
};

export const ITEM_SILVER_RING: RPGItem = {
  id: "silver_ring",
  name: "Silver Ring",
  type: "ring",
  stats: { atk: 4, def: 2 },
  description: "A polished silver ring.",
  value: 100,
};

export const ITEM_GOLD_RING: RPGItem = {
  id: "gold_ring",
  name: "Gold Ring",
  type: "ring",
  stats: { atk: 6, def: 4, hp: 20 },
  description: "A gleaming gold ring of power.",
  value: 250,
};

// ---------------------------------------------------------------------------
// Accessories
// ---------------------------------------------------------------------------

export const ITEM_SPEED_RING: RPGItem = {
  id: "speed_ring",
  name: "Ring of Haste",
  type: "accessory",
  stats: { speed: 0.5 },
  description: "Increases speed.",
  value: 100,
};

export const ITEM_HEALTH_AMULET: RPGItem = {
  id: "health_amulet",
  name: "Amulet of Vitality",
  type: "accessory",
  stats: { hp: 30 },
  description: "Increases max HP by 30.",
  value: 80,
};

// ---------------------------------------------------------------------------
// All items registry
// ---------------------------------------------------------------------------

export const ALL_RPG_ITEMS: Record<string, RPGItem> = {
  // Consumables
  health_potion: ITEM_HEALTH_POTION,
  greater_health_potion: ITEM_GREATER_HEALTH_POTION,
  mana_potion: ITEM_MANA_POTION,
  antidote: ITEM_ANTIDOTE,
  fire_scroll: ITEM_FIRE_SCROLL,
  // Weapons
  iron_sword: ITEM_IRON_SWORD,
  steel_sword: ITEM_STEEL_SWORD,
  magic_staff: ITEM_MAGIC_STAFF,
  war_axe: ITEM_WAR_AXE,
  // Armor
  leather_armor: ITEM_LEATHER_ARMOR,
  chainmail: ITEM_CHAINMAIL,
  plate_armor: ITEM_PLATE_ARMOR,
  // Helmets
  leather_cap: ITEM_LEATHER_CAP,
  iron_helm: ITEM_IRON_HELM,
  great_helm: ITEM_GREAT_HELM,
  // Shields
  wooden_shield: ITEM_WOODEN_SHIELD,
  iron_shield: ITEM_IRON_SHIELD,
  tower_shield: ITEM_TOWER_SHIELD,
  // Legs
  cloth_pants: ITEM_CLOTH_PANTS,
  chain_leggings: ITEM_CHAIN_LEGGINGS,
  plate_greaves: ITEM_PLATE_GREAVES,
  // Boots
  sandals: ITEM_SANDALS,
  leather_boots: ITEM_LEATHER_BOOTS,
  iron_greaves: ITEM_IRON_GREAVES,
  winged_boots: ITEM_WINGED_BOOTS,
  // Rings
  copper_ring: ITEM_COPPER_RING,
  silver_ring: ITEM_SILVER_RING,
  gold_ring: ITEM_GOLD_RING,
  // Accessories
  speed_ring: ITEM_SPEED_RING,
  health_amulet: ITEM_HEALTH_AMULET,
};

// ---------------------------------------------------------------------------
// Default shop inventories
// ---------------------------------------------------------------------------

export const STARTER_TOWN_SHOP: RPGItem[] = [
  ITEM_HEALTH_POTION,
  ITEM_MANA_POTION,
  ITEM_ANTIDOTE,
  ITEM_IRON_SWORD,
  ITEM_LEATHER_ARMOR,
  ITEM_LEATHER_CAP,
  ITEM_WOODEN_SHIELD,
  ITEM_CLOTH_PANTS,
  ITEM_SANDALS,
  ITEM_COPPER_RING,
];

export const MID_TOWN_SHOP: RPGItem[] = [
  ITEM_HEALTH_POTION,
  ITEM_GREATER_HEALTH_POTION,
  ITEM_MANA_POTION,
  ITEM_FIRE_SCROLL,
  ITEM_STEEL_SWORD,
  ITEM_MAGIC_STAFF,
  ITEM_CHAINMAIL,
  ITEM_IRON_HELM,
  ITEM_IRON_SHIELD,
  ITEM_CHAIN_LEGGINGS,
  ITEM_LEATHER_BOOTS,
  ITEM_SILVER_RING,
  ITEM_SPEED_RING,
  ITEM_HEALTH_AMULET,
];

export const LATE_TOWN_SHOP: RPGItem[] = [
  ITEM_GREATER_HEALTH_POTION,
  ITEM_MANA_POTION,
  ITEM_FIRE_SCROLL,
  ITEM_WAR_AXE,
  ITEM_PLATE_ARMOR,
  ITEM_GREAT_HELM,
  ITEM_TOWER_SHIELD,
  ITEM_PLATE_GREAVES,
  ITEM_IRON_GREAVES,
  ITEM_WINGED_BOOTS,
  ITEM_GOLD_RING,
  ITEM_SPEED_RING,
  ITEM_HEALTH_AMULET,
];
