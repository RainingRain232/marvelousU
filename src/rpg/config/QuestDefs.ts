// Quest definitions for RPG mode — tied to NPCs via npcId
import type { QuestState } from "@rpg/state/RPGState";
import { UnitType } from "@/types";
import { ITEM_FLAMEBLADE } from "@rpg/config/RPGItemDefs";

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
  // =========================================================================
  // Main quest line — the Shattered Crown saga
  // =========================================================================
  {
    npcId: "main_quest",
    quest: {
      id: "quest_shard_1",
      name: "The First Shard",
      description: "Defeat the Troll King to recover the first shard of the Shattered Crown.",
      objectives: [{ type: "kill", targetId: "boss_troll_king", current: 0, required: 1 }],
      isComplete: false,
      reward: { gold: 100, xp: 100 },
    },
  },
  {
    npcId: "main_quest",
    quest: {
      id: "quest_shard_2",
      name: "Echoes of the Dead",
      description: "The Lich Lord guards the second shard deep within the Dark Crypt. Destroy him.",
      objectives: [{ type: "kill", targetId: "boss_lich", current: 0, required: 1 }],
      isComplete: false,
      reward: { gold: 200, xp: 200 },
    },
  },
  {
    npcId: "main_quest",
    quest: {
      id: "quest_shard_3",
      name: "Dragon's Hoard",
      description: "The Red Dragon hoards the third shard in its volcanic lair. Slay the beast.",
      objectives: [{ type: "kill", targetId: "boss_dragon", current: 0, required: 1 }],
      isComplete: false,
      reward: { gold: 300, xp: 300 },
    },
  },
  {
    npcId: "main_quest",
    quest: {
      id: "quest_shard_4",
      name: "The Demon Gate",
      description: "Demon Lord Azgaroth holds the fourth shard within the Demon Fortress. End his reign.",
      objectives: [{ type: "kill", targetId: "boss_demon_lord", current: 0, required: 1 }],
      isComplete: false,
      reward: { gold: 500, xp: 500 },
    },
  },
  {
    npcId: "main_quest",
    quest: {
      id: "quest_shard_5",
      name: "The Dark One Rises",
      description: "The Dark One has awakened in the Abyssal Sanctum. Gather all shards and face the final evil.",
      objectives: [{ type: "kill", targetId: "boss_final", current: 0, required: 1 }],
      isComplete: false,
      reward: { gold: 1000, xp: 1000 },
    },
  },
  // =========================================================================
  // Branching (choice) quests
  // =========================================================================
  {
    npcId: "npc_5",
    quest: {
      id: "quest_bandit_leader",
      name: "The Bandit Leader",
      description: "A notorious bandit leader terrorises the roads. Hunt down his gang, then decide his fate.",
      objectives: [{ type: "kill", targetId: "bandit_ambush", current: 0, required: 2 }],
      isComplete: false,
      reward: { gold: 0, xp: 0 },
      choices: [
        { label: "Execute", reward: { gold: 200, xp: 0 } },
        { label: "Recruit", reward: { gold: 0, xp: 0, recruitUnitType: UnitType.SWORDSMAN } },
      ],
    },
  },
  {
    npcId: "npc_6",
    quest: {
      id: "quest_cursed_sword",
      name: "The Cursed Blade",
      description: "A cursed sword has been draining life from nearby villages. Slay the vampires guarding it, then choose wisely.",
      objectives: [{ type: "kill", targetId: "dungeon_vampires", current: 0, required: 2 }],
      isComplete: false,
      reward: { gold: 0, xp: 0 },
      choices: [
        { label: "Keep Sword", reward: { gold: 0, xp: 0, items: [ITEM_FLAMEBLADE] } },
        { label: "Destroy It", reward: { gold: 0, xp: 100 } },
      ],
    },
  },
  {
    npcId: "npc_7",
    quest: {
      id: "quest_dragon_egg",
      name: "The Dragon Egg",
      description: "A dragon egg has been found in the Dragon's Lair. Explore the lair, then decide the egg's fate.",
      objectives: [{ type: "kill", targetId: "dragon_lair", current: 0, required: 1 }],
      isComplete: false,
      reward: { gold: 0, xp: 0 },
      choices: [
        { label: "Sell", reward: { gold: 500, xp: 0 } },
        { label: "Hatch", reward: { gold: 0, xp: 0, recruitUnitType: UnitType.RED_DRAGON } },
      ],
    },
  },
  // =========================================================================
  // Personal quests — assigned to specific party members at runtime
  // =========================================================================
  {
    npcId: "personal_quest",
    quest: {
      id: "quest_personal_swordsman",
      name: "Blade of the Ancestors",
      description: "Prove your mastery of the blade by defeating the Dark Knight Squads terrorising the realm.",
      objectives: [{ type: "kill", targetId: "dark_knight_squad", current: 0, required: 5 }],
      isComplete: false,
      reward: { gold: 200, xp: 200 },
      personalMemberId: "",
    },
  },
  {
    npcId: "personal_quest",
    quest: {
      id: "quest_personal_archer",
      name: "The Perfect Shot",
      description: "Only by felling the Red Dragon with a single perfect volley can an archer achieve true greatness.",
      objectives: [{ type: "kill", targetId: "boss_dragon", current: 0, required: 1 }],
      isComplete: false,
      reward: { gold: 300, xp: 300 },
      personalMemberId: "",
    },
  },
  {
    npcId: "personal_quest",
    quest: {
      id: "quest_personal_mage",
      name: "Arcane Mastery",
      description: "Destroy the Warlock Covens corrupting the ley lines to unlock the deepest arcane secrets.",
      objectives: [{ type: "kill", targetId: "warlock_coven", current: 0, required: 3 }],
      isComplete: false,
      reward: { gold: 200, xp: 250 },
      personalMemberId: "",
    },
  },
  {
    npcId: "personal_quest",
    quest: {
      id: "quest_personal_healer",
      name: "Path of Light",
      description: "Heal the wounded across the land. Only through compassion can the light prevail.",
      objectives: [{ type: "heal_total", targetId: "heal", current: 0, required: 500 }],
      isComplete: false,
      reward: { gold: 200, xp: 250 },
      personalMemberId: "",
    },
  },
];

/** Look up quest def by NPC ID. */
export function getQuestDefForNPC(npcId: string): QuestDef | undefined {
  return QUEST_DEFS.find(q => q.npcId === npcId);
}
