// ---------------------------------------------------------------------------
// Camelot Craft – Crafting & smelting system
// ---------------------------------------------------------------------------

import { BlockType } from "../config/CraftBlockDefs";
import {
  RECIPES,
  type ItemStack,
  type ShapedRecipe,
  type ShapelessRecipe,
} from "../config/CraftRecipeDefs";
import { CB } from "../config/CraftBalance";
import type { CraftInventory } from "../state/CraftInventory";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Check if a grid slot matches an expected ingredient (BlockType or null). */
function slotMatchesBlock(slot: ItemStack | null, expected: BlockType | null): boolean {
  if (expected === null) {
    return slot === null || slot.count === 0;
  }
  if (!slot || slot.count === 0) return false;
  return slot.blockType === expected;
}

// ---------------------------------------------------------------------------
// Shaped recipe matching
// ---------------------------------------------------------------------------

function matchShaped(grid: (ItemStack | null)[], gridSize: number, recipe: ShapedRecipe): boolean {
  const patternRows = recipe.pattern.length;
  const patternCols = recipe.pattern[0]?.length ?? 0;
  if (patternRows === 0 || patternCols === 0) return false;
  if (patternRows > gridSize || patternCols > gridSize) return false;

  for (let rowOff = 0; rowOff <= gridSize - patternRows; rowOff++) {
    for (let colOff = 0; colOff <= gridSize - patternCols; colOff++) {
      if (matchShapedAt(grid, gridSize, recipe, rowOff, colOff, patternRows, patternCols)) {
        return true;
      }
    }
  }
  return false;
}

function matchShapedAt(
  grid: (ItemStack | null)[], gridSize: number,
  recipe: ShapedRecipe,
  rowOff: number, colOff: number,
  patternRows: number, patternCols: number,
): boolean {
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const idx = r * gridSize + c;
      const slot = grid[idx] ?? null;

      const pr = r - rowOff;
      const pc = c - colOff;

      if (pr >= 0 && pr < patternRows && pc >= 0 && pc < patternCols) {
        const expected = recipe.pattern[pr][pc]; // BlockType | null
        if (!slotMatchesBlock(slot, expected)) return false;
      } else {
        // Outside pattern — must be empty
        if (slot !== null && slot.count > 0) return false;
      }
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// Shapeless recipe matching
// ---------------------------------------------------------------------------

function matchShapeless(grid: (ItemStack | null)[], recipe: ShapelessRecipe): boolean {
  const filled = grid.filter((s): s is ItemStack => s !== null && s.count > 0);
  const ingredients = [...recipe.ingredients];

  if (filled.length !== ingredients.length) return false;

  const used = new Array<boolean>(ingredients.length).fill(false);

  for (const slot of filled) {
    let found = false;
    for (let i = 0; i < ingredients.length; i++) {
      if (!used[i] && slot.blockType === ingredients[i]) {
        used[i] = true;
        found = true;
        break;
      }
    }
    if (!found) return false;
  }

  return used.every(Boolean);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Check a crafting grid against all recipes. Returns result or null. */
export function matchRecipe(grid: (ItemStack | null)[], gridSize: number): ItemStack | null {
  for (const recipe of RECIPES) {
    if (recipe.type === "shaped") {
      if (matchShaped(grid, gridSize, recipe)) return { ...recipe.result };
    } else if (recipe.type === "shapeless") {
      if (matchShapeless(grid, recipe)) return { ...recipe.result };
    }
  }
  return null;
}

/** Consume ingredients and return crafted result, or null if no match. */
export function applyCraft(inv: CraftInventory): ItemStack | null {
  const result = matchRecipe(inv.craftGrid, CB.CRAFT_GRID_SIZE);
  if (!result) return null;

  for (let i = 0; i < inv.craftGrid.length; i++) {
    const slot = inv.craftGrid[i];
    if (slot && slot.count > 0) {
      slot.count -= 1;
      if (slot.count <= 0) inv.craftGrid[i] = null;
    }
  }

  return result;
}

/** Look up a smelting recipe for the given block type. */
export function getSmeltResult(blockType: BlockType): { result: ItemStack; time: number } | null {
  for (const recipe of RECIPES) {
    if (recipe.type === "smelt" && recipe.input === blockType) {
      return { result: { ...recipe.result }, time: recipe.time };
    }
  }
  return null;
}
