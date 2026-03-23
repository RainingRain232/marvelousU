// Grail Blocks – Balance Configuration

import { PieceMatrix } from "../types";

export const GB_BALANCE = {
  GRID_W: 10,
  GRID_H: 20,
  CELL_SIZE: 28,

  // Scoring
  LINE_SCORES: [0, 100, 300, 500, 800], // 0,1,2,3,4 lines
  SOFT_DROP_SCORE: 1,   // per cell
  HARD_DROP_SCORE: 2,   // per cell

  // Speed (seconds per drop step)
  BASE_DROP_INTERVAL: 0.8,
  MIN_DROP_INTERVAL: 0.05,
  LEVEL_SPEED_FACTOR: 0.05, // subtract per level

  // Leveling
  LINES_PER_LEVEL: 10,

  // Lock delay
  LOCK_DELAY: 0.5,   // seconds before piece locks after landing

  // Grail Power
  GRAIL_CHARGE_PER_LINE: 25,  // 4 lines = full charge
  GRAIL_MAX: 100,
  GRAIL_CLEAR_ROWS: 2,        // clears bottom 2 rows when activated

  // Garbage lines (marathon mode rising challenge)
  GARBAGE_START_LEVEL: 5,       // garbage starts appearing at level 5
  GARBAGE_INTERVAL: 30,         // seconds between garbage line pushes
  GARBAGE_INTERVAL_MIN: 10,     // minimum interval at high levels
  GARBAGE_LINES_PER_PUSH: 1,    // lines added per push

  // DAS (Delayed Auto Shift)
  DAS_DELAY: 0.15,
  DAS_REPEAT: 0.05,

  // Combo
  COMBO_BONUS: 50, // per combo level
} as const;

// Piece definitions: each rotation state as a 4x4 grid
export const PIECE_SHAPES: Record<string, PieceMatrix[]> = {
  I: [
    [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
    [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
    [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]],
  ],
  O: [
    [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
  ],
  T: [
    [[0,1,0,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,0,0],[0,1,1,0],[0,1,0,0],[0,0,0,0]],
    [[0,0,0,0],[1,1,1,0],[0,1,0,0],[0,0,0,0]],
    [[0,1,0,0],[1,1,0,0],[0,1,0,0],[0,0,0,0]],
  ],
  S: [
    [[0,1,1,0],[1,1,0,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,0,0],[0,1,1,0],[0,0,1,0],[0,0,0,0]],
    [[0,0,0,0],[0,1,1,0],[1,1,0,0],[0,0,0,0]],
    [[1,0,0,0],[1,1,0,0],[0,1,0,0],[0,0,0,0]],
  ],
  Z: [
    [[1,1,0,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,0,1,0],[0,1,1,0],[0,1,0,0],[0,0,0,0]],
    [[0,0,0,0],[1,1,0,0],[0,1,1,0],[0,0,0,0]],
    [[0,1,0,0],[1,1,0,0],[1,0,0,0],[0,0,0,0]],
  ],
  L: [
    [[0,0,1,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,0,0],[0,1,0,0],[0,1,1,0],[0,0,0,0]],
    [[0,0,0,0],[1,1,1,0],[1,0,0,0],[0,0,0,0]],
    [[1,1,0,0],[0,1,0,0],[0,1,0,0],[0,0,0,0]],
  ],
  J: [
    [[1,0,0,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[0,1,1,0],[0,1,0,0],[0,1,0,0],[0,0,0,0]],
    [[0,0,0,0],[1,1,1,0],[0,0,1,0],[0,0,0,0]],
    [[0,1,0,0],[0,1,0,0],[1,1,0,0],[0,0,0,0]],
  ],
};

// Color index per piece type (used for grid storage)
export const PIECE_COLOR_INDEX: Record<string, number> = {
  I: 1, O: 2, T: 3, S: 4, Z: 5, L: 6, J: 7,
};

// Actual colors for rendering
export const PIECE_COLORS: number[] = [
  0x000000,  // 0: empty
  0x44bbcc,  // 1: I - cyan
  0xcccc44,  // 2: O - yellow
  0xaa44cc,  // 3: T - purple
  0x44cc44,  // 4: S - green
  0xcc4444,  // 5: Z - red
  0xcc8822,  // 6: L - orange
  0x4444cc,  // 7: J - blue
  0x666666,  // 8: garbage - gray
];
