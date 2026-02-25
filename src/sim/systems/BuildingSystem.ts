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

let _turretProjectileCounter = 0;

// ---------------------------------------------------------------------------
// Placement result
// ---------------------------------------------------------------------------

export type PlacementFailReason =
  | "insufficient_gold"
  | "out_of_bounds"
  | "tile_not_walkable"
  | "overlap"
  | "wrong_territory"
  | "max_count_reached"
  | "prerequisite_not_met"
  | "too_close";

/** Minimum gap (in tiles) required between any two buildings. */
export const BUILDING_MIN_GAP = 1;

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
 *  5. No existing building within BUILDING_MIN_GAP tiles of the footprint
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

  // 2. Max-count check
  if (def.maxCount !== undefined) {
    const owned = _countOwnedType(state, playerId, type);
    if (owned >= def.maxCount) {
      return { ok: false, reason: "max_count_reached" };
    }
  }

  // 3. Prerequisite check
  if (def.prerequisite) {
    const prereqMet = def.prerequisite.types.every(
      (type) =>
        _countOwnedType(state, playerId, type) >= def.prerequisite!.minCount,
    );
    if (!prereqMet) {
      return { ok: false, reason: "prerequisite_not_met" };
    }
  }

  // 4 & 5 & 6. Footprint tile checks
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

  // 7. Minimum-gap check — no existing building tile may be within BUILDING_MIN_GAP
  //    tiles of any footprint tile (Chebyshev distance).
  const gap = BUILDING_MIN_GAP;
  for (let dy = -gap; dy < def.footprint.h + gap; dy++) {
    for (let dx = -gap; dx < def.footprint.w + gap; dx++) {
      // Skip the footprint itself (already checked above)
      if (dx >= 0 && dx < def.footprint.w && dy >= 0 && dy < def.footprint.h)
        continue;
      const tile = getTile(state.battlefield, position.x + dx, position.y + dy);
      if (tile && tile.buildingId !== null) {
        return { ok: false, reason: "too_close" };
      }
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

      // --- Turret update ---
      if (building.owner !== null && building.turrets.length > 0) {
        _updateTurrets(state, building, dt);
      }

      const def = BUILDING_DEFINITIONS[building.type];

      // --- Owned capturable buildings (e.g. Town): enemy units can contest ---
      if (building.owner !== null && def.capturable) {
        const occupiers = new Set<string>();
        for (const unit of state.units.values()) {
          if (unit.state === UnitState.DIE) continue;
          if (distanceSq(unit.position, building.position) <= rangeSq) {
            occupiers.add(unit.owner);
          }
        }

        const hasEnemy = [...occupiers].some((id) => id !== building.owner);
        const hasOwner = occupiers.has(building.owner!);

        if (hasEnemy && !hasOwner) {
          // Enemy contesting unopposed — decay ownership progress toward 0
          building.captureProgress = Math.max(
            0,
            building.captureProgress - dt / BalanceConfig.CAPTURE_TIME,
          );
          if (building.captureProgress <= 0) {
            // Strip ownership — building becomes neutral
            const prevOwner = state.players.get(building.owner!);
            if (prevOwner) {
              prevOwner.ownedBuildings = prevOwner.ownedBuildings.filter(
                (id) => id !== building.id,
              );
            }
            building.owner = null;
            building.captureProgress = 0;
            building.capturePlayerId = null;
            EventBus.emit("buildingCaptured", {
              buildingId: building.id,
              newOwner: null,
            });
          }
        }
        // Contested (both sides) or owner alone → no change to progress
        continue;
      }

      if (building.owner !== null) continue; // non-capturable owned building

      // --- Neutral buildings: standard capture logic ---
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

  // Only non-capturable neutral buildings (generic outposts) get a shop on capture.
  // Capturable buildings (e.g. Town) keep their own fixed shop inventory.
  const def = BUILDING_DEFINITIONS[building.type];
  if (!def.capturable && building.shopInventory.length === 0) {
    building.shopInventory = [
      UnitType.SWORDSMAN,
      UnitType.PIKEMAN,
      UnitType.KNIGHT,
    ];
  }

  // Register in player's building list
  if (!player.ownedBuildings.includes(buildingId)) {
    player.ownedBuildings.push(buildingId);
  }

  EventBus.emit("buildingCaptured", { buildingId, newOwner });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Count how many active buildings of a given type a player currently owns. */
function _countOwnedType(
  state: GameState,
  playerId: PlayerId,
  type: BuildingType,
): number {
  let count = 0;
  for (const id of state.players.get(playerId)?.ownedBuildings ?? []) {
    const b = state.buildings.get(id);
    if (b && b.type === type && b.state === BuildingState.ACTIVE) count++;
  }
  return count;
}

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

// ---------------------------------------------------------------------------
// Turret logic
// ---------------------------------------------------------------------------

function _updateTurrets(
  state: GameState,
  building: ReturnType<typeof import("@sim/entities/Building").createBuilding>,
  dt: number,
): void {
  // Centre tile of the building footprint (for range checks and projectile origin)
  const def = BUILDING_DEFINITIONS[building.type];
  const cx = building.position.x + def.footprint.w / 2;
  const cy = building.position.y + def.footprint.h / 2;

  for (const turret of building.turrets) {
    turret.attackTimer -= dt;

    const rangeSq = turret.range * turret.range;

    // Validate existing target
    if (turret.targetId) {
      const existing = state.units.get(turret.targetId);
      if (
        !existing ||
        existing.state === UnitState.DIE ||
        existing.owner === building.owner ||
        distanceSq({ x: cx, y: cy }, existing.position) > rangeSq
      ) {
        turret.targetId = null;
      }
    }

    // Acquire new target if none
    if (!turret.targetId) {
      let bestDsq = rangeSq + 1;
      for (const unit of state.units.values()) {
        if (unit.state === UnitState.DIE) continue;
        if (unit.owner === building.owner) continue;
        const dsq = distanceSq({ x: cx, y: cy }, unit.position);
        if (dsq <= rangeSq && dsq < bestDsq) {
          bestDsq = dsq;
          turret.targetId = unit.id;
        }
      }
    }

    if (!turret.targetId || turret.attackTimer > 0) continue;

    // Fire!
    turret.attackTimer = 1 / turret.attackSpeed;
    const target = state.units.get(turret.targetId)!;
    const projectileId = `bturret-${turret.projectileTag}-${++_turretProjectileCounter}`;

    state.projectiles.set(projectileId, {
      id: projectileId,
      abilityId: `${building.id}-turret`,
      ownerId: building.id,
      ownerPlayerId: building.owner!,
      origin: { x: cx, y: cy },
      target: { ...target.position },
      position: { x: cx, y: cy },
      speed: 14, // fast arrow
      damage: turret.damage,
      aoeRadius: 0,
      bounceTargets: [],
      maxBounces: 0,
      bounceRange: 0,
      targetId: turret.targetId,
      hitIds: new Set(),
      slowDuration: 0,
      slowFactor: 1,
    });

    EventBus.emit("projectileCreated", {
      projectileId,
      origin: { x: cx, y: cy },
      target: { ...target.position },
    });
  }
}
