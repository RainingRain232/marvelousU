// ---------------------------------------------------------------------------
// Medieval GTA -- main game orchestrator
// ---------------------------------------------------------------------------

import type { Ticker } from "pixi.js";
import { Container } from "pixi.js";
import { viewManager } from "../view/ViewManager";
import { createMedievalGTAState, genId } from "./state/MedievalGTAState";
import type {
  MedievalGTAState,
  GTAHorse,
  GTAItem,
  GTABuilding,
  GTANPC,
  GTANPCType,
} from "./state/MedievalGTAState";
import { GTAConfig } from "./config/MedievalGTAConfig";
import { NPC_DEFINITIONS } from "./config/NPCDefs";
import { INITIAL_QUESTS } from "./config/QuestDefs";
import { updatePlayer } from "./systems/GTAPlayerSystem";
import { updateNPCs } from "./systems/GTANPCSystem";
import { updateCombat } from "./systems/GTACombatSystem";
import { updateHorses } from "./systems/GTAHorseSystem";
import { updateWanted } from "./systems/GTAWantedSystem";
import { updateQuests } from "./systems/GTAQuestSystem";
import { CamelotCityRenderer } from "./view/CamelotCityRenderer";
import { GTACharacterRenderer } from "./view/GTACharacterRenderer";
import { GTAHUDView } from "./view/GTAHUDView";
import { GTAMinimapView } from "./view/GTAMinimapView";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CAMERA_LERP = GTAConfig.CAMERA_LERP;
const ZOOM = GTAConfig.CAMERA_ZOOM;

// ---------------------------------------------------------------------------
// Helper: create an NPC instance from definitions
// ---------------------------------------------------------------------------

function makeNPC(
  _state: MedievalGTAState,
  id: string,
  type: GTANPCType,
  name: string,
  pos: { x: number; y: number },
  behaviorOverride?: GTANPC["behavior"],
  patrolPath?: { x: number; y: number }[],
  questId?: string,
): GTANPC {
  // Try to get definition -- fall back to civilian_m if not found
  const def =
    (NPC_DEFINITIONS as Record<string, (typeof NPC_DEFINITIONS)[keyof typeof NPC_DEFINITIONS]>)[
      type
    ] ?? NPC_DEFINITIONS.civilian_m;
  return {
    id,
    type,
    name,
    pos: { x: pos.x, y: pos.y },
    vel: { x: 0, y: 0 },
    hp: def.hp,
    maxHp: def.hp,
    behavior: behaviorOverride ?? def.behavior,
    facing: 0,
    facingDir: "s",
    patrolPath: patrolPath ?? [],
    patrolIndex: 0,
    patrolDir: 1,
    wanderTarget: null,
    wanderTimer: Math.random() * 3,
    chaseTimer: 0,
    attackTimer: 0,
    attackCooldown: def.attackCooldown,
    alertRadius: def.alertRadius,
    aggroRadius: def.aggroRadius,
    dialogLines: def.dialogLines,
    questId: questId ?? null,
    onHorse: false,
    colorVariant: Math.floor(Math.random() * (def.colorVariants ?? 2)),
    dead: false,
    deathTimer: 0,
    homePos: { x: pos.x, y: pos.y },
    damage: def.damage,
    speed: def.speed,
  };
}

// ---------------------------------------------------------------------------
// Populate helpers
// ---------------------------------------------------------------------------

function populateNPCs(state: MedievalGTAState): void {
  const add = (
    id: string,
    type: GTANPCType,
    name: string,
    x: number,
    y: number,
    behavior?: GTANPC["behavior"],
    patrol?: { x: number; y: number }[],
    questId?: string,
  ) => {
    state.npcs.set(id, makeNPC(state, id, type, name, { x, y }, behavior, patrol, questId));
  };

  // ---- Quest givers ----
  add("npc_lord_aldric", "civilian_m", "Lord Aldric", 950, 700, "stand", undefined, "q_lost_merchant");
  add("npc_captain_gareth", "guard", "Captain Gareth", 1600, 650, "stand", undefined, "q_bandits");
  add("npc_blacksmith_edgar", "blacksmith_npc", "Edgar the Blacksmith", 950, 1300, "stand", undefined, "q_stolen_sword");
  add("npc_knight_ser_percival", "knight", "Ser Percival", 2100, 1100, "stand", undefined, "q_escort");
  add("npc_merchant_aldric", "merchant", "Merchant Aldric", 1750, 1350, "stand", undefined, "q_tax");
  add("npc_merchant_thomas", "merchant", "Thomas the Merchant", 1950, 2420, "stand");

  // ---- Castle guards (patrol) ----
  add("npc_guard_castle_1", "guard", "Castle Guard", 900, 850, "patrol", [
    { x: 900, y: 850 }, { x: 1200, y: 850 }, { x: 1200, y: 600 }, { x: 900, y: 600 },
  ]);
  add("npc_guard_castle_2", "guard", "Castle Guard", 1100, 600, "patrol", [
    { x: 1100, y: 600 }, { x: 850, y: 600 }, { x: 850, y: 850 }, { x: 1100, y: 850 },
  ]);

  // ---- Barracks guards ----
  add("npc_guard_barracks_1", "guard", "Barracks Guard", 1500, 650, "patrol", [
    { x: 1500, y: 650 }, { x: 1800, y: 650 }, { x: 1800, y: 550 }, { x: 1500, y: 550 },
  ]);
  add("npc_guard_barracks_2", "army_soldier", "Army Soldier", 1650, 750, "patrol", [
    { x: 1650, y: 750 }, { x: 1850, y: 750 },
  ]);

  // ---- Gate guards ----
  add("npc_guard_gate_n1", "guard", "North Gate Guard", 1950, 530, "stand");
  add("npc_guard_gate_n2", "guard", "North Gate Guard", 2050, 530, "stand");
  add("npc_guard_gate_s1", "guard", "South Gate Guard", 1950, 2470, "stand");
  add("npc_guard_gate_s2", "guard", "South Gate Guard", 2050, 2470, "stand");
  add("npc_guard_gate_e1", "guard", "East Gate Guard", 3170, 1450, "stand");
  add("npc_guard_gate_e2", "guard", "East Gate Guard", 3170, 1550, "stand");
  add("npc_guard_gate_w1", "guard", "West Gate Guard", 830, 1450, "stand");
  add("npc_guard_gate_w2", "guard", "West Gate Guard", 830, 1550, "stand");

  // ---- Market patrol ----
  add("npc_guard_market_1", "guard", "Market Guard", 1700, 1300, "patrol", [
    { x: 1700, y: 1300 }, { x: 2000, y: 1300 }, { x: 2000, y: 1600 }, { x: 1700, y: 1600 },
  ]);
  add("npc_guard_market_2", "guard", "Market Guard", 1900, 1500, "patrol", [
    { x: 1900, y: 1500 }, { x: 1600, y: 1500 }, { x: 1600, y: 1250 }, { x: 1900, y: 1250 },
  ]);

  // ---- Knights (stronger patrol) ----
  add("npc_knight_1", "knight", "Knight of the Round Table", 1200, 1000, "patrol", [
    { x: 1200, y: 1000 }, { x: 1800, y: 1000 }, { x: 1800, y: 1800 }, { x: 1200, y: 1800 },
  ]);
  add("npc_knight_2", "knight", "Knight of the Round Table", 2400, 900, "patrol", [
    { x: 2400, y: 900 }, { x: 2800, y: 900 }, { x: 2800, y: 1600 }, { x: 2400, y: 1600 },
  ]);

  // ---- Archer guards on walls ----
  add("npc_archer_1", "archer_guard", "Wall Archer", 1200, 510, "stand");
  add("npc_archer_2", "archer_guard", "Wall Archer", 2600, 510, "stand");
  add("npc_archer_3", "archer_guard", "Wall Archer", 810, 1000, "stand");
  add("npc_archer_4", "archer_guard", "Wall Archer", 3190, 1000, "stand");

  // ---- Civilians (wanderers) ----
  const civilianPositions: [number, number][] = [
    [1300, 1100], [1500, 1200], [1700, 1100], [1900, 1200],
    [2100, 1300], [1600, 1500], [1800, 1600], [2000, 1400],
    [2200, 1500], [1400, 1700], [1100, 1400], [2500, 1400],
    [1300, 1800], [1700, 1900], [2100, 1800], [2300, 2000],
    [1500, 900], [1900, 800], [2300, 700], [2600, 1200],
  ];
  civilianPositions.forEach((p, i) => {
    const type: GTANPCType = i % 2 === 0 ? "civilian_m" : "civilian_f";
    const name = type === "civilian_m" ? "Townsman" : "Townswoman";
    add(`npc_civ_${i}`, type, name, p[0], p[1], "wander");
  });

  // ---- Merchants in market ----
  add("npc_merchant_1", "merchant", "Spice Merchant", 1650, 1350, "stand");
  add("npc_merchant_2", "merchant", "Cloth Merchant", 1850, 1350, "stand");
  add("npc_merchant_3", "merchant", "Fish Monger", 1750, 1550, "stand");
  add("npc_merchant_4", "merchant", "Jeweler", 1950, 1550, "stand");

  // ---- Tavern keeper and bard ----
  add("npc_tavern_keeper", "tavern_keeper", "Tavern Keeper", 2300, 1300, "stand");
  add("npc_bard_1", "bard", "Wandering Bard", 2350, 1400, "wander");

  // ---- Stable master ----
  add("npc_stable_master", "stable_master", "Stable Master", 2700, 1900, "stand");

  // ---- Priest at church ----
  add("npc_priest_1", "priest", "Father Matthias", 2150, 650, "wander");

  // ---- Criminals (in alley areas) ----
  add("npc_criminal_1", "criminal", "Cutpurse", 1100, 1900, "wander");
  add("npc_criminal_2", "criminal", "Thief", 900, 2100, "wander");
  add("npc_criminal_3", "criminal", "Pickpocket", 1400, 2050, "wander");

  // ---- Bandits (outside walls) ----
  add("npc_bandit_1", "bandit", "Road Bandit", 500, 1200, "wander");
  add("npc_bandit_2", "bandit", "Highwayman", 600, 2600, "wander");
  add("npc_bandit_3", "bandit", "Outlaw", 3400, 800, "wander");
  add("npc_bandit_4", "bandit", "Brigand", 3500, 2200, "wander");
  add("npc_bandit_5", "bandit", "Raider", 400, 400, "wander");
}

function populateQuests(state: MedievalGTAState): void {
  // Deep-clone initial quests so objectives can mutate independently
  state.quests = INITIAL_QUESTS.map((q) => ({
    ...q,
    objectives: q.objectives.map((o) => ({ ...o })),
    reward: { ...q.reward },
  }));
}

function populateHorses(state: MedievalGTAState): void {
  const horses: Array<{
    x: number;
    y: number;
    color: GTAHorse["color"];
    horseState: GTAHorse["state"];
  }> = [
    // 4 at stable
    { x: 2620, y: 1850, color: "brown", horseState: "tied" },
    { x: 2720, y: 1900, color: "black", horseState: "tied" },
    { x: 2820, y: 1850, color: "white", horseState: "tied" },
    { x: 2920, y: 1950, color: "grey", horseState: "tied" },
    // 2 near tavern
    { x: 2150, y: 1200, color: "brown", horseState: "tied" },
    { x: 2200, y: 1180, color: "brown", horseState: "tied" },
    // 2 outside south gate
    { x: 1920, y: 2620, color: "grey", horseState: "free" },
    { x: 1980, y: 2650, color: "black", horseState: "free" },
  ];

  for (const h of horses) {
    const id = genId(state);
    state.horses.set(id, {
      id,
      pos: { x: h.x, y: h.y },
      vel: { x: 0, y: 0 },
      state: h.horseState,
      facing: 0,
      facingDir: "s",
      hp: GTAConfig.HORSE_HP,
      maxHp: GTAConfig.HORSE_HP,
      color: h.color,
      basePos: { x: h.x, y: h.y },
      speed: GTAConfig.HORSE_SPEED,
    });
  }
}

function populateItems(state: MedievalGTAState): void {
  const items: Array<{ type: GTAItem["type"]; x: number; y: number; amount: number }> = [
    // Gold piles
    { type: "gold_pile", x: 1680, y: 1380, amount: 15 },
    { type: "gold_pile", x: 2500, y: 1100, amount: 10 },
    { type: "gold_pile", x: 1100, y: 2000, amount: 20 },
    { type: "gold_pile", x: 3000, y: 600, amount: 25 },
    // Health potions
    { type: "health_potion", x: 2250, y: 1350, amount: 1 },
    { type: "health_potion", x: 1050, y: 1250, amount: 1 },
    { type: "health_potion", x: 1800, y: 800, amount: 1 },
    // Quest item: holy key for "The Holy Relic" quest (near tavern)
    { type: "key", x: 2350, y: 1350, amount: 1 },
    // Bow — near the barracks training yard
    { type: "bow", x: 1650, y: 700, amount: 1 },
    // Treasure chests in hidden/rewarding spots
    { type: "treasure_chest", x: 950, y: 520, amount: 50 },    // Behind the castle
    { type: "treasure_chest", x: 1000, y: 1700, amount: 30 },  // In the prison
    { type: "treasure_chest", x: 1500, y: 300, amount: 40 },   // Outside north forest
    { type: "treasure_chest", x: 2300, y: 600, amount: 35 },   // Behind the church
    { type: "treasure_chest", x: 1800, y: 2800, amount: 25 },  // In a farm field south
  ];

  for (const it of items) {
    const id = genId(state);
    state.items.push({
      id,
      type: it.type,
      pos: { x: it.x, y: it.y },
      amount: it.amount,
      collected: false,
    });
  }
}

function populateBuildings(state: MedievalGTAState): void {
  let bid = 0;
  const b = (
    type: GTABuilding["type"],
    x: number,
    y: number,
    w: number,
    h: number,
    name: string,
    opts?: Partial<GTABuilding>,
  ): GTABuilding => ({
    id: `bld_${bid++}`,
    type,
    x,
    y,
    w,
    h,
    name,
    interactable: false,
    blocksMovement: true,
    ...opts,
  });

  const blds: GTABuilding[] = [];

  // ---- Castle ----
  blds.push(b("castle", 850, 550, 450, 500, "Camelot Castle", { interactable: true, interactRadius: 80 }));
  // Castle towers at corners
  blds.push(b("castle_tower", 830, 530, 50, 50, "Castle Tower NW"));
  blds.push(b("castle_tower", 1270, 530, 50, 50, "Castle Tower NE"));
  blds.push(b("castle_tower", 830, 1000, 50, 50, "Castle Tower SW"));
  blds.push(b("castle_tower", 1270, 1000, 50, 50, "Castle Tower SE"));

  // ---- Barracks ----
  blds.push(b("barracks", 1400, 550, 500, 350, "Royal Barracks", { interactable: true, interactRadius: 70 }));

  // ---- Church ----
  blds.push(b("church", 2050, 550, 350, 350, "Church of the Holy Light", { interactable: true, interactRadius: 60 }));

  // ---- Market stalls ----
  blds.push(b("market_stall", 1550, 1250, 120, 80, "Spice Stall"));
  blds.push(b("market_stall", 1750, 1250, 120, 80, "Cloth Stall"));
  blds.push(b("market_stall", 1950, 1250, 120, 80, "Bread Stall"));
  blds.push(b("market_stall", 1650, 1500, 120, 80, "Fish Stall"));
  blds.push(b("market_stall", 1850, 1500, 120, 80, "Jeweler's Stall"));

  // ---- Fountain/well at market center ----
  blds.push(b("fountain", 1800, 1450, 40, 40, "Market Fountain", { blocksMovement: false }));

  // ---- Tavern ----
  blds.push(b("tavern", 2200, 1200, 400, 300, "The Prancing Pony", { interactable: true, interactRadius: 70 }));

  // ---- Blacksmith ----
  blds.push(b("blacksmith_shop", 850, 1200, 350, 300, "Edgar's Forge", { interactable: true, interactRadius: 60 }));

  // ---- Prison ----
  blds.push(b("prison", 850, 1600, 400, 300, "Camelot Prison", { interactable: true, interactRadius: 60 }));

  // ---- Stable ----
  blds.push(b("stable", 2600, 1800, 450, 400, "Royal Stables", { interactable: true, interactRadius: 70 }));

  // ---- Houses scattered in city ----
  blds.push(b("house_large", 1350, 1000, 160, 130, "Noble House"));
  blds.push(b("house_large", 2500, 900, 160, 130, "Manor House"));
  blds.push(b("house_medium", 1550, 1700, 120, 100, "Townhouse"));
  blds.push(b("house_medium", 1800, 1750, 120, 100, "Townhouse"));
  blds.push(b("house_medium", 2050, 1700, 120, 100, "Townhouse"));
  blds.push(b("house_medium", 2350, 1700, 120, 100, "Townhouse"));
  blds.push(b("house_small", 1300, 1500, 90, 80, "Cottage"));
  blds.push(b("house_small", 1150, 1100, 90, 80, "Cottage"));
  blds.push(b("house_small", 2700, 1200, 90, 80, "Cottage"));
  blds.push(b("house_small", 2800, 1000, 90, 80, "Cottage"));
  blds.push(b("house_small", 2100, 2000, 90, 80, "Cottage"));
  blds.push(b("house_small", 1500, 2100, 90, 80, "Cottage"));
  blds.push(b("house_large", 2400, 2050, 160, 130, "Large Cottage"));
  blds.push(b("house_medium", 1800, 2100, 120, 100, "Townhouse"));
  blds.push(b("house_small", 2700, 700, 90, 80, "Cottage"));

  // ---- City walls ----
  const cityX = 800;
  const cityY = 500;
  const cityW = 2400;
  const cityH = 2000;
  const wt = 40;
  const gateGap = 120; // gate opening width
  const midX = cityX + cityW / 2;
  const midY = cityY + cityH / 2;

  // Top wall (two segments with gap for north gate)
  blds.push(b("wall_h", cityX, cityY, midX - gateGap / 2 - cityX, wt, "North Wall W"));
  blds.push(b("wall_h", midX + gateGap / 2, cityY, cityX + cityW - midX - gateGap / 2, wt, "North Wall E"));

  // Bottom wall (two segments with gap for south gate)
  blds.push(b("wall_h", cityX, cityY + cityH - wt, midX - gateGap / 2 - cityX, wt, "South Wall W"));
  blds.push(b("wall_h", midX + gateGap / 2, cityY + cityH - wt, cityX + cityW - midX - gateGap / 2, wt, "South Wall E"));

  // Left wall (two segments with gap for west gate)
  blds.push(b("wall_v", cityX, cityY, wt, midY - gateGap / 2 - cityY, "West Wall N"));
  blds.push(b("wall_v", cityX, midY + gateGap / 2, wt, cityY + cityH - midY - gateGap / 2, "West Wall S"));

  // Right wall (two segments with gap for east gate)
  blds.push(b("wall_v", cityX + cityW - wt, cityY, wt, midY - gateGap / 2 - cityY, "East Wall N"));
  blds.push(b("wall_v", cityX + cityW - wt, midY + gateGap / 2, wt, cityY + cityH - midY - gateGap / 2, "East Wall S"));

  // ---- Wall towers ----
  // Corners
  blds.push(b("wall_tower", cityX - 10, cityY - 10, 60, 60, "Tower NW"));
  blds.push(b("wall_tower", cityX + cityW - 50, cityY - 10, 60, 60, "Tower NE"));
  blds.push(b("wall_tower", cityX - 10, cityY + cityH - 50, 60, 60, "Tower SW"));
  blds.push(b("wall_tower", cityX + cityW - 50, cityY + cityH - 50, 60, 60, "Tower SE"));
  // Intermediate towers
  blds.push(b("wall_tower", midX - 30, cityY - 10, 60, 60, "Tower N Mid"));
  blds.push(b("wall_tower", midX - 30, cityY + cityH - 50, 60, 60, "Tower S Mid"));
  blds.push(b("wall_tower", cityX - 10, midY - 30, 60, 60, "Tower W Mid"));
  blds.push(b("wall_tower", cityX + cityW - 50, midY - 30, 60, 60, "Tower E Mid"));

  // ---- Outside: farm fields ----
  blds.push(b("farm_field", 900, 2700, 300, 200, "Wheat Field"));
  blds.push(b("farm_field", 1300, 2700, 300, 200, "Barley Field"));
  blds.push(b("farm_field", 1700, 2750, 250, 180, "Vegetable Patch"));
  blds.push(b("farm_field", 3300, 1600, 300, 200, "Farmland"));

  // ---- Outside: farmhouses ----
  blds.push(b("farmhouse", 1000, 2650, 120, 90, "Farmhouse"));
  blds.push(b("farmhouse", 3350, 1500, 120, 90, "Farmhouse"));

  // ---- Outside: mill ----
  blds.push(b("mill", 2100, 2750, 100, 100, "Windmill"));

  // ---- Tree clusters (north of city) ----
  blds.push(b("tree_cluster", 500, 200, 200, 150, "Forest Clearing", { blocksMovement: false }));
  blds.push(b("tree_cluster", 900, 150, 250, 180, "Pine Grove", { blocksMovement: false }));
  blds.push(b("tree_cluster", 1400, 100, 300, 160, "Oak Wood", { blocksMovement: false }));
  blds.push(b("tree_cluster", 2200, 150, 200, 140, "Birch Stand", { blocksMovement: false }));
  blds.push(b("tree_cluster", 2800, 200, 250, 170, "Elder Forest", { blocksMovement: false }));
  blds.push(b("tree_cluster", 3400, 300, 200, 160, "Dark Thicket", { blocksMovement: false }));

  // ---- Decorations ----
  blds.push(b("hay_bale", 2650, 2150, 30, 30, "Hay Bale", { blocksMovement: false }));
  blds.push(b("hay_bale", 2700, 2180, 30, 30, "Hay Bale", { blocksMovement: false }));
  blds.push(b("hay_bale", 1050, 2700, 30, 30, "Hay Bale", { blocksMovement: false }));
  blds.push(b("cart", 1600, 1100, 60, 30, "Cart", { blocksMovement: false }));
  blds.push(b("cart", 2500, 1600, 60, 30, "Cart", { blocksMovement: false }));
  blds.push(b("cart", 3300, 1900, 60, 30, "Broken Cart", { blocksMovement: false }));

  state.buildings = blds;
}

// ---------------------------------------------------------------------------
// Full state initialisation (used by boot and restart)
// ---------------------------------------------------------------------------

function initState(): MedievalGTAState {
  const state = createMedievalGTAState();
  populateNPCs(state);
  populateQuests(state);
  populateHorses(state);
  populateItems(state);
  populateBuildings(state);
  return state;
}

// ---------------------------------------------------------------------------
// MedievalGTA orchestrator class
// ---------------------------------------------------------------------------

export class MedievalGTA {
  private _state!: MedievalGTAState;
  private _tickerCb: ((ticker: Ticker) => void) | null = null;

  // View delegates
  private _cityRenderer!: CamelotCityRenderer;
  private _charRenderer!: GTACharacterRenderer;
  private _hudView!: GTAHUDView;
  private _minimapView!: GTAMinimapView;

  // Containers added to viewManager layers
  private _cityContainer: Container | null = null;
  private _charContainer: Container | null = null;
  private _hudContainer: Container | null = null;
  private _minimapContainer: Container | null = null;
  private _gtaWorld: Container | null = null;

  // Event handler references (so we can remove them)
  private _onKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private _onKeyUp: ((e: KeyboardEvent) => void) | null = null;
  private _onPointerMove: ((e: PointerEvent) => void) | null = null;
  private _onPointerDown: ((e: PointerEvent) => void) | null = null;
  private _onPointerUp: ((e: PointerEvent) => void) | null = null;
  private _onContextMenu: ((e: Event) => void) | null = null;

  // -----------------------------------------------------------------------
  // Boot
  // -----------------------------------------------------------------------

  async boot(): Promise<void> {
    // 1. Clear existing world layers & disable ViewManager camera (WASD conflict)
    viewManager.clearWorld();
    viewManager.camera.detach();
    // Reset ViewManager's world container so it doesn't interfere
    viewManager.camera.x = 0;
    viewManager.camera.y = 0;
    viewManager.camera.zoom = 1;

    // 2. Create & populate state
    this._state = initState();
    this._state.screenWidth = viewManager.app.screen.width;
    this._state.screenHeight = viewManager.app.screen.height;

    // 3. Create renderers
    this._cityRenderer = new CamelotCityRenderer();
    this._charRenderer = new GTACharacterRenderer();
    this._hudView = new GTAHUDView();
    this._minimapView = new GTAMinimapView();

    // 4. Init renderers
    const sw = viewManager.app.screen.width;
    const sh = viewManager.app.screen.height;
    this._cityRenderer.init();
    this._charRenderer.init();
    this._hudView.init(sw, sh, () => this.destroy());
    this._minimapView.init(sw, sh);

    this._cityContainer = this._cityRenderer.container;
    this._charContainer = this._charRenderer.container;
    this._hudContainer = this._hudView.container;
    this._minimapContainer = this._minimapView.container;

    // Use a dedicated GTA world container on the stage (bypasses ViewManager camera)
    // Insert BEFORE the UI layer so UI renders on top of the game world
    this._gtaWorld = new Container();
    const stage = viewManager.app.stage;
    const uiLayerIdx = stage.children.indexOf(viewManager.layers.ui);
    if (uiLayerIdx >= 0) {
      stage.addChildAt(this._gtaWorld, uiLayerIdx);
    } else {
      stage.addChild(this._gtaWorld);
    }
    this._gtaWorld.addChild(this._cityContainer);
    this._gtaWorld.addChild(this._charContainer);

    // UI goes on top (screen-space, not world-space)
    viewManager.layers.ui.addChild(this._hudContainer);
    viewManager.layers.ui.addChild(this._minimapContainer);

    // 5. Input listeners
    this._registerInput();

    // 6. Ticker callback (game loop)
    this._tickerCb = (ticker: Ticker) => this._gameLoop(ticker);
    viewManager.app.ticker.add(this._tickerCb);
  }

  // -----------------------------------------------------------------------
  // Destroy
  // -----------------------------------------------------------------------

  destroy(): void {
    // Remove ticker
    if (this._tickerCb) {
      viewManager.app.ticker.remove(this._tickerCb);
      this._tickerCb = null;
    }

    // Remove input listeners
    this._unregisterInput();

    // Remove GTA world container (city + characters)
    if (this._gtaWorld) {
      this._gtaWorld.removeFromParent();
      this._gtaWorld.destroy({ children: true });
      this._gtaWorld = null;
      this._cityContainer = null;
      this._charContainer = null;
    }
    if (this._hudContainer) {
      this._hudContainer.removeFromParent();
      this._hudContainer.destroy({ children: true });
      this._hudContainer = null;
    }
    if (this._minimapContainer) {
      this._minimapContainer.removeFromParent();
      this._minimapContainer.destroy({ children: true });
      this._minimapContainer = null;
    }

    // Re-attach ViewManager camera for other game modes
    viewManager.camera.attach(viewManager.app.canvas as HTMLCanvasElement);

    // Dispatch exit event for main.ts
    window.dispatchEvent(new Event("medievalGTAExit"));
  }

  // -----------------------------------------------------------------------
  // Input registration
  // -----------------------------------------------------------------------

  private _registerInput(): void {
    const state = this._state;

    // --- Keyboard ---
    this._onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      state.keys.add(key);

      // Track interact key press edge
      if (key === "e" || key === "f") {
        state.interactKey = true;
      }

      // Game-over restart
      if (state.gameOver && key === "r") {
        this._restart();
        return;
      }

      // Quest log toggle
      if (key === "q" || key === "tab") {
        e.preventDefault();
        state.showQuestLog = !state.showQuestLog;
      }

      // Escape: toggle pause menu (or close overlays first)
      if (key === "escape") {
        if (state.showQuestLog) {
          state.showQuestLog = false;
        } else if (state.dialogNpcId) {
          state.dialogNpcId = null;
          state.dialogText = "";
          state.dialogOptions = [];
        } else {
          state.paused = !state.paused;
          state.showPauseMenu = state.paused;
        }
      }

      // P also toggles pause
      if (key === "p") {
        state.paused = !state.paused;
        state.showPauseMenu = state.paused;
      }

      // Weapon switching with 1/2/3
      if (key === "1" && !state.paused && !state.gameOver) {
        state.player.weapon = 'fists';
        state.notifications.push({ id: `notif_${state.nextId++}`, text: 'Switched to Fists', timer: 2.0, color: 0xcccccc });
      }
      if (key === "2" && !state.paused && !state.gameOver) {
        state.player.weapon = 'sword';
        state.notifications.push({ id: `notif_${state.nextId++}`, text: 'Switched to Sword', timer: 2.0, color: 0xaaaaff });
      }
      if (key === "3" && !state.paused && !state.gameOver) {
        if (state.player.hasBow) {
          state.player.weapon = 'bow';
          state.notifications.push({ id: `notif_${state.nextId++}`, text: 'Switched to Bow', timer: 2.0, color: 0x88ff88 });
        } else {
          state.notifications.push({ id: `notif_${state.nextId++}`, text: 'You need to find a bow first!', timer: 2.0, color: 0xff4444 });
        }
      }
    };

    this._onKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      state.keys.delete(key);
      if (key === "e" || key === "f") {
        state.interactKey = false;
      }
    };

    // --- Mouse / pointer ---
    this._onPointerMove = (e: PointerEvent) => {
      state.mousePos.x = e.clientX;
      state.mousePos.y = e.clientY;
      // Convert to world coords
      state.mouseWorldPos.x = e.clientX / ZOOM + state.cameraX;
      state.mouseWorldPos.y = e.clientY / ZOOM + state.cameraY;
    };

    this._onPointerDown = (e: PointerEvent) => {
      if (e.button === 0) state.mouseDown = true;
      if (e.button === 2) state.rightMouseDown = true;
    };

    this._onPointerUp = (e: PointerEvent) => {
      if (e.button === 0) state.mouseDown = false;
      if (e.button === 2) state.rightMouseDown = false;
    };

    this._onContextMenu = (e: Event) => {
      e.preventDefault();
    };

    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
    window.addEventListener("pointermove", this._onPointerMove);
    window.addEventListener("pointerdown", this._onPointerDown);
    window.addEventListener("pointerup", this._onPointerUp);
    window.addEventListener("contextmenu", this._onContextMenu);
  }

  private _unregisterInput(): void {
    if (this._onKeyDown) window.removeEventListener("keydown", this._onKeyDown);
    if (this._onKeyUp) window.removeEventListener("keyup", this._onKeyUp);
    if (this._onPointerMove) window.removeEventListener("pointermove", this._onPointerMove);
    if (this._onPointerDown) window.removeEventListener("pointerdown", this._onPointerDown);
    if (this._onPointerUp) window.removeEventListener("pointerup", this._onPointerUp);
    if (this._onContextMenu) window.removeEventListener("contextmenu", this._onContextMenu);
    this._onKeyDown = null;
    this._onKeyUp = null;
    this._onPointerMove = null;
    this._onPointerDown = null;
    this._onPointerUp = null;
    this._onContextMenu = null;
  }

  // -----------------------------------------------------------------------
  // Restart
  // -----------------------------------------------------------------------

  private _restart(): void {
    this._state = initState();
    this._state.screenWidth = viewManager.app.screen.width;
    this._state.screenHeight = viewManager.app.screen.height;
  }

  // -----------------------------------------------------------------------
  // Game loop (called every frame from ticker)
  // -----------------------------------------------------------------------

  private _gameLoop(ticker: Ticker): void {
    const state = this._state;
    const dt = ticker.deltaTime / 60; // convert to seconds (~0.016 at 60fps)

    // Update screen dimensions in case of resize
    state.screenWidth = viewManager.app.screen.width;
    state.screenHeight = viewManager.app.screen.height;

    // --- Simulation (skip if paused/game over) ---
    if (!state.paused && !state.gameOver) {
      // Update systems in order
      updatePlayer(state, dt);
      updateHorses(state, dt);
      updateNPCs(state, dt);
      updateCombat(state, dt);
      updateWanted(state, dt);
      updateQuests(state, dt);

      // Update particles
      for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.pos.x += p.vel.x * dt;
        p.pos.y += p.vel.y * dt;
        p.life -= dt;
        if (p.life <= 0) {
          state.particles.splice(i, 1);
        }
      }

      // Update notifications
      for (let i = state.notifications.length - 1; i >= 0; i--) {
        state.notifications[i].timer -= dt;
        if (state.notifications[i].timer <= 0) {
          state.notifications.splice(i, 1);
        }
      }

      // Day/night cycle
      state.dayTime = (state.dayTime + state.daySpeed * dt) % 1.0;

      // Track interact key edge
      state.lastInteractKey = state.interactKey;

      // Time elapsed
      state.timeElapsed += dt;
    }

    // --- Camera update (always, even when paused) ---
    this._updateCamera(state);

    // --- Apply camera to GTA world container ---
    const sw = viewManager.app.screen.width;
    const sh = viewManager.app.screen.height;
    if (this._gtaWorld) {
      this._gtaWorld.scale.set(ZOOM);
      this._gtaWorld.position.set(-state.cameraX * ZOOM, -state.cameraY * ZOOM);
    }

    // --- Render update ---
    this._cityRenderer.update(state, sw, sh);
    this._charRenderer.update(state);
    this._hudView.update(state, sw, sh);
    this._minimapView.update(state, sw, sh);

    // Increment tick
    state.tick++;
  }

  // -----------------------------------------------------------------------
  // Camera
  // -----------------------------------------------------------------------

  private _updateCamera(state: MedievalGTAState): void {
    const screenW = state.screenWidth;
    const screenH = state.screenHeight;
    const zoom = ZOOM;

    // Target: center player on screen
    let targetX = state.player.pos.x - screenW / (2 * zoom);
    let targetY = state.player.pos.y - screenH / (2 * zoom);

    // Clamp to world bounds
    const maxX = state.worldWidth - screenW / zoom;
    const maxY = state.worldHeight - screenH / zoom;
    targetX = Math.max(0, Math.min(targetX, maxX));
    targetY = Math.max(0, Math.min(targetY, maxY));

    state.cameraTargetX = targetX;
    state.cameraTargetY = targetY;

    // Lerp toward target
    state.cameraX += (state.cameraTargetX - state.cameraX) * CAMERA_LERP;
    state.cameraY += (state.cameraTargetY - state.cameraY) * CAMERA_LERP;
  }
}
