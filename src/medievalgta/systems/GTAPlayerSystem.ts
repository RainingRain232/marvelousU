// GTAPlayerSystem.ts – Pure logic, no PixiJS imports
import type { MedievalGTAState, GTAVec2, GTABuilding } from '../state/MedievalGTAState';

// ─── Constants ───────────────────────────────────────────────────────────────
const PLAYER_WALK_SPEED    = 120;
const PLAYER_RUN_SPEED     = 220;
const PLAYER_HORSE_SPEED   = 350;
const PLAYER_STAMINA_DRAIN = 30;
const PLAYER_STAMINA_REGEN = 15;
const PLAYER_ROLL_DURATION = 0.3;
const PLAYER_ROLL_SPEED    = 300;
const CAMERA_LERP          = 0.08;
const CAMERA_OFFSET_Y      = -40;
const PLAYER_HALF          = 8;   // half-size of player collision rect

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Clamp a value between lo and hi. */
function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Returns true when the player rect overlaps a building rect. */
function rectsOverlap(
  px: number, py: number, ph: number,
  bx: number, by: number, bw: number, bh: number
): boolean {
  return px - ph < bx + bw &&
         px + ph > bx &&
         py - ph < by + bh &&
         py + ph > by;
}

/**
 * Axis-separated AABB push-out: moves the player position so it no longer
 * intersects `building`. Chooses the axis with the smallest overlap.
 */
function resolveAABB(
  pos: GTAVec2,
  building: GTABuilding,
  half: number
): void {
  const bx = building.x;
  const by = building.y;
  const bw = building.w;
  const bh = building.h;

  // Overlaps on each axis
  const overlapLeft  = (pos.x + half) - bx;
  const overlapRight = (bx + bw) - (pos.x - half);
  const overlapTop   = (pos.y + half) - by;
  const overlapBot   = (by + bh) - (pos.y - half);

  const minX = overlapLeft < overlapRight ? overlapLeft : overlapRight;
  const minY = overlapTop  < overlapBot   ? overlapTop  : overlapBot;

  if (minX < minY) {
    // Push on X
    if (overlapLeft < overlapRight) {
      pos.x -= overlapLeft;
    } else {
      pos.x += overlapRight;
    }
  } else {
    // Push on Y
    if (overlapTop < overlapBot) {
      pos.y -= overlapTop;
    } else {
      pos.y += overlapBot;
    }
  }
}

/** Resolve player vs all buildings. */
function resolvePlayerBuildings(pos: GTAVec2, buildings: GTABuilding[], half: number): void {
  for (const b of buildings) {
    if (b.blocksMovement === false) continue;
    if (rectsOverlap(pos.x, pos.y, half, b.x, b.y, b.w, b.h)) {
      resolveAABB(pos, b, half);
    }
  }
}

/** Compute facing direction string from dx/dy. */
function facingDir(dx: number, dy: number): 'n' | 's' | 'e' | 'w' {
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? 'e' : 'w';
  }
  return dy >= 0 ? 's' : 'n';
}

/** Facing angle in radians from dx/dy (0 = east). */
function facingAngle(dx: number, dy: number): number {
  return Math.atan2(dy, dx);
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function updatePlayer(state: MedievalGTAState, dt: number): void {
  if (state.paused || state.gameOver) return;

  const p      = state.player;
  const keys   = state.keys;

  // ── Timers ──────────────────────────────────────────────────────────────
  if (p.attackCooldown   > 0) p.attackCooldown   = Math.max(0, p.attackCooldown   - dt);
  if (p.attackTimer      > 0) p.attackTimer      = Math.max(0, p.attackTimer      - dt);
  if (p.invincibleTimer  > 0) p.invincibleTimer  = Math.max(0, p.invincibleTimer  - dt);
  if (p.dialogCooldown   > 0) p.dialogCooldown   = Math.max(0, p.dialogCooldown   - dt);
  if (p.stealAnimTimer   > 0) p.stealAnimTimer   = Math.max(0, p.stealAnimTimer   - dt);
  if (p.pickpocketCooldown > 0) p.pickpocketCooldown = Math.max(0, p.pickpocketCooldown - dt);
  if (p.killStreakTimer > 0) {
    p.killStreakTimer = Math.max(0, p.killStreakTimer - dt);
    if (p.killStreakTimer <= 0) p.killStreak = 0;
  }
  if (p.blockTimer       > 0 && !state.rightMouseDown) p.blockTimer = 0;

  // ── Wanted decay ────────────────────────────────────────────────────────
  if (p.wantedDecayTimer > 0) {
    p.wantedDecayTimer -= dt;
    if (p.wantedDecayTimer <= 0 && p.wantedLevel > 0) {
      p.wantedLevel--;
      if (p.wantedLevel > 0) {
        p.wantedDecayTimer = 12.0;
      } else {
        p.wantedDecayTimer = 0;
      }
    }
  }

  // ── Dead check ──────────────────────────────────────────────────────────
  if ((p.state as string) === 'dead') {
    // gameOver is triggered after a short delay (handled by caller counting down)
    return;
  }

  if (p.hp <= 0) {
    (p as { state: string }).state = 'dead';
    p.vel.x    = 0;
    p.vel.y    = 0;
    // gameOver set by combat system / after 2-second grace, flagged here for immediate use
    state.gameOver = true;
    return;
  }

  // ── Dialog blocks movement ──────────────────────────────────────────────
  const inDialog = state.dialogNpcId !== null;

  // ── Roll logic ──────────────────────────────────────────────────────────
  const rolling = p.rollTimer > 0;
  if (rolling) {
    p.rollTimer -= dt;
    if (p.rollTimer < 0) p.rollTimer = 0;
    p.invincibleTimer = Math.max(p.invincibleTimer, p.rollTimer > 0 ? 0.05 : 0);
    p.state = 'rolling';
  }

  // ── Input axes ──────────────────────────────────────────────────────────
  let dx = 0;
  let dy = 0;
  if (!inDialog) {
    if (keys.has('a') || keys.has('arrowleft'))  dx -= 1;
    if (keys.has('d') || keys.has('arrowright')) dx += 1;
    if (keys.has('w') || keys.has('arrowup'))    dy -= 1;
    if (keys.has('s') || keys.has('arrowdown'))  dy += 1;
  }

  const moving = (dx !== 0 || dy !== 0);

  // Normalise diagonal
  if (dx !== 0 && dy !== 0) {
    const inv = 1 / Math.SQRT2;
    dx *= inv;
    dy *= inv;
  }

  // ── Stamina ─────────────────────────────────────────────────────────────
  const wantsRun = keys.has('shift') && moving && !p.onHorse;
  if (wantsRun && p.runStamina > 0) {
    p.runStamina = clamp(p.runStamina - PLAYER_STAMINA_DRAIN * dt, 0, 100);
  } else if (!wantsRun || p.onHorse) {
    p.runStamina = clamp(p.runStamina + PLAYER_STAMINA_REGEN * dt, 0, 100);
  }
  const isRunning = wantsRun && p.runStamina > 0;

  // ── Speed ────────────────────────────────────────────────────────────────
  let speed: number;
  if (p.onHorse) {
    speed = PLAYER_HORSE_SPEED;
  } else if (isRunning) {
    speed = PLAYER_RUN_SPEED;
  } else {
    speed = PLAYER_WALK_SPEED;
  }

  // ── Roll initiation ──────────────────────────────────────────────────────
  const spacePressed = keys.has(' ');
  if (spacePressed && p.rollTimer <= 0 && !rolling && moving && !inDialog) {
    p.rollTimer       = PLAYER_ROLL_DURATION;
    p.rollVel.x       = dx * PLAYER_ROLL_SPEED;
    p.rollVel.y       = dy * PLAYER_ROLL_SPEED;
    p.invincibleTimer = PLAYER_ROLL_DURATION;
    p.state           = 'rolling';
  }

  // ── Apply velocity ───────────────────────────────────────────────────────
  if (rolling && p.rollTimer > 0) {
    p.vel.x = p.rollVel.x;
    p.vel.y = p.rollVel.y;
  } else if (!inDialog) {
    p.vel.x = dx * speed;
    p.vel.y = dy * speed;
  } else {
    p.vel.x = 0;
    p.vel.y = 0;
  }

  p.pos.x += p.vel.x * dt;
  p.pos.y += p.vel.y * dt;

  // ── Building collisions ──────────────────────────────────────────────────
  if (!rolling) {
    resolvePlayerBuildings(p.pos, state.buildings, PLAYER_HALF);
  }

  // ── World bounds ─────────────────────────────────────────────────────────
  p.pos.x = clamp(p.pos.x, PLAYER_HALF, state.worldWidth  - PLAYER_HALF);
  p.pos.y = clamp(p.pos.y, PLAYER_HALF, state.worldHeight - PLAYER_HALF);

  // ── Facing ──────────────────────────────────────────────────────────────
  if (moving && !rolling) {
    p.facingDir = facingDir(dx, dy);
    p.facing    = facingAngle(dx, dy);
  }

  // ── State machine ────────────────────────────────────────────────────────
  if (!rolling) {
    if (p.attackTimer > 0) {
      p.state = 'attacking';
    } else if (state.rightMouseDown && !p.onHorse) {
      p.state        = 'blocking';
      p.blockTimer  += dt;
    } else if (p.onHorse) {
      p.state = moving ? 'on_horse_moving' : 'on_horse_idle';
    } else if (moving) {
      p.state = isRunning ? 'running' : 'walking';
    } else {
      p.state = 'idle';
    }
  }

  // ── Attack initiation ────────────────────────────────────────────────────
  if (
    state.mouseDown &&
    p.attackCooldown <= 0 &&
    !rolling &&
    p.state !== 'blocking' &&
    (p.state as string) !== 'dead' &&
    !inDialog
  ) {
    p.attackTimer    = 0.25;
    p.state          = 'attacking';
    const cooldowns: Record<string, number> = { fists: 0.5, sword: 0.6, bow: 0.8 };
    p.attackCooldown = cooldowns[p.weapon] ?? 0.5;

    // Update facing toward mouse on attack
    const mx = state.mouseWorldPos.x - p.pos.x;
    const my = state.mouseWorldPos.y - p.pos.y;
    if (Math.abs(mx) > 1 || Math.abs(my) > 1) {
      p.facing    = facingAngle(mx, my);
      p.facingDir = facingDir(mx, my);
    }
  }

  // ── interactKey edge detection ───────────────────────────────────────────
  // lastInteractKey is set to current value at the end of this frame
  state.lastInteractKey = state.interactKey;

  // ── Camera ───────────────────────────────────────────────────────────────
  state.cameraTargetX = p.pos.x - state.screenWidth  / 2;
  state.cameraTargetY = p.pos.y - state.screenHeight / 2 + CAMERA_OFFSET_Y;

  state.cameraX += (state.cameraTargetX - state.cameraX) * CAMERA_LERP;
  state.cameraY += (state.cameraTargetY - state.cameraY) * CAMERA_LERP;

  // Clamp camera to world
  state.cameraX = clamp(state.cameraX, 0, Math.max(0, state.worldWidth  - state.screenWidth));
  state.cameraY = clamp(state.cameraY, 0, Math.max(0, state.worldHeight - state.screenHeight));

  // ── Day/night ────────────────────────────────────────────────────────────
  state.dayTime = (state.dayTime + state.daySpeed * dt) % 1.0;

  // ── Tick ─────────────────────────────────────────────────────────────────
  state.timeElapsed += dt;
  state.tick++;
}
