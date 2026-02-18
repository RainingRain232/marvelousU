import { describe, it, expect, beforeEach } from "vitest";
import { createBase } from "@sim/entities/Base";
import { initBases, getBaseSpawnPosition, getPlayerBase } from "@sim/systems/BaseSetup";
import { createGameState } from "@sim/state/GameState";
import { createPlayerState } from "@sim/state/PlayerState";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { Direction } from "@/types";
import type { GameState } from "@sim/state/GameState";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStateWithPlayers(): GameState {
  const state = createGameState(30, 20);
  state.players.set("p1", createPlayerState("p1", Direction.WEST));
  state.players.set("p2", createPlayerState("p2", Direction.EAST));
  return state;
}

// ---------------------------------------------------------------------------
// createBase factory
// ---------------------------------------------------------------------------

describe("createBase", () => {
  it("sets all provided fields", () => {
    const base = createBase({
      id:          "b1",
      direction:   Direction.WEST,
      owner:       "p1",
      position:    { x: 1, y: 9 },
      spawnOffset: { x: 4, y: 1 },
    });

    expect(base.id).toBe("b1");
    expect(base.direction).toBe(Direction.WEST);
    expect(base.owner).toBe("p1");
    expect(base.position).toEqual({ x: 1, y: 9 });
    expect(base.spawnOffset).toEqual({ x: 4, y: 1 });
  });

  it("defaults health and maxHealth to BalanceConfig.BASE_HEALTH", () => {
    const base = createBase({
      id: "b1", direction: Direction.WEST, owner: "p1",
      position: { x: 0, y: 0 }, spawnOffset: { x: 1, y: 0 },
    });
    expect(base.health).toBe(BalanceConfig.BASE_HEALTH);
    expect(base.maxHealth).toBe(BalanceConfig.BASE_HEALTH);
  });

  it("accepts a custom maxHealth", () => {
    const base = createBase({
      id: "b1", direction: Direction.EAST, owner: "p2",
      position: { x: 0, y: 0 }, spawnOffset: { x: -1, y: 0 },
      maxHealth: 500,
    });
    expect(base.health).toBe(500);
    expect(base.maxHealth).toBe(500);
  });

  it("starts with castleId null", () => {
    const base = createBase({
      id: "b1", direction: Direction.WEST, owner: "p1",
      position: { x: 0, y: 0 }, spawnOffset: { x: 1, y: 0 },
    });
    expect(base.castleId).toBeNull();
  });

  it("position and spawnOffset are independent copies (no reference sharing)", () => {
    const pos    = { x: 1, y: 9 };
    const offset = { x: 4, y: 1 };
    const base   = createBase({
      id: "b1", direction: Direction.WEST, owner: "p1",
      position: pos, spawnOffset: offset,
    });
    pos.x = 99;
    offset.x = 99;
    expect(base.position.x).toBe(1);
    expect(base.spawnOffset.x).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// initBases
// ---------------------------------------------------------------------------

describe("initBases", () => {
  let state: GameState;

  beforeEach(() => {
    state = makeStateWithPlayers();
    initBases(state, { westPlayerId: "p1", eastPlayerId: "p2" });
  });

  it("adds exactly 2 bases to state", () => {
    expect(state.bases.size).toBe(2);
  });

  it("creates a WEST base", () => {
    const base = state.bases.get("base-west");
    expect(base).toBeDefined();
    expect(base!.direction).toBe(Direction.WEST);
  });

  it("creates an EAST base", () => {
    const base = state.bases.get("base-east");
    expect(base).toBeDefined();
    expect(base!.direction).toBe(Direction.EAST);
  });

  it("west base position matches BalanceConfig", () => {
    const base = state.bases.get("base-west")!;
    expect(base.position).toEqual(BalanceConfig.BASE_WEST_POSITION);
  });

  it("east base position matches BalanceConfig", () => {
    const base = state.bases.get("base-east")!;
    expect(base.position).toEqual(BalanceConfig.BASE_EAST_POSITION);
  });

  it("west base is owned by the west player", () => {
    expect(state.bases.get("base-west")!.owner).toBe("p1");
  });

  it("east base is owned by the east player", () => {
    expect(state.bases.get("base-east")!.owner).toBe("p2");
  });

  it("links ownedBaseId on the west player", () => {
    expect(state.players.get("p1")!.ownedBaseId).toBe("base-west");
  });

  it("links ownedBaseId on the east player", () => {
    expect(state.players.get("p2")!.ownedBaseId).toBe("base-east");
  });

  it("both bases start at full health", () => {
    for (const base of state.bases.values()) {
      expect(base.health).toBe(base.maxHealth);
      expect(base.health).toBe(BalanceConfig.BASE_HEALTH);
    }
  });

  it("both bases start with castleId null", () => {
    for (const base of state.bases.values()) {
      expect(base.castleId).toBeNull();
    }
  });

  it("throws if a player ID is not in state", () => {
    const fresh = createGameState(30, 20);
    // no players added
    expect(() =>
      initBases(fresh, { westPlayerId: "ghost", eastPlayerId: "p2" })
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// getBaseSpawnPosition
// ---------------------------------------------------------------------------

describe("getBaseSpawnPosition", () => {
  it("returns position + spawnOffset for west base", () => {
    const state = makeStateWithPlayers();
    initBases(state, { westPlayerId: "p1", eastPlayerId: "p2" });

    const spawn = getBaseSpawnPosition(state, "base-west");
    expect(spawn).toEqual({
      x: BalanceConfig.BASE_WEST_POSITION.x + BalanceConfig.BASE_WEST_SPAWN_OFFSET.x,
      y: BalanceConfig.BASE_WEST_POSITION.y + BalanceConfig.BASE_WEST_SPAWN_OFFSET.y,
    });
  });

  it("returns position + spawnOffset for east base", () => {
    const state = makeStateWithPlayers();
    initBases(state, { westPlayerId: "p1", eastPlayerId: "p2" });

    const spawn = getBaseSpawnPosition(state, "base-east");
    expect(spawn).toEqual({
      x: BalanceConfig.BASE_EAST_POSITION.x + BalanceConfig.BASE_EAST_SPAWN_OFFSET.x,
      y: BalanceConfig.BASE_EAST_POSITION.y + BalanceConfig.BASE_EAST_SPAWN_OFFSET.y,
    });
  });

  it("throws for an unknown base id", () => {
    expect(() =>
      getBaseSpawnPosition(createGameState(), "ghost")
    ).toThrow("Base not found: ghost");
  });
});

// ---------------------------------------------------------------------------
// getPlayerBase
// ---------------------------------------------------------------------------

describe("getPlayerBase", () => {
  it("returns the base after initBases", () => {
    const state = makeStateWithPlayers();
    initBases(state, { westPlayerId: "p1", eastPlayerId: "p2" });
    expect(getPlayerBase(state, "p1")).toBe(state.bases.get("base-west"));
    expect(getPlayerBase(state, "p2")).toBe(state.bases.get("base-east"));
  });

  it("returns null when ownedBaseId is not set", () => {
    const state = makeStateWithPlayers();
    // no initBases called
    expect(getPlayerBase(state, "p1")).toBeNull();
  });
});
