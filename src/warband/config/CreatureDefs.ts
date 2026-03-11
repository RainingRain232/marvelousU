// ---------------------------------------------------------------------------
// Warband mode – creature definitions
// Large non-humanoid units (trolls, cyclops, etc.)
// ---------------------------------------------------------------------------

export type CreatureType =
  | "troll"
  | "cyclops"
  // Creature Den
  | "spider"
  | "giant_frog"
  | "rhino"
  | "vampire_bat"
  | "red_dragon"
  | "fire_elemental"
  | "ice_elemental"
  | "earth_elemental"
  // Siege Workshop
  | "battering_ram"
  | "catapult"
  | "trebuchet"
  | "ballista"
  // Elite Siege Workshop
  | "cannon"
  | "giant_siege";

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

  // ---- Creature Den ----

  spider: {
    type: "spider",
    name: "Spider",
    hp: 65,
    radius: 0.5,
    height: 1.2,
    scale: 1.0,
    speed: 4.0,
    damage: 12,
    reach: 1.5,
    attackTicks: 12,
    releaseTicks: 6,
  },
  giant_frog: {
    type: "giant_frog",
    name: "Giant Frog",
    hp: 200,
    radius: 0.7,
    height: 1.8,
    scale: 1.4,
    speed: 3.0,
    damage: 18,
    reach: 3.5,
    attackTicks: 16,
    releaseTicks: 6,
  },
  rhino: {
    type: "rhino",
    name: "Rhino",
    hp: 350,
    radius: 0.9,
    height: 2.5,
    scale: 1.8,
    speed: 3.5,
    damage: 35,
    reach: 2.0,
    attackTicks: 20,
    releaseTicks: 8,
  },
  vampire_bat: {
    type: "vampire_bat",
    name: "Vampire Bat",
    hp: 350,
    radius: 0.7,
    height: 3.0,
    scale: 1.6,
    speed: 4.5,
    damage: 30,
    reach: 2.0,
    attackTicks: 14,
    releaseTicks: 6,
  },
  red_dragon: {
    type: "red_dragon",
    name: "Red Dragon",
    hp: 500,
    radius: 1.2,
    height: 4.5,
    scale: 2.5,
    speed: 2.5,
    damage: 65,
    reach: 3.5,
    attackTicks: 26,
    releaseTicks: 10,
  },
  fire_elemental: {
    type: "fire_elemental",
    name: "Fire Elemental",
    hp: 450,
    radius: 0.8,
    height: 4.0,
    scale: 2.2,
    speed: 2.8,
    damage: 50,
    reach: 2.5,
    attackTicks: 20,
    releaseTicks: 8,
  },
  ice_elemental: {
    type: "ice_elemental",
    name: "Ice Elemental",
    hp: 400,
    radius: 0.8,
    height: 4.0,
    scale: 2.2,
    speed: 2.4,
    damage: 45,
    reach: 2.8,
    attackTicks: 22,
    releaseTicks: 10,
  },
  earth_elemental: {
    type: "earth_elemental",
    name: "Earth Elemental",
    hp: 600,
    radius: 1.0,
    height: 4.2,
    scale: 2.4,
    speed: 1.8,
    damage: 55,
    reach: 2.5,
    attackTicks: 28,
    releaseTicks: 12,
  },

  // ---- Siege Workshop ----

  battering_ram: {
    type: "battering_ram",
    name: "Battering Ram",
    hp: 300,
    radius: 0.8,
    height: 2.0,
    scale: 1.8,
    speed: 1.5,
    damage: 60,
    reach: 2.5,
    attackTicks: 30,
    releaseTicks: 10,
  },
  catapult: {
    type: "catapult",
    name: "Catapult",
    hp: 150,
    radius: 0.9,
    height: 2.5,
    scale: 1.8,
    speed: 1.0,
    damage: 45,
    reach: 5.0,
    attackTicks: 40,
    releaseTicks: 8,
  },
  trebuchet: {
    type: "trebuchet",
    name: "Trebuchet",
    hp: 250,
    radius: 1.2,
    height: 4.0,
    scale: 2.5,
    speed: 0.6,
    damage: 80,
    reach: 8.0,
    attackTicks: 50,
    releaseTicks: 10,
  },
  ballista: {
    type: "ballista",
    name: "Ballista",
    hp: 120,
    radius: 0.7,
    height: 2.0,
    scale: 1.5,
    speed: 1.2,
    damage: 55,
    reach: 6.0,
    attackTicks: 24,
    releaseTicks: 6,
  },

  // ---- Elite Siege Workshop ----

  cannon: {
    type: "cannon",
    name: "Cannon",
    hp: 400,
    radius: 0.8,
    height: 2.0,
    scale: 1.6,
    speed: 0.8,
    damage: 140,
    reach: 7.0,
    attackTicks: 60,
    releaseTicks: 8,
  },
  giant_siege: {
    type: "giant_siege",
    name: "Siege Giant",
    hp: 1500,
    radius: 1.3,
    height: 6.0,
    scale: 3.2,
    speed: 1.5,
    damage: 130,
    reach: 4.0,
    attackTicks: 35,
    releaseTicks: 14,
  },
};
