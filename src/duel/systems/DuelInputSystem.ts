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
  { buttons: ["lightPunch", "heavyKick"], moveId: "shield_charge" },
  { buttons: ["heavyPunch", "lightKick"], moveId: "excalibur" },
];

const MERLIN_SPECIALS: SpecialCombo[] = [
  { buttons: ["lightPunch", "medPunch"], moveId: "arcane_bolt" },
  { buttons: ["medPunch", "heavyPunch"], moveId: "thunder_strike" },
  { buttons: ["lightKick", "medKick"], moveId: "frost_wave" },
  { buttons: ["medKick", "heavyKick"], moveId: "teleport" },
  { buttons: ["lightPunch", "heavyKick"], moveId: "arcane_storm" },
  { buttons: ["heavyPunch", "lightKick"], moveId: "mystic_barrier" },
];

const ELAINE_SPECIALS: SpecialCombo[] = [
  { buttons: ["lightPunch", "medPunch"], moveId: "power_shot" },
  { buttons: ["medPunch", "heavyPunch"], moveId: "rain_of_arrows" },
  { buttons: ["lightKick", "medKick"], moveId: "leg_sweep" },
  { buttons: ["medKick", "heavyKick"], moveId: "backflip_shot" },
  { buttons: ["lightPunch", "heavyKick"], moveId: "triple_shot" },
  { buttons: ["heavyPunch", "lightKick"], moveId: "hunters_trap" },
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

// All attack buttons
const ATTACK_BUTTONS = new Set(Object.keys(NORMAL_MAP));

// ---- Module state ----------------------------------------------------------

let _state: DuelState | null = null;
let _onKeyDown: ((e: KeyboardEvent) => void) | null = null;
let _onKeyUp: ((e: KeyboardEvent) => void) | null = null;

// Track which buttons were freshly pressed this frame
const _justPressed: Set<string> = new Set();

// Dash double-tap detection: track last release frame for forward/back directions
let _lastForwardRelease = -999;
let _lastBackRelease = -999;
let _dashForwardTriggered = false;
let _dashBackTriggered = false;

// Pending normal: when a single attack button is pressed, wait a few frames
// before committing to a normal, giving time for a second button (special).
let _pendingNormal: string | null = null;
let _pendingNormalFrame = 0;

// How many frames to wait for a potential second button press
const SPECIAL_WAIT_FRAMES = 5;

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

        // Track direction releases for double-tap dash detection
        const fighter = _state.fighters[0];
        const fwdKey = fighter.facingRight ? "right" : "left";
        const bkKey = fighter.facingRight ? "left" : "right";
        if (mapped === fwdKey) _lastForwardRelease = _state.frameCount;
        if (mapped === bkKey) _lastBackRelease = _state.frameCount;

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

    // Detect double-tap dashes
    const forwardKey = fighter.facingRight ? "right" : "left";
    const backKey = fighter.facingRight ? "left" : "right";
    const frame = state.frameCount;

    if (_justPressed.has(forwardKey) && frame - _lastForwardRelease <= DuelBalance.DASH_TAP_WINDOW) {
      _dashForwardTriggered = true;
    }
    if (_justPressed.has(backKey) && frame - _lastBackRelease <= DuelBalance.DASH_TAP_WINDOW) {
      _dashBackTriggered = true;
    }

    const result: DuelInputResult = {
      left: inp.left,
      right: inp.right,
      up: inp.up,
      down: inp.down,
      forward,
      back,
      dashForward: _dashForwardTriggered,
      dashBack: _dashBackTriggered,
      action: null,
    };

    // Consume dash triggers
    _dashForwardTriggered = false;
    _dashBackTriggered = false;

    // Resolve attacks if fighter can act
    if (_canAct(fighter)) {
      result.action = _resolveAction(fighter, frame);
    }

    // Trim old buffer entries
    _trimBuffer(fighter, frame);

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
    _lastForwardRelease = -999;
    _lastBackRelease = -999;
    _dashForwardTriggered = false;
    _dashBackTriggered = false;
    _pendingNormal = null;
    _pendingNormalFrame = 0;
  },
};

// ---- Internal helpers ------------------------------------------------------

function _canAct(fighter: DuelFighter): boolean {
  const s = fighter.state;
  if (
    s === DuelFighterState.IDLE ||
    s === DuelFighterState.WALK_FORWARD ||
    s === DuelFighterState.WALK_BACK ||
    s === DuelFighterState.CROUCH ||
    s === DuelFighterState.CROUCH_IDLE
  ) return true;

  // Allow input during ATTACK for combo cancels
  if (s === DuelFighterState.ATTACK && fighter.canCancelMove) return true;

  // Allow air attacks
  if (
    s === DuelFighterState.JUMP ||
    s === DuelFighterState.JUMP_FORWARD ||
    s === DuelFighterState.JUMP_BACK
  ) return true;

  return false;
}

function _resolveAction(fighter: DuelFighter, frame: number): string | null {
  // 1. Always check for specials first (simultaneous presses within window)
  const charSpecials = CHARACTER_SPECIALS[fighter.characterId] ?? [];
  for (const combo of charSpecials) {
    if (_checkSimultaneous(fighter, combo.buttons, frame)) {
      _pendingNormal = null;
      _pendingNormalFrame = 0;
      return combo.moveId;
    }
  }

  // 2. Check for grab (Q+A)
  if (_checkSimultaneous(fighter, GRAB_COMBO, frame)) {
    _pendingNormal = null;
    _pendingNormalFrame = 0;
    return "grab";
  }

  // 3. New attack button press? Start pending timer instead of firing immediately.
  for (const btn of _justPressed) {
    if (ATTACK_BUTTONS.has(btn)) {
      _pendingNormal = btn;
      _pendingNormalFrame = frame;
      return null; // wait for potential second button
    }
  }

  // 4. Check if pending normal wait expired
  if (_pendingNormal !== null) {
    if (frame - _pendingNormalFrame >= SPECIAL_WAIT_FRAMES) {
      const moveId = NORMAL_MAP[_pendingNormal];
      _pendingNormal = null;
      _pendingNormalFrame = 0;
      return moveId ?? null;
    }
    return null; // still waiting
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
