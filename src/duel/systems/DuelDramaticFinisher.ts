// ---------------------------------------------------------------------------
// Duel mode – dramatic finishers (cinematic KO when finishing with a super)
// ---------------------------------------------------------------------------

import { DUEL_CHARACTERS } from "../config/DuelCharacterDefs";
import type { DuelState } from "../state/DuelState";

// ---- Constants --------------------------------------------------------------

export const DRAMATIC_SLOWDOWN_FRAMES = 60;
export const DRAMATIC_ZOOM_DURATION = 40;
export const DRAMATIC_FLASH_DURATION = 15;
export const DRAMATIC_TOTAL_FRAMES = 120;

// ---- Dramatic finisher state -----------------------------------------------

export interface DuelDramaticFinisherState {
  /** Whether a dramatic finisher is currently playing */
  active: boolean;
  /** Index of the winner (0 or 1) */
  winnerId: number;
  /** Index of the loser */
  loserId: number;
  /** Move that triggered the finisher */
  moveId: string;
  /** Current phase of the cinematic */
  phase: "flash" | "zoom" | "impact" | "aftermath";
  /** Frame counter within current phase */
  frameCounter: number;
  /** Total frame counter */
  totalFrames: number;
  /** Position where the final hit landed */
  impactPosition: { x: number; y: number };
  /** Cinematic text to display */
  finisherText: string;
  /** Character-specific finisher name */
  finisherName: string;
}

// ---- Detection --------------------------------------------------------------

/**
 * Check if a KO qualifies as a dramatic finisher.
 * Conditions: finishing blow was a zeal (super) move AND the KO occurs.
 */
export function detectDramaticFinisher(
  state: DuelState,
  attackerIdx: number,
  defenderIdx: number,
): DuelDramaticFinisherState | null {
  const attacker = state.fighters[attackerIdx];
  const defender = state.fighters[defenderIdx];

  // Defender must be KO'd
  if (defender.hp > 0) return null;

  // Attacker must have been using a zeal move
  if (!attacker.currentMove) return null;

  const charDef = DUEL_CHARACTERS[attacker.characterId];
  if (!charDef) return null;

  const isZealMove = charDef.zeals[attacker.currentMove] !== undefined;
  if (!isZealMove) return null;

  // Build finisher state
  const finisherName = _getFinisherName(attacker.characterId, attacker.currentMove);

  return {
    active: true,
    winnerId: attackerIdx,
    loserId: defenderIdx,
    moveId: attacker.currentMove,
    phase: "flash",
    frameCounter: 0,
    totalFrames: 0,
    impactPosition: {
      x: (attacker.position.x + defender.position.x) / 2,
      y: (attacker.position.y + defender.position.y) / 2 - 50,
    },
    finisherText: `${charDef.name.toUpperCase()} — DRAMATIC FINISH!`,
    finisherName,
  };
}

/**
 * Update the dramatic finisher sequence. Returns true when complete.
 */
export function updateDramaticFinisher(
  finisher: DuelDramaticFinisherState,
): boolean {
  finisher.frameCounter++;
  finisher.totalFrames++;

  switch (finisher.phase) {
    case "flash":
      if (finisher.frameCounter >= DRAMATIC_FLASH_DURATION) {
        finisher.phase = "zoom";
        finisher.frameCounter = 0;
      }
      break;

    case "zoom":
      if (finisher.frameCounter >= DRAMATIC_ZOOM_DURATION) {
        finisher.phase = "impact";
        finisher.frameCounter = 0;
      }
      break;

    case "impact":
      if (finisher.frameCounter >= DRAMATIC_SLOWDOWN_FRAMES) {
        finisher.phase = "aftermath";
        finisher.frameCounter = 0;
      }
      break;

    case "aftermath":
      if (finisher.frameCounter >= 30) {
        finisher.active = false;
        return true;
      }
      break;
  }

  return false;
}

/**
 * Get rendering parameters for the current finisher frame.
 */
export function getDramaticFinisherRenderInfo(
  finisher: DuelDramaticFinisherState,
): DuelDramaticRenderInfo {
  const info: DuelDramaticRenderInfo = {
    screenFlashAlpha: 0,
    screenFlashColor: 0xffffff,
    zoomFactor: 1,
    zoomCenterX: finisher.impactPosition.x,
    zoomCenterY: finisher.impactPosition.y,
    showFinisherText: false,
    finisherText: finisher.finisherText,
    finisherName: finisher.finisherName,
    textAlpha: 0,
    timeScale: 1,
    shakeIntensity: 0,
  };

  switch (finisher.phase) {
    case "flash":
      // Full screen flash that fades
      info.screenFlashAlpha = Math.max(0, 1 - finisher.frameCounter / DRAMATIC_FLASH_DURATION);
      info.screenFlashColor = _getFinisherFlashColor(finisher.moveId);
      info.timeScale = 0.1; // near freeze
      break;

    case "zoom":
      // Zoom into the impact point
      const zoomProgress = finisher.frameCounter / DRAMATIC_ZOOM_DURATION;
      info.zoomFactor = 1 + zoomProgress * 0.8; // zoom to 1.8x
      info.timeScale = 0.2; // slow motion
      info.shakeIntensity = zoomProgress * 3;
      break;

    case "impact":
      // Hold at zoom, screen shake, show text
      info.zoomFactor = 1.8;
      info.showFinisherText = true;
      info.textAlpha = Math.min(1, finisher.frameCounter / 15);
      info.shakeIntensity = Math.max(0, 8 - finisher.frameCounter * 0.15);
      info.timeScale = 0.3;

      // Flash on first frame of impact
      if (finisher.frameCounter < 5) {
        info.screenFlashAlpha = 0.6 * (1 - finisher.frameCounter / 5);
        info.screenFlashColor = 0xffdd00;
      }
      break;

    case "aftermath":
      // Zoom out, fade text
      const outProgress = finisher.frameCounter / 30;
      info.zoomFactor = 1.8 - outProgress * 0.8;
      info.showFinisherText = true;
      info.textAlpha = 1 - outProgress;
      info.timeScale = 0.5 + outProgress * 0.5; // speed back up
      break;
  }

  return info;
}

export interface DuelDramaticRenderInfo {
  screenFlashAlpha: number;
  screenFlashColor: number;
  zoomFactor: number;
  zoomCenterX: number;
  zoomCenterY: number;
  showFinisherText: boolean;
  finisherText: string;
  finisherName: string;
  textAlpha: number;
  timeScale: number;
  shakeIntensity: number;
}

// ---- Helpers ----------------------------------------------------------------

function _getFinisherName(characterId: string, moveId: string): string {
  const charDef = DUEL_CHARACTERS[characterId];
  if (!charDef) return "DRAMATIC FINISH";
  const move = charDef.zeals[moveId];
  if (!move) return "DRAMATIC FINISH";
  return move.name.toUpperCase();
}

function _getFinisherFlashColor(moveId: string): number {
  // Different colors for different super types
  if (moveId.includes("excalibur") || moveId.includes("royal")) return 0xffdd00;
  if (moveId.includes("thunder") || moveId.includes("arcane")) return 0x6644ff;
  if (moveId.includes("storm") || moveId.includes("celestial")) return 0x44ddff;
  if (moveId.includes("dragon") || moveId.includes("spear")) return 0xff4444;
  return 0xffffff;
}
