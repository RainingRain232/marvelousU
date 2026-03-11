// ---------------------------------------------------------------------------
// Bedivere — The Loyal Hand
// Phalanx/shield-tank swordsman. Short sword + massive tower shield.
// Very slow but extremely tanky. High blockstun on normals, heavy hits.
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
// BEDIVERE — Shield-Tank Swordsman
// ===========================================================================

export const BEDIVERE_DEF: DuelCharacterDef = {
  id: "bedivere",
  name: "Bedivere",
  title: "The Loyal Hand",
  portrait: "bedivere",
  fighterType: "sword",
  maxHp: 1050,
  walkSpeed: 4.2,
  backWalkSpeed: 3.2,
  jumpVelocity: -17,
  jumpForwardSpeed: 4.5,
  weight: 1.15,

  normals: {
    // Q — Light high: quick shield jab — short range, high blockstun
    light_high: normal(
      "light_high", "Shield Jab", AttackHeight.HIGH,
      6, 3, 8, 35, 14, 12, 10,
      { x: 30, y: -120, width: 55, height: 35 },
    ),
    // W — Medium high: horizontal sword chop — slow but chunky
    med_high: normal(
      "med_high", "Iron Chop", AttackHeight.HIGH,
      9, 4, 12, 70, 20, 16, 28,
      { x: 28, y: -110, width: 70, height: 40 },
    ),
    // E — Heavy high: two-handed overhead slam — very slow, devastating
    heavy_high: normal(
      "heavy_high", "Tower Slam", AttackHeight.HIGH,
      14, 5, 18, 110, 26, 20, 50,
      { x: 20, y: -150, width: 65, height: 70 },
    ),
    // A — Light low: quick shin kick behind shield
    light_low: normal(
      "light_low", "Shin Kick", AttackHeight.LOW,
      6, 3, 9, 30, 12, 10, 8,
      { x: 28, y: -25, width: 50, height: 35 },
    ),
    // S — Medium low: crouching sword slash
    med_low: normal(
      "med_low", "Low Cut", AttackHeight.LOW,
      10, 4, 14, 55, 18, 14, 18,
      { x: 25, y: -35, width: 65, height: 40 },
    ),
    // D — Heavy low: low shield sweep — launcher
    heavy_low: normal(
      "heavy_low", "Shield Sweep", AttackHeight.LOW,
      16, 5, 20, 90, 0, 18, 35,
      { x: 18, y: -18, width: 75, height: 35 },
      { isLauncher: true },
    ),
  },

  specials: {
    // Q+W — Shield Thrust: forward shield bash, closes distance
    shield_thrust: special(
      "shield_thrust", "Shield Thrust", AttackHeight.MID,
      10, 5, 16, 85, 17, 22, 16, 45,
      { x: 25, y: -100, width: 70, height: 55 },
      { movesForward: 90 },
    ),
    // W+E — Avalanche: shield crashes down like an avalanche — crushing width covers entire front arc
    tower_slam: special(
      "tower_slam", "Avalanche", AttackHeight.OVERHEAD,
      18, 7, 22, 142, 28, 30, 20, 65,
      { x: -22, y: -165, width: 155, height: 98 },
    ),
    // A+S — Low Bash: low shield sweep along ground
    low_bash: special(
      "low_bash", "Low Bash", AttackHeight.LOW,
      12, 5, 18, 75, 15, 20, 14, 25,
      { x: 20, y: -18, width: 80, height: 35 },
    ),
    // S+D — Rising Guard: anti-air shield uppercut with invincibility
    rising_guard: special(
      "rising_guard", "Rising Guard", AttackHeight.MID,
      8, 8, 24, 115, 23, 26, 18, 55,
      { x: 12, y: -180, width: 60, height: 100 },
      { isAntiAir: true, hasInvincibility: true, invincibleStartup: 5 },
    ),
    // Q+D — Fortress Charge: rushing forward with shield, massive knockback
    fortress_charge: special(
      "fortress_charge", "Fortress Charge", AttackHeight.MID,
      10, 6, 20, 100, 20, 24, 16, 75,
      { x: 15, y: -100, width: 65, height: 65 },
      { movesForward: 180, hasInvincibility: true, invincibleStartup: 4 },
    ),
    // E+A — Immovable Object: Bedivere erupts with force in all directions — 360 burst
    last_stand: special(
      "last_stand", "Immovable Object", AttackHeight.MID,
      10, 10, 28, 172, 34, 32, 22, 72,
      { x: -58, y: -205, width: 222, height: 228 },
      { hasInvincibility: true, invincibleStartup: 6 },
    ),
    // E+D — Shield Cross: wide horizontal shield sweep
    shield_cross: special(
      "shield_cross", "Shield Cross", AttackHeight.MID,
      12, 8, 20, 135, 27, 28, 18, 55,
      { x: 15, y: -120, width: 90, height: 70 },
      { movesForward: 50 },
    ),
    // W+S — Iron Curtain: raises shield to ceiling height — tall narrow wall catches any jump-in
    iron_wall: special(
      "iron_wall", "Iron Curtain", AttackHeight.MID,
      5, 14, 18, 102, 20, 24, 16, 45,
      { x: 0, y: -258, width: 42, height: 262 },
      { hasInvincibility: true, invincibleStartup: 12 },
    ),
  },

  zeals: {
    // Zeal 1 — Fortress Wall: a wall of force erupts outward from Bedivere — not a charge, an expansion
    bulwark_crash: zeal(
      "bulwark_crash", "Fortress Wall", AttackHeight.MID,
      10, 10, 24, 162, 32, 30, 20, 60,
      { x: -28, y: -205, width: 212, height: 218 },
    ),
    // Zeal 2 — Loyal Sacrifice: launcher, enormous upward shield smash
    loyal_sacrifice: zeal(
      "loyal_sacrifice", "Loyal Sacrifice", AttackHeight.MID,
      16, 10, 30, 270, 54, 38, 24, 80,
      { x: 15, y: -160, width: 140, height: 120 },
      { isLauncher: true },
    ),
  },

  grab: {
    id: "tower_crush",
    name: "Tower Crush",
    type: "grab",
    height: AttackHeight.MID,
    startup: 6,
    active: 3,
    recovery: 28,
    damage: 95,
    chipDamage: 0,
    hitstun: 32,
    blockstun: 0,
    knockback: 95,
    hitbox: { x: 20, y: -100, width: 55, height: 70 },
  },
};
