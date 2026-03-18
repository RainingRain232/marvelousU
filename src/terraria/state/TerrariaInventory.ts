// ---------------------------------------------------------------------------
// Terraria – Inventory system
// ---------------------------------------------------------------------------

import { BlockType, ToolType, ToolMaterial } from "../config/TerrariaBlockDefs";

// ---------------------------------------------------------------------------
// Item types
// ---------------------------------------------------------------------------

export enum ItemCategory {
  BLOCK = 0,
  TOOL,
  WEAPON,
  ARMOR,
  CONSUMABLE,
  MATERIAL,
  SPECIAL,
}

export interface ItemStack {
  category: ItemCategory;
  blockType?: BlockType;
  toolType?: ToolType;
  toolMaterial?: ToolMaterial;
  specialId?: string;
  count: number;
  durability?: number;
  maxDurability?: number;
  displayName: string;
  color: number;
  damage?: number;
  defense?: number;
}

export interface ArmorSlots {
  helmet: ItemStack | null;
  chestplate: ItemStack | null;
  leggings: ItemStack | null;
  boots: ItemStack | null;
}

export interface TerrariaInventory {
  hotbar: (ItemStack | null)[];
  main: (ItemStack | null)[];     // 3 rows x 9 cols = 27 slots
  selectedSlot: number;
  armor: ArmorSlots;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createInventory(): TerrariaInventory {
  return {
    hotbar: new Array(9).fill(null),
    main: new Array(27).fill(null),
    selectedSlot: 0,
    armor: { helmet: null, chestplate: null, leggings: null, boots: null },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getHeldItem(inv: TerrariaInventory): ItemStack | null {
  return inv.hotbar[inv.selectedSlot];
}

export function itemsMatch(a: ItemStack, b: ItemStack): boolean {
  if (a.category !== b.category) return false;
  if (a.category === ItemCategory.BLOCK) return a.blockType === b.blockType;
  if (a.category === ItemCategory.TOOL || a.category === ItemCategory.WEAPON) {
    return a.toolType === b.toolType && a.toolMaterial === b.toolMaterial;
  }
  if (a.specialId || b.specialId) return a.specialId === b.specialId;
  return a.displayName === b.displayName;
}

export function addToInventory(inv: TerrariaInventory, item: ItemStack): boolean {
  const maxStack = 64;

  // Try to stack into existing matching slots (hotbar first, then main)
  const slotArrays = [inv.hotbar, inv.main];
  for (const arr of slotArrays) {
    for (let i = 0; i < arr.length; i++) {
      const slot = arr[i];
      if (slot && itemsMatch(slot, item) && slot.count < maxStack) {
        const canAdd = Math.min(item.count, maxStack - slot.count);
        slot.count += canAdd;
        item.count -= canAdd;
        if (item.count <= 0) return true;
      }
    }
  }

  // Find empty slot
  for (const arr of slotArrays) {
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] === null) {
        arr[i] = { ...item };
        return true;
      }
    }
  }
  return false;
}

export function removeFromSlot(inv: TerrariaInventory, isHotbar: boolean, index: number, count = 1): void {
  const arr = isHotbar ? inv.hotbar : inv.main;
  const slot = arr[index];
  if (!slot) return;
  slot.count -= count;
  if (slot.count <= 0) arr[index] = null;
}

export function createBlockItem(blockType: BlockType, name: string, color: number, count = 1): ItemStack {
  return { category: ItemCategory.BLOCK, blockType, count, displayName: name, color };
}

export function createToolItem(toolType: ToolType, material: ToolMaterial, name: string, color: number, damage?: number): ItemStack {
  const durabilities: Record<number, number> = { 0: 60, 1: 120, 2: 250, 3: 400, 4: 800, 5: 9999 };
  const dur = durabilities[material] ?? 100;
  return {
    category: toolType === ToolType.SWORD || toolType === ToolType.BOW || toolType === ToolType.STAFF ? ItemCategory.WEAPON : ItemCategory.TOOL,
    toolType, toolMaterial: material, count: 1,
    displayName: name, color, damage,
    durability: dur, maxDurability: dur,
  };
}
