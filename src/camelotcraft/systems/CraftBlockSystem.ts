// ---------------------------------------------------------------------------
// Camelot Craft – Block placement, breaking (mining), and ray-cast
// ---------------------------------------------------------------------------

import { CB } from "../config/CraftBalance";
import { BlockType, BLOCK_DEFS, getBlockDrop, ToolMaterial } from "../config/CraftBlockDefs";
import { TOOL_SPEED } from "../config/CraftRecipeDefs";
import type { CraftState } from "../state/CraftState";
import { getWorldBlock, setWorldBlock, isWorldSolid, addMessage } from "../state/CraftState";
import { blockStack, addToInventory, getHeldItem, consumeDurability } from "../state/CraftInventory";
import { getChestContents, removeChest, getFurnaceState, removeFurnace } from "./CraftContainerSystem";
import { dropItem } from "./CraftItemDropSystem";
import * as THREE from "three";

// ---------------------------------------------------------------------------
// Ray-cast
// ---------------------------------------------------------------------------

export interface RayHit {
  wx: number; wy: number; wz: number;
  nx: number; ny: number; nz: number;
}

export function raycastBlock(
  state: CraftState,
  origin: { x: number; y: number; z: number },
  direction: { x: number; y: number; z: number },
  maxDist: number,
): RayHit | null {
  const len = Math.sqrt(direction.x ** 2 + direction.y ** 2 + direction.z ** 2);
  if (len === 0) return null;
  const dx = direction.x / len;
  const dy = direction.y / len;
  const dz = direction.z / len;

  let ix = Math.floor(origin.x);
  let iy = Math.floor(origin.y);
  let iz = Math.floor(origin.z);

  const stepX = dx >= 0 ? 1 : -1;
  const stepY = dy >= 0 ? 1 : -1;
  const stepZ = dz >= 0 ? 1 : -1;

  const tDeltaX = dx !== 0 ? Math.abs(1 / dx) : Infinity;
  const tDeltaY = dy !== 0 ? Math.abs(1 / dy) : Infinity;
  const tDeltaZ = dz !== 0 ? Math.abs(1 / dz) : Infinity;

  let tMaxX = dx !== 0 ? (dx > 0 ? ix + 1 - origin.x : origin.x - ix) * tDeltaX : Infinity;
  let tMaxY = dy !== 0 ? (dy > 0 ? iy + 1 - origin.y : origin.y - iy) * tDeltaY : Infinity;
  let tMaxZ = dz !== 0 ? (dz > 0 ? iz + 1 - origin.z : origin.z - iz) * tDeltaZ : Infinity;

  let t = 0;
  let nx = 0, ny = 0, nz = 0;

  while (t < maxDist) {
    if (isWorldSolid(state, ix, iy, iz)) {
      return { wx: ix, wy: iy, wz: iz, nx, ny, nz };
    }
    if (tMaxX < tMaxY) {
      if (tMaxX < tMaxZ) { t = tMaxX; ix += stepX; tMaxX += tDeltaX; nx = -stepX; ny = 0; nz = 0; }
      else { t = tMaxZ; iz += stepZ; tMaxZ += tDeltaZ; nx = 0; ny = 0; nz = -stepZ; }
    } else {
      if (tMaxY < tMaxZ) { t = tMaxY; iy += stepY; tMaxY += tDeltaY; nx = 0; ny = -stepY; nz = 0; }
      else { t = tMaxZ; iz += stepZ; tMaxZ += tDeltaZ; nx = 0; ny = 0; nz = -stepZ; }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Mining
// ---------------------------------------------------------------------------

export function startMining(state: CraftState, wx: number, wy: number, wz: number): void {
  const block = getWorldBlock(state, wx, wy, wz);
  if (block === BlockType.AIR || block === BlockType.BEDROCK) return;
  const def = BLOCK_DEFS[block];
  if (def && def.hardness < 0) return; // unbreakable
  state.player.miningTarget = { wx, wy, wz, progress: 0 };
}

export function updateMining(state: CraftState, dt: number): void {
  const target = state.player.miningTarget;
  if (!target) return;

  const { wx, wy, wz } = target;
  const block = getWorldBlock(state, wx, wy, wz);
  if (block === BlockType.AIR) { state.player.miningTarget = null; return; }

  const blockDef = BLOCK_DEFS[block];
  if (!blockDef || blockDef.hardness <= 0) { state.player.miningTarget = null; return; }

  // Mining speed from held tool
  const held = getHeldItem(state.player.inventory);
  let speedMult = 1;
  if (held && held.toolMaterial !== undefined) {
    const matSpeed = TOOL_SPEED[held.toolMaterial as ToolMaterial];
    if (matSpeed !== undefined) {
      speedMult = matSpeed;
      // Bonus if tool matches block's best tool
      if (held.toolType === blockDef.bestTool) {
        speedMult *= (1 / CB.MINE_TOOL_MULT);
      }
    }
  }
  // Excalibur override
  if (state.player.hasExcalibur && held?.toolMaterial === ToolMaterial.EXCALIBUR) {
    speedMult = 1 / CB.MINE_EXCALIBUR_MULT;
  }

  const totalTime = blockDef.hardness / speedMult;
  target.progress += dt / totalTime;

  if (target.progress >= 1.0) {
    // Mining complete

    // Drop container contents before destroying block
    if (block === BlockType.CHEST) {
      const contents = getChestContents(wx, wy, wz);
      for (const item of contents) {
        if (item && item.count > 0) {
          dropItem({ ...item }, new THREE.Vector3(wx + 0.5, wy + 1, wz + 0.5));
        }
      }
      removeChest(wx, wy, wz);
    } else if (block === BlockType.FURNACE) {
      const furnace = getFurnaceState(wx, wy, wz);
      const dropPos = new THREE.Vector3(wx + 0.5, wy + 1, wz + 0.5);
      if (furnace.inputSlot) dropItem({ ...furnace.inputSlot }, dropPos.clone());
      if (furnace.fuelSlot) dropItem({ ...furnace.fuelSlot }, dropPos.clone());
      if (furnace.outputSlot) dropItem({ ...furnace.outputSlot }, dropPos.clone());
      removeFurnace(wx, wy, wz);
    }

    setWorldBlock(state, wx, wy, wz, BlockType.AIR);

    const dropType = getBlockDrop(block);
    if (dropType !== BlockType.AIR) {
      const stack = blockStack(dropType, 1);
      addToInventory(state.player.inventory, stack);
    }

    // Consume tool durability
    if (held && held.durability !== undefined) {
      consumeDurability(state.player.inventory);
    }

    addMessage(state, `Mined ${blockDef.name}`);
    state.player.miningTarget = null;
  }
}

// ---------------------------------------------------------------------------
// Block placement
// ---------------------------------------------------------------------------

export function canPlaceAt(state: CraftState, wx: number, wy: number, wz: number): boolean {
  if (wy < 0 || wy >= CB.CHUNK_HEIGHT) return false;
  if (isWorldSolid(state, wx, wy, wz)) return false;

  // Prevent placing inside the player's AABB
  const p = state.player.position;
  const pw = 0.3;
  const ph = CB.PLAYER_HEIGHT;
  if (
    wx + 1 > p.x - pw && wx < p.x + pw &&
    wy + 1 > p.y       && wy < p.y + ph &&
    wz + 1 > p.z - pw && wz < p.z + pw
  ) {
    return false;
  }
  return true;
}

export function placeBlock(
  state: CraftState,
  wx: number, wy: number, wz: number,
  block: BlockType,
): boolean {
  if (!canPlaceAt(state, wx, wy, wz)) return false;

  const inv = state.player.inventory;
  const held = getHeldItem(inv);
  if (!held || held.count <= 0) return false;

  setWorldBlock(state, wx, wy, wz, block);

  // Consume one item from held stack
  held.count -= 1;
  if (held.count <= 0) {
    inv.hotbar[inv.selectedSlot] = null;
  }

  addMessage(state, `Placed ${BLOCK_DEFS[block]?.name ?? "block"}`);
  return true;
}
