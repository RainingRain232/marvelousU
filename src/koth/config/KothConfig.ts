// ---------------------------------------------------------------------------
// King of the Hill — configuration & definitions
// ---------------------------------------------------------------------------

export type UnitType =
  | "swordsman" | "archer" | "pikeman" | "cavalry" | "mage"
  | "berserker" | "crossbow" | "paladin";

export type GuardianType = "wolf" | "troll" | "drake" | "elemental" | "wyvern";

export type RelicType = "speed" | "damage" | "armor" | "gold" | "heal";

export type CataclysmType = "meteor_shower" | "earthquake" | "dragon_flyover" | "blizzard";

// Visual shape hint for the renderer
export type UnitShape = "circle" | "diamond" | "square" | "triangle" | "star" | "hex";

export interface UnitDef {
  id: UnitType;
  name: string;
  desc: string;
  cost: number;
  hp: number;
  atk: number;
  speed: number; // pixels/sec
  range: number; // pixels; 0 = melee
  attackRate: number; // attacks/sec
  color: number;
  size: number;
  shape: UnitShape;
  passive: string;
  passiveDesc: string;
}

export interface GuardianDef {
  id: GuardianType;
  name: string;
  hp: number;
  atk: number;
  speed: number;
  attackRate: number;
  color: number;
  size: number;
  reward: number;
  special: string; // special ability key
  specialCooldown: number; // seconds
  specialDesc: string;
}

export interface RelicDef {
  id: RelicType;
  name: string;
  desc: string;
  color: number;
  duration: number;
}

export interface CataclysmDef {
  id: CataclysmType;
  name: string;
  desc: string;
  color: number;
  duration: number;
}

export const UNITS: Record<UnitType, UnitDef> = {
  swordsman: {
    id: "swordsman", name: "Swordsman", desc: "Cheap melee. Inspired near Paladins.",
    cost: 30, hp: 60, atk: 8, speed: 60, range: 0, attackRate: 1.2,
    color: 0x886644, size: 5, shape: "circle",
    passive: "inspired", passiveDesc: "+20% ATK near Paladins",
  },
  archer: {
    id: "archer", name: "Archer", desc: "Fast ranged. Kites melee. Anti-cavalry.",
    cost: 40, hp: 35, atk: 10, speed: 55, range: 120, attackRate: 1.0,
    color: 0x448844, size: 4, shape: "triangle",
    passive: "anti_cav", passiveDesc: "+50% dmg vs Cavalry",
  },
  pikeman: {
    id: "pikeman", name: "Pikeman", desc: "Tanky melee. Bonus vs cavalry.",
    cost: 45, hp: 80, atk: 6, speed: 45, range: 0, attackRate: 0.8,
    color: 0x666688, size: 5.5, shape: "square",
    passive: "brace", passiveDesc: "+80% dmg vs Cavalry, -30% melee dmg taken",
  },
  cavalry: {
    id: "cavalry", name: "Cavalry", desc: "Fast charger. Charge resets out of combat.",
    cost: 70, hp: 90, atk: 14, speed: 100, range: 0, attackRate: 0.9,
    color: 0xaa7744, size: 7, shape: "diamond",
    passive: "charge", passiveDesc: "First hit deals 3x. Resets after 3s idle.",
  },
  mage: {
    id: "mage", name: "Mage", desc: "AoE ranged. Splash damage. Kites.",
    cost: 80, hp: 30, atk: 18, speed: 40, range: 140, attackRate: 0.6,
    color: 0x6644aa, size: 4.5, shape: "star",
    passive: "splash", passiveDesc: "50% splash in radius 30",
  },
  berserker: {
    id: "berserker", name: "Berserker", desc: "Frenzied melee. Faster as HP drops.",
    cost: 60, hp: 50, atk: 16, speed: 75, range: 0, attackRate: 1.5,
    color: 0xcc4422, size: 6, shape: "diamond",
    passive: "frenzy", passiveDesc: "ATK speed +100% below 50% HP",
  },
  crossbow: {
    id: "crossbow", name: "Crossbowman", desc: "Slow piercing ranged. Ignores armor.",
    cost: 55, hp: 40, atk: 15, speed: 50, range: 150, attackRate: 0.5,
    color: 0x557744, size: 4.5, shape: "triangle",
    passive: "pierce", passiveDesc: "Ignores armor buff on target",
  },
  paladin: {
    id: "paladin", name: "Paladin", desc: "Tank. Heals nearby allies.",
    cost: 120, hp: 150, atk: 12, speed: 50, range: 0, attackRate: 1.0,
    color: 0xddcc44, size: 7, shape: "hex",
    passive: "aura_heal", passiveDesc: "Heals nearby allies 3 HP/sec",
  },
};

export const GUARDIANS: Record<GuardianType, GuardianDef> = {
  wolf:      { id: "wolf",      name: "Dire Wolf",       hp: 40,   atk: 8,  speed: 80, attackRate: 1.5, color: 0x666655, size: 5,  reward: 10, special: "pack_howl",  specialCooldown: 8,  specialDesc: "Howl: +30% speed for pack" },
  troll:     { id: "troll",     name: "Hill Troll",      hp: 200,  atk: 20, speed: 30, attackRate: 0.6, color: 0x446644, size: 10, reward: 30, special: "ground_slam", specialCooldown: 6,  specialDesc: "Slam: AoE stun + damage" },
  drake:     { id: "drake",     name: "Fire Drake",      hp: 120,  atk: 15, speed: 55, attackRate: 1.0, color: 0xcc6622, size: 8,  reward: 25, special: "fire_breath", specialCooldown: 5,  specialDesc: "Cone of fire damage" },
  elemental: { id: "elemental", name: "Stone Elemental", hp: 300,  atk: 25, speed: 20, attackRate: 0.4, color: 0x888877, size: 12, reward: 40, special: "boulder",     specialCooldown: 8,  specialDesc: "Throws a boulder" },
  wyvern:    { id: "wyvern",    name: "Wyvern",          hp: 180,  atk: 22, speed: 65, attackRate: 0.8, color: 0x448888, size: 9,  reward: 35, special: "dive_bomb",   specialCooldown: 7,  specialDesc: "Dive attack on distant target" },
};

export const RELICS: Record<RelicType, RelicDef> = {
  speed:  { id: "speed",  name: "Boots of Swiftness", desc: "+40% speed",     color: 0x44ccff, duration: 12 },
  damage: { id: "damage", name: "Sword of Fury",      desc: "+50% damage",    color: 0xff4444, duration: 10 },
  armor:  { id: "armor",  name: "Shield of Ages",     desc: "-40% dmg taken", color: 0x8888cc, duration: 12 },
  gold:   { id: "gold",   name: "Golden Chalice",     desc: "+100 gold",      color: 0xffd700, duration: 0 },
  heal:   { id: "heal",   name: "Holy Water",         desc: "Heal all units", color: 0x44ff88, duration: 0 },
};

export const CATACLYSMS: Record<CataclysmType, CataclysmDef> = {
  meteor_shower:  { id: "meteor_shower",  name: "Meteor Shower",  desc: "Rocks rain from the sky!",    color: 0xff6622, duration: 4 },
  earthquake:     { id: "earthquake",     name: "Earthquake",     desc: "The ground trembles!",        color: 0x886644, duration: 3 },
  dragon_flyover: { id: "dragon_flyover", name: "Dragon Flyover", desc: "A dragon scorches the hill!", color: 0xff4400, duration: 3 },
  blizzard:       { id: "blizzard",       name: "Blizzard",       desc: "Ice slows all units!",        color: 0x88ccff, duration: 5 },
};

export interface GuardianWave {
  guardians: { type: GuardianType; count: number }[];
  minuteThreshold: number;
}

export const GUARDIAN_WAVES: GuardianWave[] = [
  { minuteThreshold: 0.5, guardians: [{ type: "wolf", count: 3 }] },
  { minuteThreshold: 1.5, guardians: [{ type: "wolf", count: 4 }, { type: "troll", count: 1 }] },
  { minuteThreshold: 3,   guardians: [{ type: "drake", count: 2 }, { type: "wolf", count: 3 }] },
  { minuteThreshold: 4.5, guardians: [{ type: "troll", count: 2 }, { type: "drake", count: 2 }] },
  { minuteThreshold: 6,   guardians: [{ type: "elemental", count: 1 }, { type: "drake", count: 3 }] },
  { minuteThreshold: 8,   guardians: [{ type: "wyvern", count: 2 }, { type: "elemental", count: 1 }, { type: "troll", count: 2 }] },
  { minuteThreshold: 10,  guardians: [{ type: "wyvern", count: 3 }, { type: "elemental", count: 2 }] },
];

export interface ObstacleDef {
  x: number;
  y: number;
  radius: number;
  type: "rock" | "tree" | "ruin";
}

export const ALL_UNIT_TYPES: UnitType[] = ["swordsman", "archer", "pikeman", "cavalry", "mage", "berserker", "crossbow", "paladin"];

// Guardian shapes for visual distinction
export const GUARDIAN_SHAPES: Record<GuardianType, UnitShape> = {
  wolf: "triangle",
  troll: "square",
  drake: "diamond",
  elemental: "hex",
  wyvern: "star",
};

// Difficulty
export type Difficulty = "easy" | "normal" | "hard";
export interface DifficultyDef {
  label: string;
  color: number;
  aiSpawnMult: number; // multiplier on AI spawn interval (lower = faster)
  guardianHpMult: number;
  guardianAtkMult: number;
  aiGoldMult: number; // AI income multiplier
  scoreLimit: number;
}
export const DIFFICULTIES: Record<Difficulty, DifficultyDef> = {
  easy:   { label: "Squire",  color: 0x44aa44, aiSpawnMult: 1.4,  guardianHpMult: 0.7,  guardianAtkMult: 0.7,  aiGoldMult: 0.8, scoreLimit: 400 },
  normal: { label: "Knight",  color: 0xccaa44, aiSpawnMult: 1.0,  guardianHpMult: 1.0,  guardianAtkMult: 1.0,  aiGoldMult: 1.0, scoreLimit: 500 },
  hard:   { label: "Warlord", color: 0xff4444, aiSpawnMult: 0.7,  guardianHpMult: 1.4,  guardianAtkMult: 1.3,  aiGoldMult: 1.2, scoreLimit: 600 },
};

// Upgrades
export type UpgradeId = "sharp_blades" | "thick_armor" | "swift_boots" | "war_drums" | "blessed_weapons";
export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  desc: string;
  cost: number;
  color: number;
  maxLevel: number;
}
export const UPGRADES: Record<UpgradeId, UpgradeDef> = {
  sharp_blades:    { id: "sharp_blades",    name: "Sharp Blades",    desc: "+10% melee ATK",     cost: 80,  color: 0xcc6644, maxLevel: 3 },
  thick_armor:     { id: "thick_armor",     name: "Thick Armor",     desc: "+12% unit HP",       cost: 100, color: 0x8888aa, maxLevel: 3 },
  swift_boots:     { id: "swift_boots",     name: "Swift Boots",     desc: "+8% unit speed",     cost: 70,  color: 0x44ccaa, maxLevel: 3 },
  war_drums:       { id: "war_drums",       name: "War Drums",       desc: "+10% attack speed",  cost: 90,  color: 0xcc8844, maxLevel: 2 },
  blessed_weapons: { id: "blessed_weapons", name: "Blessed Weapons", desc: "+15% ranged ATK",    cost: 100, color: 0xdddd66, maxLevel: 3 },
};
export const ALL_UPGRADE_IDS: UpgradeId[] = ["sharp_blades", "thick_armor", "swift_boots", "war_drums", "blessed_weapons"];

// Veterancy: kills needed per level
export const VET_KILLS = [0, 2, 5, 10]; // lv0→lv1 at 2 kills, lv1→lv2 at 5, etc.
export const VET_BONUS_PER_LEVEL = 0.12; // +12% atk/hp per vet level
export const VET_MAX_LEVEL = 3;
export const VET_COLORS = [0x000000, 0xcccc88, 0xffdd44, 0xff6644]; // border glow per level

export const KothConfig = {
  // Arena (scales to fill screen, these are logical coords)
  ARENA_W: Math.max(1200, typeof window !== "undefined" ? window.innerWidth - 40 : 1200),
  ARENA_H: Math.max(700, typeof window !== "undefined" ? window.innerHeight - 100 : 700),

  // Hill zone (centered)
  HILL_RADIUS: 100,
  get HILL_CENTER_X() { return this.ARENA_W / 2; },
  get HILL_CENTER_Y() { return this.ARENA_H / 2; },

  // Capture meter
  CAPTURE_RATE: 15,
  CAPTURE_DECAY: 5,

  // Scoring
  SCORE_LIMIT: 500,
  BASE_POINTS_PER_SEC: 3,
  ESCALATION_RATE: 0.3,

  // Streak / domination
  STREAK_THRESHOLD: 10,
  STREAK_MULT_PER_10S: 0.2,
  STREAK_MAX_MULT: 2.0, // cap multiplier

  // Economy
  START_GOLD: 150,
  PASSIVE_INCOME: 8,
  HILL_INCOME_BONUS: 5,
  KILL_GOLD_MULT: 0.5,

  // Spawns
  SPAWN_OFFSET: 40,
  UNIT_COLLISION_RADIUS: 8,
  MAX_UNITS_PER_PLAYER: 40,
  UNIT_SEPARATION_FORCE: 30,

  // Guardians
  GUARDIAN_RESPAWN_INTERVAL: 45,

  // Relics
  RELIC_SPAWN_INTERVAL: 20,
  RELIC_PICKUP_RADIUS: 20,

  // Cataclysms
  CATACLYSM_INTERVAL: 35,
  CATACLYSM_FIRST_DELAY: 60,

  // AI
  AI_SPAWN_INTERVAL: 2.5,

  // Paladin heal aura
  PALADIN_HEAL_RADIUS: 60,
  PALADIN_HEAL_PER_SEC: 3,

  // Mage splash
  MAGE_SPLASH_RADIUS: 30,
  MAGE_SPLASH_MULT: 0.5,

  // Ranged kiting
  KITE_RETREAT_DIST: 40, // how far ranged backs up when melee gets close
  KITE_TRIGGER_DIST: 35, // distance at which ranged starts kiting

  // Cavalry charge
  CHARGE_RESET_TIME: 3, // seconds out of combat before charge resets

  // War Horn
  WAR_HORN_COOLDOWN: 25,
  WAR_HORN_DURATION: 6,
  WAR_HORN_SPEED_MULT: 0.6,
  WAR_HORN_ATK_MULT: 0.4, // +40% damage (buffed from 25%)

  // Screen shake
  SHAKE_INTENSITY: 3,

  // Kill feed
  KILL_FEED_MAX: 4,
  KILL_FEED_DURATION: 3,

  // Guardian warning
  GUARDIAN_WARNING_TIME: 5, // seconds before guardian spawn to show warning

  // Floating text
  FLOAT_TEXT_DURATION: 0.8,
  FLOAT_TEXT_SPEED: 30, // pixels/sec upward

  // Multi-kill window
  MULTI_KILL_WINDOW: 2.5, // seconds between kills to count as combo

  // Auto-spawn interval when holding space
  AUTO_SPAWN_INTERVAL: 0.3,

  // Ranged attack trail
  RANGED_TRAIL_DURATION: 0.12, // seconds the line flash lasts

  // Contested hill sparks
  CONTEST_SPARK_RATE: 5, // sparks per second when both armies on hill
} as const;
