// ---------------------------------------------------------------------------
// Round Table – Balance Configuration
// ---------------------------------------------------------------------------

export const RT_BALANCE = {
  // ── General ──
  STARTING_PURITY: 50,
  MAX_PURITY: 100,
  MIN_PURITY: 0,
  PURITY_HOLY_THRESHOLD: 75,
  PURITY_DARK_THRESHOLD: 25,

  // ── Combat ──
  STARTING_ENERGY: 3,
  STARTING_HAND_SIZE: 5,
  MAX_HAND_SIZE: 10,
  VULNERABLE_MULTIPLIER: 1.5,
  WEAK_MULTIPLIER: 0.75,
  POISON_DAMAGE_PER_STACK: 1,

  // ── Economy ──
  STARTING_GOLD: 99,
  CARD_REMOVE_COST: 75,
  CARD_REMOVE_COST_INCREMENT: 25,

  // ── Map ──
  ROWS_PER_ACT: 15,
  MIN_COLS: 3,
  MAX_COLS: 4,
  MIN_PATHS: 3,
  MAX_PATHS: 4,

  // ── Rewards ──
  CARD_REWARD_CHOICES: 3,
  ELITE_RELIC_CHANCE: 1.0,
  BOSS_RELIC_GUARANTEED: true,
  POTION_DROP_CHANCE: 0.4,

  // ── Rest ──
  REST_HEAL_PERCENT: 0.3,

  // ── Shop ──
  SHOP_COMMON_CARD_COST: [45, 55] as [number, number],
  SHOP_UNCOMMON_CARD_COST: [68, 82] as [number, number],
  SHOP_RARE_CARD_COST: [135, 165] as [number, number],
  SHOP_COMMON_RELIC_COST: [150, 160] as [number, number],
  SHOP_UNCOMMON_RELIC_COST: [250, 270] as [number, number],
  SHOP_RARE_RELIC_COST: [300, 320] as [number, number],

  // ── Scoring ──
  SCORE_PER_FLOOR: 5,
  SCORE_PER_ENEMY: 10,
  SCORE_PER_ELITE: 25,
  SCORE_PER_BOSS: 50,
  SCORE_WIN_BONUS: 200,
  SCORE_PER_PURITY_POINT: 1, // |purity - 50| * this
  SCORE_ASCENSION_MULTIPLIER: 0.1, // +10% per ascension

  // ── Ascension modifiers ──
  ASCENSION_RULES: [
    /* 0  */ {},
    /* 1  */ { eliteHpMult: 1.1 },
    /* 2  */ { normalHpMult: 1.1 },
    /* 3  */ { startingHpReduction: 7 },
    /* 4  */ { bossHpMult: 1.1 },
    /* 5  */ { startingGoldReduction: 20 },
    /* 6  */ { eliteDamageMult: 1.15 },
    /* 7  */ { normalDamageMult: 1.1 },
    /* 8  */ { bossDamageMult: 1.1 },
    /* 9  */ { extraCurseOnStart: 1 },
    /* 10 */ { energyLost: 0 }, // placeholder
    /* 11 */ { restHealReduction: 0.05 },
    /* 12 */ { shopCostMult: 1.1 },
    /* 13 */ { eliteEncounterIncrease: true },
    /* 14 */ { bossExtraMove: true },
    /* 15 */ { startingHpReduction: 5 },
    /* 16 */ { startingGoldReduction: 10 },
    /* 17 */ { normalHpMult: 1.05 },
    /* 18 */ { eliteHpMult: 1.1 },
    /* 19 */ { bossHpMult: 1.1 },
    /* 20 */ { doubleFirstBoss: true },
  ],

  // ── Acts ──
  TOTAL_ACTS: 3,

  // ── Potions ──
  MAX_POTIONS: 3,
} as const;
