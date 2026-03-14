// ---------------------------------------------------------------------------
// Warband mode – main game orchestrator
// Manages the full lifecycle: menu → shop → battle → results
// ---------------------------------------------------------------------------

import * as THREE from "three";
import {
  type WarbandState,
  type WarbandFighter,
  WarbandPhase,
  BattleType,
  FighterCombatState,
  createWarbandState,
  createDefaultFighter,
  createHorse,
  vec3,
  vec3DistXZ,
  type HorseArmorTier,
} from "./state/WarbandState";
import { WB } from "./config/WarbandBalanceConfig";
import { WEAPON_DEFS } from "./config/WeaponDefs";
import { ARMOR_DEFS, ArmorSlot } from "./config/ArmorDefs";

import { WarbandSceneManager } from "./view/WarbandSceneManager";
import { WarbandCameraController } from "./view/WarbandCameraController";
import { FighterMesh } from "./view/WarbandFighterRenderer";
import { HorseMesh } from "./view/WarbandHorseRenderer";
import { CreatureMesh } from "./view/WarbandCreatureRenderer";
import { WarbandHUD } from "./view/WarbandHUD";
import { WarbandShopView } from "./view/WarbandShopView";
import { WarbandFX } from "./view/WarbandFX";

import { WarbandInputSystem } from "./systems/WarbandInputSystem";
import { WarbandCombatSystem } from "./systems/WarbandCombatSystem";
import { WarbandPhysicsSystem } from "./systems/WarbandPhysicsSystem";
import { WarbandAISystem } from "./systems/WarbandAISystem";
import { CREATURE_DEFS, type CreatureType } from "./config/CreatureDefs";
import { LEADER_DEFINITIONS } from "@sim/config/LeaderDefs";
import type { LeaderId } from "@sim/config/LeaderDefs";
import { RACE_DEFINITIONS, getRace } from "@sim/config/RaceDefs";
import type { RaceId, RaceTiers } from "@sim/config/RaceDefs";

// ---- Random AI names ------------------------------------------------------

const AI_NAMES_PLAYER = [
  "Sir Gareth", "Sir Bors", "Lady Elaine", "Sir Percival",
  "Dame Isolde", "Sir Tristan", "Lady Morgana", "Sir Galahad",
  "Sir Lancelot", "Dame Vivienne", "Sir Kay", "Lady Guinevere",
  "Sir Bedivere", "Dame Lynet", "Sir Gawain", "Lady Nimue",
];
const AI_NAMES_ENEMY = [
  "Black Knight", "Raider Ulric", "Bandit Thorne", "Dark Warden",
  "Marauder Kael", "Pillager Varn", "Rogue Aldric", "Brigand Hask",
  "Reaver Drak", "Scourge Mord", "Warlord Grenn", "Ravager Surt",
  "Despoiler Orm", "Plunderer Rask", "Corsair Vex", "Destroyer Bane",
];

// ---- Army unit type presets -----------------------------------------------

interface UnitTypeDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  mainHand: string;    // weapon id
  offHand: string | null; // shield id or null
  head: string;
  torso: string;
  gauntlets: string;
  legs: string;
  boots: string;
  horseArmor?: HorseArmorTier;
  creatureType?: CreatureType;
  scale?: number;        // visual & collision scale (default 1.0)
  hpOverride?: number;   // override default 100 HP
  speedMultiplier?: number; // movement speed multiplier
  // --- Shop classification (assigned after array) ---
  building?: string;     // "barracks"|"archery"|"stables"|"siege"|"creatures"|"mages"|"temple"
  tier?: number;         // power tier 1–7
  cost?: number;         // gold cost
  isElite?: boolean;     // appears in elite section of building tab
  faction?: string;      // race id for faction-exclusive units
}

const UNIT_TYPES: UnitTypeDef[] = [
  {
    id: "swordsman",
    name: "Swordsman",
    icon: "\u2694\uFE0F",
    description: "Sword & shield, medium armor",
    mainHand: "arming_sword",
    offHand: "heater_shield",
    head: "spangenhelm",
    torso: "mail_shirt",
    gauntlets: "leather_gloves",
    legs: "cuisses",
    boots: "leather_boots",
  },
  {
    id: "archer",
    name: "Archer",
    icon: "\uD83C\uDFF9",
    description: "Longbow, light armor",
    mainHand: "long_bow",
    offHand: null,
    head: "leather_cap",
    torso: "leather_jerkin",
    gauntlets: "leather_gloves",
    legs: "leather_leggings",
    boots: "leather_boots",
  },
  {
    id: "pikeman",
    name: "Pikeman",
    icon: "\uD83D\uDD31",
    description: "Pike, medium armor",
    mainHand: "pike",
    offHand: null,
    head: "mail_coif",
    torso: "mail_shirt",
    gauntlets: "leather_gloves",
    legs: "cuisses",
    boots: "leather_boots",
  },
  {
    id: "knight",
    name: "Knight",
    icon: "\uD83D\uDEE1\uFE0F",
    description: "Heavy armor, sword & shield",
    mainHand: "arming_sword",
    offHand: "kite_shield",
    head: "nasal_helm",
    torso: "surcoat_over_mail",
    gauntlets: "mail_gauntlets",
    legs: "mail_chausses",
    boots: "armored_boots",
  },
  {
    id: "scout_cavalry",
    name: "Scout",
    icon: "\uD83D\uDC0E",
    description: "Pike, light armor, light horse",
    mainHand: "pike",
    offHand: null,
    head: "leather_cap",
    torso: "leather_jerkin",
    gauntlets: "leather_gloves",
    legs: "leather_leggings",
    boots: "leather_boots",
    horseArmor: "light",
  },
  {
    id: "horse_archer",
    name: "Horse Archer",
    icon: "\uD83C\uDFC7",
    description: "Longbow, medium armor, medium horse",
    mainHand: "long_bow",
    offHand: null,
    head: "spangenhelm",
    torso: "lamellar",
    gauntlets: "leather_gloves",
    legs: "cuisses",
    boots: "riding_boots",
    horseArmor: "medium",
  },
  {
    id: "lancer",
    name: "Lancer",
    icon: "\u265E",
    description: "Heavy armor, pike & shield, heavy horse",
    mainHand: "lance",
    offHand: "kite_shield",
    head: "bascinet",
    torso: "brigandine",
    gauntlets: "mail_gauntlets",
    legs: "splinted_greaves",
    boots: "chain_sabatons",
    horseArmor: "heavy",
  },
  {
    id: "crossbowman",
    name: "Crossbowman",
    icon: "\uD83C\uDFAF",
    description: "Arbalest, pavise, medium armor",
    mainHand: "arbalest",
    offHand: "pavise",
    head: "kettle_hat",
    torso: "lamellar",
    gauntlets: "leather_gloves",
    legs: "cuisses",
    boots: "leather_boots",
  },
  {
    id: "skirmisher",
    name: "Skirmisher",
    icon: "\uD83D\uDCA8",
    description: "Javelins, light & fast",
    mainHand: "javelins",
    offHand: "buckler",
    head: "leather_cap",
    torso: "gambeson",
    gauntlets: "leather_gloves",
    legs: "leather_leggings",
    boots: "riding_boots",
  },
  {
    id: "halberdier",
    name: "Halberdier",
    icon: "\uD83E\uDE93",
    description: "Halberd, chainmail",
    mainHand: "halberd",
    offHand: null,
    head: "kettle_hat",
    torso: "chain_hauberk",
    gauntlets: "mail_gauntlets",
    legs: "mail_chausses",
    boots: "mail_boots",
  },
  {
    id: "berserker",
    name: "Berserker",
    icon: "\uD83D\uDD25",
    description: "Zweihander, light armor, high damage",
    mainHand: "zweihander",
    offHand: null,
    head: "leather_cap",
    torso: "gambeson",
    gauntlets: "leather_gloves",
    legs: "padded_leggings",
    boots: "leather_boots",
  },
  {
    id: "troll",
    name: "Troll",
    icon: "\uD83E\uDDD4",
    description: "Huge brute, high HP, slow but devastating",
    mainHand: "",
    offHand: null,
    head: "", torso: "", gauntlets: "", legs: "", boots: "",
    creatureType: "troll",
  },
  {
    id: "cyclops",
    name: "Cyclops",
    icon: "\uD83D\uDC41\uFE0F",
    description: "Massive one-eyed giant, immense damage",
    mainHand: "",
    offHand: null,
    head: "", torso: "", gauntlets: "", legs: "", boots: "",
    creatureType: "cyclops",
  },
  // ---- Barracks units ----
  {
    id: "assassin",
    name: "Assassin",
    icon: "\uD83D\uDDE1",
    description: "Fast and lethal, sword & dagger, light armor",
    mainHand: "sabre",
    offHand: null,
    head: "leather_cap",
    torso: "leather_jerkin",
    gauntlets: "leather_gloves",
    legs: "leather_leggings",
    boots: "riding_boots",
    hpOverride: 65,
    speedMultiplier: 1.3,
  },
  {
    id: "mage_hunter",
    name: "Mage Hunter",
    icon: "\uD83D\uDD2E",
    description: "Fast melee striker, medium armor",
    mainHand: "falchion",
    offHand: "buckler",
    head: "spangenhelm",
    torso: "studded_leather",
    gauntlets: "leather_gloves",
    legs: "leather_leggings",
    boots: "leather_boots",
    hpOverride: 80,
    speedMultiplier: 1.15,
  },
  {
    id: "gladiator",
    name: "Gladiator",
    icon: "\uD83C\uDFDB",
    description: "Net & trident fighter, medium armor",
    mainHand: "spear",
    offHand: "round_shield",
    head: "spangenhelm",
    torso: "studded_leather",
    gauntlets: "leather_gloves",
    legs: "leather_leggings",
    boots: "sandals",
    hpOverride: 140,
  },
  {
    id: "defender",
    name: "Defender",
    icon: "\uD83D\uDEE1\uFE0F",
    description: "Tower shield, heavy armor, very slow",
    mainHand: "arming_sword",
    offHand: "tower_shield",
    head: "bascinet",
    torso: "half_plate",
    gauntlets: "brigandine_gauntlets",
    legs: "splinted_greaves",
    boots: "chain_sabatons",
    hpOverride: 250,
    speedMultiplier: 0.7,
  },
  {
    id: "phalanx",
    name: "Phalanx",
    icon: "\uD83D\uDD31",
    description: "Long spear & tower shield, slow but impenetrable",
    mainHand: "pike",
    offHand: "tower_shield",
    head: "bascinet",
    torso: "coat_of_plates",
    gauntlets: "brigandine_gauntlets",
    legs: "splinted_greaves",
    boots: "chain_sabatons",
    hpOverride: 220,
    speedMultiplier: 0.7,
  },
  {
    id: "royal_phalanx",
    name: "Royal Phalanx",
    icon: "\uD83D\uDC51",
    description: "Elite pikeman in gilded armor, enormous pike",
    mainHand: "pike",
    offHand: "kite_shield",
    head: "great_helm",
    torso: "plate_cuirass",
    gauntlets: "plate_gauntlets",
    legs: "plate_greaves",
    boots: "plate_sabatons",
    hpOverride: 300,
    speedMultiplier: 0.65,
  },
  {
    id: "royal_defender",
    name: "Royal Defender",
    icon: "\uD83C\uDFF0",
    description: "Heavily armored royal guard with massive shield",
    mainHand: "morning_star",
    offHand: "tower_shield",
    head: "great_helm",
    torso: "plate_cuirass",
    gauntlets: "plate_gauntlets",
    legs: "plate_greaves",
    boots: "plate_sabatons",
    hpOverride: 450,
    speedMultiplier: 0.6,
  },
  {
    id: "axeman",
    name: "Axeman",
    icon: "\uD83E\uDE93",
    description: "Battle axe, heavy armor, devastating power",
    mainHand: "battle_axe",
    offHand: null,
    head: "sallet",
    torso: "brigandine",
    gauntlets: "brigandine_gauntlets",
    legs: "splinted_greaves",
    boots: "chain_sabatons",
    hpOverride: 350,
    speedMultiplier: 0.9,
  },
  {
    id: "war_drummer",
    name: "War Drummer",
    icon: "\uD83E\uDD41",
    description: "Inspires allies, weak in combat",
    mainHand: "mace",
    offHand: "buckler",
    head: "cloth_hood",
    torso: "gambeson",
    gauntlets: "cloth_wraps",
    legs: "cloth_trousers",
    boots: "leather_boots",
    hpOverride: 90,
    speedMultiplier: 0.7,
  },
  {
    id: "troubadour",
    name: "Troubadour",
    icon: "🎵",
    description: "Wandering bard, barely fights but steadfast in spirit",
    mainHand: "mace",
    offHand: null,
    head: "cloth_hood",
    torso: "padded_vest",
    gauntlets: "cloth_wraps",
    legs: "cloth_trousers",
    boots: "leather_boots",
    hpOverride: 50,
    speedMultiplier: 1.0,
  },
  // ---- Ancient units (larger than human, armored) ----
  {
    id: "ancient_defender",
    name: "Ancient Defender",
    icon: "\uD83D\uDDFF",
    description: "Undying sentinel, blackened armor, tower shield",
    mainHand: "ancient_sword",
    offHand: "ancient_tower_shield",
    head: "ancient_helm",
    torso: "ancient_plate",
    gauntlets: "ancient_gauntlets",
    legs: "ancient_greaves",
    boots: "ancient_sabatons",
    hpOverride: 700,
    speedMultiplier: 0.55,
    scale: 1.5,
  },
  {
    id: "ancient_phalanx",
    name: "Ancient Phalanx",
    icon: "\uD83D\uDDFF",
    description: "Grey-skinned spearman with a corroded pike",
    mainHand: "ancient_pike",
    offHand: "ancient_tower_shield",
    head: "ancient_helm",
    torso: "ancient_plate",
    gauntlets: "ancient_gauntlets",
    legs: "ancient_greaves",
    boots: "ancient_sabatons",
    hpOverride: 500,
    speedMultiplier: 0.55,
    scale: 1.5,
  },
  {
    id: "ancient_axeman",
    name: "Ancient Axeman",
    icon: "\uD83D\uDDFF",
    description: "Hulking relic swinging a pitted black axe",
    mainHand: "ancient_battle_axe",
    offHand: null,
    head: "ancient_helm",
    torso: "ancient_plate",
    gauntlets: "ancient_gauntlets",
    legs: "ancient_greaves",
    boots: "ancient_sabatons",
    hpOverride: 600,
    speedMultiplier: 0.75,
    scale: 1.5,
  },
  // ---- Elder units (even larger, void-dark armor) ----
  {
    id: "elder_defender",
    name: "Elder Defender",
    icon: "\u2620\uFE0F",
    description: "Towering monolith of fused black iron",
    mainHand: "elder_sword",
    offHand: "elder_tower_shield",
    head: "elder_helm",
    torso: "elder_plate",
    gauntlets: "elder_gauntlets",
    legs: "elder_greaves",
    boots: "elder_sabatons",
    hpOverride: 1200,
    speedMultiplier: 0.45,
    scale: 2.0,
  },
  {
    id: "elder_phalanx",
    name: "Elder Phalanx",
    icon: "\u2620\uFE0F",
    description: "Impossibly tall sentinel with barbed lance",
    mainHand: "elder_lance",
    offHand: "elder_tower_shield",
    head: "elder_helm",
    torso: "elder_plate",
    gauntlets: "elder_gauntlets",
    legs: "elder_greaves",
    boots: "elder_sabatons",
    hpOverride: 900,
    speedMultiplier: 0.45,
    scale: 2.0,
  },
  {
    id: "elder_axeman",
    name: "Elder Axeman",
    icon: "\u2620\uFE0F",
    description: "Nightmarish executioner with a jagged black cleaver",
    mainHand: "elder_great_axe",
    offHand: null,
    head: "elder_helm",
    torso: "elder_plate",
    gauntlets: "elder_gauntlets",
    legs: "elder_greaves",
    boots: "elder_sabatons",
    hpOverride: 1000,
    speedMultiplier: 0.6,
    scale: 2.0,
  },
  // ---- Elite Barracks units ----
  {
    id: "royal_guard",
    name: "Royal Guard",
    icon: "\uD83D\uDC51",
    description: "Elite tower-shield soldier in gilded plate",
    mainHand: "royal_sword",
    offHand: "royal_tower_shield",
    head: "royal_guard_helm",
    torso: "royal_guard_plate",
    gauntlets: "royal_guard_gauntlets",
    legs: "royal_guard_greaves",
    boots: "royal_guard_sabatons",
    hpOverride: 1100,
    speedMultiplier: 0.5,
  },
  {
    id: "giant_warrior",
    name: "Giant Warrior",
    icon: "\uD83D\uDCAA",
    description: "Towering war giant in heavy plate, massive club",
    mainHand: "giant_war_club",
    offHand: null,
    head: "giant_helm",
    torso: "giant_plate",
    gauntlets: "giant_gauntlets",
    legs: "giant_greaves",
    boots: "giant_sabatons",
    hpOverride: 1200,
    speedMultiplier: 0.45,
    scale: 2.5,
  },
  {
    id: "giant_court_jester",
    name: "Giant Court Jester",
    icon: "🃏",
    description: "Enormous and utterly harmless. Why is it here?",
    mainHand: "mace",
    offHand: null,
    head: "cloth_hood",
    torso: "padded_vest",
    gauntlets: "cloth_wraps",
    legs: "cloth_trousers",
    boots: "leather_boots",
    hpOverride: 500,
    speedMultiplier: 0.4,
    scale: 3.0,
  },
  {
    id: "questing_knight",
    name: "Questing Knight",
    icon: "⚜️",
    description: "Noble knight errant on heavy horse, devastating lance charge",
    mainHand: "lance",
    offHand: "heater_shield",
    head: "armet",
    torso: "half_plate",
    gauntlets: "brigandine_gauntlets",
    legs: "splinted_greaves",
    boots: "chain_sabatons",
    hpOverride: 200,
    speedMultiplier: 1.1,
    scale: 1.2,
    horseArmor: "heavy",
  },
  // ---- Archery Range units ----
  {
    id: "shortbow",
    name: "Shortbow",
    icon: "🏹",
    description: "Short bow, very light and fast, cheap skirmisher",
    mainHand: "short_bow",
    offHand: null,
    head: "cloth_hood",
    torso: "padded_vest",
    gauntlets: "cloth_wraps",
    legs: "leather_leggings",
    boots: "leather_boots",
    hpOverride: 60,
    speedMultiplier: 1.2,
  },
  {
    id: "longbowman",
    name: "Longbowman",
    icon: "🏹",
    description: "War bow, medium armor, long range",
    mainHand: "war_bow",
    offHand: null,
    head: "kettle_hat",
    torso: "gambeson",
    gauntlets: "leather_gloves",
    legs: "leather_leggings",
    boots: "leather_boots",
    hpOverride: 80,
  },
  {
    id: "repeater",
    name: "Repeater",
    icon: "🔄",
    description: "Composite bow, rapid fire, light armor",
    mainHand: "composite_bow",
    offHand: null,
    head: "leather_cap",
    torso: "leather_jerkin",
    gauntlets: "leather_gloves",
    legs: "leather_leggings",
    boots: "riding_boots",
    hpOverride: 70,
    speedMultiplier: 1.15,
  },
  {
    id: "javelineer",
    name: "Javelineer",
    icon: "🎯",
    description: "Javelins & shield, versatile skirmisher",
    mainHand: "javelins",
    offHand: "round_shield",
    head: "mail_coif",
    torso: "gambeson",
    gauntlets: "leather_gloves",
    legs: "leather_leggings",
    boots: "leather_boots",
    hpOverride: 90,
  },
  {
    id: "arbalestier",
    name: "Arbalestier",
    icon: "⚙",
    description: "Arbalest & pavise, devastating bolts",
    mainHand: "arbalest",
    offHand: "pavise",
    head: "sallet",
    torso: "surcoat_over_mail",
    gauntlets: "mail_gauntlets",
    legs: "mail_chausses",
    boots: "mail_boots",
    hpOverride: 110,
    speedMultiplier: 0.8,
  },
  // ---- Ancient Archery units ----
  {
    id: "ancient_archer",
    name: "Ancient Archer",
    icon: "🗿",
    description: "Towering stone-skinned bowman with a petrified bow",
    mainHand: "ancient_bow",
    offHand: null,
    head: "ancient_helm",
    torso: "ancient_plate",
    gauntlets: "ancient_gauntlets",
    legs: "ancient_greaves",
    boots: "ancient_sabatons",
    hpOverride: 450,
    speedMultiplier: 0.6,
    scale: 1.5,
  },
  {
    id: "ancient_longbowman",
    name: "Ancient Longbowman",
    icon: "🗿",
    description: "Grey-skinned giant with a massive war bow",
    mainHand: "ancient_bow",
    offHand: null,
    head: "ancient_helm",
    torso: "ancient_plate",
    gauntlets: "ancient_gauntlets",
    legs: "ancient_greaves",
    boots: "ancient_sabatons",
    hpOverride: 500,
    speedMultiplier: 0.55,
    scale: 1.5,
  },
  {
    id: "ancient_crossbowman",
    name: "Ancient Crossbowman",
    icon: "🗿",
    description: "Corroded sentinel wielding a massive stone crossbow",
    mainHand: "ancient_crossbow",
    offHand: null,
    head: "ancient_helm",
    torso: "ancient_plate",
    gauntlets: "ancient_gauntlets",
    legs: "ancient_greaves",
    boots: "ancient_sabatons",
    hpOverride: 550,
    speedMultiplier: 0.5,
    scale: 1.5,
  },
  // ---- Elite Archery Range units ----
  {
    id: "elder_archer",
    name: "Elder Archer",
    icon: "☠️",
    description: "Void-dark titan drawing an impossibly long bow",
    mainHand: "elder_bow",
    offHand: null,
    head: "elder_helm",
    torso: "elder_plate",
    gauntlets: "elder_gauntlets",
    legs: "elder_greaves",
    boots: "elder_sabatons",
    hpOverride: 800,
    speedMultiplier: 0.5,
    scale: 2.0,
  },
  {
    id: "elder_repeater",
    name: "Elder Repeater",
    icon: "☠️",
    description: "Nightmarish crossbowman, rapid dark bolts",
    mainHand: "elder_crossbow",
    offHand: null,
    head: "elder_helm",
    torso: "elder_plate",
    gauntlets: "elder_gauntlets",
    legs: "elder_greaves",
    boots: "elder_sabatons",
    hpOverride: 750,
    speedMultiplier: 0.5,
    scale: 2.0,
  },
  {
    id: "elder_javelineer",
    name: "Elder Javelineer",
    icon: "☠️",
    description: "Towering hurler of barbed shadow spears",
    mainHand: "elder_javelins",
    offHand: null,
    head: "elder_helm",
    torso: "elder_plate",
    gauntlets: "elder_gauntlets",
    legs: "elder_greaves",
    boots: "elder_sabatons",
    hpOverride: 850,
    speedMultiplier: 0.55,
    scale: 2.0,
  },
  {
    id: "marksman",
    name: "Marksman",
    icon: "🎯",
    description: "Elite sharpshooter, war bow, plate armor",
    mainHand: "war_bow",
    offHand: null,
    head: "sallet",
    torso: "brigandine",
    gauntlets: "plate_gauntlets",
    legs: "plate_greaves",
    boots: "plate_sabatons",
    hpOverride: 130,
    speedMultiplier: 0.85,
  },
  {
    id: "giant_archer",
    name: "Giant Archer",
    icon: "💪",
    description: "Colossal war giant with a tree-trunk bow",
    mainHand: "giant_bow",
    offHand: null,
    head: "giant_helm",
    torso: "giant_plate",
    gauntlets: "giant_gauntlets",
    legs: "giant_greaves",
    boots: "giant_sabatons",
    hpOverride: 1000,
    speedMultiplier: 0.45,
    scale: 2.5,
  },
  // ---- Stables units ----
  {
    id: "siege_hunter",
    name: "Siege Hunter",
    icon: "🏰",
    description: "Heavy crossbow cavalry, hunts siege engines",
    mainHand: "heavy_crossbow",
    offHand: null,
    head: "bascinet",
    torso: "brigandine",
    gauntlets: "mail_gauntlets",
    legs: "splinted_greaves",
    boots: "chain_sabatons",
    hpOverride: 150,
    horseArmor: "heavy",
  },
  {
    id: "elite_lancer",
    name: "Elite Lancer",
    icon: "♞",
    description: "Veteran lancer in heavy armor",
    mainHand: "lance",
    offHand: "heater_shield",
    head: "armet",
    torso: "coat_of_plates",
    gauntlets: "brigandine_gauntlets",
    legs: "splinted_greaves",
    boots: "chain_sabatons",
    hpOverride: 180,
    horseArmor: "heavy",
  },
  {
    id: "knight_lancer",
    name: "Knight Lancer",
    icon: "⚜",
    description: "Noble knight with lance & kite shield, full plate",
    mainHand: "lance",
    offHand: "kite_shield",
    head: "great_helm",
    torso: "plate_cuirass",
    gauntlets: "plate_gauntlets",
    legs: "plate_greaves",
    boots: "plate_sabatons",
    hpOverride: 220,
    horseArmor: "heavy",
  },
  {
    id: "royal_lancer",
    name: "Royal Lancer",
    icon: "👑",
    description: "Crown's finest, gilded armor, devastating charge",
    mainHand: "lance",
    offHand: "tower_shield",
    head: "great_helm",
    torso: "plate_cuirass",
    gauntlets: "plate_gauntlets",
    legs: "plate_greaves",
    boots: "plate_sabatons",
    hpOverride: 350,
    speedMultiplier: 0.9,
    horseArmor: "heavy",
  },
  // ---- Elite Stables units ----
  {
    id: "elder_horse_archer",
    name: "Elder Horse Archer",
    icon: "☠️",
    description: "Void-mounted archer, dark bow on shadow steed",
    mainHand: "elder_bow",
    offHand: null,
    head: "elder_helm",
    torso: "elder_plate",
    gauntlets: "elder_gauntlets",
    legs: "elder_greaves",
    boots: "elder_sabatons",
    hpOverride: 900,
    speedMultiplier: 0.5,
    scale: 2.0,
    horseArmor: "heavy",
  },
  {
    id: "cataphract",
    name: "Cataphract",
    icon: "🐴",
    description: "Fully armored cavalry, morning star & tower shield",
    mainHand: "morning_star",
    offHand: "tower_shield",
    head: "great_helm",
    torso: "plate_cuirass",
    gauntlets: "plate_gauntlets",
    legs: "plate_greaves",
    boots: "plate_sabatons",
    hpOverride: 280,
    speedMultiplier: 0.8,
    horseArmor: "heavy",
  },
  {
    id: "heavy_lancer",
    name: "Heavy Lancer",
    icon: "♞",
    description: "Devastating charge, massive lance & pavise",
    mainHand: "lance",
    offHand: "pavise",
    head: "great_helm",
    torso: "plate_cuirass",
    gauntlets: "plate_gauntlets",
    legs: "plate_greaves",
    boots: "plate_sabatons",
    hpOverride: 300,
    speedMultiplier: 0.75,
    horseArmor: "heavy",
  },
  {
    id: "giant_cavalry",
    name: "Giant Cavalry",
    icon: "💪",
    description: "War giant mounted on a colossal warhorse",
    mainHand: "giant_lance",
    offHand: null,
    head: "giant_helm",
    torso: "giant_plate",
    gauntlets: "giant_gauntlets",
    legs: "giant_greaves",
    boots: "giant_sabatons",
    hpOverride: 1300,
    speedMultiplier: 0.45,
    scale: 2.5,
    horseArmor: "heavy",
  },
  // ---- Temple units ----
  {
    id: "novice_priest",
    name: "Novice Priest",
    icon: "🙏",
    description: "Humble healer, staff & light robes",
    mainHand: "healing_staff",
    offHand: null,
    head: "healing_hat",
    torso: "priest_robes",
    gauntlets: "cloth_wraps",
    legs: "healing_robe_skirt",
    boots: "robe_boots",
    hpOverride: 60,
    speedMultiplier: 0.8,
  },
  {
    id: "monk",
    name: "Monk",
    icon: "🧘",
    description: "Martial healer, staff fighting, light armor",
    mainHand: "healing_staff",
    offHand: null,
    head: "healing_hat",
    torso: "priest_robes",
    gauntlets: "cloth_wraps",
    legs: "healing_robe_skirt",
    boots: "robe_boots",
    hpOverride: 80,
    speedMultiplier: 1.0,
  },
  {
    id: "cleric",
    name: "Cleric",
    icon: "⛪",
    description: "Armored healer, mace & shield",
    mainHand: "cleric_staff",
    offHand: null,
    head: "healing_hat",
    torso: "cleric_robes",
    gauntlets: "cloth_wraps",
    legs: "healing_robe_skirt",
    boots: "robe_boots",
    hpOverride: 120,
    speedMultiplier: 0.9,
  },
  {
    id: "saint",
    name: "Saint",
    icon: "✨",
    description: "Divine healer, radiant & resilient",
    mainHand: "saint_staff",
    offHand: null,
    head: "healing_hat",
    torso: "saint_robes",
    gauntlets: "cloth_wraps",
    legs: "healing_robe_skirt",
    boots: "robe_boots",
    hpOverride: 200,
    speedMultiplier: 0.75,
  },
  {
    id: "templar",
    name: "Templar",
    icon: "✝️",
    description: "Holy knight, sword & shield, blessed armor",
    mainHand: "arming_sword",
    offHand: "heater_shield",
    head: "great_helm",
    torso: "plate_cuirass",
    gauntlets: "plate_gauntlets",
    legs: "plate_greaves",
    boots: "plate_sabatons",
    hpOverride: 150,
    speedMultiplier: 0.9,
  },
  {
    id: "angel",
    name: "Angel",
    icon: "👼",
    description: "Divine celestial warrior, blazing sword, immense power",
    mainHand: "angel_sword",
    offHand: null,
    head: "",
    torso: "",
    gauntlets: "",
    legs: "",
    boots: "",
    hpOverride: 1500,
    speedMultiplier: 1.0,
    scale: 3.0,
  },
  // ---- Mage Tower units ----
  {
    id: "fire_mage",
    name: "Fire Mage",
    icon: "🔥",
    description: "Pyromancer with a staff, light robes",
    mainHand: "fire_staff",
    offHand: null,
    head: "fire_mage_hat",
    torso: "fire_mage_robes",
    gauntlets: "cloth_wraps",
    legs: "fire_robe_skirt",
    boots: "robe_boots",
    hpOverride: 60,
    speedMultiplier: 0.75,
  },
  {
    id: "storm_mage",
    name: "Storm Mage",
    icon: "⚡",
    description: "Lightning caller with a staff, light robes",
    mainHand: "storm_staff",
    offHand: null,
    head: "storm_mage_hat",
    torso: "storm_mage_robes",
    gauntlets: "cloth_wraps",
    legs: "storm_robe_skirt",
    boots: "robe_boots",
    hpOverride: 60,
    speedMultiplier: 0.75,
  },
  {
    id: "cold_mage",
    name: "Cold Mage",
    icon: "❄️",
    description: "Frost sorcerer with a staff, light robes",
    mainHand: "cold_staff",
    offHand: null,
    head: "cold_mage_hat",
    torso: "cold_mage_robes",
    gauntlets: "cloth_wraps",
    legs: "cold_robe_skirt",
    boots: "robe_boots",
    hpOverride: 60,
    speedMultiplier: 0.75,
  },
  {
    id: "distortion_mage",
    name: "Distortion Mage",
    icon: "🌀",
    description: "Reality-bending sorcerer, staff, light robes",
    mainHand: "distortion_staff",
    offHand: null,
    head: "distortion_mage_hat",
    torso: "distortion_mage_robes",
    gauntlets: "cloth_wraps",
    legs: "distortion_robe_skirt",
    boots: "robe_boots",
    hpOverride: 60,
    speedMultiplier: 0.75,
  },
  {
    id: "fire_adept_mage",
    name: "Fire Adept",
    icon: "🔥",
    description: "Adept pyromancer, enchanted staff, adept robes",
    mainHand: "fire_adept_staff",
    offHand: null,
    head: "fire_mage_hat",
    torso: "fire_adept_robes",
    gauntlets: "cloth_wraps",
    legs: "fire_robe_skirt",
    boots: "robe_boots",
    hpOverride: 100,
    speedMultiplier: 0.8,
  },
  {
    id: "cold_adept_mage",
    name: "Cold Adept",
    icon: "❄️",
    description: "Adept frost mage, enchanted staff, adept robes",
    mainHand: "cold_adept_staff",
    offHand: null,
    head: "cold_mage_hat",
    torso: "cold_adept_robes",
    gauntlets: "cloth_wraps",
    legs: "cold_robe_skirt",
    boots: "robe_boots",
    hpOverride: 100,
    speedMultiplier: 0.8,
  },
  {
    id: "lightning_adept_mage",
    name: "Lightning Adept",
    icon: "⚡",
    description: "Adept storm mage, enchanted staff, adept robes",
    mainHand: "lightning_adept_staff",
    offHand: null,
    head: "storm_mage_hat",
    torso: "lightning_adept_robes",
    gauntlets: "cloth_wraps",
    legs: "storm_robe_skirt",
    boots: "robe_boots",
    hpOverride: 100,
    speedMultiplier: 0.8,
  },
  {
    id: "distortion_adept_mage",
    name: "Distortion Adept",
    icon: "🌀",
    description: "Adept distortion mage, enchanted staff, adept robes",
    mainHand: "distortion_adept_staff",
    offHand: null,
    head: "distortion_mage_hat",
    torso: "distortion_adept_robes",
    gauntlets: "cloth_wraps",
    legs: "distortion_robe_skirt",
    boots: "robe_boots",
    hpOverride: 100,
    speedMultiplier: 0.8,
  },
  {
    id: "fire_master_mage",
    name: "Fire Master",
    icon: "🔥",
    description: "Grandmaster pyromancer, master staff, master robes",
    mainHand: "fire_master_staff",
    offHand: null,
    head: "fire_mage_hat",
    torso: "fire_master_robes",
    gauntlets: "cloth_wraps",
    legs: "fire_robe_skirt",
    boots: "robe_boots",
    hpOverride: 200,
    speedMultiplier: 0.8,
  },
  {
    id: "cold_master_mage",
    name: "Cold Master",
    icon: "❄️",
    description: "Grandmaster frost mage, master staff, master robes",
    mainHand: "cold_master_staff",
    offHand: null,
    head: "cold_mage_hat",
    torso: "cold_master_robes",
    gauntlets: "cloth_wraps",
    legs: "cold_robe_skirt",
    boots: "robe_boots",
    hpOverride: 200,
    speedMultiplier: 0.8,
  },
  {
    id: "lightning_master_mage",
    name: "Lightning Master",
    icon: "⚡",
    description: "Grandmaster storm mage, master staff, master robes",
    mainHand: "lightning_master_staff",
    offHand: null,
    head: "storm_mage_hat",
    torso: "lightning_master_robes",
    gauntlets: "cloth_wraps",
    legs: "storm_robe_skirt",
    boots: "robe_boots",
    hpOverride: 200,
    speedMultiplier: 0.8,
  },
  {
    id: "distortion_master_mage",
    name: "Distortion Master",
    icon: "🌀",
    description: "Grandmaster distortion mage, master staff, master robes",
    mainHand: "distortion_master_staff",
    offHand: null,
    head: "distortion_mage_hat",
    torso: "distortion_master_robes",
    gauntlets: "cloth_wraps",
    legs: "distortion_robe_skirt",
    boots: "robe_boots",
    hpOverride: 200,
    speedMultiplier: 0.8,
  },
  {
    id: "summoner",
    name: "Summoner",
    icon: "🔮",
    description: "Conjurer with a staff, summoner robes",
    mainHand: "summoner_staff",
    offHand: null,
    head: "summoner_hat",
    torso: "summoner_robes",
    gauntlets: "cloth_wraps",
    legs: "summoner_robe_skirt",
    boots: "robe_boots",
    hpOverride: 70,
    speedMultiplier: 0.7,
  },
  {
    id: "debuffer_warlock",
    name: "Debuffer Warlock",
    icon: "🦇",
    description: "Shadow mage, warlock staff, dark robes",
    mainHand: "warlock_staff",
    offHand: null,
    head: "warlock_hat",
    torso: "warlock_robes",
    gauntlets: "cloth_wraps",
    legs: "warlock_robe_skirt",
    boots: "robe_boots",
    hpOverride: 80,
    speedMultiplier: 0.7,
  },
  {
    id: "constructionist",
    name: "Constructionist",
    icon: "🔧",
    description: "Builder-mage, constructionist staff, work robes",
    mainHand: "constructionist_staff",
    offHand: null,
    head: "constructionist_hat",
    torso: "constructionist_robes",
    gauntlets: "cloth_wraps",
    legs: "constructionist_robe_skirt",
    boots: "robe_boots",
    hpOverride: 90,
    speedMultiplier: 0.8,
  },
  {
    id: "dark_savant",
    name: "Dark Savant",
    icon: "💀",
    description: "Master of dark arts, dark savant staff & robes",
    mainHand: "dark_savant_staff",
    offHand: null,
    head: "dark_savant_hat",
    torso: "dark_savant_robes",
    gauntlets: "cloth_wraps",
    legs: "dark_savant_robe_skirt",
    boots: "robe_boots",
    hpOverride: 200,
    speedMultiplier: 0.75,
  },
  // ---- Elite Mage Tower units ----
  {
    id: "battlemage",
    name: "Battlemage",
    icon: "⚔🔮",
    description: "War sorcerer, battlemage staff & enchanted robes",
    mainHand: "battlemage_staff",
    offHand: null,
    head: "battlemage_hat",
    torso: "battlemage_robes",
    gauntlets: "cloth_wraps",
    legs: "battlemage_robe_skirt",
    boots: "robe_boots",
    hpOverride: 550,
    speedMultiplier: 0.7,
  },
  {
    id: "giant_mage",
    name: "Giant Mage",
    icon: "💪",
    description: "Ancient giant channelling primal sorcery through a rune staff",
    mainHand: "giant_staff",
    offHand: null,
    head: "giant_helm",
    torso: "giant_plate",
    gauntlets: "giant_gauntlets",
    legs: "giant_greaves",
    boots: "giant_sabatons",
    hpOverride: 600,
    speedMultiplier: 0.4,
    scale: 2.5,
  },
  // ---- Creature Den units ----
  {
    id: "spider",
    name: "Spider",
    icon: "🕷️",
    description: "Fast venomous arachnid, low HP but quick strikes",
    mainHand: "",
    offHand: null,
    head: "", torso: "", gauntlets: "", legs: "", boots: "",
    creatureType: "spider",
  },
  {
    id: "giant_frog",
    name: "Giant Frog",
    icon: "🐸",
    description: "Huge amphibian with a devastating tongue lash",
    mainHand: "",
    offHand: null,
    head: "", torso: "", gauntlets: "", legs: "", boots: "",
    creatureType: "giant_frog",
  },
  {
    id: "rhino",
    name: "Rhino",
    icon: "🦏",
    description: "Armored beast that charges with tremendous force",
    mainHand: "",
    offHand: null,
    head: "", torso: "", gauntlets: "", legs: "", boots: "",
    creatureType: "rhino",
  },
  {
    id: "vampire_bat",
    name: "Vampire Bat",
    icon: "🦇",
    description: "Winged horror, fast and draining, regenerates health",
    mainHand: "",
    offHand: null,
    head: "", torso: "", gauntlets: "", legs: "", boots: "",
    creatureType: "vampire_bat",
  },
  {
    id: "red_dragon",
    name: "Red Dragon",
    icon: "🐉",
    description: "Legendary fire-breathing dragon, devastating in combat",
    mainHand: "",
    offHand: null,
    head: "", torso: "", gauntlets: "", legs: "", boots: "",
    creatureType: "red_dragon",
  },
  {
    id: "fire_elemental",
    name: "Fire Elemental",
    icon: "🔥",
    description: "Living flame, searing heat melts armor and flesh",
    mainHand: "",
    offHand: null,
    head: "", torso: "", gauntlets: "", legs: "", boots: "",
    creatureType: "fire_elemental",
  },
  {
    id: "ice_elemental",
    name: "Ice Elemental",
    icon: "❄️",
    description: "Frozen titan, crystalline body chills all nearby",
    mainHand: "",
    offHand: null,
    head: "", torso: "", gauntlets: "", legs: "", boots: "",
    creatureType: "ice_elemental",
  },
  {
    id: "earth_elemental",
    name: "Earth Elemental",
    icon: "🪨",
    description: "Living mountain of stone and moss, nearly indestructible",
    mainHand: "",
    offHand: null,
    head: "", torso: "", gauntlets: "", legs: "", boots: "",
    creatureType: "earth_elemental",
  },
  {
    id: "frost_dragon",
    name: "Frost Dragon",
    icon: "🐲",
    description: "Ice-breathing dragon, freezing winds and razor scales",
    mainHand: "",
    offHand: null,
    head: "", torso: "", gauntlets: "", legs: "", boots: "",
    creatureType: "frost_dragon",
  },
  {
    id: "fire_dragon",
    name: "Fire Dragon",
    icon: "🐉",
    description: "Ancient fire dragon, massive and armored, incinerates all",
    mainHand: "",
    offHand: null,
    head: "", torso: "", gauntlets: "", legs: "", boots: "",
    creatureType: "fire_dragon",
  },
  {
    id: "ice_dragon",
    name: "Ice Dragon",
    icon: "🐲",
    description: "Ancient ice dragon, encases foes in glacial frost",
    mainHand: "",
    offHand: null,
    head: "", torso: "", gauntlets: "", legs: "", boots: "",
    creatureType: "ice_dragon",
  },
  {
    id: "lightning_elemental",
    name: "Lightning Elemental",
    icon: "⚡",
    description: "Crackling storm entity, arcs of electricity lash out",
    mainHand: "",
    offHand: null,
    head: "", torso: "", gauntlets: "", legs: "", boots: "",
    creatureType: "lightning_elemental",
  },
  {
    id: "distortion_elemental",
    name: "Distortion Elemental",
    icon: "🌀",
    description: "Reality-warping void spirit, bends space around it",
    mainHand: "",
    offHand: null,
    head: "", torso: "", gauntlets: "", legs: "", boots: "",
    creatureType: "distortion_elemental",
  },
  {
    id: "minor_fire_elemental",
    name: "Minor Fire Elemental",
    icon: "🔥",
    description: "Small but fierce flame spirit, searing touch",
    mainHand: "",
    offHand: null,
    head: "", torso: "", gauntlets: "", legs: "", boots: "",
    creatureType: "minor_fire_elemental",
  },
  {
    id: "minor_ice_elemental",
    name: "Minor Ice Elemental",
    icon: "❄️",
    description: "Lesser frost spirit, chilling aura slows enemies",
    mainHand: "",
    offHand: null,
    head: "", torso: "", gauntlets: "", legs: "", boots: "",
    creatureType: "minor_ice_elemental",
  },
  {
    id: "minor_lightning_elemental",
    name: "Minor Lightning Elemental",
    icon: "⚡",
    description: "Small crackling spark entity, quick and shocking",
    mainHand: "",
    offHand: null,
    head: "", torso: "", gauntlets: "", legs: "", boots: "",
    creatureType: "minor_lightning_elemental",
  },
  {
    id: "minor_distortion_elemental",
    name: "Minor Distortion Elemental",
    icon: "🌀",
    description: "Lesser void wisp, warps nearby space subtly",
    mainHand: "",
    offHand: null,
    head: "", torso: "", gauntlets: "", legs: "", boots: "",
    creatureType: "minor_distortion_elemental",
  },
  {
    id: "minor_earth_elemental",
    name: "Minor Earth Elemental",
    icon: "🪨",
    description: "Small stone golem, sturdy and relentless",
    mainHand: "",
    offHand: null,
    head: "", torso: "", gauntlets: "", legs: "", boots: "",
    creatureType: "minor_earth_elemental",
  },
  {
    id: "fire_imp",
    name: "Fire Imp",
    icon: "👿",
    description: "Tiny flying fire creature, quick elemental strikes",
    mainHand: "",
    offHand: null,
    head: "", torso: "", gauntlets: "", legs: "", boots: "",
    creatureType: "fire_imp",
  },
  {
    id: "ice_imp",
    name: "Ice Imp",
    icon: "👿",
    description: "Tiny flying frost creature, chilling elemental strikes",
    mainHand: "",
    offHand: null,
    head: "", torso: "", gauntlets: "", legs: "", boots: "",
    creatureType: "ice_imp",
  },
  {
    id: "lightning_imp",
    name: "Lightning Imp",
    icon: "👿",
    description: "Tiny flying spark creature, shocking elemental strikes",
    mainHand: "",
    offHand: null,
    head: "", torso: "", gauntlets: "", legs: "", boots: "",
    creatureType: "lightning_imp",
  },
  {
    id: "distortion_imp",
    name: "Distortion Imp",
    icon: "👿",
    description: "Tiny flying void creature, warping elemental strikes",
    mainHand: "",
    offHand: null,
    head: "", torso: "", gauntlets: "", legs: "", boots: "",
    creatureType: "distortion_imp",
  },
  {
    id: "void_snail",
    name: "Void Snail",
    icon: "🐌",
    description: "Slow but durable, distorts space around its shell",
    mainHand: "",
    offHand: null,
    head: "", torso: "", gauntlets: "", legs: "", boots: "",
    creatureType: "void_snail",
  },
  {
    id: "faery_queen",
    name: "Faery Queen",
    icon: "🧚",
    description: "Ethereal fae royalty, devastating magical attacks",
    mainHand: "",
    offHand: null,
    head: "", torso: "", gauntlets: "", legs: "", boots: "",
    creatureType: "faery_queen",
  },
  {
    id: "devourer",
    name: "Devourer",
    icon: "👄",
    description: "Gaping maw creature that pulls and consumes prey",
    mainHand: "",
    offHand: null,
    head: "", torso: "", gauntlets: "", legs: "", boots: "",
    creatureType: "devourer",
  },
  {
    id: "pixie",
    name: "Pixie",
    icon: "✨",
    description: "Tiny ethereal sprite, incredibly fast, stinging attacks",
    mainHand: "",
    offHand: null,
    head: "", torso: "", gauntlets: "", legs: "", boots: "",
    creatureType: "pixie",
  },
  {
    id: "bat",
    name: "Bat",
    icon: "🦇",
    description: "Swift flying creature, swarming melee attacks",
    mainHand: "",
    offHand: null,
    head: "", torso: "", gauntlets: "", legs: "", boots: "",
    creatureType: "bat",
  },
  // ---- Siege Workshop units ----
  {
    id: "battering_ram",
    name: "Battering Ram",
    icon: "🪵",
    description: "Heavy wheeled ram, devastating against fortifications",
    mainHand: "",
    offHand: null,
    head: "", torso: "", gauntlets: "", legs: "", boots: "",
    creatureType: "battering_ram",
  },
  {
    id: "catapult",
    name: "Catapult",
    icon: "💥",
    description: "Hurls boulders in a high arc, crushing foes from range",
    mainHand: "",
    offHand: null,
    head: "", torso: "", gauntlets: "", legs: "", boots: "",
    creatureType: "catapult",
  },
  {
    id: "trebuchet",
    name: "Trebuchet",
    icon: "🏗️",
    description: "Colossal counterweight siege engine, extreme range",
    mainHand: "",
    offHand: null,
    head: "", torso: "", gauntlets: "", legs: "", boots: "",
    creatureType: "trebuchet",
  },
  {
    id: "ballista",
    name: "Ballista",
    icon: "🏹",
    description: "Giant crossbow that fires massive bolts with deadly precision",
    mainHand: "",
    offHand: null,
    head: "", torso: "", gauntlets: "", legs: "", boots: "",
    creatureType: "ballista",
  },
  // ---- Elite Siege Workshop units ----
  {
    id: "cannon",
    name: "Cannon",
    icon: "💣",
    description: "Black-powder siege cannon, obliterates anything in its path",
    mainHand: "",
    offHand: null,
    head: "", torso: "", gauntlets: "", legs: "", boots: "",
    creatureType: "cannon",
  },
  {
    id: "giant_siege",
    name: "Siege Giant",
    icon: "👹",
    description: "Colossal boulder-throwing giant, cracks castle walls",
    mainHand: "",
    offHand: null,
    head: "", torso: "", gauntlets: "", legs: "", boots: "",
    creatureType: "giant_siege",
  },
  {
    id: "bolt_thrower",
    name: "Bolt Thrower",
    icon: "🏹",
    description: "Heavy double-arm war machine, devastating at long range",
    mainHand: "",
    offHand: null,
    head: "", torso: "", gauntlets: "", legs: "", boots: "",
    creatureType: "bolt_thrower",
  },
  {
    id: "siege_catapult",
    name: "Siege Catapult",
    icon: "💥",
    description: "Massive reinforced catapult, hurls enormous boulders",
    mainHand: "",
    offHand: null,
    head: "", torso: "", gauntlets: "", legs: "", boots: "",
    creatureType: "siege_catapult",
  },
  {
    id: "war_wagon",
    name: "War Wagon",
    icon: "🪵",
    description: "Iron-banded armored wagon bristling with bolt launchers",
    mainHand: "",
    offHand: null,
    head: "", torso: "", gauntlets: "", legs: "", boots: "",
    creatureType: "war_wagon",
  },
  {
    id: "bombard",
    name: "Bombard",
    icon: "💥",
    description: "Massive bronze cannon, crushes anything in its path",
    mainHand: "",
    offHand: null,
    head: "", torso: "", gauntlets: "", legs: "", boots: "",
    creatureType: "bombard",
  },
  {
    id: "siege_tower",
    name: "Siege Tower",
    icon: "🏰",
    description: "Colossal multi-story tower on iron-shod wheels",
    mainHand: "",
    offHand: null,
    head: "", torso: "", gauntlets: "", legs: "", boots: "",
    creatureType: "siege_tower",
  },
  {
    id: "hellfire_mortar",
    name: "Hellfire Mortar",
    icon: "🔥",
    description: "Squat iron mortar lobbing flaming pitch over vast distances",
    mainHand: "",
    offHand: null,
    head: "", torso: "", gauntlets: "", legs: "", boots: "",
    creatureType: "hellfire_mortar",
  },

  // ===========================================================================
  // FACTION UNITS
  // ===========================================================================

  // ---- Man ---- (halberdier already defined above)
  {
    id: "royal_arbalestier",
    name: "Royal Arbalestier",
    icon: "🎯",
    description: "Elite crossbowman in full plate, heavy pavise",
    mainHand: "arbalest",
    offHand: "pavise",
    head: "great_helm",
    torso: "plate_cuirass",
    gauntlets: "plate_gauntlets",
    legs: "plate_greaves",
    boots: "plate_sabatons",
    hpOverride: 140,
  },
  {
    id: "knight_commander",
    name: "Knight Commander",
    icon: "⚜️",
    description: "Inspiring leader in gilded plate, heals nearby allies",
    mainHand: "healing_staff",
    offHand: "kite_shield",
    head: "great_helm",
    torso: "plate_cuirass",
    gauntlets: "plate_gauntlets",
    legs: "plate_greaves",
    boots: "plate_sabatons",
    hpOverride: 150,
    scale: 1.3,
  },
  {
    id: "war_chaplain",
    name: "War Chaplain",
    icon: "📿",
    description: "Battlefield healer in surcoat over mail",
    mainHand: "healing_staff",
    offHand: null,
    head: "kettle_hat",
    torso: "surcoat_over_mail",
    gauntlets: "mail_gauntlets",
    legs: "mail_chausses",
    boots: "leather_boots",
    hpOverride: 120,
  },
  {
    id: "shield_captain",
    name: "Shield Captain",
    icon: "🛡️",
    description: "Immovable tank with tower shield, full plate",
    mainHand: "arming_sword",
    offHand: "tower_shield",
    head: "great_helm",
    torso: "plate_cuirass",
    gauntlets: "plate_gauntlets",
    legs: "plate_greaves",
    boots: "plate_sabatons",
    hpOverride: 280,
  },

  // ---- Elves ----
  {
    id: "elven_archer",
    name: "Elven Archer",
    icon: "🏹",
    description: "Swift forest archer with war bow",
    mainHand: "war_bow",
    offHand: null,
    head: "cloth_hood",
    torso: "leather_jerkin",
    gauntlets: "leather_gloves",
    legs: "leather_leggings",
    boots: "leather_boots",
  },
  {
    id: "bladedancer",
    name: "Bladedancer",
    icon: "💃",
    description: "Lightning-fast elven swordfighter",
    mainHand: "sabre",
    offHand: null,
    head: "cloth_hood",
    torso: "leather_jerkin",
    gauntlets: "leather_gloves",
    legs: "leather_leggings",
    boots: "leather_boots",
    speedMultiplier: 1.3,
  },
  {
    id: "treant_guardian",
    name: "Treant Guardian",
    icon: "🌳",
    description: "Massive tree warrior, slow but regenerating",
    mainHand: "",
    offHand: null,
    head: "",
    torso: "",
    gauntlets: "",
    legs: "",
    boots: "",
    creatureType: "treant",
    hpOverride: 350,
    scale: 2.0,
    speedMultiplier: 0.6,
  },
  {
    id: "moonweaver",
    name: "Moonweaver",
    icon: "🌙",
    description: "Elven distortion mage, warps reality",
    mainHand: "distortion_adept_staff",
    offHand: null,
    head: "distortion_mage_hat",
    torso: "distortion_adept_robes",
    gauntlets: "cloth_wraps",
    legs: "distortion_robe_skirt",
    boots: "robe_boots",
    hpOverride: 65,
    speedMultiplier: 0.8,
  },

  // ---- The Horde ----
  {
    id: "warchief",
    name: "Warchief",
    icon: "⚔️",
    description: "Brutal horde leader with battle axe",
    mainHand: "battle_axe",
    offHand: null,
    head: "nasal_helm",
    torso: "chain_hauberk",
    gauntlets: "mail_gauntlets",
    legs: "mail_chausses",
    boots: "mail_boots",
    hpOverride: 160,
  },
  {
    id: "boar_rider",
    name: "Boar Rider",
    icon: "🐗",
    description: "Charging horde cavalry on a war boar",
    mainHand: "lance",
    offHand: "round_shield",
    head: "nasal_helm",
    torso: "mail_shirt",
    gauntlets: "leather_gloves",
    legs: "leather_leggings",
    boots: "leather_boots",
    horseArmor: "light",
    hpOverride: 180,
  },
  {
    id: "siege_troll",
    name: "Siege Troll",
    icon: "🪨",
    description: "Massive troll that hurls boulders at walls",
    mainHand: "",
    offHand: null,
    head: "",
    torso: "",
    gauntlets: "",
    legs: "",
    boots: "",
    creatureType: "siege_troll",
    hpOverride: 250,
    scale: 2.0,
    speedMultiplier: 0.5,
  },
  {
    id: "blood_berserker",
    name: "Blood Berserker",
    icon: "🩸",
    description: "Frenzied fighter, fast attacks, life steal",
    mainHand: "zweihander",
    offHand: null,
    head: "leather_cap",
    torso: "leather_jerkin",
    gauntlets: "leather_gloves",
    legs: "leather_leggings",
    boots: "leather_boots",
    hpOverride: 110,
    speedMultiplier: 1.3,
  },
  {
    id: "horde_archer",
    name: "Horde Archer",
    icon: "🏹",
    description: "Cheap horde ranged unit with short bow",
    mainHand: "short_bow",
    offHand: null,
    head: "cloth_hood",
    torso: "padded_vest",
    gauntlets: "cloth_wraps",
    legs: "cloth_trousers",
    boots: "leather_boots",
  },
  {
    id: "horde_healer",
    name: "Horde Healer",
    icon: "💚",
    description: "Tribal healer with healing staff",
    mainHand: "healing_staff",
    offHand: null,
    head: "healing_hat",
    torso: "priest_robes",
    gauntlets: "cloth_wraps",
    legs: "healing_robe_skirt",
    boots: "robe_boots",
    hpOverride: 70,
    speedMultiplier: 0.7,
  },

  // ---- The Adept ----
  {
    id: "archmage",
    name: "Archmage",
    icon: "🔥",
    description: "Master pyromancer with regenerating mana",
    mainHand: "fire_master_staff",
    offHand: null,
    head: "fire_mage_hat",
    torso: "fire_master_robes",
    gauntlets: "cloth_wraps",
    legs: "fire_robe_skirt",
    boots: "robe_boots",
    hpOverride: 80,
    speedMultiplier: 0.75,
  },
  {
    id: "chronomancer",
    name: "Chronomancer",
    icon: "⏳",
    description: "Time-bending mage, distortion and ice magic",
    mainHand: "distortion_adept_staff",
    offHand: null,
    head: "distortion_mage_hat",
    torso: "distortion_adept_robes",
    gauntlets: "cloth_wraps",
    legs: "distortion_robe_skirt",
    boots: "robe_boots",
    hpOverride: 70,
    speedMultiplier: 0.75,
  },
  {
    id: "spell_weaver",
    name: "Spell Weaver",
    icon: "✨",
    description: "Multi-element mage, fire and lightning",
    mainHand: "fire_adept_staff",
    offHand: null,
    head: "fire_mage_hat",
    torso: "fire_adept_robes",
    gauntlets: "cloth_wraps",
    legs: "fire_robe_skirt",
    boots: "robe_boots",
    hpOverride: 75,
    speedMultiplier: 0.75,
  },
  {
    id: "mana_wraith",
    name: "Mana Wraith",
    icon: "👻",
    description: "Fast distortion spirit, drains enemy magic",
    mainHand: "",
    offHand: null,
    head: "",
    torso: "",
    gauntlets: "",
    legs: "",
    boots: "",
    creatureType: "mana_wraith",
    hpOverride: 50,
    speedMultiplier: 1.1,
  },
  {
    id: "blade_adept",
    name: "Blade Adept",
    icon: "⚔️",
    description: "Sword-wielding mage with critical strikes",
    mainHand: "longsword",
    offHand: "buckler",
    head: "leather_cap",
    torso: "mail_shirt",
    gauntlets: "leather_gloves",
    legs: "leather_leggings",
    boots: "leather_boots",
  },

  // ---- The Elements ----
  {
    id: "elemental_avatar",
    name: "Elemental Avatar",
    icon: "🔥",
    description: "Incarnation of fire, massive elemental power",
    mainHand: "",
    offHand: null,
    head: "",
    torso: "",
    gauntlets: "",
    legs: "",
    boots: "",
    creatureType: "elemental_avatar",
    hpOverride: 250,
    scale: 1.5,
    speedMultiplier: 0.8,
  },
  {
    id: "storm_conduit",
    name: "Storm Conduit",
    icon: "⚡",
    description: "Living lightning storm, chain attacks",
    mainHand: "",
    offHand: null,
    head: "",
    torso: "",
    gauntlets: "",
    legs: "",
    boots: "",
    creatureType: "storm_conduit",
    hpOverride: 200,
    scale: 1.5,
    speedMultiplier: 0.9,
  },
  {
    id: "frost_wyrm",
    name: "Frost Wyrm",
    icon: "🐉",
    description: "Ancient ice serpent, frost breath",
    mainHand: "",
    offHand: null,
    head: "",
    torso: "",
    gauntlets: "",
    legs: "",
    boots: "",
    creatureType: "frost_wyrm",
    hpOverride: 220,
    scale: 2.0,
    speedMultiplier: 0.8,
  },
  {
    id: "magma_titan",
    name: "Magma Titan",
    icon: "🌋",
    description: "Colossal molten giant, fire aura",
    mainHand: "",
    offHand: null,
    head: "",
    torso: "",
    gauntlets: "",
    legs: "",
    boots: "",
    creatureType: "magma_titan",
    hpOverride: 400,
    scale: 2.5,
    speedMultiplier: 0.4,
  },
  {
    id: "stone_fist",
    name: "Stone Fist",
    icon: "✊",
    description: "Earth elemental warrior, tough and blocking",
    mainHand: "",
    offHand: null,
    head: "",
    torso: "",
    gauntlets: "",
    legs: "",
    boots: "",
    creatureType: "stone_fist",
    hpOverride: 180,
    scale: 1.3,
    speedMultiplier: 0.6,
  },

  // ---- Halflings ----
  {
    id: "halfling_slinger",
    name: "Halfling Slinger",
    icon: "🪨",
    description: "Nimble halfling with deadly sling stones",
    mainHand: "throwing_axes",
    offHand: null,
    head: "cloth_hood",
    torso: "padded_vest",
    gauntlets: "cloth_wraps",
    legs: "cloth_trousers",
    boots: "leather_boots",
    scale: 0.7,
    speedMultiplier: 1.2,
  },
  {
    id: "halfling_chef",
    name: "Halfling Chef",
    icon: "🍳",
    description: "Heals allies with hearty meals",
    mainHand: "healing_staff",
    offHand: null,
    head: "healing_hat",
    torso: "priest_robes",
    gauntlets: "cloth_wraps",
    legs: "healing_robe_skirt",
    boots: "robe_boots",
    scale: 0.7,
    hpOverride: 90,
    speedMultiplier: 0.9,
  },
  {
    id: "halfling_burglar",
    name: "Halfling Burglar",
    icon: "🗡️",
    description: "Lightning-fast rogue with daggers",
    mainHand: "short_sword",
    offHand: null,
    head: "cloth_hood",
    torso: "leather_jerkin",
    gauntlets: "leather_gloves",
    legs: "leather_leggings",
    boots: "leather_boots",
    scale: 0.7,
    speedMultiplier: 1.4,
  },
  {
    id: "halfling_rider",
    name: "Halfling Rider",
    icon: "🐴",
    description: "Halfling pony rider, fast charge",
    mainHand: "lance",
    offHand: "round_shield",
    head: "leather_cap",
    torso: "leather_jerkin",
    gauntlets: "leather_gloves",
    legs: "leather_leggings",
    boots: "riding_boots",
    horseArmor: "light",
    scale: 0.7,
  },
  {
    id: "halfling_alchemist",
    name: "Halfling Alchemist",
    icon: "🧪",
    description: "Throws explosive fire potions",
    mainHand: "fire_staff",
    offHand: null,
    head: "fire_mage_hat",
    torso: "fire_mage_robes",
    gauntlets: "cloth_wraps",
    legs: "fire_robe_skirt",
    boots: "robe_boots",
    scale: 0.7,
    hpOverride: 50,
    speedMultiplier: 0.9,
  },

  // ---- Lava Children ----
  {
    id: "magma_golem",
    name: "Magma Golem",
    icon: "🌋",
    description: "Molten rock construct, fire aura, regenerates",
    mainHand: "",
    offHand: null,
    head: "",
    torso: "",
    gauntlets: "",
    legs: "",
    boots: "",
    creatureType: "magma_golem",
    hpOverride: 280,
    scale: 1.5,
    speedMultiplier: 0.6,
  },
  {
    id: "lava_shaman",
    name: "Lava Shaman",
    icon: "🔥",
    description: "Fire caster born of the molten deep",
    mainHand: "fire_adept_staff",
    offHand: null,
    head: "fire_mage_hat",
    torso: "fire_adept_robes",
    gauntlets: "cloth_wraps",
    legs: "fire_robe_skirt",
    boots: "robe_boots",
    hpOverride: 100,
    speedMultiplier: 0.75,
  },
  {
    id: "obsidian_sentinel",
    name: "Obsidian Sentinel",
    icon: "🪨",
    description: "Volcanic glass warrior, extremely tough",
    mainHand: "",
    offHand: null,
    head: "",
    torso: "",
    gauntlets: "",
    legs: "",
    boots: "",
    creatureType: "obsidian_sentinel",
    hpOverride: 300,
    scale: 1.3,
    speedMultiplier: 0.5,
  },
  {
    id: "cinder_wraith",
    name: "Cinder Wraith",
    icon: "💨",
    description: "Fast burning spirit, hit and run",
    mainHand: "",
    offHand: null,
    head: "",
    torso: "",
    gauntlets: "",
    legs: "",
    boots: "",
    creatureType: "cinder_wraith",
    speedMultiplier: 1.3,
  },
  {
    id: "volcanic_behemoth",
    name: "Volcanic Behemoth",
    icon: "🌋",
    description: "Colossal lava beast, siege breaker",
    mainHand: "",
    offHand: null,
    head: "",
    torso: "",
    gauntlets: "",
    legs: "",
    boots: "",
    creatureType: "volcanic_behemoth",
    hpOverride: 450,
    scale: 2.5,
    speedMultiplier: 0.35,
  },

  // ---- Dwarves ----
  {
    id: "dwarven_guardian",
    name: "Dwarven Guardian",
    icon: "🛡️",
    description: "Stout shield-bearer, heavy dwarven plate",
    mainHand: "war_axe",
    offHand: "tower_shield",
    head: "great_helm",
    torso: "plate_cuirass",
    gauntlets: "plate_gauntlets",
    legs: "plate_greaves",
    boots: "plate_sabatons",
    hpOverride: 160,
    scale: 0.85,
    speedMultiplier: 0.7,
  },
  {
    id: "runesmith",
    name: "Runesmith",
    icon: "⚡",
    description: "Dwarven lightning mage, rune-powered",
    mainHand: "lightning_adept_staff",
    offHand: null,
    head: "storm_mage_hat",
    torso: "lightning_adept_robes",
    gauntlets: "cloth_wraps",
    legs: "storm_robe_skirt",
    boots: "robe_boots",
    hpOverride: 110,
    scale: 0.85,
    speedMultiplier: 0.7,
  },
  {
    id: "dwarven_cannon",
    name: "Dwarven Cannon",
    icon: "💥",
    description: "Slow-firing but devastating dwarven artillery",
    mainHand: "arbalest",
    offHand: "pavise",
    head: "great_helm",
    torso: "plate_cuirass",
    gauntlets: "plate_gauntlets",
    legs: "plate_greaves",
    boots: "plate_sabatons",
    hpOverride: 150,
    scale: 0.85,
    speedMultiplier: 0.4,
  },
  {
    id: "ironbreaker",
    name: "Ironbreaker",
    icon: "🔨",
    description: "Elite dwarven tank, nearly unbreakable",
    mainHand: "warhammer",
    offHand: "tower_shield",
    head: "great_helm",
    torso: "plate_cuirass",
    gauntlets: "plate_gauntlets",
    legs: "plate_greaves",
    boots: "plate_sabatons",
    hpOverride: 250,
    scale: 0.85,
    speedMultiplier: 0.65,
  },
  {
    id: "thunderer",
    name: "Thunderer",
    icon: "🔫",
    description: "Dwarven handgunner, long range, slow fire",
    mainHand: "heavy_crossbow",
    offHand: null,
    head: "sallet",
    torso: "brigandine",
    gauntlets: "mail_gauntlets",
    legs: "mail_chausses",
    boots: "mail_boots",
    hpOverride: 100,
    scale: 0.85,
    speedMultiplier: 0.7,
  },

  // ---- Orcs ----
  {
    id: "orc_brute",
    name: "Orc Brute",
    icon: "💪",
    description: "Hulking orc warrior, charges into battle",
    mainHand: "battle_axe",
    offHand: null,
    head: "nasal_helm",
    torso: "chain_hauberk",
    gauntlets: "mail_gauntlets",
    legs: "mail_chausses",
    boots: "mail_boots",
    hpOverride: 160,
    scale: 1.2,
  },
  {
    id: "orc_drummer",
    name: "Orc Drummer",
    icon: "🥁",
    description: "War drummer that rallies nearby orcs",
    mainHand: "mace",
    offHand: "round_shield",
    head: "leather_cap",
    torso: "gambeson",
    gauntlets: "leather_gloves",
    legs: "leather_leggings",
    boots: "leather_boots",
    hpOverride: 120,
    scale: 1.1,
  },
  {
    id: "orc_shaman",
    name: "Orc Shaman",
    icon: "🔥",
    description: "Tribal fire caster with primitive staff",
    mainHand: "fire_staff",
    offHand: null,
    head: "fire_mage_hat",
    torso: "fire_mage_robes",
    gauntlets: "cloth_wraps",
    legs: "fire_robe_skirt",
    boots: "robe_boots",
    hpOverride: 90,
    scale: 1.1,
    speedMultiplier: 0.8,
  },
  {
    id: "wyvern_rider",
    name: "Wyvern Rider",
    icon: "🐉",
    description: "Orc on a wyvern, devastating charge",
    mainHand: "lance",
    offHand: null,
    head: "nasal_helm",
    torso: "mail_shirt",
    gauntlets: "leather_gloves",
    legs: "leather_leggings",
    boots: "leather_boots",
    horseArmor: "medium",
    hpOverride: 160,
    scale: 1.2,
  },
  {
    id: "pit_fighter",
    name: "Pit Fighter",
    icon: "⚔️",
    description: "Fast gladiatorial orc, dual weapon style",
    mainHand: "falchion",
    offHand: null,
    head: "leather_cap",
    torso: "leather_jerkin",
    gauntlets: "leather_gloves",
    legs: "leather_leggings",
    boots: "leather_boots",
    scale: 1.1,
    speedMultiplier: 1.2,
  },

  // ---- Undead ----
  {
    id: "death_knight",
    name: "Death Knight",
    icon: "💀",
    description: "Undead heavy cavalry, regenerates health",
    mainHand: "greatsword",
    offHand: null,
    head: "great_helm",
    torso: "plate_cuirass",
    gauntlets: "plate_gauntlets",
    legs: "plate_greaves",
    boots: "plate_sabatons",
    hpOverride: 220,
  },
  {
    id: "necromancer",
    name: "Necromancer",
    icon: "☠️",
    description: "Dark summoner that raises the dead",
    mainHand: "summoner_staff",
    offHand: null,
    head: "summoner_hat",
    torso: "summoner_robes",
    gauntlets: "cloth_wraps",
    legs: "summoner_robe_skirt",
    boots: "robe_boots",
    hpOverride: 75,
    speedMultiplier: 0.75,
  },
  {
    id: "banshee",
    name: "Banshee",
    icon: "👻",
    description: "Wailing spirit, freezing cold attacks",
    mainHand: "",
    offHand: null,
    head: "",
    torso: "",
    gauntlets: "",
    legs: "",
    boots: "",
    creatureType: "banshee",
    hpOverride: 60,
    speedMultiplier: 1.1,
  },
  {
    id: "bone_colossus",
    name: "Bone Colossus",
    icon: "💀",
    description: "Towering skeleton construct, siege breaker",
    mainHand: "",
    offHand: null,
    head: "",
    torso: "",
    gauntlets: "",
    legs: "",
    boots: "",
    creatureType: "bone_colossus",
    hpOverride: 380,
    scale: 2.5,
    speedMultiplier: 0.35,
  },
  {
    id: "wraith_lord",
    name: "Wraith Lord",
    icon: "👤",
    description: "Spectral lord, cold aura, life drain",
    mainHand: "",
    offHand: null,
    head: "",
    torso: "",
    gauntlets: "",
    legs: "",
    boots: "",
    creatureType: "wraith_lord",
    hpOverride: 130,
    speedMultiplier: 1.0,
  },

  // ---- Demons ----
  {
    id: "pit_lord",
    name: "Pit Lord",
    icon: "😈",
    description: "Massive demon lord, fire breath, regenerates",
    mainHand: "",
    offHand: null,
    head: "",
    torso: "",
    gauntlets: "",
    legs: "",
    boots: "",
    creatureType: "pit_lord",
    hpOverride: 320,
    scale: 2.0,
    speedMultiplier: 0.6,
  },
  {
    id: "hellfire_warlock",
    name: "Hellfire Warlock",
    icon: "🔥",
    description: "Demonic fire caster, summons fire imps",
    mainHand: "fire_master_staff",
    offHand: null,
    head: "warlock_hat",
    torso: "warlock_robes",
    gauntlets: "cloth_wraps",
    legs: "warlock_robe_skirt",
    boots: "robe_boots",
    hpOverride: 85,
    speedMultiplier: 0.75,
  },
  {
    id: "succubus",
    name: "Succubus",
    icon: "😈",
    description: "Charming demon, entangles enemies",
    mainHand: "",
    offHand: null,
    head: "",
    torso: "",
    gauntlets: "",
    legs: "",
    boots: "",
    creatureType: "succubus",
    hpOverride: 90,
    speedMultiplier: 1.0,
  },
  {
    id: "doom_guard",
    name: "Doom Guard",
    icon: "⚔️",
    description: "Towering demon warrior, heavy melee",
    mainHand: "",
    offHand: null,
    head: "",
    torso: "",
    gauntlets: "",
    legs: "",
    boots: "",
    creatureType: "doom_guard",
    hpOverride: 220,
    scale: 1.5,
  },
  {
    id: "imp_overlord",
    name: "Imp Overlord",
    icon: "👹",
    description: "Commands hordes of fire imps",
    mainHand: "",
    offHand: null,
    head: "",
    torso: "",
    gauntlets: "",
    legs: "",
    boots: "",
    creatureType: "imp_overlord",
    hpOverride: 80,
    speedMultiplier: 0.75,
  },

  // ---- Angels ----
  {
    id: "seraphim",
    name: "Seraphim",
    icon: "👼",
    description: "Radiant angelic healer, powerful restoration",
    mainHand: "",
    offHand: null,
    head: "",
    torso: "",
    gauntlets: "",
    legs: "",
    boots: "",
    creatureType: "seraphim",
    hpOverride: 150,
    speedMultiplier: 1.0,
  },
  {
    id: "divine_champion",
    name: "Divine Champion",
    icon: "⚔️",
    description: "Holy warrior in shining armor",
    mainHand: "angel_sword",
    offHand: "heater_shield",
    head: "great_helm",
    torso: "plate_cuirass",
    gauntlets: "plate_gauntlets",
    legs: "plate_greaves",
    boots: "plate_sabatons",
    hpOverride: 140,
  },
  {
    id: "valkyrie",
    name: "Valkyrie",
    icon: "⚔️",
    description: "Charging angelic warrior, swift and deadly",
    mainHand: "lance",
    offHand: "kite_shield",
    head: "bascinet",
    torso: "brigandine",
    gauntlets: "plate_gauntlets",
    legs: "plate_greaves",
    boots: "plate_sabatons",
    hpOverride: 130,
    speedMultiplier: 1.2,
  },
  {
    id: "archon",
    name: "Archon",
    icon: "✨",
    description: "Supreme angelic warrior, regenerates",
    mainHand: "",
    offHand: null,
    head: "",
    torso: "",
    gauntlets: "",
    legs: "",
    boots: "",
    creatureType: "archon",
    hpOverride: 180,
    scale: 1.3,
  },
  {
    id: "celestial_archer",
    name: "Celestial Archer",
    icon: "🏹",
    description: "Angelic bowman with divine arrows",
    mainHand: "war_bow",
    offHand: null,
    head: "sallet",
    torso: "brigandine",
    gauntlets: "mail_gauntlets",
    legs: "mail_chausses",
    boots: "mail_boots",
    hpOverride: 90,
  },

  // ---- Beastkin ----
  {
    id: "alpha_wolf",
    name: "Alpha Wolf",
    icon: "🐺",
    description: "Pack leader, fast charging strikes",
    mainHand: "",
    offHand: null,
    head: "",
    torso: "",
    gauntlets: "",
    legs: "",
    boots: "",
    creatureType: "alpha_wolf",
    hpOverride: 130,
    speedMultiplier: 1.4,
  },
  {
    id: "beast_shaman",
    name: "Beast Shaman",
    icon: "🐾",
    description: "Nature summoner, calls wild beasts",
    mainHand: "summoner_staff",
    offHand: null,
    head: "summoner_hat",
    torso: "summoner_robes",
    gauntlets: "cloth_wraps",
    legs: "summoner_robe_skirt",
    boots: "robe_boots",
    hpOverride: 95,
    speedMultiplier: 0.85,
  },
  {
    id: "thunderhawk",
    name: "Thunderhawk",
    icon: "🦅",
    description: "Extremely fast aerial striker",
    mainHand: "",
    offHand: null,
    head: "",
    torso: "",
    gauntlets: "",
    legs: "",
    boots: "",
    creatureType: "thunderhawk",
    hpOverride: 80,
    speedMultiplier: 1.6,
  },
  {
    id: "dire_bear",
    name: "Dire Bear",
    icon: "🐻",
    description: "Massive bear warrior, slow but devastating",
    mainHand: "",
    offHand: null,
    head: "",
    torso: "",
    gauntlets: "",
    legs: "",
    boots: "",
    creatureType: "dire_bear",
    hpOverride: 300,
    scale: 1.8,
    speedMultiplier: 0.7,
  },
  {
    id: "serpent_priest",
    name: "Serpent Priest",
    icon: "🐍",
    description: "Venomous nature caster, debuffs enemies",
    mainHand: "cold_staff",
    offHand: null,
    head: "cold_mage_hat",
    torso: "cold_mage_robes",
    gauntlets: "cloth_wraps",
    legs: "cold_robe_skirt",
    boots: "robe_boots",
    hpOverride: 75,
    speedMultiplier: 0.8,
  },

  // ---- Golem Collective ----
  {
    id: "war_golem",
    name: "War Golem",
    icon: "🤖",
    description: "Massive stone construct, nearly indestructible",
    mainHand: "",
    offHand: null,
    head: "",
    torso: "",
    gauntlets: "",
    legs: "",
    boots: "",
    creatureType: "war_golem",
    hpOverride: 350,
    scale: 1.8,
    speedMultiplier: 0.5,
  },
  {
    id: "rune_core",
    name: "Rune Core",
    icon: "💎",
    description: "Floating rune construct, distortion blasts",
    mainHand: "",
    offHand: null,
    head: "",
    torso: "",
    gauntlets: "",
    legs: "",
    boots: "",
    creatureType: "rune_core",
    hpOverride: 120,
    speedMultiplier: 0.7,
  },
  {
    id: "siege_automaton",
    name: "Siege Automaton",
    icon: "⚙️",
    description: "Giant mechanical siege engine",
    mainHand: "",
    offHand: null,
    head: "",
    torso: "",
    gauntlets: "",
    legs: "",
    boots: "",
    creatureType: "siege_automaton",
    hpOverride: 400,
    scale: 2.5,
    speedMultiplier: 0.35,
  },
  {
    id: "crystal_golem",
    name: "Crystal Golem",
    icon: "💠",
    description: "Crystalline construct, lightning attacks",
    mainHand: "",
    offHand: null,
    head: "",
    torso: "",
    gauntlets: "",
    legs: "",
    boots: "",
    creatureType: "crystal_golem",
    hpOverride: 200,
    scale: 1.3,
    speedMultiplier: 0.6,
  },
  {
    id: "iron_colossus",
    name: "Iron Colossus",
    icon: "🦾",
    description: "Towering iron war machine, unstoppable",
    mainHand: "",
    offHand: null,
    head: "",
    torso: "",
    gauntlets: "",
    legs: "",
    boots: "",
    creatureType: "iron_colossus",
    hpOverride: 500,
    scale: 2.5,
    speedMultiplier: 0.4,
  },

  // ---- Pirates ----
  {
    id: "pirate_captain",
    name: "Pirate Captain",
    icon: "🏴‍☠️",
    description: "Swashbuckling leader with net and sabre",
    mainHand: "sabre",
    offHand: "buckler",
    head: "leather_cap",
    torso: "leather_jerkin",
    gauntlets: "leather_gloves",
    legs: "leather_leggings",
    boots: "riding_boots",
    hpOverride: 140,
  },
  {
    id: "corsair_gunner",
    name: "Corsair Gunner",
    icon: "🔫",
    description: "Ship's gunner, heavy crossbow, devastating shots",
    mainHand: "heavy_crossbow",
    offHand: null,
    head: "leather_cap",
    torso: "gambeson",
    gauntlets: "leather_gloves",
    legs: "leather_leggings",
    boots: "leather_boots",
    hpOverride: 80,
  },
  {
    id: "powder_monkey",
    name: "Powder Monkey",
    icon: "💣",
    description: "Explosive expert, throws fire bombs",
    mainHand: "fire_staff",
    offHand: null,
    head: "fire_mage_hat",
    torso: "fire_mage_robes",
    gauntlets: "cloth_wraps",
    legs: "fire_robe_skirt",
    boots: "robe_boots",
    hpOverride: 60,
    speedMultiplier: 1.0,
  },
  {
    id: "sea_witch",
    name: "Sea Witch",
    icon: "🌊",
    description: "Storm and ice sorceress of the seas",
    mainHand: "lightning_adept_staff",
    offHand: null,
    head: "storm_mage_hat",
    torso: "lightning_adept_robes",
    gauntlets: "cloth_wraps",
    legs: "storm_robe_skirt",
    boots: "robe_boots",
    hpOverride: 70,
    speedMultiplier: 0.8,
  },
  {
    id: "boarding_master",
    name: "Boarding Master",
    icon: "⚔️",
    description: "Lightning-fast melee fighter, dual blades",
    mainHand: "falchion",
    offHand: null,
    head: "leather_cap",
    torso: "leather_jerkin",
    gauntlets: "leather_gloves",
    legs: "leather_leggings",
    boots: "riding_boots",
    speedMultiplier: 1.2,
  },
  {
    id: "buccaneer",
    name: "Buccaneer",
    icon: "🏴‍☠️",
    description: "Tough pirate defender with cutlass and shield",
    mainHand: "arming_sword",
    offHand: "heater_shield",
    head: "kettle_hat",
    torso: "brigandine",
    gauntlets: "mail_gauntlets",
    legs: "mail_chausses",
    boots: "mail_boots",
    hpOverride: 160,
  },
];

// ---------------------------------------------------------------------------
// Leader → spawn unit mapping (determines what the player spawns as in battle)
// ---------------------------------------------------------------------------

const LEADER_SPAWN_UNIT: Record<string, string> = {
  arthur: "cataphract",
  merlin: "lightning_adept_mage",
  guinevere: "royal_guard",
  lancelot: "heavy_lancer",
  morgan: "distortion_adept_mage",
  gawain: "royal_defender",
  galahad: "questing_knight",
  percival: "knight_lancer",
  tristan: "assassin",
  nimue: "cold_adept_mage",
  kay: "royal_phalanx",
  bedivere: "axeman",
  elaine: "marksman",
  mordred: "elder_axeman",
  igraine: "saint",
  pellinore: "giant_warrior",
  ector: "cataphract",
  bors: "royal_defender",
  uther: "giant_cavalry",
  lot: "defender",
  isolde: "saint",
  gareth: "elite_lancer",
  agravain: "royal_guard",
};

function _getLeaderSpawnUnit(leaderId: string): UnitTypeDef {
  const unitId = LEADER_SPAWN_UNIT[leaderId] ?? "cataphract";
  return UNIT_TYPES.find(u => u.id === unitId) ?? UNIT_TYPES.find(u => u.id === "cataphract")!;
}

// ---------------------------------------------------------------------------
// Shop classification – assigns building, tier, cost, faction to each unit
// ---------------------------------------------------------------------------

const WARBAND_SHOP_TABS = [
  { id: "barracks", label: "BARRACKS", color: "#ff6644", desc: "Military training grounds for infantry and specialized warriors. Swordsmen, pikemen, assassins, and heavy defenders are forged here." },
  { id: "archery", label: "ARCHERY", color: "#66cc44", desc: "Training grounds for marksmen who strike from distance with deadly precision. Archers, crossbowmen, and longbowmen hone their aim here." },
  { id: "stables", label: "STABLES", color: "#ddaa44", desc: "Houses and trains mounted cavalry units for swift battlefield mobility. Knights and lancers charge forth to break enemy lines." },
  { id: "siege", label: "SIEGE", color: "#8888aa", desc: "Forge where devastating siege weapons are crafted for destroying fortifications. Ballistae, catapults, and trebuchets rain destruction." },
  { id: "creatures", label: "CREATURES", color: "#cc66cc", desc: "Mystical habitat where legendary creatures are tamed for battle. Dragons, trolls, elementals, and other beasts answer the call." },
  { id: "mages", label: "MAGES", color: "#6688ff", desc: "Arcane academy where elemental mages master fire, ice, lightning, and distortion. Their devastating spells turn the tide of war." },
  { id: "temple", label: "TEMPLE", color: "#ffdd88", desc: "Sacred sanctuary where healers and holy warriors train to support allies. Monks, clerics, and angels channel divine power." },
];

// Maps unit id → [building, isElite?]
const UNIT_BUILDING_MAP: Record<string, [string, boolean?]> = {
  // Basic
  swordsman: ["barracks"], archer: ["archery"], pikeman: ["barracks"], knight: ["barracks"],
  scout_cavalry: ["stables"], horse_archer: ["stables"], lancer: ["stables"],
  crossbowman: ["archery"], skirmisher: ["archery"], halberdier: ["barracks"], berserker: ["barracks"],
  // Creatures (generic)
  troll: ["creatures"], cyclops: ["creatures"],
  // Barracks specialized
  assassin: ["barracks"], mage_hunter: ["barracks"], gladiator: ["barracks"],
  defender: ["barracks"], phalanx: ["barracks"], royal_phalanx: ["barracks"],
  royal_defender: ["barracks"], axeman: ["barracks"], war_drummer: ["barracks"], troubadour: ["barracks"],
  // Ancient & Elder (elite barracks)
  ancient_defender: ["barracks", true], ancient_phalanx: ["barracks", true], ancient_axeman: ["barracks", true],
  elder_defender: ["barracks", true], elder_phalanx: ["barracks", true], elder_axeman: ["barracks", true],
  // Elite Barracks
  royal_guard: ["barracks", true], giant_warrior: ["barracks", true], giant_court_jester: ["barracks", true],
  questing_knight: ["stables", true],
  // Archery Range
  shortbow: ["archery"], longbowman: ["archery"], repeater: ["archery"],
  javelineer: ["archery"], arbalestier: ["archery"],
  // Ancient & Elder Archery (elite)
  ancient_archer: ["archery", true], ancient_longbowman: ["archery", true], ancient_crossbowman: ["archery", true],
  elder_archer: ["archery", true], elder_repeater: ["archery", true], elder_javelineer: ["archery", true],
  marksman: ["archery", true], giant_archer: ["archery", true],
  // Stables
  siege_hunter: ["stables"], elite_lancer: ["stables"], knight_lancer: ["stables"], royal_lancer: ["stables"],
  // Elite Stables
  elder_horse_archer: ["stables", true], cataphract: ["stables", true],
  heavy_lancer: ["stables", true], giant_cavalry: ["stables", true],
  // Temple
  novice_priest: ["temple"], monk: ["temple"], cleric: ["temple"],
  saint: ["temple"], templar: ["temple"], angel: ["temple", true],
  // Mage Tower
  fire_mage: ["mages"], storm_mage: ["mages"], cold_mage: ["mages"], distortion_mage: ["mages"],
  fire_adept_mage: ["mages"], cold_adept_mage: ["mages"],
  lightning_adept_mage: ["mages"], distortion_adept_mage: ["mages"],
  fire_master_mage: ["mages"], cold_master_mage: ["mages"],
  lightning_master_mage: ["mages"], distortion_master_mage: ["mages"],
  summoner: ["mages"], debuffer_warlock: ["mages"], constructionist: ["mages"], dark_savant: ["mages"],
  // Elite Mage Tower
  battlemage: ["mages", true], giant_mage: ["mages", true],
  // Creature Den
  spider: ["creatures"], giant_frog: ["creatures"], rhino: ["creatures"], vampire_bat: ["creatures"],
  red_dragon: ["creatures"], fire_elemental: ["creatures"], ice_elemental: ["creatures"],
  earth_elemental: ["creatures"], frost_dragon: ["creatures"],
  fire_dragon: ["creatures", true], ice_dragon: ["creatures", true],
  lightning_elemental: ["creatures"], distortion_elemental: ["creatures"],
  minor_fire_elemental: ["creatures"], minor_ice_elemental: ["creatures"],
  minor_lightning_elemental: ["creatures"], minor_distortion_elemental: ["creatures"],
  minor_earth_elemental: ["creatures"],
  fire_imp: ["creatures"], ice_imp: ["creatures"], lightning_imp: ["creatures"], distortion_imp: ["creatures"],
  void_snail: ["creatures"], faery_queen: ["creatures"], devourer: ["creatures"],
  pixie: ["creatures"], bat: ["creatures"],
  // Siege Workshop
  battering_ram: ["siege"], catapult: ["siege"], trebuchet: ["siege"], ballista: ["siege"],
  // Elite Siege Workshop
  cannon: ["siege", true], giant_siege: ["siege", true], bolt_thrower: ["siege", true],
  siege_catapult: ["siege", true], war_wagon: ["siege", true], bombard: ["siege", true],
  siege_tower: ["siege", true], hellfire_mortar: ["siege", true],
};

// Maps unit id → faction race id
const UNIT_FACTION_MAP: Record<string, string> = {
  // Man
  halberdier: "man", royal_arbalestier: "man", knight_commander: "man",
  war_chaplain: "man", shield_captain: "man",
  // Elves
  elven_archer: "elf", bladedancer: "elf", treant_guardian: "elf", moonweaver: "elf",
  // The Horde
  warchief: "horde", boar_rider: "horde", siege_troll: "horde",
  blood_berserker: "horde", horde_archer: "horde", horde_healer: "horde",
  // The Adept
  archmage: "adept", chronomancer: "adept", spell_weaver: "adept",
  mana_wraith: "adept", blade_adept: "adept",
  // Elements
  elemental_avatar: "elements", storm_conduit: "elements", frost_wyrm: "elements",
  magma_titan: "elements", stone_fist: "elements",
  // Halflings
  halfling_slinger: "halfling", halfling_chef: "halfling", halfling_burglar: "halfling",
  halfling_rider: "halfling", halfling_alchemist: "halfling",
  // Lava Children
  magma_golem: "lava", lava_shaman: "lava", obsidian_sentinel: "lava",
  cinder_wraith: "lava", volcanic_behemoth: "lava",
  // Dwarves
  dwarven_guardian: "dwarf", runesmith: "dwarf", dwarven_cannon: "dwarf",
  ironbreaker: "dwarf", thunderer: "dwarf",
  // Orcs
  orc_brute: "orc", orc_drummer: "orc", orc_shaman: "orc",
  wyvern_rider: "orc", pit_fighter: "orc",
  // Undead
  death_knight: "undead", necromancer: "undead", banshee: "undead",
  bone_colossus: "undead", wraith_lord: "undead",
  // Demons
  pit_lord: "demon", hellfire_warlock: "demon", succubus: "demon",
  doom_guard: "demon", imp_overlord: "demon",
  // Angels
  seraphim: "angel", divine_champion: "angel", valkyrie: "angel",
  archon: "angel", celestial_archer: "angel",
  // Beastkin
  alpha_wolf: "beast", beast_shaman: "beast", thunderhawk: "beast",
  dire_bear: "beast", serpent_priest: "beast",
  // Golem Collective
  war_golem: "golem", rune_core: "golem", siege_automaton: "golem",
  crystal_golem: "golem", iron_colossus: "golem",
  // Pirates
  pirate_captain: "pirate", corsair_gunner: "pirate", powder_monkey: "pirate",
  sea_witch: "pirate", boarding_master: "pirate", buccaneer: "pirate",
};

// Faction name lookup for display
const FACTION_NAMES: Record<string, string> = {
  man: "Man", elf: "Elves", horde: "The Horde", adept: "The Adept",
  elements: "The Elements", halfling: "Halflings", lava: "Lava Children",
  dwarf: "Dwarves", orc: "Orcs", undead: "Undead", demon: "Demons",
  angel: "Angels", beast: "Beastkin", golem: "Golem Collective", pirate: "Pirates",
};

const FACTION_COLORS: Record<string, string> = {
  man: "#4466cc", elf: "#44aa44", horde: "#884422", adept: "#7744cc",
  elements: "#cc8844", halfling: "#88aa44", lava: "#cc4400",
  dwarf: "#aa8855", orc: "#558822", undead: "#667788", demon: "#cc2222",
  angel: "#ddcc44", beast: "#668844", golem: "#8888aa", pirate: "#aa6633",
};

function _computeWarbandCost(ut: UnitTypeDef): number {
  if (ut.creatureType) {
    const cDef = CREATURE_DEFS[ut.creatureType];
    if (cDef) {
      const base = cDef.hp * 0.6 + cDef.damage * 4;
      return Math.max(50, Math.round(base / 25) * 25);
    }
  }
  const hp = ut.hpOverride ?? 100;
  const scale = ut.scale ?? 1.0;
  const horseCost = ut.horseArmor === "heavy" ? 200 : ut.horseArmor === "medium" ? 150 : ut.horseArmor === "light" ? 80 : 0;
  let base = hp * (scale > 1.2 ? scale * 0.6 : 1.0) + horseCost;
  // Mages are more expensive due to spell AoE capability
  if (ut.building === "mages") base *= 1.8;
  return Math.max(50, Math.round(base / 25) * 25);
}

function _computeWarbandTier(cost: number): number {
  if (cost < 125) return 1;
  if (cost < 225) return 2;
  if (cost < 375) return 3;
  if (cost < 575) return 4;
  if (cost < 925) return 5;
  if (cost < 1500) return 6;
  return 7;
}

// Apply classification to all units
for (const ut of UNIT_TYPES) {
  const cls = UNIT_BUILDING_MAP[ut.id];
  if (cls) {
    ut.building = cls[0];
    if (cls[1]) ut.isElite = true;
  }
  const fac = UNIT_FACTION_MAP[ut.id];
  if (fac) ut.faction = fac;
  ut.cost = _computeWarbandCost(ut);
  ut.tier = _computeWarbandTier(ut.cost);
}

let WARBAND_SHOP_GOLD = 30000;

// Building → RaceTiers category mapping (same as battlefield mode)
const WARBAND_BUILDING_TIER_KEY: Record<string, keyof RaceTiers> = {
  barracks: "melee",
  stables: "melee",
  archery: "ranged",
  siege: "siege",
  creatures: "creature",
  mages: "magic",
  temple: "heal",
};

function _getWarbandTierLimit(raceId: string, building: string): number {
  const race = getRace(raceId as RaceId);
  if (!race?.tiers) return 7; // no tiers defined → allow all
  const key = WARBAND_BUILDING_TIER_KEY[building];
  if (!key) return 7;
  return race.tiers[key];
}


function _generateWarbandMercenaries(selectedRaceId: string): number[] {
  const candidates: number[] = [];
  for (let i = 0; i < UNIT_TYPES.length; i++) {
    const fac = UNIT_TYPES[i].faction;
    if (fac && fac !== selectedRaceId) candidates.push(i);
  }
  // Shuffle
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  return candidates.slice(0, 10);
}

function _getUnitsForTab(tabId: string, selectedRaceId: string, mercIndices: number[]): { regular: number[]; elite: number[] } {
  if (tabId === "faction") {
    const units: number[] = [];
    for (let i = 0; i < UNIT_TYPES.length; i++) {
      if (UNIT_TYPES[i].faction === selectedRaceId) units.push(i);
    }
    units.sort((a, b) => (UNIT_TYPES[a].cost ?? 0) - (UNIT_TYPES[b].cost ?? 0));
    return { regular: units, elite: [] };
  }
  if (tabId === "mercenaries") {
    const sorted = [...mercIndices].sort((a, b) => (UNIT_TYPES[a].cost ?? 0) - (UNIT_TYPES[b].cost ?? 0));
    return { regular: sorted, elite: [] };
  }
  const maxTier = _getWarbandTierLimit(selectedRaceId, tabId);
  const regular: number[] = [];
  const elite: number[] = [];
  for (let i = 0; i < UNIT_TYPES.length; i++) {
    const ut = UNIT_TYPES[i];
    if (ut.building !== tabId) continue;
    if ((ut.tier ?? 1) > maxTier) continue; // race tier limit
    if (ut.isElite) elite.push(i);
    else regular.push(i);
  }
  regular.sort((a, b) => (UNIT_TYPES[a].cost ?? 0) - (UNIT_TYPES[b].cost ?? 0));
  elite.sort((a, b) => (UNIT_TYPES[a].cost ?? 0) - (UNIT_TYPES[b].cost ?? 0));
  return { regular, elite };
}

function _getAllAvailableUnits(raceId: string, mercIndices: number[]): number[] {
  const seen = new Set<number>();
  const result: number[] = [];
  for (const tab of WARBAND_SHOP_TABS) {
    const { regular, elite } = _getUnitsForTab(tab.id, raceId, mercIndices);
    for (const i of regular) { if (!seen.has(i)) { seen.add(i); result.push(i); } }
    for (const i of elite) { if (!seen.has(i)) { seen.add(i); result.push(i); } }
  }
  // Faction
  const { regular: fac } = _getUnitsForTab("faction", raceId, mercIndices);
  for (const i of fac) { if (!seen.has(i)) { seen.add(i); result.push(i); } }
  // Mercs
  for (const i of mercIndices) { if (!seen.has(i)) { seen.add(i); result.push(i); } }
  return result;
}

export class WarbandGame {
  private _state: WarbandState | null = null;

  // Systems
  private _inputSystem = new WarbandInputSystem();
  private _combatSystem = new WarbandCombatSystem();
  private _physicsSystem = new WarbandPhysicsSystem();
  private _aiSystem = new WarbandAISystem();

  // View
  private _sceneManager = new WarbandSceneManager();
  private _cameraController!: WarbandCameraController;
  private _fighterMeshes: Map<string, FighterMesh> = new Map();
  private _horseMeshes: Map<string, HorseMesh> = new Map();
  private _creatureMeshes: Map<string, CreatureMesh> = new Map();
  private _hud = new WarbandHUD();
  private _shop = new WarbandShopView();
  private _fx!: WarbandFX;

  // Projectile visuals
  private _projectileMeshes: Map<string, THREE.Mesh> = new Map();
  // Shared projectile geometries/materials to reduce allocations
  private _sharedArrowGeo: THREE.CylinderGeometry | null = null;
  private _sharedArrowMat: THREE.MeshBasicMaterial | null = null;
  private _sharedRayOuterGeo: THREE.CylinderGeometry | null = null;
  private _sharedRayInnerGeo: THREE.CylinderGeometry | null = null;
  private _sharedRayTipGeo: THREE.SphereGeometry | null = null;
  private _sharedRayCoreMat: THREE.MeshBasicMaterial | null = null;

  // Pickup visuals
  private _pickupMeshes: Map<string, THREE.Group> = new Map();
  private _sharedPickupGeo: THREE.BoxGeometry | null = null;
  private _sharedPickupRingGeo: THREE.RingGeometry | null = null;
  private _sharedPickupRingMat: THREE.MeshBasicMaterial | null = null;

  // Game loop
  private _rafId = 0;
  private _lastTime = 0;
  private _simAccumulator = 0;

  // Menu
  private _menuContainer: HTMLDivElement | null = null;
  private _resultsContainer: HTMLDivElement | null = null;
  private _pauseMenuContainer: HTMLDivElement | null = null;
  private _inventoryContainer: HTMLDivElement | null = null;
  private _armySetupContainer: HTMLDivElement | null = null;

  // Army battle composition (indexed by UNIT_TYPES)
  private _playerArmy: number[] = [];
  private _enemyArmy: number[] = [];
  private _shopActiveTab = 0;
  private _shopActiveSide: "player" | "enemy" = "player";
  private _shopPlayerGoldSpent = 0;
  private _shopEnemyGoldSpent = 0;
  private _shopMercIndices: number[] = [];
  private _shopRandomOn = false;

  // Match options
  private _optDifficulty: 'easy' | 'normal' | 'hard' | 'brutal' = 'normal';
  private _optWeather: 'clear' | 'rain' | 'fog' | 'night' = 'clear';
  private _optMorale = true;
  private _optFriendlyFire = false;
  private _optDoubledamage = false;
  private _optNoRanged = false;
  private _optAllCavalry = false;
  private _optCreatureAbilities = true;
  private _optPersistentGold = false;

  // Pre-battle selection screens
  private _leaderSelectContainer: HTMLDivElement | null = null;
  private _raceSelectContainer: HTMLDivElement | null = null;
  private _raceOverviewContainer: HTMLDivElement | null = null;
  private _selectedLeaderId: LeaderId = LEADER_DEFINITIONS[0].id;
  private _selectedRaceId: RaceId = RACE_DEFINITIONS[0].id;

  // ESC handler
  private _escHandler: ((e: KeyboardEvent) => void) | null = null;

  async boot(): Promise<void> {
    // Hide all PixiJS elements (canvas, webgpu, or any child except warband canvas)
    const pixiContainer = document.getElementById("pixi-container");
    if (pixiContainer) {
      for (const child of Array.from(pixiContainer.children)) {
        if (child.id !== "warband-canvas" && child.id !== "warband-hud") {
          (child as HTMLElement).style.display = "none";
        }
      }
    }

    // Init Three.js scene
    this._sceneManager.init();
    this._cameraController = new WarbandCameraController(this._sceneManager.camera);
    this._fx = new WarbandFX(this._sceneManager.scene);

    // Init HUD
    this._hud.init();

    // Init shop
    this._shop.init();

    // ESC handler
    this._escHandler = (e: KeyboardEvent) => {
      if (e.code !== "Escape") return;
      if (!this._state) return;

      if (this._inventoryContainer) {
        // Close inventory back to pause menu
        this._removeInventory();
        this._showPauseMenu();
      } else if (this._state.phase === WarbandPhase.BATTLE && this._state.paused) {
        // Resume
        this._resumeGame();
      } else if (this._state.phase === WarbandPhase.BATTLE && !this._state.paused) {
        // Pause
        this._pauseGame();
      } else if (this._state.phase === WarbandPhase.MENU) {
        this._exit();
      }
    };
    window.addEventListener("keydown", this._escHandler);

    // Show mode selection menu
    this._showMenu();
  }

  // ---- Menu ---------------------------------------------------------------

  private _showMenu(): void {
    this._menuContainer = document.createElement("div");
    this._menuContainer.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      z-index: 30; background: rgba(10, 8, 5, 0.97);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      font-family: 'Segoe UI', sans-serif; color: #e0d5c0;
    `;

    this._menuContainer.innerHTML = `
      <div style="position:absolute;top:0;left:0;width:100%;height:100%;
        background:radial-gradient(ellipse at center,rgba(40,25,10,0.4) 0%,transparent 70%);pointer-events:none"></div>
      <div style="position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;height:100%">
        <div style="font-size:11px;letter-spacing:6px;color:#665533;margin-bottom:8px">MARVELOUS U PRESENTS</div>
        <h1 style="font-size:56px;color:#daa520;text-shadow:0 0 30px rgba(218,165,32,0.5),0 2px 4px rgba(0,0,0,0.8);margin-bottom:4px;letter-spacing:4px">
          WARBAND
        </h1>
        <div style="width:200px;height:2px;background:linear-gradient(90deg,transparent,#daa520,transparent);margin-bottom:6px"></div>
        <p style="color:#887755;margin-bottom:35px;font-size:14px;letter-spacing:2px">MEDIEVAL COMBAT</p>

        <button id="wb-open-field" style="${this._menuBtnStyle()}">
          Open Field Battle
          <span style="display:block;font-size:11px;color:#998877;margin-top:4px;font-weight:normal">5v5 on open terrain</span>
        </button>

        <button id="wb-siege" style="${this._menuBtnStyle()}">
          Siege Battle
          <span style="display:block;font-size:11px;color:#998877;margin-top:4px;font-weight:normal">Storm the castle, capture the centre</span>
        </button>

        <button id="wb-army" style="${this._menuBtnStyle("#3a2008", "#daa520")}">
          Army Battle
          <span style="display:block;font-size:11px;color:#998877;margin-top:4px;font-weight:normal">Up to 250v250 — choose your army</span>
        </button>

        <button id="wb-campaign" style="${this._menuBtnStyle("#1a0830", "#aa66dd")}">
          Campaign
          <span style="display:block;font-size:11px;color:#998877;margin-top:4px;font-weight:normal">Overworld map — conquer cities, build your warband</span>
        </button>

        <button id="wb-duel" style="${this._menuBtnStyle()}">
          Duel
          <span style="display:block;font-size:11px;color:#998877;margin-top:4px;font-weight:normal">1v1 single combat</span>
        </button>

        <button id="wb-camera" style="${this._menuBtnStyle("#1a2a1a", "#668855")}">
          Camera View
          <span style="display:block;font-size:11px;color:#778877;margin-top:4px;font-weight:normal">Inspect character model</span>
        </button>

        <div style="width:340px;margin-top:15px;padding:12px 16px;background:rgba(30,20,10,0.6);border:1px solid #443322;border-radius:6px">
          <div style="font-size:13px;color:#daa520;margin-bottom:8px;text-align:center;letter-spacing:1px">MATCH OPTIONS</div>

          <!-- Difficulty selector -->
          <div style="margin-bottom:8px;display:flex;align-items:center;gap:6px">
            <span style="font-size:11px;color:#998877;width:65px">Difficulty:</span>
            <div style="display:flex;gap:3px;flex:1">
              ${(['easy', 'normal', 'hard', 'brutal'] as const).map(d => {
                const sel = this._optDifficulty === d;
                return `<button class="wb-diff-btn" data-diff="${d}" style="flex:1;padding:4px 6px;font-size:10px;border:1px solid ${sel ? '#daa520' : '#444'};border-radius:3px;background:${sel ? 'rgba(218,165,32,0.25)' : 'rgba(20,15,10,0.6)'};color:${sel ? '#fff' : '#666'};cursor:pointer;text-align:center;font-family:inherit;">${d[0].toUpperCase() + d.slice(1)}</button>`;
              }).join('')}
            </div>
          </div>

          <!-- Weather selector -->
          <div style="margin-bottom:8px;display:flex;align-items:center;gap:6px">
            <span style="font-size:11px;color:#998877;width:65px">Weather:</span>
            <div style="display:flex;gap:3px;flex:1">
              ${([['clear','☀ Clear'],['rain','🌧 Rain'],['fog','🌫 Fog'],['night','🌙 Night']] as const).map(([w, label]) => {
                const sel = this._optWeather === w;
                return `<button class="wb-weather-btn" data-weather="${w}" style="flex:1;padding:4px 6px;font-size:10px;border:1px solid ${sel ? '#daa520' : '#444'};border-radius:3px;background:${sel ? 'rgba(218,165,32,0.25)' : 'rgba(20,15,10,0.6)'};color:${sel ? '#fff' : '#666'};cursor:pointer;text-align:center;font-family:inherit;">${label}</button>`;
              }).join('')}
            </div>
          </div>

          <!-- Toggle checkboxes -->
          <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px">
            ${([
              ['morale', '☠ Morale', this._optMorale],
              ['abilities', '✨ Creature Abilities', this._optCreatureAbilities],
              ['friendly', '⚔ Friendly Fire', this._optFriendlyFire],
              ['doubledmg', '💥 Double Damage', this._optDoubledamage],
              ['noranged', '🏹 No Ranged', this._optNoRanged],
              ['allcav', '🐎 All Cavalry', this._optAllCavalry],
              ['persist', '💰 Persistent Gold', this._optPersistentGold],
            ] as [string, string, boolean][]).map(([id, label, on]) =>
              `<div id="wb-opt-${id}" class="wb-opt-toggle" style="padding:4px 8px;font-size:10px;border:1px solid ${on ? '#daa520' : '#444'};border-radius:3px;background:${on ? 'rgba(218,165,32,0.25)' : 'rgba(20,15,10,0.6)'};color:${on ? '#fff' : '#666'};cursor:pointer;font-family:inherit;user-select:none">${label}</div>`
            ).join('')}
          </div>
        </div>

        <div style="width:120px;height:1px;background:linear-gradient(90deg,transparent,#44443a,transparent);margin:12px 0"></div>

        <button id="wb-back" style="${this._menuBtnStyle("#2a2a2a", "#555")}">
          Back to Hub
        </button>
      </div>
    `;

    const container = document.getElementById("pixi-container");
    if (container) container.appendChild(this._menuContainer);

    document.getElementById("wb-open-field")?.addEventListener("click", () => {
      this._removeMenu();
      this._startGame(BattleType.OPEN_FIELD);
    });

    document.getElementById("wb-siege")?.addEventListener("click", () => {
      this._removeMenu();
      this._startGame(BattleType.SIEGE);
    });

    document.getElementById("wb-army")?.addEventListener("click", () => {
      this._removeMenu();
      this._showLeaderSelect();
    });

    document.getElementById("wb-campaign")?.addEventListener("click", () => {
      this._exit();
      // Launch campaign mode via event
      window.dispatchEvent(new Event("warbandLaunchCampaign"));
    });

    document.getElementById("wb-duel")?.addEventListener("click", () => {
      this._removeMenu();
      this._startGame(BattleType.DUEL);
    });

    document.getElementById("wb-camera")?.addEventListener("click", () => {
      this._removeMenu();
      this._startGame(BattleType.CAMERA_VIEW);
    });

    document.getElementById("wb-back")?.addEventListener("click", () => {
      this._exit();
    });

    // Difficulty buttons
    this._menuContainer?.querySelectorAll(".wb-diff-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        this._optDifficulty = (btn as HTMLElement).dataset.diff as typeof this._optDifficulty;
        this._removeMenu(); this._showMenu();
      });
    });

    // Weather buttons
    this._menuContainer?.querySelectorAll(".wb-weather-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        this._optWeather = (btn as HTMLElement).dataset.weather as typeof this._optWeather;
        this._removeMenu(); this._showMenu();
      });
    });

    // Option toggles
    const toggleMap: [string, string][] = [
      ["wb-opt-morale", "_optMorale"],
      ["wb-opt-abilities", "_optCreatureAbilities"],
      ["wb-opt-friendly", "_optFriendlyFire"],
      ["wb-opt-doubledmg", "_optDoubledamage"],
      ["wb-opt-noranged", "_optNoRanged"],
      ["wb-opt-allcav", "_optAllCavalry"],
      ["wb-opt-persist", "_optPersistentGold"],
    ];
    for (const [elId, field] of toggleMap) {
      document.getElementById(elId)?.addEventListener("click", () => {
        (this as any)[field] = !(this as any)[field];
        this._removeMenu(); this._showMenu();
      });
    }
  }

  private _menuBtnStyle(bg = "#5a1010", border = "#daa520"): string {
    return `
      display: block; width: 320px; padding: 14px 24px;
      margin: 5px 0; font-size: 17px; font-weight: bold;
      background: linear-gradient(180deg, ${bg}, ${bg}cc);
      color: #e0d5c0; letter-spacing: 1px;
      border: 1px solid ${border}88; border-radius: 4px;
      cursor: pointer; text-align: center;
      font-family: inherit;
      transition: all 0.15s;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    `;
  }

  private _applyDifficulty(fighter: WarbandFighter): void {
    if (fighter.ai) {
      const diff = this._optDifficulty;
      fighter.ai.reactionDelay = diff === 'easy' ? WB.AI_REACTION_TICKS_EASY : diff === 'hard' ? WB.AI_REACTION_TICKS_HARD : diff === 'brutal' ? 4 : WB.AI_REACTION_TICKS_NORMAL;
      fighter.ai.blockChance = diff === 'easy' ? WB.AI_BLOCK_CHANCE_EASY : diff === 'hard' ? WB.AI_BLOCK_CHANCE_HARD : diff === 'brutal' ? 0.95 : WB.AI_BLOCK_CHANCE_NORMAL;
      fighter.ai.aggressiveness = diff === 'brutal' ? 0.85 : diff === 'hard' ? 0.7 : diff === 'easy' ? 0.3 : 0.5;
    }
  }

  private _removeMenu(): void {
    if (this._menuContainer?.parentNode) {
      this._menuContainer.parentNode.removeChild(this._menuContainer);
      this._menuContainer = null;
    }
  }

  // ---- Game start ---------------------------------------------------------

  private _startGame(battleType: BattleType): void {
    const sw = window.innerWidth;
    const sh = window.innerHeight;

    this._state = createWarbandState(battleType, sw, sh);

    // Wire match options into state
    this._state.difficulty = this._optDifficulty;
    this._state.weather = this._optWeather;
    this._state.moraleEnabled = this._optMorale;
    this._state.friendlyFire = this._optFriendlyFire;
    this._state.doubleDamage = this._optDoubledamage;
    this._state.noRanged = this._optNoRanged;
    this._state.allCavalry = this._optAllCavalry;
    this._state.creatureAbilities = this._optCreatureAbilities;

    // Build siege geometry if needed
    if (battleType === BattleType.SIEGE) {
      this._sceneManager.buildSiegeArena();
    }

    // Create player
    const player = createDefaultFighter(
      "player_0",
      "You",
      "player",
      true,
      vec3(0, 0, 10),
    );
    this._state.fighters.push(player);

    const isDuel = battleType === BattleType.DUEL;
    const isCameraView = battleType === BattleType.CAMERA_VIEW;
    const isArmyBattle = battleType === BattleType.ARMY_BATTLE;

    if (isCameraView) {
      // Camera view: give player default equipment, no enemies, go straight to battle
      player.equipment.mainHand = WEAPON_DEFS["arming_sword"];
      const shields = Object.values(WEAPON_DEFS).filter((w) => w.category === "shield");
      player.equipment.offHand = shields[1] ?? shields[0]; // round shield
      this._state.playerTeamAlive = 1;
      this._state.enemyTeamAlive = 0;
      this._state.battleTimer = 999999;
      this._cameraController.setFreeOrbit(true);
      this._startBattle();
      return;
    }

    if (isArmyBattle) {
      // Spawn player allies from army composition
      const playerTotal = this._playerArmy.reduce((a, b) => a + b, 0);
      const enemyTotal = this._enemyArmy.reduce((a, b) => a + b, 0);
      const halfW = WB.ARENA_WIDTH / 2;

      let allyIdx = 0;
      for (let t = 0; t < UNIT_TYPES.length; t++) {
        for (let n = 0; n < this._playerArmy[t]; n++) {
          const row = Math.floor(allyIdx / 10);
          const col = allyIdx % 10;
          const x = (col - 4.5) * 2.5;
          const z = 10 + row * 2.5;
          const ally = createDefaultFighter(
            `ally_${allyIdx}`,
            AI_NAMES_PLAYER[allyIdx % AI_NAMES_PLAYER.length],
            "player",
            false,
            vec3(Math.max(-halfW + 2, Math.min(halfW - 2, x)), 0, z),
          );
          this._equipUnitType(ally, UNIT_TYPES[t], this._state!);
          this._applyDifficulty(ally);
          this._state.fighters.push(ally);
          allyIdx++;
        }
      }

      let enemyIdx = 0;
      for (let t = 0; t < UNIT_TYPES.length; t++) {
        for (let n = 0; n < this._enemyArmy[t]; n++) {
          const row = Math.floor(enemyIdx / 10);
          const col = enemyIdx % 10;
          const x = (col - 4.5) * 2.5;
          const z = -10 - row * 2.5;
          const enemy = createDefaultFighter(
            `enemy_${enemyIdx}`,
            AI_NAMES_ENEMY[enemyIdx % AI_NAMES_ENEMY.length],
            "enemy",
            false,
            vec3(Math.max(-halfW + 2, Math.min(halfW - 2, x)), 0, z),
          );
          this._equipUnitType(enemy, UNIT_TYPES[t], this._state!);
          this._applyDifficulty(enemy);
          this._state.fighters.push(enemy);
          enemyIdx++;
        }
      }

      this._state.playerTeamAlive = playerTotal + 1; // +1 for player
      this._state.enemyTeamAlive = enemyTotal;
      this._state.battleTimer = 180 * WB.TICKS_PER_SEC; // 3 minutes for army battles

      // Auto-equip player based on leader — no loadout selection
      const armySpawnUnit = _getLeaderSpawnUnit(this._selectedLeaderId);
      this._equipUnitType(player, armySpawnUnit, this._state!);
      player.name = "You";
      this._startBattle();
      return;
    }

    // Create player allies (skip in duel mode)
    if (!isDuel) {
      for (let i = 1; i < WB.TEAM_SIZE; i++) {
        const ally = createDefaultFighter(
          `ally_${i}`,
          AI_NAMES_PLAYER[i % AI_NAMES_PLAYER.length],
          "player",
          false,
          vec3(-6 + i * 3, 0, 12),
        );
        this._equipRandomUnitType(ally, false, this._state!);
        this._applyDifficulty(ally);
        this._state.fighters.push(ally);
      }
    }

    // Create enemies
    const enemyCount = isDuel ? 1 : WB.TEAM_SIZE;
    for (let i = 0; i < enemyCount; i++) {
      let spawnX: number, spawnZ: number;
      if (battleType === BattleType.SIEGE) {
        // Defenders spawn inside the castle, spread around the capture zone
        const angle = (i / enemyCount) * Math.PI * 2;
        spawnX = Math.cos(angle) * 4;
        spawnZ = WB.SIEGE_CAPTURE_Z + Math.sin(angle) * 4;
      } else {
        spawnX = isDuel ? 0 : -6 + i * 3;
        spawnZ = -5;
      }
      const enemy = createDefaultFighter(
        `enemy_${i}`,
        AI_NAMES_ENEMY[i % AI_NAMES_ENEMY.length],
        "enemy",
        false,
        vec3(spawnX, 0, spawnZ),
      );
      this._equipRandomUnitType(enemy, isDuel, this._state!);
      this._applyDifficulty(enemy);
      this._state.fighters.push(enemy);
    }

    // Auto-equip player based on leader — no loadout selection in battle mode
    const spawnUnit = _getLeaderSpawnUnit(this._selectedLeaderId);
    this._equipUnitType(player, spawnUnit, this._state!);
    player.name = "You";

    this._state.playerTeamAlive = isDuel ? 1 : WB.TEAM_SIZE;
    this._state.enemyTeamAlive = enemyCount;
    this._state.battleTimer = 120 * WB.TICKS_PER_SEC;

    this._startBattle();
  }

  private _equipRandomUnitType(fighter: WarbandFighter, dueling: boolean, state: WarbandState): void {
    // Filter to human-scale units for duels, allow all for open battles
    const pool = dueling
      ? UNIT_TYPES.filter((u) => !u.creatureType && !u.scale)
      : UNIT_TYPES.filter((u) => !u.creatureType);
    const pick = pool[Math.floor(Math.random() * pool.length)];
    this._equipUnitType(fighter, pick, state);
  }

  // ---- Leader selection screen ----------------------------------------------

  private _showLeaderSelect(): void {
    this._leaderSelectContainer = document.createElement("div");
    this._leaderSelectContainer.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      z-index: 30; background: rgba(10, 8, 5, 0.97);
      display: flex; flex-direction: column; align-items: center;
      font-family: 'Segoe UI', sans-serif; color: #e0d5c0;
      user-select: none; overflow-y: auto;
    `;

    const container = document.getElementById("pixi-container");
    if (container) container.appendChild(this._leaderSelectContainer);
    this._renderLeaderSelect();
  }

  private _renderLeaderSelect(): void {
    if (!this._leaderSelectContainer) return;

    const selected = LEADER_DEFINITIONS.find(l => l.id === this._selectedLeaderId) ?? LEADER_DEFINITIONS[0];

    const leaderCards = LEADER_DEFINITIONS.map(l => {
      const isSelected = l.id === this._selectedLeaderId;
      const spawnUnit = _getLeaderSpawnUnit(l.id);
      return `
        <div data-leader="${l.id}" style="
          background: ${isSelected ? "rgba(218,165,32,0.12)" : "rgba(255,255,255,0.03)"};
          border: 1px solid ${isSelected ? "#daa520" : "#2a3344"};
          border-radius: 6px; padding: 10px 14px; margin: 4px; width: 145px;
          text-align: center; cursor: pointer; transition: all 0.15s;
          ${isSelected ? "box-shadow: 0 0 12px rgba(218,165,32,0.15)" : ""}
        " onmouseover="if(!${isSelected})this.style.background='rgba(255,255,255,0.07)';if(!${isSelected})this.style.borderColor='#445566'"
           onmouseout="if(!${isSelected})this.style.background='rgba(255,255,255,0.03)';if(!${isSelected})this.style.borderColor='#2a3344'">
          <div style="font-size:14px;font-weight:bold;color:${isSelected ? "#ffd700" : "#ccccbb"};letter-spacing:0.5px">${l.name}</div>
          <div style="font-size:10px;color:#778899;margin-top:3px">${l.title}</div>
          <div style="font-size:9px;color:#667744;margin-top:4px">Spawns as: ${spawnUnit.name}</div>
        </div>
      `;
    }).join("");

    const leaderSpawnUnit = _getLeaderSpawnUnit(selected.id);

    this._leaderSelectContainer.innerHTML = `
      <div style="padding:24px 0 16px;text-align:center">
        <div style="font-size:10px;letter-spacing:4px;color:#556;margin-bottom:6px">STEP 1 OF 3</div>
        <h1 style="font-size:32px;color:#daa520;text-shadow:0 0 15px rgba(218,165,32,0.3);margin:0;letter-spacing:3px">
          CHOOSE YOUR LEADER
        </h1>
        <div style="width:180px;height:1px;background:linear-gradient(90deg,transparent,#daa520,transparent);margin:8px auto 0"></div>
        <p style="color:#778;font-size:12px;margin-top:8px">Your leader determines your battlefield role and passive bonus</p>
      </div>

      <div style="display:flex;max-width:1400px;width:100%;gap:20px;padding:0 30px;flex:1;min-height:0">
        <!-- Leader Grid -->
        <div style="flex:0 0 680px;display:flex;flex-wrap:wrap;align-content:flex-start;overflow-y:auto;max-height:calc(100vh - 220px)">
          ${leaderCards}
        </div>

        <!-- Detail Panel -->
        <div style="flex:1;background:rgba(255,255,255,0.03);border:1px solid #334455;border-radius:8px;padding:24px;overflow-y:auto;max-height:calc(100vh - 220px);
          box-shadow:inset 0 1px 0 rgba(255,255,255,0.03)">
          <div style="font-size:24px;font-weight:bold;color:#ffd700;letter-spacing:2px">${selected.name.toUpperCase()}</div>
          <div style="font-size:14px;color:#99aabb;margin-top:4px">${selected.title}</div>
          <div style="width:100%;height:1px;background:#334455;margin:14px 0"></div>
          <div style="font-size:10px;color:#556677;letter-spacing:2px;margin-bottom:6px">LORE</div>
          <div style="font-size:12px;color:#aabbcc;line-height:1.6">${selected.flavor}</div>
          <div style="width:100%;height:1px;background:#334455;margin:14px 0"></div>
          <div style="font-size:11px;color:#88ff88;font-weight:bold;letter-spacing:1px;margin-bottom:6px">BONUS</div>
          <div style="font-size:12px;color:#88ffaa">${selected.bonusLabel}</div>
          <div style="width:100%;height:1px;background:#334455;margin:14px 0"></div>
          <div style="font-size:11px;color:#ccaa44;font-weight:bold;letter-spacing:1px;margin-bottom:6px">BATTLE SPAWN</div>
          <div style="background:rgba(255,255,255,0.03);border:1px solid #445533;border-radius:6px;padding:10px 14px">
            <div style="font-size:13px;color:#ddddcc">
              ${leaderSpawnUnit.icon} <span style="color:#eeffdd;font-weight:bold">${leaderSpawnUnit.name}</span>
            </div>
            <div style="font-size:11px;color:#889988;margin-top:4px">${leaderSpawnUnit.description}</div>
            <div style="font-size:10px;color:#778877;margin-top:4px">
              HP: ${leaderSpawnUnit.hpOverride ?? 100}
              ${leaderSpawnUnit.horseArmor ? ` | Mount: ${leaderSpawnUnit.horseArmor}` : ""}
              ${leaderSpawnUnit.scale ? ` | Scale: ${leaderSpawnUnit.scale}x` : ""}
            </div>
          </div>
        </div>
      </div>

      <div style="display:flex;gap:12px;padding:20px 0 30px">
        <button id="wb-leader-back" style="${this._menuBtnStyle("#555", "#888")}">
          \u2190 Back
        </button>
        <button id="wb-leader-next" style="${this._menuBtnStyle("#2a6a2a", "#88cc66")}">
          Select Race \u2192
        </button>
      </div>
    `;

    // Wire leader card clicks
    this._leaderSelectContainer.querySelectorAll("[data-leader]").forEach(el => {
      const htmlEl = el as HTMLElement;
      htmlEl.addEventListener("click", () => {
        this._selectedLeaderId = htmlEl.dataset.leader!;
        this._renderLeaderSelect();
      });
    });

    document.getElementById("wb-leader-next")?.addEventListener("click", () => {
      this._removeLeaderSelect();
      this._showRaceSelect();
    });

    document.getElementById("wb-leader-back")?.addEventListener("click", () => {
      this._removeLeaderSelect();
      this._showMenu();
    });
  }

  private _removeLeaderSelect(): void {
    if (this._leaderSelectContainer?.parentNode) {
      this._leaderSelectContainer.parentNode.removeChild(this._leaderSelectContainer);
      this._leaderSelectContainer = null;
    }
  }

  // ---- Race selection screen ------------------------------------------------

  private _showRaceSelect(): void {
    this._raceSelectContainer = document.createElement("div");
    this._raceSelectContainer.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      z-index: 30; background: rgba(10, 8, 5, 0.97);
      display: flex; flex-direction: column; align-items: center;
      font-family: 'Segoe UI', sans-serif; color: #e0d5c0;
      user-select: none; overflow-y: auto;
    `;

    const container = document.getElementById("pixi-container");
    if (container) container.appendChild(this._raceSelectContainer);
    this._renderRaceSelect();
  }

  private _renderRaceSelect(): void {
    if (!this._raceSelectContainer) return;

    const selected = RACE_DEFINITIONS.find(r => r.id === this._selectedRaceId) ?? RACE_DEFINITIONS[0];
    const implementedRaces = RACE_DEFINITIONS.filter(r => r.implemented);

    const raceCards = implementedRaces.map(r => {
      const isSelected = r.id === this._selectedRaceId;
      const accentHex = "#" + r.accentColor.toString(16).padStart(6, "0");
      return `
        <div data-race="${r.id}" style="
          background: ${isSelected ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.03)"};
          border: 2px solid ${isSelected ? accentHex : "#334455"};
          border-radius: 8px; padding: 12px 16px; margin: 5px; width: 170px;
          text-align: center; cursor: pointer; transition: background 0.15s;
        " onmouseover="if(!${isSelected})this.style.background='rgba(255,255,255,0.08)'"
           onmouseout="if(!${isSelected})this.style.background='rgba(255,255,255,0.03)'">
          <div style="font-size:15px;font-weight:bold;color:${isSelected ? accentHex : "#ddd"}">${r.name}</div>
          <div style="font-size:11px;color:#8899bb;margin-top:3px">${r.title}</div>
        </div>
      `;
    }).join("");

    // Tier bars for detail panel
    const tierCategories: Array<{ key: string; label: string; color: string }> = [
      { key: "melee", label: "Melee", color: "#ff6644" },
      { key: "ranged", label: "Ranged", color: "#66cc44" },
      { key: "siege", label: "Siege", color: "#8888aa" },
      { key: "creature", label: "Creature", color: "#cc66cc" },
      { key: "magic", label: "Magic", color: "#6688ff" },
      { key: "heal", label: "Heal", color: "#ffdd88" },
    ];

    const tierBars = selected.tiers ? tierCategories.map(tc => {
      const val = (selected.tiers as unknown as Record<string, number>)[tc.key] ?? 0;
      const pct = (val / 7) * 100;
      return `
        <div style="display:flex;align-items:center;margin:3px 0">
          <div style="width:70px;font-size:11px;color:#888">${tc.label}</div>
          <div style="flex:1;height:8px;background:#1a1a2a;border-radius:4px;overflow:hidden">
            <div style="width:${pct}%;height:100%;background:${tc.color};border-radius:4px"></div>
          </div>
          <div style="width:20px;text-align:right;font-size:11px;color:#aaa;margin-left:6px">${val}</div>
        </div>
      `;
    }).join("") : '<div style="color:#556677;font-size:12px">No tier data</div>';

    this._raceSelectContainer.innerHTML = `
      <div style="padding:24px 0 16px;text-align:center">
        <div style="font-size:10px;letter-spacing:4px;color:#556;margin-bottom:6px">STEP 2 OF 3</div>
        <h1 style="font-size:32px;color:#daa520;text-shadow:0 0 15px rgba(218,165,32,0.3);margin:0;letter-spacing:3px">
          SELECT YOUR RACE
        </h1>
        <div style="width:180px;height:1px;background:linear-gradient(90deg,transparent,#daa520,transparent);margin:8px auto 0"></div>
        <p style="color:#778;font-size:12px;margin-top:8px">Choose a faction for your warband</p>
      </div>

      <div style="display:flex;max-width:1400px;width:100%;gap:20px;padding:0 30px;flex:1;min-height:0">
        <!-- Race Grid -->
        <div style="flex:0 0 580px;display:flex;flex-wrap:wrap;align-content:flex-start;overflow-y:auto;max-height:calc(100vh - 220px)">
          ${raceCards}
        </div>

        <!-- Detail Panel -->
        <div style="flex:1;background:rgba(255,255,255,0.03);border:1px solid #334455;border-radius:8px;padding:24px;overflow-y:auto;max-height:calc(100vh - 220px)">
          <div style="font-size:24px;font-weight:bold;color:#${ selected.accentColor.toString(16).padStart(6, "0")};letter-spacing:2px">${selected.name.toUpperCase()}</div>
          <div style="font-size:14px;color:#99aabb;margin-top:4px">${selected.title}</div>
          <div style="width:100%;height:1px;background:#334455;margin:14px 0"></div>
          <div style="font-size:12px;color:#aabbcc;line-height:1.6">${selected.flavor}</div>
          <div style="width:100%;height:1px;background:#334455;margin:14px 0"></div>
          <div style="font-size:11px;color:#88ff88;font-weight:bold;letter-spacing:1px;margin-bottom:8px">FACTION UNIT</div>
          <div style="font-size:12px;color:#88ffaa;margin-bottom:14px">${selected.factionUnitLabel}</div>
          <div style="font-size:11px;color:#ccaa44;font-weight:bold;letter-spacing:1px;margin-bottom:8px">TIER RATINGS</div>
          ${tierBars}
        </div>
      </div>

      <div style="display:flex;gap:12px;padding:20px 0 30px">
        <button id="wb-race-back" style="${this._menuBtnStyle("#555", "#888")}">
          \u2190 Back
        </button>
        <button id="wb-race-next" style="${this._menuBtnStyle("#2a6a2a", "#88cc66")}">
          Race Overview \u2192
        </button>
      </div>
    `;

    // Wire race card clicks
    this._raceSelectContainer.querySelectorAll("[data-race]").forEach(el => {
      const htmlEl = el as HTMLElement;
      htmlEl.addEventListener("click", () => {
        this._selectedRaceId = htmlEl.dataset.race!;
        this._renderRaceSelect();
      });
    });

    document.getElementById("wb-race-next")?.addEventListener("click", () => {
      this._removeRaceSelect();
      this._showRaceOverview();
    });

    document.getElementById("wb-race-back")?.addEventListener("click", () => {
      this._removeRaceSelect();
      this._showLeaderSelect();
    });
  }

  private _removeRaceSelect(): void {
    if (this._raceSelectContainer?.parentNode) {
      this._raceSelectContainer.parentNode.removeChild(this._raceSelectContainer);
      this._raceSelectContainer = null;
    }
  }

  // ---- Race overview screen -------------------------------------------------

  private _showRaceOverview(): void {
    this._raceOverviewContainer = document.createElement("div");
    this._raceOverviewContainer.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      z-index: 30; background: rgba(10, 8, 5, 0.97);
      display: flex; flex-direction: column; align-items: center;
      font-family: 'Segoe UI', sans-serif; color: #e0d5c0;
      user-select: none; overflow-y: auto;
    `;

    const container = document.getElementById("pixi-container");
    if (container) container.appendChild(this._raceOverviewContainer);
    this._renderRaceOverview();
  }

  private _renderRaceOverview(): void {
    if (!this._raceOverviewContainer) return;

    const race = RACE_DEFINITIONS.find(r => r.id === this._selectedRaceId) ?? RACE_DEFINITIONS[0];
    const leader = LEADER_DEFINITIONS.find(l => l.id === this._selectedLeaderId) ?? LEADER_DEFINITIONS[0];
    const accentHex = "#" + race.accentColor.toString(16).padStart(6, "0");

    // All tier categories for the full overview
    const allTiers: Array<{ key: string; label: string; color: string }> = [
      { key: "melee", label: "Melee", color: "#ff6644" },
      { key: "ranged", label: "Ranged", color: "#66cc44" },
      { key: "siege", label: "Siege", color: "#8888aa" },
      { key: "creature", label: "Creature", color: "#cc66cc" },
      { key: "magic", label: "Magic", color: "#6688ff" },
      { key: "heal", label: "Heal", color: "#ffdd88" },
      { key: "fire", label: "Fire", color: "#ff4422" },
      { key: "cold", label: "Cold", color: "#4488ff" },
      { key: "lightning", label: "Lightning", color: "#ffdd22" },
      { key: "distortion", label: "Distortion", color: "#aa44cc" },
      { key: "summon", label: "Summon", color: "#66aa44" },
      { key: "nature", label: "Nature", color: "#22cc44" },
    ];

    const tierBars = race.tiers ? allTiers.map(tc => {
      const val = (race.tiers as unknown as Record<string, number>)[tc.key] ?? 0;
      const pct = (val / 7) * 100;
      return `
        <div style="display:flex;align-items:center;margin:3px 0">
          <div style="width:80px;font-size:11px;color:#888">${tc.label}</div>
          <div style="flex:1;height:10px;background:#1a1a2a;border-radius:5px;overflow:hidden">
            <div style="width:${pct}%;height:100%;background:${tc.color};border-radius:5px"></div>
          </div>
          <div style="width:20px;text-align:right;font-size:11px;color:#aaa;margin-left:6px">${val}</div>
        </div>
      `;
    }).join("") : "";

    // Faction units list
    const factionUnitNames = race.factionUnits.map(ut =>
      (ut as string).replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
    );
    const factionList = factionUnitNames.length > 0
      ? factionUnitNames.map(n => `<div style="font-size:12px;color:#88ffaa;margin:2px 0">\u2022 ${n}</div>`).join("")
      : '<div style="font-size:12px;color:#556677">No exclusive units</div>';

    this._raceOverviewContainer.innerHTML = `
      <div style="padding:24px 0 16px;text-align:center">
        <div style="font-size:10px;letter-spacing:4px;color:#556;margin-bottom:6px">STEP 3 OF 3</div>
        <h1 style="font-size:32px;color:${accentHex};text-shadow:0 0 15px ${accentHex}44;margin:0;letter-spacing:3px">
          ${race.name.toUpperCase()}
        </h1>
        <div style="width:180px;height:1px;background:linear-gradient(90deg,transparent,${accentHex},transparent);margin:8px auto 0"></div>
        <p style="color:#99aabb;font-size:13px;margin-top:8px">${race.title}</p>
      </div>

      <div style="display:flex;max-width:1200px;width:100%;gap:30px;padding:0 30px;flex:1;min-height:0">
        <!-- Left: Lore + Leader -->
        <div style="flex:1;overflow-y:auto;max-height:calc(100vh - 240px)">
          <div style="background:rgba(255,255,255,0.03);border:1px solid #334455;border-radius:8px;padding:20px;margin-bottom:16px">
            <div style="font-size:10px;color:#556677;letter-spacing:2px;margin-bottom:8px">LORE</div>
            <div style="font-size:13px;color:#aabbcc;line-height:1.7">${race.flavor}</div>
          </div>

          <div style="background:rgba(255,255,255,0.03);border:1px solid #334455;border-radius:8px;padding:20px;margin-bottom:16px">
            <div style="font-size:10px;color:#556677;letter-spacing:2px;margin-bottom:8px">YOUR LEADER</div>
            <div style="font-size:18px;font-weight:bold;color:#ffd700">${leader.name}</div>
            <div style="font-size:12px;color:#99aabb;margin-top:2px">${leader.title}</div>
            <div style="width:100%;height:1px;background:#334455;margin:10px 0"></div>
            <div style="font-size:11px;color:#88ff88;font-weight:bold;margin-bottom:4px">BONUS</div>
            <div style="font-size:12px;color:#88ffaa">${leader.bonusLabel}</div>
          </div>

          <div style="background:rgba(255,255,255,0.03);border:1px solid ${accentHex}44;border-radius:8px;padding:20px">
            <div style="font-size:10px;color:#556677;letter-spacing:2px;margin-bottom:8px">FACTION UNITS</div>
            <div style="font-size:12px;color:#88ffaa;margin-bottom:8px">${race.factionUnitLabel}</div>
            ${factionList}
          </div>
        </div>

        <!-- Right: Tier Ratings -->
        <div style="flex:0 0 380px;overflow-y:auto;max-height:calc(100vh - 240px)">
          <div style="background:rgba(255,255,255,0.03);border:1px solid #334455;border-radius:8px;padding:20px">
            <div style="font-size:10px;color:#556677;letter-spacing:2px;margin-bottom:12px">TIER RATINGS</div>
            ${tierBars}
          </div>
        </div>
      </div>

      <div style="display:flex;gap:12px;padding:20px 0 30px">
        <button id="wb-overview-back" style="${this._menuBtnStyle("#555", "#888")}">
          \u2190 Back
        </button>
        <button id="wb-overview-next" style="${this._menuBtnStyle("#4a2a0a", "#daa520")}">
          \u{1F451} Recruit Army \u2192
        </button>
      </div>
    `;

    document.getElementById("wb-overview-next")?.addEventListener("click", () => {
      this._removeRaceOverview();
      this._showArmySetup();
    });

    document.getElementById("wb-overview-back")?.addEventListener("click", () => {
      this._removeRaceOverview();
      this._showRaceSelect();
    });
  }

  private _removeRaceOverview(): void {
    if (this._raceOverviewContainer?.parentNode) {
      this._raceOverviewContainer.parentNode.removeChild(this._raceOverviewContainer);
      this._raceOverviewContainer = null;
    }
  }

  // ---- Army setup screen ---------------------------------------------------

  private _showArmySetup(): void {
    this._playerArmy = new Array(UNIT_TYPES.length).fill(0);
    this._enemyArmy = new Array(UNIT_TYPES.length).fill(0);
    this._shopActiveTab = 0;
    this._shopActiveSide = "player";
    this._shopPlayerGoldSpent = 0;
    this._shopEnemyGoldSpent = 0;
    this._shopMercIndices = _generateWarbandMercenaries(this._selectedRaceId);
    this._shopRandomOn = false;

    this._armySetupContainer = document.createElement("div");
    this._armySetupContainer.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      z-index: 30; background: rgba(10, 8, 5, 0.97);
      display: flex; flex-direction: column; align-items: center;
      font-family: monospace, 'Courier New', monospace; color: #e0d5c0;
      user-select: none; overflow: hidden;
    `;

    const container = document.getElementById("pixi-container");
    if (container) container.appendChild(this._armySetupContainer);

    this._renderArmySetup();
  }

  private _buildShopTabs(): Array<{ id: string; label: string; color: string; desc: string }> {
    const tabs = [...WARBAND_SHOP_TABS];
    // Add faction tab for selected race
    const raceName = FACTION_NAMES[this._selectedRaceId] ?? this._selectedRaceId;
    const raceColor = FACTION_COLORS[this._selectedRaceId] ?? "#ffaa44";
    const hasFaction = UNIT_TYPES.some((ut) => ut.faction === this._selectedRaceId);
    if (hasFaction) {
      tabs.push({
        id: "faction",
        label: raceName.toUpperCase(),
        color: raceColor,
        desc: `Elite warriors unique to the ${raceName}. These faction-exclusive units are only available to this race.`,
      });
    }
    // Add mercenary tab
    if (this._shopMercIndices.length > 0) {
      const mercRaces = [...new Set(this._shopMercIndices.map((i) => FACTION_NAMES[UNIT_TYPES[i].faction ?? ""] ?? ""))].filter(Boolean);
      tabs.push({
        id: "mercenaries",
        label: "MERCS",
        color: "#ffaa00",
        desc: `Hired swords from foreign lands. These mercenaries from the ${mercRaces.join(" & ")} offer their services for gold.`,
      });
    }
    return tabs;
  }

  private _fillRandomArmy(): void {
    const army = this._shopActiveSide === "player" ? this._playerArmy : this._enemyArmy;
    // Clear current side
    for (let i = 0; i < army.length; i++) army[i] = 0;
    if (this._shopActiveSide === "player") this._shopPlayerGoldSpent = 0;
    else this._shopEnemyGoldSpent = 0;

    const MAX_ARMY = 250;
    const available = _getAllAvailableUnits(this._selectedRaceId, this._shopMercIndices)
      .filter((i) => (UNIT_TYPES[i].cost ?? 100) <= WARBAND_SHOP_GOLD);
    if (available.length === 0) return;

    let remaining = WARBAND_SHOP_GOLD;
    let total = 0;
    let safety = 500;
    while (remaining > 0 && total < MAX_ARMY && safety-- > 0) {
      const affordable = available.filter((i) => (UNIT_TYPES[i].cost ?? 100) <= remaining);
      if (affordable.length === 0) break;
      const pick = affordable[Math.floor(Math.random() * affordable.length)];
      const cost = UNIT_TYPES[pick].cost ?? 100;
      army[pick]++;
      remaining -= cost;
      total++;
    }
    const spent = WARBAND_SHOP_GOLD - remaining;
    if (this._shopActiveSide === "player") this._shopPlayerGoldSpent = spent;
    else this._shopEnemyGoldSpent = spent;
  }

  private _fillOneOfEach(): void {
    const army = this._shopActiveSide === "player" ? this._playerArmy : this._enemyArmy;
    for (let i = 0; i < army.length; i++) army[i] = 0;
    if (this._shopActiveSide === "player") this._shopPlayerGoldSpent = 0;
    else this._shopEnemyGoldSpent = 0;

    const available = _getAllAvailableUnits(this._selectedRaceId, this._shopMercIndices);
    let spent = 0;
    for (const idx of available) {
      const cost = UNIT_TYPES[idx].cost ?? 100;
      if (spent + cost <= WARBAND_SHOP_GOLD) {
        army[idx] = 1;
        spent += cost;
      }
    }
    if (this._shopActiveSide === "player") this._shopPlayerGoldSpent = spent;
    else this._shopEnemyGoldSpent = spent;
  }

  private _renderArmySetup(): void {
    if (!this._armySetupContainer) return;

    const MAX_ARMY = 250;
    const playerTotal = this._playerArmy.reduce((a, b) => a + b, 0);
    const enemyTotal = this._enemyArmy.reduce((a, b) => a + b, 0);
    const tabs = this._buildShopTabs();
    const activeTab = tabs[this._shopActiveTab] ?? tabs[0];
    const isPlayer = this._shopActiveSide === "player";
    const army = isPlayer ? this._playerArmy : this._enemyArmy;
    const goldSpent = isPlayer ? this._shopPlayerGoldSpent : this._shopEnemyGoldSpent;
    const goldRemaining = WARBAND_SHOP_GOLD - goldSpent;
    const sideColor = isPlayer ? "#4488ff" : "#ff4444";
    const sideLabel = isPlayer ? "YOUR ARMY" : "ENEMY ARMY";

    const { regular, elite } = _getUnitsForTab(activeTab.id, this._selectedRaceId, this._shopMercIndices);

    // Build unit tooltip HTML
    const unitTooltip = (ut: UnitTypeDef): string => {
      const lines: string[] = [];
      const hp = ut.creatureType
        ? CREATURE_DEFS[ut.creatureType].hp
        : (ut.hpOverride ?? 100);
      lines.push(`<span style="color:#ff8866">HP: ${hp}</span>`);

      if (ut.creatureType) {
        const cd = CREATURE_DEFS[ut.creatureType];
        lines.push(`<span style="color:#ff6644">Damage: ${cd.damage}</span>`);
        lines.push(`<span style="color:#aabbcc">Reach: ${cd.reach.toFixed(1)}</span>`);
        lines.push(`<span style="color:#88bbff">Speed: ${cd.speed.toFixed(1)}</span>`);
        lines.push(`<span style="color:#ccaa88">Scale: ${cd.scale.toFixed(1)}x</span>`);
        if (cd.specialAbility) {
          const ab = cd.specialAbility;
          const abilityNames: Record<string, string> = {
            fire_breath: "Fire Breath", stomp: "Stomp", regenerate: "Regenerate",
            explode_on_death: "Explode on Death", poison_aura: "Poison Aura",
            lightning_strike: "Lightning Strike", ice_nova: "Ice Nova", summon: "Summon",
          };
          const name = abilityNames[ab.type] ?? ab.type;
          let abLine = `<span style="color:#ff44ff">Ability: ${name}`;
          if (ab.damage > 0) abLine += ` (${ab.damage} dmg`;
          else abLine += ` (`;
          if (ab.radius > 0) abLine += `, ${ab.radius}m radius`;
          abLine += `, ${(ab.cooldownTicks / 60).toFixed(0)}s cd)</span>`;
          lines.push(abLine);
        }
      } else {
        const w = WEAPON_DEFS[ut.mainHand];
        if (w) {
          let wLine = `<span style="color:#ff6644">Weapon: ${w.name} (${w.damage} dmg, ${w.speed.toFixed(1)} spd, ${w.reach.toFixed(1)} rng)`;
          if (w.ammo) wLine += ` [${w.ammo} ammo]`;
          wLine += `</span>`;
          lines.push(wLine);
        }
        const off = ut.offHand ? WEAPON_DEFS[ut.offHand] : null;
        if (off) {
          let oLine = `<span style="color:#6699cc">Off-hand: ${off.name}`;
          if (off.shieldHp) oLine += ` (${off.shieldHp} HP)`;
          oLine += `</span>`;
          lines.push(oLine);
        }
        // Total armor defense
        let totalDef = 0;
        let totalWeight = 0;
        for (const slot of [ut.head, ut.torso, ut.gauntlets, ut.legs, ut.boots]) {
          const a = ARMOR_DEFS[slot];
          if (a) { totalDef += a.defense; totalWeight += a.weight; }
        }
        if (totalDef > 0) lines.push(`<span style="color:#88cc88">Armor: ${totalDef} def, ${totalWeight} wgt</span>`);
        if (ut.speedMultiplier && ut.speedMultiplier !== 1.0) {
          lines.push(`<span style="color:#88bbff">Speed: ${(ut.speedMultiplier * 100).toFixed(0)}%</span>`);
        }
        if (ut.scale && ut.scale !== 1.0) {
          lines.push(`<span style="color:#ccaa88">Scale: ${ut.scale.toFixed(1)}x</span>`);
        }
        if (ut.horseArmor) {
          lines.push(`<span style="color:#ddaa44">Mount: ${ut.horseArmor} horse</span>`);
        }
        // Mage spell ability info
        const w2 = WEAPON_DEFS[ut.mainHand];
        if (w2 && w2.category === "staff") {
          let spellType = "Arcane Blast";
          if (ut.mainHand.includes("fire")) spellType = "Fire AoE";
          else if (ut.mainHand.includes("cold")) spellType = "Frost AoE";
          else if (ut.mainHand.includes("storm") || ut.mainHand.includes("lightning")) spellType = "Chain Lightning";
          else if (ut.mainHand.includes("distortion")) spellType = "Distortion Chain";
          else if (ut.mainHand.includes("healing") || ut.mainHand.includes("cleric") || ut.mainHand.includes("saint")) spellType = "Healing AoE";
          let tier = "Base";
          if (ut.mainHand.includes("master") || ut.mainHand.includes("dark_savant")) tier = "Master";
          else if (ut.mainHand.includes("adept") || ut.mainHand.includes("warlock")) tier = "Adept";
          else if (ut.mainHand.includes("battlemage") || ut.mainHand.includes("archmage")) tier = "Elite";
          lines.push(`<span style="color:#ff44ff">Ability: ${spellType} (${tier} tier)</span>`);
        }
      }
      return lines.join("<br>");
    };

    // Build unit row HTML
    const unitRow = (idx: number): string => {
      const ut = UNIT_TYPES[idx];
      const cost = ut.cost ?? 100;
      const tier = ut.tier ?? 1;
      const count = army[idx] ?? 0;
      const canAfford = goldRemaining >= cost;
      const tierColors = ["", "#aabbcc", "#88cc88", "#44aaee", "#ccaa44", "#ee8844", "#ee4488", "#ff44ff"];
      const tierColor = tierColors[tier] ?? "#aabbcc";
      const tooltip = unitTooltip(ut);
      return `
        <div class="wb-unit-row" data-idx="${idx}" style="display:flex;align-items:center;padding:6px 10px;
          margin:2px 0;background:rgba(255,255,255,0.03);border:1px solid transparent;border-radius:6px;cursor:pointer;min-height:38px;
          transition:all 0.15s;position:relative"
          onmouseover="this.style.background='rgba(255,255,255,0.08)';this.style.borderColor='${tierColor}44';var t=this.querySelector('.wb-tip');if(t)t.style.display='block'"
          onmouseout="this.style.background='rgba(255,255,255,0.03)';this.style.borderColor='transparent';var t=this.querySelector('.wb-tip');if(t)t.style.display='none'">
          <span style="color:${tierColor};font-weight:bold;width:28px;font-size:11px;flex-shrink:0">T${tier}</span>
          <span style="font-size:16px;width:24px;text-align:center;flex-shrink:0">${ut.icon}</span>
          <div style="flex:1;min-width:0;padding:0 8px">
            <div style="font-size:13px;color:#ccddee;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${ut.name}</div>
            <div style="font-size:10px;color:#778877">${ut.description}</div>
          </div>
          <div style="font-size:11px;color:#aabb88;font-weight:bold;margin-right:8px;flex-shrink:0">${cost}g</div>
          <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
            <button data-action="sub" data-idx="${idx}" style="width:28px;height:28px;border:1px solid #555;
              border-radius:5px;background:linear-gradient(180deg,#2a1a2a,#1a0a1a);color:#fff;font-size:16px;font-weight:bold;cursor:pointer;
              font-family:monospace;display:flex;align-items:center;justify-content:center">-</button>
            <span style="width:30px;text-align:center;font-size:15px;font-weight:bold;color:#fff">${count}</span>
            <button data-action="add" data-idx="${idx}" style="width:28px;height:28px;border:1px solid ${canAfford ? "#555" : "#333"};
              border-radius:5px;background:${canAfford ? "linear-gradient(180deg,#2a1a2a,#1a0a1a)" : "#0a0a10"};color:${canAfford ? "#fff" : "#444"};
              font-size:16px;font-weight:bold;cursor:${canAfford ? "pointer" : "not-allowed"};
              font-family:monospace;display:flex;align-items:center;justify-content:center">+</button>
          </div>
          <!-- Tooltip -->
          <div class="wb-tip" style="display:none;position:absolute;right:100%;top:50%;transform:translateY(-50%);
            margin-right:8px;background:rgba(10,8,18,0.97);border:1px solid ${tierColor}88;border-radius:6px;
            padding:10px 14px;width:280px;z-index:50;pointer-events:none;
            box-shadow:0 4px 20px rgba(0,0,0,0.6);font-size:11px;line-height:1.7">
            <div style="font-size:14px;font-weight:bold;color:${tierColor};margin-bottom:4px">${ut.icon} ${ut.name}</div>
            <div style="color:#889;font-size:10px;margin-bottom:6px;border-bottom:1px solid #334;padding-bottom:4px">${ut.description}</div>
            ${tooltip}
          </div>
        </div>
      `;
    };

    let unitListHTML = regular.map((idx) => unitRow(idx)).join("");
    if (elite.length > 0) {
      unitListHTML += `
        <div style="display:flex;align-items:center;margin:8px 0;gap:8px">
          <div style="flex:1;height:1px;background:#ddaa44;opacity:0.5"></div>
          <span style="font-size:10px;font-weight:bold;color:#ddaa44;letter-spacing:2px">ELITE</span>
          <div style="flex:1;height:1px;background:#ddaa44;opacity:0.5"></div>
        </div>
      `;
      unitListHTML += elite.map((idx) => unitRow(idx)).join("");
    }
    if (regular.length === 0 && elite.length === 0) {
      unitListHTML = `<div style="padding:20px;text-align:center;color:#666">No units available in this category.</div>`;
    }

    // Build tab bar HTML
    const tabBarHTML = tabs.map((tab, i) => {
      const isActive = i === this._shopActiveTab;
      const bgStyle = isActive
        ? `background:${tab.color}33;border:2px solid ${tab.color};border-bottom:3px solid ${tab.color}`
        : `background:rgba(17,17,34,0.5);border:1px solid #334455`;
      const textColor = isActive ? tab.color : "#888899";
      return `<button data-tab="${i}" style="${bgStyle};border-radius:4px 4px 0 0;padding:6px 8px;
        font-size:11px;font-weight:bold;color:${textColor};cursor:pointer;font-family:monospace;
        letter-spacing:1px;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${tab.label}</button>`;
    }).join("");

    // Build roster summary
    const rosterSummary = (armyArr: number[], label: string, color: string): string => {
      const entries: string[] = [];
      for (let i = 0; i < armyArr.length; i++) {
        if (armyArr[i] > 0) entries.push(`${UNIT_TYPES[i].name} x${armyArr[i]}`);
      }
      const total = armyArr.reduce((a, b) => a + b, 0);
      const text = entries.length > 0 ? entries.join(", ") : "No units";
      return `<div style="font-size:10px;color:#99aabb;margin:2px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
        <span style="color:${color};font-weight:bold">${label}</span> (${total}): ${text}
      </div>`;
    };

    const canStart = playerTotal > 0 && enemyTotal > 0;

    // Random toggle styling
    const randOn = this._shopRandomOn;
    const randBg = randOn ? "#1a3a1a" : "#2a1a1a";
    const randBorder = randOn ? "#44aa66" : "#aa4444";
    const randColor = randOn ? "#88ffaa" : "#ff8888";
    const randLabel = randOn ? "RANDOM ARMY: ON  [click to disable]" : "RANDOM ARMY: OFF  [click to enable]";

    // Gold adjustment button style
    const goldBtnStyle = `padding:4px 10px;border:1px solid #997722;border-radius:4px;
      background:#1a1a0a;color:#ffcc00;font-size:11px;font-weight:bold;cursor:pointer;font-family:monospace`;

    this._armySetupContainer.innerHTML = `
      <div style="width:100%;max-width:960px;height:100%;display:flex;flex-direction:column;padding:10px 20px;box-sizing:border-box">
        <!-- Title -->
        <div style="text-align:center;padding:8px 0;border-bottom:1px solid #332a1a">
          <div style="font-size:20px;color:#daa520;font-weight:bold;letter-spacing:3px;text-shadow:0 0 10px rgba(218,165,32,0.2)">RECRUIT ARMY</div>
          <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-top:4px">
            <div style="width:40px;height:1px;background:linear-gradient(90deg,transparent,#997722)"></div>
            <div style="font-size:15px;color:#ffcc00;font-weight:bold;letter-spacing:1px">
              ${goldRemaining} <span style="color:#997722;font-size:11px">/ ${WARBAND_SHOP_GOLD} gold</span>
            </div>
            <div style="width:40px;height:1px;background:linear-gradient(90deg,#997722,transparent)"></div>
          </div>
        </div>

        <!-- Side toggle + roster summary -->
        <div style="background:rgba(13,13,32,0.7);border:1px solid #99772233;border-radius:5px;padding:6px 8px;margin:4px 0">
          <div style="display:flex;gap:8px;margin-bottom:4px">
            <button id="wb-side-player" style="flex:1;padding:6px;border:2px solid ${isPlayer ? "#4488ff" : "#333"};
              border-radius:4px;background:${isPlayer ? "rgba(68,136,255,0.15)" : "transparent"};
              color:${isPlayer ? "#4488ff" : "#666"};font-weight:bold;font-size:13px;cursor:pointer;font-family:monospace">
              YOUR ARMY (${playerTotal})
            </button>
            <button id="wb-side-enemy" style="flex:1;padding:6px;border:2px solid ${!isPlayer ? "#ff4444" : "#333"};
              border-radius:4px;background:${!isPlayer ? "rgba(255,68,68,0.15)" : "transparent"};
              color:${!isPlayer ? "#ff4444" : "#666"};font-weight:bold;font-size:13px;cursor:pointer;font-family:monospace">
              ENEMY ARMY (${enemyTotal})
            </button>
          </div>
          ${rosterSummary(this._playerArmy, "Your Army", "#4488ff")}
          ${rosterSummary(this._enemyArmy, "Enemy Army", "#ff4444")}
        </div>

        <!-- Tab bar -->
        <div style="display:flex;gap:3px;margin-top:4px">${tabBarHTML}</div>

        <!-- Content: unit list + detail panel -->
        <div style="flex:1;display:flex;gap:16px;margin-top:2px;min-height:0;overflow:hidden">
          <!-- Left: unit list -->
          <div style="flex:1.4;overflow-y:auto;padding-right:4px;
            scrollbar-width:thin;scrollbar-color:#334 #111">
            <div style="padding:4px 0">
              <!-- Random army toggle -->
              <div style="display:flex;gap:4px;margin:2px 0 4px">
                <div id="wb-random-toggle" style="flex:1;padding:6px;border-radius:4px;
                  background:${randBg};border:1.5px solid ${randBorder};text-align:center;cursor:pointer;
                  font-size:12px;font-weight:bold;color:${randColor}">${randLabel}</div>
                <div id="wb-one-each" style="padding:6px 12px;border-radius:4px;
                  background:#1a1a2a;border:1.5px solid #6666aa;text-align:center;cursor:pointer;
                  font-size:12px;font-weight:bold;color:#aaaaff;white-space:nowrap">1 OF EACH</div>
              </div>
              <!-- Gold adjustment -->
              <div style="display:flex;align-items:center;justify-content:center;gap:6px;margin:2px 0 6px">
                <span style="font-size:10px;color:#997722;font-weight:bold">GOLD TO SPEND:</span>
                <button id="wb-gold-sub" style="${goldBtnStyle}">-</button>
                <span style="font-size:13px;color:#ffcc00;font-weight:bold;min-width:60px;text-align:center">${WARBAND_SHOP_GOLD}</span>
                <button id="wb-gold-add" style="${goldBtnStyle}">+</button>
                <span style="font-size:9px;color:#665;margin-left:4px">Shift \u00b15k, Ctrl \u00b1100k</span>
              </div>
              <div style="font-size:10px;color:#888;margin-bottom:4px;padding:0 8px">
                Editing: <span style="color:${sideColor};font-weight:bold">${sideLabel}</span>
                &nbsp;|&nbsp; Shift+click \u00b15 &nbsp;|&nbsp; Ctrl+click \u00b110
              </div>
              ${unitListHTML}
            </div>
          </div>
          <!-- Right: detail panel -->
          <div style="flex:1;display:flex;flex-direction:column;padding:16px;
            background:rgba(16,16,42,0.6);border:1px solid ${activeTab.color}44;border-radius:8px;
            box-shadow:inset 0 1px 0 rgba(255,255,255,0.03)">
            <div style="font-size:16px;font-weight:bold;color:${activeTab.color};letter-spacing:1px;margin-bottom:6px">
              ${activeTab.label}
            </div>
            <div style="width:50%;height:2px;background:${activeTab.color};opacity:0.5;margin-bottom:8px;border-radius:1px"></div>
            <div style="font-size:11px;color:#aabbcc;line-height:1.6;margin-bottom:12px">${activeTab.desc}</div>
            <div style="font-size:10px;color:#667;letter-spacing:1px;margin-bottom:6px">LEADER SPAWN</div>
            <div style="font-size:12px;color:#ccddee;padding:8px;background:rgba(255,255,255,0.03);border:1px solid #334455;border-radius:4px">
              Your leader <span style="color:#ffd700;font-weight:bold">${(LEADER_DEFINITIONS.find(l => l.id === this._selectedLeaderId) ?? LEADER_DEFINITIONS[0]).name}</span>
              spawns you as: <span style="color:#88ffaa;font-weight:bold">${_getLeaderSpawnUnit(this._selectedLeaderId).name}</span>
            </div>
            <div style="font-size:10px;color:#667;letter-spacing:1px;margin-top:14px;margin-bottom:4px">HOVER UNIT FOR DETAILS</div>
            <div style="font-size:10px;color:#556">Hover over any unit row to see full stats</div>
          </div>
        </div>

        <!-- Bottom bar -->
        <div style="display:flex;gap:10px;padding:8px 0;justify-content:center;flex-shrink:0">
          <button id="wb-army-start" style="${this._menuBtnStyle(canStart ? "#2a6a2a" : "#333", canStart ? "#88cc66" : "#555")};
            padding:10px 24px;font-size:15px" ${canStart ? "" : "disabled"}>
            \u2694\uFE0F Start Battle (${playerTotal} vs ${enemyTotal})
          </button>
          <button id="wb-army-back" style="${this._menuBtnStyle("#555", "#888")};padding:10px 24px;font-size:15px">
            \u2190 Back
          </button>
        </div>
      </div>
    `;

    // Wire up tab clicks
    this._armySetupContainer.querySelectorAll("[data-tab]").forEach((el) => {
      (el as HTMLElement).addEventListener("click", () => {
        this._shopActiveTab = parseInt((el as HTMLElement).dataset.tab!, 10);
        this._renderArmySetup();
      });
    });

    // Wire up side toggles
    document.getElementById("wb-side-player")?.addEventListener("click", () => {
      this._shopActiveSide = "player";
      this._renderArmySetup();
    });
    document.getElementById("wb-side-enemy")?.addEventListener("click", () => {
      this._shopActiveSide = "enemy";
      this._renderArmySetup();
    });

    // Wire up random army toggle
    document.getElementById("wb-random-toggle")?.addEventListener("click", () => {
      this._shopRandomOn = !this._shopRandomOn;
      if (this._shopRandomOn) {
        this._fillRandomArmy();
      } else {
        // Clear current side
        const a = this._shopActiveSide === "player" ? this._playerArmy : this._enemyArmy;
        for (let i = 0; i < a.length; i++) a[i] = 0;
        if (this._shopActiveSide === "player") this._shopPlayerGoldSpent = 0;
        else this._shopEnemyGoldSpent = 0;
      }
      this._renderArmySetup();
    });

    // Wire up 1 of each button
    document.getElementById("wb-one-each")?.addEventListener("click", () => {
      this._shopRandomOn = false;
      this._fillOneOfEach();
      this._renderArmySetup();
    });

    // Wire up gold adjustment buttons
    document.getElementById("wb-gold-sub")?.addEventListener("click", (e: MouseEvent) => {
      const amount = e.ctrlKey ? 100000 : e.shiftKey ? 5000 : 1000;
      WARBAND_SHOP_GOLD = Math.max(1000, WARBAND_SHOP_GOLD - amount);
      this._renderArmySetup();
    });
    document.getElementById("wb-gold-add")?.addEventListener("click", (e: MouseEvent) => {
      const amount = e.ctrlKey ? 100000 : e.shiftKey ? 5000 : 1000;
      WARBAND_SHOP_GOLD += amount;
      this._renderArmySetup();
    });

    // Wire up +/- buttons
    this._armySetupContainer.querySelectorAll("[data-action]").forEach((el) => {
      const btn = el as HTMLElement;
      const action = btn.dataset.action!;
      const idx = parseInt(btn.dataset.idx!, 10);

      btn.addEventListener("click", (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const currentArmy = this._shopActiveSide === "player" ? this._playerArmy : this._enemyArmy;
        const cost = UNIT_TYPES[idx].cost ?? 100;
        const currentGoldSpent = this._shopActiveSide === "player" ? this._shopPlayerGoldSpent : this._shopEnemyGoldSpent;
        const currentTotal = currentArmy.reduce((a, b) => a + b, 0);
        const amount = e.ctrlKey ? 10 : e.shiftKey ? 5 : 1;

        if (action === "add") {
          let toAdd = amount;
          for (let n = 0; n < toAdd; n++) {
            if (currentGoldSpent + cost * (n + 1) > WARBAND_SHOP_GOLD) { toAdd = n; break; }
            if (currentTotal + n + 1 > MAX_ARMY) { toAdd = n; break; }
          }
          if (toAdd > 0) {
            currentArmy[idx] += toAdd;
            if (this._shopActiveSide === "player") this._shopPlayerGoldSpent += cost * toAdd;
            else this._shopEnemyGoldSpent += cost * toAdd;
            this._renderArmySetup();
          }
        } else {
          const toRemove = Math.min(amount, currentArmy[idx]);
          if (toRemove > 0) {
            currentArmy[idx] -= toRemove;
            if (this._shopActiveSide === "player") this._shopPlayerGoldSpent -= cost * toRemove;
            else this._shopEnemyGoldSpent -= cost * toRemove;
            this._renderArmySetup();
          }
        }
      });
    });

    // Wire up start / back
    document.getElementById("wb-army-start")?.addEventListener("click", () => {
      this._removeArmySetup();
      this._startGame(BattleType.ARMY_BATTLE);
    });
    document.getElementById("wb-army-back")?.addEventListener("click", () => {
      this._removeArmySetup();
      this._showRaceOverview();
    });
  }

  private _removeArmySetup(): void {
    if (this._armySetupContainer?.parentNode) {
      this._armySetupContainer.parentNode.removeChild(this._armySetupContainer);
      this._armySetupContainer = null;
    }
  }

  private _equipUnitType(fighter: WarbandFighter, unitType: UnitTypeDef, state?: WarbandState): void {
    // Use unit type name for kill feed
    fighter.name = unitType.name;

    // Creature units — override stats from CreatureDef, no equipment
    if (unitType.creatureType) {
      const cDef = CREATURE_DEFS[unitType.creatureType];
      fighter.creatureType = unitType.creatureType;
      fighter.creatureRadius = cDef.radius;
      fighter.hp = cDef.hp;
      fighter.maxHp = cDef.hp;
      fighter.equipment.mainHand = null;
      fighter.equipment.offHand = null;
      fighter.equipment.armor = {};
      if (fighter.ai) {
        fighter.ai.preferredRange = cDef.reach * 0.8;
        fighter.ai.aggressiveness = 0.7;
        fighter.ai.blockChance = 0.15; // creatures don't block well
      }
      return;
    }

    fighter.equipment.mainHand = WEAPON_DEFS[unitType.mainHand] ?? null;
    fighter.equipment.offHand = unitType.offHand ? (WEAPON_DEFS[unitType.offHand] ?? null) : null;
    fighter.equipment.armor = {
      [ArmorSlot.HEAD]: ARMOR_DEFS[unitType.head] ?? null,
      [ArmorSlot.TORSO]: ARMOR_DEFS[unitType.torso] ?? null,
      [ArmorSlot.GAUNTLETS]: ARMOR_DEFS[unitType.gauntlets] ?? null,
      [ArmorSlot.LEGS]: ARMOR_DEFS[unitType.legs] ?? null,
      [ArmorSlot.BOOTS]: ARMOR_DEFS[unitType.boots] ?? null,
    };

    // Apply HP override
    if (unitType.hpOverride) {
      fighter.hp = unitType.hpOverride;
      fighter.maxHp = unitType.hpOverride;
    }

    // Apply scale for oversized units
    if (unitType.scale && unitType.scale !== 1.0) {
      fighter.scale = unitType.scale;
      fighter.creatureRadius = WB.FIGHTER_RADIUS * unitType.scale;
    }

    // Set ammo for ranged units
    if (fighter.equipment.mainHand?.ammo) {
      fighter.ammo = fighter.equipment.mainHand.ammo;
      fighter.maxAmmo = fighter.equipment.mainHand.ammo;
    }

    // Create horse if cavalry unit
    if (unitType.horseArmor && state) {
      const horseId = `horse_${fighter.id}`;
      const horse = createHorse(horseId, unitType.horseArmor, { ...fighter.position }, fighter.id);
      horse.rotation = fighter.rotation;
      state.horses.push(horse);
      fighter.mountId = horseId;
      fighter.isMounted = true;
    }
  }

  // ---- Battle -------------------------------------------------------------

  private _startBattle(): void {
    if (!this._state) return;

    this._state.phase = WarbandPhase.BATTLE;
    this._inputSystem.pointerLockEnabled = true;

    // Handle player's shop horse purchase
    if (this._shop.pendingHorse) {
      const player = this._state.fighters.find(f => f.id === this._state!.playerId);
      if (player) {
        const horseId = `horse_${player.id}`;
        const horse = createHorse(horseId, this._shop.pendingHorse, { ...player.position }, player.id);
        horse.rotation = player.rotation;
        this._state.horses.push(horse);
        player.mountId = horseId;
        player.isMounted = true;
      }
      this._shop.pendingHorse = null;
    }

    // Create fighter meshes
    let playerIdx = 0;
    let enemyIdx = 0;
    for (const fighter of this._state.fighters) {
      if (fighter.creatureType) {
        const cMesh = new CreatureMesh(fighter);
        this._sceneManager.scene.add(cMesh.group);
        this._creatureMeshes.set(fighter.id, cMesh);
        continue;
      }
      const idx = fighter.team === "player" ? playerIdx++ : enemyIdx++;
      const mesh = new FighterMesh(fighter, idx);
      mesh.updateArmorVisuals(fighter);
      this._sceneManager.scene.add(mesh.group);
      this._fighterMeshes.set(fighter.id, mesh);
    }

    // Create horse meshes
    for (const horse of this._state.horses) {
      const hMesh = new HorseMesh(horse);
      this._sceneManager.scene.add(hMesh.group);
      this._horseMeshes.set(horse.id, hMesh);
    }

    // Init input
    this._inputSystem.init(
      this._sceneManager.canvas,
      this._cameraController,
    );

    // Start game loop
    this._lastTime = performance.now();
    this._simAccumulator = 0;
    this._gameLoop(this._lastTime);

    // Apply weather visual effects
    this._sceneManager.applyWeather(this._state.weather);

    this._hud.showCenterMessage("FIGHT!", 2000);
  }

  private _gameLoop = (time: number): void => {
    this._rafId = requestAnimationFrame(this._gameLoop);

    const rawDt = time - this._lastTime;
    this._lastTime = time;

    // Cap dt to avoid spiral of death
    const dt = Math.min(rawDt, 100);
    const dtSec = dt / 1000;

    if (!this._state || this._state.phase !== WarbandPhase.BATTLE || this._state.paused) {
      this._sceneManager.render();
      return;
    }

    // Fixed timestep simulation
    this._simAccumulator += dt;
    while (this._simAccumulator >= WB.SIM_TICK_MS) {
      this._simAccumulator -= WB.SIM_TICK_MS;
      this._simTick();
    }

    // Render
    this._updateVisuals(dtSec);
    this._fx.update(dtSec);
    this._sceneManager.render();
  };

  private _simTick(): void {
    if (!this._state) return;

    this._state.tick++;

    const isCameraView = this._state.battleType === BattleType.CAMERA_VIEW;

    // Input → player
    this._inputSystem.update(this._state);

    if (!isCameraView) {
      // AI
      this._aiSystem.update(this._state);

      // Combat (attacks, blocks, damage)
      this._combatSystem.update(this._state);

      // Creature special abilities
      this._combatSystem.updateCreatureAbilities(this._state);

      // Creature ability explosions (visual FX)
      for (const aoe of this._combatSystem.creatureAbilityExplosions) {
        this._fx.spawnAoeExplosion(aoe.x, aoe.y, aoe.z, aoe.radius, aoe.color);
      }

      // Process combat events
      for (const hit of this._combatSystem.hits) {
        if (hit.blocked) {
          this._fx.spawnHitSparks(hit.position.x, hit.position.y, hit.position.z, true);
        } else {
          this._fx.spawnBlood(hit.position.x, hit.position.y, hit.position.z, hit.damage);
          this._fx.spawnHitSparks(hit.position.x, hit.position.y, hit.position.z, false);
          // Morale: heavy damage penalty
          const hitTarget = this._state.fighters.find(f => f.id === hit.target);
          if (hitTarget) {
            this._aiSystem.applyDamageMorale(hitTarget, hit.damage, this._state);
          }
        }
      }

      // AoE spell explosions
      for (const aoe of this._combatSystem.aoeExplosions) {
        this._fx.spawnAoeExplosion(aoe.x, aoe.y, aoe.z, aoe.radius, aoe.color);
      }

      // Chain spell bolts
      for (const seg of this._combatSystem.chainSegments) {
        this._fx.spawnChainBolt(seg.from, seg.to, seg.color);
      }

      // Heal AoE rings
      for (const heal of this._combatSystem.healExplosions) {
        this._fx.spawnHealAoe(heal.x, heal.z, heal.radius);
      }

      for (const kill of this._combatSystem.kills) {
        const killer = this._state.fighters.find((f) => f.id === kill.killerId);
        const victim = this._state.fighters.find((f) => f.id === kill.victimId);
        if (killer && victim) {
          this._hud.addKill(killer.name, victim.name);
          // Morale: death morale effects on nearby fighters
          this._aiSystem.applyDeathMorale(victim, this._state);
          // Handle creature explode-on-death abilities
          this._combatSystem.handleCreatureDeathAbility(victim, this._state);
        }
      }
    }

    // Physics (movement, gravity, collisions)
    this._physicsSystem.update(this._state);

    if (!isCameraView) {
      const isSiege = this._state.battleType === BattleType.SIEGE;

      // Check win/loss — all attackers dead = defenders win
      if (this._state.playerTeamAlive <= 0) {
        this._endBattle(false);
      } else if (this._state.enemyTeamAlive <= 0) {
        this._endBattle(true);
      }

      // Siege capture zone logic
      if (isSiege) {
        const capX = WB.SIEGE_CAPTURE_X;
        const capZ = WB.SIEGE_CAPTURE_Z;
        const capR = WB.SIEGE_CAPTURE_RADIUS;
        const capCenter = { x: capX, y: 0, z: capZ };

        let attackersIn = 0;
        let defendersIn = 0;
        for (const f of this._state.fighters) {
          if (f.combatState === FighterCombatState.DEAD) continue;
          if (vec3DistXZ(f.position, capCenter) <= capR) {
            if (f.team === "player") attackersIn++;
            else defendersIn++;
          }
        }
        this._state.siegeAttackersInZone = attackersIn;
        this._state.siegeDefendersInZone = defendersIn;

        if (attackersIn > 0 && defendersIn === 0) {
          // Attackers holding uncontested — progress increases
          this._state.siegeCaptureProgress += attackersIn; // more attackers = faster capture
        } else if (defendersIn > 0 && attackersIn === 0) {
          // Defenders retaking — slowly drain progress
          this._state.siegeCaptureProgress = Math.max(0, this._state.siegeCaptureProgress - 1);
        }
        // Contested (both present) — no progress change

        // Attackers win by holding the centre long enough
        if (this._state.siegeCaptureProgress >= WB.SIEGE_CAPTURE_TICKS) {
          this._endBattle(true);
        }
      }

      // Battle timer
      this._state.battleTimer--;
      if (this._state.battleTimer <= 0) {
        if (isSiege) {
          // Time's up — defenders win (attackers failed to capture)
          this._endBattle(false);
        } else {
          // Time's up - team with more alive wins
          this._endBattle(this._state.playerTeamAlive > this._state.enemyTeamAlive);
        }
      }
    }
  }

  private _updateVisuals(dt: number): void {
    if (!this._state) return;

    // Build fighter lookup map once per frame (avoids repeated .find() calls)
    const fighterById = new Map<string, typeof this._state.fighters[0]>();
    for (const f of this._state.fighters) fighterById.set(f.id, f);

    const player = fighterById.get(this._state.playerId);
    if (player) {
      this._cameraController.update(this._state, player);
    }

    // Update fighter meshes
    for (const fighter of this._state.fighters) {
      // Creature mesh
      const cMesh = this._creatureMeshes.get(fighter.id);
      if (cMesh) {
        cMesh.update(fighter, dt, this._sceneManager.camera);
        continue;
      }
      // Humanoid mesh
      const mesh = this._fighterMeshes.get(fighter.id);
      if (mesh) {
        mesh.update(fighter, dt, this._sceneManager.camera);
      }
    }

    // Update horse meshes
    for (const horse of this._state.horses) {
      let hMesh = this._horseMeshes.get(horse.id);
      if (!hMesh) {
        // Horse was created mid-battle (shouldn't normally happen but be safe)
        hMesh = new HorseMesh(horse);
        this._sceneManager.scene.add(hMesh.group);
        this._horseMeshes.set(horse.id, hMesh);
      }
      // Calculate rider speed for animation
      let riderSpeed = 0;
      if (horse.riderId) {
        const rider = fighterById.get(horse.riderId);
        if (rider) {
          riderSpeed = Math.sqrt(rider.velocity.x ** 2 + rider.velocity.z ** 2);
        }
      }
      hMesh.update(horse, riderSpeed, dt, this._sceneManager.camera);
    }

    // Update projectile visuals (shared geometries to reduce allocations)
    for (const proj of this._state.projectiles) {
      let mesh = this._projectileMeshes.get(proj.id);
      if (!mesh) {
        if (proj.projectileColor != null) {
          // Magic ray: glowing elongated beam with bright core (no PointLight for performance)
          const group = new THREE.Group();
          // Outer glow
          if (!this._sharedRayOuterGeo) {
            this._sharedRayOuterGeo = new THREE.CylinderGeometry(0.06, 0.02, 0.8, 5);
            this._sharedRayInnerGeo = new THREE.CylinderGeometry(0.025, 0.01, 0.7, 5);
            this._sharedRayTipGeo = new THREE.SphereGeometry(0.07, 4, 4);
            this._sharedRayCoreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
          }
          const outerMat = new THREE.MeshBasicMaterial({
            color: proj.projectileColor,
            transparent: true,
            opacity: 0.35,
          });
          group.add(new THREE.Mesh(this._sharedRayOuterGeo, outerMat));
          // Inner bright core (shared white material)
          group.add(new THREE.Mesh(this._sharedRayInnerGeo!, this._sharedRayCoreMat!));
          // Bright tip orb
          const tipMat = new THREE.MeshBasicMaterial({ color: proj.projectileColor });
          const tipMesh = new THREE.Mesh(this._sharedRayTipGeo!, tipMat);
          tipMesh.position.y = 0.4;
          group.add(tipMesh);
          this._sceneManager.scene.add(group);
          mesh = group as unknown as THREE.Mesh;
          this._projectileMeshes.set(proj.id, mesh);
        } else {
          // Arrow: standard brown cylinder (shared geometry)
          if (!this._sharedArrowGeo) {
            this._sharedArrowGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.5, 4);
            this._sharedArrowMat = new THREE.MeshBasicMaterial({ color: 0x8b6914 });
          }
          mesh = new THREE.Mesh(this._sharedArrowGeo, this._sharedArrowMat!);
          this._sceneManager.scene.add(mesh);
          this._projectileMeshes.set(proj.id, mesh);
        }
      }
      mesh.position.set(proj.position.x, proj.position.y, proj.position.z);
      // Orient along velocity
      const vLenSq = proj.velocity.x ** 2 + proj.velocity.y ** 2 + proj.velocity.z ** 2;
      if (vLenSq > 0.01) {
        mesh.lookAt(
          proj.position.x + proj.velocity.x,
          proj.position.y + proj.velocity.y,
          proj.position.z + proj.velocity.z,
        );
        mesh.rotateX(Math.PI / 2);
      }
    }

    // Remove dead projectile meshes
    const liveProjectileIds = new Set(this._state.projectiles.map((p) => p.id));
    for (const [id, mesh] of this._projectileMeshes) {
      if (!liveProjectileIds.has(id)) {
        this._sceneManager.scene.remove(mesh);
        if ((mesh as unknown as THREE.Group).isGroup) {
          // Magic ray group — dispose only per-instance materials (geometries are shared)
          const group = mesh as unknown as THREE.Group;
          group.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mat = (child as THREE.Mesh).material as THREE.Material;
              if (mat !== this._sharedRayCoreMat) mat.dispose();
            }
          });
        }
        // Arrow meshes share geometry+material, no disposal needed per instance
        this._projectileMeshes.delete(id);
      }
    }

    // Update pickup visuals
    for (const pickup of this._state.pickups) {
      let group = this._pickupMeshes.get(pickup.id);
      if (!group) {
        group = new THREE.Group();
        // Shared pickup geometries (lazy init)
        if (!this._sharedPickupGeo) {
          this._sharedPickupGeo = new THREE.BoxGeometry(0.3, 0.1, 0.1);
          this._sharedPickupRingGeo = new THREE.RingGeometry(0.3, 0.4, 16);
          this._sharedPickupRingMat = new THREE.MeshBasicMaterial({
            color: 0xffdd44,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide,
          });
        }
        // Floating weapon indicator (per-pickup color material)
        const mat = new THREE.MeshStandardMaterial({
          color: pickup.weapon.color,
          emissive: 0x444400,
          emissiveIntensity: 0.3,
        });
        const mesh = new THREE.Mesh(this._sharedPickupGeo, mat);
        group.add(mesh);

        // Glow ring (shared geometry + material)
        const ring = new THREE.Mesh(this._sharedPickupRingGeo!, this._sharedPickupRingMat!);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.02;
        group.add(ring);

        this._sceneManager.scene.add(group);
        this._pickupMeshes.set(pickup.id, group);
      }

      group.position.set(
        pickup.position.x,
        pickup.position.y + 0.5 + Math.sin(Date.now() * 0.003) * 0.15,
        pickup.position.z,
      );
      group.rotation.y += 0.02;
    }

    // Remove dead pickup meshes
    const livePickupIds = new Set(this._state.pickups.map((p) => p.id));
    for (const [id, group] of this._pickupMeshes) {
      if (!livePickupIds.has(id)) {
        this._sceneManager.scene.remove(group);
        group.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            // Only dispose per-instance materials; shared geo/mat handled in destroy()
            const mat = obj.material as THREE.Material;
            if (mat !== this._sharedPickupRingMat) mat.dispose();
          }
        });
        this._pickupMeshes.delete(id);
      }
    }

    // HUD
    this._hud.update(this._state);
  }

  // ---- End battle ---------------------------------------------------------

  private _endBattle(playerWon: boolean): void {
    if (!this._state) return;

    this._state.phase = WarbandPhase.RESULTS;

    if (playerWon) {
      this._state.playerWins++;
      this._hud.showCenterMessage("VICTORY!", 3000);
    } else {
      this._state.enemyWins++;
      this._hud.showCenterMessage("DEFEAT!", 3000);
    }

    // Exit pointer lock and prevent re-locking during results
    this._inputSystem.pointerLockEnabled = false;
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }

    // Show results after delay
    setTimeout(() => {
      this._showResults(playerWon);
    }, 2000);
  }

  private _showResults(won: boolean): void {
    if (!this._state) return;

    // Ensure pointer is unlocked so buttons are clickable
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }

    const player = this._state.fighters.find((f) => f.id === this._state!.playerId);
    if (!player) return;

    this._resultsContainer = document.createElement("div");
    this._resultsContainer.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      z-index: 30; background: rgba(10, 8, 5, 0.9);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      font-family: 'Segoe UI', sans-serif; color: #e0d5c0;
    `;

    const allFighters = this._state.fighters;

    // Check if any mages present (for spells column)
    const hasMages = allFighters.some(f => f.spellsCast > 0);

    // Battle duration in seconds
    const battleDurationSec = Math.round(this._state.tick / WB.TICKS_PER_SEC);
    const battleMin = Math.floor(battleDurationSec / 60);
    const battleSec = battleDurationSec % 60;

    // Team kill totals
    const playerTeamKills = allFighters.filter(f => f.team === "player").reduce((s, f) => s + f.kills, 0);
    const enemyTeamKills = allFighters.filter(f => f.team === "enemy").reduce((s, f) => s + f.kills, 0);

    // MVP: highest kills + damage
    const mvp = [...allFighters].sort((a, b) => (b.kills + b.damage_dealt) - (a.kills + a.damage_dealt))[0];

    const statsHTML = [...allFighters]
      .sort((a, b) => b.kills - a.kills)
      .map(
        (f) => `
        <tr style="color:${f.team === "player" ? "#4488ff" : "#ff4444"}${f.isPlayer ? ";font-weight:bold" : ""}">
          <td style="padding:4px 8px">${f.name}${f.isPlayer ? " (You)" : ""}${mvp && f.id === mvp.id ? " ★" : ""}</td>
          <td style="padding:4px 8px;text-align:center">${f.kills}</td>
          <td style="padding:4px 8px;text-align:center">${f.damage_dealt}</td>
          <td style="padding:4px 8px;text-align:center">${f.damage_taken}</td>
          <td style="padding:4px 8px;text-align:center">${f.headshots}</td>
          <td style="padding:4px 8px;text-align:center">${f.blocks}</td>
          ${hasMages ? `<td style="padding:4px 8px;text-align:center">${f.spellsCast}</td>` : ""}
          <td style="padding:4px 8px;text-align:center">${f.longestStreak}</td>
          <td style="padding:4px 8px;text-align:center">${f.hp <= 0 ? "Dead" : `${f.hp} HP`}</td>
        </tr>
      `,
      )
      .join("");

    this._resultsContainer.innerHTML = `
      <h1 style="font-size:42px;color:${won ? "#ffd700" : "#cc4444"};text-shadow:0 0 15px rgba(${won ? "218,165,32" : "204,68,68"},0.4)">
        ${won ? "VICTORY" : "DEFEAT"}
      </h1>
      <p style="margin-bottom:10px;color:#aa9977">Round ${this._state!.round}</p>

      <div style="display:flex;gap:30px;margin-bottom:15px;color:#aa9977;font-size:14px">
        <span>Duration: ${battleMin}m ${battleSec.toString().padStart(2, "0")}s</span>
        <span style="color:#4488ff">Team Kills: ${playerTeamKills}</span>
        <span style="color:#ff4444">Enemy Kills: ${enemyTeamKills}</span>
        ${mvp ? `<span style="color:#ffd700">MVP: ${mvp.name} (${mvp.kills}K / ${mvp.damage_dealt}D)</span>` : ""}
      </div>

      <div style="max-height:50vh;overflow-y:auto;margin-bottom:20px">
        <table style="border-collapse:collapse">
          <tr style="color:#daa520;border-bottom:1px solid #444">
            <th style="padding:6px 8px;text-align:left">Fighter</th>
            <th style="padding:6px 8px">Kills</th>
            <th style="padding:6px 8px">Dmg Dealt</th>
            <th style="padding:6px 8px">Dmg Taken</th>
            <th style="padding:6px 8px">Headshots</th>
            <th style="padding:6px 8px">Blocks</th>
            ${hasMages ? '<th style="padding:6px 8px">Spells</th>' : ""}
            <th style="padding:6px 8px">Streak</th>
            <th style="padding:6px 8px">Status</th>
          </tr>
          ${statsHTML}
        </table>
      </div>

      <p style="color:#ffd700;font-size:18px;margin-bottom:20px">
        Gold: ${player.gold} (+${player.kills * WB.GOLD_PER_KILL} from kills)
      </p>

      <div>
        <button id="wb-next-round" style="${this._menuBtnStyle()}">
          Next Round
        </button>
        <button id="wb-back-menu" style="${this._menuBtnStyle("#555", "#888")}">
          Back to Menu
        </button>
      </div>
    `;

    const container = document.getElementById("pixi-container");
    if (container) container.appendChild(this._resultsContainer);

    document.getElementById("wb-next-round")?.addEventListener("click", () => {
      this._removeResults();
      this._nextRound();
    });

    document.getElementById("wb-back-menu")?.addEventListener("click", () => {
      this._removeResults();
      this._cleanup();
      this._showMenu();
    });
  }

  private _removeResults(): void {
    if (this._resultsContainer?.parentNode) {
      this._resultsContainer.parentNode.removeChild(this._resultsContainer);
      this._resultsContainer = null;
    }
  }

  // ---- Next round ---------------------------------------------------------

  private _nextRound(): void {
    if (!this._state) return;

    // Clean up visuals
    this._cleanupBattleVisuals();

    this._state.round++;

    // Reset player HP/stamina, keep gold and equipment
    const player = this._state.fighters.find((f) => f.id === this._state!.playerId);
    if (!player) return;

    player.hp = player.maxHp;
    player.stamina = player.maxStamina;
    player.combatState = FighterCombatState.IDLE;
    player.position = vec3(0, 0, 10);
    player.velocity = vec3();

    // Refill ammo
    if (player.equipment.mainHand?.ammo) {
      player.ammo = player.equipment.mainHand.ammo;
    }

    // Remove old AI fighters
    this._state.fighters = this._state.fighters.filter((f) => f.isPlayer);

    // Clear all horses (will be re-created)
    this._state.horses = [];

    // Reset player mount state
    const playerF = this._state.fighters.find(f => f.isPlayer);
    if (playerF) {
      playerF.mountId = null;
      playerF.isMounted = false;
    }

    const isDuel = this._state.battleType === BattleType.DUEL;
    const isArmyBattle = this._state.battleType === BattleType.ARMY_BATTLE;

    if (isArmyBattle) {
      // Re-spawn from saved army composition
      const halfW = WB.ARENA_WIDTH / 2;
      let allyIdx = 0;
      for (let t = 0; t < UNIT_TYPES.length; t++) {
        for (let n = 0; n < this._playerArmy[t]; n++) {
          const row = Math.floor(allyIdx / 10);
          const col = allyIdx % 10;
          const x = (col - 4.5) * 2.5;
          const z = 10 + row * 2.5;
          const ally = createDefaultFighter(
            `ally_r${this._state.round}_${allyIdx}`,
            AI_NAMES_PLAYER[allyIdx % AI_NAMES_PLAYER.length],
            "player",
            false,
            vec3(Math.max(-halfW + 2, Math.min(halfW - 2, x)), 0, z),
          );
          this._equipUnitType(ally, UNIT_TYPES[t], this._state!);
          this._applyDifficulty(ally);
          if (ally.ai) {
            ally.ai.blockChance = Math.min(0.85, ally.ai.blockChance + this._state.round * 0.05);
            ally.ai.aggressiveness = Math.min(0.9, ally.ai.aggressiveness + this._state.round * 0.05);
          }
          this._state.fighters.push(ally);
          allyIdx++;
        }
      }

      let enemyIdx = 0;
      for (let t = 0; t < UNIT_TYPES.length; t++) {
        for (let n = 0; n < this._enemyArmy[t]; n++) {
          const row = Math.floor(enemyIdx / 10);
          const col = enemyIdx % 10;
          const x = (col - 4.5) * 2.5;
          const z = -10 - row * 2.5;
          const enemy = createDefaultFighter(
            `enemy_r${this._state.round}_${enemyIdx}`,
            AI_NAMES_ENEMY[enemyIdx % AI_NAMES_ENEMY.length],
            "enemy",
            false,
            vec3(Math.max(-halfW + 2, Math.min(halfW - 2, x)), 0, z),
          );
          this._equipUnitType(enemy, UNIT_TYPES[t], this._state!);
          this._applyDifficulty(enemy);
          if (enemy.ai) {
            enemy.ai.blockChance = Math.min(0.85, enemy.ai.blockChance + this._state.round * 0.05);
            enemy.ai.reactionDelay = Math.max(6, enemy.ai.reactionDelay - this._state.round * 2);
            enemy.ai.aggressiveness = Math.min(0.9, enemy.ai.aggressiveness + this._state.round * 0.05);
          }
          this._state.fighters.push(enemy);
          enemyIdx++;
        }
      }

      const playerTotal = this._playerArmy.reduce((a, b) => a + b, 0);
      const enemyTotal = this._enemyArmy.reduce((a, b) => a + b, 0);
      this._state.playerTeamAlive = playerTotal + 1;
      this._state.enemyTeamAlive = enemyTotal;
      this._state.battleTimer = 180 * WB.TICKS_PER_SEC;
    } else {
      // Create new allies (skip in duel mode)
      if (!isDuel) {
        for (let i = 1; i < WB.TEAM_SIZE; i++) {
          const ally = createDefaultFighter(
            `ally_r${this._state.round}_${i}`,
            AI_NAMES_PLAYER[i % AI_NAMES_PLAYER.length],
            "player",
            false,
            vec3(-6 + i * 3, 0, 12),
          );
          this._equipRandomUnitType(ally, false, this._state!);
          this._applyDifficulty(ally);
          this._state.fighters.push(ally);
        }
      }

      // Create new enemies (scale difficulty)
      const isSiege = this._state.battleType === BattleType.SIEGE;
      const enemyCount = isDuel ? 1 : WB.TEAM_SIZE;
      for (let i = 0; i < enemyCount; i++) {
        let spawnX: number, spawnZ: number;
        if (isSiege) {
          const angle = (i / enemyCount) * Math.PI * 2;
          spawnX = Math.cos(angle) * 4;
          spawnZ = WB.SIEGE_CAPTURE_Z + Math.sin(angle) * 4;
        } else {
          spawnX = isDuel ? 0 : -6 + i * 3;
          spawnZ = -5;
        }
        const enemy = createDefaultFighter(
          `enemy_r${this._state.round}_${i}`,
          AI_NAMES_ENEMY[i % AI_NAMES_ENEMY.length],
          "enemy",
          false,
          vec3(spawnX, 0, spawnZ),
        );
        this._equipRandomUnitType(enemy, isDuel, this._state!);
        this._applyDifficulty(enemy);
        // Scale AI difficulty with rounds
        if (enemy.ai) {
          enemy.ai.blockChance = Math.min(0.85, enemy.ai.blockChance + this._state.round * 0.05);
          enemy.ai.reactionDelay = Math.max(6, enemy.ai.reactionDelay - this._state.round * 2);
          enemy.ai.aggressiveness = Math.min(0.9, enemy.ai.aggressiveness + this._state.round * 0.05);
        }
        this._state.fighters.push(enemy);
      }

      // Reset counts
      this._state.playerTeamAlive = isDuel ? 1 : WB.TEAM_SIZE;
      this._state.enemyTeamAlive = isDuel ? 1 : WB.TEAM_SIZE;
    }
    this._state.projectiles = [];
    this._state.pickups = [];
    this._state.battleTimer = this._state.battleType === BattleType.SIEGE
      ? WB.SIEGE_BATTLE_TICKS
      : 60 * WB.TICKS_PER_SEC;
    this._state.siegeCaptureProgress = 0;
    this._state.siegeAttackersInZone = 0;
    this._state.siegeDefendersInZone = 0;
    this._state.tick = 0;

    if (isArmyBattle) {
      // Show shop for army battles
      this._state.phase = WarbandPhase.SHOP;
      this._shop.show(player, () => {
        this._startBattle();
      });
    } else {
      // Auto-equip player based on leader, go straight to battle
      const spawnUnit = _getLeaderSpawnUnit(this._selectedLeaderId);
      this._equipUnitType(player, spawnUnit, this._state!);
      player.name = "You";
      this._startBattle();
    }
  }

  // ---- Pause menu ---------------------------------------------------------

  private _pauseGame(): void {
    if (!this._state) return;
    this._state.paused = true;
    if (document.pointerLockElement) document.exitPointerLock();
    this._showPauseMenu();
  }

  private _resumeGame(): void {
    if (!this._state) return;
    this._state.paused = false;
    this._removePauseMenu();
    this._removeInventory();
  }

  private _showPauseMenu(): void {
    this._removePauseMenu();
    this._pauseMenuContainer = document.createElement("div");
    this._pauseMenuContainer.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      z-index: 30; background: rgba(10, 8, 5, 0.85);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      font-family: 'Segoe UI', sans-serif; color: #e0d5c0;
    `;
    this._pauseMenuContainer.innerHTML = `
      <h1 style="font-size:36px;color:#daa520;margin-bottom:30px">PAUSED</h1>
      <button id="wb-resume" style="${this._menuBtnStyle("#2a4a2a", "#88aa66")}">Resume</button>
      <button id="wb-inventory" style="${this._menuBtnStyle("#2a2a4a", "#6688cc")}">Inventory</button>
      <button id="wb-quit-menu" style="${this._menuBtnStyle("#555", "#888")}">Quit to Menu</button>
    `;
    const container = document.getElementById("pixi-container");
    if (container) container.appendChild(this._pauseMenuContainer);

    document.getElementById("wb-resume")?.addEventListener("click", () => this._resumeGame());
    document.getElementById("wb-inventory")?.addEventListener("click", () => {
      this._removePauseMenu();
      this._showInventory();
    });
    document.getElementById("wb-quit-menu")?.addEventListener("click", () => {
      this._removePauseMenu();
      this._cleanup();
      this._showMenu();
    });
  }

  private _removePauseMenu(): void {
    if (this._pauseMenuContainer?.parentNode) {
      this._pauseMenuContainer.parentNode.removeChild(this._pauseMenuContainer);
      this._pauseMenuContainer = null;
    }
  }

  // ---- Inventory UI -------------------------------------------------------

  private _showInventory(): void {
    if (!this._state) return;
    const player = this._state.fighters.find(f => f.id === this._state!.playerId);
    if (!player) return;

    this._removeInventory();
    this._inventoryContainer = document.createElement("div");
    this._inventoryContainer.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      z-index: 30; background: rgba(10, 8, 5, 0.92);
      display: flex; flex-direction: column; align-items: center;
      font-family: 'Segoe UI', sans-serif; color: #e0d5c0;
      padding-top: 30px; overflow-y: auto;
    `;
    this._renderInventory(player);

    const container = document.getElementById("pixi-container");
    if (container) container.appendChild(this._inventoryContainer);
  }

  private _renderInventory(player: WarbandFighter): void {
    if (!this._inventoryContainer) return;

    const isArmor = (item: unknown): item is import("./config/ArmorDefs").ArmorDef =>
      typeof item === "object" && item !== null && "slot" in item && "defense" in item;

    const itemCard = (label: string, item: { name: string; color: number; weight: number } | null, slotId: string) => {
      const bg = item ? `#${item.color.toString(16).padStart(6, "0")}33` : "rgba(255,255,255,0.05)";
      const text = item ? item.name : "Empty";
      const weight = item ? `${item.weight}kg` : "";
      return `
        <div style="background:${bg};border:1px solid rgba(255,255,255,0.2);border-radius:4px;
          padding:8px 12px;margin:3px;min-width:180px;cursor:${item ? "pointer" : "default"}"
          data-slot="${slotId}">
          <div style="font-size:11px;color:#aa9977;text-transform:uppercase">${label}</div>
          <div style="font-size:14px;font-weight:bold;color:${item ? "#e0d5c0" : "#555"}">${text}</div>
          ${weight ? `<div style="font-size:11px;color:#888">${weight}</div>` : ""}
        </div>
      `;
    };

    const invItemCard = (item: { name: string; color: number; weight: number }, idx: number) => {
      const bg = `#${item.color.toString(16).padStart(6, "0")}33`;
      const extra = isArmor(item)
        ? `Def: ${(item as import("./config/ArmorDefs").ArmorDef).defense}`
        : `category` in item ? `Dmg: ${(item as import("./config/WeaponDefs").WeaponDef).damage}` : "";
      return `
        <div style="background:${bg};border:1px solid rgba(255,255,255,0.2);border-radius:4px;
          padding:8px 12px;margin:3px;min-width:160px;display:flex;flex-direction:column;gap:2px"
          data-inv-idx="${idx}">
          <div style="font-size:14px;font-weight:bold">${item.name}</div>
          <div style="font-size:11px;color:#888">${extra} | ${item.weight}kg</div>
          <div style="display:flex;gap:4px;margin-top:4px">
            <button data-equip="${idx}" style="font-size:11px;padding:2px 8px;background:#2a4a2a;color:#88aa66;border:1px solid #88aa66;border-radius:3px;cursor:pointer">Equip</button>
            <button data-drop="${idx}" style="font-size:11px;padding:2px 8px;background:#4a2a2a;color:#aa6666;border:1px solid #aa6666;border-radius:3px;cursor:pointer">Drop</button>
          </div>
        </div>
      `;
    };

    this._inventoryContainer.innerHTML = `
      <h1 style="font-size:28px;color:#daa520;margin-bottom:20px">Inventory</h1>

      <div style="display:flex;gap:40px;flex-wrap:wrap;justify-content:center;max-width:900px">
        <div>
          <h2 style="font-size:16px;color:#aa9977;margin-bottom:8px;text-align:center">Equipped</h2>
          <div style="display:flex;flex-direction:column;align-items:center">
            ${itemCard("Main Hand", player.equipment.mainHand, "mainHand")}
            ${itemCard("Off Hand", player.equipment.offHand, "offHand")}
            ${itemCard("Head", player.equipment.armor.head ?? null, "head")}
            ${itemCard("Torso", player.equipment.armor.torso ?? null, "torso")}
            ${itemCard("Gauntlets", player.equipment.armor.gauntlets ?? null, "gauntlets")}
            ${itemCard("Legs", player.equipment.armor.legs ?? null, "legs")}
            ${itemCard("Boots", player.equipment.armor.boots ?? null, "boots")}
          </div>
        </div>

        <div style="flex:1;min-width:300px">
          <h2 style="font-size:16px;color:#aa9977;margin-bottom:8px;text-align:center">
            Backpack (${player.inventory.length} items)
          </h2>
          <div style="display:flex;flex-wrap:wrap;justify-content:center;max-height:400px;overflow-y:auto">
            ${player.inventory.length === 0
              ? '<div style="color:#555;padding:20px">Empty — loot corpses with [F] during battle</div>'
              : player.inventory.map((item, i) => invItemCard(item as { name: string; color: number; weight: number }, i)).join("")}
          </div>
        </div>
      </div>

      <button id="wb-inv-close" style="${this._menuBtnStyle("#555", "#888")};margin-top:20px">
        Back
      </button>
    `;

    // Wire events
    document.getElementById("wb-inv-close")?.addEventListener("click", () => {
      this._removeInventory();
      this._showPauseMenu();
    });

    // Equip buttons
    this._inventoryContainer.querySelectorAll("[data-equip]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const idx = parseInt((btn as HTMLElement).dataset.equip!, 10);
        this._equipFromInventory(player, idx);
        this._renderInventory(player);
      });
    });

    // Drop buttons
    this._inventoryContainer.querySelectorAll("[data-drop]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const idx = parseInt((btn as HTMLElement).dataset.drop!, 10);
        player.inventory.splice(idx, 1);
        this._renderInventory(player);
      });
    });

    // Click equipped slot to unequip
    this._inventoryContainer.querySelectorAll("[data-slot]").forEach(el => {
      el.addEventListener("click", () => {
        const slot = (el as HTMLElement).dataset.slot!;
        if (slot === "mainHand" && player.equipment.mainHand) {
          player.inventory.push(player.equipment.mainHand);
          player.equipment.mainHand = null;
        } else if (slot === "offHand" && player.equipment.offHand) {
          player.inventory.push(player.equipment.offHand);
          player.equipment.offHand = null;
        } else {
          const armorSlot = slot as ArmorSlot;
          const piece = player.equipment.armor[armorSlot];
          if (piece) {
            player.inventory.push(piece);
            player.equipment.armor[armorSlot] = null;
          }
        }
        this._renderInventory(player);
      });
    });
  }

  private _equipFromInventory(player: WarbandFighter, idx: number): void {
    const item = player.inventory[idx];
    if (!item) return;

    const isArmor = (i: unknown): i is import("./config/ArmorDefs").ArmorDef =>
      typeof i === "object" && i !== null && "slot" in i && "defense" in i;

    if (isArmor(item)) {
      // Swap with current armor in that slot
      const slot = item.slot as ArmorSlot;
      const current = player.equipment.armor[slot];
      player.equipment.armor[slot] = item;
      player.inventory.splice(idx, 1);
      if (current) player.inventory.push(current);
    } else {
      // It's a weapon
      const wpn = item as import("./config/WeaponDefs").WeaponDef;
      if (wpn.category === "shield") {
        const current = player.equipment.offHand;
        player.equipment.offHand = wpn;
        player.inventory.splice(idx, 1);
        if (current) player.inventory.push(current);
      } else {
        const current = player.equipment.mainHand;
        player.equipment.mainHand = wpn;
        player.inventory.splice(idx, 1);
        if (current) player.inventory.push(current);
        // Update ammo for ranged
        if (wpn.ammo) {
          player.ammo = wpn.ammo;
          player.maxAmmo = wpn.ammo;
        }
      }
    }

    // Update weapon/armor visuals
    const mesh = this._fighterMeshes.get(player.id);
    if (mesh) {
      mesh._updateWeaponMesh(player);
      mesh.updateArmorVisuals(player);
    }
  }

  private _removeInventory(): void {
    if (this._inventoryContainer?.parentNode) {
      this._inventoryContainer.parentNode.removeChild(this._inventoryContainer);
      this._inventoryContainer = null;
    }
  }

  // ---- Cleanup ------------------------------------------------------------

  private _cleanupBattleVisuals(): void {
    // Remove fighter meshes
    for (const [, mesh] of this._fighterMeshes) {
      this._sceneManager.scene.remove(mesh.group);
      mesh.dispose();
    }
    this._fighterMeshes.clear();

    // Remove horse meshes
    for (const [, hMesh] of this._horseMeshes) {
      this._sceneManager.scene.remove(hMesh.group);
      hMesh.dispose();
    }
    this._horseMeshes.clear();

    // Remove creature meshes
    for (const [, cMesh] of this._creatureMeshes) {
      this._sceneManager.scene.remove(cMesh.group);
      cMesh.dispose();
    }
    this._creatureMeshes.clear();

    // Remove projectile meshes (per-instance materials only; shared geo/mat disposed below)
    for (const [, mesh] of this._projectileMeshes) {
      this._sceneManager.scene.remove(mesh);
      if ((mesh as unknown as THREE.Group).isGroup) {
        const group = mesh as unknown as THREE.Group;
        group.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mat = (child as THREE.Mesh).material as THREE.Material;
            if (mat !== this._sharedRayCoreMat) mat.dispose();
          }
        });
      }
    }
    this._projectileMeshes.clear();
    // Dispose shared projectile resources
    this._sharedArrowGeo?.dispose(); this._sharedArrowGeo = null;
    this._sharedArrowMat?.dispose(); this._sharedArrowMat = null;
    this._sharedRayOuterGeo?.dispose(); this._sharedRayOuterGeo = null;
    this._sharedRayInnerGeo?.dispose(); this._sharedRayInnerGeo = null;
    this._sharedRayTipGeo?.dispose(); this._sharedRayTipGeo = null;
    this._sharedRayCoreMat?.dispose(); this._sharedRayCoreMat = null;

    // Remove pickup meshes
    for (const [, group] of this._pickupMeshes) {
      this._sceneManager.scene.remove(group);
      group.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          (obj.material as THREE.Material).dispose();
        }
      });
    }
    this._pickupMeshes.clear();
  }

  private _cleanup(): void {
    cancelAnimationFrame(this._rafId);
    this._cleanupBattleVisuals();
    this._inputSystem.destroy();
    this._cameraController.setFreeOrbit(false);
    this._removeArmySetup();
    this._state = null;
  }

  private _exit(): void {
    this._cleanup();
    this._removeMenu();
    this._removeResults();
    this._hud.destroy();
    this._shop.destroy();
    this._fx.destroy();
    this._sceneManager.destroy();

    if (this._escHandler) {
      window.removeEventListener("keydown", this._escHandler);
      this._escHandler = null;
    }

    // Show PixiJS canvas again
    const pixiCanvas = document.querySelector("#pixi-container canvas:not(#warband-canvas)") as HTMLCanvasElement | null;
    if (pixiCanvas) pixiCanvas.style.display = "";

    // Fire exit event
    window.dispatchEvent(new Event("warbandExit"));
  }

  destroy(): void {
    this._exit();
  }
}
