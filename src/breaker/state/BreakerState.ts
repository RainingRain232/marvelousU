// Grail Breaker – State Factory & Level Generator

import {
  BreakerPhase,
  BreakerState,
  BreakerMeta,
  Ball,
  Brick,
  BrickType,
} from "../types";
import { BREAKER_BALANCE, BRICK_HP } from "../config/BreakerBalance";

const BB = BREAKER_BALANCE;
const META_KEY = "grailBreaker_meta";

// ---------------------------------------------------------------------------
// State factory
// ---------------------------------------------------------------------------

export function createBreakerState(): BreakerState {
  const meta = loadBreakerMeta();
  const state: BreakerState = {
    phase: BreakerPhase.MENU,
    paddle: {
      x: BB.FIELD_W / 2,
      width: BB.PADDLE_W,
      baseWidth: BB.PADDLE_W,
      wideTimer: 0,
      laserTimer: 0,
      laserCooldown: 0,
      vx: 0,
    },
    balls: [],
    bricks: [],
    powerUps: [],
    lasers: [],
    level: 1,
    score: 0,
    lives: BB.STARTING_LIVES,
    time: 0,
    slowTimer: 0,
    highScore: meta.highScore,
    combo: 0,
    bestCombo: 0,
    ballOnPaddle: true,
    aimDir: 0,
    launchCharge: 0,
    launchCharging: false,
    events: {},
  };
  generateLevel(state, 1);
  return state;
}

// ---------------------------------------------------------------------------
// Ball factory
// ---------------------------------------------------------------------------

export function createBall(x: number, y: number): Ball {
  // Aim slightly upward with a small random horizontal bias
  const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
  return {
    x,
    y,
    vx: Math.cos(angle) * BB.BALL_SPEED,
    vy: Math.sin(angle) * BB.BALL_SPEED,
    radius: BB.BALL_RADIUS,
    fireball: false,
    active: true,
  };
}

// ---------------------------------------------------------------------------
// Level generator
// ---------------------------------------------------------------------------

type PatternFn = (col: number, row: number, cols: number, rows: number) => BrickType | null;

/** Return a BrickType with difficulty scaling: higher levels + player performance mix in tougher bricks. */
function scaledType(base: BrickType, level: number, _col: number, _row: number, bestCombo: number): BrickType {
  if (base === BrickType.GOLD || base === BrickType.EXPLOSIVE) return base;
  // Adaptive: good players (high combos) face harder brick mixes
  const comboScale = 1 + Math.min(bestCombo, 20) * 0.02; // up to 1.4x at 20 combo
  const r = Math.random();
  if (level >= 7 && r < 0.08 * comboScale) return BrickType.EXPLOSIVE;
  if (level >= 5 && r < 0.15 * comboScale) return BrickType.METAL;
  if (level >= 3 && r < 0.25 * comboScale) return BrickType.STRONG;
  return base;
}

// ---- Pattern 1: Full grid ------------------------------------------------
const patternFullGrid: PatternFn = (_c, _r, _cols, _rows) => BrickType.NORMAL;

// ---- Pattern 2: Checkerboard ---------------------------------------------
const patternCheckerboard: PatternFn = (c, r) =>
  (c + r) % 2 === 0 ? BrickType.NORMAL : null;

// ---- Pattern 3: Diamond --------------------------------------------------
const patternDiamond: PatternFn = (c, r, cols, rows) => {
  const cx = (cols - 1) / 2;
  const cy = (rows - 1) / 2;
  const dist = Math.abs(c - cx) / cx + Math.abs(r - cy) / cy;
  return dist <= 1 ? BrickType.NORMAL : null;
};

// ---- Pattern 4: Pyramid --------------------------------------------------
const patternPyramid: PatternFn = (c, r, cols, rows) => {
  const halfSpan = Math.floor(((rows - r) / rows) * (cols / 2));
  const center = Math.floor(cols / 2);
  return c >= center - halfSpan && c <= center + halfSpan ? BrickType.NORMAL : null;
};

// ---- Pattern 5: Fortress (walls + battlements) ---------------------------
const patternFortress: PatternFn = (c, r, cols, rows) => {
  // Left and right walls
  if (c === 0 || c === cols - 1) return BrickType.METAL;
  // Top battlement
  if (r === 0 && c % 2 === 0) return BrickType.STRONG;
  if (r === 0) return null;
  // Fill rows 1-2
  if (r <= 2) return BrickType.NORMAL;
  // Gate opening in center bottom
  if (r >= rows - 2 && c >= cols / 2 - 2 && c <= cols / 2 + 1) return null;
  if (r >= rows - 2) return BrickType.STRONG;
  return null;
};

// ---- Pattern 6: Stripes --------------------------------------------------
const patternStripes: PatternFn = (_c, r) => {
  if (r % 3 === 0) return null;
  return r % 3 === 1 ? BrickType.STRONG : BrickType.NORMAL;
};

// ---- Pattern 7: Cross ----------------------------------------------------
const patternCross: PatternFn = (c, r, cols, rows) => {
  const cx = Math.floor(cols / 2);
  const cy = Math.floor(rows / 2);
  if (c >= cx - 1 && c <= cx) return BrickType.NORMAL;
  if (r >= cy - 1 && r <= cy) return BrickType.NORMAL;
  return null;
};

// ---- Pattern 8: Spiral border --------------------------------------------
const patternBorder: PatternFn = (c, r, cols, rows) => {
  if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) return BrickType.METAL;
  if (r === 2 || r === rows - 3) return BrickType.NORMAL;
  return null;
};

// ---- Pattern 9: Random scatter with gold obstacles -----------------------
const patternScatter: PatternFn = (c, r, cols, rows) => {
  const cx = Math.floor(cols / 2);
  const cy = Math.floor(rows / 2);
  // Gold cross in center
  if ((c === cx || c === cx - 1) && (r === cy || r === cy - 1)) return BrickType.GOLD;
  return Math.random() < 0.55 ? BrickType.NORMAL : null;
};

// ---- Pattern 10: Grand Finale – dense with everything --------------------
const patternFinale: PatternFn = (c, r, cols, rows) => {
  // Gold corners
  if ((c < 2 || c >= cols - 2) && (r < 2 || r >= rows - 2)) return BrickType.GOLD;
  // Explosive diagonal
  if (c === r || c === cols - 1 - r) return BrickType.EXPLOSIVE;
  return BrickType.STRONG;
};

// ---- Pattern 11: Spiral ---------------------------------------------------
const patternSpiral: PatternFn = (c, r, cols, rows) => {
  const cx = (cols - 1) / 2, cy = (rows - 1) / 2;
  const angle = Math.atan2(r - cy, c - cx);
  const dist = Math.sqrt((c - cx) ** 2 + (r - cy) ** 2);
  const spiralVal = (angle + dist * 0.5) % (Math.PI / 2);
  if (spiralVal < Math.PI / 4) return dist < 2 ? BrickType.GOLD : BrickType.NORMAL;
  return BrickType.STRONG;
};

// ---- Pattern 12: Explosive Maze -------------------------------------------
const patternMaze: PatternFn = (c, r, cols) => {
  if (c % 3 === 0 && r % 2 === 0) return BrickType.METAL;
  if (c % 3 === 1 && r % 2 === 1) return BrickType.EXPLOSIVE;
  if ((c + r) % 4 === 0) return BrickType.GOLD;
  return Math.random() < 0.6 ? BrickType.NORMAL : null;
};

// ---- Pattern 13: Bullseye -------------------------------------------------
const patternBullseye: PatternFn = (c, r, cols, rows) => {
  const cx = (cols - 1) / 2, cy = (rows - 1) / 2;
  const dist = Math.sqrt((c - cx) ** 2 + ((r - cy) * 1.5) ** 2);
  if (dist < 1.5) return BrickType.GOLD;
  if (dist < 3) return BrickType.EXPLOSIVE;
  if (dist < 4.5) return BrickType.METAL;
  if (dist < 6) return BrickType.STRONG;
  return BrickType.NORMAL;
};

// ---- Pattern 14: Zigzag Fortress ------------------------------------------
const patternZigzag: PatternFn = (c, r, cols) => {
  const shifted = (r % 2 === 0) ? c : cols - 1 - c;
  if (shifted < 2) return BrickType.METAL;
  if (r % 3 === 0) return BrickType.STRONG;
  return BrickType.NORMAL;
};

// ---- Pattern 15: Endgame Chaos --------------------------------------------
const patternEndgame: PatternFn = (c, r, cols, rows) => {
  const cx = (cols - 1) / 2, cy = (rows - 1) / 2;
  if ((c + r) % 2 === 0) {
    if (Math.abs(c - cx) < 2 && Math.abs(r - cy) < 2) return BrickType.GOLD;
    return BrickType.METAL;
  }
  if (c === 0 || c === cols - 1) return BrickType.EXPLOSIVE;
  return BrickType.STRONG;
};

const PATTERNS: PatternFn[] = [
  patternFullGrid,    // level 1
  patternCheckerboard,// level 2
  patternDiamond,     // level 3
  patternPyramid,     // level 4
  patternFortress,    // level 5
  patternStripes,     // level 6
  patternCross,       // level 7
  patternBorder,      // level 8
  patternScatter,     // level 9
  patternFinale,      // level 10
  patternSpiral,      // level 11
  patternMaze,        // level 12
  patternBullseye,    // level 13
  patternZigzag,      // level 14
  patternEndgame,     // level 15
];

export function generateLevel(state: BreakerState, level: number): void {
  const patIdx = Math.min(level - 1, PATTERNS.length - 1);
  const pattern = PATTERNS[patIdx];
  const bricks: Brick[] = [];

  for (let r = 0; r < BB.BRICK_ROWS; r++) {
    for (let c = 0; c < BB.BRICK_COLS; c++) {
      const baseType = pattern(c, r, BB.BRICK_COLS, BB.BRICK_ROWS);
      if (baseType === null) continue;

      const type = scaledType(baseType, level, c, r, state.bestCombo);
      bricks.push({
        col: c,
        row: r,
        type,
        hp: BRICK_HP[type] ?? 1,
        active: true,
      });
    }
  }

  state.bricks = bricks;
  state.level = level;
  state.balls = [];
  state.powerUps = [];
  state.lasers = [];

  // Reset paddle to center
  state.paddle.x = BB.FIELD_W / 2;
  state.paddle.width = BB.PADDLE_W;
  state.paddle.baseWidth = BB.PADDLE_W;
  state.paddle.wideTimer = 0;
  state.paddle.laserTimer = 0;
  state.paddle.laserCooldown = 0;
  state.paddle.vx = 0;
  state.slowTimer = 0;

  // Spawn initial ball above paddle
  state.balls.push(createBall(state.paddle.x, BB.PADDLE_Y - 15));
}

// ---------------------------------------------------------------------------
// Meta persistence (localStorage)
// ---------------------------------------------------------------------------

export function loadBreakerMeta(): BreakerMeta {
  const defaults: BreakerMeta = {
    highScore: 0,
    bestLevel: 0,
    totalBricks: 0,
    gamesPlayed: 0,
  };
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}

export function saveBreakerMeta(meta: BreakerMeta): void {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    // Storage unavailable — silently ignore
  }
}
