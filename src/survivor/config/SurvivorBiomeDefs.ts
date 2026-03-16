// ---------------------------------------------------------------------------
// Biome progression definitions — arena shifts after surviving long enough
// ---------------------------------------------------------------------------

import { UnitType, MapType } from "@/types";
import type { SurvivorEnemyDef } from "./SurvivorEnemyDefs";

export type BiomeId = "forest" | "cave" | "castle" | "underworld";

export interface SurvivorBiomeDef {
  id: BiomeId;
  name: string;
  description: string;
  mapType: MapType; // determines visual theme
  waveThreshold: number; // game time in seconds when this biome activates
  color: number; // UI banner color
  // Enemy pool specific to this biome (added to existing wave pool)
  biomeEnemies: SurvivorEnemyDef[];
  // Modifiers for this biome
  spawnRateMultiplier: number;
  enemyHpMultiplier: number;
  enemySpeedMultiplier: number;
}

export const BIOME_DEFS: SurvivorBiomeDef[] = [
  {
    id: "forest",
    name: "Dark Forest",
    description: "The trees close in around you...",
    mapType: MapType.FOREST,
    waveThreshold: 0, // starting biome
    color: 0x44aa44,
    biomeEnemies: [
      { type: UnitType.SPIDER, tier: 0, hpMult: 0.4, atkMult: 0.4, speedMult: 0.8 },
      { type: UnitType.BAT, tier: 0, hpMult: 0.3, atkMult: 0.3, speedMult: 1.2 },
      { type: UnitType.DIRE_BEAR, tier: 1, hpMult: 1.0, atkMult: 0.8, speedMult: 0.7 },
    ],
    spawnRateMultiplier: 1.0,
    enemyHpMultiplier: 1.0,
    enemySpeedMultiplier: 1.0,
  },
  {
    id: "cave",
    name: "Crystal Caverns",
    description: "You descend into the deep dark...",
    mapType: MapType.MOUNTAINS,
    waveThreshold: 300, // 5 minutes
    color: 0x6688cc,
    biomeEnemies: [
      { type: UnitType.TROLL, tier: 1, hpMult: 1.2, atkMult: 0.6, speedMult: 0.6 },
      { type: UnitType.MAGMA_GOLEM, tier: 2, hpMult: 1.5, atkMult: 0.8, speedMult: 0.4 },
      { type: UnitType.BONE_COLOSSUS, tier: 2, hpMult: 2.0, atkMult: 0.8, speedMult: 0.5 },
    ],
    spawnRateMultiplier: 1.1,
    enemyHpMultiplier: 1.15,
    enemySpeedMultiplier: 1.0,
  },
  {
    id: "castle",
    name: "Ruined Castle",
    description: "The fallen fortress crawls with corruption...",
    mapType: MapType.HILLS,
    waveThreshold: 720, // 12 minutes
    color: 0xccaa44,
    biomeEnemies: [
      { type: UnitType.DEATH_KNIGHT, tier: 3, hpMult: 2.0, atkMult: 1.2, speedMult: 0.9 },
      { type: UnitType.KNIGHT, tier: 2, hpMult: 1.5, atkMult: 1.0, speedMult: 1.0 },
      { type: UnitType.IRON_COLOSSUS, tier: 3, hpMult: 3.0, atkMult: 1.0, speedMult: 0.4 },
      { type: UnitType.DOOM_GUARD, tier: 3, hpMult: 2.0, atkMult: 1.5, speedMult: 0.8 },
    ],
    spawnRateMultiplier: 1.2,
    enemyHpMultiplier: 1.3,
    enemySpeedMultiplier: 1.1,
  },
  {
    id: "underworld",
    name: "The Underworld",
    description: "You have entered the realm of the dead...",
    mapType: MapType.VOLCANIC,
    waveThreshold: 1200, // 20 minutes
    color: 0xff4422,
    biomeEnemies: [
      { type: UnitType.PIT_LORD, tier: 3, hpMult: 2.5, atkMult: 1.5, speedMult: 0.7 },
      { type: UnitType.RED_DRAGON, tier: 4, hpMult: 4.0, atkMult: 2.0, speedMult: 0.9 },
      { type: UnitType.WRAITH_LORD, tier: 4, hpMult: 3.5, atkMult: 2.5, speedMult: 1.0 },
      { type: UnitType.VOLCANIC_BEHEMOTH, tier: 4, hpMult: 5.0, atkMult: 2.0, speedMult: 0.4 },
    ],
    spawnRateMultiplier: 1.4,
    enemyHpMultiplier: 1.5,
    enemySpeedMultiplier: 1.2,
  },
];

/** Get the active biome for the given game time */
export function getActiveBiome(gameTime: number): SurvivorBiomeDef {
  let active = BIOME_DEFS[0];
  for (const biome of BIOME_DEFS) {
    if (gameTime >= biome.waveThreshold) {
      active = biome;
    }
  }
  return active;
}

/** Get the biome index (0-based) for the given game time */
export function getBiomeIndex(gameTime: number): number {
  let idx = 0;
  for (let i = 0; i < BIOME_DEFS.length; i++) {
    if (gameTime >= BIOME_DEFS[i].waveThreshold) {
      idx = i;
    }
  }
  return idx;
}
