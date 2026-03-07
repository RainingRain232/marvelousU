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
import { UnitType, BuildingType } from "@/types";

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
  } else if (roll < 0.17) {
    // Knight Errant — a wandering knight offers service
    events.push(_knightErrant(state, player));
  } else if (roll < 0.19) {
    // Fairy Blessing/Curse — forest spirits meddle
    const evt = _fairyBlessingCurse(state, player);
    if (evt) events.push(evt);
  } else if (roll < 0.21) {
    // Tournament at Court — spend gold to level a unit
    const evt = _tournamentAtCourt(state, player);
    if (evt) events.push(evt);
  } else if (roll < 0.23) {
    // Merlin's Prophecy — reveals enemy armies
    events.push(_merlinsProphecy(state, player));
  } else if (roll < 0.245) {
    // Holy Relic Discovered — mana bonus from a temple city
    const evt = _holyRelicDiscovered(state, player);
    if (evt) events.push(evt);
  } else if (roll < 0.26) {
    // Dragon Sighting — powerful neutral dragon spawns
    const evt = _dragonSighting(state, player);
    if (evt) events.push(evt);
  } else if (roll < 0.275) {
    // Treachery at Court — lose gold
    events.push(_treacheryAtCourt(player));
  } else if (roll < 0.29) {
    // Pilgrimage — population boost to a temple city
    const evt = _pilgrimage(state, player);
    if (evt) events.push(evt);
  } else if (roll < 0.30) {
    // Morgan's Enchantment — enemy city loses production
    const evt = _morgansEnchantment(state, player);
    if (evt) events.push(evt);
  } else if (roll < 0.31) {
    // Questing Beast Sighting — map reveal for Pellinore, flavor for others
    events.push(_questingBeastSighting(state, player));
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

// ---------------------------------------------------------------------------
// Arthurian event implementations
// ---------------------------------------------------------------------------

function _knightErrant(state: WorldState, player: WorldPlayer): WorldEvent {
  // Spawn a free swordsman or knight near the player's nearest city
  const cities = [...state.cities.values()].filter((c) => c.owner === player.id);
  if (cities.length > 0) {
    const city = cities[Math.floor(Math.random() * cities.length)];
    const garrison = city.garrisonArmyId ? state.armies.get(city.garrisonArmyId) : null;
    const unitType = state.turn >= 15 ? UnitType.KNIGHT : UnitType.SWORDSMAN;
    const unitName = state.turn >= 15 ? "knight" : "swordsman";
    if (garrison) {
      const existing = garrison.units.find((u) => u.unitType === unitType);
      if (existing) {
        existing.count += 1;
      } else {
        garrison.units.push({ unitType, count: 1, hpPerUnit: 100 });
      }
    }
    return {
      type: "knight_errant",
      title: "Knight Errant",
      description: `A wandering ${unitName} pledges service to your cause at ${city.name}!`,
      color: 0x88aaff,
    };
  }
  return {
    type: "knight_errant",
    title: "Knight Errant",
    description: "A wandering knight sought your banner but could find no city to join.",
    color: 0x88aaff,
  };
}

function _fairyBlessingCurse(state: WorldState, player: WorldPlayer): WorldEvent | null {
  const cities = [...state.cities.values()].filter((c) => c.owner === player.id);
  if (cities.length === 0) return null;

  const city = cities[Math.floor(Math.random() * cities.length)];
  const blessed = Math.random() < 0.5;

  if (blessed) {
    const bonus = 8 + Math.floor(Math.random() * 12);
    player.food += bonus;
    return {
      type: "fairy_blessing",
      title: "Fairy Blessing",
      description: `Forest spirits bless ${city.name} with abundance! +${bonus} food.`,
      color: 0x44ffaa,
    };
  } else {
    const loss = 5 + Math.floor(Math.random() * 10);
    player.food = Math.max(0, player.food - loss);
    return {
      type: "fairy_curse",
      title: "Fairy Curse",
      description: `Mischievous fey spirits spoil the stores of ${city.name}! -${loss} food.`,
      color: 0xaa44cc,
    };
  }
}

function _tournamentAtCourt(state: WorldState, player: WorldPlayer): WorldEvent | null {
  if (player.gold < 100) return null;

  const armies = [...state.armies.values()].filter(
    (a) => a.owner === player.id && a.units.length > 0,
  );
  if (armies.length === 0) return null;

  player.gold -= 100;
  // Bonus: add extra units to a garrison as "tournament champions"
  const cities = [...state.cities.values()].filter((c) => c.owner === player.id);
  if (cities.length > 0) {
    const city = cities[Math.floor(Math.random() * cities.length)];
    const garrison = city.garrisonArmyId ? state.armies.get(city.garrisonArmyId) : null;
    if (garrison) {
      const existing = garrison.units.find((u) => u.unitType === UnitType.SWORDSMAN);
      if (existing) existing.count += 2;
      else garrison.units.push({ unitType: UnitType.SWORDSMAN, count: 2, hpPerUnit: 100 });
    }
  }

  return {
    type: "tournament",
    title: "Tournament at Court",
    description: "A grand tournament! -100 gold. Champions join your garrison.",
    color: 0xddaa44,
  };
}

function _merlinsProphecy(state: WorldState, player: WorldPlayer): WorldEvent {
  // Reveal all enemy army positions by adding their hexes to explored & visible
  for (const army of state.armies.values()) {
    if (army.owner === player.id) continue;
    if (army.owner === "barbarian") continue;
    const key = `${army.position.q},${army.position.r}`;
    player.exploredTiles.add(key);
    player.visibleTiles.add(key);
    // Also reveal adjacent hexes
    for (const hex of hexSpiral(army.position, 1)) {
      player.exploredTiles.add(`${hex.q},${hex.r}`);
      player.visibleTiles.add(`${hex.q},${hex.r}`);
    }
  }
  return {
    type: "merlins_prophecy",
    title: "Merlin's Prophecy",
    description: "Merlin whispers secrets of the land — all enemy armies revealed!",
    color: 0x8844ff,
  };
}

function _holyRelicDiscovered(state: WorldState, player: WorldPlayer): WorldEvent | null {
  // Check if player has a city with a temple
  const cities = [...state.cities.values()].filter(
    (c) => c.owner === player.id && c.buildings.some((b) => b.type === BuildingType.TEMPLE),
  );
  if (cities.length === 0) return null;

  const bonus = 15 + Math.floor(Math.random() * 10);
  player.mana += bonus;

  return {
    type: "holy_relic",
    title: "Holy Relic Discovered",
    description: `Monks unearth a sacred relic in your temple! +${bonus} mana.`,
    color: 0xffdd88,
  };
}

function _dragonSighting(state: WorldState, _player: WorldPlayer): WorldEvent | null {
  // Find a valid spawn hex away from all players
  const allHexes: HexCoord[] = [];
  for (const tile of state.grid.allTiles()) {
    if (tile.terrain === TerrainType.WATER || tile.terrain === TerrainType.MOUNTAINS) continue;
    if (tile.cityId || tile.armyId) continue;
    allHexes.push({ q: tile.q, r: tile.r });
  }

  if (allHexes.length === 0) return null;
  const spawnHex = allHexes[Math.floor(Math.random() * allHexes.length)];

  const armyId = nextId(state, "army");
  const units: ArmyUnit[] = [
    { unitType: UnitType.RED_DRAGON, count: 1, hpPerUnit: 100 },
    { unitType: UnitType.FIRE_ELEMENTAL, count: 2, hpPerUnit: 100 },
  ];
  const army = createWorldArmy(armyId, "barbarian", spawnHex, units, false);
  army.movementPoints = 0; // Stationary dragon lair
  army.maxMovementPoints = 0;
  state.armies.set(armyId, army);
  const tile = state.grid.getTile(spawnHex.q, spawnHex.r);
  if (tile) tile.armyId = armyId;

  return {
    type: "dragon_sighting",
    title: "Dragon Sighting!",
    description: "A fearsome dragon and its fire elementals have been spotted on the map!",
    color: 0xff6622,
  };
}

function _treacheryAtCourt(player: WorldPlayer): WorldEvent {
  const loss = 50 + Math.floor(Math.random() * 50);
  player.gold = Math.max(0, player.gold - loss);
  return {
    type: "treachery",
    title: "Treachery at Court",
    description: `A courtier's schemes cost you ${loss} gold!`,
    color: 0xcc4444,
  };
}

function _pilgrimage(state: WorldState, player: WorldPlayer): WorldEvent | null {
  const cities = [...state.cities.values()].filter(
    (c) => c.owner === player.id && c.buildings.some((b) => b.type === BuildingType.TEMPLE),
  );
  if (cities.length === 0) return null;

  const city = cities[Math.floor(Math.random() * cities.length)];
  city.population += 2;

  return {
    type: "pilgrimage",
    title: "Pilgrimage",
    description: `Pilgrims flock to ${city.name}! +2 population.`,
    color: 0xeedd88,
  };
}

function _morgansEnchantment(state: WorldState, player: WorldPlayer): WorldEvent | null {
  // Find an enemy city to curse (lose gold)
  const enemyCities = [...state.cities.values()].filter(
    (c) => c.owner !== player.id && c.owner !== "morgaine" && c.owner !== null,
  );
  if (enemyCities.length === 0) return null;

  const city = enemyCities[Math.floor(Math.random() * enemyCities.length)];
  const enemyPlayer = state.players.get(city.owner!);
  if (!enemyPlayer) return null;

  const loss = 30 + Math.floor(Math.random() * 40);
  enemyPlayer.gold = Math.max(0, enemyPlayer.gold - loss);

  return {
    type: "morgans_enchantment",
    title: "Morgan's Enchantment",
    description: `Morgan le Fay's magic drains ${loss} gold from ${city.name}!`,
    color: 0x9944cc,
  };
}

function _questingBeastSighting(state: WorldState, player: WorldPlayer): WorldEvent {
  if (player.leaderId === "pellinore") {
    // Pellinore gets a big map reveal
    for (const tile of state.grid.allTiles()) {
      const key = `${tile.q},${tile.r}`;
      player.exploredTiles.add(key);
      player.visibleTiles.add(key);
    }
    return {
      type: "questing_beast",
      title: "The Questing Beast!",
      description: "Pellinore tracks the Beast across the land — the entire map is revealed!",
      color: 0x44ddaa,
    };
  }
  // Others just get flavor text and a small mana bonus
  player.mana += 5;
  return {
    type: "questing_beast",
    title: "Questing Beast Sighting",
    description: "A strange creature is glimpsed in the wilderness... +5 mana from the omen.",
    color: 0x44ddaa,
  };
}
