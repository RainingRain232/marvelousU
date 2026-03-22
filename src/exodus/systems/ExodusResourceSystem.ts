// ---------------------------------------------------------------------------
// Exodus mode — resource management system
// ---------------------------------------------------------------------------

import { ExodusConfig, getDifficultyConfig } from "../config/ExodusConfig";
import { RELIC_DEFS } from "../config/ExodusEventDefs";
import type { ExodusState, CaravanMember, CaravanRole } from "../state/ExodusState";
import { addLogEntry, createCaravanMember, exodusRng, getMemberDeathText, memberDisplayName } from "../state/ExodusState";

// ---------------------------------------------------------------------------
// Callbacks
// ---------------------------------------------------------------------------

type ResourceCallback = (resource: string, oldVal: number, newVal: number) => void;
type MemberChangeCallback = (type: "gain" | "loss" | "wounded" | "healed", member: CaravanMember) => void;

let _resourceCallback: ResourceCallback | null = null;
let _memberChangeCallback: MemberChangeCallback | null = null;

// ---------------------------------------------------------------------------
// ExodusResourceSystem
// ---------------------------------------------------------------------------

export class ExodusResourceSystem {
  static setResourceCallback(cb: ResourceCallback | null): void {
    _resourceCallback = cb;
  }
  static setMemberChangeCallback(cb: MemberChangeCallback | null): void {
    _memberChangeCallback = cb;
  }

  // -------------------------------------------------------------------------
  // Food
  // -------------------------------------------------------------------------

  static consumeFood(state: ExodusState): void {
    const count = state.members.length;
    const diff = getDifficultyConfig(state.difficulty);
    let consumptionRate = ExodusConfig.FOOD_PER_PERSON_PER_DAY;
    // Provisions rack reduces consumption by 20%
    if (state.upgrades.find((u) => u.id === "provisions_rack")?.built) {
      consumptionRate *= 0.8;
    }
    // Pragmatic mercy bonus: -10% food consumption
    if (state.mercy < -10) {
      consumptionRate *= 0.9;
    }
    const cost = Math.ceil(count * consumptionRate / diff.foodMult);
    const old = state.food;
    state.food = Math.max(0, state.food - cost);
    _resourceCallback?.("food", old, state.food);
    if (state.food <= 10 && state.food > 0) {
      addLogEntry(state, `Food is running dangerously low! (${state.food} remaining)`, 0xff8844);
    }
  }

  /** Get the effective food consumption per day (for HUD forecast). */
  static getFoodPerDay(state: ExodusState): number {
    const count = state.members.length;
    const diff = getDifficultyConfig(state.difficulty);
    let rate = ExodusConfig.FOOD_PER_PERSON_PER_DAY;
    if (state.upgrades.find((u) => u.id === "provisions_rack")?.built) rate *= 0.8;
    if (state.mercy < -10) rate *= 0.9;
    return Math.ceil(count * rate / diff.foodMult);
  }

  static processStarvation(state: ExodusState): void {
    const rng = exodusRng(state.seed + state.day * 13);
    const deaths = ExodusConfig.STARVATION_DEATHS_MIN +
      Math.floor(rng() * (ExodusConfig.STARVATION_DEATHS_MAX - ExodusConfig.STARVATION_DEATHS_MIN + 1));

    for (let i = 0; i < deaths && state.members.length > 0; i++) {
      // Refugees and peasants die first
      const idx = state.members.findIndex(
        (m) => m.role === "refugee" || m.role === "peasant",
      ) ?? state.members.length - 1;
      const target = idx >= 0 ? idx : state.members.length - 1;
      const member = state.members[target];
      state.members.splice(target, 1);
      state.totalDeaths++;
      addLogEntry(state, `${member.name} (${member.role}) has died of starvation.`, 0xff4444);
      _memberChangeCallback?.("loss", member);
    }

    const oldMorale = state.morale;
    state.morale = Math.max(0, state.morale - ExodusConfig.MORALE_STARVATION_PENALTY);
    _resourceCallback?.("morale", oldMorale, state.morale);
  }

  // -------------------------------------------------------------------------
  // Morale
  // -------------------------------------------------------------------------

  static applyMoraleDecay(state: ExodusState): void {
    const old = state.morale;
    state.morale = Math.max(0, state.morale - ExodusConfig.MORALE_DECAY_PER_DAY);
    _resourceCallback?.("morale", old, state.morale);
  }

  static adjustMorale(state: ExodusState, delta: number): void {
    const old = state.morale;
    state.morale = Math.max(0, Math.min(100, state.morale + delta));
    _resourceCallback?.("morale", old, state.morale);
    if (delta > 0) addLogEntry(state, `Morale rises. (+${delta})`, 0x44ff44);
    else if (delta < 0) addLogEntry(state, `Morale falls. (${delta})`, 0xff8844);
  }

  // -------------------------------------------------------------------------
  // Hope
  // -------------------------------------------------------------------------

  static applyHopeDecay(state: ExodusState): void {
    const old = state.hope;
    state.hope = Math.max(0, state.hope - ExodusConfig.HOPE_DECAY_PER_DAY);
    _resourceCallback?.("hope", old, state.hope);
    if (state.hope <= 20 && state.hope > 0) {
      addLogEntry(state, "Hope is fading...", 0xaa44ff);
    }
  }

  static adjustHope(state: ExodusState, delta: number): void {
    const old = state.hope;
    state.hope = Math.max(0, Math.min(100, state.hope + delta));
    _resourceCallback?.("hope", old, state.hope);
    if (delta > 0) addLogEntry(state, `Hope swells. (+${delta})`, 0xffd700);
    else if (delta < 0) addLogEntry(state, `Hope diminishes. (${delta})`, 0xaa44ff);
  }

  // -------------------------------------------------------------------------
  // Relic passive effects
  // -------------------------------------------------------------------------

  static applyRelicEffects(state: ExodusState): void {
    for (const relic of state.relics) {
      if (relic.bonusHope && relic.bonusHope > 0) {
        const old = state.hope;
        state.hope = Math.min(100, state.hope + relic.bonusHope);
        if (state.hope !== old) {
          _resourceCallback?.("hope", old, state.hope);
        }
      }
      if (relic.bonusHeal && relic.bonusHeal > 0) {
        let healed = 0;
        for (const m of state.members) {
          if (m.wounded && healed < relic.bonusHeal) {
            m.wounded = false;
            m.hp = m.maxHp;
            healed++;
            _memberChangeCallback?.("healed", m);
          }
        }
        if (healed > 0) {
          addLogEntry(state, `${relic.name} heals ${healed} wounded.`, 0x44ff44);
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Desertion
  // -------------------------------------------------------------------------

  static processDesertion(state: ExodusState): void {
    const rng = exodusRng(state.seed + state.day * 31);
    if (rng() > ExodusConfig.DESERTION_CHANCE) return;

    // Soldiers and peasants desert, never knights or healers
    const candidates = state.members.filter(
      (m) => m.role === "soldier" || m.role === "peasant",
    );
    if (candidates.length === 0) return;

    const deserter = candidates[Math.floor(rng() * candidates.length)];
    const idx = state.members.indexOf(deserter);
    if (idx >= 0) {
      state.members.splice(idx, 1);
      state.totalDeaths++;
      addLogEntry(state, `${deserter.name} has deserted the caravan.`, 0xff8844);
      _memberChangeCallback?.("loss", deserter);
    }
  }

  // -------------------------------------------------------------------------
  // Member management
  // -------------------------------------------------------------------------

  static addMembers(state: ExodusState, role: CaravanRole, count: number): void {
    const rng = exodusRng(state.seed + state.day * 7 + state.members.length);
    for (let i = 0; i < count; i++) {
      const member = createCaravanMember(state.nextMemberId++, role, rng);
      state.members.push(member);
      state.totalRecruits++;
      if (role === "refugee") state.refugeesSaved++;
      addLogEntry(state, `${member.name} (${role}) joins the caravan.`, 0x44ff44);
      _memberChangeCallback?.("gain", member);
    }
  }

  static removeRandomMembers(state: ExodusState, count: number): void {
    const rng = exodusRng(state.seed + state.day * 17);
    for (let i = 0; i < count && state.members.length > 0; i++) {
      const idx = Math.floor(rng() * state.members.length);
      const member = state.members[idx];
      state.members.splice(idx, 1);
      state.totalDeaths++;
      this._recordFallen(state, member);
      addLogEntry(state, getMemberDeathText(member), 0xff4444);
      _memberChangeCallback?.("loss", member);
    }
  }

  /** Track fallen heroes for the results screen epitaph. */
  private static _recordFallen(state: ExodusState, member: CaravanMember): void {
    if (member.daysInCaravan >= 3 || member.isNamed || member.role === "knight") {
      state.fallenHeroes.push({
        name: memberDisplayName(member),
        role: member.role,
        day: state.day,
        quote: member.deathQuote,
      });
    }
  }

  static woundMembers(state: ExodusState, count: number): void {
    if (count < 0) {
      // Negative means heal
      let healed = 0;
      for (const m of state.members) {
        if (m.wounded && healed < Math.abs(count)) {
          m.wounded = false;
          m.hp = m.maxHp;
          healed++;
          _memberChangeCallback?.("healed", m);
        }
      }
      return;
    }

    const rng = exodusRng(state.seed + state.day * 23);
    const candidates = state.members.filter((m) => !m.wounded);
    for (let i = 0; i < count && candidates.length > 0; i++) {
      const idx = Math.floor(rng() * candidates.length);
      const member = candidates[idx];
      member.wounded = true;
      member.hp = Math.floor(member.maxHp * 0.3);
      candidates.splice(idx, 1);
      addLogEntry(state, `${member.name} has been wounded.`, 0xff8844);
      _memberChangeCallback?.("wounded", member);
    }
  }

  static healWoundedAtCamp(state: ExodusState): void {
    let healed = 0;
    for (const m of state.members) {
      if (m.wounded && healed < ExodusConfig.WOUNDED_HEAL_PER_CAMP) {
        m.wounded = false;
        m.hp = m.maxHp;
        healed++;
        _memberChangeCallback?.("healed", m);
      }
    }
    if (healed > 0) {
      addLogEntry(state, `${healed} wounded have recovered.`, 0x44ff44);
    }
  }

  // -------------------------------------------------------------------------
  // Apply loot from hex
  // -------------------------------------------------------------------------

  static applyLoot(state: ExodusState, loot: { food?: number; supplies?: number; members?: CaravanRole[]; relic?: string }): void {
    if (loot.food) {
      const old = state.food;
      state.food += loot.food;
      _resourceCallback?.("food", old, state.food);
      addLogEntry(state, `Found ${loot.food} food.`, 0x44ff44);
    }
    if (loot.supplies) {
      const old = state.supplies;
      state.supplies += loot.supplies;
      _resourceCallback?.("supplies", old, state.supplies);
      addLogEntry(state, `Found ${loot.supplies} supplies.`, 0x44ff44);
    }
    if (loot.members) {
      for (const role of loot.members) {
        this.addMembers(state, role, 1);
      }
    }
    if (loot.relic) {
      const relicDef = RELIC_DEFS[loot.relic];
      if (relicDef) {
        state.relics.push({
          id: loot.relic,
          name: relicDef.name,
          description: relicDef.description,
          effect: relicDef.effect,
          bonusAtk: relicDef.bonusAtk,
          bonusHp: relicDef.bonusHp,
          bonusHeal: relicDef.bonusHeal,
          bonusHope: relicDef.bonusHope,
        });
        addLogEntry(state, `Found relic: ${relicDef.name}!`, 0xffd700);
      }
    }
  }

  static cleanup(): void {
    _resourceCallback = null;
    _memberChangeCallback = null;
  }
}
