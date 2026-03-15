// ---------------------------------------------------------------------------
// Mordred — The Usurper
// Dark/aggressive swordsman with jagged black sword and shadow attacks.
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
// MORDRED — The Usurper
// ===========================================================================

export const MORDRED_DEF: DuelCharacterDef = {
  id: "mordred",
  name: "Mordred",
  title: "The Usurper",
  portrait: "mordred",
  fighterType: "sword",
  maxHp: 980,
  walkSpeed: 5.6,
  backWalkSpeed: 3.8,
  jumpVelocity: -20,
  jumpForwardSpeed: 6.5,
  weight: 1.0,

  normals: {
    // Q — Light high: vicious quick stab, slightly slower than Arthur but hits harder
    light_high: normal(
      "light_high", "Dark Jab", AttackHeight.HIGH,
      5, 3, 7, 35, 13, 9, 10,
      { x: 42, y: -118, width: 72, height: 36 },
    ),
    // W — Medium high: savage horizontal cleave
    med_high: normal(
      "med_high", "Shadow Cleave", AttackHeight.HIGH,
      8, 4, 11, 68, 19, 13, 26,
      { x: 38, y: -112, width: 92, height: 42 },
    ),
    // E — Heavy high: brutal two-handed overhead chop
    heavy_high: normal(
      "heavy_high", "Doom Chop", AttackHeight.HIGH,
      13, 5, 17, 110, 26, 17, 48,
      { x: 28, y: -148, width: 82, height: 72 },
    ),
    // A — Light low: quick shin hack
    light_low: normal(
      "light_low", "Shin Hack", AttackHeight.LOW,
      5, 3, 8, 30, 11, 8, 7,
      { x: 38, y: -24, width: 62, height: 36 },
    ),
    // S — Medium low: crouching dark blade thrust
    med_low: normal(
      "med_low", "Low Stab", AttackHeight.LOW,
      9, 4, 13, 55, 17, 11, 18,
      { x: 38, y: -32, width: 88, height: 42 },
    ),
    // D — Heavy low: brutal low sweep launcher
    heavy_low: normal(
      "heavy_low", "Dark Sweep", AttackHeight.LOW,
      15, 5, 19, 88, 0, 15, 34,
      { x: 28, y: -18, width: 92, height: 36 },
      { isLauncher: true },
    ),
  },

  specials: {
    // Q+W — Dark Thrust: lunging forward stab with dark energy
    dark_thrust: special(
      "dark_thrust", "Dark Thrust", AttackHeight.MID,
      9, 5, 15, 88, 18, 22, 15, 42,
      { x: 38, y: -100, width: 115, height: 42 },
      { movesForward: 240 },
    ),
    // W+E — Treachery Cleave: sweeping overhead that punishes backdash — wider than any other sword overhead
    treachery_cleave: special(
      "treachery_cleave", "Treachery Cleave", AttackHeight.OVERHEAD,
      17, 7, 21, 142, 28, 30, 19, 65,
      { x: -42, y: -162, width: 202, height: 96 },
    ),
    // A+S — Shadow Sweep: ground-level dark sweep
    shadow_sweep: special(
      "shadow_sweep", "Shadow Sweep", AttackHeight.LOW,
      11, 5, 17, 75, 15, 19, 13, 25,
      { x: 28, y: -18, width: 115, height: 36 },
    ),
    // S+D — Usurper's Rise: anti-air rising slash with invincibility
    usurper_rise: special(
      "usurper_rise", "Usurper's Rise", AttackHeight.MID,
      7, 8, 23, 118, 24, 26, 17, 55,
      { x: 18, y: -178, width: 68, height: 105 },
      { isAntiAir: true, hasInvincibility: true, invincibleStartup: 5 },
    ),
    // Q+D — Dark Charge: rushing forward with dark energy
    dark_charge: special(
      "dark_charge", "Dark Charge", AttackHeight.MID,
      9, 6, 19, 95, 19, 24, 15, 58,
      { x: 22, y: -100, width: 75, height: 62 },
      { movesForward: 300, hasInvincibility: true, invincibleStartup: 4 },
    ),
    // E+A — Coup de Grâce: point-blank dark explosion — highest single-hit damage in normals/specials
    betrayal_blade: special(
      "betrayal_blade", "Coup de Grace", AttackHeight.MID,
      9, 8, 26, 182, 36, 32, 22, 74,
      { x: -12, y: -202, width: 96, height: 208 },
      { hasInvincibility: true, invincibleStartup: 7 },
    ),
    // E+D — Shadow Frenzy: rapid shadow blade strikes
    shadow_frenzy: special(
      "shadow_frenzy", "Shadow Frenzy", AttackHeight.MID,
      6, 24, 14, 24, 5, 8, 6, 5,
      { x: 12, y: -135, width: 80, height: 85 },
      { multiHit: 8 },
    ),
    // W+S — Dark Parry: counter stance with dark riposte
    dark_parry: special(
      "dark_parry", "Dark Parry", AttackHeight.MID,
      3, 10, 17, 100, 20, 24, 15, 44,
      { x: 18, y: -118, width: 72, height: 82 },
      { hasInvincibility: true, invincibleStartup: 8 },
    ),
  },

  zeals: {
    // Zeal 1 — Usurper's Onslaught: dark energy wave sweeps the entire arena at mid height
    usurper_wrath: zeal(
      "usurper_wrath", "Usurper's Onslaught", AttackHeight.MID,
      8, 8, 24, 162, 32, 30, 19, 55,
      { x: 0, y: -132, width: 700, height: 88 },
    ),
    // Zeal 2 — Treachery Unleashed: launcher, highest damage in the game (~310)
    treachery_unleashed: zeal(
      "treachery_unleashed", "Treachery Unleashed", AttackHeight.MID,
      15, 10, 29, 310, 62, 42, 25, 85,
      { x: 22, y: -148, width: 165, height: 125 },
      { movesForward: 65, isLauncher: true },
    ),
  },

  grab: {
    id: "iron_grip",
    name: "Iron Grip",
    type: "grab",
    height: AttackHeight.MID,
    startup: 5,
    active: 3,
    recovery: 26,
    damage: 95,
    chipDamage: 0,
    hitstun: 30,
    blockstun: 0,
    knockback: 92,
    hitbox: { x: 28, y: -100, width: 58, height: 72 },
  },
};
