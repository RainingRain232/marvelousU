// Quest definitions for RPG mode — tied to NPCs via npcId
import type { QuestState } from "@rpg/state/RPGState";

export interface QuestDef {
  npcId: string;
  quest: QuestState;
}

export const QUEST_DEFS: QuestDef[] = [
  {
    npcId: "npc_0", // Wandering Scholar
    quest: {
      id: "quest_goblin_cleanup",
      name: "Goblin Cleanup",
      description: "Clear out goblin patrols from the area. Defeat 3 goblin encounters.",
      objectives: [{ type: "kill", targetId: "goblin_patrol", current: 0, required: 3 }],
      isComplete: false,
      reward: { gold: 50, xp: 30 },
    },
  },
  {
    npcId: "npc_1", // Old Hermit
    quest: {
      id: "quest_undead_menace",
      name: "Undead Menace",
      description: "The Dark Crypt is overrun. Defeat 4 undead encounters.",
      objectives: [{ type: "kill", targetId: "dungeon_undead", current: 0, required: 4 }],
      isComplete: false,
      reward: { gold: 100, xp: 80 },
    },
  },
  {
    npcId: "npc_2", // Traveling Merchant
    quest: {
      id: "quest_road_safety",
      name: "Road Safety",
      description: "Bandits threaten the trade routes. Defeat 3 bandit ambushes.",
      objectives: [{ type: "kill", targetId: "bandit_ambush", current: 0, required: 3 }],
      isComplete: false,
      reward: { gold: 60, xp: 40 },
    },
  },
  {
    npcId: "npc_3", // Lost Knight
    quest: {
      id: "quest_spider_infestation",
      name: "Spider Infestation",
      description: "The dungeons crawl with giant spiders. Defeat 4 spider encounters.",
      objectives: [{ type: "kill", targetId: "dungeon_spiders", current: 0, required: 4 }],
      isComplete: false,
      reward: { gold: 70, xp: 50 },
    },
  },
  {
    npcId: "npc_4", // Forest Witch
    quest: {
      id: "quest_dragon_slayer",
      name: "Dragon Slayer",
      description: "Slay the Red Dragon in the Dragon's Lair. Only the strongest survive.",
      objectives: [{ type: "kill", targetId: "boss_dragon", current: 0, required: 1 }],
      isComplete: false,
      reward: { gold: 300, xp: 200 },
    },
  },
  // =========================================================================
  // Leader quests — tied to legendary leader NPCs
  // =========================================================================
  {
    npcId: "leader_arthur",
    quest: {
      id: "quest_round_table_errand",
      name: "The Round Table's Errand",
      description: "King Arthur asks you to prove your worth against the Dark Knights threatening the realm. Defeat 3 Dark Knight Squads.",
      objectives: [{ type: "kill", targetId: "dark_knight_squad", current: 0, required: 3 }],
      isComplete: false,
      reward: { gold: 200, xp: 300 },
    },
  },
  {
    npcId: "leader_merlin",
    quest: {
      id: "quest_sorcerers_trial",
      name: "The Sorcerer's Trial",
      description: "Merlin challenges you to confront the rogue mages corrupting the ley lines. Defeat 2 Warlock Covens.",
      objectives: [{ type: "kill", targetId: "warlock_coven", current: 0, required: 2 }],
      isComplete: false,
      reward: { gold: 150, xp: 250 },
    },
  },
  {
    npcId: "leader_bedivere",
    quest: {
      id: "quest_last_knights_oath",
      name: "The Last Knight's Oath",
      description: "Bedivere asks you to honour the fallen Round Table by crushing the Undead Legion. Defeat 3 Undead Legion encounters.",
      objectives: [{ type: "kill", targetId: "undead_legion", current: 0, required: 3 }],
      isComplete: false,
      reward: { gold: 250, xp: 350 },
    },
  },
];

/** Look up quest def by NPC ID. */
export function getQuestDefForNPC(npcId: string): QuestDef | undefined {
  return QUEST_DEFS.find(q => q.npcId === npcId);
}
