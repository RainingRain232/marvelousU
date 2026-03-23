// ---------------------------------------------------------------------------
// Hunt mode — game state
// ---------------------------------------------------------------------------

import type { PreyType, BowDef } from "../config/HuntConfig";
import { PREY, BOWS, HuntConfig } from "../config/HuntConfig";

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
  // Environment
  trees: { x: number; y: number; r: number }[];
  wind: number; // -1 to 1, affects arrow drift
  windTimer: number;
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
    trees: generateTrees(),
    wind: 0,
    windTimer: 5,
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
