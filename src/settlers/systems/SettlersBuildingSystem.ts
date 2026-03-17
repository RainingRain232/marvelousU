// ---------------------------------------------------------------------------
// Settlers – Building system (placement, construction, production)
// ---------------------------------------------------------------------------

import { SB } from "../config/SettlersBalance";
import { BUILDING_DEFS, SettlersBuildingType, ResourceStack } from "../config/SettlersBuildingDefs";
import { FOOD_TYPES, ResourceType } from "../config/SettlersResourceDefs";
import { Biome, inBounds, tileIdx } from "../state/SettlersMap";
import type { SettlersBuilding } from "../state/SettlersBuilding";
import type { SettlersState } from "../state/SettlersState";
import { nextId } from "../state/SettlersState";
import type { SettlersFlag } from "../state/SettlersRoad";
import { playResourceCollected } from "./SettlersAudioSystem";

// ---------------------------------------------------------------------------
// Raw resource types (for trade rate calculation)
// ---------------------------------------------------------------------------

const RAW_RESOURCES: ReadonlySet<ResourceType> = new Set([
  ResourceType.WOOD, ResourceType.STONE, ResourceType.IRON_ORE,
  ResourceType.GOLD_ORE, ResourceType.COAL, ResourceType.WHEAT,
  ResourceType.WATER, ResourceType.FISH,
]);

/** All tradeable resource types */
export const TRADEABLE_RESOURCES: ResourceType[] = Object.values(ResourceType);

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
    level: 1,
    upgradeProgress: 0,
    marketSellResource: null,
    marketBuyResource: null,
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
      building.constructionProgress += dt * 0.5; // ~2 seconds to build
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

/** Get effective production time for a building, accounting for level */
export function getEffectiveProductionTime(building: SettlersBuilding): number {
  const def = BUILDING_DEFS[building.type];
  let time = def.productionTime;
  for (let l = 1; l < building.level; l++) {
    time *= SB.UPGRADE_SPEED_MULT;
  }
  return time;
}

export function updateProduction(state: SettlersState, dt: number): void {
  for (const [, building] of state.buildings) {
    if (!building.active) continue;
    // Skip buildings currently being upgraded
    if (building.upgradeProgress > 0 && building.upgradeProgress < 1) continue;

    const def = BUILDING_DEFS[building.type];
    if (def.productionTime <= 0) continue;
    if (def.type === SettlersBuildingType.BARRACKS) continue; // handled by military system

    // Market building – handle trade cycle
    if (def.type === SettlersBuildingType.MARKET) {
      _updateMarketTrade(state, building, dt);
      continue;
    }

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
      const effTime = getEffectiveProductionTime(building);
      building.productionTimer = effTime;

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

// ---------------------------------------------------------------------------
// Market trade logic
// ---------------------------------------------------------------------------

function _updateMarketTrade(state: SettlersState, building: SettlersBuilding, dt: number): void {
  if (!building.marketSellResource || !building.marketBuyResource) return;
  if (building.marketSellResource === building.marketBuyResource) return;

  const player = state.players.get(building.owner);
  if (!player) return;

  const effTime = getEffectiveProductionTime(building);
  building.productionTimer -= dt;
  if (building.productionTimer <= 0) {
    building.productionTimer = effTime;

    const sellRes = building.marketSellResource;
    const buyRes = building.marketBuyResource;

    // Determine trade rate
    const bothRaw = RAW_RESOURCES.has(sellRes) && RAW_RESOURCES.has(buyRes);
    const rate = bothRaw ? SB.TRADE_RATE_RAW_TO_RAW : SB.TRADE_RATE_DEFAULT;

    const available = player.storage.get(sellRes) || 0;
    if (available >= rate) {
      player.storage.set(sellRes, available - rate);
      player.storage.set(buyRes, (player.storage.get(buyRes) || 0) + 1);

      if (building.owner === "p0" && Math.random() < 0.25) {
        playResourceCollected();
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Building upgrades
// ---------------------------------------------------------------------------

/** Get upgrade cost for the next level */
export function getUpgradeCost(building: SettlersBuilding): ResourceStack[] | null {
  const nextLevel = building.level + 1;
  if (nextLevel > SB.MAX_BUILDING_LEVEL) return null;
  const costs = SB.UPGRADE_COSTS[nextLevel];
  if (!costs) return null;
  return [
    { type: ResourceType.PLANKS, amount: costs.planks },
    { type: ResourceType.STONE, amount: costs.stone },
    { type: ResourceType.GOLD, amount: costs.gold },
  ];
}

/** Check if upgrade is possible and affordable */
export function canUpgradeBuilding(state: SettlersState, buildingId: string): string | null {
  const building = state.buildings.get(buildingId);
  if (!building) return "Building not found";
  if (building.constructionProgress < 1) return "Still under construction";
  if (building.upgradeProgress > 0 && building.upgradeProgress < 1) return "Already upgrading";
  if (building.level >= SB.MAX_BUILDING_LEVEL) return "Already max level";

  // HQ and storehouses cannot be upgraded
  const def = BUILDING_DEFS[building.type];
  if (def.type === SettlersBuildingType.HEADQUARTERS) return "Cannot upgrade HQ";
  if (def.type === SettlersBuildingType.STOREHOUSE) return "Cannot upgrade storehouse";

  const costs = getUpgradeCost(building);
  if (!costs) return "No upgrade available";

  const player = state.players.get(building.owner);
  if (!player) return "Invalid player";

  for (const cost of costs) {
    const have = player.storage.get(cost.type) || 0;
    if (have < cost.amount) return `Need ${cost.amount} ${cost.type} (have ${have})`;
  }

  return null; // can upgrade
}

/** Start upgrading a building */
export function upgradeBuilding(state: SettlersState, buildingId: string): boolean {
  const error = canUpgradeBuilding(state, buildingId);
  if (error) return false;

  const building = state.buildings.get(buildingId)!;
  const costs = getUpgradeCost(building)!;
  const player = state.players.get(building.owner)!;

  // Deduct resources
  for (const cost of costs) {
    player.storage.set(cost.type, (player.storage.get(cost.type) || 0) - cost.amount);
  }

  // Start upgrade progress
  building.upgradeProgress = 0.001; // just above 0 to indicate "upgrading"
  return true;
}

/** Tick upgrade progress for all buildings */
export function updateUpgrades(state: SettlersState, dt: number): void {
  for (const [, building] of state.buildings) {
    if (building.upgradeProgress <= 0 || building.upgradeProgress >= 1) continue;

    const def = BUILDING_DEFS[building.type];
    // Upgrade takes UPGRADE_BUILD_TIME_MULT * original construction time
    // We approximate original build time as ~2s (same rate as construction: dt * 0.5)
    const upgradeSpeed = 0.5 / SB.UPGRADE_BUILD_TIME_MULT; // rate per second
    building.upgradeProgress += dt * (upgradeSpeed / Math.max(def.constructionCost.length, 1));

    if (building.upgradeProgress >= 1) {
      building.upgradeProgress = 1;
      building.level++;
      // Reset upgrade progress so it can be upgraded again
      building.upgradeProgress = 0;
      // Reset production timer with new speed
      building.productionTimer = getEffectiveProductionTime(building);
    }
  }
}

/** Set market trade resources */
export function setMarketTrade(
  state: SettlersState,
  buildingId: string,
  sellResource: ResourceType | null,
  buyResource: ResourceType | null,
): void {
  const building = state.buildings.get(buildingId);
  if (!building) return;
  if (building.type !== SettlersBuildingType.MARKET) return;
  building.marketSellResource = sellResource;
  building.marketBuyResource = buyResource;
}
