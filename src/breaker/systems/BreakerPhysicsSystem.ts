// Grail Breaker – Core Physics System (no PixiJS)

import type { BreakerState, Ball, Brick } from "../types.ts";
import { BreakerPhase, BrickType, PowerUpType } from "../types.ts";
import { BREAKER_BALANCE as B, BRICK_COLORS } from "../config/BreakerBalance.ts";

// ---------------------------------------------------------------------------
// Powerup FX color map (lightweight – avoids renderer dependency)
// ---------------------------------------------------------------------------

const POWERUP_FX_COLORS: Record<string, number> = {
  wide: 0x44aaff, multi: 0x44ff44, fireball: 0xff6622,
  slow: 0x66ccff, life: 0xff44aa, laser: 0xff4444,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Effective ball speed considering slow-down timer. */
function effectiveSpeed(state: BreakerState): number {
  return state.slowTimer > 0 ? B.SLOW_FACTOR : 1;
}

/** Score awarded for a given brick type. */
function brickScore(type: BrickType): number {
  switch (type) {
    case BrickType.NORMAL:    return B.SCORE_NORMAL;
    case BrickType.STRONG:    return B.SCORE_STRONG;
    case BrickType.METAL:     return B.SCORE_METAL;
    case BrickType.EXPLOSIVE: return B.SCORE_EXPLOSIVE;
    default:                  return 0;
  }
}

/** Top-left pixel position of a brick in the field-local coordinate space. */
function brickRect(brick: Brick) {
  const x = brick.col * (B.BRICK_W + B.BRICK_PAD);
  const y = brick.row * (B.BRICK_H + B.BRICK_PAD);
  return { x, y, w: B.BRICK_W, h: B.BRICK_H };
}

/** Maybe spawn a power-up at the destroyed brick's position. */
function maybeSpawnPowerUp(state: BreakerState, brick: Brick): void {
  if (Math.random() > B.POWERUP_DROP_CHANCE) return;
  const r = brickRect(brick);
  const types = Object.values(PowerUpType);
  const type = types[Math.floor(Math.random() * types.length)];
  state.powerUps.push({
    x: r.x + r.w / 2,
    y: r.y + r.h / 2,
    vy: B.POWERUP_FALL_SPEED,
    type,
    collected: false,
  });
}

/** Damage a brick, handle destruction & scoring. */
function damageBrick(state: BreakerState, brick: Brick, dmg: number): void {
  if (!brick.active || brick.type === BrickType.GOLD) return;
  brick.hp -= dmg;
  const r = brickRect(brick);
  const wx = r.x + r.w / 2;
  const wy = r.y + r.h / 2;
  if (brick.hp <= 0) {
    brick.active = false;
    // Combo multiplier: 1x base, 2x at 3+ hits, 3x at 6+, 4x at 10+
    state.combo++;
    if (state.combo > state.bestCombo) state.bestCombo = state.combo;
    const comboMult = state.combo >= 10 ? 4 : state.combo >= 6 ? 3 : state.combo >= 3 ? 2 : 1;
    state.score += brickScore(brick.type) * comboMult;
    maybeSpawnPowerUp(state, brick);
    state.events.onBrickDestroyed?.(wx, wy, BRICK_COLORS[brick.type] ?? 0xcc6644);
    if (brick.type === BrickType.EXPLOSIVE) {
      explodeNeighbors(state, brick);
    }
  } else {
    state.events.onBrickHit?.(wx, wy, BRICK_COLORS[brick.type] ?? 0xcc6644);
  }
}

/** Explosive brick chain: damage all adjacent bricks. */
function explodeNeighbors(state: BreakerState, src: Brick): void {
  for (const b of state.bricks) {
    if (!b.active || b === src) continue;
    if (Math.abs(b.col - src.col) <= 1 && Math.abs(b.row - src.row) <= 1) {
      damageBrick(state, b, 1);
    }
  }
}

// ---------------------------------------------------------------------------
// Ball-rect collision (AABB vs circle)
// ---------------------------------------------------------------------------

function ballRectCollision(
  ball: Ball,
  rx: number, ry: number, rw: number, rh: number,
): { nx: number; ny: number } | null {
  const cx = clamp(ball.x, rx, rx + rw);
  const cy = clamp(ball.y, ry, ry + rh);
  const dx = ball.x - cx;
  const dy = ball.y - cy;
  const dist2 = dx * dx + dy * dy;
  if (dist2 >= ball.radius * ball.radius) return null;
  const dist = Math.sqrt(dist2) || 0.001;
  return { nx: dx / dist, ny: dy / dist };
}

// ---------------------------------------------------------------------------
// Main update
// ---------------------------------------------------------------------------

export function updatePhysics(state: BreakerState, dt: number): void {
  if (state.phase !== BreakerPhase.PLAYING) return;

  const speedFactor = effectiveSpeed(state);
  state.time += dt;

  // --- Decrement timers ---
  if (state.paddle.wideTimer > 0) {
    state.paddle.wideTimer -= dt;
    if (state.paddle.wideTimer <= 0) {
      state.paddle.wideTimer = 0;
      state.paddle.width = state.paddle.baseWidth;
    }
  }
  if (state.slowTimer > 0) state.slowTimer = Math.max(0, state.slowTimer - dt);
  if (state.paddle.laserTimer > 0) state.paddle.laserTimer = Math.max(0, state.paddle.laserTimer - dt);
  if (state.paddle.laserCooldown > 0) state.paddle.laserCooldown = Math.max(0, state.paddle.laserCooldown - dt);

  // --- Move balls ---
  for (const ball of state.balls) {
    if (!ball.active) continue;
    ball.x += ball.vx * dt * speedFactor;
    ball.y += ball.vy * dt * speedFactor;

    // Wall collisions (left / right / top)
    if (ball.x - ball.radius < 0) {
      ball.x = ball.radius;
      ball.vx = Math.abs(ball.vx);
    }
    if (ball.x + ball.radius > B.FIELD_W) {
      ball.x = B.FIELD_W - ball.radius;
      ball.vx = -Math.abs(ball.vx);
    }
    if (ball.y - ball.radius < 0) {
      ball.y = ball.radius;
      ball.vy = Math.abs(ball.vy);
    }

    // Bottom = ball lost
    if (ball.y - ball.radius > B.FIELD_H) {
      ball.active = false;
    }

    // Paddle collision
    const pw = state.paddle.width;
    const px = state.paddle.x - pw / 2;
    const py = B.PADDLE_Y;
    if (
      ball.vy > 0 &&
      ball.y + ball.radius >= py &&
      ball.y + ball.radius <= py + B.PADDLE_H + 4 &&
      ball.x >= px && ball.x <= px + pw
    ) {
      // Where on the paddle did it hit? -1..+1
      const hit = (ball.x - state.paddle.x) / (pw / 2);
      const isEdgeHit = Math.abs(hit) > 0.7;
      // Edge hits get sharper angles (+15°) and a speed boost
      const edgeBonus = isEdgeHit ? Math.sign(hit) * (Math.PI / 12) : 0;
      const angle = hit * (Math.PI / 3) + edgeBonus; // -75° to +75° at edges
      const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
      const speedMult = isEdgeHit ? 1.12 : 1.0;
      ball.vx = speed * speedMult * Math.sin(angle);
      ball.vy = -speed * speedMult * Math.cos(angle);
      ball.y = py - ball.radius;
      state.events.onPaddleHit?.(ball.x, py, isEdgeHit);
      // Reset combo on paddle touch
      state.combo = 0;
    }

    // Brick collisions
    for (const brick of state.bricks) {
      if (!brick.active) continue;
      const r = brickRect(brick);
      const col = ballRectCollision(ball, r.x, r.y, r.w, r.h);
      if (!col) continue;

      damageBrick(state, brick, 1);

      // Fireball passes through without bouncing
      if (!ball.fireball) {
        // Reflect based on collision normal
        const dot = ball.vx * col.nx + ball.vy * col.ny;
        ball.vx -= 2 * dot * col.nx;
        ball.vy -= 2 * dot * col.ny;
        // Nudge out of brick
        ball.x += col.nx * 2;
        ball.y += col.ny * 2;
      }

      // Slight speed increase per brick
      const spd = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
      if (spd < B.BALL_MAX_SPEED) {
        const factor = (spd + B.BALL_SPEED_INCREMENT) / spd;
        ball.vx *= factor;
        ball.vy *= factor;
      }
      break; // only one brick per frame per ball
    }
  }

  // --- Ball-to-ball collisions (elastic) ---
  for (let i = 0; i < state.balls.length; i++) {
    const b1 = state.balls[i];
    if (!b1.active || (b1.vx === 0 && b1.vy === 0)) continue;
    for (let j = i + 1; j < state.balls.length; j++) {
      const b2 = state.balls[j];
      if (!b2.active || (b2.vx === 0 && b2.vy === 0)) continue;
      const dx = b2.x - b1.x;
      const dy = b2.y - b1.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = b1.radius + b2.radius;
      if (dist >= minDist || dist < 0.001) continue;
      // Collision normal
      const nx = dx / dist;
      const ny = dy / dist;
      // Relative velocity along normal
      const dv1 = b1.vx * nx + b1.vy * ny;
      const dv2 = b2.vx * nx + b2.vy * ny;
      // Only resolve if approaching
      if (dv1 - dv2 <= 0) continue;
      // Swap normal velocity components (equal mass elastic)
      b1.vx += (dv2 - dv1) * nx;
      b1.vy += (dv2 - dv1) * ny;
      b2.vx += (dv1 - dv2) * nx;
      b2.vy += (dv1 - dv2) * ny;
      // Separate
      const overlap = (minDist - dist) / 2 + 0.5;
      b1.x -= overlap * nx;
      b1.y -= overlap * ny;
      b2.x += overlap * nx;
      b2.y += overlap * ny;
    }
  }

  // --- Power-up movement & collection ---
  for (const pu of state.powerUps) {
    if (pu.collected) continue;
    pu.y += pu.vy * dt;

    // Off-screen
    if (pu.y > B.FIELD_H + 20) {
      pu.collected = true;
      continue;
    }

    // Paddle collision
    const pw = state.paddle.width;
    const px = state.paddle.x - pw / 2;
    if (
      pu.y >= B.PADDLE_Y &&
      pu.y <= B.PADDLE_Y + B.PADDLE_H + 10 &&
      pu.x >= px && pu.x <= px + pw
    ) {
      pu.collected = true;
      applyPowerUp(state, pu.type);
      state.events.onPowerUpCollected?.(pu.x, pu.y, POWERUP_FX_COLORS[pu.type] ?? 0xffffff);
    }
  }

  // --- Laser movement ---
  for (const laser of state.lasers) {
    if (!laser.active) continue;
    laser.y += laser.vy * dt;
    if (laser.y < -10) { laser.active = false; continue; }

    for (const brick of state.bricks) {
      if (!brick.active) continue;
      const r = brickRect(brick);
      if (laser.x >= r.x && laser.x <= r.x + r.w && laser.y >= r.y && laser.y <= r.y + r.h) {
        damageBrick(state, brick, 1);
        laser.active = false;
        break;
      }
    }
  }

  // --- Cleanup inactive ---
  state.balls = state.balls.filter(b => b.active);
  state.powerUps = state.powerUps.filter(p => !p.collected);
  state.lasers = state.lasers.filter(l => l.active);

  // --- All balls lost ---
  if (state.balls.length === 0) {
    state.lives--;
    if (state.lives <= 0) {
      state.phase = BreakerPhase.GAME_OVER;
    } else {
      respawnBall(state);
    }
  }

  // --- Level clear check ---
  const destructible = state.bricks.filter(
    b => b.active && b.type !== BrickType.GOLD,
  );
  if (destructible.length === 0) {
    if (state.level >= B.TOTAL_LEVELS) {
      state.phase = BreakerPhase.VICTORY;
    } else {
      state.phase = BreakerPhase.LEVEL_CLEAR;
    }
  }
}

// ---------------------------------------------------------------------------
// Power-up application
// ---------------------------------------------------------------------------

function applyPowerUp(state: BreakerState, type: PowerUpType): void {
  switch (type) {
    case PowerUpType.WIDE_PADDLE:
      state.paddle.wideTimer = B.WIDE_DURATION;
      state.paddle.width = B.PADDLE_WIDE_W;
      break;
    case PowerUpType.MULTI_BALL: {
      const src = state.balls[0];
      if (!src) break;
      for (let i = 0; i < 2; i++) {
        const angle = (Math.random() - 0.5) * Math.PI * 0.6;
        const spd = Math.sqrt(src.vx * src.vx + src.vy * src.vy);
        state.balls.push({
          x: src.x,
          y: src.y,
          vx: spd * Math.sin(angle),
          vy: -spd * Math.cos(angle),
          radius: B.BALL_RADIUS,
          fireball: src.fireball,
          active: true,
        });
      }
      break;
    }
    case PowerUpType.FIREBALL:
      for (const ball of state.balls) ball.fireball = true;
      break;
    case PowerUpType.SLOW:
      state.slowTimer = B.SLOW_DURATION;
      break;
    case PowerUpType.EXTRA_LIFE:
      state.lives++;
      break;
    case PowerUpType.LASER:
      state.paddle.laserTimer = B.LASER_DURATION;
      break;
  }
}

// ---------------------------------------------------------------------------
// Respawn ball on paddle
// ---------------------------------------------------------------------------

export function respawnBall(state: BreakerState): void {
  state.ballOnPaddle = true;
  state.balls.push({
    x: state.paddle.x,
    y: B.PADDLE_Y - B.BALL_RADIUS - 2,
    vx: 0,
    vy: 0,
    radius: B.BALL_RADIUS,
    fireball: false,
    active: true,
  });
}
