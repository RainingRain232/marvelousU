// Leader encounter definitions for RPG mode — each leader has lore-accurate
// dialogue, a spawn method, and an optional blessing they grant the player.
import type { LeaderId } from "@sim/config/LeaderDefs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** How this leader appears on the overworld. */
export type LeaderSpawnType =
  | "roadside"       // Found along paths between towns
  | "post_battle"    // Appears after the player wins a specific boss fight
  | "town_visitor"   // Found inside a town (added to town entity)
  | "dungeon_exit"   // Appears at dungeon entrance after clearing it
  | "wilderness";    // Found in a specific biome (forest, snow, etc.)

/** A buff the leader grants the party temporarily. */
export interface LeaderBlessing {
  id: string;
  name: string;
  description: string;
  /** Duration in overworld steps. -1 = permanent. */
  duration: number;
  effect:
    | { type: "party_atk_bonus"; multiplier: number }
    | { type: "party_def_bonus"; multiplier: number }
    | { type: "party_hp_regen"; amountPerStep: number }
    | { type: "party_xp_multiplier"; multiplier: number }
    | { type: "encounter_rate_reduction"; multiplier: number }
    | { type: "gold_find_bonus"; multiplier: number };
}

export interface LeaderEncounterDef {
  leaderId: LeaderId;

  /** How this leader spawns on the overworld. */
  spawnType: LeaderSpawnType;

  /** Conditions that must be met before this leader can appear. */
  spawnCondition?: {
    minPartyLevel?: number;
    requiredCompletedQuest?: string;
    requiredBossKill?: string;
  };

  /** Which biome(s) to prefer for placement (for roadside/wilderness types). */
  preferredBiomes?: string[];

  /**
   * Introduction dialogue — lore-accurate lines the leader says the FIRST
   * time the player meets them. Must include self-identification.
   */
  introDialogue: string[];

  /** Return dialogue — shorter lines for subsequent visits. */
  returnDialogue: string[];

  /** Optional blessing the leader grants on first meeting. */
  blessing?: LeaderBlessing;

  /** Optional quest npcId — must match a QuestDef.npcId in QuestDefs.ts. */
  questNpcId?: string;
}

// ---------------------------------------------------------------------------
// Leader encounter definitions
// ---------------------------------------------------------------------------

export const LEADER_ENCOUNTER_DEFS: LeaderEncounterDef[] = [
  // =========================================================================
  // Arthur — The Once and Future King
  // =========================================================================
  {
    leaderId: "arthur",
    spawnType: "roadside",
    spawnCondition: { minPartyLevel: 5 },
    preferredBiomes: ["path", "grass"],
    introDialogue: [
      "Hold, traveler. You walk roads once guarded by the knights of Camelot.",
      "I am Arthur, called by some the Once and Future King. I drew the sword from the stone when I was but a boy, and with it forged a kingdom from warring lords.",
      "The Round Table was my dream — a fellowship of equals, bound not by birth but by honour. Lancelot, Gawain, Percival... each a legend in his own right.",
      "These lands have fallen far since those days. But I see a spark in you that reminds me of my finest knights.",
      "Take my blessing, and prove your mettle against the darkness that stirs.",
    ],
    returnDialogue: [
      "We meet again. The road is long, but you walk it well.",
      "Remember — true strength lies not in the sword, but in the cause it serves.",
    ],
    blessing: {
      id: "kings_valor",
      name: "King's Valor",
      description: "Arthur's blessing strengthens your party's attacks by 15%.",
      duration: 200,
      effect: { type: "party_atk_bonus", multiplier: 1.15 },
    },
    questNpcId: "leader_arthur",
  },

  // =========================================================================
  // Merlin — Archmage of Avalon
  // =========================================================================
  {
    leaderId: "merlin",
    spawnType: "wilderness",
    spawnCondition: { minPartyLevel: 4 },
    preferredBiomes: ["forest"],
    introDialogue: [
      "Hm? Oh, I knew you were coming. The stars told me three nights ago, and the fox confirmed it this morning.",
      "I am Merlin, though I have been called many names across many ages. Archmage. Prophet. Madman. All true, depending on the day.",
      "I guided young Arthur to his throne and helped forge a kingdom from chaos. Magic was the mortar between the stones of Camelot.",
      "But the old magic sickens now. Rogue mages twist the ley lines to dark purpose, and the land suffers for it.",
      "You have potential — untrained, rough, but real. My blessing will sharpen your mind. Use it wisely.",
    ],
    returnDialogue: [
      "Back again? Good. The wise seek counsel; the foolish think they know enough.",
      "The ley lines still tremble. Your work is not yet done.",
    ],
    blessing: {
      id: "arcane_insight",
      name: "Arcane Insight",
      description: "Merlin's wisdom grants your party 25% bonus experience.",
      duration: 150,
      effect: { type: "party_xp_multiplier", multiplier: 1.25 },
    },
    questNpcId: "leader_merlin",
  },

  // =========================================================================
  // Joan — The Maid of Orleans
  // =========================================================================
  {
    leaderId: "joan",
    spawnType: "post_battle",
    spawnCondition: { requiredBossKill: "boss_troll_king" },
    introDialogue: [
      "You fought bravely. I watched from the ridge — the way you held your ground reminded me of Orleans.",
      "I am Joan, called the Maid. A farm girl from Domrémy, once. Then God spoke to me in voices of fire, and I became something else.",
      "I led the armies of France when no lord would. I broke the siege of Orleans and crowned a king at Reims.",
      "They burned me for it. But faith is not a thing that fire can destroy.",
      "Take this blessing — the divine fire that sustained me. May it light your path where mine has ended.",
    ],
    returnDialogue: [
      "Still fighting the good fight? Then we are kindred spirits, you and I.",
      "Do not falter. The darkest hour is just before the dawn.",
    ],
    blessing: {
      id: "divine_fire",
      name: "Divine Fire",
      description: "Joan's faith empowers your party's attacks by 20%.",
      duration: 100,
      effect: { type: "party_atk_bonus", multiplier: 1.2 },
    },
  },

  // =========================================================================
  // Napoleon — Emperor of the West
  // =========================================================================
  {
    leaderId: "napoleon",
    spawnType: "roadside",
    spawnCondition: { minPartyLevel: 6 },
    preferredBiomes: ["grass", "path"],
    introDialogue: [
      "You there. Your formation is sloppy and your supply lines nonexistent. But your spirit — that I can work with.",
      "I am Napoleon Bonaparte. I rose from a minor Corsican family to command the greatest army Europe had ever seen.",
      "At Austerlitz, I defeated two emperors in a single afternoon. At Marengo, I snatched victory from the jaws of certain defeat.",
      "Strategy is everything. A battle is won or lost before the first shot is fired.",
      "I grant you my tactical insight. Use it to outmaneuver your enemies before they even know you're there.",
    ],
    returnDialogue: [
      "Ah, you return. Have you been studying your maps? Good. The prepared mind is the sharpest weapon.",
      "Remember — never interrupt your enemy when they are making a mistake.",
    ],
    blessing: {
      id: "tactical_genius",
      name: "Tactical Genius",
      description: "Napoleon's insight reduces your encounter rate by 30%.",
      duration: 200,
      effect: { type: "encounter_rate_reduction", multiplier: 0.7 },
    },
  },

  // =========================================================================
  // Cleopatra — Queen of the Nile
  // =========================================================================
  {
    leaderId: "cleopatra",
    spawnType: "town_visitor",
    spawnCondition: { minPartyLevel: 3 },
    introDialogue: [
      "A pleasure to meet someone who doesn't grovel. I tire of sycophants.",
      "I am Cleopatra, last Pharaoh of Egypt, Queen of the Nile, and — if the poets are to be believed — the woman who brought Rome to its knees.",
      "I spoke nine languages and could charm a cobra with my wit alone. Julius Caesar and Mark Antony both learned that diplomacy with me was... complicated.",
      "My kingdom fell, but my legacy endures. Gold opens doors that swords cannot.",
      "Here — a taste of Egyptian prosperity. Spend it wisely, and it will multiply.",
    ],
    returnDialogue: [
      "Back for more? I suppose even in these lands, gold is the universal tongue.",
      "Fortune favors the clever, not merely the bold. Remember that.",
    ],
    blessing: {
      id: "golden_tongue",
      name: "Golden Tongue",
      description: "Cleopatra's influence increases gold found by 30%.",
      duration: 200,
      effect: { type: "gold_find_bonus", multiplier: 1.3 },
    },
  },

  // =========================================================================
  // Genghis — Great Khan
  // =========================================================================
  {
    leaderId: "genghis",
    spawnType: "wilderness",
    spawnCondition: { minPartyLevel: 7 },
    preferredBiomes: ["grass", "sand"],
    introDialogue: [
      "You stand in the path of the Great Khan. Few do so twice.",
      "I am Temüjin, whom the world calls Genghis Khan. From the endless steppes I forged an empire that stretched from the Pacific to the gates of Vienna.",
      "I united the Mongol tribes when they were scattered like dust. I conquered cities that had stood for a thousand years.",
      "But I did not conquer through cruelty alone. I rewarded loyalty, and I destroyed only those who broke their word.",
      "Your resolve interests me. Take the strength of the steppe — let nothing stand before you.",
    ],
    returnDialogue: [
      "The Khan remembers those who prove themselves. You have done well.",
      "Keep riding. The horizon is always one day further than you think.",
    ],
    blessing: {
      id: "steppe_fury",
      name: "Steppe Fury",
      description: "Genghis Khan's might strengthens your party's attacks by 15%.",
      duration: 150,
      effect: { type: "party_atk_bonus", multiplier: 1.15 },
    },
  },

  // =========================================================================
  // Caesar — Consul of Rome
  // =========================================================================
  {
    leaderId: "caesar",
    spawnType: "roadside",
    spawnCondition: { minPartyLevel: 6 },
    preferredBiomes: ["path", "grass"],
    introDialogue: [
      "Veni, vidi, vici. I came, I saw, I conquered. That is how I have lived my life.",
      "I am Gaius Julius Caesar, Consul of Rome, conqueror of Gaul, and — some would say — the man who killed a republic and birthed an empire.",
      "I crossed the Rubicon with a single legion and marched on Rome itself. The Senate called it treason. History called it destiny.",
      "Wealth is the sinew of war, young warrior. Without gold, even the mightiest army starves.",
      "My blessing shall fill your coffers. Spend it on steel and potions — the currency of survival.",
    ],
    returnDialogue: [
      "Ave. The roads of this land could use Roman engineering, but your determination compensates.",
      "Gold and glory await. Seize both while you can.",
    ],
    blessing: {
      id: "roman_fortune",
      name: "Roman Fortune",
      description: "Caesar's patronage increases gold found by 25%.",
      duration: 200,
      effect: { type: "gold_find_bonus", multiplier: 1.25 },
    },
    questNpcId: "leader_caesar",
  },

  // =========================================================================
  // Saladin — Sultan of Jerusalem
  // =========================================================================
  {
    leaderId: "saladin",
    spawnType: "wilderness",
    spawnCondition: { minPartyLevel: 5 },
    preferredBiomes: ["sand"],
    introDialogue: [
      "Peace be upon you, traveler. These sands have seen too much blood already.",
      "I am Salah ad-Din, whom the Franks call Saladin. Sultan of Egypt and Syria, liberator of Jerusalem.",
      "I united the Muslim world against the Crusaders, but I am remembered as much for mercy as for war. When I took Jerusalem, I spared its people. Richard the Lionheart called me the noblest of foes.",
      "True strength is not in the arm that strikes, but in the heart that knows when to stay its hand.",
      "I offer you my protection. Let this blessing shield you from harm.",
    ],
    returnDialogue: [
      "You return with honour still intact. That is rarer than gold in these lands.",
      "Go with God, and remember — justice is the mightiest shield.",
    ],
    blessing: {
      id: "sultans_mercy",
      name: "Sultan's Mercy",
      description: "Saladin's grace strengthens your party's defense by 20%.",
      duration: 200,
      effect: { type: "party_def_bonus", multiplier: 1.2 },
    },
  },

  // =========================================================================
  // Alexander — The Great
  // =========================================================================
  {
    leaderId: "alexander",
    spawnType: "roadside",
    spawnCondition: { minPartyLevel: 7 },
    preferredBiomes: ["path", "grass"],
    introDialogue: [
      "Another adventurer? Good. I was growing bored with these timid villagers.",
      "I am Alexander, son of Philip, King of Macedon. They call me 'the Great', though I simply did what was necessary.",
      "By the age of thirty, I had conquered the known world — from Greece to Egypt to the borders of India. My phalanx was unbreakable, my cavalry unstoppable.",
      "I wept when there were no more worlds to conquer. Then I found three more.",
      "You have the hunger I recognize. Take my blessing — may your conquests be as swift as mine.",
    ],
    returnDialogue: [
      "Still fighting? Excellent. The day you stop conquering is the day you start dying.",
      "Remember the phalanx — strength lies in unity, not in the lone hero.",
    ],
    blessing: {
      id: "macedonian_charge",
      name: "Macedonian Charge",
      description: "Alexander's spirit strengthens your party's attacks by 15%.",
      duration: 150,
      effect: { type: "party_atk_bonus", multiplier: 1.15 },
    },
  },

  // =========================================================================
  // Boudicca — Queen of the Iceni
  // =========================================================================
  {
    leaderId: "boudicca",
    spawnType: "wilderness",
    preferredBiomes: ["grass", "forest"],
    introDialogue: [
      "You tread on Iceni land, stranger. Speak your purpose, or draw your blade.",
      "I am Boudicca, Queen of the Iceni. When the Romans whipped me and defiled my daughters, I turned my grief into a fury that shook their empire to its foundations.",
      "I raised an army of a hundred thousand and burned Londinium to ash. The ground still bears the scorch marks of my rage.",
      "Rome won in the end. They always do, with their legions and their discipline. But I showed them that even the conquered can bite back.",
      "You carry wounds too, I can see it. Let my fury heal you — anger can be a fire that warms, not only one that burns.",
    ],
    returnDialogue: [
      "Still standing? Good. The Iceni do not kneel, and neither should you.",
      "Fight on. Every battle you win is a battle they cannot.",
    ],
    blessing: {
      id: "iceni_fury",
      name: "Fury of the Iceni",
      description: "Boudicca's rage slowly heals your party as you travel.",
      duration: 150,
      effect: { type: "party_hp_regen", amountPerStep: 3 },
    },
  },

  // =========================================================================
  // Sun Tzu — Author of The Art of War
  // =========================================================================
  {
    leaderId: "sun_tzu",
    spawnType: "town_visitor",
    introDialogue: [
      "You seem troubled. Sit. I have tea, and perhaps wisdom — both cure many ills.",
      "I am Sun Tzu, general of Wu and author of The Art of War. My words have guided generals for two thousand years, though few truly understand them.",
      "The supreme art of war is to subdue the enemy without fighting. Every battle you avoid is a victory in itself.",
      "Know yourself, know your enemy, and you need not fear the result of a hundred battles.",
      "I offer you strategic clarity. With it, the world will trouble you less.",
    ],
    returnDialogue: [
      "Ah, the student returns. Have you been practicing patience? It is the hardest art.",
      "All warfare is based on deception. But between friends, only truth.",
    ],
    blessing: {
      id: "strategic_mastery",
      name: "Strategic Mastery",
      description: "Sun Tzu's wisdom reduces your encounter rate by 30%.",
      duration: 200,
      effect: { type: "encounter_rate_reduction", multiplier: 0.7 },
    },
  },

  // =========================================================================
  // Leonidas — King of Sparta
  // =========================================================================
  {
    leaderId: "leonidas",
    spawnType: "dungeon_exit",
    spawnCondition: { requiredBossKill: "boss_lich" },
    introDialogue: [
      "You emerge from that darkness alive? Perhaps you are worth my time after all.",
      "I am Leonidas, King of Sparta. With three hundred Spartans, I held the pass of Thermopylae against the entire Persian army.",
      "We knew we would die. Every man among us knew. But we held that pass for three days, and the world remembers.",
      "Molon labe — come and take them. That is what I told Xerxes when he demanded our weapons. He learned what those words cost.",
      "You have proven your courage in the deep dark. Take the discipline of Sparta — let nothing break your shield wall.",
    ],
    returnDialogue: [
      "A Spartan greets you. That alone should tell you what I think of your worth.",
      "Stand firm. The phalanx holds only when every shield overlaps the next.",
    ],
    blessing: {
      id: "spartan_discipline",
      name: "Spartan Discipline",
      description: "Leonidas hardens your party's defense by 20%.",
      duration: 200,
      effect: { type: "party_def_bonus", multiplier: 1.2 },
    },
  },

  // =========================================================================
  // Elizabeth — The Virgin Queen
  // =========================================================================
  {
    leaderId: "elizabeth",
    spawnType: "town_visitor",
    spawnCondition: { minPartyLevel: 4 },
    introDialogue: [
      "You may approach. I have the body of a weak and feeble woman, but I have the heart and stomach of a king — and a king of England at that.",
      "I am Elizabeth, by the Grace of God, Queen of England, France, and Ireland. The Virgin Queen, they call me, though I was married to my kingdom.",
      "I defeated the Spanish Armada, patronized Shakespeare, and turned a small island into the terror of the seas.",
      "Ruling is an art, not a birthright. I outlasted every man who underestimated me — and there were many.",
      "Gold is the lifeblood of empire. Take my blessing and let it enrich your journey.",
    ],
    returnDialogue: [
      "You return? Good. I do not waste my favour on the unworthy.",
      "England prospered because I spent wisely. I suggest you do the same.",
    ],
    blessing: {
      id: "elizabethan_prosperity",
      name: "Elizabethan Prosperity",
      description: "Elizabeth's patronage increases gold found by 25%.",
      duration: 200,
      effect: { type: "gold_find_bonus", multiplier: 1.25 },
    },
  },

  // =========================================================================
  // Attila — Scourge of God
  // =========================================================================
  {
    leaderId: "attila",
    spawnType: "wilderness",
    spawnCondition: { minPartyLevel: 8 },
    preferredBiomes: ["grass", "snow"],
    introDialogue: [
      "You do not flee? Interesting. Most do when they see the banner of the Huns.",
      "I am Attila, whom the Romans named the Scourge of God. Where my horse trod, no grass grew — and no empire stood for long.",
      "I ruled from the Rhine to the Urals. Rome paid me tribute in gold just to stay my hand. Constantinople trembled at my name.",
      "The weak build walls. The strong ride through them.",
      "You have the look of a raider, not a farmer. Take my ferocity — let it sharpen your edge.",
    ],
    returnDialogue: [
      "Still alive? Then you are either very skilled or very lucky. Either will do.",
      "The hunt continues. Do not rest until your enemies are dust.",
    ],
    blessing: {
      id: "hunnic_fury",
      name: "Hunnic Fury",
      description: "Attila's wrath strengthens your party's attacks by 20%.",
      duration: 120,
      effect: { type: "party_atk_bonus", multiplier: 1.2 },
    },
  },

  // =========================================================================
  // Charlemagne — Father of Europe
  // =========================================================================
  {
    leaderId: "charlemagne",
    spawnType: "roadside",
    spawnCondition: { minPartyLevel: 5 },
    preferredBiomes: ["path", "forest"],
    introDialogue: [
      "Halt, pilgrim. These roads were once safe under my protection. I see they need it again.",
      "I am Charles, King of the Franks and Lombards, Emperor of the Romans. History remembers me as Charlemagne — Charles the Great.",
      "I united the fractured kingdoms of Europe with iron will and the grace of the Church. On Christmas Day in the year 800, Pope Leo crowned me Emperor.",
      "I built schools when others built only castles. A kingdom without learning is a kingdom without a future.",
      "You travel with purpose. Let my blessing ease your path.",
    ],
    returnDialogue: [
      "The pilgrim returns. I trust the roads have treated you well?",
      "Persist. Unity is built one step at a time, one alliance at a time.",
    ],
    blessing: {
      id: "imperial_grace",
      name: "Imperial Grace",
      description: "Charlemagne's wisdom grants your party 20% bonus experience.",
      duration: 180,
      effect: { type: "party_xp_multiplier", multiplier: 1.2 },
    },
  },

  // =========================================================================
  // Hannibal — Commander of Carthage
  // =========================================================================
  {
    leaderId: "hannibal",
    spawnType: "wilderness",
    spawnCondition: { minPartyLevel: 6 },
    preferredBiomes: ["snow", "grass"],
    introDialogue: [
      "You climb these peaks as though altitude were merely an inconvenience. I like that.",
      "I am Hannibal Barca, Commander of Carthage. I crossed the Alps with thirty-seven war elephants to bring the fight to Rome's doorstep.",
      "At Cannae, I annihilated eighty thousand Roman soldiers with half their number. Military academies still teach that battle two thousand years later.",
      "Rome feared me for sixteen years. Sixteen years I fought on their soil, undefeated in the field.",
      "Take the endurance of my march. Let nothing — not mountains, not monsters, not despair — slow your advance.",
    ],
    returnDialogue: [
      "Still marching? Good. The Alps broke lesser men, but not you.",
      "Remember Cannae — the flanks are always the weakness. Always.",
    ],
    blessing: {
      id: "alpine_endurance",
      name: "Alpine Endurance",
      description: "Hannibal's resilience slowly heals your party as you travel.",
      duration: 180,
      effect: { type: "party_hp_regen", amountPerStep: 4 },
    },
  },

  // =========================================================================
  // Wilhelmina — The Iron Duchess
  // =========================================================================
  {
    leaderId: "wilhelmina",
    spawnType: "town_visitor",
    spawnCondition: { minPartyLevel: 3 },
    introDialogue: [
      "You look like someone who understands the value of a guilder. Most adventurers spend faster than they earn.",
      "I am Wilhelmina, though my enemies called me the Iron Duchess. I built the finest trade network the Low Countries had ever seen.",
      "Behind every great army stands an economy that never sleeps. I provided the gold that kings spent on their wars.",
      "Let others chase glory with swords. I conquered with contracts, ledgers, and compound interest.",
      "My blessing is practical, not poetic. Your purse will thank me.",
    ],
    returnDialogue: [
      "Managing your gold well, I hope? Waste is the enemy of prosperity.",
      "Invest wisely. Every coin spent should return two.",
    ],
    blessing: {
      id: "merchants_fortune",
      name: "Merchant's Fortune",
      description: "Wilhelmina's trade acumen increases gold found by 30%.",
      duration: 200,
      effect: { type: "gold_find_bonus", multiplier: 1.3 },
    },
  },

  // =========================================================================
  // Ragnar — Raider King
  // =========================================================================
  {
    leaderId: "ragnar",
    spawnType: "wilderness",
    spawnCondition: { minPartyLevel: 5 },
    preferredBiomes: ["snow", "forest"],
    introDialogue: [
      "Skál! You have the look of a warrior, not a thrall. Join me by the fire.",
      "I am Ragnar Lothbrok, Raider King, scourge of Northumbria and Paris. I sailed into legends that terrified half the known world.",
      "My sons — Ivar the Boneless, Björn Ironside, Sigurd Snake-in-the-Eye — each carved their own sagas. But it was I who showed them the way.",
      "The gods love courage. Odin himself watches from Valhalla, waiting for warriors brave enough to earn a seat at his table.",
      "Fight like a Viking, and you'll never know defeat — only glory.",
    ],
    returnDialogue: [
      "The raider returns! Skál! Tell me of your conquests.",
      "Odin watches you, warrior. Do not disappoint him.",
    ],
    blessing: {
      id: "berserker_rage",
      name: "Berserker Rage",
      description: "Ragnar's fury strengthens your party's attacks by 15%.",
      duration: 150,
      effect: { type: "party_atk_bonus", multiplier: 1.15 },
    },
  },

  // =========================================================================
  // Nzinga — Queen of Ndongo
  // =========================================================================
  {
    leaderId: "nzinga",
    spawnType: "roadside",
    spawnCondition: { minPartyLevel: 4 },
    preferredBiomes: ["grass", "forest"],
    introDialogue: [
      "Do not mistake my composure for weakness. I have faced worse than you and won.",
      "I am Nzinga, Queen of Ndongo and Matamba. When the Portuguese came to enslave my people, I fought them for forty years.",
      "They expected submission. I gave them guerrilla warfare, shifting alliances, and diplomatic circles they could not untangle.",
      "I negotiated, fought, and outmaneuvered empires for decades. When they offered me a mat on the floor instead of a chair, I sat on the back of my servant and looked them in the eye.",
      "Adaptability is the greatest weapon. Take my blessing — let it keep you alive when brute force fails.",
    ],
    returnDialogue: [
      "You persist. Good. Persistence defeated the Portuguese; it will defeat your enemies too.",
      "Fight smart, not just hard. That is the difference between victory and valor.",
    ],
    blessing: {
      id: "queens_resilience",
      name: "Queen's Resilience",
      description: "Nzinga's endurance strengthens your party's defense by 15%.",
      duration: 180,
      effect: { type: "party_def_bonus", multiplier: 1.15 },
    },
  },

  // =========================================================================
  // Vlad — The Impaler
  // =========================================================================
  {
    leaderId: "vlad",
    spawnType: "dungeon_exit",
    spawnCondition: { requiredBossKill: "boss_demon_lord" },
    introDialogue: [
      "You survived that place? Then you understand — some evils must be met with greater cruelty.",
      "I am Vlad Dracula, Prince of Wallachia. The Turks called me the Impaler, and they were right to fear the name.",
      "When the Ottoman Sultan sent two envoys to demand my submission, I nailed their turbans to their skulls. The message was... received.",
      "My reputation alone turned back armies. Twenty thousand stakes along the Danube convinced Mehmed the Conqueror to go home.",
      "Take my resolve. Your enemies should fear not just your blade, but the mere thought of facing you.",
    ],
    returnDialogue: [
      "The darkness does not trouble you. Good. It should be a tool, not a master.",
      "Let your enemies' imaginations do the work. Fear is cheaper than steel.",
    ],
    blessing: {
      id: "dread_lords_will",
      name: "Dread Lord's Will",
      description: "Vlad's terror strengthens your party's defense by 25%.",
      duration: 200,
      effect: { type: "party_def_bonus", multiplier: 1.25 },
    },
  },
];

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

export function getLeaderEncounterDef(leaderId: LeaderId): LeaderEncounterDef | undefined {
  return LEADER_ENCOUNTER_DEFS.find(d => d.leaderId === leaderId);
}
