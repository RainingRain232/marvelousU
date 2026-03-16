// ---------------------------------------------------------------------------
// Mage Wars FPS – Configuration: wands, characters, vehicles, maps
// ---------------------------------------------------------------------------

// ---- Wand (gun) definitions ------------------------------------------------

export interface WandDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  damage: number;
  fireRate: number;      // shots per second
  projectileSpeed: number;
  range: number;
  magicCost: number;     // mana per shot
  spread: number;        // radians of inaccuracy
  projectileColor: number;
  projectileTrailColor: number;
  projectileSize: number;
  isAuto: boolean;
  splashRadius: number;  // 0 = no splash
  headshotMult: number;
  reloadTime: number;    // seconds
  magPerReload: number;  // shots per magazine
  category: "primary" | "secondary" | "heavy";
}

export const WAND_DEFS: WandDef[] = [
  // --- Primary wands ---
  {
    id: "arcane_bolt", name: "Arcane Bolt Wand", icon: "\u2728",
    desc: "Reliable semi-auto arcane bolts. Balanced all-rounder.",
    damage: 22, fireRate: 4, projectileSpeed: 120, range: 100,
    magicCost: 3, spread: 0.015, projectileColor: 0x8888ff,
    projectileTrailColor: 0x6666cc, projectileSize: 0.12,
    isAuto: false, splashRadius: 0, headshotMult: 2.0,
    reloadTime: 1.5, magPerReload: 12, category: "primary",
  },
  {
    id: "fire_stream", name: "Flame Stream Staff", icon: "\uD83D\uDD25",
    desc: "Full-auto stream of fire. Short range, high DPS.",
    damage: 8, fireRate: 15, projectileSpeed: 80, range: 40,
    magicCost: 1, spread: 0.06, projectileColor: 0xff6600,
    projectileTrailColor: 0xff3300, projectileSize: 0.08,
    isAuto: true, splashRadius: 0, headshotMult: 1.3,
    reloadTime: 2.0, magPerReload: 60, category: "primary",
  },
  {
    id: "frost_rifle", name: "Frost Shard Rifle", icon: "\u2744\uFE0F",
    desc: "Precision ice shards. Slow fire, high damage, long range.",
    damage: 55, fireRate: 1.2, projectileSpeed: 160, range: 150,
    magicCost: 8, spread: 0.005, projectileColor: 0x88ddff,
    projectileTrailColor: 0x44aadd, projectileSize: 0.15,
    isAuto: false, splashRadius: 0, headshotMult: 2.5,
    reloadTime: 2.5, magPerReload: 5, category: "primary",
  },
  {
    id: "lightning_arc", name: "Lightning Arc Caster", icon: "\u26A1",
    desc: "Burst-fire lightning. Three bolts per trigger pull.",
    damage: 18, fireRate: 8, projectileSpeed: 200, range: 80,
    magicCost: 4, spread: 0.03, projectileColor: 0xffff44,
    projectileTrailColor: 0xcccc00, projectileSize: 0.1,
    isAuto: true, splashRadius: 0, headshotMult: 1.8,
    reloadTime: 1.8, magPerReload: 24, category: "primary",
  },
  {
    id: "shadow_repeater", name: "Shadow Repeater", icon: "\uD83C\uDF11",
    desc: "Rapid shadow bolts. SMG of the arcane world.",
    damage: 12, fireRate: 10, projectileSpeed: 100, range: 60,
    magicCost: 2, spread: 0.04, projectileColor: 0x8833aa,
    projectileTrailColor: 0x551188, projectileSize: 0.09,
    isAuto: true, splashRadius: 0, headshotMult: 1.5,
    reloadTime: 1.4, magPerReload: 30, category: "primary",
  },
  {
    id: "nature_thorns", name: "Thornlash Wand", icon: "\uD83C\uDF3F",
    desc: "Shoots thorn bursts that ricochet. Medium range.",
    damage: 16, fireRate: 6, projectileSpeed: 90, range: 70,
    magicCost: 3, spread: 0.025, projectileColor: 0x44aa22,
    projectileTrailColor: 0x228800, projectileSize: 0.1,
    isAuto: true, splashRadius: 0, headshotMult: 1.6,
    reloadTime: 1.6, magPerReload: 20, category: "primary",
  },
  // --- Secondary wands ---
  {
    id: "arcane_pistol", name: "Arcane Sidearm", icon: "\uD83D\uDD2E",
    desc: "Quick-draw arcane pistol. Reliable backup.",
    damage: 18, fireRate: 5, projectileSpeed: 110, range: 50,
    magicCost: 2, spread: 0.025, projectileColor: 0xaa88ff,
    projectileTrailColor: 0x8866dd, projectileSize: 0.08,
    isAuto: false, splashRadius: 0, headshotMult: 2.0,
    reloadTime: 1.0, magPerReload: 8, category: "secondary",
  },
  {
    id: "fire_burst", name: "Flameburst Orb", icon: "\u2604\uFE0F",
    desc: "Short-range fire shotgun blast. Devastating up close.",
    damage: 9, fireRate: 1.5, projectileSpeed: 70, range: 25,
    magicCost: 5, spread: 0.12, projectileColor: 0xff4400,
    projectileTrailColor: 0xcc2200, projectileSize: 0.06,
    isAuto: false, splashRadius: 0, headshotMult: 1.5,
    reloadTime: 1.8, magPerReload: 6, category: "secondary",
  },
  {
    id: "void_dagger", name: "Void Dagger", icon: "\uD83D\uDDE1\uFE0F",
    desc: "Extremely fast void bolts. Low damage, high fire rate.",
    damage: 10, fireRate: 12, projectileSpeed: 140, range: 40,
    magicCost: 1, spread: 0.035, projectileColor: 0x220044,
    projectileTrailColor: 0x110022, projectileSize: 0.06,
    isAuto: true, splashRadius: 0, headshotMult: 1.8,
    reloadTime: 0.8, magPerReload: 20, category: "secondary",
  },
  // --- Heavy wands ---
  {
    id: "meteor_launcher", name: "Meteor Launcher", icon: "\u2604\uFE0F",
    desc: "Fires explosive meteors. Slow but devastating AoE.",
    damage: 80, fireRate: 0.5, projectileSpeed: 50, range: 120,
    magicCost: 20, spread: 0.02, projectileColor: 0xff4400,
    projectileTrailColor: 0xff8800, projectileSize: 0.35,
    isAuto: false, splashRadius: 5, headshotMult: 1.0,
    reloadTime: 3.5, magPerReload: 3, category: "heavy",
  },
  {
    id: "ice_cannon", name: "Glacial Cannon", icon: "\uD83E\uDDCA",
    desc: "Massive ice boulder. Freezes on impact. Huge AoE.",
    damage: 60, fireRate: 0.4, projectileSpeed: 45, range: 100,
    magicCost: 25, spread: 0.03, projectileColor: 0x88eeff,
    projectileTrailColor: 0x44ccee, projectileSize: 0.4,
    isAuto: false, splashRadius: 6, headshotMult: 1.0,
    reloadTime: 4.0, magPerReload: 2, category: "heavy",
  },
  {
    id: "thunder_staff", name: "Thunderstrike Staff", icon: "\uD83C\uDF29\uFE0F",
    desc: "Calls lightning from sky on target area. Massive AoE.",
    damage: 70, fireRate: 0.6, projectileSpeed: 200, range: 130,
    magicCost: 18, spread: 0.01, projectileColor: 0xffffaa,
    projectileTrailColor: 0xffff44, projectileSize: 0.25,
    isAuto: false, splashRadius: 4, headshotMult: 1.0,
    reloadTime: 3.0, magPerReload: 4, category: "heavy",
  },
];

// ---- Mage character classes ------------------------------------------------

export interface MageClassDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  hp: number;
  mana: number;
  manaRegen: number;   // per second
  speed: number;        // movement speed multiplier
  armor: number;        // damage reduction %
  ability: string;      // special ability name
  abilityDesc: string;
  abilityCooldown: number; // seconds
  robeColor: number;
  accentColor: number;
  hatStyle: "pointy" | "hood" | "crown" | "circlet" | "skull" | "helm";
  defaultPrimary: string;
  defaultSecondary: string;
}

export const MAGE_CLASSES: MageClassDef[] = [
  {
    id: "battlemage", name: "Battlemage", icon: "\u2694\uFE0F",
    desc: "Balanced fighter. Good HP and damage. Shield ability.",
    hp: 120, mana: 80, manaRegen: 5, speed: 1.0, armor: 15,
    ability: "Arcane Shield", abilityDesc: "Absorbs 50 damage for 4s",
    abilityCooldown: 15,
    robeColor: 0x334488, accentColor: 0x6688cc, hatStyle: "helm",
    defaultPrimary: "arcane_bolt", defaultSecondary: "arcane_pistol",
  },
  {
    id: "pyromancer", name: "Pyromancer", icon: "\uD83D\uDD25",
    desc: "Fire specialist. High damage, lower HP. Fireball ability.",
    hp: 90, mana: 100, manaRegen: 6, speed: 1.05, armor: 5,
    ability: "Inferno Burst", abilityDesc: "AoE fire explosion around self",
    abilityCooldown: 12,
    robeColor: 0x881100, accentColor: 0xff6600, hatStyle: "pointy",
    defaultPrimary: "fire_stream", defaultSecondary: "fire_burst",
  },
  {
    id: "cryomancer", name: "Cryomancer", icon: "\u2744\uFE0F",
    desc: "Ice specialist. Precision damage. Freeze ability.",
    hp: 95, mana: 90, manaRegen: 5, speed: 1.0, armor: 10,
    ability: "Flash Freeze", abilityDesc: "Freezes nearby enemies for 2s",
    abilityCooldown: 18,
    robeColor: 0x114466, accentColor: 0x88ddff, hatStyle: "circlet",
    defaultPrimary: "frost_rifle", defaultSecondary: "arcane_pistol",
  },
  {
    id: "stormcaller", name: "Stormcaller", icon: "\u26A1",
    desc: "Lightning mage. Fast attacks. Chain lightning ability.",
    hp: 100, mana: 95, manaRegen: 7, speed: 1.1, armor: 8,
    ability: "Chain Lightning", abilityDesc: "Lightning bounces to 3 targets",
    abilityCooldown: 14,
    robeColor: 0x444400, accentColor: 0xffff44, hatStyle: "hood",
    defaultPrimary: "lightning_arc", defaultSecondary: "void_dagger",
  },
  {
    id: "shadowmancer", name: "Shadowmancer", icon: "\uD83C\uDF11",
    desc: "Stealth and shadow magic. Can go invisible.",
    hp: 85, mana: 110, manaRegen: 8, speed: 1.15, armor: 5,
    ability: "Shadow Veil", abilityDesc: "Invisible for 5s. Breaks on attack",
    abilityCooldown: 20,
    robeColor: 0x1a0a2e, accentColor: 0x8833aa, hatStyle: "skull",
    defaultPrimary: "shadow_repeater", defaultSecondary: "void_dagger",
  },
  {
    id: "druid", name: "Druid", icon: "\uD83C\uDF3F",
    desc: "Nature mage. Heals allies. Tanky with nature armor.",
    hp: 130, mana: 100, manaRegen: 6, speed: 0.95, armor: 12,
    ability: "Nature's Embrace", abilityDesc: "Heal self and nearby allies 40hp",
    abilityCooldown: 16,
    robeColor: 0x225511, accentColor: 0x44aa22, hatStyle: "crown",
    defaultPrimary: "nature_thorns", defaultSecondary: "arcane_pistol",
  },
  {
    id: "warlock", name: "Warlock", icon: "\uD83D\uDC80",
    desc: "Dark mage. Life steal attacks. Summons a damage aura.",
    hp: 95, mana: 120, manaRegen: 7, speed: 1.0, armor: 8,
    ability: "Soul Drain", abilityDesc: "Drain 30hp from nearest enemy",
    abilityCooldown: 13,
    robeColor: 0x2a0a0a, accentColor: 0xcc2244, hatStyle: "skull",
    defaultPrimary: "shadow_repeater", defaultSecondary: "fire_burst",
  },
  {
    id: "archmage", name: "Archmage", icon: "\uD83C\uDF1F",
    desc: "Master of all. High mana. Teleport ability.",
    hp: 100, mana: 130, manaRegen: 9, speed: 1.0, armor: 10,
    ability: "Blink", abilityDesc: "Teleport forward 15m instantly",
    abilityCooldown: 10,
    robeColor: 0x553388, accentColor: 0xddaaff, hatStyle: "pointy",
    defaultPrimary: "arcane_bolt", defaultSecondary: "arcane_pistol",
  },
];

// ---- Vehicle (mount) definitions -------------------------------------------

export interface VehicleDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  type: "ground" | "air_hover" | "air_fly";
  hp: number;
  speed: number;
  turnSpeed: number;
  weaponDamage: number;
  weaponFireRate: number;
  weaponRange: number;
  weaponProjectileColor: number;
  weaponSplashRadius: number;
  seats: number;           // including driver
  bodyColor: number;
  accentColor: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  altitude: number;        // flight altitude for air vehicles
  spawnWeight: number;     // how many spawn per map (0 = team-only)
  // Secondary weapon — distinct from primary (e.g. rapid-fire vs slow cannon)
  secondaryName: string;
  secondaryDamage: number;
  secondaryFireRate: number;
  secondaryRange: number;
  secondaryProjectileColor: number;
  secondarySplashRadius: number;
  secondaryProjectileSpeed: number;
  secondaryProjectileSize: number;
}

export const VEHICLE_DEFS: VehicleDef[] = [
  // --- Ground vehicles (tanks) ---
  {
    id: "war_rhino", name: "War Rhino", icon: "\uD83E\uDD8F",
    desc: "Armored rhino. Slow, tough, devastating horn cannon. The tank.",
    type: "ground", hp: 800, speed: 8, turnSpeed: 1.2,
    weaponDamage: 100, weaponFireRate: 0.4, weaponRange: 100,
    weaponProjectileColor: 0xffaa00, weaponSplashRadius: 6,
    seats: 2, bodyColor: 0x666666, accentColor: 0x888888,
    scaleX: 2.5, scaleY: 1.8, scaleZ: 4.0, altitude: 0, spawnWeight: 1,
    secondaryName: "Chain Lightning", secondaryDamage: 20, secondaryFireRate: 3.0,
    secondaryRange: 50, secondaryProjectileColor: 0x44ddff, secondarySplashRadius: 0,
    secondaryProjectileSpeed: 120, secondaryProjectileSize: 0.15,
  },
  {
    id: "iron_tortoise", name: "Iron Tortoise", icon: "\uD83D\uDC22",
    desc: "Massive armored turtle. Extremely tough. Slow siege platform.",
    type: "ground", hp: 1200, speed: 5, turnSpeed: 0.8,
    weaponDamage: 120, weaponFireRate: 0.3, weaponRange: 120,
    weaponProjectileColor: 0x44ff44, weaponSplashRadius: 8,
    seats: 3, bodyColor: 0x445544, accentColor: 0x336633,
    scaleX: 3.0, scaleY: 2.0, scaleZ: 4.5, altitude: 0, spawnWeight: 1,
    secondaryName: "Toxic Spray", secondaryDamage: 8, secondaryFireRate: 8.0,
    secondaryRange: 30, secondaryProjectileColor: 0x88ff44, secondarySplashRadius: 1,
    secondaryProjectileSpeed: 60, secondaryProjectileSize: 0.12,
  },
  {
    id: "dire_boar", name: "Dire Boar", icon: "\uD83D\uDC17",
    desc: "Fast armored boar. Light tank / APC. Quick but less armor.",
    type: "ground", hp: 500, speed: 14, turnSpeed: 2.0,
    weaponDamage: 40, weaponFireRate: 1.5, weaponRange: 60,
    weaponProjectileColor: 0xcc8844, weaponSplashRadius: 3,
    seats: 2, bodyColor: 0x553322, accentColor: 0x884422,
    scaleX: 1.8, scaleY: 1.4, scaleZ: 3.0, altitude: 0, spawnWeight: 2,
    secondaryName: "Tusk Barrage", secondaryDamage: 60, secondaryFireRate: 0.6,
    secondaryRange: 40, secondaryProjectileColor: 0xffee88, secondarySplashRadius: 4,
    secondaryProjectileSpeed: 70, secondaryProjectileSize: 0.25,
  },
  {
    id: "war_elephant", name: "War Elephant", icon: "\uD83D\uDC18",
    desc: "Massive war elephant. Mobile fortress. Mounted ballista.",
    type: "ground", hp: 1000, speed: 7, turnSpeed: 1.0,
    weaponDamage: 90, weaponFireRate: 0.5, weaponRange: 110,
    weaponProjectileColor: 0xddddaa, weaponSplashRadius: 5,
    seats: 4, bodyColor: 0x777766, accentColor: 0xaa9955,
    scaleX: 3.5, scaleY: 3.0, scaleZ: 5.0, altitude: 0, spawnWeight: 1,
    secondaryName: "War Drum Pulse", secondaryDamage: 30, secondaryFireRate: 1.0,
    secondaryRange: 25, secondaryProjectileColor: 0xffcc66, secondarySplashRadius: 10,
    secondaryProjectileSpeed: 40, secondaryProjectileSize: 0.5,
  },
  // --- Air vehicles (helicopters / hover) ---
  {
    id: "drake", name: "War Drake", icon: "\uD83D\uDC09",
    desc: "Hovering drake. Attack helicopter of the skies. Agile & deadly.",
    type: "air_hover", hp: 400, speed: 18, turnSpeed: 2.5,
    weaponDamage: 25, weaponFireRate: 4, weaponRange: 80,
    weaponProjectileColor: 0xff4444, weaponSplashRadius: 2,
    seats: 2, bodyColor: 0x882222, accentColor: 0xcc4444,
    scaleX: 2.5, scaleY: 1.5, scaleZ: 4.0, altitude: 12, spawnWeight: 1,
    secondaryName: "Inferno Bomb", secondaryDamage: 80, secondaryFireRate: 0.3,
    secondaryRange: 60, secondaryProjectileColor: 0xff6600, secondarySplashRadius: 8,
    secondaryProjectileSpeed: 50, secondaryProjectileSize: 0.4,
  },
  {
    id: "wyvern", name: "Wyvern", icon: "\uD83E\uDD85",
    desc: "Smaller wyvern. Scout helicopter. Fast, light weapons.",
    type: "air_hover", hp: 250, speed: 22, turnSpeed: 3.0,
    weaponDamage: 15, weaponFireRate: 6, weaponRange: 70,
    weaponProjectileColor: 0x44ccff, weaponSplashRadius: 1,
    seats: 1, bodyColor: 0x335577, accentColor: 0x5588aa,
    scaleX: 2.0, scaleY: 1.2, scaleZ: 3.5, altitude: 15, spawnWeight: 2,
    secondaryName: "Frost Shard", secondaryDamage: 45, secondaryFireRate: 0.8,
    secondaryRange: 90, secondaryProjectileColor: 0xaaeeff, secondarySplashRadius: 0,
    secondaryProjectileSpeed: 100, secondaryProjectileSize: 0.2,
  },
  {
    id: "giant_bat", name: "Giant Bat", icon: "\uD83E\uDD87",
    desc: "Stealth flyer. Low profile, fast, weak armor.",
    type: "air_hover", hp: 200, speed: 24, turnSpeed: 3.5,
    weaponDamage: 12, weaponFireRate: 5, weaponRange: 50,
    weaponProjectileColor: 0x8833aa, weaponSplashRadius: 0,
    seats: 1, bodyColor: 0x221133, accentColor: 0x443366,
    scaleX: 2.2, scaleY: 0.8, scaleZ: 2.5, altitude: 10, spawnWeight: 2,
    secondaryName: "Sonic Screech", secondaryDamage: 35, secondaryFireRate: 0.5,
    secondaryRange: 35, secondaryProjectileColor: 0xcc66ff, secondarySplashRadius: 6,
    secondaryProjectileSpeed: 45, secondaryProjectileSize: 0.35,
  },
  // --- Air vehicles (jets / fast flyers) ---
  {
    id: "dragon", name: "Elder Dragon", icon: "\uD83D\uDC32",
    desc: "The jet fighter. Blazing fast, fire breath, hard to control.",
    type: "air_fly", hp: 600, speed: 35, turnSpeed: 1.5,
    weaponDamage: 50, weaponFireRate: 2, weaponRange: 120,
    weaponProjectileColor: 0xff8800, weaponSplashRadius: 7,
    seats: 1, bodyColor: 0x881100, accentColor: 0xff4400,
    scaleX: 3.5, scaleY: 2.0, scaleZ: 6.0, altitude: 25, spawnWeight: 1,
    secondaryName: "Dragon Breath", secondaryDamage: 15, secondaryFireRate: 10.0,
    secondaryRange: 40, secondaryProjectileColor: 0xff4400, secondarySplashRadius: 2,
    secondaryProjectileSpeed: 55, secondaryProjectileSize: 0.18,
  },
  {
    id: "phoenix", name: "Phoenix", icon: "\uD83D\uDD25",
    desc: "Blazing bird of fire. Fast bomber. Drops fire trails.",
    type: "air_fly", hp: 350, speed: 30, turnSpeed: 2.0,
    weaponDamage: 40, weaponFireRate: 1.5, weaponRange: 100,
    weaponProjectileColor: 0xffaa00, weaponSplashRadius: 5,
    seats: 1, bodyColor: 0xff4400, accentColor: 0xffcc00,
    scaleX: 3.0, scaleY: 1.5, scaleZ: 5.0, altitude: 22, spawnWeight: 1,
    secondaryName: "Ash Cloud", secondaryDamage: 25, secondaryFireRate: 0.6,
    secondaryRange: 50, secondaryProjectileColor: 0x885533, secondarySplashRadius: 12,
    secondaryProjectileSpeed: 35, secondaryProjectileSize: 0.6,
  },
  {
    id: "griffin", name: "Royal Griffin", icon: "\uD83E\uDD85",
    desc: "Balanced flyer. Good speed, good weapons. Fighter-bomber.",
    type: "air_fly", hp: 450, speed: 28, turnSpeed: 1.8,
    weaponDamage: 35, weaponFireRate: 2.5, weaponRange: 90,
    weaponProjectileColor: 0xffddaa, weaponSplashRadius: 4,
    seats: 2, bodyColor: 0xaa8844, accentColor: 0xddcc88,
    scaleX: 3.0, scaleY: 1.8, scaleZ: 5.0, altitude: 20, spawnWeight: 1,
    secondaryName: "Talon Rockets", secondaryDamage: 55, secondaryFireRate: 0.7,
    secondaryRange: 80, secondaryProjectileColor: 0xffaa66, secondarySplashRadius: 5,
    secondaryProjectileSpeed: 90, secondaryProjectileSize: 0.22,
  },
];

// ---- Map definitions -------------------------------------------------------

export interface MapDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  size: number;              // half-extent of playable area
  groundColor: number;
  groundColor2: number;
  fogColor: number;
  fogDensity: number;
  skyTopColor: number;
  skyMidColor: number;
  skyHorizonColor: number;
  sunColor: number;
  sunIntensity: number;
  ambientIntensity: number;
  treeCount: number;
  rockCount: number;
  bushCount: number;
  hillAmplitude: number;
  hillFrequency: number;
  waterLevel: number;        // -999 = no water
  treeColor: number;
  treeColor2: number;
  spawnDistance: number;     // distance between team spawns
  vehicleSpawnPoints: number;
  // Environmental detail fields (optional, used by _addMapSpecificDecor)
  envAnimals?: Array<{ type: "bird" | "deer" | "wolf" | "fish" | "butterfly" | "bat" | "crab" | "firefly"; count: number }>;
  envProps?: Array<{ type: string; count: number; color?: number }>;
  mapVehicles?: Array<{ defId: string; count: number }>;  // map-specific mountable vehicles
}

export const MAP_DEFS: MapDef[] = [
  {
    id: "enchanted_forest", name: "Enchanted Forest", icon: "\uD83C\uDF32",
    desc: "Dense magical forest. Close-quarters combat. Lots of cover.",
    size: 100,
    groundColor: 0x2d4a1e, groundColor2: 0x3a5c2a,
    fogColor: 0x4a6a3a, fogDensity: 0.018,
    skyTopColor: 0x1a4420, skyMidColor: 0x3a6a3a, skyHorizonColor: 0x8aaa7a,
    sunColor: 0xddeeaa, sunIntensity: 1.5, ambientIntensity: 0.7,
    treeCount: 120, rockCount: 40, bushCount: 80,
    hillAmplitude: 2.0, hillFrequency: 0.05,
    waterLevel: -999,
    treeColor: 0x225511, treeColor2: 0x337722,
    spawnDistance: 140, vehicleSpawnPoints: 3,
  },
  {
    id: "golden_grasslands", name: "Golden Grasslands", icon: "\uD83C\uDF3E",
    desc: "Wide open grasslands. Long sight lines. Vehicle warfare.",
    size: 140,
    groundColor: 0x8a7a3a, groundColor2: 0x9a8a4a,
    fogColor: 0xc8c090, fogDensity: 0.008,
    skyTopColor: 0x3a78c9, skyMidColor: 0x7ab4d8, skyHorizonColor: 0xc8dde8,
    sunColor: 0xffecc0, sunIntensity: 2.0, ambientIntensity: 0.65,
    treeCount: 15, rockCount: 20, bushCount: 30,
    hillAmplitude: 1.0, hillFrequency: 0.03,
    waterLevel: -0.5,
    treeColor: 0x557733, treeColor2: 0x668844,
    spawnDistance: 200, vehicleSpawnPoints: 5,
  },
  {
    id: "mystic_hills", name: "Mystic Hills", icon: "\u26F0\uFE0F",
    desc: "Rolling hills and valleys. Elevation advantage matters.",
    size: 120,
    groundColor: 0x5a6a4a, groundColor2: 0x4a5a3a,
    fogColor: 0x8a9aaa, fogDensity: 0.012,
    skyTopColor: 0x2a5599, skyMidColor: 0x6a99bb, skyHorizonColor: 0xaabbcc,
    sunColor: 0xffdda0, sunIntensity: 1.8, ambientIntensity: 0.6,
    treeCount: 40, rockCount: 60, bushCount: 50,
    hillAmplitude: 5.0, hillFrequency: 0.04,
    waterLevel: -999,
    treeColor: 0x3a6633, treeColor2: 0x4a7744,
    spawnDistance: 170, vehicleSpawnPoints: 4,
  },
  {
    id: "frozen_tundra", name: "Frozen Tundra", icon: "❄️",
    desc: "Barren snow-swept plains. Sparse cover among icy rocks. Good for mixed combat.",
    size: 130,
    groundColor: 0xd8e8f0, groundColor2: 0xc0d8e8,
    fogColor: 0xc8ddf0, fogDensity: 0.010,
    skyTopColor: 0x4a6a99, skyMidColor: 0x8aaac8, skyHorizonColor: 0xd0e0f0,
    sunColor: 0xe8eeff, sunIntensity: 1.6, ambientIntensity: 0.75,
    treeCount: 10, rockCount: 80, bushCount: 15,
    hillAmplitude: 3.0, hillFrequency: 0.04,
    waterLevel: -999,
    treeColor: 0x556677, treeColor2: 0x667788,
    spawnDistance: 180, vehicleSpawnPoints: 4,
  },
  {
    id: "volcanic_wastes", name: "Volcanic Wastes", icon: "🌋",
    desc: "Scorched volcanic landscape. Lava pools and boulders. Built for vehicle warfare.",
    size: 150,
    groundColor: 0x2a1a0a, groundColor2: 0x3a2010,
    fogColor: 0x4a2a1a, fogDensity: 0.020,
    skyTopColor: 0x1a0a00, skyMidColor: 0x4a2210, skyHorizonColor: 0x994422,
    sunColor: 0xff8833, sunIntensity: 1.4, ambientIntensity: 0.5,
    treeCount: 0, rockCount: 90, bushCount: 10,
    hillAmplitude: 4.0, hillFrequency: 0.035,
    waterLevel: -0.3,
    treeColor: 0x332211, treeColor2: 0x443322,
    spawnDistance: 210, vehicleSpawnPoints: 6,
  },
  {
    id: "crystal_caverns", name: "Crystal Caverns", icon: "💎",
    desc: "Underground cavern glittering with crystals. Tight spaces and rocky terrain.",
    size: 110,
    groundColor: 0x2a2040, groundColor2: 0x3a2850,
    fogColor: 0x3a2860, fogDensity: 0.025,
    skyTopColor: 0x100820, skyMidColor: 0x2a1840, skyHorizonColor: 0x4a3070,
    sunColor: 0xbb99ff, sunIntensity: 1.0, ambientIntensity: 0.6,
    treeCount: 12, rockCount: 100, bushCount: 20,
    hillAmplitude: 3.5, hillFrequency: 0.05,
    waterLevel: -999,
    treeColor: 0x6644aa, treeColor2: 0x7755bb,
    spawnDistance: 150, vehicleSpawnPoints: 3,
  },
  {
    id: "sunken_ruins", name: "Sunken Ruins", icon: "🏛️",
    desc: "Ancient flooded ruins reclaimed by nature. Shallow waters and crumbling stone.",
    size: 120,
    groundColor: 0x5a6a6a, groundColor2: 0x4a5a5a,
    fogColor: 0x6a8a8a, fogDensity: 0.014,
    skyTopColor: 0x3a6688, skyMidColor: 0x6a99aa, skyHorizonColor: 0xaacccc,
    sunColor: 0xddeecc, sunIntensity: 1.5, ambientIntensity: 0.65,
    treeCount: 35, rockCount: 50, bushCount: 40,
    hillAmplitude: 1.0, hillFrequency: 0.03,
    waterLevel: 0.5,
    treeColor: 0x3a6644, treeColor2: 0x4a7755,
    spawnDistance: 160, vehicleSpawnPoints: 4,
  },
  {
    id: "shadow_realm", name: "Shadow Realm", icon: "👁️",
    desc: "Dark nightmare dimension. Eerie fog and twisted dead trees. Infantry-focused.",
    size: 110,
    groundColor: 0x1a0a1a, groundColor2: 0x200e20,
    fogColor: 0x1a1a2a, fogDensity: 0.022,
    skyTopColor: 0x0a0010, skyMidColor: 0x1a0a2a, skyHorizonColor: 0x2a1a3a,
    sunColor: 0x44ff66, sunIntensity: 0.8, ambientIntensity: 0.4,
    treeCount: 25, rockCount: 45, bushCount: 30,
    hillAmplitude: 5.0, hillFrequency: 0.045,
    waterLevel: -999,
    treeColor: 0x1a1a1a, treeColor2: 0x2a2a2a,
    spawnDistance: 150, vehicleSpawnPoints: 3,
    envAnimals: [{ type: "bat", count: 12 }, { type: "firefly", count: 20 }],
  },
  // ---- NEW MAPS ----
  {
    id: "ancient_ruins", name: "Ancient Ruins", icon: "\uD83C\uDFDB\uFE0F",
    desc: "Crumbling temple complex. Broken columns and overgrown courtyards. Mid-range combat.",
    size: 115,
    groundColor: 0x6a6050, groundColor2: 0x7a7060,
    fogColor: 0x9a9080, fogDensity: 0.012,
    skyTopColor: 0x3a6699, skyMidColor: 0x7a99bb, skyHorizonColor: 0xbbccdd,
    sunColor: 0xffddaa, sunIntensity: 1.8, ambientIntensity: 0.65,
    treeCount: 20, rockCount: 30, bushCount: 40,
    hillAmplitude: 1.5, hillFrequency: 0.03,
    waterLevel: -999,
    treeColor: 0x446633, treeColor2: 0x557744,
    spawnDistance: 160, vehicleSpawnPoints: 3,
    envAnimals: [{ type: "bird", count: 8 }, { type: "butterfly", count: 12 }],
    envProps: [
      { type: "broken_column", count: 25, color: 0x999988 },
      { type: "crumbling_wall", count: 15, color: 0x887766 },
      { type: "fallen_statue", count: 6, color: 0xaaaaaa },
      { type: "stone_archway", count: 4, color: 0x998877 },
    ],
  },
  {
    id: "dense_forest", name: "Whispering Woods", icon: "\uD83C\uDF33",
    desc: "Primeval forest with massive ancient trees. Deer roam the misty glades. Close quarters.",
    size: 95,
    groundColor: 0x1a3a10, groundColor2: 0x2a4a1a,
    fogColor: 0x3a5a2a, fogDensity: 0.025,
    skyTopColor: 0x1a3320, skyMidColor: 0x2a5530, skyHorizonColor: 0x6a8a5a,
    sunColor: 0xccddaa, sunIntensity: 1.2, ambientIntensity: 0.75,
    treeCount: 180, rockCount: 30, bushCount: 120,
    hillAmplitude: 1.5, hillFrequency: 0.04,
    waterLevel: -999,
    treeColor: 0x1a4410, treeColor2: 0x2a5520,
    spawnDistance: 130, vehicleSpawnPoints: 1,
    envAnimals: [{ type: "deer", count: 6 }, { type: "bird", count: 15 }, { type: "butterfly", count: 10 }],
    envProps: [
      { type: "fallen_log", count: 20 },
      { type: "mushroom_ring", count: 8, color: 0xcc3322 },
      { type: "hollow_stump", count: 5, color: 0x3a2a10 },
    ],
  },
  {
    id: "volcanic_caldera", name: "Inferno Caldera", icon: "\uD83C\uDF0B",
    desc: "Active volcano with lava rivers and obsidian spires. Extreme heat. Heavy vehicle territory.",
    size: 140,
    groundColor: 0x1a0a00, groundColor2: 0x2a1508,
    fogColor: 0x3a1a0a, fogDensity: 0.022,
    skyTopColor: 0x0a0000, skyMidColor: 0x3a1100, skyHorizonColor: 0x882200,
    sunColor: 0xff6622, sunIntensity: 1.2, ambientIntensity: 0.45,
    treeCount: 0, rockCount: 100, bushCount: 0,
    hillAmplitude: 6.0, hillFrequency: 0.03,
    waterLevel: -0.8,
    treeColor: 0x1a1a1a, treeColor2: 0x2a2a2a,
    spawnDistance: 200, vehicleSpawnPoints: 6,
    envAnimals: [{ type: "firefly", count: 30 }],
    envProps: [
      { type: "obsidian_spire", count: 20, color: 0x111122 },
      { type: "lava_geyser", count: 8, color: 0xff4400 },
      { type: "charred_skeleton", count: 10, color: 0x332211 },
      { type: "volcanic_vent", count: 6, color: 0xff6600 },
    ],
  },
  {
    id: "frozen_fortress", name: "Frostpeak Citadel", icon: "\uD83C\uDFF0",
    desc: "Frozen mountain fortress with ice bridges and blizzard winds. Wolves prowl the snowdrifts.",
    size: 125,
    groundColor: 0xc8d8e8, groundColor2: 0xb0c8d8,
    fogColor: 0xd0e0f0, fogDensity: 0.014,
    skyTopColor: 0x3a5080, skyMidColor: 0x6a8aaa, skyHorizonColor: 0xc0d0e0,
    sunColor: 0xccddff, sunIntensity: 1.4, ambientIntensity: 0.7,
    treeCount: 8, rockCount: 70, bushCount: 10,
    hillAmplitude: 4.5, hillFrequency: 0.04,
    waterLevel: -999,
    treeColor: 0x445566, treeColor2: 0x556677,
    spawnDistance: 175, vehicleSpawnPoints: 4,
    envAnimals: [{ type: "wolf", count: 5 }, { type: "bird", count: 4 }],
    envProps: [
      { type: "ice_pillar", count: 15, color: 0x88ccee },
      { type: "snow_drift", count: 25, color: 0xe8f0ff },
      { type: "frozen_waterfall", count: 3, color: 0x88ddff },
      { type: "ruined_tower", count: 4, color: 0x667788 },
    ],
  },
  {
    id: "desert_oasis", name: "Mirage Oasis", icon: "\uD83C\uDFDC\uFE0F",
    desc: "Vast desert with a shimmering oasis at center. Magic carpets soar above the dunes.",
    size: 150,
    groundColor: 0xc8a050, groundColor2: 0xd8b060,
    fogColor: 0xd8c898, fogDensity: 0.008,
    skyTopColor: 0x2266aa, skyMidColor: 0x5599cc, skyHorizonColor: 0xddc888,
    sunColor: 0xffe8a0, sunIntensity: 2.2, ambientIntensity: 0.7,
    treeCount: 8, rockCount: 25, bushCount: 5,
    hillAmplitude: 2.5, hillFrequency: 0.025,
    waterLevel: -1.5,
    treeColor: 0x448833, treeColor2: 0x559944,
    spawnDistance: 210, vehicleSpawnPoints: 5,
    envAnimals: [{ type: "bird", count: 6 }],
    envProps: [
      { type: "sand_dune", count: 20, color: 0xd8b868 },
      { type: "cactus", count: 15, color: 0x447733 },
      { type: "desert_tent", count: 6, color: 0xcc9944 },
      { type: "oasis_pool", count: 2, color: 0x2288aa },
    ],
    mapVehicles: [{ defId: "magic_carpet", count: 4 }],
  },
  {
    id: "haunted_graveyard", name: "Haunted Graveyard", icon: "\uD83E\uDEA6",
    desc: "Fog-shrouded graveyard with crypts and ghost ships. Bats circle overhead. Eerie and close-quarters.",
    size: 105,
    groundColor: 0x2a2520, groundColor2: 0x3a3530,
    fogColor: 0x2a3040, fogDensity: 0.028,
    skyTopColor: 0x0a0a15, skyMidColor: 0x1a1a30, skyHorizonColor: 0x2a3040,
    sunColor: 0x8888aa, sunIntensity: 0.7, ambientIntensity: 0.4,
    treeCount: 15, rockCount: 50, bushCount: 20,
    hillAmplitude: 1.5, hillFrequency: 0.05,
    waterLevel: -999,
    treeColor: 0x1a1515, treeColor2: 0x2a2020,
    spawnDistance: 140, vehicleSpawnPoints: 2,
    envAnimals: [{ type: "bat", count: 18 }, { type: "firefly", count: 15 }],
    envProps: [
      { type: "gravestone", count: 40, color: 0x555555 },
      { type: "crypt", count: 6, color: 0x444444 },
      { type: "dead_tree", count: 12, color: 0x2a1a10 },
      { type: "iron_fence", count: 20, color: 0x333333 },
      { type: "ghost_lantern", count: 8, color: 0x44ff88 },
    ],
    mapVehicles: [{ defId: "ghost_ship", count: 2 }],
  },
  {
    id: "floating_islands", name: "Skyshatter Isles", icon: "\uD83C\uDFDD\uFE0F",
    desc: "Floating island archipelago high in the sky. Bridges connect the isles. Griffin nests on peaks.",
    size: 130,
    groundColor: 0x4a6a3a, groundColor2: 0x5a7a4a,
    fogColor: 0x8ab0d0, fogDensity: 0.006,
    skyTopColor: 0x1a5599, skyMidColor: 0x55aadd, skyHorizonColor: 0xbbddff,
    sunColor: 0xfff0cc, sunIntensity: 2.0, ambientIntensity: 0.75,
    treeCount: 25, rockCount: 40, bushCount: 35,
    hillAmplitude: 8.0, hillFrequency: 0.035,
    waterLevel: -999,
    treeColor: 0x338822, treeColor2: 0x44aa33,
    spawnDistance: 180, vehicleSpawnPoints: 5,
    envAnimals: [{ type: "bird", count: 20 }, { type: "butterfly", count: 8 }],
    envProps: [
      { type: "floating_rock", count: 30, color: 0x667766 },
      { type: "sky_bridge", count: 6, color: 0x887755 },
      { type: "wind_crystal", count: 10, color: 0x88ddff },
      { type: "griffin_nest", count: 4, color: 0x886644 },
    ],
    mapVehicles: [{ defId: "sky_gondola", count: 3 }],
  },
  {
    id: "underground_caverns", name: "Deepstone Caverns", icon: "\u26CF\uFE0F",
    desc: "Vast underground cave system with bioluminescent fungi and underground rivers. Tight corridors.",
    size: 100,
    groundColor: 0x2a2030, groundColor2: 0x3a2840,
    fogColor: 0x2a2840, fogDensity: 0.030,
    skyTopColor: 0x0a0818, skyMidColor: 0x1a1028, skyHorizonColor: 0x2a1838,
    sunColor: 0x6644aa, sunIntensity: 0.6, ambientIntensity: 0.5,
    treeCount: 0, rockCount: 120, bushCount: 10,
    hillAmplitude: 4.0, hillFrequency: 0.06,
    waterLevel: -2.0,
    treeColor: 0x4422aa, treeColor2: 0x5533bb,
    spawnDistance: 140, vehicleSpawnPoints: 2,
    envAnimals: [{ type: "bat", count: 15 }, { type: "fish", count: 8 }],
    envProps: [
      { type: "stalactite", count: 30, color: 0x554455 },
      { type: "stalagmite", count: 25, color: 0x554455 },
      { type: "glowing_mushroom", count: 35, color: 0x44cc88 },
      { type: "crystal_cluster", count: 15, color: 0xaa44ff },
      { type: "underground_pool", count: 4, color: 0x224466 },
    ],
  },
  {
    id: "coastal_cliffs", name: "Stormbreaker Coast", icon: "\uD83C\uDF0A",
    desc: "Dramatic sea cliffs with crashing waves below. Ghost ships patrol the foggy waters. Long sightlines.",
    size: 135,
    groundColor: 0x5a6a5a, groundColor2: 0x6a7a6a,
    fogColor: 0x8a9aaa, fogDensity: 0.010,
    skyTopColor: 0x2a4a77, skyMidColor: 0x5a7a99, skyHorizonColor: 0x8aaabb,
    sunColor: 0xddccaa, sunIntensity: 1.5, ambientIntensity: 0.6,
    treeCount: 15, rockCount: 70, bushCount: 25,
    hillAmplitude: 5.0, hillFrequency: 0.04,
    waterLevel: -1.0,
    treeColor: 0x335533, treeColor2: 0x446644,
    spawnDistance: 190, vehicleSpawnPoints: 4,
    envAnimals: [{ type: "bird", count: 12 }, { type: "crab", count: 10 }],
    envProps: [
      { type: "lighthouse", count: 2, color: 0xeeeecc },
      { type: "shipwreck", count: 3, color: 0x553322 },
      { type: "cliff_face", count: 8, color: 0x667766 },
      { type: "tide_pool", count: 6, color: 0x2288aa },
      { type: "driftwood", count: 15, color: 0x6a5533 },
    ],
    mapVehicles: [{ defId: "ghost_ship", count: 2 }],
  },
  {
    id: "enchanted_garden", name: "Arcane Gardens", icon: "\uD83C\uDF3A",
    desc: "Magical garden of impossible beauty. Giant flowers, singing fountains, and butterflies everywhere.",
    size: 110,
    groundColor: 0x2a5a20, groundColor2: 0x3a6a30,
    fogColor: 0x5a8a5a, fogDensity: 0.010,
    skyTopColor: 0x2a6699, skyMidColor: 0x5a99cc, skyHorizonColor: 0xaaddee,
    sunColor: 0xffeecc, sunIntensity: 1.8, ambientIntensity: 0.8,
    treeCount: 30, rockCount: 15, bushCount: 60,
    hillAmplitude: 1.0, hillFrequency: 0.03,
    waterLevel: -0.3,
    treeColor: 0x228833, treeColor2: 0x33aa44,
    spawnDistance: 150, vehicleSpawnPoints: 3,
    envAnimals: [{ type: "butterfly", count: 30 }, { type: "bird", count: 10 }, { type: "deer", count: 3 }],
    envProps: [
      { type: "giant_flower", count: 20, color: 0xff44aa },
      { type: "singing_fountain", count: 4, color: 0x6688cc },
      { type: "hedge_maze", count: 8, color: 0x226622 },
      { type: "marble_statue", count: 6, color: 0xcccccc },
      { type: "fairy_ring", count: 5, color: 0xffdd44 },
    ],
    mapVehicles: [{ defId: "magic_carpet", count: 2 }],
  },
];

// ---- Map-specific vehicle definitions --------------------------------------

export const MAP_VEHICLE_DEFS: VehicleDef[] = [
  {
    id: "magic_carpet", name: "Magic Carpet", icon: "\uD83E\uDDED",
    desc: "Enchanted flying carpet. Fast, agile, low firepower. Seats two riders.",
    type: "air_hover", hp: 180, speed: 20, turnSpeed: 3.5,
    weaponDamage: 15, weaponFireRate: 4, weaponRange: 60,
    weaponProjectileColor: 0xffaa44, weaponSplashRadius: 0,
    seats: 2, bodyColor: 0xaa3366, accentColor: 0xffcc44,
    scaleX: 2.0, scaleY: 0.3, scaleZ: 3.0, altitude: 8, spawnWeight: 0,
    secondaryName: "Sand Blast", secondaryDamage: 30, secondaryFireRate: 0.8,
    secondaryRange: 40, secondaryProjectileColor: 0xddaa44, secondarySplashRadius: 4,
    secondaryProjectileSpeed: 60, secondaryProjectileSize: 0.25,
  },
  {
    id: "ghost_ship", name: "Spectral Galleon", icon: "\uD83D\uDEA2",
    desc: "Ghostly flying vessel. Slow but heavily armed. Fires phantom cannonballs. Seats four.",
    type: "air_hover", hp: 600, speed: 10, turnSpeed: 1.2,
    weaponDamage: 60, weaponFireRate: 0.5, weaponRange: 100,
    weaponProjectileColor: 0x44ff88, weaponSplashRadius: 6,
    seats: 4, bodyColor: 0x334455, accentColor: 0x44ff88,
    scaleX: 3.5, scaleY: 2.0, scaleZ: 6.0, altitude: 10, spawnWeight: 0,
    secondaryName: "Ghost Barrage", secondaryDamage: 20, secondaryFireRate: 3.0,
    secondaryRange: 60, secondaryProjectileColor: 0x88ffaa, secondarySplashRadius: 1,
    secondaryProjectileSpeed: 80, secondaryProjectileSize: 0.15,
  },
  {
    id: "sky_gondola", name: "Sky Gondola", icon: "\uD83C\uDFA0",
    desc: "Crystal-powered gondola. Moderate speed, good view. Light weapons. Seats three.",
    type: "air_hover", hp: 300, speed: 16, turnSpeed: 2.5,
    weaponDamage: 20, weaponFireRate: 3, weaponRange: 70,
    weaponProjectileColor: 0x88ddff, weaponSplashRadius: 1,
    seats: 3, bodyColor: 0x886644, accentColor: 0x88ddff,
    scaleX: 1.8, scaleY: 1.5, scaleZ: 3.5, altitude: 14, spawnWeight: 0,
    secondaryName: "Crystal Beam", secondaryDamage: 40, secondaryFireRate: 0.6,
    secondaryRange: 80, secondaryProjectileColor: 0xaaeeff, secondarySplashRadius: 3,
    secondaryProjectileSpeed: 100, secondaryProjectileSize: 0.2,
  },
];

// ---- Game balance constants ------------------------------------------------

export const MW = {
  TEAM_SIZE: 5,
  RESPAWN_TIME: 5,
  MATCH_TIME: 300,           // 5 minutes
  SCORE_TO_WIN: 50,
  KILL_SCORE: 2,
  VEHICLE_KILL_SCORE: 5,

  PLAYER_HEIGHT: 1.7,
  PLAYER_RADIUS: 0.4,
  EYE_HEIGHT: 1.55,
  CROUCH_HEIGHT: 1.0,
  CROUCH_EYE_HEIGHT: 0.85,

  GRAVITY: -20,
  JUMP_VELOCITY: 8,
  MOVE_SPEED: 8,
  SPRINT_MULT: 1.5,
  CROUCH_MULT: 0.5,
  AIR_CONTROL: 0.3,

  MOUSE_SENSITIVITY: 0.002,
  ADS_SENSITIVITY_MULT: 0.5,
  ADS_FOV: 45,
  DEFAULT_FOV: 75,

  // AI
  AI_REACTION_TIME: 0.3,
  AI_AIM_ERROR: 0.06,
  AI_FIRE_RANGE: 60,
  AI_VEHICLE_RANGE: 80,
  AI_WANDER_RADIUS: 30,
  AI_REPOSITION_TIME: 4,
  AI_VEHICLE_ENTER_DIST: 5,

  // Stamina
  STAMINA_MAX: 100,
  STAMINA_DRAIN: 25,
  STAMINA_REGEN: 15,
  STAMINA_REGEN_DELAY: 2,

  // Fall damage
  FALL_DAMAGE_THRESHOLD: 5,
  FALL_DAMAGE_MULT: 8,

  // Capture points
  CAPTURE_RADIUS: 4,
  CAPTURE_TIME: 2,
  CAPTURE_SCORE_INTERVAL: 5,

  // Spawn protection
  SPAWN_PROTECTION_TIME: 3,

  // Warmup
  WARMUP_TIME: 3,

  // Kill streak / multikill
  MULTIKILL_WINDOW: 4,
  ASSIST_WINDOW: 10,

  // Tick
  SIM_RATE: 1 / 60,

  // Mage Royale mode
  ROYALE_PLAYERS: 12,
  ROYALE_STORM_INITIAL_DELAY: 30,    // seconds before storm starts
  ROYALE_STORM_SHRINK_RATE: 0.8,     // units per second
  ROYALE_STORM_DAMAGE: 8,            // damage per second in storm
  ROYALE_STORM_MIN_RADIUS: 10,       // minimum storm radius
  ROYALE_SCROLL_COUNT: 25,           // spell scrolls scattered on map
  ROYALE_ARTIFACT_COUNT: 8,          // powerful artifacts on map
  ROYALE_RESPAWN_ENABLED: false,

  // Spell Crafting
  CRAFTED_SPELL_SLOT_KEY: "KeyG",
  RUNE_SELECT_KEY: "KeyV",
  MAX_RUNE_INVENTORY: 8,
  RUNE_PICKUP_RADIUS: 2.5,

  // Environmental Spells
  ENV_SPELL_KEY: "KeyF",
  ENV_SPELL_MAX_PLACED: 3,      // max active env spells per player

  // Dragon Riding
  DRAGON_MOUNT_KEY: "KeyH",
  DRAGON_DISMOUNT_KEY: "KeyH",
  DRAGON_BREATH_KEY: "MouseLeft",
  DRAGON_BARREL_ROLL_KEY: "KeyQ",

  // Dueling Arena
  DUEL_ARENA_ENABLED: true,
};
