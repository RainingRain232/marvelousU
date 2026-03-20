// ---------------------------------------------------------------------------
// Terraria – Core game state
// ---------------------------------------------------------------------------

import { TB } from "../config/TerrariaBalance";
import { BlockType, BLOCK_DEFS } from "../config/TerrariaBlockDefs";
import { TerrariaChunk, worldToChunkX, worldToLocalX } from "./TerrariaChunk";
import type { TerrariaInventory } from "./TerrariaInventory";
import { createInventory } from "./TerrariaInventory";
import type { MobInstance, Projectile, DroppedItem, NPCInstance, StatusEffect } from "./TerrariaEntity";

// ---------------------------------------------------------------------------
// Player
// ---------------------------------------------------------------------------

export interface TerrariaPlayer {
  x: number; y: number;
  vx: number; vy: number;
  facingRight: boolean;
  onGround: boolean;

  hp: number; maxHp: number;
  mana: number; maxMana: number;
  defense: number;

  inventory: TerrariaInventory;

  invulnTimer: number;
  attackTimer: number;
  miningTarget: { wx: number; wy: number; progress: number } | null;
  hoverTarget: { wx: number; wy: number; canPlace: boolean; canReach: boolean } | null;

  hasExcalibur: boolean;
  hasGrail: boolean;
  knightsRecruited: number;
  blocksPlaced: number;
  blocksMined: number;
  mobsKilled: number;

  // Status effects
  statusEffects: StatusEffect[];
  // Combat stats
  critChance: number;    // 0-1, default 0.05
  speedMult: number;     // movement speed multiplier from effects
}

// ---------------------------------------------------------------------------
// Quest
// ---------------------------------------------------------------------------

export enum QuestId {
  BUILD_SHELTER = 0,
  CRAFT_FIRST_TOOL,
  MINE_IRON,
  FIND_EXCALIBUR,
  BUILD_CASTLE,
  RECRUIT_KNIGHTS,
  DEFEAT_DRAGON,
  FIND_GRAIL,
}

export interface QuestState {
  id: QuestId;
  name: string;
  desc: string;
  completed: boolean;
  unlocked: boolean;
  progress: number;
  goal: number;
}

// ---------------------------------------------------------------------------
// Top-level state
// ---------------------------------------------------------------------------

export interface TerrariaState {
  chunks: Map<number, TerrariaChunk>;
  player: TerrariaPlayer;
  mobs: MobInstance[];
  npcs: NPCInstance[];
  projectiles: Projectile[];
  droppedItems: DroppedItem[];
  nextEntityId: number;

  timeOfDay: number;       // 0.0-1.0 (0.0 = midnight, 0.5 = noon)
  totalTime: number;
  dayNumber: number;
  sunlightLevel: number;

  quests: QuestState[];
  seed: number;

  paused: boolean;
  inventoryOpen: boolean;
  craftingOpen: boolean;
  craftingStation: "round_table" | "forge" | null;

  screenW: number;
  screenH: number;
  creativeMode: boolean;
  difficulty: "easy" | "normal" | "hard";
  gameOver: boolean;
  victory: boolean;
  messages: { text: string; time: number; color: number }[];

  // World events
  activeEvent: "none" | "blood_moon" | "goblin_invasion" | "meteor_shower";
  eventTimer: number;
  eventData: { spawnCount?: number; meteorX?: number; meteorY?: number };

  worldWidth: number;
  worldHeight: number;

  // Camera target (blocks)
  camX: number;
  camY: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getWorldBlock(state: TerrariaState, wx: number, wy: number): BlockType {
  const cx = worldToChunkX(wx);
  const chunk = state.chunks.get(cx);
  if (!chunk) return BlockType.AIR;
  return chunk.getBlock(worldToLocalX(wx), wy);
}

export function setWorldBlock(state: TerrariaState, wx: number, wy: number, block: BlockType): void {
  const cx = worldToChunkX(wx);
  const chunk = state.chunks.get(cx);
  if (!chunk) return;
  chunk.setBlock(worldToLocalX(wx), wy, block);
}

export function isSolid(state: TerrariaState, wx: number, wy: number): boolean {
  if (wy < 0 || wy >= TB.WORLD_HEIGHT) return wy < 0;
  if (wx < 0 || wx >= TB.WORLD_WIDTH) return true;
  const bt = getWorldBlock(state, wx, wy);
  const def = BLOCK_DEFS[bt];
  return def ? def.solid : false;
}

export function addMessage(state: TerrariaState, text: string, color = 0xFFFFFF): void {
  state.messages.push({ text, time: state.totalTime, color });
  if (state.messages.length > 20) state.messages.shift();
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createTerrariaState(seed?: number, worldWidth?: number, difficulty?: string): TerrariaState {
  const s = seed ?? Math.floor(Math.random() * 999999);
  const ww = worldWidth ?? TB.WORLD_WIDTH;
  const diff = (difficulty === "easy" || difficulty === "hard") ? difficulty : "normal";
  return {
    chunks: new Map(),
    player: {
      x: ww / 2,
      y: TB.SEA_LEVEL + 10,
      vx: 0, vy: 0,
      facingRight: true,
      onGround: false,
      hp: TB.PLAYER_MAX_HP,
      maxHp: TB.PLAYER_MAX_HP,
      mana: TB.PLAYER_MAX_MANA,
      maxMana: TB.PLAYER_MAX_MANA,
      defense: 0,
      inventory: createInventory(),
      invulnTimer: 0,
      attackTimer: 0,
      miningTarget: null,
      hoverTarget: null,
      hasExcalibur: false,
      hasGrail: false,
      knightsRecruited: 0,
      blocksPlaced: 0,
      blocksMined: 0,
      mobsKilled: 0,
      statusEffects: [],
      critChance: 0.05,
      speedMult: 1.0,
    },
    mobs: [],
    npcs: [],
    projectiles: [],
    droppedItems: [],
    nextEntityId: 1,
    timeOfDay: 0.25,  // start at dawn
    totalTime: 0,
    dayNumber: 1,
    sunlightLevel: TB.SUNLIGHT_LEVEL,
    quests: createInitialQuests(),
    seed: s,
    paused: false,
    inventoryOpen: false,
    craftingOpen: false,
    craftingStation: null,
    screenW: window.innerWidth,
    screenH: window.innerHeight,
    creativeMode: false,
    difficulty: diff as "easy" | "normal" | "hard",
    gameOver: false,
    victory: false,
    messages: [],
    activeEvent: "none",
    eventTimer: 0,
    eventData: {},
    worldWidth: ww,
    worldHeight: TB.WORLD_HEIGHT,
    camX: ww / 2,
    camY: TB.SEA_LEVEL + 10,
  };
}

function createInitialQuests(): QuestState[] {
  return [
    { id: QuestId.BUILD_SHELTER, name: "Build a Shelter", desc: "Place 20 blocks to build shelter", completed: false, unlocked: true, progress: 0, goal: 20 },
    { id: QuestId.CRAFT_FIRST_TOOL, name: "Craft a Tool", desc: "Craft your first tool at a Round Table", completed: false, unlocked: true, progress: 0, goal: 1 },
    { id: QuestId.MINE_IRON, name: "Mine Iron", desc: "Mine 10 iron ore deep underground", completed: false, unlocked: false, progress: 0, goal: 10 },
    { id: QuestId.FIND_EXCALIBUR, name: "Find Excalibur", desc: "Locate the legendary sword in the crystal caves", completed: false, unlocked: false, progress: 0, goal: 1 },
    { id: QuestId.BUILD_CASTLE, name: "Build Camelot", desc: "Place 200 blocks to construct a castle", completed: false, unlocked: false, progress: 0, goal: 200 },
    { id: QuestId.RECRUIT_KNIGHTS, name: "Recruit Knights", desc: "Recruit 6 knights of the Round Table", completed: false, unlocked: false, progress: 0, goal: 6 },
    { id: QuestId.DEFEAT_DRAGON, name: "Defeat the Dragon", desc: "Slay the dragon in the Underworld", completed: false, unlocked: false, progress: 0, goal: 1 },
    { id: QuestId.FIND_GRAIL, name: "Find the Holy Grail", desc: "Obtain the Holy Grail from its hidden chamber", completed: false, unlocked: false, progress: 0, goal: 1 },
  ];
}
