// ---------------------------------------------------------------------------
// Settlers – Carrier system (walking, pickup, dropoff)
// ---------------------------------------------------------------------------

import { SB } from "../config/SettlersBalance";
import { getHeightAt } from "../state/SettlersMap";
import type { SettlersState } from "../state/SettlersState";
import type { SettlersCarrier } from "../state/SettlersUnit";

export function updateCarriers(state: SettlersState, dt: number): void {
  for (const [, carrier] of state.carriers) {
    const road = state.roads.get(carrier.roadId);
    if (!road) continue;

    const flagA = state.flags.get(road.flagA);
    const flagB = state.flags.get(road.flagB);
    if (!flagA || !flagB) continue;

    const path = road.path;
    if (path.length < 2) continue;

    // Calculate total path length in tiles
    const totalLen = path.length - 1;
    const progressPerTick = (carrier.speed * dt) / (totalLen * SB.TILE_SIZE);

    // Move along path
    if (carrier.direction === 1) {
      carrier.pathProgress += progressPerTick;
    } else {
      carrier.pathProgress -= progressPerTick;
    }

    // Check if arrived at flag
    if (carrier.pathProgress >= 1) {
      carrier.pathProgress = 1;
      _arriveAtFlag(state, carrier, road.flagB, road.flagA);
    } else if (carrier.pathProgress <= 0) {
      carrier.pathProgress = 0;
      _arriveAtFlag(state, carrier, road.flagA, road.flagB);
    }

    // Interpolate world position along path
    const t = carrier.direction === 1 ? carrier.pathProgress : 1 - carrier.pathProgress;
    const exactIdx = t * (path.length - 1);
    const idx0 = Math.floor(exactIdx);
    const idx1 = Math.min(idx0 + 1, path.length - 1);
    const frac = exactIdx - idx0;

    const p0 = path[idx0];
    const p1 = path[idx1];
    const wx = ((p0.x + 0.5) * (1 - frac) + (p1.x + 0.5) * frac) * SB.TILE_SIZE;
    const wz = ((p0.z + 0.5) * (1 - frac) + (p1.z + 0.5) * frac) * SB.TILE_SIZE;
    const wy = getHeightAt(state.map, wx, wz) + SB.CARRIER_HEIGHT * 0.5;

    // Walking bob animation
    const bob = Math.sin(state.tick * 0.3) * 0.02;

    carrier.position.x = wx;
    carrier.position.y = wy + bob;
    carrier.position.z = wz;
  }
}

function _arriveAtFlag(
  state: SettlersState,
  carrier: SettlersCarrier,
  arrivedFlagId: string,
  otherFlagId: string,
): void {
  const flag = state.flags.get(arrivedFlagId);
  if (!flag) return;

  // Drop off carried resource
  if (carrier.carrying) {
    // If this flag belongs to the target building, deliver directly
    if (flag.buildingId === carrier.carryTargetBuildingId) {
      const building = state.buildings.get(flag.buildingId);
      if (building) {
        _deliverToBuilding(building, carrier.carrying);
      }
      carrier.carrying = null;
      carrier.carryTargetBuildingId = "";
    } else {
      // Drop at flag for next carrier to pick up
      if (flag.inventory.length < SB.FLAG_MAX_INVENTORY) {
        flag.inventory.push({
          type: carrier.carrying,
          targetBuildingId: carrier.carryTargetBuildingId,
          nextFlagId: "", // will be re-routed
        });
      }
      carrier.carrying = null;
      carrier.carryTargetBuildingId = "";
    }
  }

  // Pick up a resource going in the other direction
  for (let i = 0; i < flag.inventory.length; i++) {
    const item = flag.inventory[i];
    if (item.nextFlagId === otherFlagId || !item.nextFlagId) {
      carrier.carrying = item.type;
      carrier.carryTargetBuildingId = item.targetBuildingId;
      flag.inventory.splice(i, 1);
      break;
    }
  }

  // Turn around
  carrier.direction = carrier.direction === 1 ? -1 : 1;
  carrier.targetFlagId = otherFlagId;
}

function _deliverToBuilding(
  building: import("../state/SettlersBuilding").SettlersBuilding,
  resourceType: import("../config/SettlersResourceDefs").ResourceType,
): void {
  // Construction materials
  if (building.constructionProgress < 1) {
    const need = building.constructionNeeds.find((n) => n.type === resourceType && n.amount > 0);
    if (need) {
      need.amount--;
      return;
    }
  }

  // Production input
  const existing = building.inputStorage.find((s) => s.type === resourceType);
  if (existing) {
    existing.amount++;
  } else {
    building.inputStorage.push({ type: resourceType, amount: 1 });
  }
}
