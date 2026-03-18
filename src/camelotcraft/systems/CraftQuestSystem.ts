/**
 * CraftQuestSystem.ts
 * --------------------
 * Quest tracking system for Camelot Craft.
 * Manages progress for each quest based on in-game events (block placed,
 * block mined, item crafted, mob killed) and checks overall victory.
 */

import {
  type CraftState,
  QuestId,
  type QuestState,
  addMessage,
} from "../state/CraftState";
import { BlockType } from "../config/CraftBlockDefs";
import { MobType } from "../config/CraftMobDefs";
import { ItemType, type ItemStack } from "../config/CraftRecipeDefs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Retrieve a quest by id, or undefined if not found. */
function getQuest(state: CraftState, id: QuestId): QuestState | undefined {
  return state.quests.find((q) => q.id === id);
}

/** Mark a quest complete, announce it, and clamp progress to goal. */
function completeQuest(state: CraftState, quest: QuestState): void {
  if (quest.completed) return;
  quest.progress = quest.goal;
  quest.completed = true;
  addMessage(state, `Quest complete: ${quest.name}!`, 0xFFD700);
}

// ---------------------------------------------------------------------------
// Per-frame update — checks conditions that can change at any time
// ---------------------------------------------------------------------------

/**
 * Called every frame (or tick). Evaluates quest conditions that are not
 * purely event-driven but depend on world / player state.
 */
export function updateQuests(state: CraftState): void {
  for (const quest of state.quests) {
    if (quest.completed) continue;

    switch (quest.id) {
      // BUILD_SHELTER progress is driven by onBlockPlaced; just clamp-check.
      case QuestId.BUILD_SHELTER:
        if (quest.progress >= quest.goal) {
          completeQuest(state, quest);
        }
        break;

      // A tool anywhere in inventory satisfies this quest.
      case QuestId.CRAFT_FIRST_TOOL: {
        const inv = state.player.inventory;
        const slots = [...inv.hotbar, ...inv.main];
        const hasTool = slots.some(
          (s) => s !== null && s.itemType === ItemType.TOOL,
        );
        if (hasTool) {
          completeQuest(state, quest);
        }
        break;
      }

      // MINE_IRON progress is driven by onBlockMined; just clamp-check.
      case QuestId.MINE_IRON:
        if (quest.progress >= quest.goal) {
          completeQuest(state, quest);
        }
        break;

      case QuestId.FIND_EXCALIBUR:
        if (state.player.hasExcalibur) {
          completeQuest(state, quest);
        }
        break;

      // Simplified castle detection: the world must contain at least one
      // THRONE, one ROUND_TABLE, and enough CASTLE_WALL blocks.
      case QuestId.BUILD_CASTLE: {
        let hasThrone = false;
        let hasRoundTable = false;
        let wallCount = 0;

        for (const chunk of state.chunks.values()) {
          const data = chunk.blocks;
          for (let i = 0, len = data.length; i < len; i++) {
            const bt = data[i];
            if (bt === BlockType.THRONE) hasThrone = true;
            else if (bt === BlockType.ROUND_TABLE) hasRoundTable = true;
            else if (bt === BlockType.CASTLE_WALL) wallCount++;
          }
        }

        // Progress: count how many of the three conditions are met.
        // Each condition is one "room-equivalent" toward the goal.
        let met = 0;
        if (hasThrone) met++;
        if (hasRoundTable) met++;
        // Require a healthy amount of castle wall (roughly 50 per room)
        const roomsFromWalls = Math.min(
          quest.goal - 2, // remaining slots after throne + table
          Math.floor(wallCount / 50),
        );
        met += roomsFromWalls;

        quest.progress = Math.min(met, quest.goal);
        if (quest.progress >= quest.goal) {
          completeQuest(state, quest);
        }
        break;
      }

      case QuestId.RECRUIT_KNIGHTS:
        quest.progress = state.player.knightsRecruited;
        if (quest.progress >= quest.goal) {
          completeQuest(state, quest);
        }
        break;

      // DEFEAT_DRAGON progress is driven by onMobKilled; just clamp-check.
      case QuestId.DEFEAT_DRAGON:
        if (quest.progress >= quest.goal) {
          completeQuest(state, quest);
        }
        break;

      case QuestId.FIND_GRAIL:
        if (state.player.hasGrail) {
          completeQuest(state, quest);
        }
        break;
    }
  }
}

// ---------------------------------------------------------------------------
// Event hooks — called by other systems when something happens
// ---------------------------------------------------------------------------

/**
 * Called when the player places a block.
 * Increments BUILD_SHELTER progress regardless of block type.
 */
export function onBlockPlaced(state: CraftState, _blockType: BlockType): void {
  const quest = getQuest(state, QuestId.BUILD_SHELTER);
  if (quest && !quest.completed) {
    quest.progress++;
  }
}

/**
 * Called when the player mines (breaks) a block.
 * Increments MINE_IRON progress if the block was iron ore.
 */
export function onBlockMined(state: CraftState, blockType: BlockType): void {
  if (blockType === BlockType.IRON_ORE) {
    const quest = getQuest(state, QuestId.MINE_IRON);
    if (quest && !quest.completed) {
      quest.progress++;
    }
  }
}

/**
 * Called when the player crafts an item.
 * Checks CRAFT_FIRST_TOOL if the crafted item is a tool.
 */
export function onItemCrafted(state: CraftState, item: ItemStack): void {
  if (item.itemType === ItemType.TOOL) {
    const quest = getQuest(state, QuestId.CRAFT_FIRST_TOOL);
    if (quest && !quest.completed) {
      quest.progress = 1;
    }
  }
}

/**
 * Called when a mob is killed by the player.
 * Checks DEFEAT_DRAGON if the killed mob was a dragon.
 */
export function onMobKilled(state: CraftState, mobType: MobType): void {
  if (mobType === MobType.DRAGON) {
    const quest = getQuest(state, QuestId.DEFEAT_DRAGON);
    if (quest && !quest.completed) {
      quest.progress++;
    }
  }
}

// ---------------------------------------------------------------------------
// Victory condition
// ---------------------------------------------------------------------------

/**
 * Returns true when every quest in the game has been completed.
 */
export function checkVictory(state: CraftState): boolean {
  return state.quests.every((q) => q.completed);
}
