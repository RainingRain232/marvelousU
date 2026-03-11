// ---------------------------------------------------------------------------
// Duel mode – Nimue (Lady of the Lake) character definition
// Water mage archetype: staff/water whip attacks, water/ice magic, fluid grace
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
// NIMUE — Lady of the Lake (Water Mage)
// ===========================================================================

export const NIMUE_DEF: DuelCharacterDef = {
  id: "nimue",
  name: "Nimue",
  title: "Lady of the Lake",
  portrait: "nimue",
  fighterType: "mage",
  maxHp: 870,
  walkSpeed: 5.0,
  backWalkSpeed: 3.8,
  jumpVelocity: -20,
  jumpForwardSpeed: 5.5,
  weight: 0.82,

  normals: {
    // Q — Light high: quick water whip snap
    light_high: normal(
      "light_high", "Water Snap", AttackHeight.HIGH,
      4, 3, 7, 28, 11, 7, 7,
      { x: 42, y: -118, width: 72, height: 30 },
    ),
    // W — Medium high: horizontal staff sweep trailing water
    med_high: normal(
      "med_high", "Tidal Sweep", AttackHeight.HIGH,
      8, 4, 11, 52, 16, 11, 20,
      { x: 35, y: -112, width: 88, height: 38 },
    ),
    // E — Heavy high: overhead staff slam with water crash
    heavy_high: normal(
      "heavy_high", "Cascade Slam", AttackHeight.HIGH,
      13, 5, 17, 88, 22, 15, 40,
      { x: 25, y: -140, width: 78, height: 65 },
    ),
    // A — Light low: quick low water whip at ankles
    light_low: normal(
      "light_low", "Ripple Lash", AttackHeight.LOW,
      5, 3, 7, 22, 9, 6, 5,
      { x: 38, y: -22, width: 65, height: 30 },
    ),
    // S — Medium low: crouching water tendril sweep
    med_low: normal(
      "med_low", "Undertow", AttackHeight.LOW,
      9, 4, 13, 46, 14, 10, 14,
      { x: 32, y: -28, width: 82, height: 36 },
    ),
    // D — Heavy low: rising water geyser launcher
    heavy_low: normal(
      "heavy_low", "Geyser Burst", AttackHeight.LOW,
      15, 5, 19, 72, 0, 14, 30,
      { x: 22, y: -18, width: 88, height: 35 },
      { isLauncher: true },
    ),
  },

  specials: {
    // Q+W — Water Bolt: water ball projectile
    water_bolt: special(
      "water_bolt", "Water Bolt", AttackHeight.MID,
      11, 3, 15, 55, 11, 17, 12, 20,
      { x: 50, y: -100, width: 35, height: 35 },
      { isProjectile: true, projectileSpeed: 8, projectileHeight: AttackHeight.MID },
    ),
    // W+E — Distant Surge: tidal surge crashes down at maximum range — punishes full-screen positioning
    tidal_strike: special(
      "tidal_strike", "Distant Surge", AttackHeight.OVERHEAD,
      14, 6, 18, 108, 22, 24, 16, 46,
      { x: 235, y: -195, width: 58, height: 195 },
    ),
    // A+S — Frost Wave: low ice projectile along ground
    frost_wave: special(
      "frost_wave", "Frost Wave", AttackHeight.LOW,
      13, 3, 17, 48, 10, 15, 10, 14,
      { x: 50, y: -25, width: 40, height: 35 },
      { isProjectile: true, projectileSpeed: 7, projectileHeight: AttackHeight.LOW },
    ),
    // S+D — Mist Step: teleport with water mist, invincibility, 0 damage
    mist_step: special(
      "mist_step", "Mist Step", AttackHeight.MID,
      4, 0, 11, 0, 0, 0, 0, 0,
      { x: 0, y: 0, width: 0, height: 0 },
      { hasInvincibility: true, invincibleStartup: 10 },
    ),
    // Q+D — Close Vortex: water vortex erupts right at Nimue's position — tall close anti-jump
    lake_storm: special(
      "lake_storm", "Close Vortex", AttackHeight.MID,
      12, 10, 20, 118, 24, 25, 17, 40,
      { x: 2, y: -188, width: 78, height: 190 },
    ),
    // E+A — Water Shield: barrier with invincibility
    water_shield: special(
      "water_shield", "Water Shield", AttackHeight.MID,
      4, 12, 14, 0, 0, 0, 0, 0,
      { x: 0, y: 0, width: 0, height: 0 },
      { hasInvincibility: true, invincibleStartup: 12 },
    ),
    // E+D — Tidal Pull: whirlpool reaches across the arena to drag opponents in
    whirlpool: special(
      "whirlpool", "Tidal Pull", AttackHeight.MID,
      12, 10, 18, 98, 20, 22, 15, 32,
      { x: 185, y: -165, width: 58, height: 162 },
    ),
    // W+S — Ice Counter: counter stance with invincibility
    ice_counter: special(
      "ice_counter", "Ice Counter", AttackHeight.MID,
      3, 12, 14, 80, 16, 20, 13, 35,
      { x: 18, y: -120, width: 65, height: 80 },
      { hasInvincibility: true, invincibleStartup: 10 },
    ),
  },

  zeals: {
    // Zeal 1 — Tidal Wrath: wide area flood wave
    tidal_wrath: zeal(
      "tidal_wrath", "Tidal Wrath", AttackHeight.MID,
      8, 6, 22, 140, 28, 26, 16, 48,
      { x: 0, y: -120, width: 580, height: 85 },
    ),
    // Zeal 2 — Avalon's Tide: geyser erupts directly beneath Nimue — close-range upward surge
    lake_judgment: zeal(
      "lake_judgment", "Avalon's Tide", AttackHeight.MID,
      12, 12, 30, 278, 56, 38, 24, 74,
      { x: -22, y: -215, width: 158, height: 220 },
      { isLauncher: true },
    ),
  },

  grab: {
    id: "water_bind",
    name: "Water Bind",
    type: "grab",
    height: AttackHeight.MID,
    startup: 5,
    active: 3,
    recovery: 26,
    damage: 76,
    chipDamage: 0,
    hitstun: 28,
    blockstun: 0,
    knockback: 78,
    hitbox: { x: 25, y: -100, width: 55, height: 70 },
  },
};
