import { describe, it, expect, beforeEach } from "vitest";
import { CombatSystem, killUnit } from "@sim/systems/CombatSystem";
import { createGameState } from "@sim/state/GameState";
import { createUnit, _resetUnitIdCounter } from "@sim/entities/Unit";
import { EventBus } from "@sim/core/EventBus";
import { Direction, UnitState, UnitType } from "@/types";
import { UNIT_DEFINITIONS } from "@sim/config/UnitDefinitions";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import type { Unit } from "@sim/entities/Unit";
import type { GameState } from "@sim/state/GameState";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeState() {
  return createGameState(30, 20);
}

/** Create a unit and add it to state. Optionally force a starting UnitState. */
function addUnit(
  state: GameState,
  opts: {
    id?: string;
    owner?: string;
    type?: UnitType;
    position?: { x: number; y: number };
    startState?: UnitState;
    hp?: number;
  },
): Unit {
  const unit = createUnit({
    id: opts.id,
    type: opts.type ?? UnitType.SWORDSMAN,
    owner: opts.owner ?? "p1",
    position: opts.position ?? { x: 10, y: 10 },
  });
  if (opts.startState && opts.startState !== UnitState.IDLE) {
    unit.stateMachine.forceState(opts.startState);
    unit.state = opts.startState;
  }
  if (opts.hp !== undefined) unit.hp = opts.hp;
  state.units.set(unit.id, unit);
  return unit;
}

beforeEach(() => {
  _resetUnitIdCounter();
  EventBus.clear();
});

// ---------------------------------------------------------------------------
// Target selection
// ---------------------------------------------------------------------------

describe("CombatSystem — target selection", () => {
  it("ignores friendly units", () => {
    const state = makeState();
    const u1 = addUnit(state, {
      id: "u1",
      owner: "p1",
      position: { x: 10, y: 10 },
    });
    const u2 = addUnit(state, {
      id: "u2",
      owner: "p1",
      position: { x: 11, y: 10 },
    }); // same owner
    // Run one tick — u1 should NOT attack u2
    CombatSystem.update(state, 1);
    expect(u1.targetId).toBeNull();
    expect(u2.hp).toBe(u2.maxHp);
  });

  it("selects nearest enemy within aggro range", () => {
    const state = makeState();
    const attacker = addUnit(state, {
      id: "a",
      owner: "p1",
      position: { x: 10, y: 10 },
    });
    // far enemy (outside aggro range)
    addUnit(state, {
      id: "far",
      owner: "p2",
      position: { x: 10 + BalanceConfig.AGGRO_RANGE + 5, y: 10 },
    });
    // near enemy (within range + within attack range=1)
    const near = addUnit(state, {
      id: "near",
      owner: "p2",
      position: { x: 11, y: 10 },
    });

    CombatSystem.update(state, 1);
    expect(attacker.targetId).toBe(near.id);
  });

  it("ignores enemies outside aggro range", () => {
    const state = makeState();
    const u1 = addUnit(state, {
      id: "u1",
      owner: "p1",
      position: { x: 0, y: 0 },
    });
    addUnit(state, {
      id: "u2",
      owner: "p2",
      position: { x: BalanceConfig.AGGRO_RANGE + 5, y: 0 },
    });

    CombatSystem.update(state, 0.016);
    expect(u1.targetId).toBeNull();
  });

  it("ignores DIE-state enemies", () => {
    const state = makeState();
    const u1 = addUnit(state, {
      id: "u1",
      owner: "p1",
      position: { x: 10, y: 10 },
    });
    const u2 = addUnit(state, {
      id: "u2",
      owner: "p2",
      position: { x: 11, y: 10 },
      startState: UnitState.DIE,
    });
    u2.deathTimer = 1;

    CombatSystem.update(state, 0.016);
    expect(u1.targetId).toBeNull();
  });

  it("retains existing valid target on subsequent ticks", () => {
    const state = makeState();
    const u1 = addUnit(state, {
      id: "u1",
      owner: "p1",
      position: { x: 10, y: 10 },
    });
    const u2 = addUnit(state, {
      id: "u2",
      owner: "p2",
      position: { x: 11, y: 10 },
    });

    CombatSystem.update(state, 0.016);
    expect(u1.targetId).toBe(u2.id);
    CombatSystem.update(state, 0.016);
    expect(u1.targetId).toBe(u2.id);
  });
});

// ---------------------------------------------------------------------------
// State transitions
// ---------------------------------------------------------------------------

describe("CombatSystem — state transitions", () => {
  it("transitions MOVE unit to ATTACK when enemy is in attack range", () => {
    const state = makeState();
    const u1 = addUnit(state, {
      id: "u1",
      owner: "p1",
      position: { x: 10, y: 10 },
      startState: UnitState.MOVE,
    });
    addUnit(state, { id: "u2", owner: "p2", position: { x: 11, y: 10 } }); // range=1, dist=1

    CombatSystem.update(state, 0.016);
    expect(u1.state).toBe(UnitState.ATTACK);
  });

  it("transitions IDLE unit to ATTACK when enemy is in attack range", () => {
    const state = makeState();
    const u1 = addUnit(state, {
      id: "u1",
      owner: "p1",
      position: { x: 10, y: 10 },
    }); // IDLE
    addUnit(state, { id: "u2", owner: "p2", position: { x: 11, y: 10 } }); // adjacent

    CombatSystem.update(state, 0.016);
    expect(u1.state).toBe(UnitState.ATTACK);
  });

  it("transitions IDLE unit to MOVE when enemy is in aggro range but out of attack range", () => {
    const state = makeState();
    const u1 = addUnit(state, {
      id: "u1",
      owner: "p1",
      position: { x: 10, y: 10 },
    }); // IDLE, range=1
    addUnit(state, { id: "u2", owner: "p2", position: { x: 14, y: 10 } }); // dist=4, in aggro(6) but > range(1)

    CombatSystem.update(state, 0.016);
    expect(u1.state).toBe(UnitState.MOVE);
  });

  it("transitions ATTACK unit back to MOVE when target leaves attack range", () => {
    const state = makeState();
    const u1 = addUnit(state, {
      id: "u1",
      owner: "p1",
      position: { x: 10, y: 10 },
      startState: UnitState.ATTACK,
    });
    const u2 = addUnit(state, {
      id: "u2",
      owner: "p2",
      position: { x: 14, y: 10 },
    }); // dist=4 > range=1
    u1.targetId = u2.id;

    CombatSystem.update(state, 0.016);
    expect(u1.state).toBe(UnitState.MOVE);
  });

  it("emits unitStateChanged when entering ATTACK", () => {
    const state = makeState();
    addUnit(state, {
      id: "u1",
      owner: "p1",
      position: { x: 10, y: 10 },
      startState: UnitState.MOVE,
    });
    addUnit(state, { id: "u2", owner: "p2", position: { x: 11, y: 10 } });

    const events: unknown[] = [];
    EventBus.on("unitStateChanged", (e) => events.push(e));
    CombatSystem.update(state, 0.016);

    expect(events.some((e: any) => e.to === UnitState.ATTACK)).toBe(true);
  });

  it("does not transition CAST unit", () => {
    const state = makeState();
    const u1 = addUnit(state, {
      id: "u1",
      owner: "p1",
      position: { x: 10, y: 10 },
      startState: UnitState.CAST,
    });
    addUnit(state, { id: "u2", owner: "p2", position: { x: 11, y: 10 } });

    CombatSystem.update(state, 0.016);
    expect(u1.state).toBe(UnitState.CAST);
  });
});

// ---------------------------------------------------------------------------
// Damage & attack cooldown
// ---------------------------------------------------------------------------

describe("CombatSystem — damage resolution", () => {
  it("deals damage equal to attacker.atk on first tick when cooldown is 0", () => {
    const state = makeState();
    addUnit(state, { id: "u1", owner: "p1", position: { x: 10, y: 10 } });
    const u2 = addUnit(state, {
      id: "u2",
      owner: "p2",
      position: { x: 11, y: 10 },
    });
    const def = UNIT_DEFINITIONS[UnitType.SWORDSMAN];

    CombatSystem.update(state, 0.016);
    expect(u2.hp).toBe(u2.maxHp - def.atk);
  });

  it("emits unitDamaged event with correct payload", () => {
    const state = makeState();
    const u1 = addUnit(state, {
      id: "u1",
      owner: "p1",
      position: { x: 10, y: 10 },
    });
    const u2 = addUnit(state, {
      id: "u2",
      owner: "p2",
      position: { x: 11, y: 10 },
    });
    const dmg: Array<{ unitId: string; amount: number; attackerId: string }> =
      [];
    EventBus.on("unitDamaged", (e) => dmg.push(e));

    CombatSystem.update(state, 0.016);
    // Both units attack each other on the same tick; verify u1→u2 event exists
    const u1ToU2 = dmg.find(
      (e) => e.attackerId === u1.id && e.unitId === u2.id,
    );
    expect(u1ToU2).toBeDefined();
    expect(u1ToU2!.amount).toBe(UNIT_DEFINITIONS[UnitType.SWORDSMAN].atk);
  });

  it("sets attackTimer to 1/attackSpeed after hitting", () => {
    const state = makeState();
    const u1 = addUnit(state, {
      id: "u1",
      owner: "p1",
      position: { x: 10, y: 10 },
    });
    addUnit(state, { id: "u2", owner: "p2", position: { x: 11, y: 10 } });
    const def = UNIT_DEFINITIONS[UnitType.SWORDSMAN];

    // Timer starts at 0 → decremented to -dt → attack fires → reset to 1/attackSpeed.
    // The reset happens after decrement, so the timer value after the tick is exactly
    // 1/attackSpeed (it will be decremented on the *next* tick).
    CombatSystem.update(state, 0.016);
    expect(u1.attackTimer).toBeCloseTo(1 / def.attackSpeed, 5);
  });

  it("does not deal damage again before attack cooldown expires", () => {
    const state = makeState();
    addUnit(state, { id: "u1", owner: "p1", position: { x: 10, y: 10 } });
    const u2 = addUnit(state, {
      id: "u2",
      owner: "p2",
      position: { x: 11, y: 10 },
    });
    const def = UNIT_DEFINITIONS[UnitType.SWORDSMAN];

    CombatSystem.update(state, 0.016); // hits once
    const hpAfterFirst = u2.hp;
    CombatSystem.update(state, 0.016); // still on cooldown
    expect(u2.hp).toBe(hpAfterFirst);
    void def; // suppress unused warning
  });

  it("deals damage again after cooldown expires", () => {
    const state = makeState();
    const u1 = addUnit(state, {
      id: "u1",
      owner: "p1",
      position: { x: 10, y: 10 },
    });
    const u2 = addUnit(state, {
      id: "u2",
      owner: "p2",
      position: { x: 11, y: 10 },
    });
    const def = UNIT_DEFINITIONS[UnitType.SWORDSMAN];

    CombatSystem.update(state, 0.016); // hits; timer = 1/1.0 - 0.016
    const hpAfterFirst = u2.hp;
    CombatSystem.update(state, 1 / def.attackSpeed); // expires cooldown and hits again
    expect(u2.hp).toBeLessThan(hpAfterFirst);
  });
});

// ---------------------------------------------------------------------------
// Unit death — two units fight, one dies
// ---------------------------------------------------------------------------

describe("CombatSystem — unit death (two units fight, one dies)", () => {
  it("unit with low hp is killed by a single attack", () => {
    const state = makeState();
    addUnit(state, { id: "u1", owner: "p1", position: { x: 10, y: 10 } }); // atk=15
    const u2 = addUnit(state, {
      id: "u2",
      owner: "p2",
      position: { x: 11, y: 10 },
      hp: 1,
    });

    CombatSystem.update(state, 0.016);
    expect(u2.state).toBe(UnitState.DIE);
    expect(u2.hp).toBe(0);
  });

  it("emits unitDied event when unit hp drops to 0", () => {
    const state = makeState();
    const u1 = addUnit(state, {
      id: "u1",
      owner: "p1",
      position: { x: 10, y: 10 },
    });
    const u2 = addUnit(state, {
      id: "u2",
      owner: "p2",
      position: { x: 11, y: 10 },
      hp: 1,
    });
    const died: unknown[] = [];
    EventBus.on("unitDied", (e) => died.push(e));

    CombatSystem.update(state, 0.016);
    expect(died).toHaveLength(1);
    expect(died[0]).toMatchObject({ unitId: u2.id, killerUnitId: u1.id });
  });

  it("dead unit enters DIE state, not removed immediately", () => {
    const state = makeState();
    addUnit(state, { id: "u1", owner: "p1", position: { x: 10, y: 10 } });
    const u2 = addUnit(state, {
      id: "u2",
      owner: "p2",
      position: { x: 11, y: 10 },
      hp: 1,
    });

    CombatSystem.update(state, 0.016);
    expect(state.units.has(u2.id)).toBe(true); // still present (linger period)
    expect(u2.state).toBe(UnitState.DIE);
  });

  it("unit is removed from state after death linger expires", () => {
    const state = makeState();
    addUnit(state, { id: "u1", owner: "p1", position: { x: 10, y: 10 } });
    const u2 = addUnit(state, {
      id: "u2",
      owner: "p2",
      position: { x: 11, y: 10 },
      hp: 1,
    });

    CombatSystem.update(state, 0.016); // kills u2, sets deathTimer
    // Tick past the linger duration
    CombatSystem.update(state, BalanceConfig.UNIT_DEATH_LINGER + 0.1);
    expect(state.units.has(u2.id)).toBe(false);
  });

  it("dead unit is no longer targeted after removal", () => {
    const state = makeState();
    const u1 = addUnit(state, {
      id: "u1",
      owner: "p1",
      position: { x: 10, y: 10 },
    });
    const u2 = addUnit(state, {
      id: "u2",
      owner: "p2",
      position: { x: 11, y: 10 },
      hp: 1,
    });

    CombatSystem.update(state, 0.016); // kills u2
    CombatSystem.update(state, BalanceConfig.UNIT_DEATH_LINGER + 0.1); // removes u2
    // u1 should drop its target
    CombatSystem.update(state, 0.016);
    expect(u1.targetId).toBeNull();
  });

  it("two swordsmen fight: weaker (less hp) dies first", () => {
    const state = makeState();
    // Both swordsmen, atk=15, attackSpeed=1.0
    // u1 has full hp (100), u2 has 30 hp → dies after 2 hits (30/15=2)
    const u1 = addUnit(state, {
      id: "u1",
      owner: "p1",
      position: { x: 10, y: 10 },
    });
    const u2 = addUnit(state, {
      id: "u2",
      owner: "p2",
      position: { x: 11, y: 10 },
      hp: 30,
    });

    // Run enough time for u2 to die (needs 2 hits from u1, ~2 seconds)
    for (let i = 0; i < 200; i++) CombatSystem.update(state, 1 / 60);

    expect(u2.state).toBe(UnitState.DIE);
    // u1 took some damage from u2 but should still be alive
    expect(u1.state).not.toBe(UnitState.DIE);
    expect(u1.hp).toBeGreaterThan(0);
  });

  it("combat ends when one unit dies — winner stops attacking", () => {
    const state = makeState();
    addUnit(state, { id: "u1", owner: "p1", position: { x: 10, y: 10 } });
    const u2 = addUnit(state, {
      id: "u2",
      owner: "p2",
      position: { x: 11, y: 10 },
      hp: 1,
    });

    CombatSystem.update(state, 0.016); // u2 dies
    CombatSystem.update(state, BalanceConfig.UNIT_DEATH_LINGER + 0.1); // u2 removed

    const dmg: unknown[] = [];
    EventBus.on("unitDamaged", (e) => dmg.push(e));
    CombatSystem.update(state, 0.016); // u1 has no target
    expect(dmg).toHaveLength(0);
  });

  it("hp never goes below 0 after kill", () => {
    const state = makeState();
    addUnit(state, { id: "u1", owner: "p1", position: { x: 10, y: 10 } });
    const u2 = addUnit(state, {
      id: "u2",
      owner: "p2",
      position: { x: 11, y: 10 },
      hp: 1,
    });

    CombatSystem.update(state, 0.016);
    expect(u2.hp).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// killUnit helper
// ---------------------------------------------------------------------------

describe("killUnit", () => {
  it("forces unit into DIE state", () => {
    const state = makeState();
    const u = addUnit(state, { id: "u1", owner: "p1" });
    killUnit(state, u);
    expect(u.state).toBe(UnitState.DIE);
  });

  it("sets deathTimer to UNIT_DEATH_LINGER", () => {
    const state = makeState();
    const u = addUnit(state, { id: "u1", owner: "p1" });
    killUnit(state, u);
    expect(u.deathTimer).toBe(BalanceConfig.UNIT_DEATH_LINGER);
  });

  it("emits unitDied with killerUnitId when provided", () => {
    const state = makeState();
    const u = addUnit(state, { id: "u1", owner: "p1" });
    const died: unknown[] = [];
    EventBus.on("unitDied", (e) => died.push(e));
    killUnit(state, u, "killer-99");
    expect(died[0]).toMatchObject({ unitId: u.id, killerUnitId: "killer-99" });
  });

  it("emits unitDied without killerUnitId when not provided", () => {
    const state = makeState();
    const u = addUnit(state, { id: "u1", owner: "p1" });
    const died: unknown[] = [];
    EventBus.on("unitDied", (e) => died.push(e));
    killUnit(state, u);
    expect(died[0]).toMatchObject({ unitId: u.id });
  });

  it("is idempotent — calling twice on DIE unit is safe", () => {
    const state = makeState();
    const u = addUnit(state, { id: "u1", owner: "p1" });
    killUnit(state, u);
    expect(() => killUnit(state, u)).not.toThrow();
    expect(u.state).toBe(UnitState.DIE);
  });

  it("clears targetId and path", () => {
    const state = makeState();
    const u = addUnit(state, { id: "u1", owner: "p1" });
    u.targetId = "some-target";
    u.path = [{ x: 1, y: 1 }];
    killUnit(state, u);
    expect(u.targetId).toBeNull();
    expect(u.path).toBeNull();
  });
});
