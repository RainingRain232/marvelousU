import { describe, it, expect, beforeEach } from "vitest";
import { createSummon, SUMMON_LIFESPAN, _resetSummonCounter } from "@sim/abilities/Summon";
import { CombatSystem } from "@sim/systems/CombatSystem";
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
  _resetSummonCounter();
  EventBus.clear();
});

// ---------------------------------------------------------------------------
// Spawn behaviour
// ---------------------------------------------------------------------------

describe("Summon — spawn behaviour", () => {
  it("spawns summonCount (3) units in state.units", () => {
    const state = makeState();
    const caster = addUnit(state, { id: "caster", owner: "p1", position: { x: 5, y: 5 } });
    const summon = createSummon("s-1");
    summon.execute(caster, { x: 8, y: 5 }, state);
    // 1 caster + 3 summoned
    expect(state.units.size).toBe(4);
  });

  it("spawned units have type SUMMONED", () => {
    const state = makeState();
    const caster = addUnit(state, { id: "caster", owner: "p1", position: { x: 5, y: 5 } });
    const summon = createSummon("s-1");
    summon.execute(caster, { x: 8, y: 5 }, state);

    const summoned = [...state.units.values()].filter((u) => u.type === UnitType.SUMMONED);
    expect(summoned).toHaveLength(3);
  });

  it("spawned units belong to the caster's owner", () => {
    const state = makeState();
    const caster = addUnit(state, { id: "caster", owner: "p1", position: { x: 5, y: 5 } });
    const summon = createSummon("s-1");
    summon.execute(caster, { x: 8, y: 5 }, state);

    const summoned = [...state.units.values()].filter((u) => u.type === UnitType.SUMMONED);
    expect(summoned.every((u) => u.owner === "p1")).toBe(true);
  });

  it("spawned units are placed near the target position", () => {
    const state = makeState();
    const caster = addUnit(state, { id: "caster", owner: "p1", position: { x: 5, y: 5 } });
    const target = { x: 8, y: 5 };
    const summon = createSummon("s-1");
    summon.execute(caster, target, state);

    const summoned = [...state.units.values()].filter((u) => u.type === UnitType.SUMMONED);
    for (const u of summoned) {
      const dx = u.position.x - target.x;
      const dy = u.position.y - target.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      // Should be within spread radius (1 tile)
      expect(dist).toBeLessThanOrEqual(1 + 1e-9);
    }
  });

  it("each spawned unit starts with a positive lifespanTimer", () => {
    const state = makeState();
    const caster = addUnit(state, { id: "caster", owner: "p1", position: { x: 5, y: 5 } });
    const summon = createSummon("s-1");
    summon.execute(caster, { x: 8, y: 5 }, state);

    const summoned = [...state.units.values()].filter((u) => u.type === UnitType.SUMMONED);
    expect(summoned.every((u) => u.lifespanTimer > 0)).toBe(true);
  });

  it("spawned unit lifespanTimer equals SUMMON_LIFESPAN (20)", () => {
    const state = makeState();
    const caster = addUnit(state, { id: "caster", owner: "p1", position: { x: 5, y: 5 } });
    const summon = createSummon("s-1");
    summon.execute(caster, { x: 8, y: 5 }, state);

    const summoned = [...state.units.values()].filter((u) => u.type === UnitType.SUMMONED);
    expect(summoned.every((u) => u.lifespanTimer === SUMMON_LIFESPAN)).toBe(true);
  });

  it("spawned units start in IDLE state", () => {
    const state = makeState();
    const caster = addUnit(state, { id: "caster", owner: "p1", position: { x: 5, y: 5 } });
    const summon = createSummon("s-1");
    summon.execute(caster, { x: 8, y: 5 }, state);

    const summoned = [...state.units.values()].filter((u) => u.type === UnitType.SUMMONED);
    expect(summoned.every((u) => u.state === UnitState.IDLE)).toBe(true);
  });

  it("accepts a Unit as target (extracts its position)", () => {
    const state = makeState();
    const caster = addUnit(state, { id: "caster", owner: "p1", position: { x: 5, y: 5 } });
    const targetUnit = addUnit(state, { id: "target", owner: "p2", position: { x: 10, y: 5 } });
    const summon = createSummon("s-1");
    summon.execute(caster, targetUnit, state);

    const summoned = [...state.units.values()].filter((u) => u.type === UnitType.SUMMONED);
    expect(summoned).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

describe("Summon — events", () => {
  it("emits unitSpawned for each summoned unit", () => {
    const state = makeState();
    const caster = addUnit(state, { id: "caster", owner: "p1", position: { x: 5, y: 5 } });
    const spawned: string[] = [];
    EventBus.on("unitSpawned", (e) => spawned.push(e.unitId));

    const summon = createSummon("s-1");
    summon.execute(caster, { x: 8, y: 5 }, state);

    expect(spawned).toHaveLength(3);
  });

  it("emits abilityUsed once with the target position", () => {
    const state = makeState();
    const caster = addUnit(state, { id: "caster", owner: "p1", position: { x: 5, y: 5 } });
    const events: Vec2[][] = [];
    EventBus.on("abilityUsed", (e) => events.push(e.targets));

    const summon = createSummon("s-1");
    summon.execute(caster, { x: 8, y: 5 }, state);

    expect(events).toHaveLength(1);
    expect(events[0]).toHaveLength(1);
    expect(events[0][0]).toEqual({ x: 8, y: 5 });
  });
});

// ---------------------------------------------------------------------------
// Summoned units fight normally
// ---------------------------------------------------------------------------

describe("Summon — summoned units fight normally", () => {
  it("summoned unit can be targeted by CombatSystem (has hp/atk/range)", () => {
    const state = makeState();
    const caster = addUnit(state, { id: "caster", owner: "p1", position: { x: 5, y: 5 } });
    const summon = createSummon("s-1");
    summon.execute(caster, { x: 8, y: 5 }, state);

    const summoned = [...state.units.values()].filter((u) => u.type === UnitType.SUMMONED);
    for (const u of summoned) {
      expect(u.hp).toBeGreaterThan(0);
      expect(u.atk).toBeGreaterThan(0);
      expect(u.range).toBeGreaterThan(0);
    }
  });

  it("summoned unit takes damage from enemy attacks", () => {
    const state = makeState();
    const caster = addUnit(state, { id: "caster", owner: "p1", position: { x: 5, y: 5 } });
    const summon = createSummon("s-1");
    summon.execute(caster, { x: 8, y: 5 }, state);

    const summoned = [...state.units.values()].find((u) => u.type === UnitType.SUMMONED)!;
    const initialHp = summoned.hp;
    summoned.hp -= 10;
    expect(summoned.hp).toBe(initialHp - 10);
  });
});

// ---------------------------------------------------------------------------
// Lifespan expiry
// ---------------------------------------------------------------------------

describe("Summon — lifespan expiry", () => {
  it("CombatSystem ticks lifespanTimer down each update", () => {
    const state = makeState();
    const caster = addUnit(state, { id: "caster", owner: "p1", position: { x: 5, y: 5 } });
    const summon = createSummon("s-1");
    summon.execute(caster, { x: 8, y: 5 }, state);

    const summoned = [...state.units.values()].filter((u) => u.type === UnitType.SUMMONED);
    const beforeTimer = summoned[0].lifespanTimer;
    CombatSystem.update(state, 1); // 1 second tick
    expect(summoned[0].lifespanTimer).toBeLessThan(beforeTimer);
  });

  it("summoned unit enters DIE state when lifespanTimer expires", () => {
    const state = makeState();
    const caster = addUnit(state, { id: "caster", owner: "p1", position: { x: 5, y: 5 } });
    const summon = createSummon("s-1");
    summon.execute(caster, { x: 8, y: 5 }, state);

    const summoned = [...state.units.values()].find((u) => u.type === UnitType.SUMMONED)!;
    // Drain the timer
    CombatSystem.update(state, SUMMON_LIFESPAN + 1);
    expect(summoned.state).toBe(UnitState.DIE);
  });

  it("normal units (lifespanTimer = -1) are NOT killed by CombatSystem lifespan tick", () => {
    const state = makeState();
    const unit = addUnit(state, { id: "normal", owner: "p1", hp: 100, position: { x: 5, y: 5 } });
    expect(unit.lifespanTimer).toBe(-1); // default

    CombatSystem.update(state, 100); // big dt — should not kill the unit
    expect(unit.state).not.toBe(UnitState.DIE);
  });

  it("emits unitDied when summoned unit expires", () => {
    const state = makeState();
    const caster = addUnit(state, { id: "caster", owner: "p1", position: { x: 5, y: 5 } });
    const summon = createSummon("s-1");
    summon.execute(caster, { x: 8, y: 5 }, state);

    const died: string[] = [];
    EventBus.on("unitDied", (e) => died.push(e.unitId));

    CombatSystem.update(state, SUMMON_LIFESPAN + 1);

    const summoned = [...state.units.values()]
      .filter((u) => u.type === UnitType.SUMMONED)
      .map((u) => u.id);
    for (const id of summoned) {
      expect(died).toContain(id);
    }
  });

  it("all 3 summoned units expire together", () => {
    const state = makeState();
    const caster = addUnit(state, { id: "caster", owner: "p1", position: { x: 5, y: 5 } });
    const summon = createSummon("s-1");
    summon.execute(caster, { x: 8, y: 5 }, state);

    CombatSystem.update(state, SUMMON_LIFESPAN + 1);

    const summoned = [...state.units.values()].filter((u) => u.type === UnitType.SUMMONED);
    expect(summoned.every((u) => u.state === UnitState.DIE)).toBe(true);
  });
});
