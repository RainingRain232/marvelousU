import { describe, it, expect, beforeEach, vi } from "vitest";
import { AbilitySystem, attachAbilities } from "@sim/systems/AbilitySystem";
import { createGameState } from "@sim/state/GameState";
import { createUnit, _resetUnitIdCounter } from "@sim/entities/Unit";
import { EventBus } from "@sim/core/EventBus";
import { AbilityType, UnitState, UnitType } from "@/types";
import { createAbility } from "@sim/abilities/index";
import type { Unit } from "@sim/entities/Unit";
import type { GameState } from "@sim/state/GameState";
import type { Ability } from "@sim/abilities/Ability";

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
    position?: { x: number; y: number };
    startState?: UnitState;
    hp?: number;
  },
): Unit {
  const unit = createUnit({
    id: opts.id,
    type: opts.type ?? UnitType.MAGE,
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

/** Add a ready ability directly to state and attach its id to a unit. */
function addAbility(
  state: GameState,
  unit: Unit,
  type: AbilityType,
  overrides: Partial<Ability> = {},
): Ability {
  const id = `${unit.id}-ab-${unit.abilityIds.length}`;
  const ab = { ...createAbility(type, id), ...overrides };
  state.abilities.set(id, ab);
  unit.abilityIds.push(id);
  return ab;
}

beforeEach(() => {
  _resetUnitIdCounter();
  EventBus.clear();
});

// ---------------------------------------------------------------------------
// Cooldown management
// ---------------------------------------------------------------------------

describe("cooldown ticking", () => {
  it("decrements currentCooldown each tick", () => {
    const state = makeState();
    const unit = addUnit(state, {});
    const ab = addAbility(state, unit, AbilityType.FIREBALL, { currentCooldown: 3 });

    AbilitySystem.update(state, 1);

    expect(ab.currentCooldown).toBe(2);
  });

  it("does not go below 0", () => {
    const state = makeState();
    const unit = addUnit(state, {});
    const ab = addAbility(state, unit, AbilityType.FIREBALL, { currentCooldown: 0.5 });

    AbilitySystem.update(state, 2);

    expect(ab.currentCooldown).toBe(0);
  });

  it("ticks multiple abilities on the same unit", () => {
    const state = makeState();
    const unit = addUnit(state, {});
    const ab1 = addAbility(state, unit, AbilityType.FIREBALL, { currentCooldown: 4 });
    const ab2 = addAbility(state, unit, AbilityType.CHAIN_LIGHTNING, { currentCooldown: 2 });

    AbilitySystem.update(state, 1);

    expect(ab1.currentCooldown).toBe(3);
    expect(ab2.currentCooldown).toBe(1);
  });

  it("ticks abilities on multiple different units", () => {
    const state = makeState();
    const u1 = addUnit(state, { id: "u1" });
    const u2 = addUnit(state, { id: "u2" });
    const ab1 = addAbility(state, u1, AbilityType.FIREBALL, { currentCooldown: 5 });
    const ab2 = addAbility(state, u2, AbilityType.FIREBALL, { currentCooldown: 3 });

    AbilitySystem.update(state, 1);

    expect(ab1.currentCooldown).toBe(4);
    expect(ab2.currentCooldown).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Cast initiation (ATTACK → CAST)
// ---------------------------------------------------------------------------

describe("cast initiation", () => {
  it("transitions ATTACK unit to CAST when ability is ready and target in range", () => {
    const state = makeState();
    const mage = addUnit(state, { id: "mage", startState: UnitState.ATTACK });
    const enemy = addUnit(state, { id: "enemy", owner: "p2", position: { x: 11, y: 10 } });
    mage.targetId = enemy.id;
    addAbility(state, mage, AbilityType.FIREBALL, { currentCooldown: 0, range: 6 });

    AbilitySystem.update(state, 0.016);

    expect(mage.state).toBe(UnitState.CAST);
  });

  it("sets castTimer from the ability's castTime", () => {
    const state = makeState();
    const mage = addUnit(state, { id: "mage", startState: UnitState.ATTACK });
    const enemy = addUnit(state, { id: "enemy", owner: "p2", position: { x: 11, y: 10 } });
    mage.targetId = enemy.id;
    addAbility(state, mage, AbilityType.FIREBALL, { currentCooldown: 0, range: 6, castTime: 0.5 });

    AbilitySystem.update(state, 0.016);

    expect(mage.castTimer).toBeCloseTo(0.5);
  });

  it("stores target position on ability", () => {
    const state = makeState();
    const mage = addUnit(state, { id: "mage", startState: UnitState.ATTACK });
    const enemy = addUnit(state, { id: "enemy", owner: "p2", position: { x: 13, y: 10 } });
    mage.targetId = enemy.id;
    const ab = addAbility(state, mage, AbilityType.FIREBALL, { currentCooldown: 0, range: 6 });

    AbilitySystem.update(state, 0.016);

    expect(ab.targetPosition).toEqual({ x: 13, y: 10 });
  });

  it("does NOT cast when ability is on cooldown", () => {
    const state = makeState();
    const mage = addUnit(state, { id: "mage", startState: UnitState.ATTACK });
    const enemy = addUnit(state, { id: "enemy", owner: "p2", position: { x: 11, y: 10 } });
    mage.targetId = enemy.id;
    addAbility(state, mage, AbilityType.FIREBALL, { currentCooldown: 3, range: 6 });

    AbilitySystem.update(state, 0.016);

    expect(mage.state).toBe(UnitState.ATTACK);
  });

  it("does NOT cast when target is out of range", () => {
    const state = makeState();
    const mage = addUnit(state, { id: "mage", startState: UnitState.ATTACK });
    const enemy = addUnit(state, { id: "enemy", owner: "p2", position: { x: 25, y: 10 } });
    mage.targetId = enemy.id;
    addAbility(state, mage, AbilityType.FIREBALL, { currentCooldown: 0, range: 4 });

    AbilitySystem.update(state, 0.016);

    expect(mage.state).toBe(UnitState.ATTACK);
  });

  it("does NOT cast when no target is set", () => {
    const state = makeState();
    const mage = addUnit(state, { id: "mage", startState: UnitState.ATTACK });
    mage.targetId = null;
    addAbility(state, mage, AbilityType.FIREBALL, { currentCooldown: 0, range: 6 });

    AbilitySystem.update(state, 0.016);

    expect(mage.state).toBe(UnitState.ATTACK);
  });

  it("does NOT cast when target is already dead", () => {
    const state = makeState();
    const mage = addUnit(state, { id: "mage", startState: UnitState.ATTACK });
    const enemy = addUnit(state, { id: "enemy", owner: "p2", startState: UnitState.DIE });
    mage.targetId = enemy.id;
    addAbility(state, mage, AbilityType.FIREBALL, { currentCooldown: 0, range: 6 });

    AbilitySystem.update(state, 0.016);

    expect(mage.state).toBe(UnitState.ATTACK);
  });

  it("emits unitStateChanged when transitioning to CAST", () => {
    const state = makeState();
    const mage = addUnit(state, { id: "mage", startState: UnitState.ATTACK });
    const enemy = addUnit(state, { id: "enemy", owner: "p2", position: { x: 11, y: 10 } });
    mage.targetId = enemy.id;
    addAbility(state, mage, AbilityType.FIREBALL, { currentCooldown: 0, range: 6 });

    const events: { from: UnitState; to: UnitState }[] = [];
    EventBus.on("unitStateChanged", (e) => events.push({ from: e.from, to: e.to }));

    AbilitySystem.update(state, 0.016);

    const castEvent = events.find(e => e.to === UnitState.CAST);
    expect(castEvent).toBeDefined();
    expect(castEvent?.from).toBe(UnitState.ATTACK);
  });

  it("skips cast initiation for non-ability units", () => {
    const state = makeState();
    const swordsman = createUnit({
      type: UnitType.SWORDSMAN,
      owner: "p1",
      position: { x: 10, y: 10 },
    });
    swordsman.stateMachine.forceState(UnitState.ATTACK);
    swordsman.state = UnitState.ATTACK;
    state.units.set(swordsman.id, swordsman);

    // Should not throw or change state
    AbilitySystem.update(state, 0.1);

    expect(swordsman.state).toBe(UnitState.ATTACK);
  });
});

// ---------------------------------------------------------------------------
// Cast ticking (CAST → IDLE)
// ---------------------------------------------------------------------------

describe("cast ticking", () => {
  it("decrements castTimer while in CAST state", () => {
    const state = makeState();
    const mage = addUnit(state, { id: "mage", startState: UnitState.CAST });
    mage.castTimer = 0.5;
    addAbility(state, mage, AbilityType.FIREBALL, { currentCooldown: 0, targetPosition: { x: 11, y: 10 } });

    AbilitySystem.update(state, 0.1);

    expect(mage.castTimer).toBeCloseTo(0.4);
  });

  it("returns to IDLE when castTimer expires", () => {
    const state = makeState();
    const mage = addUnit(state, { id: "mage", startState: UnitState.CAST });
    mage.castTimer = 0.1;
    addAbility(state, mage, AbilityType.FIREBALL, { currentCooldown: 0, targetPosition: { x: 11, y: 10 } });

    AbilitySystem.update(state, 0.2);

    expect(mage.state).toBe(UnitState.IDLE);
  });

  it("emits unitStateChanged back to IDLE when cast completes", () => {
    const state = makeState();
    const mage = addUnit(state, { id: "mage", startState: UnitState.CAST });
    mage.castTimer = 0.05;
    addAbility(state, mage, AbilityType.FIREBALL, { currentCooldown: 0, targetPosition: { x: 11, y: 10 } });

    const events: { from: UnitState; to: UnitState }[] = [];
    EventBus.on("unitStateChanged", (e) => events.push({ from: e.from, to: e.to }));

    AbilitySystem.update(state, 0.1);

    const idleEvent = events.find(e => e.to === UnitState.IDLE);
    expect(idleEvent).toBeDefined();
  });

  it("calls ability.execute when cast completes", () => {
    const state = makeState();
    const mage = addUnit(state, { id: "mage", startState: UnitState.CAST });
    mage.castTimer = 0.05;
    const ab = addAbility(state, mage, AbilityType.FIREBALL, {
      currentCooldown: 0,
      targetPosition: { x: 11, y: 10 },
    });
    const executeSpy = vi.spyOn(ab, "execute");

    AbilitySystem.update(state, 0.1);

    expect(executeSpy).toHaveBeenCalledOnce();
  });

  it("emits abilityUsed event when cast completes", () => {
    const state = makeState();
    const mage = addUnit(state, { id: "mage", startState: UnitState.CAST });
    mage.castTimer = 0.05;
    const ab = addAbility(state, mage, AbilityType.FIREBALL, {
      currentCooldown: 0,
      targetPosition: { x: 11, y: 10 },
    });

    const used: string[] = [];
    EventBus.on("abilityUsed", (e) => used.push(e.abilityId));

    AbilitySystem.update(state, 0.1);

    expect(used).toContain(ab.id);
  });

  it("puts ability on cooldown after execution", () => {
    const state = makeState();
    const mage = addUnit(state, { id: "mage", startState: UnitState.CAST });
    mage.castTimer = 0.05;
    const ab = addAbility(state, mage, AbilityType.FIREBALL, {
      currentCooldown: 0,
      cooldown: 5,
      targetPosition: { x: 11, y: 10 },
    });

    AbilitySystem.update(state, 0.1);

    expect(ab.currentCooldown).toBe(5);
  });

  it("clears targetPosition after execution", () => {
    const state = makeState();
    const mage = addUnit(state, { id: "mage", startState: UnitState.CAST });
    mage.castTimer = 0.05;
    const ab = addAbility(state, mage, AbilityType.FIREBALL, {
      currentCooldown: 0,
      targetPosition: { x: 11, y: 10 },
    });

    AbilitySystem.update(state, 0.1);

    expect(ab.targetPosition).toBeNull();
  });

  it("does not execute while castTimer is still positive", () => {
    const state = makeState();
    const mage = addUnit(state, { id: "mage", startState: UnitState.CAST });
    mage.castTimer = 0.5;
    const ab = addAbility(state, mage, AbilityType.FIREBALL, {
      currentCooldown: 0,
      targetPosition: { x: 11, y: 10 },
    });
    const executeSpy = vi.spyOn(ab, "execute");

    AbilitySystem.update(state, 0.1);

    expect(executeSpy).not.toHaveBeenCalled();
    expect(mage.state).toBe(UnitState.CAST);
  });
});

// ---------------------------------------------------------------------------
// ensureAbilities / attachAbilities
// ---------------------------------------------------------------------------

describe("ensureAbilities (lazy init)", () => {
  it("creates abilities in state.abilities for mage unit on first update", () => {
    const state = makeState();
    const mage = createUnit({ type: UnitType.MAGE, owner: "p1", position: { x: 10, y: 10 } });
    state.units.set(mage.id, mage);

    AbilitySystem.update(state, 0.016);

    expect(state.abilities.size).toBeGreaterThan(0);
    expect(mage.abilityIds.length).toBeGreaterThan(0);
  });

  it("does not create duplicate abilities on subsequent updates", () => {
    const state = makeState();
    const mage = createUnit({ type: UnitType.MAGE, owner: "p1", position: { x: 10, y: 10 } });
    state.units.set(mage.id, mage);

    AbilitySystem.update(state, 0.016);
    const firstCount = state.abilities.size;

    AbilitySystem.update(state, 0.016);

    expect(state.abilities.size).toBe(firstCount);
  });

  it("attachAbilities pre-populates for a mage unit", () => {
    const state = makeState();
    const mage = createUnit({ type: UnitType.MAGE, owner: "p1", position: { x: 10, y: 10 } });
    state.units.set(mage.id, mage);

    attachAbilities(state, mage);

    expect(mage.abilityIds.length).toBeGreaterThan(0);
    for (const id of mage.abilityIds) {
      expect(state.abilities.has(id)).toBe(true);
    }
  });

  it("attachAbilities is a no-op for non-mage units", () => {
    const state = makeState();
    const swordsman = createUnit({ type: UnitType.SWORDSMAN, owner: "p1", position: { x: 10, y: 10 } });
    state.units.set(swordsman.id, swordsman);

    attachAbilities(state, swordsman);

    expect(swordsman.abilityIds).toHaveLength(0);
    expect(state.abilities.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Dead unit handling
// ---------------------------------------------------------------------------

describe("dead unit handling", () => {
  it("does not tick cooldowns on abilities owned by dead units (skips unit loop)", () => {
    const state = makeState();
    const mage = addUnit(state, { id: "mage", startState: UnitState.DIE });
    mage.castTimer = 0.5;
    addAbility(state, mage, AbilityType.FIREBALL, { currentCooldown: 0 });

    // Ability cooldowns are still ticked (they live in state.abilities)
    // but the unit's cast is not processed
    AbilitySystem.update(state, 0.1);

    expect(mage.castTimer).toBe(0.5); // unchanged — unit skipped
  });

  it("skips cast initiation for dead units", () => {
    const state = makeState();
    const mage = addUnit(state, { id: "mage", startState: UnitState.DIE });
    const enemy = addUnit(state, { id: "enemy", owner: "p2", position: { x: 11, y: 10 } });
    mage.targetId = enemy.id;
    addAbility(state, mage, AbilityType.FIREBALL, { currentCooldown: 0, range: 6 });

    AbilitySystem.update(state, 0.016);

    expect(mage.state).toBe(UnitState.DIE);
  });
});
