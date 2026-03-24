// ---------------------------------------------------------------------------
// Phantom — Game systems (v3)
// BFS pathfinding, peek, floor modifiers, wall-clipped vision
// ---------------------------------------------------------------------------

import type { PhantomState, Guard } from "../types";
import { PhantomPhase, TileType, GuardState, GuardType, StealthRating, FloorModifier } from "../types";
import { PHANTOM_BALANCE as B } from "../config/PhantomBalance";

export const DIR_DX = [0, 1, 0, -1];
export const DIR_DY = [-1, 0, 1, 0];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isWalkable(tiles: TileType[][], x: number, y: number, rows: number, cols: number): boolean {
  if (x < 0 || x >= cols || y < 0 || y >= rows) return false;
  const t = tiles[y][x];
  return t !== TileType.WALL && t !== TileType.LOCKED_DOOR;
}

function isWalkableOrDoor(tiles: TileType[][], x: number, y: number, rows: number, cols: number): boolean {
  if (x < 0 || x >= cols || y < 0 || y >= rows) return false;
  return tiles[y][x] !== TileType.WALL;
}

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

function eucDist(ax: number, ay: number, bx: number, by: number): number {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

export function hasLineOfSight(tiles: TileType[][], gx: number, gy: number, tx: number, ty: number, rows: number, cols: number): boolean {
  const dx = tx - gx, dy = ty - gy;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  if (steps === 0) return true;
  for (let i = 1; i <= steps; i++) {
    const cx = Math.round(gx + (dx * i) / steps);
    const cy = Math.round(gy + (dy * i) / steps);
    if (cx < 0 || cx >= cols || cy < 0 || cy >= rows) return false;
    if (tiles[cy][cx] === TileType.WALL || tiles[cy][cx] === TileType.LOCKED_DOOR) return false;
  }
  return true;
}

function isInVisionCone(guard: Guard, tx: number, ty: number): boolean {
  if (guard.type === GuardType.HOUND) return false;
  const dx = tx - guard.x, dy = ty - guard.y;
  const d = eucDist(guard.x, guard.y, tx, ty);
  if (d > guard.visionRange || d < 0.5) return false;
  const facingAngle = Math.atan2(DIR_DY[guard.dir], DIR_DX[guard.dir]);
  const targetAngle = Math.atan2(dy, dx);
  let diff = targetAngle - facingAngle;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  return Math.abs(diff) <= guard.visionAngle;
}

function isPlayerHidden(s: PhantomState): boolean {
  const tile = s.tiles[s.playerY][s.playerX];
  if (tile === TileType.SHADOW || tile === TileType.SMOKE) return true;
  for (const smoke of s.smokeTiles) {
    if (smoke.x === s.playerX && smoke.y === s.playerY) return true;
  }
  return false;
}

function isGuardBackTurned(guard: Guard, px: number, py: number): boolean {
  const dx = px - guard.x, dy = py - guard.y;
  if (Math.abs(dx) + Math.abs(dy) !== 1) return false;
  const approachDir = dx === 1 ? 1 : dx === -1 ? 3 : dy === 1 ? 2 : 0;
  return Math.abs(approachDir - guard.dir) === 2;
}

// ---------------------------------------------------------------------------
// BFS pathfinding — returns next step direction toward target
// ---------------------------------------------------------------------------

function bfsStep(tiles: TileType[][], sx: number, sy: number, tx: number, ty: number, rows: number, cols: number): { nx: number; ny: number; dir: number } {
  if (sx === tx && sy === ty) return { nx: sx, ny: sy, dir: 0 };

  // BFS with limited search radius for performance
  const maxDist = 30;
  const visited = new Set<number>();
  const parent = new Map<number, number>(); // key → parentKey
  const dirMap = new Map<number, number>();  // key → direction from parent
  const key = (x: number, y: number) => y * cols + x;

  const startKey = key(sx, sy);
  const targetKey = key(tx, ty);
  visited.add(startKey);

  const queue: number[] = [startKey];
  let head = 0;
  let found = false;

  while (head < queue.length) {
    const cur = queue[head++];
    const cx = cur % cols, cy = Math.floor(cur / cols);
    if (dist(cx, cy, sx, sy) > maxDist) continue;

    for (let d = 0; d < 4; d++) {
      const nx = cx + DIR_DX[d], ny = cy + DIR_DY[d];
      if (!isWalkable(tiles, nx, ny, rows, cols)) continue;
      const nk = key(nx, ny);
      if (visited.has(nk)) continue;
      visited.add(nk);
      parent.set(nk, cur);
      dirMap.set(nk, d);
      if (nk === targetKey) { found = true; break; }
      queue.push(nk);
    }
    if (found) break;
  }

  if (!found) {
    // Fallback to greedy if BFS fails (target too far or unreachable)
    return greedyStep(tiles, sx, sy, tx, ty, rows, cols);
  }

  // Trace back to find the first step
  let cur = targetKey;
  while (parent.get(cur) !== startKey) {
    const p = parent.get(cur);
    if (p === undefined) return greedyStep(tiles, sx, sy, tx, ty, rows, cols);
    cur = p;
  }

  const dir = dirMap.get(cur)!;
  return { nx: sx + DIR_DX[dir], ny: sy + DIR_DY[dir], dir };
}

function greedyStep(tiles: TileType[][], x: number, y: number, tx: number, ty: number, rows: number, cols: number): { nx: number; ny: number; dir: number } {
  let bestDir = 0, bestDist = Infinity;
  for (let d = 0; d < 4; d++) {
    const nx = x + DIR_DX[d], ny = y + DIR_DY[d];
    if (!isWalkable(tiles, nx, ny, rows, cols)) continue;
    const dd = dist(nx, ny, tx, ty);
    if (dd < bestDist) { bestDist = dd; bestDir = d; }
  }
  const nx = x + DIR_DX[bestDir], ny = y + DIR_DY[bestDir];
  if (isWalkable(tiles, nx, ny, rows, cols)) return { nx, ny, dir: bestDir };
  return { nx: x, ny: y, dir: bestDir };
}

// ---------------------------------------------------------------------------
// Player movement
// ---------------------------------------------------------------------------

export interface MoveResult {
  moved: boolean; backstabbed: boolean; collectedRelic: boolean;
  collectedKey: boolean; collectedStone: boolean; trappedTriggered: boolean;
  enteredShadow: boolean; exitOpened: boolean; floorCleared: boolean; unlockedDoor: boolean;
}

export function tryMovePlayer(s: PhantomState, dir: number): MoveResult {
  const result: MoveResult = {
    moved: false, backstabbed: false, collectedRelic: false, collectedKey: false,
    collectedStone: false, trappedTriggered: false, enteredShadow: false,
    exitOpened: false, floorCleared: false, unlockedDoor: false,
  };
  if (s.phase !== PhantomPhase.PLAYING) return result;
  if (s.moveTimer > 0) return result;

  const nx = s.playerX + DIR_DX[dir];
  const ny = s.playerY + DIR_DY[dir];

  // Locked door
  if (nx >= 0 && nx < s.cols && ny >= 0 && ny < s.rows && s.tiles[ny][nx] === TileType.LOCKED_DOOR) {
    if (s.keys > 0) {
      s.keys--;
      s.tiles[ny][nx] = TileType.FLOOR;
      spawnFloatingText(s, nx, ny, "UNLOCKED", B.COLOR_KEY);
      spawnParticles(s, nx, ny, 8, B.COLOR_KEY);
      result.unlockedDoor = true;
      s.moveTimer = B.PLAYER_MOVE_INTERVAL;
      s.playerDir = dir;
      result.moved = true;
      return result;
    }
    spawnFloatingText(s, nx, ny, "LOCKED", B.COLOR_LOCKED_DOOR);
    return result;
  }

  if (!isWalkable(s.tiles, nx, ny, s.rows, s.cols)) return result;

  // Backstab check
  for (const g of s.guards) {
    if (g.x === nx && g.y === ny && g.state !== GuardState.STUNNED && g.state !== GuardState.KNOCKOUT) {
      if (isGuardBackTurned(g, s.playerX, s.playerY)) {
        g.state = GuardState.KNOCKOUT;
        g.stunTimer = B.BACKSTAB_STUN_DURATION;
        s.score += B.BACKSTAB_SCORE;
        s.totalBackstabs++;
        spawnFloatingText(s, nx, ny, `BACKSTAB +${B.BACKSTAB_SCORE}`, B.COLOR_BACKSTAB);
        spawnParticles(s, nx, ny, B.PARTICLE_COUNT_BACKSTAB, B.COLOR_BACKSTAB);
        result.backstabbed = true;
      } else {
        return result; // blocked by guard's front
      }
    }
  }

  s.prevPlayerX = s.playerX; s.prevPlayerY = s.playerY;
  s.playerX = nx; s.playerY = ny; s.playerDir = dir;
  s.moveTimer = B.PLAYER_MOVE_INTERVAL;
  s.moveFraction = 0;
  s.stepsSinceLastSound++;
  result.moved = true;

  const wasHidden = s.hidden;
  s.hidden = isPlayerHidden(s);
  if (s.hidden && !wasHidden) result.enteredShadow = true;

  // Footstep noise
  if (!s.hidden && Math.random() < s.footstepNoiseChance) {
    alertNearbyGuards(s, nx, ny, B.FOOTSTEP_NOISE_RANGE);
  }

  const tile = s.tiles[ny][nx];

  if (tile === TileType.RELIC) {
    s.tiles[ny][nx] = TileType.FLOOR;
    s.relicsCollected++; s.totalRelicsCollected++;
    // Relic combo
    if (s.relicComboTimer > 0) {
      s.relicComboCount = Math.min(B.RELIC_COMBO_MAX, s.relicComboCount + 1);
    } else {
      s.relicComboCount = 1;
    }
    s.relicComboTimer = B.RELIC_COMBO_WINDOW;
    if (s.relicComboCount > s.bestCombo) s.bestCombo = s.relicComboCount;
    const comboMult = 1 + (s.relicComboCount - 1) * B.RELIC_COMBO_MULTIPLIER;
    const relicScore = Math.floor(B.SCORE_RELIC * comboMult);
    s.score += relicScore;
    const comboText = s.relicComboCount > 1 ? ` x${s.relicComboCount}` : "";
    spawnFloatingText(s, nx, ny, `+${relicScore}${comboText}`, s.relicComboCount > 1 ? B.COLOR_COMBO : B.COLOR_RELIC);
    spawnParticles(s, nx, ny, B.PARTICLE_COUNT_RELIC + s.relicComboCount * 2, B.COLOR_RELIC);
    result.collectedRelic = true;
    if (s.relicsCollected >= s.relicsRequired && !s.exitOpen) {
      s.exitOpen = true; result.exitOpened = true;
    }
    return result;
  }
  if (tile === TileType.KEY) {
    s.keys++; s.tiles[ny][nx] = TileType.FLOOR;
    s.score += B.SCORE_KEY;
    spawnFloatingText(s, nx, ny, "+KEY", B.COLOR_KEY);
    spawnParticles(s, nx, ny, 6, B.COLOR_KEY);
    result.collectedKey = true;
    return result;
  }
  if (tile === TileType.DISTRACTION) {
    if (s.stones < s.maxStones) {
      s.stones++; s.tiles[ny][nx] = TileType.FLOOR;
      spawnFloatingText(s, nx, ny, "+STONE", B.COLOR_STONE_PICKUP);
      result.collectedStone = true;
    }
    return result;
  }
  if (tile === TileType.TRAP) {
    s.tiles[ny][nx] = TileType.FLOOR;
    alertNearbyGuards(s, nx, ny, 8);
    s.screenShake = B.SHAKE_DURATION * 0.5;
    spawnFloatingText(s, nx, ny, "TRAP!", B.COLOR_TRAP_ACTIVE);
    result.trappedTriggered = true;
    return result;
  }
  if (tile === TileType.EXIT && s.exitOpen) {
    const baseScore = B.SCORE_FLOOR;
    let mult = 1.0;
    if (!s.floorDetected) { s.floorStealthRating = StealthRating.GHOST; mult = B.SCORE_GHOST_MULTIPLIER; }
    else if (!s.floorCaught) { s.floorStealthRating = StealthRating.SHADOW; mult = B.SCORE_SHADOW_MULTIPLIER; }
    else { s.floorStealthRating = StealthRating.EXPOSED; }
    let floorScore = Math.floor(baseScore * mult);
    if (s.floorTime < B.SCORE_SPEED_BONUS_THRESHOLD) floorScore += B.SCORE_SPEED_BONUS;
    s.score += floorScore;
    s.totalFloorsCleared++;
    s.phase = PhantomPhase.FLOOR_CLEAR;
    spawnParticles(s, nx, ny, B.PARTICLE_COUNT_EXIT, B.COLOR_EXIT_OPEN);
    s.screenFlashColor = B.COLOR_SUCCESS;
    s.screenFlashTimer = B.FLASH_DURATION * 2;
    result.floorCleared = true;
    return result;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Shadow Dash
// ---------------------------------------------------------------------------

export function tryShadowDash(s: PhantomState): boolean {
  if (s.shadowDashCooldown > 0 || s.phase !== PhantomPhase.PLAYING) return false;
  const dx = DIR_DX[s.playerDir], dy = DIR_DY[s.playerDir];

  // Search facing direction first
  for (let d = 1; d <= B.SHADOW_DASH_RANGE; d++) {
    const tx = s.playerX + dx * d, ty = s.playerY + dy * d;
    if (tx < 0 || tx >= s.cols || ty < 0 || ty >= s.rows) break;
    if (s.tiles[ty][tx] === TileType.WALL || s.tiles[ty][tx] === TileType.LOCKED_DOOR) break;
    if (isShadowAt(s, tx, ty)) return executeDash(s, tx, ty, dx, dy, d);
  }

  // Fallback: nearest shadow in range
  let best: { x: number; y: number; d: number } | null = null;
  for (let r = -B.SHADOW_DASH_RANGE; r <= B.SHADOW_DASH_RANGE; r++) {
    for (let c = -B.SHADOW_DASH_RANGE; c <= B.SHADOW_DASH_RANGE; c++) {
      const tx = s.playerX + c, ty = s.playerY + r;
      if (tx < 0 || tx >= s.cols || ty < 0 || ty >= s.rows) continue;
      const d = Math.abs(c) + Math.abs(r);
      if (d === 0 || d > B.SHADOW_DASH_RANGE) continue;
      if (isShadowAt(s, tx, ty) && hasLineOfSight(s.tiles, s.playerX, s.playerY, tx, ty, s.rows, s.cols)) {
        if (!best || d < best.d) best = { x: tx, y: ty, d };
      }
    }
  }
  if (best) return executeDash(s, best.x, best.y, 0, 0, 1);
  return false;
}

function isShadowAt(s: PhantomState, x: number, y: number): boolean {
  return s.tiles[y][x] === TileType.SHADOW || s.smokeTiles.some(sm => sm.x === x && sm.y === y);
}

function executeDash(s: PhantomState, tx: number, ty: number, _dx: number, _dy: number, _dist: number): boolean {
  // Don't dash into a guard's tile
  for (const g of s.guards) {
    if (g.x === tx && g.y === ty && g.state !== GuardState.KNOCKOUT && g.state !== GuardState.STUNNED) {
      spawnFloatingText(s, s.playerX, s.playerY, "BLOCKED", B.COLOR_DANGER);
      return false;
    }
  }
  s.dashTrail = [{ x: s.playerX, y: s.playerY }];
  s.dashTrailTimer = B.DASH_TRAIL_DURATION;
  s.prevPlayerX = s.playerX; s.prevPlayerY = s.playerY;
  s.playerX = tx; s.playerY = ty;
  s.moveFraction = 1; // instant for dash
  s.hidden = true;
  s.shadowDashCooldown = B.SHADOW_DASH_COOLDOWN;
  spawnParticles(s, tx, ty, B.PARTICLE_COUNT_DASH, B.COLOR_PLAYER_DASH);
  spawnFloatingText(s, tx, ty, "DASH", B.COLOR_PLAYER_DASH);
  return true;
}

// ---------------------------------------------------------------------------
// Smoke Bomb
// ---------------------------------------------------------------------------

export function trySmokeBomb(s: PhantomState): boolean {
  if (s.smokeBombs <= 0 || s.smokeBombCooldown > 0 || s.phase !== PhantomPhase.PLAYING) return false;
  s.smokeBombs--;
  s.smokeBombCooldown = B.SMOKE_BOMB_COOLDOWN;
  const r = B.SMOKE_BOMB_RADIUS;
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r) continue;
      const tx = s.playerX + dx, ty = s.playerY + dy;
      if (tx < 0 || tx >= s.cols || ty < 0 || ty >= s.rows) continue;
      if (s.tiles[ty][tx] === TileType.WALL || s.tiles[ty][tx] === TileType.LOCKED_DOOR) continue;
      s.smokeTiles.push({ x: tx, y: ty, life: B.SMOKE_DURATION });
    }
  }
  for (const g of s.guards) {
    if (eucDist(g.x, g.y, s.playerX, s.playerY) <= r && g.state !== GuardState.KNOCKOUT) {
      g.state = GuardState.STUNNED;
      g.stunTimer = Math.max(g.stunTimer, 3.0);
      g.lastKnownPlayerX = -1; // forget player position
      g.lastKnownPlayerY = -1;
    }
  }
  s.hidden = true;
  spawnParticles(s, s.playerX, s.playerY, B.PARTICLE_COUNT_SMOKE, B.COLOR_SMOKE);
  s.screenFlashColor = B.COLOR_SMOKE;
  s.screenFlashTimer = B.FLASH_DURATION;
  return true;
}

// ---------------------------------------------------------------------------
// Stone throwing
// ---------------------------------------------------------------------------

export function throwStone(s: PhantomState, targetX: number, targetY: number): boolean {
  if (s.stones <= 0) return false;
  if (!isWalkableOrDoor(s.tiles, targetX, targetY, s.rows, s.cols)) return false;
  s.stones--;
  s.thrownStones.push({
    x: s.playerX, y: s.playerY, targetX, targetY,
    timer: B.STONE_FLY_TIME, landed: false, noiseTimer: B.STONE_NOISE_DURATION,
  });
  s.throwing = false;
  return true;
}

// ---------------------------------------------------------------------------
// Guard AI
// ---------------------------------------------------------------------------

function alertNearbyGuards(s: PhantomState, x: number, y: number, radius: number): void {
  for (const g of s.guards) {
    if (g.state === GuardState.STUNNED || g.state === GuardState.KNOCKOUT) continue;
    if (dist(g.x, g.y, x, y) <= radius) {
      // Wake sleeping guards
      if (g.state === GuardState.SLEEPING && dist(g.x, g.y, x, y) <= B.SLEEPING_WAKE_RADIUS) {
        g.state = B.SLEEPING_WAKE_TO_CHASE ? GuardState.CHASE : GuardState.ALERT;
        g.alertTimer = B.GUARD_ALERT_DURATION;
        g.lastKnownPlayerX = x;
        g.lastKnownPlayerY = y;
        s.guardNoiseFlash.set(g, 0.8);
        spawnFloatingText(s, g.x, g.y, "AWAKE!", B.COLOR_DANGER);
        continue;
      }
      if (g.state === GuardState.SLEEPING) continue; // too far to wake
      if (g.state !== GuardState.CHASE) {
        g.state = GuardState.ALERT;
        g.alertTimer = Math.max(g.alertTimer, B.GUARD_ALERT_DURATION);
      }
      g.lastKnownPlayerX = x;
      g.lastKnownPlayerY = y;
      s.guardNoiseFlash.set(g, 0.5);
    }
  }
}

/** Update guard noise flash timers */
export function updateGuardNoiseFlash(s: PhantomState, dt: number): void {
  for (const [g, t] of s.guardNoiseFlash) {
    const nt = t - dt;
    if (nt <= 0) s.guardNoiseFlash.delete(g);
    else s.guardNoiseFlash.set(g, nt);
  }
}

function alertAllGuards(s: PhantomState, px: number, py: number): void {
  for (const g of s.guards) {
    if (g.state === GuardState.STUNNED || g.state === GuardState.KNOCKOUT) continue;
    // ALARM: all guards become alert (not instant chase) — they converge on position
    if (g.state === GuardState.PATROL) {
      g.state = GuardState.ALERT;
      g.alertTimer = B.GUARD_ALERT_DURATION * 1.5;
    }
    g.lastKnownPlayerX = px;
    g.lastKnownPlayerY = py;
    s.guardNoiseFlash.set(g, 0.6);
  }
}

function alertNearbyGuardsOfChase(s: PhantomState, chasingGuard: Guard): void {
  // Alarm modifier: ALL guards chase
  if (s.floorModifier === FloorModifier.ALARM) {
    alertAllGuards(s, chasingGuard.lastKnownPlayerX, chasingGuard.lastKnownPlayerY);
    return;
  }
  for (const g of s.guards) {
    if (g === chasingGuard) continue;
    if (g.state === GuardState.STUNNED || g.state === GuardState.KNOCKOUT) continue;
    if (dist(g.x, g.y, chasingGuard.x, chasingGuard.y) <= 8) {
      if (g.state === GuardState.PATROL) {
        g.state = GuardState.ALERT;
        g.alertTimer = B.GUARD_ALERT_DURATION;
        g.lastKnownPlayerX = chasingGuard.lastKnownPlayerX;
        g.lastKnownPlayerY = chasingGuard.lastKnownPlayerY;
      }
    }
  }
}

export function updateGuards(s: PhantomState, dt: number): void {
  const playerHidden = isPlayerHidden(s);
  s.hidden = playerHidden;

  for (const g of s.guards) {
    if (g.state === GuardState.STUNNED || g.state === GuardState.KNOCKOUT) {
      g.stunTimer -= dt;
      if (g.stunTimer <= 0) { g.state = GuardState.PATROL; g.stunTimer = 0; }
      continue;
    }
    // Sleeping guards don't move or detect — they're woken by noise (handled in alertNearbyGuards)
    if (g.state === GuardState.SLEEPING) continue;

    // Detection
    let canDetect = false;
    if (g.type === GuardType.HOUND) {
      canDetect = !playerHidden && s.invincibleTimer <= 0 && eucDist(g.x, g.y, s.playerX, s.playerY) <= g.proximityRange;
    } else {
      canDetect = !playerHidden && s.invincibleTimer <= 0 &&
        isInVisionCone(g, s.playerX, s.playerY) &&
        hasLineOfSight(s.tiles, g.x, g.y, s.playerX, s.playerY, s.rows, s.cols);
    }

    if (canDetect) {
      if (g.state !== GuardState.CHASE) {
        g.state = GuardState.CHASE;
        alertNearbyGuardsOfChase(s, g);
        s.floorDetected = true;
      }
      g.lastKnownPlayerX = s.playerX;
      g.lastKnownPlayerY = s.playerY;
      g.alertTimer = B.GUARD_CHASE_LOSE_TIMER;
      s.detectionMeter = Math.min(B.DETECTION_CAUGHT, s.detectionMeter + B.DETECTION_RATE * dt);
    } else if (g.state === GuardState.CHASE) {
      g.alertTimer -= dt;
      if (g.alertTimer <= 0) { g.state = GuardState.ALERT; g.alertTimer = B.GUARD_ALERT_DURATION; }
    } else if (g.state === GuardState.ALERT) {
      g.alertTimer -= dt;
      if (g.alertTimer <= 0) g.state = GuardState.PATROL;
    }

    // Noise from stones
    for (const stone of s.thrownStones) {
      if (stone.landed && stone.noiseTimer > 0 && g.state !== GuardState.CHASE) {
        if (dist(g.x, g.y, stone.targetX, stone.targetY) <= B.STONE_NOISE_RADIUS) {
          g.state = GuardState.ALERT;
          g.alertTimer = Math.max(g.alertTimer, stone.noiseTimer);
          g.lastKnownPlayerX = stone.targetX;
          g.lastKnownPlayerY = stone.targetY;
        }
      }
    }

    // Movement
    const moveInterval = g.state === GuardState.CHASE
      ? (g.type === GuardType.HOUND ? g.speed * 0.7 : B.GUARD_CHASE_MOVE_INTERVAL)
      : g.state === GuardState.ALERT
        ? (g.type === GuardType.HOUND ? g.speed * 0.85 : B.GUARD_ALERT_MOVE_INTERVAL)
        : g.speed;

    g.moveTimer -= dt;
    if (g.moveTimer <= 0) {
      g.moveTimer = moveInterval;

      if (g.state === GuardState.CHASE || g.state === GuardState.ALERT) {
        // BFS pathfinding toward last known position
        const { nx, ny, dir } = bfsStep(s.tiles, g.x, g.y, g.lastKnownPlayerX, g.lastKnownPlayerY, s.rows, s.cols);
        g.x = nx; g.y = ny; g.dir = dir;
        if (g.x === g.lastKnownPlayerX && g.y === g.lastKnownPlayerY && g.state === GuardState.ALERT) {
          g.state = GuardState.PATROL;
        }
      } else if (g.type === GuardType.SENTRY) {
        if (Math.random() < 0.15) g.dir = (g.dir + (Math.random() < 0.5 ? 1 : 3)) % 4;
      } else {
        if (g.patrol.length > 0) {
          const wp = g.patrol[g.patrolIndex];
          if (g.x === wp.x && g.y === wp.y) g.patrolIndex = (g.patrolIndex + 1) % g.patrol.length;
          const target = g.patrol[g.patrolIndex];
          const { nx, ny, dir } = bfsStep(s.tiles, g.x, g.y, target.x, target.y, s.rows, s.cols);
          g.x = nx; g.y = ny; g.dir = dir;
        }
      }
    }

    if (g.x === s.playerX && g.y === s.playerY && s.invincibleTimer <= 0) {
      catchPlayer(s);
    }
  }
}

// ---------------------------------------------------------------------------
// Detection & catching
// ---------------------------------------------------------------------------

function catchPlayer(s: PhantomState): void {
  if (s.invincibleTimer > 0) return;
  s.lives--;
  s.detectionMeter = 0;
  s.floorCaught = true; s.floorDetected = true;
  spawnParticles(s, s.playerX, s.playerY, B.PARTICLE_COUNT_CATCH, B.COLOR_DANGER);
  s.screenShake = B.SHAKE_DURATION;
  s.screenFlashColor = B.COLOR_DANGER;
  s.screenFlashTimer = B.FLASH_DURATION;
  if (s.lives <= 0) {
    s.phase = PhantomPhase.GAME_OVER;
  } else {
    s.invincibleTimer = B.INVINCIBLE_DURATION;
    s.phase = PhantomPhase.CAUGHT;
    for (const g of s.guards) {
      if (g.state !== GuardState.KNOCKOUT) { g.state = GuardState.STUNNED; g.stunTimer = B.GUARD_STUN_DURATION; }
    }
  }
}

export function updateDetection(s: PhantomState, dt: number): void {
  let seen = false;
  for (const g of s.guards) {
    if (g.state === GuardState.STUNNED || g.state === GuardState.KNOCKOUT || g.state === GuardState.SLEEPING) continue;
    if (g.type === GuardType.HOUND) {
      if (!s.hidden && s.invincibleTimer <= 0 && eucDist(g.x, g.y, s.playerX, s.playerY) <= g.proximityRange) { seen = true; break; }
    } else {
      if (!s.hidden && s.invincibleTimer <= 0 && isInVisionCone(g, s.playerX, s.playerY) &&
          hasLineOfSight(s.tiles, g.x, g.y, s.playerX, s.playerY, s.rows, s.cols)) { seen = true; break; }
    }
  }
  if (!seen) s.detectionMeter = Math.max(0, s.detectionMeter - s.detectionDecay * dt);
  if (s.detectionMeter >= B.DETECTION_CAUGHT && s.phase === PhantomPhase.PLAYING && s.invincibleTimer <= 0) {
    catchPlayer(s); s.detectionMeter = 0;
  }
  s.alertPulse = s.detectionMeter > 0 ? s.alertPulse + dt * 4 : 0;
}

// ---------------------------------------------------------------------------
// Smoke, stones, visibility, ambient, timers, particles, text
// ---------------------------------------------------------------------------

export function updateSmokeTiles(s: PhantomState, dt: number): void {
  for (let i = s.smokeTiles.length - 1; i >= 0; i--) {
    s.smokeTiles[i].life -= dt;
    if (s.smokeTiles[i].life <= 0) s.smokeTiles.splice(i, 1);
  }
  s.hidden = isPlayerHidden(s);
}

export function updateStones(s: PhantomState, dt: number): void {
  for (let i = s.thrownStones.length - 1; i >= 0; i--) {
    const stone = s.thrownStones[i];
    if (!stone.landed) {
      stone.timer -= dt;
      if (stone.timer <= 0) {
        stone.landed = true; stone.x = stone.targetX; stone.y = stone.targetY;
        alertNearbyGuards(s, stone.targetX, stone.targetY, B.STONE_NOISE_RADIUS);
        spawnParticles(s, stone.targetX, stone.targetY, 6, B.COLOR_NOISE);
      }
    } else {
      stone.noiseTimer -= dt;
      if (stone.noiseTimer <= 0) s.thrownStones.splice(i, 1);
    }
  }
}

export function updateVisibility(s: PhantomState): void {
  const range = s.visibilityRange;
  // Extra range in peek direction
  const peekRange = s.peeking ? range + B.PEEK_EXTRA_RANGE : range;
  const pdx = s.peeking ? DIR_DX[s.peekDir] : 0;
  const pdy = s.peeking ? DIR_DY[s.peekDir] : 0;

  for (let dy = -peekRange; dy <= peekRange; dy++) {
    for (let dx = -peekRange; dx <= peekRange; dx++) {
      const x = s.playerX + dx, y = s.playerY + dy;
      if (x < 0 || x >= s.cols || y < 0 || y >= s.rows) continue;
      const d2 = dx * dx + dy * dy;

      // Check if within base range or within peek cone
      let inRange = d2 <= range * range;
      if (!inRange && s.peeking) {
        // Peek cone: extended range only in the peek direction
        const dot = dx * pdx + dy * pdy;
        if (dot > 0 && d2 <= peekRange * peekRange) {
          // Must be roughly in the peek direction (within ~45 deg)
          const len = Math.sqrt(d2);
          const cosAngle = dot / len;
          inRange = cosAngle > 0.6;
        }
      }

      if (inRange && hasLineOfSight(s.tiles, s.playerX, s.playerY, x, y, s.rows, s.cols)) {
        s.revealed[y][x] = true;
      }
    }
  }

  // Torch reveal
  for (const torch of s.torches) {
    if (!s.revealed[torch.y]?.[torch.x]) continue;
    const tr = Math.ceil(torch.radius);
    for (let dy = -tr; dy <= tr; dy++) {
      for (let dx = -tr; dx <= tr; dx++) {
        const tx = torch.x + dx, ty = torch.y + dy;
        if (tx < 0 || tx >= s.cols || ty < 0 || ty >= s.rows) continue;
        if (dx * dx + dy * dy <= torch.radius * torch.radius) s.revealed[ty][tx] = true;
      }
    }
  }
}

export function updateAmbientParticles(s: PhantomState, dt: number): void {
  while (s.ambientParticles.length < B.AMBIENT_PARTICLE_COUNT) {
    let px: number, py: number;
    if (s.torches.length > 0 && Math.random() < 0.7) {
      const torch = s.torches[Math.floor(Math.random() * s.torches.length)];
      px = torch.x + (Math.random() - 0.5) * torch.radius * 2;
      py = torch.y + (Math.random() - 0.5) * torch.radius * 2;
    } else {
      px = s.playerX + (Math.random() - 0.5) * 12;
      py = s.playerY + (Math.random() - 0.5) * 12;
    }
    s.ambientParticles.push({
      x: px, y: py, vx: (Math.random() - 0.5) * 2, vy: -Math.random() * 1.5 - 0.5,
      life: 3 + Math.random() * 4, maxLife: 5, color: B.COLOR_AMBIENT, size: 1 + Math.random(),
    });
  }
  for (let i = s.ambientParticles.length - 1; i >= 0; i--) {
    const p = s.ambientParticles[i];
    p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
    if (p.life <= 0 || Math.abs(p.x - s.playerX) > 15 || Math.abs(p.y - s.playerY) > 15) {
      s.ambientParticles.splice(i, 1);
    }
  }
}

/** Quick-throw: throw stone in facing direction at given distance */
export function quickThrowStone(s: PhantomState): boolean {
  if (s.stones <= 0 || s.phase !== PhantomPhase.PLAYING) return false;
  const dx = DIR_DX[s.playerDir], dy = DIR_DY[s.playerDir];
  // Find furthest walkable tile at throwDistance
  let tx = s.playerX, ty = s.playerY;
  for (let d = 1; d <= s.throwDistance; d++) {
    const nx = s.playerX + dx * d, ny = s.playerY + dy * d;
    if (nx < 0 || nx >= s.cols || ny < 0 || ny >= s.rows) break;
    if (s.tiles[ny][nx] === TileType.WALL) break;
    tx = nx; ty = ny;
  }
  if (tx === s.playerX && ty === s.playerY) return false;
  return throwStone(s, tx, ty);
}

export function updateTimers(s: PhantomState, dt: number): void {
  if (s.moveTimer > 0) s.moveTimer -= dt;
  if (s.moveFraction < 1) {
    s.moveFraction = Math.min(1, s.moveFraction + dt / B.PLAYER_MOVE_INTERVAL);
  }
  if (s.invincibleTimer > 0) s.invincibleTimer -= dt;
  // Relic combo timer
  if (s.relicComboTimer > 0) {
    s.relicComboTimer -= dt;
    if (s.relicComboTimer <= 0) { s.relicComboCount = 0; s.relicComboTimer = 0; }
  }
  // Floor transition
  if (s.floorTransitionTimer > 0) s.floorTransitionTimer -= dt;
  if (s.screenShake > 0) s.screenShake -= dt;
  if (s.screenFlashTimer > 0) s.screenFlashTimer -= dt;
  if (s.shadowDashCooldown > 0) s.shadowDashCooldown -= dt;
  if (s.smokeBombCooldown > 0) s.smokeBombCooldown -= dt;
  if (s.dashTrailTimer > 0) s.dashTrailTimer -= dt;
  if (s.phase === PhantomPhase.PLAYING) s.floorTime += dt;
  s.time += dt;
}

export function updateParticles(s: PhantomState, dt: number): void {
  for (let i = s.particles.length - 1; i >= 0; i--) {
    const p = s.particles[i];
    p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
    if (p.life <= 0) s.particles.splice(i, 1);
  }
}

export function updateFloatingTexts(s: PhantomState, dt: number): void {
  for (let i = s.floatingTexts.length - 1; i >= 0; i--) {
    const ft = s.floatingTexts[i];
    ft.y -= dt * 1.5; ft.life -= dt;
    if (ft.life <= 0) s.floatingTexts.splice(i, 1);
  }
}

export function spawnParticles(s: PhantomState, x: number, y: number, count: number, color: number): void {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 30 + Math.random() * 60;
    s.particles.push({
      x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      life: B.PARTICLE_LIFETIME, maxLife: B.PARTICLE_LIFETIME,
      color, size: 2 + Math.random() * 3,
    });
  }
}

export function spawnFloatingText(s: PhantomState, x: number, y: number, text: string, color: number): void {
  s.floatingTexts.push({ x, y, text, color, life: 1.5, maxLife: 1.5 });
}

export function resumeFromCaught(s: PhantomState): void {
  s.phase = PhantomPhase.PLAYING;
}
