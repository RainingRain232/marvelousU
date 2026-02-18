// Building system: placement validation, tick updates, destruction, capture.
import type { GameState } from "@sim/state/GameState";
import { getPlayer } from "@sim/state/GameState";
import { getTile, setBuilding, setWalkable } from "@sim/core/Grid";
import { BUILDING_DEFINITIONS } from "@sim/config/BuildingDefs";
import { createBuilding } from "@sim/entities/Building";
import { EventBus } from "@sim/core/EventBus";
import type { BuildingType, PlayerId, Vec2 } from "@/types";
import type { TileZone } from "@sim/state/BattlefieldState";
import { Direction } from "@/types";

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
// Tick update (future: destruction timers, capture ticks, etc.)
// ---------------------------------------------------------------------------

export const BuildingSystem = {
  update(_state: GameState, _dt: number): void {
    // TODO: building destruction timers, neutral capture ticking
  },
};

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
