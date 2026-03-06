import type { RPGState } from "@rpg/state/RPGState";
import { CRAFTING_RECIPES } from "@rpg/config/CraftingDefs";

export function canCraft(rpg: RPGState, recipeId: string): boolean {
  const recipe = CRAFTING_RECIPES.find(r => r.id === recipeId);
  if (!recipe) return false;
  for (const ing of recipe.ingredients) {
    const slot = rpg.inventory.items.find(s => s.item.id === ing.itemId);
    if (!slot || slot.quantity < ing.quantity) return false;
  }
  return true;
}

export function craft(rpg: RPGState, recipeId: string): boolean {
  if (!canCraft(rpg, recipeId)) return false;
  const recipe = CRAFTING_RECIPES.find(r => r.id === recipeId)!;
  // Consume ingredients
  for (const ing of recipe.ingredients) {
    const slot = rpg.inventory.items.find(s => s.item.id === ing.itemId)!;
    slot.quantity -= ing.quantity;
  }
  rpg.inventory.items = rpg.inventory.items.filter(s => s.quantity > 0);
  // Add result
  const existing = rpg.inventory.items.find(s => s.item.id === recipe.result.id);
  if (existing) {
    existing.quantity++;
  } else if (rpg.inventory.items.length < rpg.inventory.maxSlots) {
    rpg.inventory.items.push({ item: recipe.result, quantity: 1 });
  }
  return true;
}
