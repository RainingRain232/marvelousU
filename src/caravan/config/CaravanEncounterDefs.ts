// ---------------------------------------------------------------------------
// Caravan encounter definitions
// ---------------------------------------------------------------------------

import { UnitType } from "@/types";

export interface CaravanEnemyDef {
  unitType: UnitType;
  hp: number;
  atk: number;
  speed: number;
  range: number;
  goldReward: number;
  name: string;
  isBoss?: boolean;
}

export interface EncounterDef {
  id: string;
  name: string;
  enemies: { def: CaravanEnemyDef; count: number }[];
  minSegment: number; // earliest segment this can appear
  weight: number;
  isBoss: boolean;
}

// ---------------------------------------------------------------------------
// Enemy definitions
// ---------------------------------------------------------------------------

export const ENEMY_DEFS: Record<string, CaravanEnemyDef> = {
  bandit: {
    unitType: UnitType.SWORDSMAN,
    hp: 40, atk: 8, speed: 1.8, range: 1.2,
    goldReward: 8, name: "Bandit",
  },
  wolf: {
    unitType: UnitType.ALPHA_WOLF,
    hp: 25, atk: 6, speed: 3.0, range: 1.0,
    goldReward: 5, name: "Wolf",
  },
  bandit_archer: {
    unitType: UnitType.ARCHER,
    hp: 30, atk: 10, speed: 1.5, range: 5.0,
    goldReward: 10, name: "Bandit Archer",
  },
  brigand: {
    unitType: UnitType.HALBERDIER,
    hp: 70, atk: 14, speed: 1.4, range: 1.5,
    goldReward: 15, name: "Brigand",
  },
  marauder: {
    unitType: UnitType.KNIGHT,
    hp: 100, atk: 18, speed: 2.2, range: 1.3,
    goldReward: 20, name: "Marauder",
  },
  troll: {
    unitType: UnitType.TROLL,
    hp: 200, atk: 25, speed: 1.0, range: 1.5,
    goldReward: 30, name: "Troll",
  },
  // Bosses
  bandit_lord: {
    unitType: UnitType.WARCHIEF,
    hp: 500, atk: 30, speed: 1.5, range: 1.5,
    goldReward: 100, name: "Bandit Lord", isBoss: true,
  },
  dragon: {
    unitType: UnitType.RED_DRAGON,
    hp: 800, atk: 40, speed: 1.2, range: 3.0,
    goldReward: 200, name: "Dragon", isBoss: true,
  },
  dark_knight: {
    unitType: UnitType.CATAPHRACT,
    hp: 600, atk: 35, speed: 1.8, range: 1.5,
    goldReward: 150, name: "Dark Knight", isBoss: true,
  },
};

// ---------------------------------------------------------------------------
// Encounter table
// ---------------------------------------------------------------------------

export const ENCOUNTERS: EncounterDef[] = [
  // Segment 0+
  {
    id: "wolf_pack", name: "Wolf Pack",
    enemies: [{ def: ENEMY_DEFS.wolf, count: 5 }],
    minSegment: 0, weight: 8, isBoss: false,
  },
  {
    id: "bandit_ambush", name: "Bandit Ambush",
    enemies: [{ def: ENEMY_DEFS.bandit, count: 3 }],
    minSegment: 0, weight: 10, isBoss: false,
  },
  {
    id: "highway_robbery", name: "Highway Robbery",
    enemies: [
      { def: ENEMY_DEFS.bandit, count: 2 },
      { def: ENEMY_DEFS.wolf, count: 2 },
    ],
    minSegment: 0, weight: 8, isBoss: false,
  },
  // Segment 1+
  {
    id: "archer_ambush", name: "Archer Ambush",
    enemies: [
      { def: ENEMY_DEFS.bandit, count: 2 },
      { def: ENEMY_DEFS.bandit_archer, count: 2 },
    ],
    minSegment: 1, weight: 8, isBoss: false,
  },
  {
    id: "brigand_raid", name: "Brigand Raid",
    enemies: [{ def: ENEMY_DEFS.brigand, count: 2 }],
    minSegment: 1, weight: 6, isBoss: false,
  },
  {
    id: "wolf_den", name: "Wolf Den",
    enemies: [{ def: ENEMY_DEFS.wolf, count: 7 }],
    minSegment: 1, weight: 5, isBoss: false,
  },
  // Segment 2+
  {
    id: "marauder_assault", name: "Marauder Assault",
    enemies: [
      { def: ENEMY_DEFS.marauder, count: 2 },
      { def: ENEMY_DEFS.bandit_archer, count: 2 },
    ],
    minSegment: 2, weight: 5, isBoss: false,
  },
  {
    id: "troll_crossing", name: "Troll Crossing",
    enemies: [
      { def: ENEMY_DEFS.troll, count: 1 },
      { def: ENEMY_DEFS.wolf, count: 3 },
    ],
    minSegment: 2, weight: 4, isBoss: false,
  },
  {
    id: "flanking_attack", name: "Flanking Attack",
    enemies: [
      { def: ENEMY_DEFS.brigand, count: 2 },
      { def: ENEMY_DEFS.bandit, count: 3 },
      { def: ENEMY_DEFS.bandit_archer, count: 1 },
    ],
    minSegment: 2, weight: 5, isBoss: false,
  },
  // Segment 3+
  {
    id: "large_raid", name: "Large Raid",
    enemies: [
      { def: ENEMY_DEFS.brigand, count: 3 },
      { def: ENEMY_DEFS.marauder, count: 2 },
      { def: ENEMY_DEFS.bandit_archer, count: 3 },
    ],
    minSegment: 3, weight: 3, isBoss: false,
  },
  {
    id: "troll_war_party", name: "Troll War Party",
    enemies: [
      { def: ENEMY_DEFS.troll, count: 2 },
      { def: ENEMY_DEFS.brigand, count: 2 },
    ],
    minSegment: 3, weight: 3, isBoss: false,
  },
  // Segment 4+
  {
    id: "army_ambush", name: "Army Ambush",
    enemies: [
      { def: ENEMY_DEFS.marauder, count: 3 },
      { def: ENEMY_DEFS.brigand, count: 3 },
      { def: ENEMY_DEFS.bandit_archer, count: 4 },
    ],
    minSegment: 4, weight: 3, isBoss: false,
  },
  {
    id: "veteran_assault", name: "Veteran Assault",
    enemies: [
      { def: ENEMY_DEFS.marauder, count: 4 },
      { def: ENEMY_DEFS.troll, count: 1 },
    ],
    minSegment: 4, weight: 3, isBoss: false,
  },
  {
    id: "pincer_attack", name: "Pincer Attack",
    enemies: [
      { def: ENEMY_DEFS.wolf, count: 6 },
      { def: ENEMY_DEFS.marauder, count: 3 },
      { def: ENEMY_DEFS.bandit_archer, count: 3 },
    ],
    minSegment: 4, weight: 2, isBoss: false,
  },
  {
    id: "elite_guard", name: "Elite Guard",
    enemies: [
      { def: ENEMY_DEFS.dark_knight, count: 1 },
      { def: ENEMY_DEFS.brigand, count: 4 },
    ],
    minSegment: 4, weight: 2, isBoss: false,
  },
  {
    id: "troll_horde", name: "Troll Horde",
    enemies: [
      { def: ENEMY_DEFS.troll, count: 3 },
      { def: ENEMY_DEFS.wolf, count: 4 },
    ],
    minSegment: 4, weight: 2, isBoss: false,
  },

  // Boss encounters
  {
    id: "boss_bandit_lord", name: "The Bandit Lord",
    enemies: [
      { def: ENEMY_DEFS.bandit_lord, count: 1 },
      { def: ENEMY_DEFS.bandit, count: 4 },
    ],
    minSegment: 0, weight: 0, isBoss: true,
  },
  {
    id: "boss_dragon", name: "Dragon Attack",
    enemies: [{ def: ENEMY_DEFS.dragon, count: 1 }],
    minSegment: 0, weight: 0, isBoss: true,
  },
  {
    id: "boss_dark_knight", name: "The Dark Knight",
    enemies: [
      { def: ENEMY_DEFS.dark_knight, count: 1 },
      { def: ENEMY_DEFS.marauder, count: 2 },
    ],
    minSegment: 0, weight: 0, isBoss: true,
  },
];

export function rollEncounter(segment: number): EncounterDef {
  const pool = ENCOUNTERS.filter((e) => !e.isBoss && segment >= e.minSegment);
  // Weighted random selection
  let totalWeight = 0;
  for (const e of pool) totalWeight += e.weight;
  let roll = Math.random() * totalWeight;
  for (const e of pool) {
    roll -= e.weight;
    if (roll <= 0) return e;
  }
  return pool[pool.length - 1];
}

export function rollBossEncounter(bossIndex: number): EncounterDef {
  const bosses = ENCOUNTERS.filter((e) => e.isBoss);
  return bosses[bossIndex % bosses.length];
}
