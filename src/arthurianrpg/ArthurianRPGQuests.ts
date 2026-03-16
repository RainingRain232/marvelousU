// ============================================================================
// ArthurianRPGQuests.ts – Authored quest chains, dialogue trees, and NPC defs
// ============================================================================

import {
  QuestDef,
  QuestObjectiveType,
  DialogueTree,
  DialogueNode,
  ArthurianRPGDialogueSystem,
  SkillCheckType,
  QuestStatus,
} from "./ArthurianRPGDialogue";

// ---------------------------------------------------------------------------
// Helper – build a DialogueTree from a flat array of DialogueNodes
// ---------------------------------------------------------------------------

function buildTree(
  id: string,
  npcId: string,
  startNodeId: string,
  nodes: DialogueNode[],
): DialogueTree {
  const map = new Map<string, DialogueNode>();
  for (const n of nodes) map.set(n.id, n);
  return { id, npcId, startNodeId, nodes: map };
}

// ============================================================================
// QUEST DEFINITIONS
// ============================================================================

// ---------------------------------------------------------------------------
// Main Quest – The Holy Grail (5 stages)
// ---------------------------------------------------------------------------

export const QUEST_GRAIL_1_VISION: QuestDef = {
  id: "mq_grail_1_vision",
  name: "The Grail Vision",
  description: "You witnessed a divine vision in the great hall of Camelot. Seek counsel with the court sage.",
  journalEntry: "During the feast of Pentecost a blinding light filled the great hall and the Holy Grail appeared, shrouded in white samite. A voice commanded: 'Prove thyself worthy.' I must speak with the sage Aldric to understand this omen.",
  objectives: [
    { id: "talk_aldric", description: "Speak with Aldric the Sage in Camelot", type: QuestObjectiveType.TalkTo, targetId: "npc_aldric", required: 1, current: 0, completed: false },
  ],
  reward: { xp: 100, gold: 0, items: [], reputationChanges: [{ factionId: "camelot", amount: 10 }] },
  prerequisiteQuestIds: [],
  isMainQuest: true,
};

export const QUEST_GRAIL_2_LADY: QuestDef = {
  id: "mq_grail_2_lady",
  name: "The Lady of the Lake",
  description: "Aldric spoke of the Lady of the Lake at Avalon. She alone can reveal the path to the Grail.",
  journalEntry: "The sage told me only the Lady of the Lake possesses the knowledge to find the Grail. I must travel to the Isle of Avalon and seek her audience.",
  objectives: [
    { id: "goto_avalon", description: "Travel to the Isle of Avalon", type: QuestObjectiveType.GoTo, targetId: "avalon", required: 1, current: 0, completed: false },
    { id: "talk_lady", description: "Speak with the Lady of the Lake", type: QuestObjectiveType.TalkTo, targetId: "npc_lady_lake", required: 1, current: 0, completed: false },
  ],
  reward: { xp: 200, gold: 50, items: [], reputationChanges: [{ factionId: "fae", amount: 15 }] },
  prerequisiteQuestIds: ["mq_grail_1_vision"],
  isMainQuest: true,
};

export const QUEST_GRAIL_3_EXCALIBUR: QuestDef = {
  id: "mq_grail_3_excalibur",
  name: "Reclaim Excalibur",
  description: "The Lady says you need Excalibur. The Saxons stole it and keep it in their war-camp.",
  journalEntry: "The Lady told me the Grail Temple will only open for the bearer of Excalibur. The blade was stolen by Saxon raiders and taken to their encampment. I must infiltrate the camp and reclaim the sword.",
  objectives: [
    { id: "goto_saxon", description: "Enter the Saxon Encampment", type: QuestObjectiveType.GoTo, targetId: "saxon_camp", required: 1, current: 0, completed: false },
    { id: "kill_guards", description: "Defeat Saxon war-chief's guards", type: QuestObjectiveType.Kill, targetId: "saxon_warrior", required: 5, current: 0, completed: false },
    { id: "collect_excalibur", description: "Retrieve Excalibur", type: QuestObjectiveType.Collect, targetId: "excalibur", required: 1, current: 0, completed: false },
  ],
  reward: { xp: 500, gold: 150, items: [{ itemId: "excalibur", count: 1 }], reputationChanges: [{ factionId: "saxons", amount: -30 }, { factionId: "camelot", amount: 25 }] },
  prerequisiteQuestIds: ["mq_grail_2_lady"],
  isMainQuest: true,
};

export const QUEST_GRAIL_4_MORDRED: QuestDef = {
  id: "mq_grail_4_mordred",
  name: "The Fall of Mordred",
  description: "Mordred blocks the path to the Grail Temple. Confront him at his fortress.",
  journalEntry: "With Excalibur in hand I must face Mordred. His dark fortress stands between me and the Grail Temple. I will end his tyranny or die trying.",
  objectives: [
    { id: "goto_fortress", description: "Enter Mordred's Fortress", type: QuestObjectiveType.GoTo, targetId: "mordred_fortress", required: 1, current: 0, completed: false },
    { id: "kill_mordred", description: "Defeat Mordred", type: QuestObjectiveType.Kill, targetId: "mordred", required: 1, current: 0, completed: false },
  ],
  reward: { xp: 1000, gold: 500, items: [], reputationChanges: [{ factionId: "camelot", amount: 50 }] },
  prerequisiteQuestIds: ["mq_grail_3_excalibur"],
  isMainQuest: true,
};

export const QUEST_GRAIL_5_TEMPLE: QuestDef = {
  id: "mq_grail_5_temple",
  name: "The Grail Temple",
  description: "The path is clear. Enter the Grail Temple and prove your worthiness before the sacred chalice.",
  journalEntry: "Mordred is defeated. The Grail Temple awaits. I must enter and face whatever trial the Grail demands. Only the pure of heart may drink from the chalice.",
  objectives: [
    { id: "goto_temple", description: "Enter the Grail Temple", type: QuestObjectiveType.GoTo, targetId: "grail_temple", required: 1, current: 0, completed: false },
    { id: "defeat_guardians", description: "Defeat the Grail Guardians", type: QuestObjectiveType.Kill, targetId: "guardian", required: 3, current: 0, completed: false },
    { id: "reach_grail", description: "Approach the Holy Grail", type: QuestObjectiveType.GoTo, targetId: "grail_altar", required: 1, current: 0, completed: false },
  ],
  reward: { xp: 2000, gold: 1000, items: [{ itemId: "holy_grail_blessing", count: 1 }], reputationChanges: [{ factionId: "camelot", amount: 100 }, { factionId: "fae", amount: 50 }] },
  prerequisiteQuestIds: ["mq_grail_4_mordred"],
  isMainQuest: true,
};

// ---------------------------------------------------------------------------
// Camelot side quests (3)
// ---------------------------------------------------------------------------

export const QUEST_CAMELOT_BANDITS: QuestDef = {
  id: "sq_camelot_bandits",
  name: "Clearing the Trade Route",
  description: "Bandits have been raiding merchants on the road to Camelot. Captain Bors needs them dealt with.",
  journalEntry: "Captain Bors of the Camelot guard asked me to clear the bandits plaguing the trade road. The merchants are too frightened to travel, and Camelot grows hungry.",
  objectives: [
    { id: "kill_bandits", description: "Slay the bandits on the trade route", type: QuestObjectiveType.Kill, targetId: "bandit", required: 6, current: 0, completed: false },
    { id: "return_bors", description: "Report back to Captain Bors", type: QuestObjectiveType.TalkTo, targetId: "npc_bors", required: 1, current: 0, completed: false },
  ],
  reward: { xp: 150, gold: 75, items: [{ itemId: "iron_longsword", count: 1 }], reputationChanges: [{ factionId: "camelot", amount: 15 }] },
  prerequisiteQuestIds: [],
  isMainQuest: false,
};

export const QUEST_CAMELOT_LOST_SWORD: QuestDef = {
  id: "sq_camelot_lost_sword",
  name: "A Knight's Honor",
  description: "Sir Gareth lost his ancestral sword in the Dark Wood. Find and return it to restore his honor.",
  journalEntry: "Sir Gareth, a young knight of the Round Table, confessed that he lost his father's blade while fleeing wolves in the Dark Wood. He is too ashamed to search himself. I should find it.",
  objectives: [
    { id: "find_sword", description: "Find Sir Gareth's sword in the Dark Wood", type: QuestObjectiveType.Collect, targetId: "gareths_sword", required: 1, current: 0, completed: false },
    { id: "return_gareth", description: "Return the sword to Sir Gareth", type: QuestObjectiveType.TalkTo, targetId: "npc_gareth", required: 1, current: 0, completed: false },
  ],
  reward: { xp: 120, gold: 50, items: [], reputationChanges: [{ factionId: "camelot", amount: 10 }] },
  prerequisiteQuestIds: [],
  isMainQuest: false,
};

export const QUEST_CAMELOT_BLACKSMITH: QuestDef = {
  id: "sq_camelot_blacksmith",
  name: "The Blacksmith's Need",
  description: "Camelot's blacksmith needs rare iron ore and timber to forge arms for the garrison.",
  journalEntry: "The royal blacksmith, Master Wulfric, cannot keep up with the demand for weapons. He asked me to gather iron ore from the mines near Dark Wood and sturdy timber from the forest.",
  objectives: [
    { id: "collect_ore", description: "Collect iron ore", type: QuestObjectiveType.Collect, targetId: "iron_ore", required: 5, current: 0, completed: false },
    { id: "collect_timber", description: "Collect sturdy timber", type: QuestObjectiveType.Collect, targetId: "sturdy_timber", required: 3, current: 0, completed: false },
    { id: "return_wulfric", description: "Deliver materials to Wulfric", type: QuestObjectiveType.TalkTo, targetId: "npc_wulfric", required: 1, current: 0, completed: false },
  ],
  reward: { xp: 100, gold: 40, items: [{ itemId: "steel_greatsword", count: 1 }], reputationChanges: [{ factionId: "camelot", amount: 10 }] },
  prerequisiteQuestIds: [],
  isMainQuest: false,
};

// ---------------------------------------------------------------------------
// Dark Wood quests (2)
// ---------------------------------------------------------------------------

export const QUEST_DARKWOOD_SPIDER: QuestDef = {
  id: "sq_darkwood_spider",
  name: "The Great Spider",
  description: "A monstrous spider has been terrorizing travellers in the Dark Wood. The ranger Elara asks for help.",
  journalEntry: "Elara, a ranger of the Dark Wood, says a spider the size of a horse has made its lair in the deepest part of the forest. It has killed three of her scouts. She needs someone brave enough to slay the beast.",
  objectives: [
    { id: "kill_spiders", description: "Kill lesser spiders near the lair", type: QuestObjectiveType.Kill, targetId: "spider", required: 4, current: 0, completed: false },
    { id: "kill_great_spider", description: "Slay the Great Spider", type: QuestObjectiveType.Kill, targetId: "great_spider", required: 1, current: 0, completed: false },
    { id: "return_elara", description: "Return to Elara", type: QuestObjectiveType.TalkTo, targetId: "npc_elara", required: 1, current: 0, completed: false },
  ],
  reward: { xp: 250, gold: 100, items: [{ itemId: "spider_silk_cloak", count: 1 }], reputationChanges: [{ factionId: "druids", amount: 15 }] },
  prerequisiteQuestIds: [],
  isMainQuest: false,
};

export const QUEST_DARKWOOD_HERMIT: QuestDef = {
  id: "sq_darkwood_hermit",
  name: "The Hermit's Lost Tome",
  description: "An old hermit in the Dark Wood has lost his tome of ancient lore to thieving outlaws.",
  journalEntry: "Brother Anselm, a hermit living deep in the Dark Wood, was robbed by outlaws. They took his most precious possession: a tome of druidic lore passed down through generations. I must find the outlaw camp and recover it.",
  objectives: [
    { id: "kill_outlaws", description: "Defeat the outlaws at their camp", type: QuestObjectiveType.Kill, targetId: "outlaw", required: 3, current: 0, completed: false },
    { id: "collect_tome", description: "Recover the ancient tome", type: QuestObjectiveType.Collect, targetId: "hermit_tome", required: 1, current: 0, completed: false },
    { id: "return_anselm", description: "Return the tome to Brother Anselm", type: QuestObjectiveType.TalkTo, targetId: "npc_anselm", required: 1, current: 0, completed: false },
  ],
  reward: { xp: 180, gold: 30, items: [{ itemId: "health_potion", count: 3 }], reputationChanges: [{ factionId: "druids", amount: 20 }] },
  prerequisiteQuestIds: [],
  isMainQuest: false,
};

// ---------------------------------------------------------------------------
// Saxon quests (2)
// ---------------------------------------------------------------------------

export const QUEST_SAXON_INFILTRATE: QuestDef = {
  id: "sq_saxon_infiltrate",
  name: "Behind Enemy Lines",
  description: "Infiltrate the Saxon camp to steal their battle plans. Stealth is an option for the dexterous.",
  journalEntry: "Sir Kay, Arthur's seneschal, needs the Saxon battle plans before the next assault. He says the plans are in the war-chief's tent. I can fight my way in or try to sneak past the sentries.",
  objectives: [
    { id: "goto_saxon", description: "Enter the Saxon Encampment", type: QuestObjectiveType.GoTo, targetId: "saxon_camp", required: 1, current: 0, completed: false },
    { id: "collect_plans", description: "Steal the Saxon battle plans", type: QuestObjectiveType.Collect, targetId: "saxon_battle_plans", required: 1, current: 0, completed: false },
    { id: "return_kay", description: "Deliver the plans to Sir Kay", type: QuestObjectiveType.TalkTo, targetId: "npc_kay", required: 1, current: 0, completed: false },
  ],
  reward: { xp: 300, gold: 200, items: [], reputationChanges: [{ factionId: "camelot", amount: 20 }, { factionId: "saxons", amount: -20 }] },
  prerequisiteQuestIds: [],
  isMainQuest: false,
};

export const QUEST_SAXON_PRISONERS: QuestDef = {
  id: "sq_saxon_prisoners",
  name: "Rescue the Prisoners",
  description: "Camelot knights are held prisoner in the Saxon camp. Free them before they are executed.",
  journalEntry: "Word has reached Camelot that three captured knights await execution in the Saxon camp. Time is short. I must rescue them and escort them to safety.",
  objectives: [
    { id: "kill_jailors", description: "Defeat the Saxon jailors", type: QuestObjectiveType.Kill, targetId: "saxon_warrior", required: 4, current: 0, completed: false },
    { id: "free_prisoners", description: "Free the captured knights", type: QuestObjectiveType.TalkTo, targetId: "npc_prisoners", required: 1, current: 0, completed: false },
    { id: "escort_out", description: "Escort the knights to safety", type: QuestObjectiveType.Escort, targetId: "npc_prisoners", required: 1, current: 0, completed: false },
  ],
  reward: { xp: 350, gold: 100, items: [{ itemId: "blessed_mace", count: 1 }], reputationChanges: [{ factionId: "camelot", amount: 30 }, { factionId: "saxons", amount: -15 }] },
  prerequisiteQuestIds: [],
  isMainQuest: false,
};

// ---------------------------------------------------------------------------
// Avalon quests (2)
// ---------------------------------------------------------------------------

export const QUEST_AVALON_FAE_TRIAL: QuestDef = {
  id: "sq_avalon_fae_trial",
  name: "The Fae Trial of Wisdom",
  description: "The Fae Council of Avalon demands a trial of wisdom before they will trust a mortal.",
  journalEntry: "The fae do not trust mortals. Their elder, Thistlewing, says I must pass a Trial of Wisdom: answering riddles and demonstrating knowledge of the old ways. My Intelligence and Charisma will be tested.",
  objectives: [
    { id: "talk_thistlewing", description: "Speak with Elder Thistlewing", type: QuestObjectiveType.TalkTo, targetId: "npc_thistlewing", required: 1, current: 0, completed: false },
    { id: "pass_trial", description: "Pass the Trial of Wisdom", type: QuestObjectiveType.TalkTo, targetId: "npc_fae_arbiter", required: 1, current: 0, completed: false },
  ],
  reward: { xp: 250, gold: 0, items: [{ itemId: "fae_circlet", count: 1 }], reputationChanges: [{ factionId: "fae", amount: 40 }] },
  prerequisiteQuestIds: [],
  isMainQuest: false,
};

export const QUEST_AVALON_HEAL_KNIGHT: QuestDef = {
  id: "sq_avalon_heal_knight",
  name: "The Wounded Fairy Knight",
  description: "A fairy knight lies gravely wounded. Gather rare herbs to brew a healing draught.",
  journalEntry: "In Avalon I found a fairy knight, Brightspur, suffering from a poisoned wound. The healer Lirien needs moonpetal flowers and silverroot from the lake shore to prepare the antidote.",
  objectives: [
    { id: "collect_moonpetal", description: "Gather moonpetal flowers", type: QuestObjectiveType.Collect, targetId: "moonpetal", required: 3, current: 0, completed: false },
    { id: "collect_silverroot", description: "Gather silverroot", type: QuestObjectiveType.Collect, targetId: "silverroot", required: 2, current: 0, completed: false },
    { id: "deliver_lirien", description: "Deliver herbs to healer Lirien", type: QuestObjectiveType.TalkTo, targetId: "npc_lirien", required: 1, current: 0, completed: false },
  ],
  reward: { xp: 200, gold: 60, items: [{ itemId: "health_potion", count: 5 }], reputationChanges: [{ factionId: "fae", amount: 25 }] },
  prerequisiteQuestIds: [],
  isMainQuest: false,
};

// ---------------------------------------------------------------------------
// All quest definitions in a single array
// ---------------------------------------------------------------------------

export const ALL_QUESTS: QuestDef[] = [
  // Main quest chain
  QUEST_GRAIL_1_VISION,
  QUEST_GRAIL_2_LADY,
  QUEST_GRAIL_3_EXCALIBUR,
  QUEST_GRAIL_4_MORDRED,
  QUEST_GRAIL_5_TEMPLE,
  // Camelot side quests
  QUEST_CAMELOT_BANDITS,
  QUEST_CAMELOT_LOST_SWORD,
  QUEST_CAMELOT_BLACKSMITH,
  // Dark Wood quests
  QUEST_DARKWOOD_SPIDER,
  QUEST_DARKWOOD_HERMIT,
  // Saxon quests
  QUEST_SAXON_INFILTRATE,
  QUEST_SAXON_PRISONERS,
  // Avalon quests
  QUEST_AVALON_FAE_TRIAL,
  QUEST_AVALON_HEAL_KNIGHT,
];

// ============================================================================
// DIALOGUE TREES
// ============================================================================

// ---------------------------------------------------------------------------
// Aldric the Sage – Main quest stage 1 giver
// ---------------------------------------------------------------------------

export const DIALOGUE_ALDRIC: DialogueTree = buildTree(
  "dlg_aldric", "npc_aldric", "aldric_root",
  [
    {
      id: "aldric_root", speaker: "Aldric the Sage", portrait: "sage",
      text: "Ah, you are the one who witnessed the Grail vision. I have been expecting you.",
      choices: [
        {
          text: "What was that light in the great hall?",
          nextNodeId: "aldric_explain",
        },
        {
          text: "I don't have time for riddles, old man.",
          nextNodeId: "aldric_blunt",
        },
      ],
    },
    {
      id: "aldric_explain", speaker: "Aldric the Sage", portrait: "sage",
      text: "The Holy Grail appeared to you, chosen knight. It is the chalice of Christ, lost for centuries. Only one of pure heart can claim it. But first, you must seek the Lady of the Lake at Avalon. She will guide you.",
      choices: [
        {
          text: "I will seek the Lady. Where is Avalon?",
          nextNodeId: "aldric_directions",
          action: [
            { type: "startQuest", questId: "mq_grail_2_lady" },
            { type: "completeQuest", questId: "mq_grail_1_vision" },
            { type: "updateObjective", questId: "mq_grail_1_vision", objectiveId: "talk_aldric", delta: 1 },
            { type: "addLoreEntry", loreId: "lore_holy_grail" },
          ],
        },
        {
          text: "Why me?",
          nextNodeId: "aldric_why",
        },
      ],
    },
    {
      id: "aldric_why", speaker: "Aldric the Sage", portrait: "sage",
      text: "The Grail chooses its seeker. You have courage, and perhaps virtue. Whether you are worthy... that remains to be seen.",
      choices: [
        {
          text: "Tell me about Avalon.",
          nextNodeId: "aldric_directions",
          action: [
            { type: "startQuest", questId: "mq_grail_2_lady" },
            { type: "completeQuest", questId: "mq_grail_1_vision" },
            { type: "updateObjective", questId: "mq_grail_1_vision", objectiveId: "talk_aldric", delta: 1 },
            { type: "addLoreEntry", loreId: "lore_holy_grail" },
          ],
        },
      ],
    },
    {
      id: "aldric_blunt", speaker: "Aldric the Sage", portrait: "sage",
      text: "Patience is a virtue, young one. The Grail will not wait forever, but a moment of listening may save your life. Will you hear me out?",
      choices: [
        {
          text: "Fine. Tell me what you know.",
          nextNodeId: "aldric_explain",
        },
        { text: "Another time.", nextNodeId: null },
      ],
    },
    {
      id: "aldric_directions", speaker: "Aldric the Sage", portrait: "sage",
      text: "Avalon lies to the south, beyond the misty marshes. Travel carefully -- the fae folk do not trust mortals easily. May the light of the Grail guide your path.",
      choices: [
        { text: "Thank you, Aldric.", nextNodeId: null },
      ],
    },
  ],
);

// ---------------------------------------------------------------------------
// Lady of the Lake – Main quest stage 2
// ---------------------------------------------------------------------------

export const DIALOGUE_LADY_LAKE: DialogueTree = buildTree(
  "dlg_lady_lake", "npc_lady_lake", "lady_root",
  [
    {
      id: "lady_root", speaker: "Lady of the Lake", portrait: "lady",
      text: "Welcome, mortal. The waters told me of your coming. You seek the Holy Grail.",
      choices: [
        {
          text: "I do. How can I find it?",
          nextNodeId: "lady_excalibur",
          condition: { type: "quest", questId: "mq_grail_2_lady", questStatus: QuestStatus.Active },
        },
        { text: "Your realm is beautiful, my Lady.", nextNodeId: "lady_flattery" },
        { text: "I am just passing through.", nextNodeId: null },
      ],
    },
    {
      id: "lady_flattery", speaker: "Lady of the Lake", portrait: "lady",
      text: "The beauty of Avalon is but a shadow of what was, before the darkness of Mordred crept across the land. But your words are kind. Now then, why are you truly here?",
      choices: [
        {
          text: "I seek the Holy Grail.",
          nextNodeId: "lady_excalibur",
          condition: { type: "quest", questId: "mq_grail_2_lady", questStatus: QuestStatus.Active },
        },
        { text: "Farewell.", nextNodeId: null },
      ],
    },
    {
      id: "lady_excalibur", speaker: "Lady of the Lake", portrait: "lady",
      text: "The Grail Temple will only open for the one who bears Excalibur, the sword of Arthur. But the Saxons stole the blade in their last raid. You must reclaim it from their encampment to the east.",
      choices: [
        {
          text: "I will reclaim Excalibur from the Saxons.",
          nextNodeId: "lady_farewell",
          action: [
            { type: "updateObjective", questId: "mq_grail_2_lady", objectiveId: "talk_lady", delta: 1 },
            { type: "startQuest", questId: "mq_grail_3_excalibur" },
            { type: "addReputation", factionId: "fae", amount: 10 },
            { type: "addLoreEntry", loreId: "lore_excalibur" },
          ],
        },
      ],
    },
    {
      id: "lady_farewell", speaker: "Lady of the Lake", portrait: "lady",
      text: "Be cautious, mortal. The Saxon war-chief Hengist is a formidable warrior. Take this blessing -- it may aid you in the darkness ahead.",
      choices: [
        { text: "I will not fail.", nextNodeId: null },
      ],
      onEnter: [
        { type: "giveItem", itemId: "health_potion", count: 3 },
        { type: "giveGold", amount: 100 },
      ],
    },
  ],
);

// ---------------------------------------------------------------------------
// Captain Bors – Camelot bandit quest giver
// ---------------------------------------------------------------------------

export const DIALOGUE_BORS: DialogueTree = buildTree(
  "dlg_bors", "npc_bors", "bors_root",
  [
    {
      id: "bors_root", speaker: "Captain Bors", portrait: "guard",
      text: "Hail, traveler. These are dark days. Bandits infest the trade road and merchants refuse to travel. Camelot's stores run low.",
      choices: [
        {
          text: "I can help clear the bandits.",
          nextNodeId: "bors_accept",
          condition: { type: "quest", questId: "sq_camelot_bandits", questStatus: QuestStatus.NotStarted },
        },
        {
          text: "The bandits are dealt with, Captain.",
          nextNodeId: "bors_complete",
          condition: { type: "quest", questId: "sq_camelot_bandits", questStatus: QuestStatus.Active },
        },
        { text: "Not my problem.", nextNodeId: null },
      ],
    },
    {
      id: "bors_accept", speaker: "Captain Bors", portrait: "guard",
      text: "You would do us a great service! Slay at least six of the brigands along the road. Return to me when the deed is done and I will see you well rewarded.",
      choices: [
        {
          text: "Consider it done.",
          nextNodeId: null,
          action: [{ type: "startQuest", questId: "sq_camelot_bandits" }],
        },
      ],
    },
    {
      id: "bors_complete", speaker: "Captain Bors", portrait: "guard",
      text: "The road is safe again! Camelot owes you a debt. Take this sword and coin as thanks.",
      choices: [
        {
          text: "Glad to help.",
          nextNodeId: null,
          action: [
            { type: "updateObjective", questId: "sq_camelot_bandits", objectiveId: "return_bors", delta: 1 },
            { type: "completeQuest", questId: "sq_camelot_bandits" },
            { type: "giveGold", amount: 75 },
            { type: "giveItem", itemId: "iron_longsword", count: 1 },
            { type: "addReputation", factionId: "camelot", amount: 15 },
          ],
        },
      ],
    },
  ],
);

// ---------------------------------------------------------------------------
// Sir Gareth – Lost sword quest
// ---------------------------------------------------------------------------

export const DIALOGUE_GARETH: DialogueTree = buildTree(
  "dlg_gareth", "npc_gareth", "gareth_root",
  [
    {
      id: "gareth_root", speaker: "Sir Gareth", portrait: "knight",
      text: "Please, keep your voice down. I... I lost my father's sword in the Dark Wood. If the other knights find out, I will be disgraced.",
      choices: [
        {
          text: "I'll find your sword. Where did you lose it?",
          nextNodeId: "gareth_accept",
          condition: { type: "quest", questId: "sq_camelot_lost_sword", questStatus: QuestStatus.NotStarted },
        },
        {
          text: "I have your father's sword.",
          nextNodeId: "gareth_complete",
          condition: { type: "hasItem", itemId: "gareths_sword" },
        },
        { text: "That's your problem.", nextNodeId: null },
      ],
    },
    {
      id: "gareth_accept", speaker: "Sir Gareth", portrait: "knight",
      text: "I was fleeing wolves near the old ruins at the heart of the wood. The blade must have fallen from my belt. Please, bring it back and I will be forever in your debt.",
      choices: [
        {
          text: "I'll look for it.",
          nextNodeId: null,
          action: [{ type: "startQuest", questId: "sq_camelot_lost_sword" }],
        },
      ],
    },
    {
      id: "gareth_complete", speaker: "Sir Gareth", portrait: "knight",
      text: "You found it! My honor is restored. I cannot thank you enough. Please, take this gold -- it is all I can offer.",
      choices: [
        {
          text: "Honor is its own reward.",
          nextNodeId: null,
          action: [
            { type: "removeItem", itemId: "gareths_sword", count: 1 },
            { type: "updateObjective", questId: "sq_camelot_lost_sword", objectiveId: "return_gareth", delta: 1 },
            { type: "completeQuest", questId: "sq_camelot_lost_sword" },
            { type: "giveGold", amount: 50 },
            { type: "addReputation", factionId: "camelot", amount: 10 },
          ],
        },
      ],
    },
  ],
);

// ---------------------------------------------------------------------------
// Master Wulfric – Blacksmith quest
// ---------------------------------------------------------------------------

export const DIALOGUE_WULFRIC: DialogueTree = buildTree(
  "dlg_wulfric", "npc_wulfric", "wulfric_root",
  [
    {
      id: "wulfric_root", speaker: "Master Wulfric", portrait: "blacksmith",
      text: "The forge burns hot but I have no iron! The garrison demands swords and I have barely enough steel for a dagger.",
      choices: [
        {
          text: "What do you need?",
          nextNodeId: "wulfric_accept",
          condition: { type: "quest", questId: "sq_camelot_blacksmith", questStatus: QuestStatus.NotStarted },
        },
        {
          text: "I have the materials you requested.",
          nextNodeId: "wulfric_complete",
          condition: { type: "quest", questId: "sq_camelot_blacksmith", questStatus: QuestStatus.Active },
        },
        { text: "Good luck with that.", nextNodeId: null },
      ],
    },
    {
      id: "wulfric_accept", speaker: "Master Wulfric", portrait: "blacksmith",
      text: "I need five chunks of iron ore from the mines near the Dark Wood and three pieces of sturdy timber. Bring those and I will forge you a fine blade as payment.",
      choices: [
        {
          text: "I'll gather the materials.",
          nextNodeId: null,
          action: [{ type: "startQuest", questId: "sq_camelot_blacksmith" }],
        },
      ],
    },
    {
      id: "wulfric_complete", speaker: "Master Wulfric", portrait: "blacksmith",
      text: "Excellent quality! This ore will forge many blades. And here -- as promised -- a greatsword worthy of a champion.",
      choices: [
        {
          text: "Thank you, Master Wulfric.",
          nextNodeId: null,
          action: [
            { type: "removeItem", itemId: "iron_ore", count: 5 },
            { type: "removeItem", itemId: "sturdy_timber", count: 3 },
            { type: "updateObjective", questId: "sq_camelot_blacksmith", objectiveId: "return_wulfric", delta: 1 },
            { type: "completeQuest", questId: "sq_camelot_blacksmith" },
            { type: "giveItem", itemId: "steel_greatsword", count: 1 },
            { type: "giveGold", amount: 40 },
            { type: "addReputation", factionId: "camelot", amount: 10 },
          ],
        },
      ],
    },
  ],
);

// ---------------------------------------------------------------------------
// Elara the Ranger – Spider quest
// ---------------------------------------------------------------------------

export const DIALOGUE_ELARA: DialogueTree = buildTree(
  "dlg_elara", "npc_elara", "elara_root",
  [
    {
      id: "elara_root", speaker: "Elara", portrait: "ranger",
      text: "You have the look of a fighter. Good. There is a spider in these woods the size of a warhorse. It has killed three of my scouts.",
      choices: [
        {
          text: "I'll hunt it down.",
          nextNodeId: "elara_accept",
          condition: { type: "quest", questId: "sq_darkwood_spider", questStatus: QuestStatus.NotStarted },
        },
        {
          text: "The beast is slain.",
          nextNodeId: "elara_complete",
          condition: { type: "quest", questId: "sq_darkwood_spider", questStatus: QuestStatus.Active },
        },
        { text: "That sounds like your problem.", nextNodeId: null },
      ],
    },
    {
      id: "elara_accept", speaker: "Elara", portrait: "ranger",
      text: "Its lair is in the deepest part of the wood, past the twisted oaks. Kill the lesser brood first -- they guard the queen. Bring me proof and I will reward you well.",
      choices: [
        {
          text: "On my way.",
          nextNodeId: null,
          action: [{ type: "startQuest", questId: "sq_darkwood_spider" }],
        },
      ],
    },
    {
      id: "elara_complete", speaker: "Elara", portrait: "ranger",
      text: "You did it! The forest breathes easier today. Take this cloak woven from spider silk -- it is stronger than steel and light as a feather.",
      choices: [
        {
          text: "A fine trophy.",
          nextNodeId: null,
          action: [
            { type: "updateObjective", questId: "sq_darkwood_spider", objectiveId: "return_elara", delta: 1 },
            { type: "completeQuest", questId: "sq_darkwood_spider" },
            { type: "giveItem", itemId: "spider_silk_cloak", count: 1 },
            { type: "giveGold", amount: 100 },
            { type: "addReputation", factionId: "druids", amount: 15 },
          ],
        },
      ],
    },
  ],
);

// ---------------------------------------------------------------------------
// Brother Anselm – Hermit tome quest
// ---------------------------------------------------------------------------

export const DIALOGUE_ANSELM: DialogueTree = buildTree(
  "dlg_anselm", "npc_anselm", "anselm_root",
  [
    {
      id: "anselm_root", speaker: "Brother Anselm", portrait: "hermit",
      text: "Bless you, child. I am but a humble hermit. Alas, outlaws stole my precious tome of druidic lore. Without it, the old knowledge will be lost.",
      choices: [
        {
          text: "I will recover your tome.",
          nextNodeId: "anselm_accept",
          condition: { type: "quest", questId: "sq_darkwood_hermit", questStatus: QuestStatus.NotStarted },
        },
        {
          text: "I found your tome, Brother.",
          nextNodeId: "anselm_complete",
          condition: { type: "hasItem", itemId: "hermit_tome" },
        },
        { text: "I am sorry for your loss.", nextNodeId: null },
      ],
    },
    {
      id: "anselm_accept", speaker: "Brother Anselm", portrait: "hermit",
      text: "The outlaws have a camp south of the old bridge. Be careful, they are desperate and violent. The tome has a green leather cover with silver runes.",
      choices: [
        {
          text: "I will find it.",
          nextNodeId: null,
          action: [{ type: "startQuest", questId: "sq_darkwood_hermit" }],
        },
      ],
    },
    {
      id: "anselm_complete", speaker: "Brother Anselm", portrait: "hermit",
      text: "Oh, blessed day! You have saved centuries of wisdom. I have little gold, but please accept these healing draughts and my eternal gratitude.",
      choices: [
        {
          text: "Use the knowledge well.",
          nextNodeId: null,
          action: [
            { type: "removeItem", itemId: "hermit_tome", count: 1 },
            { type: "updateObjective", questId: "sq_darkwood_hermit", objectiveId: "return_anselm", delta: 1 },
            { type: "completeQuest", questId: "sq_darkwood_hermit" },
            { type: "giveItem", itemId: "health_potion", count: 3 },
            { type: "giveGold", amount: 30 },
            { type: "addReputation", factionId: "druids", amount: 20 },
            { type: "addLoreEntry", loreId: "lore_druid_ways" },
          ],
        },
      ],
    },
  ],
);

// ---------------------------------------------------------------------------
// Sir Kay – Saxon infiltration quest
// ---------------------------------------------------------------------------

export const DIALOGUE_KAY: DialogueTree = buildTree(
  "dlg_kay", "npc_kay", "kay_root",
  [
    {
      id: "kay_root", speaker: "Sir Kay", portrait: "knight",
      text: "The Saxons plan another assault. We need their battle plans before they strike. This mission requires either a sharp blade or a light step.",
      choices: [
        {
          text: "I'll get those plans.",
          nextNodeId: "kay_accept",
          condition: { type: "quest", questId: "sq_saxon_infiltrate", questStatus: QuestStatus.NotStarted },
        },
        {
          text: "I have the Saxon battle plans.",
          nextNodeId: "kay_complete",
          condition: { type: "hasItem", itemId: "saxon_battle_plans" },
        },
        { text: "Find someone else.", nextNodeId: null },
      ],
    },
    {
      id: "kay_accept", speaker: "Sir Kay", portrait: "knight",
      text: "The plans are in the war-chief's tent at the centre of the camp. You can fight your way in or use stealth -- the choice is yours. Just get those plans.",
      choices: [
        {
          text: "I'll be a ghost.",
          nextNodeId: "kay_stealth_tip",
          skillCheck: {
            type: SkillCheckType.Dexterity,
            difficulty: 14,
            failNodeId: "kay_no_stealth",
          },
          action: [
            { type: "startQuest", questId: "sq_saxon_infiltrate" },
            { type: "setFlag", flagId: "saxon_stealth_approach", value: true },
          ],
        },
        {
          text: "I'll cut through them.",
          nextNodeId: null,
          action: [{ type: "startQuest", questId: "sq_saxon_infiltrate" }],
        },
      ],
    },
    {
      id: "kay_stealth_tip", speaker: "Sir Kay", portrait: "knight",
      text: "I can see you know how to move unseen. There is a gap in the palisade on the eastern side. Use it and you may avoid the main guard entirely.",
      choices: [
        { text: "Good to know.", nextNodeId: null },
      ],
    },
    {
      id: "kay_no_stealth", speaker: "Sir Kay", portrait: "knight",
      text: "Hmm, perhaps stealth is not your strongest suit. No matter, a frontal assault works too. Just be ready for a fight.",
      choices: [
        { text: "I'll manage.", nextNodeId: null },
      ],
    },
    {
      id: "kay_complete", speaker: "Sir Kay", portrait: "knight",
      text: "These plans are invaluable! With this intelligence, we can prepare our defenses. Camelot is in your debt, champion.",
      choices: [
        {
          text: "For Camelot.",
          nextNodeId: null,
          action: [
            { type: "removeItem", itemId: "saxon_battle_plans", count: 1 },
            { type: "updateObjective", questId: "sq_saxon_infiltrate", objectiveId: "return_kay", delta: 1 },
            { type: "completeQuest", questId: "sq_saxon_infiltrate" },
            { type: "giveGold", amount: 200 },
            { type: "addReputation", factionId: "camelot", amount: 20 },
          ],
        },
      ],
    },
  ],
);

// ---------------------------------------------------------------------------
// Elder Thistlewing – Fae trial of wisdom
// ---------------------------------------------------------------------------

export const DIALOGUE_THISTLEWING: DialogueTree = buildTree(
  "dlg_thistlewing", "npc_thistlewing", "thistle_root",
  [
    {
      id: "thistle_root", speaker: "Elder Thistlewing", portrait: "fae_elder",
      text: "A mortal dares set foot on sacred Avalon. Before we speak further, you must prove your mind is as strong as your sword arm.",
      choices: [
        {
          text: "I accept your challenge.",
          nextNodeId: "thistle_riddle1",
          condition: { type: "quest", questId: "sq_avalon_fae_trial", questStatus: QuestStatus.NotStarted },
          action: [{ type: "startQuest", questId: "sq_avalon_fae_trial" }],
        },
        { text: "I mean no offense. I will leave.", nextNodeId: null },
      ],
    },
    {
      id: "thistle_riddle1", speaker: "Elder Thistlewing", portrait: "fae_elder",
      text: "First riddle: I have cities but no houses, forests but no trees, water but no fish. What am I?",
      choices: [
        {
          text: "A map.",
          nextNodeId: "thistle_riddle2",
          skillCheck: {
            type: SkillCheckType.Intelligence,
            difficulty: 12,
            failNodeId: "thistle_fail",
          },
        },
        {
          text: "A dream.",
          nextNodeId: "thistle_fail",
        },
      ],
    },
    {
      id: "thistle_riddle2", speaker: "Elder Thistlewing", portrait: "fae_elder",
      text: "Clever. Second riddle: The more you take, the more you leave behind. What are they?",
      choices: [
        {
          text: "Footsteps.",
          nextNodeId: "thistle_riddle3",
          skillCheck: {
            type: SkillCheckType.Intelligence,
            difficulty: 14,
            failNodeId: "thistle_fail",
          },
        },
        {
          text: "Breaths.",
          nextNodeId: "thistle_fail",
        },
      ],
    },
    {
      id: "thistle_riddle3", speaker: "Elder Thistlewing", portrait: "fae_elder",
      text: "Final trial: Convince me that mortals are worthy of the fae's trust.",
      choices: [
        {
          text: "[Charisma] We share this world. Our fates are intertwined.",
          nextNodeId: "thistle_pass",
          skillCheck: {
            type: SkillCheckType.Charisma,
            difficulty: 15,
            failNodeId: "thistle_fail",
          },
        },
        {
          text: "You need us as much as we need you.",
          nextNodeId: "thistle_pass",
          skillCheck: {
            type: SkillCheckType.Intelligence,
            difficulty: 16,
            failNodeId: "thistle_fail",
          },
        },
      ],
    },
    {
      id: "thistle_pass", speaker: "Elder Thistlewing", portrait: "fae_elder",
      text: "You have wisdom beyond your years, mortal. The fae welcome you. Take this circlet -- it marks you as a friend of the fae folk.",
      choices: [
        {
          text: "I am honored, Elder.",
          nextNodeId: null,
          action: [
            { type: "updateObjective", questId: "sq_avalon_fae_trial", objectiveId: "talk_thistlewing", delta: 1 },
            { type: "updateObjective", questId: "sq_avalon_fae_trial", objectiveId: "pass_trial", delta: 1 },
            { type: "completeQuest", questId: "sq_avalon_fae_trial" },
            { type: "giveItem", itemId: "fae_circlet", count: 1 },
            { type: "addReputation", factionId: "fae", amount: 40 },
            { type: "addLoreEntry", loreId: "lore_fae_culture" },
          ],
        },
      ],
    },
    {
      id: "thistle_fail", speaker: "Elder Thistlewing", portrait: "fae_elder",
      text: "Hmm. Your mind is not yet sharp enough. Return when you have grown wiser, mortal.",
      choices: [
        { text: "I will return.", nextNodeId: null },
      ],
      onEnter: [
        { type: "setFlag", flagId: "fae_trial_failed_once", value: true },
      ],
    },
  ],
);

// ---------------------------------------------------------------------------
// Healer Lirien – Wounded fairy knight quest
// ---------------------------------------------------------------------------

export const DIALOGUE_LIRIEN: DialogueTree = buildTree(
  "dlg_lirien", "npc_lirien", "lirien_root",
  [
    {
      id: "lirien_root", speaker: "Lirien", portrait: "fae_healer",
      text: "Brightspur, one of our finest knights, was struck by a poisoned blade. I need moonpetal flowers and silverroot to save him, but the shores are too dangerous for me alone.",
      choices: [
        {
          text: "I'll gather the herbs.",
          nextNodeId: "lirien_accept",
          condition: { type: "quest", questId: "sq_avalon_heal_knight", questStatus: QuestStatus.NotStarted },
        },
        {
          text: "I have the herbs you need.",
          nextNodeId: "lirien_complete",
          condition: { type: "quest", questId: "sq_avalon_heal_knight", questStatus: QuestStatus.Active },
        },
        { text: "I cannot help right now.", nextNodeId: null },
      ],
    },
    {
      id: "lirien_accept", speaker: "Lirien", portrait: "fae_healer",
      text: "I need three moonpetal flowers -- they glow silver at night by the lake. And two silverroot stems from the marshy bank. Hurry, Brightspur does not have long.",
      choices: [
        {
          text: "I'll find them quickly.",
          nextNodeId: null,
          action: [{ type: "startQuest", questId: "sq_avalon_heal_knight" }],
        },
      ],
    },
    {
      id: "lirien_complete", speaker: "Lirien", portrait: "fae_healer",
      text: "You have them! Quickly, let me prepare the antidote... Yes, Brightspur will live! You have saved a life today, mortal. The fae will not forget this kindness.",
      choices: [
        {
          text: "I am glad he will recover.",
          nextNodeId: null,
          action: [
            { type: "removeItem", itemId: "moonpetal", count: 3 },
            { type: "removeItem", itemId: "silverroot", count: 2 },
            { type: "updateObjective", questId: "sq_avalon_heal_knight", objectiveId: "deliver_lirien", delta: 1 },
            { type: "completeQuest", questId: "sq_avalon_heal_knight" },
            { type: "giveItem", itemId: "health_potion", count: 5 },
            { type: "giveGold", amount: 60 },
            { type: "addReputation", factionId: "fae", amount: 25 },
          ],
        },
      ],
    },
  ],
);

// ---------------------------------------------------------------------------
// All dialogue trees
// ---------------------------------------------------------------------------

export const ALL_DIALOGUE_TREES: DialogueTree[] = [
  DIALOGUE_ALDRIC,
  DIALOGUE_LADY_LAKE,
  DIALOGUE_BORS,
  DIALOGUE_GARETH,
  DIALOGUE_WULFRIC,
  DIALOGUE_ELARA,
  DIALOGUE_ANSELM,
  DIALOGUE_KAY,
  DIALOGUE_THISTLEWING,
  DIALOGUE_LIRIEN,
];

// ---------------------------------------------------------------------------
// NPC definitions for quest givers (position in world, region)
// ---------------------------------------------------------------------------

export interface QuestNPCDef {
  id: string;
  name: string;
  region: string;
  position: { x: number; y: number; z: number };
  dialogueTreeId: string;
  questIds: string[];
  faction: string;
}

export const QUEST_NPCS: QuestNPCDef[] = [
  // Camelot NPCs
  { id: "npc_aldric", name: "Aldric the Sage", region: "camelot", position: { x: 10, y: 0, z: -5 }, dialogueTreeId: "dlg_aldric", questIds: ["mq_grail_1_vision", "mq_grail_2_lady"], faction: "camelot" },
  { id: "npc_bors", name: "Captain Bors", region: "camelot", position: { x: -15, y: 0, z: 10 }, dialogueTreeId: "dlg_bors", questIds: ["sq_camelot_bandits"], faction: "camelot" },
  { id: "npc_gareth", name: "Sir Gareth", region: "camelot", position: { x: 5, y: 0, z: 15 }, dialogueTreeId: "dlg_gareth", questIds: ["sq_camelot_lost_sword"], faction: "camelot" },
  { id: "npc_wulfric", name: "Master Wulfric", region: "camelot", position: { x: -20, y: 0, z: -10 }, dialogueTreeId: "dlg_wulfric", questIds: ["sq_camelot_blacksmith"], faction: "camelot" },
  { id: "npc_kay", name: "Sir Kay", region: "camelot", position: { x: 20, y: 0, z: 5 }, dialogueTreeId: "dlg_kay", questIds: ["sq_saxon_infiltrate"], faction: "camelot" },
  // Dark Wood NPCs
  { id: "npc_elara", name: "Elara", region: "darkwood", position: { x: -120, y: 0, z: 10 }, dialogueTreeId: "dlg_elara", questIds: ["sq_darkwood_spider"], faction: "druids" },
  { id: "npc_anselm", name: "Brother Anselm", region: "darkwood", position: { x: -140, y: 0, z: -20 }, dialogueTreeId: "dlg_anselm", questIds: ["sq_darkwood_hermit"], faction: "druids" },
  // Avalon NPCs
  { id: "npc_lady_lake", name: "Lady of the Lake", region: "avalon", position: { x: 0, y: 0, z: -130 }, dialogueTreeId: "dlg_lady_lake", questIds: ["mq_grail_2_lady", "mq_grail_3_excalibur"], faction: "fae" },
  { id: "npc_thistlewing", name: "Elder Thistlewing", region: "avalon", position: { x: 20, y: 0, z: -140 }, dialogueTreeId: "dlg_thistlewing", questIds: ["sq_avalon_fae_trial"], faction: "fae" },
  { id: "npc_lirien", name: "Lirien", region: "avalon", position: { x: -15, y: 0, z: -120 }, dialogueTreeId: "dlg_lirien", questIds: ["sq_avalon_heal_knight"], faction: "fae" },
];

// ---------------------------------------------------------------------------
// Registration helper – registers all quests + dialogues + lore into system
// ---------------------------------------------------------------------------

export function registerAllContent(system: ArthurianRPGDialogueSystem): void {
  // Register factions
  system.reputation.registerFaction({ id: "camelot", name: "Camelot", description: "The knights and people of Camelot" });
  system.reputation.registerFaction({ id: "saxons", name: "Saxons", description: "The invading Saxon war-bands" });
  system.reputation.registerFaction({ id: "druids", name: "Druids", description: "Keepers of the old forest ways" });
  system.reputation.registerFaction({ id: "fae", name: "Fae Folk", description: "The fairy folk of Avalon" });

  // Register quests
  for (const quest of ALL_QUESTS) {
    system.quests.registerQuest(quest);
  }

  // Register dialogue trees
  for (const tree of ALL_DIALOGUE_TREES) {
    system.registerDialogueTree(tree);
  }

  // Register lore entries
  system.lore.registerEntry({ id: "lore_holy_grail", title: "The Holy Grail", text: "The chalice used by Christ at the Last Supper, brought to Britain by Joseph of Arimathea. It is said to grant eternal life to the worthy.", category: "History", discovered: false });
  system.lore.registerEntry({ id: "lore_excalibur", title: "Excalibur", text: "The legendary sword of King Arthur, given to him by the Lady of the Lake. Its scabbard protects the bearer from death.", category: "Artifacts", discovered: false });
  system.lore.registerEntry({ id: "lore_druid_ways", title: "The Druid Ways", text: "The druids kept the old knowledge of nature magic, herb lore, and the sacred groves. Their power wanes as the new faith spreads.", category: "Magic", discovered: false });
  system.lore.registerEntry({ id: "lore_fae_culture", title: "The Fae Folk", text: "The fairy folk of Avalon are immortal beings bound to the land. They distrust mortals but honour those who prove their wisdom.", category: "People", discovered: false });

  // Auto-start the first main quest
  system.quests.startQuest("mq_grail_1_vision");
}
