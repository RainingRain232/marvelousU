import { describe, it, expect, beforeEach } from "vitest";
import { PhaseSystem } from "@sim/systems/PhaseSystem";
import { createGameState } from "@sim/state/GameState";
import { createPlayerState } from "@sim/state/PlayerState";
import { createUnit, _resetUnitIdCounter } from "@sim/entities/Unit";
import { createBuilding } from "@sim/entities/Building";
import { createBase } from "@sim/entities/Base";
import { EventBus } from "@sim/core/EventBus";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import {
  GamePhase,
  Direction,
  UnitType,
  UnitState,
  BuildingType,
  BuildingState,
} from "@/types";
import type { GameState } from "@sim/state/GameState";
import type { Unit } from "@sim/entities/Unit";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DT = 1 / 60;

function makeState(): GameState {
  const state = createGameState(30, 20);
  state.players.set("p1", createPlayerState("p1", Direction.WEST));
  state.players.set("p2", createPlayerState("p2", Direction.EAST));

  const westBase = createBase({
    id: "base-west",
    direction: Direction.WEST,
    owner: "p1",
    position: { x: 1, y: 9 },
    spawnOffset: { x: 4, y: 1 },
  });
  const eastBase = createBase({
    id: "base-east",
    direction: Direction.EAST,
    owner: "p2",
    position: { x: 26, y: 9 },
    spawnOffset: { x: -1, y: 1 },
  });
  state.bases.set(westBase.id, westBase);
  state.bases.set(eastBase.id, eastBase);
  state.players.get("p1")!.ownedBaseId = westBase.id;
  state.players.get("p2")!.ownedBaseId = eastBase.id;

  return state;
}

function addUnit(state: GameState, owner: string, unitState = UnitState.MOVE): Unit {
  const unit = createUnit({
    type: UnitType.SWORDSMAN,
    owner,
    position: { x: 10, y: 10 },
  });
  unit.stateMachine.forceState(unitState);
  unit.state = unitState;
  state.units.set(unit.id, unit);
  return unit;
}

function addActiveBuilding(state: GameState, owner: string): string {
  const id = `bld-${Math.random()}`;
  const bld = createBuilding({
    id,
    type: BuildingType.BARRACKS,
    owner,
    position: { x: 5, y: 5 },
  });
  state.buildings.set(id, bld);
  return id;
}

/** Drain the PREP timer completely. */
function drainPrep(state: GameState): void {
  // Slightly more than PREP_DURATION seconds' worth of ticks
  const ticks = Math.ceil(BalanceConfig.PREP_DURATION / DT) + 5;
  for (let i = 0; i < ticks; i++) PhaseSystem.update(state, DT);
}

/** Drain the RESOLVE timer completely. */
function drainResolve(state: GameState): void {
  const ticks = Math.ceil(BalanceConfig.RESOLVE_DURATION / DT) + 5;
  for (let i = 0; i < ticks; i++) PhaseSystem.update(state, DT);
}

beforeEach(() => {
  _resetUnitIdCounter();
  EventBus.clear();
});

// ---------------------------------------------------------------------------
// 1. Initial state
// ---------------------------------------------------------------------------

describe("initial state", () => {
  it("starts in PREP phase", () => {
    const state = makeState();
    expect(state.phase).toBe(GamePhase.PREP);
  });

  it("phaseTimer is set to PREP_DURATION on creation", () => {
    const state = makeState();
    expect(state.phaseTimer).toBe(BalanceConfig.PREP_DURATION);
  });

  it("winnerId is null on creation", () => {
    const state = makeState();
    expect(state.winnerId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 2. PREP → BATTLE transition
// ---------------------------------------------------------------------------

describe("PREP → BATTLE", () => {
  it("transitions to BATTLE when phaseTimer expires", () => {
    const state = makeState();
    drainPrep(state);
    expect(state.phase).toBe(GamePhase.BATTLE);
  });

  it("emits phaseChanged:BATTLE", () => {
    const state = makeState();
    const events: GamePhase[] = [];
    EventBus.on("phaseChanged", ({ phase }) => events.push(phase));

    drainPrep(state);

    expect(events).toContain(GamePhase.BATTLE);
  });

  it("sets phaseTimer to -1 during BATTLE", () => {
    const state = makeState();
    drainPrep(state);
    expect(state.phaseTimer).toBe(-1);
  });

  it("does not transition if phaseTimer has not expired", () => {
    const state = makeState();
    // Tick just once — far from expiry
    PhaseSystem.update(state, DT);
    expect(state.phase).toBe(GamePhase.PREP);
  });

  it("phaseTimer counts down during PREP", () => {
    const state = makeState();
    const before = state.phaseTimer;
    PhaseSystem.update(state, DT);
    expect(state.phaseTimer).toBeLessThan(before);
  });
});

// ---------------------------------------------------------------------------
// 3. Win condition: base destroyed
// ---------------------------------------------------------------------------

describe("win condition — base destroyed", () => {
  it("transitions to RESOLVE when p2 base reaches 0 hp", () => {
    const state = makeState();
    drainPrep(state); // enter BATTLE
    // Add a unit each side so total-wipe condition isn't triggered
    addUnit(state, "p1");
    addActiveBuilding(state, "p1");
    addUnit(state, "p2");
    addActiveBuilding(state, "p2");

    state.bases.get("base-east")!.health = 0;
    PhaseSystem.update(state, DT);

    expect(state.phase).toBe(GamePhase.RESOLVE);
  });

  it("sets winnerId to p1 when p2 base is destroyed", () => {
    const state = makeState();
    drainPrep(state);
    addUnit(state, "p1");
    addActiveBuilding(state, "p1");
    addUnit(state, "p2");
    addActiveBuilding(state, "p2");

    state.bases.get("base-east")!.health = 0;
    PhaseSystem.update(state, DT);

    expect(state.winnerId).toBe("p1");
  });

  it("sets winnerId to p2 when p1 base is destroyed", () => {
    const state = makeState();
    drainPrep(state);
    addUnit(state, "p1");
    addActiveBuilding(state, "p1");
    addUnit(state, "p2");
    addActiveBuilding(state, "p2");

    state.bases.get("base-west")!.health = 0;
    PhaseSystem.update(state, DT);

    expect(state.winnerId).toBe("p2");
  });

  it("sets winnerId to null on mutual base destruction", () => {
    const state = makeState();
    drainPrep(state);

    state.bases.get("base-west")!.health = 0;
    state.bases.get("base-east")!.health = 0;
    PhaseSystem.update(state, DT);

    expect(state.winnerId).toBeNull();
    expect(state.phase).toBe(GamePhase.RESOLVE);
  });

  it("emits phaseChanged:RESOLVE on base destruction", () => {
    const state = makeState();
    drainPrep(state);
    addUnit(state, "p1");
    addActiveBuilding(state, "p1");
    state.bases.get("base-east")!.health = 0;

    const events: GamePhase[] = [];
    EventBus.on("phaseChanged", ({ phase }) => events.push(phase));
    PhaseSystem.update(state, DT);

    expect(events).toContain(GamePhase.RESOLVE);
  });
});

// ---------------------------------------------------------------------------
// 4. Win condition: total wipe
// ---------------------------------------------------------------------------

describe("win condition — total wipe", () => {
  it("transitions to RESOLVE when p2 has no units and no buildings", () => {
    const state = makeState();
    drainPrep(state);
    // p1 has units + buildings, p2 has nothing
    addUnit(state, "p1");
    addActiveBuilding(state, "p1");

    PhaseSystem.update(state, DT);

    expect(state.phase).toBe(GamePhase.RESOLVE);
    expect(state.winnerId).toBe("p1");
  });

  it("does NOT trigger wipe condition if enemy has a building even with no units", () => {
    const state = makeState();
    drainPrep(state);
    addUnit(state, "p1");
    addActiveBuilding(state, "p1");
    // p2 has no units but has an active building
    addActiveBuilding(state, "p2");

    PhaseSystem.update(state, DT);

    expect(state.phase).toBe(GamePhase.BATTLE); // still fighting
  });

  it("does NOT trigger wipe condition if enemy has units but no buildings", () => {
    const state = makeState();
    drainPrep(state);
    addUnit(state, "p1");
    addActiveBuilding(state, "p1");
    // p2 has units but no buildings
    addUnit(state, "p2");

    PhaseSystem.update(state, DT);

    expect(state.phase).toBe(GamePhase.BATTLE);
  });

  it("destroyed buildings do not count toward wipe prevention", () => {
    const state = makeState();
    drainPrep(state);
    addUnit(state, "p1");
    addActiveBuilding(state, "p1");

    // p2 building is DESTROYED
    const bldId = addActiveBuilding(state, "p2");
    state.buildings.get(bldId)!.state = BuildingState.DESTROYED;

    PhaseSystem.update(state, DT);

    expect(state.phase).toBe(GamePhase.RESOLVE);
    expect(state.winnerId).toBe("p1");
  });
});

// ---------------------------------------------------------------------------
// 5. RESOLVE → PREP transition
// ---------------------------------------------------------------------------

describe("RESOLVE → PREP", () => {
  function enterResolve(state: GameState): void {
    drainPrep(state);
    // Force RESOLVE by destroying a base
    state.bases.get("base-east")!.health = 0;
    PhaseSystem.update(state, DT);
    expect(state.phase).toBe(GamePhase.RESOLVE);
  }

  it("transitions back to PREP when RESOLVE timer expires", () => {
    const state = makeState();
    enterResolve(state);
    drainResolve(state);
    expect(state.phase).toBe(GamePhase.PREP);
  });

  it("emits phaseChanged:PREP on RESOLVE expiry", () => {
    const state = makeState();
    enterResolve(state);

    const events: GamePhase[] = [];
    EventBus.on("phaseChanged", ({ phase }) => events.push(phase));
    drainResolve(state);

    expect(events).toContain(GamePhase.PREP);
  });

  it("resets phaseTimer to PREP_DURATION on re-entry", () => {
    const state = makeState();
    enterResolve(state);
    drainResolve(state);
    expect(state.phaseTimer).toBeCloseTo(BalanceConfig.PREP_DURATION, 0);
  });

  it("clears all units on PREP reset", () => {
    const state = makeState();
    enterResolve(state);
    addUnit(state, "p1");
    addUnit(state, "p2");
    expect(state.units.size).toBe(2);

    drainResolve(state);
    expect(state.units.size).toBe(0);
  });

  it("resets base health on PREP reset", () => {
    const state = makeState();
    enterResolve(state);
    // Damage a base (it already hit 0, reset should restore)
    drainResolve(state);

    for (const base of state.bases.values()) {
      expect(base.health).toBe(base.maxHealth);
    }
  });

  it("replenishes gold to START_GOLD on PREP reset", () => {
    const state = makeState();
    // Spend some gold
    state.players.get("p1")!.gold = 10;
    state.players.get("p2")!.gold = 0;

    enterResolve(state);
    drainResolve(state);

    for (const player of state.players.values()) {
      expect(player.gold).toBe(BalanceConfig.START_GOLD);
    }
  });

  it("clears winnerId on PREP reset", () => {
    const state = makeState();
    enterResolve(state);
    expect(state.winnerId).toBeTruthy();

    drainResolve(state);
    expect(state.winnerId).toBeNull();
  });

  it("emits goldChanged events for both players on reset", () => {
    const state = makeState();
    enterResolve(state);

    const goldEvents: string[] = [];
    EventBus.on("goldChanged", ({ playerId }) => goldEvents.push(playerId));
    drainResolve(state);

    expect(goldEvents).toContain("p1");
    expect(goldEvents).toContain("p2");
  });
});

// ---------------------------------------------------------------------------
// 6. RESOLVE timer countdown
// ---------------------------------------------------------------------------

describe("RESOLVE timer", () => {
  it("phaseTimer counts down during RESOLVE", () => {
    const state = makeState();
    drainPrep(state);
    state.bases.get("base-east")!.health = 0;
    PhaseSystem.update(state, DT);
    expect(state.phase).toBe(GamePhase.RESOLVE);

    const before = state.phaseTimer;
    PhaseSystem.update(state, DT);
    expect(state.phaseTimer).toBeLessThan(before);
  });

  it("is set to RESOLVE_DURATION on entering RESOLVE", () => {
    const state = makeState();
    drainPrep(state);
    state.bases.get("base-east")!.health = 0;
    PhaseSystem.update(state, DT);

    expect(state.phaseTimer).toBeCloseTo(BalanceConfig.RESOLVE_DURATION, 0);
  });
});
