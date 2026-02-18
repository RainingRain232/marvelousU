// Maps unit types → spritesheet frame ranges for each UnitState
import { UnitType, UnitState } from "@/types";

export type AnimationDef = Record<UnitState, { sheet: string; frames: number[] }>;

export const ANIMATION_DEFS: Partial<Record<UnitType, AnimationDef>> = {
  // TODO: populate when spritesheets are available
  // Example shape:
  // [UnitType.SWORDSMAN]: {
  //   [UnitState.IDLE]:   { sheet: "swordsman", frames: [0,1,2,3] },
  //   [UnitState.MOVE]:   { sheet: "swordsman", frames: [4,5,6,7] },
  //   [UnitState.ATTACK]: { sheet: "swordsman", frames: [8,9,10] },
  //   [UnitState.CAST]:   { sheet: "swordsman", frames: [11,12] },
  //   [UnitState.DIE]:    { sheet: "swordsman", frames: [13,14,15] },
  // },
};
