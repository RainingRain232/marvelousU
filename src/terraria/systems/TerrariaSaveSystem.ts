// ---------------------------------------------------------------------------
// Terraria – Save/Load system (LocalStorage)
// ---------------------------------------------------------------------------

import { TB } from "../config/TerrariaBalance";
import type { TerrariaState } from "../state/TerrariaState";
import { createTerrariaState } from "../state/TerrariaState";
import { TerrariaChunk } from "../state/TerrariaChunk";

const SAVE_KEY = TB.SAVE_KEY;
const SAVE_VERSION = 1;

// ---------------------------------------------------------------------------
// Save
// ---------------------------------------------------------------------------

export function saveTerrariaWorld(state: TerrariaState): void {
  try {
    const data: SaveData = {
      v: SAVE_VERSION,
      seed: state.seed,
      timeOfDay: state.timeOfDay,
      dayNumber: state.dayNumber,
      totalTime: state.totalTime,
      creativeMode: state.creativeMode,
      player: {
        x: state.player.x,
        y: state.player.y,
        hp: state.player.hp,
        maxHp: state.player.maxHp,
        mana: state.player.mana,
        maxMana: state.player.maxMana,
        defense: state.player.defense,
        hasExcalibur: state.player.hasExcalibur,
        hasGrail: state.player.hasGrail,
        knightsRecruited: state.player.knightsRecruited,
        blocksPlaced: state.player.blocksPlaced,
        blocksMined: state.player.blocksMined,
        mobsKilled: state.player.mobsKilled,
        selectedSlot: state.player.inventory.selectedSlot,
        hotbar: state.player.inventory.hotbar,
        main: state.player.inventory.main,
        armor: state.player.inventory.armor,
      },
      chunks: [],
      quests: state.quests,
    };

    // Encode chunks
    for (const [cx, chunk] of state.chunks) {
      // Convert Uint16Array to base64
      const bytes = new Uint8Array(chunk.blocks.buffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const b64Blocks = btoa(binary);

      // Walls
      let wallBinary = "";
      for (let i = 0; i < chunk.walls.length; i++) wallBinary += String.fromCharCode(chunk.walls[i]);
      const b64Walls = btoa(wallBinary);

      data.chunks.push({ cx, b64Blocks, b64Walls });
    }

    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("Failed to save terraria world:", e);
  }
}

// ---------------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------------

export function loadTerrariaWorld(): TerrariaState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data: SaveData = JSON.parse(raw);
    if (data.v !== SAVE_VERSION) return null;

    const state = createTerrariaState(data.seed);
    state.timeOfDay = data.timeOfDay;
    state.dayNumber = data.dayNumber;
    state.totalTime = data.totalTime;
    state.creativeMode = data.creativeMode;

    // Restore player
    const p = state.player;
    p.x = data.player.x;
    p.y = data.player.y;
    p.hp = data.player.hp;
    p.maxHp = data.player.maxHp;
    p.mana = data.player.mana;
    p.maxMana = data.player.maxMana;
    p.defense = data.player.defense;
    p.hasExcalibur = data.player.hasExcalibur;
    p.hasGrail = data.player.hasGrail;
    p.knightsRecruited = data.player.knightsRecruited;
    p.blocksPlaced = data.player.blocksPlaced;
    p.blocksMined = data.player.blocksMined;
    p.mobsKilled = data.player.mobsKilled;
    p.inventory.selectedSlot = data.player.selectedSlot;
    p.inventory.hotbar = data.player.hotbar as typeof p.inventory.hotbar;
    p.inventory.main = data.player.main as typeof p.inventory.main;
    p.inventory.armor = data.player.armor as typeof p.inventory.armor;

    // Restore chunks
    for (const chunkData of data.chunks) {
      const chunk = new TerrariaChunk(chunkData.cx);

      // Decode blocks
      const binary = atob(chunkData.b64Blocks);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blocks = new Uint16Array(bytes.buffer);
      chunk.blocks.set(blocks);

      // Decode walls
      const wallBinary = atob(chunkData.b64Walls);
      for (let i = 0; i < wallBinary.length; i++) chunk.walls[i] = wallBinary.charCodeAt(i);

      chunk.rebuildHeightMap();
      chunk.populated = true;
      chunk.dirty = true;
      chunk.lightDirty = true;

      state.chunks.set(chunkData.cx, chunk);
    }

    // Restore quests
    state.quests = data.quests as typeof state.quests;

    return state;
  } catch (e) {
    console.warn("Failed to load terraria world:", e);
    return null;
  }
}

export function hasSave(): boolean {
  return localStorage.getItem(SAVE_KEY) !== null;
}

export function deleteSave(): void {
  localStorage.removeItem(SAVE_KEY);
}

// ---------------------------------------------------------------------------
// Save data shape
// ---------------------------------------------------------------------------

interface SaveData {
  v: number;
  seed: number;
  timeOfDay: number;
  dayNumber: number;
  totalTime: number;
  creativeMode: boolean;
  player: {
    x: number; y: number;
    hp: number; maxHp: number;
    mana: number; maxMana: number;
    defense: number;
    hasExcalibur: boolean;
    hasGrail: boolean;
    knightsRecruited: number;
    blocksPlaced: number;
    blocksMined: number;
    mobsKilled: number;
    selectedSlot: number;
    hotbar: unknown[];
    main: unknown[];
    armor: unknown;
  };
  chunks: { cx: number; b64Blocks: string; b64Walls: string }[];
  quests: unknown[];
}
