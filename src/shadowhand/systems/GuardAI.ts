// ---------------------------------------------------------------------------
// Shadowhand mode — guard AI & patrol system
// ---------------------------------------------------------------------------

import type { HeistState, Guard, HeistMap } from "../state/ShadowhandState";
import { AlertLevel } from "../state/ShadowhandState";
import type { TargetDef } from "../config/TargetDefs";
import { ShadowhandConfig } from "../config/ShadowhandConfig";
import { getDifficulty, type ShadowhandDifficulty } from "../config/ShadowhandConfig";
import { seedRng } from "../state/ShadowhandState";

function isWalkable(map: HeistMap, x: number, y: number): boolean {
  if (y < 0 || y >= map.height || x < 0 || x >= map.width) return false;
  const t = map.tiles[y][x].type;
  return t !== "wall";
}

function generatePatrolPath(map: HeistMap, startX: number, startY: number, rng: () => number): { x: number; y: number }[] {
  const path: { x: number; y: number }[] = [{ x: startX, y: startY }];
  let cx = startX, cy = startY;
  const steps = 3 + Math.floor(rng() * 5);

  for (let i = 0; i < steps; i++) {
    const dirs = [
      { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
      { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
    ];
    // Try to walk in a random direction for a random distance
    const dir = dirs[Math.floor(rng() * dirs.length)];
    const dist = 2 + Math.floor(rng() * 6);
    let nx = cx, ny = cy;
    for (let d = 0; d < dist; d++) {
      const testX = nx + dir.dx, testY = ny + dir.dy;
      if (isWalkable(map, testX, testY)) {
        nx = testX;
        ny = testY;
      } else break;
    }
    if (nx !== cx || ny !== cy) {
      path.push({ x: nx, y: ny });
      cx = nx;
      cy = ny;
    }
  }

  return path;
}

export function spawnGuards(heist: HeistState, target: TargetDef, seed: number, difficulty: ShadowhandDifficulty): void {
  const rng = seedRng(seed + 999);
  const diff = getDifficulty(difficulty);
  const minGuards = Math.round(target.guardCount[0] * diff.guardCountMult);
  const maxGuards = Math.round(target.guardCount[1] * diff.guardCountMult);
  const guardCount = minGuards + Math.floor(rng() * (maxGuards - minGuards + 1));

  // Collect valid floor positions (not entry points or loot spots)
  const floorPositions: { x: number; y: number }[] = [];
  for (let y = 0; y < heist.map.height; y++) {
    for (let x = 0; x < heist.map.width; x++) {
      const t = heist.map.tiles[y][x].type;
      if (t === "floor" || t === "door") {
        floorPositions.push({ x, y });
      }
    }
  }

  for (let i = 0; i < guardCount && floorPositions.length > 0; i++) {
    const posIdx = Math.floor(rng() * floorPositions.length);
    const pos = floorPositions[posIdx];
    const isDog = target.hasDogs && i >= guardCount - Math.ceil(guardCount * 0.2);
    const isElite = target.tier >= 3 && rng() < 0.2;

    const patrol = generatePatrolPath(heist.map, pos.x, pos.y, rng);

    const guard: Guard = {
      id: `guard_${i}`,
      x: pos.x,
      y: pos.y,
      angle: rng() * Math.PI * 2,
      patrolPath: patrol,
      patrolIndex: 0,
      patrolForward: true,
      speed: isDog ? 2.5 : isElite ? 1.8 : 1.2,
      alertLevel: AlertLevel.UNAWARE,
      alertTimer: 0,
      stunTimer: 0,
      sleepTimer: 0,
      investigating: null,
      canSeeThief: null,
      isElite,
      isDog,
    };

    heist.guards.push(guard);
  }
}

export function updateGuardMovement(heist: HeistState, dt: number): void {
  for (const guard of heist.guards) {
    // Stunned/sleeping guards don't move
    if (guard.stunTimer > 0) { guard.stunTimer -= dt; continue; }
    if (guard.sleepTimer > 0) { guard.sleepTimer -= dt; continue; }

    let targetX: number, targetY: number;
    let speed = guard.speed;

    if (guard.alertLevel === AlertLevel.ALARMED && guard.canSeeThief) {
      // Chase the thief directly
      const thief = heist.thieves.find(t => t.id === guard.canSeeThief);
      if (thief && thief.alive && !thief.captured) {
        targetX = thief.x;
        targetY = thief.y;
        speed *= 1.5; // sprint when chasing
      } else {
        guard.canSeeThief = null;
        targetX = guard.patrolPath[guard.patrolIndex]?.x ?? guard.x;
        targetY = guard.patrolPath[guard.patrolIndex]?.y ?? guard.y;
      }
    } else if (guard.investigating) {
      // Move to investigation point
      targetX = guard.investigating.x;
      targetY = guard.investigating.y;
      speed *= 1.2;
      // Check if arrived
      const dx = targetX - guard.x, dy = targetY - guard.y;
      if (dx * dx + dy * dy < 1) {
        guard.investigating = null;
      }
    } else {
      // Normal patrol
      if (guard.patrolPath.length === 0) continue;
      const waypoint = guard.patrolPath[guard.patrolIndex];
      targetX = waypoint.x;
      targetY = waypoint.y;

      // Check if reached waypoint
      const dx = targetX - guard.x, dy = targetY - guard.y;
      if (dx * dx + dy * dy < 0.5) {
        if (guard.patrolForward) {
          guard.patrolIndex++;
          if (guard.patrolIndex >= guard.patrolPath.length) {
            guard.patrolForward = false;
            guard.patrolIndex = guard.patrolPath.length - 2;
          }
        } else {
          guard.patrolIndex--;
          if (guard.patrolIndex < 0) {
            guard.patrolForward = true;
            guard.patrolIndex = 1;
          }
        }
        guard.patrolIndex = Math.max(0, Math.min(guard.patrolIndex, guard.patrolPath.length - 1));
        continue;
      }
    }

    // Move toward target
    const dx = targetX! - guard.x;
    const dy = targetY! - guard.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0.1) {
      const step = Math.min(speed * dt, dist);
      guard.x += (dx / dist) * step;
      guard.y += (dy / dist) * step;
      guard.angle = Math.atan2(dy, dx);

      // Check for caltrops
      const tx = Math.round(guard.x), ty = Math.round(guard.y);
      if (ty >= 0 && ty < heist.map.height && tx >= 0 && tx < heist.map.width) {
        if (heist.map.tiles[ty][tx].caltrops) {
          guard.stunTimer = 3;
          heist.map.tiles[ty][tx].caltrops = false;
        }
      }
    }
  }
}

export function checkGuardCatchThief(heist: HeistState): string[] {
  const caught: string[] = [];
  for (const guard of heist.guards) {
    if (guard.stunTimer > 0 || guard.sleepTimer > 0) continue;
    if (guard.alertLevel !== AlertLevel.ALARMED) continue;

    for (const thief of heist.thieves) {
      if (!thief.alive || thief.captured) continue;
      const dx = thief.x - guard.x;
      const dy = thief.y - guard.y;
      if (dx * dx + dy * dy < 1.5) {
        // Caught!
        thief.captured = true;
        thief.alive = false;
        caught.push(thief.id);
      }
    }
  }
  return caught;
}

export function spawnReinforcements(heist: HeistState, seed: number): void {
  if (heist.reinforcementTimer < ShadowhandConfig.REINFORCEMENT_DELAY) return;
  if (heist.reinforcementsSpawned >= 3) return;

  heist.reinforcementTimer = 0;
  heist.reinforcementsSpawned++;

  // Spawn from entry points
  const entry = heist.map.entryPoints[heist.reinforcementsSpawned % heist.map.entryPoints.length];
  if (!entry) return;

  const rng = seedRng(seed + heist.reinforcementsSpawned * 1000);
  const count = 2;

  for (let i = 0; i < count; i++) {
    const guard: Guard = {
      id: `reinf_${heist.reinforcementsSpawned}_${i}`,
      x: entry.x + (rng() - 0.5) * 2,
      y: entry.y + (rng() - 0.5) * 2,
      angle: rng() * Math.PI * 2,
      patrolPath: [],
      patrolIndex: 0,
      patrolForward: true,
      speed: 2.0,
      alertLevel: AlertLevel.ALARMED,
      alertTimer: ShadowhandConfig.ALERT_ALARMED_THRESHOLD,
      stunTimer: 0,
      sleepTimer: 0,
      investigating: null,
      canSeeThief: null,
      isElite: false,
      isDog: false,
    };
    heist.guards.push(guard);
  }
}
