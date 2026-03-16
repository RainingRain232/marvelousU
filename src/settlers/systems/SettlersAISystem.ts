// ---------------------------------------------------------------------------
// Settlers – AI opponent
// ---------------------------------------------------------------------------

import { SB } from "../config/SettlersBalance";
import { BUILDING_DEFS, SettlersBuildingType } from "../config/SettlersBuildingDefs";
import { inBounds } from "../state/SettlersMap";
import type { SettlersState } from "../state/SettlersState";
import { canPlaceBuilding, placeBuilding } from "./SettlersBuildingSystem";
import { createRoad } from "./SettlersRoadSystem";

let _aiTimer = 0;

export function updateAI(state: SettlersState, dt: number): void {
  // Only run for AI players
  for (const [, player] of state.players) {
    if (!player.isAI) continue;
    if (player.defeated) continue;

    _aiTimer += dt;
    if (_aiTimer < SB.AI_TICK_INTERVAL) return;
    _aiTimer = 0;

    _aiDecision(state, player.id);
  }
}

function _aiDecision(state: SettlersState, playerId: string): void {
  // Count buildings by type
  const counts = new Map<SettlersBuildingType, number>();
  for (const [, b] of state.buildings) {
    if (b.owner !== playerId) continue;
    counts.set(b.type, (counts.get(b.type) || 0) + 1);
  }

  const has = (t: SettlersBuildingType) => (counts.get(t) || 0);

  // Build order priority
  const buildOrder: { type: SettlersBuildingType; max: number }[] = [
    { type: SettlersBuildingType.WOODCUTTER, max: 2 },
    { type: SettlersBuildingType.SAWMILL, max: 1 },
    { type: SettlersBuildingType.QUARRY, max: 1 },
    { type: SettlersBuildingType.GUARD_HOUSE, max: 2 },
    { type: SettlersBuildingType.FISHER, max: 1 },
    { type: SettlersBuildingType.FARM, max: 1 },
    { type: SettlersBuildingType.MILL, max: 1 },
    { type: SettlersBuildingType.BAKERY, max: 1 },
    { type: SettlersBuildingType.COAL_MINE, max: 1 },
    { type: SettlersBuildingType.IRON_MINE, max: 1 },
    { type: SettlersBuildingType.SMELTER, max: 1 },
    { type: SettlersBuildingType.SWORD_SMITH, max: 1 },
    { type: SettlersBuildingType.SHIELD_SMITH, max: 1 },
    { type: SettlersBuildingType.BREWERY, max: 1 },
    { type: SettlersBuildingType.BARRACKS, max: 1 },
    { type: SettlersBuildingType.WATCHTOWER, max: 2 },
    { type: SettlersBuildingType.WOODCUTTER, max: 4 },
    { type: SettlersBuildingType.FORTRESS, max: 1 },
  ];

  for (const order of buildOrder) {
    if (has(order.type) >= order.max) continue;

    const placed = _tryPlaceBuilding(state, playerId, order.type);
    if (placed) {
      // Try to connect with a road
      _tryConnectRoad(state, playerId, placed);
      return; // one action per AI tick
    }
  }

  // If nothing to build, try to attack
  _tryAttack(state, playerId);
}

function _tryPlaceBuilding(
  state: SettlersState,
  playerId: string,
  type: SettlersBuildingType,
): import("../state/SettlersBuilding").SettlersBuilding | null {
  const map = state.map;

  // Find the HQ position as center
  const player = state.players.get(playerId);
  if (!player) return null;
  const hq = state.buildings.get(player.hqId);
  if (!hq) return null;

  // Spiral search outward from HQ
  const cx = hq.tileX;
  const cz = hq.tileZ;

  for (let r = 2; r < 20; r++) {
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue; // only perimeter
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

  // Already connected?
  if (buildingFlag.connectedRoads.length > 0) return;

  // Find nearest flag that isn't this one
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

  // Simple straight-line path
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
  // Count total garrison
  let totalGarrison = 0;
  for (const [, building] of state.buildings) {
    if (building.owner !== playerId) continue;
    totalGarrison += building.garrison.length;
  }

  if (totalGarrison < 4) return; // not enough soldiers

  // Find closest enemy military building
  const player = state.players.get(playerId);
  if (!player) return;
  const hq = state.buildings.get(player.hqId);
  if (!hq) return;

  let bestTarget: string | null = null;
  let bestDist = Infinity;

  for (const [, building] of state.buildings) {
    if (building.owner === playerId) continue;
    const def = BUILDING_DEFS[building.type];
    if (def.territoryRadius <= 0) continue;

    const dx = building.tileX - hq.tileX;
    const dz = building.tileZ - hq.tileZ;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < bestDist) {
      bestDist = dist;
      bestTarget = building.id;
    }
  }

  if (!bestTarget) return;

  // Send the closest garrisoned soldier to attack
  for (const [, building] of state.buildings) {
    if (building.owner !== playerId) continue;
    if (building.garrison.length <= 1) continue; // keep at least 1

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
      return; // one attack per tick
    }
  }
}
