// ---------------------------------------------------------------------------
// Shadowhand mode — guard AI & patrol system (with A* pathfinding)
// ---------------------------------------------------------------------------

import type { HeistState, Guard, HeistMap } from "../state/ShadowhandState";
import { AlertLevel } from "../state/ShadowhandState";
import type { TargetDef } from "../config/TargetDefs";
import { ShadowhandConfig } from "../config/ShadowhandConfig";
import { getDifficulty, type ShadowhandDifficulty } from "../config/ShadowhandConfig";
import { seedRng } from "../state/ShadowhandState";
import { findPath, getNextWaypoint } from "./Pathfinding";

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

  // Ensure at least 2 waypoints for patrol
  if (path.length < 2) {
    for (const dir of [{ dx: 3, dy: 0 }, { dx: 0, dy: 3 }, { dx: -3, dy: 0 }, { dx: 0, dy: -3 }]) {
      const nx = startX + dir.dx, ny = startY + dir.dy;
      if (isWalkable(map, nx, ny)) {
        path.push({ x: nx, y: ny });
        break;
      }
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
      chasePath: [],
      lastKnownThiefPos: null,
      waitTimer: 0,
    };

    heist.guards.push(guard);
  }
}

export function updateGuardMovement(heist: HeistState, dt: number): void {
  for (const guard of heist.guards) {
    // Stunned/sleeping guards don't move
    if (guard.stunTimer > 0) { guard.stunTimer -= dt; continue; }
    if (guard.sleepTimer > 0) { guard.sleepTimer -= dt; continue; }

    // Wait timer (e.g., pausing at waypoints or investigation points)
    if (guard.waitTimer > 0) { guard.waitTimer -= dt; continue; }

    let speed = guard.speed;
    let moveTarget: { x: number; y: number } | null = null;

    if (guard.alertLevel === AlertLevel.ALARMED) {
      speed *= 1.5;

      // Alarm cooldown: if can't see thief and no last known pos, slowly de-escalate
      if (!guard.canSeeThief && !guard.lastKnownThiefPos && !guard.investigating) {
        guard.alertTimer -= dt * 3; // faster decay when lost
        if (guard.alertTimer < ShadowhandConfig.ALERT_ALARMED_THRESHOLD * 0.7) {
          guard.alertLevel = AlertLevel.SUSPICIOUS;
          guard.alertTimer = ShadowhandConfig.ALERT_SUSPICIOUS_THRESHOLD;
        }
      }

      if (guard.canSeeThief) {
        // Can see thief — chase with A* pathfinding
        const thief = heist.thieves.find(t => t.id === guard.canSeeThief);
        if (thief && thief.alive && !thief.captured) {
          guard.lastKnownThiefPos = { x: thief.x, y: thief.y };
          // Recalculate path periodically (every ~0.5s worth of movement)
          if (guard.chasePath.length === 0 || Math.random() < dt * 2) {
            guard.chasePath = findPath(heist.map, guard.x, guard.y, thief.x, thief.y, true, 300);
          }
          moveTarget = getNextWaypoint(guard.chasePath, guard.x, guard.y);
          if (!moveTarget) {
            // Direct approach if path fails
            moveTarget = { x: thief.x, y: thief.y };
          }
        } else {
          guard.canSeeThief = null;
        }
      }

      if (!moveTarget && guard.lastKnownThiefPos) {
        // Lost sight — go to last known position
        if (guard.chasePath.length === 0) {
          guard.chasePath = findPath(heist.map, guard.x, guard.y,
            guard.lastKnownThiefPos.x, guard.lastKnownThiefPos.y, true, 300);
        }
        moveTarget = getNextWaypoint(guard.chasePath, guard.x, guard.y);
        if (!moveTarget) {
          // Arrived at last known position — search pattern (3 random nearby spots)
          guard.chasePath = [];
          const searchRadius = 5 + Math.random() * 4;
          const searchX = guard.x + (Math.random() - 0.5) * searchRadius * 2;
          const searchY = guard.y + (Math.random() - 0.5) * searchRadius * 2;
          guard.investigating = { x: searchX, y: searchY };
          guard.waitTimer = 2.0 + Math.random() * 2.0; // Look around 2-4 seconds
          // Memory decays: 50% chance to forget after each search spot
          if (Math.random() < 0.5) {
            guard.lastKnownThiefPos = null;
          } else {
            // Shift last known position slightly (fuzzy memory)
            guard.lastKnownThiefPos = {
              x: guard.lastKnownThiefPos.x + (Math.random() - 0.5) * 4,
              y: guard.lastKnownThiefPos.y + (Math.random() - 0.5) * 4,
            };
          }
          continue;
        }
      }
    }

    if (!moveTarget && guard.investigating) {
      // Move to investigation point using pathfinding
      speed *= 1.2;
      if (guard.chasePath.length === 0) {
        guard.chasePath = findPath(heist.map, guard.x, guard.y,
          guard.investigating.x, guard.investigating.y, true, 200);
      }
      moveTarget = getNextWaypoint(guard.chasePath, guard.x, guard.y);
      if (!moveTarget) {
        // Arrived at investigation point — look around then return to patrol
        guard.investigating = null;
        guard.chasePath = [];
        guard.waitTimer = 2.0; // Look around
        continue;
      }
    }

    if (!moveTarget) {
      // Normal patrol
      if (guard.patrolPath.length === 0) continue;
      const waypoint = guard.patrolPath[guard.patrolIndex];
      if (!waypoint) continue;

      const dx = waypoint.x - guard.x, dy = waypoint.y - guard.y;
      if (dx * dx + dy * dy < 0.5) {
        // Reached waypoint — advance (with random deviation 15% of time)
        guard.waitTimer = 0.5 + Math.random() * 1.0;
        if (Math.random() < 0.15 && guard.alertLevel === AlertLevel.UNAWARE) {
          // Random deviation: look around in a random direction
          const devAngle = Math.random() * Math.PI * 2;
          guard.angle = devAngle; // Turn to face random direction
          guard.waitTimer += 1.0 + Math.random() * 1.5; // Linger longer
        }
        if (guard.patrolForward) {
          guard.patrolIndex++;
          if (guard.patrolIndex >= guard.patrolPath.length) {
            guard.patrolForward = false;
            guard.patrolIndex = Math.max(0, guard.patrolPath.length - 2);
          }
        } else {
          guard.patrolIndex--;
          if (guard.patrolIndex < 0) {
            guard.patrolForward = true;
            guard.patrolIndex = Math.min(1, guard.patrolPath.length - 1);
          }
        }
        continue;
      }

      // Use A* if direct path is blocked
      if (guard.chasePath.length === 0) {
        guard.chasePath = findPath(heist.map, guard.x, guard.y, waypoint.x, waypoint.y, true, 150);
      }
      moveTarget = getNextWaypoint(guard.chasePath, guard.x, guard.y);
      if (!moveTarget) moveTarget = waypoint; // Fallback to direct
    }

    // Execute movement
    if (moveTarget) {
      const dx = moveTarget.x - guard.x;
      const dy = moveTarget.y - guard.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0.1) {
        const step = Math.min(speed * dt, dist);
        const nx = guard.x + (dx / dist) * step;
        const ny = guard.y + (dy / dist) * step;

        // Only move if target position is walkable
        const tileX = Math.round(nx), tileY = Math.round(ny);
        if (tileY >= 0 && tileY < heist.map.height && tileX >= 0 && tileX < heist.map.width) {
          const tile = heist.map.tiles[tileY][tileX];
          if (tile.type !== "wall" && tile.type !== "locked_door") {
            guard.x = nx;
            guard.y = ny;
            guard.angle = Math.atan2(dy, dx);
          } else {
            // Path is stale, recalculate
            guard.chasePath = [];
          }

          // Check for caltrops
          if (tile.caltrops) {
            guard.stunTimer = 3;
            tile.caltrops = false;
            guard.chasePath = [];
          }
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
      chasePath: [],
      lastKnownThiefPos: null,
      waitTimer: 0,
    };
    heist.guards.push(guard);
  }
}
