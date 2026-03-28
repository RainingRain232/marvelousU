// ---------------------------------------------------------------------------
// Pendulum — The Clockwork Knight — balance & world constants
// ---------------------------------------------------------------------------

export const PENDULUM = {
  // ---- Movement ----
  WALK_SPEED: 7.5,
  SPRINT_SPEED: 13.0,
  TURN_SPEED: 3.5,
  PITCH_SPEED: 2.5,
  GRAVITY: -22.0,
  JUMP_FORCE: 10.0,
  GROUND_DRAG: 0.88,
  AIR_DRAG: 0.97,

  // ---- Player ----
  MAX_HP: 100,
  HP_REGEN: 0.5,
  STAMINA_MAX: 100,
  STAMINA_SPRINT_DRAIN: 14.0,
  STAMINA_REGEN: 11.0,

  // ---- Pendulum Rhythm ----
  PENDULUM_PERIOD: 6.0,          // seconds for full swing cycle
  PENDULUM_POWER_MIN: 0.5,       // power multiplier at center (weakest)
  PENDULUM_POWER_MAX: 1.8,       // power multiplier at apex (strongest)
  PENDULUM_ANGLE_MAX: 35,        // visual max angle in degrees

  // ---- Abilities ----
  // Chrono Strike (melee — freezes target briefly)
  CHRONO_STRIKE_DAMAGE: 22,
  CHRONO_STRIKE_RANGE: 3.5,
  CHRONO_STRIKE_COOLDOWN: 0.6,
  CHRONO_STRIKE_FREEZE: 0.8,     // freeze duration on hit
  CHRONO_STRIKE_COMBO_COUNT: 3,
  CHRONO_STRIKE_COMBO_WINDOW: 0.9,
  CHRONO_STRIKE_COMBO_MULT: [1.0, 1.4, 2.2],
  CHRONO_STRIKE_RANGE_BONUS: [0, 0.5, 1.0],
  CHRONO_STRIKE_KNOCKBACK: 3.0,
  CHRONO_STRIKE_HEAVY_KNOCKBACK: 9.0,

  // Gear Throw (ranged projectile — bounces between enemies)
  GEAR_THROW_DAMAGE: 15,
  GEAR_THROW_SPEED: 22.0,
  GEAR_THROW_RANGE: 20.0,
  GEAR_THROW_COOLDOWN: 4.0,
  GEAR_THROW_BOUNCES: 2,         // hits up to 3 targets
  GEAR_THROW_BOUNCE_RANGE: 8.0,

  // Time Slow (AoE slow zone)
  TIME_SLOW_RADIUS: 8.0,
  TIME_SLOW_DURATION: 4.0,
  TIME_SLOW_FACTOR: 0.3,         // enemies move at 30% speed
  TIME_SLOW_COOLDOWN: 10.0,

  // Rewind (reverse enemy projectiles back at sender)
  REWIND_RADIUS: 6.0,
  REWIND_COOLDOWN: 8.0,
  REWIND_DAMAGE_MULT: 2.0,       // reversed projectiles deal 2x

  // Time Stop (ultimate — freezes all enemies for duration)
  TIME_STOP_DURATION: 3.0,
  TIME_STOP_COOLDOWN: 32.0,
  TIME_STOP_DAMAGE_BONUS: 1.5,   // bonus damage to frozen enemies

  // Clockwork Dash
  DASH_SPEED: 20.0,
  DASH_DURATION: 0.25,
  DASH_COOLDOWN: 1.8,
  DASH_IFRAMES: 0.3,
  DASH_STAMINA_COST: 18,

  // ---- Combo ----
  COMBO_WINDOW: 3.0,
  COMBO_DAMAGE_BONUS: 0.06,
  COMBO_GEAR_BONUS: 0.3,         // bonus gear fragments per combo hit
  COMBO_MAX: 15,

  // ---- Clock Tower ----
  CLOCK_TOWER_HP: 450,
  CLOCK_TOWER_RADIUS: 6.0,
  CLOCK_TOWER_HEIGHT: 50,
  CLOCK_TOWER_REGEN: 0.0,        // no passive regen

  // ---- Gear Pillars (defend these — they power the tower) ----
  PILLAR_COUNT: 4,
  PILLAR_HP: 120,
  PILLAR_RADIUS: 3.0,
  PILLAR_SPREAD: 40.0,           // distance from center
  PILLAR_POWER_BONUS: 0.1,       // each active pillar adds 10% pendulum power

  // ---- Enemies ----
  ENEMY_SPAWN_RADIUS: 60,
  ENEMY_WALK_SPEED: 3.5,
  ENEMY_ATTACK_RANGE: 2.5,
  ENEMY_ATTACK_COOLDOWN: 1.4,
  ENEMY_TOWER_DAMAGE: 5,
  ENEMY_PILLAR_DAMAGE: 3,

  // Gear Drone (basic melee — small flying clockwork)
  GEAR_DRONE_HP: 30,
  GEAR_DRONE_DAMAGE: 8,
  GEAR_DRONE_SPEED: 5.5,

  // Spring Knight (melee — winds up for heavy attacks)
  SPRING_KNIGHT_HP: 70,
  SPRING_KNIGHT_DAMAGE: 20,
  SPRING_KNIGHT_SPEED: 3.5,
  SPRING_KNIGHT_WINDUP: 1.0,     // telegraph duration
  SPRING_KNIGHT_CHARGE_CD: 8.0,
  SPRING_KNIGHT_CHARGE_SPEED: 12.0,
  SPRING_KNIGHT_CHARGE_DURATION: 1.0,

  // Coil Archer (ranged — fires spring-loaded bolts)
  COIL_ARCHER_HP: 25,
  COIL_ARCHER_DAMAGE: 14,
  COIL_ARCHER_SPEED: 3.0,
  COIL_ARCHER_RANGE: 20.0,
  COIL_ARCHER_BOLT_SPEED: 16.0,
  COIL_ARCHER_FIRE_CD: 2.5,

  // Brass Golem (tank — heavy, slow, devastating)
  BRASS_GOLEM_HP: 250,
  BRASS_GOLEM_DAMAGE: 35,
  BRASS_GOLEM_SPEED: 1.8,
  BRASS_GOLEM_SLAM_CD: 8.0,
  BRASS_GOLEM_SLAM_RADIUS: 6.0,
  BRASS_GOLEM_SLAM_DAMAGE: 40,

  // Clock Spider (fast flanker — crawls on terrain)
  CLOCK_SPIDER_HP: 40,
  CLOCK_SPIDER_DAMAGE: 12,
  CLOCK_SPIDER_SPEED: 10.0,
  CLOCK_SPIDER_LEAP_CD: 5.0,
  CLOCK_SPIDER_LEAP_DAMAGE: 20,

  // Chronovore (boss — eats time, massive clockwork beast)
  CHRONOVORE_HP: 600,
  CHRONOVORE_DAMAGE: 40,
  CHRONOVORE_SPEED: 2.5,
  CHRONOVORE_SLAM_CD: 7.0,
  CHRONOVORE_SLAM_RADIUS: 10.0,
  CHRONOVORE_SLAM_DAMAGE: 50,
  CHRONOVORE_SLAM_TELEGRAPH: 0.8,
  CHRONOVORE_SPAWN_CD: 15.0,
  CHRONOVORE_PHASE2_HP: 0.5,
  CHRONOVORE_PHASE3_HP: 0.2,
  CHRONOVORE_ENRAGE_SPEED: 1.5,
  CHRONOVORE_ENRAGE_DAMAGE: 1.3,
  CHRONOVORE_BEAM_CD: 5.0,
  CHRONOVORE_BEAM_DAMAGE: 8,
  CHRONOVORE_BEAM_DURATION: 2.0,

  // Pack behavior
  GEAR_DRONE_PACK_RANGE: 5.0,
  GEAR_DRONE_PACK_SPEED_BONUS: 0.1,

  // ---- Gear Fragments (resource — dropped by enemies) ----
  GEAR_FRAGMENT_SPEED: 14.0,
  GEAR_FRAGMENT_ATTRACT_RANGE: 10.0,
  GEAR_FRAGMENT_COLLECT_RANGE: 1.5,
  GEAR_FRAGMENT_LIFE: 8.0,

  REPAIR_KIT_CHANCE: 0.25,
  REPAIR_KIT_AMOUNT: 18,
  REPAIR_KIT_LIFE: 10.0,

  GEARS_PER_DRONE: 1,
  GEARS_PER_SPRING_KNIGHT: 2,
  GEARS_PER_COIL_ARCHER: 2,
  GEARS_PER_BRASS_GOLEM: 5,
  GEARS_PER_CLOCK_SPIDER: 2,
  GEARS_PER_CHRONOVORE: 15,

  // ---- Waves ----
  WAVE_BASE_ENEMIES: 6,
  WAVE_ENEMY_SCALE: 3,
  BOSS_EVERY_N_WAVES: 5,
  SPRING_KNIGHT_START_WAVE: 2,
  BRASS_GOLEM_START_WAVE: 3,
  CLOCK_SPIDER_START_WAVE: 2,
  COIL_ARCHER_START_WAVE: 1,
  SPAWN_INTERVAL: 2.5,
  SPAWN_BATCH_SIZE: 2,
  MODIFIER_START_WAVE: 3,

  // ---- Wave Modifiers ----
  OVERCLOCK_SPEED_MULT: 1.4,     // enemies 40% faster
  OVERCLOCK_DAMAGE_MULT: 1.15,
  RUST_STORM_PLAYER_SLOW: 0.8,
  RUST_STORM_ARMOR_DEBUFF: 0.15,
  RUST_STORM_DOT_DAMAGE: 2,
  RUST_STORM_DOT_INTERVAL: 1.0,
  HAYWIRE_SPAWN_MULT: 1.5,       // 50% more enemies
  MAGNETIC_PULL_STRENGTH: 0.3,    // enemies pulled toward tower

  // ---- Clock Hours (progression marker) ----
  HOUR_DURATION: 60,              // seconds per hour
  HOURS_PER_GAME: 12,             // game lasts 12 hours max

  // ---- Upgrades ----
  UPGRADE_COST_SCALE: 1.4,

  // ---- Clockwork Allies ----
  TURRET_HP: 80,
  TURRET_DAMAGE: 10,
  TURRET_RANGE: 15.0,
  TURRET_FIRE_RATE: 1.5,
  TURRET_COST: 4,
  TURRET_MAX: 3,

  // ---- Projectiles ----
  PROJECTILE_LIFE: 4.0,

  // ---- Camera ----
  CAMERA_FOLLOW_DIST: 10,
  CAMERA_FOLLOW_HEIGHT: 5,
  CAMERA_LERP: 0.08,
  CAMERA_FOV: 65,

  // ---- World ----
  GROUND_SIZE: 160,
  DEBRIS_COUNT: 80,
  FOG_DENSITY_BASE: 0.005,
  FOG_DENSITY_RUST_STORM: 0.018,

  // ---- Hit Stop ----
  HIT_STOP_CRIT: 0.06,
  HIT_STOP_TIME_STOP: 0.15,
  HIT_STOP_SCALE: 0.1,

  // ---- Death Sequence ----
  DEATH_SLOW_MO_DURATION: 1.5,
  DEATH_SLOW_MO_SCALE: 0.15,

  // ---- Kill Streaks ----
  STREAK_THRESHOLDS: [5, 10, 20, 35],
  STREAK_REWARDS: [2, 4, 8, 16],
  STREAK_WINDOW: 8.0,

  // ---- Entropy (corruption equivalent — tower degradation) ----
  ENTROPY_PER_WAVE: 0.04,
  ENTROPY_DECAY_REPAIR: 0.12,
  ENTROPY_ENEMY_BUFF: 0.12,

  // ---- Difficulty ----
  DIFFICULTY: {
    easy:      { enemyHp: 0.7, enemyDmg: 0.6, enemyCount: 0.7, gearMult: 1.3, towerHp: 1.5 },
    normal:    { enemyHp: 1.0, enemyDmg: 1.0, enemyCount: 1.0, gearMult: 1.0, towerHp: 1.0 },
    hard:      { enemyHp: 1.3, enemyDmg: 1.3, enemyCount: 1.2, gearMult: 0.9, towerHp: 0.8 },
    nightmare: { enemyHp: 1.7, enemyDmg: 1.6, enemyCount: 1.5, gearMult: 0.7, towerHp: 1.0 },
  } as Record<string, { enemyHp: number; enemyDmg: number; enemyCount: number; gearMult: number; towerHp: number }>,

  // ---- Per-Wave Scaling ----
  ENEMY_HP_SCALE_PER_WAVE: 0.10,    // +10% enemy HP per wave
  ENEMY_DMG_SCALE_PER_WAVE: 0.06,   // +6% enemy damage per wave
  ENEMY_SPEED_SCALE_PER_WAVE: 0.02, // +2% enemy speed per wave

  // ---- Turret Placement ----
  TURRET_PLACE_RANGE: 12.0,          // max range from player to place turret
  TURRET_MIN_DIST: 8.0,              // min distance between turrets

  // ---- Pillar Damaged Threshold ----
  PILLAR_DAMAGED_PCT: 0.5,           // transitions to "damaged" at 50% HP

  // ---- Apex Strike ----
  APEX_POWER_THRESHOLD: 1.5,         // power above this = apex strike effects
  APEX_CRIT_BONUS: 0.4,              // +40% damage on apex strikes
  APEX_FREEZE_BONUS: 0.5,            // +50% freeze duration on apex

  // ---- Dash Trail (speed lv3) ----
  DASH_TRAIL_DAMAGE: 8,
  DASH_TRAIL_RADIUS: 2.0,
  DASH_TRAIL_DURATION: 1.5,

  // ---- Chrono Shatter (chrono lv3) ----
  SHATTER_DAMAGE_PCT: 0.3,           // 30% of max HP as shatter damage to nearby
  SHATTER_RADIUS: 6.0,

  // ---- Parry (armor lv3) ----
  PARRY_WINDOW: 0.3,                 // seconds at start of block = parry
  PARRY_STUN_DURATION: 1.5,
  PARRY_DAMAGE_REFLECT: 0.5,         // reflect 50% of blocked damage

  // ---- Clock Hour Events ----
  HOUR_HEAL_AMOUNT: 0.15,            // restore 15% HP at healing hours
  HOUR_TOWER_HEAL: 20,               // tower heals 20 HP at healing hours
  HEALING_HOURS: [3, 6, 9],          // hours that trigger healing
  DANGER_HOURS: [4, 8, 11],          // hours that spawn extra enemies
  DANGER_EXTRA_ENEMIES: 5,
  BOSS_RUSH_HOUR: 11,                // double boss wave at hour 11

  // ---- Intermission Healing ----
  INTERMISSION_HEAL_PCT: 0.1,        // restore 10% HP between waves
  INTERMISSION_PILLAR_HEAL: 5,       // pillars heal 5 HP between waves

  // ---- Spring Knight Telegraph ----
  SPRING_KNIGHT_TELEGRAPH_RANGE: 25, // show warning within this range
  SPRING_KNIGHT_TELEGRAPH_TIME: 0.8, // seconds of telegraph before charge

  // ---- Brass Golem Slam Telegraph ----
  BRASS_GOLEM_SLAM_TELEGRAPH: 0.6,   // seconds of warning before slam

  // ---- Damage Direction ----
  DAMAGE_INDICATOR_DURATION: 0.8,

  // ---- Sim ----
  SIM_TICK_MS: 16,
};
