// Overland (world map) spell definitions — "Merlin's Magic" system.
//
// These are powerful spells cast on the world map (not in battle).
// They cost mana and may have durations, cooldowns, or target requirements.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OverlandSpellId =
  // Recon
  | "eagle_eye"
  | "awareness"
  | "detect_magic"
  // Economy
  | "alchemy"
  | "fertility"
  | "prosperity"
  | "channel_surge"
  // Military buffs
  | "crusade"
  | "herb_mastery"
  | "wind_walking"
  | "eternal_night"
  // Offensive
  | "famine"
  | "pestilence"
  | "meteor_storm"
  | "corruption"
  | "great_unsummoning"
  // Defensive
  | "great_warding"
  | "spell_blast"
  | "suppress_magic"
  // Strategic
  | "mass_teleport"
  | "enchant_roads"
  | "planar_seal"
  // Ultimate
  | "spell_of_mastery"
  | "time_stop"
  | "armageddon";

export type OverlandSpellCategory =
  | "recon"
  | "economy"
  | "military"
  | "offensive"
  | "defensive"
  | "strategic"
  | "ultimate";

export type OverlandSpellTarget =
  | "self"         // affects caster's empire
  | "global"       // affects everyone
  | "enemy_city"   // target an enemy city
  | "enemy_player" // target an enemy player
  | "army"         // target one of your armies
  | "none";        // instant / toggle

export interface OverlandSpellDef {
  id: OverlandSpellId;
  name: string;
  description: string;
  category: OverlandSpellCategory;
  target: OverlandSpellTarget;
  manaCost: number;
  /** Duration in turns (0 = instant or permanent-until-dispelled). */
  duration: number;
  /** Cooldown in turns after casting before it can be cast again. */
  cooldown: number;
  /** Whether it's a toggle (like Alchemy). */
  isToggle?: boolean;
  /** Minimum mana income required to research/cast. */
  minManaIncome?: number;
}

// ---------------------------------------------------------------------------
// Spell definitions
// ---------------------------------------------------------------------------

export const OVERLAND_SPELLS: Record<OverlandSpellId, OverlandSpellDef> = {
  // === RECON ===
  eagle_eye: {
    id: "eagle_eye",
    name: "Eagle Eye",
    description: "Reveals fog of war in a large radius (6 hexes) around all your cities and armies for 5 turns.",
    category: "recon",
    target: "self",
    manaCost: 30,
    duration: 5,
    cooldown: 8,
  },
  awareness: {
    id: "awareness",
    name: "Awareness",
    description: "Reveals the entire map and all enemy armies and cities permanently.",
    category: "recon",
    target: "self",
    manaCost: 120,
    duration: 0,
    cooldown: 0,
  },
  detect_magic: {
    id: "detect_magic",
    name: "Detect Magic",
    description: "Reveals all active overland enchantments on all players for 10 turns.",
    category: "recon",
    target: "self",
    manaCost: 20,
    duration: 10,
    cooldown: 5,
  },

  // === ECONOMY ===
  alchemy: {
    id: "alchemy",
    name: "Alchemy",
    description: "Toggle: convert 10 gold to 5 mana each turn, or 5 mana to 10 gold.",
    category: "economy",
    target: "none",
    manaCost: 15,
    duration: 0,
    cooldown: 0,
    isToggle: true,
  },
  fertility: {
    id: "fertility",
    name: "Fertility",
    description: "All your cities gain +50% food production for 8 turns.",
    category: "economy",
    target: "self",
    manaCost: 50,
    duration: 8,
    cooldown: 12,
  },
  prosperity: {
    id: "prosperity",
    name: "Prosperity",
    description: "All your cities gain +3 gold income for 8 turns.",
    category: "economy",
    target: "self",
    manaCost: 40,
    duration: 8,
    cooldown: 12,
  },
  channel_surge: {
    id: "channel_surge",
    name: "Channel Surge",
    description: "Doubles your mana income for 5 turns.",
    category: "economy",
    target: "self",
    manaCost: 60,
    duration: 5,
    cooldown: 10,
  },

  // === MILITARY BUFFS ===
  crusade: {
    id: "crusade",
    name: "Crusade",
    description: "All your armies gain +1 attack and +1 defense permanently until dispelled.",
    category: "military",
    target: "self",
    manaCost: 80,
    duration: 0,
    cooldown: 0,
  },
  herb_mastery: {
    id: "herb_mastery",
    name: "Herb Mastery",
    description: "All your armies fully heal each turn on the overland map for 10 turns.",
    category: "military",
    target: "self",
    manaCost: 45,
    duration: 10,
    cooldown: 15,
  },
  wind_walking: {
    id: "wind_walking",
    name: "Wind Walking",
    description: "All your armies gain +2 movement points for 6 turns.",
    category: "military",
    target: "self",
    manaCost: 55,
    duration: 6,
    cooldown: 10,
  },
  eternal_night: {
    id: "eternal_night",
    name: "Eternal Night",
    description: "Death/Shadow units gain +2 attack globally. Life/Nature units lose -1 attack. Lasts 8 turns.",
    category: "military",
    target: "global",
    manaCost: 100,
    duration: 8,
    cooldown: 20,
  },

  // === OFFENSIVE ===
  famine: {
    id: "famine",
    name: "Famine",
    description: "Target enemy city loses all food stockpile and produces no food for 3 turns.",
    category: "offensive",
    target: "enemy_city",
    manaCost: 60,
    duration: 3,
    cooldown: 8,
  },
  pestilence: {
    id: "pestilence",
    name: "Pestilence",
    description: "Target enemy city loses 1 population per turn for 3 turns.",
    category: "offensive",
    target: "enemy_city",
    manaCost: 70,
    duration: 3,
    cooldown: 10,
  },
  meteor_storm: {
    id: "meteor_storm",
    name: "Meteor Storm",
    description: "Deals 25% HP damage to all enemy armies on the map.",
    category: "offensive",
    target: "global",
    manaCost: 90,
    duration: 0,
    cooldown: 12,
  },
  corruption: {
    id: "corruption",
    name: "Corruption",
    description: "Turns tiles around an enemy city into wasteland (no yields) for 6 turns.",
    category: "offensive",
    target: "enemy_city",
    manaCost: 75,
    duration: 6,
    cooldown: 15,
  },
  great_unsummoning: {
    id: "great_unsummoning",
    name: "Great Unsummoning",
    description: "Destroys 50% of all summoned/conjured creatures on the map (yours too).",
    category: "offensive",
    target: "global",
    manaCost: 100,
    duration: 0,
    cooldown: 20,
  },

  // === DEFENSIVE ===
  great_warding: {
    id: "great_warding",
    name: "Great Warding",
    description: "Your cities become immune to enemy overland spells for 8 turns.",
    category: "defensive",
    target: "self",
    manaCost: 70,
    duration: 8,
    cooldown: 15,
  },
  spell_blast: {
    id: "spell_blast",
    name: "Spell Blast",
    description: "Passively counters the next enemy overland spell cast against you.",
    category: "defensive",
    target: "self",
    manaCost: 40,
    duration: 0,
    cooldown: 5,
  },
  suppress_magic: {
    id: "suppress_magic",
    name: "Suppress Magic",
    description: "All enemy spell costs are doubled for 6 turns.",
    category: "defensive",
    target: "global",
    manaCost: 85,
    duration: 6,
    cooldown: 15,
  },

  // === STRATEGIC ===
  mass_teleport: {
    id: "mass_teleport",
    name: "Mass Teleport",
    description: "Instantly teleport one of your armies to any explored hex.",
    category: "strategic",
    target: "army",
    manaCost: 70,
    duration: 0,
    cooldown: 8,
  },
  enchant_roads: {
    id: "enchant_roads",
    name: "Enchant Roads",
    description: "All your armies gain +1 movement point for 10 turns.",
    category: "strategic",
    target: "self",
    manaCost: 50,
    duration: 10,
    cooldown: 15,
  },
  planar_seal: {
    id: "planar_seal",
    name: "Planar Seal",
    description: "Prevents all teleportation spells for 5 turns.",
    category: "strategic",
    target: "global",
    manaCost: 60,
    duration: 5,
    cooldown: 12,
  },

  // === ULTIMATE ===
  spell_of_mastery: {
    id: "spell_of_mastery",
    name: "Spell of Mastery",
    description: "Takes 20 turns of channeling. Once complete, you win the game outright.",
    category: "ultimate",
    target: "none",
    manaCost: 500,
    duration: 20,
    cooldown: 0,
  },
  time_stop: {
    id: "time_stop",
    name: "Time Stop",
    description: "All enemies skip 3 turns while you act freely. Extremely powerful.",
    category: "ultimate",
    target: "global",
    manaCost: 300,
    duration: 3,
    cooldown: 0,
  },
  armageddon: {
    id: "armageddon",
    name: "Armageddon",
    description: "Every tile becomes wasteland for 5 turns. All units with <50 HP die instantly.",
    category: "ultimate",
    target: "global",
    manaCost: 400,
    duration: 5,
    cooldown: 0,
  },
};

/** Get all spells grouped by category. */
export function getSpellsByCategory(): Map<OverlandSpellCategory, OverlandSpellDef[]> {
  const map = new Map<OverlandSpellCategory, OverlandSpellDef[]>();
  for (const spell of Object.values(OVERLAND_SPELLS)) {
    let list = map.get(spell.category);
    if (!list) {
      list = [];
      map.set(spell.category, list);
    }
    list.push(spell);
  }
  return map;
}

/** Category display names and colors. */
export const CATEGORY_INFO: Record<OverlandSpellCategory, { label: string; color: number }> = {
  recon: { label: "Recon / Information", color: 0x44aaff },
  economy: { label: "Economy / Resource", color: 0xffcc44 },
  military: { label: "Military Buffs", color: 0xff6644 },
  offensive: { label: "Offensive", color: 0xff4444 },
  defensive: { label: "Defensive", color: 0x44ff88 },
  strategic: { label: "Strategic / Movement", color: 0xaa88ff },
  ultimate: { label: "Ultimate", color: 0xff44ff },
};
