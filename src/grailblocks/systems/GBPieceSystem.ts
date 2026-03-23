// Grail Blocks – Core Piece Logic (pure logic, no PixiJS)

import { GBState, ActivePiece, PieceType } from "../types.ts";
import { GB_BALANCE as B, PIECE_SHAPES, PIECE_COLOR_INDEX } from "../config/GBBalance.ts";
import { randomPiece } from "../state/GBState.ts";

// ---------------------------------------------------------------------------
// Matrix helpers
// ---------------------------------------------------------------------------

/** Return the 4x4 matrix for a piece type at a given rotation (0-3). */
export function getMatrix(type: PieceType, rotation: number): number[][] {
  const rotations = PIECE_SHAPES[type];
  return rotations[((rotation % 4) + 4) % 4];
}

/**
 * Check whether `piece` fits on the `grid` at its current position.
 * Returns true when every filled cell of the piece matrix falls within
 * bounds and does not overlap an occupied grid cell.
 */
export function canPlace(grid: number[][], piece: ActivePiece): boolean {
  const mat = getMatrix(piece.type, piece.rotation);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (!mat[r][c]) continue;
      const gx = piece.x + c;
      const gy = piece.y + r;
      if (gx < 0 || gx >= B.GRID_W || gy < 0 || gy >= B.GRID_H) return false;
      if (grid[gy][gx] !== 0) return false;
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// Movement
// ---------------------------------------------------------------------------

/** Move active piece one cell left if valid. */
export function moveLeft(state: GBState): void {
  const p = state.activePiece;
  if (!p) return;
  const test: ActivePiece = { ...p, x: p.x - 1 };
  if (canPlace(state.grid, test)) {
    p.x -= 1;
    state.lastRotated = false;
    // Reset lock timer when piece moves horizontally while grounded
    if (!canPlace(state.grid, { ...p, y: p.y + 1 })) {
      state.lockTimer = 0;
    }
  }
}

/** Move active piece one cell right if valid. */
export function moveRight(state: GBState): void {
  const p = state.activePiece;
  if (!p) return;
  const test: ActivePiece = { ...p, x: p.x + 1 };
  if (canPlace(state.grid, test)) {
    p.x += 1;
    state.lastRotated = false;
    if (!canPlace(state.grid, { ...p, y: p.y + 1 })) {
      state.lockTimer = 0;
    }
  }
}

// ---------------------------------------------------------------------------
// Rotation with wall kicks
// ---------------------------------------------------------------------------

/** Rotate with wall-kick attempts. dir: +1 = CW, -1 = CCW */
function _rotateDir(state: GBState, dir: 1 | -1): void {
  const p = state.activePiece;
  if (!p) return;
  const newRot = ((p.rotation + dir) % 4 + 4) % 4;
  const kicks = [0, -1, 1, -2, 2];
  for (const dx of kicks) {
    const test: ActivePiece = { ...p, rotation: newRot, x: p.x + dx };
    if (canPlace(state.grid, test)) {
      p.rotation = newRot;
      p.x += dx;
      state.lastRotated = true;
      if (!canPlace(state.grid, { ...p, y: p.y + 1 })) {
        state.lockTimer = 0;
      }
      return;
    }
  }
  for (const dy of [-1, -2]) {
    const test: ActivePiece = { ...p, rotation: newRot, y: p.y + dy };
    if (canPlace(state.grid, test)) {
      p.rotation = newRot;
      p.y += dy;
      state.lastRotated = true;
      return;
    }
  }
}

/** Rotate CW. */
export function rotate(state: GBState): void { _rotateDir(state, 1); }

/** Rotate CCW (counter-clockwise). */
export function rotateCCW(state: GBState): void { _rotateDir(state, -1); }

/** Rotate 180 degrees. */
export function rotate180(state: GBState): void { _rotateDir(state, 1); _rotateDir(state, 1); }

// ---------------------------------------------------------------------------
// Dropping
// ---------------------------------------------------------------------------

/** Move piece down 1 row. Returns true if it moved, false if blocked. */
export function softDrop(state: GBState): boolean {
  const p = state.activePiece;
  if (!p) return false;
  const test: ActivePiece = { ...p, y: p.y + 1 };
  if (canPlace(state.grid, test)) {
    p.y += 1;
    state.score += B.SOFT_DROP_SCORE;
    state.lockTimer = 0;
    return true;
  }
  return false;
}

/** Drop piece to lowest valid row instantly, then lock. Returns rows dropped. */
export function hardDrop(state: GBState): number {
  const p = state.activePiece;
  if (!p) return 0;
  let rows = 0;
  while (canPlace(state.grid, { ...p, y: p.y + 1 })) {
    p.y += 1;
    rows++;
  }
  state.score += rows * B.HARD_DROP_SCORE;
  lockPiece(state);
  return rows;
}

/**
 * Return the Y position the piece would land at if hard-dropped.
 * Useful for ghost piece rendering.
 */
export function ghostY(grid: number[][], piece: ActivePiece): number {
  let gy = piece.y;
  while (canPlace(grid, { ...piece, y: gy + 1 })) {
    gy += 1;
  }
  return gy;
}

// ---------------------------------------------------------------------------
// Locking & line clearing
// ---------------------------------------------------------------------------

/** Write piece cells into the grid using the piece's color index. */
export function lockPiece(state: GBState): void {
  const p = state.activePiece;
  if (!p) return;
  const mat = getMatrix(p.type, p.rotation);
  const colorIdx = PIECE_COLOR_INDEX[p.type];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (!mat[r][c]) continue;
      const gx = p.x + c;
      const gy = p.y + r;
      if (gy >= 0 && gy < B.GRID_H && gx >= 0 && gx < B.GRID_W) {
        state.grid[gy][gx] = colorIdx;
      }
    }
  }
  state.activePiece = null;
  state.piecesPlaced++;
}

/** Check if the last locked piece was a T-spin (T piece with 3+ corners occupied). */
function detectTSpin(grid: number[][], type: PieceType, x: number, y: number, lastRotated: boolean): boolean {
  if (type !== PieceType.T || !lastRotated) return false;
  // T-spin: check 4 corners of the T piece's center (at x+1, y+1)
  const cx = x + 1;
  const cy = y + 1;
  let filledCorners = 0;
  for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const gx = cx + dx;
    const gy = cy + dy;
    if (gx < 0 || gx >= B.GRID_W || gy < 0 || gy >= B.GRID_H || grid[gy][gx] !== 0) {
      filledCorners++;
    }
  }
  return filledCorners >= 3;
}

/**
 * Find fully-filled rows, remove them, shift everything above down.
 * Updates score, level, grailPower, combo. Returns number of lines cleared.
 */
export function clearLines(state: GBState, lockedType?: PieceType, lockedX?: number, lockedY?: number): number {
  const fullRows: number[] = [];
  for (let r = 0; r < B.GRID_H; r++) {
    if (state.grid[r].every((cell) => cell !== 0)) {
      fullRows.push(r);
    }
  }
  if (fullRows.length === 0) {
    state.combo = 0;
    state.lastClearText = "";
    return 0;
  }

  // Check if any cleared rows contain garbage blocks
  let garbageCleared = 0;
  for (const row of fullRows) {
    if (state.grid[row].some(cell => cell === 8)) garbageCleared++;
  }

  // Remove full rows and add empty rows at top
  for (const row of fullRows) {
    state.grid.splice(row, 1);
    state.grid.unshift(new Array(B.GRID_W).fill(0));
  }

  const count = fullRows.length;
  state.linesCleared += count;

  // T-spin detection
  const isTSpin = lockedType !== undefined && lockedX !== undefined && lockedY !== undefined
    ? detectTSpin(state.grid, lockedType, lockedX, lockedY, state.lastRotated)
    : false;
  const isTetris = count === 4;
  const isDifficult = isTSpin || isTetris;

  // Build clear text
  const lineNames = ["", "SINGLE", "DOUBLE", "TRIPLE", "TETRIS"];
  let clearText = isTSpin ? `T-SPIN ${lineNames[count]}!` : (count === 4 ? "TETRIS!" : lineNames[count]);

  // Score: base line score + T-spin bonus + back-to-back bonus + combo
  let baseScore: number = B.LINE_SCORES[Math.min(count, 4)] ?? B.LINE_SCORES[4];
  if (isTSpin) baseScore = Math.floor(baseScore * 1.5); // T-spin 50% bonus

  state.combo += 1;
  const comboBonus = (state.combo - 1) * B.COMBO_BONUS;

  // Back-to-back: consecutive difficult clears (T-spin or Tetris)
  let b2bMult = 1;
  if (isDifficult && state.lastWasDifficult) {
    b2bMult = 1.5;
    clearText = "B2B " + clearText;
  }
  // Track B2B streak count
  if (isDifficult) {
    state.b2bCount++;
  } else {
    state.b2bCount = 0;
  }
  state.lastWasDifficult = isDifficult;

  // Garbage clear bonus
  if (garbageCleared > 0) {
    state.score += garbageCleared * 50 * state.level;
    clearText += " +GARBAGE";
  }

  state.score += Math.floor((baseScore + comboBonus) * state.level * b2bMult);
  state.lastClearText = clearText;

  // Perfect clear detection (entire grid empty)
  const isPerfectClear = state.grid.every(row => row.every(cell => cell === 0));
  if (isPerfectClear) {
    state.score += 10000 * state.level;
    state.lastClearText = "PERFECT CLEAR!";
  }

  // Level up
  state.level = Math.floor(state.linesCleared / B.LINES_PER_LEVEL) + 1;

  // Grail Power charge
  state.grailPower = Math.min(
    state.grailPowerMax,
    state.grailPower + count * B.GRAIL_CHARGE_PER_LINE,
  );

  return count;
}

/** Returns the row indices that are currently full (for FX before clearing). */
export function getFullRows(grid: number[][]): number[] {
  const rows: number[] = [];
  for (let r = 0; r < B.GRID_H; r++) {
    if (grid[r].every((cell) => cell !== 0)) {
      rows.push(r);
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Game over detection
// ---------------------------------------------------------------------------

/** Check if any cell in the top 2 rows is occupied (game over condition). */
export function isGameOver(state: GBState): boolean {
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < B.GRID_W; c++) {
      if (state.grid[r][c] !== 0) return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Hold piece
// ---------------------------------------------------------------------------

/** Swap active piece with held piece (or store current and spawn next). */
export function holdPiece(state: GBState): void {
  if (!state.canHold || !state.activePiece) return;
  const currentType = state.activePiece.type;
  if (state.heldPiece) {
    // Swap: active becomes held, held becomes new active
    state.activePiece = {
      type: state.heldPiece,
      x: 3,
      y: 0,
      rotation: 0,
    };
    state.heldPiece = currentType;
  } else {
    // No held piece yet: store current, spawn next from queue
    state.heldPiece = currentType;
    state.activePiece = {
      type: state.nextQueue[0],
      x: 3,
      y: 0,
      rotation: 0,
    };
    state.nextQueue.shift();
    state.nextQueue.push(randomPiece());
  }
  state.canHold = false;
  state.lockTimer = 0;
}

// ---------------------------------------------------------------------------
// Grail Power
// ---------------------------------------------------------------------------

/** If grailPower is at max, clear the bottom N rows and reset the meter. */
export function activateGrailPower(state: GBState): boolean {
  if (state.grailPower < state.grailPowerMax) return false;

  const rowsToClear = B.GRAIL_CLEAR_ROWS;
  // Remove bottom rows
  state.grid.splice(B.GRID_H - rowsToClear, rowsToClear);
  // Add empty rows at top
  for (let i = 0; i < rowsToClear; i++) {
    state.grid.unshift(new Array(B.GRID_W).fill(0));
  }

  state.grailPower = 0;
  return true;
}

// ---------------------------------------------------------------------------
// Garbage lines (rising challenge)
// ---------------------------------------------------------------------------

/**
 * Add garbage lines from below. Each garbage line is a full row with one random gap.
 * Pushes existing blocks upward. Returns true if blocks were pushed into death zone.
 */
export function addGarbageLines(state: GBState, count: number): boolean {
  for (let i = 0; i < count; i++) {
    // Remove top row
    state.grid.shift();
    // Add garbage row at bottom (all filled except one random gap)
    const gapCol = Math.floor(Math.random() * B.GRID_W);
    const garbageRow = new Array(B.GRID_W).fill(8); // 8 = garbage color
    garbageRow[gapCol] = 0;
    state.grid.push(garbageRow);
  }
  // Check if this pushed blocks into the danger zone
  return state.grid[0].some(c => c !== 0);
}

// ---------------------------------------------------------------------------
// Drop interval helper
// ---------------------------------------------------------------------------

/** Current drop interval in seconds based on the level. */
export function getDropInterval(level: number): number {
  return Math.max(
    B.MIN_DROP_INTERVAL,
    B.BASE_DROP_INTERVAL - (level - 1) * B.LEVEL_SPEED_FACTOR,
  );
}
