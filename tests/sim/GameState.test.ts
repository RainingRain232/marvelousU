import { describe, it, expect } from "vitest";
import { createGameState, getUnit, getBuilding, getBase, getPlayer } from "@sim/state/GameState";
import { createPlayerState } from "@sim/state/PlayerState";
import { createBattlefieldState, getZoneAt, getTilesInZone } from "@sim/state/BattlefieldState";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { GamePhase, Direction } from "@/types";

// ---------------------------------------------------------------------------
// createGameState
// ---------------------------------------------------------------------------

describe("createGameState", () => {
  it("starts in PREP phase", () => {
    expect(createGameState().phase).toBe(GamePhase.PREP);
  });

  it("starts at tick 0", () => {
    expect(createGameState().tick).toBe(0);
  });

  it("all entity maps start empty", () => {
    const s = createGameState();
    expect(s.units.size).toBe(0);
    expect(s.buildings.size).toBe(0);
    expect(s.bases.size).toBe(0);
    expect(s.projectiles.size).toBe(0);
    expect(s.abilities.size).toBe(0);
    expect(s.players.size).toBe(0);
  });

  it("uses default grid dimensions from BalanceConfig", () => {
    const s = createGameState();
    expect(s.battlefield.width).toBe(BalanceConfig.GRID_WIDTH);
    expect(s.battlefield.height).toBe(BalanceConfig.GRID_HEIGHT);
  });

  it("accepts custom grid dimensions", () => {
    const s = createGameState(40, 25);
    expect(s.battlefield.width).toBe(40);
    expect(s.battlefield.height).toBe(25);
  });

  it("stores the rngSeed", () => {
    expect(createGameState(30, 20, 42).rngSeed).toBe(42);
  });

  it("default rngSeed is 0", () => {
    expect(createGameState().rngSeed).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// createPlayerState
// ---------------------------------------------------------------------------

describe("createPlayerState", () => {
  it("sets id and direction", () => {
    const p = createPlayerState("p1", Direction.WEST);
    expect(p.id).toBe("p1");
    expect(p.direction).toBe(Direction.WEST);
  });

  it("defaults gold to BalanceConfig.START_GOLD", () => {
    expect(createPlayerState("p1", Direction.WEST).gold).toBe(BalanceConfig.START_GOLD);
  });

  it("accepts custom startGold", () => {
    expect(createPlayerState("p1", Direction.EAST, 250).gold).toBe(250);
  });

  it("starts with no owned buildings", () => {
    expect(createPlayerState("p1", Direction.WEST).ownedBuildings).toEqual([]);
  });

  it("starts with no owned base", () => {
    expect(createPlayerState("p1", Direction.WEST).ownedBaseId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Typed accessors
// ---------------------------------------------------------------------------

describe("getUnit", () => {
  it("returns the unit when it exists", () => {
    const s = createGameState();
    const unit = { id: "u1" } as never;
    s.units.set("u1", unit);
    expect(getUnit(s, "u1")).toBe(unit);
  });

  it("throws when unit does not exist", () => {
    expect(() => getUnit(createGameState(), "missing")).toThrow("Unit not found: missing");
  });
});

describe("getBuilding", () => {
  it("returns the building when it exists", () => {
    const s = createGameState();
    const b = { id: "b1" } as never;
    s.buildings.set("b1", b);
    expect(getBuilding(s, "b1")).toBe(b);
  });

  it("throws when building does not exist", () => {
    expect(() => getBuilding(createGameState(), "missing")).toThrow("Building not found: missing");
  });
});

describe("getBase", () => {
  it("returns the base when it exists", () => {
    const s = createGameState();
    const base = { id: "base1" } as never;
    s.bases.set("base1", base);
    expect(getBase(s, "base1")).toBe(base);
  });

  it("throws when base does not exist", () => {
    expect(() => getBase(createGameState(), "missing")).toThrow("Base not found: missing");
  });
});

describe("getPlayer", () => {
  it("returns the player when it exists", () => {
    const s = createGameState();
    const p = createPlayerState("p1", Direction.WEST);
    s.players.set("p1", p);
    expect(getPlayer(s, "p1")).toBe(p);
  });

  it("throws when player does not exist", () => {
    expect(() => getPlayer(createGameState(), "missing")).toThrow("Player not found: missing");
  });
});

// ---------------------------------------------------------------------------
// BattlefieldState — zones
// ---------------------------------------------------------------------------

describe("createBattlefieldState zones", () => {
  it("left third is west zone", () => {
    const s = createBattlefieldState(30, 10);
    // Tiles 0–9 are west (floor(30/3) = 10)
    for (let x = 0; x < 10; x++)
      expect(getZoneAt(s, x, 0)).toBe("west");
  });

  it("right third is east zone", () => {
    const s = createBattlefieldState(30, 10);
    // Tiles 20–29 are east (ceil(30*2/3) = 20)
    for (let x = 20; x < 30; x++)
      expect(getZoneAt(s, x, 0)).toBe("east");
  });

  it("middle third is neutral zone", () => {
    const s = createBattlefieldState(30, 10);
    for (let x = 10; x < 20; x++)
      expect(getZoneAt(s, x, 0)).toBe("neutral");
  });

  it("getZoneAt returns null for out-of-bounds", () => {
    const s = createBattlefieldState(10, 10);
    expect(getZoneAt(s, -1, 0)).toBeNull();
    expect(getZoneAt(s, 10, 0)).toBeNull();
    expect(getZoneAt(s, 0, 10)).toBeNull();
  });

  it("getTilesInZone returns only tiles in that zone", () => {
    const s = createBattlefieldState(30, 2);
    const west    = getTilesInZone(s, "west");
    const east    = getTilesInZone(s, "east");
    const neutral = getTilesInZone(s, "neutral");

    // All tiles must be assigned exactly once
    expect(west.length + east.length + neutral.length).toBe(30 * 2);
    expect(west.every(t => t.zone === "west")).toBe(true);
    expect(east.every(t => t.zone === "east")).toBe(true);
    expect(neutral.every(t => t.zone === "neutral")).toBe(true);
  });

  it("all tiles start walkable", () => {
    const s = createBattlefieldState(10, 10);
    for (const row of s.grid)
      for (const tile of row)
        expect(tile.walkable).toBe(true);
  });

  it("all tiles start with no owner and no building", () => {
    const s = createBattlefieldState(5, 5);
    for (const row of s.grid)
      for (const tile of row) {
        expect(tile.owner).toBeNull();
        expect(tile.buildingId).toBeNull();
      }
  });
});

// ---------------------------------------------------------------------------
// BalanceConfig sanity checks
// ---------------------------------------------------------------------------

describe("BalanceConfig", () => {
  it("TILE_SIZE is 64", () => {
    expect(BalanceConfig.TILE_SIZE).toBe(64);
  });

  it("START_GOLD matches PlayerState default", () => {
    const p = createPlayerState("p1", Direction.WEST);
    expect(p.gold).toBe(BalanceConfig.START_GOLD);
  });

  it("SIM_TICK_MS is approximately 16.67ms", () => {
    expect(BalanceConfig.SIM_TICK_MS).toBeCloseTo(16.667, 2);
  });

  it("GRID_WIDTH and GRID_HEIGHT are positive", () => {
    expect(BalanceConfig.GRID_WIDTH).toBeGreaterThan(0);
    expect(BalanceConfig.GRID_HEIGHT).toBeGreaterThan(0);
  });
});
