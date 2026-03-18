// ---------------------------------------------------------------------------
// Camelot Craft – Furnace smelting & chest storage system
// ---------------------------------------------------------------------------

import { BlockType, BLOCK_DEFS } from "../config/CraftBlockDefs";
import { ItemType, type ItemStack } from "../config/CraftRecipeDefs";
import { getSmeltResult } from "./CraftCraftingSystem";
import type { CraftState } from "../state/CraftState";
import { getWorldBlock } from "../state/CraftState";

// ---------------------------------------------------------------------------
// Container storage (chests)
// ---------------------------------------------------------------------------

/** Storage keyed by world position "wx,wy,wz". */
const _chestContents = new Map<string, (ItemStack | null)[]>();
const CHEST_SLOTS = 27; // 3 rows × 9 cols

function chestKey(wx: number, wy: number, wz: number): string {
  return `${wx},${wy},${wz}`;
}

export function getChestContents(wx: number, wy: number, wz: number): (ItemStack | null)[] {
  const key = chestKey(wx, wy, wz);
  if (!_chestContents.has(key)) {
    _chestContents.set(key, new Array(CHEST_SLOTS).fill(null));
  }
  return _chestContents.get(key)!;
}

export function setChestSlot(wx: number, wy: number, wz: number, slot: number, item: ItemStack | null): void {
  const contents = getChestContents(wx, wy, wz);
  if (slot >= 0 && slot < CHEST_SLOTS) {
    contents[slot] = item;
  }
}

export function removeChest(wx: number, wy: number, wz: number): void {
  _chestContents.delete(chestKey(wx, wy, wz));
}

// ---------------------------------------------------------------------------
// Furnace smelting
// ---------------------------------------------------------------------------

export interface FurnaceState {
  inputSlot: ItemStack | null;
  fuelSlot: ItemStack | null;
  outputSlot: ItemStack | null;
  smeltProgress: number;    // 0..1
  smeltTime: number;        // total time for current smelt
  burnTimeLeft: number;     // remaining fuel burn time
  burnTimeTotal: number;    // total burn time of current fuel
}

const _furnaces = new Map<string, FurnaceState>();

function furnaceKey(wx: number, wy: number, wz: number): string {
  return `${wx},${wy},${wz}`;
}

export function getFurnaceState(wx: number, wy: number, wz: number): FurnaceState {
  const key = furnaceKey(wx, wy, wz);
  if (!_furnaces.has(key)) {
    _furnaces.set(key, {
      inputSlot: null,
      fuelSlot: null,
      outputSlot: null,
      smeltProgress: 0,
      smeltTime: 10,
      burnTimeLeft: 0,
      burnTimeTotal: 0,
    });
  }
  return _furnaces.get(key)!;
}

/** Fuel burn times in seconds. */
const FUEL_TIMES: Partial<Record<BlockType, number>> = {
  [BlockType.OAK_LOG]: 15,
  [BlockType.OAK_PLANKS]: 10,
  [BlockType.DARK_OAK_LOG]: 15,
  [BlockType.WILLOW_LOG]: 15,
  [BlockType.COBBLESTONE]: 0, // not fuel
};

function getFuelTime(item: ItemStack | null): number {
  if (!item || item.itemType !== ItemType.BLOCK || item.blockType === undefined) return 0;
  // Wood-based blocks are fuel
  const bt = item.blockType;
  if (FUEL_TIMES[bt] !== undefined) return FUEL_TIMES[bt]!;
  // Generic wood detection
  const name = BLOCK_DEFS[bt]?.name.toLowerCase() ?? "";
  if (name.includes("log") || name.includes("plank")) return 10;
  return 0;
}

/** Update all active furnaces. Call each frame. */
export function updateFurnaces(_state: CraftState, dt: number): void {
  for (const [, furnace] of _furnaces) {
    // Burn fuel
    if (furnace.burnTimeLeft > 0) {
      furnace.burnTimeLeft -= dt;
    }

    // Check if we can smelt
    if (furnace.inputSlot && furnace.inputSlot.count > 0) {
      const recipe = furnace.inputSlot.blockType !== undefined
        ? getSmeltResult(furnace.inputSlot.blockType)
        : null;

      if (recipe) {
        // Need fuel?
        if (furnace.burnTimeLeft <= 0) {
          // Try to consume fuel
          if (furnace.fuelSlot && furnace.fuelSlot.count > 0) {
            const fuelTime = getFuelTime(furnace.fuelSlot);
            if (fuelTime > 0) {
              furnace.burnTimeLeft = fuelTime;
              furnace.burnTimeTotal = fuelTime;
              furnace.fuelSlot.count--;
              if (furnace.fuelSlot.count <= 0) furnace.fuelSlot = null;
            }
          }
        }

        // Smelting progress
        if (furnace.burnTimeLeft > 0) {
          furnace.smeltTime = recipe.time;
          furnace.smeltProgress += dt / recipe.time;

          if (furnace.smeltProgress >= 1.0) {
            furnace.smeltProgress = 0;

            // Produce output
            if (!furnace.outputSlot) {
              furnace.outputSlot = { ...recipe.result };
            } else if (
              furnace.outputSlot.blockType === recipe.result.blockType &&
              furnace.outputSlot.count < 64
            ) {
              furnace.outputSlot.count += recipe.result.count;
            }

            // Consume input
            furnace.inputSlot.count--;
            if (furnace.inputSlot.count <= 0) furnace.inputSlot = null;
          }
        } else {
          // No fuel, progress decays
          furnace.smeltProgress = Math.max(0, furnace.smeltProgress - dt * 0.5);
        }
      } else {
        furnace.smeltProgress = 0;
      }
    } else {
      furnace.smeltProgress = 0;
    }
  }
}

export function removeFurnace(wx: number, wy: number, wz: number): void {
  _furnaces.delete(furnaceKey(wx, wy, wz));
}

// ---------------------------------------------------------------------------
// Serialization helpers (for save system)
// ---------------------------------------------------------------------------

export function getAllChestData(): [string, (ItemStack | null)[]][] {
  return Array.from(_chestContents.entries());
}

export function getAllFurnaceData(): [string, FurnaceState][] {
  return Array.from(_furnaces.entries());
}

export function restoreChestData(entries: [string, (ItemStack | null)[]][]): void {
  _chestContents.clear();
  for (const [key, contents] of entries) {
    _chestContents.set(key, contents);
  }
}

export function restoreFurnaceData(entries: [string, FurnaceState][]): void {
  _furnaces.clear();
  for (const [key, state] of entries) {
    _furnaces.set(key, state);
  }
}

// ---------------------------------------------------------------------------
// Interaction dispatcher
// ---------------------------------------------------------------------------

export type ContainerInteraction =
  | { type: "chest"; wx: number; wy: number; wz: number; contents: (ItemStack | null)[] }
  | { type: "furnace"; wx: number; wy: number; wz: number; furnace: FurnaceState }
  | null;

/** Check if the targeted block is an interactive container. */
export function getContainerInteraction(
  state: CraftState,
  wx: number, wy: number, wz: number,
): ContainerInteraction {
  const block = getWorldBlock(state, wx, wy, wz);

  if (block === BlockType.CHEST) {
    return { type: "chest", wx, wy, wz, contents: getChestContents(wx, wy, wz) };
  }

  if (block === BlockType.FURNACE) {
    return { type: "furnace", wx, wy, wz, furnace: getFurnaceState(wx, wy, wz) };
  }

  return null;
}
