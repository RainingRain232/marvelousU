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
}

const UNIT_TYPES: UnitTypeDef[] = [
  {
    id: "swordsman",
    name: "Swordsman",
    icon: "\u2694\uFE0F",
    description: "Sword & shield, medium armor",
    mainHand: "arming_sword",
    offHand: "heater_shield",
    head: "mail_coif",
    torso: "chain_hauberk",
    gauntlets: "mail_gauntlets",
    legs: "mail_chausses",
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
    head: "nasal_helm",
    torso: "mail_shirt",
    gauntlets: "leather_gloves",
    legs: "mail_chausses",
    boots: "leather_boots",
  },
  {
    id: "shock",
    name: "Shock",
    icon: "\uD83D\uDDE1\uFE0F",
    description: "Two-handed weapon, medium armor",
    mainHand: "greatsword",
    offHand: null,
    head: "nasal_helm",
    torso: "chain_hauberk",
    gauntlets: "mail_gauntlets",
    legs: "leather_leggings",
    boots: "mail_boots",
  },
  {
    id: "knight",
    name: "Knight",
    icon: "\uD83D\uDEE1\uFE0F",
    description: "Heavy armor, sword & shield",
    mainHand: "arming_sword",
    offHand: "kite_shield",
    head: "bascinet",
    torso: "brigandine",
    gauntlets: "plate_gauntlets",
    legs: "plate_greaves",
    boots: "plate_sabatons",
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
    head: "mail_coif",
    torso: "mail_shirt",
    gauntlets: "leather_gloves",
    legs: "leather_leggings",
    boots: "leather_boots",
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
    gauntlets: "plate_gauntlets",
    legs: "plate_greaves",
    boots: "plate_sabatons",
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
    torso: "surcoat_over_mail",
    gauntlets: "leather_gloves",
    legs: "mail_chausses",
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
    id: "man_at_arms",
    name: "Man-at-Arms",
    icon: "\uD83D\uDD28",
    description: "Mace & scutum, heavy armor",
    mainHand: "flanged_mace",
    offHand: "scutum",
    head: "sallet",
    torso: "coat_of_plates",
    gauntlets: "splinted_gauntlets",
    legs: "splinted_greaves",
    boots: "armored_boots",
  },
  {
    id: "halberdier",
    name: "Halberdier",
    icon: "\uD83E\uDE93",
    description: "Halberd, coat of plates",
    mainHand: "halberd",
    offHand: null,
    head: "sallet",
    torso: "coat_of_plates",
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
    id: "militia",
    name: "Militia",
    icon: "\uD83E\uDE96",
    description: "Hand axe & shield, cheap",
    mainHand: "hand_axe",
    offHand: "round_shield",
    head: "cloth_hood",
    torso: "padded_vest",
    gauntlets: "cloth_wraps",
    legs: "cloth_trousers",
    boots: "sandals",
  },
  {
    id: "sergeant",
    name: "Sergeant",
    icon: "\u2694",
    description: "Sabre & norman shield, good armor",
    mainHand: "sabre",
    offHand: "norman_shield",
    head: "nasal_helm",
    torso: "brigandine",
    gauntlets: "mail_gauntlets",
    legs: "mail_chausses",
    boots: "mail_boots",
  },
  {
    id: "mounted_knight",
    name: "Mounted Knight",
    icon: "\uD83D\uDC51",
    description: "Full plate, sword & shield, heavy horse",
    mainHand: "arming_sword",
    offHand: "kite_shield",
    head: "great_helm",
    torso: "plate_cuirass",
    gauntlets: "plate_gauntlets",
    legs: "plate_greaves",
    boots: "plate_sabatons",
    horseArmor: "heavy",
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
    head: "mail_coif",
    torso: "gambeson",
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
    head: "nasal_helm",
    torso: "gambeson",
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
    torso: "brigandine",
    gauntlets: "plate_gauntlets",
    legs: "plate_greaves",
    boots: "plate_sabatons",
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
    torso: "chain_hauberk",
    gauntlets: "mail_gauntlets",
    legs: "mail_chausses",
    boots: "mail_boots",
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
    head: "nasal_helm",
    torso: "chain_hauberk",
    gauntlets: "mail_gauntlets",
    legs: "mail_chausses",
    boots: "mail_boots",
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
];

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

  // Pickup visuals
  private _pickupMeshes: Map<string, THREE.Group> = new Map();

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

  // Army battle composition (8 unit types: 5 infantry + 3 cavalry)
  private _playerArmy: number[] = [0, 0, 0, 0, 0, 0, 0, 0];
  private _enemyArmy: number[] = [0, 0, 0, 0, 0, 0, 0, 0];

  // ESC handler
  private _escHandler: ((e: KeyboardEvent) => void) | null = null;

  async boot(): Promise<void> {
    // Hide PixiJS
    const pixiCanvas = document.querySelector("#pixi-container canvas:not(#warband-canvas)") as HTMLCanvasElement | null;
    if (pixiCanvas) pixiCanvas.style.display = "none";

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
      <h1 style="font-size:48px;color:#daa520;text-shadow:0 0 20px rgba(218,165,32,0.4);margin-bottom:10px">
        ⚔ WARBAND ⚔
      </h1>
      <p style="color:#aa9977;margin-bottom:40px;font-size:16px">Mount & Blade style combat</p>

      <button id="wb-open-field" style="${this._menuBtnStyle()}">
        🏕 Open Field Battle
        <span style="display:block;font-size:12px;color:#999;margin-top:4px">5v5 on open terrain</span>
      </button>

      <button id="wb-siege" style="${this._menuBtnStyle()}">
        🏰 Siege Battle
        <span style="display:block;font-size:12px;color:#999;margin-top:4px">Storm the castle, capture the centre</span>
      </button>

      <button id="wb-army" style="${this._menuBtnStyle("#4a2a0a", "#daa520")}">
        \u{1F451} Army Battle
        <span style="display:block;font-size:12px;color:#999;margin-top:4px">Up to 100v100 — choose your army</span>
      </button>

      <button id="wb-duel" style="${this._menuBtnStyle()}">
        🤺 Duel
        <span style="display:block;font-size:12px;color:#999;margin-top:4px">1v1 single combat</span>
      </button>

      <button id="wb-camera" style="${this._menuBtnStyle("#2a4a2a", "#88aa66")}">
        📷 Camera View
        <span style="display:block;font-size:12px;color:#999;margin-top:4px">Inspect character model (C to toggle orbit, IJKL to orbit)</span>
      </button>

      <button id="wb-back" style="${this._menuBtnStyle("#555", "#888")}">
        ← Back to Hub
      </button>
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
      this._showArmySetup();
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
  }

  private _menuBtnStyle(bg = "#8b0000", border = "#daa520"): string {
    return `
      display: block; width: 300px; padding: 15px 20px;
      margin: 8px 0; font-size: 18px; font-weight: bold;
      background: ${bg}; color: #e0d5c0;
      border: 2px solid ${border}; border-radius: 6px;
      cursor: pointer; text-align: center;
      font-family: inherit;
    `;
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
          this._state.fighters.push(enemy);
          enemyIdx++;
        }
      }

      this._state.playerTeamAlive = playerTotal + 1; // +1 for player
      this._state.enemyTeamAlive = enemyTotal;
      this._state.battleTimer = 180 * WB.TICKS_PER_SEC; // 3 minutes for army battles

      // Show shop for player equipment
      this._state.phase = WarbandPhase.SHOP;
      this._shop.show(player, () => {
        this._startBattle();
      });
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
      this._state.fighters.push(enemy);
    }

    // Show shop
    this._state.phase = WarbandPhase.SHOP;
    this._shop.show(player, () => {
      this._startBattle();
    });
  }

  private _equipRandomUnitType(fighter: WarbandFighter, dueling: boolean, state: WarbandState): void {
    // Filter to human-scale units for duels, allow all for open battles
    const pool = dueling
      ? UNIT_TYPES.filter((u) => !u.creatureType && !u.scale)
      : UNIT_TYPES.filter((u) => !u.creatureType);
    const pick = pool[Math.floor(Math.random() * pool.length)];
    this._equipUnitType(fighter, pick, state);
  }

  // ---- Army setup screen ---------------------------------------------------

  private _showArmySetup(): void {
    this._playerArmy = new Array(UNIT_TYPES.length).fill(0);
    this._enemyArmy = new Array(UNIT_TYPES.length).fill(0);

    this._armySetupContainer = document.createElement("div");
    this._armySetupContainer.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      z-index: 30; background: rgba(10, 8, 5, 0.97);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      font-family: 'Segoe UI', sans-serif; color: #e0d5c0;
      user-select: none;
    `;

    const container = document.getElementById("pixi-container");
    if (container) container.appendChild(this._armySetupContainer);

    this._renderArmySetup();
  }

  private _renderArmySetup(): void {
    if (!this._armySetupContainer) return;

    const MAX_ARMY = 100;
    const playerTotal = this._playerArmy.reduce((a, b) => a + b, 0);
    const enemyTotal = this._enemyArmy.reduce((a, b) => a + b, 0);

    const unitCard = (ut: UnitTypeDef, idx: number, count: number, side: "player" | "enemy") => {
      const borderColor = side === "player" ? "#4488ff" : "#ff4444";
      return `
        <div style="background:rgba(255,255,255,0.05);border:2px solid ${borderColor};border-radius:8px;
          padding:12px;margin:6px;width:120px;text-align:center;cursor:pointer;transition:background 0.15s"
          data-unit="${idx}" data-side="${side}"
          onmouseover="this.style.background='rgba(255,255,255,0.12)'"
          onmouseout="this.style.background='rgba(255,255,255,0.05)'">
          <div style="font-size:28px">${ut.icon}</div>
          <div style="font-size:14px;font-weight:bold;margin:4px 0">${ut.name}</div>
          <div style="font-size:11px;color:#888;margin-bottom:6px">${ut.description}</div>
          <div style="font-size:24px;font-weight:bold;color:${borderColor}">${count}</div>
        </div>
      `;
    };

    const playerCards = UNIT_TYPES.map((ut, i) => unitCard(ut, i, this._playerArmy[i], "player")).join("");
    const enemyCards = UNIT_TYPES.map((ut, i) => unitCard(ut, i, this._enemyArmy[i], "enemy")).join("");

    const canStart = playerTotal > 0 && enemyTotal > 0;

    this._armySetupContainer.innerHTML = `
      <h1 style="font-size:36px;color:#daa520;text-shadow:0 0 15px rgba(218,165,32,0.3);margin-bottom:5px">
        \u{1F451} ARMY BATTLE
      </h1>
      <p style="color:#888;font-size:13px;margin-bottom:20px">
        Click +1 &nbsp;|&nbsp; Shift+Click +5 &nbsp;|&nbsp; Ctrl+Click +10 &nbsp;|&nbsp; Right-click to remove
      </p>

      <div style="margin-bottom:16px">
        <h2 style="font-size:18px;color:#4488ff;margin-bottom:8px">
          Your Army <span style="font-size:14px;color:#888">(${playerTotal} / ${MAX_ARMY})</span>
        </h2>
        <div style="display:flex;justify-content:center;flex-wrap:wrap">
          ${playerCards}
        </div>
      </div>

      <div style="width:60%;height:1px;background:#333;margin:10px 0"></div>

      <div style="margin-bottom:20px">
        <h2 style="font-size:18px;color:#ff4444;margin-bottom:8px">
          Enemy Army <span style="font-size:14px;color:#888">(${enemyTotal} / ${MAX_ARMY})</span>
        </h2>
        <div style="display:flex;justify-content:center;flex-wrap:wrap">
          ${enemyCards}
        </div>
      </div>

      <div style="display:flex;gap:12px">
        <button id="wb-army-start" style="${this._menuBtnStyle(canStart ? "#2a6a2a" : "#333", canStart ? "#88cc66" : "#555")}"
          ${canStart ? "" : "disabled"}>
          \u2694\uFE0F Start Battle (${playerTotal} vs ${enemyTotal})
        </button>
        <button id="wb-army-back" style="${this._menuBtnStyle("#555", "#888")}">
          \u2190 Back
        </button>
      </div>
    `;

    // Wire up unit card clicks
    this._armySetupContainer.querySelectorAll("[data-unit]").forEach((el) => {
      const htmlEl = el as HTMLElement;
      const idx = parseInt(htmlEl.dataset.unit!, 10);
      const side = htmlEl.dataset.side as "player" | "enemy";
      const army = side === "player" ? this._playerArmy : this._enemyArmy;

      htmlEl.addEventListener("click", (e: MouseEvent) => {
        e.preventDefault();
        const total = army.reduce((a, b) => a + b, 0);
        const add = e.ctrlKey ? 10 : e.shiftKey ? 5 : 1;
        army[idx] = Math.min(army[idx] + add, MAX_ARMY - (total - army[idx]));
        this._renderArmySetup();
      });

      htmlEl.addEventListener("contextmenu", (e: MouseEvent) => {
        e.preventDefault();
        const sub = e.ctrlKey ? 10 : e.shiftKey ? 5 : 1;
        army[idx] = Math.max(0, army[idx] - sub);
        this._renderArmySetup();
      });
    });

    document.getElementById("wb-army-start")?.addEventListener("click", () => {
      this._removeArmySetup();
      this._startGame(BattleType.ARMY_BATTLE);
    });

    document.getElementById("wb-army-back")?.addEventListener("click", () => {
      this._removeArmySetup();
      this._showMenu();
    });
  }

  private _removeArmySetup(): void {
    if (this._armySetupContainer?.parentNode) {
      this._armySetupContainer.parentNode.removeChild(this._armySetupContainer);
      this._armySetupContainer = null;
    }
  }

  private _equipUnitType(fighter: WarbandFighter, unitType: UnitTypeDef, state?: WarbandState): void {
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

      // Process combat events
      for (const hit of this._combatSystem.hits) {
        if (hit.blocked) {
          this._fx.spawnHitSparks(hit.position.x, hit.position.y, hit.position.z, true);
        } else {
          this._fx.spawnBlood(hit.position.x, hit.position.y, hit.position.z, hit.damage);
          this._fx.spawnHitSparks(hit.position.x, hit.position.y, hit.position.z, false);
        }
      }

      for (const kill of this._combatSystem.kills) {
        const killer = this._state.fighters.find((f) => f.id === kill.killerId);
        const victim = this._state.fighters.find((f) => f.id === kill.victimId);
        if (killer && victim) {
          this._hud.addKill(killer.name, victim.name);
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

    const player = this._state.fighters.find((f) => f.id === this._state!.playerId);
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
        const rider = this._state.fighters.find(f => f.id === horse.riderId);
        if (rider) {
          riderSpeed = Math.sqrt(rider.velocity.x ** 2 + rider.velocity.z ** 2);
        }
      }
      hMesh.update(horse, riderSpeed, dt, this._sceneManager.camera);
    }

    // Update projectile visuals
    for (const proj of this._state.projectiles) {
      let mesh = this._projectileMeshes.get(proj.id);
      if (!mesh) {
        const geo = new THREE.CylinderGeometry(0.02, 0.02, 0.5, 4);
        const mat = new THREE.MeshBasicMaterial({ color: 0x8b6914 });
        mesh = new THREE.Mesh(geo, mat);
        this._sceneManager.scene.add(mesh);
        this._projectileMeshes.set(proj.id, mesh);
      }
      mesh.position.set(proj.position.x, proj.position.y, proj.position.z);
      // Orient arrow along velocity
      const vel = new THREE.Vector3(proj.velocity.x, proj.velocity.y, proj.velocity.z);
      if (vel.lengthSq() > 0.01) {
        mesh.lookAt(
          proj.position.x + proj.velocity.x,
          proj.position.y + proj.velocity.y,
          proj.position.z + proj.velocity.z,
        );
        mesh.rotateX(Math.PI / 2);
      }
    }

    // Remove dead projectile meshes
    for (const [id, mesh] of this._projectileMeshes) {
      if (!this._state.projectiles.find((p) => p.id === id)) {
        this._sceneManager.scene.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        this._projectileMeshes.delete(id);
      }
    }

    // Update pickup visuals
    for (const pickup of this._state.pickups) {
      let group = this._pickupMeshes.get(pickup.id);
      if (!group) {
        group = new THREE.Group();
        // Floating weapon indicator
        const geo = new THREE.BoxGeometry(0.3, 0.1, 0.1);
        const mat = new THREE.MeshStandardMaterial({
          color: pickup.weapon.color,
          emissive: 0x444400,
          emissiveIntensity: 0.3,
        });
        const mesh = new THREE.Mesh(geo, mat);
        group.add(mesh);

        // Glow ring
        const ringGeo = new THREE.RingGeometry(0.3, 0.4, 16);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xffdd44,
          transparent: true,
          opacity: 0.4,
          side: THREE.DoubleSide,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
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
    for (const [id, group] of this._pickupMeshes) {
      if (!this._state.pickups.find((p) => p.id === id)) {
        this._sceneManager.scene.remove(group);
        group.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry.dispose();
            (obj.material as THREE.Material).dispose();
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

    // Exit pointer lock
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
    const statsHTML = allFighters
      .sort((a, b) => b.kills - a.kills)
      .map(
        (f) => `
        <tr style="color:${f.team === "player" ? "#4488ff" : "#ff4444"}${f.isPlayer ? ";font-weight:bold" : ""}">
          <td style="padding:4px 12px">${f.name}${f.isPlayer ? " (You)" : ""}</td>
          <td style="padding:4px 12px;text-align:center">${f.kills}</td>
          <td style="padding:4px 12px;text-align:center">${f.damage_dealt}</td>
          <td style="padding:4px 12px;text-align:center">${f.hp <= 0 ? "Dead" : `${f.hp} HP`}</td>
        </tr>
      `,
      )
      .join("");

    this._resultsContainer.innerHTML = `
      <h1 style="font-size:42px;color:${won ? "#ffd700" : "#cc4444"};text-shadow:0 0 15px rgba(${won ? "218,165,32" : "204,68,68"},0.4)">
        ${won ? "⚔ VICTORY ⚔" : "☠ DEFEAT ☠"}
      </h1>
      <p style="margin-bottom:20px;color:#aa9977">Round ${this._state!.round}</p>

      <table style="border-collapse:collapse;margin-bottom:30px">
        <tr style="color:#daa520;border-bottom:1px solid #444">
          <th style="padding:8px 12px;text-align:left">Fighter</th>
          <th style="padding:8px 12px">Kills</th>
          <th style="padding:8px 12px">Damage</th>
          <th style="padding:8px 12px">Status</th>
        </tr>
        ${statsHTML}
      </table>

      <p style="color:#ffd700;font-size:18px;margin-bottom:20px">
        Gold: ${player.gold} (+${player.kills * WB.GOLD_PER_KILL} from kills)
      </p>

      <div>
        <button id="wb-next-round" style="${this._menuBtnStyle()}">
          ⚔ Next Round
        </button>
        <button id="wb-back-menu" style="${this._menuBtnStyle("#555", "#888")}">
          ← Back to Menu
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
          if (ally.ai) {
            ally.ai.blockChance = Math.min(0.85, WB.AI_BLOCK_CHANCE_NORMAL + this._state.round * 0.05);
            ally.ai.aggressiveness = Math.min(0.9, 0.5 + this._state.round * 0.05);
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
          if (enemy.ai) {
            enemy.ai.blockChance = Math.min(0.85, WB.AI_BLOCK_CHANCE_NORMAL + this._state.round * 0.05);
            enemy.ai.reactionDelay = Math.max(6, WB.AI_REACTION_TICKS_NORMAL - this._state.round * 2);
            enemy.ai.aggressiveness = Math.min(0.9, 0.5 + this._state.round * 0.05);
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
        // Scale AI difficulty with rounds
        if (enemy.ai) {
          enemy.ai.blockChance = Math.min(0.85, WB.AI_BLOCK_CHANCE_NORMAL + this._state.round * 0.05);
          enemy.ai.reactionDelay = Math.max(6, WB.AI_REACTION_TICKS_NORMAL - this._state.round * 2);
          enemy.ai.aggressiveness = Math.min(0.9, 0.5 + this._state.round * 0.05);
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

    // Show shop
    this._state.phase = WarbandPhase.SHOP;
    this._shop.show(player, () => {
      this._startBattle();
    });
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

    // Remove projectile meshes
    for (const [, mesh] of this._projectileMeshes) {
      this._sceneManager.scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this._projectileMeshes.clear();

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
