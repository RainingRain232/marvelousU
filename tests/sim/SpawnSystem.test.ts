import { describe, it, expect, beforeEach } from "vitest";
import { SpawnSystem, addToQueue } from "@sim/systems/SpawnSystem";
import { createGameState } from "@sim/state/GameState";
import { createBuilding } from "@sim/entities/Building";
import { _resetUnitIdCounter } from "@sim/entities/Unit";
import { EventBus } from "@sim/core/EventBus";
import { BuildingType, Direction, UnitType } from "@/types";
import { UNIT_DEFINITIONS } from "@sim/config/UnitDefinitions";
import { BalanceConfig } from "@sim/config/BalanceConfig";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBarracks(id = "b-1", owner = "p1") {
  return createBuilding({
    id,
    type: BuildingType.BARRACKS,
    owner,
    position: { x: 5, y: 5 },
  });
}

function makeState() {
  const state = createGameState();
  const b = makeBarracks();
  state.buildings.set(b.id, b);
  return state;
}

beforeEach(() => {
  _resetUnitIdCounter();
  EventBus.clear();
});

// ---------------------------------------------------------------------------
// addToQueue
// ---------------------------------------------------------------------------

describe("addToQueue", () => {
  it("adds an entry to the building's spawn queue", () => {
    const state = makeState();
    addToQueue(state, "b-1", UnitType.SWORDSMAN);
    expect(state.buildings.get("b-1")!.spawnQueue.entries).toHaveLength(1);
  });

  it("sets remainingTime from the unit definition's spawnTime", () => {
    const state = makeState();
    addToQueue(state, "b-1", UnitType.SWORDSMAN);
    const entry = state.buildings.get("b-1")!.spawnQueue.entries[0];
    expect(entry.remainingTime).toBe(UNIT_DEFINITIONS[UnitType.SWORDSMAN].spawnTime);
  });

  it("records the correct unitType", () => {
    const state = makeState();
    addToQueue(state, "b-1", UnitType.ARCHER);
    const entry = state.buildings.get("b-1")!.spawnQueue.entries[0];
    expect(entry.unitType).toBe(UnitType.ARCHER);
  });

  it("queues multiple entries in order", () => {
    const state = makeState();
    addToQueue(state, "b-1", UnitType.SWORDSMAN);
    addToQueue(state, "b-1", UnitType.ARCHER);
    addToQueue(state, "b-1", UnitType.KNIGHT);
    const entries = state.buildings.get("b-1")!.spawnQueue.entries;
    expect(entries).toHaveLength(3);
    expect(entries[0].unitType).toBe(UnitType.SWORDSMAN);
    expect(entries[1].unitType).toBe(UnitType.ARCHER);
    expect(entries[2].unitType).toBe(UnitType.KNIGHT);
  });

  it("throws when buildingId does not exist", () => {
    const state = makeState();
    expect(() => addToQueue(state, "missing", UnitType.SWORDSMAN)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// SpawnSystem.update — timer ticking
// ---------------------------------------------------------------------------

describe("SpawnSystem.update — timer ticking", () => {
  it("decrements remainingTime by dt each tick", () => {
    const state = makeState();
    addToQueue(state, "b-1", UnitType.SWORDSMAN); // spawnTime = 3s
    SpawnSystem.update(state, 1);
    const entry = state.buildings.get("b-1")!.spawnQueue.entries[0];
    expect(entry.remainingTime).toBeCloseTo(2);
  });

  it("moves entry to readyUnits when timer reaches 0", () => {
    const state = makeState();
    addToQueue(state, "b-1", UnitType.SWORDSMAN); // spawnTime = 3s
    SpawnSystem.update(state, 3);
    const queue = state.buildings.get("b-1")!.spawnQueue;
    expect(queue.entries).toHaveLength(0);
    expect(queue.readyUnits).toHaveLength(1);
    expect(queue.readyUnits[0]).toBe(UnitType.SWORDSMAN);
  });

  it("moves entry to readyUnits when timer goes past 0 (overshoot)", () => {
    const state = makeState();
    addToQueue(state, "b-1", UnitType.SWORDSMAN); // spawnTime = 3s
    SpawnSystem.update(state, 5); // overshoot
    const queue = state.buildings.get("b-1")!.spawnQueue;
    expect(queue.readyUnits).toHaveLength(1);
    expect(queue.entries).toHaveLength(0);
  });

  it("only ticks the front entry (sequential training)", () => {
    const state = makeState();
    addToQueue(state, "b-1", UnitType.SWORDSMAN); // 3s
    addToQueue(state, "b-1", UnitType.ARCHER);    // 4s
    SpawnSystem.update(state, 1);
    const entries = state.buildings.get("b-1")!.spawnQueue.entries;
    // Front decremented, second untouched
    expect(entries[0].remainingTime).toBeCloseTo(2);
    expect(entries[1].remainingTime).toBe(UNIT_DEFINITIONS[UnitType.ARCHER].spawnTime);
  });

  it("advances to the next entry after front completes", () => {
    const state = makeState();
    addToQueue(state, "b-1", UnitType.SWORDSMAN); // 3s
    addToQueue(state, "b-1", UnitType.ARCHER);    // 4s
    // Complete first entry
    SpawnSystem.update(state, 3);
    const entries = state.buildings.get("b-1")!.spawnQueue.entries;
    expect(entries).toHaveLength(1);
    expect(entries[0].unitType).toBe(UnitType.ARCHER);
    expect(entries[0].remainingTime).toBe(UNIT_DEFINITIONS[UnitType.ARCHER].spawnTime);
  });

  it("does nothing when queue is empty", () => {
    const state = makeState();
    expect(() => SpawnSystem.update(state, 1)).not.toThrow();
    const queue = state.buildings.get("b-1")!.spawnQueue;
    expect(queue.entries).toHaveLength(0);
    expect(queue.readyUnits).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// SpawnSystem.update — group threshold & deployment
// ---------------------------------------------------------------------------

describe("SpawnSystem.update — group threshold", () => {
  it("does not deploy when readyUnits < threshold", () => {
    const state = makeState();
    // threshold is DEFAULT_GROUP_THRESHOLD = 3
    addToQueue(state, "b-1", UnitType.SWORDSMAN);
    SpawnSystem.update(state, 3); // completes 1 unit → 1 ready, below threshold
    expect(state.units.size).toBe(0);
  });

  it("deploys when readyUnits reaches threshold", () => {
    const state = makeState();
    // Queue 3 swordsmen (threshold = 3), train all at once
    addToQueue(state, "b-1", UnitType.SWORDSMAN);
    addToQueue(state, "b-1", UnitType.SWORDSMAN);
    addToQueue(state, "b-1", UnitType.SWORDSMAN);
    // Train them one at a time
    SpawnSystem.update(state, 3); // 1 ready
    SpawnSystem.update(state, 3); // 2 ready
    SpawnSystem.update(state, 3); // 3 ready → deploy
    expect(state.units.size).toBe(3);
  });

  it("clears readyUnits after deployment", () => {
    const state = makeState();
    addToQueue(state, "b-1", UnitType.SWORDSMAN);
    addToQueue(state, "b-1", UnitType.SWORDSMAN);
    addToQueue(state, "b-1", UnitType.SWORDSMAN);
    SpawnSystem.update(state, 3);
    SpawnSystem.update(state, 3);
    SpawnSystem.update(state, 3);
    expect(state.buildings.get("b-1")!.spawnQueue.readyUnits).toHaveLength(0);
  });

  it("created units are added to state.units", () => {
    const state = makeState();
    addToQueue(state, "b-1", UnitType.SWORDSMAN);
    addToQueue(state, "b-1", UnitType.ARCHER);
    addToQueue(state, "b-1", UnitType.KNIGHT);
    SpawnSystem.update(state, 3); // swordsman ready
    SpawnSystem.update(state, 4); // archer ready
    SpawnSystem.update(state, 5); // knight ready → deploy
    expect(state.units.size).toBe(3);
  });

  it("deployed units have the correct owner", () => {
    const state = makeState();
    addToQueue(state, "b-1", UnitType.SWORDSMAN);
    addToQueue(state, "b-1", UnitType.SWORDSMAN);
    addToQueue(state, "b-1", UnitType.SWORDSMAN);
    SpawnSystem.update(state, 3);
    SpawnSystem.update(state, 3);
    SpawnSystem.update(state, 3);
    for (const unit of state.units.values()) {
      expect(unit.owner).toBe("p1");
    }
  });

  it("deployed units have the correct types", () => {
    const state = makeState();
    addToQueue(state, "b-1", UnitType.SWORDSMAN);
    addToQueue(state, "b-1", UnitType.ARCHER);
    addToQueue(state, "b-1", UnitType.KNIGHT);
    SpawnSystem.update(state, 3);
    SpawnSystem.update(state, 4);
    SpawnSystem.update(state, 5);
    const types = [...state.units.values()].map((u) => u.type).sort();
    expect(types).toEqual([UnitType.ARCHER, UnitType.KNIGHT, UnitType.SWORDSMAN].sort());
  });

  it("deploys with a custom groupThreshold", () => {
    const state = makeState();
    state.buildings.get("b-1")!.spawnQueue.groupThreshold = 2;
    addToQueue(state, "b-1", UnitType.SWORDSMAN);
    addToQueue(state, "b-1", UnitType.SWORDSMAN);
    SpawnSystem.update(state, 3); // 1 ready
    expect(state.units.size).toBe(0);
    SpawnSystem.update(state, 3); // 2 ready → deploy
    expect(state.units.size).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// SpawnSystem.update — events
// ---------------------------------------------------------------------------

describe("SpawnSystem.update — events", () => {
  it("emits unitSpawned for each unit in the group", () => {
    const state = makeState();
    const spawned: unknown[] = [];
    EventBus.on("unitSpawned", (p) => spawned.push(p));

    addToQueue(state, "b-1", UnitType.SWORDSMAN);
    addToQueue(state, "b-1", UnitType.SWORDSMAN);
    addToQueue(state, "b-1", UnitType.SWORDSMAN);
    SpawnSystem.update(state, 3);
    SpawnSystem.update(state, 3);
    SpawnSystem.update(state, 3);

    expect(spawned).toHaveLength(3);
  });

  it("unitSpawned payload has correct buildingId", () => {
    const state = makeState();
    const spawned: Array<{ buildingId: string }> = [];
    EventBus.on("unitSpawned", (p) => spawned.push(p));

    addToQueue(state, "b-1", UnitType.SWORDSMAN);
    addToQueue(state, "b-1", UnitType.SWORDSMAN);
    addToQueue(state, "b-1", UnitType.SWORDSMAN);
    SpawnSystem.update(state, 3);
    SpawnSystem.update(state, 3);
    SpawnSystem.update(state, 3);

    for (const p of spawned) expect(p.buildingId).toBe("b-1");
  });

  it("emits groupSpawned once per group deploy", () => {
    const state = makeState();
    const groups: unknown[] = [];
    EventBus.on("groupSpawned", (p) => groups.push(p));

    addToQueue(state, "b-1", UnitType.SWORDSMAN);
    addToQueue(state, "b-1", UnitType.SWORDSMAN);
    addToQueue(state, "b-1", UnitType.SWORDSMAN);
    SpawnSystem.update(state, 3);
    SpawnSystem.update(state, 3);
    SpawnSystem.update(state, 3);

    expect(groups).toHaveLength(1);
  });

  it("groupSpawned payload contains all unit ids", () => {
    const state = makeState();
    const groups: Array<{ unitIds: string[]; buildingId: string }> = [];
    EventBus.on("groupSpawned", (p) => groups.push(p));

    addToQueue(state, "b-1", UnitType.SWORDSMAN);
    addToQueue(state, "b-1", UnitType.SWORDSMAN);
    addToQueue(state, "b-1", UnitType.SWORDSMAN);
    SpawnSystem.update(state, 3);
    SpawnSystem.update(state, 3);
    SpawnSystem.update(state, 3);

    expect(groups[0].unitIds).toHaveLength(3);
    expect(groups[0].buildingId).toBe("b-1");
    for (const id of groups[0].unitIds) {
      expect(state.units.has(id)).toBe(true);
    }
  });

  it("does not emit groupSpawned before threshold is reached", () => {
    const state = makeState();
    const groups: unknown[] = [];
    EventBus.on("groupSpawned", (p) => groups.push(p));

    addToQueue(state, "b-1", UnitType.SWORDSMAN);
    addToQueue(state, "b-1", UnitType.SWORDSMAN);
    SpawnSystem.update(state, 3);
    SpawnSystem.update(state, 3);

    expect(groups).toHaveLength(0);
  });

  it("emits two groupSpawned events for two complete groups", () => {
    const state = makeState();
    state.buildings.get("b-1")!.spawnQueue.groupThreshold = 2;
    const groups: unknown[] = [];
    EventBus.on("groupSpawned", (p) => groups.push(p));

    // First group
    addToQueue(state, "b-1", UnitType.SWORDSMAN);
    addToQueue(state, "b-1", UnitType.SWORDSMAN);
    SpawnSystem.update(state, 3);
    SpawnSystem.update(state, 3);
    // Second group
    addToQueue(state, "b-1", UnitType.ARCHER);
    addToQueue(state, "b-1", UnitType.ARCHER);
    SpawnSystem.update(state, 4);
    SpawnSystem.update(state, 4);

    expect(groups).toHaveLength(2);
    expect(state.units.size).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// SpawnSystem.update — multiple buildings
// ---------------------------------------------------------------------------

describe("SpawnSystem.update — multiple buildings", () => {
  it("ticks queues for all buildings independently", () => {
    const state = createGameState();
    const b1 = createBuilding({ id: "b-1", type: BuildingType.BARRACKS, owner: "p1", position: { x: 3, y: 3 } });
    const b2 = createBuilding({ id: "b-2", type: BuildingType.BARRACKS, owner: "p2", position: { x: 20, y: 3 } });
    state.buildings.set(b1.id, b1);
    state.buildings.set(b2.id, b2);

    addToQueue(state, "b-1", UnitType.SWORDSMAN); // 3s
    addToQueue(state, "b-2", UnitType.ARCHER);    // 4s

    SpawnSystem.update(state, 1);

    expect(state.buildings.get("b-1")!.spawnQueue.entries[0].remainingTime).toBeCloseTo(2);
    expect(state.buildings.get("b-2")!.spawnQueue.entries[0].remainingTime).toBeCloseTo(3);
  });
});
