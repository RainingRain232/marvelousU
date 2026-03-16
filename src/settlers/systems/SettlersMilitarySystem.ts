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

// ---------------------------------------------------------------------------
// Soldier creation from Barracks
// ---------------------------------------------------------------------------

export function updateBarracks(state: SettlersState, dt: number): void {
  for (const [, building] of state.buildings) {
    if (building.type !== SettlersBuildingType.BARRACKS) continue;
    if (!building.active) continue;

    const def = BUILDING_DEFS[SettlersBuildingType.BARRACKS];

    // Check inputs: Sword + Shield + Beer
    const hasSword = building.inputStorage.some((s) => s.type === ResourceType.SWORD && s.amount >= 1);
    const hasShield = building.inputStorage.some((s) => s.type === ResourceType.SHIELD && s.amount >= 1);
    const hasBeer = building.inputStorage.some((s) => s.type === ResourceType.BEER && s.amount >= 1);

    if (!hasSword || !hasShield || !hasBeer) continue;

    building.productionTimer -= dt;
    if (building.productionTimer <= 0) {
      building.productionTimer = def.productionTime;

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

// ---------------------------------------------------------------------------
// Auto-garrison: idle soldiers seek nearest military building with space
// ---------------------------------------------------------------------------

export function updateGarrisoning(state: SettlersState, dt: number): void {
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

      // March toward building
      soldier.state = "marching";
      soldier.targetBuildingId = bestBuildingId;

      // Move toward target
      const dx = bx - soldier.position.x;
      const dz = bz - soldier.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < SB.TILE_SIZE) {
        // Arrived – garrison
        soldier.state = "garrisoned";
        soldier.garrisonedIn = bestBuildingId;
        building.garrison.push(soldier.id);
        const player = state.players.get(soldier.owner);
        if (player) player.freeSoldiers = Math.max(0, player.freeSoldiers - 1);
      } else {
        const speed = SB.SOLDIER_MARCH_SPEED * SB.TILE_SIZE * dt;
        soldier.position.x += (dx / dist) * speed;
        soldier.position.z += (dz / dist) * speed;
        soldier.position.y = getHeightAt(state.map, soldier.position.x, soldier.position.z);
      }
    }
  }

  // Also move marching soldiers
  for (const [, soldier] of state.soldiers) {
    if (soldier.state !== "marching" || !soldier.targetBuildingId) continue;
    if (soldier.garrisonedIn) continue;

    const building = state.buildings.get(soldier.targetBuildingId);
    if (!building) {
      soldier.state = "idle";
      soldier.targetBuildingId = null;
      continue;
    }

    const bx = (building.tileX + 1) * SB.TILE_SIZE;
    const bz = (building.tileZ + 1) * SB.TILE_SIZE;
    const dx = bx - soldier.position.x;
    const dz = bz - soldier.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < SB.TILE_SIZE) {
      if (building.owner === soldier.owner) {
        // Garrison
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
          // Building undefended – capture it!
          _captureBuilding(state, building, soldier.owner);
          soldier.state = "idle";
          soldier.targetBuildingId = null;
        }
      }
    } else {
      const speed = SB.SOLDIER_MARCH_SPEED * SB.TILE_SIZE * dt;
      soldier.position.x += (dx / dist) * speed;
      soldier.position.z += (dz / dist) * speed;
      soldier.position.y = getHeightAt(state.map, soldier.position.x, soldier.position.z);
    }
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
}
