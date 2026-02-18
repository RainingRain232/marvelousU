import { describe, it, expect, beforeEach } from "vitest";
import { BuildingSystem, _captureBuilding } from "@sim/systems/BuildingSystem";
import { createGameState } from "@sim/state/GameState";
import { createPlayerState } from "@sim/state/PlayerState";
import { createBuilding } from "@sim/entities/Building";
import { createUnit } from "@sim/entities/Unit";
import { EventBus } from "@sim/core/EventBus";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import {
  BuildingState,
  BuildingType,
  Direction,
  UnitState,
  UnitType,
} from "@/types";
import type { GameState } from "@sim/state/GameState";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DT = 1; // 1 second per tick for easy math

function makeState(): GameState {
  const state = createGameState(30, 20);
  state.players.set("p1", createPlayerState("p1", Direction.WEST, 100));
  state.players.set("p2", createPlayerState("p2", Direction.EAST, 100));
  return state;
}

/** Add a neutral ACTIVE building at a given position */
function addNeutralBuilding(
  state: GameState,
  id: string,
  pos = { x: 10, y: 10 },
): void {
  const bld = createBuilding({
    id,
    type: BuildingType.BARRACKS,
    owner: null,
    position: pos,
  });
  state.buildings.set(id, bld);
}

/** Add a live unit for a player at a given position */
function addUnit(
  state: GameState,
  id: string,
  owner: string,
  pos: { x: number; y: number },
): void {
  const unit = createUnit({
    id,
    type: UnitType.SWORDSMAN,
    owner,
    position: pos,
  });
  state.units.set(id, unit);
}

beforeEach(() => EventBus.clear());

// ---------------------------------------------------------------------------
// 1. No units — no progress change
// ---------------------------------------------------------------------------

describe("no occupiers", () => {
  it("does not advance progress when field is empty", () => {
    const state = makeState();
    addNeutralBuilding(state, "bld");
    BuildingSystem.update(state, DT);
    expect(state.buildings.get("bld")!.captureProgress).toBe(0);
  });

  it("decays progress when field becomes empty mid-capture", () => {
    const state = makeState();
    addNeutralBuilding(state, "bld");
    const bld = state.buildings.get("bld")!;
    bld.captureProgress = 0.5;
    bld.capturePlayerId = "p1";

    BuildingSystem.update(state, DT);

    expect(bld.captureProgress).toBeLessThan(0.5);
  });

  it("clears capturePlayerId when progress fully decays to 0", () => {
    const state = makeState();
    addNeutralBuilding(state, "bld");
    const bld = state.buildings.get("bld")!;
    bld.captureProgress = DT / BalanceConfig.CAPTURE_TIME; // exactly one tick worth
    bld.capturePlayerId = "p1";

    BuildingSystem.update(state, DT);

    expect(bld.captureProgress).toBe(0);
    expect(bld.capturePlayerId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 2. Single occupier advances progress
// ---------------------------------------------------------------------------

describe("sole occupier", () => {
  it("advances captureProgress by dt / CAPTURE_TIME per tick", () => {
    const state = makeState();
    addNeutralBuilding(state, "bld", { x: 10, y: 10 });
    addUnit(state, "u1", "p1", { x: 10, y: 10 }); // on building tile

    BuildingSystem.update(state, DT);

    const expected = DT / BalanceConfig.CAPTURE_TIME;
    expect(state.buildings.get("bld")!.captureProgress).toBeCloseTo(expected);
  });

  it("sets capturePlayerId to the occupying player", () => {
    const state = makeState();
    addNeutralBuilding(state, "bld", { x: 10, y: 10 });
    addUnit(state, "u1", "p1", { x: 10, y: 10 });

    BuildingSystem.update(state, DT);

    expect(state.buildings.get("bld")!.capturePlayerId).toBe("p1");
  });

  it("captures building when progress reaches 1", () => {
    const state = makeState();
    addNeutralBuilding(state, "bld", { x: 10, y: 10 });
    addUnit(state, "u1", "p1", { x: 10, y: 10 });

    // Tick enough to fill progress
    BuildingSystem.update(state, BalanceConfig.CAPTURE_TIME);

    const bld = state.buildings.get("bld")!;
    expect(bld.owner).toBe("p1");
    expect(bld.captureProgress).toBe(1);
  });

  it("does not exceed captureProgress of 1", () => {
    const state = makeState();
    addNeutralBuilding(state, "bld", { x: 10, y: 10 });
    addUnit(state, "u1", "p1", { x: 10, y: 10 });

    BuildingSystem.update(state, BalanceConfig.CAPTURE_TIME * 10);

    expect(state.buildings.get("bld")!.captureProgress).toBe(1);
  });

  it("ignores dead units for occupier check", () => {
    const state = makeState();
    addNeutralBuilding(state, "bld", { x: 10, y: 10 });
    addUnit(state, "u1", "p1", { x: 10, y: 10 });
    state.units.get("u1")!.state = UnitState.DIE;

    BuildingSystem.update(state, DT);

    expect(state.buildings.get("bld")!.captureProgress).toBe(0);
    expect(state.buildings.get("bld")!.capturePlayerId).toBeNull();
  });

  it("accepts units within CAPTURE_RANGE but not exactly on tile", () => {
    const state = makeState();
    addNeutralBuilding(state, "bld", { x: 10, y: 10 });
    // Place unit just inside range
    const offset = BalanceConfig.CAPTURE_RANGE - 0.1;
    addUnit(state, "u1", "p1", { x: 10 + offset, y: 10 });

    BuildingSystem.update(state, DT);

    expect(state.buildings.get("bld")!.captureProgress).toBeGreaterThan(0);
  });

  it("ignores units just outside CAPTURE_RANGE", () => {
    const state = makeState();
    addNeutralBuilding(state, "bld", { x: 10, y: 10 });
    const offset = BalanceConfig.CAPTURE_RANGE + 0.1;
    addUnit(state, "u1", "p1", { x: 10 + offset, y: 10 });

    BuildingSystem.update(state, DT);

    expect(state.buildings.get("bld")!.captureProgress).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 3. Contested — both sides present
// ---------------------------------------------------------------------------

describe("contested building", () => {
  it("resets progress to 0 when both sides are present", () => {
    const state = makeState();
    addNeutralBuilding(state, "bld", { x: 10, y: 10 });
    const bld = state.buildings.get("bld")!;
    bld.captureProgress = 0.7;
    bld.capturePlayerId = "p1";

    addUnit(state, "u1", "p1", { x: 10, y: 10 });
    addUnit(state, "u2", "p2", { x: 10, y: 10 });

    BuildingSystem.update(state, DT);

    expect(bld.captureProgress).toBe(0);
    expect(bld.capturePlayerId).toBeNull();
  });

  it("does not capture when contested even after many ticks", () => {
    const state = makeState();
    addNeutralBuilding(state, "bld", { x: 10, y: 10 });
    addUnit(state, "u1", "p1", { x: 10, y: 10 });
    addUnit(state, "u2", "p2", { x: 10, y: 10 });

    for (let i = 0; i < 20; i++) {
      BuildingSystem.update(state, DT);
    }

    expect(state.buildings.get("bld")!.owner).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 4. Side switch resets progress
// ---------------------------------------------------------------------------

describe("side switch", () => {
  it("resets progress when a different player takes over an in-progress capture", () => {
    const state = makeState();
    addNeutralBuilding(state, "bld", { x: 10, y: 10 });
    const bld = state.buildings.get("bld")!;
    bld.captureProgress = 0.6;
    bld.capturePlayerId = "p1";

    // Now p2 arrives alone (p1's unit gone)
    addUnit(state, "u2", "p2", { x: 10, y: 10 });

    BuildingSystem.update(state, DT);

    // Progress reset to 0, then advanced by one tick for p2
    const expected = DT / BalanceConfig.CAPTURE_TIME;
    expect(bld.captureProgress).toBeCloseTo(expected);
    expect(bld.capturePlayerId).toBe("p2");
  });
});

// ---------------------------------------------------------------------------
// 5. _captureBuilding helper
// ---------------------------------------------------------------------------

describe("_captureBuilding", () => {
  it("sets owner and captureProgress=1", () => {
    const state = makeState();
    addNeutralBuilding(state, "bld");

    _captureBuilding(state, "bld", "p1");

    const bld = state.buildings.get("bld")!;
    expect(bld.owner).toBe("p1");
    expect(bld.captureProgress).toBe(1);
  });

  it("sets barracks-equivalent shopInventory", () => {
    const state = makeState();
    addNeutralBuilding(state, "bld");

    _captureBuilding(state, "bld", "p1");

    const bld = state.buildings.get("bld")!;
    expect(bld.shopInventory).toContain(UnitType.SWORDSMAN);
    expect(bld.shopInventory).toContain(UnitType.PIKEMAN);
    expect(bld.shopInventory).toContain(UnitType.KNIGHT);
  });

  it("adds buildingId to player's ownedBuildings", () => {
    const state = makeState();
    addNeutralBuilding(state, "bld");

    _captureBuilding(state, "bld", "p1");

    expect(state.players.get("p1")!.ownedBuildings).toContain("bld");
  });

  it("does not duplicate ownedBuildings entry on double-call", () => {
    const state = makeState();
    addNeutralBuilding(state, "bld");

    _captureBuilding(state, "bld", "p1");
    _captureBuilding(state, "bld", "p1");

    const owned = state.players.get("p1")!.ownedBuildings;
    expect(owned.filter((id) => id === "bld").length).toBe(1);
  });

  it("emits buildingCaptured event with correct payload", () => {
    const state = makeState();
    addNeutralBuilding(state, "bld");

    const events: unknown[] = [];
    EventBus.on("buildingCaptured", (e) => events.push(e));

    _captureBuilding(state, "bld", "p1");

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ buildingId: "bld", newOwner: "p1" });
  });

  it("is a no-op when buildingId does not exist", () => {
    const state = makeState();
    expect(() => _captureBuilding(state, "nonexistent", "p1")).not.toThrow();
  });

  it("is a no-op when player does not exist", () => {
    const state = makeState();
    addNeutralBuilding(state, "bld");
    expect(() => _captureBuilding(state, "bld", "ghost")).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 6. Skip non-neutral / destroyed buildings
// ---------------------------------------------------------------------------

describe("skip non-capturable buildings", () => {
  it("does not alter already-owned buildings", () => {
    const state = makeState();
    const bld = createBuilding({
      id: "bld",
      type: BuildingType.BARRACKS,
      owner: "p1",
      position: { x: 10, y: 10 },
    });
    state.buildings.set("bld", bld);
    addUnit(state, "u2", "p2", { x: 10, y: 10 });

    BuildingSystem.update(state, DT);

    // Building still owned by p1
    expect(state.buildings.get("bld")!.owner).toBe("p1");
  });

  it("does not process destroyed buildings", () => {
    const state = makeState();
    addNeutralBuilding(state, "bld");
    state.buildings.get("bld")!.state = BuildingState.DESTROYED;
    addUnit(state, "u1", "p1", { x: 10, y: 10 });

    BuildingSystem.update(state, DT);

    expect(state.buildings.get("bld")!.captureProgress).toBe(0);
  });
});
