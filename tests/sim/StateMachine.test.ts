import { describe, it, expect, vi } from "vitest";
import { StateMachine } from "@sim/core/StateMachine";
import type { StateTransition, StateConfig } from "@sim/core/StateMachine";

// ---------------------------------------------------------------------------
// Unit FSM matching the game spec:  IDLE → MOVE → ATTACK → IDLE
//                                              ↓
//                                           CAST → IDLE
//                                   Any → DIE
// ---------------------------------------------------------------------------

type UnitState = "IDLE" | "MOVE" | "ATTACK" | "CAST" | "DIE";

const UNIT_TRANSITIONS: StateTransition<UnitState>[] = [
  { from: "IDLE", to: "MOVE" },
  { from: "MOVE", to: "ATTACK" },
  { from: "MOVE", to: "IDLE" },
  { from: "ATTACK", to: "IDLE" },
  { from: "MOVE", to: "CAST" },
  { from: "CAST", to: "IDLE" },
  { from: "*", to: "DIE" },
];

function makeFSM(
  states: Partial<Record<UnitState, StateConfig<UnitState>>> = {},
) {
  return new StateMachine<UnitState>("IDLE", UNIT_TRANSITIONS, states);
}

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

describe("construction", () => {
  it("starts in the initial state", () => {
    expect(makeFSM().currentState).toBe("IDLE");
  });

  it("calls onEnter for the initial state with null as prevState", () => {
    const onEnter = vi.fn();
    makeFSM({ IDLE: { onEnter } });
    expect(onEnter).toHaveBeenCalledOnce();
    expect(onEnter).toHaveBeenCalledWith(null);
  });

  it("does not call onEnter for states other than the initial", () => {
    const onEnter = vi.fn();
    makeFSM({ MOVE: { onEnter } });
    expect(onEnter).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// canTransition
// ---------------------------------------------------------------------------

describe("canTransition", () => {
  it("returns true for an allowed transition", () => {
    const fsm = makeFSM();
    expect(fsm.canTransition("MOVE")).toBe(true);
  });

  it("returns false for a disallowed transition", () => {
    const fsm = makeFSM();
    // IDLE → ATTACK is not in the list
    expect(fsm.canTransition("ATTACK")).toBe(false);
  });

  it('wildcard "*" allows transition to DIE from any state', () => {
    const fsm = makeFSM();
    expect(fsm.canTransition("DIE")).toBe(true);
  });

  it("wildcard still applies after state changes", () => {
    const fsm = makeFSM();
    fsm.setState("MOVE");
    expect(fsm.canTransition("DIE")).toBe(true);
    fsm.setState("ATTACK");
    expect(fsm.canTransition("DIE")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// setState
// ---------------------------------------------------------------------------

describe("setState", () => {
  it("changes currentState on a valid transition", () => {
    const fsm = makeFSM();
    fsm.setState("MOVE");
    expect(fsm.currentState).toBe("MOVE");
  });

  it("returns true on a valid transition", () => {
    expect(makeFSM().setState("MOVE")).toBe(true);
  });

  it("returns false and does not change state on an invalid transition", () => {
    const fsm = makeFSM();
    const result = fsm.setState("ATTACK"); // IDLE → ATTACK not allowed
    expect(result).toBe(false);
    expect(fsm.currentState).toBe("IDLE");
  });

  it("calls onExit on the leaving state with the next state", () => {
    const onExit = vi.fn();
    const fsm = makeFSM({ IDLE: { onExit } });
    fsm.setState("MOVE");
    expect(onExit).toHaveBeenCalledOnce();
    expect(onExit).toHaveBeenCalledWith("MOVE");
  });

  it("calls onEnter on the entering state with the previous state", () => {
    const onEnter = vi.fn();
    const fsm = makeFSM({ MOVE: { onEnter } });
    fsm.setState("MOVE");
    expect(onEnter).toHaveBeenCalledOnce();
    expect(onEnter).toHaveBeenCalledWith("IDLE");
  });

  it("calls onExit before onEnter", () => {
    const order: string[] = [];
    const fsm = makeFSM({
      IDLE: { onExit: () => order.push("exit:IDLE") },
      MOVE: { onEnter: () => order.push("enter:MOVE") },
    });
    fsm.setState("MOVE");
    expect(order).toEqual(["exit:IDLE", "enter:MOVE"]);
  });

  it("does not call onExit on a failed transition", () => {
    const onExit = vi.fn();
    const fsm = makeFSM({ IDLE: { onExit } });
    fsm.setState("ATTACK"); // invalid — IDLE → ATTACK
    expect(onExit).not.toHaveBeenCalled();
  });

  it("does not call onEnter on a failed transition", () => {
    const onEnter = vi.fn();
    const fsm = makeFSM({ ATTACK: { onEnter } });
    fsm.setState("ATTACK"); // invalid — IDLE → ATTACK
    expect(onEnter).not.toHaveBeenCalled();
  });

  it("supports chained transitions", () => {
    const fsm = makeFSM();
    fsm.setState("MOVE");
    fsm.setState("ATTACK");
    fsm.setState("IDLE");
    expect(fsm.currentState).toBe("IDLE");
  });

  it("wildcard transition: DIE is reachable from any state", () => {
    for (const state of ["IDLE", "MOVE", "ATTACK", "CAST"] as UnitState[]) {
      const fsm = new StateMachine<UnitState>(state, UNIT_TRANSITIONS);
      expect(fsm.setState("DIE")).toBe(true);
      expect(fsm.currentState).toBe("DIE");
    }
  });
});

// ---------------------------------------------------------------------------
// update
// ---------------------------------------------------------------------------

describe("update", () => {
  it("calls onUpdate for the current state with dt", () => {
    const onUpdate = vi.fn();
    const fsm = makeFSM({ IDLE: { onUpdate } });
    fsm.update(0.016);
    expect(onUpdate).toHaveBeenCalledOnce();
    expect(onUpdate).toHaveBeenCalledWith(0.016);
  });

  it("does not call onUpdate for states that are not current", () => {
    const onUpdate = vi.fn();
    const fsm = makeFSM({ MOVE: { onUpdate } });
    fsm.update(0.016); // still in IDLE
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("calls onUpdate for the correct state after a transition", () => {
    const idleUpdate = vi.fn();
    const moveUpdate = vi.fn();
    const fsm = makeFSM({
      IDLE: { onUpdate: idleUpdate },
      MOVE: { onUpdate: moveUpdate },
    });
    fsm.update(0.016); // IDLE ticks
    fsm.setState("MOVE");
    fsm.update(0.016); // MOVE ticks
    expect(idleUpdate).toHaveBeenCalledOnce();
    expect(moveUpdate).toHaveBeenCalledOnce();
  });

  it("does not throw when the current state has no onUpdate", () => {
    const fsm = makeFSM(); // no callbacks
    expect(() => fsm.update(0.016)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// forceState
// ---------------------------------------------------------------------------

describe("forceState", () => {
  it("overrides transition rules", () => {
    const fsm = makeFSM();
    // IDLE → ATTACK is normally forbidden
    fsm.forceState("ATTACK");
    expect(fsm.currentState).toBe("ATTACK");
  });

  it("still fires onExit / onEnter", () => {
    const order: string[] = [];
    const fsm = makeFSM({
      IDLE: { onExit: () => order.push("exit:IDLE") },
      ATTACK: { onEnter: () => order.push("enter:ATTACK") },
    });
    fsm.forceState("ATTACK");
    expect(order).toEqual(["exit:IDLE", "enter:ATTACK"]);
  });
});

// ---------------------------------------------------------------------------
// Full unit lifecycle scenario
// ---------------------------------------------------------------------------

describe("unit lifecycle scenario", () => {
  it("runs a complete IDLE→MOVE→ATTACK→DIE sequence with callbacks", () => {
    const log: string[] = [];

    const fsm = makeFSM({
      IDLE: {
        onEnter: () => log.push("enter:IDLE"),
        onExit: () => log.push("exit:IDLE"),
      },
      MOVE: {
        onEnter: () => log.push("enter:MOVE"),
        onExit: () => log.push("exit:MOVE"),
      },
      ATTACK: {
        onEnter: () => log.push("enter:ATTACK"),
        onExit: () => log.push("exit:ATTACK"),
      },
      DIE: { onEnter: () => log.push("enter:DIE") },
    });

    // Initial onEnter already fired
    fsm.setState("MOVE");
    fsm.setState("ATTACK");
    fsm.setState("DIE");

    expect(log).toEqual([
      "enter:IDLE", // constructor
      "exit:IDLE",
      "enter:MOVE",
      "exit:MOVE",
      "enter:ATTACK",
      "exit:ATTACK",
      "enter:DIE",
    ]);
    expect(fsm.currentState).toBe("DIE");
  });
});
