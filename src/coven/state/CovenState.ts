// ---------------------------------------------------------------------------
// Coven mode — core state
// ---------------------------------------------------------------------------

import type { HexCoord } from "@world/hex/HexCoord";
import { CovenConfig, type CovenDifficulty } from "../config/CovenConfig";

// ---------------------------------------------------------------------------
// Enums & types
// ---------------------------------------------------------------------------

export enum CovenPhase {
  DAWN = "dawn",
  FORAGE = "forage",
  BREW = "brew",
  DUSK = "dusk",
  NIGHT = "night",
  COMBAT = "combat",
  RITUAL = "ritual",
  GAME_OVER = "game_over",
  VICTORY = "victory",
}

export type CovenTerrain = "deep_woods" | "clearing" | "swamp" | "graveyard" | "ruins" | "village" | "cave" | "ley_line" | "water";

export type IngredientId = "nightshade" | "foxglove" | "hemlock" | "mugwort" | "deathcap" | "ghostshroom" | "moonstone" | "iron_filings" | "sulfur" | "silver_dust" | "crow_feather" | "bat_wing" | "spider_silk" | "snake_venom" | "dragon_scale" | "ley_crystal" | "ancient_bone" | "star_fragment" | "grave_dust" | "marsh_reed" | "fairy_cap" | "wolf_pelt" | "wraith_dust" | "shadow_essence";

export type PotionId = "healing_draught" | "mana_elixir" | "shadow_cloak" | "beast_bane" | "ward_essence" | "night_sight" | "liquid_fire" | "paralysis_toxin" | "familiar_cat" | "familiar_owl" | "familiar_raven" | "familiar_toad";

export type SpellId = "thorn_hex" | "sleep_fog" | "bewilderment" | "fire_bolt" | "shadow_bolt" | "drain_life" | "banishment";

export type FamiliarType = "raven" | "cat" | "wolf" | "owl" | "toad";

export type WardType = "salt_circle" | "fire_ring" | "glamour" | "alarm";

export type RitualComponent = "moonstone_tear" | "dragon_blood" | "silver_mirror" | "living_flame" | "crown_of_thorns";

// ---------------------------------------------------------------------------
// Sub-state interfaces
// ---------------------------------------------------------------------------

export interface CovenHex {
  coord: HexCoord;
  key: string;
  terrain: CovenTerrain;
  revealed: boolean;
  visited: boolean;
  ingredients: IngredientId[];
  creatureId: string | null;
  wardId: string | null;
  wardDurability: number;
  lightLevel: number; // 0=dark, 1=dim, 2=lit
  ritualComponent: RitualComponent | null;
  inquisitorPatrol: boolean;
}

export interface Creature {
  id: string;
  type: string;
  hp: number;
  maxHp: number;
  damage: number;
  position: HexCoord;
  nocturnalOnly: boolean;
  loot: IngredientId[];
}

export interface Inquisitor {
  id: string;
  position: HexCoord;
  strength: number;
  alertLevel: number; // 0=patrolling, 1=suspicious, 2=hunting
}

export interface Familiar {
  id: string;
  type: FamiliarType;
  name: string;
  active: boolean;
}

export interface Ward {
  id: string;
  type: WardType;
  position: HexCoord;
  durability: number;
}

export interface CovenLogEntry {
  day: number;
  text: string;
  color?: number;
}

// ---------------------------------------------------------------------------
// Main state
// ---------------------------------------------------------------------------

export interface CovenState {
  seed: number;
  day: number;
  phase: CovenPhase;
  difficulty: CovenDifficulty;

  // Map
  hexes: Map<string, CovenHex>;
  mapRadius: number;
  playerPosition: HexCoord;
  hideoutPosition: HexCoord;
  adjacentHexes: HexCoord[];
  revealedKeys: Set<string>;

  // Player stats
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;

  // Inventory
  ingredients: Map<IngredientId, number>;
  potions: Map<PotionId, number>;
  learnedSpells: SpellId[];
  activeSpell: SpellId | null;

  // Familiars
  familiars: Familiar[];

  // Wards
  wards: Ward[];

  // Threats
  creatures: Creature[];
  inquisitors: Inquisitor[];

  // Ritual
  ritualComponents: RitualComponent[];
  ritualComplete: boolean;

  // Log & stats
  log: CovenLogEntry[];
  creaturesSlain: number;
  spellsCast: number;
  potionsBrewed: number;
  ingredientsGathered: number;
  daysAtHideout: number;

  // Flow
  paused: boolean;
  gameOver: boolean;
  victory: boolean;

  // Pending
  pendingCombat: Creature | null;
}

// ---------------------------------------------------------------------------
// RNG
// ---------------------------------------------------------------------------

export function covenRng(seed: number): () => number {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createCovenState(seed: number, difficulty: CovenDifficulty = "normal"): CovenState {
  const diff = difficulty === "easy" ? CovenConfig.DIFFICULTY_EASY : difficulty === "hard" ? CovenConfig.DIFFICULTY_HARD : CovenConfig.DIFFICULTY_NORMAL;
  return {
    seed,
    day: 1,
    phase: CovenPhase.DAWN,
    difficulty,

    hexes: new Map(),
    mapRadius: CovenConfig.MAP_RADIUS,
    playerPosition: { q: 0, r: 0 },
    hideoutPosition: { q: 0, r: 0 },
    adjacentHexes: [],
    revealedKeys: new Set(),

    health: Math.floor(CovenConfig.START_HEALTH * diff.healthMult),
    maxHealth: Math.floor(CovenConfig.MAX_HEALTH * diff.healthMult),
    mana: Math.floor(CovenConfig.START_MANA * diff.manaMult),
    maxMana: Math.floor(CovenConfig.MAX_MANA * diff.manaMult),

    // Start with basic ingredients to brew a healing potion on day 1
    ingredients: new Map<IngredientId, number>([
      ["mugwort", 3],
      ["foxglove", 2],
      ["nightshade", 1],
      ["iron_filings", 1],
      ["silver_dust", 1], // enough for one ward_essence with mugwort + iron_filings
      ["crow_feather", 1],
    ]),
    potions: new Map(),
    learnedSpells: ["thorn_hex", "fire_bolt"],
    activeSpell: "fire_bolt",

    familiars: [],
    wards: [],
    creatures: [],
    inquisitors: [],

    ritualComponents: [],
    ritualComplete: false,

    log: [],
    creaturesSlain: 0,
    spellsCast: 0,
    potionsBrewed: 0,
    ingredientsGathered: 0,
    daysAtHideout: 0,

    paused: false,
    gameOver: false,
    victory: false,

    pendingCombat: null,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function addCovenLog(state: CovenState, text: string, color?: number): void {
  state.log.push({ day: state.day, text, color });
  if (state.log.length > 200) state.log.shift();
}

export function addIngredient(state: CovenState, id: IngredientId, count = 1): void {
  state.ingredients.set(id, (state.ingredients.get(id) ?? 0) + count);
  state.ingredientsGathered += count;
}

export function hasIngredient(state: CovenState, id: IngredientId, count = 1): boolean {
  return (state.ingredients.get(id) ?? 0) >= count;
}

export function removeIngredient(state: CovenState, id: IngredientId, count = 1): boolean {
  const current = state.ingredients.get(id) ?? 0;
  if (current < count) return false;
  state.ingredients.set(id, current - count);
  return true;
}

export function addPotion(state: CovenState, id: PotionId, count = 1): void {
  state.potions.set(id, (state.potions.get(id) ?? 0) + count);
}

export function hasPotion(state: CovenState, id: PotionId): boolean {
  return (state.potions.get(id) ?? 0) > 0;
}

export function usePotion(state: CovenState, id: PotionId): boolean {
  const current = state.potions.get(id) ?? 0;
  if (current <= 0) return false;
  state.potions.set(id, current - 1);
  return true;
}
