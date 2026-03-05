// Tech tree definitions for world mode research system.
//
// Four branches: Military, Magic, Economic, Siege.
// Each tech takes a number of turns and may unlock buildings, unit tiers,
// or spell tiers.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ResearchUnlock {
  /** What this research unlocks. */
  type: "unit_tier" | "spell_tier" | "building" | "ability";
  /** Specific ID (e.g., unit type, building type, tier number). */
  value: string;
}

export interface ResearchDef {
  id: string;
  name: string;
  /** Turns to complete (before Library bonus). */
  turnsToComplete: number;
  /** IDs of prerequisite techs (all must be completed). */
  prerequisites: string[];
  /** What completing this tech unlocks. */
  unlocks: ResearchUnlock[];
  /** Research tree branch (for UI layout). */
  branch: "military" | "magic" | "economic" | "siege";
  /** Display description. */
  description: string;
}

// ---------------------------------------------------------------------------
// Research definitions
// ---------------------------------------------------------------------------

export const RESEARCH_DEFINITIONS: Record<string, ResearchDef> = {
  // === MILITARY BRANCH ===
  bronze_working: {
    id: "bronze_working",
    name: "Bronze Working",
    turnsToComplete: 4,
    prerequisites: [],
    unlocks: [
      { type: "unit_tier", value: "melee_2" },
      { type: "building", value: "barracks" },
    ],
    branch: "military",
    description: "Unlocks tier 2 melee units and Barracks construction.",
  },
  iron_working: {
    id: "iron_working",
    name: "Iron Working",
    turnsToComplete: 6,
    prerequisites: ["bronze_working"],
    unlocks: [
      { type: "unit_tier", value: "melee_3" },
      { type: "unit_tier", value: "ranged_2" },
    ],
    branch: "military",
    description: "Unlocks tier 3 melee and tier 2 ranged units.",
  },
  steel_working: {
    id: "steel_working",
    name: "Steel Working",
    turnsToComplete: 8,
    prerequisites: ["iron_working"],
    unlocks: [
      { type: "unit_tier", value: "melee_4" },
      { type: "unit_tier", value: "ranged_3" },
    ],
    branch: "military",
    description: "Unlocks tier 4 melee and tier 3 ranged units.",
  },
  mithril_forging: {
    id: "mithril_forging",
    name: "Mithril Forging",
    turnsToComplete: 12,
    prerequisites: ["steel_working"],
    unlocks: [
      { type: "unit_tier", value: "melee_5" },
      { type: "unit_tier", value: "ranged_4" },
    ],
    branch: "military",
    description: "Unlocks the most powerful melee and ranged units.",
  },
  horsemanship: {
    id: "horsemanship",
    name: "Horsemanship",
    turnsToComplete: 5,
    prerequisites: ["bronze_working"],
    unlocks: [
      { type: "building", value: "stables" },
      { type: "unit_tier", value: "cavalry_1" },
    ],
    branch: "military",
    description: "Unlocks Stables and cavalry units.",
  },

  // === MAGIC BRANCH ===
  arcane_study: {
    id: "arcane_study",
    name: "Arcane Study",
    turnsToComplete: 5,
    prerequisites: [],
    unlocks: [
      { type: "spell_tier", value: "1" },
      { type: "building", value: "mage_tower" },
    ],
    branch: "magic",
    description: "Unlocks tier 1 spells and Mage Tower construction.",
  },
  conjuration: {
    id: "conjuration",
    name: "Conjuration",
    turnsToComplete: 7,
    prerequisites: ["arcane_study"],
    unlocks: [
      { type: "spell_tier", value: "3" },
      { type: "building", value: "creature_den" },
    ],
    branch: "magic",
    description: "Unlocks tier 3 spells and Creature Den.",
  },
  high_sorcery: {
    id: "high_sorcery",
    name: "High Sorcery",
    turnsToComplete: 10,
    prerequisites: ["conjuration"],
    unlocks: [{ type: "spell_tier", value: "5" }],
    branch: "magic",
    description: "Unlocks tier 5 spells.",
  },
  archmage_arts: {
    id: "archmage_arts",
    name: "Archmage Arts",
    turnsToComplete: 14,
    prerequisites: ["high_sorcery"],
    unlocks: [{ type: "spell_tier", value: "7" }],
    branch: "magic",
    description: "Unlocks the most powerful spells.",
  },
  divine_blessing: {
    id: "divine_blessing",
    name: "Divine Blessing",
    turnsToComplete: 6,
    prerequisites: ["arcane_study"],
    unlocks: [{ type: "building", value: "temple" }],
    branch: "magic",
    description: "Unlocks Temple construction for holy units.",
  },

  // === ECONOMIC BRANCH ===
  agriculture: {
    id: "agriculture",
    name: "Agriculture",
    turnsToComplete: 3,
    prerequisites: [],
    unlocks: [{ type: "building", value: "granary" }],
    branch: "economic",
    description: "Unlocks Granary (+3 food/turn).",
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
  banking: {
    id: "banking",
    name: "Banking",
    turnsToComplete: 7,
    prerequisites: ["trade"],
    unlocks: [{ type: "building", value: "workshop" }],
    branch: "economic",
    description: "Unlocks Workshop (+3 production/turn).",
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
  masonry: {
    id: "masonry",
    name: "Masonry",
    turnsToComplete: 4,
    prerequisites: [],
    unlocks: [{ type: "building", value: "city_walls" }],
    branch: "economic",
    description: "Unlocks City Walls for improved defenses.",
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
  sea_travel: {
    id: "sea_travel",
    name: "Sea Travel",
    turnsToComplete: 8,
    prerequisites: ["trade"],
    unlocks: [{ type: "building", value: "shipwright" }],
    branch: "economic",
    description: "Unlocks Shipwright. Armies can embark and cross water.",
  },

  // === SIEGE BRANCH ===
  engineering: {
    id: "engineering",
    name: "Engineering",
    turnsToComplete: 5,
    prerequisites: ["bronze_working"],
    unlocks: [
      { type: "building", value: "siege_workshop" },
      { type: "unit_tier", value: "siege_1" },
    ],
    branch: "siege",
    description: "Unlocks Siege Workshop and basic siege units.",
  },
  siege_craft: {
    id: "siege_craft",
    name: "Siege Craft",
    turnsToComplete: 8,
    prerequisites: ["engineering"],
    unlocks: [{ type: "unit_tier", value: "siege_2" }],
    branch: "siege",
    description: "Unlocks advanced siege equipment.",
  },
  heavy_artillery: {
    id: "heavy_artillery",
    name: "Heavy Artillery",
    turnsToComplete: 12,
    prerequisites: ["siege_craft"],
    unlocks: [{ type: "unit_tier", value: "siege_3" }],
    branch: "siege",
    description: "Unlocks the most powerful siege weapons.",
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get all research defs as an array. */
export function allResearchDefs(): ResearchDef[] {
  return Object.values(RESEARCH_DEFINITIONS);
}

/** Get a research def by ID. */
export function getResearchDef(id: string): ResearchDef | null {
  return RESEARCH_DEFINITIONS[id] ?? null;
}

/** Get available (researchable) techs for a player. */
export function getAvailableResearch(
  completedResearch: Set<string>,
): ResearchDef[] {
  return allResearchDefs().filter((def) => {
    if (completedResearch.has(def.id)) return false;
    return def.prerequisites.every((p) => completedResearch.has(p));
  });
}
