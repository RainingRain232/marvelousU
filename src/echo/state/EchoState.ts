// ---------------------------------------------------------------------------
// Echo — State factory & persistence
// ---------------------------------------------------------------------------

import type { EchoState, EchoMeta } from "../types";
import { EchoPhase } from "../types";
import { ECHO_BALANCE as B } from "../config/EchoBalance";

const META_KEY = "echo_meta";

export function loadEchoMeta(): EchoMeta {
  try { const raw = localStorage.getItem(META_KEY); if (raw) return JSON.parse(raw) as EchoMeta; } catch { /* */ }
  return { highScore: 0, bestLoop: 0, totalKills: 0, gamesPlayed: 0 };
}

export function saveEchoMeta(m: EchoMeta): void {
  try { localStorage.setItem(META_KEY, JSON.stringify(m)); } catch { /* */ }
}

export function createEchoState(sw: number, sh: number, meta: EchoMeta): EchoState {
  const arenaW = sw - B.ARENA_PADDING * 2, arenaH = sh - B.ARENA_PADDING * 2;
  return {
    phase: EchoPhase.START, arenaW, arenaH,
    px: arenaW / 2, py: arenaH / 2, aimAngle: 0,
    hp: B.PLAYER_HP, maxHp: B.PLAYER_HP, invincibleTimer: 0, shootCooldown: 0,
    loopNumber: 1, loopTimer: 0, loopDuration: B.LOOP_DURATION,
    currentRecording: [], ghosts: [], recordingFrame: 0, ghostFrame: 0,
    enemies: [], bullets: [], enemySpawnTimer: 1.5,
    upgradeFireRate: 0, upgradeBulletSize: 0, upgradeSpeed: 0, upgradeMaxHp: 0,
    loopTransitionTimer: 0, timePressure: 0, intensity: 0,
    timeStopCooldown: 0, timeStopActive: 0,
    bossSpawned: false, bossAlive: false,
    score: 0, highScore: meta.highScore, totalKills: 0, ghostKills: 0,
    combo: 0, comboTimer: 0, bestCombo: 0,
    time: 0,
    particles: [], floatingTexts: [],
    screenShake: 0, screenFlashColor: 0, screenFlashTimer: 0,
  };
}
