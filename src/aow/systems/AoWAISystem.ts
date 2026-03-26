// ---------------------------------------------------------------------------
// Age of Wonders — AI System (Smart AI)
// ---------------------------------------------------------------------------

import {
  type AoWGameState, type AoWArmy, type AoWUnit, type AoWCity,
  hexDistance, hexKey, hexNeighbors,
} from "../AoWTypes";
import { AOW_TERRAIN, getUnitsForFaction, AOW_BALANCE, getSpellDef, AOW_SPELLS } from "../config/AoWConfig";
import { createUnit, revealHexes } from "../state/AoWState";
import { AoWCombatSystem } from "./AoWCombatSystem";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Calculate army "power" — sum of unit HP * attack */
function armyPower(army: AoWArmy): number {
  return army.units.reduce((sum, u) => sum + u.hp * u.attack, 0);
}

function unitsPower(units: AoWUnit[]): number {
  return units.reduce((sum, u) => sum + u.hp * u.attack, 0);
}

/** Total power of all armies belonging to a player */
function totalPlayerPower(state: AoWGameState, playerId: number): number {
  return state.armies
    .filter(a => a.playerId === playerId)
    .reduce((sum, a) => sum + armyPower(a), 0);
}

/** Total power of all enemy armies */
function totalEnemyPower(state: AoWGameState, playerId: number): number {
  return state.armies
    .filter(a => a.playerId !== playerId)
    .reduce((sum, a) => sum + armyPower(a), 0);
}

/** Find the capital city (first city owned) */
function findCapital(state: AoWGameState, playerId: number): AoWCity | undefined {
  return state.cities.find(c => c.playerId === playerId);
}

/** Check if any enemy army is within a given distance of any of our cities */
function isThreatened(state: AoWGameState, playerId: number, distance: number): boolean {
  const myCities = state.cities.filter(c => c.playerId === playerId);
  for (const city of myCities) {
    for (const ea of state.armies) {
      if (ea.playerId === playerId) continue;
      if (hexDistance(city.q, city.r, ea.q, ea.r) <= distance) return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Research priority ordering
// ---------------------------------------------------------------------------

const RESEARCH_PRIORITY: string[] = [
  "heal",
  "fireball",
  "drain_life",
  "meteor",
  "frozen_doom",
  "earthquake",
  "stone_skin",
  "divine_shield",
  "blizzard",
  "curse",
  "resurrect",
  "raise_dead",
  "entangle",
  "flame_ward",
  "ice_wall",
  "teleport",
  "dispel",
  "grail_vision",
];

// ---------------------------------------------------------------------------
// AI System
// ---------------------------------------------------------------------------

export class AoWAISystem {
  private _combatSystem = new AoWCombatSystem();

  /** Execute the AI player's full turn */
  executeTurn(state: AoWGameState, playerId: number): void {
    const player = state.players[playerId];
    if (!player || player.defeated || !player.isAI) return;

    // 1. Collect income
    player.gold += player.goldPerTurn;
    player.mana += player.manaPerTurn;

    // 2. Cast spells (before movement so buffs apply)
    this._castSpells(state, playerId);

    // 3. Buy units in cities
    this._buyUnits(state, playerId);

    // 4. Move armies
    this._moveArmies(state, playerId);

    // 5. Research
    this._doResearch(state, playerId);
  }

  // -------------------------------------------------------------------------
  // Unit purchasing — prioritize T2, mix T1, respect army strength cap
  // -------------------------------------------------------------------------

  private _buyUnits(state: AoWGameState, playerId: number): void {
    const player = state.players[playerId];
    const myCities = state.cities.filter(c => c.playerId === playerId);
    const factionUnits = getUnitsForFaction(player.faction);

    const myPower = totalPlayerPower(state, playerId);
    const enemyPow = totalEnemyPower(state, playerId);

    // Don't over-invest if we already dominate
    if (myPower > enemyPow * 2 && myPower > 0) return;

    // Save gold for walls if threatened and a city lacks walls
    const threatened = isThreatened(state, playerId, 5);
    if (threatened) {
      for (const city of myCities) {
        if (!city.walls && player.gold >= AOW_BALANCE.WALL_BUILD_COST) {
          city.walls = true;
          player.gold -= AOW_BALANCE.WALL_BUILD_COST;
          state.log.push(`AI built walls in ${city.name}`);
          break; // one wall per turn
        }
      }
    }

    const t2Units = factionUnits.filter(u => u.tier === 2).sort((a, b) => b.cost - a.cost);
    const t1Units = factionUnits.filter(u => u.tier === 1).sort((a, b) => b.cost - a.cost);

    for (const city of myCities) {
      let army = state.armies.find(
        a => a.playerId === playerId && a.q === city.q && a.r === city.r,
      );

      // If army is full, skip
      if (army && army.units.length >= AOW_BALANCE.MAX_ARMY_SIZE) continue;

      // Try to buy T2 first, then fall back to T1
      const candidates = [...t2Units, ...t1Units];
      const affordable = candidates.filter(u => u.cost <= player.gold);
      if (affordable.length === 0) continue;

      // Prefer T2 70% of the time if affordable, else T1
      let def = affordable[0]; // best T2 if affordable
      if (def.tier === 2 && Math.random() < 0.3 && affordable.length > 1) {
        // Sometimes buy cheaper T1 for bulk
        const t1affordable = affordable.filter(u => u.tier === 1);
        if (t1affordable.length > 0) def = t1affordable[0];
      }

      const unit = createUnit(def.id, playerId, def);
      player.gold -= def.cost;

      if (army) {
        army.units.push(unit);
      } else {
        army = {
          id: `aow_ai_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          playerId,
          units: [unit],
          q: city.q,
          r: city.r,
          movementLeft: def.speed,
          maxMovement: def.speed,
        };
        state.armies.push(army);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Army movement — power-aware, retreat if outmatched
  // -------------------------------------------------------------------------

  private _moveArmies(state: AoWGameState, playerId: number): void {
    const myArmies = state.armies.filter(a => a.playerId === playerId);
    const capital = findCapital(state, playerId);

    // Determine which army is "defending capital" — the one closest to capital
    let capitalDefenderId: string | null = null;
    if (capital && myArmies.length > 1) {
      let closestDist = Infinity;
      for (const a of myArmies) {
        const d = hexDistance(a.q, a.r, capital.q, capital.r);
        if (d < closestDist) {
          closestDist = d;
          capitalDefenderId = a.id;
        }
      }
    }

    for (const army of myArmies) {
      // Skip if this army was destroyed
      if (!state.armies.includes(army)) continue;

      // Reset movement
      army.movementLeft = army.maxMovement;

      const myPow = armyPower(army);

      // Capital defender: stay near capital unless very strong
      if (army.id === capitalDefenderId && capital) {
        const distToCapital = hexDistance(army.q, army.r, capital.q, capital.r);
        if (distToCapital > 2 && myPow < totalEnemyPower(state, playerId) * 0.5) {
          // Move back toward capital
          this._moveToward(state, army, capital.q, capital.r, playerId);
          continue;
        }
      }

      // Find best target considering power
      const target = this._findBestTarget(state, army, playerId);
      if (!target) continue;

      // If target is an enemy army, check power ratio
      if (target.type === "army") {
        const enemyArmy = state.armies.find(
          a => a.playerId !== playerId && a.q === target.q && a.r === target.r,
        );
        if (enemyArmy && myPow < armyPower(enemyArmy) * 0.7) {
          // Outmatched — retreat toward nearest friendly city
          const nearestCity = this._nearestFriendlyCity(state, army, playerId);
          if (nearestCity) {
            this._moveToward(state, army, nearestCity.q, nearestCity.r, playerId);
          }
          continue;
        }
      }

      // Move toward target
      this._moveToward(state, army, target.q, target.r, playerId);
    }
  }

  private _findBestTarget(
    state: AoWGameState,
    army: AoWArmy,
    playerId: number,
  ): { q: number; r: number; type: "army" | "city"; score: number } | null {
    const myPow = armyPower(army);
    let bestTarget: { q: number; r: number; type: "army" | "city"; score: number } | null = null;
    let bestScore = -Infinity;

    // Score undefended / neutral cities very highly
    for (const city of state.cities) {
      if (city.playerId === playerId) continue;
      const dist = hexDistance(army.q, army.r, city.q, city.r);
      if (dist === 0) continue;
      const isUndefended = city.garrisonUnits.length === 0 &&
        !state.armies.some(a => a.playerId !== playerId && a.q === city.q && a.r === city.r);
      const garrisonPow = unitsPower(city.garrisonUnits);

      let score: number;
      if (isUndefended) {
        // Highly prioritize undefended cities; closer = better
        score = 1000 - dist * 10;
      } else if (myPow > garrisonPow * 0.7) {
        // Defended but we can take it
        const isEnemy = city.playerId >= 0;
        score = (isEnemy ? 500 : 300) - dist * 10;
      } else {
        // Too strong, skip
        continue;
      }

      if (score > bestScore) {
        bestScore = score;
        bestTarget = { q: city.q, r: city.r, type: "city", score };
      }
    }

    // Enemy armies — only if we can beat them
    for (const ea of state.armies) {
      if (ea.playerId === playerId) continue;
      const dist = hexDistance(army.q, army.r, ea.q, ea.r);
      const ePow = armyPower(ea);

      if (myPow < ePow * 0.7) continue; // skip if outmatched
      // Nearby threats get higher score
      const score = 400 - dist * 10 + (myPow > ePow * 1.5 ? 100 : 0);
      if (score > bestScore) {
        bestScore = score;
        bestTarget = { q: ea.q, r: ea.r, type: "army", score };
      }
    }

    return bestTarget;
  }

  private _nearestFriendlyCity(state: AoWGameState, army: AoWArmy, playerId: number): AoWCity | null {
    let best: AoWCity | null = null;
    let bestDist = Infinity;
    for (const city of state.cities) {
      if (city.playerId !== playerId) continue;
      const d = hexDistance(army.q, army.r, city.q, city.r);
      if (d < bestDist) {
        bestDist = d;
        best = city;
      }
    }
    return best;
  }

  /** Move army toward target hex, handling combat and captures along the way */
  private _moveToward(
    state: AoWGameState,
    army: AoWArmy,
    tq: number,
    tr: number,
    playerId: number,
  ): void {
    let movesLeft = army.movementLeft;

    while (movesLeft > 0) {
      const neighbors = hexNeighbors(army.q, army.r);
      let bestNeighbor: [number, number] | null = null;
      let bestNDist = hexDistance(army.q, army.r, tq, tr);

      for (const [nq, nr] of neighbors) {
        const hex = state.hexes.get(hexKey(nq, nr));
        if (!hex) continue;
        const tDef = AOW_TERRAIN[hex.terrain];
        if (!tDef.passable) continue;
        if (tDef.moveCost > movesLeft) continue;

        const nd = hexDistance(nq, nr, tq, tr);
        if (nd < bestNDist) {
          const occupied = state.armies.some(
            a => a.id !== army.id && a.playerId === playerId && a.q === nq && a.r === nr,
          );
          if (!occupied) {
            bestNDist = nd;
            bestNeighbor = [nq, nr];
          }
        }
      }

      if (!bestNeighbor) break;

      const hex = state.hexes.get(hexKey(bestNeighbor[0], bestNeighbor[1]))!;
      movesLeft -= AOW_TERRAIN[hex.terrain].moveCost;
      army.q = bestNeighbor[0];
      army.r = bestNeighbor[1];

      // Reveal fog of war
      revealHexes(state.hexes, army.q, army.r, 2, playerId);

      // Check for combat with enemy army
      const enemyArmy = state.armies.find(
        a => a.playerId !== playerId && a.q === army.q && a.r === army.r,
      );
      if (enemyArmy) {
        this._combatSystem.initCombat(state, army, enemyArmy, null);
        this._combatSystem.autoResolveCombat(state);
        this._combatSystem.applyCombatResults(state);
        break;
      }

      // Check city capture
      const enemyCity = state.cities.find(
        c => c.playerId !== playerId && c.q === army.q && c.r === army.r,
      );
      if (enemyCity) {
        if (enemyCity.garrisonUnits.length > 0) {
          this._combatSystem.initCombat(state, army, null, enemyCity);
          this._combatSystem.autoResolveCombat(state);
          this._combatSystem.applyCombatResults(state);
        } else {
          // Undefended city — capture
          const prevOwner = enemyCity.playerId;
          if (prevOwner >= 0) {
            state.players[prevOwner].goldPerTurn -= enemyCity.goldPerTurn;
            state.players[prevOwner].manaPerTurn -= enemyCity.manaPerTurn;
          }
          enemyCity.playerId = playerId;
          state.players[playerId].goldPerTurn += enemyCity.goldPerTurn;
          state.players[playerId].manaPerTurn += enemyCity.manaPerTurn;
          state.log.push(`AI captured ${enemyCity.name}!`);
        }
        break;
      }

      // Check if army was destroyed in combat
      if (!state.armies.includes(army)) break;
    }

    // Update movement
    if (state.armies.includes(army)) {
      army.movementLeft = Math.max(0, movesLeft);
    }
  }

  // -------------------------------------------------------------------------
  // Spell casting — heal, damage, buff
  // -------------------------------------------------------------------------

  private _castSpells(state: AoWGameState, playerId: number): void {
    const player = state.players[playerId];
    const researched = player.researchedSpells;
    const myArmies = state.armies.filter(a => a.playerId === playerId);
    const myCities = state.cities.filter(c => c.playerId === playerId);

    // 1. Heal damaged armies (HP < 60%)
    if (researched.includes("heal")) {
      const healSpell = getSpellDef("heal");
      if (healSpell && player.mana >= healSpell.manaCost) {
        for (const army of myArmies) {
          const avgHpPct = army.units.reduce((s, u) => s + u.hp / u.maxHp, 0) / army.units.length;
          if (avgHpPct < 0.6) {
            // Cast heal
            player.mana -= healSpell.manaCost;
            const healAmt = healSpell.heal ?? 20;
            for (const u of army.units) {
              u.hp = Math.min(u.maxHp, u.hp + healAmt);
            }
            state.log.push(`AI cast Heal on army near (${army.q},${army.r})`);
            break; // one heal per turn
          }
        }
      }
    }

    // 2. Buff spells before major battles (stone_skin / divine_shield)
    const buffSpells = ["stone_skin", "divine_shield"];
    for (const spellId of buffSpells) {
      if (!researched.includes(spellId)) continue;
      const spell = getSpellDef(spellId);
      if (!spell || player.mana < spell.manaCost) continue;

      // Find army near an enemy
      for (const army of myArmies) {
        const nearEnemy = state.armies.some(
          ea => ea.playerId !== playerId && hexDistance(army.q, army.r, ea.q, ea.r) <= 3,
        );
        if (nearEnemy) {
          player.mana -= spell.manaCost;
          // Buff: +4 defense to all units (simplified)
          for (const u of army.units) {
            u.defense += 4;
          }
          state.log.push(`AI cast ${spell.name} on army near (${army.q},${army.r})`);
          break;
        }
      }
    }

    // 3. Damage spells on enemy armies near our cities
    const dmgSpells = ["fireball", "drain_life", "meteor", "frozen_doom"];
    for (const spellId of dmgSpells) {
      if (!researched.includes(spellId)) continue;
      const spell = getSpellDef(spellId);
      if (!spell || player.mana < spell.manaCost) continue;

      if (spell.targetType === "global") {
        // Global damage: cast if multiple enemies exist
        const enemyArmies = state.armies.filter(a => a.playerId !== playerId);
        if (enemyArmies.length >= 2) {
          player.mana -= spell.manaCost;
          const dmg = spell.damage ?? 20;
          for (const ea of enemyArmies) {
            for (const u of ea.units) {
              u.hp = Math.max(1, u.hp - dmg);
            }
          }
          state.log.push(`AI cast ${spell.name}!`);
          break;
        }
        continue;
      }

      // Targeted damage: find enemy army near our cities
      for (const city of myCities) {
        const nearbyEnemy = state.armies.find(
          ea => ea.playerId !== playerId && hexDistance(city.q, city.r, ea.q, ea.r) <= 4,
        );
        if (nearbyEnemy) {
          player.mana -= spell.manaCost;
          const dmg = spell.damage ?? 15;
          for (const u of nearbyEnemy.units) {
            u.hp = Math.max(1, u.hp - dmg);
          }
          state.log.push(`AI cast ${spell.name} on enemy near ${city.name}`);
          break;
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Research — prioritized ordering
  // -------------------------------------------------------------------------

  private _doResearch(state: AoWGameState, playerId: number): void {
    const player = state.players[playerId];

    if (player.currentResearch) {
      player.researchProgress += AOW_BALANCE.RESEARCH_PER_TURN;
      if (player.researchProgress >= 30) {
        player.researchedSpells.push(player.currentResearch);
        state.log.push(`AI researched ${player.currentResearch}`);
        player.currentResearch = null;
        player.researchProgress = 0;
      }
    }

    if (!player.currentResearch) {
      const unresearched = player.spellBook.filter(s => !player.researchedSpells.includes(s));
      if (unresearched.length === 0) return;

      // Pick by priority list; fall back to first available if none in priority
      for (const pId of RESEARCH_PRIORITY) {
        if (unresearched.includes(pId)) {
          // Verify this spell actually exists in the spell list
          const spellExists = AOW_SPELLS.some(s => s.id === pId);
          if (spellExists) {
            player.currentResearch = pId;
            player.researchProgress = 0;
            return;
          }
        }
      }

      // Fallback: first unresearched
      player.currentResearch = unresearched[0];
      player.researchProgress = 0;
    }
  }
}
