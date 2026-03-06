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
  // Lancelot — Knight of the Lake
  // =========================================================================
  {
    leaderId: "lancelot",
    spawnType: "post_battle",
    spawnCondition: { requiredBossKill: "boss_troll_king" },
    introDialogue: [
      "You fought well. I watched from the treeline — your technique is raw, but your heart is steady.",
      "I am Lancelot du Lac, Knight of the Lake. I was raised beneath enchanted waters by the Lady Nimue herself, trained in arts no mortal school could teach.",
      "They called me the greatest swordsman of the Round Table. I won every tournament, broke every siege, and never once lost in single combat.",
      "But my greatest battle was the one I lost — the war between duty and desire. I loved my king, and I loved his queen, and that contradiction destroyed us all.",
      "Take my blessing. Let my blade's memory strengthen yours, and may you wield it with fewer regrets than I.",
    ],
    returnDialogue: [
      "Still standing? Good. A true knight rises every time he falls.",
      "Honour is not a thing you hold — it is a thing you do, again and again.",
    ],
    blessing: {
      id: "lake_knights_fury",
      name: "Lake Knight's Fury",
      description: "Lancelot's peerless skill empowers your party's attacks by 20%.",
      duration: 100,
      effect: { type: "party_atk_bonus", multiplier: 1.2 },
    },
  },

  // =========================================================================
  // Tristan — Knight of Cornwall
  // =========================================================================
  {
    leaderId: "tristan",
    spawnType: "roadside",
    spawnCondition: { minPartyLevel: 6 },
    preferredBiomes: ["grass", "path"],
    introDialogue: [
      "A fellow traveler on these cursed roads? You move like someone who has seen combat. Good — I tire of frightened peasants.",
      "I am Tristan of Lyonesse, knight of Cornwall, nephew to King Mark. My sword has drunk the blood of giants and my harp has brought queens to tears.",
      "I slew Morholt, the Irish champion, when no other knight would face him. The wound he gave me nearly killed me — but it led me to Isolde, and that changed everything.",
      "Love and war are the only things worth dying for. I have done both, and would do both again.",
      "You carry yourself like a warrior. Take my blessing — let it quicken your step and sharpen your eye.",
    ],
    returnDialogue: [
      "We meet again, friend. The roads of this land are kinder with good company.",
      "Keep your blade sharp and your heart open. One without the other is useless.",
    ],
    blessing: {
      id: "cornish_swiftness",
      name: "Cornish Swiftness",
      description: "Tristan's agility reduces your encounter rate by 30%.",
      duration: 200,
      effect: { type: "encounter_rate_reduction", multiplier: 0.7 },
    },
  },

  // =========================================================================
  // Guinevere — Queen of Camelot
  // =========================================================================
  {
    leaderId: "guinevere",
    spawnType: "town_visitor",
    spawnCondition: { minPartyLevel: 3 },
    introDialogue: [
      "You carry yourself with purpose. That is rare in these troubled times.",
      "I am Guinevere, Queen of Camelot, wife to Arthur Pendragon. They remember me for the scandal, but I held the court together when Arthur rode to war.",
      "Every alliance Camelot ever forged passed through my hall first. I spoke with lords and commoners alike, and I knew the price of every peace.",
      "The poets blame me for Camelot's fall. Perhaps they are right. But I also built much of what they mourn.",
      "Take this — the treasury of Camelot was once my domain, and I know the worth of every coin.",
    ],
    returnDialogue: [
      "You return. I hope the gold served you well — it was hard-won.",
      "A court thrives on generosity, not hoarding. Spend wisely, and loyalty follows.",
    ],
    blessing: {
      id: "queens_treasury",
      name: "Queen's Treasury",
      description: "Guinevere's influence increases gold found by 30%.",
      duration: 200,
      effect: { type: "gold_find_bonus", multiplier: 1.3 },
    },
  },

  // =========================================================================
  // Gawain — The Sun Knight
  // =========================================================================
  {
    leaderId: "gawain",
    spawnType: "wilderness",
    spawnCondition: { minPartyLevel: 7 },
    preferredBiomes: ["grass", "path"],
    introDialogue: [
      "Hold! I would know your name before we pass, stranger. Courtesy costs nothing and earns much.",
      "I am Gawain, son of King Lot, nephew to Arthur, and Knight of the Round Table. They call me the Sun Knight, for my strength waxes with the sun — by noon, no man alive can match me.",
      "I faced the Green Knight when he rode into Camelot and challenged us all. I struck off his head, and he picked it up and laughed. That was the strangest year of my life.",
      "I am not the purest knight, nor the cleverest. But I am the most courteous, and courtesy is a kind of armour that never rusts.",
      "Take my blessing. Let the strength of the sun warm your blood and harden your resolve.",
    ],
    returnDialogue: [
      "The Sun Knight greets you. You have grown stronger since we last met.",
      "Remember — strength without courtesy is mere brutality.",
    ],
    blessing: {
      id: "solar_might",
      name: "Solar Might",
      description: "Gawain's sun-strength fortifies your party's attacks by 15%.",
      duration: 150,
      effect: { type: "party_atk_bonus", multiplier: 1.15 },
    },
  },

  // =========================================================================
  // Bedivere — The One-Handed Knight
  // =========================================================================
  {
    leaderId: "bedivere",
    spawnType: "roadside",
    spawnCondition: { minPartyLevel: 6 },
    preferredBiomes: ["path", "grass"],
    introDialogue: [
      "You walk with the weight of the world on your shoulders. I know the feeling well.",
      "I am Bedivere, called the One-Handed — though I lost my hand in battle, not in shame. I was one of the first knights Arthur ever trusted.",
      "When all was lost at Camlann, it was I who stood with the king at the end. He asked me to cast Excalibur into the lake. Twice I lied and kept it. The third time, I obeyed.",
      "I watched the barge carry him to Avalon. I am the last of the Round Table, and I carry its memory alone.",
      "Your coffers run light? A steward's eye sees gold where others see only dust. Take my blessing.",
    ],
    returnDialogue: [
      "Still on the road? Good. The quest only ends when the quester does.",
      "Gold and glory — both fade. But loyalty endures beyond the grave.",
    ],
    blessing: {
      id: "stewards_eye",
      name: "Steward's Eye",
      description: "Bedivere's prudence increases gold found by 25%.",
      duration: 200,
      effect: { type: "gold_find_bonus", multiplier: 1.25 },
    },
    questNpcId: "leader_bedivere",
  },

  // =========================================================================
  // Kay — Seneschal of Camelot
  // =========================================================================
  {
    leaderId: "kay",
    spawnType: "wilderness",
    spawnCondition: { minPartyLevel: 5 },
    preferredBiomes: ["forest", "grass"],
    introDialogue: [
      "Another wanderer? I hope you are more useful than the last dozen I have met.",
      "I am Kay, Arthur's foster-brother and Seneschal of Camelot. While the knights chased glory, I made certain the kingdom actually functioned.",
      "Someone had to manage the grain stores, the armouries, the levies. Someone had to tell the king when his Round Table was being idiotic. That someone was me.",
      "They call me sharp-tongued. I call myself honest. The difference is a matter of perspective.",
      "I cannot offer you a sword-arm. But I can offer you efficiency — and efficiency wins more wars than courage.",
    ],
    returnDialogue: [
      "Back again? At least you are persistent. That is the second-best quality in a knight, after punctuality.",
      "Keep your supplies stocked and your head level. Heroes die young; stewards retire.",
    ],
    blessing: {
      id: "seneschals_order",
      name: "Seneschal's Order",
      description: "Kay's discipline strengthens your party's defense by 20%.",
      duration: 200,
      effect: { type: "party_def_bonus", multiplier: 1.2 },
    },
  },

  // =========================================================================
  // Percival — The Grail Seeker
  // =========================================================================
  {
    leaderId: "percival",
    spawnType: "roadside",
    spawnCondition: { minPartyLevel: 7 },
    preferredBiomes: ["path", "grass"],
    introDialogue: [
      "You seek something. I can see it in the way you walk — always forward, never resting.",
      "I am Percival, once a fool raised in the wild forests by a mother who feared the world. I knew nothing of knights until I stumbled into Camelot by sheer chance.",
      "They laughed at me. The country boy in borrowed armour. But I found the Grail Castle, saw the Fisher King, and beheld the Holy Grail itself.",
      "I failed the first time — I did not ask the question. Pride sealed my lips. But I returned, humbled, and the Grail answered.",
      "Your quest mirrors mine. Take my blessing — may it guide you where pride cannot.",
    ],
    returnDialogue: [
      "Still seeking? Good. The Grail reveals itself only to those who never stop looking.",
      "Ask the question, traveler. Always ask the question.",
    ],
    blessing: {
      id: "grail_seekers_light",
      name: "Grail Seeker's Light",
      description: "Percival's faith fortifies your party's attacks by 15%.",
      duration: 150,
      effect: { type: "party_atk_bonus", multiplier: 1.15 },
    },
  },

  // =========================================================================
  // Isolde — The Fair Healer
  // =========================================================================
  {
    leaderId: "isolde",
    spawnType: "wilderness",
    preferredBiomes: ["grass", "forest"],
    introDialogue: [
      "Careful where you step. These herbs are rare, and I have been gathering since dawn.",
      "I am Isolde of Ireland, princess and healer. My hands have mended wounds that should have been mortal — including those of the very knight who killed my uncle.",
      "They remember me for the love potion. For Tristan. As though a woman could not be more than a love story.",
      "I was trained in the healing arts before I could hold a sword. I learned the names of every herb, every salve, every poultice that could pull a man back from death's door.",
      "You look weary. Let my blessing mend what battle has broken.",
    ],
    returnDialogue: [
      "The wanderer returns, battered as ever. Come — let me tend your wounds.",
      "Healing is not weakness. Even the mightiest oak needs rain.",
    ],
    blessing: {
      id: "healers_grace",
      name: "Healer's Grace",
      description: "Isolde's art slowly heals your party as you travel.",
      duration: 150,
      effect: { type: "party_hp_regen", amountPerStep: 3 },
    },
  },

  // =========================================================================
  // Morgana — The Fay Enchantress
  // =========================================================================
  {
    leaderId: "morgana",
    spawnType: "town_visitor",
    introDialogue: [
      "You can see me? Interesting. Most mortals walk right past without a glance.",
      "I am Morgana le Fay, half-sister to Arthur, student of Merlin, and mistress of the old magic. The Church calls me a villain. The fay folk call me a queen.",
      "I learned sorcery in Avalon, where time runs differently and the veil between worlds is thin as gossamer. Merlin taught me much — but I surpassed him in ways he never expected.",
      "They say I plotted Arthur's downfall. Perhaps. Or perhaps I simply refused to let men dictate the shape of the world unchallenged.",
      "Magic bends the cost of all things. Take my enchantment — let it lighten the weight of gold on your purse.",
    ],
    returnDialogue: [
      "You return to the Fay? Bold. Most mortals learn caution after the first visit.",
      "The old magic stirs. Use what I have given you before it fades.",
    ],
    blessing: {
      id: "fay_enchantment",
      name: "Fay Enchantment",
      description: "Morgana's magic reduces your encounter rate by 30%.",
      duration: 200,
      effect: { type: "encounter_rate_reduction", multiplier: 0.7 },
    },
  },

  // =========================================================================
  // Galahad — The Pure Knight
  // =========================================================================
  {
    leaderId: "galahad",
    spawnType: "dungeon_exit",
    spawnCondition: { requiredBossKill: "boss_lich" },
    introDialogue: [
      "You emerged from that abyss with your soul intact. That is no small thing.",
      "I am Galahad, son of Lancelot, Knight of the Round Table. They call me the Pure Knight — not because I have never suffered, but because I have never yielded to darkness.",
      "I sat in the Siege Perilous, the seat at the Round Table that destroyed any knight unworthy of it. I survived. That was the day they knew the Grail quest would end with me.",
      "I beheld the Holy Grail and was taken up into grace. Yet here I stand again, for the land still has need of purity.",
      "Take the light that sustained me through the darkest places. Let it be your shield.",
    ],
    returnDialogue: [
      "The pure heart recognizes another. You walk with grace, traveler.",
      "The darkness can be endured. It is the doubt that kills.",
    ],
    blessing: {
      id: "grail_knights_shield",
      name: "Grail Knight's Shield",
      description: "Galahad hardens your party's defense by 20%.",
      duration: 200,
      effect: { type: "party_def_bonus", multiplier: 1.2 },
    },
  },

  // =========================================================================
  // Nimue — Lady of the Lake
  // =========================================================================
  {
    leaderId: "nimue",
    spawnType: "town_visitor",
    spawnCondition: { minPartyLevel: 4 },
    introDialogue: [
      "The water remembers you. It told me you were coming before you even left the last town.",
      "I am Nimue, the Lady of the Lake. I gave Excalibur to Arthur and raised Lancelot beneath enchanted waters. The poets say I imprisoned Merlin — they are not entirely wrong.",
      "I am older than Camelot, older than the druids, older than the stones they worshipped. The lake is my domain, and through it I see all the waters of the world.",
      "Merlin loved me, and I used that love to learn his secrets. Was it cruel? Perhaps. But the old magic needed a guardian, and he had grown careless.",
      "Your aim could use enchantment. Take my blessing — let every arrow fly true.",
    ],
    returnDialogue: [
      "The lake rippled when you approached. It knows you now.",
      "The waters are patient. Be patient too, and they will reveal what you seek.",
    ],
    blessing: {
      id: "lake_maidens_aim",
      name: "Lake Maiden's Aim",
      description: "Nimue's enchantment increases gold found by 25%.",
      duration: 200,
      effect: { type: "gold_find_bonus", multiplier: 1.25 },
    },
  },

  // =========================================================================
  // Mordred — The Treacherous Son
  // =========================================================================
  {
    leaderId: "mordred",
    spawnType: "wilderness",
    spawnCondition: { minPartyLevel: 8 },
    preferredBiomes: ["grass", "snow"],
    introDialogue: [
      "You do not recoil at my name? Either you are brave, or you do not know who I am. Let me enlighten you.",
      "I am Mordred, son of Arthur — born of a sin the king tried to drown in the sea. Every babe in that boat died. Except me.",
      "I grew up knowing I was unwanted. I joined the Round Table, fought beside my father's knights, earned my place — and still they whispered 'bastard' behind my back.",
      "So I took what I was owed. I raised an army, seized the throne, and met Arthur at Camlann. We killed each other. The poets call it tragedy. I call it inevitability.",
      "You want power? Real power, not the gilded kind? Take it. I did, and I regret nothing.",
    ],
    returnDialogue: [
      "Still breathing? Most who cross my path do not return for a second visit.",
      "Ambition is not a sin. It is the only honest virtue.",
    ],
    blessing: {
      id: "usurpers_edge",
      name: "Usurper's Edge",
      description: "Mordred's fury strengthens your party's attacks by 20%.",
      duration: 120,
      effect: { type: "party_atk_bonus", multiplier: 1.2 },
    },
  },

  // =========================================================================
  // Uther — The Pendragon
  // =========================================================================
  {
    leaderId: "uther",
    spawnType: "roadside",
    spawnCondition: { minPartyLevel: 5 },
    preferredBiomes: ["path", "forest"],
    introDialogue: [
      "Stand aside, or state your business. I have no patience for idle chatter.",
      "I am Uther Pendragon, High King of Britain, father of Arthur. The dragon standard was mine before it was his.",
      "I united the warring lords of Britain through fire and sword when diplomacy failed — which was often. The Saxons learned to fear the Pendragon banner.",
      "Merlin aided me, yes. But the victories were won with British steel and British blood, not sorcery.",
      "You have the bearing of a soldier, not a courtier. Good. Take my blessing — let it speed your war machine.",
    ],
    returnDialogue: [
      "The Pendragon remembers those who serve with honour. You have done well.",
      "War waits for no one. Press the attack while the iron is hot.",
    ],
    blessing: {
      id: "pendragons_fury",
      name: "Pendragon's Fury",
      description: "Uther's command grants your party 20% bonus experience.",
      duration: 180,
      effect: { type: "party_xp_multiplier", multiplier: 1.2 },
    },
  },

  // =========================================================================
  // Gareth — Knight of Many Colours
  // =========================================================================
  {
    leaderId: "gareth",
    spawnType: "wilderness",
    spawnCondition: { minPartyLevel: 6 },
    preferredBiomes: ["forest", "grass"],
    introDialogue: [
      "Well met, traveler. These woods are not safe, but they are beautiful. Sometimes that is enough.",
      "I am Gareth, brother to Gawain, nephew to the king. When I came to Camelot, I asked to serve in the kitchens for a year before I would be knighted.",
      "Kay mocked me and called me 'Beaumains' — pretty hands. He thought me a beggar. I let him think it.",
      "When the year ended, I rode out and defeated the Red Knight, the Blue Knight, the Green Knight — each one fiercer than the last. They call me the Knight of Many Colours now.",
      "Humility is the truest armour. Take my blessing — let it tame the beasts that bar your path.",
    ],
    returnDialogue: [
      "Beaumains greets you! The kitchen boy remembers those who treat him kindly.",
      "Prove yourself through deeds, not words. That is the only knighthood that matters.",
    ],
    blessing: {
      id: "beaumains_resolve",
      name: "Beaumains' Resolve",
      description: "Gareth's perseverance slowly heals your party as you travel.",
      duration: 180,
      effect: { type: "party_hp_regen", amountPerStep: 4 },
    },
  },

  // =========================================================================
  // Elaine — The Lily Maid
  // =========================================================================
  {
    leaderId: "elaine",
    spawnType: "town_visitor",
    spawnCondition: { minPartyLevel: 3 },
    introDialogue: [
      "You seem kind. That is rarer than gold in these lands, and worth more besides.",
      "I am Elaine of Corbenic, keeper of the Holy Grail. They also call me the Lily Maid, though I am more thorn than petal when I need to be.",
      "I loved Lancelot. He did not love me — his heart belonged to another. But from our brief time together came Galahad, the purest knight who ever lived.",
      "I bore the Grail in my father's castle and witnessed miracles that would blind a lesser soul. The light of the Grail teaches you what truly matters.",
      "Take my blessing. It is not a warrior's gift, but gold keeps warriors alive when swords alone cannot.",
    ],
    returnDialogue: [
      "You return with weariness in your eyes. Rest here a while — even heroes need kindness.",
      "The Grail's light touches all who seek it with a true heart.",
    ],
    blessing: {
      id: "grail_keepers_bounty",
      name: "Grail Keeper's Bounty",
      description: "Elaine's grace increases gold found by 30%.",
      duration: 200,
      effect: { type: "gold_find_bonus", multiplier: 1.3 },
    },
  },

  // =========================================================================
  // Bors — The Steadfast
  // =========================================================================
  {
    leaderId: "bors",
    spawnType: "wilderness",
    spawnCondition: { minPartyLevel: 5 },
    preferredBiomes: ["forest", "grass"],
    introDialogue: [
      "You have the look of a quester. I should know — I have been on enough of them.",
      "I am Bors de Ganis, cousin to Lancelot, Knight of the Round Table. I was one of only three knights to behold the Holy Grail — and the only one who returned to tell the tale.",
      "Galahad was taken up in glory. Percival stayed behind to pray. But someone had to carry the story back to Camelot, and that someone was me.",
      "I am not the strongest knight, nor the purest, nor the most famous. But I am steadfast. I endure. And that, in the end, is what matters most.",
      "Take the endurance of a man who has walked to the edge of heaven and walked back again.",
    ],
    returnDialogue: [
      "Still walking? Good. The steadfast do not stop until the road ends — and the road never ends.",
      "Endurance is not glamorous. But it is the one virtue that never fails.",
    ],
    blessing: {
      id: "steadfast_resolve",
      name: "Steadfast Resolve",
      description: "Bors' tenacity strengthens your party's attacks by 15%.",
      duration: 150,
      effect: { type: "party_atk_bonus", multiplier: 1.15 },
    },
  },

  // =========================================================================
  // Igraine — Duchess of Cornwall
  // =========================================================================
  {
    leaderId: "igraine",
    spawnType: "roadside",
    spawnCondition: { minPartyLevel: 4 },
    preferredBiomes: ["grass", "forest"],
    introDialogue: [
      "You carry yourself well for a wanderer. Most who walk these roads have forgotten what dignity looks like.",
      "I am Igraine, Duchess of Cornwall, mother of Arthur Pendragon. Before I was the mother of a legend, I was a duchess who held her lands against raiders and rivals alike.",
      "Uther desired me. Merlin made it possible. I will not speak of that night — but from it came the boy who would be king.",
      "I raised Morgana before Arthur was even born. I know the weight of shaping those who will shape the world.",
      "You need resources, not speeches. Take my blessing — let it fill your coffers for the road ahead.",
    ],
    returnDialogue: [
      "You endure. That is the first quality I taught my children — endurance above all.",
      "Gold is a tool, not a treasure. Use it, or it rusts in your purse.",
    ],
    blessing: {
      id: "cornwall_prosperity",
      name: "Cornwall Prosperity",
      description: "Igraine's wisdom strengthens your party's defense by 15%.",
      duration: 180,
      effect: { type: "party_def_bonus", multiplier: 1.15 },
    },
  },

  // =========================================================================
  // Agravain — The Dark Knight
  // =========================================================================
  {
    leaderId: "agravain",
    spawnType: "dungeon_exit",
    spawnCondition: { requiredBossKill: "boss_demon_lord" },
    introDialogue: [
      "You survived the pit. Good. I was beginning to think I was the only one stubborn enough to endure such places.",
      "I am Agravain, son of King Lot, brother to Gawain. They call me the Dark Knight — not for villainy, but because I did what no one else had the stomach to do.",
      "I exposed Lancelot and Guinevere's affair. The others knew. Every knight at the Round Table knew. But they were too craven to speak, and I was not.",
      "It destroyed Camelot. I know that. Lancelot killed me for it. But a lie left to fester poisons everything it touches.",
      "Take my resolve. The world calls it cruelty; I call it honesty that draws blood.",
    ],
    returnDialogue: [
      "Still alive? Then the darkness has not claimed you. It tried with me and failed — barely.",
      "Truth is a blade. It cuts the wielder as often as the enemy.",
    ],
    blessing: {
      id: "dark_knights_will",
      name: "Dark Knight's Will",
      description: "Agravain's iron will strengthens your party's defense by 25%.",
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
