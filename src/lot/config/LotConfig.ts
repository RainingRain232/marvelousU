// ---------------------------------------------------------------------------
// LOT: Fate's Gambit — balance & world constants
// ---------------------------------------------------------------------------

export const LOT = {
  // ---- Simulation ----
  SIM_TICK_MS: 16.667,

  // ---- Arena ----
  ARENA_RADIUS: 40,
  ARENA_WALL_HEIGHT: 8,
  ARENA_FLOOR_Y: 0,
  PILLAR_COUNT: 8,
  PILLAR_HEIGHT: 12,
  PILLAR_RADIUS: 1.2,

  // ---- Player ----
  MAX_HP: 100,
  MOVE_SPEED: 10.0,
  SPRINT_SPEED: 16.0,
  DODGE_SPEED: 25.0,
  DODGE_DURATION: 0.25,
  DODGE_COOLDOWN: 1.0,
  DODGE_IFRAMES: 0.2,
  TURN_SPEED: 4.0,
  GRAVITY: -22.0,
  JUMP_FORCE: 12.0,
  HP_REGEN: 1.5,
  STAMINA_MAX: 100,
  STAMINA_SPRINT_DRAIN: 18.0,
  STAMINA_DODGE_COST: 25,
  STAMINA_REGEN: 20.0,
  ATTACK_DAMAGE: 18,
  ATTACK_RANGE: 3.0,
  ATTACK_COOLDOWN: 0.45,
  HEAVY_DAMAGE: 40,
  HEAVY_RANGE: 3.5,
  HEAVY_COOLDOWN: 1.2,
  HEAVY_CHARGE_TIME: 0.6,
  SHIELD_BLOCK_REDUCTION: 0.7,
  SHIELD_STAMINA_COST: 12,

  // ---- Fortune ----
  STARTING_FORTUNE: 3,
  MAX_FORTUNE: 5,
  REROLL_COST: 1,
  FORTUNE_PER_FLAWLESS: 1,
  FORTUNE_RARE_DROP_CHANCE: 0.15,

  // ---- Lot Types ----
  LOT_TYPES: ["monster_wave", "obstacle_gauntlet", "treasure_hunt", "boss_fight", "cursed_arena", "fate_duel"] as const,
  LOT_WEIGHTS: { monster_wave: 30, obstacle_gauntlet: 20, treasure_hunt: 15, boss_fight: 10, cursed_arena: 15, fate_duel: 10 },

  // ---- Enemies ----
  SKELETON_HP: 40,
  SKELETON_DAMAGE: 8,
  SKELETON_SPEED: 5.0,
  SKELETON_ATTACK_RANGE: 2.5,
  SKELETON_ATTACK_CD: 1.0,

  WRAITH_HP: 25,
  WRAITH_DAMAGE: 12,
  WRAITH_SPEED: 7.0,
  WRAITH_TELEPORT_CD: 4.0,
  WRAITH_ATTACK_RANGE: 2.0,

  GOLEM_HP: 120,
  GOLEM_DAMAGE: 25,
  GOLEM_SPEED: 3.0,
  GOLEM_ATTACK_RANGE: 3.5,
  GOLEM_ATTACK_CD: 2.0,
  GOLEM_SLAM_RADIUS: 5.0,

  // Skeleton Archer
  ARCHER_HP: 30,
  ARCHER_DAMAGE: 10,
  ARCHER_SPEED: 4.0,
  ARCHER_RANGE: 18.0,
  ARCHER_FIRE_CD: 2.5,
  ARCHER_PROJECTILE_SPEED: 20.0,

  // Necromancer
  NECRO_HP: 50,
  NECRO_DAMAGE: 6,
  NECRO_SPEED: 3.5,
  NECRO_RANGE: 20.0,
  NECRO_RESURRECT_CD: 8.0,
  NECRO_RESURRECT_RANGE: 12.0,

  // Pillar destruction
  PILLAR_HP: 80,
  PILLAR_BREAK_DAMAGE_RADIUS: 5.0,
  PILLAR_BREAK_DAMAGE: 30,

  // Boss
  BOSS_HP_BASE: 180,
  BOSS_HP_PER_ROUND: 25,
  BOSS_DAMAGE: 30,
  BOSS_SPEED: 4.5,
  BOSS_ATTACK_CD: 1.5,
  BOSS_SLAM_CD: 8.0,
  BOSS_SLAM_RADIUS: 8.0,
  BOSS_SLAM_DAMAGE: 45,
  BOSS_CHARGE_SPEED: 18.0,
  BOSS_CHARGE_CD: 12.0,
  BOSS_CHARGE_DAMAGE: 35,

  // ---- Obstacles ----
  SPIKE_TRAP_DAMAGE: 15,
  SPIKE_TRAP_CD: 2.0,
  FIRE_PILLAR_DAMAGE: 8,
  FIRE_PILLAR_RADIUS: 3.0,
  PENDULUM_DAMAGE: 20,
  PENDULUM_SPEED: 2.5,

  // ---- Treasure ----
  TREASURE_COUNT: 5,
  TREASURE_TIME_LIMIT: 40,
  TREASURE_HEAL: 20,
  TREASURE_FORTUNE_CHANCE: 0.2,

  // ---- Cursed Arena ----
  CURSE_SHRINK_RATE: 1.0,
  CURSE_DAMAGE_OUTSIDE: 10,
  CURSE_MIN_RADIUS: 12,

  // ---- Fate Duel ----
  DUEL_CHAMPION_HP_BASE: 80,
  DUEL_CHAMPION_HP_PER_ROUND: 20,
  DUEL_CHAMPION_DAMAGE: 15,
  DUEL_CHAMPION_SPEED: 8.0,
  CHAMPION_PARRY_CHANCE: 0.15,
  CHAMPION_PARRY_DURATION: 1.2,

  // ---- Obstacle Gauntlet ----
  GAUNTLET_BASE_TIME: 30,
  GAUNTLET_TIME_PER_ROUND: 2,

  // ---- Phases ----
  DRAW_PHASE_DURATION: 4.0,
  BUFF_SELECT_DURATION: 15.0,
  INTERMISSION_DURATION: 8.0,
  VICTORY_DELAY: 2.0,

  // ---- Mutations ----
  MUTATION_START_ROUND: 3,
  RUNIC_EXPLOSION_CD: 5.0,
  RUNIC_EXPLOSION_RADIUS: 4.0,
  RUNIC_EXPLOSION_DAMAGE: 20,
  RUNIC_WARN_TIME: 2.0,
  FROZEN_DRAG: 0.98,
  BLOOD_MOON_ENEMY_MULT: 1.3,
  BLOOD_MOON_SCORE_MULT: 1.5,
  FOG_DENSITY: 0.06,

  // ---- Scaling ----
  ENEMY_HP_SCALE: 0.12,
  ENEMY_DAMAGE_SCALE: 0.08,
  ENEMY_COUNT_SCALE: 0.15,
  WAVE_BASE_COUNT: 4,
  WAVE_COUNT_PER_ROUND: 1.5,

  // ---- Abilities ----
  WHIRLWIND_CD: 8.0,
  WHIRLWIND_DURATION: 0.8,
  WHIRLWIND_RADIUS: 5.0,
  WHIRLWIND_DAMAGE: 25,
  WHIRLWIND_STAMINA: 30,

  DASH_STRIKE_CD: 5.0,
  DASH_STRIKE_DISTANCE: 10.0,
  DASH_STRIKE_SPEED: 40.0,
  DASH_STRIKE_DAMAGE: 30,
  DASH_STRIKE_RADIUS: 3.0,
  DASH_STRIKE_STAMINA: 20,

  REFLECT_CD: 10.0,
  REFLECT_DURATION: 1.5,
  REFLECT_STAMINA: 15,

  // ---- Elite enemies ----
  ELITE_CHANCE: 0.12,
  ELITE_HP_MULT: 2.0,
  ELITE_DAMAGE_MULT: 1.3,
  ELITE_SCORE_MULT: 3,

  // ---- Combo ----
  COMBO_DAMAGE_BONUS: 0.04, // +4% per combo, capped
  COMBO_MAX_BONUS: 0.6,     // +60% max

  // ---- Camera ----
  CAMERA_DISTANCE: 18,
  CAMERA_HEIGHT: 12,
  CAMERA_LERP: 6.0,
  CAMERA_ORBIT_SPEED: 2.0,
} as const;

export type LotType = (typeof LOT.LOT_TYPES)[number];

export const LOT_DISPLAY: Record<LotType, { name: string; color: string; icon: string; desc: string }> = {
  monster_wave:      { name: "Monster Wave",      color: "#ff4444", icon: "☠", desc: "Slay all enemies to survive" },
  obstacle_gauntlet: { name: "Obstacle Gauntlet",  color: "#ff8800", icon: "⚡", desc: "Survive the deadly arena traps" },
  treasure_hunt:     { name: "Treasure Hunt",      color: "#ffdd00", icon: "✦", desc: "Collect all treasures before time runs out" },
  boss_fight:        { name: "Boss Fight",         color: "#cc00ff", icon: "👑", desc: "Defeat the champion of fate" },
  cursed_arena:      { name: "Cursed Arena",       color: "#00cccc", icon: "🌀", desc: "The arena shrinks — kill or be crushed" },
  fate_duel:         { name: "Fate Duel",          color: "#ffffff", icon: "⚔", desc: "1v1 duel against a fate champion" },
};

export type Difficulty = "easy" | "normal" | "hard" | "nightmare";

export const DIFFICULTY_MULT: Record<Difficulty, { hp: number; dmg: number; count: number; fortune: number }> = {
  easy:      { hp: 0.7, dmg: 0.6, count: 0.8, fortune: 1.3 },
  normal:    { hp: 1.0, dmg: 1.0, count: 1.0, fortune: 1.0 },
  hard:      { hp: 1.3, dmg: 1.3, count: 1.2, fortune: 0.8 },
  nightmare: { hp: 1.7, dmg: 1.6, count: 1.5, fortune: 0.6 },
};
