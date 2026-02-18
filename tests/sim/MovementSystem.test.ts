import { describe, it, expect, beforeEach } from "vitest";
import {
  MovementSystem,
  startMoving,
  startGroupMoving,
} from "@sim/systems/MovementSystem";
import { createGameState } from "@sim/state/GameState";
import { createUnit, _resetUnitIdCounter } from "@sim/entities/Unit";
import { initBases } from "@sim/systems/BaseSetup";
import { createPlayerState } from "@sim/state/PlayerState";
import { EventBus } from "@sim/core/EventBus";
import { Direction, UnitState, UnitType } from "@/types";
import type { GameState } from "@sim/state/GameState";
import type { Unit } from "@sim/entities/Unit";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeState(): GameState {
  const state = createGameState(30, 20);
  state.players.set("p1", createPlayerState("p1", Direction.WEST));
  state.players.set("p2", createPlayerState("p2", Direction.EAST));
  initBases(state, { westPlayerId: "p1", eastPlayerId: "p2" });
  return state;
}

function addMovingUnit(
  state: GameState,
  opts: {
    owner?: string;
    position?: { x: number; y: number };
    type?: UnitType;
    id?: string;
  },
): Unit {
  const unit = createUnit({
    id: opts.id,
    type: opts.type ?? UnitType.SWORDSMAN,
    owner: opts.owner ?? "p1",
    position: opts.position ?? { x: 5, y: 10 },
  });
  // Manually put into MOVE state (bypassing FSM for test setup)
  unit.stateMachine.setState(UnitState.MOVE);
  unit.state = UnitState.MOVE;
  state.units.set(unit.id, unit);
  return unit;
}

beforeEach(() => {
  _resetUnitIdCounter();
  EventBus.clear();
});

// ---------------------------------------------------------------------------
// startMoving helper
// ---------------------------------------------------------------------------

describe("startMoving", () => {
  it("transitions unit from IDLE to MOVE", () => {
    const state = makeState();
    const unit = createUnit({
      type: UnitType.SWORDSMAN,
      owner: "p1",
      position: { x: 5, y: 10 },
    });
    state.units.set(unit.id, unit);
    startMoving(state, unit);
    expect(unit.state).toBe(UnitState.MOVE);
  });

  it("emits unitStateChanged event", () => {
    const state = makeState();
    const unit = createUnit({
      type: UnitType.SWORDSMAN,
      owner: "p1",
      position: { x: 5, y: 10 },
    });
    state.units.set(unit.id, unit);
    const events: unknown[] = [];
    EventBus.on("unitStateChanged", (e) => events.push(e));
    startMoving(state, unit);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      from: UnitState.IDLE,
      to: UnitState.MOVE,
    });
  });

  it("computes a path immediately when goal is provided", () => {
    const state = makeState();
    const unit = createUnit({
      type: UnitType.SWORDSMAN,
      owner: "p1",
      position: { x: 5, y: 10 },
    });
    state.units.set(unit.id, unit);
    startMoving(state, unit, { x: 8, y: 10 });
    expect(unit.path).not.toBeNull();
    expect(unit.path!.length).toBeGreaterThan(0);
  });

  it("leaves path null when no goal is provided (deferred to MovementSystem)", () => {
    const state = makeState();
    const unit = createUnit({
      type: UnitType.SWORDSMAN,
      owner: "p1",
      position: { x: 5, y: 10 },
    });
    state.units.set(unit.id, unit);
    startMoving(state, unit);
    expect(unit.path).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Unit moves from A to B over N ticks
// ---------------------------------------------------------------------------

describe("MovementSystem — basic movement A→B", () => {
  it("unit moves closer to goal each tick", () => {
    const state = makeState();
    const unit = addMovingUnit(state, { position: { x: 5, y: 10 } });
    unit.path = [
      { x: 5, y: 10 },
      { x: 6, y: 10 },
      { x: 7, y: 10 },
      { x: 8, y: 10 },
    ];
    unit.pathIndex = 0;

    const startX = unit.position.x;
    MovementSystem.update(state, 1 / 60);
    expect(unit.position.x).toBeGreaterThan(startX);
  });

  it("unit reaches goal after enough ticks", () => {
    const state = makeState();
    // speed = 2 tiles/s. distance = 3 tiles → should arrive in 1.5 s
    const unit = addMovingUnit(state, { position: { x: 5, y: 10 } });
    unit.path = [
      { x: 5, y: 10 },
      { x: 6, y: 10 },
      { x: 7, y: 10 },
      { x: 8, y: 10 },
    ];
    unit.pathIndex = 0;

    // Run 2 seconds of ticks
    for (let i = 0; i < 120; i++) MovementSystem.update(state, 1 / 60);

    expect(unit.position.x).toBeCloseTo(8, 3);
    expect(unit.position.y).toBeCloseTo(10, 3);
  });

  it("unit transitions to IDLE when path is exhausted", () => {
    const state = makeState();
    const unit = addMovingUnit(state, { position: { x: 5, y: 10 } });
    unit.path = [
      { x: 5, y: 10 },
      { x: 6, y: 10 },
    ];
    unit.pathIndex = 0;

    for (let i = 0; i < 120; i++) MovementSystem.update(state, 1 / 60);

    expect(unit.state).toBe(UnitState.IDLE);
  });

  it("emits unitStateChanged → IDLE when path is exhausted", () => {
    const state = makeState();
    const unit = addMovingUnit(state, { position: { x: 5, y: 10 } });
    unit.path = [
      { x: 5, y: 10 },
      { x: 6, y: 10 },
    ];
    unit.pathIndex = 0;

    const events: unknown[] = [];
    EventBus.on("unitStateChanged", (e) => events.push(e));
    for (let i = 0; i < 120; i++) MovementSystem.update(state, 1 / 60);

    expect(events.some((e: any) => e.to === UnitState.IDLE)).toBe(true);
  });

  it("position advances proportionally to speed * dt", () => {
    const state = makeState();
    const unit = addMovingUnit(state, { position: { x: 0, y: 10 } });
    // speed = 2 tiles/s
    unit.path = [
      { x: 0, y: 10 },
      { x: 10, y: 10 },
    ];
    unit.pathIndex = 0;

    MovementSystem.update(state, 1); // 1 second → should move 2 tiles
    expect(unit.position.x).toBeCloseTo(2, 5);
  });

  it("clears path after exhaustion", () => {
    const state = makeState();
    const unit = addMovingUnit(state, { position: { x: 5, y: 10 } });
    unit.path = [
      { x: 5, y: 10 },
      { x: 6, y: 10 },
    ];
    unit.pathIndex = 0;

    for (let i = 0; i < 120; i++) MovementSystem.update(state, 1 / 60);
    expect(unit.path).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Default goal: move toward opposite base
// ---------------------------------------------------------------------------

describe("MovementSystem — default goal (opposite base)", () => {
  it("west-player unit moves eastward by default", () => {
    const state = makeState();
    const unit = addMovingUnit(state, {
      owner: "p1",
      position: { x: 5, y: 10 },
    });
    // No path set — MovementSystem must compute one toward east base

    const startX = unit.position.x;
    for (let i = 0; i < 60; i++) MovementSystem.update(state, 1 / 60);

    expect(unit.position.x).toBeGreaterThan(startX);
  });

  it("east-player unit moves westward by default", () => {
    const state = makeState();
    const unit = addMovingUnit(state, {
      owner: "p2",
      position: { x: 24, y: 10 },
    });

    const startX = unit.position.x;
    for (let i = 0; i < 60; i++) MovementSystem.update(state, 1 / 60);

    expect(unit.position.x).toBeLessThan(startX);
  });

  it("west unit has EAST facing direction while moving east", () => {
    const state = makeState();
    const unit = addMovingUnit(state, {
      owner: "p1",
      position: { x: 5, y: 10 },
    });
    for (let i = 0; i < 60; i++) MovementSystem.update(state, 1 / 60);
    expect(unit.facingDirection).toBe(Direction.EAST);
  });

  it("east unit has WEST facing direction while moving west", () => {
    const state = makeState();
    const unit = addMovingUnit(state, {
      owner: "p2",
      position: { x: 24, y: 10 },
    });
    for (let i = 0; i < 60; i++) MovementSystem.update(state, 1 / 60);
    expect(unit.facingDirection).toBe(Direction.WEST);
  });
});

// ---------------------------------------------------------------------------
// Non-MOVE units are not ticked
// ---------------------------------------------------------------------------

describe("MovementSystem — ignores non-MOVE units", () => {
  it("IDLE unit does not move", () => {
    const state = makeState();
    const unit = createUnit({
      type: UnitType.SWORDSMAN,
      owner: "p1",
      position: { x: 5, y: 10 },
    });
    // stays IDLE (default)
    state.units.set(unit.id, unit);
    MovementSystem.update(state, 1);
    expect(unit.position).toEqual({ x: 5, y: 10 });
  });

  it("DIE state unit does not move", () => {
    const state = makeState();
    const unit = createUnit({
      type: UnitType.SWORDSMAN,
      owner: "p1",
      position: { x: 5, y: 10 },
    });
    unit.stateMachine.forceState(UnitState.DIE);
    unit.state = UnitState.DIE;
    state.units.set(unit.id, unit);
    MovementSystem.update(state, 1);
    expect(unit.position).toEqual({ x: 5, y: 10 });
  });
});

// ---------------------------------------------------------------------------
// Group movement
// ---------------------------------------------------------------------------

describe("startGroupMoving", () => {
  it("puts all units into MOVE state", () => {
    const state = makeState();
    const u1 = createUnit({
      type: UnitType.SWORDSMAN,
      owner: "p1",
      position: { x: 5, y: 10 },
    });
    const u2 = createUnit({
      type: UnitType.SWORDSMAN,
      owner: "p1",
      position: { x: 5, y: 10 },
    });
    const u3 = createUnit({
      type: UnitType.SWORDSMAN,
      owner: "p1",
      position: { x: 5, y: 10 },
    });
    state.units.set(u1.id, u1);
    state.units.set(u2.id, u2);
    state.units.set(u3.id, u3);

    startGroupMoving(state, [u1.id, u2.id, u3.id], "group-1");

    expect(u1.state).toBe(UnitState.MOVE);
    expect(u2.state).toBe(UnitState.MOVE);
    expect(u3.state).toBe(UnitState.MOVE);
  });

  it("assigns the same groupId to all units", () => {
    const state = makeState();
    const u1 = createUnit({
      type: UnitType.SWORDSMAN,
      owner: "p1",
      position: { x: 5, y: 10 },
    });
    const u2 = createUnit({
      type: UnitType.SWORDSMAN,
      owner: "p1",
      position: { x: 5, y: 10 },
    });
    state.units.set(u1.id, u1);
    state.units.set(u2.id, u2);

    startGroupMoving(state, [u1.id, u2.id], "group-42");

    expect(u1.groupId).toBe("group-42");
    expect(u2.groupId).toBe("group-42");
  });

  it("units share the same path array contents", () => {
    const state = makeState();
    const u1 = createUnit({
      type: UnitType.SWORDSMAN,
      owner: "p1",
      position: { x: 5, y: 10 },
    });
    const u2 = createUnit({
      type: UnitType.SWORDSMAN,
      owner: "p1",
      position: { x: 5, y: 10 },
    });
    state.units.set(u1.id, u1);
    state.units.set(u2.id, u2);

    startGroupMoving(state, [u1.id, u2.id], "group-1", { x: 15, y: 10 });

    // Both should have a path to the same goal
    expect(u1.path).not.toBeNull();
    expect(u2.path).not.toBeNull();
    expect(u1.path![u1.path!.length - 1]).toEqual(
      u2.path![u2.path!.length - 1],
    );
  });

  it("first unit (slot 0) gets zero formation offset", () => {
    const state = makeState();
    const u1 = createUnit({
      type: UnitType.SWORDSMAN,
      owner: "p1",
      position: { x: 5, y: 10 },
    });
    const u2 = createUnit({
      type: UnitType.SWORDSMAN,
      owner: "p1",
      position: { x: 5, y: 10 },
    });
    state.units.set(u1.id, u1);
    state.units.set(u2.id, u2);

    startGroupMoving(state, [u1.id, u2.id], "group-1", { x: 15, y: 10 });

    expect(u1.formationOffset).toEqual({ x: 0, y: 0 });
  });

  it("subsequent units get non-zero formation offsets", () => {
    const state = makeState();
    const u1 = createUnit({
      type: UnitType.SWORDSMAN,
      owner: "p1",
      position: { x: 5, y: 10 },
    });
    const u2 = createUnit({
      type: UnitType.SWORDSMAN,
      owner: "p1",
      position: { x: 5, y: 10 },
    });
    state.units.set(u1.id, u1);
    state.units.set(u2.id, u2);

    startGroupMoving(state, [u1.id, u2.id], "group-1", { x: 15, y: 10 });

    // Slot 1 should have a non-zero offset (perpendicular)
    const off = u2.formationOffset;
    expect(off.x !== 0 || off.y !== 0).toBe(true);
  });

  it("emits unitStateChanged for each unit", () => {
    const state = makeState();
    const u1 = createUnit({
      type: UnitType.SWORDSMAN,
      owner: "p1",
      position: { x: 5, y: 10 },
    });
    const u2 = createUnit({
      type: UnitType.SWORDSMAN,
      owner: "p1",
      position: { x: 5, y: 10 },
    });
    state.units.set(u1.id, u1);
    state.units.set(u2.id, u2);

    const events: unknown[] = [];
    EventBus.on("unitStateChanged", (e) => events.push(e));

    startGroupMoving(state, [u1.id, u2.id], "group-1");

    expect(events).toHaveLength(2);
  });
});

describe("MovementSystem — group movement ticking", () => {
  it("all group units advance toward goal", () => {
    const state = makeState();
    const u1 = createUnit({
      type: UnitType.SWORDSMAN,
      owner: "p1",
      position: { x: 5, y: 10 },
    });
    const u2 = createUnit({
      type: UnitType.SWORDSMAN,
      owner: "p1",
      position: { x: 5, y: 10 },
    });
    state.units.set(u1.id, u1);
    state.units.set(u2.id, u2);

    startGroupMoving(state, [u1.id, u2.id], "group-1", { x: 15, y: 10 });

    const startX1 = u1.position.x;
    const startX2 = u2.position.x;

    for (let i = 0; i < 30; i++) MovementSystem.update(state, 1 / 60);

    expect(u1.position.x).toBeGreaterThan(startX1);
    expect(u2.position.x).toBeGreaterThan(startX2);
  });

  it("group units maintain perpendicular separation while moving", () => {
    const state = makeState();
    // Moving east → perpendicular is Y axis
    const u1 = createUnit({
      type: UnitType.SWORDSMAN,
      owner: "p1",
      position: { x: 5, y: 10 },
    });
    const u2 = createUnit({
      type: UnitType.SWORDSMAN,
      owner: "p1",
      position: { x: 5, y: 10 },
    });
    state.units.set(u1.id, u1);
    state.units.set(u2.id, u2);

    startGroupMoving(state, [u1.id, u2.id], "group-1", { x: 15, y: 10 });

    for (let i = 0; i < 30; i++) MovementSystem.update(state, 1 / 60);

    // u1 is at offset 0, u2 at offset +1 on Y axis — they should differ in Y
    expect(u1.position.y).not.toBeCloseTo(u2.position.y, 1);
  });
});

// ---------------------------------------------------------------------------
// Multiple units, independent movement
// ---------------------------------------------------------------------------

describe("MovementSystem — multiple independent units", () => {
  it("two units with different paths move independently", () => {
    const state = makeState();
    const u1 = addMovingUnit(state, { id: "u1", position: { x: 5, y: 5 } });
    const u2 = addMovingUnit(state, { id: "u2", position: { x: 5, y: 15 } });

    u1.path = [
      { x: 5, y: 5 },
      { x: 10, y: 5 },
    ];
    u1.pathIndex = 0;
    u2.path = [
      { x: 5, y: 15 },
      { x: 10, y: 15 },
    ];
    u2.pathIndex = 0;

    MovementSystem.update(state, 1);

    expect(u1.position.y).toBeCloseTo(5, 3);
    expect(u2.position.y).toBeCloseTo(15, 3);
    expect(u1.position.x).toBeGreaterThan(5);
    expect(u2.position.x).toBeGreaterThan(5);
  });
});
