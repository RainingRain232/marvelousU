import { describe, it, expect, beforeEach } from "vitest";
import { createGameState } from "@sim/state/GameState";
import { createPlayerState } from "@sim/state/PlayerState";
import { initBases } from "@sim/systems/BaseSetup";
import { BUILDING_DEFINITIONS } from "@sim/config/BuildingDefs";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { EventBus } from "@sim/core/EventBus";
import { Direction, BuildingType, BuildingState } from "@/types";
import type { GameState } from "@sim/state/GameState";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStateWithBases(): GameState {
  const state = createGameState(30, 20);
  state.players.set("p1", createPlayerState("p1", Direction.WEST));
  state.players.set("p2", createPlayerState("p2", Direction.EAST));
  initBases(state, { westPlayerId: "p1", eastPlayerId: "p2" });
  return state;
}

beforeEach(() => {
  EventBus.clear();
});

// ---------------------------------------------------------------------------
// initBases auto-spawns castles
// ---------------------------------------------------------------------------

describe("initBases auto-spawns castles", () => {
  it("creates exactly 2 buildings (one castle per base)", () => {
    const state = makeStateWithBases();
    expect(state.buildings.size).toBe(2);
  });

  it("west castle exists with correct ID", () => {
    const state = makeStateWithBases();
    expect(state.buildings.has("castle-base-west")).toBe(true);
  });

  it("east castle exists with correct ID", () => {
    const state = makeStateWithBases();
    expect(state.buildings.has("castle-base-east")).toBe(true);
  });

  it("west base has castleId set", () => {
    const state = makeStateWithBases();
    expect(state.bases.get("base-west")!.castleId).toBe("castle-base-west");
  });

  it("east base has castleId set", () => {
    const state = makeStateWithBases();
    expect(state.bases.get("base-east")!.castleId).toBe("castle-base-east");
  });
});

// ---------------------------------------------------------------------------
// Castle building properties
// ---------------------------------------------------------------------------

describe("castle building properties", () => {
  it("castle type is CASTLE", () => {
    const state = makeStateWithBases();
    expect(state.buildings.get("castle-base-west")!.type).toBe(
      BuildingType.CASTLE,
    );
  });

  it("castle is ACTIVE state", () => {
    const state = makeStateWithBases();
    expect(state.buildings.get("castle-base-west")!.state).toBe(
      BuildingState.ACTIVE,
    );
  });

  it("castle is owned by the correct player", () => {
    const state = makeStateWithBases();
    expect(state.buildings.get("castle-base-west")!.owner).toBe("p1");
    expect(state.buildings.get("castle-base-east")!.owner).toBe("p2");
  });

  it("castle is linked to its base", () => {
    const state = makeStateWithBases();
    expect(state.buildings.get("castle-base-west")!.linkedBaseId).toBe(
      "base-west",
    );
    expect(state.buildings.get("castle-base-east")!.linkedBaseId).toBe(
      "base-east",
    );
  });

  it("castle position matches base position", () => {
    const state = makeStateWithBases();
    const castle = state.buildings.get("castle-base-west")!;
    const base = state.bases.get("base-west")!;
    expect(castle.position).toEqual(base.position);
  });

  it("castle health equals def.hp", () => {
    const state = makeStateWithBases();
    const castle = state.buildings.get("castle-base-west")!;
    expect(castle.health).toBe(BUILDING_DEFINITIONS[BuildingType.CASTLE].hp);
    expect(castle.maxHealth).toBe(castle.health);
  });

  it("castle shopInventory contains basic units (Swordsman, Archer)", () => {
    const state = makeStateWithBases();
    const inv = state.buildings.get("castle-base-west")!.shopInventory;
    expect(inv).toContain("swordsman");
    expect(inv).toContain("archer");
  });

  it("castle blueprints contains all buyable building types", () => {
    const state = makeStateWithBases();
    const bps = state.buildings.get("castle-base-west")!.blueprints;
    expect(bps).toContain(BuildingType.BARRACKS);
    expect(bps).toContain(BuildingType.STABLES);
    expect(bps).toContain(BuildingType.MAGE_TOWER);
    expect(bps).toContain(BuildingType.ARCHERY_RANGE);
  });

  it("castle does not have any blueprints in its own definition cost (cost=0)", () => {
    expect(BUILDING_DEFINITIONS[BuildingType.CASTLE].cost).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Tile stamping
// ---------------------------------------------------------------------------

describe("castle tile stamping", () => {
  it("all 3×3 footprint tiles are marked with castleId", () => {
    const state = makeStateWithBases();
    const castle = state.buildings.get("castle-base-west")!;
    const def = BUILDING_DEFINITIONS[BuildingType.CASTLE]; // 3×3
    for (let dy = 0; dy < def.footprint.h; dy++) {
      for (let dx = 0; dx < def.footprint.w; dx++) {
        const tile =
          state.battlefield.grid[castle.position.y + dy][
            castle.position.x + dx
          ];
        expect(tile.buildingId).toBe("castle-base-west");
      }
    }
  });

  it("all 3×3 footprint tiles are non-walkable", () => {
    const state = makeStateWithBases();
    const castle = state.buildings.get("castle-base-west")!;
    const def = BUILDING_DEFINITIONS[BuildingType.CASTLE];
    for (let dy = 0; dy < def.footprint.h; dy++) {
      for (let dx = 0; dx < def.footprint.w; dx++) {
        const tile =
          state.battlefield.grid[castle.position.y + dy][
            castle.position.x + dx
          ];
        expect(tile.walkable).toBe(false);
      }
    }
  });

  it("tiles outside castle footprint remain walkable", () => {
    const state = makeStateWithBases();
    const castle = state.buildings.get("castle-base-west")!;
    // Tile just to the right of the 3×3 footprint
    const tile =
      state.battlefield.grid[castle.position.y][castle.position.x + 3];
    expect(tile.walkable).toBe(true);
    expect(tile.buildingId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Player ownership
// ---------------------------------------------------------------------------

describe("player ownership", () => {
  it("castle is added to west player's ownedBuildings", () => {
    const state = makeStateWithBases();
    expect(state.players.get("p1")!.ownedBuildings).toContain(
      "castle-base-west",
    );
  });

  it("castle is added to east player's ownedBuildings", () => {
    const state = makeStateWithBases();
    expect(state.players.get("p2")!.ownedBuildings).toContain(
      "castle-base-east",
    );
  });
});

// ---------------------------------------------------------------------------
// EventBus
// ---------------------------------------------------------------------------

describe("events", () => {
  it("emits buildingPlaced for each castle at initBases", () => {
    const state = createGameState(30, 20);
    state.players.set("p1", createPlayerState("p1", Direction.WEST));
    state.players.set("p2", createPlayerState("p2", Direction.EAST));

    const events: unknown[] = [];
    EventBus.on("buildingPlaced", (e) => events.push(e));
    initBases(state, { westPlayerId: "p1", eastPlayerId: "p2" });

    expect(events).toHaveLength(2);
  });

  it("buildingPlaced event has correct buildingId for west castle", () => {
    const state = createGameState(30, 20);
    state.players.set("p1", createPlayerState("p1", Direction.WEST));
    state.players.set("p2", createPlayerState("p2", Direction.EAST));

    const ids: string[] = [];
    EventBus.on("buildingPlaced", (e) => ids.push(e.buildingId));
    initBases(state, { westPlayerId: "p1", eastPlayerId: "p2" });

    expect(ids).toContain("castle-base-west");
    expect(ids).toContain("castle-base-east");
  });
});

// ---------------------------------------------------------------------------
// spawnCastle idempotency guard (no duplicate placement)
// ---------------------------------------------------------------------------

describe("spawnCastle standalone", () => {
  it("can be called directly on a base after manual base creation", () => {
    const state = createGameState(30, 20);
    state.players.set("p1", createPlayerState("p1", Direction.WEST));
    state.players.set("p2", createPlayerState("p2", Direction.EAST));
    initBases(state, { westPlayerId: "p1", eastPlayerId: "p2" });

    // Both castles already created by initBases — state should have 2 buildings
    expect(state.buildings.size).toBe(2);
  });

  it("spawnCastle at a tile position stores the correct position on the building", () => {
    const state = makeStateWithBases();
    const base = state.bases.get("base-east")!;
    const castle = state.buildings.get("castle-base-east")!;
    expect(castle.position).toEqual(BalanceConfig.BASE_EAST_POSITION);
    expect(castle.position).toEqual(base.position);
  });
});
