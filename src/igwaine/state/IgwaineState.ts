// ---------------------------------------------------------------------------
// Igwaine — State Factory & Persistence
// ---------------------------------------------------------------------------

import { IgwainePhase, Virtue, PerkId, Difficulty, WaveModifier } from "../types";
import type { IgwaineState } from "../types";
import { IGB, DIFFICULTY_SETTINGS } from "../config/IgwaineBalance";

export function createIgwaineState(sw: number, sh: number, bestWave: number, bestScore: number, difficulty: Difficulty = Difficulty.NORMAL): IgwaineState {
  const diff = DIFFICULTY_SETTINGS[difficulty];
  return {
    phase: IgwainePhase.START,
    difficulty,
    screenW: sw,
    screenH: sh,
    px: sw / 2,
    py: sh / 2,
    pvx: 0,
    pvy: 0,
    hp: Math.round(IGB.PLAYER_HP * diff.hpMult),
    maxHp: Math.round(IGB.PLAYER_HP * diff.hpMult),
    energy: IGB.PLAYER_ENERGY,
    maxEnergy: IGB.PLAYER_ENERGY,
    shielding: false,
    attackCd: 0,
    dashCd: 0,
    dashTimer: 0,
    invulnTimer: 0,
    aimDirX: 1,
    aimDirY: 0,
    stunTimer: 0,
    chargeTime: 0,
    chargeAimX: 1,
    chargeAimY: 0,
    solarFlareReady: false,
    solarFlareCd: 0,
    sunPhase: 0.25,
    sunSpeed: 1 / IGB.SUN_CYCLE_DURATION,
    score: 0,
    kills: 0,
    wave: 0,
    enemiesRemaining: 0,
    enemies: [],
    projectiles: [],
    shockwaves: [],
    virtuePickups: [],
    floatingTexts: [],
    particles: [],
    combo: 0,
    comboTimer: 0,
    bestCombo: 0,
    killsToLevel: IGB.KILLS_PER_LEVEL,
    level: 0,
    perks: [],
    perkChoice: null,
    perkCounts: Object.fromEntries(Object.values(PerkId).map(p => [p, 0])) as Record<PerkId, number>,
    hpOrbs: [],
    pentangleSynergyReady: false,
    pentangleSynergyCd: 0,
    pentangleBurstTimer: 0,
    streakTimer: 0,
    streakCount: 0,
    streakText: "",
    streakTextTimer: 0,
    slowMoTimer: 0,
    slowMoFactor: 1,
    screenFlashTimer: 0,
    screenFlashColor: 0xffffff,
    hazards: [],
    eclipseTimer: 0,
    preEclipseSunPhase: 0.25,
    eclipseNext: IGB.ECLIPSE_INTERVAL_MIN + Math.random() * (IGB.ECLIPSE_INTERVAL_MAX - IGB.ECLIPSE_INTERVAL_MIN),
    virtues: {
      [Virtue.FELLOWSHIP]: 0,
      [Virtue.GENEROSITY]: 0,
      [Virtue.CHASTITY]: 0,
      [Virtue.COURTESY]: 0,
      [Virtue.PIETY]: 0,
    },
    waveDelay: 1.0,
    waveAnnounceTimer: 0,
    waveClearBonusTimer: 0,
    waveModifier: WaveModifier.NONE,
    waveModifierText: "",
    screenShake: 0,
    gameTime: 0,
    bestWave,
    bestScore,
    deathTimer: 0,
    goldenHourTimer: 0,
    goldenHourTriggered: false,
    fearTimer: 0,
    fearSlowFactor: 1,
    riposteWindow: 0,
    riposteFlashTimer: 0,
    orbitalAngle: 0,
    activeSynergies: [],
    lastComboReward: 0,
    shardsEarned: 0,
  };
}

const SAVE_KEY = "igwaine_best_v1";

export function loadIgwaineBest(): { bestWave: number; bestScore: number } {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { bestWave: 0, bestScore: 0 };
    return JSON.parse(raw);
  } catch { return { bestWave: 0, bestScore: 0 }; }
}

export function saveIgwaineBest(wave: number, score: number): void {
  const prev = loadIgwaineBest();
  const best = { bestWave: Math.max(prev.bestWave, wave), bestScore: Math.max(prev.bestScore, score) };
  localStorage.setItem(SAVE_KEY, JSON.stringify(best));
}
