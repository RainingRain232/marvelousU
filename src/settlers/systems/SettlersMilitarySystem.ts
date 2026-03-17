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
import { findPath } from "./SettlersPathfinding";

// ---------------------------------------------------------------------------
// Soldier creation from Barracks
// ---------------------------------------------------------------------------

export function updateBarracks(state: SettlersState, dt: number): void {
  for (const [, building] of state.buildings) {
    if (building.type !== SettlersBuildingType.BARRACKS) continue;
    if (!building.active) continue;

    // Only produce if there are items in the queue
    if (building.productionQueue.length === 0) continue;

    const def = BUILDING_DEFS[SettlersBuildingType.BARRACKS];
    const front = building.productionQueue[0];

    // If the front item hasn't started yet, try to consume inputs
    if (front.timeRemaining < 0) {
      // Check inputs: Sword + Shield + Beer
      const hasSword = building.inputStorage.some((s) => s.type === ResourceType.SWORD && s.amount >= 1);
      const hasShield = building.inputStorage.some((s) => s.type === ResourceType.SHIELD && s.amount >= 1);
      const hasBeer = building.inputStorage.some((s) => s.type === ResourceType.BEER && s.amount >= 1);

      if (!hasSword || !hasShield || !hasBeer) continue;

      // Consume resources
      for (const s of building.inputStorage) {
        if (s.type === ResourceType.SWORD) { s.amount--; break; }
      }
      for (const s of building.inputStorage) {
        if (s.type === ResourceType.SHIELD) { s.amount--; break; }
      }
      for (const s of building.inputStorage) {
        if (s.type === ResourceType.BEER) { s.amount--; break; }
      }
      building.inputStorage = building.inputStorage.filter((s) => s.amount > 0);

      // Start production
      front.timeRemaining = def.productionTime;
    }

    // Tick the active item
    front.timeRemaining -= dt;
    if (front.timeRemaining <= 0) {
      // Remove completed item from queue
      building.productionQueue.shift();

      // Create soldier
      const id = nextId(state);
      const wx = (building.tileX + 1) * SB.TILE_SIZE;
      const wz = (building.tileZ + 2) * SB.TILE_SIZE;
      const wy = getHeightAt(state.map, wx, wz);

      const soldier: SettlersSoldier = {
        id,
        owner: building.owner,
        rank: 0,
        position: { x: wx, y: wy, z: wz },
        state: "idle",
        garrisonedIn: null,
        targetBuildingId: null,
        pathWaypoints: [],
        hp: SB.SOLDIER_BASE_HP,
        maxHp: SB.SOLDIER_BASE_HP,
        attackPower: SB.SOLDIER_BASE_ATK,
        swingTimer: 0,
      };

      state.soldiers.set(id, soldier);

      const player = state.players.get(building.owner);
      if (player) player.freeSoldiers++;
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

  const speed = SB.SOLDIER_MARCH_SPEED * SB.TILE_SIZE * dt;

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
      attacker.swingTimer = SB.SOLDIER_SWING_INTERVAL;
      const dmg = attacker.attackPower + attacker.rank * SB.SOLDIER_RANK_ATK_BONUS;
      defender.hp -= dmg;
    }

    if (defender.swingTimer <= 0) {
      defender.swingTimer = SB.SOLDIER_SWING_INTERVAL;
      const dmg = defender.attackPower + defender.rank * SB.SOLDIER_RANK_ATK_BONUS;
      attacker.hp -= dmg;
    }

    // Check death
    if (defender.hp <= 0) {
      // Attacker wins
      state.soldiers.delete(combat.defenderId);
      attacker.state = "idle";
      attacker.rank = Math.min(SB.MAX_SOLDIER_RANK, attacker.rank + 1);
      attacker.hp = SB.SOLDIER_BASE_HP + attacker.rank * SB.SOLDIER_RANK_HP_BONUS;
      attacker.maxHp = attacker.hp;
      attacker.attackPower = SB.SOLDIER_BASE_ATK + attacker.rank * SB.SOLDIER_RANK_ATK_BONUS;

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
      defender.rank = Math.min(SB.MAX_SOLDIER_RANK, defender.rank + 1);
      defender.hp = SB.SOLDIER_BASE_HP + defender.rank * SB.SOLDIER_RANK_HP_BONUS;
      defender.maxHp = defender.hp;
      defender.attackPower = SB.SOLDIER_BASE_ATK + defender.rank * SB.SOLDIER_RANK_ATK_BONUS;
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
