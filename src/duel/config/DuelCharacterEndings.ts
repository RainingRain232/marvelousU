// ---------------------------------------------------------------------------
// Duel mode – character-specific endings for arcade mode
// ---------------------------------------------------------------------------

export interface DuelCharacterEnding {
  characterId: string;
  title: string;
  /** Lines of story text, shown sequentially */
  lines: string[];
  /** Epilogue tagline shown at the end */
  epilogue: string;
}

export const DUEL_CHARACTER_ENDINGS: Record<string, DuelCharacterEnding> = {
  arthur: {
    characterId: "arthur",
    title: "The Once and Future King",
    lines: [
      "With Excalibur raised high, Arthur stood victorious over all challengers.",
      "The tournament had proven what the prophecy foretold — the rightful king had returned.",
      "As the crowd roared, Arthur planted his sword into the stone once more.",
      "\"The realm is united,\" he declared. \"Let no blade be drawn in anger again.\"",
    ],
    epilogue: "Arthur's reign ushered in an era of peace that would last a thousand years.",
  },
  merlin: {
    characterId: "merlin",
    title: "The Archmage Ascendant",
    lines: [
      "Merlin's magic proved insurmountable. Every warrior fell before his ancient spells.",
      "Yet victory brought no joy to the wizard. He had foreseen this outcome centuries ago.",
      "Retreating to his tower, Merlin gazed into the crystal sphere one last time.",
      "\"The threads of fate are woven,\" he whispered. \"My work here is done.\"",
    ],
    epilogue: "Merlin vanished into the mists of Avalon, his legend growing with each passing age.",
  },
  elaine: {
    characterId: "elaine",
    title: "The Lily Maid Triumphant",
    lines: [
      "Elaine's arrows found their mark time and again. No shield could stop her aim.",
      "The tournament's end brought bittersweet victory — she had proven herself worthy.",
      "She placed her winning bouquet at the feet of the one she loved, then turned away.",
      "\"I fight not for glory,\" she said, \"but for the heart that drives me forward.\"",
    ],
    epilogue: "Elaine became the greatest archer the realm had ever known, her legend outshining even Lancelot's.",
  },
  lancelot: {
    characterId: "lancelot",
    title: "The Peerless Champion",
    lines: [
      "Lance after lance shattered against Lancelot's unstoppable advance.",
      "At the tournament's end, he knelt before the empty throne, tears in his eyes.",
      "\"I have won every battle,\" he said, \"yet lost the only war that mattered.\"",
      "He drove his spear into the earth and walked away from Camelot forever.",
    ],
    epilogue: "Lancelot wandered the wilderness as a hermit, seeking redemption he would never find.",
  },
  guinevere: {
    characterId: "guinevere",
    title: "The Queen Unbowed",
    lines: [
      "Guinevere fought with a fury none had expected from the queen.",
      "Each victory silenced another doubter, each fallen champion proved her strength.",
      "She claimed the tournament crown and placed it upon her own head.",
      "\"A queen bows to no one,\" she proclaimed. \"Remember that.\"",
    ],
    epilogue: "Guinevere ruled Camelot alone, her iron will forging a kingdom stronger than any sword.",
  },
  morgan: {
    characterId: "morgan",
    title: "The Sorceress Supreme",
    lines: [
      "Dark magic swirled as Morgan le Fay defeated the last challenger.",
      "The crowd recoiled in fear, but Morgan felt only cold satisfaction.",
      "She raised her hand and the tournament grounds dissolved into shadow.",
      "\"Camelot was always mine,\" she hissed. \"Arthur merely kept it warm.\"",
    ],
    epilogue: "Morgan's reign of shadow was absolute, and none dared challenge her dominion.",
  },
  gawain: {
    characterId: "gawain",
    title: "The Sun Knight's Glory",
    lines: [
      "Gawain's strength grew with each battle, his power peaking at high noon.",
      "By the final bout, he burned with the intensity of the sun itself.",
      "He dedicated his victory to his king and his fallen brothers.",
      "\"The Round Table's honor is restored,\" he declared, axe gleaming in the light.",
    ],
    epilogue: "Gawain became Arthur's champion, his loyalty never wavering until the very end.",
  },
  mordred: {
    characterId: "mordred",
    title: "The Usurper's Triumph",
    lines: [
      "Mordred's blade drank deep of every opponent's defeat.",
      "At last, the bastard son stood where his father once reigned.",
      "He sat upon the throne and smiled a cold, terrible smile.",
      "\"Destiny cannot be denied,\" he whispered. \"The son surpasses the father.\"",
    ],
    epilogue: "Mordred's rule was brief but absolute — a dark mirror of Camelot's golden age.",
  },
  galahad: {
    characterId: "galahad",
    title: "The Holy Knight's Ascension",
    lines: [
      "Galahad fought with purity of purpose that no corruption could touch.",
      "The Grail's light surrounded him as he struck the final blow.",
      "A beam of golden light descended from the heavens, and Galahad rose with it.",
      "\"My quest is complete,\" he said, his voice echoing across eternity.",
    ],
    epilogue: "Galahad ascended to join the celestial host, the only knight deemed truly worthy.",
  },
  percival: {
    characterId: "percival",
    title: "The Innocent's Wisdom",
    lines: [
      "Percival's journey from naive youth to champion was complete.",
      "He had asked the right question at the right time, and the Grail answered.",
      "With gentle hands, he healed the wounded and comforted the defeated.",
      "\"True strength is not in the blade,\" he said, \"but in the heart that wields it.\"",
    ],
    epilogue: "Percival became the Grail King, ruling with wisdom beyond his years.",
  },
  tristan: {
    characterId: "tristan",
    title: "The Lover's Lament",
    lines: [
      "Tristan's sword sang with each strike, a melody of love and loss.",
      "Victory in the arena could not fill the void in his heart.",
      "He played one final song on his harp as the sun set over Camelot.",
      "\"Every note is for you, Isolde,\" he whispered to the wind.",
    ],
    epilogue: "Tristan sailed west, following the sunset toward a love that transcended death.",
  },
  nimue: {
    characterId: "nimue",
    title: "The Lady of the Lake",
    lines: [
      "Nimue's water magic overwhelmed every challenger who dared approach.",
      "The lake itself seemed to rise in celebration of her victory.",
      "She descended beneath the waters, carrying the secrets of the tournament with her.",
      "\"The old magic endures,\" she said. \"It will outlast kings and kingdoms alike.\"",
    ],
    epilogue: "Nimue returned to her realm beneath the lake, guardian of powers beyond mortal understanding.",
  },
  kay: {
    characterId: "kay",
    title: "The Steward's Vindication",
    lines: [
      "Kay had always lived in Arthur's shadow. Today, he stepped into the light.",
      "His pragmatic fighting style confounded every idealistic warrior he faced.",
      "He accepted the trophy with a shrug and a crooked grin.",
      "\"Someone has to do the real work around here,\" he said.",
    ],
    epilogue: "Kay's victory earned him the respect he always deserved, though he'd never admit he wanted it.",
  },
  bedivere: {
    characterId: "bedivere",
    title: "The Last Knight Standing",
    lines: [
      "Bedivere fought with the weight of duty on his shoulders.",
      "He was the last knight, the faithful one who would carry out the final task.",
      "At the tournament's end, he held Excalibur one last time.",
      "\"I return this to the lake,\" he said, \"as my king commanded.\"",
    ],
    epilogue: "Bedivere kept his oath to the end, the most loyal knight Camelot ever knew.",
  },
  pellinore: {
    characterId: "pellinore",
    title: "The Questing Beast's End",
    lines: [
      "Pellinore had hunted the Questing Beast his entire life. Today, he hunted warriors.",
      "The thrill of the chase was the same — the tracking, the cornering, the strike.",
      "After his victory, he heard it: the distant cry of the Beast.",
      "\"The hunt is never over,\" he said, already reaching for his spear.",
    ],
    epilogue: "Pellinore resumed his eternal hunt, forever chasing the beast that gave his life meaning.",
  },
  igraine: {
    characterId: "igraine",
    title: "The Mother's Fury",
    lines: [
      "Igraine had endured loss, betrayal, and the machinations of fate.",
      "In the arena, she channeled that pain into devastating strikes.",
      "She stood over the final opponent, breathing hard, memories flooding back.",
      "\"I fight for those who cannot fight for themselves,\" she said quietly.",
    ],
    epilogue: "Igraine became a symbol of resilience, inspiring generations of warriors to come.",
  },
  ector: {
    characterId: "ector",
    title: "The Foster Father's Pride",
    lines: [
      "Ector had raised a king. Now he proved he was a warrior in his own right.",
      "Each victory felt like vindication — not for himself, but for his family.",
      "He placed his trophy next to Kay's childhood sword above the hearth.",
      "\"I raised two fine sons,\" he said. \"That is victory enough.\"",
    ],
    epilogue: "Ector retired to his estate, content in the knowledge that his legacy lived on through others.",
  },
  bors: {
    characterId: "bors",
    title: "The Steadfast Knight",
    lines: [
      "Bors fought like a fortress — immovable, unyielding, absolute.",
      "Where others relied on speed or magic, he trusted only discipline.",
      "The tournament crown sat heavy on his brow, as he preferred.",
      "\"Duty is its own reward,\" he said. \"Glory is merely a side effect.\"",
    ],
    epilogue: "Bors returned to his vigil, the eternal guardian who never sought praise.",
  },
  uther: {
    characterId: "uther",
    title: "The Dragon's Return",
    lines: [
      "Uther Pendragon — the name alone was enough to make champions tremble.",
      "He fought as he always had: with overwhelming force and iron will.",
      "The tournament was his, just as the kingdom once was.",
      "\"The blood of dragons runs in these veins,\" he roared. \"It always will.\"",
    ],
    epilogue: "Uther's triumphant return proved that the Pendragon bloodline could never be extinguished.",
  },
  lot: {
    characterId: "lot",
    title: "The Northern King's Conquest",
    lines: [
      "Lot of Orkney had always been underestimated by the southern courts.",
      "His victory in the tournament shattered that misconception forever.",
      "He planted his banner in the heart of Camelot's arena.",
      "\"The north remembers,\" he said. \"And the north always repays its debts.\"",
    ],
    epilogue: "Lot united the northern kingdoms under one banner, a rival power to Camelot itself.",
  },
};
