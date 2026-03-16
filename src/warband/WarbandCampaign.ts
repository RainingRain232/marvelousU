// ---------------------------------------------------------------------------
// Warband Campaign – overworld map mode
// A Mount & Blade–style campaign map with cities, roving warbands, and factions.
// Battles are resolved via the existing WarbandGame army battle system.
// ---------------------------------------------------------------------------

import { RACE_DEFINITIONS, type RaceDef } from "@sim/config/RaceDefs";
import { CREATURE_DEFS, type CreatureType } from "./config/CreatureDefs";
import { WEAPON_DEFS } from "./config/WeaponDefs";
import { ARMOR_DEFS, ArmorSlot } from "./config/ArmorDefs";
import { WB } from "./config/WarbandBalanceConfig";
import {
  type WarbandState,
  type WarbandFighter,
  WarbandPhase,
  BattleType,
  createWarbandState,
  createDefaultFighter,
  createHorse,
  vec3,
  type HorseArmorTier,
} from "./state/WarbandState";
import { WarbandSceneManager } from "./view/WarbandSceneManager";
import { WarbandCameraController } from "./view/WarbandCameraController";
import { FighterMesh } from "./view/WarbandFighterRenderer";
import { HorseMesh } from "./view/WarbandHorseRenderer";
import { CreatureMesh } from "./view/WarbandCreatureRenderer";
import { WarbandHUD } from "./view/WarbandHUD";
import { WarbandFX } from "./view/WarbandFX";
import { WarbandInputSystem } from "./systems/WarbandInputSystem";
import { WarbandCombatSystem } from "./systems/WarbandCombatSystem";
import { WarbandPhysicsSystem } from "./systems/WarbandPhysicsSystem";
import { WarbandAISystem } from "./systems/WarbandAISystem";

// ---------------------------------------------------------------------------
// Campaign config
// ---------------------------------------------------------------------------

const MAP_W = 1600;
const MAP_H = 1000;
const CITY_RADIUS = 18;
const PARTY_RADIUS = 8;
const PLAYER_SPEED = 2.2; // pixels per frame at 60 fps
const AI_SPEED = 1.0;
const ENGAGEMENT_DIST = 22; // how close parties must be to trigger battle
const DAY_TICKS = 3600; // ~60 seconds real-time = 1 day
const HIRE_COST_MULT = 1.0;
const STARTING_GOLD = 5000;
const GOLD_PER_DAY = 50;
const LOOT_PER_UNIT = 15;
const MAX_PARTY_SIZE = 80;
const ROVING_BAND_COUNT = 12;
const REINFORCEMENT_INTERVAL = 18000; // ~5 minutes, cities spawn new defenders
const CITY_MAX_GARRISON = 40;
const UPKEEP_PER_TIER: Record<number, number> = { 1: 2, 2: 4, 3: 7, 4: 12, 5: 18 };

// Fog of war
const FOG_CELL_SIZE = 10; // each fog cell covers 10x10 px
const FOG_GRID_W = Math.ceil(MAP_W / FOG_CELL_SIZE);
const FOG_GRID_H = Math.ceil(MAP_H / FOG_CELL_SIZE);
const SCOUT_RADIUS = 80; // player scouting radius in px
const CITY_SCOUT_RADIUS = 60; // allied city reveal radius

// Caravans & wandering NPCs
const CARAVAN_COUNT = 4;
const CARAVAN_SPEED = 0.6;
const WANDERING_NPC_COUNT = 3;

// Campaign events
const EVENT_CHECK_INTERVAL = 7; // check for events every N days
const EVENT_MIN_DAY = 5; // earliest day for random events

// Hero progression
const HERO_MAX_LEVEL = 20;
const HERO_XP_PER_LEVEL = 150; // level N requires N * 150 XP

const HERO_PERKS = [
  { id: "swift", name: "Swift", desc: "+15% map movement speed", color: "#66ccff" },
  { id: "commander", name: "Commander", desc: "+5 max party size", color: "#88aa66" },
  { id: "merchant", name: "Merchant", desc: "+20% city income", color: "#ffcc44" },
  { id: "veteran", name: "Veteran", desc: "+20 HP for hero in battle", color: "#cc6644" },
  { id: "intimidate", name: "Intimidate", desc: "10% chance enemies flee", color: "#aa66cc" },
  { id: "looter", name: "Looter", desc: "+30% loot from battles", color: "#ccaa44" },
  { id: "logistician", name: "Logistician", desc: "-15% food consumption", color: "#66aa88" },
  { id: "engineer", name: "Engineer", desc: "-20% building costs", color: "#8888cc" },
  { id: "tactician", name: "Tactician", desc: "+10% flanking damage bonus", color: "#cc8866" },
] as const;

// ---------------------------------------------------------------------------
// Seasons
// ---------------------------------------------------------------------------

type Season = "spring" | "summer" | "autumn" | "winter";
const SEASON_LENGTH_DAYS = 30; // each season lasts 30 days
const SEASON_ORDER: Season[] = ["spring", "summer", "autumn", "winter"];
const SEASON_EFFECTS: Record<Season, { speedMult: number; incomeMult: number; foodMult: number; color: string; label: string }> = {
  spring: { speedMult: 1.0, incomeMult: 1.1, foodMult: 1.0, color: "#88cc66", label: "Spring" },
  summer: { speedMult: 1.1, incomeMult: 1.2, foodMult: 0.9, color: "#ddaa33", label: "Summer" },
  autumn: { speedMult: 0.95, incomeMult: 1.0, foodMult: 1.1, color: "#cc8844", label: "Autumn" },
  winter: { speedMult: 0.75, incomeMult: 0.7, foodMult: 1.4, color: "#88aacc", label: "Winter" },
};

// ---------------------------------------------------------------------------
// Food / Supply system
// ---------------------------------------------------------------------------

const FOOD_PER_UNIT_PER_DAY = 0.5; // each unit consumes 0.5 food/day
const FOOD_PURCHASE_COST = 2; // gold per food unit
const FOOD_CITY_STOCK = 50; // food available at cities
const MORALE_FOOD_PENALTY = -5; // morale penalty when out of food
const MORALE_TERRITORY_BONUS = 2; // morale bonus near own cities
const MORALE_VICTORY_BONUS = 10;
const MORALE_DEFEAT_PENALTY = -15;
const MORALE_MAX = 100;
const MORALE_MIN = 0;
const MORALE_DESERTION_THRESHOLD = 20; // units desert below this

// ---------------------------------------------------------------------------
// Named AI Lords
// ---------------------------------------------------------------------------

type LordPersonality = "aggressive" | "cautious" | "mercantile" | "diplomatic" | "ruthless";

const LORD_NAMES = [
  "Aldric the Bold", "Baron Vexmoor", "Countess Miravel", "Duke Harren",
  "Earl Blackthorn", "Freya Ironheart", "General Corvus", "Hector Stormborn",
  "Ingrid Frostbane", "Jarl Ulfric", "King Roderic", "Lady Ashworth",
  "Marshal Kaine", "Nadia Shadowveil", "Overlord Theron", "Prince Caelum",
  "Queen Seraphina", "Ragnor the Grim", "Sir Percival", "Thane Godfrey",
  "Ulyana the Swift", "Viscount Dray", "Warlord Grimjaw", "Xavier Duskwalker",
];

const LORD_TITLES: Record<LordPersonality, string> = {
  aggressive: "Warlord", cautious: "Steward", mercantile: "Merchant Prince",
  diplomatic: "Envoy", ruthless: "Tyrant",
};

interface CampaignLord {
  id: string;
  name: string;
  personality: LordPersonality;
  factionId: string;
  partyId: string;
  level: number;
  renown: number;
  capturedBy: string | null;
  ransomCost: number;
  rivalLordId: string | null; // personal rival
}

// ---------------------------------------------------------------------------
// Companion Heroes
// ---------------------------------------------------------------------------

type CompanionClass = "warrior" | "archer" | "mage" | "scout";

const COMPANION_DEFS = [
  { name: "Gareth Ironhelm", class: "warrior" as CompanionClass, skill: "shield_wall", skillDesc: "+15% defense for all melee units", personality: "Loyal and straightforward" },
  { name: "Lyra Swiftshadow", class: "scout" as CompanionClass, skill: "pathfinder", skillDesc: "+10% map movement speed", personality: "Cunning and resourceful" },
  { name: "Theron Flamecaller", class: "mage" as CompanionClass, skill: "arcane_barrage", skillDesc: "+20% spell damage in battle", personality: "Proud and ambitious" },
  { name: "Mira Trueshot", class: "archer" as CompanionClass, skill: "eagle_eye", skillDesc: "+15% ranged accuracy", personality: "Calm and precise" },
  { name: "Bjorn Thunderfist", class: "warrior" as CompanionClass, skill: "berserker_rage", skillDesc: "+25% melee damage when HP < 50%", personality: "Hot-headed and brave" },
  { name: "Elara Moonwhisper", class: "mage" as CompanionClass, skill: "healing_aura", skillDesc: "Heals 5 HP/tick to nearby allies", personality: "Kind and mysterious" },
  { name: "Kael Darkblade", class: "scout" as CompanionClass, skill: "ambush_master", skillDesc: "+20% ambush damage bonus", personality: "Quiet and deadly" },
  { name: "Senna Goldtongue", class: "archer" as CompanionClass, skill: "merchant_contacts", skillDesc: "+15% trade profits", personality: "Charming and shrewd" },
];

interface Companion {
  id: string;
  name: string;
  class: CompanionClass;
  level: number;
  xp: number;
  loyalty: number; // 0-100
  skill: string;
  skillDesc: string;
  personality: string;
  recruited: boolean;
  locationX: number;
  locationY: number;
  quest: CompanionQuest | null;
}

interface CompanionQuest {
  id: string;
  name: string;
  description: string;
  targetX: number;
  targetY: number;
  type: "kill_lord" | "explore_location" | "deliver_goods" | "defend_city";
  targetId: string;
  completed: boolean;
  rewardGold: number;
  rewardLoyalty: number;
  rewardXp: number;
}

// ---------------------------------------------------------------------------
// Town Buildings
// ---------------------------------------------------------------------------

type BuildingType = "training_grounds" | "walls" | "market" | "stables" | "siege_workshop" | "mage_tower";

interface BuildingDef {
  type: BuildingType;
  name: string;
  desc: string;
  maxLevel: number;
  baseCost: number; // cost per level
  color: string;
}

const BUILDING_DEFS: BuildingDef[] = [
  { type: "training_grounds", name: "Training Grounds", desc: "+50% unit XP gain per level", maxLevel: 3, baseCost: 800, color: "#cc6644" },
  { type: "walls", name: "Fortifications", desc: "+10 garrison cap and +20% garrison defense per level", maxLevel: 3, baseCost: 1000, color: "#8888aa" },
  { type: "market", name: "Market", desc: "+30 gold/day income per level", maxLevel: 3, baseCost: 600, color: "#ddaa33" },
  { type: "stables", name: "Stables", desc: "Unlocks cavalry recruitment, -10% cavalry cost per level", maxLevel: 2, baseCost: 700, color: "#aa8855" },
  { type: "siege_workshop", name: "Siege Workshop", desc: "Unlocks siege equipment crafting", maxLevel: 2, baseCost: 1200, color: "#666688" },
  { type: "mage_tower", name: "Mage Tower", desc: "Unlocks mage recruitment, +1 mage tier per level", maxLevel: 2, baseCost: 900, color: "#8844cc" },
];

interface CityBuilding {
  type: BuildingType;
  level: number;
}

// ---------------------------------------------------------------------------
// Trade Goods
// ---------------------------------------------------------------------------

interface TradeGood {
  name: string;
  basePrice: number;
  category: "food" | "luxury" | "military" | "raw";
}

const TRADE_GOODS: TradeGood[] = [
  { name: "Grain", basePrice: 20, category: "food" },
  { name: "Salted Meat", basePrice: 35, category: "food" },
  { name: "Wine", basePrice: 50, category: "luxury" },
  { name: "Spices", basePrice: 80, category: "luxury" },
  { name: "Silk", basePrice: 100, category: "luxury" },
  { name: "Iron", basePrice: 45, category: "military" },
  { name: "Weapons", basePrice: 70, category: "military" },
  { name: "Lumber", basePrice: 25, category: "raw" },
  { name: "Stone", basePrice: 30, category: "raw" },
  { name: "Horses", basePrice: 120, category: "military" },
];

interface CityTradeSlot {
  good: string;
  price: number; // current price (varies by supply/demand)
  stock: number;
}

// ---------------------------------------------------------------------------
// Mercenary Contracts
// ---------------------------------------------------------------------------

interface MercContract {
  id: string;
  name: string;
  units: { unitId: string; count: number }[];
  cost: number;
  duration: number; // days remaining
  hired: boolean;
}

const MERC_COMPANY_NAMES = [
  "The Iron Company", "Crimson Wolves", "Blackwater Sellswords", "The Golden Lances",
  "Shadow Stalkers", "The Warhounds", "Stormbreaker Legion", "Silver Serpents",
];

// ---------------------------------------------------------------------------
// Victory Conditions
// ---------------------------------------------------------------------------

interface VictoryProgress {
  conquest: { citiesCaptured: number; totalCities: number };
  diplomatic: { alliances: number; required: number };
  economic: { goldAccumulated: number; target: number };
}

const VICTORY_ECONOMIC_TARGET = 50000;
const VICTORY_ALLIANCE_REQUIRED = 3;

// ---------------------------------------------------------------------------
// Siege Equipment
// ---------------------------------------------------------------------------

type SiegeEquipType = "battering_ram" | "siege_tower" | "catapult_siege" | "ladders";

interface SiegeEquipment {
  type: SiegeEquipType;
  name: string;
  cost: number;
  buildTime: number; // days to build
  effect: string;
}

const SIEGE_EQUIPMENT_DEFS: SiegeEquipment[] = [
  { type: "ladders", name: "Siege Ladders", cost: 200, buildTime: 1, effect: "Basic wall scaling, -10% attack penalty" },
  { type: "battering_ram", name: "Battering Ram", cost: 500, buildTime: 2, effect: "Break gates, bypass wall defense bonus" },
  { type: "siege_tower", name: "Siege Tower", cost: 800, buildTime: 3, effect: "Scale walls with no penalty" },
  { type: "catapult_siege", name: "Siege Catapult", cost: 1000, buildTime: 3, effect: "Bombardment: -20% garrison before battle" },
];

type HeroPerkId = typeof HERO_PERKS[number]["id"];

// Factions to use on the campaign map (exclude "op")
const CAMPAIGN_FACTIONS = RACE_DEFINITIONS.filter(
  (r) => r.implemented && r.id !== "op",
);

// ---------------------------------------------------------------------------
// Unit type defs (mirrored from WarbandGame for army composition)
// ---------------------------------------------------------------------------

interface CampaignUnitType {
  id: string;
  name: string;
  mainHand: string;
  offHand: string | null;
  head: string;
  torso: string;
  gauntlets: string;
  legs: string;
  boots: string;
  horseArmor?: HorseArmorTier;
  creatureType?: CreatureType;
  scale?: number;
  hpOverride?: number;
  speedMultiplier?: number;
  cost: number;
  tier: number;
  building: string;
  faction?: string;
}

// Basic unit roster available at cities (cost already computed)
const CAMPAIGN_UNITS: CampaignUnitType[] = [
  { id: "swordsman", name: "Swordsman", mainHand: "arming_sword", offHand: "heater_shield", head: "spangenhelm", torso: "mail_shirt", gauntlets: "leather_gloves", legs: "cuisses", boots: "leather_boots", cost: 100, tier: 1, building: "barracks" },
  { id: "archer", name: "Archer", mainHand: "long_bow", offHand: null, head: "leather_cap", torso: "leather_jerkin", gauntlets: "leather_gloves", legs: "leather_leggings", boots: "leather_boots", cost: 100, tier: 1, building: "archery" },
  { id: "pikeman", name: "Pikeman", mainHand: "pike", offHand: null, head: "mail_coif", torso: "mail_shirt", gauntlets: "leather_gloves", legs: "cuisses", boots: "leather_boots", cost: 125, tier: 2, building: "barracks" },
  { id: "crossbowman", name: "Crossbowman", mainHand: "arbalest", offHand: "pavise", head: "kettle_hat", torso: "lamellar", gauntlets: "leather_gloves", legs: "cuisses", boots: "leather_boots", cost: 150, tier: 2, building: "archery" },
  { id: "knight", name: "Knight", mainHand: "arming_sword", offHand: "kite_shield", head: "nasal_helm", torso: "surcoat_over_mail", gauntlets: "mail_gauntlets", legs: "mail_chausses", boots: "armored_boots", cost: 200, tier: 3, building: "barracks" },
  { id: "halberdier", name: "Halberdier", mainHand: "halberd", offHand: null, head: "kettle_hat", torso: "chain_hauberk", gauntlets: "mail_gauntlets", legs: "mail_chausses", boots: "mail_boots", cost: 175, tier: 2, building: "barracks" },
  { id: "berserker", name: "Berserker", mainHand: "zweihander", offHand: null, head: "leather_cap", torso: "gambeson", gauntlets: "leather_gloves", legs: "padded_leggings", boots: "leather_boots", cost: 150, tier: 2, building: "barracks" },
  { id: "scout_cavalry", name: "Scout Cavalry", mainHand: "pike", offHand: null, head: "leather_cap", torso: "leather_jerkin", gauntlets: "leather_gloves", legs: "leather_leggings", boots: "leather_boots", horseArmor: "light", cost: 200, tier: 3, building: "stables" },
  { id: "lancer", name: "Lancer", mainHand: "lance", offHand: "kite_shield", head: "bascinet", torso: "brigandine", gauntlets: "mail_gauntlets", legs: "splinted_greaves", boots: "chain_sabatons", horseArmor: "heavy", cost: 350, tier: 4, building: "stables" },
  { id: "horse_archer", name: "Horse Archer", mainHand: "long_bow", offHand: null, head: "spangenhelm", torso: "lamellar", gauntlets: "leather_gloves", legs: "cuisses", boots: "riding_boots", horseArmor: "medium", cost: 275, tier: 3, building: "stables" },
  { id: "fire_mage", name: "Fire Mage", mainHand: "fire_staff", offHand: null, head: "leather_cap", torso: "gambeson", gauntlets: "leather_gloves", legs: "leather_leggings", boots: "leather_boots", cost: 250, tier: 3, building: "mages" },
  { id: "storm_mage", name: "Storm Mage", mainHand: "storm_staff", offHand: null, head: "leather_cap", torso: "gambeson", gauntlets: "leather_gloves", legs: "leather_leggings", boots: "leather_boots", cost: 275, tier: 3, building: "mages" },
  { id: "cleric", name: "Cleric", mainHand: "healing_staff", offHand: null, head: "spangenhelm", torso: "mail_shirt", gauntlets: "leather_gloves", legs: "cuisses", boots: "leather_boots", cost: 225, tier: 3, building: "temple" },
  { id: "defender", name: "Defender", mainHand: "arming_sword", offHand: "tower_shield", head: "bascinet", torso: "brigandine", gauntlets: "mail_gauntlets", legs: "splinted_greaves", boots: "chain_sabatons", cost: 275, tier: 3, building: "barracks" },
  { id: "longbowman", name: "Longbowman", mainHand: "long_bow", offHand: null, head: "kettle_hat", torso: "gambeson", gauntlets: "leather_gloves", legs: "leather_leggings", boots: "leather_boots", cost: 175, tier: 2, building: "archery" },
];

const UNIT_UPGRADE_PATH: Record<string, string> = {
  swordsman: "knight", archer: "longbowman", pikeman: "halberdier",
  crossbowman: "crossbowman", berserker: "berserker", longbowman: "longbowman",
  knight: "defender", halberdier: "halberdier", scout_cavalry: "lancer",
  horse_archer: "horse_archer", fire_mage: "fire_mage", storm_mage: "storm_mage",
  cleric: "cleric", defender: "defender", lancer: "lancer",
};
const XP_PROMOTE_THRESHOLD = 100;
const XP_WIN = 25;
const XP_LOSS = 10;

function _xpBar(xp: number): string {
  const filled = Math.floor((xp / XP_PROMOTE_THRESHOLD) * 6);
  const empty = 6 - filled;
  return `[${"█".repeat(filled)}${"░".repeat(empty)} ${xp}/${XP_PROMOTE_THRESHOLD}]`;
}

// Faction-specific elite units (one per faction, added to cities of that faction)
const FACTION_ELITES: Record<string, CampaignUnitType> = {};

// Build faction elites from RACE_DEFINITIONS faction units
for (const race of CAMPAIGN_FACTIONS) {
  // Use first faction unit name as the elite
  const eliteId = race.factionUnits[0]?.toLowerCase().replace(/ /g, "_") ?? race.id + "_elite";
  // We'll just create a strong generic unit keyed by faction
  FACTION_ELITES[race.id] = {
    id: eliteId,
    name: race.name + " Elite",
    mainHand: "arming_sword",
    offHand: "kite_shield",
    head: "bascinet",
    torso: "brigandine",
    gauntlets: "mail_gauntlets",
    legs: "splinted_greaves",
    boots: "chain_sabatons",
    cost: 400,
    tier: 5,
    building: "faction",
    faction: race.id,
    hpOverride: 160,
  };
}

// ---------------------------------------------------------------------------
// Terrain
// ---------------------------------------------------------------------------

type TerrainKind = "forest" | "mountains" | "desert" | "swamp" | "snow" | "lake" | "hills";

const TERRAIN_SPEED_MULT: Record<TerrainKind, number> = {
  forest: 0.7,
  mountains: 0.5,
  hills: 0.8,
  desert: 0.75,
  swamp: 0.5,
  snow: 0.65,
  lake: 0.15,
};

/** Return the worst (lowest) speed multiplier for a point and the terrain name, or null if on plains. */
function _getTerrainAt(x: number, y: number, terrain: TerrainRegion[]): { mult: number; name: TerrainKind } | null {
  let worst: { mult: number; name: TerrainKind } | null = null;
  for (const region of terrain) {
    const d = Math.hypot(x - region.x, y - region.y);
    if (d < region.r) {
      const m = TERRAIN_SPEED_MULT[region.type];
      if (!worst || m < worst.mult) {
        worst = { mult: m, name: region.type };
      }
    }
  }
  return worst;
}

interface TerrainRegion {
  x: number;
  y: number;
  r: number;
  type: TerrainKind;
  // Pre-baked scatter features (trees, rocks, etc.)
  features: { dx: number; dy: number; size: number; variant: number }[];
}

// Simple value-noise (seeded) for ground variation
function _hash(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263 + 1274126177) | 0;
  h = ((h ^ (h >> 13)) * 1274126177) | 0;
  return (h & 0x7fffffff) / 0x7fffffff;
}

function _noise(px: number, py: number, scale: number): number {
  const sx = px / scale;
  const sy = py / scale;
  const ix = Math.floor(sx);
  const iy = Math.floor(sy);
  const fx = sx - ix;
  const fy = sy - iy;
  const a = _hash(ix, iy);
  const b = _hash(ix + 1, iy);
  const c = _hash(ix, iy + 1);
  const d = _hash(ix + 1, iy + 1);
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function _generateScatterFeatures(
  _cx: number, _cy: number, r: number, type: TerrainKind,
): TerrainRegion["features"] {
  const features: TerrainRegion["features"] = [];
  const density = type === "forest" ? 0.012 : type === "mountains" ? 0.006
    : type === "swamp" ? 0.008 : type === "hills" ? 0.005
    : type === "snow" ? 0.004 : type === "desert" ? 0.003 : 0;
  const area = Math.PI * r * r;
  const count = Math.floor(area * density);
  for (let i = 0; i < count; i++) {
    // Random point inside circle
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.sqrt(Math.random()) * r * 0.9;
    features.push({
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist,
      size: 0.5 + Math.random() * 1.0,
      variant: Math.floor(Math.random() * 4),
    });
  }
  return features;
}

function _generateTerrain(): TerrainRegion[] {
  const regions: TerrainRegion[] = [];
  const types: TerrainKind[] = ["forest", "forest", "mountains", "hills", "desert", "swamp", "snow", "lake"];
  const count = 20 + Math.floor(Math.random() * 12);
  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const r = type === "lake" ? 25 + Math.random() * 40
      : type === "mountains" ? 50 + Math.random() * 70
      : 40 + Math.random() * 80;
    const region: TerrainRegion = {
      x: 60 + Math.random() * (MAP_W - 120),
      y: 60 + Math.random() * (MAP_H - 120),
      r,
      type,
      features: [],
    };
    region.features = _generateScatterFeatures(region.x, region.y, region.r, region.type);
    regions.push(region);
  }
  return regions;
}

// ---------------------------------------------------------------------------
// Rivers - winding waterways across the map
// ---------------------------------------------------------------------------

interface RiverPoint { x: number; y: number; width: number }
interface River { points: RiverPoint[] }

function _generateRivers(terrain: TerrainRegion[]): River[] {
  const rivers: River[] = [];
  const count = 2 + Math.floor(Math.random() * 3);
  for (let r = 0; r < count; r++) {
    const pts: RiverPoint[] = [];
    // Start from a mountain region or map edge
    const mtns = terrain.filter(t => t.type === "mountains");
    let sx: number, sy: number;
    if (mtns.length > 0 && Math.random() < 0.6) {
      const m = mtns[Math.floor(Math.random() * mtns.length)];
      sx = m.x + (Math.random() - 0.5) * m.r;
      sy = m.y + (Math.random() - 0.5) * m.r;
    } else {
      // Start from a map edge
      const edge = Math.floor(Math.random() * 4);
      sx = edge === 0 ? 10 : edge === 1 ? MAP_W - 10 : 40 + Math.random() * (MAP_W - 80);
      sy = edge === 2 ? 10 : edge === 3 ? MAP_H - 10 : 40 + Math.random() * (MAP_H - 80);
    }
    let cx = sx, cy = sy;
    const angle = Math.random() * Math.PI * 2;
    const baseW = 2 + Math.random() * 3;
    const segCount = 30 + Math.floor(Math.random() * 20);
    let da = angle;
    for (let i = 0; i <= segCount; i++) {
      const t = i / segCount;
      const w = baseW * (0.4 + t * 0.8) + Math.sin(i * 0.5) * 0.8;
      pts.push({ x: cx, y: cy, width: w });
      da += (Math.random() - 0.5) * 0.6;
      const step = 20 + Math.random() * 15;
      cx += Math.cos(da) * step;
      cy += Math.sin(da) * step;
      if (cx < 5 || cx > MAP_W - 5 || cy < 5 || cy > MAP_H - 5) break;
    }
    if (pts.length > 4) rivers.push({ points: pts });
  }
  return rivers;
}

function _drawRiver(ctx: CanvasRenderingContext2D, river: River): void {
  if (river.points.length < 2) return;
  const pts = river.points;

  // River body - darker water
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let pass = 0; pass < 3; pass++) {
    const widthMult = pass === 0 ? 1.4 : pass === 1 ? 1.0 : 0.6;
    ctx.strokeStyle = pass === 0 ? "rgba(25,50,70,0.5)"
      : pass === 1 ? "rgba(30,60,90,0.6)"
      : "rgba(50,85,120,0.4)";
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 1];
      const p1 = pts[i];
      const mx = (p0.x + p1.x) / 2;
      const my = (p0.y + p1.y) / 2;
      ctx.lineWidth = p0.width * widthMult;
      ctx.quadraticCurveTo(p0.x, p0.y, mx, my);
    }
    ctx.stroke();
  }

  // Specular highlights
  ctx.strokeStyle = "rgba(140,190,220,0.18)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 2; i < pts.length - 1; i += 3) {
    const p = pts[i];
    ctx.moveTo(p.x - p.width * 0.3, p.y - 0.5);
    ctx.lineTo(p.x + p.width * 0.3, p.y - 0.5);
  }
  ctx.stroke();

  ctx.restore();
}

// ---------------------------------------------------------------------------
// Coastline - ocean edges for the map
// ---------------------------------------------------------------------------

function _drawCoastline(ctx: CanvasRenderingContext2D): void {
  // Draw ocean/sea along 1-2 edges of the map for a peninsula feel
  const edge = Math.floor(_hash(42, 73) * 4); // deterministic edge choice
  ctx.save();

  // Ocean gradient
  const drawOceanEdge = (x1: number, y1: number, x2: number, y2: number, depth: number, inward: boolean) => {
    // Irregular coastline using noise
    ctx.fillStyle = "rgba(20,45,75,0.7)";
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    const steps = 60;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const bx = x1 + (x2 - x1) * t;
      const by = y1 + (y2 - y1) * t;
      const n = _noise(bx * 3, by * 3, 80) * depth * 0.5 + depth * 0.3;
      const dx = inward ? (x1 === x2 ? (x1 < MAP_W / 2 ? n : -n) : 0) : 0;
      const dy = inward ? (y1 === y2 ? (y1 < MAP_H / 2 ? n : -n) : 0) : 0;
      ctx.lineTo(bx + dx, by + dy);
    }
    // Close along the edge
    ctx.lineTo(x2, y2);
    if (x1 === x2) {
      // Vertical edge - close along the actual edge
      ctx.lineTo(x2, y2);
      ctx.lineTo(x1, y1);
    }
    ctx.closePath();
    ctx.fill();

    // Foam line along the coast
    ctx.strokeStyle = "rgba(180,210,230,0.25)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const bx = x1 + (x2 - x1) * t;
      const by = y1 + (y2 - y1) * t;
      const n = _noise(bx * 3, by * 3, 80) * depth * 0.5 + depth * 0.3;
      const dx = x1 === x2 ? (x1 < MAP_W / 2 ? n : -n) : 0;
      const dy = y1 === y2 ? (y1 < MAP_H / 2 ? n : -n) : 0;
      if (i === 0) ctx.moveTo(bx + dx, by + dy);
      else ctx.lineTo(bx + dx, by + dy);
    }
    ctx.stroke();

    // Sandy beach strip
    ctx.strokeStyle = "rgba(180,165,120,0.2)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const bx = x1 + (x2 - x1) * t;
      const by = y1 + (y2 - y1) * t;
      const n = _noise(bx * 3, by * 3, 80) * depth * 0.5 + depth * 0.3;
      const nudge = 4;
      const dx = x1 === x2 ? (x1 < MAP_W / 2 ? n + nudge : -n - nudge) : 0;
      const dy = y1 === y2 ? (y1 < MAP_H / 2 ? n + nudge : -n - nudge) : 0;
      if (i === 0) ctx.moveTo(bx + dx, by + dy);
      else ctx.lineTo(bx + dx, by + dy);
    }
    ctx.stroke();
  };

  const depth = 50;
  // Always draw one ocean edge
  if (edge === 0 || edge === 2) {
    drawOceanEdge(0, 0, 0, MAP_H, depth, true); // left edge
  }
  if (edge === 1 || edge === 3) {
    drawOceanEdge(0, MAP_H, MAP_W, MAP_H, depth, true); // bottom edge
  }

  ctx.restore();
}

// ---------------------------------------------------------------------------
// Road drawing between cities - proper worn paths
// ---------------------------------------------------------------------------

function _drawRoads(ctx: CanvasRenderingContext2D, cities: CampaignCity[]): void {
  ctx.save();
  // Connect each city to its nearest 2-3 cities regardless of faction
  const connections = new Set<string>();
  for (const city of cities) {
    const sorted = [...cities]
      .filter(c => c.id !== city.id)
      .sort((a, b) => Math.hypot(a.x - city.x, a.y - city.y) - Math.hypot(b.x - city.x, b.y - city.y));
    const connectCount = Math.min(2 + Math.floor(Math.random() * 2), sorted.length);
    for (let i = 0; i < connectCount; i++) {
      const other = sorted[i];
      const key = [city.id, other.id].sort().join("-");
      if (connections.has(key)) continue;
      const dist = Math.hypot(city.x - other.x, city.y - other.y);
      if (dist > 500) continue;
      connections.add(key);

      // Draw a winding road
      const segs = 12;
      const points: { x: number; y: number }[] = [];
      for (let s = 0; s <= segs; s++) {
        const t = s / segs;
        const bx = city.x + (other.x - city.x) * t;
        const by = city.y + (other.y - city.y) * t;
        // Perturb mid-points for a winding look
        const perp = Math.sin(t * Math.PI) * 20;
        const nx = bx + _noise(bx + 200, by + 200, 50) * perp - perp * 0.5;
        const ny = by + _noise(bx + 400, by + 400, 50) * perp - perp * 0.5;
        points.push({ x: nx, y: ny });
      }

      // Road shadow
      ctx.strokeStyle = "rgba(40,30,15,0.15)";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(points[0].x + 1, points[0].y + 1);
      for (let p = 1; p < points.length; p++) {
        ctx.lineTo(points[p].x + 1, points[p].y + 1);
      }
      ctx.stroke();

      // Main road path
      ctx.strokeStyle = "rgba(120,100,65,0.28)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let p = 1; p < points.length; p++) {
        const prev = points[p - 1];
        const cur = points[p];
        const mx = (prev.x + cur.x) / 2;
        const my = (prev.y + cur.y) / 2;
        ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
      }
      ctx.stroke();

      // Center line (worn path)
      ctx.strokeStyle = "rgba(150,130,85,0.15)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let p = 1; p < points.length; p++) {
        const prev = points[p - 1];
        const cur = points[p];
        const mx = (prev.x + cur.x) / 2;
        const my = (prev.y + cur.y) / 2;
        ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
      }
      ctx.stroke();
    }
  }
  ctx.restore();
}

// Pre-render the static ground texture to an offscreen canvas
function _bakeGroundTexture(terrain: TerrainRegion[], cities?: CampaignCity[]): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = MAP_W;
  c.height = MAP_H;
  const g = c.getContext("2d")!;

  // Base ground: multi-octave noise for natural coloring
  const imgData = g.createImageData(MAP_W, MAP_H);
  const d = imgData.data;
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const n1 = _noise(x, y, 120);
      const n2 = _noise(x + 500, y + 300, 60) * 0.5;
      const n3 = _noise(x + 1000, y + 800, 30) * 0.25;
      const v = n1 + n2 + n3;
      // Green-brown grass palette
      const r = 32 + v * 28;
      const gr = 48 + v * 35;
      const b = 22 + v * 15;
      const idx = (y * MAP_W + x) * 4;
      d[idx] = r;
      d[idx + 1] = gr;
      d[idx + 2] = b;
      d[idx + 3] = 255;
    }
  }
  g.putImageData(imgData, 0, 0);

  // Paint terrain regions on top
  for (const t of terrain) {
    const grad = g.createRadialGradient(t.x, t.y, 0, t.x, t.y, t.r);
    switch (t.type) {
      case "forest":
        grad.addColorStop(0, "rgba(20,65,18,0.55)");
        grad.addColorStop(0.7, "rgba(25,55,20,0.35)");
        grad.addColorStop(1, "rgba(30,50,25,0)");
        break;
      case "mountains":
        grad.addColorStop(0, "rgba(90,80,70,0.6)");
        grad.addColorStop(0.5, "rgba(75,70,60,0.4)");
        grad.addColorStop(1, "rgba(60,55,45,0)");
        break;
      case "hills":
        grad.addColorStop(0, "rgba(70,75,45,0.4)");
        grad.addColorStop(0.7, "rgba(55,60,35,0.2)");
        grad.addColorStop(1, "rgba(45,50,30,0)");
        break;
      case "desert":
        grad.addColorStop(0, "rgba(170,150,90,0.5)");
        grad.addColorStop(0.6, "rgba(150,135,80,0.3)");
        grad.addColorStop(1, "rgba(130,115,70,0)");
        break;
      case "swamp":
        grad.addColorStop(0, "rgba(40,60,35,0.55)");
        grad.addColorStop(0.5, "rgba(35,55,30,0.35)");
        grad.addColorStop(1, "rgba(30,50,25,0)");
        break;
      case "snow":
        grad.addColorStop(0, "rgba(210,215,225,0.5)");
        grad.addColorStop(0.6, "rgba(190,200,210,0.3)");
        grad.addColorStop(1, "rgba(170,180,190,0)");
        break;
      case "lake":
        grad.addColorStop(0, "rgba(30,55,100,0.7)");
        grad.addColorStop(0.6, "rgba(35,60,90,0.5)");
        grad.addColorStop(0.85, "rgba(40,65,80,0.25)");
        grad.addColorStop(1, "rgba(45,60,65,0)");
        break;
    }
    g.fillStyle = grad;
    g.beginPath();
    g.arc(t.x, t.y, t.r, 0, Math.PI * 2);
    g.fill();
  }

  // Draw scatter features on the baked texture
  for (const t of terrain) {
    for (const f of t.features) {
      const fx = t.x + f.dx;
      const fy = t.y + f.dy;
      switch (t.type) {
        case "forest":
          _drawTree(g, fx, fy, f.size, f.variant);
          break;
        case "mountains":
          _drawMountainPeak(g, fx, fy, f.size);
          break;
        case "hills":
          _drawHill(g, fx, fy, f.size);
          break;
        case "swamp":
          _drawSwampReeds(g, fx, fy, f.size);
          break;
        case "snow":
          _drawSnowDrift(g, fx, fy, f.size);
          break;
        case "desert":
          _drawDune(g, fx, fy, f.size);
          break;
      }
    }
  }

  // Lake surface shine
  for (const t of terrain) {
    if (t.type !== "lake") continue;
    g.save();
    g.globalAlpha = 0.15;
    g.fillStyle = "rgba(120,180,255,1)";
    g.beginPath();
    g.ellipse(t.x - t.r * 0.15, t.y - t.r * 0.2, t.r * 0.3, t.r * 0.12, -0.3, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }

  // Rivers
  const rivers = _generateRivers(terrain);
  for (const river of rivers) {
    _drawRiver(g, river);
  }

  // Coastline / ocean edges
  _drawCoastline(g);

  // Roads between cities
  if (cities && cities.length > 0) {
    _drawRoads(g, cities);
  }

  // Scattered grass detail on plains
  g.save();
  for (let i = 0; i < 400; i++) {
    const gx = Math.random() * MAP_W;
    const gy = Math.random() * MAP_H;
    const inTerrain = terrain.some(t => Math.hypot(gx - t.x, gy - t.y) < t.r * 0.8);
    if (inTerrain) continue;
    g.fillStyle = `rgba(${35 + Math.random() * 20},${55 + Math.random() * 25},${20 + Math.random() * 10},0.25)`;
    const gs = 1 + Math.random() * 2;
    g.beginPath();
    g.ellipse(gx, gy, gs, gs * 0.3, Math.random() * Math.PI, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();

  // Subtle vignette at map edges
  const edgeGrad = g.createRadialGradient(MAP_W / 2, MAP_H / 2, Math.min(MAP_W, MAP_H) * 0.35, MAP_W / 2, MAP_H / 2, Math.max(MAP_W, MAP_H) * 0.6);
  edgeGrad.addColorStop(0, "rgba(0,0,0,0)");
  edgeGrad.addColorStop(1, "rgba(0,0,0,0.25)");
  g.fillStyle = edgeGrad;
  g.fillRect(0, 0, MAP_W, MAP_H);

  return c;
}

function _drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, variant: number): void {
  const h = 6 * s;
  // Trunk
  ctx.fillStyle = "rgba(60,40,20,0.7)";
  ctx.fillRect(x - 0.8, y, 1.6, h * 0.4);
  // Canopy — two styles
  if (variant < 2) {
    // Conifer (triangle)
    ctx.fillStyle = variant === 0 ? "rgba(20,60,15,0.8)" : "rgba(30,70,25,0.8)";
    ctx.beginPath();
    ctx.moveTo(x, y - h * 0.7);
    ctx.lineTo(x - h * 0.35, y + h * 0.15);
    ctx.lineTo(x + h * 0.35, y + h * 0.15);
    ctx.closePath();
    ctx.fill();
  } else {
    // Deciduous (round)
    ctx.fillStyle = variant === 2 ? "rgba(25,65,20,0.8)" : "rgba(40,80,30,0.8)";
    ctx.beginPath();
    ctx.arc(x, y - h * 0.15, h * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }
}

function _drawMountainPeak(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  const h = 10 * s;
  const w = 7 * s;
  ctx.fillStyle = "rgba(80,75,65,0.7)";
  ctx.beginPath();
  ctx.moveTo(x, y - h);
  ctx.lineTo(x - w, y);
  ctx.lineTo(x + w, y);
  ctx.closePath();
  ctx.fill();
  // Snow cap
  ctx.fillStyle = "rgba(220,225,235,0.6)";
  ctx.beginPath();
  ctx.moveTo(x, y - h);
  ctx.lineTo(x - w * 0.3, y - h * 0.55);
  ctx.lineTo(x + w * 0.3, y - h * 0.55);
  ctx.closePath();
  ctx.fill();
}

function _drawHill(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  const r = 6 * s;
  ctx.fillStyle = "rgba(65,70,40,0.35)";
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  // Highlight
  ctx.fillStyle = "rgba(90,100,60,0.2)";
  ctx.beginPath();
  ctx.ellipse(x - r * 0.2, y - r * 0.15, r * 0.5, r * 0.25, -0.2, 0, Math.PI * 2);
  ctx.fill();
}

function _drawSwampReeds(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.strokeStyle = "rgba(50,70,30,0.6)";
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 3; i++) {
    const dx = (i - 1) * 2 * s;
    const h = 4 * s + i * s;
    ctx.beginPath();
    ctx.moveTo(x + dx, y);
    ctx.quadraticCurveTo(x + dx + s, y - h * 0.5, x + dx + s * 0.5, y - h);
    ctx.stroke();
  }
  // Water puddle
  ctx.fillStyle = "rgba(35,60,50,0.3)";
  ctx.beginPath();
  ctx.ellipse(x, y + 1, 3 * s, 1.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
}

function _drawSnowDrift(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.fillStyle = "rgba(220,225,235,0.4)";
  ctx.beginPath();
  ctx.ellipse(x, y, 5 * s, 2.5 * s, Math.random() * 0.5, 0, Math.PI * 2);
  ctx.fill();
}

function _drawDune(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.fillStyle = "rgba(180,160,100,0.25)";
  ctx.beginPath();
  ctx.ellipse(x, y, 6 * s, 2 * s, 0.3, 0, Math.PI * 2);
  ctx.fill();
  // Wind line
  ctx.strokeStyle = "rgba(200,180,120,0.2)";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(x - 4 * s, y);
  ctx.quadraticCurveTo(x, y - 1.5 * s, x + 5 * s, y + 0.5);
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// Faction color helpers
// ---------------------------------------------------------------------------

function _factionHex(factionId: string): string {
  const def = CAMPAIGN_FACTIONS.find((f) => f.id === factionId);
  return def ? `#${def.accentColor.toString(16).padStart(6, "0")}` : "#888888";
}

function _factionRGB(factionId: string): [number, number, number] {
  const def = CAMPAIGN_FACTIONS.find((f) => f.id === factionId);
  if (!def) return [128, 128, 128];
  const c = def.accentColor;
  return [(c >> 16) & 0xff, (c >> 8) & 0xff, c & 0xff];
}

// ---------------------------------------------------------------------------
// Campaign state types
// ---------------------------------------------------------------------------

interface CampaignCity {
  id: string;
  name: string;
  x: number;
  y: number;
  factionId: string;
  garrison: { unitId: string; count: number; xp: number }[];
  garrisonTotal: number;
  buildings: CityBuilding[];
  tradeGoods: CityTradeSlot[];
  foodStock: number;
  siegeEquipment: { type: SiegeEquipType; daysLeft: number }[]; // being built
}

interface CampaignVillage {
  id: string; name: string; x: number; y: number;
  factionId: string; income: number; population: number; linkedCityId: string;
}

interface SpecialLocation {
  id: string; name: string; x: number; y: number;
  type: "ruins" | "dungeon" | "lair" | "shrine" | "treasure";
  explored: boolean; difficulty: number;
  reward: { gold: number; unitId?: string; unitCount?: number };
}

// Merchant caravan
interface CampaignCaravan {
  id: string;
  x: number; y: number;
  targetCityId: string;
  originCityId: string;
  speed: number;
  goods: { name: string; cost: number }[];
}

// Wandering NPC
type WanderingNPCType = "hermit" | "messenger" | "refugee";
interface CampaignWanderingNPC {
  id: string;
  x: number; y: number;
  type: WanderingNPCType;
  name: string;
  interacted: boolean;
  targetX: number; targetY: number;
  speed: number;
  spawnDay: number;
}

// Campaign event
type CampaignEventType = "bandit_raid" | "merchant_festival" | "plague" | "deserters" | "alliance_offer";
interface CampaignEvent {
  id: string;
  type: CampaignEventType;
  name: string;
  description: string;
  targetCityId?: string;
  mapX?: number; mapY?: number;
  startDay: number;
  duration: number; // days
  active: boolean;
  data?: Record<string, unknown>;
}

interface CampaignParty {
  id: string;
  name: string;
  x: number;
  y: number;
  factionId: string;
  army: { unitId: string; count: number; xp: number }[];
  armyTotal: number;
  targetX: number;
  targetY: number;
  isPlayer: boolean;
  speed: number;
  homeCity?: string;
  retreatPenaltyUntilTick?: number; // retreat speed penalty
  lordId?: string; // if led by a named lord
  mercContractId?: string; // if a mercenary company
  mercDaysLeft?: number;
  heading?: number; // direction of travel (radians) for flanking detection
}

interface CampaignState {
  day: number;
  tick: number;
  gold: number;
  playerParty: CampaignParty;
  parties: CampaignParty[];
  cities: CampaignCity[];
  villages: CampaignVillage[];
  specialLocations: SpecialLocation[];
  terrain: TerrainRegion[];
  paused: boolean;
  gameOver: boolean;
  winner: string | null;
  playerFaction: string;
  selectedCity: CampaignCity | null;
  log: string[];
  speed: number; // 1, 2, 4
  heroLevel: number;
  heroXp: number;
  heroPerks: HeroPerkId[];
  factionRelations: Map<string, Map<string, number>>; // relation score between factions (-100 hostile to +100 allied)
  // Fog of war
  fogRevealed: Set<number>; // set of (cellY * FOG_GRID_W + cellX) indices
  // Caravans & wandering NPCs
  caravans: CampaignCaravan[];
  wanderingNPCs: CampaignWanderingNPC[];
  // Campaign events
  events: CampaignEvent[];
  lastEventDay: number;
  // Battle preview state
  battlePreviewEnemy: CampaignParty | null;
  // --- New systems ---
  season: Season;
  food: number;
  campaignMorale: number; // 0-100
  lords: CampaignLord[];
  companions: Companion[];
  mercContracts: MercContract[];
  victoryProgress: VictoryProgress;
  totalGoldEarned: number; // for economic victory tracking
  tradeAgreements: { factionA: string; factionB: string; startDay: number }[];
  warDeclarations: { aggressor: string; target: string; day: number }[];
  playerSiegeEquip: { type: SiegeEquipType; count: number }[]; // built siege equipment in inventory
  flankingBonus: number; // 0 or positive multiplier for next battle
  playerTradeGoods: { good: string; count: number }[]; // trade inventory
}

// ---------------------------------------------------------------------------
// City names
// ---------------------------------------------------------------------------

const CITY_NAMES = [
  "Camelot", "Ironhold", "Silverpeak", "Thornwall", "Ashenmoor",
  "Dragonspire", "Frostheim", "Goldcrest", "Ravenwatch", "Stormhaven",
  "Oakenshire", "Shadowmere", "Crystalford", "Embervale", "Windhelm",
  "Blackstone", "Liongate", "Moonharbor", "Sunspear", "Deepforge",
  "Hawkhurst", "Willowdale", "Redcliff", "Starfall", "Duskwood",
  "Highgarden", "Ironforge", "Mistwood", "Brimstone", "Greenvale",
];

const VILLAGE_NAMES = [
  "Millbrook", "Shepherd's Rest", "Willowfen", "Briarvale", "Dusthaven",
  "Foxhollow", "Greywater", "Honeyhill", "Ivystead", "Kettlecross",
  "Larkspur", "Mossglen", "Northmead", "Oakbarrow", "Pinecroft",
  "Quarrystone", "Rosemoor", "Stonecairn", "Thornfield", "Underhill",
  "Vinereach", "Whitecreek", "Yarrowfield", "Copperwell", "Duskmeadow",
  "Eldermarsh", "Fernwick", "Goldwater", "Heatherdale", "Ironbrook",
];

const SPECIAL_LOCATION_NAMES = [
  "The Sunken Crypt", "Ruins of Aldenmere", "Dragon's Lair", "The Crystal Shrine",
  "Bandit Hideout", "Forgotten Temple", "The Shadow Vault", "Ironbound Dungeon",
  "The Cursed Barrow", "Emerald Cave", "Shrine of Valor", "The Lost Treasury",
  "Goblin Warrens", "Tomb of the Ancients", "Serpent's Den", "The Hollow Keep",
  "Moonlit Grotto", "The Bone Pit", "Sanctuary of Light", "The Ashen Gate",
];

// ---------------------------------------------------------------------------
// Map generation
// ---------------------------------------------------------------------------

function _generateCities(factions: RaceDef[]): CampaignCity[] {
  const cities: CampaignCity[] = [];
  const usedNames = new Set<string>();
  const padding = 80;
  const minDist = 120;

  // Each faction gets 2-3 cities
  for (const faction of factions) {
    const cityCount = 2 + Math.floor(Math.random() * 2); // 2 or 3
    for (let i = 0; i < cityCount; i++) {
      let x = 0, y = 0;
      let attempts = 0;
      // Find position not too close to other cities
      do {
        x = padding + Math.random() * (MAP_W - padding * 2);
        y = padding + Math.random() * (MAP_H - padding * 2);
        attempts++;
      } while (
        attempts < 200 &&
        cities.some((c) => Math.hypot(c.x - x, c.y - y) < minDist)
      );

      let name: string;
      do {
        name = CITY_NAMES[Math.floor(Math.random() * CITY_NAMES.length)];
      } while (usedNames.has(name));
      usedNames.add(name);

      const garrison = _generateGarrison(faction.id, 8 + Math.floor(Math.random() * 12));

      cities.push({
        id: `city_${cities.length}`,
        name,
        x,
        y,
        factionId: faction.id,
        garrison,
        garrisonTotal: garrison.reduce((s, g) => s + g.count, 0),
        buildings: [],
        tradeGoods: _generateCityTradeGoods(),
        foodStock: FOOD_CITY_STOCK,
        siegeEquipment: [],
      });
    }
  }
  return cities;
}

function _generateGarrison(factionId: string, size: number): { unitId: string; count: number; xp: number }[] {
  const pool = CAMPAIGN_UNITS.filter((u) => u.tier <= 4);
  const result: { unitId: string; count: number; xp: number }[] = [];
  let remaining = size;

  // Add faction elite if available
  if (FACTION_ELITES[factionId] && remaining > 2) {
    const eliteCount = 1 + Math.floor(Math.random() * 3);
    result.push({ unitId: FACTION_ELITES[factionId].id, count: Math.min(eliteCount, remaining), xp: 0 });
    remaining -= eliteCount;
  }

  while (remaining > 0) {
    const unit = pool[Math.floor(Math.random() * pool.length)];
    const count = Math.min(1 + Math.floor(Math.random() * 4), remaining);
    const existing = result.find((r) => r.unitId === unit.id);
    if (existing) {
      existing.count += count;
    } else {
      result.push({ unitId: unit.id, count, xp: 0 });
    }
    remaining -= count;
  }
  return result;
}

function _generateVillages(cities: CampaignCity[]): CampaignVillage[] {
  const villages: CampaignVillage[] = [];
  const usedNames = new Set<string>();
  for (const city of cities) {
    const count = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 80 + Math.random() * 120;
      const vx = Math.max(20, Math.min(MAP_W - 20, city.x + Math.cos(angle) * dist));
      const vy = Math.max(20, Math.min(MAP_H - 20, city.y + Math.sin(angle) * dist));
      let name: string;
      do {
        name = VILLAGE_NAMES[Math.floor(Math.random() * VILLAGE_NAMES.length)];
      } while (usedNames.has(name));
      usedNames.add(name);
      const population = 20 + Math.floor(Math.random() * 61);
      villages.push({
        id: `village_${villages.length}`,
        name,
        x: vx, y: vy,
        factionId: city.factionId,
        income: Math.floor(population / 4),
        population,
        linkedCityId: city.id,
      });
    }
  }
  return villages;
}

function _generateSpecialLocations(): SpecialLocation[] {
  const locations: SpecialLocation[] = [];
  const types: SpecialLocation["type"][] = ["ruins", "dungeon", "lair", "shrine", "treasure"];
  const count = 8 + Math.floor(Math.random() * 5);
  const usedNames = new Set<string>();
  for (let i = 0; i < count; i++) {
    let name: string;
    do {
      name = SPECIAL_LOCATION_NAMES[Math.floor(Math.random() * SPECIAL_LOCATION_NAMES.length)];
    } while (usedNames.has(name));
    usedNames.add(name);
    const type = types[Math.floor(Math.random() * types.length)];
    const difficulty = 5 + Math.floor(Math.random() * 31);
    const reward: SpecialLocation["reward"] = { gold: 100 + difficulty * 20 };
    if (Math.random() < 0.4) {
      const pool = CAMPAIGN_UNITS.filter((u) => u.tier <= 3);
      const unit = pool[Math.floor(Math.random() * pool.length)];
      reward.unitId = unit.id;
      reward.unitCount = 1 + Math.floor(Math.random() * 3);
    }
    locations.push({
      id: `loc_${i}`,
      name,
      x: 60 + Math.random() * (MAP_W - 120),
      y: 60 + Math.random() * (MAP_H - 120),
      type,
      explored: false,
      difficulty,
      reward,
    });
  }
  return locations;
}

function _generateRovingBands(cities: CampaignCity[], factions: RaceDef[]): CampaignParty[] {
  const parties: CampaignParty[] = [];

  for (let i = 0; i < ROVING_BAND_COUNT; i++) {
    const faction = factions[Math.floor(Math.random() * factions.length)];
    // Spawn near a city of the same faction, or random position
    const homeCities = cities.filter((c) => c.factionId === faction.id);
    let x: number, y: number;
    let homeCity: string | undefined;
    if (homeCities.length > 0) {
      const home = homeCities[Math.floor(Math.random() * homeCities.length)];
      x = home.x + (Math.random() - 0.5) * 150;
      y = home.y + (Math.random() - 0.5) * 150;
      homeCity = home.id;
    } else {
      x = 80 + Math.random() * (MAP_W - 160);
      y = 80 + Math.random() * (MAP_H - 160);
    }
    x = Math.max(20, Math.min(MAP_W - 20, x));
    y = Math.max(20, Math.min(MAP_H - 20, y));

    const size = 4 + Math.floor(Math.random() * 12);
    const army = _generateGarrison(faction.id, size);

    const bandNames = [
      `${faction.name} Raiders`, `${faction.name} Patrol`, `${faction.name} Warband`,
      `${faction.name} Scouts`, `${faction.name} Marauders`, `${faction.name} Vanguard`,
    ];

    parties.push({
      id: `party_${i}`,
      name: bandNames[Math.floor(Math.random() * bandNames.length)],
      x,
      y,
      factionId: faction.id,
      army,
      armyTotal: army.reduce((s, a) => s + a.count, 0),
      targetX: x,
      targetY: y,
      isPlayer: false,
      speed: AI_SPEED * (0.7 + Math.random() * 0.6),
      homeCity,
    });
  }
  return parties;
}

// ---------------------------------------------------------------------------
// Caravan & NPC generation
// ---------------------------------------------------------------------------

function _generateCaravans(cities: CampaignCity[]): CampaignCaravan[] {
  const caravans: CampaignCaravan[] = [];
  if (cities.length < 2) return caravans;
  for (let i = 0; i < CARAVAN_COUNT; i++) {
    const origin = cities[Math.floor(Math.random() * cities.length)];
    let target: CampaignCity;
    do {
      target = cities[Math.floor(Math.random() * cities.length)];
    } while (target.id === origin.id);
    const goodsList = [
      { name: "Grain", cost: 30 }, { name: "Iron", cost: 60 }, { name: "Cloth", cost: 40 },
      { name: "Wine", cost: 50 }, { name: "Salt", cost: 35 }, { name: "Spices", cost: 80 },
      { name: "Lumber", cost: 25 }, { name: "Horses", cost: 120 },
    ];
    // Pick 2-4 random goods
    const shuffled = [...goodsList].sort(() => Math.random() - 0.5);
    const goods = shuffled.slice(0, 2 + Math.floor(Math.random() * 3));
    caravans.push({
      id: `caravan_${i}`,
      x: origin.x + (Math.random() - 0.5) * 20,
      y: origin.y + (Math.random() - 0.5) * 20,
      targetCityId: target.id,
      originCityId: origin.id,
      speed: CARAVAN_SPEED * (0.8 + Math.random() * 0.4),
      goods,
    });
  }
  return caravans;
}

const WANDERING_NPC_NAMES: Record<WanderingNPCType, string[]> = {
  hermit: ["Old Sage", "Forest Hermit", "Mountain Seer"],
  messenger: ["Royal Courier", "Swift Messenger", "Herald"],
  refugee: ["Displaced Farmer", "War Refugee", "Wandering Peasant"],
};

function _generateWanderingNPCs(day: number): CampaignWanderingNPC[] {
  const npcs: CampaignWanderingNPC[] = [];
  const types: WanderingNPCType[] = ["hermit", "messenger", "refugee"];
  for (let i = 0; i < WANDERING_NPC_COUNT; i++) {
    const type = types[i % types.length];
    const names = WANDERING_NPC_NAMES[type];
    const x = 80 + Math.random() * (MAP_W - 160);
    const y = 80 + Math.random() * (MAP_H - 160);
    npcs.push({
      id: `npc_${i}`,
      x, y,
      type,
      name: names[Math.floor(Math.random() * names.length)],
      interacted: false,
      targetX: 80 + Math.random() * (MAP_W - 160),
      targetY: 80 + Math.random() * (MAP_H - 160),
      speed: 0.3 + Math.random() * 0.3,
      spawnDay: day,
    });
  }
  return npcs;
}

// ---------------------------------------------------------------------------
// Lord generation
// ---------------------------------------------------------------------------

function _generateLords(parties: CampaignParty[], factions: RaceDef[], playerFaction: string): CampaignLord[] {
  const lords: CampaignLord[] = [];
  const usedNames = new Set<string>();
  const personalities: LordPersonality[] = ["aggressive", "cautious", "mercantile", "diplomatic", "ruthless"];

  for (const party of parties) {
    if (party.isPlayer || party.factionId === playerFaction) continue;
    // ~60% of AI parties get a named lord
    if (Math.random() > 0.6) continue;

    let name: string;
    do {
      name = LORD_NAMES[Math.floor(Math.random() * LORD_NAMES.length)];
    } while (usedNames.has(name));
    usedNames.add(name);

    const personality = personalities[Math.floor(Math.random() * personalities.length)];
    const lord: CampaignLord = {
      id: `lord_${lords.length}`,
      name,
      personality,
      factionId: party.factionId,
      partyId: party.id,
      level: 1 + Math.floor(Math.random() * 5),
      renown: 10 + Math.floor(Math.random() * 40),
      capturedBy: null,
      ransomCost: 200 + Math.floor(Math.random() * 600),
      rivalLordId: null,
    };
    party.lordId = lord.id;
    party.name = `${name}'s ${party.name.split(" ").pop()}`;
    lords.push(lord);
  }

  // Assign random rivals
  for (const lord of lords) {
    const enemies = lords.filter(l => l.factionId !== lord.factionId && l.id !== lord.id);
    if (enemies.length > 0) {
      lord.rivalLordId = enemies[Math.floor(Math.random() * enemies.length)].id;
    }
  }

  return lords;
}

// ---------------------------------------------------------------------------
// Companion generation
// ---------------------------------------------------------------------------

function _generateCompanions(): Companion[] {
  const companions: Companion[] = [];
  // Place 4-6 companions across the map
  const count = 4 + Math.floor(Math.random() * 3);
  const shuffled = [...COMPANION_DEFS].sort(() => Math.random() - 0.5);
  for (let i = 0; i < Math.min(count, shuffled.length); i++) {
    const def = shuffled[i];
    companions.push({
      id: `companion_${i}`,
      name: def.name,
      class: def.class,
      level: 1,
      xp: 0,
      loyalty: 50,
      skill: def.skill,
      skillDesc: def.skillDesc,
      personality: def.personality,
      recruited: false,
      locationX: 80 + Math.random() * (MAP_W - 160),
      locationY: 80 + Math.random() * (MAP_H - 160),
      quest: null,
    });
  }
  return companions;
}

// ---------------------------------------------------------------------------
// Trade goods generation for cities
// ---------------------------------------------------------------------------

function _generateCityTradeGoods(): CityTradeSlot[] {
  const slots: CityTradeSlot[] = [];
  // Each city gets 3-5 random goods with varied prices
  const shuffled = [...TRADE_GOODS].sort(() => Math.random() - 0.5);
  const count = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < Math.min(count, shuffled.length); i++) {
    const good = shuffled[i];
    const priceMult = 0.6 + Math.random() * 0.8; // 60%-140% of base
    slots.push({
      good: good.name,
      price: Math.round(good.basePrice * priceMult),
      stock: 5 + Math.floor(Math.random() * 15),
    });
  }
  return slots;
}

// ---------------------------------------------------------------------------
// Mercenary contract generation
// ---------------------------------------------------------------------------

function _generateMercContracts(): MercContract[] {
  const contracts: MercContract[] = [];
  const count = 2 + Math.floor(Math.random() * 3);
  const usedNames = new Set<string>();
  for (let i = 0; i < count; i++) {
    let name: string;
    do {
      name = MERC_COMPANY_NAMES[Math.floor(Math.random() * MERC_COMPANY_NAMES.length)];
    } while (usedNames.has(name));
    usedNames.add(name);

    const units: { unitId: string; count: number }[] = [];
    const pool = CAMPAIGN_UNITS.filter(u => u.tier >= 2 && u.tier <= 4);
    const unitCount = 2 + Math.floor(Math.random() * 2);
    for (let j = 0; j < unitCount; j++) {
      const unit = pool[Math.floor(Math.random() * pool.length)];
      units.push({ unitId: unit.id, count: 2 + Math.floor(Math.random() * 4) });
    }
    const totalUnits = units.reduce((s, u) => s + u.count, 0);
    contracts.push({
      id: `merc_${i}`,
      name,
      units,
      cost: totalUnits * 40 + Math.floor(Math.random() * 200),
      duration: 15 + Math.floor(Math.random() * 20),
      hired: false,
    });
  }
  return contracts;
}

// ---------------------------------------------------------------------------
// Companion quest generation
// ---------------------------------------------------------------------------

function _generateCompanionQuest(companion: Companion, state: { cities: CampaignCity[]; lords: CampaignLord[]; specialLocations: SpecialLocation[] }): CompanionQuest {
  const types: CompanionQuest["type"][] = ["kill_lord", "explore_location", "deliver_goods", "defend_city"];
  const type = types[Math.floor(Math.random() * types.length)];
  let targetId = "";
  let targetX = MAP_W / 2;
  let targetY = MAP_H / 2;
  let name = "";
  let description = "";

  if (type === "kill_lord" && state.lords.length > 0) {
    const lord = state.lords[Math.floor(Math.random() * state.lords.length)];
    targetId = lord.id;
    name = `Hunt ${lord.name}`;
    description = `${companion.name} wants you to defeat ${lord.name} in battle.`;
  } else if (type === "explore_location") {
    const unexplored = state.specialLocations.filter(l => !l.explored);
    if (unexplored.length > 0) {
      const loc = unexplored[Math.floor(Math.random() * unexplored.length)];
      targetId = loc.id;
      targetX = loc.x; targetY = loc.y;
      name = `Explore ${loc.name}`;
      description = `${companion.name} has heard of treasures at ${loc.name}.`;
    } else {
      targetX = 80 + Math.random() * (MAP_W - 160);
      targetY = 80 + Math.random() * (MAP_H - 160);
      name = "Scout the Wilds";
      description = `${companion.name} wants to scout an area of the map.`;
    }
  } else if (type === "deliver_goods" && state.cities.length > 1) {
    const city = state.cities[Math.floor(Math.random() * state.cities.length)];
    targetId = city.id;
    targetX = city.x; targetY = city.y;
    name = `Deliver to ${city.name}`;
    description = `${companion.name} wants you to visit ${city.name} for a trade opportunity.`;
  } else {
    const city = state.cities[Math.floor(Math.random() * state.cities.length)];
    targetId = city.id;
    targetX = city.x; targetY = city.y;
    name = `Defend ${city.name}`;
    description = `${companion.name} is concerned about threats near ${city.name}.`;
  }

  return {
    id: `quest_${companion.id}_${Date.now()}`,
    name, description, targetX, targetY, type, targetId,
    completed: false,
    rewardGold: 200 + Math.floor(Math.random() * 300),
    rewardLoyalty: 10 + Math.floor(Math.random() * 15),
    rewardXp: 30 + Math.floor(Math.random() * 50),
  };
}

/** Reveal fog cells within a radius around a point. */
function _revealFog(fogSet: Set<number>, cx: number, cy: number, radius: number): void {
  const cellR = Math.ceil(radius / FOG_CELL_SIZE);
  const centerCX = Math.floor(cx / FOG_CELL_SIZE);
  const centerCY = Math.floor(cy / FOG_CELL_SIZE);
  for (let dy = -cellR; dy <= cellR; dy++) {
    for (let dx = -cellR; dx <= cellR; dx++) {
      const gx = centerCX + dx;
      const gy = centerCY + dy;
      if (gx < 0 || gx >= FOG_GRID_W || gy < 0 || gy >= FOG_GRID_H) continue;
      const worldX = gx * FOG_CELL_SIZE + FOG_CELL_SIZE / 2;
      const worldY = gy * FOG_CELL_SIZE + FOG_CELL_SIZE / 2;
      if (Math.hypot(worldX - cx, worldY - cy) <= radius) {
        fogSet.add(gy * FOG_GRID_W + gx);
      }
    }
  }
}

/** Estimate difficulty based on army strength comparison. */
function _estimateDifficulty(playerTotal: number, enemyTotal: number): { label: string; color: string } {
  const ratio = enemyTotal / Math.max(1, playerTotal);
  if (ratio < 0.5) return { label: "Easy", color: "#44cc44" };
  if (ratio < 1.0) return { label: "Medium", color: "#cccc44" };
  if (ratio < 1.5) return { label: "Hard", color: "#cc8844" };
  return { label: "Deadly", color: "#cc4444" };
}

// ---------------------------------------------------------------------------
// WarbandCampaign main class
// ---------------------------------------------------------------------------

export class WarbandCampaign {
  private _state: CampaignState | null = null;
  private _container: HTMLDivElement | null = null;
  private _canvas: HTMLCanvasElement | null = null;
  private _ctx: CanvasRenderingContext2D | null = null;
  private _rafId = 0;
  private _lastTime = 0;

  // Drag / camera
  private _groundTexture: HTMLCanvasElement | null = null;
  private _animTime = 0; // for animated effects
  private _camX = 0;
  private _camY = 0;
  private _isDragging = false;
  private _dragStartX = 0;
  private _dragStartY = 0;
  private _camStartX = 0;
  private _camStartY = 0;
  private _zoom = 1.0;

  // UI panels
  private _cityPanel: HTMLDivElement | null = null;
  private _partyPanel: HTMLDivElement | null = null;
  private _diplomacyPanel: HTMLDivElement | null = null;
  private _logPanel: HTMLDivElement | null = null;
  private _topBar: HTMLDivElement | null = null;

  // Battle state
  private _inBattle = false;
  private _battlePlayerArmy: { unitId: string; count: number; xp: number }[] = [];
  private _battleEnemyArmy: { unitId: string; count: number; xp: number }[] = [];
  private _battleEnemyPartyId: string | null = null;
  private _battleEnemyCityId: string | null = null;
  private _battleLocationId: string | null = null;

  // UI panels for villages/locations
  private _villagePanel: HTMLDivElement | null = null;
  private _locationPanel: HTMLDivElement | null = null;

  // Three.js battle systems (reused from WarbandGame)
  private _battleSceneManager: WarbandSceneManager | null = null;
  private _battleCameraController: WarbandCameraController | null = null;
  private _battleInputSystem: WarbandInputSystem | null = null;
  private _battleCombatSystem: WarbandCombatSystem | null = null;
  private _battlePhysicsSystem: WarbandPhysicsSystem | null = null;
  private _battleAISystem: WarbandAISystem | null = null;
  private _battleHUD: WarbandHUD | null = null;
  private _battleFX: WarbandFX | null = null;
  private _battleState: WarbandState | null = null;
  private _battleFighterMeshes: Map<string, FighterMesh> = new Map();
  private _battleHorseMeshes: Map<string, HorseMesh> = new Map();
  private _battleCreatureMeshes: Map<string, CreatureMesh> = new Map();
  private _battleRafId = 0;
  private _battleLastTime = 0;
  private _battleSimAccumulator = 0;
  private _battleResultsContainer: HTMLDivElement | null = null;

  // Key state
  private _keysDown = new Set<string>();
  private _keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private _keyUpHandler: ((e: KeyboardEvent) => void) | null = null;
  private _mouseDownHandler: ((e: MouseEvent) => void) | null = null;
  private _mouseUpHandler: ((e: MouseEvent) => void) | null = null;
  private _mouseMoveHandler: ((e: MouseEvent) => void) | null = null;
  private _wheelHandler: ((e: WheelEvent) => void) | null = null;
  private _escHandler: ((e: KeyboardEvent) => void) | null = null;
  private _perkModal: HTMLDivElement | null = null;
  private _battlePreviewPanel: HTMLDivElement | null = null;
  private _caravanPanel: HTMLDivElement | null = null;
  private _npcPanel: HTMLDivElement | null = null;
  private _eventPopup: HTMLDivElement | null = null;
  private _eventPopupTimeout: ReturnType<typeof setTimeout> | null = null;
  private _fogCanvas: HTMLCanvasElement | null = null;
  private _pauseMenuContainer: HTMLDivElement | null = null;
  private _campaignPauseMenuContainer: HTMLDivElement | null = null;

  // New system panels
  private _companionPanel: HTMLDivElement | null = null;
  private _buildingPanel: HTMLDivElement | null = null;
  private _tradePanel: HTMLDivElement | null = null;
  private _warCouncilPanel: HTMLDivElement | null = null;
  private _mercPanel: HTMLDivElement | null = null;
  private _deploymentPanel: HTMLDivElement | null = null;
  private _siegeEquipPanel: HTMLDivElement | null = null;
  private _victoryPanel: HTMLDivElement | null = null;

  // Deployment state
  private _deploymentFormation: "line" | "wedge" | "flanking" | "defensive" = "line";
  private _battleTerrainType: TerrainKind | null = null;

  async boot(playerFaction: string): Promise<void> {
    // Hide PixiJS
    const pixiContainer = document.getElementById("pixi-container");
    if (pixiContainer) {
      for (const child of Array.from(pixiContainer.children)) {
        if (child.id !== "warband-canvas" && child.id !== "warband-hud") {
          (child as HTMLElement).style.display = "none";
        }
      }
    }

    // Pick factions for the map (player's + a selection of others)
    const factionsOnMap = this._selectFactions(playerFaction);

    // Generate map
    const terrain = _generateTerrain();
    const cities = _generateCities(factionsOnMap);
    const parties = _generateRovingBands(cities, factionsOnMap);
    const villages = _generateVillages(cities);
    const specialLocations = _generateSpecialLocations();

    // Bake static ground texture (only done once)
    this._groundTexture = _bakeGroundTexture(terrain, cities);

    // Player starts near their faction's first city
    const homeCities = cities.filter((c) => c.factionId === playerFaction);
    const startCity = homeCities[0] ?? cities[0];
    const px = startCity.x + 40;
    const py = startCity.y + 40;

    const playerParty: CampaignParty = {
      id: "player",
      name: "Your Warband",
      x: px,
      y: py,
      factionId: playerFaction,
      army: [
        { unitId: "swordsman", count: 5, xp: 0 },
        { unitId: "archer", count: 3, xp: 0 },
        { unitId: "pikeman", count: 2, xp: 0 },
      ],
      armyTotal: 10,
      targetX: px,
      targetY: py,
      isPlayer: true,
      speed: PLAYER_SPEED,
    };

    // Generate named lords for AI parties
    const lords = _generateLords(parties, factionsOnMap, playerFaction);

    this._state = {
      day: 1,
      tick: 0,
      gold: STARTING_GOLD,
      playerParty,
      parties,
      cities,
      villages,
      specialLocations,
      terrain,
      paused: false,
      gameOver: false,
      winner: null,
      playerFaction: playerFaction,
      selectedCity: null,
      log: [`Day 1 — Your warband sets out from ${startCity.name}.`],
      speed: 1,
      heroLevel: 1,
      heroXp: 0,
      heroPerks: [],
      factionRelations: new Map(),
      fogRevealed: new Set<number>(),
      caravans: _generateCaravans(cities),
      wanderingNPCs: _generateWanderingNPCs(1),
      events: [],
      lastEventDay: 0,
      battlePreviewEnemy: null,
      // New systems
      season: "spring",
      food: 100,
      campaignMorale: 75,
      lords,
      companions: _generateCompanions(),
      mercContracts: _generateMercContracts(),
      victoryProgress: {
        conquest: { citiesCaptured: homeCities.length, totalCities: cities.length },
        diplomatic: { alliances: 0, required: VICTORY_ALLIANCE_REQUIRED },
        economic: { goldAccumulated: STARTING_GOLD, target: VICTORY_ECONOMIC_TARGET },
      },
      totalGoldEarned: STARTING_GOLD,
      tradeAgreements: [],
      warDeclarations: [],
      playerSiegeEquip: [],
      flankingBonus: 0,
      playerTradeGoods: [],
    };

    // Initialize faction relations
    const factionIds = factionsOnMap.map((f) => f.id);
    for (const a of factionIds) {
      const innerMap = new Map<string, number>();
      for (const b of factionIds) {
        if (a === b) { innerMap.set(b, 100); continue; }
        if (b === playerFaction) {
          innerMap.set(b, a === playerFaction ? 100 : -50);
        } else if (a === playerFaction) {
          innerMap.set(b, -50);
        } else {
          innerMap.set(b, 0);
        }
      }
      this._state.factionRelations.set(a, innerMap);
    }

    // Reveal initial fog around player and allied cities
    _revealFog(this._state.fogRevealed, px, py, SCOUT_RADIUS);
    for (const c of cities) {
      if (c.factionId === playerFaction) {
        _revealFog(this._state.fogRevealed, c.x, c.y, CITY_SCOUT_RADIUS);
      }
    }

    // Set initial zoom to fill viewport
    this._zoom = Math.max(window.innerWidth / MAP_W, window.innerHeight / MAP_H);

    // Center camera on player
    this._camX = px - window.innerWidth / (2 * this._zoom);
    this._camY = py - window.innerHeight / (2 * this._zoom);

    this._createUI();
    this._bindInputs();
    this._lastTime = performance.now();
    this._gameLoop(this._lastTime);
  }

  // ---------------------------------------------------------------------------
  // Faction selection for map
  // ---------------------------------------------------------------------------

  private _selectFactions(playerFaction: string): RaceDef[] {
    // Always include player faction + 4-6 others
    const others = CAMPAIGN_FACTIONS.filter((f) => f.id !== playerFaction);
    // Shuffle
    for (let i = others.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [others[i], others[j]] = [others[j], others[i]];
    }
    const count = Math.min(5, others.length);
    const selected = others.slice(0, count);
    const playerRace = CAMPAIGN_FACTIONS.find((f) => f.id === playerFaction) ?? CAMPAIGN_FACTIONS[0];
    return [playerRace, ...selected];
  }

  // ---------------------------------------------------------------------------
  // UI creation
  // ---------------------------------------------------------------------------

  private _createUI(): void {
    this._container = document.createElement("div");
    this._container.id = "campaign-container";
    this._container.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      z-index: 30; background: #1a1a0e; overflow: hidden;
      font-family: 'Segoe UI', sans-serif; color: #e0d5c0;
    `;

    // Canvas for the map
    this._canvas = document.createElement("canvas");
    this._canvas.width = window.innerWidth;
    this._canvas.height = window.innerHeight;
    this._canvas.style.cssText = "position:absolute;top:0;left:0;cursor:crosshair;";
    this._ctx = this._canvas.getContext("2d")!;
    this._container.appendChild(this._canvas);

    // Top bar (day, gold, army size, speed, faction info)
    this._topBar = document.createElement("div");
    this._topBar.style.cssText = `
      position:absolute;top:0;left:0;right:0;height:48px;
      background:linear-gradient(180deg, rgba(28,22,14,0.96) 0%, rgba(14,11,7,0.97) 60%, rgba(10,8,5,0.98) 100%);
      border-bottom:2px solid #5a4020;
      box-shadow:0 2px 8px rgba(0,0,0,0.5), inset 0 -1px 0 rgba(218,165,32,0.15), inset 0 1px 0 rgba(255,220,140,0.06);
      display:flex;align-items:center;padding:0 18px;gap:16px;
      font-size:13px;z-index:2;
      font-family:'Palatino Linotype','Book Antiqua',Palatino,serif;
      background-image:url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='60' height='60' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
    `;
    this._container.appendChild(this._topBar);

    // Log panel (bottom)
    this._logPanel = document.createElement("div");
    this._logPanel.style.cssText = `
      position:absolute;bottom:0;left:0;width:360px;max-height:200px;
      background:linear-gradient(135deg, rgba(14,11,7,0.94) 0%, rgba(10,8,5,0.96) 100%);
      border-top:2px solid #5a4020;border-right:2px solid #5a4020;
      border-top-right-radius:6px;
      box-shadow:2px -2px 10px rgba(0,0,0,0.4), inset 0 1px 0 rgba(218,165,32,0.12), inset -1px 0 0 rgba(218,165,32,0.08);
      padding:10px 14px;font-size:11px;overflow-y:auto;z-index:2;
      color:#aa9977;
      font-family:'Palatino Linotype','Book Antiqua',Palatino,serif;
      scrollbar-width:thin;scrollbar-color:#5a4020 rgba(10,8,5,0.3);
      background-image:url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='60' height='60' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
    `;
    this._container.appendChild(this._logPanel);

    const pixiContainer = document.getElementById("pixi-container");
    if (pixiContainer) pixiContainer.appendChild(this._container);
  }

  private _updateTopBar(): void {
    if (!this._topBar || !this._state) return;
    const s = this._state;
    const factionDef = CAMPAIGN_FACTIONS.find((f) => f.id === s.playerFaction);
    const factionColor = factionDef ? `#${factionDef.accentColor.toString(16).padStart(6, "0")}` : "#daa520";
    const citiesOwned = s.cities.filter((c) => c.factionId === s.playerFaction).length;
    const totalCities = s.cities.length;
    _getTerrainAt(s.playerParty.x, s.playerParty.y, s.terrain);
    let dailyUpkeep = 0;
    for (const slot of s.playerParty.army) {
      dailyUpkeep += this._getUnitUpkeep(slot.unitId) * slot.count;
    }

    this._topBar.innerHTML = `
      <span style="
        color:${factionColor};font-weight:bold;letter-spacing:2px;font-size:15px;
        text-shadow:0 0 8px ${factionColor}44, 0 1px 2px rgba(0,0,0,0.8);
        padding:4px 14px;
        border:1px solid ${factionColor}55;border-radius:3px;
        background:linear-gradient(180deg, ${factionColor}18 0%, ${factionColor}08 100%);
        text-transform:uppercase;
      ">${factionDef?.name ?? s.playerFaction}</span>

      <span style="color:#555;font-size:16px;margin:0 -4px">\u2758</span>

      <span style="color:#c8a84e;text-shadow:0 0 4px rgba(218,165,32,0.3);">
        <span style="color:#8a7030;font-size:10px">\u2600</span> Day <strong>${s.day}</strong>
      </span>

      <span style="color:#555;font-size:16px;margin:0 -4px">\u2758</span>

      <span style="color:#ffcc44;text-shadow:0 0 4px rgba(255,204,68,0.2);">
        <span style="font-size:12px">\u2B23</span> <strong>${s.gold}</strong>
        <span style="color:#996633;font-size:10px">(-${dailyUpkeep}/day)</span>
      </span>

      <span style="color:#555;font-size:16px;margin:0 -4px">\u2758</span>

      <span style="color:#88aacc;text-shadow:0 0 4px rgba(136,170,204,0.2);">
        <span style="font-size:11px">\u2694</span> ${s.playerParty.armyTotal}/${MAX_PARTY_SIZE + this._getPerkCount("commander") * 5}
      </span>

      <span style="color:#555;font-size:16px;margin:0 -4px">\u2758</span>

      ${this._renderHeroLevelBar()}

      <span style="color:#555;font-size:16px;margin:0 -4px">\u2758</span>

      <span style="color:#88aa66;text-shadow:0 0 4px rgba(136,170,102,0.2);">
        <span style="font-size:11px">\u26EB</span> ${citiesOwned}/${totalCities}
      </span>

      <span style="color:#555;font-size:16px;margin:0 -4px">\u2758</span>

      <span style="
        color:${SEASON_EFFECTS[s.season].color};font-size:12px;font-weight:bold;
        text-shadow:0 0 4px ${SEASON_EFFECTS[s.season].color}44;
        padding:2px 8px;border:1px solid ${SEASON_EFFECTS[s.season].color}44;border-radius:3px;
        background:linear-gradient(180deg, ${SEASON_EFFECTS[s.season].color}18 0%, ${SEASON_EFFECTS[s.season].color}08 100%);
      ">${s.season === "spring" ? "\u2618" : s.season === "summer" ? "\u2600" : s.season === "autumn" ? "\u2767" : "\u2744"} ${SEASON_EFFECTS[s.season].label}</span>

      <span style="color:#555;font-size:16px;margin:0 -4px">\u2758</span>

      <span style="color:${s.food > 30 ? "#66cc66" : s.food > 10 ? "#cccc44" : "#cc4444"};font-size:12px;
        text-shadow:0 0 4px ${s.food > 30 ? "rgba(102,204,102,0.3)" : s.food > 10 ? "rgba(204,204,68,0.3)" : "rgba(204,68,68,0.3)"};">
        \uD83C\uDF5E <strong>${Math.floor(s.food)}</strong>
      </span>

      <span style="color:#555;font-size:16px;margin:0 -4px">\u2758</span>

      <span style="color:${s.campaignMorale > 60 ? "#66cc66" : s.campaignMorale > 30 ? "#cccc44" : "#cc4444"};font-size:12px;
        text-shadow:0 0 4px ${s.campaignMorale > 60 ? "rgba(102,204,102,0.3)" : s.campaignMorale > 30 ? "rgba(204,204,68,0.3)" : "rgba(204,68,68,0.3)"};">
        \u2691 <strong>${Math.floor(s.campaignMorale)}</strong>
      </span>

      <span style="color:#555;font-size:16px;margin:0 -4px">\u2758</span>

      <span style="display:flex;gap:4px;align-items:center">
        ${[
          { key: "C", label: "Companions", id: "topbar-companions" },
          { key: "B", label: "Buildings", id: "topbar-buildings" },
          { key: "T", label: "Trade", id: "topbar-trade" },
          { key: "W", label: "War Council", id: "topbar-warcouncil" },
          { key: "M", label: "Mercenaries", id: "topbar-mercs" },
          { key: "V", label: "Victory", id: "topbar-victory" },
        ].map((b) => `
          <button class="topbar-quick-btn" data-panel="${b.id}" title="${b.label}" style="
            padding:2px 6px;font-size:10px;font-weight:bold;
            border:1px solid #3a3020;border-radius:3px;
            background:linear-gradient(180deg, rgba(30,25,15,0.7) 0%, rgba(15,12,8,0.8) 100%);
            color:#998866;cursor:pointer;font-family:inherit;
            box-shadow:inset 0 1px 0 rgba(255,255,255,0.03);
            transition:all 0.15s ease;letter-spacing:0.5px;
          ">[${b.key}]</button>
        `).join("")}
      </span>

      ${this._renderFactionRelationIndicators()}

      <div style="margin-left:auto;display:flex;gap:8px;align-items:center;
        padding-left:12px;border-left:1px solid rgba(90,64,32,0.5);">
        <span style="color:#665533;font-size:10px;letter-spacing:1px;text-transform:uppercase">Speed</span>
        ${[1, 2, 4].map((sp) => `
          <button class="camp-speed-btn" data-speed="${sp}" style="
            padding:3px 10px;font-size:11px;font-weight:bold;
            border:1px solid ${s.speed === sp ? "#daa520" : "#3a3020"};
            border-radius:3px;
            background:${s.speed === sp
              ? "linear-gradient(180deg, rgba(218,165,32,0.35) 0%, rgba(160,120,20,0.2) 100%)"
              : "linear-gradient(180deg, rgba(30,25,15,0.7) 0%, rgba(15,12,8,0.8) 100%)"};
            color:${s.speed === sp ? "#ffe088" : "#665544"};
            cursor:pointer;font-family:inherit;
            box-shadow:${s.speed === sp ? "0 0 6px rgba(218,165,32,0.25), inset 0 1px 0 rgba(255,220,140,0.15)" : "inset 0 1px 0 rgba(255,255,255,0.03)"};
            text-shadow:${s.speed === sp ? "0 0 4px rgba(218,165,32,0.4)" : "none"};
            transition:all 0.15s ease;
          ">${sp}x</button>
        `).join("")}
        <button id="camp-pause-btn" style="
          padding:3px 10px;font-size:11px;font-weight:bold;
          border:1px solid ${s.paused ? "#cc4444" : "#3a3020"};
          border-radius:3px;
          background:${s.paused
            ? "linear-gradient(180deg, rgba(204,68,68,0.35) 0%, rgba(150,40,40,0.2) 100%)"
            : "linear-gradient(180deg, rgba(30,25,15,0.7) 0%, rgba(15,12,8,0.8) 100%)"};
          color:${s.paused ? "#ff8888" : "#665544"};
          cursor:pointer;font-family:inherit;
          box-shadow:${s.paused ? "0 0 6px rgba(204,68,68,0.25), inset 0 1px 0 rgba(255,120,120,0.15)" : "inset 0 1px 0 rgba(255,255,255,0.03)"};
          text-shadow:${s.paused ? "0 0 4px rgba(204,68,68,0.4)" : "none"};
          transition:all 0.15s ease;
        ">${s.paused ? "\u275A\u275A PAUSED" : "\u275A\u275A Pause"}</button>
        <button id="camp-exit-btn" style="
          padding:3px 10px;font-size:11px;
          border:1px solid #3a3020;
          border-radius:3px;
          background:linear-gradient(180deg, rgba(30,25,15,0.7) 0%, rgba(15,12,8,0.8) 100%);
          color:#776655;cursor:pointer;font-family:inherit;margin-left:6px;
          box-shadow:inset 0 1px 0 rgba(255,255,255,0.03);
          transition:all 0.15s ease;
        ">\u2716 Exit</button>
      </div>
    `;

    // Bind speed buttons
    this._topBar.querySelectorAll(".camp-speed-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (this._state) this._state.speed = parseInt((btn as HTMLElement).dataset.speed ?? "1");
        this._updateTopBar();
      });
    });
    document.getElementById("camp-pause-btn")?.addEventListener("click", () => {
      if (this._state) this._state.paused = !this._state.paused;
      this._updateTopBar();
    });
    document.getElementById("camp-exit-btn")?.addEventListener("click", () => {
      this._exit();
    });

    // Bind topbar quick panel buttons
    this._topBar.querySelectorAll(".topbar-quick-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!this._state) return;
        const panelId = (btn as HTMLElement).dataset.panel;
        const nearestCity = this._state.cities
          .filter((c) => c.factionId === this._state!.playerFaction)
          .sort((a, b) =>
            Math.hypot(a.x - this._state!.playerParty.x, a.y - this._state!.playerParty.y) -
            Math.hypot(b.x - this._state!.playerParty.x, b.y - this._state!.playerParty.y)
          )[0] ?? null;
        if (panelId === "topbar-companions") this._showCompanionPanel();
        else if (panelId === "topbar-buildings" && nearestCity) this._showBuildingPanel(nearestCity);
        else if (panelId === "topbar-trade" && nearestCity) this._showTradePanel(nearestCity);
        else if (panelId === "topbar-warcouncil") this._showWarCouncilPanel();
        else if (panelId === "topbar-mercs") this._showMercPanel();
        else if (panelId === "topbar-victory") this._showVictoryPanel();
      });
    });
  }

  private _updateLogPanel(): void {
    if (!this._logPanel || !this._state) return;
    const last10 = this._state.log.slice(-10);
    this._logPanel.innerHTML = `
      <div style="
        color:#daa520;font-size:13px;margin-bottom:6px;letter-spacing:2px;
        text-transform:uppercase;font-weight:bold;
        text-shadow:0 0 6px rgba(218,165,32,0.3);
        padding-bottom:6px;
        border-bottom:1px solid rgba(90,64,32,0.5);
        display:flex;align-items:center;gap:6px;
      ">
        <span style="color:#5a4020">\u2726</span>
        Event Log
        <span style="color:#5a4020">\u2726</span>
        <span style="flex:1;height:1px;background:linear-gradient(90deg, rgba(90,64,32,0.4) 0%, transparent 100%)"></span>
      </div>
      ${last10.map((l) => `<div style="margin-bottom:3px;padding-left:8px;border-left:2px solid rgba(90,64,32,0.25);line-height:1.4">${l}</div>`).join("")}
      <div style="
        position:sticky;bottom:0;height:12px;margin:-10px -14px 0;
        background:linear-gradient(0deg, rgba(10,8,5,0.95) 0%, transparent 100%);
        pointer-events:none;
      "></div>
    `;
  }

  // ---------------------------------------------------------------------------
  // Canvas pointer events helper
  // ---------------------------------------------------------------------------

  /** Disable pointer events on the map canvas so HTML panel buttons receive clicks. */
  private _setCanvasPointerEvents(enabled: boolean): void {
    if (this._canvas) {
      this._canvas.style.pointerEvents = enabled ? "auto" : "none";
    }
  }

  // ---------------------------------------------------------------------------
  // City panel
  // ---------------------------------------------------------------------------

  private _showCityPanel(city: CampaignCity): void {
    if (!this._state) return;
    this._state.selectedCity = city;
    this._state.paused = true;
    this._setCanvasPointerEvents(false);

    this._removeCityPanel();

    const isOwned = city.factionId === this._state.playerFaction;
    const factionDef = CAMPAIGN_FACTIONS.find((f) => f.id === city.factionId);
    const factionColor = factionDef ? `#${factionDef.accentColor.toString(16).padStart(6, "0")}` : "#888";

    // Check if player is close enough to interact
    const dist = Math.hypot(city.x - this._state.playerParty.x, city.y - this._state.playerParty.y);
    const canInteract = dist < 60;

    this._cityPanel = document.createElement("div");
    this._cityPanel.style.cssText = `
      position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
      width:520px;max-height:80vh;overflow-y:auto;
      background:rgba(15,12,8,0.97);border:2px solid ${factionColor};border-radius:10px;
      padding:24px;z-index:10;
    `;

    // Garrison display
    const garrisonHTML = city.garrison.map((g) => {
      const uDef = CAMPAIGN_UNITS.find((u) => u.id === g.unitId);
      const xpDisplay = city.factionId === this._state!.playerFaction ? ` <span style="color:#aa8833;font-size:10px">${_xpBar(g.xp)}</span>` : "";
      return `<span style="margin-right:10px">${uDef?.name ?? g.unitId} x${g.count}${xpDisplay}</span>`;
    }).join("");

    // Hire list (only if owned and close enough)
    let hireHTML = "";
    if (isOwned && canInteract) {
      const available = CAMPAIGN_UNITS.filter((u) => u.tier <= 4);
      // Add faction elite
      const elite = FACTION_ELITES[city.factionId];
      const allUnits = elite ? [...available, elite] : available;

      hireHTML = `
        <div style="margin-top:16px;border-top:1px solid #443322;padding-top:12px">
          <div style="color:#daa520;font-size:13px;margin-bottom:8px;letter-spacing:1px">RECRUIT UNITS</div>
          <div style="max-height:250px;overflow-y:auto">
            ${allUnits.map((u) => {
              const cost = Math.round(u.cost * HIRE_COST_MULT);
              const canAfford = this._state!.gold >= cost;
              const partyFull = this._state!.playerParty.armyTotal >= MAX_PARTY_SIZE + this._getPerkCount("commander") * 5;
              return `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:4px 8px;
                  margin-bottom:3px;background:rgba(30,25,15,0.6);border-radius:4px;border:1px solid #332211">
                  <span style="color:${u.faction ? factionColor : "#ccc"}">${u.name} ${u.faction ? "(Elite)" : ""}</span>
                  <span style="color:#998877;font-size:11px">T${u.tier} | ${cost}g</span>
                  <button class="camp-hire-btn" data-unit="${u.id}" data-cost="${cost}" style="
                    padding:2px 10px;font-size:11px;
                    border:1px solid ${canAfford && !partyFull ? "#daa520" : "#444"};
                    border-radius:3px;
                    background:${canAfford && !partyFull ? "rgba(218,165,32,0.2)" : "rgba(20,15,10,0.6)"};
                    color:${canAfford && !partyFull ? "#daa520" : "#555"};
                    cursor:${canAfford && !partyFull ? "pointer" : "not-allowed"};
                    font-family:inherit;
                  " ${canAfford && !partyFull ? "" : "disabled"}>Hire</button>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      `;
    }

    // City action buttons (buildings, trade, siege, food) — only if owned and close
    const hasSiegeWorkshop = city.buildings.some((b) => b.type === "siege_workshop" && b.level > 0);
    let cityActionsHTML = "";
    if (isOwned && canInteract) {
      const canBuyFood = city.foodStock > 0 && this._state!.gold >= FOOD_PURCHASE_COST;
      cityActionsHTML = `
        <div style="margin-top:14px;border-top:1px solid #443322;padding-top:12px;display:flex;gap:8px;flex-wrap:wrap">
          <button id="city-buildings-btn" style="
            padding:6px 14px;font-size:12px;border:1px solid #daa520;border-radius:4px;
            background:rgba(218,165,32,0.15);color:#daa520;cursor:pointer;font-family:inherit;
          ">\uD83C\uDFD7 Buildings</button>
          <button id="city-trade-btn" style="
            padding:6px 14px;font-size:12px;border:1px solid #cc8844;border-radius:4px;
            background:rgba(204,136,68,0.15);color:#cc8844;cursor:pointer;font-family:inherit;
          ">\uD83D\uDCE6 Trade</button>
          ${hasSiegeWorkshop ? `
            <button id="city-siege-btn" style="
              padding:6px 14px;font-size:12px;border:1px solid #666688;border-radius:4px;
              background:rgba(102,102,136,0.15);color:#8888aa;cursor:pointer;font-family:inherit;
            ">\u2694 Siege Equipment</button>
          ` : ""}
          <button id="city-buy-food-btn" style="
            padding:6px 14px;font-size:12px;
            border:1px solid ${canBuyFood ? "#66aa66" : "#444"};border-radius:4px;
            background:${canBuyFood ? "rgba(102,170,102,0.15)" : "rgba(20,15,10,0.6)"};
            color:${canBuyFood ? "#66cc66" : "#555"};
            cursor:${canBuyFood ? "pointer" : "not-allowed"};font-family:inherit;
          " ${canBuyFood ? "" : "disabled"}>Buy Food (${FOOD_PURCHASE_COST}g/ea, stock: ${city.foodStock})</button>
        </div>
      `;
    }

    // Attack button (if enemy city and close enough)
    let attackHTML = "";
    if (!isOwned && canInteract) {
      attackHTML = `
        <button id="camp-attack-city" style="
          margin-top:16px;padding:10px 24px;font-size:14px;font-weight:bold;
          border:2px solid #cc4444;border-radius:6px;
          background:rgba(204,68,68,0.2);color:#ff6666;
          cursor:pointer;font-family:inherit;width:100%;
        ">Attack City (${city.garrisonTotal} defenders)</button>
      `;
    }

    this._cityPanel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div>
          <h2 style="font-size:24px;color:${factionColor};margin:0">${city.name}</h2>
          <span style="font-size:12px;color:#887766">${factionDef?.name ?? city.factionId} — ${factionDef?.title ?? ""}</span>
          ${!isOwned ? `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;margin-left:6px;vertical-align:middle;background:${this._relationColor(this._getRelation(this._state!.playerFaction, city.factionId))}" title="Relation: ${this._getRelation(this._state!.playerFaction, city.factionId)} (${this._getRelationStatus(this._state!.playerFaction, city.factionId)})"></span>` : ""}
        </div>
        <button id="camp-close-city" style="
          padding:4px 12px;font-size:14px;border:1px solid #555;border-radius:4px;
          background:rgba(30,25,15,0.6);color:#888;cursor:pointer;font-family:inherit;
        ">X</button>
      </div>
      ${!canInteract ? `<div style="color:#cc8844;font-size:12px;margin-bottom:8px">Move closer to interact with this city.</div>` : ""}
      <div style="margin-bottom:12px">
        <div style="color:#998877;font-size:12px;margin-bottom:4px">GARRISON (${city.garrisonTotal})</div>
        <div style="font-size:12px;color:#ccc;line-height:1.6">${garrisonHTML || "<span style='color:#666'>Empty</span>"}</div>
      </div>
      ${hireHTML}
      ${cityActionsHTML}
      ${attackHTML}
    `;

    this._container!.appendChild(this._cityPanel);

    // Bind events
    document.getElementById("camp-close-city")?.addEventListener("click", () => {
      this._removeCityPanel();
      if (this._state) {
        this._state.selectedCity = null;
        this._state.paused = false;
      }
    });

    // Hire buttons
    this._cityPanel.querySelectorAll(".camp-hire-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const unitId = (btn as HTMLElement).dataset.unit!;
        const cost = parseInt((btn as HTMLElement).dataset.cost ?? "0");
        this._hireUnit(unitId, cost);
        // Refresh panel
        this._showCityPanel(city);
      });
    });

    // Attack button
    document.getElementById("camp-attack-city")?.addEventListener("click", () => {
      this._removeCityPanel();
      this._startCityBattle(city);
    });

    // City action buttons
    document.getElementById("city-buildings-btn")?.addEventListener("click", () => {
      this._removeCityPanel();
      this._showBuildingPanel(city);
    });
    document.getElementById("city-trade-btn")?.addEventListener("click", () => {
      this._removeCityPanel();
      this._showTradePanel(city);
    });
    document.getElementById("city-siege-btn")?.addEventListener("click", () => {
      this._removeCityPanel();
      this._showSiegeEquipPanel(city);
    });
    document.getElementById("city-buy-food-btn")?.addEventListener("click", () => {
      if (!this._state) return;
      const buyAmount = Math.min(city.foodStock, 10, Math.floor(this._state.gold / FOOD_PURCHASE_COST));
      if (buyAmount > 0) {
        this._state.gold -= buyAmount * FOOD_PURCHASE_COST;
        this._state.food += buyAmount;
        city.foodStock -= buyAmount;
        this._addLog(`Bought ${buyAmount} food from ${city.name} for ${buyAmount * FOOD_PURCHASE_COST}g.`);
        this._showCityPanel(city); // refresh
      }
    });
  }

  private _removeCityPanel(): void {
    if (this._cityPanel?.parentNode) {
      this._cityPanel.parentNode.removeChild(this._cityPanel);
      this._cityPanel = null;
      this._setCanvasPointerEvents(true);
    }
  }

  private _hireUnit(unitId: string, cost: number): void {
    if (!this._state) return;
    if (this._state.gold < cost) return;
    if (this._state.playerParty.armyTotal >= MAX_PARTY_SIZE + this._getPerkCount("commander") * 5) return;

    this._state.gold -= cost;
    const existing = this._state.playerParty.army.find((a) => a.unitId === unitId && a.xp === 0);
    if (existing) {
      existing.count++;
    } else {
      this._state.playerParty.army.push({ unitId, count: 1, xp: 0 });
    }
    this._state.playerParty.armyTotal++;
    this._addLog(`Hired 1 ${unitId.replace(/_/g, " ")} for ${cost}g.`);
  }

  // ---------------------------------------------------------------------------
  // Party info tooltip
  // ---------------------------------------------------------------------------

  private _showPartyPanel(party: CampaignParty): void {
    if (!this._state) return;
    this._removePartyPanel();
    this._setCanvasPointerEvents(false);

    const factionDef = CAMPAIGN_FACTIONS.find((f) => f.id === party.factionId);
    const factionColor = factionDef ? `#${factionDef.accentColor.toString(16).padStart(6, "0")}` : "#888";

    const dist = Math.hypot(party.x - this._state.playerParty.x, party.y - this._state.playerParty.y);
    const canAttack = dist < 60 && !party.isPlayer;

    this._partyPanel = document.createElement("div");
    this._partyPanel.style.cssText = `
      position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
      width:400px;max-height:60vh;overflow-y:auto;
      background:rgba(15,12,8,0.97);border:2px solid ${factionColor};border-radius:10px;
      padding:20px;z-index:10;
    `;

    const armyHTML = party.army.map((a) => {
      const uDef = CAMPAIGN_UNITS.find((u) => u.id === a.unitId);
      const xpDisplay = party.isPlayer ? ` <span style="color:#aa8833;font-size:10px">${_xpBar(a.xp)}</span>` : "";
      return `<span style="margin-right:10px">${uDef?.name ?? a.unitId} x${a.count}${xpDisplay}</span>`;
    }).join("");

    this._partyPanel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <h3 style="color:${factionColor};margin:0">${party.name}</h3>
        <button id="camp-close-party" style="
          padding:4px 12px;font-size:14px;border:1px solid #555;border-radius:4px;
          background:rgba(30,25,15,0.6);color:#888;cursor:pointer;font-family:inherit;
        ">X</button>
      </div>
      <div style="font-size:12px;color:#998877;margin-bottom:6px">${factionDef?.name ?? party.factionId} | ${party.armyTotal} units${!party.isPlayer ? ` <span style="display:inline-block;width:8px;height:8px;border-radius:50%;margin-left:4px;vertical-align:middle;background:${this._relationColor(this._getRelation(this._state!.playerFaction, party.factionId))}" title="Relation: ${this._getRelation(this._state!.playerFaction, party.factionId)} (${this._getRelationStatus(this._state!.playerFaction, party.factionId)})"></span>` : ""}</div>
      <div style="font-size:12px;color:#ccc;line-height:1.6">${armyHTML}</div>
      ${canAttack ? `
        <button id="camp-attack-party" style="
          margin-top:14px;padding:8px 20px;font-size:13px;font-weight:bold;
          border:2px solid #cc4444;border-radius:6px;
          background:rgba(204,68,68,0.2);color:#ff6666;
          cursor:pointer;font-family:inherit;width:100%;
        ">Attack (${party.armyTotal} troops)</button>
      ` : ""}
      ${party.isPlayer ? `
        <div style="margin-top:12px;border-top:1px solid #443322;padding-top:10px">
          <div style="color:#daa520;font-size:12px;margin-bottom:6px">YOUR ARMY</div>
          <div style="font-size:12px;color:#ccc;line-height:1.6">${armyHTML}</div>
        </div>
      ` : ""}
    `;

    this._container!.appendChild(this._partyPanel);

    document.getElementById("camp-close-party")?.addEventListener("click", () => {
      this._removePartyPanel();
    });

    document.getElementById("camp-attack-party")?.addEventListener("click", () => {
      this._removePartyPanel();
      this._startPartyBattleWithDeployment(party);
    });
  }

  private _removePartyPanel(): void {
    if (this._partyPanel?.parentNode) {
      this._partyPanel.parentNode.removeChild(this._partyPanel);
      this._partyPanel = null;
      this._setCanvasPointerEvents(true);
    }
  }

  // ---------------------------------------------------------------------------
  // Village panel
  // ---------------------------------------------------------------------------

  private _showVillagePanel(village: CampaignVillage): void {
    if (!this._state) return;
    this._removeVillagePanel();
    this._state.paused = true;
    this._setCanvasPointerEvents(false);

    const factionDef = CAMPAIGN_FACTIONS.find((f) => f.id === village.factionId);
    const factionColor = factionDef ? `#${factionDef.accentColor.toString(16).padStart(6, "0")}` : "#888";
    const isOwned = village.factionId === this._state.playerFaction;
    const dist = Math.hypot(village.x - this._state.playerParty.x, village.y - this._state.playerParty.y);
    const canRaid = !isOwned && dist < 60;

    this._villagePanel = document.createElement("div");
    this._villagePanel.style.cssText = `
      position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
      width:380px;max-height:60vh;overflow-y:auto;
      background:rgba(15,12,8,0.97);border:2px solid ${factionColor};border-radius:10px;
      padding:20px;z-index:10;
    `;

    this._villagePanel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <h3 style="color:${factionColor};margin:0">${village.name}</h3>
        <button id="camp-close-village" style="
          padding:4px 12px;font-size:14px;border:1px solid #555;border-radius:4px;
          background:rgba(30,25,15,0.6);color:#888;cursor:pointer;font-family:inherit;
        ">X</button>
      </div>
      <div style="font-size:12px;color:#998877;margin-bottom:6px">${factionDef?.name ?? village.factionId} Village</div>
      <div style="font-size:12px;color:#ccc;margin-bottom:4px">Population: ${village.population}</div>
      <div style="font-size:12px;color:#ccc;margin-bottom:4px">Income: ${village.income}g/day</div>
      <div style="font-size:12px;color:#ccc;margin-bottom:8px">Linked City: ${this._state.cities.find((c) => c.id === village.linkedCityId)?.name ?? "Unknown"}</div>
      ${canRaid ? `
        <button id="camp-raid-village" style="
          margin-top:10px;padding:8px 20px;font-size:13px;font-weight:bold;
          border:2px solid #cc4444;border-radius:6px;
          background:rgba(204,68,68,0.2);color:#ff6666;
          cursor:pointer;font-family:inherit;width:100%;
        ">Raid Village (+${village.population * 2}g)</button>
      ` : ""}
    `;

    this._container!.appendChild(this._villagePanel);

    document.getElementById("camp-close-village")?.addEventListener("click", () => {
      this._removeVillagePanel();
      if (this._state) this._state.paused = false;
    });

    document.getElementById("camp-raid-village")?.addEventListener("click", () => {
      if (!this._state) return;
      const goldGain = village.population * 2;
      this._state.gold += goldGain;
      village.factionId = this._state.playerFaction;
      const oldPop = village.population;
      village.population = Math.floor(oldPop * 0.7);
      village.income = Math.floor(village.population / 4);
      this._addLog(`Raided ${village.name}! +${goldGain}g. Population dropped from ${oldPop} to ${village.population}.`);
      this._removeVillagePanel();
      this._state.paused = false;
    });
  }

  private _removeVillagePanel(): void {
    if (this._villagePanel?.parentNode) {
      this._villagePanel.parentNode.removeChild(this._villagePanel);
      this._villagePanel = null;
      this._setCanvasPointerEvents(true);
    }
  }

  // ---------------------------------------------------------------------------
  // Special location panel
  // ---------------------------------------------------------------------------

  private _showLocationPanel(loc: SpecialLocation): void {
    if (!this._state) return;
    this._removeLocationPanel();
    this._state.paused = true;
    this._setCanvasPointerEvents(false);

    const dist = Math.hypot(loc.x - this._state.playerParty.x, loc.y - this._state.playerParty.y);
    const canExplore = !loc.explored && dist < 60;

    const typeColor = loc.type === "lair" ? "#cc4444" : loc.type === "shrine" ? "#ffd700" : loc.type === "treasure" ? "#cc8844" : loc.type === "dungeon" ? "#6666cc" : "#aa9977";

    this._locationPanel = document.createElement("div");
    this._locationPanel.style.cssText = `
      position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
      width:400px;max-height:60vh;overflow-y:auto;
      background:rgba(15,12,8,0.97);border:2px solid ${typeColor};border-radius:10px;
      padding:20px;z-index:10;
    `;

    const rewardText = loc.reward.unitId
      ? `${loc.reward.gold}g + ${loc.reward.unitCount} ${loc.reward.unitId.replace(/_/g, " ")}`
      : `${loc.reward.gold}g`;

    this._locationPanel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <h3 style="color:${typeColor};margin:0">${loc.name}</h3>
        <button id="camp-close-location" style="
          padding:4px 12px;font-size:14px;border:1px solid #555;border-radius:4px;
          background:rgba(30,25,15,0.6);color:#888;cursor:pointer;font-family:inherit;
        ">X</button>
      </div>
      <div style="font-size:12px;color:#998877;margin-bottom:6px;text-transform:capitalize">${loc.type} — Difficulty: ${loc.difficulty}</div>
      <div style="font-size:12px;color:#ccc;margin-bottom:4px">Status: ${loc.explored ? '<span style="color:#666">Explored</span>' : '<span style="color:#ffcc44">Unexplored</span>'}</div>
      ${!loc.explored ? `<div style="font-size:12px;color:#aa9977;margin-bottom:8px">Potential reward: ${rewardText}</div>` : ""}
      ${!canExplore && !loc.explored && dist >= 60 ? `<div style="color:#cc8844;font-size:12px;margin-bottom:8px">Move closer to explore.</div>` : ""}
      ${canExplore ? `
        <button id="camp-explore-location" style="
          margin-top:10px;padding:8px 20px;font-size:13px;font-weight:bold;
          border:2px solid ${typeColor};border-radius:6px;
          background:rgba(${loc.type === "lair" ? "204,68,68" : loc.type === "shrine" ? "218,165,32" : "150,130,100"},0.2);color:${typeColor};
          cursor:pointer;font-family:inherit;width:100%;
        ">Explore (${loc.difficulty} enemies)</button>
      ` : ""}
    `;

    this._container!.appendChild(this._locationPanel);

    document.getElementById("camp-close-location")?.addEventListener("click", () => {
      this._removeLocationPanel();
      if (this._state) this._state.paused = false;
    });

    document.getElementById("camp-explore-location")?.addEventListener("click", () => {
      this._removeLocationPanel();
      this._startLocationBattle(loc);
    });
  }

  private _removeLocationPanel(): void {
    if (this._locationPanel?.parentNode) {
      this._locationPanel.parentNode.removeChild(this._locationPanel);
      this._locationPanel = null;
    }
    this._setCanvasPointerEvents(true);
  }

  private _startLocationBattle(loc: SpecialLocation): void {
    if (!this._state || this._inBattle) return;
    this._inBattle = true;
    this._state.paused = true;
    this._battleEnemyPartyId = null;
    this._battleEnemyCityId = null;
    this._battleLocationId = loc.id;
    this._battlePlayerArmy = this._state.playerParty.army.map((a) => ({ ...a }));

    // Generate enemies based on difficulty
    const enemyArmy = _generateGarrison("enemy", loc.difficulty);
    this._battleEnemyArmy = enemyArmy;

    this._addLog(`Exploring ${loc.name}! (${loc.difficulty} enemies)`);
    this._launchBattle();
  }

  // ---------------------------------------------------------------------------
  // Input bindings
  // ---------------------------------------------------------------------------

  private _bindInputs(): void {
    this._keyHandler = (e: KeyboardEvent) => {
      this._keysDown.add(e.code);
      if (e.code === "Escape") {
        if (this._cityPanel) {
          this._removeCityPanel();
          if (this._state) { this._state.selectedCity = null; this._state.paused = false; }
        } else if (this._partyPanel) {
          this._removePartyPanel();
          if (this._state) this._state.paused = false;
        } else if (this._villagePanel) {
          this._removeVillagePanel();
          if (this._state) this._state.paused = false;
        } else if (this._locationPanel) {
          this._removeLocationPanel();
          if (this._state) this._state.paused = false;
        } else if (this._battlePreviewPanel) {
          // Treat escape on battle preview as retreat
          this._removeBattlePreview();
          if (this._state) {
            this._state.battlePreviewEnemy = null;
            this._state.paused = false;
            this._state.playerParty.retreatPenaltyUntilTick = this._state.tick + 300;
          }
        } else if (this._caravanPanel) {
          this._removeCaravanPanel();
          if (this._state) this._state.paused = false;
        } else if (this._npcPanel) {
          this._removeNPCPanel();
          if (this._state) this._state.paused = false;
        } else if (this._companionPanel) {
          this._removeCompanionPanel();
          if (this._state) this._state.paused = false;
        } else if (this._buildingPanel) {
          this._removeBuildingPanel();
          if (this._state) this._state.paused = false;
        } else if (this._tradePanel) {
          this._removeTradePanel();
          if (this._state) this._state.paused = false;
        } else if (this._warCouncilPanel) {
          this._removeWarCouncilPanel();
          if (this._state) this._state.paused = false;
        } else if (this._mercPanel) {
          this._removeMercPanel();
          if (this._state) this._state.paused = false;
        } else if (this._victoryPanel) {
          this._removeVictoryPanel();
          if (this._state) this._state.paused = false;
        } else if (this._siegeEquipPanel) {
          this._removeSiegeEquipPanel();
          if (this._state) this._state.paused = false;
        } else if (this._campaignPauseMenuContainer) {
          if (this._state) this._state.paused = false;
          this._hideCampaignPauseMenu();
          this._updateTopBar();
        } else if (this._state) {
          this._state.paused = !this._state.paused;
          this._updateTopBar();
          if (this._state.paused) {
            this._showCampaignPauseMenu();
          }
        }
      }
      if (e.code === "Space") {
        if (this._state) { this._state.paused = !this._state.paused; this._updateTopBar(); }
      }
      if (e.code === "KeyD") {
        if (this._diplomacyPanel) {
          this._removeDiplomacyPanel();
          if (this._state) this._state.paused = false;
        } else if (!this._cityPanel && !this._partyPanel) {
          this._showDiplomacyPanel();
        }
      }
      if (e.code === "KeyC") {
        if (this._companionPanel) {
          this._removeCompanionPanel();
          if (this._state) this._state.paused = false;
        } else if (!this._cityPanel && !this._partyPanel) {
          this._showCompanionPanel();
        }
      }
      if (e.code === "KeyB") {
        if (this._buildingPanel) {
          this._removeBuildingPanel();
          if (this._state) this._state.paused = false;
        } else if (!this._cityPanel && !this._partyPanel && this._state) {
          const nearest = this._state.cities
            .filter((c) => c.factionId === this._state!.playerFaction)
            .sort((a, b) =>
              Math.hypot(a.x - this._state!.playerParty.x, a.y - this._state!.playerParty.y) -
              Math.hypot(b.x - this._state!.playerParty.x, b.y - this._state!.playerParty.y)
            )[0];
          if (nearest) this._showBuildingPanel(nearest);
        }
      }
      if (e.code === "KeyT") {
        if (this._tradePanel) {
          this._removeTradePanel();
          if (this._state) this._state.paused = false;
        } else if (!this._cityPanel && !this._partyPanel && this._state) {
          const nearest = this._state.cities
            .filter((c) => c.factionId === this._state!.playerFaction)
            .sort((a, b) =>
              Math.hypot(a.x - this._state!.playerParty.x, a.y - this._state!.playerParty.y) -
              Math.hypot(b.x - this._state!.playerParty.x, b.y - this._state!.playerParty.y)
            )[0];
          if (nearest) this._showTradePanel(nearest);
        }
      }
      if (e.code === "KeyW") {
        if (this._warCouncilPanel) {
          this._removeWarCouncilPanel();
          if (this._state) this._state.paused = false;
        } else if (!this._cityPanel && !this._partyPanel) {
          this._showWarCouncilPanel();
        }
      }
      if (e.code === "KeyV") {
        if (this._victoryPanel) {
          this._removeVictoryPanel();
          if (this._state) this._state.paused = false;
        } else if (!this._cityPanel && !this._partyPanel) {
          this._showVictoryPanel();
        }
      }
      if (e.code === "KeyM") {
        if (this._mercPanel) {
          this._removeMercPanel();
          if (this._state) this._state.paused = false;
        } else if (!this._cityPanel && !this._partyPanel) {
          this._showMercPanel();
        }
      }
    };
    this._keyUpHandler = (e: KeyboardEvent) => {
      this._keysDown.delete(e.code);
    };

    // Left click for city/party interaction, right-click handled in mousedown
    this._canvas!.addEventListener("click", (e: MouseEvent) => {
      if (!this._state || !this._canvas || this._inBattle) return;
      const rect = this._canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) / this._zoom + this._camX;
      const my = (e.clientY - rect.top) / this._zoom + this._camY;

      // Check city clicks
      for (const city of this._state.cities) {
        if (Math.hypot(city.x - mx, city.y - my) < CITY_RADIUS + 5) {
          this._showCityPanel(city);
          return;
        }
      }

      // Check party clicks
      for (const party of this._state.parties) {
        if (Math.hypot(party.x - mx, party.y - my) < PARTY_RADIUS + 5) {
          this._showPartyPanel(party);
          return;
        }
      }
      // Check own party
      const pp = this._state.playerParty;
      if (Math.hypot(pp.x - mx, pp.y - my) < PARTY_RADIUS + 5) {
        this._showPartyPanel(pp);
        return;
      }

      // Check village clicks
      for (const village of this._state.villages) {
        if (Math.hypot(village.x - mx, village.y - my) < 12) {
          this._showVillagePanel(village);
          return;
        }
      }

      // Check special location clicks
      for (const loc of this._state.specialLocations) {
        if (Math.hypot(loc.x - mx, loc.y - my) < 12) {
          this._showLocationPanel(loc);
          return;
        }
      }

      // Check caravan clicks
      for (const caravan of this._state.caravans) {
        if (Math.hypot(caravan.x - mx, caravan.y - my) < 12) {
          const caravanDist = Math.hypot(caravan.x - this._state.playerParty.x, caravan.y - this._state.playerParty.y);
          if (caravanDist < 60) {
            this._showCaravanPanel(caravan);
            return;
          }
        }
      }

      // Check companion clicks
      for (const comp of this._state.companions) {
        if (comp.recruited) continue;
        if (Math.hypot(comp.locationX - mx, comp.locationY - my) < 12) {
          const compDist = Math.hypot(comp.locationX - this._state.playerParty.x, comp.locationY - this._state.playerParty.y);
          if (compDist < 60) {
            this._showCompanionPanel();
            return;
          }
        }
      }

      // Check wandering NPC clicks
      for (const npc of this._state.wanderingNPCs) {
        if (npc.interacted) continue;
        if (Math.hypot(npc.x - mx, npc.y - my) < 10) {
          const npcDist = Math.hypot(npc.x - this._state.playerParty.x, npc.y - this._state.playerParty.y);
          if (npcDist < 60) {
            this._showNPCPanel(npc);
            return;
          }
        }
      }

      // Check event location clicks (deserters events)
      for (const evt of this._state.events) {
        if (!evt.active || evt.type !== "deserters" || !evt.mapX || !evt.mapY) continue;
        if (Math.hypot(evt.mapX - mx, evt.mapY - my) < 15) {
          const evtDist = Math.hypot(evt.mapX - this._state.playerParty.x, evt.mapY - this._state.playerParty.y);
          if (evtDist < 60) {
            // Recruit free deserters
            const pool = CAMPAIGN_UNITS.filter(u => u.tier <= 2);
            const unit = pool[Math.floor(Math.random() * pool.length)];
            const count = 2 + Math.floor(Math.random() * 4);
            const existing = this._state.playerParty.army.find(a => a.unitId === unit.id && a.xp === 0);
            if (existing) {
              existing.count += count;
            } else {
              this._state.playerParty.army.push({ unitId: unit.id, count, xp: 0 });
            }
            this._state.playerParty.armyTotal += count;
            this._addLog(`Recruited ${count} ${unit.name} from the deserters!`);
            evt.active = false;
            return;
          }
        }
      }

      // Otherwise set move target
      this._state.playerParty.targetX = Math.max(10, Math.min(MAP_W - 10, mx));
      this._state.playerParty.targetY = Math.max(10, Math.min(MAP_H - 10, my));
    });

    // Middle mouse / right mouse drag for camera pan
    this._mouseDownHandler = (e: MouseEvent) => {
      if (e.button === 1 || e.button === 2) {
        this._isDragging = true;
        this._dragStartX = e.clientX;
        this._dragStartY = e.clientY;
        this._camStartX = this._camX;
        this._camStartY = this._camY;
      }
    };
    this._mouseUpHandler = () => {
      this._isDragging = false;
    };
    this._mouseMoveHandler = (e: MouseEvent) => {
      if (this._isDragging) {
        this._camX = this._camStartX - (e.clientX - this._dragStartX) / this._zoom;
        this._camY = this._camStartY - (e.clientY - this._dragStartY) / this._zoom;
      }
    };
    this._wheelHandler = (e: WheelEvent) => {
      const oldZoom = this._zoom;
      const minZoom = Math.max(window.innerWidth / MAP_W, window.innerHeight / MAP_H);
      this._zoom = Math.max(minZoom, Math.min(3.0, this._zoom - e.deltaY * 0.001));
      // Zoom toward mouse position
      if (this._canvas) {
        const rect = this._canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left);
        const my = (e.clientY - rect.top);
        this._camX += mx / oldZoom - mx / this._zoom;
        this._camY += my / oldZoom - my / this._zoom;
      }
    };

    window.addEventListener("keydown", this._keyHandler);
    window.addEventListener("keyup", this._keyUpHandler);
    this._canvas!.addEventListener("contextmenu", (e) => e.preventDefault());
    this._canvas!.addEventListener("mousedown", this._mouseDownHandler);
    window.addEventListener("mouseup", this._mouseUpHandler);
    window.addEventListener("mousemove", this._mouseMoveHandler);
    this._canvas!.addEventListener("wheel", this._wheelHandler);
  }

  private _unbindInputs(): void {
    if (this._keyHandler) window.removeEventListener("keydown", this._keyHandler);
    if (this._keyUpHandler) window.removeEventListener("keyup", this._keyUpHandler);
    if (this._mouseUpHandler) window.removeEventListener("mouseup", this._mouseUpHandler);
    if (this._mouseMoveHandler) window.removeEventListener("mousemove", this._mouseMoveHandler);
  }

  // ---------------------------------------------------------------------------
  // Game loop
  // ---------------------------------------------------------------------------

  private _gameLoop = (time: number): void => {
    this._rafId = requestAnimationFrame(this._gameLoop);
    if (!this._state || this._inBattle) return;

    const dt = time - this._lastTime;
    this._lastTime = time;
    if (dt > 100) return; // skip large gaps

    if (!this._state.paused && !this._state.gameOver) {
      const steps = this._state.speed;
      for (let i = 0; i < steps; i++) {
        this._update();
      }
    }

    this._render();
    // Update UI every 30 frames
    if (this._state.tick % 30 === 0) {
      this._updateTopBar();
      this._updateLogPanel();
    }
  };

  private _update(): void {
    if (!this._state) return;
    const s = this._state;
    s.tick++;

    // Day progression
    if (s.tick % DAY_TICKS === 0) {
      s.day++;
      s.gold += GOLD_PER_DAY;
      // City income
      const ownedCities = s.cities.filter((c) => c.factionId === s.playerFaction);
      const merchantMult = 1 + this._getPerkCount("merchant") * 0.2;
      s.gold += Math.round(ownedCities.length * 30 * merchantMult);
      // Village income
      let villageIncome = 0;
      for (const v of s.villages) {
        if (v.factionId === s.playerFaction) villageIncome += v.income;
        // Village population recovery
        if (v.population < 100) v.population = Math.min(100, v.population + 1);
        v.income = Math.floor(v.population / 4);
      }
      s.gold += Math.round(villageIncome * merchantMult);
      // Army upkeep
      let totalUpkeep = 0;
      for (const slot of s.playerParty.army) {
        totalUpkeep += this._getUnitUpkeep(slot.unitId) * slot.count;
      }
      s.gold -= totalUpkeep;
      if (s.day % 5 === 0) {
        this._addLog(`Day ${s.day} — Income: ${GOLD_PER_DAY + ownedCities.length * 30}g, Upkeep: -${totalUpkeep}g`);
      }
      // Diplomacy: every 10 days, relations drift toward 0 by 2 points (grudges fade)
      if (s.day % 10 === 0) {
        for (const [fA, innerMap] of s.factionRelations) {
          for (const [fB, val] of innerMap) {
            if (fA === fB) continue;
            if (val > 0) {
              innerMap.set(fB, Math.max(0, val - 2));
            } else if (val < 0) {
              innerMap.set(fB, Math.min(0, val + 2));
            }
          }
        }
      }
      // Desertion when gold is negative
      if (s.gold < 0 && s.playerParty.army.length > 0 && Math.random() < 0.1) {
        const idx = Math.floor(Math.random() * s.playerParty.army.length);
        const slot = s.playerParty.army[idx];
        const unitDef = CAMPAIGN_UNITS.find((u) => u.id === slot.unitId) ?? Object.values(FACTION_ELITES).find((u) => u.id === slot.unitId);
        slot.count--;
        s.playerParty.armyTotal--;
        if (slot.count <= 0) s.playerParty.army.splice(idx, 1);
        this._addLog(`A ${unitDef?.name ?? slot.unitId} deserted due to lack of pay!`);
      }

      // -----------------------------------------------------------------------
      // Season progression
      // -----------------------------------------------------------------------
      if (s.day % SEASON_LENGTH_DAYS === 0) {
        const curIdx = SEASON_ORDER.indexOf(s.season);
        s.season = SEASON_ORDER[(curIdx + 1) % SEASON_ORDER.length];
        const eff = SEASON_EFFECTS[s.season];
        this._addLog(`Season changed to ${eff.label}! Speed ×${eff.speedMult}, Income ×${eff.incomeMult}, Food cost ×${eff.foodMult}`);
      }

      const seasonEff = SEASON_EFFECTS[s.season];
      const armyTotal = s.playerParty.armyTotal;

      // -----------------------------------------------------------------------
      // Food consumption
      // -----------------------------------------------------------------------
      const logisticianReduction = 1 - this._getPerkCount("logistician") * 0.15;
      const foodConsumed = FOOD_PER_UNIT_PER_DAY * armyTotal * seasonEff.foodMult * logisticianReduction;
      s.food -= foodConsumed;
      if (s.food <= 0) {
        s.food = 0;
        s.campaignMorale = Math.max(MORALE_MIN, s.campaignMorale + MORALE_FOOD_PENALTY);
        this._addLog("No food! Morale drops.");
      }

      // -----------------------------------------------------------------------
      // Food auto-purchase from nearby owned cities
      // -----------------------------------------------------------------------
      if (s.food < 20) {
        const ownCities = s.cities.filter(c => c.factionId === s.playerFaction);
        for (const city of ownCities) {
          const dist = Math.hypot(city.x - s.playerParty.x, city.y - s.playerParty.y);
          if (dist < 80 && city.foodStock > 0 && s.gold >= FOOD_PURCHASE_COST) {
            const canBuy = Math.min(city.foodStock, FOOD_CITY_STOCK, Math.floor(s.gold / FOOD_PURCHASE_COST), Math.ceil(20 - s.food));
            if (canBuy > 0) {
              s.food += canBuy;
              city.foodStock -= canBuy;
              s.gold -= canBuy * FOOD_PURCHASE_COST;
              this._addLog(`Auto-purchased ${canBuy} food from ${city.name} for ${canBuy * FOOD_PURCHASE_COST}g.`);
            }
            if (s.food >= 20) break;
          }
        }
      }

      // -----------------------------------------------------------------------
      // Morale update: territory bonus near own cities, clamp, desertion
      // -----------------------------------------------------------------------
      const nearOwnCity = s.cities.some(c => c.factionId === s.playerFaction && Math.hypot(c.x - s.playerParty.x, c.y - s.playerParty.y) < 100);
      if (nearOwnCity) {
        s.campaignMorale = Math.min(MORALE_MAX, s.campaignMorale + MORALE_TERRITORY_BONUS);
      }
      s.campaignMorale = Math.max(MORALE_MIN, Math.min(MORALE_MAX, s.campaignMorale));
      if (s.campaignMorale < MORALE_DESERTION_THRESHOLD && Math.random() < 0.15 && s.playerParty.army.length > 0) {
        const di = Math.floor(Math.random() * s.playerParty.army.length);
        const dSlot = s.playerParty.army[di];
        const dDef = CAMPAIGN_UNITS.find(u => u.id === dSlot.unitId);
        dSlot.count--;
        s.playerParty.armyTotal--;
        if (dSlot.count <= 0) s.playerParty.army.splice(di, 1);
        this._addLog(`A ${dDef?.name ?? dSlot.unitId} deserted due to low morale!`);
      }

      // -----------------------------------------------------------------------
      // Lord AI updates (every 5 days within the day block)
      // -----------------------------------------------------------------------
      if (s.day % 5 === 0) {
        for (const lord of s.lords) {
          // Captured lords may be ransomed
          if (lord.capturedBy) {
            if (Math.random() < 0.2) {
              lord.capturedBy = null;
              this._addLog(`Lord ${lord.name} has been ransomed and is free.`);
            }
            continue;
          }
          // Respawn lords whose party is dead
          const lordParty = s.parties.find(p => p.id === lord.partyId);
          if (!lordParty || lordParty.armyTotal <= 0) {
            const factionCities = s.cities.filter(c => c.factionId === lord.factionId);
            if (factionCities.length > 0) {
              const spawnCity = factionCities[Math.floor(Math.random() * factionCities.length)];
              const newId = `lord_party_${lord.id}_${s.day}`;
              const size = 5 + Math.floor(Math.random() * 8);
              const army: { unitId: string; count: number; xp: number }[] = [];
              const pool = CAMPAIGN_UNITS.filter(u => u.tier <= 3);
              for (let i = 0; i < size; i++) {
                const unit = pool[Math.floor(Math.random() * pool.length)];
                const existing = army.find(a => a.unitId === unit.id);
                if (existing) existing.count++;
                else army.push({ unitId: unit.id, count: 1, xp: 0 });
              }
              const newParty: CampaignParty = {
                id: newId, name: `${lord.name}'s Warband`, x: spawnCity.x + (Math.random() - 0.5) * 30,
                y: spawnCity.y + (Math.random() - 0.5) * 30, factionId: lord.factionId, army,
                armyTotal: size, targetX: spawnCity.x, targetY: spawnCity.y, isPlayer: false,
                speed: AI_SPEED, homeCity: spawnCity.id, lordId: lord.id,
              };
              s.parties.push(newParty);
              lord.partyId = newId;
              this._addLog(`Lord ${lord.name} has raised a new warband near ${spawnCity.name}.`);
            }
          }
          // Aggressive lords pursue player more
          if (lord.personality === "aggressive" && !lord.capturedBy) {
            const lParty = s.parties.find(p => p.id === lord.partyId);
            if (lParty && lParty.armyTotal > 0) {
              const distToPlayer = Math.hypot(lParty.x - s.playerParty.x, lParty.y - s.playerParty.y);
              if (distToPlayer < 300) {
                lParty.targetX = s.playerParty.x;
                lParty.targetY = s.playerParty.y;
                lParty.speed = AI_SPEED * 1.3;
              }
            }
          }
        }
      }

      // -----------------------------------------------------------------------
      // Companion loyalty
      // -----------------------------------------------------------------------
      for (let ci = s.companions.length - 1; ci >= 0; ci--) {
        const comp = s.companions[ci];
        if (!comp.recruited) continue;
        if (s.campaignMorale > 50) comp.loyalty = Math.min(100, comp.loyalty + 1);
        else if (s.campaignMorale < 30) comp.loyalty = Math.max(0, comp.loyalty - 2);
        if (comp.loyalty < 10) {
          this._addLog(`Companion ${comp.name} has left your party due to low loyalty!`);
          comp.recruited = false;
          comp.locationX = s.playerParty.x + (Math.random() - 0.5) * 200;
          comp.locationY = s.playerParty.y + (Math.random() - 0.5) * 200;
        }
      }

      // -----------------------------------------------------------------------
      // Trade price fluctuation (every 3 days)
      // -----------------------------------------------------------------------
      if (s.day % 3 === 0) {
        for (const city of s.cities) {
          for (const slot of city.tradeGoods) {
            const shift = 1 + (Math.random() * 0.2 - 0.1); // ±10%
            slot.price = Math.max(1, Math.round(slot.price * shift));
          }
        }
      }

      // -----------------------------------------------------------------------
      // Mercenary contract countdown
      // -----------------------------------------------------------------------
      for (let mi = s.mercContracts.length - 1; mi >= 0; mi--) {
        const mc = s.mercContracts[mi];
        if (!mc.hired) continue;
        mc.duration--;
        if (mc.duration <= 0) {
          // Remove those units from player army
          for (const mu of mc.units) {
            const armySlot = s.playerParty.army.find(a => a.unitId === mu.unitId);
            if (armySlot) {
              armySlot.count = Math.max(0, armySlot.count - mu.count);
              s.playerParty.armyTotal = Math.max(0, s.playerParty.armyTotal - mu.count);
              if (armySlot.count <= 0) {
                const idx = s.playerParty.army.indexOf(armySlot);
                if (idx >= 0) s.playerParty.army.splice(idx, 1);
              }
            }
          }
          this._addLog(`Mercenary contract "${mc.name}" has expired. Units dismissed.`);
          s.mercContracts.splice(mi, 1);
        }
      }

      // -----------------------------------------------------------------------
      // Siege equipment building
      // -----------------------------------------------------------------------
      for (const city of s.cities) {
        if (city.factionId !== s.playerFaction) continue;
        for (let si = city.siegeEquipment.length - 1; si >= 0; si--) {
          const se = city.siegeEquipment[si];
          se.daysLeft--;
          if (se.daysLeft <= 0) {
            const existing = s.playerSiegeEquip.find(e => e.type === se.type);
            if (existing) existing.count++;
            else s.playerSiegeEquip.push({ type: se.type, count: 1 });
            const seDef = SIEGE_EQUIPMENT_DEFS.find(d => d.type === se.type);
            this._addLog(`${seDef?.name ?? se.type} completed in ${city.name}!`);
            city.siegeEquipment.splice(si, 1);
          }
        }
      }

      // -----------------------------------------------------------------------
      // Victory condition checks
      // -----------------------------------------------------------------------
      const playerCities = s.cities.filter(c => c.factionId === s.playerFaction);
      s.victoryProgress.conquest.citiesCaptured = playerCities.length;
      s.victoryProgress.conquest.totalCities = s.cities.length;

      let allianceCount = 0;
      for (const faction of this._getNonPlayerFactions()) {
        if (this._getRelationStatus(s.playerFaction, faction) === "friendly") allianceCount++;
      }
      s.victoryProgress.diplomatic.alliances = allianceCount;
      s.victoryProgress.diplomatic.required = VICTORY_ALLIANCE_REQUIRED;

      s.totalGoldEarned += GOLD_PER_DAY + Math.round(ownedCities.length * 30 * merchantMult) + Math.round(villageIncome * merchantMult);
      s.victoryProgress.economic.goldAccumulated = s.totalGoldEarned;
      s.victoryProgress.economic.target = VICTORY_ECONOMIC_TARGET;

      // Check win conditions
      if (playerCities.length === s.cities.length) {
        s.gameOver = true;
        s.winner = s.playerFaction;
        this._addLog("CONQUEST VICTORY! You have captured all cities!");
      } else if (allianceCount >= VICTORY_ALLIANCE_REQUIRED) {
        s.gameOver = true;
        s.winner = s.playerFaction;
        this._addLog("DIPLOMATIC VICTORY! You have formed enough alliances!");
      } else if (s.totalGoldEarned >= VICTORY_ECONOMIC_TARGET) {
        s.gameOver = true;
        s.winner = s.playerFaction;
        this._addLog("ECONOMIC VICTORY! Your wealth knows no bounds!");
      }
    }

    // City reinforcements & AI faction party spawning
    if (s.tick % REINFORCEMENT_INTERVAL === 0) {
      for (const city of s.cities) {
        if (city.garrisonTotal < CITY_MAX_GARRISON) {
          const pool = CAMPAIGN_UNITS.filter((u) => u.tier <= 3);
          const unit = pool[Math.floor(Math.random() * pool.length)];
          const count = 1 + Math.floor(Math.random() * 3);
          const existing = city.garrison.find((g) => g.unitId === unit.id);
          if (existing) existing.count += count;
          else city.garrison.push({ unitId: unit.id, count, xp: 0 });
          city.garrisonTotal += count;
        }
      }

      // AI factions spawn new roving bands if they have fewer than 2 active parties
      for (const faction of CAMPAIGN_FACTIONS) {
        if (faction.id === s.playerFaction) continue;
        const factionParties = s.parties.filter((p) => p.factionId === faction.id && !p.isPlayer);
        const factionCities = s.cities.filter((c) => c.factionId === faction.id);
        if (factionParties.length < 2 && factionCities.length > 0) {
          const homeCity = factionCities[Math.floor(Math.random() * factionCities.length)];
          const size = 4 + Math.floor(Math.random() * 8);
          const army = _generateGarrison(faction.id, size);
          const bandNames = [
            `${faction.name} Raiders`, `${faction.name} Patrol`, `${faction.name} Warband`,
            `${faction.name} Scouts`, `${faction.name} Marauders`, `${faction.name} Vanguard`,
          ];
          const newParty: CampaignParty = {
            id: `party_ai_${s.tick}_${faction.id}`,
            name: bandNames[Math.floor(Math.random() * bandNames.length)],
            x: homeCity.x + (Math.random() - 0.5) * 80,
            y: homeCity.y + (Math.random() - 0.5) * 80,
            factionId: faction.id,
            army,
            armyTotal: army.reduce((sum, a) => sum + a.count, 0),
            targetX: homeCity.x,
            targetY: homeCity.y,
            isPlayer: false,
            speed: AI_SPEED * (0.7 + Math.random() * 0.6),
            homeCity: homeCity.id,
          };
          s.parties.push(newParty);
        }
      }
    }

    // Move player toward target
    this._moveParty(s.playerParty);

    // Reveal fog of war around player
    _revealFog(s.fogRevealed, s.playerParty.x, s.playerParty.y, SCOUT_RADIUS);
    // Reveal fog around allied cities
    for (const c of s.cities) {
      if (c.factionId === s.playerFaction) {
        _revealFog(s.fogRevealed, c.x, c.y, CITY_SCOUT_RADIUS);
      }
    }

    // Move AI parties
    for (const party of s.parties) {
      this._updateAIParty(party);
      this._moveParty(party);
    }

    // Move caravans
    this._updateCaravans();

    // Move wandering NPCs
    this._updateWanderingNPCs();

    // Check for campaign events
    this._checkCampaignEvents();

    // Expire old events
    for (const evt of s.events) {
      if (evt.active && s.day >= evt.startDay + evt.duration) {
        evt.active = false;
      }
    }

    // Check collisions (player vs enemy parties) — respect diplomacy
    // Instead of auto-engaging, show battle preview when in range
    for (const party of s.parties) {
      if (party.factionId === s.playerFaction) continue;
      const relStatus = this._getRelationStatus(party.factionId, s.playerFaction);
      if (relStatus !== "hostile") continue; // neutral and friendly factions don't attack
      const dist = Math.hypot(party.x - s.playerParty.x, party.y - s.playerParty.y);
      if (dist < ENGAGEMENT_DIST) {
        // Intimidate perk: chance enemies flee
        const intimidateCount = this._getPerkCount("intimidate");
        if (intimidateCount > 0) {
          const fleeChance = intimidateCount * 0.1;
          if (Math.random() < fleeChance) {
            this._state!.parties = this._state!.parties.filter((p) => p.id !== party.id);
            this._addLog(`${party.name} fled in fear of your reputation!`);
            return;
          }
        }
        // Show battle preview instead of auto-engaging
        if (!s.battlePreviewEnemy) {
          s.battlePreviewEnemy = party;
          s.paused = true;
          this._showBattlePreview(party);
        }
        return;
      }
    }

    // AI-vs-AI party collisions (auto-resolve)
    for (let i = s.parties.length - 1; i >= 0; i--) {
      const a = s.parties[i];
      if (a.isPlayer) continue;
      for (let j = i - 1; j >= 0; j--) {
        const b = s.parties[j];
        if (b.isPlayer || a.factionId === b.factionId) continue;
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < ENGAGEMENT_DIST) {
          this._autoResolvePartyBattle(a, b);
          break; // a or b may have been removed, move on
        }
      }
    }

    // AI city sieges (auto-resolve)
    for (let i = s.parties.length - 1; i >= 0; i--) {
      const party = s.parties[i];
      if (party.isPlayer) continue;
      for (const city of s.cities) {
        if (city.factionId === party.factionId) continue;
        const d = Math.hypot(party.x - city.x, party.y - city.y);
        if (d < ENGAGEMENT_DIST) {
          this._autoResolveCitySiege(party, city);
          break;
        }
      }
    }

    // Check faction elimination
    this._checkFactionElimination();

    // Check victory: all cities owned by player
    const allOwned = s.cities.every((c) => c.factionId === s.playerFaction);
    if (allOwned && s.parties.filter((p) => p.factionId !== s.playerFaction).length === 0) {
      s.gameOver = true;
      s.winner = s.playerFaction;
      this._addLog("VICTORY! You have conquered the entire map!");
    }

    // Check defeat: player army destroyed
    if (s.playerParty.armyTotal <= 0 && s.cities.filter((c) => c.factionId === s.playerFaction).length === 0) {
      s.gameOver = true;
      s.winner = null;
      this._addLog("DEFEAT! Your warband has been destroyed and you hold no cities.");
    }
  }

  private _moveParty(party: CampaignParty): void {
    const dx = party.targetX - party.x;
    const dy = party.targetY - party.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 2) return;

    const terrainInfo = this._state ? _getTerrainAt(party.x, party.y, this._state.terrain) : null;
    const terrainMult = terrainInfo ? terrainInfo.mult : 1.0;
    let speed = party.speed * terrainMult;
    if (party.isPlayer && this._state) {
      const swiftCount = this._getPerkCount("swift");
      if (swiftCount > 0) speed *= (1 + swiftCount * 0.15);
      // Retreat speed penalty
      if (party.retreatPenaltyUntilTick && this._state.tick < party.retreatPenaltyUntilTick) {
        speed *= 0.5;
      }
    }
    party.x += (dx / dist) * speed;
    party.y += (dy / dist) * speed;
    party.x = Math.max(10, Math.min(MAP_W - 10, party.x));
    party.y = Math.max(10, Math.min(MAP_H - 10, party.y));
  }

  private _updateAIParty(party: CampaignParty): void {
    if (!this._state) return;
    const dist = Math.hypot(party.targetX - party.x, party.targetY - party.y);
    if (dist > 5) return; // still moving

    const s = this._state;

    // Pick new target: enemy faction city, enemy faction party, chase player, return home, or wander
    const roll = Math.random();

    if (roll < 0.3) {
      // Move toward nearest hostile faction city
      let nearest: CampaignCity | null = null;
      let nearestDist = Infinity;
      for (const city of s.cities) {
        if (city.factionId === party.factionId) continue;
        if (this._getRelationStatus(party.factionId, city.factionId) !== "hostile") continue;
        const d = Math.hypot(city.x - party.x, city.y - party.y);
        if (d < nearestDist) { nearestDist = d; nearest = city; }
      }
      if (nearest) {
        party.targetX = nearest.x + (Math.random() - 0.5) * 30;
        party.targetY = nearest.y + (Math.random() - 0.5) * 30;
        return;
      }
    }

    if (roll < 0.5) {
      // Chase nearest hostile faction party
      let nearest: CampaignParty | null = null;
      let nearestDist = Infinity;
      for (const other of s.parties) {
        if (other === party || other.factionId === party.factionId) continue;
        if (other.isPlayer) continue;
        if (this._getRelationStatus(party.factionId, other.factionId) !== "hostile") continue;
        const d = Math.hypot(other.x - party.x, other.y - party.y);
        if (d < nearestDist) { nearestDist = d; nearest = other; }
      }
      if (nearest) {
        party.targetX = nearest.x + (Math.random() - 0.5) * 40;
        party.targetY = nearest.y + (Math.random() - 0.5) * 40;
        return;
      }
    }

    if (roll < 0.65 && party.homeCity) {
      // Return home
      const home = s.cities.find((c) => c.id === party.homeCity);
      if (home) {
        party.targetX = home.x + (Math.random() - 0.5) * 100;
        party.targetY = home.y + (Math.random() - 0.5) * 100;
        return;
      }
    }

    if (roll < 0.8) {
      // Move toward player only if hostile
      if (this._getRelationStatus(party.factionId, s.playerFaction) === "hostile") {
        party.targetX = s.playerParty.x + (Math.random() - 0.5) * 200;
        party.targetY = s.playerParty.y + (Math.random() - 0.5) * 200;
        return;
      }
    }

    // Random wander
    party.targetX = 40 + Math.random() * (MAP_W - 80);
    party.targetY = 40 + Math.random() * (MAP_H - 80);
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  private _render(): void {
    if (!this._ctx || !this._canvas || !this._state) return;
    const ctx = this._ctx;
    const w = this._canvas.width = window.innerWidth;
    const h = this._canvas.height = window.innerHeight;
    const s = this._state;
    this._animTime += 0.016;
    const t = this._animTime;

    // Ensure zoom is high enough to fill the entire viewport (no background visible)
    const minZoom = Math.max(w / MAP_W, h / MAP_H);
    if (this._zoom < minZoom) this._zoom = minZoom;

    // Clamp camera so the map edges don't reveal background
    const viewW = w / this._zoom;
    const viewH = h / this._zoom;
    this._camX = Math.max(0, Math.min(MAP_W - viewW, this._camX));
    this._camY = Math.max(0, Math.min(MAP_H - viewH, this._camY));

    ctx.save();
    ctx.scale(this._zoom, this._zoom);
    ctx.translate(-this._camX, -this._camY);

    // ---- Ground texture (pre-baked) -----------
    if (this._groundTexture) {
      ctx.drawImage(this._groundTexture, 0, 0);
    } else {
      ctx.fillStyle = "#2a3520";
      ctx.fillRect(0, 0, MAP_W, MAP_H);
    }

    // ---- Season tint overlay -----------
    {
      const seasonTints: Record<string, [number, number, number, number]> = {
        spring: [60, 180, 60, 0.04],
        summer: [220, 180, 50, 0.05],
        autumn: [200, 120, 40, 0.05],
        winter: [180, 200, 240, 0.06],
      };
      const st = seasonTints[s.season] || seasonTints.spring;
      ctx.fillStyle = `rgba(${st[0]},${st[1]},${st[2]},${st[3]})`;
      ctx.fillRect(0, 0, MAP_W, MAP_H);
    }

    // ---- Faction territory overlays -----------
    for (const city of s.cities) {
      const [cr, cg, cb] = _factionRGB(city.factionId);
      const isOwn = city.factionId === s.playerFaction;
      const grad = ctx.createRadialGradient(city.x, city.y, 8, city.x, city.y, 70);
      grad.addColorStop(0, `rgba(${cr},${cg},${cb},${isOwn ? 0.12 : 0.07})`);
      grad.addColorStop(0.6, `rgba(${cr},${cg},${cb},${isOwn ? 0.06 : 0.03})`);
      grad.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(city.x, city.y, 70, 0, Math.PI * 2);
      ctx.fill();
    }

    // ---- Supply lines between allied cities -----
    ctx.lineWidth = 1.2;
    for (let i = 0; i < s.cities.length; i++) {
      for (let j = i + 1; j < s.cities.length; j++) {
        const ci = s.cities[i], cj = s.cities[j];
        if (ci.factionId !== cj.factionId) continue;
        const dist = Math.hypot(ci.x - cj.x, ci.y - cj.y);
        if (dist > 400) continue;
        const [rr, rg, rb] = _factionRGB(ci.factionId);
        // Animated dashed supply line
        const dashOffset = t * 15;
        ctx.strokeStyle = `rgba(${rr},${rg},${rb},0.22)`;
        ctx.setLineDash([6, 4]);
        ctx.lineDashOffset = -dashOffset;
        ctx.beginPath();
        const mx = (ci.x + cj.x) / 2 + (ci.y - cj.y) * 0.08;
        const my = (ci.y + cj.y) / 2 + (cj.x - ci.x) * 0.08;
        ctx.moveTo(ci.x, ci.y);
        ctx.quadraticCurveTo(mx, my, cj.x, cj.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineDashOffset = 0;
      }
    }

    // ---- Village connections to parent cities ----
    for (const village of s.villages) {
      const parentCity = s.cities.find(c => c.id === village.linkedCityId);
      if (!parentCity) continue;
      ctx.strokeStyle = "rgba(80,70,50,0.1)";
      ctx.lineWidth = 0.8;
      ctx.setLineDash([3, 5]);
      ctx.beginPath();
      ctx.moveTo(village.x, village.y);
      ctx.lineTo(parentCity.x, parentCity.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // ---- Cities --------------------------------
    for (const city of s.cities) {
      const color = _factionHex(city.factionId);
      const [cr, cg, cb] = _factionRGB(city.factionId);
      const isOwn = city.factionId === s.playerFaction;
      // City size tier based on garrison - affects visual complexity
      const sizeTier = city.garrisonTotal <= 8 ? 0 : city.garrisonTotal <= 20 ? 1 : 2; // small, medium, large
      const sc = 1.0 + sizeTier * 0.2; // visual scale

      // Animated pulsing ring for player cities
      if (isOwn) {
        const pulse = 0.3 + Math.sin(t * 2.5) * 0.15;
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},${pulse})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(city.x, city.y, 32 * sc + Math.sin(t * 2) * 2, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.ellipse(city.x + 3, city.y + 18 * sc, 20 * sc, 6 * sc, 0, 0, Math.PI * 2);
      ctx.fill();

      const wallColor = `rgba(${Math.min(255, cr + 40)},${Math.min(255, cg + 30)},${Math.min(255, cb + 20)},0.85)`;
      const stoneColor = `rgba(${Math.min(255, cr * 0.5 + 80)},${Math.min(255, cg * 0.5 + 75)},${Math.min(255, cb * 0.5 + 65)},0.9)`;
      ctx.strokeStyle = isOwn ? `rgba(${cr},${cg},${cb},0.9)` : "rgba(100,90,70,0.7)";
      ctx.lineWidth = isOwn ? 2.5 : 1.5;

      // Outer wall (for medium+ cities)
      if (sizeTier >= 1) {
        const wallR = 18 * sc;
        ctx.fillStyle = stoneColor;
        ctx.beginPath();
        // Draw an octagonal wall
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 - Math.PI / 8;
          const wx = city.x + Math.cos(a) * wallR;
          const wy = city.y + Math.sin(a) * wallR * 0.7;
          if (i === 0) ctx.moveTo(wx, wy);
          else ctx.lineTo(wx, wy);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Wall battlements
        ctx.fillStyle = `rgba(${Math.min(255, cr * 0.4 + 60)},${Math.min(255, cg * 0.4 + 55)},${Math.min(255, cb * 0.4 + 45)},0.8)`;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 - Math.PI / 8;
          const wx = city.x + Math.cos(a) * (wallR + 1);
          const wy = city.y + Math.sin(a) * (wallR + 1) * 0.7;
          ctx.fillRect(wx - 1.5, wy - 1.5, 3, 3);
        }

        // Buildings inside walls (small houses)
        const houseColor = `rgba(${Math.min(255, cr * 0.6 + 50)},${Math.min(255, cg * 0.6 + 45)},${Math.min(255, cb * 0.6 + 35)},0.7)`;
        const roofColor = `rgba(${Math.min(255, cr * 0.3 + 90)},${Math.min(255, cg * 0.3 + 60)},${Math.min(255, cb * 0.3 + 40)},0.8)`;
        const houseCount = sizeTier >= 2 ? 8 : 4;
        for (let i = 0; i < houseCount; i++) {
          const ha = (i / houseCount) * Math.PI * 2 + 0.3;
          const hd = wallR * (0.35 + (i % 3) * 0.15);
          const hx = city.x + Math.cos(ha) * hd;
          const hy = city.y + Math.sin(ha) * hd * 0.7;
          // House body
          ctx.fillStyle = houseColor;
          ctx.fillRect(hx - 2.5, hy - 1.5, 5, 4);
          // Roof
          ctx.fillStyle = roofColor;
          ctx.beginPath();
          ctx.moveTo(hx - 3.5, hy - 1.5);
          ctx.lineTo(hx, hy - 4.5);
          ctx.lineTo(hx + 3.5, hy - 1.5);
          ctx.closePath();
          ctx.fill();
        }
      }

      // ---- City interior details ----
      if (sizeTier >= 1) {
        // Market square (colored tile area) for trading cities
        const cityHash = city.id.charCodeAt(city.id.length - 1) % 3;
        if (cityHash === 0 || sizeTier >= 2) {
          const mqX = city.x - 6 * sc;
          const mqY = city.y + 1 * sc;
          ctx.fillStyle = `rgba(${Math.min(255, cr * 0.4 + 100)},${Math.min(255, cg * 0.4 + 80)},${Math.min(255, cb * 0.3 + 40)},0.4)`;
          ctx.fillRect(mqX, mqY, 8 * sc, 5 * sc);
          // Market stall dots
          ctx.fillStyle = "rgba(180,140,60,0.5)";
          for (let mi = 0; mi < 3; mi++) {
            ctx.fillRect(mqX + 1 + mi * 2.5 * sc, mqY + 1, 1.5 * sc, 1.5 * sc);
          }
        }

        // Barracks / training grounds (weapon rack icons) for military cities
        if (cityHash === 1 || sizeTier >= 2) {
          const bx = city.x + 5 * sc;
          const by = city.y - 2 * sc;
          // Weapon rack: vertical line with diagonal lines
          ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.5)`;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(bx, by); ctx.lineTo(bx, by + 5 * sc);
          ctx.moveTo(bx - 1.5, by + 1); ctx.lineTo(bx + 1.5, by - 1);
          ctx.moveTo(bx - 1.5, by + 3); ctx.lineTo(bx + 1.5, by + 1);
          ctx.stroke();
        }

        // Church/cathedral (cross/spire) for all cities
        const chX = city.x + 0.5 * sc;
        const chY = city.y - 3 * sc;
        ctx.fillStyle = `rgba(200,190,170,0.6)`;
        ctx.fillRect(chX - 0.5, chY - 3, 1, 4);
        ctx.fillRect(chX - 1.5, chY - 2, 3, 0.8);

        // Smoke from chimneys (animated wisps)
        const smokeCount = sizeTier >= 2 ? 3 : sizeTier >= 1 ? 2 : 1;
        for (let si = 0; si < smokeCount; si++) {
          const sAngle = (si / smokeCount) * Math.PI * 2 + 1.2;
          const sDist = 8 * sc;
          const sBaseX = city.x + Math.cos(sAngle) * sDist * 0.6;
          const sBaseY = city.y + Math.sin(sAngle) * sDist * 0.4 - 4 * sc;
          for (let sp = 0; sp < 3; sp++) {
            const sOffset = (t * 0.8 + si * 1.3 + sp * 0.5) % 3;
            const sAlpha = Math.max(0, 0.25 - sOffset * 0.08);
            const sSize = 1 + sOffset * 0.6;
            ctx.fillStyle = `rgba(140,140,140,${sAlpha})`;
            ctx.beginPath();
            ctx.arc(sBaseX + Math.sin(t * 1.2 + si + sp) * 1.5, sBaseY - sOffset * 4, sSize, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Tiny animated figures moving inside city walls
        if (sizeTier >= 1) {
          const figCount = sizeTier >= 2 ? 5 : 3;
          for (let fi = 0; fi < figCount; fi++) {
            const fAngle = (t * 0.15 + fi * (Math.PI * 2 / figCount)) % (Math.PI * 2);
            const fDist = 6 * sc + Math.sin(fAngle * 3 + fi) * 3 * sc;
            const figX = city.x + Math.cos(fAngle) * fDist * 0.5;
            const figY = city.y + Math.sin(fAngle) * fDist * 0.35;
            ctx.fillStyle = `rgba(${cr},${cg},${cb},0.45)`;
            ctx.beginPath();
            ctx.arc(figX, figY, 0.8, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Corner towers (for large cities, 4 towers on outer wall)
      if (sizeTier >= 2) {
        const towerR = 18 * sc;
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2;
          const tx = city.x + Math.cos(a) * towerR;
          const ty = city.y + Math.sin(a) * towerR * 0.7;
          ctx.fillStyle = stoneColor;
          ctx.beginPath();
          ctx.arc(tx, ty, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          // Tower cap
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.moveTo(tx - 3, ty - 3);
          ctx.lineTo(tx, ty - 7);
          ctx.lineTo(tx + 3, ty - 3);
          ctx.closePath();
          ctx.fill();
        }
      }

      // Inner castle walls
      ctx.fillStyle = wallColor;
      ctx.beginPath();
      ctx.rect(city.x - 11 * sc, city.y - 8 * sc, 22 * sc, 16 * sc);
      ctx.fill();
      ctx.stroke();

      // Left tower
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.rect(city.x - 14 * sc, city.y - 14 * sc, 7 * sc, 22 * sc);
      ctx.fill();
      ctx.stroke();
      // Left tower cap
      ctx.beginPath();
      ctx.moveTo(city.x - 14 * sc, city.y - 14 * sc);
      ctx.lineTo(city.x - 10.5 * sc, city.y - 20 * sc);
      ctx.lineTo(city.x - 7 * sc, city.y - 14 * sc);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right tower
      ctx.beginPath();
      ctx.rect(city.x + 7 * sc, city.y - 14 * sc, 7 * sc, 22 * sc);
      ctx.fill();
      ctx.stroke();
      // Right tower cap
      ctx.beginPath();
      ctx.moveTo(city.x + 7 * sc, city.y - 14 * sc);
      ctx.lineTo(city.x + 10.5 * sc, city.y - 20 * sc);
      ctx.lineTo(city.x + 14 * sc, city.y - 14 * sc);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Keep tower (center, tallest)
      ctx.fillStyle = `rgba(${cr},${cg},${cb},0.95)`;
      ctx.beginPath();
      ctx.rect(city.x - 5 * sc, city.y - 16 * sc, 10 * sc, 22 * sc);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(city.x - 5 * sc, city.y - 16 * sc);
      ctx.lineTo(city.x, city.y - 24 * sc);
      ctx.lineTo(city.x + 5 * sc, city.y - 16 * sc);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Battlements (small rectangles on inner walls)
      ctx.fillStyle = color;
      for (let bx = -10; bx <= 8; bx += 3) {
        ctx.fillRect(city.x + bx * sc, city.y - 10 * sc, 2, 2);
      }

      // Keep windows (small lit squares)
      ctx.fillStyle = "rgba(255,220,120,0.4)";
      ctx.fillRect(city.x - 2.5 * sc, city.y - 10 * sc, 2, 2.5);
      ctx.fillRect(city.x + 0.5 * sc, city.y - 10 * sc, 2, 2.5);
      ctx.fillRect(city.x - 1 * sc, city.y - 5 * sc, 2, 2.5);

      // Gate with portcullis detail
      ctx.fillStyle = "rgba(20,15,10,0.8)";
      ctx.beginPath();
      ctx.arc(city.x, city.y + 8 * sc, 4 * sc, Math.PI, 0);
      ctx.rect(city.x - 4 * sc, city.y + 5 * sc, 8 * sc, 3 * sc);
      ctx.fill();
      // Portcullis bars
      ctx.strokeStyle = "rgba(80,70,50,0.5)";
      ctx.lineWidth = 0.6;
      for (let gx = -3; gx <= 3; gx += 2) {
        ctx.beginPath();
        ctx.moveTo(city.x + gx * sc, city.y + 4 * sc);
        ctx.lineTo(city.x + gx * sc, city.y + 8 * sc);
        ctx.stroke();
      }

      // Banner pole and flag (animated)
      ctx.fillStyle = "rgba(60,50,30,0.9)";
      ctx.fillRect(city.x + 1 * sc, city.y - 24 * sc, 1.2, -10 * sc);
      ctx.fillStyle = color;
      const flagWave = Math.sin(t * 3 + city.x) * 1.2;
      ctx.beginPath();
      ctx.moveTo(city.x + 2.2 * sc, city.y - 34 * sc);
      ctx.lineTo(city.x + 10 * sc, city.y - 31 * sc + flagWave);
      ctx.lineTo(city.x + 10 * sc, city.y - 28 * sc + flagWave * 0.5);
      ctx.lineTo(city.x + 2.2 * sc, city.y - 26 * sc);
      ctx.closePath();
      ctx.fill();
      // Faction symbol on flag (small stripe)
      ctx.fillStyle = `rgba(255,255,255,0.3)`;
      ctx.beginPath();
      ctx.moveTo(city.x + 4 * sc, city.y - 32 * sc + flagWave * 0.3);
      ctx.lineTo(city.x + 8 * sc, city.y - 30.5 * sc + flagWave * 0.7);
      ctx.lineTo(city.x + 8 * sc, city.y - 29 * sc + flagWave * 0.5);
      ctx.lineTo(city.x + 4 * sc, city.y - 30.5 * sc + flagWave * 0.2);
      ctx.closePath();
      ctx.fill();

      // Second banner for large cities
      if (sizeTier >= 2) {
        ctx.fillStyle = "rgba(60,50,30,0.9)";
        ctx.fillRect(city.x - 14 * sc, city.y - 20 * sc, 1, -6);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(city.x - 13 * sc, city.y - 26 * sc);
        ctx.lineTo(city.x - 7 * sc, city.y - 24 * sc + Math.sin(t * 2.5 + city.y) * 0.8);
        ctx.lineTo(city.x - 13 * sc, city.y - 22 * sc);
        ctx.closePath();
        ctx.fill();
      }

      // City name with background
      ctx.font = "bold 11px 'Segoe UI', sans-serif";
      const nameWidth = ctx.measureText(city.name).width || city.name.length * 7;
      ctx.fillStyle = "rgba(10,8,5,0.7)";
      const nmW = Math.max(nameWidth + 10, 50);
      ctx.beginPath();
      ctx.roundRect(city.x - nmW / 2, city.y + 17 * sc, nmW, 16, 3);
      ctx.fill();

      ctx.fillStyle = isOwn ? "#ddeebb" : "#d0c8b0";
      ctx.textAlign = "center";
      ctx.fillText(city.name, city.x, city.y + 29 * sc);

      // Garrison badge with icon
      ctx.fillStyle = "rgba(10,8,5,0.75)";
      ctx.beginPath();
      ctx.roundRect(city.x - 14, city.y + 34 * sc, 28, 12, 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.5)`;
      ctx.lineWidth = 0.8;
      ctx.stroke();
      // Shield icon before number
      ctx.fillStyle = `rgba(${cr},${cg},${cb},0.6)`;
      ctx.beginPath();
      ctx.moveTo(city.x - 8, city.y + 37 * sc);
      ctx.lineTo(city.x - 5, city.y + 36 * sc);
      ctx.lineTo(city.x - 2, city.y + 37 * sc);
      ctx.lineTo(city.x - 3, city.y + 40 * sc);
      ctx.lineTo(city.x - 5, city.y + 42 * sc);
      ctx.lineTo(city.x - 7, city.y + 40 * sc);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = city.garrisonTotal > 0 ? "#bbaa88" : "#664444";
      ctx.font = "bold 9px sans-serif";
      ctx.fillText(`${city.garrisonTotal}`, city.x + 3, city.y + 43 * sc);
    }

    // ---- Villages --------------------------------
    for (const village of s.villages) {
      _factionHex(village.factionId);
      const [vr, vg, vb] = _factionRGB(village.factionId);
      const isOwnVillage = village.factionId === s.playerFaction;

      // House body (rectangle)
      ctx.fillStyle = `rgba(${vr},${vg},${vb},0.7)`;
      ctx.fillRect(village.x - 5, village.y - 2, 10, 8);
      ctx.strokeStyle = isOwnVillage ? `rgba(${vr},${vg},${vb},0.9)` : "rgba(100,90,70,0.5)";
      ctx.lineWidth = 1;
      ctx.strokeRect(village.x - 5, village.y - 2, 10, 8);

      // Roof (triangle)
      ctx.fillStyle = `rgba(${Math.min(255, vr + 60)},${Math.min(255, vg + 40)},${Math.min(255, vb + 20)},0.8)`;
      ctx.beginPath();
      ctx.moveTo(village.x - 7, village.y - 2);
      ctx.lineTo(village.x, village.y - 9);
      ctx.lineTo(village.x + 7, village.y - 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Door
      ctx.fillStyle = "rgba(20,15,10,0.6)";
      ctx.fillRect(village.x - 1.5, village.y + 2, 3, 4);

      // Village name
      ctx.fillStyle = isOwnVillage ? "#bbcc99" : "#aa9977";
      ctx.font = "9px 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(village.name, village.x, village.y + 16);

      // Population badge
      ctx.fillStyle = "rgba(10,8,5,0.6)";
      ctx.beginPath();
      ctx.roundRect(village.x - 10, village.y + 18, 20, 10, 2);
      ctx.fill();
      ctx.fillStyle = "#998877";
      ctx.font = "8px sans-serif";
      ctx.fillText(`pop:${village.population}`, village.x, village.y + 26);
    }

    // ---- Special locations -----------------------
    for (const loc of s.specialLocations) {
      const lx = loc.x;
      const ly = loc.y;
      const pulse = 0.5 + Math.sin(t * 3 + lx) * 0.3;

      if (loc.explored) {
        // Grayed out
        ctx.globalAlpha = 0.35;
      }

      // Glow effect for unexplored
      if (!loc.explored) {
        const glowColor = loc.type === "shrine" ? "rgba(255,215,0," : loc.type === "treasure" ? "rgba(255,200,50," : loc.type === "lair" ? "rgba(200,50,50," : loc.type === "dungeon" ? "rgba(100,100,200," : "rgba(180,160,120,";
        ctx.fillStyle = glowColor + (pulse * 0.15) + ")";
        ctx.beginPath();
        ctx.arc(lx, ly, 14, 0, Math.PI * 2);
        ctx.fill();
      }

      if (loc.type === "lair") {
        // Skull icon
        ctx.fillStyle = "#cc4444";
        ctx.beginPath();
        ctx.arc(lx, ly - 3, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(lx - 2, ly - 4, 1.5, 2);
        ctx.fillRect(lx + 0.5, ly - 4, 1.5, 2);
        ctx.fillRect(lx - 2, ly + 2, 4, 2);
      } else if (loc.type === "shrine") {
        // Star icon
        ctx.fillStyle = "#ffd700";
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
          const r = i === 0 ? 6 : 6;
          if (i === 0) ctx.moveTo(lx + Math.cos(a) * r, ly + Math.sin(a) * r);
          else ctx.lineTo(lx + Math.cos(a) * r, ly + Math.sin(a) * r);
          const inner = a + (2 * Math.PI) / 10;
          ctx.lineTo(lx + Math.cos(inner) * 3, ly + Math.sin(inner) * 3);
        }
        ctx.closePath();
        ctx.fill();
      } else if (loc.type === "treasure") {
        // Chest icon
        ctx.fillStyle = "#cc8844";
        ctx.fillRect(lx - 5, ly - 2, 10, 7);
        ctx.fillStyle = "#aa6622";
        ctx.fillRect(lx - 5, ly - 5, 10, 3);
        ctx.beginPath();
        ctx.arc(lx, ly - 5, 5, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = "#ffd700";
        ctx.fillRect(lx - 1, ly, 2, 3);
      } else if (loc.type === "ruins") {
        // Pillar icon
        ctx.fillStyle = "#aa9977";
        ctx.fillRect(lx - 2, ly - 8, 4, 12);
        ctx.fillRect(lx - 4, ly - 9, 8, 2);
        ctx.fillRect(lx - 4, ly + 3, 8, 2);
        // Broken part
        ctx.fillStyle = "rgba(10,8,5,0.5)";
        ctx.fillRect(lx + 1, ly - 6, 2, 4);
      } else if (loc.type === "dungeon") {
        // Door icon
        ctx.fillStyle = "#666688";
        ctx.fillRect(lx - 4, ly - 7, 8, 12);
        ctx.strokeStyle = "#444466";
        ctx.lineWidth = 1;
        ctx.strokeRect(lx - 4, ly - 7, 8, 12);
        ctx.beginPath();
        ctx.arc(lx, ly - 7, 4, Math.PI, 0);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#333344";
        ctx.fillRect(lx - 2, ly - 4, 4, 9);
        ctx.fillStyle = "#ffd700";
        ctx.beginPath();
        ctx.arc(lx + 1, ly + 1, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1.0;

      // Location name
      ctx.fillStyle = loc.explored ? "#666" : "#ccbb99";
      ctx.font = "8px 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(loc.name, lx, ly + 14);
    }

    // ---- Roving parties -----------------------
    for (const party of s.parties) {
      // Hide enemy parties in unexplored fog
      const partyCell = Math.floor(party.y / FOG_CELL_SIZE) * FOG_GRID_W + Math.floor(party.x / FOG_CELL_SIZE);
      const isAlliedParty = party.factionId === s.playerFaction;
      if (!isAlliedParty && !s.fogRevealed.has(partyCell)) continue;

      const color = _factionHex(party.factionId);
      const [cr, cg, cb] = _factionRGB(party.factionId);
      const isAllied = party.factionId === s.playerFaction;
      // Threat level based on army size
      const threatLevel = party.armyTotal <= 6 ? 0 : party.armyTotal <= 14 ? 1 : 2; // scout, warband, army
      const psc = 1.0 + threatLevel * 0.15; // visual scale

      // Movement trail (fading dots with faction color)
      const angle = Math.atan2(party.targetY - party.y, party.targetX - party.x);
      const moveDist = Math.hypot(party.targetX - party.x, party.targetY - party.y);
      if (moveDist > 5) {
        for (let i = 1; i <= 4; i++) {
          const trailX = party.x - Math.cos(angle) * i * 5;
          const trailY = party.y - Math.sin(angle) * i * 5;
          ctx.fillStyle = `rgba(${cr},${cg},${cb},${0.18 - i * 0.04})`;
          ctx.beginPath();
          ctx.arc(trailX, trailY, PARTY_RADIUS * psc * (0.6 - i * 0.1), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Threat glow for large enemy armies
      if (!isAllied && threatLevel >= 2) {
        const pulse = 0.12 + Math.sin(t * 2 + party.x) * 0.06;
        ctx.fillStyle = `rgba(200,50,30,${pulse})`;
        ctx.beginPath();
        ctx.arc(party.x, party.y, PARTY_RADIUS * psc * 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.beginPath();
      ctx.ellipse(party.x + 1, party.y + PARTY_RADIUS * psc + 2, PARTY_RADIUS * psc, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Party body (shield shape, larger for bigger armies)
      const pr = PARTY_RADIUS * psc;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(party.x, party.y - pr);
      ctx.lineTo(party.x + pr, party.y - pr * 0.3);
      ctx.lineTo(party.x + pr * 0.7, party.y + pr * 0.7);
      ctx.lineTo(party.x, party.y + pr);
      ctx.lineTo(party.x - pr * 0.7, party.y + pr * 0.7);
      ctx.lineTo(party.x - pr, party.y - pr * 0.3);
      ctx.closePath();
      ctx.fill();
      // Darker inner shield detail
      ctx.fillStyle = `rgba(0,0,0,0.15)`;
      ctx.beginPath();
      ctx.moveTo(party.x, party.y - pr * 0.6);
      ctx.lineTo(party.x + pr * 0.6, party.y - pr * 0.1);
      ctx.lineTo(party.x + pr * 0.4, party.y + pr * 0.45);
      ctx.lineTo(party.x, party.y + pr * 0.65);
      ctx.lineTo(party.x - pr * 0.4, party.y + pr * 0.45);
      ctx.lineTo(party.x - pr * 0.6, party.y - pr * 0.1);
      ctx.closePath();
      ctx.fill();

      const partyRelStatus = isAllied ? "friendly" : this._getRelationStatus(party.factionId, s.playerFaction);
      ctx.strokeStyle = partyRelStatus === "friendly" ? `rgba(100,255,100,0.7)` : partyRelStatus === "neutral" ? `rgba(220,200,60,0.6)` : `rgba(255,80,60,0.6)`;
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Faction emblem on shield - different per faction
      const factionHash = party.factionId.charCodeAt(0) % 5;
      ctx.strokeStyle = `rgba(255,255,255,0.55)`;
      ctx.fillStyle = `rgba(255,255,255,0.35)`;
      ctx.lineWidth = 1.2;
      if (isAllied) {
        // Cross for allied
        ctx.beginPath();
        ctx.moveTo(party.x, party.y - 3.5);
        ctx.lineTo(party.x, party.y + 3.5);
        ctx.moveTo(party.x - 3.5, party.y);
        ctx.lineTo(party.x + 3.5, party.y);
        ctx.stroke();
      } else if (factionHash === 0) {
        // Crossed swords
        ctx.beginPath();
        ctx.moveTo(party.x - 3, party.y - 3);
        ctx.lineTo(party.x + 3, party.y + 3);
        ctx.moveTo(party.x + 3, party.y - 3);
        ctx.lineTo(party.x - 3, party.y + 3);
        ctx.stroke();
      } else if (factionHash === 1) {
        // Arrow pointing up (ranged)
        ctx.beginPath();
        ctx.moveTo(party.x, party.y - 4);
        ctx.lineTo(party.x - 2.5, party.y + 1);
        ctx.moveTo(party.x, party.y - 4);
        ctx.lineTo(party.x + 2.5, party.y + 1);
        ctx.moveTo(party.x, party.y - 4);
        ctx.lineTo(party.x, party.y + 4);
        ctx.stroke();
      } else if (factionHash === 2) {
        // Shield
        ctx.beginPath();
        ctx.arc(party.x, party.y - 0.5, 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(party.x, party.y - 3.5);
        ctx.lineTo(party.x, party.y + 2.5);
        ctx.stroke();
      } else if (factionHash === 3) {
        // Skull (intimidating)
        ctx.beginPath();
        ctx.arc(party.x, party.y - 1, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(${cr},${cg},${cb},0.8)`;
        ctx.fillRect(party.x - 1.2, party.y - 2, 0.8, 1);
        ctx.fillRect(party.x + 0.4, party.y - 2, 0.8, 1);
        ctx.fillRect(party.x - 1, party.y + 0.5, 2, 0.8);
      } else {
        // Star
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const sa = (i * 4 * Math.PI) / 5 - Math.PI / 2;
          const sr = 3;
          if (i === 0) ctx.moveTo(party.x + Math.cos(sa) * sr, party.y + Math.sin(sa) * sr);
          else ctx.lineTo(party.x + Math.cos(sa) * sr, party.y + Math.sin(sa) * sr);
          const inner = sa + (2 * Math.PI) / 10;
          ctx.lineTo(party.x + Math.cos(inner) * 1.3, party.y + Math.sin(inner) * 1.3);
        }
        ctx.closePath();
        ctx.fill();
      }

      // Banner pole with faction flag
      if (threatLevel >= 1 || !isAllied) {
        const flagX = party.x + pr * 0.6;
        const flagY = party.y - pr;
        ctx.fillStyle = "rgba(60,50,30,0.8)";
        ctx.fillRect(flagX - 0.4, flagY, 0.8, -10);
        ctx.fillStyle = color;
        const fw = Math.sin(t * 3.5 + party.x + party.y) * 0.8;
        ctx.beginPath();
        ctx.moveTo(flagX + 0.4, flagY - 10);
        ctx.lineTo(flagX + 6, flagY - 8 + fw);
        ctx.lineTo(flagX + 0.4, flagY - 6);
        ctx.closePath();
        ctx.fill();
      }

      // Direction arrow
      if (moveDist > 5) {
        const arrowLen = pr + 6;
        const ax = party.x + Math.cos(angle) * arrowLen;
        const ay = party.y + Math.sin(angle) * arrowLen;
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.6)`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(party.x + Math.cos(angle) * pr, party.y + Math.sin(angle) * pr);
        ctx.lineTo(ax, ay);
        ctx.stroke();
        const ha = 0.5;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax - Math.cos(angle - ha) * 4, ay - Math.sin(angle - ha) * 4);
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax - Math.cos(angle + ha) * 4, ay - Math.sin(angle + ha) * 4);
        ctx.stroke();
      }

      // Army size badge with composition hint
      const badgeW = threatLevel >= 1 ? 28 : 16;
      ctx.fillStyle = "rgba(10,8,5,0.8)";
      ctx.beginPath();
      ctx.roundRect(party.x - badgeW / 2, party.y - pr - 15, badgeW, 12, 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.3)`;
      ctx.lineWidth = 0.6;
      ctx.stroke();
      ctx.fillStyle = isAllied ? "#aaddaa" : threatLevel >= 2 ? "#ff9977" : "#ccbb99";
      ctx.font = "bold 8px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${party.armyTotal}`, party.x, party.y - pr - 6);

      // Unit composition dots (shows variety of unit types)
      if (threatLevel >= 1) {
        const dotCount = Math.min(party.army.length, 4);
        const dotStartX = party.x - (dotCount - 1) * 2.5;
        for (let d = 0; d < dotCount; d++) {
          const u = party.army[d];
          const uDef = CAMPAIGN_UNITS.find(cu => cu.id === u.unitId);
          let dotColor = "#888";
          if (uDef) {
            if (uDef.building === "stables") dotColor = "#cc8844";
            else if (uDef.building === "archery") dotColor = "#44aa44";
            else if (uDef.building === "mages" || uDef.building === "temple") dotColor = "#8866cc";
            else dotColor = "#aaaaaa";
          }
          ctx.fillStyle = dotColor;
          ctx.beginPath();
          ctx.arc(dotStartX + d * 5, party.y + pr + 5, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // ---- Lord crown + name for lord-led parties ----
      if (party.lordId) {
        const lord = s.lords.find(l => l.id === party.lordId);
        if (lord && !lord.capturedBy) {
          const crownY = party.y - pr - 22;
          ctx.fillStyle = `rgba(${cr},${cg},${cb},0.9)`;
          ctx.beginPath();
          ctx.moveTo(party.x - 5, crownY + 4);
          ctx.lineTo(party.x - 5, crownY);
          ctx.lineTo(party.x - 2.5, crownY + 2);
          ctx.lineTo(party.x, crownY - 2);
          ctx.lineTo(party.x + 2.5, crownY + 2);
          ctx.lineTo(party.x + 5, crownY);
          ctx.lineTo(party.x + 5, crownY + 4);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = "rgba(255,215,0,0.6)";
          ctx.lineWidth = 0.8;
          ctx.stroke();
          ctx.font = "bold 7px 'Segoe UI', sans-serif";
          ctx.textAlign = "center";
          const lnW = ctx.measureText(lord.name).width + 6;
          ctx.fillStyle = "rgba(10,8,5,0.7)";
          ctx.beginPath();
          ctx.roundRect(party.x - lnW / 2, crownY - 13, lnW, 10, 2);
          ctx.fill();
          ctx.fillStyle = `rgba(${Math.min(255, cr + 60)},${Math.min(255, cg + 60)},${Math.min(255, cb + 40)},0.9)`;
          ctx.fillText(lord.name, party.x, crownY - 5);
        }
      }

      // Party name for larger armies
      if (threatLevel >= 1) {
        ctx.fillStyle = `rgba(${cr},${cg},${cb},0.5)`;
        ctx.font = "7px 'Segoe UI', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(party.name, party.x, party.y + pr + 14);
      }
    }

    // ---- Player party -------------------------
    const pp = s.playerParty;
    const pColor = _factionHex(s.playerFaction);

    // Animated selection ring
    const ringPulse = 0.5 + Math.sin(t * 3) * 0.3;
    ctx.strokeStyle = `rgba(255,215,0,${ringPulse})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.arc(pp.x, pp.y, PARTY_RADIUS + 6 + Math.sin(t * 2.5) * 1.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(pp.x + 1, pp.y + PARTY_RADIUS + 2, PARTY_RADIUS + 2, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Player shield (larger)
    const pr = PARTY_RADIUS + 2;
    ctx.fillStyle = pColor;
    ctx.beginPath();
    ctx.moveTo(pp.x, pp.y - pr);
    ctx.lineTo(pp.x + pr, pp.y - pr * 0.3);
    ctx.lineTo(pp.x + pr * 0.7, pp.y + pr * 0.7);
    ctx.lineTo(pp.x, pp.y + pr);
    ctx.lineTo(pp.x - pr * 0.7, pp.y + pr * 0.7);
    ctx.lineTo(pp.x - pr, pp.y - pr * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#ffd700";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Crown emblem
    ctx.fillStyle = "rgba(255,215,0,0.8)";
    ctx.beginPath();
    ctx.moveTo(pp.x - 4, pp.y + 1);
    ctx.lineTo(pp.x - 4, pp.y - 3);
    ctx.lineTo(pp.x - 2, pp.y - 1);
    ctx.lineTo(pp.x, pp.y - 4);
    ctx.lineTo(pp.x + 2, pp.y - 1);
    ctx.lineTo(pp.x + 4, pp.y - 3);
    ctx.lineTo(pp.x + 4, pp.y + 1);
    ctx.closePath();
    ctx.fill();

    // "YOU" label
    ctx.fillStyle = "rgba(10,8,5,0.7)";
    ctx.beginPath();
    ctx.roundRect(pp.x - 14, pp.y - PARTY_RADIUS - 18, 28, 12, 3);
    ctx.fill();
    ctx.fillStyle = "#ffd700";
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("YOU", pp.x, pp.y - PARTY_RADIUS - 9);

    // Army size badge
    ctx.fillStyle = "rgba(10,8,5,0.7)";
    ctx.beginPath();
    ctx.roundRect(pp.x - 10, pp.y + PARTY_RADIUS + 4, 20, 12, 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,215,0,0.4)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.fillStyle = "#ddcc88";
    ctx.font = "bold 9px sans-serif";
    ctx.fillText(`${pp.armyTotal}`, pp.x, pp.y + PARTY_RADIUS + 13);

    // Terrain indicator for player
    const playerTerrain = _getTerrainAt(pp.x, pp.y, s.terrain);
    if (playerTerrain) {
      const terrainLabel = `${playerTerrain.name} (${playerTerrain.mult}x)`;
      ctx.font = "8px sans-serif";
      const tw = ctx.measureText(terrainLabel).width + 8;
      ctx.fillStyle = "rgba(10,8,5,0.75)";
      ctx.beginPath();
      ctx.roundRect(pp.x - tw / 2, pp.y + PARTY_RADIUS + 18, tw, 12, 2);
      ctx.fill();
      ctx.fillStyle = "#bb9966";
      ctx.textAlign = "center";
      ctx.fillText(terrainLabel, pp.x, pp.y + PARTY_RADIUS + 27);
    }

    // ---- Move target indicator ----------------
    const tDist = Math.hypot(pp.targetX - pp.x, pp.targetY - pp.y);
    if (tDist > 5) {
      // Dashed path line
      ctx.strokeStyle = "rgba(255,215,0,0.2)";
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(pp.x, pp.y);
      ctx.lineTo(pp.targetX, pp.targetY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Animated target ring
      const tPulse = 0.3 + Math.sin(t * 4) * 0.2;
      ctx.strokeStyle = `rgba(255,215,0,${tPulse})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(pp.targetX, pp.targetY, 6 + Math.sin(t * 3) * 1, 0, Math.PI * 2);
      ctx.stroke();

      // Target crosshair
      ctx.strokeStyle = "rgba(255,215,0,0.45)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pp.targetX - 4, pp.targetY);
      ctx.lineTo(pp.targetX + 4, pp.targetY);
      ctx.moveTo(pp.targetX, pp.targetY - 4);
      ctx.lineTo(pp.targetX, pp.targetY + 4);
      ctx.stroke();
    }

    // ---- Caravans ---------------------------------
    for (const caravan of s.caravans) {
      // Only draw if in revealed fog
      const caravanCell = Math.floor(caravan.y / FOG_CELL_SIZE) * FOG_GRID_W + Math.floor(caravan.x / FOG_CELL_SIZE);
      if (!s.fogRevealed.has(caravanCell)) continue;

      // Horse (small brown oval)
      ctx.fillStyle = "rgba(120,80,40,0.8)";
      ctx.beginPath();
      ctx.ellipse(caravan.x - 6, caravan.y, 3, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      // Horse head
      ctx.fillStyle = "rgba(100,65,30,0.8)";
      ctx.beginPath();
      ctx.ellipse(caravan.x - 9, caravan.y - 1.5, 1.5, 1, -0.3, 0, Math.PI * 2);
      ctx.fill();
      // Wagon body
      ctx.fillStyle = "rgba(140,110,60,0.85)";
      ctx.fillRect(caravan.x - 4, caravan.y - 3, 10, 5);
      // Wagon cover (arched canvas)
      ctx.fillStyle = "rgba(200,190,160,0.7)";
      ctx.beginPath();
      ctx.arc(caravan.x + 1, caravan.y - 3, 5, Math.PI, 0);
      ctx.fill();
      // Wheels
      ctx.strokeStyle = "rgba(80,60,30,0.8)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(caravan.x - 2, caravan.y + 2.5, 2, 0, Math.PI * 2);
      ctx.arc(caravan.x + 4, caravan.y + 2.5, 2, 0, Math.PI * 2);
      ctx.stroke();
      // Label
      ctx.fillStyle = "rgba(180,160,100,0.6)";
      ctx.font = "7px 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Caravan", caravan.x, caravan.y + 10);
    }

    // ---- Wandering NPCs ---------------------------
    for (const npc of s.wanderingNPCs) {
      if (npc.interacted) continue;
      const npcCell = Math.floor(npc.y / FOG_CELL_SIZE) * FOG_GRID_W + Math.floor(npc.x / FOG_CELL_SIZE);
      if (!s.fogRevealed.has(npcCell)) continue;

      // NPC dot with type-specific color
      const npcColor = npc.type === "hermit" ? "#66aacc" : npc.type === "messenger" ? "#ccaa44" : "#cc8866";
      const npcIcon = npc.type === "hermit" ? "?" : npc.type === "messenger" ? "!" : "+";
      // Glow
      ctx.fillStyle = `rgba(${npc.type === "hermit" ? "100,170,200" : npc.type === "messenger" ? "200,170,70" : "200,130,100"},${0.15 + Math.sin(t * 3 + npc.x) * 0.08})`;
      ctx.beginPath();
      ctx.arc(npc.x, npc.y, 8, 0, Math.PI * 2);
      ctx.fill();
      // Body
      ctx.fillStyle = npcColor;
      ctx.beginPath();
      ctx.arc(npc.x, npc.y, 3, 0, Math.PI * 2);
      ctx.fill();
      // Icon
      ctx.fillStyle = "#fff";
      ctx.font = "bold 7px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(npcIcon, npc.x, npc.y + 2.5);
      // Name
      ctx.fillStyle = npcColor;
      ctx.font = "7px 'Segoe UI', sans-serif";
      ctx.fillText(npc.name, npc.x, npc.y + 12);
    }

    // ---- Unrecruited companion markers ----
    const companionColors: Record<string, string> = {
      warrior: "#cc6644", archer: "#66cc44", mage: "#6644cc", scout: "#cccc44",
    };
    for (const comp of s.companions) {
      if (comp.recruited) continue;
      const compCx = comp.locationX, compCy = comp.locationY;
      const compCell = Math.floor(compCy / FOG_CELL_SIZE) * FOG_GRID_W + Math.floor(compCx / FOG_CELL_SIZE);
      if (!s.fogRevealed.has(compCell)) continue;
      const cc = companionColors[comp.class] || "#aaa";
      const ccR = parseInt(cc.slice(1, 3), 16), ccG = parseInt(cc.slice(3, 5), 16), ccB = parseInt(cc.slice(5, 7), 16);
      const gPulse = 0.12 + Math.sin(t * 3 + compCx * 0.1 + compCy * 0.1) * 0.08;
      ctx.fillStyle = `rgba(${ccR},${ccG},${ccB},${gPulse})`;
      ctx.beginPath();
      ctx.arc(compCx, compCy, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = cc;
      ctx.beginPath();
      ctx.moveTo(compCx, compCy - 5);
      ctx.lineTo(compCx + 4, compCy);
      ctx.lineTo(compCx, compCy + 5);
      ctx.lineTo(compCx - 4, compCy);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = "bold 6px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(comp.class[0].toUpperCase(), compCx, compCy + 2);
      ctx.fillStyle = cc;
      ctx.font = "7px 'Segoe UI', sans-serif";
      ctx.fillText(comp.name, compCx, compCy + 13);
    }

    // ---- Event markers on map ----------------------
    for (const evt of s.events) {
      if (!evt.active) continue;
      let evtX = evt.mapX ?? 0;
      let evtY = evt.mapY ?? 0;
      if (evt.targetCityId) {
        const eCity = s.cities.find(c => c.id === evt.targetCityId);
        if (eCity) { evtX = eCity.x; evtY = eCity.y; }
      }
      if (evtX === 0 && evtY === 0) continue;

      // Pulsing event icon
      const evtPulse = 0.5 + Math.sin(t * 4 + evtX) * 0.3;
      const evtColor = evt.type === "bandit_raid" ? "rgba(200,50,50," : evt.type === "merchant_festival" ? "rgba(50,200,50," : evt.type === "plague" ? "rgba(150,50,150," : evt.type === "deserters" ? "rgba(100,150,200," : "rgba(200,180,50,";
      ctx.fillStyle = evtColor + (evtPulse * 0.3) + ")";
      ctx.beginPath();
      ctx.arc(evtX, evtY - 35, 10 + Math.sin(t * 3) * 2, 0, Math.PI * 2);
      ctx.fill();
      // Event icon letter
      const evtLetter = evt.type === "bandit_raid" ? "!" : evt.type === "merchant_festival" ? "$" : evt.type === "plague" ? "X" : evt.type === "deserters" ? "+" : "A";
      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(evtLetter, evtX, evtY - 32);
    }

    // ---- Fog of war overlay -----------------------
    this._drawFogOfWar(ctx);

    // ---- Map border (decorative) ---------------
    ctx.strokeStyle = "rgba(80,65,40,0.6)";
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, MAP_W, MAP_H);
    ctx.strokeStyle = "rgba(120,100,70,0.3)";
    ctx.lineWidth = 1;
    ctx.strokeRect(3, 3, MAP_W - 6, MAP_H - 6);

    // ---- Game over overlay ---------------------
    if (s.gameOver) {
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillRect(this._camX, this._camY, w / this._zoom, h / this._zoom);

      const cx = this._camX + w / (2 * this._zoom);
      const cy = this._camY + h / (2 * this._zoom);

      // Decorative frame
      ctx.strokeStyle = s.winner ? "rgba(218,165,32,0.4)" : "rgba(204,68,68,0.4)";
      ctx.lineWidth = 2;
      ctx.strokeRect(cx - 200, cy - 60, 400, 120);

      ctx.fillStyle = s.winner ? "#ffd700" : "#cc4444";
      ctx.font = "bold 48px 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      ctx.shadowColor = s.winner ? "rgba(218,165,32,0.5)" : "rgba(204,68,68,0.5)";
      ctx.shadowBlur = 20;
      ctx.fillText(s.winner ? "VICTORY!" : "DEFEAT", cx, cy);
      ctx.shadowBlur = 0;

      ctx.fillStyle = "#aa9977";
      ctx.font = "16px sans-serif";
      ctx.fillText(`Day ${s.day} — Press ESC to exit`, cx, cy + 35);
    }

    ctx.restore();

    // ---- Morale / Food HUD (screen-space, bottom-right) ----
    {
      const hudX = w - 230, hudY = h - 100;
      const panelW = 120, panelH = 52;
      ctx.fillStyle = "rgba(12,10,6,0.82)";
      ctx.strokeStyle = "rgba(80,65,40,0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(hudX, hudY, panelW, panelH, 4);
      ctx.fill();
      ctx.stroke();
      const food = Math.floor(s.food);
      const foodColor = food > 30 ? "#66cc66" : food > 10 ? "#cccc44" : "#cc4444";
      ctx.fillStyle = "#c8a050";
      ctx.beginPath();
      ctx.ellipse(hudX + 12, hudY + 14, 5, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = foodColor;
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`${food}`, hudX + 22, hudY + 17);
      ctx.fillStyle = "rgba(160,140,110,0.6)";
      ctx.font = "7px sans-serif";
      ctx.fillText("food", hudX + 22 + ctx.measureText(`${food}`).width + 3, hudY + 17);
      const morale = Math.max(0, Math.min(100, s.campaignMorale));
      const barX = hudX + 8, barY = hudY + 28, barW = panelW - 16, barH = 8;
      ctx.fillStyle = "rgba(160,140,110,0.6)";
      ctx.font = "7px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("morale", barX, barY - 1);
      ctx.fillStyle = "rgba(30,25,15,0.8)";
      ctx.beginPath();
      ctx.roundRect(barX, barY + 2, barW, barH, 2);
      ctx.fill();
      const moraleW = (morale / 100) * barW;
      const moraleColor = morale > 60 ? "#66aa44" : morale > 30 ? "#ccaa33" : "#cc4433";
      ctx.fillStyle = moraleColor;
      ctx.beginPath();
      ctx.roundRect(barX, barY + 2, moraleW, barH, 2);
      ctx.fill();
      ctx.fillStyle = "#d0c8b0";
      ctx.font = "bold 7px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${Math.round(morale)}`, barX + barW / 2, barY + 9);
    }

    // ---- Minimap (bottom-right) ---------------
    this._renderMinimap(ctx, w, h);
  }

  private _renderMinimap(ctx: CanvasRenderingContext2D, sw: number, sh: number): void {
    if (!this._state) return;
    const s = this._state;
    const mmW = 200;
    const mmH = Math.round(mmW * (MAP_H / MAP_W));
    const mx = sw - mmW - 14;
    const my = sh - mmH - 14;

    // Background with rounded corners
    ctx.fillStyle = "rgba(12,10,6,0.88)";
    ctx.strokeStyle = "rgba(80,65,40,0.6)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(mx - 2, my - 2, mmW + 4, mmH + 4, 6);
    ctx.fill();
    ctx.stroke();

    // Draw baked ground (scaled)
    if (this._groundTexture) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(mx, my, mmW, mmH, 4);
      ctx.clip();
      ctx.drawImage(this._groundTexture, mx, my, mmW, mmH);
      // Darken slightly
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.fillRect(mx, my, mmW, mmH);
      ctx.restore();
    }

    const scaleX = mmW / MAP_W;
    const scaleY = mmH / MAP_H;

    // Territory blobs on minimap
    for (const city of s.cities) {
      const [cr, cg, cb] = _factionRGB(city.factionId);
      ctx.fillStyle = `rgba(${cr},${cg},${cb},0.25)`;
      ctx.beginPath();
      ctx.arc(mx + city.x * scaleX, my + city.y * scaleY, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Villages on minimap (small dots)
    for (const village of s.villages) {
      ctx.fillStyle = _factionHex(village.factionId);
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(mx + village.x * scaleX, my + village.y * scaleY, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // Special locations on minimap (diamond shapes)
    for (const loc of s.specialLocations) {
      ctx.fillStyle = loc.explored ? "#555" : "#ffd700";
      ctx.beginPath();
      const lmx = mx + loc.x * scaleX;
      const lmy = my + loc.y * scaleY;
      ctx.moveTo(lmx, lmy - 2.5);
      ctx.lineTo(lmx + 2.5, lmy);
      ctx.lineTo(lmx, lmy + 2.5);
      ctx.lineTo(lmx - 2.5, lmy);
      ctx.closePath();
      ctx.fill();
    }

    // Cities on minimap
    for (const city of s.cities) {
      const color = _factionHex(city.factionId);
      ctx.fillStyle = color;
      ctx.strokeStyle = city.factionId === s.playerFaction ? "#ffd700" : "rgba(60,50,35,0.8)";
      ctx.lineWidth = city.factionId === s.playerFaction ? 1.5 : 0.8;
      ctx.fillRect(mx + city.x * scaleX - 2.5, my + city.y * scaleY - 2.5, 5, 5);
      ctx.strokeRect(mx + city.x * scaleX - 2.5, my + city.y * scaleY - 2.5, 5, 5);
    }

    // Parties on minimap
    for (const party of s.parties) {
      const color = _factionHex(party.factionId);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(mx + party.x * scaleX, my + party.y * scaleY, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Caravans on minimap (small brown dots)
    for (const caravan of s.caravans) {
      ctx.fillStyle = "#aa8844";
      ctx.beginPath();
      ctx.arc(mx + caravan.x * scaleX, my + caravan.y * scaleY, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Event markers on minimap
    for (const evt of s.events) {
      if (!evt.active) continue;
      let evtMX = evt.mapX;
      let evtMY = evt.mapY;
      if (evt.targetCityId) {
        const ec = s.cities.find(c => c.id === evt.targetCityId);
        if (ec) { evtMX = ec.x; evtMY = ec.y; }
      }
      if (evtMX && evtMY) {
        ctx.fillStyle = evt.type === "bandit_raid" ? "#cc4444" : evt.type === "merchant_festival" ? "#44cc44" : evt.type === "plague" ? "#aa44aa" : "#6688cc";
        ctx.beginPath();
        ctx.arc(mx + evtMX * scaleX, my + evtMY * scaleY, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Player on minimap (pulsing)
    const pp = s.playerParty;
    const pulse = 2.5 + Math.sin(this._animTime * 4) * 0.8;
    ctx.fillStyle = "#ffd700";
    ctx.beginPath();
    ctx.arc(mx + pp.x * scaleX, my + pp.y * scaleY, pulse, 0, Math.PI * 2);
    ctx.fill();

    // Camera viewport on minimap
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 1;
    ctx.strokeRect(
      mx + this._camX * scaleX,
      my + this._camY * scaleY,
      (window.innerWidth / this._zoom) * scaleX,
      (window.innerHeight / this._zoom) * scaleY,
    );

    // Minimap label
    ctx.fillStyle = "rgba(160,140,110,0.5)";
    ctx.font = "8px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("MAP", mx + 4, my + 10);
  }

  // ---------------------------------------------------------------------------
  // Battle integration
  // ---------------------------------------------------------------------------

  private _startPartyBattle(enemy: CampaignParty): void {
    if (!this._state || this._inBattle) return;
    this._inBattle = true;
    this._state.paused = true;
    this._battleEnemyPartyId = enemy.id;
    this._battleEnemyCityId = null;
    this._battleLocationId = null;
    this._battlePlayerArmy = this._state.playerParty.army.map((a) => ({ ...a }));
    this._battleEnemyArmy = enemy.army.map((a) => ({ ...a }));

    this._addLog(`Battle! Your warband (${this._state.playerParty.armyTotal}) vs ${enemy.name} (${enemy.armyTotal})`);

    this._launchBattle();
  }

  private _startCityBattle(city: CampaignCity): void {
    if (!this._state || this._inBattle) return;
    this._inBattle = true;
    this._state.paused = true;
    this._battleEnemyPartyId = null;
    this._battleEnemyCityId = city.id;
    this._battleLocationId = null;
    this._battlePlayerArmy = this._state.playerParty.army.map((a) => ({ ...a }));
    this._battleEnemyArmy = city.garrison.map((g) => ({ ...g }));

    this._addLog(`Siege! Your warband (${this._state.playerParty.armyTotal}) attacks ${city.name} (${city.garrisonTotal} defenders)`);

    this._launchBattle();
  }

  private _launchBattle(): void {
    // Hide campaign UI
    if (this._container) this._container.style.display = "none";

    // Create battle systems
    this._battleSceneManager = new WarbandSceneManager();
    this._battleSceneManager.init();
    this._battleCameraController = new WarbandCameraController(this._battleSceneManager.camera);
    this._battleFX = new WarbandFX(this._battleSceneManager.scene);
    this._battleHUD = new WarbandHUD();
    this._battleHUD.init();
    this._battleInputSystem = new WarbandInputSystem();
    this._battleCombatSystem = new WarbandCombatSystem();
    this._battlePhysicsSystem = new WarbandPhysicsSystem();
    this._battleAISystem = new WarbandAISystem();

    // Create battle state
    const sw = window.innerWidth;
    const sh = window.innerHeight;
    const isSiege = this._battleEnemyCityId != null;
    this._battleState = createWarbandState(
      isSiege ? BattleType.SIEGE : BattleType.ARMY_BATTLE,
      sw,
      sh,
    );

    if (isSiege) {
      this._battleSceneManager.buildSiegeArena();
    }

    const halfW = WB.ARENA_WIDTH / 2;

    // Spawn player (the hero)
    const player = createDefaultFighter("player_0", "You", "player", true, vec3(0, 0, 10));
    // Equip player as a knight
    player.equipment.mainHand = WEAPON_DEFS["arming_sword"] ?? null;
    player.equipment.offHand = WEAPON_DEFS["kite_shield"] ?? null;
    player.equipment.armor = {
      [ArmorSlot.HEAD]: ARMOR_DEFS["bascinet"] ?? null,
      [ArmorSlot.TORSO]: ARMOR_DEFS["brigandine"] ?? null,
      [ArmorSlot.GAUNTLETS]: ARMOR_DEFS["mail_gauntlets"] ?? null,
      [ArmorSlot.LEGS]: ARMOR_DEFS["splinted_greaves"] ?? null,
      [ArmorSlot.BOOTS]: ARMOR_DEFS["chain_sabatons"] ?? null,
    };
    const veteranBonus = this._getPerkCount("veteran") * 20;
    player.hp = 200 + veteranBonus;
    player.maxHp = 200 + veteranBonus;
    this._battleState.fighters.push(player);

    // Spawn player army units using deployment formation
    const totalAllies = this._battlePlayerArmy.reduce((sum, e) => sum + e.count, 0);
    const allyPositions = this._getDeploymentPositions(totalAllies, this._deploymentFormation, "player", halfW);
    let allyIdx = 0;
    for (const entry of this._battlePlayerArmy) {
      const uDef = this._findCampaignUnit(entry.unitId);
      if (!uDef) continue;
      for (let n = 0; n < entry.count; n++) {
        const pos = allyPositions[allyIdx] || { x: (allyIdx % 10 - 4.5) * 2.5, z: 12 + Math.floor(allyIdx / 10) * 2.5 };
        const ally = createDefaultFighter(
          `ally_${allyIdx}`,
          uDef.name,
          "player",
          false,
          vec3(Math.max(-halfW + 2, Math.min(halfW - 2, pos.x)), 0, pos.z),
        );
        this._equipCampaignUnit(ally, uDef, this._battleState!);
        // Apply flanking damage bonus
        if (this._state && this._state.flankingBonus > 0 && ally.ai) {
          ally.ai.aggressiveness = Math.min(1, (ally.ai.aggressiveness ?? 0.5) + this._state.flankingBonus);
        }
        this._battleState.fighters.push(ally);
        allyIdx++;
      }
    }

    // Spawn enemy army units
    const totalEnemies = this._battleEnemyArmy.reduce((sum, e) => sum + e.count, 0);
    const enemyPositions = this._getDeploymentPositions(totalEnemies, "line", "enemy", halfW);
    let enemyIdx = 0;
    for (const entry of this._battleEnemyArmy) {
      const uDef = this._findCampaignUnit(entry.unitId);
      if (!uDef) continue;
      for (let n = 0; n < entry.count; n++) {
        const pos = enemyPositions[enemyIdx] || { x: (enemyIdx % 10 - 4.5) * 2.5, z: -12 - Math.floor(enemyIdx / 10) * 2.5 };
        const enemy = createDefaultFighter(
          `enemy_${enemyIdx}`,
          uDef.name,
          "enemy",
          false,
          vec3(Math.max(-halfW + 2, Math.min(halfW - 2, pos.x)), 0, pos.z),
        );
        this._equipCampaignUnit(enemy, uDef, this._battleState!);
        this._battleState.fighters.push(enemy);
        enemyIdx++;
      }
    }

    this._battleState.playerTeamAlive = allyIdx + 1; // +1 for player hero
    this._battleState.enemyTeamAlive = enemyIdx;
    this._battleState.battleTimer = 180 * WB.TICKS_PER_SEC;

    // Start battle
    this._battleState.phase = WarbandPhase.BATTLE;
    this._battleInputSystem.pointerLockEnabled = true;

    // Create fighter meshes
    let pIdx = 0;
    let eIdx = 0;
    for (const fighter of this._battleState.fighters) {
      if (fighter.creatureType) {
        const cMesh = new CreatureMesh(fighter);
        this._battleSceneManager.scene.add(cMesh.group);
        this._battleCreatureMeshes.set(fighter.id, cMesh);
        continue;
      }
      const idx = fighter.team === "player" ? pIdx++ : eIdx++;
      const mesh = new FighterMesh(fighter, idx);
      mesh.updateArmorVisuals(fighter);
      this._battleSceneManager.scene.add(mesh.group);
      this._battleFighterMeshes.set(fighter.id, mesh);
    }

    // Create horse meshes
    for (const horse of this._battleState.horses) {
      const hMesh = new HorseMesh(horse);
      this._battleSceneManager.scene.add(hMesh.group);
      this._battleHorseMeshes.set(horse.id, hMesh);
    }

    // Init input
    this._battleInputSystem.init(
      this._battleSceneManager.canvas,
      this._battleCameraController,
    );

    // ESC handler for battle (also shows pause menu)
    this._escHandler = (e: KeyboardEvent) => {
      if (e.code === "Escape" && this._battleState) {
        if (this._battleState.phase === WarbandPhase.BATTLE) {
          this._battleState.paused = !this._battleState.paused;
          if (this._battleState.paused) {
            this._showPauseMenu();
          } else {
            this._hidePauseMenu();
          }
        }
      }
    };
    window.addEventListener("keydown", this._escHandler);

    // Start battle loop
    this._battleLastTime = performance.now();
    this._battleSimAccumulator = 0;
    this._battleHUD.showCenterMessage("FIGHT!", 2000);
    this._battleGameLoop(this._battleLastTime);
  }

  private _findCampaignUnit(unitId: string): CampaignUnitType | undefined {
    // Check regular units
    const found = CAMPAIGN_UNITS.find((u) => u.id === unitId);
    if (found) return found;
    // Check faction elites
    for (const key of Object.keys(FACTION_ELITES)) {
      if (FACTION_ELITES[key].id === unitId) return FACTION_ELITES[key];
    }
    // Fallback: swordsman
    return CAMPAIGN_UNITS[0];
  }

  private _equipCampaignUnit(fighter: WarbandFighter, unit: CampaignUnitType, state: WarbandState): void {
    fighter.name = unit.name;

    if (unit.creatureType) {
      const cDef = CREATURE_DEFS[unit.creatureType];
      fighter.creatureType = unit.creatureType;
      fighter.creatureRadius = cDef.radius;
      fighter.hp = cDef.hp;
      fighter.maxHp = cDef.hp;
      fighter.equipment.mainHand = null;
      fighter.equipment.offHand = null;
      fighter.equipment.armor = {};
      if (fighter.ai) {
        fighter.ai.preferredRange = cDef.reach * 0.8;
        fighter.ai.aggressiveness = 0.7;
        fighter.ai.blockChance = 0.15;
      }
      return;
    }

    fighter.equipment.mainHand = WEAPON_DEFS[unit.mainHand] ?? null;
    fighter.equipment.offHand = unit.offHand ? (WEAPON_DEFS[unit.offHand] ?? null) : null;
    fighter.equipment.armor = {
      [ArmorSlot.HEAD]: ARMOR_DEFS[unit.head] ?? null,
      [ArmorSlot.TORSO]: ARMOR_DEFS[unit.torso] ?? null,
      [ArmorSlot.GAUNTLETS]: ARMOR_DEFS[unit.gauntlets] ?? null,
      [ArmorSlot.LEGS]: ARMOR_DEFS[unit.legs] ?? null,
      [ArmorSlot.BOOTS]: ARMOR_DEFS[unit.boots] ?? null,
    };

    if (unit.hpOverride) {
      fighter.hp = unit.hpOverride;
      fighter.maxHp = unit.hpOverride;
    }

    if (unit.scale && unit.scale !== 1.0) {
      fighter.scale = unit.scale;
      fighter.creatureRadius = WB.FIGHTER_RADIUS * unit.scale;
    }

    if (fighter.equipment.mainHand?.ammo) {
      fighter.ammo = fighter.equipment.mainHand.ammo;
      fighter.maxAmmo = fighter.equipment.mainHand.ammo;
    }

    if (unit.horseArmor && state) {
      const horseId = `horse_${fighter.id}`;
      const horse = createHorse(horseId, unit.horseArmor, { ...fighter.position }, fighter.id);
      horse.rotation = fighter.rotation;
      state.horses.push(horse);
      fighter.mountId = horseId;
      fighter.isMounted = true;
    }
  }

  // ---------------------------------------------------------------------------
  // Battle game loop
  // ---------------------------------------------------------------------------

  private _battleGameLoop = (time: number): void => {
    this._battleRafId = requestAnimationFrame(this._battleGameLoop);
    if (!this._battleState || !this._battleSceneManager) return;

    const rawDt = time - this._battleLastTime;
    this._battleLastTime = time;
    const dt = Math.min(rawDt, 100);
    const dtSec = dt / 1000;

    if (this._battleState.phase !== WarbandPhase.BATTLE || this._battleState.paused) {
      this._battleSceneManager.render();
      return;
    }

    // Fixed timestep
    this._battleSimAccumulator += dt;
    while (this._battleSimAccumulator >= WB.SIM_TICK_MS) {
      this._battleSimAccumulator -= WB.SIM_TICK_MS;
      this._battleSimTick();
    }

    // Update visuals
    this._battleUpdateVisuals(dtSec);
    this._battleFX!.update(dtSec);
    this._battleSceneManager.render();
  };

  private _battleSimTick(): void {
    if (!this._battleState) return;
    const state = this._battleState;
    state.tick++;

    // Input
    this._battleInputSystem!.update(state);

    // AI
    this._battleAISystem!.update(state);

    // Combat
    this._battleCombatSystem!.update(state);
    this._battleCombatSystem!.updateCreatureAbilities(state);

    // FX from combat
    for (const aoe of this._battleCombatSystem!.creatureAbilityExplosions) {
      this._battleFX!.spawnAoeExplosion(aoe.x, aoe.y, aoe.z, aoe.radius, aoe.color);
    }
    for (const hit of this._battleCombatSystem!.hits) {
      if (hit.blocked) {
        this._battleFX!.spawnHitSparks(hit.position.x, hit.position.y, hit.position.z, true);
      } else {
        this._battleFX!.spawnBlood(hit.position.x, hit.position.y, hit.position.z, hit.damage);
      }
    }
    for (const aoe of this._battleCombatSystem!.aoeExplosions) {
      this._battleFX!.spawnAoeExplosion(aoe.x, aoe.y, aoe.z, aoe.radius, aoe.color);
    }
    for (const seg of this._battleCombatSystem!.chainSegments) {
      this._battleFX!.spawnChainBolt(seg.from, seg.to, seg.color);
    }
    for (const heal of this._battleCombatSystem!.healExplosions) {
      this._battleFX!.spawnHealAoe(heal.x, heal.z, heal.radius);
    }

    // Kill feed
    for (const kill of this._battleCombatSystem!.kills) {
      const killer = state.fighters.find((f) => f.id === kill.killerId);
      const victim = state.fighters.find((f) => f.id === kill.victimId);
      if (killer && victim) {
        this._battleHUD!.addKill(killer.name, victim.name);
      }
    }

    // Physics
    this._battlePhysicsSystem!.update(state);

    // Count alive
    let playerAlive = 0;
    let enemyAlive = 0;
    for (const f of state.fighters) {
      if (f.hp > 0) {
        if (f.team === "player") playerAlive++;
        else enemyAlive++;
      }
    }
    state.playerTeamAlive = playerAlive;
    state.enemyTeamAlive = enemyAlive;

    // Battle timer
    state.battleTimer--;
    if (state.battleTimer <= 0 || playerAlive === 0 || enemyAlive === 0) {
      const playerWon = playerAlive > enemyAlive;
      this._endBattle(playerWon);
    }

    // HUD
    this._battleHUD!.update(state);
  }

  private _battleUpdateVisuals(dtSec: number): void {
    if (!this._battleState || !this._battleSceneManager) return;

    const camera = this._battleSceneManager!.camera;

    // Build fighter lookup for camera/horse updates
    const fighterById = new Map<string, WarbandFighter>();
    for (const f of this._battleState.fighters) fighterById.set(f.id, f);

    // Camera follow player
    const player = fighterById.get(this._battleState.playerId);
    if (player && this._battleCameraController) {
      this._battleCameraController.update(this._battleState, player);
    }

    for (const fighter of this._battleState.fighters) {
      if (fighter.creatureType) {
        const cMesh = this._battleCreatureMeshes.get(fighter.id);
        if (cMesh) cMesh.update(fighter, dtSec, camera);
        continue;
      }
      const mesh = this._battleFighterMeshes.get(fighter.id);
      if (mesh) mesh.update(fighter, dtSec, camera);
    }

    for (const horse of this._battleState.horses) {
      const hMesh = this._battleHorseMeshes.get(horse.id);
      if (hMesh) {
        let riderSpeed = 0;
        if (horse.riderId) {
          const rider = fighterById.get(horse.riderId);
          if (rider) riderSpeed = Math.sqrt(rider.velocity.x ** 2 + rider.velocity.z ** 2);
        }
        hMesh.update(horse, riderSpeed, dtSec, camera);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // End battle / results
  // ---------------------------------------------------------------------------

  private _endBattle(playerWon: boolean): void {
    if (!this._battleState) return;
    this._battleState.phase = WarbandPhase.RESULTS;

    this._battleInputSystem!.pointerLockEnabled = false;
    if (document.pointerLockElement) document.exitPointerLock();

    // Calculate survivors
    const playerSurvivors = this._battleState.fighters.filter(
      (f) => f.team === "player" && f.hp > 0 && !f.isPlayer,
    );
    const enemySurvivors = this._battleState.fighters.filter(
      (f) => f.team === "enemy" && f.hp > 0,
    );

    // Calculate loot
    const enemiesKilled = this._battleState.fighters.filter(
      (f) => f.team === "enemy" && f.hp <= 0,
    ).length;
    const looterMult = 1 + this._getPerkCount("looter") * 0.3;
    const loot = Math.round(enemiesKilled * LOOT_PER_UNIT * looterMult);

    setTimeout(() => {
      this._showBattleResults(playerWon, playerSurvivors, enemySurvivors, loot);
    }, 1500);
  }

  private _showBattleResults(
    won: boolean,
    playerSurvivors: WarbandFighter[],
    _enemySurvivors: WarbandFighter[],
    loot: number,
  ): void {
    if (document.pointerLockElement) document.exitPointerLock();

    // Stop the battle game loop so it doesn't interfere with UI
    if (this._battleRafId) {
      cancelAnimationFrame(this._battleRafId);
      this._battleRafId = 0;
    }

    // Disable pointer events on the battle canvas so the results overlay buttons work
    if (this._battleSceneManager) {
      this._battleSceneManager.setCanvasPointerEvents(false);
    }
    // Also disable the battle input system's pointer lock and destroy it
    if (this._battleInputSystem) {
      this._battleInputSystem.pointerLockEnabled = false;
      this._battleInputSystem.destroy();
    }
    // Hide the battle HUD so it doesn't sit on top of the results
    if (this._battleHUD) {
      this._battleHUD.destroy();
      this._battleHUD = null;
    }

    this._battleResultsContainer = document.createElement("div");
    this._battleResultsContainer.style.cssText = `
      position:absolute;top:0;left:0;width:100%;height:100%;z-index:100;
      pointer-events:auto;
      background:rgba(10,8,5,0.92);display:flex;flex-direction:column;
      align-items:center;justify-content:center;font-family:'Segoe UI',sans-serif;color:#e0d5c0;
    `;

    const survivorCount = playerSurvivors.length;
    const playerLost = (this._battlePlayerArmy.reduce((s, a) => s + a.count, 0)) - survivorCount;

    this._battleResultsContainer.innerHTML = `
      <h1 style="font-size:42px;color:${won ? "#ffd700" : "#cc4444"};
        text-shadow:0 0 15px rgba(${won ? "218,165,32" : "204,68,68"},0.4)">
        ${won ? "VICTORY" : "DEFEAT"}
      </h1>
      <div style="margin:16px 0;font-size:14px;color:#aa9977">
        <div>Survivors: ${survivorCount} / Losses: ${playerLost}</div>
        ${won ? `<div style="color:#ffcc44;margin-top:6px">Loot: +${loot} gold</div>` : ""}
      </div>
    `;

    const btn = document.createElement("button");
    btn.id = "camp-battle-continue";
    btn.textContent = "Return to Campaign Map";
    btn.style.cssText = `
      padding:12px 30px;font-size:16px;font-weight:bold;
      border:2px solid #daa520;border-radius:6px;
      background:rgba(218,165,32,0.15);color:#daa520;
      cursor:pointer;font-family:inherit;margin-top:10px;
      pointer-events:auto;
    `;
    btn.addEventListener("mouseenter", () => {
      btn.style.background = "rgba(218,165,32,0.35)";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.background = "rgba(218,165,32,0.15)";
    });
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      this._processBattleOutcome(won, playerSurvivors, loot);
    });
    this._battleResultsContainer.appendChild(btn);

    // Block any pointer-lock re-acquisition from clicks on the results overlay
    this._battleResultsContainer.addEventListener("mousedown", (e) => {
      e.stopPropagation();
    });

    const container = document.getElementById("pixi-container");
    if (container) container.appendChild(this._battleResultsContainer);
  }

  private _processBattleOutcome(
    won: boolean,
    playerSurvivors: WarbandFighter[],
    loot: number,
  ): void {
    if (!this._state) return;

    // Clean up battle
    this._cleanupBattle();

    // Update player army based on survivors
    const survivorNames = new Map<string, number>();
    for (const f of playerSurvivors) {
      const count = survivorNames.get(f.name) ?? 0;
      survivorNames.set(f.name, count + 1);
    }

    // Rebuild player army from survivors
    const newArmy: { unitId: string; count: number; xp: number }[] = [];
    for (const entry of this._state.playerParty.army) {
      const uDef = this._findCampaignUnit(entry.unitId);
      if (!uDef) continue;
      const survived = survivorNames.get(uDef.name) ?? 0;
      if (survived > 0) {
        newArmy.push({ unitId: entry.unitId, count: Math.min(survived, entry.count), xp: entry.xp });
        survivorNames.set(uDef.name, Math.max(0, survived - entry.count));
      }
    }

    // Award XP to surviving units
    const xpGain = won ? XP_WIN : XP_LOSS;
    for (const entry of newArmy) {
      entry.xp += xpGain;
    }

    // Check for promotions
    for (let i = 0; i < newArmy.length; i++) {
      const entry = newArmy[i];
      if (entry.xp >= XP_PROMOTE_THRESHOLD) {
        const upgrade = UNIT_UPGRADE_PATH[entry.unitId];
        if (upgrade && upgrade !== entry.unitId) {
          const oldName = entry.unitId;
          entry.unitId = upgrade;
          entry.xp = 0;
          this._addLog(`${oldName.replace(/_/g, " ")} promoted to ${upgrade.replace(/_/g, " ")}!`);
        } else {
          // No upgrade path or same unit, just cap xp
          entry.xp = XP_PROMOTE_THRESHOLD;
        }
      }
    }

    // Merge entries that share unitId+xp after promotions
    const merged: { unitId: string; count: number; xp: number }[] = [];
    for (const entry of newArmy) {
      const existing = merged.find((m) => m.unitId === entry.unitId && m.xp === entry.xp);
      if (existing) {
        existing.count += entry.count;
      } else {
        merged.push({ ...entry });
      }
    }

    this._state.playerParty.army = merged;
    this._state.playerParty.armyTotal = merged.reduce((s, a) => s + a.count, 0);

    if (won) {
      this._state.gold += loot;

      // Award hero XP (on victory, all enemies are killed)
      const totalEnemies = this._battleEnemyArmy.reduce((s, a) => s + a.count, 0);
      const xpGained = 20 + totalEnemies * 3;
      this._awardHeroXp(xpGained);

      // Handle enemy party destruction
      if (this._battleEnemyPartyId) {
        const defeated = this._state.parties.find((p) => p.id === this._battleEnemyPartyId);
        const defeatedFaction = defeated?.factionId;
        this._state.parties = this._state.parties.filter((p) => p.id !== this._battleEnemyPartyId);
        this._addLog(`Enemy warband destroyed! +${loot}g`);

        // Diplomacy: attacking a faction's party: -30 with them, -10 with their friends
        if (defeatedFaction) {
          this._modRelation(this._state.playerFaction, defeatedFaction, -30);
          for (const [fId] of this._state.factionRelations) {
            if (fId === this._state.playerFaction || fId === defeatedFaction) continue;
            if (this._getRelationStatus(fId, defeatedFaction) === "friendly") {
              this._modRelation(this._state.playerFaction, fId, -10);
            }
            if (this._getRelationStatus(fId, defeatedFaction) === "hostile") {
              this._modRelation(this._state.playerFaction, fId, 10);
            }
          }
        }
      }

      // Handle city capture
      if (this._battleEnemyCityId) {
        const city = this._state.cities.find((c) => c.id === this._battleEnemyCityId);
        if (city) {
          const oldFaction = city.factionId;
          city.factionId = this._state.playerFaction;
          city.garrison = [];
          city.garrisonTotal = 0;
          this._addLog(`${city.name} captured from ${oldFaction}! +${loot}g`);

          // Flip linked villages
          for (const v of this._state.villages) {
            if (v.linkedCityId === city.id) {
              v.factionId = this._state.playerFaction;
            }
          }

          // Diplomacy: capturing a city: -40 with that faction, -10 with their friends
          this._modRelation(this._state.playerFaction, oldFaction, -40);
          for (const [fId] of this._state.factionRelations) {
            if (fId === this._state.playerFaction || fId === oldFaction) continue;
            if (this._getRelationStatus(fId, oldFaction) === "friendly") {
              this._modRelation(this._state.playerFaction, fId, -10);
            }
          }
        }
      }

      // Handle special location exploration reward
      if (this._battleLocationId) {
        const loc = this._state.specialLocations.find((l) => l.id === this._battleLocationId);
        if (loc) {
          loc.explored = true;
          this._state.gold += loc.reward.gold;
          this._addLog(`Explored ${loc.name}! Found ${loc.reward.gold}g.`);
          if (loc.reward.unitId && loc.reward.unitCount) {
            const existing = this._state.playerParty.army.find((a) => a.unitId === loc.reward.unitId! && a.xp === 0);
            if (existing) {
              existing.count += loc.reward.unitCount;
            } else {
              this._state.playerParty.army.push({ unitId: loc.reward.unitId, count: loc.reward.unitCount, xp: 0 });
            }
            this._state.playerParty.armyTotal += loc.reward.unitCount;
            this._addLog(`Found ${loc.reward.unitCount} ${loc.reward.unitId.replace(/_/g, " ")}!`);
          }
        }
      }
    } else {
      this._addLog("Your warband was defeated in battle.");
      // If player has no army and no cities, game over handled in _update
    }

    this._battleEnemyPartyId = null;
    this._battleEnemyCityId = null;
    this._battleLocationId = null;

    // Respawn AI bands if too few left
    if (this._state.parties.length < 6) {
      const factions = CAMPAIGN_FACTIONS.filter((f) => f.id !== this._state!.playerFaction);
      const activeFactions = factions.filter((f) =>
        this._state!.cities.some((c) => c.factionId === f.id),
      );
      if (activeFactions.length > 0) {
        const newBands = _generateRovingBands(this._state.cities, activeFactions);
        for (const band of newBands.slice(0, 4)) {
          band.id = `party_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
          this._state.parties.push(band);
        }
      }
    }

    // Show campaign again
    if (this._container) this._container.style.display = "";
    this._inBattle = false;
    this._state.paused = false;
  }

  // ---------------------------------------------------------------------------
  // Pause menu (ESC during battle or campaign)
  // ---------------------------------------------------------------------------

  private _showPauseMenu(): void {
    if (this._pauseMenuContainer) return;
    if (document.pointerLockElement) document.exitPointerLock();

    this._pauseMenuContainer = document.createElement("div");
    this._pauseMenuContainer.style.cssText = `
      position:absolute;top:0;left:0;width:100%;height:100%;z-index:90;
      background:rgba(10,8,5,0.85);display:flex;flex-direction:column;
      align-items:center;justify-content:center;font-family:'Segoe UI',sans-serif;color:#e0d5c0;
      pointer-events:auto;
    `;
    this._pauseMenuContainer.addEventListener("mousedown", (e) => e.stopPropagation());

    this._pauseMenuContainer.innerHTML = `
      <h1 style="font-size:36px;color:#daa520;text-shadow:0 0 12px rgba(218,165,32,0.4);margin-bottom:24px;">PAUSED</h1>
      <div style="background:rgba(30,24,16,0.9);border:2px solid #5a4020;border-radius:8px;padding:28px 36px;max-width:480px;width:90%;">
        <h2 style="font-size:18px;color:#daa520;margin:0 0 14px 0;border-bottom:1px solid #5a4020;padding-bottom:8px;">Controls</h2>
        <div style="font-size:13px;line-height:1.8;color:#aa9977;">
          <div><span style="color:#e0d5c0;font-weight:bold;">WASD</span> - Move</div>
          <div><span style="color:#e0d5c0;font-weight:bold;">Arrow Keys</span> - Attack (hold to windup, release to swing)</div>
          <div><span style="color:#e0d5c0;font-weight:bold;">Right Mouse</span> - Block</div>
          <div><span style="color:#e0d5c0;font-weight:bold;">F</span> - Loot fallen enemies</div>
          <div><span style="color:#e0d5c0;font-weight:bold;">B</span> - Mount / Dismount horse</div>
          <div><span style="color:#e0d5c0;font-weight:bold;">V</span> - Toggle 1st / 3rd person camera</div>
          <div><span style="color:#e0d5c0;font-weight:bold;">C</span> - Free orbit camera</div>
          <div><span style="color:#e0d5c0;font-weight:bold;">Shift</span> - Sprint</div>
          <div><span style="color:#e0d5c0;font-weight:bold;">Space</span> - Jump</div>
          <div><span style="color:#e0d5c0;font-weight:bold;">1-5</span> - Formation commands</div>
          <div><span style="color:#e0d5c0;font-weight:bold;">6-0</span> - Troop orders</div>
        </div>
        <h2 style="font-size:18px;color:#daa520;margin:18px 0 10px 0;border-bottom:1px solid #5a4020;padding-bottom:8px;">Hints</h2>
        <div style="font-size:13px;line-height:1.8;color:#aa9977;">
          <div>- Match your block direction to the enemy's attack to parry.</div>
          <div>- Overhead swings deal extra damage but are slower.</div>
          <div>- Mounted units deal charge damage at speed.</div>
          <div>- Stay near the map edge to build up your flee timer.</div>
          <div>- Loot fallen enemies for better equipment.</div>
        </div>
      </div>
      <div style="margin-top:20px;font-size:13px;color:#665533;">Press ESC to resume</div>
    `;

    const resumeBtn = document.createElement("button");
    resumeBtn.textContent = "Resume";
    resumeBtn.style.cssText = `
      margin-top:16px;padding:10px 36px;font-size:16px;font-weight:bold;
      border:2px solid #daa520;border-radius:6px;
      background:rgba(218,165,32,0.15);color:#daa520;
      cursor:pointer;font-family:inherit;pointer-events:auto;
    `;
    resumeBtn.addEventListener("mouseenter", () => { resumeBtn.style.background = "rgba(218,165,32,0.35)"; });
    resumeBtn.addEventListener("mouseleave", () => { resumeBtn.style.background = "rgba(218,165,32,0.15)"; });
    resumeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (this._battleState) {
        this._battleState.paused = false;
      }
      this._hidePauseMenu();
    });
    this._pauseMenuContainer.appendChild(resumeBtn);

    const container = document.getElementById("pixi-container");
    if (container) container.appendChild(this._pauseMenuContainer);
  }

  private _hidePauseMenu(): void {
    if (this._pauseMenuContainer?.parentNode) {
      this._pauseMenuContainer.parentNode.removeChild(this._pauseMenuContainer);
    }
    this._pauseMenuContainer = null;
  }

  private _showCampaignPauseMenu(): void {
    if (this._campaignPauseMenuContainer) return;

    this._campaignPauseMenuContainer = document.createElement("div");
    this._campaignPauseMenuContainer.style.cssText = `
      position:absolute;top:0;left:0;width:100%;height:100%;z-index:90;
      background:rgba(10,8,5,0.85);display:flex;flex-direction:column;
      align-items:center;justify-content:center;font-family:'Segoe UI',sans-serif;color:#e0d5c0;
      pointer-events:auto;
    `;
    this._campaignPauseMenuContainer.addEventListener("mousedown", (e) => e.stopPropagation());

    this._campaignPauseMenuContainer.innerHTML = `
      <h1 style="font-size:36px;color:#daa520;text-shadow:0 0 12px rgba(218,165,32,0.4);margin-bottom:24px;">PAUSED</h1>
      <div style="background:rgba(30,24,16,0.9);border:2px solid #5a4020;border-radius:8px;padding:28px 36px;max-width:480px;width:90%;">
        <h2 style="font-size:18px;color:#daa520;margin:0 0 14px 0;border-bottom:1px solid #5a4020;padding-bottom:8px;">Campaign Controls</h2>
        <div style="font-size:13px;line-height:1.8;color:#aa9977;">
          <div><span style="color:#e0d5c0;font-weight:bold;">Left Click</span> - Move party / Select city</div>
          <div><span style="color:#e0d5c0;font-weight:bold;">Right Drag</span> - Pan camera</div>
          <div><span style="color:#e0d5c0;font-weight:bold;">Scroll Wheel</span> - Zoom in/out</div>
          <div><span style="color:#e0d5c0;font-weight:bold;">Space</span> - Pause / Unpause time</div>
          <div><span style="color:#e0d5c0;font-weight:bold;">D</span> - Diplomacy panel</div>
          <div><span style="color:#e0d5c0;font-weight:bold;">ESC</span> - Close panels / Pause</div>
        </div>
        <h2 style="font-size:18px;color:#daa520;margin:18px 0 10px 0;border-bottom:1px solid #5a4020;padding-bottom:8px;">Tips</h2>
        <div style="font-size:13px;line-height:1.8;color:#aa9977;">
          <div>- Visit cities to hire troops and trade.</div>
          <div>- Keep an eye on unit upkeep costs.</div>
          <div>- Explore special locations for rewards.</div>
          <div>- Build diplomacy to avoid multi-front wars.</div>
          <div>- Units gain XP after battles and can be promoted.</div>
        </div>
      </div>
      <div style="margin-top:20px;font-size:13px;color:#665533;">Press ESC to resume</div>
    `;

    const resumeBtn = document.createElement("button");
    resumeBtn.textContent = "Resume";
    resumeBtn.style.cssText = `
      margin-top:16px;padding:10px 36px;font-size:16px;font-weight:bold;
      border:2px solid #daa520;border-radius:6px;
      background:rgba(218,165,32,0.15);color:#daa520;
      cursor:pointer;font-family:inherit;pointer-events:auto;
    `;
    resumeBtn.addEventListener("mouseenter", () => { resumeBtn.style.background = "rgba(218,165,32,0.35)"; });
    resumeBtn.addEventListener("mouseleave", () => { resumeBtn.style.background = "rgba(218,165,32,0.15)"; });
    resumeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (this._state) this._state.paused = false;
      this._hideCampaignPauseMenu();
      this._updateTopBar();
    });
    this._campaignPauseMenuContainer.appendChild(resumeBtn);

    if (this._container) this._container.appendChild(this._campaignPauseMenuContainer);
  }

  private _hideCampaignPauseMenu(): void {
    if (this._campaignPauseMenuContainer?.parentNode) {
      this._campaignPauseMenuContainer.parentNode.removeChild(this._campaignPauseMenuContainer);
    }
    this._campaignPauseMenuContainer = null;
  }

  private _cleanupBattle(): void {
    cancelAnimationFrame(this._battleRafId);

    // Remove pause menu if open
    this._hidePauseMenu();

    // Remove results
    if (this._battleResultsContainer?.parentNode) {
      this._battleResultsContainer.parentNode.removeChild(this._battleResultsContainer);
      this._battleResultsContainer = null;
    }

    // Dispose meshes
    for (const [, mesh] of this._battleFighterMeshes) {
      this._battleSceneManager?.scene.remove(mesh.group);
      mesh.dispose();
    }
    this._battleFighterMeshes.clear();

    for (const [, mesh] of this._battleHorseMeshes) {
      this._battleSceneManager?.scene.remove(mesh.group);
      mesh.dispose();
    }
    this._battleHorseMeshes.clear();

    for (const [, mesh] of this._battleCreatureMeshes) {
      this._battleSceneManager?.scene.remove(mesh.group);
      mesh.dispose();
    }
    this._battleCreatureMeshes.clear();

    // Destroy systems
    this._battleInputSystem?.destroy();
    this._battleHUD?.destroy();
    this._battleFX?.destroy();
    this._battleSceneManager?.destroy();

    this._battleSceneManager = null;
    this._battleCameraController = null;
    this._battleInputSystem = null;
    this._battleCombatSystem = null;
    this._battlePhysicsSystem = null;
    this._battleAISystem = null;
    this._battleHUD = null;
    this._battleFX = null;
    this._battleState = null;

    if (this._escHandler) {
      window.removeEventListener("keydown", this._escHandler);
      this._escHandler = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Fog of war drawing
  // ---------------------------------------------------------------------------

  private _drawFogOfWar(ctx: CanvasRenderingContext2D): void {
    if (!this._state) return;
    const fog = this._state.fogRevealed;

    // Use an offscreen canvas for fog, cached
    if (!this._fogCanvas) {
      this._fogCanvas = document.createElement("canvas");
      this._fogCanvas.width = MAP_W;
      this._fogCanvas.height = MAP_H;
    }
    const fogCtx = this._fogCanvas.getContext("2d")!;
    fogCtx.clearRect(0, 0, MAP_W, MAP_H);

    // Fill everything dark, then clear revealed cells
    fogCtx.fillStyle = "rgba(8,6,3,0.75)";
    fogCtx.fillRect(0, 0, MAP_W, MAP_H);
    fogCtx.globalCompositeOperation = "destination-out";

    for (const idx of fog) {
      const cellX = idx % FOG_GRID_W;
      const cellY = Math.floor(idx / FOG_GRID_W);
      // Use a soft circle for smooth edges
      const cx = cellX * FOG_CELL_SIZE + FOG_CELL_SIZE / 2;
      const cy = cellY * FOG_CELL_SIZE + FOG_CELL_SIZE / 2;
      const grad = fogCtx.createRadialGradient(cx, cy, 0, cx, cy, FOG_CELL_SIZE);
      grad.addColorStop(0, "rgba(0,0,0,1)");
      grad.addColorStop(1, "rgba(0,0,0,0.5)");
      fogCtx.fillStyle = grad;
      fogCtx.fillRect(cellX * FOG_CELL_SIZE, cellY * FOG_CELL_SIZE, FOG_CELL_SIZE, FOG_CELL_SIZE);
    }

    fogCtx.globalCompositeOperation = "source-over";
    ctx.drawImage(this._fogCanvas, 0, 0);
  }

  // ---------------------------------------------------------------------------
  // Deployment panel, terrain, flanking & enhanced battle launch
  // ---------------------------------------------------------------------------

  private _showDeploymentPanel(callback: () => void): void {
    this._removeDeploymentPanel();
    const panel = document.createElement("div");
    this._deploymentPanel = panel;
    Object.assign(panel.style, {
      position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
      width: "520px", maxHeight: "80vh", overflowY: "auto",
      background: "rgba(15,12,8,0.97)", border: "2px solid #daa520",
      borderRadius: "8px", padding: "24px", zIndex: "10000",
      color: "#e8dcc8", fontFamily: "'Cinzel',serif",
      boxShadow: "0 0 40px rgba(0,0,0,0.8), inset 0 0 20px rgba(218,165,32,0.05)",
    });

    const title = document.createElement("h2");
    title.textContent = "Deploy Your Forces";
    Object.assign(title.style, { textAlign: "center", color: "#daa520", margin: "0 0 16px", fontSize: "20px" });
    panel.appendChild(title);

    const formations: { id: "line" | "wedge" | "flanking" | "defensive"; label: string; desc: string; diagram: string }[] = [
      { id: "line", label: "Line Formation", desc: "Ranks of soldiers in orderly rows. Balanced offense and defense.",
        diagram: "  xxxxxxxxxx\n  xxxxxxxxxx\n  xxxxxxxxxx" },
      { id: "wedge", label: "Wedge Formation", desc: "V-shape charge. Melee leads, ranged supports from behind.",
        diagram: "      x\n     xxx\n    xxxxx\n   rrr rrr" },
      { id: "flanking", label: "Flanking Formation", desc: "Two groups on left and right. Envelop the enemy.",
        diagram: "  xxxx      xxxx\n  xxxx      xxxx\n  xxxx      xxxx" },
      { id: "defensive", label: "Defensive Circle", desc: "Tight rings with archers in center. Maximum protection.",
        diagram: "    xxxxx\n   x rrr x\n   x rrr x\n    xxxxx" },
    ];

    let selected = this._deploymentFormation;

    const optionEls: HTMLDivElement[] = [];
    for (const f of formations) {
      const opt = document.createElement("div");
      Object.assign(opt.style, {
        border: f.id === selected ? "2px solid #daa520" : "1px solid #5a4a2a",
        borderRadius: "6px", padding: "12px", marginBottom: "10px", cursor: "pointer",
        background: f.id === selected ? "rgba(218,165,32,0.12)" : "rgba(30,24,16,0.6)",
        transition: "border-color 0.2s, background 0.2s",
      });
      opt.innerHTML = `<div style="font-size:15px;color:#daa520;font-weight:bold;margin-bottom:4px">${f.label}</div>` +
        `<div style="font-size:12px;color:#b0a080;margin-bottom:8px">${f.desc}</div>` +
        `<pre style="font-size:11px;color:#8a7a5a;margin:0;line-height:1.3;font-family:monospace">${f.diagram}</pre>`;
      opt.addEventListener("click", () => {
        selected = f.id;
        optionEls.forEach((el, i) => {
          const isSel = formations[i].id === selected;
          el.style.border = isSel ? "2px solid #daa520" : "1px solid #5a4a2a";
          el.style.background = isSel ? "rgba(218,165,32,0.12)" : "rgba(30,24,16,0.6)";
        });
      });
      optionEls.push(opt);
      panel.appendChild(opt);
    }

    const terrainLabel = this._getBattleTerrain();
    if (terrainLabel) {
      const tDiv = document.createElement("div");
      tDiv.textContent = `Terrain: ${terrainLabel}`;
      Object.assign(tDiv.style, { textAlign: "center", color: "#8a7a5a", fontSize: "13px", margin: "8px 0" });
      panel.appendChild(tDiv);
    }

    const btnRow = document.createElement("div");
    Object.assign(btnRow.style, { display: "flex", gap: "12px", justifyContent: "center", marginTop: "16px" });

    const makeBtn = (text: string, gold: boolean) => {
      const btn = document.createElement("button");
      btn.textContent = text;
      Object.assign(btn.style, {
        padding: "8px 28px", fontSize: "14px", fontFamily: "'Cinzel',serif", cursor: "pointer",
        border: gold ? "2px solid #daa520" : "1px solid #5a4a2a", borderRadius: "4px",
        background: gold ? "rgba(218,165,32,0.2)" : "rgba(40,32,20,0.8)",
        color: gold ? "#daa520" : "#8a7a5a",
      });
      btn.addEventListener("mouseenter", () => { btn.style.background = gold ? "rgba(218,165,32,0.35)" : "rgba(60,48,30,0.8)"; });
      btn.addEventListener("mouseleave", () => { btn.style.background = gold ? "rgba(218,165,32,0.2)" : "rgba(40,32,20,0.8)"; });
      return btn;
    };

    const confirmBtn = makeBtn("March to Battle", true);
    confirmBtn.addEventListener("click", () => {
      this._deploymentFormation = selected;
      this._removeDeploymentPanel();
      callback();
    });

    const cancelBtn = makeBtn("Cancel", false);
    cancelBtn.addEventListener("click", () => {
      this._removeDeploymentPanel();
      if (this._state) { this._state.paused = false; this._inBattle = false; }
    });

    btnRow.appendChild(confirmBtn);
    btnRow.appendChild(cancelBtn);
    panel.appendChild(btnRow);
    document.body.appendChild(panel);
  }

  private _removeDeploymentPanel(): void {
    if (this._deploymentPanel) { this._deploymentPanel.remove(); this._deploymentPanel = null; }
  }

  private _getDeploymentPositions(
    count: number, formation: string, team: "player" | "enemy", halfW: number,
  ): { x: number; z: number }[] {
    const positions: { x: number; z: number }[] = [];
    const sign = team === "player" ? 1 : -1;
    const baseZ = sign * 12;

    const clampX = (x: number) => Math.max(-halfW + 2, Math.min(halfW - 2, x));

    if (formation === "wedge") {
      // V-shape: row 0 has 1 unit, row 1 has 3, row 2 has 5, etc.
      let placed = 0;
      let row = 0;
      while (placed < count) {
        const unitsInRow = row * 2 + 1;
        for (let c = 0; c < unitsInRow && placed < count; c++) {
          const x = (c - (unitsInRow - 1) / 2) * 2.5;
          const z = baseZ + sign * row * 2.5;
          positions.push({ x: clampX(x), z });
          placed++;
        }
        row++;
      }
    } else if (formation === "flanking") {
      // Split into two groups, left and right
      const leftCount = Math.ceil(count / 2);
      const rightCount = count - leftCount;
      const groupOffsetX = 10;
      // Left group
      for (let i = 0; i < leftCount; i++) {
        const row = Math.floor(i / 5);
        const col = i % 5;
        const x = -groupOffsetX + (col - 2) * 2.5;
        const z = baseZ + sign * row * 2.5;
        positions.push({ x: clampX(x), z });
      }
      // Right group
      for (let i = 0; i < rightCount; i++) {
        const row = Math.floor(i / 5);
        const col = i % 5;
        const x = groupOffsetX + (col - 2) * 2.5;
        const z = baseZ + sign * row * 2.5;
        positions.push({ x: clampX(x), z });
      }
    } else if (formation === "defensive") {
      // Concentric rings with tight spacing
      const ringSpacing = 2.0;
      let placed = 0;
      let ring = 0;
      while (placed < count) {
        if (ring === 0) {
          // Center cluster (archers/ranged)
          const centerCount = Math.min(count, 4);
          for (let i = 0; i < centerCount && placed < count; i++) {
            const angle = (i / centerCount) * Math.PI * 2;
            const x = Math.cos(angle) * 1.2;
            const z = baseZ + Math.sin(angle) * 1.2;
            positions.push({ x: clampX(x), z });
            placed++;
          }
        } else {
          const circumference = 2 * Math.PI * ring * ringSpacing;
          const unitsInRing = Math.min(Math.floor(circumference / 2.0), count - placed);
          for (let i = 0; i < unitsInRing && placed < count; i++) {
            const angle = (i / unitsInRing) * Math.PI * 2;
            const radius = ring * ringSpacing;
            const x = Math.cos(angle) * radius;
            const z = baseZ + Math.sin(angle) * radius;
            positions.push({ x: clampX(x), z });
            placed++;
          }
        }
        ring++;
        if (ring > 20) break; // safety
      }
    } else {
      // "line" (default): Rows of 10, spacing 2.5
      for (let i = 0; i < count; i++) {
        const row = Math.floor(i / 10);
        const col = i % 10;
        const x = (col - 4.5) * 2.5;
        const z = baseZ + sign * row * 2.5;
        positions.push({ x: clampX(x), z });
      }
    }

    return positions;
  }

  private _getBattleTerrain(): string | null {
    if (!this._state) return null;
    const px = this._state.playerParty.x;
    const py = this._state.playerParty.y;
    const result = _getTerrainAt(px, py, this._state.terrain);
    if (result) {
      this._battleTerrainType = result.name;
      return result.name;
    }
    this._battleTerrainType = null;
    return "plains";
  }

  private _calculateFlankingBonus(playerParty: CampaignParty, enemyParty: CampaignParty): number {
    // Compute approach angle relative to enemy heading
    const dx = playerParty.x - enemyParty.x;
    const dy = playerParty.y - enemyParty.y;
    const approachAngle = Math.atan2(dy, dx); // angle from enemy to player

    // Enemy heading: use explicit heading, or derive from movement direction
    let enemyHeading: number;
    if (enemyParty.heading != null) {
      enemyHeading = enemyParty.heading;
    } else {
      const edx = enemyParty.targetX - enemyParty.x;
      const edy = enemyParty.targetY - enemyParty.y;
      enemyHeading = Math.atan2(edy, edx);
    }

    // The enemy "faces" along enemyHeading. Their back is enemyHeading + PI.
    // Angle difference between approach and enemy's back
    const backAngle = enemyHeading + Math.PI;
    let diff = approachAngle - backAngle;
    // Normalize to [-PI, PI]
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    const absDiff = Math.abs(diff);

    // 0 diff = perfect rear attack (max bonus 0.3)
    // PI/2 diff = side attack (partial bonus ~0.15)
    // PI diff = frontal (0 bonus)
    const bonus = Math.max(0, 0.3 * (1 - absDiff / Math.PI));
    return bonus;
  }

  private _startPartyBattleWithDeployment(enemy: CampaignParty): void {
    if (!this._state || this._inBattle) return;
    this._inBattle = true;
    this._state.paused = true;
    this._battleEnemyPartyId = enemy.id;
    this._battleEnemyCityId = null;
    this._battleLocationId = null;
    this._battlePlayerArmy = this._state.playerParty.army.map((a) => ({ ...a }));
    this._battleEnemyArmy = enemy.army.map((a) => ({ ...a }));

    // Calculate flanking bonus and store on state
    const flank = this._calculateFlankingBonus(this._state.playerParty, enemy);
    this._state.flankingBonus = flank;
    if (flank > 0.05) {
      this._addLog(`Flanking bonus: +${Math.round(flank * 100)}% damage advantage!`);
    }

    this._addLog(`Battle! Your warband (${this._state.playerParty.armyTotal}) vs ${enemy.name} (${enemy.armyTotal})`);

    // Show deployment panel, then launch battle on confirm
    this._showDeploymentPanel(() => {
      this._launchBattle();
    });
  }

  // ---------------------------------------------------------------------------
  // Battle preview panel
  // ---------------------------------------------------------------------------

  private _showBattlePreview(enemy: CampaignParty): void {
    if (!this._state) return;
    this._removeBattlePreview();
    this._setCanvasPointerEvents(false);

    const factionDef = CAMPAIGN_FACTIONS.find(f => f.id === enemy.factionId);
    const factionColor = factionDef ? `#${factionDef.accentColor.toString(16).padStart(6, "0")}` : "#888";
    const diff = _estimateDifficulty(this._state.playerParty.armyTotal, enemy.armyTotal);

    // Build enemy composition display
    const compHTML = enemy.army.map(a => {
      const uDef = CAMPAIGN_UNITS.find(u => u.id === a.unitId);
      return `<span style="margin-right:8px;color:#ccc">${uDef?.name ?? a.unitId} x${a.count}</span>`;
    }).join("");

    this._battlePreviewPanel = document.createElement("div");
    this._battlePreviewPanel.style.cssText = `
      position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
      width:440px;max-height:60vh;overflow-y:auto;
      background:rgba(15,12,8,0.97);border:2px solid ${factionColor};border-radius:10px;
      padding:24px;z-index:10;
    `;

    this._battlePreviewPanel.innerHTML = `
      <div style="margin-bottom:12px">
        <h3 style="color:#cc4444;margin:0;font-size:20px">ENEMY APPROACHING!</h3>
        <div style="color:${factionColor};font-size:13px;margin-top:4px">${enemy.name} (${factionDef?.name ?? enemy.factionId})</div>
      </div>
      <div style="margin-bottom:12px;border:1px solid #332211;border-radius:6px;padding:10px;background:rgba(30,25,15,0.5)">
        <div style="color:#998877;font-size:11px;margin-bottom:6px">ENEMY COMPOSITION (${enemy.armyTotal} units)</div>
        <div style="font-size:12px;line-height:1.6">${compHTML}</div>
      </div>
      <div style="margin-bottom:16px;display:flex;justify-content:space-between;align-items:center">
        <div>
          <span style="color:#998877;font-size:12px">Your army: </span>
          <span style="color:#ddeebb;font-size:13px;font-weight:bold">${this._state.playerParty.armyTotal} units</span>
        </div>
        <div style="padding:4px 12px;border-radius:4px;border:1px solid ${diff.color};color:${diff.color};font-size:13px;font-weight:bold;background:rgba(0,0,0,0.3)">
          ${diff.label}
        </div>
      </div>
      <div style="display:flex;gap:12px">
        <button id="camp-preview-fight" style="
          flex:1;padding:12px;font-size:15px;font-weight:bold;
          border:2px solid #cc4444;border-radius:6px;
          background:rgba(204,68,68,0.2);color:#ff6666;
          cursor:pointer;font-family:inherit;
        ">Fight!</button>
        <button id="camp-preview-retreat" style="
          flex:1;padding:12px;font-size:15px;font-weight:bold;
          border:2px solid #888;border-radius:6px;
          background:rgba(80,80,80,0.2);color:#aaa;
          cursor:pointer;font-family:inherit;
        ">Retreat</button>
      </div>
      <div style="color:#776655;font-size:10px;margin-top:8px;text-align:center">
        Retreating incurs a speed penalty for 5 seconds.
      </div>
    `;

    this._container!.appendChild(this._battlePreviewPanel);

    document.getElementById("camp-preview-fight")?.addEventListener("click", () => {
      const enemyRef = this._state?.battlePreviewEnemy;
      this._removeBattlePreview();
      if (this._state) this._state.battlePreviewEnemy = null;
      if (enemyRef) this._startPartyBattleWithDeployment(enemyRef);
    });

    document.getElementById("camp-preview-retreat")?.addEventListener("click", () => {
      this._removeBattlePreview();
      if (this._state) {
        this._state.battlePreviewEnemy = null;
        this._state.paused = false;
        // Apply retreat speed penalty (5 seconds * 60 fps = 300 ticks)
        this._state.playerParty.retreatPenaltyUntilTick = this._state.tick + 300;
        // Move player away from enemy
        const enemy = this._state.parties.find(p =>
          p.factionId !== this._state!.playerFaction &&
          Math.hypot(p.x - this._state!.playerParty.x, p.y - this._state!.playerParty.y) < 60,
        );
        if (enemy) {
          const angle = Math.atan2(this._state.playerParty.y - enemy.y, this._state.playerParty.x - enemy.x);
          this._state.playerParty.targetX = Math.max(20, Math.min(MAP_W - 20, this._state.playerParty.x + Math.cos(angle) * 120));
          this._state.playerParty.targetY = Math.max(20, Math.min(MAP_H - 20, this._state.playerParty.y + Math.sin(angle) * 120));
        }
        this._addLog("You retreated from the enemy. Speed penalty applied.");
      }
    });
  }

  private _removeBattlePreview(): void {
    if (this._battlePreviewPanel?.parentNode) {
      this._battlePreviewPanel.parentNode.removeChild(this._battlePreviewPanel);
      this._battlePreviewPanel = null;
    }
    this._setCanvasPointerEvents(true);
  }

  // ---------------------------------------------------------------------------
  // Caravans
  // ---------------------------------------------------------------------------

  private _updateCaravans(): void {
    if (!this._state) return;
    for (const caravan of this._state.caravans) {
      const target = this._state.cities.find(c => c.id === caravan.targetCityId);
      if (!target) continue;
      const dx = target.x - caravan.x;
      const dy = target.y - caravan.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 15) {
        // Arrived, pick new destination
        caravan.originCityId = caravan.targetCityId;
        let newTarget: CampaignCity;
        do {
          newTarget = this._state.cities[Math.floor(Math.random() * this._state.cities.length)];
        } while (newTarget.id === caravan.targetCityId && this._state.cities.length > 1);
        caravan.targetCityId = newTarget.id;
      } else {
        caravan.x += (dx / dist) * caravan.speed;
        caravan.y += (dy / dist) * caravan.speed;
      }
    }
  }

  private _showCaravanPanel(caravan: CampaignCaravan): void {
    if (!this._state) return;
    this._removeCaravanPanel();
    this._state.paused = true;
    this._setCanvasPointerEvents(false);

    this._caravanPanel = document.createElement("div");
    this._caravanPanel.style.cssText = `
      position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
      width:380px;max-height:60vh;overflow-y:auto;
      background:rgba(15,12,8,0.97);border:2px solid #aa8844;border-radius:10px;
      padding:20px;z-index:10;
    `;

    const goodsHTML = caravan.goods.map(g =>
      `<div style="display:flex;justify-content:space-between;padding:4px 8px;margin-bottom:3px;background:rgba(30,25,15,0.6);border-radius:4px;border:1px solid #332211">
        <span style="color:#ccc">${g.name}</span>
        <div style="display:flex;gap:8px;align-items:center">
          <span style="color:#aa8833;font-size:11px">${g.cost}g</span>
          <button class="camp-buy-good" data-name="${g.name}" data-cost="${g.cost}" style="
            padding:2px 8px;font-size:10px;border:1px solid ${this._state!.gold >= g.cost ? "#daa520" : "#444"};
            border-radius:3px;background:${this._state!.gold >= g.cost ? "rgba(218,165,32,0.2)" : "rgba(20,15,10,0.6)"};
            color:${this._state!.gold >= g.cost ? "#daa520" : "#555"};cursor:${this._state!.gold >= g.cost ? "pointer" : "not-allowed"};
            font-family:inherit;
          " ${this._state!.gold >= g.cost ? "" : "disabled"}>Buy</button>
        </div>
      </div>`,
    ).join("");

    this._caravanPanel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <h3 style="color:#aa8844;margin:0">Merchant Caravan</h3>
        <button id="camp-close-caravan" style="
          padding:4px 12px;font-size:14px;border:1px solid #555;border-radius:4px;
          background:rgba(30,25,15,0.6);color:#888;cursor:pointer;font-family:inherit;
        ">X</button>
      </div>
      <div style="color:#998877;font-size:12px;margin-bottom:8px">A traveling merchant with goods to trade.</div>
      <div style="margin-bottom:12px">
        <div style="color:#daa520;font-size:12px;margin-bottom:6px">TRADE GOODS</div>
        ${goodsHTML}
      </div>
      <button id="camp-rob-caravan" style="
        margin-top:8px;padding:8px 16px;font-size:12px;font-weight:bold;
        border:2px solid #cc4444;border-radius:6px;
        background:rgba(204,68,68,0.15);color:#cc6666;
        cursor:pointer;font-family:inherit;width:100%;
      ">Rob Caravan (lose reputation)</button>
    `;

    this._container!.appendChild(this._caravanPanel);

    document.getElementById("camp-close-caravan")?.addEventListener("click", () => {
      this._removeCaravanPanel();
      if (this._state) this._state.paused = false;
    });

    // Buy buttons
    this._caravanPanel.querySelectorAll(".camp-buy-good").forEach(btn => {
      btn.addEventListener("click", () => {
        const cost = parseInt((btn as HTMLElement).dataset.cost ?? "0");
        const name = (btn as HTMLElement).dataset.name ?? "goods";
        if (this._state && this._state.gold >= cost) {
          this._state.gold -= cost;
          this._addLog(`Bought ${name} from caravan for ${cost}g.`);
          // Goods give a small bonus (gold value, treated as trade profit next day)
          this._state.gold += Math.floor(cost * 0.3);
          this._addLog(`Sold ${name} for a profit of ${Math.floor(cost * 0.3)}g.`);
          this._showCaravanPanel(caravan); // refresh
        }
      });
    });

    document.getElementById("camp-rob-caravan")?.addEventListener("click", () => {
      if (!this._state) return;
      const totalGoods = caravan.goods.reduce((s, g) => s + g.cost, 0);
      this._state.gold += totalGoods;
      this._addLog(`Robbed caravan for ${totalGoods}g! Your reputation suffers.`);
      // Lose reputation with all factions
      for (const [fId] of this._state.factionRelations) {
        if (fId !== this._state.playerFaction) {
          this._modRelation(this._state.playerFaction, fId, -15);
        }
      }
      // Remove caravan
      this._state.caravans = this._state.caravans.filter(c => c.id !== caravan.id);
      this._removeCaravanPanel();
      this._state.paused = false;
    });
  }

  private _removeCaravanPanel(): void {
    if (this._caravanPanel?.parentNode) {
      this._caravanPanel.parentNode.removeChild(this._caravanPanel);
      this._caravanPanel = null;
    }
    this._setCanvasPointerEvents(true);
  }

  // ---------------------------------------------------------------------------
  // Wandering NPCs
  // ---------------------------------------------------------------------------

  private _updateWanderingNPCs(): void {
    if (!this._state) return;
    // Move NPCs toward their targets
    for (const npc of this._state.wanderingNPCs) {
      if (npc.interacted) continue;
      const dx = npc.targetX - npc.x;
      const dy = npc.targetY - npc.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 5) {
        npc.targetX = 80 + Math.random() * (MAP_W - 160);
        npc.targetY = 80 + Math.random() * (MAP_H - 160);
      } else {
        npc.x += (dx / dist) * npc.speed;
        npc.y += (dy / dist) * npc.speed;
      }
    }
    // Respawn NPCs after 20 days
    const activeNPCs = this._state.wanderingNPCs.filter(n => !n.interacted);
    if (activeNPCs.length === 0 && this._state.day > 5) {
      this._state.wanderingNPCs = _generateWanderingNPCs(this._state.day);
    }
  }

  private _showNPCPanel(npc: CampaignWanderingNPC): void {
    if (!this._state) return;
    this._removeNPCPanel();
    this._state.paused = true;
    this._setCanvasPointerEvents(false);

    const typeColor = npc.type === "hermit" ? "#66aacc" : npc.type === "messenger" ? "#ccaa44" : "#cc8866";
    let interactText = "";
    let interactBtnLabel = "";

    if (npc.type === "hermit") {
      interactText = "The hermit offers to reveal enemy positions on the map for a brief time.";
      interactBtnLabel = "Accept Intel";
    } else if (npc.type === "messenger") {
      interactText = "A messenger carries a quest from a distant lord. Accepting may bring gold.";
      interactBtnLabel = "Accept Quest";
    } else {
      interactText = "A war refugee begs to join your warband. They can fight if given a chance.";
      interactBtnLabel = "Recruit Refugee";
    }

    this._npcPanel = document.createElement("div");
    this._npcPanel.style.cssText = `
      position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
      width:380px;max-height:60vh;overflow-y:auto;
      background:rgba(15,12,8,0.97);border:2px solid ${typeColor};border-radius:10px;
      padding:20px;z-index:10;
    `;

    this._npcPanel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <h3 style="color:${typeColor};margin:0">${npc.name}</h3>
        <button id="camp-close-npc" style="
          padding:4px 12px;font-size:14px;border:1px solid #555;border-radius:4px;
          background:rgba(30,25,15,0.6);color:#888;cursor:pointer;font-family:inherit;
        ">X</button>
      </div>
      <div style="color:#998877;font-size:12px;margin-bottom:6px;text-transform:capitalize">${npc.type}</div>
      <div style="color:#ccc;font-size:12px;margin-bottom:16px">${interactText}</div>
      <button id="camp-npc-interact" style="
        padding:10px 20px;font-size:13px;font-weight:bold;
        border:2px solid ${typeColor};border-radius:6px;
        background:rgba(${npc.type === "hermit" ? "100,170,200" : npc.type === "messenger" ? "200,170,70" : "200,130,100"},0.15);
        color:${typeColor};cursor:pointer;font-family:inherit;width:100%;
      ">${interactBtnLabel}</button>
    `;

    this._container!.appendChild(this._npcPanel);

    document.getElementById("camp-close-npc")?.addEventListener("click", () => {
      this._removeNPCPanel();
      if (this._state) this._state.paused = false;
    });

    document.getElementById("camp-npc-interact")?.addEventListener("click", () => {
      if (!this._state) return;
      npc.interacted = true;

      if (npc.type === "hermit") {
        // Reveal all enemy party positions briefly (reveal fog around them)
        for (const party of this._state.parties) {
          if (party.factionId !== this._state.playerFaction) {
            _revealFog(this._state.fogRevealed, party.x, party.y, 60);
          }
        }
        this._addLog("The hermit revealed enemy positions on your map!");
      } else if (npc.type === "messenger") {
        // Give gold quest reward
        const reward = 200 + Math.floor(Math.random() * 300);
        this._state.gold += reward;
        this._addLog(`The messenger delivered a reward of ${reward}g!`);
      } else {
        // Recruit a free unit
        const freeUnit = CAMPAIGN_UNITS[Math.floor(Math.random() * 5)]; // tier 1-2
        const existing = this._state.playerParty.army.find(a => a.unitId === freeUnit.id && a.xp === 0);
        if (existing) {
          existing.count++;
        } else {
          this._state.playerParty.army.push({ unitId: freeUnit.id, count: 1, xp: 0 });
        }
        this._state.playerParty.armyTotal++;
        this._addLog(`Recruited a ${freeUnit.name} from the refugee!`);
      }

      this._removeNPCPanel();
      this._state.paused = false;
    });
  }

  private _removeNPCPanel(): void {
    if (this._npcPanel?.parentNode) {
      this._npcPanel.parentNode.removeChild(this._npcPanel);
      this._npcPanel = null;
    }
    this._setCanvasPointerEvents(true);
  }

  // ---------------------------------------------------------------------------
  // Campaign events
  // ---------------------------------------------------------------------------

  private _checkCampaignEvents(): void {
    if (!this._state) return;
    const s = this._state;
    if (s.day < EVENT_MIN_DAY) return;
    if (s.tick % DAY_TICKS !== 0) return; // only check at day boundaries
    if (s.day - s.lastEventDay < EVENT_CHECK_INTERVAL) return;
    if (Math.random() > 0.6) return; // 60% chance each eligible day

    s.lastEventDay = s.day;
    const eventTypes: CampaignEventType[] = ["bandit_raid", "merchant_festival", "plague", "deserters", "alliance_offer"];
    const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const evtId = `evt_${s.day}_${Math.random().toString(36).slice(2, 6)}`;

    let evt: CampaignEvent | null = null;

    if (type === "bandit_raid") {
      // Pick a random village's linked city
      const villages = s.villages.filter(v => v.factionId !== s.playerFaction || Math.random() < 0.3);
      if (villages.length > 0) {
        const village = villages[Math.floor(Math.random() * villages.length)];
        evt = {
          id: evtId, type, name: "Bandit Raid",
          description: `Bandits are raiding ${village.name}! Intervene to gain reputation.`,
          mapX: village.x, mapY: village.y,
          startDay: s.day, duration: 3, active: true,
          data: { villageId: village.id },
        };
        this._addLog(`EVENT: Bandits are raiding ${village.name}!`);
      }
    } else if (type === "merchant_festival") {
      const playerCities = s.cities.filter(c => c.factionId === s.playerFaction);
      const city = playerCities.length > 0 ? playerCities[Math.floor(Math.random() * playerCities.length)]
        : s.cities[Math.floor(Math.random() * s.cities.length)];
      evt = {
        id: evtId, type, name: "Merchant Festival",
        description: `${city.name} is holding a merchant festival! Recruitment costs halved for 3 days.`,
        targetCityId: city.id,
        startDay: s.day, duration: 3, active: true,
      };
      this._addLog(`EVENT: Merchant Festival at ${city.name}! Recruitment discounted for 3 days.`);
    } else if (type === "plague") {
      const city = s.cities[Math.floor(Math.random() * s.cities.length)];
      evt = {
        id: evtId, type, name: "Plague",
        description: `A plague has struck ${city.name}! Garrison losing troops over 5 days.`,
        targetCityId: city.id,
        startDay: s.day, duration: 5, active: true,
      };
      // Immediately lose some garrison
      const loss = Math.ceil(city.garrisonTotal * 0.2);
      let remaining = loss;
      for (const slot of city.garrison) {
        const lose = Math.min(slot.count, Math.ceil(remaining * slot.count / Math.max(1, city.garrisonTotal)));
        slot.count -= lose;
        remaining -= lose;
      }
      city.garrison = city.garrison.filter(g => g.count > 0);
      city.garrisonTotal = city.garrison.reduce((sum, g) => sum + g.count, 0);
      this._addLog(`EVENT: Plague strikes ${city.name}! Garrison lost ${loss} troops.`);
    } else if (type === "deserters") {
      const x = 80 + Math.random() * (MAP_W - 160);
      const y = 80 + Math.random() * (MAP_H - 160);
      evt = {
        id: evtId, type, name: "Deserters Spotted",
        description: "A group of deserters has been spotted. They can be recruited for free!",
        mapX: x, mapY: y,
        startDay: s.day, duration: 5, active: true,
      };
      // Add a special location-like marker (we'll handle via event interaction)
      this._addLog("EVENT: Deserters spotted on the map! Move nearby to recruit them.");
    } else if (type === "alliance_offer") {
      const hostileFactions = this._getNonPlayerFactions().filter(fId =>
        this._getRelationStatus(s.playerFaction, fId) === "hostile" ||
        this._getRelationStatus(s.playerFaction, fId) === "neutral",
      );
      if (hostileFactions.length > 0) {
        const fId = hostileFactions[Math.floor(Math.random() * hostileFactions.length)];
        const fDef = CAMPAIGN_FACTIONS.find(f => f.id === fId);
        evt = {
          id: evtId, type, name: "Alliance Offer",
          description: `${fDef?.name ?? fId} proposes an alliance with your faction!`,
          startDay: s.day, duration: 5, active: true,
          data: { factionId: fId },
        };
        this._addLog(`EVENT: ${fDef?.name ?? fId} proposes an alliance!`);
        // Auto-improve relations slightly
        this._modRelation(s.playerFaction, fId, 25);
      }
    }

    if (evt) {
      s.events.push(evt);
      this._showEventPopup(evt);
    }
  }

  private _showEventPopup(evt: CampaignEvent): void {
    this._removeEventPopup();

    this._eventPopup = document.createElement("div");
    const popupColor = evt.type === "bandit_raid" ? "#cc4444" : evt.type === "merchant_festival" ? "#44cc44" : evt.type === "plague" ? "#aa44aa" : evt.type === "deserters" ? "#6688cc" : "#ccaa44";
    this._eventPopup.style.cssText = `
      position:absolute;top:60px;left:50%;transform:translateX(-50%);
      padding:14px 24px;border:2px solid ${popupColor};border-radius:8px;
      background:rgba(15,12,8,0.95);z-index:15;
      font-family:'Segoe UI',sans-serif;color:#e0d5c0;
      max-width:400px;text-align:center;
      animation: fadeInDown 0.3s ease;
    `;
    this._eventPopup.innerHTML = `
      <div style="color:${popupColor};font-weight:bold;font-size:14px;margin-bottom:4px">${evt.name}</div>
      <div style="font-size:12px;color:#aa9977">${evt.description}</div>
    `;
    this._container?.appendChild(this._eventPopup);

    // Auto-remove after 4 seconds
    this._eventPopupTimeout = setTimeout(() => {
      this._removeEventPopup();
    }, 4000);
  }

  private _removeEventPopup(): void {
    if (this._eventPopupTimeout) {
      clearTimeout(this._eventPopupTimeout);
      this._eventPopupTimeout = null;
    }
    if (this._eventPopup?.parentNode) {
      this._eventPopup.parentNode.removeChild(this._eventPopup);
      this._eventPopup = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private _addLog(msg: string): void {
    if (!this._state) return;
    this._state.log.push(`Day ${this._state.day} — ${msg}`);
    if (this._state.log.length > 50) this._state.log.shift();
  }

  // ---------------------------------------------------------------------------
  // AI auto-resolve helpers
  // ---------------------------------------------------------------------------

  private _autoResolvePartyBattle(a: CampaignParty, b: CampaignParty): void {
    if (!this._state) return;
    const aTotal = a.armyTotal;
    const bTotal = b.armyTotal;
    const total = aTotal + bTotal;
    if (total === 0) return;

    // Side with more troops wins, proportional survival
    const aWins = aTotal >= bTotal;
    const winner = aWins ? a : b;
    const loser = aWins ? b : a;
    const ratio = Math.min(winner.armyTotal, loser.armyTotal) / Math.max(winner.armyTotal, loser.armyTotal);
    const survivalRate = Math.max(0.3, 1 - ratio * 0.7);

    // Reduce winner's army
    for (const slot of winner.army) {
      slot.count = Math.max(1, Math.round(slot.count * survivalRate));
    }
    winner.armyTotal = winner.army.reduce((s, a) => s + a.count, 0);

    // Remove loser
    this._state.parties = this._state.parties.filter((p) => p.id !== loser.id);

    // Find nearest city for location context
    let nearCity = "";
    let nearDist = Infinity;
    for (const c of this._state.cities) {
      const d = Math.hypot(c.x - a.x, c.y - a.y);
      if (d < nearDist) { nearDist = d; nearCity = c.name; }
    }
    this._addLog(`${winner.name} defeated ${loser.name} near ${nearCity}`);
  }

  private _autoResolveCitySiege(attacker: CampaignParty, city: CampaignCity): void {
    if (!this._state) return;
    // Attacker needs 1.5x garrison to capture
    if (attacker.armyTotal < city.garrisonTotal * 1.5) return;

    const oldFaction = city.factionId;
    // Reduce attacker proportionally
    const losses = Math.min(attacker.armyTotal - 1, Math.round(city.garrisonTotal * 0.8));
    let remaining = losses;
    for (const slot of attacker.army) {
      const lose = Math.min(slot.count - 1, Math.round(remaining * slot.count / attacker.armyTotal));
      slot.count -= lose;
      remaining -= lose;
    }
    attacker.army = attacker.army.filter((s) => s.count > 0);
    attacker.armyTotal = attacker.army.reduce((s, a) => s + a.count, 0);

    // Capture city
    city.factionId = attacker.factionId;
    const newGarrisonSize = Math.min(5, attacker.armyTotal);
    city.garrison = _generateGarrison(attacker.factionId, newGarrisonSize);
    city.garrisonTotal = city.garrison.reduce((s, g) => s + g.count, 0);

    // Flip linked villages
    for (const v of this._state.villages) {
      if (v.linkedCityId === city.id) {
        v.factionId = attacker.factionId;
      }
    }

    const factionDef = CAMPAIGN_FACTIONS.find((f) => f.id === attacker.factionId);
    const oldDef = CAMPAIGN_FACTIONS.find((f) => f.id === oldFaction);
    this._addLog(`${factionDef?.name ?? attacker.factionId} captured ${city.name} from ${oldDef?.name ?? oldFaction}!`);

    // Update diplomacy
    this._modRelation(attacker.factionId, oldFaction, -40);
  }

  private _checkFactionElimination(): void {
    if (!this._state) return;
    for (const faction of CAMPAIGN_FACTIONS) {
      if (faction.id === this._state.playerFaction) continue;
      const hasCities = this._state.cities.some((c) => c.factionId === faction.id);
      const hasParties = this._state.parties.some((p) => p.factionId === faction.id);
      if (!hasCities && !hasParties) {
        // Check if faction was recently eliminated (avoid repeated logs)
        const elimMsg = `${faction.name} has been eliminated!`;
        if (!this._state.log.some((l) => l.includes(elimMsg))) {
          this._addLog(elimMsg);
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Diplomacy helpers
  // ---------------------------------------------------------------------------

  /** Get the relation score between two factions (-100 to +100). */
  private _getRelation(factionA: string, factionB: string): number {
    if (!this._state || factionA === factionB) return 100;
    return this._state.factionRelations.get(factionA)?.get(factionB) ?? 0;
  }

  /** Modify the relation score between two factions by delta, clamped to [-100, +100]. Symmetric. */
  private _modRelation(factionA: string, factionB: string, delta: number): void {
    if (!this._state || factionA === factionB) return;
    const rel = this._state.factionRelations;
    // A -> B
    const mapA = rel.get(factionA);
    if (mapA) {
      mapA.set(factionB, Math.max(-100, Math.min(100, (mapA.get(factionB) ?? 0) + delta)));
    }
    // B -> A
    const mapB = rel.get(factionB);
    if (mapB) {
      mapB.set(factionA, Math.max(-100, Math.min(100, (mapB.get(factionA) ?? 0) + delta)));
    }
  }

  /** Returns "hostile" (below -30), "neutral" (-30 to +30), or "friendly" (above +30). */
  private _getRelationStatus(factionA: string, factionB: string): "hostile" | "neutral" | "friendly" {
    const r = this._getRelation(factionA, factionB);
    if (r < -30) return "hostile";
    if (r > 30) return "friendly";
    return "neutral";
  }

  /** Get a CSS color for a relation value: red=hostile, yellow=neutral, green=friendly. */
  private _relationColor(value: number): string {
    if (value < -30) {
      // Red gradient
      const t = Math.max(0, Math.min(1, (value + 100) / 70));
      return `rgb(${Math.round(180 + 75 * (1 - t))},${Math.round(40 * t)},${Math.round(40 * t)})`;
    }
    if (value > 30) {
      // Green gradient
      const t = Math.max(0, Math.min(1, (value - 30) / 70));
      return `rgb(${Math.round(80 * (1 - t))},${Math.round(160 + 95 * t)},${Math.round(60 + 40 * t)})`;
    }
    // Yellow/neutral
    return "#ccaa44";
  }

  /** Get all faction IDs on the map (excluding player). */
  private _getNonPlayerFactions(): string[] {
    if (!this._state) return [];
    const ids = new Set<string>();
    for (const [fId] of this._state.factionRelations) {
      if (fId !== this._state.playerFaction) ids.add(fId);
    }
    return Array.from(ids);
  }

  /** Get total army strength for a faction (sum of all party armies + garrisons). */
  private _getFactionArmyTotal(factionId: string): number {
    if (!this._state) return 0;
    let total = 0;
    for (const p of this._state.parties) {
      if (p.factionId === factionId) total += p.armyTotal;
    }
    for (const c of this._state.cities) {
      if (c.factionId === factionId) total += c.garrisonTotal;
    }
    if (this._state.playerFaction === factionId) total += this._state.playerParty.armyTotal;
    return total;
  }

  /** Render small colored dots next to faction names in the top bar. */
  private _renderFactionRelationIndicators(): string {
    if (!this._state) return "";
    const factions = this._getNonPlayerFactions();
    return `<span style="display:flex;gap:4px;align-items:center;margin-left:4px">` +
      factions.map((fId) => {
        const fDef = CAMPAIGN_FACTIONS.find((f) => f.id === fId);
        const fColor = fDef ? `#${fDef.accentColor.toString(16).padStart(6, "0")}` : "#888";
        const rel = this._getRelation(this._state!.playerFaction, fId);
        const relColor = this._relationColor(rel);
        const status = this._getRelationStatus(this._state!.playerFaction, fId);
        const label = status === "hostile" ? "H" : status === "friendly" ? "F" : "N";
        return `<span title="${fDef?.name ?? fId}: ${rel > 0 ? "+" : ""}${rel} (${status})" style="
          display:inline-flex;align-items:center;gap:2px;font-size:10px;color:${fColor};cursor:default;
        "><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${relColor}"></span>${label}</span>`;
      }).join("") +
      `<span style="color:#555;font-size:10px;margin-left:2px;cursor:pointer" title="Press D for diplomacy">[D]</span></span>`;
  }

  // ---------------------------------------------------------------------------
  // Diplomacy panel (D key)
  // ---------------------------------------------------------------------------

  private _showDiplomacyPanel(): void {
    if (!this._state) return;
    this._removeDiplomacyPanel();
    this._state.paused = true;
    this._setCanvasPointerEvents(false);

    const s = this._state;
    const otherFactions = this._getNonPlayerFactions();

    this._diplomacyPanel = document.createElement("div");
    this._diplomacyPanel.style.cssText = `
      position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
      width:620px;max-height:85vh;overflow-y:auto;
      background:rgba(15,12,8,0.97);border:2px solid #daa520;border-radius:10px;
      padding:24px;z-index:10;
    `;

    let factionsHTML = "";
    for (const fId of otherFactions) {
      const fDef = CAMPAIGN_FACTIONS.find((f) => f.id === fId);
      const fColor = fDef ? `#${fDef.accentColor.toString(16).padStart(6, "0")}` : "#888";
      const rel = this._getRelation(s.playerFaction, fId);
      const status = this._getRelationStatus(s.playerFaction, fId);
      const relColor = this._relationColor(rel);
      const statusLabel = status === "hostile" ? "HOSTILE" : status === "friendly" ? "FRIENDLY" : "NEUTRAL";
      const citiesCount = s.cities.filter((c) => c.factionId === fId).length;
      const partiesCount = s.parties.filter((p) => p.factionId === fId).length;
      const theirArmy = this._getFactionArmyTotal(fId);
      const ourArmy = this._getFactionArmyTotal(s.playerFaction);

      // Relation bar: -100 to +100 mapped to 0-100% width
      const barPct = Math.max(0, Math.min(100, (rel + 100) / 2));

      // Button states
      const canGift = s.gold >= 500;
      const canDemand = ourArmy >= theirArmy * 2;
      const canAlliance = rel > 30;
      const isAtWar = status === "hostile";
      const canDeclareWar = !isAtWar;
      const canTradeAgreement = rel > 0 && !s.tradeAgreements.some(
        (ta) => (ta.factionA === s.playerFaction && ta.factionB === fId) || (ta.factionA === fId && ta.factionB === s.playerFaction)
      );
      const hasTradeAgreement = s.tradeAgreements.some(
        (ta) => (ta.factionA === s.playerFaction && ta.factionB === fId) || (ta.factionA === fId && ta.factionB === s.playerFaction)
      );

      // Captured lords from this faction
      const capturedLords = s.lords.filter((l) => l.factionId === fId && l.capturedBy === s.playerFaction);
      let ransomHTML = "";
      if (capturedLords.length > 0) {
        ransomHTML = `
          <div style="margin-top:8px;border-top:1px solid #332211;padding-top:8px">
            <div style="color:#aa8844;font-size:10px;margin-bottom:4px;letter-spacing:1px">CAPTURED LORDS</div>
            ${capturedLords.map((lord) => {
              const ransomCost = 200 + lord.level * 100;
              return `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:3px 6px;margin-bottom:2px;
                  background:rgba(20,15,10,0.5);border-radius:3px;border:1px solid #332211">
                  <span style="color:#ccc;font-size:11px">${lord.name}</span>
                  <button class="diplo-ransom-btn" data-lord="${lord.id}" data-ransom="${ransomCost}" data-faction="${fId}" style="
                    padding:2px 8px;font-size:10px;border:1px solid #daa520;border-radius:3px;
                    background:rgba(218,165,32,0.15);color:#daa520;cursor:pointer;font-family:inherit;
                  ">Ransom for ${ransomCost}g</button>
                </div>
              `;
            }).join("")}
          </div>
        `;
      }

      factionsHTML += `
        <div style="margin-bottom:14px;padding:12px;background:rgba(30,25,15,0.5);border:1px solid ${fColor};border-radius:6px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <span style="color:${fColor};font-weight:bold;font-size:14px">${fDef?.name ?? fId}</span>
            <span style="color:${relColor};font-size:12px;font-weight:bold">${statusLabel} (${rel > 0 ? "+" : ""}${rel})</span>
          </div>
          <div style="display:flex;gap:12px;font-size:11px;color:#998877;margin-bottom:8px">
            <span>Cities: ${citiesCount}</span>
            <span>Parties: ${partiesCount}</span>
            <span>Army: ${theirArmy}</span>
            ${hasTradeAgreement ? `<span style="color:#44aa88">\u2611 Trade Agreement</span>` : ""}
          </div>
          <!-- Relation bar -->
          <div style="height:8px;background:rgba(40,30,20,0.8);border-radius:4px;margin-bottom:10px;overflow:hidden;border:1px solid #332211">
            <div style="height:100%;width:${barPct}%;background:linear-gradient(90deg,#cc3333,#ccaa44 50%,#33cc33);border-radius:3px;transition:width 0.3s"></div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="diplo-gift-btn" data-faction="${fId}" style="
              padding:4px 12px;font-size:11px;border:1px solid ${canGift ? "#daa520" : "#444"};
              border-radius:4px;background:${canGift ? "rgba(218,165,32,0.15)" : "rgba(20,15,10,0.6)"};
              color:${canGift ? "#daa520" : "#555"};cursor:${canGift ? "pointer" : "not-allowed"};font-family:inherit;
            " ${canGift ? "" : "disabled"}>Send Gift (500g) +20</button>
            <button class="diplo-demand-btn" data-faction="${fId}" style="
              padding:4px 12px;font-size:11px;border:1px solid ${canDemand ? "#cc8844" : "#444"};
              border-radius:4px;background:${canDemand ? "rgba(204,136,68,0.15)" : "rgba(20,15,10,0.6)"};
              color:${canDemand ? "#cc8844" : "#555"};cursor:${canDemand ? "pointer" : "not-allowed"};font-family:inherit;
            " ${canDemand ? "" : "disabled"}>Demand Tribute</button>
            <button class="diplo-alliance-btn" data-faction="${fId}" style="
              padding:4px 12px;font-size:11px;border:1px solid ${canAlliance ? "#44cc44" : "#444"};
              border-radius:4px;background:${canAlliance ? "rgba(68,204,68,0.15)" : "rgba(20,15,10,0.6)"};
              color:${canAlliance ? "#44cc44" : "#555"};cursor:${canAlliance ? "pointer" : "not-allowed"};font-family:inherit;
            " ${canAlliance ? "" : "disabled"}>Propose Alliance (+30 req)</button>
            <button class="diplo-war-btn" data-faction="${fId}" style="
              padding:4px 12px;font-size:11px;border:1px solid ${canDeclareWar ? "#cc3333" : "#444"};
              border-radius:4px;background:${canDeclareWar ? "rgba(204,51,51,0.15)" : "rgba(20,15,10,0.6)"};
              color:${canDeclareWar ? "#cc3333" : "#555"};cursor:${canDeclareWar ? "pointer" : "not-allowed"};font-family:inherit;
            " ${canDeclareWar ? "" : "disabled"}>\u2694 Declare War</button>
            <button class="diplo-trade-btn" data-faction="${fId}" style="
              padding:4px 12px;font-size:11px;border:1px solid ${canTradeAgreement ? "#44aa88" : "#444"};
              border-radius:4px;background:${canTradeAgreement ? "rgba(68,170,136,0.15)" : "rgba(20,15,10,0.6)"};
              color:${canTradeAgreement ? "#44aa88" : "#555"};cursor:${canTradeAgreement ? "pointer" : "not-allowed"};font-family:inherit;
            " ${canTradeAgreement ? "" : "disabled"}>\uD83E\uDD1D Trade Agreement</button>
          </div>
          ${ransomHTML}
        </div>
      `;
    }

    this._diplomacyPanel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h2 style="font-size:22px;color:#daa520;margin:0;letter-spacing:1px">DIPLOMACY</h2>
        <button id="diplo-close" style="
          padding:4px 12px;font-size:14px;border:1px solid #555;border-radius:4px;
          background:rgba(30,25,15,0.6);color:#888;cursor:pointer;font-family:inherit;
        ">X</button>
      </div>
      <div style="font-size:11px;color:#776655;margin-bottom:12px">
        Hostile &lt; -30 | Neutral -30 to +30 | Friendly &gt; +30
      </div>
      ${factionsHTML}
    `;

    this._container!.appendChild(this._diplomacyPanel);

    // Bind close
    document.getElementById("diplo-close")?.addEventListener("click", () => {
      this._removeDiplomacyPanel();
      if (this._state) this._state.paused = false;
    });

    // Bind gift buttons
    this._diplomacyPanel.querySelectorAll(".diplo-gift-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const fId = (btn as HTMLElement).dataset.faction!;
        if (this._state && this._state.gold >= 500) {
          this._state.gold -= 500;
          this._modRelation(this._state.playerFaction, fId, 20);
          this._addLog(`Sent a gift to ${fId}, improving relations by +20.`);
          this._showDiplomacyPanel(); // refresh
        }
      });
    });

    // Bind demand buttons
    this._diplomacyPanel.querySelectorAll(".diplo-demand-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const fId = (btn as HTMLElement).dataset.faction!;
        if (!this._state) return;
        const theirArmy = this._getFactionArmyTotal(fId);
        const ourArmy = this._getFactionArmyTotal(this._state.playerFaction);
        if (ourArmy >= theirArmy * 2) {
          if (Math.random() < 0.5) {
            this._state.gold += 300;
            this._addLog(`${fId} paid 300g tribute out of fear!`);
          } else {
            this._modRelation(this._state.playerFaction, fId, -10);
            this._addLog(`${fId} refused your demand for tribute! Relations worsened.`);
          }
          this._showDiplomacyPanel(); // refresh
        }
      });
    });

    // Bind alliance buttons
    this._diplomacyPanel.querySelectorAll(".diplo-alliance-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const fId = (btn as HTMLElement).dataset.faction!;
        if (!this._state) return;
        const rel = this._getRelation(this._state.playerFaction, fId);
        if (rel > 30) {
          // Set relation to +80
          const currentRel = this._getRelation(this._state.playerFaction, fId);
          this._modRelation(this._state.playerFaction, fId, 80 - currentRel);
          this._addLog(`Alliance formed with ${fId}! They will not attack you.`);
          this._showDiplomacyPanel(); // refresh
        }
      });
    });

    // Bind declare war buttons
    this._diplomacyPanel.querySelectorAll(".diplo-war-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const fId = (btn as HTMLElement).dataset.faction!;
        if (!this._state) return;
        const rel = this._getRelation(this._state.playerFaction, fId);
        if (this._getRelationStatus(this._state.playerFaction, fId) !== "hostile") {
          // Set relation to -100
          this._modRelation(this._state.playerFaction, fId, -100 - rel);
          this._state.warDeclarations.push({ aggressor: this._state.playerFaction, target: fId, day: this._state.day });
          // Remove any existing trade agreement
          this._state.tradeAgreements = this._state.tradeAgreements.filter(
            (ta) => !((ta.factionA === this._state!.playerFaction && ta.factionB === fId) || (ta.factionA === fId && ta.factionB === this._state!.playerFaction))
          );
          this._addLog(`Declared war on ${fId}! All diplomatic ties severed.`);
          this._showDiplomacyPanel(); // refresh
        }
      });
    });

    // Bind trade agreement buttons
    this._diplomacyPanel.querySelectorAll(".diplo-trade-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const fId = (btn as HTMLElement).dataset.faction!;
        if (!this._state) return;
        const rel = this._getRelation(this._state.playerFaction, fId);
        const alreadyHas = this._state.tradeAgreements.some(
          (ta) => (ta.factionA === this._state!.playerFaction && ta.factionB === fId) || (ta.factionA === fId && ta.factionB === this._state!.playerFaction)
        );
        if (rel > 0 && !alreadyHas) {
          this._state.tradeAgreements.push({ factionA: this._state.playerFaction, factionB: fId, startDay: this._state.day });
          this._modRelation(this._state.playerFaction, fId, 10);
          this._addLog(`Trade agreement established with ${fId}! +15% trade profits between your cities.`);
          this._showDiplomacyPanel(); // refresh
        }
      });
    });

    // Bind ransom buttons
    this._diplomacyPanel.querySelectorAll(".diplo-ransom-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const lordId = (btn as HTMLElement).dataset.lord!;
        const ransomGold = parseInt((btn as HTMLElement).dataset.ransom ?? "0");
        const fId = (btn as HTMLElement).dataset.faction!;
        if (!this._state) return;
        const lord = this._state.lords.find((l) => l.id === lordId);
        if (lord && lord.capturedBy === this._state.playerFaction) {
          lord.capturedBy = null;
          this._state.gold += ransomGold;
          this._modRelation(this._state.playerFaction, fId, 10);
          this._addLog(`Ransomed ${lord.name} for ${ransomGold}g. Relations with ${fId} improved.`);
          this._showDiplomacyPanel(); // refresh
        }
      });
    });
  }

  private _removeDiplomacyPanel(): void {
    if (this._diplomacyPanel?.parentNode) {
      this._diplomacyPanel.parentNode.removeChild(this._diplomacyPanel);
      this._diplomacyPanel = null;
    }
    this._setCanvasPointerEvents(true);
  }

  // ---------------------------------------------------------------------------
  // Companion Panel
  // ---------------------------------------------------------------------------

  private _showCompanionPanel(): void {
    if (!this._state) return;
    this._removeCompanionPanel();
    this._state.paused = true;
    this._setCanvasPointerEvents(false);
    const s = this._state;

    this._companionPanel = document.createElement("div");
    this._companionPanel.style.cssText = `
      position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
      width:560px;max-height:85vh;overflow-y:auto;
      background:rgba(15,12,8,0.97);border:2px solid #daa520;border-radius:10px;
      padding:24px;z-index:10;
    `;

    const compsHTML = s.companions.map((c) => {
      const loyaltyColor = c.loyalty > 60 ? "#66cc66" : c.loyalty > 30 ? "#cccc44" : "#cc4444";
      return `
        <div style="margin-bottom:8px;padding:10px;background:rgba(30,25,15,0.5);border:1px solid ${c.recruited ? "#daa520" : "#443322"};border-radius:6px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
            <span style="color:${c.recruited ? "#daa520" : "#ccc"};font-weight:bold;font-size:13px">${c.name}</span>
            <span style="color:#998877;font-size:11px">${c.class} Lv${c.level}</span>
          </div>
          <div style="font-size:11px;color:#887766;margin-bottom:4px">${c.skillDesc}</div>
          <div style="display:flex;gap:12px;font-size:11px;align-items:center">
            <span style="color:${loyaltyColor}">Loyalty: ${c.loyalty}</span>
            <span style="color:#776655">XP: ${c.xp}</span>
            ${!c.recruited ? `
              <button class="comp-recruit-btn" data-comp="${c.id}" style="
                margin-left:auto;padding:3px 10px;font-size:11px;border:1px solid #daa520;border-radius:3px;
                background:rgba(218,165,32,0.15);color:#daa520;cursor:pointer;font-family:inherit;
              ">Recruit</button>
            ` : `<span style="color:#557744;margin-left:auto">\u2713 Recruited</span>`}
          </div>
          ${c.quest ? `<div style="font-size:10px;color:#aa8844;margin-top:4px;border-top:1px solid #332211;padding-top:4px">Quest: ${c.quest.description}</div>` : ""}
        </div>
      `;
    }).join("");

    this._companionPanel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h2 style="font-size:22px;color:#daa520;margin:0;letter-spacing:1px">COMPANIONS</h2>
        <button id="comp-close" style="
          padding:4px 12px;font-size:14px;border:1px solid #555;border-radius:4px;
          background:rgba(30,25,15,0.6);color:#888;cursor:pointer;font-family:inherit;
        ">X</button>
      </div>
      <div style="font-size:11px;color:#776655;margin-bottom:12px">
        Recruited: ${s.companions.filter((c) => c.recruited).length}/${s.companions.length}
      </div>
      ${compsHTML}
    `;

    this._container!.appendChild(this._companionPanel);

    document.getElementById("comp-close")?.addEventListener("click", () => {
      this._removeCompanionPanel();
      if (this._state) this._state.paused = false;
    });

    this._companionPanel.querySelectorAll(".comp-recruit-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const compId = (btn as HTMLElement).dataset.comp!;
        if (!this._state) return;
        const comp = this._state.companions.find((c) => c.id === compId);
        if (comp && !comp.recruited) {
          comp.recruited = true;
          this._addLog(`${comp.name} the ${comp.class} has joined your warband!`);
          this._showCompanionPanel(); // refresh
        }
      });
    });
  }

  private _removeCompanionPanel(): void {
    if (this._companionPanel?.parentNode) {
      this._companionPanel.parentNode.removeChild(this._companionPanel);
      this._companionPanel = null;
    }
    this._setCanvasPointerEvents(true);
  }

  // ---------------------------------------------------------------------------
  // Building Panel
  // ---------------------------------------------------------------------------

  private _showBuildingPanel(city: CampaignCity): void {
    if (!this._state) return;
    this._removeBuildingPanel();
    this._state.paused = true;
    this._setCanvasPointerEvents(false);
    const s = this._state;

    this._buildingPanel = document.createElement("div");
    this._buildingPanel.style.cssText = `
      position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
      width:520px;max-height:85vh;overflow-y:auto;
      background:rgba(15,12,8,0.97);border:2px solid #daa520;border-radius:10px;
      padding:24px;z-index:10;
    `;

    const buildingsHTML = BUILDING_DEFS.map((bDef) => {
      const existing = city.buildings.find((b) => b.type === bDef.type);
      const currentLevel = existing?.level ?? 0;
      const canUpgrade = currentLevel < bDef.maxLevel;
      const upgradeCost = bDef.baseCost * (currentLevel + 1);
      const canAfford = s.gold >= upgradeCost;

      return `
        <div style="margin-bottom:8px;padding:10px;background:rgba(30,25,15,0.5);border:1px solid ${bDef.color};border-radius:6px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
            <span style="color:${bDef.color};font-weight:bold;font-size:13px">${bDef.name}</span>
            <span style="color:#998877;font-size:11px">Level ${currentLevel}/${bDef.maxLevel}</span>
          </div>
          <div style="font-size:11px;color:#887766;margin-bottom:6px">${bDef.desc}</div>
          ${canUpgrade ? `
            <button class="build-upgrade-btn" data-type="${bDef.type}" data-cost="${upgradeCost}" style="
              padding:4px 12px;font-size:11px;
              border:1px solid ${canAfford ? bDef.color : "#444"};border-radius:3px;
              background:${canAfford ? `${bDef.color}22` : "rgba(20,15,10,0.6)"};
              color:${canAfford ? bDef.color : "#555"};
              cursor:${canAfford ? "pointer" : "not-allowed"};font-family:inherit;
            " ${canAfford ? "" : "disabled"}>Upgrade to Lv${currentLevel + 1} (${upgradeCost}g)</button>
          ` : `<span style="color:#557744;font-size:11px">\u2713 Max Level</span>`}
        </div>
      `;
    }).join("");

    this._buildingPanel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h2 style="font-size:22px;color:#daa520;margin:0;letter-spacing:1px">BUILDINGS — ${city.name}</h2>
        <button id="build-close" style="
          padding:4px 12px;font-size:14px;border:1px solid #555;border-radius:4px;
          background:rgba(30,25,15,0.6);color:#888;cursor:pointer;font-family:inherit;
        ">X</button>
      </div>
      <div style="font-size:11px;color:#776655;margin-bottom:12px">
        Gold: ${s.gold} | Buildings: ${city.buildings.length}
      </div>
      ${buildingsHTML}
    `;

    this._container!.appendChild(this._buildingPanel);

    document.getElementById("build-close")?.addEventListener("click", () => {
      this._removeBuildingPanel();
      if (this._state) this._state.paused = false;
    });

    this._buildingPanel.querySelectorAll(".build-upgrade-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const bType = (btn as HTMLElement).dataset.type as BuildingType;
        const cost = parseInt((btn as HTMLElement).dataset.cost ?? "0");
        if (!this._state || this._state.gold < cost) return;
        this._state.gold -= cost;
        const existing = city.buildings.find((b) => b.type === bType);
        if (existing) {
          existing.level++;
        } else {
          city.buildings.push({ type: bType, level: 1 });
        }
        this._addLog(`Built ${BUILDING_DEFS.find((d) => d.type === bType)?.name ?? bType} (Lv${(existing?.level ?? 1)}) in ${city.name} for ${cost}g.`);
        this._showBuildingPanel(city); // refresh
      });
    });
  }

  private _removeBuildingPanel(): void {
    if (this._buildingPanel?.parentNode) {
      this._buildingPanel.parentNode.removeChild(this._buildingPanel);
      this._buildingPanel = null;
    }
    this._setCanvasPointerEvents(true);
  }

  // ---------------------------------------------------------------------------
  // Trade Panel
  // ---------------------------------------------------------------------------

  private _showTradePanel(city: CampaignCity): void {
    if (!this._state) return;
    this._removeTradePanel();
    this._state.paused = true;
    this._setCanvasPointerEvents(false);
    const s = this._state;

    this._tradePanel = document.createElement("div");
    this._tradePanel.style.cssText = `
      position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
      width:520px;max-height:85vh;overflow-y:auto;
      background:rgba(15,12,8,0.97);border:2px solid #cc8844;border-radius:10px;
      padding:24px;z-index:10;
    `;

    const goodsHTML = city.tradeGoods.map((slot, i) => {
      const canBuy = s.gold >= slot.price && slot.stock > 0;
      return `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 8px;
          margin-bottom:4px;background:rgba(30,25,15,0.6);border-radius:4px;border:1px solid #332211">
          <span style="color:#ccc;font-size:12px">${slot.good}</span>
          <span style="color:#998877;font-size:11px">Stock: ${slot.stock} | ${slot.price}g</span>
          <button class="trade-buy-btn" data-idx="${i}" style="
            padding:2px 10px;font-size:11px;
            border:1px solid ${canBuy ? "#cc8844" : "#444"};border-radius:3px;
            background:${canBuy ? "rgba(204,136,68,0.2)" : "rgba(20,15,10,0.6)"};
            color:${canBuy ? "#cc8844" : "#555"};
            cursor:${canBuy ? "pointer" : "not-allowed"};font-family:inherit;
          " ${canBuy ? "" : "disabled"}>Buy</button>
        </div>
      `;
    }).join("");

    this._tradePanel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h2 style="font-size:22px;color:#cc8844;margin:0;letter-spacing:1px">TRADE — ${city.name}</h2>
        <button id="trade-close" style="
          padding:4px 12px;font-size:14px;border:1px solid #555;border-radius:4px;
          background:rgba(30,25,15,0.6);color:#888;cursor:pointer;font-family:inherit;
        ">X</button>
      </div>
      <div style="font-size:11px;color:#776655;margin-bottom:12px">
        Gold: ${s.gold} | Trade Agreements: ${s.tradeAgreements.length}
      </div>
      ${goodsHTML || `<div style="color:#666;font-size:12px">No goods available.</div>`}
    `;

    this._container!.appendChild(this._tradePanel);

    document.getElementById("trade-close")?.addEventListener("click", () => {
      this._removeTradePanel();
      if (this._state) this._state.paused = false;
    });

    this._tradePanel.querySelectorAll(".trade-buy-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt((btn as HTMLElement).dataset.idx ?? "0");
        if (!this._state) return;
        const slot = city.tradeGoods[idx];
        if (slot && this._state.gold >= slot.price && slot.stock > 0) {
          this._state.gold -= slot.price;
          slot.stock--;
          this._addLog(`Bought ${slot.good} from ${city.name} for ${slot.price}g.`);
          this._showTradePanel(city); // refresh
        }
      });
    });
  }

  private _removeTradePanel(): void {
    if (this._tradePanel?.parentNode) {
      this._tradePanel.parentNode.removeChild(this._tradePanel);
      this._tradePanel = null;
    }
    this._setCanvasPointerEvents(true);
  }

  // ---------------------------------------------------------------------------
  // Siege Equipment Panel
  // ---------------------------------------------------------------------------

  private _showSiegeEquipPanel(city: CampaignCity): void {
    if (!this._state) return;
    this._removeSiegeEquipPanel();
    this._state.paused = true;
    this._setCanvasPointerEvents(false);
    const s = this._state;

    this._siegeEquipPanel = document.createElement("div");
    this._siegeEquipPanel.style.cssText = `
      position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
      width:500px;max-height:85vh;overflow-y:auto;
      background:rgba(15,12,8,0.97);border:2px solid #666688;border-radius:10px;
      padding:24px;z-index:10;
    `;

    const workshopLevel = city.buildings.find((b) => b.type === "siege_workshop")?.level ?? 0;
    const equipHTML = SIEGE_EQUIPMENT_DEFS.map((eq) => {
      const canAfford = s.gold >= eq.cost;
      const owned = s.playerSiegeEquip.find((e) => e.type === eq.type)?.count ?? 0;
      const building = city.siegeEquipment.find((e) => e.type === eq.type);
      return `
        <div style="margin-bottom:8px;padding:10px;background:rgba(30,25,15,0.5);border:1px solid #555566;border-radius:6px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
            <span style="color:#8888aa;font-weight:bold;font-size:13px">${eq.name}</span>
            <span style="color:#998877;font-size:11px">Owned: ${owned}${building ? ` | Building (${building.daysLeft}d)` : ""}</span>
          </div>
          <div style="font-size:11px;color:#887766;margin-bottom:6px">${eq.effect}</div>
          <div style="display:flex;gap:8px;align-items:center">
            <span style="color:#776655;font-size:10px">${eq.cost}g, ${eq.buildTime} days</span>
            <button class="siege-build-btn" data-type="${eq.type}" data-cost="${eq.cost}" style="
              padding:3px 10px;font-size:11px;
              border:1px solid ${canAfford ? "#666688" : "#444"};border-radius:3px;
              background:${canAfford ? "rgba(102,102,136,0.2)" : "rgba(20,15,10,0.6)"};
              color:${canAfford ? "#8888aa" : "#555"};
              cursor:${canAfford ? "pointer" : "not-allowed"};font-family:inherit;
            " ${canAfford ? "" : "disabled"}>Build</button>
          </div>
        </div>
      `;
    }).join("");

    this._siegeEquipPanel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h2 style="font-size:22px;color:#8888aa;margin:0;letter-spacing:1px">SIEGE WORKSHOP — ${city.name}</h2>
        <button id="siege-close" style="
          padding:4px 12px;font-size:14px;border:1px solid #555;border-radius:4px;
          background:rgba(30,25,15,0.6);color:#888;cursor:pointer;font-family:inherit;
        ">X</button>
      </div>
      <div style="font-size:11px;color:#776655;margin-bottom:12px">
        Workshop Level: ${workshopLevel} | Gold: ${s.gold}
      </div>
      ${equipHTML}
    `;

    this._container!.appendChild(this._siegeEquipPanel);

    document.getElementById("siege-close")?.addEventListener("click", () => {
      this._removeSiegeEquipPanel();
      if (this._state) this._state.paused = false;
    });

    this._siegeEquipPanel.querySelectorAll(".siege-build-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const eType = (btn as HTMLElement).dataset.type as SiegeEquipType;
        const cost = parseInt((btn as HTMLElement).dataset.cost ?? "0");
        if (!this._state || this._state.gold < cost) return;
        this._state.gold -= cost;
        const def = SIEGE_EQUIPMENT_DEFS.find((d) => d.type === eType);
        city.siegeEquipment.push({ type: eType, daysLeft: def?.buildTime ?? 2 });
        this._addLog(`Started building ${def?.name ?? eType} in ${city.name} for ${cost}g (${def?.buildTime ?? 2} days).`);
        this._showSiegeEquipPanel(city); // refresh
      });
    });
  }

  private _removeSiegeEquipPanel(): void {
    if (this._siegeEquipPanel?.parentNode) {
      this._siegeEquipPanel.parentNode.removeChild(this._siegeEquipPanel);
      this._siegeEquipPanel = null;
    }
    this._setCanvasPointerEvents(true);
  }

  // ---------------------------------------------------------------------------
  // War Council Panel
  // ---------------------------------------------------------------------------

  private _showWarCouncilPanel(): void {
    if (!this._state) return;
    this._removeWarCouncilPanel();
    this._state.paused = true;
    this._setCanvasPointerEvents(false);
    const s = this._state;

    this._warCouncilPanel = document.createElement("div");
    this._warCouncilPanel.style.cssText = `
      position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
      width:580px;max-height:85vh;overflow-y:auto;
      background:rgba(15,12,8,0.97);border:2px solid #cc6644;border-radius:10px;
      padding:24px;z-index:10;
    `;

    const activeWars = s.warDeclarations.filter((w) => w.aggressor === s.playerFaction || w.target === s.playerFaction);
    const warsHTML = activeWars.length > 0 ? activeWars.map((w) => {
      const enemy = w.aggressor === s.playerFaction ? w.target : w.aggressor;
      const fDef = CAMPAIGN_FACTIONS.find((f) => f.id === enemy);
      const fColor = fDef ? `#${fDef.accentColor.toString(16).padStart(6, "0")}` : "#888";
      const enemyCities = s.cities.filter((c) => c.factionId === enemy).length;
      const enemyArmy = this._getFactionArmyTotal(enemy);
      return `
        <div style="padding:8px;margin-bottom:6px;background:rgba(40,20,15,0.5);border:1px solid ${fColor};border-radius:4px">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="color:${fColor};font-weight:bold">${fDef?.name ?? enemy}</span>
            <span style="color:#cc4444;font-size:11px">AT WAR (Day ${w.day})</span>
          </div>
          <div style="font-size:11px;color:#998877;margin-top:4px">Cities: ${enemyCities} | Army: ${enemyArmy}</div>
        </div>
      `;
    }).join("") : `<div style="color:#666;font-size:12px">No active wars.</div>`;

    // Lords info
    const lordsHTML = s.lords.filter((l) => l.factionId === s.playerFaction || l.capturedBy === s.playerFaction).map((l) => {
      const statusStr = l.capturedBy ? `Captured by ${l.capturedBy}` : `Active (Lv${l.level})`;
      const color = l.capturedBy === s.playerFaction ? "#daa520" : l.capturedBy ? "#cc4444" : "#66aa66";
      return `<div style="font-size:11px;color:${color};padding:2px 0">${l.name} — ${statusStr}</div>`;
    }).join("");

    this._warCouncilPanel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h2 style="font-size:22px;color:#cc6644;margin:0;letter-spacing:1px">WAR COUNCIL</h2>
        <button id="warcouncil-close" style="
          padding:4px 12px;font-size:14px;border:1px solid #555;border-radius:4px;
          background:rgba(30,25,15,0.6);color:#888;cursor:pointer;font-family:inherit;
        ">X</button>
      </div>
      <div style="margin-bottom:14px">
        <div style="color:#cc6644;font-size:13px;margin-bottom:8px;letter-spacing:1px">ACTIVE WARS</div>
        ${warsHTML}
      </div>
      <div style="margin-bottom:14px">
        <div style="color:#cc6644;font-size:13px;margin-bottom:8px;letter-spacing:1px">SIEGE INVENTORY</div>
        ${s.playerSiegeEquip.length > 0
          ? s.playerSiegeEquip.map((eq) => {
              const def = SIEGE_EQUIPMENT_DEFS.find((d) => d.type === eq.type);
              return `<div style="font-size:11px;color:#8888aa;padding:2px 0">${def?.name ?? eq.type} x${eq.count}</div>`;
            }).join("")
          : `<div style="color:#666;font-size:12px">No siege equipment.</div>`}
      </div>
      <div>
        <div style="color:#cc6644;font-size:13px;margin-bottom:8px;letter-spacing:1px">LORDS</div>
        ${lordsHTML || `<div style="color:#666;font-size:12px">No relevant lords.</div>`}
      </div>
    `;

    this._container!.appendChild(this._warCouncilPanel);

    document.getElementById("warcouncil-close")?.addEventListener("click", () => {
      this._removeWarCouncilPanel();
      if (this._state) this._state.paused = false;
    });
  }

  private _removeWarCouncilPanel(): void {
    if (this._warCouncilPanel?.parentNode) {
      this._warCouncilPanel.parentNode.removeChild(this._warCouncilPanel);
      this._warCouncilPanel = null;
    }
    this._setCanvasPointerEvents(true);
  }

  // ---------------------------------------------------------------------------
  // Mercenary Panel
  // ---------------------------------------------------------------------------

  private _showMercPanel(): void {
    if (!this._state) return;
    this._removeMercPanel();
    this._state.paused = true;
    this._setCanvasPointerEvents(false);
    const s = this._state;

    this._mercPanel = document.createElement("div");
    this._mercPanel.style.cssText = `
      position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
      width:520px;max-height:85vh;overflow-y:auto;
      background:rgba(15,12,8,0.97);border:2px solid #aa8855;border-radius:10px;
      padding:24px;z-index:10;
    `;

    const mercsHTML = s.mercContracts.map((mc) => {
      const canAfford = s.gold >= mc.cost;
      const unitsDesc = mc.units.map((u) => {
        const uDef = CAMPAIGN_UNITS.find((cu) => cu.id === u.unitId);
        return `${uDef?.name ?? u.unitId} x${u.count}`;
      }).join(", ");

      return `
        <div style="margin-bottom:8px;padding:10px;background:rgba(30,25,15,0.5);border:1px solid ${mc.hired ? "#557744" : "#aa8855"};border-radius:6px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
            <span style="color:${mc.hired ? "#557744" : "#aa8855"};font-weight:bold;font-size:13px">${mc.name}</span>
            <span style="color:#998877;font-size:11px">${mc.cost}g | ${mc.duration} days</span>
          </div>
          <div style="font-size:11px;color:#887766;margin-bottom:6px">${unitsDesc}</div>
          ${!mc.hired ? `
            <button class="merc-hire-btn" data-merc="${mc.id}" style="
              padding:3px 10px;font-size:11px;
              border:1px solid ${canAfford ? "#aa8855" : "#444"};border-radius:3px;
              background:${canAfford ? "rgba(170,136,85,0.2)" : "rgba(20,15,10,0.6)"};
              color:${canAfford ? "#aa8855" : "#555"};
              cursor:${canAfford ? "pointer" : "not-allowed"};font-family:inherit;
            " ${canAfford ? "" : "disabled"}>Hire Company</button>
          ` : `<span style="color:#557744;font-size:11px">\u2713 Hired (${mc.duration} days left)</span>`}
        </div>
      `;
    }).join("");

    this._mercPanel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h2 style="font-size:22px;color:#aa8855;margin:0;letter-spacing:1px">MERCENARIES</h2>
        <button id="merc-close" style="
          padding:4px 12px;font-size:14px;border:1px solid #555;border-radius:4px;
          background:rgba(30,25,15,0.6);color:#888;cursor:pointer;font-family:inherit;
        ">X</button>
      </div>
      <div style="font-size:11px;color:#776655;margin-bottom:12px">
        Gold: ${s.gold} | Active Contracts: ${s.mercContracts.filter((m) => m.hired).length}
      </div>
      ${mercsHTML || `<div style="color:#666;font-size:12px">No mercenary companies available.</div>`}
    `;

    this._container!.appendChild(this._mercPanel);

    document.getElementById("merc-close")?.addEventListener("click", () => {
      this._removeMercPanel();
      if (this._state) this._state.paused = false;
    });

    this._mercPanel.querySelectorAll(".merc-hire-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const mercId = (btn as HTMLElement).dataset.merc!;
        if (!this._state) return;
        const mc = this._state.mercContracts.find((m) => m.id === mercId);
        if (mc && !mc.hired && this._state.gold >= mc.cost) {
          this._state.gold -= mc.cost;
          mc.hired = true;
          // Add merc units to player army
          for (const u of mc.units) {
            const existing = this._state.playerParty.army.find((a) => a.unitId === u.unitId && a.xp === 0);
            if (existing) {
              existing.count += u.count;
            } else {
              this._state.playerParty.army.push({ unitId: u.unitId, count: u.count, xp: 0 });
            }
            this._state.playerParty.armyTotal += u.count;
          }
          this._addLog(`Hired ${mc.name} for ${mc.cost}g!`);
          this._showMercPanel(); // refresh
        }
      });
    });
  }

  private _removeMercPanel(): void {
    if (this._mercPanel?.parentNode) {
      this._mercPanel.parentNode.removeChild(this._mercPanel);
      this._mercPanel = null;
    }
    this._setCanvasPointerEvents(true);
  }

  // ---------------------------------------------------------------------------
  // Victory Panel
  // ---------------------------------------------------------------------------

  private _showVictoryPanel(): void {
    if (!this._state) return;
    this._removeVictoryPanel();
    this._state.paused = true;
    this._setCanvasPointerEvents(false);
    const s = this._state;
    const vp = s.victoryProgress;

    this._victoryPanel = document.createElement("div");
    this._victoryPanel.style.cssText = `
      position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
      width:480px;max-height:85vh;overflow-y:auto;
      background:rgba(15,12,8,0.97);border:2px solid #daa520;border-radius:10px;
      padding:24px;z-index:10;
    `;

    const conquestPct = Math.min(100, Math.round((vp.conquest.citiesCaptured / vp.conquest.totalCities) * 100));
    const diploPct = Math.min(100, Math.round((vp.diplomatic.alliances / vp.diplomatic.required) * 100));
    const econPct = Math.min(100, Math.round((vp.economic.goldAccumulated / vp.economic.target) * 100));

    const barStyle = (pct: number, color: string) => `
      <div style="height:10px;background:rgba(40,30,20,0.8);border-radius:5px;overflow:hidden;border:1px solid #332211;margin:4px 0 8px">
        <div style="height:100%;width:${pct}%;background:${color};border-radius:4px;transition:width 0.3s"></div>
      </div>
    `;

    this._victoryPanel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h2 style="font-size:22px;color:#daa520;margin:0;letter-spacing:1px">VICTORY PROGRESS</h2>
        <button id="victory-close" style="
          padding:4px 12px;font-size:14px;border:1px solid #555;border-radius:4px;
          background:rgba(30,25,15,0.6);color:#888;cursor:pointer;font-family:inherit;
        ">X</button>
      </div>

      <div style="margin-bottom:16px;padding:12px;background:rgba(30,25,15,0.5);border:1px solid #cc4444;border-radius:6px">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="color:#cc4444;font-weight:bold;font-size:13px">\u2694 Conquest Victory</span>
          <span style="color:#998877;font-size:11px">${vp.conquest.citiesCaptured}/${vp.conquest.totalCities} cities</span>
        </div>
        <div style="font-size:11px;color:#887766;margin-bottom:4px">Capture all cities on the map</div>
        ${barStyle(conquestPct, "#cc4444")}
      </div>

      <div style="margin-bottom:16px;padding:12px;background:rgba(30,25,15,0.5);border:1px solid #44cc44;border-radius:6px">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="color:#44cc44;font-weight:bold;font-size:13px">\uD83E\uDD1D Diplomatic Victory</span>
          <span style="color:#998877;font-size:11px">${vp.diplomatic.alliances}/${vp.diplomatic.required} alliances</span>
        </div>
        <div style="font-size:11px;color:#887766;margin-bottom:4px">Form alliances with ${vp.diplomatic.required} factions</div>
        ${barStyle(diploPct, "#44cc44")}
      </div>

      <div style="margin-bottom:16px;padding:12px;background:rgba(30,25,15,0.5);border:1px solid #ddaa33;border-radius:6px">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="color:#ddaa33;font-weight:bold;font-size:13px">\u2B23 Economic Victory</span>
          <span style="color:#998877;font-size:11px">${s.totalGoldEarned}/${vp.economic.target}g</span>
        </div>
        <div style="font-size:11px;color:#887766;margin-bottom:4px">Accumulate ${vp.economic.target} total gold earned</div>
        ${barStyle(econPct, "#ddaa33")}
      </div>

      <div style="text-align:center;color:#776655;font-size:11px;margin-top:8px">
        Day ${s.day} | Season: ${SEASON_EFFECTS[s.season].label}
      </div>
    `;

    this._container!.appendChild(this._victoryPanel);

    document.getElementById("victory-close")?.addEventListener("click", () => {
      this._removeVictoryPanel();
      if (this._state) this._state.paused = false;
    });
  }

  private _removeVictoryPanel(): void {
    if (this._victoryPanel?.parentNode) {
      this._victoryPanel.parentNode.removeChild(this._victoryPanel);
      this._victoryPanel = null;
    }
    this._setCanvasPointerEvents(true);
  }

  // ---------------------------------------------------------------------------
  // Hero progression helpers
  // ---------------------------------------------------------------------------

  private _getPerkCount(perkId: HeroPerkId): number {
    if (!this._state) return 0;
    return this._state.heroPerks.filter((p) => p === perkId).length;
  }

  private _getXpForLevel(level: number): number {
    return level * HERO_XP_PER_LEVEL;
  }

  private _awardHeroXp(amount: number): void {
    if (!this._state) return;
    if (this._state.heroLevel >= HERO_MAX_LEVEL) return;

    this._state.heroXp += amount;
    this._addLog(`+${amount} XP`);

    const needed = this._getXpForLevel(this._state.heroLevel);
    if (this._state.heroXp >= needed) {
      this._state.heroXp -= needed;
      this._state.heroLevel++;
      this._addLog(`LEVEL UP! You are now level ${this._state.heroLevel}!`);
      this._showPerkSelection();
    }
  }

  private _showPerkSelection(): void {
    if (!this._state) return;
    this._state.paused = true;
    this._setCanvasPointerEvents(false);

    // Pick 3 random perks
    const shuffled = [...HERO_PERKS].sort(() => Math.random() - 0.5);
    const choices = shuffled.slice(0, 3);

    this._perkModal = document.createElement("div");
    this._perkModal.style.cssText = `
      position:absolute;top:0;left:0;width:100%;height:100%;z-index:50;
      background:rgba(5,3,0,0.88);display:flex;flex-direction:column;
      align-items:center;justify-content:center;font-family:'Segoe UI',sans-serif;color:#e0d5c0;
    `;

    const currentCounts = choices.map((p) => this._getPerkCount(p.id));

    this._perkModal.innerHTML = `
      <div style="text-align:center;margin-bottom:24px">
        <h2 style="font-size:28px;color:#ffd700;text-shadow:0 0 12px rgba(218,165,32,0.4);margin:0">
          LEVEL ${this._state.heroLevel}
        </h2>
        <div style="color:#aa9977;font-size:14px;margin-top:6px">Choose a perk:</div>
      </div>
      <div style="display:flex;gap:16px">
        ${choices.map((perk, i) => `
          <div class="camp-perk-btn" data-perk="${perk.id}" style="
            width:180px;padding:20px;text-align:center;cursor:pointer;
            border:2px solid ${perk.color}44;border-radius:8px;
            background:rgba(20,15,10,0.8);transition:border-color 0.2s, background 0.2s;
          " onmouseover="this.style.borderColor='${perk.color}';this.style.background='rgba(40,30,20,0.9)'"
             onmouseout="this.style.borderColor='${perk.color}44';this.style.background='rgba(20,15,10,0.8)'">
            <div style="font-size:18px;color:${perk.color};font-weight:bold;margin-bottom:8px">${perk.name}</div>
            <div style="font-size:12px;color:#aa9977;margin-bottom:6px">${perk.desc}</div>
            ${currentCounts[i] > 0 ? `<div style="font-size:11px;color:#666">(owned x${currentCounts[i]})</div>` : ""}
          </div>
        `).join("")}
      </div>
    `;

    const container = this._container ?? document.getElementById("pixi-container");
    if (container) container.appendChild(this._perkModal);

    this._perkModal.querySelectorAll(".camp-perk-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const perkId = (btn as HTMLElement).dataset.perk as HeroPerkId;
        this._selectPerk(perkId);
      });
    });
  }

  private _selectPerk(perkId: HeroPerkId): void {
    if (!this._state) return;
    this._state.heroPerks.push(perkId);

    const perkDef = (HERO_PERKS as readonly { id: string; name: string; desc: string; color: string }[]).find((p) => p.id === perkId);
    this._addLog(`Perk acquired: ${perkDef?.name ?? perkId}!`);

    // Remove modal
    if (this._perkModal?.parentNode) {
      this._perkModal.parentNode.removeChild(this._perkModal);
      this._perkModal = null;
    }

    // Restore canvas pointer events only if not in battle
    if (!this._inBattle) {
      this._setCanvasPointerEvents(true);
      this._state.paused = false;
    }
  }

  private _renderHeroLevelBar(): string {
    if (!this._state) return "";
    const s = this._state;
    const needed = this._getXpForLevel(s.heroLevel);
    const pct = s.heroLevel >= HERO_MAX_LEVEL ? 1 : Math.min(1, s.heroXp / needed);
    const filled = Math.round(pct * 6);
    const empty = 6 - filled;
    const bar = "\u2588".repeat(filled) + "\u2591".repeat(empty);
    return `<span style="color:#daa520;font-size:12px;letter-spacing:1px" title="XP: ${s.heroXp}/${needed}">Lv.${s.heroLevel} <span style="color:#aa8833">[${bar}]</span></span>`;
  }

  private _getUnitUpkeep(unitId: string): number {
    const def = CAMPAIGN_UNITS.find((u) => u.id === unitId) ?? Object.values(FACTION_ELITES).find((u) => u.id === unitId);
    const tier = def?.tier ?? 1;
    return UPKEEP_PER_TIER[tier] ?? UPKEEP_PER_TIER[1];
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  private _exit(): void {
    cancelAnimationFrame(this._rafId);
    this._cleanupBattle();
    this._unbindInputs();
    this._removeCityPanel();
    this._removePartyPanel();
    this._removeVillagePanel();
    this._removeLocationPanel();
    this._removeBattlePreview();
    this._removeCaravanPanel();
    this._removeNPCPanel();
    this._removeEventPopup();

    if (this._container?.parentNode) {
      this._container.parentNode.removeChild(this._container);
      this._container = null;
    }

    // Show PixiJS canvas again
    const pixiContainer = document.getElementById("pixi-container");
    if (pixiContainer) {
      for (const child of Array.from(pixiContainer.children)) {
        (child as HTMLElement).style.display = "";
      }
    }

    window.dispatchEvent(new Event("warbandCampaignExit"));
  }

  destroy(): void {
    this._exit();
  }
}
