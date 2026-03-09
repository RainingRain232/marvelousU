// ---------------------------------------------------------------------------
// Percival – "Seeker of the Grail" – Crusader knight / swordsman
// Crusader sword fighter with grail-quest themed abilities, blue/silver armor
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
// PERCIVAL — Seeker of the Grail — Swordsman
// ===========================================================================

export const PERCIVAL_DEF: DuelCharacterDef = {
  id: "percival",
  name: "Percival",
  title: "Seeker of the Grail",
  portrait: "percival",
  fighterType: "sword",
  maxHp: 940,
  walkSpeed: 5.3,
  backWalkSpeed: 4.0,
  jumpVelocity: -20,
  jumpForwardSpeed: 6,
  weight: 0.95,

  normals: {
    // Q — Light high: quick crusader jab
    light_high: normal(
      "light_high", "Crusader Jab", AttackHeight.HIGH,
      4, 3, 6, 28, 12, 8, 7,
      { x: 40, y: -118, width: 68, height: 34 },
    ),
    // W — Medium high: horizontal cross slash
    med_high: normal(
      "med_high", "Cross Slash", AttackHeight.HIGH,
      7, 4, 10, 58, 17, 12, 20,
      { x: 35, y: -108, width: 88, height: 40 },
    ),
    // E — Heavy high: two-handed crusader overhead
    heavy_high: normal(
      "heavy_high", "Holy Slash", AttackHeight.HIGH,
      12, 5, 16, 95, 23, 16, 42,
      { x: 25, y: -148, width: 78, height: 68 },
    ),
    // A — Light low: quick shin kick
    light_low: normal(
      "light_low", "Pilgrim Kick", AttackHeight.LOW,
      4, 3, 7, 24, 10, 7, 5,
      { x: 35, y: -24, width: 58, height: 34 },
    ),
    // S — Medium low: crouching sword poke
    med_low: normal(
      "med_low", "Low Thrust", AttackHeight.LOW,
      8, 4, 12, 48, 15, 10, 14,
      { x: 35, y: -32, width: 82, height: 38 },
    ),
    // D — Heavy low: sweeping launcher
    heavy_low: normal(
      "heavy_low", "Grail Sweep", AttackHeight.LOW,
      14, 5, 18, 78, 0, 14, 28,
      { x: 25, y: -18, width: 88, height: 34 },
      { isLauncher: true },
    ),
  },

  specials: {
    // Q+W — Quest Thrust: forward lunge with crusader sword
    quest_thrust: special(
      "quest_thrust", "Quest Thrust", AttackHeight.MID,
      8, 5, 14, 82, 16, 20, 14, 36,
      { x: 35, y: -100, width: 108, height: 38 },
      { movesForward: 110 },
    ),
    // W+E — Pilgrim Cleave: overhead crusader slam
    pilgrim_cleave: special(
      "pilgrim_cleave", "Pilgrim Cleave", AttackHeight.OVERHEAD,
      16, 6, 20, 125, 25, 27, 18, 58,
      { x: 15, y: -158, width: 78, height: 88 },
    ),
    // A+S — Seeker Sweep: ground-level sword sweep
    seeker_sweep: special(
      "seeker_sweep", "Seeker Sweep", AttackHeight.LOW,
      10, 5, 16, 68, 14, 18, 12, 20,
      { x: 25, y: -18, width: 108, height: 34 },
    ),
    // S+D — Grail Rise: anti-air rising slash with invincibility
    grail_rise: special(
      "grail_rise", "Grail Rise", AttackHeight.MID,
      6, 8, 22, 108, 22, 24, 16, 48,
      { x: 15, y: -178, width: 64, height: 98 },
      { isAntiAir: true, hasInvincibility: true, invincibleStartup: 4 },
    ),
    // Q+D — Zealous Charge: forward rush with shield and sword
    zealous_charge: special(
      "zealous_charge", "Zealous Charge", AttackHeight.MID,
      8, 6, 18, 88, 18, 22, 14, 54,
      { x: 20, y: -100, width: 72, height: 58 },
      { movesForward: 155, hasInvincibility: true, invincibleStartup: 3 },
    ),
    // E+A — Quest Strike: massive empowered sword swing
    quest_strike: special(
      "quest_strike", "Quest Strike", AttackHeight.MID,
      10, 8, 24, 155, 31, 30, 20, 68,
      { x: 10, y: -195, width: 78, height: 118 },
      { isAntiAir: true, hasInvincibility: true, invincibleStartup: 6 },
    ),
    // E+D — Cross Blade: wide two-hit cross pattern
    cross_blade: special(
      "cross_blade", "Cross Blade", AttackHeight.MID,
      10, 8, 18, 135, 27, 26, 16, 52,
      { x: 20, y: -138, width: 98, height: 78 },
      { movesForward: 55 },
    ),
    // W+S — Pilgrim Guard: counter stance with invincibility
    pilgrim_guard: special(
      "pilgrim_guard", "Pilgrim Guard", AttackHeight.MID,
      3, 10, 16, 92, 18, 22, 14, 38,
      { x: 15, y: -118, width: 68, height: 78 },
      { hasInvincibility: true, invincibleStartup: 8 },
    ),
  },

  zeals: {
    // Zeal 1 — Grail Quest: forward multi-hit crusader combo
    grail_quest: zeal(
      "grail_quest", "Grail Quest", AttackHeight.MID,
      10, 8, 20, 148, 30, 28, 18, 48,
      { x: 30, y: -128, width: 118, height: 88 },
      { movesForward: 85 },
    ),
    // Zeal 2 — Sacred Revelation: launcher, divine upward strike
    sacred_revelation: zeal(
      "sacred_revelation", "Sacred Revelation", AttackHeight.MID,
      14, 10, 28, 285, 57, 38, 22, 78,
      { x: 20, y: -148, width: 155, height: 118 },
      { movesForward: 55, isLauncher: true },
    ),
  },

  grab: {
    id: "gauntlet_slam",
    name: "Gauntlet Slam",
    type: "grab",
    height: AttackHeight.MID,
    startup: 5,
    active: 3,
    recovery: 25,
    damage: 87,
    chipDamage: 0,
    hitstun: 29,
    blockstun: 0,
    knockback: 88,
    hitbox: { x: 25, y: -100, width: 55, height: 70 },
  },
};
