// ---------------------------------------------------------------------------
// 3Dragon mode — input system (keyboard + mouse)
// ---------------------------------------------------------------------------

import type { ThreeDragonState } from "../state/ThreeDragonState";
import { TDBalance } from "../config/ThreeDragonConfig";

let _keyDown: ((e: KeyboardEvent) => void) | null = null;
let _keyUp: ((e: KeyboardEvent) => void) | null = null;
let _mouseMove: ((e: MouseEvent) => void) | null = null;
let _mouseDown: ((e: MouseEvent) => void) | null = null;
let _mouseUp: ((e: MouseEvent) => void) | null = null;
let _pauseCallback: ((paused: boolean) => void) | null = null;
let _tabCallback: (() => void) | null = null;

export const ThreeDragonInputSystem = {
  setPauseCallback(cb: ((paused: boolean) => void) | null): void {
    _pauseCallback = cb;
  },

  setTabCallback(cb: (() => void) | null): void {
    _tabCallback = cb;
  },

  init(state: ThreeDragonState): void {
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
        case "ShiftLeft": case "ShiftRight": case "Space": inp.boost = true; break;
        case "Tab":
          e.preventDefault();
          _tabCallback?.();
          break;
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
        case "ShiftLeft": case "ShiftRight": case "Space": inp.boost = false; break;
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

  update(state: ThreeDragonState, dt: number): void {
    const p = state.player;
    const inp = state.input;

    // Boost cooldown
    if (p.boostCooldown > 0) p.boostCooldown -= dt;
    if (p.boostTimer > 0) {
      p.boostTimer -= dt;
      if (p.boostTimer <= 0) {
        p.boostActive = false;
      }
    }

    // Activate boost
    if (inp.boost && !p.boostActive && p.boostCooldown <= 0) {
      inp.boost = false;
      p.boostActive = true;
      p.boostTimer = 1.5;             // boost lasts 1.5s
      p.boostCooldown = p.boostMaxCooldown; // 5s cooldown
    }

    const boostMult = p.boostActive ? 2.0 : 1.0;
    const speedMult = state.upgradeState?.moveSpeedMult ?? 1;
    const speed = TDBalance.PLAYER_SPEED * boostMult * speedMult;

    let dx = 0, dy = 0;
    if (inp.left) dx -= 1;
    if (inp.right) dx += 1;
    if (inp.up) dy += 1;
    if (inp.down) dy -= 1;

    if (dx !== 0 && dy !== 0) {
      const inv = 1 / Math.SQRT2;
      dx *= inv;
      dy *= inv;
    }

    p.position.x += dx * speed * dt;
    p.position.y += dy * speed * dt;

    // Boost also increases forward scroll speed
    if (p.boostActive) {
      state.scrollSpeed = TDBalance.SCROLL_SPEED_BASE * 1.8;
    } else {
      state.scrollSpeed = TDBalance.SCROLL_SPEED_BASE;
    }

    // Bank angle for visual tilt
    const targetBank = -dx * 0.4;
    p.eagleBankAngle += (targetBank - p.eagleBankAngle) * 5 * dt;

    // Wing flap
    p.eagleFlapPhase += dt * 5;

    // Clamp to world bounds
    p.position.x = Math.max(TDBalance.WORLD_X_MIN, Math.min(TDBalance.WORLD_X_MAX, p.position.x));
    p.position.y = Math.max(TDBalance.WORLD_Y_MIN, Math.min(TDBalance.WORLD_Y_MAX, p.position.y));
  },

  destroy(): void {
    if (_keyDown) window.removeEventListener("keydown", _keyDown);
    if (_keyUp) window.removeEventListener("keyup", _keyUp);
    if (_mouseMove) window.removeEventListener("mousemove", _mouseMove);
    if (_mouseDown) window.removeEventListener("mousedown", _mouseDown);
    if (_mouseUp) window.removeEventListener("mouseup", _mouseUp);
    _keyDown = _keyUp = _mouseMove = _mouseDown = _mouseUp = null;
    _pauseCallback = null;
    _tabCallback = null;
  },
};
