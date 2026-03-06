// Equipment management, shop transactions, and inn rest
// Pure simulation logic — no PixiJS imports
import { EventBus } from "@sim/core/EventBus";
import type { RPGState, RPGItem } from "@rpg/state/RPGState";

// ---------------------------------------------------------------------------
// Equipment
// ---------------------------------------------------------------------------

/** Equip an item from inventory onto a party member. Returns true on success. */
export function equipItem(rpg: RPGState, memberId: string, itemId: string): boolean {
  const member = rpg.party.find(m => m.id === memberId);
  if (!member) return false;

  const slotIndex = rpg.inventory.items.findIndex(s => s.item.id === itemId);
  if (slotIndex < 0) return false;

  const invSlot = rpg.inventory.items[slotIndex];
  const item = invSlot.item;

  // Determine equipment slot
  const slot = _itemTypeToSlot(item.type);
  if (!slot) return false;

  // Unequip current item in that slot first
  const old = member.equipment[slot];
  if (old) {
    _addToInventory(rpg, old);
  }

  // Equip new item
  member.equipment[slot] = item;

  // Remove from inventory
  invSlot.quantity--;
  if (invSlot.quantity <= 0) {
    rpg.inventory.items.splice(slotIndex, 1);
  }

  EventBus.emit("rpgItemEquipped", { memberId, itemId: item.id, slot });
  return true;
}

/** Unequip an item from a party member back to inventory. */
export function unequipItem(
  rpg: RPGState,
  memberId: string,
  slot: keyof import("@rpg/state/RPGState").EquipmentSlots,
): boolean {
  const member = rpg.party.find(m => m.id === memberId);
  if (!member) return false;

  const item = member.equipment[slot];
  if (!item) return false;

  if (rpg.inventory.items.length >= rpg.inventory.maxSlots) {
    // Check if we can stack
    const existing = rpg.inventory.items.find(s => s.item.id === item.id);
    if (!existing) return false; // Inventory full
  }

  member.equipment[slot] = null;
  _addToInventory(rpg, item);

  return true;
}

// ---------------------------------------------------------------------------
// Shop
// ---------------------------------------------------------------------------

/** Buy an item from a shop. Deducts gold, adds to inventory. */
export function buyItem(rpg: RPGState, item: RPGItem): boolean {
  if (rpg.gold < item.value) return false;

  // Check inventory space
  const existing = rpg.inventory.items.find(s => s.item.id === item.id);
  if (!existing && rpg.inventory.items.length >= rpg.inventory.maxSlots) return false;

  rpg.gold -= item.value;
  _addToInventory(rpg, item);

  EventBus.emit("rpgItemBought", { itemId: item.id });
  return true;
}

/** Sell an item from inventory. Adds half value as gold. */
export function sellItem(rpg: RPGState, itemId: string): boolean {
  const slotIndex = rpg.inventory.items.findIndex(s => s.item.id === itemId);
  if (slotIndex < 0) return false;

  const invSlot = rpg.inventory.items[slotIndex];
  const item = invSlot.item;

  rpg.gold += Math.floor(item.value / 2);

  invSlot.quantity--;
  if (invSlot.quantity <= 0) {
    rpg.inventory.items.splice(slotIndex, 1);
  }

  return true;
}

// ---------------------------------------------------------------------------
// Inn
// ---------------------------------------------------------------------------

/** Rest at an inn. Heals all party members to full HP/MP. */
export function restAtInn(rpg: RPGState, cost: number): boolean {
  if (rpg.gold < cost) return false;

  rpg.gold -= cost;
  for (const member of rpg.party) {
    member.hp = member.maxHp;
    member.mp = member.maxMp;
    // Clear negative status effects
    member.statusEffects = member.statusEffects.filter(
      e => e.type === "regen" || e.type === "haste" || e.type === "shield",
    );
  }

  EventBus.emit("rpgInnRested", { cost });
  return true;
}

// ---------------------------------------------------------------------------
// Use consumable items (outside battle)
// ---------------------------------------------------------------------------

/** Use a consumable item on a party member outside of battle. */
export function useItem(rpg: RPGState, itemId: string, memberId: string): boolean {
  const slotIndex = rpg.inventory.items.findIndex(s => s.item.id === itemId);
  if (slotIndex < 0) return false;

  const invSlot = rpg.inventory.items[slotIndex];
  const item = invSlot.item;
  if (item.type !== "consumable") return false;

  const member = rpg.party.find(m => m.id === memberId);
  if (!member) return false;

  // Apply HP restore
  if (item.stats.hp && item.stats.hp > 0) {
    member.hp = Math.min(member.maxHp, member.hp + item.stats.hp);
  }
  // Apply MP restore
  if (item.stats.mp && item.stats.mp > 0) {
    member.mp = Math.min(member.maxMp, member.mp + item.stats.mp);
  }
  // Antidote: clear poison
  if (item.id === "antidote") {
    member.statusEffects = member.statusEffects.filter(e => e.type !== "poison");
  }

  // Consume
  invSlot.quantity--;
  if (invSlot.quantity <= 0) {
    rpg.inventory.items.splice(slotIndex, 1);
  }

  EventBus.emit("rpgItemUsed", { itemId: item.id, targetId: memberId });
  return true;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _itemTypeToSlot(type: RPGItem["type"]): keyof import("@rpg/state/RPGState").EquipmentSlots | null {
  switch (type) {
    case "weapon": return "weapon";
    case "armor": return "armor";
    case "accessory": return "accessory";
    case "helmet": return "helmet";
    case "shield": return "shield";
    case "legs": return "legs";
    case "boots": return "boots";
    case "ring": return "ring";
    default: return null;
  }
}

function _addToInventory(rpg: RPGState, item: RPGItem): void {
  const existing = rpg.inventory.items.find(s => s.item.id === item.id);
  if (existing) {
    existing.quantity++;
  } else {
    rpg.inventory.items.push({ item, quantity: 1 });
  }
}
