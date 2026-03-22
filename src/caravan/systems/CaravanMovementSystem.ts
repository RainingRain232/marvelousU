// ---------------------------------------------------------------------------
// Caravan movement — caravan wagon, escort AI (with kiting), enemy AI,
// hold position mode, enemy cap
// ---------------------------------------------------------------------------

import { CaravanBalance } from "../config/CaravanBalanceConfig";
import { CaravanEncounterSystem } from "./CaravanEncounterSystem";
import type { CaravanState, CaravanEnemy, CaravanEscort } from "../state/CaravanState";

function dist(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

type LootCallback = ((x: number, y: number, value: number) => void) | null;
let _lootCallback: LootCallback = null;

const MAX_ALIVE_ENEMIES = 30;

export const CaravanMovementSystem = {
  setLootCallback(cb: LootCallback): void { _lootCallback = cb; },

  update(state: CaravanState, dt: number): void {
    if (state.phase !== "travel") return;

    // --- Caravan wagon movement ---
    const wagon = state.caravan;

    if (!state.holdPosition && !state.bossActive) {
      // Slow down when enemies are near (tension)
      const nearbyEnemies = state.enemies.filter((e) =>
        e.alive && dist(e.position.x, e.position.y, wagon.position.x, wagon.position.y) < 4,
      ).length;
      const speedMult = nearbyEnemies > 0 ? Math.max(0.2, 1 - nearbyEnemies * 0.2) : 1;
      wagon.position.x += wagon.speed * speedMult * dt;
    }
    // Caravan stops during boss fight
    // In hold position mode, caravan stays put

    state.segmentProgress = wagon.position.x;

    // Check segment completion
    if (wagon.position.x >= state.segmentLength) {
      _completeSegment(state);
      return;
    }

    // --- Escort movement with specialization ---
    for (const escort of state.escorts) {
      if (!escort.alive) continue;
      if (escort.def.isRanged) {
        _moveRangedEscort(state, escort, dt);
      } else {
        _moveMeleeEscort(state, escort, dt);
      }
    }

    // --- Enemy movement ---
    for (const enemy of state.enemies) {
      if (!enemy.alive) continue;
      if (enemy.stunTimer > 0) continue; // stunned enemies can't move
      _moveEnemy(state, enemy, dt);
    }

    // --- Loot ---
    _processLoot(state, dt);
  },

  /** Check if spawning more enemies is allowed */
  canSpawnMore(state: CaravanState): boolean {
    return state.enemies.filter((e) => e.alive).length < MAX_ALIVE_ENEMIES;
  },
};

// ---------------------------------------------------------------------------
// Melee escort AI — chase enemies, leash to caravan
// ---------------------------------------------------------------------------

function _moveMeleeEscort(state: CaravanState, escort: CaravanEscort, dt: number): void {
  const cx = state.caravan.position.x;
  const cy = state.caravan.position.y;
  const distToCaravan = dist(escort.position.x, escort.position.y, cx, cy);

  // Find nearest enemy within engage range
  let nearestEnemy: CaravanEnemy | null = null;
  let nearestDist: number = CaravanBalance.ESCORT_ENGAGE_RANGE;
  for (const e of state.enemies) {
    if (!e.alive) continue;
    const d = dist(escort.position.x, escort.position.y, e.position.x, e.position.y);
    if (d < nearestDist) {
      nearestDist = d;
      nearestEnemy = e;
    }
  }

  if (distToCaravan > CaravanBalance.ESCORT_LEASH_RANGE) {
    _moveToward(escort.position, cx, cy, escort.speed * 1.5 * dt);
  } else if (nearestEnemy && nearestDist > escort.range) {
    // Chase but check leash
    const ex = nearestEnemy.position.x;
    const ey = nearestEnemy.position.y;
    const futureD = dist(
      escort.position.x + (ex - escort.position.x) * 0.15,
      escort.position.y + (ey - escort.position.y) * 0.15,
      cx, cy,
    );
    if (futureD < CaravanBalance.ESCORT_LEASH_RANGE) {
      _moveToward(escort.position, ex, ey, escort.speed * dt);
    } else {
      _moveToward(escort.position, cx, cy, escort.speed * 0.5 * dt);
    }
  } else if (!nearestEnemy && distToCaravan > 2) {
    // Return to formation
    const idx = state.escorts.indexOf(escort);
    const formX = cx + (idx % 2 === 0 ? -1.2 : 1.2);
    const formY = cy + (idx < 2 ? -1.2 : 1.2);
    _moveToward(escort.position, formX, formY, escort.speed * 0.6 * dt);
  }
}

// ---------------------------------------------------------------------------
// Ranged escort AI — kite: maintain distance, flee if enemies too close
// ---------------------------------------------------------------------------

function _moveRangedEscort(state: CaravanState, escort: CaravanEscort, dt: number): void {
  const cx = state.caravan.position.x;
  const cy = state.caravan.position.y;
  const distToCaravan = dist(escort.position.x, escort.position.y, cx, cy);

  // Find nearest enemy
  let nearestEnemy: CaravanEnemy | null = null;
  let nearestDist = Infinity;
  for (const e of state.enemies) {
    if (!e.alive) continue;
    const d = dist(escort.position.x, escort.position.y, e.position.x, e.position.y);
    if (d < nearestDist) {
      nearestDist = d;
      nearestEnemy = e;
    }
  }

  const kiteDistance = 2.5; // maintain this distance from melee enemies

  if (distToCaravan > CaravanBalance.ESCORT_LEASH_RANGE) {
    // Too far, return
    _moveToward(escort.position, cx, cy, escort.speed * 1.5 * dt);
  } else if (nearestEnemy && nearestDist < kiteDistance) {
    // Too close! Kite away from enemy (toward caravan if possible)
    const dx = escort.position.x - nearestEnemy.position.x;
    const dy = escort.position.y - nearestEnemy.position.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d > 0.01) {
      // Flee direction biased toward caravan
      const fleeDirX = (dx / d) * 0.7 + (cx - escort.position.x) * 0.3;
      const fleeDirY = (dy / d) * 0.7 + (cy - escort.position.y) * 0.3;
      const fleeLen = Math.sqrt(fleeDirX * fleeDirX + fleeDirY * fleeDirY);
      if (fleeLen > 0.01) {
        escort.position.x += (fleeDirX / fleeLen) * escort.speed * 1.2 * dt;
        escort.position.y += (fleeDirY / fleeLen) * escort.speed * 1.2 * dt;
      }
    }
  } else if (!nearestEnemy && distToCaravan > 2) {
    // No enemies, return to formation (behind caravan)
    const idx = state.escorts.indexOf(escort);
    const formX = cx - 1.5 - (idx % 2);
    const formY = cy + (idx < 2 ? -1.5 : 1.5);
    _moveToward(escort.position, formX, formY, escort.speed * 0.5 * dt);
  }
  // If in good range (kiteDistance < d < ESCORT_ENGAGE_RANGE), stand and shoot
}

// ---------------------------------------------------------------------------
// Enemy movement
// ---------------------------------------------------------------------------

function _moveEnemy(state: CaravanState, enemy: CaravanEnemy, dt: number): void {
  let tx: number, ty: number;

  if (enemy.targetType === "player") {
    tx = state.player.position.x;
    ty = state.player.position.y;
  } else if (enemy.targetType === "escort" && enemy.targetId !== null) {
    const escort = state.escorts.find((e) => e.id === enemy.targetId && e.alive);
    if (escort) {
      tx = escort.position.x;
      ty = escort.position.y;
    } else {
      tx = state.caravan.position.x;
      ty = state.caravan.position.y;
      enemy.targetType = "caravan";
    }
  } else {
    tx = state.caravan.position.x;
    ty = state.caravan.position.y;
  }

  const d = dist(enemy.position.x, enemy.position.y, tx, ty);
  if (d > enemy.range * 0.85) {
    _moveToward(enemy.position, tx, ty, enemy.speed * dt);
  }
}

// ---------------------------------------------------------------------------
// Loot
// ---------------------------------------------------------------------------

function _processLoot(state: CaravanState, dt: number): void {
  const px = state.player.position.x;
  const py = state.player.position.y;

  for (const loot of state.loot) {
    if (!loot.alive) continue;
    // Despawn timer
    loot.lifetime -= dt;
    if (loot.lifetime <= 0) {
      loot.alive = false;
      continue;
    }
    const d = dist(px, py, loot.position.x, loot.position.y);
    if (d < CaravanBalance.LOOT_MAGNET_RANGE) {
      const dx = px - loot.position.x;
      const dy = py - loot.position.y;
      if (d > 0.01) {
        loot.position.x += (dx / d) * CaravanBalance.LOOT_PULL_SPEED * dt;
        loot.position.y += (dy / d) * CaravanBalance.LOOT_PULL_SPEED * dt;
      }
      if (d < CaravanBalance.LOOT_PICKUP_RANGE) {
        loot.alive = false;
        state.gold += loot.value;
        state.totalGoldEarned += loot.value;
        _lootCallback?.(loot.position.x, loot.position.y, loot.value);
      }
    }
  }

  state.loot = state.loot.filter((l) => l.alive);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _moveToward(pos: { x: number; y: number }, tx: number, ty: number, step: number): void {
  const dx = tx - pos.x;
  const dy = ty - pos.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d < 0.01) return;
  const ratio = Math.min(step / d, 1);
  pos.x += dx * ratio;
  pos.y += dy * ratio;
}

function _completeSegment(state: CaravanState): void {
  state.segmentsCompleted++;
  state.segment++;
  state.gold += CaravanBalance.SEGMENT_BONUS_GOLD;
  state.totalGoldEarned += CaravanBalance.SEGMENT_BONUS_GOLD;

  // Clear enemies and loot
  state.enemies = [];
  state.loot = [];
  state.bossActive = false;
  state.bossSpawnedThisSegment = false;
  state.roadEventFired = false;
  CaravanEncounterSystem.resetSegmentEvents();
  state.holdPosition = false;

  // Spoilage: perishable goods lose value each segment
  for (const cargo of state.cargo) {
    if (cargo.good.perishable) {
      cargo.spoilage = (cargo.spoilage ?? 0) + 1;
    }
  }

  if (state.segment >= state.totalSegments) {
    state.victory = true;
    return;
  }

  // Show relic choice after each segment (except first)
  state.phase = state.segmentsCompleted > 0 ? "relic_choice" : "town";

  const cy = CaravanBalance.CARAVAN_Y;
  state.caravan.position.x = 2;
  state.caravan.position.y = cy;
  state.caravan.speed = state.caravan.baseSpeed;
  state.player.position.x = 4;
  state.player.position.y = cy;
  state.segmentProgress = 0;
  state.encounterCooldown = CaravanBalance.ENCOUNTER_COOLDOWN_MAX;
  state.encounterCount = 0;

  state.escorts = state.escorts.filter((e) => e.alive);
  for (let i = 0; i < state.escorts.length; i++) {
    const escort = state.escorts[i];
    escort.position.x = 3 + (i % 2);
    escort.position.y = cy + (i < 2 ? -1.2 : 1.2);
  }
}
