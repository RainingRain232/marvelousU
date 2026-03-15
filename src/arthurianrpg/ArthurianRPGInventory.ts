// ============================================================================
// ArthurianRPGInventory.ts – Inventory, equipment, crafting, and loot
// ============================================================================

import { ElementalType } from "./ArthurianRPGConfig";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export enum ItemCategory {
  Weapon = "Weapon",
  Armor = "Armor",
  Potion = "Potion",
  Food = "Food",
  QuestItem = "QuestItem",
  Material = "Material",
}

export enum ItemQuality {
  Common = "Common",
  Uncommon = "Uncommon",
  Rare = "Rare",
  Epic = "Epic",
  Legendary = "Legendary",
}

export enum EquipSlot {
  MainHand = "mainHand",
  OffHand = "offHand",
  Head = "head",
  Chest = "chest",
  Legs = "legs",
  Feet = "feet",
  Amulet = "amulet",
  Ring1 = "ring1",
  Ring2 = "ring2",
}

export enum CraftingDiscipline {
  Smithing = "Smithing",
  Alchemy = "Alchemy",
  Enchanting = "Enchanting",
}

// ---------------------------------------------------------------------------
// Item definitions
// ---------------------------------------------------------------------------

export interface ItemDef {
  id: string;
  name: string;
  description: string;
  category: ItemCategory;
  quality: ItemQuality;
  weight: number;
  value: number; // base gold value
  stackable: boolean;
  maxStack: number;
  icon: string; // CSS class or emoji placeholder

  // Weapon fields (optional)
  baseDamage?: number;
  attackSpeed?: number;
  element?: ElementalType;
  attributeScaling?: number;

  // Armor fields (optional)
  armorValue?: number;
  blockEfficiency?: number;

  // Consumable fields (optional)
  healAmount?: number;
  manaRestore?: number;
  staminaRestore?: number;
  buffId?: string;
  buffDuration?: number;

  // Equipment slot
  equipSlot?: EquipSlot;

  // Enchantment
  enchantment?: EnchantmentDef | null;

  // Quest flag
  isQuestItem?: boolean;
}

export interface EnchantmentDef {
  id: string;
  name: string;
  element: ElementalType;
  bonusDamage: number;
  description: string;
}

// ---------------------------------------------------------------------------
// Inventory slot
// ---------------------------------------------------------------------------

export interface InventorySlot {
  item: ItemDef;
  count: number;
}

// ---------------------------------------------------------------------------
// Quick-use hotbar
// ---------------------------------------------------------------------------

export interface QuickSlot {
  slotIndex: number; // 0-7
  itemId: string | null;
}

// ---------------------------------------------------------------------------
// Crafting recipe
// ---------------------------------------------------------------------------

export interface CraftingRecipe {
  id: string;
  name: string;
  discipline: CraftingDiscipline;
  requiredSkillLevel: number;
  materials: { itemId: string; count: number }[];
  result: { itemId: string; count: number };
  xpReward: number;
}

// ---------------------------------------------------------------------------
// Loot table entry
// ---------------------------------------------------------------------------

export interface LootTableEntry {
  itemId: string;
  weight: number; // relative probability
  minCount: number;
  maxCount: number;
  minQuality: ItemQuality;
}

export interface LootTable {
  id: string;
  entries: LootTableEntry[];
  guaranteedGold: { min: number; max: number };
}

// ---------------------------------------------------------------------------
// Equipment comparison result
// ---------------------------------------------------------------------------

export interface EquipCompareResult {
  slotName: string;
  currentItem: ItemDef | null;
  newItem: ItemDef;
  damageChange: number;
  armorChange: number;
  weightChange: number;
  isBetter: boolean;
}

// ---------------------------------------------------------------------------
// QUALITY PROBABILITY TABLE for loot scaling
// ---------------------------------------------------------------------------

const QUALITY_WEIGHTS: Record<ItemQuality, number> = {
  [ItemQuality.Common]: 60,
  [ItemQuality.Uncommon]: 25,
  [ItemQuality.Rare]: 10,
  [ItemQuality.Epic]: 4,
  [ItemQuality.Legendary]: 1,
};

// Higher player level shifts the curve
export function qualityChance(quality: ItemQuality, playerLevel: number): number {
  const base = QUALITY_WEIGHTS[quality];
  const levelBonus = quality === ItemQuality.Common ? -playerLevel * 0.5 : playerLevel * 0.3;
  return Math.max(1, base + levelBonus);
}

// ---------------------------------------------------------------------------
// Inventory system
// ---------------------------------------------------------------------------

export class ArthurianRPGInventorySystem {
  private slots: InventorySlot[] = [];
  private equipped: Map<EquipSlot, ItemDef | null> = new Map();
  private quickSlots: QuickSlot[] = [];
  private gold = 0;

  // Carry weight
  private baseCarryCapacity = 100;
  private strengthAttribute = 10;

  // Crafting skill levels
  private craftingSkills: Record<CraftingDiscipline, number> = {
    [CraftingDiscipline.Smithing]: 1,
    [CraftingDiscipline.Alchemy]: 1,
    [CraftingDiscipline.Enchanting]: 1,
  };

  // Item registry (all known item defs)
  private itemRegistry: Map<string, ItemDef> = new Map();

  // Recipe registry
  private recipeRegistry: Map<string, CraftingRecipe> = new Map();

  // Loot table registry
  private lootTableRegistry: Map<string, LootTable> = new Map();

  constructor() {
    // Initialise equip slots to null
    for (const slot of Object.values(EquipSlot)) {
      this.equipped.set(slot, null);
    }
    // Initialise 8 quick slots
    for (let i = 0; i < 8; i++) {
      this.quickSlots.push({ slotIndex: i, itemId: null });
    }
  }

  // -----------------------------------------------------------------------
  // Registration
  // -----------------------------------------------------------------------

  registerItem(def: ItemDef): void {
    this.itemRegistry.set(def.id, def);
  }

  registerRecipe(recipe: CraftingRecipe): void {
    this.recipeRegistry.set(recipe.id, recipe);
  }

  registerLootTable(table: LootTable): void {
    this.lootTableRegistry.set(table.id, table);
  }

  setStrength(str: number): void {
    this.strengthAttribute = str;
  }

  // -----------------------------------------------------------------------
  // Carry capacity
  // -----------------------------------------------------------------------

  getMaxCarry(): number {
    return this.baseCarryCapacity + this.strengthAttribute * 5;
  }

  getCurrentWeight(): number {
    let w = 0;
    for (const slot of this.slots) {
      w += slot.item.weight * slot.count;
    }
    return w;
  }

  isOverEncumbered(): boolean {
    return this.getCurrentWeight() > this.getMaxCarry();
  }

  // -----------------------------------------------------------------------
  // Add / remove items
  // -----------------------------------------------------------------------

  addItem(itemId: string, count = 1): boolean {
    const def = this.itemRegistry.get(itemId);
    if (!def) return false;

    if (this.getCurrentWeight() + def.weight * count > this.getMaxCarry()) {
      return false; // over-encumbered
    }

    if (def.stackable) {
      const existing = this.slots.find((s) => s.item.id === itemId && s.count < (def.maxStack ?? 99));
      if (existing) {
        const space = (def.maxStack ?? 99) - existing.count;
        const toAdd = Math.min(count, space);
        existing.count += toAdd;
        count -= toAdd;
      }
    }

    while (count > 0) {
      const stackSize = def.stackable ? Math.min(count, def.maxStack ?? 99) : 1;
      this.slots.push({ item: def, count: stackSize });
      count -= stackSize;
    }
    return true;
  }

  removeItem(itemId: string, count = 1): boolean {
    let remaining = count;
    for (let i = this.slots.length - 1; i >= 0 && remaining > 0; i--) {
      if (this.slots[i].item.id === itemId) {
        const take = Math.min(this.slots[i].count, remaining);
        this.slots[i].count -= take;
        remaining -= take;
        if (this.slots[i].count <= 0) {
          this.slots.splice(i, 1);
        }
      }
    }
    return remaining === 0;
  }

  getItemCount(itemId: string): number {
    return this.slots
      .filter((s) => s.item.id === itemId)
      .reduce((sum, s) => sum + s.count, 0);
  }

  getSlots(): ReadonlyArray<InventorySlot> {
    return this.slots;
  }

  // -----------------------------------------------------------------------
  // Equipment
  // -----------------------------------------------------------------------

  equip(itemId: string): EquipCompareResult | null {
    const def = this.itemRegistry.get(itemId);
    if (!def || !def.equipSlot) return null;
    if (!this.slots.some((s) => s.item.id === itemId)) return null;

    const slot = def.equipSlot;
    const current = this.equipped.get(slot) ?? null;

    const comparison: EquipCompareResult = {
      slotName: slot,
      currentItem: current,
      newItem: def,
      damageChange: (def.baseDamage ?? 0) - (current?.baseDamage ?? 0),
      armorChange: (def.armorValue ?? 0) - (current?.armorValue ?? 0),
      weightChange: def.weight - (current?.weight ?? 0),
      isBetter: false,
    };
    comparison.isBetter = comparison.damageChange > 0 || comparison.armorChange > 0;

    // Unequip current
    if (current) {
      this.addItem(current.id, 1);
    }

    // Remove from inventory and equip
    this.removeItem(itemId, 1);
    this.equipped.set(slot, def);

    return comparison;
  }

  unequip(slot: EquipSlot): boolean {
    const item = this.equipped.get(slot);
    if (!item) return false;
    if (!this.addItem(item.id, 1)) return false; // no room
    this.equipped.set(slot, null);
    return true;
  }

  getEquipped(slot: EquipSlot): ItemDef | null {
    return this.equipped.get(slot) ?? null;
  }

  getAllEquipped(): Map<EquipSlot, ItemDef | null> {
    return new Map(this.equipped);
  }

  compareItem(itemId: string): EquipCompareResult | null {
    const def = this.itemRegistry.get(itemId);
    if (!def || !def.equipSlot) return null;
    const current = this.equipped.get(def.equipSlot) ?? null;
    const comparison: EquipCompareResult = {
      slotName: def.equipSlot,
      currentItem: current,
      newItem: def,
      damageChange: (def.baseDamage ?? 0) - (current?.baseDamage ?? 0),
      armorChange: (def.armorValue ?? 0) - (current?.armorValue ?? 0),
      weightChange: def.weight - (current?.weight ?? 0),
      isBetter: false,
    };
    comparison.isBetter = comparison.damageChange > 0 || comparison.armorChange > 0;
    return comparison;
  }

  // -----------------------------------------------------------------------
  // Quick slots
  // -----------------------------------------------------------------------

  assignQuickSlot(slotIndex: number, itemId: string): void {
    if (slotIndex < 0 || slotIndex >= 8) return;
    this.quickSlots[slotIndex].itemId = itemId;
  }

  clearQuickSlot(slotIndex: number): void {
    if (slotIndex < 0 || slotIndex >= 8) return;
    this.quickSlots[slotIndex].itemId = null;
  }

  useQuickSlot(slotIndex: number): ItemDef | null {
    if (slotIndex < 0 || slotIndex >= 8) return null;
    const id = this.quickSlots[slotIndex].itemId;
    if (!id) return null;
    const def = this.itemRegistry.get(id);
    if (!def) return null;
    if (!this.removeItem(id, 1)) return null;
    return def;
  }

  getQuickSlots(): ReadonlyArray<QuickSlot> {
    return this.quickSlots;
  }

  // -----------------------------------------------------------------------
  // Crafting
  // -----------------------------------------------------------------------

  canCraft(recipeId: string): { ok: boolean; reason: string } {
    const recipe = this.recipeRegistry.get(recipeId);
    if (!recipe) return { ok: false, reason: "Unknown recipe" };

    const skillLvl = this.craftingSkills[recipe.discipline];
    if (skillLvl < recipe.requiredSkillLevel) {
      return { ok: false, reason: `${recipe.discipline} level ${recipe.requiredSkillLevel} required (you have ${skillLvl})` };
    }

    for (const mat of recipe.materials) {
      if (this.getItemCount(mat.itemId) < mat.count) {
        const matDef = this.itemRegistry.get(mat.itemId);
        return { ok: false, reason: `Need ${mat.count}x ${matDef?.name ?? mat.itemId}` };
      }
    }
    return { ok: true, reason: "" };
  }

  craft(recipeId: string): { success: boolean; resultItem: ItemDef | null; xpGained: number; reason: string } {
    const check = this.canCraft(recipeId);
    if (!check.ok) return { success: false, resultItem: null, xpGained: 0, reason: check.reason };

    const recipe = this.recipeRegistry.get(recipeId)!;

    // Consume materials
    for (const mat of recipe.materials) {
      this.removeItem(mat.itemId, mat.count);
    }

    // Produce result
    this.addItem(recipe.result.itemId, recipe.result.count);

    // Gain crafting XP
    this.craftingSkills[recipe.discipline] = Math.min(
      100,
      this.craftingSkills[recipe.discipline] + Math.ceil(recipe.xpReward * 0.1),
    );

    return {
      success: true,
      resultItem: this.itemRegistry.get(recipe.result.itemId) ?? null,
      xpGained: recipe.xpReward,
      reason: "",
    };
  }

  getCraftingLevel(discipline: CraftingDiscipline): number {
    return this.craftingSkills[discipline];
  }

  // -----------------------------------------------------------------------
  // Loot generation
  // -----------------------------------------------------------------------

  generateLoot(tableId: string, playerLevel: number): { items: { item: ItemDef; count: number }[]; gold: number } {
    const table = this.lootTableRegistry.get(tableId);
    if (!table) return { items: [], gold: 0 };

    const items: { item: ItemDef; count: number }[] = [];

    // Weighted random selection (pick 1-3 items)
    const numDrops = 1 + Math.floor(Math.random() * 3);
    const totalWeight = table.entries.reduce((s, e) => s + e.weight, 0);

    for (let n = 0; n < numDrops; n++) {
      let roll = Math.random() * totalWeight;
      for (const entry of table.entries) {
        roll -= entry.weight;
        if (roll <= 0) {
          const def = this.itemRegistry.get(entry.itemId);
          if (def) {
            const count = entry.minCount + Math.floor(Math.random() * (entry.maxCount - entry.minCount + 1));
            items.push({ item: def, count });
          }
          break;
        }
      }
    }

    // Level-scaled quality upgrade chance
    for (const _drop of items) {
      const upgradeRoll = Math.random() * 100;
      if (upgradeRoll < playerLevel * 1.5) {
        // Upgraded version would be handled by item variants in a full system
        // For now just note it as a quality bump on the item
      }
    }

    // Gold
    const gold = table.guaranteedGold.min +
      Math.floor(Math.random() * (table.guaranteedGold.max - table.guaranteedGold.min + 1)) +
      Math.floor(playerLevel * 1.5);

    return { items, gold };
  }

  collectLoot(items: { item: ItemDef; count: number }[], gold: number): string[] {
    const collected: string[] = [];
    for (const drop of items) {
      if (this.addItem(drop.item.id, drop.count)) {
        collected.push(`${drop.count}x ${drop.item.name}`);
      }
    }
    this.gold += gold;
    if (gold > 0) collected.push(`${gold} gold`);
    return collected;
  }

  // -----------------------------------------------------------------------
  // Gold
  // -----------------------------------------------------------------------

  getGold(): number { return this.gold; }
  addGold(amount: number): void { this.gold += amount; }
  removeGold(amount: number): boolean {
    if (this.gold < amount) return false;
    this.gold -= amount;
    return true;
  }

  // -----------------------------------------------------------------------
  // Filtering / sorting helpers
  // -----------------------------------------------------------------------

  getItemsByCategory(cat: ItemCategory): InventorySlot[] {
    return this.slots.filter((s) => s.item.category === cat);
  }

  sortByValue(): void {
    this.slots.sort((a, b) => b.item.value - a.item.value);
  }

  sortByWeight(): void {
    this.slots.sort((a, b) => a.item.weight - b.item.weight);
  }

  sortByName(): void {
    this.slots.sort((a, b) => a.item.name.localeCompare(b.item.name));
  }
}
