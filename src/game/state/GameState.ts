// ---------------------------------------------------------------------------
// Quest for the Grail — Game State
// ---------------------------------------------------------------------------

import {
  TileType, RoomType,
  KNIGHT_DEFS,
  GameBalance, getFloorParams,
} from "../config/GameConfig";
import type { KnightDef, ItemDef, EnemyDef, QuestGenreDef, FloorParams } from "../config/GameConfig";
import type { CompanionDef, CompanionBehavior, TrapVariant, PuzzleType } from "../config/GameArtifactDefs";

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

// ---------------------------------------------------------------------------
// Crafting & Enchantment state
// ---------------------------------------------------------------------------

export interface MaterialInventory {
  id: string;         // material id
  quantity: number;
}

export interface EnchantedItem {
  itemId: string;     // item def id
  enchantId: string;  // enchantment def id
  level: number;
}

export interface SocketedItem {
  itemId: string;     // item def id
  gems: string[];     // gem/rune ids
}

// ---------------------------------------------------------------------------
// Companion state
// ---------------------------------------------------------------------------

export interface CompanionState {
  def: CompanionDef;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  level: number;
  xp: number;
  xpToNext: number;
  alive: boolean;
  behavior: CompanionBehavior;
  loyalty: number;             // 0-100
  abilityCooldowns: number[];  // per ability
  attackCooldown: number;      // ms
  facing: Direction;
  isMoving: boolean;
}

// ---------------------------------------------------------------------------
// Artifact state
// ---------------------------------------------------------------------------

export interface ArtifactState {
  id: string;          // artifact def id
  found: boolean;
  upgraded: boolean;
}

// ---------------------------------------------------------------------------
// Enhanced Trap state
// ---------------------------------------------------------------------------

export interface TrapInstance {
  col: number;
  row: number;
  variant: TrapVariant;
  detected: boolean;
  disarmed: boolean;
}

// ---------------------------------------------------------------------------
// Puzzle Room state
// ---------------------------------------------------------------------------

export interface PuzzleRoomState {
  roomIndex: number;      // index in floor.rooms
  puzzleType: PuzzleType;
  difficulty: number;
  solved: boolean;
  sequence?: number[];    // for sequence puzzles
  playerSequence?: number[];
  timeRemaining?: number;
  rewardTier: string;
}

// ---------------------------------------------------------------------------
// Boss Arena Hazard state
// ---------------------------------------------------------------------------

export interface ArenaHazardInstance {
  id: string;
  col: number;
  row: number;
  timer: number;
  damagePerSecond: number;
  radius: number;
  color: number;
}

// ---------------------------------------------------------------------------
// Companion NPC (recruitable, not yet recruited)
// ---------------------------------------------------------------------------

export interface CompanionNPC {
  def: CompanionDef;
  col: number;
  row: number;
  recruited: boolean;
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
  // Enhanced traps
  traps: TrapInstance[];
  // Puzzle rooms
  puzzleRooms: PuzzleRoomState[];
  // Boss arena hazards
  arenaHazards: ArenaHazardInstance[];
  // Companion NPCs (recruitables)
  companionNPCs: CompanionNPC[];
  // Secret room levers/triggers
  secretTriggers: { col: number; row: number; activated: boolean; targetRoomIdx: number }[];
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
  CRAFTING = "crafting",
  ENCHANTING = "enchanting",
  PUZZLE = "puzzle",
  ARTIFACT_LORE = "artifact_lore",
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
  // Dash
  dashTimer: number;           // seconds remaining in dash (0 = not dashing)
  dashCooldown: number;        // seconds until dash available again
  dashDx: number;              // dash direction x
  dashDy: number;              // dash direction y
  // Kill streak
  killStreakCount: number;     // consecutive kills within time window
  killStreakTimer: number;     // seconds remaining before streak resets

  // Crafting & Enchantment
  materials: MaterialInventory[];
  enchantments: EnchantedItem[];
  sockets: SocketedItem[];
  craftingScrollIndex: number;
  enchantingScrollIndex: number;

  // Artifact Collection
  artifacts: ArtifactState[];
  artifactLoreViewing: string | null;

  // Companion
  companion: CompanionState | null;

  // Puzzle state
  activePuzzle: PuzzleRoomState | null;

  // Infinite Mode
  isInfiniteMode: boolean;
  infiniteScore: number;
  floorStartTime: number;      // timestamp for speed scoring

  // Perception stat (for trap detection)
  perception: number;           // increases with level
  trapDisarmSkill: number;      // skill for disarming traps
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
    dashTimer: 0,
    dashCooldown: 0,
    dashDx: 0,
    dashDy: 0,
    killStreakCount: 0,
    killStreakTimer: 0,
    // Crafting
    materials: [],
    enchantments: [],
    sockets: [],
    craftingScrollIndex: 0,
    enchantingScrollIndex: 0,
    // Artifacts
    artifacts: [],
    artifactLoreViewing: null,
    // Companion
    companion: null,
    // Puzzle
    activePuzzle: null,
    // Infinite Mode
    isInfiniteMode: false,
    infiniteScore: 0,
    floorStartTime: Date.now(),
    // Perception / Trap disarm
    perception: 15,
    trapDisarmSkill: 10,
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
    traps: [],
    puzzleRooms: [],
    arenaHazards: [],
    companionNPCs: [],
    secretTriggers: [],
  };
}

// ---------------------------------------------------------------------------
// Meta-progression persistence
// ---------------------------------------------------------------------------

const META_KEY = "grailquest_unlocks";
const STATS_KEY = "grailquest_stats";
const DEFAULT_UNLOCKED = ["arthur", "lancelot", "gawain", "percival"];

export interface RunStats {
  totalRuns: number;
  totalVictories: number;
  totalDeaths: number;
  totalKillsAllTime: number;
  totalGoldAllTime: number;
  bestFloor: number;
  bossesDefeated: string[];       // unique boss ids
  fastestVictoryMs: number;       // ms for fastest winning run
  highestLevel: number;
  knightsUsed: Record<string, number>;   // knight id → times used
  relicsFound: string[];          // unique relic ids found
  genresCompleted: string[];      // unique genre ids completed
}

export function loadRunStats(): RunStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {
    totalRuns: 0, totalVictories: 0, totalDeaths: 0,
    totalKillsAllTime: 0, totalGoldAllTime: 0,
    bestFloor: 0, bossesDefeated: [],
    fastestVictoryMs: Infinity, highestLevel: 1,
    knightsUsed: {}, relicsFound: [], genresCompleted: [],
  };
}

export function saveRunStats(stats: RunStats): void {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch { /* ignore */ }
}

export function updateRunStatsOnEnd(state: GrailGameState, victory: boolean): void {
  const stats = loadRunStats();
  stats.totalRuns++;
  if (victory) stats.totalVictories++;
  else stats.totalDeaths++;

  stats.totalKillsAllTime += state.totalKills;
  stats.totalGoldAllTime += state.totalGold;
  stats.bestFloor = Math.max(stats.bestFloor, state.currentFloor + 1);
  stats.highestLevel = Math.max(stats.highestLevel, state.player.level);

  // Track knight usage
  const knightId = state.player.knightDef.id;
  stats.knightsUsed[knightId] = (stats.knightsUsed[knightId] || 0) + 1;

  // Track unique bosses defeated
  for (const bossId of state.killedBosses) {
    if (!stats.bossesDefeated.includes(bossId)) stats.bossesDefeated.push(bossId);
  }

  // Track relics found
  for (const relicId of state.foundRelics) {
    if (!stats.relicsFound.includes(relicId)) stats.relicsFound.push(relicId);
  }

  // Track genre completion
  if (victory && state.genre && !stats.genresCompleted.includes(state.genre.id)) {
    stats.genresCompleted.push(state.genre.id);
  }

  // Fastest victory
  if (victory) {
    const elapsed = Date.now() - state.startTime;
    if (elapsed < stats.fastestVictoryMs) stats.fastestVictoryMs = elapsed;
  }

  saveRunStats(stats);
}

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
