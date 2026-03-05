// Random events system for world mode.
//
// Each turn, there's a chance for a random event to occur — barbarian raids,
// resource discoveries, plagues, bountiful harvests, etc.

import type { WorldState } from "@world/state/WorldState";
import type { WorldPlayer } from "@world/state/WorldPlayer";
import { hexSpiral, type HexCoord } from "@world/hex/HexCoord";
import { createWorldArmy, type ArmyUnit } from "@world/state/WorldArmy";
import { nextId } from "@world/state/WorldState";
import { TerrainType } from "@world/config/TerrainDefs";
import { UnitType } from "@/types";

// ---------------------------------------------------------------------------
// Event definitions
// ---------------------------------------------------------------------------

export interface WorldEvent {
  type: string;
  title: string;
  description: string;
  color: number;
}

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

/** Roll for random events at the start of a player's turn. Returns events that occurred. */
export function rollRandomEvents(state: WorldState, playerId: string): WorldEvent[] {
  const player = state.players.get(playerId);
  if (!player || !player.isAlive) return [];

  const events: WorldEvent[] = [];

  // No events in the first 3 turns
  if (state.turn <= 3) return events;

  // ~15% chance per turn for something to happen
  const roll = Math.random();

  if (roll < 0.03) {
    // Barbarian raid — spawn hostile army near a player city
    const evt = _barbarianRaid(state, player);
    if (evt) events.push(evt);
  } else if (roll < 0.06) {
    // Bountiful harvest
    events.push(_bountifulHarvest(player));
  } else if (roll < 0.09) {
    // Gold windfall
    events.push(_goldWindfall(player));
  } else if (roll < 0.11) {
    // Plague — lose population in a city
    const evt = _plague(state, player);
    if (evt) events.push(evt);
  } else if (roll < 0.13) {
    // Resource discovery
    const evt = _resourceDiscovery(state, player);
    if (evt) events.push(evt);
  } else if (roll < 0.15) {
    // Desertion — a few units leave
    const evt = _desertion(state, player);
    if (evt) events.push(evt);
  }

  return events;
}

// ---------------------------------------------------------------------------
// Event implementations
// ---------------------------------------------------------------------------

function _barbarianRaid(state: WorldState, player: WorldPlayer): WorldEvent | null {
  // Find a player city
  const cities = [...state.cities.values()].filter((c) => c.owner === player.id);
  if (cities.length === 0) return null;

  const city = cities[Math.floor(Math.random() * cities.length)];

  // Find a valid spawn hex 3-5 tiles from the city
  const candidates: HexCoord[] = [];
  for (const hex of hexSpiral(city.position, 5)) {
    const tile = state.grid.getTile(hex.q, hex.r);
    if (!tile) continue;
    if (tile.terrain === TerrainType.WATER || tile.terrain === TerrainType.MOUNTAINS) continue;
    if (tile.cityId || tile.armyId) continue;
    if (tile.owner === player.id) continue; // don't spawn in territory
    candidates.push(hex);
  }

  if (candidates.length === 0) return null;
  const spawnHex = candidates[Math.floor(Math.random() * candidates.length)];

  // Create barbarian army
  const armyId = nextId(state, "army");
  const tier = Math.min(3, Math.floor(state.turn / 10) + 1);
  const units: ArmyUnit[] = [
    { unitType: UnitType.SWORDSMAN, count: 2 + tier * 2, hpPerUnit: 100 },
  ];
  if (tier >= 2) {
    units.push({ unitType: UnitType.ARCHER, count: tier, hpPerUnit: 100 });
  }

  // Barbarians belong to a neutral hostile faction — use a fake player id
  // They don't have a WorldPlayer entry, so they attack everyone
  const army = createWorldArmy(armyId, "barbarian", spawnHex, units, false);
  state.armies.set(armyId, army);
  const tile = state.grid.getTile(spawnHex.q, spawnHex.r);
  if (tile) tile.armyId = armyId;

  return {
    type: "barbarian_raid",
    title: "Barbarian Raid!",
    description: `Barbarians spotted near ${city.name}!`,
    color: 0xff4444,
  };
}

function _bountifulHarvest(player: WorldPlayer): WorldEvent {
  const bonus = 10 + Math.floor(Math.random() * 15);
  player.food += bonus;
  return {
    type: "bountiful_harvest",
    title: "Bountiful Harvest",
    description: `A great harvest! +${bonus} food.`,
    color: 0x44cc44,
  };
}

function _goldWindfall(player: WorldPlayer): WorldEvent {
  const bonus = 50 + Math.floor(Math.random() * 100);
  player.gold += bonus;
  return {
    type: "gold_windfall",
    title: "Gold Discovery",
    description: `Miners found a gold vein! +${bonus} gold.`,
    color: 0xffcc44,
  };
}

function _plague(state: WorldState, player: WorldPlayer): WorldEvent | null {
  const cities = [...state.cities.values()].filter(
    (c) => c.owner === player.id && c.population > 2,
  );
  if (cities.length === 0) return null;

  const city = cities[Math.floor(Math.random() * cities.length)];
  const loss = Math.min(city.population - 1, 1 + Math.floor(Math.random() * 2));
  city.population -= loss;

  return {
    type: "plague",
    title: "Plague!",
    description: `Disease strikes ${city.name}! -${loss} population.`,
    color: 0xaa44aa,
  };
}

function _resourceDiscovery(_state: WorldState, player: WorldPlayer): WorldEvent | null {
  // Give a random boost to both gold and mana
  const goldBonus = 30 + Math.floor(Math.random() * 50);
  const manaBonus = 5 + Math.floor(Math.random() * 10);
  player.gold += goldBonus;
  player.mana += manaBonus;

  return {
    type: "resource_discovery",
    title: "Ancient Cache",
    description: `Explorers found ancient artifacts! +${goldBonus} gold, +${manaBonus} mana.`,
    color: 0x8888ff,
  };
}

function _desertion(state: WorldState, player: WorldPlayer): WorldEvent | null {
  // Only trigger when the player can't pay their armies
  if (player.gold >= 0) return null;

  // Find a field army with units to lose
  const armies = [...state.armies.values()].filter(
    (a) => a.owner === player.id && !a.isGarrison && a.units.length > 0,
  );
  if (armies.length === 0) return null;

  const army = armies[Math.floor(Math.random() * armies.length)];
  // Lose 1-2 units from a random stack
  const stack = army.units[Math.floor(Math.random() * army.units.length)];
  const loss = Math.min(stack.count, 1 + Math.floor(Math.random() * 2));
  stack.count -= loss;

  // Clean up empty stacks
  army.units = army.units.filter((u) => u.count > 0);

  // If army is now empty, remove it
  if (army.units.length === 0) {
    const tile = state.grid.getTile(army.position.q, army.position.r);
    if (tile && tile.armyId === army.id) tile.armyId = null;
    state.armies.delete(army.id);
  }

  return {
    type: "desertion",
    title: "Desertion",
    description: `${loss} soldiers deserted from your army.`,
    color: 0xcc8844,
  };
}
