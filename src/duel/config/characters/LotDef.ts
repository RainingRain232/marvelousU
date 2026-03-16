// ---------------------------------------------------------------------------
// Lot — King of Orkney
// Death knight / dark warrior with cursed two-handed greatsword.
// Slow but devastating; dark/death magic infused attacks.
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
// LOT — King of Orkney
// ===========================================================================

export const LOT_DEF: DuelCharacterDef = {
  id: "lot",
  name: "Lot",
  title: "King of Orkney",
  portrait: "lot",
  fighterType: "sword",
  maxHp: 1000,
  walkSpeed: 4.8,
  backWalkSpeed: 3.5,
  jumpVelocity: -18,
  jumpForwardSpeed: 5.5,
  weight: 1.05,
  uniqueMechanic: {
    name: "deathCurse",
    description: "Hits apply a curse that deals damage over time; stacks up to 3 times",
  },

  normals: {
    // Q — Light high: heavy greatsword jab, slow but wide reach
    light_high: normal(
      "light_high", "Grave Jab", AttackHeight.HIGH,
      6, 4, 8, 38, 14, 10, 12,
      { x: 42, y: -120, width: 85, height: 38 },
    ),
    // W — Medium high: wide horizontal greatsword slash
    med_high: normal(
      "med_high", "Death Slash", AttackHeight.HIGH,
      9, 5, 13, 72, 20, 14, 28,
      { x: 35, y: -115, width: 105, height: 45 },
    ),
    // E — Heavy high: massive overhead greatsword slam
    heavy_high: normal(
      "heavy_high", "Grave Slam", AttackHeight.HIGH,
      14, 6, 18, 115, 26, 18, 50,
      { x: 25, y: -155, width: 90, height: 80 },
    ),
    // A — Light low: heavy boot kick
    light_low: normal(
      "light_low", "Bone Kick", AttackHeight.LOW,
      6, 3, 8, 32, 12, 8, 8,
      { x: 38, y: -25, width: 65, height: 36 },
    ),
    // S — Medium low: crouching greatsword sweep
    med_low: normal(
      "med_low", "Low Reap", AttackHeight.LOW,
      10, 5, 14, 58, 18, 12, 18,
      { x: 35, y: -35, width: 95, height: 42 },
    ),
    // D — Heavy low: massive low greatsword sweep launcher
    heavy_low: normal(
      "heavy_low", "Soul Sweep", AttackHeight.LOW,
      16, 6, 20, 92, 0, 16, 35,
      { x: 25, y: -18, width: 100, height: 38 },
      { isLauncher: true },
    ),
  },

  specials: {
    // Q+W — Death Thrust: lunging forward stab with cursed blade
    death_thrust: special(
      "death_thrust", "Death Thrust", AttackHeight.MID,
      10, 6, 16, 90, 18, 22, 16, 45,
      { x: 40, y: -100, width: 120, height: 44 },
      { movesForward: 240 },
    ),
    // W+E — Orkney Cleave: devastating overhead cleave
    orkney_cleave: special(
      "orkney_cleave", "Orkney Cleave", AttackHeight.OVERHEAD,
      18, 7, 22, 135, 27, 30, 20, 68,
      { x: 18, y: -165, width: 88, height: 95 },
    ),
    // A+S — Reaper Sweep: ground-level death sweep
    reaper_sweep: special(
      "reaper_sweep", "Reaper Sweep", AttackHeight.LOW,
      12, 6, 18, 78, 16, 20, 14, 28,
      { x: 28, y: -18, width: 120, height: 38 },
    ),
    // S+D — Death Rise: anti-air rising slash with dark energy
    death_rise: special(
      "death_rise", "Death Rise", AttackHeight.MID,
      7, 9, 24, 115, 23, 26, 18, 55,
      { x: 18, y: -185, width: 70, height: 110 },
      { isAntiAir: true, hasInvincibility: true, invincibleStartup: 5 },
    ),
    // Q+D — Dark Charge: rushing forward with dark energy
    dark_charge: special(
      "dark_charge", "Dark Charge", AttackHeight.MID,
      9, 7, 20, 95, 19, 24, 16, 60,
      { x: 22, y: -105, width: 80, height: 65 },
      { movesForward: 300, hasInvincibility: true, invincibleStartup: 4 },
    ),
    // E+A — Reaper's Toll: soul is reaped from ACROSS the arena — long-range energy grab
    soul_reap: special(
      "soul_reap", "Reaper's Toll", AttackHeight.MID,
      12, 10, 26, 168, 34, 32, 22, 75,
      { x: 135, y: -205, width: 82, height: 208 },
      { hasInvincibility: true, invincibleStartup: 7 },
    ),
    // E+D — Death Flurry: rapid cursed blade strikes
    death_flurry: special(
      "death_flurry", "Death Flurry", AttackHeight.MID,
      6, 24, 14, 26, 5, 8, 6, 5,
      { x: 12, y: -130, width: 85, height: 80 },
      { multiHit: 7 },
    ),
    // W+S — Death Counter: counter stance, dark riposte
    death_counter: special(
      "death_counter", "Death Counter", AttackHeight.MID,
      3, 12, 18, 105, 21, 24, 16, 48,
      { x: 18, y: -125, width: 75, height: 85 },
      { hasInvincibility: true, invincibleStartup: 10 },
    ),
  },

  zeals: {
    // Zeal 1 — King's Doom: darkness sweeps across the entire arena — the curse of Orkney
    orkney_doom: zeal(
      "orkney_doom", "King's Doom", AttackHeight.MID,
      8, 9, 26, 162, 32, 30, 20, 55,
      { x: 0, y: -105, width: 700, height: 105 },
    ),
    // Zeal 2 — Death Sentence: launcher, ~300 damage
    death_sentence: zeal(
      "death_sentence", "Death Sentence", AttackHeight.MID,
      15, 11, 30, 300, 60, 42, 25, 85,
      { x: 22, y: -155, width: 170, height: 130 },
      { movesForward: 60, isLauncher: true },
    ),
  },

  grab: {
    id: "death_grip",
    name: "Death Grip",
    type: "grab",
    height: AttackHeight.MID,
    startup: 6,
    active: 3,
    recovery: 27,
    damage: 92,
    chipDamage: 0,
    hitstun: 30,
    blockstun: 0,
    knockback: 92,
    hitbox: { x: 28, y: -100, width: 58, height: 72 },
  },
};
