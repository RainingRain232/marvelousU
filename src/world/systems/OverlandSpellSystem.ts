// Overland spell system — handles casting, duration tracking, and effects.
//
// Called from TurnSystem to process active spell effects each turn.

import type { WorldState } from "@world/state/WorldState";
import type { WorldPlayer } from "@world/state/WorldPlayer";
import {
  type OverlandSpellId,
  OVERLAND_SPELLS,
} from "@world/config/OverlandSpellDefs";
import { hexSpiral, hexKey } from "@world/hex/HexCoord";

// ---------------------------------------------------------------------------
// Cast validation
// ---------------------------------------------------------------------------

/** Check if a player can cast a given spell. Returns error string or null. */
export function canCastSpell(
  player: WorldPlayer,
  spellId: OverlandSpellId,
  state: WorldState,
): string | null {
  const def = OVERLAND_SPELLS[spellId];
  if (!def) return "Unknown spell.";

  // Check cooldown
  const cd = player.spellCooldowns.get(spellId) ?? 0;
  if (cd > 0) return `On cooldown (${cd} turns).`;

  // Check if already active (non-toggle, non-instant)
  if (player.activeSpells.has(spellId) && !def.isToggle && def.duration > 0) {
    return "Already active.";
  }

  // Check mana cost (double if suppress_magic active on any enemy)
  let cost = def.manaCost;
  if (isGlobalSpellActive(state, "suppress_magic", player.id)) {
    cost *= 2;
  }
  if (player.mana < cost) return `Not enough mana (need ${cost}).`;

  // Planar seal blocks teleportation
  if (spellId === "mass_teleport" && isGlobalSpellActive(state, "planar_seal")) {
    return "Blocked by Planar Seal.";
  }

  // Spell of Mastery: can't cast if already channeling
  if (spellId === "spell_of_mastery" && player.masteryProgress > 0) {
    return "Already channeling.";
  }

  return null;
}

/** Get the effective mana cost for a player (accounting for Suppress Magic). */
export function getEffectiveCost(
  player: WorldPlayer,
  spellId: OverlandSpellId,
  state: WorldState,
): number {
  const def = OVERLAND_SPELLS[spellId];
  let cost = def.manaCost;
  if (isGlobalSpellActive(state, "suppress_magic", player.id)) {
    cost *= 2;
  }
  return cost;
}

// ---------------------------------------------------------------------------
// Cast spell
// ---------------------------------------------------------------------------

export interface CastResult {
  success: boolean;
  message: string;
}

/** Cast an overland spell. For targeted spells, pass targetCityId or targetArmyId. */
export function castSpell(
  state: WorldState,
  casterId: string,
  spellId: OverlandSpellId,
  targetCityId?: string,
  _targetArmyId?: string,
): CastResult {
  const player = state.players.get(casterId);
  if (!player) return { success: false, message: "Invalid caster." };

  const err = canCastSpell(player, spellId, state);
  if (err) return { success: false, message: err };

  const def = OVERLAND_SPELLS[spellId];
  const cost = getEffectiveCost(player, spellId, state);

  // Check if target is warded
  if (def.target === "enemy_city" && targetCityId) {
    const city = state.cities.get(targetCityId);
    if (city) {
      const targetPlayer = state.players.get(city.owner);
      if (targetPlayer && targetPlayer.activeSpells.has("great_warding")) {
        return { success: false, message: "Target city is protected by Great Warding." };
      }
      // Check Spell Blast
      if (targetPlayer && targetPlayer.spellBlastActive) {
        targetPlayer.spellBlastActive = false;
        player.mana -= cost;
        return { success: true, message: "Spell was countered by Spell Blast!" };
      }
    }
  }

  // Deduct mana
  player.mana -= cost;

  // Apply effect
  switch (spellId) {
    case "eagle_eye":
      _applyEagleEye(state, player);
      player.activeSpells.set(spellId, def.duration);
      break;

    case "awareness":
      _applyAwareness(state, player);
      break;

    case "detect_magic":
      player.activeSpells.set(spellId, def.duration);
      break;

    case "alchemy":
      if (player.alchemyMode) {
        // Toggle off
        player.alchemyMode = null;
        player.activeSpells.delete(spellId);
        return { success: true, message: "Alchemy deactivated." };
      } else {
        player.alchemyMode = "gold_to_mana";
        player.activeSpells.set(spellId, 0);
      }
      break;

    case "fertility":
    case "prosperity":
    case "channel_surge":
    case "herb_mastery":
    case "wind_walking":
    case "enchant_roads":
      player.activeSpells.set(spellId, def.duration);
      break;

    case "crusade":
      player.activeSpells.set(spellId, 0); // permanent
      break;

    case "eternal_night":
    case "suppress_magic":
    case "planar_seal":
      // Global effects — stored on the caster
      player.activeSpells.set(spellId, def.duration);
      break;

    case "famine":
      if (targetCityId) {
        _applyCurseToCity(player, "famine", targetCityId, def.duration);
      }
      break;

    case "pestilence":
      if (targetCityId) {
        _applyCurseToCity(player, "pestilence", targetCityId, def.duration);
      }
      break;

    case "corruption":
      if (targetCityId) {
        _applyCurseToCity(player, "corruption", targetCityId, def.duration);
      }
      break;

    case "meteor_storm":
      _applyMeteorStorm(state, casterId);
      break;

    case "great_unsummoning":
      _applyGreatUnsummoning(state);
      break;

    case "great_warding":
      player.activeSpells.set(spellId, def.duration);
      break;

    case "spell_blast":
      player.spellBlastActive = true;
      player.activeSpells.set(spellId, 0);
      break;

    case "mass_teleport":
      // Teleport is handled by the UI (select army then target hex)
      // This just validates and deducts mana — actual movement done externally
      break;

    case "spell_of_mastery":
      player.masteryProgress = 1;
      player.activeSpells.set(spellId, def.duration);
      break;

    case "time_stop":
      player.activeSpells.set(spellId, def.duration);
      break;

    case "armageddon":
      _applyArmageddon(state);
      player.activeSpells.set(spellId, def.duration);
      break;
  }

  // Set cooldown
  if (def.cooldown > 0) {
    player.spellCooldowns.set(spellId, def.cooldown);
  }

  return { success: true, message: `${def.name} cast successfully!` };
}

// ---------------------------------------------------------------------------
// Per-turn processing
// ---------------------------------------------------------------------------

/** Process all active overland spell effects for a player at turn start. */
export function processOverlandSpells(state: WorldState, playerId: string): void {
  const player = state.players.get(playerId);
  if (!player) return;

  // Tick cooldowns
  for (const [spellId, cd] of player.spellCooldowns) {
    if (cd <= 1) {
      player.spellCooldowns.delete(spellId);
    } else {
      player.spellCooldowns.set(spellId, cd - 1);
    }
  }

  // Process active spell durations
  for (const [spellId, turnsLeft] of player.activeSpells) {
    if (turnsLeft > 0) {
      const newTurns = turnsLeft - 1;
      if (newTurns <= 0) {
        player.activeSpells.delete(spellId);
        _onSpellExpired(player, spellId);
      } else {
        player.activeSpells.set(spellId, newTurns);
      }
    }
    // 0 = permanent, don't decrement
  }

  // --- Per-turn effects ---

  // Alchemy
  if (player.alchemyMode === "gold_to_mana") {
    const convert = Math.min(10, player.gold);
    player.gold -= convert;
    player.mana += Math.floor(convert / 2);
  } else if (player.alchemyMode === "mana_to_gold") {
    const convert = Math.min(5, player.mana);
    player.mana -= convert;
    player.gold += convert * 2;
  }

  // Eagle Eye — refresh extended visibility
  if (player.activeSpells.has("eagle_eye")) {
    _applyEagleEye(state, player);
  }

  // Herb Mastery — heal all armies
  if (player.activeSpells.has("herb_mastery")) {
    for (const army of state.armies.values()) {
      if (army.owner !== playerId) continue;
      for (const u of army.units) {
        u.hpPerUnit = 100;
      }
    }
  }

  // Wind Walking / Enchant Roads — movement bonus applied in beginTurn
  // (handled by checking activeSpells when resetting movement)

  // Spell of Mastery — advance channeling
  if (player.activeSpells.has("spell_of_mastery")) {
    player.masteryProgress++;
    if (player.masteryProgress >= 20) {
      // Win the game!
      state.winnerId = playerId;
      // Phase will be set by the victory check in TurnSystem
    }
  }

  // Process city curses
  _processCityCurses(state, player);

  // Time Stop — handled in TurnSystem (skip enemy turns)
}

// ---------------------------------------------------------------------------
// Helpers — spell effects
// ---------------------------------------------------------------------------

function _applyEagleEye(state: WorldState, player: WorldPlayer): void {
  const EAGLE_SIGHT = 6;
  for (const army of state.armies.values()) {
    if (army.owner !== player.id) continue;
    for (const h of hexSpiral(army.position, EAGLE_SIGHT)) {
      if (!state.grid.hasTile(h.q, h.r)) continue;
      const key = hexKey(h.q, h.r);
      player.visibleTiles.add(key);
      player.exploredTiles.add(key);
    }
  }
  for (const city of state.cities.values()) {
    if (city.owner !== player.id) continue;
    for (const h of hexSpiral(city.position, EAGLE_SIGHT)) {
      if (!state.grid.hasTile(h.q, h.r)) continue;
      const key = hexKey(h.q, h.r);
      player.visibleTiles.add(key);
      player.exploredTiles.add(key);
    }
  }
}

function _applyAwareness(state: WorldState, player: WorldPlayer): void {
  for (const tile of state.grid.allTiles()) {
    const key = hexKey(tile.q, tile.r);
    player.visibleTiles.add(key);
    player.exploredTiles.add(key);
  }
  // Mark as permanent
  player.activeSpells.set("awareness", 0);
}

function _applyMeteorStorm(state: WorldState, casterId: string): void {
  for (const army of state.armies.values()) {
    if (army.owner === casterId) continue;
    for (const u of army.units) {
      u.hpPerUnit = Math.max(1, Math.floor(u.hpPerUnit * 0.75));
    }
  }
}

function _applyGreatUnsummoning(state: WorldState): void {
  // Destroy 50% of units in all armies (simulating summoned creature loss)
  for (const army of state.armies.values()) {
    for (const u of army.units) {
      const lost = Math.floor(u.count * 0.5);
      u.count -= lost;
    }
    army.units = army.units.filter((u) => u.count > 0);
  }
}

function _applyArmageddon(state: WorldState): void {
  // Kill units with <50 HP in all armies
  for (const army of state.armies.values()) {
    for (const u of army.units) {
      if (u.hpPerUnit < 50) {
        u.count = 0;
      }
    }
    army.units = army.units.filter((u) => u.count > 0);
  }
}

function _applyCurseToCity(
  player: WorldPlayer,
  curseType: string,
  cityId: string,
  duration: number,
): void {
  let cities = player.cursedCities.get(curseType);
  if (!cities) {
    cities = new Set();
    player.cursedCities.set(curseType, cities);
  }
  cities.add(`${cityId}:${duration}`);
}

function _processCityCurses(state: WorldState, caster: WorldPlayer): void {
  for (const [curseType, entries] of caster.cursedCities) {
    const newEntries = new Set<string>();
    for (const entry of entries) {
      const [cityId, turnsStr] = entry.split(":");
      let turns = parseInt(turnsStr);
      const city = state.cities.get(cityId);
      if (!city || turns <= 0) continue;

      // Apply curse effect
      switch (curseType) {
        case "famine":
          city.foodStockpile = 0;
          break;
        case "pestilence":
          if (city.population > 1) city.population--;
          break;
        case "corruption":
          // Tiles produce nothing — handled in economy check
          break;
      }

      turns--;
      if (turns > 0) {
        newEntries.add(`${cityId}:${turns}`);
      }
    }
    if (newEntries.size > 0) {
      caster.cursedCities.set(curseType, newEntries);
    } else {
      caster.cursedCities.delete(curseType);
    }
  }
}

function _onSpellExpired(player: WorldPlayer, spellId: OverlandSpellId): void {
  if (spellId === "spell_blast") {
    player.spellBlastActive = false;
  }
}

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

/** Check if a global spell is active on any player. Optionally exclude a player. */
export function isGlobalSpellActive(
  state: WorldState,
  spellId: OverlandSpellId,
  excludePlayerId?: string,
): boolean {
  for (const [pid, player] of state.players) {
    if (excludePlayerId && pid === excludePlayerId) continue;
    if (player.activeSpells.has(spellId)) return true;
  }
  return false;
}

/** Check if a city is cursed with a given curse type by any player. */
export function isCityCursed(state: WorldState, cityId: string, curseType: string): boolean {
  for (const player of state.players.values()) {
    const entries = player.cursedCities.get(curseType);
    if (!entries) continue;
    for (const entry of entries) {
      if (entry.startsWith(`${cityId}:`)) return true;
    }
  }
  return false;
}

/** Get movement bonus from active spells for a player. */
export function getSpellMovementBonus(player: WorldPlayer): number {
  let bonus = 0;
  if (player.activeSpells.has("wind_walking")) bonus += 2;
  if (player.activeSpells.has("enchant_roads")) bonus += 1;
  return bonus;
}

/** Get all active spells visible to a player (for Detect Magic). */
export function getAllActiveSpells(
  state: WorldState,
): Array<{ playerId: string; spellId: OverlandSpellId; turnsLeft: number }> {
  const result: Array<{ playerId: string; spellId: OverlandSpellId; turnsLeft: number }> = [];
  for (const [pid, player] of state.players) {
    for (const [spellId, turnsLeft] of player.activeSpells) {
      result.push({ playerId: pid, spellId, turnsLeft });
    }
  }
  return result;
}
