// ---------------------------------------------------------------------------
// Plague Doctor — game state
// ---------------------------------------------------------------------------

export enum PlaguePhase {
  PLAYING = "playing",
  WON = "won",
  LOST = "lost",
  PERK_SELECT = "perk_select",
  EVENT_CHOICE = "event_choice",
}

export enum TileType {
  EMPTY = 0, HOUSE = 1, WELL = 2, CHURCH = 3, WORKSHOP = 4,
  CEMETERY = 5, ROAD = 6, WALL = 7, MARKET = 8, BARRICADE = 9,
}

export enum InfectionLevel {
  HEALTHY = 0, RUMORED = 1, INFECTED = 2, DYING = 3, DEAD = 4,
}

export enum MutationType {
  NONE = 0, AIRBORNE = 1, RESILIENT = 2, FAST = 3, NECROMANTIC = 4,
}

export enum WeatherType {
  CLEAR = 0, RAIN = 1, WIND_NORTH = 2, WIND_SOUTH = 3, FOG = 4, STORM = 5,
}

export interface Rat { x: number; y: number; id: number; }
export interface Apprentice { x: number; y: number; animX: number; animY: number; }
export interface Perk { id: string; name: string; desc: string; color: number; }
export interface NarrativeEvent { id: string; title: string; text: string; choices: { label: string; effect: string }[]; }

export interface Harbinger {
  x: number; y: number;
  animX: number; animY: number;
  hp: number; maxHp: number;
  stunned: number;      // Turns remaining stunned
  spawnDay: number;
}

export interface Ability {
  id: string;
  name: string;
  desc: string;
  cooldown: number;     // Max cooldown in turns
  currentCd: number;    // Current cooldown remaining (0 = ready)
  color: number;
}

export interface Challenge {
  id: string;
  desc: string;
  target: number;
  current: number;
  completed: boolean;
  reward: number;        // Bonus score
  goldReward: number;    // Bonus gold
}

export enum MapTemplate {
  STANDARD = 0,
  RIVER = 1,       // River divides city, only 2 bridge crossings
  FORTRESS = 2,    // Central keep with radial roads
  SPRAWL = 3,      // No main roads, dense organic clusters
}

export interface Tile {
  type: TileType;
  infection: InfectionLevel;
  population: number;
  quarantined: boolean;
  fumigated: number;
  treated: boolean;
  district: number;
  visible: boolean;
  revealed: boolean;
  lastSeenInfection: InfectionLevel;
  warned: number;
  threatLevel: number;
}

export interface PlagueState {
  phase: PlaguePhase;
  phaseBeforeOverlay: PlaguePhase;
  grid: Tile[][];
  cols: number;
  rows: number;

  // Player
  px: number; py: number;
  health: number; maxHealth: number;
  animPx: number; animPy: number;
  visionRange: number;

  // Resources
  herbs: number; remedies: number; masks: number; leeches: number; gold: number;

  // Progress
  day: number; maxDays: number;
  deaths: number; maxDeaths: number;
  cured: number; totalPopulation: number;

  // Per-turn
  movesLeft: number; maxMoves: number;
  actionsLeft: number; maxActions: number;
  treatedThisTurn: number; comboBonus: number;

  // Entities
  rats: Rat[];
  nextRatId: number; ratsKilled: number;
  apprentice: Apprentice | null;
  harbinger: Harbinger | null;

  // Mutations (now supports 2)
  activeMutation: MutationType;
  mutationDay: number; mutationAnnounced: boolean;
  secondMutation: MutationType;
  secondMutationDay: number; secondMutationAnnounced: boolean;

  // Weather
  weather: WeatherType;
  weatherDuration: number;  // Days until weather changes

  // Abilities
  abilities: Ability[];

  // Plague waves
  nextWaveDay: number;
  waveActive: boolean;   // Visual indicator

  // Perks
  activePerks: string[];
  perkChoices: Perk[];
  nextPerkDay: number;

  // Events
  currentEvent: NarrativeEvent | null;

  // Undo
  undoSnapshot: string | null;
  undoUsed: boolean;

  // Scoring
  score: number;
  turnsWithoutDeath: number;
  perfectDays: number;
  maxCombo: number;
  harbingerDefeated: boolean;

  // Difficulty
  difficultyIndex: number;
  spreadMult: number;
  advanceMult: number;

  // Unlocks (persisted separately, loaded at start)
  totalWins: number;
  startingPerkId: string | null;  // Bonus perk from unlocks

  // Challenges
  challenges: Challenge[];

  // Morale (0-100, starts at 50)
  morale: number;

  // Map template used
  mapTemplate: MapTemplate;

  // Tutorial
  tutorialSeen: boolean;       // Has player dismissed tutorial
  tutorialHints: string[];     // Current contextual hints to show

  // Epilogue data (populated on game end)
  epilogueLines: string[];

  // UI
  hoverX: number; hoverY: number;
  movePath: { x: number; y: number }[];
  showLog: boolean;

  // Announcements
  announcements: { text: string; color: number; timer: number }[];
  log: string[];

  // Visual
  time: number;
  turnFlashTimer: number;
  deathShake: number;
  waveFlash: number;     // Flash during plague wave

  seed: number;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}

// ── map generation ───────────────────────────────────────────────────────────

function generateCity(cols: number, rows: number, difficulty: number, rng: () => number, template: MapTemplate): { grid: Tile[][]; totalPop: number } {
  const grid: Tile[][] = [];
  for (let y = 0; y < rows; y++) {
    grid[y] = [];
    for (let x = 0; x < cols; x++) {
      grid[y][x] = {
        type: TileType.EMPTY, infection: InfectionLevel.HEALTHY, population: 0,
        quarantined: false, fumigated: 0, treated: false, district: 0,
        visible: false, revealed: false, lastSeenInfection: InfectionLevel.HEALTHY,
        warned: 0, threatLevel: 0,
      };
    }
  }

  for (let x = 0; x < cols; x++) { grid[0][x].type = TileType.WALL; grid[rows - 1][x].type = TileType.WALL; }
  for (let y = 0; y < rows; y++) { grid[y][0].type = TileType.WALL; grid[y][cols - 1].type = TileType.WALL; }

  const midX = Math.floor(cols / 2), midY = Math.floor(rows / 2);

  if (template === MapTemplate.RIVER) {
    // River runs vertically at midX, two bridges
    for (let y = 1; y < rows - 1; y++) {
      grid[y][midX].type = TileType.WALL; // River (impassable)
      if (midX - 1 > 0) grid[y][midX - 1].type = TileType.ROAD;
      if (midX + 1 < cols - 1) grid[y][midX + 1].type = TileType.ROAD;
    }
    // Bridges at 1/3 and 2/3 height
    const b1 = Math.floor(rows * 0.33), b2 = Math.floor(rows * 0.67);
    grid[b1][midX].type = TileType.ROAD; grid[b2][midX].type = TileType.ROAD;
    // Horizontal roads on each side
    for (let x = 1; x < midX; x++) { grid[midY][x].type = TileType.ROAD; grid[b1][x].type = TileType.ROAD; }
    for (let x = midX + 1; x < cols - 1; x++) { grid[midY][x].type = TileType.ROAD; grid[b2][x].type = TileType.ROAD; }
    // Some vertical roads per side
    const lx = Math.floor(midX * 0.5), rx = midX + Math.floor((cols - midX) * 0.5);
    for (let y = 1; y < rows - 1; y++) { grid[y][lx].type = TileType.ROAD; if (rx < cols - 1) grid[y][rx].type = TileType.ROAD; }
  } else if (template === MapTemplate.FORTRESS) {
    // Central keep (3x3 open area) with radial roads
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) grid[midY + dy][midX + dx].type = TileType.ROAD;
    // 8 radial roads from center
    const radials = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    for (const [dx, dy] of radials) {
      for (let i = 1; i < Math.max(cols, rows); i++) {
        const nx = midX + dx * i, ny = midY + dy * i;
        if (nx > 0 && nx < cols - 1 && ny > 0 && ny < rows - 1) grid[ny][nx].type = TileType.ROAD;
      }
    }
    // Ring road at radius ~4
    for (let a = 0; a < 32; a++) {
      const angle = (a / 32) * Math.PI * 2;
      const rx = midX + Math.round(Math.cos(angle) * 4), ry = midY + Math.round(Math.sin(angle) * 4);
      if (rx > 0 && rx < cols - 1 && ry > 0 && ry < rows - 1) grid[ry][rx].type = TileType.ROAD;
    }
  } else if (template === MapTemplate.SPRAWL) {
    // No main grid — organic random walks creating winding paths
    for (let w = 0; w < 8; w++) {
      let cx = 2 + Math.floor(rng() * (cols - 4)), cy = 2 + Math.floor(rng() * (rows - 4));
      const len = 15 + Math.floor(rng() * 20);
      for (let s = 0; s < len; s++) {
        if (cx > 0 && cx < cols - 1 && cy > 0 && cy < rows - 1) grid[cy][cx].type = TileType.ROAD;
        const dir = Math.floor(rng() * 4);
        if (dir === 0) cx++; else if (dir === 1) cx--; else if (dir === 2) cy++; else cy--;
      }
    }
  } else {
    // STANDARD template — original grid layout
    for (let x = 1; x < cols - 1; x++) {
      grid[midY][x].type = TileType.ROAD;
      if (midY - 4 > 0) grid[midY - 4][x].type = TileType.ROAD;
      if (midY + 4 < rows - 1) grid[midY + 4][x].type = TileType.ROAD;
    }
    for (let y = 1; y < rows - 1; y++) {
      grid[y][midX].type = TileType.ROAD;
      if (midX - 5 > 0) grid[y][midX - 5].type = TileType.ROAD;
      if (midX + 5 < cols - 1) grid[y][midX + 5].type = TileType.ROAD;
    }
  }

  // Add random alleys to all templates
  for (let a = 0; a < 14; a++) {
    const sx = 2 + Math.floor(rng() * (cols - 4)), sy = 2 + Math.floor(rng() * (rows - 4));
    const horiz = rng() < 0.5, len = 2 + Math.floor(rng() * 5);
    for (let i = 0; i < len; i++) {
      const nx = horiz ? sx + i : sx, ny = horiz ? sy : sy + i;
      if (nx > 0 && nx < cols - 1 && ny > 0 && ny < rows - 1 && grid[ny][nx].type === TileType.EMPTY) grid[ny][nx].type = TileType.ROAD;
    }
  }
  for (let y = 1; y < rows - 1; y++) for (let x = 1; x < cols - 1; x++) {
    if (grid[y][x].type !== TileType.EMPTY) continue;
    let adj = 0;
    if (grid[y - 1][x].type === TileType.ROAD) adj++; if (grid[y + 1][x].type === TileType.ROAD) adj++;
    if (grid[y][x - 1].type === TileType.ROAD) adj++; if (grid[y][x + 1].type === TileType.ROAD) adj++;
    if (adj >= 3) grid[y][x].type = TileType.ROAD;
  }

  // Districts
  for (let y = 1; y < rows - 1; y++) for (let x = 1; x < cols - 1; x++) {
    if (x < midX && y < midY) grid[y][x].district = 2;
    else if (x >= midX && y < midY) grid[y][x].district = 1;
    else if (x < midX && y >= midY) grid[y][x].district = 0;
    else grid[y][x].district = 3;
  }

  let totalPop = 0, housesPlaced = 0;
  const houseTarget = 30 + Math.floor(difficulty * 6);
  for (let y = 1; y < rows - 1 && housesPlaced < houseTarget; y++) {
    for (let x = 1; x < cols - 1 && housesPlaced < houseTarget; x++) {
      if (grid[y][x].type !== TileType.EMPTY) continue;
      let adjRoad = false;
      if (grid[y - 1]?.[x]?.type === TileType.ROAD) adjRoad = true; if (grid[y + 1]?.[x]?.type === TileType.ROAD) adjRoad = true;
      if (grid[y]?.[x - 1]?.type === TileType.ROAD) adjRoad = true; if (grid[y]?.[x + 1]?.type === TileType.ROAD) adjRoad = true;
      if (!adjRoad) continue;
      if (rng() < 0.65) {
        grid[y][x].type = TileType.HOUSE;
        const dist = grid[y][x].district;
        grid[y][x].population = dist === 0 ? 4 + Math.floor(rng() * 3) : dist === 2 ? 1 + Math.floor(rng() * 2) : 2 + Math.floor(rng() * 3);
        totalPop += grid[y][x].population; housesPlaced++;
      }
    }
  }
  for (let y = 1; y < rows - 1 && housesPlaced < houseTarget; y++) {
    for (let x = 1; x < cols - 1 && housesPlaced < houseTarget; x++) {
      if (grid[y][x].type !== TileType.EMPTY) continue;
      let adjH = false;
      if (grid[y - 1]?.[x]?.type === TileType.HOUSE) adjH = true; if (grid[y + 1]?.[x]?.type === TileType.HOUSE) adjH = true;
      if (grid[y]?.[x - 1]?.type === TileType.HOUSE) adjH = true; if (grid[y]?.[x + 1]?.type === TileType.HOUSE) adjH = true;
      if (!adjH) continue;
      if (rng() < 0.4) {
        grid[y][x].type = TileType.HOUSE;
        grid[y][x].population = 1 + Math.floor(rng() * 3);
        totalPop += grid[y][x].population; housesPlaced++;
      }
    }
  }
  for (let y = 1; y < rows - 1; y++) for (let x = 1; x < cols - 1; x++) { if (grid[y][x].type === TileType.EMPTY) grid[y][x].type = TileType.ROAD; }

  const cX = Math.floor(midX * 0.5), cY = Math.floor(midY * 0.5);
  if (cX > 0 && cY > 0) { grid[cY][cX].type = TileType.CHURCH; grid[cY][cX].population = 0; }
  const mX = midX + Math.floor((cols - midX) * 0.5), mY = Math.floor(midY * 0.5);
  if (mX < cols - 1 && mY > 0) { grid[mY][mX].type = TileType.MARKET; grid[mY][mX].population = 0; }
  const wX = Math.floor(midX * 0.5), wY = midY + Math.floor((rows - midY) * 0.5);
  if (wX > 0 && wY < rows - 1) { grid[wY][wX].type = TileType.WORKSHOP; grid[wY][wX].population = 0; }

  const wellPos = [[2, 2], [cols - 3, rows - 3], [cols - 3, 2], [2, rows - 3]];
  let wp = 0;
  for (const [wx, wy] of wellPos) {
    if (wx > 0 && wx < cols - 1 && wy > 0 && wy < rows - 1 && wp < 3 + Math.floor(rng())) {
      grid[wy][wx].type = TileType.WELL; grid[wy][wx].population = 0; wp++;
    }
  }
  for (let a = 0; a < 100 && wp < 3; a++) {
    const x = 2 + Math.floor(rng() * (cols - 4)), y = 2 + Math.floor(rng() * (rows - 4));
    if (grid[y][x].type === TileType.ROAD) { grid[y][x].type = TileType.WELL; wp++; }
  }
  return { grid, totalPop };
}

function getUnlocks(): { wins: number; startPerk: string | null } {
  try {
    const wins = parseInt(localStorage.getItem("plague_total_wins") ?? "0") || 0;
    // Unlock starting perks based on total wins
    let startPerk: string | null = null;
    if (wins >= 5) startPerk = "swift_feet";
    else if (wins >= 3) startPerk = "herbalist";
    else if (wins >= 1) startPerk = "thick_skin";
    return { wins, startPerk };
  } catch { return { wins: 0, startPerk: null }; }
}

export function createPlagueState(difficulty: number = 1, difficultyIndex: number = 1): PlagueState {
  const cols = Math.max(18, Math.floor((typeof window !== "undefined" ? window.innerWidth - 40 : 800) / 44));
  const rows = Math.max(14, Math.floor((typeof window !== "undefined" ? window.innerHeight - 120 : 620) / 44));
  const seed = Date.now() % 2147483647;
  const rng = seededRandom(seed);
  const templates = [MapTemplate.STANDARD, MapTemplate.RIVER, MapTemplate.FORTRESS, MapTemplate.SPRAWL];
  const mapTemplate = templates[Math.floor(rng() * templates.length)];
  const { grid, totalPop } = generateCity(cols, rows, difficulty, rng, mapTemplate);

  const houses: [number, number][] = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (grid[y][x].type === TileType.HOUSE) houses.push([x, y]);
  const slumsH = houses.filter(([x, y]) => grid[y][x].district === 0);
  const src = slumsH.length > 2 ? slumsH : houses;
  for (let i = 0; i < 1 + Math.floor(rng() * difficulty) && i < src.length; i++) {
    const idx = Math.floor(rng() * src.length);
    grid[src[idx][1]][src[idx][0]].infection = InfectionLevel.INFECTED;
    src.splice(idx, 1);
  }

  const midX = Math.floor(cols / 2), midY = Math.floor(rows / 2);
  let px = midX, py = midY;
  outer: for (let r = 0; r < 6; r++) for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) {
    const nx = midX + dx, ny = midY + dy;
    if (nx > 0 && nx < cols - 1 && ny > 0 && ny < rows - 1 && grid[ny][nx].type === TileType.ROAD) { px = nx; py = ny; break outer; }
  }

  const rats: Rat[] = [];
  let nextRatId = 0;
  for (let i = 0; i < Math.floor(difficulty * 1.5); i++) {
    for (let a = 0; a < 50; a++) {
      const rx = 1 + Math.floor(rng() * (cols - 2)), ry = 1 + Math.floor(rng() * (rows - 2));
      if (grid[ry][rx].type !== TileType.WALL) { rats.push({ x: rx, y: ry, id: nextRatId++ }); break; }
    }
  }

  const muts = [MutationType.AIRBORNE, MutationType.RESILIENT, MutationType.FAST, MutationType.NECROMANTIC];
  const mut1 = muts[Math.floor(rng() * muts.length)];
  const remaining = muts.filter(m => m !== mut1);
  const mut2 = remaining[Math.floor(rng() * remaining.length)];

  const DIFFS = [{ s: 0.7, a: 0.6 }, { s: 1.0, a: 1.0 }, { s: 1.4, a: 1.3 }];
  const dm = DIFFS[difficultyIndex] ?? DIFFS[1];

  const unlocks = getUnlocks();
  const activePerks: string[] = [];
  if (unlocks.startPerk) activePerks.push(unlocks.startPerk);

  // Abilities
  const abilities: Ability[] = [
    { id: "holy_water", name: "Holy Water", desc: "Cure all rumored/infected in 2-tile radius", cooldown: 6, currentCd: 0, color: 0x44ddff },
    { id: "bonfire", name: "Bonfire", desc: "Kill nearby rats + fumigate 3x3 area", cooldown: 5, currentCd: 0, color: 0xff8833 },
    { id: "barricade", name: "Barricade", desc: "Place a barrier blocking plague spread", cooldown: 4, currentCd: 0, color: 0xaa8866 },
  ];

  // Weather
  const weathers = [WeatherType.CLEAR, WeatherType.RAIN, WeatherType.WIND_NORTH, WeatherType.WIND_SOUTH, WeatherType.FOG];
  const weather = weathers[Math.floor(rng() * weathers.length)];

  // Generate 3 random challenges
  const allChallenges: Challenge[] = [
    { id: "cure_many", desc: "Cure 30+ citizens", target: 30, current: 0, completed: false, reward: 30, goldReward: 5 },
    { id: "rat_hunter", desc: "Kill 4+ rats", target: 4, current: 0, completed: false, reward: 20, goldReward: 4 },
    { id: "speed_run", desc: "Win before day 15", target: 15, current: 0, completed: false, reward: 40, goldReward: 8 },
    { id: "no_deaths_5", desc: "Go 5 days without a death", target: 5, current: 0, completed: false, reward: 25, goldReward: 5 },
    { id: "combo_master", desc: "Achieve a x4 combo", target: 4, current: 0, completed: false, reward: 20, goldReward: 3 },
    { id: "herbalist_c", desc: "Gather herbs 6+ times", target: 6, current: 0, completed: false, reward: 15, goldReward: 3 },
    { id: "market_mogul", desc: "Spend 20+ gold at market", target: 20, current: 0, completed: false, reward: 20, goldReward: 0 },
    { id: "quarantine_5", desc: "Quarantine 5+ houses", target: 5, current: 0, completed: false, reward: 15, goldReward: 3 },
    { id: "full_health", desc: "End a day at full health 5 times", target: 5, current: 0, completed: false, reward: 15, goldReward: 3 },
    { id: "harbinger_slayer", desc: "Defeat the Harbinger", target: 1, current: 0, completed: false, reward: 50, goldReward: 10 },
  ];
  // Pick 3 random
  const challenges: Challenge[] = [];
  for (let i = 0; i < 3 && allChallenges.length > 0; i++) {
    const idx = Math.floor(rng() * allChallenges.length);
    challenges.push(allChallenges.splice(idx, 1)[0]);
  }

  // Tutorial: check if seen before
  let tutorialSeen = false;
  try { tutorialSeen = localStorage.getItem("plague_tutorial_seen") === "1"; } catch { /* */ }

  return {
    phase: PlaguePhase.PLAYING, phaseBeforeOverlay: PlaguePhase.PLAYING,
    grid, cols, rows, px, py, animPx: px, animPy: py, visionRange: 4,
    health: 10, maxHealth: 10,
    herbs: 4, remedies: 1, masks: 3, leeches: 1, gold: 8,
    day: 1, maxDays: 25 + Math.floor(difficulty * 5),
    deaths: 0, maxDeaths: Math.floor(totalPop * 0.35),
    cured: 0, totalPopulation: totalPop,
    movesLeft: 4, maxMoves: 4, actionsLeft: 2, maxActions: 2,
    treatedThisTurn: 0, comboBonus: 0,
    rats, nextRatId, ratsKilled: 0, apprentice: null,
    harbinger: null,
    activeMutation: mut1, mutationDay: 8 + Math.floor(rng() * 4), mutationAnnounced: false,
    secondMutation: mut2, secondMutationDay: 16 + Math.floor(rng() * 4), secondMutationAnnounced: false,
    weather, weatherDuration: 3 + Math.floor(rng() * 3),
    abilities,
    nextWaveDay: 7, waveActive: false,
    activePerks, perkChoices: [], nextPerkDay: 5,
    currentEvent: null,
    undoSnapshot: null, undoUsed: false,
    score: 0, turnsWithoutDeath: 0, perfectDays: 0, maxCombo: 0,
    harbingerDefeated: false,
    difficultyIndex, spreadMult: dm.s, advanceMult: dm.a,
    totalWins: unlocks.wins, startingPerkId: unlocks.startPerk,
    challenges,
    morale: 50,
    mapTemplate,
    tutorialSeen,
    tutorialHints: [],
    epilogueLines: [],
    hoverX: -1, hoverY: -1, movePath: [], showLog: false,
    announcements: [], log: ["The plague has arrived. God help us all."],
    time: 0, turnFlashTimer: 0, deathShake: 0, waveFlash: 0,
    seed,
  };
}
