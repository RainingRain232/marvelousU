// ---------------------------------------------------------------------------
// Shapeshifter — Balance constants
// ---------------------------------------------------------------------------

export const SS = {
  // Player base
  PLAYER_RADIUS: 8,
  PLAYER_HP: 8,
  FORM_SWITCH_COOLDOWN: 0.3,

  // Wolf form
  WOLF_SPEED: 220,
  WOLF_LUNGE_DAMAGE: 2,
  WOLF_LUNGE_RANGE: 50,
  WOLF_LUNGE_SPEED: 500,
  WOLF_LUNGE_DURATION: 0.12,
  WOLF_LUNGE_COOLDOWN: 0.4,
  WOLF_SPRINT_DURATION: 1.5,
  WOLF_SPRINT_SPEED: 380,
  WOLF_SPRINT_COOLDOWN: 4.0,
  WOLF_ALLY_COUNT: 2,

  // Eagle form
  EAGLE_SPEED: 160,
  EAGLE_BOLT_DAMAGE: 1,
  EAGLE_BOLT_SPEED: 320,
  EAGLE_BOLT_COOLDOWN: 0.35,
  EAGLE_BOLT_RADIUS: 4,
  EAGLE_BOLT_LIFE: 2.0,
  EAGLE_DIVE_DAMAGE: 3,
  EAGLE_DIVE_RADIUS: 45,
  EAGLE_DIVE_SPEED: 600,
  EAGLE_DIVE_DURATION: 0.2,
  EAGLE_DIVE_COOLDOWN: 5.0,
  EAGLE_WHIRLWIND_DURATION: 4.0,
  EAGLE_WHIRLWIND_RADIUS: 50,
  EAGLE_WHIRLWIND_DAMAGE: 0.5,

  // Bear form
  BEAR_SPEED: 100,
  BEAR_HP_BONUS: 4, // extra HP when in bear form
  BEAR_SWIPE_DAMAGE: 3,
  BEAR_SWIPE_RADIUS: 55,
  BEAR_SWIPE_ARC: Math.PI * 0.6,
  BEAR_SWIPE_COOLDOWN: 0.6,
  BEAR_ROAR_RADIUS: 100,
  BEAR_ROAR_STUN_DURATION: 1.5,
  BEAR_ROAR_COOLDOWN: 8.0,
  BEAR_SLAM_DAMAGE: 5,
  BEAR_SLAM_RADIUS: 90,
  BEAR_SLAM_COOLDOWN: 15.0,

  // Allies
  ALLY_DURATION: 10.0,
  ALLY_SPEED: 140,
  ALLY_DAMAGE: 1,
  ALLY_HP: 3,
  ALLY_RADIUS: 5,
  ALLY_ATTACK_COOLDOWN: 1.0,
  ALLY_SUMMON_COOLDOWN: 12.0,

  // Enemies
  GOBLIN_HP: 2, GOBLIN_SPEED: 90, GOBLIN_RADIUS: 6, GOBLIN_DAMAGE: 1, GOBLIN_ATTACK_RANGE: 16,
  ORC_ARCHER_HP: 2, ORC_ARCHER_SPEED: 40, ORC_ARCHER_RADIUS: 7, ORC_ARCHER_FIRE_INTERVAL: 2.5, ORC_ARCHER_KEEP_DIST: 120,
  TROLL_HP: 6, TROLL_SPEED: 35, TROLL_RADIUS: 12, TROLL_DAMAGE: 2, TROLL_ATTACK_RANGE: 22,
  SHADOW_WOLF_HP: 2, SHADOW_WOLF_SPEED: 130, SHADOW_WOLF_RADIUS: 6, SHADOW_WOLF_DAMAGE: 1,
  DARK_DRUID_HP: 3, DARK_DRUID_SPEED: 30, DARK_DRUID_RADIUS: 7, DARK_DRUID_SUMMON_INTERVAL: 5.0, DARK_DRUID_KEEP_DIST: 140,

  // Waves
  WAVE_INTERVAL: 25.0,
  ENEMY_SPAWN_INTERVAL: 2.0,
  ENEMY_MAX: 25,

  // Scoring
  GOBLIN_SCORE: 10, ORC_ARCHER_SCORE: 15, TROLL_SCORE: 40, SHADOW_WOLF_SCORE: 20, DARK_DRUID_SCORE: 35,
  SCORE_PER_SECOND: 1,
  SHARDS_PER_SCORE: 50,

  // Effects
  SHAKE_INTENSITY: 4, SHAKE_DURATION: 0.2, FLASH_DURATION: 0.3, INVULN_DURATION: 0.5,

  // Colors
  COLOR_WOLF: 0x88aacc,
  COLOR_WOLF_BRIGHT: 0xaaccee,
  COLOR_EAGLE: 0xddaa44,
  COLOR_EAGLE_BRIGHT: 0xffcc66,
  COLOR_BEAR: 0x885533,
  COLOR_BEAR_BRIGHT: 0xaa7744,
  COLOR_DANGER: 0xff2244,
  COLOR_GOLD: 0xffd700,
  COLOR_NATURE: 0x44aa44,

  // Grades
  GRADE_S: 2000, GRADE_A: 1200, GRADE_B: 700, GRADE_C: 300, GRADE_D: 100,

  // Upgrades
  UPGRADE_COSTS: {
    maxHP: [5, 10, 20],
    wolfPower: [5, 10, 20],
    eaglePower: [5, 10, 20],
    bearPower: [5, 10, 20],
    allyDuration: [12, 25],
  } as Record<string, number[]>,
};

export function getSSGrade(score: number): { grade: string; color: number } {
  if (score >= SS.GRADE_S) return { grade: "S", color: 0xffdd44 };
  if (score >= SS.GRADE_A) return { grade: "A", color: 0xff6622 };
  if (score >= SS.GRADE_B) return { grade: "B", color: 0x44aaff };
  if (score >= SS.GRADE_C) return { grade: "C", color: 0x44cc44 };
  if (score >= SS.GRADE_D) return { grade: "D", color: 0xaaaaaa };
  return { grade: "F", color: 0x666666 };
}
