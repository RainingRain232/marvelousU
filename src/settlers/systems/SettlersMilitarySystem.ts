// ---------------------------------------------------------------------------
// Settlers – Military system (soldiers, garrisoning, combat)
// ---------------------------------------------------------------------------

import { SB } from "../config/SettlersBalance";
import { BUILDING_DEFS, SettlersBuildingType } from "../config/SettlersBuildingDefs";
import { ResourceType } from "../config/SettlersResourceDefs";
import { getHeightAt } from "../state/SettlersMap";
import type { SettlersState } from "../state/SettlersState";
import { nextId } from "../state/SettlersState";
import type { SettlersSoldier } from "../state/SettlersUnit";
import type { SoldierType } from "../state/SettlersUnit";
import { findPath } from "./SettlersPathfinding";

// ---------------------------------------------------------------------------
// Helper: get base stats for a unit type
// ---------------------------------------------------------------------------

function _baseStats(unitType: SoldierType): {
  hp: number; atk: number; swing: number; speed: number; range: number;
} {
  switch (unitType) {
    case "archer":
      return {
        hp: SB.ARCHER_BASE_HP,
        atk: SB.ARCHER_BASE_ATK,
        swing: SB.ARCHER_SWING_INTERVAL,
        speed: SB.ARCHER_MARCH_SPEED,
        range: SB.ARCHER_RANGE,
      };
    case "knight":
      return {
        hp: SB.KNIGHT_BASE_HP,
        atk: SB.KNIGHT_BASE_ATK,
        swing: SB.KNIGHT_SWING_INTERVAL,
        speed: SB.KNIGHT_MARCH_SPEED,
        range: 1,
      };
    default: // swordsman
      return {
        hp: SB.SOLDIER_BASE_HP,
        atk: SB.SOLDIER_BASE_ATK,
        swing: SB.SOLDIER_SWING_INTERVAL,
        speed: SB.SOLDIER_MARCH_SPEED,
        range: 1,
      };
  }
}

// ---------------------------------------------------------------------------
// Helper: consume building inputs and start production
// ---------------------------------------------------------------------------

function _tryConsumeInputs(
  building: import("../state/SettlersBuilding").SettlersBuilding,
  required: { type: ResourceType; amount: number }[],
): boolean {
  // Check all required resources
  for (const req of required) {
    const stored = building.inputStorage.find((s) => s.type === req.type);
    if (!stored || stored.amount < req.amount) return false;
  }
  // Consume
  for (const req of required) {
    for (const s of building.inputStorage) {
      if (s.type === req.type) { s.amount -= req.amount; break; }
    }
  }
  building.inputStorage = building.inputStorage.filter((s) => s.amount > 0);
  return true;
}

// ---------------------------------------------------------------------------
// Helper: spawn a soldier at a building's exit
// ---------------------------------------------------------------------------

function _spawnSoldier(
  state: SettlersState,
  building: import("../state/SettlersBuilding").SettlersBuilding,
  unitType: SoldierType,
): void {
  const id = nextId(state);
  const def = BUILDING_DEFS[building.type];
  const wx = (building.tileX + Math.floor(def.footprint.w / 2)) * SB.TILE_SIZE;
  const wz = (building.tileZ + def.footprint.h) * SB.TILE_SIZE;
  const wy = getHeightAt(state.map, wx, wz);

  const stats = _baseStats(unitType);

  const soldier: SettlersSoldier = {
    id,
    owner: building.owner,
    rank: 0,
    unitType,
    position: { x: wx, y: wy, z: wz },
    state: "idle",
    garrisonedIn: null,
    targetBuildingId: null,
    pathWaypoints: [],
    hp: stats.hp,
    maxHp: stats.hp,
    attackPower: stats.atk,
    swingTimer: 0,
    attackRange: stats.range,
    moveSpeed: stats.speed,
  };

  state.soldiers.set(id, soldier);

  const player = state.players.get(building.owner);
  if (player) player.freeSoldiers++;
}

// ---------------------------------------------------------------------------
// Generic unit-producing building tick
// ---------------------------------------------------------------------------

function _tickUnitProducer(
  state: SettlersState,
  building: import("../state/SettlersBuilding").SettlersBuilding,
  dt: number,
  unitType: SoldierType,
): void {
  if (!building.active) return;
  if (building.productionQueue.length === 0) return;

  const def = BUILDING_DEFS[building.type];
  const front = building.productionQueue[0];

  // If the front item hasn't started yet, try to consume inputs
  if (front.timeRemaining < 0) {
    const required = def.inputs.map((i) => ({ type: i.type, amount: i.amount }));
    if (!_tryConsumeInputs(building, required)) return;
    front.timeRemaining = def.productionTime;
  }

  // Tick the active item
  front.timeRemaining -= dt;
  if (front.timeRemaining <= 0) {
    building.productionQueue.shift();
    _spawnSoldier(state, building, unitType);
  }
}

// ---------------------------------------------------------------------------
// Soldier creation from Barracks / Archery Range / Stable
// ---------------------------------------------------------------------------

export function updateBarracks(state: SettlersState, dt: number): void {
  for (const [, building] of state.buildings) {
    if (building.type === SettlersBuildingType.BARRACKS) {
      _tickUnitProducer(state, building, dt, "swordsman");
    } else if (building.type === SettlersBuildingType.ARCHERY_RANGE) {
      _tickUnitProducer(state, building, dt, "archer");
    } else if (building.type === SettlersBuildingType.STABLE) {
      _tickUnitProducer(state, building, dt, "knight");
    }
  }
}

/**
 * Add a production item to a building's queue.
 * Returns true if successfully added, false if queue is full.
 */
export function addToProductionQueue(
  building: import("../state/SettlersBuilding").SettlersBuilding,
  itemType: string,
): boolean {
  if (building.productionQueue.length >= SB.MAX_PRODUCTION_QUEUE) return false;
  building.productionQueue.push({ type: itemType, timeRemaining: -1 });
  return true;
}

/**
 * Remove a production item from a building's queue by index.
 * Cannot remove the first item if it's already in progress (timeRemaining >= 0).
 * Returns true if successfully removed.
 */
export function removeFromProductionQueue(
  building: import("../state/SettlersBuilding").SettlersBuilding,
  index: number,
): boolean {
  if (index < 0 || index >= building.productionQueue.length) return false;
  // Cannot cancel the front item once production has started (resources already consumed)
  if (index === 0 && building.productionQueue[0].timeRemaining >= 0) return false;
  building.productionQueue.splice(index, 1);
  return true;
}

// ---------------------------------------------------------------------------
// Catapult tower: deals AOE damage to nearest enemy in range
// ---------------------------------------------------------------------------

export function updateCatapultTowers(state: SettlersState, dt: number): void {
  for (const [, building] of state.buildings) {
    if (building.type !== SettlersBuildingType.CATAPULT_TOWER) continue;
    if (!building.active) continue;
    if (building.garrison.length === 0) continue; // needs garrison to operate

    const bx = (building.tileX + 1) * SB.TILE_SIZE;
    const bz = (building.tileZ + 1) * SB.TILE_SIZE;
    const range = SB.CATAPULT_TOWER_RANGE * SB.TILE_SIZE;

    // Find nearest enemy soldier in range
    let nearestEnemy: SettlersSoldier | null = null;
    let nearestDist = Infinity;

    for (const [, soldier] of state.soldiers) {
      if (soldier.owner === building.owner) continue;
      if (soldier.state === "garrisoned") continue;
      const dx = soldier.position.x - bx;
      const dz = soldier.position.z - bz;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist <= range && dist < nearestDist) {
        nearestDist = dist;
        nearestEnemy = soldier;
      }
    }

    if (nearestEnemy) {
      nearestEnemy.hp -= SB.CATAPULT_TOWER_DAMAGE * dt;
      if (nearestEnemy.hp <= 0) {
        state.soldiers.delete(nearestEnemy.id);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Auto-garrison: idle soldiers seek nearest military building with space
// ---------------------------------------------------------------------------

export function updateGarrisoning(state: SettlersState, dt: number): void {
  // Idle soldiers pick a garrison target and compute an A* path
  for (const [, soldier] of state.soldiers) {
    if (soldier.state !== "idle") continue;

    // Find nearest military building with open garrison slots
    let bestDist = Infinity;
    let bestBuildingId: string | null = null;

    for (const [, building] of state.buildings) {
      if (building.owner !== soldier.owner) continue;
      if (!building.active) continue;
      const def = BUILDING_DEFS[building.type];
      if (def.garrisonSlots <= 0) continue;
      if (building.garrison.length >= def.garrisonSlots) continue;

      const bx = (building.tileX + 1) * SB.TILE_SIZE;
      const bz = (building.tileZ + 1) * SB.TILE_SIZE;
      const dx = soldier.position.x - bx;
      const dz = soldier.position.z - bz;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < bestDist) {
        bestDist = dist;
        bestBuildingId = building.id;
      }
    }

    if (bestBuildingId) {
      const building = state.buildings.get(bestBuildingId)!;
      const bx = (building.tileX + 1) * SB.TILE_SIZE;
      const bz = (building.tileZ + 1) * SB.TILE_SIZE;

      soldier.state = "marching";
      soldier.targetBuildingId = bestBuildingId;
      soldier.pathWaypoints = findPath(
        state.map,
        soldier.position.x, soldier.position.z,
        bx, bz,
      );
    }
  }

  // Move marching soldiers along their waypoint paths
  for (const [, soldier] of state.soldiers) {
    if (soldier.state !== "marching" || !soldier.targetBuildingId) continue;
    if (soldier.garrisonedIn) continue;

    const building = state.buildings.get(soldier.targetBuildingId);
    if (!building) {
      soldier.state = "idle";
      soldier.targetBuildingId = null;
      soldier.pathWaypoints = [];
      continue;
    }

    // If no waypoints remain, recalculate path
    if (soldier.pathWaypoints.length === 0) {
      const bx = (building.tileX + 1) * SB.TILE_SIZE;
      const bz = (building.tileZ + 1) * SB.TILE_SIZE;
      soldier.pathWaypoints = findPath(
        state.map,
        soldier.position.x, soldier.position.z,
        bx, bz,
      );
      if (soldier.pathWaypoints.length === 0) continue;
    }

    // Check distance to final destination (building center)
    const bx = (building.tileX + 1) * SB.TILE_SIZE;
    const bz = (building.tileZ + 1) * SB.TILE_SIZE;
    const dxFinal = bx - soldier.position.x;
    const dzFinal = bz - soldier.position.z;
    const distFinal = Math.sqrt(dxFinal * dxFinal + dzFinal * dzFinal);

    if (distFinal < SB.TILE_SIZE) {
      // Arrived at target building
      soldier.pathWaypoints = [];
      if (building.owner === soldier.owner) {
        const def = BUILDING_DEFS[building.type];
        if (building.garrison.length < def.garrisonSlots) {
          soldier.state = "garrisoned";
          soldier.garrisonedIn = building.id;
          building.garrison.push(soldier.id);
          const player = state.players.get(soldier.owner);
          if (player) player.freeSoldiers = Math.max(0, player.freeSoldiers - 1);
        } else {
          soldier.state = "idle";
          soldier.targetBuildingId = null;
        }
      } else {
        // Initiate combat – pull a defender from the building
        if (building.garrison.length > 0) {
          const defenderId = building.garrison.pop()!;
          const defender = state.soldiers.get(defenderId);
          if (defender) {
            defender.state = "fighting";
            defender.garrisonedIn = null;
            defender.position = { ...soldier.position };
            soldier.state = "fighting";

            state.combats.push({
              attackerId: soldier.id,
              defenderId: defender.id,
              buildingId: building.id,
              position: { ...soldier.position },
            });
          }
        } else {
          _captureBuilding(state, building, soldier.owner);
          soldier.state = "idle";
          soldier.targetBuildingId = null;
        }
      }
    } else {
      // Follow waypoints
      _followWaypoints(state, soldier, dt);
    }
  }
}

/** Move soldier toward current waypoint, advancing to next when reached */
function _followWaypoints(state: SettlersState, soldier: SettlersSoldier, dt: number): void {
  if (soldier.pathWaypoints.length === 0) return;

  const wp = soldier.pathWaypoints[0];
  const dx = wp.x - soldier.position.x;
  const dz = wp.z - soldier.position.z;
  const dist = Math.sqrt(dx * dx + dz * dz);

  const speed = (soldier.moveSpeed ?? SB.SOLDIER_MARCH_SPEED) * SB.TILE_SIZE * dt;

  if (dist < speed || dist < 0.1) {
    // Reached this waypoint, advance to next
    soldier.position.x = wp.x;
    soldier.position.z = wp.z;
    soldier.position.y = getHeightAt(state.map, wp.x, wp.z);
    soldier.pathWaypoints.shift();
  } else {
    soldier.position.x += (dx / dist) * speed;
    soldier.position.z += (dz / dist) * speed;
    soldier.position.y = getHeightAt(state.map, soldier.position.x, soldier.position.z);
  }
}

// ---------------------------------------------------------------------------
// Combat resolution
// ---------------------------------------------------------------------------

/** Get the swing interval for a soldier based on their unit type */
function _swingInterval(soldier: SettlersSoldier): number {
  const stats = _baseStats(soldier.unitType);
  return stats.swing;
}

/** Rank up a soldier after winning a fight, preserving unit-type-specific stats */
function _rankUp(soldier: SettlersSoldier): void {
  soldier.rank = Math.min(SB.MAX_SOLDIER_RANK, soldier.rank + 1);
  const stats = _baseStats(soldier.unitType);
  soldier.hp = stats.hp + soldier.rank * SB.SOLDIER_RANK_HP_BONUS;
  soldier.maxHp = soldier.hp;
  soldier.attackPower = stats.atk + soldier.rank * SB.SOLDIER_RANK_ATK_BONUS;
}

export function updateCombat(state: SettlersState, dt: number): void {
  const finishedCombats: number[] = [];

  for (let i = 0; i < state.combats.length; i++) {
    const combat = state.combats[i];
    const attacker = state.soldiers.get(combat.attackerId);
    const defender = state.soldiers.get(combat.defenderId);

    if (!attacker || !defender) {
      finishedCombats.push(i);
      continue;
    }

    // Both swing on timers
    attacker.swingTimer -= dt;
    defender.swingTimer -= dt;

    if (attacker.swingTimer <= 0) {
      attacker.swingTimer = _swingInterval(attacker);
      const dmg = attacker.attackPower + attacker.rank * SB.SOLDIER_RANK_ATK_BONUS;
      defender.hp -= dmg;
    }

    if (defender.swingTimer <= 0) {
      defender.swingTimer = _swingInterval(defender);
      const dmg = defender.attackPower + defender.rank * SB.SOLDIER_RANK_ATK_BONUS;
      attacker.hp -= dmg;
    }

    // Check death
    if (defender.hp <= 0) {
      // Attacker wins
      state.soldiers.delete(combat.defenderId);
      attacker.state = "idle";
      _rankUp(attacker);

      // Check if building is now empty
      const building = state.buildings.get(combat.buildingId);
      if (building && building.garrison.length === 0 && building.owner !== attacker.owner) {
        _captureBuilding(state, building, attacker.owner);
      }

      finishedCombats.push(i);
    } else if (attacker.hp <= 0) {
      // Defender wins
      state.soldiers.delete(combat.attackerId);
      defender.state = "idle";
      _rankUp(defender);
      finishedCombats.push(i);
    }
  }

  // Remove finished combats (reverse order)
  for (let i = finishedCombats.length - 1; i >= 0; i--) {
    state.combats.splice(finishedCombats[i], 1);
  }
}

// ---------------------------------------------------------------------------
// Building capture
// ---------------------------------------------------------------------------

function _captureBuilding(
  state: SettlersState,
  building: import("../state/SettlersBuilding").SettlersBuilding,
  newOwner: string,
): void {
  building.owner = newOwner;
  building.garrison = [];

  // Mark territory as dirty when a building is captured
  state.territoryDirty = true;
  state.fogDirty = true;

  // Update flag ownership
  const flag = state.flags.get(building.flagId);
  if (flag) {
    flag.owner = newOwner;
    flag.inventory = [];
  }

  // Check win condition: if this was the enemy HQ
  if (building.type === SettlersBuildingType.HEADQUARTERS) {
    // Find the defeated player
    for (const [, player] of state.players) {
      if (player.hqId === building.id && player.id !== newOwner) {
        player.defeated = true;
      }
    }

    // Check if all non-current players are defeated
    let allDefeated = true;
    for (const [, player] of state.players) {
      if (player.id !== "p0" && !player.defeated) {
        allDefeated = false;
      }
    }
    if (allDefeated) {
      state.gameOver = true;
      state.winner = "p0";
    }
  }
}

// ---------------------------------------------------------------------------
// Win condition check
// ---------------------------------------------------------------------------

export function checkWinCondition(state: SettlersState): void {
  for (const [, player] of state.players) {
    if (player.defeated) continue;

    // Check if player has any military buildings left
    let hasMilitary = false;
    for (const [, building] of state.buildings) {
      if (building.owner !== player.id) continue;
      const def = BUILDING_DEFS[building.type];
      if (def.territoryRadius > 0) {
        hasMilitary = true;
        break;
      }
    }

    if (!hasMilitary) {
      player.defeated = true;
    }
  }

  // Check if human player lost
  const humanPlayer = state.players.get("p0");
  if (humanPlayer?.defeated) {
    state.gameOver = true;
    state.winner = "p1";
  }

  // Economic victory: accumulate 50 gold
  if (!state.gameOver) {
    for (const [, player] of state.players) {
      if (player.defeated) continue;
      const gold = player.storage.get(ResourceType.GOLD) || 0;
      if (gold >= 50) {
        state.gameOver = true;
        state.winner = player.id;
        return;
      }
    }
  }

  // Territory dominance: control > 70% of buildable land
  if (!state.gameOver) {
    const map = state.map;
    const total = map.width * map.height;
    const counts = new Map<number, number>();
    let buildableTiles = 0;
    for (let i = 0; i < total; i++) {
      if (map.buildable[i] === 0) continue;
      buildableTiles++;
      const owner = map.territory[i];
      if (owner >= 0) {
        counts.set(owner, (counts.get(owner) || 0) + 1);
      }
    }
    if (buildableTiles > 0) {
      for (const [ownerIdx, count] of counts) {
        if (count / buildableTiles > 0.7) {
          const playerId = ownerIdx === 0 ? "p0" : "p1";
          state.gameOver = true;
          state.winner = playerId;
          return;
        }
      }
    }
  }
}

/** Calculate a player's score (for display in HUD) */
export function calculateScore(state: SettlersState, playerId: string): number {
  let score = 0;
  const player = state.players.get(playerId);
  if (!player) return 0;

  // Buildings built
  for (const [, building] of state.buildings) {
    if (building.owner !== playerId) continue;
    if (building.constructionProgress < 1) continue;
    const def = BUILDING_DEFS[building.type];
    score += def.size === "large" ? 30 : def.size === "medium" ? 20 : 10;
    if (def.territoryRadius > 0) score += 15;
  }

  // Resources stored
  for (const [, amount] of player.storage) {
    score += amount;
  }

  // Territory controlled
  const map = state.map;
  const playerIdx = playerId === "p0" ? 0 : 1;
  for (let i = 0; i < map.width * map.height; i++) {
    if (map.territory[i] === playerIdx) score += 1;
  }

  // Soldiers
  for (const [, soldier] of state.soldiers) {
    if (soldier.owner === playerId) {
      score += 10 + soldier.rank * 5;
    }
  }

  // Gold is worth extra
  const gold = player.storage.get(ResourceType.GOLD) || 0;
  score += gold * 5;

  return score;
}
