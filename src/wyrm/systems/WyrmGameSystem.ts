// ---------------------------------------------------------------------------
// Wyrm — Core game systems (v7)
// Hitstop, breakable walls, archers+projectiles, synergies, wave events,
// combo keeper upgrade, boss scaling & loot, etc.
// ---------------------------------------------------------------------------

import { Direction, PickupKind, WyrmPhase } from "../types";
import type { WyrmState, Cell, SynergyKind, Blessing, BossType } from "../types";
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
// Hitstop
// ---------------------------------------------------------------------------

export function triggerHitstop(state: WyrmState, duration: number): void {
  state.hitstopTimer = Math.max(state.hitstopTimer, duration);
}

// ---------------------------------------------------------------------------
// Lunge — dash forward N cells, eating everything in path.
// Can break breakable walls.
// ---------------------------------------------------------------------------

export function tryLunge(state: WyrmState, upgrades: { fasterLunge: number }): boolean {
  if (state.lungeCooldown > 0) return false;
  const berserker = state.blessings.includes("berserker");
  const cd = B.LUNGE_COOLDOWN - upgrades.fasterLunge - (berserker ? 1 : 0);
  state.lungeCooldown = Math.max(0.5, cd);
  state.lungeFlash = B.LUNGE_FLASH;

  const head = state.body[0];
  const dx = DIR_DX[state.direction], dy = DIR_DY[state.direction];

  const lungeDist = B.LUNGE_DISTANCE + (berserker ? 1 : 0);
  for (let step = 1; step <= lungeDist; step++) {
    const nx = head.x + dx * step, ny = head.y + dy * step;

    // Breakable wall check — lunge smashes through
    const wallKey = `${nx},${ny}`;
    if (state.breakableWalls.has(wallKey)) {
      state.breakableWalls.delete(wallKey);
      const wi = state.walls.findIndex(w => w.x === nx && w.y === ny);
      if (wi !== -1) state.walls.splice(wi, 1);
      state.score += B.SCORE_BREAK_WALL;
      spawnParticles(state, nx, ny, 6, B.COLOR_WALL);
      spawnFloatingText(state, nx, ny, "SMASH!", B.COLOR_WALL_HIGHLIGHT, 1.0);
      // Don't break — continue lunging through
      continue;
    }

    if (isWall(state, nx, ny)) break;
    if (isSelf(state, nx, ny)) break;

    // Destroy projectiles in path
    const projIdx = state.projectiles.findIndex(p => p.alive && p.x === nx && p.y === ny);
    if (projIdx !== -1) {
      state.projectiles[projIdx].alive = false;
      state.projectilesDeflected++;
      state.score += B.SCORE_PROJECTILE_DEFLECT;
      spawnParticles(state, nx, ny, 4, B.COLOR_PROJECTILE);
      spawnFloatingText(state, nx, ny, "DEFLECT!", B.COLOR_PROJECTILE, 1.0);
    }

    // Lunge magnet pull — pull nearby pickups to the lunge path
    const pullRange = B.LUNGE_MAGNET_RANGE + (state.blessings.includes("magnet_soul") ? 1 : 0);
    for (let pd = -pullRange; pd <= pullRange; pd++) {
      if (pd === 0) continue;
      // Check perpendicular cells
      const pullX = nx + (dy !== 0 ? pd : 0);
      const pullY = ny + (dx !== 0 ? pd : 0);
      const pulled = state.pickups.findIndex(p => p.x === pullX && p.y === pullY);
      if (pulled !== -1) {
        // Move pickup to lunge path
        state.pickups[pulled].x = nx;
        state.pickups[pulled].y = ny;
        spawnParticles(state, pullX, pullY, 3, B.COLOR_MAGNET);
      }
    }

    // Eat pickups in path (including pulled ones)
    // Collect ALL pickups at this position (multiple can land here from pull)
    while (true) {
      const pi = state.pickups.findIndex(p => p.x === nx && p.y === ny);
      if (pi === -1) break;
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
      triggerHitstop(state, B.HITSTOP_EAT_KNIGHT);
      addWrath(state, B.WRATH_GAIN_LUNGE_KILL);
    }

    // Kill archers in path
    const ai = state.archerKnights.findIndex(a => a.alive && a.x === nx && a.y === ny);
    if (ai !== -1) {
      state.archerKnights[ai].alive = false;
      const pts = B.SCORE_ARCHER_KILL * state.comboMultiplier;
      state.score += pts; state.archersKilled++; advanceCombo(state);
      spawnParticles(state, nx, ny, B.PARTICLE_COUNT_EAT, B.COLOR_ARCHER);
      spawnFloatingText(state, nx, ny, `+${Math.floor(pts)}`, B.COLOR_ARCHER, 1.2);
      state.body.push({ ...state.body[state.body.length - 1] });
      triggerHitstop(state, B.HITSTOP_EAT_KNIGHT);
      addWrath(state, B.WRATH_GAIN_LUNGE_KILL);
    }

    // Hit boss
    if (state.boss && state.boss.alive && state.boss.x === nx && state.boss.y === ny) {
      hitBoss(state);
    }

    // Move head to this cell
    state.body.unshift({ x: nx, y: ny });
    state.body.pop();
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

  const invuln = state.gracePeriod > 0 || state.comboInvulnTimer > 0;

  // Juggernaut synergy: destroy interior walls on contact
  if (state.activeSynergy === "juggernaut" && isWall(state, nx, ny)) {
    // Check if interior wall
    if (nx > 0 && nx < state.cols - 1 && ny > 0 && ny < state.rows - 1) {
      const wi = state.walls.findIndex(w => w.x === nx && w.y === ny);
      if (wi !== -1) {
        state.walls.splice(wi, 1);
        state.breakableWalls.delete(`${nx},${ny}`);
        spawnParticles(state, nx, ny, 8, B.COLOR_WALL);
        state.score += B.SCORE_BREAK_WALL * 2;
        state.screenShake = B.SHAKE_DURATION * 0.2;
        // Don't collide, fall through to normal movement
      }
    }
  }

  // Wall collision
  if (isWall(state, nx, ny)) {
    if (invuln) return false;
    if (state.shieldHits > 0) { shieldSave(state, head.x, head.y); return false; }
    return true;
  }
  if (isSelf(state, nx, ny)) {
    if (invuln) return false;
    if (state.shieldHits > 0) { shieldSave(state, head.x, head.y); return false; }
    return true;
  }

  // Boss collision
  if (state.boss && state.boss.alive && state.boss.x === nx && state.boss.y === ny) hitBoss(state);

  // Roaming knight collision
  const knightHit = state.knights.findIndex(k => k.alive && k.x === nx && k.y === ny);
  if (knightHit !== -1) {
    state.knights[knightHit].alive = false;
    const knightMult = state.blessings.includes("predator_instinct") ? 2 : 1;
    const pts = B.SCORE_KNIGHT * state.comboMultiplier * knightMult;
    state.score += pts; state.knightsEaten++; advanceCombo(state);
    spawnParticles(state, nx, ny, B.PARTICLE_COUNT_EAT, state.knights[knightHit].chasing ? B.COLOR_KNIGHT_CHASE : B.COLOR_KNIGHT_ROAM);
    spawnFloatingText(state, nx, ny, `+${Math.floor(pts)}`, B.COLOR_KNIGHT_ROAM, 1.0);
    state.body.push({ ...state.body[state.body.length - 1] });
    triggerHitstop(state, B.HITSTOP_EAT_KNIGHT);
    addWrath(state, B.WRATH_GAIN_KNIGHT);
  }

  // Archer collision (head-on)
  const archerHit = state.archerKnights.findIndex(a => a.alive && a.x === nx && a.y === ny);
  if (archerHit !== -1) {
    state.archerKnights[archerHit].alive = false;
    const pts = B.SCORE_ARCHER_KILL * state.comboMultiplier;
    state.score += pts; state.archersKilled++; advanceCombo(state);
    spawnParticles(state, nx, ny, B.PARTICLE_COUNT_EAT, B.COLOR_ARCHER);
    spawnFloatingText(state, nx, ny, `+${Math.floor(pts)}`, B.COLOR_ARCHER, 1.2);
    state.body.push({ ...state.body[state.body.length - 1] });
    triggerHitstop(state, B.HITSTOP_EAT_KNIGHT);
    addWrath(state, B.WRATH_GAIN_ARCHER);
  }

  state.body.unshift({ x: nx, y: ny });
  const eaten = checkPickups(state, nx, ny);
  if (!eaten && knightHit === -1 && archerHit === -1) state.body.pop();

  // Poison tile check
  const poisonIdx = state.poisonTiles.findIndex(p => p.x === nx && p.y === ny);
  if (poisonIdx !== -1) {
    state.poisonTiles.splice(poisonIdx, 1);
    const shrinkAmount = Math.max(0, B.POISON_SHRINK - state.poisonResistUpgrade);
    if (shrinkAmount > 0 && state.body.length > 2) {
      for (let i = 0; i < shrinkAmount && state.body.length > 2; i++) state.body.pop();
      spawnParticles(state, nx, ny, 8, B.COLOR_POISON);
      spawnFloatingText(state, nx, ny, "POISON!", B.COLOR_POISON, 1.3);
      state.screenFlashColor = B.COLOR_POISON;
      state.screenFlashTimer = B.FLASH_DURATION;
    } else if (shrinkAmount <= 0) {
      spawnParticles(state, nx, ny, 4, B.COLOR_POISON);
      spawnFloatingText(state, nx, ny, "RESISTED!", 0x44ff44, 1.0);
    }
  }

  // Lava tile check
  const lavaIdx = state.lavaTiles.findIndex(l => l.x === nx && l.y === ny);
  if (lavaIdx !== -1) {
    state.lavaTiles.splice(lavaIdx, 1);
    if (state.body.length > 2) {
      for (let i = 0; i < B.LAVA_SHRINK && state.body.length > 2; i++) state.body.pop();
      spawnParticles(state, nx, ny, 10, B.COLOR_LAVA);
      spawnFloatingText(state, nx, ny, "LAVA!", B.COLOR_LAVA, 1.3);
      state.screenFlashColor = B.COLOR_LAVA;
      state.screenFlashTimer = B.FLASH_DURATION;
      state.screenShake = B.SHAKE_DURATION * 0.3;
    }
  }

  // Projectile collision with head
  const projHit = state.projectiles.findIndex(p => p.alive && p.x === nx && p.y === ny);
  if (projHit !== -1) {
    state.projectiles[projHit].alive = false;
    const arrowImmune = state.blessings.includes("iron_scales");
    if (!invuln && !arrowImmune && state.shieldHits <= 0) {
      // Lose 1 segment
      if (state.body.length > 2) {
        state.body.pop();
        spawnFloatingText(state, nx, ny, "ARROW HIT!", 0xff4444, 1.3);
        state.screenFlashColor = 0xff4444; state.screenFlashTimer = B.FLASH_DURATION;
        state.screenShake = B.SHAKE_DURATION * 0.5;
      }
    } else if (state.shieldHits > 0) {
      shieldSave(state, nx, ny);
    } else {
      spawnFloatingText(state, nx, ny, arrowImmune ? "DEFLECTED!" : "BLOCKED!", B.COLOR_GRACE, 1.0);
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
  state.gracePeriod = B.GRACE_PERIOD;
  triggerHitstop(state, B.HITSTOP_SHIELD_BREAK);
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
// Knight-body collision
// ---------------------------------------------------------------------------

export function checkKnightBodyCollisions(state: WyrmState): void {
  const bodySet = new Set<string>();
  for (const c of state.body) bodySet.add(`${c.x},${c.y}`);

  for (const k of state.knights) {
    if (!k.alive) continue;
    if (bodySet.has(`${k.x},${k.y}`)) {
      k.alive = false;
      const pts = B.SCORE_KNIGHT * 0.5;
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

  // Fortress synergy bonus: pickups grant +5 bonus score
  if (state.activeSynergy === "fortress") {
    state.score += 5;
  }

  switch (pk.kind) {
    case PickupKind.SHEEP: {
      const scoreMult = state.blessings.includes("golden_touch") ? 1.25 : 1.0;
      const pts = B.SCORE_SHEEP * state.comboMultiplier * scoreMult;
      state.score += pts; state.sheepEaten++; advanceCombo(state);
      spawnParticles(state, hx, hy, B.PARTICLE_COUNT_EAT, B.COLOR_SHEEP);
      spawnFloatingText(state, hx, hy, `+${Math.floor(pts)}`, B.COLOR_SHEEP, 1.0);
      // Serpent's Appetite: +1 extra length from sheep
      if (state.blessings.includes("serpent_appetite")) {
        state.body.push({ ...state.body[state.body.length - 1] });
      }
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
      triggerHitstop(state, B.HITSTOP_EAT_KNIGHT);
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
    case PickupKind.MAGNET:
      state.magnetBoostTimer = B.MAGNET_BOOST_DURATION;
      state.magnetRadius = state.baseMagnetRadius * B.MAGNET_BOOST_MULT;
      spawnParticles(state, hx, hy, B.PARTICLE_COUNT_EAT, B.COLOR_MAGNET);
      spawnFloatingText(state, hx, hy, "MAGNET!", B.COLOR_MAGNET, 1.3);
      state.screenFlashColor = B.COLOR_MAGNET; state.screenFlashTimer = B.FLASH_DURATION;
      return false;
    case PickupKind.LIGHTNING_SCROLL: {
      const range = B.LIGHTNING_RANGE + state.lightningRangeUpgrade * 2;
      let kills = 0;
      for (const k of state.knights) {
        if (!k.alive) continue;
        const dist = Math.abs(k.x - hx) + Math.abs(k.y - hy);
        if (dist <= range) {
          k.alive = false; kills++;
          state.score += B.SCORE_LIGHTNING_KILL * state.comboMultiplier;
          state.knightsEaten++; advanceCombo(state);
          spawnParticles(state, k.x, k.y, 8, B.COLOR_LIGHTNING);
          spawnFloatingText(state, k.x, k.y, "ZAP!", B.COLOR_LIGHTNING, 1.2);
        }
      }
      for (const a of state.archerKnights) {
        if (!a.alive) continue;
        const dist = Math.abs(a.x - hx) + Math.abs(a.y - hy);
        if (dist <= range) {
          a.alive = false; kills++;
          state.score += B.SCORE_LIGHTNING_KILL * state.comboMultiplier;
          state.archersKilled++; advanceCombo(state);
          spawnParticles(state, a.x, a.y, 8, B.COLOR_LIGHTNING);
          spawnFloatingText(state, a.x, a.y, "ZAP!", B.COLOR_LIGHTNING, 1.2);
        }
      }
      if (state.boss && state.boss.alive) {
        const dist = Math.abs(state.boss.x - hx) + Math.abs(state.boss.y - hy);
        if (dist <= range) { hitBoss(state); kills++; }
      }
      spawnParticles(state, hx, hy, B.PARTICLE_COUNT_EAT + 8, B.COLOR_LIGHTNING);
      spawnFloatingText(state, hx, hy, kills > 0 ? `LIGHTNING! x${kills}` : "LIGHTNING!", B.COLOR_LIGHTNING, 1.5);
      state.screenFlashColor = B.COLOR_LIGHTNING; state.screenFlashTimer = B.FLASH_DURATION * 1.5;
      state.screenShake = B.SHAKE_DURATION * 0.5;
      if (kills > 0) triggerHitstop(state, B.HITSTOP_SYNERGY);
      return false;
    }
    case PickupKind.TIME_WARP:
      state.timeWarpTimer = B.TIME_WARP_DURATION;
      spawnParticles(state, hx, hy, B.PARTICLE_COUNT_EAT, B.COLOR_TIME_WARP);
      spawnFloatingText(state, hx, hy, "TIME WARP!", B.COLOR_TIME_WARP, 1.5);
      state.screenFlashColor = B.COLOR_TIME_WARP; state.screenFlashTimer = B.FLASH_DURATION * 1.5;
      return false;
  }
  return false;
}

// Combo
function advanceCombo(state: WyrmState): void {
  state.comboCount++;
  const comboWindow = B.COMBO_WINDOW + state.comboKeeperUpgrade * 0.5;
  state.comboTimer = comboWindow;
  state.comboDecayPause = B.COMBO_DECAY_PAUSE; // pause combo decay for 1 extra second
  state.comboMultiplier = Math.min(state.comboCount, B.COMBO_MULT_CAP);
  if (state.comboCount > state.bestCombo) state.bestCombo = state.comboCount;
  if (state.comboCount >= 3) spawnFloatingText(state, state.body[0].x, state.body[0].y - 1, `${state.comboCount}x COMBO!`, B.COLOR_COMBO, 1.0 + state.comboCount * 0.1);

  if (state.comboCount === B.COMBO_MULT_CAP && state.comboInvulnTimer <= 0) {
    state.comboInvulnTimer = B.COMBO_INVULN_DURATION;
    state.score += B.COMBO_INVULN_BONUS;
    spawnFloatingText(state, state.body[0].x, state.body[0].y - 2, `MAX COMBO! +${B.COMBO_INVULN_BONUS}`, B.COLOR_COMBO_INVULN, 2.0);
    state.screenFlashColor = B.COLOR_COMBO_INVULN; state.screenFlashTimer = B.FLASH_DURATION * 2;
    state.screenShake = B.SHAKE_DURATION * 0.5;
    triggerHitstop(state, B.HITSTOP_SYNERGY);
  }
}

export function updateCombo(state: WyrmState, dt: number): void {
  if (state.comboDecayPause > 0) {
    state.comboDecayPause -= dt;
    return; // pause combo decay
  }
  if (state.comboTimer > 0) { state.comboTimer -= dt; if (state.comboTimer <= 0) { state.comboCount = 0; state.comboMultiplier = 1; } }
}

// ---------------------------------------------------------------------------
// Fire breath — with synergy awareness
// ---------------------------------------------------------------------------

export function updateFireBreath(state: WyrmState, dt: number): void {
  if (state.fireBreathTimer <= 0) return;
  state.fireBreathTimer -= dt;
  const head = state.body[0], dx = DIR_DX[state.direction], dy = DIR_DY[state.direction];
  const range = state.activeSynergy === "blaze" ? B.FIRE_BREATH_RANGE * 2 : B.FIRE_BREATH_RANGE;

  for (let r = 1; r <= range; r++) {
    const fx = head.x + dx * r, fy = head.y + dy * r;
    const pi = state.pickups.findIndex(p => p.x === fx && p.y === fy);
    if (pi !== -1) {
      state.score += B.SCORE_FIRE_KILL;
      spawnParticles(state, fx, fy, B.PARTICLE_COUNT_FIRE, B.COLOR_WYRM_FIRE);
      // Inferno pull synergy: fire kills pull nearby pickups closer
      if (state.activeSynergy === "inferno_pull") {
        for (const pk of state.pickups) {
          const dist = Math.abs(pk.x - fx) + Math.abs(pk.y - fy);
          if (dist > 0 && dist <= 3) {
            // Move pickup 1 cell toward wyrm head
            if (pk.x < head.x) pk.x++;
            else if (pk.x > head.x) pk.x--;
            if (pk.y < head.y) pk.y++;
            else if (pk.y > head.y) pk.y--;
          }
        }
      }
      state.pickups.splice(pi, 1);
    }
    for (const k of state.knights) { if (k.alive && k.x === fx && k.y === fy) { k.alive = false; state.score += B.SCORE_FIRE_KILL * 2; state.knightsEaten++; spawnParticles(state, fx, fy, B.PARTICLE_COUNT_FIRE, B.COLOR_KNIGHT_ROAM); spawnFloatingText(state, fx, fy, "BURN!", B.COLOR_WYRM_FIRE, 1.2); } }
    // Burn archers
    for (const a of state.archerKnights) { if (a.alive && a.x === fx && a.y === fy) { a.alive = false; state.score += B.SCORE_ARCHER_KILL; state.archersKilled++; spawnParticles(state, fx, fy, B.PARTICLE_COUNT_FIRE, B.COLOR_ARCHER); spawnFloatingText(state, fx, fy, "BURN!", B.COLOR_WYRM_FIRE, 1.2); } }
    // Destroy projectiles in fire
    for (const p of state.projectiles) { if (p.alive && p.x === fx && p.y === fy) { p.alive = false; state.projectilesDeflected++; spawnParticles(state, fx, fy, 3, B.COLOR_PROJECTILE); } }
    if (state.boss && state.boss.alive && state.boss.x === fx && state.boss.y === fy) hitBoss(state);
    const wi = state.walls.findIndex(w => w.x === fx && w.y === fy && w.x > 0 && w.x < state.cols - 1 && w.y > 0 && w.y < state.rows - 1);
    if (wi !== -1) { spawnParticles(state, fx, fy, B.PARTICLE_COUNT_FIRE, B.COLOR_WALL); state.walls.splice(wi, 1); state.breakableWalls.delete(`${fx},${fy}`); }
    const pti = state.poisonTiles.findIndex(p => p.x === fx && p.y === fy);
    if (pti !== -1) { spawnParticles(state, fx, fy, B.PARTICLE_COUNT_FIRE, B.COLOR_POISON); state.poisonTiles.splice(pti, 1); }
  }
}

// ---------------------------------------------------------------------------
// Boss
// ---------------------------------------------------------------------------

function hitBoss(state: WyrmState): void {
  if (!state.boss || !state.boss.alive) return;
  state.boss.hp--; state.boss.flashTimer = B.BOSS_FLASH_DURATION;
  state.boss.charging = false;
  spawnParticles(state, state.boss.x, state.boss.y, B.PARTICLE_COUNT_BOSS_HIT, B.COLOR_BOSS);
  state.screenShake = B.SHAKE_DURATION * 0.3;
  triggerHitstop(state, B.HITSTOP_BOSS_HIT);
  addWrath(state, B.WRATH_GAIN_BOSS_HIT);

  // Summoner: spawns knights on each hit
  if (state.boss.bossType === "summoner" && state.boss.hp > 0) {
    for (let i = 0; i < B.BOSS_SUMMONER_SPAWN_COUNT; i++) {
      const pos = findFreeCellNear(state, state.boss.x, state.boss.y, 4);
      if (pos) {
        state.knights.push({ x: pos.x, y: pos.y, dir: Math.floor(Math.random() * 4) as Direction, moveTimer: 0.3, alive: true, chasing: true });
        spawnParticles(state, pos.x, pos.y, 4, B.COLOR_KNIGHT_CHASE);
        spawnFloatingText(state, pos.x, pos.y, "SUMMONED!", B.COLOR_KNIGHT_CHASE, 1.0);
      }
    }
  }

  if (state.boss.hp <= 0) {
    state.boss.alive = false; state.bossesKilled++;
    const pts = B.SCORE_BOSS_KILL * state.comboMultiplier;
    state.score += pts; advanceCombo(state);
    spawnParticles(state, state.boss.x, state.boss.y, B.PARTICLE_COUNT_BOSS_KILL, B.COLOR_BOSS);
    spawnFloatingText(state, state.boss.x, state.boss.y, `BOSS SLAIN! +${Math.floor(pts)}`, B.COLOR_BOSS, 2.0);
    state.screenShake = B.SHAKE_DURATION * 1.5; state.screenFlashColor = B.COLOR_BOSS; state.screenFlashTimer = B.FLASH_DURATION * 2;
    triggerHitstop(state, B.HITSTOP_BOSS_KILL);

    // Boss loot drops (with bossLoot upgrade bonus)
    const bx = state.boss.x, by = state.boss.y;
    const lootKinds = [PickupKind.SHEEP, PickupKind.TREASURE, PickupKind.POTION, PickupKind.FIRE_SCROLL, PickupKind.SHIELD, PickupKind.GOLDEN_SHEEP];
    const totalLoot = B.BOSS_LOOT_COUNT + state.bossLootUpgrade * 2;
    for (let i = 0; i < totalLoot; i++) {
      const kind = lootKinds[Math.floor(Math.random() * lootKinds.length)];
      const pos = findFreeCellNear(state, bx, by, 4);
      if (pos) {
        state.pickups.push({ x: pos.x, y: pos.y, kind, age: 0 });
        spawnParticles(state, pos.x, pos.y, 3, B.COLOR_TREASURE);
      }
    }
    state.boss = null;
  } else {
    spawnFloatingText(state, state.boss.x, state.boss.y, `${state.boss.hp}/${state.boss.maxHp}`, B.COLOR_BOSS, 1.0);
  }
}

export function updateBoss(state: WyrmState, dt: number): void {
  if (!state.boss || !state.boss.alive) return;
  const boss = state.boss;
  if (boss.flashTimer > 0) boss.flashTimer -= dt;

  // Time warp slows boss
  const timeWarpMult = state.timeWarpTimer > 0 ? B.TIME_WARP_SLOW : 1.0;

  // Berserker: gets faster as HP drops
  const berserkerSpeedMult = boss.bossType === "berserker"
    ? B.BOSS_BERSERKER_SPEED_MULT + (1 - B.BOSS_BERSERKER_SPEED_MULT) * (boss.hp / boss.maxHp)
    : 1.0;

  boss.chargeTimer -= dt * timeWarpMult;
  // Summoner doesn't charge, it just chases slowly
  if (boss.bossType !== "summoner" && boss.chargeTimer <= 0 && !boss.charging) {
    boss.charging = true;
    boss.chargeDir = dirToward(boss.x, boss.y, state.body[0].x, state.body[0].y);
    boss.chargeTimer = B.BOSS_CHARGE_INTERVAL * (boss.bossType === "berserker" ? berserkerSpeedMult : 1.0);
    spawnFloatingText(state, boss.x, boss.y, boss.bossType === "berserker" ? "RAGE!" : "CHARGE!", 0xff4444, 1.5);
  }

  boss.moveTimer -= dt * timeWarpMult;
  if (boss.moveTimer > 0) return;

  if (boss.charging) {
    boss.moveTimer = B.BOSS_MOVE_INTERVAL * 0.4 * berserkerSpeedMult;
    const cdx = DIR_DX[boss.chargeDir], cdy = DIR_DY[boss.chargeDir];
    const nx = boss.x + cdx, ny = boss.y + cdy;
    if (!isWall(state, nx, ny)) {
      boss.x = nx; boss.y = ny;
      spawnParticles(state, nx, ny, 2, B.COLOR_BOSS);
      if (state.body[0].x === nx && state.body[0].y === ny) {
        if (state.gracePeriod <= 0 && state.comboInvulnTimer <= 0) {
          if (state.shieldHits > 0) {
            shieldSave(state, state.body[0].x, state.body[0].y);
          } else {
            for (let i = 0; i < 2 && state.body.length > 2; i++) {
              const removed = state.body.pop()!;
              spawnParticles(state, removed.x, removed.y, 3, B.COLOR_WYRM_BODY);
            }
            state.length = state.body.length;
            spawnFloatingText(state, nx, ny, "HIT!", 0xff2222, 1.5);
            state.screenShake = B.SHAKE_DURATION;
            state.screenFlashColor = 0xff2222; state.screenFlashTimer = B.FLASH_DURATION;
          }
        }
      }
    } else {
      boss.charging = false;
      state.screenShake = B.SHAKE_DURATION * 0.3;
    }
    const chargeDist = Math.abs(boss.x - state.body[0].x) + Math.abs(boss.y - state.body[0].y);
    if (chargeDist > B.BOSS_CHARGE_DISTANCE + 2) boss.charging = false;
    return;
  }

  boss.moveTimer = B.BOSS_MOVE_INTERVAL * berserkerSpeedMult * (boss.bossType === "summoner" ? B.BOSS_SUMMONER_MOVE_MULT : 1.0);
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

// ---------------------------------------------------------------------------
// Archer knights & projectiles
// ---------------------------------------------------------------------------

export function updateArchers(state: WyrmState, dt: number): void {
  if (state.wave < B.ARCHER_START_WAVE) return;

  // Spawn archers
  state.archerSpawnTimer -= dt;
  const maxArchers = Math.min(B.MAX_ARCHERS, 1 + Math.floor((state.wave - B.ARCHER_START_WAVE) / 3));
  const aliveArchers = state.archerKnights.filter(a => a.alive).length;
  if (state.archerSpawnTimer <= 0 && aliveArchers < maxArchers) {
    state.archerSpawnTimer = B.KNIGHT_SPAWN_INTERVAL * 1.5;
    // Spawn at wall edge
    const pos = findWallAdjacentCell(state);
    if (pos) {
      const dir = dirToward(pos.x, pos.y, state.body[0].x, state.body[0].y);
      state.archerKnights.push({ x: pos.x, y: pos.y, dir, fireTimer: B.ARCHER_FIRE_INTERVAL, alive: true, warnTimer: 0 });
      spawnFloatingText(state, pos.x, pos.y, "ARCHER!", B.COLOR_ARCHER, 1.2);
    }
  }

  const head = state.body[0];
  for (const a of state.archerKnights) {
    if (!a.alive) continue;
    // Face toward wyrm
    a.dir = dirToward(a.x, a.y, head.x, head.y);

    a.fireTimer -= dt;
    if (a.warnTimer > 0) {
      a.warnTimer -= dt;
      if (a.warnTimer <= 0) {
        // Fire!
        state.projectiles.push({ x: a.x + DIR_DX[a.dir], y: a.y + DIR_DY[a.dir], dir: a.dir, moveTimer: 0, alive: true });
        a.fireTimer = B.ARCHER_FIRE_INTERVAL;
      }
    } else if (a.fireTimer <= 0) {
      // Check if aligned with wyrm (same row or column)
      const aligned = (a.dir === Direction.UP || a.dir === Direction.DOWN) ? a.x === head.x :
                       a.y === head.y;
      if (aligned) {
        a.warnTimer = B.ARCHER_WARN_DURATION; // start telegraph
      } else {
        a.fireTimer = 0.5; // retry soon
      }
    }
  }
  state.archerKnights = state.archerKnights.filter(a => a.alive);
}

export function updateProjectiles(state: WyrmState, dt: number): void {
  for (const p of state.projectiles) {
    if (!p.alive) continue;
    p.moveTimer += dt;
    if (p.moveTimer < B.PROJECTILE_SPEED) continue;
    p.moveTimer -= B.PROJECTILE_SPEED;
    const nx = p.x + DIR_DX[p.dir], ny = p.y + DIR_DY[p.dir];
    if (isWall(state, nx, ny)) { p.alive = false; spawnParticles(state, p.x, p.y, 3, B.COLOR_PROJECTILE); continue; }
    p.x = nx; p.y = ny;

    // Hit wyrm body (not head — head is checked in movement)
    for (let i = 1; i < state.body.length; i++) {
      if (state.body[i].x === nx && state.body[i].y === ny) {
        p.alive = false;
        if (state.body.length > 2) {
          state.body.pop();
          state.length = state.body.length;
          spawnParticles(state, nx, ny, 4, B.COLOR_PROJECTILE);
          spawnFloatingText(state, nx, ny, "ARROW!", 0xff4444, 1.0);
        }
        break;
      }
    }
  }
  state.projectiles = state.projectiles.filter(p => p.alive);
}

// ---------------------------------------------------------------------------
// Synergies
// ---------------------------------------------------------------------------

export function updateSynergies(state: WyrmState): void {
  const buf = B.SYNERGY_DURATION_BUFFER;
  let newSynergy: SynergyKind = null;

  if (state.fireBreathTimer > buf && state.speedBoostTimer > buf) {
    newSynergy = "blaze";
  } else if (state.shieldHits > 0 && state.magnetBoostTimer > buf) {
    newSynergy = "fortress";
  } else if (state.fireBreathTimer > buf && state.magnetBoostTimer > buf) {
    newSynergy = "inferno_pull";
  } else if (state.speedBoostTimer > buf && state.shieldHits > 0) {
    newSynergy = "juggernaut";
  }

  if (newSynergy !== state.activeSynergy) {
    state.activeSynergy = newSynergy;
    if (newSynergy) {
      state.synergyAnnouncedThisFrame = true;
      const names: Record<string, string> = { blaze: "BLAZE MODE!", juggernaut: "JUGGERNAUT!", inferno_pull: "INFERNO PULL!", fortress: "FORTRESS!" };
      const colors: Record<string, number> = { blaze: B.COLOR_SYNERGY_BLAZE, juggernaut: B.COLOR_SYNERGY_JUGGERNAUT, inferno_pull: B.COLOR_SYNERGY_INFERNO, fortress: B.COLOR_SYNERGY_FORTRESS };
      spawnFloatingText(state, state.body[0].x, state.body[0].y - 2, names[newSynergy] || "SYNERGY!", colors[newSynergy] || 0xffffff, 2.0);
      state.screenShake = B.SHAKE_DURATION * 0.5;
      triggerHitstop(state, B.HITSTOP_SYNERGY);
    }
  }

  // Fortress synergy: triple magnet radius
  if (state.activeSynergy === "fortress") {
    state.magnetRadius = Math.max(state.magnetRadius, state.baseMagnetRadius * 3);
  }
}

// ---------------------------------------------------------------------------
// Knights — with fire avoidance
// ---------------------------------------------------------------------------

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

  const fireCells = new Set<string>();
  if (state.fireBreathTimer > 0) {
    const head = state.body[0];
    const fdx = DIR_DX[state.direction], fdy = DIR_DY[state.direction];
    const range = state.activeSynergy === "blaze" ? B.FIRE_BREATH_RANGE * 2 : B.FIRE_BREATH_RANGE;
    for (let r = 1; r <= range + 1; r++) fireCells.add(`${head.x + fdx * r},${head.y + fdy * r}`);
  }

  const head = state.body[0];
  // Frostbite blessing: enemies near wyrm tail slow down 30%
  const tail = state.body[state.body.length - 1];
  const hasFrostbite = state.blessings.includes("frostbite");

  for (const k of state.knights) {
    if (!k.alive) continue;
    // Time warp slow
    const twMult = state.timeWarpTimer > 0 ? B.TIME_WARP_SLOW : 1.0;
    k.moveTimer -= dt * twMult;
    if (k.moveTimer > 0) continue;
    const predatorSpeed = state.blessings.includes("predator_instinct") ? 0.8 : 1.0;
    // Frostbite slow for enemies near tail
    const frostSlow = hasFrostbite && (Math.abs(k.x - tail.x) + Math.abs(k.y - tail.y) <= B.FROSTBITE_RANGE) ? (1 + B.FROSTBITE_SLOW) : 1.0;
    k.moveTimer = (k.chasing ? mi * 0.7 : mi) * predatorSpeed * frostSlow;

    let dirs: Direction[];
    if (k.chasing) {
      dirs = [dirToward(k.x, k.y, head.x, head.y), ...shuffleOthers(dirToward(k.x, k.y, head.x, head.y))];
    } else {
      dirs = shuffleDirs(k.dir);
    }

    if (fireCells.size > 0) {
      const safeDirs = dirs.filter(d => !fireCells.has(`${k.x + DIR_DX[d]},${k.y + DIR_DY[d]}`));
      if (safeDirs.length > 0) dirs = safeDirs;
    }

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

export function updatePickupMagnet(_state: WyrmState, _dt: number): void {
  // Visual-only drift handled in renderer
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

// Lava tiles
export function updateLavaTiles(state: WyrmState, dt: number): void {
  for (let i = state.lavaTiles.length - 1; i >= 0; i--) { state.lavaTiles[i].life -= dt; if (state.lavaTiles[i].life <= 0) state.lavaTiles.splice(i, 1); }
}

// ---------------------------------------------------------------------------
// Waves — with events and breakable walls
// ---------------------------------------------------------------------------

export function updateWaves(state: WyrmState, dt: number): void {
  state.waveTimer -= dt;
  if (state.waveTimer > 0) return;
  state.wave++; state.waveTimer = B.WAVE_INTERVAL;

  // Wave events every N waves
  const isEventWave = state.wave > 1 && state.wave % B.WAVE_EVENT_INTERVAL === 0;
  if (isEventWave) {
    triggerWaveEvent(state);
  }

  // Boss — scaling HP
  if (state.wave % B.BOSS_WAVE_INTERVAL === 0 && (!state.boss || !state.boss.alive)) {
    const bossTier = Math.floor(state.wave / B.BOSS_WAVE_INTERVAL);
    // Choose boss type based on tier
    const bossTypes: BossType[] = ["charger", "summoner", "berserker"];
    const bossType = bossTypes[(bossTier - 1) % bossTypes.length];
    let bossHp: number;
    if (bossType === "summoner") bossHp = B.BOSS_SUMMONER_HP + Math.floor((bossTier - 1) / 3) * B.BOSS_HP_PER_TIER;
    else if (bossType === "berserker") bossHp = B.BOSS_BERSERKER_HP + Math.floor((bossTier - 1) / 3) * B.BOSS_HP_PER_TIER;
    else bossHp = B.BOSS_HP + (bossTier - 1) * B.BOSS_HP_PER_TIER;
    const pos = findFreeCell(state);
    if (pos) {
      state.boss = {
        x: pos.x, y: pos.y, dir: Direction.DOWN,
        moveTimer: B.BOSS_MOVE_INTERVAL * (bossType === "summoner" ? B.BOSS_SUMMONER_MOVE_MULT : 1),
        hp: bossHp, maxHp: bossHp, alive: true, flashTimer: 0,
        chargeTimer: B.BOSS_CHARGE_INTERVAL, charging: false, chargeDir: Direction.DOWN,
        bossType,
      };
      const typeLabel = bossType === "summoner" ? "SUMMONER" : bossType === "berserker" ? "BERSERKER" : "BOSS";
      const tierName = bossTier <= 1 ? `${typeLabel}!` : `${typeLabel} ${bossTier <= 3 ? ["I","II","III"][bossTier-1] : bossTier}!`;
      spawnFloatingText(state, pos.x, pos.y, tierName, B.COLOR_BOSS, 2.0);
      state.screenShake = B.SHAKE_DURATION; state.screenFlashColor = B.COLOR_BOSS; state.screenFlashTimer = B.FLASH_DURATION * 2;
    }
  }

  // Walls — varied patterns (skip if event wave handled walls already)
  if (!isEventWave) {
    const pCount = 2 * state.cols + 2 * (state.rows - 2);
    if (state.walls.length < B.MAX_WALLS + pCount) {
      const placed: Cell[] = [];
      const pat = state.wave % 7;
      switch (pat) {
        case 0: for (let i = 0; i < B.WALLS_PER_WAVE; i++) { const p = findFreeCell(state); if (p) placed.push(p); } break;
        case 1: { const p = findFreeCell(state); if (p) for (let d = -2; d <= 2; d++) { const wx = p.x + d; if (wx > 0 && wx < state.cols - 1 && !isWall(state, wx, p.y)) placed.push({ x: wx, y: p.y }); } break; }
        case 2: { const p = findFreeCell(state); if (p) for (let d = -2; d <= 2; d++) { const wy = p.y + d; if (wy > 0 && wy < state.rows - 1 && !isWall(state, p.x, wy)) placed.push({ x: p.x, y: wy }); } break; }
        case 3: { const p = findFreeCell(state); if (p) for (const [dx, dy] of [[0,0],[1,0],[2,0],[0,1],[0,2]]) { const wx = p.x+dx, wy = p.y+dy; if (wx > 0 && wx < state.cols-1 && wy > 0 && wy < state.rows-1 && !isWall(state,wx,wy)) placed.push({x:wx,y:wy}); } break; }
        case 4: { const p = findFreeCell(state); if (p) for (let d = -2; d <= 2; d++) { const wx = p.x + d, wy = p.y + d; if (wx > 0 && wx < state.cols-1 && wy > 0 && wy < state.rows-1 && !isWall(state,wx,wy)) placed.push({x:wx,y:wy}); } break; }
        case 5: { const p = findFreeCell(state); if (p) { for (const [dx, dy] of [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]]) { const wx = p.x+dx, wy = p.y+dy; if (wx > 0 && wx < state.cols-1 && wy > 0 && wy < state.rows-1 && !isWall(state,wx,wy)) placed.push({x:wx,y:wy}); } } break; }
        case 6: { const p = findFreeCell(state); if (p) { for (const [dx, dy] of [[0,0],[1,0],[-1,0],[0,1],[0,-1]]) { const wx = p.x+dx, wy = p.y+dy; if (wx > 0 && wx < state.cols-1 && wy > 0 && wy < state.rows-1 && !isWall(state,wx,wy)) placed.push({x:wx,y:wy}); } } break; }
      }
      for (const p of placed) {
        state.walls.push(p);
        // Some walls are breakable
        if (Math.random() < B.BREAKABLE_WALL_CHANCE) {
          state.breakableWalls.add(`${p.x},${p.y}`);
        }
        spawnParticles(state, p.x, p.y, 3, B.COLOR_WALL);
      }
    }
  }

  // Poison tiles from wave 4+
  if (state.wave >= B.POISON_START_WAVE) {
    for (let i = 0; i < B.POISON_PER_WAVE; i++) {
      const pos = findFreeCell(state);
      if (pos) state.poisonTiles.push({ x: pos.x, y: pos.y, life: B.POISON_LIFETIME });
    }
  }

  // Lava tiles from wave 6+
  if (state.wave >= B.LAVA_START_WAVE) {
    const lavaCount = B.LAVA_PER_WAVE_MIN + Math.floor(Math.random() * (B.LAVA_PER_WAVE_MAX - B.LAVA_PER_WAVE_MIN + 1));
    for (let i = 0; i < lavaCount; i++) {
      const pos = findFreeCell(state);
      if (pos) {
        state.lavaTiles.push({ x: pos.x, y: pos.y, life: B.LAVA_LIFETIME });
        spawnParticles(state, pos.x, pos.y, 3, B.COLOR_LAVA);
      }
    }
  }

  spawnFloatingText(state, state.body[0].x, state.body[0].y - 2, `WAVE ${state.wave}`, 0xff8844, 1.5);
  state.screenShake = B.SHAKE_DURATION * 0.5;
}

// ---------------------------------------------------------------------------
// Wave events
// ---------------------------------------------------------------------------

function triggerWaveEvent(state: WyrmState): void {
  const events = ["stampede", "knight_rally", "treasure_vault", "poison_fog", "dragons_hoard"];
  const event = events[Math.floor(Math.random() * events.length)];
  state.lastWaveEvent = event;

  switch (event) {
    case "stampede": {
      // 8-12 sheep spawn in a cluster
      const center = findFreeCell(state);
      if (center) {
        const count = 8 + Math.floor(Math.random() * 5);
        for (let i = 0; i < count; i++) {
          const pos = findFreeCellNear(state, center.x, center.y, 4);
          if (pos) state.pickups.push({ x: pos.x, y: pos.y, kind: PickupKind.SHEEP, age: 0 });
        }
      }
      spawnFloatingText(state, state.body[0].x, state.body[0].y - 3, "STAMPEDE!", 0xf5f5dc, 2.0);
      state.screenFlashColor = 0xf5f5dc; state.screenFlashTimer = B.FLASH_DURATION * 2;
      break;
    }
    case "knight_rally": {
      // All knights become chasers, spawn 3 extra
      for (const k of state.knights) if (k.alive) k.chasing = true;
      for (let i = 0; i < 3; i++) {
        const pos = findFreeCell(state);
        if (pos) state.knights.push({ x: pos.x, y: pos.y, dir: Math.floor(Math.random() * 4) as Direction, moveTimer: 0.3, alive: true, chasing: true });
      }
      spawnFloatingText(state, state.body[0].x, state.body[0].y - 3, "KNIGHT RALLY!", B.COLOR_KNIGHT_CHASE, 2.0);
      state.screenFlashColor = B.COLOR_KNIGHT_CHASE; state.screenFlashTimer = B.FLASH_DURATION * 2;
      break;
    }
    case "treasure_vault": {
      // 4-5 treasure surrounded by breakable walls
      const center = findFreeCell(state);
      if (center) {
        // Place breakable walls around
        const wallOffs = [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
        for (const [dx, dy] of wallOffs) {
          const wx = center.x + dx, wy = center.y + dy;
          if (wx > 0 && wx < state.cols-1 && wy > 0 && wy < state.rows-1 && !isWall(state, wx, wy)) {
            state.walls.push({ x: wx, y: wy });
            state.breakableWalls.add(`${wx},${wy}`);
          }
        }
        // Place treasure inside
        for (let i = 0; i < 4; i++) {
          const pos = findFreeCellNear(state, center.x, center.y, 1);
          if (pos) state.pickups.push({ x: pos.x, y: pos.y, kind: PickupKind.TREASURE, age: 0 });
        }
      }
      spawnFloatingText(state, state.body[0].x, state.body[0].y - 3, "TREASURE VAULT!", B.COLOR_TREASURE, 2.0);
      state.screenFlashColor = B.COLOR_TREASURE; state.screenFlashTimer = B.FLASH_DURATION * 2;
      break;
    }
    case "poison_fog": {
      // Double poison + 2 potions
      for (let i = 0; i < B.POISON_PER_WAVE * 2; i++) {
        const pos = findFreeCell(state);
        if (pos) state.poisonTiles.push({ x: pos.x, y: pos.y, life: B.POISON_LIFETIME });
      }
      for (let i = 0; i < 2; i++) {
        const pos = findFreeCell(state);
        if (pos) state.pickups.push({ x: pos.x, y: pos.y, kind: PickupKind.POTION, age: 0 });
      }
      spawnFloatingText(state, state.body[0].x, state.body[0].y - 3, "POISON FOG!", B.COLOR_POISON, 2.0);
      state.screenFlashColor = B.COLOR_POISON; state.screenFlashTimer = B.FLASH_DURATION * 2;
      break;
    }
    case "dragons_hoard": {
      // 1 golden sheep + 3 treasure, but also extra walls
      const pos1 = findFreeCell(state);
      if (pos1) state.pickups.push({ x: pos1.x, y: pos1.y, kind: PickupKind.GOLDEN_SHEEP, age: 0 });
      for (let i = 0; i < 3; i++) {
        const pos = findFreeCell(state);
        if (pos) state.pickups.push({ x: pos.x, y: pos.y, kind: PickupKind.TREASURE, age: 0 });
      }
      // Extra walls
      for (let i = 0; i < B.WALLS_PER_WAVE + 3; i++) {
        const pos = findFreeCell(state);
        if (pos) {
          state.walls.push(pos);
          if (Math.random() < 0.5) state.breakableWalls.add(`${pos.x},${pos.y}`);
          spawnParticles(state, pos.x, pos.y, 2, B.COLOR_WALL);
        }
      }
      spawnFloatingText(state, state.body[0].x, state.body[0].y - 3, "DRAGON'S HOARD!", B.COLOR_GOLDEN_SHEEP, 2.0);
      state.screenFlashColor = B.COLOR_GOLDEN_SHEEP; state.screenFlashTimer = B.FLASH_DURATION * 2;
      break;
    }
  }
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

export function checkEvolution(state: WyrmState): string | null {
  const tier = getWyrmTierIndex(state.length);
  if (tier > state.lastColorTier) {
    state.lastColorTier = tier;
    return WYRM_COLOR_TIERS[tier].colors.name;
  }
  return null;
}

export function calcDragonCoins(score: number): number {
  return Math.floor(score / 100) * B.COINS_PER_100_SCORE;
}

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
  if (state.gracePeriod > 0) state.gracePeriod -= dt;
  if (state.comboInvulnTimer > 0) state.comboInvulnTimer -= dt;
  if (state.hitstopTimer > 0) state.hitstopTimer -= dt;
  if (state.tailWhipCooldown > 0) state.tailWhipCooldown -= dt;
  if (state.tailWhipFlash > 0) state.tailWhipFlash -= dt;
  if (state.magnetBoostTimer > 0) {
    state.magnetBoostTimer -= dt;
    if (state.magnetBoostTimer <= 0) state.magnetRadius = state.baseMagnetRadius;
  }
  if (state.timeWarpTimer > 0) state.timeWarpTimer -= dt;

  // Apply golden_touch blessing: +25% score already earned gets bonus (via multiplier on SCORE_PER_SECOND)
  if (state.blessings.includes("golden_touch")) {
    state.score += B.SCORE_PER_SECOND * dt * 0.25; // extra 25%
  }

  // Regeneration blessing: regain 1 segment every 30 seconds
  if (state.blessings.includes("regeneration")) {
    state.regenTimer += dt;
    if (state.regenTimer >= B.REGEN_INTERVAL) {
      state.regenTimer -= B.REGEN_INTERVAL;
      state.body.push({ ...state.body[state.body.length - 1] });
      state.length = state.body.length;
      spawnFloatingText(state, state.body[state.body.length - 1].x, state.body[state.body.length - 1].y, "REGEN!", B.COLOR_REGEN, 1.0);
      spawnParticles(state, state.body[state.body.length - 1].x, state.body[state.body.length - 1].y, 4, B.COLOR_REGEN);
    }
  }
}

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

// ---------------------------------------------------------------------------
// Free cell helpers
// ---------------------------------------------------------------------------

function findFreeCell(state: WyrmState): Cell | null {
  const occ = new Set<string>();
  for (const c of state.body) occ.add(`${c.x},${c.y}`);
  for (const w of state.walls) occ.add(`${w.x},${w.y}`);
  for (const p of state.pickups) occ.add(`${p.x},${p.y}`);
  for (const k of state.knights) if (k.alive) occ.add(`${k.x},${k.y}`);
  for (const a of state.archerKnights) if (a.alive) occ.add(`${a.x},${a.y}`);
  if (state.boss && state.boss.alive) occ.add(`${state.boss.x},${state.boss.y}`);
  for (const p of state.poisonTiles) occ.add(`${p.x},${p.y}`);
  for (const l of state.lavaTiles) occ.add(`${l.x},${l.y}`);
  const head = state.body[0];
  for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) occ.add(`${head.x + dx},${head.y + dy}`);
  for (let a = 0; a < 100; a++) { const x = 1 + Math.floor(Math.random() * (state.cols - 2)), y = 1 + Math.floor(Math.random() * (state.rows - 2)); if (!occ.has(`${x},${y}`)) return { x, y }; }
  return null;
}

function findFreeCellNear(state: WyrmState, cx: number, cy: number, radius: number): Cell | null {
  const occ = new Set<string>();
  for (const c of state.body) occ.add(`${c.x},${c.y}`);
  for (const w of state.walls) occ.add(`${w.x},${w.y}`);
  for (const p of state.pickups) occ.add(`${p.x},${p.y}`);
  for (const k of state.knights) if (k.alive) occ.add(`${k.x},${k.y}`);
  for (const p of state.poisonTiles) occ.add(`${p.x},${p.y}`);
  for (const l of state.lavaTiles) occ.add(`${l.x},${l.y}`);
  for (let a = 0; a < 50; a++) {
    const x = cx + Math.floor((Math.random() - 0.5) * radius * 2);
    const y = cy + Math.floor((Math.random() - 0.5) * radius * 2);
    if (x > 0 && x < state.cols - 1 && y > 0 && y < state.rows - 1 && !occ.has(`${x},${y}`)) return { x, y };
  }
  return findFreeCell(state);
}

/** Find a free cell adjacent to a wall (for archer spawning) */
function findWallAdjacentCell(state: WyrmState): Cell | null {
  const occ = new Set<string>();
  for (const c of state.body) occ.add(`${c.x},${c.y}`);
  for (const p of state.pickups) occ.add(`${p.x},${p.y}`);
  for (const k of state.knights) if (k.alive) occ.add(`${k.x},${k.y}`);
  for (const a of state.archerKnights) if (a.alive) occ.add(`${a.x},${a.y}`);

  // Try to place near a border wall but inside the playfield
  for (let a = 0; a < 50; a++) {
    const side = Math.floor(Math.random() * 4);
    let x: number, y: number;
    if (side === 0) { x = 1; y = 1 + Math.floor(Math.random() * (state.rows - 2)); }
    else if (side === 1) { x = state.cols - 2; y = 1 + Math.floor(Math.random() * (state.rows - 2)); }
    else if (side === 2) { x = 1 + Math.floor(Math.random() * (state.cols - 2)); y = 1; }
    else { x = 1 + Math.floor(Math.random() * (state.cols - 2)); y = state.rows - 2; }
    if (!occ.has(`${x},${y}`) && !isWall(state, x, y)) return { x, y };
  }
  return findFreeCell(state);
}

// ---------------------------------------------------------------------------
// Wrath meter — fills on combat actions, activates wrath mode when full
// ---------------------------------------------------------------------------

function addWrath(state: WyrmState, amount: number): void {
  if (state.wrathTimer > 0) return; // already in wrath mode
  const blessingMult = state.blessings.includes("wrath_born") ? 1.5 : 1.0;
  const upgradeMult = 1 + state.wrathBoostUpgrade * 0.15; // +15% per upgrade level
  const mult = blessingMult * upgradeMult;
  state.wrathMeter = Math.min(B.WRATH_MAX, state.wrathMeter + amount * mult);
  if (state.wrathMeter >= B.WRATH_MAX) {
    state.wrathMeter = 0;
    state.wrathTimer = B.WRATH_DURATION;
    state.wrathAnnouncedThisFrame = true;
    if (state.fireBreathTimer <= 0) {
      state.fireBreathTimer = B.WRATH_DURATION;
    }
    spawnFloatingText(state, state.body[0].x, state.body[0].y - 2, "WRATH MODE!", B.COLOR_WRATH, 2.5);
    state.screenShake = B.SHAKE_DURATION;
    state.screenFlashColor = B.COLOR_WRATH; state.screenFlashTimer = B.FLASH_DURATION * 2;
    triggerHitstop(state, B.HITSTOP_SYNERGY);
  }
}

export function updateWrath(state: WyrmState, dt: number): void {
  if (state.wrathTimer <= 0 && state.wrathMeter > 0) {
    state.wrathMeter = Math.max(0, state.wrathMeter - B.WRATH_DRAIN_PER_SEC * dt);
  }
  if (state.wrathTimer > 0) {
    state.wrathTimer -= dt;
    state.score += B.SCORE_PER_SECOND * dt; // doubled score
    if (state.lungeCooldown > 0) state.lungeCooldown -= dt * 0.5; // faster lunge recharge
  }
}

// ---------------------------------------------------------------------------
// Tail whip — damages enemies adjacent to tail segments
// ---------------------------------------------------------------------------

export function tryTailWhip(state: WyrmState): boolean {
  if (state.tailWhipCooldown > 0) return false;
  if (state.body.length < 4) return false;

  const cd = state.blessings.includes("swift_tail") ? B.TAIL_WHIP_COOLDOWN / 2 : B.TAIL_WHIP_COOLDOWN;
  state.tailWhipCooldown = cd;
  state.tailWhipFlash = B.TAIL_WHIP_FLASH;

  const range = Math.min(B.TAIL_WHIP_RANGE, state.body.length - 1);
  let kills = 0;

  for (let i = state.body.length - range; i < state.body.length; i++) {
    const seg = state.body[i];
    for (const [adx, ady] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]) {
      const tx = seg.x + adx, ty = seg.y + ady;
      const ki = state.knights.findIndex(k => k.alive && k.x === tx && k.y === ty);
      if (ki !== -1) {
        state.knights[ki].alive = false;
        const pts = B.SCORE_TAIL_WHIP_KILL * state.comboMultiplier;
        state.score += pts; state.knightsEaten++; advanceCombo(state);
        spawnParticles(state, tx, ty, 6, B.COLOR_TAIL_WHIP);
        spawnFloatingText(state, tx, ty, `WHIP! +${Math.floor(pts)}`, B.COLOR_TAIL_WHIP, 1.2);
        addWrath(state, B.WRATH_GAIN_KNIGHT);
        kills++;
      }
      const ai = state.archerKnights.findIndex(a => a.alive && a.x === tx && a.y === ty);
      if (ai !== -1) {
        state.archerKnights[ai].alive = false;
        const pts = B.SCORE_ARCHER_KILL * state.comboMultiplier;
        state.score += pts; state.archersKilled++; advanceCombo(state);
        spawnParticles(state, tx, ty, 6, B.COLOR_TAIL_WHIP);
        spawnFloatingText(state, tx, ty, `WHIP! +${Math.floor(pts)}`, B.COLOR_TAIL_WHIP, 1.2);
        addWrath(state, B.WRATH_GAIN_ARCHER);
        kills++;
      }
      const pi = state.projectiles.findIndex(p => p.alive && p.x === tx && p.y === ty);
      if (pi !== -1) {
        state.projectiles[pi].alive = false; state.projectilesDeflected++;
        spawnParticles(state, tx, ty, 4, B.COLOR_PROJECTILE);
        addWrath(state, B.WRATH_GAIN_DEFLECT);
        kills++;
      }
      if (state.boss && state.boss.alive && state.boss.x === tx && state.boss.y === ty) {
        hitBoss(state); kills++;
      }
    }
  }

  for (let i = state.body.length - range; i < state.body.length; i++) {
    spawnParticles(state, state.body[i].x, state.body[i].y, 2, B.COLOR_TAIL_WHIP);
  }

  if (kills > 0) {
    state.screenShake = B.SHAKE_DURATION * 0.4;
    triggerHitstop(state, B.HITSTOP_EAT_KNIGHT);
  }
  return true;
}

// ---------------------------------------------------------------------------
// Blessings — presented at evolution tiers
// ---------------------------------------------------------------------------

const ALL_BLESSINGS: Blessing[] = [
  { id: "serpent_appetite", name: "Serpent's Appetite", desc: "Sheep grant +1 extra length", color: 0xf5f5dc },
  { id: "firestarter", name: "Firestarter", desc: "Fire range +1, fire scrolls appear more", color: 0xff6600 },
  { id: "iron_scales", name: "Iron Scales", desc: "Arrows deal no damage", color: 0xcccccc },
  { id: "combo_frenzy", name: "Combo Frenzy", desc: "Combo window +1.5s, cap to 12x", color: 0xff44ff },
  { id: "predator_instinct", name: "Predator's Instinct", desc: "Knight score 2x but they're faster", color: 0xcc4444 },
  { id: "magnet_soul", name: "Magnet Soul", desc: "Permanent +2 magnet radius", color: 0xff66aa },
  { id: "thick_hide", name: "Thick Hide", desc: "Poison deals no damage", color: 0x44aa44 },
  { id: "wrath_born", name: "Wrath Born", desc: "Wrath fills 50% faster", color: 0xff3300 },
  { id: "golden_touch", name: "Golden Touch", desc: "All score gains +25%", color: 0xffd700 },
  { id: "swift_tail", name: "Swift Tail", desc: "Tail whip cooldown halved", color: 0xddaa44 },
  { id: "dragon_heart", name: "Dragon Heart", desc: "+1 shield hit permanently", color: 0x44aaff },
  { id: "berserker", name: "Berserker", desc: "Lunge distance +1, cooldown -1s", color: 0xffaa00 },
  { id: "frostbite", name: "Frostbite", desc: "Enemies near wyrm tail slow 30%", color: 0x66ccff },
  { id: "regeneration", name: "Regeneration", desc: "Regain 1 segment every 30 seconds", color: 0x44ff88 },
];

export function generateBlessingChoices(state: WyrmState): Blessing[] {
  const available = ALL_BLESSINGS.filter(b => !state.blessings.includes(b.id));
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }
  return available.slice(0, Math.min(3, available.length));
}

export function applyBlessing(state: WyrmState, blessingId: string): void {
  state.blessings.push(blessingId);
  switch (blessingId) {
    case "magnet_soul":
      state.baseMagnetRadius += 2;
      if (state.magnetBoostTimer <= 0) state.magnetRadius = state.baseMagnetRadius;
      break;
    case "dragon_heart":
      state.shieldHits = Math.max(state.shieldHits, 1);
      break;
    case "thick_hide":
      state.poisonResistUpgrade = 99;
      break;
    case "combo_frenzy":
      state.comboKeeperUpgrade += 3; // +1.5s window
      break;
  }
}

export function prepareBlessingChoice(state: WyrmState): void {
  state.blessingChoices = generateBlessingChoices(state);
  if (state.blessingChoices.length > 0) {
    state.phase = WyrmPhase.BLESSING;
  }
}

export function selectBlessing(state: WyrmState, index: number): void {
  if (index < 0 || index >= state.blessingChoices.length) return;
  const chosen = state.blessingChoices[index];
  applyBlessing(state, chosen.id);
  spawnFloatingText(state, state.body[0].x, state.body[0].y - 2, chosen.name + "!", chosen.color, 2.0);
  state.blessingChoices = [];
  state.phase = WyrmPhase.PLAYING;
  state.screenFlashColor = B.COLOR_BLESSING; state.screenFlashTimer = B.FLASH_DURATION * 2;
}
