// ---------------------------------------------------------------------------
// Guinevere: The Astral Garden — balance & world constants
// Tend an enchanted garden in the starlit void. Plant, grow, defend, harvest.
// ---------------------------------------------------------------------------

export const GUIN = {
  // ---- Simulation ----
  SIM_TICK_MS: 16,

  // ---- Player (Queen Guinevere) ----
  MAX_HP: 120,
  MOVE_SPEED: 9.0,
  SPRINT_SPEED: 15.0,
  TURN_SPEED: 3.5,
  GRAVITY: -20.0,
  JUMP_FORCE: 11.0,
  STAMINA_MAX: 100,
  STAMINA_SPRINT_DRAIN: 14.0,
  STAMINA_REGEN: 18.0,
  HP_REGEN: 0.5,       // passive regen near blooming plants
  GARDEN_REGEN_MULT: 3, // regen multiplier when near blooming plants
  GARDEN_REGEN_RANGE: 8.0,

  // ---- Planting ----
  PLANT_COST: 5,         // starlight essence per seed
  PLANT_RANGE: 5.0,      // max distance to plant
  MAX_PLANTS: 24,        // maximum plants per garden island
  SEED_TYPES: ["crystal_rose", "starbloom", "moonvine", "aurora_tree", "void_lily"] as const,

  // ---- Plant Growth ----
  GROWTH_SEED: 0,
  GROWTH_SPROUT: 1,
  GROWTH_BLOOM: 2,
  GROWTH_RADIANT: 3,    // max growth — glows brightly, bonus harvest
  GROW_TIME_BASE: 12,    // seconds per growth stage
  MOONLIGHT_GROW_MULT: 2.0, // growth speed during night
  WITHER_RATE: 2.0,      // HP lost per second when attacked
  PLANT_HP_BASE: 40,
  PLANT_HP_PER_STAGE: 20,

  // ---- Harvest ----
  HARVEST_RANGE: 3.5,
  HARVEST_TIME: 1.5,     // seconds to harvest
  ESSENCE_PER_BLOOM: 8,
  ESSENCE_PER_RADIANT: 15,
  ESSENCE_BONUS_VARIETY: 0.1, // +10% per unique plant type in garden

  // ---- Abilities ----
  // Moonbeam: ranged beam attack (tap for normal, hold for charged)
  MOONBEAM_DAMAGE: 20,
  MOONBEAM_RANGE: 18.0,
  MOONBEAM_COOLDOWN: 1.2,
  MOONBEAM_WIDTH: 1.5,
  MOONBEAM_CHARGE_TIME: 1.0,     // seconds to fully charge
  MOONBEAM_CHARGE_MULT: 3.0,     // damage multiplier at full charge
  MOONBEAM_CHARGE_RADIUS: 3.0,   // AoE explosion at impact point
  MOONBEAM_CHARGE_KNOCKBACK: 10, // pushes enemies away

  // Thorn Wall: summon a wall of thorns that blocks & damages enemies
  THORN_WALL_DAMAGE: 8,
  THORN_WALL_HP: 80,
  THORN_WALL_DURATION: 12.0,
  THORN_WALL_COOLDOWN: 10.0,
  THORN_WALL_LENGTH: 10.0,

  // Blossom Burst: AoE explosion of petals
  BLOSSOM_BURST_DAMAGE: 35,
  BLOSSOM_BURST_RADIUS: 8.0,
  BLOSSOM_BURST_COOLDOWN: 14.0,
  BLOSSOM_BURST_HEAL: 15,  // heals nearby plants

  // Root Bind: snare enemies in place
  ROOT_BIND_DURATION: 3.0,
  ROOT_BIND_RANGE: 12.0,
  ROOT_BIND_RADIUS: 5.0,
  ROOT_BIND_COOLDOWN: 16.0,

  // Aurora Shield: damage absorption barrier
  AURORA_SHIELD_HP: 50,
  AURORA_SHIELD_DURATION: 6.0,
  AURORA_SHIELD_COOLDOWN: 20.0,
  AURORA_SHIELD_REFLECT: 0.3, // reflects 30% of blocked damage

  // ---- Enemies ----
  SPAWN_RADIUS: 55,
  SPAWN_INTERVAL: 2.5,
  SPAWN_BATCH: 2,

  // Frost Wisp: fast, weak
  WISP_HP: 25,
  WISP_DAMAGE: 6,
  WISP_SPEED: 8.0,
  WISP_PLANT_DAMAGE: 3,

  // Void Crawler: medium, targets plants
  CRAWLER_HP: 50,
  CRAWLER_DAMAGE: 12,
  CRAWLER_SPEED: 5.0,
  CRAWLER_PLANT_DAMAGE: 6,

  // Shadow Stag: charges at player
  STAG_HP: 80,
  STAG_DAMAGE: 20,
  STAG_SPEED: 6.0,
  STAG_CHARGE_SPEED: 18.0,
  STAG_CHARGE_CD: 7.0,
  STAG_CHARGE_DAMAGE: 30,

  // Blight Moth: flying ranged attacker
  MOTH_HP: 35,
  MOTH_DAMAGE: 10,
  MOTH_SPEED: 7.0,
  MOTH_PROJECTILE_CD: 3.0,
  MOTH_PROJECTILE_SPEED: 14.0,
  MOTH_PROJECTILE_DAMAGE: 12,
  MOTH_FLY_HEIGHT: 6.0,

  // Spore Shambler: slow tanky, splits into 2 smaller versions on death
  SHAMBLER_HP: 100,
  SHAMBLER_DAMAGE: 15,
  SHAMBLER_SPEED: 3.0,
  SHAMBLER_PLANT_DAMAGE: 8,
  SHAMBLER_SPLIT_COUNT: 2,
  SHAMBLER_SPLIT_HP_RATIO: 0.4,
  SHAMBLER_START_WAVE: 5,

  // Wither Lord (boss): appears every 5 waves
  WITHER_LORD_HP: 350,
  WITHER_LORD_DAMAGE: 35,
  WITHER_LORD_SPEED: 4.0,
  WITHER_LORD_SLAM_CD: 8.0,
  WITHER_LORD_SLAM_RADIUS: 10.0,
  WITHER_LORD_SLAM_DAMAGE: 40,
  WITHER_LORD_BLIGHT_CD: 12.0,
  WITHER_LORD_BLIGHT_RADIUS: 6.0,

  // ---- Day / Night ----
  CYCLE_DURATION: 80,       // total seconds per full cycle
  DAY_RATIO: 0.5,           // 50% day, 50% night
  DAWN_DUSK_DURATION: 5,    // transition time
  NIGHT_ENEMY_MULT: 1.4,    // enemies are stronger at night
  NIGHT_GROW_BONUS: true,   // plants grow faster at night (moonlight)

  // ---- Waves ----
  WAVE_BASE_COUNT: 6,
  WAVE_COUNT_SCALE: 2,
  BOSS_EVERY_N_WAVES: 5,
  CRAWLER_START_WAVE: 2,
  STAG_START_WAVE: 3,
  MOTH_START_WAVE: 4,
  WAVE_MODIFIER_START: 3,

  // ---- Wave Modifiers ----
  // Modifiers applied to certain waves
  MODIFIER_CHANCE: 0.4,

  // ---- Garden Islands ----
  ISLAND_RADIUS: 25,
  BRIDGE_WIDTH: 3.0,
  BRIDGE_LENGTH: 12.0,
  ISLAND_EXPAND_COST: 40,   // essence to unlock next island
  MAX_ISLANDS: 5,

  // ---- Upgrades ----
  UPGRADE_COST_SCALE: 1.4,

  // ---- Camera ----
  CAMERA_DISTANCE: 16,
  CAMERA_HEIGHT: 10,
  CAMERA_LERP: 6.0,

  // ---- World ----
  GROUND_SIZE: 150,
  FOG_DENSITY: 0.006,
  STAR_COUNT: 400,

  // ---- Combo ----
  COMBO_WINDOW: 3.0,
  COMBO_ESSENCE_BONUS: 0.05, // +5% essence per combo

  // ---- Celestial Convergence (ultimate — requires all 5 plant types blooming) ----
  CELESTIAL_DAMAGE: 120,
  CELESTIAL_RADIUS: 20.0,
  CELESTIAL_COOLDOWN: 45.0,
  CELESTIAL_DURATION: 3.0,       // slow-mo burst duration
  CELESTIAL_HEAL: 40,
  CELESTIAL_PLANT_HEAL: 30,
  CELESTIAL_ESSENCE_GRANT: 20,
  CELESTIAL_STUN: 2.5,           // stuns all enemies

  // ---- Garden Sentinels (awaken radiant plants into turrets) ----
  SENTINEL_COST: 12,             // essence to awaken
  SENTINEL_RANGE: 14.0,
  SENTINEL_FIRE_CD: 1.8,
  SENTINEL_DAMAGE: 12,
  SENTINEL_PROJECTILE_SPEED: 16.0,

  // ---- Elite Enemies ----
  ELITE_CHANCE: 0.1,             // chance per enemy from wave 4+
  ELITE_START_WAVE: 4,
  ELITE_HP_MULT: 2.0,
  ELITE_DAMAGE_MULT: 1.4,
  ELITE_SPEED_MULT: 1.15,
  ELITE_ESSENCE_MULT: 3.0,

  // ---- Critical Hits ----
  CRIT_CHANCE_BASE: 0.08,        // 8% base
  CRIT_CHANCE_PER_COMBO: 0.02,   // +2% per combo
  CRIT_CHANCE_MAX: 0.35,
  CRIT_MULTIPLIER: 2.5,

  // ---- Perfect Dodge ----
  PERFECT_DODGE_WINDOW: 0.15,    // seconds before an attack hits
  PERFECT_DODGE_SLOW: 0.3,       // time scale during perfect dodge
  PERFECT_DODGE_SLOW_DURATION: 0.8,
  PERFECT_DODGE_DAMAGE_MULT: 3.0,
  PERFECT_DODGE_DURATION: 1.5,   // buff duration after perfect dodge

  // ---- Death Sequence ----
  DEATH_SLOW_MO_DURATION: 2.0,
  DEATH_SLOW_MO_SCALE: 0.15,

  // ---- Dodge ----
  DODGE_SPEED: 22.0,
  DODGE_DURATION: 0.25,
  DODGE_COOLDOWN: 1.2,
  DODGE_IFRAMES: 0.2,
  DODGE_STAMINA_COST: 20,

  // ---- Plant Synergies (bloom-range auras) ----
  SYNERGY_RANGE: 8.0,
  // crystal_rose: nearby enemies take 15% more damage
  SYNERGY_ROSE_VULN: 0.15,
  // starbloom: +20% essence from nearby kills
  SYNERGY_STARBLOOM_ESSENCE: 0.2,
  // moonvine: slows enemies by 25% in range
  SYNERGY_MOONVINE_SLOW: 0.25,
  // aurora_tree: heals player 2 HP/s in range
  SYNERGY_AURORA_HEAL: 2.0,
  // void_lily: 10% chance enemies in range take 15 damage/s (void burn)
  SYNERGY_VOID_TICK_CHANCE: 0.1,
  SYNERGY_VOID_DAMAGE: 15,

  // ---- Artifacts (boss/elite drops — permanent passive buffs) ----
  ARTIFACT_DROP_CHANCE_BOSS: 1.0,    // 100% from bosses
  ARTIFACT_DROP_CHANCE_ELITE: 0.25,  // 25% from elites
  ARTIFACT_PICKUP_RANGE: 3.0,
  ARTIFACT_FLOAT_HEIGHT: 2.0,

  // ---- Attack Telegraphs ----
  TELEGRAPH_STAG_CHARGE_TIME: 0.8,  // warning time before charge
  TELEGRAPH_WITHER_SLAM_TIME: 1.0,
  TELEGRAPH_MOTH_SHOT_TIME: 0.5,

  // ---- Wave Countdown ----
  WAVE_COUNTDOWN_DURATION: 4.0,     // seconds of countdown before wave

  // ---- Hit Stop ----
  HIT_STOP_DURATION: 0.05,
  HIT_STOP_SCALE: 0.1,

  // ---- Difficulty ----
  DIFFICULTY: {
    easy:      { enemyHp: 0.7, enemyDmg: 0.6, enemyCount: 0.7, essenceMult: 1.3 },
    normal:    { enemyHp: 1.0, enemyDmg: 1.0, enemyCount: 1.0, essenceMult: 1.0 },
    hard:      { enemyHp: 1.3, enemyDmg: 1.3, enemyCount: 1.3, essenceMult: 0.8 },
    nightmare: { enemyHp: 1.7, enemyDmg: 1.6, enemyCount: 1.5, essenceMult: 0.6 },
  } as Record<string, { enemyHp: number; enemyDmg: number; enemyCount: number; essenceMult: number }>,
};
