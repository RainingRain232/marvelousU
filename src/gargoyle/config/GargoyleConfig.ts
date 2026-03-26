// ---------------------------------------------------------------------------
// Gargoyle: Cathedral Guardian — balance & world constants
// ---------------------------------------------------------------------------

export const GARG = {
  // ---- Movement ----
  FLY_SPEED: 12.0,
  SPRINT_FLY_SPEED: 20.0,
  DIVE_SPEED: 35.0,
  TURN_SPEED: 3.5,
  PITCH_SPEED: 2.5,
  GRAVITY: -18.0,
  LIFT_FORCE: 22.0,
  GROUND_DRAG: 0.92,
  AIR_DRAG: 0.98,
  PERCH_SNAP_DIST: 3.5,

  // ---- Player ----
  MAX_HP: 150,
  HP_REGEN_PERCHED: 3.0,
  STAMINA_MAX: 100,
  STAMINA_FLY_DRAIN: 8.0,
  STAMINA_SPRINT_DRAIN: 20.0,
  STAMINA_REGEN: 15.0,
  STONE_ARMOR: 0.3,

  // ---- Abilities ----
  DIVE_BOMB_DAMAGE: 60,
  DIVE_BOMB_RADIUS: 5.0,
  DIVE_BOMB_COOLDOWN: 6.0,
  DIVE_BOMB_SCREEN_SHAKE: 0.6,

  STONE_BREATH_DAMAGE: 15,
  STONE_BREATH_RANGE: 8.0,
  STONE_BREATH_ANGLE: 0.6,
  STONE_BREATH_DURATION: 2.0,
  STONE_BREATH_COOLDOWN: 8.0,

  WING_GUST_FORCE: 15.0,
  WING_GUST_RANGE: 6.0,
  WING_GUST_COOLDOWN: 4.0,

  TALON_DAMAGE: 25,
  TALON_RANGE: 3.0,
  TALON_COOLDOWN: 0.6,

  // Consecrate: holy AoE around cathedral
  CONSECRATE_DAMAGE: 35,
  CONSECRATE_RADIUS: 18.0,
  CONSECRATE_COOLDOWN: 25.0,
  CONSECRATE_HEAL: 15,         // cathedral heal

  // ---- Combo ----
  COMBO_WINDOW: 3.0,
  COMBO_SOUL_BONUS: 0.5,
  COMBO_DAMAGE_BONUS: 0.1,
  COMBO_MAX: 10,

  // ---- Cathedral ----
  CATHEDRAL_HP: 500,
  CATHEDRAL_WIDTH: 24,
  CATHEDRAL_LENGTH: 40,
  CATHEDRAL_HEIGHT: 30,
  TOWER_HEIGHT: 45,
  SPIRE_HEIGHT: 55,
  PERCH_POINTS: 12,
  CATHEDRAL_COLLISION_PAD: 1.5,  // player collision padding

  // ---- Demons ----
  DEMON_SPAWN_RADIUS: 60,
  DEMON_CLIMB_SPEED: 1.5,
  DEMON_WALK_SPEED: 4.0,
  DEMON_ATTACK_RANGE: 2.5,
  DEMON_ATTACK_COOLDOWN: 1.2,
  DEMON_CATHEDRAL_DAMAGE: 5,

  IMP_HP: 30,
  IMP_DAMAGE: 8,
  IMP_SPEED: 6.0,
  IMP_PACK_RANGE: 5.0,          // range to count pack members
  IMP_PACK_SPEED_BONUS: 0.15,   // +15% speed per nearby imp (max 3)

  FIEND_HP: 60,
  FIEND_DAMAGE: 15,
  FIEND_SPEED: 4.0,
  FIEND_FIREBALL_CD: 5.0,
  FIEND_FIREBALL_RANGE: 20.0,
  FIEND_FIREBALL_SPEED: 12.0,
  FIEND_FIREBALL_DAMAGE: 10,
  FIEND_FIREBALL_MIN_HEIGHT: 5.0,  // only shoot at airborne player

  BRUTE_HP: 150,
  BRUTE_DAMAGE: 30,
  BRUTE_SPEED: 2.5,
  BRUTE_CHARGE_CD: 10.0,
  BRUTE_CHARGE_SPEED: 12.0,
  BRUTE_CHARGE_DAMAGE_MULT: 3,   // 3x cathedral damage on charge hit
  BRUTE_CHARGE_DURATION: 1.5,

  WRAITH_HP: 40,
  WRAITH_DAMAGE: 12,
  WRAITH_SPEED: 8.0,

  HELLION_HP: 400,
  HELLION_DAMAGE: 50,
  HELLION_SPEED: 3.0,
  HELLION_SLAM_CD: 8.0,
  HELLION_SLAM_RADIUS: 10.0,
  HELLION_SLAM_DAMAGE: 40,
  HELLION_FIRE_CD: 12.0,
  HELLION_FIRE_RANGE: 15.0,
  HELLION_FIRE_DAMAGE: 20,

  // Necromancer: ranged support demon
  NECRO_HP: 70,
  NECRO_DAMAGE: 5,
  NECRO_SPEED: 3.0,
  NECRO_RESURRECT_CD: 8.0,
  NECRO_RESURRECT_RANGE: 12.0,
  NECRO_RESURRECT_HP_MULT: 0.4,  // resurrected demons have 40% HP
  NECRO_KEEP_DISTANCE: 20.0,     // stays away from cathedral
  NECRO_START_WAVE: 5,

  // ---- Health Orbs ----
  HEALTH_ORB_CHANCE_BRUTE: 0.5,
  HEALTH_ORB_CHANCE_HELLION: 1.0,
  HEALTH_ORB_HEAL: 25,
  HEALTH_ORB_LIFE: 10.0,

  // ---- Day/Night Cycle ----
  NIGHT_DURATION: 90,
  DAWN_DURATION: 8,
  DAY_DURATION: 15,
  DUSK_DURATION: 5,
  DAWN_SLOW_FACTOR: 0.4,        // at end of dawn, player moves at 40% speed

  // ---- Waves ----
  WAVE_BASE_DEMONS: 8,
  WAVE_DEMON_SCALE: 4,
  BOSS_EVERY_N_WAVES: 5,
  WRAITH_START_WAVE: 3,
  BRUTE_START_WAVE: 2,
  SPAWN_INTERVAL: 2.0,
  SPAWN_BATCH_SIZE: 3,
  MODIFIER_START_WAVE: 3,       // wave modifiers begin

  // ---- Upgrades ----
  SOUL_PER_IMP: 1,
  SOUL_PER_FIEND: 2,
  SOUL_PER_BRUTE: 4,
  SOUL_PER_WRAITH: 3,
  SOUL_PER_HELLION: 10,
  UPGRADE_COST_SCALE: 1.5,      // each level costs 1.5x more

  // ---- Soul Magnet ----
  SOUL_ORB_SPEED: 18.0,
  SOUL_ORB_ATTRACT_RANGE: 12.0,
  SOUL_ORB_COLLECT_RANGE: 1.5,
  SOUL_ORB_LIFE: 8.0,

  // ---- Projectiles ----
  PROJECTILE_LIFE: 4.0,

  // ---- Camera ----
  CAMERA_FOLLOW_DIST: 8,
  CAMERA_FOLLOW_HEIGHT: 4,
  CAMERA_LERP: 0.08,
  CAMERA_FOV: 70,

  // ---- World ----
  GROUND_SIZE: 200,
  FOG_DENSITY_NIGHT: 0.008,
  FOG_DENSITY_DAY: 0.004,
  FOG_DENSITY_FOG_MOD: 0.025,   // fog night modifier

  // ---- Stone Skin (panic button) ----
  STONE_SKIN_DURATION: 2.0,
  STONE_SKIN_COOLDOWN: 20.0,

  // ---- Talon Cleave ----
  CLEAVE_SPEED_THRESHOLD: 14.0,  // must be moving this fast
  CLEAVE_BONUS_RANGE: 1.5,       // extra range on cleave
  CLEAVE_CHAIN_MAX: 5,           // max enemies hit

  // ---- Dash ----
  DASH_SPEED: 30.0,
  DASH_DURATION: 0.2,
  DASH_COOLDOWN: 2.0,
  DASH_IFRAMES: 0.25,
  DASH_STAMINA_COST: 20,

  // ---- Hit Stop ----
  HIT_STOP_CRIT: 0.06,       // seconds of time slow on crit
  HIT_STOP_DIVEBOMB: 0.12,   // on multi-kill dive bomb
  HIT_STOP_SCALE: 0.1,       // time scale during hit stop

  // ---- Death Sequence ----
  DEATH_SLOW_MO_DURATION: 1.5,
  DEATH_SLOW_MO_SCALE: 0.15,

  // ---- Objectives ----
  OBJECTIVE_INTERVAL: 3,       // every N waves
  OBJECTIVE_REWARD_BASE: 8,

  // ---- Fury ----
  FURY_HP_THRESHOLD: 0.25,     // below 25% HP
  FURY_DAMAGE_MULT: 1.5,
  FURY_SPEED_MULT: 1.3,

  // ---- Perch Bonuses ----
  PERCH_TOWER_ATK_SPEED: 0.3,  // -30% cooldown reduction while perched at tower
  PERCH_WALL_ARMOR: 0.15,      // +15% DR for 10s after leaving wall perch
  PERCH_SPIRE_REGEN: 6.0,      // HP/s at spire (2x normal)
  PERCH_BUFF_DURATION: 10.0,   // how long wall/tower buff lasts after takeoff

  // ---- Cathedral Bell ----
  BELL_STUN_RADIUS: 25.0,
  BELL_STUN_DURATION: 3.0,
  BELL_HP_THRESHOLDS: [0.75, 0.5, 0.25], // triggers at these HP %

  // ---- Proximity Kill ----
  CLOSE_KILL_RANGE: 4.0,
  CLOSE_KILL_SOUL_BONUS: 0.5,  // +50% souls

  // ---- Night Scaling ----
  NIGHT_DURATION_MIN: 50,       // minimum night length
  NIGHT_DURATION_DECAY: 3,      // seconds shorter per wave
  DEMON_DAMAGE_SCALE: 0.05,     // +5% per wave

  // ---- Reinforcements ----
  REINFORCEMENT_CHANCE: 0.15,   // per check (every 15s)
  REINFORCEMENT_CHECK_INTERVAL: 15,
  REINFORCEMENT_COUNT: 4,

  // ---- Difficulty Multipliers ----
  DIFFICULTY: {
    easy:      { demonHp: 0.7, demonDmg: 0.6, demonCount: 0.7, soulMult: 1.3, cathedralHp: 1.3 },
    normal:    { demonHp: 1.0, demonDmg: 1.0, demonCount: 1.0, soulMult: 1.0, cathedralHp: 1.0 },
    hard:      { demonHp: 1.3, demonDmg: 1.3, demonCount: 1.2, soulMult: 0.9, cathedralHp: 0.8 },
    nightmare: { demonHp: 1.7, demonDmg: 1.6, demonCount: 1.5, soulMult: 0.7, cathedralHp: 0.6 },
  } as Record<string, { demonHp: number; demonDmg: number; demonCount: number; soulMult: number; cathedralHp: number }>,

  // ---- Sim ----
  SIM_TICK_MS: 16,
};
