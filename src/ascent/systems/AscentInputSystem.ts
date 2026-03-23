// Camelot Ascent – Input System
// Pure logic – no rendering imports.

import type { AscentState } from "../types";
import { AscentPhase } from "../types";
import { ASCENT_BALANCE as B } from "../config/AscentBalance";

// ---------------------------------------------------------------------------
// Input state
// ---------------------------------------------------------------------------

export interface InputState {
  left: boolean;
  right: boolean;
  jump: boolean;
  attack: boolean;
  pause: boolean;
  dash: boolean;
}

const keys: Record<string, boolean> = {};
let jumpConsumed = false; // prevents holding jump from re-triggering
let attackConsumed = false; // prevents holding attack from re-triggering
let pauseConsumed = false; // prevents holding pause from re-triggering
let dashConsumed = false; // prevents holding dash from re-triggering
let listenersAttached = false;

// ---------------------------------------------------------------------------
// Keyboard listeners
// ---------------------------------------------------------------------------

function onKeyDown(e: KeyboardEvent): void {
  keys[e.key] = true;
}

function onKeyUp(e: KeyboardEvent): void {
  keys[e.key] = false;
  // Allow re-jump when key released
  if (isJumpKey(e.key)) {
    jumpConsumed = false;
  }
  if (isAttackKey(e.key)) {
    attackConsumed = false;
  }
  if (e.key === "Escape") {
    pauseConsumed = false;
  }
  if (e.key === "Shift") {
    dashConsumed = false;
  }
}

function isJumpKey(key: string): boolean {
  return key === "ArrowUp" || key === "w" || key === "W" || key === " ";
}

function isAttackKey(key: string): boolean {
  return key === "x" || key === "X" || key === "j" || key === "J";
}

/** Attach keyboard listeners. Safe to call multiple times. */
export function initInput(): void {
  if (listenersAttached) return;
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  listenersAttached = true;
}

/** Remove keyboard listeners and reset state. */
export function destroyInput(): void {
  window.removeEventListener("keydown", onKeyDown);
  window.removeEventListener("keyup", onKeyUp);
  for (const k of Object.keys(keys)) {
    keys[k] = false;
  }
  jumpConsumed = false;
  attackConsumed = false;
  pauseConsumed = false;
  dashConsumed = false;
  listenersAttached = false;
}

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

/** Returns the current input state (non-destructive read). */
export function getInput(): InputState {
  const attackRaw = !!(keys["x"] || keys["X"] || keys["j"] || keys["J"]);
  const pauseRaw = !!keys["Escape"];
  const dashRaw = !!keys["Shift"];

  const attack = attackRaw && !attackConsumed;
  if (attack) attackConsumed = true;

  const pause = pauseRaw && !pauseConsumed;
  if (pause) pauseConsumed = true;

  const dash = dashRaw && !dashConsumed;
  if (dash) dashConsumed = true;

  return {
    left: !!(keys["ArrowLeft"] || keys["a"] || keys["A"]),
    right: !!(keys["ArrowRight"] || keys["d"] || keys["D"]),
    jump: !!(keys["ArrowUp"] || keys["w"] || keys["W"] || keys[" "]),
    attack,
    pause,
    dash,
  };
}

/** Check if a number key (1-4) is pressed (for shop). */
export function getNumberKey(): number {
  if (keys["1"]) return 1;
  if (keys["2"]) return 2;
  if (keys["3"]) return 3;
  if (keys["4"]) return 4;
  return 0;
}

let numberKeyConsumed = false;

/** Returns a number key press that hasn't been consumed yet. */
export function getNumberKeyOnce(): number {
  const k = getNumberKey();
  if (k === 0) {
    numberKeyConsumed = false;
    return 0;
  }
  if (numberKeyConsumed) return 0;
  numberKeyConsumed = true;
  return k;
}

// ---------------------------------------------------------------------------
// Apply input to state
// ---------------------------------------------------------------------------

/**
 * Reads input and applies movement / jump to the player.
 * Call once per frame before the physics update.
 */
export function applyInput(state: AscentState, providedInput?: InputState): void {
  if (state.phase !== AscentPhase.PLAYING) return;

  const input = providedInput ?? getInput();
  const { player } = state;

  // Horizontal movement
  if (input.left && input.right) {
    player.vx = 0;
  } else if (input.left) {
    player.vx = -B.MOVE_SPEED;
  } else if (input.right) {
    player.vx = B.MOVE_SPEED;
  } else {
    player.vx = 0;
  }

  // Jump (including wall-jump)
  if (input.jump && !jumpConsumed) {
    if (player.wallSliding) {
      // Wall-jump: kick away from wall + jump
      const wallDir = player.x <= 0 ? 1 : -1; // kick away from whichever wall
      player.vx = wallDir * 150;
      player.vy = B.JUMP_VELOCITY;
      player.jumpsLeft = 1;
      player.grounded = false;
      player.wallSliding = false;
      jumpConsumed = true;
    } else if (player.jumpsLeft > 0) {
      player.vy = B.JUMP_VELOCITY;
      player.jumpsLeft -= 1;
      player.grounded = false;
      jumpConsumed = true;
    }
  }
}
