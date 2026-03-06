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
  [UnitType.SWORDSMAN]: buildDef("swordsman", {
    idleFps: 6,
    moveFps: 10,
    attackFps: 14,
    dieFps: 8,
  }),
  [UnitType.TEMPLAR]: buildDef("templar", {
    idleFps: 6,
    moveFps: 10,
    attackFps: 14,
    dieFps: 8,
  }),
  [UnitType.ASSASSIN]: buildDef("assassin", {
    idleFps: 8,
    moveFps: 12,
    attackFps: 16,
    dieFps: 8,
  }),
  [UnitType.ARCHER]: buildDef("archer", {
    attackFps: 10,
    attackFrames: range(ROW_ATTACK, ROW_ATTACK + 7),
    dieFrames: range(ROW_DIE, ROW_DIE + 7),
  }),
  [UnitType.LONGBOWMAN]: buildDef("longbowman", {
    attackFps: 8,
    attackFrames: range(ROW_ATTACK, ROW_ATTACK + 7),
    dieFrames: range(ROW_DIE, ROW_DIE + 7),
  }),
  [UnitType.CROSSBOWMAN]: buildDef("crossbowman", {
    attackFps: 6,
    attackFrames: range(ROW_ATTACK, ROW_ATTACK + 7),
    dieFrames: range(ROW_DIE, ROW_DIE + 7),
  }),
  [UnitType.REPEATER]: buildDef("repeater", {
    idleFps: 8,
    moveFps: 10,
    attackFps: 20,
    dieFps: 8,
  }),
  [UnitType.KNIGHT]: buildDef("knight", { moveFps: 8, attackFps: 8 }),
  [UnitType.FIRE_MAGE]: buildDef("fire_mage", { idleFps: 6, castFps: 8 }),
  [UnitType.STORM_MAGE]: buildDef("storm_mage", {
    idleFps: 6,
    moveFps: 8,
    attackFps: 10,
    castFps: 8,
    dieFps: 8,
  }),
  [UnitType.PIKEMAN]: buildDef("pikeman", { attackFps: 10 }),
  [UnitType.SUMMONED]: buildDef("summoned", {
    idleFps: 8,
    moveFps: 12,
    attackFps: 14,
    castFps: 10,
    dieFps: 10,
  }),
  [UnitType.BATTERING_RAM]: buildDef("battering_ram", {
    moveFps: 6,
    attackFps: 5,
  }),
  [UnitType.MAGE_HUNTER]: buildDef("mage_hunter"),
  [UnitType.SIEGE_HUNTER]: buildDef("siege_hunter"),
  [UnitType.SUMMONER]: buildDef("summoner", { idleFps: 6, castFps: 8 }),
  [UnitType.CONSTRUCTIONIST]: buildDef("constructionist", {
    idleFps: 6,
    castFps: 8,
  }),
  [UnitType.DISTORTION_MAGE]: buildDef("distortion_mage", {
    idleFps: 6,
    castFps: 10,
  }),
  [UnitType.FIRE_ADEPT_MAGE]: buildDef("fire_adept_mage", {
    idleFps: 6,
    castFps: 8,
  }),
  [UnitType.COLD_ADEPT_MAGE]: buildDef("cold_adept_mage", {
    idleFps: 6,
    castFps: 8,
  }),
  [UnitType.LIGHTNING_ADEPT_MAGE]: buildDef("lightning_adept_mage", {
    idleFps: 6,
    castFps: 8,
  }),
  [UnitType.DISTORTION_ADEPT_MAGE]: buildDef("distortion_adept_mage", {
    idleFps: 6,
    castFps: 10,
  }),
  [UnitType.FIRE_MASTER_MAGE]: buildDef("fire_master_mage", {
    idleFps: 6,
    castFps: 8,
  }),
  [UnitType.COLD_MASTER_MAGE]: buildDef("cold_master_mage", {
    idleFps: 6,
    castFps: 8,
  }),
  [UnitType.LIGHTNING_MASTER_MAGE]: buildDef("lightning_master_mage", {
    idleFps: 6,
    castFps: 8,
  }),
  [UnitType.DISTORTION_MASTER_MAGE]: buildDef("distortion_master_mage", {
    idleFps: 6,
    castFps: 10,
  }),
  [UnitType.VOID_SNAIL]: buildDef("void_snail", {
    moveFps: 8,
    attackFps: 6,
    castFps: 6,
  }),
  [UnitType.FAERY_QUEEN]: buildDef("cold_mage", { idleFps: 7, castFps: 9 }),
  [UnitType.COLD_MAGE]: buildDef("cold_mage", { idleFps: 6, castFps: 8 }),
  [UnitType.SPIDER]: buildDef("spider", {
    moveFps: 12,
    attackFps: 10,
    castFps: 10,
  }),
  [UnitType.GLADIATOR]: buildDef("gladiator", { attackFps: 9, castFps: 10 }),
  [UnitType.GIANT_FROG]: buildDef("giant_frog", {
    moveFps: 7,
    attackFps: 5,
    castFps: 7,
  }),
  [UnitType.DEVOURER]: buildDef("devourer", {
    moveFps: 8,
    attackFps: 10,
    castFps: 8,
  }),
  [UnitType.TROLL]: buildDef("troll", {
    idleFps: 6,
    moveFps: 6,
    attackFps: 8,
    dieFps: 6,
  }),
  [UnitType.RHINO]: buildDef("rhino", {
    idleFps: 6,
    moveFps: 6,
    attackFps: 6,
    dieFps: 5,
  }),
  [UnitType.PIXIE]: buildDef("pixie", {
    idleFps: 8,
    moveFps: 10,
    attackFps: 10,
    attackFrames: range(ROW_ATTACK, ROW_ATTACK + 7),
    dieFps: 6,
  }),
  [UnitType.FIRE_IMP]: buildDef("fire_imp", {
    idleFps: 8,
    moveFps: 10,
    attackFps: 10,
    attackFrames: range(ROW_ATTACK, ROW_ATTACK + 7),
    dieFps: 6,
  }),
  [UnitType.ICE_IMP]: buildDef("ice_imp", {
    idleFps: 8,
    moveFps: 10,
    attackFps: 10,
    attackFrames: range(ROW_ATTACK, ROW_ATTACK + 7),
    dieFps: 6,
  }),
  [UnitType.LIGHTNING_IMP]: buildDef("lightning_imp", {
    idleFps: 8,
    moveFps: 10,
    attackFps: 10,
    attackFrames: range(ROW_ATTACK, ROW_ATTACK + 7),
    dieFps: 6,
  }),
  [UnitType.DISTORTION_IMP]: buildDef("distortion_imp", {
    idleFps: 8,
    moveFps: 10,
    attackFps: 10,
    attackFrames: range(ROW_ATTACK, ROW_ATTACK + 7),
    dieFps: 6,
  }),
  [UnitType.BAT]: buildDef("bat", {
    idleFps: 8,
    moveFps: 12,
    attackFps: 12,
    dieFps: 6,
  }),
  [UnitType.VAMPIRE_BAT]: buildDef("vampire_bat", {
    idleFps: 8,
    moveFps: 10,
    attackFps: 12,
    dieFps: 6,
  }),
  [UnitType.HORSE_ARCHER]: buildDef("horse_archer", { moveFps: 10, attackFps: 12 }),
  [UnitType.ELDER_HORSE_ARCHER]: buildDef("elder_horse_archer", {
    idleFps: 5,
    moveFps: 8,
    attackFps: 10,
    dieFps: 6,
  }),
  [UnitType.SHORTBOW]: buildDef("archer", {
    attackFps: 15,
    attackFrames: range(ROW_ATTACK, ROW_ATTACK + 7),
    dieFrames: range(ROW_DIE, ROW_DIE + 7),
  }),
  [UnitType.BALLISTA]: buildDef("ballista", { attackFps: 6 }),
  [UnitType.BOLT_THROWER]: buildDef("bolt_thrower", { attackFps: 4 }),
  [UnitType.CATAPULT]: buildDef("catapult", { attackFps: 3, moveFps: 6 }),
  [UnitType.SIEGE_CATAPULT]: buildDef("siege_catapult", {
    attackFps: 2,
    moveFps: 5,
  }),
  [UnitType.TREBUCHET]: buildDef("trebuchet", { attackFps: 2, moveFps: 4 }),
  [UnitType.WAR_WAGON]: buildDef("war_wagon", { moveFps: 6, attackFps: 6 }),
  [UnitType.BOMBARD]: buildDef("bombard", { moveFps: 4, attackFps: 3 }),
  [UnitType.SIEGE_TOWER]: buildDef("siege_tower", { moveFps: 4, attackFps: 4 }),
  [UnitType.HELLFIRE_MORTAR]: buildDef("hellfire_mortar", { moveFps: 3, attackFps: 2 }),
  [UnitType.SCOUT_CAVALRY]: buildDef("scout_cavalry", { moveFps: 12, attackFps: 10 }),
  [UnitType.LANCER]: buildDef("lancer", { moveFps: 10, attackFps: 8 }),
  [UnitType.ELITE_LANCER]: buildDef("elite_lancer", { moveFps: 10, attackFps: 8 }),
  [UnitType.KNIGHT_LANCER]: buildDef("knight_lancer", { moveFps: 8, attackFps: 6 }),
  [UnitType.ROYAL_LANCER]: buildDef("royal_lancer", {
    idleFps: 8,
    moveFps: 12,
    attackFps: 10,
    dieFps: 8,
  }),
  [UnitType.MONK]: buildDef("monk", { moveFps: 8, attackFps: 10 }),
  [UnitType.CLERIC]: buildDef("cleric", { moveFps: 8, attackFps: 10 }),
  [UnitType.SAINT]: buildDef("saint", { moveFps: 6, attackFps: 8 }),
  [UnitType.DIPLOMAT]: buildDef("diplomat", { moveFps: 8 }),
  [UnitType.SETTLER]: buildDef("settler", { moveFps: 8 }),
  [UnitType.ENGINEER]: buildDef("engineer", { moveFps: 8 }),
  [UnitType.RED_DRAGON]: buildDef("red_dragon", {
    idleFps: 4,
    moveFps: 8,
    attackFps: 10,
    castFps: 8,
    dieFps: 6,
  }),
  [UnitType.FROST_DRAGON]: buildDef("frost_dragon", {
    idleFps: 4,
    moveFps: 8,
    attackFps: 10,
    castFps: 8,
    dieFps: 6,
  }),
  [UnitType.CYCLOPS]: buildDef("cyclops", {
    idleFps: 3,
    moveFps: 6,
    attackFps: 8,
    castFps: 6,
    dieFps: 5,
  }),
  [UnitType.HALBERDIER]: buildDef("halberdier", { attackFps: 11 }),
  [UnitType.ELVEN_ARCHER]: buildDef("elven_archer", {
    attackFps: 9,
    attackFrames: range(ROW_ATTACK, ROW_ATTACK + 6),
  }),
  [UnitType.HERO]: buildDef("hero", {
    idleFps: 6,
    moveFps: 10,
    attackFps: 14,
    dieFps: 8,
  }),
  [UnitType.QUESTING_KNIGHT]: buildDef("questing_knight", {
    idleFps: 6,
    moveFps: 8,
    attackFps: 8,
  }),
  [UnitType.ANGEL]: buildDef("angel", {
    idleFps: 6,
    moveFps: 8,
    attackFps: 10,
    castFps: 8,
    dieFps: 8,
  }),
  [UnitType.DARK_SAVANT]: buildDef("dark_savant", {
    idleFps: 6,
    moveFps: 8,
    attackFps: 8,
    castFps: 8,
    dieFps: 8,
  }),
  [UnitType.DEFENDER]: buildDef("defender", {
    idleFps: 6,
    moveFps: 8,
    attackFps: 12,
    dieFps: 8,
  }),
  [UnitType.PHALANX]: buildDef("phalanx", {
    idleFps: 6,
    moveFps: 8,
    attackFps: 12,
    dieFps: 8,
  }),
  [UnitType.ROYAL_PHALANX]: buildDef("royal_phalanx", {
    idleFps: 6,
    moveFps: 8,
    attackFps: 12,
    dieFps: 8,
  }),
  [UnitType.ROYAL_DEFENDER]: buildDef("royal_defender", {
    idleFps: 6,
    moveFps: 8,
    attackFps: 12,
    dieFps: 8,
  }),
  [UnitType.AXEMAN]: buildDef("axeman", {
    idleFps: 6,
    moveFps: 10,
    attackFps: 14,
    dieFps: 8,
  }),
  [UnitType.BERSERKER]: buildDef("berserker", {
    idleFps: 6,
    moveFps: 10,
    attackFps: 14,
    dieFps: 8,
  }),
  [UnitType.ANCIENT_DEFENDER]: buildDef("ancient_defender", {
    idleFps: 6,
    moveFps: 8,
    attackFps: 12,
    dieFps: 8,
  }),
  [UnitType.ANCIENT_PHALANX]: buildDef("ancient_phalanx", {
    idleFps: 6,
    moveFps: 8,
    attackFps: 12,
    dieFps: 8,
  }),
  [UnitType.ANCIENT_AXEMAN]: buildDef("ancient_axeman", {
    idleFps: 6,
    moveFps: 10,
    attackFps: 14,
    dieFps: 8,
  }),
  [UnitType.ANCIENT_ARCHER]: buildDef("ancient_archer", {
    idleFps: 6,
    moveFps: 8,
    attackFps: 10,
    dieFps: 8,
  }),
  [UnitType.ANCIENT_LONGBOWMAN]: buildDef("ancient_longbowman", {
    idleFps: 6,
    moveFps: 8,
    attackFps: 8,
    dieFps: 8,
  }),
  [UnitType.ANCIENT_CROSSBOWMAN]: buildDef("ancient_crossbowman", {
    idleFps: 6,
    moveFps: 8,
    attackFps: 6,
    dieFps: 8,
  }),
  [UnitType.ELDER_ARCHER]: buildDef("elder_archer", {
    idleFps: 5,
    moveFps: 7,
    attackFps: 10,
    dieFps: 7,
  }),
  [UnitType.ELDER_REPEATER]: buildDef("elder_repeater", {
    idleFps: 5,
    moveFps: 7,
    attackFps: 14,
    dieFps: 7,
  }),
  [UnitType.ELDER_JAVELINEER]: buildDef("elder_javelineer", {
    idleFps: 5,
    moveFps: 7,
    attackFps: 10,
    dieFps: 7,
  }),
  [UnitType.ELDER_DEFENDER]: buildDef("elder_defender", {
    idleFps: 6,
    moveFps: 8,
    attackFps: 12,
    dieFps: 8,
  }),
  [UnitType.ELDER_PHALANX]: buildDef("elder_phalanx", {
    idleFps: 6,
    moveFps: 8,
    attackFps: 12,
    dieFps: 8,
  }),
  [UnitType.ELDER_AXEMAN]: buildDef("elder_axeman", {
    idleFps: 6,
    moveFps: 10,
    attackFps: 14,
    dieFps: 8,
  }),
  [UnitType.JAVELINEER]: buildDef("javelin", {
    idleFps: 6,
    moveFps: 10,
    attackFps: 8,
    dieFps: 8,
  }),
  [UnitType.ARBALESTIER]: buildDef("arbelestier", {
    idleFps: 6,
    moveFps: 10,
    attackFps: 8,
    dieFps: 8,
  }),
  [UnitType.ROYAL_ARBALESTIER]: buildDef("arbelestier", {
    idleFps: 6,
    moveFps: 10,
    attackFps: 8,
    dieFps: 8,
  }),
  [UnitType.WARCHIEF]: buildDef("warchief", {
    idleFps: 6,
    moveFps: 10,
    attackFps: 12,
    dieFps: 8,
  }),
  [UnitType.ARCHMAGE]: buildDef("archmage", {
    idleFps: 6,
    moveFps: 8,
    attackFps: 10,
    dieFps: 8,
  }),
  [UnitType.RUFUS]: buildDef("rufus", {
    idleFps: 6,
    moveFps: 12,
    attackFps: 14,
    dieFps: 8,
  }),
  [UnitType.TROUBADOUR]: buildDef("troubadour", {
    idleFps: 6,
    moveFps: 8,
    attackFps: 10,
    dieFps: 8,
  }),
  [UnitType.GIANT_COURT_JESTER]: buildDef("giant_court_jester", {
    idleFps: 6,
    moveFps: 8,
    attackFps: 10,
    dieFps: 8,
  }),
  [UnitType.FISHERMAN]: buildDef("fisherman", {
    idleFps: 6,
    moveFps: 8,
    attackFps: 12,
    castFps: 10,
    dieFps: 8,
  }),
  [UnitType.FIRE_ELEMENTAL]: buildDef("fire_elemental", {
    idleFps: 6,
    moveFps: 8,
    attackFps: 10,
    castFps: 8,
    dieFps: 6,
  }),
  [UnitType.ICE_ELEMENTAL]: buildDef("ice_elemental", {
    idleFps: 6,
    moveFps: 8,
    attackFps: 10,
    castFps: 8,
    dieFps: 6,
  }),
  [UnitType.MINOR_FIRE_ELEMENTAL]: buildDef("minor_fire_elemental", {
    idleFps: 6,
    moveFps: 8,
    attackFps: 10,
    castFps: 8,
    dieFps: 6,
  }),
  [UnitType.MINOR_ICE_ELEMENTAL]: buildDef("minor_ice_elemental", {
    idleFps: 6,
    moveFps: 8,
    attackFps: 10,
    castFps: 8,
    dieFps: 6,
  }),
  [UnitType.LIGHTNING_ELEMENTAL]: buildDef("lightning_elemental", {
    idleFps: 6,
    moveFps: 8,
    attackFps: 10,
    castFps: 8,
    dieFps: 6,
  }),
  [UnitType.DISTORTION_ELEMENTAL]: buildDef("distortion_elemental", {
    idleFps: 6,
    moveFps: 8,
    attackFps: 10,
    castFps: 8,
    dieFps: 6,
  }),
  [UnitType.MINOR_LIGHTNING_ELEMENTAL]: buildDef("minor_lightning_elemental", {
    idleFps: 6,
    moveFps: 8,
    attackFps: 10,
    castFps: 8,
    dieFps: 6,
  }),
  [UnitType.MINOR_DISTORTION_ELEMENTAL]: buildDef("minor_distortion_elemental", {
    idleFps: 6,
    moveFps: 8,
    attackFps: 10,
    castFps: 8,
    dieFps: 6,
  }),
  [UnitType.EARTH_ELEMENTAL]: buildDef("earth_elemental", {
    idleFps: 6,
    moveFps: 8,
    attackFps: 10,
    castFps: 8,
    dieFps: 6,
  }),
  [UnitType.MINOR_EARTH_ELEMENTAL]: buildDef("minor_earth_elemental", {
    idleFps: 6,
    moveFps: 8,
    attackFps: 10,
    castFps: 8,
    dieFps: 6,
  }),
  [UnitType.GIANT_WARRIOR]: buildDef("giant_warrior", {
    idleFps: 4,
    moveFps: 6,
    attackFps: 6,
    castFps: 6,
    dieFps: 5,
  }),
  [UnitType.GIANT_ARCHER]: buildDef("giant_archer", {
    idleFps: 4,
    moveFps: 6,
    attackFps: 6,
    castFps: 6,
    dieFps: 5,
  }),
  [UnitType.GIANT_SIEGE]: buildDef("giant_siege", {
    idleFps: 4,
    moveFps: 5,
    attackFps: 5,
    castFps: 5,
    dieFps: 4,
  }),
  [UnitType.GIANT_MAGE]: buildDef("giant_mage", {
    idleFps: 4,
    moveFps: 6,
    attackFps: 6,
    castFps: 6,
    dieFps: 5,
  }),
  [UnitType.GIANT_CAVALRY]: buildDef("giant_cavalry", {
    idleFps: 4,
    moveFps: 6,
    attackFps: 6,
    castFps: 6,
    dieFps: 5,
  }),
  [UnitType.ROYAL_GUARD]: buildDef("royal_guard", {
    idleFps: 6,
    moveFps: 8,
    attackFps: 10,
    castFps: 8,
    dieFps: 7,
  }),
  [UnitType.MARKSMAN]: buildDef("marksman", {
    idleFps: 6,
    moveFps: 8,
    attackFps: 8,
    castFps: 8,
    dieFps: 7,
  }),
  [UnitType.CANNON]: buildDef("cannon", {
    idleFps: 4,
    moveFps: 6,
    attackFps: 6,
    castFps: 6,
    dieFps: 6,
  }),
  [UnitType.BATTLEMAGE]: buildDef("battlemage", {
    idleFps: 6,
    moveFps: 8,
    attackFps: 10,
    castFps: 8,
    dieFps: 7,
  }),
  [UnitType.CATAPHRACT]: buildDef("cataphract", {
    idleFps: 6,
    moveFps: 8,
    attackFps: 8,
    castFps: 6,
    dieFps: 6,
  }),
  [UnitType.UNICORN]: buildDef("unicorn", {
    idleFps: 6,
    moveFps: 8,
    attackFps: 10,
    castFps: 6,
    dieFps: 7,
  }),
  // National mages (reuse mage sprite)
  [UnitType.NATIONAL_MAGE_T1]: buildDef("mage", { idleFps: 6, castFps: 8 }),
  [UnitType.NATIONAL_MAGE_T2]: buildDef("mage", { idleFps: 6, castFps: 8 }),
  [UnitType.NATIONAL_MAGE_T3]: buildDef("mage", { idleFps: 6, castFps: 8 }),
  [UnitType.NATIONAL_MAGE_T4]: buildDef("mage", { idleFps: 6, castFps: 8 }),
  [UnitType.NATIONAL_MAGE_T5]: buildDef("mage", { idleFps: 6, castFps: 8 }),
  [UnitType.NATIONAL_MAGE_T6]: buildDef("mage", { idleFps: 6, castFps: 8 }),
  [UnitType.NATIONAL_MAGE_T7]: buildDef("mage", { idleFps: 6, castFps: 8 }),
  [UnitType.HALFLING_SLINGER]: buildDef("archer", {
    attackFps: 10,
    attackFrames: range(ROW_ATTACK, ROW_ATTACK + 7),
    dieFrames: range(ROW_DIE, ROW_DIE + 7),
  }),
  [UnitType.HALFLING_CHEF]: buildDef("monk", { moveFps: 8, attackFps: 10 }),
  [UnitType.MAGMA_GOLEM]: buildDef("troll", {
    idleFps: 6,
    moveFps: 6,
    attackFps: 8,
    dieFps: 6,
  }),
  [UnitType.LAVA_SHAMAN]: buildDef("fire_mage", { idleFps: 6, castFps: 8 }),
  [UnitType.DWARVEN_GUARDIAN]: buildDef("royal_defender", {
    idleFps: 6,
    moveFps: 8,
    attackFps: 12,
    dieFps: 8,
  }),
  [UnitType.RUNESMITH]: buildDef("storm_mage", {
    idleFps: 6,
    moveFps: 8,
    attackFps: 10,
    castFps: 8,
    dieFps: 8,
  }),
  [UnitType.ORC_BRUTE]: buildDef("berserker", {
    idleFps: 6,
    moveFps: 10,
    attackFps: 14,
    dieFps: 8,
  }),
  [UnitType.ORC_DRUMMER]: buildDef("warchief", {
    idleFps: 6,
    moveFps: 10,
    attackFps: 12,
    dieFps: 8,
  }),
  [UnitType.DEATH_KNIGHT]: buildDef("cataphract", {
    idleFps: 6,
    moveFps: 8,
    attackFps: 8,
    castFps: 6,
    dieFps: 6,
  }),
  [UnitType.NECROMANCER]: buildDef("dark_savant", {
    idleFps: 6,
    moveFps: 8,
    attackFps: 8,
    castFps: 8,
    dieFps: 8,
  }),
  [UnitType.PIT_LORD]: buildDef("cyclops", {
    idleFps: 3,
    moveFps: 6,
    attackFps: 8,
    castFps: 6,
    dieFps: 5,
  }),
  [UnitType.HELLFIRE_WARLOCK]: buildDef("fire_master_mage", {
    idleFps: 6,
    castFps: 8,
  }),
  [UnitType.SERAPHIM]: buildDef("angel", {
    idleFps: 6,
    moveFps: 8,
    attackFps: 10,
    castFps: 8,
    dieFps: 8,
  }),
  [UnitType.DIVINE_CHAMPION]: buildDef("templar", {
    idleFps: 6,
    moveFps: 10,
    attackFps: 14,
    dieFps: 8,
  }),
  [UnitType.ALPHA_WOLF]: buildDef("scout_cavalry", { moveFps: 12, attackFps: 10 }),
  [UnitType.BEAST_SHAMAN]: buildDef("summoner", { idleFps: 6, castFps: 8 }),
  [UnitType.WAR_GOLEM]: buildDef("giant_warrior", {
    idleFps: 4,
    moveFps: 6,
    attackFps: 6,
    castFps: 6,
    dieFps: 5,
  }),
  [UnitType.RUNE_CORE]: buildDef("constructionist", {
    idleFps: 6,
    castFps: 8,
  }),
  [UnitType.PIRATE_CAPTAIN]: buildDef("gladiator", { attackFps: 9, castFps: 10 }),
  [UnitType.CORSAIR_GUNNER]: buildDef("marksman", {
    idleFps: 6,
    moveFps: 8,
    attackFps: 8,
    castFps: 8,
    dieFps: 7,
  }),
  [UnitType.ELEMENTAL_AVATAR]: buildDef("fireElemental", {
    idleFps: 6,
    moveFps: 8,
    attackFps: 10,
    castFps: 10,
  }),
  [UnitType.KNIGHT_COMMANDER]: buildDef("knight_commander", {
    idleFps: 6, moveFps: 8, attackFps: 10, castFps: 10,
  }),
  [UnitType.BLADEDANCER]: buildDef("bladedancer", {
    idleFps: 6, moveFps: 8, attackFps: 12, castFps: 10,
  }),
  [UnitType.BOAR_RIDER]: buildDef("boar_rider", {
    idleFps: 6, moveFps: 8, attackFps: 10, castFps: 10,
  }),
  [UnitType.CHRONOMANCER]: buildDef("chronomancer", {
    idleFps: 6, moveFps: 8, attackFps: 10, castFps: 10,
  }),
  [UnitType.STORM_CONDUIT]: buildDef("storm_conduit", {
    idleFps: 6, moveFps: 8, attackFps: 10, castFps: 10,
  }),
  [UnitType.HALFLING_BURGLAR]: buildDef("halfling_burglar", {
    idleFps: 6, moveFps: 8, attackFps: 12, castFps: 10,
  }),
  [UnitType.OBSIDIAN_SENTINEL]: buildDef("obsidian_sentinel", {
    idleFps: 6, moveFps: 8, attackFps: 10, castFps: 10,
  }),
  [UnitType.DWARVEN_CANNON]: buildDef("dwarven_cannon", {
    idleFps: 6, moveFps: 8, attackFps: 10, castFps: 10,
  }),
  [UnitType.ORC_SHAMAN]: buildDef("orc_shaman", {
    idleFps: 6, moveFps: 8, attackFps: 10, castFps: 10,
  }),
  [UnitType.BANSHEE]: buildDef("banshee", {
    idleFps: 6, moveFps: 8, attackFps: 10, castFps: 10,
  }),
  [UnitType.SUCCUBUS]: buildDef("succubus", {
    idleFps: 6, moveFps: 8, attackFps: 10, castFps: 10,
  }),
  [UnitType.VALKYRIE]: buildDef("valkyrie", {
    idleFps: 6, moveFps: 8, attackFps: 10, castFps: 10,
  }),
  [UnitType.THUNDERHAWK]: buildDef("thunderhawk", {
    idleFps: 6, moveFps: 8, attackFps: 10, castFps: 10,
  }),
  [UnitType.SIEGE_AUTOMATON]: buildDef("siege_automaton", {
    idleFps: 6, moveFps: 8, attackFps: 10, castFps: 10,
  }),
  [UnitType.POWDER_MONKEY]: buildDef("powder_monkey", {
    idleFps: 6, moveFps: 8, attackFps: 10, castFps: 10,
  }),
  // Wave 2 faction units
  // Man
  [UnitType.WAR_CHAPLAIN]: buildDef("war_chaplain", {
    idleFps: 5, moveFps: 8, attackFps: 10, castFps: 8, dieFps: 7,
  }),
  [UnitType.SHIELD_CAPTAIN]: buildDef("shield_captain", {
    idleFps: 5, moveFps: 6, attackFps: 10, castFps: 8, dieFps: 7,
  }),
  // Elves
  [UnitType.TREANT_GUARDIAN]: buildDef("treant_guardian", {
    idleFps: 4, moveFps: 5, attackFps: 6, castFps: 6, dieFps: 5,
  }),
  [UnitType.MOONWEAVER]: buildDef("moonweaver", {
    idleFps: 6, moveFps: 8, attackFps: 10, castFps: 10, dieFps: 8,
  }),
  // Horde
  [UnitType.SIEGE_TROLL]: buildDef("siege_troll", {
    idleFps: 4, moveFps: 5, attackFps: 5, castFps: 5, dieFps: 5,
  }),
  [UnitType.BLOOD_BERSERKER]: buildDef("blood_berserker", {
    idleFps: 6, moveFps: 12, attackFps: 16, castFps: 10, dieFps: 8,
  }),
  // Adept
  [UnitType.SPELL_WEAVER]: buildDef("spell_weaver", {
    idleFps: 6, moveFps: 8, attackFps: 10, castFps: 10, dieFps: 8,
  }),
  [UnitType.MANA_WRAITH]: buildDef("mana_wraith", {
    idleFps: 7, moveFps: 9, attackFps: 12, castFps: 10, dieFps: 8,
  }),
  // Elements
  [UnitType.FROST_WYRM]: buildDef("frost_wyrm", {
    idleFps: 4, moveFps: 7, attackFps: 8, castFps: 8, dieFps: 6,
  }),
  [UnitType.MAGMA_TITAN]: buildDef("magma_titan", {
    idleFps: 4, moveFps: 5, attackFps: 6, castFps: 6, dieFps: 5,
  }),
  // Halflings
  [UnitType.HALFLING_RIDER]: buildDef("halfling_rider", {
    idleFps: 6, moveFps: 10, attackFps: 10, castFps: 8, dieFps: 8,
  }),
  [UnitType.HALFLING_ALCHEMIST]: buildDef("halfling_alchemist", {
    idleFps: 6, moveFps: 8, attackFps: 10, castFps: 10, dieFps: 8,
  }),
  // Lava Children
  [UnitType.CINDER_WRAITH]: buildDef("cinder_wraith", {
    idleFps: 8, moveFps: 10, attackFps: 12, castFps: 10, dieFps: 8,
  }),
  [UnitType.VOLCANIC_BEHEMOTH]: buildDef("volcanic_behemoth", {
    idleFps: 3, moveFps: 4, attackFps: 4, castFps: 4, dieFps: 4,
  }),
  // Dwarves
  [UnitType.IRONBREAKER]: buildDef("ironbreaker", {
    idleFps: 5, moveFps: 7, attackFps: 10, castFps: 8, dieFps: 7,
  }),
  [UnitType.THUNDERER]: buildDef("thunderer", {
    idleFps: 5, moveFps: 7, attackFps: 6, castFps: 6, dieFps: 7,
  }),
  // Orcs
  [UnitType.WYVERN_RIDER]: buildDef("wyvern_rider", {
    idleFps: 5, moveFps: 8, attackFps: 10, castFps: 8, dieFps: 6,
  }),
  [UnitType.PIT_FIGHTER]: buildDef("pit_fighter", {
    idleFps: 6, moveFps: 10, attackFps: 14, castFps: 10, dieFps: 8,
  }),
  // Undead
  [UnitType.BONE_COLOSSUS]: buildDef("bone_colossus", {
    idleFps: 3, moveFps: 4, attackFps: 5, castFps: 5, dieFps: 4,
  }),
  [UnitType.WRAITH_LORD]: buildDef("wraith_lord", {
    idleFps: 6, moveFps: 8, attackFps: 10, castFps: 10, dieFps: 8,
  }),
  // Demons
  [UnitType.DOOM_GUARD]: buildDef("doom_guard", {
    idleFps: 5, moveFps: 7, attackFps: 10, castFps: 8, dieFps: 7,
  }),
  [UnitType.IMP_OVERLORD]: buildDef("imp_overlord", {
    idleFps: 5, moveFps: 7, attackFps: 8, castFps: 10, dieFps: 7,
  }),
  // Angels
  [UnitType.ARCHON]: buildDef("archon", {
    idleFps: 5, moveFps: 8, attackFps: 10, castFps: 8, dieFps: 7,
  }),
  [UnitType.CELESTIAL_ARCHER]: buildDef("celestial_archer", {
    idleFps: 6, moveFps: 8, attackFps: 10, castFps: 8, dieFps: 8,
  }),
  // Beastkin
  [UnitType.DIRE_BEAR]: buildDef("dire_bear", {
    idleFps: 4, moveFps: 6, attackFps: 8, castFps: 6, dieFps: 5,
  }),
  [UnitType.SERPENT_PRIEST]: buildDef("serpent_priest", {
    idleFps: 6, moveFps: 8, attackFps: 10, castFps: 10, dieFps: 8,
  }),
  // Golem Collective
  [UnitType.CRYSTAL_GOLEM]: buildDef("crystal_golem", {
    idleFps: 5, moveFps: 6, attackFps: 8, castFps: 8, dieFps: 6,
  }),
  [UnitType.IRON_COLOSSUS]: buildDef("iron_colossus", {
    idleFps: 3, moveFps: 4, attackFps: 5, castFps: 5, dieFps: 4,
  }),
  // Pirates
  [UnitType.SEA_WITCH]: buildDef("sea_witch", {
    idleFps: 6, moveFps: 8, attackFps: 10, castFps: 10, dieFps: 8,
  }),
  [UnitType.BOARDING_MASTER]: buildDef("boarding_master", {
    idleFps: 6, moveFps: 10, attackFps: 14, castFps: 10, dieFps: 8,
  }),
};
