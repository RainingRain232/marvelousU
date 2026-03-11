// ---------------------------------------------------------------------------
// Uther – "The Pendragon" – Crossbow / Archer fighter
// Regal older king with heavy crossbow, dragon-themed abilities
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
// UTHER — "The Pendragon" — Crossbow Archer
// ===========================================================================

export const UTHER_DEF: DuelCharacterDef = {
  id: "uther",
  name: "Uther",
  title: "The Pendragon",
  portrait: "uther",
  fighterType: "archer",
  maxHp: 950,
  walkSpeed: 4.6,
  backWalkSpeed: 3.5,
  jumpVelocity: -18,
  jumpForwardSpeed: 5,
  weight: 1.0,

  normals: {
    // Q — Light high: quick crossbow stock jab
    light_high: normal(
      "light_high", "Stock Jab", AttackHeight.HIGH,
      5, 3, 7, 28, 12, 8, 8,
      { x: 38, y: -120, width: 65, height: 32 },
    ),
    // W — Medium high: horizontal crossbow swing
    med_high: normal(
      "med_high", "Crossbow Swing", AttackHeight.HIGH,
      8, 4, 12, 55, 17, 12, 20,
      { x: 32, y: -115, width: 85, height: 40 },
    ),
    // E — Heavy high: two-handed overhead crossbow slam
    heavy_high: normal(
      "heavy_high", "Dragon Slam", AttackHeight.HIGH,
      13, 5, 17, 90, 22, 15, 40,
      { x: 25, y: -140, width: 80, height: 60 },
    ),
    // A — Light low: quick boot kick
    light_low: normal(
      "light_low", "Royal Boot", AttackHeight.LOW,
      5, 3, 7, 24, 10, 7, 6,
      { x: 35, y: -22, width: 58, height: 32 },
    ),
    // S — Medium low: crouching crossbow stock sweep
    med_low: normal(
      "med_low", "Low Stock", AttackHeight.LOW,
      9, 4, 13, 48, 15, 10, 15,
      { x: 30, y: -30, width: 80, height: 38 },
    ),
    // D — Heavy low: dragon tail sweep — launcher
    heavy_low: normal(
      "heavy_low", "Dragon Tail", AttackHeight.LOW,
      14, 5, 18, 75, 0, 14, 28,
      { x: 22, y: -18, width: 85, height: 35 },
      { isLauncher: true },
    ),
  },

  specials: {
    // Q+W — Dragon Bolt: heavy crossbow bolt projectile
    dragon_bolt: special(
      "dragon_bolt", "Dragon Bolt", AttackHeight.MID,
      10, 3, 14, 65, 13, 18, 12, 24,
      { x: 50, y: -105, width: 35, height: 25 },
      { isProjectile: true, projectileSpeed: 10, projectileHeight: AttackHeight.MID },
    ),
    // W+E — Dragon's Breath: the Pendragon's dragon scorches a massive area — widest overhead in the game
    fire_rain: special(
      "fire_rain", "Dragon's Breath", AttackHeight.OVERHEAD,
      18, 8, 20, 88, 18, 22, 16, 35,
      { x: 48, y: -195, width: 258, height: 198 },
    ),
    // A+S — Low Shot: ground-skimming bolt
    low_shot: special(
      "low_shot", "Low Shot", AttackHeight.LOW,
      8, 3, 14, 50, 10, 16, 10, 15,
      { x: 50, y: -22, width: 35, height: 30 },
      { isProjectile: true, projectileSpeed: 8, projectileHeight: AttackHeight.LOW },
    ),
    // S+D — Pendragon Retreat: backflip with bolt fired
    pendragon_retreat: special(
      "pendragon_retreat", "Pendragon Retreat", AttackHeight.MID,
      7, 5, 12, 55, 11, 16, 10, 22,
      { x: 35, y: -110, width: 32, height: 28 },
      { isProjectile: true, projectileSpeed: 10, projectileHeight: AttackHeight.MID, movesBack: 140 },
    ),
    // Q+D — Siege Volley: triple heavy bolts
    siege_volley: special(
      "siege_volley", "Siege Volley", AttackHeight.MID,
      8, 8, 16, 90, 18, 20, 14, 28,
      { x: 50, y: -110, width: 35, height: 25 },
      { isProjectile: true, projectileSpeed: 12, projectileHeight: AttackHeight.MID },
    ),
    // E+A — Pendragon Seal: royal seal planted at extreme range — maximum distance zone denial
    dragon_trap: special(
      "dragon_trap", "Pendragon Seal", AttackHeight.LOW,
      12, 18, 16, 68, 14, 22, 14, 12,
      { x: 135, y: -22, width: 88, height: 32 },
    ),
    // E+D — Dragon Bolt Heavy: slow piercing bolt, massive damage
    dragon_bolt_heavy: special(
      "dragon_bolt_heavy", "Dragon Bolt Heavy", AttackHeight.MID,
      20, 4, 18, 110, 22, 26, 18, 45,
      { x: 50, y: -105, width: 40, height: 28 },
      { isProjectile: true, projectileSpeed: 8, projectileHeight: AttackHeight.MID },
    ),
    // W+S — Royal Dodge: forward evasive roll with invincibility
    royal_dodge: special(
      "royal_dodge", "Royal Dodge", AttackHeight.MID,
      4, 4, 14, 60, 12, 16, 10, 22,
      { x: 25, y: -100, width: 60, height: 55 },
      { movesForward: 130, hasInvincibility: true, invincibleStartup: 8 },
    ),
  },

  zeals: {
    // Zeal 1 — Dragon's Onslaught: the dragon's fire sweeps across the entire arena at ground level
    pendragon_barrage: zeal(
      "pendragon_barrage", "Dragon's Onslaught", AttackHeight.MID,
      6, 8, 24, 152, 30, 28, 18, 48,
      { x: 0, y: -82, width: 700, height: 68 },
    ),
    // Zeal 2 — Dragon Fury: the Pendragon's ultimate — explosive launcher with dragon's full wingspan
    dragon_fury: zeal(
      "dragon_fury", "Dragon Fury", AttackHeight.MID,
      14, 10, 28, 292, 58, 40, 24, 76,
      { x: -15, y: -155, width: 228, height: 118 },
      { isLauncher: true },
    ),
  },

  grab: {
    id: "crown_strike",
    name: "Crown Strike",
    type: "grab",
    height: AttackHeight.MID,
    startup: 5,
    active: 3,
    recovery: 26,
    damage: 80,
    chipDamage: 0,
    hitstun: 28,
    blockstun: 0,
    knockback: 85,
    hitbox: { x: 25, y: -100, width: 55, height: 70 },
  },
};
