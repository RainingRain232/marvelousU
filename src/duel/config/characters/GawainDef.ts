// ---------------------------------------------------------------------------
// Gawain – "Knight of the Sun" – Mounted archer / horse archer
// Composite bow fighter with sun-themed abilities, golden armor
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
// GAWAIN — Archer (Composite Bow / Horse Archer)
// ===========================================================================

export const GAWAIN_DEF: DuelCharacterDef = {
  id: "gawain",
  name: "Gawain",
  title: "Knight of the Sun",
  portrait: "gawain",
  fighterType: "archer",
  maxHp: 900,
  walkSpeed: 5.8,
  backWalkSpeed: 4.3,
  jumpVelocity: -20,
  jumpForwardSpeed: 6.5,
  weight: 0.85,

  normals: {
    // Q — Light high: quick bow jab forward
    light_high: normal(
      "light_high", "Bow Jab", AttackHeight.HIGH,
      3, 3, 6, 24, 10, 7, 6,
      { x: 38, y: -118, width: 62, height: 30 },
    ),
    // W — Medium high: horizontal bow swing
    med_high: normal(
      "med_high", "Sun Swing", AttackHeight.HIGH,
      6, 4, 9, 48, 15, 10, 16,
      { x: 32, y: -112, width: 82, height: 36 },
    ),
    // E — Heavy high: overhead bow slam with sun force
    heavy_high: normal(
      "heavy_high", "Solar Slam", AttackHeight.HIGH,
      11, 5, 14, 78, 20, 14, 34,
      { x: 26, y: -135, width: 76, height: 52 },
    ),
    // A — Light low: quick shin kick
    light_low: normal(
      "light_low", "Sun Kick", AttackHeight.LOW,
      3, 3, 6, 20, 9, 6, 5,
      { x: 36, y: -22, width: 56, height: 30 },
    ),
    // S — Medium low: crouching knee strike
    med_low: normal(
      "med_low", "Low Knee", AttackHeight.LOW,
      7, 4, 10, 42, 14, 9, 13,
      { x: 30, y: -28, width: 72, height: 34 },
    ),
    // D — Heavy low: sweeping low kick launcher
    heavy_low: normal(
      "heavy_low", "Dawn Sweep", AttackHeight.LOW,
      12, 5, 16, 65, 0, 13, 24,
      { x: 22, y: -18, width: 82, height: 32 },
      { isLauncher: true },
    ),
  },

  specials: {
    // Q+W — Sun Arrow: fast arrow projectile
    sun_arrow: special(
      "sun_arrow", "Sun Arrow", AttackHeight.MID,
      7, 3, 11, 52, 10, 16, 10, 20,
      { x: 50, y: -100, width: 30, height: 22 },
      { isProjectile: true, projectileSpeed: 13, projectileHeight: AttackHeight.MID },
    ),
    // W+E — Blazing Rain: overhead arcing shot
    blazing_rain: special(
      "blazing_rain", "Blazing Rain", AttackHeight.OVERHEAD,
      15, 8, 16, 75, 15, 22, 14, 32,
      { x: 120, y: -180, width: 110, height: 180 },
    ),
    // A+S — Low Kick: quick combo starter
    low_kick: special(
      "low_kick", "Low Kick", AttackHeight.LOW,
      5, 4, 11, 38, 8, 14, 8, 8,
      { x: 28, y: -18, width: 76, height: 30 },
    ),
    // S+D — Solar Flip: backflip with projectile
    solar_flip: special(
      "solar_flip", "Solar Flip", AttackHeight.MID,
      6, 6, 10, 58, 12, 16, 10, 24,
      { x: 36, y: -108, width: 30, height: 24 },
      { isProjectile: true, projectileSpeed: 11, projectileHeight: AttackHeight.MID, movesBack: 120 },
    ),
    // Q+D — Rapid Volley: fast triple arrow barrage
    rapid_volley: special(
      "rapid_volley", "Rapid Volley", AttackHeight.MID,
      6, 8, 14, 78, 16, 18, 12, 22,
      { x: 50, y: -102, width: 32, height: 22 },
      { isProjectile: true, projectileSpeed: 15, projectileHeight: AttackHeight.MID },
    ),
    // E+A — Sun Trap: ground snare
    sun_trap: special(
      "sun_trap", "Sun Trap", AttackHeight.LOW,
      10, 15, 16, 55, 11, 20, 14, 10,
      { x: 80, y: -20, width: 60, height: 30 },
    ),
    // E+D — Radiant Shot: piercing charged arrow
    radiant_shot: special(
      "radiant_shot", "Radiant Shot", AttackHeight.MID,
      15, 4, 14, 105, 21, 22, 14, 36,
      { x: 50, y: -100, width: 32, height: 22 },
      { isProjectile: true, projectileSpeed: 17, projectileHeight: AttackHeight.MID },
    ),
    // W+S — Dawn Strike: forward evasive strike with invincibility
    dawn_strike: special(
      "dawn_strike", "Dawn Strike", AttackHeight.MID,
      5, 5, 12, 68, 14, 18, 10, 26,
      { x: 28, y: -125, width: 66, height: 58 },
      { movesForward: 115, hasInvincibility: true, invincibleStartup: 6 },
    ),
  },

  zeals: {
    // Zeal 1 — Solar Barrage: multi-hit forward volley
    solar_barrage: zeal(
      "solar_barrage", "Solar Barrage", AttackHeight.MID,
      8, 10, 18, 145, 29, 26, 16, 48,
      { x: 30, y: -120, width: 145, height: 82 },
      { movesForward: 50 },
    ),
    // Zeal 2 — Sunburst Arrow: launcher, massive damage
    sunburst_arrow: zeal(
      "sunburst_arrow", "Sunburst Arrow", AttackHeight.MID,
      13, 8, 26, 285, 57, 38, 22, 76,
      { x: 22, y: -142, width: 195, height: 105 },
      { isLauncher: true },
    ),
  },

  grab: {
    id: "bow_strike",
    name: "Bow Strike",
    type: "grab",
    height: AttackHeight.MID,
    startup: 4,
    active: 3,
    recovery: 23,
    damage: 72,
    chipDamage: 0,
    hitstun: 26,
    blockstun: 0,
    knockback: 82,
    hitbox: { x: 22, y: -100, width: 52, height: 70 },
  },
};
