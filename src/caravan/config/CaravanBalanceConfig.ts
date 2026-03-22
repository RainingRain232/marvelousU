// ---------------------------------------------------------------------------
// Caravan mode balance config
// ---------------------------------------------------------------------------

export const CaravanBalance = {
  // Simulation
  SIM_TICK_MS: 16.667, // 60 ticks/sec

  // Map
  MAP_HEIGHT: 20,          // tiles tall (vertical strip)
  SEGMENT_LENGTH: 80,      // tiles wide per segment
  TOTAL_SEGMENTS: 5,

  // Caravan
  CARAVAN_SPEED: 0.8,      // tiles/sec
  CARAVAN_HP: 400,
  CARAVAN_Y: 10,           // center road y position

  // Player hero
  PLAYER_HP: 120,
  PLAYER_ATK: 15,
  PLAYER_SPEED: 4.0,       // tiles/sec
  PLAYER_RANGE: 1.8,       // tiles
  PLAYER_ATTACK_COOLDOWN: 0.5, // sec
  PLAYER_INVINCIBILITY_TIME: 0.5,

  // Dash
  DASH_DURATION: 0.15,
  DASH_COOLDOWN: 1.2,
  DASH_SPEED: 12,
  DASH_IFRAMES: 0.2,

  // Economy
  START_GOLD: 250,
  KILL_GOLD_BASE: 5,
  KILL_GOLD_PER_SEGMENT: 3,
  SEGMENT_BONUS_GOLD: 120,

  // Encounters
  ENCOUNTER_COOLDOWN_MIN: 2.5,   // seconds between encounters
  ENCOUNTER_COOLDOWN_MAX: 5.5,
  BOSS_SEGMENT_INTERVAL: 2,    // boss every N segments

  // Enemy scaling per segment (linear, not exponential)
  ENEMY_HP_SCALE_BASE: 1.0,
  ENEMY_HP_SCALE_PER_SEGMENT: 0.35,   // +35% per segment
  ENEMY_ATK_SCALE_BASE: 1.0,
  ENEMY_ATK_SCALE_PER_SEGMENT: 0.25,  // +25% per segment
  ENEMY_SPEED_SCALE_PER_SEGMENT: 0.03,
  ENEMY_ATTACK_COOLDOWN: 1.0,

  // Escort
  MAX_ESCORTS: 5,
  ESCORT_LEASH_RANGE: 5,     // max distance from caravan before returning
  ESCORT_ENGAGE_RANGE: 4,    // only chase enemies within this range
  ESCORT_ATTACK_COOLDOWN: 0.8,

  // Town
  HEAL_COST_PER_HP: 0.8,
  PLAYER_HEAL_COST_PER_HP: 0.5,

  // Loot
  LOOT_MAGNET_RANGE: 3.5,
  LOOT_PULL_SPEED: 8,
  LOOT_PICKUP_RANGE: 0.5,

  // Spawn margins
  ENEMY_SPAWN_MARGIN_X: 8, // tiles ahead/behind caravan
  ENEMY_SPAWN_MARGIN_Y: 3, // tiles above/below road

  // Road events
  EVENT_CHANCE_PER_SEGMENT: 0.6, // 60% chance of a road event per segment
  EVENT_PROGRESS_MIN: 0.2,       // earliest progress for event
  EVENT_PROGRESS_MAX: 0.6,       // latest progress for event

  // Player upgrades (per level at towns)
  UPGRADE_ATK_BONUS: 3,
  UPGRADE_HP_BONUS: 15,
  UPGRADE_SPEED_BONUS: 0.2,
  UPGRADE_RANGE_BONUS: 0.2,

  // Cargo
  START_CARGO_SLOTS: 6,
  CARGO_UPGRADE_COST: 200,
  CARGO_UPGRADE_SLOTS: 3,
  MAX_CARGO_SLOTS: 15,

  // Hit flash
  HIT_FLASH_DURATION: 0.15,
  DEATH_ANIM_DURATION: 0.4,
} as const;
