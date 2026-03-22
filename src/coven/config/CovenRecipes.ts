// ---------------------------------------------------------------------------
// Coven mode — ingredient & recipe definitions
// ---------------------------------------------------------------------------

import type { IngredientId, PotionId, SpellId, CovenTerrain } from "../state/CovenState";

export interface IngredientDef {
  id: IngredientId;
  name: string;
  terrains: CovenTerrain[];
  rarity: number; // 0-1, lower = rarer
  nightOnly: boolean;
  description: string;
  color: number;
}

export interface PotionRecipe {
  id: PotionId;
  name: string;
  ingredients: { id: IngredientId; count: number }[];
  manaCost: number;
  description: string;
  effect: string;
  color: number;
}

export interface SpellDef {
  id: SpellId;
  name: string;
  manaCost: number;
  damage: number;
  range: number;
  effect: string;
  description: string;
  color: number;
}

// ---------------------------------------------------------------------------
// Ingredients
// ---------------------------------------------------------------------------

export const INGREDIENTS: IngredientDef[] = [
  { id: "nightshade", name: "Nightshade", terrains: ["deep_woods", "clearing"], rarity: 0.5, nightOnly: false, description: "Dark berries with potent properties", color: 0x6a2a8a },
  { id: "foxglove", name: "Foxglove", terrains: ["clearing", "village"], rarity: 0.6, nightOnly: false, description: "Purple bell-shaped flowers", color: 0xaa66cc },
  { id: "hemlock", name: "Hemlock", terrains: ["swamp", "deep_woods"], rarity: 0.5, nightOnly: false, description: "Deadly white-flowered herb", color: 0xccddcc },
  { id: "mugwort", name: "Mugwort", terrains: ["clearing", "deep_woods", "village"], rarity: 0.7, nightOnly: false, description: "Common aromatic herb", color: 0x88aa66 },
  { id: "deathcap", name: "Deathcap", terrains: ["deep_woods", "graveyard"], rarity: 0.3, nightOnly: false, description: "Pale lethal mushroom", color: 0xddddaa },
  { id: "ghostshroom", name: "Ghostshroom", terrains: ["cave", "graveyard"], rarity: 0.2, nightOnly: true, description: "Glows faintly in darkness", color: 0x88ffcc },
  { id: "moonstone", name: "Moonstone", terrains: ["ley_line", "cave"], rarity: 0.15, nightOnly: true, description: "Crystal that drinks moonlight", color: 0xccddff },
  { id: "iron_filings", name: "Iron Filings", terrains: ["ruins", "village"], rarity: 0.4, nightOnly: false, description: "Metallic dust for wards", color: 0xaaaaaa },
  { id: "sulfur", name: "Sulfur", terrains: ["cave", "swamp"], rarity: 0.35, nightOnly: false, description: "Yellow brimstone crystals", color: 0xdddd44 },
  { id: "silver_dust", name: "Silver Dust", terrains: ["ruins", "ley_line", "graveyard", "cave"], rarity: 0.18, nightOnly: false, description: "Purified silver powder", color: 0xddddee },
  { id: "crow_feather", name: "Crow Feather", terrains: ["clearing", "graveyard", "deep_woods"], rarity: 0.5, nightOnly: false, description: "Black iridescent feather", color: 0x222233 },
  { id: "bat_wing", name: "Bat Wing", terrains: ["cave", "ruins"], rarity: 0.3, nightOnly: true, description: "Leathery membrane", color: 0x4a3a2a },
  { id: "spider_silk", name: "Spider Silk", terrains: ["deep_woods", "cave", "ruins"], rarity: 0.4, nightOnly: false, description: "Impossibly strong thread", color: 0xdddddd },
  { id: "snake_venom", name: "Snake Venom", terrains: ["swamp", "clearing"], rarity: 0.25, nightOnly: false, description: "Extracted carefully", color: 0x88cc44 },
  { id: "grave_dust", name: "Grave Dust", terrains: ["graveyard"], rarity: 0.5, nightOnly: false, description: "Dust from consecrated ground", color: 0x887766 },
  { id: "marsh_reed", name: "Marsh Reed", terrains: ["swamp"], rarity: 0.7, nightOnly: false, description: "Tall waterside grass", color: 0x6a8a4a },
  { id: "fairy_cap", name: "Fairy Cap", terrains: ["clearing", "ley_line"], rarity: 0.2, nightOnly: true, description: "Tiny luminous mushroom", color: 0xffaadd },
  { id: "wolf_pelt", name: "Wolf Pelt", terrains: [], rarity: 0, nightOnly: false, description: "From a slain wolf", color: 0x888877 },
  { id: "wraith_dust", name: "Wraith Dust", terrains: [], rarity: 0, nightOnly: false, description: "Essence of the departed", color: 0xaabbcc },
  { id: "shadow_essence", name: "Shadow Essence", terrains: [], rarity: 0, nightOnly: false, description: "Condensed darkness", color: 0x333344 },
  { id: "dragon_scale", name: "Dragon Scale", terrains: [], rarity: 0, nightOnly: false, description: "Ancient and fire-proof", color: 0xcc4422 },
  { id: "ley_crystal", name: "Ley Crystal", terrains: ["ley_line"], rarity: 0.05, nightOnly: true, description: "Raw magical energy crystallized", color: 0x8888ff },
  { id: "ancient_bone", name: "Ancient Bone", terrains: ["graveyard", "ruins"], rarity: 0.15, nightOnly: false, description: "Bone from a forgotten age", color: 0xccbbaa },
  { id: "star_fragment", name: "Star Fragment", terrains: ["ley_line"], rarity: 0.03, nightOnly: true, description: "Fallen from the sky", color: 0xffffff },
];

export function getIngredientDef(id: IngredientId): IngredientDef | undefined {
  return INGREDIENTS.find((i) => i.id === id);
}

// ---------------------------------------------------------------------------
// Potions
// ---------------------------------------------------------------------------

export const POTION_RECIPES: PotionRecipe[] = [
  { id: "healing_draught", name: "Healing Draught", ingredients: [{ id: "mugwort", count: 2 }, { id: "foxglove", count: 1 }], manaCost: 5, description: "Restores 30 health", effect: "heal_30", color: 0x44aa44 },
  { id: "mana_elixir", name: "Mana Elixir", ingredients: [{ id: "moonstone", count: 1 }, { id: "fairy_cap", count: 1 }], manaCost: 0, description: "Restores 25 mana", effect: "mana_25", color: 0x4488ff },
  { id: "shadow_cloak", name: "Shadow Cloak", ingredients: [{ id: "nightshade", count: 2 }, { id: "bat_wing", count: 1 }], manaCost: 10, description: "Invisible for 1 turn", effect: "invisible", color: 0x333355 },
  { id: "beast_bane", name: "Beast Bane", ingredients: [{ id: "hemlock", count: 1 }, { id: "snake_venom", count: 1 }], manaCost: 5, description: "Double damage to creatures", effect: "beast_damage", color: 0xcc4444 },
  { id: "ward_essence", name: "Ward Essence", ingredients: [{ id: "iron_filings", count: 1 }, { id: "silver_dust", count: 1 }, { id: "mugwort", count: 1 }], manaCost: 10, description: "Create a protective ward", effect: "ward", color: 0xddddff },
  { id: "night_sight", name: "Night Sight", ingredients: [{ id: "ghostshroom", count: 1 }, { id: "bat_wing", count: 1 }], manaCost: 5, description: "See in darkness (3 hex range)", effect: "vision", color: 0x88aacc },
  { id: "liquid_fire", name: "Liquid Fire", ingredients: [{ id: "sulfur", count: 2 }, { id: "dragon_scale", count: 1 }], manaCost: 15, description: "Thrown fire bomb (AoE damage)", effect: "fire_aoe", color: 0xff6600 },
  { id: "paralysis_toxin", name: "Paralysis Toxin", ingredients: [{ id: "deathcap", count: 1 }, { id: "spider_silk", count: 1 }], manaCost: 8, description: "Immobilize a creature", effect: "paralyze", color: 0xaacc44 },
  { id: "familiar_cat", name: "Summon Cat", ingredients: [{ id: "nightshade", count: 1 }, { id: "crow_feather", count: 2 }], manaCost: 15, description: "Summon a cat familiar (detects enemies)", effect: "summon_cat", color: 0x44aa44 },
  { id: "familiar_owl", name: "Summon Owl", ingredients: [{ id: "bat_wing", count: 2 }, { id: "fairy_cap", count: 1 }], manaCost: 15, description: "Summon an owl familiar (+1 vision range)", effect: "summon_owl", color: 0x88aa66 },
  { id: "familiar_raven", name: "Summon Raven", ingredients: [{ id: "crow_feather", count: 3 }, { id: "shadow_essence", count: 1 }], manaCost: 20, description: "Summon a raven familiar (scouts ahead)", effect: "summon_raven", color: 0x222244 },
  { id: "familiar_toad", name: "Summon Toad", ingredients: [{ id: "marsh_reed", count: 2 }, { id: "snake_venom", count: 1 }], manaCost: 10, description: "Summon a toad familiar (finds rare ingredients)", effect: "summon_toad", color: 0x44884a },
];

// ---------------------------------------------------------------------------
// Spells
// ---------------------------------------------------------------------------

export const SPELL_DEFS: SpellDef[] = [
  { id: "thorn_hex", name: "Thorn Hex", manaCost: 8, damage: 0, range: 2, effect: "Places thorns on a hex (10 damage to anyone entering)", description: "Lay a trap of magical thorns", color: 0x44aa44 },
  { id: "sleep_fog", name: "Sleep Fog", manaCost: 12, damage: 0, range: 2, effect: "Stuns all creatures in 1 hex for 1 turn", description: "Release a cloud of soporific mist", color: 0x8888cc },
  { id: "bewilderment", name: "Bewilderment", manaCost: 10, damage: 0, range: 3, effect: "Inquisitors in area lose your trail", description: "Confuse the minds of pursuers", color: 0xcc88ff },
  { id: "fire_bolt", name: "Fire Bolt", manaCost: 6, damage: 25, range: 2, effect: "Direct fire damage", description: "Hurl a bolt of flame", color: 0xff4400 },
  { id: "shadow_bolt", name: "Shadow Bolt", manaCost: 10, damage: 35, range: 3, effect: "Dark energy that drains life", description: "Project a lance of shadow", color: 0x6644aa },
  { id: "drain_life", name: "Drain Life", manaCost: 15, damage: 20, range: 1, effect: "Deals damage and heals you for the same amount", description: "Steal the life force of an enemy", color: 0x884488 },
  { id: "banishment", name: "Banishment", manaCost: 25, damage: 50, range: 2, effect: "Massive damage to undead/wraiths", description: "Send the unquiet dead back to their rest", color: 0xffffaa },
];

export function getSpellDef(id: SpellId): SpellDef | undefined {
  return SPELL_DEFS.find((s) => s.id === id);
}
