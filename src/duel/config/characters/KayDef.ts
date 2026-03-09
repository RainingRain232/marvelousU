// ---------------------------------------------------------------------------
// Kay – "Seneschal of Camelot" – Pikeman / Spear fighter
// Military pike fighter — practical, straightforward, heavy reach
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
// KAY — Seneschal of Camelot — Pikeman
// ===========================================================================

export const KAY_DEF: DuelCharacterDef = {
  id: "kay",
  name: "Kay",
  title: "Seneschal of Camelot",
  portrait: "kay",
  fighterType: "spear",
  maxHp: 960,
  walkSpeed: 4.8,
  backWalkSpeed: 3.6,
  jumpVelocity: -18,
  jumpForwardSpeed: 5.5,
  weight: 1.0,

  normals: {
    // Q — Light high: quick pike jab, good reach
    light_high: normal(
      "light_high", "Pike Jab", AttackHeight.HIGH,
      5, 3, 7, 30, 12, 8, 8,
      { x: 45, y: -120, width: 90, height: 30 },
    ),
    // W — Medium high: horizontal pike shaft strike
    med_high: normal(
      "med_high", "Shaft Strike", AttackHeight.HIGH,
      8, 4, 11, 58, 17, 12, 22,
      { x: 40, y: -110, width: 100, height: 38 },
    ),
    // E — Heavy high: overhead pike slam, two-handed
    heavy_high: normal(
      "heavy_high", "Pike Slam", AttackHeight.HIGH,
      13, 5, 17, 95, 23, 16, 42,
      { x: 30, y: -150, width: 85, height: 70 },
    ),
    // A — Light low: low pike poke at shins
    light_low: normal(
      "light_low", "Shin Poke", AttackHeight.LOW,
      5, 3, 7, 25, 10, 7, 6,
      { x: 42, y: -25, width: 80, height: 30 },
    ),
    // S — Medium low: crouching pike sweep
    med_low: normal(
      "med_low", "Low Pike Sweep", AttackHeight.LOW,
      9, 4, 13, 50, 15, 10, 16,
      { x: 38, y: -30, width: 95, height: 38 },
    ),
    // D — Heavy low: butt-end sweep, launcher
    heavy_low: normal(
      "heavy_low", "Butt Sweep", AttackHeight.LOW,
      14, 5, 18, 80, 0, 14, 30,
      { x: 28, y: -18, width: 90, height: 35 },
      { isLauncher: true },
    ),
  },

  specials: {
    // Q+W — Pike Thrust: forward long lunge with pike
    pike_thrust: special(
      "pike_thrust", "Pike Thrust", AttackHeight.MID,
      8, 5, 15, 90, 18, 22, 14, 42,
      { x: 40, y: -100, width: 135, height: 35 },
      { movesForward: 130 },
    ),
    // W+E — Authority Slam: overhead two-handed slam
    authority_slam: special(
      "authority_slam", "Authority Slam", AttackHeight.OVERHEAD,
      16, 6, 20, 125, 25, 28, 18, 58,
      { x: 20, y: -160, width: 90, height: 90 },
    ),
    // A+S — Pike Sweep: low spinning sweep
    pike_sweep: special(
      "pike_sweep", "Pike Sweep", AttackHeight.LOW,
      10, 5, 16, 70, 14, 18, 12, 22,
      { x: 30, y: -18, width: 125, height: 35 },
    ),
    // S+D — Pike Vault: anti-air vault kick off pike
    pike_vault: special(
      "pike_vault", "Pike Vault", AttackHeight.MID,
      6, 8, 22, 108, 22, 24, 16, 50,
      { x: 18, y: -180, width: 65, height: 110 },
      { isAntiAir: true, hasInvincibility: true, invincibleStartup: 4 },
    ),
    // Q+D — Bull Rush: charging forward rush with pike
    bull_rush: special(
      "bull_rush", "Bull Rush", AttackHeight.MID,
      8, 6, 18, 95, 19, 22, 14, 58,
      { x: 25, y: -100, width: 110, height: 60 },
      { movesForward: 180, hasInvincibility: true, invincibleStartup: 3 },
    ),
    // E+A — Pike Toss: throw pike as projectile
    pike_toss: special(
      "pike_toss", "Pike Toss", AttackHeight.MID,
      12, 3, 18, 68, 14, 18, 12, 26,
      { x: 55, y: -100, width: 40, height: 28 },
      { isProjectile: true, projectileSpeed: 10, projectileHeight: AttackHeight.MID },
    ),
    // E+D — Cross Pike: wide lunging cross-body thrust
    cross_pike: special(
      "cross_pike", "Cross Pike", AttackHeight.MID,
      10, 8, 18, 135, 27, 26, 16, 52,
      { x: 25, y: -130, width: 125, height: 78 },
      { movesForward: 70 },
    ),
    // W+S — Stern Guard: counter stance, pike shaft parry
    stern_guard: special(
      "stern_guard", "Stern Guard", AttackHeight.MID,
      3, 10, 16, 92, 18, 22, 14, 40,
      { x: 18, y: -120, width: 70, height: 80 },
      { hasInvincibility: true, invincibleStartup: 8 },
    ),
  },

  zeals: {
    // Zeal 1 — Seneschal's Fury: forward rushing pike assault
    seneschal_fury: zeal(
      "seneschal_fury", "Seneschal's Fury", AttackHeight.MID,
      10, 8, 20, 155, 31, 28, 18, 52,
      { x: 35, y: -130, width: 140, height: 85 },
      { movesForward: 100 },
    ),
    // Zeal 2 — Martial Authority: launcher, ~280 damage
    martial_authority: zeal(
      "martial_authority", "Martial Authority", AttackHeight.MID,
      14, 12, 28, 280, 56, 38, 22, 75,
      { x: 15, y: -150, width: 170, height: 130 },
      { isLauncher: true },
    ),
  },

  grab: {
    id: "pike_shove",
    name: "Pike Shove",
    type: "grab",
    height: AttackHeight.MID,
    startup: 5,
    active: 3,
    recovery: 26,
    damage: 85,
    chipDamage: 0,
    hitstun: 28,
    blockstun: 0,
    knockback: 88,
    hitbox: { x: 25, y: -100, width: 55, height: 70 },
  },
};
