import { describe, it, expect, vi, beforeEach } from "vitest";
import { SimLoop, simTick } from "@sim/core/SimLoop";
import { createGameState } from "@sim/state/GameState";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import type { GameState } from "@sim/state/GameState";

const TICK_MS = BalanceConfig.SIM_TICK_MS; // ~16.67ms

function makeState(): GameState {
  return createGameState(10, 10);
}

// ---------------------------------------------------------------------------
// simTick (pure function — no timers needed)
// ---------------------------------------------------------------------------

describe("simTick", () => {
  it("increments state.tick by 1", () => {
    const s = makeState();
    expect(s.tick).toBe(0);
    simTick(s);
    expect(s.tick).toBe(1);
    simTick(s);
    expect(s.tick).toBe(2);
  });

  it("does not throw on an empty game state", () => {
    expect(() => simTick(makeState())).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// SimLoop.manualStep
// ---------------------------------------------------------------------------

describe("manualStep", () => {
  it("increments tick by 1 per call", () => {
    const loop = new SimLoop(makeState());
    loop.manualStep();
    // tick is on the internal state — use advance trick or expose via onTick
    const s = makeState();
    const loop2 = new SimLoop(s);
    loop2.manualStep();
    expect(s.tick).toBe(1);
  });

  it("calls onTick callback with alpha=0", () => {
    const s = makeState();
    const cb = vi.fn();
    const loop = new SimLoop(s, cb);
    loop.manualStep();
    expect(cb).toHaveBeenCalledOnce();
    expect(cb).toHaveBeenCalledWith(s, 0);
  });

  it("can be called while loop is stopped", () => {
    const s = makeState();
    const loop = new SimLoop(s);
    expect(() => loop.manualStep()).not.toThrow();
    expect(s.tick).toBe(1);
  });

  it("multiple manualStep calls accumulate ticks correctly", () => {
    const s = makeState();
    const loop = new SimLoop(s);
    for (let i = 0; i < 10; i++) loop.manualStep();
    expect(s.tick).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// SimLoop.advance — accumulator pattern
// ---------------------------------------------------------------------------

describe("advance", () => {
  let s: GameState;
  let loop: SimLoop;

  beforeEach(() => {
    s = makeState();
    loop = new SimLoop(s);
  });

  it("does not tick when elapsed < TICK_MS", () => {
    loop.advance(TICK_MS * 0.5);
    expect(s.tick).toBe(0);
  });

  it("ticks exactly once when elapsed == TICK_MS", () => {
    loop.advance(TICK_MS);
    expect(s.tick).toBe(1);
  });

  it("ticks exactly N times for N * TICK_MS elapsed", () => {
    // Use Math.ceil to avoid floating-point shortfall (1000/60 is irrational)
    loop.advance(Math.ceil(TICK_MS) * 3);
    expect(s.tick).toBe(3);
  });

  it("accumulates sub-tick remainder across calls", () => {
    loop.advance(TICK_MS * 0.6);
    expect(s.tick).toBe(0);
    loop.advance(TICK_MS * 0.6); // total 1.2 * TICK_MS → 1 tick
    expect(s.tick).toBe(1);
  });

  it("clamps large elapsed to MAX_DELTA_MS (200ms) to prevent spiral-of-death", () => {
    // 200ms / TICK_MS ≈ 12 ticks max
    loop.advance(10_000); // simulate 10 seconds paused tab
    expect(s.tick).toBeLessThanOrEqual(Math.ceil(200 / TICK_MS));
  });

  it("calls onTick after draining ticks with the correct alpha", () => {
    const cb = vi.fn();
    const ls = makeState();
    const ll = new SimLoop(ls, cb);

    // advance by 1.5 ticks → 1 full tick + 0.5 remainder
    ll.advance(TICK_MS * 1.5);
    expect(cb).toHaveBeenCalledOnce();
    const [, alpha] = cb.mock.calls[0] as [GameState, number];
    expect(alpha).toBeCloseTo(0.5, 5);
  });

  it("calls onTick even when 0 ticks fired (sub-tick advance)", () => {
    const cb = vi.fn();
    const ls = makeState();
    const ll = new SimLoop(ls, cb);
    ll.advance(TICK_MS * 0.3);
    expect(cb).toHaveBeenCalledOnce();
    const [, alpha] = cb.mock.calls[0] as [GameState, number];
    expect(alpha).toBeCloseTo(0.3, 5);
  });

  it("passes the state reference to onTick", () => {
    const cb = vi.fn();
    const ls = makeState();
    const ll = new SimLoop(ls, cb);
    ll.advance(TICK_MS);
    expect(cb.mock.calls[0][0]).toBe(ls);
  });
});

// ---------------------------------------------------------------------------
// SimLoop.start / stop / isRunning
// ---------------------------------------------------------------------------

describe("start / stop / isRunning", () => {
  it("isRunning is false before start", () => {
    expect(new SimLoop(makeState()).isRunning).toBe(false);
  });

  it("isRunning is true after start", () => {
    const loop = new SimLoop(makeState());
    loop.start();
    expect(loop.isRunning).toBe(true);
    loop.stop();
  });

  it("isRunning is false after stop", () => {
    const loop = new SimLoop(makeState());
    loop.start();
    loop.stop();
    expect(loop.isRunning).toBe(false);
  });

  it("calling start() twice does not double-schedule", () => {
    const s = makeState();
    const cb = vi.fn();
    const loop = new SimLoop(s, cb);
    loop.start();
    loop.start(); // second call should be a no-op
    loop.stop();
    // advance manually to confirm state is sane
    loop.advance(TICK_MS);
    expect(s.tick).toBe(1);
  });

  it("stop() while not running does not throw", () => {
    const loop = new SimLoop(makeState());
    expect(() => loop.stop()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// System call order — verify all stubs are called each tick
// ---------------------------------------------------------------------------

describe("system call order", () => {
  it("calls all 7 systems on each simTick (via spy on no-op stubs)", async () => {
    // Dynamically import systems so we can spy on them
    const { SpawnSystem } = await import("@sim/systems/SpawnSystem");
    const { AbilitySystem } = await import("@sim/systems/AbilitySystem");
    const { MovementSystem } = await import("@sim/systems/MovementSystem");
    const { CombatSystem } = await import("@sim/systems/CombatSystem");
    const { ProjectileSystem } = await import("@sim/systems/ProjectileSystem");
    const { BuildingSystem } = await import("@sim/systems/BuildingSystem");
    const { AISystem } = await import("@sim/systems/AISystem");

    const spies = [
      vi.spyOn(SpawnSystem, "update"),
      vi.spyOn(AbilitySystem, "update"),
      vi.spyOn(MovementSystem, "update"),
      vi.spyOn(CombatSystem, "update"),
      vi.spyOn(ProjectileSystem, "update"),
      vi.spyOn(BuildingSystem, "update"),
      vi.spyOn(AISystem, "update"),
    ];

    const s = makeState();
    simTick(s);

    for (const spy of spies) {
      expect(spy).toHaveBeenCalledOnce();
      spy.mockRestore();
    }
  });
});
