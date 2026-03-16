// ---------------------------------------------------------------------------
// Duel mode – assist system (tag-in assists like Marvel vs Capcom)
// ---------------------------------------------------------------------------

import { DuelFighterState } from "../../types";
import { DuelBalance } from "../config/DuelBalanceConfig";
import { DUEL_CHARACTERS } from "../config/DuelCharacterDefs";
import type { DuelFighter, DuelMoveDef, DuelState } from "../state/DuelState";

// ---- Assist constants -------------------------------------------------------

export const ASSIST_COOLDOWN_FRAMES = 360;      // 6 seconds at 60fps
export const ASSIST_ENTER_FRAMES = 12;           // frames for assist to rush in
export const ASSIST_ACTIVE_FRAMES = 20;          // frames assist is on screen attacking
export const ASSIST_EXIT_FRAMES = 12;            // frames for assist to exit
export const ASSIST_INVINCIBLE_ENTER = 8;        // i-frames during entry
export const ASSIST_DAMAGE_MULTIPLIER = 0.65;    // assist attacks deal 65% damage

// ---- Assist state -----------------------------------------------------------

export interface DuelAssistCharacter {
  characterId: string;
  /** Which assist move to use (first special by default) */
  assistMoveId: string;
}

export interface DuelAssistState {
  /** Assist character for each fighter (null = no assist selected) */
  characters: [DuelAssistCharacter | null, DuelAssistCharacter | null];
  /** Cooldown remaining for each player's assist (frames) */
  cooldowns: [number, number];
  /** Active assist on screen (null = no assist active) */
  activeAssists: [DuelActiveAssist | null, DuelActiveAssist | null];
}

export interface DuelActiveAssist {
  characterId: string;
  ownerId: number;           // 0 or 1
  moveId: string;
  position: { x: number; y: number };
  facingRight: boolean;
  phase: "entering" | "attacking" | "exiting";
  frameCounter: number;
  hasHit: boolean;
  invincibleFrames: number;
}

// ---- Factory ----------------------------------------------------------------

export function createAssistState(): DuelAssistState {
  return {
    characters: [null, null],
    cooldowns: [0, 0],
    activeAssists: [null, null],
  };
}

/** Pick the default assist move for a character (first special). */
export function getDefaultAssistMove(characterId: string): string {
  const def = DUEL_CHARACTERS[characterId];
  if (!def) return "";
  const specialKeys = Object.keys(def.specials);
  return specialKeys[0] ?? "";
}

// ---- System -----------------------------------------------------------------

export const DuelAssistSystem = {
  /** Call an assist for the given player index. Returns true if assist was called. */
  callAssist(state: DuelState, playerIdx: 0 | 1): boolean {
    const assist = state.assistState;
    if (!assist) return false;

    const assistChar = assist.characters[playerIdx];
    if (!assistChar) return false;

    // Check cooldown
    if (assist.cooldowns[playerIdx] > 0) return false;

    // Can't call assist if one is already active for this player
    if (assist.activeAssists[playerIdx] !== null) return false;

    // Can't call assist during certain states
    const fighter = state.fighters[playerIdx];
    if (
      fighter.state === DuelFighterState.KNOCKDOWN ||
      fighter.state === DuelFighterState.GET_UP ||
      fighter.state === DuelFighterState.DEFEAT ||
      fighter.state === DuelFighterState.GRABBED
    ) return false;

    // Spawn the assist
    const enterFromRight = fighter.position.x > state.stageLeft + (state.stageRight - state.stageLeft) / 2;
    const startX = enterFromRight ? state.stageRight + 80 : state.stageLeft - 80;

    assist.activeAssists[playerIdx] = {
      characterId: assistChar.characterId,
      ownerId: playerIdx,
      moveId: assistChar.assistMoveId,
      position: { x: startX, y: state.stageFloorY },
      facingRight: fighter.facingRight,
      phase: "entering",
      frameCounter: 0,
      hasHit: false,
      invincibleFrames: ASSIST_INVINCIBLE_ENTER,
    };

    // Set cooldown
    assist.cooldowns[playerIdx] = ASSIST_COOLDOWN_FRAMES;

    return true;
  },

  /** Update all active assists. */
  update(state: DuelState): void {
    const assist = state.assistState;
    if (!assist) return;

    // Decrement cooldowns
    for (let i = 0; i < 2; i++) {
      if (assist.cooldowns[i] > 0) assist.cooldowns[i]--;
    }

    // Update active assists
    for (let i = 0; i < 2; i++) {
      const active = assist.activeAssists[i as 0 | 1];
      if (!active) continue;

      active.frameCounter++;
      if (active.invincibleFrames > 0) active.invincibleFrames--;

      const fighter = state.fighters[i];

      switch (active.phase) {
        case "entering": {
          // Lerp toward target position
          const targetX = fighter.position.x + (fighter.facingRight ? -60 : 60);
          active.position.x += (targetX - active.position.x) * 0.3;

          if (active.frameCounter >= ASSIST_ENTER_FRAMES) {
            active.phase = "attacking";
            active.frameCounter = 0;
            active.facingRight = fighter.facingRight;
          }
          break;
        }

        case "attacking": {
          // Check for hit during attack
          if (!active.hasHit) {
            const defenderIdx = i === 0 ? 1 : 0;
            const defender = state.fighters[defenderIdx];
            const move = _getAssistMove(active);

            if (move && _assistHitboxOverlaps(active, defender, move, state)) {
              active.hasHit = true;
              _applyAssistDamage(state, active, defender, move);
            }
          }

          if (active.frameCounter >= ASSIST_ACTIVE_FRAMES) {
            active.phase = "exiting";
            active.frameCounter = 0;
          }
          break;
        }

        case "exiting": {
          // Move off screen
          const exitDir = active.facingRight ? -1 : 1;
          active.position.x += exitDir * 15;

          if (active.frameCounter >= ASSIST_EXIT_FRAMES) {
            assist.activeAssists[i as 0 | 1] = null;
          }
          break;
        }
      }
    }
  },
};

// ---- Internal helpers -------------------------------------------------------

function _getAssistMove(active: DuelActiveAssist): DuelMoveDef | null {
  const def = DUEL_CHARACTERS[active.characterId];
  if (!def) return null;
  return def.specials[active.moveId] ?? null;
}

function _assistHitboxOverlaps(
  active: DuelActiveAssist,
  defender: DuelFighter,
  move: DuelMoveDef,
  _state: DuelState,
): boolean {
  if (defender.invincibleFrames > 0) return false;
  if (
    defender.state === DuelFighterState.KNOCKDOWN ||
    defender.state === DuelFighterState.GET_UP ||
    defender.state === DuelFighterState.VICTORY ||
    defender.state === DuelFighterState.DEFEAT
  ) return false;

  const dir = active.facingRight ? 1 : -1;
  const hb = move.hitbox;
  const hbX = active.position.x + dir * hb.x;
  const hbY = active.position.y + hb.y;
  const hbLeft = dir > 0 ? hbX : hbX - hb.width;

  const isCrouching =
    defender.stance === "crouching" ||
    defender.state === DuelFighterState.CROUCH ||
    defender.state === DuelFighterState.CROUCH_IDLE ||
    defender.state === DuelFighterState.BLOCK_CROUCH;

  const hurtH = isCrouching ? DuelBalance.CROUCH_HURTBOX_H : DuelBalance.STAND_HURTBOX_H;
  const hurtW = DuelBalance.STAND_HURTBOX_W;
  const dLeft = defender.position.x - hurtW / 2;
  const dTop = defender.position.y - hurtH;

  return (
    hbLeft < dLeft + hurtW &&
    hbLeft + hb.width > dLeft &&
    hbY < dTop + hurtH &&
    hbY + hb.height > dTop
  );
}

function _applyAssistDamage(
  state: DuelState,
  active: DuelActiveAssist,
  defender: DuelFighter,
  move: DuelMoveDef,
): void {
  const damage = Math.max(1, Math.round(move.damage * ASSIST_DAMAGE_MULTIPLIER));
  defender.hp -= damage;

  defender.state = DuelFighterState.HIT_STUN;
  defender.stateTimer = 0;
  defender.hitstunFrames = Math.round(move.hitstun * 0.8);
  defender.currentMove = null;
  defender.moveFrame = 0;

  // Knockback
  const dir = active.facingRight ? 1 : -1;
  defender.position.x += dir * move.knockback * 0.7;

  // Combo tracking on the owner
  const attacker = state.fighters[active.ownerId];
  attacker.comboCount++;
  attacker.comboDamage += damage;

  // Zeal gain
  attacker.zealGauge = Math.min(DuelBalance.ZEAL_MAX, attacker.zealGauge + 4);
  defender.zealGauge = Math.min(DuelBalance.ZEAL_MAX, defender.zealGauge + 3);

  // Hit freeze
  state.slowdownFrames = Math.round(DuelBalance.HIT_FREEZE_FRAMES * 0.6);
}
