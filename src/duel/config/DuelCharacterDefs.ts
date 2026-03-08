// ---------------------------------------------------------------------------
// Duel mode – character definitions with full frame data
// ---------------------------------------------------------------------------

import { AttackHeight } from "../../types";
import type { DuelCharacterDef, DuelMoveDef } from "../state/DuelState";

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
// ARTHUR — Swordsman
// ===========================================================================

export const ARTHUR_DEF: DuelCharacterDef = {
  id: "arthur",
  name: "Arthur",
  title: "The Once and Future King",
  portrait: "arthur",
  fighterType: "sword",
  maxHp: 1000,
  walkSpeed: 5.5,
  backWalkSpeed: 4.0,
  jumpVelocity: -20,
  jumpForwardSpeed: 6,
  weight: 1.0,

  normals: {
    // Q — Light high: quick sword jab
    light_high: normal(
      "light_high", "Jab", AttackHeight.HIGH,
      4, 3, 6, 30, 12, 8, 8,
      { x: 40, y: -120, width: 70, height: 35 },
    ),
    // W — Medium high: horizontal slash
    med_high: normal(
      "med_high", "Slash", AttackHeight.HIGH,
      7, 4, 10, 60, 18, 12, 22,
      { x: 35, y: -110, width: 90, height: 40 },
    ),
    // E — Heavy high: two-handed overhead
    heavy_high: normal(
      "heavy_high", "Heavy Slash", AttackHeight.HIGH,
      12, 5, 16, 100, 24, 16, 45,
      { x: 25, y: -150, width: 80, height: 70 },
    ),
    // A — Light low: quick low kick
    light_low: normal(
      "light_low", "Low Kick", AttackHeight.LOW,
      4, 3, 7, 25, 10, 7, 5,
      { x: 35, y: -25, width: 60, height: 35 },
    ),
    // S — Medium low: crouching sword poke
    med_low: normal(
      "med_low", "Low Poke", AttackHeight.LOW,
      8, 4, 12, 50, 16, 10, 15,
      { x: 35, y: -35, width: 85, height: 40 },
    ),
    // D — Heavy low: sweeping leg + sword
    heavy_low: normal(
      "heavy_low", "Sweep", AttackHeight.LOW,
      14, 5, 18, 80, 0, 14, 30,
      { x: 25, y: -18, width: 90, height: 35 },
      { isLauncher: true },
    ),
  },

  specials: {
    // Q+W — Sword Thrust: lunging forward stab
    sword_thrust: special(
      "sword_thrust", "Sword Thrust", AttackHeight.MID,
      8, 5, 14, 80, 16, 20, 14, 38,
      { x: 35, y: -100, width: 110, height: 40 },
      { movesForward: 100 },
    ),
    // W+E — Overhead Cleave: slow overhead, must block standing
    overhead_cleave: special(
      "overhead_cleave", "Overhead Cleave", AttackHeight.OVERHEAD,
      16, 6, 20, 130, 26, 28, 18, 60,
      { x: 15, y: -160, width: 80, height: 90 },
    ),
    // A+S — Low Sweep: ground-level sword sweep
    low_sweep: special(
      "low_sweep", "Low Sweep", AttackHeight.LOW,
      10, 5, 16, 70, 14, 18, 12, 22,
      { x: 25, y: -18, width: 110, height: 35 },
    ),
    // S+D — Rising Slash: anti-air uppercut
    rising_slash: special(
      "rising_slash", "Rising Slash", AttackHeight.MID,
      6, 8, 22, 110, 22, 24, 16, 50,
      { x: 15, y: -180, width: 65, height: 100 },
      { isAntiAir: true, hasInvincibility: true, invincibleStartup: 4 },
    ),
    // Q+D — Shield Charge: rushing forward shield slam
    shield_charge: special(
      "shield_charge", "Shield Charge", AttackHeight.MID,
      8, 6, 18, 90, 18, 22, 14, 55,
      { x: 20, y: -100, width: 70, height: 60 },
      { movesForward: 160, hasInvincibility: true, invincibleStartup: 3 },
    ),
    // E+A — Excalibur: massive upward swing (super)
    excalibur: special(
      "excalibur", "Excalibur", AttackHeight.MID,
      10, 8, 24, 160, 32, 30, 20, 70,
      { x: 10, y: -200, width: 80, height: 120 },
      { isAntiAir: true, hasInvincibility: true, invincibleStartup: 6 },
    ),
    // E+D — Cross Slash: wide two-hit cross pattern, high damage
    cross_slash: special(
      "cross_slash", "Cross Slash", AttackHeight.MID,
      10, 8, 18, 140, 28, 26, 16, 55,
      { x: 20, y: -140, width: 100, height: 80 },
      { movesForward: 60 },
    ),
    // W+S — Parry Counter: quick defensive stance with counter strike
    parry_counter: special(
      "parry_counter", "Parry Counter", AttackHeight.MID,
      3, 10, 16, 95, 19, 22, 14, 40,
      { x: 15, y: -120, width: 70, height: 80 },
      { hasInvincibility: true, invincibleStartup: 8 },
    ),
  },

  zeals: {
    royal_judgment: zeal(
      "royal_judgment", "Royal Judgment", AttackHeight.MID,
      10, 8, 20, 150, 30, 28, 18, 50,
      { x: 30, y: -130, width: 120, height: 90 },
      { movesForward: 80 },
    ),
    excalibur_unleashed: zeal(
      "excalibur_unleashed", "Excalibur Unleashed", AttackHeight.MID,
      14, 10, 28, 300, 60, 40, 24, 80,
      { x: 20, y: -150, width: 160, height: 120 },
      { movesForward: 60, isLauncher: true },
    ),
  },

  grab: {
    id: "shield_bash",
    name: "Shield Bash",
    type: "grab",
    height: AttackHeight.MID,
    startup: 5,
    active: 3,
    recovery: 25,
    damage: 90,
    chipDamage: 0,
    hitstun: 30,
    blockstun: 0,
    knockback: 90,
    hitbox: { x: 25, y: -100, width: 55, height: 70 },
  },
};

// ===========================================================================
// MERLIN — Mage
// ===========================================================================

export const MERLIN_DEF: DuelCharacterDef = {
  id: "merlin",
  name: "Merlin",
  title: "Archmage of Avalon",
  portrait: "merlin",
  fighterType: "mage",
  maxHp: 900,
  walkSpeed: 4.5,
  backWalkSpeed: 3.5,
  jumpVelocity: -19,
  jumpForwardSpeed: 5.5,
  weight: 0.9,

  normals: {
    light_high: normal(
      "light_high", "Staff Poke", AttackHeight.HIGH,
      5, 3, 7, 25, 11, 7, 6,
      { x: 40, y: -120, width: 75, height: 30 },
    ),
    med_high: normal(
      "med_high", "Staff Swing", AttackHeight.HIGH,
      9, 4, 12, 50, 16, 11, 18,
      { x: 35, y: -110, width: 90, height: 38 },
    ),
    heavy_high: normal(
      "heavy_high", "Staff Slam", AttackHeight.HIGH,
      14, 5, 18, 85, 22, 15, 38,
      { x: 25, y: -130, width: 80, height: 60 },
    ),
    light_low: normal(
      "light_low", "Low Staff", AttackHeight.LOW,
      5, 3, 8, 20, 9, 6, 5,
      { x: 38, y: -25, width: 65, height: 30 },
    ),
    med_low: normal(
      "med_low", "Staff Sweep", AttackHeight.LOW,
      10, 4, 14, 45, 14, 10, 15,
      { x: 30, y: -30, width: 85, height: 38 },
    ),
    heavy_low: normal(
      "heavy_low", "Ground Slam", AttackHeight.LOW,
      16, 5, 20, 70, 0, 14, 28,
      { x: 20, y: -18, width: 90, height: 35 },
      { isLauncher: true },
    ),
  },

  specials: {
    // Q+W — Arcane Bolt: hadouken projectile
    arcane_bolt: special(
      "arcane_bolt", "Arcane Bolt", AttackHeight.MID,
      12, 3, 16, 60, 12, 18, 12, 22,
      { x: 50, y: -100, width: 35, height: 35 },
      { isProjectile: true, projectileSpeed: 9, projectileHeight: AttackHeight.MID },
    ),
    // W+E — Thunder Strike: overhead lightning at mid-range
    thunder_strike: special(
      "thunder_strike", "Thunder Strike", AttackHeight.OVERHEAD,
      18, 6, 18, 100, 20, 24, 16, 45,
      { x: 160, y: -190, width: 50, height: 190 },
    ),
    // A+S — Frost Wave: low ground projectile
    frost_wave: special(
      "frost_wave", "Frost Wave", AttackHeight.LOW,
      14, 3, 18, 50, 10, 16, 10, 15,
      { x: 50, y: -25, width: 40, height: 35 },
      { isProjectile: true, projectileSpeed: 6, projectileHeight: AttackHeight.LOW },
    ),
    // S+D — Teleport: vanish and reappear behind opponent
    teleport: special(
      "teleport", "Teleport", AttackHeight.MID,
      4, 0, 12, 0, 0, 0, 0, 0,
      { x: 0, y: 0, width: 0, height: 0 },
      { hasInvincibility: true, invincibleStartup: 10 },
    ),
    // Q+D — Arcane Storm: multi-hit overhead spell column
    arcane_storm: special(
      "arcane_storm", "Arcane Storm", AttackHeight.OVERHEAD,
      14, 10, 20, 120, 24, 26, 18, 40,
      { x: 100, y: -200, width: 80, height: 200 },
    ),
    // E+A — Mystic Barrier: counter stance, reflects projectiles
    mystic_barrier: special(
      "mystic_barrier", "Mystic Barrier", AttackHeight.MID,
      4, 12, 14, 0, 0, 0, 0, 0,
      { x: 0, y: 0, width: 0, height: 0 },
      { hasInvincibility: true, invincibleStartup: 12 },
    ),
    // E+D — Void Rift: tears open a rift at mid-range, pulls opponent in
    void_rift: special(
      "void_rift", "Void Rift", AttackHeight.MID,
      14, 10, 18, 105, 21, 24, 16, 35,
      { x: 120, y: -150, width: 70, height: 150 },
    ),
    // W+S — Mana Shield: absorbs a hit and retaliates with a burst
    mana_shield: special(
      "mana_shield", "Mana Shield", AttackHeight.MID,
      4, 14, 12, 75, 15, 20, 12, 30,
      { x: 20, y: -120, width: 60, height: 80 },
      { hasInvincibility: true, invincibleStartup: 10 },
    ),
  },

  zeals: {
    thunder_wrath: zeal(
      "thunder_wrath", "Thunder Wrath", AttackHeight.MID,
      6, 4, 22, 130, 26, 26, 16, 45,
      { x: 0, y: -120, width: 600, height: 80 },
    ),
    arcane_apocalypse: zeal(
      "arcane_apocalypse", "Arcane Apocalypse", AttackHeight.MID,
      16, 12, 30, 280, 56, 38, 22, 70,
      { x: 10, y: -160, width: 200, height: 140 },
      { isLauncher: true },
    ),
  },

  grab: {
    id: "staff_pin",
    name: "Staff Pin",
    type: "grab",
    height: AttackHeight.MID,
    startup: 6,
    active: 3,
    recovery: 28,
    damage: 80,
    chipDamage: 0,
    hitstun: 28,
    blockstun: 0,
    knockback: 75,
    hitbox: { x: 25, y: -100, width: 55, height: 70 },
  },
};

// ===========================================================================
// ELAINE — Archer
// ===========================================================================

export const ELAINE_DEF: DuelCharacterDef = {
  id: "elaine",
  name: "Elaine",
  title: "The Lily Maid",
  portrait: "elaine",
  fighterType: "archer",
  maxHp: 850,
  walkSpeed: 6.0,
  backWalkSpeed: 4.5,
  jumpVelocity: -21,
  jumpForwardSpeed: 7,
  weight: 0.8,

  normals: {
    light_high: normal(
      "light_high", "Quick Strike", AttackHeight.HIGH,
      3, 3, 5, 22, 10, 7, 6,
      { x: 38, y: -115, width: 60, height: 30 },
    ),
    med_high: normal(
      "med_high", "Bow Swing", AttackHeight.HIGH,
      6, 4, 9, 45, 15, 10, 15,
      { x: 30, y: -110, width: 80, height: 38 },
    ),
    heavy_high: normal(
      "heavy_high", "Bow Slam", AttackHeight.HIGH,
      10, 5, 14, 75, 20, 14, 32,
      { x: 25, y: -130, width: 75, height: 50 },
    ),
    light_low: normal(
      "light_low", "Shin Kick", AttackHeight.LOW,
      3, 3, 6, 18, 8, 6, 5,
      { x: 35, y: -20, width: 55, height: 30 },
    ),
    med_low: normal(
      "med_low", "Slide Kick", AttackHeight.LOW,
      7, 4, 10, 40, 13, 9, 12,
      { x: 30, y: -25, width: 75, height: 35 },
    ),
    heavy_low: normal(
      "heavy_low", "Sweep Kick", AttackHeight.LOW,
      11, 5, 15, 60, 0, 12, 22,
      { x: 20, y: -18, width: 80, height: 30 },
      { isLauncher: true },
    ),
  },

  specials: {
    // Q+W — Power Shot: fast arrow projectile
    power_shot: special(
      "power_shot", "Power Shot", AttackHeight.MID,
      8, 3, 12, 50, 10, 16, 10, 18,
      { x: 50, y: -100, width: 30, height: 20 },
      { isProjectile: true, projectileSpeed: 12, projectileHeight: AttackHeight.MID },
    ),
    // W+E — Rain of Arrows: arcing overhead at set distance
    rain_of_arrows: special(
      "rain_of_arrows", "Rain of Arrows", AttackHeight.OVERHEAD,
      16, 8, 16, 70, 14, 20, 14, 30,
      { x: 130, y: -180, width: 100, height: 180 },
    ),
    // A+S — Leg Sweep: quick trip, combo starter
    leg_sweep: special(
      "leg_sweep", "Leg Sweep", AttackHeight.LOW,
      6, 4, 12, 40, 8, 14, 8, 8,
      { x: 25, y: -18, width: 80, height: 30 },
    ),
    // S+D — Backflip Shot: jump back + fire arrow
    backflip_shot: special(
      "backflip_shot", "Backflip Shot", AttackHeight.MID,
      6, 6, 10, 55, 11, 16, 10, 22,
      { x: 35, y: -110, width: 30, height: 25 },
      { isProjectile: true, projectileSpeed: 10, projectileHeight: AttackHeight.MID, movesBack: 130 },
    ),
    // Q+D — Triple Shot: three rapid arrows
    triple_shot: special(
      "triple_shot", "Triple Shot", AttackHeight.MID,
      6, 8, 14, 75, 15, 18, 12, 20,
      { x: 50, y: -100, width: 30, height: 20 },
      { isProjectile: true, projectileSpeed: 14, projectileHeight: AttackHeight.MID },
    ),
    // E+A — Hunter's Trap: low ground snare
    hunters_trap: special(
      "hunters_trap", "Hunter's Trap", AttackHeight.LOW,
      10, 15, 16, 60, 12, 20, 14, 10,
      { x: 80, y: -20, width: 60, height: 30 },
    ),
    // E+D — Piercing Arrow: charged long-range arrow that goes through block
    piercing_arrow: special(
      "piercing_arrow", "Piercing Arrow", AttackHeight.MID,
      16, 4, 14, 100, 20, 22, 14, 35,
      { x: 50, y: -100, width: 30, height: 20 },
      { isProjectile: true, projectileSpeed: 16, projectileHeight: AttackHeight.MID },
    ),
    // W+S — Evasive Roll: quick dodge forward with a rising kick at the end
    evasive_strike: special(
      "evasive_strike", "Evasive Strike", AttackHeight.MID,
      5, 5, 12, 65, 13, 18, 10, 25,
      { x: 25, y: -130, width: 65, height: 60 },
      { movesForward: 120, hasInvincibility: true, invincibleStartup: 6 },
    ),
  },

  zeals: {
    storm_volley: zeal(
      "storm_volley", "Storm Volley", AttackHeight.MID,
      8, 10, 18, 140, 28, 26, 16, 45,
      { x: 30, y: -120, width: 140, height: 80 },
      { movesForward: 40 },
    ),
    celestial_arrow: zeal(
      "celestial_arrow", "Celestial Arrow", AttackHeight.MID,
      12, 8, 26, 290, 58, 38, 22, 75,
      { x: 20, y: -140, width: 200, height: 100 },
      { isLauncher: true },
    ),
  },

  grab: {
    id: "string_bind",
    name: "String Bind",
    type: "grab",
    height: AttackHeight.MID,
    startup: 4,
    active: 3,
    recovery: 22,
    damage: 70,
    chipDamage: 0,
    hitstun: 26,
    blockstun: 0,
    knockback: 80,
    hitbox: { x: 20, y: -100, width: 50, height: 70 },
  },
};

// ---- Character registry ----------------------------------------------------

export const DUEL_CHARACTERS: Record<string, DuelCharacterDef> = {
  arthur: ARTHUR_DEF,
  merlin: MERLIN_DEF,
  elaine: ELAINE_DEF,
};

export const DUEL_CHARACTER_IDS = ["arthur", "merlin", "elaine"] as const;
