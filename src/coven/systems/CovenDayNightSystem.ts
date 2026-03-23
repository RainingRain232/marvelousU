// ---------------------------------------------------------------------------
// Coven mode — day/night cycle system
// ---------------------------------------------------------------------------

import { CovenPhase } from "../state/CovenState";
import type { CovenState, Creature } from "../state/CovenState";
import { addCovenLog, covenRng } from "../state/CovenState";
import { CovenConfig, getCovenDifficulty } from "../config/CovenConfig";
import { getCreaturesForTerrain } from "../config/CovenCreatures";
import { hexKey, hexDistance, hexNeighbors } from "@world/hex/HexCoord";
import { updateLighting } from "./CovenMapGenerator";

type PhaseCallback = (phase: CovenPhase, day: number) => void;
type CreatureSpawnCallback = (creature: Creature) => void;

let _phaseCallback: PhaseCallback | null = null;
let _creatureSpawnCallback: CreatureSpawnCallback | null = null;

export class CovenDayNightSystem {
  static setPhaseCallback(cb: PhaseCallback | null): void { _phaseCallback = cb; }
  static setCreatureSpawnCallback(cb: CreatureSpawnCallback | null): void { _creatureSpawnCallback = cb; }

  static advancePhase(state: CovenState): void {
    switch (state.phase) {
      case CovenPhase.DAWN:
        state.phase = CovenPhase.FORAGE;
        addCovenLog(state, `Day ${state.day} — Dawn breaks through the canopy.`, 0xccaa66);
        // Progressive warnings
        if (state.day === 2) addCovenLog(state, "Tip: You start with ingredients for a Healing Draught and a Ward. Press B during Brew phase to craft them.", 0x88aaff);
        if (state.day === 3) addCovenLog(state, "You sense inquisitors entering the forest. They're hunting you.", 0xff8844);
        if (state.day === 5) {
          addCovenLog(state, "YOUR OBJECTIVE: Gather 5 ritual components from the map edges, then perform the Grand Ritual on a ley line.", 0xffd700);
          addCovenLog(state, "Components: Moonstone Tear \u2022 Dragon Blood \u2022 Silver Mirror \u2022 Living Flame \u2022 Crown of Thorns", 0xffd700);
          addCovenLog(state, "Each is guarded by a powerful creature. Prepare potions and learn spells before attempting.", 0xff8844);
          addCovenLog(state, "Ley lines (blue hexes with crystals) are found at the map edges. Stand on one and press R when ready.", 0x8888ff);
        }
        if (state.day === 15) addCovenLog(state, "The air grows cold. The Wild Hunt will ride on day 25. You must complete the ritual before then.", 0xff4444);
        if (state.day === 20) addCovenLog(state, "5 days until the Wild Hunt. Gather the remaining components NOW.", 0xff0000);
        if (state.day === 23) addCovenLog(state, "2 days. The horns of the Wild Hunt echo on the wind.", 0xff0000);
        break;
      case CovenPhase.FORAGE:
        state.phase = CovenPhase.BREW;
        // Inquisitors also patrol during the day
        if (state.day >= CovenConfig.INQUISITOR_START_DAY) {
          const dayRng = covenRng(state.seed + state.day * 89);
          this._moveInquisitors(state, dayRng);
        }
        break;
      case CovenPhase.BREW:
        state.phase = CovenPhase.DUSK;
        addCovenLog(state, "Dusk approaches. Prepare your wards.", 0x886644);
        break;
      case CovenPhase.DUSK:
        state.phase = CovenPhase.NIGHT;
        this._processNightfall(state);
        break;
      case CovenPhase.NIGHT:
        this._processEndOfNight(state);
        state.day++;
        state.phase = CovenPhase.DAWN;
        break;
      case CovenPhase.COMBAT:
        state.phase = CovenPhase.NIGHT; // return to night after combat
        state.pendingCombat = null;
        break;
      default: break;
    }
    updateLighting(state);
    _phaseCallback?.(state.phase, state.day);
  }

  private static _processNightfall(state: CovenState): void {
    const rng = covenRng(state.seed + state.day * 53);

    if (state.day === 1) {
      addCovenLog(state, "Your first night. The forest whispers. Stay near your hideout.", 0x6666aa);
    } else {
      addCovenLog(state, "Night falls. The darkness is alive.", 0x4444aa);
    }

    // Day 1: no creature spawns (tutorial grace period)
    if (state.day <= 1) {
      // Degrade wards and move inquisitors, but don't spawn creatures
      this._moveInquisitors(state, rng);
      return;
    }

    // Spawn creatures on nearby dark hexes
    const neighbors = hexNeighbors(state.playerPosition);
    const extended = new Set<string>();
    for (const n of neighbors) {
      extended.add(hexKey(n.q, n.r));
      for (const nn of hexNeighbors(n)) extended.add(hexKey(nn.q, nn.r));
    }

    let spawned = 0;
    for (const key of extended) {
      const hex = state.hexes.get(key);
      if (!hex || hex.terrain === "water" || hex.creatureId) continue;
      if (hex.wardId) continue; // wards repel spawns

      const defs = getCreaturesForTerrain(hex.terrain, true);
      if (defs.length === 0) continue;
      // Difficulty scaling: spawn chance increases by 2% per day
      const scaledChance = CovenConfig.CREATURE_SPAWN_CHANCE_NIGHT + state.day * 0.02;
      if (rng() > Math.min(0.7, scaledChance)) continue;

      const def = defs[Math.floor(rng() * defs.length)];
      const creature: Creature = {
        id: `c_${state.day}_${spawned}`,
        type: def.type,
        hp: def.hp,
        maxHp: def.hp,
        damage: def.damage,
        position: hex.coord,
        nocturnalOnly: def.nocturnalOnly,
        loot: [...def.loot],
      };
      hex.creatureId = creature.id;
      state.creatures.push(creature);
      _creatureSpawnCallback?.(creature);
      spawned++;

      if (spawned >= 3 + Math.floor(state.day / 5)) break; // cap spawns
    }

    if (spawned > 0) addCovenLog(state, `${spawned} creature(s) stir in the darkness.`, 0xff8844);

    // Move inquisitors closer
    this._moveInquisitors(state, rng);

    // Degrade wards
    for (let i = state.wards.length - 1; i >= 0; i--) {
      state.wards[i].durability--;
      if (state.wards[i].durability <= 0) {
        const hex = state.hexes.get(hexKey(state.wards[i].position.q, state.wards[i].position.r));
        if (hex) { hex.wardId = null; hex.wardDurability = 0; }
        addCovenLog(state, `A ward has faded.`, 0xff8844);
        state.wards.splice(i, 1);
      }
    }
  }

  private static _processEndOfNight(state: CovenState): void {
    const rng = covenRng(state.seed + state.day * 71);

    // Mana regeneration
    const isOnLeyLine = state.hexes.get(hexKey(state.playerPosition.q, state.playerPosition.r))?.terrain === "ley_line";
    const regenAmount = isOnLeyLine ? CovenConfig.MANA_REGEN_LEY_LINE : CovenConfig.MANA_REGEN_PER_NIGHT;
    state.mana = Math.min(state.maxMana, state.mana + regenAmount);
    addCovenLog(state, `Mana regenerates. (+${regenAmount})`, 0x4488ff);

    // Familiar passive effects
    for (const fam of state.familiars) {
      if (!fam.active) continue;
      if (fam.type === "toad") {
        // Toad finds rare ingredients overnight
        const ingredients: Array<import("../state/CovenState").IngredientId> = ["ghostshroom", "fairy_cap", "moonstone", "deathcap"];
        const found = ingredients[Math.floor(rng() * ingredients.length)];
        state.ingredients.set(found, (state.ingredients.get(found) ?? 0) + 1);
        state.ingredientsGathered++;
        addCovenLog(state, `${fam.name} the toad found: ${found.replace(/_/g, " ")}`, 0x88cc88);
      }
      if (fam.type === "raven") {
        // Raven reveals 2 random hexes
        const unrevealed = Array.from(state.hexes.values()).filter((h) => !h.revealed && h.terrain !== "water");
        for (let i = 0; i < 2 && unrevealed.length > 0; i++) {
          const idx = Math.floor(rng() * unrevealed.length);
          unrevealed[idx].revealed = true;
          state.revealedKeys.add(unrevealed[idx].key);
          unrevealed.splice(idx, 1);
        }
        addCovenLog(state, `${fam.name} the raven reports what it has seen.`, 0x8888aa);
      }
      if (fam.type === "cat") {
        // Cat warns about nearby creatures
        const nearby = state.creatures.filter((c) => {
          const d = Math.abs(c.position.q - state.playerPosition.q) + Math.abs(c.position.r - state.playerPosition.r);
          return d <= 3;
        });
        if (nearby.length > 0) {
          addCovenLog(state, `${fam.name} the cat hisses — ${nearby.length} creature(s) lurk nearby.`, 0xff8844);
        }
      }
      // Owl effect is handled in CovenGame's vision range calculation
    }

    // Hideout rest — healing scales with game progression
    const atHideout = state.playerPosition.q === state.hideoutPosition.q && state.playerPosition.r === state.hideoutPosition.r;
    if (atHideout) {
      const healAmount = Math.min(25, 10 + Math.floor(state.day / 3));
      state.health = Math.min(state.maxHealth, state.health + healAmount);
      state.mana = Math.min(state.maxMana, state.mana + CovenConfig.MANA_REGEN_HIDEOUT);
      state.daysAtHideout++;
      addCovenLog(state, `Resting at your hideout. (+${healAmount} HP, +${CovenConfig.MANA_REGEN_HIDEOUT} mana)`, 0x44aa44);
    }

    // Remove nocturnal creatures at dawn
    for (let i = state.creatures.length - 1; i >= 0; i--) {
      if (state.creatures[i].nocturnalOnly) {
        const hex = state.hexes.get(hexKey(state.creatures[i].position.q, state.creatures[i].position.r));
        if (hex) hex.creatureId = null;
        state.creatures.splice(i, 1);
      }
    }

    // Game over checks
    if (state.health <= 0) {
      state.gameOver = true;
      state.phase = CovenPhase.GAME_OVER;
      addCovenLog(state, "Your body fails. The forest claims you.", 0xff4444);
      _phaseCallback?.(CovenPhase.GAME_OVER, state.day);
    }

    // Wild Hunt check
    if (state.day >= CovenConfig.WILD_HUNT_DAY && !state.ritualComplete) {
      state.gameOver = true;
      state.phase = CovenPhase.GAME_OVER;
      addCovenLog(state, "The Wild Hunt rides. There is no escape.", 0xff0000);
      _phaseCallback?.(CovenPhase.GAME_OVER, state.day);
    }
  }

  private static _moveInquisitors(state: CovenState, rng: () => number): void {
    if (state.day < CovenConfig.INQUISITOR_START_DAY) return;

    // Spawn new inquisitors periodically
    if (state.inquisitors.length < CovenConfig.INQUISITOR_START_COUNT + Math.floor(state.day / 5)) {
      const edge = state.mapRadius - 2;
      const pos = { q: Math.floor((rng() - 0.5) * edge * 2), r: Math.floor((rng() - 0.5) * edge * 2) };
      const hex = state.hexes.get(hexKey(pos.q, pos.r));
      if (hex && hex.terrain !== "water") {
        state.inquisitors.push({
          id: `inq_${state.day}_${state.inquisitors.length}`,
          position: pos,
          strength: 20 + state.day * 2,
          alertLevel: 0,
        });
        addCovenLog(state, "Inquisitors have been spotted on the map.", 0xff6644);
      }
    }

    // Move each inquisitor toward player (simple pathfinding)
    const diff = getCovenDifficulty(state.difficulty);
    for (const inq of state.inquisitors) {
      if (rng() > diff.inquisitorSpeedMult) continue; // speed check

      const neighbors = hexNeighbors(inq.position);
      let best = inq.position;
      let bestDist = hexDistance(inq.position, state.playerPosition);

      for (const n of neighbors) {
        const hex = state.hexes.get(hexKey(n.q, n.r));
        if (!hex || hex.terrain === "water") continue;
        if (hex.wardId) continue; // wards block inquisitors
        const d = hexDistance(n, state.playerPosition);
        if (d < bestDist) { bestDist = d; best = n; }
      }

      inq.position = best;
      const hex = state.hexes.get(hexKey(best.q, best.r));
      if (hex) hex.inquisitorPatrol = true;

      // Discovery check
      if (bestDist <= CovenConfig.INQUISITOR_DISCOVERY_RANGE) {
        inq.alertLevel = 2;
        addCovenLog(state, "The inquisitors have found you!", 0xff0000);
        // Trigger combat with inquisitor (treated as strong creature)
        state.pendingCombat = {
          id: inq.id,
          type: "inquisitor",
          hp: inq.strength,
          maxHp: inq.strength,
          damage: Math.min(25, 12 + Math.floor(state.day * 0.6)),
          position: inq.position,
          nocturnalOnly: false,
          loot: ["iron_filings", "silver_dust"],
        };
      }
    }
  }

  static cleanup(): void { _phaseCallback = null; _creatureSpawnCallback = null; }
}
