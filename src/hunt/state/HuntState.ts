// ---------------------------------------------------------------------------
// Hunt mode — game state
// ---------------------------------------------------------------------------

import type { PreyType, BowDef } from "../config/HuntConfig";
import { BOWS, HuntConfig } from "../config/HuntConfig";

export interface Prey {
  id: string;
  type: PreyType;
  x: number;
  y: number;
  hp: number;
  speed: number;
  angle: number; // movement direction
  turnTimer: number;
  startled: boolean;
  startledTimer: number;
  alive: boolean;
  aggressive: boolean;
  attackCooldown: number;
}

export interface Arrow {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  life: number;
}

export interface HuntState {
  round: number; // 0-2 (3 rounds)
  bow: BowDef;
  bowIndex: number;
  playerX: number;
  playerY: number;
  aimAngle: number;
  drawProgress: number; // 0-1
  isDrawing: boolean;
  prey: Prey[];
  arrows: Arrow[];
  gold: number;
  score: number;
  kills: number;
  misses: number;
  elapsedTime: number;
  timeLimit: number;
  spawnTimer: number;
  preyIdCounter: number;
  particles: { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: number; size: number }[];
  announcements: { text: string; color: number; timer: number }[];
  log: string[];
  roundOver: boolean;
  // Streak & combo
  streak: number;
  bestStreak: number;
  // Player danger
  playerHp: number;
  maxPlayerHp: number;
  playerVX: number;
  playerVY: number;
  // Stealth
  playerStealth: number; // 0-1, reduced by moving, increased by standing still
  // Trophy
  trophySpawned: boolean;
  // Environment
  trees: { x: number; y: number; r: number }[];
  wind: number;
  windTimer: number;
  // Ammo
  arrowsLeft: number;
  maxArrows: number;
  ammoPickups: { x: number; y: number; collected: boolean }[];
  // Terrain zones
  brushZones: { x: number; y: number; w: number; h: number }[];
  waterZones: { x: number; y: number; w: number; h: number }[];
}

export function createHuntState(bowIndex = 0): HuntState {
  return {
    round: 0,
    bow: BOWS[bowIndex],
    bowIndex,
    playerX: HuntConfig.FIELD_WIDTH / 2,
    playerY: HuntConfig.FIELD_HEIGHT - 40,
    aimAngle: -Math.PI / 2,
    drawProgress: 0,
    isDrawing: false,
    prey: [],
    arrows: [],
    gold: 0,
    score: 0,
    kills: 0,
    misses: 0,
    elapsedTime: 0,
    timeLimit: HuntConfig.ROUND_DURATION,
    spawnTimer: 1,
    preyIdCounter: 0,
    particles: [],
    announcements: [{ text: "The hunt begins!", color: 0x44aa44, timer: 2 }],
    log: ["Round 1 — Hunt begins."],
    roundOver: false,
    streak: 0,
    bestStreak: 0,
    playerHp: 5,
    maxPlayerHp: 5,
    playerVX: 0,
    playerVY: 0,
    playerStealth: 1,
    trophySpawned: false,
    trees: generateTrees(),
    wind: 0,
    windTimer: 5,
    arrowsLeft: 15,
    maxArrows: 15,
    ammoPickups: generateAmmoPickups(),
    brushZones: generateBrushZones(),
    waterZones: generateWaterZones(),
  };
}

function generateTrees(): { x: number; y: number; r: number }[] {
  const trees: { x: number; y: number; r: number }[] = [];
  for (let i = 0; i < 8; i++) {
    trees.push({
      x: 30 + Math.random() * (HuntConfig.FIELD_WIDTH - 60),
      y: 30 + Math.random() * (HuntConfig.FIELD_HEIGHT - 100),
      r: 12 + Math.random() * 10,
    });
  }
  return trees;
}

function generateAmmoPickups(): HuntState["ammoPickups"] {
  const pickups: HuntState["ammoPickups"] = [];
  for (let i = 0; i < 4; i++) {
    pickups.push({
      x: 40 + Math.random() * (HuntConfig.FIELD_WIDTH - 80),
      y: 40 + Math.random() * (HuntConfig.FIELD_HEIGHT - 120),
      collected: false,
    });
  }
  return pickups;
}

function generateBrushZones(): HuntState["brushZones"] {
  const zones: HuntState["brushZones"] = [];
  for (let i = 0; i < 2; i++) {
    zones.push({
      x: 50 + Math.random() * (HuntConfig.FIELD_WIDTH - 200),
      y: 30 + Math.random() * (HuntConfig.FIELD_HEIGHT - 150),
      w: 60 + Math.random() * 40,
      h: 40 + Math.random() * 30,
    });
  }
  return zones;
}

function generateWaterZones(): HuntState["waterZones"] {
  const zones: HuntState["waterZones"] = [];
  zones.push({
    x: 100 + Math.random() * (HuntConfig.FIELD_WIDTH - 300),
    y: 80 + Math.random() * (HuntConfig.FIELD_HEIGHT - 200),
    w: 80 + Math.random() * 60,
    h: 25 + Math.random() * 20,
  });
  return zones;
}
