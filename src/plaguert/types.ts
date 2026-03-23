// ---------------------------------------------------------------------------
// Plague Doctor RT — enums & interfaces
// ---------------------------------------------------------------------------

export enum PlagueRTPhase {
  MENU = "menu",
  PLAYING = "playing",
  PAUSED = "paused",
  WON = "won",
  LOST = "lost",
}

export enum TileType {
  GRASS = 0,
  PATH = 1,
  HOUSE = 2,
  WELL = 3,
  CHURCH = 4,
}

export enum HouseState {
  HEALTHY = "healthy",
  INFECTED = "infected",
  CRITICAL = "critical",
  DEAD = "dead",
  CURED = "cured",
}

export enum HerbType {
  LAVENDER = "lavender",
  WORMWOOD = "wormwood",
  MANDRAKE = "mandrake",
  GARLIC = "garlic",
}

export enum VillageLayout {
  CROSS = "cross",
  CLUSTERS = "clusters",
  RING = "ring",
  MAINSTREET = "mainstreet",
}

export interface House {
  id: number;
  gx: number;
  gy: number;
  infection: number; // 0-100
  state: HouseState;
  villagers: number; // 1-4
  protectionTimer: number;
  treatProgress: number; // 0-1
  shakeTimer: number;
  deathFlash: number;
  cureFlash: number;
  lastInfection: number;
}

export interface Herb {
  id: number;
  gx: number;
  gy: number;
  type: HerbType;
  collected: boolean;
  spawnTime: number;
  pullX: number;
  pullY: number;
  pulling: boolean;
  spawnFlash: number;
}

export interface Rat {
  id: number;
  x: number;
  y: number;
  targetGx: number;
  targetGy: number;
  speed: number;
  alive: boolean;
  infectionAura: number;
  deathTimer: number;
  swarming: boolean;
}

export interface Smoke {
  id: number;
  gx: number;
  gy: number;
  timer: number;
  radius: number;
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: number;
  timer: number;
  maxTimer: number;
  size?: number;
}

export interface HealBeam {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  progress: number;
  color: number;
}

export interface PlagueRTPlayer {
  x: number;
  y: number;
  speed: number;
  herbs: Record<HerbType, number>;
  remedies: number;
  smokeBombs: number;
  incense: number;
  ratTraps: number;
  treating: House | null;
  treatTimer: number;
  garlicAuraTimer: number;
  villagersSaved: number;
  villagersLost: number;
  curesPerformed: number;
  velX: number;
  velY: number;
  cureStreak: number;
  bestStreak: number;
  streakTimer: number;
  comboMultiplier: number;
}

export interface PlagueRTState {
  phase: PlagueRTPhase;
  time: number;
  dayTime: number; // 0-1
  day: number;
  gridW: number;
  gridH: number;
  tileSize: number;
  tiles: TileType[][];
  houses: House[];
  herbs: Herb[];
  rats: Rat[];
  smokes: Smoke[];
  floatingTexts: FloatingText[];
  healBeams: HealBeam[];
  player: PlagueRTPlayer;
  nextHerbSpawn: number;
  nextRatSpawn: number;
  totalVillagers: number;
  plagueOriginId: number;
  difficulty: number;
  wave: number;
  ratsKilled: number;
  screenShake: number;
  churchPos: { gx: number; gy: number } | null;
  wellPos: { gx: number; gy: number } | null;
  grassTiles: { gx: number; gy: number }[];
  layout: VillageLayout;
  lastNightState: boolean;
  dayTransitionTimer: number;
  dayTransitionText: string;
  wavePreviewTimer: number;
  wavePreviewCount: number;
  wellActive: boolean;
  wellHealingHouses: number[];
  mandrakeBlastTimer: number;
  mandrakeBlastX: number;
  mandrakeBlastY: number;
}

export interface PlagueRTMeta {
  highScore: number;
  bestSaved: number;
  bestDay: number;
  totalGames: number;
  totalSaved: number;
  bestStreak: number;
}
