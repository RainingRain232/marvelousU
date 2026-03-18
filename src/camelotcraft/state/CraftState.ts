// ---------------------------------------------------------------------------
// Camelot Craft – Top-level game state
// ---------------------------------------------------------------------------

import * as THREE from "three";
import { CB } from "../config/CraftBalance";
import { BlockType, isSolid } from "../config/CraftBlockDefs";
import { MobType } from "../config/CraftMobDefs";
import { CraftChunk, chunkKey, worldToChunk, worldToLocal } from "./CraftChunk";
import { createInventory, type CraftInventory } from "./CraftInventory";

// ---------------------------------------------------------------------------
// Player
// ---------------------------------------------------------------------------

export interface CraftPlayer {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  yaw: number;   // radians, horizontal look
  pitch: number;  // radians, vertical look
  onGround: boolean;
  hp: number;
  maxHp: number;
  hunger: number;
  maxHunger: number;
  xp: number;
  level: number;
  inventory: CraftInventory;
  /** Time left of invulnerability after being hit. */
  invulnTimer: number;
  /** Current mining target or null. */
  miningTarget: { wx: number; wy: number; wz: number; progress: number } | null;
  /** Is sprinting? */
  sprinting: boolean;
  /** Has Excalibur been found? */
  hasExcalibur: boolean;
  /** Has the Holy Grail been found? */
  hasGrail: boolean;
  /** Number of Knights recruited to the Round Table */
  knightsRecruited: number;
  /** Player attack cooldown timer. */
  attackTimer: number;
  /** Whether player is submerged in water. */
  inWater: boolean;
  /** Whether player is swimming (in water + pressing space). */
  swimming: boolean;
  /** Respawn position. */
  spawnPoint: THREE.Vector3;
  /** Total blocks placed (for quest tracking). */
  blocksPlaced: number;
  /** Total blocks mined (for quest tracking). */
  blocksMined: number;
}

export function createPlayer(): CraftPlayer {
  return {
    position: new THREE.Vector3(0, 40, 0),
    velocity: new THREE.Vector3(0, 0, 0),
    yaw: 0,
    pitch: 0,
    onGround: false,
    hp: CB.PLAYER_MAX_HP,
    maxHp: CB.PLAYER_MAX_HP,
    hunger: CB.PLAYER_MAX_HUNGER,
    maxHunger: CB.PLAYER_MAX_HUNGER,
    xp: 0,
    level: 1,
    inventory: createInventory(),
    invulnTimer: 0,
    miningTarget: null,
    sprinting: false,
    hasExcalibur: false,
    hasGrail: false,
    attackTimer: 0,
    inWater: false,
    swimming: false,
    spawnPoint: new THREE.Vector3(8, 40, 8),
    blocksPlaced: 0,
    blocksMined: 0,
    knightsRecruited: 0,
  };
}

// ---------------------------------------------------------------------------
// Mob instance
// ---------------------------------------------------------------------------

export interface MobInstance {
  id: number;
  type: MobType;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  hp: number;
  maxHp: number;
  yaw: number;
  target: THREE.Vector3 | null;
  attackTimer: number;
  hurtTimer: number;
  despawnTimer: number;
  aiState: "idle" | "wander" | "chase" | "attack" | "flee";
  aiTimer: number;
}

// ---------------------------------------------------------------------------
// Quest state
// ---------------------------------------------------------------------------

export enum QuestId {
  BUILD_SHELTER = "build_shelter",
  CRAFT_FIRST_TOOL = "craft_first_tool",
  MINE_IRON = "mine_iron",
  FIND_EXCALIBUR = "find_excalibur",
  BUILD_CASTLE = "build_castle",
  RECRUIT_KNIGHTS = "recruit_knights",
  DEFEAT_DRAGON = "defeat_dragon",
  FIND_GRAIL = "find_grail",
}

export interface QuestState {
  id: QuestId;
  name: string;
  description: string;
  completed: boolean;
  progress: number;
  goal: number;
}

// ---------------------------------------------------------------------------
// Main game state
// ---------------------------------------------------------------------------

export interface CraftState {
  /** All loaded chunks, keyed by "cx,cz". */
  chunks: Map<string, CraftChunk>;

  /** Player state. */
  player: CraftPlayer;

  /** Mob instances. */
  mobs: MobInstance[];
  nextMobId: number;

  /** Day/night cycle: 0.0 = midnight, 0.5 = noon, 1.0 = next midnight. */
  timeOfDay: number;
  /** Total elapsed time in seconds. */
  totalTime: number;
  /** Current day number (starts at 1). */
  dayNumber: number;

  /** Quest states. */
  quests: QuestState[];

  /** World seed for deterministic generation. */
  seed: number;

  /** Pause state. */
  paused: boolean;

  /** UI state. */
  inventoryOpen: boolean;
  craftingOpen: boolean;

  /** Screen dimensions. */
  screenW: number;
  screenH: number;

  /** Game over flag. */
  gameOver: boolean;
  victory: boolean;

  /** Messages / notifications queue. */
  messages: { text: string; time: number; color: number }[];
}

export function createCraftState(seed?: number): CraftState {
  return {
    chunks: new Map(),
    player: createPlayer(),
    mobs: [],
    nextMobId: 1,
    timeOfDay: 0.3, // start in the morning
    totalTime: 0,
    dayNumber: 1,
    quests: createInitialQuests(),
    seed: seed ?? Math.floor(Math.random() * 2147483647),
    paused: false,
    inventoryOpen: false,
    craftingOpen: false,
    screenW: window.innerWidth,
    screenH: window.innerHeight,
    gameOver: false,
    victory: false,
    messages: [],
  };
}

function createInitialQuests(): QuestState[] {
  return [
    {
      id: QuestId.BUILD_SHELTER, name: "A Roof Over Thy Head",
      description: "Place 20 blocks to build your first shelter before nightfall.",
      completed: false, progress: 0, goal: 20,
    },
    {
      id: QuestId.CRAFT_FIRST_TOOL, name: "The Smith's Apprentice",
      description: "Craft your first tool at a crafting table.",
      completed: false, progress: 0, goal: 1,
    },
    {
      id: QuestId.MINE_IRON, name: "Iron Will",
      description: "Mine 10 iron ore from the earth.",
      completed: false, progress: 0, goal: 10,
    },
    {
      id: QuestId.FIND_EXCALIBUR, name: "The Sword in the Stone",
      description: "Find Excalibur hidden deep within a crystal cave.",
      completed: false, progress: 0, goal: 1,
    },
    {
      id: QuestId.BUILD_CASTLE, name: "The Founding of Camelot",
      description: "Build a castle with a throne room, great hall, and at least 5 rooms.",
      completed: false, progress: 0, goal: CB.CAMELOT_MIN_ROOMS,
    },
    {
      id: QuestId.RECRUIT_KNIGHTS, name: "Knights of the Round Table",
      description: `Recruit ${CB.ROUND_TABLE_KNIGHTS_NEEDED} knights to join your cause.`,
      completed: false, progress: 0, goal: CB.ROUND_TABLE_KNIGHTS_NEEDED,
    },
    {
      id: QuestId.DEFEAT_DRAGON, name: "The Dragon's Bane",
      description: "Slay the great dragon terrorizing the realm.",
      completed: false, progress: 0, goal: 1,
    },
    {
      id: QuestId.FIND_GRAIL, name: "The Holy Grail",
      description: "Find the Holy Grail in the depths of the enchanted dungeon.",
      completed: false, progress: 0, goal: 1,
    },
  ];
}

// ---------------------------------------------------------------------------
// World access helpers (chunk-agnostic)
// ---------------------------------------------------------------------------

/** Get block at world coordinates. */
export function getWorldBlock(state: CraftState, wx: number, wy: number, wz: number): BlockType {
  if (wy < 0 || wy >= CB.CHUNK_HEIGHT) return BlockType.AIR;
  const cx = worldToChunk(wx);
  const cz = worldToChunk(wz);
  const chunk = state.chunks.get(chunkKey(cx, cz));
  if (!chunk) return BlockType.AIR;
  return chunk.getBlock(worldToLocal(wx), wy, worldToLocal(wz));
}

/** Set block at world coordinates. Returns previous block. */
export function setWorldBlock(state: CraftState, wx: number, wy: number, wz: number, block: BlockType): BlockType {
  if (wy < 0 || wy >= CB.CHUNK_HEIGHT) return BlockType.AIR;
  const cx = worldToChunk(wx);
  const cz = worldToChunk(wz);
  const chunk = state.chunks.get(chunkKey(cx, cz));
  if (!chunk) return BlockType.AIR;
  return chunk.setBlock(worldToLocal(wx), wy, worldToLocal(wz), block);
}

/** Check if a world position is solid (has collision). */
export function isWorldSolid(state: CraftState, wx: number, wy: number, wz: number): boolean {
  return isSolid(getWorldBlock(state, Math.floor(wx), Math.floor(wy), Math.floor(wz)));
}

/** Add a message to the notification queue. */
export function addMessage(state: CraftState, text: string, color = 0xFFFFFF): void {
  state.messages.push({ text, time: state.totalTime, color });
  if (state.messages.length > 20) state.messages.shift();
}
