// ---------------------------------------------------------------------------
// Rampart — Tower Defense configuration
// ---------------------------------------------------------------------------

export const RAMPART = {
  // Simulation
  SIM_TICK_MS: 16,

  // Grid
  GRID_COLS: 16,
  GRID_ROWS: 20,
  CELL_SIZE: 3,

  // Castle
  CASTLE_MAX_HP: 100,

  // Starting resources
  START_GOLD: 200,
  KILL_GOLD_BASE: 10,

  // Wave timing
  WAVE_PREP_TIME: 12,        // seconds between waves
  FIRST_WAVE_DELAY: 5,
  ENEMIES_PER_WAVE_BASE: 6,
  ENEMIES_PER_WAVE_GROWTH: 2,
  SPAWN_INTERVAL: 0.8,       // seconds between enemy spawns within a wave
  MAX_WAVES: 25,

  // Camera
  CAM_DISTANCE: 55,
  CAM_ANGLE: 0.85,           // radians from vertical
  CAM_HEIGHT: 40,
  CAM_ROTATE_SPEED: 0.005,
  CAM_ZOOM_SPEED: 3,
  CAM_MIN_DIST: 25,
  CAM_MAX_DIST: 90,

  // Terrain
  TERRAIN_HEIGHT_SCALE: 0.4,

  // Colors
  COLOR_GROUND: 0x4a7c3f,
  COLOR_PATH: 0x8b7355,
  COLOR_CASTLE: 0x8c8c8c,
  COLOR_CASTLE_ROOF: 0x5a3a2a,
  COLOR_GRID_LINE: 0x3a6c2f,
  COLOR_HOVER_VALID: 0x44ff44,
  COLOR_HOVER_INVALID: 0xff4444,
  COLOR_GOLD: 0xffd700,

  // Projectile
  PROJECTILE_SPEED: 30,
  ARROW_SPEED: 40,
  BOULDER_SPEED: 18,
  MAGIC_BOLT_SPEED: 25,

  // Tower upgrades
  MAX_TOWER_LEVEL: 5,
  UPGRADE_COST_MULT: 0.6,       // upgrade cost = base cost * mult * level
  UPGRADE_DAMAGE_MULT: 0.25,    // +25% damage per level
  UPGRADE_RANGE_MULT: 0.08,     // +8% range per level
  UPGRADE_FIRE_RATE_MULT: 0.10, // +10% fire rate per level
  SELL_REFUND_RATIO: 0.6,       // 60% refund on sell
} as const;

export interface DifficultyDef {
  id: string;
  name: string;
  hpMult: number;       // enemy HP multiplier
  goldMult: number;     // gold reward multiplier
  startGold: number;
  description: string;
}

export const DIFFICULTIES: DifficultyDef[] = [
  { id: "easy",   name: "Easy",   hpMult: 0.7, goldMult: 1.3, startGold: 300, description: "Weaker enemies, more gold" },
  { id: "normal", name: "Normal", hpMult: 1.0, goldMult: 1.0, startGold: 200, description: "Standard challenge" },
  { id: "hard",   name: "Hard",   hpMult: 1.5, goldMult: 0.8, startGold: 150, description: "Tougher enemies, less gold" },
];

// Tower definitions
export interface TowerDef {
  id: string;
  name: string;
  cost: number;
  range: number;
  damage: number;
  fireRate: number;      // shots per second
  color: number;
  height: number;
  projectileColor: number;
  splash: number;        // splash radius (0 = single target)
  slowAmount: number;    // 0-1 slow factor
  description: string;
}

export const TOWER_DEFS: Record<string, TowerDef> = {
  archer: {
    id: "archer",
    name: "Archer Tower",
    cost: 50,
    range: 12,
    damage: 8,
    fireRate: 1.5,
    color: 0x8b6914,
    height: 4,
    projectileColor: 0xddbb66,
    splash: 0,
    slowAmount: 0,
    description: "Fast single-target arrows",
  },
  catapult: {
    id: "catapult",
    name: "Catapult",
    cost: 120,
    range: 16,
    damage: 25,
    fireRate: 0.5,
    color: 0x6b4226,
    height: 2.5,
    projectileColor: 0x888888,
    splash: 4,
    slowAmount: 0,
    description: "Slow area-of-effect boulders",
  },
  mage: {
    id: "mage",
    name: "Mage Tower",
    cost: 100,
    range: 10,
    damage: 15,
    fireRate: 0.8,
    color: 0x5533aa,
    height: 5,
    projectileColor: 0xaa66ff,
    splash: 0,
    slowAmount: 0.4,
    description: "Magic bolts that slow enemies",
  },
  ballista: {
    id: "ballista",
    name: "Ballista",
    cost: 150,
    range: 20,
    damage: 40,
    fireRate: 0.3,
    color: 0x4a4a4a,
    height: 3,
    projectileColor: 0xcccccc,
    splash: 0,
    slowAmount: 0,
    description: "Long-range piercing bolts",
  },
  flame: {
    id: "flame",
    name: "Flame Tower",
    cost: 175,
    range: 7,
    damage: 12,
    fireRate: 3,
    color: 0xcc4400,
    height: 4.5,
    projectileColor: 0xff6600,
    splash: 3,
    slowAmount: 0,
    description: "Short-range fire bursts",
  },
};

// Enemy definitions
export interface EnemyDef {
  id: string;
  name: string;
  hp: number;
  speed: number;
  damage: number;       // damage to castle
  goldReward: number;
  color: number;
  scale: number;
  armor: number;        // flat damage reduction
}

export const ENEMY_DEFS: Record<string, EnemyDef> = {
  peasant: {
    id: "peasant",
    name: "Peasant",
    hp: 30,
    speed: 4,
    damage: 2,
    goldReward: 8,
    color: 0xaa8855,
    scale: 0.7,
    armor: 0,
  },
  soldier: {
    id: "soldier",
    name: "Soldier",
    hp: 60,
    speed: 3,
    damage: 5,
    goldReward: 15,
    color: 0x4466aa,
    scale: 0.85,
    armor: 2,
  },
  knight: {
    id: "knight",
    name: "Knight",
    hp: 150,
    speed: 2,
    damage: 10,
    goldReward: 30,
    color: 0xcccccc,
    scale: 1.0,
    armor: 5,
  },
  ram: {
    id: "ram",
    name: "Battering Ram",
    hp: 300,
    speed: 1.5,
    damage: 25,
    goldReward: 50,
    color: 0x5a3a1a,
    scale: 1.4,
    armor: 8,
  },
  darkMage: {
    id: "darkMage",
    name: "Dark Mage",
    hp: 40,
    speed: 3.5,
    damage: 8,
    goldReward: 25,
    color: 0x220044,
    scale: 0.8,
    armor: 0,
  },
  cavalry: {
    id: "cavalry",
    name: "Cavalry",
    hp: 80,
    speed: 6,
    damage: 7,
    goldReward: 20,
    color: 0x886644,
    scale: 1.1,
    armor: 3,
  },
  giant: {
    id: "giant",
    name: "Siege Giant",
    hp: 600,
    speed: 1,
    damage: 40,
    goldReward: 80,
    color: 0x664422,
    scale: 2.0,
    armor: 10,
  },
};

// Wave compositions
export interface WaveEntry {
  enemyId: string;
  count: number;
  delay?: number;   // override spawn interval
}

export function getWaveComposition(wave: number): WaveEntry[] {
  if (wave <= 3) {
    return [{ enemyId: "peasant", count: 4 + wave * 2 }];
  }
  if (wave <= 5) {
    return [
      { enemyId: "peasant", count: 3 + wave },
      { enemyId: "soldier", count: wave - 2 },
    ];
  }
  if (wave <= 8) {
    return [
      { enemyId: "soldier", count: wave },
      { enemyId: "knight", count: Math.floor(wave / 3) },
    ];
  }
  if (wave <= 10) {
    return [
      { enemyId: "soldier", count: wave - 2 },
      { enemyId: "knight", count: Math.floor(wave / 2) },
      { enemyId: "cavalry", count: 2 },
    ];
  }
  if (wave <= 14) {
    return [
      { enemyId: "knight", count: wave - 4 },
      { enemyId: "cavalry", count: 3 },
      { enemyId: "darkMage", count: Math.floor(wave / 4) },
      { enemyId: "ram", count: 1 },
    ];
  }
  if (wave <= 18) {
    return [
      { enemyId: "knight", count: wave - 2 },
      { enemyId: "cavalry", count: 4 },
      { enemyId: "darkMage", count: Math.floor(wave / 3) },
      { enemyId: "ram", count: Math.floor(wave / 6) },
    ];
  }
  if (wave <= 22) {
    return [
      { enemyId: "knight", count: wave },
      { enemyId: "cavalry", count: 5 },
      { enemyId: "darkMage", count: wave - 14 },
      { enemyId: "ram", count: Math.floor(wave / 5) },
      { enemyId: "giant", count: 1 },
    ];
  }
  // Wave 23+
  return [
    { enemyId: "knight", count: wave + 2 },
    { enemyId: "cavalry", count: 6 },
    { enemyId: "darkMage", count: wave - 16 },
    { enemyId: "ram", count: Math.floor(wave / 4) },
    { enemyId: "giant", count: Math.floor((wave - 20) / 2) + 1 },
  ];
}
