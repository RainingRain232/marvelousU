// ---------------------------------------------------------------------------
// Age of Wonders — Types & Enums
// ---------------------------------------------------------------------------

export enum AoWPhase {
  FACTION_SELECT = "aow_faction_select",
  PLAYING = "aow_playing",
  COMBAT = "aow_combat",
  SPELL_TARGET = "aow_spell_target",
  VICTORY = "aow_victory",
  DEFEAT = "aow_defeat",
}

export enum AoWFaction {
  CAMELOT = "camelot",
  UNDEAD = "undead",
  FEY = "fey",
  DWARVES = "dwarves",
}

export enum AoWTerrain {
  PLAINS = "plains",
  FOREST = "forest",
  HILLS = "hills",
  MOUNTAIN = "mountain",
  WATER = "water",
  SWAMP = "swamp",
  SNOW = "snow",
  LAVA = "lava",
}

export enum AoWUnitTier {
  TIER1 = 1,
  TIER2 = 2,
  TIER3 = 3,
  HERO = 4,
}

export enum AoWSpellDomain {
  FIRE = "fire",
  ICE = "ice",
  LIFE = "life",
  DEATH = "death",
  EARTH = "earth",
  ARCANE = "arcane",
}

export interface AoWHex {
  q: number;
  r: number;
  terrain: AoWTerrain;
  elevation: number; // 0-3
  explored: boolean[]; // per player
  cityId: string | null;
  resourceBonus: number; // 0-2 extra gold
  decoration: "none" | "ruins" | "shrine" | "grail" | "stone" | "tree";
}

export interface AoWUnitDef {
  id: string;
  name: string;
  faction: AoWFaction;
  tier: AoWUnitTier;
  hp: number;
  attack: number;
  defense: number;
  damage: [number, number]; // min-max
  speed: number; // movement points
  range: number; // 0 = melee
  abilities: string[];
  cost: number;
  description: string;
}

export interface AoWUnit {
  id: string;
  defId: string;
  playerId: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  damage: [number, number];
  speed: number;
  range: number;
  abilities: string[];
  xp: number;
  level: number;
  isHero: boolean;
  heroName?: string;
  equipment?: string[];
}

export interface AoWArmy {
  id: string;
  playerId: number;
  units: AoWUnit[];
  q: number;
  r: number;
  movementLeft: number;
  maxMovement: number;
}

export interface AoWCity {
  id: string;
  name: string;
  playerId: number; // -1 = neutral
  q: number;
  r: number;
  population: number; // 1-5, determines build slots
  goldPerTurn: number;
  manaPerTurn: number;
  walls: boolean;
  buildQueue: string[];
  turnsLeft: number;
  garrisonUnits: AoWUnit[];
}

export interface AoWSpellDef {
  id: string;
  name: string;
  domain: AoWSpellDomain;
  manaCost: number;
  description: string;
  targetType: "global" | "hex" | "army" | "city";
  effect: string;
  damage?: number;
  heal?: number;
  summonId?: string;
}

export interface AoWPlayer {
  id: number;
  faction: AoWFaction;
  name: string;
  gold: number;
  mana: number;
  goldPerTurn: number;
  manaPerTurn: number;
  spellBook: string[];
  researchedSpells: string[];
  currentResearch: string | null;
  researchProgress: number;
  isAI: boolean;
  defeated: boolean;
  heroesRecruited: number;
}

export interface AoWCombatUnit {
  unit: AoWUnit;
  combatHp: number;
  q: number;
  r: number;
  hasActed: boolean;
  side: "attacker" | "defender";
}

export interface AoWCombatState {
  active: boolean;
  attackerArmy: AoWArmy;
  defenderArmy: AoWArmy | null;
  defenderCity: AoWCity | null;
  combatUnits: AoWCombatUnit[];
  currentUnitIdx: number;
  round: number;
  log: string[];
  result: "pending" | "attacker_wins" | "defender_wins" | "draw";
  autoResolve: boolean;
}

export interface AoWGameState {
  phase: AoWPhase;
  turn: number;
  currentPlayer: number;
  players: AoWPlayer[];
  hexes: Map<string, AoWHex>;
  armies: AoWArmy[];
  cities: AoWCity[];
  combat: AoWCombatState | null;
  mapRadius: number;
  selectedArmyId: string | null;
  hoveredHex: { q: number; r: number } | null;
  movePath: { q: number; r: number }[] | null;
  castingSpell: AoWSpellDef | null;
  grailFound: boolean;
  log: string[];
}

// Hex coordinate helpers
export function hexKey(q: number, r: number): string {
  return `${q},${r}`;
}

export function hexDistance(q1: number, r1: number, q2: number, r2: number): number {
  const s1 = -q1 - r1;
  const s2 = -q2 - r2;
  return Math.max(Math.abs(q1 - q2), Math.abs(r1 - r2), Math.abs(s1 - s2));
}

export function hexNeighbors(q: number, r: number): [number, number][] {
  return [
    [q + 1, r], [q - 1, r],
    [q, r + 1], [q, r - 1],
    [q + 1, r - 1], [q - 1, r + 1],
  ];
}

// Hex to world position (flat-top hex grid)
export function hexToWorld(q: number, r: number, elevation: number = 0): { x: number; y: number; z: number } {
  const size = 1.0;
  const x = size * (3 / 2 * q);
  const z = size * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r);
  const y = elevation * 0.5;
  return { x, y, z };
}
