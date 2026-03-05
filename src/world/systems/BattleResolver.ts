// Bridge between world mode and the battle simulation.
//
// Creates a fresh GameState from world army data, runs the existing
// SimLoop to completion, then extracts results back into the world state.

import type { WorldState, PendingBattle } from "@world/state/WorldState";
import type { WorldArmy, ArmyUnit } from "@world/state/WorldArmy";
import { createWorldArmy } from "@world/state/WorldArmy";
import type { WorldCity } from "@world/state/WorldCity";
import type { WorldCamp } from "@world/state/WorldCamp";
import { createGameState } from "@sim/state/GameState";
import type { GameState } from "@sim/state/GameState";
import { createPlayerState } from "@sim/state/PlayerState";
import { createUnit } from "@sim/entities/Unit";
import { Direction, GamePhase, GameMode, UnitState } from "@/types";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { hexNeighbors } from "@world/hex/HexCoord";
import { TERRAIN_DEFINITIONS } from "@world/config/TerrainDefs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BattleResult {
  winnerId: string | null; // world player ID or null (draw)
  attackerSurvivors: ArmyUnit[];
  defenderSurvivors: ArmyUnit[];
}

// ---------------------------------------------------------------------------
// Build battle state
// ---------------------------------------------------------------------------

/** Create a GameState for a field battle between two world armies. */
export function buildFieldBattleState(
  attacker: WorldArmy,
  defender: WorldArmy,
): GameState {
  const state = createGameState(
    BalanceConfig.GRID_WIDTH,
    BalanceConfig.GRID_HEIGHT,
    0,
    GameMode.BATTLEFIELD,
    2,
  );

  // Create players — both AI-controlled
  state.players.set(
    "p1",
    createPlayerState("p1", Direction.WEST, 0, "nw", true),
  );
  state.players.set(
    "p2",
    createPlayerState("p2", Direction.EAST, 0, "se", true),
  );

  // Spawn attacker units on west side
  _spawnWorldUnits(state, attacker, "p1", "west");

  // Spawn defender units on east side
  _spawnWorldUnits(state, defender, "p2", "east");

  // Skip PREP, start directly in BATTLE
  state.phase = GamePhase.BATTLE;
  state.phaseTimer = -1;

  return state;
}

/** Create a GameState for a siege battle (attacker vs city garrison + army). */
export function buildSiegeBattleState(
  attacker: WorldArmy,
  defenderArmy: WorldArmy | null,
  _city: WorldCity,
): GameState {
  // Siege uses STANDARD mode so city buildings can participate
  const state = createGameState(
    BalanceConfig.GRID_WIDTH,
    BalanceConfig.GRID_HEIGHT,
    0,
    GameMode.STANDARD,
    2,
  );

  // Both AI-controlled
  state.players.set(
    "p1",
    createPlayerState("p1", Direction.WEST, 0, "nw", true),
  );
  state.players.set(
    "p2",
    createPlayerState("p2", Direction.EAST, 0, "se", true),
  );

  // Spawn attacker on west
  _spawnWorldUnits(state, attacker, "p1", "west");

  // Spawn defender on east (garrison + field army if present)
  if (defenderArmy) {
    _spawnWorldUnits(state, defenderArmy, "p2", "east");
  }

  // Skip to BATTLE
  state.phase = GamePhase.BATTLE;
  state.phaseTimer = -1;

  return state;
}

/** Create a GameState for a battle against a neutral camp. */
export function buildCampBattleState(
  attacker: WorldArmy,
  camp: WorldCamp,
): GameState {
  const state = createGameState(
    BalanceConfig.GRID_WIDTH,
    BalanceConfig.GRID_HEIGHT,
    0,
    GameMode.BATTLEFIELD,
    2,
  );

  state.players.set(
    "p1",
    createPlayerState("p1", Direction.WEST, 0, "nw", true),
  );
  state.players.set(
    "p2",
    createPlayerState("p2", Direction.EAST, 0, "se", true),
  );

  // Spawn attacker on west
  _spawnWorldUnits(state, attacker, "p1", "west");

  // Spawn camp defenders on east using a temporary army
  const campArmy = createWorldArmy("camp_def", "neutral", camp.position, [...camp.defenders], false);
  _spawnWorldUnits(state, campArmy, "p2", "east");

  state.phase = GamePhase.BATTLE;
  state.phaseTimer = -1;

  return state;
}

// ---------------------------------------------------------------------------
// Extract results
// ---------------------------------------------------------------------------

/** Count surviving units per type after a battle ends. */
export function extractBattleResults(
  battleState: GameState,
  attackerWorldId: string,
  defenderWorldId: string,
): BattleResult {
  const p1Survivors = _countSurvivors(battleState, "p1");
  const p2Survivors = _countSurvivors(battleState, "p2");

  let winnerId: string | null = null;
  if (battleState.winnerId === "p1") {
    winnerId = attackerWorldId;
  } else if (battleState.winnerId === "p2") {
    winnerId = defenderWorldId;
  }

  return {
    winnerId,
    attackerSurvivors: p1Survivors,
    defenderSurvivors: p2Survivors,
  };
}

/** Apply battle results back to the world state. */
export function applyBattleResults(
  worldState: WorldState,
  battle: PendingBattle,
  result: BattleResult,
): void {
  const attackerArmy = worldState.armies.get(battle.attackerArmyId);
  const defenderArmy = battle.defenderArmyId
    ? worldState.armies.get(battle.defenderArmyId)
    : null;

  // Update or destroy attacker army
  if (attackerArmy) {
    if (result.attackerSurvivors.length > 0) {
      // Preserve settlers (they don't fight but survive if army wins)
      const settlers = attackerArmy.units.filter((u) => u.unitType === "settler");
      attackerArmy.units = [...result.attackerSurvivors, ...settlers];
    } else {
      _removeArmy(worldState, attackerArmy);
    }
  }

  // Update or destroy defender army
  if (defenderArmy) {
    if (result.defenderSurvivors.length > 0) {
      const settlers = defenderArmy.units.filter((u) => u.unitType === "settler");
      defenderArmy.units = [...result.defenderSurvivors, ...settlers];
    } else {
      _removeArmy(worldState, defenderArmy);
    }
  }

  // On a draw, retreat the attacker to a neighboring hex to prevent infinite re-battles
  if (!result.winnerId && attackerArmy) {
    _retreatArmy(worldState, attackerArmy);
  }

  // Handle city capture on siege victory
  if (battle.type === "siege" && battle.defenderCityId && result.winnerId) {
    const city = worldState.cities.get(battle.defenderCityId);
    if (city && result.winnerId !== city.owner) {
      const oldOwner = city.owner;
      city.owner = result.winnerId;
      city.isUnderSiege = false;

      // Transfer territory ownership
      for (const hex of city.territory) {
        const tile = worldState.grid.getTile(hex.q, hex.r);
        if (tile && tile.owner === oldOwner) {
          tile.owner = result.winnerId;
        }
      }

      // Check if old owner lost their capital → eliminate
      if (city.isCapital) {
        const oldPlayer = worldState.players.get(oldOwner);
        if (oldPlayer) {
          // Check if they have any remaining capitals
          let hasCapital = false;
          for (const c of worldState.cities.values()) {
            if (c.owner === oldOwner && c.isCapital && c.id !== city.id) {
              hasCapital = true;
              break;
            }
          }
          if (!hasCapital) {
            oldPlayer.isAlive = false;
          }
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _spawnWorldUnits(
  state: GameState,
  army: WorldArmy,
  playerId: string,
  side: "west" | "east",
): void {
  const gridW = BalanceConfig.GRID_WIDTH;
  const gridH = BalanceConfig.GRID_HEIGHT;

  // Spawn positions: west side near x=2-6, east side near x=gridW-6 to gridW-2
  const baseX = side === "west" ? 3 : gridW - 4;
  let row = Math.floor(gridH / 2) - 3;

  for (const stack of army.units) {
    // Settlers don't fight — skip them
    if (stack.unitType === "settler") continue;

    for (let i = 0; i < stack.count; i++) {
      const unit = createUnit({
        type: stack.unitType as any,
        owner: playerId as any,
        position: {
          x: baseX + (i % 3),
          y: row + Math.floor(i / 3),
        },
      });

      // Scale HP to match world army data
      if (stack.hpPerUnit < unit.maxHp) {
        unit.hp = stack.hpPerUnit;
      }

      state.units.set(unit.id, unit);
    }
    row += Math.ceil(stack.count / 3) + 1;
  }
}

function _countSurvivors(state: GameState, playerId: string): ArmyUnit[] {
  const counts = new Map<string, { count: number; totalHp: number }>();

  for (const unit of state.units.values()) {
    if (unit.owner !== playerId) continue;
    if (unit.state === UnitState.DIE) continue;
    if (unit.hp <= 0) continue;

    const key = unit.type;
    const entry = counts.get(key) ?? { count: 0, totalHp: 0 };
    entry.count++;
    entry.totalHp += unit.hp;
    counts.set(key, entry);
  }

  const result: ArmyUnit[] = [];
  for (const [unitType, data] of counts) {
    result.push({
      unitType,
      count: data.count,
      hpPerUnit: Math.ceil(data.totalHp / data.count),
    });
  }

  return result;
}

function _removeArmy(state: WorldState, army: WorldArmy): void {
  // Clear tile reference
  const tile = state.grid.getTile(army.position.q, army.position.r);
  if (tile && tile.armyId === army.id) {
    tile.armyId = null;
  }
  state.armies.delete(army.id);
}

/** Move an army to an adjacent empty hex after a draw. */
function _retreatArmy(state: WorldState, army: WorldArmy): void {
  const neighbors = hexNeighbors(army.position);
  for (const n of neighbors) {
    const tile = state.grid.getTile(n.q, n.r);
    if (!tile) continue;
    if (tile.armyId || tile.cityId) continue;
    const terrain = TERRAIN_DEFINITIONS[tile.terrain];
    if (!isFinite(terrain.movementCost)) continue;

    // Clear old tile
    const oldTile = state.grid.getTile(army.position.q, army.position.r);
    if (oldTile && oldTile.armyId === army.id) {
      oldTile.armyId = null;
    }

    // Move to neighbor
    army.position = n;
    tile.armyId = army.id;
    army.movementPoints = 0;
    return;
  }

  // No valid retreat hex — destroy the army
  _removeArmy(state, army);
}
