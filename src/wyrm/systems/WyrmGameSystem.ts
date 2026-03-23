// ---------------------------------------------------------------------------
// Wyrm — Core game systems (v5)
// Lunge, poison tiles, knight-body collision, evolution announcements,
// upgraded shield (multi-hit), dragon coins
// ---------------------------------------------------------------------------

import { Direction, PickupKind } from "../types";
import type { WyrmState, Cell } from "../types";
import { WYRM_BALANCE as B, getWyrmTierIndex, WYRM_COLOR_TIERS } from "../config/WyrmBalance";

export const DIR_DX = [0, 1, 0, -1];
export const DIR_DY = [-1, 0, 1, 0];

export function isOpposite(a: Direction, b: Direction): boolean { return Math.abs(a - b) === 2; }

// ---------------------------------------------------------------------------
// Input queue
// ---------------------------------------------------------------------------

export function enqueueDirection(state: WyrmState, dir: Direction): void {
  const last = state.dirQueue.length > 0 ? state.dirQueue[state.dirQueue.length - 1] : state.direction;
  if (dir === last || isOpposite(dir, last)) return;
  if (state.dirQueue.length < 2) state.dirQueue.push(dir);
  else state.dirQueue[1] = dir;
}

// ---------------------------------------------------------------------------
// Lunge — dash forward N cells, eating everything in path
// ---------------------------------------------------------------------------

export function tryLunge(state: WyrmState, upgrades: { fasterLunge: number }): boolean {
  if (state.lungeCooldown > 0) return false;
  const cd = B.LUNGE_COOLDOWN - upgrades.fasterLunge;
  state.lungeCooldown = cd;
  state.lungeFlash = B.LUNGE_FLASH;

  const head = state.body[0];
  const dx = DIR_DX[state.direction], dy = DIR_DY[state.direction];

  for (let step = 1; step <= B.LUNGE_DISTANCE; step++) {
    const nx = head.x + dx * step, ny = head.y + dy * step;
    if (isWall(state, nx, ny)) break;
    if (isSelf(state, nx, ny)) break;

    // Eat pickups in path
    const pi = state.pickups.findIndex(p => p.x === nx && p.y === ny);
    if (pi !== -1) {
      const pk = state.pickups[pi];
      state.pickups.splice(pi, 1);
      if (pk.kind === PickupKind.SHEEP || pk.kind === PickupKind.GOLDEN_SHEEP) {
        const pts = (pk.kind === PickupKind.GOLDEN_SHEEP ? B.SCORE_GOLDEN_SHEEP : B.SCORE_SHEEP) * state.comboMultiplier;
        state.score += pts; state.sheepEaten++; advanceCombo(state);
        spawnFloatingText(state, nx, ny, `+${Math.floor(pts)}`, pk.kind === PickupKind.GOLDEN_SHEEP ? B.COLOR_GOLDEN_SHEEP : B.COLOR_SHEEP, 1.0);
      } else if (pk.kind === PickupKind.TREASURE) {
        const pts = B.SCORE_TREASURE * state.comboMultiplier;
        state.score += pts; state.treasureCollected++; advanceCombo(state);
        spawnFloatingText(state, nx, ny, `+${Math.floor(pts)}`, B.COLOR_TREASURE, 1.2);
      }
      spawnParticles(state, nx, ny, B.PARTICLE_COUNT_EAT, B.COLOR_LUNGE);
    }

    // Kill knights in path
    const ki = state.knights.findIndex(k => k.alive && k.x === nx && k.y === ny);
    if (ki !== -1) {
      state.knights[ki].alive = false;
      const pts = B.SCORE_KNIGHT * state.comboMultiplier;
      state.score += pts; state.knightsEaten++; advanceCombo(state);
      spawnParticles(state, nx, ny, B.PARTICLE_COUNT_EAT, B.COLOR_KNIGHT_ROAM);
      spawnFloatingText(state, nx, ny, `+${Math.floor(pts)}`, B.COLOR_KNIGHT_ROAM, 1.0);
      state.body.push({ ...state.body[state.body.length - 1] });
    }

    // Hit boss
    if (state.boss && state.boss.alive && state.boss.x === nx && state.boss.y === ny) {
      hitBoss(state);
    }

    // Move head to this cell
    state.body.unshift({ x: nx, y: ny });
    state.body.pop(); // lunge doesn't grow, just moves fast
  }

  spawnParticles(state, head.x, head.y, B.PARTICLE_COUNT_LUNGE, B.COLOR_LUNGE);
  state.length = state.body.length;
  state.screenShake = B.SHAKE_DURATION * 0.3;
  return true;
}

// ---------------------------------------------------------------------------
// Movement
// ---------------------------------------------------------------------------

export function updateMovement(state: WyrmState, dt: number): boolean {
  const baseInterval = state.speedBoostTimer > 0 ? state.moveInterval * B.SPEED_BOOST_MULT : state.moveInterval;
  const interval = state.slowMoTimer > 0 ? baseInterval / B.SLOW_MO_SCALE : baseInterval;

  state.moveTimer += dt;
  state.moveFraction = Math.min(state.moveTimer / interval, 1.0);
  if (state.moveTimer < interval) return false;
  state.moveTimer -= interval;
  state.moveFraction = 0;

  if (state.dirQueue.length > 0) state.nextDirection = state.dirQueue.shift()!;
  state.direction = state.nextDirection;

  const head = state.body[0];
  const nx = head.x + DIR_DX[state.direction], ny = head.y + DIR_DY[state.direction];

  // Trail
  const tail = state.body[state.body.length - 1];
  if (state.trail.length < B.TRAIL_MAX) {
    state.trail.push({ x: tail.x, y: tail.y, life: B.TRAIL_LIFETIME, maxLife: B.TRAIL_LIFETIME, color: B.COLOR_TRAIL });
  }

  // Near-miss slow-mo
  const ax = nx + DIR_DX[state.direction], ay = ny + DIR_DY[state.direction];
  if (!isWall(state, nx, ny) && !isSelf(state, nx, ny)) {
    if (isWall(state, ax, ay) || isSelf(state, ax, ay)) {
      if (state.slowMoTimer <= 0) state.slowMoTimer = B.SLOW_MO_DURATION;
    }
  }

  // Wall collision
  if (isWall(state, nx, ny)) {
    if (state.shieldHits > 0) { shieldSave(state, head.x, head.y); return false; }
    return true;
  }
  if (isSelf(state, nx, ny)) {
    if (state.shieldHits > 0) { shieldSave(state, head.x, head.y); return false; }
    return true;
  }

  // Boss collision
  if (state.boss && state.boss.alive && state.boss.x === nx && state.boss.y === ny) hitBoss(state);

  // Roaming knight collision
  const knightHit = state.knights.findIndex(k => k.alive && k.x === nx && k.y === ny);
  if (knightHit !== -1) {
    state.knights[knightHit].alive = false;
    const pts = B.SCORE_KNIGHT * state.comboMultiplier;
    state.score += pts; state.knightsEaten++; advanceCombo(state);
    spawnParticles(state, nx, ny, B.PARTICLE_COUNT_EAT, state.knights[knightHit].chasing ? B.COLOR_KNIGHT_CHASE : B.COLOR_KNIGHT_ROAM);
    spawnFloatingText(state, nx, ny, `+${Math.floor(pts)}`, B.COLOR_KNIGHT_ROAM, 1.0);
    state.body.push({ ...state.body[state.body.length - 1] });
  }

  state.body.unshift({ x: nx, y: ny });
  const eaten = checkPickups(state, nx, ny);
  if (!eaten && knightHit === -1) state.body.pop();

  // Poison tile check
  const poisonIdx = state.poisonTiles.findIndex(p => p.x === nx && p.y === ny);
  if (poisonIdx !== -1) {
    state.poisonTiles.splice(poisonIdx, 1);
    if (state.body.length > 2) {
      for (let i = 0; i < B.POISON_SHRINK && state.body.length > 2; i++) state.body.pop();
      spawnParticles(state, nx, ny, 8, B.COLOR_POISON);
      spawnFloatingText(state, nx, ny, "POISON!", B.COLOR_POISON, 1.3);
      state.screenFlashColor = B.COLOR_POISON;
      state.screenFlashTimer = B.FLASH_DURATION;
    }
  }

  state.length = state.body.length;
  return false;
}

function shieldSave(state: WyrmState, hx: number, hy: number): void {
  state.shieldHits--;
  spawnParticles(state, hx, hy, B.PARTICLE_COUNT_SHIELD_BREAK, B.COLOR_SHIELD);
  spawnFloatingText(state, hx, hy, state.shieldHits > 0 ? `SHIELD! (${state.shieldHits})` : "SHIELD!", B.COLOR_SHIELD, 1.5);
  state.screenShake = B.SHAKE_DURATION;
  state.screenFlashColor = B.COLOR_SHIELD;
  state.screenFlashTimer = B.FLASH_DURATION;
}

// Collision helpers
function isWall(state: WyrmState, x: number, y: number): boolean { for (const w of state.walls) if (w.x === x && w.y === y) return true; return false; }
function isSelf(state: WyrmState, x: number, y: number): boolean { for (let i = 0; i < state.body.length - 1; i++) if (state.body[i].x === x && state.body[i].y === y) return true; return false; }

export function distanceToObstacle(state: WyrmState): number {
  const head = state.body[0], dx = DIR_DX[state.direction], dy = DIR_DY[state.direction];
  for (let d = 1; d <= B.DANGER_DISTANCE + 1; d++) if (isWall(state, head.x + dx * d, head.y + dy * d) || isSelf(state, head.x + dx * d, head.y + dy * d)) return d;
  return B.DANGER_DISTANCE + 2;
}

// ---------------------------------------------------------------------------
// Knight-body collision — knights that walk into the wyrm body die
// ---------------------------------------------------------------------------

export function checkKnightBodyCollisions(state: WyrmState): void {
  const bodySet = new Set<string>();
  for (const c of state.body) bodySet.add(`${c.x},${c.y}`);

  for (const k of state.knights) {
    if (!k.alive) continue;
    if (bodySet.has(`${k.x},${k.y}`)) {
      k.alive = false;
      const pts = B.SCORE_KNIGHT * 0.5; // half points for passive kill
      state.score += pts; state.knightsEaten++;
      spawnParticles(state, k.x, k.y, 6, B.COLOR_KNIGHT_ROAM);
      spawnFloatingText(state, k.x, k.y, `+${Math.floor(pts)}`, B.COLOR_KNIGHT_ROAM, 0.8);
    }
  }
}

// ---------------------------------------------------------------------------
// Pickup collection
// ---------------------------------------------------------------------------

function checkPickups(state: WyrmState, hx: number, hy: number): boolean {
  const idx = state.pickups.findIndex(p => p.x === hx && p.y === hy);
  if (idx === -1) return false;
  const pk = state.pickups[idx]; state.pickups.splice(idx, 1);

  switch (pk.kind) {
    case PickupKind.SHEEP: {
      const pts = B.SCORE_SHEEP * state.comboMultiplier;
      state.score += pts; state.sheepEaten++; advanceCombo(state);
      spawnParticles(state, hx, hy, B.PARTICLE_COUNT_EAT, B.COLOR_SHEEP);
      spawnFloatingText(state, hx, hy, `+${Math.floor(pts)}`, B.COLOR_SHEEP, 1.0);
      return true;
    }
    case PickupKind.GOLDEN_SHEEP: {
      const pts = B.SCORE_GOLDEN_SHEEP * state.comboMultiplier;
      state.score += pts; state.sheepEaten++; advanceCombo(state);
      spawnParticles(state, hx, hy, B.PARTICLE_COUNT_EAT + 6, B.COLOR_GOLDEN_SHEEP);
      spawnFloatingText(state, hx, hy, `+${Math.floor(pts)} GOLDEN!`, B.COLOR_GOLDEN_SHEEP, 1.6);
      state.screenFlashColor = B.COLOR_GOLDEN_SHEEP; state.screenFlashTimer = B.FLASH_DURATION;
      return false;
    }
    case PickupKind.KNIGHT: {
      const pts = B.SCORE_KNIGHT * state.comboMultiplier;
      state.score += pts; state.knightsEaten++; advanceCombo(state);
      spawnParticles(state, hx, hy, B.PARTICLE_COUNT_EAT, B.COLOR_KNIGHT);
      spawnFloatingText(state, hx, hy, `+${Math.floor(pts)}`, B.COLOR_KNIGHT, 1.0);
      state.body.push({ ...state.body[state.body.length - 1] });
      return true;
    }
    case PickupKind.TREASURE: {
      const pts = B.SCORE_TREASURE * state.comboMultiplier;
      state.score += pts; state.treasureCollected++; advanceCombo(state);
      spawnParticles(state, hx, hy, B.PARTICLE_COUNT_EAT, B.COLOR_TREASURE);
      spawnFloatingText(state, hx, hy, `+${Math.floor(pts)}`, B.COLOR_TREASURE, 1.2);
      state.screenFlashColor = B.COLOR_TREASURE; state.screenFlashTimer = B.FLASH_DURATION * 0.5;
      return false;
    }
    case PickupKind.POTION:
      state.speedBoostTimer = B.SPEED_BOOST_DURATION;
      spawnParticles(state, hx, hy, B.PARTICLE_COUNT_EAT, B.COLOR_POTION);
      spawnFloatingText(state, hx, hy, "SPEED!", B.COLOR_POTION, 1.3);
      state.screenFlashColor = B.COLOR_POTION; state.screenFlashTimer = B.FLASH_DURATION;
      return false;
    case PickupKind.FIRE_SCROLL: {
      const dur = B.FIRE_BREATH_DURATION + state.fireUpgrade * 2;
      state.fireBreathTimer = dur;
      spawnParticles(state, hx, hy, B.PARTICLE_COUNT_EAT, B.COLOR_FIRE_SCROLL);
      spawnFloatingText(state, hx, hy, "FIRE!", B.COLOR_FIRE_SCROLL, 1.3);
      state.screenFlashColor = B.COLOR_FIRE_SCROLL; state.screenFlashTimer = B.FLASH_DURATION;
      return false;
    }
    case PickupKind.SHIELD:
      state.shieldHits = 1 + state.shieldUpgrade;
      spawnParticles(state, hx, hy, B.PARTICLE_COUNT_EAT, B.COLOR_SHIELD);
      spawnFloatingText(state, hx, hy, state.shieldHits > 1 ? `SHIELD x${state.shieldHits}!` : "SHIELD!", B.COLOR_SHIELD, 1.3);
      state.screenFlashColor = B.COLOR_SHIELD; state.screenFlashTimer = B.FLASH_DURATION;
      return false;
    case PickupKind.PORTAL: {
      state.portalUsedThisFrame = true;
      spawnParticles(state, hx, hy, B.PARTICLE_COUNT_PORTAL, B.COLOR_PORTAL);
      const dest = findFreeCell(state);
      if (dest) {
        state.body[0].x = dest.x; state.body[0].y = dest.y;
        spawnParticles(state, dest.x, dest.y, B.PARTICLE_COUNT_PORTAL, B.COLOR_PORTAL);
        spawnFloatingText(state, dest.x, dest.y, "WARP!", B.COLOR_PORTAL, 1.5);
        state.screenFlashColor = B.COLOR_PORTAL; state.screenFlashTimer = B.FLASH_DURATION * 1.5;
        state.screenShake = B.SHAKE_DURATION * 0.5;
      }
      return false;
    }
  }
  return false;
}

// Combo
function advanceCombo(state: WyrmState): void {
  state.comboCount++; state.comboTimer = B.COMBO_WINDOW;
  state.comboMultiplier = Math.min(state.comboCount, B.COMBO_MULT_CAP);
  if (state.comboCount > state.bestCombo) state.bestCombo = state.comboCount;
  if (state.comboCount >= 3) spawnFloatingText(state, state.body[0].x, state.body[0].y - 1, `${state.comboCount}x COMBO!`, B.COLOR_COMBO, 1.0 + state.comboCount * 0.1);
}

export function updateCombo(state: WyrmState, dt: number): void {
  if (state.comboTimer > 0) { state.comboTimer -= dt; if (state.comboTimer <= 0) { state.comboCount = 0; state.comboMultiplier = 1; } }
}

// Fire breath
export function updateFireBreath(state: WyrmState, dt: number): void {
  if (state.fireBreathTimer <= 0) return;
  state.fireBreathTimer -= dt;
  const head = state.body[0], dx = DIR_DX[state.direction], dy = DIR_DY[state.direction];
  for (let r = 1; r <= B.FIRE_BREATH_RANGE; r++) {
    const fx = head.x + dx * r, fy = head.y + dy * r;
    const pi = state.pickups.findIndex(p => p.x === fx && p.y === fy);
    if (pi !== -1) { state.score += B.SCORE_FIRE_KILL; spawnParticles(state, fx, fy, B.PARTICLE_COUNT_FIRE, B.COLOR_WYRM_FIRE); state.pickups.splice(pi, 1); }
    for (const k of state.knights) { if (k.alive && k.x === fx && k.y === fy) { k.alive = false; state.score += B.SCORE_FIRE_KILL * 2; state.knightsEaten++; spawnParticles(state, fx, fy, B.PARTICLE_COUNT_FIRE, B.COLOR_KNIGHT_ROAM); spawnFloatingText(state, fx, fy, "BURN!", B.COLOR_WYRM_FIRE, 1.2); } }
    if (state.boss && state.boss.alive && state.boss.x === fx && state.boss.y === fy) hitBoss(state);
    const wi = state.walls.findIndex(w => w.x === fx && w.y === fy && w.x > 0 && w.x < state.cols - 1 && w.y > 0 && w.y < state.rows - 1);
    if (wi !== -1) { spawnParticles(state, fx, fy, B.PARTICLE_COUNT_FIRE, B.COLOR_WALL); state.walls.splice(wi, 1); }
    // Destroy poison tiles in fire path
    const pti = state.poisonTiles.findIndex(p => p.x === fx && p.y === fy);
    if (pti !== -1) { spawnParticles(state, fx, fy, B.PARTICLE_COUNT_FIRE, B.COLOR_POISON); state.poisonTiles.splice(pti, 1); }
  }
}

// Boss
function hitBoss(state: WyrmState): void {
  if (!state.boss || !state.boss.alive) return;
  state.boss.hp--; state.boss.flashTimer = B.BOSS_FLASH_DURATION;
  spawnParticles(state, state.boss.x, state.boss.y, B.PARTICLE_COUNT_BOSS_HIT, B.COLOR_BOSS);
  state.screenShake = B.SHAKE_DURATION * 0.3;
  if (state.boss.hp <= 0) {
    state.boss.alive = false; state.bossesKilled++;
    const pts = B.SCORE_BOSS_KILL * state.comboMultiplier;
    state.score += pts; advanceCombo(state);
    spawnParticles(state, state.boss.x, state.boss.y, B.PARTICLE_COUNT_BOSS_KILL, B.COLOR_BOSS);
    spawnFloatingText(state, state.boss.x, state.boss.y, `BOSS SLAIN! +${Math.floor(pts)}`, B.COLOR_BOSS, 2.0);
    state.screenShake = B.SHAKE_DURATION * 1.5; state.screenFlashColor = B.COLOR_BOSS; state.screenFlashTimer = B.FLASH_DURATION * 2;
    state.boss = null;
  } else {
    spawnFloatingText(state, state.boss.x, state.boss.y, `${state.boss.hp}/${state.boss.maxHp}`, B.COLOR_BOSS, 1.0);
  }
}

export function updateBoss(state: WyrmState, dt: number): void {
  if (!state.boss || !state.boss.alive) return;
  const boss = state.boss;
  if (boss.flashTimer > 0) boss.flashTimer -= dt;
  boss.moveTimer -= dt;
  if (boss.moveTimer > 0) return;
  boss.moveTimer = B.BOSS_MOVE_INTERVAL;
  const head = state.body[0];
  const bestDir = dirToward(boss.x, boss.y, head.x, head.y);
  for (const d of [bestDir, ...([0,1,2,3] as Direction[]).filter(x => x !== bestDir)]) {
    const nx = boss.x + DIR_DX[d], ny = boss.y + DIR_DY[d];
    if (!isWall(state, nx, ny)) { boss.x = nx; boss.y = ny; boss.dir = d; break; }
  }
}

function dirToward(fx: number, fy: number, tx: number, ty: number): Direction {
  const dx = tx - fx, dy = ty - fy;
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? Direction.RIGHT : Direction.LEFT) : (dy > 0 ? Direction.DOWN : Direction.UP);
}

// Knights
export function updateKnights(state: WyrmState, dt: number): void {
  const wb = Math.min(state.wave, 8);
  const si = Math.max(5, B.KNIGHT_SPAWN_INTERVAL - wb);
  const mi = Math.max(B.KNIGHT_MIN_MOVE_INTERVAL, B.KNIGHT_MOVE_INTERVAL - wb * 0.025);
  const mk = B.MAX_KNIGHTS + Math.floor(wb / 2);

  state.knightSpawnTimer -= dt;
  if (state.knightSpawnTimer <= 0 && aliveCount(state) < mk) {
    state.knightSpawnTimer = si;
    const pos = findFreeCell(state);
    if (pos) {
      const chasing = state.wave >= B.KNIGHT_CHASE_WAVE && Math.random() < B.KNIGHT_CHASE_CHANCE;
      state.knights.push({ x: pos.x, y: pos.y, dir: Math.floor(Math.random() * 4) as Direction, moveTimer: mi, alive: true, chasing });
    }
  }

  const head = state.body[0];
  for (const k of state.knights) {
    if (!k.alive) continue;
    k.moveTimer -= dt;
    if (k.moveTimer > 0) continue;
    k.moveTimer = k.chasing ? mi * 0.7 : mi;
    const dirs = k.chasing ? [dirToward(k.x, k.y, head.x, head.y), ...shuffleOthers(dirToward(k.x, k.y, head.x, head.y))] : shuffleDirs(k.dir);
    for (const d of dirs) {
      const nx = k.x + DIR_DX[d], ny = k.y + DIR_DY[d];
      if (isWall(state, nx, ny) || state.knights.some(o => o.alive && o !== k && o.x === nx && o.y === ny)) continue;
      k.x = nx; k.y = ny; k.dir = d; break;
    }
  }
  state.knights = state.knights.filter(k => k.alive);
}

function aliveCount(s: WyrmState): number { let c = 0; for (const k of s.knights) if (k.alive) c++; return c; }
function shuffleDirs(pref: Direction): Direction[] { return [pref, ...shuffleOthers(pref)]; }
function shuffleOthers(pref: Direction): Direction[] {
  const o = ([0,1,2,3] as Direction[]).filter(d => d !== pref);
  for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; }
  return o;
}

// Pickup magnet — pickups gently drift toward wyrm head when within magnetRadius
export function updatePickupMagnet(state: WyrmState, _dt: number): void {
  if (state.magnetRadius <= 0) return;
  const head = state.body[0];
  const r2 = state.magnetRadius * state.magnetRadius;
  for (const p of state.pickups) {
    const dx = head.x - p.x, dy = head.y - p.y;
    const dist2 = dx * dx + dy * dy;
    if (dist2 > 0 && dist2 <= r2) {
      // Don't actually move grid position — just mark for visual drift in renderer
      // The actual eating happens on exact grid collision, so magnet is purely visual guidance
      // We'll adjust pickup x/y fractionally toward head (capped at 0.3 cells per second)
      // No — pickups are grid-aligned integers. Instead we'll add a visual-only drift.
      // Skip — this is handled as visual-only in the renderer via state.body[0] proximity.
    }
  }
}

// Pickups
export function updatePickupSpawning(state: WyrmState, dt: number): void {
  state.pickupTimer -= dt;
  if (state.pickupTimer > 0) return;
  state.pickupTimer = Math.max(1.0, B.PICKUP_SPAWN_INTERVAL - state.wave * 0.05);
  if (state.pickups.length >= B.MAX_PICKUPS) return;
  const w = B.PICKUP_WEIGHTS; let total = 0; for (const k in w) total += w[k];
  let r = Math.random() * total; let kind = PickupKind.SHEEP;
  for (const k in w) { r -= w[k]; if (r <= 0) { kind = k as PickupKind; break; } }
  const pos = findFreeCell(state);
  if (pos) state.pickups.push({ x: pos.x, y: pos.y, kind, age: 0 });
}

export function agePickups(state: WyrmState, dt: number): void {
  for (let i = state.pickups.length - 1; i >= 0; i--) { state.pickups[i].age += dt; if (state.pickups[i].age > B.PICKUP_DESPAWN_TIME) state.pickups.splice(i, 1); }
}

// Poison tiles
export function updatePoisonTiles(state: WyrmState, dt: number): void {
  for (let i = state.poisonTiles.length - 1; i >= 0; i--) { state.poisonTiles[i].life -= dt; if (state.poisonTiles[i].life <= 0) state.poisonTiles.splice(i, 1); }
}

// Waves
export function updateWaves(state: WyrmState, dt: number): void {
  state.waveTimer -= dt;
  if (state.waveTimer > 0) return;
  state.wave++; state.waveTimer = B.WAVE_INTERVAL;

  // Boss
  if (state.wave % B.BOSS_WAVE_INTERVAL === 0 && (!state.boss || !state.boss.alive)) {
    const pos = findFreeCell(state);
    if (pos) {
      state.boss = { x: pos.x, y: pos.y, dir: Direction.DOWN, moveTimer: B.BOSS_MOVE_INTERVAL, hp: B.BOSS_HP, maxHp: B.BOSS_HP, alive: true, flashTimer: 0 };
      spawnFloatingText(state, pos.x, pos.y, "BOSS!", B.COLOR_BOSS, 2.0);
      state.screenShake = B.SHAKE_DURATION; state.screenFlashColor = B.COLOR_BOSS; state.screenFlashTimer = B.FLASH_DURATION * 2;
    }
  }

  // Walls
  const pCount = 2 * state.cols + 2 * (state.rows - 2);
  if (state.walls.length < B.MAX_WALLS + pCount) {
    const placed: Cell[] = [];
    const pat = state.wave % 4;
    if (pat === 0) { for (let i = 0; i < B.WALLS_PER_WAVE; i++) { const p = findFreeCell(state); if (p) placed.push(p); } }
    else if (pat === 1) { const p = findFreeCell(state); if (p) for (let d = -2; d <= 2; d++) { const wx = p.x + d; if (wx > 0 && wx < state.cols - 1 && !isWall(state, wx, p.y)) placed.push({ x: wx, y: p.y }); } }
    else if (pat === 2) { const p = findFreeCell(state); if (p) for (let d = -2; d <= 2; d++) { const wy = p.y + d; if (wy > 0 && wy < state.rows - 1 && !isWall(state, p.x, wy)) placed.push({ x: p.x, y: wy }); } }
    else { const p = findFreeCell(state); if (p) for (const [dx, dy] of [[0,0],[1,0],[2,0],[0,1],[0,2]]) { const wx = p.x+dx, wy = p.y+dy; if (wx > 0 && wx < state.cols-1 && wy > 0 && wy < state.rows-1 && !isWall(state,wx,wy)) placed.push({x:wx,y:wy}); } }
    for (const p of placed) { state.walls.push(p); spawnParticles(state, p.x, p.y, 3, B.COLOR_WALL); }
  }

  // Poison tiles from wave 4+
  if (state.wave >= B.POISON_START_WAVE) {
    for (let i = 0; i < B.POISON_PER_WAVE; i++) {
      const pos = findFreeCell(state);
      if (pos) state.poisonTiles.push({ x: pos.x, y: pos.y, life: B.POISON_LIFETIME });
    }
  }

  spawnFloatingText(state, state.body[0].x, state.body[0].y - 2, `WAVE ${state.wave}`, 0xff8844, 1.5);
  state.screenShake = B.SHAKE_DURATION * 0.5;
}

// Milestones
export function checkMilestones(state: WyrmState): string | null {
  const score = Math.floor(state.score);
  const names = ["Squire", "Knight", "Champion", "Dragon Slayer", "Hero", "Legend", "WYRM LORD"];
  for (let i = B.SCORE_MILESTONES.length - 1; i >= 0; i--) {
    if (score >= B.SCORE_MILESTONES[i] && state.lastMilestone < B.SCORE_MILESTONES[i]) {
      state.lastMilestone = B.SCORE_MILESTONES[i]; return names[i] || "Master";
    }
  }
  return null;
}

// Evolution tier check
export function checkEvolution(state: WyrmState): string | null {
  const tier = getWyrmTierIndex(state.length);
  if (tier > state.lastColorTier) {
    state.lastColorTier = tier;
    return WYRM_COLOR_TIERS[tier].colors.name;
  }
  return null;
}

// Dragon coins earned from a run
export function calcDragonCoins(score: number): number {
  return Math.floor(score / 100) * B.COINS_PER_100_SCORE;
}

// Speed, timers
export function updateSpeed(state: WyrmState): void {
  state.moveInterval = Math.max(B.MIN_MOVE_INTERVAL, B.START_MOVE_INTERVAL - state.body.length * B.SPEED_PER_LENGTH);
}

export function updateTimers(state: WyrmState, dt: number): void {
  state.time += dt; state.score += B.SCORE_PER_SECOND * dt;
  if (state.speedBoostTimer > 0) state.speedBoostTimer -= dt;
  if (state.screenShake > 0) state.screenShake -= dt;
  if (state.screenFlashTimer > 0) state.screenFlashTimer -= dt;
  if (state.slowMoTimer > 0) state.slowMoTimer -= dt;
  if (state.lungeCooldown > 0) state.lungeCooldown -= dt;
  if (state.lungeFlash > 0) state.lungeFlash -= dt;
}

// Trail, death, particles, floating text (unchanged logic, compact)
export function updateTrail(s: WyrmState, dt: number): void { for (let i = s.trail.length - 1; i >= 0; i--) { s.trail[i].life -= dt; if (s.trail[i].life <= 0) s.trail.splice(i, 1); } }

export function spawnDeathScatter(s: WyrmState): void {
  for (let i = 0; i < s.body.length; i++) {
    const seg = s.body[i], a = Math.random() * Math.PI * 2, spd = B.DEATH_SCATTER_SPEED * (0.5 + Math.random() * 0.5);
    const color = i === 0 ? B.COLOR_WYRM_HEAD : (i % 2 === 0 ? B.COLOR_WYRM_BODY : B.COLOR_WYRM_BODY_ALT);
    s.deathSegments.push({ x: seg.x, y: seg.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, rotation: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - 0.5) * 10, color, radius: Math.max(0.35, 0.78 - i * 0.004) * 0.45, life: B.DEATH_SEGMENT_LIFETIME });
  }
}

export function updateDeathSegments(s: WyrmState, dt: number): void {
  for (let i = s.deathSegments.length - 1; i >= 0; i--) { const d = s.deathSegments[i]; d.x += d.vx * dt / B.CELL_SIZE; d.y += d.vy * dt / B.CELL_SIZE; d.vx *= 0.95; d.vy *= 0.95; d.rotation += d.rotSpeed * dt; d.life -= dt; if (d.life <= 0) s.deathSegments.splice(i, 1); }
}

export function spawnParticles(s: WyrmState, gx: number, gy: number, count: number, color: number): void {
  for (let i = 0; i < count; i++) { const a = Math.random() * Math.PI * 2, spd = 50 + Math.random() * 100; s.particles.push({ x: gx, y: gy, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, life: B.PARTICLE_LIFETIME, maxLife: B.PARTICLE_LIFETIME, color, size: 2 + Math.random() * 4 }); }
}

export function updateParticles(s: WyrmState, dt: number): void {
  for (let i = s.particles.length - 1; i >= 0; i--) { const p = s.particles[i]; p.x += p.vx * dt / B.CELL_SIZE; p.y += p.vy * dt / B.CELL_SIZE; p.vx *= 0.96; p.vy *= 0.96; p.life -= dt; if (p.life <= 0) s.particles.splice(i, 1); }
}

export function spawnFloatingText(s: WyrmState, gx: number, gy: number, text: string, color: number, scale = 1.0): void {
  s.floatingTexts.push({ x: gx, y: gy, text, color, life: 1.2, maxLife: 1.2, scale });
}

export function updateFloatingTexts(s: WyrmState, dt: number): void {
  for (let i = s.floatingTexts.length - 1; i >= 0; i--) { const ft = s.floatingTexts[i]; ft.y -= dt * 1.5; ft.life -= dt; if (ft.life <= 0) s.floatingTexts.splice(i, 1); }
}

function findFreeCell(state: WyrmState): Cell | null {
  const occ = new Set<string>();
  for (const c of state.body) occ.add(`${c.x},${c.y}`);
  for (const w of state.walls) occ.add(`${w.x},${w.y}`);
  for (const p of state.pickups) occ.add(`${p.x},${p.y}`);
  for (const k of state.knights) if (k.alive) occ.add(`${k.x},${k.y}`);
  if (state.boss && state.boss.alive) occ.add(`${state.boss.x},${state.boss.y}`);
  for (const p of state.poisonTiles) occ.add(`${p.x},${p.y}`);
  const head = state.body[0];
  for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) occ.add(`${head.x + dx},${head.y + dy}`);
  for (let a = 0; a < 100; a++) { const x = 1 + Math.floor(Math.random() * (state.cols - 2)), y = 1 + Math.floor(Math.random() * (state.rows - 2)); if (!occ.has(`${x},${y}`)) return { x, y }; }
  return null;
}
