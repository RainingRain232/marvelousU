// ---------------------------------------------------------------------------
// Ector – "The Humble Lord" – Engineer / Gadgeteer archer
// Crossbow-wielding engineer with traps, gadgets, and practical combat style
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
// ECTOR — Engineer / Gadgeteer (Archer)
// ===========================================================================

export const ECTOR_DEF: DuelCharacterDef = {
  id: "ector",
  name: "Ector",
  title: "The Humble Lord",
  portrait: "ector",
  fighterType: "archer",
  maxHp: 910,
  walkSpeed: 4.8,
  backWalkSpeed: 3.8,
  jumpVelocity: -19,
  jumpForwardSpeed: 5.5,
  weight: 0.9,
  uniqueMechanic: {
    name: "engineerTrap",
    description: "Specials leave behind traps that trigger when the opponent steps on them",
  },

  normals: {
    // Q — Light high: quick crossbow stock jab
    light_high: normal(
      "light_high", "Stock Jab", AttackHeight.HIGH,
      4, 3, 6, 26, 11, 7, 7,
      { x: 38, y: -118, width: 65, height: 30 },
    ),
    // W — Medium high: horizontal crossbow swing
    med_high: normal(
      "med_high", "Crossbow Swing", AttackHeight.HIGH,
      7, 4, 10, 52, 16, 11, 18,
      { x: 32, y: -112, width: 82, height: 38 },
    ),
    // E — Heavy high: overhead crossbow slam
    heavy_high: normal(
      "heavy_high", "Crossbow Slam", AttackHeight.HIGH,
      12, 5, 16, 82, 21, 15, 36,
      { x: 24, y: -135, width: 78, height: 58 },
    ),
    // A — Light low: quick shin kick
    light_low: normal(
      "light_low", "Shin Kick", AttackHeight.LOW,
      4, 3, 7, 22, 9, 6, 5,
      { x: 34, y: -22, width: 58, height: 30 },
    ),
    // S — Medium low: crouching wrench swipe
    med_low: normal(
      "med_low", "Wrench Swipe", AttackHeight.LOW,
      8, 4, 12, 46, 14, 10, 14,
      { x: 30, y: -30, width: 80, height: 36 },
    ),
    // D — Heavy low: sweeping boot trip (launcher)
    heavy_low: normal(
      "heavy_low", "Boot Sweep", AttackHeight.LOW,
      13, 5, 17, 68, 0, 13, 26,
      { x: 22, y: -18, width: 85, height: 32 },
      { isLauncher: true },
    ),
  },

  specials: {
    // Q+W — Crossbow Bolt: fast projectile bolt
    crossbow_bolt: special(
      "crossbow_bolt", "Crossbow Bolt", AttackHeight.MID,
      7, 3, 12, 55, 11, 16, 10, 20,
      { x: 50, y: -100, width: 28, height: 18 },
      { isProjectile: true, projectileSpeed: 13, projectileHeight: AttackHeight.MID },
    ),
    // W+E — Cluster Bomb: bomb explodes in a large blast radius — wider area than any single attack
    bomb_lob: special(
      "bomb_lob", "Cluster Bomb", AttackHeight.OVERHEAD,
      14, 9, 18, 88, 18, 22, 15, 38,
      { x: 62, y: -175, width: 168, height: 178 },
    ),
    // A+S — Caltrop Field: wider caltrop field with extended active frames — longer zone denial
    caltrops: special(
      "caltrops", "Caltrop Field", AttackHeight.LOW,
      10, 22, 14, 48, 10, 18, 12, 8,
      { x: 65, y: -18, width: 105, height: 28 },
    ),
    // S+D — Retreat Shot: backflip with crossbow bolt
    retreat_shot: special(
      "retreat_shot", "Retreat Shot", AttackHeight.MID,
      6, 5, 11, 50, 10, 15, 10, 20,
      { x: 35, y: -108, width: 28, height: 22 },
      { isProjectile: true, projectileSpeed: 11, projectileHeight: AttackHeight.MID, movesBack: 120 },
    ),
    // Q+D — Rapid Bolts: triple shot projectile burst
    rapid_bolts: special(
      "rapid_bolts", "Rapid Bolts", AttackHeight.MID,
      6, 9, 14, 72, 14, 18, 12, 22,
      { x: 50, y: -100, width: 28, height: 20 },
      { isProjectile: true, projectileSpeed: 14, projectileHeight: AttackHeight.MID },
    ),
    // E+A — Spike Field: wide spike field placed at long range — far zone denial
    bear_trap: special(
      "bear_trap", "Spike Field", AttackHeight.LOW,
      12, 22, 14, 68, 14, 22, 14, 6,
      { x: 55, y: -20, width: 158, height: 30 },
    ),
    // E+D — Heavy Bolt: slow but piercing projectile
    heavy_bolt: special(
      "heavy_bolt", "Heavy Bolt", AttackHeight.MID,
      16, 4, 16, 105, 21, 24, 15, 40,
      { x: 50, y: -100, width: 32, height: 22 },
      { isProjectile: true, projectileSpeed: 8, projectileHeight: AttackHeight.MID },
    ),
    // W+S — Gadget Dodge: forward evasive roll with invincibility
    gadget_dodge: special(
      "gadget_dodge", "Gadget Dodge", AttackHeight.MID,
      4, 5, 12, 58, 12, 16, 10, 22,
      { x: 25, y: -110, width: 60, height: 55 },
      { movesForward: 110, hasInvincibility: true, invincibleStartup: 6 },
    ),
  },

  zeals: {
    // Zeal 1 — Siege Engine: bolts and explosives saturate the entire arena at multiple heights
    siege_barrage: zeal(
      "siege_barrage", "Siege Engine", AttackHeight.MID,
      8, 10, 22, 148, 30, 26, 16, 48,
      { x: 0, y: -155, width: 700, height: 128 },
    ),
    // Zeal 2 — Masterwork Detonation: places a mine then detonates — devastating close-range explosion
    engineer_masterwork: zeal(
      "engineer_masterwork", "Masterwork Detonation", AttackHeight.MID,
      16, 12, 30, 282, 56, 40, 24, 74,
      { x: -22, y: -205, width: 208, height: 228 },
      { isLauncher: true },
    ),
  },

  grab: {
    id: "wrench_strike",
    name: "Wrench Strike",
    type: "grab",
    height: AttackHeight.MID,
    startup: 5,
    active: 3,
    recovery: 24,
    damage: 74,
    chipDamage: 0,
    hitstun: 26,
    blockstun: 0,
    knockback: 78,
    hitbox: { x: 22, y: -100, width: 52, height: 68 },
  },
};
