// Morgaine's Corruption / Escalation System
//
// Every 15 turns, Morgaine spawns a new roaming army (increasingly powerful).
// Her territory slowly expands, corrupting adjacent tiles to desert.
// After turn 30, she casts overland-style curses against players.

import type { WorldState } from "@world/state/WorldState";
import { hexSpiral, hexDistance, type HexCoord } from "@world/hex/HexCoord";
import { createWorldArmy, type ArmyUnit } from "@world/state/WorldArmy";
import { nextId } from "@world/state/WorldState";
import { TerrainType } from "@world/config/TerrainDefs";
import { UnitType } from "@/types";

// ---------------------------------------------------------------------------
// Escalation events (returned for UI notification)
// ---------------------------------------------------------------------------

export interface MorgaineEvent {
  type: string;
  title: string;
  description: string;
  color: number;
}

// ---------------------------------------------------------------------------
// Main escalation processing — called once per full turn cycle
// ---------------------------------------------------------------------------

export function processMorgaineEscalation(state: WorldState): MorgaineEvent[] {
  const events: MorgaineEvent[] = [];

  const morgaine = state.players.get("morgaine");
  if (!morgaine || !morgaine.isAlive) return events;

  // Spawn new army every 15 turns (starting at turn 15)
  if (state.turn >= 15 && state.turn % 15 === 0) {
    const evt = _spawnMorgaineArmy(state);
    if (evt) events.push(evt);
  }

  // Expand corruption every 10 turns (starting at turn 10)
  if (state.turn >= 10 && state.turn % 10 === 0) {
    const evt = _expandCorruption(state);
    if (evt) events.push(evt);
  }

  // After turn 30, cast curses against players every 8 turns
  if (state.turn >= 30 && state.turn % 8 === 0) {
    const curseEvents = _castMorgaineCurses(state);
    events.push(...curseEvents);
  }

  return events;
}

// ---------------------------------------------------------------------------
// Spawn escalating Morgaine army
// ---------------------------------------------------------------------------

function _spawnMorgaineArmy(state: WorldState): MorgaineEvent | null {
  const center = { q: 0, r: 0 };
  const escalationTier = Math.floor(state.turn / 15); // 1, 2, 3, ...

  // Build army composition based on tier
  const units: ArmyUnit[] = [
    { unitType: UnitType.KNIGHT, count: 4 + escalationTier * 2, hpPerUnit: 100 },
    { unitType: UnitType.CROSSBOWMAN, count: 2 + escalationTier, hpPerUnit: 100 },
  ];
  if (escalationTier >= 2) {
    units.push({ unitType: UnitType.STORM_MAGE, count: escalationTier, hpPerUnit: 100 });
  }
  if (escalationTier >= 3) {
    units.push({ unitType: UnitType.DARK_SAVANT, count: Math.floor(escalationTier / 2), hpPerUnit: 100 });
  }
  if (escalationTier >= 4) {
    units.push({ unitType: UnitType.RED_DRAGON, count: 1, hpPerUnit: 100 });
  }

  // Find spawn hex: 4-8 tiles from center, not occupied
  const candidates: HexCoord[] = [];
  for (const hex of hexSpiral(center, 8)) {
    const dist = hexDistance(center, hex);
    if (dist < 4 || dist > 8) continue;
    const tile = state.grid.getTile(hex.q, hex.r);
    if (!tile) continue;
    if (tile.terrain === TerrainType.WATER || tile.terrain === TerrainType.MOUNTAINS) continue;
    if (tile.cityId || tile.armyId) continue;
    candidates.push(hex);
  }

  if (candidates.length === 0) return null;
  const spawnHex = candidates[Math.floor(Math.random() * candidates.length)];

  const armyId = nextId(state, "army");
  const army = createWorldArmy(armyId, "morgaine", spawnHex, units, false);
  army.movementPoints = 0;
  army.maxMovementPoints = 0;
  state.armies.set(armyId, army);
  const tile = state.grid.getTile(spawnHex.q, spawnHex.r);
  if (tile) tile.armyId = armyId;

  return {
    type: "morgaine_army",
    title: "Morgaine's Power Grows!",
    description: `A new army of darkness emerges from Avalon! (Tier ${escalationTier})`,
    color: 0xcc44ff,
  };
}

// ---------------------------------------------------------------------------
// Territory corruption — expand Morgaine's wasteland
// ---------------------------------------------------------------------------

function _expandCorruption(state: WorldState): MorgaineEvent | null {
  // Find all tiles owned by Morgaine
  const morgaineTiles = state.grid.getTilesOwnedBy("morgaine");
  if (morgaineTiles.length === 0) return null;

  let corrupted = 0;
  const maxCorrupt = 3 + Math.floor(state.turn / 10); // More corruption as game progresses

  // For each Morgaine tile, try to corrupt adjacent non-Morgaine tiles
  for (const mt of morgaineTiles) {
    if (corrupted >= maxCorrupt) break;
    const neighbors = hexSpiral({ q: mt.q, r: mt.r }, 1);
    for (const n of neighbors) {
      if (corrupted >= maxCorrupt) break;
      if (n.q === mt.q && n.r === mt.r) continue;
      const tile = state.grid.getTile(n.q, n.r);
      if (!tile) continue;
      if (tile.owner === "morgaine") continue;
      if (tile.terrain === TerrainType.WATER) continue;
      if (tile.cityId) continue; // Don't corrupt cities
      if (tile.owner && tile.owner !== "morgaine") continue; // Don't corrupt player territory directly

      // Corrupt unclaimed tiles to desert and claim for Morgaine
      tile.terrain = TerrainType.DESERT;
      tile.owner = "morgaine";
      tile.resource = null;
      tile.improvement = null;
      corrupted++;
    }
  }

  if (corrupted === 0) return null;

  return {
    type: "morgaine_corruption",
    title: "The Wasteland Spreads",
    description: `Morgaine's corruption spreads — ${corrupted} tiles consumed by darkness.`,
    color: 0x884488,
  };
}

// ---------------------------------------------------------------------------
// Morgaine curses — debuffs against players
// ---------------------------------------------------------------------------

function _castMorgaineCurses(state: WorldState): MorgaineEvent[] {
  const events: MorgaineEvent[] = [];

  for (const pid of state.playerOrder) {
    const player = state.players.get(pid);
    if (!player || !player.isAlive || player.id === "morgaine") continue;

    const roll = Math.random();

    if (roll < 0.3) {
      // Famine — lose food
      const loss = 10 + Math.floor(Math.random() * 15);
      player.food = Math.max(0, player.food - loss);
      events.push({
        type: "morgaine_famine",
        title: "Morgaine's Curse: Famine!",
        description: `Dark magic blights your fields! -${loss} food.`,
        color: 0xaa4488,
      });
    } else if (roll < 0.5) {
      // Pestilence — lose population in a random city
      const cities = [...state.cities.values()].filter(
        (c) => c.owner === pid && c.population > 2,
      );
      if (cities.length > 0) {
        const city = cities[Math.floor(Math.random() * cities.length)];
        city.population -= 1;
        events.push({
          type: "morgaine_pestilence",
          title: "Morgaine's Curse: Pestilence!",
          description: `Morgaine's dark plague strikes ${city.name}! -1 population.`,
          color: 0x884466,
        });
      }
    } else if (roll < 0.65) {
      // Gold drain
      const loss = 30 + Math.floor(Math.random() * 50);
      player.gold = Math.max(0, player.gold - loss);
      events.push({
        type: "morgaine_gold_drain",
        title: "Morgaine's Curse: Gold Drain!",
        description: `Enchanted thieves steal from your treasury! -${loss} gold.`,
        color: 0xaa6644,
      });
    }
    // 35% chance: no curse this cycle (mercy)
  }

  return events;
}
