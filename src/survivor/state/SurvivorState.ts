// ---------------------------------------------------------------------------
// Survivor mode state
// ---------------------------------------------------------------------------

import type { Vec2 } from "@/types";
import { UnitType, MapType } from "@/types";
import type { SurvivorCharacterDef } from "../config/SurvivorCharacterDefs";
import { SurvivorWeaponId, SurvivorPassiveId, SurvivorEvolutionId } from "../config/SurvivorWeaponDefs";
import { SurvivorBalance } from "../config/SurvivorBalanceConfig";
import type { EliteType } from "../config/SurvivorEliteDefs";
import type { SurvivorArcanaDef } from "../config/SurvivorArcanaDefs";
import { SurvivorPersistence } from "./SurvivorPersistence";
import { META_UPGRADES } from "../config/SurvivorMetaUpgradeDefs";

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
  // Elite
  eliteType: EliteType | null;
  eliteTimer: number; // cooldown for elite ability
  // Charger state
  chargeTimer: number; // remaining charge duration
  chargeDirX: number;
  chargeDirY: number;
  // Death boss flag
  isDeathBoss: boolean;
  // Display name (Arthurian themed for bosses/elites)
  displayName: string | null;
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

export interface SurvivorEnemyProjectile {
  id: number;
  position: Vec2;
  velocity: Vec2;
  damage: number;
  lifetime: number;
}

export interface SurvivorChest {
  id: number;
  position: Vec2;
  alive: boolean;
  type: "gold" | "heal" | "bomb" | "arcana";
  value: number;
}

export type LandmarkType = "sword_stone" | "chapel" | "archive";
export type TempLandmarkType = "faction_hall" | "blacksmith" | "stable";

export interface SurvivorLandmark {
  id: string;
  type: LandmarkType;
  position: Vec2;
  radius: number; // buff aura radius in tiles
  buffType: string; // key checked by systems
  name: string; // display name
}

export interface SurvivorTempLandmark {
  id: number;
  type: TempLandmarkType;
  position: Vec2;
  radius: number;
  buffType: string;
  name: string;
  remaining: number; // seconds until despawn
  duration: number; // total duration (for fade calc)
}

export interface SurvivorHazard {
  id: number;
  type: "lava" | "ice" | "thorns" | "fog";
  position: Vec2;
  radius: number;
  damage: number; // per second
  slowFactor: number; // 1 = normal, <1 = slow
  speedBonus: number; // added to speed (ice patches)
}

export interface SurvivorTimedEvent {
  id: string;
  name: string;
  duration: number; // total duration
  remaining: number; // time remaining
  spawnRateMultiplier: number;
  enemySpeedMultiplier: number;
  xpMultiplier: number;
  color: number; // banner color
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
  dashCooldownTimer: number;
  dashTimer: number;
  dashDirX: number;
  dashDirY: number;
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
  enemyProjectiles: SurvivorEnemyProjectile[];
  chests: SurvivorChest[];

  // Landmarks
  landmarks: SurvivorLandmark[];
  tempLandmarks: SurvivorTempLandmark[];
  tempLandmarkCooldown: number; // seconds until next temp landmark spawns
  nextTempLandmarkId: number;
  activeLandmarkBuffs: Set<string>;

  // Hazards & events
  hazards: SurvivorHazard[];
  activeEvent: SurvivorTimedEvent | null;
  eventCooldown: number; // seconds until next event can trigger

  // Arcana
  arcana: SurvivorArcanaDef[];

  // Synergies
  activeSynergies: string[];

  // Progression
  xp: number;
  level: number;
  xpToNext: number;
  totalKills: number;
  totalDamageDealt: number;
  weaponDamageDealt: Record<string, number>; // weapon ID -> total damage

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
  victory: boolean;
  deathBossSpawned: boolean;

  // Counters for ID generation
  nextEnemyId: number;
  nextGemId: number;
  nextProjectileId: number;
  nextChestId: number;
  nextHazardId: number;
  nextEnemyProjId: number;

  // Input state
  input: {
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;
  };

  // Meta
  gold: number; // earned this run
  goldMultiplier: number;

  // Difficulty
  difficulty: SurvivorDifficulty;
}

// ---------------------------------------------------------------------------
// Difficulty settings
// ---------------------------------------------------------------------------

export type SurvivorDifficulty = "easy" | "normal" | "hard" | "nightmare";

export interface DifficultyModifiers {
  spawnRateMultiplier: number;
  enemyHpMultiplier: number;
  enemyAtkMultiplier: number;
  enemySpeedMultiplier: number;
  xpMultiplier: number;
  goldMultiplier: number;
  label: string;
  color: number;
}

export const DIFFICULTY_SETTINGS: Record<SurvivorDifficulty, DifficultyModifiers> = {
  easy: { spawnRateMultiplier: 0.6, enemyHpMultiplier: 0.7, enemyAtkMultiplier: 0.6, enemySpeedMultiplier: 0.9, xpMultiplier: 0.8, goldMultiplier: 0.7, label: "Easy", color: 0x44cc44 },
  normal: { spawnRateMultiplier: 1.0, enemyHpMultiplier: 1.0, enemyAtkMultiplier: 1.0, enemySpeedMultiplier: 1.0, xpMultiplier: 1.0, goldMultiplier: 1.0, label: "Normal", color: 0xffffff },
  hard: { spawnRateMultiplier: 1.5, enemyHpMultiplier: 1.5, enemyAtkMultiplier: 1.4, enemySpeedMultiplier: 1.15, xpMultiplier: 1.3, goldMultiplier: 1.5, label: "Hard", color: 0xff8844 },
  nightmare: { spawnRateMultiplier: 2.2, enemyHpMultiplier: 2.5, enemyAtkMultiplier: 2.0, enemySpeedMultiplier: 1.3, xpMultiplier: 1.6, goldMultiplier: 2.5, label: "Nightmare", color: 0xff2222 },
};

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

function _generateLandmarks(mapW: number, mapH: number): SurvivorLandmark[] {
  const cx = mapW / 2;
  const cy = mapH / 2;
  const r = Math.min(mapW, mapH) * 0.3; // 30% of map half-size from center

  // Place in equilateral triangle around center
  return [
    {
      id: "sword_stone",
      type: "sword_stone",
      position: { x: cx + r * Math.cos(-Math.PI / 2), y: cy + r * Math.sin(-Math.PI / 2) }, // top
      radius: 5,
      buffType: "sword_stone",
      name: "Excalibur's Blessing",
    },
    {
      id: "chapel",
      type: "chapel",
      position: { x: cx + r * Math.cos(Math.PI / 6), y: cy + r * Math.sin(Math.PI / 6) }, // bottom-right
      radius: 5,
      buffType: "chapel",
      name: "Lady's Grace",
    },
    {
      id: "archive",
      type: "archive",
      position: { x: cx + r * Math.cos(5 * Math.PI / 6), y: cy + r * Math.sin(5 * Math.PI / 6) }, // bottom-left
      radius: 5,
      buffType: "archive",
      name: "Merlin's Wisdom",
    },
  ];
}

export function createSurvivorState(charDef: SurvivorCharacterDef, mapType: MapType, mapWidth: number, mapHeight: number, difficulty: SurvivorDifficulty = "normal"): SurvivorState {
  // Apply meta upgrades from persistence
  const metaLevels = SurvivorPersistence.getMetaUpgrades();
  let metaHpBonus = 0;
  let metaSpeedBonus = 0;
  let metaAtkBonus = 0;
  let metaXpBonus = 0;
  let metaPickupBonus = 0;
  let metaGoldMult = 1.0;

  for (const upgrade of META_UPGRADES) {
    const level = metaLevels[upgrade.id] ?? 0;
    if (level <= 0) continue;
    const value = upgrade.valuePerLevel * level;
    switch (upgrade.stat) {
      case "hp": metaHpBonus += value; break;
      case "speed": metaSpeedBonus += value; break;
      case "atk": metaAtkBonus += value; break;
      case "xpMult": metaXpBonus += value; break;
      case "pickupRadius": metaPickupBonus += value; break;
      case "goldMult": metaGoldMult += value; break;
    }
  }

  const baseHp = SurvivorBalance.PLAYER_BASE_HP + charDef.hpBonus + metaHpBonus;
  const baseSpeed = SurvivorBalance.PLAYER_SPEED * (1 + charDef.speedBonus + metaSpeedBonus);

  return {
    player: {
      position: { x: mapWidth / 2, y: mapHeight / 2 },
      hp: baseHp,
      maxHp: baseHp,
      atk: SurvivorBalance.PLAYER_BASE_ATK * (1 + metaAtkBonus),
      speed: baseSpeed,
      pickupRadius: SurvivorBalance.PLAYER_PICKUP_RADIUS + metaPickupBonus,
      magnetRadius: SurvivorBalance.PLAYER_MAGNET_RADIUS,
      critChance: 0.05 + charDef.critBonus,
      xpMultiplier: 1.0 + metaXpBonus,
      areaMultiplier: 1.0 + charDef.areaBonus,
      attackSpeedMultiplier: 1.0,
      regenRate: charDef.regenBonus,
      invincibilityTimer: 0,
      dashCooldownTimer: 0,
      dashTimer: 0,
      dashDirX: 0,
      dashDirY: 0,
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
    enemyProjectiles: [],
    chests: [],
    landmarks: _generateLandmarks(mapWidth, mapHeight),
    tempLandmarks: [],
    tempLandmarkCooldown: 60, // first temp landmark after 1 minute
    nextTempLandmarkId: 1,
    activeLandmarkBuffs: new Set(),
    hazards: [],
    activeEvent: null,
    eventCooldown: 180, // first event after 3 minutes
    arcana: [],
    activeSynergies: [],
    xp: 0,
    level: 1,
    xpToNext: SurvivorBalance.XP_BASE,
    totalKills: 0,
    totalDamageDealt: 0,
    weaponDamageDealt: {},
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
    victory: false,
    deathBossSpawned: false,
    nextEnemyId: 1,
    nextGemId: 1,
    nextProjectileId: 1,
    nextChestId: 1,
    nextHazardId: 1,
    nextEnemyProjId: 1,
    input: { left: false, right: false, up: false, down: false },
    gold: 0,
    goldMultiplier: metaGoldMult * (DIFFICULTY_SETTINGS[difficulty]?.goldMultiplier ?? 1),
    difficulty,
  };
}
