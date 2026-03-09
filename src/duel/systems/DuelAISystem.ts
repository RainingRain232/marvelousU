// ---------------------------------------------------------------------------
// Duel mode – AI opponent system (aggressive, combo-aware)
// ---------------------------------------------------------------------------

import { DuelFighterState } from "../../types";
import { DUEL_CHARACTERS } from "../config/DuelCharacterDefs";
import type { DuelInputResult, DuelState } from "../state/DuelState";

// AI internal state
let _reactionTimer = 0;
let _actionCooldown = 0;
let _currentDecision: string | null = null;
let _comboSequence: string[] = [];
let _comboStep = 0;

// Pre-built combo routes per fighter type for the AI to use.
// Routes use normals (universal) + the first special in the character's specials list.
const COMBO_ROUTES: Record<string, string[][]> = {
  sword: [
    ["light_high", "light_high", "med_high", "heavy_high"],
    ["light_low", "light_high", "med_high", "heavy_high"],
    ["light_high", "med_high", "heavy_high"],
    ["light_low", "med_low", "heavy_low"],
  ],
  mage: [
    ["light_high", "light_high", "med_high"],
    ["light_low", "light_high", "med_high"],
    ["light_high", "med_high", "heavy_high"],
    ["light_low", "med_low", "heavy_low"],
  ],
  archer: [
    ["light_high", "light_high", "med_high", "heavy_high"],
    ["light_low", "light_high", "med_high", "heavy_high"],
    ["light_high", "med_high", "heavy_high"],
    ["light_low", "med_low", "heavy_low"],
  ],
  spear: [
    ["light_high", "light_high", "med_high", "heavy_high"],
    ["light_low", "light_high", "med_high", "heavy_high"],
    ["light_high", "med_high", "heavy_high"],
    ["light_low", "med_low", "heavy_low"],
  ],
  axe: [
    ["light_high", "light_high", "med_high", "heavy_high"],
    ["light_low", "light_high", "med_high"],
    ["light_high", "med_high", "heavy_high"],
    ["light_low", "med_low", "heavy_low"],
  ],
};

export const DuelAISystem = {
  /** Generate AI input for fighter[1] based on game state and difficulty. */
  update(state: DuelState, difficulty: number): DuelInputResult {
    const ai = state.fighters[1];
    const player = state.fighters[0];

    const result: DuelInputResult = {
      left: false,
      right: false,
      up: false,
      down: false,
      forward: false,
      back: false,
      dashForward: false,
      dashBack: false,
      action: null,
    };

    // Can't act in these states
    if (
      ai.state === DuelFighterState.HIT_STUN ||
      ai.state === DuelFighterState.KNOCKDOWN ||
      ai.state === DuelFighterState.GET_UP ||
      ai.state === DuelFighterState.GRABBED ||
      ai.state === DuelFighterState.VICTORY ||
      ai.state === DuelFighterState.DEFEAT
    ) {
      _comboSequence = [];
      _comboStep = 0;
      return result;
    }

    const dist = Math.abs(ai.position.x - player.position.x);
    const reactionSpeed = [20, 8, 4, 2][difficulty] ?? 8;
    const blockChance = [0.2, 0.55, 0.8, 0.95][difficulty] ?? 0.55;

    // === If we're in a combo sequence, keep going ===
    if (_comboSequence.length > 0 && _comboStep < _comboSequence.length) {
      // Wait until current attack finishes before issuing next
      if (ai.state === DuelFighterState.ATTACK || ai.state === DuelFighterState.GRAB) {
        return result; // let current attack play out
      }

      // Check if the combo target is still in hitstun (combo is still valid)
      if (_comboStep > 0 && player.state !== DuelFighterState.HIT_STUN &&
          player.state !== DuelFighterState.KNOCKDOWN &&
          player.state !== DuelFighterState.GRABBED) {
        // Combo dropped, reset
        _comboSequence = [];
        _comboStep = 0;
      } else {
        // Issue next move in combo
        result.action = _comboSequence[_comboStep];
        _comboStep++;
        if (_comboStep >= _comboSequence.length) {
          _comboSequence = [];
          _comboStep = 0;
        }
        return result;
      }
    }

    // === Currently attacking, wait for it to finish ===
    if (ai.state === DuelFighterState.ATTACK || ai.state === DuelFighterState.GRAB) {
      return result;
    }

    // === Block reaction — when player is attacking nearby ===
    if (
      (player.state === DuelFighterState.ATTACK ||
       player.state === DuelFighterState.GRAB) &&
      dist < 140
    ) {
      if (Math.random() < blockChance) {
        const playerMove = player.currentMove;
        const playerCharDef = DUEL_CHARACTERS[player.characterId];
        const move =
          playerCharDef.normals[playerMove ?? ""] ??
          playerCharDef.specials[playerMove ?? ""];

        if (move && move.height === "low") {
          result.back = true;
          result.down = true;
          if (ai.facingRight) result.left = true;
          else result.right = true;
        } else {
          result.back = true;
          if (ai.facingRight) result.left = true;
          else result.right = true;
        }
        return result;
      }
    }

    // === Decision cooldown ===
    if (_actionCooldown > 0) {
      _actionCooldown--;
      // Keep executing movement decisions during cooldown
      if (_currentDecision) {
        _applyMovementDecision(_currentDecision, ai, result);
      }
      return result;
    }

    // === Reaction timer ===
    _reactionTimer++;
    if (_reactionTimer < reactionSpeed) {
      if (_currentDecision) {
        _applyMovementDecision(_currentDecision, ai, result);
      }
      return result;
    }

    _reactionTimer = 0;
    _actionCooldown = Math.max(2, Math.floor(reactionSpeed / 3));

    // === Make a new decision ===
    const charDef = DUEL_CHARACTERS[ai.characterId];
    const rand = Math.random();

    // Close range — attack or start combo
    if (dist < 70) {
      if (rand < 0.12) {
        result.action = "grab";
        _currentDecision = null;
        return result;
      }
      if (rand < 0.65) {
        // Start a combo!
        const routes = COMBO_ROUTES[charDef.fighterType] ?? COMBO_ROUTES.sword;
        const route = routes[Math.floor(Math.random() * routes.length)];
        _comboSequence = [...route];
        _comboStep = 0;
        result.action = _comboSequence[_comboStep];
        _comboStep++;
        _currentDecision = null;
        return result;
      }
      if (rand < 0.80) {
        // Single attack
        const normalIds = Object.keys(charDef.normals);
        result.action = normalIds[Math.floor(Math.random() * normalIds.length)];
        _currentDecision = null;
        return result;
      }
      _currentDecision = "retreat";
      _applyMovementDecision(_currentDecision, ai, result);
      return result;
    }

    // Mid range
    if (dist < 160) {
      if (rand < 0.40) {
        _currentDecision = "approach";
        _applyMovementDecision(_currentDecision, ai, result);
        return result;
      }
      if (rand < 0.60) {
        // Dash in to attack range
        result.dashForward = true;
        _currentDecision = null;
        return result;
      }
      if (rand < 0.80) {
        // Use a special at range
        const specialIds = Object.keys(charDef.specials);
        result.action = specialIds[Math.floor(Math.random() * specialIds.length)];
        _currentDecision = null;
        return result;
      }
      if (rand < 0.88) {
        result.up = true; // jump
        if (Math.random() > 0.5) {
          result.forward = true;
          if (ai.facingRight) result.right = true;
          else result.left = true;
        }
        _currentDecision = null;
        return result;
      }
      _currentDecision = "retreat";
      _applyMovementDecision(_currentDecision, ai, result);
      return result;
    }

    // Far range
    if (rand < 0.45) {
      _currentDecision = "approach";
      _applyMovementDecision(_currentDecision, ai, result);
      return result;
    }
    if (rand < 0.65) {
      result.dashForward = true;
      _currentDecision = null;
      return result;
    }
    if (rand < 0.85) {
      // Zoners fire projectiles at range (sword and axe types don't have projectiles by default)
      if (charDef.fighterType === "mage" || charDef.fighterType === "archer" || charDef.fighterType === "spear") {
        const specialIds = Object.keys(charDef.specials);
        result.action = specialIds[0]; // usually the projectile
        _currentDecision = null;
        return result;
      }
      _currentDecision = "approach";
      _applyMovementDecision(_currentDecision, ai, result);
      return result;
    }
    // Jump approach
    result.up = true;
    result.forward = true;
    if (ai.facingRight) result.right = true;
    else result.left = true;
    _currentDecision = null;
    return result;
  },

  reset(): void {
    _reactionTimer = 0;
    _actionCooldown = 0;
    _currentDecision = null;
    _comboSequence = [];
    _comboStep = 0;
  },
};

function _applyMovementDecision(
  decision: string,
  ai: { facingRight: boolean },
  result: DuelInputResult,
): void {
  switch (decision) {
    case "approach":
      result.forward = true;
      if (ai.facingRight) result.right = true;
      else result.left = true;
      break;
    case "retreat":
      result.back = true;
      if (ai.facingRight) result.left = true;
      else result.right = true;
      break;
  }
}
