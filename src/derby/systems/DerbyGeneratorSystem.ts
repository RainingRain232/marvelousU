// ---------------------------------------------------------------------------
// Grail Derby -- Procedural Obstacle & Pickup Generator
// Spawns obstacles and pickups ahead of the camera, cleans up behind.
// ---------------------------------------------------------------------------

import type { DerbyState, Obstacle } from "../types";
import { ObstacleType, PickupType } from "../types";
import { DERBY_BALANCE as B } from "../config/DerbyBalance";

// Track the last spawn world-X position
let _lastObstacleX = 0;
let _lastPickupX = 0;

// Obstacle widths by type
const OBS_WIDTHS: Record<ObstacleType, number> = {
  [ObstacleType.FENCE]: 30,
  [ObstacleType.ROCK]: 35,
  [ObstacleType.MUD]: 60,
  [ObstacleType.BARREL]: 28,
  [ObstacleType.KNIGHT]: 50,
  [ObstacleType.CART]: 80,
};

// Obstacle spawn weights at base difficulty
const OBS_BASE_WEIGHTS: [ObstacleType, number][] = [
  [ObstacleType.FENCE, 25],
  [ObstacleType.ROCK, 20],
  [ObstacleType.MUD, 15],
  [ObstacleType.BARREL, 20],
  [ObstacleType.KNIGHT, 5],
  [ObstacleType.CART, 15],
];

// Pickup spawn weights
const PICKUP_WEIGHTS: [PickupType, number][] = [
  [PickupType.COIN, 60],
  [PickupType.SPEED_BOOST, 10],
  [PickupType.SHIELD, 10],
  [PickupType.LANCE, 10],
  [PickupType.MAGNET, 10],
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function weightedRandom<T>(weights: [T, number][]): T {
  const total = weights.reduce((s, w) => s + w[1], 0);
  let r = Math.random() * total;
  for (const [item, w] of weights) {
    r -= w;
    if (r <= 0) return item;
  }
  return weights[weights.length - 1][0];
}

function randomLane(): number {
  return Math.floor(Math.random() * B.LANE_COUNT);
}

// ---------------------------------------------------------------------------
// Reset (called on new game)
// ---------------------------------------------------------------------------

export function resetGenerator(): void {
  _lastObstacleX = 400; // start spawning a bit ahead
  _lastPickupX = 300;
}

// ---------------------------------------------------------------------------
// Main generation function (called every frame while racing)
// ---------------------------------------------------------------------------

export function generateContent(state: DerbyState): void {
  const screenRight = state.scrollX + B.SCREEN_W + 200; // spawn buffer ahead

  // --- Obstacle generation ---
  const spawnInterval = Math.max(
    B.OBSTACLE_MIN_INTERVAL,
    B.OBSTACLE_SPAWN_INTERVAL / state.difficulty,
  );
  const spawnGap = spawnInterval * B.BASE_SPEED; // convert time interval to distance

  while (_lastObstacleX < screenRight) {
    _lastObstacleX += spawnGap + Math.random() * spawnGap * 0.5;

    // Decide how many lanes to block (1-2, never all 3)
    const blockedCount = state.difficulty > 2 && Math.random() < 0.3 ? 2 : 1;
    const blockedLanes = new Set<number>();

    while (blockedLanes.size < blockedCount) {
      blockedLanes.add(randomLane());
    }

    // Adjust knight weight based on difficulty
    const weights: [ObstacleType, number][] = OBS_BASE_WEIGHTS.map(([t, w]) => {
      if (t === ObstacleType.KNIGHT) return [t, w * state.difficulty];
      return [t, w];
    });

    for (const lane of blockedLanes) {
      const type = weightedRandom(weights);
      const obs: Obstacle = {
        x: _lastObstacleX + Math.random() * 20,
        lane,
        type,
        width: OBS_WIDTHS[type],
        active: true,
      };
      state.obstacles.push(obs);
    }
  }

  // --- Pickup generation ---
  const luckMult = Math.max(0.5, 1 - state.luckBonus * 0.15);
  const pickupGap = B.PICKUP_SPAWN_INTERVAL * B.BASE_SPEED * luckMult;
  while (_lastPickupX < screenRight) {
    _lastPickupX += pickupGap + Math.random() * pickupGap * 0.3;

    // Coins are more frequent — spawn a small row
    if (Math.random() < 0.6) {
      // Coin row: 3-5 coins in a lane
      const lane = randomLane();
      const count = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) {
        state.pickups.push({
          x: _lastPickupX + i * 30,
          lane,
          type: PickupType.COIN,
          collected: false,
        });
      }
    } else {
      // Power-up pickup
      const type = weightedRandom(PICKUP_WEIGHTS);
      state.pickups.push({
        x: _lastPickupX,
        lane: randomLane(),
        type,
        collected: false,
      });
    }
  }

  // --- Cleanup: remove obstacles/pickups far behind camera ---
  const cleanupX = state.scrollX - 300;
  state.obstacles = state.obstacles.filter((o) => o.x > cleanupX);
  state.pickups = state.pickups.filter((p) => p.x > cleanupX);
}
