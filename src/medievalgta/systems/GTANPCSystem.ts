// GTANPCSystem.ts – Pure NPC AI logic, no PixiJS imports
import type { MedievalGTAState, GTANPC, GTABuilding, GTAVec2 } from '../state/MedievalGTAState';
import { GTAConfig } from '../config/MedievalGTAConfig';
import { NPC_DEFINITIONS } from '../config/NPCDefs';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function dist2(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.sqrt(dist2(ax, ay, bx, by));
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function normalize(dx: number, dy: number): GTAVec2 {
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.0001) return { x: 0, y: 0 };
  return { x: dx / len, y: dy / len };
}

function facingDir(dx: number, dy: number): 'n' | 's' | 'e' | 'w' {
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'e' : 'w';
  return dy >= 0 ? 's' : 'n';
}

/** Returns true if the circle (cx, cy, r) overlaps the AABB (bx, by, bw, bh). */
function circleOverlapsRect(
  cx: number, cy: number, r: number,
  bx: number, by: number, bw: number, bh: number,
): boolean {
  const nearX = clamp(cx, bx, bx + bw);
  const nearY = clamp(cy, by, by + bh);
  const dx = cx - nearX;
  const dy = cy - nearY;
  return dx * dx + dy * dy < r * r;
}

/** Push NPC circle out of rect. */
function resolveNPCBuilding(npc: GTANPC, b: GTABuilding): void {
  const r = 10;
  if (!circleOverlapsRect(npc.pos.x, npc.pos.y, r, b.x, b.y, b.w, b.h)) return;

  const overlapLeft  = (npc.pos.x + r) - b.x;
  const overlapRight = (b.x + b.w) - (npc.pos.x - r);
  const overlapTop   = (npc.pos.y + r) - b.y;
  const overlapBot   = (b.y + b.h) - (npc.pos.y - r);

  const minX = overlapLeft < overlapRight ? overlapLeft : overlapRight;
  const minY = overlapTop  < overlapBot   ? overlapTop  : overlapBot;

  if (minX < minY) {
    if (overlapLeft < overlapRight) { npc.pos.x -= overlapLeft; npc.vel.x = Math.abs(npc.vel.x) * 0.5; }
    else                            { npc.pos.x += overlapRight; npc.vel.x = -Math.abs(npc.vel.x) * 0.5; }
  } else {
    if (overlapTop < overlapBot)    { npc.pos.y -= overlapTop; npc.vel.y = Math.abs(npc.vel.y) * 0.5; }
    else                            { npc.pos.y += overlapBot; npc.vel.y = -Math.abs(npc.vel.y) * 0.5; }
  }
}

function pickWanderTarget(homePos: GTAVec2, worldW: number, worldH: number): GTAVec2 {
  const angle = Math.random() * Math.PI * 2;
  const radius = 60 + Math.random() * GTAConfig.NPC_WANDER_RADIUS;
  return {
    x: clamp(homePos.x + Math.cos(angle) * radius, 20, worldW - 20),
    y: clamp(homePos.y + Math.sin(angle) * radius, 20, worldH - 20),
  };
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function updateNPCs(state: MedievalGTAState, dt: number): void {
  if (state.paused || state.gameOver) return;

  const p   = state.player;
  const wl  = p.wantedLevel;

  const toRemove: string[] = [];

  for (const [id, npc] of state.npcs) {
    // ── 1. Dead NPCs ────────────────────────────────────────────────────────
    if (npc.dead || npc.behavior === 'dead') {
      npc.deathTimer -= dt;
      if (npc.deathTimer <= 0) toRemove.push(id);
      continue;
    }

    const def = NPC_DEFINITIONS[npc.type];

    // ── Decrement attack timer ───────────────────────────────────────────────
    if (npc.attackTimer > 0) npc.attackTimer = Math.max(0, npc.attackTimer - dt);

    // ── Determine effective speed (use NPC's own speed field, seeded from def) ─
    const baseSpeed = npc.speed > 0 ? npc.speed : def.speed;

    const distToPlayer = dist(npc.pos.x, npc.pos.y, p.pos.x, p.pos.y);

    // ── 2. Guard AI ──────────────────────────────────────────────────────────
    if (npc.type === 'guard' || npc.type === 'army_soldier') {
      _updateGuardAI(state, npc, dt, baseSpeed, wl, distToPlayer);
    }
    // ── 3. Knight AI ────────────────────────────────────────────────────────
    else if (npc.type === 'knight') {
      _updateKnightAI(state, npc, dt, baseSpeed, wl, distToPlayer);
    }
    // ── 4. Archer AI ────────────────────────────────────────────────────────
    else if (npc.type === 'archer_guard') {
      _updateArcherAI(state, npc, dt, baseSpeed, wl, distToPlayer);
    }
    // ── 5. Criminal / Bandit AI ─────────────────────────────────────────────
    else if (npc.type === 'criminal' || npc.type === 'bandit') {
      _updateCriminalAI(state, npc, dt, baseSpeed, wl, distToPlayer);
    }
    // ── 6. Civilian reactions ───────────────────────────────────────────────
    else if (npc.type === 'civilian_m' || npc.type === 'civilian_f') {
      _updateCivilianAI(state, npc, dt, baseSpeed, wl, distToPlayer);
    }
    // ── 7. Remaining (merchant, blacksmith, etc.) use their default behavior ─
    else {
      _updateDefaultAI(state, npc, dt, baseSpeed);
    }

    // ── Velocity application + friction ─────────────────────────────────────
    npc.pos.x += npc.vel.x * dt;
    npc.pos.y += npc.vel.y * dt;
    npc.vel.x *= 0.85;
    npc.vel.y *= 0.85;

    // ── Facing ─────────────────────────────────────────────────────────────
    if (Math.abs(npc.vel.x) > 1 || Math.abs(npc.vel.y) > 1) {
      npc.facing    = Math.atan2(npc.vel.y, npc.vel.x);
      npc.facingDir = facingDir(npc.vel.x, npc.vel.y);
    }

    // ── Building collision ──────────────────────────────────────────────────
    for (const b of state.buildings) {
      resolveNPCBuilding(npc, b);
    }

    // ── World bounds ────────────────────────────────────────────────────────
    npc.pos.x = clamp(npc.pos.x, 10, state.worldWidth  - 10);
    npc.pos.y = clamp(npc.pos.y, 10, state.worldHeight - 10);

    // ── NPC–player collision (push apart) ───────────────────────────────────
    const overlapDist = 22;
    const dp = dist(npc.pos.x, npc.pos.y, p.pos.x, p.pos.y);
    if (dp < overlapDist && dp > 0.01) {
      const push = (overlapDist - dp) / overlapDist;
      const nx   = (npc.pos.x - p.pos.x) / dp;
      const ny   = (npc.pos.y - p.pos.y) / dp;
      npc.pos.x += nx * push * 4;
      npc.pos.y += ny * push * 4;
    }
  }

  for (const id of toRemove) {
    state.npcs.delete(id);
  }
}

// ─── Guard / army_soldier AI ────────────────────────────────────────────────

function _updateGuardAI(
  state: MedievalGTAState,
  npc: GTANPC,
  dt: number,
  speed: number,
  wl: number,
  distToPlayer: number,
): void {
  const p = state.player;
  const alertDist = npc.alertRadius + wl * GTAConfig.WANTED_ALERT_RADIUS_PER_STAR;

  if (npc.behavior === 'patrol' || npc.behavior === 'stand' || npc.behavior === 'wander' || npc.behavior === 'idle') {
    // Transition to chase if wanted
    if (wl >= 2 && distToPlayer < alertDist) {
      npc.behavior  = 'chase_player';
      npc.chaseTimer = 15;
    } else {
      _runDefaultBehavior(state, npc, dt, speed);
    }
  } else if (npc.behavior === 'chase_player') {
    npc.chaseTimer -= dt;
    if (distToPlayer > GTAConfig.GUARD_CHASE_RADIUS || npc.chaseTimer <= 0 || wl === 0) {
      // Give up – return to patrol / stand
      npc.behavior = npc.patrolPath.length > 0 ? 'patrol' : 'stand';
      npc.chaseTimer = 0;
    } else if (distToPlayer <= npc.aggroRadius) {
      npc.behavior = 'attack_player';
    } else {
      _moveToward(npc, p.pos.x, p.pos.y, speed * 1.1);
    }
  } else if (npc.behavior === 'attack_player') {
    if (distToPlayer > npc.aggroRadius + 30) {
      npc.behavior = 'chase_player';
    } else {
      // Stand and attack
      npc.vel.x *= 0.5;
      npc.vel.y *= 0.5;
      if (npc.attackTimer <= 0 && distToPlayer < 55) {
        _meleeHitPlayer(state, npc);
      }
    }
  }
}

// ─── Knight AI ──────────────────────────────────────────────────────────────

function _updateKnightAI(
  state: MedievalGTAState,
  npc: GTANPC,
  dt: number,
  speed: number,
  wl: number,
  distToPlayer: number,
): void {
  const p = state.player;
  const alertDist = npc.alertRadius + wl * GTAConfig.WANTED_ALERT_RADIUS_PER_STAR;

  if (npc.behavior === 'patrol' || npc.behavior === 'stand' || npc.behavior === 'idle') {
    if (wl >= 3 && distToPlayer < alertDist) {
      npc.behavior   = 'chase_player';
      npc.chaseTimer = 20;
    } else {
      _runDefaultBehavior(state, npc, dt, speed);
    }
  } else if (npc.behavior === 'chase_player') {
    npc.chaseTimer -= dt;
    if (distToPlayer > GTAConfig.GUARD_CHASE_RADIUS * 1.2 || npc.chaseTimer <= 0 || wl < 3) {
      npc.behavior = npc.patrolPath.length > 0 ? 'patrol' : 'stand';
      npc.chaseTimer = 0;
    } else if (distToPlayer <= npc.aggroRadius) {
      npc.behavior = 'attack_player';
    } else {
      _moveToward(npc, p.pos.x, p.pos.y, speed * 1.15);
    }
  } else if (npc.behavior === 'attack_player') {
    if (distToPlayer > npc.aggroRadius + 40) {
      npc.behavior = 'chase_player';
    } else {
      npc.vel.x *= 0.5;
      npc.vel.y *= 0.5;
      if (npc.attackTimer <= 0 && distToPlayer < 60) {
        _meleeHitPlayer(state, npc);
      }
    }
  }
}

// ─── Archer AI ───────────────────────────────────────────────────────────────

function _updateArcherAI(
  state: MedievalGTAState,
  npc: GTANPC,
  dt: number,
  speed: number,
  wl: number,
  distToPlayer: number,
): void {
  const alertDist = npc.alertRadius + wl * GTAConfig.WANTED_ALERT_RADIUS_PER_STAR;

  if (npc.behavior !== 'chase_player' && npc.behavior !== 'attack_player') {
    if (wl >= 2 && distToPlayer < alertDist) {
      npc.behavior = 'attack_player';
    } else {
      _runDefaultBehavior(state, npc, dt, speed);
    }
  } else if (npc.behavior === 'attack_player') {
    if (wl < 2 || distToPlayer > alertDist * 1.4) {
      npc.behavior = npc.patrolPath.length > 0 ? 'patrol' : 'stand';
    } else {
      // Archers mostly stand and shoot
      npc.vel.x *= 0.6;
      npc.vel.y *= 0.6;
      if (npc.attackTimer <= 0 && distToPlayer < 380) {
        _shootArrowAtPlayer(state, npc);
      }
    }
  }
}

function _shootArrowAtPlayer(state: MedievalGTAState, npc: GTANPC): void {
  const p   = state.player;
  const dir = normalize(p.pos.x - npc.pos.x, p.pos.y - npc.pos.y);

  // Archer cooldown is 2.5s
  npc.attackTimer = 2.5;

  // Spawn a fast-moving particle as projectile
  const ARROW_SPEED = 320;
  state.particles.push({
    pos:     { x: npc.pos.x, y: npc.pos.y },
    vel:     { x: dir.x * ARROW_SPEED, y: dir.y * ARROW_SPEED },
    life:    1.2,
    maxLife: 1.2,
    color:   0x996633,
    size:    4,
  });

  // Immediate hit check (simplified) – deal 15 damage if within 250px
  const d = Math.sqrt(
    (p.pos.x - npc.pos.x) ** 2 + (p.pos.y - npc.pos.y) ** 2,
  );
  if (d < 250) {
    // Import dealDamageToPlayer would create a circular dep; inline minimal version
    if (p.invincibleTimer <= 0 && p.state !== 'blocking') {
      p.hp = Math.max(0, p.hp - 15);
      p.invincibleTimer = 0.3;
      state.notifications.push({
        id:    `n_${state.nextId++}`,
        text:  '- 15 HP (Arrow!)',
        timer: 2.0,
        color: 0xff4444,
      });
    }
  }
}

// ─── Criminal / Bandit AI ────────────────────────────────────────────────────

function _updateCriminalAI(
  state: MedievalGTAState,
  npc: GTANPC,
  dt: number,
  speed: number,
  wl: number,
  distToPlayer: number,
): void {
  const p = state.player;

  if (npc.behavior === 'chase_player' || npc.behavior === 'attack_player') {
    // Attacking mode
    npc.chaseTimer -= dt;
    if (npc.chaseTimer <= 0 || distToPlayer > 400) {
      npc.behavior   = 'wander';
      npc.chaseTimer = 0;
    } else if (distToPlayer <= 50) {
      npc.behavior = 'attack_player';
      npc.vel.x *= 0.5;
      npc.vel.y *= 0.5;
      if (npc.attackTimer <= 0) _meleeHitPlayer(state, npc);
    } else {
      npc.behavior = 'chase_player';
      _moveToward(npc, p.pos.x, p.pos.y, speed);
    }
    return;
  }

  if (npc.behavior === 'flee') {
    // Flee from player
    if (distToPlayer > 300) {
      npc.behavior     = 'wander';
      npc.wanderTarget = null;
      npc.wanderTimer  = 0;
    } else {
      const dir = normalize(npc.pos.x - p.pos.x, npc.pos.y - p.pos.y);
      npc.vel.x += dir.x * GTAConfig.NPC_FLEE_SPEED * dt * 6;
      npc.vel.y += dir.y * GTAConfig.NPC_FLEE_SPEED * dt * 6;
      const spd = Math.sqrt(npc.vel.x ** 2 + npc.vel.y ** 2);
      if (spd > GTAConfig.NPC_FLEE_SPEED) {
        npc.vel.x = (npc.vel.x / spd) * GTAConfig.NPC_FLEE_SPEED;
        npc.vel.y = (npc.vel.y / spd) * GTAConfig.NPC_FLEE_SPEED;
      }
    }
    return;
  }

  // Wander + aggression logic
  if (wl >= 3 && distToPlayer < npc.alertRadius) {
    // Aggressive at high wanted level
    npc.behavior   = 'chase_player';
    npc.chaseTimer = 12;
    return;
  }

  // Criminals attack player if player is within aggroRadius and player has low wanted
  // (they are opportunistic), OR if already in chase mode
  if (wl === 0 && distToPlayer < npc.aggroRadius && npc.type === 'bandit') {
    npc.behavior   = 'chase_player';
    npc.chaseTimer = 8;
    return;
  }

  _runDefaultBehavior(state, npc, dt, speed);
}

// ─── Civilian AI ─────────────────────────────────────────────────────────────

function _updateCivilianAI(
  state: MedievalGTAState,
  npc: GTANPC,
  dt: number,
  speed: number,
  wl: number,
  distToPlayer: number,
): void {
  const p = state.player;

  if (wl >= 1 && distToPlayer < 150) {
    // Flee
    npc.behavior = 'flee';
    const dir = normalize(npc.pos.x - p.pos.x, npc.pos.y - p.pos.y);
    npc.vel.x += dir.x * GTAConfig.NPC_FLEE_SPEED * dt * 6;
    npc.vel.y += dir.y * GTAConfig.NPC_FLEE_SPEED * dt * 6;
    const spd = Math.sqrt(npc.vel.x ** 2 + npc.vel.y ** 2);
    if (spd > GTAConfig.NPC_FLEE_SPEED) {
      npc.vel.x = (npc.vel.x / spd) * GTAConfig.NPC_FLEE_SPEED;
      npc.vel.y = (npc.vel.y / spd) * GTAConfig.NPC_FLEE_SPEED;
    }
    return;
  }

  if (npc.behavior === 'flee') {
    npc.behavior     = 'wander';
    npc.wanderTarget = null;
    npc.wanderTimer  = 0;
  }

  _runDefaultBehavior(state, npc, dt, speed);
}

// ─── Default AI dispatcher ───────────────────────────────────────────────────

function _updateDefaultAI(
  state: MedievalGTAState,
  npc: GTANPC,
  dt: number,
  speed: number,
): void {
  _runDefaultBehavior(state, npc, dt, speed);
}

function _runDefaultBehavior(
  state: MedievalGTAState,
  npc: GTANPC,
  dt: number,
  speed: number,
): void {
  switch (npc.behavior) {
    case 'wander':  _doWander(state, npc, dt, speed);  break;
    case 'patrol':  _doPatrol(npc, dt, speed);          break;
    case 'stand':
    case 'idle':    _doStand(npc, dt);                  break;
    default:        break;
  }
}

// ─── Wander ──────────────────────────────────────────────────────────────────

function _doWander(state: MedievalGTAState, npc: GTANPC, dt: number, speed: number): void {
  npc.wanderTimer -= dt;

  if (!npc.wanderTarget || npc.wanderTimer <= 0) {
    npc.wanderTarget = pickWanderTarget(npc.homePos, state.worldWidth, state.worldHeight);
    npc.wanderTimer  = 3 + Math.random() * 5;
  }

  const wt = npc.wanderTarget;
  const d  = dist(npc.pos.x, npc.pos.y, wt.x, wt.y);
  if (d < 8) {
    npc.wanderTarget = null;
    npc.wanderTimer  = 1 + Math.random() * 3;
    npc.vel.x        = 0;
    npc.vel.y        = 0;
    return;
  }

  const dir = normalize(wt.x - npc.pos.x, wt.y - npc.pos.y);
  npc.vel.x += dir.x * speed * dt * 5;
  npc.vel.y += dir.y * speed * dt * 5;

  const spd = Math.sqrt(npc.vel.x ** 2 + npc.vel.y ** 2);
  if (spd > speed) {
    npc.vel.x = (npc.vel.x / spd) * speed;
    npc.vel.y = (npc.vel.y / spd) * speed;
  }
}

// ─── Patrol ──────────────────────────────────────────────────────────────────

function _doPatrol(npc: GTANPC, dt: number, speed: number): void {
  if (npc.patrolPath.length === 0) {
    _doStand(npc, dt);
    return;
  }

  const target = npc.patrolPath[npc.patrolIndex];
  const d      = dist(npc.pos.x, npc.pos.y, target.x, target.y);

  if (d < 10) {
    // Advance patrol index
    npc.patrolIndex += npc.patrolDir;
    if (npc.patrolIndex >= npc.patrolPath.length) {
      npc.patrolIndex = npc.patrolPath.length - 2;
      npc.patrolDir   = -1;
    } else if (npc.patrolIndex < 0) {
      npc.patrolIndex = 1;
      npc.patrolDir   = 1;
    }
    return;
  }

  const dir = normalize(target.x - npc.pos.x, target.y - npc.pos.y);
  npc.vel.x += dir.x * speed * dt * 5;
  npc.vel.y += dir.y * speed * dt * 5;

  const spd = Math.sqrt(npc.vel.x ** 2 + npc.vel.y ** 2);
  if (spd > speed) {
    npc.vel.x = (npc.vel.x / spd) * speed;
    npc.vel.y = (npc.vel.y / spd) * speed;
  }
}

// ─── Stand / Idle ────────────────────────────────────────────────────────────

function _doStand(npc: GTANPC, _dt: number): void {
  npc.vel.x *= 0.7;
  npc.vel.y *= 0.7;
}

// ─── Move toward point ───────────────────────────────────────────────────────

function _moveToward(npc: GTANPC, tx: number, ty: number, speed: number): void {
  const dir = normalize(tx - npc.pos.x, ty - npc.pos.y);
  npc.vel.x  = dir.x * speed;
  npc.vel.y  = dir.y * speed;
}

// ─── Melee hit player ────────────────────────────────────────────────────────

function _meleeHitPlayer(state: MedievalGTAState, npc: GTANPC): void {
  const p = state.player;
  npc.attackTimer = npc.attackCooldown;

  if (p.invincibleTimer > 0) return;
  if (p.state === 'blocking' || p.blockTimer > 0) {
    state.notifications.push({
      id:    `n_${state.nextId++}`,
      text:  'Blocked!',
      timer: 1.0,
      color: 0xaaddff,
    });
    return;
  }

  p.hp = Math.max(0, p.hp - npc.damage);
  p.invincibleTimer = 0.3;

  state.notifications.push({
    id:    `n_${state.nextId++}`,
    text:  `- ${npc.damage} HP`,
    timer: 1.5,
    color: 0xff4444,
  });

  if (p.hp <= 0 && p.state !== 'dead') {
    p.state      = 'dead';
    p.vel.x      = 0;
    p.vel.y      = 0;
    state.gameOver = true;
  }
}
