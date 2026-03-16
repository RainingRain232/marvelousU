// ---------------------------------------------------------------------------
// Settlers – Enhanced AI opponent (reactive, resource-aware, difficulty)
// ---------------------------------------------------------------------------

import { SB } from "../config/SettlersBalance";
import { BUILDING_DEFS, SettlersBuildingType } from "../config/SettlersBuildingDefs";
import { ResourceType } from "../config/SettlersResourceDefs";
import { inBounds } from "../state/SettlersMap";
import type { SettlersState } from "../state/SettlersState";
import type { SettlersPlayer } from "../state/SettlersPlayer";
import { canPlaceBuilding, placeBuilding } from "./SettlersBuildingSystem";
import { createRoad } from "./SettlersRoadSystem";
import { recalculateTerritory } from "./SettlersTerritorySystem";

let _aiTimer = 0;
let _aiPhase: "economy" | "military" | "attack" = "economy";
let _phaseTicks = 0;

export function updateAI(state: SettlersState, dt: number): void {
  for (const [, player] of state.players) {
    if (!player.isAI) continue;
    if (player.defeated) continue;

    _aiTimer += dt;
    if (_aiTimer < SB.AI_TICK_INTERVAL) return;
    _aiTimer = 0;

    _phaseTicks++;
    _updatePhase(state, player);
    _aiDecision(state, player);
  }
}

// ---------------------------------------------------------------------------
// Phase management – AI shifts strategy based on game state
// ---------------------------------------------------------------------------

function _updatePhase(state: SettlersState, player: SettlersPlayer): void {
  const counts = _countBuildings(state, player.id);

  // Check if enemy is building military (reactive)
  let enemyGarrison = 0;
  let enemySoldiers = 0;
  for (const [, soldier] of state.soldiers) {
    if (soldier.owner !== player.id) enemySoldiers++;
  }
  for (const [, building] of state.buildings) {
    if (building.owner !== player.id) enemyGarrison += building.garrison.length;
  }

  const hasSawmill = (counts.get(SettlersBuildingType.SAWMILL) || 0) > 0;
  const hasQuarry = (counts.get(SettlersBuildingType.QUARRY) || 0) > 0;
  const hasBarracks = (counts.get(SettlersBuildingType.BARRACKS) || 0) > 0;

  // Count own garrison
  let ownGarrison = 0;
  for (const [, building] of state.buildings) {
    if (building.owner === player.id) ownGarrison += building.garrison.length;
  }

  // Phase transitions
  if (!hasSawmill || !hasQuarry) {
    _aiPhase = "economy";
  } else if (enemySoldiers > 4 && ownGarrison < 3) {
    // React to enemy military buildup
    _aiPhase = "military";
  } else if (ownGarrison >= 6 && _phaseTicks > 30) {
    _aiPhase = "attack";
  } else if (!hasBarracks) {
    _aiPhase = _phaseTicks > 10 ? "military" : "economy";
  } else if (_phaseTicks % 20 < 12) {
    _aiPhase = "economy";
  } else {
    _aiPhase = "military";
  }
}

// ---------------------------------------------------------------------------
// Main AI decision
// ---------------------------------------------------------------------------

function _aiDecision(state: SettlersState, player: SettlersPlayer): void {
  const counts = _countBuildings(state, player.id);
  const has = (t: SettlersBuildingType) => (counts.get(t) || 0);
  const res = (t: ResourceType) => player.storage.get(t) || 0;

  // Check if we can afford to build (resource-aware)
  const canAffordSmall = res(ResourceType.PLANKS) >= 2 && res(ResourceType.STONE) >= 2;
  const canAffordMedium = res(ResourceType.PLANKS) >= 4 && res(ResourceType.STONE) >= 3;
  const canAffordLarge = res(ResourceType.PLANKS) >= 6 && res(ResourceType.STONE) >= 5;

  function canAfford(type: SettlersBuildingType): boolean {
    const def = BUILDING_DEFS[type];
    switch (def.size) {
      case "small": return canAffordSmall;
      case "medium": return canAffordMedium;
      case "large": return canAffordLarge;
    }
  }

  // Build order depends on phase
  let buildOrder: { type: SettlersBuildingType; max: number }[];

  if (_aiPhase === "economy") {
    buildOrder = [
      { type: SettlersBuildingType.WOODCUTTER, max: 2 },
      { type: SettlersBuildingType.SAWMILL, max: 1 },
      { type: SettlersBuildingType.QUARRY, max: 1 },
      { type: SettlersBuildingType.GUARD_HOUSE, max: 1 },
      { type: SettlersBuildingType.FISHER, max: 1 },
      { type: SettlersBuildingType.FARM, max: 1 },
      { type: SettlersBuildingType.MILL, max: 1 },
      { type: SettlersBuildingType.BAKERY, max: 1 },
      { type: SettlersBuildingType.BREWERY, max: 1 },
      { type: SettlersBuildingType.COAL_MINE, max: 1 },
      { type: SettlersBuildingType.IRON_MINE, max: 1 },
      { type: SettlersBuildingType.SMELTER, max: 1 },
      { type: SettlersBuildingType.WOODCUTTER, max: 4 },
      { type: SettlersBuildingType.GUARD_HOUSE, max: 3 },
      { type: SettlersBuildingType.STOREHOUSE, max: 1 },
      { type: SettlersBuildingType.GOLD_MINE, max: 1 },
      { type: SettlersBuildingType.MINT, max: 1 },
    ];
  } else if (_aiPhase === "military") {
    buildOrder = [
      { type: SettlersBuildingType.SWORD_SMITH, max: 1 },
      { type: SettlersBuildingType.SHIELD_SMITH, max: 1 },
      { type: SettlersBuildingType.BARRACKS, max: 1 },
      { type: SettlersBuildingType.GUARD_HOUSE, max: 3 },
      { type: SettlersBuildingType.WATCHTOWER, max: 2 },
      { type: SettlersBuildingType.FORTRESS, max: 1 },
      { type: SettlersBuildingType.BARRACKS, max: 2 },
      { type: SettlersBuildingType.BREWERY, max: 2 },
      { type: SettlersBuildingType.WOODCUTTER, max: 3 },
    ];
  } else {
    // Attack phase - primarily attack, but build if nothing to attack
    _tryAttack(state, player.id);
    // Also try to send multiple soldiers
    _tryAttack(state, player.id);
    buildOrder = [
      { type: SettlersBuildingType.WATCHTOWER, max: 3 },
      { type: SettlersBuildingType.FORTRESS, max: 2 },
    ];
  }

  for (const order of buildOrder) {
    if (has(order.type) >= order.max) continue;
    if (!canAfford(order.type)) continue;

    const placed = _tryPlaceBuilding(state, player.id, order.type);
    if (placed) {
      _tryConnectRoad(state, player.id, placed);
      recalculateTerritory(state);
      return;
    }
  }

  // If nothing to build, try to attack
  if (_aiPhase !== "attack") {
    _tryAttack(state, player.id);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _countBuildings(state: SettlersState, playerId: string): Map<SettlersBuildingType, number> {
  const counts = new Map<SettlersBuildingType, number>();
  for (const [, b] of state.buildings) {
    if (b.owner !== playerId) continue;
    counts.set(b.type, (counts.get(b.type) || 0) + 1);
  }
  return counts;
}

function _tryPlaceBuilding(
  state: SettlersState,
  playerId: string,
  type: SettlersBuildingType,
): import("../state/SettlersBuilding").SettlersBuilding | null {
  const map = state.map;
  const player = state.players.get(playerId);
  if (!player) return null;
  const hq = state.buildings.get(player.hqId);
  if (!hq) return null;

  const cx = hq.tileX;
  const cz = hq.tileZ;

  for (let r = 2; r < 25; r++) {
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue;
        const tx = cx + dx;
        const tz = cz + dz;
        if (!inBounds(map, tx, tz)) continue;

        const error = canPlaceBuilding(state, type, tx, tz, playerId);
        if (!error) {
          return placeBuilding(state, type, tx, tz, playerId);
        }
      }
    }
  }

  return null;
}

function _tryConnectRoad(
  state: SettlersState,
  playerId: string,
  building: import("../state/SettlersBuilding").SettlersBuilding,
): void {
  const buildingFlag = state.flags.get(building.flagId);
  if (!buildingFlag) return;
  if (buildingFlag.connectedRoads.length > 0) return;

  let bestDist = Infinity;
  let bestFlag: import("../state/SettlersRoad").SettlersFlag | null = null;

  for (const [, flag] of state.flags) {
    if (flag.id === buildingFlag.id) continue;
    if (flag.owner !== playerId) continue;

    const dx = flag.tileX - buildingFlag.tileX;
    const dz = flag.tileZ - buildingFlag.tileZ;
    const dist = Math.abs(dx) + Math.abs(dz);

    if (dist < bestDist && dist < 15) {
      bestDist = dist;
      bestFlag = flag;
    }
  }

  if (!bestFlag) return;

  const path: { x: number; z: number }[] = [];
  let cx = buildingFlag.tileX;
  let cz = buildingFlag.tileZ;
  path.push({ x: cx, z: cz });

  while (cx !== bestFlag.tileX || cz !== bestFlag.tileZ) {
    const dx = bestFlag.tileX - cx;
    const dz = bestFlag.tileZ - cz;
    if (Math.abs(dx) > Math.abs(dz)) {
      cx += dx > 0 ? 1 : -1;
    } else {
      cz += dz > 0 ? 1 : -1;
    }
    path.push({ x: cx, z: cz });
  }

  createRoad(state, buildingFlag.id, bestFlag.id, path, playerId);
}

function _tryAttack(state: SettlersState, playerId: string): void {
  // Count total garrison strength
  let totalGarrison = 0;
  for (const [, building] of state.buildings) {
    if (building.owner !== playerId) continue;
    totalGarrison += building.garrison.length;
  }

  // More aggressive threshold based on phase
  const threshold = _aiPhase === "attack" ? 3 : 5;
  if (totalGarrison < threshold) return;

  const player = state.players.get(playerId);
  if (!player) return;
  const hq = state.buildings.get(player.hqId);
  if (!hq) return;

  // Prefer attacking weakly defended buildings first
  let bestTarget: string | null = null;
  let bestScore = -Infinity;

  for (const [, building] of state.buildings) {
    if (building.owner === playerId) continue;
    const def = BUILDING_DEFS[building.type];

    // Prioritize: low garrison, territory buildings, close distance
    const dx = building.tileX - hq.tileX;
    const dz = building.tileZ - hq.tileZ;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const garrisonCount = building.garrison.length;

    let score = 100 - dist * 2 - garrisonCount * 10;
    // Bonus for territory-projecting buildings
    if (def.territoryRadius > 0) score += 30;
    // Bonus for HQ (ultimate target)
    if (def.type === SettlersBuildingType.HEADQUARTERS) score += 50;

    if (score > bestScore) {
      bestScore = score;
      bestTarget = building.id;
    }
  }

  if (!bestTarget) return;

  // In attack phase, send multiple soldiers
  const maxSend = _aiPhase === "attack" ? 3 : 1;
  let sent = 0;

  for (const [, building] of state.buildings) {
    if (building.owner !== playerId) continue;
    if (building.garrison.length <= 1) continue;
    if (sent >= maxSend) break;

    const soldierId = building.garrison.pop()!;
    const soldier = state.soldiers.get(soldierId);
    if (soldier) {
      soldier.state = "marching";
      soldier.garrisonedIn = null;
      soldier.targetBuildingId = bestTarget;
      soldier.position = {
        x: (building.tileX + 1) * SB.TILE_SIZE,
        y: 0,
        z: (building.tileZ + 1) * SB.TILE_SIZE,
      };
      sent++;
    }
  }
}
