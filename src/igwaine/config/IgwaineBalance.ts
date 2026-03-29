// ---------------------------------------------------------------------------
// Igwaine — Balance & Constants
// ---------------------------------------------------------------------------

import { EnemyKind, EnemyAI, Virtue, PerkId, Difficulty, WaveModifier, MetaUpgradeId } from "../types";
import type { PerkDef, MetaUpgrade } from "../types";

export const IGB = {
  // Arena
  ARENA_RADIUS: 340,
  ARENA_BORDER_DMG: 5, // damage/sec to enemies pushed into wall

  // Player
  PLAYER_RADIUS: 14,
  PLAYER_SPEED: 220,
  PLAYER_HP: 100,
  PLAYER_ENERGY: 100,
  PLAYER_ATTACK_CD: 0.22,
  PLAYER_PROJ_SPEED: 520,
  PLAYER_PROJ_DMG: 12,
  PLAYER_PROJ_LIFE: 0.8,
  PLAYER_PROJ_RADIUS: 5,
  DASH_CD: 1.5,
  DASH_DURATION: 0.15,
  DASH_SPEED: 700,
  SHIELD_DRAIN: 40,
  SHIELD_BLOCK: 0.8,
  ENERGY_REGEN: 15,
  INVULN_ON_HIT: 0.3,

  // Charged attack
  CHARGE_TIME_MIN: 0.4, // min hold to fire charged
  CHARGE_TIME_MAX: 1.2, // full charge at this time
  CHARGE_DMG_MULT: 3.0,
  CHARGE_RADIUS_MULT: 2.5,
  CHARGE_SPEED_MULT: 0.7,
  CHARGE_ENERGY_COST: 25,
  CHARGE_KNOCKBACK: 120,

  // Multi-shot (Fellowship)
  MULTISHOT_THRESHOLD: 3, // Fellowship stacks needed for +1 projectile
  MULTISHOT_SPREAD: 0.25, // radians spread per extra proj

  // Knockback
  KNOCKBACK_BASE: 60, // base knockback on enemy hit
  KNOCKBACK_PLAYER: 40, // knockback player takes from melee

  // Solar Flare ultimate
  SOLAR_FLARE_THRESHOLD: 0.7,
  SOLAR_FLARE_CD: 20,
  SOLAR_FLARE_DMG: 60,
  SOLAR_FLARE_RADIUS: 200,
  SOLAR_FLARE_ENERGY_COST: 50,

  // Pentangle Synergy
  PENTANGLE_CD: 45,
  PENTANGLE_DMG: 80,
  PENTANGLE_RADIUS: 280,
  PENTANGLE_BURST_DURATION: 0.8,

  // Projectile piercing
  PIERCE_SUN_THRESHOLD: 0.6,
  PIERCE_MAX: 3,

  // Solar cycle
  SUN_CYCLE_DURATION: 60,
  SUN_SPEED_ACCEL: 0.003, // sun gets faster each wave
  SUN_POWER_MIN: 0.5,
  SUN_POWER_MAX: 3.0,

  // Eclipse
  ECLIPSE_FIRST_WAVE: 8, // first possible eclipse
  ECLIPSE_INTERVAL_MIN: 40, // min seconds between eclipses
  ECLIPSE_INTERVAL_MAX: 80,
  ECLIPSE_DURATION: 8,
  ECLIPSE_SHADE_COUNT: 6,

  // Combo
  COMBO_DECAY: 2.5,
  COMBO_SCORE_MULT: 0.15,
  NIGHT_KILL_BONUS: 1.5,

  // Wave clear
  WAVE_CLEAR_BONUS_BASE: 50,
  WAVE_CLEAR_BONUS_SCALE: 25, // per wave
  BETWEEN_WAVE_HEAL: 8, // HP restored between waves

  // Enemies
  ENEMY_BASE_HP: 30,
  ENEMY_HP_SCALE: 1.12,
  ENEMY_BASE_DMG: 8,
  ENEMY_DMG_SCALE: 1.08,
  WAVE_BASE_COUNT: 3,
  WAVE_COUNT_SCALE: 1.5,
  WAVE_MAX_ENEMIES: 25,
  WAVE_DELAY: 2.0,
  WAVE_ANNOUNCE_DURATION: 1.5,
  GREEN_KNIGHT_WAVE_INTERVAL: 5,
  GREEN_KNIGHT_REGEN: 6,

  // Separation
  ENEMY_SEPARATION_RADIUS: 4, // extra spacing between enemies
  ENEMY_SEPARATION_FORCE: 80,

  // Green Knight boss attacks
  BOSS_CHARGE_CD: 6,
  BOSS_CHARGE_SPEED: 450,
  BOSS_CHARGE_DURATION: 0.4,
  BOSS_CHARGE_DMG_MULT: 2.5,
  BOSS_SLAM_CD: 10,
  BOSS_SLAM_RADIUS: 120,
  BOSS_SLAM_DMG: 20,
  BOSS_SPAWN_FLASH: 1.5,

  // Specter ranged attacks
  SPECTER_SHOOT_CD: 2.0,
  SPECTER_PROJ_SPEED: 280,
  SPECTER_PROJ_DMG_MULT: 0.6,
  SPECTER_PROJ_LIFE: 1.2,
  SPECTER_PREFERRED_DIST: 160,

  // Revenant
  REVENANT_SPLIT_HP_RATIO: 0.5,
  REVENANT_SPLIT_SIZE_RATIO: 0.7,

  // Wraith phase
  WRAITH_PHASE_CD: 5,
  WRAITH_PHASE_DURATION: 1.2,

  // Banshee
  BANSHEE_SCREAM_CD: 6,
  BANSHEE_SCREAM_RADIUS: 140,
  BANSHEE_FEAR_DURATION: 2.0,
  BANSHEE_FEAR_SLOW: 0.4, // movement multiplier during fear
  BANSHEE_TELEPORT_CD: 4,
  BANSHEE_TELEPORT_RANGE: 120,

  // Chain Lightning perk
  CHAIN_LIGHTNING_RANGE: 100,
  CHAIN_LIGHTNING_DMG: 15,
  CHAIN_LIGHTNING_CHAINS: 2, // base chains, +1 per extra stack

  // Golden Hour
  GOLDEN_HOUR_DURATION: 4.0,
  GOLDEN_HOUR_DMG_MULT: 1.8,
  GOLDEN_HOUR_ENERGY_REGEN_MULT: 2.0,

  // Elite enemies
  ELITE_CHANCE: 0.12, // 12% chance per enemy after wave 4
  ELITE_FIRST_WAVE: 4,
  ELITE_HP_MULT: 2.0,
  ELITE_SPEED_MULT: 1.2,
  ELITE_DMG_MULT: 1.3,
  ELITE_SCORE_MULT: 3,

  // Boss enrage
  BOSS_ENRAGE_THRESHOLD: 0.3, // HP fraction
  BOSS_ENRAGE_SPEED_MULT: 1.6,
  BOSS_ENRAGE_ATTACK_MULT: 0.6, // cooldown multiplier (lower = faster)
  BOSS_ENRAGE_SLAM_RADIUS: 160,

  // Riposte
  RIPOSTE_WINDOW: 0.2, // seconds after shield activation
  RIPOSTE_DMG: 25,
  RIPOSTE_RADIUS: 80,
  RIPOSTE_INVULN: 0.5,

  // Combo milestones
  COMBO_MILESTONE_1: 8,   // energy burst
  COMBO_MILESTONE_2: 12,  // heal
  COMBO_MILESTONE_3: 18,  // AoE nova + invuln

  // Orbital Blades perk
  ORBITAL_BLADE_RADIUS: 45,
  ORBITAL_BLADE_SPEED: 3.5, // radians/sec
  ORBITAL_BLADE_DMG: 8,
  ORBITAL_BLADE_HIT_CD: 0.5, // can't re-hit same enemy for this long

  // Shield reflect (Courtesy)
  SHIELD_REFLECT_THRESHOLD: 2, // Courtesy stacks needed
  SHIELD_REFLECT_DMG_MULT: 1.5,

  // HP orbs
  HP_ORB_DROP_CHANCE: 0.2,
  HP_ORB_HEAL: 5,
  HP_ORB_LIFE: 6,
  HP_ORB_RADIUS: 8,

  // Level-up perks
  KILLS_PER_LEVEL: 8,
  PERK_CHOICES: 3,

  // Boss escalation
  BOSS_SHOOT_FIRST_WAVE: 10, // boss starts shooting at this wave
  BOSS_SHOOT_CD: 3,
  BOSS_PROJ_COUNT: 5,
  BOSS_PROJ_SPEED: 200,
  BOSS_SUMMON_FIRST_WAVE: 15,
  BOSS_SUMMON_CD: 12,
  BOSS_SUMMON_COUNT: 3,

  // Dark Knight shield bash
  DARK_KNIGHT_BASH_CD: 4,
  DARK_KNIGHT_BASH_STUN: 0.6,
  DARK_KNIGHT_BASH_KNOCKBACK: 100,
  DARK_KNIGHT_BASH_RANGE: 30,

  // Arena hazards
  HAZARD_FIRST_WAVE: 6,
  HAZARD_DMG: 15, // per second
  HAZARD_ARC_WIDTH: 0.6, // radians
  HAZARD_ROT_SPEED: 0.5,

  // Kill streaks
  STREAK_WINDOW: 1.5, // seconds

  // Slow-motion
  SLOWMO_DURATION: 0.4,
  SLOWMO_FACTOR: 0.3,

  // Spawn immunity
  SPAWN_IMMUNITY: 0.5,

  // Virtue pickups
  VIRTUE_DROP_CHANCE: 0.4,
  VIRTUE_DURATION: 8,
  VIRTUE_BONUS_PER_STACK: 0.05,

  // Visual
  COLOR_GOLD: 0xffd700,
  COLOR_SUN: 0xffaa00,
  COLOR_MOON: 0x4466aa,
  COLOR_PLAYER: 0xe8c840,
  COLOR_SHIELD: 0x40a0ff,
  COLOR_BG_DAY: 0x1a1420,
  COLOR_BG_NIGHT: 0x060610,
  COLOR_ARENA_BORDER: 0x886622,
  COLOR_HP: 0xcc3333,
  COLOR_ENERGY: 0x3388ff,
  COLOR_TEXT: 0xddccaa,
  COLOR_GREEN_KNIGHT: 0x228b22,
  COLOR_COMBO: 0xff8844,
  COLOR_SOLAR_FLARE: 0xffdd44,
  COLOR_BOSS_SLAM: 0x44cc44,
  COLOR_PENTANGLE_BURST: 0xffcc66,
  COLOR_ECLIPSE: 0x220033,
  COLOR_REVENANT: 0x996633,
  COLOR_CHARGED: 0xffeedd,
  COLOR_DANGER: 0xff2222,
  COLOR_BANSHEE: 0xaa55dd,
  COLOR_CHAIN_LIGHTNING: 0x88ccff,
  COLOR_GOLDEN_HOUR: 0xffee66,
  COLOR_FEAR: 0xcc66ff,
  COLOR_ELITE: 0xffdd00,
  COLOR_ENRAGE: 0xff3300,
  COLOR_RIPOSTE: 0x66ffff,
  COLOR_ORBITAL: 0xffaa44,
  COLOR_SYNERGY: 0xddaaff,

  // Shake
  SHAKE_INTENSITY: 6,
  SHAKE_DECAY: 8,
} as const;

export const ENEMY_DEFS: Record<EnemyKind, {
  hp: number; speed: number; dmg: number; radius: number;
  color: number; attackCd: number; regen: number; ai: EnemyAI; splitCount: number;
}> = {
  [EnemyKind.WRAITH]:       { hp: 1.0, speed: 100, dmg: 1.0, radius: 10, color: 0x8866cc, attackCd: 1.2, regen: 0, ai: EnemyAI.CHASE, splitCount: 0 },
  [EnemyKind.DARK_KNIGHT]:  { hp: 2.0, speed: 70,  dmg: 1.5, radius: 14, color: 0x444488, attackCd: 1.5, regen: 0, ai: EnemyAI.FLANK, splitCount: 0 },
  [EnemyKind.SHADE]:        { hp: 0.6, speed: 160, dmg: 0.7, radius: 8,  color: 0x664488, attackCd: 0.8, regen: 0, ai: EnemyAI.CIRCLE, splitCount: 0 },
  [EnemyKind.SPECTER]:      { hp: 1.5, speed: 90,  dmg: 1.2, radius: 12, color: 0x5555aa, attackCd: 1.0, regen: 0, ai: EnemyAI.RANGED, splitCount: 0 },
  [EnemyKind.REVENANT]:     { hp: 1.8, speed: 85,  dmg: 1.0, radius: 12, color: 0x996633, attackCd: 1.3, regen: 0, ai: EnemyAI.CHASE, splitCount: 1 },
  [EnemyKind.BANSHEE]:      { hp: 1.2, speed: 75,  dmg: 0.5, radius: 11, color: 0xaa55dd, attackCd: 2.0, regen: 0, ai: EnemyAI.BANSHEE, splitCount: 0 },
  [EnemyKind.GREEN_KNIGHT]: { hp: 8.0, speed: 55,  dmg: 2.5, radius: 20, color: 0x228b22, attackCd: 2.0, regen: 6, ai: EnemyAI.BOSS, splitCount: 0 },
};

export const VIRTUE_COLORS: Record<Virtue, number> = {
  [Virtue.FELLOWSHIP]:  0xff6644,
  [Virtue.GENEROSITY]:  0xffcc00,
  [Virtue.CHASTITY]:    0xeeeeff,
  [Virtue.COURTESY]:    0x66bbff,
  [Virtue.PIETY]:       0xaa88ff,
};

export const ALL_PERKS: PerkDef[] = [
  { id: PerkId.ATK_SPEED, name: "Swift Strikes", desc: "Attack 15% faster", color: 0xff8844 },
  { id: PerkId.PROJ_SIZE, name: "Broadhead", desc: "Projectiles 25% bigger", color: 0xffcc44 },
  { id: PerkId.MAX_HP, name: "Fortitude", desc: "+20 max HP (heals to full)", color: 0xcc3333 },
  { id: PerkId.MAX_ENERGY, name: "Deep Wells", desc: "+25 max energy", color: 0x3388ff },
  { id: PerkId.LIFESTEAL, name: "Soul Siphon", desc: "Heal 2 HP per kill", color: 0xaa44aa },
  { id: PerkId.EXPLOSION_ON_KILL, name: "Volatile", desc: "Enemies explode on death, damaging nearby", color: 0xff4422 },
  { id: PerkId.PROJ_SPEED, name: "Velocity", desc: "Projectiles 20% faster", color: 0x44ccff },
  { id: PerkId.DASH_RESET_ON_KILL, name: "Momentum", desc: "Kills reduce dash cooldown by 0.5s", color: 0xffdd00 },
  { id: PerkId.THORNS, name: "Thorns", desc: "Melee attackers take 5 damage", color: 0x886622 },
  { id: PerkId.SOLAR_INTENSITY, name: "Solar Intensity", desc: "Sun power range increased (0.3x-3.5x)", color: 0xffaa00 },
  { id: PerkId.DOUBLE_VIRTUE, name: "Grail Blessing", desc: "Virtue pickups give double stacks", color: 0xddaaff },
  { id: PerkId.MAGNETIC_RANGE, name: "Magnetism", desc: "Pickup attraction range doubled", color: 0x44ff88 },
  { id: PerkId.CHAIN_LIGHTNING, name: "Chain Lightning", desc: "Kills arc lightning to 2 nearby enemies (+1 per stack)", color: 0x88ccff },
  { id: PerkId.ORBITAL_BLADES, name: "Orbital Blades", desc: "Spinning blades orbit you, damaging enemies (+1 blade per stack)", color: 0xffaa44 },
];

export const DIFFICULTY_SETTINGS: Record<Difficulty, { hpMult: number; enemyHpMult: number; enemyDmgMult: number; enemySpeedMult: number; sunCycleMult: number; label: string; color: number }> = {
  [Difficulty.EASY]:   { hpMult: 1.5, enemyHpMult: 0.7, enemyDmgMult: 0.7, enemySpeedMult: 0.85, sunCycleMult: 0.8, label: "EASY", color: 0x44cc44 },
  [Difficulty.NORMAL]: { hpMult: 1.0, enemyHpMult: 1.0, enemyDmgMult: 1.0, enemySpeedMult: 1.0,  sunCycleMult: 1.0, label: "NORMAL", color: 0xddaa44 },
  [Difficulty.HARD]:   { hpMult: 0.7, enemyHpMult: 1.4, enemyDmgMult: 1.3, enemySpeedMult: 1.15, sunCycleMult: 1.3, label: "HARD", color: 0xcc3333 },
};

export const WAVE_MODIFIER_LABELS: Record<WaveModifier, { name: string; desc: string; color: number }> = {
  [WaveModifier.NONE]:     { name: "", desc: "", color: 0 },
  [WaveModifier.SWIFT]:    { name: "SWIFT HORDE", desc: "Enemies 40% faster", color: 0x44ccff },
  [WaveModifier.ARMORED]:  { name: "ARMORED", desc: "Enemies have +50% HP", color: 0x888888 },
  [WaveModifier.VAMPIRIC]: { name: "VAMPIRIC", desc: "Enemies heal on hit", color: 0xcc44cc },
  [WaveModifier.SWARM]:    { name: "SWARM", desc: "+50% enemies, smaller", color: 0xffaa44 },
  [WaveModifier.VOLATILE]: { name: "VOLATILE", desc: "Enemies explode on death", color: 0xff4422 },
  [WaveModifier.SHIELDED]: { name: "SHIELDED", desc: "Enemies resist damage initially", color: 0x4488cc },
  [WaveModifier.MOONLIT]:  { name: "MOONLIT", desc: "Forced nighttime", color: 0x4444aa },
  [WaveModifier.CURSED]:   { name: "CURSED", desc: "2x enemy damage, 2x score", color: 0xcc44cc },
};

export const VIRTUE_LABELS: Record<Virtue, string> = {
  [Virtue.FELLOWSHIP]:  "Fellowship (+dmg, multi-shot)",
  [Virtue.GENEROSITY]:  "Generosity (+energy regen)",
  [Virtue.CHASTITY]:    "Chastity (+speed)",
  [Virtue.COURTESY]:    "Courtesy (+shield)",
  [Virtue.PIETY]:       "Piety (+hp regen)",
};
