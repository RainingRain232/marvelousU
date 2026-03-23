// ---------------------------------------------------------------------------
// Round Table – Enemy Definitions
// ---------------------------------------------------------------------------

import { EnemyDef, EnemyIntentType, StatusEffectId } from "../types";

// ═══════════════════════════════════════════════════════════════════════════
// ACT 1 — Departure from Camelot (bandits, wolves, corrupted peasants)
// ═══════════════════════════════════════════════════════════════════════════

const ACT1_NORMAL: EnemyDef[] = [
  {
    id: "bandit", name: "Bandit", maxHp: [10, 14], isElite: false, isBoss: false,
    goldReward: [10, 15], act: 1,
    moves: [
      { id: "slash", intent: EnemyIntentType.ATTACK, damage: 6, hits: 1, block: 0, effects: [], selfEffects: [], weight: 6, minTurn: 0 },
      { id: "defend", intent: EnemyIntentType.DEFEND, damage: 0, hits: 0, block: 6, effects: [], selfEffects: [], weight: 3, minTurn: 0 },
    ],
  },
  {
    id: "wolf", name: "Wolf", maxHp: [12, 16], isElite: false, isBoss: false,
    goldReward: [8, 12], act: 1,
    moves: [
      { id: "bite", intent: EnemyIntentType.ATTACK, damage: 7, hits: 1, block: 0, effects: [], selfEffects: [], weight: 5, minTurn: 0 },
      { id: "lunge", intent: EnemyIntentType.ATTACK, damage: 4, hits: 2, block: 0, effects: [], selfEffects: [], weight: 4, minTurn: 0 },
    ],
  },
  {
    id: "cultist", name: "Cultist", maxHp: [48, 54], isElite: false, isBoss: false,
    goldReward: [12, 18], act: 1,
    moves: [
      { id: "incantation", intent: EnemyIntentType.BUFF, damage: 0, hits: 0, block: 0, effects: [], selfEffects: [{ id: StatusEffectId.STRENGTH, amount: 3 }], weight: 10, minTurn: 0 },
      { id: "dark_strike", intent: EnemyIntentType.ATTACK, damage: 6, hits: 1, block: 0, effects: [], selfEffects: [], weight: 0, minTurn: 1 },
    ],
  },
  {
    id: "louse_red", name: "Red Louse", maxHp: [10, 15], isElite: false, isBoss: false,
    goldReward: [8, 12], act: 1,
    moves: [
      { id: "bite", intent: EnemyIntentType.ATTACK, damage: 5, hits: 1, block: 0, effects: [], selfEffects: [], weight: 7, minTurn: 0 },
      { id: "grow", intent: EnemyIntentType.BUFF, damage: 0, hits: 0, block: 0, effects: [], selfEffects: [{ id: StatusEffectId.STRENGTH, amount: 3 }], weight: 3, minTurn: 0 },
    ],
  },
  {
    id: "louse_green", name: "Green Louse", maxHp: [10, 15], isElite: false, isBoss: false,
    goldReward: [8, 12], act: 1,
    moves: [
      { id: "bite", intent: EnemyIntentType.ATTACK, damage: 5, hits: 1, block: 0, effects: [], selfEffects: [], weight: 7, minTurn: 0 },
      { id: "spit", intent: EnemyIntentType.DEBUFF, damage: 0, hits: 0, block: 0, effects: [{ id: StatusEffectId.WEAK, amount: 2 }], selfEffects: [], weight: 3, minTurn: 0 },
    ],
  },
  {
    id: "fungus", name: "Fungus Beast", maxHp: [22, 28], isElite: false, isBoss: false,
    goldReward: [10, 14], act: 1,
    moves: [
      { id: "grow", intent: EnemyIntentType.BUFF, damage: 0, hits: 0, block: 0, effects: [], selfEffects: [{ id: StatusEffectId.STRENGTH, amount: 3 }], weight: 5, minTurn: 0 },
      { id: "bite", intent: EnemyIntentType.ATTACK, damage: 6, hits: 1, block: 0, effects: [], selfEffects: [], weight: 5, minTurn: 0 },
    ],
  },
  {
    id: "corrupt_peasant", name: "Corrupt Peasant", maxHp: [16, 22], isElite: false, isBoss: false,
    goldReward: [8, 12], act: 1,
    moves: [
      { id: "pitchfork", intent: EnemyIntentType.ATTACK, damage: 8, hits: 1, block: 0, effects: [], selfEffects: [], weight: 5, minTurn: 0 },
      { id: "rage_buff", intent: EnemyIntentType.BUFF, damage: 0, hits: 0, block: 0, effects: [], selfEffects: [{ id: StatusEffectId.STRENGTH, amount: 2 }], weight: 3, minTurn: 0 },
    ],
  },
  {
    id: "highwayman", name: "Highwayman", maxHp: [20, 26], isElite: false, isBoss: false,
    goldReward: [12, 18], act: 1,
    moves: [
      { id: "crossbow", intent: EnemyIntentType.ATTACK, damage: 9, hits: 1, block: 0, effects: [], selfEffects: [], weight: 4, minTurn: 0 },
      { id: "dodge", intent: EnemyIntentType.DEFEND, damage: 0, hits: 0, block: 8, effects: [], selfEffects: [], weight: 3, minTurn: 0 },
      { id: "double_slash", intent: EnemyIntentType.ATTACK, damage: 5, hits: 2, block: 0, effects: [], selfEffects: [], weight: 3, minTurn: 0 },
    ],
  },
];

const ACT1_ELITE: EnemyDef[] = [
  {
    id: "black_knight", name: "The Black Knight", maxHp: [54, 60], isElite: true, isBoss: false,
    goldReward: [25, 35], act: 1,
    moves: [
      { id: "heavy_slash", intent: EnemyIntentType.ATTACK, damage: 14, hits: 1, block: 0, effects: [], selfEffects: [], weight: 5, minTurn: 0 },
      { id: "shield_wall", intent: EnemyIntentType.DEFEND, damage: 0, hits: 0, block: 12, effects: [], selfEffects: [{ id: StatusEffectId.STRENGTH, amount: 2 }], weight: 4, minTurn: 0 },
      { id: "counter", intent: EnemyIntentType.ATTACK, damage: 10, hits: 1, block: 6, effects: [], selfEffects: [], weight: 3, minTurn: 1 },
    ],
  },
  {
    id: "nob", name: "Grim Nob", maxHp: [46, 56], isElite: true, isBoss: false,
    goldReward: [25, 35], act: 1,
    moves: [
      { id: "bellow", intent: EnemyIntentType.BUFF, damage: 0, hits: 0, block: 0, effects: [], selfEffects: [{ id: StatusEffectId.STRENGTH, amount: 2 }], weight: 10, minTurn: 0 },
      { id: "rush", intent: EnemyIntentType.ATTACK, damage: 14, hits: 1, block: 0, effects: [], selfEffects: [], weight: 6, minTurn: 1 },
      { id: "skull_bash", intent: EnemyIntentType.ATTACK, damage: 6, hits: 1, block: 0, effects: [{ id: StatusEffectId.VULNERABLE, amount: 2 }], selfEffects: [], weight: 4, minTurn: 1 },
    ],
  },
  {
    id: "sentries", name: "Sentry", maxHp: [38, 42], isElite: true, isBoss: false,
    goldReward: [25, 35], act: 1,
    moves: [
      { id: "bolt", intent: EnemyIntentType.ATTACK, damage: 9, hits: 1, block: 0, effects: [], selfEffects: [], weight: 5, minTurn: 0 },
      { id: "beam", intent: EnemyIntentType.DEBUFF, damage: 0, hits: 0, block: 0, effects: [{ id: StatusEffectId.FRAIL, amount: 2 }], selfEffects: [], weight: 5, minTurn: 0 },
    ],
  },
];

const ACT1_BOSS: EnemyDef[] = [
  {
    id: "boss_green_knight", name: "The Green Knight", maxHp: [180, 200], isElite: false, isBoss: true,
    goldReward: [50, 60], act: 1,
    moves: [
      { id: "chop", intent: EnemyIntentType.ATTACK, damage: 12, hits: 1, block: 0, effects: [], selfEffects: [], weight: 4, minTurn: 0 },
      { id: "regenerate", intent: EnemyIntentType.BUFF, damage: 0, hits: 0, block: 8, effects: [], selfEffects: [{ id: StatusEffectId.REGEN, amount: 5 }, { id: StatusEffectId.STRENGTH, amount: 1 }], weight: 3, minTurn: 0 },
      { id: "axe_sweep", intent: EnemyIntentType.ATTACK, damage: 8, hits: 2, block: 0, effects: [{ id: StatusEffectId.VULNERABLE, amount: 1 }], selfEffects: [], weight: 3, minTurn: 1 },
      { id: "berserk", intent: EnemyIntentType.BUFF, damage: 0, hits: 0, block: 0, effects: [], selfEffects: [{ id: StatusEffectId.STRENGTH, amount: 4 }], weight: 2, minTurn: 3 },
    ],
  },
  {
    id: "boss_mordred_youth", name: "Mordred the Young", maxHp: [160, 180], isElite: false, isBoss: true,
    goldReward: [50, 60], act: 1,
    moves: [
      { id: "betrayal_slash", intent: EnemyIntentType.ATTACK, damage: 10, hits: 1, block: 0, effects: [{ id: StatusEffectId.WEAK, amount: 2 }], selfEffects: [], weight: 4, minTurn: 0 },
      { id: "rally_traitors", intent: EnemyIntentType.BUFF, damage: 0, hits: 0, block: 0, effects: [], selfEffects: [{ id: StatusEffectId.STRENGTH, amount: 2 }], weight: 3, minTurn: 0 },
      { id: "dark_charge", intent: EnemyIntentType.ATTACK, damage: 15, hits: 1, block: 0, effects: [], selfEffects: [], weight: 3, minTurn: 2 },
      { id: "underhanded", intent: EnemyIntentType.ATTACK, damage: 8, hits: 2, block: 0, effects: [{ id: StatusEffectId.VULNERABLE, amount: 1 }], selfEffects: [], weight: 2, minTurn: 3 },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// ACT 2 — The Wasteland (undead, cursed knights, Fae tricksters)
// ═══════════════════════════════════════════════════════════════════════════

const ACT2_NORMAL: EnemyDef[] = [
  {
    id: "skeleton", name: "Skeleton Knight", maxHp: [28, 36], isElite: false, isBoss: false,
    goldReward: [14, 20], act: 2,
    moves: [
      { id: "slash", intent: EnemyIntentType.ATTACK, damage: 11, hits: 1, block: 0, effects: [], selfEffects: [], weight: 5, minTurn: 0 },
      { id: "shield", intent: EnemyIntentType.DEFEND, damage: 0, hits: 0, block: 10, effects: [], selfEffects: [], weight: 3, minTurn: 0 },
      { id: "bone_throw", intent: EnemyIntentType.ATTACK, damage: 7, hits: 2, block: 0, effects: [], selfEffects: [], weight: 3, minTurn: 1 },
    ],
  },
  {
    id: "wraith", name: "Wraith", maxHp: [36, 42], isElite: false, isBoss: false,
    goldReward: [14, 20], act: 2,
    moves: [
      { id: "drain", intent: EnemyIntentType.ATTACK, damage: 10, hits: 1, block: 0, effects: [{ id: StatusEffectId.WEAK, amount: 1 }], selfEffects: [], weight: 5, minTurn: 0 },
      { id: "phase", intent: EnemyIntentType.DEFEND, damage: 0, hits: 0, block: 14, effects: [], selfEffects: [], weight: 3, minTurn: 0 },
      { id: "curse_touch", intent: EnemyIntentType.DEBUFF, damage: 0, hits: 0, block: 0, effects: [{ id: StatusEffectId.FRAIL, amount: 2 }, { id: StatusEffectId.WEAK, amount: 2 }], selfEffects: [], weight: 2, minTurn: 1 },
    ],
  },
  {
    id: "fae_trickster", name: "Fae Trickster", maxHp: [24, 32], isElite: false, isBoss: false,
    goldReward: [16, 22], act: 2,
    moves: [
      { id: "trick", intent: EnemyIntentType.DEBUFF, damage: 0, hits: 0, block: 0, effects: [{ id: StatusEffectId.VULNERABLE, amount: 2 }], selfEffects: [], weight: 4, minTurn: 0 },
      { id: "stab", intent: EnemyIntentType.ATTACK, damage: 9, hits: 1, block: 0, effects: [], selfEffects: [], weight: 5, minTurn: 0 },
      { id: "vanish", intent: EnemyIntentType.DEFEND, damage: 0, hits: 0, block: 12, effects: [], selfEffects: [{ id: StatusEffectId.STRENGTH, amount: 2 }], weight: 3, minTurn: 1 },
    ],
  },
  {
    id: "cursed_knight", name: "Cursed Knight", maxHp: [44, 50], isElite: false, isBoss: false,
    goldReward: [15, 20], act: 2,
    moves: [
      { id: "slash", intent: EnemyIntentType.ATTACK, damage: 12, hits: 1, block: 0, effects: [], selfEffects: [], weight: 5, minTurn: 0 },
      { id: "dark_power", intent: EnemyIntentType.BUFF, damage: 0, hits: 0, block: 0, effects: [], selfEffects: [{ id: StatusEffectId.STRENGTH, amount: 2 }], weight: 3, minTurn: 0 },
      { id: "double_strike", intent: EnemyIntentType.ATTACK, damage: 8, hits: 2, block: 0, effects: [], selfEffects: [], weight: 3, minTurn: 1 },
    ],
  },
  {
    id: "barrow_wight", name: "Barrow Wight", maxHp: [40, 48], isElite: false, isBoss: false,
    goldReward: [16, 22], act: 2,
    moves: [
      { id: "life_drain", intent: EnemyIntentType.ATTACK, damage: 12, hits: 1, block: 0, effects: [{ id: StatusEffectId.WEAK, amount: 1 }], selfEffects: [], weight: 4, minTurn: 0 },
      { id: "dark_shield", intent: EnemyIntentType.DEFEND, damage: 0, hits: 0, block: 12, effects: [], selfEffects: [], weight: 3, minTurn: 0 },
      { id: "summon_dead", intent: EnemyIntentType.BUFF, damage: 0, hits: 0, block: 0, effects: [], selfEffects: [{ id: StatusEffectId.STRENGTH, amount: 3 }], weight: 2, minTurn: 2 },
    ],
  },
  {
    id: "pixie_swarm", name: "Pixie Swarm", maxHp: [18, 24], isElite: false, isBoss: false,
    goldReward: [10, 16], act: 2,
    moves: [
      { id: "sting", intent: EnemyIntentType.ATTACK, damage: 3, hits: 3, block: 0, effects: [], selfEffects: [], weight: 5, minTurn: 0 },
      { id: "confuse", intent: EnemyIntentType.DEBUFF, damage: 0, hits: 0, block: 0, effects: [{ id: StatusEffectId.VULNERABLE, amount: 2 }], selfEffects: [], weight: 3, minTurn: 0 },
      { id: "scatter", intent: EnemyIntentType.DEFEND, damage: 0, hits: 0, block: 6, effects: [], selfEffects: [], weight: 3, minTurn: 0 },
    ],
  },
];

const ACT2_ELITE: EnemyDef[] = [
  {
    id: "questing_beast", name: "Questing Beast", maxHp: [90, 100], isElite: true, isBoss: false,
    goldReward: [35, 50], act: 2,
    moves: [
      { id: "charge", intent: EnemyIntentType.ATTACK, damage: 18, hits: 1, block: 0, effects: [], selfEffects: [], weight: 4, minTurn: 0 },
      { id: "screech", intent: EnemyIntentType.DEBUFF, damage: 0, hits: 0, block: 0, effects: [{ id: StatusEffectId.VULNERABLE, amount: 2 }, { id: StatusEffectId.WEAK, amount: 2 }], selfEffects: [], weight: 3, minTurn: 0 },
      { id: "trample", intent: EnemyIntentType.ATTACK, damage: 8, hits: 3, block: 0, effects: [], selfEffects: [], weight: 3, minTurn: 2 },
    ],
  },
  {
    id: "fae_queen_guard", name: "Fae Queen's Guard", maxHp: [78, 88], isElite: true, isBoss: false,
    goldReward: [35, 50], act: 2,
    moves: [
      { id: "enchanted_blade", intent: EnemyIntentType.ATTACK, damage: 15, hits: 1, block: 0, effects: [{ id: StatusEffectId.FRAIL, amount: 1 }], selfEffects: [], weight: 5, minTurn: 0 },
      { id: "fae_shield", intent: EnemyIntentType.DEFEND, damage: 0, hits: 0, block: 16, effects: [], selfEffects: [{ id: StatusEffectId.THORNS, amount: 3 }], weight: 3, minTurn: 0 },
      { id: "hex_bolt", intent: EnemyIntentType.ATTACK, damage: 6, hits: 2, block: 0, effects: [{ id: StatusEffectId.WEAK, amount: 1 }], selfEffects: [], weight: 3, minTurn: 1 },
    ],
  },
];

const ACT2_BOSS: EnemyDef[] = [
  {
    id: "boss_morgan_le_fay", name: "Morgan le Fay", maxHp: [250, 280], isElite: false, isBoss: true,
    goldReward: [70, 80], act: 2,
    moves: [
      { id: "dark_bolt", intent: EnemyIntentType.ATTACK, damage: 14, hits: 1, block: 0, effects: [{ id: StatusEffectId.WEAK, amount: 1 }], selfEffects: [], weight: 4, minTurn: 0 },
      { id: "enchantment", intent: EnemyIntentType.BUFF, damage: 0, hits: 0, block: 12, effects: [], selfEffects: [{ id: StatusEffectId.STRENGTH, amount: 3 }], weight: 3, minTurn: 0 },
      { id: "hex_storm", intent: EnemyIntentType.ATTACK, damage: 6, hits: 3, block: 0, effects: [{ id: StatusEffectId.VULNERABLE, amount: 1 }], selfEffects: [], weight: 3, minTurn: 2 },
      { id: "dark_ritual", intent: EnemyIntentType.BUFF, damage: 0, hits: 0, block: 0, effects: [], selfEffects: [{ id: StatusEffectId.RITUAL, amount: 2 }, { id: StatusEffectId.STRENGTH, amount: 2 }], weight: 2, minTurn: 4 },
    ],
  },
  {
    id: "boss_questing_beast_prime", name: "Questing Beast Prime", maxHp: [230, 260], isElite: false, isBoss: true,
    goldReward: [70, 80], act: 2,
    moves: [
      { id: "rampage", intent: EnemyIntentType.ATTACK, damage: 16, hits: 1, block: 0, effects: [], selfEffects: [], weight: 4, minTurn: 0 },
      { id: "screech_prime", intent: EnemyIntentType.DEBUFF, damage: 0, hits: 0, block: 0, effects: [{ id: StatusEffectId.WEAK, amount: 3 }, { id: StatusEffectId.VULNERABLE, amount: 3 }], selfEffects: [], weight: 3, minTurn: 0 },
      { id: "devour", intent: EnemyIntentType.ATTACK, damage: 20, hits: 1, block: 0, effects: [], selfEffects: [], weight: 2, minTurn: 3 },
      { id: "regenerate", intent: EnemyIntentType.BUFF, damage: 0, hits: 0, block: 0, effects: [], selfEffects: [{ id: StatusEffectId.REGEN, amount: 8 }], weight: 2, minTurn: 2 },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// ACT 3 — The Perilous Lands (dragons, demon knights)
// ═══════════════════════════════════════════════════════════════════════════

const ACT3_NORMAL: EnemyDef[] = [
  {
    id: "demon_knight", name: "Demon Knight", maxHp: [50, 60], isElite: false, isBoss: false,
    goldReward: [18, 26], act: 3,
    moves: [
      { id: "hellfire_slash", intent: EnemyIntentType.ATTACK, damage: 16, hits: 1, block: 0, effects: [], selfEffects: [], weight: 5, minTurn: 0 },
      { id: "dark_shield", intent: EnemyIntentType.DEFEND, damage: 0, hits: 0, block: 14, effects: [], selfEffects: [{ id: StatusEffectId.STRENGTH, amount: 2 }], weight: 3, minTurn: 0 },
      { id: "infernal_combo", intent: EnemyIntentType.ATTACK, damage: 9, hits: 2, block: 0, effects: [], selfEffects: [], weight: 3, minTurn: 1 },
    ],
  },
  {
    id: "dragon_whelp", name: "Dragon Whelp", maxHp: [42, 50], isElite: false, isBoss: false,
    goldReward: [20, 28], act: 3,
    moves: [
      { id: "claw", intent: EnemyIntentType.ATTACK, damage: 10, hits: 1, block: 0, effects: [], selfEffects: [], weight: 5, minTurn: 0 },
      { id: "fire_breath", intent: EnemyIntentType.ATTACK, damage: 6, hits: 1, block: 0, effects: [{ id: StatusEffectId.VULNERABLE, amount: 1 }], selfEffects: [], weight: 4, minTurn: 0 },
      { id: "roar", intent: EnemyIntentType.BUFF, damage: 0, hits: 0, block: 0, effects: [], selfEffects: [{ id: StatusEffectId.STRENGTH, amount: 3 }], weight: 2, minTurn: 1 },
    ],
  },
  {
    id: "shade", name: "Shade", maxHp: [32, 40], isElite: false, isBoss: false,
    goldReward: [16, 22], act: 3,
    moves: [
      { id: "shadow_strike", intent: EnemyIntentType.ATTACK, damage: 13, hits: 1, block: 0, effects: [{ id: StatusEffectId.FRAIL, amount: 1 }], selfEffects: [], weight: 5, minTurn: 0 },
      { id: "fade", intent: EnemyIntentType.DEFEND, damage: 0, hits: 0, block: 18, effects: [], selfEffects: [], weight: 3, minTurn: 0 },
      { id: "drain_life", intent: EnemyIntentType.ATTACK, damage: 8, hits: 1, block: 0, effects: [], selfEffects: [{ id: StatusEffectId.REGEN, amount: 3 }], weight: 3, minTurn: 1 },
    ],
  },
  {
    id: "hellhound", name: "Hellhound", maxHp: [45, 55], isElite: false, isBoss: false,
    goldReward: [20, 28], act: 3,
    moves: [
      { id: "fire_bite", intent: EnemyIntentType.ATTACK, damage: 14, hits: 1, block: 0, effects: [{ id: StatusEffectId.VULNERABLE, amount: 1 }], selfEffects: [], weight: 4, minTurn: 0 },
      { id: "howl", intent: EnemyIntentType.BUFF, damage: 0, hits: 0, block: 0, effects: [], selfEffects: [{ id: StatusEffectId.STRENGTH, amount: 3 }], weight: 3, minTurn: 0 },
      { id: "lunge", intent: EnemyIntentType.ATTACK, damage: 10, hits: 2, block: 0, effects: [], selfEffects: [], weight: 3, minTurn: 2 },
    ],
  },
  {
    id: "fallen_paladin", name: "Fallen Paladin", maxHp: [55, 65], isElite: false, isBoss: false,
    goldReward: [22, 30], act: 3,
    moves: [
      { id: "holy_smite", intent: EnemyIntentType.ATTACK, damage: 16, hits: 1, block: 0, effects: [], selfEffects: [], weight: 4, minTurn: 0 },
      { id: "dark_prayer", intent: EnemyIntentType.BUFF, damage: 0, hits: 0, block: 0, effects: [], selfEffects: [{ id: StatusEffectId.STRENGTH, amount: 2 }, { id: StatusEffectId.REGEN, amount: 3 }], weight: 3, minTurn: 1 },
      { id: "crusade", intent: EnemyIntentType.ATTACK, damage: 10, hits: 2, block: 0, effects: [{ id: StatusEffectId.FRAIL, amount: 1 }], selfEffects: [], weight: 3, minTurn: 2 },
    ],
  },
];

const ACT3_ELITE: EnemyDef[] = [
  {
    id: "dragon", name: "Ancient Dragon", maxHp: [140, 160], isElite: true, isBoss: false,
    goldReward: [50, 70], act: 3,
    moves: [
      { id: "claw", intent: EnemyIntentType.ATTACK, damage: 22, hits: 1, block: 0, effects: [], selfEffects: [], weight: 4, minTurn: 0 },
      { id: "fire_breath", intent: EnemyIntentType.ATTACK, damage: 10, hits: 3, block: 0, effects: [{ id: StatusEffectId.VULNERABLE, amount: 1 }], selfEffects: [], weight: 3, minTurn: 1 },
      { id: "roar", intent: EnemyIntentType.BUFF, damage: 0, hits: 0, block: 12, effects: [], selfEffects: [{ id: StatusEffectId.STRENGTH, amount: 4 }], weight: 2, minTurn: 2 },
    ],
  },
  {
    id: "mordred_shadow", name: "Mordred's Shadow", maxHp: [120, 140], isElite: true, isBoss: false,
    goldReward: [50, 70], act: 3,
    moves: [
      { id: "betrayal", intent: EnemyIntentType.ATTACK, damage: 18, hits: 1, block: 0, effects: [{ id: StatusEffectId.WEAK, amount: 2 }], selfEffects: [], weight: 4, minTurn: 0 },
      { id: "dark_mirror", intent: EnemyIntentType.DEFEND, damage: 0, hits: 0, block: 20, effects: [], selfEffects: [{ id: StatusEffectId.THORNS, amount: 5 }], weight: 3, minTurn: 0 },
      { id: "treachery", intent: EnemyIntentType.ATTACK, damage: 10, hits: 2, block: 0, effects: [{ id: StatusEffectId.FRAIL, amount: 2 }], selfEffects: [], weight: 3, minTurn: 2 },
    ],
  },
];

const ACT3_BOSS: EnemyDef[] = [
  {
    id: "boss_grail_guardian", name: "Grail Guardian", maxHp: [350, 400], isElite: false, isBoss: true,
    goldReward: [100, 120], act: 3,
    moves: [
      { id: "divine_smite", intent: EnemyIntentType.ATTACK, damage: 18, hits: 1, block: 0, effects: [{ id: StatusEffectId.VULNERABLE, amount: 1 }], selfEffects: [], weight: 4, minTurn: 0 },
      { id: "holy_barrier", intent: EnemyIntentType.DEFEND, damage: 0, hits: 0, block: 25, effects: [], selfEffects: [{ id: StatusEffectId.REGEN, amount: 5 }], weight: 3, minTurn: 0 },
      { id: "judgment", intent: EnemyIntentType.ATTACK, damage: 12, hits: 3, block: 0, effects: [], selfEffects: [], weight: 3, minTurn: 2 },
      { id: "purge", intent: EnemyIntentType.BUFF, damage: 0, hits: 0, block: 0, effects: [], selfEffects: [{ id: StatusEffectId.STRENGTH, amount: 5 }, { id: StatusEffectId.RITUAL, amount: 2 }], weight: 2, minTurn: 5 },
    ],
  },
  // Alternate final boss for low-purity runs
  {
    id: "boss_shadow_self", name: "Your Shadow", maxHp: [300, 350], isElite: false, isBoss: true,
    goldReward: [100, 120], act: 3,
    moves: [
      { id: "mirror_strike", intent: EnemyIntentType.ATTACK, damage: 16, hits: 1, block: 0, effects: [], selfEffects: [], weight: 4, minTurn: 0 },
      { id: "dark_reflect", intent: EnemyIntentType.DEFEND, damage: 0, hits: 0, block: 20, effects: [], selfEffects: [{ id: StatusEffectId.STRENGTH, amount: 2 }], weight: 3, minTurn: 0 },
      { id: "shadow_burst", intent: EnemyIntentType.ATTACK, damage: 8, hits: 4, block: 0, effects: [{ id: StatusEffectId.WEAK, amount: 1 }], selfEffects: [], weight: 3, minTurn: 2 },
      { id: "consume", intent: EnemyIntentType.BUFF, damage: 0, hits: 0, block: 0, effects: [], selfEffects: [{ id: StatusEffectId.STRENGTH, amount: 4 }, { id: StatusEffectId.REGEN, amount: 8 }], weight: 2, minTurn: 4 },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// ENCOUNTER TABLES
// ═══════════════════════════════════════════════════════════════════════════

/** Normal encounters per act: arrays of enemy id lists (for multi-enemy fights). */
export const ENCOUNTER_TABLE: Record<number, string[][]> = {
  1: [
    ["bandit", "bandit"],
    ["wolf", "wolf", "wolf"],
    ["cultist"],
    ["louse_red", "louse_green"],
    ["bandit", "louse_red"],
    ["fungus", "fungus"],
    ["cultist", "louse_green"],
    ["corrupt_peasant", "corrupt_peasant", "highwayman"],
    ["highwayman", "bandit"],
  ],
  2: [
    ["skeleton", "skeleton"],
    ["wraith", "fae_trickster"],
    ["cursed_knight"],
    ["fae_trickster", "fae_trickster", "fae_trickster"],
    ["skeleton", "wraith"],
    ["cursed_knight", "fae_trickster"],
    ["barrow_wight"],
    ["pixie_swarm", "pixie_swarm", "pixie_swarm", "pixie_swarm"],
  ],
  3: [
    ["demon_knight", "demon_knight"],
    ["dragon_whelp"],
    ["shade", "shade", "shade"],
    ["demon_knight", "shade"],
    ["dragon_whelp", "shade"],
    ["hellhound", "hellhound"],
    ["fallen_paladin"],
  ],
};

export const ELITE_TABLE: Record<number, string[][]> = {
  1: [["black_knight"], ["nob"], ["sentries", "sentries"]],
  2: [["questing_beast"], ["fae_queen_guard"]],
  3: [["dragon"], ["mordred_shadow"]],
};

export const BOSS_TABLE: Record<number, string[]> = {
  1: ["boss_green_knight", "boss_mordred_youth"],
  2: ["boss_morgan_le_fay", "boss_questing_beast_prime"],
  3: ["boss_grail_guardian"], // swapped to boss_shadow_self if low purity
};

// ── Registry ──

const ALL_ENEMIES: EnemyDef[] = [
  ...ACT1_NORMAL, ...ACT1_ELITE, ...ACT1_BOSS,
  ...ACT2_NORMAL, ...ACT2_ELITE, ...ACT2_BOSS,
  ...ACT3_NORMAL, ...ACT3_ELITE, ...ACT3_BOSS,
];

export const ENEMY_MAP: Map<string, EnemyDef> = new Map();
for (const e of ALL_ENEMIES) ENEMY_MAP.set(e.id, e);

export function getEnemyDef(id: string): EnemyDef {
  const def = ENEMY_MAP.get(id);
  if (!def) throw new Error(`Unknown enemy: ${id}`);
  return def;
}
