// Castle initialisation — auto-spawns a Castle building at each base on game start.
//
// The Castle is NOT placed via placeBuilding() because:
//   - It costs 0 gold (no gold check needed)
//   - It bypasses territory validation (bases are placed by the engine, not the player)
//   - It needs a deterministic ID tied to the base ("castle-west", "castle-east")
//
// Call spawnCastle() for each base immediately after initBases().

import { BuildingType } from "@/types";
import { createBuilding } from "@sim/entities/Building";
import { setBuilding, setWalkable } from "@sim/core/Grid";
import { BUILDING_DEFINITIONS } from "@sim/config/BuildingDefs";
import { EventBus } from "@sim/core/EventBus";
import type { GameState } from "@sim/state/GameState";
import type { Base } from "@sim/entities/Base";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Spawn a Castle at the given base's position and wire everything together:
 *  - Creates Castle building with ID `"castle-<baseId>"`
 *  - Stamps all footprint tiles (buildingId, walkable=false)
 *  - Registers building on state.buildings
 *  - Adds to player.ownedBuildings
 *  - Sets base.castleId
 *  - Emits `buildingPlaced`
 */
export function spawnCastle(state: GameState, base: Base): void {
  const def = BUILDING_DEFINITIONS[BuildingType.CASTLE];
  const castleId = `castle-${base.id}`;
  const position = { ...base.position };

  // Stamp footprint tiles
  for (let dy = 0; dy < def.footprint.h; dy++) {
    for (let dx = 0; dx < def.footprint.w; dx++) {
      setBuilding(state.battlefield, position.x + dx, position.y + dy, castleId);
      setWalkable(state.battlefield, position.x + dx, position.y + dy, false);
    }
  }

  // Create and register building
  const castle = createBuilding({
    id: castleId,
    type: BuildingType.CASTLE,
    owner: base.owner,
    position,
    linkedBaseId: base.id,
  });
  state.buildings.set(castleId, castle);

  // Link to player
  const player = state.players.get(base.owner);
  if (player) {
    player.ownedBuildings.push(castleId);
  }

  // Link base → castle
  base.castleId = castleId;

  // Notify view layer
  EventBus.emit("buildingPlaced", {
    buildingId: castleId,
    position,
    owner: base.owner,
  });

  // Spawn companion firepit
  spawnFirepit(state, castle);
}

/**
 * Spawn a decorative firepit near the castle.
 * Positioned 2-3 tiles "inward" towards the map center.
 */
export function spawnFirepit(state: GameState, castle: any): void {
  const def = BUILDING_DEFINITIONS[BuildingType.FIREPIT];
  // Determine which side the castle is on by checking the player's slot
  const player = state.players.get(castle.owner);
  const slot = player?.slot ?? "nw";
  const isLeftSide = slot === "nw" || slot === "sw";

  // Random position 2-3 tiles away towards the center
  const dist = 2 + Math.floor(Math.random() * 2);
  const px = isLeftSide ? castle.position.x + 4 + dist : castle.position.x - def.footprint.w - dist;
  const py = castle.position.y + 1 + Math.floor(Math.random() * 2);

  const id = `firepit-${castle.id}`;
  const pos = { x: px, y: py };

  // Stamp footprint
  for (let dy = 0; dy < def.footprint.h; dy++) {
    for (let dx = 0; dx < def.footprint.w; dx++) {
      setBuilding(state.battlefield, pos.x + dx, pos.y + dy, id);
      setWalkable(state.battlefield, pos.x + dx, pos.y + dy, false);
    }
  }

  const firepit = createBuilding({
    id,
    type: BuildingType.FIREPIT,
    owner: castle.owner,
    position: pos,
  });
  state.buildings.set(id, firepit);

  EventBus.emit("buildingPlaced", {
    buildingId: id,
    position: pos,
    owner: castle.owner,
  });
}
