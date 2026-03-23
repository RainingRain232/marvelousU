// ---------------------------------------------------------------------------
// Alchemist mode — balance & configuration
// ---------------------------------------------------------------------------

export type IngredientType = "fire" | "water" | "earth" | "air" | "shadow" | "light" | "crystal" | "herb";

export interface IngredientDef {
  id: IngredientType;
  name: string;
  color: number;
  symbol: string;
}

export const INGREDIENTS: Record<IngredientType, IngredientDef> = {
  fire:    { id: "fire",    name: "Fire Essence",   color: 0xff4422, symbol: "\u{1F525}" },
  water:   { id: "water",   name: "Water Drop",     color: 0x2266ff, symbol: "\u{1F4A7}" },
  earth:   { id: "earth",   name: "Earth Root",     color: 0x886622, symbol: "\u{1F33F}" },
  air:     { id: "air",     name: "Wind Wisp",      color: 0xaaddff, symbol: "\u{1F4A8}" },
  shadow:  { id: "shadow",  name: "Shadow Essence",  color: 0x6622aa, symbol: "\u{1F311}" },
  light:   { id: "light",   name: "Light Shard",    color: 0xffdd44, symbol: "\u2728" },
  crystal: { id: "crystal", name: "Crystal Dust",   color: 0x44dddd, symbol: "\u{1F48E}" },
  herb:    { id: "herb",    name: "Rare Herb",      color: 0x44aa44, symbol: "\u{1F33F}" },
};

export const ALL_INGREDIENTS: IngredientType[] = ["fire", "water", "earth", "air", "shadow", "light"];
export const RARE_INGREDIENTS: IngredientType[] = ["crystal", "herb"];

export interface RecipeDef {
  id: string;
  name: string;
  desc: string;
  ingredients: [IngredientType, number][]; // [type, count needed]
  value: number;
  color: number;
  tier: number;
}

export const RECIPES: RecipeDef[] = [
  // Tier 1 — Simple (2 ingredients)
  { id: "healing_potion", name: "Healing Potion", desc: "Restores health", ingredients: [["herb", 3]], value: 10, color: 0xff4444, tier: 1 },
  { id: "fire_flask", name: "Fire Flask", desc: "Burns enemies", ingredients: [["fire", 3]], value: 12, color: 0xff6622, tier: 1 },
  { id: "ice_vial", name: "Ice Vial", desc: "Freezes on contact", ingredients: [["water", 3]], value: 12, color: 0x44aaff, tier: 1 },
  { id: "smoke_bomb", name: "Smoke Bomb", desc: "Obscures vision", ingredients: [["air", 3]], value: 10, color: 0xaaaacc, tier: 1 },
  // Tier 2 — Compound (2 types)
  { id: "lightning_oil", name: "Lightning Oil", desc: "Electrifies weapons", ingredients: [["fire", 2], ["air", 2]], value: 25, color: 0xffff44, tier: 2 },
  { id: "poison_draught", name: "Poison Draught", desc: "Deadly toxin", ingredients: [["shadow", 2], ["herb", 2]], value: 28, color: 0x66aa22, tier: 2 },
  { id: "stone_skin", name: "Stone Skin Elixir", desc: "Hardens flesh", ingredients: [["earth", 2], ["crystal", 2]], value: 30, color: 0xaa8844, tier: 2 },
  { id: "purification", name: "Purification Draught", desc: "Cleanses curses", ingredients: [["light", 2], ["water", 2]], value: 26, color: 0xffffff, tier: 2 },
  // Tier 3 — Complex (3 types)
  { id: "philosophers_stone", name: "Philosopher's Stone", desc: "Legendary transmutation", ingredients: [["fire", 3], ["earth", 3], ["crystal", 3]], value: 80, color: 0xffd700, tier: 3 },
  { id: "invisibility", name: "Invisibility Potion", desc: "Vanish from sight", ingredients: [["shadow", 3], ["air", 2], ["crystal", 2]], value: 60, color: 0x6644cc, tier: 3 },
  { id: "elixir_of_life", name: "Elixir of Life", desc: "Grants immortality", ingredients: [["light", 3], ["herb", 3], ["water", 2]], value: 70, color: 0x44ff88, tier: 3 },
];

export const AlchemistConfig = {
  GRID_COLS: 8,
  GRID_ROWS: 8,
  TILE_SIZE: 48,
  MATCH_MIN: 3,

  // Timing
  SWAP_DURATION: 150, // ms
  FALL_SPEED: 600, // pixels/sec
  MATCH_FLASH_DURATION: 300, // ms

  // Customer system
  CUSTOMER_INTERVAL: 15, // seconds between new customers
  MAX_CUSTOMERS: 3,
  CUSTOMER_PATIENCE: 60, // seconds before they leave

  // Economy
  STARTING_GOLD: 50,
  REPUTATION_PER_SERVE: 5,
  REPUTATION_PER_FAIL: -3,

  // Progression
  TIER_THRESHOLDS: [0, 100, 300, 600],
  GAME_DURATION: 300, // 5 minutes per round

  // Scoring
  SCORE_PER_MATCH: 10,
  SCORE_PER_CASCADE: 25,
  SCORE_PER_SERVE: 50,
  COMBO_MULTIPLIER: 1.5,
} as const;
