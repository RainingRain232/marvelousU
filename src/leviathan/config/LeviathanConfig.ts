// ---------------------------------------------------------------------------
// Leviathan — The Deep Descent — balance & world constants
// ---------------------------------------------------------------------------

export const LEVIATHAN = {
  // ---- Movement ----
  SWIM_SPEED: 6.0,
  SPRINT_SWIM_SPEED: 10.0,
  TURN_SPEED: 3.0,
  PITCH_SPEED: 2.5,
  WATER_DRAG: 0.92,
  VERTICAL_SPEED: 4.0,         // ascend/descend speed
  CURRENT_FORCE: 2.0,          // underwater current push strength

  // ---- Player ----
  MAX_HP: 100,
  HP_REGEN: 0.3,
  STAMINA_MAX: 100,
  STAMINA_SPRINT_DRAIN: 12.0,
  STAMINA_REGEN: 10.0,

  // ---- Oxygen ----
  OXYGEN_MAX: 100,
  OXYGEN_DRAIN_RATE: 2.0,       // per second at surface depth
  OXYGEN_DEPTH_MULT: 0.015,     // additional drain per depth unit
  OXYGEN_REFILL_RATE: 25.0,     // refill rate at air pockets
  OXYGEN_DAMAGE_RATE: 15.0,     // HP damage per second when out of oxygen
  AIR_POCKET_RADIUS: 5.0,

  // ---- Depth Pressure ----
  DEPTH_LEVELS: 5,              // number of depth zones
  DEPTH_ZONE_SIZE: 30,          // units per zone
  PRESSURE_SPEED_PENALTY: 0.06, // -6% speed per depth level
  PRESSURE_DAMAGE_BONUS: 0.12,  // +12% damage per depth level
  PRESSURE_LOOT_BONUS: 0.15,    // +15% loot per depth level

  // ---- Abilities ----
  // Trident Thrust (melee)
  TRIDENT_DAMAGE: 18,
  TRIDENT_RANGE: 4.0,
  TRIDENT_COOLDOWN: 0.55,
  TRIDENT_COMBO_COUNT: 3,
  TRIDENT_COMBO_WINDOW: 0.9,
  TRIDENT_COMBO_MULT: [1.0, 1.3, 2.0],
  TRIDENT_KNOCKBACK: 4.0,
  TRIDENT_HEAVY_KNOCKBACK: 10.0,

  // Harpoon Shot (ranged)
  HARPOON_DAMAGE: 25,
  HARPOON_SPEED: 18.0,
  HARPOON_COOLDOWN: 3.0,
  HARPOON_RANGE: 30.0,
  HARPOON_PIERCE: false,

  // Sonar Pulse (reveals hidden enemies + stuns)
  SONAR_RADIUS: 20.0,
  SONAR_COOLDOWN: 8.0,
  SONAR_STUN_DURATION: 1.5,
  SONAR_REVEAL_DURATION: 5.0,

  // Pressure Wave (AoE knockback + damage)
  PRESSURE_WAVE_DAMAGE: 30,
  PRESSURE_WAVE_RADIUS: 10.0,
  PRESSURE_WAVE_COOLDOWN: 14.0,
  PRESSURE_WAVE_KNOCKBACK: 12.0,

  // Lantern Flare (blinds enemies, lights area)
  LANTERN_FLARE_RADIUS: 15.0,
  LANTERN_FLARE_DURATION: 4.0,
  LANTERN_FLARE_COOLDOWN: 18.0,
  LANTERN_FLARE_STUN: 2.0,

  // Dash (current ride)
  DASH_SPEED: 16.0,
  DASH_DURATION: 0.3,
  DASH_COOLDOWN: 2.0,
  DASH_IFRAMES: 0.35,
  DASH_STAMINA_COST: 16,

  // ---- Lantern ----
  LANTERN_RANGE: 12.0,          // base visibility range
  LANTERN_FLICKER_AMP: 1.5,

  // ---- Cathedral ----
  CATHEDRAL_WIDTH: 60,
  CATHEDRAL_LENGTH: 200,        // long corridor descending
  MAX_DEPTH: 150,               // deepest point

  // ---- Excalibur Fragments ----
  FRAGMENT_COUNT: 7,            // total fragments to collect
  FRAGMENT_GLOW_RANGE: 15.0,
  FRAGMENT_COLLECT_RANGE: 3.0,

  // ---- Air Pockets ----
  AIR_POCKET_COUNT: 8,

  // ---- Enemies ----
  ENEMY_SPAWN_RADIUS: 25,
  ENEMY_AGGRO_RANGE: 15.0,      // enemies only attack when close (dark = safe)

  // Angler Fish (basic — lures with light, bites)
  ANGLER_HP: 35,
  ANGLER_DAMAGE: 12,
  ANGLER_SPEED: 4.0,
  ANGLER_LURE_RANGE: 18.0,

  // Jellyfish Swarm (area denial — drifts, shocks on contact)
  JELLYFISH_HP: 15,
  JELLYFISH_DAMAGE: 8,
  JELLYFISH_SPEED: 1.5,
  JELLYFISH_SHOCK_RADIUS: 3.0,
  JELLYFISH_SHOCK_CD: 2.0,

  // Coral Golem (tank — slow, heavy, armored)
  CORAL_GOLEM_HP: 200,
  CORAL_GOLEM_DAMAGE: 30,
  CORAL_GOLEM_SPEED: 1.5,
  CORAL_GOLEM_SLAM_CD: 7.0,
  CORAL_GOLEM_SLAM_RADIUS: 6.0,
  CORAL_GOLEM_SLAM_DAMAGE: 35,

  // Kraken Tentacle (stationary — grabs, squeezes)
  TENTACLE_HP: 80,
  TENTACLE_DAMAGE: 5,           // per second while grabbed
  TENTACLE_GRAB_RANGE: 8.0,
  TENTACLE_GRAB_DURATION: 3.0,

  // Siren Shade (ranged — hypnotic projectiles)
  SIREN_HP: 40,
  SIREN_DAMAGE: 15,
  SIREN_SPEED: 3.5,
  SIREN_RANGE: 22.0,
  SIREN_SHOT_SPEED: 10.0,
  SIREN_FIRE_CD: 3.0,

  // Abyssal Knight (boss — fallen Arthurian knight, corrupted by the deep)
  ABYSSAL_KNIGHT_HP: 500,
  ABYSSAL_KNIGHT_DAMAGE: 35,
  ABYSSAL_KNIGHT_SPEED: 3.0,
  ABYSSAL_KNIGHT_SLAM_CD: 6.0,
  ABYSSAL_KNIGHT_SLAM_RADIUS: 8.0,
  ABYSSAL_KNIGHT_SLAM_DAMAGE: 45,
  ABYSSAL_KNIGHT_CHARGE_CD: 10.0,
  ABYSSAL_KNIGHT_CHARGE_SPEED: 14.0,
  ABYSSAL_KNIGHT_CHARGE_DURATION: 1.2,
  ABYSSAL_KNIGHT_PHASE2_HP: 0.5,
  ABYSSAL_KNIGHT_PHASE3_HP: 0.2,
  ABYSSAL_KNIGHT_ENRAGE_SPEED: 1.4,
  ABYSSAL_KNIGHT_ENRAGE_DAMAGE: 1.3,
  ABYSSAL_KNIGHT_SPAWN_CD: 12.0,

  // ---- Loot ----
  RELIC_SHARD_CHANCE: 0.35,
  RELIC_SHARD_HP_RESTORE: 15,
  RELIC_SHARD_OXYGEN_RESTORE: 15,

  // ---- Underwater Currents ----
  CURRENT_COUNT: 6,
  CURRENT_WIDTH: 8,
  CURRENT_SPEED_BOOST: 2.0,

  // ---- Upgrades ----
  UPGRADE_COST_SCALE: 1.3,

  // ---- Camera ----
  CAMERA_FOLLOW_DIST: 8,
  CAMERA_FOLLOW_HEIGHT: 3,
  CAMERA_LERP: 0.1,
  CAMERA_FOV: 70,

  // ---- World ----
  PILLAR_COUNT: 20,             // decorative cathedral pillars
  CORAL_COUNT: 40,
  RUIN_COUNT: 15,

  // ---- Hit Effects ----
  HIT_STOP_CRIT: 0.06,
  HIT_STOP_SCALE: 0.1,
  DEATH_SLOW_MO_DURATION: 1.5,
  DEATH_SLOW_MO_SCALE: 0.15,

  // ---- Combo ----
  COMBO_WINDOW: 3.0,
  COMBO_DAMAGE_BONUS: 0.05,
  COMBO_MAX: 20,

  // ---- Environmental Hazards ----
  VENT_DAMAGE_TICK: 0.5,          // damage every 0.5s in vent
  VENT_PULSE_PERIOD: 3.0,         // vents pulse on/off
  MINE_TRIGGER_RADIUS: 2.5,
  MINE_EXPLOSION_RADIUS: 5.0,
  MINE_REARM_TIME: 15.0,
  POISON_CLOUD_DAMAGE: 3,         // per second
  POISON_CLOUD_DURATION: 8.0,
  POISON_CLOUD_RADIUS: 4.0,

  // ---- Charged Heavy Attack ----
  HEAVY_ATTACK_CHARGE_TIME: 0.8,  // hold LMB for 0.8s
  HEAVY_ATTACK_DAMAGE_MULT: 3.0,
  HEAVY_ATTACK_RANGE: 5.0,
  HEAVY_ATTACK_KNOCKBACK: 15.0,
  HEAVY_ATTACK_STUN: 2.0,

  // ---- Escape ----
  ESCAPE_TIME_LIMIT: 60,          // seconds to reach surface
  ESCAPE_BOSS_CHASE_SPEED: 5.0,   // boss pursuit speed during escape

  // ---- Fragment Milestones ----
  MILESTONE_3_HEAL: 0.5,          // restore 50% HP
  MILESTONE_5_ABILITY_BOOST: 0.3, // all CDs reduced 30% permanently

  // ---- Ability Synergies ----
  SONAR_AFTER_FLARE_BONUS: 2.0,   // sonar stun 2x if used within 3s of flare
  HARPOON_FROZEN_BONUS: 1.5,      // harpoon deals 1.5x to stunned enemies

  // ---- Sim ----
  SIM_TICK_MS: 16,
};
