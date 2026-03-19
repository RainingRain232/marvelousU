// ============================================================================
// CivConfig.ts — Arthurian Civilization 2-style Game Configuration
// ============================================================================

// ---------------------------------------------------------------------------
// Type Definitions
// ---------------------------------------------------------------------------

export interface TerrainDef {
  id: string;
  name: string;
  moveCost: number;
  defenseBonus: number;
  food: number;
  production: number;
  gold: number;
  color: number;
  passable: boolean;
  symbol: string;
}

export type TerrainId = keyof typeof TERRAIN_TYPES;

export interface FactionBonuses {
  attackBonus: number;
  defenseBonus: number;
  goldBonus: number;
  researchBonus: number;
  movementBonus: number;
  growthBonus: number;
  [key: string]: number;
}

export interface FactionDef {
  id: string;
  name: string;
  leader: string;
  color: number;
  bonuses: FactionBonuses;
  uniqueUnit: string;
  description: string;
  aiPersonality:
    | "aggressive"
    | "defensive"
    | "diplomatic"
    | "expansionist"
    | "balanced";
  cityNames: string[];
}

export type FactionId = typeof CIV_FACTIONS[number]["id"];

export type UnitClass =
  | "melee"
  | "ranged"
  | "cavalry"
  | "siege"
  | "naval"
  | "special"
  | "settler"
  | "worker"
  | "hero"
  | "scout";

// Alias used by CivCombat.ts
export type CivUnitType = UnitClass;

export interface UnitDef {
  id: string;
  name: string;
  unitClass: UnitClass;
  attack: number;
  defense: number;
  hp: number;
  movement: number;
  cost: number;
  maintenance: number;
  requiresTech: string | null;
  label: string;
  era: number;
  canFoundCity?: boolean;
  canBuildImprovement?: boolean;
  ranged?: boolean;
  range?: number;
  siegeBonus?: number;
  navalTransport?: boolean;
}

export interface BuildingEffects {
  food?: number;
  production?: number;
  gold?: number;
  research?: number;
  culture?: number;
  happiness?: number;
  defense?: number;
  [key: string]: number | undefined;
}

export interface BuildingDef {
  id: string;
  name: string;
  cost: number;
  maintenance: number;
  requiresTech: string | null;
  effects: BuildingEffects;
  description: string;
}

export type TechBranch = "chivalry" | "sorcery" | "statecraft" | "faith";

export interface TechDef {
  id: string;
  name: string;
  branch: TechBranch;
  cost: number;
  prerequisites: string[];
  unlocks: string[];
  description: string;
  era: number;
}

export interface WonderEffects {
  food?: number;
  production?: number;
  gold?: number;
  research?: number;
  culture?: number;
  happiness?: number;
  defense?: number;
  attack?: number;
  [key: string]: number | boolean | undefined;
}

export interface WonderDef {
  id: string;
  name: string;
  cost: number;
  requiresTech: string;
  effects: WonderEffects;
  description: string;
}

export interface HeroDef {
  id: string;
  name: string;
  faction: string | null;
  attack: number;
  defense: number;
  hp: number;
  movement: number;
  abilities: string[];
  description: string;
  label: string;
}

export interface EventChoice {
  label: string;
  chivalryChange: number;
  goldChange?: number;
  cultureChange?: number;
  effects?: { [key: string]: number | string | boolean };
}

export interface ChivalryEvent {
  id: string;
  name: string;
  description: string;
  choices: EventChoice[];
}

export interface DifficultyLevel {
  id: number;
  name: string;
  aiProductionBonus: number;
  aiResearchBonus: number;
  aiGoldBonus: number;
  aiAggressionBonus: number;
  playerBonus: number;
}

export interface MapPreset {
  id: string;
  name: string;
  width: number;
  height: number;
  maxPlayers: number;
}

// Legacy type aliases consumed by CivAI.ts
export type TechNode = TechDef;
export type UnitTemplate = UnitDef;
export type BuildingTemplate = BuildingDef;
export type FactionTrait = FactionDef;

// ---------------------------------------------------------------------------
// 1. TERRAIN_TYPES
// ---------------------------------------------------------------------------

export const TERRAIN_TYPES: Record<string, TerrainDef> = {
  plains:           { id: "plains",           name: "Plains",           moveCost: 1, defenseBonus: 0,    food: 2, production: 1, gold: 0, color: 0xC8B464, passable: true,  symbol: "." },
  grassland:        { id: "grassland",        name: "Grassland",        moveCost: 1, defenseBonus: 0,    food: 3, production: 0, gold: 0, color: 0x4A7C3F, passable: true,  symbol: "," },
  forest:           { id: "forest",           name: "Forest",           moveCost: 2, defenseBonus: 0.25, food: 1, production: 2, gold: 0, color: 0x2D5A1E, passable: true,  symbol: "T" },
  hills:            { id: "hills",            name: "Hills",            moveCost: 2, defenseBonus: 0.50, food: 1, production: 2, gold: 1, color: 0x8B7355, passable: true,  symbol: "n" },
  mountains:        { id: "mountains",        name: "Mountains",        moveCost: 99, defenseBonus: 0,   food: 0, production: 1, gold: 1, color: 0x6B6B6B, passable: false, symbol: "A" },
  swamp:            { id: "swamp",            name: "Swamp",            moveCost: 3, defenseBonus: 0.10, food: 1, production: 0, gold: 0, color: 0x4A6B4A, passable: true,  symbol: "~" },
  river:            { id: "river",            name: "River",            moveCost: 1, defenseBonus: 0.25, food: 2, production: 0, gold: 1, color: 0x4A8FC2, passable: true,  symbol: "=" },
  lake:             { id: "lake",             name: "Lake",             moveCost: 99, defenseBonus: 0,   food: 2, production: 0, gold: 1, color: 0x3A7FB5, passable: false, symbol: "o" },
  ocean:            { id: "ocean",            name: "Ocean",            moveCost: 1, defenseBonus: 0,    food: 1, production: 0, gold: 2, color: 0x1A4F7A, passable: false, symbol: " " },
  enchanted_forest: { id: "enchanted_forest", name: "Enchanted Forest", moveCost: 2, defenseBonus: 0.30, food: 1, production: 1, gold: 1, color: 0x1E7A4A, passable: true,  symbol: "*" },
  holy_spring:      { id: "holy_spring",      name: "Holy Spring",      moveCost: 1, defenseBonus: 0.10, food: 2, production: 0, gold: 2, color: 0x7AC5E8, passable: true,  symbol: "+" },
  roman_ruins:      { id: "roman_ruins",      name: "Roman Ruins",      moveCost: 1, defenseBonus: 0.15, food: 0, production: 2, gold: 3, color: 0xA0845A, passable: true,  symbol: "R" },
  wasteland:        { id: "wasteland",        name: "Wasteland",        moveCost: 2, defenseBonus: 0,    food: 0, production: 0, gold: 0, color: 0x3A2A1A, passable: true,  symbol: "x" },
};

// Legacy per-terrain lookup maps (used by CivAI.ts)
export const TERRAIN_FOOD: Record<string, number> = Object.fromEntries(
  Object.values(TERRAIN_TYPES).map((t) => [t.id, t.food]),
);
export const TERRAIN_PRODUCTION: Record<string, number> = Object.fromEntries(
  Object.values(TERRAIN_TYPES).map((t) => [t.id, t.production]),
);
export const TERRAIN_TRADE: Record<string, number> = Object.fromEntries(
  Object.values(TERRAIN_TYPES).map((t) => [t.id, t.gold]),
);

// ---------------------------------------------------------------------------
// 2. CIV_FACTIONS (8 factions)
// ---------------------------------------------------------------------------

export const CIV_FACTIONS: FactionDef[] = [
  {
    id: "logres",
    name: "Logres",
    leader: "King Arthur Pendragon",
    color: 0xC0392B,
    bonuses: { attackBonus: 0.05, defenseBonus: 0.05, goldBonus: 0.05, researchBonus: 0.05, movementBonus: 0, growthBonus: 0.05, chivalryGain: 0.25 },
    uniqueUnit: "knight_of_camelot",
    description: "The High Kingdom of Arthur. Balanced in all pursuits, Logres embodies the chivalric ideal and gains renown faster than any other realm.",
    aiPersonality: "balanced",
    cityNames: ["Camelot", "Caerleon", "Carduel", "Carlisle", "Winchester", "London", "Glastonbury", "Tintagel"],
  },
  {
    id: "orkney",
    name: "Orkney",
    leader: "King Lot of Lothian",
    color: 0x2C3E50,
    bonuses: { attackBonus: 0.15, defenseBonus: 0.05, goldBonus: 0, researchBonus: 0, movementBonus: 0, growthBonus: 0, knightStrength: 0.10 },
    uniqueUnit: "orcadian_huscarl",
    description: "The warlike northern kingdom of Lot. Orkney breeds fearsome warriors whose knights strike harder than any in Britain.",
    aiPersonality: "aggressive",
    cityNames: ["Lothian", "Orkney", "Dunbar", "Stirling", "Gawain's Hold", "Perth", "Dundee", "Aberdeen"],
  },
  {
    id: "cornouailles",
    name: "Cornouailles",
    leader: "King Mark of Cornwall",
    color: 0xF39C12,
    bonuses: { attackBonus: 0, defenseBonus: 0, goldBonus: 0.20, researchBonus: 0.05, movementBonus: 0, growthBonus: 0, espionage: 0.30 },
    uniqueUnit: "cornish_smuggler",
    description: "The mercantile realm of King Mark. Cornwall commands the tin trade and a network of spies that rivals any army.",
    aiPersonality: "diplomatic",
    cityNames: ["Tintagel", "Truro", "Exeter", "Kernow", "Isolt's Haven", "Padstow", "Bodmin", "Launceston"],
  },
  {
    id: "gwynedd",
    name: "Gwynedd",
    leader: "King Maelgwn Gwynedd",
    color: 0x27AE60,
    bonuses: { attackBonus: 0, defenseBonus: 0.20, goldBonus: 0, researchBonus: 0, movementBonus: 0.05, growthBonus: 0, mountainDefense: 0.30 },
    uniqueUnit: "welsh_longbowman",
    description: "The mountain fortress of North Wales. Gwynedd excels at defensive warfare, turning every hill into an impregnable stronghold.",
    aiPersonality: "defensive",
    cityNames: ["Deganwy", "Aberffraw", "Bangor", "Snowdon Keep", "Harlech", "Caernarfon", "Conwy", "Dolgellau"],
  },
  {
    id: "saxons",
    name: "Saxons",
    leader: "Cerdic of Wessex",
    color: 0x7F8C8D,
    bonuses: { attackBonus: 0.10, defenseBonus: 0, goldBonus: 0, researchBonus: 0, movementBonus: 0, growthBonus: 0.15, settlerDiscount: 0.20 },
    uniqueUnit: "saxon_fyrdman",
    description: "The relentless invaders from across the sea. The Saxons expand rapidly, founding settlements and taming wild lands with ruthless efficiency.",
    aiPersonality: "expansionist",
    cityNames: ["Wessex", "Kent", "Sussex", "Lundenwic", "Hamwic", "Jorvik", "Anglia", "Mercia"],
  },
  {
    id: "benwick",
    name: "Benwick",
    leader: "Sir Lancelot du Lac",
    color: 0x2980B9,
    bonuses: { attackBonus: 0.10, defenseBonus: 0, goldBonus: 0, researchBonus: 0.05, movementBonus: 0.10, growthBonus: 0, cavalryStrength: 0.15 },
    uniqueUnit: "lac_chevalier",
    description: "The continental domain of Lancelot. Benwick fields the finest cavalry in Christendom, thundering across the field with matchless skill.",
    aiPersonality: "aggressive",
    cityNames: ["Benwick", "Gaunes", "Joyous Gard", "Beaune", "Troyes", "Chartres", "Rouen", "Bayeux"],
  },
  {
    id: "annwn",
    name: "Annwn / Fae Court",
    leader: "Morgan le Fay",
    color: 0x8E44AD,
    bonuses: { attackBonus: 0, defenseBonus: 0, goldBonus: 0, researchBonus: 0.20, movementBonus: 0, growthBonus: 0, magicPower: 0.40 },
    uniqueUnit: "sidhe_knight",
    description: "The Otherworld realm of the Fae. Morgan le Fay commands eldritch powers, and her enchanted warriors blur the line between mortal and myth.",
    aiPersonality: "defensive",
    cityNames: ["Annwn", "Avalon", "Tir na nOg", "Broceliande", "Glastonbury Tor", "Sidhe Mound", "Nimue's Lake", "Dun Scaith"],
  },
  {
    id: "pictland",
    name: "Pictland",
    leader: "King Angusel of Albany",
    color: 0x1ABC9C,
    bonuses: { attackBonus: 0.05, defenseBonus: 0.10, goldBonus: 0, researchBonus: 0, movementBonus: 0.10, growthBonus: 0, forestBonus: 0.25 },
    uniqueUnit: "pictish_woad_raider",
    description: "The painted warriors of the far north. Pictland excels in guerrilla warfare, melting into forests and striking from the shadows.",
    aiPersonality: "aggressive",
    cityNames: ["Fortriu", "Craig Phadrig", "Scone", "Brechin", "Caledon", "Dunkeld", "Inverness", "Burghead"],
  },
];

// Legacy alias used by CivAI.ts
export const FACTION_TRAITS = CIV_FACTIONS;

// Legacy faction bonus lookup used by CivCombat.ts
export const FACTION_BONUSES: Record<string, FactionBonuses> = Object.fromEntries(
  CIV_FACTIONS.map((f) => [f.id, f.bonuses]),
);

// Legacy enum-style Faction kept for CivState/CivRenderer backward compat
export enum Faction {
  Camelot = 0,
  Saxons = 1,
  Picts = 2,
  Fae = 3,
  Romans = 4,
  Vikings = 5,
}

export const FACTION_COLORS: Record<number, number> = {
  [Faction.Camelot]: 0x2266CC,
  [Faction.Saxons]: 0xCC3333,
  [Faction.Picts]: 0x33AA33,
  [Faction.Fae]: 0xAA44DD,
  [Faction.Romans]: 0xDDAA22,
  [Faction.Vikings]: 0x888888,
};

// Legacy TerrainType enum kept for CivState/CivRenderer backward compat
export enum TerrainType {
  Plains = "Plains",
  Grassland = "Grassland",
  Forest = "Forest",
  Hills = "Hills",
  Mountains = "Mountains",
  Swamp = "Swamp",
  River = "River",
  Lake = "Lake",
  Ocean = "Ocean",
  EnchantedForest = "EnchantedForest",
  HolySpring = "HolySpring",
  RomanRuins = "RomanRuins",
  Wasteland = "Wasteland",
}

// ---------------------------------------------------------------------------
// 3. CIV_UNIT_DEFS (~28 units: 6 early, 8 mid, 6 late, 8 unique)
// ---------------------------------------------------------------------------

export const CIV_UNIT_DEFS: Record<string, UnitDef> = {
  // ---- Era 1: Early ----
  warband:            { id: "warband",            name: "Warband",            unitClass: "melee",    attack: 2,  defense: 1,  hp: 10,  movement: 2, cost: 10,  maintenance: 2, requiresTech: null,            label: "Wb", era: 1 },
  spearmen:           { id: "spearmen",           name: "Spearmen",           unitClass: "melee",    attack: 2,  defense: 3,  hp: 15,  movement: 1, cost: 15,  maintenance: 2, requiresTech: "feudalism",     label: "Sp", era: 1 },
  scout:              { id: "scout",              name: "Scout",              unitClass: "scout",    attack: 1,  defense: 1,  hp: 8,   movement: 4, cost: 10,  maintenance: 1, requiresTech: null,            label: "Sc", era: 1 },
  druid:              { id: "druid",              name: "Druid",              unitClass: "special",  attack: 1,  defense: 1,  hp: 10,  movement: 2, cost: 25,  maintenance: 2, requiresTech: "druidism",      label: "Dr", era: 1, ranged: true, range: 2 },
  settler:            { id: "settler",            name: "Settler",            unitClass: "settler",  attack: 0,  defense: 1,  hp: 20,  movement: 2, cost: 60,  maintenance: 0, requiresTech: null,            label: "Se", era: 1, canFoundCity: true },
  worker:             { id: "worker",             name: "Worker",             unitClass: "worker",   attack: 0,  defense: 0,  hp: 10,  movement: 2, cost: 20,  maintenance: 0, requiresTech: null,            label: "Wk", era: 1, canBuildImprovement: true },

  // ---- Era 2: Mid ----
  knight:             { id: "knight",             name: "Knight",             unitClass: "cavalry",  attack: 6,  defense: 4,  hp: 25,  movement: 3, cost: 50,  maintenance: 5, requiresTech: "heavy_cavalry", label: "Kn", era: 2 },
  mounted_sergeant:   { id: "mounted_sergeant",   name: "Mounted Sergeant",   unitClass: "cavalry",  attack: 4,  defense: 3,  hp: 20,  movement: 3, cost: 35,  maintenance: 3, requiresTech: "feudalism",     label: "MS", era: 2 },
  man_at_arms:        { id: "man_at_arms",        name: "Man-at-Arms",        unitClass: "melee",    attack: 5,  defense: 4,  hp: 25,  movement: 1, cost: 30,  maintenance: 3, requiresTech: "code_of_honor", label: "MA", era: 2 },
  longbowman:         { id: "longbowman",         name: "Longbowman",         unitClass: "ranged",   attack: 5,  defense: 2,  hp: 15,  movement: 1, cost: 30,  maintenance: 3, requiresTech: "fortification", label: "Lb", era: 2, ranged: true, range: 3 },
  siege_ram:          { id: "siege_ram",          name: "Siege Ram",          unitClass: "siege",    attack: 8,  defense: 1,  hp: 20,  movement: 1, cost: 45,  maintenance: 3, requiresTech: "siege_craft",   label: "SR", era: 2, siegeBonus: 3.0 },
  bard:               { id: "bard",               name: "Bard",               unitClass: "special",  attack: 0,  defense: 1,  hp: 10,  movement: 2, cost: 25,  maintenance: 2, requiresTech: "code_of_honor", label: "Bd", era: 2 },
  friar:              { id: "friar",              name: "Friar",              unitClass: "special",  attack: 0,  defense: 1,  hp: 10,  movement: 2, cost: 20,  maintenance: 2, requiresTech: "monasticism",   label: "Fr", era: 2 },
  galley:             { id: "galley",             name: "Galley",             unitClass: "naval",    attack: 3,  defense: 2,  hp: 20,  movement: 4, cost: 40,  maintenance: 3, requiresTech: "navigation",    label: "Gl", era: 2, navalTransport: true },

  // ---- Era 3-4: Late ----
  grail_knight:       { id: "grail_knight",       name: "Grail Knight",       unitClass: "cavalry",  attack: 10, defense: 8,  hp: 40,  movement: 3, cost: 120, maintenance: 8, requiresTech: "grail_quest",   label: "GK", era: 4 },
  enchanted_champion: { id: "enchanted_champion", name: "Enchanted Champion", unitClass: "melee",    attack: 9,  defense: 6,  hp: 35,  movement: 2, cost: 100, maintenance: 6, requiresTech: "enchantment",   label: "EC", era: 3 },
  fae_warrior:        { id: "fae_warrior",        name: "Fae Warrior",        unitClass: "melee",    attack: 7,  defense: 5,  hp: 25,  movement: 3, cost: 80,  maintenance: 5, requiresTech: "fae_pact",      label: "FW", era: 3 },
  trebuchet:          { id: "trebuchet",          name: "Trebuchet",          unitClass: "siege",    attack: 14, defense: 1,  hp: 15,  movement: 1, cost: 80,  maintenance: 5, requiresTech: "siege_craft",   label: "Tb", era: 3, siegeBonus: 4.0, ranged: true, range: 3 },
  archmage:           { id: "archmage",           name: "Archmage",           unitClass: "special",  attack: 8,  defense: 3,  hp: 20,  movement: 2, cost: 150, maintenance: 8, requiresTech: "high_sorcery",  label: "AM", era: 4, ranged: true, range: 3 },
  carrack:            { id: "carrack",            name: "Carrack",            unitClass: "naval",    attack: 6,  defense: 4,  hp: 30,  movement: 5, cost: 80,  maintenance: 5, requiresTech: "navigation",    label: "Ck", era: 3, navalTransport: true },

  // ---- Faction Unique Units (8) ----
  knight_of_camelot:  { id: "knight_of_camelot",  name: "Knight of Camelot",  unitClass: "cavalry",  attack: 8,  defense: 6,  hp: 30,  movement: 3, cost: 60,  maintenance: 5, requiresTech: "heavy_cavalry", label: "RT", era: 2 },
  orcadian_huscarl:   { id: "orcadian_huscarl",   name: "Orcadian Huscarl",   unitClass: "melee",    attack: 7,  defense: 5,  hp: 30,  movement: 2, cost: 45,  maintenance: 3, requiresTech: "code_of_honor", label: "OH", era: 2 },
  cornish_smuggler:   { id: "cornish_smuggler",   name: "Cornish Smuggler",   unitClass: "naval",    attack: 3,  defense: 2,  hp: 15,  movement: 4, cost: 30,  maintenance: 2, requiresTech: "trade_routes",  label: "CS", era: 2 },
  welsh_longbowman:   { id: "welsh_longbowman",   name: "Welsh Longbowman",   unitClass: "ranged",   attack: 7,  defense: 3,  hp: 18,  movement: 1, cost: 35,  maintenance: 3, requiresTech: "fortification", label: "WL", era: 2, ranged: true, range: 4 },
  saxon_fyrdman:      { id: "saxon_fyrdman",      name: "Saxon Fyrdman",      unitClass: "melee",    attack: 4,  defense: 3,  hp: 18,  movement: 2, cost: 15,  maintenance: 2, requiresTech: null,            label: "SF", era: 1 },
  lac_chevalier:      { id: "lac_chevalier",      name: "Lac Chevalier",      unitClass: "cavalry",  attack: 9,  defense: 5,  hp: 28,  movement: 4, cost: 70,  maintenance: 6, requiresTech: "heavy_cavalry", label: "LC", era: 2 },
  sidhe_knight:       { id: "sidhe_knight",       name: "Sidhe Knight",       unitClass: "cavalry",  attack: 8,  defense: 6,  hp: 25,  movement: 3, cost: 75,  maintenance: 6, requiresTech: "enchantment",   label: "SK", era: 3 },
  pictish_woad_raider:{ id: "pictish_woad_raider",name: "Pictish Woad Raider",unitClass: "melee",    attack: 5,  defense: 2,  hp: 18,  movement: 3, cost: 25,  maintenance: 2, requiresTech: null,            label: "PR", era: 1 },
};

// Legacy alias used by CivAI.ts
export const UNIT_TEMPLATES = CIV_UNIT_DEFS;

// ---------------------------------------------------------------------------
// 4. CIV_BUILDING_DEFS (~20 buildings)
// ---------------------------------------------------------------------------

export const CIV_BUILDING_DEFS: Record<string, BuildingDef> = {
  great_hall:       { id: "great_hall",       name: "Great Hall",       cost: 60,  maintenance: 1, requiresTech: null,            effects: { culture: 1, happiness: 1 },                        description: "The lord's seat of power. Provides basic culture and keeps the populace content." },
  palisade:         { id: "palisade",         name: "Palisade",         cost: 30,  maintenance: 0, requiresTech: null,            effects: { defense: 3 },                                      description: "A simple wooden stockade encircling the settlement." },
  stone_wall:       { id: "stone_wall",       name: "Stone Wall",       cost: 120, maintenance: 1, requiresTech: "masonry",       effects: { defense: 8 },                                      description: "Stout masonry walls that can withstand a prolonged siege." },
  granary:          { id: "granary",          name: "Granary",          cost: 45,  maintenance: 1, requiresTech: null,            effects: { food: 2 },                                         description: "Stores surplus grain to stave off famine and speed population growth." },
  marketplace:      { id: "marketplace",      name: "Marketplace",      cost: 90,  maintenance: 1, requiresTech: "trade_routes",  effects: { gold: 3 },                                         description: "A bustling square where merchants gather, boosting the city's commerce." },
  blacksmith:       { id: "blacksmith",       name: "Blacksmith",       cost: 60,  maintenance: 1, requiresTech: "feudalism",     effects: { production: 2 },                                   description: "A forge that hammers out arms and tools, improving production output." },
  stables:          { id: "stables",          name: "Stables",          cost: 75,  maintenance: 1, requiresTech: "feudalism",     effects: {},                                                   description: "Facilities for breeding and training warhorses. Required for cavalry production." },
  barracks:         { id: "barracks",         name: "Barracks",         cost: 60,  maintenance: 1, requiresTech: null,            effects: {},                                                   description: "A training ground where raw recruits are forged into soldiers. Units gain starting XP." },
  scriptorium:      { id: "scriptorium",      name: "Scriptorium",      cost: 90,  maintenance: 2, requiresTech: "monasticism",   effects: { research: 3, culture: 1 },                         description: "Monks copy manuscripts and study ancient texts, advancing knowledge." },
  chapel:           { id: "chapel",           name: "Chapel",           cost: 53,  maintenance: 1, requiresTech: "piety",         effects: { happiness: 2, culture: 1 },                        description: "A small house of worship that soothes the spirit of the townsfolk." },
  cathedral:        { id: "cathedral",        name: "Cathedral",        cost: 300, maintenance: 3, requiresTech: "holy_order",    effects: { happiness: 5, culture: 3, research: 1 },           description: "A magnificent stone church that dominates the skyline and inspires awe." },
  jousting_grounds: { id: "jousting_grounds", name: "Jousting Grounds", cost: 120, maintenance: 1, requiresTech: "jousting",      effects: { happiness: 2, culture: 1 },                        description: "Tournament lists where knights hone their lance-work and win renown." },
  enchanted_tower:  { id: "enchanted_tower",  name: "Enchanted Tower",  cost: 180, maintenance: 2, requiresTech: "enchantment",   effects: { research: 3, defense: 3 },                         description: "A sorcerer's spire crackling with eldritch energy, extending vision across the land." },
  watchtower:       { id: "watchtower",       name: "Watchtower",       cost: 38,  maintenance: 0, requiresTech: "fortification", effects: { defense: 1 },                                      description: "A tall lookout post that reveals approaching enemies." },
  harbor:           { id: "harbor",           name: "Harbor",           cost: 90,  maintenance: 1, requiresTech: "navigation",    effects: { gold: 2, food: 1 },                                description: "A sheltered port for building ships and receiving seaborne trade." },
  alchemist:        { id: "alchemist",        name: "Alchemist",        cost: 120, maintenance: 2, requiresTech: "hedge_magic",   effects: { research: 2, gold: 2, production: 1 },             description: "A laboratory where natural philosophers transmute base knowledge into practical wonders." },
  round_table_hall: { id: "round_table_hall", name: "Round Table",      cost: 600, maintenance: 4, requiresTech: "round_table",   effects: { happiness: 6, culture: 5, gold: 2 },               description: "The legendary Round Table — a world wonder that unites the realm under justice and fellowship." },
  guild_hall:       { id: "guild_hall",       name: "Guild Hall",       cost: 105, maintenance: 1, requiresTech: "guilds",        effects: { production: 3, gold: 2 },                          description: "A hall where craftsmen organise, boosting manufacturing and commerce." },
  abbey:            { id: "abbey",            name: "Abbey",            cost: 150, maintenance: 2, requiresTech: "monasticism",   effects: { research: 2, culture: 1 },                         description: "A fortified monastery where monks pray, heal, and preserve learning." },
  curtain_wall:     { id: "curtain_wall",     name: "Curtain Wall",     cost: 225, maintenance: 2, requiresTech: "siege_craft",   effects: { defense: 12 },                                     description: "A concentric ring of tall stone walls with towers -- the pinnacle of fortification." },
};

// Legacy alias used by CivAI.ts
export const BUILDING_TEMPLATES = CIV_BUILDING_DEFS;

// ---------------------------------------------------------------------------
// 5. CIV_TECH_TREE — 4 branches, 40 techs total
// ---------------------------------------------------------------------------

export const CIV_TECH_TREE: Record<string, TechDef> = {
  // ---- CHIVALRY BRANCH (10 techs) ----
  feudalism:       { id: "feudalism",       name: "Feudalism",        branch: "chivalry",   cost: 40,  prerequisites: [],                           unlocks: ["spearmen", "mounted_sergeant", "blacksmith", "stables"],           description: "The feudal system of lords and vassals that underpins medieval society.",          era: 1 },
  code_of_honor:   { id: "code_of_honor",   name: "Code of Honor",    branch: "chivalry",   cost: 80,  prerequisites: ["feudalism"],                 unlocks: ["man_at_arms", "bard"],                                            description: "A formal code governing warfare and conduct among the nobility.",                 era: 1 },
  jousting:        { id: "jousting",        name: "Jousting",         branch: "chivalry",   cost: 120, prerequisites: ["code_of_honor"],             unlocks: ["jousting_grounds"],                                               description: "The art of mounted tournament combat, breeding elite horsemen.",                  era: 2 },
  heavy_cavalry:   { id: "heavy_cavalry",   name: "Heavy Cavalry",    branch: "chivalry",   cost: 160, prerequisites: ["jousting"],                  unlocks: ["knight", "knight_of_camelot", "lac_chevalier"],                   description: "Armoured riders wielding lance and sword -- the shock weapon of the age.",        era: 2 },
  heraldry:        { id: "heraldry",        name: "Heraldry",         branch: "chivalry",   cost: 100, prerequisites: ["code_of_honor"],             unlocks: [],                                                                 description: "The science of coats of arms. Improves diplomatic recognition.",                  era: 2 },
  noble_steeds:    { id: "noble_steeds",    name: "Noble Steeds",     branch: "chivalry",   cost: 140, prerequisites: ["feudalism"],                 unlocks: [],                                                                 description: "Selective breeding of destriers and coursers, improving all cavalry movement.",    era: 2 },
  chivalric_oath:  { id: "chivalric_oath",  name: "Chivalric Oath",   branch: "chivalry",   cost: 200, prerequisites: ["heraldry", "jousting"],      unlocks: [],                                                                 description: "A binding vow sworn before God and king. Units gain morale in just wars.",        era: 3 },
  round_table:     { id: "round_table",     name: "Round Table",      branch: "chivalry",   cost: 320, prerequisites: ["heavy_cavalry", "diplomacy"],unlocks: ["round_table_hall", "knight_of_camelot"],                          description: "The ideal of equal fellowship among peers, embodied in stone and oak.",           era: 3 },
  knightly_orders: { id: "knightly_orders", name: "Knightly Orders",  branch: "chivalry",   cost: 280, prerequisites: ["chivalric_oath"],            unlocks: [],                                                                 description: "Organised brotherhoods of warrior-monks sworn to protect the realm.",             era: 3 },
  grail_quest:     { id: "grail_quest",     name: "Grail Quest",      branch: "chivalry",   cost: 400, prerequisites: ["heavy_cavalry", "grail_lore"], unlocks: ["grail_knight"],                                                 description: "The sacred quest for the Holy Grail, elevating the worthiest knights.",           era: 4 },

  // ---- SORCERY BRANCH (10 techs) ----
  hedge_magic:     { id: "hedge_magic",     name: "Hedge Magic",      branch: "sorcery",    cost: 40,  prerequisites: [],                           unlocks: ["alchemist"],                                                      description: "Folk charms and herbalism practised by cunning-folk in every village.",           era: 1 },
  druidism:        { id: "druidism",        name: "Druidism",         branch: "sorcery",    cost: 80,  prerequisites: ["hedge_magic"],               unlocks: ["druid"],                                                          description: "The ancient priestly tradition of the Celts, drawing power from grove and stream.", era: 1 },
  ley_lines:       { id: "ley_lines",       name: "Ley Lines",        branch: "sorcery",    cost: 120, prerequisites: ["hedge_magic"],               unlocks: [],                                                                 description: "Knowledge of invisible currents of power that crisscross the land.",              era: 2 },
  enchantment:     { id: "enchantment",     name: "Enchantment",      branch: "sorcery",    cost: 160, prerequisites: ["druidism"],                  unlocks: ["enchanted_champion", "enchanted_tower", "sidhe_knight"],          description: "The art of imbuing objects and warriors with magical properties.",                era: 2 },
  summoning:       { id: "summoning",       name: "Summoning",        branch: "sorcery",    cost: 240, prerequisites: ["enchantment"],               unlocks: [],                                                                 description: "Rituals to call forth spirits and creatures from the Otherworld.",                era: 3 },
  glamour:         { id: "glamour",         name: "Glamour",          branch: "sorcery",    cost: 180, prerequisites: ["enchantment"],               unlocks: [],                                                                 description: "Illusion magic that conceals armies and deceives the enemy.",                     era: 3 },
  fae_pact:        { id: "fae_pact",        name: "Fae Pact",         branch: "sorcery",    cost: 300, prerequisites: ["enchantment"],               unlocks: ["fae_warrior"],                                                    description: "A dangerous bargain with the Fair Folk, granting access to their warriors.",      era: 3 },
  high_sorcery:    { id: "high_sorcery",    name: "High Sorcery",     branch: "sorcery",    cost: 400, prerequisites: ["summoning"],                 unlocks: ["archmage"],                                                       description: "Mastery of the deepest magical arts -- reality bends to the caster's will.",      era: 4 },
  blood_magic:     { id: "blood_magic",     name: "Blood Magic",      branch: "sorcery",    cost: 320, prerequisites: ["summoning"],                 unlocks: [],                                                                 description: "Forbidden sorcery fuelled by sacrifice. Powerful but ruinous to chivalry.",       era: 4 },
  otherworld_gate: { id: "otherworld_gate", name: "Otherworld Gate",  branch: "sorcery",    cost: 500, prerequisites: ["high_sorcery", "fae_pact"],  unlocks: [],                                                                 description: "A permanent portal to Annwn, enabling instant transport between realms.",         era: 4 },

  // ---- STATECRAFT BRANCH (10 techs) ----
  fortification:   { id: "fortification",   name: "Fortification",    branch: "statecraft", cost: 50,  prerequisites: [],                           unlocks: ["longbowman", "watchtower", "welsh_longbowman"],                   description: "Earthworks, ditches, and wooden towers to defend settlements.",                   era: 1 },
  masonry:         { id: "masonry",         name: "Masonry",          branch: "statecraft", cost: 90,  prerequisites: ["fortification"],             unlocks: ["stone_wall"],                                                     description: "The craft of shaping stone into walls, arches, and keeps.",                       era: 1 },
  trade_routes:    { id: "trade_routes",    name: "Trade Routes",     branch: "statecraft", cost: 80,  prerequisites: [],                           unlocks: ["marketplace", "cornish_smuggler"],                                description: "Establishing safe roads and agreements for the flow of goods between cities.",     era: 1 },
  taxation:        { id: "taxation",        name: "Taxation",         branch: "statecraft", cost: 100, prerequisites: ["trade_routes"],              unlocks: [],                                                                 description: "Systematic collection of levies and tithes to fund the kingdom's coffers.",       era: 2 },
  guilds:          { id: "guilds",          name: "Guilds",           branch: "statecraft", cost: 140, prerequisites: ["trade_routes"],              unlocks: ["guild_hall"],                                                     description: "Organised associations of craftsmen that improve production quality and output.",  era: 2 },
  siege_craft:     { id: "siege_craft",     name: "Siege Craft",      branch: "statecraft", cost: 200, prerequisites: ["masonry"],                   unlocks: ["siege_ram", "trebuchet", "curtain_wall"],                         description: "The science of breaking -- and building -- fortifications.",                      era: 2 },
  navigation:      { id: "navigation",      name: "Navigation",       branch: "statecraft", cost: 120, prerequisites: ["trade_routes"],              unlocks: ["galley", "carrack", "harbor"],                                    description: "Celestial wayfinding and shipwright techniques for crossing open water.",         era: 2 },
  diplomacy:       { id: "diplomacy",       name: "Diplomacy",        branch: "statecraft", cost: 160, prerequisites: ["guilds"],                    unlocks: [],                                                                 description: "Formal embassies and treaties between kingdoms, enabling alliances and pacts.",    era: 2 },
  law_of_the_land: { id: "law_of_the_land", name: "Law of the Land",  branch: "statecraft", cost: 180, prerequisites: ["diplomacy"],                 unlocks: [],                                                                 description: "A codified legal system that reduces corruption and unrest across the realm.",    era: 3 },
  royal_mint:      { id: "royal_mint",      name: "Royal Mint",       branch: "statecraft", cost: 220, prerequisites: ["taxation", "guilds"],         unlocks: [],                                                                 description: "A central mint striking standardised coinage, enriching all cities.",             era: 3 },

  // ---- FAITH BRANCH (10 techs) ----
  piety:           { id: "piety",           name: "Piety",            branch: "faith",      cost: 40,  prerequisites: [],                           unlocks: ["chapel"],                                                         description: "Simple Christian devotion that calms the populace and stirs the soul.",           era: 1 },
  monasticism:     { id: "monasticism",     name: "Monasticism",      branch: "faith",      cost: 90,  prerequisites: ["piety"],                     unlocks: ["friar", "scriptorium", "abbey"],                                  description: "The monastic movement -- centres of prayer, learning, and healing.",              era: 1 },
  confession:      { id: "confession",      name: "Confession",       branch: "faith",      cost: 110, prerequisites: ["piety"],                     unlocks: [],                                                                 description: "The sacrament of repentance. Reduces corruption and restores lost chivalry.",     era: 2 },
  relics:          { id: "relics",          name: "Relics",           branch: "faith",      cost: 140, prerequisites: ["monasticism"],               unlocks: [],                                                                 description: "Sacred objects -- bones of saints, splinters of the True Cross.",                 era: 2 },
  pilgrimage:      { id: "pilgrimage",      name: "Pilgrimage",       branch: "faith",      cost: 160, prerequisites: ["relics"],                    unlocks: [],                                                                 description: "Holy journeys that spread faith, generate gold, and reveal distant lands.",       era: 2 },
  hagiography:     { id: "hagiography",     name: "Hagiography",      branch: "faith",      cost: 190, prerequisites: ["relics", "monasticism"],     unlocks: [],                                                                 description: "Written lives of the saints that spread culture and inspire devotion.",           era: 3 },
  holy_order:      { id: "holy_order",      name: "Holy Order",       branch: "faith",      cost: 240, prerequisites: ["pilgrimage"],                unlocks: ["cathedral"],                                                      description: "A militant religious brotherhood sworn to defend the faith by force of arms.",    era: 3 },
  grail_lore:      { id: "grail_lore",      name: "Grail Lore",       branch: "faith",      cost: 320, prerequisites: ["holy_order"],                unlocks: [],                                                                 description: "Ancient knowledge of the Grail's resting place, gathered from visions.",         era: 3 },
  divine_mandate:  { id: "divine_mandate",  name: "Divine Mandate",   branch: "faith",      cost: 280, prerequisites: ["holy_order"],                unlocks: [],                                                                 description: "The claim to rule by God's will. All cities gain happiness.",                     era: 3 },
  miracle_working: { id: "miracle_working", name: "Miracle Working",  branch: "faith",      cost: 360, prerequisites: ["grail_lore"],                unlocks: [],                                                                 description: "The power of true saints -- healing the sick, raising the fallen.",               era: 4 },
};

// Legacy alias used by CivAI.ts
export const TECH_TREE = CIV_TECH_TREE;

// ---------------------------------------------------------------------------
// 6. CIV_WONDERS (8 world wonders)
// ---------------------------------------------------------------------------

export const CIV_WONDERS: Record<string, WonderDef> = {
  sword_in_the_stone: {
    id: "sword_in_the_stone",
    name: "Sword in the Stone",
    cost: 150,
    requiresTech: "feudalism",
    effects: { happiness: 3, culture: 3, legitimacy: 10 },
    description: "Whosoever pulleth this sword from this stone is rightwise born king. Grants unshakeable legitimacy and inspires all troops.",
  },
  the_round_table: {
    id: "the_round_table",
    name: "The Round Table",
    cost: 300,
    requiresTech: "round_table",
    effects: { culture: 5, happiness: 3, research: 2, diplomaticInfluence: 10 },
    description: "A table with no head, where all knights sit as equals. Unites the realm under a banner of justice and fellowship.",
  },
  excalibur: {
    id: "excalibur",
    name: "Excalibur",
    cost: 200,
    requiresTech: "enchantment",
    effects: { attack: 3, defense: 2, magicResistance: 3 },
    description: "The Lady of the Lake's gift -- a blade that shines with the light of thirty torches and whose scabbard prevents all bleeding.",
  },
  the_holy_grail: {
    id: "the_holy_grail",
    name: "The Holy Grail",
    cost: 400,
    requiresTech: "grail_lore",
    effects: { happiness: 10, culture: 5, food: 3, globalHealing: 3 },
    description: "The cup of Christ, sought by the worthiest knights. Its presence heals the land itself and banishes famine and blight.",
  },
  avalon: {
    id: "avalon",
    name: "Avalon",
    cost: 350,
    requiresTech: "fae_pact",
    effects: { research: 5, culture: 3, heroHealing: 5, freeFaeWarrior: true },
    description: "The Isle of Apples, hidden behind enchanted mists. A place of healing and ancient power where wounded heroes are restored.",
  },
  stonehenge: {
    id: "stonehenge",
    name: "Stonehenge",
    cost: 120,
    requiresTech: "druidism",
    effects: { research: 4, culture: 2, leyLineVision: true },
    description: "The ancient ring of standing stones, still humming with power. Amplifies druidic magic and reveals the ley lines of Britain.",
  },
  tintagel_castle: {
    id: "tintagel_castle",
    name: "Tintagel Castle",
    cost: 250,
    requiresTech: "masonry",
    effects: { defense: 15, culture: 2, gold: 3, legitimacy: 5 },
    description: "Arthur's legendary birthplace, perched on sea-battered cliffs. An unassailable fortress and symbol of royal power.",
  },
  great_library_of_camelot: {
    id: "great_library_of_camelot",
    name: "The Great Library of Camelot",
    cost: 280,
    requiresTech: "monasticism",
    effects: { research: 5, culture: 4, freeTech: true },
    description: "A vast repository of Roman texts, Celtic sagas, and arcane scrolls. Grants a free technology upon completion.",
  },
};

// ---------------------------------------------------------------------------
// 7. CIV_HEROES (10 named hero units)
// ---------------------------------------------------------------------------

export const CIV_HEROES: Record<string, HeroDef> = {
  merlin: {
    id: "merlin",
    name: "Merlin",
    faction: null,
    attack: 6, defense: 4, hp: 30, movement: 3,
    abilities: [
      "Prophecy -- reveals a large area of the map",
      "Shape-shift -- can disguise as enemy unit",
      "Enchant Weapon -- gives +3 attack to an adjacent unit for 5 turns",
      "Mist Veil -- hides adjacent friendly units for 3 turns",
    ],
    description: "The immortal wizard, half-man, half-demon, architect of Arthur's rise. The greatest sorcerer in all of Britain.",
    label: "Me",
  },
  lancelot: {
    id: "lancelot",
    name: "Sir Lancelot du Lac",
    faction: "benwick",
    attack: 12, defense: 8, hp: 45, movement: 4,
    abilities: [
      "Peerless Knight -- +50% attack in single combat",
      "Charge -- devastating first-strike damage when attacking",
      "Inspire -- adjacent cavalry units gain +2 attack",
    ],
    description: "The greatest knight who ever lived -- and the most tragic. Unmatched in combat, torn between duty and forbidden love.",
    label: "La",
  },
  gawain: {
    id: "gawain",
    name: "Sir Gawain",
    faction: "orkney",
    attack: 10, defense: 7, hp: 40, movement: 3,
    abilities: [
      "Strength of the Sun -- attack doubles in first half of each turn",
      "Green Knight's Bargain -- survives one fatal blow per battle",
      "Orkney Fury -- +3 attack when allies are wounded",
    ],
    description: "Arthur's nephew, the Knight of the Sun. His strength waxes and wanes with the day but his courage never falters.",
    label: "Ga",
  },
  percival: {
    id: "percival",
    name: "Sir Percival",
    faction: null,
    attack: 8, defense: 6, hp: 35, movement: 3,
    abilities: [
      "Grail Sense -- can detect Grail-related sites and relics",
      "Pure Heart -- immune to enchantment and corruption",
      "Holy Strike -- bonus damage against undead and fae enemies",
    ],
    description: "The naive but pure-hearted knight destined to achieve the Grail. His innocence is his greatest shield.",
    label: "Pe",
  },
  guinevere: {
    id: "guinevere",
    name: "Queen Guinevere",
    faction: "logres",
    attack: 2, defense: 4, hp: 20, movement: 2,
    abilities: [
      "Court Intrigue -- can sway enemy cities toward your faction",
      "Royal Patronage -- city she resides in gains +3 culture and +2 gold",
      "Inspire Chivalry -- all knights within 3 tiles gain +1 morale",
    ],
    description: "Arthur's queen, as politically astute as she is beautiful. A master of courtly influence and cultural patronage.",
    label: "Gu",
  },
  morgana: {
    id: "morgana",
    name: "Morgan le Fay",
    faction: "annwn",
    attack: 8, defense: 5, hp: 28, movement: 3,
    abilities: [
      "Fae Glamour -- can make a unit invisible for 3 turns",
      "Curse -- reduces target unit's attack and defense by 3 for 5 turns",
      "Heal -- restores 15 hp to target unit",
      "Scrying Pool -- reveals any tile on the map for 2 turns",
    ],
    description: "Arthur's half-sister and the queen of the Fae. Brilliant, dangerous, and driven by ancient grievances.",
    label: "Mo",
  },
  mordred: {
    id: "mordred",
    name: "Sir Mordred",
    faction: null,
    attack: 9, defense: 5, hp: 35, movement: 3,
    abilities: [
      "Treachery -- can turn an enemy unit to your side once per game",
      "Usurper's Ambition -- gains strength for each city you control",
      "Dark Charisma -- adjacent enemy units have reduced morale",
    ],
    description: "Arthur's bastard son and destined nemesis. Cunning and ruthless, he will stop at nothing to seize the throne.",
    label: "Md",
  },
  galahad: {
    id: "galahad",
    name: "Sir Galahad",
    faction: null,
    attack: 11, defense: 10, hp: 50, movement: 3,
    abilities: [
      "Grail Knight -- immune to all magic and curses",
      "Siege Perilous -- can sit the forbidden seat, granting a permanent blessing",
      "Radiance -- undead and evil units within 2 tiles take 3 damage per turn",
      "Ascension -- upon death, grants a massive faith and culture bonus",
    ],
    description: "The perfect knight, son of Lancelot. Pure beyond measure, destined to achieve the Holy Grail and ascend to heaven.",
    label: "Gl",
  },
  tristan: {
    id: "tristan",
    name: "Sir Tristan",
    faction: "cornouailles",
    attack: 9, defense: 6, hp: 35, movement: 3,
    abilities: [
      "Master Musician -- functions as a Bard in addition to combat abilities",
      "Love's Madness -- gains +4 attack when at less than half hp",
      "Hunter -- +3 attack against beasts and in forest terrain",
    ],
    description: "Knight of Cornwall, renowned lover and harper. As deadly with a blade as he is gifted with a song.",
    label: "Tr",
  },
  bedivere: {
    id: "bedivere",
    name: "Sir Bedivere",
    faction: "logres",
    attack: 8, defense: 7, hp: 38, movement: 2,
    abilities: [
      "One-Handed -- fights with a single arm yet suffers no penalty",
      "Loyal Unto Death -- gains +5 defense when guarding Arthur or the capital",
      "Excalibur's Steward -- if Excalibur wonder is built, gains +3 attack",
    ],
    description: "Arthur's oldest companion and most loyal knight. It was Bedivere who returned Excalibur to the Lady of the Lake.",
    label: "Be",
  },
};

// ---------------------------------------------------------------------------
// 8. CHIVALRY_EVENTS (10 random events)
// ---------------------------------------------------------------------------

export const CHIVALRY_EVENTS: ChivalryEvent[] = [
  {
    id: "evt_damsel_in_distress",
    name: "A Damsel in Distress",
    description: "A noblewoman has been captured by bandits on the road to your capital. Your knights could mount a rescue -- or you could demand ransom from her family instead.",
    choices: [
      { label: "Send knights to rescue her at once", chivalryChange: 10, goldChange: -20, effects: { militaryExperience: 5 } },
      { label: "Negotiate a ransom from her family", chivalryChange: -5, goldChange: 40 },
      { label: "Ignore the matter -- we have a war to fight", chivalryChange: -3 },
    ],
  },
  {
    id: "evt_tournament",
    name: "The Grand Tournament",
    description: "Knights from across the realm wish to hold a great tournament in your honour. It will cost gold but could inspire the people.",
    choices: [
      { label: "Host a lavish tournament worthy of legend", chivalryChange: 8, goldChange: -60, effects: { happiness: 3, cavalryExperience: 10 } },
      { label: "Hold a modest tourney to save coin", chivalryChange: 3, goldChange: -20, effects: { happiness: 1 } },
      { label: "Cancel it -- tournaments are a frivolous waste", chivalryChange: -4, effects: { happiness: -2 } },
    ],
  },
  {
    id: "evt_peasant_uprising",
    name: "Peasant Uprising",
    description: "Overtaxed peasants in a border village have risen in revolt. They demand lower tithes and mercy.",
    choices: [
      { label: "Hear their grievances and lower taxes", chivalryChange: 6, goldChange: -20, effects: { happiness: 4 } },
      { label: "Crush the rebellion with force", chivalryChange: -10, effects: { happiness: -3, production: 2 } },
      { label: "Send a friar to negotiate a compromise", chivalryChange: 3, goldChange: -10, effects: { happiness: 2 } },
    ],
  },
  {
    id: "evt_captured_enemy",
    name: "A Captured Knight",
    description: "Your soldiers have captured an enemy knight of noble birth after a skirmish. He pleads for honourable treatment.",
    choices: [
      { label: "Treat him with honour and ransom him back", chivalryChange: 8, goldChange: 30, effects: { diplomaticBonus: 2 } },
      { label: "Imprison him to extract military secrets", chivalryChange: -6, effects: { espionage: 5 } },
      { label: "Execute him as a warning to our enemies", chivalryChange: -15, effects: { enemyMorale: -5, diplomaticPenalty: 3 } },
    ],
  },
  {
    id: "evt_mysterious_stranger",
    name: "The Mysterious Stranger",
    description: "A cloaked figure arrives at court offering a powerful enchanted artefact -- but demands a dark favour in return.",
    choices: [
      { label: "Refuse the offer -- such bargains lead to ruin", chivalryChange: 5, effects: { faith: 2 } },
      { label: "Accept the artefact and pay the price", chivalryChange: -8, effects: { freeEnchantedWeapon: true, corruption: 3 } },
      { label: "Arrest the stranger -- sorcery is not welcome here", chivalryChange: 2, goldChange: 10 },
    ],
  },
  {
    id: "evt_holy_vision",
    name: "A Holy Vision",
    description: "A monk in your abbey claims to have seen a vision of the Holy Grail shining above a distant hill. The people are in uproar.",
    choices: [
      { label: "Declare a holy pilgrimage to the site", chivalryChange: 7, goldChange: -30, effects: { faith: 5, research: 3 } },
      { label: "Dismiss the vision as madness", chivalryChange: -2, effects: { faith: -2 } },
      { label: "Send scholars to investigate quietly", chivalryChange: 2, effects: { research: 5 } },
    ],
  },
  {
    id: "evt_saxon_refugees",
    name: "Saxon Refugees",
    description: "A group of Saxon families, fleeing a famine across the sea, beg to settle in your lands. Your people are suspicious.",
    choices: [
      { label: "Welcome them -- mercy is the mark of a true king", chivalryChange: 6, effects: { population: 2, happiness: -1 } },
      { label: "Turn them away -- we cannot feed our own", chivalryChange: -3 },
      { label: "Accept them as indentured labour", chivalryChange: -7, effects: { production: 3, happiness: -2 } },
    ],
  },
  {
    id: "evt_enchanted_spring",
    name: "The Enchanted Spring",
    description: "A patrol discovers a hidden spring in the forest whose waters glow faintly. Drinking from it seems to restore vigour -- but the Druids warn of Fae mischief.",
    choices: [
      { label: "Consecrate the spring with Christian rites", chivalryChange: 4, effects: { faith: 3, healing: 2 } },
      { label: "Let the Druids study it for magical properties", chivalryChange: 0, effects: { magicResearch: 4 } },
      { label: "Seal it off -- we cannot trust Fae gifts", chivalryChange: 1 },
    ],
  },
  {
    id: "evt_kings_justice",
    name: "The King's Justice",
    description: "Two lords dispute ownership of a fertile valley. Both have legitimate claims and both command sizeable retinues.",
    choices: [
      { label: "Judge fairly based on the ancient law", chivalryChange: 8, goldChange: -10, effects: { happiness: 2 } },
      { label: "Award the land to whichever lord pays more", chivalryChange: -10, goldChange: 50, effects: { happiness: -3 } },
      { label: "Split the valley between them", chivalryChange: 3, effects: { happiness: 1 } },
    ],
  },
  {
    id: "evt_black_knight",
    name: "The Black Knight at the Bridge",
    description: "A fearsome armoured figure guards a strategic bridge, challenging all who would cross. Trade caravans cannot pass.",
    choices: [
      { label: "Send your champion to defeat him in single combat", chivalryChange: 6, effects: { heroExperience: 10, tradeRestored: true } },
      { label: "March the army around -- we have no time for duels", chivalryChange: -2, effects: { movementPenalty: 1 } },
      { label: "Offer him a place at your court", chivalryChange: 4, goldChange: -15, effects: { freeManAtArms: true } },
    ],
  },
];

// ---------------------------------------------------------------------------
// 9. CIV_DIFFICULTY (5 levels)
// ---------------------------------------------------------------------------

export const CIV_DIFFICULTY: DifficultyLevel[] = [
  { id: 0, name: "Squire",       aiProductionBonus: 0.7, aiResearchBonus: 0.7, aiGoldBonus: 0.7, aiAggressionBonus: 0.3, playerBonus: 1.3 },
  { id: 1, name: "Knight Errant",aiProductionBonus: 0.9, aiResearchBonus: 0.9, aiGoldBonus: 0.9, aiAggressionBonus: 0.5, playerBonus: 1.1 },
  { id: 2, name: "Lord",         aiProductionBonus: 1.0, aiResearchBonus: 1.0, aiGoldBonus: 1.0, aiAggressionBonus: 0.6, playerBonus: 1.0 },
  { id: 3, name: "King",         aiProductionBonus: 1.2, aiResearchBonus: 1.2, aiGoldBonus: 1.2, aiAggressionBonus: 0.7, playerBonus: 0.9 },
  { id: 4, name: "Pendragon",    aiProductionBonus: 1.5, aiResearchBonus: 1.5, aiGoldBonus: 1.5, aiAggressionBonus: 0.9, playerBonus: 0.8 },
];

// Legacy alias used by CivAI.ts
export const DIFFICULTY_MODIFIERS = CIV_DIFFICULTY;

// ---------------------------------------------------------------------------
// 10. MAP_PRESETS
// ---------------------------------------------------------------------------

export const MAP_PRESETS: MapPreset[] = [
  { id: "small",  name: "Small Realm",  width: 40, height: 30, maxPlayers: 4 },
  { id: "medium", name: "Standard Realm",width: 60, height: 45, maxPlayers: 6 },
  { id: "large",  name: "Grand Realm",  width: 80, height: 60, maxPlayers: 8 },
];

// ---------------------------------------------------------------------------
// Game-play constants
// ---------------------------------------------------------------------------

export const MAP_WIDTH = 60;
export const MAP_HEIGHT = 45;
export const MIN_CITY_DISTANCE = 4;

export const XP_PER_LEVEL = 10;
export const MAX_LEVEL = 5;
export const LEVEL_BONUS = 0.10;
export const FORTIFY_BONUS = 0.50;
export const CITY_BASE_DEFENSE = 4;
export const WALL_DEFENSE_BONUS = 5;
export const HEAL_PER_TURN = 2;
export const HEAL_IN_CITY = 4;
export const BASE_FOOD_NEEDED = 20;
export const FOOD_PER_POP = 10;
export const BASE_CITY_PRODUCTION = 2;
export const BASE_CITY_GOLD = 1;
export const BASE_CITY_RESEARCH = 1;

// ---------------------------------------------------------------------------
// Hex rendering constants (used by CivRenderer)
// ---------------------------------------------------------------------------

export const HEX_SIZE = 32;
export const HEX_WIDTH = HEX_SIZE * Math.sqrt(3);
export const HEX_HEIGHT = HEX_SIZE * 2;
// Legacy aliases
export const HEX_W = HEX_WIDTH;
export const HEX_H = HEX_HEIGHT;

export const CAMERA_ZOOM_MIN = 0.5;
export const CAMERA_ZOOM_MAX = 2.0;
export const CAMERA_PAN_SPEED = 8;

// ---------------------------------------------------------------------------
// Arthurian city name pool
// ---------------------------------------------------------------------------

export const CITY_NAME_POOL: string[] = [
  "Camelot", "Caerleon", "Tintagel", "Avalon", "Glastonbury", "Winchester",
  "Londinium", "Carlisle", "York", "Bath", "Canterbury", "Bamburgh",
  "Cadbury", "Dinas Emrys", "Joyous Gard", "Castle Perilous", "Corbenic",
  "Sarras", "Carbonek", "Caer Sidi", "Broceliande", "Lyonesse",
];
