// ---------------------------------------------------------------------------
// Exodus mode — combat bridge to autobattler
// ---------------------------------------------------------------------------
// This system generates a simplified combat result based on the caravan's
// strength vs the encounter danger level. Full autobattler integration
// can be added later; for now we use a statistical resolution.
// ---------------------------------------------------------------------------

import { ExodusConfig, getDifficultyConfig } from "../config/ExodusConfig";
import type { ExodusState } from "../state/ExodusState";
import { addLogEntry, exodusRng, combatReadyMembers, combatCapableMembers } from "../state/ExodusState";
import { ExodusResourceSystem } from "./ExodusResourceSystem";

// ---------------------------------------------------------------------------
// Combat result
// ---------------------------------------------------------------------------

export interface ExodusCombatResult {
  outcome: "victory" | "defeat" | "retreat";
  casualties: number;
  wounded: number;
  enemiesDefeated: number;
  description: string;
}

// ---------------------------------------------------------------------------
// Callbacks
// ---------------------------------------------------------------------------

type CombatResultCallback = (result: ExodusCombatResult) => void;

let _combatResultCallback: CombatResultCallback | null = null;

// ---------------------------------------------------------------------------
// ExodusCombatBridge
// ---------------------------------------------------------------------------

export class ExodusCombatBridge {
  static setCombatResultCallback(cb: CombatResultCallback | null): void {
    _combatResultCallback = cb;
  }

  /** Resolve combat statistically. dangerLevel 1-5. */
  static resolveCombat(state: ExodusState, dangerLevel: number): ExodusCombatResult {
    const rng = exodusRng(state.seed + state.day * 53 + dangerLevel);
    const diff = getDifficultyConfig(state.difficulty);

    // Calculate caravan strength
    const fighters = combatCapableMembers(state);
    let caravanStrength = 0;
    for (const m of fighters) {
      let atk = m.atk;
      let hp = m.hp;
      // Relic bonuses
      for (const relic of state.relics) {
        if (relic.bonusAtk) atk += relic.bonusAtk; // applies to all fighters now
        if (relic.bonusHp) hp += relic.bonusHp;
      }
      caravanStrength += atk + hp * 0.15;
    }

    // Formation attack bonus (only attack — defense reduces casualties separately)
    const formAtkMult = state.formationBonus?.atkMult ?? 1.0;
    const formDefMult = state.formationBonus?.defMult ?? 1.0;
    caravanStrength *= formAtkMult;

    // War wagon upgrade bonus
    if (state.upgrades.find((u) => u.id === "war_wagon")?.built) {
      caravanStrength *= 1.2;
    }

    // Terrain-based combat modifiers
    const currentTerrain = state.currentTerrain;
    if (currentTerrain === "forest" || currentTerrain === "mountain") {
      caravanStrength *= 1.15;
    }

    // Morale combat modifier (high morale = fight better)
    if (state.morale > 60) caravanStrength *= 1.1;
    else if (state.morale < 30) caravanStrength *= 0.85;

    // Enemy strength scales with danger and day (slower scaling)
    const baseEnemy = dangerLevel * 45 + state.day * 4;
    const enemyStrength = baseEnemy * diff.combatDamageMult;

    // Power ratio (no defense double-dip here — defense reduces casualties below)
    const ratio = caravanStrength / Math.max(enemyStrength, 1);
    const roll = rng();

    let outcome: "victory" | "defeat" | "retreat";
    let casualties = 0;
    let wounded = 0;
    let description = "";

    if (ratio > 1.5 || (ratio > 1.0 && roll > 0.3)) {
      // Victory — defense formation reduces casualties
      outcome = "victory";
      const rawCasualties = Math.floor(rng() * Math.max(1, dangerLevel - 1));
      casualties = Math.max(0, Math.floor(rawCasualties / formDefMult));
      wounded = Math.max(0, Math.floor((rng() * dangerLevel) / formDefMult));
      const enemiesDefeated = Math.floor(10 + dangerLevel * 5 + rng() * 10);

      if (ratio > 2.0) {
        description = "A decisive victory! Your forces overwhelmed the enemy with minimal losses.";
      } else if (ratio > 1.3) {
        description = "A hard-fought victory. Your knights held the line and the enemy broke.";
      } else {
        description = "Victory — but at a cost. The battle was closer than you'd like.";
      }

      state.battlesWon++;
      ExodusResourceSystem.adjustMorale(state, ExodusConfig.MORALE_VICTORY_BONUS);

      // Decisive victory weakens the pursuer and gives loot
      if (ratio > 2.0 && dangerLevel >= 3) {
        state.pursuer.weakened += 1;
        state.pursuer.strength = Math.max(5, state.pursuer.strength - 5);
        state.supplies += 5;
        addLogEntry(state, "Decisive victory! Captured enemy supplies. Mordred's host weakened.", 0x44ff44);
      }

      // Loot from battle (food from enemy camp)
      const lootFood = Math.floor(3 + dangerLevel * 2 + rng() * 5);
      state.food += lootFood;

      // Veteran kills tracking
      for (const m of fighters) {
        if (m.role === "knight" || m.role === "soldier" || m.role === "archer") {
          m.kills += Math.floor(rng() * 3);
        }
      }

      const result: ExodusCombatResult = { outcome, casualties, wounded, enemiesDefeated, description };
      this._applyCombatLosses(state, casualties, wounded, rng);
      state.lastBattleResult = outcome;
      state.supplies = Math.max(0, state.supplies - ExodusConfig.SUPPLIES_PER_BATTLE);
      addLogEntry(state, description, 0x44ff44);
      _combatResultCallback?.(result);
      return result;

    } else if (ratio > 0.5 || roll > 0.5) {
      // Retreat — defense formation reduces straggler losses
      outcome = "retreat";
      const rawLoss = ExodusConfig.RETREAT_STRAGGLER_LOSS_MIN +
        Math.floor(rng() * (ExodusConfig.RETREAT_STRAGGLER_LOSS_MAX - ExodusConfig.RETREAT_STRAGGLER_LOSS_MIN + 1));
      casualties = Math.max(0, rawLoss - (formDefMult > 1.2 ? 1 : 0));
      wounded = Math.max(0, 1 + Math.floor(rng() * 2) - (formDefMult > 1.2 ? 1 : 0));
      description = formDefMult > 1.2
        ? "Your shield wall holds long enough for an orderly retreat. Losses are minimized."
        : "The battle turns against you. You sound the retreat — the caravan escapes, but stragglers are lost.";

      state.battlesRetreated++;
      state.supplies = Math.max(0, state.supplies - ExodusConfig.RETREAT_SUPPLY_LOSS);
      ExodusResourceSystem.adjustMorale(state, -Math.floor(ExodusConfig.MORALE_DEFEAT_PENALTY / 2));

      const result: ExodusCombatResult = { outcome, casualties, wounded, enemiesDefeated: 0, description };
      this._applyCombatLosses(state, casualties, wounded, rng);
      state.lastBattleResult = outcome;
      addLogEntry(state, description, 0xff8844);
      _combatResultCallback?.(result);
      return result;

    } else {
      // Defeat — defense still helps limit casualties
      outcome = "defeat";
      casualties = Math.max(1, Math.floor((2 + rng() * dangerLevel * 2) / formDefMult));
      wounded = Math.max(1, Math.floor((2 + rng() * dangerLevel) / formDefMult));
      description = "Defeat. The enemy overwhelms your forces. The caravan scatters and regroups with heavy losses.";

      state.battlesLost++;
      ExodusResourceSystem.adjustMorale(state, -ExodusConfig.MORALE_DEFEAT_PENALTY);
      ExodusResourceSystem.adjustHope(state, -5);
      state.supplies = Math.max(0, state.supplies - ExodusConfig.SUPPLIES_PER_BATTLE * 2);

      const result: ExodusCombatResult = { outcome, casualties, wounded, enemiesDefeated: 0, description };
      this._applyCombatLosses(state, casualties, wounded, rng);
      state.lastBattleResult = outcome;
      addLogEntry(state, description, 0xff4444);
      _combatResultCallback?.(result);
      return result;
    }
  }

  private static _applyCombatLosses(
    state: ExodusState,
    casualties: number,
    wounded: number,
    rng: () => number,
  ): void {
    // Remove casualties (prefer non-knights, non-healers)
    for (let i = 0; i < casualties && state.members.length > 0; i++) {
      const combatants = state.members.filter(
        (m) => m.role !== "refugee" && m.role !== "healer",
      );
      const pool = combatants.length > 0 ? combatants : state.members;
      const target = pool[Math.floor(rng() * pool.length)];
      const idx = state.members.indexOf(target);
      if (idx >= 0) {
        state.members.splice(idx, 1);
        state.totalDeaths++;
        addLogEntry(state, `${target.name} (${target.role}) fell in battle.`, 0xff4444);
      }
    }

    // Wound members
    ExodusResourceSystem.woundMembers(state, wounded);
  }

  static cleanup(): void {
    _combatResultCallback = null;
  }
}
