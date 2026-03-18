// ---------------------------------------------------------------------------
// Terraria – Quest progression system
// ---------------------------------------------------------------------------

import { QuestId } from "../state/TerrariaState";
import type { TerrariaState } from "../state/TerrariaState";
import { addMessage } from "../state/TerrariaState";

export function updateQuests(state: TerrariaState): void {
  const p = state.player;
  const q = state.quests;

  // BUILD_SHELTER: place 20 blocks
  _checkProgress(state, QuestId.BUILD_SHELTER, p.blocksPlaced);

  // CRAFT_FIRST_TOOL: craft at Round Table (tracked externally, set to 1 when crafted)
  // Already tracked via craftRecipe callback

  // MINE_IRON: mine 10 iron ore (count iron in inventory + already mined)
  // We track through blocksMined, but a simpler check:
  // Note: this is approximate - check if quest progress was bumped by caller
  _checkProgress(state, QuestId.MINE_IRON, q[QuestId.MINE_IRON].progress);

  // FIND_EXCALIBUR
  if (p.hasExcalibur) _checkProgress(state, QuestId.FIND_EXCALIBUR, 1);

  // BUILD_CASTLE: place 200+ blocks total
  _checkProgress(state, QuestId.BUILD_CASTLE, p.blocksPlaced);

  // RECRUIT_KNIGHTS
  _checkProgress(state, QuestId.RECRUIT_KNIGHTS, p.knightsRecruited);

  // DEFEAT_DRAGON: tracked via mobsKilled or flag
  _checkProgress(state, QuestId.DEFEAT_DRAGON, q[QuestId.DEFEAT_DRAGON].progress);

  // FIND_GRAIL
  if (p.hasGrail) _checkProgress(state, QuestId.FIND_GRAIL, 1);

  // Unlock cascade
  if (q[QuestId.CRAFT_FIRST_TOOL].completed) {
    _unlock(state, QuestId.MINE_IRON);
    _unlock(state, QuestId.FIND_EXCALIBUR);
  }
  if (q[QuestId.FIND_EXCALIBUR].completed) {
    _unlock(state, QuestId.BUILD_CASTLE);
    _unlock(state, QuestId.RECRUIT_KNIGHTS);
  }
  if (q[QuestId.BUILD_CASTLE].completed && q[QuestId.RECRUIT_KNIGHTS].completed) {
    _unlock(state, QuestId.DEFEAT_DRAGON);
    _unlock(state, QuestId.FIND_GRAIL);
  }

  // Victory check
  if (q[QuestId.FIND_GRAIL].completed && !state.victory) {
    state.victory = true;
    addMessage(state, "VICTORY! Thou hast found the Holy Grail!", 0xFFD700);
    addMessage(state, "The legend of Camelot shall endure forevermore.", 0xC0A060);
  }
}

function _checkProgress(state: TerrariaState, questId: QuestId, newProgress: number): void {
  const quest = state.quests[questId];
  if (!quest || quest.completed || !quest.unlocked) return;
  quest.progress = Math.min(newProgress, quest.goal);
  if (quest.progress >= quest.goal) {
    quest.completed = true;
    addMessage(state, `Quest complete: ${quest.name}!`, 0xFFD700);
  }
}

function _unlock(state: TerrariaState, questId: QuestId): void {
  const quest = state.quests[questId];
  if (!quest || quest.unlocked) return;
  quest.unlocked = true;
  addMessage(state, `New quest: ${quest.name}`, 0xC0A060);
}

/** Call when player mines iron ore specifically. */
export function onIronMined(state: TerrariaState): void {
  state.quests[QuestId.MINE_IRON].progress++;
}

/** Call when player crafts at a station. */
export function onCrafted(state: TerrariaState): void {
  if (!state.quests[QuestId.CRAFT_FIRST_TOOL].completed) {
    state.quests[QuestId.CRAFT_FIRST_TOOL].progress = 1;
  }
}

/** Call when dragon is killed. */
export function onDragonKilled(state: TerrariaState): void {
  state.quests[QuestId.DEFEAT_DRAGON].progress = 1;
}
