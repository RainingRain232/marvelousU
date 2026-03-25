// ---------------------------------------------------------------------------
// Void Knight — State factory & persistence (v2)
// ---------------------------------------------------------------------------

import { VKPhase } from "../types";
import type { VKState, VKMeta } from "../types";
import { VK } from "../config/VoidKnightBalance";

const META_KEY = "voidknight_meta";

export function loadVKMeta(): VKMeta {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (raw) {
      const m = JSON.parse(raw) as VKMeta;
      if (m.bestMultiplier === undefined) m.bestMultiplier = 0;
      if (m.totalSpawnersDestroyed === undefined) m.totalSpawnersDestroyed = 0;
      if (!m.unlocks) m.unlocks = [];
      return m;
    }
  } catch { /* ignore */ }
  return { highScore: 0, bestWave: 0, bestMultiplier: 0, gamesPlayed: 0, totalNearMisses: 0, totalOrbsCollected: 0, totalSpawnersDestroyed: 0, unlocks: [] };
}

export function saveVKMeta(meta: VKMeta): void {
  try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch { /* ignore */ }
}

export function createVKState(sw: number, sh: number, meta?: VKMeta): VKState {
  const m = meta || loadVKMeta();
  const cx = sw / 2, cy = sh / 2;
  return {
    phase: VKPhase.START,
    arenaRadius: VK.ARENA_BASE_RADIUS,
    arenaCenterX: cx, arenaCenterY: cy,
    playerX: cx, playerY: cy,
    playerVX: 0, playerVY: 0,
    playerRadius: VK.PLAYER_RADIUS,
    playerSpeed: VK.PLAYER_SPEED,
    dashCooldown: 0, dashTimer: 0,
    dashDirX: 0, dashDirY: 0,
    dashKills: 0,
    shieldHits: 0, slowTimer: 0, magnetTimer: 0, reflectTimer: 0,
    score: 0, highScore: m.highScore,
    nearMisses: 0, orbsCollected: 0,
    multiplier: 1.0, multiplierDecay: 0,
    grazeMeter: 0, grazeBurstReady: false,
    hitstopTimer: 0,
    wave: 0, waveTimer: VK.WAVE_DURATION,
    spawners: [], projectiles: [], orbs: [],
    orbTimer: VK.ORB_SPAWN_INTERVAL,
    particles: [], floatTexts: [],
    shockwaves: [],
    hazards: [], hazardTimer: VK.HAZARD_SPAWN_INTERVAL,
    hasteTimer: 0,
    gravityWells: [],
    afterimages: [],
    waveMutators: [],
    selectedPerks: [], perkChoices: [],
    screenShake: 0, screenFlashColor: 0xffffff, screenFlashTimer: 0,
    nearMissFlash: 0,
    time: 0,
    wavesCleared: 0, spawnersDestroyed: 0, totalDodged: 0,
    dashKillsTotal: 0, peakMultiplier: 1.0,
    nearMissStreak: 0, nearMissStreakTimer: 0,
    lastStandUsed: false, lastStandActive: false,
    tutorialStep: 0, tutorialTimer: 0, tutorialSpawned: false,
    waveIntroTimer: 0,
    deathSlowTimer: 0, deathX: 0, deathY: 0, killerColor: 0, killerX: 0, killerY: 0,
  };
}
