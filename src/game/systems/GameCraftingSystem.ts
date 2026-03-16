// ---------------------------------------------------------------------------
// Quest for the Grail — Crafting & Enchantment System
// Material gathering, crafting recipes, enchanting, socketing, disenchanting
// ---------------------------------------------------------------------------

import { GameBalance, ITEM_DEFS } from "../config/GameConfig";
import type { ItemDef } from "../config/GameConfig";
import {
  CRAFTING_MATERIALS, CRAFTING_RECIPES, MATERIAL_DROP_TABLES,
  ENCHANTMENT_DEFS, SOCKET_GEMS, GEM_DROP_TABLE,
} from "../config/GameCraftingDefs";
import type { CraftingRecipe, EnchantmentDef } from "../config/GameCraftingDefs";
import type {
  GrailGameState,
} from "../state/GameState";

// ---------------------------------------------------------------------------
// Material drops from enemies
// ---------------------------------------------------------------------------

export function rollMaterialDrop(
  floorNum: number,
  enemyCategory: string,
  dropChance: number = 0.3,
): { matId: string; quantity: number } | null {
  if (Math.random() > dropChance) return null;

  const tier = floorNum <= 2 ? "easy" : floorNum <= 5 ? "medium" : "hard";
  const table = MATERIAL_DROP_TABLES[tier];
  if (!table) return null;

  // Filter by enemy category if applicable
  const filtered = table.filter(entry => {
    const mat = CRAFTING_MATERIALS[entry.matId];
    if (!mat) return false;
    if (mat.enemyCategories && !mat.enemyCategories.includes(enemyCategory)) {
      return Math.random() < 0.3; // 30% chance to drop non-category materials
    }
    return true;
  });

  const pool = filtered.length > 0 ? filtered : table;
  const totalW = pool.reduce((s, e) => s + e.weight, 0);
  let roll = Math.random() * totalW;
  for (const entry of pool) {
    roll -= entry.weight;
    if (roll <= 0) {
      return { matId: entry.matId, quantity: 1 + (Math.random() < 0.2 ? 1 : 0) };
    }
  }
  return null;
}

// Roll material from treasure chest
export function rollChestMaterials(floorNum: number, count: number = 2): { matId: string; quantity: number }[] {
  const results: { matId: string; quantity: number }[] = [];
  for (let i = 0; i < count; i++) {
    const drop = rollMaterialDrop(floorNum, "", 0.8);
    if (drop) {
      const existing = results.find(r => r.matId === drop.matId);
      if (existing) existing.quantity += drop.quantity;
      else results.push(drop);
    }
  }
  return results;
}

// Roll gem drop (from bosses)
export function rollGemDrop(): string | null {
  if (Math.random() > 0.4) return null; // 40% chance from bosses
  const totalW = GEM_DROP_TABLE.reduce((s, e) => s + e.weight, 0);
  let roll = Math.random() * totalW;
  for (const entry of GEM_DROP_TABLE) {
    roll -= entry.weight;
    if (roll <= 0) return entry.gemId;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Material inventory helpers
// ---------------------------------------------------------------------------

export function addMaterial(state: GrailGameState, matId: string, quantity: number): void {
  const existing = state.materials.find(m => m.id === matId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    state.materials.push({ id: matId, quantity });
  }
}

export function getMaterialCount(state: GrailGameState, matId: string): number {
  return state.materials.find(m => m.id === matId)?.quantity ?? 0;
}

export function removeMaterial(state: GrailGameState, matId: string, quantity: number): boolean {
  const existing = state.materials.find(m => m.id === matId);
  if (!existing || existing.quantity < quantity) return false;
  existing.quantity -= quantity;
  if (existing.quantity <= 0) {
    state.materials = state.materials.filter(m => m.id !== matId);
  }
  return true;
}

// ---------------------------------------------------------------------------
// Crafting
// ---------------------------------------------------------------------------

export function canCraft(state: GrailGameState, recipeId: string): boolean {
  const recipe = CRAFTING_RECIPES.find(r => r.id === recipeId);
  if (!recipe) return false;
  for (const ing of recipe.ingredients) {
    if (getMaterialCount(state, ing.matId) < ing.quantity) return false;
  }
  return true;
}

export function craft(state: GrailGameState, recipeId: string): ItemDef | null {
  if (!canCraft(state, recipeId)) return null;
  const recipe = CRAFTING_RECIPES.find(r => r.id === recipeId)!;

  // Consume ingredients
  for (const ing of recipe.ingredients) {
    removeMaterial(state, ing.matId, ing.quantity);
  }

  // Determine result item
  let item: ItemDef;
  if (recipe.resultItem) {
    item = recipe.resultItem;
  } else {
    item = ITEM_DEFS[recipe.resultItemId];
  }
  if (!item) return null;

  // Add to inventory
  const p = state.player;
  if (item.type === "consumable") {
    const existing = p.inventory.find(inv => inv.def.id === item.id);
    if (existing) {
      existing.quantity++;
    } else if (p.inventory.length < GameBalance.MAX_INVENTORY_SIZE) {
      p.inventory.push({ def: item, quantity: 1 });
    }
  } else if (p.inventory.length < GameBalance.MAX_INVENTORY_SIZE) {
    p.inventory.push({ def: item, quantity: 1 });
  }

  return item;
}

export function getAvailableRecipes(state: GrailGameState): { recipe: CraftingRecipe; canCraft: boolean }[] {
  return CRAFTING_RECIPES.map(recipe => ({
    recipe,
    canCraft: canCraft(state, recipe.id),
  }));
}

// ---------------------------------------------------------------------------
// Enchanting
// ---------------------------------------------------------------------------

export function getApplicableEnchantments(itemDef: ItemDef): EnchantmentDef[] {
  const itemSlot = itemDef.type as "weapon" | "armor" | "relic";
  return ENCHANTMENT_DEFS.filter(e => e.applicableTo.includes(itemSlot));
}

export function canEnchant(
  state: GrailGameState,
  _inventoryIndex: number,
  enchantId: string,
): boolean {
  const ench = ENCHANTMENT_DEFS.find(e => e.id === enchantId);
  if (!ench) return false;

  // Check material cost
  for (const cost of ench.baseCost) {
    if (getMaterialCount(state, cost.matId) < cost.quantity) return false;
  }

  return true;
}

export function enchantItem(
  state: GrailGameState,
  inventoryIndex: number,
  enchantId: string,
): { success: boolean; level: number; destroyed: boolean } {
  const ench = ENCHANTMENT_DEFS.find(e => e.id === enchantId);
  if (!ench) return { success: false, level: 0, destroyed: false };

  const p = state.player;
  if (inventoryIndex < 0 || inventoryIndex >= p.inventory.length) {
    return { success: false, level: 0, destroyed: false };
  }
  const inv = p.inventory[inventoryIndex];

  // Consume materials
  for (const cost of ench.baseCost) {
    removeMaterial(state, cost.matId, cost.quantity);
  }

  // Get current enchantment level on this item
  const itemId = inv.def.id;
  let existing = state.enchantments.find(e => e.itemId === itemId && e.enchantId === enchantId);
  const currentLevel = existing?.level ?? 0;

  if (currentLevel >= ench.maxLevel) {
    return { success: false, level: currentLevel, destroyed: false };
  }

  // Success chance decreases with level
  const successChance = ench.successRate * Math.pow(0.85, currentLevel);
  const roll = Math.random();

  if (roll < successChance) {
    // Success
    if (existing) {
      existing.level++;
    } else {
      state.enchantments.push({ itemId, enchantId, level: 1 });
      existing = state.enchantments[state.enchantments.length - 1];
    }
    return { success: true, level: existing!.level, destroyed: false };
  } else if (roll > 0.95 && currentLevel >= 3) {
    // Catastrophic failure at high levels — item destroyed
    p.inventory.splice(inventoryIndex, 1);
    state.enchantments = state.enchantments.filter(e => e.itemId !== itemId);
    return { success: false, level: 0, destroyed: true };
  } else {
    // Normal failure — materials lost but item preserved
    return { success: false, level: currentLevel, destroyed: false };
  }
}

export function getEnchantmentLevel(state: GrailGameState, itemId: string, enchantId: string): number {
  return state.enchantments.find(e => e.itemId === itemId && e.enchantId === enchantId)?.level ?? 0;
}

export function getItemEnchantments(state: GrailGameState, itemId: string): { ench: EnchantmentDef; level: number }[] {
  return state.enchantments
    .filter(e => e.itemId === itemId)
    .map(e => {
      const ench = ENCHANTMENT_DEFS.find(ed => ed.id === e.enchantId);
      return ench ? { ench, level: e.level } : null;
    })
    .filter((e): e is { ench: EnchantmentDef; level: number } => e !== null);
}

// Calculate total enchantment bonuses for equipped items
export function getEnchantmentBonuses(state: GrailGameState): { atk: number; def: number; hp: number; spd: number; effects: string[] } {
  const result = { atk: 0, def: 0, hp: 0, spd: 0, effects: [] as string[] };
  const p = state.player;
  const equippedIds = [
    p.equippedWeapon?.id, p.equippedArmor?.id, p.equippedRelic?.id,
  ].filter(Boolean) as string[];

  for (const itemId of equippedIds) {
    const enchants = getItemEnchantments(state, itemId);
    for (const { ench, level } of enchants) {
      result.atk += ench.attackBonus * level;
      result.def += ench.defenseBonus * level;
      result.hp += ench.hpBonus * level;
      result.spd += ench.speedBonus * level;
      if (ench.specialEffect) result.effects.push(ench.specialEffect);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Socket System
// ---------------------------------------------------------------------------

export function getItemSockets(state: GrailGameState, itemId: string): string[] {
  return state.sockets.find(s => s.itemId === itemId)?.gems ?? [];
}

export function getMaxSockets(itemDef: ItemDef): number {
  switch (itemDef.rarity) {
    case "common": return 0;
    case "uncommon": return 1;
    case "rare": return 2;
    case "legendary": return 3;
  }
  return 0;
}

export function canSocketGem(state: GrailGameState, itemId: string, gemId: string): boolean {
  const p = state.player;
  // Check player has the gem in inventory (stored as material)
  if (getMaterialCount(state, gemId) < 1) return false;

  // Find the item
  const item = p.inventory.find(inv => inv.def.id === itemId)?.def
    ?? (p.equippedWeapon?.id === itemId ? p.equippedWeapon : null)
    ?? (p.equippedArmor?.id === itemId ? p.equippedArmor : null)
    ?? (p.equippedRelic?.id === itemId ? p.equippedRelic : null);
  if (!item) return false;

  const maxSlots = getMaxSockets(item);
  const currentGems = getItemSockets(state, itemId);
  return currentGems.length < maxSlots;
}

export function socketGem(state: GrailGameState, itemId: string, gemId: string): boolean {
  if (!canSocketGem(state, itemId, gemId)) return false;

  removeMaterial(state, gemId, 1);

  const existing = state.sockets.find(s => s.itemId === itemId);
  if (existing) {
    existing.gems.push(gemId);
  } else {
    state.sockets.push({ itemId, gems: [gemId] });
  }
  return true;
}

export function getSocketBonuses(state: GrailGameState): { atk: number; def: number; hp: number; spd: number; effects: string[] } {
  const result = { atk: 0, def: 0, hp: 0, spd: 0, effects: [] as string[] };
  const p = state.player;
  const equippedIds = [
    p.equippedWeapon?.id, p.equippedArmor?.id, p.equippedRelic?.id,
  ].filter(Boolean) as string[];

  for (const itemId of equippedIds) {
    const gems = getItemSockets(state, itemId);
    for (const gemId of gems) {
      const gem = SOCKET_GEMS[gemId];
      if (gem) {
        result.atk += gem.attackBonus;
        result.def += gem.defenseBonus;
        result.hp += gem.hpBonus;
        result.spd += gem.speedBonus;
        if (gem.specialEffect) result.effects.push(gem.specialEffect);
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Disenchanting — break items down into materials
// ---------------------------------------------------------------------------

export function disenchantItem(state: GrailGameState, inventoryIndex: number): { matId: string; quantity: number }[] {
  const p = state.player;
  if (inventoryIndex < 0 || inventoryIndex >= p.inventory.length) return [];
  const inv = p.inventory[inventoryIndex];
  const item = inv.def;

  // Calculate materials returned based on rarity
  const results: { matId: string; quantity: number }[] = [];
  switch (item.rarity) {
    case "common":
      results.push({ matId: "iron_ore", quantity: 1 });
      if (Math.random() < 0.5) results.push({ matId: "wood_plank", quantity: 1 });
      break;
    case "uncommon":
      results.push({ matId: "steel_ingot", quantity: 1 });
      results.push({ matId: "arcane_dust", quantity: 1 });
      break;
    case "rare":
      results.push({ matId: "arcane_dust", quantity: 2 });
      results.push({ matId: "crystal_shard", quantity: 1 });
      if (Math.random() < 0.3) results.push({ matId: "dragon_scale", quantity: 1 });
      break;
    case "legendary":
      results.push({ matId: "crystal_shard", quantity: 2 });
      results.push({ matId: "arcane_dust", quantity: 3 });
      results.push({ matId: "phoenix_feather", quantity: 1 });
      break;
  }

  // Remove item and enchantments
  inv.quantity--;
  if (inv.quantity <= 0) p.inventory.splice(inventoryIndex, 1);
  state.enchantments = state.enchantments.filter(e => e.itemId !== item.id);
  state.sockets = state.sockets.filter(s => s.itemId !== item.id);

  // Add materials
  for (const mat of results) {
    addMaterial(state, mat.matId, mat.quantity);
  }

  return results;
}
