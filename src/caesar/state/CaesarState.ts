// ---------------------------------------------------------------------------
// Caesar – Central game state
// ---------------------------------------------------------------------------

import { CB, type CaesarDifficulty } from "../config/CaesarBalance";
import { CaesarResourceType } from "../config/CaesarResourceDefs";
import { CaesarBuildingType } from "../config/CaesarBuildingDefs";
import { createMap, type CaesarMapData } from "./CaesarMap";
import type { CaesarBuilding } from "./CaesarBuilding";
import type { CaesarWalker } from "./CaesarWalker";

export interface CaesarRatings {
  prosperity: number;  // 0-100
  culture: number;     // 0-100
  peace: number;       // 0-100
  favor: number;       // 0-100
}

export interface CaesarGoals {
  population: number;
  prosperity: number;
  culture: number;
  peace: number;
  favor: number;
}

export type CaesarTool =
  | "select"
  | "build"
  | "road"
  | "demolish";

export type CaesarEventType =
  | "plague"
  | "bountiful_harvest"
  | "royal_festival"
  | "bandit_ambush"
  | "merchant_caravan"
  | "drought"
  | null;

export interface CaesarActiveEvent {
  type: CaesarEventType;
  timer: number;
  message: string;
}

/** Trade caravan offer */
export interface CaesarCaravanOffer {
  selling: { type: CaesarResourceType; amount: number; price: number }[];   // what merchant sells to you
  buying: { type: CaesarResourceType; amount: number; price: number }[];    // what merchant buys from you
  timer: number;  // seconds before caravan leaves
}

/** Advisor messages that appear to guide/warn the player */
export interface CaesarAdvisorMessage {
  text: string;
  severity: "info" | "warning" | "critical";
  timestamp: number;  // gameTick when created
}

/** Scenario definition for progression */
export interface CaesarScenario {
  id: number;
  title: string;
  briefing: string;
  goals: CaesarGoals;
  startGold: number;
  startFood: number;
  raidDelayMult: number;  // 1 = normal, 2 = double delay before first raid
}

export const SCENARIOS: CaesarScenario[] = [
  {
    id: 0,
    title: "The New Settlement",
    briefing: "The King has granted you a plot of land. Build a small village and prove your worth. Attract 150 people and achieve basic prosperity.",
    goals: { population: 150, prosperity: 30, culture: 20, peace: 40, favor: 30 },
    startGold: 4000, startFood: 150, raidDelayMult: 3,
  },
  {
    id: 1,
    title: "The Growing Town",
    briefing: "Your village thrives! The King demands more. Build churches, entertainment, and industry. Defend against rising bandit threats.",
    goals: { population: 350, prosperity: 50, culture: 40, peace: 50, favor: 40 },
    startGold: 3500, startFood: 120, raidDelayMult: 1.5,
  },
  {
    id: 2,
    title: "The King's City",
    briefing: "Build a grand medieval city worthy of the crown. Achieve excellence in all ratings. The King's patience is short and bandits grow bold.",
    goals: { population: 600, prosperity: 65, culture: 55, peace: 55, favor: 50 },
    startGold: 3000, startFood: 100, raidDelayMult: 1,
  },
  {
    id: 3,
    title: "The Frontier Fortress",
    briefing: "A wild borderland with constant raids. Gold is scarce but iron is plentiful. Build walls, towers, and barracks to survive. Prosperity comes second to peace.",
    goals: { population: 400, prosperity: 40, culture: 30, peace: 70, favor: 45 },
    startGold: 2500, startFood: 80, raidDelayMult: 0.5,
  },
  {
    id: 4,
    title: "The Grand Cathedral",
    briefing: "The King demands a cultural jewel. Build the finest churches, arenas, and festival grounds in the realm. Industry must fuel a cultural renaissance.",
    goals: { population: 500, prosperity: 55, culture: 75, peace: 45, favor: 55 },
    startGold: 3500, startFood: 120, raidDelayMult: 1.2,
  },
];

export interface CaesarState {
  // Map
  map: CaesarMapData;

  // Entities
  buildings: Map<number, CaesarBuilding>;
  walkers: Map<number, CaesarWalker>;
  nextId: number;

  // Resources
  resources: Map<CaesarResourceType, number>;
  resourceCaps: Map<CaesarResourceType, number>; // max storage per resource

  // Population
  population: number;
  maxPopulation: number;
  unemployed: number;

  // Ratings
  ratings: CaesarRatings;
  goals: CaesarGoals;

  // Economy
  taxTimer: number;
  tributeTimer: number;
  tributesPaid: number;
  tributesMissed: number;
  monthlyIncome: number;
  monthlyExpense: number;
  goodsConsumeTimer: number;  // timer for cloth/tools consumption

  // Immigration
  immigrantTimer: number;

  // Threats
  raidTimer: number;
  raidsPending: number;
  raidsDefeated: number;

  // Random events
  eventTimer: number;
  activeEvent: CaesarActiveEvent | null;

  // Advisor
  advisorMessages: CaesarAdvisorMessage[];
  advisorTimer: number;

  // Morale (0-100)
  morale: number;

  // Trade caravans
  caravanTimer: number;
  activeCaravan: CaesarCaravanOffer | null;
  tradeProfit: number;         // total gold earned from caravan trades (for prosperity)
  goodsProduced: number;       // total goods produced (for prosperity)

  // Fire
  fireCheckTimer: number;

  // Scenario
  scenarioId: number;

  // Time
  gameTick: number;
  gameSpeed: number;
  paused: boolean;
  gameOver: boolean;
  victory: boolean;

  // Difficulty
  difficulty: CaesarDifficulty;

  // UI state
  selectedTool: CaesarTool;
  selectedBuildingType: CaesarBuildingType | null;
  selectedBuildingId: number | null;
  hoveredTileX: number;
  hoveredTileY: number;
  tooltipText: string;

  // Screen
  screenW: number;
  screenH: number;

  // Dirty flags
  roadDirty: boolean;
  desirabilityDirty: boolean;

  // Drag placement
  isDragging: boolean;
  dragTool: CaesarTool | null;
}

export function createCaesarState(
  screenW: number,
  screenH: number,
  difficulty: CaesarDifficulty = "normal",
  scenarioId: number = 0,
): CaesarState {
  const scenario = SCENARIOS[scenarioId] ?? SCENARIOS[0];

  const resources = new Map<CaesarResourceType, number>();
  resources.set(CaesarResourceType.GOLD, scenario.startGold);
  resources.set(CaesarResourceType.FOOD, scenario.startFood);
  resources.set(CaesarResourceType.WOOD, CB.START_WOOD);
  resources.set(CaesarResourceType.STONE, CB.START_STONE);
  resources.set(CaesarResourceType.WHEAT, 0);
  resources.set(CaesarResourceType.FLOUR, 0);
  resources.set(CaesarResourceType.IRON, 0);
  resources.set(CaesarResourceType.TOOLS, 0);
  resources.set(CaesarResourceType.CLOTH, 0);

  // Base storage caps
  const resourceCaps = new Map<CaesarResourceType, number>();
  for (const rt of Object.values(CaesarResourceType)) {
    resourceCaps.set(rt as CaesarResourceType, rt === CaesarResourceType.GOLD ? 99999 : CB.BASE_STORAGE_CAP);
  }

  const raidBase = CB.RAID_INTERVAL_MIN + Math.random() * (CB.RAID_INTERVAL_MAX - CB.RAID_INTERVAL_MIN);

  return {
    map: createMap(CB.MAP_WIDTH, CB.MAP_HEIGHT),
    buildings: new Map(),
    walkers: new Map(),
    nextId: 1,
    resources,
    resourceCaps,
    population: 0,
    maxPopulation: 0,
    unemployed: 0,
    ratings: { prosperity: 50, culture: 0, peace: 100, favor: 50 },
    goals: { ...scenario.goals },
    taxTimer: 0,
    tributeTimer: CB.TRIBUTE_INTERVAL,
    tributesPaid: 0,
    tributesMissed: 0,
    monthlyIncome: 0,
    monthlyExpense: 0,
    goodsConsumeTimer: 0,
    immigrantTimer: CB.IMMIGRANT_INTERVAL,
    raidTimer: raidBase * scenario.raidDelayMult,
    raidsPending: 0,
    raidsDefeated: 0,
    eventTimer: CB.EVENT_CHECK_INTERVAL,
    activeEvent: null,
    advisorMessages: [],
    advisorTimer: 0,
    morale: CB.MORALE_BASE,
    caravanTimer: 90 + Math.random() * 60,
    activeCaravan: null,
    tradeProfit: 0,
    goodsProduced: 0,
    fireCheckTimer: CB.FIRE_CHECK_INTERVAL,
    scenarioId,
    gameTick: 0,
    gameSpeed: 1,
    paused: false,
    gameOver: false,
    victory: false,
    difficulty,
    selectedTool: "select",
    selectedBuildingType: null,
    selectedBuildingId: null,
    hoveredTileX: -1,
    hoveredTileY: -1,
    tooltipText: "",
    screenW, screenH,
    roadDirty: true,
    desirabilityDirty: true,
    isDragging: false,
    dragTool: null,
  };
}

export function nextEntityId(state: CaesarState): number {
  return state.nextId++;
}

export function getGameMonth(state: CaesarState): number {
  return Math.floor(state.gameTick / (CB.SIM_TPS * 60));
}

export function getGameYear(state: CaesarState): number {
  return Math.floor(getGameMonth(state) / 12);
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function getGameDateString(state: CaesarState): string {
  const month = getGameMonth(state) % 12;
  const year = 1066 + getGameYear(state);
  return `${MONTH_NAMES[month]} ${year} AD`;
}
