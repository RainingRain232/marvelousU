// ---------------------------------------------------------------------------
// Pendulum — The Clockwork Knight — core game systems
// ---------------------------------------------------------------------------

import { PENDULUM } from "../config/PendulumConfig";
import type {
  PendulumState, Enemy, EnemyType, Vec3, PendulumParticle, WaveModifier, BuffId, SpawnEntry,
} from "../state/PendulumState";
import { genPendulumId, WAVE_MODIFIER_NAMES, WAVE_MODIFIER_COLORS, BUFF_POOL } from "../state/PendulumState";

// ---- Helpers ----

function distXZ(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x, dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

function normalize3(v: Vec3): Vec3 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len < 0.0001) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

/** Clamp-subtract HP — never go below 0 */
function hpDamage(current: number, dmg: number): number {
  return Math.max(0, current - dmg);
}

function addNotification(state: PendulumState, text: string, color: number): void {
  state.notifications.push({ text, timer: 3.0, color });
  if (state.notifications.length > 8) state.notifications.shift();
}

function spawnParticles(
  state: PendulumState, pos: Vec3, count: number,
  type: PendulumParticle["type"], color: number, speed: number, life: number,
): void {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const elev = (Math.random() - 0.3) * Math.PI;
    const s = speed * (0.5 + Math.random() * 0.5);
    state.particles.push({
      pos: { x: pos.x, y: pos.y, z: pos.z },
      vel: {
        x: Math.cos(angle) * Math.cos(elev) * s,
        y: Math.sin(elev) * s + 2,
        z: Math.sin(angle) * Math.cos(elev) * s,
      },
      life, maxLife: life, color,
      size: 0.2 + Math.random() * 0.3, type,
    });
  }
}

function spawnParticleRing(
  state: PendulumState, center: Vec3, radius: number, count: number,
  type: PendulumParticle["type"], color: number, speed: number, life: number,
): void {
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const x = center.x + Math.cos(angle) * radius;
    const z = center.z + Math.sin(angle) * radius;
    state.particles.push({
      pos: { x, y: center.y + 0.2, z },
      vel: { x: Math.cos(angle) * speed, y: 1 + Math.random(), z: Math.sin(angle) * speed },
      life, maxLife: life, color,
      size: 0.25 + Math.random() * 0.2, type,
    });
  }
}

function flashScreen(state: PendulumState, color: string, intensity: number, duration: number): void {
  state.screenFlash = { color, intensity, timer: duration };
}

function addScreenShake(state: PendulumState, intensity: number, duration: number): void {
  state.screenShake = Math.max(state.screenShake, duration);
  state.screenShakeIntensity = Math.max(state.screenShakeIntensity, intensity);
}

function spawnDamageNumber(state: PendulumState, pos: Vec3, value: number, color: number, crit: boolean): void {
  state.damageNumbers.push({
    pos: { x: pos.x + (Math.random() - 0.5) * 0.5, y: pos.y + 1.5, z: pos.z },
    value: Math.round(value), timer: 1.2, color, crit,
  });
}

function spawnGearFragment(state: PendulumState, pos: Vec3, value: number): void {
  const angle = Math.random() * Math.PI * 2;
  state.gearFragments.push({
    pos: { ...pos, y: pos.y + 0.5 },
    vel: { x: Math.cos(angle) * 3, y: 4 + Math.random() * 2, z: Math.sin(angle) * 3 },
    value, life: PENDULUM.GEAR_FRAGMENT_LIFE, attracted: false,
  });
}

function getPendulumDamageMult(state: PendulumState): number {
  let mult = state.pendulumPower;
  // Buff: overcharge
  if (state.activeBuffs.some(b => b.id === "overcharge")) mult *= 1.3;
  // Buff: chrono surge
  if (state.activeBuffs.some(b => b.id === "chrono_surge")) mult *= 1.35;
  // Active pillar bonus
  const activePillars = state.pillars.filter(p => p.status === "active").length;
  mult *= 1 + activePillars * PENDULUM.PILLAR_POWER_BONUS;
  // Pillar Ward lv3: each active pillar adds +5% damage
  if (state.player.pillarLevel >= 3) {
    mult *= 1 + activePillars * 0.05;
  }
  return mult;
}

function getDiffMult(state: PendulumState): { enemyHp: number; enemyDmg: number; enemyCount: number; gearMult: number; towerHp: number } {
  return PENDULUM.DIFFICULTY[state.difficulty] || PENDULUM.DIFFICULTY.normal;
}

// ========================================================================
// UPDATE: Pendulum Rhythm
// ========================================================================

export function updatePendulum(state: PendulumState, _dt: number): void {
  // Pendulum swings as sin wave
  const t = state.gameTime;
  const period = PENDULUM.PENDULUM_PERIOD;
  state.pendulumAngle = Math.sin((t / period) * Math.PI * 2);

  // Power is strongest at extremes (|angle| near 1), weakest at center (0)
  const absAngle = Math.abs(state.pendulumAngle);
  state.pendulumPower = PENDULUM.PENDULUM_POWER_MIN +
    (PENDULUM.PENDULUM_POWER_MAX - PENDULUM.PENDULUM_POWER_MIN) * absAngle;

  // Track apex state for visual/audio feedback
  const wasApex = state.apexStrikeActive;
  state.apexStrikeActive = state.pendulumPower >= PENDULUM.APEX_POWER_THRESHOLD;
  if (state.apexStrikeActive && !wasApex) {
    // Just entered apex — pulse particles around pendulum bob
    spawnParticleRing(state, { x: 0, y: 3, z: 0 }, 4, 8, "chrono", 0xffcc44, 3, 0.6);
  }
}

// ========================================================================
// UPDATE: Player
// ========================================================================

export function updatePlayer(state: PendulumState, dt: number): void {
  const p = state.player;
  if (p.action === "dead") return;

  // Cooldowns
  p.chronoStrikeCD = Math.max(0, p.chronoStrikeCD - dt);
  p.gearThrowCD = Math.max(0, p.gearThrowCD - dt);
  p.timeSlowCD = Math.max(0, p.timeSlowCD - dt);
  p.rewindCD = Math.max(0, p.rewindCD - dt);
  p.timeStopCD = Math.max(0, p.timeStopCD - dt);
  p.dashCD = Math.max(0, p.dashCD - dt);
  p.invincibleTimer = Math.max(0, p.invincibleTimer - dt);
  p.strikeComboTimer = Math.max(0, p.strikeComboTimer - dt);
  if (p.strikeComboTimer <= 0) p.strikeComboStep = 0;
  p.blockTimer = Math.max(0, p.blockTimer - dt);
  p.gearThrowCastTimer = Math.max(0, p.gearThrowCastTimer - dt);
  p.timeSlowCastTimer = Math.max(0, p.timeSlowCastTimer - dt);
  p.rewindCastTimer = Math.max(0, p.rewindCastTimer - dt);
  p.timeStopCastTimer = Math.max(0, p.timeStopCastTimer - dt);

  // Kill streak
  p.killStreakTimer = Math.max(0, p.killStreakTimer - dt);
  if (p.killStreakTimer <= 0) p.killStreak = 0;

  // Combo decay
  p.comboTimer = Math.max(0, p.comboTimer - dt);
  if (p.comboTimer <= 0) p.combo = 0;

  // Time stop timer
  if (p.timeStopTimer > 0) {
    p.timeStopTimer -= dt;
    if (p.timeStopTimer <= 0) {
      state.timeStopActive = false;
      p.timeStopTimer = 0;
    }
  }

  // Dash movement
  if (p.dashTimer > 0) {
    p.dashTimer -= dt;
    p.pos.x += p.dashDir.x * PENDULUM.DASH_SPEED * dt;
    p.pos.z += p.dashDir.z * PENDULUM.DASH_SPEED * dt;
    p.action = "dashing";
    if (p.dashTimer <= 0) p.action = "idle";
    return;
  }

  // Mouse look
  if (state.pointerLocked) {
    p.yaw -= state.mouseDX * PENDULUM.TURN_SPEED * 0.002;
    p.pitch -= state.mouseDY * PENDULUM.PITCH_SPEED * 0.002;
    p.pitch = Math.max(-1.2, Math.min(1.2, p.pitch));
    state.mouseDX = 0;
    state.mouseDY = 0;
  }

  // Movement
  const keys = state.keys;
  let moveX = 0, moveZ = 0;
  if (keys.has("w") || keys.has("arrowup")) moveZ -= 1;
  if (keys.has("s") || keys.has("arrowdown")) moveZ += 1;
  if (keys.has("a") || keys.has("arrowleft")) moveX -= 1;
  if (keys.has("d") || keys.has("arrowright")) moveX += 1;

  const sinY = Math.sin(p.yaw), cosY = Math.cos(p.yaw);
  const worldX = moveX * cosY - moveZ * sinY;
  const worldZ = moveX * sinY + moveZ * cosY;

  const sprinting = keys.has("shift") && p.stamina > 0 && (moveX !== 0 || moveZ !== 0);
  let speed = sprinting ? PENDULUM.SPRINT_SPEED : PENDULUM.WALK_SPEED;

  // Buff: spring coil
  if (state.activeBuffs.some(b => b.id === "spring_coil")) speed *= 1.25;
  // Speed upgrade
  speed *= 1 + p.speedLevel * 0.12;
  // Rust storm debuff
  if (state.waveModifier === "rust_storm") speed *= PENDULUM.RUST_STORM_PLAYER_SLOW;

  if (moveX !== 0 || moveZ !== 0) {
    const len = Math.sqrt(worldX * worldX + worldZ * worldZ);
    p.vel.x += (worldX / len) * speed * dt * 10;
    p.vel.z += (worldZ / len) * speed * dt * 10;
    p.action = sprinting ? "sprinting" : "walking";
    // Footstep dust particles (every ~0.3s while moving)
    if (p.onGround && state.tick % (sprinting ? 8 : 14) === 0) {
      spawnParticles(state, { x: p.pos.x, y: 0.05, z: p.pos.z }, 2, "clock_dust", 0x444433, 1, 0.4);
    }
  } else {
    p.action = "idle";
  }

  if (sprinting) {
    p.stamina = Math.max(0, p.stamina - PENDULUM.STAMINA_SPRINT_DRAIN * dt);
  } else {
    p.stamina = Math.min(p.maxStamina, p.stamina + PENDULUM.STAMINA_REGEN * dt);
  }

  // Gravity & ground
  p.vel.y += PENDULUM.GRAVITY * dt;
  p.pos.x += p.vel.x * dt;
  p.pos.y += p.vel.y * dt;
  p.pos.z += p.vel.z * dt;

  if (p.pos.y <= 0) {
    p.pos.y = 0;
    p.vel.y = 0;
    p.onGround = true;
  }

  // Drag
  const drag = p.onGround ? PENDULUM.GROUND_DRAG : PENDULUM.AIR_DRAG;
  p.vel.x *= drag;
  p.vel.z *= drag;

  // Jump
  if (keys.has(" ") && p.onGround) {
    p.vel.y = PENDULUM.JUMP_FORCE;
    p.onGround = false;
    // Jump dust
    spawnParticles(state, { x: p.pos.x, y: 0.1, z: p.pos.z }, 4, "clock_dust", 0x555544, 2, 0.5);
  }

  // Landing dust (was in air, now on ground)
  if (p.onGround && p.vel.y === 0 && state.tick > 1) {
    // Check if we just landed (y was > 0 last tick)
    // Simple: if action was previously not on ground, emit dust
  }

  // Passive regen
  p.hp = Math.min(p.maxHp, p.hp + PENDULUM.HP_REGEN * dt);

  // Repairing pillar
  p.repairingPillarIdx = -1;
  if (keys.has("f")) {
    for (let i = 0; i < state.pillars.length; i++) {
      const pil = state.pillars[i];
      if (pil.status === "destroyed" && distXZ(p.pos, pil.pos) < PENDULUM.PILLAR_RADIUS * 2) {
        p.repairingPillarIdx = i;
        pil.repairProgress += 0.2 * dt;
        if (pil.repairProgress >= 1.0) {
          pil.status = "active";
          pil.hp = pil.maxHp * 0.5;
          pil.repairProgress = 0;
          state.pendingRepairPillarIdx = i;
          addNotification(state, "PILLAR RESTORED", 0x44ccff);
          state.entropy = Math.max(0, state.entropy - PENDULUM.ENTROPY_DECAY_REPAIR);
        }
        break;
      }
    }
  }

  // Block & Parry
  const wasBlocking = p.blocking;
  p.blocking = state.rightMouseDown && p.onGround;
  if (p.blocking && !wasBlocking) {
    // Just started blocking — open parry window (armor lv3+ extends it)
    const parryBonus = p.armorLevel >= 3 ? 0.15 : 0;
    state.parryWindow = PENDULUM.PARRY_WINDOW + parryBonus;
  }
  if (state.parryWindow > 0) state.parryWindow -= dt;
  if (state.lastParrySuccess > 0) state.lastParrySuccess -= dt;

  // Keep in bounds
  const half = PENDULUM.GROUND_SIZE / 2;
  p.pos.x = Math.max(-half, Math.min(half, p.pos.x));
  p.pos.z = Math.max(-half, Math.min(half, p.pos.z));
}

// ========================================================================
// UPDATE: Abilities
// ========================================================================

export function useAbilities(state: PendulumState): void {
  const p = state.player;
  const keys = state.keys;
  if (p.action === "dead") return;

  const powerMult = getPendulumDamageMult(state);

  // LMB: Chrono Strike
  if (state.mouseDown && p.chronoStrikeCD <= 0 && p.action !== "dashing") {
    p.chronoStrikeCD = PENDULUM.CHRONO_STRIKE_COOLDOWN;
    state.stats.abilitiesUsed++;

    const step = p.strikeComboStep;
    const dmgMult = PENDULUM.CHRONO_STRIKE_COMBO_MULT[step] ?? 1;
    const rangePlus = PENDULUM.CHRONO_STRIKE_RANGE_BONUS[step] ?? 0;
    const isApex = state.apexStrikeActive;
    const apexBonus = isApex ? (1 + PENDULUM.APEX_CRIT_BONUS) : 1;
    const comboBonus = 1 + p.combo * PENDULUM.COMBO_DAMAGE_BONUS;
    const damage = PENDULUM.CHRONO_STRIKE_DAMAGE * dmgMult * powerMult * (1 + p.strikeLevel * 0.25) * apexBonus * comboBonus;
    const range = PENDULUM.CHRONO_STRIKE_RANGE + rangePlus;
    const freezeApex = isApex ? (1 + PENDULUM.APEX_FREEZE_BONUS) : 1;
    const freezeDur = PENDULUM.CHRONO_STRIKE_FREEZE * powerMult * freezeApex;
    const isFinalHit = step === PENDULUM.CHRONO_STRIKE_COMBO_COUNT - 1;
    const kb = isFinalHit ? PENDULUM.CHRONO_STRIKE_HEAVY_KNOCKBACK : PENDULUM.CHRONO_STRIKE_KNOCKBACK;

    // Find enemies in front of player
    const sinY = Math.sin(p.yaw), cosY = Math.cos(p.yaw);
    const fwd: Vec3 = { x: -sinY, y: 0, z: -cosY };

    for (const enemy of state.enemies.values()) {
      if (enemy.behavior === "dead") continue;
      const d = distXZ(p.pos, enemy.pos);
      if (d > range) continue;
      // Check angle
      const toE = normalize3({ x: enemy.pos.x - p.pos.x, y: 0, z: enemy.pos.z - p.pos.z });
      const dot = fwd.x * toE.x + fwd.z * toE.z;
      if (dot < 0.4) continue;

      const finalDmg = damage;
      enemy.hp = hpDamage(enemy.hp, finalDmg);
      enemy.hitFlash = 0.15;
      enemy.frozenTimer = Math.max(enemy.frozenTimer, freezeDur);
      if (enemy.frozenTimer > 0) enemy.behavior = "frozen";
      state.stats.damageDealt += finalDmg;

      // Temporal echo buff
      if (state.activeBuffs.some(b => b.id === "temporal_echo")) {
        const echoDmg = finalDmg * 0.5;
        enemy.hp = hpDamage(enemy.hp, echoDmg);
        state.stats.damageDealt += echoDmg;
        spawnParticles(state, enemy.pos, 3, "chrono", 0x8888ff, 3, 0.4);
      }

      // Knockback
      const kbDir = normalize3({ x: enemy.pos.x - p.pos.x, y: 0.3, z: enemy.pos.z - p.pos.z });
      enemy.knockbackVel = { x: kbDir.x * kb, y: kbDir.y * kb, z: kbDir.z * kb };
      enemy.knockbackTimer = 0.2;

      // Apex strike: golden particles + bigger shake
      if (isApex) {
        spawnDamageNumber(state, enemy.pos, finalDmg, 0xffdd00, true);
        spawnParticles(state, enemy.pos, isFinalHit ? 18 : 8, "chrono", 0xffcc44, 7, 0.6);
        if (!isFinalHit) addScreenShake(state, 3, 0.08);
      } else {
        spawnDamageNumber(state, enemy.pos, finalDmg, isFinalHit ? 0xffcc00 : 0xff8844, isFinalHit);
        spawnParticles(state, enemy.pos, isFinalHit ? 12 : 5, "spark", 0xffaa44, 5, 0.5);
      }

      if (isFinalHit) {
        addScreenShake(state, isApex ? 10 : 6, 0.15);
        state.hitStopTimer = isApex ? PENDULUM.HIT_STOP_CRIT * 1.5 : PENDULUM.HIT_STOP_CRIT;
        state.hitStopScale = PENDULUM.HIT_STOP_SCALE;
      }

      // Combo — scales damage via combo bonus
      p.combo = Math.min(p.combo + 1, PENDULUM.COMBO_MAX);
      p.comboTimer = PENDULUM.COMBO_WINDOW;
      p.maxCombo = Math.max(p.maxCombo, p.combo);

      // Strike level 3: restore 1 gear
      if (p.strikeLevel >= 3) p.gears += 1;

      // Check kill
      if (enemy.hp <= 0) {
        // Chrono shatter: frozen enemies explode (chrono lv3)
        if (p.chronoLevel >= 3 && enemy.frozenTimer > 0) {
          const shatterDmg = enemy.maxHp * PENDULUM.SHATTER_DAMAGE_PCT;
          for (const e2 of state.enemies.values()) {
            if (e2.id === enemy.id || e2.behavior === "dead") continue;
            if (distXZ(enemy.pos, e2.pos) < PENDULUM.SHATTER_RADIUS) {
              e2.hp = hpDamage(e2.hp, shatterDmg);
              e2.hitFlash = 0.2;
              e2.frozenTimer = Math.max(e2.frozenTimer, 0.5);
              e2.behavior = "frozen";
              spawnDamageNumber(state, e2.pos, shatterDmg, 0x88ccff, false);
              if (e2.hp <= 0) _killEnemy(state, e2);
            }
          }
          spawnParticleRing(state, enemy.pos, PENDULUM.SHATTER_RADIUS, 16, "chrono", 0xaaccff, 6, 0.8);
          addScreenShake(state, 5, 0.12);
          addNotification(state, "CHRONO SHATTER", 0x88ccff);
        }
        _killEnemy(state, enemy);
      }
    }

    // Advance combo step
    p.strikeComboStep = (p.strikeComboStep + 1) % PENDULUM.CHRONO_STRIKE_COMBO_COUNT;
    p.strikeComboTimer = PENDULUM.CHRONO_STRIKE_COMBO_WINDOW;
  }

  // Q: Gear Throw
  if (keys.has("q") && p.gearThrowCD <= 0) {
    keys.delete("q");
    p.gearThrowCD = PENDULUM.GEAR_THROW_COOLDOWN;
    p.gearThrowCastTimer = 0.35;
    state.stats.abilitiesUsed++;

    const sinY = Math.sin(p.yaw), cosY = Math.cos(p.yaw);
    const dir: Vec3 = { x: -sinY, y: 0, z: -cosY };
    const damage = PENDULUM.GEAR_THROW_DAMAGE * powerMult * (1 + p.gearThrowLevel * 0.3);
    const bounces = PENDULUM.GEAR_THROW_BOUNCES + (p.gearThrowLevel >= 2 ? 1 : 0);

    state.projectiles.push({
      id: genPendulumId(state),
      pos: { x: p.pos.x, y: p.pos.y + 1.2, z: p.pos.z },
      vel: { x: dir.x * PENDULUM.GEAR_THROW_SPEED, y: 0, z: dir.z * PENDULUM.GEAR_THROW_SPEED },
      damage, life: PENDULUM.PROJECTILE_LIFE,
      type: "gear", owner: "player", ownerId: "player",
      bouncesLeft: bounces,
    });
    spawnParticles(state, p.pos, 4, "gear_bit", 0xccaa44, 4, 0.3);
  }

  // E: Time Slow Zone
  if (keys.has("e") && p.timeSlowCD <= 0) {
    keys.delete("e");
    p.timeSlowCD = PENDULUM.TIME_SLOW_COOLDOWN;
    p.timeSlowCastTimer = 0.4;
    state.stats.abilitiesUsed++;

    const sinY = Math.sin(p.yaw), cosY = Math.cos(p.yaw);
    const dist = 12;
    const zonePos: Vec3 = {
      x: p.pos.x - sinY * dist,
      y: 0,
      z: p.pos.z - cosY * dist,
    };
    const radiusMult = 1 + p.chronoLevel * 0.25;
    const durMult = 1 + p.chronoLevel * 0.25;
    state.timeSlowZones.push({
      pos: zonePos,
      radius: PENDULUM.TIME_SLOW_RADIUS * radiusMult,
      timer: PENDULUM.TIME_SLOW_DURATION * durMult,
      factor: PENDULUM.TIME_SLOW_FACTOR,
    });
    state.pendingTimeSlowPos = zonePos;
    spawnParticleRing(state, zonePos, PENDULUM.TIME_SLOW_RADIUS * radiusMult, 20, "time_ripple", 0x4488ff, 2, 1.0);
    addNotification(state, "TIME SLOW", 0x4488ff);
  }

  // R: Rewind (reverse enemy projectiles)
  if (keys.has("r") && p.rewindCD <= 0) {
    keys.delete("r");
    p.rewindCD = PENDULUM.REWIND_COOLDOWN;
    p.rewindCastTimer = 0.3;
    state.stats.abilitiesUsed++;

    let reversed = 0;
    for (const proj of state.projectiles) {
      if (proj.owner !== "enemy") continue;
      if (distXZ(p.pos, proj.pos) > PENDULUM.REWIND_RADIUS) continue;
      proj.vel.x *= -1;
      proj.vel.z *= -1;
      proj.owner = "player";
      proj.type = "reversed_bolt";
      proj.damage *= PENDULUM.REWIND_DAMAGE_MULT;
      reversed++;
      spawnParticles(state, proj.pos, 4, "chrono", 0x88ccff, 3, 0.5);
    }

    state.pendingRewindPos = { ...p.pos };
    spawnParticleRing(state, p.pos, PENDULUM.REWIND_RADIUS, 16, "time_ripple", 0x88ccff, 4, 0.8);
    addNotification(state, reversed > 0 ? `REWIND x${reversed}` : "REWIND", 0x88ccff);
    flashScreen(state, "#4488ff", 0.3, 0.2);
  }

  // X: Time Stop (ultimate)
  if (keys.has("x") && p.timeStopCD <= 0) {
    keys.delete("x");
    p.timeStopCD = PENDULUM.TIME_STOP_COOLDOWN;
    p.timeStopCastTimer = 0.5;
    state.stats.abilitiesUsed++;

    const durMult = 1 + p.chronoLevel * 0.15;
    p.timeStopTimer = PENDULUM.TIME_STOP_DURATION * durMult;
    state.timeStopActive = true;

    // Freeze all enemies
    for (const enemy of state.enemies.values()) {
      if (enemy.behavior === "dead") continue;
      enemy.frozenTimer = p.timeStopTimer;
      enemy.behavior = "frozen";
    }

    flashScreen(state, "#aaccff", 0.6, 0.3);
    addScreenShake(state, 8, 0.2);
    state.hitStopTimer = PENDULUM.HIT_STOP_TIME_STOP;
    state.hitStopScale = PENDULUM.HIT_STOP_SCALE;
    addNotification(state, "TIME STOP", 0xffffff);
    spawnParticleRing(state, p.pos, 15, 30, "time_ripple", 0xaaccff, 6, 1.5);
  }

  // C: Dash
  if (keys.has("c") && p.dashCD <= 0 && p.stamina >= PENDULUM.DASH_STAMINA_COST) {
    keys.delete("c");
    p.dashCD = PENDULUM.DASH_COOLDOWN;
    p.stamina -= PENDULUM.DASH_STAMINA_COST;
    p.invincibleTimer = PENDULUM.DASH_IFRAMES;
    p.dashTimer = PENDULUM.DASH_DURATION;

    const sinY = Math.sin(p.yaw), cosY = Math.cos(p.yaw);
    let dx = 0, dz = 0;
    if (state.keys.has("w")) dz -= 1;
    if (state.keys.has("s")) dz += 1;
    if (state.keys.has("a")) dx -= 1;
    if (state.keys.has("d")) dx += 1;
    if (dx === 0 && dz === 0) dz = -1; // default forward
    const wx = dx * cosY - dz * sinY;
    const wz = dx * sinY + dz * cosY;
    const len = Math.sqrt(wx * wx + wz * wz);
    p.dashDir = { x: wx / len, y: 0, z: wz / len };

    spawnParticles(state, p.pos, 6, "chrono", 0x6688cc, 4, 0.4);

    // Speed level 3: dash leaves damaging time trail
    if (p.speedLevel >= 3) {
      state.dashTrails.push({
        pos: { ...p.pos },
        timer: PENDULUM.DASH_TRAIL_DURATION,
        radius: PENDULUM.DASH_TRAIL_RADIUS,
      });
    }
  }

  // T: Place Turret
  if (keys.has("t") && state.turrets.length < PENDULUM.TURRET_MAX + (p.turretLevel >= 1 ? p.turretLevel : 0)) {
    if (p.gears >= PENDULUM.TURRET_COST) {
      keys.delete("t");
      p.gears -= PENDULUM.TURRET_COST;
      state.stats.abilitiesUsed++;

      const sinY = Math.sin(p.yaw), cosY = Math.cos(p.yaw);
      const dist = 6;
      const turretPos: Vec3 = {
        x: p.pos.x - sinY * dist,
        y: 0,
        z: p.pos.z - cosY * dist,
      };

      // Check min distance from other turrets
      let tooClose = false;
      for (const t of state.turrets) {
        if (distXZ(t.pos, turretPos) < PENDULUM.TURRET_MIN_DIST) { tooClose = true; break; }
      }
      if (!tooClose) {
        state.turrets.push({
          id: genPendulumId(state),
          pos: turretPos,
          hp: PENDULUM.TURRET_HP,
          maxHp: PENDULUM.TURRET_HP,
          attackTimer: 0,
          targetId: null,
          barrelRotation: 0,
        });
        addNotification(state, "TURRET DEPLOYED", 0x44ccaa);
        spawnParticles(state, turretPos, 8, "gear_bit", 0xccaa44, 4, 0.5);
      } else {
        p.gears += PENDULUM.TURRET_COST; // refund
        addNotification(state, "Too close to another turret", 0xcc4444);
      }
    }
  }
}

function _killEnemy(state: PendulumState, enemy: Enemy): void {
  enemy.behavior = "dead";
  enemy.deathTimer = 0.5;

  state.enemiesKilled++;
  state.totalKills++;

  const p = state.player;
  p.killStreak++;
  p.killStreakTimer = PENDULUM.STREAK_WINDOW;

  // Check streak rewards
  for (let i = PENDULUM.STREAK_THRESHOLDS.length - 1; i >= 0; i--) {
    if (p.killStreak === PENDULUM.STREAK_THRESHOLDS[i]) {
      const reward = PENDULUM.STREAK_REWARDS[i];
      p.gears += reward;
      addNotification(state, `${p.killStreak} KILL STREAK! +${reward} gears`, 0xffcc00);
      break;
    }
  }

  // Drop gear fragments
  const gearDrops: Record<EnemyType, number> = {
    gear_drone: PENDULUM.GEARS_PER_DRONE,
    spring_knight: PENDULUM.GEARS_PER_SPRING_KNIGHT,
    coil_archer: PENDULUM.GEARS_PER_COIL_ARCHER,
    brass_golem: PENDULUM.GEARS_PER_BRASS_GOLEM,
    clock_spider: PENDULUM.GEARS_PER_CLOCK_SPIDER,
    chronovore: PENDULUM.GEARS_PER_CHRONOVORE,
  };
  let gearValue = gearDrops[enemy.type] || 1;
  const diff = getDiffMult(state);
  gearValue = Math.ceil(gearValue * diff.gearMult);
  if (state.activeBuffs.some(b => b.id === "gear_harvest")) gearValue = Math.ceil(gearValue * 1.5);
  // Combo gear bonus
  if (p.combo > 0) gearValue += Math.floor(p.combo * PENDULUM.COMBO_GEAR_BONUS);
  spawnGearFragment(state, enemy.pos, gearValue);

  // Repair kit drop
  if (Math.random() < PENDULUM.REPAIR_KIT_CHANCE) {
    const angle = Math.random() * Math.PI * 2;
    state.repairKits.push({
      pos: { ...enemy.pos, y: enemy.pos.y + 0.5 },
      vel: { x: Math.cos(angle) * 2, y: 3 + Math.random(), z: Math.sin(angle) * 2 },
      heal: PENDULUM.REPAIR_KIT_AMOUNT,
      life: PENDULUM.REPAIR_KIT_LIFE,
    });
  }

  // Death particles
  spawnParticles(state, enemy.pos, 10, "gear_bit", 0xccaa44, 5, 0.8);
  spawnParticles(state, enemy.pos, 5, "steam", 0xaaaaaa, 3, 0.6);

  if (enemy.type === "chronovore") {
    addScreenShake(state, 12, 0.4);
    flashScreen(state, "#ffcc44", 0.5, 0.3);
    addNotification(state, "CHRONOVORE DESTROYED!", 0xffcc00);
    spawnParticleRing(state, enemy.pos, 8, 30, "spark", 0xffaa44, 8, 1.2);
  }
}

// ========================================================================
// UPDATE: Enemies
// ========================================================================

export function updateEnemies(state: PendulumState, dt: number): void {
  let alive = 0;
  const pillarAttacked = new Set<number>();

  for (const enemy of state.enemies.values()) {
    if (enemy.behavior === "dead") {
      enemy.deathTimer -= dt;
      continue;
    }

    alive++;
    enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
    enemy.bobPhase += dt * 3;

    // Frozen by time stop or chrono strike
    if (enemy.frozenTimer > 0 && !state.timeStopActive) {
      enemy.frozenTimer -= dt;
      if (enemy.frozenTimer <= 0) {
        enemy.behavior = "approaching";
        enemy.frozenTimer = 0;
      }
      continue;
    } else if (state.timeStopActive) {
      continue; // fully frozen during time stop
    }

    // Stun
    if (enemy.stunTimer > 0) {
      enemy.stunTimer -= dt;
      enemy.behavior = "stunned";
      continue;
    }

    // Knockback
    if (enemy.knockbackTimer > 0) {
      enemy.knockbackTimer -= dt;
      enemy.pos.x += enemy.knockbackVel.x * dt;
      enemy.pos.z += enemy.knockbackVel.z * dt;
      enemy.knockbackVel.x *= 0.9;
      enemy.knockbackVel.z *= 0.9;
      continue;
    }

    // Check time slow zones
    enemy.timeSlowed = false;
    enemy.timeSlowFactor = 1;
    for (const zone of state.timeSlowZones) {
      if (distXZ(enemy.pos, zone.pos) < zone.radius) {
        enemy.timeSlowed = true;
        enemy.timeSlowFactor = zone.factor;
        break;
      }
    }

    // Overclock modifier
    let speedMult = enemy.timeSlowFactor;
    if (state.waveModifier === "overclock") speedMult *= PENDULUM.OVERCLOCK_SPEED_MULT;

    // Entropy buff
    speedMult *= 1 + state.entropy * PENDULUM.ENTROPY_ENEMY_BUFF;

    // Gear drone pack behavior — faster when near other drones
    if (enemy.type === "gear_drone") {
      let packCount = 0;
      for (const e2 of state.enemies.values()) {
        if (e2.id === enemy.id || e2.type !== "gear_drone" || e2.behavior === "dead") continue;
        if (distXZ(enemy.pos, e2.pos) < PENDULUM.GEAR_DRONE_PACK_RANGE) packCount++;
      }
      speedMult *= 1 + packCount * PENDULUM.GEAR_DRONE_PACK_SPEED_BONUS;
    }

    // Movement toward target
    const targetPos = _getEnemyTargetPos(state, enemy);
    const dx = targetPos.x - enemy.pos.x;
    const dz = targetPos.z - enemy.pos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    // Magnetic pull modifier
    if (state.waveModifier === "magnetic" && enemy.target !== "tower") {
      const towerDx = -enemy.pos.x;
      const towerDz = -enemy.pos.z;
      const towerDist = Math.sqrt(towerDx * towerDx + towerDz * towerDz);
      if (towerDist > 1) {
        enemy.pos.x += (towerDx / towerDist) * PENDULUM.MAGNETIC_PULL_STRENGTH * dt;
        enemy.pos.z += (towerDz / towerDist) * PENDULUM.MAGNETIC_PULL_STRENGTH * dt;
      }
    }

    enemy.attackTimer = Math.max(0, enemy.attackTimer - dt * enemy.timeSlowFactor);

    const attackRange = enemy.type === "coil_archer" ? PENDULUM.COIL_ARCHER_RANGE :
                        PENDULUM.ENEMY_ATTACK_RANGE;

    if (dist > attackRange) {
      // Move toward target
      const speed = enemy.speed * speedMult;
      enemy.pos.x += (dx / dist) * speed * dt;
      enemy.pos.z += (dz / dist) * speed * dt;
      enemy.rotation = Math.atan2(dx, dz);
      enemy.behavior = "approaching";

      // Type-specific special movement
      _updateEnemySpecials(state, enemy, dt, dist);
    } else {
      // Attack
      enemy.behavior = "attacking";
      if (enemy.attackTimer <= 0) {
        _enemyAttack(state, enemy);
        enemy.attackTimer = PENDULUM.ENEMY_ATTACK_COOLDOWN;

        if (enemy.target === "pillar" && enemy.targetPillarIdx >= 0) {
          pillarAttacked.add(enemy.targetPillarIdx);
        }
      }
    }

    // Keep on ground
    enemy.pos.y = enemy.flying ? 2 + Math.sin(enemy.bobPhase) * 0.3 : 0;
  }

  // Remove dead enemies after timer
  for (const [id, enemy] of state.enemies) {
    if (enemy.behavior === "dead" && enemy.deathTimer <= 0) {
      state.enemies.delete(id);
    }
  }

  state.aliveEnemyCount = alive;
  state.pillarUnderAttack = [...pillarAttacked];
}

function _getEnemyTargetPos(state: PendulumState, enemy: Enemy): Vec3 {
  if (enemy.target === "player") return state.player.pos;
  if (enemy.target === "turret") {
    // Find nearest turret
    let nearest: { pos: Vec3; d: number } | null = null;
    for (const t of state.turrets) {
      const d = distXZ(enemy.pos, t.pos);
      if (!nearest || d < nearest.d) nearest = { pos: t.pos, d };
    }
    if (nearest) return nearest.pos;
    enemy.target = "tower"; // no turrets left
  }
  if (enemy.target === "pillar" && enemy.targetPillarIdx >= 0 && enemy.targetPillarIdx < state.pillars.length) {
    const pil = state.pillars[enemy.targetPillarIdx];
    if (pil.status !== "destroyed") return pil.pos;
    // Pillar destroyed, retarget to tower
    enemy.target = "tower";
  }
  return { x: 0, y: 0, z: 0 }; // tower center
}

function _updateEnemySpecials(state: PendulumState, enemy: Enemy, dt: number, distToTarget: number): void {
  switch (enemy.type) {
    case "spring_knight": {
      enemy.chargeCD = Math.max(0, enemy.chargeCD - dt);
      if (enemy.chargeCD <= 0 && distToTarget < 20 && distToTarget > 5) {
        enemy.chargeCD = PENDULUM.SPRING_KNIGHT_CHARGE_CD;
        // Telegraph before charge
        const targetPos = _getEnemyTargetPos(state, enemy);
        const dx = targetPos.x - enemy.pos.x, dz = targetPos.z - enemy.pos.z;
        const d = Math.sqrt(dx * dx + dz * dz);
        enemy.chargeDir = { x: dx / d, y: 0, z: dz / d };
        // Show warning line toward target
        state.telegraphs.push({
          pos: { ...enemy.pos },
          radius: 1.5,
          timer: PENDULUM.SPRING_KNIGHT_TELEGRAPH_TIME,
          color: 0xff6644,
        });
        spawnParticles(state, enemy.pos, 4, "steam", 0xff8844, 3, 0.5);
        enemy.chargeTimer = PENDULUM.SPRING_KNIGHT_CHARGE_DURATION + PENDULUM.SPRING_KNIGHT_TELEGRAPH_TIME;
        enemy.behavior = "charging";
      }
      if (enemy.chargeTimer > 0) {
        enemy.chargeTimer -= dt;
        // Only move during actual charge, not during telegraph
        if (enemy.chargeTimer <= PENDULUM.SPRING_KNIGHT_CHARGE_DURATION) {
          enemy.pos.x += enemy.chargeDir.x * PENDULUM.SPRING_KNIGHT_CHARGE_SPEED * dt * enemy.timeSlowFactor;
          enemy.pos.z += enemy.chargeDir.z * PENDULUM.SPRING_KNIGHT_CHARGE_SPEED * dt * enemy.timeSlowFactor;
        }
        enemy.behavior = "charging";
      }
      break;
    }
    case "clock_spider": {
      enemy.leapCD = Math.max(0, enemy.leapCD - dt);
      if (enemy.leapCD <= 0 && distToTarget < 15 && distToTarget > 3) {
        enemy.leapCD = PENDULUM.CLOCK_SPIDER_LEAP_CD;
        enemy.leapTimer = 0.3;
        const targetPos = _getEnemyTargetPos(state, enemy);
        const dx = targetPos.x - enemy.pos.x, dz = targetPos.z - enemy.pos.z;
        const d = Math.sqrt(dx * dx + dz * dz);
        enemy.vel = { x: (dx / d) * 15, y: 6, z: (dz / d) * 15 };
        enemy.behavior = "leaping";
      }
      if (enemy.leapTimer > 0) {
        enemy.leapTimer -= dt;
        enemy.pos.x += enemy.vel.x * dt;
        enemy.pos.y += enemy.vel.y * dt;
        enemy.vel.y += PENDULUM.GRAVITY * dt;
        enemy.pos.z += enemy.vel.z * dt;
        if (enemy.pos.y <= 0) {
          enemy.pos.y = 0;
          enemy.leapTimer = 0;
          // Leap damage on landing
          if (distXZ(enemy.pos, state.player.pos) < 3) {
            _damagePlayer(state, PENDULUM.CLOCK_SPIDER_LEAP_DAMAGE);
          }
        }
      }
      break;
    }
    case "coil_archer": {
      enemy.fireCD = Math.max(0, enemy.fireCD - dt);
      if (enemy.fireCD <= 0 && distToTarget < PENDULUM.COIL_ARCHER_RANGE) {
        enemy.fireCD = PENDULUM.COIL_ARCHER_FIRE_CD;
        const targetPos = _getEnemyTargetPos(state, enemy);
        const dx = targetPos.x - enemy.pos.x, dz = targetPos.z - enemy.pos.z;
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d > 0.1) {
          state.projectiles.push({
            id: genPendulumId(state),
            pos: { x: enemy.pos.x, y: enemy.pos.y + 1.2, z: enemy.pos.z },
            vel: { x: (dx / d) * PENDULUM.COIL_ARCHER_BOLT_SPEED, y: 0, z: (dz / d) * PENDULUM.COIL_ARCHER_BOLT_SPEED },
            damage: PENDULUM.COIL_ARCHER_DAMAGE, life: PENDULUM.PROJECTILE_LIFE,
            type: "bolt", owner: "enemy", ownerId: enemy.id,
            bouncesLeft: 0,
          });
        }
      }
      break;
    }
    case "brass_golem": {
      enemy.slamCD = Math.max(0, enemy.slamCD - dt);
      // Slam delay timer — telegraph plays, then damage lands
      if (enemy.slamDelayTimer > 0) {
        enemy.slamDelayTimer -= dt * enemy.timeSlowFactor;
        if (enemy.slamDelayTimer <= 0) {
          // Slam lands
          if (enemy.behavior !== "dead") {
            if (distXZ(enemy.pos, state.player.pos) < PENDULUM.BRASS_GOLEM_SLAM_RADIUS) {
              _damagePlayer(state, PENDULUM.BRASS_GOLEM_SLAM_DAMAGE, enemy.pos);
            }
            state.pendingSlam = { x: enemy.pos.x, z: enemy.pos.z };
            addScreenShake(state, 8, 0.2);
            spawnParticleRing(state, enemy.pos, PENDULUM.BRASS_GOLEM_SLAM_RADIUS, 16, "impact", 0xcc8844, 4, 0.6);
          }
        }
        break;
      }
      if (enemy.slamCD <= 0 && distToTarget < PENDULUM.BRASS_GOLEM_SLAM_RADIUS + 2) {
        enemy.slamCD = PENDULUM.BRASS_GOLEM_SLAM_CD;
        enemy.slamDelayTimer = PENDULUM.BRASS_GOLEM_SLAM_TELEGRAPH;
        // Telegraph: ground warning circle
        state.telegraphs.push({
          pos: { ...enemy.pos },
          radius: PENDULUM.BRASS_GOLEM_SLAM_RADIUS,
          timer: PENDULUM.BRASS_GOLEM_SLAM_TELEGRAPH,
          color: 0xcc4422,
        });
      }
      break;
    }
    case "chronovore": {
      _updateChronovore(state, enemy, dt, distToTarget);
      break;
    }
  }
}

function _updateChronovore(state: PendulumState, enemy: Enemy, dt: number, distToTarget: number): void {
  enemy.slamCD = Math.max(0, enemy.slamCD - dt);
  enemy.spawnCD = Math.max(0, enemy.spawnCD - dt);
  enemy.beamCD = Math.max(0, enemy.beamCD - dt);

  // Phase transitions
  const hpPct = enemy.hp / enemy.maxHp;
  if (hpPct <= PENDULUM.CHRONOVORE_PHASE3_HP && enemy.bossPhase < 2) {
    enemy.bossPhase = 2;
    enemy.speed *= PENDULUM.CHRONOVORE_ENRAGE_SPEED;
    enemy.damage *= PENDULUM.CHRONOVORE_ENRAGE_DAMAGE;
    addNotification(state, "CHRONOVORE ENRAGED!", 0xff4444);
    state.pendingBossRoar = true;
  } else if (hpPct <= PENDULUM.CHRONOVORE_PHASE2_HP && enemy.bossPhase < 1) {
    enemy.bossPhase = 1;
    addNotification(state, "CHRONOVORE PHASE 2", 0xff8844);
    state.pendingBossRoar = true;
  }

  // Slam attack — telegraph delay then damage
  if (enemy.slamDelayTimer > 0) {
    enemy.slamDelayTimer -= dt * enemy.timeSlowFactor;
    if (enemy.slamDelayTimer <= 0) {
      if (enemy.behavior !== "dead") {
        if (distXZ(enemy.pos, state.player.pos) < PENDULUM.CHRONOVORE_SLAM_RADIUS) {
          _damagePlayer(state, PENDULUM.CHRONOVORE_SLAM_DAMAGE);
        }
        state.pendingSlam = { x: enemy.pos.x, z: enemy.pos.z };
        addScreenShake(state, 12, 0.3);
        spawnParticleRing(state, enemy.pos, PENDULUM.CHRONOVORE_SLAM_RADIUS, 24, "impact", 0xff6644, 6, 0.8);
      }
    }
  } else if (enemy.slamCD <= 0 && distToTarget < PENDULUM.CHRONOVORE_SLAM_RADIUS) {
    enemy.slamCD = PENDULUM.CHRONOVORE_SLAM_CD;
    enemy.slamDelayTimer = PENDULUM.CHRONOVORE_SLAM_TELEGRAPH;
    state.telegraphs.push({
      pos: { ...enemy.pos },
      radius: PENDULUM.CHRONOVORE_SLAM_RADIUS,
      timer: PENDULUM.CHRONOVORE_SLAM_TELEGRAPH,
      color: 0xff4422,
    });
  }

  // Spawn minions
  if (enemy.spawnCD <= 0 && enemy.bossPhase >= 1) {
    enemy.spawnCD = PENDULUM.CHRONOVORE_SPAWN_CD;
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2 + Math.random() * 0.5;
      const spawnPos: Vec3 = {
        x: enemy.pos.x + Math.cos(angle) * 5,
        y: 0,
        z: enemy.pos.z + Math.sin(angle) * 5,
      };
      _spawnEnemy(state, "gear_drone", spawnPos, "player");
    }
    addNotification(state, "Chronovore summons minions!", 0xff8844);
  }

  // Chrono beam
  if (enemy.beamCD <= 0 && distToTarget < 25) {
    enemy.beamCD = PENDULUM.CHRONOVORE_BEAM_CD;
    enemy.beamTimer = PENDULUM.CHRONOVORE_BEAM_DURATION;
    const dx = state.player.pos.x - enemy.pos.x;
    const dz = state.player.pos.z - enemy.pos.z;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d > 0.1) {
      state.projectiles.push({
        id: genPendulumId(state),
        pos: { x: enemy.pos.x, y: enemy.pos.y + 2, z: enemy.pos.z },
        vel: { x: (dx / d) * 12, y: 0, z: (dz / d) * 12 },
        damage: PENDULUM.CHRONOVORE_BEAM_DAMAGE, life: 2.0,
        type: "chrono_beam", owner: "enemy", ownerId: enemy.id,
        bouncesLeft: 0,
      });
    }
  }
}

function _enemyAttack(state: PendulumState, enemy: Enemy): void {
  const p = state.player;

  if (enemy.target === "player") {
    const d = distXZ(enemy.pos, p.pos);
    if (d > PENDULUM.ENEMY_ATTACK_RANGE + 1) return;

    let dmg = enemy.damage;
    if (state.waveModifier === "overclock") dmg *= PENDULUM.OVERCLOCK_DAMAGE_MULT;

    _damagePlayer(state, dmg, enemy.pos);
  } else if (enemy.target === "tower") {
    // All pillars destroyed = tower takes double damage
    const allPillarsDown = state.pillars.every(p => p.status === "destroyed");
    const towerDmg = PENDULUM.ENEMY_TOWER_DAMAGE * (allPillarsDown ? 2 : 1);
    state.clockTower.hp = hpDamage(state.clockTower.hp, towerDmg);
    state.stats.towerDamage += towerDmg;
    spawnParticles(state, { x: 0, y: 5, z: 0 }, allPillarsDown ? 6 : 3, "gear_bit", allPillarsDown ? 0xff4444 : 0xcc8844, 3, 0.4);
  } else if (enemy.target === "pillar" && enemy.targetPillarIdx >= 0) {
    const pil = state.pillars[enemy.targetPillarIdx];
    if (pil.status !== "destroyed") {
      pil.hp = hpDamage(pil.hp, PENDULUM.ENEMY_PILLAR_DAMAGE);
      // Transition to damaged at threshold
      if (pil.status === "active" && pil.hp / pil.maxHp <= PENDULUM.PILLAR_DAMAGED_PCT) {
        pil.status = "damaged";
        addNotification(state, "PILLAR DAMAGED!", 0xcc8844);
        spawnParticles(state, pil.pos, 8, "gear_bit", 0xcc8844, 4, 0.6);
      }
      if (pil.hp <= 0) {
        pil.hp = 0;
        pil.status = "destroyed";
        state.stats.pillarsLost++;
        addNotification(state, "GEAR PILLAR DESTROYED!", 0xff4444);
        addScreenShake(state, 6, 0.2);
        spawnParticles(state, pil.pos, 15, "gear_bit", 0xcc6622, 6, 1.0);
        // Check if all pillars down
        if (state.pillars.every(p => p.status === "destroyed")) {
          addNotification(state, "ALL PILLARS FALLEN — TOWER VULNERABLE!", 0xff2222);
          addScreenShake(state, 10, 0.4);
          flashScreen(state, "#ff2222", 0.5, 0.3);
          state.entropy = Math.min(1, state.entropy + 0.2);
        }
      }
    }
  } else if (enemy.target === "turret") {
    // Attack nearest turret
    for (const t of state.turrets) {
      if (distXZ(enemy.pos, t.pos) < PENDULUM.ENEMY_ATTACK_RANGE + 1) {
        t.hp = hpDamage(t.hp, enemy.damage);
        spawnParticles(state, t.pos, 3, "gear_bit", 0x886644, 3, 0.4);
        break;
      }
    }
  }
}

function _damagePlayer(state: PendulumState, rawDmg: number, _attackerPos?: Vec3): void {
  const p = state.player;
  if (p.invincibleTimer > 0 || p.action === "dead") return;

  // Parry check (armor lv3 + within parry window)
  if (p.blocking && p.armorLevel >= 3 && state.parryWindow > 0) {
    state.parryWindow = 0;
    state.lastParrySuccess = 0.5;
    flashScreen(state, "#ffffff", 0.4, 0.15);
    addScreenShake(state, 4, 0.1);
    spawnParticleRing(state, p.pos, 2, 12, "spark", 0xffffff, 5, 0.4);
    addNotification(state, "PARRY!", 0xffffff);
    // Stun nearby enemies and reflect damage
    const reflectDmg = rawDmg * PENDULUM.PARRY_DAMAGE_REFLECT;
    for (const enemy of state.enemies.values()) {
      if (enemy.behavior === "dead") continue;
      if (distXZ(p.pos, enemy.pos) < 5) {
        enemy.stunTimer = Math.max(enemy.stunTimer, PENDULUM.PARRY_STUN_DURATION);
        enemy.behavior = "stunned";
        // Reflect damage back
        enemy.hp = hpDamage(enemy.hp, reflectDmg);
        enemy.hitFlash = 0.2;
        spawnDamageNumber(state, enemy.pos, reflectDmg, 0xffffff, true);
        state.stats.damageDealt += reflectDmg;
        if (enemy.hp <= 0) _killEnemy(state, enemy);
      }
    }
    return; // damage fully negated
  }

  let dmg = rawDmg;
  // Armor upgrade DR
  const dr = p.armorLevel * 0.08;
  if (state.activeBuffs.some(b => b.id === "brass_plating")) dmg *= 0.8;
  // Rust storm reduces player armor
  if (state.waveModifier === "rust_storm") dmg *= (1 + PENDULUM.RUST_STORM_ARMOR_DEBUFF);
  dmg *= (1 - dr);

  // Block reduces damage
  if (p.blocking) {
    dmg *= 0.3;
    spawnParticles(state, p.pos, 3, "spark", 0xffffff, 3, 0.3);
  }

  p.hp = hpDamage(p.hp, dmg);
  state.stats.damageTaken += dmg;
  flashScreen(state, "#ff4444", 0.3, 0.15);

  // Damage direction indicator
  if (_attackerPos) {
    const dx = _attackerPos.x - p.pos.x;
    const dz = _attackerPos.z - p.pos.z;
    const angle = Math.atan2(dx, dz) - p.yaw;
    state.damageIndicators.push({ angle, timer: PENDULUM.DAMAGE_INDICATOR_DURATION });
  }

  if (p.hp <= 0) {
    p.hp = 0;
    p.action = "dead";
    state.deathSequenceTimer = PENDULUM.DEATH_SLOW_MO_DURATION;
  }
}

function _spawnEnemy(state: PendulumState, type: EnemyType, pos: Vec3, target: Enemy["target"]): void {
  const diff = getDiffMult(state);
  const id = genPendulumId(state);

  const baseStats: Record<EnemyType, { hp: number; damage: number; speed: number; flying: boolean }> = {
    gear_drone:    { hp: PENDULUM.GEAR_DRONE_HP, damage: PENDULUM.GEAR_DRONE_DAMAGE, speed: PENDULUM.GEAR_DRONE_SPEED, flying: true },
    spring_knight: { hp: PENDULUM.SPRING_KNIGHT_HP, damage: PENDULUM.SPRING_KNIGHT_DAMAGE, speed: PENDULUM.SPRING_KNIGHT_SPEED, flying: false },
    coil_archer:   { hp: PENDULUM.COIL_ARCHER_HP, damage: PENDULUM.COIL_ARCHER_DAMAGE, speed: PENDULUM.COIL_ARCHER_SPEED, flying: false },
    brass_golem:   { hp: PENDULUM.BRASS_GOLEM_HP, damage: PENDULUM.BRASS_GOLEM_DAMAGE, speed: PENDULUM.BRASS_GOLEM_SPEED, flying: false },
    clock_spider:  { hp: PENDULUM.CLOCK_SPIDER_HP, damage: PENDULUM.CLOCK_SPIDER_DAMAGE, speed: PENDULUM.CLOCK_SPIDER_SPEED, flying: false },
    chronovore:    { hp: PENDULUM.CHRONOVORE_HP, damage: PENDULUM.CHRONOVORE_DAMAGE, speed: PENDULUM.CHRONOVORE_SPEED, flying: false },
  };

  const stats = baseStats[type];
  const waveScale = 1 + (state.wave - 1) * PENDULUM.ENEMY_HP_SCALE_PER_WAVE;
  const waveDmgScale = 1 + (state.wave - 1) * PENDULUM.ENEMY_DMG_SCALE_PER_WAVE;
  const waveSpdScale = 1 + (state.wave - 1) * PENDULUM.ENEMY_SPEED_SCALE_PER_WAVE;
  const hp = Math.ceil(stats.hp * diff.enemyHp * waveScale);

  // Pick random pillar target
  let targetPillarIdx = -1;
  if (target === "pillar") {
    const activePillars = state.pillars.map((p, i) => p.status !== "destroyed" ? i : -1).filter(i => i >= 0);
    if (activePillars.length > 0) {
      targetPillarIdx = activePillars[Math.floor(Math.random() * activePillars.length)];
    } else {
      target = "tower";
    }
  }

  const enemy: Enemy = {
    id, type, pos: { ...pos },
    vel: { x: 0, y: 0, z: 0 },
    rotation: Math.random() * Math.PI * 2,
    hp, maxHp: hp,
    damage: stats.damage * diff.enemyDmg * waveDmgScale,
    speed: stats.speed * waveSpdScale,
    behavior: "approaching",
    attackTimer: Math.random() * 1.0,
    stunTimer: 0, frozenTimer: 0, deathTimer: 0,
    target, targetPillarIdx,
    flying: stats.flying,
    colorVariant: Math.random(),
    hitFlash: 0, bobPhase: Math.random() * Math.PI * 2,
    timeSlowed: false, timeSlowFactor: 1,
    fireCD: PENDULUM.COIL_ARCHER_FIRE_CD * (0.5 + Math.random()),
    chargeCD: PENDULUM.SPRING_KNIGHT_CHARGE_CD * (0.5 + Math.random()),
    chargeTimer: 0,
    chargeDir: { x: 0, y: 0, z: 0 },
    leapCD: PENDULUM.CLOCK_SPIDER_LEAP_CD * (0.5 + Math.random()),
    leapTimer: 0,
    slamCD: 5 + Math.random() * 3,
    slamDelayTimer: 0,
    spawnCD: PENDULUM.CHRONOVORE_SPAWN_CD,
    beamCD: PENDULUM.CHRONOVORE_BEAM_CD,
    beamTimer: 0,
    snaredTimer: 0,
    bossPhase: 0,
    knockbackVel: { x: 0, y: 0, z: 0 },
    knockbackTimer: 0,
  };

  state.enemies.set(id, enemy);

  // Track boss
  if (type === "chronovore") {
    state.bossId = id;
    state.pendingBossRoar = true;
    addNotification(state, "CHRONOVORE APPROACHES!", 0xff4444);
    addScreenShake(state, 8, 0.3);
  }
}

// ========================================================================
// UPDATE: Turrets (clockwork allies)
// ========================================================================

export function updateTurrets(state: PendulumState, dt: number): void {
  // Check for turret destruction
  for (let i = state.turrets.length - 1; i >= 0; i--) {
    if (state.turrets[i].hp <= 0) {
      const t = state.turrets[i];
      spawnParticles(state, t.pos, 12, "gear_bit", 0x886644, 5, 0.8);
      addNotification(state, "TURRET DESTROYED", 0xcc4444);
      state.turrets.splice(i, 1);
    }
  }

  // Enemy melee damage to turrets (enemies within range attack them)
  for (const enemy of state.enemies.values()) {
    if (enemy.behavior === "dead" || enemy.behavior === "frozen" || enemy.behavior === "stunned") continue;
    if (enemy.type === "coil_archer") continue; // archers don't melee turrets
    for (const turret of state.turrets) {
      if (distXZ(enemy.pos, turret.pos) < PENDULUM.ENEMY_ATTACK_RANGE + 0.5) {
        // Enemy attacks nearby turret passively (doesn't stop them from doing other things)
        turret.hp = hpDamage(turret.hp, enemy.damage * 0.3 * dt);
      }
    }
  }

  for (const turret of state.turrets) {
    turret.attackTimer = Math.max(0, turret.attackTimer - dt);
    if (turret.attackTimer > 0) continue;

    // Find nearest enemy
    let nearest: Enemy | null = null;
    let nearestDist = PENDULUM.TURRET_RANGE;
    for (const enemy of state.enemies.values()) {
      if (enemy.behavior === "dead") continue;
      const d = distXZ(turret.pos, enemy.pos);
      if (d < nearestDist) {
        nearest = enemy;
        nearestDist = d;
      }
    }

    if (nearest) {
      turret.attackTimer = PENDULUM.TURRET_FIRE_RATE;
      turret.targetId = nearest.id;
      const dx = nearest.pos.x - turret.pos.x;
      const dz = nearest.pos.z - turret.pos.z;
      turret.barrelRotation = Math.atan2(dx, dz);

      let dmg = PENDULUM.TURRET_DAMAGE * (1 + state.player.turretLevel * 0.3);
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d > 0.1) {
        state.projectiles.push({
          id: genPendulumId(state),
          pos: { x: turret.pos.x, y: turret.pos.y + 1.5, z: turret.pos.z },
          vel: { x: (dx / d) * 20, y: 0, z: (dz / d) * 20 },
          damage: dmg, life: 2.0,
          type: "bolt", owner: "player", ownerId: turret.id,
          bouncesLeft: 0,
        });
      }

      // Turret level 3: slow enemies
      if (state.player.turretLevel >= 3 && nearest.frozenTimer <= 0) {
        nearest.timeSlowed = true;
        nearest.timeSlowFactor = Math.min(nearest.timeSlowFactor, 0.6);
      }
    }
  }
}

// ========================================================================
// UPDATE: Projectiles
// ========================================================================

export function updateProjectiles(state: PendulumState, dt: number): void {
  const p = state.player;

  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const proj = state.projectiles[i];
    proj.life -= dt;

    // Time slow zones and Time Stop affect enemy projectiles
    if (proj.owner === "enemy") {
      let slowFactor = state.timeStopActive ? 0 : 1;
      if (!state.timeStopActive) {
        for (const zone of state.timeSlowZones) {
          if (distXZ(proj.pos, zone.pos) < zone.radius) {
            slowFactor = zone.factor;
            break;
          }
        }
      }
      proj.pos.x += proj.vel.x * dt * slowFactor;
      proj.pos.y += proj.vel.y * dt * slowFactor;
      proj.pos.z += proj.vel.z * dt * slowFactor;
    } else {
      proj.pos.x += proj.vel.x * dt;
      proj.pos.y += proj.vel.y * dt;
      proj.pos.z += proj.vel.z * dt;
    }

    if (proj.life <= 0) {
      state.projectiles.splice(i, 1);
      continue;
    }

    if (proj.owner === "player" || proj.type === "reversed_bolt") {
      // Hit enemies
      for (const enemy of state.enemies.values()) {
        if (enemy.behavior === "dead") continue;
        if (distXZ(proj.pos, enemy.pos) < 1.8) {
          let dmg = proj.damage;
          // Time stop bonus
          if (enemy.frozenTimer > 0) dmg *= PENDULUM.TIME_STOP_DAMAGE_BONUS;

          enemy.hp = hpDamage(enemy.hp, dmg);
          enemy.hitFlash = 0.15;
          state.stats.damageDealt += dmg;
          spawnDamageNumber(state, enemy.pos, dmg, 0xffcc44, false);
          spawnParticles(state, proj.pos, 4, "spark", 0xccaa44, 4, 0.3);

          if (enemy.hp <= 0) _killEnemy(state, enemy);

          // Gear Throw lv3: pierce (don't consume on hit, just keep going)
          if (proj.type === "gear" && state.player.gearThrowLevel >= 3) {
            proj.damage *= 0.85; // slight decay per pierce
            continue; // don't remove projectile
          }

          // Gear bounce
          if (proj.type === "gear" && proj.bouncesLeft > 0) {
            proj.bouncesLeft--;
            // Find next nearest enemy
            let nextTarget: Enemy | null = null;
            let nextDist = PENDULUM.GEAR_THROW_BOUNCE_RANGE;
            for (const e2 of state.enemies.values()) {
              if (e2.id === enemy.id || e2.behavior === "dead") continue;
              const d = distXZ(proj.pos, e2.pos);
              if (d < nextDist) { nextTarget = e2; nextDist = d; }
            }
            if (nextTarget) {
              const dx = nextTarget.pos.x - proj.pos.x;
              const dz = nextTarget.pos.z - proj.pos.z;
              const d = Math.sqrt(dx * dx + dz * dz);
              proj.vel = { x: (dx / d) * PENDULUM.GEAR_THROW_SPEED, y: 0, z: (dz / d) * PENDULUM.GEAR_THROW_SPEED };
              continue;
            }
          }

          state.projectiles.splice(i, 1);
          break;
        }
      }
    } else {
      // Enemy projectile hits player
      if (distXZ(proj.pos, p.pos) < 1.5 && p.invincibleTimer <= 0 && p.action !== "dead") {
        _damagePlayer(state, proj.damage, proj.pos);
        spawnParticles(state, proj.pos, 3, "impact", 0xff6644, 3, 0.3);
        state.projectiles.splice(i, 1);
      }
    }
  }
}

// ========================================================================
// UPDATE: Gear Fragments (resource pickups)
// ========================================================================

export function updateGearFragments(state: PendulumState, dt: number): void {
  const p = state.player;

  for (let i = state.gearFragments.length - 1; i >= 0; i--) {
    const frag = state.gearFragments[i];
    frag.life -= dt;
    if (frag.life <= 0) { state.gearFragments.splice(i, 1); continue; }

    // Physics
    frag.vel.y += PENDULUM.GRAVITY * dt * 0.5;
    frag.pos.x += frag.vel.x * dt;
    frag.pos.y += frag.vel.y * dt;
    frag.pos.z += frag.vel.z * dt;
    if (frag.pos.y < 0.3) { frag.pos.y = 0.3; frag.vel.y = 0; frag.vel.x *= 0.8; frag.vel.z *= 0.8; }

    // Attract to player
    const d = distXZ(p.pos, frag.pos);
    if (d < PENDULUM.GEAR_FRAGMENT_ATTRACT_RANGE) {
      frag.attracted = true;
      const dir = normalize3({ x: p.pos.x - frag.pos.x, y: 0, z: p.pos.z - frag.pos.z });
      const speed = PENDULUM.GEAR_FRAGMENT_SPEED * (1 - d / PENDULUM.GEAR_FRAGMENT_ATTRACT_RANGE);
      frag.pos.x += dir.x * speed * dt;
      frag.pos.z += dir.z * speed * dt;
    }

    // Collect
    if (d < PENDULUM.GEAR_FRAGMENT_COLLECT_RANGE) {
      p.gears += frag.value;
      state.stats.gearsEarned += frag.value;
      state.gearFragments.splice(i, 1);
    }
  }
}

// ========================================================================
// UPDATE: Repair Kits
// ========================================================================

export function updateRepairKits(state: PendulumState, dt: number): void {
  const p = state.player;

  for (let i = state.repairKits.length - 1; i >= 0; i--) {
    const kit = state.repairKits[i];
    kit.life -= dt;
    if (kit.life <= 0) { state.repairKits.splice(i, 1); continue; }

    kit.vel.y += PENDULUM.GRAVITY * dt * 0.5;
    kit.pos.x += kit.vel.x * dt;
    kit.pos.y += kit.vel.y * dt;
    kit.pos.z += kit.vel.z * dt;
    if (kit.pos.y < 0.3) { kit.pos.y = 0.3; kit.vel.y = 0; kit.vel.x *= 0.8; kit.vel.z *= 0.8; }

    if (distXZ(p.pos, kit.pos) < 2.0) {
      p.hp = Math.min(p.maxHp, p.hp + kit.heal);
      spawnParticles(state, kit.pos, 5, "steam", 0x44cc88, 3, 0.4);
      state.repairKits.splice(i, 1);
    }
  }
}

// ========================================================================
// UPDATE: Pillars (regen from upgrade, telegraph cleanup)
// ========================================================================

export function updatePillars(state: PendulumState, dt: number): void {
  const p = state.player;
  // Pillar Ward: passive regen (+2 HP/s per upgrade level)
  if (p.pillarLevel > 0) {
    const regenRate = 2 * p.pillarLevel;
    for (const pil of state.pillars) {
      if (pil.status === "destroyed") continue;
      pil.hp = Math.min(pil.maxHp, pil.hp + regenRate * dt);
      // Pillar can recover from damaged to active
      if (pil.status === "damaged" && pil.hp / pil.maxHp > PENDULUM.PILLAR_DAMAGED_PCT + 0.1) {
        pil.status = "active";
      }
    }
  }

  // Pillar Ward: +30 HP per level (applied once via maxHp tracking)
  // This is handled at upgrade purchase in HUD

  // Update telegraphs
  for (let i = state.telegraphs.length - 1; i >= 0; i--) {
    state.telegraphs[i].timer -= dt;
    if (state.telegraphs[i].timer <= 0) state.telegraphs.splice(i, 1);
  }

  // Update damage direction indicators
  for (let i = state.damageIndicators.length - 1; i >= 0; i--) {
    state.damageIndicators[i].timer -= dt;
    if (state.damageIndicators[i].timer <= 0) state.damageIndicators.splice(i, 1);
  }

  // Hour event message
  if (state.hourEventTimer > 0) state.hourEventTimer -= dt;
}

// ========================================================================
// UPDATE: Dash Trails (speed lv3)
// ========================================================================

export function updateDashTrails(state: PendulumState, dt: number): void {
  for (let i = state.dashTrails.length - 1; i >= 0; i--) {
    const trail = state.dashTrails[i];
    trail.timer -= dt;
    if (trail.timer <= 0) {
      state.dashTrails.splice(i, 1);
      continue;
    }

    // Damage enemies in trail
    for (const enemy of state.enemies.values()) {
      if (enemy.behavior === "dead" || enemy.behavior === "frozen") continue;
      if (distXZ(trail.pos, enemy.pos) < trail.radius) {
        const dmg = PENDULUM.DASH_TRAIL_DAMAGE * dt;
        enemy.hp = hpDamage(enemy.hp, dmg);
        enemy.timeSlowed = true;
        enemy.timeSlowFactor = Math.min(enemy.timeSlowFactor, 0.5);
        if (enemy.hp <= 0) _killEnemy(state, enemy);
      }
    }
  }
}

// ========================================================================
// UPDATE: Time Slow Zones
// ========================================================================

export function updateTimeSlowZones(state: PendulumState, dt: number): void {
  for (let i = state.timeSlowZones.length - 1; i >= 0; i--) {
    state.timeSlowZones[i].timer -= dt;
    if (state.timeSlowZones[i].timer <= 0) {
      state.timeSlowZones.splice(i, 1);
    }
  }
}

// ========================================================================
// UPDATE: Damage Numbers
// ========================================================================

export function updateDamageNumbers(state: PendulumState, dt: number): void {
  for (let i = state.damageNumbers.length - 1; i >= 0; i--) {
    const dn = state.damageNumbers[i];
    dn.timer -= dt;
    dn.pos.y += dt * 2;
    if (dn.timer <= 0) state.damageNumbers.splice(i, 1);
  }
}

// ========================================================================
// UPDATE: Particles
// ========================================================================

export function updateParticles(state: PendulumState, dt: number): void {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const part = state.particles[i];
    part.life -= dt;
    if (part.life <= 0) { state.particles.splice(i, 1); continue; }
    part.pos.x += part.vel.x * dt;
    part.pos.y += part.vel.y * dt;
    part.pos.z += part.vel.z * dt;
    part.vel.y -= 4 * dt; // light gravity on particles
    if (part.pos.y < 0) part.pos.y = 0;
  }

  // Cap particles
  if (state.particles.length > 500) {
    state.particles.splice(0, state.particles.length - 500);
  }

  // Ambient particles + steam vents
  state.ambientParticleTimer -= dt;
  if (state.ambientParticleTimer <= 0) {
    state.ambientParticleTimer = 0.2 + Math.random() * 0.4;

    // Ambient sparks scattered across field
    const half = PENDULUM.GROUND_SIZE / 3;
    const x = (Math.random() - 0.5) * half;
    const z = (Math.random() - 0.5) * half;
    const type = Math.random() < 0.5 ? "steam" as const : "spark" as const;
    state.particles.push({
      pos: { x, y: 0.1, z },
      vel: { x: (Math.random() - 0.5) * 0.5, y: 1 + Math.random() * 2, z: (Math.random() - 0.5) * 0.5 },
      life: 2 + Math.random() * 2, maxLife: 3, color: type === "steam" ? 0x999999 : 0xffaa44,
      size: 0.15 + Math.random() * 0.2, type,
    });

    // Steam vent bursts at tower base (4 vents)
    if (Math.random() < 0.3) {
      const ventAngle = Math.floor(Math.random() * 4) / 4 * Math.PI * 2;
      const vx = Math.cos(ventAngle) * 5;
      const vz = Math.sin(ventAngle) * 5;
      for (let s = 0; s < 3; s++) {
        state.particles.push({
          pos: { x: vx + (Math.random() - 0.5) * 0.5, y: 0.8, z: vz + (Math.random() - 0.5) * 0.5 },
          vel: { x: (Math.random() - 0.5) * 1, y: 3 + Math.random() * 4, z: (Math.random() - 0.5) * 1 },
          life: 1.5 + Math.random() * 1.5, maxLife: 2.5,
          color: 0xaaaaaa, size: 0.3 + Math.random() * 0.3, type: "steam",
        });
      }
    }

    // Clockwork spark near debris (ambient mechanical spark)
    if (Math.random() < 0.15 && state.debris.length > 0) {
      const debris = state.debris[Math.floor(Math.random() * state.debris.length)];
      state.particles.push({
        pos: { x: debris.pos.x, y: debris.height + 0.5, z: debris.pos.z },
        vel: { x: (Math.random() - 0.5) * 2, y: 1 + Math.random(), z: (Math.random() - 0.5) * 2 },
        life: 0.3 + Math.random() * 0.5, maxLife: 0.6,
        color: 0xffcc44, size: 0.1, type: "spark",
      });
    }
  }
}

// ========================================================================
// UPDATE: Notifications
// ========================================================================

export function updateNotifications(state: PendulumState, dt: number): void {
  for (let i = state.notifications.length - 1; i >= 0; i--) {
    state.notifications[i].timer -= dt;
    if (state.notifications[i].timer <= 0) state.notifications.splice(i, 1);
  }
}

// ========================================================================
// UPDATE: Spawn Queue
// ========================================================================

export function updateSpawnQueue(state: PendulumState, dt: number): void {
  if (state.spawnQueue.length === 0) return;

  state.spawnTimer += dt;
  if (state.spawnTimer < PENDULUM.SPAWN_INTERVAL) return;
  state.spawnTimer = 0;

  let spawned = 0;
  while (state.spawnQueue.length > 0 && spawned < PENDULUM.SPAWN_BATCH_SIZE) {
    const entry = state.spawnQueue.shift()!;
    const angle = Math.random() * Math.PI * 2;
    const r = PENDULUM.ENEMY_SPAWN_RADIUS;
    const pos: Vec3 = { x: Math.cos(angle) * r, y: 0, z: Math.sin(angle) * r };

    // Target selection: pillar > turret > player > tower
    let target: Enemy["target"];
    if (entry.targetPillarIdx >= 0) {
      target = "pillar";
    } else if (state.turrets.length > 0 && Math.random() < 0.15) {
      target = "turret";
    } else if (Math.random() < 0.3) {
      target = "player";
    } else {
      target = "tower";
    }

    _spawnEnemy(state, entry.type, pos, target);
    spawned++;
  }
}

// ========================================================================
// UPDATE: Wave Modifiers
// ========================================================================

export function updateWaveModifiers(state: PendulumState, dt: number): void {
  // Rust storm DoT
  if (state.waveModifier === "rust_storm") {
    state.rustStormDotTimer += dt;
    if (state.rustStormDotTimer >= PENDULUM.RUST_STORM_DOT_INTERVAL) {
      state.rustStormDotTimer = 0;
      // Damage player
      if (state.player.action !== "dead") {
        state.player.hp = hpDamage(state.player.hp, PENDULUM.RUST_STORM_DOT_DAMAGE);
        if (state.player.hp <= 0) {
          state.player.hp = 0;
          state.player.action = "dead";
          state.deathSequenceTimer = PENDULUM.DEATH_SLOW_MO_DURATION;
        }
      }
      // Damage pillars
      for (const pil of state.pillars) {
        if (pil.status !== "destroyed") {
          pil.hp = hpDamage(pil.hp, PENDULUM.RUST_STORM_DOT_DAMAGE);
          if (pil.hp <= 0) {
            pil.hp = 0;
            pil.status = "destroyed";
            state.stats.pillarsLost++;
          }
        }
      }
    }
  }

  // Screen effects
  if (state.screenFlash.timer > 0) {
    state.screenFlash.timer -= dt;
  }
  if (state.screenShake > 0) {
    state.screenShake -= dt;
    if (state.screenShake <= 0) state.screenShakeIntensity = 0;
  }
  if (state.hitStopTimer > 0) {
    state.hitStopTimer -= dt;
  }

  // Wave title fade
  if (state.waveTitle.timer > 0) state.waveTitle.timer -= dt;
}

// ========================================================================
// UPDATE: Entropy
// ========================================================================

export function updateEntropy(state: PendulumState): void {
  // Entropy is accumulated per wave, not per tick
  // Just ensure bounds
  state.entropy = Math.max(0, Math.min(1, state.entropy));
}

// ========================================================================
// UPDATE: Clock Hour
// ========================================================================

export function updateClockHour(state: PendulumState, dt: number): void {
  state.clockHourTimer -= dt;
  if (state.clockHourTimer <= 0) {
    state.clockHour++;
    state.clockHourTimer = PENDULUM.HOUR_DURATION;
    addNotification(state, `HOUR ${state.clockHour}`, 0xffcc44);
    // Update clock hands
    state.clockTower.hourHand = (state.clockHour / 12) * 360;
    state.clockTower.minuteHand = (state.clockTower.minuteHand + 30) % 360;

    // ---- Clock Hour Events ----
    const hour = state.clockHour;

    // Healing hours: restore player HP and tower HP
    if ((PENDULUM.HEALING_HOURS as readonly number[]).includes(hour)) {
      const healAmt = state.player.maxHp * PENDULUM.HOUR_HEAL_AMOUNT;
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + healAmt);
      state.clockTower.hp = Math.min(state.clockTower.maxHp, state.clockTower.hp + PENDULUM.HOUR_TOWER_HEAL);
      state.hourEventMsg = "THE TOWER CHIMES — HEALING RESTORATION";
      state.hourEventTimer = 3;
      flashScreen(state, "#44ccaa", 0.3, 0.3);
      spawnParticleRing(state, { x: 0, y: 5, z: 0 }, 8, 20, "chrono", 0x44ccaa, 3, 1.0);
    }

    // Danger hours: extra enemy spawn
    if ((PENDULUM.DANGER_HOURS as readonly number[]).includes(hour)) {
      for (let i = 0; i < PENDULUM.DANGER_EXTRA_ENEMIES; i++) {
        const types: EnemyType[] = ["spring_knight", "clock_spider", "coil_archer"];
        const type = types[Math.floor(Math.random() * types.length)];
        state.spawnQueue.push({ type, delay: 0, targetPillarIdx: -1 });
      }
      state.hourEventMsg = "DANGER HOUR — REINFORCEMENTS INCOMING";
      state.hourEventTimer = 3;
      flashScreen(state, "#cc4422", 0.3, 0.3);
      addScreenShake(state, 4, 0.2);
    }

    // Boss rush at hour 11
    if (hour === PENDULUM.BOSS_RUSH_HOUR) {
      state.spawnQueue.push({ type: "chronovore", delay: 0, targetPillarIdx: -1 });
      state.spawnQueue.push({ type: "brass_golem", delay: 0, targetPillarIdx: -1 });
      state.spawnQueue.push({ type: "brass_golem", delay: 0, targetPillarIdx: -1 });
      state.hourEventMsg = "THE FINAL HOUR APPROACHES — BOSS RUSH";
      state.hourEventTimer = 4;
      flashScreen(state, "#ff2222", 0.5, 0.4);
      addScreenShake(state, 10, 0.3);
    }

    // Victory at hour 12
    if (hour >= PENDULUM.HOURS_PER_GAME && !state.victory) {
      state.victory = true;
      state.phase = "game_over";
      state.bestWave = Math.max(state.bestWave, state.wave);
      state.hourEventMsg = "THE CLOCK STRIKES TWELVE — VICTORY!";
      state.hourEventTimer = 5;
      flashScreen(state, "#ffcc44", 0.6, 0.5);
      addScreenShake(state, 6, 0.3);
    }
  }

  // Minute hand ticks
  state.clockTower.minuteHand += (360 / PENDULUM.HOUR_DURATION) * dt;
  if (state.clockTower.minuteHand >= 360) state.clockTower.minuteHand -= 360;
}

// ========================================================================
// UPDATE: Phase (wave management, win/lose)
// ========================================================================

export function updatePhase(state: PendulumState, dt: number): void {
  // Death sequence
  if (state.deathSequenceTimer > 0) {
    state.deathSequenceTimer -= dt;
    state.hitStopScale = PENDULUM.DEATH_SLOW_MO_SCALE;
    if (state.deathSequenceTimer <= 0) {
      state.phase = "game_over";
      state.bestWave = Math.max(state.bestWave, state.wave);
    }
    return;
  }

  // Tower destroyed
  if (state.clockTower.hp <= 0 && state.phase === "playing") {
    state.clockTower.hp = 0;
    state.phase = "game_over";
    state.bestWave = Math.max(state.bestWave, state.wave);
    addNotification(state, "THE CLOCK TOWER FALLS!", 0xff2222);
    addScreenShake(state, 15, 0.5);
    return;
  }

  // Intermission
  if (state.phase === "intermission") {
    state.phaseTimer -= dt;
    if (state.phaseTimer <= 0 && !state.buffSelectActive) {
      _startWave(state);
    }
    return;
  }

  // Playing — check if wave complete
  if (state.phase === "playing") {
    state.timeSurvived += dt;

    if (state.spawnQueue.length === 0 && state.aliveEnemyCount === 0) {
      // Wave clear
      state.phase = "intermission";
      state.phaseTimer = 4;
      state.bestWave = Math.max(state.bestWave, state.wave);
      state.entropy += PENDULUM.ENTROPY_PER_WAVE;

      addNotification(state, `WAVE ${state.wave} CLEARED`, 0x44ff88);

      // Wave clear stats
      state.waveClearStats = {
        kills: state.enemiesKilled,
        damage: state.stats.damageDealt,
        gears: state.stats.gearsEarned,
        time: state.timeSurvived,
      };

      // Intermission healing
      const healAmt = state.player.maxHp * PENDULUM.INTERMISSION_HEAL_PCT;
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + healAmt);
      // Pillar healing between waves
      for (const pil of state.pillars) {
        if (pil.status !== "destroyed") {
          pil.hp = Math.min(pil.maxHp, pil.hp + PENDULUM.INTERMISSION_PILLAR_HEAL);
        }
      }

      // Tick down buff durations
      for (let i = state.activeBuffs.length - 1; i >= 0; i--) {
        const buff = state.activeBuffs[i];
        if (buff.duration === -1) continue; // permanent
        buff.remaining--;
        if (buff.remaining <= 0) {
          addNotification(state, `${buff.name} expired`, 0x887766);
          state.activeBuffs.splice(i, 1);
        }
      }

      // Offer buff choices
      const choices = [...BUFF_POOL].sort(() => Math.random() - 0.5).slice(0, 3);
      state.buffChoices = choices;
      state.buffSelectActive = true;
    }
  }
}

function _startWave(state: PendulumState): void {
  state.phase = "playing";
  state.wave++;
  state.spawnTimer = 0;
  state.waveClearStats = null; // clear previous wave stats
  state.enemiesKilled = 0;    // reset per-wave kill counter

  // Apply difficulty tower HP on first wave
  if (state.wave === 1) {
    const diff = getDiffMult(state);
    const newMaxHp = Math.ceil(PENDULUM.CLOCK_TOWER_HP * diff.towerHp);
    state.clockTower.maxHp = newMaxHp;
    state.clockTower.hp = newMaxHp;
  }

  const diff = getDiffMult(state);
  const count = Math.ceil((PENDULUM.WAVE_BASE_ENEMIES + state.wave * PENDULUM.WAVE_ENEMY_SCALE) * diff.enemyCount);

  // Choose modifier
  let modifier: WaveModifier = "none";
  if (state.wave >= PENDULUM.MODIFIER_START_WAVE) {
    const mods: WaveModifier[] = ["overclock", "rust_storm", "haywire", "magnetic"];
    modifier = mods[Math.floor(Math.random() * mods.length)];
  }
  state.waveModifier = modifier;
  state.rustStormDotTimer = 0;

  // Apply haywire modifier
  const finalCount = modifier === "haywire" ? Math.ceil(count * PENDULUM.HAYWIRE_SPAWN_MULT) : count;

  // Build spawn queue
  const queue: SpawnEntry[] = [];
  const isBossWave = state.wave % PENDULUM.BOSS_EVERY_N_WAVES === 0;

  for (let i = 0; i < finalCount; i++) {
    let type: EnemyType = "gear_drone";
    const roll = Math.random();

    if (isBossWave && i === 0) {
      type = "chronovore";
    } else if (state.wave >= PENDULUM.BRASS_GOLEM_START_WAVE && roll < 0.08) {
      type = "brass_golem";
    } else if (state.wave >= PENDULUM.CLOCK_SPIDER_START_WAVE && roll < 0.22) {
      type = "clock_spider";
    } else if (state.wave >= PENDULUM.SPRING_KNIGHT_START_WAVE && roll < 0.38) {
      type = "spring_knight";
    } else if (state.wave >= PENDULUM.COIL_ARCHER_START_WAVE && roll < 0.55) {
      type = "coil_archer";
    }

    const targetPillar = Math.random() < 0.4 ? Math.floor(Math.random() * PENDULUM.PILLAR_COUNT) : -1;
    queue.push({ type, delay: 0, targetPillarIdx: targetPillar });
  }

  state.spawnQueue = queue;

  // Wave title
  const modName = WAVE_MODIFIER_NAMES[modifier];
  state.waveTitle = {
    text: `WAVE ${state.wave}${modName ? ` — ${modName}` : ""}`,
    timer: 3.0,
    color: modifier !== "none" ? `#${WAVE_MODIFIER_COLORS[modifier].toString(16).padStart(6, "0")}` : "#ffcc44",
  };
}

// ========================================================================
// BUFF: Apply
// ========================================================================

export function applyBuff(state: PendulumState, buffId: BuffId): void {
  const def = BUFF_POOL.find(b => b.id === buffId);
  if (!def) return;

  // Remove existing of same type
  state.activeBuffs = state.activeBuffs.filter(b => b.id !== buffId);

  state.activeBuffs.push({
    id: def.id,
    name: def.name,
    description: def.description,
    duration: def.duration,
    remaining: def.duration === -1 ? -1 : def.duration,
  });

  // Permanent stat buffs
  if (buffId === "iron_frame") {
    state.player.maxHp += 40;
    state.player.hp += 40;
  }

  addNotification(state, `${def.name}: ${def.description}`, 0x44ccff);
  state.buffSelectActive = false;
}
