// ---------------------------------------------------------------------------
// Coven mode — foraging system (with proper event triggering)
// ---------------------------------------------------------------------------

import { hexKey } from "@world/hex/HexCoord";
import type { CovenState, IngredientId, RitualComponent, CovenTerrain } from "../state/CovenState";
import { CovenPhase, addCovenLog, addIngredient, covenRng } from "../state/CovenState";
import { INGREDIENTS, getIngredientDef } from "../config/CovenRecipes";
import { COVEN_EVENTS, type CovenEvent, type CovenEventOutcome } from "../config/CovenEvents";
import { revealAround } from "./CovenMapGenerator";

type ForageCallback = (total: number) => void;
type RitualFoundCallback = (component: RitualComponent) => void;
type EventTriggerCallback = (event: CovenEvent) => void;

let _forageCallback: ForageCallback | null = null;
let _ritualFoundCallback: RitualFoundCallback | null = null;
let _eventTriggerCallback: EventTriggerCallback | null = null;
const _usedEventIds = new Set<string>();

export class CovenForageSystem {
  static setForageCallback(cb: ForageCallback | null): void { _forageCallback = cb; }
  static setRitualFoundCallback(cb: RitualFoundCallback | null): void { _ritualFoundCallback = cb; }
  static setEventTriggerCallback(cb: EventTriggerCallback | null): void { _eventTriggerCallback = cb; }

  static forage(state: CovenState): void {
    const key = hexKey(state.playerPosition.q, state.playerPosition.r);
    const hex = state.hexes.get(key);
    if (!hex) return;

    const r = covenRng(state.seed + state.day * 37 + hex.coord.q * 113 + hex.coord.r * 79 + state.ingredientsGathered);
    const isNight = state.phase === CovenPhase.NIGHT || state.phase === CovenPhase.DUSK;

    // Gather from hex
    const gathered: { id: IngredientId; name: string }[] = [];
    for (let i = hex.ingredients.length - 1; i >= 0; i--) {
      const ingId = hex.ingredients[i];
      const def = getIngredientDef(ingId);
      if (!def) continue;
      if (def.nightOnly && !isNight) continue;
      if (r() < 0.7) {
        addIngredient(state, ingId);
        gathered.push({ id: ingId, name: def.name });
        hex.ingredients.splice(i, 1);
      }
    }

    // Random terrain discovery
    const terrainIngs = INGREDIENTS.filter((i) => i.terrains.includes(hex.terrain) && (!i.nightOnly || isNight));
    for (const ing of terrainIngs) {
      if (r() < ing.rarity * 0.3) {
        addIngredient(state, ing.id);
        gathered.push({ id: ing.id, name: ing.name });
      }
    }

    // Batched log
    if (gathered.length > 0) {
      const counts = new Map<string, number>();
      for (const g of gathered) counts.set(g.name, (counts.get(g.name) ?? 0) + 1);
      const parts: string[] = [];
      for (const [name, count] of counts) parts.push(count > 1 ? `${count}x ${name}` : name);
      addCovenLog(state, `Gathered: ${parts.join(", ")}`, 0x88cc88);
      _forageCallback?.(gathered.length);
    } else {
      addCovenLog(state, "Nothing useful found here.", 0x888888);
    }

    // Ritual component
    if (hex.ritualComponent && !state.ritualComponents.includes(hex.ritualComponent)) {
      state.ritualComponents.push(hex.ritualComponent);
      addCovenLog(state, `Found ritual component: ${hex.ritualComponent.replace(/_/g, " ")}!`, 0xffd700);
      _ritualFoundCallback?.(hex.ritualComponent);
      hex.ritualComponent = null;
    }

    // Story event (25% chance) — now triggers UI instead of auto-resolving
    if (r() < 0.25) {
      const event = this._pickEvent(state, hex.terrain, r);
      if (event) {
        _eventTriggerCallback?.(event);
        return; // event will be resolved by the game orchestrator
      }
    }
  }

  /** Resolve a chosen event outcome. */
  static resolveEventChoice(state: CovenState, event: CovenEvent, choiceIndex: number): void {
    if (choiceIndex >= event.choices.length) return;
    if (event.unique) _usedEventIds.add(event.id);

    const outcome = event.choices[choiceIndex].outcome;
    addCovenLog(state, outcome.text, 0xccbbaa);

    if (outcome.health) state.health = Math.min(state.maxHealth, Math.max(0, state.health + outcome.health));
    if (outcome.mana) state.mana = Math.min(state.maxMana, state.mana + outcome.mana);
    if (outcome.ingredients) {
      for (const { id, count } of outcome.ingredients) addIngredient(state, id, count);
    }
    if (outcome.ingredientLoss) {
      const current = state.ingredients.get(outcome.ingredientLoss) ?? 0;
      if (current > 0) state.ingredients.set(outcome.ingredientLoss, current - 1);
    }
    if (outcome.revealHexes) {
      revealAround(state, state.playerPosition, outcome.revealHexes);
    }
    // Spell learning from events
    if ((outcome as any).learnSpell && !state.learnedSpells.includes((outcome as any).learnSpell)) {
      state.learnedSpells.push((outcome as any).learnSpell);
      addCovenLog(state, `Learned new spell: ${(outcome as any).learnSpell.replace(/_/g, " ")}!`, 0xcc88ff);
    }
  }

  private static _pickEvent(state: CovenState, terrain: CovenTerrain, r: () => number): CovenEvent | null {
    const candidates = COVEN_EVENTS.filter((e) => {
      if (e.unique && _usedEventIds.has(e.id)) return false;
      if (e.minDay && state.day < e.minDay) return false;
      if (e.terrains && !e.terrains.includes(terrain)) return false;
      return true;
    });
    if (candidates.length === 0) return null;
    return candidates[Math.floor(r() * candidates.length)];
  }

  static cleanup(): void { _forageCallback = null; _ritualFoundCallback = null; _eventTriggerCallback = null; _usedEventIds.clear(); }
}
