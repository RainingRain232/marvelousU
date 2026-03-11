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
    // W+E — Blazing Rain: overhead fire arrows saturate a specific mid-range zone
    blazing_rain: special(
      "blazing_rain", "Blazing Rain", AttackHeight.OVERHEAD,
      14, 8, 18, 78, 16, 22, 14, 32,
      { x: 185, y: -185, width: 65, height: 185 },
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
    // E+A — Solar Snare: sun trap placed at extreme distance — maximum zone denial
    sun_trap: special(
      "sun_trap", "Solar Snare", AttackHeight.LOW,
      10, 20, 14, 58, 12, 22, 14, 10,
      { x: 162, y: -20, width: 88, height: 30 },
    ),
    // E+D — Radiant Shot: piercing charged arrow
    radiant_shot: special(
      "radiant_shot", "Radiant Shot", AttackHeight.MID,
      15, 4, 14, 105, 21, 22, 14, 36,
      { x: 50, y: -100, width: 32, height: 22 },
      { isProjectile: true, projectileSpeed: 17, projectileHeight: AttackHeight.MID },
    ),
    // W+S — Dawn Burst: explosive sun detonation — close-range radial burst of solar energy
    dawn_strike: special(
      "dawn_strike", "Dawn Burst", AttackHeight.MID,
      6, 8, 16, 72, 14, 20, 12, 28,
      { x: -45, y: -175, width: 205, height: 188 },
      { hasInvincibility: true, invincibleStartup: 5 },
    ),
  },

  zeals: {
    // Zeal 1 — Solar Flare: concentrated beam of solar energy spans the entire arena
    solar_barrage: zeal(
      "solar_barrage", "Solar Flare", AttackHeight.MID,
      6, 6, 22, 148, 30, 26, 16, 48,
      { x: 0, y: -105, width: 700, height: 42 },
    ),
    // Zeal 2 — Sunburst Nova: sun explodes at close range — enormous vertical pillar launcher
    sunburst_arrow: zeal(
      "sunburst_arrow", "Sunburst Nova", AttackHeight.MID,
      12, 10, 28, 288, 58, 40, 24, 78,
      { x: -25, y: -245, width: 158, height: 252 },
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
