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
    // W+E — Sacred Descent: holy pillar descends directly overhead — close anti-jump, extreme vertical
    divine_strike: special(
      "divine_strike", "Sacred Descent", AttackHeight.OVERHEAD,
      15, 8, 20, 108, 22, 24, 16, 44,
      { x: 0, y: -232, width: 92, height: 235 },
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
    // Q+D — Heaven's Grace: holy rain descends far across the arena — far zone control
    heaven_storm: special(
      "heaven_storm", "Heaven's Grace", AttackHeight.OVERHEAD,
      14, 10, 20, 118, 24, 25, 17, 42,
      { x: 205, y: -205, width: 165, height: 208 },
    ),
    // E+A — Divine Barrier: barrier that reflects, invincibility
    divine_barrier: special(
      "divine_barrier", "Divine Barrier", AttackHeight.MID,
      4, 12, 14, 0, 0, 0, 0, 0,
      { x: 0, y: 0, width: 0, height: 0 },
      { hasInvincibility: true, invincibleStartup: 12 },
    ),
    // E+D — Divine Judgment: heaven condemns the entire arena — full-screen overhead judgment
    smite: special(
      "smite", "Divine Judgment", AttackHeight.OVERHEAD,
      22, 8, 20, 98, 20, 22, 15, 38,
      { x: 48, y: -208, width: 628, height: 212 },
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
    // Zeal 2 — Cornwall's Awakening: holy eruption directly at Igraine's feet — close-range upward geyser
    cornwall_judgment: zeal(
      "cornwall_judgment", "Cornwall's Awakening", AttackHeight.MID,
      12, 12, 30, 272, 54, 38, 24, 74,
      { x: -32, y: -238, width: 188, height: 248 },
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
