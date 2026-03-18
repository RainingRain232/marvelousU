// ---------------------------------------------------------------------------
// Eagle Flight — input system
// WASD for pitch/yaw, QE for roll, Shift/Ctrl for throttle, Esc for pause.
// ---------------------------------------------------------------------------

import type { EagleFlightState } from "../state/EagleFlightState";
import { EFBalance } from "../state/EagleFlightState";

type PauseCallback = (paused: boolean) => void;

const _keys = new Set<string>();
let _pauseCb: PauseCallback | null = null;
let _bound = false;

function _onKeyDown(e: KeyboardEvent): void {
  _keys.add(e.code);
  if (e.code === "Escape") {
    _pauseCb?.(true);
  }
}

function _onKeyUp(e: KeyboardEvent): void {
  _keys.delete(e.code);
}

export const EagleFlightInputSystem = {
  init(_state: EagleFlightState): void {
    _keys.clear();
    if (!_bound) {
      window.addEventListener("keydown", _onKeyDown);
      window.addEventListener("keyup", _onKeyUp);
      _bound = true;
    }
  },

  setPauseCallback(cb: PauseCallback): void {
    _pauseCb = cb;
  },

  update(state: EagleFlightState, dt: number): void {
    const p = state.player;

    // --- Pitch (W = nose down / dive, S = nose up / climb) ---
    let pitchInput = 0;
    if (_keys.has("KeyW") || _keys.has("ArrowUp")) pitchInput -= 1;
    if (_keys.has("KeyS") || _keys.has("ArrowDown")) pitchInput += 1;
    p.pitch += pitchInput * EFBalance.PITCH_RATE * dt;
    p.pitch = Math.max(-EFBalance.MAX_PITCH, Math.min(EFBalance.MAX_PITCH, p.pitch));

    // Gentle pitch return to level when no input
    if (pitchInput === 0) {
      p.pitch *= 1 - 0.8 * dt;
    }

    // --- Yaw (A/D) ---
    let yawInput = 0;
    if (_keys.has("KeyA") || _keys.has("ArrowLeft")) yawInput += 1;
    if (_keys.has("KeyD") || _keys.has("ArrowRight")) yawInput -= 1;
    p.yaw += yawInput * EFBalance.YAW_RATE * dt;

    // --- Roll (Q/E) ---
    let rollInput = 0;
    if (_keys.has("KeyQ")) rollInput += 1;
    if (_keys.has("KeyE")) rollInput -= 1;

    // Auto-roll based on yaw input (banking into turns)
    const autoRoll = -yawInput * 0.6;
    const targetRoll = rollInput * 0.8 + autoRoll;
    p.roll += (targetRoll - p.roll) * EFBalance.ROLL_RETURN_RATE * dt;

    // Roll returns to zero when no input
    if (rollInput === 0 && yawInput === 0) {
      p.roll *= 1 - EFBalance.ROLL_RETURN_RATE * dt;
    }

    // Clamp roll
    p.roll = Math.max(-Math.PI * 0.5, Math.min(Math.PI * 0.5, p.roll));

    // --- Throttle (Shift = faster, Ctrl = slower) ---
    if (_keys.has("ShiftLeft") || _keys.has("ShiftRight")) {
      p.targetSpeed = Math.min(EFBalance.MAX_SPEED, p.targetSpeed + EFBalance.ACCELERATION * dt);
    }
    if (_keys.has("ControlLeft") || _keys.has("ControlRight")) {
      p.targetSpeed = Math.max(EFBalance.MIN_SPEED, p.targetSpeed - EFBalance.ACCELERATION * dt);
    }

    // Smooth speed toward target
    p.speed += (p.targetSpeed - p.speed) * 3 * dt;

    // --- Move player along forward direction ---
    // Forward vector from yaw + pitch
    const cosP = Math.cos(p.pitch);
    const sinP = Math.sin(p.pitch);
    const cosY = Math.cos(p.yaw);
    const sinY = Math.sin(p.yaw);

    const fx = -sinY * cosP;
    const fy = sinP;
    const fz = -cosY * cosP;

    p.position.x += fx * p.speed * dt;
    p.position.y += fy * p.speed * dt;
    p.position.z += fz * p.speed * dt;

    // --- Clamp altitude ---
    if (p.position.y < EFBalance.MIN_ALT) {
      p.position.y = EFBalance.MIN_ALT;
      if (p.pitch > 0) p.pitch *= 0.5; // pull up
    }
    if (p.position.y > EFBalance.MAX_ALT) {
      p.position.y = EFBalance.MAX_ALT;
      if (p.pitch < 0) p.pitch *= 0.5;
    }

    // --- Soft world boundary (wrap or bounce) ---
    const wr = EFBalance.WORLD_RADIUS;
    const dist = Math.sqrt(p.position.x ** 2 + p.position.z ** 2);
    if (dist > wr) {
      // Gentle push back toward center
      const pushStr = ((dist - wr) / wr) * 8 * dt;
      const nx = -p.position.x / dist;
      const nz = -p.position.z / dist;
      p.position.x += nx * pushStr * p.speed;
      p.position.z += nz * pushStr * p.speed;
    }

    // --- Wing flap animation (slower when fast, faster when slow/climbing) ---
    const flapSpeed = 3 + (1 - p.speed / EFBalance.MAX_SPEED) * 4;
    p.flapPhase += dt * flapSpeed;

    // --- Bank angle smoothing for visuals ---
    const targetBank = -yawInput * 0.5 + rollInput * 0.3;
    p.bankAngle += (targetBank - p.bankAngle) * 4 * dt;
  },

  destroy(): void {
    if (_bound) {
      window.removeEventListener("keydown", _onKeyDown);
      window.removeEventListener("keyup", _onKeyUp);
      _bound = false;
    }
    _keys.clear();
    _pauseCb = null;
  },
};
