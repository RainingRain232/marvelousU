// ---------------------------------------------------------------------------
// Alchemist mode — core state
// ---------------------------------------------------------------------------

import type { IngredientType, RecipeDef } from "../config/AlchemistConfig";
import { ALL_INGREDIENTS, RARE_INGREDIENTS, AlchemistConfig } from "../config/AlchemistConfig";

export enum AlchemistPhase {
  MAIN_MENU = "main_menu",
  PLAYING = "playing",
  PAUSED = "paused",
  RESULTS = "results",
}

export type SpecialTile = "none" | "wildcard" | "bomb" | "column_clear";

export interface GridTile {
  type: IngredientType;
  special: SpecialTile;
  x: number;
  y: number;
  px: number;
  py: number;
  matched: boolean;
  falling: boolean;
  selected: boolean;
  scale: number;
}

export interface Customer {
  id: string;
  name: string;
  recipe: RecipeDef;
  patience: number; // seconds remaining
  maxPatience: number;
  served: boolean;
  left: boolean;
}

export interface BrewProgress {
  recipeId: string;
  collected: Map<IngredientType, number>;
}

export interface AlchemistState {
  phase: AlchemistPhase;
  grid: GridTile[][];
  selectedTile: { x: number; y: number } | null;
  swapping: { from: { x: number; y: number }; to: { x: number; y: number }; progress: number } | null;
  matching: boolean;
  cascadeCount: number;
  comboCount: number;

  customers: Customer[];
  customerTimer: number;
  customerIdCounter: number;

  collected: Map<IngredientType, number>; // banked ingredients from matches
  brewQueue: BrewProgress[];

  gold: number;
  score: number;
  reputation: number;
  tier: number;
  potionsBrewed: number;
  customersServed: number;
  customersLost: number;
  bestCombo: number;
  elapsedTime: number;
  timeLimit: number;

  announcements: { text: string; color: number; timer: number }[];
  particles: { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: number; size: number }[];
  log: string[];
  // Power-ups (purchasable with gold during gameplay)
  shufflesRemaining: number;
  timeExtensions: number;
  magnetsRemaining: number; // converts random tile to needed ingredient
}

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

export function seedRng(seed: number): () => number {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

export function createGrid(seed: number): GridTile[][] {
  const rng = seedRng(seed);
  const { GRID_COLS, GRID_ROWS, TILE_SIZE } = AlchemistConfig;
  const grid: GridTile[][] = [];

  for (let row = 0; row < GRID_ROWS; row++) {
    grid[row] = [];
    for (let col = 0; col < GRID_COLS; col++) {
      const types = rng() < 0.1 ? [...ALL_INGREDIENTS, ...RARE_INGREDIENTS] : ALL_INGREDIENTS;
      let type = types[Math.floor(rng() * types.length)];

      // Prevent initial matches of 3+
      while (col >= 2 && grid[row][col - 1].type === type && grid[row][col - 2].type === type) {
        type = types[Math.floor(rng() * types.length)];
      }
      while (row >= 2 && grid[row - 1][col].type === type && grid[row - 2][col].type === type) {
        type = types[Math.floor(rng() * types.length)];
      }

      grid[row][col] = {
        type,
        x: col, y: row,
        px: col * TILE_SIZE, py: row * TILE_SIZE,
        special: "none", matched: false, falling: false, selected: false,
        scale: 1,
      };
    }
  }
  return grid;
}

const CUSTOMER_NAMES = [
  "Sir Gareth", "Lady Isolde", "Brother Thomas", "Squire Pip",
  "Dame Elara", "Lord Morwin", "Witch Hazel", "Friar Tuck",
  "Knight Percival", "Maiden Gwynn", "Baron Aldric", "Healer Mira",
  "Ranger Thorne", "Princess Enid", "Captain Voss", "Druid Oak",
];

export function createAlchemistState(seed: number): AlchemistState {
  return {
    phase: AlchemistPhase.PLAYING,
    grid: createGrid(seed),
    selectedTile: null,
    swapping: null,
    matching: false,
    cascadeCount: 0,
    comboCount: 0,
    customers: [],
    customerTimer: 5, // first customer arrives quickly
    customerIdCounter: 0,
    collected: new Map(),
    brewQueue: [],
    gold: AlchemistConfig.STARTING_GOLD,
    score: 0,
    reputation: 0,
    tier: 0,
    potionsBrewed: 0,
    customersServed: 0,
    customersLost: 0,
    bestCombo: 0,
    elapsedTime: 0,
    timeLimit: AlchemistConfig.GAME_DURATION,
    announcements: [],
    particles: [],
    log: ["The alchemy shop is open!"],
    shufflesRemaining: 1,
    timeExtensions: 1,
    magnetsRemaining: 1,
  };
}

export function spawnCustomer(state: AlchemistState, recipes: RecipeDef[]): void {
  if (state.customers.filter(c => !c.served && !c.left).length >= AlchemistConfig.MAX_CUSTOMERS) return;
  const rng = seedRng(Date.now() + state.customerIdCounter * 777);
  const maxTier = Math.min(state.tier + 1, 3);
  const available = recipes.filter(r => r.tier <= maxTier);
  if (available.length === 0) return;

  const recipe = available[Math.floor(rng() * available.length)];
  const name = CUSTOMER_NAMES[state.customerIdCounter % CUSTOMER_NAMES.length];
  state.customers.push({
    id: `cust_${state.customerIdCounter++}`,
    name,
    recipe,
    patience: AlchemistConfig.CUSTOMER_PATIENCE,
    maxPatience: AlchemistConfig.CUSTOMER_PATIENCE,
    served: false,
    left: false,
  });
  state.log.push(`${name} wants a ${recipe.name}!`);
}
