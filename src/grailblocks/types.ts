// Grail Blocks – Medieval Puzzle Types

export enum GBPhase {
  MENU = "menu",
  PLAYING = "playing",
  PAUSED = "paused",
  GAME_OVER = "game_over",
}

export enum PieceType {
  I = "I", O = "O", T = "T", S = "S", Z = "Z", L = "L", J = "J",
}

/** 4x4 rotation matrix for a piece (1 = filled, 0 = empty) */
export type PieceMatrix = number[][];

export interface ActivePiece {
  type: PieceType;
  x: number;       // grid column (top-left of matrix)
  y: number;       // grid row (top-left, can be fractional for smooth drop)
  rotation: number; // 0-3
}

export interface GBState {
  phase: GBPhase;
  grid: number[][];  // 10x20, 0 = empty, 1-7 = piece type color index
  activePiece: ActivePiece | null;
  nextQueue: PieceType[];  // 3-piece preview queue
  heldPiece: PieceType | null;
  canHold: boolean;
  score: number;
  level: number;
  linesCleared: number;
  grailPower: number;     // 0-100, charges on line clears
  grailPowerMax: number;
  dropTimer: number;
  lockTimer: number;
  time: number;
  combo: number;
  highScore: number;
  lastWasDifficult: boolean;
  lastRotated: boolean;
  lastClearText: string;
  b2bCount: number;  // current back-to-back streak
  piecesPlaced: number;
  mode: "marathon" | "sprint"; // marathon = endless, sprint = 40 lines
  sprintTarget: number;
}

export interface GBMeta {
  highScore: number;
  bestLevel: number;
  totalLines: number;
  gamesPlayed: number;
  sprintBestTime: number; // best sprint time in seconds (0 = no sprint completed)
}
