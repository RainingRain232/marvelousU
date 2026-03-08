// ---------------------------------------------------------------------------
// Duel mode – real-time input system
// ---------------------------------------------------------------------------

import { DuelFighterState } from "../../types";
import { DuelBalance } from "../config/DuelBalanceConfig";
import type {
  DuelFighter,
  DuelInputResult,
  DuelState,
} from "../state/DuelState";

// ---- Key mapping -----------------------------------------------------------

const KEY_MAP: Record<string, string> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down",
  KeyQ: "lightPunch",
  KeyW: "medPunch",
  KeyE: "heavyPunch",
  KeyA: "lightKick",
  KeyS: "medKick",
  KeyD: "heavyKick",
};

// ---- Special input combos --------------------------------------------------

interface SpecialCombo {
  buttons: [string, string];
  moveId: string;
}

// Specials detected by simultaneous presses of adjacent buttons
const ARTHUR_SPECIALS: SpecialCombo[] = [
  { buttons: ["lightPunch", "medPunch"], moveId: "sword_thrust" },
  { buttons: ["medPunch", "heavyPunch"], moveId: "overhead_cleave" },
  { buttons: ["lightKick", "medKick"], moveId: "low_sweep" },
  { buttons: ["medKick", "heavyKick"], moveId: "rising_slash" },
];

const MERLIN_SPECIALS: SpecialCombo[] = [
  { buttons: ["lightPunch", "medPunch"], moveId: "arcane_bolt" },
  { buttons: ["medPunch", "heavyPunch"], moveId: "thunder_strike" },
  { buttons: ["lightKick", "medKick"], moveId: "frost_wave" },
  { buttons: ["medKick", "heavyKick"], moveId: "teleport" },
];

const ELAINE_SPECIALS: SpecialCombo[] = [
  { buttons: ["lightPunch", "medPunch"], moveId: "power_shot" },
  { buttons: ["medPunch", "heavyPunch"], moveId: "rain_of_arrows" },
  { buttons: ["lightKick", "medKick"], moveId: "leg_sweep" },
  { buttons: ["medKick", "heavyKick"], moveId: "backflip_shot" },
];

const CHARACTER_SPECIALS: Record<string, SpecialCombo[]> = {
  arthur: ARTHUR_SPECIALS,
  merlin: MERLIN_SPECIALS,
  elaine: ELAINE_SPECIALS,
};

// Grab is universal: Q+A (lightPunch + lightKick)
const GRAB_COMBO: [string, string] = ["lightPunch", "lightKick"];

// Normal attack button -> move ID mapping
const NORMAL_MAP: Record<string, string> = {
  lightPunch: "light_high",
  medPunch: "med_high",
  heavyPunch: "heavy_high",
  lightKick: "light_low",
  medKick: "med_low",
  heavyKick: "heavy_low",
};

// ---- Module state ----------------------------------------------------------

let _state: DuelState | null = null;
let _onKeyDown: ((e: KeyboardEvent) => void) | null = null;
let _onKeyUp: ((e: KeyboardEvent) => void) | null = null;

// Track which buttons were freshly pressed this frame
const _justPressed: Set<string> = new Set();

// ---- Public API ------------------------------------------------------------

export const DuelInputSystem = {
  init(state: DuelState): void {
    _state = state;

    _onKeyDown = (e: KeyboardEvent) => {
      if (!_state) return;
      if (e.code === "Escape") {
        _state.isPaused = !_state.isPaused;
        e.preventDefault();
        return;
      }
      const mapped = KEY_MAP[e.code];
      if (mapped && !e.repeat) {
        const inp = _state.fighters[0].input as Record<string, boolean>;
        if (!inp[mapped]) {
          inp[mapped] = true;
          _justPressed.add(mapped);
          // Add to input buffer
          _state.fighters[0].inputBuffer.push({
            code: mapped,
            frame: _state.frameCount,
            pressed: true,
          });
        }
        e.preventDefault();
      }
    };

    _onKeyUp = (e: KeyboardEvent) => {
      if (!_state) return;
      const mapped = KEY_MAP[e.code];
      if (mapped) {
        const inp = _state.fighters[0].input as Record<string, boolean>;
        inp[mapped] = false;
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", _onKeyDown);
    window.addEventListener("keyup", _onKeyUp);
  },

  /** Resolve P1 input for this frame. Returns the action to perform (if any). */
  update(state: DuelState): DuelInputResult {
    const fighter = state.fighters[0];
    const inp = fighter.input;

    // Compute forward/back relative to facing
    const forward = fighter.facingRight ? inp.right : inp.left;
    const back = fighter.facingRight ? inp.left : inp.right;

    const result: DuelInputResult = {
      left: inp.left,
      right: inp.right,
      up: inp.up,
      down: inp.down,
      forward,
      back,
      action: null,
    };

    // Only resolve attacks if fighter can act
    if (_canAct(fighter)) {
      result.action = _resolveAction(fighter, state.frameCount);
    }

    // Trim old buffer entries
    _trimBuffer(fighter, state.frameCount);

    // Clear just-pressed set for next frame
    _justPressed.clear();

    return result;
  },

  destroy(): void {
    if (_onKeyDown) window.removeEventListener("keydown", _onKeyDown);
    if (_onKeyUp) window.removeEventListener("keyup", _onKeyUp);
    _onKeyDown = null;
    _onKeyUp = null;
    _state = null;
    _justPressed.clear();
  },
};

// ---- Internal helpers ------------------------------------------------------

function _canAct(fighter: DuelFighter): boolean {
  const s = fighter.state;
  return (
    s === DuelFighterState.IDLE ||
    s === DuelFighterState.WALK_FORWARD ||
    s === DuelFighterState.WALK_BACK ||
    s === DuelFighterState.CROUCH ||
    s === DuelFighterState.CROUCH_IDLE
  );
}

function _resolveAction(fighter: DuelFighter, frame: number): string | null {
  // Check for specials first (simultaneous presses within window)
  const charSpecials = CHARACTER_SPECIALS[fighter.characterId] ?? [];
  for (const combo of charSpecials) {
    if (_checkSimultaneous(fighter, combo.buttons, frame)) {
      return combo.moveId;
    }
  }

  // Check for grab (Q+A)
  if (_checkSimultaneous(fighter, GRAB_COMBO, frame)) {
    return "grab";
  }

  // Check for single-button normals (only on fresh press)
  for (const btn of _justPressed) {
    const moveId = NORMAL_MAP[btn];
    if (moveId) return moveId;
  }

  return null;
}

function _checkSimultaneous(
  fighter: DuelFighter,
  buttons: [string, string],
  frame: number,
): boolean {
  const window = DuelBalance.SIMULTANEOUS_WINDOW;
  const buf = fighter.inputBuffer;

  let foundA = false;
  let foundB = false;

  for (let i = buf.length - 1; i >= 0; i--) {
    const entry = buf[i];
    if (frame - entry.frame > window) break;
    if (!entry.pressed) continue;
    if (entry.code === buttons[0]) foundA = true;
    if (entry.code === buttons[1]) foundB = true;
  }

  // Both buttons must also be currently held
  const inp = fighter.input as Record<string, boolean>;
  return foundA && foundB && inp[buttons[0]] && inp[buttons[1]];
}

function _trimBuffer(fighter: DuelFighter, frame: number): void {
  const maxAge = DuelBalance.INPUT_BUFFER_FRAMES;
  fighter.inputBuffer = fighter.inputBuffer.filter(
    (e) => frame - e.frame <= maxAge,
  );
}
