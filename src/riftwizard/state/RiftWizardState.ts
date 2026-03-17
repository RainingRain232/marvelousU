// ---------------------------------------------------------------------------
// Rift Wizard mode state
// ---------------------------------------------------------------------------

import type { UnitType, BuildingType } from "@/types";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export enum RWPhase {
  PLAYING = "playing",
  TARGETING = "targeting",
  SPELL_SHOP = "spell_shop",
  LEVEL_TRANSITION = "level_transition",
  VICTORY = "victory",
  GAME_OVER = "game_over",
  PAUSED = "paused",
}

export enum RWTileType {
  WALL = "wall",
  FLOOR = "floor",
  LAVA = "lava",
  ICE = "ice",
  CHASM = "chasm",
  CORRIDOR = "corridor",
  SHRINE = "shrine",
  SPELL_CIRCLE = "spell_circle",
  RIFT_PORTAL = "rift_portal",
}

export enum SpellSchool {
  FIRE = "fire",
  ICE = "ice",
  LIGHTNING = "lightning",
  ARCANE = "arcane",
  NATURE = "nature",
  DARK = "dark",
  HOLY = "holy",
}

export enum RWEnemyAIType {
  MELEE = "melee",
  RANGED = "ranged",
  CASTER = "caster",
  BOSS = "boss",
}

export enum RWAnimationType {
  FIREBALL = "fireball",
  ICE_BALL = "ice_ball",
  CHAIN_LIGHTNING = "chain_lightning",
  WARP = "warp",
  HEAL = "heal",
  SUMMON = "summon",
  FIRE_BREATH = "fire_breath",
  FROST_BREATH = "frost_breath",
  WEB = "web",
  DISTORTION = "distortion",
  MAGIC_MISSILE = "magic_missile",
  DEATH_BOLT = "death_bolt",
  HOLY_LIGHT = "holy_light",
  EARTHQUAKE = "earthquake",
  FIRE_AURA = "fire_aura",
  MELEE_HIT = "melee_hit",
  ENEMY_SPELL = "enemy_spell",
  DAMAGE_NUMBER = "damage_number",
  DEATH = "death",
}

// ---------------------------------------------------------------------------
// Sub-state interfaces
// ---------------------------------------------------------------------------

export interface GridPos {
  col: number;
  row: number;
}

export interface RWStatusEffect {
  type: "slow" | "stun" | "poison" | "freeze" | "burn" | "shield";
  turnsRemaining: number;
  magnitude: number; // e.g. poison damage per turn, slow factor, shield HP
}

export interface WizardState {
  col: number;
  row: number;
  hp: number;
  maxHp: number;
  shields: number;
  statusEffects: RWStatusEffect[];
}

export interface SpellInstance {
  defId: string;
  charges: number;
  maxCharges: number;
  upgrades: string[]; // applied upgrade IDs
  // Computed from def + upgrades (cached for fast access)
  damage: number;
  range: number;
  aoeRadius: number;
  maxBounces: number;
  summonCount: number;
  school: SpellSchool;
}

export interface ConsumableInstance {
  type: "health_potion" | "charge_scroll" | "shield_scroll";
  quantity: number;
}

export interface RWEnemyInstance {
  id: number;
  defId: string;
  unitType: UnitType; // for sprite lookup
  col: number;
  row: number;
  hp: number;
  maxHp: number;
  damage: number;
  range: number; // 1 = melee
  moveSpeed: number; // tiles per turn (typically 1)
  aiType: RWEnemyAIType;
  school: SpellSchool | null;
  abilities: string[]; // spell defIds this enemy can cast
  abilityCooldowns: number[]; // turns until each ability is ready
  alive: boolean;
  statusEffects: RWStatusEffect[];
  stunTurns: number;
  // Boss fields
  isBoss: boolean;
  bossPhase: number;
}

export interface SpawnerInstance {
  id: number;
  col: number;
  row: number;
  hp: number;
  maxHp: number;
  spawnDefId: string; // enemy defId to spawn
  spawnInterval: number; // every N turns
  turnsSinceSpawn: number;
  alive: boolean;
  buildingType: BuildingType; // for sprite lookup
}

export interface ShrineInstance {
  id: number;
  col: number;
  row: number;
  school: SpellSchool;
  effect: "damage" | "range" | "charges" | "aoe" | "bounces";
  magnitude: number;
  used: boolean;
}

export interface SpellCircleInstance {
  id: number;
  col: number;
  row: number;
  school: SpellSchool;
}

export interface RiftPortal {
  id: number;
  col: number;
  row: number;
  buildingType: BuildingType;
  theme: SpellSchool;
  label: string; // e.g. "Fire Rift"
}

export interface ItemOnGround {
  id: number;
  col: number;
  row: number;
  type: "health_potion" | "charge_scroll" | "shield_scroll";
  picked: boolean;
}

export interface RWSummonInstance {
  id: number;
  unitType: UnitType;
  col: number;
  row: number;
  hp: number;
  maxHp: number;
  damage: number;
  range: number;
  turnsRemaining: number; // 0 = permanent
  alive: boolean;
}

export interface AnimationEvent {
  type: RWAnimationType;
  fromCol: number;
  fromRow: number;
  toCol: number;
  toRow: number;
  amount?: number; // damage number
  chain?: GridPos[]; // for chain lightning bounces
  duration: number; // seconds to play
}

export interface RoomInfo {
  x: number;
  y: number;
  w: number;
  h: number;
}

// ---------------------------------------------------------------------------
// Level state
// ---------------------------------------------------------------------------

export interface LevelState {
  width: number;
  height: number;
  tiles: RWTileType[][];
  enemies: RWEnemyInstance[];
  spawners: SpawnerInstance[];
  shrines: ShrineInstance[];
  spellCircles: SpellCircleInstance[];
  riftPortals: RiftPortal[];
  items: ItemOnGround[];
  summons: RWSummonInstance[];
  rooms: RoomInfo[];
  cleared: boolean;
  entrancePos: GridPos;
}

// ---------------------------------------------------------------------------
// Top-level game state
// ---------------------------------------------------------------------------

export interface RiftWizardState {
  phase: RWPhase;
  currentLevel: number; // 0-24
  skillPoints: number;
  totalSPEarned: number;

  wizard: WizardState;
  spells: SpellInstance[];
  abilities: string[]; // learned ability IDs
  consumables: ConsumableInstance[];

  level: LevelState;

  turnNumber: number;
  isPlayerTurn: boolean;
  animationQueue: AnimationEvent[];

  // Targeting state
  selectedSpellIndex: number; // -1 = none
  targetCursor: GridPos | null;

  // ID counters
  nextEntityId: number;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createRiftWizardState(): RiftWizardState {
  return {
    phase: RWPhase.PLAYING,
    currentLevel: 0,
    skillPoints: 0,
    totalSPEarned: 0,

    wizard: {
      col: 0,
      row: 0,
      hp: 100,
      maxHp: 100,
      shields: 0,
      statusEffects: [],
    },

    spells: [],
    abilities: [],
    consumables: [{ type: "health_potion", quantity: 1 }],

    level: createEmptyLevel(),

    turnNumber: 0,
    isPlayerTurn: true,
    animationQueue: [],

    selectedSpellIndex: -1,
    targetCursor: null,
    nextEntityId: 1,
  };
}

export function createEmptyLevel(): LevelState {
  return {
    width: 0,
    height: 0,
    tiles: [],
    enemies: [],
    spawners: [],
    shrines: [],
    spellCircles: [],
    riftPortals: [],
    items: [],
    summons: [],
    rooms: [],
    cleared: false,
    entrancePos: { col: 0, row: 0 },
  };
}
