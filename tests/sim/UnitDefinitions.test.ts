import { describe, it, expect, beforeEach } from "vitest";
import { createUnit, _resetUnitIdCounter, UNIT_TRANSITIONS } from "@sim/entities/Unit";
import { UNIT_DEFINITIONS } from "@sim/config/UnitDefinitions";
import { Direction, UnitType, UnitState } from "@/types";

beforeEach(() => {
  _resetUnitIdCounter();
});

// ---------------------------------------------------------------------------
// UNIT_DEFINITIONS completeness
// ---------------------------------------------------------------------------

describe("UNIT_DEFINITIONS", () => {
  const allTypes = Object.values(UnitType);

  it("has a definition for every UnitType", () => {
    for (const t of allTypes) {
      expect(UNIT_DEFINITIONS[t]).toBeDefined();
    }
  });

  it("every definition has positive hp", () => {
    for (const t of allTypes) {
      expect(UNIT_DEFINITIONS[t].hp).toBeGreaterThan(0);
    }
  });

  it("every definition has positive atk", () => {
    for (const t of allTypes) {
      expect(UNIT_DEFINITIONS[t].atk).toBeGreaterThan(0);
    }
  });

  it("every definition has positive speed", () => {
    for (const t of allTypes) {
      expect(UNIT_DEFINITIONS[t].speed).toBeGreaterThan(0);
    }
  });

  it("every definition has non-negative range", () => {
    for (const t of allTypes) {
      expect(UNIT_DEFINITIONS[t].range).toBeGreaterThanOrEqual(0);
    }
  });

  it("every definition has a non-empty spriteKey", () => {
    for (const t of allTypes) {
      expect(UNIT_DEFINITIONS[t].spriteKey.length).toBeGreaterThan(0);
    }
  });

  it("Swordsman is melee (range 1)", () => {
    expect(UNIT_DEFINITIONS[UnitType.SWORDSMAN].range).toBe(1);
  });

  it("Archer is ranged (range > 1)", () => {
    expect(UNIT_DEFINITIONS[UnitType.ARCHER].range).toBeGreaterThan(1);
  });

  it("Mage has ability types", () => {
    expect(UNIT_DEFINITIONS[UnitType.MAGE].abilityTypes.length).toBeGreaterThan(0);
  });

  it("non-mage units have no ability types", () => {
    const noAbility = [UnitType.SWORDSMAN, UnitType.ARCHER, UnitType.KNIGHT, UnitType.PIKEMAN];
    for (const t of noAbility) {
      expect(UNIT_DEFINITIONS[t].abilityTypes).toHaveLength(0);
    }
  });
});

// ---------------------------------------------------------------------------
// createUnit — identity & stats
// ---------------------------------------------------------------------------

describe("createUnit — identity & stats", () => {
  it("returns a unit with auto-incremented id", () => {
    const a = createUnit({ type: UnitType.SWORDSMAN, owner: "p1", position: { x: 5, y: 5 } });
    const b = createUnit({ type: UnitType.SWORDSMAN, owner: "p1", position: { x: 5, y: 5 } });
    expect(a.id).toBe("unit-1");
    expect(b.id).toBe("unit-2");
  });

  it("respects an explicit id override", () => {
    const u = createUnit({ type: UnitType.ARCHER, owner: "p2", position: { x: 0, y: 0 }, id: "custom-42" });
    expect(u.id).toBe("custom-42");
  });

  it("sets type from options", () => {
    const u = createUnit({ type: UnitType.KNIGHT, owner: "p1", position: { x: 1, y: 1 } });
    expect(u.type).toBe(UnitType.KNIGHT);
  });

  it("sets owner from options", () => {
    const u = createUnit({ type: UnitType.MAGE, owner: "player-west", position: { x: 0, y: 0 } });
    expect(u.owner).toBe("player-west");
  });

  it("copies position (no shared reference)", () => {
    const pos = { x: 3, y: 7 };
    const u = createUnit({ type: UnitType.SWORDSMAN, owner: "p1", position: pos });
    expect(u.position).toEqual({ x: 3, y: 7 });
    pos.x = 99;
    expect(u.position.x).toBe(3);
  });

  it("hp and maxHp match definition", () => {
    const def = UNIT_DEFINITIONS[UnitType.KNIGHT];
    const u = createUnit({ type: UnitType.KNIGHT, owner: "p1", position: { x: 0, y: 0 } });
    expect(u.hp).toBe(def.hp);
    expect(u.maxHp).toBe(def.hp);
  });

  it("atk matches definition", () => {
    const def = UNIT_DEFINITIONS[UnitType.ARCHER];
    const u = createUnit({ type: UnitType.ARCHER, owner: "p1", position: { x: 0, y: 0 } });
    expect(u.atk).toBe(def.atk);
  });

  it("speed matches definition", () => {
    const def = UNIT_DEFINITIONS[UnitType.PIKEMAN];
    const u = createUnit({ type: UnitType.PIKEMAN, owner: "p1", position: { x: 0, y: 0 } });
    expect(u.speed).toBe(def.speed);
  });

  it("range matches definition", () => {
    const def = UNIT_DEFINITIONS[UnitType.MAGE];
    const u = createUnit({ type: UnitType.MAGE, owner: "p1", position: { x: 0, y: 0 } });
    expect(u.range).toBe(def.range);
  });
});

// ---------------------------------------------------------------------------
// createUnit — initial state
// ---------------------------------------------------------------------------

describe("createUnit — initial state", () => {
  it("starts in IDLE state", () => {
    const u = createUnit({ type: UnitType.SWORDSMAN, owner: "p1", position: { x: 0, y: 0 } });
    expect(u.state).toBe(UnitState.IDLE);
  });

  it("stateMachine starts in IDLE", () => {
    const u = createUnit({ type: UnitType.SWORDSMAN, owner: "p1", position: { x: 0, y: 0 } });
    expect(u.stateMachine.currentState).toBe(UnitState.IDLE);
  });

  it("defaults facingDirection to EAST", () => {
    const u = createUnit({ type: UnitType.SWORDSMAN, owner: "p1", position: { x: 0, y: 0 } });
    expect(u.facingDirection).toBe(Direction.EAST);
  });

  it("respects explicit facingDirection", () => {
    const u = createUnit({ type: UnitType.SWORDSMAN, owner: "p1", position: { x: 0, y: 0 }, facingDirection: Direction.WEST });
    expect(u.facingDirection).toBe(Direction.WEST);
  });

  it("targetId starts null", () => {
    const u = createUnit({ type: UnitType.ARCHER, owner: "p1", position: { x: 0, y: 0 } });
    expect(u.targetId).toBeNull();
  });

  it("attackTimer starts at 0", () => {
    const u = createUnit({ type: UnitType.SWORDSMAN, owner: "p1", position: { x: 0, y: 0 } });
    expect(u.attackTimer).toBe(0);
  });

  it("castTimer starts at 0", () => {
    const u = createUnit({ type: UnitType.MAGE, owner: "p1", position: { x: 0, y: 0 } });
    expect(u.castTimer).toBe(0);
  });

  it("abilityIds starts empty", () => {
    const u = createUnit({ type: UnitType.MAGE, owner: "p1", position: { x: 0, y: 0 } });
    expect(u.abilityIds).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// StateMachine transitions
// ---------------------------------------------------------------------------

describe("unit StateMachine transitions", () => {
  it("IDLE → MOVE is allowed", () => {
    const u = createUnit({ type: UnitType.SWORDSMAN, owner: "p1", position: { x: 0, y: 0 } });
    expect(u.stateMachine.canTransition(UnitState.MOVE)).toBe(true);
  });

  it("IDLE → ATTACK is not allowed directly", () => {
    const u = createUnit({ type: UnitType.SWORDSMAN, owner: "p1", position: { x: 0, y: 0 } });
    expect(u.stateMachine.canTransition(UnitState.ATTACK)).toBe(false);
  });

  it("MOVE → ATTACK is allowed", () => {
    const u = createUnit({ type: UnitType.SWORDSMAN, owner: "p1", position: { x: 0, y: 0 } });
    u.stateMachine.setState(UnitState.MOVE);
    expect(u.stateMachine.canTransition(UnitState.ATTACK)).toBe(true);
  });

  it("ATTACK → IDLE is allowed", () => {
    const u = createUnit({ type: UnitType.SWORDSMAN, owner: "p1", position: { x: 0, y: 0 } });
    u.stateMachine.setState(UnitState.MOVE);
    u.stateMachine.setState(UnitState.ATTACK);
    expect(u.stateMachine.canTransition(UnitState.IDLE)).toBe(true);
  });

  it("ATTACK → CAST is allowed", () => {
    const u = createUnit({ type: UnitType.MAGE, owner: "p1", position: { x: 0, y: 0 } });
    u.stateMachine.setState(UnitState.MOVE);
    u.stateMachine.setState(UnitState.ATTACK);
    expect(u.stateMachine.canTransition(UnitState.CAST)).toBe(true);
  });

  it("CAST → IDLE is allowed", () => {
    const u = createUnit({ type: UnitType.MAGE, owner: "p1", position: { x: 0, y: 0 } });
    u.stateMachine.setState(UnitState.MOVE);
    u.stateMachine.setState(UnitState.ATTACK);
    u.stateMachine.setState(UnitState.CAST);
    expect(u.stateMachine.canTransition(UnitState.IDLE)).toBe(true);
  });

  it("DIE is reachable from any state (wildcard)", () => {
    for (const startState of [UnitState.IDLE, UnitState.MOVE, UnitState.ATTACK, UnitState.CAST]) {
      const u = createUnit({ type: UnitType.SWORDSMAN, owner: "p1", position: { x: 0, y: 0 } });
      u.stateMachine.forceState(startState);
      expect(u.stateMachine.canTransition(UnitState.DIE)).toBe(true);
    }
  });

  it("IDLE → MOVE actually changes currentState", () => {
    const u = createUnit({ type: UnitType.SWORDSMAN, owner: "p1", position: { x: 0, y: 0 } });
    u.stateMachine.setState(UnitState.MOVE);
    expect(u.stateMachine.currentState).toBe(UnitState.MOVE);
  });

  it("UNIT_TRANSITIONS includes the expected number of rules (7)", () => {
    expect(UNIT_TRANSITIONS).toHaveLength(7);
  });
});

// ---------------------------------------------------------------------------
// createUnit — each UnitType
// ---------------------------------------------------------------------------

describe("createUnit covers all unit types", () => {
  const pos = { x: 10, y: 10 };

  it("creates Swordsman", () => {
    const u = createUnit({ type: UnitType.SWORDSMAN, owner: "p1", position: pos });
    expect(u.type).toBe(UnitType.SWORDSMAN);
  });

  it("creates Archer", () => {
    const u = createUnit({ type: UnitType.ARCHER, owner: "p1", position: pos });
    expect(u.type).toBe(UnitType.ARCHER);
  });

  it("creates Knight", () => {
    const u = createUnit({ type: UnitType.KNIGHT, owner: "p1", position: pos });
    expect(u.type).toBe(UnitType.KNIGHT);
  });

  it("creates Mage", () => {
    const u = createUnit({ type: UnitType.MAGE, owner: "p1", position: pos });
    expect(u.type).toBe(UnitType.MAGE);
  });

  it("creates Pikeman", () => {
    const u = createUnit({ type: UnitType.PIKEMAN, owner: "p1", position: pos });
    expect(u.type).toBe(UnitType.PIKEMAN);
  });

  it("creates Summoned", () => {
    const u = createUnit({ type: UnitType.SUMMONED, owner: "p1", position: pos });
    expect(u.type).toBe(UnitType.SUMMONED);
  });
});
