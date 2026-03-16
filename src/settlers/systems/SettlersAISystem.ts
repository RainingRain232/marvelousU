// ---------------------------------------------------------------------------
// Settlers – Enhanced AI opponent
//   1. Multi-unit coordinated attacks
//   2. Defensive perimeter placement
//   3. Adaptive resource balancing
//   4. Difficulty levels (easy / normal / hard)
// ---------------------------------------------------------------------------

import { SB } from "../config/SettlersBalance";
import { BUILDING_DEFS, SettlersBuildingType } from "../config/SettlersBuildingDefs";
import { ResourceType } from "../config/SettlersResourceDefs";
import { inBounds } from "../state/SettlersMap";
import type { SettlersState } from "../state/SettlersState";
import type { SettlersPlayer } from "../state/SettlersPlayer";
import { canPlaceBuilding, placeBuilding } from "./SettlersBuildingSystem";
import { createRoad } from "./SettlersRoadSystem";
import { addToProductionQueue } from "./SettlersMilitarySystem";

// ---------------------------------------------------------------------------
// Per-AI-player state (keyed by player id)
// ---------------------------------------------------------------------------

interface AIPlayerState {
  timer: number;
  phase: "economy" | "military" | "attack";
  phaseTicks: number;
  /** Soldiers staged for a coordinated attack */
  rallyPool: string[];
  /** Target building for the current rally */
  rallyTarget: string | null;
  /** Ticks spent rallying (to avoid waiting forever) */
  rallyTimer: number;
}

const _aiStates = new Map<string, AIPlayerState>();

function _getAI(playerId: string): AIPlayerState {
  let s = _aiStates.get(playerId);
  if (!s) {
    s = {
      timer: 0,
      phase: "economy",
      phaseTicks: 0,
      rallyPool: [],
      rallyTarget: null,
      rallyTimer: 0,
    };
    _aiStates.set(playerId, s);
  }
  return s;
}

/** Get difficulty settings for the current game state */
function _diff(state: SettlersState) {
  return SB.AI_DIFFICULTY[state.difficulty];
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function updateAI(state: SettlersState, dt: number): void {
  for (const [, player] of state.players) {
    if (!player.isAI) continue;
    if (player.defeated) continue;

    const ai = _getAI(player.id);
    const diff = _diff(state);

    ai.timer += dt;
    if (ai.timer < diff.tickInterval) continue;
    ai.timer = 0;

    // Build efficiency: on easy, sometimes skip a tick
    if (diff.buildEfficiency < 1 && Math.random() > diff.buildEfficiency) continue;

    ai.phaseTicks++;
    _updatePhase(state, player, ai);
    _aiDecision(state, player, ai);

    // Always process rally / coordinated attack logic
    _updateRally(state, player, ai);

    // Keep barracks production queues filled
    _keepBarracksQueued(state, player);
  }
}

/** AI automatically queues soldiers in its barracks when queue is not full */
function _keepBarracksQueued(state: SettlersState, player: SettlersPlayer): void {
  for (const [, building] of state.buildings) {
    if (building.owner !== player.id) continue;
    if (building.type !== SettlersBuildingType.BARRACKS) continue;
    if (!building.active) continue;

    // Keep the queue full
    while (building.productionQueue.length < SB.MAX_PRODUCTION_QUEUE) {
      addToProductionQueue(building, "soldier");
    }
  }
}

// ---------------------------------------------------------------------------
// Phase management – AI shifts strategy based on game state
// ---------------------------------------------------------------------------

function _updatePhase(state: SettlersState, player: SettlersPlayer, ai: AIPlayerState): void {
  const counts = _countBuildings(state, player.id);

  // Count enemy military presence
  let enemySoldiers = 0;
  for (const [, soldier] of state.soldiers) {
    if (soldier.owner !== player.id) enemySoldiers++;
  }

  const hasSawmill = (counts.get(SettlersBuildingType.SAWMILL) || 0) > 0;
  const hasQuarry = (counts.get(SettlersBuildingType.QUARRY) || 0) > 0;
  const hasBarracks = (counts.get(SettlersBuildingType.BARRACKS) || 0) > 0;

  // Count own garrison
  let ownGarrison = 0;
  for (const [, building] of state.buildings) {
    if (building.owner === player.id) ownGarrison += building.garrison.length;
  }

  const diff = _diff(state);

  // Phase transitions
  if (!hasSawmill || !hasQuarry) {
    ai.phase = "economy";
  } else if (enemySoldiers > 4 && ownGarrison < 3) {
    // React to enemy military buildup
    ai.phase = "military";
  } else if (ownGarrison >= diff.attackThreshold && ai.phaseTicks > 20) {
    ai.phase = "attack";
  } else if (!hasBarracks) {
    ai.phase = ai.phaseTicks > 10 ? "military" : "economy";
  } else if (ai.phaseTicks % 20 < 12) {
    ai.phase = "economy";
  } else {
    ai.phase = "military";
  }
}

// ---------------------------------------------------------------------------
// Main AI decision – with adaptive resource balancing
// ---------------------------------------------------------------------------

function _aiDecision(state: SettlersState, player: SettlersPlayer, ai: AIPlayerState): void {
  const counts = _countBuildings(state, player.id);
  const has = (t: SettlersBuildingType) => (counts.get(t) || 0);
  const res = (t: ResourceType) => player.storage.get(t) || 0;

  // Check affordability
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

  // ------------------------------------------------------------------
  // Adaptive resource analysis – identify bottlenecks
  // ------------------------------------------------------------------
  const resourceNeeds = _analyzeResourceNeeds(state, player, counts);

  // ------------------------------------------------------------------
  // Build order depends on phase + resource needs
  // ------------------------------------------------------------------
  let buildOrder: { type: SettlersBuildingType; max: number }[];

  if (ai.phase === "economy") {
    buildOrder = _adaptiveEconomyBuildOrder(resourceNeeds, counts);
  } else if (ai.phase === "military") {
    buildOrder = _adaptiveMilitaryBuildOrder(resourceNeeds, counts);
  } else {
    // Attack phase – initiate coordinated attack, but also build
    _initiateCoordinatedAttack(state, player, ai);
    buildOrder = [
      { type: SettlersBuildingType.WATCHTOWER, max: 3 },
      { type: SettlersBuildingType.FORTRESS, max: 2 },
    ];
  }

  // ------------------------------------------------------------------
  // Try defensive placement for military buildings
  // ------------------------------------------------------------------
  for (const order of buildOrder) {
    if (has(order.type) >= order.max) continue;
    if (!canAfford(order.type)) continue;

    const def = BUILDING_DEFS[order.type];
    const isMilitary = def.garrisonSlots > 0 || def.territoryRadius > 0;
    let placed: import("../state/SettlersBuilding").SettlersBuilding | null = null;

    if (isMilitary && def.type !== SettlersBuildingType.BARRACKS) {
      // Try defensive border placement first
      placed = _tryPlaceMilitaryDefensive(state, player.id, order.type);
    }

    if (!placed) {
      placed = _tryPlaceBuilding(state, player.id, order.type);
    }

    if (placed) {
      _tryConnectRoad(state, player.id, placed);
      // Territory recalc is handled by the dirty flag set in placeBuilding
      return;
    }
  }

  // If nothing to build and not in attack phase, consider starting an attack
  if (ai.phase !== "attack") {
    _initiateCoordinatedAttack(state, player, ai);
  }
}

// ---------------------------------------------------------------------------
// Resource analysis – determines what the AI is lacking
// ---------------------------------------------------------------------------

interface ResourceNeeds {
  needPlanks: boolean;
  needStone: boolean;
  needFood: boolean;
  needMilitarySupplies: boolean;
  needBeer: boolean;
  needIron: boolean;
  threatLevel: number; // 0..1 – how threatened the AI feels
}

function _analyzeResourceNeeds(
  state: SettlersState,
  player: SettlersPlayer,
  counts: Map<SettlersBuildingType, number>,
): ResourceNeeds {
  const res = (t: ResourceType) => player.storage.get(t) || 0;

  // Food supply check – mines need food to operate
  const totalFood = res(ResourceType.FISH) + res(ResourceType.BREAD) + res(ResourceType.MEAT);
  const hasFoodProduction =
    (counts.get(SettlersBuildingType.FISHER) || 0) > 0 ||
    (counts.get(SettlersBuildingType.FARM) || 0) > 0 ||
    (counts.get(SettlersBuildingType.HUNTER) || 0) > 0;

  // Iron chain check
  const hasIronChain =
    (counts.get(SettlersBuildingType.IRON_MINE) || 0) > 0 &&
    (counts.get(SettlersBuildingType.COAL_MINE) || 0) > 0 &&
    (counts.get(SettlersBuildingType.SMELTER) || 0) > 0;

  // Military supply check
  const swords = res(ResourceType.SWORD);
  const shields = res(ResourceType.SHIELD);
  const beer = res(ResourceType.BEER);

  // Threat level: how many enemy soldiers are nearby compared to own
  let enemySoldierCount = 0;
  let ownSoldierCount = 0;
  for (const [, soldier] of state.soldiers) {
    if (soldier.owner === player.id) ownSoldierCount++;
    else enemySoldierCount++;
  }
  let ownGarrison = 0;
  for (const [, building] of state.buildings) {
    if (building.owner === player.id) ownGarrison += building.garrison.length;
  }
  const totalOwn = ownSoldierCount + ownGarrison;
  const threatLevel = enemySoldierCount > 0
    ? Math.min(1, enemySoldierCount / Math.max(1, totalOwn))
    : 0;

  return {
    needPlanks: res(ResourceType.PLANKS) < 4 && res(ResourceType.WOOD) < 2,
    needStone: res(ResourceType.STONE) < 3,
    needFood: totalFood < 3 && !hasFoodProduction,
    needMilitarySupplies: (swords < 2 || shields < 2) && hasIronChain,
    needBeer: beer < 2 && (counts.get(SettlersBuildingType.BARRACKS) || 0) > 0,
    needIron: res(ResourceType.IRON) < 2 && !hasIronChain,
    threatLevel,
  };
}

// ---------------------------------------------------------------------------
// Adaptive build orders based on resource needs
// ---------------------------------------------------------------------------

function _adaptiveEconomyBuildOrder(
  needs: ResourceNeeds,
  counts: Map<SettlersBuildingType, number>,
): { type: SettlersBuildingType; max: number }[] {
  const order: { type: SettlersBuildingType; max: number }[] = [];
  const has = (t: SettlersBuildingType) => counts.get(t) || 0;

  // Always need wood/planks infrastructure first
  if (needs.needPlanks || has(SettlersBuildingType.WOODCUTTER) === 0) {
    order.push({ type: SettlersBuildingType.WOODCUTTER, max: 2 });
    order.push({ type: SettlersBuildingType.SAWMILL, max: 1 });
  }

  // Stone is critical for all construction
  if (needs.needStone || has(SettlersBuildingType.QUARRY) === 0) {
    order.push({ type: SettlersBuildingType.QUARRY, max: 1 });
  }

  // If food is low, prioritize food production before mines
  if (needs.needFood) {
    order.push({ type: SettlersBuildingType.FISHER, max: 1 });
    order.push({ type: SettlersBuildingType.HUNTER, max: 1 });
    order.push({ type: SettlersBuildingType.FARM, max: 1 });
  }

  // Territory expansion (at least one guard house early)
  order.push({ type: SettlersBuildingType.GUARD_HOUSE, max: 1 });

  // If iron supply chain is missing, build it
  if (needs.needIron) {
    // Need food producers first for mines
    if (!needs.needFood) {
      order.push({ type: SettlersBuildingType.FISHER, max: 1 });
    }
    order.push({ type: SettlersBuildingType.COAL_MINE, max: 1 });
    order.push({ type: SettlersBuildingType.IRON_MINE, max: 1 });
    order.push({ type: SettlersBuildingType.SMELTER, max: 1 });
  }

  // Beer production needed for barracks
  if (needs.needBeer) {
    order.push({ type: SettlersBuildingType.FARM, max: 1 });
    order.push({ type: SettlersBuildingType.BREWERY, max: 1 });
  }

  // Standard economy expansion
  order.push(
    { type: SettlersBuildingType.FARM, max: 1 },
    { type: SettlersBuildingType.MILL, max: 1 },
    { type: SettlersBuildingType.BAKERY, max: 1 },
    { type: SettlersBuildingType.BREWERY, max: 1 },
    { type: SettlersBuildingType.WOODCUTTER, max: 4 },
    { type: SettlersBuildingType.GUARD_HOUSE, max: 3 },
    { type: SettlersBuildingType.STOREHOUSE, max: 1 },
    { type: SettlersBuildingType.GOLD_MINE, max: 1 },
    { type: SettlersBuildingType.MINT, max: 1 },
  );

  // If under threat, sprinkle in more military buildings
  if (needs.threatLevel > 0.5) {
    order.unshift({ type: SettlersBuildingType.GUARD_HOUSE, max: 2 });
    order.push({ type: SettlersBuildingType.WATCHTOWER, max: 1 });
  }

  return order;
}

function _adaptiveMilitaryBuildOrder(
  needs: ResourceNeeds,
  _counts: Map<SettlersBuildingType, number>,
): { type: SettlersBuildingType; max: number }[] {
  const order: { type: SettlersBuildingType; max: number }[] = [];

  // If we need military supplies, prioritize the supply chain
  if (needs.needMilitarySupplies) {
    order.push({ type: SettlersBuildingType.SWORD_SMITH, max: 1 });
    order.push({ type: SettlersBuildingType.SHIELD_SMITH, max: 1 });
  }

  // If iron chain is missing, we need to build that first
  if (needs.needIron) {
    if (needs.needFood) {
      order.push({ type: SettlersBuildingType.FISHER, max: 1 });
    }
    order.push({ type: SettlersBuildingType.COAL_MINE, max: 1 });
    order.push({ type: SettlersBuildingType.IRON_MINE, max: 1 });
    order.push({ type: SettlersBuildingType.SMELTER, max: 1 });
  }

  // Standard military build
  order.push(
    { type: SettlersBuildingType.SWORD_SMITH, max: 1 },
    { type: SettlersBuildingType.SHIELD_SMITH, max: 1 },
    { type: SettlersBuildingType.BARRACKS, max: 1 },
    { type: SettlersBuildingType.GUARD_HOUSE, max: 3 },
    { type: SettlersBuildingType.WATCHTOWER, max: 2 },
    { type: SettlersBuildingType.FORTRESS, max: 1 },
    { type: SettlersBuildingType.BARRACKS, max: 2 },
    { type: SettlersBuildingType.BREWERY, max: 2 },
    { type: SettlersBuildingType.WOODCUTTER, max: 3 },
  );

  // If threatened, build extra defensive structures
  if (needs.threatLevel > 0.4) {
    order.push(
      { type: SettlersBuildingType.WATCHTOWER, max: 3 },
      { type: SettlersBuildingType.FORTRESS, max: 2 },
    );
  }

  return order;
}

// ---------------------------------------------------------------------------
// Multi-unit coordinated attack system
// ---------------------------------------------------------------------------

function _initiateCoordinatedAttack(
  state: SettlersState,
  player: SettlersPlayer,
  ai: AIPlayerState,
): void {
  const diff = _diff(state);

  // If we already have a rally in progress, don't start a new one
  if (ai.rallyTarget && ai.rallyPool.length > 0) return;

  // Count total available garrison (soldiers we can pull)
  let totalAvailable = 0;
  for (const [, building] of state.buildings) {
    if (building.owner !== player.id) continue;
    // Keep at least 1 soldier in each garrison for defense
    if (building.garrison.length > 1) {
      totalAvailable += building.garrison.length - 1;
    }
  }

  // Don't attack unless we have enough soldiers
  if (totalAvailable < diff.attackThreshold) return;

  // Find best target
  const hq = state.buildings.get(player.hqId);
  if (!hq) return;

  let bestTarget: string | null = null;
  let bestScore = -Infinity;

  for (const [, building] of state.buildings) {
    if (building.owner === player.id) continue;
    const def = BUILDING_DEFS[building.type];

    const dx = building.tileX - hq.tileX;
    const dz = building.tileZ - hq.tileZ;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const garrisonCount = building.garrison.length;

    // Only attack if we have enough soldiers to overwhelm the garrison
    if (totalAvailable < garrisonCount + 1) continue;

    let score = 100 - dist * 2 - garrisonCount * 10;
    // Bonus for territory-projecting buildings
    if (def.territoryRadius > 0) score += 30;
    // Bonus for HQ (ultimate target)
    if (def.type === SettlersBuildingType.HEADQUARTERS) score += 50;
    // Penalty for heavily defended targets
    if (garrisonCount > 4) score -= 20;

    if (score > bestScore) {
      bestScore = score;
      bestTarget = building.id;
    }
  }

  if (!bestTarget) return;

  const targetBuilding = state.buildings.get(bestTarget)!;
  const targetGarrison = targetBuilding.garrison.length;

  // Determine how many soldiers to send: at least garrison+2, up to groupSize
  const desiredCount = Math.min(
    Math.max(targetGarrison + 2, diff.attackGroupSize),
    totalAvailable,
  );

  // Gather soldiers from garrisons nearest to the target
  const targetX = (targetBuilding.tileX + 1) * SB.TILE_SIZE;
  const targetZ = (targetBuilding.tileZ + 1) * SB.TILE_SIZE;

  const candidates: { building: import("../state/SettlersBuilding").SettlersBuilding; dist: number }[] = [];
  for (const [, building] of state.buildings) {
    if (building.owner !== player.id) continue;
    if (building.garrison.length <= 1) continue;
    const bx = (building.tileX + 1) * SB.TILE_SIZE;
    const bz = (building.tileZ + 1) * SB.TILE_SIZE;
    const dx = bx - targetX;
    const dz = bz - targetZ;
    candidates.push({ building, dist: Math.sqrt(dx * dx + dz * dz) });
  }
  candidates.sort((a, b) => a.dist - b.dist);

  let sent = 0;
  for (const c of candidates) {
    if (sent >= desiredCount) break;
    while (c.building.garrison.length > 1 && sent < desiredCount) {
      const soldierId = c.building.garrison.pop()!;
      const soldier = state.soldiers.get(soldierId);
      if (soldier) {
        soldier.state = "marching";
        soldier.garrisonedIn = null;
        soldier.targetBuildingId = bestTarget;
        soldier.position = {
          x: (c.building.tileX + 1) * SB.TILE_SIZE,
          y: 0,
          z: (c.building.tileZ + 1) * SB.TILE_SIZE,
        };
        ai.rallyPool.push(soldierId);
        sent++;
      }
    }
  }

  if (sent > 0) {
    ai.rallyTarget = bestTarget;
    ai.rallyTimer = 0;
  }
}

/** Track rally progress and clean up finished attacks */
function _updateRally(
  state: SettlersState,
  _player: SettlersPlayer,
  ai: AIPlayerState,
): void {
  if (!ai.rallyTarget || ai.rallyPool.length === 0) {
    ai.rallyPool = [];
    ai.rallyTarget = null;
    return;
  }

  ai.rallyTimer++;

  // Clean up dead or idle soldiers from the rally pool
  ai.rallyPool = ai.rallyPool.filter((id) => {
    const s = state.soldiers.get(id);
    return s && (s.state === "marching" || s.state === "fighting");
  });

  // If all soldiers are done (dead or idle), end the rally
  if (ai.rallyPool.length === 0) {
    ai.rallyTarget = null;
    ai.rallyTimer = 0;
  }

  // If rally has been going too long (60 ticks), abandon it
  if (ai.rallyTimer > 60) {
    ai.rallyPool = [];
    ai.rallyTarget = null;
    ai.rallyTimer = 0;
  }
}

// ---------------------------------------------------------------------------
// Defensive military building placement
// ---------------------------------------------------------------------------

function _tryPlaceMilitaryDefensive(
  state: SettlersState,
  playerId: string,
  type: SettlersBuildingType,
): import("../state/SettlersBuilding").SettlersBuilding | null {
  const map = state.map;
  const player = state.players.get(playerId);
  if (!player) return null;
  const playerIdx = playerId === "p0" ? 0 : 1;
  const diff = _diff(state);

  // Only do defensive placement with some probability based on difficulty
  if (Math.random() > diff.defensePriority) return null;

  // Find border tiles: our territory tiles adjacent to neutral or enemy territory
  const borderTiles: { x: number; z: number; enemyDist: number }[] = [];

  for (let tz = 1; tz < map.height - 1; tz++) {
    for (let tx = 1; tx < map.width - 1; tx++) {
      const idx = tz * map.width + tx;
      if (map.territory[idx] !== playerIdx) continue;

      // Check if this is a border tile (adjacent to non-owned territory)
      let isBorder = false;
      let nearEnemy = false;
      for (const [ddx, ddz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const nx = tx + ddx;
        const nz = tz + ddz;
        if (!inBounds(map, nx, nz)) continue;
        const nIdx = nz * map.width + nx;
        if (map.territory[nIdx] !== playerIdx) {
          isBorder = true;
          if (map.territory[nIdx] >= 0 && map.territory[nIdx] !== playerIdx) {
            nearEnemy = true;
          }
        }
      }

      if (!isBorder) continue;

      // Calculate distance to nearest enemy building
      let minEnemyDist = Infinity;
      for (const [, building] of state.buildings) {
        if (building.owner === playerId) continue;
        const dx = building.tileX - tx;
        const dz = building.tileZ - tz;
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d < minEnemyDist) minEnemyDist = d;
      }

      // Prioritize tiles near enemy territory
      const priority = nearEnemy ? minEnemyDist : minEnemyDist + 100;
      borderTiles.push({ x: tx, z: tz, enemyDist: priority });
    }
  }

  // Sort by priority (lower = better: closer to enemy border)
  borderTiles.sort((a, b) => a.enemyDist - b.enemyDist);

  // Make sure we don't cluster military buildings too close together
  const existingMilitary: { x: number; z: number }[] = [];
  for (const [, building] of state.buildings) {
    if (building.owner !== playerId) continue;
    const bDef = BUILDING_DEFS[building.type];
    if (bDef.garrisonSlots > 0) {
      existingMilitary.push({ x: building.tileX, z: building.tileZ });
    }
  }

  // Try top border tile candidates
  const maxTries = Math.min(borderTiles.length, 40);
  for (let i = 0; i < maxTries; i++) {
    const tile = borderTiles[i];

    // Check minimum distance from existing military buildings (avoid clustering)
    let tooClose = false;
    for (const m of existingMilitary) {
      const dx = m.x - tile.x;
      const dz = m.z - tile.z;
      if (Math.sqrt(dx * dx + dz * dz) < 5) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) continue;

    const error = canPlaceBuilding(state, type, tile.x, tile.z, playerId);
    if (!error) {
      return placeBuilding(state, type, tile.x, tile.z, playerId);
    }
  }

  return null;
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
