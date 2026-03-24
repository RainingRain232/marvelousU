// ---------------------------------------------------------------------------
// Flux — Balance constants
// ---------------------------------------------------------------------------

import { EnemyType } from "../types";

export const FLUX_BALANCE = {
  ARENA_PADDING: 40,

  // Player (momentum-based floaty movement)
  PLAYER_ACCEL: 600,
  PLAYER_MAX_SPEED: 250,
  PLAYER_FRICTION: 3.0,       // velocity decay rate
  PLAYER_RADIUS: 10,
  PLAYER_HP: 5,
  PLAYER_INVINCIBLE: 1.5,

  // Gravity wells
  WELL_STRENGTH: 500,
  WELL_RADIUS: 150,
  WELL_DURATION: 4.5,
  WELL_MAX_CHARGES: 3,
  WELL_RECHARGE_TIME: 2.5,
  WELL_PLACE_RANGE: 120,      // max distance from player to place well

  // Slingshot dash (toward nearest well)
  DASH_SPEED: 500,
  DASH_COOLDOWN: 1.5,
  DASH_INVINCIBLE: 0.3,

  // Physics
  COLLISION_DAMAGE_SPEED: 60,   // min relative speed for collision damage (lowered for more crashes)
  COLLISION_DAMAGE_MULT: 0.03,  // damage = relative_speed * mult (increased)
  WALL_BOUNCE: 0.5,             // velocity retained on wall bounce
  ENEMY_ENEMY_BOUNCE: 0.6,

  // Enemy definitions
  ENEMY_DEFS: {
    [EnemyType.DRONE]:   { hp: 3,  speed: 70,  radius: 10, mass: 1.0, color: 0x55cc55, score: 10 },
    [EnemyType.SHOOTER]: { hp: 3,  speed: 40,  radius: 10, mass: 1.0, color: 0xcc8833, score: 15 },
    [EnemyType.TANK]:    { hp: 12, speed: 25,  radius: 18, mass: 4.0, color: 0x7777bb, score: 30 },
    [EnemyType.SWARM]:   { hp: 1,  speed: 120, radius: 6,  mass: 0.3, color: 0xaacc33, score: 5 },
    [EnemyType.BOMBER]:  { hp: 2,  speed: 60,  radius: 11, mass: 0.8, color: 0xdd5533, score: 20 },
  } as Record<EnemyType, { hp: number; speed: number; radius: number; mass: number; color: number; score: number }>,

  SHOOTER_ATTACK_INTERVAL: 2.5,
  SHOOTER_PROJ_SPEED: 160,
  BOMBER_EXPLODE_RADIUS: 60,
  BOMBER_EXPLODE_DAMAGE: 3,

  // Waves
  ENEMIES_BASE: 4,
  ENEMIES_PER_WAVE: 2,
  WAVE_SPAWN_INTERVAL: 0.8,
  WAVE_CLEAR_PAUSE: 2.5,
  MAX_WAVE: 25,

  // Gravity Bomb (faster charging)
  GRAV_BOMB_COST: 60,
  GRAV_BOMB_CHARGE_PER_KILL: 6,
  GRAV_BOMB_RADIUS: 200,
  GRAV_BOMB_STRENGTH: 800,
  GRAV_BOMB_DURATION: 2.0,
  GRAV_BOMB_DAMAGE: 5,

  // Repulsor (push enemies away — opposite of well)
  REPULSOR_STRENGTH: 400,
  REPULSOR_RADIUS: 100,
  REPULSOR_DURATION: 1.5,
  REPULSOR_COOLDOWN: 4.0,

  // Spawn warnings
  SPAWN_WARNING_TIME: 0.7,
  SPAWN_DELAY: 0.4,            // delay after warning before enemy enters

  // Persistent upgrades
  SHARDS_PER_WAVE: 2,
  UPGRADE_COSTS: {
    maxHp:      [15, 40],
    wellPower:  [12, 30],
    extraCharge:[20, 50],
    bombCharge: [18, 40],
  } as Record<string, number[]>,

  // Combo
  COMBO_WINDOW: 3.0,

  // Score
  SCORE_PER_SECOND: 1,
  SCORE_REDIRECT_BONUS: 15,
  SCORE_COLLISION_BONUS: 20,

  // Visual
  SHAKE_DURATION: 0.2,
  SHAKE_INTENSITY: 4,
  FLASH_DURATION: 0.15,
  PARTICLE_LIFETIME: 0.8,

  // Colors
  COLOR_BG: 0x06061a,
  COLOR_ARENA_BORDER: 0x1a1a4e,
  COLOR_ARENA_GRID: 0x0e0e2e,
  COLOR_PLAYER: 0x8844ff,
  COLOR_PLAYER_GLOW: 0xaa66ff,
  COLOR_WELL: 0x6622cc,
  COLOR_WELL_RING: 0x8844ff,
  COLOR_WELL_CORE: 0xcc88ff,
  COLOR_REDIRECT: 0x44ffaa,
  COLOR_COLLISION: 0xffaa44,
  COLOR_ENEMY_PROJ: 0xff6644,
  COLOR_HP: 0xff4444,
  COLOR_TEXT: 0xccccee,
  COLOR_GOLD: 0xffd700,
  COLOR_DANGER: 0xff2222,
  COLOR_SUCCESS: 0x44ff88,
  COLOR_COMBO: 0xffaa44,
  COLOR_CHARGE: 0x8855dd,
} as const;
