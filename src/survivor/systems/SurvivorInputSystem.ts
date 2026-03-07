// ---------------------------------------------------------------------------
// Survivor input — WASD / arrow key movement + dash + pause
// ---------------------------------------------------------------------------

import { SurvivorBalance } from "../config/SurvivorBalanceConfig";
import type { SurvivorState } from "../state/SurvivorState";

const KEY_MAP: Record<string, keyof SurvivorState["input"]> = {
  KeyW: "up",
  KeyA: "left",
  KeyS: "down",
  KeyD: "right",
  ArrowUp: "up",
  ArrowLeft: "left",
  ArrowDown: "down",
  ArrowRight: "right",
};

let _state: SurvivorState | null = null;
let _pauseCallback: ((paused: boolean) => void) | null = null;

function _onKeyDown(e: KeyboardEvent): void {
  if (!_state) return;

  // Pause toggle
  if (e.code === "Escape") {
    if (!_state.gameOver && !_state.levelUpPending) {
      _state.paused = !_state.paused;
      _pauseCallback?.(_state.paused);
    }
    e.preventDefault();
    return;
  }

  // Dash
  if (e.code === "Space") {
    if (!_state.paused && !_state.levelUpPending && !_state.gameOver) {
      const p = _state.player;
      if (p.dashCooldownTimer <= 0 && p.dashTimer <= 0) {
        // Capture current movement direction (or face direction if standing still)
        let dx = 0, dy = 0;
        if (_state.input.left) dx -= 1;
        if (_state.input.right) dx += 1;
        if (_state.input.up) dy -= 1;
        if (_state.input.down) dy += 1;
        // Default to right if no direction held
        if (dx === 0 && dy === 0) dx = 1;
        const len = Math.sqrt(dx * dx + dy * dy);
        p.dashDirX = dx / len;
        p.dashDirY = dy / len;
        p.dashTimer = SurvivorBalance.DASH_DURATION;
        p.dashCooldownTimer = SurvivorBalance.DASH_COOLDOWN;
        p.invincibilityTimer = Math.max(p.invincibilityTimer, SurvivorBalance.DASH_IFRAMES);
      }
    }
    e.preventDefault();
    return;
  }

  const dir = KEY_MAP[e.code];
  if (dir) {
    _state.input[dir] = true;
    e.preventDefault();
  }
}

function _onKeyUp(e: KeyboardEvent): void {
  if (!_state) return;
  const dir = KEY_MAP[e.code];
  if (dir) {
    _state.input[dir] = false;
    e.preventDefault();
  }
}

export const SurvivorInputSystem = {
  init(state: SurvivorState): void {
    _state = state;
    window.addEventListener("keydown", _onKeyDown);
    window.addEventListener("keyup", _onKeyUp);
  },

  setPauseCallback(cb: (paused: boolean) => void): void {
    _pauseCallback = cb;
  },

  update(state: SurvivorState, dt: number): void {
    if (state.paused || state.levelUpPending || state.gameOver) return;

    const { input, player } = state;

    // Tick dash timers
    if (player.dashCooldownTimer > 0) player.dashCooldownTimer -= dt;
    if (player.dashTimer > 0) {
      player.dashTimer -= dt;
      // During dash, override movement with dash velocity
      const dashSpeed = SurvivorBalance.DASH_SPEED * dt;
      player.position.x += player.dashDirX * dashSpeed;
      player.position.y += player.dashDirY * dashSpeed;
      // Clamp
      player.position.x = Math.max(0.5, Math.min(state.mapWidth - 0.5, player.position.x));
      player.position.y = Math.max(0.5, Math.min(state.mapHeight - 0.5, player.position.y));
      return; // skip normal movement during dash
    }

    let dx = 0;
    let dy = 0;
    if (input.left) dx -= 1;
    if (input.right) dx += 1;
    if (input.up) dy -= 1;
    if (input.down) dy += 1;

    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
      const inv = 1 / Math.SQRT2;
      dx *= inv;
      dy *= inv;
    }

    const riderMult = state.activeLandmarkBuffs.has("rider_swift") ? 1.4 : 1.0;
    const speed = player.speed * riderMult * dt;
    player.position.x = Math.max(0.5, Math.min(state.mapWidth - 0.5, player.position.x + dx * speed));
    player.position.y = Math.max(0.5, Math.min(state.mapHeight - 0.5, player.position.y + dy * speed));
  },

  destroy(): void {
    window.removeEventListener("keydown", _onKeyDown);
    window.removeEventListener("keyup", _onKeyUp);
    _state = null;
    _pauseCallback = null;
  },
};
