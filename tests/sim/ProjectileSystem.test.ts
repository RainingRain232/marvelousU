import { describe, it, expect, beforeEach } from "vitest";
import { ProjectileSystem } from "@sim/systems/ProjectileSystem";
import { createGameState } from "@sim/state/GameState";
import { createUnit, _resetUnitIdCounter } from "@sim/entities/Unit";
import { createFireball, _resetFireballCounter } from "@sim/abilities/Fireball";
import { EventBus } from "@sim/core/EventBus";
import { UnitState, UnitType } from "@/types";
import type { Projectile } from "@sim/entities/Projectile";
import type { GameState } from "@sim/state/GameState";
import type { Unit } from "@sim/entities/Unit";

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
    hp?: number;
  },
): Unit {
  const unit = createUnit({
    id: opts.id,
    type: opts.type ?? UnitType.SWORDSMAN,
    owner: opts.owner ?? "p1",
    position: opts.position ?? { x: 10, y: 10 },
  });
  if (opts.hp !== undefined) unit.hp = opts.hp;
  state.units.set(unit.id, unit);
  return unit;
}

function addProjectile(
  state: GameState,
  overrides: Partial<Projectile> = {},
): Projectile {
  const proj: Projectile = {
    id: `proj-test-${state.projectiles.size}`,
    abilityId: "ab-1",
    ownerId: "caster-1",
    ownerPlayerId: "p1",
    origin: { x: 0, y: 0 },
    target: { x: 5, y: 0 },
    position: { x: 0, y: 0 },
    speed: 10,
    damage: 60,
    aoeRadius: 0,
    bounceTargets: [],
    maxBounces: 0,
    bounceRange: 0,
    targetId: null,
    hitIds: new Set(),
    slowDuration: 0,
    slowFactor: 1,
    ...overrides,
  };
  state.projectiles.set(proj.id, proj);
  return proj;
}

beforeEach(() => {
  _resetUnitIdCounter();
  _resetFireballCounter();
  EventBus.clear();
});

// ---------------------------------------------------------------------------
// Movement
// ---------------------------------------------------------------------------

describe("ProjectileSystem — movement", () => {
  it("moves projectile toward target each tick", () => {
    const state = makeState();
    const proj = addProjectile(state, {
      position: { x: 0, y: 0 },
      target: { x: 10, y: 0 },
      speed: 10,
    });
    ProjectileSystem.update(state, 0.1); // step = 1 tile
    expect(state.projectiles.has(proj.id)).toBe(true);
    expect(proj.position.x).toBeCloseTo(1, 5);
    expect(proj.position.y).toBeCloseTo(0, 5);
  });

  it("snaps to target and removes projectile when step overshoots", () => {
    const state = makeState();
    const proj = addProjectile(state, {
      position: { x: 0, y: 0 },
      target: { x: 0.1, y: 0 },
      speed: 10,
    });
    // dt = 1s → step = 10 tiles, way past 0.1 → hits and removes
    ProjectileSystem.update(state, 1);
    expect(state.projectiles.has(proj.id)).toBe(false);
  });

  it("removes projectile exactly when it reaches target", () => {
    const state = makeState();
    addProjectile(state, {
      position: { x: 4.9, y: 0 },
      target: { x: 5, y: 0 },
      speed: 10,
    });
    ProjectileSystem.update(state, 0.1); // step = 1 → overshoots 0.1 gap
    expect(state.projectiles.size).toBe(0);
  });

  it("does not remove projectile while still in flight", () => {
    const state = makeState();
    addProjectile(state, {
      position: { x: 0, y: 0 },
      target: { x: 100, y: 0 },
      speed: 10,
    });
    ProjectileSystem.update(state, 0.1);
    expect(state.projectiles.size).toBe(1);
  });

  it("moves diagonally toward target correctly", () => {
    const state = makeState();
    const proj = addProjectile(state, {
      position: { x: 0, y: 0 },
      target: { x: 3, y: 4 }, // distance = 5
      speed: 5,
    });
    ProjectileSystem.update(state, 0.5); // step = 2.5 tiles (half of 5)
    expect(proj.position.x).toBeCloseTo(1.5, 4);
    expect(proj.position.y).toBeCloseTo(2, 4);
  });
});

// ---------------------------------------------------------------------------
// Single-target hit
// ---------------------------------------------------------------------------

describe("ProjectileSystem — single-target hit", () => {
  it("damages the targeted unit on impact", () => {
    const state = makeState();
    const target = addUnit(state, {
      id: "target-1",
      owner: "p2",
      hp: 100,
      position: { x: 5, y: 0 },
    });
    const caster = addUnit(state, {
      id: "caster-1",
      owner: "p1",
      position: { x: 0, y: 0 },
    });
    addProjectile(state, {
      ownerId: caster.id,
      target: { x: 5, y: 0 },
      position: { x: 4.9, y: 0 },
      damage: 60,
      aoeRadius: 0,
      targetId: target.id,
    });
    ProjectileSystem.update(state, 0.1);
    expect(target.hp).toBe(40);
  });

  it("emits projectileHit on impact", () => {
    const state = makeState();
    const target = addUnit(state, {
      id: "target-1",
      owner: "p2",
      position: { x: 5, y: 0 },
    });
    const caster = addUnit(state, {
      id: "caster-1",
      owner: "p1",
      position: { x: 0, y: 0 },
    });
    const hits: string[] = [];
    EventBus.on("projectileHit", (e) => hits.push(e.targetId));
    addProjectile(state, {
      id: "proj-x",
      ownerId: caster.id,
      target: { x: 5, y: 0 },
      position: { x: 4.9, y: 0 },
      aoeRadius: 0,
      targetId: target.id,
    });
    ProjectileSystem.update(state, 0.1);
    expect(hits).toContain(target.id);
  });

  it("kills the target when damage exceeds hp", () => {
    const state = makeState();
    const target = addUnit(state, {
      id: "target-1",
      owner: "p2",
      hp: 10,
      position: { x: 5, y: 0 },
    });
    const caster = addUnit(state, {
      id: "caster-1",
      owner: "p1",
      position: { x: 0, y: 0 },
    });
    addProjectile(state, {
      ownerId: caster.id,
      target: { x: 5, y: 0 },
      position: { x: 4.9, y: 0 },
      damage: 999,
      aoeRadius: 0,
      targetId: target.id,
    });
    ProjectileSystem.update(state, 0.1);
    expect(target.state).toBe(UnitState.DIE);
    expect(target.hp).toBe(0);
  });

  it("does not damage already-dead target", () => {
    const state = makeState();
    const target = addUnit(state, {
      id: "target-1",
      owner: "p2",
      hp: 50,
      position: { x: 5, y: 0 },
    });
    const caster = addUnit(state, {
      id: "caster-1",
      owner: "p1",
      position: { x: 0, y: 0 },
    });
    target.state = UnitState.DIE;
    addProjectile(state, {
      ownerId: caster.id,
      target: { x: 5, y: 0 },
      position: { x: 4.9, y: 0 },
      damage: 60,
      aoeRadius: 0,
      targetId: target.id,
    });
    ProjectileSystem.update(state, 0.1);
    expect(target.hp).toBe(50); // untouched
  });

  it("removes projectile from state after impact", () => {
    const state = makeState();
    addUnit(state, { id: "caster-1", owner: "p1", position: { x: 0, y: 0 } });
    addProjectile(state, {
      ownerId: "caster-1",
      target: { x: 0.1, y: 0 },
      position: { x: 0, y: 0 },
      speed: 10,
      aoeRadius: 0,
    });
    ProjectileSystem.update(state, 1);
    expect(state.projectiles.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// AoE hit
// ---------------------------------------------------------------------------

describe("ProjectileSystem — AoE damage", () => {
  it("damages all enemies within aoeRadius on impact", () => {
    const state = makeState();
    const caster = addUnit(state, {
      id: "caster-1",
      owner: "p1",
      position: { x: 0, y: 0 },
    });
    const t1 = addUnit(state, {
      id: "t1",
      owner: "p2",
      hp: 100,
      position: { x: 5, y: 0 },
    });
    const t2 = addUnit(state, {
      id: "t2",
      owner: "p2",
      hp: 100,
      position: { x: 5.5, y: 0.5 },
    });
    addProjectile(state, {
      ownerId: caster.id,
      target: { x: 5, y: 0 },
      position: { x: 4.9, y: 0 },
      damage: 60,
      aoeRadius: 2,
      targetId: t1.id,
    });
    ProjectileSystem.update(state, 0.1);
    expect(t1.hp).toBe(40);
    expect(t2.hp).toBe(40);
  });

  it("does not damage friendly units within aoeRadius", () => {
    const state = makeState();
    const caster = addUnit(state, {
      id: "caster-1",
      owner: "p1",
      position: { x: 0, y: 0 },
    });
    const ally = addUnit(state, {
      id: "ally-1",
      owner: "p1",
      hp: 100,
      position: { x: 5, y: 0 },
    });
    const enemy = addUnit(state, {
      id: "enemy-1",
      owner: "p2",
      hp: 100,
      position: { x: 5, y: 0 },
    });
    addProjectile(state, {
      ownerId: caster.id,
      target: { x: 5, y: 0 },
      position: { x: 4.9, y: 0 },
      damage: 60,
      aoeRadius: 2,
    });
    ProjectileSystem.update(state, 0.1);
    expect(ally.hp).toBe(100);
    expect(enemy.hp).toBe(40);
  });

  it("does not damage units outside aoeRadius", () => {
    const state = makeState();
    const caster = addUnit(state, {
      id: "caster-1",
      owner: "p1",
      position: { x: 0, y: 0 },
    });
    const far = addUnit(state, {
      id: "far-1",
      owner: "p2",
      hp: 100,
      position: { x: 10, y: 0 },
    });
    addProjectile(state, {
      ownerId: caster.id,
      target: { x: 5, y: 0 },
      position: { x: 4.9, y: 0 },
      damage: 60,
      aoeRadius: 2,
    });
    ProjectileSystem.update(state, 0.1);
    expect(far.hp).toBe(100);
  });

  it("emits unitDamaged for each unit hit by AoE", () => {
    const state = makeState();
    const caster = addUnit(state, {
      id: "caster-1",
      owner: "p1",
      position: { x: 0, y: 0 },
    });
    addUnit(state, {
      id: "t1",
      owner: "p2",
      hp: 100,
      position: { x: 5, y: 0 },
    });
    addUnit(state, {
      id: "t2",
      owner: "p2",
      hp: 100,
      position: { x: 5.5, y: 0 },
    });
    const damaged: string[] = [];
    EventBus.on("unitDamaged", (e) => damaged.push(e.unitId));
    addProjectile(state, {
      ownerId: caster.id,
      target: { x: 5, y: 0 },
      position: { x: 4.9, y: 0 },
      damage: 60,
      aoeRadius: 2,
    });
    ProjectileSystem.update(state, 0.1);
    expect(damaged).toContain("t1");
    expect(damaged).toContain("t2");
  });

  it("does not hit the same unit twice (hitIds guard)", () => {
    const state = makeState();
    const caster = addUnit(state, {
      id: "caster-1",
      owner: "p1",
      position: { x: 0, y: 0 },
    });
    const target = addUnit(state, {
      id: "t1",
      owner: "p2",
      hp: 100,
      position: { x: 5, y: 0 },
    });
    const proj = addProjectile(state, {
      ownerId: caster.id,
      target: { x: 5, y: 0 },
      position: { x: 4.9, y: 0 },
      damage: 60,
      aoeRadius: 2,
      targetId: target.id,
    });
    // Pre-populate hitIds as if target was already hit
    proj.hitIds.add(target.id);
    ProjectileSystem.update(state, 0.1);
    expect(target.hp).toBe(100); // not damaged again
  });
});

// ---------------------------------------------------------------------------
// Fireball.execute() integration
// ---------------------------------------------------------------------------

describe("Fireball.execute() — spawns projectile", () => {
  it("creates a projectile in state.projectiles when executed", () => {
    const state = makeState();
    const caster = addUnit(state, {
      id: "caster-1",
      owner: "p1",
      position: { x: 0, y: 0 },
    });
    const targetPos = { x: 5, y: 0 };
    const fb = createFireball("fb-1");
    fb.execute(caster, targetPos, state);
    expect(state.projectiles.size).toBe(1);
  });

  it("projectile has correct damage and aoeRadius from AbilityDefs", () => {
    const state = makeState();
    const caster = addUnit(state, {
      id: "caster-1",
      owner: "p1",
      position: { x: 0, y: 0 },
    });
    const fb = createFireball("fb-1");
    fb.execute(caster, { x: 5, y: 0 }, state);
    const proj = [...state.projectiles.values()][0];
    expect(proj.damage).toBe(60);
    expect(proj.aoeRadius).toBe(2);
  });

  it("projectile origin matches caster position", () => {
    const state = makeState();
    const caster = addUnit(state, {
      id: "caster-1",
      owner: "p1",
      position: { x: 3, y: 7 },
    });
    const fb = createFireball("fb-1");
    fb.execute(caster, { x: 10, y: 7 }, state);
    const proj = [...state.projectiles.values()][0];
    expect(proj.origin).toEqual({ x: 3, y: 7 });
  });

  it("projectile target matches execute() target position", () => {
    const state = makeState();
    const caster = addUnit(state, {
      id: "caster-1",
      owner: "p1",
      position: { x: 0, y: 0 },
    });
    const fb = createFireball("fb-1");
    fb.execute(caster, { x: 8, y: 3 }, state);
    const proj = [...state.projectiles.values()][0];
    expect(proj.target).toEqual({ x: 8, y: 3 });
  });

  it("emits projectileCreated event on execute()", () => {
    const state = makeState();
    const caster = addUnit(state, {
      id: "caster-1",
      owner: "p1",
      position: { x: 0, y: 0 },
    });
    const created: string[] = [];
    EventBus.on("projectileCreated", (e) => created.push(e.projectileId));
    const fb = createFireball("fb-1");
    fb.execute(caster, { x: 5, y: 0 }, state);
    expect(created).toHaveLength(1);
  });

  it("fireball hits and deals AoE damage when projectile reaches target", () => {
    const state = makeState();
    const caster = addUnit(state, {
      id: "caster-1",
      owner: "p1",
      position: { x: 0, y: 0 },
    });
    const primary = addUnit(state, {
      owner: "p2",
      hp: 100,
      position: { x: 5, y: 0 },
    });
    const nearby = addUnit(state, {
      owner: "p2",
      hp: 100,
      position: { x: 5.5, y: 0.5 },
    });

    const fb = createFireball("fb-1");
    fb.execute(caster, { x: 5, y: 0 }, state);

    // Travel the whole way: 5 tiles / 10 tiles/s = 0.5 s, give it a full second
    ProjectileSystem.update(state, 1);

    expect(primary.hp).toBe(40);
    expect(nearby.hp).toBe(40);
    expect(state.projectiles.size).toBe(0);
  });
});
