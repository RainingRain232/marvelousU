// ---------------------------------------------------------------------------
// Chronomancer — State factory & persistence
// ---------------------------------------------------------------------------

import { CMPhase } from "../types";
import type { CMState, CMMeta } from "../types";
import { CM } from "../config/ChronomancerBalance";

const META_KEY = "chronomancer_meta";

export function loadCMMeta(): CMMeta {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (raw) return JSON.parse(raw) as CMMeta;
  } catch { /* ignore */ }
  return { highScore: 0, bestWave: 0, gamesPlayed: 0, shards: 0, upgrades: { maxHP: 0, boltPower: 0, dashCooldown: 0, pulsePower: 0, chronoShift: 0 } };
}

export function saveCMMeta(meta: CMMeta): void {
  if (!meta.upgrades) meta.upgrades = { maxHP: 0, boltPower: 0, dashCooldown: 0, pulsePower: 0, chronoShift: 0 };
  if (meta.shards === undefined) meta.shards = 0;
  try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch { /* ignore */ }
}

export function awardCMShards(meta: CMMeta, score: number): void {
  const earned = Math.floor(score / CM.SHARDS_PER_SCORE);
  meta.shards = (meta.shards || 0) + earned;
}

export function createCMState(sw: number, sh: number, meta?: CMMeta): CMState {
  const m = meta || loadCMMeta();
  const upg = m.upgrades || { maxHP: 0, boltPower: 0, dashCooldown: 0, pulsePower: 0, chronoShift: 0 };
  const cx = sw / 2, cy = sh / 2;
  const hp = CM.PLAYER_HP + upg.maxHP;
  const dashCd = CM.DASH_COOLDOWN - upg.dashCooldown * 0.5;
  const pulseCd = CM.PULSE_COOLDOWN - upg.pulsePower * 0.5;
  const chronoCd = CM.CHRONO_SHIFT_COOLDOWN - upg.chronoShift * 2;

  return {
    phase: CMPhase.START,
    time: 0,
    arenaW: sw, arenaH: sh,
    // Player
    playerX: cx, playerY: cy, playerRadius: CM.PLAYER_RADIUS,
    playerHP: hp, maxHP: hp,
    aimAngle: -Math.PI / 2, moveAngle: 0,
    invulnTimer: 0,
    // Abilities
    boltCooldown: 0,
    dashCooldown: 0, dashCooldownMax: dashCd,
    dashTimer: 0, dashAngle: 0, dashing: false,
    pulseCooldown: 0, pulseCooldownMax: pulseCd,
    chronoShiftCooldown: 0, chronoShiftCooldownMax: chronoCd,
    chronoShiftActive: false, chronoShiftTimer: 0,
    // Time aura
    timeAuraRadius: CM.TIME_AURA_RADIUS,
    // Combat
    enemies: [], projectiles: [], timeZones: [],
    temporalEchoes: [], particles: [], floatTexts: [],
    shockwaves: [], pickups: [],
    positionHistory: [],
    // Wave
    wave: 0, waveTimer: CM.WAVE_INTERVAL, enemySpawnTimer: 2.0,
    enemiesKilled: 0, totalKills: 0, waveEventActive: "",
    // Scoring
    score: 0, comboCount: 0, comboTimer: 0,
    killStreakCount: 0, killStreakTimer: 0,
    // Boss
    boss: null,
    bossWave: false,
    bossAnnounceTimer: 0,
    // Time freeze ability
    timeFreezeActive: false,
    timeFreezeTimer: 0,
    timeFreezeCooldown: 0,
    timeFreezeCooldownMax: 12.0,
    // Bolt power upgrade level
    boltPowerLevel: upg.boltPower,
    // Charged bolt
    chargingBolt: false,
    chargeTime: 0,
    maxChargeTime: 0.8,
    waveAnnounceTimer: 0,
    arenaHazards: [],
    lastAbilityUsed: "",
    synergyTimer: 0,
    synergyBonus: "",
    bestCombo: 0,
    // Screen effects
    screenShake: 0, screenFlashTimer: 0, screenFlashColor: 0xffffff,
    hitstopFrames: 0,
    timeDistortion: 0,
    // Meta
    nextEnemyId: 1,
    bloodStains: [],
    footstepTimer: 0,
  };
}
