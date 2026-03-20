// ---------------------------------------------------------------------------
// CivState.ts — Game state + all state mutations for Arthurian Civilization
// ---------------------------------------------------------------------------

import {
  TERRAIN_TYPES, CIV_FACTIONS, CIV_UNIT_DEFS, CIV_BUILDING_DEFS,
  CIV_TECH_TREE, CIV_WONDERS, CIV_HEROES, CIV_DIFFICULTY,
  XP_PER_LEVEL, MAX_LEVEL, LEVEL_BONUS, FORTIFY_BONUS,
  CITY_BASE_DEFENSE, HEAL_PER_TURN, HEAL_IN_CITY,
  MIN_CITY_DISTANCE, BASE_FOOD_NEEDED, FOOD_PER_POP,
  BASE_CITY_PRODUCTION, BASE_CITY_GOLD, BASE_CITY_RESEARCH,
  type FactionDef, type TechDef, type MapPreset,
} from "./CivConfig";

// ── Types ──────────────────────────────────────────────────────────────────

export type DiplRelation = "war" | "peace" | "alliance";

export interface DiplomacyEntry {
  targetPlayer: number;
  relation: DiplRelation;
  attitude: number;
  turnsAtWar: number;
  turnsAtPeace: number;
}

export interface HexTile {
  x: number; y: number;
  terrain: string;
  resource: string | null;
  improvement: string | null;
  owner: number;
  cityId: number;
  unitIds: number[];
}

export interface CivCity {
  id: number;
  name: string;
  owner: number;
  x: number; y: number;
  population: number;
  food: number;
  foodNeeded: number;
  production: number;
  productionAccum: number;
  gold: number;
  research: number;
  culture: number;
  happiness: number;
  buildings: string[];
  buildQueue: string[];
  tiles: { x: number; y: number }[];
  isCapital: boolean;
  defense: number;
  tradeRoutes: number[]; // city IDs this city trades with
}

export interface CivUnit {
  id: number;
  type: string;
  owner: number;
  x: number; y: number;
  hp: number;
  maxHp: number;
  movement: number;
  maxMovement: number;
  experience: number;
  level: number;
  fortified: boolean;
  sleeping: boolean;
  path: { x: number; y: number }[] | null;
  isHero: boolean;
  heroId: string | null;
  label: string;
  attack: number;
  defense: number;
  turnBuilt: number;
  promotions: string[];
  pendingPromotion: boolean;
  improvementProgress: number;
  improvementTarget: string | null;
  autoExplore: boolean;
}

export interface CivPlayer {
  index: number;
  faction: string;
  factionDef: FactionDef;
  isHuman: boolean;
  gold: number;
  goldPerTurn: number;
  researchPerTurn: number;
  researchAccum: number;
  currentTech: string | null;
  techs: string[];
  wonders: string[];
  heroes: number[];
  chivalry: number;
  cityIds: number[];
  unitIds: number[];
  alive: boolean;
  diplomacy: DiplomacyEntry[];
  score: number;
  taxRate: number;
  cityNameIndex: number;
  goldenAgeTurns: number; // turns remaining of golden age (0 = none)
}

export interface GameEvent {
  turn: number;
  type: string;
  message: string;
  player: number;
}

export interface CivGameState {
  turn: number;
  currentPlayer: number;
  phase: "playing" | "victory" | "defeat";
  tiles: HexTile[][];
  mapWidth: number;
  mapHeight: number;
  players: CivPlayer[];
  cities: CivCity[];
  units: CivUnit[];
  nextCityId: number;
  nextUnitId: number;
  selectedUnitId: number;
  selectedCityId: number;
  victoryType: string | null;
  events: GameEvent[];
  wastelandTiles: { x: number; y: number }[];
  grailFound: boolean;
  difficulty: number;
  reachableTiles: { x: number; y: number }[];
  attackableTiles: { x: number; y: number }[];
  visibility: number[][][];
  humanPlayerIndex: number;
  barbarianSpawnTimer: number;
}

// ── Hex math (even-r offset) ───────────────────────────────────────────────

const EVEN_R_DIRS = [
  [[+1, 0], [0, -1], [-1, -1], [-1, 0], [-1, +1], [0, +1]],
  [[+1, 0], [+1, -1], [0, -1], [-1, 0], [0, +1], [+1, +1]],
];

export function getNeighbors(x: number, y: number, w: number, h: number): { x: number; y: number }[] {
  const parity = y & 1;
  const dirs = EVEN_R_DIRS[parity];
  const result: { x: number; y: number }[] = [];
  for (const [dx, dy] of dirs) {
    const nx = x + dx, ny = y + dy;
    if (nx >= 0 && nx < w && ny >= 0 && ny < h) result.push({ x: nx, y: ny });
  }
  return result;
}

export function hexDistance(x1: number, y1: number, x2: number, y2: number): number {
  const toC = (x: number, y: number) => {
    const q = x - (y - (y & 1)) / 2;
    const r = y;
    return { q, r, s: -q - r };
  };
  const a = toC(x1, y1), b = toC(x2, y2);
  return Math.max(Math.abs(a.q - b.q), Math.abs(a.r - b.r), Math.abs(a.s - b.s));
}

// ── Map generation ─────────────────────────────────────────────────────────

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}

function noise2D(rng: () => number, w: number, h: number, scale: number): number[][] {
  const gw = Math.ceil(w / scale) + 2;
  const gh = Math.ceil(h / scale) + 2;
  const grid: number[][] = [];
  for (let y = 0; y < gh; y++) { grid[y] = []; for (let x = 0; x < gw; x++) grid[y][x] = rng(); }
  const result: number[][] = [];
  for (let y = 0; y < h; y++) {
    result[y] = [];
    for (let x = 0; x < w; x++) {
      const gx = x / scale, gy = y / scale;
      const ix = Math.floor(gx), iy = Math.floor(gy);
      const fx = gx - ix, fy = gy - iy;
      const top = grid[iy][ix] + (grid[iy][ix + 1] - grid[iy][ix]) * fx;
      const bot = grid[iy + 1][ix] + (grid[iy + 1][ix + 1] - grid[iy + 1][ix]) * fx;
      result[y][x] = top + (bot - top) * fy;
    }
  }
  return result;
}

export function generateMap(w: number, h: number, numPlayers: number, seed?: number): { tiles: HexTile[][]; startPositions: { x: number; y: number }[] } {
  const rng = seededRandom(seed ?? (Date.now() & 0x7FFFFFFF));
  const elevation = noise2D(rng, w, h, 8);
  const moisture = noise2D(rng, w, h, 6);
  const magic = noise2D(rng, w, h, 10);
  const tiles: HexTile[][] = [];
  const cx = w / 2, cy = h / 2;

  for (let y = 0; y < h; y++) {
    tiles[y] = [];
    for (let x = 0; x < w; x++) {
      const dx = (x - cx) / (w * 0.45), dy = (y - cy) / (h * 0.45);
      const dist = Math.sqrt(dx * dx + dy * dy);
      const e = elevation[y][x] - dist * 0.9;
      const m = moisture[y][x], mg = magic[y][x];

      let terrain: string;
      if (e < 0.15) terrain = "ocean";
      else if (e < 0.20) terrain = rng() < 0.3 ? "lake" : "ocean";
      else if (e < 0.25) terrain = m > 0.6 ? "swamp" : "grassland";
      else if (e < 0.35) terrain = m > 0.5 ? "grassland" : "plains";
      else if (e < 0.50) {
        if (m > 0.65) terrain = mg > 0.8 ? "enchanted_forest" : "forest";
        else if (m > 0.4) terrain = "plains";
        else terrain = "grassland";
      } else if (e < 0.65) terrain = m > 0.7 ? "forest" : "hills";
      else if (e < 0.78) terrain = "hills";
      else terrain = "mountains";

      if (terrain === "plains" && mg > 0.9 && rng() < 0.15) terrain = "roman_ruins";
      if (terrain === "grassland" && mg > 0.85 && rng() < 0.1) terrain = "holy_spring";
      if ((terrain === "grassland" || terrain === "plains") && rng() < 0.03) terrain = "river";

      // Resource placement on suitable terrain
      let resource: string | null = null;
      if (terrain === "hills" && rng() < 0.15) resource = "iron";
      else if ((terrain === "hills" || terrain === "mountains") && rng() < 0.10) resource = "gold_ore";
      else if ((terrain === "plains" || terrain === "grassland") && rng() < 0.08) resource = "horses";
      else if (terrain === "forest" && rng() < 0.20) resource = "timber";
      else if (terrain === "ocean") {
        // Check adjacency to land for fish
        const hasLandNeighbor = getNeighbors(x, y, w, h).some(n => {
          const nt = tiles[n.y]?.[n.x];
          return nt && nt.terrain !== "ocean" && nt.terrain !== "lake";
        });
        if (hasLandNeighbor && rng() < 0.10) resource = "fish";
      }
      else if (terrain === "holy_spring" && rng() < 0.30) resource = "holy_relic";
      else if (terrain === "enchanted_forest" && rng() < 0.25) resource = "mana_crystal";
      else if (terrain === "hills" && !resource && rng() < 0.12) resource = "stone";

      tiles[y][x] = { x, y, terrain, resource, improvement: null, owner: -1, cityId: -1, unitIds: [] };
    }
  }

  // Start positions spread around map center
  const startPositions: { x: number; y: number }[] = [];
  const angleStep = (Math.PI * 2) / numPlayers;
  const radius = Math.min(w, h) * 0.3;
  for (let i = 0; i < numPlayers; i++) {
    const angle = angleStep * i - Math.PI / 2;
    let bx = Math.round(cx + Math.cos(angle) * radius);
    let by = Math.round(cy + Math.sin(angle) * radius);
    bx = Math.max(3, Math.min(w - 4, bx));
    by = Math.max(3, Math.min(h - 4, by));
    let found = false;
    for (let r = 0; r < 10 && !found; r++) {
      for (let dy2 = -r; dy2 <= r && !found; dy2++) {
        for (let dx2 = -r; dx2 <= r && !found; dx2++) {
          const tx = bx + dx2, ty = by + dy2;
          if (tx >= 0 && tx < w && ty >= 0 && ty < h) {
            const t = TERRAIN_TYPES[tiles[ty][tx].terrain];
            if (t && t.passable && tiles[ty][tx].terrain !== "swamp") {
              startPositions.push({ x: tx, y: ty });
              found = true;
            }
          }
        }
      }
    }
    if (!found) startPositions.push({ x: bx, y: by });
  }
  return { tiles, startPositions };
}

// ── State creation ─────────────────────────────────────────────────────────

export interface CreateGameConfig {
  mapPreset: MapPreset;
  numPlayers: number;
  humanFaction: number;
  difficulty: number;
  seed?: number;
}

export function createCivGameState(config: CreateGameConfig): CivGameState {
  const { mapPreset, numPlayers, humanFaction, difficulty } = config;
  const np = Math.min(numPlayers, CIV_FACTIONS.length);
  const { tiles, startPositions } = generateMap(mapPreset.width, mapPreset.height, np, config.seed);

  const players: CivPlayer[] = [];
  // Track used factions
  void humanFaction; // used to select player faction below
  const aiFactions: number[] = [];
  for (let i = 0; i < CIV_FACTIONS.length && aiFactions.length < np - 1; i++) {
    if (i !== humanFaction) aiFactions.push(i);
  }

  for (let i = 0; i < np; i++) {
    const fIdx = i === 0 ? humanFaction : aiFactions[i - 1];
    const faction = CIV_FACTIONS[fIdx];
    const diplo: DiplomacyEntry[] = [];
    for (let j = 0; j < np; j++) {
      if (j !== i) diplo.push({ targetPlayer: j, relation: "peace", attitude: 0, turnsAtWar: 0, turnsAtPeace: 0 });
    }
    players.push({
      index: i, faction: faction.id, factionDef: faction, isHuman: i === 0,
      gold: 30, goldPerTurn: 0, researchPerTurn: 0, researchAccum: 0,
      currentTech: null, techs: [], wonders: [], heroes: [], chivalry: 50,
      cityIds: [], unitIds: [], alive: true, diplomacy: diplo, score: 0, taxRate: 0.5, cityNameIndex: 0, goldenAgeTurns: 0,
    });
  }

  const vis: number[][][] = [];
  for (let p = 0; p < np; p++) {
    vis[p] = [];
    for (let y = 0; y < mapPreset.height; y++) {
      vis[p][y] = [];
      for (let x = 0; x < mapPreset.width; x++) vis[p][y][x] = 0;
    }
  }

  const state: CivGameState = {
    turn: 1, currentPlayer: 0, phase: "playing", tiles, mapWidth: mapPreset.width, mapHeight: mapPreset.height,
    players, cities: [], units: [], nextCityId: 1, nextUnitId: 1, selectedUnitId: -1, selectedCityId: -1,
    victoryType: null, events: [], wastelandTiles: [], grailFound: false, difficulty,
    reachableTiles: [], attackableTiles: [], visibility: vis, humanPlayerIndex: 0,
    barbarianSpawnTimer: 0,
  };

  for (let i = 0; i < np; i++) {
    const pos = startPositions[i];
    addUnit(state, i, "settler", pos.x, pos.y);
    addUnit(state, i, "warband", pos.x, pos.y);
    addUnit(state, i, "scout", pos.x, pos.y);
    revealArea(state, i, pos.x, pos.y, 4);
  }
  return state;
}

// ── Unit management ────────────────────────────────────────────────────────

export function addUnit(state: CivGameState, owner: number, type: string, x: number, y: number, heroId?: string): CivUnit {
  const def = CIV_UNIT_DEFS[type];
  const hero = heroId ? CIV_HEROES[heroId] : null;
  const unit: CivUnit = {
    id: state.nextUnitId++, type, owner, x, y,
    hp: hero ? hero.hp : (def?.hp ?? 10), maxHp: hero ? hero.hp : (def?.hp ?? 10),
    movement: hero ? hero.movement : (def?.movement ?? 2), maxMovement: hero ? hero.movement : (def?.movement ?? 2),
    experience: 0, level: 0, fortified: false, sleeping: false, path: null,
    isHero: !!heroId, heroId: heroId ?? null,
    label: hero ? hero.label : (def?.label ?? "??"),
    attack: hero ? hero.attack : (def?.attack ?? 1), defense: hero ? hero.defense : (def?.defense ?? 1),
    turnBuilt: state.turn,
    promotions: [], pendingPromotion: false,
    improvementProgress: 0, improvementTarget: null, autoExplore: false,
  };
  state.units.push(unit);
  state.players[owner].unitIds.push(unit.id);
  const tile = state.tiles[y]?.[x];
  if (tile) tile.unitIds.push(unit.id);
  return unit;
}

export function removeUnit(state: CivGameState, unitId: number): void {
  const idx = state.units.findIndex(u => u.id === unitId);
  if (idx < 0) return;
  const unit = state.units[idx];
  const tile = state.tiles[unit.y]?.[unit.x];
  if (tile) tile.unitIds = tile.unitIds.filter(id => id !== unitId);
  const player = state.players[unit.owner];
  if (player) { player.unitIds = player.unitIds.filter(id => id !== unitId); player.heroes = player.heroes.filter(id => id !== unitId); }
  state.units.splice(idx, 1);
  if (state.selectedUnitId === unitId) state.selectedUnitId = -1;
}

export function getUnit(state: CivGameState, unitId: number): CivUnit | undefined {
  return state.units.find(u => u.id === unitId);
}

export function moveUnitTo(state: CivGameState, unitId: number, toX: number, toY: number): boolean {
  const unit = getUnit(state, unitId);
  if (!unit) return false;
  const terrain = TERRAIN_TYPES[state.tiles[toY]?.[toX]?.terrain ?? "ocean"];
  if (!terrain || !terrain.passable) return false;
  const cost = terrain.moveCost;
  if (unit.movement < cost && unit.movement < unit.maxMovement) return false;
  const oldTile = state.tiles[unit.y]?.[unit.x];
  if (oldTile) oldTile.unitIds = oldTile.unitIds.filter(id => id !== unitId);
  unit.x = toX; unit.y = toY;
  unit.movement = Math.max(0, unit.movement - cost);
  unit.fortified = false; unit.sleeping = false;
  const newTile = state.tiles[toY]?.[toX];
  if (newTile) newTile.unitIds.push(unitId);
  revealArea(state, unit.owner, toX, toY, 2);
  return true;
}

// ── City management ────────────────────────────────────────────────────────

export function foundCity(state: CivGameState, owner: number, x: number, y: number, name?: string): CivCity | null {
  for (const city of state.cities) {
    if (hexDistance(city.x, city.y, x, y) < MIN_CITY_DISTANCE) return null;
  }
  const player = state.players[owner];
  const faction = player.factionDef;
  const cityName = name ?? faction.cityNames[player.cityNameIndex % faction.cityNames.length];
  player.cityNameIndex++;
  const isCapital = player.cityIds.length === 0;
  const workTiles = getNeighbors(x, y, state.mapWidth, state.mapHeight);
  workTiles.push({ x, y });

  const city: CivCity = {
    id: state.nextCityId++, name: cityName, owner, x, y,
    population: 1, food: 0, foodNeeded: BASE_FOOD_NEEDED,
    production: 0, productionAccum: 0, gold: 0, research: 0, culture: 0, happiness: 5,
    buildings: ["great_hall"], buildQueue: ["warband"],
    tiles: workTiles, isCapital, defense: CITY_BASE_DEFENSE,
    tradeRoutes: [],
  };
  state.cities.push(city);
  player.cityIds.push(city.id);
  const tile = state.tiles[y]?.[x];
  if (tile) { tile.cityId = city.id; tile.owner = owner; }
  for (const t of workTiles) {
    const tt = state.tiles[t.y]?.[t.x];
    if (tt && tt.owner === -1) tt.owner = owner;
  }
  revealArea(state, owner, x, y, 3);
  addEvent(state, owner, `${cityName} has been founded!`);
  return city;
}

export function getCity(state: CivGameState, cityId: number): CivCity | undefined {
  return state.cities.find(c => c.id === cityId);
}

export function removeCity(state: CivGameState, cityId: number): void {
  const idx = state.cities.findIndex(c => c.id === cityId);
  if (idx < 0) return;
  const city = state.cities[idx];
  const player = state.players[city.owner];
  if (player) player.cityIds = player.cityIds.filter(id => id !== cityId);
  const tile = state.tiles[city.y]?.[city.x];
  if (tile) tile.cityId = -1;
  state.cities.splice(idx, 1);
  if (state.selectedCityId === cityId) state.selectedCityId = -1;
}

// ── City yields & production ───────────────────────────────────────────────

export function calculateCityYields(state: CivGameState, city: CivCity): { food: number; production: number; gold: number; research: number; culture: number } {
  const player = state.players[city.owner];
  const diff = CIV_DIFFICULTY[state.difficulty] ?? CIV_DIFFICULTY[2];
  const bonus = player.isHuman ? diff.playerBonus : diff.aiProductionBonus;
  let food = 0, production = BASE_CITY_PRODUCTION, gold = BASE_CITY_GOLD, research = BASE_CITY_RESEARCH, culture = 0;
  const maxWorked = city.population + 1;
  let worked = 0;
  for (const t of city.tiles) {
    if (worked >= maxWorked) break;
    const terrain = TERRAIN_TYPES[state.tiles[t.y]?.[t.x]?.terrain ?? "ocean"];
    if (terrain) { food += terrain.food; production += terrain.production; gold += terrain.gold; }
    const tileData = state.tiles[t.y]?.[t.x];
    if (tileData?.resource) {
      switch (tileData.resource) {
        case "iron": production += 2; break;
        case "gold_ore": gold += 3; break;
        case "horses": production += 1; food += 1; break;
        case "timber": production += 2; break;
        case "fish": food += 2; break;
        case "holy_relic": culture += 2; research += 1; break;
        case "mana_crystal": research += 3; break;
        case "stone": production += 2; break;
      }
    }
    // Improvement bonuses
    if (tileData?.improvement) {
      switch (tileData.improvement) {
        case "farm": food += 2; break;
        case "mine": production += 2; break;
        case "road": gold += 1; break;
        case "lumber_camp": production += 1; break;
        case "pasture": food += 1; production += 1; break;
        case "holy_shrine": culture += 2; break;
      }
    }
    worked++;
  }
  for (const bid of city.buildings) {
    const bdef = CIV_BUILDING_DEFS[bid];
    if (bdef) { food += bdef.effects.food ?? 0; production += bdef.effects.production ?? 0; gold += bdef.effects.gold ?? 0; research += bdef.effects.research ?? 0; culture += bdef.effects.culture ?? 0; }
  }
  // Trade route income
  gold += getTradeIncome(state, city);
  const fb = player.factionDef.bonuses;
  gold = Math.floor(gold * (1 + fb.goldBonus));
  research = Math.floor(research * (1 + fb.researchBonus));
  food = Math.floor(food * (1 + fb.growthBonus));
  production = Math.floor(production * bonus);
  // Golden age bonus
  if (player.goldenAgeTurns > 0) {
    production = Math.floor(production * 1.5);
    gold = Math.floor(gold * 1.3);
    research = Math.floor(research * 1.3);
  }
  return { food, production, gold, research, culture };
}

function processCityTurn(state: CivGameState, city: CivCity): void {
  const yields = calculateCityYields(state, city);
  const player = state.players[city.owner];
  const foodConsumed = city.population * 2;
  city.food += yields.food - foodConsumed;
  if (city.food >= city.foodNeeded) {
    city.population++; city.food -= city.foodNeeded;
    city.foodNeeded = BASE_FOOD_NEEDED + city.population * FOOD_PER_POP;
    addEvent(state, city.owner, `${city.name} grows to size ${city.population}!`);
    // Auto-expand worked tiles when city grows
    const newTiles: { x: number; y: number; score: number }[] = [];
    for (const t of city.tiles) {
      for (const n of getNeighbors(t.x, t.y, state.mapWidth, state.mapHeight)) {
        const nt = state.tiles[n.y]?.[n.x];
        if (!nt || nt.owner !== city.owner) continue;
        if (city.tiles.some(ct => ct.x === n.x && ct.y === n.y)) continue;
        const terrain = TERRAIN_TYPES[nt.terrain];
        if (terrain && terrain.passable) newTiles.push({ x: n.x, y: n.y, score: terrain.food + terrain.production + terrain.gold });
      }
    }
    if (newTiles.length > 0) {
      newTiles.sort((a, b) => b.score - a.score);
      city.tiles.push({ x: newTiles[0].x, y: newTiles[0].y });
    }
  }
  if (city.food < 0) { if (city.population > 1) { city.population--; city.food = 0; addEvent(state, city.owner, `Famine in ${city.name}!`); } else city.food = 0; }
  city.production = yields.production; city.gold = yields.gold; city.research = yields.research; city.culture += yields.culture;
  // Happiness calculation
  city.happiness = 5; // base
  for (const bid of city.buildings) {
    city.happiness += CIV_BUILDING_DEFS[bid]?.effects.happiness ?? 0;
  }
  // Population unhappiness
  city.happiness -= Math.max(0, city.population - 3); // penalty above size 3
  // War weariness
  const atWar = player.diplomacy.some(d => d.relation === "war");
  if (atWar) city.happiness -= 2;
  // Chivalry bonus/penalty
  if (player.chivalry > 60) city.happiness += 2;
  else if (player.chivalry < 20) city.happiness -= 2;
  // Clamp
  city.happiness = Math.max(-5, Math.min(15, city.happiness));
  // Happiness effects
  if (city.happiness < 0) {
    // City in revolt — no production
    city.productionAccum = Math.max(0, city.productionAccum - yields.production);
    addEvent(state, city.owner, `${city.name} is in revolt! Unrest halts production.`);
  }
  if (city.buildQueue.length > 0) {
    city.productionAccum += yields.production;
    const itemId = city.buildQueue[0];
    const unitDef = CIV_UNIT_DEFS[itemId]; const bldgDef = CIV_BUILDING_DEFS[itemId]; const wonderDef = CIV_WONDERS[itemId];
    const cost = unitDef?.cost ?? bldgDef?.cost ?? wonderDef?.cost ?? 999;
    if (city.productionAccum >= cost) {
      city.productionAccum -= cost; city.buildQueue.shift();
      if (unitDef) { addUnit(state, city.owner, itemId, city.x, city.y); addEvent(state, city.owner, `${city.name} produced: ${unitDef.name}`); }
      else if (bldgDef) {
        if (!city.buildings.includes(itemId)) { city.buildings.push(itemId); city.defense = CITY_BASE_DEFENSE; for (const b of city.buildings) city.defense += CIV_BUILDING_DEFS[b]?.effects.defense ?? 0; }
        addEvent(state, city.owner, `${city.name} built: ${bldgDef.name}`);
      }
      else if (wonderDef) { player.wonders.push(itemId); addEvent(state, city.owner, `${city.name} completed wonder: ${wonderDef.name}!`); }
    }
  }
  // Culture border expansion — every 50 culture, expand borders
  const expansionThreshold = 50 * (city.tiles.length - 6); // increases with size
  if (city.culture >= expansionThreshold && expansionThreshold > 0) {
    // Find adjacent unowned tiles
    const borderTiles = new Set<string>();
    for (const t of city.tiles) {
      for (const n of getNeighbors(t.x, t.y, state.mapWidth, state.mapHeight)) {
        const nt = state.tiles[n.y]?.[n.x];
        if (nt && nt.owner === -1 && TERRAIN_TYPES[nt.terrain]?.passable) {
          borderTiles.add(`${n.x},${n.y}`);
        }
      }
    }
    if (borderTiles.size > 0) {
      const arr = Array.from(borderTiles);
      const pick = arr[Math.floor(Math.random() * arr.length)];
      const [nx, ny] = pick.split(",").map(Number);
      state.tiles[ny][nx].owner = city.owner;
      city.tiles.push({ x: nx, y: ny });
    }
  }
  player.gold += yields.gold;
  player.researchAccum += yields.research;
  for (const bid of city.buildings) { const bdef = CIV_BUILDING_DEFS[bid]; if (bdef) player.gold -= bdef.maintenance; }
}

// ── Research ───────────────────────────────────────────────────────────────

function processResearch(state: CivGameState, player: CivPlayer): void {
  if (!player.currentTech) return;
  const tech = CIV_TECH_TREE[player.currentTech];
  if (!tech) return;
  const diff = CIV_DIFFICULTY[state.difficulty] ?? CIV_DIFFICULTY[2];
  const bonus = player.isHuman ? 1 : diff.aiResearchBonus;
  if (player.researchAccum >= tech.cost * (1 / bonus)) {
    player.researchAccum -= tech.cost; player.techs.push(player.currentTech);
    addEvent(state, player.index, `${player.factionDef.name} discovers ${tech.name}!`);
    player.currentTech = null;
  }
}

export function canResearchTech(player: CivPlayer, techId: string): boolean {
  if (player.techs.includes(techId)) return false;
  const tech = CIV_TECH_TREE[techId];
  if (!tech) return false;
  return tech.prerequisites.every(p => player.techs.includes(p));
}

export function getAvailableTechs(player: CivPlayer): TechDef[] {
  return Object.values(CIV_TECH_TREE).filter(t => canResearchTech(player, t.id));
}

export function setResearch(state: CivGameState, playerIndex: number, techId: string): void {
  const player = state.players[playerIndex];
  if (canResearchTech(player, techId)) player.currentTech = techId;
}

// ── Build checks ───────────────────────────────────────────────────────────

export function canBuildUnit(_state: CivGameState, player: CivPlayer, unitId: string): boolean {
  const def = CIV_UNIT_DEFS[unitId];
  if (!def) return false;
  if (def.requiresTech && !player.techs.includes(def.requiresTech)) return false;
  const ownerFaction = CIV_FACTIONS.find(f => f.uniqueUnit === unitId);
  if (ownerFaction && ownerFaction.id !== player.faction) return false;
  return true;
}

export function canBuildBuilding(_state: CivGameState, player: CivPlayer, city: CivCity, buildingId: string): boolean {
  const def = CIV_BUILDING_DEFS[buildingId];
  if (!def) return false;
  if (city.buildings.includes(buildingId)) return false;
  if (def.requiresTech && !player.techs.includes(def.requiresTech)) return false;
  return true;
}

export function getBuildableItems(state: CivGameState, city: CivCity): { units: string[]; buildings: string[]; wonders: string[] } {
  const player = state.players[city.owner];
  const units = Object.keys(CIV_UNIT_DEFS).filter(id => canBuildUnit(state, player, id));
  const buildings = Object.keys(CIV_BUILDING_DEFS).filter(id => canBuildBuilding(state, player, city, id));
  const wonders = Object.keys(CIV_WONDERS).filter(id => {
    const w = CIV_WONDERS[id];
    if (!player.techs.includes(w.requiresTech)) return false;
    return !state.players.some(p => p.wonders.includes(id));
  });
  return { units, buildings, wonders };
}

// ── Worker improvements ───────────────────────────────────────────────────

export type ImprovementType = "farm" | "mine" | "road" | "lumber_camp" | "pasture" | "holy_shrine";

export const IMPROVEMENT_TURNS: Record<string, number> = {
  farm: 3, mine: 4, road: 2, lumber_camp: 3, pasture: 3, holy_shrine: 5,
};

export const VALID_IMPROVEMENTS: Record<string, string[]> = {
  plains: ["farm", "road", "pasture"],
  grassland: ["farm", "road", "pasture"],
  forest: ["lumber_camp", "road"],
  hills: ["mine", "road"],
  river: ["farm", "road"],
  holy_spring: ["holy_shrine", "road"],
  enchanted_forest: ["holy_shrine", "road"],
  roman_ruins: ["mine", "road"],
};

export function getValidImprovements(state: CivGameState, x: number, y: number): string[] {
  const tile = state.tiles[y]?.[x];
  if (!tile || tile.improvement) return [];
  return VALID_IMPROVEMENTS[tile.terrain] ?? [];
}

function _placeImprovement(state: CivGameState, x: number, y: number, improvement: string): boolean {
  const tile = state.tiles[y]?.[x];
  if (!tile) return false;
  const valid = VALID_IMPROVEMENTS[tile.terrain];
  if (!valid || !valid.includes(improvement)) return false;
  tile.improvement = improvement;
  return true;
}

/** @deprecated Use startImprovement instead for proper multi-turn building. */
export function buildImprovement(state: CivGameState, x: number, y: number, improvement: string): boolean {
  return _placeImprovement(state, x, y, improvement);
}

export function startImprovement(state: CivGameState, unitId: number, improvement: string): boolean {
  const unit = getUnit(state, unitId);
  if (!unit) return false;
  const tile = state.tiles[unit.y]?.[unit.x];
  if (!tile) return false;
  const valid = VALID_IMPROVEMENTS[tile.terrain];
  if (!valid || !valid.includes(improvement)) return false;
  if (tile.improvement) return false;
  unit.improvementTarget = improvement;
  unit.improvementProgress = IMPROVEMENT_TURNS[improvement] ?? 3;
  unit.movement = 0; // uses all movement this turn
  return true;
}

// ── Combat ─────────────────────────────────────────────────────────────────

export interface CombatResult {
  winner: "attacker" | "defender";
  attackerDamage: number;
  defenderDamage: number;
  attackerSurvived: boolean;
  defenderSurvived: boolean;
}

export function resolveCombat(state: CivGameState, attackerId: number, defenderId: number): CombatResult {
  const attacker = getUnit(state, attackerId)!;
  const defender = getUnit(state, defenderId)!;
  const aDef = CIV_UNIT_DEFS[attacker.type];

  let atkPower = attacker.attack;
  let defPower = defender.defense;
  const terrain = TERRAIN_TYPES[state.tiles[defender.y]?.[defender.x]?.terrain ?? "plains"];
  defPower *= (1 + (terrain?.defenseBonus ?? 0));
  if (defender.fortified) defPower *= (1 + FORTIFY_BONUS);
  atkPower *= (1 + attacker.level * LEVEL_BONUS);
  defPower *= (1 + defender.level * LEVEL_BONUS);
  const aFaction = state.players[attacker.owner]?.factionDef;
  const dFaction = state.players[defender.owner]?.factionDef;
  if (aFaction) atkPower *= (1 + aFaction.bonuses.attackBonus);
  if (dFaction) defPower *= (1 + dFaction.bonuses.defenseBonus);
  // Wonder combat bonuses
  const atkPlayer = state.players[attacker.owner];
  const defPlayer = state.players[defender.owner];
  if (atkPlayer?.wonders.includes("excalibur")) atkPower += 3;
  if (defPlayer?.wonders.includes("tintagel_castle")) {
    const defCapital = state.cities.find(c => c.owner === defender.owner && c.isCapital);
    if (defCapital && defender.x === defCapital.x && defender.y === defCapital.y) defPower += 5;
  }
  const defTile = state.tiles[defender.y]?.[defender.x];
  if (defTile && defTile.cityId >= 0) { const city = getCity(state, defTile.cityId); if (city) defPower += city.defense * 0.5; }
  if (defTile && defTile.cityId >= 0 && aDef?.siegeBonus) atkPower *= aDef.siegeBonus;
  atkPower *= (attacker.hp / attacker.maxHp);
  defPower *= (defender.hp / defender.maxHp);

  let aDmgTotal = 0, dDmgTotal = 0;
  // Ranged first strike — ranged units deal damage before melee
  const aUnitDef = CIV_UNIT_DEFS[attacker.type];
  const dUnitDef = CIV_UNIT_DEFS[defender.type];
  if (aUnitDef?.ranged) {
    const rangedDmg = Math.max(1, Math.round(atkPower * (0.75 + Math.random() * 0.5)));
    defender.hp -= rangedDmg;
    dDmgTotal += rangedDmg;
    if (defender.hp <= 0) {
      // Ranged kill — attacker doesn't take damage
      const attackerSurvived = true;
      const defenderSurvived = false;
      awardXP(attacker, 3);
      addEvent(state, attacker.owner, `Our ${aUnitDef.name} destroyed enemy ${dUnitDef?.name ?? "unit"} at range!`);
      removeUnit(state, defenderId);
      return { winner: "attacker", attackerDamage: 0, defenderDamage: dDmgTotal, attackerSurvived, defenderSurvived };
    }
    // Ranged unit doesn't engage in melee — no counter damage
    awardXP(attacker, 2);
    awardXP(defender, 1);
    return { winner: "attacker", attackerDamage: 0, defenderDamage: dDmgTotal, attackerSurvived: true, defenderSurvived: true };
  }
  const rng = () => 0.5 + Math.random() * 1.0;
  for (let round = 0; round < 5; round++) {
    const aDmg = Math.max(1, Math.round(atkPower * rng() - defPower * 0.3));
    const dDmg = Math.max(1, Math.round(defPower * rng() - atkPower * 0.3));
    defender.hp -= aDmg; attacker.hp -= dDmg;
    aDmgTotal += dDmg; dDmgTotal += aDmg;
    if (attacker.hp <= 0 || defender.hp <= 0) break;
  }

  const attackerSurvived = attacker.hp > 0;
  const defenderSurvived = defender.hp > 0;
  const winner = defenderSurvived && !attackerSurvived ? "defender" : "attacker";
  if (attackerSurvived) awardXP(attacker, 3);
  if (defenderSurvived) awardXP(defender, 2);
  const dName = CIV_UNIT_DEFS[defender.type]?.name ?? "unit";
  const aName = CIV_UNIT_DEFS[attacker.type]?.name ?? "unit";
  if (!attackerSurvived) { addEvent(state, defender.owner, `Defenders destroyed enemy ${aName}!`); removeUnit(state, attackerId); }
  if (!defenderSurvived) { addEvent(state, attacker.owner, `Our ${aName} destroyed enemy ${dName}!`); removeUnit(state, defenderId); if (attackerSurvived) moveUnitTo(state, attackerId, defender.x, defender.y); }

  // Check for city capture
  if (attackerSurvived) {
    const captureTile = state.tiles[defender.y]?.[defender.x];
    if (captureTile && captureTile.cityId >= 0) {
      const capturedCity = getCity(state, captureTile.cityId);
      if (capturedCity && capturedCity.owner !== attacker.owner) {
        // Check no more defenders in this city
        const remainingDefenders = captureTile.unitIds.filter(uid => {
          const u = getUnit(state, uid);
          return u && u.owner === capturedCity.owner;
        });
        if (remainingDefenders.length === 0) {
          captureCity(state, capturedCity.id, attacker.owner);
        }
      }
    }
  }

  return { winner, attackerDamage: aDmgTotal, defenderDamage: dDmgTotal, attackerSurvived, defenderSurvived };
}

function awardXP(unit: CivUnit, amount: number): void {
  unit.experience += amount;
  while (unit.level < MAX_LEVEL && unit.experience >= XP_PER_LEVEL * (unit.level + 1)) {
    unit.experience -= XP_PER_LEVEL * (unit.level + 1);
    unit.level++; unit.maxHp += 2; unit.hp = Math.min(unit.hp + 2, unit.maxHp);
    unit.attack++; unit.defense++;
    unit.pendingPromotion = true;
  }
}

export function captureCity(state: CivGameState, cityId: number, newOwner: number): void {
  const city = getCity(state, cityId);
  if (!city) return;
  const oldOwner = city.owner;

  // Remove from old owner
  const oldPlayer = state.players[oldOwner];
  if (oldPlayer) {
    oldPlayer.cityIds = oldPlayer.cityIds.filter(id => id !== cityId);
  }

  // Transfer to new owner
  const newPlayer = state.players[newOwner];
  city.owner = newOwner;
  newPlayer.cityIds.push(cityId);

  // Transfer tile ownership
  for (const t of city.tiles) {
    const tile = state.tiles[t.y]?.[t.x];
    if (tile && tile.owner === oldOwner) tile.owner = newOwner;
  }
  const mainTile = state.tiles[city.y]?.[city.x];
  if (mainTile) mainTile.owner = newOwner;

  // Population loss from conquest
  city.population = Math.max(1, Math.floor(city.population * 0.7));
  city.happiness -= 5; // conquered people are unhappy
  city.buildQueue = [];
  city.productionAccum = 0;

  // No longer capital if it was
  if (city.isCapital) {
    city.isCapital = false;
    // Assign new capital to old owner if they have cities
    const remainingCities = state.cities.filter(c => c.owner === oldOwner);
    if (remainingCities.length > 0) remainingCities[0].isCapital = true;
  }

  addEvent(state, newOwner, `${newPlayer.factionDef.name} captures ${city.name}!`);
  addEvent(state, oldOwner, `${city.name} has fallen to ${newPlayer.factionDef.name}!`);
}

// ── Fog of war ─────────────────────────────────────────────────────────────

export function revealArea(state: CivGameState, playerIndex: number, cx: number, cy: number, radius: number): void {
  const vis = state.visibility[playerIndex];
  if (!vis) return;
  for (let y = Math.max(0, cy - radius); y <= Math.min(state.mapHeight - 1, cy + radius); y++) {
    for (let x = Math.max(0, cx - radius); x <= Math.min(state.mapWidth - 1, cx + radius); x++) {
      if (hexDistance(cx, cy, x, y) <= radius) vis[y][x] = 2;
    }
  }
}

export function updateFogOfWar(state: CivGameState, playerIndex: number): void {
  const vis = state.visibility[playerIndex];
  if (!vis) return;
  for (let y = 0; y < state.mapHeight; y++) for (let x = 0; x < state.mapWidth; x++) { if (vis[y][x] === 2) vis[y][x] = 1; }
  const player = state.players[playerIndex];
  for (const uid of player.unitIds) { const u = getUnit(state, uid); if (u) revealArea(state, playerIndex, u.x, u.y, 2); }
  for (const cid of player.cityIds) { const c = getCity(state, cid); if (c) revealArea(state, playerIndex, c.x, c.y, 3); }
}

// ── Pathfinding ────────────────────────────────────────────────────────────

export function findPath(state: CivGameState, unit: CivUnit, endX: number, endY: number): { x: number; y: number }[] | null {
  if (unit.x === endX && unit.y === endY) return [];
  const key = (x: number, y: number) => `${x},${y}`;
  const open: { x: number; y: number; g: number; f: number }[] = [{ x: unit.x, y: unit.y, g: 0, f: hexDistance(unit.x, unit.y, endX, endY) }];
  const cameFrom = new Map<string, { x: number; y: number }>();
  const gScore = new Map<string, number>();
  gScore.set(key(unit.x, unit.y), 0);
  while (open.length > 0) {
    open.sort((a, b) => a.f - b.f);
    const current = open.shift()!;
    if (current.x === endX && current.y === endY) {
      const path: { x: number; y: number }[] = [];
      let k = key(endX, endY);
      while (cameFrom.has(k)) { const p = k.split(",").map(Number); path.unshift({ x: p[0], y: p[1] }); const prev = cameFrom.get(k)!; k = key(prev.x, prev.y); }
      return path;
    }
    for (const n of getNeighbors(current.x, current.y, state.mapWidth, state.mapHeight)) {
      const terrain = TERRAIN_TYPES[state.tiles[n.y]?.[n.x]?.terrain ?? "ocean"];
      if (!terrain || !terrain.passable) continue;
      const cost = terrain.moveCost;
      const tile = state.tiles[n.y][n.x];
      const hasEnemy = tile.unitIds.some(uid => { const u = getUnit(state, uid); return u && u.owner !== unit.owner; });
      if (hasEnemy && !(n.x === endX && n.y === endY)) continue;
      const tentG = (gScore.get(key(current.x, current.y)) ?? Infinity) + cost;
      const nk = key(n.x, n.y);
      if (tentG < (gScore.get(nk) ?? Infinity)) {
        cameFrom.set(nk, { x: current.x, y: current.y }); gScore.set(nk, tentG);
        if (!open.some(o => o.x === n.x && o.y === n.y)) open.push({ x: n.x, y: n.y, g: tentG, f: tentG + hexDistance(n.x, n.y, endX, endY) });
      }
    }
  }
  return null;
}

export function getReachableTiles(state: CivGameState, unit: CivUnit): { x: number; y: number }[] {
  const result: { x: number; y: number }[] = [];
  const visited = new Set<string>();
  const queue: { x: number; y: number; remaining: number }[] = [{ x: unit.x, y: unit.y, remaining: unit.movement }];
  visited.add(`${unit.x},${unit.y}`);
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const n of getNeighbors(cur.x, cur.y, state.mapWidth, state.mapHeight)) {
      const k = `${n.x},${n.y}`;
      if (visited.has(k)) continue;
      const terrain = TERRAIN_TYPES[state.tiles[n.y]?.[n.x]?.terrain ?? "ocean"];
      if (!terrain || !terrain.passable) continue;
      const cost = terrain.moveCost;
      if (cost > cur.remaining) continue;
      const tile = state.tiles[n.y][n.x];
      if (tile.unitIds.some(uid => { const u = getUnit(state, uid); return u && u.owner !== unit.owner; })) continue;
      visited.add(k); result.push({ x: n.x, y: n.y });
      queue.push({ x: n.x, y: n.y, remaining: cur.remaining - cost });
    }
  }
  return result;
}

export function getAttackableTiles(state: CivGameState, unit: CivUnit): { x: number; y: number }[] {
  if (unit.movement <= 0) return [];
  return getNeighbors(unit.x, unit.y, state.mapWidth, state.mapHeight).filter(n => {
    const tile = state.tiles[n.y]?.[n.x];
    if (!tile) return false;
    return tile.unitIds.some(uid => { const u = getUnit(state, uid); return u && u.owner !== unit.owner; })
      || (tile.cityId >= 0 && (() => { const city = getCity(state, tile.cityId); return city && city.owner !== unit.owner; })());
  });
}

// ── Diplomacy ──────────────────────────────────────────────────────────────

export function getDiplomacy(state: CivGameState, a: number, b: number): DiplomacyEntry | undefined {
  return state.players[a]?.diplomacy.find(d => d.targetPlayer === b);
}

export function setDiplomacyRelation(state: CivGameState, a: number, b: number, rel: DiplRelation): void {
  const dAB = getDiplomacy(state, a, b), dBA = getDiplomacy(state, b, a);
  if (dAB) {
    if (dAB.relation === "peace" && rel === "war") state.players[a].chivalry -= 10;
    if (dAB.relation === "alliance" && rel === "war") state.players[a].chivalry -= 25;
    dAB.relation = rel;
    if (rel === "war") { dAB.turnsAtWar = 0; dAB.turnsAtPeace = 0; } else dAB.turnsAtPeace = 0;
  }
  if (dBA) { dBA.relation = rel; if (rel === "war") { dBA.turnsAtWar = 0; dBA.turnsAtPeace = 0; } else dBA.turnsAtPeace = 0; }
  const nameA = state.players[a].factionDef.name, nameB = state.players[b].factionDef.name;
  if (rel === "war") addEvent(state, a, `${nameA} declares war on ${nameB}!`);
  if (rel === "peace") addEvent(state, a, `${nameA} makes peace with ${nameB}.`);
  if (rel === "alliance") addEvent(state, a, `${nameA} allies with ${nameB}!`);
}

export function isAtWar(state: CivGameState, a: number, b: number): boolean {
  return getDiplomacy(state, a, b)?.relation === "war";
}

export function tradeGold(state: CivGameState, from: number, to: number, amount: number): boolean {
  const fromP = state.players[from];
  const toP = state.players[to];
  if (!fromP || !toP || fromP.gold < amount || amount <= 0) return false;
  fromP.gold -= amount;
  toP.gold += amount;
  addEvent(state, from, `Sent ${amount} gold to ${toP.factionDef.name}.`);
  addEvent(state, to, `Received ${amount} gold from ${fromP.factionDef.name}.`);
  // Improve relations
  const dip = getDiplomacy(state, to, from);
  if (dip) dip.attitude = Math.min(100, dip.attitude + Math.floor(amount / 10));
  return true;
}

// ── Hero recruitment ──────────────────────────────────────────────────────

export function getAvailableHeroes(state: CivGameState, playerIndex: number): string[] {
  const player = state.players[playerIndex];
  const recruited = new Set<string>();
  for (const u of state.units) {
    if (u.isHero && u.heroId) recruited.add(u.heroId);
  }
  return Object.keys(CIV_HEROES).filter(hid => {
    if (recruited.has(hid)) return false;
    const hero = CIV_HEROES[hid];
    // Faction-specific heroes only for their faction (or null = anyone)
    if (hero.faction && hero.faction !== player.faction) return false;
    // Must have at least one city
    if (player.cityIds.length === 0) return false;
    return true;
  });
}

export function recruitHero(state: CivGameState, playerIndex: number, heroId: string): CivUnit | null {
  const player = state.players[playerIndex];
  const hero = CIV_HEROES[heroId];
  if (!hero) return null;
  if (player.cityIds.length === 0) return null;
  // Cost: 100 gold
  if (player.gold < 100) return null;
  player.gold -= 100;
  // Spawn at capital
  const capital = state.cities.find(c => c.owner === playerIndex && c.isCapital);
  if (!capital) return null;
  const unit = addUnit(state, playerIndex, "warband", capital.x, capital.y, heroId);
  player.heroes.push(unit.id);
  addEvent(state, playerIndex, `${hero.name} has joined ${player.factionDef.name}!`);
  return unit;
}

// ── Events ─────────────────────────────────────────────────────────────────

export function addEvent(state: CivGameState, player: number, message: string): void {
  state.events.push({ turn: state.turn, type: "info", message, player });
  if (state.events.length > 100) state.events.shift();
}

export function triggerGoldenAge(state: CivGameState, playerIndex: number, turns: number = 10): void {
  const player = state.players[playerIndex];
  if (!player) return;
  player.goldenAgeTurns = turns;
  addEvent(state, playerIndex, `${player.factionDef.name} enters a GOLDEN AGE! (+50% production for ${turns} turns)`);
}

export function autoExploreUnit(state: CivGameState, unit: CivUnit): void {
  if (unit.movement <= 0) return;
  // Find the nearest unexplored tile visible from our position
  const vis = state.visibility[unit.owner];
  if (!vis) return;
  let bestTile: { x: number; y: number } | null = null;
  let bestDist = 999;
  // Search in expanding rings
  for (let r = 1; r <= 8; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const tx = unit.x + dx, ty = unit.y + dy;
        if (tx < 0 || tx >= state.mapWidth || ty < 0 || ty >= state.mapHeight) continue;
        if (vis[ty][tx] !== 0) continue; // already explored
        const terrain = TERRAIN_TYPES[state.tiles[ty][tx].terrain];
        if (!terrain?.passable) continue;
        const d = hexDistance(unit.x, unit.y, tx, ty);
        if (d < bestDist) { bestDist = d; bestTile = { x: tx, y: ty }; }
      }
    }
    if (bestTile) break;
  }
  if (!bestTile) return;
  const target = bestTile!;
  const path = findPath(state, unit, target.x, target.y);
  if (path && path.length > 0) {
    for (const step of path) {
      if (unit.movement <= 0) break;
      moveUnitTo(state, unit.id, step.x, step.y);
    }
  }
}

// ── Victory ────────────────────────────────────────────────────────────────

export function checkVictory(state: CivGameState): { winner: number; type: string } | null {
  const alive = state.players.filter(p => p.alive && p.cityIds.length > 0);
  if (alive.length === 1) return { winner: alive[0].index, type: "conquest" };
  for (const p of state.players) { if (p.wonders.includes("holy_grail")) return { winner: p.index, type: "grail" }; }
  for (const p of state.players) {
    if (!p.alive || p.cityIds.length === 0) continue;
    const allAllied = state.players.every(o => o.index === p.index || !o.alive || o.cityIds.length === 0 || getDiplomacy(state, p.index, o.index)?.relation === "alliance");
    if (allAllied && alive.length > 1) return { winner: p.index, type: "round_table" };
  }
  // Survival victory at turn 200
  if (state.turn >= 200) {
    let bestPlayer = state.players[0];
    for (const p of state.players) {
      if (p.alive && p.score > bestPlayer.score) bestPlayer = p;
    }
    return { winner: bestPlayer.index, type: "survival" };
  }
  return null;
}

// ── Turn processing ────────────────────────────────────────────────────────

export function applyWonderEffects(state: CivGameState, player: CivPlayer): void {
  for (const wid of player.wonders) {
    const w = CIV_WONDERS[wid];
    if (!w) continue;
    // Global effects per wonder
    switch (wid) {
      case "excalibur":
        // +3 attack to all units — applied during combat already via effects
        break;
      case "great_library_of_camelot":
        // +5 research per turn bonus
        player.researchAccum += 5;
        break;
      case "the_round_table":
        // +5 culture/turn to capital, +2 happiness all cities
        for (const cid of player.cityIds) {
          const city = getCity(state, cid);
          if (city) city.happiness += 2;
        }
        break;
      case "sword_in_the_stone":
        // +3 happiness everywhere
        for (const cid of player.cityIds) {
          const city = getCity(state, cid);
          if (city) city.happiness += 3;
        }
        break;
      case "stonehenge":
        // +3 research per turn
        player.researchAccum += 3;
        break;
      case "avalon":
        // Heal all units by 2 each turn
        for (const uid of player.unitIds) {
          const u = getUnit(state, uid);
          if (u) u.hp = Math.min(u.maxHp, u.hp + 2);
        }
        break;
      case "tintagel_castle":
        // +5 defense to capital — applied during combat
        break;
      case "the_holy_grail":
        // +10 happiness everywhere (game winning)
        for (const cid of player.cityIds) {
          const city = getCity(state, cid);
          if (city) city.happiness += 10;
        }
        break;
    }
  }
}

export function processEndTurn(state: CivGameState, playerIndex: number): void {
  const player = state.players[playerIndex];
  if (!player || !player.alive) return;
  player.goldPerTurn = 0; player.researchPerTurn = 0;
  for (const cid of player.cityIds) { const city = getCity(state, cid); if (city) processCityTurn(state, city); }
  applyWonderEffects(state, player);
  for (const cid of player.cityIds) { const city = getCity(state, cid); if (city) { player.goldPerTurn += city.gold; player.researchPerTurn += city.research; } }
  for (const uid of player.unitIds) { const u = getUnit(state, uid); if (u) { const def = CIV_UNIT_DEFS[u.type]; if (def) player.gold -= def.maintenance; } }
  // Gold deficit penalty
  if (player.gold < 0) {
    // Disband most expensive unit
    let worstUnit: CivUnit | null = null;
    let worstCost = 0;
    for (const uid of [...player.unitIds]) {
      const u = getUnit(state, uid);
      if (u && !u.isHero) {
        const def = CIV_UNIT_DEFS[u.type];
        if (def && def.maintenance > worstCost) { worstCost = def.maintenance; worstUnit = u; }
      }
    }
    if (worstUnit) {
      addEvent(state, playerIndex, `${player.factionDef.name} cannot pay their troops! A ${CIV_UNIT_DEFS[worstUnit.type]?.name ?? "unit"} deserts.`);
      removeUnit(state, worstUnit.id);
      player.gold += worstCost * 5; // recover some gold
    }
  }
  processResearch(state, player);
  if (player.goldenAgeTurns > 0) {
    player.goldenAgeTurns--;
    if (player.goldenAgeTurns === 0) addEvent(state, playerIndex, `${player.factionDef.name}'s Golden Age has ended.`);
  }
  // Trigger golden age on high chivalry
  if (player.goldenAgeTurns === 0 && player.chivalry >= 80 && player.techs.length >= 4) {
    if (Math.random() < 0.1) triggerGoldenAge(state, playerIndex, 8);
  }
  for (const uid of player.unitIds) {
    const u = getUnit(state, uid); if (!u) continue;
    u.movement = u.maxMovement;
    const tile = state.tiles[u.y]?.[u.x];
    if (tile && tile.owner === playerIndex) { u.hp = Math.min(u.maxHp, u.hp + (tile.cityId >= 0 ? HEAL_IN_CITY : HEAL_PER_TURN)); }
    else if (u.fortified) u.hp = Math.min(u.maxHp, u.hp + 1);
    // Worker improvement progress
    if (u.improvementTarget && u.improvementProgress > 0) {
      u.improvementProgress--;
      u.movement = 0; // worker stays busy
      if (u.improvementProgress <= 0) {
        _placeImprovement(state, u.x, u.y, u.improvementTarget);
        addEvent(state, playerIndex, `Worker completed ${u.improvementTarget.replace("_", " ")}!`);
        u.improvementTarget = null;
      }
    }
  }
  for (const d of player.diplomacy) { if (d.relation === "war") d.turnsAtWar++; else d.turnsAtPeace++; }
  // Cancel trade routes with enemies
  for (const cid of player.cityIds) {
    const city2 = getCity(state, cid);
    if (!city2) continue;
    city2.tradeRoutes = city2.tradeRoutes.filter(rid => {
      const partner = getCity(state, rid);
      return partner && !isAtWar(state, playerIndex, partner.owner);
    });
  }
  updateFogOfWar(state, playerIndex);
  player.score = player.cityIds.length * 100 + player.techs.length * 20 + player.wonders.length * 150
    + player.unitIds.length * 5 + Math.floor(player.gold) + player.chivalry * 2 + player.heroes.length * 50;
  if (player.cityIds.length === 0 && !player.unitIds.some(uid => { const u = getUnit(state, uid); return u && CIV_UNIT_DEFS[u.type]?.canFoundCity; })) {
    player.alive = false; addEvent(state, playerIndex, `${player.factionDef.name} eliminated!`);
  }
}

export function spawnBarbarians(state: CivGameState): void {
  state.barbarianSpawnTimer++;
  if (state.barbarianSpawnTimer < 5) return; // spawn every 5 turns
  state.barbarianSpawnTimer = 0;

  // Find random unclaimed land tile far from cities
  let attempts = 0;
  while (attempts < 50) {
    attempts++;
    const rx = Math.floor(Math.random() * state.mapWidth);
    const ry = Math.floor(Math.random() * state.mapHeight);
    const tile = state.tiles[ry]?.[rx];
    if (!tile) continue;
    const terrain = TERRAIN_TYPES[tile.terrain];
    if (!terrain?.passable) continue;
    if (tile.owner >= 0) continue;
    if (tile.cityId >= 0) continue;
    // Must be far from all cities
    let tooClose = false;
    for (const city of state.cities) {
      if (hexDistance(rx, ry, city.x, city.y) < 5) { tooClose = true; break; }
    }
    if (tooClose) continue;

    // Find or ensure barbarian player exists
    let barbIdx = state.players.findIndex(p => p.faction === "barbarian");
    if (barbIdx < 0) {
      barbIdx = state.players.length;
      state.players.push({
        index: barbIdx,
        faction: "barbarian",
        factionDef: { id: "barbarian", name: "Barbarians", leader: "None", color: 0x666666, bonuses: { attackBonus: 0, defenseBonus: 0, goldBonus: 0, researchBonus: 0, movementBonus: 0, growthBonus: 0 }, uniqueUnit: "", description: "Wild raiders.", aiPersonality: "aggressive", cityNames: [] },
        isHuman: false, gold: 0, goldPerTurn: 0, researchPerTurn: 0, researchAccum: 0,
        currentTech: null, techs: [], wonders: [], heroes: [], chivalry: 0,
        cityIds: [], unitIds: [], alive: true, diplomacy: [], score: 0, taxRate: 0, cityNameIndex: 0, goldenAgeTurns: 0,
      });
      // Set all players at war with barbarians
      for (let i = 0; i < state.players.length - 1; i++) {
        state.players[i].diplomacy.push({ targetPlayer: barbIdx, relation: "war", attitude: -100, turnsAtWar: 999, turnsAtPeace: 0 });
        state.players[barbIdx].diplomacy.push({ targetPlayer: i, relation: "war", attitude: -100, turnsAtWar: 999, turnsAtPeace: 0 });
      }
      // Add visibility array for barbarian player
      const vis: number[][] = [];
      for (let y = 0; y < state.mapHeight; y++) { vis[y] = []; for (let x = 0; x < state.mapWidth; x++) vis[y][x] = 2; }
      state.visibility.push(vis);
    }

    // Spawn unit
    const unitType = state.turn < 20 ? "warband" : (state.turn < 40 ? "man_at_arms" : "knight");
    addUnit(state, barbIdx, unitType, rx, ry);
    break;
  }
}

function moveBarbarians(state: CivGameState): void {
  const barbIdx = state.players.findIndex(p => p.faction === "barbarian");
  if (barbIdx < 0) return;
  const barbPlayer = state.players[barbIdx];

  for (const uid of [...barbPlayer.unitIds]) {
    const unit = getUnit(state, uid);
    if (!unit || unit.movement <= 0) continue;

    // Reset movement for this turn
    unit.movement = unit.maxMovement;

    // Find nearest enemy unit or city within 8 tiles
    let bestTarget: { x: number; y: number } | null = null;
    let bestDist = 999;

    // Check cities
    for (const city of state.cities) {
      if (city.owner === barbIdx) continue;
      const d = hexDistance(unit.x, unit.y, city.x, city.y);
      if (d < bestDist) { bestDist = d; bestTarget = { x: city.x, y: city.y }; }
    }

    // Check enemy units (prefer closer ones)
    for (const other of state.units) {
      if (other.owner === barbIdx) continue;
      const d = hexDistance(unit.x, unit.y, other.x, other.y);
      if (d < bestDist && d <= 8) { bestDist = d; bestTarget = { x: other.x, y: other.y }; }
    }

    if (!bestTarget) {
      // Wander randomly
      const neighbors = getNeighbors(unit.x, unit.y, state.mapWidth, state.mapHeight);
      const passable = neighbors.filter(n => TERRAIN_TYPES[state.tiles[n.y]?.[n.x]?.terrain ?? ""]?.passable);
      if (passable.length > 0) {
        const pick = passable[Math.floor(Math.random() * passable.length)];
        moveUnitTo(state, unit.id, pick.x, pick.y);
      }
      continue;
    }

    // Try to attack adjacent enemy
    const attackable = getAttackableTiles(state, unit);
    if (attackable.length > 0) {
      const target = attackable[0];
      const tile = state.tiles[target.y]?.[target.x];
      const enemyId = tile?.unitIds.find(uid2 => {
        const u = getUnit(state, uid2);
        return u && u.owner !== barbIdx;
      });
      if (enemyId !== undefined) {
        resolveCombat(state, unit.id, enemyId);
        continue;
      }
    }

    // Move toward target
    const path = findPath(state, unit, bestTarget.x, bestTarget.y);
    if (path && path.length > 0) {
      const step = path[0];
      moveUnitTo(state, unit.id, step.x, step.y);
    }
  }
}

export function checkMordredRebellion(state: CivGameState): boolean {
  // Triggers after turn 50 when a player has 5+ cities and chivalry < 30
  if (state.turn < 50) return false;

  for (let pi = 0; pi < state.players.length; pi++) {
    const player = state.players[pi];
    if (!player.alive || player.cityIds.length < 5) continue;
    if (player.chivalry >= 30) continue;

    // 5% chance per turn once conditions are met
    if (Math.random() > 0.05) continue;

    // Check if Mordred is already in play
    const mordredExists = state.units.some(u => u.heroId === "mordred");
    if (mordredExists) continue;

    // Rebellion! Mordred spawns with rebel army near the capital
    const capital = state.cities.find(c => c.owner === pi && c.isCapital);
    if (!capital) continue;

    // Find a spot near capital
    const neighbors = getNeighbors(capital.x, capital.y, state.mapWidth, state.mapHeight);
    const spot = neighbors.find(n => {
      const t = TERRAIN_TYPES[state.tiles[n.y]?.[n.x]?.terrain ?? ""];
      return t?.passable && state.tiles[n.y][n.x].unitIds.length === 0;
    });
    if (!spot) continue;

    // Create rebel faction or use barbarian player
    let rebelIdx = state.players.findIndex(p => p.faction === "barbarian");
    if (rebelIdx < 0) rebelIdx = 0; // fallback

    // Spawn Mordred + rebel units
    addUnit(state, rebelIdx, "knight", spot.x, spot.y, "mordred");
    addUnit(state, rebelIdx, "knight", spot.x, spot.y);
    addUnit(state, rebelIdx, "man_at_arms", spot.x, spot.y);
    addUnit(state, rebelIdx, "man_at_arms", spot.x, spot.y);

    addEvent(state, pi, `MORDRED'S REBELLION! The traitor raises an army near ${capital.name}!`);

    // Chivalry hit
    player.chivalry -= 15;

    return true;
  }
  return false;
}

export function advanceTurn(state: CivGameState): void {
  state.currentPlayer = 0; state.turn++;
  spawnBarbarians(state);
  // Move barbarian units toward nearest non-barbarian unit or city
  moveBarbarians(state);
  checkMordredRebellion(state);
  updateFogOfWar(state, state.humanPlayerIndex);
  const vic = checkVictory(state);
  if (vic) { state.victoryType = vic.type; state.phase = vic.winner === state.humanPlayerIndex ? "victory" : "defeat"; }
}

// ── Hero Abilities ────────────────────────────────────────────────────────

export type AbilityResult = { success: boolean; message: string };

export function useHeroAbility(state: CivGameState, unitId: number, abilityName: string): AbilityResult {
  const unit = getUnit(state, unitId);
  if (!unit || !unit.isHero || !unit.heroId) return { success: false, message: "Not a hero." };
  const hero = CIV_HEROES[unit.heroId];
  if (!hero || !hero.abilities.includes(abilityName)) return { success: false, message: "Hero doesn't have this ability." };
  if (unit.movement <= 0) return { success: false, message: "No movement points remaining." };

  switch (abilityName) {
    case "teleport": {
      // Merlin: teleport to any owned city
      const cities = state.cities.filter(c => c.owner === unit.owner);
      if (cities.length === 0) return { success: false, message: "No cities to teleport to." };
      const target = cities[Math.floor(Math.random() * cities.length)];
      const oldTile = state.tiles[unit.y]?.[unit.x];
      if (oldTile) oldTile.unitIds = oldTile.unitIds.filter(id => id !== unitId);
      unit.x = target.x; unit.y = target.y;
      const newTile = state.tiles[target.y]?.[target.x];
      if (newTile) newTile.unitIds.push(unitId);
      unit.movement = 0;
      revealArea(state, unit.owner, target.x, target.y, 3);
      return { success: true, message: `${hero.name} teleports to ${target.name}!` };
    }
    case "healing": {
      // Guinevere/Morgana: heal all friendly units in 2-tile radius by 5 HP
      let healed = 0;
      for (const uid of state.players[unit.owner].unitIds) {
        const u = getUnit(state, uid);
        if (u && u.hp < u.maxHp && hexDistance(unit.x, unit.y, u.x, u.y) <= 2) {
          u.hp = Math.min(u.maxHp, u.hp + 5);
          healed++;
        }
      }
      unit.movement = 0;
      return { success: true, message: `${hero.name} heals ${healed} nearby units!` };
    }
    case "inspire": {
      // Guinevere/Lancelot: +2 attack to all units within 2 tiles for this turn
      let inspired = 0;
      for (const uid of state.players[unit.owner].unitIds) {
        const u = getUnit(state, uid);
        if (u && u.id !== unitId && hexDistance(unit.x, unit.y, u.x, u.y) <= 2) {
          u.attack += 2; // temporary — ideally tracked, but simple boost works
          inspired++;
        }
      }
      unit.movement = 0;
      return { success: true, message: `${hero.name} inspires ${inspired} nearby warriors!` };
    }
    case "charge": {
      // Lancelot: deal double damage on next attack (set a flag)
      unit.attack *= 2;
      unit.movement = Math.max(1, unit.movement); // keep 1 movement for the attack
      return { success: true, message: `${hero.name} charges! Double damage on next attack!` };
    }
    case "prophecy": {
      // Merlin: reveal large area
      revealArea(state, unit.owner, unit.x, unit.y, 8);
      unit.movement = 0;
      return { success: true, message: `${hero.name} reveals the land with prophetic vision!` };
    }
    case "lightning": {
      // Merlin: deal 8 damage to strongest enemy unit within 3 tiles
      let bestTarget: CivUnit | null = null;
      let bestHp = 0;
      for (const u of state.units) {
        if (u.owner !== unit.owner && hexDistance(unit.x, unit.y, u.x, u.y) <= 3) {
          if (u.hp > bestHp) { bestHp = u.hp; bestTarget = u; }
        }
      }
      if (bestTarget) {
        bestTarget.hp -= 8;
        if (bestTarget.hp <= 0) {
          addEvent(state, unit.owner, `${hero.name}'s lightning destroys ${CIV_UNIT_DEFS[bestTarget.type]?.name ?? "unit"}!`);
          removeUnit(state, bestTarget.id);
        } else {
          addEvent(state, unit.owner, `${hero.name}'s lightning strikes for 8 damage!`);
        }
      }
      unit.movement = 0;
      return { success: true, message: bestTarget ? `Lightning strikes!` : `No enemies in range.` };
    }
    case "curse": {
      // Morgana: reduce all enemy units within 2 tiles defense by 3
      let cursed = 0;
      for (const u of state.units) {
        if (u.owner !== unit.owner && hexDistance(unit.x, unit.y, u.x, u.y) <= 2) {
          u.defense = Math.max(0, u.defense - 3);
          cursed++;
        }
      }
      unit.movement = 0;
      return { success: true, message: `${hero.name} curses ${cursed} enemies!` };
    }
    case "stealth": {
      // Tristan: become invisible (hide from fog detection for 3 turns)
      // Simplified: move 3 extra tiles this turn
      unit.movement += 3;
      return { success: true, message: `${hero.name} moves unseen through shadows!` };
    }
    default:
      return { success: false, message: `Ability ${abilityName} not yet implemented.` };
  }
}

// ── Unit Promotions ───────────────────────────────────────────────────────

export type PromotionId = "combat1" | "combat2" | "combat3" | "medic" | "march" | "sentry" | "charge" | "cover" | "shock";

export const PROMOTIONS: Record<string, { name: string; description: string; effect: { attack?: number; defense?: number; movement?: number; hp?: number } }> = {
  combat1: { name: "Combat I", description: "+1 Attack", effect: { attack: 1 } },
  combat2: { name: "Combat II", description: "+1 Attack, +1 Defense", effect: { attack: 1, defense: 1 } },
  combat3: { name: "Combat III", description: "+2 Attack", effect: { attack: 2 } },
  medic: { name: "Medic", description: "Heals 3 HP/turn to adjacent friendly", effect: { hp: 3 } },
  march: { name: "March", description: "+1 Movement", effect: { movement: 1 } },
  sentry: { name: "Sentry", description: "+2 Defense", effect: { defense: 2 } },
  charge: { name: "Charge", description: "+2 Attack on first strike", effect: { attack: 2 } },
  cover: { name: "Cover", description: "+3 Defense vs ranged", effect: { defense: 3 } },
  shock: { name: "Shock", description: "+2 Attack vs fortified", effect: { attack: 2 } },
};

export function getAvailablePromotions(unit: CivUnit): string[] {
  if (!unit.promotions) return [];
  const available: string[] = [];
  // Combat tree
  if (!unit.promotions.includes("combat1")) available.push("combat1");
  else if (!unit.promotions.includes("combat2")) available.push("combat2");
  else if (!unit.promotions.includes("combat3")) available.push("combat3");
  // Utility
  if (!unit.promotions.includes("march")) available.push("march");
  if (!unit.promotions.includes("sentry")) available.push("sentry");
  if (!unit.promotions.includes("medic")) available.push("medic");
  return available.slice(0, 3); // max 3 choices
}

export function applyPromotion(unit: CivUnit, promoId: string): boolean {
  const promo = PROMOTIONS[promoId];
  if (!promo) return false;
  if (!unit.promotions) unit.promotions = [];
  if (unit.promotions.includes(promoId)) return false;
  unit.promotions.push(promoId);
  if (promo.effect.attack) unit.attack += promo.effect.attack;
  if (promo.effect.defense) unit.defense += promo.effect.defense;
  if (promo.effect.movement) { unit.movement += promo.effect.movement; unit.maxMovement += promo.effect.movement; }
  if (promo.effect.hp) { unit.maxHp += promo.effect.hp; unit.hp += promo.effect.hp; }
  return true;
}

// ── Espionage ──────────────────────────────────────────────────────────────

export function stealTech(state: CivGameState, spyUnitId: number, targetPlayer: number): { success: boolean; message: string } {
  const spy = getUnit(state, spyUnitId);
  if (!spy || spy.type !== "spy") return { success: false, message: "Not a spy unit." };
  if (spy.movement <= 0) return { success: false, message: "No movement remaining." };

  // Must be adjacent to or inside enemy territory
  const tile = state.tiles[spy.y]?.[spy.x];
  if (!tile || tile.owner !== targetPlayer) {
    // Check if adjacent to their territory
    const adj = getNeighbors(spy.x, spy.y, state.mapWidth, state.mapHeight);
    const inRange = adj.some(n => state.tiles[n.y]?.[n.x]?.owner === targetPlayer);
    if (!inRange) return { success: false, message: "Must be in or adjacent to enemy territory." };
  }

  spy.movement = 0;

  // 40% base chance, modified by level
  const chance = 0.4 + spy.level * 0.1;
  if (Math.random() > chance) {
    // Failed — spy might be caught (30% chance of death)
    if (Math.random() < 0.3) {
      addEvent(state, spy.owner, `Our spy was caught and executed by ${state.players[targetPlayer].factionDef.name}!`);
      removeUnit(state, spyUnitId);
      return { success: false, message: "Spy caught and executed!" };
    }
    return { success: false, message: "Espionage failed. Spy escaped undetected." };
  }

  // Success — steal a random tech the target has that we don't
  const ourPlayer = state.players[spy.owner];
  const theirPlayer = state.players[targetPlayer];
  const stealable = theirPlayer.techs.filter(t => !ourPlayer.techs.includes(t));

  if (stealable.length === 0) return { success: true, message: "Nothing to steal — they know nothing we don't." };

  const stolen = stealable[Math.floor(Math.random() * stealable.length)];
  ourPlayer.techs.push(stolen);
  const techName = CIV_TECH_TREE[stolen]?.name ?? stolen;
  addEvent(state, spy.owner, `Our spy stole the secret of ${techName}!`);

  // Chivalry penalty for espionage
  ourPlayer.chivalry = Math.max(-100, ourPlayer.chivalry - 5);

  return { success: true, message: `Stole technology: ${techName}!` };
}

export function sabotageCity(state: CivGameState, spyUnitId: number, targetCityId: number): { success: boolean; message: string } {
  const spy = getUnit(state, spyUnitId);
  if (!spy || spy.type !== "spy") return { success: false, message: "Not a spy unit." };
  if (spy.movement <= 0) return { success: false, message: "No movement remaining." };

  const city = getCity(state, targetCityId);
  if (!city || city.owner === spy.owner) return { success: false, message: "Cannot sabotage own city." };

  // Must be adjacent to city
  if (hexDistance(spy.x, spy.y, city.x, city.y) > 1) return { success: false, message: "Must be adjacent to the city." };

  spy.movement = 0;

  const chance = 0.35 + spy.level * 0.1;
  if (Math.random() > chance) {
    if (Math.random() < 0.4) {
      addEvent(state, spy.owner, `Our spy was caught sabotaging ${city.name}!`);
      removeUnit(state, spyUnitId);
      return { success: false, message: "Spy caught and killed!" };
    }
    return { success: false, message: "Sabotage failed." };
  }

  // Success — destroy production progress
  city.productionAccum = 0;
  city.happiness -= 3;
  addEvent(state, spy.owner, `Spy sabotaged ${city.name}! Production destroyed.`);
  addEvent(state, city.owner, `${city.name} has been sabotaged! A fire destroyed our workshops.`);
  state.players[spy.owner].chivalry = Math.max(-100, state.players[spy.owner].chivalry - 8);

  return { success: true, message: `${city.name} sabotaged! Production reset.` };
}

// ── Trade Routes ───────────────────────────────────────────────────────────

export function canEstablishTradeRoute(state: CivGameState, fromCityId: number, toCityId: number): boolean {
  const from = getCity(state, fromCityId);
  const to = getCity(state, toCityId);
  if (!from || !to) return false;
  if (from.owner === to.owner) return false; // must be between different players
  if (from.tradeRoutes.includes(toCityId)) return false; // already trading
  if (from.tradeRoutes.length >= 3) return false; // max 3 routes per city
  // Must not be at war
  if (isAtWar(state, from.owner, to.owner)) return false;
  // Must have trade_routes tech
  if (!state.players[from.owner].techs.includes("trade_routes")) return false;
  return true;
}

export function establishTradeRoute(state: CivGameState, fromCityId: number, toCityId: number): boolean {
  if (!canEstablishTradeRoute(state, fromCityId, toCityId)) return false;
  const from = getCity(state, fromCityId)!;
  const to = getCity(state, toCityId)!;
  from.tradeRoutes.push(toCityId);
  to.tradeRoutes.push(fromCityId);
  addEvent(state, from.owner, `Trade route established between ${from.name} and ${to.name}!`);
  addEvent(state, to.owner, `${state.players[from.owner].factionDef.name} establishes trade with ${to.name}.`);
  return true;
}

export function getTradeIncome(state: CivGameState, city: CivCity): number {
  let income = 0;
  for (const routeId of city.tradeRoutes) {
    const partner = getCity(state, routeId);
    if (!partner) continue;
    // Check if still valid (not at war, partner still exists)
    if (isAtWar(state, city.owner, partner.owner)) continue;
    // Gold based on both cities' populations
    income += Math.floor((city.population + partner.population) * 0.5);
  }
  return income;
}

// ── Save / Load ────────────────────────────────────────────────────────────

const SAVE_KEY = "arthurian_civ_save";

export function saveGame(state: CivGameState): void {
  try {
    // Strip non-serializable fields (factionDef references)
    const data = JSON.stringify(state, (key, value) => {
      if (key === "factionDef") return undefined; // reconstructed on load
      return value;
    });
    localStorage.setItem(SAVE_KEY, data);
  } catch (e) {
    console.error("Save failed:", e);
  }
}

export function loadGame(): CivGameState | null {
  try {
    const data = localStorage.getItem(SAVE_KEY);
    if (!data) return null;
    const state: CivGameState = JSON.parse(data);
    // Reconstruct factionDef references
    for (const player of state.players) {
      const faction = CIV_FACTIONS.find(f => f.id === player.faction);
      if (faction) (player as any).factionDef = faction;
      else (player as any).factionDef = CIV_FACTIONS[0];
    }
    return state;
  } catch (e) {
    console.error("Load failed:", e);
    return null;
  }
}

export function hasSavedGame(): boolean {
  return localStorage.getItem(SAVE_KEY) !== null;
}

export function deleteSave(): void {
  localStorage.removeItem(SAVE_KEY);
}
