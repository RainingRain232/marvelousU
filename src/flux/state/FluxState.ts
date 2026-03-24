// ---------------------------------------------------------------------------
// Flux — State factory & persistence (v2)
// ---------------------------------------------------------------------------

import type { FluxState, FluxMeta, FluxUpgrades } from "../types";
import { FluxPhase } from "../types";
import { FLUX_BALANCE as B } from "../config/FluxBalance";

const META_KEY = "flux_meta_v2";
const DEF_UP: FluxUpgrades = { maxHp: 0, wellPower: 0, extraCharge: 0, bombCharge: 0 };

export function loadFluxMeta(): FluxMeta {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (raw) {
      const m = JSON.parse(raw) as FluxMeta;
      if (!m.upgrades) m.upgrades = { ...DEF_UP };
      if (m.voidShards === undefined) m.voidShards = 0;
      return m;
    }
  } catch { /* ignore */ }
  return { highScore: 0, bestWave: 0, bestCombo: 0, totalKills: 0, gamesPlayed: 0, voidShards: 0, upgrades: { ...DEF_UP } };
}

export function saveFluxMeta(m: FluxMeta): void {
  try { localStorage.setItem(META_KEY, JSON.stringify(m)); } catch { /* ignore */ }
}

export function calcVoidShards(s: FluxState): number {
  return s.wave * 2 + Math.floor(s.totalCollisions * 0.5) + Math.floor(s.totalRedirects * 0.3);
}

export function createFluxState(sw: number, sh: number, meta: FluxMeta): FluxState {
  const arenaW = sw - B.ARENA_PADDING * 2;
  const arenaH = sh - B.ARENA_PADDING * 2;
  const up = meta.upgrades || DEF_UP;
  return {
    phase: FluxPhase.START,
    arenaW, arenaH,
    px: arenaW / 2, py: arenaH / 2,
    pvx: 0, pvy: 0,
    hp: B.PLAYER_HP + up.maxHp, maxHp: B.PLAYER_HP + up.maxHp,
    invincibleTimer: 0,
    wells: [],
    wellCharges: B.WELL_MAX_CHARGES + up.extraCharge,
    maxWellCharges: B.WELL_MAX_CHARGES + up.extraCharge,
    wellRechargeTimer: 0, dashCooldown: 0,
    gravBombCharge: 0, gravBombActive: 0, repulsorCooldown: 0,
    upgradeWellStrength: 0, upgradeWellRadius: 0, upgradeRechargeSpeed: 0, upgradeMaxCharges: 0,
    spawnWarnings: [],
    enemies: [], projectiles: [],
    wave: 0, waveTimer: 2.0, waveSpawnCount: 0, waveSpawnTimer: 0, waveClearTimer: 0,
    score: 0, highScore: meta.highScore,
    combo: 0, comboTimer: 0, bestCombo: 0,
    totalKills: 0, totalRedirects: 0, totalCollisions: 0,
    frameKills: 0, frameCollisions: 0, frameRedirects: 0, frameExplosions: 0,
    aimAngle: 0,
    tutorialStep: 0, tutorialTimer: 0,
    time: 0,
    particles: [], floatingTexts: [],
    screenShake: 0, screenFlashColor: 0, screenFlashTimer: 0,
    arenaPulse: 0,
  };
}
