// ---------------------------------------------------------------------------
// Caesar – Save/Load system (localStorage)
// ---------------------------------------------------------------------------

import { CaesarResourceType } from "../config/CaesarResourceDefs";
import type { CaesarServiceType } from "../config/CaesarBuildingDefs";
import { CB } from "../config/CaesarBalance";
import type { CaesarState } from "../state/CaesarState";
import type { CaesarBuilding } from "../state/CaesarBuilding";
import type { CaesarWalker } from "../state/CaesarWalker";
import { createMap, type CaesarMapData, type CaesarTile } from "../state/CaesarMap";

const SAVE_KEY = "caesar_save_v1";

interface SaveData {
  version: 1;
  // Core
  scenarioId: number;
  difficulty: string;
  gameTick: number;
  gameSpeed: number;
  nextId: number;
  population: number;
  maxPopulation: number;
  unemployed: number;

  // Resources
  resources: [string, number][];
  resourceCaps: [string, number][];

  // Ratings
  ratings: { prosperity: number; culture: number; peace: number; favor: number };
  goals: { population: number; prosperity: number; culture: number; peace: number; favor: number };

  // Economy
  taxTimer: number;
  tributeTimer: number;
  tributesPaid: number;
  tributesMissed: number;
  monthlyIncome: number;
  monthlyExpense: number;
  goodsConsumeTimer: number;
  immigrantTimer: number;

  // Threats
  raidTimer: number;
  raidsDefeated: number;
  eventTimer: number;

  // Map
  map: { width: number; height: number; tiles: SerializedTile[] };

  // Buildings
  buildings: SerializedBuilding[];

  // Walkers (only service walkers — bandits/militia regenerated)
}

interface SerializedTile {
  t: string; // terrain
  e: number; // elevation
}

interface SerializedBuilding {
  id: number;
  type: string;
  tileX: number;
  tileY: number;
  built: boolean;
  constructionProgress: number;
  productionTimer: number;
  housingTier: number;
  residents: number;
  hp: number;
  maxHp: number;
  workers: number;
  walkerTimer: number;
  evolveCooldown: number;
  level: number;
  upgrading: boolean;
  upgradeProgress: number;
}

export function saveToLocalStorage(state: CaesarState): boolean {
  try {
    const data: SaveData = {
      version: 1,
      scenarioId: state.scenarioId,
      difficulty: state.difficulty,
      gameTick: state.gameTick,
      gameSpeed: state.gameSpeed,
      nextId: state.nextId,
      population: state.population,
      maxPopulation: state.maxPopulation,
      unemployed: state.unemployed,
      resources: [...state.resources.entries()],
      resourceCaps: [...state.resourceCaps.entries()],
      ratings: { ...state.ratings },
      goals: { ...state.goals },
      taxTimer: state.taxTimer,
      tributeTimer: state.tributeTimer,
      tributesPaid: state.tributesPaid,
      tributesMissed: state.tributesMissed,
      monthlyIncome: state.monthlyIncome,
      monthlyExpense: state.monthlyExpense,
      goodsConsumeTimer: state.goodsConsumeTimer,
      immigrantTimer: state.immigrantTimer,
      raidTimer: state.raidTimer,
      raidsDefeated: state.raidsDefeated,
      eventTimer: state.eventTimer,
      map: {
        width: state.map.width,
        height: state.map.height,
        tiles: state.map.tiles.map((t) => ({ t: t.terrain, e: t.elevation })),
      },
      buildings: [...state.buildings.values()].map((b) => ({
        id: b.id, type: b.type, tileX: b.tileX, tileY: b.tileY,
        built: b.built, constructionProgress: b.constructionProgress,
        productionTimer: b.productionTimer, housingTier: b.housingTier,
        residents: b.residents, hp: b.hp, maxHp: b.maxHp,
        workers: b.workers, walkerTimer: b.walkerTimer,
        evolveCooldown: b.evolveCooldown,
        level: b.level, upgrading: b.upgrading, upgradeProgress: b.upgradeProgress,
        workerPriority: b.workerPriority,
      })),
    };

    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadFromLocalStorage(state: CaesarState): boolean {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;

    const data: SaveData = JSON.parse(raw);
    if (data.version !== 1) return false;

    // Restore map
    state.map = createMap(data.map.width, data.map.height);
    for (let i = 0; i < data.map.tiles.length && i < state.map.tiles.length; i++) {
      state.map.tiles[i].terrain = data.map.tiles[i].t as any;
      state.map.tiles[i].elevation = data.map.tiles[i].e;
    }

    // Restore scalar fields
    state.scenarioId = data.scenarioId;
    state.difficulty = data.difficulty as any;
    state.gameTick = data.gameTick;
    state.gameSpeed = data.gameSpeed;
    state.nextId = data.nextId;
    state.population = data.population;
    state.maxPopulation = data.maxPopulation;
    state.unemployed = data.unemployed;
    state.ratings = { ...data.ratings };
    state.goals = { ...data.goals };
    state.taxTimer = data.taxTimer;
    state.tributeTimer = data.tributeTimer;
    state.tributesPaid = data.tributesPaid;
    state.tributesMissed = data.tributesMissed;
    state.monthlyIncome = data.monthlyIncome;
    state.monthlyExpense = data.monthlyExpense;
    state.goodsConsumeTimer = data.goodsConsumeTimer ?? 0;
    state.immigrantTimer = data.immigrantTimer;
    state.raidTimer = data.raidTimer;
    state.raidsDefeated = data.raidsDefeated;
    state.eventTimer = data.eventTimer;
    state.morale = (data as any).morale ?? 70;
    state.fireCheckTimer = (data as any).fireCheckTimer ?? CB.FIRE_CHECK_INTERVAL;
    state.tradeProfit = (data as any).tradeProfit ?? 0;
    state.goodsProduced = (data as any).goodsProduced ?? 0;
    state.caravanTimer = (data as any).caravanTimer ?? 90;
    state.activeCaravan = null;

    // Restore resources
    state.resources.clear();
    for (const [k, v] of data.resources) state.resources.set(k as CaesarResourceType, v);
    state.resourceCaps.clear();
    for (const [k, v] of data.resourceCaps) state.resourceCaps.set(k as CaesarResourceType, v);

    // Restore buildings
    state.buildings.clear();
    for (const sb of data.buildings) {
      state.buildings.set(sb.id, {
        id: sb.id, type: sb.type as any, tileX: sb.tileX, tileY: sb.tileY,
        built: sb.built, constructionProgress: sb.constructionProgress,
        productionTimer: sb.productionTimer,
        inputStorage: new Map(), outputStorage: new Map(),
        housingTier: sb.housingTier, residents: sb.residents,
        services: new Set(), devolveTimer: 0, evolveCooldown: sb.evolveCooldown ?? 0,
        walkerTimer: sb.walkerTimer, hp: sb.hp, maxHp: sb.maxHp,
        workers: sb.workers, attackTimer: 0,
        level: sb.level ?? 1, upgrading: sb.upgrading ?? false, upgradeProgress: sb.upgradeProgress ?? 0,
        onFire: false, fireTimer: 0,
        workerPriority: (sb as any).workerPriority ?? "normal",
      });
    }

    // Clear walkers (will regenerate naturally)
    state.walkers.clear();
    state.activeEvent = null;
    state.advisorMessages = [];
    state.roadDirty = true;
    state.desirabilityDirty = true;
    state.gameOver = false;
    state.victory = false;

    return true;
  } catch {
    return false;
  }
}

export function hasSave(): boolean {
  return localStorage.getItem(SAVE_KEY) !== null;
}

export function deleteSave(): void {
  localStorage.removeItem(SAVE_KEY);
}
