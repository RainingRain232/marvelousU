// ---------------------------------------------------------------------------
// Conjurer — State factory & persistence (v2)
// ---------------------------------------------------------------------------

import type { ConjurerState, ConjurerMeta, ConjurerUpgrades } from "../types";
import { ConjurerPhase, SpellElement } from "../types";
import { CONJURER_BALANCE as B } from "../config/ConjurerBalance";

const META_KEY = "conjurer_meta_v2";

const DEFAULT_UPGRADES: ConjurerUpgrades = {
  maxHp: 0, manaRegen: 0, auraRange: 0, magnetRange: 0, dodgeSpeed: 0,
};

export function loadConjurerMeta(): ConjurerMeta {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (raw) {
      const m = JSON.parse(raw) as ConjurerMeta;
      if (!m.upgrades) m.upgrades = { ...DEFAULT_UPGRADES };
      if (m.arcaneShards === undefined) m.arcaneShards = 0;
      return m;
    }
  } catch { /* ignore */ }
  return { highScore: 0, bestWave: 0, bestCombo: 0, totalKills: 0, gamesPlayed: 0, arcaneShards: 0, upgrades: { ...DEFAULT_UPGRADES } };
}

export function saveConjurerMeta(m: ConjurerMeta): void {
  try { localStorage.setItem(META_KEY, JSON.stringify(m)); } catch { /* ignore */ }
}

export function calcArcaneShards(s: ConjurerState): number {
  return s.wave * B.SHARDS_PER_WAVE + (s.isBossWave && !s.bossAlive ? B.SHARDS_PER_BOSS : 0);
}

export function createConjurerState(sw: number, sh: number, meta: ConjurerMeta): ConjurerState {
  const arenaW = sw - B.ARENA_PADDING * 2;
  const arenaH = sh - B.ARENA_PADDING * 2;
  const up = meta.upgrades || DEFAULT_UPGRADES;

  return {
    phase: ConjurerPhase.START,
    arenaW, arenaH,
    px: arenaW / 2, py: arenaH / 2,
    pSpeed: B.PLAYER_SPEED,
    aimAngle: 0,
    hp: B.PLAYER_HP + up.maxHp, maxHp: B.PLAYER_HP + up.maxHp,
    mana: B.PLAYER_MAX_MANA, maxMana: B.PLAYER_MAX_MANA,
    invincibleTimer: 0,
    dodgeCooldown: 0, dodgeTimer: 0, dodgeDirX: 0, dodgeDirY: 0,
    ultimateCharge: 0, ultimateActive: 0,
    activeElement: SpellElement.FIRE,
    spellCooldowns: { [SpellElement.FIRE]: 0, [SpellElement.ICE]: 0, [SpellElement.LIGHTNING]: 0, [SpellElement.VOID]: 0 },
    spellLevels: { [SpellElement.FIRE]: 1, [SpellElement.ICE]: 1, [SpellElement.LIGHTNING]: 1, [SpellElement.VOID]: 1 },
    enemies: [], projectiles: [], spellEffects: [], manaCrystals: [],
    wave: 0, waveTimer: 2.0, waveEnemiesRemaining: 0, waveSpawnTimer: 0, waveSpawnCount: 0,
    isBossWave: false, bossAlive: false, waveClearTimer: 0,
    score: 0, highScore: meta.highScore,
    combo: 0, comboTimer: 0, bestCombo: 0,
    totalKills: 0, totalManaCollected: 0,
    time: 0,
    particles: [], floatingTexts: [],
    screenShake: 0, screenFlashColor: 0, screenFlashTimer: 0,
    lightningArcs: [], spawnWarnings: [],
    arenaPulse: 0, hazardAngle: 0, hazardActive: false,
    auraTimer: 0,
    prevCooldowns: { [SpellElement.FIRE]: 0, [SpellElement.ICE]: 0, [SpellElement.LIGHTNING]: 0, [SpellElement.VOID]: 0 },
  };
}
