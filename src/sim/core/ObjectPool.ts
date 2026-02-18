// Generic object pool — avoids GC pressure in the hot simulation loop.
// Usage: create once at startup, acquire() before use, release() when done.

export class ObjectPool<T> {
  private pool: T[] = [];
  private factory: () => T;
  private reset: (obj: T) => void;
  private _totalCreated = 0;

  /**
   * @param factory  - Creates a fresh object when the pool is empty.
   * @param reset    - Resets an object to a clean state before re-use.
   * @param prealloc - Number of objects to allocate immediately (optional).
   */
  constructor(factory: () => T, reset: (obj: T) => void, prealloc = 0) {
    this.factory = factory;
    this.reset = reset;
    if (prealloc > 0) this.prewarm(prealloc);
  }

  // ---------------------------------------------------------------------------
  // Core API
  // ---------------------------------------------------------------------------

  /** Take an object from the pool (or create one if the pool is empty).
   *  The reset function is called before returning the object. */
  acquire(): T {
    const obj = this.pool.length > 0 ? this.pool.pop()! : this.createNew();
    this.reset(obj);
    return obj;
  }

  /** Return an object to the pool for future reuse.
   *  Silently ignores duplicate releases of the same object reference. */
  release(obj: T): void {
    if (this.pool.includes(obj)) return; // guard against double-release
    this.pool.push(obj);
  }

  /** Pre-create `count` objects and place them in the pool.
   *  Call at startup to avoid allocation spikes during gameplay. */
  prewarm(count: number): void {
    for (let i = 0; i < count; i++) {
      this.pool.push(this.createNew());
    }
  }

  // ---------------------------------------------------------------------------
  // Introspection
  // ---------------------------------------------------------------------------

  /** Number of objects currently sitting idle in the pool. */
  get available(): number {
    return this.pool.length;
  }

  /** Total number of objects ever created by this pool (pool + in-use). */
  get totalCreated(): number {
    return this._totalCreated;
  }

  /** Discard all pooled objects (useful for level resets). */
  clear(): void {
    this.pool.length = 0;
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private createNew(): T {
    this._totalCreated++;
    return this.factory();
  }
}
