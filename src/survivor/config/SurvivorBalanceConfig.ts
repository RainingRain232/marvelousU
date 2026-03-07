// ---------------------------------------------------------------------------
// Survivor mode balance constants
// ---------------------------------------------------------------------------

import { MapType } from "@/types";

export const SurvivorBalance = {
  // Map
  MAP_WIDTH: 120,
  MAP_HEIGHT: 120,
  TILE_SIZE: 64,

  // Player
  PLAYER_SPEED: 4.0, // tiles/sec
  PLAYER_BASE_HP: 200,
  PLAYER_BASE_ATK: 20,
  PLAYER_PICKUP_RADIUS: 2.5, // tiles
  PLAYER_MAGNET_RADIUS: 1.5, // tiles — gems start drifting toward player
  PLAYER_INVINCIBILITY_TIME: 0.5, // seconds after taking damage

  // XP / Leveling
  XP_BASE: 100,
  XP_SCALE: 1.15, // xpNeeded = XP_BASE * XP_SCALE^level
  MAX_WEAPON_SLOTS: 6,
  MAX_PASSIVE_SLOTS: 6,
  MAX_WEAPON_LEVEL: 8,
  MAX_PASSIVE_LEVEL: 5,
  LEVEL_UP_CHOICES: 4,

  // Enemies
  ENEMY_BASE_SPAWN_RATE: 3.0, // per second at minute 0
  ENEMY_SPAWN_RATE_SCALE: 1.8, // per additional minute
  ENEMY_MAX_SPAWN_RATE: 60,
  ENEMY_MAX_ALIVE: 500,
  ENEMY_SPAWN_MARGIN: 3, // tiles beyond screen edge
  ENEMY_HP_SCALE_PER_MIN: 0.08,
  ENEMY_SPEED_SCALE_PER_MIN: 0.02,
  ENEMY_SPEED_CAP: 2.0, // max speed multiplier
  ENEMY_DAMAGE_TO_PLAYER_SCALE: 0.5, // enemies deal their atk * this to player
  ENEMY_CONTACT_RANGE: 1.0, // tiles

  // XP Gem values by tier
  GEM_VALUES: [1, 3, 8, 20, 50] as readonly number[],
  GEM_COLORS: [0x44ff44, 0x44aaff, 0xffaa44, 0xff44ff, 0xffd700] as readonly number[],
  GEM_DRIFT_SPEED: 12, // tiles/sec when within magnet radius

  // Waves / Bosses
  BOSS_INTERVAL: 300, // seconds (every 5 minutes)
  BOSS_HP_MULTIPLIER: 20,
  BOSS_ATK_MULTIPLIER: 3,
  BOSS_SIZE_MULTIPLIER: 2.0,
  BOSS_XP_MULTIPLIER: 50,

  // Dash
  DASH_SPEED: 16,           // tiles/sec during dash
  DASH_DURATION: 0.15,      // seconds
  DASH_COOLDOWN: 1.5,       // seconds between dashes
  DASH_IFRAMES: 0.2,        // invincibility window

  // Chest drops
  CHEST_DROP_CHANCE: 0.005,
  CHEST_DROP_LUCK_SCALE: 0.5,

  // Victory
  VICTORY_TIME: 1800,       // 30 minutes

  // Timing
  SIM_TICK_MS: 1000 / 60,
} as const;

// ---------------------------------------------------------------------------
// Themed map definitions
// ---------------------------------------------------------------------------

export interface SurvivorMapDef {
  id: string;
  name: string;
  mapType: MapType;
  width: number;
  height: number;
}

export const SURVIVOR_MAPS: SurvivorMapDef[] = [
  { id: "meadow", name: "Emerald Meadow", mapType: MapType.MEADOW, width: 120, height: 120 },
  { id: "forest", name: "Dark Forest", mapType: MapType.FOREST, width: 100, height: 100 },
  { id: "tundra", name: "Frozen Wastes", mapType: MapType.TUNDRA, width: 130, height: 130 },
  { id: "volcanic", name: "Volcanic Hellscape", mapType: MapType.VOLCANIC, width: 110, height: 110 },
  { id: "swamp", name: "Haunted Swamp", mapType: MapType.SWAMP, width: 100, height: 100 },
  { id: "desert", name: "Desert Ruins", mapType: MapType.DESERT, width: 140, height: 140 },
];
