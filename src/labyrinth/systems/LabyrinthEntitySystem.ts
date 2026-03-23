// ---------------------------------------------------------------------------
// The Shifting Labyrinth – Entity Update System
// ---------------------------------------------------------------------------
// Player, multi-minotaur AI, traps, torch, pickups, decoys, particles.
// Fixed: proper wall collision, no maze corruption on shift.
// ---------------------------------------------------------------------------

import type { LabyrinthState, Minotaur, Particle, Decoy } from "../types";
import { LabyrinthPhase, CellType, PickupKind, TrapType, FloorModifier, MinotaurVariant, MoveMode } from "../types";
import { LABYRINTH_BALANCE as B } from "../config/LabyrinthBalance";
import { findPath, shiftWalls } from "./LabyrinthMazeSystem";

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

export interface LabyrinthInput {
  dx: number;
  dy: number;
  pause: boolean;
  throwDecoy: boolean;
  throwStone: boolean;
  sprint: boolean;
  sneak: boolean;
}

// ---------------------------------------------------------------------------
// Main update
// ---------------------------------------------------------------------------

export function updateEntities(state: LabyrinthState, dt: number, input: LabyrinthInput): void {
  if (state.phase !== LabyrinthPhase.PLAYING) return;

  state.time += dt;
  state.events = {};

  // Screen flash decay
  if (state.screenFlash > 0) state.screenFlash = Math.max(0, state.screenFlash - dt);

  // ── Shift timer (Mist modifier: 2x faster) ──
  state.shiftTimer -= dt * (state.modifier === FloorModifier.MIST ? 2 : 1);
  state.shiftWarning = state.shiftTimer <= B.SHIFT_WARNING_TIME;

  if (state.shiftTimer <= 0) {
    shiftWalls(state);
    const interval = Math.max(
      B.SHIFT_MIN_INTERVAL,
      B.SHIFT_INTERVAL - (state.floor - 1) * B.SHIFT_INTERVAL_DECAY,
    );
    state.shiftTimer = interval;
    state.shiftWarning = false;
    state.shiftAnimTimer = B.SHIFT_ANIM_DURATION;
    for (const m of state.minotaurs) {
      m.stunTimer = B.MINOTAUR_STUN_ON_SHIFT;
      m.path = [];
    }
    state.events["wallShift"] = 1;
    _triggerShake(state, B.SHAKE_WALL_SHIFT, 0.5);
    // Clear stale arrow projectiles from old layout
    state.particles = state.particles.filter(p => p.type !== "debris");
    _spawnDebrisParticles(state, 20);
    _moveEntitiesOutOfWalls(state); // move, don't carve
  }

  if (state.shiftAnimTimer > 0) state.shiftAnimTimer -= dt;

  // ── Player ──
  _updatePlayer(state, dt, input);
  _updateTorch(state, dt);
  _updateExplored(state);
  _updateCompass(state);

  // ── Rune chain timer ──
  if (state.runeChainTimer > 0) {
    state.runeChainTimer -= dt;
    if (state.runeChainTimer <= 0) state.runeChainCount = 0;
  }

  // ── Decoys ──
  if (input.throwDecoy) _throwDecoy(state);
  _updateDecoys(state, dt);

  // ── Stones ──
  if (input.throwStone) _throwStone(state);
  _updateStones(state, dt);

  // ── Pickups ──
  _updatePickups(state);

  // ── Traps ──
  _updateTraps(state, dt);

  // ── Minotaurs ──
  for (const m of state.minotaurs) {
    _updateMinotaur(state, m, dt);
  }

  // ── Collisions ──
  _checkMinotaurCollisions(state);

  // ── Victory ──
  _checkVictory(state);

  // ── Particles ──
  _updateParticles(state, dt);

  // ── Footprints ──
  _updateFootprints(state, dt);

  // ── Screen shake decay ──
  if (state.screenShake.duration > 0) {
    state.screenShake.duration -= dt;
    if (state.screenShake.duration <= 0) state.screenShake.intensity = 0;
  }
}

// ---------------------------------------------------------------------------
// Player movement with PROPER wall collision
// ---------------------------------------------------------------------------

function _updatePlayer(state: LabyrinthState, dt: number, input: LabyrinthInput): void {
  const p = state.player;

  if (p.invincibleTimer > 0) p.invincibleTimer -= dt;
  if (p.speedBoostTimer > 0) p.speedBoostTimer -= dt;
  if (p.invisTimer > 0) p.invisTimer -= dt;

  // Movement mode: sprint / sneak / walk
  if (input.sprint && (input.dx !== 0 || input.dy !== 0)) {
    p.moveMode = MoveMode.SPRINT;
  } else if (input.sneak) {
    p.moveMode = MoveMode.SNEAK;
  } else {
    p.moveMode = MoveMode.WALK;
  }

  let speed = p.speed;
  if (p.speedBoostTimer > 0) speed *= B.SPEED_BOOST_MULT;
  if (p.moveMode === MoveMode.SPRINT) speed *= B.SPRINT_SPEED_MULT;
  if (p.moveMode === MoveMode.SNEAK) speed *= B.SNEAK_SPEED_MULT;

  // Gas slow
  const cs = B.CELL_SIZE;
  const pCol = Math.floor(p.x / cs);
  const pRow = Math.floor(p.y / cs);
  let inGas = false;
  for (const trap of state.traps) {
    if (trap.type === TrapType.GAS && trap.active && trap.row === pRow && trap.col === pCol) {
      speed *= B.GAS_SPEED_MULT;
      inGas = true;
      break;
    }
  }
  if (inGas) state.events["inGas"] = 1;

  let dx = input.dx;
  let dy = input.dy;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len > 1) { dx /= len; dy /= len; }

  // Move with collision — resolve each axis independently then iterate
  let nx = p.x + dx * speed * dt;
  let ny = p.y + dy * speed * dt;
  const r = B.PLAYER_RADIUS;

  // Resolve X first, then Y, then re-check X (handles corners)
  nx = _slideAxis(state.maze, nx, p.y, r, true);
  ny = _slideAxis(state.maze, nx, ny, r, false);
  nx = _slideAxis(state.maze, nx, ny, r, true); // second pass for corner fix

  p.x = nx;
  p.y = ny;

  if (dx !== 0 || dy !== 0) {
    p.facing = Math.atan2(dy, dx);
    p.walkCycle += dt * speed * 0.05;

    p.footstepTimer -= dt;
    if (p.footstepTimer <= 0) {
      p.footstepTimer = B.FOOTSTEP_INTERVAL;
      state.events["footstep"] = 1;
      _spawnParticle(state, p.x, p.y + 4, {
        vx: (Math.random() - 0.5) * 20, vy: -Math.random() * 10,
        life: 0.5, color: 0x666655, size: 2, type: "dust",
      });
      if (state.footprints.length < B.FOOTPRINT_MAX) {
        state.footprints.push({ x: p.x, y: p.y, age: 0 });
      }
    }
  }

  // Torch sparks
  if (p.torchFuel > 0.05) {
    const sparkRate = B.TORCH_SPARK_INTERVAL / Math.max(0.3, p.torchFuel);
    if (Math.random() < dt / sparkRate) {
      const tx = p.x + Math.cos(p.facing) * 6;
      const ty = p.y + Math.sin(p.facing) * 6 - 8;
      _spawnParticle(state, tx, ty, {
        vx: (Math.random() - 0.5) * 30 + Math.cos(p.facing) * 10,
        vy: -Math.random() * 40 - 20,
        life: 0.3 + Math.random() * 0.3,
        color: Math.random() < 0.5 ? 0xff8800 : 0xffcc00,
        size: 1.5, type: "spark",
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Proper wall collision — AABB slide for each axis
// ---------------------------------------------------------------------------

function _slideAxis(
  maze: { width: number; height: number; cells: CellType[][] },
  x: number, y: number, r: number, isX: boolean,
): number {
  const cs = B.CELL_SIZE;
  let result = isX ? x : y;

  // Check all wall cells the player AABB overlaps
  const minC = Math.floor((x - r) / cs);
  const maxC = Math.floor((x + r) / cs);
  const minR = Math.floor((y - r) / cs);
  const maxR = Math.floor((y + r) / cs);

  for (let row = minR; row <= maxR; row++) {
    for (let col = minC; col <= maxC; col++) {
      const isWall = row < 0 || row >= maze.height || col < 0 || col >= maze.width
        || maze.cells[row][col] === CellType.WALL;
      if (!isWall) continue;

      // AABB overlap test between player circle (approximated as AABB) and wall cell
      const wallLeft = col * cs;
      const wallRight = (col + 1) * cs;
      const wallTop = row * cs;
      const wallBottom = (row + 1) * cs;

      // Check if player AABB overlaps wall AABB
      if (x + r > wallLeft && x - r < wallRight && y + r > wallTop && y - r < wallBottom) {
        if (isX) {
          // Compute penetration from each side, push out the smaller one
          const penRight = (x + r) - wallLeft;
          const penLeft = wallRight - (x - r);
          if (penRight < penLeft) {
            result = Math.min(result, wallLeft - r - 0.01);
          } else {
            result = Math.max(result, wallRight + r + 0.01);
          }
        } else {
          const penDown = (y + r) - wallTop;
          const penUp = wallBottom - (y - r);
          if (penDown < penUp) {
            result = Math.min(result, wallTop - r - 0.01);
          } else {
            result = Math.max(result, wallBottom + r + 0.01);
          }
        }
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Torch
// ---------------------------------------------------------------------------

function _updateTorch(state: LabyrinthState, dt: number): void {
  const p = state.player;
  let burnRate = B.TORCH_BURN_RATE + state.floor * B.TORCH_BURN_RATE_INCREASE;
  if (state.modifier === FloorModifier.CURSED) burnRate *= 2;
  if (p.moveMode === MoveMode.SPRINT) burnRate *= B.SPRINT_FUEL_MULT;
  burnRate *= state.heatTorchBurnMult; // heat pact: dim_torch

  const cs = B.CELL_SIZE;
  const pCol = Math.floor(p.x / cs);
  const pRow = Math.floor(p.y / cs);
  for (const trap of state.traps) {
    if (trap.type === TrapType.GAS && trap.active && trap.row === pRow && trap.col === pCol) {
      burnRate *= B.GAS_BURN_MULT;
      break;
    }
  }

  p.torchFuel = Math.max(0, p.torchFuel - burnRate * dt);

  const baseRadius = B.TORCH_MIN_RADIUS + (B.TORCH_MAX_RADIUS - B.TORCH_MIN_RADIUS) * p.torchFuel;
  const flicker = Math.sin(state.time * 8) * B.TORCH_FLICKER_AMP * p.torchFuel
    + Math.sin(state.time * 13) * B.TORCH_FLICKER_AMP * 0.5 * p.torchFuel;
  let radius = Math.max(B.TORCH_MIN_RADIUS, baseRadius + flicker);
  if (state.modifier === FloorModifier.DARKNESS) radius *= 0.5;
  p.torchRadius = radius;
}

// ---------------------------------------------------------------------------
// Explored area
// ---------------------------------------------------------------------------

function _updateExplored(state: LabyrinthState): void {
  const p = state.player;
  const cs = B.CELL_SIZE;
  const viewR = Math.ceil(p.torchRadius / cs) + 1;
  const cr = Math.floor(p.y / cs);
  const cc = Math.floor(p.x / cs);
  const rSq = p.torchRadius * p.torchRadius;

  for (let dr = -viewR; dr <= viewR; dr++) {
    for (let dc = -viewR; dc <= viewR; dc++) {
      const r = cr + dr;
      const c = cc + dc;
      if (r < 0 || r >= state.maze.height || c < 0 || c >= state.maze.width) continue;
      const distSq = ((c + 0.5) * cs - p.x) ** 2 + ((r + 0.5) * cs - p.y) ** 2;
      if (distSq <= rSq) state.explored.add(r * state.maze.width + c);
    }
  }
}

// ---------------------------------------------------------------------------
// Compass
// ---------------------------------------------------------------------------

function _updateCompass(state: LabyrinthState): void {
  const p = state.player;
  let nearestDist = Infinity;
  let angle = 0;
  for (const pk of state.pickups) {
    if (pk.collected || pk.kind !== PickupKind.RUNE) continue;
    const dx = pk.x - p.x;
    const dy = pk.y - p.y;
    const dist = dx * dx + dy * dy;
    if (dist < nearestDist) { nearestDist = dist; angle = Math.atan2(dy, dx); }
  }
  state.compassAngle = angle;
}

// ---------------------------------------------------------------------------
// Decoys — throwable torch that distracts minotaurs
// ---------------------------------------------------------------------------

function _throwDecoy(state: LabyrinthState): void {
  const p = state.player;
  if (p.decoys <= 0) return;

  p.decoys--;
  const cs = B.CELL_SIZE;
  let tx = p.x + Math.cos(p.facing) * B.DECOY_THROW_DIST;
  let ty = p.y + Math.sin(p.facing) * B.DECOY_THROW_DIST;

  // Clamp to nearest valid floor cell if landing in a wall
  const col = Math.floor(tx / cs);
  const row = Math.floor(ty / cs);
  if (row < 0 || row >= state.maze.height || col < 0 || col >= state.maze.width
    || state.maze.cells[row][col] === CellType.WALL) {
    // Raycast from player toward target, stop at last floor cell
    const steps = 20;
    const sdx = Math.cos(p.facing);
    const sdy = Math.sin(p.facing);
    let bestX = p.x, bestY = p.y;
    for (let i = 1; i <= steps; i++) {
      const cx = p.x + sdx * (B.DECOY_THROW_DIST * i / steps);
      const cy = p.y + sdy * (B.DECOY_THROW_DIST * i / steps);
      const cr = Math.floor(cy / cs);
      const cc = Math.floor(cx / cs);
      if (cr >= 0 && cr < state.maze.height && cc >= 0 && cc < state.maze.width
        && state.maze.cells[cr][cc] !== CellType.WALL) {
        bestX = cx;
        bestY = cy;
      } else {
        break;
      }
    }
    tx = bestX;
    ty = bestY;
  }

  state.decoys.push({ x: tx, y: ty, life: B.DECOY_LIFETIME, active: true });
  state.events["decoyThrow"] = 1;

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    _spawnParticle(state, tx, ty, {
      vx: Math.cos(a) * 30, vy: Math.sin(a) * 30,
      life: 0.4, color: 0xff8800, size: 2, type: "spark",
    });
  }
}

function _updateDecoys(state: LabyrinthState, dt: number): void {
  for (let i = state.decoys.length - 1; i >= 0; i--) {
    const d = state.decoys[i];
    d.life -= dt;
    if (d.life <= 0) {
      d.active = false;
      state.decoys.splice(i, 1);
      continue;
    }
    // Flicker particles
    if (Math.random() < dt * 4) {
      _spawnParticle(state, d.x + (Math.random() - 0.5) * 4, d.y - 5, {
        vx: (Math.random() - 0.5) * 15, vy: -Math.random() * 25 - 10,
        life: 0.25, color: 0xffaa00, size: 1.5, type: "spark",
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Stone throw — stun minotaurs on hit
// ---------------------------------------------------------------------------

function _throwStone(state: LabyrinthState): void {
  const p = state.player;
  if (p.stones <= 0) return;
  p.stones--;
  state.thrownStones.push({
    x: p.x, y: p.y,
    vx: Math.cos(p.facing) * B.STONE_THROW_SPEED,
    vy: Math.sin(p.facing) * B.STONE_THROW_SPEED,
    life: B.STONE_LIFETIME,
    active: true,
  });
  state.events["stoneThrow"] = 1;
}

function _updateStones(state: LabyrinthState, dt: number): void {
  const cs = B.CELL_SIZE;
  for (let i = state.thrownStones.length - 1; i >= 0; i--) {
    const s = state.thrownStones[i];
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.life -= dt;

    // Wall collision
    const col = Math.floor(s.x / cs);
    const row = Math.floor(s.y / cs);
    if (row < 0 || row >= state.maze.height || col < 0 || col >= state.maze.width
      || state.maze.cells[row][col] === CellType.WALL) {
      state.thrownStones.splice(i, 1);
      _spawnParticle(state, s.x, s.y, {
        vx: 0, vy: 0, life: 0.3, color: 0x888888, size: 3, type: "debris",
      });
      state.events["stoneWallHit"] = 1;
      continue;
    }

    // Minotaur collision — stun on hit
    let hit = false;
    for (const m of state.minotaurs) {
      const dx = s.x - m.x;
      const dy = s.y - m.y;
      if (dx * dx + dy * dy < (B.MINOTAUR_RADIUS + 4) ** 2) {
        m.stunTimer = B.STONE_STUN_DURATION;
        m.path = [];
        m.alerted = false;
        state.events["stoneHitMinotaur"] = 1;
        for (let j = 0; j < 6; j++) {
          const a = (j / 6) * Math.PI * 2;
          _spawnParticle(state, m.x, m.y, {
            vx: Math.cos(a) * 40, vy: Math.sin(a) * 40,
            life: 0.3, color: 0xffff44, size: 2, type: "spark",
          });
        }
        hit = true;
        break;
      }
    }
    if (hit || s.life <= 0) {
      state.thrownStones.splice(i, 1);
    }
  }
}

// ---------------------------------------------------------------------------
// Pickups
// ---------------------------------------------------------------------------

function _updatePickups(state: LabyrinthState): void {
  const p = state.player;
  const collectDist = B.PLAYER_RADIUS + 12;

  for (const pickup of state.pickups) {
    if (pickup.collected) continue;
    const dx = p.x - pickup.x;
    const dy = p.y - pickup.y;
    if (dx * dx + dy * dy > collectDist * collectDist) continue;

    pickup.collected = true;

    switch (pickup.kind) {
      case PickupKind.RUNE: {
        p.runesCollected++;
        // Rune chain combo: collect runes within 12s for multiplier
        if (state.runeChainTimer > 0) {
          state.runeChainCount++;
        } else {
          state.runeChainCount = 1;
        }
        state.runeChainTimer = 12;
        const chainMult = Math.min(state.runeChainCount, 5); // max 5x
        let runeScore = B.SCORE_PER_RUNE * chainMult;
        if (state.modifier === FloorModifier.CURSED) runeScore *= 2;
        state.score += runeScore;
        if (state.runeChainCount >= 2) state.events["runeChain"] = state.runeChainCount;
        state.events["runeCollect"] = 1;
        state.screenFlash = 0.15;
        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2;
          _spawnParticle(state, pickup.x, pickup.y, {
            vx: Math.cos(angle) * 60 + (Math.random() - 0.5) * 20,
            vy: Math.sin(angle) * 60 + (Math.random() - 0.5) * 20,
            life: 0.6, color: 0xaa66ff, size: 3, type: "rune",
          });
        }
        break;
      }
      case PickupKind.TORCH_FUEL:
        p.torchFuel = Math.min(1, p.torchFuel + B.TORCH_FUEL_RESTORE);
        state.events["fuelCollect"] = 1;
        for (let i = 0; i < 6; i++) {
          _spawnParticle(state, pickup.x, pickup.y, {
            vx: (Math.random() - 0.5) * 40, vy: -Math.random() * 50 - 10,
            life: 0.5, color: 0xff8800, size: 2.5, type: "spark",
          });
        }
        break;
      case PickupKind.SPEED_BOOST:
        p.speedBoostTimer = B.SPEED_BOOST_DURATION;
        state.events["speedCollect"] = 1;
        state.screenFlash = 0.1;
        break;
      case PickupKind.INVISIBILITY:
        p.invisTimer = B.INVIS_DURATION;
        state.events["invisCollect"] = 1;
        state.screenFlash = 0.1;
        break;
      case PickupKind.DECOY:
        p.decoys++;
        state.events["decoyCollect"] = 1;
        break;
      case PickupKind.TREASURE:
        state.score += B.TREASURE_COINS * 5;
        state.events["treasureCollect"] = 1;
        state.screenFlash = 0.2;
        for (let i = 0; i < 10; i++) {
          const angle = (i / 10) * Math.PI * 2;
          _spawnParticle(state, pickup.x, pickup.y, {
            vx: Math.cos(angle) * 50, vy: Math.sin(angle) * 50 - 20,
            life: 0.7, color: 0xffd700, size: 2.5, type: "rune",
          });
        }
        break;
      case PickupKind.STONE:
        p.stones++;
        state.events["stoneCollect"] = 1;
        break;
    }
  }
}

// ---------------------------------------------------------------------------
// Traps
// ---------------------------------------------------------------------------

function _updateTraps(state: LabyrinthState, dt: number): void {
  const p = state.player;
  const cs = B.CELL_SIZE;
  const pCol = Math.floor(p.x / cs);
  const pRow = Math.floor(p.y / cs);

  for (const trap of state.traps) {
    trap.timer += dt;

    switch (trap.type) {
      case TrapType.SPIKE: {
        const cycle = trap.timer % B.SPIKE_CYCLE_TIME;
        const wasActive = trap.active;
        trap.active = cycle < B.SPIKE_ACTIVE_TIME;
        if (!trap.active && wasActive) trap.triggered = false;
        if (trap.active && !trap.triggered && trap.row === pRow && trap.col === pCol) {
          _damagePlayer(state, B.SPIKE_DAMAGE);
          trap.triggered = true;
          state.events["spikeTrap"] = 1;
        }
        break;
      }
      case TrapType.ARROW: {
        if (trap.timer >= B.ARROW_FIRE_INTERVAL) {
          trap.timer = 0;
          trap.active = true;
          const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];
          const [dr, dc] = dirs[trap.direction];
          const ax = (trap.col + 0.5) * cs;
          const ay = (trap.row + 0.5) * cs;
          _spawnParticle(state, ax, ay, {
            vx: dc * B.ARROW_SPEED, vy: dr * B.ARROW_SPEED,
            life: 1.5, color: 0x888888, size: 3, type: "debris",
          });
          state.events["arrowTrap"] = 1;
        }
        break;
      }
      case TrapType.GAS: {
        const cycle = trap.timer % B.GAS_CYCLE_TIME;
        trap.active = cycle < B.GAS_ACTIVE_TIME;
        if (trap.active && Math.random() < dt * 3) {
          _spawnParticle(state,
            (trap.col + 0.5) * cs + (Math.random() - 0.5) * cs * 0.8,
            (trap.row + 0.5) * cs + (Math.random() - 0.5) * cs * 0.8,
            { vx: (Math.random() - 0.5) * 8, vy: -Math.random() * 12,
              life: 1.0, color: 0x44aa44, size: 4, type: "gas" });
        }
        break;
      }
    }
  }

  // Arrow particle collisions
  for (const particle of state.particles) {
    if (particle.type !== "debris" || particle.life <= 0) continue;
    const pdx = p.x - particle.x;
    const pdy = p.y - particle.y;
    if (pdx * pdx + pdy * pdy < (B.PLAYER_RADIUS + 3) ** 2) {
      if (Math.abs(particle.vx) > 100 || Math.abs(particle.vy) > 100) {
        _damagePlayer(state, B.ARROW_DAMAGE);
        particle.life = 0;
        state.events["arrowHit"] = 1;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Minotaur AI — with decoy lure + alcove avoidance
// ---------------------------------------------------------------------------

function _updateMinotaur(state: LabyrinthState, m: Minotaur, dt: number): void {
  const p = state.player;
  const cs = B.CELL_SIZE;

  // Variant: Berserker stunned longer
  const stunMult = m.variant === MinotaurVariant.BERSERKER ? 1.5 : 1;
  if (m.stunTimer > 0) { m.stunTimer -= dt / stunMult; return; }
  if (m.roarTimer > 0) m.roarTimer -= dt;
  if (m.breathTimer > 0) m.breathTimer -= dt;

  // Check for active decoy lure (Tracker ignores decoys)
  let decoyTarget: Decoy | null = null;
  if (m.variant !== MinotaurVariant.TRACKER) {
    for (const d of state.decoys) {
      if (!d.active) continue;
      const dist = Math.sqrt((m.x - d.x) ** 2 + (m.y - d.y) ** 2);
      if (dist < B.DECOY_LURE_RADIUS) {
        decoyTarget = d;
        m.luredByDecoy = true;
        break;
      }
    }
  }

  if (!decoyTarget) m.luredByDecoy = false;

  // Detection
  const distToPlayer = Math.sqrt((m.x - p.x) ** 2 + (m.y - p.y) ** 2);
  if (!m.luredByDecoy) {
    const isMoving = Math.abs(p.vx) > 10 || Math.abs(p.vy) > 10;
    let hearingRange: number = isMoving ? B.MINOTAUR_HEARING_RADIUS : B.MINOTAUR_DETECTION_RADIUS;
    // Sprint/sneak hearing multiplier
    if (p.moveMode === MoveMode.SPRINT) hearingRange *= B.SPRINT_HEARING_MULT;
    else if (p.moveMode === MoveMode.SNEAK && isMoving) hearingRange *= B.SNEAK_HEARING_MULT;
    // Hunters Moon: 2x detection range
    if (state.modifier === FloorModifier.HUNTERS_MOON) hearingRange *= 2;
    // Tracker: never loses alert once gained
    if (m.variant === MinotaurVariant.TRACKER && m.alerted) hearingRange = Infinity;
    if (p.invisTimer <= 0 && distToPlayer < hearingRange) {
      if (!m.alerted) { m.alerted = true; state.events["minotaurAlert"] = 1; }
    } else if (p.invisTimer > 0 && distToPlayer > B.MINOTAUR_DETECTION_RADIUS * 0.5) {
      m.alerted = false;
    }
  }

  let speed = m.speed;
  if (p.torchFuel < 0.2) speed *= B.MINOTAUR_DARK_SPEED_MULT;
  if (m.variant === MinotaurVariant.BERSERKER && m.alerted) speed *= 1.5;
  if (m.variant === MinotaurVariant.STALKER) speed *= 0.7; // slow but can enter alcoves
  if (!m.alerted && !m.luredByDecoy) speed = B.MINOTAUR_PATROL_SPEED;

  // Repath
  m.pathTimer -= dt;
  if (m.pathTimer <= 0 || m.path.length === 0) {
    m.pathTimer = B.MINOTAUR_REPATH_INTERVAL;
    const mr = Math.floor(m.y / cs);
    const mc = Math.floor(m.x / cs);

    const canAlcove = m.variant === MinotaurVariant.STALKER;

    if (m.luredByDecoy && decoyTarget) {
      const dr = Math.floor(decoyTarget.y / cs);
      const dc = Math.floor(decoyTarget.x / cs);
      m.path = findPath(state.maze, mr, mc, dr, dc, canAlcove);
    } else if (m.alerted && p.invisTimer <= 0) {
      const pr = Math.floor(p.y / cs);
      const pc = Math.floor(p.x / cs);
      // If player is in alcove and minotaur can't enter, wait outside
      if (state.maze.cells[pr]?.[pc] === CellType.ALCOVE && !canAlcove) {
        const alt = _nearestNonAlcove(state, pr, pc);
        if (alt) m.path = findPath(state.maze, mr, mc, alt[0], alt[1], canAlcove);
      } else {
        m.path = findPath(state.maze, mr, mc, pr, pc, canAlcove);
      }
    } else {
      const target = _randomFloorCell(state);
      if (target) m.path = findPath(state.maze, mr, mc, target[0], target[1], canAlcove);
    }
  }

  // Follow path (skip alcove cells)
  if (m.path.length > 0) {
    const next = m.path[0];
    // Don't enter alcove cells (unless Stalker variant)
    if (state.maze.cells[next.y]?.[next.x] === CellType.ALCOVE
      && m.variant !== MinotaurVariant.STALKER) {
      m.path = [];
      return;
    }

    const tx = (next.x + 0.5) * cs;
    const ty = (next.y + 0.5) * cs;
    const ddx = tx - m.x;
    const ddy = ty - m.y;
    const dist = Math.sqrt(ddx * ddx + ddy * ddy);

    if (dist < 4) {
      m.x = tx; m.y = ty;
      m.path.shift();
    } else {
      m.vx = (ddx / dist) * speed;
      m.vy = (ddy / dist) * speed;
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.facing = Math.atan2(ddy, ddx);
    }
  }

  // Roar
  if (m.alerted && !m.luredByDecoy && distToPlayer < 120 && m.roarTimer <= 0) {
    state.events["minotaurRoar"] = 1;
    m.roarTimer = B.MINOTAUR_ROAR_COOLDOWN;
    _triggerShake(state, B.SHAKE_ROAR, 0.3);
  }

  // Breath particles
  if (m.breathTimer <= 0 && (m.alerted || m.luredByDecoy)) {
    m.breathTimer = B.MINOTAUR_BREATH_INTERVAL;
    const bx = m.x + Math.cos(m.facing) * 14;
    const by = m.y + Math.sin(m.facing) * 14;
    for (let i = 0; i < 3; i++) {
      _spawnParticle(state, bx, by, {
        vx: Math.cos(m.facing) * 25 + (Math.random() - 0.5) * 15,
        vy: Math.sin(m.facing) * 25 + (Math.random() - 0.5) * 15,
        life: 0.4, color: 0x884422, size: 2, type: "dust",
      });
    }
  }
}

function _nearestNonAlcove(state: LabyrinthState, row: number, col: number): [number, number] | null {
  const { maze } = state;
  for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
    const nr = row + dr;
    const nc = col + dc;
    if (nr >= 0 && nr < maze.height && nc >= 0 && nc < maze.width) {
      if (maze.cells[nr][nc] === CellType.FLOOR) return [nr, nc];
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Collisions
// ---------------------------------------------------------------------------

function _checkMinotaurCollisions(state: LabyrinthState): void {
  const p = state.player;
  if (p.invisTimer > 0 || p.invincibleTimer > 0) return;

  // Player in alcove = safe
  const cs = B.CELL_SIZE;
  const pCol = Math.floor(p.x / cs);
  const pRow = Math.floor(p.y / cs);
  if (state.maze.cells[pRow]?.[pCol] === CellType.ALCOVE) return;

  for (const m of state.minotaurs) {
    const dx = p.x - m.x;
    const dy = p.y - m.y;
    const minDist = B.PLAYER_RADIUS + B.MINOTAUR_RADIUS;
    if (dx * dx + dy * dy < minDist * minDist) {
      _damagePlayer(state, p.hp); // instant kill
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Damage
// ---------------------------------------------------------------------------

function _damagePlayer(state: LabyrinthState, amount: number): void {
  const p = state.player;
  if (p.invincibleTimer > 0) return;

  p.hp -= amount;
  p.invincibleTimer = B.INVINCIBLE_DURATION;
  _triggerShake(state, B.SHAKE_DAMAGE, 0.2);
  state.screenFlash = 0.1;

  for (let i = 0; i < 8; i++) {
    _spawnParticle(state, p.x, p.y, {
      vx: (Math.random() - 0.5) * 80, vy: (Math.random() - 0.5) * 80,
      life: 0.4, color: 0xcc2222, size: 2.5, type: "blood",
    });
  }

  if (p.hp <= 0) {
    p.alive = false;
    state.phase = LabyrinthPhase.DEAD;
    state.events["playerDeath"] = 1;
    _triggerShake(state, B.SHAKE_DEATH, 0.6);
    state.screenFlash = 0.3;
  } else {
    state.events["playerHit"] = 1;
  }
}

// ---------------------------------------------------------------------------
// Victory
// ---------------------------------------------------------------------------

function _checkVictory(state: LabyrinthState): void {
  const p = state.player;
  const cs = B.CELL_SIZE;
  const exitX = (state.maze.exitCol + 0.5) * cs;
  const exitY = (state.maze.exitRow + 0.5) * cs;
  const dx = p.x - exitX;
  const dy = p.y - exitY;

  if (dx * dx + dy * dy < (cs * 0.4) ** 2 && p.runesCollected >= state.runesRequired) {
    const timeBonus = Math.max(0, Math.floor(
      B.SCORE_TIME_BONUS_MAX * (1 - state.time / B.SCORE_TIME_BONUS_WINDOW)
    ));
    state.score += B.SCORE_PER_FLOOR + timeBonus;
    state.phase = LabyrinthPhase.VICTORY;
    state.events["victory"] = 1;
    state.screenFlash = 0.3;
  }
}

// ---------------------------------------------------------------------------
// Particles
// ---------------------------------------------------------------------------

function _spawnParticle(
  state: LabyrinthState, x: number, y: number,
  opts: { vx: number; vy: number; life: number; color: number; size: number; type: Particle["type"] },
): void {
  if (state.particles.length >= B.PARTICLE_MAX) state.particles.shift();
  state.particles.push({
    x, y, vx: opts.vx, vy: opts.vy,
    life: opts.life, maxLife: opts.life,
    color: opts.color, size: opts.size, type: opts.type,
  });
}

function _spawnDebrisParticles(state: LabyrinthState, count: number): void {
  const p = state.player;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * 100 + 30;
    _spawnParticle(state, p.x + Math.cos(angle) * dist, p.y + Math.sin(angle) * dist, {
      vx: (Math.random() - 0.5) * 60, vy: (Math.random() - 0.5) * 60,
      life: 0.8 + Math.random() * 0.4,
      color: 0x888888, size: 2 + Math.random() * 2, type: "debris",
    });
  }
}

function _updateParticles(state: LabyrinthState, dt: number): void {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (p.type === "spark" || p.type === "blood") p.vy += 80 * dt;
    if (p.type === "dust" || p.type === "gas") { p.vx *= 1 - 2 * dt; p.vy *= 1 - 2 * dt; }
    if (p.life <= 0) state.particles.splice(i, 1);
  }
}

function _updateFootprints(state: LabyrinthState, dt: number): void {
  for (let i = state.footprints.length - 1; i >= 0; i--) {
    state.footprints[i].age += dt;
    if (state.footprints[i].age > B.FOOTPRINT_LIFETIME) state.footprints.splice(i, 1);
  }
}

// ---------------------------------------------------------------------------
// Screen shake
// ---------------------------------------------------------------------------

function _triggerShake(state: LabyrinthState, intensity: number, duration: number): void {
  state.screenShake.intensity = Math.max(state.screenShake.intensity, intensity);
  state.screenShake.duration = Math.max(state.screenShake.duration, duration);
}

// ---------------------------------------------------------------------------
// Move entities out of walls (NO MAZE CORRUPTION — find nearest floor cell)
// ---------------------------------------------------------------------------

function _moveEntitiesOutOfWalls(state: LabyrinthState): void {
  const cs = B.CELL_SIZE;

  // Helper: find nearest non-wall cell and move entity there
  const moveToFloor = (ex: number, ey: number): [number, number] => {
    const col = Math.floor(ex / cs);
    const row = Math.floor(ey / cs);
    if (row >= 0 && row < state.maze.height && col >= 0 && col < state.maze.width) {
      if (state.maze.cells[row][col] !== CellType.WALL) return [ex, ey]; // already fine
    }
    // BFS outward to find nearest floor cell
    const visited = new Set<number>();
    const queue: [number, number][] = [[row, col]];
    visited.add(row * state.maze.width + col);

    while (queue.length > 0) {
      const [r, c] = queue.shift()!;
      for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= state.maze.height || nc < 0 || nc >= state.maze.width) continue;
        const key = nr * state.maze.width + nc;
        if (visited.has(key)) continue;
        visited.add(key);
        if (state.maze.cells[nr][nc] !== CellType.WALL) {
          return [(nc + 0.5) * cs, (nr + 0.5) * cs];
        }
        queue.push([nr, nc]);
      }
    }
    return [ex, ey]; // fallback
  };

  // Player
  const [px, py] = moveToFloor(state.player.x, state.player.y);
  state.player.x = px;
  state.player.y = py;

  // Minotaurs
  for (const m of state.minotaurs) {
    const [mx, my] = moveToFloor(m.x, m.y);
    m.x = mx;
    m.y = my;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _randomFloorCell(state: LabyrinthState): [number, number] | null {
  const { maze } = state;
  const candidates: [number, number][] = [];
  for (let r = 1; r < maze.height - 1; r++) {
    for (let c = 1; c < maze.width - 1; c++) {
      if (maze.cells[r][c] === CellType.FLOOR) candidates.push([r, c]);
    }
  }
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}
