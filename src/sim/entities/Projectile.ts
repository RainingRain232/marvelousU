// Projectile data: origin, target, speed, damage, onHit
import type { Vec2 } from "@/types";

export interface Projectile {
  // Identity
  id: string;
  abilityId: string; // Which ability spawned this
  ownerId: string; // Caster unit ID

  // Position
  origin: Vec2;
  target: Vec2;
  position: Vec2; // Current position (interpolated each tick)

  // Physics
  speed: number; // Tiles per second

  // Damage
  damage: number;
  aoeRadius: number; // 0 = single target, >0 = AoE on impact

  // Chain / bounce (ChainLightning)
  bounceTargets: string[]; // Ordered list of unit IDs already hit (for rendering bolt path)
  maxBounces: number; // 0 = no bounce
  bounceRange: number; // Max tile distance for each bounce

  // Tracking
  targetId: string | null; // Unit/building being homed towards (null = location shot)
  hitIds: Set<string>; // All IDs already damaged (prevents double-hits in AoE)

  // Slow on hit (0 = no slow)
  /** Seconds of slow to apply to units hit. 0 = no slow effect. */
  slowDuration: number;
  /** Speed multiplier while slowed (e.g. 0.4 = 40% of normal speed). */
  slowFactor: number;
}
