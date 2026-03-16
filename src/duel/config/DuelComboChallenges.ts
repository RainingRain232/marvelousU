// ---------------------------------------------------------------------------
// Duel mode – combo challenges (preset combos for each character to practice)
// ---------------------------------------------------------------------------

export interface DuelComboChallenge {
  id: string;
  name: string;
  /** Ordered list of move IDs the player must execute */
  sequence: string[];
  /** Human-readable input notation */
  notation: string;
  difficulty: "beginner" | "intermediate" | "advanced" | "expert";
  /** Reward description */
  reward: string;
}

export interface DuelCharacterComboChallenges {
  characterId: string;
  challenges: DuelComboChallenge[];
}

// ---- Per-character combo challenges -----------------------------------------

const ARTHUR_COMBOS: DuelComboChallenge[] = [
  {
    id: "arthur_bnb",
    name: "Bread & Butter",
    sequence: ["light_high", "light_high", "med_high"],
    notation: "Q > Q > W",
    difficulty: "beginner",
    reward: "Arthur title: Sword Apprentice",
  },
  {
    id: "arthur_sweep_combo",
    name: "Low Starter",
    sequence: ["light_low", "med_low", "sword_thrust"],
    notation: "A > S > Q+W",
    difficulty: "beginner",
    reward: "Arthur title: Ground Game",
  },
  {
    id: "arthur_launcher",
    name: "Launch & Punish",
    sequence: ["heavy_low", "rising_slash"],
    notation: "D > S+D",
    difficulty: "intermediate",
    reward: "Arthur title: Sky Striker",
  },
  {
    id: "arthur_advanced",
    name: "Royal Execution",
    sequence: ["light_high", "med_high", "sword_thrust", "rising_slash"],
    notation: "Q > W > Q+W > S+D",
    difficulty: "advanced",
    reward: "Arthur title: True King",
  },
  {
    id: "arthur_expert",
    name: "Excalibur's Wrath",
    sequence: ["light_high", "med_high", "heavy_high", "shield_charge", "zeal_1"],
    notation: "Q > W > E > Q+D > ZEAL",
    difficulty: "expert",
    reward: "Arthur title: Pendragon",
  },
];

const MERLIN_COMBOS: DuelComboChallenge[] = [
  {
    id: "merlin_bnb",
    name: "Staff Basics",
    sequence: ["light_high", "light_high", "med_high"],
    notation: "Q > Q > W",
    difficulty: "beginner",
    reward: "Merlin title: Apprentice Mage",
  },
  {
    id: "merlin_zone",
    name: "Zone Control",
    sequence: ["arcane_bolt", "frost_wave"],
    notation: "Q+W > A+S",
    difficulty: "beginner",
    reward: "Merlin title: Zoner",
  },
  {
    id: "merlin_mid_combo",
    name: "Arcane Barrage",
    sequence: ["light_high", "med_high", "void_rift"],
    notation: "Q > W > E+D",
    difficulty: "intermediate",
    reward: "Merlin title: Spellweaver",
  },
  {
    id: "merlin_advanced",
    name: "Thunder Chain",
    sequence: ["med_low", "heavy_low", "thunder_strike"],
    notation: "S > D > W+E",
    difficulty: "advanced",
    reward: "Merlin title: Archmage",
  },
  {
    id: "merlin_expert",
    name: "Singularity Protocol",
    sequence: ["light_high", "med_high", "arcane_storm", "zeal_2"],
    notation: "Q > W > Q+D > ZEAL2",
    difficulty: "expert",
    reward: "Merlin title: Grand Sorcerer",
  },
];

const ELAINE_COMBOS: DuelComboChallenge[] = [
  {
    id: "elaine_bnb",
    name: "Quick Arrows",
    sequence: ["light_high", "light_high", "power_shot"],
    notation: "Q > Q > Q+W",
    difficulty: "beginner",
    reward: "Elaine title: Novice Archer",
  },
  {
    id: "elaine_sweep_shot",
    name: "Trip & Shoot",
    sequence: ["leg_sweep", "backflip_shot"],
    notation: "A+S > S+D",
    difficulty: "beginner",
    reward: "Elaine title: Trickster",
  },
  {
    id: "elaine_mid_combo",
    name: "Evasive Chain",
    sequence: ["light_low", "med_low", "evasive_strike"],
    notation: "A > S > W+S",
    difficulty: "intermediate",
    reward: "Elaine title: Sharpshooter",
  },
  {
    id: "elaine_advanced",
    name: "Arrow Storm",
    sequence: ["light_high", "med_high", "triple_shot", "rain_of_arrows"],
    notation: "Q > W > Q+D > W+E",
    difficulty: "advanced",
    reward: "Elaine title: Skyfall",
  },
  {
    id: "elaine_expert",
    name: "Celestial Combo",
    sequence: ["light_high", "med_high", "evasive_strike", "zeal_2"],
    notation: "Q > W > W+S > ZEAL2",
    difficulty: "expert",
    reward: "Elaine title: Lily Maid",
  },
];

const LANCELOT_COMBOS: DuelComboChallenge[] = [
  {
    id: "lancelot_bnb",
    name: "Spear Basics",
    sequence: ["light_high", "light_high", "med_high"],
    notation: "Q > Q > W",
    difficulty: "beginner",
    reward: "Lancelot title: Squire",
  },
  {
    id: "lancelot_poke",
    name: "Long Range Poke",
    sequence: ["light_high", "spear_lunge"],
    notation: "Q > Q+W",
    difficulty: "beginner",
    reward: "Lancelot title: Lancer",
  },
  {
    id: "lancelot_mid_combo",
    name: "Thrust Chain",
    sequence: ["light_low", "med_low", "spear_lunge"],
    notation: "A > S > Q+W",
    difficulty: "intermediate",
    reward: "Lancelot title: Knight",
  },
  {
    id: "lancelot_advanced",
    name: "Thousand Thrusts Setup",
    sequence: ["light_high", "med_high", "thousand_thrusts"],
    notation: "Q > W > E+D",
    difficulty: "advanced",
    reward: "Lancelot title: Peerless",
  },
  {
    id: "lancelot_expert",
    name: "Dragon Lance Finish",
    sequence: ["light_high", "med_high", "lance_charge", "zeal_1"],
    notation: "Q > W > Q+D > ZEAL",
    difficulty: "expert",
    reward: "Lancelot title: Lake Knight",
  },
];

// Generic combo set for characters that don't have specific ones yet
function genericCombos(charId: string): DuelComboChallenge[] {
  return [
    {
      id: `${charId}_bnb`,
      name: "Basic Chain",
      sequence: ["light_high", "light_high", "med_high"],
      notation: "Q > Q > W",
      difficulty: "beginner",
      reward: `${charId} title: Warrior`,
    },
    {
      id: `${charId}_low_chain`,
      name: "Low Chain",
      sequence: ["light_low", "med_low"],
      notation: "A > S",
      difficulty: "beginner",
      reward: `${charId} title: Brawler`,
    },
    {
      id: `${charId}_launcher`,
      name: "Launcher Combo",
      sequence: ["light_high", "med_high", "heavy_high"],
      notation: "Q > W > E",
      difficulty: "intermediate",
      reward: `${charId} title: Veteran`,
    },
  ];
}

// ---- Registry ---------------------------------------------------------------

export const DUEL_COMBO_CHALLENGES: Record<string, DuelCharacterComboChallenges> = {
  arthur: { characterId: "arthur", challenges: ARTHUR_COMBOS },
  merlin: { characterId: "merlin", challenges: MERLIN_COMBOS },
  elaine: { characterId: "elaine", challenges: ELAINE_COMBOS },
  lancelot: { characterId: "lancelot", challenges: LANCELOT_COMBOS },
  guinevere: { characterId: "guinevere", challenges: genericCombos("guinevere") },
  morgan: { characterId: "morgan", challenges: genericCombos("morgan") },
  gawain: { characterId: "gawain", challenges: genericCombos("gawain") },
  mordred: { characterId: "mordred", challenges: genericCombos("mordred") },
  galahad: { characterId: "galahad", challenges: genericCombos("galahad") },
  percival: { characterId: "percival", challenges: genericCombos("percival") },
  tristan: { characterId: "tristan", challenges: genericCombos("tristan") },
  nimue: { characterId: "nimue", challenges: genericCombos("nimue") },
  kay: { characterId: "kay", challenges: genericCombos("kay") },
  bedivere: { characterId: "bedivere", challenges: genericCombos("bedivere") },
  pellinore: { characterId: "pellinore", challenges: genericCombos("pellinore") },
  igraine: { characterId: "igraine", challenges: genericCombos("igraine") },
  ector: { characterId: "ector", challenges: genericCombos("ector") },
  bors: { characterId: "bors", challenges: genericCombos("bors") },
  uther: { characterId: "uther", challenges: genericCombos("uther") },
  lot: { characterId: "lot", challenges: genericCombos("lot") },
};
