// ---------------------------------------------------------------------------
// Terraria – Armor definitions
// ---------------------------------------------------------------------------

import { ItemCategory } from "../state/TerrariaInventory";
import type { ItemStack } from "../state/TerrariaInventory";

// ---------------------------------------------------------------------------
// Armor sets
// ---------------------------------------------------------------------------

export interface ArmorSetDef {
  id: string;
  name: string;
  helmet: ItemStack;
  chestplate: ItemStack;
  leggings: ItemStack;
  boots: ItemStack;
  setBonus: string;
  setBonusDefense: number;
}

function armorPiece(name: string, defense: number, color: number, slot: string): ItemStack {
  return {
    category: ItemCategory.ARMOR,
    specialId: `armor_${name.toLowerCase().replace(/\s/g, "_")}_${slot}`,
    count: 1,
    displayName: name,
    color,
    defense,
  };
}

export const ARMOR_SETS: ArmorSetDef[] = [
  {
    id: "leather",
    name: "Leather Armor",
    helmet: armorPiece("Leather Cap", 1, 0x8B6914, "helmet"),
    chestplate: armorPiece("Leather Tunic", 2, 0x8B6914, "chest"),
    leggings: armorPiece("Leather Leggings", 1, 0x8B6914, "legs"),
    boots: armorPiece("Leather Boots", 1, 0x8B6914, "boots"),
    setBonus: "+2 Speed",
    setBonusDefense: 1,
  },
  {
    id: "iron_knight",
    name: "Knight's Armor",
    helmet: armorPiece("Knight's Helm", 3, 0xB0B0B0, "helmet"),
    chestplate: armorPiece("Knight's Chestplate", 5, 0xB0B0B0, "chest"),
    leggings: armorPiece("Knight's Greaves", 3, 0xB0B0B0, "legs"),
    boots: armorPiece("Knight's Sabatons", 2, 0xB0B0B0, "boots"),
    setBonus: "+5 Defense",
    setBonusDefense: 5,
  },
  {
    id: "druid",
    name: "Druid's Robes",
    helmet: armorPiece("Druid's Hood", 2, 0x228B22, "helmet"),
    chestplate: armorPiece("Druid's Robe", 3, 0x228B22, "chest"),
    leggings: armorPiece("Druid's Leggings", 2, 0x228B22, "legs"),
    boots: armorPiece("Druid's Sandals", 1, 0x228B22, "boots"),
    setBonus: "+20 Mana",
    setBonusDefense: 2,
  },
  {
    id: "gold",
    name: "Royal Armor",
    helmet: armorPiece("Royal Crown", 4, 0xFFD700, "helmet"),
    chestplate: armorPiece("Royal Breastplate", 6, 0xFFD700, "chest"),
    leggings: armorPiece("Royal Cuisses", 4, 0xFFD700, "legs"),
    boots: armorPiece("Royal Greaves", 3, 0xFFD700, "boots"),
    setBonus: "+8 Defense, +10 Mana",
    setBonusDefense: 8,
  },
  {
    id: "crystal",
    name: "Crystal Armor",
    helmet: armorPiece("Crystal Circlet", 5, 0xAA44FF, "helmet"),
    chestplate: armorPiece("Crystal Mail", 8, 0xAA44FF, "chest"),
    leggings: armorPiece("Crystal Greaves", 5, 0xAA44FF, "legs"),
    boots: armorPiece("Crystal Sabatons", 4, 0xAA44FF, "boots"),
    setBonus: "+12 Defense, +30 Mana",
    setBonusDefense: 12,
  },
  {
    id: "dragon",
    name: "Dragon Bone Armor",
    helmet: armorPiece("Dragon Helm", 7, 0xCC2222, "helmet"),
    chestplate: armorPiece("Dragon Mail", 10, 0xCC2222, "chest"),
    leggings: armorPiece("Dragon Greaves", 7, 0xCC2222, "legs"),
    boots: armorPiece("Dragon Boots", 5, 0xCC2222, "boots"),
    setBonus: "+15 Defense, Fire Immunity",
    setBonusDefense: 15,
  },
];
