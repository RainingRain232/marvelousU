// ---------------------------------------------------------------------------
// Quest for the Grail — Game State
// ---------------------------------------------------------------------------

import {
  TileType, RoomType,
  KNIGHT_DEFS,
  GameBalance, getFloorParams,
} from "../config/GameConfig";
import type { KnightDef, ItemDef, EnemyDef, QuestGenreDef, FloorParams } from "../config/GameConfig";

// ---------------------------------------------------------------------------
// Sub-state types
// ---------------------------------------------------------------------------

export interface Position {
  x: number;        // pixel coords
  y: number;
}

export interface GridPos {
  col: number;
  row: number;
}

export interface PlayerState {
  knightDef: KnightDef;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  critChance: number;
  level: number;
  xp: number;
  xpToNext: number;
  gold: number;
  abilityCooldown: number;     // turns remaining
  inventory: InventoryItem[];
  equippedWeapon: ItemDef | null;
  equippedArmor: ItemDef | null;
  equippedRelic: ItemDef | null;
  statusEffects: StatusEffect[];
  facing: Direction;
  isMoving: boolean;
  attackCooldown: number;      // ms remaining
  abilityCooldownMs: number;   // ms remaining for animation
  confusionTimer: number;      // seconds remaining of reversed controls
  stunTimer: number;           // seconds remaining of stun (from shield bash etc)
}

export interface InventoryItem {
  def: ItemDef;
  quantity: number;
}

export interface StatusEffect {
  id: string;
  turnsRemaining: number;
  value: number;
}

export enum Direction {
  UP = 0,
  RIGHT = 1,
  DOWN = 2,
  LEFT = 3,
}

export interface EnemyInstance {
  id: number;
  def: EnemyDef;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  aggroed: boolean;
  attackCooldown: number;
  stunTurns: number;
  statusEffects: StatusEffect[];
  facing: Direction;
  pathTarget: GridPos | null;
  bossPhase: number;
  // AI timers
  aiAbilityCooldown: number;   // cooldown for special AI abilities (seconds)
  aiSummonCooldown: number;    // cooldown for summoner rally/spawn (seconds)
  aiRallyCooldown: number;     // cooldown for rally buff (seconds)
  aiHealCooldown: number;      // cooldown for mage heal (seconds)
  // Boss phase tracking
  bossPhaseTransitioned: boolean[];  // track which phase transitions already triggered
  bossArmorReduction: number;  // damage reduction multiplier (e.g., 0.5 for 50% reduction)
  bossEnraged: boolean;        // enrage flag
  bossShieldThrown: boolean;   // Black Knight shield throw tracking
  bossChallengeTimer: number;  // Green Knight challenge mode timer
  // Summoner damage buff
  rallyDamageBuff: number;     // multiplicative bonus from rally (e.g., 0.2 = +20%)
  rallyBuffTimer: number;      // seconds remaining
}

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  color: number;
  ownerId: number;          // enemy id that fired it
  lifetime: number;         // seconds remaining
  maxRange: number;         // max distance in pixels
  distTraveled: number;     // distance traveled so far
}

export interface PoisonTrail {
  col: number;
  row: number;
  timer: number;            // seconds remaining
  damage: number;           // damage per second
}

export interface TreasureChest {
  col: number;
  row: number;
  opened: boolean;
  item: ItemDef;
}

export interface RoomInfo {
  x: number; y: number; w: number; h: number;
  type: RoomType;
}

export interface ReanimationEntry {
  def: EnemyDef;
  x: number;
  y: number;
  timer: number;
}

export interface FloorState {
  floorNum: number;
  params: FloorParams;
  tiles: TileType[][];       // [row][col]
  width: number;
  height: number;
  rooms: RoomInfo[];
  enemies: EnemyInstance[];
  treasures: TreasureChest[];
  stairsPos: GridPos;
  entrancePos: GridPos;
  explored: boolean[][];      // fog of war
  // Environmental mechanics
  reanimationQueue: ReanimationEntry[];
  darknessTimer: number;       // for Abyssal Halls
  burningTrails: { col: number; row: number; timer: number }[];
  // Enemy projectile system
  projectiles: Projectile[];
  // Poison trails from Questing Beast
  poisonTrails: PoisonTrail[];
}

export enum GamePhase {
  GENRE_SELECT = "genre_select",
  KNIGHT_SELECT = "knight_select",
  PLAYING = "playing",
  COMBAT = "combat",
  LEVEL_UP = "level_up",
  FLOOR_TRANSITION = "floor_transition",
  GAME_OVER = "game_over",
  VICTORY = "victory",
  PAUSED = "paused",
  INVENTORY = "inventory",
  SHOP = "shop",
}

export interface GrailGameState {
  phase: GamePhase;
  prevPhase: GamePhase;
  genre: QuestGenreDef | null;
  player: PlayerState;
  floor: FloorState;
  currentFloor: number;
  totalFloors: number;
  enemyIdCounter: number;
  turnCount: number;
  killedBosses: string[];
  foundRelics: string[];
  totalKills: number;
  totalGold: number;
  startTime: number;
  // Meta-progression (persisted to localStorage)
  unlockedKnights: string[];
  // Shop state
  shopScrollIndex: number;
  shopSellMode: boolean;
  // Ability VFX
  activeAbilityVfx: { knightId: string; timer: number; x: number; y: number } | null;
  // Ice slide
  iceSlideDir: { dx: number; dy: number } | null;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createGrailGameState(): GrailGameState {
  const dummyKnight = KNIGHT_DEFS[0];
  return {
    phase: GamePhase.GENRE_SELECT,
    prevPhase: GamePhase.GENRE_SELECT,
    genre: null,
    player: createPlayerState(dummyKnight),
    floor: createEmptyFloor(),
    currentFloor: 0,
    totalFloors: 8,
    enemyIdCounter: 0,
    turnCount: 0,
    killedBosses: [],
    foundRelics: [],
    totalKills: 0,
    totalGold: 0,
    startTime: Date.now(),
    unlockedKnights: loadUnlockedKnights(),
    shopScrollIndex: 0,
    shopSellMode: false,
    activeAbilityVfx: null,
    iceSlideDir: null,
  };
}

export function createPlayerState(knight: KnightDef): PlayerState {
  return {
    knightDef: knight,
    x: 0, y: 0,
    hp: knight.hp,
    maxHp: knight.maxHp,
    attack: knight.attack,
    defense: knight.defense,
    speed: knight.speed,
    critChance: knight.critChance,
    level: 1,
    xp: 0,
    xpToNext: GameBalance.XP_PER_LEVEL(1),
    gold: 0,
    abilityCooldown: 0,
    inventory: [],
    equippedWeapon: null,
    equippedArmor: null,
    equippedRelic: null,
    statusEffects: [],
    facing: Direction.DOWN,
    isMoving: false,
    attackCooldown: 0,
    abilityCooldownMs: 0,
    confusionTimer: 0,
    stunTimer: 0,
  };
}

function createEmptyFloor(): FloorState {
  return {
    floorNum: 0,
    params: getFloorParams(0, 8),
    tiles: [],
    width: 0,
    height: 0,
    rooms: [],
    enemies: [],
    treasures: [],
    stairsPos: { col: 0, row: 0 },
    entrancePos: { col: 0, row: 0 },
    explored: [],
    reanimationQueue: [],
    darknessTimer: 0,
    burningTrails: [],
    projectiles: [],
    poisonTrails: [],
  };
}

// ---------------------------------------------------------------------------
// Meta-progression persistence
// ---------------------------------------------------------------------------

const META_KEY = "grailquest_unlocks";
const DEFAULT_UNLOCKED = ["arthur", "lancelot", "gawain", "percival"];

export function loadUnlockedKnights(): string[] {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [...DEFAULT_UNLOCKED];
}

export function saveUnlockedKnights(ids: string[]): void {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(ids));
  } catch { /* ignore */ }
}

// Unlock a new knight after a successful run
export function unlockKnight(state: GrailGameState, knightId: string): boolean {
  if (state.unlockedKnights.includes(knightId)) return false;
  state.unlockedKnights.push(knightId);
  saveUnlockedKnights(state.unlockedKnights);
  return true;
}
