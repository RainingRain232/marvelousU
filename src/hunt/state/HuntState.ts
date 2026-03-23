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
  };
}
