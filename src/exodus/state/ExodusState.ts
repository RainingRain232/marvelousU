// ---------------------------------------------------------------------------
// Exodus mode — core state definition & factory
// ---------------------------------------------------------------------------

import { UnitType } from "@/types";
import type { HexCoord } from "@world/hex/HexCoord";
import { hexKey } from "@world/hex/HexCoord";
import { ExodusConfig, type ExodusDifficulty } from "../config/ExodusConfig";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export enum ExodusPhase {
  DAWN = "dawn",
  MARCH = "march",
  EVENT = "event",
  CAMP = "camp",
  NIGHT = "night",
  BATTLE = "battle",
  GAME_OVER = "game_over",
  VICTORY = "victory",
}

export type ExodusTerrainType =
  | "plains"
  | "forest"
  | "mountain"
  | "swamp"
  | "coast"
  | "ruins"
  | "village"
  | "water";

export type CaravanRole =
  | "knight"
  | "soldier"
  | "archer"
  | "healer"
  | "scout"
  | "craftsman"
  | "peasant"
  | "refugee";

// ---------------------------------------------------------------------------
// Sub-state interfaces
// ---------------------------------------------------------------------------

export type MemberTrait = "brave" | "cautious" | "faithful" | "cynical" | "kind" | "stoic" | "fearful" | "resolute";

export interface CaravanMember {
  id: number;
  name: string;
  role: CaravanRole;
  unitType: UnitType;
  hp: number;
  maxHp: number;
  atk: number;
  wounded: boolean;
  daysInCaravan: number;
  trait: MemberTrait;
  kills: number;
  isNamed: boolean; // named NPCs have story significance
  title?: string; // "the Bold", "of Camelot", etc.
  deathQuote?: string; // said when they die
}

// Death quotes for flavor
const DEATH_QUOTES = [
  "Tell them... I didn't run.",
  "Avalon... is it real?",
  "I can see the green shores...",
  "Take care of the others.",
  "My sword... give it to someone who'll use it.",
  "I'm sorry I couldn't go further.",
  "It was an honor to march with you.",
  "The stars are so bright tonight...",
  "Remember Camelot.",
  "I regret nothing.",
];

const MEMBER_TRAITS: MemberTrait[] = ["brave", "cautious", "faithful", "cynical", "kind", "stoic", "fearful", "resolute"];

const TITLES = [
  "the Bold", "the Quiet", "of Camelot", "the Wanderer", "the Faithful",
  "the Scarred", "Ironfist", "the Last", "Lightfoot", "the Steadfast",
  "the Weary", "Shieldbearer", "the Hopeful", "the Grim", "Stormborn",
];

export interface ExodusHex {
  coord: HexCoord;
  key: string;
  terrain: ExodusTerrainType;
  region: number; // 0-4 index into REGION_DEFS
  revealed: boolean;
  visited: boolean;
  consumed: boolean; // taken by pursuer
  eventId: string | null; // pre-placed event
  loot: ExodusLoot | null;
  dangerLevel: number; // 0-5
}

export interface ExodusLoot {
  food?: number;
  supplies?: number;
  members?: CaravanRole[];
  relic?: string;
}

export interface ExodusRelic {
  id: string;
  name: string;
  description: string;
  effect: string;
  bonusAtk?: number;
  bonusHp?: number;
  bonusHeal?: number;
  bonusHope?: number;
}

export interface ExodusEvent {
  id: string;
  title: string;
  description: string;
  region: string | null; // null = any region
  choices: ExodusChoice[];
  minDay?: number;
  maxDay?: number;
  unique?: boolean;
  requiresMercy?: number; // only shows if mercy >= this
  requiresRelic?: string; // only shows if player has this relic
  isRegionTransition?: boolean; // triggered on entering a new region
  isBoss?: boolean; // boss encounter
}

export interface ExodusChoice {
  label: string;
  description: string;
  outcome: ExodusOutcome;
}

export interface ExodusOutcome {
  text: string;
  food?: number;
  supplies?: number;
  morale?: number;
  hope?: number;
  memberGain?: { role: CaravanRole; count: number }[];
  memberLoss?: number; // random loss count
  woundedCount?: number;
  revealHexes?: number;
  combat?: boolean;
  combatDanger?: number; // override danger level
  daysLost?: number;
  relicId?: string;
  pursuerDelay?: number; // slow pursuer by N days
  pursuerWeaken?: number; // permanently weaken pursuer
  mercy?: number; // +positive = merciful, -negative = pragmatic
  split?: boolean; // triggers caravan split decision
  chainEventId?: string; // trigger a follow-up event next day
}

export interface PursuerState {
  position: HexCoord;
  strength: number;
  daysActive: number;
  delayed: number; // extra delay days
  speed: number;
  active: boolean;
  weakened: number; // permanent strength reduction from ambushes
}

// ---------------------------------------------------------------------------
// Caravan upgrades
// ---------------------------------------------------------------------------

export interface CaravanUpgrade {
  id: string;
  name: string;
  description: string;
  effect: string;
  built: boolean;
}

export const UPGRADE_DEFS: CaravanUpgrade[] = [
  { id: "mobile_forge", name: "Mobile Forge", description: "Craftsmen can repair arms mid-march", effect: "+2 supplies per camp, wounded heal faster", built: false },
  { id: "herbalist_cart", name: "Herbalist's Cart", description: "Healers brew medicines on the road", effect: "Heal 1 extra wounded per camp", built: false },
  { id: "war_wagon", name: "War Wagon", description: "A fortified cart with mounted crossbows", effect: "+20% caravan defense in combat", built: false },
  { id: "scout_tower", name: "Scout Platform", description: "A raised lookout on the tallest cart", effect: "+1 reveal range when scouting", built: false },
  { id: "provisions_rack", name: "Provisions Rack", description: "Better food storage and preservation", effect: "-20% food consumption", built: false },
];

export interface ExodusLogEntry {
  day: number;
  phase: string;
  text: string;
  color?: number;
}

// ---------------------------------------------------------------------------
// Main state
// ---------------------------------------------------------------------------

export interface ExodusState {
  // Core
  day: number;
  phase: ExodusPhase;
  difficulty: ExodusDifficulty;
  seed: number;

  // Map
  hexes: Map<string, ExodusHex>;
  mapRadius: number;
  startHex: HexCoord;
  goalHex: HexCoord;
  caravanPosition: HexCoord;
  revealedKeys: Set<string>;

  // Caravan
  members: CaravanMember[];
  nextMemberId: number;

  // Resources
  food: number;
  supplies: number;
  morale: number;
  hope: number;

  // Relics
  relics: ExodusRelic[];

  // Moral alignment (shifts based on choices)
  mercy: number; // +mercy = compassionate, -mercy = pragmatic

  // Named member epitaphs (tracked for results screen)
  fallenHeroes: { name: string; role: string; day: number; quote?: string }[];

  // Pursuer
  pursuer: PursuerState;

  // Event state
  currentEvent: ExodusEvent | null;
  pendingOutcome: ExodusOutcome | null;
  pendingChainEventId: string | null; // stored separately so it survives outcome clearing
  usedEventIds: Set<string>;

  // Movement
  adjacentHexes: HexCoord[]; // available movement targets
  selectedHex: HexCoord | null;

  // Combat
  pendingCombat: boolean;
  combatDanger: number;
  lastBattleResult: "victory" | "defeat" | "retreat" | null;
  formationBonus: { atkMult: number; defMult: number } | null;

  // Upgrades
  upgrades: CaravanUpgrade[];

  // Phase timers
  phaseTimer: number;

  // Distance tracking
  distanceToGoal: number;
  totalHexesTraveled: number;

  // Terrain of current hex
  currentTerrain: ExodusTerrainType;
  currentRegion: number;

  // Log
  log: ExodusLogEntry[];

  // Stats
  totalDeaths: number;
  totalRecruits: number;
  battlesWon: number;
  battlesLost: number;
  battlesRetreated: number;
  refugeesSaved: number;
  daysRested: number;

  // Flow
  paused: boolean;
  gameOver: boolean;
  victory: boolean;
}

// ---------------------------------------------------------------------------
// RNG
// ---------------------------------------------------------------------------

export function exodusRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ---------------------------------------------------------------------------
// Name generator for caravan members
// ---------------------------------------------------------------------------

const NAMES_MALE = [
  "Aldric", "Bors", "Cedric", "Dagonet", "Elyan", "Faris", "Gareth",
  "Hector", "Ivo", "Jarin", "Kay", "Lucan", "Mordaunt", "Niall",
  "Owain", "Percival", "Roderic", "Sagramore", "Tristan", "Ulfius",
  "Vortimer", "Wulfric", "Ywain", "Agravain", "Brunor",
];
const NAMES_FEMALE = [
  "Alys", "Brenna", "Celyn", "Dindrane", "Elaine", "Faye", "Gwen",
  "Helena", "Isolde", "Jocelyn", "Keira", "Lynet", "Morgause", "Nimue",
  "Olwen", "Ragnell", "Seren", "Tamsin", "Viviane", "Wynne",
];

function randomName(rng: () => number): string {
  const all = [...NAMES_MALE, ...NAMES_FEMALE];
  return all[Math.floor(rng() * all.length)];
}

// ---------------------------------------------------------------------------
// Role → UnitType mapping
// ---------------------------------------------------------------------------

const ROLE_UNIT_MAP: Record<CaravanRole, UnitType> = {
  knight: UnitType.TEMPLAR,
  soldier: UnitType.SWORDSMAN,
  archer: UnitType.ARCHER,
  healer: UnitType.SWORDSMAN, // healers use swordsman sprite but have healer flag
  scout: UnitType.ARCHER,
  craftsman: UnitType.SWORDSMAN,
  peasant: UnitType.SWORDSMAN,
  refugee: UnitType.SWORDSMAN,
};

const ROLE_STATS: Record<CaravanRole, { hp: number; atk: number }> = {
  knight: { hp: 120, atk: 18 },
  soldier: { hp: 80, atk: 12 },
  archer: { hp: 60, atk: 14 },
  healer: { hp: 50, atk: 4 },
  scout: { hp: 55, atk: 8 },
  craftsman: { hp: 40, atk: 3 },
  peasant: { hp: 30, atk: 2 },
  refugee: { hp: 20, atk: 0 },
};

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createCaravanMember(
  id: number,
  role: CaravanRole,
  rng: () => number,
  isNamed = false,
): CaravanMember {
  const stats = ROLE_STATS[role];
  const trait = MEMBER_TRAITS[Math.floor(rng() * MEMBER_TRAITS.length)];
  const hasTitle = rng() < 0.3 || isNamed;
  const title = hasTitle ? TITLES[Math.floor(rng() * TITLES.length)] : undefined;
  const deathQuote = DEATH_QUOTES[Math.floor(rng() * DEATH_QUOTES.length)];
  return {
    id,
    name: randomName(rng),
    role,
    unitType: ROLE_UNIT_MAP[role],
    hp: stats.hp,
    maxHp: stats.hp,
    atk: stats.atk,
    wounded: false,
    daysInCaravan: 0,
    trait,
    kills: 0,
    isNamed,
    title,
    deathQuote,
  };
}

export interface CaravanPresetData {
  knights: number; soldiers: number; archers: number; healers: number;
  scouts: number; craftsmen: number; peasants: number; refugees: number;
  bonusFood: number; bonusSupplies: number;
}

export function createExodusState(
  seed: number,
  difficulty: ExodusDifficulty = "normal",
  preset?: CaravanPresetData,
): ExodusState {
  const rng = exodusRng(seed);

  // Create initial members
  const members: CaravanMember[] = [];
  let nextId = 1;

  const addMembers = (role: CaravanRole, count: number) => {
    for (let i = 0; i < count; i++) {
      members.push(createCaravanMember(nextId++, role, rng));
    }
  };

  const p = preset;
  addMembers("knight", p?.knights ?? ExodusConfig.START_KNIGHTS);
  addMembers("soldier", p?.soldiers ?? ExodusConfig.START_SOLDIERS);
  addMembers("archer", p?.archers ?? ExodusConfig.START_ARCHERS);
  addMembers("healer", p?.healers ?? ExodusConfig.START_HEALERS);
  addMembers("scout", p?.scouts ?? ExodusConfig.START_SCOUTS);
  addMembers("craftsman", p?.craftsmen ?? ExodusConfig.START_CRAFTSMEN);
  addMembers("peasant", p?.peasants ?? ExodusConfig.START_PEASANTS);
  addMembers("refugee", p?.refugees ?? ExodusConfig.START_REFUGEES);

  return {
    day: 1,
    phase: ExodusPhase.DAWN,
    difficulty,
    seed,

    hexes: new Map(),
    mapRadius: ExodusConfig.MAP_RADIUS,
    startHex: { q: 0, r: 0 },
    goalHex: { q: 0, r: 0 }, // set by map generator
    caravanPosition: { q: 0, r: 0 },
    revealedKeys: new Set(),

    members,
    nextMemberId: nextId,

    food: ExodusConfig.START_FOOD + (p?.bonusFood ?? 0),
    supplies: ExodusConfig.START_SUPPLIES + (p?.bonusSupplies ?? 0),
    morale: ExodusConfig.START_MORALE,
    hope: ExodusConfig.START_HOPE,

    relics: [],

    mercy: 0,
    fallenHeroes: [],

    pursuer: {
      position: { q: 0, r: 0 }, // set by map generator
      strength: ExodusConfig.PURSUER_START_STRENGTH,
      daysActive: 0,
      delayed: 0,
      speed: ExodusConfig.PURSUER_SPEED,
      active: false,
      weakened: 0,
    },

    currentEvent: null,
    pendingOutcome: null,
    pendingChainEventId: null,
    usedEventIds: new Set(),

    adjacentHexes: [],
    selectedHex: null,

    pendingCombat: false,
    combatDanger: 0,
    lastBattleResult: null,
    formationBonus: null,

    upgrades: UPGRADE_DEFS.map((u) => ({ ...u })),

    phaseTimer: 0,

    distanceToGoal: 0,
    totalHexesTraveled: 0,
    currentTerrain: "plains" as ExodusTerrainType,
    currentRegion: 0,

    log: [],

    totalDeaths: 0,
    totalRecruits: 0,
    battlesWon: 0,
    battlesLost: 0,
    battlesRetreated: 0,
    refugeesSaved: 0,
    daysRested: 0,

    paused: false,
    gameOver: false,
    victory: false,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function caravanCount(state: ExodusState): number {
  return state.members.length;
}

export function combatReadyMembers(state: ExodusState): CaravanMember[] {
  return state.members.filter(
    (m) => !m.wounded && m.role !== "refugee" && m.role !== "peasant" && m.role !== "craftsman",
  );
}

export function combatCapableMembers(state: ExodusState): CaravanMember[] {
  return state.members.filter(
    (m) => !m.wounded && m.role !== "refugee",
  );
}

export function membersByRole(state: ExodusState, role: CaravanRole): CaravanMember[] {
  return state.members.filter((m) => m.role === role);
}

export function scoutCount(state: ExodusState): number {
  return state.members.filter((m) => m.role === "scout" && !m.wounded).length;
}

export function addLogEntry(state: ExodusState, text: string, color?: number): void {
  state.log.push({ day: state.day, phase: state.phase, text, color });
  if (state.log.length > 200) state.log.shift();
}

export function memberDisplayName(m: CaravanMember): string {
  return m.title ? `${m.name} ${m.title}` : m.name;
}

export function getMemberDeathText(m: CaravanMember): string {
  const name = memberDisplayName(m);
  if (m.deathQuote) {
    return `${name} (${m.role}) has fallen. "${m.deathQuote}"`;
  }
  return `${name} (${m.role}) has fallen.`;
}
