// ---------------------------------------------------------------------------
// Grail Derby -- Core Racing Physics System (NO PixiJS)
// Handles scrolling, lane switching, stamina, speed, collisions, pickups,
// timers, scoring, difficulty ramp, and death.
// ---------------------------------------------------------------------------

import type { DerbyState } from "../types";
import { DerbyPhase, ObstacleType, PickupType } from "../types";
import { DERBY_BALANCE as B } from "../config/DerbyBalance";

// Collision box for the player horse
const PLAYER_HIT_W = B.HORSE_WIDTH * 0.8;

// Player's fixed screen-X position (always left-ish of screen center)
const PLAYER_SCREEN_X = 160;

// ---------------------------------------------------------------------------
// Helper: lane center Y
// ---------------------------------------------------------------------------

function laneY(lane: number): number {
  return B.LANE_Y_START + lane * B.LANE_SPACING;
}

// ---------------------------------------------------------------------------
// Helper: AABB overlap between player and an obstacle/pickup
// ---------------------------------------------------------------------------

function overlapsPlayer(
  scrollX: number,
  _playerLane: number,
  playerLaneY: number,
  objX: number,
  objLane: number,
  objWidth: number,
): boolean {
  // Horizontal overlap — object X is in world coords, player is at PLAYER_SCREEN_X in screen
  const objScreenX = objX - scrollX;
  const dx = Math.abs(objScreenX - PLAYER_SCREEN_X);
  if (dx > (PLAYER_HIT_W + objWidth) / 2) return false;

  // Vertical: must be same lane (with a small tolerance for mid-switch)
  const objY = laneY(objLane);
  const dy = Math.abs(playerLaneY - objY);
  return dy < B.LANE_SPACING * 0.55;
}

// ---------------------------------------------------------------------------
// Main update
// ---------------------------------------------------------------------------

export function updateRacing(state: DerbyState, dt: number): void {
  const p = state.player;

  // --- Time & difficulty ---
  state.time += dt;
  state.difficulty = Math.min(
    B.MAX_DIFFICULTY,
    1 + state.time * B.DIFFICULTY_RAMP,
  );

  // --- Stamina ---
  if (p.sprinting) {
    p.stamina -= B.STAMINA_DRAIN * dt;
    if (p.stamina <= 0) {
      p.stamina = 0;
      p.sprinting = false;
    }
  } else {
    p.stamina = Math.min(p.maxStamina, p.stamina + (B.STAMINA_REGEN + state.regenBonus) * dt);
  }

  // --- Speed management ---
  let speedMult = 1;
  if (p.sprinting) speedMult *= B.SPRINT_SPEED_MULT;
  if (p.boostTimer > 0) speedMult *= B.BOOST_SPEED_MULT;

  // Mud slowdown is applied per-frame below via collision, but we keep a
  // "mudSlow" flag that lasts a short duration after exiting mud
  p.speed = Math.min(B.MAX_SPEED, p.baseSpeed * speedMult);

  // --- Scroll world ---
  state.scrollX += p.speed * dt;

  // --- Lane switching: smooth lerp toward target lane Y ---
  const targetY = laneY(p.lane);
  p.laneY += (targetY - p.laneY) * B.LANE_SWITCH_SPEED * dt;
  // Snap when very close
  if (Math.abs(p.laneY - targetY) < 0.5) p.laneY = targetY;

  // --- Timer decrements ---
  if (p.shieldTimer > 0) p.shieldTimer = Math.max(0, p.shieldTimer - dt);
  if (p.boostTimer > 0) p.boostTimer = Math.max(0, p.boostTimer - dt);
  if (p.lanceTimer > 0) p.lanceTimer = Math.max(0, p.lanceTimer - dt);
  if (p.magnetTimer > 0) p.magnetTimer = Math.max(0, p.magnetTimer - dt);
  if (p.invincibleTimer > 0) p.invincibleTimer = Math.max(0, p.invincibleTimer - dt);
  // Coin streak timer
  if (p.coinStreakTimer > 0) {
    p.coinStreakTimer -= dt;
    if (p.coinStreakTimer <= 0) p.coinStreak = 0;
  }

  // --- Obstacle collision ---
  let mudActive = false;
  for (const obs of state.obstacles) {
    if (!obs.active) continue;
    if (!overlapsPlayer(state.scrollX, p.lane, p.laneY, obs.x, obs.lane, obs.width)) continue;

    if (obs.type === ObstacleType.MUD) {
      // Mud: slow down but no damage
      mudActive = true;
    } else if (obs.type === ObstacleType.KNIGHT && p.lanceTimer > 0) {
      // Joust! Destroy the knight obstacle and award bonus
      obs.active = false;
      p.score += B.SCORE_PER_JOUST;
    } else {
      // Damage obstacle
      if (p.shieldTimer > 0) {
        // Shield absorbs the hit and breaks
        p.shieldTimer = 0;
        obs.active = false;
      } else if (p.invincibleTimer <= 0) {
        // Take damage
        p.hp -= 1;
        p.invincibleTimer = B.INVINCIBLE_DURATION;
        obs.active = false;
      }
    }
  }

  // Apply mud slowdown directly to speed this frame
  if (mudActive) {
    p.speed *= B.MUD_SLOW_FACTOR;
  }

  // --- Pickup collection ---
  for (const pk of state.pickups) {
    if (pk.collected) continue;

    // Magnet: pull nearby coins toward player
    if (p.magnetTimer > 0 && pk.type === PickupType.COIN) {
      const pkScreenX = pk.x - state.scrollX;
      const dist = Math.abs(pkScreenX - PLAYER_SCREEN_X);
      if (dist < B.MAGNET_RANGE + state.magnetBonus) {
        // Move coin toward player
        const dir = pkScreenX < PLAYER_SCREEN_X ? 1 : -1;
        pk.x += dir * p.speed * 2 * dt;
      }
    }

    if (!overlapsPlayer(state.scrollX, p.lane, p.laneY, pk.x, pk.lane, 30)) continue;

    pk.collected = true;
    switch (pk.type) {
      case PickupType.COIN:
        p.coins += 1;
        p.coinStreak += 1;
        p.coinStreakTimer = 2.0; // 2s to keep streak alive
        if (p.coinStreak > p.bestStreak) p.bestStreak = p.coinStreak;
        // Combo multiplier: 1x + 0.25x per streak coin (max 5x at 16+)
        const comboMult = Math.min(1 + p.coinStreak * 0.25, 5);
        p.score += Math.floor(B.SCORE_PER_COIN * comboMult);
        break;
      case PickupType.SPEED_BOOST:
        p.boostTimer = B.BOOST_DURATION + state.boostBonus;
        break;
      case PickupType.SHIELD:
        p.shieldTimer = B.SHIELD_DURATION;
        break;
      case PickupType.LANCE:
        p.lanceTimer = B.LANCE_DURATION;
        break;
      case PickupType.MAGNET:
        p.magnetTimer = B.MAGNET_DURATION;
        break;
    }
  }

  // --- Distance & score tracking ---
  p.distance += p.speed * dt;
  p.score = Math.max(
    p.score,
    Math.floor(p.distance / 10) * B.SCORE_PER_DISTANCE + p.coins * B.SCORE_PER_COIN,
  );

  // --- Death check ---
  if (p.hp <= 0) {
    state.phase = DerbyPhase.CRASHED;
    // Update high score / best distance
    if (p.score > state.highScore) state.highScore = p.score;
    if (p.distance > state.bestDistance) state.bestDistance = p.distance;
  }
}
