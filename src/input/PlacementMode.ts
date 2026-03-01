// Building placement input handler — validates tile, confirms/cancels placement
import type { GameState } from "@sim/state/GameState";
import { createBuilding } from "@sim/entities/Building";
import { createUnit } from "@sim/entities/Unit";
import { BUILDING_DEFINITIONS } from "@sim/config/BuildingDefs";
import { BUILDING_MIN_GAP } from "@sim/systems/BuildingSystem";
import { getTile } from "@sim/core/Grid";
import { EventBus } from "@sim/core/EventBus";
import { BuildingType, UnitType, UnitState } from "@/types";
import type { PlayerId } from "@/types";
import { getRace } from "@sim/config/RaceDefs";
import { UpgradeSystem, TOWER_BUILDING_TYPES } from "@sim/systems/UpgradeSystem";

// ---------------------------------------------------------------------------
// Placement validation
// ---------------------------------------------------------------------------

/**
 * Returns true if `bpType` can be placed at top-left tile (tx, ty) for
 * `playerId` given the current `state`.
 *
 * Rules (per claude.md §7.2 and §5.2):
 *   1. All footprint tiles must be within grid bounds.
 *   2. All footprint tiles must be walkable (not already occupied).
 *   3. The building's placementZone must match the tile zone:
 *        "own"     → all tiles must be in the player's own zone
 *        "neutral" → all tiles must be in the neutral zone
 *        "any"     → no zone restriction
 */
export function canPlace(
  state: GameState,
  bpType: BuildingType,
  tx: number,
  ty: number,
  playerId: PlayerId,
): boolean {
  const def = BUILDING_DEFINITIONS[bpType];
  const { grid, width, height } = state.battlefield;

  // Determine which zone the player "owns"
  const player = state.players.get(playerId);
  if (!player) return false;
  const playerZone = player.direction; // "west" | "east"

  for (let dy = 0; dy < def.footprint.h; dy++) {
    for (let dx = 0; dx < def.footprint.w; dx++) {
      const x = tx + dx;
      const y = ty + dy;

      // Bounds check
      if (x < 0 || x >= width || y < 0 || y >= height) return false;

      const tile = grid[y][x];

      // Must be walkable (unoccupied)
      if (!tile.walkable || tile.buildingId !== null) return false;

      // Zone restriction
      if (def.placementZone === "own" && tile.zone !== playerZone) return false;
      if (def.placementZone === "neutral" && tile.zone !== "neutral")
        return false;
    }
  }

  // Minimum-gap check: no existing building tile within BUILDING_MIN_GAP tiles
  const gap = BUILDING_MIN_GAP;
  for (let dy = -gap; dy < def.footprint.h + gap; dy++) {
    for (let dx = -gap; dx < def.footprint.w + gap; dx++) {
      if (dx >= 0 && dx < def.footprint.w && dy >= 0 && dy < def.footprint.h) continue;
      const tile = getTile(state.battlefield, tx + dx, ty + dy);
      if (tile && tile.buildingId !== null) return false;
    }
  }

  return true;
}

// ---------------------------------------------------------------------------
// Placement execution
// ---------------------------------------------------------------------------

let _buildingCounter = 0;

/**
 * Commit a placement: create the Building entity, mark tiles as occupied,
 * register it on the player, and emit `buildingPlaced`.
 *
 * Precondition: `canPlace(state, bpType, tx, ty, playerId)` must be true.
 */
export function confirmPlacement(
  state: GameState,
  bpType: BuildingType,
  tx: number,
  ty: number,
  playerId: PlayerId,
): string {
  const def = BUILDING_DEFINITIONS[bpType];
  const buildingId = `building-placed-${++_buildingCounter}`;

  const building = createBuilding({
    id: buildingId,
    type: bpType,
    owner: playerId,
    position: { x: tx, y: ty },
  });

  state.buildings.set(buildingId, building);

  // Mark footprint tiles as occupied
  for (let dy = 0; dy < def.footprint.h; dy++) {
    for (let dx = 0; dx < def.footprint.w; dx++) {
      const tile = state.battlefield.grid[ty + dy][tx + dx];
      tile.walkable = false;
      tile.buildingId = buildingId;
    }
  }

  // Register on player
  const player = state.players.get(playerId);
  if (player) player.ownedBuildings.push(buildingId);

  // Faction Hall: populate shopInventory based on the player's chosen race
  if (bpType === BuildingType.FACTION_HALL) {
    const raceId = playerId === "p1" ? state.p1RaceId : null;
    if (raceId) {
      const race = getRace(raceId);
      if (race?.implemented) {
        building.shopInventory = [race.factionUnit];
      }
    }
  }

  // Stables: spawn a free Questing Knight when built
  if (bpType === BuildingType.STABLES) {
    const qk = createUnit({
      type: UnitType.QUESTING_KNIGHT,
      owner: playerId,
      position: { x: tx, y: ty + def.footprint.h },
    });
    
    // Apply all purchased upgrades to the new unit
    UpgradeSystem.applyAllUpgradesToUnit(qk);
    
    // Find the player's castle and set it as movement target
    let playerCastle = null;
    for (const building of state.buildings.values()) {
      if (building.owner === playerId && building.type === BuildingType.CASTLE) {
        playerCastle = building;
        break;
      }
    }
    
    if (playerCastle) {
      qk.targetId = playerCastle.id;
    }
    
    // Set special timer to idle at castle for 5 seconds when it arrives
    qk.questingKnightTimer = 5;
    qk.state = UnitState.MOVE;
    
    state.units.set(qk.id, qk);
    EventBus.emit("unitSpawned", {
      unitId: qk.id,
      buildingId,
      position: { ...qk.position },
    });
  }

  // Apply all current tower upgrades to the newly placed building
  if (TOWER_BUILDING_TYPES.has(bpType)) {
    UpgradeSystem.applyTowerUpgradesToBuilding(building, playerId);
  }

  EventBus.emit("buildingPlaced", {
    buildingId,
    position: { x: tx, y: ty },
    owner: playerId,
  });

  return buildingId;
}

/**
 * Cancel placement and refund gold to the player.
 */
export function cancelPlacement(
  state: GameState,
  bpType: BuildingType,
  playerId: PlayerId,
): void {
  const cost = UpgradeSystem.getTowerBuildingCost(bpType, playerId);
  const player = state.players.get(playerId);
  if (!player) return;

  player.gold += cost;
  EventBus.emit("goldChanged", { playerId, amount: player.gold });
}
