// ---------------------------------------------------------------------------
// Terraria – Block mining, placing, interaction
// ---------------------------------------------------------------------------

import { TB } from "../config/TerrariaBalance";
import { BlockType, getBlockDef } from "../config/TerrariaBlockDefs";
import type { TerrariaState } from "../state/TerrariaState";
import { getWorldBlock, setWorldBlock, addMessage } from "../state/TerrariaState";
import { getHeldItem, addToInventory, createBlockItem, removeFromSlot } from "../state/TerrariaInventory";
import { ItemCategory } from "../state/TerrariaInventory";
import { recalcLightingLocal } from "./TerrariaLightingSystem";
import { onIronMined } from "./TerrariaQuestSystem";
import type { InputState } from "./TerrariaInputSystem";
import type { TerrariaCamera } from "../view/TerrariaCamera";

// ---------------------------------------------------------------------------
// Mining
// ---------------------------------------------------------------------------

export function updateMining(state: TerrariaState, input: InputState, camera: TerrariaCamera, dt: number): void {
  const p = state.player;

  // Convert mouse to world coords
  const { wx: rawWX, wy: rawWY } = camera.screenToWorld(input.mouseX, input.mouseY);
  const targetX = Math.floor(rawWX);
  const targetY = Math.floor(rawWY);

  // Check reach distance
  const dx = targetX + 0.5 - p.x;
  const dy = targetY + 0.5 - p.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const inReach = dist <= TB.PLAYER_REACH;

  // Update facing direction based on mouse
  p.facingRight = rawWX > p.x;

  // Update hover target for placement preview (always show, even out of reach)
  if (!state.inventoryOpen && !state.paused) {
    const bt = getWorldBlock(state, targetX, targetY);
    const heldForPlace = getHeldItem(p.inventory);
    const canPlace = inReach && bt === BlockType.AIR && heldForPlace !== null && heldForPlace.category === ItemCategory.BLOCK && heldForPlace.blockType !== undefined && _hasAdjacentSolid(state, targetX, targetY);
    p.hoverTarget = { wx: targetX, wy: targetY, canPlace, canReach: inReach };
  } else {
    p.hoverTarget = null;
  }

  // Only mine when holding a tool, block, or empty hand (not weapons)
  const heldItem = getHeldItem(p.inventory);
  const holdingWeapon = heldItem !== null && heldItem.category === ItemCategory.WEAPON;

  if (input.attack && inReach && !state.inventoryOpen && !state.paused && !holdingWeapon) {
    const bt = getWorldBlock(state, targetX, targetY);
    if (bt !== BlockType.AIR) {
      const def = getBlockDef(bt);
      if (def.hardness < 0) {
        // Unbreakable
        p.miningTarget = null;
        return;
      }

      // Check if target changed
      if (!p.miningTarget || p.miningTarget.wx !== targetX || p.miningTarget.wy !== targetY) {
        p.miningTarget = { wx: targetX, wy: targetY, progress: 0 };
      }

      // Calculate mining speed
      let mineTime = def.hardness > 0 ? def.hardness : TB.BASE_MINE_TIME;
      const held = getHeldItem(p.inventory);
      if (held && held.toolType && held.toolType === def.bestTool) {
        mineTime *= TB.TOOL_SPEED_MULT;
      }
      if (state.creativeMode) mineTime = 0.05;

      p.miningTarget.progress += dt / mineTime;

      if (p.miningTarget.progress >= 1) {
        // Block broken!
        const dropType = def.drops ?? bt;
        const dropDef = getBlockDef(dropType);

        setWorldBlock(state, targetX, targetY, BlockType.AIR);
        recalcLightingLocal(state, targetX, targetY);

        // Drop item
        const item = createBlockItem(dropType, dropDef.name, dropDef.color);
        addToInventory(p.inventory, item);
        p.blocksMined++;

        // Track iron mining for quest
        if (bt === BlockType.IRON_ORE) onIronMined(state);

        // Degrade tool
        if (held && held.durability !== undefined) {
          held.durability--;
          if (held.durability <= 0) {
            const idx = p.inventory.selectedSlot;
            removeFromSlot(p.inventory, true, idx);
            addMessage(state, `${held.displayName} broke!`, 0xFF4444);
          }
        }

        p.miningTarget = null;
      }
    } else {
      p.miningTarget = null;
    }
  } else {
    if (p.miningTarget) p.miningTarget = null;
  }

  // Block placing (right click)
  if (input.place && inReach && !state.inventoryOpen && !state.paused) {
    const bt = getWorldBlock(state, targetX, targetY);
    if (bt === BlockType.AIR) {
      const held = getHeldItem(p.inventory);
      if (held && held.category === ItemCategory.BLOCK && held.blockType !== undefined) {
        // Don't place inside player
        const playerMinX = p.x - TB.PLAYER_WIDTH / 2;
        const playerMaxX = p.x + TB.PLAYER_WIDTH / 2;
        const playerMinY = p.y - TB.PLAYER_HEIGHT / 2;
        const playerMaxY = p.y + TB.PLAYER_HEIGHT / 2;
        const insidePlayer = !(targetX + 1 <= playerMinX || targetX >= playerMaxX ||
            targetY + 1 <= playerMinY || targetY >= playerMaxY);
        // Must have an adjacent solid block (can't place in midair)
        const hasAdjacent = _hasAdjacentSolid(state, targetX, targetY);

        if (!insidePlayer && hasAdjacent) {
          setWorldBlock(state, targetX, targetY, held.blockType);
          recalcLightingLocal(state, targetX, targetY);
          removeFromSlot(p.inventory, true, p.inventory.selectedSlot);
          p.blocksPlaced++;
        }
      }
    } else {
      // Interact with functional blocks
      if (bt === BlockType.ROUND_TABLE) {
        state.craftingOpen = true;
        state.craftingStation = "round_table";
        state.inventoryOpen = true;
      } else if (bt === BlockType.FORGE) {
        state.craftingOpen = true;
        state.craftingStation = "forge";
        state.inventoryOpen = true;
      }
    }
  }

  // Clear mining target when holding a weapon
  if (holdingWeapon && p.miningTarget) p.miningTarget = null;
}

/** Check if a target position has at least one adjacent solid block. */
function _hasAdjacentSolid(state: TerrariaState, wx: number, wy: number): boolean {
  const dirs: [number, number][] = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  for (const [dx, dy] of dirs) {
    const nx = wx + dx;
    const ny = wy + dy;
    if (nx < 0 || nx >= state.worldWidth || ny < 0 || ny >= state.worldHeight) continue;
    const bt = getWorldBlock(state, nx, ny);
    if (bt !== BlockType.AIR) {
      const def = getBlockDef(bt);
      if (def.solid) return true;
    }
  }
  return false;
}
