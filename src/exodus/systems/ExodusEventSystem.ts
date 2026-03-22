// ---------------------------------------------------------------------------
// Exodus mode — event resolution engine
// ---------------------------------------------------------------------------

import { ExodusConfig } from "../config/ExodusConfig";
import { ALL_EVENTS, RELIC_DEFS, getEventsForRegion } from "../config/ExodusEventDefs";
import type { ExodusState, ExodusEvent, ExodusOutcome } from "../state/ExodusState";
import { ExodusPhase, addLogEntry, exodusRng } from "../state/ExodusState";
import { ExodusResourceSystem } from "./ExodusResourceSystem";
import { ExodusPursuerSystem } from "./ExodusPursuerSystem";
import { revealAround } from "./ExodusMapGenerator";

// ---------------------------------------------------------------------------
// Callbacks
// ---------------------------------------------------------------------------

type EventTriggerCallback = (event: ExodusEvent) => void;
type OutcomeCallback = (outcome: ExodusOutcome) => void;
type CombatTriggerCallback = (danger: number) => void;

let _eventTriggerCallback: EventTriggerCallback | null = null;
let _outcomeCallback: OutcomeCallback | null = null;
let _combatTriggerCallback: CombatTriggerCallback | null = null;

// ---------------------------------------------------------------------------
// ExodusEventSystem
// ---------------------------------------------------------------------------

export class ExodusEventSystem {
  static setEventTriggerCallback(cb: EventTriggerCallback | null): void {
    _eventTriggerCallback = cb;
  }
  static setOutcomeCallback(cb: OutcomeCallback | null): void {
    _outcomeCallback = cb;
  }
  static setCombatTriggerCallback(cb: CombatTriggerCallback | null): void {
    _combatTriggerCallback = cb;
  }

  /** Check if the current hex has an event and trigger it. Returns true if event was triggered. */
  static checkForEvent(state: ExodusState): boolean {
    const key = `${state.caravanPosition.q},${state.caravanPosition.r}`;
    const hex = state.hexes.get(key);
    if (!hex) return false;

    // Pick event from hex loot first
    if (hex.loot) {
      ExodusResourceSystem.applyLoot(state, hex.loot);
      hex.loot = null;
    }

    // Check for pre-placed or random event
    const regionId = ExodusConfig.REGION_DEFS[hex.region]?.id ?? "ashen_fields";
    const event = this._pickEvent(state, regionId);

    if (event) {
      state.currentEvent = event;
      state.phase = ExodusPhase.EVENT;
      addLogEntry(state, `Event: ${event.title}`, 0xffd700);
      _eventTriggerCallback?.(event);
      return true;
    }

    return false;
  }

  /** Pick a suitable event for the current context. */
  private static _pickEvent(state: ExodusState, regionId: string): ExodusEvent | null {
    const rng = exodusRng(state.seed + state.day * 41 + state.caravanPosition.q * 7);

    // Check for chained event first (always triggers — stored separately so it can't be lost)
    if (state.pendingChainEventId) {
      const chained = ALL_EVENTS.find((e) => e.id === state.pendingChainEventId);
      state.pendingChainEventId = null;
      if (chained) return chained;
    }
    state.pendingOutcome = null;

    // Dynamic event trigger rate based on game state
    const currentHex = state.hexes.get(`${state.caravanPosition.q},${state.caravanPosition.r}`);
    const danger = currentHex?.dangerLevel ?? 1;

    let eventChance = 0.25; // base 25%
    eventChance += danger * 0.04; // +4% per danger level (max +20%)
    eventChance += Math.min(0.1, state.day * 0.003); // slowly increase over time
    if (state.morale < 30) eventChance += 0.08; // more events when desperate
    if (state.hope < 25) eventChance += 0.05; // more events when hope is low
    if (state.mercy > 15) eventChance += 0.05; // merciful caravans attract more encounters
    eventChance = Math.min(0.55, Math.max(0.15, eventChance)); // clamp 15%-55%

    if (rng() > eventChance) return null;

    const candidates = getEventsForRegion(regionId).filter((e) => {
      if (e.unique && state.usedEventIds.has(e.id)) return false;
      if (e.minDay !== undefined && state.day < e.minDay) return false;
      if (e.maxDay !== undefined && state.day > e.maxDay) return false;
      if (e.requiresMercy !== undefined && state.mercy < e.requiresMercy) return false;
      if (e.requiresRelic && !state.relics.find((r) => r.id === e.requiresRelic)) return false;
      if (e.isRegionTransition) return false; // these are triggered separately
      if (e.isBoss) return false; // bosses are triggered separately
      return true;
    });

    if (candidates.length === 0) return null;

    // Weight region-specific events higher
    const weighted: ExodusEvent[] = [];
    for (const c of candidates) {
      const weight = c.region === regionId ? 3 : 1;
      for (let i = 0; i < weight; i++) weighted.push(c);
    }

    return weighted[Math.floor(rng() * weighted.length)];
  }

  /** Apply the chosen outcome. */
  static resolveChoice(state: ExodusState, choiceIndex: number): void {
    const event = state.currentEvent;
    if (!event || choiceIndex >= event.choices.length) return;

    const choice = event.choices[choiceIndex];
    const outcome = choice.outcome;

    // Mark unique events
    if (event.unique) {
      state.usedEventIds.add(event.id);
    }

    addLogEntry(state, outcome.text, 0xdddddd);

    // Apply resource changes
    if (outcome.food) {
      state.food = Math.max(0, state.food + outcome.food);
    }
    if (outcome.supplies) {
      state.supplies = Math.max(0, state.supplies + outcome.supplies);
    }
    if (outcome.morale) {
      ExodusResourceSystem.adjustMorale(state, outcome.morale);
    }
    if (outcome.hope) {
      ExodusResourceSystem.adjustHope(state, outcome.hope);
    }

    // Member changes
    if (outcome.memberGain) {
      for (const { role, count } of outcome.memberGain) {
        ExodusResourceSystem.addMembers(state, role, count);
      }
    }
    if (outcome.memberLoss) {
      ExodusResourceSystem.removeRandomMembers(state, outcome.memberLoss);
    }
    if (outcome.woundedCount) {
      ExodusResourceSystem.woundMembers(state, outcome.woundedCount);
    }

    // Map effects
    if (outcome.revealHexes) {
      revealAround(state, state.caravanPosition, outcome.revealHexes);
    }

    // Relic
    if (outcome.relicId) {
      const relicDef = RELIC_DEFS[outcome.relicId];
      if (relicDef && !state.relics.find((r) => r.id === outcome.relicId)) {
        state.relics.push({
          id: outcome.relicId,
          name: relicDef.name,
          description: relicDef.description,
          effect: relicDef.effect,
          bonusAtk: relicDef.bonusAtk,
          bonusHp: relicDef.bonusHp,
          bonusHeal: relicDef.bonusHeal,
          bonusHope: relicDef.bonusHope,
        });
        addLogEntry(state, `Acquired relic: ${relicDef.name}!`, 0xffd700);
      }
    }

    // Pursuer effects
    if (outcome.pursuerDelay) {
      ExodusPursuerSystem.delayPursuer(state, outcome.pursuerDelay);
    }
    if (outcome.pursuerWeaken) {
      ExodusPursuerSystem.weakenPursuer(state, outcome.pursuerWeaken);
    }

    // Moral alignment
    if (outcome.mercy) {
      state.mercy += outcome.mercy;
    }

    // Days lost — run full night processing per lost day (food, morale, pursuer, etc.)
    if (outcome.daysLost) {
      for (let i = 0; i < outcome.daysLost; i++) {
        ExodusResourceSystem.consumeFood(state);
        ExodusResourceSystem.applyMoraleDecay(state);
        ExodusResourceSystem.applyHopeDecay(state);
        ExodusPursuerSystem.advancePursuer(state);
        if (state.food <= 0) ExodusResourceSystem.processStarvation(state);
        state.day++;
      }
      addLogEntry(state, `${outcome.daysLost} day(s) lost. Food consumed, Mordred advances.`, 0xff8844);
    }

    // Combat trigger
    if (outcome.combat) {
      state.pendingCombat = true;
      state.combatDanger = outcome.combatDanger ?? 2;
      _combatTriggerCallback?.(state.combatDanger);
    }

    // Store chain event ID separately so it survives outcome clearing
    if (outcome.chainEventId) {
      state.pendingChainEventId = outcome.chainEventId;
    }

    state.pendingOutcome = outcome;
    _outcomeCallback?.(outcome);

    // Clear current event
    state.currentEvent = null;
  }

  /** Check for region transition event when entering a new region. */
  static checkRegionTransition(state: ExodusState, newRegion: number, oldRegion: number): boolean {
    if (newRegion === oldRegion) return false;

    const regionId = ExodusConfig.REGION_DEFS[newRegion]?.id;
    if (!regionId) return false;

    // Find a region transition event
    const transitionEvent = ALL_EVENTS.find(
      (e) => e.isRegionTransition && e.region === regionId && !state.usedEventIds.has(e.id),
    );

    if (transitionEvent) {
      state.currentEvent = transitionEvent;
      state.phase = ExodusPhase.EVENT;
      addLogEntry(state, `Entering ${ExodusConfig.REGION_DEFS[newRegion].name}...`, 0xddaa44);
      _eventTriggerCallback?.(transitionEvent);
      return true;
    }

    return false;
  }

  /** Trigger a boss encounter for the current region. */
  static checkForBoss(state: ExodusState): boolean {
    const regionId = ExodusConfig.REGION_DEFS[state.currentRegion]?.id;
    if (!regionId) return false;

    const boss = ALL_EVENTS.find(
      (e) => e.isBoss && e.region === regionId && !state.usedEventIds.has(e.id)
        && (!e.minDay || state.day >= e.minDay),
    );

    if (boss) {
      state.currentEvent = boss;
      state.phase = ExodusPhase.EVENT;
      addLogEntry(state, `A great challenge blocks the path!`, 0xff4444);
      _eventTriggerCallback?.(boss);
      return true;
    }

    return false;
  }

  static cleanup(): void {
    _eventTriggerCallback = null;
    _outcomeCallback = null;
    _combatTriggerCallback = null;
  }
}
