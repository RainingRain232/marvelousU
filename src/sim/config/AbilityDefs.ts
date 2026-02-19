// Ability stats, cooldowns, ranges, damage values
import { AbilityType } from "@/types";

export interface AbilityDef {
  type:        AbilityType;
  cooldown:    number;
  range:       number;
  castTime:    number;
  damage:      number;
  maxBounces?: number;
  bounceRange?: number;
  aoeRadius?:  number;
  summonCount?: number;
  /** Seconds of slow to apply on projectile hit (0 = no slow). */
  slowDuration?: number;
  /** Speed multiplier while slowed (e.g. 0.4 = 40% speed). */
  slowFactor?: number;
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
};
