import { VWPhase } from "../types";
import type { VWState, VWMeta } from "../types";
import { VW } from "../config/VoidwalkerBalance";

const META_KEY = "voidwalker_meta";

export function loadVWMeta(): VWMeta {
  try { const raw = localStorage.getItem(META_KEY); if (raw) return JSON.parse(raw) as VWMeta; } catch { /* */ }
  return { highScore: 0, bestWave: 0, gamesPlayed: 0, shards: 0, upgrades: { maxHP: 0, boltPower: 0, dashPower: 0, portalPower: 0, stormPower: 0 } };
}

export function saveVWMeta(meta: VWMeta): void {
  if (!meta.upgrades) meta.upgrades = { maxHP: 0, boltPower: 0, dashPower: 0, portalPower: 0, stormPower: 0 };
  try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch { /* */ }
}

export function awardVWShards(meta: VWMeta, score: number): void {
  meta.shards = (meta.shards || 0) + Math.floor(score / VW.SHARDS_PER_SCORE);
}

export function createVWState(sw: number, sh: number, meta?: VWMeta): VWState {
  const m = meta || loadVWMeta();
  const upg = m.upgrades || { maxHP: 0, boltPower: 0, dashPower: 0, portalPower: 0, stormPower: 0 };
  const hp = VW.PLAYER_HP + upg.maxHP;
  return {
    phase: VWPhase.START, time: 0, arenaW: sw, arenaH: sh,
    playerX: sw / 2, playerY: sh / 2, playerRadius: VW.PLAYER_RADIUS,
    playerHP: hp, maxHP: hp, aimAngle: -Math.PI / 2, moveAngle: 0, invulnTimer: 0,
    portals: [], nextPortalId: 1, portalTeleportCooldown: 0,
    boltCooldown: 0,
    dashCooldown: 0, dashCooldownMax: VW.DASH_COOLDOWN - upg.dashPower * 0.5,
    dashing: false, dashAngle: 0, dashTimer: 0,
    pulseCooldown: 0, pulseCooldownMax: VW.PULSE_COOLDOWN,
    stormCooldown: 0, stormCooldownMax: VW.STORM_COOLDOWN,
    stormActive: false, stormTimer: 0,
    enemies: [], projectiles: [], particles: [], floatTexts: [],
    shockwaves: [], pickups: [],
    arenaHazards: [],
    boss: null, bossWave: false, bossAnnounceTimer: 0,
    wave: 0, waveTimer: VW.WAVE_INTERVAL, enemySpawnTimer: 2.0,
    enemiesKilled: 0, totalKills: 0, waveEventActive: "", waveAnnounceTimer: 0,
    score: 0, comboCount: 0, comboTimer: 0,
    killStreakCount: 0, killStreakTimer: 0, bestCombo: 0,
    screenShake: 0, screenFlashTimer: 0, screenFlashColor: 0xffffff, hitstopFrames: 0,
    nextEnemyId: 1, bloodStains: [], footstepTimer: 0,
    boltPowerLevel: upg.boltPower,
    dashPowerLevel: upg.dashPower,
    portalPowerLevel: upg.portalPower,
    lastAbilityUsed: "",
    synergyTimer: 0,
    synergyBonus: "",
  };
}
