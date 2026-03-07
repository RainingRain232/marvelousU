// ---------------------------------------------------------------------------
// Survivor wave spawning — spawns enemies from screen edges
// ---------------------------------------------------------------------------

import { UNIT_DEFINITIONS } from "@sim/config/UnitDefinitions";
import { SurvivorBalance } from "../config/SurvivorBalanceConfig";
import { WAVE_TABLE, BOSS_DEFS } from "../config/SurvivorEnemyDefs";
import type { SurvivorEnemyDef } from "../config/SurvivorEnemyDefs";
import type { SurvivorState, SurvivorEnemy } from "../state/SurvivorState";

// Visible area in tiles (approximate)
const VIEW_HALF_W = 16;
const VIEW_HALF_H = 10;

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

function _getActiveEnemyPool(minute: number): SurvivorEnemyDef[] {
  const pool: { def: SurvivorEnemyDef; weight: number }[] = [];
  for (const entry of WAVE_TABLE) {
    if (minute < entry.minuteStart) continue;
    if (entry.minuteEnd !== -1 && minute > entry.minuteEnd) continue;
    for (const def of entry.enemies) {
      pool.push({ def, weight: entry.weight });
    }
  }
  return _weightedPick(pool);
}

function _weightedPick(pool: { def: SurvivorEnemyDef; weight: number }[]): SurvivorEnemyDef[] {
  // Just return all defs — we'll pick randomly from the flat list
  return pool.map((p) => p.def);
}

function _pickRandomEnemy(pool: SurvivorEnemyDef[]): SurvivorEnemyDef {
  return pool[Math.floor(Math.random() * pool.length)];
}

function _createEnemy(state: SurvivorState, def: SurvivorEnemyDef, pos: { x: number; y: number }): SurvivorEnemy {
  const unitDef = UNIT_DEFINITIONS[def.type];
  const minute = state.gameTime / 60;
  const hpScale = (1 + SurvivorBalance.ENEMY_HP_SCALE_PER_MIN * minute) ** 2;
  const speedScale = Math.min(
    SurvivorBalance.ENEMY_SPEED_CAP,
    1 + SurvivorBalance.ENEMY_SPEED_SCALE_PER_MIN * minute,
  );

  let hp = (unitDef?.hp ?? 50) * def.hpMult * hpScale;
  let atk = (unitDef?.atk ?? 10) * def.atkMult;
  let speed = (unitDef?.speed ?? 1) * def.speedMult * speedScale;

  if (def.isBoss) {
    hp *= SurvivorBalance.BOSS_HP_MULTIPLIER;
    atk *= SurvivorBalance.BOSS_ATK_MULTIPLIER;
    speed *= 0.6;
  }

  return {
    id: state.nextEnemyId++,
    type: def.type,
    position: { x: pos.x, y: pos.y },
    hp,
    maxHp: hp,
    atk,
    speed,
    tier: def.tier,
    isBoss: def.isBoss ?? false,
    alive: true,
    hitTimer: 0,
    slowFactor: 1,
    slowTimer: 0,
    deathTimer: 0,
  };
}

export const SurvivorWaveSystem = {
  update(state: SurvivorState, dt: number): void {
    if (state.paused || state.levelUpPending || state.gameOver) return;

    const minute = state.gameTime / 60;

    // Regular enemy spawning
    const spawnRate = Math.min(
      SurvivorBalance.ENEMY_MAX_SPAWN_RATE,
      SurvivorBalance.ENEMY_BASE_SPAWN_RATE + SurvivorBalance.ENEMY_SPAWN_RATE_SCALE * minute,
    );
    state.spawnAccumulator += spawnRate * dt;

    const pool = _getActiveEnemyPool(minute);
    if (pool.length === 0) return;

    const aliveCount = state.enemies.filter((e) => e.alive).length;

    while (state.spawnAccumulator >= 1 && aliveCount + (state.spawnAccumulator | 0) <= SurvivorBalance.ENEMY_MAX_ALIVE) {
      state.spawnAccumulator -= 1;
      const def = _pickRandomEnemy(pool);
      const pos = _getSpawnPosition(state);
      state.enemies.push(_createEnemy(state, def, pos));
    }

    // Boss spawning
    state.bossTimer -= dt;
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
