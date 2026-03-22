// ---------------------------------------------------------------------------
// Coven mode — spell combat system (fixed: multi-round, proper potions)
// ---------------------------------------------------------------------------

import type { CovenState, Creature, SpellId, IngredientId } from "../state/CovenState";
import { addCovenLog, addIngredient, covenRng, usePotion } from "../state/CovenState";
import { getSpellDef } from "../config/CovenRecipes";
import { getCreatureDef } from "../config/CovenCreatures";
import { hexKey } from "@world/hex/HexCoord";

export interface CombatResult {
  outcome: "victory" | "defeat" | "fled" | "ongoing";
  damageDealt: number;
  damageTaken: number;
  loot: IngredientId[];
  description: string;
}

type CombatCallback = (result: CombatResult) => void;
let _combatCallback: CombatCallback | null = null;

export class CovenCombatSystem {
  static setCombatCallback(cb: CombatCallback | null): void { _combatCallback = cb; }

  /** Resolve one round of combat. Call repeatedly until outcome != "ongoing". */
  static resolveCombatRound(state: CovenState, creature: Creature, spellId: SpellId | null): CombatResult {
    const rng = covenRng(state.seed + state.day * 61 + creature.hp * 3 + state.spellsCast);
    const spell = spellId ? getSpellDef(spellId) : null;
    const creatureDef = getCreatureDef(creature.type);
    const creatureName = creatureDef?.name ?? creature.type;

    let playerDamage = 0;
    let creatureDamage = creature.damage;

    // === CREATURE PRE-ATTACK BEHAVIOR (unique per type) ===

    // Fae Trickster: steals a random ingredient before attacking
    if (creature.type === "fae_trickster" && rng() < 0.4) {
      const ingEntries = Array.from(state.ingredients.entries()).filter(([, v]) => v > 0);
      if (ingEntries.length > 0) {
        const [stolen] = ingEntries[Math.floor(rng() * ingEntries.length)];
        state.ingredients.set(stolen, (state.ingredients.get(stolen) ?? 1) - 1);
        addCovenLog(state, `The fae snatches your ${stolen.replace(/_/g, " ")}!`, 0xffaadd);
      }
    }

    // Wraith: drains mana instead of HP (50% chance)
    let wraith_mana_drain = false;
    if (creature.type === "wraith" && rng() < 0.5) {
      wraith_mana_drain = true;
    }

    // Cave Spider: webs you (25% chance to skip your attack)
    if (creature.type === "cave_spider" && rng() < 0.25) {
      addCovenLog(state, "The spider's web binds you! You can't attack this round!", 0x888866);
      // Skip straight to creature retaliation
      state.health -= creatureDamage;
      addCovenLog(state, `${creatureName} bites for ${creatureDamage} damage!`, 0xff4444);
      // Ongoing check
      if (state.health <= 0) {
        state.gameOver = true;
        const result: CombatResult = { outcome: "defeat", damageDealt: 0, damageTaken: creatureDamage, loot: [], description: `Bound in webs, the ${creatureName} finishes you.` };
        addCovenLog(state, result.description, 0xff4444);
        _combatCallback?.(result);
        return result;
      }
      const result: CombatResult = { outcome: "ongoing", damageDealt: 0, damageTaken: creatureDamage, loot: [], description: `Webbed! ${creatureName}: ${creature.hp}/${creature.maxHp} HP` };
      _combatCallback?.(result);
      return result;
    }

    // === PLAYER ATTACK ===
    if (spell && state.mana >= spell.manaCost) {
      state.mana -= spell.manaCost;
      playerDamage = spell.damage;
      state.spellsCast++;

      // Beast Bane potion
      if ((state.potions.get("beast_bane") ?? 0) > 0) {
        usePotion(state, "beast_bane");
        playerDamage *= 2;
        addCovenLog(state, "Beast Bane amplifies your spell!", 0xcc4444);
      }

      // === SPELL-CREATURE INTERACTIONS ===

      // Drain Life: heals player
      if (spell.id === "drain_life") {
        const healAmt = Math.min(spell.damage, state.maxHealth - state.health);
        state.health += healAmt;
        if (healAmt > 0) addCovenLog(state, `Drained ${healAmt} life.`, 0x884488);
      }

      // Banishment: 2x vs undead
      if (spell.id === "banishment" && ["wraith", "wight", "dark_knight"].includes(creature.type)) {
        playerDamage = Math.floor(playerDamage * 2);
        addCovenLog(state, "The undead recoils from your banishment!", 0xffffaa);
      }

      // Fire Bolt: 1.5x vs spiders and bog beasts (flammable)
      if (spell.id === "fire_bolt" && ["cave_spider", "bog_beast"].includes(creature.type)) {
        playerDamage = Math.floor(playerDamage * 1.5);
        addCovenLog(state, "The flames catch! Creature is vulnerable to fire!", 0xff8844);
      }

      // Shadow Bolt: 1.5x vs fae (iron weakness)
      if (spell.id === "shadow_bolt" && creature.type === "fae_trickster") {
        playerDamage = Math.floor(playerDamage * 1.5);
        addCovenLog(state, "The fae shrieks — shadow magic burns it!", 0x6644aa);
      }

      // Sleep Fog: stuns creature (skips its retaliation this round)
      if (spell.id === "sleep_fog") {
        addCovenLog(state, "A soporific cloud envelops the creature. It staggers, dazed.", 0x8888cc);
        creatureDamage = 0; // no retaliation this round
      }

      // Thorn Hex: deals damage + poisons (extra damage over time)
      if (spell.id === "thorn_hex") {
        const poisonDmg = 5;
        creature.hp -= poisonDmg;
        playerDamage += poisonDmg;
        addCovenLog(state, `Thorns tear at the creature! (+${poisonDmg} poison)`, 0x44aa44);
      }

      addCovenLog(state, `Cast ${spell.name} for ${playerDamage} damage!`, spell.color);
    } else if (spell && state.mana < spell.manaCost) {
      playerDamage = 3 + Math.floor(rng() * 4);
      addCovenLog(state, `Not enough mana for ${spell.name}! Weak attack for ${playerDamage}.`, 0xaa8866);
    } else {
      playerDamage = 5 + Math.floor(rng() * 5);
      addCovenLog(state, `You attack with raw magic for ${playerDamage}.`, 0xaaaaaa);
    }

    creature.hp -= playerDamage;

    // === CREATURE RETALIATION ===

    // Will-o'-Wisp: confuses (randomizes damage — can be 0 or 2x)
    if (creature.type === "will_o_wisp") {
      creatureDamage = Math.floor(creatureDamage * rng() * 2);
      if (creatureDamage === 0) addCovenLog(state, "The wisp's illusion fizzles harmlessly!", 0x88ffaa);
    }

    // Wraith mana drain (drains mana instead of HP)
    if (wraith_mana_drain && creature.hp > 0) {
      const manaDrain = Math.min(state.mana, 8 + Math.floor(rng() * 5));
      state.mana -= manaDrain;
      addCovenLog(state, `The wraith drains ${manaDrain} mana from you!`, 0x8899aa);
      creatureDamage = Math.floor(creatureDamage * 0.3); // reduced HP damage when draining mana
    }

    // Dodge checks
    let dodged = false;
    if ((state.potions.get("shadow_cloak") ?? 0) > 0 && rng() < 0.6) {
      usePotion(state, "shadow_cloak");
      dodged = true;
      addCovenLog(state, "Shadow cloak conceals you!", 0x333366);
      creatureDamage = 0;
    } else if (rng() < 0.1) {
      dodged = true;
      addCovenLog(state, "You dodge!", 0x44ff44);
      creatureDamage = 0;
    }

    // Drake breath: fire attack that can't be dodged (only reduced by shadow cloak)
    if (creature.type === "drake" && !dodged && rng() < 0.35) {
      const breathDmg = 10 + Math.floor(rng() * 8);
      creatureDamage += breathDmg;
      addCovenLog(state, `The drake breathes fire! (+${breathDmg} burn damage!)`, 0xff4400);
    }

    if (!dodged && creatureDamage > 0) {
      state.health -= creatureDamage;
      addCovenLog(state, `${creatureName} deals ${creatureDamage} damage!`, 0xff4444);
    }

    // === Check outcomes ===

    // Creature dead
    if (creature.hp <= 0) {
      state.creaturesSlain++;

      // Mana recovery on kill (absorb creature's magical energy)
      const manaRecovery = Math.min(10, 3 + Math.floor(creature.maxHp / 15));
      state.mana = Math.min(state.maxMana, state.mana + manaRecovery);
      addCovenLog(state, `Absorbed ${manaRecovery} mana from the slain creature.`, 0x6688ff);

      // Loot with rare drop chance
      const loot: IngredientId[] = [...creature.loot];
      // 25% chance of bonus rare drop
      if (rng() < 0.25) {
        const rareLoot: IngredientId[] = ["shadow_essence", "moonstone", "ley_crystal", "star_fragment", "ancient_bone"];
        loot.push(rareLoot[Math.floor(rng() * rareLoot.length)]);
      }
      for (const l of loot) addIngredient(state, l);

      // Remove from map
      const hex = state.hexes.get(hexKey(creature.position.q, creature.position.r));
      if (hex) hex.creatureId = null;
      const idx = state.creatures.indexOf(creature);
      if (idx >= 0) state.creatures.splice(idx, 1);

      // Remove inquisitor if it was one
      const inqIdx = state.inquisitors.findIndex((i) => i.id === creature.id);
      if (inqIdx >= 0) state.inquisitors.splice(inqIdx, 1);

      const lootNames = loot.length > 0 ? ` Loot: ${loot.join(", ")}` : "";
      const description = `You defeated the ${creatureName}!${lootNames}`;
      addCovenLog(state, description, 0x44ff44);

      const result: CombatResult = { outcome: "victory", damageDealt: playerDamage, damageTaken: dodged ? 0 : creatureDamage, loot, description };
      _combatCallback?.(result);
      return result;
    }

    // Player dead
    if (state.health <= 0) {
      const description = `The ${creatureName} overwhelms you. Darkness closes in.`;
      addCovenLog(state, description, 0xff4444);
      state.gameOver = true;
      const result: CombatResult = { outcome: "defeat", damageDealt: playerDamage, damageTaken: creatureDamage, loot: [], description };
      _combatCallback?.(result);
      return result;
    }

    // Combat ongoing — creature survived
    const description = `${creatureName} staggers (${creature.hp}/${creature.maxHp} HP). The fight continues!`;
    addCovenLog(state, description, 0xff8844);
    const result: CombatResult = { outcome: "ongoing", damageDealt: playerDamage, damageTaken: dodged ? 0 : creatureDamage, loot: [], description };
    _combatCallback?.(result);
    return result;
  }

  static flee(state: CovenState): CombatResult {
    const manaCost = 8;
    state.mana = Math.max(0, state.mana - manaCost);
    state.health -= 5;
    state.pendingCombat = null;
    addCovenLog(state, "You flee into the shadows (-8 mana, -5 HP).", 0xffaa44);
    const result: CombatResult = { outcome: "fled", damageDealt: 0, damageTaken: 5, loot: [], description: "You escaped, but at a cost." };
    _combatCallback?.(result);
    return result;
  }

  static cleanup(): void { _combatCallback = null; }
}
