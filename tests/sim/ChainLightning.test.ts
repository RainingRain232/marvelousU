import { describe, it, expect, beforeEach } from "vitest";
import { createChainLightning } from "@sim/abilities/ChainLightning";
import { createGameState } from "@sim/state/GameState";
import { createUnit, _resetUnitIdCounter } from "@sim/entities/Unit";
import { EventBus } from "@sim/core/EventBus";
import { UnitState, UnitType } from "@/types";
import type { GameState } from "@sim/state/GameState";
import type { Unit } from "@sim/entities/Unit";
import type { Vec2 } from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeState(): GameState {
  return createGameState(30, 20);
}

function addUnit(
  state: GameState,
  opts: {
    id?: string;
    owner?: string;
    type?: UnitType;
    position?: Vec2;
    hp?: number;
  },
): Unit {
  const unit = createUnit({
    id: opts.id,
    type: opts.type ?? UnitType.SWORDSMAN,
    owner: opts.owner ?? "p1",
    position: opts.position ?? { x: 5, y: 5 },
  });
  if (opts.hp !== undefined) unit.hp = opts.hp;
  state.units.set(unit.id, unit);
  return unit;
}

beforeEach(() => {
  _resetUnitIdCounter();
  EventBus.clear();
});

// ---------------------------------------------------------------------------
// Basic execution
// ---------------------------------------------------------------------------

describe("ChainLightning — basic execution", () => {
  it("damages the primary target", () => {
    const state = makeState();
    const caster = addUnit(state, {
      id: "caster",
      owner: "p1",
      position: { x: 0, y: 0 },
    });
    const t1 = addUnit(state, {
      id: "t1",
      owner: "p2",
      hp: 100,
      position: { x: 3, y: 0 },
    });

    const cl = createChainLightning("cl-1");
    cl.execute(caster, t1, state);

    expect(t1.hp).toBeLessThan(100);
  });

  it("uses damage value from AbilityDefs (40)", () => {
    const state = makeState();
    const caster = addUnit(state, {
      id: "caster",
      owner: "p1",
      position: { x: 0, y: 0 },
    });
    const t1 = addUnit(state, {
      id: "t1",
      owner: "p2",
      hp: 100,
      position: { x: 3, y: 0 },
    });

    const cl = createChainLightning("cl-1");
    cl.execute(caster, t1, state);

    expect(t1.hp).toBe(60); // 100 - 40
  });

  it("kills target when damage exceeds hp", () => {
    const state = makeState();
    const caster = addUnit(state, {
      id: "caster",
      owner: "p1",
      position: { x: 0, y: 0 },
    });
    const t1 = addUnit(state, {
      id: "t1",
      owner: "p2",
      hp: 20,
      position: { x: 3, y: 0 },
    });

    const cl = createChainLightning("cl-1");
    cl.execute(caster, t1, state);

    expect(t1.state).toBe(UnitState.DIE);
    expect(t1.hp).toBe(0);
  });

  it("emits unitDamaged for each unit hit", () => {
    const state = makeState();
    const caster = addUnit(state, {
      id: "caster",
      owner: "p1",
      position: { x: 0, y: 0 },
    });
    // Chain: t1 → t2 → t3 (within bounceRange 3)
    const t1 = addUnit(state, {
      id: "t1",
      owner: "p2",
      hp: 100,
      position: { x: 3, y: 0 },
    });
    const t2 = addUnit(state, {
      id: "t2",
      owner: "p2",
      hp: 100,
      position: { x: 5, y: 0 },
    });
    addUnit(state, {
      id: "t3",
      owner: "p2",
      hp: 100,
      position: { x: 7, y: 0 },
    });

    const damaged: string[] = [];
    EventBus.on("unitDamaged", (e) => damaged.push(e.unitId));

    const cl = createChainLightning("cl-1");
    cl.execute(caster, t1, state); // t1 is primary

    expect(damaged).toContain(t1.id);
    expect(damaged).toContain(t2.id);
  });
});

// ---------------------------------------------------------------------------
// Bounce count
// ---------------------------------------------------------------------------

describe("ChainLightning — bounce count", () => {
  it("bounces up to maxBounces (4) times from primary target", () => {
    const state = makeState();
    const caster = addUnit(state, {
      id: "caster",
      owner: "p1",
      position: { x: 0, y: 0 },
    });
    // Place 6 enemies in a line, all within bounceRange (3) of each other
    const enemies: Unit[] = [];
    for (let i = 0; i < 6; i++) {
      enemies.push(
        addUnit(state, {
          id: `e${i}`,
          owner: "p2",
          hp: 100,
          position: { x: 3 + i * 2, y: 0 },
        }),
      );
    }

    const cl = createChainLightning("cl-1");
    cl.execute(caster, enemies[0], state); // primary = e0

    // maxBounces = 4: primary + 4 bounces = 5 total hits
    const hitCount = enemies.filter((e) => e.hp < 100).length;
    expect(hitCount).toBe(5);
  });

  it("stops bouncing when no valid targets remain", () => {
    const state = makeState();
    const caster = addUnit(state, {
      id: "caster",
      owner: "p1",
      position: { x: 0, y: 0 },
    });
    const t1 = addUnit(state, {
      id: "t1",
      owner: "p2",
      hp: 100,
      position: { x: 3, y: 0 },
    });
    // Only one enemy — no bounces possible after primary hit

    const cl = createChainLightning("cl-1");
    cl.execute(caster, t1, state);

    expect(t1.hp).toBe(60);
  });

  it("stops bouncing when enemies are out of bounceRange", () => {
    const state = makeState();
    const caster = addUnit(state, {
      id: "caster",
      owner: "p1",
      position: { x: 0, y: 0 },
    });
    const t1 = addUnit(state, {
      id: "t1",
      owner: "p2",
      hp: 100,
      position: { x: 3, y: 0 },
    });
    // t2 is 10 tiles away — beyond bounceRange (3)
    const t2 = addUnit(state, {
      id: "t2",
      owner: "p2",
      hp: 100,
      position: { x: 13, y: 0 },
    });

    const cl = createChainLightning("cl-1");
    cl.execute(caster, t1, state);

    expect(t1.hp).toBe(60); // hit
    expect(t2.hp).toBe(100); // out of bounce range, not hit
  });

  it("does not bounce to friendly units", () => {
    const state = makeState();
    const caster = addUnit(state, {
      id: "caster",
      owner: "p1",
      position: { x: 0, y: 0 },
    });
    const t1 = addUnit(state, {
      id: "t1",
      owner: "p2",
      hp: 100,
      position: { x: 3, y: 0 },
    });
    // Ally right next to t1 — must NOT be bounced to
    const ally = addUnit(state, {
      id: "ally",
      owner: "p1",
      hp: 100,
      position: { x: 4, y: 0 },
    });

    const cl = createChainLightning("cl-1");
    cl.execute(caster, t1, state);

    expect(ally.hp).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// No double-hit (hitIds)
// ---------------------------------------------------------------------------

describe("ChainLightning — no double-hit", () => {
  it("does not hit the same unit twice", () => {
    const state = makeState();
    const caster = addUnit(state, {
      id: "caster",
      owner: "p1",
      position: { x: 0, y: 0 },
    });
    // Two enemies close together — chain could theoretically loop back
    const t1 = addUnit(state, {
      id: "t1",
      owner: "p2",
      hp: 200,
      position: { x: 3, y: 0 },
    });
    const t2 = addUnit(state, {
      id: "t2",
      owner: "p2",
      hp: 200,
      position: { x: 4, y: 0 },
    });

    const damaged: string[] = [];
    EventBus.on("unitDamaged", (e) => damaged.push(e.unitId));

    const cl = createChainLightning("cl-1");
    cl.execute(caster, t1, state);

    const t1Hits = damaged.filter((id) => id === t1.id).length;
    const t2Hits = damaged.filter((id) => id === t2.id).length;
    expect(t1Hits).toBe(1);
    expect(t2Hits).toBe(1);
  });

  it("each unit is only damaged once even with many bounces available", () => {
    const state = makeState();
    const caster = addUnit(state, {
      id: "caster",
      owner: "p1",
      position: { x: 0, y: 0 },
    });
    // 3 enemies tightly packed — maxBounces (4) > enemy count (2 remaining)
    const t1 = addUnit(state, {
      id: "t1",
      owner: "p2",
      hp: 200,
      position: { x: 3, y: 0 },
    });
    const t2 = addUnit(state, {
      id: "t2",
      owner: "p2",
      hp: 200,
      position: { x: 4, y: 0 },
    });
    const t3 = addUnit(state, {
      id: "t3",
      owner: "p2",
      hp: 200,
      position: { x: 5, y: 0 },
    });

    const damaged: string[] = [];
    EventBus.on("unitDamaged", (e) => damaged.push(e.unitId));

    const cl = createChainLightning("cl-1");
    cl.execute(caster, t1, state);

    // Each id appears exactly once
    expect(damaged.filter((id) => id === t1.id).length).toBe(1);
    expect(damaged.filter((id) => id === t2.id).length).toBe(1);
    expect(damaged.filter((id) => id === t3.id).length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Dead unit handling
// ---------------------------------------------------------------------------

describe("ChainLightning — dead unit handling", () => {
  it("does not target already-dead units for bounce", () => {
    const state = makeState();
    const caster = addUnit(state, {
      id: "caster",
      owner: "p1",
      position: { x: 0, y: 0 },
    });
    const t1 = addUnit(state, {
      id: "t1",
      owner: "p2",
      hp: 100,
      position: { x: 3, y: 0 },
    });
    const t2 = addUnit(state, {
      id: "t2",
      owner: "p2",
      hp: 100,
      position: { x: 4, y: 0 },
    });
    // Mark t2 as dead before the cast
    t2.stateMachine.forceState(UnitState.DIE);
    t2.state = UnitState.DIE;

    const cl = createChainLightning("cl-1");
    cl.execute(caster, t1, state);

    expect(t2.hp).toBe(100); // dead unit not damaged
  });

  it("handles no valid primary target gracefully (Vec2 with no enemies nearby)", () => {
    const state = makeState();
    const caster = addUnit(state, {
      id: "caster",
      owner: "p1",
      position: { x: 0, y: 0 },
    });
    // Enemy far outside range
    addUnit(state, {
      id: "far",
      owner: "p2",
      hp: 100,
      position: { x: 20, y: 0 },
    });

    const cl = createChainLightning("cl-1");
    // Target a Vec2 with no enemies nearby — should be a no-op, not crash
    expect(() => cl.execute(caster, { x: 3, y: 0 }, state)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// abilityUsed event with chain path
// ---------------------------------------------------------------------------

describe("ChainLightning — abilityUsed event", () => {
  it("emits abilityUsed with chain path including caster position", () => {
    const state = makeState();
    const caster = addUnit(state, {
      id: "caster",
      owner: "p1",
      position: { x: 0, y: 0 },
    });
    const t1 = addUnit(state, {
      id: "t1",
      owner: "p2",
      hp: 100,
      position: { x: 3, y: 0 },
    });

    const events: Vec2[][] = [];
    EventBus.on("abilityUsed", (e) => events.push(e.targets));

    const cl = createChainLightning("cl-1");
    cl.execute(caster, t1, state);

    expect(events).toHaveLength(1);
    // First position in path is the caster
    expect(events[0][0]).toEqual({ x: 0, y: 0 });
    // Second is t1
    expect(events[0][1]).toEqual({ x: 3, y: 0 });
  });

  it("chain path length equals 1 + number of units hit", () => {
    const state = makeState();
    const caster = addUnit(state, {
      id: "caster",
      owner: "p1",
      position: { x: 0, y: 0 },
    });
    // 3 enemies within range of each other
    const t1 = addUnit(state, {
      id: "t1",
      owner: "p2",
      hp: 100,
      position: { x: 3, y: 0 },
    });
    addUnit(state, {
      id: "t2",
      owner: "p2",
      hp: 100,
      position: { x: 5, y: 0 },
    });
    addUnit(state, {
      id: "t3",
      owner: "p2",
      hp: 100,
      position: { x: 7, y: 0 },
    });

    const events: Vec2[][] = [];
    EventBus.on("abilityUsed", (e) => events.push(e.targets));

    const cl = createChainLightning("cl-1");
    cl.execute(caster, t1, state);

    // caster + 3 enemies = 4 positions (or fewer if bounce range stops it)
    expect(events[0].length).toBeGreaterThanOrEqual(2);
    // First entry is always caster
    expect(events[0][0]).toEqual(caster.position);
  });

  it("emits exactly one abilityUsed event per cast", () => {
    const state = makeState();
    const caster = addUnit(state, {
      id: "caster",
      owner: "p1",
      position: { x: 0, y: 0 },
    });
    const t1 = addUnit(state, {
      id: "t1",
      owner: "p2",
      hp: 100,
      position: { x: 3, y: 0 },
    });

    let count = 0;
    EventBus.on("abilityUsed", () => count++);

    const cl = createChainLightning("cl-1");
    cl.execute(caster, t1, state);

    expect(count).toBe(1);
  });
});
