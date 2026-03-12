// ---------------------------------------------------------------------------
// Panzer Dragoon mode — input system (keyboard + mouse)
// ---------------------------------------------------------------------------

import type { DragoonState } from "../state/DragoonState";

let _keyDown: ((e: KeyboardEvent) => void) | null = null;
let _keyUp: ((e: KeyboardEvent) => void) | null = null;
let _mouseMove: ((e: MouseEvent) => void) | null = null;
let _mouseDown: ((e: MouseEvent) => void) | null = null;
let _mouseUp: ((e: MouseEvent) => void) | null = null;
let _pauseCallback: ((paused: boolean) => void) | null = null;

export const DragoonInputSystem = {
  setPauseCallback(cb: ((paused: boolean) => void) | null): void {
    _pauseCallback = cb;
  },

  init(state: DragoonState): void {
    const inp = state.input;

    _keyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case "KeyW": case "ArrowUp": inp.up = true; break;
        case "KeyS": case "ArrowDown": inp.down = true; break;
        case "KeyA": case "ArrowLeft": inp.left = true; break;
        case "KeyD": case "ArrowRight": inp.right = true; break;
        case "Digit1": inp.skill1 = true; break;
        case "Digit2": inp.skill2 = true; break;
        case "Digit3": inp.skill3 = true; break;
        case "Digit4": inp.skill4 = true; break;
        case "Digit5": inp.skill5 = true; break;
        case "Escape":
          state.paused = !state.paused;
          _pauseCallback?.(state.paused);
          break;
      }
    };

    _keyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case "KeyW": case "ArrowUp": inp.up = false; break;
        case "KeyS": case "ArrowDown": inp.down = false; break;
        case "KeyA": case "ArrowLeft": inp.left = false; break;
        case "KeyD": case "ArrowRight": inp.right = false; break;
        case "Digit1": inp.skill1 = false; break;
        case "Digit2": inp.skill2 = false; break;
        case "Digit3": inp.skill3 = false; break;
        case "Digit4": inp.skill4 = false; break;
        case "Digit5": inp.skill5 = false; break;
      }
    };

    _mouseMove = (e: MouseEvent) => {
      inp.mouseX = e.clientX;
      inp.mouseY = e.clientY;
    };

    _mouseDown = (e: MouseEvent) => {
      if (e.button === 0) inp.fire = true;
    };

    _mouseUp = (e: MouseEvent) => {
      if (e.button === 0) inp.fire = false;
    };

    window.addEventListener("keydown", _keyDown);
    window.addEventListener("keyup", _keyUp);
    window.addEventListener("mousemove", _mouseMove);
    window.addEventListener("mousedown", _mouseDown);
    window.addEventListener("mouseup", _mouseUp);
  },

  update(state: DragoonState, dt: number): void {
    const p = state.player;
    const inp = state.input;
    const speed = 320; // pixels/sec

    let dx = 0, dy = 0;
    if (inp.left) dx -= 1;
    if (inp.right) dx += 1;
    if (inp.up) dy -= 1;
    if (inp.down) dy += 1;

    // Normalize diagonal
    if (dx !== 0 && dy !== 0) {
      const inv = 1 / Math.SQRT2;
      dx *= inv;
      dy *= inv;
    }

    p.position.x += dx * speed * dt;
    p.position.y += dy * speed * dt;

    // Clamp to screen (with margin)
    const margin = 30;
    p.position.x = Math.max(margin, Math.min(state.screenW - margin, p.position.x));
    p.position.y = Math.max(margin, Math.min(state.screenH - margin, p.position.y));
  },

  destroy(): void {
    if (_keyDown) window.removeEventListener("keydown", _keyDown);
    if (_keyUp) window.removeEventListener("keyup", _keyUp);
    if (_mouseMove) window.removeEventListener("mousemove", _mouseMove);
    if (_mouseDown) window.removeEventListener("mousedown", _mouseDown);
    if (_mouseUp) window.removeEventListener("mouseup", _mouseUp);
    _keyDown = _keyUp = _mouseMove = _mouseDown = _mouseUp = null;
    _pauseCallback = null;
  },
};
