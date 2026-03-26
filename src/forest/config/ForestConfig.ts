// ---------------------------------------------------------------------------
// Forest of Camelot — balance & world constants
// ---------------------------------------------------------------------------

export const FOREST = {
  // ---- Movement ----
  WALK_SPEED: 7.0,
  SPRINT_SPEED: 12.0,
  TURN_SPEED: 3.5,
  PITCH_SPEED: 2.5,
  GRAVITY: -22.0,
  JUMP_FORCE: 10.0,
  GROUND_DRAG: 0.88,
  AIR_DRAG: 0.97,
  ROOT_TRAVEL_SPEED: 40.0,  // speed when travelling through root network

  // ---- Player ----
  MAX_HP: 120,
  HP_REGEN: 1.0,             // passive regen in spring
  STAMINA_MAX: 100,
  STAMINA_SPRINT_DRAIN: 15.0,
  STAMINA_REGEN: 12.0,

  // ---- Abilities ----
  VINE_SNARE_DAMAGE: 10,
  VINE_SNARE_RADIUS: 6.0,
  VINE_SNARE_DURATION: 3.0,
  VINE_SNARE_COOLDOWN: 8.0,

  THORN_BARRAGE_DAMAGE: 18,
  THORN_BARRAGE_COUNT: 8,
  THORN_BARRAGE_RANGE: 15.0,
  THORN_BARRAGE_COOLDOWN: 5.0,
  THORN_BARRAGE_SPEED: 20.0,

  LEAF_STORM_DAMAGE: 8,
  LEAF_STORM_RADIUS: 10.0,
  LEAF_STORM_DURATION: 4.0,
  LEAF_STORM_COOLDOWN: 12.0,
  LEAF_STORM_TICK: 0.5,

  ROOT_CRUSH_DAMAGE: 45,
  ROOT_CRUSH_RADIUS: 4.0,
  ROOT_CRUSH_COOLDOWN: 15.0,
  ROOT_CRUSH_DELAY: 0.6,

  STAFF_DAMAGE: 15,
  STAFF_RANGE: 3.5,
  STAFF_COOLDOWN: 0.5,

  // Staff combo (3-hit chain)
  STAFF_COMBO_COUNT: 3,
  STAFF_COMBO_WINDOW: 0.8,
  STAFF_COMBO_DAMAGE_MULT: [1.0, 1.3, 2.0],  // multiplier per hit in chain
  STAFF_COMBO_RANGE_BONUS: [0, 0.5, 1.0],     // extra range per chain hit
  STAFF_KNOCKBACK: 3.0,
  STAFF_HEAVY_KNOCKBACK: 8.0,                  // 3rd hit knockback

  // ---- Combo ----
  COMBO_WINDOW: 3.0,
  COMBO_DAMAGE_BONUS: 0.08,
  COMBO_ESSENCE_BONUS: 0.4,
  COMBO_MAX: 12,

  // ---- Great Oak ----
  GREAT_OAK_HP: 400,
  GREAT_OAK_RADIUS: 8.0,
  GREAT_OAK_HEIGHT: 35,
  GREAT_OAK_REGEN_SPRING: 2.0,  // passive HP regen during spring

  // ---- Sacred Groves ----
  GROVE_COUNT: 4,
  GROVE_HP: 150,
  GROVE_RADIUS: 5.0,
  GROVE_SPREAD: 45.0,       // distance from center
  GROVE_HEAL_RANGE: 8.0,    // player heals near purified groves
  GROVE_HEAL_RATE: 3.0,

  // ---- Enemies ----
  ENEMY_SPAWN_RADIUS: 65,
  ENEMY_WALK_SPEED: 3.5,
  ENEMY_ATTACK_RANGE: 2.5,
  ENEMY_ATTACK_COOLDOWN: 1.4,
  ENEMY_OAK_DAMAGE: 4,
  ENEMY_GROVE_DAMAGE: 3,

  // Blightling (basic melee)
  BLIGHTLING_HP: 35,
  BLIGHTLING_DAMAGE: 10,
  BLIGHTLING_SPEED: 5.0,

  // Rot Archer (ranged)
  ROT_ARCHER_HP: 25,
  ROT_ARCHER_DAMAGE: 12,
  ROT_ARCHER_SPEED: 3.0,
  ROT_ARCHER_RANGE: 18.0,
  ROT_ARCHER_ARROW_SPEED: 14.0,
  ROT_ARCHER_FIRE_CD: 3.0,

  // Bark Golem (tank)
  BARK_GOLEM_HP: 200,
  BARK_GOLEM_DAMAGE: 30,
  BARK_GOLEM_SPEED: 2.0,
  BARK_GOLEM_CHARGE_CD: 10.0,
  BARK_GOLEM_CHARGE_SPEED: 10.0,
  BARK_GOLEM_CHARGE_DURATION: 1.2,

  // Shadow Stag (fast, flanker)
  SHADOW_STAG_HP: 50,
  SHADOW_STAG_DAMAGE: 18,
  SHADOW_STAG_SPEED: 9.0,
  SHADOW_STAG_LEAP_CD: 6.0,
  SHADOW_STAG_LEAP_DAMAGE: 25,

  // Blight Mother (boss, spawns minions)
  BLIGHT_MOTHER_HP: 500,
  BLIGHT_MOTHER_DAMAGE: 35,
  BLIGHT_MOTHER_SPEED: 2.5,
  BLIGHT_MOTHER_SLAM_CD: 8.0,
  BLIGHT_MOTHER_SLAM_RADIUS: 8.0,
  BLIGHT_MOTHER_SLAM_DAMAGE: 40,
  BLIGHT_MOTHER_SPAWN_CD: 12.0,

  // Wisp Corruptor (support, heals enemies)
  WISP_CORRUPTOR_HP: 40,
  WISP_CORRUPTOR_DAMAGE: 5,
  WISP_CORRUPTOR_SPEED: 4.0,
  WISP_CORRUPTOR_HEAL_CD: 6.0,
  WISP_CORRUPTOR_HEAL_AMOUNT: 20,
  WISP_CORRUPTOR_HEAL_RANGE: 10.0,
  WISP_CORRUPTOR_KEEP_DIST: 18.0,
  WISP_CORRUPTOR_START_WAVE: 4,

  // Blightling pack behavior
  BLIGHTLING_PACK_RANGE: 5.0,
  BLIGHTLING_PACK_SPEED_BONUS: 0.12,

  // Blight Mother phases
  BLIGHT_MOTHER_PHASE2_HP: 0.5,      // enters phase 2 at 50% HP
  BLIGHT_MOTHER_PHASE3_HP: 0.2,      // enters phase 3 at 20% HP
  BLIGHT_MOTHER_ENRAGE_SPEED: 1.5,
  BLIGHT_MOTHER_ENRAGE_DAMAGE: 1.4,
  BLIGHT_MOTHER_SPIT_CD: 4.0,
  BLIGHT_MOTHER_SPIT_COUNT: 5,
  BLIGHT_MOTHER_SPIT_SPEED: 10.0,
  BLIGHT_MOTHER_SPIT_DAMAGE: 15,

  // ---- Grove Purification ----
  PURIFY_RANGE: 6.0,
  PURIFY_SPEED: 0.2,         // progress per second when standing in range
  PURIFY_COST: 3,             // essence cost to start purifying
  PURIFY_RESTORE_HP: 0.5,     // restore 50% grove max HP on purify

  // ---- Essence & Orbs ----
  ESSENCE_ORB_SPEED: 16.0,
  ESSENCE_ORB_ATTRACT_RANGE: 10.0,
  ESSENCE_ORB_COLLECT_RANGE: 1.5,
  ESSENCE_ORB_LIFE: 8.0,

  HEAL_SAP_CHANCE: 0.3,
  HEAL_SAP_AMOUNT: 20,
  HEAL_SAP_LIFE: 10.0,

  ESSENCE_PER_BLIGHTLING: 1,
  ESSENCE_PER_ROT_ARCHER: 2,
  ESSENCE_PER_BARK_GOLEM: 4,
  ESSENCE_PER_SHADOW_STAG: 3,
  ESSENCE_PER_BLIGHT_MOTHER: 12,
  ESSENCE_PER_WISP_CORRUPTOR: 2,

  // ---- Seasonal Cycle ----
  SPRING_DURATION: 30,
  SUMMER_DURATION: 25,
  AUTUMN_DURATION: 25,
  WINTER_DURATION: 20,
  TRANSITION_DURATION: 4,

  // Season buffs
  SPRING_REGEN_MULT: 2.0,           // double HP regen
  SUMMER_DAMAGE_MULT: 1.3,          // +30% damage
  AUTUMN_ESSENCE_MULT: 1.5,         // +50% essence drops
  WINTER_SLOW_ENEMIES: 0.7,         // enemies 30% slower

  // ---- Wave Modifier Effects ----
  BLOOD_BLIGHT_LIFESTEAL: 0.15,    // enemies heal 15% of damage dealt
  BLOOD_BLIGHT_DAMAGE_MULT: 1.2,
  FROSTBITE_PLAYER_SLOW: 0.8,       // player 20% slower
  FROSTBITE_FREEZE_CHANCE: 0.05,     // 5% chance to freeze player on hit (0.5s stun)
  FROSTBITE_ENEMY_ARMOR: 0.15,       // enemies take 15% less damage
  WILDFIRE_DOT_DAMAGE: 3,            // damage per second to everything
  WILDFIRE_DOT_INTERVAL: 1.0,
  WILDFIRE_GROVE_DAMAGE: 2,          // groves take fire damage
  WILDFIRE_PLAYER_DAMAGE: 2,

  // ---- Waves ----
  WAVE_BASE_ENEMIES: 6,
  WAVE_ENEMY_SCALE: 3,
  BOSS_EVERY_N_WAVES: 5,
  BARK_GOLEM_START_WAVE: 3,
  SHADOW_STAG_START_WAVE: 2,
  SPAWN_INTERVAL: 2.5,
  SPAWN_BATCH_SIZE: 2,
  MODIFIER_START_WAVE: 3,

  // ---- Upgrades ----
  UPGRADE_COST_SCALE: 1.4,

  // ---- Will-o-Wisps (allies) ----
  WISP_ALLY_HP: 60,
  WISP_ALLY_DAMAGE: 12,
  WISP_ALLY_SPEED: 6.0,
  WISP_ALLY_ATTACK_RANGE: 12.0,
  WISP_ALLY_COST: 3,         // essence cost to recruit
  WISP_ALLY_MAX: 3,

  // ---- Root Travel ----
  ROOT_TRAVEL_COOLDOWN: 8.0,
  ROOT_TRAVEL_INVULN: 1.0,   // invulnerable for 1s after emerging

  // ---- Projectiles ----
  PROJECTILE_LIFE: 4.0,

  // ---- Camera ----
  CAMERA_FOLLOW_DIST: 10,
  CAMERA_FOLLOW_HEIGHT: 5,
  CAMERA_LERP: 0.08,
  CAMERA_FOV: 65,

  // ---- World ----
  GROUND_SIZE: 180,
  TREE_COUNT: 120,           // decorative trees
  FOG_DENSITY_BASE: 0.006,
  FOG_DENSITY_WINTER: 0.015,
  FOG_DENSITY_BLIGHT: 0.02,

  // ---- Dodge Roll ----
  DODGE_SPEED: 18.0,
  DODGE_DURATION: 0.3,
  DODGE_COOLDOWN: 1.5,
  DODGE_IFRAMES: 0.35,
  DODGE_STAMINA_COST: 20,

  // ---- Hit Stop ----
  HIT_STOP_CRIT: 0.06,
  HIT_STOP_ROOT_CRUSH: 0.12,
  HIT_STOP_SCALE: 0.1,

  // ---- Death Sequence ----
  DEATH_SLOW_MO_DURATION: 1.5,
  DEATH_SLOW_MO_SCALE: 0.15,

  // ---- Kill Streaks ----
  STREAK_THRESHOLDS: [5, 10, 20, 35],
  STREAK_REWARDS: [2, 5, 10, 20],   // bonus essence
  STREAK_WINDOW: 8.0,                // seconds

  // ---- Corruption ----
  CORRUPTION_PER_WAVE: 0.05,     // +5% per wave
  CORRUPTION_DECAY_PURIFY: 0.15, // purifying a grove reduces corruption
  CORRUPTION_ENEMY_BUFF: 0.15,   // enemies get 15% stronger per 0.1 corruption

  // ---- Difficulty ----
  DIFFICULTY: {
    easy:      { enemyHp: 0.7, enemyDmg: 0.6, enemyCount: 0.7, essenceMult: 1.3, oakHp: 1.5 },
    normal:    { enemyHp: 1.0, enemyDmg: 1.0, enemyCount: 1.0, essenceMult: 1.0, oakHp: 1.0 },
    hard:      { enemyHp: 1.3, enemyDmg: 1.3, enemyCount: 1.2, essenceMult: 0.9, oakHp: 0.8 },
    nightmare: { enemyHp: 1.7, enemyDmg: 1.6, enemyCount: 1.5, essenceMult: 0.7, oakHp: 1.0 },
  } as Record<string, { enemyHp: number; enemyDmg: number; enemyCount: number; essenceMult: number; oakHp: number }>,

  // ---- Sim ----
  SIM_TICK_MS: 16,
};
