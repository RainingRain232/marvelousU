// ---------------------------------------------------------------------------
// Wyrm — Balance constants (v5)
// ---------------------------------------------------------------------------

import type { WyrmColors } from "../types";

export const WYRM_BALANCE = {
  MIN_COLS: 30, MIN_ROWS: 20, CELL_SIZE: 24,

  START_LENGTH: 4,
  START_MOVE_INTERVAL: 0.12, MIN_MOVE_INTERVAL: 0.05,
  SPEED_PER_LENGTH: 0.001,

  PICKUP_SPAWN_INTERVAL: 1.8, MAX_PICKUPS: 14, PICKUP_DESPAWN_TIME: 14,
  PICKUP_WEIGHTS: { sheep: 40, golden_sheep: 3, treasure: 14, potion: 12, fire_scroll: 6, shield: 4, portal: 3 } as Record<string, number>,

  SCORE_SHEEP: 10, SCORE_GOLDEN_SHEEP: 50, SCORE_KNIGHT: 40, SCORE_TREASURE: 50,
  SCORE_FIRE_KILL: 15, SCORE_BOSS_KILL: 200, SCORE_PER_SECOND: 1,

  COMBO_WINDOW: 3.0, COMBO_MULT_CAP: 8,

  FIRE_BREATH_DURATION: 6, FIRE_BREATH_RANGE: 3,
  SPEED_BOOST_DURATION: 5, SPEED_BOOST_MULT: 0.6,

  // Lunge
  LUNGE_DISTANCE: 2,
  LUNGE_COOLDOWN: 4, // seconds
  LUNGE_FLASH: 0.15,

  // Knights
  KNIGHT_SPAWN_INTERVAL: 12, KNIGHT_MOVE_INTERVAL: 0.4,
  KNIGHT_MIN_MOVE_INTERVAL: 0.18, MAX_KNIGHTS: 5, KNIGHT_INITIAL_DELAY: 8,
  KNIGHT_CHASE_WAVE: 3, KNIGHT_CHASE_CHANCE: 0.4,

  // Boss
  BOSS_WAVE_INTERVAL: 5, BOSS_HP: 3, BOSS_MOVE_INTERVAL: 0.3, BOSS_FLASH_DURATION: 0.2,

  // Poison
  POISON_START_WAVE: 4,
  POISON_PER_WAVE: 3,
  POISON_LIFETIME: 20,
  POISON_SHRINK: 1, // segments lost
  COLOR_POISON: 0x44aa44,

  // Waves
  WAVE_INTERVAL: 25, WALLS_PER_WAVE: 5, MAX_WALLS: 50,

  TRAIL_LIFETIME: 0.6, TRAIL_MAX: 80,
  DEATH_SEGMENT_LIFETIME: 1.5, DEATH_SCATTER_SPEED: 120,
  DANGER_DISTANCE: 3,
  SLOW_MO_DURATION: 0.15, SLOW_MO_SCALE: 0.4,

  SCORE_MILESTONES: [100, 300, 500, 1000, 2000, 5000, 10000] as readonly number[],

  // Dragon coins (earned per run)
  COINS_PER_100_SCORE: 1,

  // Upgrade costs
  UPGRADE_COSTS: {
    extraStartLength: [50, 100, 200],
    longerFire: [80, 160],
    fasterLunge: [60, 120],
    thickerShield: [150],
  } as Record<string, number[]>,

  // Letter grades
  GRADE_THRESHOLDS: [
    { min: 5000, grade: "S", color: 0xffd700 },
    { min: 2000, grade: "A", color: 0x44ff44 },
    { min: 1000, grade: "B", color: 0x4488ff },
    { min: 500,  grade: "C", color: 0xcccccc },
    { min: 200,  grade: "D", color: 0xaa8866 },
  ],

  SHAKE_DURATION: 0.25, SHAKE_INTENSITY: 6, FLASH_DURATION: 0.2,

  COLOR_BG: 0x1a1a2e, COLOR_BG_GRASS_1: 0x1c2a1c, COLOR_BG_GRASS_2: 0x1a2e1a, COLOR_BG_GRASS_3: 0x223322,
  COLOR_GRID: 0x16213e,
  COLOR_WYRM_HEAD: 0xc9a227, COLOR_WYRM_BODY: 0x6b8e23, COLOR_WYRM_BODY_ALT: 0x556b2f,
  COLOR_WYRM_FIRE: 0xff6600,
  COLOR_WALL: 0x4a3728, COLOR_WALL_HIGHLIGHT: 0x5a4838,
  COLOR_SHEEP: 0xf5f5dc, COLOR_GOLDEN_SHEEP: 0xffd700,
  COLOR_KNIGHT: 0xc0c0c0, COLOR_KNIGHT_ROAM: 0x8888cc, COLOR_KNIGHT_CHASE: 0xcc4444,
  COLOR_BOSS: 0xaa2266, COLOR_TREASURE: 0xffd700,
  COLOR_POTION: 0x00ccff, COLOR_FIRE_SCROLL: 0xff4400,
  COLOR_SHIELD: 0x44aaff, COLOR_PORTAL: 0xaa44ff,
  COLOR_COMBO: 0xff44ff, COLOR_DANGER: 0xff2222,
  COLOR_TRAIL: 0x3a5a1a, COLOR_MILESTONE: 0xffdd44,
  COLOR_LUNGE: 0xffaa00, COLOR_COIN: 0xeebb33,

  PARTICLE_COUNT_EAT: 10, PARTICLE_COUNT_FIRE: 5, PARTICLE_COUNT_DEATH: 24,
  PARTICLE_COUNT_SHIELD_BREAK: 16, PARTICLE_COUNT_PORTAL: 14,
  PARTICLE_COUNT_BOSS_HIT: 12, PARTICLE_COUNT_BOSS_KILL: 30,
  PARTICLE_COUNT_LUNGE: 8,
  PARTICLE_LIFETIME: 0.7, GRASS_DENSITY: 15,
  MINIMAP_SIZE: 100, MINIMAP_MARGIN: 10,
} as const;

export const WYRM_COLOR_TIERS: { minLength: number; colors: WyrmColors }[] = [
  { minLength: 0,   colors: { head: 0xc9a227, body: 0x6b8e23, bodyAlt: 0x556b2f, name: "Hatchling" } },
  { minLength: 15,  colors: { head: 0xddaa22, body: 0x8aaa33, bodyAlt: 0x6a8a28, name: "Drake" } },
  { minLength: 30,  colors: { head: 0xff6633, body: 0xcc4422, bodyAlt: 0xaa3318, name: "Fire Drake" } },
  { minLength: 50,  colors: { head: 0xcc44ff, body: 0x8833cc, bodyAlt: 0x6622aa, name: "Elder Wyrm" } },
  { minLength: 75,  colors: { head: 0xffd700, body: 0xdaa520, bodyAlt: 0xb8860b, name: "Ancient Wyrm" } },
  { minLength: 100, colors: { head: 0xff2244, body: 0xcc1133, bodyAlt: 0xaa0022, name: "Wyrm Lord" } },
];

export function getWyrmColors(length: number): WyrmColors {
  let tier = WYRM_COLOR_TIERS[0].colors;
  for (const t of WYRM_COLOR_TIERS) { if (length >= t.minLength) tier = t.colors; }
  return tier;
}

export function getWyrmTierIndex(length: number): number {
  let idx = 0;
  for (let i = 0; i < WYRM_COLOR_TIERS.length; i++) { if (length >= WYRM_COLOR_TIERS[i].minLength) idx = i; }
  return idx;
}

export function getLetterGrade(score: number): { grade: string; color: number } {
  for (const t of WYRM_BALANCE.GRADE_THRESHOLDS) { if (score >= t.min) return t; }
  return { grade: "F", color: 0x886644 };
}
