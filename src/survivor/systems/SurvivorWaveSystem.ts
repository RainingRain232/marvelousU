// ---------------------------------------------------------------------------
// Survivor wave spawning — spawns enemies from screen edges
// ---------------------------------------------------------------------------

import { UnitType } from "@/types";
import { UNIT_DEFINITIONS } from "@sim/config/UnitDefinitions";
import { SurvivorBalance } from "../config/SurvivorBalanceConfig";
import { WAVE_TABLE, BOSS_DEFS, DEATH_BOSS_DEF } from "../config/SurvivorEnemyDefs";
import type { SurvivorEnemyDef } from "../config/SurvivorEnemyDefs";
import { ELITE_CONFIG, ELITE_DEFS } from "../config/SurvivorEliteDefs";
import type { EliteType } from "../config/SurvivorEliteDefs";
import { SurvivorChallengeSystem } from "./SurvivorChallengeSystem";
import { SurvivorBiomeSystem } from "./SurvivorBiomeSystem";
import { DIFFICULTY_SETTINGS } from "../state/SurvivorState";
import type { SurvivorState, SurvivorEnemy, AiBehavior } from "../state/SurvivorState";

// Visible area in tiles (approximate)
const VIEW_HALF_W = 16;
const VIEW_HALF_H = 10;

const ELITE_TYPES: EliteType[] = ["charger", "ranged", "shielded", "summoner"];

// ---------------------------------------------------------------------------
// Arthurian name system — bosses & elites get corrupted knight names
// ---------------------------------------------------------------------------

const ARTHURIAN_BOSS_NAMES: Partial<Record<UnitType, string>> = {
  [UnitType.GIANT_WARRIOR]: "Corrupted Galahad",
  [UnitType.TROLL]: "Beastsworn Bors",
  [UnitType.RED_DRAGON]: "Pendragon's Bane",
  [UnitType.CYCLOPS]: "The Blinded Kay",
  [UnitType.ARCHON]: "Mordred Ascendant",
  [UnitType.PIT_LORD]: "Fallen Agravaine",
};

const ARTHURIAN_ELITE_PREFIXES: Record<EliteType, string[]> = {
  charger: ["Sir Pellinore's", "Erec the", "Calogrenant's"],
  ranged: ["Tristan's", "Iseult's", "Dindrane's"],
  shielded: ["Gaheris'", "Bedivere's", "Tor's"],
  summoner: ["Morgause's", "Nimue's", "Viviane's"],
};

const ARTHURIAN_ELITE_SUFFIXES: Record<EliteType, string> = {
  charger: "Charger",
  ranged: "Shade",
  shielded: "Bulwark",
  summoner: "Conjurer",
};

function _getArthurianName(type: UnitType, isBoss: boolean, eliteType: EliteType | null, isDeathBoss: boolean): string | null {
  if (isDeathBoss) return "The Questing Beast";
  if (isBoss) return ARTHURIAN_BOSS_NAMES[type] ?? "Dark Knight";
  if (eliteType) {
    const prefixes = ARTHURIAN_ELITE_PREFIXES[eliteType];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    return `${prefix} ${ARTHURIAN_ELITE_SUFFIXES[eliteType]}`;
  }
  return null;
}

function _getSpawnPosition(state: SurvivorState): { x: number; y: number } {
  const px = state.player.position.x;
  const py = state.player.position.y;
  const margin = SurvivorBalance.ENEMY_SPAWN_MARGIN;

  // Pick a random point on the edge of a rectangle around the player
  const side = Math.random() * 4;
  let x: number, y: number;
  if (side < 1) {
    // top
    x = px + (Math.random() * 2 - 1) * (VIEW_HALF_W + margin);
    y = py - VIEW_HALF_H - margin;
  } else if (side < 2) {
    // bottom
    x = px + (Math.random() * 2 - 1) * (VIEW_HALF_W + margin);
    y = py + VIEW_HALF_H + margin;
  } else if (side < 3) {
    // left
    x = px - VIEW_HALF_W - margin;
    y = py + (Math.random() * 2 - 1) * (VIEW_HALF_H + margin);
  } else {
    // right
    x = px + VIEW_HALF_W + margin;
    y = py + (Math.random() * 2 - 1) * (VIEW_HALF_H + margin);
  }

  // Clamp to map bounds
  x = Math.max(0.5, Math.min(state.mapWidth - 0.5, x));
  y = Math.max(0.5, Math.min(state.mapHeight - 0.5, y));
  return { x, y };
}

function _getActiveEnemyPool(minute: number): { def: SurvivorEnemyDef; weight: number }[] {
  const pool: { def: SurvivorEnemyDef; weight: number }[] = [];
  for (const entry of WAVE_TABLE) {
    if (minute < entry.minuteStart) continue;
    if (entry.minuteEnd !== -1 && minute > entry.minuteEnd) continue;
    for (const def of entry.enemies) {
      pool.push({ def, weight: entry.weight });
    }
  }
  return pool;
}

function _pickRandomEnemy(pool: { def: SurvivorEnemyDef; weight: number }[]): SurvivorEnemyDef {
  const totalWeight = pool.reduce((sum, p) => sum + p.weight, 0);
  let r = Math.random() * totalWeight;
  for (const p of pool) {
    r -= p.weight;
    if (r <= 0) return p.def;
  }
  return pool[pool.length - 1].def;
}

function _rollEliteType(minute: number): EliteType | null {
  if (minute < ELITE_CONFIG.MIN_MINUTE) return null;
  const chance = Math.min(
    ELITE_CONFIG.MAX_CHANCE,
    ELITE_CONFIG.BASE_CHANCE + ELITE_CONFIG.CHANCE_PER_MIN * minute,
  );
  if (Math.random() >= chance) return null;
  return ELITE_TYPES[Math.floor(Math.random() * ELITE_TYPES.length)];
}

// AI behavior weights: higher-tier enemies get more advanced behaviors
const AI_BEHAVIOR_POOL: { behavior: AiBehavior; weight: number; minTier: number }[] = [
  { behavior: "direct", weight: 5, minTier: 0 },
  { behavior: "flanking", weight: 3, minTier: 1 },
  { behavior: "circling", weight: 2, minTier: 1 },
  { behavior: "pack", weight: 2, minTier: 2 },
  { behavior: "ambush", weight: 1, minTier: 2 },
  { behavior: "retreating", weight: 1, minTier: 0 }, // assigned to ranged elites, rarely to normal
];

function _rollAiBehavior(tier: number, eliteType: EliteType | null): AiBehavior {
  // Ranged elites always retreat
  if (eliteType === "ranged") return "retreating";
  // Charger elites always flank
  if (eliteType === "charger") return "flanking";
  // Summoners circle at range
  if (eliteType === "summoner") return "circling";

  const eligible = AI_BEHAVIOR_POOL.filter((b) => tier >= b.minTier);
  const totalWeight = eligible.reduce((sum, b) => sum + b.weight, 0);
  let r = Math.random() * totalWeight;
  for (const b of eligible) {
    r -= b.weight;
    if (r <= 0) return b.behavior;
  }
  return "direct";
}

function _getPreferredRange(behavior: AiBehavior, eliteType: EliteType | null): number {
  if (eliteType === "ranged") return 8;
  if (eliteType === "summoner") return 6;
  switch (behavior) {
    case "retreating": return 7;
    case "circling": return 4;
    default: return 0; // melee / direct
  }
}

function _createEnemy(state: SurvivorState, def: SurvivorEnemyDef, pos: { x: number; y: number }, isDeathBoss = false): SurvivorEnemy {
  const unitDef = UNIT_DEFINITIONS[def.type];
  const minute = state.gameTime / 60;
  const diffMods = DIFFICULTY_SETTINGS[state.difficulty];
  const hpScale = (1 + SurvivorBalance.ENEMY_HP_SCALE_PER_MIN * minute) ** 2;
  const speedScale = Math.min(
    SurvivorBalance.ENEMY_SPEED_CAP,
    1 + SurvivorBalance.ENEMY_SPEED_SCALE_PER_MIN * minute,
  );

  // Challenge + biome modifiers
  const challengeHpMult = SurvivorChallengeSystem.getEnemyHpMultiplier(state);
  const biomeHpMult = SurvivorBiomeSystem.getEnemyHpMultiplier(state);

  let hp = (unitDef?.hp ?? 50) * def.hpMult * hpScale * diffMods.enemyHpMultiplier * challengeHpMult * biomeHpMult;
  let atk = (unitDef?.atk ?? 10) * def.atkMult * diffMods.enemyAtkMultiplier;
  let speed = (unitDef?.speed ?? 1) * def.speedMult * speedScale * diffMods.enemySpeedMultiplier;

  if (def.isBoss) {
    hp *= SurvivorBalance.BOSS_HP_MULTIPLIER;
    atk *= SurvivorBalance.BOSS_ATK_MULTIPLIER;
    speed *= 0.6;
  }

  // Roll for elite
  const eliteType = def.isBoss ? null : _rollEliteType(minute);
  if (eliteType) {
    hp *= ELITE_DEFS[eliteType].hpMultiplier;
  }

  const isBoss = def.isBoss ?? false;
  const aiBehavior = isBoss ? "direct" as AiBehavior : _rollAiBehavior(def.tier, eliteType);

  // Shielded elites get a shield equal to 30% of their max HP
  const shieldHp = eliteType === "shielded" ? hp * 0.3 : 0;

  return {
    id: state.nextEnemyId++,
    type: def.type,
    position: { x: pos.x, y: pos.y },
    hp,
    maxHp: hp,
    atk,
    speed,
    tier: def.tier,
    isBoss,
    alive: true,
    hitTimer: 0,
    slowFactor: 1,
    slowTimer: 0,
    deathTimer: 0,
    eliteType,
    eliteTimer: 0,
    chargeTimer: 0,
    chargeDirX: 0,
    chargeDirY: 0,
    shieldHp,
    isDeathBoss,
    displayName: _getArthurianName(def.type, isBoss, eliteType, isDeathBoss),
    aiBehavior,
    ambushRevealed: aiBehavior !== "ambush", // ambush enemies start hidden
    preferredRange: _getPreferredRange(aiBehavior, eliteType),
  };
}

export const SurvivorWaveSystem = {
  update(state: SurvivorState, dt: number): void {
    if (state.paused || state.levelUpPending || state.gameOver || state.victory) return;

    const minute = state.gameTime / 60;

    // Victory condition — spawn Death boss at 30 minutes
    if (state.gameTime >= SurvivorBalance.VICTORY_TIME && !state.deathBossSpawned) {
      state.deathBossSpawned = true;
      const pos = _getSpawnPosition(state);
      state.enemies.push(_createEnemy(state, DEATH_BOSS_DEF, pos, true));
    }

    // Stop regular spawning after Death boss is spawned
    if (state.deathBossSpawned) {
      // Still cleanup dead enemies
      state.enemies = state.enemies.filter((e) => e.alive || e.deathTimer > 0);
      return;
    }

    // Apply event spawn rate multiplier + difficulty + challenge + biome
    const eventSpawnMult = state.activeEvent?.spawnRateMultiplier ?? 1;
    const diffSpawnMult = DIFFICULTY_SETTINGS[state.difficulty].spawnRateMultiplier;
    const challengeSpawnMult = SurvivorChallengeSystem.getSpawnRateMultiplier(state);
    const biomeSpawnMult = SurvivorBiomeSystem.getSpawnRateMultiplier(state);

    // Regular enemy spawning
    const spawnRate = Math.min(
      SurvivorBalance.ENEMY_MAX_SPAWN_RATE,
      SurvivorBalance.ENEMY_BASE_SPAWN_RATE + SurvivorBalance.ENEMY_SPAWN_RATE_SCALE * minute,
    ) * eventSpawnMult * diffSpawnMult * challengeSpawnMult * biomeSpawnMult;
    state.spawnAccumulator += spawnRate * dt;

    const pool = _getActiveEnemyPool(minute);

    // Add biome-specific enemies to the pool
    const biomeEnemies = SurvivorBiomeSystem.getBiomeEnemyPool(state);
    for (const bDef of biomeEnemies) {
      pool.push({ def: bDef, weight: 3 }); // biome enemies have moderate weight
    }

    if (pool.length === 0) return;

    let aliveCount = state.enemies.filter((e) => e.alive).length;

    while (state.spawnAccumulator >= 1 && aliveCount < SurvivorBalance.ENEMY_MAX_ALIVE) {
      state.spawnAccumulator -= 1;
      const def = _pickRandomEnemy(pool);
      const pos = _getSpawnPosition(state);
      state.enemies.push(_createEnemy(state, def, pos));
      aliveCount++;
    }

    // Boss spawning (challenge: double boss frequency halves the interval)
    const bossDtScale = SurvivorChallengeSystem.isDoubleBossFrequency(state) ? 2.0 : 1.0;
    state.bossTimer -= dt * bossDtScale;
    if (state.bossTimer <= 0) {
      state.bossTimer = SurvivorBalance.BOSS_INTERVAL;
      const bossDef = BOSS_DEFS[state.nextBossIndex % BOSS_DEFS.length];
      const pos = _getSpawnPosition(state);
      state.enemies.push(_createEnemy(state, bossDef, pos));
      state.nextBossIndex++;
    }

    // Cleanup dead enemies with expired death timers
    state.enemies = state.enemies.filter((e) => e.alive || e.deathTimer > 0);
  },
};
