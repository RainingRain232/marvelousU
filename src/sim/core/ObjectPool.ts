// Generic object pool for units, projectiles — avoids GC pressure in hot loop
export class ObjectPool<T> {
  private pool:    T[] = [];
  private factory: () => T;
  private reset:   (obj: T) => void;

  constructor(factory: () => T, reset: (obj: T) => void, prealloc = 0) {
    this.factory = factory;
    this.reset   = reset;
    for (let i = 0; i < prealloc; i++) this.pool.push(factory());
  }

  acquire(): T {
    const obj = this.pool.length > 0 ? this.pool.pop()! : this.factory();
    this.reset(obj);
    return obj;
  }

  release(obj: T): void {
    this.pool.push(obj);
  }

  get available(): number {
    return this.pool.length;
  }
}
