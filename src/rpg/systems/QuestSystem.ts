// Quest management — accept, track kills, complete, and reward
import { EventBus } from "@sim/core/EventBus";
import type { RPGState, QuestState } from "@rpg/state/RPGState";
import { getQuestDefForNPC } from "@rpg/config/QuestDefs";

/** Accept a quest and add it to the player's active quests. */
export function acceptQuest(rpg: RPGState, quest: QuestState): void {
  // Don't accept duplicates
  if (rpg.quests.some(q => q.id === quest.id)) return;
  if (rpg.completedQuests.has(quest.id)) return;

  // Deep-clone objectives so each playthrough is independent
  const clone: QuestState = {
    ...quest,
    objectives: quest.objectives.map(o => ({ ...o, current: 0 })),
    isComplete: false,
  };
  rpg.quests.push(clone);
  EventBus.emit("rpgQuestAccepted", { questId: quest.id });
}

/** Update kill objectives for active quests after winning an encounter. */
export function updateKillObjective(rpg: RPGState, encounterId: string): void {
  for (const quest of rpg.quests) {
    if (quest.isComplete) continue;
    for (const obj of quest.objectives) {
      if (obj.type === "kill" && obj.targetId === encounterId) {
        obj.current = Math.min(obj.current + 1, obj.required);
      }
    }
  }
}

/** Check all active quests for completion. Returns completed quest IDs. */
export function checkQuestCompletion(rpg: RPGState): string[] {
  const completed: string[] = [];

  for (const quest of rpg.quests) {
    if (quest.isComplete) continue;
    const allDone = quest.objectives.every(o => o.current >= o.required);
    if (allDone) {
      quest.isComplete = true;
      completed.push(quest.id);
    }
  }

  return completed;
}

/** Claim rewards for a completed quest. Removes it from active and adds to completed. */
export function claimQuestReward(rpg: RPGState, questId: string): boolean {
  const idx = rpg.quests.findIndex(q => q.id === questId && q.isComplete);
  if (idx < 0) return false;

  const quest = rpg.quests[idx];
  rpg.gold += quest.reward.gold;

  // Distribute XP to party
  for (const member of rpg.party) {
    member.xp += quest.reward.xp;
  }

  // Add reward items
  if (quest.reward.items) {
    for (const item of quest.reward.items) {
      const existing = rpg.inventory.items.find(s => s.item.id === item.id);
      if (existing) {
        existing.quantity++;
      } else if (rpg.inventory.items.length < rpg.inventory.maxSlots) {
        rpg.inventory.items.push({ item, quantity: 1 });
      }
    }
  }

  rpg.quests.splice(idx, 1);
  rpg.completedQuests.add(questId);
  EventBus.emit("rpgQuestCompleted", { questId });
  return true;
}

/** Get available quest for an NPC (not yet active or completed). */
export function getAvailableQuest(rpg: RPGState, npcId: string): QuestState | null {
  const def = getQuestDefForNPC(npcId);
  if (!def) return null;
  if (rpg.quests.some(q => q.id === def.quest.id)) return null;
  if (rpg.completedQuests.has(def.quest.id)) return null;
  return def.quest;
}

/** Get active quest for an NPC (already accepted). */
export function getActiveQuest(rpg: RPGState, npcId: string): QuestState | null {
  const def = getQuestDefForNPC(npcId);
  if (!def) return null;
  return rpg.quests.find(q => q.id === def.quest.id) ?? null;
}
