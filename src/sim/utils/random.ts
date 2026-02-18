// Seeded RNG for deterministic simulation (mulberry32)
export class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed >>> 0;
  }

  next(): number {
    this.seed |= 0;
    this.seed = this.seed + 0x6d2b79f5 | 0;
    let t = Math.imul(this.seed ^ (this.seed >>> 15), 1 | this.seed);
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Random integer in [min, max)
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min)) + min;
  }

  // Random float in [min, max)
  float(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  // Pick a random element from an array
  pick<T>(arr: T[]): T {
    return arr[this.int(0, arr.length)];
  }
}

// Default global RNG — reseed at match start
export let rng = new SeededRandom(Date.now());

export function reseed(seed: number): void {
  rng = new SeededRandom(seed);
}
