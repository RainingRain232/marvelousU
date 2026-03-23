// Grail Blocks – State Factory

import { GBState, GBPhase, PieceType } from "../types";
import { GB_BALANCE as B } from "../config/GBBalance";

const ALL_PIECES: PieceType[] = [PieceType.I, PieceType.O, PieceType.T, PieceType.S, PieceType.Z, PieceType.L, PieceType.J];

// 7-piece bag randomizer — guarantees all pieces appear before repeating
let _bag: PieceType[] = [];

function _refillBag(): void {
  _bag = [...ALL_PIECES];
  // Fisher-Yates shuffle
  for (let i = _bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [_bag[i], _bag[j]] = [_bag[j], _bag[i]];
  }
}

export function randomPiece(): PieceType {
  if (_bag.length === 0) _refillBag();
  return _bag.pop()!;
}

export function resetBag(): void {
  _bag = [];
}

export function createGBState(): GBState {
  const meta = loadGBMeta();
  return {
    phase: GBPhase.MENU,
    grid: Array.from({ length: B.GRID_H }, () => new Array(B.GRID_W).fill(0)),
    activePiece: null,
    nextQueue: [randomPiece(), randomPiece(), randomPiece()],
    heldPiece: null,
    canHold: true,
    score: 0,
    level: 1,
    linesCleared: 0,
    grailPower: 0,
    grailPowerMax: B.GRAIL_MAX,
    dropTimer: 0,
    lockTimer: 0,
    time: 0,
    combo: 0,
    highScore: meta.highScore,
    lastWasDifficult: false,
    lastRotated: false,
    lastClearText: "",
    b2bCount: 0,
    piecesPlaced: 0,
    mode: "marathon",
    sprintTarget: 40,
  };
}

export function spawnPiece(state: GBState): void {
  state.activePiece = {
    type: state.nextQueue[0],
    x: 3,
    y: 0,
    rotation: 0,
  };
  state.nextQueue.shift();
  state.nextQueue.push(randomPiece());
  state.canHold = true;
  state.lockTimer = 0;
}

// Meta persistence
const META_KEY = "grail_blocks_meta";

export function loadGBMeta(): { highScore: number; bestLevel: number; totalLines: number; gamesPlayed: number; sprintBestTime: number } {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { highScore: 0, bestLevel: 0, totalLines: 0, gamesPlayed: 0, sprintBestTime: 0, ...parsed };
    }
  } catch { /* ignore */ }
  return { highScore: 0, bestLevel: 0, totalLines: 0, gamesPlayed: 0, sprintBestTime: 0 };
}

export function saveGBMeta(meta: { highScore: number; bestLevel: number; totalLines: number; gamesPlayed: number; sprintBestTime: number }): void {
  try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch { /* ignore */ }
}
