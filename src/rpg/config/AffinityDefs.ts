// Affinity system definitions — bonuses, combo attacks, and milestone dialogue
import type { StatusEffect } from "@rpg/state/RPGState";

// ---------------------------------------------------------------------------
// Affinity thresholds (existing)
// ---------------------------------------------------------------------------

export const AFFINITY_THRESHOLDS = [
  { level: 10, atkBonus: 0.05, defBonus: 0 },
  { level: 25, atkBonus: 0.10, defBonus: 0.05 },
  { level: 50, atkBonus: 0.15, defBonus: 0.10 },
] as const;

export function getAffinityBonus(affinityScore: number): { atkMult: number; defMult: number } {
  let atkMult = 1.0;
  let defMult = 1.0;
  for (const t of AFFINITY_THRESHOLDS) {
    if (affinityScore >= t.level) {
      atkMult = 1.0 + t.atkBonus;
      defMult = 1.0 + t.defBonus;
    }
  }
  return { atkMult, defMult };
}

// ---------------------------------------------------------------------------
// Combo attack system
// ---------------------------------------------------------------------------

/** Minimum affinity level required for combo attacks to trigger. */
export const COMBO_ATTACK_MIN_AFFINITY = 5;

/** Combo trigger chance = affinity * COMBO_CHANCE_PER_LEVEL (capped at 50%). */
export const COMBO_CHANCE_PER_LEVEL = 0.02;
export const COMBO_CHANCE_MAX = 0.50;

export type ComboEffectType = "bonus_damage" | "aoe_strike" | "status_inflict";

export interface ComboAttackDef {
  id: string;
  name: string;
  description: string;
  effect: ComboEffectType;
  /** Damage multiplier applied to the combined ATK of both members (for bonus_damage / aoe_strike). */
  damageMult: number;
  /** If effect is aoe_strike, hits all enemies. */
  hitsAll: boolean;
  /** Optional status effect applied to targets. */
  statusEffect?: Pick<StatusEffect, "type" | "duration" | "magnitude">;
}

/**
 * Pool of combo attacks. When a combo triggers, one is selected based on the pair's
 * combined ability types (with a random fallback).
 */
export const COMBO_ATTACK_DEFS: ComboAttackDef[] = [
  {
    id: "combo_double_strike",
    name: "Double Strike",
    description: "Both allies attack the same target in rapid succession.",
    effect: "bonus_damage",
    damageMult: 1.5,
    hitsAll: false,
  },
  {
    id: "combo_war_cry",
    name: "War Cry",
    description: "A thunderous war cry that damages all enemies.",
    effect: "aoe_strike",
    damageMult: 1.2,
    hitsAll: true,
  },
  {
    id: "combo_venom_slash",
    name: "Venom Slash",
    description: "A coordinated strike that poisons the target.",
    effect: "status_inflict",
    damageMult: 1.3,
    hitsAll: false,
    statusEffect: { type: "poison", duration: 3, magnitude: 8 },
  },
  {
    id: "combo_frozen_assault",
    name: "Frozen Assault",
    description: "A combined attack that slows the target.",
    effect: "status_inflict",
    damageMult: 1.3,
    hitsAll: false,
    statusEffect: { type: "slow", duration: 2, magnitude: 0.5 },
  },
  {
    id: "combo_shield_bash",
    name: "Shield Bash",
    description: "A coordinated bash that stuns the target.",
    effect: "status_inflict",
    damageMult: 1.1,
    hitsAll: false,
    statusEffect: { type: "stun", duration: 1, magnitude: 1 },
  },
];

/**
 * Calculate the combo trigger chance for a pair of party members.
 * Returns 0 if affinity is below the minimum threshold.
 */
export function getComboChance(affinityScore: number): number {
  if (affinityScore < COMBO_ATTACK_MIN_AFFINITY) return 0;
  return Math.min(COMBO_CHANCE_MAX, affinityScore * COMBO_CHANCE_PER_LEVEL);
}

/**
 * Select a combo attack from the pool (random pick, seeded).
 */
export function pickComboAttack(seed: number): ComboAttackDef {
  const idx = Math.abs(seed) % COMBO_ATTACK_DEFS.length;
  return COMBO_ATTACK_DEFS[idx];
}

// ---------------------------------------------------------------------------
// Affinity milestone dialogue
// ---------------------------------------------------------------------------

export const AFFINITY_DIALOGUE_MILESTONES = [5, 10, 15] as const;

/**
 * Generic affinity dialogue lines. The system picks from this pool based on
 * the milestone level. In a full implementation these could be per-character-pair,
 * but for now we use generic templates with placeholder names.
 */
export const AFFINITY_DIALOGUE: Record<number, string[]> = {
  5: [
    "{a} and {b} share a knowing glance after the battle.",
    "\"Not bad out there, {b},\" {a} says with a nod.",
    "{b} tosses {a} a canteen. \"Stay sharp, partner.\"",
  ],
  10: [
    "{a} and {b} sit by the campfire, trading stories of home.",
    "\"I'm glad you're on my side, {a},\" {b} admits quietly.",
    "{a} teaches {b} a fighting technique passed down in their family.",
  ],
  15: [
    "{a} and {b} fight as one, their movements perfectly synchronized.",
    "\"No matter what happens, I've got your back,\" {a} tells {b}.",
    "{b} and {a} make a pact to see this journey through together.",
  ],
};

/**
 * Get a dialogue line for a milestone, with names substituted.
 */
export function getAffinityDialogue(
  milestone: number,
  nameA: string,
  nameB: string,
  seed: number,
): string | null {
  const pool = AFFINITY_DIALOGUE[milestone];
  if (!pool || pool.length === 0) return null;
  const idx = Math.abs(seed) % pool.length;
  return pool[idx].replace(/\{a\}/g, nameA).replace(/\{b\}/g, nameB);
}

// ---------------------------------------------------------------------------
// Affinity level display helpers
// ---------------------------------------------------------------------------

export type AffinityRank = "Strangers" | "Acquaintances" | "Companions" | "Trusted Allies" | "Bonded";

export function getAffinityRank(score: number): AffinityRank {
  if (score >= 15) return "Bonded";
  if (score >= 10) return "Trusted Allies";
  if (score >= 5) return "Companions";
  if (score >= 1) return "Acquaintances";
  return "Strangers";
}
