// ---------------------------------------------------------------------------
// Terraria – Crafting system (recipe matching)
// ---------------------------------------------------------------------------

import { CRAFTING_RECIPES } from "../config/TerrariaRecipeDefs";
import type { CraftingRecipe, RecipeInput } from "../config/TerrariaRecipeDefs";
import type { TerrariaState } from "../state/TerrariaState";
import { addMessage } from "../state/TerrariaState";
import { addToInventory } from "../state/TerrariaInventory";
import type { ItemStack, TerrariaInventory } from "../state/TerrariaInventory";

// ---------------------------------------------------------------------------
// Get available recipes
// ---------------------------------------------------------------------------

export function getAvailableRecipes(state: TerrariaState): CraftingRecipe[] {
  const station = state.craftingStation;
  return CRAFTING_RECIPES.filter(r => {
    // Check station requirement
    if (r.station === "round_table" && station !== "round_table" && station !== "forge") return false;
    if (r.station === "forge" && station !== "forge") return false;
    // Check if player has enough materials
    return hasIngredients(state.player.inventory, r);
  });
}

export function hasIngredients(inv: TerrariaInventory, recipe: CraftingRecipe): boolean {
  for (const input of recipe.inputs) {
    if (countMatching(inv, input) < input.count) return false;
  }
  return true;
}

function countMatching(inv: TerrariaInventory, input: RecipeInput): number {
  let total = 0;
  const allSlots = [...inv.hotbar, ...inv.main];
  for (const slot of allSlots) {
    if (!slot) continue;
    if (matchesInput(slot, input)) total += slot.count;
  }
  return total;
}

function matchesInput(item: ItemStack, input: RecipeInput): boolean {
  if (item.category !== input.category) return false;
  if (input.blockType !== undefined) return item.blockType === input.blockType;
  if (input.toolType !== undefined) return item.toolType === input.toolType && item.toolMaterial === input.toolMaterial;
  if (input.specialId !== undefined) return item.specialId === input.specialId;
  if (input.displayName !== undefined) return item.displayName === input.displayName;
  return false;
}

// ---------------------------------------------------------------------------
// Craft a recipe
// ---------------------------------------------------------------------------

export function craftRecipe(state: TerrariaState, recipe: CraftingRecipe): boolean {
  const inv = state.player.inventory;
  if (!hasIngredients(inv, recipe)) return false;

  // Consume inputs
  for (const input of recipe.inputs) {
    let remaining = input.count;
    const slotArrays: (ItemStack | null)[][] = [inv.hotbar, inv.main];
    for (const arr of slotArrays) {
      for (let i = 0; i < arr.length && remaining > 0; i++) {
        const slot = arr[i];
        if (!slot || !matchesInput(slot, input)) continue;
        const take = Math.min(remaining, slot.count);
        slot.count -= take;
        remaining -= take;
        if (slot.count <= 0) arr[i] = null;
      }
    }
  }

  // Give output
  const output = { ...recipe.output, count: recipe.output.count };
  addToInventory(inv, output);
  addMessage(state, `Crafted ${output.displayName}!`, 0x44FF44);
  return true;
}
