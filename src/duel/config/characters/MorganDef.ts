// ---------------------------------------------------------------------------
// Duel mode – Morgan le Fay (The Fay Enchantress) character definition
// Dark mage archetype: staff/dark magic attacks, illusions, curses
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
// MORGAN LE FAY — Dark Mage
// ===========================================================================

export const MORGAN_DEF: DuelCharacterDef = {
  id: "morgan",
  name: "Morgan le Fay",
  title: "The Fay Enchantress",
  portrait: "morgan",
  fighterType: "mage",
  maxHp: 880,
  walkSpeed: 4.8,
  backWalkSpeed: 3.6,
  jumpVelocity: -19,
  jumpForwardSpeed: 5.5,
  weight: 0.85,

  normals: {
    // Q — Light high: quick staff jab with dark energy tip
    light_high: normal(
      "light_high", "Shadow Jab", AttackHeight.HIGH,
      5, 3, 7, 24, 11, 7, 6,
      { x: 40, y: -120, width: 72, height: 30 },
    ),
    // W — Medium high: horizontal dark staff swing
    med_high: normal(
      "med_high", "Dark Swing", AttackHeight.HIGH,
      9, 4, 12, 48, 16, 11, 18,
      { x: 35, y: -110, width: 88, height: 38 },
    ),
    // E — Heavy high: overhead staff slam with shadow burst
    heavy_high: normal(
      "heavy_high", "Shadow Slam", AttackHeight.HIGH,
      14, 5, 18, 82, 22, 15, 36,
      { x: 25, y: -130, width: 78, height: 60 },
    ),
    // A — Light low: quick low staff poke
    light_low: normal(
      "light_low", "Low Hex", AttackHeight.LOW,
      5, 3, 8, 20, 9, 6, 5,
      { x: 38, y: -25, width: 62, height: 30 },
    ),
    // S — Medium low: crouching dark sweep
    med_low: normal(
      "med_low", "Dark Sweep", AttackHeight.LOW,
      10, 4, 14, 44, 14, 10, 14,
      { x: 30, y: -30, width: 84, height: 38 },
    ),
    // D — Heavy low: shadow eruption from ground — launcher
    heavy_low: normal(
      "heavy_low", "Shadow Eruption", AttackHeight.LOW,
      16, 5, 20, 68, 0, 14, 26,
      { x: 20, y: -18, width: 88, height: 35 },
      { isLauncher: true },
    ),
  },

  specials: {
    // Q+W — Shadow Bolt: dark ball projectile
    shadow_bolt: special(
      "shadow_bolt", "Shadow Bolt", AttackHeight.MID,
      12, 3, 16, 58, 12, 18, 12, 22,
      { x: 50, y: -100, width: 35, height: 35 },
      { isProjectile: true, projectileSpeed: 9, projectileHeight: AttackHeight.MID },
    ),
    // W+E — Curse Mark: curse drops directly on Morgan — rewards aggressive close pressure
    hex_strike: special(
      "hex_strike", "Curse Mark", AttackHeight.OVERHEAD,
      16, 6, 20, 98, 20, 24, 16, 40,
      { x: -12, y: -188, width: 105, height: 192 },
    ),
    // A+S — Dark Wave: low shadow wave projectile along the ground
    dark_wave: special(
      "dark_wave", "Dark Wave", AttackHeight.LOW,
      14, 3, 18, 48, 10, 16, 10, 14,
      { x: 50, y: -25, width: 40, height: 35 },
      { isProjectile: true, projectileSpeed: 6, projectileHeight: AttackHeight.LOW },
    ),
    // S+D — Shadow Step: teleport with invincibility, no damage
    shadow_step: special(
      "shadow_step", "Shadow Step", AttackHeight.MID,
      4, 0, 12, 0, 0, 0, 0, 0,
      { x: 0, y: 0, width: 0, height: 0 },
      { hasInvincibility: true, invincibleStartup: 10 },
    ),
    // Q+D — Doom Cloud: massive overhead shroud covering close-to-mid range
    curse_storm: special(
      "curse_storm", "Doom Cloud", AttackHeight.OVERHEAD,
      14, 10, 22, 118, 24, 26, 18, 38,
      { x: 0, y: -205, width: 205, height: 208 },
    ),
    // E+A — Fay Barrier: counter/reflect stance with invincibility
    fay_barrier: special(
      "fay_barrier", "Fay Barrier", AttackHeight.MID,
      4, 12, 14, 0, 0, 0, 0, 0,
      { x: 0, y: 0, width: 0, height: 0 },
      { hasInvincibility: true, invincibleStartup: 12 },
    ),
    // E+D — Soul Shatter: close-range implosion of dark energy — high damage, must be close
    soul_drain: special(
      "soul_drain", "Soul Shatter", AttackHeight.MID,
      8, 8, 22, 115, 23, 26, 18, 45,
      { x: -8, y: -168, width: 82, height: 168 },
    ),
    // W+S — Dark Counter: counter stance with invincibility burst
    dark_counter: special(
      "dark_counter", "Dark Counter", AttackHeight.MID,
      4, 14, 12, 72, 14, 20, 12, 28,
      { x: 20, y: -120, width: 60, height: 80 },
      { hasInvincibility: true, invincibleStartup: 10 },
    ),
  },

  zeals: {
    // Zeal 1 — Calamity Hex: dark energy erupts all around Morgan — circular 360 range
    shadow_apocalypse: zeal(
      "shadow_apocalypse", "Calamity Hex", AttackHeight.MID,
      6, 8, 24, 128, 26, 26, 16, 44,
      { x: -58, y: -168, width: 228, height: 180 },
    ),
    // Zeal 2 — Eclipse Convergence: darkness descends from above in a massive pillar
    fay_eclipse: zeal(
      "fay_eclipse", "Eclipse Convergence", AttackHeight.MID,
      14, 12, 32, 282, 56, 40, 24, 70,
      { x: 0, y: -265, width: 105, height: 268 },
      { isLauncher: true },
    ),
  },

  grab: {
    id: "soul_grip",
    name: "Soul Grip",
    type: "grab",
    height: AttackHeight.MID,
    startup: 6,
    active: 3,
    recovery: 28,
    damage: 78,
    chipDamage: 0,
    hitstun: 28,
    blockstun: 0,
    knockback: 72,
    hitbox: { x: 25, y: -100, width: 55, height: 70 },
  },
};
