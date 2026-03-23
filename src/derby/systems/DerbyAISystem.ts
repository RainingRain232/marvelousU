// ---------------------------------------------------------------------------
// Grail Derby -- AI Rider Behavior System
// Moves AI opponents, lane changes, obstacle avoidance, rubber-banding.
// ---------------------------------------------------------------------------

import type { DerbyState, Obstacle } from "../types";
import { DERBY_BALANCE as B } from "../config/DerbyBalance";

// Per-rider cooldowns for lane changes (keyed by rider index)
const _laneChangeCooldowns: number[] = [];

// Respawn delay tracker
const _respawnTimers: number[] = [];

// ---------------------------------------------------------------------------
// Reset (call on new game)
// ---------------------------------------------------------------------------

export function resetAI(): void {
  _laneChangeCooldowns.length = 0;
  _respawnTimers.length = 0;
  for (let i = 0; i < B.AI_COUNT; i++) {
    _laneChangeCooldowns.push(B.AI_LANE_CHANGE_INTERVAL * Math.random());
    _respawnTimers.push(0);
  }
}

// ---------------------------------------------------------------------------
// Helper: lane center Y
// ---------------------------------------------------------------------------

// laneY helper removed — only used by renderer

// ---------------------------------------------------------------------------
// Check if an obstacle is ahead of the rider in a given lane
// ---------------------------------------------------------------------------

function obstacleAheadInLane(
  obstacles: Obstacle[],
  worldX: number,
  lane: number,
  scrollX: number,
): boolean {
  for (const obs of obstacles) {
    if (!obs.active) continue;
    if (obs.lane !== lane) continue;
    const screenDist = obs.x - scrollX - worldX;
    if (screenDist > 0 && screenDist < 200) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Main AI update
// ---------------------------------------------------------------------------

export function updateAI(state: DerbyState, dt: number): void {
  for (let i = 0; i < state.aiRiders.length; i++) {
    const rider = state.aiRiders[i];

    // --- Respawn logic ---
    if (!rider.alive) {
      if (_respawnTimers[i] === undefined) _respawnTimers[i] = 0;
      _respawnTimers[i] += dt;
      if (_respawnTimers[i] > 3) {
        // Respawn behind the player
        rider.alive = true;
        rider.x = -200 - Math.random() * 100;
        rider.lane = Math.floor(Math.random() * B.LANE_COUNT);
        rider.targetLane = rider.lane;
        rider.speed = B.BASE_SPEED * (1 + (Math.random() - 0.5) * B.AI_SPEED_VARIANCE * 2);
        _respawnTimers[i] = 0;
      }
      continue;
    }

    // --- Speed with variation ---
    const speedVariation = 1 + Math.sin(state.time * 0.5 + i * 2) * 0.05;
    let effectiveSpeed = rider.speed * speedVariation;

    // --- Rubber-banding: try to stay near the player ---
    // rider.x is relative to the player (negative = behind, positive = ahead)
    const relX = rider.x;
    if (relX < -300) {
      // Too far behind — speed up
      effectiveSpeed *= 1.3;
    } else if (relX > 300) {
      // Too far ahead — slow down
      effectiveSpeed *= 0.7;
    }

    // Move forward relative to player: rider moves at their speed minus player speed
    rider.x += (effectiveSpeed - state.player.speed) * dt;

    // --- Lane switching ---
    if (_laneChangeCooldowns[i] === undefined) _laneChangeCooldowns[i] = 0;
    _laneChangeCooldowns[i] -= dt;

    if (_laneChangeCooldowns[i] <= 0) {
      _laneChangeCooldowns[i] = B.AI_LANE_CHANGE_INTERVAL * (0.5 + Math.random());

      // Check if obstacle ahead in current lane
      const dangerAhead = obstacleAheadInLane(
        state.obstacles,
        state.scrollX + rider.x,
        rider.lane,
        state.scrollX,
      );

      if (dangerAhead) {
        // Pick a safe lane
        const safeLanes: number[] = [];
        for (let l = 0; l < B.LANE_COUNT; l++) {
          if (l === rider.lane) continue;
          if (!obstacleAheadInLane(state.obstacles, state.scrollX + rider.x, l, state.scrollX)) {
            safeLanes.push(l);
          }
        }
        if (safeLanes.length > 0) {
          rider.targetLane = safeLanes[Math.floor(Math.random() * safeLanes.length)];
        }
      } else if (Math.random() < 0.3) {
        // Random lane change occasionally
        rider.targetLane = Math.floor(Math.random() * B.LANE_COUNT);
      }
    }

    // Smoothly move toward target lane
    if (rider.lane !== rider.targetLane) {
      rider.lane = rider.targetLane;
    }

    // --- Obstacle collision (AI can crash too) ---
    const riderWorldX = state.scrollX + rider.x;
    for (const obs of state.obstacles) {
      if (!obs.active) continue;
      if (obs.lane !== rider.lane) continue;
      const screenDist = Math.abs(obs.x - riderWorldX);
      if (screenDist < (B.HORSE_WIDTH + obs.width) / 2) {
        // AI crashes
        rider.alive = false;
        _respawnTimers[i] = 0;
        break;
      }
    }
  }
}
