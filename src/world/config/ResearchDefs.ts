// Tech tree definitions for world mode research system.
//
// Five branches: Military, Magic, Economic, Siege, Buildings.
// Each tech takes a number of turns and may unlock buildings, unit tiers,
// or spell tiers.  Race tier limits hide research a race cannot use.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ResearchUnlock {
  type: "unit_tier" | "spell_tier" | "building" | "ability";
  value: string;
}

export interface ResearchDef {
  id: string;
  name: string;
  turnsToComplete: number;
  prerequisites: string[];
  unlocks: ResearchUnlock[];
  branch: "military" | "magic" | "economic" | "siege" | "buildings";
  description: string;
  /** If set, only races whose tier[category] >= minTier see this tech. */
  raceTierGate?: { category: string; minTier: number };
}

// ---------------------------------------------------------------------------
// Research definitions
// ---------------------------------------------------------------------------

export const RESEARCH_DEFINITIONS: Record<string, ResearchDef> = {

  // =======================================================================
  // ECONOMIC BRANCH
  // =======================================================================

  agriculture: {
    id: "agriculture",
    name: "Agriculture",
    turnsToComplete: 3,
    prerequisites: [],
    unlocks: [{ type: "building", value: "granary" }],
    branch: "economic",
    description: "Unlocks Granary (+3 food/turn).",
  },
  masonry: {
    id: "masonry",
    name: "Masonry",
    turnsToComplete: 4,
    prerequisites: [],
    unlocks: [{ type: "building", value: "city_walls" }],
    branch: "economic",
    description: "Unlocks City Walls for improved defenses.",
  },
  trade: {
    id: "trade",
    name: "Trade",
    turnsToComplete: 5,
    prerequisites: ["agriculture"],
    unlocks: [{ type: "building", value: "marketplace" }],
    branch: "economic",
    description: "Unlocks Marketplace (+5 gold/turn).",
  },
  scholarship: {
    id: "scholarship",
    name: "Scholarship",
    turnsToComplete: 5,
    prerequisites: ["agriculture"],
    unlocks: [{ type: "building", value: "library" }],
    branch: "economic",
    description: "Unlocks Library (-1 turn from research).",
  },
  banking: {
    id: "banking",
    name: "Banking",
    turnsToComplete: 7,
    prerequisites: ["trade"],
    unlocks: [{ type: "building", value: "workshop" }],
    branch: "economic",
    description: "Unlocks Workshop (+3 production/turn).",
  },
  sea_travel: {
    id: "sea_travel",
    name: "Sea Travel",
    turnsToComplete: 8,
    prerequisites: ["trade"],
    unlocks: [{ type: "building", value: "shipwright" }],
    branch: "economic",
    description: "Unlocks Shipwright. Armies can embark and cross water.",
  },
  industrialization: {
    id: "industrialization",
    name: "Industrialization",
    turnsToComplete: 10,
    prerequisites: ["banking"],
    unlocks: [
      { type: "building", value: "aqueduct" },
      { type: "building", value: "military_academy" },
    ],
    branch: "economic",
    description: "Unlocks Aqueduct and Military Academy.",
  },

  // =======================================================================
  // MILITARY BRANCH — melee tier progression
  // =======================================================================

  bronze_working: {
    id: "bronze_working",
    name: "Bronze Working",
    turnsToComplete: 4,
    prerequisites: [],
    unlocks: [{ type: "unit_tier", value: "melee_2" }],
    branch: "military",
    description: "Unlocks tier 2 melee units.",
    raceTierGate: { category: "melee", minTier: 2 },
  },
  iron_working: {
    id: "iron_working",
    name: "Iron Working",
    turnsToComplete: 6,
    prerequisites: ["bronze_working"],
    unlocks: [{ type: "unit_tier", value: "melee_3" }],
    branch: "military",
    description: "Unlocks tier 3 melee units.",
    raceTierGate: { category: "melee", minTier: 3 },
  },
  steel_working: {
    id: "steel_working",
    name: "Steel Working",
    turnsToComplete: 8,
    prerequisites: ["iron_working"],
    unlocks: [{ type: "unit_tier", value: "melee_4" }],
    branch: "military",
    description: "Unlocks tier 4 melee units.",
    raceTierGate: { category: "melee", minTier: 4 },
  },
  mithril_forging: {
    id: "mithril_forging",
    name: "Mithril Forging",
    turnsToComplete: 12,
    prerequisites: ["steel_working"],
    unlocks: [{ type: "unit_tier", value: "melee_5" }],
    branch: "military",
    description: "Unlocks tier 5 melee units.",
    raceTierGate: { category: "melee", minTier: 5 },
  },
  adamantine_craft: {
    id: "adamantine_craft",
    name: "Adamantine Craft",
    turnsToComplete: 16,
    prerequisites: ["mithril_forging"],
    unlocks: [{ type: "unit_tier", value: "melee_6" }],
    branch: "military",
    description: "Unlocks tier 6 melee units.",
    raceTierGate: { category: "melee", minTier: 6 },
  },
  legendary_arms: {
    id: "legendary_arms",
    name: "Legendary Arms",
    turnsToComplete: 20,
    prerequisites: ["adamantine_craft"],
    unlocks: [{ type: "unit_tier", value: "melee_7" }],
    branch: "military",
    description: "Unlocks the most powerful melee units.",
    raceTierGate: { category: "melee", minTier: 7 },
  },

  // === MILITARY — ranged tier progression ===

  improved_bows: {
    id: "improved_bows",
    name: "Improved Bows",
    turnsToComplete: 5,
    prerequisites: ["bronze_working"],
    unlocks: [{ type: "unit_tier", value: "ranged_2" }],
    branch: "military",
    description: "Unlocks tier 2 ranged units.",
    raceTierGate: { category: "ranged", minTier: 2 },
  },
  advanced_archery: {
    id: "advanced_archery",
    name: "Advanced Archery",
    turnsToComplete: 8,
    prerequisites: ["improved_bows"],
    unlocks: [{ type: "unit_tier", value: "ranged_3" }],
    branch: "military",
    description: "Unlocks tier 3 ranged units.",
    raceTierGate: { category: "ranged", minTier: 3 },
  },
  expert_archery: {
    id: "expert_archery",
    name: "Expert Archery",
    turnsToComplete: 10,
    prerequisites: ["advanced_archery"],
    unlocks: [{ type: "unit_tier", value: "ranged_4" }],
    branch: "military",
    description: "Unlocks tier 4 ranged units.",
    raceTierGate: { category: "ranged", minTier: 4 },
  },
  master_archery: {
    id: "master_archery",
    name: "Master Archery",
    turnsToComplete: 14,
    prerequisites: ["expert_archery"],
    unlocks: [{ type: "unit_tier", value: "ranged_5" }],
    branch: "military",
    description: "Unlocks tier 5 ranged units.",
    raceTierGate: { category: "ranged", minTier: 5 },
  },
  legendary_ranged: {
    id: "legendary_ranged",
    name: "Legendary Ranged",
    turnsToComplete: 18,
    prerequisites: ["master_archery"],
    unlocks: [
      { type: "unit_tier", value: "ranged_6" },
      { type: "unit_tier", value: "ranged_7" },
    ],
    branch: "military",
    description: "Unlocks the most powerful ranged units.",
    raceTierGate: { category: "ranged", minTier: 6 },
  },

  // === MILITARY — cavalry tier progression ===

  cavalry_tactics: {
    id: "cavalry_tactics",
    name: "Cavalry Tactics",
    turnsToComplete: 8,
    prerequisites: ["horsemanship"],
    unlocks: [{ type: "unit_tier", value: "cavalry_3" }],
    branch: "military",
    description: "Unlocks tier 3 cavalry units.",
    raceTierGate: { category: "melee", minTier: 3 },
  },
  cavalry_mastery: {
    id: "cavalry_mastery",
    name: "Cavalry Mastery",
    turnsToComplete: 10,
    prerequisites: ["cavalry_tactics"],
    unlocks: [{ type: "unit_tier", value: "cavalry_4" }],
    branch: "military",
    description: "Unlocks tier 4 cavalry units.",
    raceTierGate: { category: "melee", minTier: 4 },
  },
  heavy_cavalry: {
    id: "heavy_cavalry",
    name: "Heavy Cavalry",
    turnsToComplete: 14,
    prerequisites: ["cavalry_mastery"],
    unlocks: [{ type: "unit_tier", value: "cavalry_5" }],
    branch: "military",
    description: "Unlocks tier 5 cavalry units.",
    raceTierGate: { category: "melee", minTier: 5 },
  },
  legendary_cavalry: {
    id: "legendary_cavalry",
    name: "Legendary Cavalry",
    turnsToComplete: 18,
    prerequisites: ["heavy_cavalry"],
    unlocks: [
      { type: "unit_tier", value: "cavalry_6" },
      { type: "unit_tier", value: "cavalry_7" },
    ],
    branch: "military",
    description: "Unlocks the most powerful cavalry units.",
    raceTierGate: { category: "melee", minTier: 6 },
  },

  // =======================================================================
  // SIEGE BRANCH
  // =======================================================================

  siege_engineering: {
    id: "siege_engineering",
    name: "Siege Engineering",
    turnsToComplete: 5,
    prerequisites: ["bronze_working"],
    unlocks: [{ type: "unit_tier", value: "siege_2" }],
    branch: "siege",
    description: "Unlocks tier 2 siege units.",
    raceTierGate: { category: "siege", minTier: 2 },
  },
  siege_craft: {
    id: "siege_craft",
    name: "Siege Craft",
    turnsToComplete: 8,
    prerequisites: ["siege_engineering"],
    unlocks: [{ type: "unit_tier", value: "siege_3" }],
    branch: "siege",
    description: "Unlocks tier 3 siege units.",
    raceTierGate: { category: "siege", minTier: 3 },
  },
  advanced_siege: {
    id: "advanced_siege",
    name: "Advanced Siege",
    turnsToComplete: 10,
    prerequisites: ["siege_craft"],
    unlocks: [{ type: "unit_tier", value: "siege_4" }],
    branch: "siege",
    description: "Unlocks tier 4 siege units.",
    raceTierGate: { category: "siege", minTier: 4 },
  },
  heavy_artillery: {
    id: "heavy_artillery",
    name: "Heavy Artillery",
    turnsToComplete: 14,
    prerequisites: ["advanced_siege"],
    unlocks: [{ type: "unit_tier", value: "siege_5" }],
    branch: "siege",
    description: "Unlocks tier 5 siege units.",
    raceTierGate: { category: "siege", minTier: 5 },
  },
  legendary_siege: {
    id: "legendary_siege",
    name: "Legendary Siege",
    turnsToComplete: 18,
    prerequisites: ["heavy_artillery"],
    unlocks: [
      { type: "unit_tier", value: "siege_6" },
      { type: "unit_tier", value: "siege_7" },
    ],
    branch: "siege",
    description: "Unlocks the most devastating siege weapons.",
    raceTierGate: { category: "siege", minTier: 6 },
  },

  // =======================================================================
  // MAGIC BRANCH
  // =======================================================================

  arcane_study: {
    id: "arcane_study",
    name: "Arcane Study",
    turnsToComplete: 5,
    prerequisites: [],
    unlocks: [
      { type: "spell_tier", value: "1" },
      { type: "spell_tier", value: "2" },
    ],
    branch: "magic",
    description: "Unlocks tier 1-2 spells and mage units.",
    raceTierGate: { category: "magic", minTier: 1 },
  },
  conjuration: {
    id: "conjuration",
    name: "Conjuration",
    turnsToComplete: 7,
    prerequisites: ["arcane_study"],
    unlocks: [
      { type: "spell_tier", value: "3" },
      { type: "spell_tier", value: "4" },
    ],
    branch: "magic",
    description: "Unlocks tier 3-4 spells and creatures.",
    raceTierGate: { category: "magic", minTier: 3 },
  },
  high_sorcery: {
    id: "high_sorcery",
    name: "High Sorcery",
    turnsToComplete: 10,
    prerequisites: ["conjuration"],
    unlocks: [
      { type: "spell_tier", value: "5" },
      { type: "spell_tier", value: "6" },
    ],
    branch: "magic",
    description: "Unlocks tier 5-6 spells.",
    raceTierGate: { category: "magic", minTier: 5 },
  },
  archmage_arts: {
    id: "archmage_arts",
    name: "Archmage Arts",
    turnsToComplete: 14,
    prerequisites: ["high_sorcery"],
    unlocks: [{ type: "spell_tier", value: "7" }],
    branch: "magic",
    description: "Unlocks the most powerful spells.",
    raceTierGate: { category: "magic", minTier: 7 },
  },
  divine_blessing: {
    id: "divine_blessing",
    name: "Divine Blessing",
    turnsToComplete: 6,
    prerequisites: ["arcane_study"],
    unlocks: [{ type: "ability", value: "holy_units" }],
    branch: "magic",
    description: "Unlocks holy unit recruitment.",
    raceTierGate: { category: "heal", minTier: 1 },
  },

  // =======================================================================
  // BUILDINGS BRANCH
  // =======================================================================

  basic_fortification: {
    id: "basic_fortification",
    name: "Basic Fortification",
    turnsToComplete: 3,
    prerequisites: [],
    unlocks: [
      { type: "building", value: "barracks" },
      { type: "building", value: "archery_range" },
    ],
    branch: "buildings",
    description: "Unlocks Barracks and Archery Range.",
  },
  horsemanship: {
    id: "horsemanship",
    name: "Horsemanship",
    turnsToComplete: 4,
    prerequisites: ["basic_fortification"],
    unlocks: [{ type: "building", value: "stables" }],
    branch: "buildings",
    description: "Unlocks Stables for cavalry training.",
  },
  siege_construction: {
    id: "siege_construction",
    name: "Siege Construction",
    turnsToComplete: 4,
    prerequisites: ["basic_fortification"],
    unlocks: [{ type: "building", value: "siege_workshop" }],
    branch: "buildings",
    description: "Unlocks Siege Workshop.",
  },
  faction_construction: {
    id: "faction_construction",
    name: "Faction Grounds",
    turnsToComplete: 5,
    prerequisites: ["basic_fortification"],
    unlocks: [
      { type: "building", value: "faction_hall" },
      { type: "building", value: "embassy" },
    ],
    branch: "buildings",
    description: "Unlocks Faction Hall and Embassy.",
  },
  arcane_construction: {
    id: "arcane_construction",
    name: "Arcane Tower",
    turnsToComplete: 4,
    prerequisites: [],
    unlocks: [{ type: "building", value: "mage_tower" }],
    branch: "buildings",
    description: "Unlocks Mage Tower construction.",
  },
  holy_construction: {
    id: "holy_construction",
    name: "Holy Sanctum",
    turnsToComplete: 5,
    prerequisites: ["arcane_construction"],
    unlocks: [{ type: "building", value: "temple" }],
    branch: "buildings",
    description: "Unlocks Temple for holy units.",
  },
  beast_construction: {
    id: "beast_construction",
    name: "Beast Pens",
    turnsToComplete: 6,
    prerequisites: ["arcane_construction"],
    unlocks: [{ type: "building", value: "creature_den" }],
    branch: "buildings",
    description: "Unlocks Creature Den.",
  },
  elite_hall: {
    id: "elite_hall",
    name: "Elite Hall",
    turnsToComplete: 10,
    prerequisites: ["arcane_construction", "basic_fortification"],
    unlocks: [{ type: "building", value: "elite_hall" }],
    branch: "buildings",
    description: "Unlocks Elite Hall. Prerequisite for all elite buildings.",
  },
  elite_warfare: {
    id: "elite_warfare",
    name: "Elite Warfare",
    turnsToComplete: 6,
    prerequisites: ["elite_hall"],
    unlocks: [
      { type: "building", value: "elite_barracks" },
      { type: "building", value: "elite_archery_range" },
      { type: "building", value: "elite_stables" },
    ],
    branch: "buildings",
    description: "Unlocks Elite Barracks, Archery Range, and Stables.",
  },
  elite_siege_works: {
    id: "elite_siege_works",
    name: "Elite Siege Works",
    turnsToComplete: 6,
    prerequisites: ["elite_hall"],
    unlocks: [{ type: "building", value: "elite_siege_workshop" }],
    branch: "buildings",
    description: "Unlocks Elite Siege Workshop.",
  },
  elite_arcanum: {
    id: "elite_arcanum",
    name: "Elite Arcanum",
    turnsToComplete: 6,
    prerequisites: ["elite_hall"],
    unlocks: [{ type: "building", value: "elite_mage_tower" }],
    branch: "buildings",
    description: "Unlocks Elite Mage Tower.",
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function allResearchDefs(): ResearchDef[] {
  return Object.values(RESEARCH_DEFINITIONS);
}

export function getResearchDef(id: string): ResearchDef | null {
  return RESEARCH_DEFINITIONS[id] ?? null;
}

/** Get available (researchable) techs for a player — excluding race-gated techs the race cannot use. */
export function getAvailableResearch(
  completedResearch: Set<string>,
  _raceId?: string,
  raceTiers?: Record<string, number>,
): ResearchDef[] {
  return allResearchDefs().filter((def) => {
    if (completedResearch.has(def.id)) return false;
    // Race tier gate — hide if race can't use the unlock
    if (def.raceTierGate && raceTiers) {
      const limit = raceTiers[def.raceTierGate.category] ?? 0;
      if (limit < def.raceTierGate.minTier) return false;
    }
    return def.prerequisites.every((p) => completedResearch.has(p));
  });
}
