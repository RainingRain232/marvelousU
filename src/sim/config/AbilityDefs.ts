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
    type: AbilityType.FIREBALL,
    cooldown: 5,
    range: 6,
    castTime: 0.5,
    damage: 60,
    aoeRadius: 2,
  },
  [AbilityType.CHAIN_LIGHTNING]: {
    type: AbilityType.CHAIN_LIGHTNING,
    cooldown: 6,
    range: 5,
    castTime: 0.3,
    damage: 40,
    maxBounces: 4,
    bounceRange: 3,
  },
  [AbilityType.WARP]: {
    type: AbilityType.WARP,
    cooldown: 10,
    range: 8,
    castTime: 0.8,
    damage: 0,
  },
  [AbilityType.SUMMON]: {
    type: AbilityType.SUMMON,
    cooldown: 12,
    range: 6,
    castTime: 1.0,
    damage: 0,
    summonCount: 3,
  },
  [AbilityType.FIRE_IMP_SUMMON]: {
    type: AbilityType.FIRE_IMP_SUMMON,
    cooldown: 10,
    range: 4,
    castTime: 0.5,
    damage: 0,
    summonCount: 1,
  },
  [AbilityType.ICE_IMP_SUMMON]: {
    type: AbilityType.ICE_IMP_SUMMON,
    cooldown: 10,
    range: 4,
    castTime: 0.5,
    damage: 0,
    summonCount: 1,
  },
  [AbilityType.LIGHTNING_IMP_SUMMON]: {
    type: AbilityType.LIGHTNING_IMP_SUMMON,
    cooldown: 10,
    range: 4,
    castTime: 0.5,
    damage: 0,
    summonCount: 1,
  },
  [AbilityType.DISTORTION_IMP_SUMMON]: {
    type: AbilityType.DISTORTION_IMP_SUMMON,
    cooldown: 10,
    range: 4,
    castTime: 0.5,
    damage: 0,
    summonCount: 1,
  },
  [AbilityType.FIRE_MASTER_IMP_SUMMON]: {
    type: AbilityType.FIRE_MASTER_IMP_SUMMON,
    cooldown: 10,
    range: 4,
    castTime: 0.5,
    damage: 0,
    summonCount: 2,
  },
  [AbilityType.ICE_MASTER_IMP_SUMMON]: {
    type: AbilityType.ICE_MASTER_IMP_SUMMON,
    cooldown: 10,
    range: 4,
    castTime: 0.5,
    damage: 0,
    summonCount: 2,
  },
  [AbilityType.LIGHTNING_MASTER_IMP_SUMMON]: {
    type: AbilityType.LIGHTNING_MASTER_IMP_SUMMON,
    cooldown: 10,
    range: 4,
    castTime: 0.5,
    damage: 0,
    summonCount: 2,
  },
  [AbilityType.DISTORTION_MASTER_IMP_SUMMON]: {
    type: AbilityType.DISTORTION_MASTER_IMP_SUMMON,
    cooldown: 10,
    range: 4,
    castTime: 0.5,
    damage: 0,
    summonCount: 2,
  },
  [AbilityType.ICE_BALL]: {
    type: AbilityType.ICE_BALL,
    cooldown: 5,
    range: 6,
    castTime: 0.6,
    damage: 25,
    aoeRadius: 2.5,
    slowDuration: 3,
    slowFactor: 0.4,
  },
  // Spider web: wide-ish AoE, strong slow, low damage
  [AbilityType.WEB]: {
    type: AbilityType.WEB,
    cooldown: 4,
    range: 4,
    castTime: 0.4,
    damage: 10,
    aoeRadius: 1.5,
    slowDuration: 4,
    slowFactor: 0.35,
  },
  // Gladiator net: pulling ranged attack, short slow
  [AbilityType.GLADIATOR_NET]: {
    type: AbilityType.GLADIATOR_NET,
    cooldown: 5,
    range: 4,
    castTime: 0.35,
    damage: 15,
    aoeRadius: 1.0,
    slowDuration: 2,
    slowFactor: 0.5,
    pullDistance: 2,
    pullChance: 0.6,
  },
  [AbilityType.DISTORTION_BLAST]: {
    type: AbilityType.DISTORTION_BLAST,
    cooldown: 4,
    range: 5,
    castTime: 0.4,
    damage: 20,
    aoeRadius: 1.5,
    teleportDistance: 3,
  },
  [AbilityType.VOID_DISTORTION]: {
    type: AbilityType.VOID_DISTORTION,
    cooldown: 5,
    range: 4,
    castTime: 0.6,
    damage: 15,
    aoeRadius: 1.0,
    teleportDistance: 2,
  },
  [AbilityType.FAERY_DISTORTION]: {
    type: AbilityType.FAERY_DISTORTION,
    cooldown: 6,
    range: 6,
    castTime: 0.5,
    damage: 35,
    aoeRadius: 1.8,
    teleportDistance: 4,
  },
  [AbilityType.FROG_TONGUE]: {
    type: AbilityType.FROG_TONGUE,
    cooldown: 4,
    range: 7,
    castTime: 0.4,
    damage: 25,
    aoeRadius: 0.8,
    pullDistance: 3,
    pullChance: 0.8,
  },
  [AbilityType.DEVOUR_PULL]: {
    type: AbilityType.DEVOUR_PULL,
    cooldown: 5,
    range: 3,
    castTime: 0.6,
    damage: 40,
    aoeRadius: 1.2,
    pullDistance: 2,
    pullChance: 0.9,
  },
  [AbilityType.FIRE_BREATH]: {
    type: AbilityType.FIRE_BREATH,
    cooldown: 8,
    range: 5,
    castTime: 1.0,
    damage: 80,
    aoeRadius: 3.5,
  },
  [AbilityType.FROST_BREATH]: {
    type: AbilityType.FROST_BREATH,
    cooldown: 8,
    range: 5,
    castTime: 1.0,
    damage: 60,
    aoeRadius: 3.5,
    slowDuration: 4,
    slowFactor: 0.3,
  },
  [AbilityType.HEAL]: {
    type: AbilityType.HEAL,
    cooldown: 4,
    range: 3,
    castTime: 0.8,
    damage: -50, // negative damage = healing
  },
  // Fire Aura: periodic AoE pulse centred on caster
  [AbilityType.FIRE_AURA]: {
    type: AbilityType.FIRE_AURA,
    cooldown: 5,
    range: 0, // self-centred
    castTime: 0, // instant
    damage: 10,
    aoeRadius: 2.5,
  },
  // Ice Aura: periodic AoE pulse centred on caster with slow
  [AbilityType.ICE_AURA]: {
    type: AbilityType.ICE_AURA,
    cooldown: 5,
    range: 0,
    castTime: 0,
    damage: 10,
    aoeRadius: 2.5,
    slowDuration: 2,
    slowFactor: 0.4,
  },
  // Minor Fire Aura: weaker AoE pulse for T3 minor fire elemental
  [AbilityType.MINOR_FIRE_AURA]: {
    type: AbilityType.MINOR_FIRE_AURA,
    cooldown: 5,
    range: 0,
    castTime: 0,
    damage: 5,
    aoeRadius: 1.5,
  },
  // Minor Ice Aura: weaker AoE pulse with light slow for T3 minor ice elemental
  [AbilityType.MINOR_ICE_AURA]: {
    type: AbilityType.MINOR_ICE_AURA,
    cooldown: 5,
    range: 0,
    castTime: 0,
    damage: 5,
    aoeRadius: 1.5,
    slowDuration: 1.5,
    slowFactor: 0.3,
  },
  // Fisherman net: like gladiator net but weaker damage
  [AbilityType.FISHERMAN_NET]: {
    type: AbilityType.FISHERMAN_NET,
    cooldown: 5,
    range: 4,
    castTime: 0.35,
    damage: 5,
    aoeRadius: 1.0,
    slowDuration: 2,
    slowFactor: 0.5,
    pullDistance: 2,
    pullChance: 0.6,
  },
};
