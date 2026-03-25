// ---------------------------------------------------------------------------
// Graviton — State factory & persistence
// ---------------------------------------------------------------------------

import { GPhase } from "../types";
import type { GState, GMeta } from "../types";
import { G } from "../config/GravitonBalance";

const META_KEY = "graviton_meta";

export function loadGMeta(): GMeta {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (raw) { const m = JSON.parse(raw) as GMeta; if (!m.unlocks) m.unlocks = []; return m; }
  } catch { /* ignore */ }
  return { highScore: 0, bestWave: 0, gamesPlayed: 0, totalKills: 0, unlocks: [] };
}

export function saveGMeta(meta: GMeta): void {
  try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch { /* ignore */ }
}

export function createGState(sw: number, sh: number, meta?: GMeta): GState {
  const m = meta || loadGMeta();
  const cx = sw / 2, cy = sh / 2;
  return {
    phase: GPhase.START,
    arenaRadius: G.ARENA_RADIUS, arenaCX: cx, arenaCY: cy,
    playerX: cx, playerY: cy, playerRadius: G.PLAYER_RADIUS,
    hp: G.PLAYER_HP, maxHp: G.PLAYER_HP,
    pulling: false, pullRadius: G.PULL_RADIUS, pullEnergy: 1.0, aimAngle: -Math.PI / 2,
    orbitCount: 0, orbitCapacity: G.ORBIT_CAPACITY,
    bodies: [], enemies: [],
    bodySpawnTimer: 1.0, enemySpawnTimer: 3.0,
    flingCooldown: 0, flingHoldTimer: 0, flingHeld: false,
    score: 0, highScore: m.highScore,
    enemiesKilled: 0, asteroidsCaptured: 0, asteroidsLaunched: 0,
    comboCount: 0, comboTimer: 0, hitstopFrames: 0, threatLevel: 0,
    activeMutation: "", flingDamageMult: 1, pullDrainMult: 1, bombChanceOverride: -1,
    wave: 0, waveTimer: G.WAVE_INTERVAL, waveEvent: "",
    waveDamageTaken: false,
    powerups: [], activeEffects: { shield: 0, magnet: 0, rapid: 0 },
    particles: [], floatTexts: [],
    screenShake: 0, screenFlashColor: 0xffffff, screenFlashTimer: 0,
    time: 0,
  };
}
