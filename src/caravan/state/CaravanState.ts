// ---------------------------------------------------------------------------
// Caravan mode state
// ---------------------------------------------------------------------------

import type { Vec2 } from "@/types";
import { UnitType } from "@/types";
import { CaravanBalance } from "../config/CaravanBalanceConfig";
import type { TownDef, TradeGoodDef } from "../config/CaravanTradeDefs";
import { generateRoute } from "../config/CaravanTradeDefs";
import type { EscortDef } from "../config/CaravanEscortDefs";
import type { HeroClassDef, AbilityDef } from "../config/CaravanHeroDefs";

// ---------------------------------------------------------------------------
// Sub-state interfaces
// ---------------------------------------------------------------------------

export interface AbilityState {
  def: AbilityDef;
  cooldownTimer: number; // 0 = ready
}

export interface CaravanPlayer {
  position: Vec2;
  hp: number;
  maxHp: number;
  speed: number;
  atk: number;
  range: number;
  attackCooldown: number;
  attackTimer: number;
  invincibilityTimer: number;
  dashCooldownTimer: number;
  dashTimer: number;
  dashDirX: number;
  dashDirY: number;
  level: number;
  heroClass: HeroClassDef;
  abilities: AbilityState[];
  // Temporary buffs
  atkBuffTimer: number;
  atkBuffMult: number;
}

export interface CaravanWagon {
  position: Vec2;
  hp: number;
  maxHp: number;
  speed: number;
  baseSpeed: number;
}

export interface CaravanEscort {
  id: number;
  def: EscortDef;
  position: Vec2;
  hp: number;
  maxHp: number;
  atk: number;
  speed: number;
  range: number;
  attackTimer: number;
  attackCooldown: number;
  alive: boolean;
  targetId: number | null;
  hitTimer: number;
  atkBuffTimer: number;
  atkBuffMult: number;
}

export interface CaravanEnemy {
  id: number;
  defName: string;
  unitType: UnitType;
  position: Vec2;
  hp: number;
  maxHp: number;
  atk: number;
  speed: number;
  range: number;
  goldReward: number;
  alive: boolean;
  isBoss: boolean;
  targetType: "caravan" | "player" | "escort";
  targetId: number | null;
  hitTimer: number;
  attackTimer: number;
  attackCooldown: number;
  displayName: string;
  deathTimer: number;
  stunTimer: number;
}

export interface CaravanLoot {
  id: number;
  position: Vec2;
  value: number;
  alive: boolean;
  lifetime: number; // seconds remaining before despawn
}

export interface CargoSlot {
  good: TradeGoodDef;
  quantity: number;
  purchasePrice: number;
  spoilage?: number;
}

// ---------------------------------------------------------------------------
// Main state
// ---------------------------------------------------------------------------

export type CaravanPhase = "travel" | "town" | "relic_choice";

export interface CaravanState {
  player: CaravanPlayer;
  caravan: CaravanWagon;
  escorts: CaravanEscort[];
  enemies: CaravanEnemy[];
  loot: CaravanLoot[];

  // Cargo
  cargo: CargoSlot[];
  maxCargoSlots: number;

  // Economy
  gold: number;
  totalGoldEarned: number;
  totalTradeProfit: number;

  // Journey
  segment: number;
  totalSegments: number;
  segmentProgress: number;
  segmentLength: number;

  // Towns
  towns: TownDef[];

  // Phase
  phase: CaravanPhase;

  // Encounters
  encounterCooldown: number;
  encounterCount: number;
  bossIndex: number;
  bossActive: boolean;
  bossSpawnedThisSegment: boolean;

  // Road events
  roadEventFired: boolean;

  // Hold position
  holdPosition: boolean;

  // Sprint boost
  sprintTimer: number;      // active sprint remaining
  sprintCooldown: number;   // cooldown remaining

  // Kill streak
  killStreak: number;
  killStreakTimer: number;

  // Biome hazards
  hazards: { id: number; x: number; y: number; type: string; radius: number; lifetime: number }[];
  hazardSpawnTimer: number;
  parryTimer: number;      // active parry window
  parryCooldown: number;   // cooldown after parry

  // Time scale (fast-forward)
  timeScale: number; // 1 = normal, 2 = fast, 3 = faster

  // Defense stat
  defense: number; // flat damage reduction

  // Relics collected
  relicIds: string[];

  // Map
  mapWidth: number;
  mapHeight: number;

  // Timing
  gameTime: number;
  paused: boolean;
  gameOver: boolean;
  victory: boolean;
  resultsShown: boolean;
  defeatReason: "hero_died" | "caravan_destroyed" | "";

  // Input
  input: {
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;
  };

  // ID counters
  nextEnemyId: number;
  nextLootId: number;
  nextEscortId: number;

  // Stats
  totalKills: number;
  segmentsCompleted: number;

  // Screen
  screenW: number;
  screenH: number;

  // Difficulty
  difficulty: "normal" | "hard" | "endless";
  difficultyMult: number; // enemy stat multiplier (1.0 = normal, 1.5 = hard)
  ngPlusLevel: number;    // 0 = first run, 1+ = NG+

  // Tutorial tips (shown once per key)
  tipsShown: Set<string>;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createCaravanState(
  heroClass: HeroClassDef,
  difficulty: "normal" | "hard" | "endless" = "normal",
  ngPlusLevel = 0,
): CaravanState {
  const totalSegments = difficulty === "endless" ? 999 : CaravanBalance.TOTAL_SEGMENTS;
  const mapH = CaravanBalance.MAP_HEIGHT;
  const segLen = CaravanBalance.SEGMENT_LENGTH;
  const cy = CaravanBalance.CARAVAN_Y;
  const diffMult = difficulty === "hard" ? 1.5 : difficulty === "endless" ? 1.3 : 1.0;
  const ngMult = 1 + ngPlusLevel * 0.25;

  return {
    player: {
      position: { x: 4, y: cy },
      hp: heroClass.hp,
      maxHp: heroClass.hp,
      speed: heroClass.speed,
      atk: heroClass.atk,
      range: heroClass.range,
      attackCooldown: heroClass.attackCooldown,
      attackTimer: 0,
      invincibilityTimer: 0,
      dashCooldownTimer: 0,
      dashTimer: 0,
      dashDirX: 1,
      dashDirY: 0,
      level: 1,
      heroClass,
      abilities: heroClass.abilities.map((def) => ({ def, cooldownTimer: 0 })),
      atkBuffTimer: 0,
      atkBuffMult: 1,
    },
    caravan: {
      position: { x: 2, y: cy },
      hp: CaravanBalance.CARAVAN_HP,
      maxHp: CaravanBalance.CARAVAN_HP,
      speed: CaravanBalance.CARAVAN_SPEED,
      baseSpeed: CaravanBalance.CARAVAN_SPEED,
    },
    escorts: [],
    enemies: [],
    loot: [],
    cargo: [],
    maxCargoSlots: CaravanBalance.START_CARGO_SLOTS,
    gold: CaravanBalance.START_GOLD,
    totalGoldEarned: 0,
    totalTradeProfit: 0,
    segment: 0,
    totalSegments,
    segmentProgress: 0,
    segmentLength: segLen,
    towns: generateRoute(totalSegments),
    phase: "town",
    encounterCooldown: CaravanBalance.ENCOUNTER_COOLDOWN_MAX,
    encounterCount: 0,
    bossIndex: 0,
    bossActive: false,
    bossSpawnedThisSegment: false,
    roadEventFired: false,
    holdPosition: false,
    sprintTimer: 0,
    sprintCooldown: 0,
    killStreak: 0,
    killStreakTimer: 0,
    hazards: [],
    hazardSpawnTimer: 0,
    parryTimer: 0,
    parryCooldown: 0,
    timeScale: 1,
    defense: 0,
    relicIds: [],
    mapWidth: segLen + 20,
    mapHeight: mapH,
    gameTime: 0,
    paused: false,
    gameOver: false,
    victory: false,
    resultsShown: false,
    defeatReason: "",
    input: { left: false, right: false, up: false, down: false },
    nextEnemyId: 1,
    nextLootId: 1,
    nextEscortId: 1,
    totalKills: 0,
    segmentsCompleted: 0,
    screenW: 800,
    screenH: 600,
    difficulty,
    difficultyMult: diffMult * ngMult,
    ngPlusLevel,
    tipsShown: new Set<string>(),
  };
}
