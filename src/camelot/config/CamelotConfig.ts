// ---------------------------------------------------------------------------
// Prince of Camelot — Constants & Balance
// ---------------------------------------------------------------------------

export const TILE = 40;
export const GRAVITY = 0.6;
export const MAX_FALL = 12;
export const PLAYER_SPEED = 4;
export const JUMP_FORCE = -11;
export const WALL_SLIDE_SPEED = 2;
export const ROLL_SPEED = 8;
export const ROLL_DURATION = 18;
export const INVULN_TIME = 40;
export const DASH_SPEED = 12;
export const DASH_DURATION = 10;
export const DASH_COST = 25;
export const ROLL_COST = 20;
export const ATTACK_COST = 12;
export const STAMINA_MAX = 100;
export const STAMINA_REGEN = 0.6;
export const PARRY_WINDOW = 12;
export const COMBO_WINDOW = 25;
export const HIT_FREEZE = 4;

export const PAL = {
  stone: ["#3a3a4a", "#4a4a5a", "#2e2e3e", "#555568"],
  stoneLight: ["#5a5a6a", "#6a6a7a", "#4e4e5e"],
  brick: ["#6b4030", "#7b5040", "#5b3020", "#8b6050"],
  wood: ["#6b4a20", "#7b5a30", "#5b3a10"],
  gold: ["#d4a843", "#e8c050", "#b08830"],
  blood: ["#a02020", "#c03030", "#801818"],
};

export const LEVEL_NAMES = ["THE DUNGEON", "THE GREAT HALL", "THE TOWER", "THE CATACOMBS", "THE THRONE ROOM"];

export const XP_VALUES: Record<string, number> = {
  guard: 10, archer: 12, knight: 20, shielder: 18, mage: 25, boss: 100,
};

export const COIN_COUNTS: Record<string, number> = {
  guard: 2, archer: 2, knight: 3, shielder: 3, mage: 4, boss: 8,
};

// Wall jump
export const WALL_JUMP_FORCE = -10;
export const WALL_JUMP_HORIZONTAL = 6;
export const WALL_JUMP_COOLDOWN = 8;

// Mage enemy
export const MAGE_CAST_COOLDOWN = 90;
export const MAGE_BLINK_COOLDOWN = 200;
export const MAGE_SHIELD_HP = 2;
export const MAGE_SPELL_SPEED = 5;

// Execution
export const EXECUTION_ZOOM = 1.15;
export const EXECUTION_SLOWMO = 0.2;
export const EXECUTION_DURATION = 30;

// Combo finisher
export const COMBO_FINISHER_FREEZE = 6;
export const COMBO_FINISHER_PARTICLES = 20;

// Score tally
export const TALLY_DURATION = 180; // 3 seconds at 60fps

// Water/Lava
export const WATER_SLOW = 0.5;
export const LAVA_DAMAGE_INTERVAL = 30;

// Air dash
export const AIR_DASH_SPEED = 10;
export const AIR_DASH_DURATION = 8;
export const AIR_DASH_COST = 20;

// Charged attack
export const CHARGE_TIME = 40; // frames to fully charge
export const CHARGE_DAMAGE_MULT = 3;
export const CHARGE_RANGE_MULT = 1.8;
export const CHARGE_KNOCKBACK = 8;

// Blood moon event
export const BLOOD_MOON_INTERVAL = 1800; // every 30 seconds
export const BLOOD_MOON_DURATION = 300; // 5 seconds
export const BLOOD_MOON_DAMAGE_MULT = 1.5;
export const BLOOD_MOON_SPEED_MULT = 1.3;

// Environmental kill bonus
export const ENV_KILL_XP = 20;
