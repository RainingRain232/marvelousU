// ---------------------------------------------------------------------------
// Panzer Dragoon mode — input system (keyboard + mouse)
// ---------------------------------------------------------------------------

import type { DragoonState } from "../state/DragoonState";
import { DragoonClassId } from "../state/DragoonState";
import { SKILL_CONFIGS } from "../config/DragoonConfig";

let _keyDown: ((e: KeyboardEvent) => void) | null = null;
let _keyUp: ((e: KeyboardEvent) => void) | null = null;
let _mouseMove: ((e: MouseEvent) => void) | null = null;
let _mouseDown: ((e: MouseEvent) => void) | null = null;
let _mouseUp: ((e: MouseEvent) => void) | null = null;
let _pauseCallback: ((paused: boolean) => void) | null = null;
let _classSelectCallback: ((classId: DragoonClassId) => void) | null = null;
let _subclassSelectCallback: ((index: number) => void) | null = null;
let _escapeMenuCallback: ((show: boolean) => void) | null = null;

const CLASS_ORDER: DragoonClassId[] = [
  DragoonClassId.ARCANE_MAGE,
  DragoonClassId.STORM_RANGER,
  DragoonClassId.BLOOD_KNIGHT,
  DragoonClassId.SHADOW_ASSASSIN,
];

export const DragoonInputSystem = {
  setPauseCallback(cb: ((paused: boolean) => void) | null): void {
    _pauseCallback = cb;
  },

  setClassSelectCallback(cb: ((classId: DragoonClassId) => void) | null): void {
    _classSelectCallback = cb;
  },

  setSubclassSelectCallback(cb: ((index: number) => void) | null): void {
    _subclassSelectCallback = cb;
  },

  setEscapeMenuCallback(cb: ((show: boolean) => void) | null): void {
    _escapeMenuCallback = cb;
  },

  init(state: DragoonState): void {
    const inp = state.input;

    _keyDown = (e: KeyboardEvent) => {
      // Class selection mode
      if (state.classSelectActive) {
        switch (e.code) {
          case "Digit1": _classSelectCallback?.(CLASS_ORDER[0]); break;
          case "Digit2": _classSelectCallback?.(CLASS_ORDER[1]); break;
          case "Digit3": _classSelectCallback?.(CLASS_ORDER[2]); break;
          case "Digit4": _classSelectCallback?.(CLASS_ORDER[3]); break;
        }
        return;
      }

      // Subclass selection mode
      if (state.subclassChoiceActive) {
        switch (e.code) {
          case "Digit1": _subclassSelectCallback?.(0); break;
          case "Digit2": _subclassSelectCallback?.(1); break;
        }
        return;
      }

      switch (e.code) {
        // Arrow keys = player movement
        case "ArrowUp": inp.up = true; break;
        case "ArrowDown": inp.down = true; break;
        case "ArrowLeft": inp.left = true; break;
        case "ArrowRight": inp.right = true; break;
        // WASD = camera control
        case "KeyW": inp.camUp = true; break;
        case "KeyS": inp.camDown = true; break;
        case "KeyA": inp.camLeft = true; break;
        case "KeyD": inp.camRight = true; break;
        case "Digit1": inp.skill1 = true; break;
        case "Digit2": inp.skill2 = true; break;
        case "Digit3": inp.skill3 = true; break;
        case "Digit4": inp.skill4 = true; break;
        case "Digit5": inp.skill5 = true; break;
        case "Digit6": inp.skill6 = true; break;
        case "Tab":
          e.preventDefault();
          // Cycle through unlocked skills
          if (state.unlockedSkills.length > 1 && state.equippedUnlockSkill) {
            const curIdx = state.unlockedSkills.indexOf(state.equippedUnlockSkill);
            const nextIdx = (curIdx + 1) % state.unlockedSkills.length;
            const nextSkill = state.unlockedSkills[nextIdx];
            state.equippedUnlockSkill = nextSkill;
            const cfg = SKILL_CONFIGS[nextSkill];
            state.unlockSkillState = { id: nextSkill, cooldown: 0, maxCooldown: cfg.cooldown, active: false, activeTimer: 0 };
          }
          break;
        case "Escape":
          state.paused = !state.paused;
          _pauseCallback?.(state.paused);
          _escapeMenuCallback?.(state.paused);
          break;
      }
    };

    _keyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        // Arrow keys = player movement
        case "ArrowUp": inp.up = false; break;
        case "ArrowDown": inp.down = false; break;
        case "ArrowLeft": inp.left = false; break;
        case "ArrowRight": inp.right = false; break;
        // WASD = camera control
        case "KeyW": inp.camUp = false; break;
        case "KeyS": inp.camDown = false; break;
        case "KeyA": inp.camLeft = false; break;
        case "KeyD": inp.camRight = false; break;
        case "Digit1": inp.skill1 = false; break;
        case "Digit2": inp.skill2 = false; break;
        case "Digit3": inp.skill3 = false; break;
        case "Digit4": inp.skill4 = false; break;
        case "Digit5": inp.skill5 = false; break;
        case "Digit6": inp.skill6 = false; break;
      }
    };

    _mouseMove = (e: MouseEvent) => {
      inp.mouseX = e.clientX;
      inp.mouseY = e.clientY;
    };

    _mouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;

      // Class selection: hit-test card areas
      if (state.classSelectActive) {
        const mx = e.clientX;
        const my = e.clientY;
        const sw = state.screenW;
        const sh = state.screenH;
        const cardW = 200;
        const cardH = 280;
        const gap = 20;
        const totalW = CLASS_ORDER.length * cardW + (CLASS_ORDER.length - 1) * gap;
        const startX = (sw - totalW) / 2;
        const cardY = sh / 2 - cardH / 2;
        for (let i = 0; i < CLASS_ORDER.length; i++) {
          const cx = startX + i * (cardW + gap);
          if (mx >= cx && mx <= cx + cardW && my >= cardY && my <= cardY + cardH) {
            _classSelectCallback?.(CLASS_ORDER[i]);
            return;
          }
        }
        return;
      }

      // Subclass selection: hit-test card areas
      if (state.subclassChoiceActive) {
        const mx = e.clientX;
        const my = e.clientY;
        const sw = state.screenW;
        const sh = state.screenH;
        const cardW = 280;
        const cardH = 300;
        const gap = 40;
        const totalW = 2 * cardW + gap;
        const startX = (sw - totalW) / 2;
        const cardY = sh / 2 - cardH / 2;
        for (let i = 0; i < 2; i++) {
          const cx = startX + i * (cardW + gap);
          if (mx >= cx && mx <= cx + cardW && my >= cardY && my <= cardY + cardH) {
            _subclassSelectCallback?.(i);
            return;
          }
        }
        return;
      }

      inp.fire = true;
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
    if (state.classSelectActive || state.subclassChoiceActive) return;

    const p = state.player;
    const inp = state.input;
    const speed = 320 * p.speedMultiplier;

    // Arrow keys → player movement
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

    // Clamp to world bounds (with margin)
    const margin = 30;
    p.position.x = Math.max(margin, Math.min(state.worldWidth - margin, p.position.x));
    p.position.y = Math.max(margin, Math.min(state.screenH - margin, p.position.y));

    // WASD → independent camera control
    const camSpeed = 400;
    let camDx = 0;
    if (inp.camLeft) camDx -= 1;
    if (inp.camRight) camDx += 1;

    if (camDx !== 0) {
      // Manual camera panning with WASD
      state.cameraX += camDx * camSpeed * dt;
      state.cameraX = Math.max(0, Math.min(state.worldWidth - state.screenW, state.cameraX));
    } else {
      // When no WASD camera input, smoothly follow player
      const targetCamX = p.position.x - state.screenW * 0.5;
      const clampedTarget = Math.max(0, Math.min(state.worldWidth - state.screenW, targetCamX));
      const camDiff = clampedTarget - state.cameraX;
      const maxCamStep = speed * dt;
      if (Math.abs(camDiff) <= maxCamStep) {
        state.cameraX = clampedTarget;
      } else {
        state.cameraX += Math.sign(camDiff) * maxCamStep;
      }
    }
  },

  destroy(): void {
    if (_keyDown) window.removeEventListener("keydown", _keyDown);
    if (_keyUp) window.removeEventListener("keyup", _keyUp);
    if (_mouseMove) window.removeEventListener("mousemove", _mouseMove);
    if (_mouseDown) window.removeEventListener("mousedown", _mouseDown);
    if (_mouseUp) window.removeEventListener("mouseup", _mouseUp);
    _keyDown = _keyUp = _mouseMove = _mouseDown = _mouseUp = null;
    _pauseCallback = null;
    _classSelectCallback = null;
    _subclassSelectCallback = null;
    _escapeMenuCallback = null;
  },
};
