// ---------------------------------------------------------------------------
// Runeblade — State factory & persistence
// ---------------------------------------------------------------------------

import { RBPhase } from "../types";
import type { RBState, RBMeta } from "../types";
import { RB } from "../config/RunebladeBalance";

const META_KEY = "runeblade_meta";

export function loadRBMeta(): RBMeta {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (raw) return JSON.parse(raw) as RBMeta;
  } catch { /* ignore */ }
  return { highScore: 0, bestWave: 0, gamesPlayed: 0, shards: 0, upgrades: { maxHP: 0, attackSpeed: 0, dodgeCooldown: 0, runepower: 0, ultCharge: 0 } };
}

export function saveRBMeta(meta: RBMeta): void {
  // Ensure upgrades structure exists for old saves
  if (!meta.upgrades) meta.upgrades = { maxHP: 0, attackSpeed: 0, dodgeCooldown: 0, runepower: 0, ultCharge: 0 };
  if (meta.shards === undefined) meta.shards = 0;
  try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch { /* ignore */ }
}

export function awardShards(meta: RBMeta, score: number): void {
  const earned = Math.floor(score / RB.SHARDS_PER_SCORE);
  meta.shards = (meta.shards || 0) + earned;
}

export function createRBState(sw: number, sh: number, meta?: RBMeta): RBState {
  const m = meta || loadRBMeta();
  const upg = m.upgrades || { maxHP: 0, attackSpeed: 0, dodgeCooldown: 0, runepower: 0, ultCharge: 0 };
  const cx = sw / 2, cy = sh / 2;
  const hp = RB.PLAYER_HP + upg.maxHP;          // +1 HP per level
  const atkCd = RB.ATTACK_COOLDOWN - upg.attackSpeed * 0.03; // -0.03s per level
  const dodgeCd = RB.DODGE_COOLDOWN - upg.dodgeCooldown * 0.1; // -0.1s per level
  return {
    phase: RBPhase.START,
    time: 0,
    // Arena
    arenaW: sw, arenaH: sh,
    // Player
    playerX: cx, playerY: cy, playerRadius: RB.PLAYER_RADIUS,
    playerHP: hp, maxHP: hp,
    aimAngle: -Math.PI / 2, moveAngle: 0,
    attackTimer: 0, attackCooldown: atkCd,
    dodgeTimer: 0, dodgeCooldown: 0, dodgeCooldownMax: dodgeCd,
    dodging: false, dodgeAngle: 0,
    invulnTimer: 0,
    // Runes
    currentRune: "fire",
    prevRune: "fire", runeSwitchTimer: 0,
    runeCharges: { fire: 0, ice: 0, lightning: 0, shadow: 0 },
    // Rune ultimate
    runeUltCharge: 0, ultimateActive: "", ultimateTimer: 0,
    // Combat
    comboCount: 0, comboTimer: 0,
    slashes: [], enemies: [], projectiles: [],
    particles: [], floatTexts: [],
    fireTrails: [], lightningChains: [], shockwaves: [],
    // Wave
    wave: 0, waveTimer: RB.WAVE_INTERVAL, enemySpawnTimer: 2.0,
    enemiesKilled: 0, totalKills: 0,
    waveEventActive: "", waveSpeedBoost: 0,
    // Scoring
    score: 0, screenShake: 0,
    screenFlashTimer: 0, screenFlashColor: 0xffffff,
    // Parry / Perfect dodge
    slowTimer: 0,
    // Meta
    hitstopFrames: 0,
    nextEnemyId: 1,
    // Rune mastery
    runeKills: { fire: 0, ice: 0, lightning: 0, shadow: 0 },
    runeMastery: { fire: 0, ice: 0, lightning: 0, shadow: 0 },
    // Meta-progression applied values
    ultChargeBonus: upg.ultCharge * 3,          // +3 charge per kill per level
    runepowerBonus: upg.runepower * 0.25,       // +25% rune effect per level
    // Rune synergy combos
    lastKillRune: null,
    synergyBonus: "",
    synergyTimer: 0,
    // Execution mechanic
    executeTimer: 0,
    // Blood moon
    bloodMoonActive: false,
    // Slash ghosts
    slashGhosts: [],
    // Footstep dust
    footstepTimer: 0,
    // Rune ambient particles
    ambientParticles: [],
    // Blood stains
    bloodStains: [],
    // Synergy next-attack bonuses
    synergyVoidBoltActive: false,
    synergyDarkFlameActive: false,
    // Boss system
    boss: null,
    bossWave: false,
    bossAnnounceTimer: 0,
    // Arena hazards
    arenaHazards: [],
    hazardDamageCooldown: 0,
    // Dash attack
    dashStrikeUsed: false,
    // Pickups
    pickups: [],
    killStreakTimer: 0,
    killStreakCount: 0,
  };
}
