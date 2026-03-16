// ---------------------------------------------------------------------------
// Settlers – Road system (flag placement, road segments, goods routing)
// ---------------------------------------------------------------------------

import { SB } from "../config/SettlersBalance";
import { inBounds, tileIdx } from "../state/SettlersMap";
import type { SettlersFlag, SettlersRoadSegment } from "../state/SettlersRoad";
import type { SettlersState } from "../state/SettlersState";
import { nextId } from "../state/SettlersState";
import { BUILDING_DEFS } from "../config/SettlersBuildingDefs";
import { FOOD_TYPES, ResourceType } from "../config/SettlersResourceDefs";

// ---------------------------------------------------------------------------
// Flag placement
// ---------------------------------------------------------------------------

export function placeFlag(
  state: SettlersState,
  tileX: number,
  tileZ: number,
  owner: string,
): SettlersFlag | null {
  const map = state.map;
  if (!inBounds(map, tileX, tileZ)) return null;

  // Check territory
  const playerIdx = owner === "p0" ? 0 : 1;
  if (map.territory[tileIdx(map, tileX, tileZ)] !== playerIdx) return null;

  // Check not already a flag at this tile
  for (const [, flag] of state.flags) {
    if (flag.tileX === tileX && flag.tileZ === tileZ) return null;
  }

  const flag: SettlersFlag = {
    id: nextId(state),
    tileX,
    tileZ,
    owner,
    inventory: [],
    connectedRoads: [],
    buildingId: null,
  };

  state.flags.set(flag.id, flag);
  return flag;
}

// ---------------------------------------------------------------------------
// Road segment creation
// ---------------------------------------------------------------------------

export function createRoad(
  state: SettlersState,
  flagAId: string,
  flagBId: string,
  path: { x: number; z: number }[],
  owner: string,
): SettlersRoadSegment | null {
  const flagA = state.flags.get(flagAId);
  const flagB = state.flags.get(flagBId);
  if (!flagA || !flagB) return null;
  if (flagAId === flagBId) return null;

  // Check road doesn't already exist between these flags
  for (const roadId of flagA.connectedRoads) {
    const road = state.roads.get(roadId);
    if (road && (road.flagB === flagBId || road.flagA === flagBId)) return null;
  }

  const id = nextId(state);
  const road: SettlersRoadSegment = {
    id,
    owner,
    flagA: flagAId,
    flagB: flagBId,
    path: [...path],
    carrierId: null,
  };

  state.roads.set(id, road);
  flagA.connectedRoads.push(id);
  flagB.connectedRoads.push(id);

  // Spawn a carrier for this road segment
  spawnCarrier(state, road);

  return road;
}

// ---------------------------------------------------------------------------
// Carrier spawning
// ---------------------------------------------------------------------------

function spawnCarrier(state: SettlersState, road: SettlersRoadSegment): void {
  if (road.carrierId) return;

  const flagA = state.flags.get(road.flagA);
  if (!flagA) return;

  const id = nextId(state);
  const wx = (flagA.tileX + 0.5) * SB.TILE_SIZE;
  const wz = (flagA.tileZ + 0.5) * SB.TILE_SIZE;

  state.carriers.set(id, {
    id,
    owner: road.owner,
    roadId: road.id,
    position: { x: wx, y: 0, z: wz },
    targetFlagId: road.flagB,
    carrying: null,
    carryTargetBuildingId: "",
    pathProgress: 0,
    direction: 1,
    speed: SB.CARRIER_SPEED,
  });

  road.carrierId = id;
}

// ---------------------------------------------------------------------------
// Goods routing (Dijkstra on flag graph)
// ---------------------------------------------------------------------------

/** Find shortest flag-path from source flag to a building that needs resourceType */
export function findRoute(
  state: SettlersState,
  sourceFlagId: string,
  resourceType: ResourceType,
): { targetBuildingId: string; nextFlagId: string } | null {
  // BFS/Dijkstra to find nearest building needing this resource
  const visited = new Set<string>();
  const queue: { flagId: string; prev: Map<string, string> }[] = [
    { flagId: sourceFlagId, prev: new Map() },
  ];
  visited.add(sourceFlagId);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const flag = state.flags.get(current.flagId);
    if (!flag) continue;

    // Check if this flag's building needs the resource
    if (flag.buildingId) {
      const building = state.buildings.get(flag.buildingId);
      if (building) {
        const def = BUILDING_DEFS[building.type];

        // Check construction needs (buildings under construction are NOT active yet)
        if (building.constructionProgress < 1) {
          const needs = building.constructionNeeds.find((n) => n.type === resourceType && n.amount > 0);
          if (needs) {
            return _traceRoute(current.prev, sourceFlagId, current.flagId, building.id);
          }
        }

        // Check production inputs (only for active buildings)
        if (building.active) for (const input of def.inputs) {
          const isMine = def.type.includes("mine");
          const matches = isMine && FOOD_TYPES.has(input.type)
            ? FOOD_TYPES.has(resourceType)
            : input.type === resourceType;
          if (matches) {
            // Check if building actually needs more input
            const stored = building.inputStorage.find((s) => s.type === resourceType);
            const storedAmount = stored ? stored.amount : 0;
            if (storedAmount < input.amount * 3) {
              return _traceRoute(current.prev, sourceFlagId, current.flagId, building.id);
            }
          }
        }

        // Storehouses/HQ accept everything
        if (def.type === "headquarters" || def.type === "storehouse") {
          // Only route here as fallback (continue searching for production buildings first)
          // We'll handle this after the BFS
        }
      }
    }

    // Expand to neighboring flags via roads
    for (const roadId of flag.connectedRoads) {
      const road = state.roads.get(roadId);
      if (!road) continue;
      const neighborId = road.flagA === current.flagId ? road.flagB : road.flagA;
      if (visited.has(neighborId)) continue;
      visited.add(neighborId);
      const newPrev = new Map(current.prev);
      newPrev.set(neighborId, current.flagId);
      queue.push({ flagId: neighborId, prev: newPrev });
    }
  }

  // Fallback: route to nearest storehouse/HQ
  const visited2 = new Set<string>();
  const queue2: { flagId: string; prev: Map<string, string> }[] = [
    { flagId: sourceFlagId, prev: new Map() },
  ];
  visited2.add(sourceFlagId);

  while (queue2.length > 0) {
    const current = queue2.shift()!;
    const flag = state.flags.get(current.flagId);
    if (!flag) continue;

    if (flag.buildingId) {
      const building = state.buildings.get(flag.buildingId);
      if (building && building.active) {
        const def = BUILDING_DEFS[building.type];
        if (def.type === "headquarters" || def.type === "storehouse") {
          return _traceRoute(current.prev, sourceFlagId, current.flagId, building.id);
        }
      }
    }

    for (const roadId of flag.connectedRoads) {
      const road = state.roads.get(roadId);
      if (!road) continue;
      const neighborId = road.flagA === current.flagId ? road.flagB : road.flagA;
      if (visited2.has(neighborId)) continue;
      visited2.add(neighborId);
      const newPrev = new Map(current.prev);
      newPrev.set(neighborId, current.flagId);
      queue2.push({ flagId: neighborId, prev: newPrev });
    }
  }

  return null;
}

function _traceRoute(
  prev: Map<string, string>,
  sourceFlagId: string,
  targetFlagId: string,
  targetBuildingId: string,
): { targetBuildingId: string; nextFlagId: string } {
  // Walk backwards from target to source, find the first step
  if (targetFlagId === sourceFlagId) {
    return { targetBuildingId, nextFlagId: sourceFlagId };
  }

  let current = targetFlagId;
  while (prev.has(current)) {
    const p = prev.get(current)!;
    if (p === sourceFlagId) {
      return { targetBuildingId, nextFlagId: current };
    }
    current = p;
  }

  return { targetBuildingId, nextFlagId: targetFlagId };
}

// ---------------------------------------------------------------------------
// Route unrouted goods at flags
// ---------------------------------------------------------------------------

export function routeGoods(state: SettlersState): void {
  // Only re-route every 30 ticks (~0.5s)
  if (state.tick % 30 !== 0) return;

  // Dispatch resources from storage to flags at HQ/storehouses
  _dispatchFromStorage(state);

  for (const [, flag] of state.flags) {
    for (const item of flag.inventory) {
      if (item.targetBuildingId && item.nextFlagId) continue; // already routed

      const route = findRoute(state, flag.id, item.type);
      if (route) {
        item.targetBuildingId = route.targetBuildingId;
        item.nextFlagId = route.nextFlagId;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Dispatch resources from player storage to HQ/storehouse flags
// ---------------------------------------------------------------------------

function _dispatchFromStorage(state: SettlersState): void {
  for (const [, player] of state.players) {
    // Gather all resource demands: construction needs + production inputs
    const demands = new Map<ResourceType, number>();

    for (const [, building] of state.buildings) {
      if (building.owner !== player.id) continue;

      // Construction material needs
      if (building.constructionProgress < 1) {
        for (const need of building.constructionNeeds) {
          if (need.amount > 0) {
            demands.set(need.type, (demands.get(need.type) || 0) + need.amount);
          }
        }
      }

      // Production input needs (active buildings)
      if (building.active) {
        const def = BUILDING_DEFS[building.type];
        for (const input of def.inputs) {
          const stored = building.inputStorage.find((s) => s.type === input.type);
          const storedAmount = stored ? stored.amount : 0;
          if (storedAmount < input.amount * 3) {
            demands.set(input.type, (demands.get(input.type) || 0) + (input.amount * 3 - storedAmount));
          }
        }
      }
    }

    if (demands.size === 0) continue;

    // Find HQ and storehouse flags to dispatch from
    const dispatchFlags: SettlersFlag[] = [];
    for (const [, building] of state.buildings) {
      if (building.owner !== player.id) continue;
      if (!building.active) continue;
      const def = BUILDING_DEFS[building.type];
      if (def.type === "headquarters" || def.type === "storehouse") {
        const flag = state.flags.get(building.flagId);
        if (flag && flag.connectedRoads.length > 0) {
          dispatchFlags.push(flag);
        }
      }
    }

    // Dispatch needed resources from storage to flags
    for (const [resType, _needed] of demands) {
      const available = player.storage.get(resType) || 0;
      if (available <= 0) continue;

      // Count how many of this type are already in transit (on flags/carriers)
      let inTransit = 0;
      for (const [, flag] of state.flags) {
        for (const item of flag.inventory) {
          if (item.type === resType) inTransit++;
        }
      }
      for (const [, carrier] of state.carriers) {
        if (carrier.carrying === resType) inTransit++;
      }

      // Only dispatch up to demand minus in-transit
      const toDispatch = Math.min(available, Math.max(0, _needed - inTransit));
      if (toDispatch <= 0) continue;

      let dispatched = 0;
      for (const flag of dispatchFlags) {
        if (dispatched >= toDispatch) break;
        if (flag.inventory.length >= SB.FLAG_MAX_INVENTORY) continue;

        const space = SB.FLAG_MAX_INVENTORY - flag.inventory.length;
        const count = Math.min(space, toDispatch - dispatched);
        for (let i = 0; i < count; i++) {
          flag.inventory.push({
            type: resType,
            targetBuildingId: "",
            nextFlagId: "",
          });
          dispatched++;
        }
      }

      if (dispatched > 0) {
        player.storage.set(resType, available - dispatched);
      }
    }
  }
}
