// ---------------------------------------------------------------------------
// Eagle Flight — input system
// WASD pitch/yaw, QE roll, Shift/Ctrl throttle, Space boost,
// F toggle free-look, mouse for free-look camera, Esc pause.
// ---------------------------------------------------------------------------

import type { EagleFlightState } from "../state/EagleFlightState";
import { EFBalance } from "../state/EagleFlightState";

type PauseCallback = (paused: boolean) => void;

const _keys = new Set<string>();
let _pauseCb: PauseCallback | null = null;
let _bound = false;
let _mouseDX = 0;
let _mouseDY = 0;
let _pointerLocked = false;

function _onKeyDown(e: KeyboardEvent): void {
  _keys.add(e.code);
  if (e.code === "Escape") {
    if (_pointerLocked) {
      document.exitPointerLock();
      return;
    }
    _pauseCb?.(true);
  }
}

function _onKeyUp(e: KeyboardEvent): void {
  _keys.delete(e.code);
}

function _onMouseMove(e: MouseEvent): void {
  if (_pointerLocked) {
    _mouseDX += e.movementX;
    _mouseDY += e.movementY;
  }
}

function _onPointerLockChange(): void {
  _pointerLocked = document.pointerLockElement !== null;
}

function _onClick(): void {
  // Click to enter pointer lock for mouse look
  if (!_pointerLocked) {
    document.body.requestPointerLock();
  }
}

export const EagleFlightInputSystem = {
  init(_state: EagleFlightState): void {
    _keys.clear();
    _mouseDX = 0;
    _mouseDY = 0;
    if (!_bound) {
      window.addEventListener("keydown", _onKeyDown);
      window.addEventListener("keyup", _onKeyUp);
      window.addEventListener("mousemove", _onMouseMove);
      window.addEventListener("click", _onClick);
      document.addEventListener("pointerlockchange", _onPointerLockChange);
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

    // Mouse pitch/yaw when pointer locked (and not in free look)
    if (_pointerLocked && !p.freeLook) {
      pitchInput += _mouseDY * EFBalance.MOUSE_SENSITIVITY * 20;
      const mouseYaw = -_mouseDX * EFBalance.MOUSE_SENSITIVITY * 15;
      p.yaw += mouseYaw * dt;
    }

    p.pitch += pitchInput * EFBalance.PITCH_RATE * dt;
    p.pitch = Math.max(-EFBalance.MAX_PITCH, Math.min(EFBalance.MAX_PITCH, p.pitch));

    // Gentle pitch return to level
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

    // Auto-bank into turns
    const autoRoll = -yawInput * 0.6;
    const targetRoll = rollInput * 0.8 + autoRoll;
    p.roll += (targetRoll - p.roll) * EFBalance.ROLL_RETURN_RATE * dt;

    if (rollInput === 0 && yawInput === 0) {
      p.roll *= 1 - EFBalance.ROLL_RETURN_RATE * dt;
    }
    p.roll = Math.max(-Math.PI * 0.5, Math.min(Math.PI * 0.5, p.roll));

    // --- Boost (Space) ---
    if (p.boostCooldown > 0) {
      p.boostCooldown -= dt;
    }
    if (_keys.has("Space") && !p.boostActive && p.boostCooldown <= 0) {
      p.boostActive = true;
      p.boostTimer = EFBalance.BOOST_DURATION;
      state.shakeTimer = 0.3;
      state.shakeMag = 1.5;
    }
    if (p.boostActive) {
      p.boostTimer -= dt;
      p.targetSpeed = EFBalance.BOOST_SPEED;
      if (p.boostTimer <= 0) {
        p.boostActive = false;
        p.boostCooldown = EFBalance.BOOST_COOLDOWN;
        p.targetSpeed = EFBalance.CRUISE_SPEED;
      }
    } else {
      // --- Throttle (Shift = faster, Ctrl = slower) ---
      if (_keys.has("ShiftLeft") || _keys.has("ShiftRight")) {
        p.targetSpeed = Math.min(EFBalance.MAX_SPEED, p.targetSpeed + EFBalance.ACCELERATION * dt);
      }
      if (_keys.has("ControlLeft") || _keys.has("ControlRight")) {
        p.targetSpeed = Math.max(EFBalance.MIN_SPEED, p.targetSpeed - EFBalance.ACCELERATION * dt);
      }
    }

    // Smooth speed toward target
    const speedLerp = p.boostActive ? 5 : 3;
    p.speed += (p.targetSpeed - p.speed) * speedLerp * dt;

    // --- Free look toggle (F) ---
    if (_keys.has("KeyF")) {
      if (!p.freeLook) {
        p.freeLook = true;
        p.freeLookYaw = 0;
        p.freeLookPitch = 0;
      }
    } else {
      if (p.freeLook) {
        p.freeLook = false;
        p.freeLookYaw = 0;
        p.freeLookPitch = 0;
      }
    }

    // Free look camera (hold F + move mouse)
    if (p.freeLook && _pointerLocked) {
      p.freeLookYaw += _mouseDX * EFBalance.MOUSE_SENSITIVITY;
      p.freeLookPitch += _mouseDY * EFBalance.MOUSE_SENSITIVITY;
      p.freeLookPitch = Math.max(-1.2, Math.min(1.2, p.freeLookPitch));
    }

    // Reset mouse deltas
    _mouseDX = 0;
    _mouseDY = 0;

    // --- Move player along forward direction ---
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

    // --- Gravity assist: diving speeds you up, climbing slows ---
    if (p.pitch > 0.05) {
      // Diving — gain speed
      p.speed += p.pitch * 3 * dt;
    } else if (p.pitch < -0.05) {
      // Climbing — lose speed
      p.speed += p.pitch * 2 * dt;
    }
    p.speed = Math.max(EFBalance.MIN_SPEED, Math.min(p.boostActive ? EFBalance.BOOST_SPEED : EFBalance.MAX_SPEED, p.speed));

    // --- Clamp altitude ---
    if (p.position.y < EFBalance.MIN_ALT) {
      p.position.y = EFBalance.MIN_ALT;
      if (p.pitch > 0) p.pitch *= 0.5;
      // Ground skim shake
      state.shakeTimer = 0.15;
      state.shakeMag = 0.5;
    }
    if (p.position.y > EFBalance.MAX_ALT) {
      p.position.y = EFBalance.MAX_ALT;
      if (p.pitch < 0) p.pitch *= 0.5;
    }

    // --- Soft world boundary ---
    const wr = EFBalance.WORLD_RADIUS;
    const dist = Math.sqrt(p.position.x ** 2 + p.position.z ** 2);
    if (dist > wr) {
      const pushStr = ((dist - wr) / wr) * 8 * dt;
      const nx = -p.position.x / dist;
      const nz = -p.position.z / dist;
      p.position.x += nx * pushStr * p.speed;
      p.position.z += nz * pushStr * p.speed;
    }

    // --- Wing flap (slower when fast) ---
    const flapSpeed = 3 + (1 - p.speed / EFBalance.MAX_SPEED) * 4;
    p.flapPhase += dt * flapSpeed;

    // --- Bank angle visual ---
    const targetBank = -yawInput * 0.5 + rollInput * 0.3;
    p.bankAngle += (targetBank - p.bankAngle) * 4 * dt;

    // --- Camera shake decay ---
    if (state.shakeTimer > 0) {
      state.shakeTimer -= dt;
    }
  },

  destroy(): void {
    if (_bound) {
      window.removeEventListener("keydown", _onKeyDown);
      window.removeEventListener("keyup", _onKeyUp);
      window.removeEventListener("mousemove", _onMouseMove);
      window.removeEventListener("click", _onClick);
      document.removeEventListener("pointerlockchange", _onPointerLockChange);
      if (_pointerLocked) {
        document.exitPointerLock();
      }
      _bound = false;
    }
    _keys.clear();
    _pauseCb = null;
  },
};
