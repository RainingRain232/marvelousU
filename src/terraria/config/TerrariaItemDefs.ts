// ---------------------------------------------------------------------------
// Terraria – Item definitions (tools, weapons, special items)
// ---------------------------------------------------------------------------

import { ToolType, ToolMaterial } from "./TerrariaBlockDefs";
import { ItemCategory, createToolItem } from "../state/TerrariaInventory";
import type { ItemStack } from "../state/TerrariaInventory";

// ---------------------------------------------------------------------------
// Tool damage values by material
// ---------------------------------------------------------------------------

const MATERIAL_DAMAGE: Record<number, number> = {
  [ToolMaterial.WOOD]: 5,
  [ToolMaterial.STONE]: 8,
  [ToolMaterial.IRON]: 12,
  [ToolMaterial.GOLD]: 10,
  [ToolMaterial.CRYSTAL]: 18,
  [ToolMaterial.EXCALIBUR]: 50,
};

const MATERIAL_NAMES: Record<number, string> = {
  [ToolMaterial.WOOD]: "Wooden",
  [ToolMaterial.STONE]: "Stone",
  [ToolMaterial.IRON]: "Iron",
  [ToolMaterial.GOLD]: "Gold",
  [ToolMaterial.CRYSTAL]: "Crystal",
  [ToolMaterial.EXCALIBUR]: "Excalibur",
};

const MATERIAL_COLORS: Record<number, number> = {
  [ToolMaterial.WOOD]: 0xC4A35A,
  [ToolMaterial.STONE]: 0x808080,
  [ToolMaterial.IRON]: 0xB0B0B0,
  [ToolMaterial.GOLD]: 0xFFD700,
  [ToolMaterial.CRYSTAL]: 0xAA44FF,
  [ToolMaterial.EXCALIBUR]: 0xFFFFCC,
};

const TOOL_NAMES: Record<number, string> = {
  [ToolType.PICKAXE]: "Pickaxe",
  [ToolType.AXE]: "Axe",
  [ToolType.SHOVEL]: "Shovel",
  [ToolType.SWORD]: "Sword",
  [ToolType.HAMMER]: "Hammer",
  [ToolType.BOW]: "Bow",
  [ToolType.STAFF]: "Staff",
};

// ---------------------------------------------------------------------------
// Factory functions for items
// ---------------------------------------------------------------------------

export function makeToolItem(toolType: ToolType, material: ToolMaterial): ItemStack {
  const name = `${MATERIAL_NAMES[material]} ${TOOL_NAMES[toolType]}`;
  const color = MATERIAL_COLORS[material];
  const damage = toolType === ToolType.SWORD ? MATERIAL_DAMAGE[material] : Math.floor(MATERIAL_DAMAGE[material] * 0.5);
  return createToolItem(toolType, material, name, color, damage);
}

export function makeSwordItem(material: ToolMaterial): ItemStack {
  return makeToolItem(ToolType.SWORD, material);
}

export function makeExcaliburItem(): ItemStack {
  const item = createToolItem(ToolType.SWORD, ToolMaterial.EXCALIBUR, "Excalibur", 0xFFFFCC, 50);
  item.specialId = "excalibur";
  return item;
}

export function makeBowItem(material: ToolMaterial): ItemStack {
  const name = `${MATERIAL_NAMES[material]} Bow`;
  const color = MATERIAL_COLORS[material];
  return createToolItem(ToolType.BOW, material, name, color, MATERIAL_DAMAGE[material]);
}

export function makeStaffItem(material: ToolMaterial): ItemStack {
  const name = `${MATERIAL_NAMES[material]} Staff`;
  const color = MATERIAL_COLORS[material];
  return createToolItem(ToolType.STAFF, material, name, color, Math.floor(MATERIAL_DAMAGE[material] * 1.2));
}

// ---------------------------------------------------------------------------
// Special items
// ---------------------------------------------------------------------------

export function makeGrailItem(): ItemStack {
  return {
    category: ItemCategory.SPECIAL,
    specialId: "grail",
    count: 1,
    displayName: "Holy Grail",
    color: 0xFFD700,
  };
}

export function makeFoodItem(name: string, healAmount: number): ItemStack {
  return {
    category: ItemCategory.CONSUMABLE,
    specialId: `food_${name.toLowerCase().replace(/\s/g, "_")}`,
    count: 1,
    displayName: name,
    color: 0xCC8844,
    damage: healAmount, // Reuse damage field for heal amount
  };
}
