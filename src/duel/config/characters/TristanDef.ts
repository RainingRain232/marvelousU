// ---------------------------------------------------------------------------
// Tristan – "The Sorrowful Knight" – Lancer / Spearman
// Elegant lance fighter with quick, precise attacks and melancholy theme
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
// TRISTAN — The Sorrowful Knight (Spear / Lance)
// ===========================================================================

export const TRISTAN_DEF: DuelCharacterDef = {
  id: "tristan",
  name: "Tristan",
  title: "The Sorrowful Knight",
  portrait: "tristan",
  fighterType: "spear",
  maxHp: 920,
  walkSpeed: 5.4,
  backWalkSpeed: 4.0,
  jumpVelocity: -20,
  jumpForwardSpeed: 6,
  weight: 0.9,

  normals: {
    // Q — Light high: quick lance jab, excellent range
    light_high: normal(
      "light_high", "Lance Jab", AttackHeight.HIGH,
      3, 3, 6, 26, 11, 8, 7,
      { x: 45, y: -118, width: 90, height: 28 },
    ),
    // W — Medium high: precise horizontal lance thrust
    med_high: normal(
      "med_high", "Lance Thrust", AttackHeight.HIGH,
      7, 4, 10, 52, 16, 11, 18,
      { x: 42, y: -110, width: 105, height: 36 },
    ),
    // E — Heavy high: overhead lance slam
    heavy_high: normal(
      "heavy_high", "Lance Slam", AttackHeight.HIGH,
      12, 5, 16, 88, 22, 15, 38,
      { x: 30, y: -148, width: 85, height: 62 },
    ),
    // A — Light low: quick low lance poke at shins
    light_low: normal(
      "light_low", "Low Poke", AttackHeight.LOW,
      3, 3, 6, 22, 9, 7, 5,
      { x: 42, y: -24, width: 80, height: 28 },
    ),
    // S — Medium low: crouching lance sweep
    med_low: normal(
      "med_low", "Low Lance", AttackHeight.LOW,
      8, 4, 12, 46, 14, 10, 14,
      { x: 40, y: -30, width: 95, height: 36 },
    ),
    // D — Heavy low: rising lance butt strike — launcher
    heavy_low: normal(
      "heavy_low", "Rising Butt", AttackHeight.LOW,
      13, 5, 17, 72, 0, 14, 28,
      { x: 28, y: -18, width: 88, height: 34 },
      { isLauncher: true },
    ),
  },

  specials: {
    // Q+W — Lance Pierce: forward long lunge, excellent reach
    lance_pierce: special(
      "lance_pierce", "Lance Pierce", AttackHeight.MID,
      7, 5, 14, 82, 16, 20, 14, 38,
      { x: 42, y: -100, width: 135, height: 34 },
      { movesForward: 130 },
    ),
    // W+E — Sorrow Impale: overhead downward impale
    sorrow_impale: special(
      "sorrow_impale", "Sorrow Impale", AttackHeight.OVERHEAD,
      15, 6, 19, 118, 24, 26, 18, 52,
      { x: 20, y: -158, width: 88, height: 82 },
    ),
    // A+S — Lance Trip: low sweeping lance trip
    lance_trip: special(
      "lance_trip", "Lance Trip", AttackHeight.LOW,
      9, 5, 15, 62, 12, 18, 12, 18,
      { x: 30, y: -18, width: 125, height: 34 },
    ),
    // S+D — Mourning Rise: anti-air rising lance thrust, invincibility
    mourning_rise: special(
      "mourning_rise", "Mourning Rise", AttackHeight.MID,
      5, 8, 21, 102, 20, 24, 16, 46,
      { x: 18, y: -178, width: 58, height: 108 },
      { isAntiAir: true, hasInvincibility: true, invincibleStartup: 4 },
    ),
    // Q+D — Grief Charge: forward rushing lance charge, invincibility
    grief_charge: special(
      "grief_charge", "Grief Charge", AttackHeight.MID,
      7, 6, 17, 92, 18, 22, 14, 55,
      { x: 25, y: -100, width: 115, height: 52 },
      { movesForward: 170, hasInvincibility: true, invincibleStartup: 3 },
    ),
    // E+A — Lance Toss: projectile spear throw
    lance_toss: special(
      "lance_toss", "Lance Toss", AttackHeight.MID,
      11, 3, 17, 62, 12, 18, 12, 24,
      { x: 55, y: -100, width: 34, height: 24 },
      { isProjectile: true, projectileSpeed: 11, projectileHeight: AttackHeight.MID },
    ),
    // E+D — Cross Lance: wide cross-body thrust
    cross_lance: special(
      "cross_lance", "Cross Lance", AttackHeight.MID,
      9, 8, 17, 125, 25, 26, 16, 48,
      { x: 25, y: -128, width: 125, height: 72 },
      { movesForward: 65 },
    ),
    // W+S — Sorrow Counter: counter stance with lance shaft, invincibility
    sorrow_counter: special(
      "sorrow_counter", "Sorrow Counter", AttackHeight.MID,
      3, 10, 15, 88, 18, 22, 14, 36,
      { x: 18, y: -118, width: 68, height: 78 },
      { hasInvincibility: true, invincibleStartup: 8 },
    ),
  },

  zeals: {
    // Zeal 1 — Sorrow Tempest: forward rush with lance whirlwind
    sorrow_tempest: zeal(
      "sorrow_tempest", "Sorrow Tempest", AttackHeight.MID,
      9, 8, 19, 148, 30, 28, 18, 50,
      { x: 35, y: -128, width: 145, height: 82 },
      { movesForward: 90 },
    ),
    // Zeal 2 — Lament Drive: upward lance thrust launcher
    lament_drive: zeal(
      "lament_drive", "Lament Drive", AttackHeight.MID,
      13, 10, 27, 285, 57, 38, 22, 72,
      { x: 18, y: -148, width: 165, height: 125 },
      { isLauncher: true },
    ),
  },

  grab: {
    id: "lance_pin",
    name: "Lance Pin",
    type: "grab",
    height: AttackHeight.MID,
    startup: 5,
    active: 3,
    recovery: 25,
    damage: 82,
    chipDamage: 0,
    hitstun: 28,
    blockstun: 0,
    knockback: 82,
    hitbox: { x: 25, y: -100, width: 55, height: 70 },
  },
};
