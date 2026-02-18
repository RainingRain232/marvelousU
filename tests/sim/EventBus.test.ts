import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventBusImpl } from "@sim/core/EventBus";
import { GamePhase, UnitState } from "@/types";

// Each test gets its own isolated bus instance — no shared singleton state
let bus: EventBusImpl;

beforeEach(() => {
  bus = new EventBusImpl();
});

// ---------------------------------------------------------------------------
// on() / emit()
// ---------------------------------------------------------------------------

describe("on / emit", () => {
  it("calls the listener when the matching event is emitted", () => {
    const listener = vi.fn();
    bus.on("phaseChanged", listener);
    bus.emit("phaseChanged", { phase: GamePhase.BATTLE });
    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith({ phase: GamePhase.BATTLE });
  });

  it("does not call the listener for a different event", () => {
    const listener = vi.fn();
    bus.on("phaseChanged", listener);
    bus.emit("goldChanged", { playerId: "p1", amount: 50 });
    expect(listener).not.toHaveBeenCalled();
  });

  it("calls multiple listeners for the same event", () => {
    const a = vi.fn();
    const b = vi.fn();
    bus.on("goldChanged", a);
    bus.on("goldChanged", b);
    bus.emit("goldChanged", { playerId: "p1", amount: 10 });
    expect(a).toHaveBeenCalledOnce();
    expect(b).toHaveBeenCalledOnce();
  });

  it("delivers the correct payload to the listener", () => {
    const received: { unitId: string; killerUnitId?: string }[] = [];
    bus.on("unitDied", (payload) => received.push(payload));
    bus.emit("unitDied", { unitId: "u1", killerUnitId: "u2" });
    bus.emit("unitDied", { unitId: "u3" });
    expect(received).toHaveLength(2);
    expect(received[0]).toEqual({ unitId: "u1", killerUnitId: "u2" });
    expect(received[1]).toEqual({ unitId: "u3" });
  });

  it("calls the same listener multiple times if emitted multiple times", () => {
    const listener = vi.fn();
    bus.on("goldChanged", listener);
    bus.emit("goldChanged", { playerId: "p1", amount: 10 });
    bus.emit("goldChanged", { playerId: "p1", amount: 20 });
    bus.emit("goldChanged", { playerId: "p1", amount: 30 });
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it("does not throw when emitting an event with no listeners", () => {
    expect(() =>
      bus.emit("phaseChanged", { phase: GamePhase.RESOLVE }),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// off()
// ---------------------------------------------------------------------------

describe("off", () => {
  it("stops the listener from being called after off()", () => {
    const listener = vi.fn();
    bus.on("goldChanged", listener);
    bus.off("goldChanged", listener);
    bus.emit("goldChanged", { playerId: "p1", amount: 5 });
    expect(listener).not.toHaveBeenCalled();
  });

  it("only removes the specified listener, not others", () => {
    const a = vi.fn();
    const b = vi.fn();
    bus.on("goldChanged", a);
    bus.on("goldChanged", b);
    bus.off("goldChanged", a);
    bus.emit("goldChanged", { playerId: "p1", amount: 5 });
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledOnce();
  });

  it("does not throw when calling off() for a listener that was never registered", () => {
    const listener = vi.fn();
    expect(() => bus.off("goldChanged", listener)).not.toThrow();
  });

  it("on() returns an unsubscribe function that works correctly", () => {
    const listener = vi.fn();
    const unsub = bus.on("phaseChanged", listener);
    bus.emit("phaseChanged", { phase: GamePhase.PREP });
    unsub();
    bus.emit("phaseChanged", { phase: GamePhase.BATTLE });
    expect(listener).toHaveBeenCalledOnce(); // only the first emit
  });
});

// ---------------------------------------------------------------------------
// once()
// ---------------------------------------------------------------------------

describe("once", () => {
  it("calls the listener exactly once", () => {
    const listener = vi.fn();
    bus.once("unitDied", listener);
    bus.emit("unitDied", { unitId: "u1" });
    bus.emit("unitDied", { unitId: "u2" });
    bus.emit("unitDied", { unitId: "u3" });
    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith({ unitId: "u1" });
  });

  it("does not interfere with regular on() listeners", () => {
    const always = vi.fn();
    const onceOnly = vi.fn();
    bus.on("unitDied", always);
    bus.once("unitDied", onceOnly);
    bus.emit("unitDied", { unitId: "u1" });
    bus.emit("unitDied", { unitId: "u2" });
    expect(always).toHaveBeenCalledTimes(2);
    expect(onceOnly).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// clear() / clearEvent()
// ---------------------------------------------------------------------------

describe("clear", () => {
  it("clear() removes all listeners for all events", () => {
    const a = vi.fn();
    const b = vi.fn();
    bus.on("goldChanged", a);
    bus.on("phaseChanged", b);
    bus.clear();
    bus.emit("goldChanged", { playerId: "p1", amount: 1 });
    bus.emit("phaseChanged", { phase: GamePhase.BATTLE });
    expect(a).not.toHaveBeenCalled();
    expect(b).not.toHaveBeenCalled();
  });

  it("clearEvent() removes listeners only for that event", () => {
    const a = vi.fn();
    const b = vi.fn();
    bus.on("goldChanged", a);
    bus.on("phaseChanged", b);
    bus.clearEvent("goldChanged");
    bus.emit("goldChanged", { playerId: "p1", amount: 1 });
    bus.emit("phaseChanged", { phase: GamePhase.BATTLE });
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// Snapshot safety — listener calls off() mid-emit
// ---------------------------------------------------------------------------

describe("emit snapshot safety", () => {
  it("does not skip listeners when a listener removes itself during emit", () => {
    const results: string[] = [];

    const selfRemovingListener = (payload: { phase: GamePhase }) => {
      results.push("first:" + payload.phase);
      bus.off("phaseChanged", selfRemovingListener);
    };
    const secondListener = () => results.push("second");

    bus.on("phaseChanged", selfRemovingListener);
    bus.on("phaseChanged", secondListener);
    bus.emit("phaseChanged", { phase: GamePhase.BATTLE });

    // Both listeners in the first emit should still fire
    expect(results).toContain("first:battle");
    expect(results).toContain("second");

    results.length = 0;
    bus.emit("phaseChanged", { phase: GamePhase.RESOLVE });
    // selfRemovingListener was removed; only second fires
    expect(results).toEqual(["second"]);
  });
});

// ---------------------------------------------------------------------------
// All SimEvents — smoke test every event key is reachable
// ---------------------------------------------------------------------------

describe("SimEvents coverage", () => {
  it("can emit and receive every defined event type", () => {
    const results: string[] = [];
    const mark = (name: string) => () => results.push(name);

    bus.on("unitSpawned", mark("unitSpawned"));
    bus.on("unitDied", mark("unitDied"));
    bus.on("unitDamaged", mark("unitDamaged"));
    bus.on("unitStateChanged", mark("unitStateChanged"));
    bus.on("groupSpawned", mark("groupSpawned"));
    bus.on("buildingPlaced", mark("buildingPlaced"));
    bus.on("buildingDestroyed", mark("buildingDestroyed"));
    bus.on("buildingCaptured", mark("buildingCaptured"));
    bus.on("abilityUsed", mark("abilityUsed"));
    bus.on("projectileCreated", mark("projectileCreated"));
    bus.on("projectileHit", mark("projectileHit"));
    bus.on("goldChanged", mark("goldChanged"));
    bus.on("phaseChanged", mark("phaseChanged"));

    bus.emit("unitSpawned", {
      unitId: "u1",
      buildingId: "b1",
      position: { x: 0, y: 0 },
    });
    bus.emit("unitDied", { unitId: "u1" });
    bus.emit("unitDamaged", { unitId: "u1", amount: 10, attackerId: "u2" });
    bus.emit("unitStateChanged", {
      unitId: "u1",
      from: UnitState.IDLE,
      to: UnitState.MOVE,
    });
    bus.emit("groupSpawned", { unitIds: ["u1", "u2"], buildingId: "b1" });
    bus.emit("buildingPlaced", {
      buildingId: "b1",
      position: { x: 1, y: 1 },
      owner: "p1",
    });
    bus.emit("buildingDestroyed", { buildingId: "b1" });
    bus.emit("buildingCaptured", { buildingId: "b1", newOwner: "p2" });
    bus.emit("abilityUsed", {
      casterId: "u1",
      abilityId: "fireball",
      targets: [],
    });
    bus.emit("projectileCreated", {
      projectileId: "pr1",
      origin: { x: 0, y: 0 },
      target: { x: 5, y: 5 },
    });
    bus.emit("projectileHit", { projectileId: "pr1", targetId: "u2" });
    bus.emit("goldChanged", { playerId: "p1", amount: 50 });
    bus.emit("phaseChanged", { phase: GamePhase.BATTLE });

    expect(results).toHaveLength(13);
    expect(results).toEqual([
      "unitSpawned",
      "unitDied",
      "unitDamaged",
      "unitStateChanged",
      "groupSpawned",
      "buildingPlaced",
      "buildingDestroyed",
      "buildingCaptured",
      "abilityUsed",
      "projectileCreated",
      "projectileHit",
      "goldChanged",
      "phaseChanged",
    ]);
  });
});
