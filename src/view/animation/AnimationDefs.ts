// Maps unit types → spritesheet frame ranges for each UnitState.
//
// Spritesheet layout convention (applies to every unit atlas):
//   Each atlas is a single PNG divided into a 8-column × 5-row grid.
//   Row 0  (frames  0– 7) → IDLE   (looping breath/stand)
//   Row 1  (frames  8–15) → MOVE   (looping walk cycle)
//   Row 2  (frames 16–23) → ATTACK (one-shot swing; return to IDLE)
//   Row 3  (frames 24–31) → CAST   (one-shot channel; return to IDLE)
//   Row 4  (frames 32–39) → DIE    (one-shot collapse; hold last frame)
//
// "frames" lists the frame indices inside the atlas texture array
// (as returned by Spritesheet.textures in index order).
//
// "sheet" is the atlas key used in AnimationManager — matches the
// spriteKey in UnitDefinitions.ts and the filename in public/assets/sheets/.

import { UnitType, UnitState } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AnimFrameSet {
  /** Atlas key — must match a loaded Spritesheet. */
  sheet: string;
  /** Ordered frame indices within the atlas. */
  frames: number[];
  /** Frames per second for this animation. */
  fps: number;
  /** Whether this animation loops. */
  loop: boolean;
}

export type AnimationDef = Record<UnitState, AnimFrameSet>;

// ---------------------------------------------------------------------------
// Frame range helpers
// ---------------------------------------------------------------------------

/** Generate an inclusive range [start, end]. */
function range(start: number, end: number): number[] {
  const out: number[] = [];
  for (let i = start; i <= end; i++) out.push(i);
  return out;
}

// Row offsets in the 8-column layout
const ROW_SIZE = 8;
const ROW_IDLE = 0 * ROW_SIZE; // 0
const ROW_MOVE = 1 * ROW_SIZE; // 8
const ROW_ATTACK = 2 * ROW_SIZE; // 16
const ROW_CAST = 3 * ROW_SIZE; // 24
const ROW_DIE = 4 * ROW_SIZE; // 32

/** Build a standard AnimationDef for a unit whose sheet key matches `spriteKey`. */
function buildDef(
  spriteKey: string,
  opts: {
    idleFps?: number;
    moveFps?: number;
    attackFps?: number;
    castFps?: number;
    dieFps?: number;
    /** Frames used for IDLE row (defaults to 0–7). */
    idleFrames?: number[];
    /** Frames used for MOVE row (defaults to 8–15). */
    moveFrames?: number[];
    /** Frames used for ATTACK row (defaults to 16–22 — 7 frames). */
    attackFrames?: number[];
    /** Frames used for CAST row (defaults to 24–29 — 6 frames). */
    castFrames?: number[];
    /** Frames used for DIE row (defaults to 32–38 — 7 frames). */
    dieFrames?: number[];
  } = {},
): AnimationDef {
  return {
    [UnitState.IDLE]: {
      sheet: spriteKey,
      frames: opts.idleFrames ?? range(ROW_IDLE, ROW_IDLE + 7),
      fps: opts.idleFps ?? 8,
      loop: true,
    },
    [UnitState.MOVE]: {
      sheet: spriteKey,
      frames: opts.moveFrames ?? range(ROW_MOVE, ROW_MOVE + 7),
      fps: opts.moveFps ?? 10,
      loop: true,
    },
    [UnitState.ATTACK]: {
      sheet: spriteKey,
      frames: opts.attackFrames ?? range(ROW_ATTACK, ROW_ATTACK + 6),
      fps: opts.attackFps ?? 12,
      loop: false,
    },
    [UnitState.CAST]: {
      sheet: spriteKey,
      frames: opts.castFrames ?? range(ROW_CAST, ROW_CAST + 5),
      fps: opts.castFps ?? 10,
      loop: false,
    },
    [UnitState.DIE]: {
      sheet: spriteKey,
      frames: opts.dieFrames ?? range(ROW_DIE, ROW_DIE + 6),
      fps: opts.dieFps ?? 8,
      loop: false,
    },
  };
}

// ---------------------------------------------------------------------------
// Definitions — one entry per UnitType
// ---------------------------------------------------------------------------

export const ANIMATION_DEFS: Record<UnitType, AnimationDef> = {
  [UnitType.SWORDSMAN]: buildDef("swordsman", { idleFps: 6, moveFps: 10, attackFps: 14, dieFps: 8 }),
  [UnitType.ARCHER]: buildDef("archer", { attackFps: 10 }),
  [UnitType.KNIGHT]: buildDef("knight", { moveFps: 8, attackFps: 8 }),
  [UnitType.FIRE_MAGE]: buildDef("mage", { idleFps: 6, castFps: 8 }),
  [UnitType.STORM_MAGE]: buildDef("mage", { idleFps: 6, castFps: 8 }),
  [UnitType.PIKEMAN]: buildDef("pikeman", { attackFps: 10 }),
  [UnitType.SUMMONED]: buildDef("summoned", {
    idleFps: 8,
    moveFps: 12,
    attackFps: 14,
    castFps: 10,
    dieFps: 10,
  }),
  [UnitType.BATTERING_RAM]: buildDef("battering_ram", { moveFps: 6, attackFps: 5 }),
  [UnitType.MAGE_HUNTER]: buildDef("mage_hunter"),
  [UnitType.SIEGE_HUNTER]: buildDef("siege_hunter"),
  [UnitType.SUMMONER]: buildDef("mage", { idleFps: 6, castFps: 8 }),
  [UnitType.DISTORTION_MAGE]: buildDef("mage", { idleFps: 6, castFps: 10 }),
  [UnitType.VOID_SNAIL]: buildDef("spider", { moveFps: 8, attackFps: 6, castFps: 6 }),
  [UnitType.FAERY_QUEEN]: buildDef("cold_mage", { idleFps: 7, castFps: 9 }),
  [UnitType.COLD_MAGE]: buildDef("cold_mage", { idleFps: 6, castFps: 8 }),
  [UnitType.SPIDER]: buildDef("spider", { moveFps: 12, attackFps: 10, castFps: 10 }),
  [UnitType.GLADIATOR]: buildDef("gladiator", { attackFps: 9, castFps: 10 }),
  [UnitType.DIPLOMAT]: buildDef("diplomat", { moveFps: 8 }),
};
