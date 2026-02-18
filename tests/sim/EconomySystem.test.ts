import { describe, it, expect, beforeEach } from "vitest";
import { EconomySystem, _incomeRate } from "@sim/systems/EconomySystem";
import { createGameState } from "@sim/state/GameState";
import { createPlayerState } from "@sim/state/PlayerState";
import { createBuilding } from "@sim/entities/Building";
import { createBase } from "@sim/entities/Base";
import { EventBus } from "@sim/core/EventBus";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { GamePhase, Direction, BuildingType, BuildingState } from "@/types";
import type { GameState } from "@sim/state/GameState";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DT = 1 / 60;

function makeState(phase = GamePhase.BATTLE): GameState {
  const state = createGameState(30, 20);
  state.phase = phase;
  state.players.set("p1", createPlayerState("p1", Direction.WEST, 0));
  state.players.set("p2", createPlayerState("p2", Direction.EAST, 0));
  return state;
}

function addBuilding(
  state: GameState,
  owner: string,
  type = BuildingType.BARRACKS,
  bldState = BuildingState.ACTIVE,
): string {
  const id = `bld-${state.buildings.size}`;
  const bld = createBuilding({ id, type, owner, position: { x: 2, y: 2 } });
  bld.state = bldState;
  state.buildings.set(id, bld);
  return id;
}

beforeEach(() => EventBus.clear());

// ---------------------------------------------------------------------------
// 1. Base income rate
// ---------------------------------------------------------------------------

describe("income rate calculation", () => {
  it("includes flat GOLD_INCOME_RATE at minimum", () => {
    const state = makeState(GamePhase.PREP);
    const rate = _incomeRate(state, "p1", false);
    expect(rate).toBeGreaterThanOrEqual(BalanceConfig.GOLD_INCOME_RATE);
  });

  it("adds GOLD_INCOME_BATTLE_BONUS during battle", () => {
    const state = makeState(GamePhase.BATTLE);
    const prep = _incomeRate(state, "p1", false);
    const battle = _incomeRate(state, "p1", true);
    expect(battle - prep).toBe(BalanceConfig.GOLD_INCOME_BATTLE_BONUS);
  });

  it("adds goldIncome for each owned active building", () => {
    const state = makeState(GamePhase.BATTLE);
    const base = _incomeRate(state, "p1", false);
    addBuilding(state, "p1", BuildingType.BARRACKS); // goldIncome = 1
    addBuilding(state, "p1", BuildingType.MAGE_TOWER); // goldIncome = 2
    const withBuildings = _incomeRate(state, "p1", false);
    expect(withBuildings - base).toBe(3); // 1 + 2
  });

  it("does not add income for opponent's buildings", () => {
    const state = makeState(GamePhase.BATTLE);
    const base = _incomeRate(state, "p1", false);
    addBuilding(state, "p2", BuildingType.BARRACKS);
    expect(_incomeRate(state, "p1", false)).toBe(base);
  });

  it("does not add income for destroyed buildings", () => {
    const state = makeState(GamePhase.BATTLE);
    const base = _incomeRate(state, "p1", false);
    addBuilding(state, "p1", BuildingType.BARRACKS, BuildingState.DESTROYED);
    expect(_incomeRate(state, "p1", false)).toBe(base);
  });

  it("adds income for a captured neutral building (owner set to player)", () => {
    const state = makeState(GamePhase.BATTLE);
    const base = _incomeRate(state, "p1", false);
    // Simulate a captured neutral building: owner set to p1
    const bld = createBuilding({
      id: "neutral-cap",
      type: BuildingType.BARRACKS,
      owner: "p1",
      position: { x: 15, y: 10 },
    });
    state.buildings.set(bld.id, bld);
    expect(_incomeRate(state, "p1", false)).toBeGreaterThan(base);
  });
});

// ---------------------------------------------------------------------------
// 2. EconomySystem ticks
// ---------------------------------------------------------------------------

describe("EconomySystem.update", () => {
  it("increases player gold during PREP", () => {
    const state = makeState(GamePhase.PREP);
    const before = state.players.get("p1")!.gold;
    // Run enough ticks to accumulate 1 gold
    const ticks = Math.ceil(1 / (BalanceConfig.GOLD_INCOME_RATE * DT)) + 1;
    for (let i = 0; i < ticks; i++) EconomySystem.update(state, DT);
    expect(state.players.get("p1")!.gold).toBeGreaterThan(before);
  });

  it("increases player gold during BATTLE", () => {
    const state = makeState(GamePhase.BATTLE);
    const before = state.players.get("p1")!.gold;
    const ticks = Math.ceil(1 / ((BalanceConfig.GOLD_INCOME_RATE + BalanceConfig.GOLD_INCOME_BATTLE_BONUS) * DT)) + 1;
    for (let i = 0; i < ticks; i++) EconomySystem.update(state, DT);
    expect(state.players.get("p1")!.gold).toBeGreaterThan(before);
  });

  it("does NOT tick gold during RESOLVE", () => {
    const state = makeState(GamePhase.RESOLVE);
    const before = state.players.get("p1")!.gold;
    for (let i = 0; i < 100; i++) EconomySystem.update(state, DT);
    expect(state.players.get("p1")!.gold).toBe(before);
  });

  it("ticks income for both players independently", () => {
    const state = makeState(GamePhase.BATTLE);
    // p1 has an extra building; p2 doesn't
    addBuilding(state, "p1", BuildingType.MAGE_TOWER); // goldIncome = 2
    const ticks = Math.ceil(1 / DT);
    for (let i = 0; i < ticks; i++) EconomySystem.update(state, DT);
    const p1 = state.players.get("p1")!.gold;
    const p2 = state.players.get("p2")!.gold;
    expect(p1).toBeGreaterThan(p2); // p1 earns more
  });

  it("emits goldChanged when gold crosses an integer", () => {
    const state = makeState(GamePhase.BATTLE);
    state.players.get("p1")!.gold = 0;
    const events: number[] = [];
    EventBus.on("goldChanged", ({ playerId, amount }) => {
      if (playerId === "p1") events.push(amount);
    });
    const ticks = Math.ceil(1 / (BalanceConfig.GOLD_INCOME_RATE * DT)) + 2;
    for (let i = 0; i < ticks; i++) EconomySystem.update(state, DT);
    expect(events.length).toBeGreaterThan(0);
    expect(events[events.length - 1]).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// 3. destroyBuilding
// ---------------------------------------------------------------------------

describe("destroyBuilding", () => {
  it("marks building as DESTROYED", async () => {
    const { destroyBuilding } = await import("@sim/systems/BuildingSystem");
    const state = makeState();
    const id = addBuilding(state, "p1");
    destroyBuilding(state, id);
    expect(state.buildings.get(id)!.state).toBe(BuildingState.DESTROYED);
  });

  it("emits buildingDestroyed event", async () => {
    const { destroyBuilding } = await import("@sim/systems/BuildingSystem");
    const state = makeState();
    const id = addBuilding(state, "p1");
    const events: string[] = [];
    EventBus.on("buildingDestroyed", ({ buildingId }) => events.push(buildingId));
    destroyBuilding(state, id);
    expect(events).toContain(id);
  });

  it("removes building from owner's ownedBuildings list", async () => {
    const { destroyBuilding } = await import("@sim/systems/BuildingSystem");
    const state = makeState();
    state.players.get("p1")!.ownedBuildings.push("bld-0");
    const id = addBuilding(state, "p1");
    state.players.get("p1")!.ownedBuildings.push(id);
    destroyBuilding(state, id);
    expect(state.players.get("p1")!.ownedBuildings).not.toContain(id);
  });

  it("is idempotent — second call does nothing", async () => {
    const { destroyBuilding } = await import("@sim/systems/BuildingSystem");
    const state = makeState();
    const id = addBuilding(state, "p1");
    const events: string[] = [];
    EventBus.on("buildingDestroyed", ({ buildingId }) => events.push(buildingId));
    destroyBuilding(state, id);
    destroyBuilding(state, id);
    expect(events.length).toBe(1); // only one event fired
  });

  it("zeroes base health when a castle is destroyed", async () => {
    const { destroyBuilding } = await import("@sim/systems/BuildingSystem");
    const state = makeState();

    // Create a base with a castle
    const base = createBase({
      id: "base-west",
      direction: Direction.WEST,
      owner: "p1",
      position: { x: 1, y: 9 },
      spawnOffset: { x: 4, y: 1 },
    });
    state.bases.set(base.id, base);

    const castleId = "castle-1";
    const castle = createBuilding({
      id: castleId,
      type: BuildingType.CASTLE,
      owner: "p1",
      position: { x: 1, y: 9 },
    });
    state.buildings.set(castleId, castle);
    base.castleId = castleId; // link

    destroyBuilding(state, castleId);

    expect(base.health).toBe(0);
  });

  it("does NOT zero base health for non-castle buildings", async () => {
    const { destroyBuilding } = await import("@sim/systems/BuildingSystem");
    const state = makeState();
    const base = createBase({
      id: "base-west",
      direction: Direction.WEST,
      owner: "p1",
      position: { x: 1, y: 9 },
      spawnOffset: { x: 4, y: 1 },
    });
    state.bases.set(base.id, base);
    const id = addBuilding(state, "p1", BuildingType.BARRACKS);
    destroyBuilding(state, id);
    expect(base.health).toBe(base.maxHealth);
  });
});

// ---------------------------------------------------------------------------
// 4. Unit attacks building (CombatSystem integration)
// ---------------------------------------------------------------------------

describe("unit attacks building via CombatSystem", () => {
  it("deals damage to a building when unit is in range", async () => {
    const { CombatSystem } = await import("@sim/systems/CombatSystem");
    const { createUnit } = await import("@sim/entities/Unit");

    const state = makeState(GamePhase.BATTLE);

    // Building adjacent to unit
    const bld = createBuilding({
      id: "bld-enemy",
      type: BuildingType.BARRACKS,
      owner: "p2",
      position: { x: 11, y: 10 },
    });
    state.buildings.set(bld.id, bld);
    const initialHp = bld.health;

    // Unit with targetId pointing to the building, attack timer ready
    const unit = createUnit({
      type: "swordsman" as never,
      owner: "p1",
      position: { x: 10, y: 10 },
    });
    unit.attackTimer = 0;
    unit.targetId = bld.id;
    state.units.set(unit.id, unit);

    CombatSystem.update(state, DT);

    expect(bld.health).toBeLessThan(initialHp);
  });

  it("destroys the building when hp reaches 0", async () => {
    const { CombatSystem } = await import("@sim/systems/CombatSystem");
    const { createUnit } = await import("@sim/entities/Unit");

    const state = makeState(GamePhase.BATTLE);

    const bld = createBuilding({
      id: "bld-enemy",
      type: BuildingType.BARRACKS,
      owner: "p2",
      position: { x: 11, y: 10 },
    });
    bld.health = 1; // almost dead
    state.buildings.set(bld.id, bld);

    const unit = createUnit({
      type: "swordsman" as never,
      owner: "p1",
      position: { x: 10, y: 10 },
    });
    unit.attackTimer = 0;
    unit.targetId = bld.id;
    state.units.set(unit.id, unit);

    CombatSystem.update(state, DT);

    expect(bld.state).toBe(BuildingState.DESTROYED);
  });

  it("clears targetId after building is destroyed", async () => {
    const { CombatSystem } = await import("@sim/systems/CombatSystem");
    const { createUnit } = await import("@sim/entities/Unit");

    const state = makeState(GamePhase.BATTLE);

    const bld = createBuilding({
      id: "bld-enemy",
      type: BuildingType.BARRACKS,
      owner: "p2",
      position: { x: 11, y: 10 },
    });
    bld.health = 1;
    state.buildings.set(bld.id, bld);

    const unit = createUnit({
      type: "swordsman" as never,
      owner: "p1",
      position: { x: 10, y: 10 },
    });
    unit.attackTimer = 0;
    unit.targetId = bld.id;
    state.units.set(unit.id, unit);

    CombatSystem.update(state, DT);

    expect(unit.targetId).toBeNull();
  });
});
