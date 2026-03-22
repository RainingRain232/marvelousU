// ---------------------------------------------------------------------------
// Exodus mode — day phase management system (enhanced)
// ---------------------------------------------------------------------------

import { ExodusPhase } from "../state/ExodusState";
import type { ExodusState } from "../state/ExodusState";
import { addLogEntry, exodusRng, scoutCount, createCaravanMember } from "../state/ExodusState";
import { ExodusConfig } from "../config/ExodusConfig";
import { ExodusResourceSystem } from "./ExodusResourceSystem";
import { ExodusPursuerSystem } from "./ExodusPursuerSystem";
import { hexKey } from "@world/hex/HexCoord";

// ---------------------------------------------------------------------------
// Callbacks
// ---------------------------------------------------------------------------

type PhaseCallback = (phase: ExodusPhase, day: number) => void;
type NightEventCallback = (text: string, color: number) => void;

let _phaseCallback: PhaseCallback | null = null;
let _nightEventCallback: NightEventCallback | null = null;

// ---------------------------------------------------------------------------
// Night event descriptions for flavor
// ---------------------------------------------------------------------------

const NIGHT_FLAVOR = [
  "The campfire crackles softly. Stars wheel overhead.",
  "An owl hoots in the darkness. The caravan sleeps.",
  "Someone hums an old Camelot hymn. Others join in.",
  "A child asks: 'How much further?' No one answers.",
  "The wind carries the faint sound of drums from the east.",
  "Dawn is hours away. The sentries change watch.",
  "Wolves howl in the distance. The horses stir nervously.",
  "Rain patters against the canvas tents.",
  "A healer tends to the wounded by candlelight.",
  "The old knight polishes his sword. He's done this every night since Camelot fell.",
];

const NIGHT_AMBUSH_DESCRIPTIONS = [
  "Arrows whistle from the darkness! Raiders attack the sleeping camp!",
  "A war horn shatters the silence — Mordred's scouts have found you!",
  "Bandits strike from the shadows, targeting the supply carts!",
  "Wolves — or something wearing wolf skin — circle the camp perimeter!",
  "The sentries cry alarm too late. Dark figures are already inside the camp!",
];

// ---------------------------------------------------------------------------
// DaySystem
// ---------------------------------------------------------------------------

export class ExodusDaySystem {
  static setPhaseCallback(cb: PhaseCallback | null): void {
    _phaseCallback = cb;
  }
  static setNightEventCallback(cb: NightEventCallback | null): void {
    _nightEventCallback = cb;
  }

  static advancePhase(state: ExodusState): boolean {
    let dayComplete = false;

    switch (state.phase) {
      case ExodusPhase.DAWN:
        state.phase = ExodusPhase.MARCH;
        addLogEntry(state, `Day ${state.day} — The caravan stirs at dawn.`, 0xffd700);
        break;

      case ExodusPhase.MARCH:
        state.phase = ExodusPhase.EVENT;
        break;

      case ExodusPhase.EVENT:
        state.phase = ExodusPhase.CAMP;
        break;

      case ExodusPhase.CAMP:
        state.phase = ExodusPhase.NIGHT;
        break;

      case ExodusPhase.NIGHT:
        this._processNight(state);
        state.day++;
        state.phase = ExodusPhase.DAWN;
        dayComplete = true;
        break;

      case ExodusPhase.BATTLE:
        state.phase = ExodusPhase.CAMP;
        state.pendingCombat = false;
        break;

      default:
        break;
    }

    _phaseCallback?.(state.phase, state.day);
    return dayComplete;
  }

  static setPhase(state: ExodusState, phase: ExodusPhase): void {
    state.phase = phase;
    _phaseCallback?.(phase, state.day);
  }

  // -------------------------------------------------------------------------
  // Night processing
  // -------------------------------------------------------------------------

  private static _processNight(state: ExodusState): void {
    const rng = exodusRng(state.seed + state.day * 71);

    // 1. Night flavor text
    const flavor = NIGHT_FLAVOR[state.day % NIGHT_FLAVOR.length];
    addLogEntry(state, flavor, 0x666688);
    _nightEventCallback?.(flavor, 0x666688);

    // 2. Consume food
    ExodusResourceSystem.consumeFood(state);

    // 3. Morale decay
    ExodusResourceSystem.applyMoraleDecay(state);

    // 4. Hope decay
    ExodusResourceSystem.applyHopeDecay(state);

    // 5. Relic passive effects
    ExodusResourceSystem.applyRelicEffects(state);

    // 6. Starvation
    if (state.food <= 0) {
      ExodusResourceSystem.processStarvation(state);
    }

    // 7. Desertion
    if (state.morale <= ExodusConfig.DESERTION_MORALE_THRESHOLD) {
      ExodusResourceSystem.processDesertion(state);
    }

    // 8. Advance pursuer
    ExodusPursuerSystem.advancePursuer(state);

    // 9. Night events (ambush, recovery, bonding)
    this._rollNightEvents(state, rng);

    // 10. Veteran bonuses — long-serving members get tougher
    this._applyVeteranBonuses(state);

    // 11. Check game over conditions
    if (state.hope <= 0) {
      state.gameOver = true;
      state.phase = ExodusPhase.GAME_OVER;
      addLogEntry(state, "Hope has been extinguished. The caravan scatters into the darkness.", 0xff4444);
      _phaseCallback?.(ExodusPhase.GAME_OVER, state.day);
      return;
    }
    if (state.members.length === 0) {
      state.gameOver = true;
      state.phase = ExodusPhase.GAME_OVER;
      addLogEntry(state, "The last of the caravan has fallen.", 0xff4444);
      _phaseCallback?.(ExodusPhase.GAME_OVER, state.day);
      return;
    }
    if (state.morale <= ExodusConfig.MUTINY_MORALE_THRESHOLD) {
      state.gameOver = true;
      state.phase = ExodusPhase.GAME_OVER;
      addLogEntry(state, "Mutiny. Your people turn on each other. The exodus is over.", 0xff4444);
      _phaseCallback?.(ExodusPhase.GAME_OVER, state.day);
      return;
    }

    // 12. Increment member day counters
    for (const m of state.members) {
      m.daysInCaravan++;
    }
  }

  // -------------------------------------------------------------------------
  // Night events — much richer than before
  // -------------------------------------------------------------------------

  private static _rollNightEvents(state: ExodusState, rng: () => number): void {
    const key = hexKey(state.caravanPosition.q, state.caravanPosition.r);
    const currentHex = state.hexes.get(key);
    const danger = currentHex?.dangerLevel ?? 1;
    const scouts = scoutCount(state);
    const healers = state.members.filter((m) => m.role === "healer" && !m.wounded).length;
    const craftsmen = state.members.filter((m) => m.role === "craftsman" && !m.wounded).length;
    const peasants = state.members.filter((m) => m.role === "peasant" && !m.wounded).length;

    // === PASSIVE ROLE SYNERGIES (always apply) ===

    // Refugees: provide hope (they're what you're fighting for) — scales with mercy
    const refugees = state.members.filter((m) => m.role === "refugee").length;
    if (refugees > 0) {
      // Each refugee provides a tiny passive hope boost (the more you save, the more hopeful)
      const hopeBonus = Math.min(3, Math.floor(refugees / 4));
      if (hopeBonus > 0 && state.hope < 90) {
        state.hope = Math.min(100, state.hope + hopeBonus);
      }
      // Mercy-scaled morale: compassionate leaders feel good about saving refugees
      if (state.mercy > 5 && refugees >= 4 && rng() < 0.15) {
        ExodusResourceSystem.adjustMorale(state, 2);
        addLogEntry(state, "The refugees sing a hymn of thanks. Your people's resolve strengthens.", 0x88aaff);
      }
      // Refugees help with camp chores (carry water, tend fires, cook)
      if (refugees >= 6) {
        state.food += 1; // small food contribution from foraging
      }
    }

    // Craftsmen: auto-repair 1 supplies per camp
    if (craftsmen > 0) {
      const bonus = Math.min(craftsmen, 2);
      state.supplies += bonus;
      if (bonus > 1) addLogEntry(state, `Craftsmen maintain equipment. (+${bonus} supplies)`, 0x88aaff);
    }

    // Healers: always tend at least 1 wounded per night (guaranteed, not random)
    if (healers > 0) {
      const woundedMember = state.members.find((m) => m.wounded);
      if (woundedMember) {
        woundedMember.wounded = false;
        woundedMember.hp = woundedMember.maxHp;
        addLogEntry(state, `${woundedMember.name}'s wounds have been tended by the healers.`, 0x88aaff);
      }
      // Extra healer with 2+ healers
      if (healers >= 2 && rng() < 0.4) {
        const w2 = state.members.find((m) => m.wounded);
        if (w2) { w2.wounded = false; w2.hp = w2.maxHp; }
      }
    }

    // Peasants: passive foraging (always, not random)
    if (peasants >= 2) {
      const found = Math.floor(1 + peasants * 0.5);
      state.food += found;
      // Only log if notable
      if (found >= 3) addLogEntry(state, `Peasants foraged ${found} food.`, 0x88cc88);
    }

    // === AMBUSH CHECK (scouts reduce it, doesn't block positive events) ===
    const baseAmbush = 0.04 + danger * 0.035;
    const scoutReduction = scouts * 0.03;
    const ambushChance = Math.max(0.01, baseAmbush - scoutReduction);

    if (rng() < ambushChance) {
      const desc = NIGHT_AMBUSH_DESCRIPTIONS[Math.floor(rng() * NIGHT_AMBUSH_DESCRIPTIONS.length)];
      addLogEntry(state, desc, 0xff6644);
      _nightEventCallback?.(desc, 0xff6644);
      state.pendingCombat = true;
      state.combatDanger = Math.max(1, danger - (scouts > 2 ? 1 : 0));
      // NOTE: no return — positive events still happen (rally before battle)
    }

    // === OPTIONAL POSITIVE EVENTS ===

    // Scout intel
    if (scouts > 0 && state.pursuer.active && rng() < 0.35) {
      const dist = ExodusPursuerSystem.getDistanceToCaravan(state);
      if (dist <= 10) {
        addLogEntry(state, `Scouts report: Mordred's host is ${dist} hexes away.`, 0xff8844);
        _nightEventCallback?.(`Scout report: Mordred ${dist} hexes away`, 0xff8844);
      }
    }

    // Deserter recovery
    if (rng() < 0.07 && state.morale > 35) {
      const newMember = createCaravanMember(state.nextMemberId++, rng() < 0.5 ? "soldier" : "peasant", rng);
      state.members.push(newMember);
      state.totalRecruits++;
      addLogEntry(state, `${newMember.name} stumbles into camp. "I've been walking for days..."`, 0x44ff44);
      _nightEventCallback?.(`${newMember.name} found the camp!`, 0x44ff44);
    }

    // Campfire bonding
    if (state.morale > 25 && state.morale < 75 && rng() < 0.2) {
      const boost = 2 + (state.members.filter((m) => m.trait === "faithful" || m.trait === "kind").length > 0 ? 2 : 0);
      ExodusResourceSystem.adjustMorale(state, boost);
      addLogEntry(state, "Stories around the campfire lift spirits.", 0x88aaff);
    }

    // Mercy-based events
    if (state.mercy > 10 && rng() < 0.1) {
      ExodusResourceSystem.adjustHope(state, 2);
      addLogEntry(state, "The refugees pray for you by name. Your kindness strengthens their hope.", 0xaa88ff);
    } else if (state.mercy < -10 && rng() < 0.1) {
      state.food += 3;
      addLogEntry(state, "Your pragmatic efficiency saves resources. The caravan runs lean.", 0x88aaaa);
    }
  }

  // -------------------------------------------------------------------------
  // Veteran bonuses — surviving members grow stronger
  // -------------------------------------------------------------------------

  private static _applyVeteranBonuses(state: ExodusState): void {
    for (const m of state.members) {
      // Every 5 days, fighters get a small stat boost
      if (m.daysInCaravan > 0 && m.daysInCaravan % 5 === 0) {
        if (m.role === "knight" || m.role === "soldier" || m.role === "archer") {
          m.atk += 1;
          m.maxHp += 3;
          m.hp = Math.min(m.hp + 3, m.maxHp);
        }
        // Scouts get better at their job (tracked via stats)
        if (m.role === "scout") {
          m.atk += 1;
        }
      }
    }
  }

  static cleanup(): void {
    _phaseCallback = null;
    _nightEventCallback = null;
  }
}
