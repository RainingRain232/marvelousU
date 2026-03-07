// ---------------------------------------------------------------------------
// Survivor input — WASD / arrow key movement
// ---------------------------------------------------------------------------

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

function _onKeyDown(e: KeyboardEvent): void {
  if (!_state) return;
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

  update(state: SurvivorState, dt: number): void {
    if (state.paused || state.levelUpPending || state.gameOver) return;

    const { input, player } = state;
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

    const speed = player.speed * dt;
    player.position.x = Math.max(0.5, Math.min(state.mapWidth - 0.5, player.position.x + dx * speed));
    player.position.y = Math.max(0.5, Math.min(state.mapHeight - 0.5, player.position.y + dy * speed));
  },

  destroy(): void {
    window.removeEventListener("keydown", _onKeyDown);
    window.removeEventListener("keyup", _onKeyUp);
    _state = null;
  },
};
