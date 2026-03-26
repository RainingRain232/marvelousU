// ---------------------------------------------------------------------------
// Depths of Avalon — balance & configuration constants
// ---------------------------------------------------------------------------

export const DEPTHS = {
  // Simulation
  SIM_TICK_MS: 16.667, // 60 Hz

  // Player
  PLAYER_SWIM_SPEED: 8,
  PLAYER_SPRINT_MULT: 1.6,
  PLAYER_TURN_SPEED: 3.0,
  PLAYER_PITCH_SPEED: 2.0,
  PLAYER_MAX_HP: 100,
  PLAYER_ATTACK_DMG: 15,
  PLAYER_ATTACK_RANGE: 3.0,
  PLAYER_ATTACK_COOLDOWN: 0.6,
  PLAYER_INVULN_TIME: 0.8,
  PLAYER_RADIUS: 0.6,

  // Dash
  DASH_SPEED: 28,
  DASH_DURATION: 0.25,
  DASH_COOLDOWN: 1.5,
  DASH_INVULN: true,

  // Harpoon (ranged attack, E key)
  HARPOON_SPEED: 40,
  HARPOON_DMG: 25,
  HARPOON_RANGE: 30,
  HARPOON_COOLDOWN: 2.5,
  HARPOON_RADIUS: 0.2,

  // Critical hits
  CRIT_CHANCE: 0.1,
  CRIT_MULT: 2.0,

  // Life steal
  LIFESTEAL_BASE: 0,        // base % of damage healed
  LIFESTEAL_PER_COMBO: 0.02, // +2% per combo stack

  // Oxygen
  OXYGEN_MAX: 100,
  OXYGEN_DRAIN_PER_SEC: 2.5,
  OXYGEN_SPRINT_DRAIN_MULT: 2.0,
  OXYGEN_BUBBLE_RESTORE: 30,
  OXYGEN_DAMAGE_PER_SEC: 10,
  OXYGEN_LOW_THRESHOLD: 25,

  // Depth pressure
  PRESSURE_START_DEPTH: 60,
  PRESSURE_DMG_PER_SEC_BASE: 2.0,
  PRESSURE_DMG_SCALE: 0.04,

  // Kill combo
  COMBO_TIMEOUT: 4.0,
  COMBO_XP_MULT: 0.15,
  COMBO_GOLD_MULT: 0.10,

  // Difficulty scaling per dive
  DIVE_ENEMY_HP_SCALE: 5,       // +5 HP per dive number
  DIVE_ENEMY_DMG_SCALE: 1,      // +1 dmg per dive number
  DIVE_SPAWN_RATE_SCALE: 0.05,  // spawn rate decreases 5% per dive (faster spawns)

  // Depth momentum (staying deep boosts rewards)
  MOMENTUM_START_DEPTH: 15,
  MOMENTUM_MULT_PER_10M: 0.1,   // +10% gold/XP per 10m depth
  MOMENTUM_MAX_MULT: 3.0,

  // Wave events (temporary spawn surges)
  WAVE_TRIGGER_DEPTHS: [25, 65, 115, 160],
  WAVE_DURATION: 20,            // seconds
  WAVE_SPAWN_MULT: 3.0,         // 3x spawn rate during waves
  WAVE_BONUS_XP_MULT: 2.0,

  // Depth hotspots (clusters of treasure for horizontal exploration)
  HOTSPOT_COUNT: 4,
  HOTSPOT_TREASURE_COUNT: 5,
  HOTSPOT_RADIUS: 12,

  // Depth / progression
  DEPTH_ZONES: [
    { name: "Shallows",       minDepth: 0,   maxDepth: 30,  color: 0x2288aa, fogDensity: 0.012, spawnRate: 3.0,  currentStrength: 0.5,  currentDir: { x: 0.3, y: 0, z: 0.2 } },
    { name: "Twilight Reef",  minDepth: 30,  maxDepth: 70,  color: 0x115577, fogDensity: 0.018, spawnRate: 2.0,  currentStrength: 1.2,  currentDir: { x: -0.2, y: -0.1, z: 0.4 } },
    { name: "The Abyss",      minDepth: 70,  maxDepth: 120, color: 0x0a2244, fogDensity: 0.028, spawnRate: 1.2,  currentStrength: 2.0,  currentDir: { x: 0.1, y: -0.3, z: -0.3 } },
    { name: "Avalon's Heart", minDepth: 120, maxDepth: 180, color: 0x061133, fogDensity: 0.04,  spawnRate: 0.8,  currentStrength: 3.0,  currentDir: { x: -0.4, y: -0.2, z: 0.1 } },
  ],

  // Bosses (one per zone boundary)
  BOSSES: {
    reef_guardian: {
      name: "Reef Guardian",
      hp: 300, dmg: 20, speed: 3.0, radius: 2.5,
      aggroRange: 30, color: 0x22aa88, glow: 0x44ffaa,
      xp: 150, triggerDepth: 28, goldReward: 100,
    },
    twilight_serpent: {
      name: "Twilight Serpent",
      hp: 600, dmg: 30, speed: 4.5, radius: 2.0,
      aggroRange: 35, color: 0x4466aa, glow: 0x6688ff,
      xp: 300, triggerDepth: 68, goldReward: 200,
    },
    abyssal_kraken: {
      name: "Abyssal Kraken",
      hp: 1200, dmg: 45, speed: 3.5, radius: 4.0,
      aggroRange: 40, color: 0x662233, glow: 0xff4466,
      xp: 600, triggerDepth: 118, goldReward: 400,
    },
    lady_of_the_lake: {
      name: "Lady of the Lake",
      hp: 2500, dmg: 60, speed: 5.0, radius: 3.0,
      aggroRange: 50, color: 0xaaccff, glow: 0xffffff,
      xp: 1500, triggerDepth: 170, goldReward: 1000,
    },
  } as Record<string, BossDef>,

  // Whirlpools
  WHIRLPOOL_COUNT: 6,
  WHIRLPOOL_RADIUS: 8,
  WHIRLPOOL_PULL_STRENGTH: 12,
  WHIRLPOOL_DMG_PER_SEC: 5,
  WHIRLPOOL_CORE_RADIUS: 2,

  // Siren projectiles
  SIREN_PROJ_SPEED: 12,
  SIREN_PROJ_DMG: 6,
  SIREN_PROJ_COOLDOWN: 3.0,
  SIREN_PROJ_RANGE: 18,
  SIREN_PROJ_RADIUS: 0.3,

  // Relics — passive artifacts found near ruins
  RELICS: {
    trident_of_poseidon: {
      name: "Trident of Poseidon",
      desc: "Melee attacks hit all enemies in range",
      color: 0x44ddff, rarity: "rare",
    },
    mermaids_tear: {
      name: "Mermaid's Tear",
      desc: "Heal 5% max HP on kill",
      color: 0x88ffcc, rarity: "common",
    },
    abyssal_eye: {
      name: "Abyssal Eye",
      desc: "+50% light radius, enemies glow when nearby",
      color: 0xff4488, rarity: "common",
    },
    storm_pearl: {
      name: "Storm Pearl",
      desc: "Dash damages enemies in path (15 dmg)",
      color: 0xffcc44, rarity: "rare",
    },
    sirens_shell: {
      name: "Siren's Shell",
      desc: "O2 drains 40% slower",
      color: 0xbb66dd, rarity: "common",
    },
    leviathan_scale: {
      name: "Leviathan Scale",
      desc: "+30% armor, take no pressure damage",
      color: 0x44aa66, rarity: "legendary",
    },
    neptunes_crown: {
      name: "Neptune's Crown",
      desc: "+25% crit chance, crits restore O2",
      color: 0xffdd00, rarity: "legendary",
    },
    coral_heart: {
      name: "Coral Heart",
      desc: "Harpoon pierces through enemies",
      color: 0xff6688, rarity: "rare",
    },
  } as Record<string, RelicDef>,
  RELIC_SPAWN_CHANCE: 0.4, // per ruin

  // Camera
  CAMERA_OFFSET_Y: 3,
  CAMERA_OFFSET_Z: 8,
  CAMERA_FOV: 65,
  CAMERA_NEAR: 0.3,
  CAMERA_FAR: 200,
  CAMERA_LERP: 5.0,

  // FOV effects
  FOV_SPRINT_BOOST: 8,
  FOV_DASH_BOOST: 15,
  FOV_HIT_SHRINK: -5,
  FOV_LERP: 6.0,

  // Camera shake
  SHAKE_DECAY: 8.0,
  SHAKE_HIT_INTENSITY: 0.3,
  SHAKE_KILL_INTENSITY: 0.6,
  SHAKE_BOSS_INTENSITY: 1.2,

  // World generation
  WORLD_RADIUS: 60,
  CORAL_COUNT: 80,
  KELP_COUNT: 50,
  ROCK_COUNT: 40,
  RUIN_COUNT: 12,
  BUBBLE_STREAM_COUNT: 8,

  // Air bubbles
  AIR_BUBBLE_SPAWN_INTERVAL: 6.0,
  AIR_BUBBLE_MAX: 5,
  AIR_BUBBLE_RADIUS: 0.8,
  AIR_BUBBLE_BOB_SPEED: 1.5,
  AIR_BUBBLE_BOB_AMP: 0.3,

  // Enemies
  ENEMY_TYPES: {
    drowned_knight: {
      name: "Drowned Knight",
      hp: 50, dmg: 15, speed: 3.5, radius: 0.7,
      aggroRange: 15, color: 0x445566, glow: 0x6688aa,
      xp: 15, minDepth: 0,
    },
    siren: {
      name: "Siren",
      hp: 35, dmg: 10, speed: 4.5, radius: 0.5,
      aggroRange: 22, color: 0x8844aa, glow: 0xbb66dd,
      xp: 22, minDepth: 20,
    },
    abyssal_eel: {
      name: "Abyssal Eel",
      hp: 55, dmg: 22, speed: 5.0, radius: 0.4,
      aggroRange: 14, color: 0x224433, glow: 0x44ff88,
      xp: 30, minDepth: 50,
    },
    kraken_tentacle: {
      name: "Kraken Tentacle",
      hp: 90, dmg: 28, speed: 2.0, radius: 1.0,
      aggroRange: 18, color: 0x553322, glow: 0xff4422,
      xp: 50, minDepth: 90,
    },
    phantom_leviathan: {
      name: "Phantom Leviathan",
      hp: 160, dmg: 30, speed: 4.0, radius: 2.0,
      aggroRange: 25, color: 0x112233, glow: 0x00ffff,
      xp: 100, minDepth: 130,
    },
  } as Record<string, EnemyDef>,

  // Treasures
  TREASURE_COUNT: 20,
  TREASURE_TYPES: [
    { name: "Gold Coin",       value: 10, color: 0xffcc00, minDepth: 0 },
    { name: "Silver Chalice",  value: 25, color: 0xccccdd, minDepth: 20 },
    { name: "Ruby Amulet",     value: 50, color: 0xff2244, minDepth: 50 },
    { name: "Merlin's Scroll", value: 100, color: 0x4488ff, minDepth: 80 },
    { name: "Excalibur Shard", value: 200, color: 0xffffff, minDepth: 120 },
  ],

  // Upgrades (bought between dives)
  UPGRADES: {
    lung_capacity:  { name: "Enchanted Lungs",    baseCost: 50,  costMult: 1.8, maxLevel: 5, effect: 20 },
    swim_speed:     { name: "Mer-Fins",           baseCost: 40,  costMult: 1.6, maxLevel: 5, effect: 1.5 },
    armor:          { name: "Abyssal Plate",      baseCost: 60,  costMult: 2.0, maxLevel: 5, effect: 15 },
    sword:          { name: "Coral Blade",        baseCost: 45,  costMult: 1.7, maxLevel: 5, effect: 8 },
    light_radius:   { name: "Lantern of Avalon",  baseCost: 35,  costMult: 1.5, maxLevel: 5, effect: 5 },
    pressure_resist: { name: "Pressure Rune",     baseCost: 70,  costMult: 2.0, maxLevel: 5, effect: 1.5 },
    harpoon:        { name: "Harpoon Mastery",    baseCost: 55,  costMult: 1.8, maxLevel: 5, effect: 10 },
  } as Record<string, UpgradeDef>,

  // Particles
  PARTICLE_LIMIT: 300,
  BUBBLE_PARTICLE_RATE: 3,

  // Lighting
  PLAYER_LIGHT_RADIUS: 15,
  PLAYER_LIGHT_INTENSITY: 2.0,
  CAUSTIC_SPEED: 0.4,

  // God rays
  GOD_RAY_COUNT: 5,
  GOD_RAY_MAX_DEPTH: 60,

  // Enemy drops
  DROP_HP_CHANCE: 0.25,
  DROP_HP_AMOUNT: 15,
  DROP_O2_CHANCE: 0.20,
  DROP_O2_AMOUNT: 15,
  DROP_MAGNET_RANGE: 6,
  DROP_COLLECT_RANGE: 1.5,
  DROP_LIFETIME: 12,

  // Ambient fish schools
  FISH_SCHOOL_COUNT: 10,
  FISH_PER_SCHOOL: 8,
  FISH_SPEED: 2.5,
  FISH_FLEE_RANGE: 6,
  FISH_FLEE_SPEED: 8,
  FISH_SCHOOL_RADIUS: 3,

  // Charged attack (hold LMB)
  CHARGE_TIME: 1.0,        // seconds to fully charge
  CHARGE_DMG_MULT: 3.0,    // damage multiplier at full charge
  CHARGE_RANGE_MULT: 1.8,  // range multiplier
  CHARGE_AOE_RADIUS: 5.0,  // hits all enemies in this radius
  CHARGE_KNOCKBACK: 12,

  // Jellyfish
  JELLYFISH_COUNT: 15,
  JELLYFISH_SHOCK_DMG: 8,
  JELLYFISH_SHOCK_RADIUS: 1.5,
  JELLYFISH_SHOCK_COOLDOWN: 2.0,
  JELLYFISH_DRIFT_SPEED: 0.5,
  JELLYFISH_PULSE_SPEED: 2.0,

  // Excalibur (win condition)
  EXCALIBUR_DEPTH: 170,
  EXCALIBUR_RADIUS: 3.0,

  // Enemy attack telegraph
  TELEGRAPH_DURATION: 0.6,

  // Dive abilities (unlocked at depth milestones)
  DIVE_ABILITIES: [
    { id: "whirlwind",    name: "Whirlwind Strike",  desc: "Melee hits all 360 degrees",       depth: 15,  color: "#88ccff" },
    { id: "harpoon_spread", name: "Trident Shot",    desc: "Harpoon fires 3 projectiles",      depth: 40,  color: "#44ddaa" },
    { id: "tidal_shield",  name: "Tidal Shield",     desc: "Block next hit (recharges on kill)", depth: 70,  color: "#ffcc44" },
    { id: "blood_frenzy",  name: "Blood Frenzy",     desc: "+50% attack speed for 8s on kill streak", depth: 100, color: "#ff4466" },
    { id: "depth_surge",   name: "Depth Surge",      desc: "Dash deals 3x damage",              depth: 140, color: "#aa44ff" },
  ] as DiveAbilityDef[],

  // Curses (pre-dive debuffs for bonus rewards)
  CURSES: [
    { id: "fragile",     name: "Fragile",      desc: "Take 50% more damage",        rewardMult: 1.5,  color: "#ff4444" },
    { id: "breathless",  name: "Breathless",   desc: "O2 drains 2x faster",         rewardMult: 1.4,  color: "#4488dd" },
    { id: "darkness",    name: "Darkness",      desc: "Light radius halved",          rewardMult: 1.3,  color: "#334455" },
    { id: "swarmed",     name: "Swarmed",       desc: "Enemies spawn 50% faster",    rewardMult: 1.6,  color: "#ff8844" },
    { id: "glass_cannon", name: "Glass Cannon", desc: "2x damage dealt, 2x received", rewardMult: 1.8, color: "#ffdd00" },
  ] as CurseDef[],

  // Elite enemy modifiers (rare variants)
  ELITE_CHANCE: 0.12,  // 12% chance any spawned enemy is elite
  ELITE_HP_MULT: 2.0,
  ELITE_DMG_MULT: 1.5,
  ELITE_XP_MULT: 3.0,
  ELITE_MODIFIERS: ["armored", "swift", "burning", "vampiric", "splitting"] as string[],

  // Relic synergies
  RELIC_SYNERGIES: [
    { relics: ["trident_of_poseidon", "storm_pearl"], name: "Tempest", desc: "Dash AOE hits twice", color: "#44ddff" },
    { relics: ["neptunes_crown", "sirens_shell"],     name: "Ocean's Grace", desc: "Crits fully restore O2", color: "#88ffcc" },
    { relics: ["mermaids_tear", "coral_heart"],       name: "Life Current", desc: "Harpoon kills heal 10% HP", color: "#ff88aa" },
    { relics: ["abyssal_eye", "leviathan_scale"],     name: "Deep Sight", desc: "See enemies through walls, no pressure", color: "#aa66ff" },
  ] as RelicSynergyDef[],

  // Achievements
  ACHIEVEMENTS: [
    { id: "first_dive",      name: "Into the Deep",       desc: "Complete your first dive",    icon: "~" },
    { id: "depth_30",        name: "Reef Runner",         desc: "Reach 30m depth",             icon: "v" },
    { id: "depth_70",        name: "Twilight Diver",      desc: "Reach 70m depth",             icon: "V" },
    { id: "depth_120",       name: "Abyss Walker",        desc: "Reach 120m depth",            icon: "#" },
    { id: "depth_170",       name: "Heart Seeker",        desc: "Reach 170m depth",            icon: "*" },
    { id: "first_boss",      name: "Boss Slayer",         desc: "Defeat your first boss",      icon: "!" },
    { id: "all_bosses",      name: "Champion of Avalon",  desc: "Defeat all four bosses",      icon: "+" },
    { id: "combo_5",         name: "Frenzy",              desc: "Reach a 5x kill combo",       icon: "x" },
    { id: "combo_10",        name: "Unstoppable",         desc: "Reach a 10x kill combo",      icon: "X" },
    { id: "first_relic",     name: "Relic Hunter",        desc: "Collect your first relic",     icon: "o" },
    { id: "excalibur",       name: "The Once and Future",  desc: "Retrieve Excalibur",          icon: "E" },
    { id: "no_damage_boss",  name: "Flawless",            desc: "Defeat a boss without taking damage", icon: "F" },
    { id: "kill_100",        name: "Centurion",           desc: "Kill 100 enemies total",      icon: "C" },
  ] as AchievementDef[],

  // Screen flash
  FLASH_CRIT_COLOR: "rgba(255,200,100,0.25)",
  FLASH_LEVELUP_COLOR: "rgba(255,220,50,0.35)",
  FLASH_RELIC_COLOR: "rgba(150,100,255,0.3)",
  FLASH_EXCALIBUR_COLOR: "rgba(255,255,255,0.5)",
  FLASH_DURATION: 0.3,
} as const;

export interface EnemyDef {
  name: string;
  hp: number;
  dmg: number;
  speed: number;
  radius: number;
  aggroRange: number;
  color: number;
  glow: number;
  xp: number;
  minDepth: number;
}

export interface BossDef {
  name: string;
  hp: number;
  dmg: number;
  speed: number;
  radius: number;
  aggroRange: number;
  color: number;
  glow: number;
  xp: number;
  triggerDepth: number;
  goldReward: number;
}

export interface UpgradeDef {
  name: string;
  baseCost: number;
  costMult: number;
  maxLevel: number;
  effect: number;
}

export interface RelicDef {
  name: string;
  desc: string;
  color: number;
  rarity: "common" | "rare" | "legendary";
}

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
}

export interface DiveAbilityDef {
  id: string;
  name: string;
  desc: string;
  depth: number;
  color: string;
}

export interface CurseDef {
  id: string;
  name: string;
  desc: string;
  rewardMult: number;
  color: string;
}

export interface RelicSynergyDef {
  relics: string[];
  name: string;
  desc: string;
  color: string;
}
