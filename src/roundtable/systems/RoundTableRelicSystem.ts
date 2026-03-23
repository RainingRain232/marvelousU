// ---------------------------------------------------------------------------
// Round Table – Relic System (trigger relics on hooks)
// ---------------------------------------------------------------------------

import {
  RTRunState, RTCombatState, RelicHook, StatusEffectId, CardDef, CardType,
} from "../types";
import { getRelicDef } from "../config/RoundTableRelics";
import { addEffect } from "../state/RoundTableState";
import { RT_BALANCE } from "../config/RoundTableBalance";

interface TriggerContext {
  cardDef?: CardDef;
  damage?: number;
}

/** Read a numeric counter from flags. */
function getCounter(flags: Set<string>, key: string): number {
  for (const f of flags) {
    if (f.startsWith(key + "_")) return parseInt(f.substring(key.length + 1)) || 0;
  }
  return 0;
}

/** Set a numeric counter in flags. */
function setCounter(flags: Set<string>, key: string, value: number): void {
  for (const f of Array.from(flags)) {
    if (f.startsWith(key + "_")) flags.delete(f);
  }
  flags.add(`${key}_${value}`);
}

export const RoundTableRelicSystem = {
  /** Trigger all relics matching the given hook. */
  trigger(
    run: RTRunState,
    combat: RTCombatState | null,
    hook: RelicHook,
    rng: { next: () => number },
    ctx?: TriggerContext,
  ): void {
    for (const relicId of run.relics) {
      const def = getRelicDef(relicId);
      if (def.hook !== hook) continue;
      this._applyRelic(run, combat, relicId, rng, ctx);
    }
  },

  /** Check if grail fragment should double-trigger a virtue card. */
  shouldDoubleVirtue(run: RTRunState, cardDef: CardDef): boolean {
    return run.relics.includes("grail_fragment") && cardDef.type === CardType.VIRTUE;
  },

  _applyRelic(
    run: RTRunState,
    combat: RTCombatState | null,
    relicId: string,
    _rng: { next: () => number },
    ctx?: TriggerContext,
  ): void {
    if (!combat) return;

    switch (relicId) {
      // ══════════ Common ══════════
      case "excalibur_shard":
        if (combat.turn === 0) {
          addEffect(combat.playerEffects, StatusEffectId.STRENGTH, 5);
          run.flags.add("excalibur_shard_active");
        }
        break;

      case "ladys_favour":
        run.hp = Math.min(run.maxHp, run.hp + 3);
        break;

      case "merlins_hourglass":
        // Handled in startPlayerTurn
        break;

      case "iron_ring":
        if (combat.turn === 0) combat.playerBlock += 4;
        break;

      case "prayer_beads":
        run.purity = Math.min(100, run.purity + 1);
        break;

      case "war_horn":
        if (combat.turn === 2) combat.energy += 1;
        break;

      case "bag_of_marbles":
        if (combat.turn === 0) {
          for (const enemy of combat.enemies) addEffect(enemy.effects, StatusEffectId.VULNERABLE, 1);
        }
        break;

      case "blood_vial":
        if (combat.turn === 0) run.hp = Math.min(run.maxHp, run.hp + 2);
        break;

      case "bronze_scales":
        // Handled inline in CombatSystem._damagePlayer
        break;

      // ══════════ Uncommon ══════════
      case "siege_perilous":
        // Handled in _getEffectiveCost
        break;

      case "mordreds_whisper":
        if (ctx?.cardDef?.type === CardType.SIN) run.flags.add("mordred_curse_pending");
        break;

      case "pen_nib": {
        // Every 10th attack card deals double damage
        if (ctx?.cardDef && ctx.cardDef.damage > 0) {
          let count = getCounter(run.flags, "pen_nib") + 1;
          if (count >= 10) {
            run.flags.add("pen_nib_double");
            count = 0;
          }
          setCounter(run.flags, "pen_nib", count);
        }
        break;
      }

      case "ornamental_fan": {
        // Every 3rd attack in a SINGLE turn: +4 block (resets each turn via orchestrator)
        if (ctx?.cardDef && ctx.cardDef.damage > 0) {
          let count = getCounter(run.flags, "ornamental_fan") + 1;
          if (count >= 3) {
            combat.playerBlock += 4;
            count = 0;
          }
          setCounter(run.flags, "ornamental_fan", count);
        }
        break;
      }

      case "letter_opener": {
        // Every 3rd skill (non-attack, non-curse) in a turn: deal 5 to ALL
        if (ctx?.cardDef && ctx.cardDef.damage === 0 &&
            ctx.cardDef.type !== CardType.CURSE && ctx.cardDef.type !== CardType.STATUS) {
          let count = getCounter(run.flags, "letter_opener") + 1;
          if (count >= 3) {
            for (const enemy of combat.enemies) { if (enemy.hp > 0) enemy.hp -= 5; }
            count = 0;
          }
          setCounter(run.flags, "letter_opener", count);
        }
        break;
      }

      case "kunai": {
        if (ctx?.cardDef && ctx.cardDef.damage > 0) {
          let count = getCounter(run.flags, "kunai") + 1;
          if (count >= 3) { addEffect(combat.playerEffects, StatusEffectId.DEXTERITY, 1); count = 0; }
          setCounter(run.flags, "kunai", count);
        }
        break;
      }

      case "shuriken": {
        if (ctx?.cardDef && ctx.cardDef.damage > 0) {
          let count = getCounter(run.flags, "shuriken") + 1;
          if (count >= 3) { addEffect(combat.playerEffects, StatusEffectId.STRENGTH, 1); count = 0; }
          setCounter(run.flags, "shuriken", count);
        }
        break;
      }

      case "meat_on_bone":
        if (run.hp < run.maxHp * 0.5) run.hp = Math.min(run.maxHp, run.hp + 12);
        break;

      case "question_mark":
        // Handled in startPlayerTurn
        break;

      case "sundial":
        // Handled externally — track shuffles
        break;

      // ══════════ Rare ══════════
      case "grail_fragment":
        // Virtue double-trigger is checked via shouldDoubleVirtue() in combat system
        break;

      case "dead_branch":
        // Handled in CombatSystem playCard exhaust section
        break;

      case "tungsten_rod":
        // Handled in _damagePlayer
        break;

      case "bird_faced_urn":
        if (ctx?.cardDef?.type === CardType.SPELL) run.hp = Math.min(run.maxHp, run.hp + 2);
        break;

      case "snecko_eye":
        // Handled in startPlayerTurn
        break;

      // ══════════ Boss ══════════
      case "cursed_key":
        combat.maxEnergy = RT_BALANCE.STARTING_ENERGY + 1;
        break;

      case "philosophers_stone":
        if (combat.turn === 0) {
          for (const enemy of combat.enemies) addEffect(enemy.effects, StatusEffectId.STRENGTH, 1);
          combat.maxEnergy = RT_BALANCE.STARTING_ENERGY + 1;
        }
        break;

      case "velvet_choker":
        combat.maxEnergy = RT_BALANCE.STARTING_ENERGY + 1;
        break;

      case "runic_dome":
        combat.maxEnergy = RT_BALANCE.STARTING_ENERGY + 1;
        break;

      case "ectoplasm":
        combat.maxEnergy = RT_BALANCE.STARTING_ENERGY + 1;
        break;

      // ══════════ Newly added Common ══════════

      case "orichalcum":
        // on_turn_end: if 0 block, gain 6
        if (combat.playerBlock === 0) combat.playerBlock += 6;
        break;

      case "lantern":
        // on_combat_start: +1 energy on turn 1
        if (combat.turn === 0) combat.energy += 1;
        break;

      case "happy_flower": {
        // on_turn_start: every 3 turns, +1 energy
        if (combat.turn > 0 && combat.turn % 3 === 0) combat.energy += 1;
        break;
      }

      case "dream_catcher":
        // on_rest: handled externally (add random card) — flag it
        run.flags.add("dream_catcher_triggered");
        break;

      case "nunchaku": {
        // on_card_play: every 10 attacks, +1 energy
        if (ctx?.cardDef && ctx.cardDef.damage > 0) {
          let count = getCounter(run.flags, "nunchaku") + 1;
          if (count >= 10) { combat.energy += 1; count = 0; }
          setCounter(run.flags, "nunchaku", count);
        }
        break;
      }

      // ══════════ Newly added Uncommon ══════════

      case "mercury_hourglass":
        // on_turn_start: deal 3 to all enemies
        for (const e of combat.enemies) { if (e.hp > 0) e.hp -= 3; }
        break;

      case "mummified_hand":
        // on_card_play: if spell, random card in hand costs 0
        if (ctx?.cardDef?.type === CardType.SPELL && combat.hand.length > 0) {
          const idx = Math.floor(_rng.next() * combat.hand.length);
          (combat.hand[idx] as any)._sneckoCost = 0;
        }
        break;

      case "horn_cleat":
        // on_turn_start: turn 2, +14 block
        if (combat.turn === 2) combat.playerBlock += 14;
        break;

      case "singing_bowl":
        // passive: handled in reward screen (skip card → +2 max HP)
        break;

      case "darkstone_periapt":
        // passive: handled when gaining curses (gain 6 max HP)
        break;

      case "purity_pendant":
        // passive: purity changes doubled — handled in combat system purity section
        break;

      case "centennial_puzzle":
        // on_take_damage: draw 3 cards — need combat + rng
        if (ctx?.damage && ctx.damage > 0) {
          // Flag for draw (handled in orchestrator since we need rng for draw)
          run.flags.add("centennial_draw_3");
        }
        break;

      // ══════════ Newly added Rare ══════════

      case "du_vu_doll": {
        // on_combat_start: +1 strength per curse in deck
        if (combat.turn === 0) {
          let curseCount = 0;
          for (const c of run.deck) {
            if (c.defId.startsWith("curse_")) curseCount++;
          }
          if (curseCount > 0) addEffect(combat.playerEffects, StatusEffectId.STRENGTH, curseCount);
        }
        break;
      }

      case "incense_burner": {
        // on_turn_start: every 6 turns, reduce all incoming damage to 1 next turn
        if (combat.turn > 0 && combat.turn % 6 === 0) {
          // Use holy_shield as a proxy for intangible (blocks 1 hit)
          addEffect(combat.playerEffects, StatusEffectId.HOLY_SHIELD, 1);
        }
        break;
      }

      case "unceasing_top":
        // passive: when hand is empty during turn, draw 1 — handled via flag
        // Checked after each card play in orchestrator
        break;

      case "stone_calendar":
        // on_turn_end: at end of turn 7, deal 52 to all
        if (combat.turn === 7) {
          for (const e of combat.enemies) { if (e.hp > 0) e.hp -= 52; }
          combat.log.push("Stone Calendar unleashes 52 damage!");
        }
        break;

      // ══════════ Newly added Boss ══════════

      case "astrolabe":
        // on_combat_start: +1 energy (upgrades handled on pickup externally)
        combat.maxEnergy = RT_BALANCE.STARTING_ENERGY + 1;
        break;

      case "sozu":
        // passive: +1 energy, no potions — energy handled here, potion block elsewhere
        combat.maxEnergy = RT_BALANCE.STARTING_ENERGY + 1;
        break;

      case "coffee_dripper":
        // passive: +1 energy, no rest — energy handled here, rest block elsewhere
        combat.maxEnergy = RT_BALANCE.STARTING_ENERGY + 1;
        break;
    }
  },
};
