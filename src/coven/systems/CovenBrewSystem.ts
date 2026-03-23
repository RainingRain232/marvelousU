// ---------------------------------------------------------------------------
// Coven mode — alchemy/brewing system
// ---------------------------------------------------------------------------

import type { CovenState, PotionId, SpellId } from "../state/CovenState";
import { addCovenLog, addPotion, hasIngredient, removeIngredient } from "../state/CovenState";
import { POTION_RECIPES, type PotionRecipe } from "../config/CovenRecipes";

type BrewCallback = (potionId: PotionId, name: string) => void;
type LearnCallback = (spellId: SpellId, name: string) => void;

let _brewCallback: BrewCallback | null = null;
let _learnCallback: LearnCallback | null = null;
void _learnCallback; // Suppress unused — set by setLearnCallback, read by future learn logic

export class CovenBrewSystem {
  static setBrewCallback(cb: BrewCallback | null): void { _brewCallback = cb; }
  static setLearnCallback(cb: LearnCallback | null): void { _learnCallback = cb; }

  static getAvailableRecipes(state: CovenState): PotionRecipe[] {
    return POTION_RECIPES.filter((r) => this.canBrew(state, r.id));
  }

  static canBrew(state: CovenState, potionId: PotionId): boolean {
    const recipe = POTION_RECIPES.find((r) => r.id === potionId);
    if (!recipe) return false;
    if (state.mana < recipe.manaCost) return false;
    return recipe.ingredients.every((ing) => hasIngredient(state, ing.id, ing.count));
  }

  static brew(state: CovenState, potionId: PotionId): boolean {
    const recipe = POTION_RECIPES.find((r) => r.id === potionId);
    if (!recipe || !this.canBrew(state, potionId)) return false;

    // Consume ingredients
    for (const ing of recipe.ingredients) {
      removeIngredient(state, ing.id, ing.count);
    }
    state.mana -= recipe.manaCost;

    // Familiar potions summon directly instead of producing a potion
    const familiarMap: Record<string, string> = { familiar_cat: "cat", familiar_owl: "owl", familiar_raven: "raven", familiar_toad: "toad" };
    const familiarType = familiarMap[potionId];
    if (familiarType) {
      // Check if already have this familiar
      if (state.familiars.some((f) => f.type === familiarType)) {
        addCovenLog(state, `You already have a ${familiarType} familiar.`, 0xff8844);
        // Refund ingredients (brew didn't happen conceptually but we already consumed — just give the familiar)
      }
      if (!state.familiars.some((f) => f.type === familiarType)) {
        const names: Record<string, string> = { cat: "Shadow", owl: "Strix", raven: "Munin", toad: "Natterjack" };
        state.familiars.push({ id: `fam_${familiarType}`, type: familiarType as any, name: names[familiarType] ?? familiarType, active: true });
        addCovenLog(state, `A ${familiarType} materializes from the cauldron smoke. It watches you with knowing eyes.`, 0x88cc88);
      }
      state.potionsBrewed++;
      _brewCallback?.(potionId, recipe.name);
      return true;
    }

    // Regular potion
    addPotion(state, potionId);
    state.potionsBrewed++;

    addCovenLog(state, `Brewed: ${recipe.name}`, 0x88aaff);
    _brewCallback?.(potionId, recipe.name);
    return true;
  }

  static getAllRecipes(): PotionRecipe[] {
    return POTION_RECIPES;
  }

  static cleanup(): void { _brewCallback = null; _learnCallback = null; }
}
