// ---------------------------------------------------------------------------
// Warband mode – creature definitions
// Large non-humanoid units (trolls, cyclops, etc.)
// ---------------------------------------------------------------------------

export type CreatureType = "troll" | "cyclops";

export interface CreatureDef {
  type: CreatureType;
  name: string;
  hp: number;
  radius: number;       // collision radius (replaces FIGHTER_RADIUS)
  height: number;       // visual height
  scale: number;        // overall scale multiplier vs human (1.0)
  speed: number;        // walk speed (absolute, not multiplier)
  damage: number;       // base melee damage (no weapon)
  reach: number;        // melee reach
  attackTicks: number;  // windup ticks (slower than humans)
  releaseTicks: number; // release window ticks
}

export const CREATURE_DEFS: Record<CreatureType, CreatureDef> = {
  troll: {
    type: "troll",
    name: "Troll",
    hp: 400,
    radius: 0.8,
    height: 3.5,
    scale: 2.0,
    speed: 2.8,
    damage: 55,
    reach: 3.0,
    attackTicks: 24,
    releaseTicks: 10,
  },
  cyclops: {
    type: "cyclops",
    name: "Cyclops",
    hp: 650,
    radius: 1.1,
    height: 5.0,
    scale: 2.8,
    speed: 2.2,
    damage: 80,
    reach: 3.8,
    attackTicks: 30,
    releaseTicks: 12,
  },
};
