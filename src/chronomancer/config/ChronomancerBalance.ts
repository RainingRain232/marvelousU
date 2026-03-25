// ---------------------------------------------------------------------------
// Chronomancer — Balance constants
// ---------------------------------------------------------------------------

export const CM = {
  // Player
  PLAYER_SPEED: 170,
  PLAYER_RADIUS: 8,
  PLAYER_HP: 6,

  // Time Bolt (primary attack)
  BOLT_COOLDOWN: 0.3,
  BOLT_SPEED: 350,
  BOLT_DAMAGE: 1,
  BOLT_RADIUS: 4,
  BOLT_LIFE: 2.0,
  BOLT_SLOW_FACTOR: 0.4, // slow to 40% speed
  BOLT_SLOW_DURATION: 1.5,

  // Time Dash (Shift)
  DASH_SPEED: 450,
  DASH_DURATION: 0.15,
  DASH_COOLDOWN: 3.0,
  ECHO_DELAY: 0.8, // echo explodes after this
  ECHO_RADIUS: 50,
  ECHO_DAMAGE: 2,

  // Time Pulse (Space)
  PULSE_COOLDOWN: 6.0,
  PULSE_RADIUS: 120,
  PULSE_SLOW_FACTOR: 0.2,
  PULSE_DURATION: 3.0,

  // Chrono Shift (Q - ultimate)
  CHRONO_SHIFT_COOLDOWN: 20.0,
  CHRONO_SHIFT_DURATION: 0.5, // rewind animation time
  CHRONO_SHIFT_REWIND: 3.0, // seconds of history to rewind

  // Time Aura (passive)
  TIME_AURA_RADIUS: 70,
  TIME_AURA_SLOW: 0.7, // enemies near you are slowed to 70%

  // Enemy types
  FOOTMAN_HP: 2, FOOTMAN_SPEED: 80, FOOTMAN_RADIUS: 7, FOOTMAN_DAMAGE: 1, FOOTMAN_ATTACK_RANGE: 18,
  ARCHER_HP: 1, ARCHER_SPEED: 45, ARCHER_RADIUS: 6, ARCHER_FIRE_INTERVAL: 2.0, ARCHER_KEEP_DIST: 130,
  SHIELDBEARER_HP: 4, SHIELDBEARER_SPEED: 50, SHIELDBEARER_RADIUS: 9, SHIELDBEARER_DAMAGE: 1, SHIELDBEARER_ATTACK_RANGE: 20,
  CHRONO_KNIGHT_HP: 5, CHRONO_KNIGHT_SPEED: 60, CHRONO_KNIGHT_RADIUS: 10, CHRONO_KNIGHT_DAMAGE: 2, CHRONO_KNIGHT_ATTACK_RANGE: 22,
  TIME_WRAITH_HP: 2, TIME_WRAITH_SPEED: 100, TIME_WRAITH_RADIUS: 7, TIME_WRAITH_DAMAGE: 1, TIME_WRAITH_TELEPORT_INTERVAL: 3.0,

  // Waves
  WAVE_INTERVAL: 25.0,
  ENEMY_SPAWN_INTERVAL: 2.0,
  ENEMY_MAX: 25,

  // Scoring
  FOOTMAN_SCORE: 10,
  ARCHER_SCORE: 15,
  SHIELDBEARER_SCORE: 30,
  CHRONO_KNIGHT_SCORE: 50,
  TIME_WRAITH_SCORE: 25,
  SCORE_PER_SECOND: 1,
  SHARDS_PER_SCORE: 50,

  // Effects
  SHAKE_INTENSITY: 4,
  SHAKE_DURATION: 0.2,
  FLASH_DURATION: 0.3,
  INVULN_DURATION: 0.5,

  // Colors
  COLOR_TIME: 0x6644cc,
  COLOR_TIME_BRIGHT: 0x8866ff,
  COLOR_TIME_DARK: 0x3322aa,
  COLOR_BOLT: 0x9966ff,
  COLOR_ECHO: 0x44aaff,
  COLOR_PULSE: 0x6688ff,
  COLOR_REWIND: 0x22ffaa,
  COLOR_DANGER: 0xff2244,
  COLOR_GOLD: 0xffd700,

  // Grades
  GRADE_S: 2000,
  GRADE_A: 1200,
  GRADE_B: 700,
  GRADE_C: 300,
  GRADE_D: 100,

  // Upgrades
  UPGRADE_COSTS: {
    maxHP: [5, 10, 20],
    boltPower: [5, 10, 20],
    dashCooldown: [8, 15, 25],
    pulsePower: [8, 15, 25],
    chronoShift: [15, 30],
  } as Record<string, number[]>,
};

export function getCMGrade(score: number): { grade: string; color: number } {
  if (score >= CM.GRADE_S) return { grade: "S", color: 0xffdd44 };
  if (score >= CM.GRADE_A) return { grade: "A", color: 0xff6622 };
  if (score >= CM.GRADE_B) return { grade: "B", color: 0x44aaff };
  if (score >= CM.GRADE_C) return { grade: "C", color: 0x44cc44 };
  if (score >= CM.GRADE_D) return { grade: "D", color: 0xaaaaaa };
  return { grade: "F", color: 0x666666 };
}
