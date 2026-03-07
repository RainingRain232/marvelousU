// ---------------------------------------------------------------------------
// Survivor mode state
// ---------------------------------------------------------------------------

import type { Vec2 } from "@/types";
import { UnitType, MapType } from "@/types";
import type { SurvivorCharacterDef } from "../config/SurvivorCharacterDefs";
import { SurvivorWeaponId, SurvivorPassiveId, SurvivorEvolutionId } from "../config/SurvivorWeaponDefs";
import { SurvivorBalance } from "../config/SurvivorBalanceConfig";

// ---------------------------------------------------------------------------
// Sub-state interfaces
// ---------------------------------------------------------------------------

export interface SurvivorWeaponState {
  id: SurvivorWeaponId;
  level: number; // 1-based
  cooldownTimer: number; // seconds remaining until next fire
  evolved: boolean;
  evolutionId?: SurvivorEvolutionId;
}

export interface SurvivorPassiveState {
  id: SurvivorPassiveId;
  level: number; // 1-based
}

export interface SurvivorEnemy {
  id: number;
  type: UnitType;
  position: Vec2;
  hp: number;
  maxHp: number;
  atk: number;
  speed: number;
  tier: number;
  isBoss: boolean;
  alive: boolean;
  hitTimer: number; // visual hit flash timer
  slowFactor: number;
  slowTimer: number;
  deathTimer: number; // countdown after dying before removal
}

export interface SurvivorGem {
  id: number;
  position: Vec2;
  value: number;
  tier: number; // 0-4, determines color
  alive: boolean;
}

export interface SurvivorProjectile {
  id: number;
  position: Vec2;
  velocity: Vec2;
  damage: number;
  area: number;
  pierce: number; // remaining pierce count
  lifetime: number; // seconds remaining
  weaponId: SurvivorWeaponId;
  hitEnemies: Set<number>; // enemy IDs already hit (for pierce tracking)
}

export interface SurvivorPlayer {
  position: Vec2;
  hp: number;
  maxHp: number;
  atk: number;
  speed: number;
  pickupRadius: number;
  magnetRadius: number;
  critChance: number;
  xpMultiplier: number;
  areaMultiplier: number;
  attackSpeedMultiplier: number;
  regenRate: number;
  invincibilityTimer: number;
  characterDef: SurvivorCharacterDef;
}

// ---------------------------------------------------------------------------
// Main state
// ---------------------------------------------------------------------------

export interface SurvivorState {
  // Player
  player: SurvivorPlayer;

  // Weapons & passives
  weapons: SurvivorWeaponState[];
  passives: SurvivorPassiveState[];

  // Entities
  enemies: SurvivorEnemy[];
  gems: SurvivorGem[];
  projectiles: SurvivorProjectile[];

  // Progression
  xp: number;
  level: number;
  xpToNext: number;
  totalKills: number;
  totalDamageDealt: number;

  // Timing
  gameTime: number; // seconds elapsed
  spawnAccumulator: number; // fractional enemy spawns
  bossTimer: number; // seconds until next boss
  nextBossIndex: number;

  // Map
  mapWidth: number;
  mapHeight: number;
  mapType: MapType;

  // Flow
  paused: boolean;
  levelUpPending: boolean; // true while level-up screen is shown
  gameOver: boolean;

  // Counters for ID generation
  nextEnemyId: number;
  nextGemId: number;
  nextProjectileId: number;

  // Input state
  input: {
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;
  };

  // Meta
  gold: number; // earned this run
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createSurvivorState(charDef: SurvivorCharacterDef, mapType: MapType, mapWidth: number, mapHeight: number): SurvivorState {
  const baseHp = SurvivorBalance.PLAYER_BASE_HP + charDef.hpBonus;
  const baseSpeed = SurvivorBalance.PLAYER_SPEED * (1 + charDef.speedBonus);

  return {
    player: {
      position: { x: mapWidth / 2, y: mapHeight / 2 },
      hp: baseHp,
      maxHp: baseHp,
      atk: SurvivorBalance.PLAYER_BASE_ATK,
      speed: baseSpeed,
      pickupRadius: SurvivorBalance.PLAYER_PICKUP_RADIUS,
      magnetRadius: SurvivorBalance.PLAYER_MAGNET_RADIUS,
      critChance: 0.05 + charDef.critBonus,
      xpMultiplier: 1.0,
      areaMultiplier: 1.0 + charDef.areaBonus,
      attackSpeedMultiplier: 1.0,
      regenRate: charDef.regenBonus,
      invincibilityTimer: 0,
      characterDef: charDef,
    },
    weapons: [{
      id: charDef.startingWeapon,
      level: 1,
      cooldownTimer: 0,
      evolved: false,
    }],
    passives: charDef.passiveBonus
      ? [{ id: charDef.passiveBonus, level: 1 }]
      : [],
    enemies: [],
    gems: [],
    projectiles: [],
    xp: 0,
    level: 1,
    xpToNext: SurvivorBalance.XP_BASE,
    totalKills: 0,
    totalDamageDealt: 0,
    gameTime: 0,
    spawnAccumulator: 0,
    bossTimer: SurvivorBalance.BOSS_INTERVAL,
    nextBossIndex: 0,
    mapWidth,
    mapHeight,
    mapType,
    paused: false,
    levelUpPending: false,
    gameOver: false,
    nextEnemyId: 1,
    nextGemId: 1,
    nextProjectileId: 1,
    input: { left: false, right: false, up: false, down: false },
    gold: 0,
  };
}
