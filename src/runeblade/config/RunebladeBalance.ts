// ---------------------------------------------------------------------------
// Runeblade — Balance constants
// ---------------------------------------------------------------------------

export const RB = {
  // Arena (defaults, overridden dynamically by screen size)
  ARENA_W: 900,
  ARENA_H: 650,

  // Player
  PLAYER_SPEED: 180,
  PLAYER_RADIUS: 8,
  PLAYER_HP: 8,

  // Attack
  ATTACK_COOLDOWN: 0.35,
  SLASH_RADIUS: 40,
  SLASH_DAMAGE: 1,
  SLASH_DURATION: 0.2,

  // Dodge
  DODGE_SPEED: 400,
  DODGE_DURATION: 0.2,
  DODGE_COOLDOWN: 1.0,
  INVULN_DURATION: 0.5,

  // Enemies — skeleton
  SKELETON_SPEED: 70,
  SKELETON_HP: 2,
  SKELETON_RADIUS: 7,
  SKELETON_ATTACK_RANGE: 25,
  SKELETON_DAMAGE: 1,

  // Enemies — archer
  ARCHER_SPEED: 40,
  ARCHER_HP: 1,
  ARCHER_RADIUS: 6,
  ARCHER_KEEP_DIST: 120,
  ARCHER_FIRE_INTERVAL: 2.5,
  ARCHER_ARROW_SPEED: 200,
  ARCHER_DAMAGE: 1,

  // Enemies — knight
  KNIGHT_SPEED: 35,
  KNIGHT_HP: 4,
  KNIGHT_RADIUS: 10,
  KNIGHT_ATTACK_RANGE: 28,
  KNIGHT_DAMAGE: 2,
  KNIGHT_ARMOR: 2, // hits absorbed before taking damage

  // Enemies — necromancer
  NECROMANCER_SPEED: 25,
  NECROMANCER_HP: 3,
  NECROMANCER_RADIUS: 8,
  NECROMANCER_KEEP_DIST: 160,
  NECROMANCER_SUMMON_INTERVAL: 4.0,
  NECROMANCER_DAMAGE: 0,

  // Enemies — wraith
  WRAITH_SPEED: 100,
  WRAITH_HP: 2,
  WRAITH_RADIUS: 6,
  WRAITH_ATTACK_RANGE: 22,
  WRAITH_DAMAGE: 1,
  WRAITH_PHASE_CHANCE: 0.30, // 30% chance to phase through attacks

  // Waves
  WAVE_INTERVAL: 15,
  ENEMY_MAX: 12,
  ENEMY_SPAWN_INTERVAL: 2.5,

  // Scoring
  SCORE_PER_SECOND: 1,
  SCORE_KILL_SKELETON: 10,
  SCORE_KILL_ARCHER: 15,
  SCORE_KILL_KNIGHT: 40,
  SCORE_KILL_WRAITH: 25,
  SCORE_KILL_NECROMANCER: 50,

  // Combo
  COMBO_WINDOW: 2.0,

  // Rune — Fire
  FIRE_TRAIL_DURATION: 3.0,
  FIRE_TRAIL_RADIUS: 12,
  FIRE_BURN_DAMAGE: 0.5,
  FIRE_BURN_DURATION: 2.0,
  FIRE_BURN_TICK: 0.5,

  // Rune — Ice
  ICE_SLOW_FACTOR: 0.4,
  ICE_FREEZE_DURATION: 2.0,
  ICE_FREEZE_HITS: 3, // hits to freeze

  // Rune — Lightning
  LIGHTNING_CHAIN_RANGE: 60,
  LIGHTNING_CHAIN_COUNT: 2,
  LIGHTNING_CHAIN_DAMAGE: 0.5,
  LIGHTNING_CHAIN_DURATION: 0.15,

  // Rune — Shadow
  SHADOW_TELEPORT_DIST: 40,

  // Rune Ultimate
  RUNE_ULT_CHARGE_PER_KILL: 10,
  ULT_INFERNO_BURN: 4.0,
  ULT_ABSOLUTE_ZERO_FREEZE: 4.0,
  ULT_STORM_STRIKES: 5,
  ULT_STORM_DAMAGE: 3,
  ULT_VOID_STEP_DURATION: 3.0,
  ULT_VOID_STEP_MULT: 3,

  // Parry
  PARRY_WINDOW: 0.15,
  PARRY_STUN_DURATION: 2.0,
  PARRY_DAMAGE_MULT: 2,

  // Perfect dodge
  PERFECT_DODGE_SCORE: 5,
  PERFECT_DODGE_SLOW_DURATION: 0.3,
  PERFECT_DODGE_SLOW_FACTOR: 0.3,

  // Wave events
  MEGA_KNIGHT_HP: 30,

  // Effects
  SHAKE_DURATION: 0.2,
  SHAKE_INTENSITY: 4,
  FLASH_DURATION: 0.15,
  PARTICLE_LIFETIME: 0.6,
  HITSTOP_FRAMES: 3,

  // Colors — Runes
  COLOR_FIRE: 0xff4422,
  COLOR_ICE: 0x44ccff,
  COLOR_LIGHTNING: 0xffee44,
  COLOR_SHADOW: 0x8844cc,

  // Colors — Enemies
  COLOR_SKELETON: 0xccccaa,
  COLOR_ARCHER: 0x66aa44,
  COLOR_KNIGHT: 0x8888bb,
  COLOR_WRAITH: 0xaa44ff,
  COLOR_NECROMANCER: 0x44aa66,

  // Colors — General
  COLOR_BG: 0x0a0812,
  COLOR_PLAYER: 0xeeeeff,
  COLOR_PLAYER_CORE: 0xffffff,
  COLOR_ARENA: 0x181028,
  COLOR_ARENA_BORDER: 0x332255,
  COLOR_HP_BAR: 0x44ff44,
  COLOR_HP_BAR_BG: 0x222222,
  COLOR_DANGER: 0xff2244,
  COLOR_COMBO: 0xffd700,

  // Upgrade costs
  UPGRADE_COSTS: { maxHP: [3, 6, 10], attackSpeed: [2, 5, 8], dodgeCooldown: [2, 4, 7], runepower: [4, 8, 12], ultCharge: [3, 6] } as Record<string, number[]>,
  SHARDS_PER_SCORE: 50, // 1 shard per 50 points

  // Grades
  GRADE_THRESHOLDS: [
    { min: 500, grade: "S", color: 0xffd700 },
    { min: 300, grade: "A", color: 0x44ff44 },
    { min: 150, grade: "B", color: 0x4488ff },
    { min: 75,  grade: "C", color: 0xcccccc },
    { min: 30,  grade: "D", color: 0xaa8866 },
  ],
} as const;

export function getRBGrade(score: number): { grade: string; color: number } {
  for (const t of RB.GRADE_THRESHOLDS) { if (score >= t.min) return t; }
  return { grade: "F", color: 0x886644 };
}
