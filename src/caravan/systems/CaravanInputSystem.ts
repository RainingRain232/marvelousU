// ---------------------------------------------------------------------------
// Caravan input — WASD movement, dash, pause, hold position, abilities
// ---------------------------------------------------------------------------

import { CaravanBalance } from "../config/CaravanBalanceConfig";
import { CaravanAbilitySystem } from "./CaravanAbilitySystem";
import { CaravanSFX } from "./CaravanSFX";
import type { CaravanState } from "../state/CaravanState";

const KEY_MAP: Record<string, keyof CaravanState["input"]> = {
  KeyW: "up",
  KeyA: "left",
  KeyS: "down",
  KeyD: "right",
  ArrowUp: "up",
  ArrowLeft: "left",
  ArrowDown: "down",
  ArrowRight: "right",
};

let _state: CaravanState | null = null;
let _pauseCallback: ((paused: boolean) => void) | null = null;
let _holdCallback: ((holding: boolean) => void) | null = null;
let _abilityCallback: ((index: number, name: string) => void) | null = null;
let _dashCallback: (() => void) | null = null;

function _onKeyDown(e: KeyboardEvent): void {
  if (!_state) return;

  if (e.code === "Escape") {
    if (!_state.gameOver && _state.phase === "travel") {
      _state.paused = !_state.paused;
      _pauseCallback?.(_state.paused);
    }
    e.preventDefault();
    return;
  }

  // Only process combat inputs during travel
  if (_state.paused || _state.gameOver || _state.phase !== "travel") {
    const dir = KEY_MAP[e.code];
    if (dir) e.preventDefault();
    return;
  }

  // Time scale toggle (X key)
  if (e.code === "KeyX") {
    _state.timeScale = _state.timeScale >= 3 ? 1 : _state.timeScale + 1;
    _holdCallback?.(_state.timeScale > 1); // reuse callback for notification
    e.preventDefault();
    return;
  }

  // Sprint (Shift)
  if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
    if (_state.sprintCooldown <= 0 && _state.sprintTimer <= 0) {
      _state.sprintTimer = 2.0; // 2 second sprint
      _state.sprintCooldown = 8.0; // 8 second cooldown
      CaravanSFX.dash();
    }
    e.preventDefault();
    return;
  }

  // Rally escorts (R)
  if (e.code === "KeyR") {
    // Reset all escort targets to caravan
    for (const esc of _state.escorts) {
      if (!esc.alive) continue;
      esc.targetId = null;
    }
    _holdCallback?.(false); // visual feedback reuse
    e.preventDefault();
    return;
  }

  // Parry (F key)
  if (e.code === "KeyF") {
    if (_state.parryCooldown <= 0 && _state.parryTimer <= 0) {
      _state.parryTimer = 0.4; // 0.4s parry window
      _state.parryCooldown = 2.5; // 2.5s cooldown
      CaravanSFX.dash(); // reuse dash sound
    }
    e.preventDefault();
    return;
  }

  // Hold position toggle
  if (e.code === "KeyH") {
    _state.holdPosition = !_state.holdPosition;
    _holdCallback?.(_state.holdPosition);
    e.preventDefault();
    return;
  }

  // Ability keys — check against hero class ability bindings
  for (let i = 0; i < _state.player.abilities.length; i++) {
    if (e.code === _state.player.abilities[i].def.keyCode) {
      const activated = CaravanAbilitySystem.activate(_state, i);
      if (activated) {
        _abilityCallback?.(i, _state.player.abilities[i].def.name);
      }
      e.preventDefault();
      return;
    }
  }

  // Dash
  if (e.code === "Space") {
    const p = _state.player;
    if (p.dashCooldownTimer <= 0 && p.dashTimer <= 0) {
      let dx = 0, dy = 0;
      if (_state.input.left) dx -= 1;
      if (_state.input.right) dx += 1;
      if (_state.input.up) dy -= 1;
      if (_state.input.down) dy += 1;
      if (dx === 0 && dy === 0) dx = 1;
      const len = Math.sqrt(dx * dx + dy * dy);
      p.dashDirX = dx / len;
      p.dashDirY = dy / len;
      p.dashTimer = CaravanBalance.DASH_DURATION;
      p.dashCooldownTimer = CaravanBalance.DASH_COOLDOWN;
      p.invincibilityTimer = Math.max(p.invincibilityTimer, CaravanBalance.DASH_IFRAMES);
      CaravanSFX.dash();
      _dashCallback?.();
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

export const CaravanInputSystem = {
  init(state: CaravanState): void {
    _state = state;
    window.addEventListener("keydown", _onKeyDown);
    window.addEventListener("keyup", _onKeyUp);
  },

  setPauseCallback(cb: ((paused: boolean) => void) | null): void { _pauseCallback = cb; },
  setHoldCallback(cb: ((holding: boolean) => void) | null): void { _holdCallback = cb; },
  setAbilityCallback(cb: ((index: number, name: string) => void) | null): void { _abilityCallback = cb; },
  setDashCallback(cb: (() => void) | null): void { _dashCallback = cb; },

  update(state: CaravanState, dt: number): void {
    if (state.phase !== "travel") return;
    const p = state.player;

    // Dash movement
    if (p.dashTimer > 0) {
      p.dashTimer -= dt;
      p.position.x += p.dashDirX * CaravanBalance.DASH_SPEED * dt;
      p.position.y += p.dashDirY * CaravanBalance.DASH_SPEED * dt;
    } else {
      let dx = 0, dy = 0;
      if (state.input.left) dx -= 1;
      if (state.input.right) dx += 1;
      if (state.input.up) dy -= 1;
      if (state.input.down) dy += 1;
      if (dx !== 0 || dy !== 0) {
        const len = Math.sqrt(dx * dx + dy * dy);
        dx /= len;
        dy /= len;
        const sprintMult = state.sprintTimer > 0 ? 1.6 : 1.0;
        p.position.x += dx * p.speed * sprintMult * dt;
        p.position.y += dy * p.speed * sprintMult * dt;
      }
    }

    p.position.x = Math.max(0.5, Math.min(state.mapWidth - 0.5, p.position.x));
    p.position.y = Math.max(0.5, Math.min(state.mapHeight - 0.5, p.position.y));

    if (p.dashCooldownTimer > 0) p.dashCooldownTimer -= dt;
    if (p.invincibilityTimer > 0) p.invincibilityTimer -= dt;

    // Sprint timer
    if (state.sprintTimer > 0) state.sprintTimer -= dt;
    if (state.sprintCooldown > 0) state.sprintCooldown -= dt;

    // Kill streak decay
    if (state.killStreakTimer > 0) {
      state.killStreakTimer -= dt;
      if (state.killStreakTimer <= 0) state.killStreak = 0;
    }
  },

  destroy(): void {
    window.removeEventListener("keydown", _onKeyDown);
    window.removeEventListener("keyup", _onKeyUp);
    _state = null;
    _pauseCallback = null;
    _holdCallback = null;
    _abilityCallback = null;
    _dashCallback = null;
  },
};
