// ---------------------------------------------------------------------------
// Tekken mode – Character-specific story endings for Arcade mode
// Each character has a unique vignette displayed after completing Arcade.
// ---------------------------------------------------------------------------

export interface TekkenStoryEnding {
  characterId: string;
  title: string;
  /** Narrative paragraphs shown sequentially */
  paragraphs: string[];
  /** Epilogue text shown after the main story */
  epilogue: string;
}

export const TEKKEN_STORY_ENDINGS: TekkenStoryEnding[] = [
  {
    characterId: "knight",
    title: "The Iron Bulwark's Oath",
    paragraphs: [
      "With the tournament's final challenger defeated, Sir Aldric plants his sword in the arena floor and kneels.",
      "The crowd falls silent as the knight removes his helm, revealing the scars of a hundred battles beneath.",
      "\"I did not fight for glory,\" he speaks, voice steady. \"I fought so that no child in Camelot need lift a blade in fear again.\"",
      "King Arthur himself descends from the royal box, clasping Aldric's shoulder. \"Then rise, Champion. Your vigil is over.\"",
    ],
    epilogue: "Sir Aldric was named Protector of the Realm, a title not bestowed in a hundred years. They say he still patrols the kingdom's roads at night, his iron will unbroken.",
  },
  {
    characterId: "berserker",
    title: "The Unbroken Spirit",
    paragraphs: [
      "Bjorn stands amidst the rubble of the arena walls he shattered during the final bout, chest heaving, fists still clenched.",
      "A child in the crowd throws a wilted flower. It lands at his feet. The berserker stares at it -- and laughs.",
      "\"I came to break everything,\" he growls, picking up the flower with surprising gentleness. \"But some things... some things deserve to stay whole.\"",
      "He tucks the flower behind his ear and walks out of the arena, the crowd parting in bewildered silence.",
    ],
    epilogue: "Bjorn Ironfist returned to the northern highlands and founded a fighting school. His students learned that true strength is knowing when not to strike.",
  },
  {
    characterId: "monk",
    title: "The Thousandfold Path",
    paragraphs: [
      "Brother Cedric meditates in the center of the ruined arena as dawn breaks through the shattered ceiling.",
      "His opponents taught him more than victory ever could -- each fight a mirror reflecting a different facet of the self.",
      "\"I sought the perfect technique,\" he murmurs to no one. \"Instead I found the perfect imperfection -- the beauty in every stumble, every breath between strikes.\"",
      "He rises, bows once to the empty arena, and walks barefoot into the morning mist.",
    ],
    epilogue: "Brother Cedric returned to the monastery and wrote 'The Thousandfold Path,' a treatise on combat philosophy that is still studied by warriors across the realm.",
  },
  {
    characterId: "paladin",
    title: "The Radiant Dawn",
    paragraphs: [
      "Lady Isolde stands before the cathedral altar, her tournament armor still bearing the dents and scratches of every battle.",
      "She had prayed for the strength to prevail. Now she prays for the wisdom to know what comes next.",
      "\"The light showed me their pain,\" she confesses to the empty chapel. \"Every opponent carried a wound no blade could heal. And so do I.\"",
      "She sets her shield upon the altar -- not in surrender, but in offering. A new purpose crystallizes in her heart.",
    ],
    epilogue: "Lady Isolde founded the Order of the Radiant Shield, dedicated to healing those broken by war. Her shield still hangs above the altar, a symbol that protection is the highest calling.",
  },
  {
    characterId: "assassin",
    title: "The Unseen Truth",
    paragraphs: [
      "Shade watches the celebrations from a rooftop, unseen as always. The tournament prize -- a king's ransom in gold -- sits unclaimed in the arena below.",
      "\"They cheer for a ghost,\" Shade whispers, a rare smile crossing scarred lips. \"Let them keep their gold. I already took what I came for.\"",
      "In Shade's hand is a small locket, pried from a hidden compartment beneath the arena floor during the chaos of the final fight.",
      "Inside: the true name of the one who ordered the destruction of Shade's village. At last, the real hunt can begin.",
    ],
    epilogue: "The tournament champion vanished that night. Three months later, a corrupt lord was found bound and delivered to the king's justice. No one ever learned who was responsible.",
  },
  {
    characterId: "warlord",
    title: "The Red King's Feast",
    paragraphs: [
      "Gorm the Red sits on a makeshift throne of broken arena pillars, gnawing a turkey leg and bellowing with laughter.",
      "\"Bring me more challengers!\" he roars, ale sloshing from his tankard. \"That was barely a warm-up!\"",
      "But later, alone in his tent, the warlord stares at the championship medallion with an expression no one would recognize: doubt.",
      "\"Is this all there is?\" he mutters. Then he grins, crushes the tankard flat, and begins planning his next conquest. Some questions are better left unanswered.",
    ],
    epilogue: "Gorm the Red used his tournament fame to unite three warring clans under his banner. His enemies called him tyrant; his people called him king. Both were right.",
  },
  {
    characterId: "nimue",
    title: "Avalon's Whisper",
    paragraphs: [
      "The lake surface shimmers as Nimue kneels at its edge, her reflection wavering between mortal woman and something older, deeper.",
      "The tournament had drawn her from the sacred waters for the first time in centuries. Now she understands why.",
      "\"The world above has forgotten magic,\" she says to the lake. \"They replace wonder with iron and call it progress.\"",
      "She extends her hand, and Excalibur rises from the depths, gleaming with otherworldly light. \"It is time to remind them.\"",
    ],
    epilogue: "Nimue returned to the courts of men bearing Excalibur, seeking the one worthy of its power. Some say she still searches. Others say she already found them.",
  },
  {
    characterId: "pellinore",
    title: "The Questing Beast's End",
    paragraphs: [
      "King Pellinore sits by a campfire in the forest, armor dented, body aching from the tournament's final battle.",
      "He has pursued the Questing Beast for thirty years. Tonight, for the first time, it found him.",
      "The creature emerges from the treeline -- not to flee, but to regard him with ancient, knowing eyes.",
      "\"You were never the prey,\" Pellinore realizes, lowering his spear. \"You were leading me. Teaching me. Every chase, every dead end... it was all training.\"",
    ],
    epilogue: "King Pellinore and the Questing Beast were seen traveling together after that night. The old king finally understood that the hunt was never about the destination.",
  },
  {
    characterId: "tristan",
    title: "The Relentless Heart",
    paragraphs: [
      "Sir Tristan stands on the castle balcony, twin blades sheathed, watching the sun set over the tournament grounds.",
      "Every opponent he felled reminded him of a different face. A different loss. The ones he couldn't save.",
      "\"I fight because stopping means remembering,\" he admits to the evening wind. \"And remembering means feeling.\"",
      "A letter arrives by raven. He reads it, and for the first time in years, his relentless composure cracks into something almost like hope.",
    ],
    epilogue: "Sir Tristan rode south that same night. The letter was from Iseult. History does not record what happened next, but he was never called 'The Relentless' again.",
  },
  {
    characterId: "igraine",
    title: "The Iron Rose Blooms",
    paragraphs: [
      "Igraine removes her gauntlets slowly, revealing hands callused from decades of swordplay and the subtle tremor she has hidden from everyone.",
      "The tournament proved what she needed to know: she can still fight. But should she?",
      "\"Cornwall needs a queen, not a warrior,\" her advisors always said. She always disagreed. Tonight, she realizes both can be true.",
      "She sheathes her sword not in defeat but in decision. The next battle she fights will be in the council chamber.",
    ],
    epilogue: "Igraine of Cornwall became the realm's greatest diplomat-warrior, brokering peace with the same precision she once used to end fights. The Iron Rose, they said, bloomed in two worlds.",
  },
  {
    characterId: "lot",
    title: "The Orkney Throne",
    paragraphs: [
      "King Lot returns to Orkney with the tournament champion's crown, but his mind is elsewhere.",
      "He watched Arthur's knights fight with honor and purpose. His own warriors fight for plunder and pride.",
      "\"We are the same metal,\" he muses, turning the crown in his massive hands. \"But they were forged with a different fire.\"",
      "He summons his war council and, for the first time, speaks not of conquest but of building something that will outlast them all.",
    ],
    epilogue: "The Orkney Kingdom transformed under Lot's new vision. He never stopped being a warlord, but he became something more: a builder. His great-grandchildren would call it the Orkney Golden Age.",
  },
  {
    characterId: "ector",
    title: "The Master's Legacy",
    paragraphs: [
      "Sir Ector sits in the training hall long after the other fighters have left, surrounded by practice dummies he no longer needs.",
      "He trained a king. He trained a generation of knights. The tournament proved he could still best them all.",
      "\"But what good is a master,\" he says, adjusting a training dummy's stance with practiced hands, \"if he has no one left to teach?\"",
      "A knock at the door. A young squire, barely twelve, clutching a wooden sword. \"Please, sir. Teach me.\"",
    ],
    epilogue: "Sir Ector opened the doors of his training hall to any who wished to learn. His final student would go on to become the greatest knight of the next generation.",
  },
];

/** Get the story ending for a specific character */
export function getStoryEnding(characterId: string): TekkenStoryEnding | undefined {
  return TEKKEN_STORY_ENDINGS.find(e => e.characterId === characterId);
}
