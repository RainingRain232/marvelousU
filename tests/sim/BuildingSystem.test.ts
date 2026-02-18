import { describe, it, expect, beforeEach } from "vitest";
import {
  placeBuilding,
  _resetBuildingIdCounter,
} from "@sim/systems/BuildingSystem";
import { createGameState } from "@sim/state/GameState";
import { createPlayerState } from "@sim/state/PlayerState";
import { initBases } from "@sim/systems/BaseSetup";
import { setWalkable } from "@sim/core/Grid";
import { BUILDING_DEFINITIONS } from "@sim/config/BuildingDefs";
import { EventBus } from "@sim/core/EventBus";
import { Direction, BuildingType, BuildingState } from "@/types";
import type { GameState } from "@sim/state/GameState";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeState(): GameState {
  const state = createGameState(30, 20);
  state.players.set("p1", createPlayerState("p1", Direction.WEST, 500));
  state.players.set("p2", createPlayerState("p2", Direction.EAST, 500));
  initBases(state, { westPlayerId: "p1", eastPlayerId: "p2" });
  return state;
}

// West zone is tiles x=0..9, so a safe placement for p1 is around (4,5)
const WEST_POS = { x: 4, y: 5 };
// East zone is tiles x=20..29, so a safe placement for p2 is around (22,5)
const EAST_POS = { x: 22, y: 5 };
// Neutral zone x=10..19
const NEUTRAL_POS = { x: 14, y: 5 };

beforeEach(() => {
  _resetBuildingIdCounter();
  EventBus.clear();
});

// ---------------------------------------------------------------------------
// createBuilding factory (via placeBuilding success path)
// ---------------------------------------------------------------------------

describe("placeBuilding — success", () => {
  it("returns ok:true and a buildingId on valid placement", () => {
    const state = makeState();
    const result = placeBuilding(state, "p1", BuildingType.BARRACKS, WEST_POS);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.buildingId).toBeTruthy();
  });

  it("registers the building in state.buildings", () => {
    const state = makeState();
    const result = placeBuilding(state, "p1", BuildingType.BARRACKS, WEST_POS);
    expect(result.ok).toBe(true);
    if (result.ok) expect(state.buildings.has(result.buildingId)).toBe(true);
  });

  it("building starts ACTIVE", () => {
    const state = makeState();
    const result = placeBuilding(state, "p1", BuildingType.BARRACKS, WEST_POS);
    if (!result.ok) throw new Error("Expected ok");
    expect(state.buildings.get(result.buildingId)!.state).toBe(
      BuildingState.ACTIVE,
    );
  });

  it("building has correct type, owner, position", () => {
    const state = makeState();
    const result = placeBuilding(state, "p1", BuildingType.BARRACKS, WEST_POS);
    if (!result.ok) throw new Error("Expected ok");
    const b = state.buildings.get(result.buildingId)!;
    expect(b.type).toBe(BuildingType.BARRACKS);
    expect(b.owner).toBe("p1");
    expect(b.position).toEqual(WEST_POS);
  });

  it("deducts gold from player", () => {
    const state = makeState();
    const cost = BUILDING_DEFINITIONS[BuildingType.BARRACKS].cost; // 100
    const before = state.players.get("p1")!.gold;
    placeBuilding(state, "p1", BuildingType.BARRACKS, WEST_POS);
    expect(state.players.get("p1")!.gold).toBe(before - cost);
  });

  it("adds buildingId to player.ownedBuildings", () => {
    const state = makeState();
    const result = placeBuilding(state, "p1", BuildingType.BARRACKS, WEST_POS);
    if (!result.ok) throw new Error("Expected ok");
    expect(state.players.get("p1")!.ownedBuildings).toContain(
      result.buildingId,
    );
  });

  it("marks all footprint tiles as occupied (buildingId set)", () => {
    const state = makeState();
    const result = placeBuilding(state, "p1", BuildingType.BARRACKS, WEST_POS);
    if (!result.ok) throw new Error("Expected ok");
    const def = BUILDING_DEFINITIONS[BuildingType.BARRACKS]; // 2×2
    for (let dy = 0; dy < def.footprint.h; dy++)
      for (let dx = 0; dx < def.footprint.w; dx++) {
        const tile = state.battlefield.grid[WEST_POS.y + dy][WEST_POS.x + dx];
        expect(tile.buildingId).toBe(result.buildingId);
        expect(tile.walkable).toBe(false);
      }
  });

  it("emits buildingPlaced event with correct payload", () => {
    const state = makeState();
    const received: unknown[] = [];
    EventBus.on("buildingPlaced", (p) => received.push(p));
    const result = placeBuilding(state, "p1", BuildingType.BARRACKS, WEST_POS);
    if (!result.ok) throw new Error("Expected ok");
    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({
      buildingId: result.buildingId,
      position: WEST_POS,
      owner: "p1",
    });
  });

  it("links building to player's base", () => {
    const state = makeState();
    const result = placeBuilding(state, "p1", BuildingType.BARRACKS, WEST_POS);
    if (!result.ok) throw new Error("Expected ok");
    expect(state.buildings.get(result.buildingId)!.linkedBaseId).toBe(
      "base-west",
    );
  });
});

// ---------------------------------------------------------------------------
// Insufficient gold
// ---------------------------------------------------------------------------

describe("placeBuilding — insufficient gold", () => {
  it("returns insufficient_gold when player cannot afford it", () => {
    const state = createGameState(30, 20);
    state.players.set("p1", createPlayerState("p1", Direction.WEST, 0)); // broke
    state.players.set("p2", createPlayerState("p2", Direction.EAST, 500));
    initBases(state, { westPlayerId: "p1", eastPlayerId: "p2" });

    const result = placeBuilding(state, "p1", BuildingType.BARRACKS, WEST_POS);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("insufficient_gold");
  });

  it("does not deduct gold on failure", () => {
    const state = createGameState(30, 20);
    state.players.set("p1", createPlayerState("p1", Direction.WEST, 50));
    state.players.set("p2", createPlayerState("p2", Direction.EAST, 500));
    initBases(state, { westPlayerId: "p1", eastPlayerId: "p2" });

    placeBuilding(state, "p1", BuildingType.BARRACKS, WEST_POS); // costs 100
    expect(state.players.get("p1")!.gold).toBe(50); // unchanged
  });

  it("does not emit event on insufficient gold", () => {
    const state = createGameState(30, 20);
    state.players.set("p1", createPlayerState("p1", Direction.WEST, 0));
    state.players.set("p2", createPlayerState("p2", Direction.EAST, 500));
    initBases(state, { westPlayerId: "p1", eastPlayerId: "p2" });
    const cb = { called: false };
    EventBus.on("buildingPlaced", () => {
      cb.called = true;
    });
    placeBuilding(state, "p1", BuildingType.BARRACKS, WEST_POS);
    expect(cb.called).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Out of bounds
// ---------------------------------------------------------------------------

describe("placeBuilding — out of bounds", () => {
  it("returns out_of_bounds when position is negative", () => {
    const state = makeState();
    const result = placeBuilding(state, "p1", BuildingType.BARRACKS, {
      x: -1,
      y: 0,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("out_of_bounds");
  });

  it("returns out_of_bounds when footprint extends past grid bottom edge", () => {
    const state = makeState();
    // 2×2 footprint at y=19 needs y=20 — out of bounds on 20-tall grid; x=4 is valid west zone
    const result = placeBuilding(state, "p1", BuildingType.BARRACKS, {
      x: 4,
      y: 19,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("out_of_bounds");
  });
});

// ---------------------------------------------------------------------------
// Overlap
// ---------------------------------------------------------------------------

describe("placeBuilding — overlap", () => {
  it("returns overlap when a tile is already occupied by a building", () => {
    const state = makeState();
    // Place first building
    placeBuilding(state, "p1", BuildingType.BARRACKS, WEST_POS);
    // Try to place second at same spot
    const result = placeBuilding(state, "p1", BuildingType.BARRACKS, WEST_POS);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("overlap");
  });

  it("returns overlap even for partial footprint overlap", () => {
    const state = makeState();
    placeBuilding(state, "p1", BuildingType.BARRACKS, WEST_POS); // 2×2 at (4,5)
    // Place 1 tile to the right — overlaps at (5,5)
    const result = placeBuilding(state, "p1", BuildingType.BARRACKS, {
      x: WEST_POS.x + 1,
      y: WEST_POS.y,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("overlap");
  });

  it("returns tile_not_walkable when tile is blocked by terrain", () => {
    const state = makeState();
    setWalkable(state.battlefield, WEST_POS.x, WEST_POS.y, false);
    const result = placeBuilding(state, "p1", BuildingType.BARRACKS, WEST_POS);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("tile_not_walkable");
  });
});

// ---------------------------------------------------------------------------
// Wrong territory
// ---------------------------------------------------------------------------

describe("placeBuilding — wrong territory", () => {
  it("returns wrong_territory when west player tries to build in east zone", () => {
    const state = makeState();
    const result = placeBuilding(state, "p1", BuildingType.BARRACKS, EAST_POS);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("wrong_territory");
  });

  it("returns wrong_territory when east player tries to build in west zone", () => {
    const state = makeState();
    const result = placeBuilding(state, "p2", BuildingType.BARRACKS, WEST_POS);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("wrong_territory");
  });

  it("returns wrong_territory when player tries to build in neutral zone (own-only building)", () => {
    const state = makeState();
    const result = placeBuilding(
      state,
      "p1",
      BuildingType.BARRACKS,
      NEUTRAL_POS,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("wrong_territory");
  });

  it("east player can build in east zone", () => {
    const state = makeState();
    const result = placeBuilding(state, "p2", BuildingType.BARRACKS, EAST_POS);
    expect(result.ok).toBe(true);
  });

  it("does not modify state on wrong_territory", () => {
    const state = makeState();
    const before = state.players.get("p1")!.gold;
    placeBuilding(state, "p1", BuildingType.BARRACKS, EAST_POS);
    expect(state.players.get("p1")!.gold).toBe(before);
    expect(state.buildings.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// BuildingDefs completeness
// ---------------------------------------------------------------------------

describe("BUILDING_DEFINITIONS", () => {
  it("all building types have a definition", () => {
    for (const type of Object.values(BuildingType)) {
      expect(BUILDING_DEFINITIONS[type]).toBeDefined();
    }
  });

  it("Castle costs 0 gold", () => {
    expect(BUILDING_DEFINITIONS[BuildingType.CASTLE].cost).toBe(0);
  });

  it("Castle has a 3×3 footprint", () => {
    const fp = BUILDING_DEFINITIONS[BuildingType.CASTLE].footprint;
    expect(fp).toEqual({ w: 3, h: 3 });
  });

  it("Barracks produces Swordsman, Pikeman, Knight", () => {
    const inv = BUILDING_DEFINITIONS[BuildingType.BARRACKS].shopInventory;
    expect(inv).toContain("swordsman");
    expect(inv).toContain("pikeman");
    expect(inv).toContain("knight");
  });

  it("all buildings have positive hp", () => {
    for (const def of Object.values(BUILDING_DEFINITIONS)) {
      expect(def.hp).toBeGreaterThan(0);
    }
  });

  it("all buildings have a footprint of at least 1×1", () => {
    for (const def of Object.values(BUILDING_DEFINITIONS)) {
      expect(def.footprint.w).toBeGreaterThanOrEqual(1);
      expect(def.footprint.h).toBeGreaterThanOrEqual(1);
    }
  });
});
