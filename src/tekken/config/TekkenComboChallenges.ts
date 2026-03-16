// ---------------------------------------------------------------------------
// Tekken mode – Combo Challenge definitions
// Preset combos per character for training/practice
// ---------------------------------------------------------------------------

export interface ComboChallengeStep {
  /** Input notation, e.g. "d/f+2", "1", "knight_rising_blade" */
  input: string;
  /** Display string shown to player */
  display: string;
}

export interface ComboChallenge {
  id: string;
  characterId: string;
  name: string;
  difficulty: "beginner" | "intermediate" | "advanced" | "expert";
  description: string;
  /** Ordered sequence of inputs the player must execute */
  steps: ComboChallengeStep[];
  /** Expected minimum damage if performed correctly */
  expectedDamage: number;
}

export const COMBO_CHALLENGES: ComboChallenge[] = [
  // ── Knight ──────────────────────────────────────────────────────────────
  {
    id: "knight_basic_1",
    characterId: "knight",
    name: "Squire's Drill",
    difficulty: "beginner",
    description: "Basic launcher into simple follow-up.",
    steps: [
      { input: "knight_rising_blade", display: "Rising Blade (d/f+2)" },
      { input: "d/f+1", display: "d/f+1" },
      { input: "d/f+4", display: "d/f+4" },
      { input: "3", display: "3" },
    ],
    expectedDamage: 45,
  },
  {
    id: "knight_inter_1",
    characterId: "knight",
    name: "Crusader's Path",
    difficulty: "intermediate",
    description: "Launcher into Cross Slash with ender.",
    steps: [
      { input: "knight_rising_blade", display: "Rising Blade (d/f+2)" },
      { input: "d/f+1", display: "d/f+1" },
      { input: "knight_cross_slash_1", display: "Cross Slash" },
      { input: "d/f+4", display: "d/f+4" },
      { input: "3", display: "3" },
    ],
    expectedDamage: 58,
  },
  {
    id: "knight_adv_1",
    characterId: "knight",
    name: "Iron Judgment",
    difficulty: "advanced",
    description: "Sky Cleave launcher into full wall carry.",
    steps: [
      { input: "knight_sky_cleave", display: "Sky Cleave (u/f+3)" },
      { input: "d/f+1", display: "d/f+1" },
      { input: "knight_sword_thrust", display: "Sword Thrust" },
      { input: "knight_counter_slash", display: "Counter Slash" },
      { input: "d/f+4", display: "d/f+4" },
      { input: "4", display: "4" },
    ],
    expectedDamage: 72,
  },

  // ── Berserker ───────────────────────────────────────────────────────────
  {
    id: "berserker_basic_1",
    characterId: "berserker",
    name: "Brawler's Opener",
    difficulty: "beginner",
    description: "Simple launch punish into hammer.",
    steps: [
      { input: "d/f+2", display: "d/f+2" },
      { input: "berserker_hammerfist", display: "Hammerfist" },
      { input: "d/f+4", display: "d/f+4" },
      { input: "4", display: "4" },
    ],
    expectedDamage: 44,
  },
  {
    id: "berserker_inter_1",
    characterId: "berserker",
    name: "Warpath Rush",
    difficulty: "intermediate",
    description: "Skull Crusher into Gut Punch juggle.",
    steps: [
      { input: "berserker_skull_crusher", display: "Skull Crusher" },
      { input: "berserker_gut_punch", display: "Gut Punch" },
      { input: "d/f+1", display: "d/f+1" },
      { input: "d/f+4", display: "d/f+4" },
      { input: "3", display: "3" },
    ],
    expectedDamage: 56,
  },

  // ── Monk ────────────────────────────────────────────────────────────────
  {
    id: "monk_basic_1",
    characterId: "monk",
    name: "Temple Training",
    difficulty: "beginner",
    description: "Sky Fist into basic juggle.",
    steps: [
      { input: "monk_sky_fist", display: "Sky Fist" },
      { input: "monk_palm_strike", display: "Palm Strike" },
      { input: "d/f+1", display: "d/f+1" },
      { input: "d/f+4", display: "d/f+4" },
    ],
    expectedDamage: 42,
  },
  {
    id: "monk_adv_1",
    characterId: "monk",
    name: "Dragon's Ascent",
    difficulty: "advanced",
    description: "Dragon Uppercut into flowing combo.",
    steps: [
      { input: "monk_dragon_uppercut", display: "Dragon Uppercut" },
      { input: "monk_palm_strike", display: "Palm Strike" },
      { input: "monk_tiger_palm", display: "Tiger Palm" },
      { input: "monk_flowing_palm", display: "Flowing Palm" },
      { input: "d/f+4", display: "d/f+4" },
      { input: "d/f+3", display: "d/f+3" },
    ],
    expectedDamage: 68,
  },

  // ── Paladin ─────────────────────────────────────────────────────────────
  {
    id: "paladin_basic_1",
    characterId: "paladin",
    name: "Initiate's Prayer",
    difficulty: "beginner",
    description: "Divine Smite into Holy Strike.",
    steps: [
      { input: "paladin_divine_smite", display: "Divine Smite" },
      { input: "d/f+1", display: "d/f+1" },
      { input: "paladin_holy_strike", display: "Holy Strike" },
      { input: "d/f+4", display: "d/f+4" },
    ],
    expectedDamage: 43,
  },

  // ── Assassin ────────────────────────────────────────────────────────────
  {
    id: "assassin_basic_1",
    characterId: "assassin",
    name: "Silent Approach",
    difficulty: "beginner",
    description: "Death From Above into Shadow Stab.",
    steps: [
      { input: "assassin_death_from_above", display: "Death From Above" },
      { input: "assassin_shadow_stab", display: "Shadow Stab" },
      { input: "d/f+1", display: "d/f+1" },
      { input: "d/f+4", display: "d/f+4" },
    ],
    expectedDamage: 44,
  },
  {
    id: "assassin_expert_1",
    characterId: "assassin",
    name: "Shadow Execution",
    difficulty: "expert",
    description: "Full combo with triple slash wall carry.",
    steps: [
      { input: "assassin_death_from_above", display: "Death From Above" },
      { input: "assassin_shadow_stab", display: "Shadow Stab" },
      { input: "assassin_counter_elbow", display: "Counter Elbow" },
      { input: "assassin_phantom_slash", display: "Phantom Slash" },
      { input: "assassin_triple_slash_1", display: "Triple Slash" },
      { input: "d/f+4", display: "d/f+4" },
      { input: "4", display: "4" },
      { input: "3", display: "3" },
    ],
    expectedDamage: 82,
  },

  // ── Warlord ─────────────────────────────────────────────────────────────
  {
    id: "warlord_basic_1",
    characterId: "warlord",
    name: "Axe Drill",
    difficulty: "beginner",
    description: "Execution Chop into Axe Cleave.",
    steps: [
      { input: "warlord_execution_chop", display: "Execution Chop" },
      { input: "d/f+1", display: "d/f+1" },
      { input: "warlord_axe_cleave", display: "Axe Cleave" },
      { input: "d/f+4", display: "d/f+4" },
    ],
    expectedDamage: 46,
  },

  // ── Nimue ───────────────────────────────────────────────────────────────
  {
    id: "nimue_basic_1",
    characterId: "nimue",
    name: "Tidal Surge",
    difficulty: "beginner",
    description: "Geyser Burst into Ice Lance.",
    steps: [
      { input: "nimue_geyser_burst", display: "Geyser Burst" },
      { input: "d/f+1", display: "d/f+1" },
      { input: "nimue_ice_lance", display: "Ice Lance" },
      { input: "d/f+4", display: "d/f+4" },
    ],
    expectedDamage: 43,
  },

  // ── Pellinore ───────────────────────────────────────────────────────────
  {
    id: "pellinore_basic_1",
    characterId: "pellinore",
    name: "Beast Tamer",
    difficulty: "beginner",
    description: "Uppercut Slam into Bull Charge.",
    steps: [
      { input: "pellinore_uppercut_slam", display: "Uppercut Slam" },
      { input: "d/f+1", display: "d/f+1" },
      { input: "pellinore_bull_charge", display: "Bull Charge" },
      { input: "d/f+4", display: "d/f+4" },
    ],
    expectedDamage: 44,
  },

  // ── Tristan ─────────────────────────────────────────────────────────────
  {
    id: "tristan_basic_1",
    characterId: "tristan",
    name: "Lover's Fury",
    difficulty: "beginner",
    description: "Rising Dual into Feint Stab.",
    steps: [
      { input: "tristan_rising_dual", display: "Rising Dual" },
      { input: "d/f+1", display: "d/f+1" },
      { input: "tristan_feint_stab", display: "Feint Stab" },
      { input: "d/f+4", display: "d/f+4" },
    ],
    expectedDamage: 43,
  },

  // ── Igraine ─────────────────────────────────────────────────────────────
  {
    id: "igraine_basic_1",
    characterId: "igraine",
    name: "Rose Garden",
    difficulty: "beginner",
    description: "Crescent Blade into Straight Thrust.",
    steps: [
      { input: "igraine_crescent_blade", display: "Crescent Blade" },
      { input: "d/f+1", display: "d/f+1" },
      { input: "igraine_straight_thrust", display: "Straight Thrust" },
      { input: "d/f+4", display: "d/f+4" },
    ],
    expectedDamage: 43,
  },

  // ── Lot ─────────────────────────────────────────────────────────────────
  {
    id: "lot_basic_1",
    characterId: "lot",
    name: "Orkney Rampage",
    difficulty: "beginner",
    description: "Earthsplitter into War Hammer.",
    steps: [
      { input: "lot_earthsplitter", display: "Earthsplitter" },
      { input: "d/f+1", display: "d/f+1" },
      { input: "lot_war_hammer", display: "War Hammer" },
      { input: "d/f+4", display: "d/f+4" },
    ],
    expectedDamage: 46,
  },

  // ── Ector ───────────────────────────────────────────────────────────────
  {
    id: "ector_basic_1",
    characterId: "ector",
    name: "Master's Lesson",
    difficulty: "beginner",
    description: "Counter Uppercut into Precise Thrust.",
    steps: [
      { input: "ector_counter_uppercut", display: "Counter Uppercut" },
      { input: "d/f+1", display: "d/f+1" },
      { input: "ector_precise_thrust", display: "Precise Thrust" },
      { input: "d/f+4", display: "d/f+4" },
    ],
    expectedDamage: 43,
  },
];

/** Get all combo challenges for a specific character */
export function getChallengesForCharacter(characterId: string): ComboChallenge[] {
  return COMBO_CHALLENGES.filter(c => c.characterId === characterId);
}
