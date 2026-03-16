// Crafting discovery system — experiment with unknown material combinations
// to discover new recipes. Players combine items without knowing the result.
import type { RPGState } from "@rpg/state/RPGState";
import { CRAFTING_RECIPES, type CraftingRecipe } from "@rpg/config/CraftingDefs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DiscoveryAttempt {
  /** Material item IDs used in the experiment. */
  materialIds: string[];
  /** Whether this combination yielded a valid recipe. */
  success: boolean;
  /** The recipe ID discovered (if success). */
  recipeId?: string;
  /** Timestamp of the attempt. */
  timestamp: number;
}

export interface CraftingDiscoveryState {
  /** Recipe IDs the player has discovered through experimentation. */
  discoveredRecipes: Set<string>;
  /** Recipe IDs the player already knows (from scrolls, quests, etc.). */
  knownRecipes: Set<string>;
  /** History of discovery attempts. */
  attemptHistory: DiscoveryAttempt[];
  /** Hints unlocked — partial recipe info (recipe ID -> number of known ingredients). */
  hints: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createCraftingDiscoveryState(): CraftingDiscoveryState {
  // Start with basic recipes known
  const knownRecipes = new Set<string>([
    "recipe_iron_sword",
    "recipe_leather_armor",
    "recipe_health_potion",
    "recipe_mana_potion",
  ]);

  return {
    discoveredRecipes: new Set(),
    knownRecipes,
    attemptHistory: [],
    hints: {},
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Check if a recipe is known (either from base knowledge or discovery).
 */
export function isRecipeKnown(state: CraftingDiscoveryState, recipeId: string): boolean {
  return state.knownRecipes.has(recipeId) || state.discoveredRecipes.has(recipeId);
}

/**
 * Get all known recipe IDs.
 */
export function getKnownRecipeIds(state: CraftingDiscoveryState): string[] {
  return [...state.knownRecipes, ...state.discoveredRecipes];
}

/**
 * Given a set of material IDs, find a matching recipe (if one exists).
 * Materials order does not matter; only IDs and quantities must match.
 */
export function findMatchingRecipe(materialIds: string[]): CraftingRecipe | null {
  // Build a frequency map of submitted materials
  const submitted: Record<string, number> = {};
  for (const id of materialIds) {
    submitted[id] = (submitted[id] ?? 0) + 1;
  }

  for (const recipe of CRAFTING_RECIPES) {
    // Build frequency map of recipe ingredients
    const required: Record<string, number> = {};
    for (const ing of recipe.ingredients) {
      required[ing.itemId] = ing.quantity;
    }

    // Check if submitted matches required exactly
    const requiredKeys = Object.keys(required);
    const submittedKeys = Object.keys(submitted);

    if (requiredKeys.length !== submittedKeys.length) continue;

    let matches = true;
    for (const key of requiredKeys) {
      if ((submitted[key] ?? 0) < required[key]) {
        matches = false;
        break;
      }
    }

    if (matches) return recipe;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Mutation
// ---------------------------------------------------------------------------

/**
 * Attempt to discover a recipe by experimenting with materials.
 * Consumes the materials whether the experiment succeeds or fails.
 *
 * @param rpg - The RPG state (for inventory manipulation).
 * @param discovery - The crafting discovery state.
 * @param materialIds - Array of material item IDs to combine (with repeats for quantity).
 * @returns The discovery attempt result.
 */
export function attemptDiscovery(
  rpg: RPGState,
  discovery: CraftingDiscoveryState,
  materialIds: string[],
): DiscoveryAttempt {
  // Verify player has all the materials
  const freqMap: Record<string, number> = {};
  for (const id of materialIds) {
    freqMap[id] = (freqMap[id] ?? 0) + 1;
  }

  for (const [itemId, qty] of Object.entries(freqMap)) {
    const slot = rpg.inventory.items.find(s => s.item.id === itemId);
    if (!slot || slot.quantity < qty) {
      // Not enough materials — return failure without consuming
      const attempt: DiscoveryAttempt = {
        materialIds: [...materialIds],
        success: false,
        timestamp: Date.now(),
      };
      discovery.attemptHistory.push(attempt);
      return attempt;
    }
  }

  // Consume materials
  for (const [itemId, qty] of Object.entries(freqMap)) {
    const slot = rpg.inventory.items.find(s => s.item.id === itemId)!;
    slot.quantity -= qty;
  }
  rpg.inventory.items = rpg.inventory.items.filter(s => s.quantity > 0);

  // Check for matching recipe
  const recipe = findMatchingRecipe(materialIds);
  const attempt: DiscoveryAttempt = {
    materialIds: [...materialIds],
    success: recipe !== null,
    timestamp: Date.now(),
  };

  if (recipe) {
    attempt.recipeId = recipe.id;
    discovery.discoveredRecipes.add(recipe.id);

    // Add the crafted result to inventory
    const existing = rpg.inventory.items.find(s => s.item.id === recipe.result.id);
    if (existing) {
      existing.quantity++;
    } else if (rpg.inventory.items.length < rpg.inventory.maxSlots) {
      rpg.inventory.items.push({ item: recipe.result, quantity: 1 });
    }
  }

  discovery.attemptHistory.push(attempt);
  return attempt;
}

/**
 * Learn a recipe directly (from a scroll, quest reward, etc.).
 */
export function learnRecipe(discovery: CraftingDiscoveryState, recipeId: string): boolean {
  if (isRecipeKnown(discovery, recipeId)) return false;
  discovery.knownRecipes.add(recipeId);
  return true;
}

/**
 * Add a hint for a recipe (reveals one ingredient).
 */
export function addRecipeHint(discovery: CraftingDiscoveryState, recipeId: string): void {
  const recipe = CRAFTING_RECIPES.find(r => r.id === recipeId);
  if (!recipe) return;

  const current = discovery.hints[recipeId] ?? 0;
  if (current < recipe.ingredients.length) {
    discovery.hints[recipeId] = current + 1;
  }
}

/**
 * Get hint info for a recipe: which ingredients are revealed.
 */
export function getRecipeHints(discovery: CraftingDiscoveryState, recipeId: string): {
  totalIngredients: number;
  revealedCount: number;
  revealedIngredients: { itemId: string; quantity: number }[];
} {
  const recipe = CRAFTING_RECIPES.find(r => r.id === recipeId);
  if (!recipe) return { totalIngredients: 0, revealedCount: 0, revealedIngredients: [] };

  const revealedCount = discovery.hints[recipeId] ?? 0;
  const revealedIngredients = recipe.ingredients.slice(0, revealedCount);

  return {
    totalIngredients: recipe.ingredients.length,
    revealedCount,
    revealedIngredients,
  };
}
