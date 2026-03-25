// ---------------------------------------------------------------------------
// Chronomancer — Core game systems
// Time-manipulation combat arena: slow, rewind, and outlast your enemies
// ---------------------------------------------------------------------------

import type { CMState, CMEnemy, CMEnemyKind, CMBossKind, CMHazard } from "../types";
import { CM } from "../config/ChronomancerBalance";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dist(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1, dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

function angle(x1: number, y1: number, x2: number, y2: number): number {
  return Math.atan2(y2 - y1, x2 - x1);
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function randRange(lo: number, hi: number): number {
  return lo + Math.random() * (hi - lo);
}

// ---------------------------------------------------------------------------
// Player movement + ability timers
// ---------------------------------------------------------------------------

export function updatePlayer(state: CMState, dt: number, keys: Set<string>): void {
  // Dash movement
  if (state.dashing && state.dashTimer > 0) {
    state.dashTimer -= dt;
    state.playerX += Math.cos(state.dashAngle) * CM.DASH_SPEED * dt;
    state.playerY += Math.sin(state.dashAngle) * CM.DASH_SPEED * dt;
    if (state.dashTimer <= 0) {
      state.dashing = false;
      state.dashTimer = 0;
    }
  } else {
    // Normal WASD movement
    let mx = 0, my = 0;
    if (keys.has("KeyW") || keys.has("ArrowUp")) my -= 1;
    if (keys.has("KeyS") || keys.has("ArrowDown")) my += 1;
    if (keys.has("KeyA") || keys.has("ArrowLeft")) mx -= 1;
    if (keys.has("KeyD") || keys.has("ArrowRight")) mx += 1;
    const len = Math.sqrt(mx * mx + my * my);
    if (len > 0) {
      mx /= len; my /= len;
      state.moveAngle = Math.atan2(my, mx);
    }
    state.playerX += mx * CM.PLAYER_SPEED * dt;
    state.playerY += my * CM.PLAYER_SPEED * dt;

    // Footstep particles when moving
    const isMoving = mx !== 0 || my !== 0;
    if (isMoving) {
      state.footstepTimer -= dt;
      if (state.footstepTimer <= 0) {
        state.footstepTimer = 0.1;
        for (let i = 0; i < 2; i++) {
          const a = Math.random() * Math.PI * 2;
          const spd = 8 + Math.random() * 14;
          state.particles.push({
            x: state.playerX + (Math.random() - 0.5) * 6,
            y: state.playerY + state.playerRadius,
            vx: Math.cos(a) * spd,
            vy: -Math.abs(Math.sin(a)) * spd * 0.4 - 4,
            life: 0.25, maxLife: 0.25,
            color: CM.COLOR_TIME_DARK, size: 1.5 + Math.random() * 0.8,
          });
        }
      }
    } else {
      state.footstepTimer = 0;
    }
  }

  // Constrain to arena
  const margin = state.playerRadius + 5;
  state.playerX = clamp(state.playerX, margin, state.arenaW - margin);
  state.playerY = clamp(state.playerY, margin, state.arenaH - margin);

  // Record position history every 0.1s for chrono shift
  // We reuse footstepTimer-equivalent logic via a dedicated field check
  // positionHistory is pushed on a separate 0.1s cadence tracked externally;
  // here we push based on time elapsed (approximate via dt accumulation on invulnTimer boundary)
  // Simple approach: push whenever a footstep would fire OR at 0.1s intervals
  // We'll use a simple increment: push every ~0.1 s of game time
  if (state.positionHistory.length === 0 ||
      (state.time - state.positionHistory[state.positionHistory.length - 1].time) >= 0.1) {
    state.positionHistory.push({
      x: state.playerX,
      y: state.playerY,
      hp: state.playerHP,
      time: state.time,
    });
    if (state.positionHistory.length > 50) {
      state.positionHistory.shift();
    }
  }

  // Charge time increment
  if (state.chargingBolt) {
    state.chargeTime = Math.min(state.chargeTime + dt, state.maxChargeTime);
  }

  // Cooldown timers
  if (state.boltCooldown > 0) state.boltCooldown -= dt;
  if (state.dashCooldown > 0) state.dashCooldown -= dt;
  if (state.invulnTimer > 0) state.invulnTimer -= dt;
  if (state.pulseCooldown > 0) state.pulseCooldown -= dt;
  if (state.chronoShiftCooldown > 0) state.chronoShiftCooldown -= dt;
  if (state.timeFreezeCooldown > 0) state.timeFreezeCooldown -= dt;

  // Time freeze active timer
  if (state.timeFreezeActive) {
    state.timeFreezeTimer -= dt;
    if (state.timeFreezeTimer <= 0) {
      state.timeFreezeActive = false;
      state.timeFreezeTimer = 0;
    }
  }
}

// ---------------------------------------------------------------------------
// Time Bolt — primary ranged attack
// ---------------------------------------------------------------------------

export function tryShoot(state: CMState): void {
  if (state.boltCooldown > 0) return;
  state.boltCooldown = CM.BOLT_COOLDOWN;

  // Combo fire rate bonus: -5% cooldown per combo level (up to -30%)
  if (state.comboCount > 0) {
    const comboReduction = Math.min(0.3, state.comboCount * 0.05);
    state.boltCooldown *= (1 - comboReduction);
  }

  const boltDmg = CM.BOLT_DAMAGE * (1 + state.boltPowerLevel * 0.25);
  const isPiercing = state.boltPowerLevel >= 3;
  const boltColor = isPiercing ? 0xdd88ff : CM.COLOR_BOLT;
  state.projectiles.push({
    x: state.playerX,
    y: state.playerY,
    vx: Math.cos(state.aimAngle) * CM.BOLT_SPEED,
    vy: Math.sin(state.aimAngle) * CM.BOLT_SPEED,
    damage: boltDmg,
    radius: CM.BOLT_RADIUS,
    life: CM.BOLT_LIFE,
    color: boltColor,
    fromEnemy: false,
    slowOnHit: true,
    piercing: isPiercing,
  });

  // Muzzle flash particles
  for (let i = 0; i < 2; i++) {
    const spread = (Math.random() - 0.5) * 0.8;
    const spd = 60 + Math.random() * 40;
    state.particles.push({
      x: state.playerX,
      y: state.playerY,
      vx: Math.cos(state.aimAngle + spread) * spd,
      vy: Math.sin(state.aimAngle + spread) * spd,
      life: 0.2, maxLife: 0.2,
      color: boltColor, size: 2 + Math.random(),
    });
  }
}

// ---------------------------------------------------------------------------
// Charged Bolt — hold right-click to charge, release to fire
// ---------------------------------------------------------------------------

export function startCharge(state: CMState): void {
  state.chargingBolt = true;
  state.chargeTime = 0;
}

export function releaseCharge(state: CMState): void {
  if (state.chargeTime >= state.maxChargeTime * 0.5) {
    fireChargedBolt(state);
  } else {
    // Short tap — fire normal bolt
    tryShoot(state);
  }
  state.chargingBolt = false;
  state.chargeTime = 0;
}

function fireChargedBolt(state: CMState): void {
  const chargeFactor = Math.min(1, state.chargeTime / state.maxChargeTime);
  const dmg = CM.BOLT_DAMAGE * (1 + state.boltPowerLevel * 0.25) * (1 + chargeFactor * 2);
  const radius = CM.BOLT_RADIUS * (1 + chargeFactor);
  const speed = CM.BOLT_SPEED * (1 - chargeFactor * 0.4);

  state.projectiles.push({
    x: state.playerX, y: state.playerY,
    vx: Math.cos(state.aimAngle) * speed,
    vy: Math.sin(state.aimAngle) * speed,
    damage: dmg, radius, life: CM.BOLT_LIFE * 1.5,
    color: 0xcc88ff,
    fromEnemy: false, slowOnHit: true, piercing: true,
  });

  // Muzzle burst
  for (let i = 0; i < 8; i++) {
    const spread = (Math.random() - 0.5) * 1.2;
    const spd = 80 + Math.random() * 60;
    state.particles.push({
      x: state.playerX, y: state.playerY,
      vx: Math.cos(state.aimAngle + spread) * spd,
      vy: Math.sin(state.aimAngle + spread) * spd,
      life: 0.3, maxLife: 0.3,
      color: 0xcc88ff, size: 3 + Math.random() * 2,
    });
  }

  state.screenShake = Math.max(state.screenShake, CM.SHAKE_INTENSITY * 0.5);
  spawnFloatText(state, state.playerX, state.playerY - 20, "CHARGED!", 0xcc88ff, 1.2);
  state.boltCooldown = CM.BOLT_COOLDOWN * 2;
}

// ---------------------------------------------------------------------------
// Ability Synergies — combo two abilities quickly for bonus effects
// ---------------------------------------------------------------------------

function checkSynergy(state: CMState, newAbility: string): void {
  if (state.synergyTimer <= 0 || !state.lastAbilityUsed) {
    state.lastAbilityUsed = newAbility;
    state.synergyTimer = 2.0;
    return;
  }

  const combo = state.lastAbilityUsed + "+" + newAbility;
  let synergy = "";

  switch (combo) {
    case "dash+pulse":
      synergy = "TEMPORAL SHATTER";
      if (state.timeZones.length > 0) {
        const tz = state.timeZones[state.timeZones.length - 1];
        tz.radius *= 1.5;
        tz.life *= 1.5;
      }
      state.score += 20;
      break;
    case "pulse+dash":
      synergy = "PHASE SHIFT";
      for (let i = 0; i < 2; i++) {
        const ea = Math.random() * Math.PI * 2;
        const ed = 30 + Math.random() * 20;
        state.temporalEchoes.push({
          x: state.playerX + Math.cos(ea) * ed,
          y: state.playerY + Math.sin(ea) * ed,
          life: 0.6, maxLife: 0.6,
          explodeRadius: 35, damage: 1.5,
        });
      }
      state.score += 15;
      break;
    case "freeze+shift":
    case "shift+freeze":
      synergy = "TIME PARADOX";
      for (const e of state.enemies) {
        if (e.alive && e.frozenTimer > 0) {
          damageEnemy(state, e, 3);
        }
      }
      state.score += 30;
      break;
    case "pulse+freeze":
    case "freeze+pulse":
      synergy = "ABSOLUTE ZERO";
      for (const e of state.enemies) {
        if (e.alive && e.frozenTimer > 0) {
          e.frozenTimer += 2.0;
        }
      }
      state.score += 25;
      break;
    default:
      state.lastAbilityUsed = newAbility;
      state.synergyTimer = 2.0;
      return;
  }

  if (synergy) {
    state.synergyBonus = synergy;
    state.synergyTimer = 3.0;
    spawnFloatText(state, state.playerX, state.playerY - 40, synergy, CM.COLOR_GOLD, 1.5);
    spawnParticles(state, state.playerX, state.playerY, CM.COLOR_GOLD, 10);
    state.screenFlashColor = CM.COLOR_GOLD;
    state.screenFlashTimer = CM.FLASH_DURATION;
  }

  state.lastAbilityUsed = newAbility;
  state.synergyTimer = 2.0;
}

// ---------------------------------------------------------------------------
// Time Dash — blink forward leaving a temporal echo
// ---------------------------------------------------------------------------

export function tryDash(state: CMState): boolean {
  if (state.dashCooldown > 0) return false;

  checkSynergy(state, "dash");
  state.dashing = true;
  state.dashTimer = CM.DASH_DURATION;
  state.dashCooldown = state.dashCooldownMax;
  state.dashAngle = state.aimAngle;
  state.invulnTimer = CM.DASH_DURATION + 0.1;

  // Spawn temporal echo at current position (explodes after ECHO_DELAY)
  state.temporalEchoes.push({
    x: state.playerX,
    y: state.playerY,
    life: CM.ECHO_DELAY,
    maxLife: CM.ECHO_DELAY,
    explodeRadius: CM.ECHO_RADIUS,
    damage: CM.ECHO_DAMAGE,
  });

  // Dash trail particles
  for (let i = 0; i < 8; i++) {
    const a = Math.random() * Math.PI * 2;
    const spd = 20 + Math.random() * 50;
    state.particles.push({
      x: state.playerX + (Math.random() - 0.5) * 10,
      y: state.playerY + (Math.random() - 0.5) * 10,
      vx: Math.cos(a) * spd,
      vy: Math.sin(a) * spd,
      life: 0.35, maxLife: 0.35,
      color: CM.COLOR_ECHO, size: 2 + Math.random() * 1.5,
    });
  }

  return true;
}

// ---------------------------------------------------------------------------
// Time Pulse — slow-field burst around player
// ---------------------------------------------------------------------------

export function tryPulse(state: CMState): void {
  if (state.pulseCooldown > 0) return;
  state.pulseCooldown = state.pulseCooldownMax;
  checkSynergy(state, "pulse");

  // pulsePower upgrade is encoded externally in pulseCooldownMax reduction;
  // pulse radius scales with upgrade level (state does not store pulsePower directly,
  // so we infer the radius from the difference in pulseCooldownMax vs base)
  // Simple approach: always use base radius (upgrade info not in CMState at runtime)
  const pulseRadius = CM.PULSE_RADIUS;

  state.timeZones.push({
    x: state.playerX,
    y: state.playerY,
    radius: pulseRadius,
    life: CM.PULSE_DURATION,
    maxLife: CM.PULSE_DURATION,
    slowFactor: CM.PULSE_SLOW_FACTOR,
    kind: "pulse",
  });

  // Shockwave visual
  spawnShockwave(state, state.playerX, state.playerY, CM.COLOR_PULSE, pulseRadius * 1.2, 0.5);

  // Particles burst
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const spd = 60 + Math.random() * 40;
    state.particles.push({
      x: state.playerX,
      y: state.playerY,
      vx: Math.cos(a) * spd,
      vy: Math.sin(a) * spd,
      life: 0.5, maxLife: 0.5,
      color: CM.COLOR_PULSE, size: 2.5 + Math.random(),
    });
  }

  state.screenShake = Math.max(state.screenShake, CM.SHAKE_INTENSITY * 0.8);
  spawnFloatText(state, state.playerX, state.playerY - 28, "TIME PULSE", 0x6688ff, 1.1);
}

// ---------------------------------------------------------------------------
// Chrono Shift — rewind player to past position and restore HP
// ---------------------------------------------------------------------------

export function tryChronoShift(state: CMState): void {
  if (state.chronoShiftCooldown > 0 || state.positionHistory.length === 0) return;

  checkSynergy(state, "shift");
  state.chronoShiftActive = true;
  state.chronoShiftTimer = CM.CHRONO_SHIFT_DURATION;
  state.chronoShiftCooldown = state.chronoShiftCooldownMax;
  state.invulnTimer = CM.CHRONO_SHIFT_DURATION + 0.5;

  // Find snapshot from CHRONO_SHIFT_REWIND seconds ago (or earliest available)
  const targetTime = state.time - CM.CHRONO_SHIFT_REWIND;
  let snapshot = state.positionHistory[0];
  for (const snap of state.positionHistory) {
    if (snap.time >= targetTime) {
      snapshot = snap;
      break;
    }
  }

  // Particles at departure position
  spawnParticles(state, state.playerX, state.playerY, CM.COLOR_REWIND, 12);
  spawnShockwave(state, state.playerX, state.playerY, CM.COLOR_REWIND, 60, 0.4);

  // Teleport player to snapshot position immediately (rewind animation is visual in renderer)
  const oldX = state.playerX, oldY = state.playerY;
  state.playerX = snapshot.x;
  state.playerY = snapshot.y;
  state.playerHP = Math.min(state.maxHP, Math.max(state.playerHP, snapshot.hp));

  // Particles at arrival position
  spawnParticles(state, state.playerX, state.playerY, CM.COLOR_REWIND, 16);
  spawnShockwave(state, state.playerX, state.playerY, CM.COLOR_REWIND, 80, 0.6);
  spawnParticles(state, oldX, oldY, CM.COLOR_TIME_BRIGHT, 8);

  // Screen flash and shake
  state.screenFlashColor = CM.COLOR_REWIND;
  state.screenFlashTimer = CM.FLASH_DURATION * 4;
  state.screenShake = Math.max(state.screenShake, CM.SHAKE_INTENSITY * 2);
  state.timeDistortion = 1.0;

  spawnFloatText(state, state.playerX, state.playerY - 32, "CHRONO SHIFT", CM.COLOR_REWIND, 1.4);

  // Clear history forward from snapshot (can't rewind past what we rewound to)
  state.positionHistory = state.positionHistory.filter(s => s.time <= snapshot.time);
}

// ---------------------------------------------------------------------------
// Time Freeze — stops all non-chrono-knight enemies for 2 seconds
// ---------------------------------------------------------------------------

export function tryTimeFreeze(state: CMState): void {
  if (state.timeFreezeCooldown > 0) return;
  state.timeFreezeCooldown = state.timeFreezeCooldownMax;
  checkSynergy(state, "freeze");
  state.timeFreezeActive = true;
  state.timeFreezeTimer = 2.0;

  // Freeze all susceptible enemies
  for (const e of state.enemies) {
    if (!e.alive) continue;
    if (e.kind === "chrono_knight") continue; // immune
    e.frozenTimer = 2.0;
  }

  // Big shockwave and screen flash
  spawnShockwave(state, state.playerX, state.playerY, CM.COLOR_TIME_BRIGHT, state.arenaW, 0.6);
  spawnFloatText(state, state.arenaW / 2, state.arenaH / 2 - 50, "TIME STOP", CM.COLOR_TIME_BRIGHT, 2.0);
  state.screenFlashColor = CM.COLOR_TIME_BRIGHT;
  state.screenFlashTimer = CM.FLASH_DURATION * 4;
  state.screenShake = Math.max(state.screenShake, CM.SHAKE_INTENSITY * 2);
  state.timeDistortion = 0.8;

  // Burst particles
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    const spd = 80 + Math.random() * 60;
    state.particles.push({
      x: state.playerX,
      y: state.playerY,
      vx: Math.cos(a) * spd,
      vy: Math.sin(a) * spd,
      life: 0.6, maxLife: 0.6,
      color: CM.COLOR_TIME_BRIGHT, size: 3 + Math.random() * 2,
    });
  }
}

// ---------------------------------------------------------------------------
// Projectiles — time bolts (player) and arrows (enemy)
// ---------------------------------------------------------------------------

export function updateProjectiles(state: CMState, dt: number): boolean {
  let playerDied = false;

  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const p = state.projectiles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;

    // Expired or out of bounds
    if (p.life <= 0 || p.x < -20 || p.x > state.arenaW + 20 ||
        p.y < -20 || p.y > state.arenaH + 20) {
      state.projectiles.splice(i, 1);
      continue;
    }

    if (!p.fromEnemy) {
      // Player bolt — check enemy collisions
      let hit = false;
      for (const e of state.enemies) {
        if (!e.alive || e.spawnTimer > 0) continue;
        const d = dist(p.x, p.y, e.x, e.y);
        if (d < p.radius + e.radius) {
          // Apply slow on hit
          if (p.slowOnHit) {
            e.slowFactor = Math.min(e.slowFactor, CM.BOLT_SLOW_FACTOR);
            e.slowTimer = CM.BOLT_SLOW_DURATION;
          }
          damageEnemy(state, e, p.damage);
          // Spark particles
          spawnParticles(state, p.x, p.y, CM.COLOR_BOLT, 4);
          // Charged bolt creates time zone on hit
          if (p.radius > CM.BOLT_RADIUS * 1.3) {
            state.timeZones.push({
              x: p.x, y: p.y,
              radius: 40,
              life: 1.0, maxLife: 1.0,
              slowFactor: 0.3,
              kind: "echo_blast",
            });
          }
          hit = true;
          if (!p.piercing) break;
        }
      }
      if (hit && !p.piercing) {
        state.projectiles.splice(i, 1);
      }
    } else {
      // Enemy projectile — check player collision
      if (state.invulnTimer > 0 || state.dashing) continue;
      const d = dist(p.x, p.y, state.playerX, state.playerY);
      if (d < p.radius + state.playerRadius) {
        state.projectiles.splice(i, 1);
        if (hitPlayer(state, p.damage)) playerDied = true;
      }
    }
  }

  return playerDied;
}

// ---------------------------------------------------------------------------
// Enemy AI + time slow application
// ---------------------------------------------------------------------------

export function updateEnemies(state: CMState, dt: number): boolean {
  let playerDied = false;

  for (const e of state.enemies) {
    if (!e.alive) continue;

    // Spawn invulnerability window
    if (e.spawnTimer > 0) {
      e.spawnTimer -= dt;
      continue;
    }

    // Flash decay
    if (e.flashTimer > 0) e.flashTimer -= dt;

    // chrono_knight is immune to all time effects
    const isChronoKnight = e.kind === "chrono_knight";

    // Reset slowFactor at start of each frame (accumulated slows applied below)
    if (!isChronoKnight) {
      e.slowFactor = 1.0;

      // Time aura passive slow (if near player)
      const dToPlayer = dist(e.x, e.y, state.playerX, state.playerY);
      if (dToPlayer < state.timeAuraRadius) {
        e.slowFactor = Math.min(e.slowFactor, CM.TIME_AURA_SLOW);
      }

      // Applied slow (from bolts)
      if (e.slowTimer > 0) {
        e.slowTimer -= dt;
        e.slowFactor = Math.min(e.slowFactor, CM.BOLT_SLOW_FACTOR);
        if (e.slowTimer <= 0) e.slowTimer = 0;
      }

      // Time zone slows
      for (const tz of state.timeZones) {
        const dtz = dist(e.x, e.y, tz.x, tz.y);
        if (dtz < tz.radius + e.radius) {
          e.slowFactor = Math.min(e.slowFactor, tz.slowFactor);
        }
      }

      // Frozen (time stop) — skip movement entirely
      if (e.frozenTimer > 0) {
        e.frozenTimer -= dt * e.slowFactor;
        continue;
      }
    } else {
      // chrono_knight: always full speed, never frozen
      e.slowFactor = 1.0;
      e.frozenTimer = 0;
    }

    // State timer
    if (e.stateTimer > 0) e.stateTimer -= dt;

    // Effective speed
    const effSpeed = e.baseSpeed * e.slowFactor;

    // ------------------------------------------------------------------
    // Enemy AI by kind
    // ------------------------------------------------------------------
    switch (e.kind) {
      case "footman": {
        const d = dist(e.x, e.y, state.playerX, state.playerY);
        if (e.state === "attack") {
          if (e.stateTimer <= 0) {
            // Deal melee damage
            if (hitPlayer(state, CM.FOOTMAN_DAMAGE)) playerDied = true;
            e.state = "approach";
            e.stateTimer = 0.6; // cooldown before next attack swing
          }
        } else {
          if (d < CM.FOOTMAN_ATTACK_RANGE + state.playerRadius) {
            e.state = "attack";
            e.stateTimer = 0.25; // swing time
          } else {
            // Walk toward player
            const a = angle(e.x, e.y, state.playerX, state.playerY);
            e.x += Math.cos(a) * effSpeed * dt;
            e.y += Math.sin(a) * effSpeed * dt;
          }
        }
        break;
      }

      case "archer": {
        const d = dist(e.x, e.y, state.playerX, state.playerY);
        const keepDist = CM.ARCHER_KEEP_DIST;
        if (d < keepDist) {
          // Back away from player
          const a = angle(state.playerX, state.playerY, e.x, e.y);
          e.x += Math.cos(a) * effSpeed * dt;
          e.y += Math.sin(a) * effSpeed * dt;
        } else if (d > keepDist + 40) {
          // Close in
          const a = angle(e.x, e.y, state.playerX, state.playerY);
          e.x += Math.cos(a) * effSpeed * 0.6 * dt;
          e.y += Math.sin(a) * effSpeed * 0.6 * dt;
        }
        // Fire projectile
        e.fireTimer -= dt * e.slowFactor; // fire rate scales with slow
        if (e.fireTimer <= 0) {
          e.fireTimer = CM.ARCHER_FIRE_INTERVAL;
          const a = angle(e.x, e.y, state.playerX, state.playerY);
          const arrowSpd = 180;
          state.projectiles.push({
            x: e.x, y: e.y,
            vx: Math.cos(a) * arrowSpd,
            vy: Math.sin(a) * arrowSpd,
            damage: 1,
            radius: 4,
            life: 2.5,
            color: 0xff8822,
            fromEnemy: true,
            slowOnHit: false,
            piercing: false,
          });
          spawnParticles(state, e.x, e.y, 0xff8822, 2);
        }
        break;
      }

      case "shieldbearer": {
        const d = dist(e.x, e.y, state.playerX, state.playerY);
        // Shield always faces the player
        e.shieldAngle = angle(e.x, e.y, state.playerX, state.playerY);
        if (e.state === "attack") {
          if (e.stateTimer <= 0) {
            if (hitPlayer(state, CM.SHIELDBEARER_DAMAGE)) playerDied = true;
            e.state = "approach";
            e.stateTimer = 0.8;
          }
        } else {
          if (d < CM.SHIELDBEARER_ATTACK_RANGE + state.playerRadius) {
            e.state = "attack";
            e.stateTimer = 0.35;
          } else {
            const a = angle(e.x, e.y, state.playerX, state.playerY);
            e.x += Math.cos(a) * effSpeed * dt;
            e.y += Math.sin(a) * effSpeed * dt;
          }
        }
        break;
      }

      case "chrono_knight": {
        const d = dist(e.x, e.y, state.playerX, state.playerY);
        if (e.state === "attack") {
          if (e.stateTimer <= 0) {
            if (hitPlayer(state, CM.CHRONO_KNIGHT_DAMAGE)) playerDied = true;
            e.state = "approach";
            e.stateTimer = 0.5;
          }
        } else {
          if (d < CM.CHRONO_KNIGHT_ATTACK_RANGE + state.playerRadius) {
            e.state = "attack";
            e.stateTimer = 0.3;
          } else {
            const a = angle(e.x, e.y, state.playerX, state.playerY);
            e.x += Math.cos(a) * effSpeed * dt;
            e.y += Math.sin(a) * effSpeed * dt;
          }
        }
        break;
      }

      case "time_wraith": {
        // Erratic movement toward player
        const a = angle(e.x, e.y, state.playerX, state.playerY) + (Math.random() - 0.5) * 1.2;
        e.x += Math.cos(a) * effSpeed * dt;
        e.y += Math.sin(a) * effSpeed * dt;

        // Teleport every TELEPORT_INTERVAL (scaled by slow)
        e.teleportTimer -= dt * e.slowFactor;
        if (e.teleportTimer <= 0) {
          e.teleportTimer = CM.TIME_WRAITH_TELEPORT_INTERVAL;
          // Teleport to random position 40-80px from player
          const ta = Math.random() * Math.PI * 2;
          const td = randRange(40, 80);
          e.x = clamp(state.playerX + Math.cos(ta) * td, e.radius + 10, state.arenaW - e.radius - 10);
          e.y = clamp(state.playerY + Math.sin(ta) * td, e.radius + 10, state.arenaH - e.radius - 10);
          spawnParticles(state, e.x, e.y, CM.COLOR_TIME_BRIGHT, 4);
        }

        // Melee on contact
        const wd = dist(e.x, e.y, state.playerX, state.playerY);
        if (wd < e.radius + state.playerRadius + 4 && e.stateTimer <= 0) {
          if (hitPlayer(state, CM.TIME_WRAITH_DAMAGE)) playerDied = true;
          e.stateTimer = 0.7; // attack cooldown
        }
        break;
      }
    }

    // Constrain enemies to arena
    e.x = clamp(e.x, e.radius + 5, state.arenaW - e.radius - 5);
    e.y = clamp(e.y, e.radius + 5, state.arenaH - e.radius - 5);
  }

  return playerDied;
}

// ---------------------------------------------------------------------------
// Damage & kill
// ---------------------------------------------------------------------------

export function damageEnemy(state: CMState, enemy: CMEnemy, damage: number): void {
  // Shieldbearer: 75% damage reduction from frontal attacks
  if (enemy.kind === "shieldbearer") {
    // Check if incoming angle hits the shield face (within 90° of shieldAngle)
    const attackAngle = angle(state.playerX, state.playerY, enemy.x, enemy.y);
    const angleDiff = Math.abs(normalizeAngle(attackAngle - enemy.shieldAngle));
    if (angleDiff < Math.PI / 2) {
      damage *= 0.25; // 75% reduced
    }
  }

  enemy.hp -= damage;
  enemy.flashTimer = 0.1;

  if (enemy.hp <= 0) {
    killEnemy(state, enemy);
  } else {
    spawnParticles(state, enemy.x, enemy.y, getEnemyColor(enemy.kind), 3);
    spawnFloatText(state, enemy.x, enemy.y - 12, String(Math.ceil(damage)), CM.COLOR_TIME_BRIGHT, 0.8);
  }
}

function normalizeAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function killEnemy(state: CMState, enemy: CMEnemy): void {
  enemy.alive = false;
  state.enemiesKilled++;
  state.totalKills++;

  // Score based on kind
  let killScore = 0;
  switch (enemy.kind) {
    case "footman":       killScore = CM.FOOTMAN_SCORE; break;
    case "archer":        killScore = CM.ARCHER_SCORE; break;
    case "shieldbearer":  killScore = CM.SHIELDBEARER_SCORE; break;
    case "chrono_knight": killScore = CM.CHRONO_KNIGHT_SCORE; break;
    case "time_wraith":   killScore = CM.TIME_WRAITH_SCORE; break;
  }

  // Elite enemies worth 2x
  if (enemy.elite) killScore *= 2;

  // Combo multiplier
  const comboMult = 1 + Math.min(state.comboCount, 10) * 0.1;
  killScore = Math.floor(killScore * comboMult);
  state.score += killScore;

  // Combo tracking
  state.comboCount++;
  state.comboTimer = 2.0;
  state.bestCombo = Math.max(state.bestCombo, state.comboCount);

  // Kill streak tracking
  state.killStreakCount++;
  state.killStreakTimer = 3.0;
  if (state.killStreakCount === 2) {
    spawnFloatText(state, state.playerX, state.playerY - 36, "DOUBLE KILL!", CM.COLOR_TIME_BRIGHT, 1.1);
  } else if (state.killStreakCount === 3) {
    spawnFloatText(state, state.playerX, state.playerY - 36, "TRIPLE KILL!", CM.COLOR_BOLT, 1.2);
  } else if (state.killStreakCount === 4) {
    spawnFloatText(state, state.playerX, state.playerY - 36, "MEGA KILL!", CM.COLOR_GOLD, 1.3);
  } else if (state.killStreakCount >= 5) {
    spawnFloatText(state, state.playerX, state.playerY - 36, "UNSTOPPABLE!", CM.COLOR_GOLD, 1.5);
    state.screenShake = Math.max(state.screenShake, CM.SHAKE_INTENSITY * 1.5);
  }

  // Combo milestone celebrations
  if (state.comboCount === 10) {
    spawnFloatText(state, state.playerX, state.playerY - 45, "10x COMBO!", 0xffaa00, 1.6);
    state.score += 50;
  } else if (state.comboCount === 20) {
    spawnFloatText(state, state.playerX, state.playerY - 45, "20x COMBO!", 0xff6600, 2.0);
    state.score += 150;
    state.screenFlashColor = 0xff6600;
    state.screenFlashTimer = CM.FLASH_DURATION;
  } else if (state.comboCount === 50) {
    spawnFloatText(state, state.playerX, state.playerY - 45, "50x COMBO!!", 0xff2244, 2.5);
    state.score += 500;
    state.screenFlashColor = CM.COLOR_GOLD;
    state.screenFlashTimer = CM.FLASH_DURATION * 2;
    state.screenShake = CM.SHAKE_INTENSITY * 2;
  }

  // Pickups (random drops)
  const roll = Math.random();
  if (roll < 0.20) {
    state.pickups.push({ x: enemy.x, y: enemy.y, kind: "health", life: 8.0, radius: 7 });
  } else if (roll < 0.35) {
    state.pickups.push({ x: enemy.x, y: enemy.y, kind: "score_orb", life: 8.0, radius: 7 });
  } else if (roll < 0.45) {
    state.pickups.push({ x: enemy.x, y: enemy.y, kind: "chrono_charge", life: 8.0, radius: 7 });
  }

  // Blood stain
  state.bloodStains.push({ x: enemy.x, y: enemy.y, size: enemy.radius * 1.4 + Math.random() * 4, alpha: 0.6 + Math.random() * 0.3 });

  // Bonus score for killing enemies inside time zones
  let inTimeZone = false;
  for (const tz of state.timeZones) {
    if (dist(enemy.x, enemy.y, tz.x, tz.y) < tz.radius) {
      inTimeZone = true;
      break;
    }
  }
  if (inTimeZone) {
    const bonus = Math.floor(killScore * 0.5);
    killScore += bonus;
    state.score += bonus;
    spawnFloatText(state, enemy.x, enemy.y - 28, `TIME ZONE +${bonus}`, CM.COLOR_PULSE, 0.9);
  }

  // Kill streak 5+ extra score bonus text
  if (state.killStreakCount >= 5) {
    spawnFloatText(state, enemy.x, enemy.y - 38, `STREAK BONUS!`, CM.COLOR_GOLD, 0.9);
  }

  // Death effects
  const deathColor = getEnemyColor(enemy.kind);
  spawnShockwave(state, enemy.x, enemy.y, deathColor, enemy.radius * 3.5, 0.4);
  // Mixed particles — enemy color + time purple
  spawnParticles(state, enemy.x, enemy.y, deathColor, 8);
  spawnParticles(state, enemy.x, enemy.y, CM.COLOR_TIME, 4);
  // Temporal dissolve ring
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const spd = 50 + Math.random() * 30;
    state.particles.push({
      x: enemy.x, y: enemy.y,
      vx: Math.cos(a) * spd,
      vy: Math.sin(a) * spd,
      life: 0.5, maxLife: 0.5,
      color: 0x8866ff, size: 2 + Math.random(),
    });
  }
  spawnFloatText(state, enemy.x, enemy.y - 18, `+${killScore}`, CM.COLOR_GOLD, 1.0);
  // Hitstop for impactful feel
  state.hitstopFrames = 2;

  // Elite death: extra drama
  if (enemy.elite) {
    spawnParticles(state, enemy.x, enemy.y, CM.COLOR_GOLD, 10);
    spawnShockwave(state, enemy.x, enemy.y, CM.COLOR_GOLD, enemy.radius * 5, 0.5);
    state.screenShake = Math.max(state.screenShake, CM.SHAKE_INTENSITY * 1.5);
    state.hitstopFrames = 4;
  }
}

export function hitPlayer(state: CMState, damage: number): boolean {
  if (state.invulnTimer > 0 || state.dashing) return false;
  state.playerHP -= damage;
  state.invulnTimer = CM.INVULN_DURATION;
  state.screenShake = Math.max(state.screenShake, CM.SHAKE_INTENSITY * 2);
  state.screenFlashColor = CM.COLOR_DANGER;
  state.screenFlashTimer = CM.FLASH_DURATION;
  spawnParticles(state, state.playerX, state.playerY, CM.COLOR_DANGER, 8);
  // Reset combo on hit
  state.comboCount = 0;
  state.comboTimer = 0;
  return state.playerHP <= 0;
}

// ---------------------------------------------------------------------------
// Time zones — slow fields on the arena
// ---------------------------------------------------------------------------

export function updateTimeZones(state: CMState, dt: number): void {
  for (let i = state.timeZones.length - 1; i >= 0; i--) {
    const tz = state.timeZones[i];
    tz.life -= dt;
    if (tz.life <= 0) {
      state.timeZones.splice(i, 1);
      continue;
    }
    // Ambient particles inside zone
    if (Math.random() < 0.3) {
      const ta = Math.random() * Math.PI * 2;
      const tr = Math.random() * tz.radius;
      state.particles.push({
        x: tz.x + Math.cos(ta) * tr,
        y: tz.y + Math.sin(ta) * tr,
        vx: (Math.random() - 0.5) * 15,
        vy: (Math.random() - 0.5) * 15,
        life: 0.4, maxLife: 0.4,
        color: CM.COLOR_PULSE, size: 1 + Math.random(),
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Temporal echoes — delayed explosions
// ---------------------------------------------------------------------------

export function updateTemporalEchoes(state: CMState, dt: number): void {
  for (let i = state.temporalEchoes.length - 1; i >= 0; i--) {
    const echo = state.temporalEchoes[i];
    echo.life -= dt;
    if (echo.life <= 0) {
      // Explode — damage and slow all enemies within radius
      for (const e of state.enemies) {
        if (!e.alive) continue;
        const d = dist(echo.x, echo.y, e.x, e.y);
        if (d < echo.explodeRadius + e.radius) {
          damageEnemy(state, e, echo.damage);
          // Apply slow on explosion hit
          if (e.kind !== "chrono_knight") {
            e.slowFactor = Math.min(e.slowFactor, 0.3);
            e.slowTimer = Math.max(e.slowTimer, 2.0);
          }
        }
      }
      // Create lingering slow zone at echo position
      state.timeZones.push({
        x: echo.x, y: echo.y,
        radius: echo.explodeRadius * 0.7,
        life: 1.5, maxLife: 1.5,
        slowFactor: 0.4,
        kind: "echo_blast",
      });
      spawnShockwave(state, echo.x, echo.y, CM.COLOR_ECHO, echo.explodeRadius * 1.5, 0.5);
      spawnParticles(state, echo.x, echo.y, CM.COLOR_ECHO, 16);
      spawnParticles(state, echo.x, echo.y, 0xffffff, 6);
      state.screenShake = Math.max(state.screenShake, CM.SHAKE_INTENSITY);
      state.hitstopFrames = 3;
      state.temporalEchoes.splice(i, 1);
    }
  }
}

// ---------------------------------------------------------------------------
// Wave progression + enemy spawning
// ---------------------------------------------------------------------------

export function updateWave(state: CMState, dt: number): void {
  state.waveTimer -= dt;

  // Advance wave
  if (state.waveTimer <= 0) {
    state.wave++;
    state.waveTimer = CM.WAVE_INTERVAL;
    state.waveEventActive = "";
    state.waveAnnounceTimer = 2.0;

    // Wave events
    if (state.wave === 5) {
      state.waveEventActive = "TIME RIFT";
      spawnFloatText(state, state.arenaW / 2, state.arenaH / 2 - 50, "TIME RIFT", CM.COLOR_TIME_BRIGHT, 2.0);
      for (let i = 0; i < 3; i++) spawnSpecificEnemy(state, "time_wraith");
      state.screenFlashColor = CM.COLOR_TIME_BRIGHT;
      state.screenFlashTimer = CM.FLASH_DURATION * 3;
    } else if (state.wave === 8) {
      state.waveEventActive = "SHIELD WALL";
      spawnFloatText(state, state.arenaW / 2, state.arenaH / 2 - 50, "SHIELD WALL", 0x88aaff, 2.0);
      for (let i = 0; i < 5; i++) spawnSpecificEnemy(state, "shieldbearer");
      state.screenFlashColor = 0x88aaff;
      state.screenFlashTimer = CM.FLASH_DURATION * 3;
    } else if (state.wave === 10) {
      // Boss wave: Temporal Titan
      state.waveEventActive = "TEMPORAL TITAN";
      spawnBoss(state, "temporal_titan");
    } else if (state.wave === 12) {
      state.waveEventActive = "ARCHER STORM";
      spawnFloatText(state, state.arenaW / 2, state.arenaH / 2 - 50, "ARCHER STORM", 0xaacc44, 2.0);
      for (let i = 0; i < 6; i++) spawnSpecificEnemy(state, "archer");
      state.screenFlashColor = 0xaacc44;
      state.screenFlashTimer = CM.FLASH_DURATION * 3;
      state.screenShake = Math.max(state.screenShake, CM.SHAKE_INTENSITY * 2);
    } else if (state.wave === 15) {
      state.waveEventActive = "CHRONO LEGION";
      spawnFloatText(state, state.arenaW / 2, state.arenaH / 2 - 50, "CHRONO LEGION", 0xff6644, 2.0);
      for (let i = 0; i < 3; i++) spawnSpecificEnemy(state, "chrono_knight");
      state.screenFlashColor = 0xff6644;
      state.screenFlashTimer = CM.FLASH_DURATION * 4;
      state.screenShake = Math.max(state.screenShake, CM.SHAKE_INTENSITY * 3);
    } else if (state.wave === 20) {
      // Boss wave: Clockwork Hydra
      state.waveEventActive = "CLOCKWORK HYDRA";
      spawnBoss(state, "clockwork_hydra");
    } else if (state.wave === 25) {
      state.waveEventActive = "ELITE GUARD";
      spawnFloatText(state, state.arenaW / 2, state.arenaH / 2 - 50, "ELITE GUARD", 0x4488cc, 2.0);
      // 4 elite shieldbearers
      for (let i = 0; i < 4; i++) {
        const sb = spawnSpecificEnemy(state, "shieldbearer");
        sb.elite = true;
        sb.hp *= 2; sb.maxHp = sb.hp;
      }
      state.screenFlashColor = 0x4488cc;
      state.screenFlashTimer = CM.FLASH_DURATION * 4;
      state.screenShake = Math.max(state.screenShake, CM.SHAKE_INTENSITY * 2);
    } else if (state.wave === 30) {
      // Boss wave: Void Sovereign
      state.waveEventActive = "VOID SOVEREIGN";
      spawnBoss(state, "void_sovereign");
    } else if (state.wave > 30 && (state.wave - 30) % 10 === 0) {
      // Repeat boss cycle every 10 waves after 30, with HP scaling
      const cycle = Math.floor((state.wave - 30) / 10);
      const bossKinds: CMBossKind[] = ["temporal_titan", "clockwork_hydra", "void_sovereign"];
      const kind = bossKinds[cycle % bossKinds.length];
      state.waveEventActive = getBossName(kind);
      spawnBoss(state, kind);
    }
    // Additional wave events
    else if (state.wave === 3) {
      state.waveEventActive = "FIRST BLOOD";
      spawnFloatText(state, state.arenaW / 2, state.arenaH / 2 - 50, "FIRST BLOOD", 0xff4422, 1.8);
      // Spawn extra footmen to get the player warmed up
      for (let i = 0; i < 4; i++) spawnSpecificEnemy(state, "footman");
    }
    else if (state.wave === 6) {
      state.waveEventActive = "CROSSFIRE";
      spawnFloatText(state, state.arenaW / 2, state.arenaH / 2 - 50, "CROSSFIRE", 0xffaa00, 2.0);
      // 4 archers from each corner
      for (let i = 0; i < 4; i++) spawnSpecificEnemy(state, "archer");
      state.screenFlashColor = 0xffaa00;
      state.screenFlashTimer = CM.FLASH_DURATION * 2;
    }
    else if (state.wave === 9) {
      state.waveEventActive = "IRON PHALANX";
      spawnFloatText(state, state.arenaW / 2, state.arenaH / 2 - 50, "IRON PHALANX", 0x88aacc, 2.0);
      for (let i = 0; i < 3; i++) spawnSpecificEnemy(state, "shieldbearer");
      for (let i = 0; i < 2; i++) spawnSpecificEnemy(state, "archer");
    }
    else if (state.wave === 13) {
      state.waveEventActive = "PHANTOM ASSAULT";
      spawnFloatText(state, state.arenaW / 2, state.arenaH / 2 - 50, "PHANTOM ASSAULT", 0x9955ff, 2.0);
      for (let i = 0; i < 4; i++) spawnSpecificEnemy(state, "time_wraith");
      state.screenFlashColor = 0x9955ff;
      state.screenFlashTimer = CM.FLASH_DURATION * 3;
    }
    else if (state.wave === 17) {
      state.waveEventActive = "ELITE VANGUARD";
      spawnFloatText(state, state.arenaW / 2, state.arenaH / 2 - 50, "ELITE VANGUARD", CM.COLOR_GOLD, 2.0);
      // Spawn 3 random elite enemies
      const kinds17: CMEnemyKind[] = ["footman", "archer", "shieldbearer", "time_wraith"];
      for (let i = 0; i < 3; i++) {
        const e = spawnSpecificEnemy(state, kinds17[Math.floor(Math.random() * kinds17.length)]);
        e.elite = true;
        e.hp *= 2;
        e.maxHp = e.hp;
      }
      state.screenFlashColor = CM.COLOR_GOLD;
      state.screenFlashTimer = CM.FLASH_DURATION * 3;
    }
    else if (state.wave === 22) {
      state.waveEventActive = "TEMPORAL NEXUS";
      spawnFloatText(state, state.arenaW / 2, state.arenaH / 2 - 50, "TEMPORAL NEXUS", 0x22ffaa, 2.0);
      // Spawn time zones that help the player
      for (let i = 0; i < 3; i++) {
        state.timeZones.push({
          x: randRange(100, state.arenaW - 100),
          y: randRange(100, state.arenaH - 100),
          radius: 80,
          life: CM.WAVE_INTERVAL,
          maxLife: CM.WAVE_INTERVAL,
          slowFactor: 0.15,
          kind: "chrono_field",
        });
      }
      state.screenFlashColor = 0x22ffaa;
      state.screenFlashTimer = CM.FLASH_DURATION * 3;
    }
    else if (state.wave === 27) {
      state.waveEventActive = "CHRONO PURGE";
      spawnFloatText(state, state.arenaW / 2, state.arenaH / 2 - 50, "CHRONO PURGE", 0xff2244, 2.5);
      // Spawn 4 chrono knights + 2 shieldbearers — a serious challenge
      for (let i = 0; i < 4; i++) spawnSpecificEnemy(state, "chrono_knight");
      for (let i = 0; i < 2; i++) spawnSpecificEnemy(state, "shieldbearer");
      state.screenFlashColor = 0xff2244;
      state.screenFlashTimer = CM.FLASH_DURATION * 4;
      state.screenShake = CM.SHAKE_INTENSITY * 3;
    }
    // Repeating events after wave 30
    else if (state.wave > 30 && state.wave % 5 === 0 && state.wave % 10 !== 0) {
      // Random hard event every 5 waves (non-boss)
      const events = ["HORDE", "ELITE SWARM", "PHANTOM RUSH"];
      const eventIdx = Math.floor(Math.random() * events.length);
      state.waveEventActive = events[eventIdx];
      spawnFloatText(state, state.arenaW / 2, state.arenaH / 2 - 50, events[eventIdx], 0xff6644, 2.0);

      if (eventIdx === 0) {
        // HORDE: 10 footmen
        for (let i = 0; i < 10; i++) spawnSpecificEnemy(state, "footman");
      } else if (eventIdx === 1) {
        // ELITE SWARM: 4 random elites
        const kindsSwarm: CMEnemyKind[] = ["footman", "shieldbearer", "chrono_knight", "time_wraith"];
        for (let i = 0; i < 4; i++) {
          const e = spawnSpecificEnemy(state, kindsSwarm[Math.floor(Math.random() * kindsSwarm.length)]);
          e.elite = true;
          e.hp *= 2;
          e.maxHp = e.hp;
        }
      } else {
        // PHANTOM RUSH: 6 time wraiths
        for (let i = 0; i < 6; i++) spawnSpecificEnemy(state, "time_wraith");
      }
      state.screenFlashColor = 0xff6644;
      state.screenFlashTimer = CM.FLASH_DURATION * 3;
    }

    // Arena hazards every 4 waves
    if (state.wave > 0 && state.wave % 4 === 0 && !state.bossWave) {
      const hazardCount = 1 + Math.floor(state.wave / 8);
      const kinds: Array<CMHazard["kind"]> = ["temporal_rift", "time_accelerator", "void_well"];
      for (let hi = 0; hi < Math.min(3, hazardCount); hi++) {
        const hKind = kinds[Math.floor(Math.random() * kinds.length)];
        state.arenaHazards.push({
          x: randRange(60, state.arenaW - 60),
          y: randRange(60, state.arenaH - 60),
          kind: hKind,
          radius: hKind === "void_well" ? 50 : 40,
          life: CM.WAVE_INTERVAL, maxLife: CM.WAVE_INTERVAL,
          active: true,
          activeTimer: 2.0 + Math.random() * 2,
        });
      }
    }
  }

  // Regular enemy spawning
  state.enemySpawnTimer -= dt;
  const aliveCount = state.enemies.filter(e => e.alive).length;
  if (state.enemySpawnTimer <= 0 && aliveCount < CM.ENEMY_MAX) {
    state.enemySpawnTimer = CM.ENEMY_SPAWN_INTERVAL;
    spawnEnemy(state);
  }
}

// ---------------------------------------------------------------------------
// Boss system
// ---------------------------------------------------------------------------

function getBossName(kind: CMBossKind): string {
  switch (kind) {
    case "temporal_titan":  return "TEMPORAL TITAN";
    case "clockwork_hydra": return "CLOCKWORK HYDRA";
    case "void_sovereign":  return "VOID SOVEREIGN";
  }
}

function spawnBoss(state: CMState, kind: CMBossKind): void {
  const hpMap: Record<CMBossKind, number> = {
    temporal_titan: 50,
    clockwork_hydra: 40,
    void_sovereign: 60,
  };
  // HP scales after wave 30 — extra run-throughs increase HP
  const extraCycles = Math.max(0, Math.floor((state.wave - 30) / 10));
  const hpScale = 1 + extraCycles * 0.5;
  const baseHp = Math.ceil(hpMap[kind] * hpScale);
  state.boss = {
    x: state.arenaW / 2, y: 50,
    hp: baseHp, maxHp: baseHp,
    kind, radius: 22, speed: 40,
    phase: 0, phaseTimer: 6.0,
    attackTimer: 0, alive: true, flashTimer: 0,
    shieldHP: kind === "void_sovereign" ? 15 : 10,
  };
  state.bossWave = true;
  state.bossAnnounceTimer = 2.5;
  spawnFloatText(state, state.arenaW / 2, state.arenaH / 2 - 60, getBossName(kind), CM.COLOR_TIME_BRIGHT, 2.5);
  state.screenFlashColor = CM.COLOR_TIME_BRIGHT;
  state.screenFlashTimer = CM.FLASH_DURATION * 5;
  state.screenShake = CM.SHAKE_INTENSITY * 3;
}

export function updateBoss(state: CMState, dt: number): boolean {
  const b = state.boss;
  if (!b || !b.alive) return false;

  let playerDied = false;

  // Flash decay
  if (b.flashTimer > 0) b.flashTimer -= dt;

  // Announce timer
  if (state.bossAnnounceTimer > 0) {
    state.bossAnnounceTimer -= dt;
  }

  // Phase timer
  b.phaseTimer -= dt;
  if (b.phaseTimer <= 0) {
    b.phase = Math.min(b.phase + 1, 2);
    b.phaseTimer = 8.0;
    spawnFloatText(state, b.x, b.y - 40, `PHASE ${b.phase + 1}`, CM.COLOR_DANGER, 1.8);
    state.screenShake = Math.max(state.screenShake, CM.SHAKE_INTENSITY * 2);
  }

  // Shield regen: 2 per second up to starting shield
  const maxShield = b.kind === "void_sovereign" ? 15 : 10;
  b.shieldHP = Math.min(maxShield, b.shieldHP + 2 * dt);

  b.attackTimer -= dt;

  switch (b.kind) {
    case "temporal_titan": {
      if (b.phase === 0) {
        // Charge at player fast
        const a = angle(b.x, b.y, state.playerX, state.playerY);
        b.x += Math.cos(a) * 90 * dt;
        b.y += Math.sin(a) * 90 * dt;
        // Contact damage
        const d = dist(b.x, b.y, state.playerX, state.playerY);
        if (d < b.radius + state.playerRadius + 4 && b.attackTimer <= 0) {
          if (hitPlayer(state, 2)) playerDied = true;
          b.attackTimer = 0.8;
        }
      } else if (b.phase === 1) {
        // Move steadily, ground slam every 2.5s
        const a = angle(b.x, b.y, state.playerX, state.playerY);
        b.x += Math.cos(a) * 45 * dt;
        b.y += Math.sin(a) * 45 * dt;
        if (b.attackTimer <= 0) {
          b.attackTimer = 2.5;
          // Ground slam shockwave — hurt player if in 100px radius
          spawnShockwave(state, b.x, b.y, 0xff8844, 100, 0.5);
          spawnParticles(state, b.x, b.y, 0xff8844, 12);
          state.screenShake = Math.max(state.screenShake, CM.SHAKE_INTENSITY * 1.5);
          const sd = dist(b.x, b.y, state.playerX, state.playerY);
          if (sd < 100 + state.playerRadius) {
            if (hitPlayer(state, 2)) playerDied = true;
          }
        }
      } else {
        // Phase 2: summon footmen, slow move, slow HP regen
        const a = angle(b.x, b.y, state.playerX, state.playerY);
        b.x += Math.cos(a) * 30 * dt;
        b.y += Math.sin(a) * 30 * dt;
        if (b.attackTimer <= 0) {
          b.attackTimer = 5.0;
          // Summon 3 footmen
          for (let i = 0; i < 3; i++) spawnSpecificEnemy(state, "footman");
          spawnFloatText(state, b.x, b.y - 30, "SUMMON!", CM.COLOR_DANGER, 1.2);
        }
        // 3% HP regen per second
        b.hp = Math.min(b.maxHp, b.hp + b.maxHp * 0.03 * dt);
      }
      break;
    }

    case "clockwork_hydra": {
      // Orbit slowly around center
      const cx = state.arenaW / 2, cy = state.arenaH / 2;
      const orbitA = angle(cx, cy, b.x, b.y) + 0.6 * dt;
      const orbitR = dist(cx, cy, b.x, b.y);
      const targetR = 120;
      const r = orbitR + (targetR - orbitR) * 0.05;
      b.x = cx + Math.cos(orbitA) * r;
      b.y = cy + Math.sin(orbitA) * r;

      if (b.phase === 0) {
        // Fan shot every 2s
        if (b.attackTimer <= 0) {
          b.attackTimer = 2.0;
          const baseA = angle(b.x, b.y, state.playerX, state.playerY);
          for (let i = 0; i < 7; i++) {
            const spread = ((i - 3) / 6) * (Math.PI * 0.8);
            const a = baseA + spread;
            state.projectiles.push({
              x: b.x, y: b.y,
              vx: Math.cos(a) * 160, vy: Math.sin(a) * 160,
              damage: 1, radius: 5, life: 2.5,
              color: 0x44ffcc, fromEnemy: true, slowOnHit: false, piercing: false,
            });
          }
          spawnParticles(state, b.x, b.y, 0x44ffcc, 8);
        }
      } else if (b.phase === 1) {
        // Spawn speed-up time zones every 4s
        if (b.attackTimer <= 0) {
          b.attackTimer = 4.0;
          // Spawn 2 "haste zones" (we use slowFactor > 1 = enemy speed boost via negative slow)
          for (let i = 0; i < 2; i++) {
            const za = Math.random() * Math.PI * 2;
            const zr = 80 + Math.random() * 80;
            state.timeZones.push({
              x: state.arenaW / 2 + Math.cos(za) * zr,
              y: state.arenaH / 2 + Math.sin(za) * zr,
              radius: 55, life: 5.0, maxLife: 5.0,
              slowFactor: 1.5, // >1 = speed boost (enemies in zone move 1.5x faster)
              kind: "chrono_field",
            });
          }
          spawnFloatText(state, b.x, b.y - 30, "HASTE FIELD!", 0x44ffcc, 1.2);
        }
      } else {
        // Phase 2: split into chrono knights
        if (b.attackTimer <= 0) {
          b.attackTimer = 8.0;
          for (let i = 0; i < 3; i++) spawnSpecificEnemy(state, "chrono_knight");
          spawnFloatText(state, b.x, b.y - 30, "SPLIT!", 0x44ffcc, 1.4);
          spawnShockwave(state, b.x, b.y, 0x44ffcc, 80, 0.5);
          state.screenShake = Math.max(state.screenShake, CM.SHAKE_INTENSITY * 1.5);
        }
      }
      break;
    }

    case "void_sovereign": {
      // Float around menacingly
      const t = state.time * 0.4;
      const targetX = state.arenaW / 2 + Math.cos(t) * 100;
      const targetY = state.arenaH / 2 + Math.sin(t * 0.7) * 80;
      b.x += (targetX - b.x) * 2 * dt;
      b.y += (targetY - b.y) * 2 * dt;

      if (b.phase === 0) {
        // Spawn void zones every 3s
        if (b.attackTimer <= 0) {
          b.attackTimer = 3.0;
          // Random dark purple void zone near player
          const za = Math.random() * Math.PI * 2;
          const zr = 40 + Math.random() * 80;
          const vzx = clamp(state.playerX + Math.cos(za) * zr, 30, state.arenaW - 30);
          const vzy = clamp(state.playerY + Math.sin(za) * zr, 30, state.arenaH - 30);
          // Void zone = danger zone that damages player; we mark via chrono_field kind
          // and handle damage separately below via shockwave-like trigger
          spawnShockwave(state, vzx, vzy, 0x440066, 50, 3.0);
          spawnFloatText(state, vzx, vzy - 20, "VOID ZONE", 0x880088, 1.0);
          // Immediate damage check — if player is in zone
          if (dist(vzx, vzy, state.playerX, state.playerY) < 50 + state.playerRadius) {
            if (hitPlayer(state, 1)) playerDied = true;
          }
        }
      } else if (b.phase === 1) {
        // Homing projectiles every 2s
        if (b.attackTimer <= 0) {
          b.attackTimer = 2.0;
          // Fire 3 homing-ish projectiles (they slowly curve toward player)
          for (let i = 0; i < 3; i++) {
            const baseA = angle(b.x, b.y, state.playerX, state.playerY);
            const spread = ((i - 1) / 2) * 0.6;
            const a = baseA + spread;
            state.projectiles.push({
              x: b.x, y: b.y,
              vx: Math.cos(a) * 130, vy: Math.sin(a) * 130,
              damage: 1, radius: 5, life: 3.5,
              color: 0xaa44ff, fromEnemy: true, slowOnHit: false, piercing: false,
            });
          }
          spawnParticles(state, b.x, b.y, 0xaa44ff, 8);
        }
      } else {
        // Phase 2: speed up all enemies 2x by lowering their slowFactor
        // (time warp effect — represented by boosting their slowFactor to 1 + extra)
        for (const e of state.enemies) {
          if (!e.alive || e.frozenTimer > 0) continue;
          e.slowFactor = Math.min(e.slowFactor * 2.0, 2.0);
        }
        if (b.attackTimer <= 0) {
          b.attackTimer = 5.0;
          spawnFloatText(state, state.arenaW / 2, state.arenaH / 2 - 60, "TIME WARP!", 0xaa44ff, 1.8);
          state.screenShake = Math.max(state.screenShake, CM.SHAKE_INTENSITY * 1.5);
          state.timeDistortion = 0.6;
        }
      }
      break;
    }
  }

  // Constrain boss to arena
  b.x = clamp(b.x, b.radius + 5, state.arenaW - b.radius - 5);
  b.y = clamp(b.y, b.radius + 5, state.arenaH - b.radius - 5);

  // Boss death
  if (b.hp <= 0) {
    b.alive = false;
    state.bossWave = false;
    state.score += 500 * (1 + Math.floor((state.wave - 10) / 10));
    spawnFloatText(state, b.x, b.y - 50, "BOSS DEFEATED!", CM.COLOR_GOLD, 2.0);
    spawnShockwave(state, b.x, b.y, CM.COLOR_GOLD, 200, 1.0);
    spawnParticles(state, b.x, b.y, CM.COLOR_GOLD, 24);
    state.screenFlashColor = CM.COLOR_GOLD;
    state.screenFlashTimer = CM.FLASH_DURATION * 6;
    state.screenShake = CM.SHAKE_INTENSITY * 4;
    // Drop health on boss kill
    state.pickups.push({ x: b.x, y: b.y, kind: "health", life: 12.0, radius: 9 });
    state.pickups.push({ x: b.x + 20, y: b.y, kind: "chrono_charge", life: 12.0, radius: 9 });
  }

  return playerDied;
}

export function checkBossProjectileHits(state: CMState): void {
  const b = state.boss;
  if (!b || !b.alive) return;

  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const p = state.projectiles[i];
    if (p.fromEnemy) continue;
    const d = dist(p.x, p.y, b.x, b.y);
    if (d < p.radius + b.radius) {
      let dmg = p.damage;
      // Shield absorbs first
      if (b.shieldHP > 0) {
        const shieldAbsorb = Math.min(b.shieldHP, dmg);
        b.shieldHP -= shieldAbsorb;
        dmg -= shieldAbsorb;
        spawnFloatText(state, p.x, p.y, "SHIELD", 0x8888ff, 0.8);
      }
      if (dmg > 0) {
        b.hp -= dmg;
        b.flashTimer = 0.1;
        spawnParticles(state, p.x, p.y, CM.COLOR_GOLD, 5);
        spawnFloatText(state, b.x, b.y - 20, String(Math.ceil(dmg)), CM.COLOR_GOLD, 1.0);
      }
      if (!p.piercing) {
        state.projectiles.splice(i, 1);
      }
    }
  }
}

export function spawnEnemy(state: CMState): CMEnemy {
  // Determine available kinds by wave
  const kinds: CMEnemyKind[] = ["footman"];
  if (state.wave >= 2) kinds.push("archer");
  if (state.wave >= 4) kinds.push("shieldbearer");
  if (state.wave >= 5) kinds.push("time_wraith");
  if (state.wave >= 7) kinds.push("chrono_knight");

  const kind = kinds[Math.floor(Math.random() * kinds.length)];
  return spawnSpecificEnemy(state, kind);
}

function spawnSpecificEnemy(state: CMState, kind: CMEnemyKind): CMEnemy {
  // HP scaling: +15% per wave
  const hpScale = 1 + state.wave * 0.15;

  let hp = 0, speed = 0, radius = 0;
  switch (kind) {
    case "footman":
      hp = CM.FOOTMAN_HP; speed = CM.FOOTMAN_SPEED; radius = CM.FOOTMAN_RADIUS; break;
    case "archer":
      hp = CM.ARCHER_HP; speed = CM.ARCHER_SPEED; radius = CM.ARCHER_RADIUS; break;
    case "shieldbearer":
      hp = CM.SHIELDBEARER_HP; speed = CM.SHIELDBEARER_SPEED; radius = CM.SHIELDBEARER_RADIUS; break;
    case "chrono_knight":
      hp = CM.CHRONO_KNIGHT_HP; speed = CM.CHRONO_KNIGHT_SPEED; radius = CM.CHRONO_KNIGHT_RADIUS; break;
    case "time_wraith":
      hp = CM.TIME_WRAITH_HP; speed = CM.TIME_WRAITH_SPEED; radius = CM.TIME_WRAITH_RADIUS; break;
  }

  hp = Math.ceil(hp * hpScale);

  // Speed scaling after wave 10: +3% per wave
  if (state.wave > 10) {
    speed *= 1 + (state.wave - 10) * 0.03;
  }

  // Elite: 15% chance after wave 8 (2x HP, gold border)
  const isElite = state.wave >= 8 && Math.random() < 0.15;
  if (isElite) hp *= 2;

  // Random edge spawn
  const edge = Math.floor(Math.random() * 4);
  let ex = 0, ey = 0;
  switch (edge) {
    case 0: ex = randRange(radius, state.arenaW - radius); ey = radius + 5; break;
    case 1: ex = randRange(radius, state.arenaW - radius); ey = state.arenaH - radius - 5; break;
    case 2: ex = radius + 5; ey = randRange(radius, state.arenaH - radius); break;
    case 3: ex = state.arenaW - radius - 5; ey = randRange(radius, state.arenaH - radius); break;
  }

  const enemy: CMEnemy = {
    eid: `e${state.nextEnemyId++}`,
    x: ex, y: ey,
    hp, maxHp: hp,
    kind,
    alive: true,
    radius,
    speed,
    baseSpeed: speed,
    flashTimer: 0,
    state: "approach",
    stateTimer: 0,
    slowFactor: 1.0,
    slowTimer: 0,
    frozenTimer: 0,
    spawnTimer: 0.6,
    elite: isElite,
    fireTimer: CM.ARCHER_FIRE_INTERVAL * Math.random(), // stagger archer shots
    shieldAngle: 0,
    teleportTimer: CM.TIME_WRAITH_TELEPORT_INTERVAL * Math.random(),
  };

  state.enemies.push(enemy);
  return enemy;
}

// ---------------------------------------------------------------------------
// Timer and visual effect updates
// ---------------------------------------------------------------------------

export function updateTimers(state: CMState, dt: number): void {
  // Screen shake decay
  if (state.screenShake > 0) {
    state.screenShake = Math.max(0, state.screenShake - CM.SHAKE_INTENSITY * 3 * dt);
  }

  // Screen flash decay
  if (state.screenFlashTimer > 0) {
    state.screenFlashTimer = Math.max(0, state.screenFlashTimer - dt);
  }

  // Combo timer — reset comboCount when expired
  if (state.comboTimer > 0) {
    state.comboTimer -= dt;
    if (state.comboTimer <= 0) {
      state.comboCount = 0;
      state.comboTimer = 0;
    }
  }

  // Kill streak timer
  if (state.killStreakTimer > 0) {
    state.killStreakTimer -= dt;
    if (state.killStreakTimer <= 0) {
      state.killStreakCount = 0;
      state.killStreakTimer = 0;
    }
  }

  // Hitstop frames
  if (state.hitstopFrames > 0) state.hitstopFrames--;

  // Time distortion decay
  if (state.timeDistortion > 0) {
    state.timeDistortion *= 0.95;
    if (state.timeDistortion < 0.01) state.timeDistortion = 0;
  }

  // Chrono shift active animation: if chronoShiftActive, count down and then deactivate
  if (state.chronoShiftActive) {
    state.chronoShiftTimer -= dt;
    if (state.chronoShiftTimer <= 0) {
      state.chronoShiftActive = false;
      state.chronoShiftTimer = 0;
    }
  }

  // Synergy timer decay
  if (state.synergyTimer > 0) {
    state.synergyTimer -= dt;
    if (state.synergyTimer <= 0) {
      state.synergyBonus = "";
      state.lastAbilityUsed = "";
    }
  }

  // Wave announce timer
  if (state.waveAnnounceTimer > 0) state.waveAnnounceTimer -= dt;

  // Advance game time
  state.time += dt;

  // Score ticks up over time
  state.score += CM.SCORE_PER_SECOND * dt;
}

export function updateParticles(state: CMState, dt: number): void {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.92;
    p.vy *= 0.92;
    p.life -= dt;
    if (p.life <= 0) state.particles.splice(i, 1);
  }
}

export function updateFloatTexts(state: CMState, dt: number): void {
  for (let i = state.floatTexts.length - 1; i >= 0; i--) {
    const ft = state.floatTexts[i];
    ft.y -= 28 * dt; // float upward
    ft.life -= dt;
    if (ft.life <= 0) state.floatTexts.splice(i, 1);
  }
}

export function updateShockwaves(state: CMState, dt: number): void {
  for (let i = state.shockwaves.length - 1; i >= 0; i--) {
    const sw = state.shockwaves[i];
    sw.life -= dt;
    const progress = 1 - sw.life / sw.maxLife;
    sw.radius = sw.maxRadius * progress;
    if (sw.life <= 0) state.shockwaves.splice(i, 1);
  }
}

export function updatePickups(state: CMState, dt: number): void {
  for (let i = state.pickups.length - 1; i >= 0; i--) {
    const p = state.pickups[i];
    p.life -= dt;
    if (p.life <= 0) {
      state.pickups.splice(i, 1);
      continue;
    }

    // Magnetic attraction when player is near
    const attractDist = 80;
    const d0 = dist(p.x, p.y, state.playerX, state.playerY);
    if (d0 < attractDist && d0 > 0) {
      const attractSpeed = 120 * (1 - d0 / attractDist); // faster when closer
      const attractAngle = angle(p.x, p.y, state.playerX, state.playerY);
      p.x += Math.cos(attractAngle) * attractSpeed * dt;
      p.y += Math.sin(attractAngle) * attractSpeed * dt;
    }

    const d = dist(p.x, p.y, state.playerX, state.playerY);
    if (d < p.radius + state.playerRadius + 5) {
      switch (p.kind) {
        case "health":
          state.playerHP = Math.min(state.maxHP, state.playerHP + 1);
          spawnFloatText(state, p.x, p.y, "+1 HP", 0x44ff44, 1.2);
          spawnParticles(state, p.x, p.y, 0x44ff44, 6);
          break;
        case "score_orb":
          state.score += 30;
          spawnFloatText(state, p.x, p.y, "+30", CM.COLOR_GOLD, 1.0);
          spawnParticles(state, p.x, p.y, CM.COLOR_GOLD, 4);
          break;
        case "chrono_charge":
          state.chronoShiftCooldown = Math.max(0, state.chronoShiftCooldown - 5.0);
          spawnFloatText(state, p.x, p.y, "-5s CHRONO", CM.COLOR_REWIND, 1.0);
          spawnParticles(state, p.x, p.y, CM.COLOR_REWIND, 5);
          break;
      }
      state.pickups.splice(i, 1);
    }
  }
}

// ---------------------------------------------------------------------------
// Arena Hazards
// ---------------------------------------------------------------------------

export function updateHazards(state: CMState, dt: number): boolean {
  let playerHit = false;

  for (let i = state.arenaHazards.length - 1; i >= 0; i--) {
    const h = state.arenaHazards[i];
    h.life -= dt;
    if (h.life <= 0) { state.arenaHazards.splice(i, 1); continue; }

    // Toggle active state
    h.activeTimer -= dt;
    if (h.activeTimer <= 0) {
      h.active = !h.active;
      h.activeTimer = h.kind === "temporal_rift" ? 2.0 : h.kind === "time_accelerator" ? 3.0 : 2.5;
    }

    if (!h.active) continue;

    switch (h.kind) {
      case "temporal_rift": {
        const pd = dist(h.x, h.y, state.playerX, state.playerY);
        if (pd < h.radius + state.playerRadius && state.invulnTimer <= 0 && !state.dashing) {
          if (hitPlayer(state, 1)) playerHit = true;
        }
        for (const e of state.enemies) {
          if (!e.alive || e.spawnTimer > 0) continue;
          const ed = dist(h.x, h.y, e.x, e.y);
          if (ed < h.radius + e.radius) {
            damageEnemy(state, e, 0.5 * dt);
          }
        }
        break;
      }
      case "time_accelerator": {
        for (const e of state.enemies) {
          if (!e.alive) continue;
          const ed = dist(h.x, h.y, e.x, e.y);
          if (ed < h.radius + e.radius) {
            e.slowFactor = Math.max(e.slowFactor, 1.3);
          }
        }
        break;
      }
      case "void_well": {
        const pullStrength = 40;
        const pd = dist(h.x, h.y, state.playerX, state.playerY);
        if (pd < h.radius && pd > 5) {
          const pa = angle(state.playerX, state.playerY, h.x, h.y);
          state.playerX += Math.cos(pa) * pullStrength * dt;
          state.playerY += Math.sin(pa) * pullStrength * dt;
        }
        for (const e of state.enemies) {
          if (!e.alive) continue;
          const ed = dist(h.x, h.y, e.x, e.y);
          if (ed < h.radius && ed > 5) {
            const ea = angle(e.x, e.y, h.x, h.y);
            e.x += Math.cos(ea) * pullStrength * 0.7 * dt;
            e.y += Math.sin(ea) * pullStrength * 0.7 * dt;
          }
        }
        break;
      }
    }
  }

  return playerHit;
}

// ---------------------------------------------------------------------------
// Spawn helpers (exported for use by orchestrator / renderer)
// ---------------------------------------------------------------------------

export function spawnParticles(state: CMState, x: number, y: number, color: number, count: number): void {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const spd = 30 + Math.random() * 80;
    state.particles.push({
      x: x + (Math.random() - 0.5) * 4,
      y: y + (Math.random() - 0.5) * 4,
      vx: Math.cos(a) * spd,
      vy: Math.sin(a) * spd,
      life: 0.3 + Math.random() * 0.4,
      maxLife: 0.7,
      color,
      size: 1.5 + Math.random() * 2,
    });
  }
}

export function spawnFloatText(state: CMState, x: number, y: number, text: string, color: number, scale: number): void {
  state.floatTexts.push({
    x, y,
    text, color,
    life: 1.0, maxLife: 1.0,
    scale,
  });
}

export function spawnShockwave(state: CMState, x: number, y: number, color: number, maxRadius: number, duration: number): void {
  state.shockwaves.push({ x, y, radius: 0, maxRadius, life: duration, maxLife: duration, color });
}

export function spawnDeathEffect(state: CMState): void {
  // Player death — big explosion effect
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2 + Math.random() * 0.3;
    const spd = 80 + Math.random() * 120;
    const colors = [CM.COLOR_DANGER, CM.COLOR_TIME_BRIGHT, 0xff8844, 0xffffff];
    state.particles.push({
      x: state.playerX, y: state.playerY,
      vx: Math.cos(a) * spd,
      vy: Math.sin(a) * spd,
      life: 1.0 + Math.random() * 0.5,
      maxLife: 1.5,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 3 + Math.random() * 3,
    });
  }
  spawnShockwave(state, state.playerX, state.playerY, CM.COLOR_DANGER, 100, 0.8);
  spawnShockwave(state, state.playerX, state.playerY, CM.COLOR_TIME_BRIGHT, 60, 0.5);
  state.screenFlashColor = CM.COLOR_DANGER;
  state.screenFlashTimer = CM.FLASH_DURATION * 5;
  state.screenShake = CM.SHAKE_INTENSITY * 5;
}

// ---------------------------------------------------------------------------
// Color helper
// ---------------------------------------------------------------------------

export function getEnemyColor(kind: CMEnemyKind): number {
  switch (kind) {
    case "footman":       return 0xcc6644;
    case "archer":        return 0xaacc44;
    case "shieldbearer":  return 0x4488cc;
    case "chrono_knight": return 0xff6622;
    case "time_wraith":   return CM.COLOR_TIME_BRIGHT;
  }
}
