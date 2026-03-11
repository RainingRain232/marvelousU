// ---------------------------------------------------------------------------
// Guinevere -- Queen of Camelot
// Templar/holy swordswoman with blessed longsword and royal themed attacks.
// Balanced fighter with strong normals and holy-themed specials.
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
// GUINEVERE -- Holy Swordswoman
// ===========================================================================

export const GUINEVERE_DEF: DuelCharacterDef = {
  id: "guinevere",
  name: "Guinevere",
  title: "Queen of Camelot",
  portrait: "guinevere",
  fighterType: "sword",
  maxHp: 950,
  walkSpeed: 5.2,
  backWalkSpeed: 3.9,
  jumpVelocity: -20,
  jumpForwardSpeed: 6,
  weight: 0.95,

  normals: {
    // Q -- Light high: quick blessed jab (faster than Arthur)
    light_high: normal(
      "light_high", "Holy Jab", AttackHeight.HIGH,
      3, 3, 6, 28, 11, 8, 7,
      { x: 40, y: -120, width: 68, height: 32 },
    ),
    // W -- Medium high: horizontal blessed slash
    med_high: normal(
      "med_high", "Radiant Slash", AttackHeight.HIGH,
      6, 4, 10, 55, 17, 12, 20,
      { x: 35, y: -110, width: 88, height: 38 },
    ),
    // E -- Heavy high: two-handed overhead cleave
    heavy_high: normal(
      "heavy_high", "Sanctified Strike", AttackHeight.HIGH,
      11, 5, 16, 92, 23, 15, 42,
      { x: 25, y: -148, width: 78, height: 68 },
    ),
    // A -- Light low: swift low kick
    light_low: normal(
      "light_low", "Royal Kick", AttackHeight.LOW,
      3, 3, 7, 23, 10, 7, 5,
      { x: 35, y: -25, width: 58, height: 32 },
    ),
    // S -- Medium low: crouching sword poke
    med_low: normal(
      "med_low", "Low Blessing", AttackHeight.LOW,
      7, 4, 11, 48, 15, 10, 14,
      { x: 35, y: -35, width: 82, height: 38 },
    ),
    // D -- Heavy low: sweeping blade at ankle height (launcher)
    heavy_low: normal(
      "heavy_low", "Divine Sweep", AttackHeight.LOW,
      13, 5, 17, 75, 0, 14, 28,
      { x: 25, y: -18, width: 88, height: 34 },
      { isLauncher: true },
    ),
  },

  specials: {
    // Q+W -- Divine Thrust: lunging forward stab with blessed blade
    divine_thrust: special(
      "divine_thrust", "Divine Thrust", AttackHeight.MID,
      7, 5, 14, 75, 15, 19, 14, 36,
      { x: 35, y: -100, width: 108, height: 38 },
      { movesForward: 95 },
    ),
    // W+E -- Holy Cleave: overhead downward slash, must block standing
    holy_cleave: special(
      "holy_cleave", "Holy Cleave", AttackHeight.OVERHEAD,
      15, 6, 19, 125, 25, 27, 17, 58,
      { x: 15, y: -158, width: 78, height: 88 },
    ),
    // A+S -- Sanctified Sweep: low ground-level blade sweep
    sanctified_sweep: special(
      "sanctified_sweep", "Sanctified Sweep", AttackHeight.LOW,
      9, 5, 15, 68, 14, 17, 12, 20,
      { x: 25, y: -18, width: 108, height: 34 },
    ),
    // S+D -- Holy Ascension: rising pillar of holy light — extreme vertical range, hits airborne opponents anywhere overhead
    radiant_rise: special(
      "radiant_rise", "Holy Ascension", AttackHeight.MID,
      5, 10, 23, 108, 22, 24, 16, 48,
      { x: 5, y: -238, width: 72, height: 242 },
      { isAntiAir: true, hasInvincibility: true, invincibleStartup: 4 },
    ),
    // Q+D -- Royal Charge: rushing forward with blade leading, invincible startup
    royal_charge: special(
      "royal_charge", "Royal Charge", AttackHeight.MID,
      7, 6, 17, 88, 18, 21, 14, 52,
      { x: 20, y: -100, width: 72, height: 58 },
      { movesForward: 155, hasInvincibility: true, invincibleStartup: 3 },
    ),
    // E+A -- Radiant Explosion: holy light erupts in all directions from Guinevere — punishes close-range
    blessed_blade: special(
      "blessed_blade", "Radiant Explosion", AttackHeight.MID,
      10, 8, 24, 158, 32, 30, 20, 68,
      { x: -38, y: -168, width: 168, height: 175 },
      { hasInvincibility: true, invincibleStartup: 5 },
    ),
    // E+D -- Cross Judgment: wide cross-pattern slash
    cross_judgment: special(
      "cross_judgment", "Cross Judgment", AttackHeight.MID,
      9, 8, 17, 135, 27, 25, 15, 52,
      { x: 20, y: -138, width: 98, height: 78 },
      { movesForward: 55 },
    ),
    // W+S -- Royal Parry: counter stance with riposte, invincible during counter window
    royal_parry: special(
      "royal_parry", "Royal Parry", AttackHeight.MID,
      3, 10, 15, 90, 18, 21, 13, 38,
      { x: 15, y: -118, width: 68, height: 78 },
      { hasInvincibility: true, invincibleStartup: 8 },
    ),
  },

  zeals: {
    // Zeal 1: Divine Retribution -- holy light explodes outward in all directions from Guinevere
    divine_retribution: zeal(
      "divine_retribution", "Divine Retribution", AttackHeight.MID,
      8, 10, 22, 148, 30, 28, 18, 48,
      { x: -65, y: -205, width: 228, height: 218 },
    ),
    // Zeal 2: Queen's Judgment -- the sky opens up, holy light descends across the entire arena
    queens_judgment: zeal(
      "queens_judgment", "Queen's Judgment", AttackHeight.OVERHEAD,
      16, 10, 30, 292, 58, 40, 24, 78,
      { x: 0, y: -255, width: 700, height: 258 },
      { isLauncher: true },
    ),
  },

  grab: {
    id: "royal_decree",
    name: "Royal Decree",
    type: "grab",
    height: AttackHeight.MID,
    startup: 5,
    active: 3,
    recovery: 24,
    damage: 85,
    chipDamage: 0,
    hitstun: 29,
    blockstun: 0,
    knockback: 88,
    hitbox: { x: 25, y: -100, width: 55, height: 70 },
  },
};
