// ---------------------------------------------------------------------------
// Duel mode – Igraine (Duchess of Cornwall) character definition
// Cleric/healer mage archetype: ceremonial staff, holy/light magic
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
// IGRAINE — Duchess of Cornwall (Cleric / Healer Mage)
// ===========================================================================

export const IGRAINE_DEF: DuelCharacterDef = {
  id: "igraine",
  name: "Igraine",
  title: "Duchess of Cornwall",
  portrait: "igraine",
  fighterType: "mage",
  maxHp: 860,
  walkSpeed: 4.6,
  backWalkSpeed: 3.5,
  jumpVelocity: -19,
  jumpForwardSpeed: 5,
  weight: 0.85,

  normals: {
    // Q — Light high: quick staff jab with holy light tip
    light_high: normal(
      "light_high", "Light Tap", AttackHeight.HIGH,
      5, 3, 7, 28, 11, 7, 7,
      { x: 42, y: -118, width: 70, height: 30 },
    ),
    // W — Medium high: horizontal staff swing trailing light
    med_high: normal(
      "med_high", "Staff Arc", AttackHeight.HIGH,
      8, 4, 11, 52, 16, 11, 18,
      { x: 35, y: -112, width: 88, height: 36 },
    ),
    // E — Heavy high: overhead staff slam with holy burst
    heavy_high: normal(
      "heavy_high", "Holy Slam", AttackHeight.HIGH,
      13, 5, 17, 88, 22, 15, 36,
      { x: 28, y: -135, width: 78, height: 62 },
    ),
    // A — Light low: quick staff poke at ankles
    light_low: normal(
      "light_low", "Low Grace", AttackHeight.LOW,
      5, 3, 8, 22, 9, 6, 5,
      { x: 36, y: -24, width: 62, height: 30 },
    ),
    // S — Medium low: crouching staff sweep with light trail
    med_low: normal(
      "med_low", "Blessed Sweep", AttackHeight.LOW,
      9, 4, 13, 46, 14, 10, 14,
      { x: 32, y: -30, width: 84, height: 36 },
    ),
    // D — Heavy low: rising holy burst from ground (launcher)
    heavy_low: normal(
      "heavy_low", "Holy Rise", AttackHeight.LOW,
      15, 5, 19, 72, 0, 14, 28,
      { x: 22, y: -18, width: 88, height: 35 },
      { isLauncher: true },
    ),
  },

  specials: {
    // Q+W — Holy Bolt: holy orb projectile
    holy_bolt: special(
      "holy_bolt", "Holy Bolt", AttackHeight.MID,
      11, 3, 15, 58, 12, 17, 11, 20,
      { x: 50, y: -100, width: 35, height: 35 },
      { isProjectile: true, projectileSpeed: 8, projectileHeight: AttackHeight.MID },
    ),
    // W+E — Divine Strike: overhead holy pillar descending from above
    divine_strike: special(
      "divine_strike", "Divine Strike", AttackHeight.OVERHEAD,
      17, 6, 18, 105, 21, 24, 16, 45,
      { x: 150, y: -190, width: 55, height: 190 },
    ),
    // A+S — Sacred Wave: low holy ground projectile
    sacred_wave: special(
      "sacred_wave", "Sacred Wave", AttackHeight.LOW,
      13, 3, 17, 48, 10, 15, 10, 14,
      { x: 50, y: -25, width: 40, height: 35 },
      { isProjectile: true, projectileSpeed: 6, projectileHeight: AttackHeight.LOW },
    ),
    // S+D — Grace Step: teleport with holy shimmer, invincibility, no damage
    grace_step: special(
      "grace_step", "Grace Step", AttackHeight.MID,
      4, 0, 12, 0, 0, 0, 0, 0,
      { x: 0, y: 0, width: 0, height: 0 },
      { hasInvincibility: true, invincibleStartup: 10 },
    ),
    // Q+D — Heaven Storm: overhead area holy rain
    heaven_storm: special(
      "heaven_storm", "Heaven Storm", AttackHeight.OVERHEAD,
      15, 10, 19, 115, 23, 25, 17, 42,
      { x: 90, y: -200, width: 85, height: 200 },
    ),
    // E+A — Divine Barrier: barrier that reflects, invincibility
    divine_barrier: special(
      "divine_barrier", "Divine Barrier", AttackHeight.MID,
      4, 12, 14, 0, 0, 0, 0, 0,
      { x: 0, y: 0, width: 0, height: 0 },
      { hasInvincibility: true, invincibleStartup: 12 },
    ),
    // E+D — Smite: mid-range holy blast
    smite: special(
      "smite", "Smite", AttackHeight.MID,
      12, 8, 17, 100, 20, 23, 15, 38,
      { x: 110, y: -140, width: 65, height: 140 },
    ),
    // W+S — Prayer Counter: counter stance with invincibility
    prayer_counter: special(
      "prayer_counter", "Prayer Counter", AttackHeight.MID,
      3, 12, 15, 80, 16, 20, 13, 32,
      { x: 18, y: -120, width: 65, height: 80 },
      { hasInvincibility: true, invincibleStartup: 10 },
    ),
  },

  zeals: {
    // Zeal 1 — Divine Grace: wide holy area burst
    divine_grace: zeal(
      "divine_grace", "Divine Grace", AttackHeight.MID,
      8, 6, 22, 140, 28, 26, 16, 48,
      { x: 0, y: -130, width: 550, height: 90 },
    ),
    // Zeal 2 — Cornwall Judgment: launcher, ~270 damage
    cornwall_judgment: zeal(
      "cornwall_judgment", "Cornwall Judgment", AttackHeight.MID,
      15, 10, 28, 270, 54, 36, 22, 72,
      { x: 15, y: -155, width: 180, height: 130 },
      { isLauncher: true },
    ),
  },

  grab: {
    id: "staff_rebuke",
    name: "Staff Rebuke",
    type: "grab",
    height: AttackHeight.MID,
    startup: 6,
    active: 3,
    recovery: 26,
    damage: 75,
    chipDamage: 0,
    hitstun: 26,
    blockstun: 0,
    knockback: 72,
    hitbox: { x: 25, y: -100, width: 55, height: 70 },
  },
};
