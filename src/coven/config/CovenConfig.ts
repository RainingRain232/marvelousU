// ---------------------------------------------------------------------------
// Coven mode — balance & configuration
// ---------------------------------------------------------------------------

export const CovenConfig = {
  MAP_RADIUS: 10,

  START_HEALTH: 100,
  START_MANA: 55,
  MAX_HEALTH: 120,
  MAX_MANA: 75,
  MANA_REGEN_PER_NIGHT: 15,
  MANA_REGEN_LEY_LINE: 25,
  MANA_REGEN_HIDEOUT: 10,

  INQUISITOR_START_DAY: 3,
  INQUISITOR_SPEED: 1,
  INQUISITOR_GROWTH_PER_DAY: 1,
  INQUISITOR_START_COUNT: 2,
  INQUISITOR_DISCOVERY_RANGE: 1,

  CREATURE_SPAWN_CHANCE_BASE: 0.15,
  CREATURE_SPAWN_CHANCE_NIGHT: 0.35,
  WARD_BASE_DURABILITY: 3,

  RITUAL_COMPONENTS_NEEDED: 5,
  WILD_HUNT_DAY: 25,

  FORAGE_BASE_CHANCE: 0.6,
  FORAGE_NIGHT_BONUS: 0.15,

  SCORE_PER_DAY: 5,
  SCORE_PER_SPELL: 15,
  SCORE_PER_CREATURE: 10,
  SCORE_PER_COMPONENT: 50,
  SCORE_VICTORY: 500,

  DIFFICULTY_EASY: { healthMult: 1.3, manaMult: 1.3, inquisitorSpeedMult: 0.7, label: "Apprentice" },
  DIFFICULTY_NORMAL: { healthMult: 1.0, manaMult: 1.0, inquisitorSpeedMult: 1.0, label: "Witch" },
  DIFFICULTY_HARD: { healthMult: 0.7, manaMult: 0.8, inquisitorSpeedMult: 1.4, label: "Archwitch" },

  TERRAIN_DEFS: [
    { id: "deep_woods", name: "Deep Woods", color: 0x1a3a1a, hi: 0x2a4a2a, lo: 0x0a2a0a, magicBonus: "nature" },
    { id: "clearing", name: "Clearing", color: 0x4a6a3a, hi: 0x5a7a4a, lo: 0x3a5a2a, magicBonus: null },
    { id: "swamp", name: "Swamp", color: 0x2a3a2a, hi: 0x3a4a3a, lo: 0x1a2a1a, magicBonus: "hex" },
    { id: "graveyard", name: "Graveyard", color: 0x3a3a4a, hi: 0x4a4a5a, lo: 0x2a2a3a, magicBonus: "necromancy" },
    { id: "ruins", name: "Ancient Ruins", color: 0x5a4a3a, hi: 0x6a5a4a, lo: 0x4a3a2a, magicBonus: "ritual" },
    { id: "village", name: "Village", color: 0x6a5a4a, hi: 0x7a6a5a, lo: 0x5a4a3a, magicBonus: null },
    { id: "cave", name: "Cave", color: 0x2a2a2a, hi: 0x3a3a3a, lo: 0x1a1a1a, magicBonus: "ritual" },
    { id: "ley_line", name: "Ley Line", color: 0x3a3a6a, hi: 0x5a5a8a, lo: 0x2a2a5a, magicBonus: "all" },
  ],
} as const;

export type CovenDifficulty = "easy" | "normal" | "hard";

export function getCovenDifficulty(d: CovenDifficulty) {
  if (d === "easy") return CovenConfig.DIFFICULTY_EASY;
  if (d === "hard") return CovenConfig.DIFFICULTY_HARD;
  return CovenConfig.DIFFICULTY_NORMAL;
}
