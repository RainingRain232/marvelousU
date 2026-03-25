// ---------------------------------------------------------------------------
// Wyrm — State factory & persistence (v7)
// ---------------------------------------------------------------------------

import { WyrmPhase, Direction } from "../types";
import type { WyrmState, WyrmMeta, Cell, WyrmUpgrades } from "../types";
import { WYRM_BALANCE as B } from "../config/WyrmBalance";

const META_KEY = "wyrm_meta";

const DEFAULT_UPGRADES: WyrmUpgrades = { extraStartLength: 0, longerFire: 0, fasterLunge: 0, thickerShield: 0, poisonResist: 0, comboKeeper: 0, wrathBoost: 0, lightningRange: 0, bossLoot: 0 };

export function loadWyrmMeta(): WyrmMeta {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (raw) {
      const m = JSON.parse(raw) as WyrmMeta;
      if (!m.upgrades) m.upgrades = { ...DEFAULT_UPGRADES };
      if (m.dragonCoins === undefined) m.dragonCoins = 0;
      // Migrate new upgrade fields
      if (m.upgrades.poisonResist === undefined) m.upgrades.poisonResist = 0;
      if (m.upgrades.comboKeeper === undefined) m.upgrades.comboKeeper = 0;
      if (m.upgrades.wrathBoost === undefined) m.upgrades.wrathBoost = 0;
      if (m.upgrades.lightningRange === undefined) m.upgrades.lightningRange = 0;
      if (m.upgrades.bossLoot === undefined) m.upgrades.bossLoot = 0;
      return m;
    }
  } catch { /* ignore */ }
  return {
    highScore: 0, bestLength: 0, bestCombo: 0,
    gamesPlayed: 0, totalSheepEaten: 0, totalKnightsEaten: 0,
    totalTimePlayed: 0, totalBossesKilled: 0,
    dragonCoins: 0, upgrades: { ...DEFAULT_UPGRADES },
  };
}

export function saveWyrmMeta(meta: WyrmMeta): void {
  try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch { /* ignore */ }
}

export function createWyrmState(cols: number, rows: number, meta?: WyrmMeta): WyrmState {
  const m = meta || loadWyrmMeta();
  const startLen = B.START_LENGTH + (m.upgrades?.extraStartLength ?? 0);
  const startX = Math.floor(cols / 2), startY = Math.floor(rows / 2);
  const body: Cell[] = [];
  for (let i = 0; i < startLen; i++) body.push({ x: startX - i, y: startY });

  const walls: Cell[] = [];
  for (let x = 0; x < cols; x++) { walls.push({ x, y: 0 }); walls.push({ x, y: rows - 1 }); }
  for (let y = 1; y < rows - 1; y++) { walls.push({ x: 0, y }); walls.push({ x: cols - 1, y }); }

  const turfCount = Math.floor(cols * rows * B.GRASS_DENSITY / 100);
  const grassTufts: { x: number; y: number; size: number; shade: number }[] = [];
  const grassColors = [B.COLOR_BG_GRASS_1, B.COLOR_BG_GRASS_2, B.COLOR_BG_GRASS_3];
  for (let i = 0; i < turfCount; i++) {
    grassTufts.push({ x: 1 + Math.random() * (cols - 2), y: 1 + Math.random() * (rows - 2), size: 0.15 + Math.random() * 0.25, shade: grassColors[Math.floor(Math.random() * grassColors.length)] });
  }

  return {
    phase: WyrmPhase.START, cols, rows, body,
    direction: Direction.RIGHT, nextDirection: Direction.RIGHT, dirQueue: [],
    moveTimer: 0, moveInterval: B.START_MOVE_INTERVAL, moveFraction: 0,
    pickups: [], pickupTimer: 1.0,
    knights: [], knightSpawnTimer: B.KNIGHT_INITIAL_DELAY,
    boss: null, poisonTiles: [], lavaTiles: [],
    archerKnights: [], projectiles: [], archerSpawnTimer: B.KNIGHT_INITIAL_DELAY + 5,
    score: 0, highScore: m.highScore, length: startLen,
    comboCount: 0, comboTimer: 0, comboMultiplier: 1, bestCombo: 0,
    fireBreathTimer: 0, speedBoostTimer: 0, shieldHits: 0,
    lungeCooldown: 0, lungeFlash: 0,
    gracePeriod: 0, magnetBoostTimer: 0, baseMagnetRadius: 4,
    comboInvulnTimer: 0,
    hitstopTimer: 0,
    activeSynergy: null, synergyAnnouncedThisFrame: false,
    breakableWalls: new Set(),
    lastWaveEvent: "",
    blessings: [], blessingChoices: [],
    wrathMeter: 0, wrathTimer: 0, wrathAnnouncedThisFrame: false,
    tailWhipCooldown: 0, tailWhipFlash: 0,
    sheepEaten: 0, knightsEaten: 0, treasureCollected: 0, bossesKilled: 0,
    archersKilled: 0, projectilesDeflected: 0,
    time: 0,
    particles: [], floatingTexts: [], deathSegments: [], trail: [],
    screenShake: 0, screenFlashColor: 0xffffff, screenFlashTimer: 0,
    walls, grassTufts,
    wave: 0, waveTimer: B.WAVE_INTERVAL,
    slowMoTimer: 0, lastMilestone: 0, lastColorTier: 0,
    fireUpgrade: m.upgrades?.longerFire ?? 0,
    shieldUpgrade: m.upgrades?.thickerShield ?? 0,
    poisonResistUpgrade: m.upgrades?.poisonResist ?? 0,
    comboKeeperUpgrade: m.upgrades?.comboKeeper ?? 0,
    magnetRadius: 4,
    timeWarpTimer: 0,
    comboDecayPause: 0,
    regenTimer: 0,
    wrathBoostUpgrade: m.upgrades?.wrathBoost ?? 0,
    lightningRangeUpgrade: m.upgrades?.lightningRange ?? 0,
    bossLootUpgrade: m.upgrades?.bossLoot ?? 0,
    portalUsedThisFrame: false,
  };
}
