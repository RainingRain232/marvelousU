// ---------------------------------------------------------------------------
// Shadowhand mode — balance & configuration
// ---------------------------------------------------------------------------

export type ShadowhandDifficulty = "apprentice" | "journeyman" | "master";

export const ShadowhandConfig = {
  // Grid / map
  TILE_SIZE: 32,
  MIN_ROOM_SIZE: 4,
  MAX_ROOM_SIZE: 10,
  MIN_ROOMS: 6,
  MAX_ROOMS: 14,
  CORRIDOR_WIDTH: 2,

  // Vision & stealth
  GUARD_VISION_RANGE: 5,
  GUARD_VISION_ANGLE: Math.PI / 3, // 60 degrees half-angle
  GUARD_PERIPHERAL_RANGE: 2,
  SHADOW_DETECTION_MULT: 0.3, // harder to spot in shadow
  MOVING_DETECTION_MULT: 1.5, // easier to spot when moving
  CROUCHING_SPEED_MULT: 0.5,

  // Noise
  NOISE_WALK: 1.5,
  NOISE_RUN: 4.0,
  NOISE_CROUCH: 0.5,
  NOISE_LOCKPICK: 2.0,
  NOISE_BREAK_LOCK: 6.0,
  NOISE_COMBAT: 8.0,
  NOISE_DECAY_RATE: 2.0, // per second
  NOISE_ALERT_THRESHOLD: 3.0,

  // Alert
  ALERT_SUSPICIOUS_THRESHOLD: 30,
  ALERT_ALARMED_THRESHOLD: 70,
  ALERT_DECAY_RATE: 5, // per second when not seeing anything
  ALERT_LOCKDOWN_TIMER: 60, // seconds before alarm cools
  REINFORCEMENT_DELAY: 10, // seconds after alarm before reinforcements

  // Crew
  MAX_CREW_SIZE: 4,
  CREW_BASE_HP: 100,
  CREW_BASE_SPEED: 80, // pixels/sec
  TAKEDOWN_RANGE: 1.2, // tiles
  TAKEDOWN_TIME: 1.5, // seconds
  PICKUP_RANGE: 1.0,

  // Economy
  STARTING_GOLD: 200,
  FENCE_CUT: 0.7, // fence pays 70% of loot value
  INTEL_COST_MULT: 0.15, // intel costs 15% of target value
  HEAT_PER_HEIST: 15,
  HEAT_DECAY_PER_DAY: 5,
  MAX_HEAT: 100,
  INQUISITOR_HEAT_THRESHOLD: 70,

  // Scoring
  SCORE_PER_LOOT_GOLD: 1,
  SCORE_STEALTH_BONUS: 200, // no alerts triggered
  SCORE_GHOST_BONUS: 500, // no one even suspicious
  SCORE_SPEED_BONUS_THRESHOLD: 120, // seconds — bonus if under this
  SCORE_SPEED_BONUS: 150,
  SCORE_CREW_ALIVE_BONUS: 100, // per surviving crew

  // Difficulty multipliers
  DIFFICULTY_APPRENTICE: {
    label: "Apprentice",
    guardVisionMult: 0.7,
    alertMult: 0.7,
    lootMult: 1.3,
    guardCountMult: 0.7,
    heatMult: 0.7,
  },
  DIFFICULTY_JOURNEYMAN: {
    label: "Journeyman",
    guardVisionMult: 1.0,
    alertMult: 1.0,
    lootMult: 1.0,
    guardCountMult: 1.0,
    heatMult: 1.0,
  },
  DIFFICULTY_MASTER: {
    label: "Master",
    guardVisionMult: 1.3,
    alertMult: 1.4,
    lootMult: 0.8,
    guardCountMult: 1.4,
    heatMult: 1.4,
  },

  // Light
  TORCH_RADIUS: 3.5,
  MOONLIGHT_ALPHA: 0.15,
  WINDOW_LIGHT_RADIUS: 2.5,

  // Tier thresholds (reputation needed)
  TIER_THRESHOLDS: [0, 300, 800, 1800, 4000],
} as const;

export function getDifficulty(d: ShadowhandDifficulty) {
  if (d === "apprentice") return ShadowhandConfig.DIFFICULTY_APPRENTICE;
  if (d === "master") return ShadowhandConfig.DIFFICULTY_MASTER;
  return ShadowhandConfig.DIFFICULTY_JOURNEYMAN;
}
