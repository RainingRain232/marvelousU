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

// Pre-render the static ground texture to an offscreen canvas
function _bakeGroundTexture(terrain: TerrainRegion[]): HTMLCanvasElement {
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
  garrison: { unitId: string; count: number }[];
  garrisonTotal: number;
}

interface CampaignParty {
  id: string;
  name: string;
  x: number;
  y: number;
  factionId: string;
  army: { unitId: string; count: number }[];
  armyTotal: number;
  targetX: number;
  targetY: number;
  isPlayer: boolean;
  speed: number;
  homeCity?: string;
}

interface CampaignState {
  day: number;
  tick: number;
  gold: number;
  playerParty: CampaignParty;
  parties: CampaignParty[];
  cities: CampaignCity[];
  terrain: TerrainRegion[];
  paused: boolean;
  gameOver: boolean;
  winner: string | null;
  playerFaction: string;
  selectedCity: CampaignCity | null;
  log: string[];
  speed: number; // 1, 2, 4
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
      });
    }
  }
  return cities;
}

function _generateGarrison(factionId: string, size: number): { unitId: string; count: number }[] {
  const pool = CAMPAIGN_UNITS.filter((u) => u.tier <= 4);
  const result: { unitId: string; count: number }[] = [];
  let remaining = size;

  // Add faction elite if available
  if (FACTION_ELITES[factionId] && remaining > 2) {
    const eliteCount = 1 + Math.floor(Math.random() * 3);
    result.push({ unitId: FACTION_ELITES[factionId].id, count: Math.min(eliteCount, remaining) });
    remaining -= eliteCount;
  }

  while (remaining > 0) {
    const unit = pool[Math.floor(Math.random() * pool.length)];
    const count = Math.min(1 + Math.floor(Math.random() * 4), remaining);
    const existing = result.find((r) => r.unitId === unit.id);
    if (existing) {
      existing.count += count;
    } else {
      result.push({ unitId: unit.id, count });
    }
    remaining -= count;
  }
  return result;
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
  private _logPanel: HTMLDivElement | null = null;
  private _topBar: HTMLDivElement | null = null;

  // Battle state
  private _inBattle = false;
  private _battlePlayerArmy: { unitId: string; count: number }[] = [];
  private _battleEnemyArmy: { unitId: string; count: number }[] = [];
  private _battleEnemyPartyId: string | null = null;
  private _battleEnemyCityId: string | null = null;

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

    // Bake static ground texture (only done once)
    this._groundTexture = _bakeGroundTexture(terrain);

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
        { unitId: "swordsman", count: 5 },
        { unitId: "archer", count: 3 },
        { unitId: "pikeman", count: 2 },
      ],
      armyTotal: 10,
      targetX: px,
      targetY: py,
      isPlayer: true,
      speed: PLAYER_SPEED,
    };

    this._state = {
      day: 1,
      tick: 0,
      gold: STARTING_GOLD,
      playerParty,
      parties,
      cities,
      terrain,
      paused: false,
      gameOver: false,
      winner: null,
      playerFaction: playerFaction,
      selectedCity: null,
      log: [`Day 1 — Your warband sets out from ${startCity.name}.`],
      speed: 1,
    };

    // Center camera on player
    this._camX = px - window.innerWidth / 2;
    this._camY = py - window.innerHeight / 2;

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
      position:absolute;top:0;left:0;right:0;height:42px;
      background:rgba(10,8,5,0.92);border-bottom:1px solid #443322;
      display:flex;align-items:center;padding:0 16px;gap:20px;
      font-size:13px;z-index:2;
    `;
    this._container.appendChild(this._topBar);

    // Log panel (bottom)
    this._logPanel = document.createElement("div");
    this._logPanel.style.cssText = `
      position:absolute;bottom:0;left:0;width:350px;max-height:180px;
      background:rgba(10,8,5,0.88);border-top:1px solid #443322;border-right:1px solid #443322;
      padding:8px 12px;font-size:11px;overflow-y:auto;z-index:2;
      color:#aa9977;
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

    this._topBar.innerHTML = `
      <span style="color:${factionColor};font-weight:bold;letter-spacing:1px">${factionDef?.name ?? s.playerFaction}</span>
      <span style="color:#daa520">Day ${s.day}</span>
      <span style="color:#ffcc44">Gold: ${s.gold}</span>
      <span style="color:#88aacc">Army: ${s.playerParty.armyTotal}/${MAX_PARTY_SIZE}</span>
      <span style="color:#88aa66">Cities: ${citiesOwned}/${totalCities}</span>
      <div style="margin-left:auto;display:flex;gap:6px;align-items:center">
        <span style="color:#777;font-size:11px">Speed:</span>
        ${[1, 2, 4].map((sp) => `
          <button class="camp-speed-btn" data-speed="${sp}" style="
            padding:2px 8px;font-size:11px;border:1px solid ${s.speed === sp ? "#daa520" : "#444"};
            border-radius:3px;background:${s.speed === sp ? "rgba(218,165,32,0.25)" : "rgba(20,15,10,0.6)"};
            color:${s.speed === sp ? "#fff" : "#666"};cursor:pointer;font-family:inherit;
          ">${sp}x</button>
        `).join("")}
        <button id="camp-pause-btn" style="
          padding:2px 8px;font-size:11px;border:1px solid ${s.paused ? "#cc4444" : "#444"};
          border-radius:3px;background:${s.paused ? "rgba(204,68,68,0.25)" : "rgba(20,15,10,0.6)"};
          color:${s.paused ? "#ff6666" : "#666"};cursor:pointer;font-family:inherit;
        ">${s.paused ? "PAUSED" : "Pause"}</button>
        <button id="camp-exit-btn" style="
          padding:2px 8px;font-size:11px;border:1px solid #555;
          border-radius:3px;background:rgba(20,15,10,0.6);
          color:#888;cursor:pointer;font-family:inherit;margin-left:8px;
        ">Exit</button>
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
  }

  private _updateLogPanel(): void {
    if (!this._logPanel || !this._state) return;
    const last10 = this._state.log.slice(-10);
    this._logPanel.innerHTML = `
      <div style="color:#daa520;font-size:12px;margin-bottom:4px;letter-spacing:1px">EVENT LOG</div>
      ${last10.map((l) => `<div style="margin-bottom:2px">${l}</div>`).join("")}
    `;
  }

  // ---------------------------------------------------------------------------
  // City panel
  // ---------------------------------------------------------------------------

  private _showCityPanel(city: CampaignCity): void {
    if (!this._state) return;
    this._state.selectedCity = city;
    this._state.paused = true;

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
      return `<span style="margin-right:10px">${uDef?.name ?? g.unitId} x${g.count}</span>`;
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
              const partyFull = this._state!.playerParty.armyTotal >= MAX_PARTY_SIZE;
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
  }

  private _removeCityPanel(): void {
    if (this._cityPanel?.parentNode) {
      this._cityPanel.parentNode.removeChild(this._cityPanel);
      this._cityPanel = null;
    }
  }

  private _hireUnit(unitId: string, cost: number): void {
    if (!this._state) return;
    if (this._state.gold < cost) return;
    if (this._state.playerParty.armyTotal >= MAX_PARTY_SIZE) return;

    this._state.gold -= cost;
    const existing = this._state.playerParty.army.find((a) => a.unitId === unitId);
    if (existing) {
      existing.count++;
    } else {
      this._state.playerParty.army.push({ unitId, count: 1 });
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
      return `<span style="margin-right:10px">${uDef?.name ?? a.unitId} x${a.count}</span>`;
    }).join("");

    this._partyPanel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <h3 style="color:${factionColor};margin:0">${party.name}</h3>
        <button id="camp-close-party" style="
          padding:4px 12px;font-size:14px;border:1px solid #555;border-radius:4px;
          background:rgba(30,25,15,0.6);color:#888;cursor:pointer;font-family:inherit;
        ">X</button>
      </div>
      <div style="font-size:12px;color:#998877;margin-bottom:6px">${factionDef?.name ?? party.factionId} | ${party.armyTotal} units</div>
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
      this._startPartyBattle(party);
    });
  }

  private _removePartyPanel(): void {
    if (this._partyPanel?.parentNode) {
      this._partyPanel.parentNode.removeChild(this._partyPanel);
      this._partyPanel = null;
    }
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
        } else if (this._state) {
          this._state.paused = !this._state.paused;
          this._updateTopBar();
        }
      }
      if (e.code === "Space") {
        if (this._state) { this._state.paused = !this._state.paused; this._updateTopBar(); }
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
      this._zoom = Math.max(0.4, Math.min(3.0, this._zoom - e.deltaY * 0.001));
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
      s.gold += ownedCities.length * 30;
      if (s.day % 5 === 0) {
        this._addLog(`Day ${s.day} — Income: ${GOLD_PER_DAY + ownedCities.length * 30}g`);
      }
    }

    // City reinforcements
    if (s.tick % REINFORCEMENT_INTERVAL === 0) {
      for (const city of s.cities) {
        if (city.garrisonTotal < CITY_MAX_GARRISON) {
          const pool = CAMPAIGN_UNITS.filter((u) => u.tier <= 3);
          const unit = pool[Math.floor(Math.random() * pool.length)];
          const count = 1 + Math.floor(Math.random() * 3);
          const existing = city.garrison.find((g) => g.unitId === unit.id);
          if (existing) existing.count += count;
          else city.garrison.push({ unitId: unit.id, count });
          city.garrisonTotal += count;
        }
      }
    }

    // Move player toward target
    this._moveParty(s.playerParty);

    // Move AI parties
    for (const party of s.parties) {
      this._updateAIParty(party);
      this._moveParty(party);
    }

    // Check collisions (player vs enemy parties)
    for (const party of s.parties) {
      if (party.factionId === s.playerFaction) continue;
      const dist = Math.hypot(party.x - s.playerParty.x, party.y - s.playerParty.y);
      if (dist < ENGAGEMENT_DIST) {
        this._startPartyBattle(party);
        return;
      }
    }

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

    const speed = party.speed;
    party.x += (dx / dist) * speed;
    party.y += (dy / dist) * speed;
    party.x = Math.max(10, Math.min(MAP_W - 10, party.x));
    party.y = Math.max(10, Math.min(MAP_H - 10, party.y));
  }

  private _updateAIParty(party: CampaignParty): void {
    if (!this._state) return;
    const dist = Math.hypot(party.targetX - party.x, party.targetY - party.y);
    if (dist > 5) return; // still moving

    // Pick new target: wander toward enemy cities, player, or home city
    const roll = Math.random();
    if (roll < 0.3 && party.homeCity) {
      // Return home
      const home = this._state.cities.find((c) => c.id === party.homeCity);
      if (home) {
        party.targetX = home.x + (Math.random() - 0.5) * 100;
        party.targetY = home.y + (Math.random() - 0.5) * 100;
        return;
      }
    }
    if (roll < 0.6) {
      // Move toward player if hostile
      if (party.factionId !== this._state.playerFaction) {
        party.targetX = this._state.playerParty.x + (Math.random() - 0.5) * 200;
        party.targetY = this._state.playerParty.y + (Math.random() - 0.5) * 200;
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

    // ---- Roads between allied cities ----------
    ctx.lineWidth = 1.8;
    for (let i = 0; i < s.cities.length; i++) {
      for (let j = i + 1; j < s.cities.length; j++) {
        const ci = s.cities[i], cj = s.cities[j];
        if (ci.factionId !== cj.factionId) continue;
        const dist = Math.hypot(ci.x - cj.x, ci.y - cj.y);
        if (dist > 400) continue;
        const [rr, rg, rb] = _factionRGB(ci.factionId);
        ctx.strokeStyle = `rgba(${rr},${rg},${rb},0.18)`;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        // Slight curve for visual interest
        const mx = (ci.x + cj.x) / 2 + (ci.y - cj.y) * 0.08;
        const my = (ci.y + cj.y) / 2 + (cj.x - ci.x) * 0.08;
        ctx.moveTo(ci.x, ci.y);
        ctx.quadraticCurveTo(mx, my, cj.x, cj.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // ---- Cities --------------------------------
    for (const city of s.cities) {
      const color = _factionHex(city.factionId);
      const [cr, cg, cb] = _factionRGB(city.factionId);
      const isOwn = city.factionId === s.playerFaction;

      // Animated pulsing ring for player cities
      if (isOwn) {
        const pulse = 0.3 + Math.sin(t * 2.5) * 0.15;
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},${pulse})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(city.x, city.y, 28 + Math.sin(t * 2) * 2, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.beginPath();
      ctx.ellipse(city.x + 2, city.y + 14, 16, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Castle keep (main body)
      ctx.fillStyle = color;
      ctx.strokeStyle = isOwn ? `rgba(${cr},${cg},${cb},0.9)` : "rgba(100,90,70,0.7)";
      ctx.lineWidth = isOwn ? 2.5 : 1.5;

      // Walls
      ctx.fillStyle = `rgba(${Math.min(255, cr + 40)},${Math.min(255, cg + 30)},${Math.min(255, cb + 20)},0.85)`;
      ctx.beginPath();
      ctx.rect(city.x - 11, city.y - 8, 22, 16);
      ctx.fill();
      ctx.stroke();

      // Left tower
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.rect(city.x - 14, city.y - 14, 7, 22);
      ctx.fill();
      ctx.stroke();
      // Left tower cap
      ctx.beginPath();
      ctx.moveTo(city.x - 14, city.y - 14);
      ctx.lineTo(city.x - 10.5, city.y - 19);
      ctx.lineTo(city.x - 7, city.y - 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right tower
      ctx.beginPath();
      ctx.rect(city.x + 7, city.y - 14, 7, 22);
      ctx.fill();
      ctx.stroke();
      // Right tower cap
      ctx.beginPath();
      ctx.moveTo(city.x + 7, city.y - 14);
      ctx.lineTo(city.x + 10.5, city.y - 19);
      ctx.lineTo(city.x + 14, city.y - 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Keep tower (center, tallest)
      ctx.fillStyle = `rgba(${cr},${cg},${cb},0.95)`;
      ctx.beginPath();
      ctx.rect(city.x - 5, city.y - 16, 10, 22);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(city.x - 5, city.y - 16);
      ctx.lineTo(city.x, city.y - 22);
      ctx.lineTo(city.x + 5, city.y - 16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Battlements (small rectangles on walls)
      ctx.fillStyle = color;
      for (let bx = -10; bx <= 8; bx += 4) {
        ctx.fillRect(city.x + bx, city.y - 10, 2, 2);
      }

      // Gate
      ctx.fillStyle = "rgba(20,15,10,0.7)";
      ctx.beginPath();
      ctx.arc(city.x, city.y + 8, 3.5, Math.PI, 0);
      ctx.rect(city.x - 3.5, city.y + 5, 7, 3);
      ctx.fill();

      // Banner (faction flag)
      ctx.fillStyle = color;
      ctx.fillRect(city.x + 1, city.y - 22, 1.2, -8);
      ctx.beginPath();
      ctx.moveTo(city.x + 2.2, city.y - 30);
      ctx.lineTo(city.x + 9, city.y - 27 + Math.sin(t * 3 + city.x) * 0.8);
      ctx.lineTo(city.x + 2.2, city.y - 24);
      ctx.closePath();
      ctx.fill();

      // City name with background
      const nameWidth = ctx.measureText(city.name).width || city.name.length * 7;
      ctx.fillStyle = "rgba(10,8,5,0.6)";
      const nmW = Math.max(nameWidth + 10, 50);
      ctx.beginPath();
      ctx.roundRect(city.x - nmW / 2, city.y + 17, nmW, 16, 3);
      ctx.fill();

      ctx.fillStyle = isOwn ? "#ddeebb" : "#d0c8b0";
      ctx.font = "bold 11px 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(city.name, city.x, city.y + 29);

      // Garrison badge
      ctx.fillStyle = "rgba(10,8,5,0.7)";
      ctx.beginPath();
      ctx.roundRect(city.x - 12, city.y + 34, 24, 12, 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.5)`;
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.fillStyle = city.garrisonTotal > 0 ? "#bbaa88" : "#664444";
      ctx.font = "9px sans-serif";
      ctx.fillText(`${city.garrisonTotal}`, city.x, city.y + 43);
    }

    // ---- Roving parties -----------------------
    for (const party of s.parties) {
      const color = _factionHex(party.factionId);
      const [cr, cg, cb] = _factionRGB(party.factionId);
      const isAllied = party.factionId === s.playerFaction;

      // Movement trail (fading dots)
      const angle = Math.atan2(party.targetY - party.y, party.targetX - party.x);
      const moveDist = Math.hypot(party.targetX - party.x, party.targetY - party.y);
      if (moveDist > 5) {
        for (let i = 1; i <= 3; i++) {
          const trailX = party.x - Math.cos(angle) * i * 5;
          const trailY = party.y - Math.sin(angle) * i * 5;
          ctx.fillStyle = `rgba(${cr},${cg},${cb},${0.15 - i * 0.04})`;
          ctx.beginPath();
          ctx.arc(trailX, trailY, PARTY_RADIUS * (0.6 - i * 0.12), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.beginPath();
      ctx.ellipse(party.x + 1, party.y + PARTY_RADIUS + 1, PARTY_RADIUS * 0.8, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Party body (shield shape)
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(party.x, party.y - PARTY_RADIUS);
      ctx.lineTo(party.x + PARTY_RADIUS, party.y - PARTY_RADIUS * 0.3);
      ctx.lineTo(party.x + PARTY_RADIUS * 0.7, party.y + PARTY_RADIUS * 0.7);
      ctx.lineTo(party.x, party.y + PARTY_RADIUS);
      ctx.lineTo(party.x - PARTY_RADIUS * 0.7, party.y + PARTY_RADIUS * 0.7);
      ctx.lineTo(party.x - PARTY_RADIUS, party.y - PARTY_RADIUS * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = isAllied ? `rgba(100,255,100,0.6)` : `rgba(255,80,60,0.5)`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Party emblem (cross for allied, swords for enemy)
      ctx.strokeStyle = `rgba(255,255,255,0.5)`;
      ctx.lineWidth = 1.2;
      if (isAllied) {
        ctx.beginPath();
        ctx.moveTo(party.x, party.y - 3);
        ctx.lineTo(party.x, party.y + 3);
        ctx.moveTo(party.x - 3, party.y);
        ctx.lineTo(party.x + 3, party.y);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(party.x - 2.5, party.y - 2.5);
        ctx.lineTo(party.x + 2.5, party.y + 2.5);
        ctx.moveTo(party.x + 2.5, party.y - 2.5);
        ctx.lineTo(party.x - 2.5, party.y + 2.5);
        ctx.stroke();
      }

      // Direction arrow
      if (moveDist > 5) {
        const arrowLen = PARTY_RADIUS + 6;
        const ax = party.x + Math.cos(angle) * arrowLen;
        const ay = party.y + Math.sin(angle) * arrowLen;
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.6)`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(party.x + Math.cos(angle) * PARTY_RADIUS, party.y + Math.sin(angle) * PARTY_RADIUS);
        ctx.lineTo(ax, ay);
        ctx.stroke();
        // Arrow head
        const ha = 0.5;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax - Math.cos(angle - ha) * 4, ay - Math.sin(angle - ha) * 4);
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax - Math.cos(angle + ha) * 4, ay - Math.sin(angle + ha) * 4);
        ctx.stroke();
      }

      // Army size badge
      ctx.fillStyle = "rgba(10,8,5,0.75)";
      ctx.beginPath();
      ctx.roundRect(party.x - 8, party.y - PARTY_RADIUS - 13, 16, 10, 2);
      ctx.fill();
      ctx.fillStyle = "#ccbb99";
      ctx.font = "bold 8px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${party.armyTotal}`, party.x, party.y - PARTY_RADIUS - 5);
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
    player.hp = 200;
    player.maxHp = 200;
    this._battleState.fighters.push(player);

    // Spawn player army units
    let allyIdx = 0;
    for (const entry of this._battlePlayerArmy) {
      const uDef = this._findCampaignUnit(entry.unitId);
      if (!uDef) continue;
      for (let n = 0; n < entry.count; n++) {
        const row = Math.floor(allyIdx / 10);
        const col = allyIdx % 10;
        const x = (col - 4.5) * 2.5;
        const z = 12 + row * 2.5;
        const ally = createDefaultFighter(
          `ally_${allyIdx}`,
          uDef.name,
          "player",
          false,
          vec3(Math.max(-halfW + 2, Math.min(halfW - 2, x)), 0, z),
        );
        this._equipCampaignUnit(ally, uDef, this._battleState!);
        this._battleState.fighters.push(ally);
        allyIdx++;
      }
    }

    // Spawn enemy army units
    let enemyIdx = 0;
    for (const entry of this._battleEnemyArmy) {
      const uDef = this._findCampaignUnit(entry.unitId);
      if (!uDef) continue;
      for (let n = 0; n < entry.count; n++) {
        const row = Math.floor(enemyIdx / 10);
        const col = enemyIdx % 10;
        const x = (col - 4.5) * 2.5;
        const z = -12 - row * 2.5;
        const enemy = createDefaultFighter(
          `enemy_${enemyIdx}`,
          uDef.name,
          "enemy",
          false,
          vec3(Math.max(-halfW + 2, Math.min(halfW - 2, x)), 0, z),
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

    // ESC handler for battle
    this._escHandler = (e: KeyboardEvent) => {
      if (e.code === "Escape" && this._battleState) {
        if (this._battleState.phase === WarbandPhase.BATTLE) {
          this._battleState.paused = !this._battleState.paused;
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
    const loot = enemiesKilled * LOOT_PER_UNIT;

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

    this._battleResultsContainer = document.createElement("div");
    this._battleResultsContainer.style.cssText = `
      position:absolute;top:0;left:0;width:100%;height:100%;z-index:30;
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
      <button id="camp-battle-continue" style="
        padding:12px 30px;font-size:16px;font-weight:bold;
        border:2px solid #daa520;border-radius:6px;
        background:rgba(218,165,32,0.15);color:#daa520;
        cursor:pointer;font-family:inherit;margin-top:10px;
      ">Return to Campaign Map</button>
    `;

    const container = document.getElementById("pixi-container");
    if (container) container.appendChild(this._battleResultsContainer);

    document.getElementById("camp-battle-continue")?.addEventListener("click", () => {
      this._processBattleOutcome(won, playerSurvivors, loot);
    });
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
    const newArmy: { unitId: string; count: number }[] = [];
    for (const entry of this._state.playerParty.army) {
      const uDef = this._findCampaignUnit(entry.unitId);
      if (!uDef) continue;
      const survived = survivorNames.get(uDef.name) ?? 0;
      if (survived > 0) {
        newArmy.push({ unitId: entry.unitId, count: Math.min(survived, entry.count) });
        survivorNames.set(uDef.name, Math.max(0, survived - entry.count));
      }
    }
    this._state.playerParty.army = newArmy;
    this._state.playerParty.armyTotal = newArmy.reduce((s, a) => s + a.count, 0);

    if (won) {
      this._state.gold += loot;

      // Handle enemy party destruction
      if (this._battleEnemyPartyId) {
        this._state.parties = this._state.parties.filter((p) => p.id !== this._battleEnemyPartyId);
        this._addLog(`Enemy warband destroyed! +${loot}g`);
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
        }
      }
    } else {
      this._addLog("Your warband was defeated in battle.");
      // If player has no army and no cities, game over handled in _update
    }

    this._battleEnemyPartyId = null;
    this._battleEnemyCityId = null;

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

  private _cleanupBattle(): void {
    cancelAnimationFrame(this._battleRafId);

    // Remove results
    if (this._battleResultsContainer?.parentNode) {
      this._battleResultsContainer.parentNode.removeChild(this._battleResultsContainer);
      this._battleResultsContainer = null;
    }

    // Dispose meshes
    for (const [, mesh] of this._battleFighterMeshes) {
      this._battleSceneManager?.scene.remove(mesh.group);
    }
    this._battleFighterMeshes.clear();

    for (const [, mesh] of this._battleHorseMeshes) {
      this._battleSceneManager?.scene.remove(mesh.group);
    }
    this._battleHorseMeshes.clear();

    for (const [, mesh] of this._battleCreatureMeshes) {
      this._battleSceneManager?.scene.remove(mesh.group);
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
  // Helpers
  // ---------------------------------------------------------------------------

  private _addLog(msg: string): void {
    if (!this._state) return;
    this._state.log.push(`Day ${this._state.day} — ${msg}`);
    if (this._state.log.length > 50) this._state.log.shift();
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
