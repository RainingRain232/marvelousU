// ---------------------------------------------------------------------------
// Camelot Craft – LocalStorage save/load
// ---------------------------------------------------------------------------

import { createCraftState, createPlayer, type CraftState, type QuestState } from "../state/CraftState";
import { CraftChunk, chunkKey } from "../state/CraftChunk";
import type { CraftInventory } from "../state/CraftInventory";

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

// --- Save ---

export function saveCraftWorld(state: CraftState): void {
  const savedChunks: { cx: number; cz: number; b64: string }[] = [];

  state.chunks.forEach((chunk) => {
    if (!chunk.populated) return;
    savedChunks.push({
      cx: chunk.cx,
      cz: chunk.cz,
      b64: uint8ToBase64(chunk.blocks),
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
  };

  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("[CraftSave] save failed", e);
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
      const data = base64ToUint8(sc.b64);
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
