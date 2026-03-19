// ---------------------------------------------------------------------------
// Camelot Craft – Inventory system
// ---------------------------------------------------------------------------

import { CB } from "../config/CraftBalance";
import { BlockType, BLOCK_DEFS } from "../config/CraftBlockDefs";
import { ItemType, type ItemStack } from "../config/CraftRecipeDefs";

export interface ArmorSlots {
  helmet: ItemStack | null;
  chestplate: ItemStack | null;
  leggings: ItemStack | null;
  boots: ItemStack | null;
  weapon: ItemStack | null;
}

export interface CraftInventory {
  /** Hotbar: first HOTBAR_SLOTS items. */
  hotbar: (ItemStack | null)[];
  /** Main inventory grid. */
  main: (ItemStack | null)[];
  /** Currently selected hotbar slot (0-based). */
  selectedSlot: number;
  /** 3x3 crafting grid (flattened). null = empty. */
  craftGrid: (ItemStack | null)[];
  /** Crafting result slot. */
  craftResult: ItemStack | null;
  /** Armor equipment slots. */
  armor: ArmorSlots;
}

/** Create a fresh inventory with starter items. */
export function createInventory(): CraftInventory {
  const hotbar: (ItemStack | null)[] = new Array(CB.HOTBAR_SLOTS).fill(null);
  const main: (ItemStack | null)[] = new Array(CB.INVENTORY_ROWS * CB.INVENTORY_COLS).fill(null);
  const craftGrid: (ItemStack | null)[] = new Array(CB.CRAFT_GRID_SIZE * CB.CRAFT_GRID_SIZE).fill(null);

  return {
    hotbar,
    main,
    selectedSlot: 0,
    craftGrid,
    craftResult: null,
    armor: { helmet: null, chestplate: null, leggings: null, boots: null, weapon: null },
  };
}

/** Get the item currently held (selected hotbar slot). */
export function getHeldItem(inv: CraftInventory): ItemStack | null {
  return inv.hotbar[inv.selectedSlot];
}

/** Create a block item stack. */
export function blockStack(block: BlockType, count: number): ItemStack {
  const def = BLOCK_DEFS[block];
  return {
    itemType: ItemType.BLOCK,
    blockType: block,
    count,
    displayName: def?.name ?? "Unknown",
    color: def?.color ?? 0xFFFFFF,
  };
}

/** Try to add an item stack to the inventory. Returns leftover count. */
export function addToInventory(inv: CraftInventory, item: ItemStack): number {
  let remaining = item.count;

  // First pass: try to stack with existing items in hotbar then main
  const allSlots = [...inv.hotbar, ...inv.main];
  const setSlot = (i: number, stack: ItemStack | null) => {
    if (i < CB.HOTBAR_SLOTS) inv.hotbar[i] = stack;
    else inv.main[i - CB.HOTBAR_SLOTS] = stack;
  };

  for (let i = 0; i < allSlots.length && remaining > 0; i++) {
    const slot = i < CB.HOTBAR_SLOTS ? inv.hotbar[i] : inv.main[i - CB.HOTBAR_SLOTS];
    if (slot && canStack(slot, item) && slot.count < CB.MAX_STACK_SIZE) {
      const space = CB.MAX_STACK_SIZE - slot.count;
      const add = Math.min(space, remaining);
      slot.count += add;
      remaining -= add;
    }
  }

  // Second pass: find empty slots
  for (let i = 0; i < allSlots.length && remaining > 0; i++) {
    const slot = i < CB.HOTBAR_SLOTS ? inv.hotbar[i] : inv.main[i - CB.HOTBAR_SLOTS];
    if (!slot) {
      const add = Math.min(CB.MAX_STACK_SIZE, remaining);
      setSlot(i, { ...item, count: add });
      remaining -= add;
    }
  }

  return remaining;
}

/** Remove count items of a specific block type from inventory. Returns actual removed count. */
export function removeFromInventory(inv: CraftInventory, blockType: BlockType, count: number): number {
  let toRemove = count;

  const tryRemove = (slots: (ItemStack | null)[]) => {
    for (let i = 0; i < slots.length && toRemove > 0; i++) {
      const s = slots[i];
      if (s && s.itemType === ItemType.BLOCK && s.blockType === blockType) {
        const remove = Math.min(s.count, toRemove);
        s.count -= remove;
        toRemove -= remove;
        if (s.count <= 0) slots[i] = null;
      }
    }
  };

  tryRemove(inv.hotbar);
  tryRemove(inv.main);

  return count - toRemove;
}

/** Count total of a specific block type in inventory. */
export function countInInventory(inv: CraftInventory, blockType: BlockType): number {
  let total = 0;
  const check = (slots: (ItemStack | null)[]) => {
    for (const s of slots) {
      if (s && s.itemType === ItemType.BLOCK && s.blockType === blockType) total += s.count;
    }
  };
  check(inv.hotbar);
  check(inv.main);
  return total;
}

/** Check if two item stacks can be combined. */
function canStack(a: ItemStack, b: ItemStack): boolean {
  if (a.itemType !== b.itemType) return false;
  if (a.itemType === ItemType.BLOCK && b.itemType === ItemType.BLOCK) {
    return a.blockType === b.blockType;
  }
  if (a.itemType === ItemType.SPECIAL && b.itemType === ItemType.SPECIAL) {
    return a.specialId === b.specialId;
  }
  if (a.itemType === ItemType.FOOD && b.itemType === ItemType.FOOD) {
    return a.specialId === b.specialId;
  }
  // Tools and weapons don't stack
  return false;
}

/** Consume 1 durability from held item. Removes it if broken. */
export function consumeDurability(inv: CraftInventory): void {
  const item = inv.hotbar[inv.selectedSlot];
  if (!item || item.durability === undefined) return;
  item.durability--;
  if (item.durability <= 0) {
    inv.hotbar[inv.selectedSlot] = null;
  }
}
