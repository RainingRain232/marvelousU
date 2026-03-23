// ---------------------------------------------------------------------------
// Round Table – Relic Definitions
// ---------------------------------------------------------------------------

import { RelicDef, RelicRarity } from "../types";

export const RELIC_DEFS: RelicDef[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // COMMON RELICS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "excalibur_shard", name: "Excalibur Shard",
    description: "The first attack each combat deals +5 damage.",
    rarity: RelicRarity.COMMON, hook: "on_combat_start", knightOnly: null,
  },
  {
    id: "ladys_favour", name: "Lady's Favour",
    description: "Heal 3 HP after each combat.",
    rarity: RelicRarity.COMMON, hook: "on_combat_end", knightOnly: null,
  },
  {
    id: "merlins_hourglass", name: "Merlin's Hourglass",
    description: "Draw 1 extra card on turn 1 of each combat.",
    rarity: RelicRarity.COMMON, hook: "on_combat_start", knightOnly: null,
  },
  {
    id: "iron_ring", name: "Iron Ring",
    description: "Start each combat with 4 Block.",
    rarity: RelicRarity.COMMON, hook: "on_combat_start", knightOnly: null,
  },
  {
    id: "prayer_beads", name: "Prayer Beads",
    description: "Gain 1 Purity after each combat.",
    rarity: RelicRarity.COMMON, hook: "on_combat_end", knightOnly: null,
  },
  {
    id: "war_horn", name: "War Horn",
    description: "At the start of your 2nd turn each combat, gain 1 Energy.",
    rarity: RelicRarity.COMMON, hook: "on_turn_start", knightOnly: null,
  },
  {
    id: "bag_of_marbles", name: "Bag of Marbles",
    description: "At the start of each combat, apply 1 Vulnerable to ALL enemies.",
    rarity: RelicRarity.COMMON, hook: "on_combat_start", knightOnly: null,
  },
  {
    id: "ancient_coin", name: "Ancient Coin",
    description: "Gain 15 Gold when entering a new floor.",
    rarity: RelicRarity.COMMON, hook: "passive", knightOnly: null,
  },
  {
    id: "blood_vial", name: "Blood Vial",
    description: "At the start of each combat, heal 2 HP.",
    rarity: RelicRarity.COMMON, hook: "on_combat_start", knightOnly: null,
  },
  {
    id: "bronze_scales", name: "Bronze Scales",
    description: "Whenever you take attack damage, deal 3 damage back.",
    rarity: RelicRarity.COMMON, hook: "on_take_damage", knightOnly: null,
  },
  {
    id: "orichalcum", name: "Orichalcum",
    description: "If you end your turn with 0 Block, gain 6 Block.",
    rarity: RelicRarity.COMMON, hook: "on_turn_end", knightOnly: null,
  },
  {
    id: "lantern", name: "Lantern",
    description: "Gain 1 Energy on the first turn of each combat.",
    rarity: RelicRarity.COMMON, hook: "on_combat_start", knightOnly: null,
  },
  {
    id: "happy_flower", name: "Happy Flower",
    description: "Every 3 turns, gain 1 Energy.",
    rarity: RelicRarity.COMMON, hook: "on_turn_start", knightOnly: null,
  },
  {
    id: "dream_catcher", name: "Dream Catcher",
    description: "Whenever you Rest, add a random card to your deck.",
    rarity: RelicRarity.COMMON, hook: "on_rest", knightOnly: null,
  },
  {
    id: "nunchaku", name: "Nunchaku",
    description: "Every time you play 10 attacks, gain 1 Energy.",
    rarity: RelicRarity.COMMON, hook: "on_card_play", knightOnly: null,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // UNCOMMON RELICS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "siege_perilous", name: "Siege Perilous Splinter",
    description: "On the turn you take damage, cards cost 1 less Energy.",
    rarity: RelicRarity.UNCOMMON, hook: "on_take_damage", knightOnly: null,
  },
  {
    id: "mordreds_whisper", name: "Mordred's Whisper",
    description: "Sin cards cost 0 Energy, but add a random Curse to your deck each combat.",
    rarity: RelicRarity.UNCOMMON, hook: "on_card_play", knightOnly: null,
  },
  {
    id: "pen_nib", name: "Pen Nib",
    description: "Every 10th attack deals double damage.",
    rarity: RelicRarity.UNCOMMON, hook: "on_attack", knightOnly: null,
  },
  {
    id: "ornamental_fan", name: "Ornamental Fan",
    description: "Every time you play 3 attacks in a single turn, gain 4 Block.",
    rarity: RelicRarity.UNCOMMON, hook: "on_card_play", knightOnly: null,
  },
  {
    id: "letter_opener", name: "Letter Opener",
    description: "Every time you play 3 non-attack cards in a turn, deal 5 damage to ALL enemies.",
    rarity: RelicRarity.UNCOMMON, hook: "on_card_play", knightOnly: null,
  },
  {
    id: "sundial", name: "Sundial",
    description: "Every 3 shuffles, gain 2 Energy.",
    rarity: RelicRarity.UNCOMMON, hook: "passive", knightOnly: null,
  },
  {
    id: "kunai", name: "Kunai",
    description: "Every 3rd attack played in a turn: +1 Dexterity.",
    rarity: RelicRarity.UNCOMMON, hook: "on_card_play", knightOnly: null,
  },
  {
    id: "shuriken", name: "Shuriken",
    description: "Every 3rd attack played in a turn: +1 Strength.",
    rarity: RelicRarity.UNCOMMON, hook: "on_card_play", knightOnly: null,
  },
  {
    id: "meat_on_bone", name: "Meat on the Bone",
    description: "If HP is below 50% at end of combat, heal 12 HP.",
    rarity: RelicRarity.UNCOMMON, hook: "on_combat_end", knightOnly: null,
  },
  {
    id: "question_mark", name: "Question Card",
    description: "At the start of each turn, draw 1 extra card.",
    rarity: RelicRarity.UNCOMMON, hook: "on_turn_start", knightOnly: null,
  },
  {
    id: "mercury_hourglass", name: "Mercury Hourglass",
    description: "At the start of your turn, deal 3 damage to ALL enemies.",
    rarity: RelicRarity.UNCOMMON, hook: "on_turn_start", knightOnly: null,
  },
  {
    id: "mummified_hand", name: "Mummified Hand",
    description: "Whenever you play a Spell, a random card in hand costs 0 this turn.",
    rarity: RelicRarity.UNCOMMON, hook: "on_card_play", knightOnly: null,
  },
  {
    id: "horn_cleat", name: "Horn Cleat",
    description: "At the start of your 2nd turn, gain 14 Block.",
    rarity: RelicRarity.UNCOMMON, hook: "on_turn_start", knightOnly: null,
  },
  {
    id: "singing_bowl", name: "Singing Bowl",
    description: "When adding a card to your deck, gain 2 Max HP instead (option shown in reward screen).",
    rarity: RelicRarity.UNCOMMON, hook: "passive", knightOnly: null,
  },
  {
    id: "darkstone_periapt", name: "Darkstone Periapt",
    description: "Whenever you obtain a Curse, gain 6 Max HP.",
    rarity: RelicRarity.UNCOMMON, hook: "passive", knightOnly: null,
  },
  {
    id: "purity_pendant", name: "Purity Pendant",
    description: "Purity changes are doubled (both positive and negative).",
    rarity: RelicRarity.UNCOMMON, hook: "passive", knightOnly: null,
  },
  {
    id: "centennial_puzzle", name: "Centennial Puzzle",
    description: "Whenever you lose HP from an attack, draw 3 cards.",
    rarity: RelicRarity.UNCOMMON, hook: "on_take_damage", knightOnly: null,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // RARE RELICS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "grail_fragment", name: "Holy Chalice Fragment",
    description: "Virtue cards trigger their effects twice. Only found in Act 3.",
    rarity: RelicRarity.RARE, hook: "on_card_play", knightOnly: null,
  },
  {
    id: "dead_branch", name: "Dead Branch",
    description: "Whenever you Exhaust a card, add a random card to your hand.",
    rarity: RelicRarity.RARE, hook: "on_card_play", knightOnly: null,
  },
  {
    id: "tungsten_rod", name: "Tungsten Rod",
    description: "Whenever you lose HP, lose 1 less.",
    rarity: RelicRarity.RARE, hook: "on_take_damage", knightOnly: null,
  },
  {
    id: "bird_faced_urn", name: "Bird-Faced Urn",
    description: "Whenever you play a Spell card, heal 2 HP.",
    rarity: RelicRarity.RARE, hook: "on_card_play", knightOnly: null,
  },
  {
    id: "snecko_eye", name: "Snecko Eye",
    description: "Draw 2 extra cards each turn. All card costs are randomized (0-3).",
    rarity: RelicRarity.RARE, hook: "on_turn_start", knightOnly: null,
  },
  {
    id: "du_vu_doll", name: "Du-Vu Doll",
    description: "For each Curse in your deck, start each combat with 1 Strength.",
    rarity: RelicRarity.RARE, hook: "on_combat_start", knightOnly: null,
  },
  {
    id: "incense_burner", name: "Incense Burner",
    description: "Every 6 turns, gain 1 Intangible (take only 1 damage per hit next turn).",
    rarity: RelicRarity.RARE, hook: "on_turn_start", knightOnly: null,
  },
  {
    id: "unceasing_top", name: "Unceasing Top",
    description: "Whenever you have no cards in hand during your turn, draw a card.",
    rarity: RelicRarity.RARE, hook: "passive", knightOnly: null,
  },
  {
    id: "stone_calendar", name: "Stone Calendar",
    description: "At the end of turn 7, deal 52 damage to ALL enemies.",
    rarity: RelicRarity.RARE, hook: "on_turn_end", knightOnly: null,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // BOSS RELICS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "black_star", name: "Black Star",
    description: "Elites drop 2 relics instead of 1.",
    rarity: RelicRarity.BOSS, hook: "passive", knightOnly: null,
  },
  {
    id: "cursed_key", name: "Cursed Key",
    description: "Gain 1 Energy each turn. Opening chests adds a Curse.",
    rarity: RelicRarity.BOSS, hook: "on_turn_start", knightOnly: null,
  },
  {
    id: "philosophers_stone", name: "Philosopher's Stone",
    description: "Gain 1 Energy each turn. ALL enemies start with 1 Strength.",
    rarity: RelicRarity.BOSS, hook: "on_combat_start", knightOnly: null,
  },
  {
    id: "velvet_choker", name: "Velvet Choker",
    description: "Gain 1 Energy each turn. Cannot play more than 6 cards per turn.",
    rarity: RelicRarity.BOSS, hook: "on_card_play", knightOnly: null,
  },
  {
    id: "runic_dome", name: "Runic Dome",
    description: "Gain 1 Energy each turn. You can no longer see enemy Intents.",
    rarity: RelicRarity.BOSS, hook: "passive", knightOnly: null,
  },
  {
    id: "ectoplasm", name: "Ectoplasm",
    description: "Gain 1 Energy each turn. You can no longer gain Gold.",
    rarity: RelicRarity.BOSS, hook: "passive", knightOnly: null,
  },
  {
    id: "astrolabe", name: "Astrolabe",
    description: "Gain 1 Energy. Upon pickup, upgrade 3 random cards.",
    rarity: RelicRarity.BOSS, hook: "on_combat_start", knightOnly: null,
  },
  {
    id: "sozu", name: "Sozu",
    description: "Gain 1 Energy. You can no longer obtain potions.",
    rarity: RelicRarity.BOSS, hook: "passive", knightOnly: null,
  },
  {
    id: "coffee_dripper", name: "Coffee Dripper",
    description: "Gain 1 Energy. You can no longer Rest at rest sites.",
    rarity: RelicRarity.BOSS, hook: "passive", knightOnly: null,
  },
];

export const RELIC_MAP: Map<string, RelicDef> = new Map();
for (const r of RELIC_DEFS) RELIC_MAP.set(r.id, r);

export function getRelicDef(id: string): RelicDef {
  const def = RELIC_MAP.get(id);
  if (!def) throw new Error(`Unknown relic: ${id}`);
  return def;
}

export function getRelicPool(rarity: RelicRarity): RelicDef[] {
  return RELIC_DEFS.filter(r => r.rarity === rarity);
}
