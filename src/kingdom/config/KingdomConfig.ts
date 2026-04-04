// ---------------------------------------------------------------------------
// Kingdom – Balance & Configuration
// ---------------------------------------------------------------------------

import { KingdomChar } from "../types";

// ---------------------------------------------------------------------------
// Physics
// ---------------------------------------------------------------------------

export const GRAVITY = 48;
export const MAX_FALL_SPEED = 22;
export const JUMP_VELOCITY = -15;
export const JUMP_HOLD_GRAVITY = 22;
export const MAX_WALK_SPEED = 6;
export const MAX_RUN_SPEED = 9.5;
export const ACCELERATION = 22;
export const DECELERATION = 18;
export const AIR_ACCELERATION = 14;
export const AIR_DECELERATION = 8;
export const SKID_DECELERATION = 30;

// ---------------------------------------------------------------------------
// Level geometry
// ---------------------------------------------------------------------------

export const LEVEL_HEIGHT = 15;
export const GROUND_ROW = 13;

// ---------------------------------------------------------------------------
// Character stats
// ---------------------------------------------------------------------------

export interface CharStats {
  speedMul: number;
  jumpMul: number;
  gravityMul: number;
  special: string;
  desc: string;
}

export const CHAR_STATS: Record<KingdomChar, CharStats> = {
  [KingdomChar.ARTHUR]: {
    speedMul: 1.0, jumpMul: 1.0, gravityMul: 1.0,
    special: "Sword Slash",
    desc: "The Once and Future King. Balanced speed and power.",
  },
  [KingdomChar.MERLIN]: {
    speedMul: 0.9, jumpMul: 1.12, gravityMul: 0.75,
    special: "Hover",
    desc: "The great wizard. Floats gently, can hover mid-air.",
  },
  [KingdomChar.GUINEVERE]: {
    speedMul: 1.15, jumpMul: 1.08, gravityMul: 1.0,
    special: "Double Jump",
    desc: "The swift queen. Fastest runner, can double-jump.",
  },
  [KingdomChar.LANCELOT]: {
    speedMul: 0.88, jumpMul: 0.92, gravityMul: 1.1,
    special: "Shield Dash",
    desc: "The greatest knight. Armored dash destroys enemies.",
  },
};

// ---------------------------------------------------------------------------
// Enemies
// ---------------------------------------------------------------------------

export const GOBLIN_SPEED = 1.8;
export const DARK_KNIGHT_SPEED = 1.4;
export const SHELL_SPEED = 11;
export const SKELETON_ATTACK_INTERVAL = 2.2;
export const DRAGON_HP = 5;
export const DRAGON_FIRE_INTERVAL = 2.5;
export const DRAGON_SPEED = 0.8;

// ---------------------------------------------------------------------------
// Items & Power-ups
// ---------------------------------------------------------------------------

export const POTION_SPEED = 3;
export const STAR_SPEED = 5;
export const STAR_BOUNCE_VY = -10;
export const STAR_DURATION = 10;
export const FIREBALL_SPEED = 11;
export const FIREBALL_BOUNCE_VY = -7;
export const FIREBALL_GRAVITY = 30;
export const MAX_FIREBALLS = 2;

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

export const SCORE_COIN = 200;
export const SCORE_STOMP = 100;
export const SCORE_STOMP_COMBO = [100, 200, 400, 800, 1600, 3200]; // chain stomps
export const SCORE_FIRE_KILL = 200;
export const SCORE_BLOCK = 50;
export const SCORE_POTION = 1000;
export const SCORE_STAR = 2000;
export const SCORE_1UP = 0;
export const SCORE_TIME = 50;
export const SCORE_FLAG_BASE = 100;
export const SCORE_FLAG_TOP = 5000;
export const COINS_FOR_LIFE = 100;

// ---------------------------------------------------------------------------
// Sword slash (Arthur)
// ---------------------------------------------------------------------------

export const SWORD_SLASH_RANGE = 1.5;
export const SWORD_SLASH_WIDTH = 0.8;
export const SWORD_SLASH_DURATION = 0.2;
export const SWORD_SLASH_COOLDOWN = 0.5;
export const SWORD_SLASH_DAMAGE = 2;

// ---------------------------------------------------------------------------
// Platforming feel
// ---------------------------------------------------------------------------

export const COYOTE_TIME = 0.1;
export const JUMP_BUFFER_TIME = 0.12;
export const WALL_SLIDE_SPEED = 3;
export const WALL_JUMP_VX = 8;
export const WALL_JUMP_VY = -13;

// ---------------------------------------------------------------------------
// Screen shake
// ---------------------------------------------------------------------------

export const SHAKE_BRICK_BREAK = 0.08;
export const SHAKE_BRICK_INTENSITY = 2;
export const SHAKE_STOMP = 0.06;
export const SHAKE_STOMP_INTENSITY = 1.5;
export const SHAKE_BOSS_HIT = 0.12;
export const SHAKE_BOSS_INTENSITY = 4;
export const SHAKE_DEATH = 0.15;
export const SHAKE_DEATH_INTENSITY = 5;

// ---------------------------------------------------------------------------
// Stomp combos
// ---------------------------------------------------------------------------

export const STOMP_COMBO_WINDOW = 1.5;

// ---------------------------------------------------------------------------
// Crouching & sliding
// ---------------------------------------------------------------------------

export const CROUCH_HEIGHT_SMALL = 0.5;
export const CROUCH_HEIGHT_BIG = 1.0;
export const SLIDE_SPEED = 10;
export const SLIDE_DURATION = 0.35;

// ---------------------------------------------------------------------------
// Spring block
// ---------------------------------------------------------------------------

export const SPRING_BOUNCE_VY = -22;

// ---------------------------------------------------------------------------
// Running jump boost
// ---------------------------------------------------------------------------

export const RUN_JUMP_BOOST = 0.15; // +15% jump height at max run speed

// ---------------------------------------------------------------------------
// Moving platforms
// ---------------------------------------------------------------------------

export const PLATFORM_DEFAULT_SPEED = 2;

// ---------------------------------------------------------------------------
// New enemies
// ---------------------------------------------------------------------------

export const BAT_SPEED = 2.5;
export const BAT_SWOOP_SPEED = 6;
export const BAT_SWOOP_RANGE = 6;
export const BOAR_SPEED = 1;
export const BOAR_CHARGE_SPEED = 8;
export const BOAR_CHARGE_RANGE = 7;
export const BOAR_CHARGE_DURATION = 1.5;

// Wraith (World 5 unique) — spectral hovering spellcaster, 2 HP
export const WRAITH_SPEED = 1.8;
export const WRAITH_FIRE_INTERVAL = 3.0;
export const WRAITH_FIRE_SPEED = 5.5;
export const WRAITH_HP = 2;

// Hellhound (World 6 unique) — lunging demonic hound
export const HELLHOUND_SPEED = 3.0;
export const HELLHOUND_LUNGE_SPEED = 11;
export const HELLHOUND_LUNGE_RANGE = 6;
export const HELLHOUND_LUNGE_DURATION = 0.65;
export const HELLHOUND_LUNGE_COOLDOWN = 2.8;

// ---------------------------------------------------------------------------
// Multi-coin blocks
// ---------------------------------------------------------------------------

export const MULTI_COIN_MAX_HITS = 8;
export const MULTI_COIN_TIME_LIMIT = 3;

// ---------------------------------------------------------------------------
// Coin magnetism
// ---------------------------------------------------------------------------

export const COIN_MAGNET_RANGE = 2.5;
export const COIN_MAGNET_SPEED = 8;

// ---------------------------------------------------------------------------
// Landing impact
// ---------------------------------------------------------------------------

export const LANDING_DUST_MIN_VY = 6;
export const LANDING_SQUASH_DURATION = 0.1;

// ---------------------------------------------------------------------------
// Wall jump (completing the mechanic)
// ---------------------------------------------------------------------------

export const WALL_JUMP_ENABLED = true;

// ---------------------------------------------------------------------------
// Boss death sequence
// ---------------------------------------------------------------------------

export const BOSS_DEATH_DURATION = 3.5;

// ---------------------------------------------------------------------------
// Checkpoint
// ---------------------------------------------------------------------------

export const CHECKPOINT_COL_FRACTION = 0.5;

// ---------------------------------------------------------------------------
// Bonus room
// ---------------------------------------------------------------------------

export const BONUS_ROOM_WIDTH = 20;
export const BONUS_ROOM_HEIGHT = 10;
export const BONUS_ROOM_TIME_LIMIT = 15;

// ---------------------------------------------------------------------------
// Enemy awareness
// ---------------------------------------------------------------------------

export const ENEMY_ALERT_RANGE = 5;
export const GOBLIN_ALERT_JUMP_CHANCE = 0.02;

// ---------------------------------------------------------------------------
// Hidden blocks
// ---------------------------------------------------------------------------

export const HIDDEN_BLOCK_STAR_CHANCE = 0.3;

// ---------------------------------------------------------------------------
// Difficulty curve (breather at world start)
// ---------------------------------------------------------------------------

export function getDifficultyForLevel(world: number, level: number): number {
  // Level 1 of each world is easier than level 4 of previous world
  const base = (world - 1) * 3.5;
  const ramp = [0, 1.5, 3, 5][Math.min(level - 1, 3)];
  return base + ramp;
}

// ---------------------------------------------------------------------------
// Timers
// ---------------------------------------------------------------------------

export const LEVEL_TIME = 400;
export const LEVEL_INTRO_TIME = 2.5;
export const DEATH_ANIM_TIME = 2.5;
export const LEVEL_CLEAR_TIME = 5;
export const DAMAGE_INVINCIBLE_TIME = 2;
export const GROW_TIME = 0.5;

// ---------------------------------------------------------------------------
// Level generation
// ---------------------------------------------------------------------------

export const MIN_LEVEL_WIDTH = 210;
export const MAX_LEVEL_WIDTH = 310;

// ---------------------------------------------------------------------------
// Visual themes per world
// ---------------------------------------------------------------------------

export interface WorldTheme {
  name: string;
  skyTop: number;
  skyBottom: number;
  groundColor: number;
  groundTopColor: number;
  brickColor: number;
  brickLine: number;
  pipeColor: number;
  pipeDark: number;
  castleColor: number;
  questionColor: number;
  questionDark: number;
}

export const WORLD_THEMES: WorldTheme[] = [
  {
    name: "Camelot Fields",
    skyTop: 0x5C94FC, skyBottom: 0x88BBFF,
    groundColor: 0xC84C0C, groundTopColor: 0x00A800,
    brickColor: 0xC06820, brickLine: 0x985020,
    pipeColor: 0x00A800, pipeDark: 0x007800,
    castleColor: 0x888888, questionColor: 0xE8A800, questionDark: 0xB87800,
  },
  {
    name: "Enchanted Forest",
    skyTop: 0x1A3A1A, skyBottom: 0x2D5A2D,
    groundColor: 0x5A3A1A, groundTopColor: 0x1A6A1A,
    brickColor: 0x4A3A2A, brickLine: 0x3A2A1A,
    pipeColor: 0x228822, pipeDark: 0x115511,
    castleColor: 0x554433, questionColor: 0xBB8800, questionDark: 0x886600,
  },
  {
    name: "Dragon Peaks",
    skyTop: 0xCC4400, skyBottom: 0xFF7744,
    groundColor: 0x777777, groundTopColor: 0x999999,
    brickColor: 0x666666, brickLine: 0x555555,
    pipeColor: 0x558855, pipeDark: 0x336633,
    castleColor: 0x666666, questionColor: 0xDD9900, questionDark: 0xAA7700,
  },
  {
    name: "Mordred's Fortress",
    skyTop: 0x0D0D1A, skyBottom: 0x1A1A33,
    groundColor: 0x444455, groundTopColor: 0x555566,
    brickColor: 0x333344, brickLine: 0x222233,
    pipeColor: 0x336633, pipeDark: 0x224422,
    castleColor: 0x333344, questionColor: 0x997700, questionDark: 0x665500,
  },
  {
    name: "The Void Citadel",
    skyTop: 0x020208, skyBottom: 0x0D0520,
    groundColor: 0x442266, groundTopColor: 0x7733AA,
    brickColor: 0x331155, brickLine: 0x220044,
    pipeColor: 0x5511AA, pipeDark: 0x330077,
    castleColor: 0x2A1044, questionColor: 0xAA44FF, questionDark: 0x7722CC,
  },
  {
    name: "The Infernal Keep",
    skyTop: 0x1A0000, skyBottom: 0x3D0800,
    groundColor: 0x1A1A1A, groundTopColor: 0x3D0D00,
    brickColor: 0x2A0800, brickLine: 0x1A0000,
    pipeColor: 0x661100, pipeDark: 0x440000,
    castleColor: 0x2A0800, questionColor: 0xFF3300, questionDark: 0xCC1100,
  },
];

// ---------------------------------------------------------------------------
// Character rendering colors
// ---------------------------------------------------------------------------

export interface CharColors {
  primary: number;
  secondary: number;
  skin: number;
  accent: number;
  hair: number;
}

export const CHAR_COLORS: Record<KingdomChar, CharColors> = {
  [KingdomChar.ARTHUR]: {
    primary: 0x1A5ECC, secondary: 0x8B4513, skin: 0xFFCC99, accent: 0xFFD700, hair: 0x8B4513,
  },
  [KingdomChar.MERLIN]: {
    primary: 0x2244CC, secondary: 0x7700BB, skin: 0xFFCC99, accent: 0xFFFFFF, hair: 0xCCCCCC,
  },
  [KingdomChar.GUINEVERE]: {
    primary: 0xEEEEFF, secondary: 0xAA66CC, skin: 0xFFCC99, accent: 0xFFD700, hair: 0xFFD700,
  },
  [KingdomChar.LANCELOT]: {
    primary: 0xBBBBCC, secondary: 0x0044CC, skin: 0xFFCC99, accent: 0x888899, hair: 0x333333,
  },
};
