import { describe, it, expect, beforeEach } from "vitest";
import { AISystem } from "@sim/systems/AISystem";
import { createGameState } from "@sim/state/GameState";
import { createPlayerState } from "@sim/state/PlayerState";
import { createUnit, _resetUnitIdCounter } from "@sim/entities/Unit";
import { createBuilding } from "@sim/entities/Building";
import { createBase } from "@sim/entities/Base";
import { EventBus } from "@sim/core/EventBus";
import {
  UnitState,
  UnitType,
  Direction,
  BuildingType,
  BuildingState,
} from "@/types";
import type { Unit } from "@sim/entities/Unit";
import type { GameState } from "@sim/state/GameState";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DT = 1 / 60;

function makeState(): GameState {
  const state = createGameState(30, 20);
  // West player
  state.players.set("p1", createPlayerState("p1", Direction.WEST));
  // East player
  state.players.set("p2", createPlayerState("p2", Direction.EAST));

  // West base
  const westBase = createBase({
    id: "base-west",
    direction: Direction.WEST,
    owner: "p1",
    position: { x: 1, y: 9 },
    spawnOffset: { x: 4, y: 1 },
  });
  state.bases.set(westBase.id, westBase);
  state.players.get("p1")!.ownedBaseId = westBase.id;

  // East base
  const eastBase = createBase({
    id: "base-east",
    direction: Direction.EAST,
    owner: "p2",
    position: { x: 26, y: 9 },
    spawnOffset: { x: -1, y: 1 },
  });
  state.bases.set(eastBase.id, eastBase);
  state.players.get("p2")!.ownedBaseId = eastBase.id;

  return state;
}

function addUnit(
  state: GameState,
  opts: {
    id?: string;
    owner?: string;
    type?: UnitType;
    position?: { x: number; y: number };
    startState?: UnitState;
  },
): Unit {
  const unit = createUnit({
    id: opts.id,
    type: opts.type ?? UnitType.SWORDSMAN,
    owner: opts.owner ?? "p1",
    position: opts.position ?? { x: 10, y: 10 },
    facingDirection: Direction.EAST,
  });
  if (opts.startState && opts.startState !== UnitState.IDLE) {
    unit.stateMachine.forceState(opts.startState);
    unit.state = opts.startState;
  }
  state.units.set(unit.id, unit);
  return unit;
}

beforeEach(() => {
  _resetUnitIdCounter();
  EventBus.clear();
});

// ---------------------------------------------------------------------------
// 1. March to base (IDLE → MOVE)
// ---------------------------------------------------------------------------

describe("march to base", () => {
  it("puts an idle p1 unit into MOVE state", () => {
    const state = makeState();
    const unit = addUnit(state, { owner: "p1", position: { x: 10, y: 10 } });
    expect(unit.state).toBe(UnitState.IDLE);

    AISystem.update(state, DT);

    expect(unit.state).toBe(UnitState.MOVE);
  });

  it("puts an idle p2 unit into MOVE state", () => {
    const state = makeState();
    const unit = addUnit(state, { owner: "p2", position: { x: 20, y: 10 } });

    AISystem.update(state, DT);

    expect(unit.state).toBe(UnitState.MOVE);
  });

  it("sets a non-null path toward the enemy base", () => {
    const state = makeState();
    const unit = addUnit(state, { owner: "p1", position: { x: 10, y: 10 } });

    AISystem.update(state, DT);

    expect(unit.path).not.toBeNull();
    expect(unit.path!.length).toBeGreaterThan(0);
  });

  it("does NOT move a unit that already has a targetId", () => {
    const state = makeState();
    const unit = addUnit(state, { owner: "p1", position: { x: 10, y: 10 } });
    unit.targetId = "some-target"; // simulate CombatSystem having set this

    AISystem.update(state, DT);

    // targetId was set, so AISystem should leave unit alone
    expect(unit.state).toBe(UnitState.IDLE);
  });

  it("does not act on dead units", () => {
    const state = makeState();
    const unit = addUnit(state, {
      owner: "p1",
      position: { x: 10, y: 10 },
      startState: UnitState.DIE,
    });

    AISystem.update(state, DT);

    expect(unit.state).toBe(UnitState.DIE);
  });

  it("does not act on casting units", () => {
    const state = makeState();
    const unit = addUnit(state, {
      owner: "p1",
      type: UnitType.MAGE,
      position: { x: 10, y: 10 },
      startState: UnitState.CAST,
    });

    AISystem.update(state, DT);

    expect(unit.state).toBe(UnitState.CAST);
  });
});

// ---------------------------------------------------------------------------
// 2. Priority target selection
// ---------------------------------------------------------------------------

describe("priority targeting", () => {
  it("prefers mage over swordsman when both are in aggro range", () => {
    const state = makeState();
    const attacker = addUnit(state, {
      owner: "p1",
      position: { x: 15, y: 10 },
      startState: UnitState.ATTACK,
    });

    // Mage (higher priority) nearby
    const mage = addUnit(state, {
      owner: "p2",
      type: UnitType.MAGE,
      position: { x: 16, y: 10 },
    });
    // Swordsman (lower priority) also nearby
    const sword = addUnit(state, {
      owner: "p2",
      type: UnitType.SWORDSMAN,
      position: { x: 17, y: 10 },
    });

    // CombatSystem would have set targetId to the swordsman (nearest)
    attacker.targetId = sword.id;

    AISystem.update(state, DT);

    // AISystem should upgrade to the mage
    expect(attacker.targetId).toBe(mage.id);
  });

  it("prefers archer over knight", () => {
    const state = makeState();
    const attacker = addUnit(state, {
      owner: "p1",
      position: { x: 15, y: 10 },
      startState: UnitState.ATTACK,
    });

    const archer = addUnit(state, {
      owner: "p2",
      type: UnitType.ARCHER,
      position: { x: 16, y: 10 },
    });
    const knight = addUnit(state, {
      owner: "p2",
      type: UnitType.KNIGHT,
      position: { x: 15, y: 11 },
    });

    attacker.targetId = knight.id;

    AISystem.update(state, DT);

    expect(attacker.targetId).toBe(archer.id);
  });

  it("keeps current target if it is already highest priority", () => {
    const state = makeState();
    const attacker = addUnit(state, {
      owner: "p1",
      position: { x: 15, y: 10 },
      startState: UnitState.ATTACK,
    });

    const mage = addUnit(state, {
      owner: "p2",
      type: UnitType.MAGE,
      position: { x: 16, y: 10 },
    });
    // Lower priority unit also in range
    addUnit(state, {
      owner: "p2",
      type: UnitType.SWORDSMAN,
      position: { x: 17, y: 10 },
    });

    attacker.targetId = mage.id;

    AISystem.update(state, DT);

    expect(attacker.targetId).toBe(mage.id);
  });

  it("ignores dead units when selecting priority target", () => {
    const state = makeState();
    const attacker = addUnit(state, {
      owner: "p1",
      position: { x: 15, y: 10 },
      startState: UnitState.ATTACK,
    });

    const mage = addUnit(state, {
      owner: "p2",
      type: UnitType.MAGE,
      position: { x: 16, y: 10 },
      startState: UnitState.DIE, // already dead
    });
    const sword = addUnit(state, {
      owner: "p2",
      type: UnitType.SWORDSMAN,
      position: { x: 17, y: 10 },
    });

    attacker.targetId = sword.id;

    AISystem.update(state, DT);

    // Dead mage should not be selected despite higher priority
    expect(attacker.targetId).toBe(sword.id);
    expect(attacker.targetId).not.toBe(mage.id);
  });

  it("ignores friendly units when selecting priority target", () => {
    const state = makeState();
    const attacker = addUnit(state, {
      owner: "p1",
      position: { x: 15, y: 10 },
      startState: UnitState.ATTACK,
    });

    // Friendly mage — should be ignored
    addUnit(state, {
      owner: "p1",
      type: UnitType.MAGE,
      position: { x: 16, y: 10 },
    });
    const enemy = addUnit(state, {
      owner: "p2",
      type: UnitType.SWORDSMAN,
      position: { x: 17, y: 10 },
    });

    attacker.targetId = enemy.id;

    AISystem.update(state, DT);

    expect(attacker.targetId).toBe(enemy.id);
  });

  it("does not upgrade to a target outside aggro range", () => {
    const state = makeState();
    const attacker = addUnit(state, {
      owner: "p1",
      position: { x: 15, y: 10 },
      startState: UnitState.ATTACK,
    });

    const nearby = addUnit(state, {
      owner: "p2",
      type: UnitType.SWORDSMAN,
      position: { x: 16, y: 10 },
    });
    // Mage far outside aggro range (AGGRO_RANGE = 6)
    addUnit(state, {
      owner: "p2",
      type: UnitType.MAGE,
      position: { x: 15, y: 30 },
    });

    attacker.targetId = nearby.id;

    AISystem.update(state, DT);

    expect(attacker.targetId).toBe(nearby.id);
  });
});

// ---------------------------------------------------------------------------
// 3. Building diversion
// ---------------------------------------------------------------------------

describe("building diversion", () => {
  it("diverts a MOVE unit toward a nearby enemy building", () => {
    const state = makeState();
    const unit = addUnit(state, {
      owner: "p1",
      position: { x: 15, y: 10 },
      startState: UnitState.MOVE,
    });

    // Enemy building very close (within BUILDING_AGGRO_RANGE = 5 tiles)
    const building = createBuilding({
      id: "bld-1",
      type: BuildingType.BARRACKS,
      owner: "p2",
      position: { x: 17, y: 10 },
    });
    state.buildings.set(building.id, building);

    AISystem.update(state, DT);

    expect(unit.targetId).toBe(building.id);
  });

  it("sets a path toward the building", () => {
    const state = makeState();
    const unit = addUnit(state, {
      owner: "p1",
      position: { x: 15, y: 10 },
      startState: UnitState.MOVE,
    });

    const building = createBuilding({
      id: "bld-1",
      type: BuildingType.BARRACKS,
      owner: "p2",
      position: { x: 17, y: 10 },
    });
    state.buildings.set(building.id, building);

    AISystem.update(state, DT);

    expect(unit.path).not.toBeNull();
  });

  it("does not divert toward a friendly building", () => {
    const state = makeState();
    const unit = addUnit(state, {
      owner: "p1",
      position: { x: 15, y: 10 },
      startState: UnitState.MOVE,
    });

    // Same owner — should be ignored
    const ownBuilding = createBuilding({
      id: "bld-own",
      type: BuildingType.BARRACKS,
      owner: "p1",
      position: { x: 16, y: 10 },
    });
    state.buildings.set(ownBuilding.id, ownBuilding);

    AISystem.update(state, DT);

    expect(unit.targetId).toBeNull();
  });

  it("does not divert toward a destroyed building", () => {
    const state = makeState();
    const unit = addUnit(state, {
      owner: "p1",
      position: { x: 15, y: 10 },
      startState: UnitState.MOVE,
    });

    const building = createBuilding({
      id: "bld-dead",
      type: BuildingType.BARRACKS,
      owner: "p2",
      position: { x: 16, y: 10 },
    });
    building.state = BuildingState.DESTROYED;
    state.buildings.set(building.id, building);

    AISystem.update(state, DT);

    expect(unit.targetId).toBeNull();
  });

  it("does not divert toward a building beyond BUILDING_AGGRO_RANGE", () => {
    const state = makeState();
    const unit = addUnit(state, {
      owner: "p1",
      position: { x: 15, y: 10 },
      startState: UnitState.MOVE,
    });

    // 10 tiles away — beyond BUILDING_AGGRO_RANGE of 5
    const building = createBuilding({
      id: "bld-far",
      type: BuildingType.BARRACKS,
      owner: "p2",
      position: { x: 25, y: 10 },
    });
    state.buildings.set(building.id, building);

    AISystem.update(state, DT);

    expect(unit.targetId).toBeNull();
  });

  it("does not re-divert if already heading toward that building", () => {
    const state = makeState();
    const unit = addUnit(state, {
      owner: "p1",
      position: { x: 15, y: 10 },
      startState: UnitState.MOVE,
    });

    const building = createBuilding({
      id: "bld-1",
      type: BuildingType.BARRACKS,
      owner: "p2",
      position: { x: 17, y: 10 },
    });
    state.buildings.set(building.id, building);

    // Pre-set as already heading there
    unit.targetId = building.id;
    unit.path = [{ x: 17, y: 10 }];
    unit.pathIndex = 0;
    const pathBefore = unit.path;

    AISystem.update(state, DT);

    // Path should not have been replaced
    expect(unit.path).toBe(pathBefore);
  });
});

// ---------------------------------------------------------------------------
// 4. MOVE + stale target cleanup
// ---------------------------------------------------------------------------

describe("stale target cleanup", () => {
  it("clears targetId on MOVE unit when target unit no longer exists", () => {
    const state = makeState();
    const unit = addUnit(state, {
      owner: "p1",
      position: { x: 15, y: 10 },
      startState: UnitState.MOVE,
    });
    unit.targetId = "ghost-unit"; // unit not in state

    AISystem.update(state, DT);

    expect(unit.targetId).toBeNull();
  });

  it("clears targetId on ATTACK unit when target unit dies", () => {
    const state = makeState();
    const attacker = addUnit(state, {
      owner: "p1",
      position: { x: 15, y: 10 },
      startState: UnitState.ATTACK,
    });
    const victim = addUnit(state, {
      owner: "p2",
      position: { x: 16, y: 10 },
      startState: UnitState.DIE,
    });
    attacker.targetId = victim.id;

    AISystem.update(state, DT);

    expect(attacker.targetId).toBeNull();
  });
});
