// ---------------------------------------------------------------------------
// Age of Wonders — Combat System (auto-resolve tactical battles)
// ---------------------------------------------------------------------------

import {
  type AoWGameState, type AoWArmy, type AoWCity,
  type AoWCombatUnit,
} from "../AoWTypes";

// ---------------------------------------------------------------------------
// Combat resolution
// ---------------------------------------------------------------------------

export class AoWCombatSystem {

  /** Start a combat between two armies (or army vs city garrison) */
  initCombat(state: AoWGameState, attackerArmy: AoWArmy, defenderArmy: AoWArmy | null, defenderCity: AoWCity | null): void {
    const combatUnits: AoWCombatUnit[] = [];

    // Attacker units
    for (const u of attackerArmy.units) {
      combatUnits.push({
        unit: u,
        combatHp: u.hp,
        q: -2, r: 0, // attacker side
        hasActed: false,
        side: "attacker",
      });
    }

    // Defender units (from army or city garrison)
    const defUnits = defenderArmy ? defenderArmy.units : (defenderCity ? defenderCity.garrisonUnits : []);
    for (const u of defUnits) {
      combatUnits.push({
        unit: u,
        combatHp: u.hp,
        q: 2, r: 0,
        hasActed: false,
        side: "defender",
      });
    }

    state.combat = {
      active: true,
      attackerArmy,
      defenderArmy,
      defenderCity,
      combatUnits,
      currentUnitIdx: 0,
      round: 1,
      log: ["Battle begins!"],
      result: "pending",
      autoResolve: true,
    };
  }

  /** Auto-resolve entire combat and return result */
  autoResolveCombat(state: AoWGameState): "attacker_wins" | "defender_wins" | "draw" {
    if (!state.combat) return "draw";
    const combat = state.combat;

    // Track which units have used their dive_attack
    const diveAttackUsed = new Set<string>();

    const maxRounds = 10;
    for (let round = 0; round < maxRounds; round++) {
      combat.round = round + 1;
      combat.log.push(`--- Round ${combat.round} ---`);

      // Each unit attacks once per round
      const alive = combat.combatUnits.filter(cu => cu.combatHp > 0);
      // Sort by speed (faster acts first)
      alive.sort((a, b) => b.unit.speed - a.unit.speed);

      // aura_heal: heal all allies at start of round
      for (const cu of alive) {
        if (cu.unit.abilities.includes("aura_heal")) {
          const allies = combat.combatUnits.filter(
            a => a.side === cu.side && a.combatHp > 0 && a.combatHp < a.unit.maxHp,
          );
          if (allies.length > 0) {
            for (const ally of allies) {
              ally.combatHp = Math.min(ally.unit.maxHp, ally.combatHp + 2);
            }
            const name = cu.unit.isHero ? cu.unit.heroName : cu.unit.defId;
            combat.log.push(`${name}'s aura heals all allies for 2 HP!`);
          }
        }
      }

      // heal_self at start of round
      for (const cu of alive) {
        if (cu.unit.abilities.includes("heal_self") && cu.combatHp < cu.unit.maxHp && cu.combatHp > 0) {
          cu.combatHp = Math.min(cu.unit.maxHp, cu.combatHp + 5);
          const name = cu.unit.isHero ? cu.unit.heroName : cu.unit.defId;
          combat.log.push(`${name} heals self for 5 HP! (${cu.combatHp}/${cu.unit.maxHp} HP)`);
        }
      }

      for (const cu of alive) {
        if (cu.combatHp <= 0) continue;

        const cuName = cu.unit.isHero ? cu.unit.heroName : cu.unit.defId;

        // Fear check: enemies with fear ability cause 20% skip chance
        const enemiesWithFear = combat.combatUnits.filter(
          e => e.side !== cu.side && e.combatHp > 0 && e.unit.abilities.includes("fear"),
        );
        if (enemiesWithFear.length > 0 && Math.random() < 0.2) {
          const fearSource = enemiesWithFear[0];
          const fearName = fearSource.unit.isHero ? fearSource.unit.heroName : fearSource.unit.defId;
          combat.log.push(`${cuName} is paralyzed with fear from ${fearName} and skips their attack!`);
          continue;
        }

        // Pick targets based on unit type
        const enemies = combat.combatUnits.filter(
          e => e.side !== cu.side && e.combatHp > 0,
        );
        if (enemies.length === 0) break;

        let targets: AoWCombatUnit[] = [];

        if (cu.unit.isHero) {
          // Heroes prioritize enemy heroes first
          const enemyHeroes = enemies.filter(e => e.unit.isHero);
          if (enemyHeroes.length > 0) {
            targets = [enemyHeroes.reduce((a, b) => a.combatHp < b.combatHp ? a : b)];
          } else {
            targets = [enemies.reduce((a, b) => a.combatHp < b.combatHp ? a : b)];
          }
        } else if (cu.unit.range > 0) {
          // Ranged units target lowest-HP enemy (focus fire)
          targets = [enemies.reduce((a, b) => a.combatHp < b.combatHp ? a : b)];
        } else {
          // Melee units target closest enemy or lowest-HP
          // Use hex distance for "closest", break ties by lowest HP
          enemies.sort((a, b) => {
            const distA = Math.abs(a.q - cu.q) + Math.abs(a.r - cu.r);
            const distB = Math.abs(b.q - cu.q) + Math.abs(b.r - cu.r);
            if (distA !== distB) return distA - distB;
            return a.combatHp - b.combatHp;
          });
          targets = [enemies[0]];
        }

        // breath_attack: hits up to 2 enemies
        if (cu.unit.abilities.includes("breath_attack") && enemies.length > 1) {
          const sorted = [...enemies].sort((a, b) => a.combatHp - b.combatHp);
          targets = sorted.slice(0, 2);
          combat.log.push(`${cuName} unleashes a breath attack!`);
        }

        // area_attack: hits up to 3 enemies
        if (cu.unit.abilities.includes("area_attack") && enemies.length > 1) {
          const sorted = [...enemies].sort((a, b) => a.combatHp - b.combatHp);
          targets = sorted.slice(0, 3);
          combat.log.push(`${cuName} unleashes an area attack!`);
        }

        for (const target of targets) {
          if (target.combatHp <= 0) continue;

          const targetName = target.unit.isHero ? target.unit.heroName : target.unit.defId;

          // Incorporeal dodge check
          if (target.unit.abilities.includes("incorporeal") && Math.random() < 0.3) {
            combat.log.push(`${targetName}'s incorporeal form dodges the attack!`);
            continue;
          }

          // Calculate damage
          let damage = this._calculateDamage(cu, target, state);

          // dive_attack: first attack deals 1.5x damage
          const cuId = cu.unit.id;
          if (cu.unit.abilities.includes("dive_attack") && !diveAttackUsed.has(cuId)) {
            damage = Math.floor(damage * 1.5);
            diveAttackUsed.add(cuId);
            combat.log.push(`${cuName} dive attacks for extra damage!`);
          }

          // magic_resist: reduces damage from magical sources by 30%
          if (target.unit.abilities.includes("magic_resist") && cu.unit.abilities.includes("ranged")) {
            damage = Math.max(1, Math.floor(damage * 0.7));
            combat.log.push(`${targetName}'s magic resistance reduces the damage!`);
          }

          target.combatHp -= damage;
          combat.log.push(
            `${cuName} hits ${targetName} for ${damage} damage${target.combatHp <= 0 ? " (SLAIN)" : ` (${target.combatHp}/${target.unit.maxHp} HP)`}`,
          );

          // Life steal
          if (cu.unit.abilities.includes("life_steal")) {
            const heal = Math.floor(damage * 0.3);
            cu.combatHp = Math.min(cu.unit.maxHp, cu.combatHp + heal);
          }

          // Regenerate
          if (cu.unit.abilities.includes("regenerate")) {
            cu.combatHp = Math.min(cu.unit.maxHp, cu.combatHp + 3);
          }
        }
      }

      // Check victory
      const attackersAlive = combat.combatUnits.filter(cu => cu.side === "attacker" && cu.combatHp > 0);
      const defendersAlive = combat.combatUnits.filter(cu => cu.side === "defender" && cu.combatHp > 0);

      if (attackersAlive.length === 0 && defendersAlive.length === 0) {
        combat.result = "draw";
        break;
      }
      if (attackersAlive.length === 0) {
        combat.result = "defender_wins";
        break;
      }
      if (defendersAlive.length === 0) {
        combat.result = "attacker_wins";
        break;
      }
    }

    if (combat.result === "pending") combat.result = "draw";
    return combat.result;
  }

  /** Apply combat results back to game state */
  applyCombatResults(state: AoWGameState): void {
    if (!state.combat) return;
    const combat = state.combat;

    // Update surviving units HP
    for (const cu of combat.combatUnits) {
      if (cu.combatHp > 0) {
        cu.unit.hp = cu.combatHp;
        // Grant XP for surviving
        cu.unit.xp += 20;
      }
    }

    // Remove dead units from attacker army
    const aliveAttackerIds = new Set(
      combat.combatUnits.filter(cu => cu.side === "attacker" && cu.combatHp > 0).map(cu => cu.unit.id),
    );
    combat.attackerArmy.units = combat.attackerArmy.units.filter(u => aliveAttackerIds.has(u.id));

    // XP for kills
    for (const cu of combat.combatUnits) {
      if (cu.combatHp > 0) {
        const kills = combat.combatUnits.filter(e => e.side !== cu.side && e.combatHp <= 0).length;
        cu.unit.xp += kills * 30;
      }
    }

    // Remove dead defender units
    if (combat.defenderArmy) {
      const aliveDefIds = new Set(
        combat.combatUnits.filter(cu => cu.side === "defender" && cu.combatHp > 0).map(cu => cu.unit.id),
      );
      combat.defenderArmy.units = combat.defenderArmy.units.filter(u => aliveDefIds.has(u.id));

      // Remove army if empty
      if (combat.defenderArmy.units.length === 0) {
        state.armies = state.armies.filter(a => a.id !== combat.defenderArmy!.id);
      }
    }

    if (combat.defenderCity) {
      const aliveGarrisonIds = new Set(
        combat.combatUnits.filter(cu => cu.side === "defender" && cu.combatHp > 0).map(cu => cu.unit.id),
      );
      combat.defenderCity.garrisonUnits = combat.defenderCity.garrisonUnits.filter(
        u => aliveGarrisonIds.has(u.id),
      );
    }

    // If attacker wins and was attacking a city, capture it
    if (combat.result === "attacker_wins" && combat.defenderCity) {
      const city = combat.defenderCity;
      const prevOwner = city.playerId;
      city.playerId = combat.attackerArmy.playerId;
      state.log.push(`${state.players[city.playerId].name} captured ${city.name}!`);

      // Recalculate income
      if (prevOwner >= 0) {
        state.players[prevOwner].goldPerTurn -= city.goldPerTurn;
        state.players[prevOwner].manaPerTurn -= city.manaPerTurn;
      }
      state.players[city.playerId].goldPerTurn += city.goldPerTurn;
      state.players[city.playerId].manaPerTurn += city.manaPerTurn;

      // Move attacker into city hex
      combat.attackerArmy.q = city.q;
      combat.attackerArmy.r = city.r;
    }

    // If attacker wins army battle, move to defender position
    if (combat.result === "attacker_wins" && combat.defenderArmy) {
      combat.attackerArmy.q = combat.defenderArmy.q;
      combat.attackerArmy.r = combat.defenderArmy.r;
    }

    // Remove empty attacker army
    if (combat.attackerArmy.units.length === 0) {
      state.armies = state.armies.filter(a => a.id !== combat.attackerArmy.id);
    }

    // Check for player defeat (no cities and no armies)
    for (const player of state.players) {
      if (player.defeated) continue;
      const hasCities = state.cities.some(c => c.playerId === player.id);
      const hasArmies = state.armies.some(a => a.playerId === player.id && a.units.length > 0);
      if (!hasCities && !hasArmies) {
        player.defeated = true;
        state.log.push(`${player.name} has been defeated!`);
      }
    }

    state.combat = null;
  }

  // ---------------------------------------------------------------------------
  // Damage calculation
  // ---------------------------------------------------------------------------

  private _calculateDamage(attacker: AoWCombatUnit, defender: AoWCombatUnit, state: AoWGameState): number {
    const atkUnit = attacker.unit;
    const defUnit = defender.unit;

    // Base damage roll
    const baseDmg = atkUnit.damage[0] + Math.floor(Math.random() * (atkUnit.damage[1] - atkUnit.damage[0] + 1));

    // Attack vs defense modifier
    const atkMod = atkUnit.attack - defUnit.defense;
    const modifier = 1 + atkMod * 0.05; // +-5% per point difference

    // Terrain defense bonus for defender
    let terrainBonus = 0;
    if (state.combat?.defenderCity?.walls && attacker.side === "attacker") {
      terrainBonus = 3;
    }

    // Abilities
    let abilityMult = 1.0;
    if (atkUnit.abilities.includes("charge") && attacker.side === "attacker") abilityMult *= 1.3;
    if (atkUnit.abilities.includes("holy_strike") && defUnit.abilities.includes("undead")) abilityMult *= 1.5;
    if (atkUnit.abilities.includes("armor_pierce")) terrainBonus = Math.floor(terrainBonus / 2);
    if (atkUnit.abilities.includes("frenzy")) {
      const hpPct = attacker.combatHp / atkUnit.maxHp;
      if (hpPct < 0.5) abilityMult *= 1.4;
    }

    const finalDmg = Math.max(1, Math.floor(baseDmg * modifier * abilityMult) - terrainBonus);
    return finalDmg;
  }
}
