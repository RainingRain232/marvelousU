// ---------------------------------------------------------------------------
// Bors – The Steadfast
// Powerful axe-wielding knight. Slow but devastating, wide hitboxes, resilient.
// ---------------------------------------------------------------------------

import { AttackHeight } from "../../../types";
import type { DuelMoveDef, DuelCharacterDef } from "../../state/DuelState";

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
// BORS — Axe Knight
// ===========================================================================

export const BORS_DEF: DuelCharacterDef = {
  id: "bors",
  name: "Bors",
  title: "The Steadfast",
  portrait: "bors",
  fighterType: "axe",
  maxHp: 1020,
  walkSpeed: 4.5,
  backWalkSpeed: 3.3,
  jumpVelocity: -18,
  jumpForwardSpeed: 5,
  weight: 1.1,
  uniqueMechanic: {
    name: "steadfastResolve",
    description: "Cannot be launched or knocked down while above 50% HP; gains armor on heavy attacks",
  },

  normals: {
    // Q — Light high: quick axe handle jab, moderate speed for Bors
    light_high: normal(
      "light_high", "Handle Jab", AttackHeight.HIGH,
      5, 4, 7, 38, 13, 9, 10,
      { x: 35, y: -120, width: 80, height: 40 },
    ),
    // W — Medium high: horizontal axe chop
    med_high: normal(
      "med_high", "Axe Chop", AttackHeight.HIGH,
      9, 5, 12, 72, 20, 14, 28,
      { x: 30, y: -115, width: 100, height: 50 },
    ),
    // E — Heavy high: overhead axe slam
    heavy_high: normal(
      "heavy_high", "Axe Slam", AttackHeight.HIGH,
      14, 6, 18, 115, 26, 18, 52,
      { x: 20, y: -155, width: 90, height: 80 },
    ),
    // A — Light low: boot stomp
    light_low: normal(
      "light_low", "Boot Stomp", AttackHeight.LOW,
      5, 4, 8, 32, 11, 8, 8,
      { x: 30, y: -25, width: 70, height: 38 },
    ),
    // S — Medium low: low axe sweep
    med_low: normal(
      "med_low", "Low Axe Sweep", AttackHeight.LOW,
      10, 5, 14, 62, 18, 12, 20,
      { x: 28, y: -35, width: 95, height: 45 },
    ),
    // D — Heavy low: ground-splitting axe sweep (launcher)
    heavy_low: normal(
      "heavy_low", "Ground Splitter", AttackHeight.LOW,
      16, 6, 20, 95, 0, 16, 38,
      { x: 20, y: -20, width: 100, height: 40 },
      { isLauncher: true },
    ),
  },

  specials: {
    // Q+W — Axe Lunge: lunging forward chop
    axe_lunge: special(
      "axe_lunge", "Axe Lunge", AttackHeight.MID,
      9, 6, 16, 90, 18, 22, 15, 42,
      { x: 30, y: -110, width: 120, height: 50 },
      { movesForward: 240 },
    ),
    // W+E — Overhead Axe: overhead chop, must block standing
    overhead_axe: special(
      "overhead_axe", "Overhead Axe", AttackHeight.OVERHEAD,
      18, 7, 22, 125, 25, 28, 20, 65,
      { x: 15, y: -165, width: 85, height: 95 },
    ),
    // A+S — Ground Cleave: axe sweeps the entire floor forward — covers maximum ground distance
    low_chop: special(
      "low_chop", "Ground Cleave", AttackHeight.LOW,
      10, 6, 16, 72, 14, 18, 12, 24,
      { x: 0, y: -22, width: 205, height: 40 },
    ),
    // S+D — Rising Axe: anti-air upward axe swing
    rising_axe: special(
      "rising_axe", "Rising Axe", AttackHeight.MID,
      7, 8, 24, 115, 23, 26, 18, 55,
      { x: 15, y: -185, width: 70, height: 110 },
      { isAntiAir: true, hasInvincibility: true, invincibleStartup: 4 },
    ),
    // Q+D — Bull Charge: rushing forward shoulder slam
    bull_charge: special(
      "bull_charge", "Bull Charge", AttackHeight.MID,
      9, 7, 20, 95, 19, 24, 16, 60,
      { x: 20, y: -105, width: 80, height: 65 },
      { movesForward: 310, hasInvincibility: true, invincibleStartup: 4 },
    ),
    // E+A — Steadfast Blow: massive single hit, committal
    steadfast_blow: special(
      "steadfast_blow", "Steadfast Blow", AttackHeight.MID,
      12, 8, 26, 155, 31, 30, 22, 72,
      { x: 10, y: -140, width: 95, height: 100 },
      { hasInvincibility: true, invincibleStartup: 6 },
    ),
    // E+D — Berserker Chops: rapid axe strikes in a frenzy
    berserker_chops: special(
      "berserker_chops", "Berserker Chops", AttackHeight.MID,
      6, 24, 14, 28, 6, 8, 6, 6,
      { x: 10, y: -140, width: 90, height: 90 },
      { multiHit: 6 },
    ),
    // W+S — Iron Resolve: counter stance, absorbs a hit and retaliates
    iron_resolve: special(
      "iron_resolve", "Iron Resolve", AttackHeight.MID,
      3, 12, 16, 100, 20, 24, 16, 45,
      { x: 15, y: -125, width: 75, height: 85 },
      { hasInvincibility: true, invincibleStartup: 10 },
    ),
  },

  zeals: {
    // Zeal 1 — Wall of Steel: Bors plants his feet and erupts outward — not a rush, an expansion of force
    steadfast_fury: zeal(
      "steadfast_fury", "Wall of Steel", AttackHeight.MID,
      8, 10, 24, 158, 32, 28, 18, 55,
      { x: -38, y: -188, width: 212, height: 198 },
    ),
    // Zeal 2 — Unbreakable Will: massive rising axe blow, launcher
    unbreakable_will: zeal(
      "unbreakable_will", "Unbreakable Will", AttackHeight.MID,
      14, 10, 30, 295, 59, 40, 24, 82,
      { x: 15, y: -160, width: 170, height: 130 },
      { movesForward: 60, isLauncher: true },
    ),
  },

  grab: {
    id: "bear_hug",
    name: "Bear Hug",
    type: "grab",
    height: AttackHeight.MID,
    startup: 6,
    active: 3,
    recovery: 28,
    damage: 92,
    chipDamage: 0,
    hitstun: 30,
    blockstun: 0,
    knockback: 95,
    hitbox: { x: 20, y: -105, width: 60, height: 75 },
  },
};
