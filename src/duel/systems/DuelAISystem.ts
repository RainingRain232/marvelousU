// ---------------------------------------------------------------------------
// Duel mode – AI opponent system
// ---------------------------------------------------------------------------

import { DuelFighterState } from "../../types";
import { DUEL_CHARACTERS } from "../config/DuelCharacterDefs";
import type { DuelInputResult, DuelState } from "../state/DuelState";

// AI reaction timers
let _reactionTimer = 0;
let _actionCooldown = 0;
let _currentDecision: string | null = null;

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

    // Only act if we can
    if (
      ai.state === DuelFighterState.HIT_STUN ||
      ai.state === DuelFighterState.KNOCKDOWN ||
      ai.state === DuelFighterState.GET_UP ||
      ai.state === DuelFighterState.GRABBED ||
      ai.state === DuelFighterState.VICTORY ||
      ai.state === DuelFighterState.DEFEAT
    ) {
      return result;
    }

    if (_actionCooldown > 0) {
      _actionCooldown--;
    }

    const dist = Math.abs(ai.position.x - player.position.x);
    const reactionSpeed = [30, 18, 10, 4][difficulty] ?? 18;

    // Block reaction
    if (
      player.state === DuelFighterState.ATTACK ||
      player.state === DuelFighterState.GRAB
    ) {
      const blockChance = [0.2, 0.45, 0.7, 0.9][difficulty] ?? 0.4;
      if (Math.random() < blockChance && dist < 120) {
        // Decide high or low block
        const playerMove = player.currentMove;
        const playerCharDef = DUEL_CHARACTERS[player.characterId];
        const move =
          playerCharDef.normals[playerMove ?? ""] ??
          playerCharDef.specials[playerMove ?? ""];

        if (move && (move.height === "low")) {
          result.back = true;
          result.down = true;
          // Set directional keys
          if (ai.facingRight) result.left = true;
          else result.right = true;
          return result;
        } else {
          result.back = true;
          if (ai.facingRight) result.left = true;
          else result.right = true;
          return result;
        }
      }
    }

    // Idle AI decision making
    if (_actionCooldown <= 0 && ai.state !== DuelFighterState.ATTACK) {
      _reactionTimer++;

      if (_reactionTimer >= reactionSpeed) {
        _reactionTimer = 0;
        _currentDecision = _makeDecision(state, difficulty, dist);
        _actionCooldown = Math.max(5, reactionSpeed / 2);
      }
    }

    // Execute current decision
    if (_currentDecision) {
      switch (_currentDecision) {
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

        case "jump":
          result.up = true;
          break;

        case "crouch":
          result.down = true;
          break;

        default:
          // It's a move ID
          result.action = _currentDecision;
          _currentDecision = null;
          break;
      }
    }

    return result;
  },

  reset(): void {
    _reactionTimer = 0;
    _actionCooldown = 0;
    _currentDecision = null;
  },
};

function _makeDecision(
  state: DuelState,
  difficulty: number,
  dist: number,
): string {
  const ai = state.fighters[1];
  const charDef = DUEL_CHARACTERS[ai.characterId];
  const specialIds = Object.keys(charDef.specials);
  const normalIds = Object.keys(charDef.normals);
  const rand = Math.random();

  // Close range
  if (dist < 60) {
    if (rand < 0.15) return "grab";
    if (rand < 0.5) {
      // Light/medium attack
      return normalIds[Math.floor(Math.random() * 3)] ?? "light_high";
    }
    if (rand < 0.7 && difficulty >= 1) {
      return specialIds[Math.floor(Math.random() * specialIds.length)] ?? "light_high";
    }
    if (rand < 0.85) return "retreat";
    return "approach";
  }

  // Mid range
  if (dist < 150) {
    if (rand < 0.3) return "approach";
    if (rand < 0.5 && difficulty >= 1) {
      // Use specials at range
      return specialIds[Math.floor(Math.random() * specialIds.length)] ?? "light_high";
    }
    if (rand < 0.7) {
      return normalIds[Math.floor(Math.random() * normalIds.length)] ?? "light_high";
    }
    if (rand < 0.8) return "retreat";
    if (rand < 0.9) return "jump";
    return "crouch";
  }

  // Far range
  if (rand < 0.5) return "approach";
  if (rand < 0.75 && difficulty >= 1) {
    // Projectile characters should zone
    if (charDef.fighterType === "mage" || charDef.fighterType === "archer") {
      // Use first special (usually projectile)
      return specialIds[0] ?? "approach";
    }
    return "approach";
  }
  if (rand < 0.85) return "jump";
  return "approach";
}
