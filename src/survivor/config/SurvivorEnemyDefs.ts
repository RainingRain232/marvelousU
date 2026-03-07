// ---------------------------------------------------------------------------
// Survivor enemy wave definitions
// ---------------------------------------------------------------------------

import { UnitType } from "@/types";

export interface SurvivorEnemyDef {
  type: UnitType;
  tier: number; // 0-4, determines XP gem tier
  hpMult: number; // multiplier on base HP
  atkMult: number; // multiplier on base ATK
  speedMult: number; // multiplier on base speed
  isBoss?: boolean;
}

// Enemies grouped by the minute they start appearing
export interface WaveEntry {
  minuteStart: number;
  minuteEnd: number; // -1 = forever
  enemies: SurvivorEnemyDef[];
  weight: number; // spawn probability weight
}

// ---------------------------------------------------------------------------
// Enemy definitions by tier
// ---------------------------------------------------------------------------

const TIER0: SurvivorEnemyDef[] = [
  { type: UnitType.BAT, tier: 0, hpMult: 0.3, atkMult: 0.3, speedMult: 1.2 },
  { type: UnitType.SPIDER, tier: 0, hpMult: 0.4, atkMult: 0.4, speedMult: 0.8 },
  { type: UnitType.HALFLING_SLINGER, tier: 0, hpMult: 0.3, atkMult: 0.3, speedMult: 1.0 },
  { type: UnitType.SWORDSMAN, tier: 0, hpMult: 0.5, atkMult: 0.3, speedMult: 0.7 },
  { type: UnitType.PIXIE, tier: 0, hpMult: 0.2, atkMult: 0.2, speedMult: 1.5 },
];

const TIER1: SurvivorEnemyDef[] = [
  { type: UnitType.PIKEMAN, tier: 1, hpMult: 0.6, atkMult: 0.5, speedMult: 0.8 },
  { type: UnitType.CROSSBOWMAN, tier: 1, hpMult: 0.5, atkMult: 0.6, speedMult: 0.9 },
  { type: UnitType.ORC_BRUTE, tier: 1, hpMult: 0.8, atkMult: 0.6, speedMult: 0.7 },
  { type: UnitType.FIRE_IMP, tier: 1, hpMult: 0.4, atkMult: 0.7, speedMult: 1.1 },
  { type: UnitType.ICE_IMP, tier: 1, hpMult: 0.4, atkMult: 0.6, speedMult: 1.1 },
  { type: UnitType.TROLL, tier: 1, hpMult: 1.0, atkMult: 0.5, speedMult: 0.6 },
];

const TIER2: SurvivorEnemyDef[] = [
  { type: UnitType.KNIGHT, tier: 2, hpMult: 1.2, atkMult: 0.8, speedMult: 1.0 },
  { type: UnitType.CATAPHRACT, tier: 2, hpMult: 1.0, atkMult: 0.9, speedMult: 1.2 },
  { type: UnitType.BLOOD_BERSERKER, tier: 2, hpMult: 0.8, atkMult: 1.2, speedMult: 1.1 },
  { type: UnitType.BANSHEE, tier: 2, hpMult: 0.6, atkMult: 1.0, speedMult: 1.3 },
  { type: UnitType.MAGMA_GOLEM, tier: 2, hpMult: 1.5, atkMult: 0.8, speedMult: 0.5 },
  { type: UnitType.DIRE_BEAR, tier: 2, hpMult: 1.3, atkMult: 1.0, speedMult: 0.8 },
];

const TIER3: SurvivorEnemyDef[] = [
  { type: UnitType.DEATH_KNIGHT, tier: 3, hpMult: 2.0, atkMult: 1.2, speedMult: 0.9 },
  { type: UnitType.PIT_LORD, tier: 3, hpMult: 2.5, atkMult: 1.5, speedMult: 0.7 },
  { type: UnitType.BONE_COLOSSUS, tier: 3, hpMult: 3.0, atkMult: 1.0, speedMult: 0.5 },
  { type: UnitType.IRON_COLOSSUS, tier: 3, hpMult: 3.5, atkMult: 1.2, speedMult: 0.4 },
  { type: UnitType.DOOM_GUARD, tier: 3, hpMult: 2.0, atkMult: 1.8, speedMult: 0.8 },
  { type: UnitType.FROST_DRAGON, tier: 3, hpMult: 2.5, atkMult: 1.3, speedMult: 1.0 },
];

const TIER4: SurvivorEnemyDef[] = [
  { type: UnitType.RED_DRAGON, tier: 4, hpMult: 4.0, atkMult: 2.0, speedMult: 0.9 },
  { type: UnitType.CYCLOPS, tier: 4, hpMult: 5.0, atkMult: 2.5, speedMult: 0.5 },
  { type: UnitType.VOLCANIC_BEHEMOTH, tier: 4, hpMult: 5.0, atkMult: 2.0, speedMult: 0.4 },
  { type: UnitType.WRAITH_LORD, tier: 4, hpMult: 3.5, atkMult: 2.5, speedMult: 1.0 },
  { type: UnitType.SERAPHIM, tier: 4, hpMult: 3.0, atkMult: 2.0, speedMult: 1.2 },
];

// ---------------------------------------------------------------------------
// Boss definitions
// ---------------------------------------------------------------------------

export const BOSS_DEFS: SurvivorEnemyDef[] = [
  { type: UnitType.GIANT_WARRIOR, tier: 2, hpMult: 1.0, atkMult: 1.0, speedMult: 0.6, isBoss: true },
  { type: UnitType.TROLL, tier: 2, hpMult: 1.0, atkMult: 1.0, speedMult: 0.5, isBoss: true },
  { type: UnitType.RED_DRAGON, tier: 3, hpMult: 1.0, atkMult: 1.0, speedMult: 0.7, isBoss: true },
  { type: UnitType.CYCLOPS, tier: 3, hpMult: 1.0, atkMult: 1.0, speedMult: 0.5, isBoss: true },
  { type: UnitType.ARCHON, tier: 4, hpMult: 1.0, atkMult: 1.0, speedMult: 0.8, isBoss: true },
  { type: UnitType.PIT_LORD, tier: 4, hpMult: 1.0, atkMult: 1.0, speedMult: 0.6, isBoss: true },
];

// ---------------------------------------------------------------------------
// Wave table
// ---------------------------------------------------------------------------

export const WAVE_TABLE: WaveEntry[] = [
  { minuteStart: 0, minuteEnd: -1, enemies: TIER0, weight: 10 },
  { minuteStart: 3, minuteEnd: -1, enemies: TIER1, weight: 6 },
  { minuteStart: 7, minuteEnd: -1, enemies: TIER2, weight: 4 },
  { minuteStart: 12, minuteEnd: -1, enemies: TIER3, weight: 2 },
  { minuteStart: 18, minuteEnd: -1, enemies: TIER4, weight: 1 },
];
