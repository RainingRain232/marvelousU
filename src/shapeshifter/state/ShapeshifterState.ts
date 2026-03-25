// ---------------------------------------------------------------------------
// Shapeshifter — State factory & persistence
// ---------------------------------------------------------------------------

import { SSPhase } from "../types";
import type { SSState, SSMeta } from "../types";
import { SS } from "../config/ShapeshifterBalance";

const META_KEY = "shapeshifter_meta";

export function loadSSMeta(): SSMeta {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (raw) return JSON.parse(raw) as SSMeta;
  } catch { /* ignore */ }
  return { highScore: 0, bestWave: 0, gamesPlayed: 0, shards: 0, upgrades: { maxHP: 0, wolfPower: 0, eaglePower: 0, bearPower: 0, allyDuration: 0 } };
}

export function saveSSMeta(meta: SSMeta): void {
  if (!meta.upgrades) meta.upgrades = { maxHP: 0, wolfPower: 0, eaglePower: 0, bearPower: 0, allyDuration: 0 };
  if (meta.shards === undefined) meta.shards = 0;
  try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch { /* ignore */ }
}

export function awardSSShards(meta: SSMeta, score: number): void {
  meta.shards = (meta.shards || 0) + Math.floor(score / SS.SHARDS_PER_SCORE);
}

export function createSSState(sw: number, sh: number, meta?: SSMeta): SSState {
  const m = meta || loadSSMeta();
  const upg = m.upgrades || { maxHP: 0, wolfPower: 0, eaglePower: 0, bearPower: 0, allyDuration: 0 };
  const hp = SS.PLAYER_HP + upg.maxHP;
  return {
    phase: SSPhase.START, time: 0,
    arenaW: sw, arenaH: sh,
    playerX: sw / 2, playerY: sh / 2, playerRadius: SS.PLAYER_RADIUS,
    playerHP: hp, maxHP: hp,
    aimAngle: -Math.PI / 2, moveAngle: 0, invulnTimer: 0,
    // Form
    currentForm: "wolf",
    formSwitchTimer: 0, formSwitchCooldown: SS.FORM_SWITCH_COOLDOWN,
    // Wolf
    wolfLungeTimer: 0, wolfLunging: false, wolfLungeAngle: 0,
    wolfSprintTimer: 0, wolfSprinting: false,
    // Eagle
    eagleBoltCooldown: 0,
    eagleDiving: false, eagleDiveX: 0, eagleDiveY: 0, eagleDiveTimer: 0,
    eagleDiveCooldown: 0,
    // Bear
    bearSwipeCooldown: 0, bearRoarCooldown: 0, bearSlamCooldown: 0,
    // Combat
    enemies: [], projectiles: [], slashes: [], allies: [],
    particles: [], floatTexts: [], shockwaves: [], pickups: [],
    arenaHazards: [],
    // Wave
    wave: 0, waveTimer: SS.WAVE_INTERVAL, enemySpawnTimer: 2.0,
    enemiesKilled: 0, totalKills: 0, waveEventActive: "", waveAnnounceTimer: 0,
    // Scoring
    score: 0, comboCount: 0, comboTimer: 0,
    killStreakCount: 0, killStreakTimer: 0, bestCombo: 0,
    // Boss
    boss: null,
    bossWave: false,
    bossAnnounceTimer: 0,
    // Effects
    screenShake: 0, screenFlashTimer: 0, screenFlashColor: 0xffffff, hitstopFrames: 0,
    // Meta
    nextEnemyId: 1, nextAllyId: 1,
    bloodStains: [], footstepTimer: 0,
    formKills: { wolf: 0, eagle: 0, bear: 0 },
    formMastery: { wolf: 0, eagle: 0, bear: 0 },
    wolfLungeCooldownTimer: 0,
    wolfSprintCooldownTimer: 0,
    wolfUltCooldownTimer: 0,
    eagleUltCooldownTimer: 0,
    whirlwindTimer: 0,
    whirlwindDamageTimer: 0,
    bloodMoonActive: false,
    formSwitchCombo: 0,
    formSwitchComboTimer: 0,
    wolfPowerLevel: upg.wolfPower,
    eaglePowerLevel: upg.eaglePower,
    bearPowerLevel: upg.bearPower,
    allyDurationBonus: upg.allyDuration * 3,
  };
}
