// ---------------------------------------------------------------------------
// Settlers – Building system (placement, construction, production)
// ---------------------------------------------------------------------------

import { SB } from "../config/SettlersBalance";
import { BUILDING_DEFS, SettlersBuildingType } from "../config/SettlersBuildingDefs";
import { FOOD_TYPES } from "../config/SettlersResourceDefs";
import { Biome, inBounds, tileIdx } from "../state/SettlersMap";
import type { SettlersBuilding } from "../state/SettlersBuilding";
import type { SettlersState } from "../state/SettlersState";
import { nextId } from "../state/SettlersState";
import type { SettlersFlag } from "../state/SettlersRoad";
import { playResourceCollected } from "./SettlersAudioSystem";

// ---------------------------------------------------------------------------
// Placement validation
// ---------------------------------------------------------------------------

export function canPlaceBuilding(
  state: SettlersState,
  type: SettlersBuildingType,
  tileX: number,
  tileZ: number,
  owner: string,
): string | null {
  const def = BUILDING_DEFS[type];
  const map = state.map;

  // Check all tiles of the footprint
  for (let dz = 0; dz < def.footprint.h; dz++) {
    for (let dx = 0; dx < def.footprint.w; dx++) {
      const tx = tileX + dx;
      const tz = tileZ + dz;

      if (!inBounds(map, tx, tz)) return "Out of bounds";

      const idx = tileIdx(map, tx, tz);

      // Territory check
      const player = state.players.get(owner);
      if (!player) return "Invalid player";
      const playerIdx = owner === "p0" ? 0 : 1;
      if (map.territory[idx] !== playerIdx) return "Not in your territory";

      // Occupied check
      if (map.occupied[idx] !== "") return "Tile occupied";

      // Buildability check
      const sizeNum = def.size === "small" ? 1 : def.size === "medium" ? 2 : 3;
      if (map.buildable[idx] < sizeNum) return "Terrain too steep";

      // Biome/terrain requirement
      if (def.requiresTerrain) {
        const needed = def.requiresTerrain;
        // At least one tile should match (we check the first tile)
        if (dx === 0 && dz === 0) {
          // Check adjacent tiles for terrain requirement
          let found = false;
          for (let az = -2; az <= def.footprint.h + 1 && !found; az++) {
            for (let ax = -2; ax <= def.footprint.w + 1 && !found; ax++) {
              const ntx = tileX + ax;
              const ntz = tileZ + az;
              if (!inBounds(map, ntx, ntz)) continue;
              const nBiome = map.biomes[tileIdx(map, ntx, ntz)];
              if (
                (needed === "forest" && nBiome === Biome.FOREST) ||
                (needed === "mountain" && nBiome === Biome.MOUNTAIN) ||
                (needed === "water" && nBiome === Biome.WATER) ||
                (needed === "meadow" && nBiome === Biome.MEADOW)
              ) {
                found = true;
              }
            }
          }
          if (!found) return `Requires ${needed} nearby`;
        }
      }
    }
  }

  return null; // placement is valid
}

// ---------------------------------------------------------------------------
// Place a building
// ---------------------------------------------------------------------------

export function placeBuilding(
  state: SettlersState,
  type: SettlersBuildingType,
  tileX: number,
  tileZ: number,
  owner: string,
  preBuilt: boolean = false,
): SettlersBuilding | null {
  const error = canPlaceBuilding(state, type, tileX, tileZ, owner);
  if (error && !preBuilt) return null;

  const def = BUILDING_DEFS[type];
  const id = nextId(state);

  // Create flag at building entrance (bottom-center)
  const flagX = tileX + Math.floor(def.footprint.w / 2);
  const flagZ = tileZ + def.footprint.h; // just below the building
  const flagId = nextId(state);
  const flag: SettlersFlag = {
    id: flagId,
    tileX: flagX,
    tileZ: Math.min(flagZ, state.map.height - 1),
    owner,
    inventory: [],
    connectedRoads: [],
    buildingId: id,
  };
  state.flags.set(flagId, flag);

  const building: SettlersBuilding = {
    id,
    type,
    owner,
    tileX,
    tileZ,
    constructionProgress: preBuilt ? 1 : 0,
    constructionNeeds: preBuilt ? [] : [...def.constructionCost.map((c) => ({ ...c }))],
    active: preBuilt,
    workerId: null,
    productionTimer: def.productionTime,
    inputStorage: [],
    outputStorage: [],
    garrisonSlots: def.garrisonSlots,
    garrison: [],
    hp: preBuilt ? def.hp : def.hp,
    maxHp: def.hp,
    flagId,
    productionQueue: [],
  };

  state.buildings.set(id, building);

  // Mark territory as dirty when a building is placed
  state.territoryDirty = true;

  // Mark tiles as occupied
  for (let dz = 0; dz < def.footprint.h; dz++) {
    for (let dx = 0; dx < def.footprint.w; dx++) {
      const idx = tileIdx(state.map, tileX + dx, tileZ + dz);
      state.map.occupied[idx] = id;
    }
  }

  // Remove trees in footprint area
  const ts = state.map.tileSize;
  const minX = tileX * ts;
  const maxX = (tileX + def.footprint.w) * ts;
  const minZ = tileZ * ts;
  const maxZ = (tileZ + def.footprint.h) * ts;
  state.map.trees = state.map.trees.filter(
    (t) => t.x < minX || t.x > maxX || t.z < minZ || t.z > maxZ,
  );

  return building;
}

// ---------------------------------------------------------------------------
// Construction tick – deliver materials and advance progress
// ---------------------------------------------------------------------------

export function updateConstruction(state: SettlersState, dt: number): void {
  for (const [, building] of state.buildings) {
    if (building.constructionProgress >= 1) continue;

    // Check if all construction materials have been delivered
    const allDelivered = building.constructionNeeds.every((n) => n.amount <= 0);
    if (allDelivered) {
      // Advance construction progress
      building.constructionProgress += dt * 0.2; // ~5 seconds to build
      if (building.constructionProgress >= 1) {
        building.constructionProgress = 1;
        building.active = true;

        // Territory may change when a military building finishes construction
        state.territoryDirty = true;

        // Assign a worker if available (for production buildings)
        const def = BUILDING_DEFS[building.type];
        if (def.productionTime > 0 || def.garrisonSlots === 0) {
          const player = state.players.get(building.owner);
          if (player && player.availableWorkers > 0) {
            player.availableWorkers--;
            building.workerId = "worker";
          }
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Production tick – consume inputs, produce outputs
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Demolish a building – refund partial resources, free workers, clear tiles
// ---------------------------------------------------------------------------

export function demolishBuilding(state: SettlersState, buildingId: string): boolean {
  const building = state.buildings.get(buildingId);
  if (!building) return false;

  const def = BUILDING_DEFS[building.type];

  // Can't demolish HQ
  if (def.type === SettlersBuildingType.HEADQUARTERS) return false;

  const player = state.players.get(building.owner);

  // Refund 50% of construction cost
  if (player) {
    for (const cost of def.constructionCost) {
      const refund = Math.floor(cost.amount * 0.5);
      if (refund > 0) {
        player.storage.set(cost.type, (player.storage.get(cost.type) || 0) + refund);
      }
    }

    // Return worker
    if (building.workerId) {
      player.availableWorkers++;
    }
  }

  // Evict garrisoned soldiers
  for (const soldierId of building.garrison) {
    const soldier = state.soldiers.get(soldierId);
    if (soldier) {
      soldier.state = "idle";
      soldier.garrisonedIn = null;
      soldier.position = {
        x: (building.tileX + 1) * SB.TILE_SIZE,
        y: 0,
        z: (building.tileZ + def.footprint.h + 1) * SB.TILE_SIZE,
      };
      if (player) player.freeSoldiers++;
    }
  }

  // Remove the building's flag and associated roads
  const flag = state.flags.get(building.flagId);
  if (flag) {
    // Remove roads connected to this flag
    for (const roadId of [...flag.connectedRoads]) {
      const road = state.roads.get(roadId);
      if (road) {
        // Remove carrier
        if (road.carrierId) {
          state.carriers.delete(road.carrierId);
        }
        // Disconnect from other flag
        const otherId = road.flagA === flag.id ? road.flagB : road.flagA;
        const otherFlag = state.flags.get(otherId);
        if (otherFlag) {
          otherFlag.connectedRoads = otherFlag.connectedRoads.filter((r) => r !== roadId);
        }
        state.roads.delete(roadId);
      }
    }
    state.flags.delete(building.flagId);
  }

  // Clear occupied tiles
  for (let dz = 0; dz < def.footprint.h; dz++) {
    for (let dx = 0; dx < def.footprint.w; dx++) {
      const idx = tileIdx(state.map, building.tileX + dx, building.tileZ + dz);
      state.map.occupied[idx] = "";
    }
  }

  state.buildings.delete(buildingId);

  // Mark territory as dirty when a building is demolished
  state.territoryDirty = true;

  return true;
}

// ---------------------------------------------------------------------------
// Production tick – consume inputs, produce outputs
// ---------------------------------------------------------------------------

export function updateProduction(state: SettlersState, dt: number): void {
  for (const [, building] of state.buildings) {
    if (!building.active) continue;

    const def = BUILDING_DEFS[building.type];
    if (def.productionTime <= 0) continue;
    if (def.type === SettlersBuildingType.BARRACKS) continue; // handled by military system

    // Check if inputs are available
    if (def.inputs.length > 0) {
      let hasAllInputs = true;
      for (const input of def.inputs) {
        // Mines accept any food type
        const isMine = def.type === SettlersBuildingType.IRON_MINE ||
                       def.type === SettlersBuildingType.GOLD_MINE ||
                       def.type === SettlersBuildingType.COAL_MINE;
        if (isMine && FOOD_TYPES.has(input.type)) {
          // Check for any food in storage
          const hasFood = building.inputStorage.some(
            (s) => FOOD_TYPES.has(s.type) && s.amount >= input.amount,
          );
          if (!hasFood) hasAllInputs = false;
        } else {
          const stored = building.inputStorage.find((s) => s.type === input.type);
          if (!stored || stored.amount < input.amount) hasAllInputs = false;
        }
      }
      if (!hasAllInputs) continue;
    }

    // Tick production timer
    building.productionTimer -= dt;
    if (building.productionTimer <= 0) {
      building.productionTimer = def.productionTime;

      // Consume inputs
      for (const input of def.inputs) {
        const isMine = def.type === SettlersBuildingType.IRON_MINE ||
                       def.type === SettlersBuildingType.GOLD_MINE ||
                       def.type === SettlersBuildingType.COAL_MINE;
        if (isMine && FOOD_TYPES.has(input.type)) {
          // Consume any food
          for (const s of building.inputStorage) {
            if (FOOD_TYPES.has(s.type) && s.amount >= input.amount) {
              s.amount -= input.amount;
              break;
            }
          }
        } else {
          const stored = building.inputStorage.find((s) => s.type === input.type);
          if (stored) stored.amount -= input.amount;
        }
      }
      // Clean up zero-count stacks
      building.inputStorage = building.inputStorage.filter((s) => s.amount > 0);

      // Play resource collected sound (throttled to avoid spam)
      if (building.owner === "p0" && Math.random() < 0.25) {
        playResourceCollected();
      }

      // Produce outputs -> place at building's flag
      for (const output of def.outputs) {
        const flag = state.flags.get(building.flagId);
        if (flag && flag.inventory.length < SB.FLAG_MAX_INVENTORY) {
          flag.inventory.push({
            type: output.type,
            targetBuildingId: "",
            nextFlagId: "",
          });
        } else {
          // Flag full – store in building output
          const existing = building.outputStorage.find((s) => s.type === output.type);
          if (existing) {
            existing.amount += output.amount;
          } else {
            building.outputStorage.push({ type: output.type, amount: output.amount });
          }
        }
      }
    }
  }
}
