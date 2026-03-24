// ---------------------------------------------------------------------------
// Conjurer — Balance constants
// ---------------------------------------------------------------------------

import { SpellElement, EnemyType } from "../types";

export const CONJURER_BALANCE = {
  // Arena
  ARENA_PADDING: 40,

  // Player
  PLAYER_SPEED: 200,
  PLAYER_RADIUS: 10,
  PLAYER_HP: 7,
  PLAYER_MAX_MANA: 100,
  PLAYER_MANA_REGEN: 2,          // per second
  PLAYER_INVINCIBLE: 1.5,
  PLAYER_MAGNET_RADIUS: 80,      // auto-collect mana crystals

  // Spells
  SPELL_COSTS: {
    [SpellElement.FIRE]: 15,
    [SpellElement.ICE]: 12,
    [SpellElement.LIGHTNING]: 18,
    [SpellElement.VOID]: 25,
  } as Record<SpellElement, number>,

  SPELL_COOLDOWNS: {
    [SpellElement.FIRE]: 0.4,
    [SpellElement.ICE]: 0.3,
    [SpellElement.LIGHTNING]: 0.6,
    [SpellElement.VOID]: 1.2,
  } as Record<SpellElement, number>,

  // Fire: expanding ring
  FIRE_DAMAGE: 2,
  FIRE_RADIUS: 120,
  FIRE_DURATION: 0.5,
  FIRE_SPEED: 300,

  // Ice: cone of shards
  ICE_DAMAGE: 2,
  ICE_SHARD_COUNT: 7,
  ICE_SHARD_SPEED: 400,
  ICE_SPREAD: 0.5,               // radians half-angle
  ICE_SHARD_LIFE: 0.8,
  ICE_SLOW_FACTOR: 0.4,
  ICE_SLOW_DURATION: 2.0,

  // Lightning: chain bolt
  LIGHTNING_DAMAGE: 3,
  LIGHTNING_CHAIN_RANGE: 100,
  LIGHTNING_CHAINS: 4,
  LIGHTNING_BOLT_SPEED: 600,
  LIGHTNING_BOLT_LIFE: 0.6,

  // Void: gravity pull + damage
  VOID_DAMAGE: 4,
  VOID_RADIUS: 140,
  VOID_DURATION: 1.5,
  VOID_PULL_STRENGTH: 150,

  // Enemies
  ENEMY_DEFS: {
    [EnemyType.THRALL]:    { hp: 2,  speed: 80,  radius: 8,  color: 0x66aa44, score: 10 },
    [EnemyType.ARCHER]:    { hp: 2,  speed: 50,  radius: 8,  color: 0xaa8833, score: 15 },
    [EnemyType.KNIGHT]:    { hp: 6,  speed: 60,  radius: 12, color: 0x8888cc, score: 25 },
    [EnemyType.WRAITH]:    { hp: 3,  speed: 130, radius: 9,  color: 0xaa44cc, score: 20 },
    [EnemyType.GOLEM]:     { hp: 20, speed: 35,  radius: 18, color: 0x887755, score: 50 },
    [EnemyType.SORCERER]:  { hp: 4,  speed: 60,  radius: 10, color: 0xcc44aa, score: 30 },
  } as Record<EnemyType, { hp: number; speed: number; radius: number; color: number; score: number }>,

  ARCHER_ATTACK_INTERVAL: 2.0,
  ARCHER_PROJECTILE_SPEED: 200,
  ARCHER_STOP_RANGE: 180,
  SORCERER_TELEPORT_INTERVAL: 4.0,
  SORCERER_ATTACK_INTERVAL: 1.5,
  SORCERER_ORB_SPEED: 120,
  WRAITH_PHASE_INTERVAL: 3.0,
  WRAITH_PHASE_DURATION: 0.8,

  // Waves
  ENEMIES_BASE: 5,
  ENEMIES_PER_WAVE: 3,
  WAVE_SPAWN_INTERVAL: 0.6,
  WAVE_CLEAR_PAUSE: 2.0,
  BOSS_WAVE_INTERVAL: 5,
  BOSS_HP_MULT: 5,
  BOSS_SIZE_MULT: 2.5,
  MAX_WAVE: 30,                  // victory at wave 30

  // Mana crystals
  CRYSTAL_VALUE: 5,
  CRYSTAL_LIFE: 8,
  CRYSTAL_DROP_CHANCE: 0.6,
  CRYSTAL_SPEED: 300,             // when magnetized

  // Dodge
  DODGE_SPEED: 600,
  DODGE_DURATION: 0.15,
  DODGE_COOLDOWN: 0.8,

  // Ultimate
  ULTIMATE_COST: 100,
  ULTIMATE_DURATION: 1.5,
  ULTIMATE_DAMAGE: 8,
  ULTIMATE_RADIUS: 250,
  ULTIMATE_CHARGE_PER_KILL: 4,

  // Hazard zone
  HAZARD_START_WAVE: 8,
  HAZARD_DAMAGE: 1,
  HAZARD_WIDTH: 30,
  HAZARD_ROTATION_SPEED: 0.8,

  // Spawn warning
  SPAWN_WARNING_TIME: 0.6,

  // Passive aura (element-specific)
  AURA_TICK_INTERVAL: 0.5,
  AURA_RADIUS: 50,
  AURA_FIRE_DAMAGE: 1,
  AURA_ICE_SLOW: 0.6,
  AURA_LIGHTNING_CHAIN_CHANCE: 0.15,
  AURA_VOID_PULL: 40,

  // Sorcerer (buffed)
  SORCERER_ORB_SPEED_V2: 180,

  // Magnet
  PLAYER_MAGNET_RADIUS_V2: 110,

  // Combo
  COMBO_WINDOW: 2.0,
  COMBO_MULT_CAP: 10,

  // Arcane shards
  SHARDS_PER_WAVE: 2,
  SHARDS_PER_BOSS: 5,

  // Upgrade costs
  UPGRADE_COSTS: {
    maxHp:       [15, 35, 60],
    manaRegen:   [10, 25, 50],
    auraRange:   [20, 45],
    magnetRange: [12, 30],
    dodgeSpeed:  [15, 35],
  } as Record<string, number[]>,

  // Score
  SCORE_PER_SECOND: 1,

  // Visual
  SHAKE_DURATION: 0.2,
  SHAKE_INTENSITY: 4,
  FLASH_DURATION: 0.15,
  PARTICLE_LIFETIME: 0.9,

  // Colors
  COLOR_BG: 0x0a0a18,
  COLOR_ARENA_BORDER: 0x1a1a3e,
  COLOR_ARENA_GRID: 0x111128,
  COLOR_PLAYER: 0x44bbff,
  COLOR_PLAYER_GLOW: 0x2288cc,
  COLOR_FIRE: 0xff4422,
  COLOR_FIRE_GLOW: 0xff8844,
  COLOR_ICE: 0x44ccff,
  COLOR_ICE_GLOW: 0x88eeff,
  COLOR_LIGHTNING: 0xffff44,
  COLOR_LIGHTNING_GLOW: 0xffffaa,
  COLOR_VOID: 0xaa44ff,
  COLOR_VOID_GLOW: 0xcc88ff,
  COLOR_MANA: 0x66aaff,
  COLOR_MANA_GLOW: 0x88ccff,
  COLOR_ENEMY_PROJ: 0xff6644,
  COLOR_HP: 0xff4444,
  COLOR_COMBO: 0xffaa44,
  COLOR_TEXT: 0xccccee,
  COLOR_GOLD: 0xffd700,
  COLOR_DANGER: 0xff2222,
  COLOR_SUCCESS: 0x44ff88,
} as const;

export const ELEMENT_COLORS: Record<SpellElement, { main: number; glow: number }> = {
  [SpellElement.FIRE]:      { main: 0xff4422, glow: 0xff8844 },
  [SpellElement.ICE]:       { main: 0x44ccff, glow: 0x88eeff },
  [SpellElement.LIGHTNING]: { main: 0xffff44, glow: 0xffffaa },
  [SpellElement.VOID]:      { main: 0xaa44ff, glow: 0xcc88ff },
};
