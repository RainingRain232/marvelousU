// ---------------------------------------------------------------------------
// Morgan -- Configuration & Constants
// 3D stealth-sorcery game: play as Morgan le Fay infiltrating enchanted castles
// ---------------------------------------------------------------------------

/** Castle floor grid cell size (world units). */
export const CELL_SIZE = 2.0;
/** Castle floor dimensions (cells). */
export const FLOOR_W = 32;
export const FLOOR_H = 32;

// Player movement
export const MORGAN_SPEED = 4.5;
export const MORGAN_SNEAK_SPEED = 2.0;
export const MORGAN_SPRINT_SPEED = 7.5;
export const MORGAN_TURN_SPEED = 2.2;

// Stamina / mana
export const MAX_STAMINA = 100;
export const MAX_MANA = 100;
export const STAMINA_REGEN = 12; // per second
export const SPRINT_DRAIN = 18; // per second
export const MANA_REGEN = 8; // per second

// Spell costs
export const SHADOW_CLOAK_COST = 30;
export const SHADOW_CLOAK_DURATION = 5; // seconds
export const DARK_BOLT_COST = 20;
export const DARK_BOLT_RANGE = 15;
export const DARK_BOLT_DAMAGE = 40;
export const SLEEP_MIST_COST = 28;
export const SLEEP_MIST_RADIUS = 4;
export const SLEEP_MIST_DURATION = 8;
export const BLINK_COST = 25;
export const BLINK_RANGE = 8;
export const DECOY_COST = 15;
export const DECOY_DURATION = 8;

// Guard AI
export const GUARD_SPEED = 3.0;
export const GUARD_ALERT_SPEED = 5.0;
export const GUARD_VIEW_RANGE = 10;
export const GUARD_VIEW_ANGLE = Math.PI * 0.4; // ~72 degrees half-angle
export const GUARD_ALERT_VIEW_RANGE = 14;
export const GUARD_ALERT_DURATION = 10; // seconds
export const GUARD_HP = 100;

// Guard types
export const HEAVY_GUARD_HP = 200;
export const HEAVY_GUARD_SPEED = 2.5;
export const HEAVY_GUARD_DAMAGE = 25;
export const MAGE_GUARD_HP = 60;
export const MAGE_GUARD_RANGE = 12;
export const MAGE_GUARD_COOLDOWN = 2.5; // seconds between fireballs
export const HOUND_DETECTION_MUL = 2.5;
export const HOUND_SPEED = 5.5;
export const HOUND_HP = 50;

// Detection
export const DETECTION_RATE_VISIBLE = 1.5; // fill per second when in LOS
export const DETECTION_RATE_NOISE = 0.8;
export const DETECTION_DECAY = 0.6;
export const DETECTION_THRESHOLD = 1.0; // full alert at 1.0

// Sound propagation
export const SOUND_SPRINT_RADIUS = 8;
export const SOUND_SPELL_RADIUS = 10;
export const SOUND_COMBAT_RADIUS = 14;
export const SOUND_WALK_RADIUS = 3;

// Camera — 3rd-person behind/above player, INSIDE the rooms (below ceiling)
export const CAM_HEIGHT = 2.2;    // just below ceiling (ceiling is at y=3)
export const CAM_DISTANCE = 5;    // close behind the player
export const CAM_LERP = 6.0;     // snappier follow

// Lighting
export const TORCH_RANGE = 6;
export const TORCH_INTENSITY = 1.2;
export const AMBIENT_LIGHT = 0.15;
export const SHADOW_ZONE_STEALTH_BONUS = 0.7; // detection multiplier in shadows

// Loot / artifacts
export const ARTIFACTS_PER_LEVEL = 5;
export const ARTIFACT_SCORE = 100;
export const LEVEL_COMPLETE_BONUS = 500;

// Pickups
export const HEALTH_POTION_HEAL = 40;
export const MANA_POTION_RESTORE = 50;

// Backstab
export const BACKSTAB_ANGLE = Math.PI * 0.4; // within 72 degrees of their back
export const BACKSTAB_RANGE = 1.8;
export const BACKSTAB_DAMAGE = 200; // instant kill on normal guards

// Traps
export const TRAP_DAMAGE = 30;
export const TRAP_STUN_DURATION = 2;
export const WARD_ALERT_RADIUS = 8;

// Level progression
export const NUM_LEVELS = 7;
export const GUARDS_BASE = 4;
export const GUARDS_PER_LEVEL = 2;

// Guard corpses & communication
export const CORPSE_ALERT_RADIUS = 8;
export const GUARD_CALL_RADIUS = 12; // guards call nearby allies when alerted
export const BODY_DISCOVERY_ALERT_DURATION = 15;

// Torch extinguishing
export const TORCH_EXTINGUISH_RANGE = 2.5;
export const TORCH_EXTINGUISH_COST = 10; // mana

// Distraction (free throw, no mana cost)
export const DISTRACTION_RANGE = 12;
export const DISTRACTION_SOUND_RADIUS = 8;

// Combo system
export const COMBO_WINDOW = 4; // seconds to chain actions
export const COMBO_MULTIPLIER_PER_STACK = 0.25; // +25% per combo step

// Stealth rating thresholds
export const GHOST_RATING_MAX_DETECTIONS = 0;
export const SHADOW_RATING_MAX_DETECTIONS = 2;
export const GHOST_BONUS = 1000;
export const SHADOW_BONUS = 500;
export const UNSEEN_BONUS = 250;

// Time bonus thresholds (seconds)
export const TIME_BONUS_FAST = 60;   // under 1 min = +200 XP
export const TIME_BONUS_MEDIUM = 120; // under 2 min = +100 XP
export const TIME_FAST_XP = 200;
export const TIME_MEDIUM_XP = 100;

// Pacifist bonus
export const PACIFIST_XP = 400;

// Dodge roll
export const DODGE_ROLL_COST = 20; // stamina cost
export const DODGE_ROLL_DURATION = 0.35; // seconds of i-frames
export const DODGE_ROLL_SPEED = 12; // movement speed during roll
export const DODGE_ROLL_COOLDOWN = 1.0; // seconds

// Detection persistence
export const DETECTION_LINGER = 2.0; // seconds detection stays after losing sight

// Environmental kills
export const ENV_KILL_FIRE_DAMAGE = 200; // instant kill from fire grate push
export const ENV_KILL_WATER_STUN = 4; // seconds stunned in water
export const GUARD_PUSH_RANGE = 2.0; // range for pushing guards
export const GUARD_PUSH_FORCE = 5.0; // knockback distance

// Artifact bonuses
export const ARTIFACT_BONUS_DURATION = 30; // seconds each artifact bonus lasts

// Body hiding
export const BODY_HIDE_RANGE = 2.0;
export const BODY_HIDE_DURATION = 1.5; // seconds to hide a body

// Dark bolt interrupts mage casting
export const SPELL_INTERRUPT_STUN = 2.5; // extra stun when interrupting a mage mid-cast

export enum MorganSpell {
  SHADOW_CLOAK = "shadow_cloak",
  DARK_BOLT = "dark_bolt",
  SLEEP_MIST = "sleep_mist",
  BLINK = "blink",
  DECOY = "decoy",
}

export enum GuardState {
  PATROL = "patrol",
  ALERT = "alert",
  SEARCHING = "searching",
  STUNNED = "stunned",
  SLEEPING = "sleeping",
  INVESTIGATING = "investigating", // heard a noise, heading to check
}

export enum GuardType {
  NORMAL = "normal",
  HEAVY = "heavy",    // slow, armored, big damage
  MAGE = "mage",      // ranged fireball attacks
  HOUND = "hound",    // fast, wide detection, weak
}

export enum TileType {
  FLOOR = 0,
  WALL = 1,
  DOOR = 2,
  SHADOW = 3, // dark alcove
  TORCH = 4,
  EXIT = 5,
  LOCKED_DOOR = 6,
  TRAP_PRESSURE = 7,
  TRAP_WARD = 8,
  WATER = 9,
  FIRE_GRATE = 10,
}

export enum PickupType {
  HEALTH_POTION = "health_potion",
  MANA_POTION = "mana_potion",
  KEY = "key",
}

export interface LevelDef {
  level: number;
  guardCount: number;
  artifactCount: number;
  hasBoss: boolean;
  name: string;
  hasHeavy: boolean;
  hasMage: boolean;
  hasHound: boolean;
  trapCount: number;
  lockedDoors: number;
  waterTiles: number;
  fireTiles: number;
}

export const LEVEL_DEFS: LevelDef[] = [
  { level: 1, guardCount: 4,  artifactCount: 5, hasBoss: false, name: "The Outer Ward",        hasHeavy: false, hasMage: false, hasHound: false, trapCount: 0, lockedDoors: 0, waterTiles: 0,  fireTiles: 0 },
  { level: 2, guardCount: 6,  artifactCount: 5, hasBoss: false, name: "The Great Hall",         hasHeavy: false, hasMage: false, hasHound: true,  trapCount: 2, lockedDoors: 1, waterTiles: 3,  fireTiles: 0 },
  { level: 3, guardCount: 8,  artifactCount: 5, hasBoss: false, name: "The Dungeon Vaults",     hasHeavy: true,  hasMage: false, hasHound: true,  trapCount: 3, lockedDoors: 1, waterTiles: 6,  fireTiles: 0 },
  { level: 4, guardCount: 10, artifactCount: 5, hasBoss: false, name: "The Enchanted Library",  hasHeavy: true,  hasMage: true,  hasHound: true,  trapCount: 4, lockedDoors: 2, waterTiles: 2,  fireTiles: 3 },
  { level: 5, guardCount: 12, artifactCount: 5, hasBoss: false, name: "The Tower of Stars",     hasHeavy: true,  hasMage: true,  hasHound: true,  trapCount: 5, lockedDoors: 2, waterTiles: 4,  fireTiles: 4 },
  { level: 6, guardCount: 14, artifactCount: 5, hasBoss: false, name: "The Dragon's Sanctum",   hasHeavy: true,  hasMage: true,  hasHound: true,  trapCount: 6, lockedDoors: 3, waterTiles: 3,  fireTiles: 8 },
  { level: 7, guardCount: 16, artifactCount: 5, hasBoss: true,  name: "Mordred's Throne Room",  hasHeavy: true,  hasMage: true,  hasHound: true,  trapCount: 4, lockedDoors: 2, waterTiles: 4,  fireTiles: 6 },
];

// Spell upgrade system
export interface SpellUpgrade {
  spell: MorganSpell;
  tier: number;
  name: string;
  desc: string;
  cost: number; // XP cost
}

export const SPELL_UPGRADES: SpellUpgrade[] = [
  { spell: MorganSpell.SHADOW_CLOAK, tier: 1, name: "Deeper Shadows",    desc: "+3s duration",           cost: 200 },
  { spell: MorganSpell.SHADOW_CLOAK, tier: 2, name: "Phantom Walk",      desc: "Move at full speed while cloaked", cost: 500 },
  { spell: MorganSpell.DARK_BOLT,    tier: 1, name: "Piercing Dark",     desc: "+50% damage",            cost: 200 },
  { spell: MorganSpell.DARK_BOLT,    tier: 2, name: "Chain Lightning",   desc: "Hits up to 2 nearby guards", cost: 500 },
  { spell: MorganSpell.SLEEP_MIST,   tier: 1, name: "Deep Slumber",     desc: "+5s sleep duration",     cost: 200 },
  { spell: MorganSpell.SLEEP_MIST,   tier: 2, name: "Expanding Cloud",  desc: "+50% radius",            cost: 500 },
  { spell: MorganSpell.BLINK,        tier: 1, name: "Far Step",         desc: "+4 range",               cost: 200 },
  { spell: MorganSpell.BLINK,        tier: 2, name: "Phase Strike",     desc: "Blink through guards, stunning them", cost: 500 },
  { spell: MorganSpell.DECOY,        tier: 1, name: "Lasting Image",    desc: "+5s duration",           cost: 200 },
  { spell: MorganSpell.DECOY,        tier: 2, name: "Explosive Decoy",  desc: "Stuns guards when it fades", cost: 500 },
];

// Stat upgrades (permanent between levels)
export interface StatUpgrade {
  id: string;
  name: string;
  desc: string;
  cost: number;
  maxTier: number;
}

export const STAT_UPGRADES: StatUpgrade[] = [
  { id: "hp",      name: "Vitality",       desc: "+25 max HP per tier",          cost: 150, maxTier: 4 },
  { id: "mana",    name: "Arcane Pool",    desc: "+20 max mana per tier",        cost: 150, maxTier: 4 },
  { id: "stamina", name: "Endurance",      desc: "+15 max stamina per tier",     cost: 100, maxTier: 3 },
  { id: "regen",   name: "Dark Recovery",  desc: "+2 mana regen/s per tier",     cost: 200, maxTier: 3 },
  { id: "stealth", name: "Shadow Affinity", desc: "-15% detection rate per tier", cost: 250, maxTier: 3 },
  { id: "speed",   name: "Fleet Foot",     desc: "+0.5 base speed per tier",     cost: 200, maxTier: 3 },
];

// Spell cooldowns (seconds)
export const SPELL_COOLDOWNS: Record<MorganSpell, number> = {
  [MorganSpell.SHADOW_CLOAK]: 8,
  [MorganSpell.DARK_BOLT]: 0.8,
  [MorganSpell.SLEEP_MIST]: 6,
  [MorganSpell.BLINK]: 3,
  [MorganSpell.DECOY]: 7,
};

// Boss fight
export const BOSS_HP = 400;
export const BOSS_PHASE_2_HP = 0.6; // phase 2 at 60% HP
export const BOSS_PHASE_3_HP = 0.25; // phase 3 at 25% HP
export const BOSS_SUMMON_COUNT = 2;
export const BOSS_SHOCKWAVE_DAMAGE = 25;
export const BOSS_SHOCKWAVE_RADIUS = 6;
export const BOSS_SHOCKWAVE_COOLDOWN = 5;
export const BOSS_TELEPORT_COOLDOWN = 8;
export const BOSS_DARK_BARRAGE_COUNT = 5; // fireballs in spread

// Loot drops
export const LOOT_DROP_CHANCE = 0.4;
export const LOOT_GOLD_VALUE = 50;

// Environmental hazards
export const WATER_SPEED_MULT = 0.5;
export const WATER_NOISE_RADIUS = 6;
export const FIRE_DAMAGE_PER_SEC = 20;

// Difficulty
export enum Difficulty {
  EASY = "easy",
  NORMAL = "normal",
  HARD = "hard",
}

export const DIFFICULTY_MULTS: Record<Difficulty, { guardHp: number; guardDmg: number; detectionRate: number; xpMult: number; label: string }> = {
  [Difficulty.EASY]:   { guardHp: 0.7,  guardDmg: 0.6,  detectionRate: 0.6,  xpMult: 0.8,  label: "Apprentice" },
  [Difficulty.NORMAL]: { guardHp: 1.0,  guardDmg: 1.0,  detectionRate: 1.0,  xpMult: 1.0,  label: "Sorceress" },
  [Difficulty.HARD]:   { guardHp: 1.5,  guardDmg: 1.4,  detectionRate: 1.4,  xpMult: 1.5,  label: "Archmage" },
};

// Level narrative intros
export const LEVEL_INTROS: string[] = [
  "The outer ward lies before you. Mordred's guards patrol lazily — they do not expect an intruder. Slip through unnoticed and claim the first relics.",
  "The Great Hall echoes with footsteps and the snarling of war hounds. Mordred has tightened his grip. Locked doors bar the way to treasures within.",
  "Beneath the castle, the dungeon vaults hold both prisoners and power. Heavy-armored sentinels guard the cells. Move carefully through the dark.",
  "Mordred's stolen grimoires fill the Enchanted Library. Mage-guards weave wards of fire between the shelves. Counter their magic with your own.",
  "The Tower of Stars spirals upward into moonlight. Every floor bristles with guards, traps, and enchantments. The relics here pulse with ancient power.",
  "Dragons once nested in these sanctums. Now Mordred's elite guard the bones and treasures. The air burns with residual dragonfire — watch your step.",
  "Mordred awaits in his throne room, surrounded by his most loyal. He wields the Grail's corrupted power. Defeat him and reclaim Avalon's birthright.",
];

// Guard bark lines (shown as floating text)
export const GUARD_BARKS = {
  spotPlayer: [
    "INTRUDER!", "There she is!", "HALT!", "Sound the alarm!", "You won't escape!",
  ],
  hearNoise: [
    "What was that?", "Hmm?", "Did you hear something?", "Who goes there?",
  ],
  lostPlayer: [
    "Where did she go?", "Must be seeing things...", "She can't be far...", "Search the area!",
  ],
  findCorpse: [
    "A body! We're under attack!", "Man down! ALERT!", "Who did this?!", "Guards! Over here!",
  ],
  returnToPatrol: [
    "Must have been the wind.", "Back to patrol.", "False alarm.", "Nothing here.",
  ],
  searching: [
    "She was just here...", "Check behind the pillars!", "I can feel her presence...", "She's using magic...",
  ],
  houndAlert: [
    "*snarling*", "*growling intensely*", "*howling*",
  ],
};
