// ---------------------------------------------------------------------------
// Exodus mode — balance & configuration constants (rebalanced)
// ---------------------------------------------------------------------------

export const ExodusConfig = {
  // --- Map ---
  MAP_RADIUS: 14,
  REGIONS: 5,
  HEXES_PER_REGION: 8,

  // --- Resources (rebalanced: ~15 days of food at start for balanced caravan) ---
  START_FOOD: 120,
  START_SUPPLIES: 50,
  START_MORALE: 75,
  START_HOPE: 100,

  FOOD_PER_PERSON_PER_DAY: 0.6, // reduced from 1.0 — bulk feeding is cheaper
  SUPPLIES_PER_BATTLE: 2,
  SUPPLIES_PER_CRAFT: 1,
  MORALE_DECAY_PER_DAY: 1.5, // reduced from 2
  HOPE_DECAY_PER_DAY: 0.8, // reduced from 1

  MORALE_STARVATION_PENALTY: 12,
  STARVATION_DEATHS_MIN: 1,
  STARVATION_DEATHS_MAX: 2,

  MORALE_VICTORY_BONUS: 10,
  MORALE_DEFEAT_PENALTY: 10,
  MORALE_REST_BONUS: 8,
  HOPE_MAJOR_EVENT_BONUS: 15,
  HOPE_CATASTROPHE_PENALTY: 20,

  DESERTION_MORALE_THRESHOLD: 20,
  DESERTION_CHANCE: 0.25,
  MUTINY_MORALE_THRESHOLD: 8,

  // --- Caravan ---
  MAX_CARAVAN_SIZE: 80,
  START_KNIGHTS: 4,
  START_SOLDIERS: 8,
  START_ARCHERS: 4,
  START_HEALERS: 2,
  START_SCOUTS: 2,
  START_CRAFTSMEN: 2,
  START_PEASANTS: 6,
  START_REFUGEES: 4,

  // --- Pursuer (rebalanced: threatens by day 12-15) ---
  PURSUER_START_DELAY: 4, // days before Mordred starts
  PURSUER_SPEED: 1.2, // slightly faster than caravan baseline
  PURSUER_GROWTH_PER_DAY: 3,
  PURSUER_START_STRENGTH: 40,
  PURSUER_CATCH_BATTLE_MULTIPLIER: 1.5,

  // --- Combat (rebalanced: less punishing early, harder late) ---
  RETREAT_STRAGGLER_LOSS_MIN: 1,
  RETREAT_STRAGGLER_LOSS_MAX: 2,
  RETREAT_SUPPLY_LOSS: 4,
  WOUNDED_HEAL_PER_CAMP: 2,

  // --- Scoring ---
  SCORE_PER_SURVIVOR: 10,
  SCORE_PER_REFUGEE: 25,
  SCORE_PER_DAY_SURVIVED: 3,
  SCORE_PER_RELIC: 50,
  SCORE_VICTORY_BONUS: 500,

  // --- Difficulty modifiers ---
  DIFFICULTY_EASY: { foodMult: 1.4, pursuerSpeedMult: 0.6, combatDamageMult: 0.75, label: "Pilgrimage" },
  DIFFICULTY_NORMAL: { foodMult: 1.0, pursuerSpeedMult: 1.0, combatDamageMult: 1.0, label: "Exodus" },
  DIFFICULTY_HARD: { foodMult: 0.7, pursuerSpeedMult: 1.4, combatDamageMult: 1.3, label: "Mordred's Wrath" },

  // --- Terrain movement costs ---
  TERRAIN_COST: {
    plains: 1,
    forest: 1.5,
    mountain: 2,
    swamp: 1.5,
    coast: 1,
    ruins: 1,
    village: 1,
    water: Infinity,
  } as Record<string, number>,

  // --- Region definitions ---
  REGION_DEFS: [
    {
      id: "ashen_fields", name: "The Ashen Fields", color: 0xc4a882, dangerBase: 1,
      terrainWeights: { plains: 5, ruins: 2, village: 2 },
      lore: "The burned heartland of Camelot. Smoke still rises from the ruins of what was.",
    },
    {
      id: "thornwood", name: "The Thornwood", color: 0x2d5a27, dangerBase: 2,
      terrainWeights: { forest: 6, swamp: 1, ruins: 1 },
      lore: "An ancient forest where the Fae still walk. The trees watch you pass.",
    },
    {
      id: "blighted_marches", name: "The Blighted Marches", color: 0x5a3b6c, dangerBase: 3,
      terrainWeights: { swamp: 4, ruins: 2, forest: 1, plains: 1 },
      lore: "Corrupted swampland where the dead do not rest. The water is black. The air tastes of iron.",
    },
    {
      id: "iron_peaks", name: "The Iron Peaks", color: 0x8a8a9a, dangerBase: 4,
      terrainWeights: { mountain: 5, plains: 2, ruins: 1 },
      lore: "Mountains that scrape the sky. Dwarven holds slumber beneath. The wind cuts like a blade.",
    },
    {
      id: "shattered_coast", name: "The Shattered Coast", color: 0x3a7a9a, dangerBase: 5,
      terrainWeights: { coast: 4, plains: 2, ruins: 1, village: 1 },
      lore: "Where the land meets the endless sea. Somewhere beyond the mist lies Avalon.",
    },
  ],

  // --- Region transition lore ---
  REGION_TRANSITIONS: [
    "You leave the ashes of Camelot behind. The road ahead darkens.",
    "Ancient trees close overhead. The Thornwood swallows the path.",
    "The ground turns soft and treacherous. Mist rises from the Blighted Marches.",
    "The mountains loom ahead, vast and indifferent. The Iron Peaks await.",
    "Salt wind strikes your face. You can hear the sea. The coast is near.",
  ],
} as const;

export type ExodusDifficulty = "easy" | "normal" | "hard";

export function getDifficultyConfig(d: ExodusDifficulty) {
  if (d === "easy") return ExodusConfig.DIFFICULTY_EASY;
  if (d === "hard") return ExodusConfig.DIFFICULTY_HARD;
  return ExodusConfig.DIFFICULTY_NORMAL;
}
