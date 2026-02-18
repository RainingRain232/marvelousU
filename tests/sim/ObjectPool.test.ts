import { describe, it, expect, vi } from "vitest";
import { ObjectPool } from "@sim/core/ObjectPool";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface Obj { value: number }

function makePool(prealloc = 0) {
  const factory = vi.fn((): Obj => ({ value: 0 }));
  const reset   = vi.fn((o: Obj) => { o.value = 0; });
  const pool    = new ObjectPool<Obj>(factory, reset, prealloc);
  return { pool, factory, reset };
}

// ---------------------------------------------------------------------------
// Construction / prewarm
// ---------------------------------------------------------------------------

describe("constructor / prewarm", () => {
  it("starts empty with no prealloc", () => {
    const { pool } = makePool(0);
    expect(pool.available).toBe(0);
    expect(pool.totalCreated).toBe(0);
  });

  it("preallocs the requested number of objects", () => {
    const { pool } = makePool(5);
    expect(pool.available).toBe(5);
    expect(pool.totalCreated).toBe(5);
  });

  it("prewarm() adds to existing pool", () => {
    const { pool } = makePool(3);
    pool.prewarm(4);
    expect(pool.available).toBe(7);
    expect(pool.totalCreated).toBe(7);
  });

  it("factory is called once per prewarm object", () => {
    const { factory } = makePool(6);
    expect(factory).toHaveBeenCalledTimes(6);
  });
});

// ---------------------------------------------------------------------------
// acquire()
// ---------------------------------------------------------------------------

describe("acquire", () => {
  it("returns an object", () => {
    const { pool } = makePool();
    expect(pool.acquire()).toBeDefined();
  });

  it("calls the factory when the pool is empty", () => {
    const { pool, factory } = makePool(0);
    pool.acquire();
    expect(factory).toHaveBeenCalledOnce();
    expect(pool.totalCreated).toBe(1);
  });

  it("does NOT call the factory when a pooled object is available", () => {
    const { pool, factory } = makePool(1);
    factory.mockClear(); // clear prealloc calls
    pool.acquire();
    expect(factory).not.toHaveBeenCalled();
    expect(pool.totalCreated).toBe(1); // still 1 — no new object created
  });

  it("decrements available count", () => {
    const { pool } = makePool(3);
    pool.acquire();
    expect(pool.available).toBe(2);
    pool.acquire();
    expect(pool.available).toBe(1);
  });

  it("calls reset on every acquired object", () => {
    const { pool, reset } = makePool(2);
    reset.mockClear();
    pool.acquire();
    pool.acquire();
    expect(reset).toHaveBeenCalledTimes(2);
  });

  it("reset receives the object being acquired", () => {
    const captured: Obj[] = [];
    const pool = new ObjectPool<Obj>(
      () => ({ value: 99 }),
      obj => { obj.value = 0; captured.push(obj); },
      1,
    );
    const obj = pool.acquire();
    expect(captured).toContain(obj);
    expect(obj.value).toBe(0); // reset applied
  });
});

// ---------------------------------------------------------------------------
// release()
// ---------------------------------------------------------------------------

describe("release", () => {
  it("returns the object to the pool", () => {
    const { pool } = makePool(0);
    const obj = pool.acquire();
    expect(pool.available).toBe(0);
    pool.release(obj);
    expect(pool.available).toBe(1);
  });

  it("released object is returned by a subsequent acquire (LIFO)", () => {
    const { pool } = makePool(0);
    const obj = pool.acquire();
    obj.value = 42;
    pool.release(obj);
    const reacquired = pool.acquire();
    // Same object reference reused — reset sets value back to 0
    expect(reacquired).toBe(obj);
    expect(reacquired.value).toBe(0);
  });

  it("does not create a new object when an existing one is reused", () => {
    const { pool, factory } = makePool(0);
    factory.mockClear();
    const obj = pool.acquire(); // factory called once
    pool.release(obj);
    pool.acquire();             // reuses pooled obj — no factory call
    expect(factory).toHaveBeenCalledTimes(1);
    expect(pool.totalCreated).toBe(1);
  });

  it("ignores duplicate releases of the same object (no double-entry)", () => {
    const { pool } = makePool(0);
    const obj = pool.acquire();
    pool.release(obj);
    pool.release(obj); // second release — should be a no-op
    expect(pool.available).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Reuse cycle — the core pool invariant
// ---------------------------------------------------------------------------

describe("reuse cycle", () => {
  it("objects cycle correctly through acquire → use → release → acquire", () => {
    const { pool } = makePool(0);

    const a = pool.acquire();
    a.value = 1;
    pool.release(a);

    const b = pool.acquire();
    expect(b).toBe(a);      // same reference
    expect(b.value).toBe(0); // reset applied

    b.value = 2;
    pool.release(b);
    expect(pool.available).toBe(1);
  });

  it("totalCreated stays stable across many acquire/release cycles", () => {
    const { pool } = makePool(1);
    for (let i = 0; i < 100; i++) {
      const obj = pool.acquire();
      pool.release(obj);
    }
    expect(pool.totalCreated).toBe(1); // only one object ever created
  });

  it("pool grows only when demand exceeds supply", () => {
    const { pool } = makePool(2);
    const a = pool.acquire(); // from pool
    const b = pool.acquire(); // from pool
    const c = pool.acquire(); // pool empty — factory called
    expect(pool.totalCreated).toBe(3);
    pool.release(a);
    pool.release(b);
    pool.release(c);
    expect(pool.available).toBe(3);
    // Re-acquire all three — no new objects
    pool.acquire(); pool.acquire(); pool.acquire();
    expect(pool.totalCreated).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// clear()
// ---------------------------------------------------------------------------

describe("clear", () => {
  it("empties the pool", () => {
    const { pool } = makePool(5);
    pool.clear();
    expect(pool.available).toBe(0);
  });

  it("totalCreated is unchanged after clear", () => {
    const { pool } = makePool(5);
    pool.clear();
    expect(pool.totalCreated).toBe(5);
  });

  it("acquire() after clear() creates a new object via factory", () => {
    const { pool, factory } = makePool(5);
    pool.clear();
    factory.mockClear();
    pool.acquire();
    expect(factory).toHaveBeenCalledOnce();
  });
});
