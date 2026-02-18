// Projectile data: origin, target, speed, damage, onHit
import type { Vec2 } from "@/types";

export interface Projectile {
  id:       string;
  origin:   Vec2;
  target:   Vec2;
  position: Vec2;
  speed:    number;
  damage:   number;
  ownerId:  string;
  targetId: string | null;
  abilityId: string;
}
