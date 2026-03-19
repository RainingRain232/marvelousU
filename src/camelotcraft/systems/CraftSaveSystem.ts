// ---------------------------------------------------------------------------
// Camelot Craft – LocalStorage save/load
// ---------------------------------------------------------------------------

import { createCraftState, createPlayer, type CraftState, type QuestState } from "../state/CraftState";
import { CraftChunk, chunkKey } from "../state/CraftChunk";
import type { CraftInventory } from "../state/CraftInventory";
import { getAllChestData, getAllFurnaceData, restoreChestData, restoreFurnaceData } from "./CraftContainerSystem";

const SAVE_KEY = "camelotcraft_save";

// --- Base64 helpers ---

function uint8ToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function base64ToUint8(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// --- RLE compression for chunk block data ---
// Encodes runs of identical bytes: [value, count_hi, count_lo] (count as 16-bit)

function rleEncode(data: Uint8Array): Uint8Array {
  const out: number[] = [];
  let i = 0;
  while (i < data.length) {
    const val = data[i];
    let count = 1;
    while (i + count < data.length && data[i + count] === val && count < 65535) {
      count++;
    }
    out.push(val, (count >> 8) & 0xff, count & 0xff);
    i += count;
  }
  return new Uint8Array(out);
}

function rleDecode(rle: Uint8Array, expectedLen: number): Uint8Array {
  const out = new Uint8Array(expectedLen);
  let oi = 0;
  let ri = 0;
  while (ri + 2 < rle.length && oi < expectedLen) {
    const val = rle[ri];
    const count = (rle[ri + 1] << 8) | rle[ri + 2];
    const end = Math.min(oi + count, expectedLen);
    for (let j = oi; j < end; j++) out[j] = val;
    oi = end;
    ri += 3;
  }
  return out;
}

// --- Save ---

export function saveCraftWorld(state: CraftState): void {
  const savedChunks: { cx: number; cz: number; b64: string; rle?: boolean }[] = [];

  // Only save chunks near the player to avoid quota issues
  const playerCX = Math.floor(state.player.position.x / 16);
  const playerCZ = Math.floor(state.player.position.z / 16);
  const saveRadius = 4; // save fewer chunks than render distance

  state.chunks.forEach((chunk) => {
    if (!chunk.populated) return;
    // Only save chunks within save radius of player
    if (Math.abs(chunk.cx - playerCX) > saveRadius || Math.abs(chunk.cz - playerCZ) > saveRadius) return;
    // Use RLE compression to reduce size
    const compressed = rleEncode(chunk.blocks);
    savedChunks.push({
      cx: chunk.cx,
      cz: chunk.cz,
      b64: uint8ToBase64(compressed),
      rle: true,
    });
  });

  const p = state.player;
  const data = {
    v: 1,
    seed: state.seed,
    timeOfDay: state.timeOfDay,
    dayNumber: state.dayNumber,
    player: {
      px: p.position.x, py: p.position.y, pz: p.position.z,
      yaw: p.yaw, pitch: p.pitch,
      hp: p.hp, hunger: p.hunger, xp: p.xp, level: p.level,
      selectedSlot: p.inventory.selectedSlot,
      inventory: p.inventory,
      hasExcalibur: p.hasExcalibur,
      hasGrail: p.hasGrail,
      knightsRecruited: p.knightsRecruited,
    },
    chunks: savedChunks,
    quests: state.quests,
    creativeMode: state.creativeMode ?? false,
    containers: {
      chests: getAllChestData(),
      furnaces: getAllFurnaceData(),
    },
  };

  try {
    const json = JSON.stringify(data);
    localStorage.setItem(SAVE_KEY, json);
  } catch (e) {
    // Quota exceeded — clear old save and retry
    console.warn("[CraftSave] quota exceeded, clearing old save and retrying...");
    try {
      localStorage.removeItem(SAVE_KEY);
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e2) {
      console.warn("[CraftSave] save failed even after clearing", e2);
    }
  }
}

// --- Load ---

export function loadCraftWorld(): CraftState | null {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;

  try {
    const d = JSON.parse(raw);
    if (!d || d.v !== 1) return null;

    const state = createCraftState(d.seed);
    state.timeOfDay = d.timeOfDay ?? 0.3;
    state.dayNumber = d.dayNumber ?? 1;
    state.quests = (d.quests ?? []) as QuestState[];
    state.creativeMode = d.creativeMode ?? false;

    // Restore containers
    if (d.containers) {
      if (d.containers.chests) restoreChestData(d.containers.chests);
      if (d.containers.furnaces) restoreFurnaceData(d.containers.furnaces);
    }

    // Player
    const sp = d.player;
    const p = createPlayer();
    p.position.set(sp.px ?? 0, sp.py ?? 40, sp.pz ?? 0);
    p.yaw = sp.yaw ?? 0;
    p.pitch = sp.pitch ?? 0;
    p.hp = sp.hp ?? p.maxHp;
    p.hunger = sp.hunger ?? p.maxHunger;
    p.xp = sp.xp ?? 0;
    p.level = sp.level ?? 1;
    p.hasExcalibur = sp.hasExcalibur ?? false;
    p.hasGrail = sp.hasGrail ?? false;
    p.knightsRecruited = sp.knightsRecruited ?? 0;
    if (sp.inventory) {
      p.inventory = sp.inventory as CraftInventory;
      p.inventory.selectedSlot = sp.selectedSlot ?? 0;
    }
    state.player = p;

    // Chunks
    for (const sc of d.chunks ?? []) {
      const chunk = new CraftChunk(sc.cx, sc.cz);
      const raw = base64ToUint8(sc.b64);
      // Support both RLE-compressed and legacy uncompressed formats
      const data = sc.rle ? rleDecode(raw, chunk.blocks.length) : raw;
      chunk.blocks.set(data.subarray(0, chunk.blocks.length));
      chunk.populated = true;
      chunk.dirty = true;
      chunk.rebuildHeightMap();
      state.chunks.set(chunkKey(sc.cx, sc.cz), chunk);
    }

    return state;
  } catch (e) {
    console.warn("[CraftSave] load failed", e);
    return null;
  }
}

// --- Helpers ---

export function deleteCraftSave(): void {
  localStorage.removeItem(SAVE_KEY);
}

export function hasCraftSave(): boolean {
  return localStorage.getItem(SAVE_KEY) !== null;
}
