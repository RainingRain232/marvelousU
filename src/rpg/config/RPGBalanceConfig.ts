// RPG mode balance tuning
export const RPGBalance = {
  // Overworld
  OVERWORLD_WIDTH: 192,
  OVERWORLD_HEIGHT: 192,
  OVERWORLD_TILE_SIZE: 32,
  VISION_RADIUS: 7,
  BASE_ENCOUNTER_RATE: 0.08,
  ENCOUNTER_RATE_GROWTH: 0.02,

  // Party
  MAX_PARTY_SIZE: 6,
  BASE_XP_TO_LEVEL: 100,
  XP_SCALE_FACTOR: 1.5,
  LEVEL_STAT_GROWTH: 0.12,
  MAX_LEVEL: 30,

  // Turn-based battle
  DEFEND_DAMAGE_MULT: 0.5,
  CRITICAL_CHANCE: 0.1,
  CRITICAL_MULT: 1.5,
  FLEE_BASE_CHANCE: 0.5,
  FLEE_SPEED_FACTOR: 0.05,
  FLEE_MIN_CHANCE: 0.1,
  FLEE_MAX_CHANCE: 0.9,
  MP_COST_MULTIPLIER: 3,

  // Dungeon
  DUNGEON_TILE_SIZE: 32,
  DUNGEON_SIGHT_RADIUS: 6,
  MIN_ROOM_SIZE: 5,
  MAX_ROOM_SIZE: 11,

  // Economy
  START_GOLD: 100,
  INN_COST: 30,

  // Enemy scaling
  ENEMY_LEVEL_SCALE: 0.15,
  MAX_ENEMY_COUNT: 10,

  // Spell learning
  /** Spells a mage picks per level-up. */
  MAGE_SPELLS_PER_LEVEL: 2,
  /** Spells a healer picks per level-up. */
  HEALER_SPELLS_PER_LEVEL: 1,
  /** Max known spells for mage: base + level. */
  MAGE_MAX_SPELLS_BASE: 3,
  /** Max known spells for healer: base + floor(level/2). */
  HEALER_MAX_SPELLS_BASE: 2,

  // Battle summoning
  /** Max summoned units on the player side (on top of 6 party members). */
  MAX_PLAYER_SUMMONS: 2,
  /** Total enemy slot cap (enemies + enemy summons). */
  MAX_ENEMY_SLOTS: 10,

  // Spell slot limits
  /** Max equipped spells for mage classes. */
  MAGE_MAX_EQUIPPED_SPELLS: 6,
  /** Max equipped spells for healer classes. */
  HEALER_MAX_EQUIPPED_SPELLS: 4,
  /** Max equipped spells for non-caster classes. */
  OTHER_MAX_EQUIPPED_SPELLS: 2,

  // Weather modifiers
  /** Rain: encounter rate multiplier. */
  WEATHER_RAIN_ENCOUNTER_MULT: 1.20,
  /** Rain: fire spell damage multiplier. */
  WEATHER_RAIN_FIRE_MULT: 0.80,
  /** Rain: water/ice spell damage multiplier. */
  WEATHER_RAIN_WATER_MULT: 1.20,
  /** Snow: movement speed multiplier (applied as cost). */
  WEATHER_SNOW_SPEED_MULT: 0.75,
  /** Snow: ice spell damage multiplier. */
  WEATHER_SNOW_ICE_MULT: 1.20,
  /** Fog: vision radius multiplier. */
  WEATHER_FOG_VISION_MULT: 0.50,
  /** Fog: ambush/encounter rate multiplier. */
  WEATHER_FOG_AMBUSH_MULT: 1.30,
} as const;

// ---------------------------------------------------------------------------
// Weather modifier helpers
// ---------------------------------------------------------------------------

export type WeatherType = "clear" | "rain" | "snow" | "fog";

export interface WeatherModifiers {
  encounterRateMult: number;
  visionRadiusMult: number;
  movementSpeedMult: number;
  fireSpellMult: number;
  waterSpellMult: number;
  iceSpellMult: number;
  ambushChanceMult: number;
}

/** Get the full set of weather modifiers for the current weather. */
export function getWeatherModifiers(weather: WeatherType): WeatherModifiers {
  switch (weather) {
    case "rain":
      return {
        encounterRateMult: RPGBalance.WEATHER_RAIN_ENCOUNTER_MULT,
        visionRadiusMult: 1.0,
        movementSpeedMult: 1.0,
        fireSpellMult: RPGBalance.WEATHER_RAIN_FIRE_MULT,
        waterSpellMult: RPGBalance.WEATHER_RAIN_WATER_MULT,
        iceSpellMult: 1.0,
        ambushChanceMult: 1.0,
      };
    case "snow":
      return {
        encounterRateMult: 1.0,
        visionRadiusMult: 1.0,
        movementSpeedMult: RPGBalance.WEATHER_SNOW_SPEED_MULT,
        fireSpellMult: 1.0,
        waterSpellMult: 1.0,
        iceSpellMult: RPGBalance.WEATHER_SNOW_ICE_MULT,
        ambushChanceMult: 1.0,
      };
    case "fog":
      return {
        encounterRateMult: 1.0,
        visionRadiusMult: RPGBalance.WEATHER_FOG_VISION_MULT,
        movementSpeedMult: 1.0,
        fireSpellMult: 1.0,
        waterSpellMult: 1.0,
        iceSpellMult: 1.0,
        ambushChanceMult: RPGBalance.WEATHER_FOG_AMBUSH_MULT,
      };
    case "clear":
    default:
      return {
        encounterRateMult: 1.0,
        visionRadiusMult: 1.0,
        movementSpeedMult: 1.0,
        fireSpellMult: 1.0,
        waterSpellMult: 1.0,
        iceSpellMult: 1.0,
        ambushChanceMult: 1.0,
      };
  }
}
