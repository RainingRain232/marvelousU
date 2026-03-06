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
];

export const MID_TOWN_SHOP: RPGItem[] = [
  ITEM_HEALTH_POTION,
  ITEM_GREATER_HEALTH_POTION,
  ITEM_MANA_POTION,
  ITEM_FIRE_SCROLL,
  ITEM_STEEL_SWORD,
  ITEM_MAGIC_STAFF,
  ITEM_CHAINMAIL,
  ITEM_SPEED_RING,
  ITEM_HEALTH_AMULET,
];

export const LATE_TOWN_SHOP: RPGItem[] = [
  ITEM_GREATER_HEALTH_POTION,
  ITEM_MANA_POTION,
  ITEM_FIRE_SCROLL,
  ITEM_WAR_AXE,
  ITEM_PLATE_ARMOR,
  ITEM_SPEED_RING,
  ITEM_HEALTH_AMULET,
];
