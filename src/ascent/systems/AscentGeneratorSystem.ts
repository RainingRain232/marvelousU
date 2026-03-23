// Camelot Ascent – Procedural Generation System
// Pure logic – no rendering imports.

import type { AscentState, Platform, Enemy, Pickup } from "../types";
import { PlatformType, EnemyType, PickupType } from "../types";
import { ASCENT_BALANCE as B } from "../config/AscentBalance";

// Track the highest Y we have generated up to (negative = higher)
let highestGeneratedY = 0;

/** Reset generation tracking (call when starting a new game). */
export function resetGenerator(): void {
  highestGeneratedY = 0;
}

// ---------------------------------------------------------------------------
// Main entry point – call each frame with the current state
// ---------------------------------------------------------------------------

/**
 * Generates platforms, enemies, and pickups from the current highest generated
 * row up to `upToY` (which is typically cameraY - GENERATION_BUFFER).
 */
export function generatePlatforms(state: AscentState, upToY: number): void {
  // We generate in rows spaced by PLATFORM_SPACING_Y going upward (negative Y).
  // `highestGeneratedY` starts at 0 (or wherever the starting platforms end)
  // and decreases as we generate higher rows.
  if (highestGeneratedY === 0) {
    // Account for the starting platforms already placed (see AscentState factory)
    highestGeneratedY = -(8 * B.PLATFORM_SPACING_Y);
  }

  while (highestGeneratedY > upToY) {
    highestGeneratedY -= B.PLATFORM_SPACING_Y;
    const rowY = highestGeneratedY;

    // --- Boss row check ---------------------------------------------------
    const floor = Math.floor(-rowY / (B.PLATFORM_SPACING_Y * 10));
    if (floor > 0 && floor % B.BOSS_FLOOR_INTERVAL === 0 && !state.bossActive) {
      spawnBossRow(state, rowY, floor);
      continue; // boss row has no extra enemies / pickups
    }

    // --- Generate platforms for this row ----------------------------------
    const count = 1 + Math.floor(Math.random() * B.PLATFORMS_PER_ROW);
    const sectionWidth = B.WORLD_WIDTH / count;

    for (let i = 0; i < count; i++) {
      const platWidth =
        B.PLATFORM_MIN_WIDTH +
        Math.random() * (B.PLATFORM_MAX_WIDTH - B.PLATFORM_MIN_WIDTH);
      const minX = i * sectionWidth;
      const maxX = (i + 1) * sectionWidth - platWidth;
      const platX = minX + Math.random() * Math.max(0, maxX - minX);

      const zoneIdx = Math.min(Math.floor(floor / B.ZONE_FLOORS), B.ZONES.length - 1);
      const zone = B.ZONES[zoneIdx];
      const platType = rollPlatformType(zone.spikeMult, zone.crumbleMult);

      const plat: Platform = {
        x: platX,
        y: rowY + (Math.random() - 0.5) * (B.PLATFORM_SPACING_Y * 0.3), // slight Y jitter
        width: platWidth,
        type: platType,
        moveSpeed: platType === PlatformType.MOVING ? B.MOVING_SPEED + Math.random() * 20 : 0,
        moveRange: platType === PlatformType.MOVING ? B.MOVING_RANGE + Math.random() * 30 : 0,
        movePhase: Math.random() * Math.PI * 2,
        crumbleTimer: 0,
        active: true,
      };

      state.platforms.push(plat);

      // --- Enemy spawn on this platform -----------------------------------
      const enemyChance =
        B.ENEMY_SPAWN_CHANCE + floor * B.ENEMY_SPAWN_FLOOR_SCALE;
      if (Math.random() < enemyChance && platType !== PlatformType.SPIKE && platType !== PlatformType.SPRING) {
        spawnEnemy(state, plat);
      }
    }

    // --- Mid-air enemy (bats/archers between platforms, floor 10+) --------
    if (floor >= 10 && Math.random() < 0.08 + floor * 0.001) {
      spawnMidAirEnemy(state, rowY);
    }

    // --- Pickup spawn for this row ----------------------------------------
    if (Math.random() < B.PICKUP_SPAWN_CHANCE) {
      spawnPickup(state, rowY);
    }
  }
}

// ---------------------------------------------------------------------------
// Platform type roll
// ---------------------------------------------------------------------------

function rollPlatformType(spikeMult: number, crumbleMult: number): PlatformType {
  const r = Math.random();
  let cumulative = 0;

  cumulative += B.MOVING_CHANCE;
  if (r < cumulative) return PlatformType.MOVING;

  cumulative += B.CRUMBLING_CHANCE * crumbleMult;
  if (r < cumulative) return PlatformType.CRUMBLING;

  cumulative += B.SPIKE_CHANCE * spikeMult;
  if (r < cumulative) return PlatformType.SPIKE;

  cumulative += B.SPRING_CHANCE;
  if (r < cumulative) return PlatformType.SPRING;

  return PlatformType.NORMAL;
}

// ---------------------------------------------------------------------------
// Enemy spawning
// ---------------------------------------------------------------------------

function spawnEnemy(state: AscentState, plat: Platform): void {
  const typeRoll = Math.random();
  let type: EnemyType;
  if (typeRoll < 0.45) type = EnemyType.PATROL;
  else if (typeRoll < 0.7) type = EnemyType.BAT;
  else if (typeRoll < 0.9) type = EnemyType.ARCHER;
  else type = EnemyType.BOMBER;

  const ew = 18;
  const eh = 18;
  const ex = plat.x + Math.random() * (plat.width - ew);
  const ey = type === EnemyType.BAT ? plat.y - 50 - Math.random() * 40 : plat.y - eh;

  const enemy: Enemy = {
    x: ex,
    y: ey,
    vx: type === EnemyType.PATROL ? B.PATROL_SPEED : type === EnemyType.BAT ? B.BAT_SPEED : 0,
    vy: 0,
    width: ew,
    height: eh,
    type,
    hp: 1,
    alive: true,
    patrolMin: Math.max(0, plat.x - 20),
    patrolMax: Math.min(B.WORLD_WIDTH, plat.x + plat.width + 20),
    shootTimer: type === EnemyType.ARCHER ? B.ARCHER_SHOOT_INTERVAL : B.BOMBER_DROP_INTERVAL,
    phase: Math.random() * Math.PI * 2,
  };

  state.enemies.push(enemy);
}

function spawnMidAirEnemy(state: AscentState, rowY: number): void {
  // Spawn a bat or archer floating between platforms
  const isBat = Math.random() < 0.6;
  const type = isBat ? EnemyType.BAT : EnemyType.ARCHER;
  const ew = 18;
  const eh = 18;
  const ex = 40 + Math.random() * (B.WORLD_WIDTH - 80);
  const ey = rowY + 10 + Math.random() * 40; // between platform rows

  state.enemies.push({
    x: ex,
    y: ey,
    vx: isBat ? B.BAT_SPEED * 1.3 : 0,
    vy: 0,
    width: ew,
    height: eh,
    type,
    hp: 1,
    alive: true,
    patrolMin: Math.max(0, ex - 100),
    patrolMax: Math.min(B.WORLD_WIDTH, ex + 100),
    shootTimer: type === EnemyType.ARCHER ? B.ARCHER_SHOOT_INTERVAL * 0.8 : B.BOMBER_DROP_INTERVAL,
    phase: Math.random() * Math.PI * 2,
  });
}

// ---------------------------------------------------------------------------
// Pickup spawning
// ---------------------------------------------------------------------------

function spawnPickup(state: AscentState, rowY: number): void {
  const typeRoll = Math.random();
  let type: PickupType;
  if (typeRoll < 0.55) type = PickupType.COIN;
  else if (typeRoll < 0.7) type = PickupType.HEART;
  else if (typeRoll < 0.8) type = PickupType.DOUBLE_JUMP;
  else if (typeRoll < 0.88) type = PickupType.SHIELD;
  else if (typeRoll < 0.95) type = PickupType.SPEED;
  else type = PickupType.MAGNET;

  const pickup: Pickup = {
    x: Math.random() * (B.WORLD_WIDTH - 20) + 10,
    y: rowY - 20 - Math.random() * 30,
    type,
    collected: false,
    bobPhase: Math.random() * Math.PI * 2,
  };

  state.pickups.push(pickup);
}

// ---------------------------------------------------------------------------
// Boss row
// ---------------------------------------------------------------------------

function spawnBossRow(state: AscentState, rowY: number, floor: number): void {
  // Wide boss arena platform
  const arenaWidth = B.WORLD_WIDTH * 0.8;
  const arenaX = (B.WORLD_WIDTH - arenaWidth) / 2;

  state.platforms.push({
    x: arenaX,
    y: rowY,
    width: arenaWidth,
    type: PlatformType.NORMAL,
    moveSpeed: 0,
    moveRange: 0,
    movePhase: 0,
    crumbleTimer: 0,
    active: true,
  });

  state.bossActive = true;
  state.bossHp = B.BOSS_HP_BASE + floor * B.BOSS_HP_PER_FLOOR;
  state.bossMaxHp = state.bossHp;
}

// ---------------------------------------------------------------------------
// Cleanup – remove off-screen entities below camera
// ---------------------------------------------------------------------------

export function cleanupOffscreen(state: AscentState): void {
  const despawnY = state.cameraY + B.DESPAWN_BUFFER + 600; // 600 ≈ screen height

  state.platforms = state.platforms.filter((p) => p.y < despawnY);
  state.enemies = state.enemies.filter((e) => e.y < despawnY);
  state.pickups = state.pickups.filter((p) => p.y < despawnY);
  state.projectiles = state.projectiles.filter((p) => p.y < despawnY && p.y > state.cameraY - 200);
}
