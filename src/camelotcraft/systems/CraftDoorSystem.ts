// ---------------------------------------------------------------------------
// Camelot Craft – Door open/close system
// ---------------------------------------------------------------------------

import { BlockType } from "../config/CraftBlockDefs";
import type { CraftState } from "../state/CraftState";
import { getWorldBlock, setWorldBlock } from "../state/CraftState";

/**
 * Track open/closed state for doors. Open doors become air (passable),
 * closed doors are solid. We store the original block type so we can
 * restore it when closing.
 */
const _openDoors = new Map<string, BlockType>();

function doorKey(wx: number, wy: number, wz: number): string {
  return `${wx},${wy},${wz}`;
}

/** Check if a block is a door type. */
export function isDoor(block: BlockType): boolean {
  return block === BlockType.WOODEN_DOOR || block === BlockType.IRON_DOOR;
}

/** Toggle a door open/closed. Returns true if toggled. */
export function toggleDoor(state: CraftState, wx: number, wy: number, wz: number): boolean {
  const key = doorKey(wx, wy, wz);
  const currentBlock = getWorldBlock(state, wx, wy, wz);

  if (isDoor(currentBlock)) {
    // Door is closed → open it (replace with air)
    _openDoors.set(key, currentBlock);
    setWorldBlock(state, wx, wy, wz, BlockType.AIR);
    // Also check block above/below for double-height doors
    const above = getWorldBlock(state, wx, wy + 1, wz);
    if (isDoor(above)) {
      _openDoors.set(doorKey(wx, wy + 1, wz), above);
      setWorldBlock(state, wx, wy + 1, wz, BlockType.AIR);
    }
    return true;
  }

  if (currentBlock === BlockType.AIR && _openDoors.has(key)) {
    // Door is open → close it (restore original block)
    const original = _openDoors.get(key)!;
    setWorldBlock(state, wx, wy, wz, original);
    _openDoors.delete(key);
    // Also restore above
    const aboveKey = doorKey(wx, wy + 1, wz);
    if (_openDoors.has(aboveKey)) {
      setWorldBlock(state, wx, wy + 1, wz, _openDoors.get(aboveKey)!);
      _openDoors.delete(aboveKey);
    }
    return true;
  }

  return false;
}

/** Check if a position has an open door (for pathfinding). */
export function isDoorOpen(wx: number, wy: number, wz: number): boolean {
  return _openDoors.has(doorKey(wx, wy, wz));
}
