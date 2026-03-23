// ---------------------------------------------------------------------------
// Round Table – Card Definitions
// ---------------------------------------------------------------------------

import {
  CardDef, CardType, CardRarity, TargetType, StatusEffectId, KnightId,
} from "../types";

/** Helper to create a card def with sensible defaults. */
function card(partial: Partial<CardDef> & Pick<CardDef, "id" | "name" | "type" | "rarity" | "cost" | "description">): CardDef {
  return {
    damage: 0,
    hits: 1,
    block: 0,
    applyEffects: [],
    selfEffects: [],
    draw: 0,
    energy: 0,
    purityChange: 0,
    exhaust: false,
    ethereal: false,
    unremovable: false,
    targetAll: false,
    special: "",
    upgradeId: null,
    knightOnly: null,
    target: TargetType.SINGLE_ENEMY,
    ...partial,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// STARTER / BASIC CARDS
// ═══════════════════════════════════════════════════════════════════════════

const STARTER_CARDS: CardDef[] = [
  card({
    id: "strike", name: "Strike", type: CardType.STRIKE, rarity: CardRarity.STARTER,
    cost: 1, description: "Deal 6 damage.", damage: 6, upgradeId: "strike+",
  }),
  card({
    id: "strike+", name: "Strike+", type: CardType.STRIKE, rarity: CardRarity.STARTER,
    cost: 1, description: "Deal 9 damage.", damage: 9,
  }),
  card({
    id: "defend", name: "Defend", type: CardType.GUARD, rarity: CardRarity.STARTER,
    cost: 1, description: "Gain 5 Block.", block: 5, target: TargetType.SELF, upgradeId: "defend+",
  }),
  card({
    id: "defend+", name: "Defend+", type: CardType.GUARD, rarity: CardRarity.STARTER,
    cost: 1, description: "Gain 8 Block.", block: 8, target: TargetType.SELF,
  }),
];

// ═══════════════════════════════════════════════════════════════════════════
// COMMON STRIKE CARDS
// ═══════════════════════════════════════════════════════════════════════════

const COMMON_STRIKES: CardDef[] = [
  card({
    id: "quick_slash", name: "Quick Slash", type: CardType.STRIKE, rarity: CardRarity.COMMON,
    cost: 1, description: "Deal 8 damage. Draw 1 card.", damage: 8, draw: 1, upgradeId: "quick_slash+",
  }),
  card({
    id: "quick_slash+", name: "Quick Slash+", type: CardType.STRIKE, rarity: CardRarity.COMMON,
    cost: 1, description: "Deal 12 damage. Draw 1 card.", damage: 12, draw: 1,
  }),
  card({
    id: "cleave", name: "Cleave", type: CardType.STRIKE, rarity: CardRarity.COMMON,
    cost: 1, description: "Deal 8 damage to ALL enemies.", damage: 8, targetAll: true,
    target: TargetType.ALL_ENEMIES, upgradeId: "cleave+",
  }),
  card({
    id: "cleave+", name: "Cleave+", type: CardType.STRIKE, rarity: CardRarity.COMMON,
    cost: 1, description: "Deal 11 damage to ALL enemies.", damage: 11, targetAll: true,
    target: TargetType.ALL_ENEMIES,
  }),
  card({
    id: "twin_strike", name: "Twin Strike", type: CardType.STRIKE, rarity: CardRarity.COMMON,
    cost: 1, description: "Deal 5 damage twice.", damage: 5, hits: 2, upgradeId: "twin_strike+",
  }),
  card({
    id: "twin_strike+", name: "Twin Strike+", type: CardType.STRIKE, rarity: CardRarity.COMMON,
    cost: 1, description: "Deal 7 damage twice.", damage: 7, hits: 2,
  }),
  card({
    id: "pommel_strike", name: "Pommel Strike", type: CardType.STRIKE, rarity: CardRarity.COMMON,
    cost: 1, description: "Deal 9 damage. Draw 1 card.", damage: 9, draw: 1, upgradeId: "pommel_strike+",
  }),
  card({
    id: "pommel_strike+", name: "Pommel Strike+", type: CardType.STRIKE, rarity: CardRarity.COMMON,
    cost: 1, description: "Deal 10 damage. Draw 2 cards.", damage: 10, draw: 2,
  }),
  card({
    id: "iron_wave", name: "Iron Wave", type: CardType.STRIKE, rarity: CardRarity.COMMON,
    cost: 1, description: "Deal 5 damage. Gain 5 Block.", damage: 5, block: 5, upgradeId: "iron_wave+",
  }),
  card({
    id: "iron_wave+", name: "Iron Wave+", type: CardType.STRIKE, rarity: CardRarity.COMMON,
    cost: 1, description: "Deal 7 damage. Gain 7 Block.", damage: 7, block: 7,
  }),
  card({
    id: "anger", name: "Anger", type: CardType.STRIKE, rarity: CardRarity.COMMON,
    cost: 0, description: "Deal 6 damage. Add a copy of this card to your discard pile.",
    damage: 6, special: "copy_to_discard", upgradeId: "anger+",
  }),
  card({
    id: "anger+", name: "Anger+", type: CardType.STRIKE, rarity: CardRarity.COMMON,
    cost: 0, description: "Deal 8 damage. Add a copy of this card to your discard pile.",
    damage: 8, special: "copy_to_discard",
  }),
  card({
    id: "headbutt", name: "Headbutt", type: CardType.STRIKE, rarity: CardRarity.COMMON,
    cost: 1, description: "Deal 9 damage. Put a card from discard on top of draw pile.",
    damage: 9, special: "discard_to_top", upgradeId: "headbutt+",
  }),
  card({
    id: "headbutt+", name: "Headbutt+", type: CardType.STRIKE, rarity: CardRarity.COMMON,
    cost: 1, description: "Deal 12 damage. Put a card from discard on top of draw pile.",
    damage: 12, special: "discard_to_top",
  }),
  card({
    id: "body_slam", name: "Body Slam", type: CardType.STRIKE, rarity: CardRarity.COMMON,
    cost: 1, description: "Deal damage equal to your Block.", damage: 0, special: "body_slam",
    upgradeId: "body_slam+",
  }),
  card({
    id: "body_slam+", name: "Body Slam+", type: CardType.STRIKE, rarity: CardRarity.COMMON,
    cost: 0, description: "Deal damage equal to your Block.", damage: 0, special: "body_slam",
  }),
  card({
    id: "clash", name: "Clash", type: CardType.STRIKE, rarity: CardRarity.COMMON,
    cost: 0, description: "Can only be played if every card in hand is an Attack. Deal 14 damage.",
    damage: 14, special: "clash_check", upgradeId: "clash+",
  }),
  card({
    id: "clash+", name: "Clash+", type: CardType.STRIKE, rarity: CardRarity.COMMON,
    cost: 0, description: "Can only be played if every card in hand is an Attack. Deal 18 damage.",
    damage: 18, special: "clash_check",
  }),
  card({
    id: "wild_strike", name: "Wild Strike", type: CardType.STRIKE, rarity: CardRarity.COMMON,
    cost: 1, description: "Deal 12 damage. Shuffle a Wound into your draw pile.",
    damage: 12, special: "add_wound", upgradeId: "wild_strike+",
  }),
  card({
    id: "wild_strike+", name: "Wild Strike+", type: CardType.STRIKE, rarity: CardRarity.COMMON,
    cost: 1, description: "Deal 17 damage. Shuffle a Wound into your draw pile.",
    damage: 17, special: "add_wound",
  }),
];

// ═══════════════════════════════════════════════════════════════════════════
// COMMON GUARD CARDS
// ═══════════════════════════════════════════════════════════════════════════

const COMMON_GUARDS: CardDef[] = [
  card({
    id: "shield_bash", name: "Shield Bash", type: CardType.GUARD, rarity: CardRarity.COMMON,
    cost: 1, description: "Gain 8 Block.", block: 8, target: TargetType.SELF, upgradeId: "shield_bash+",
  }),
  card({
    id: "shield_bash+", name: "Shield Bash+", type: CardType.GUARD, rarity: CardRarity.COMMON,
    cost: 1, description: "Gain 11 Block.", block: 11, target: TargetType.SELF,
  }),
  card({
    id: "parry", name: "Parry", type: CardType.GUARD, rarity: CardRarity.COMMON,
    cost: 1, description: "Gain 5 Block. Draw 1 card.", block: 5, draw: 1, target: TargetType.SELF,
    upgradeId: "parry+",
  }),
  card({
    id: "parry+", name: "Parry+", type: CardType.GUARD, rarity: CardRarity.COMMON,
    cost: 1, description: "Gain 7 Block. Draw 1 card.", block: 7, draw: 1, target: TargetType.SELF,
  }),
  card({
    id: "dodge_roll", name: "Dodge Roll", type: CardType.GUARD, rarity: CardRarity.COMMON,
    cost: 1, description: "Gain 4 Block. Next turn gain 4 Block.",
    block: 4, selfEffects: [{ id: StatusEffectId.BLOCK_NEXT, amount: 4 }],
    target: TargetType.SELF, upgradeId: "dodge_roll+",
  }),
  card({
    id: "dodge_roll+", name: "Dodge Roll+", type: CardType.GUARD, rarity: CardRarity.COMMON,
    cost: 1, description: "Gain 6 Block. Next turn gain 6 Block.",
    block: 6, selfEffects: [{ id: StatusEffectId.BLOCK_NEXT, amount: 6 }], target: TargetType.SELF,
  }),
  card({
    id: "armor_up", name: "Armor Up", type: CardType.GUARD, rarity: CardRarity.COMMON,
    cost: 1, description: "Gain 6 Block. Gain 1 Dexterity.", block: 6,
    selfEffects: [{ id: StatusEffectId.DEXTERITY, amount: 1 }], target: TargetType.SELF,
    upgradeId: "armor_up+", exhaust: true,
  }),
  card({
    id: "armor_up+", name: "Armor Up+", type: CardType.GUARD, rarity: CardRarity.COMMON,
    cost: 1, description: "Gain 8 Block. Gain 1 Dexterity.", block: 8,
    selfEffects: [{ id: StatusEffectId.DEXTERITY, amount: 1 }], target: TargetType.SELF, exhaust: true,
  }),
  card({
    id: "true_grit", name: "True Grit", type: CardType.GUARD, rarity: CardRarity.COMMON,
    cost: 1, description: "Gain 7 Block. Exhaust a random card in hand.", block: 7,
    target: TargetType.SELF, special: "exhaust_random", upgradeId: "true_grit+",
  }),
  card({
    id: "true_grit+", name: "True Grit+", type: CardType.GUARD, rarity: CardRarity.COMMON,
    cost: 1, description: "Gain 9 Block. Exhaust a card in hand.", block: 9,
    target: TargetType.SELF, special: "exhaust_choose",
  }),
  card({
    id: "sentinel", name: "Sentinel", type: CardType.GUARD, rarity: CardRarity.COMMON,
    cost: 1, description: "Gain 5 Block. If Exhausted, gain 2 Energy.", block: 5,
    target: TargetType.SELF, exhaust: true, special: "sentinel_exhaust", upgradeId: "sentinel+",
  }),
  card({
    id: "sentinel+", name: "Sentinel+", type: CardType.GUARD, rarity: CardRarity.COMMON,
    cost: 1, description: "Gain 8 Block. If Exhausted, gain 3 Energy.", block: 8,
    target: TargetType.SELF, exhaust: true, special: "sentinel_exhaust",
  }),
  card({
    id: "shrug_it_off", name: "Shrug It Off", type: CardType.GUARD, rarity: CardRarity.COMMON,
    cost: 1, description: "Gain 8 Block. Draw 1 card.", block: 8, draw: 1,
    target: TargetType.SELF, upgradeId: "shrug_it_off+",
  }),
  card({
    id: "shrug_it_off+", name: "Shrug It Off+", type: CardType.GUARD, rarity: CardRarity.COMMON,
    cost: 1, description: "Gain 11 Block. Draw 1 card.", block: 11, draw: 1,
    target: TargetType.SELF,
  }),
];

// ═══════════════════════════════════════════════════════════════════════════
// COMMON SPELL CARDS
// ═══════════════════════════════════════════════════════════════════════════

const COMMON_SPELLS: CardDef[] = [
  card({
    id: "fireball", name: "Fireball", type: CardType.SPELL, rarity: CardRarity.COMMON,
    cost: 2, description: "Deal 14 damage. Apply 1 Vulnerable.",
    damage: 14, applyEffects: [{ id: StatusEffectId.VULNERABLE, amount: 1 }],
    upgradeId: "fireball+",
  }),
  card({
    id: "fireball+", name: "Fireball+", type: CardType.SPELL, rarity: CardRarity.COMMON,
    cost: 2, description: "Deal 18 damage. Apply 2 Vulnerable.",
    damage: 18, applyEffects: [{ id: StatusEffectId.VULNERABLE, amount: 2 }],
  }),
  card({
    id: "chain_lightning", name: "Chain Lightning", type: CardType.SPELL, rarity: CardRarity.COMMON,
    cost: 1, description: "Deal 7 damage to ALL enemies.",
    damage: 7, targetAll: true, target: TargetType.ALL_ENEMIES, upgradeId: "chain_lightning+",
  }),
  card({
    id: "chain_lightning+", name: "Chain Lightning+", type: CardType.SPELL, rarity: CardRarity.COMMON,
    cost: 1, description: "Deal 10 damage to ALL enemies.",
    damage: 10, targetAll: true, target: TargetType.ALL_ENEMIES,
  }),
  card({
    id: "frost_ward", name: "Frost Ward", type: CardType.SPELL, rarity: CardRarity.COMMON,
    cost: 1, description: "Gain 6 Block. Apply 1 Weak to an enemy.",
    block: 6, applyEffects: [{ id: StatusEffectId.WEAK, amount: 1 }], upgradeId: "frost_ward+",
  }),
  card({
    id: "frost_ward+", name: "Frost Ward+", type: CardType.SPELL, rarity: CardRarity.COMMON,
    cost: 1, description: "Gain 8 Block. Apply 2 Weak to an enemy.",
    block: 8, applyEffects: [{ id: StatusEffectId.WEAK, amount: 2 }],
  }),
  card({
    id: "arcane_bolt", name: "Arcane Bolt", type: CardType.SPELL, rarity: CardRarity.COMMON,
    cost: 0, description: "Deal 4 damage.", damage: 4, upgradeId: "arcane_bolt+",
  }),
  card({
    id: "arcane_bolt+", name: "Arcane Bolt+", type: CardType.SPELL, rarity: CardRarity.COMMON,
    cost: 0, description: "Deal 7 damage.", damage: 7,
  }),
];

// ═══════════════════════════════════════════════════════════════════════════
// UNCOMMON CARDS
// ═══════════════════════════════════════════════════════════════════════════

const UNCOMMON_CARDS: CardDef[] = [
  // ── Strikes ──
  card({
    id: "heavy_blade", name: "Heavy Blade", type: CardType.STRIKE, rarity: CardRarity.UNCOMMON,
    cost: 2, description: "Deal 14 damage. Strength affects this card 3x.",
    damage: 14, special: "strength_x3", upgradeId: "heavy_blade+",
  }),
  card({
    id: "heavy_blade+", name: "Heavy Blade+", type: CardType.STRIKE, rarity: CardRarity.UNCOMMON,
    cost: 2, description: "Deal 18 damage. Strength affects this card 5x.",
    damage: 18, special: "strength_x5",
  }),
  card({
    id: "sword_boomerang", name: "Sword Boomerang", type: CardType.STRIKE, rarity: CardRarity.UNCOMMON,
    cost: 1, description: "Deal 3 damage to a random enemy 3 times.",
    damage: 3, hits: 3, target: TargetType.RANDOM_ENEMY, upgradeId: "sword_boomerang+",
  }),
  card({
    id: "sword_boomerang+", name: "Sword Boomerang+", type: CardType.STRIKE, rarity: CardRarity.UNCOMMON,
    cost: 1, description: "Deal 3 damage to a random enemy 4 times.",
    damage: 3, hits: 4, target: TargetType.RANDOM_ENEMY,
  }),
  card({
    id: "rampage", name: "Rampage", type: CardType.STRIKE, rarity: CardRarity.UNCOMMON,
    cost: 1, description: "Deal 8 damage. Increase this card's damage by 5 each play.",
    damage: 8, special: "rampage", upgradeId: "rampage+",
  }),
  card({
    id: "rampage+", name: "Rampage+", type: CardType.STRIKE, rarity: CardRarity.UNCOMMON,
    cost: 1, description: "Deal 8 damage. Increase this card's damage by 8 each play.",
    damage: 8, special: "rampage+",
  }),
  card({
    id: "whirlwind", name: "Whirlwind", type: CardType.STRIKE, rarity: CardRarity.UNCOMMON,
    cost: 0, description: "Deal 5 damage to ALL enemies X times (X = current Energy). Costs all Energy.",
    damage: 5, targetAll: true, target: TargetType.ALL_ENEMIES, special: "whirlwind",
    upgradeId: "whirlwind+",
  }),
  card({
    id: "whirlwind+", name: "Whirlwind+", type: CardType.STRIKE, rarity: CardRarity.UNCOMMON,
    cost: 0, description: "Deal 8 damage to ALL enemies X times (X = current Energy). Costs all Energy.",
    damage: 8, targetAll: true, target: TargetType.ALL_ENEMIES, special: "whirlwind",
  }),

  // ── Guards ──
  card({
    id: "fortify", name: "Fortify", type: CardType.GUARD, rarity: CardRarity.UNCOMMON,
    cost: 1, description: "Gain 12 Block.", block: 12, target: TargetType.SELF, upgradeId: "fortify+",
  }),
  card({
    id: "fortify+", name: "Fortify+", type: CardType.GUARD, rarity: CardRarity.UNCOMMON,
    cost: 1, description: "Gain 16 Block.", block: 16, target: TargetType.SELF,
  }),
  card({
    id: "entrench", name: "Entrench", type: CardType.GUARD, rarity: CardRarity.UNCOMMON,
    cost: 2, description: "Double your current Block.", target: TargetType.SELF,
    special: "double_block", upgradeId: "entrench+",
  }),
  card({
    id: "entrench+", name: "Entrench+", type: CardType.GUARD, rarity: CardRarity.UNCOMMON,
    cost: 1, description: "Double your current Block.", target: TargetType.SELF, special: "double_block",
  }),
  card({
    id: "flame_barrier", name: "Flame Barrier", type: CardType.GUARD, rarity: CardRarity.UNCOMMON,
    cost: 2, description: "Gain 12 Block. Whenever attacked this turn deal 4 damage back.",
    block: 12, selfEffects: [{ id: StatusEffectId.FLAME_BARRIER, amount: 4 }],
    target: TargetType.SELF, upgradeId: "flame_barrier+",
  }),
  card({
    id: "flame_barrier+", name: "Flame Barrier+", type: CardType.GUARD, rarity: CardRarity.UNCOMMON,
    cost: 2, description: "Gain 16 Block. Whenever attacked this turn deal 6 damage back.",
    block: 16, selfEffects: [{ id: StatusEffectId.FLAME_BARRIER, amount: 6 }], target: TargetType.SELF,
  }),

  // ── Spells ──
  card({
    id: "inflame", name: "Inflame", type: CardType.SPELL, rarity: CardRarity.UNCOMMON,
    cost: 1, description: "Gain 2 Strength.", target: TargetType.SELF,
    selfEffects: [{ id: StatusEffectId.STRENGTH, amount: 2 }], upgradeId: "inflame+",
  }),
  card({
    id: "inflame+", name: "Inflame+", type: CardType.SPELL, rarity: CardRarity.UNCOMMON,
    cost: 1, description: "Gain 3 Strength.", target: TargetType.SELF,
    selfEffects: [{ id: StatusEffectId.STRENGTH, amount: 3 }],
  }),
  card({
    id: "shockwave", name: "Shockwave", type: CardType.SPELL, rarity: CardRarity.UNCOMMON,
    cost: 2, description: "Apply 3 Weak and 3 Vulnerable to ALL enemies.", exhaust: true,
    targetAll: true, target: TargetType.ALL_ENEMIES,
    applyEffects: [{ id: StatusEffectId.WEAK, amount: 3 }, { id: StatusEffectId.VULNERABLE, amount: 3 }],
    upgradeId: "shockwave+",
  }),
  card({
    id: "shockwave+", name: "Shockwave+", type: CardType.SPELL, rarity: CardRarity.UNCOMMON,
    cost: 2, description: "Apply 5 Weak and 5 Vulnerable to ALL enemies.", exhaust: true,
    targetAll: true, target: TargetType.ALL_ENEMIES,
    applyEffects: [{ id: StatusEffectId.WEAK, amount: 5 }, { id: StatusEffectId.VULNERABLE, amount: 5 }],
  }),
  card({
    id: "battle_trance", name: "Battle Trance", type: CardType.SPELL, rarity: CardRarity.UNCOMMON,
    cost: 0, description: "Draw 3 cards. You cannot draw more cards this turn.",
    draw: 3, target: TargetType.SELF, special: "no_more_draw", upgradeId: "battle_trance+",
  }),
  card({
    id: "battle_trance+", name: "Battle Trance+", type: CardType.SPELL, rarity: CardRarity.UNCOMMON,
    cost: 0, description: "Draw 4 cards. You cannot draw more cards this turn.",
    draw: 4, target: TargetType.SELF, special: "no_more_draw",
  }),
  card({
    id: "disarm", name: "Disarm", type: CardType.SPELL, rarity: CardRarity.UNCOMMON,
    cost: 1, description: "Apply 2 Weak. Enemy loses 2 Strength.", exhaust: true,
    applyEffects: [{ id: StatusEffectId.WEAK, amount: 2 }, { id: StatusEffectId.STRENGTH, amount: -2 }],
    upgradeId: "disarm+",
  }),
  card({
    id: "disarm+", name: "Disarm+", type: CardType.SPELL, rarity: CardRarity.UNCOMMON,
    cost: 1, description: "Apply 3 Weak. Enemy loses 3 Strength.", exhaust: true,
    applyEffects: [{ id: StatusEffectId.WEAK, amount: 3 }, { id: StatusEffectId.STRENGTH, amount: -3 }],
  }),

  // ── Virtue ──
  card({
    id: "courage", name: "Courage", type: CardType.VIRTUE, rarity: CardRarity.UNCOMMON,
    cost: 1, description: "Gain 2 Strength. Purity +3.", target: TargetType.SELF,
    selfEffects: [{ id: StatusEffectId.STRENGTH, amount: 2 }], purityChange: 3,
    upgradeId: "courage+",
  }),
  card({
    id: "courage+", name: "Courage+", type: CardType.VIRTUE, rarity: CardRarity.UNCOMMON,
    cost: 1, description: "Gain 3 Strength. Purity +5.", target: TargetType.SELF,
    selfEffects: [{ id: StatusEffectId.STRENGTH, amount: 3 }], purityChange: 5,
  }),
  card({
    id: "honour", name: "Honour", type: CardType.VIRTUE, rarity: CardRarity.UNCOMMON,
    cost: 1, description: "Gain 8 Block. Gain 1 Dexterity. Purity +2.",
    block: 8, selfEffects: [{ id: StatusEffectId.DEXTERITY, amount: 1 }],
    target: TargetType.SELF, purityChange: 2, upgradeId: "honour+",
  }),
  card({
    id: "honour+", name: "Honour+", type: CardType.VIRTUE, rarity: CardRarity.UNCOMMON,
    cost: 1, description: "Gain 11 Block. Gain 2 Dexterity. Purity +3.",
    block: 11, selfEffects: [{ id: StatusEffectId.DEXTERITY, amount: 2 }],
    target: TargetType.SELF, purityChange: 3,
  }),
  card({
    id: "faith", name: "Faith", type: CardType.VIRTUE, rarity: CardRarity.UNCOMMON,
    cost: 1, description: "Heal 6 HP. Purity +4. Exhaust.", target: TargetType.SELF,
    special: "heal_6", purityChange: 4, exhaust: true, upgradeId: "faith+",
  }),
  card({
    id: "faith+", name: "Faith+", type: CardType.VIRTUE, rarity: CardRarity.UNCOMMON,
    cost: 1, description: "Heal 10 HP. Purity +6. Exhaust.", target: TargetType.SELF,
    special: "heal_10", purityChange: 6, exhaust: true,
  }),

  // ── Sin ──
  card({
    id: "wrath", name: "Wrath", type: CardType.SIN, rarity: CardRarity.UNCOMMON,
    cost: 1, description: "Deal 20 damage. Take 5 damage. Purity -3.",
    damage: 20, special: "self_damage_5", purityChange: -3, upgradeId: "wrath+",
  }),
  card({
    id: "wrath+", name: "Wrath+", type: CardType.SIN, rarity: CardRarity.UNCOMMON,
    cost: 1, description: "Deal 28 damage. Take 5 damage. Purity -3.",
    damage: 28, special: "self_damage_5", purityChange: -3,
  }),
  card({
    id: "pride", name: "Pride", type: CardType.SIN, rarity: CardRarity.UNCOMMON,
    cost: 1, description: "Deal double damage this turn. Cannot gain Block next turn. Purity -4.",
    target: TargetType.SELF, special: "double_damage_turn", purityChange: -4, exhaust: true,
    upgradeId: "pride+",
  }),
  card({
    id: "pride+", name: "Pride+", type: CardType.SIN, rarity: CardRarity.UNCOMMON,
    cost: 0, description: "Deal double damage this turn. Cannot gain Block next turn. Purity -4.",
    target: TargetType.SELF, special: "double_damage_turn", purityChange: -4, exhaust: true,
  }),
  card({
    id: "greed", name: "Greed", type: CardType.SIN, rarity: CardRarity.UNCOMMON,
    cost: 1, description: "Gain 20 Gold. Take 8 damage. Purity -2.",
    target: TargetType.SELF, special: "gain_gold_20_self_damage_8", purityChange: -2, exhaust: true,
    upgradeId: "greed+",
  }),
  card({
    id: "greed+", name: "Greed+", type: CardType.SIN, rarity: CardRarity.UNCOMMON,
    cost: 1, description: "Gain 30 Gold. Take 8 damage. Purity -2.",
    target: TargetType.SELF, special: "gain_gold_30_self_damage_8", purityChange: -2, exhaust: true,
  }),

  // ── New Uncommon Guards ──
  card({
    id: "body_armor", name: "Body Armor", type: CardType.GUARD, rarity: CardRarity.UNCOMMON,
    cost: 1, description: "Gain Block equal to your current Strength x4 + 6.", block: 0,
    target: TargetType.SELF, special: "str_block", upgradeId: "body_armor+",
  }),
  card({
    id: "body_armor+", name: "Body Armor+", type: CardType.GUARD, rarity: CardRarity.UNCOMMON,
    cost: 1, description: "Gain Block equal to your current Strength x4 + 10.", block: 0,
    target: TargetType.SELF, special: "str_block+",
  }),

  // ── New Uncommon Spells ──
  card({
    id: "bloodletting", name: "Bloodletting", type: CardType.SPELL, rarity: CardRarity.UNCOMMON,
    cost: 0, description: "Lose 3 HP. Gain 2 Energy.", target: TargetType.SELF,
    special: "self_damage_3_energy_2", exhaust: true, upgradeId: "bloodletting+",
  }),
  card({
    id: "bloodletting+", name: "Bloodletting+", type: CardType.SPELL, rarity: CardRarity.UNCOMMON,
    cost: 0, description: "Lose 3 HP. Gain 3 Energy.", target: TargetType.SELF,
    special: "self_damage_3_energy_3", exhaust: true,
  }),
  card({
    id: "dark_embrace", name: "Dark Embrace", type: CardType.SPELL, rarity: CardRarity.UNCOMMON,
    cost: 2, description: "Whenever you Exhaust a card, draw 1 card.", target: TargetType.SELF,
    special: "dark_embrace_power", upgradeId: "dark_embrace+",
  }),
  card({
    id: "dark_embrace+", name: "Dark Embrace+", type: CardType.SPELL, rarity: CardRarity.UNCOMMON,
    cost: 1, description: "Whenever you Exhaust a card, draw 1 card.", target: TargetType.SELF,
    special: "dark_embrace_power",
  }),
  card({
    id: "noxious_fumes", name: "Noxious Fumes", type: CardType.SPELL, rarity: CardRarity.UNCOMMON,
    cost: 1, description: "At the start of each turn, apply 2 Poison to ALL enemies.",
    target: TargetType.SELF, special: "noxious_fumes_power", upgradeId: "noxious_fumes+",
  }),
  card({
    id: "noxious_fumes+", name: "Noxious Fumes+", type: CardType.SPELL, rarity: CardRarity.UNCOMMON,
    cost: 1, description: "At the start of each turn, apply 3 Poison to ALL enemies.",
    target: TargetType.SELF, special: "noxious_fumes_power+",
  }),

  // ── New Uncommon Strikes ──
  card({
    id: "lance_charge", name: "Lance Charge", type: CardType.STRIKE, rarity: CardRarity.UNCOMMON,
    cost: 2, description: "Deal 24 damage. Next turn you are Vulnerable.", damage: 24,
    applyEffects: [], selfEffects: [{ id: StatusEffectId.VULNERABLE, amount: 1 }],
    upgradeId: "lance_charge+",
  }),
  card({
    id: "lance_charge+", name: "Lance Charge+", type: CardType.STRIKE, rarity: CardRarity.UNCOMMON,
    cost: 2, description: "Deal 28 damage. Next turn you are Vulnerable.", damage: 28,
    applyEffects: [], selfEffects: [{ id: StatusEffectId.VULNERABLE, amount: 1 }],
  }),

  // ── New Uncommon Virtue ──
  card({
    id: "divine_shield", name: "Divine Shield", type: CardType.VIRTUE, rarity: CardRarity.UNCOMMON,
    cost: 2, description: "Gain 1 Holy Shield. Gain 10 Block. Purity +3.", block: 10,
    selfEffects: [{ id: StatusEffectId.HOLY_SHIELD, amount: 1 }],
    target: TargetType.SELF, purityChange: 3, upgradeId: "divine_shield+",
  }),
  card({
    id: "divine_shield+", name: "Divine Shield+", type: CardType.VIRTUE, rarity: CardRarity.UNCOMMON,
    cost: 2, description: "Gain 1 Holy Shield. Gain 14 Block. Purity +4.", block: 14,
    selfEffects: [{ id: StatusEffectId.HOLY_SHIELD, amount: 1 }],
    target: TargetType.SELF, purityChange: 4,
  }),

  // ── New Uncommon Sins ──
  card({
    id: "sloth", name: "Sloth", type: CardType.SIN, rarity: CardRarity.UNCOMMON,
    cost: 1, description: "Deal 12 damage. Draw 1 less card next turn. Purity -2.",
    damage: 12, special: "draw_less_next", purityChange: -2, upgradeId: "sloth+",
  }),
  card({
    id: "sloth+", name: "Sloth+", type: CardType.SIN, rarity: CardRarity.UNCOMMON,
    cost: 1, description: "Deal 16 damage. Draw 1 less card next turn. Purity -2.",
    damage: 16, special: "draw_less_next", purityChange: -2,
  }),
  card({
    id: "envy", name: "Envy", type: CardType.SIN, rarity: CardRarity.UNCOMMON,
    cost: 1, description: "Copy the last card you played and add it to your hand. Purity -3.",
    target: TargetType.SELF, special: "copy_last_played", purityChange: -3, exhaust: true,
    upgradeId: "envy+",
  }),
  card({
    id: "envy+", name: "Envy+", type: CardType.SIN, rarity: CardRarity.UNCOMMON,
    cost: 0, description: "Copy the last card you played and add it to your hand. Purity -3.",
    target: TargetType.SELF, special: "copy_last_played", purityChange: -3, exhaust: true,
  }),
];

// ═══════════════════════════════════════════════════════════════════════════
// RARE CARDS
// ═══════════════════════════════════════════════════════════════════════════

const RARE_CARDS: CardDef[] = [
  card({
    id: "excalibur_strike", name: "Excalibur Strike", type: CardType.STRIKE, rarity: CardRarity.RARE,
    cost: 3, description: "Deal 30 damage. Apply 2 Vulnerable. Draw 2 cards.",
    damage: 30, draw: 2, applyEffects: [{ id: StatusEffectId.VULNERABLE, amount: 2 }],
    upgradeId: "excalibur_strike+",
  }),
  card({
    id: "excalibur_strike+", name: "Excalibur Strike+", type: CardType.STRIKE, rarity: CardRarity.RARE,
    cost: 3, description: "Deal 40 damage. Apply 3 Vulnerable. Draw 2 cards.",
    damage: 40, draw: 2, applyEffects: [{ id: StatusEffectId.VULNERABLE, amount: 3 }],
  }),
  card({
    id: "hundred_slashes", name: "Hundred Slashes", type: CardType.STRIKE, rarity: CardRarity.RARE,
    cost: 2, description: "Deal 2 damage 10 times to a random enemy.",
    damage: 2, hits: 10, target: TargetType.RANDOM_ENEMY, upgradeId: "hundred_slashes+",
  }),
  card({
    id: "hundred_slashes+", name: "Hundred Slashes+", type: CardType.STRIKE, rarity: CardRarity.RARE,
    cost: 2, description: "Deal 3 damage 10 times to a random enemy.",
    damage: 3, hits: 10, target: TargetType.RANDOM_ENEMY,
  }),
  card({
    id: "divine_ward", name: "Divine Ward", type: CardType.GUARD, rarity: CardRarity.RARE,
    cost: 3, description: "Gain 30 Block. Gain 1 Holy Shield (negate next hit).",
    block: 30, selfEffects: [{ id: StatusEffectId.HOLY_SHIELD, amount: 1 }],
    target: TargetType.SELF, upgradeId: "divine_ward+",
  }),
  card({
    id: "divine_ward+", name: "Divine Ward+", type: CardType.GUARD, rarity: CardRarity.RARE,
    cost: 3, description: "Gain 40 Block. Gain 2 Holy Shield.",
    block: 40, selfEffects: [{ id: StatusEffectId.HOLY_SHIELD, amount: 2 }], target: TargetType.SELF,
  }),
  card({
    id: "offering", name: "Offering", type: CardType.SPELL, rarity: CardRarity.RARE,
    cost: 0, description: "Lose 6 HP. Gain 2 Energy. Draw 3 cards.",
    special: "self_damage_6", energy: 2, draw: 3, target: TargetType.SELF, upgradeId: "offering+",
  }),
  card({
    id: "offering+", name: "Offering+", type: CardType.SPELL, rarity: CardRarity.RARE,
    cost: 0, description: "Lose 6 HP. Gain 2 Energy. Draw 5 cards.",
    special: "self_damage_6", energy: 2, draw: 5, target: TargetType.SELF,
  }),
  card({
    id: "demon_form", name: "Demon Form", type: CardType.SPELL, rarity: CardRarity.RARE,
    cost: 3, description: "At the start of each turn, gain 2 Strength. Purity -5.",
    selfEffects: [{ id: StatusEffectId.RITUAL, amount: 2 }],
    target: TargetType.SELF, purityChange: -5, upgradeId: "demon_form+",
  }),
  card({
    id: "demon_form+", name: "Demon Form+", type: CardType.SPELL, rarity: CardRarity.RARE,
    cost: 3, description: "At the start of each turn, gain 3 Strength. Purity -5.",
    selfEffects: [{ id: StatusEffectId.RITUAL, amount: 3 }],
    target: TargetType.SELF, purityChange: -5,
  }),
  card({
    id: "holy_light", name: "Holy Light", type: CardType.VIRTUE, rarity: CardRarity.RARE,
    cost: 2, description: "Deal 15 damage to ALL enemies. Heal 8 HP. Purity +8.",
    damage: 15, targetAll: true, target: TargetType.ALL_ENEMIES,
    special: "heal_8", purityChange: 8, upgradeId: "holy_light+",
  }),
  card({
    id: "holy_light+", name: "Holy Light+", type: CardType.VIRTUE, rarity: CardRarity.RARE,
    cost: 2, description: "Deal 20 damage to ALL enemies. Heal 12 HP. Purity +10.",
    damage: 20, targetAll: true, target: TargetType.ALL_ENEMIES,
    special: "heal_12", purityChange: 10,
  }),
  card({
    id: "dark_pact", name: "Dark Pact", type: CardType.SIN, rarity: CardRarity.RARE,
    cost: 0, description: "Gain 3 Energy. Add 2 Curse cards to your deck. Purity -8.",
    energy: 3, target: TargetType.SELF, special: "add_2_curses", purityChange: -8, exhaust: true,
    upgradeId: "dark_pact+",
  }),
  card({
    id: "dark_pact+", name: "Dark Pact+", type: CardType.SIN, rarity: CardRarity.RARE,
    cost: 0, description: "Gain 4 Energy. Add 2 Curse cards to your deck. Purity -8.",
    energy: 4, target: TargetType.SELF, special: "add_2_curses", purityChange: -8, exhaust: true,
  }),
  card({
    id: "companion_squire", name: "Summon Squire", type: CardType.COMPANION, rarity: CardRarity.RARE,
    cost: 2, description: "Summon a Squire. Each turn it deals 4 damage and grants 4 Block. Exhaust.",
    target: TargetType.SELF, special: "summon_squire", exhaust: true, upgradeId: "companion_squire+",
  }),
  card({
    id: "companion_squire+", name: "Summon Squire+", type: CardType.COMPANION, rarity: CardRarity.RARE,
    cost: 2, description: "Summon a Squire. Each turn it deals 6 damage and grants 6 Block. Exhaust.",
    target: TargetType.SELF, special: "summon_squire+", exhaust: true,
  }),
  card({
    id: "feed", name: "Feed", type: CardType.STRIKE, rarity: CardRarity.RARE,
    cost: 1, description: "Deal 10 damage. If this kills, gain 3 permanent Max HP.",
    damage: 10, special: "feed_kill", exhaust: true, upgradeId: "feed+",
  }),
  card({
    id: "feed+", name: "Feed+", type: CardType.STRIKE, rarity: CardRarity.RARE,
    cost: 1, description: "Deal 14 damage. If this kills, gain 4 permanent Max HP.",
    damage: 14, special: "feed_kill+", exhaust: true,
  }),
  card({
    id: "reaper", name: "Reaper", type: CardType.STRIKE, rarity: CardRarity.RARE,
    cost: 2, description: "Deal 4 damage to ALL enemies. Heal HP equal to unblocked damage.",
    damage: 4, targetAll: true, target: TargetType.ALL_ENEMIES, special: "reaper_heal",
    exhaust: true, upgradeId: "reaper+",
  }),
  card({
    id: "reaper+", name: "Reaper+", type: CardType.STRIKE, rarity: CardRarity.RARE,
    cost: 2, description: "Deal 8 damage to ALL enemies. Heal HP equal to unblocked damage.",
    damage: 8, targetAll: true, target: TargetType.ALL_ENEMIES, special: "reaper_heal",
    exhaust: true,
  }),
  card({
    id: "impervious", name: "Impervious", type: CardType.GUARD, rarity: CardRarity.RARE,
    cost: 2, description: "Gain 30 Block. Exhaust.", block: 30,
    target: TargetType.SELF, exhaust: true, upgradeId: "impervious+",
  }),
  card({
    id: "impervious+", name: "Impervious+", type: CardType.GUARD, rarity: CardRarity.RARE,
    cost: 2, description: "Gain 35 Block. Exhaust.", block: 35,
    target: TargetType.SELF, exhaust: true,
  }),
  card({
    id: "apotheosis", name: "Apotheosis", type: CardType.SPELL, rarity: CardRarity.RARE,
    cost: 2, description: "Upgrade ALL cards in your deck. Exhaust.", target: TargetType.SELF,
    special: "upgrade_all", exhaust: true, upgradeId: "apotheosis+",
  }),
  card({
    id: "apotheosis+", name: "Apotheosis+", type: CardType.SPELL, rarity: CardRarity.RARE,
    cost: 1, description: "Upgrade ALL cards in your deck. Exhaust.", target: TargetType.SELF,
    special: "upgrade_all", exhaust: true,
  }),
  card({
    id: "blasphemy", name: "Blasphemy", type: CardType.SIN, rarity: CardRarity.RARE,
    cost: 1, description: "Next turn, deal triple damage. At the end of next turn, die. Purity -10.",
    target: TargetType.SELF, special: "triple_then_die", purityChange: -10, exhaust: true,
    upgradeId: "blasphemy+",
  }),
  card({
    id: "blasphemy+", name: "Blasphemy+", type: CardType.SIN, rarity: CardRarity.RARE,
    cost: 0, description: "Next turn, deal triple damage. At the end of next turn, die. Purity -10.",
    target: TargetType.SELF, special: "triple_then_die", purityChange: -10, exhaust: true,
  }),
];

// ═══════════════════════════════════════════════════════════════════════════
// KNIGHT-SPECIFIC CARDS
// ═══════════════════════════════════════════════════════════════════════════

const KNIGHT_CARDS: CardDef[] = [
  // ── Lancelot ──
  card({
    id: "lancelot_flurry", name: "Flurry of Blows", type: CardType.STRIKE, rarity: CardRarity.STARTER,
    cost: 1, description: "Deal 4 damage 3 times.",
    damage: 4, hits: 3, knightOnly: KnightId.LANCELOT, upgradeId: "lancelot_flurry+",
  }),
  card({
    id: "lancelot_flurry+", name: "Flurry of Blows+", type: CardType.STRIKE, rarity: CardRarity.STARTER,
    cost: 1, description: "Deal 5 damage 3 times.",
    damage: 5, hits: 3, knightOnly: KnightId.LANCELOT,
  }),

  // ── Gawain ──
  card({
    id: "gawain_sunfire", name: "Sunfire", type: CardType.SPELL, rarity: CardRarity.STARTER,
    cost: 1, description: "Deal 8 damage. Gain 1 Strength.",
    damage: 8, selfEffects: [{ id: StatusEffectId.STRENGTH, amount: 1 }],
    knightOnly: KnightId.GAWAIN, upgradeId: "gawain_sunfire+",
  }),
  card({
    id: "gawain_sunfire+", name: "Sunfire+", type: CardType.SPELL, rarity: CardRarity.STARTER,
    cost: 1, description: "Deal 11 damage. Gain 1 Strength.",
    damage: 11, selfEffects: [{ id: StatusEffectId.STRENGTH, amount: 1 }],
    knightOnly: KnightId.GAWAIN,
  }),

  // ── Percival ──
  card({
    id: "percival_prayer", name: "Prayer", type: CardType.VIRTUE, rarity: CardRarity.STARTER,
    cost: 1, description: "Gain 6 Block. Heal 3 HP. Purity +2.",
    block: 6, special: "heal_3", purityChange: 2, target: TargetType.SELF,
    knightOnly: KnightId.PERCIVAL, upgradeId: "percival_prayer+",
  }),
  card({
    id: "percival_prayer+", name: "Prayer+", type: CardType.VIRTUE, rarity: CardRarity.STARTER,
    cost: 1, description: "Gain 9 Block. Heal 5 HP. Purity +3.",
    block: 9, special: "heal_5", purityChange: 3, target: TargetType.SELF,
    knightOnly: KnightId.PERCIVAL,
  }),

  // ── Morgause ──
  card({
    id: "morgause_hex", name: "Hex", type: CardType.SPELL, rarity: CardRarity.STARTER,
    cost: 1, description: "Deal 5 damage. Apply 3 Poison. Purity -1.",
    damage: 5, applyEffects: [{ id: StatusEffectId.POISON, amount: 3 }],
    purityChange: -1, knightOnly: KnightId.MORGAUSE, upgradeId: "morgause_hex+",
  }),
  card({
    id: "morgause_hex+", name: "Hex+", type: CardType.SPELL, rarity: CardRarity.STARTER,
    cost: 1, description: "Deal 7 damage. Apply 5 Poison. Purity -1.",
    damage: 7, applyEffects: [{ id: StatusEffectId.POISON, amount: 5 }],
    purityChange: -1, knightOnly: KnightId.MORGAUSE,
  }),

  // ── Tristan ──
  card({
    id: "tristan_envenom", name: "Envenom", type: CardType.SPELL, rarity: CardRarity.STARTER,
    cost: 1, description: "Apply 5 Poison.",
    applyEffects: [{ id: StatusEffectId.POISON, amount: 5 }],
    knightOnly: KnightId.TRISTAN, upgradeId: "tristan_envenom+",
  }),
  card({
    id: "tristan_envenom+", name: "Envenom+", type: CardType.SPELL, rarity: CardRarity.STARTER,
    cost: 1, description: "Apply 8 Poison.",
    applyEffects: [{ id: StatusEffectId.POISON, amount: 8 }],
    knightOnly: KnightId.TRISTAN,
  }),

  // ══════════════════════════════════════════════════════════════════════════
  // KNIGHT-EXCLUSIVE UNCOMMON CARDS
  // ══════════════════════════════════════════════════════════════════════════

  // ── Lancelot Uncommon ──
  card({
    id: "lancelot_riposte", name: "Riposte", type: CardType.STRIKE, rarity: CardRarity.UNCOMMON,
    cost: 1, description: "Deal 4 damage 4 times. If all hits deal unblocked damage, draw 2 cards.",
    damage: 4, hits: 4, special: "riposte_draw", knightOnly: KnightId.LANCELOT, upgradeId: "lancelot_riposte+",
  }),
  card({
    id: "lancelot_riposte+", name: "Riposte+", type: CardType.STRIKE, rarity: CardRarity.UNCOMMON,
    cost: 1, description: "Deal 7 damage 4 times. If all hits deal unblocked damage, draw 3 cards.",
    damage: 7, hits: 4, special: "riposte_draw", knightOnly: KnightId.LANCELOT,
  }),
  card({
    id: "lancelot_blade_dance", name: "Blade Dance", type: CardType.STRIKE, rarity: CardRarity.UNCOMMON,
    cost: 2, description: "Deal 6 damage to ALL enemies 2 times.",
    damage: 6, hits: 2, targetAll: true, target: TargetType.ALL_ENEMIES, knightOnly: KnightId.LANCELOT, upgradeId: "lancelot_blade_dance+",
  }),
  card({
    id: "lancelot_blade_dance+", name: "Blade Dance+", type: CardType.STRIKE, rarity: CardRarity.UNCOMMON,
    cost: 1, description: "Deal 6 damage to ALL enemies 2 times.",
    damage: 6, hits: 2, targetAll: true, target: TargetType.ALL_ENEMIES, knightOnly: KnightId.LANCELOT,
  }),
  card({
    id: "lancelot_focus", name: "Focus", type: CardType.SPELL, rarity: CardRarity.UNCOMMON,
    cost: 1, description: "Draw 3 cards. Gain 1 Strength.",
    draw: 3, selfEffects: [{ id: StatusEffectId.STRENGTH, amount: 1 }], target: TargetType.SELF,
    knightOnly: KnightId.LANCELOT, upgradeId: "lancelot_focus+",
  }),
  card({
    id: "lancelot_focus+", name: "Focus+", type: CardType.SPELL, rarity: CardRarity.UNCOMMON,
    cost: 1, description: "Draw 4 cards. Gain 2 Strength.",
    draw: 4, selfEffects: [{ id: StatusEffectId.STRENGTH, amount: 2 }], target: TargetType.SELF,
    knightOnly: KnightId.LANCELOT,
  }),

  // ── Lancelot Rare ──
  card({
    id: "lancelot_peerless_combo", name: "Peerless Combo", type: CardType.STRIKE, rarity: CardRarity.RARE,
    cost: 2, description: "Deal 3 damage 8 times to a random enemy. Draw 1 card for each kill.",
    damage: 3, hits: 8, target: TargetType.RANDOM_ENEMY, special: "combo_draw_kills",
    knightOnly: KnightId.LANCELOT, exhaust: true, upgradeId: "lancelot_peerless_combo+",
  }),
  card({
    id: "lancelot_peerless_combo+", name: "Peerless Combo+", type: CardType.STRIKE, rarity: CardRarity.RARE,
    cost: 1, description: "Deal 3 damage 8 times to a random enemy. Draw 1 card for each kill.",
    damage: 3, hits: 8, target: TargetType.RANDOM_ENEMY, special: "combo_draw_kills",
    knightOnly: KnightId.LANCELOT, exhaust: true,
  }),

  // ── Gawain Uncommon ──
  card({
    id: "gawain_solar_flare", name: "Solar Flare", type: CardType.STRIKE, rarity: CardRarity.UNCOMMON,
    cost: 2, description: "Deal 10 damage to ALL enemies. Gain 2 Strength.",
    damage: 10, targetAll: true, target: TargetType.ALL_ENEMIES,
    selfEffects: [{ id: StatusEffectId.STRENGTH, amount: 2 }],
    knightOnly: KnightId.GAWAIN, upgradeId: "gawain_solar_flare+",
  }),
  card({
    id: "gawain_solar_flare+", name: "Solar Flare+", type: CardType.STRIKE, rarity: CardRarity.UNCOMMON,
    cost: 2, description: "Deal 13 damage to ALL enemies. Gain 3 Strength.",
    damage: 13, targetAll: true, target: TargetType.ALL_ENEMIES,
    selfEffects: [{ id: StatusEffectId.STRENGTH, amount: 3 }],
    knightOnly: KnightId.GAWAIN,
  }),
  card({
    id: "gawain_endurance", name: "Endurance", type: CardType.GUARD, rarity: CardRarity.UNCOMMON,
    cost: 1, description: "Gain 10 Block. Gain 1 Strength.",
    block: 10, selfEffects: [{ id: StatusEffectId.STRENGTH, amount: 1 }], target: TargetType.SELF,
    knightOnly: KnightId.GAWAIN, upgradeId: "gawain_endurance+",
  }),
  card({
    id: "gawain_endurance+", name: "Endurance+", type: CardType.GUARD, rarity: CardRarity.UNCOMMON,
    cost: 1, description: "Gain 14 Block. Gain 2 Strength.",
    block: 14, selfEffects: [{ id: StatusEffectId.STRENGTH, amount: 2 }], target: TargetType.SELF,
    knightOnly: KnightId.GAWAIN,
  }),
  card({
    id: "gawain_midday_surge", name: "Midday Surge", type: CardType.SPELL, rarity: CardRarity.UNCOMMON,
    cost: 0, description: "Gain 3 Strength this turn only. Exhaust.",
    selfEffects: [{ id: StatusEffectId.STRENGTH, amount: 3 }], target: TargetType.SELF,
    knightOnly: KnightId.GAWAIN, exhaust: true, upgradeId: "gawain_midday_surge+",
  }),
  card({
    id: "gawain_midday_surge+", name: "Midday Surge+", type: CardType.SPELL, rarity: CardRarity.UNCOMMON,
    cost: 0, description: "Gain 4 Strength this turn only. Exhaust.",
    selfEffects: [{ id: StatusEffectId.STRENGTH, amount: 4 }], target: TargetType.SELF,
    knightOnly: KnightId.GAWAIN, exhaust: true,
  }),

  // ── Gawain Rare ──
  card({
    id: "gawain_supernova", name: "Supernova", type: CardType.STRIKE, rarity: CardRarity.RARE,
    cost: 3, description: "Deal damage equal to your Strength x8 to ALL enemies.",
    damage: 0, targetAll: true, target: TargetType.ALL_ENEMIES, special: "str_x8_all",
    knightOnly: KnightId.GAWAIN, exhaust: true, upgradeId: "gawain_supernova+",
  }),
  card({
    id: "gawain_supernova+", name: "Supernova+", type: CardType.STRIKE, rarity: CardRarity.RARE,
    cost: 2, description: "Deal damage equal to your Strength x8 to ALL enemies.",
    damage: 0, targetAll: true, target: TargetType.ALL_ENEMIES, special: "str_x8_all",
    knightOnly: KnightId.GAWAIN, exhaust: true,
  }),

  // ── Percival Uncommon ──
  card({
    id: "percival_steadfast", name: "Steadfast", type: CardType.GUARD, rarity: CardRarity.UNCOMMON,
    cost: 1, description: "Gain 12 Block. If you have 20+ Block, gain 1 Holy Shield.",
    block: 12, special: "block_threshold_shield", target: TargetType.SELF,
    knightOnly: KnightId.PERCIVAL, upgradeId: "percival_steadfast+",
  }),
  card({
    id: "percival_steadfast+", name: "Steadfast+", type: CardType.GUARD, rarity: CardRarity.UNCOMMON,
    cost: 1, description: "Gain 16 Block. If you have 20+ Block, gain 1 Holy Shield.",
    block: 16, special: "block_threshold_shield", target: TargetType.SELF,
    knightOnly: KnightId.PERCIVAL,
  }),
  card({
    id: "percival_absolution", name: "Absolution", type: CardType.VIRTUE, rarity: CardRarity.UNCOMMON,
    cost: 1, description: "Heal 4 HP. Gain 6 Block. Purity +4.",
    block: 6, special: "heal_4", purityChange: 4, target: TargetType.SELF,
    knightOnly: KnightId.PERCIVAL, upgradeId: "percival_absolution+",
  }),
  card({
    id: "percival_absolution+", name: "Absolution+", type: CardType.VIRTUE, rarity: CardRarity.UNCOMMON,
    cost: 1, description: "Heal 7 HP. Gain 10 Block. Purity +5.",
    block: 10, special: "heal_7", purityChange: 5, target: TargetType.SELF,
    knightOnly: KnightId.PERCIVAL,
  }),
  card({
    id: "percival_patience", name: "Patience", type: CardType.SPELL, rarity: CardRarity.UNCOMMON,
    cost: 0, description: "Draw 2 cards. Next turn, gain 4 Block.",
    draw: 2, selfEffects: [{ id: StatusEffectId.BLOCK_NEXT, amount: 4 }], target: TargetType.SELF,
    knightOnly: KnightId.PERCIVAL, upgradeId: "percival_patience+",
  }),
  card({
    id: "percival_patience+", name: "Patience+", type: CardType.SPELL, rarity: CardRarity.UNCOMMON,
    cost: 0, description: "Draw 3 cards. Next turn, gain 5 Block.",
    draw: 3, selfEffects: [{ id: StatusEffectId.BLOCK_NEXT, amount: 5 }], target: TargetType.SELF,
    knightOnly: KnightId.PERCIVAL,
  }),

  // ── Percival Rare ──
  card({
    id: "percival_grail_light", name: "Grail Light", type: CardType.VIRTUE, rarity: CardRarity.RARE,
    cost: 3, description: "Gain 40 Block. Heal 15 HP. Purity +10. Exhaust.",
    block: 40, special: "heal_15", purityChange: 10, target: TargetType.SELF,
    knightOnly: KnightId.PERCIVAL, exhaust: true, upgradeId: "percival_grail_light+",
  }),
  card({
    id: "percival_grail_light+", name: "Grail Light+", type: CardType.VIRTUE, rarity: CardRarity.RARE,
    cost: 2, description: "Gain 44 Block. Heal 18 HP. Purity +11. Exhaust.",
    block: 44, special: "heal_18", purityChange: 11, target: TargetType.SELF,
    knightOnly: KnightId.PERCIVAL, exhaust: true,
  }),

  // ── Morgause Uncommon ──
  card({
    id: "morgause_corruption", name: "Corruption", type: CardType.SPELL, rarity: CardRarity.UNCOMMON,
    cost: 1, description: "Deal 8 damage. Apply 4 Poison. Purity -2.",
    damage: 8, applyEffects: [{ id: StatusEffectId.POISON, amount: 4 }], purityChange: -2,
    knightOnly: KnightId.MORGAUSE, upgradeId: "morgause_corruption+",
  }),
  card({
    id: "morgause_corruption+", name: "Corruption+", type: CardType.SPELL, rarity: CardRarity.UNCOMMON,
    cost: 1, description: "Deal 11 damage. Apply 5 Poison. Purity -2.",
    damage: 11, applyEffects: [{ id: StatusEffectId.POISON, amount: 5 }], purityChange: -2,
    knightOnly: KnightId.MORGAUSE,
  }),
  card({
    id: "morgause_dark_gift", name: "Dark Gift", type: CardType.SIN, rarity: CardRarity.UNCOMMON,
    cost: 0, description: "Add a Curse to your deck. Gain 2 Energy. Draw 2 cards. Purity -3.",
    energy: 2, draw: 2, special: "add_random_curse", purityChange: -3, target: TargetType.SELF,
    knightOnly: KnightId.MORGAUSE, upgradeId: "morgause_dark_gift+",
  }),
  card({
    id: "morgause_dark_gift+", name: "Dark Gift+", type: CardType.SIN, rarity: CardRarity.UNCOMMON,
    cost: 0, description: "Add a Curse to your deck. Gain 3 Energy. Draw 3 cards. Purity -3.",
    energy: 3, draw: 3, special: "add_random_curse", purityChange: -3, target: TargetType.SELF,
    knightOnly: KnightId.MORGAUSE,
  }),
  card({
    id: "morgause_hex_ward", name: "Hex Ward", type: CardType.GUARD, rarity: CardRarity.UNCOMMON,
    cost: 1, description: "Gain 8 Block. Apply 2 Weak to ALL enemies.",
    block: 8, targetAll: true, target: TargetType.ALL_ENEMIES,
    applyEffects: [{ id: StatusEffectId.WEAK, amount: 2 }],
    knightOnly: KnightId.MORGAUSE, upgradeId: "morgause_hex_ward+",
  }),
  card({
    id: "morgause_hex_ward+", name: "Hex Ward+", type: CardType.GUARD, rarity: CardRarity.UNCOMMON,
    cost: 1, description: "Gain 12 Block. Apply 3 Weak to ALL enemies.",
    block: 12, targetAll: true, target: TargetType.ALL_ENEMIES,
    applyEffects: [{ id: StatusEffectId.WEAK, amount: 3 }],
    knightOnly: KnightId.MORGAUSE,
  }),

  // ── Morgause Rare ──
  card({
    id: "morgause_plague", name: "Plague", type: CardType.SPELL, rarity: CardRarity.RARE,
    cost: 2, description: "Apply 12 Poison to ALL enemies. For each Curse in your deck, apply 2 more Poison.",
    targetAll: true, target: TargetType.ALL_ENEMIES, special: "plague_curse_bonus",
    knightOnly: KnightId.MORGAUSE, exhaust: true, upgradeId: "morgause_plague+",
  }),
  card({
    id: "morgause_plague+", name: "Plague+", type: CardType.SPELL, rarity: CardRarity.RARE,
    cost: 1, description: "Apply 12 Poison to ALL enemies. For each Curse in your deck, apply 2 more Poison.",
    targetAll: true, target: TargetType.ALL_ENEMIES, special: "plague_curse_bonus",
    knightOnly: KnightId.MORGAUSE, exhaust: true,
  }),

  // ── Tristan Uncommon ──
  card({
    id: "tristan_toxic_blade", name: "Toxic Blade", type: CardType.STRIKE, rarity: CardRarity.UNCOMMON,
    cost: 1, description: "Deal 7 damage. Apply Poison equal to unblocked damage.",
    damage: 7, special: "poison_unblocked",
    knightOnly: KnightId.TRISTAN, upgradeId: "tristan_toxic_blade+",
  }),
  card({
    id: "tristan_toxic_blade+", name: "Toxic Blade+", type: CardType.STRIKE, rarity: CardRarity.UNCOMMON,
    cost: 1, description: "Deal 10 damage. Apply Poison equal to unblocked damage.",
    damage: 10, special: "poison_unblocked",
    knightOnly: KnightId.TRISTAN,
  }),
  card({
    id: "tristan_catalyst", name: "Catalyst", type: CardType.SPELL, rarity: CardRarity.UNCOMMON,
    cost: 1, description: "Double the Poison on an enemy.",
    special: "double_poison",
    knightOnly: KnightId.TRISTAN, upgradeId: "tristan_catalyst+",
  }),
  card({
    id: "tristan_catalyst+", name: "Catalyst+", type: CardType.SPELL, rarity: CardRarity.UNCOMMON,
    cost: 0, description: "Double the Poison on an enemy.",
    special: "double_poison",
    knightOnly: KnightId.TRISTAN,
  }),
  card({
    id: "tristan_endure", name: "Endure", type: CardType.GUARD, rarity: CardRarity.UNCOMMON,
    cost: 1, description: "Lose 4 HP. Gain 12 Block. Apply 4 Poison to ALL enemies.",
    block: 12, special: "self_damage_4_poison_all_4", target: TargetType.SELF,
    knightOnly: KnightId.TRISTAN, upgradeId: "tristan_endure+",
  }),
  card({
    id: "tristan_endure+", name: "Endure+", type: CardType.GUARD, rarity: CardRarity.UNCOMMON,
    cost: 1, description: "Lose 4 HP. Gain 16 Block. Apply 5 Poison to ALL enemies.",
    block: 16, special: "self_damage_4_poison_all_5", target: TargetType.SELF,
    knightOnly: KnightId.TRISTAN,
  }),

  // ── Tristan Rare ──
  card({
    id: "tristan_blight", name: "Blight", type: CardType.SPELL, rarity: CardRarity.RARE,
    cost: 3, description: "ALL enemies lose HP equal to their Poison amount. Exhaust.",
    special: "blight_detonate", targetAll: true, target: TargetType.ALL_ENEMIES,
    knightOnly: KnightId.TRISTAN, exhaust: true, upgradeId: "tristan_blight+",
  }),
  card({
    id: "tristan_blight+", name: "Blight+", type: CardType.SPELL, rarity: CardRarity.RARE,
    cost: 2, description: "ALL enemies lose HP equal to their Poison amount. Exhaust.",
    special: "blight_detonate", targetAll: true, target: TargetType.ALL_ENEMIES,
    knightOnly: KnightId.TRISTAN, exhaust: true,
  }),
];

// ═══════════════════════════════════════════════════════════════════════════
// CURSE / STATUS CARDS
// ═══════════════════════════════════════════════════════════════════════════

const CURSE_CARDS: CardDef[] = [
  card({
    id: "curse_doubt", name: "Doubt", type: CardType.CURSE, rarity: CardRarity.CURSE,
    cost: -1, description: "Unplayable. At end of turn, gain 1 Weak.",
    target: TargetType.NONE, unremovable: false, special: "curse_weak",
  }),
  card({
    id: "curse_regret", name: "Regret", type: CardType.CURSE, rarity: CardRarity.CURSE,
    cost: -1, description: "Unplayable. At end of turn, lose HP equal to cards in hand.",
    target: TargetType.NONE, special: "curse_regret",
  }),
  card({
    id: "curse_decay", name: "Decay", type: CardType.CURSE, rarity: CardRarity.CURSE,
    cost: -1, description: "Unplayable. At end of turn, take 2 damage.",
    target: TargetType.NONE, special: "curse_decay",
  }),
  card({
    id: "curse_pain", name: "Pain", type: CardType.CURSE, rarity: CardRarity.CURSE,
    cost: -1, description: "Unplayable. Whenever you play a card, take 1 damage.",
    target: TargetType.NONE, special: "curse_pain",
  }),
  card({
    id: "status_wound", name: "Wound", type: CardType.STATUS, rarity: CardRarity.CURSE,
    cost: -1, description: "Unplayable.", target: TargetType.NONE,
  }),
  card({
    id: "status_dazed", name: "Dazed", type: CardType.STATUS, rarity: CardRarity.CURSE,
    cost: -1, description: "Unplayable. Ethereal.", target: TargetType.NONE, ethereal: true,
  }),
  card({
    id: "status_burn", name: "Burn", type: CardType.STATUS, rarity: CardRarity.CURSE,
    cost: -1, description: "Unplayable. At end of turn, take 2 damage.",
    target: TargetType.NONE, special: "curse_decay",
  }),
];

// ═══════════════════════════════════════════════════════════════════════════
// CARD REGISTRY
// ═══════════════════════════════════════════════════════════════════════════

const ALL_CARDS_ARRAY: CardDef[] = [
  ...STARTER_CARDS,
  ...COMMON_STRIKES,
  ...COMMON_GUARDS,
  ...COMMON_SPELLS,
  ...UNCOMMON_CARDS,
  ...RARE_CARDS,
  ...KNIGHT_CARDS,
  ...CURSE_CARDS,
];

export const CARD_REGISTRY: Map<string, CardDef> = new Map();
for (const c of ALL_CARDS_ARRAY) {
  CARD_REGISTRY.set(c.id, c);
}

/** Get card def by id. Throws if not found. */
export function getCardDef(id: string): CardDef {
  const def = CARD_REGISTRY.get(id);
  if (!def) throw new Error(`Unknown card: ${id}`);
  return def;
}

/** Get all non-starter, non-curse, non-upgrade cards for a given rarity. */
export function getRewardPool(rarity: CardRarity, knightId?: string): CardDef[] {
  const pool: CardDef[] = [];
  for (const c of ALL_CARDS_ARRAY) {
    if (c.rarity !== rarity) continue;
    if (c.id.endsWith("+")) continue; // skip upgrades
    if (c.type === CardType.CURSE || c.type === CardType.STATUS) continue;
    if (c.knightOnly && c.knightOnly !== knightId) continue;
    pool.push(c);
  }
  return pool;
}
