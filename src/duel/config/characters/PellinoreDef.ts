// ---------------------------------------------------------------------------
// Pellinore – "The Questing King" – Heavy brawler / beast-type axe fighter
// Massive war axe, brutal power attacks, highest damage in the roster
// ---------------------------------------------------------------------------

import { AttackHeight } from "../../../types";
import type { DuelMoveDef, DuelCharacterDef } from "../../state/DuelState";

// ---- Helper to build a normal move ----------------------------------------

function normal(
  id: string,
  name: string,
  height: AttackHeight,
  startup: number,
  active: number,
  recovery: number,
  damage: number,
  hitstun: number,
  blockstun: number,
  knockback: number,
  hitbox: { x: number; y: number; width: number; height: number },
  extra?: Partial<DuelMoveDef>,
): DuelMoveDef {
  return {
    id,
    name,
    type: "normal",
    height,
    startup,
    active,
    recovery,
    damage,
    chipDamage: 0,
    hitstun,
    blockstun,
    knockback,
    hitbox,
    ...extra,
  };
}

function special(
  id: string,
  name: string,
  height: AttackHeight,
  startup: number,
  active: number,
  recovery: number,
  damage: number,
  chipDamage: number,
  hitstun: number,
  blockstun: number,
  knockback: number,
  hitbox: { x: number; y: number; width: number; height: number },
  extra?: Partial<DuelMoveDef>,
): DuelMoveDef {
  return {
    id,
    name,
    type: "special",
    height,
    startup,
    active,
    recovery,
    damage,
    chipDamage,
    hitstun,
    blockstun,
    knockback,
    hitbox,
    ...extra,
  };
}

function zeal(
  id: string,
  name: string,
  height: AttackHeight,
  startup: number,
  active: number,
  recovery: number,
  damage: number,
  chipDamage: number,
  hitstun: number,
  blockstun: number,
  knockback: number,
  hitbox: { x: number; y: number; width: number; height: number },
  extra?: Partial<DuelMoveDef>,
): DuelMoveDef {
  return {
    id,
    name,
    type: "zeal",
    height,
    startup,
    active,
    recovery,
    damage,
    chipDamage,
    hitstun,
    blockstun,
    knockback,
    hitbox,
    ...extra,
  };
}

// ===========================================================================
// PELLINORE — Axe Brawler / Beast King
// ===========================================================================

export const PELLINORE_DEF: DuelCharacterDef = {
  id: "pellinore",
  name: "Pellinore",
  title: "The Questing King",
  portrait: "pellinore",
  fighterType: "axe",
  maxHp: 1080,
  walkSpeed: 4.0,
  backWalkSpeed: 3.0,
  jumpVelocity: -17,
  jumpForwardSpeed: 4.5,
  weight: 1.2,

  normals: {
    // Q — Light high: slow axe jab, still hits hard
    light_high: normal(
      "light_high", "Axe Jab", AttackHeight.HIGH,
      5, 4, 8, 38, 14, 10, 12,
      { x: 40, y: -120, width: 80, height: 40 },
    ),
    // W — Medium high: horizontal axe swing
    med_high: normal(
      "med_high", "Axe Swing", AttackHeight.HIGH,
      10, 5, 14, 72, 20, 14, 30,
      { x: 35, y: -115, width: 100, height: 50 },
    ),
    // E — Heavy high: massive overhead axe chop (one of the highest normal damages)
    heavy_high: normal(
      "heavy_high", "Axe Chop", AttackHeight.HIGH,
      16, 6, 20, 115, 28, 18, 55,
      { x: 25, y: -155, width: 90, height: 80 },
    ),
    // A — Light low: heavy boot kick
    light_low: normal(
      "light_low", "Boot Kick", AttackHeight.LOW,
      5, 4, 8, 32, 12, 9, 10,
      { x: 35, y: -25, width: 70, height: 35 },
    ),
    // S — Medium low: crouching axe sweep
    med_low: normal(
      "med_low", "Low Axe Sweep", AttackHeight.LOW,
      10, 5, 14, 60, 18, 12, 22,
      { x: 30, y: -35, width: 95, height: 45 },
    ),
    // D — Heavy low: rising axe launcher
    heavy_low: normal(
      "heavy_low", "Savage Launch", AttackHeight.LOW,
      15, 6, 20, 90, 0, 16, 40,
      { x: 25, y: -20, width: 95, height: 40 },
      { isLauncher: true },
    ),
  },

  specials: {
    // Q+W — Axe Cleave: lunging forward chop
    axe_cleave: special(
      "axe_cleave", "Axe Cleave", AttackHeight.MID,
      10, 6, 16, 95, 19, 22, 16, 45,
      { x: 35, y: -110, width: 110, height: 50 },
      { movesForward: 230 },
    ),
    // W+E — Wild Crash: beastly overhead crashes with wild ferocity — wider than any other overhead
    beast_slam: special(
      "beast_slam", "Wild Crash", AttackHeight.OVERHEAD,
      18, 7, 22, 142, 28, 30, 20, 70,
      { x: -12, y: -175, width: 188, height: 105 },
    ),
    // A+S — Earth Shatter: axe smashes the ground so hard shockwave travels the full arena length
    ground_smash: special(
      "ground_smash", "Earth Shatter", AttackHeight.LOW,
      14, 6, 20, 78, 15, 20, 14, 28,
      { x: 0, y: -18, width: 285, height: 30 },
    ),
    // S+D — Savage Rise: anti-air rising axe uppercut
    savage_rise: special(
      "savage_rise", "Savage Rise", AttackHeight.MID,
      7, 8, 24, 110, 22, 26, 18, 55,
      { x: 15, y: -190, width: 70, height: 110 },
      { isAntiAir: true, hasInvincibility: true, invincibleStartup: 5 },
    ),
    // Q+D — Stampede: rushing forward bull charge
    stampede: special(
      "stampede", "Stampede", AttackHeight.MID,
      9, 7, 20, 100, 20, 24, 16, 60,
      { x: 20, y: -105, width: 80, height: 65 },
      { movesForward: 340, hasInvincibility: true, invincibleStartup: 4 },
    ),
    // E+A — Questing Blow: massive single-hit axe strike
    questing_blow: special(
      "questing_blow", "Questing Blow", AttackHeight.MID,
      14, 8, 26, 170, 34, 32, 22, 75,
      { x: 10, y: -160, width: 100, height: 110 },
      { hasInvincibility: true, invincibleStartup: 6 },
    ),
    // E+D — Frenzied Arc: wild spinning that hits everything around Pellinore — full 360 range
    wild_swing: special(
      "wild_swing", "Frenzied Arc", AttackHeight.MID,
      12, 9, 22, 122, 24, 26, 18, 55,
      { x: -58, y: -188, width: 245, height: 205 },
    ),
    // W+S — Beast Guard: counter stance, absorbs and retaliates
    beast_guard: special(
      "beast_guard", "Beast Guard", AttackHeight.MID,
      3, 12, 18, 90, 18, 24, 16, 45,
      { x: 15, y: -125, width: 75, height: 85 },
      { hasInvincibility: true, invincibleStartup: 10 },
    ),
  },

  zeals: {
    // Zeal 1 — Beast Stampede: the beast runs through the entire arena — ground-level full-screen shockwave
    questing_beast: zeal(
      "questing_beast", "Beast Stampede", AttackHeight.MID,
      8, 8, 24, 162, 32, 30, 20, 60,
      { x: 0, y: -82, width: 700, height: 88 },
    ),
    // Zeal 2 — Primal Fury: ultimate launcher, HIGHEST damage in the game
    primal_fury: zeal(
      "primal_fury", "Primal Fury", AttackHeight.MID,
      16, 12, 30, 320, 64, 42, 26, 90,
      { x: 15, y: -170, width: 180, height: 140 },
      { isLauncher: true },
    ),
  },

  grab: {
    id: "bear_crush",
    name: "Bear Crush",
    type: "grab",
    height: AttackHeight.MID,
    startup: 6,
    active: 4,
    recovery: 28,
    damage: 100,
    chipDamage: 0,
    hitstun: 32,
    blockstun: 0,
    knockback: 95,
    hitbox: { x: 25, y: -105, width: 60, height: 75 },
  },
};
