// ---------------------------------------------------------------------------
// Galahad — The Pure Knight
// Holy/defensive swordsman with radiant white sword, shield, and counters.
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
// GALAHAD — The Pure Knight (Holy/Defensive Swordsman)
// ===========================================================================

export const GALAHAD_DEF: DuelCharacterDef = {
  id: "galahad",
  name: "Galahad",
  title: "The Pure Knight",
  portrait: "galahad",
  fighterType: "sword",
  maxHp: 970,
  walkSpeed: 5.0,
  backWalkSpeed: 4.2,
  jumpVelocity: -19,
  jumpForwardSpeed: 5.5,
  weight: 1.05,

  normals: {
    // Q — Light high: quick radiant jab (good blockstun for a light)
    light_high: normal(
      "light_high", "Holy Jab", AttackHeight.HIGH,
      4, 3, 7, 28, 12, 10, 7,
      { x: 40, y: -120, width: 65, height: 32 },
    ),
    // W — Medium high: horizontal blessed slash (strong blockstun)
    med_high: normal(
      "med_high", "Blessed Slash", AttackHeight.HIGH,
      8, 4, 11, 55, 17, 14, 20,
      { x: 35, y: -110, width: 85, height: 40 },
    ),
    // E — Heavy high: two-handed consecrated overhead
    heavy_high: normal(
      "heavy_high", "Consecrated Blow", AttackHeight.HIGH,
      13, 5, 16, 95, 23, 18, 42,
      { x: 25, y: -150, width: 78, height: 68 },
    ),
    // A — Light low: quick shin kick (good blockstun for a low light)
    light_low: normal(
      "light_low", "Shin Kick", AttackHeight.LOW,
      4, 3, 7, 24, 10, 9, 5,
      { x: 35, y: -25, width: 58, height: 32 },
    ),
    // S — Medium low: crouching sword poke, solid blockstun
    med_low: normal(
      "med_low", "Low Poke", AttackHeight.LOW,
      9, 4, 12, 48, 15, 12, 14,
      { x: 35, y: -35, width: 82, height: 38 },
    ),
    // D — Heavy low: sweeping radiant arc (launcher)
    heavy_low: normal(
      "heavy_low", "Radiant Sweep", AttackHeight.LOW,
      14, 5, 18, 78, 0, 16, 30,
      { x: 25, y: -18, width: 88, height: 34 },
      { isLauncher: true },
    ),
  },

  specials: {
    // Q+W — Holy Thrust: forward lunge with radiant sword
    holy_thrust: special(
      "holy_thrust", "Holy Thrust", AttackHeight.MID,
      8, 5, 14, 82, 16, 20, 15, 40,
      { x: 35, y: -100, width: 115, height: 38 },
      { movesForward: 110 },
    ),
    // W+E — Divine Cleave: overhead blessed strike, must block standing
    divine_cleave: special(
      "divine_cleave", "Divine Cleave", AttackHeight.OVERHEAD,
      15, 6, 20, 125, 25, 27, 18, 58,
      { x: 15, y: -160, width: 82, height: 88 },
    ),
    // A+S — Purifying Sweep: low ground-level holy sweep
    purifying_sweep: special(
      "purifying_sweep", "Purifying Sweep", AttackHeight.LOW,
      10, 5, 16, 68, 14, 18, 13, 22,
      { x: 25, y: -18, width: 108, height: 34 },
    ),
    // S+D — Ascending Light: anti-air rising slash with invincibility
    ascending_light: special(
      "ascending_light", "Ascending Light", AttackHeight.MID,
      6, 8, 22, 108, 22, 24, 16, 50,
      { x: 15, y: -180, width: 65, height: 100 },
      { isAntiAir: true, hasInvincibility: true, invincibleStartup: 4 },
    ),
    // Q+D — Shield Rush: forward charge with shield, high blockstun
    shield_rush: special(
      "shield_rush", "Shield Rush", AttackHeight.MID,
      8, 6, 18, 88, 18, 22, 18, 60,
      { x: 20, y: -100, width: 72, height: 60 },
      { movesForward: 150, hasInvincibility: true, invincibleStartup: 3 },
    ),
    // E+A — Grail Strike: massive holy downward slash, invincibility
    grail_strike: special(
      "grail_strike", "Grail Strike", AttackHeight.MID,
      11, 8, 24, 155, 31, 30, 20, 68,
      { x: 10, y: -200, width: 82, height: 118 },
      { isAntiAir: true, hasInvincibility: true, invincibleStartup: 6 },
    ),
    // E+D — Radiant Cross: wide cross-shaped slash pattern
    radiant_cross: special(
      "radiant_cross", "Radiant Cross", AttackHeight.MID,
      10, 8, 18, 135, 27, 26, 16, 52,
      { x: 20, y: -140, width: 105, height: 82 },
      { movesForward: 55 },
    ),
    // W+S — Aegis Counter: counter stance with long invincibility
    aegis_counter: special(
      "aegis_counter", "Aegis Counter", AttackHeight.MID,
      3, 12, 14, 100, 20, 22, 14, 42,
      { x: 15, y: -120, width: 70, height: 80 },
      { hasInvincibility: true, invincibleStartup: 10 },
    ),
  },

  zeals: {
    // Zeal 1 — Holy Radiance: area denial burst of holy energy
    holy_radiance: zeal(
      "holy_radiance", "Holy Radiance", AttackHeight.MID,
      8, 10, 20, 145, 29, 28, 18, 48,
      { x: 0, y: -130, width: 160, height: 100 },
    ),
    // Zeal 2 — Grail Ascension: launcher, massive rising holy strike
    grail_ascension: zeal(
      "grail_ascension", "Grail Ascension", AttackHeight.MID,
      14, 10, 28, 280, 56, 40, 24, 78,
      { x: 18, y: -155, width: 165, height: 125 },
      { movesForward: 50, isLauncher: true },
    ),
  },

  grab: {
    id: "shield_slam",
    name: "Shield Slam",
    type: "grab",
    height: AttackHeight.MID,
    startup: 5,
    active: 3,
    recovery: 25,
    damage: 88,
    chipDamage: 0,
    hitstun: 30,
    blockstun: 0,
    knockback: 88,
    hitbox: { x: 25, y: -100, width: 55, height: 70 },
  },
};
