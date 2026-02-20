// Ability stats, cooldowns, ranges, damage values
import { AbilityType } from "@/types";

export interface AbilityDef {
  type: AbilityType;
  cooldown: number;
  range: number;
  castTime: number;
  damage: number;
  maxBounces?: number;
  bounceRange?: number;
  aoeRadius?: number;
  summonCount?: number;
  /** Seconds of slow to apply on projectile hit (0 = no slow). */
  slowDuration?: number;
  /** Speed multiplier while slowed (e.g. 0.4 = 40% speed). */
  slowFactor?: number;
  /** Max distance for teleport-on-hit effect. 0 = no teleport. */
  teleportDistance?: number;
  /** Max distance for pull-towards-origin effect. 0 = no pull. */
  pullDistance?: number;
  /** Chance (0-1) to apply the pull effect. */
  pullChance?: number;
}

export const ABILITY_DEFINITIONS: Record<AbilityType, AbilityDef> = {
  [AbilityType.FIREBALL]: {
    type: AbilityType.FIREBALL, cooldown: 5, range: 6, castTime: 0.5,
    damage: 60, aoeRadius: 2,
  },
  [AbilityType.CHAIN_LIGHTNING]: {
    type: AbilityType.CHAIN_LIGHTNING, cooldown: 6, range: 5, castTime: 0.3,
    damage: 40, maxBounces: 4, bounceRange: 3,
  },
  [AbilityType.WARP]: {
    type: AbilityType.WARP, cooldown: 10, range: 8, castTime: 0.8,
    damage: 0,
  },
  [AbilityType.SUMMON]: {
    type: AbilityType.SUMMON, cooldown: 12, range: 6, castTime: 1.0,
    damage: 0, summonCount: 3,
  },
  [AbilityType.ICE_BALL]: {
    type: AbilityType.ICE_BALL, cooldown: 5, range: 6, castTime: 0.6,
    damage: 25, aoeRadius: 2.5, slowDuration: 3, slowFactor: 0.4,
  },
  // Spider web: wide-ish AoE, strong slow, low damage
  [AbilityType.WEB]: {
    type: AbilityType.WEB, cooldown: 4, range: 4, castTime: 0.4,
    damage: 10, aoeRadius: 1.5, slowDuration: 4, slowFactor: 0.35,
  },
  // Gladiator net: pulling ranged attack, short slow
  [AbilityType.GLADIATOR_NET]: {
    type: AbilityType.GLADIATOR_NET, cooldown: 5, range: 4, castTime: 0.35,
    damage: 15, aoeRadius: 1.0, slowDuration: 2, slowFactor: 0.5,
    pullDistance: 2, pullChance: 0.6,
  },
  [AbilityType.DISTORTION_BLAST]: {
    type: AbilityType.DISTORTION_BLAST, cooldown: 4, range: 5, castTime: 0.4,
    damage: 20, aoeRadius: 1.5, teleportDistance: 3,
  },
  [AbilityType.VOID_DISTORTION]: {
    type: AbilityType.VOID_DISTORTION, cooldown: 5, range: 4, castTime: 0.6,
    damage: 15, aoeRadius: 1.0, teleportDistance: 2,
  },
  [AbilityType.FAERY_DISTORTION]: {
    type: AbilityType.FAERY_DISTORTION, cooldown: 6, range: 6, castTime: 0.5,
    damage: 35, aoeRadius: 1.8, teleportDistance: 4,
  },
};
