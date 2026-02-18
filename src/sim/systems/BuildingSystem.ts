// Building system: placement validation, tick updates, destruction, capture.
import type { GameState } from "@sim/state/GameState";
import { getPlayer } from "@sim/state/GameState";
import { getTile, setBuilding, setWalkable } from "@sim/core/Grid";
import { BUILDING_DEFINITIONS } from "@sim/config/BuildingDefs";
import { createBuilding } from "@sim/entities/Building";
import { EventBus } from "@sim/core/EventBus";
import type { PlayerId, Vec2 } from "@/types";
import {
  BuildingState,
  BuildingType,
  Direction,
  UnitState,
  UnitType,
} from "@/types";
import type { TileZone } from "@sim/state/BattlefieldState";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { distanceSq } from "@sim/utils/math";

// ---------------------------------------------------------------------------
// Placement result
// ---------------------------------------------------------------------------

export type PlacementFailReason =
  | "insufficient_gold"
  | "out_of_bounds"
  | "tile_not_walkable"
  | "overlap"
  | "wrong_territory";

export type PlacementResult =
  | { ok: true; buildingId: string }
  | { ok: false; reason: PlacementFailReason };

// ---------------------------------------------------------------------------
// placeBuilding
// ---------------------------------------------------------------------------

let _nextId = 1;
function nextBuildingId(): string {
  return `building-${_nextId++}`;
}

/** Reset the ID counter — for use in tests only. */
export function _resetBuildingIdCounter(): void {
  _nextId = 1;
}

/**
 * Validate and place a building on the battlefield.
 *
 * Checks (in order):
 *  1. Player has enough gold
 *  2. All footprint tiles are in bounds
 *  3. All footprint tiles are walkable (no existing buildings)
 *  4. All footprint tiles are in the correct territory zone
 *
 * On success:
 *  - Deducts gold from player
 *  - Marks footprint tiles as occupied (buildingId set, walkable = false)
 *  - Registers the building on GameState
 *  - Emits `buildingPlaced` on the EventBus
 */
export function placeBuilding(
  state: GameState,
  playerId: PlayerId,
  type: BuildingType,
  position: Vec2,
): PlacementResult {
  const def = BUILDING_DEFINITIONS[type];
  const player = getPlayer(state, playerId);

  // 1. Gold check
  if (player.gold < def.cost) {
    return { ok: false, reason: "insufficient_gold" };
  }

  // 2 & 3 & 4. Footprint tile checks
  const tiles = getFootprintTiles(position, def.footprint.w, def.footprint.h);
  const allowedZone = playerZone(player.direction);

  for (const { x, y } of tiles) {
    const tile = getTile(state.battlefield, x, y);

    // Out of bounds
    if (!tile) return { ok: false, reason: "out_of_bounds" };

    // Occupied by another building
    if (tile.buildingId !== null) return { ok: false, reason: "overlap" };

    // Not walkable (unwalkable terrain)
    if (!tile.walkable) return { ok: false, reason: "tile_not_walkable" };

    // Territory check
    if (!zoneAllowed(tile.zone, allowedZone, def.placementZone)) {
      return { ok: false, reason: "wrong_territory" };
    }
  }

  // --- All checks passed — commit placement ---

  const id = nextBuildingId();

  // Deduct gold
  player.gold -= def.cost;

  // Mark tiles
  for (const { x, y } of tiles) {
    setBuilding(state.battlefield, x, y, id);
    setWalkable(state.battlefield, x, y, false);
  }

  // Register building on state
  const building = createBuilding({
    id,
    type,
    owner: playerId,
    position: { ...position },
    linkedBaseId: player.ownedBaseId,
  });
  state.buildings.set(id, building);

  // Link to player's owned list
  player.ownedBuildings.push(id);

  // Emit event
  EventBus.emit("buildingPlaced", {
    buildingId: id,
    position: { ...position },
    owner: playerId,
  });

  return { ok: true, buildingId: id };
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// destroyBuilding — marks a building as DESTROYED, frees its tiles,
// removes it from its owner's building list, and emits buildingDestroyed.
// If the building is a Castle, zeroes out the linked base's health so
// PhaseSystem registers the base as eliminated.
// ---------------------------------------------------------------------------

export function destroyBuilding(state: GameState, buildingId: string): void {
  const building = state.buildings.get(buildingId);
  if (!building) return;
  if (building.state === BuildingState.DESTROYED) return;

  building.state = BuildingState.DESTROYED;
  building.health = 0;

  // Free grid tiles
  const def = BUILDING_DEFINITIONS[building.type];
  const tiles = getFootprintTiles(
    building.position,
    def.footprint.w,
    def.footprint.h,
  );
  for (const { x, y } of tiles) {
    setBuilding(state.battlefield, x, y, null);
    setWalkable(state.battlefield, x, y, true);
  }

  // Remove from owner's building list
  if (building.owner) {
    const player = state.players.get(building.owner);
    if (player) {
      player.ownedBuildings = player.ownedBuildings.filter(
        (id) => id !== buildingId,
      );
    }
  }

  // Castle destroyed → zero out the linked base so PhaseSystem triggers elimination
  if (building.type === BuildingType.CASTLE) {
    for (const base of state.bases.values()) {
      if (base.castleId === buildingId) {
        base.health = 0;
        break;
      }
    }
  }

  EventBus.emit("buildingDestroyed", { buildingId });
}

// ---------------------------------------------------------------------------
// Tick update
// ---------------------------------------------------------------------------

export const BuildingSystem = {
  update(state: GameState, dt: number): void {
    const rangeSq = BalanceConfig.CAPTURE_RANGE * BalanceConfig.CAPTURE_RANGE;

    for (const building of state.buildings.values()) {
      if (building.state !== BuildingState.ACTIVE) continue;
      if (building.owner !== null) continue; // only neutral buildings

      // Collect occupying player IDs (units within capture range, alive)
      const occupiers = new Set<string>();
      for (const unit of state.units.values()) {
        if (unit.state === UnitState.DIE) continue;
        if (distanceSq(unit.position, building.position) <= rangeSq) {
          occupiers.add(unit.owner);
        }
      }

      const contested = occupiers.size > 1;

      if (contested) {
        // Both sides present — reset progress
        building.captureProgress = 0;
        building.capturePlayerId = null;
        continue;
      }

      if (occupiers.size === 0) {
        // Nobody here — progress decays back toward 0 if capturingPlayerId set
        if (building.capturePlayerId !== null && building.captureProgress > 0) {
          building.captureProgress = Math.max(
            0,
            building.captureProgress - dt / BalanceConfig.CAPTURE_TIME,
          );
          if (building.captureProgress === 0) {
            building.capturePlayerId = null;
          }
        }
        continue;
      }

      // Exactly one side occupying
      const [occupierId] = [...occupiers];

      // Switch of side resets progress
      if (
        building.capturePlayerId !== null &&
        building.capturePlayerId !== occupierId
      ) {
        building.captureProgress = 0;
      }
      building.capturePlayerId = occupierId;
      building.captureProgress = Math.min(
        1,
        building.captureProgress + dt / BalanceConfig.CAPTURE_TIME,
      );

      if (building.captureProgress >= 1) {
        _captureBuilding(state, building.id, occupierId);
      }
    }
  },
};

// ---------------------------------------------------------------------------
// captureBuilding — transfers ownership of a neutral building to a player
// ---------------------------------------------------------------------------

export function _captureBuilding(
  state: GameState,
  buildingId: string,
  newOwner: string,
): void {
  const building = state.buildings.get(buildingId);
  if (!building) return;

  const player = state.players.get(newOwner);
  if (!player) return;

  building.owner = newOwner;
  building.captureProgress = 1;
  building.capturePlayerId = newOwner;

  // Captured neutral buildings produce barracks-equivalent units
  building.shopInventory = [
    UnitType.SWORDSMAN,
    UnitType.PIKEMAN,
    UnitType.KNIGHT,
  ];

  // Register in player's building list
  if (!player.ownedBuildings.includes(buildingId)) {
    player.ownedBuildings.push(buildingId);
  }

  EventBus.emit("buildingCaptured", { buildingId, newOwner });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getFootprintTiles(topLeft: Vec2, w: number, h: number): Vec2[] {
  const tiles: Vec2[] = [];
  for (let dy = 0; dy < h; dy++)
    for (let dx = 0; dx < w; dx++)
      tiles.push({ x: topLeft.x + dx, y: topLeft.y + dy });
  return tiles;
}

/** Maps a player's direction to their expected territory zone. */
function playerZone(direction: Direction): TileZone {
  return direction === Direction.WEST ? "west" : "east";
}

function zoneAllowed(
  tileZone: TileZone,
  ownerZone: TileZone,
  placementZone: "own" | "neutral" | "any",
): boolean {
  if (placementZone === "any") return true;
  if (placementZone === "neutral") return tileZone === "neutral";
  return tileZone === ownerZone; // "own"
}
