// ---------------------------------------------------------------------------
// Terraria – Mob type definitions
// ---------------------------------------------------------------------------

import { TB } from "./TerrariaBalance";

export interface MobDef {
  type: string;
  name: string;
  hp: number;
  damage: number;
  defense: number;
  speed: number;
  width: number;
  height: number;
  color: number;
  xpDrop: number;
  detectRange: number;
  attackRange: number;
  hostile: boolean;
  isBoss: boolean;
  nightOnly: boolean;
  spawnWeight: number;
  minDepth: number;   // minimum Y (bottom limit)
  maxDepth: number;   // maximum Y (top limit)
}

export const MOB_DEFS: Record<string, MobDef> = {
  // Surface enemies
  slime: {
    type: "slime", name: "Slime",
    hp: 12, damage: 3, defense: 0, speed: 2,
    width: 0.8, height: 0.8, color: 0x44CC44,
    xpDrop: 2, detectRange: 8, attackRange: 1,
    hostile: true, isBoss: false, nightOnly: false,
    spawnWeight: 15, minDepth: TB.SURFACE_Y - 10, maxDepth: TB.WORLD_HEIGHT,
  },
  saxon_warrior: {
    type: "saxon_warrior", name: "Saxon Warrior",
    hp: 24, damage: 6, defense: 2, speed: 3,
    width: 0.8, height: 1.5, color: 0x884422,
    xpDrop: 5, detectRange: 12, attackRange: 1.5,
    hostile: true, isBoss: false, nightOnly: true,
    spawnWeight: 10, minDepth: TB.SURFACE_Y - 10, maxDepth: TB.WORLD_HEIGHT,
  },
  wolf: {
    type: "wolf", name: "Wild Wolf",
    hp: 18, damage: 6, defense: 1, speed: 5,
    width: 1.0, height: 0.8, color: 0x666666,
    xpDrop: 3, detectRange: 14, attackRange: 1,
    hostile: true, isBoss: false, nightOnly: true,
    spawnWeight: 8, minDepth: TB.SURFACE_Y - 10, maxDepth: TB.WORLD_HEIGHT,
  },

  // Underground enemies
  cave_spider: {
    type: "cave_spider", name: "Cave Spider",
    hp: 12, damage: 6, defense: 1, speed: 4,
    width: 0.7, height: 0.5, color: 0x553300,
    xpDrop: 4, detectRange: 10, attackRange: 1,
    hostile: true, isBoss: false, nightOnly: false,
    spawnWeight: 12, minDepth: TB.CAVERN_Y, maxDepth: TB.UNDERGROUND_Y,
  },
  skeleton: {
    type: "skeleton", name: "Skeleton",
    hp: 22, damage: 8, defense: 3, speed: 2.5,
    width: 0.8, height: 1.5, color: 0xDDDDAA,
    xpDrop: 6, detectRange: 12, attackRange: 1.5,
    hostile: true, isBoss: false, nightOnly: false,
    spawnWeight: 10, minDepth: TB.CAVERN_Y, maxDepth: TB.UNDERGROUND_Y,
  },
  dark_knight: {
    type: "dark_knight", name: "Dark Knight",
    hp: 40, damage: 12, defense: 5, speed: 2,
    width: 0.8, height: 1.6, color: 0x333344,
    xpDrop: 12, detectRange: 14, attackRange: 1.5,
    hostile: true, isBoss: false, nightOnly: false,
    spawnWeight: 5, minDepth: TB.CAVERN_Y, maxDepth: TB.UNDERGROUND_Y,
  },

  // Cavern enemies
  wraith: {
    type: "wraith", name: "Wraith",
    hp: 30, damage: 14, defense: 4, speed: 3,
    width: 0.8, height: 1.4, color: 0x6644AA,
    xpDrop: 15, detectRange: 16, attackRange: 2,
    hostile: true, isBoss: false, nightOnly: false,
    spawnWeight: 8, minDepth: TB.UNDERWORLD_Y, maxDepth: TB.CAVERN_Y,
  },
  construct: {
    type: "construct", name: "Morgan's Construct",
    hp: 60, damage: 16, defense: 8, speed: 1.5,
    width: 1.2, height: 1.8, color: 0x8844AA,
    xpDrop: 25, detectRange: 12, attackRange: 2,
    hostile: true, isBoss: false, nightOnly: false,
    spawnWeight: 4, minDepth: TB.UNDERWORLD_Y, maxDepth: TB.CAVERN_Y,
  },

  // Underworld bosses
  dragon: {
    type: "dragon", name: "The Dragon",
    hp: 500, damage: 30, defense: 15, speed: 4,
    width: 2.0, height: 2.0, color: 0xFF2200,
    xpDrop: 200, detectRange: 24, attackRange: 3,
    hostile: true, isBoss: true, nightOnly: false,
    spawnWeight: 0, minDepth: 0, maxDepth: TB.UNDERWORLD_Y,
  },
  mordred: {
    type: "mordred", name: "Mordred",
    hp: 400, damage: 25, defense: 12, speed: 5,
    width: 0.9, height: 1.7, color: 0x440000,
    xpDrop: 150, detectRange: 20, attackRange: 2,
    hostile: true, isBoss: true, nightOnly: false,
    spawnWeight: 0, minDepth: 0, maxDepth: TB.UNDERWORLD_Y,
  },

  // Passive mobs
  deer: {
    type: "deer", name: "Deer",
    hp: 8, damage: 0, defense: 0, speed: 4,
    width: 0.8, height: 1.0, color: 0xAA8855,
    xpDrop: 1, detectRange: 10, attackRange: 0,
    hostile: false, isBoss: false, nightOnly: false,
    spawnWeight: 6, minDepth: TB.SURFACE_Y, maxDepth: TB.WORLD_HEIGHT,
  },
};

/** Get all mob types that can spawn at a given depth and time. */
export function getSpawnableMobs(playerY: number, isNight: boolean): MobDef[] {
  return Object.values(MOB_DEFS).filter(def => {
    if (def.spawnWeight <= 0) return false;
    if (def.nightOnly && !isNight) return false;
    return playerY >= def.minDepth && playerY <= def.maxDepth;
  });
}
