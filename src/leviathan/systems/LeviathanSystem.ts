// ---------------------------------------------------------------------------
// Leviathan — The Deep Descent — core game systems
// ---------------------------------------------------------------------------

import { LEVIATHAN } from "../config/LeviathanConfig";
import type {
  LeviathanState, Enemy, EnemyType, Vec3, LeviathanParticle,
} from "../state/LeviathanState";
import { genLeviathanId, UPGRADES, getUpgradeCost } from "../state/LeviathanState";

// ---- Helpers ----

function dist3(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function normalize3(v: Vec3): Vec3 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len < 0.0001) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function hpDamage(current: number, dmg: number): number {
  return Math.max(0, current - dmg);
}

function addNotification(state: LeviathanState, text: string, color: number): void {
  state.notifications.push({ text, timer: 3.0, color });
  if (state.notifications.length > 8) state.notifications.shift();
}

function spawnParticles(
  state: LeviathanState, pos: Vec3, count: number,
  type: LeviathanParticle["type"], color: number, speed: number, life: number,
): void {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const elev = (Math.random() - 0.5) * Math.PI;
    const s = speed * (0.5 + Math.random() * 0.5);
    state.particles.push({
      pos: { x: pos.x, y: pos.y, z: pos.z },
      vel: {
        x: Math.cos(angle) * Math.cos(elev) * s,
        y: Math.sin(elev) * s + 0.5, // slight upward bias (bubbles rise)
        z: Math.sin(angle) * Math.cos(elev) * s,
      },
      life, maxLife: life, color,
      size: 0.15 + Math.random() * 0.25, type,
    });
  }
}

function flashScreen(state: LeviathanState, color: string, intensity: number, duration: number): void {
  state.screenFlash = { color, intensity, timer: duration };
}

function addScreenShake(state: LeviathanState, intensity: number, duration: number): void {
  state.screenShake = Math.max(state.screenShake, duration);
  state.screenShakeIntensity = Math.max(state.screenShakeIntensity, intensity);
}

function spawnDamageNumber(state: LeviathanState, pos: Vec3, value: number, color: number, crit: boolean): void {
  state.damageNumbers.push({
    pos: { x: pos.x + (Math.random() - 0.5) * 0.5, y: pos.y + 1, z: pos.z },
    value: Math.round(value), timer: 1.2, color, crit,
  });
}

const DIFFICULTY_MULT: Record<string, { enemyHp: number; enemyDmg: number; spawnRate: number; oxygenDrain: number }> = {
  easy:      { enemyHp: 0.7, enemyDmg: 0.6, spawnRate: 0.7, oxygenDrain: 0.7 },
  normal:    { enemyHp: 1.0, enemyDmg: 1.0, spawnRate: 1.0, oxygenDrain: 1.0 },
  hard:      { enemyHp: 1.3, enemyDmg: 1.3, spawnRate: 1.3, oxygenDrain: 1.2 },
  nightmare: { enemyHp: 1.7, enemyDmg: 1.6, spawnRate: 1.5, oxygenDrain: 1.4 },
};

const DEPTH_ZONE_NAMES = ["Shallows", "The Nave", "The Crypts", "The Abyss", "Excalibur's Rest"];

function getDiffMult(state: LeviathanState) {
  return DIFFICULTY_MULT[state.difficulty] || DIFFICULTY_MULT.normal;
}

function getDepthDamageMult(state: LeviathanState): number {
  return 1 + state.player.depthLevel * LEVIATHAN.PRESSURE_DAMAGE_BONUS;
}

function getDepthSpeedMult(state: LeviathanState): number {
  return 1 - state.player.depthLevel * LEVIATHAN.PRESSURE_SPEED_PENALTY;
}

// ========================================================================
// UPDATE: Player
// ========================================================================

export function updatePlayer(state: LeviathanState, dt: number): void {
  const p = state.player;
  if (p.action === "dead") return;

  // Cooldowns
  p.tridentCD = Math.max(0, p.tridentCD - dt);
  p.harpoonCD = Math.max(0, p.harpoonCD - dt);
  p.sonarCD = Math.max(0, p.sonarCD - dt);
  p.pressureWaveCD = Math.max(0, p.pressureWaveCD - dt);
  p.lanternFlareCD = Math.max(0, p.lanternFlareCD - dt);
  p.dashCD = Math.max(0, p.dashCD - dt);
  p.invincibleTimer = Math.max(0, p.invincibleTimer - dt);
  p.comboStepTimer = Math.max(0, p.comboStepTimer - dt);
  if (p.comboStepTimer <= 0) p.comboStep = 0;
  p.comboTimer = Math.max(0, p.comboTimer - dt);
  if (p.comboTimer <= 0) p.combo = 0;
  if (p.sonarActive > 0) p.sonarActive -= dt;
  if (p.lanternFlareTimer > 0) p.lanternFlareTimer -= dt;

  // Grabbed state
  if (p.grabbedTimer > 0) {
    p.grabbedTimer -= dt;
    p.action = "grabbed";
    state.chargeHoldTimer = 0; // cancel charge on grab
    // Take continuous damage
    p.hp = hpDamage(p.hp, LEVIATHAN.TENTACLE_DAMAGE * dt);
    if (p.grabbedTimer <= 0) {
      p.action = "idle";
      p.grabbedBy = null;
    }
    return; // can't move while grabbed
  }

  // Dash
  if (p.dashTimer > 0) {
    p.dashTimer -= dt;
    p.pos.x += p.dashDir.x * LEVIATHAN.DASH_SPEED * dt;
    p.pos.y += p.dashDir.y * LEVIATHAN.DASH_SPEED * dt;
    p.pos.z += p.dashDir.z * LEVIATHAN.DASH_SPEED * dt;
    p.action = "dashing";
    if (p.dashTimer <= 0) p.action = "idle";
    // Bubble trail
    if (state.tick % 2 === 0) {
      spawnParticles(state, p.pos, 2, "bubble", 0x88ccff, 1, 0.5);
    }
    return;
  }

  // Mouse look
  if (state.pointerLocked) {
    p.yaw -= state.mouseDX * LEVIATHAN.TURN_SPEED * 0.002;
    p.pitch -= state.mouseDY * LEVIATHAN.PITCH_SPEED * 0.002;
    p.pitch = Math.max(-1.2, Math.min(1.2, p.pitch));
    state.mouseDX = 0;
    state.mouseDY = 0;
  }

  // Movement — full 3D (underwater)
  const keys = state.keys;
  let moveX = 0, moveZ = 0, moveY = 0;
  if (keys.has("w") || keys.has("arrowup")) moveZ -= 1;
  if (keys.has("s") || keys.has("arrowdown")) moveZ += 1;
  if (keys.has("a") || keys.has("arrowleft")) moveX -= 1;
  if (keys.has("d") || keys.has("arrowright")) moveX += 1;
  if (keys.has(" ")) moveY += 1;           // ascend
  if (keys.has("control")) moveY -= 1;     // descend

  const sinY = Math.sin(p.yaw), cosY = Math.cos(p.yaw);
  const worldX = moveX * cosY - moveZ * sinY;
  const worldZ = moveX * sinY + moveZ * cosY;

  const sprinting = keys.has("shift") && p.stamina > 0 && (moveX !== 0 || moveZ !== 0 || moveY !== 0);
  let speed = sprinting ? LEVIATHAN.SPRINT_SWIM_SPEED : LEVIATHAN.SWIM_SPEED;
  speed *= getDepthSpeedMult(state);

  const hasInput = moveX !== 0 || moveZ !== 0 || moveY !== 0;
  if (hasInput) {
    const len = Math.sqrt(worldX * worldX + moveY * moveY + worldZ * worldZ) || 1;
    p.vel.x += (worldX / len) * speed * dt * 8;
    p.vel.y += (moveY / len) * LEVIATHAN.VERTICAL_SPEED * dt * 8;
    p.vel.z += (worldZ / len) * speed * dt * 8;
    p.action = sprinting ? "sprinting" : "swimming";
  } else {
    p.action = "idle";
  }

  if (sprinting) {
    p.stamina = Math.max(0, p.stamina - LEVIATHAN.STAMINA_SPRINT_DRAIN * dt);
  } else {
    p.stamina = Math.min(p.maxStamina, p.stamina + LEVIATHAN.STAMINA_REGEN * dt);
  }

  // Apply velocity
  p.pos.x += p.vel.x * dt;
  p.pos.y += p.vel.y * dt;
  p.pos.z += p.vel.z * dt;

  // Water drag
  p.vel.x *= LEVIATHAN.WATER_DRAG;
  p.vel.y *= LEVIATHAN.WATER_DRAG;
  p.vel.z *= LEVIATHAN.WATER_DRAG;

  // Clamp Y (surface = 0, max depth negative)
  if (p.pos.y > -0.5) { p.pos.y = -0.5; p.vel.y = Math.min(0, p.vel.y); }
  if (p.pos.y < -LEVIATHAN.MAX_DEPTH) { p.pos.y = -LEVIATHAN.MAX_DEPTH; p.vel.y = Math.max(0, p.vel.y); }

  // Clamp X/Z to cathedral bounds
  const hw = LEVIATHAN.CATHEDRAL_WIDTH / 2;
  p.pos.x = Math.max(-hw, Math.min(hw, p.pos.x));
  p.pos.z = Math.max(-15, Math.min(15, p.pos.z));

  // Depth tracking
  p.depth = Math.abs(p.pos.y);
  p.depthLevel = Math.min(LEVIATHAN.DEPTH_LEVELS - 1, Math.floor(p.depth / LEVIATHAN.DEPTH_ZONE_SIZE));
  state.stats.deepestDepth = Math.max(state.stats.deepestDepth, p.depth);

  // Oxygen (affected by difficulty and lung upgrade)
  const diff = getDiffMult(state);
  const oxygenDrain = (LEVIATHAN.OXYGEN_DRAIN_RATE + p.depth * LEVIATHAN.OXYGEN_DEPTH_MULT) * diff.oxygenDrain;
  const lungBonus = 1 - p.lungLevel * 0.12;
  p.oxygen -= oxygenDrain * lungBonus * dt;
  state.stats.oxygenUsed += oxygenDrain * lungBonus * dt;

  // Depth zone transition notification
  if (p.depthLevel !== state.lastDepthLevel) {
    const zoneName = DEPTH_ZONE_NAMES[p.depthLevel] || `Zone ${p.depthLevel + 1}`;
    const deeper = p.depthLevel > state.lastDepthLevel;
    addNotification(state, `${deeper ? "DESCENDING" : "ASCENDING"} — ${zoneName}`, deeper ? 0x4488cc : 0x44ccaa);
    state.lastDepthLevel = p.depthLevel;
    flashScreen(state, deeper ? "#224466" : "#22664466", 0.2, 0.3);
  }

  // Altar proximity check (for upgrades)
  state.nearAltar = false;
  for (const ruin of state.ruins) {
    if (ruin.type === "altar" && dist3(p.pos, ruin.pos) < 4) {
      state.nearAltar = true;
      break;
    }
  }

  // Check air pockets
  for (const pocket of state.airPockets) {
    if (dist3(p.pos, pocket.pos) < pocket.radius) {
      p.oxygen = Math.min(p.maxOxygen, p.oxygen + LEVIATHAN.OXYGEN_REFILL_RATE * dt);
    }
  }

  p.oxygen = Math.max(0, Math.min(p.maxOxygen, p.oxygen));

  // Oxygen depletion damage
  if (p.oxygen <= 0) {
    p.hp = hpDamage(p.hp, LEVIATHAN.OXYGEN_DAMAGE_RATE * dt);
    if (p.hp <= 0) {
      p.hp = 0;
      p.action = "dead";
      state.deathSequenceTimer = LEVIATHAN.DEATH_SLOW_MO_DURATION;
    }
  }

  // Passive regen
  p.hp = Math.min(p.maxHp, p.hp + LEVIATHAN.HP_REGEN * dt);

  // Block
  p.blocking = state.rightMouseDown;

  // Underwater currents
  for (const current of state.currents) {
    const d = dist3(p.pos, current.startPos);
    if (d < current.width) {
      const factor = (1 - d / current.width) * current.speed;
      p.vel.x += current.direction.x * factor * dt;
      p.vel.y += current.direction.y * factor * dt;
      p.vel.z += current.direction.z * factor * dt;
    }
  }

  // ---- Environmental Hazards ----

  // Abyssal vents — pulse damage
  for (const vent of state.vents) {
    vent.pulsePhase += dt;
    vent.active = Math.sin(vent.pulsePhase / LEVIATHAN.VENT_PULSE_PERIOD * Math.PI * 2) > 0;
    if (vent.active && dist3(p.pos, vent.pos) < vent.radius) {
      p.hp = hpDamage(p.hp, vent.damage * dt);
      if (state.tick % 15 === 0) {
        spawnParticles(state, p.pos, 2, "bubble", 0xff6644, 2, 0.5);
      }
      if (p.hp <= 0) { p.hp = 0; p.action = "dead"; state.deathSequenceTimer = LEVIATHAN.DEATH_SLOW_MO_DURATION; }
    }
  }

  // Bioluminescent mines — explode on proximity
  for (const mine of state.mines) {
    if (!mine.armed) {
      mine.glowPhase += dt;
      if (mine.glowPhase >= LEVIATHAN.MINE_REARM_TIME) { mine.armed = true; mine.glowPhase = 0; }
      continue;
    }
    if (dist3(p.pos, mine.pos) < LEVIATHAN.MINE_TRIGGER_RADIUS) {
      mine.armed = false;
      mine.glowPhase = 0;
      // Explosion — damage player and nearby enemies
      if (p.invincibleTimer <= 0) {
        let mineDmg = mine.damage;
        if (p.blocking) mineDmg *= 0.3;
        p.hp = hpDamage(p.hp, mineDmg);
        state.stats.damageTaken += mineDmg;
      }
      for (const enemy of state.enemies.values()) {
        if (enemy.behavior === "dead") continue;
        if (dist3(mine.pos, enemy.pos) < LEVIATHAN.MINE_EXPLOSION_RADIUS) {
          enemy.hp = hpDamage(enemy.hp, mine.damage * 1.5);
          enemy.stunTimer = Math.max(enemy.stunTimer, 1.0);
          enemy.behavior = "stunned";
          if (enemy.hp <= 0) _killEnemy(state, enemy);
        }
      }
      addScreenShake(state, 8, 0.3);
      flashScreen(state, "#ff8844", 0.4, 0.2);
      spawnParticles(state, mine.pos, 15, "spark", 0xff8844, 6, 0.8);
      spawnParticles(state, mine.pos, 10, "bubble", 0xffcc88, 4, 0.6);
      addNotification(state, "MINE!", 0xff8844);
    }
  }

  // Poison clouds — damage over time, drift
  for (let i = state.poisonClouds.length - 1; i >= 0; i--) {
    const cloud = state.poisonClouds[i];
    cloud.timer -= dt;
    if (cloud.timer <= 0) { state.poisonClouds.splice(i, 1); continue; }
    cloud.pos.x += cloud.vel.x * dt;
    cloud.pos.y += cloud.vel.y * dt;
    cloud.pos.z += cloud.vel.z * dt;
    if (dist3(p.pos, cloud.pos) < cloud.radius && p.invincibleTimer <= 0) {
      p.hp = hpDamage(p.hp, LEVIATHAN.POISON_CLOUD_DAMAGE * dt);
      if (p.hp <= 0) { p.hp = 0; p.action = "dead"; state.deathSequenceTimer = LEVIATHAN.DEATH_SLOW_MO_DURATION; }
    }
  }

  // ---- Charged Heavy Attack (hold LMB > 0.8s, release to fire) ----
  // Only accumulate charge if normal trident won't fire (trident fires on mouseDown with CD ready)
  // Charge accumulates *while* attacking — once charge is full, NEXT release triggers heavy
  if (state.mouseDown && p.dashTimer <= 0 && p.grabbedTimer <= 0) {
    state.chargeHoldTimer += dt;
  } else if (state.chargeHoldTimer >= LEVIATHAN.HEAVY_ATTACK_CHARGE_TIME && !state.mouseDown) {
    // Release charged attack
    state.chargeHoldTimer = 0;
    p.tridentCD = LEVIATHAN.TRIDENT_COOLDOWN * 2; // longer CD for heavy
    state.stats.abilitiesUsed++;
    const dmgMult = getDepthDamageMult(state);
    const damage = LEVIATHAN.TRIDENT_DAMAGE * LEVIATHAN.HEAVY_ATTACK_DAMAGE_MULT * dmgMult * (1 + p.tridentLevel * 0.2);
    const sinY = Math.sin(p.yaw), cosY = Math.cos(p.yaw);
    const fwd: Vec3 = { x: -sinY, y: -Math.sin(p.pitch) * 0.5, z: -cosY };
    for (const enemy of state.enemies.values()) {
      if (enemy.behavior === "dead") continue;
      if (dist3(p.pos, enemy.pos) > LEVIATHAN.HEAVY_ATTACK_RANGE) continue;
      const toE = normalize3({ x: enemy.pos.x - p.pos.x, y: enemy.pos.y - p.pos.y, z: enemy.pos.z - p.pos.z });
      const dot = fwd.x * toE.x + fwd.y * toE.y + fwd.z * toE.z;
      if (dot < 0.3) continue;
      enemy.hp = hpDamage(enemy.hp, damage);
      enemy.hitFlash = 0.25;
      enemy.stunTimer = Math.max(enemy.stunTimer, LEVIATHAN.HEAVY_ATTACK_STUN);
      enemy.behavior = "stunned";
      const kb = normalize3({ x: enemy.pos.x - p.pos.x, y: enemy.pos.y - p.pos.y, z: enemy.pos.z - p.pos.z });
      enemy.knockbackVel = { x: kb.x * LEVIATHAN.HEAVY_ATTACK_KNOCKBACK, y: kb.y * LEVIATHAN.HEAVY_ATTACK_KNOCKBACK, z: kb.z * LEVIATHAN.HEAVY_ATTACK_KNOCKBACK };
      enemy.knockbackTimer = 0.4;
      spawnDamageNumber(state, enemy.pos, damage, 0xffcc44, true);
      state.stats.damageDealt += damage;
      if (enemy.hp <= 0) _killEnemy(state, enemy);
    }
    addScreenShake(state, 8, 0.15);
    flashScreen(state, "#44ccff", 0.3, 0.2);
    spawnParticles(state, p.pos, 12, "bubble", 0x88ccff, 5, 0.6);
    addNotification(state, "HEAVY STRIKE", 0x44ccff);
  } else if (!state.mouseDown) {
    state.chargeHoldTimer = 0;
  }

  // Collect fragments
  for (const frag of state.fragments) {
    if (frag.collected) continue;
    if (dist3(p.pos, frag.pos) < LEVIATHAN.FRAGMENT_COLLECT_RANGE) {
      frag.collected = true;
      p.fragments++;
      addNotification(state, `EXCALIBUR FRAGMENT ${p.fragments}/${LEVIATHAN.FRAGMENT_COUNT}`, 0xffcc44);
      flashScreen(state, "#ffcc44", 0.4, 0.3);
      addScreenShake(state, 4, 0.2);
      spawnParticles(state, frag.pos, 15, "glow", 0xffcc44, 5, 1.0);

      // Fragment milestones
      if (p.fragments >= 3 && state.milestoneReached < 3) {
        state.milestoneReached = 3;
        p.hp = Math.min(p.maxHp, p.hp + p.maxHp * LEVIATHAN.MILESTONE_3_HEAL);
        p.oxygen = Math.min(p.maxOxygen, p.oxygen + p.maxOxygen * 0.3);
        addNotification(state, "MILESTONE — EXCALIBUR STIRS — HP RESTORED", 0x44ffaa);
        flashScreen(state, "#44ffaa", 0.4, 0.3);
        spawnParticles(state, p.pos, 20, "glow", 0x44ffaa, 6, 1.0);
      }
      if (p.fragments >= 5 && state.milestoneReached < 5) {
        state.milestoneReached = 5;
        addNotification(state, "MILESTONE — EXCALIBUR AWAKENS — ABILITIES ENHANCED", 0xffcc44);
        flashScreen(state, "#ffcc44", 0.5, 0.4);
        spawnParticles(state, p.pos, 25, "glow", 0xffcc44, 7, 1.2);
        // Permanent CD reduction on all abilities
        // (applied each frame via a multiplier check in useAbilities)
      }

      // All fragments — begin escape to surface
      if (p.fragments >= LEVIATHAN.FRAGMENT_COUNT && !state.escaping) {
        state.escaping = true;
        state.escapeTimer = LEVIATHAN.ESCAPE_TIME_LIMIT;
        addNotification(state, `EXCALIBUR REFORGED — ${LEVIATHAN.ESCAPE_TIME_LIMIT}s TO REACH THE SURFACE!`, 0xffdd00);
        flashScreen(state, "#ffdd00", 0.8, 0.5);
        addScreenShake(state, 10, 0.4);
        // Cathedral starts collapsing — all enemies become aggressive
        for (const enemy of state.enemies.values()) {
          if (enemy.behavior !== "dead") {
            enemy.aggroed = true;
            enemy.revealed = true;
          }
        }
      }

      // Escape timer countdown
      if (state.escaping && state.escapeTimer > 0) {
        state.escapeTimer -= dt;
        // Boss chases during escape
        if (state.bossId) {
          const boss = state.enemies.get(state.bossId);
          if (boss && boss.behavior !== "dead") {
            const dir = normalize3({ x: p.pos.x - boss.pos.x, y: p.pos.y - boss.pos.y, z: p.pos.z - boss.pos.z });
            boss.pos.x += dir.x * LEVIATHAN.ESCAPE_BOSS_CHASE_SPEED * dt;
            boss.pos.y += dir.y * LEVIATHAN.ESCAPE_BOSS_CHASE_SPEED * dt;
            boss.pos.z += dir.z * LEVIATHAN.ESCAPE_BOSS_CHASE_SPEED * dt;
            boss.aggroed = true;
          }
        }
        // Spawn poison clouds during escape (cathedral leaking)
        if (state.tick % 120 === 0) {
          state.poisonClouds.push({
            pos: { x: p.pos.x + (Math.random() - 0.5) * 15, y: p.pos.y + (Math.random() - 0.5) * 8, z: p.pos.z + (Math.random() - 0.5) * 10 },
            radius: LEVIATHAN.POISON_CLOUD_RADIUS,
            damage: LEVIATHAN.POISON_CLOUD_DAMAGE,
            timer: LEVIATHAN.POISON_CLOUD_DURATION,
            vel: { x: (Math.random() - 0.5) * 0.5, y: 0.3, z: (Math.random() - 0.5) * 0.5 },
          });
        }
        // Time's up — death
        if (state.escapeTimer <= 0) {
          p.hp = 0;
          p.action = "dead";
          state.deathSequenceTimer = LEVIATHAN.DEATH_SLOW_MO_DURATION;
          addNotification(state, "THE CATHEDRAL COLLAPSED", 0xff2222);
        }
      }

      // During escape: push enemies away from surface to prevent soft-lock
      if (state.escaping) {
        for (const enemy of state.enemies.values()) {
          if (enemy.behavior === "dead") continue;
          if (enemy.pos.y > -5) {
            // Force enemies downward away from surface
            enemy.vel.y -= 3 * dt;
            enemy.pos.y -= 2 * dt;
          }
        }
      }

      // Victory when escaping and reaching surface
      if (state.escaping && p.pos.y > -2) {
        state.victory = true;
        state.phase = "game_over";
        addNotification(state, "YOU ESCAPED THE ABYSS!", 0xffdd00);
        flashScreen(state, "#ffffff", 0.6, 0.5);
      }
    }
  }

  // Swimming bubbles
  if (hasInput && state.tick % 10 === 0) {
    spawnParticles(state, p.pos, 1, "bubble", 0x88ccdd, 0.5, 1.0);
  }
}

// ========================================================================
// UPDATE: Abilities
// ========================================================================

export function useAbilities(state: LeviathanState): void {
  const p = state.player;
  const keys = state.keys;
  if (p.action === "dead" || p.action === "grabbed") return;

  const dmgMult = getDepthDamageMult(state);
  const comboBonus = 1 + p.combo * LEVIATHAN.COMBO_DAMAGE_BONUS;
  // Milestone 5: permanent CD reduction
  const cdMult = state.milestoneReached >= 5 ? (1 - LEVIATHAN.MILESTONE_5_ABILITY_BOOST) : 1;

  // LMB: Trident Thrust
  if (state.mouseDown && p.tridentCD <= 0 && p.action !== "dashing") {
    p.tridentCD = LEVIATHAN.TRIDENT_COOLDOWN;
    state.stats.abilitiesUsed++;

    const step = p.comboStep;
    const mult = LEVIATHAN.TRIDENT_COMBO_MULT[step] ?? 1;
    const damage = LEVIATHAN.TRIDENT_DAMAGE * mult * dmgMult * comboBonus * (1 + p.tridentLevel * 0.2);
    const range = LEVIATHAN.TRIDENT_RANGE;
    const isFinal = step === LEVIATHAN.TRIDENT_COMBO_COUNT - 1;
    const kb = isFinal ? LEVIATHAN.TRIDENT_HEAVY_KNOCKBACK : LEVIATHAN.TRIDENT_KNOCKBACK;

    const sinY = Math.sin(p.yaw), cosY = Math.cos(p.yaw);
    const fwd: Vec3 = { x: -sinY, y: -Math.sin(p.pitch) * 0.5, z: -cosY };

    for (const enemy of state.enemies.values()) {
      if (enemy.behavior === "dead") continue;
      const d = dist3(p.pos, enemy.pos);
      if (d > range) continue;
      const toE = normalize3({ x: enemy.pos.x - p.pos.x, y: enemy.pos.y - p.pos.y, z: enemy.pos.z - p.pos.z });
      const dot = fwd.x * toE.x + fwd.y * toE.y + fwd.z * toE.z;
      if (dot < 0.35) continue;

      enemy.hp = hpDamage(enemy.hp, damage);
      enemy.hitFlash = 0.15;
      state.stats.damageDealt += damage;
      spawnDamageNumber(state, enemy.pos, damage, isFinal ? 0xffcc00 : 0x44ccff, isFinal);
      spawnParticles(state, enemy.pos, isFinal ? 10 : 4, "bubble", 0x88ccff, 4, 0.5);

      const kbDir = normalize3({ x: enemy.pos.x - p.pos.x, y: enemy.pos.y - p.pos.y, z: enemy.pos.z - p.pos.z });
      enemy.knockbackVel = { x: kbDir.x * kb, y: kbDir.y * kb, z: kbDir.z * kb };
      enemy.knockbackTimer = 0.2;

      if (isFinal) {
        addScreenShake(state, 6, 0.12);
        state.hitStopTimer = LEVIATHAN.HIT_STOP_CRIT;
        state.hitStopScale = LEVIATHAN.HIT_STOP_SCALE;
      }

      p.combo = Math.min(p.combo + 1, LEVIATHAN.COMBO_MAX);
      p.comboTimer = LEVIATHAN.COMBO_WINDOW;
      p.maxCombo = Math.max(p.maxCombo, p.combo);

      if (enemy.hp <= 0) _killEnemy(state, enemy);
    }

    p.comboStep = (p.comboStep + 1) % LEVIATHAN.TRIDENT_COMBO_COUNT;
    p.comboStepTimer = LEVIATHAN.TRIDENT_COMBO_WINDOW;
  }

  // Q: Harpoon Shot
  if (keys.has("q") && p.harpoonCD <= 0) {
    keys.delete("q");
    p.harpoonCD = LEVIATHAN.HARPOON_COOLDOWN * cdMult;
    state.stats.abilitiesUsed++;
    const sinY = Math.sin(p.yaw), cosY = Math.cos(p.yaw);
    const dir: Vec3 = normalize3({ x: -sinY, y: -Math.sin(p.pitch) * 0.8, z: -cosY });
    // Synergy: harpoon deals bonus to stunned enemies (applied on hit in projectile update)
    const damage = LEVIATHAN.HARPOON_DAMAGE * dmgMult * (1 + p.harpoonLevel * 0.25);
    state.projectiles.push({
      id: genLeviathanId(state),
      pos: { x: p.pos.x, y: p.pos.y, z: p.pos.z },
      vel: { x: dir.x * LEVIATHAN.HARPOON_SPEED, y: dir.y * LEVIATHAN.HARPOON_SPEED, z: dir.z * LEVIATHAN.HARPOON_SPEED },
      damage, life: 3.0, type: "harpoon", owner: "player", ownerId: "player",
    });
    spawnParticles(state, p.pos, 3, "bubble", 0xaaddff, 3, 0.3);
  }

  // E: Sonar Pulse
  if (keys.has("e") && p.sonarCD <= 0) {
    keys.delete("e");
    p.sonarCD = Math.max(2, (LEVIATHAN.SONAR_COOLDOWN - p.sonarLevel * 1.0) * cdMult);
    state.stats.abilitiesUsed++;
    const radius = LEVIATHAN.SONAR_RADIUS * (1 + p.sonarLevel * 0.2);
    p.sonarActive = LEVIATHAN.SONAR_REVEAL_DURATION;
    state.sonarPings.push({
      pos: { ...p.pos }, radius: 0, maxRadius: radius, timer: 1.5,
    });
    // Synergy: sonar after lantern flare = 2x stun duration
    const flareRecent = p.lanternFlareTimer > LEVIATHAN.LANTERN_FLARE_DURATION - 3;
    const stunDur = flareRecent ? LEVIATHAN.SONAR_STUN_DURATION * LEVIATHAN.SONAR_AFTER_FLARE_BONUS : LEVIATHAN.SONAR_STUN_DURATION;
    for (const enemy of state.enemies.values()) {
      if (enemy.behavior === "dead") continue;
      if (dist3(p.pos, enemy.pos) < radius) {
        enemy.revealed = true;
        enemy.revealTimer = LEVIATHAN.SONAR_REVEAL_DURATION;
        enemy.stunTimer = Math.max(enemy.stunTimer, stunDur);
        enemy.behavior = "stunned";
      }
    }
    addNotification(state, flareRecent ? "SYNERGY — DEEP SONAR" : "SONAR PULSE", flareRecent ? 0xffcc44 : 0x44ffaa);
    flashScreen(state, "#44ffaa", 0.2, 0.2);
  }

  // R: Pressure Wave
  if (keys.has("r") && p.pressureWaveCD <= 0) {
    keys.delete("r");
    p.pressureWaveCD = LEVIATHAN.PRESSURE_WAVE_COOLDOWN * cdMult;
    state.stats.abilitiesUsed++;
    const damage = LEVIATHAN.PRESSURE_WAVE_DAMAGE * dmgMult;
    const radius = LEVIATHAN.PRESSURE_WAVE_RADIUS;
    for (const enemy of state.enemies.values()) {
      if (enemy.behavior === "dead") continue;
      if (dist3(p.pos, enemy.pos) < radius) {
        enemy.hp = hpDamage(enemy.hp, damage);
        enemy.hitFlash = 0.2;
        state.stats.damageDealt += damage;
        spawnDamageNumber(state, enemy.pos, damage, 0x44ccff, false);
        const kb = normalize3({ x: enemy.pos.x - p.pos.x, y: enemy.pos.y - p.pos.y, z: enemy.pos.z - p.pos.z });
        enemy.knockbackVel = { x: kb.x * LEVIATHAN.PRESSURE_WAVE_KNOCKBACK, y: kb.y * LEVIATHAN.PRESSURE_WAVE_KNOCKBACK, z: kb.z * LEVIATHAN.PRESSURE_WAVE_KNOCKBACK };
        enemy.knockbackTimer = 0.4;
        if (enemy.hp <= 0) _killEnemy(state, enemy);
      }
    }
    // Release from grab
    if (p.grabbedTimer > 0) {
      p.grabbedTimer = 0;
      p.action = "idle";
      p.grabbedBy = null;
    }
    spawnParticles(state, p.pos, 20, "bubble", 0x88ccff, 8, 0.8);
    addScreenShake(state, 8, 0.2);
    flashScreen(state, "#88ccff", 0.3, 0.2);
    addNotification(state, "PRESSURE WAVE", 0x88ccff);
  }

  // X: Lantern Flare
  if (keys.has("x") && p.lanternFlareCD <= 0) {
    keys.delete("x");
    p.lanternFlareCD = LEVIATHAN.LANTERN_FLARE_COOLDOWN * cdMult;
    state.stats.abilitiesUsed++;
    p.lanternFlareTimer = LEVIATHAN.LANTERN_FLARE_DURATION;
    for (const enemy of state.enemies.values()) {
      if (enemy.behavior === "dead") continue;
      if (dist3(p.pos, enemy.pos) < LEVIATHAN.LANTERN_FLARE_RADIUS) {
        enemy.stunTimer = Math.max(enemy.stunTimer, LEVIATHAN.LANTERN_FLARE_STUN);
        enemy.behavior = "stunned";
        enemy.revealed = true;
        enemy.revealTimer = LEVIATHAN.LANTERN_FLARE_DURATION;
      }
    }
    flashScreen(state, "#ffffcc", 0.6, 0.3);
    addScreenShake(state, 3, 0.1);
    addNotification(state, "LANTERN FLARE", 0xffffcc);
  }

  // C: Dash
  if (keys.has("c") && p.dashCD <= 0 && p.stamina >= LEVIATHAN.DASH_STAMINA_COST) {
    keys.delete("c");
    p.dashCD = LEVIATHAN.DASH_COOLDOWN;
    p.stamina -= LEVIATHAN.DASH_STAMINA_COST;
    state.chargeHoldTimer = 0; // cancel charge on dash
    p.invincibleTimer = LEVIATHAN.DASH_IFRAMES;
    p.dashTimer = LEVIATHAN.DASH_DURATION;
    const sinY = Math.sin(p.yaw), cosY = Math.cos(p.yaw);
    let dx = 0, dz = 0, dy = 0;
    if (keys.has("w")) dz -= 1;
    if (keys.has("s")) dz += 1;
    if (keys.has("a")) dx -= 1;
    if (keys.has("d")) dx += 1;
    if (keys.has(" ")) dy += 1;
    if (keys.has("control")) dy -= 1;
    if (dx === 0 && dz === 0 && dy === 0) dz = -1;
    const wx = dx * cosY - dz * sinY;
    const wz = dx * sinY + dz * cosY;
    p.dashDir = normalize3({ x: wx, y: dy * 0.5, z: wz });
  }
}

function _killEnemy(state: LeviathanState, enemy: Enemy): void {
  enemy.behavior = "dead";
  enemy.deathTimer = 0.6;
  state.totalKills++;
  spawnParticles(state, enemy.pos, 8, "ink", 0x222244, 4, 0.8);
  spawnParticles(state, enemy.pos, 5, "debris", 0x668888, 3, 0.6);

  // Relic points from kills (depth bonus)
  const lootMult = 1 + state.player.depthLevel * LEVIATHAN.PRESSURE_LOOT_BONUS;
  const basePoints = enemy.type === "abyssal_knight" ? 8 : enemy.type === "coral_golem" ? 3 : 1;
  state.player.relicPoints += Math.ceil(basePoints * lootMult);

  // Drop relic shard
  if (Math.random() < LEVIATHAN.RELIC_SHARD_CHANCE) {
    state.relicShards.push({
      pos: { ...enemy.pos },
      vel: { x: (Math.random() - 0.5) * 2, y: 1, z: (Math.random() - 0.5) * 2 },
      life: 12.0,
      hpRestore: LEVIATHAN.RELIC_SHARD_HP_RESTORE,
      oxygenRestore: LEVIATHAN.RELIC_SHARD_OXYGEN_RESTORE,
    });
  }

  if (enemy.type === "abyssal_knight") {
    addNotification(state, "THE ABYSSAL KNIGHT FALLS!", 0xffcc00);
    addScreenShake(state, 12, 0.4);
    flashScreen(state, "#ffcc00", 0.5, 0.4);
    spawnParticles(state, enemy.pos, 30, "glow", 0xffcc44, 8, 1.5);
  }
}

// ========================================================================
// UPDATE: Enemies
// ========================================================================

export function updateEnemies(state: LeviathanState, dt: number): void {
  const p = state.player;

  for (const enemy of state.enemies.values()) {
    if (enemy.behavior === "dead") {
      enemy.deathTimer -= dt;
      continue;
    }

    enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
    enemy.bobPhase += dt * 2;
    if (enemy.revealTimer > 0) enemy.revealTimer -= dt;
    if (enemy.revealTimer <= 0) enemy.revealed = false;

    // Stun
    if (enemy.stunTimer > 0) {
      enemy.stunTimer -= dt;
      enemy.behavior = "stunned";
      if (enemy.stunTimer <= 0) enemy.behavior = "idle";
      continue;
    }

    // Knockback
    if (enemy.knockbackTimer > 0) {
      enemy.knockbackTimer -= dt;
      enemy.pos.x += enemy.knockbackVel.x * dt;
      enemy.pos.y += enemy.knockbackVel.y * dt;
      enemy.pos.z += enemy.knockbackVel.z * dt;
      enemy.knockbackVel.x *= 0.9;
      enemy.knockbackVel.y *= 0.9;
      enemy.knockbackVel.z *= 0.9;
      continue;
    }

    // Aggro check — enemies only pursue if player is close enough or revealed by lantern
    const dToPlayer = dist3(enemy.pos, p.pos);
    const inLanternRange = p.lanternFlareTimer > 0 && dToPlayer < LEVIATHAN.LANTERN_FLARE_RADIUS;
    enemy.aggroed = dToPlayer < LEVIATHAN.ENEMY_AGGRO_RANGE || inLanternRange || enemy.revealed;

    if (!enemy.aggroed) {
      // Lurk — idle drift
      enemy.behavior = "lurking";
      enemy.pos.y += Math.sin(enemy.bobPhase) * 0.3 * dt;
      enemy.pos.x += Math.sin(enemy.bobPhase * 0.5) * 0.2 * dt;
      enemy.glowIntensity = 0.3 + Math.sin(enemy.bobPhase) * 0.2;
      continue;
    }

    enemy.glowIntensity = 0.8;
    enemy.attackTimer = Math.max(0, enemy.attackTimer - dt);

    // Move toward player
    const dx = p.pos.x - enemy.pos.x;
    const dy = p.pos.y - enemy.pos.y;
    const dz = p.pos.z - enemy.pos.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (dist > 2.5 && enemy.type !== "tentacle") {
      const speed = enemy.speed;
      enemy.pos.x += (dx / dist) * speed * dt;
      enemy.pos.y += (dy / dist) * speed * dt;
      enemy.pos.z += (dz / dist) * speed * dt;
      enemy.rotation = Math.atan2(dx, dz);
      enemy.behavior = "approaching";
    } else if (enemy.attackTimer <= 0) {
      enemy.behavior = "attacking";
      _enemyAttack(state, enemy);
      enemy.attackTimer = 1.5;
    }

    // Bioluminescent bobbing
    enemy.pos.y += Math.sin(enemy.bobPhase) * 0.1 * dt;

    // Type-specific behavior
    _updateEnemySpecials(state, enemy, dt, dist);
  }

  // Remove expired dead enemies
  for (const [id, enemy] of state.enemies) {
    if (enemy.behavior === "dead" && enemy.deathTimer <= 0) {
      state.enemies.delete(id);
    }
  }
}

function _updateEnemySpecials(state: LeviathanState, enemy: Enemy, dt: number, distToPlayer: number): void {
  const p = state.player;

  switch (enemy.type) {
    case "angler": {
      // Low HP retreat — anglers flee when below 30% HP
      if (enemy.hp / enemy.maxHp < 0.3 && distToPlayer < 12) {
        const away = normalize3({ x: enemy.pos.x - p.pos.x, y: enemy.pos.y - p.pos.y, z: enemy.pos.z - p.pos.z });
        enemy.pos.x += away.x * enemy.speed * 1.8 * dt;
        enemy.pos.y += away.y * enemy.speed * dt;
        enemy.pos.z += away.z * enemy.speed * 1.8 * dt;
        enemy.glowIntensity = 0.1; // dim lure when fleeing
        break;
      }
      // Lure mechanic — angler's lure attracts player slightly when in range
      if (distToPlayer < LEVIATHAN.ANGLER_LURE_RANGE && distToPlayer > 3 && enemy.aggroed) {
        // Gentle pull toward lure
        const pullStr = 0.8 * dt;
        const dx = enemy.pos.x - p.pos.x;
        const dy = enemy.pos.y - p.pos.y;
        const dz = enemy.pos.z - p.pos.z;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d > 0.1) {
          p.vel.x += (dx / d) * pullStr;
          p.vel.y += (dy / d) * pullStr;
          p.vel.z += (dz / d) * pullStr;
        }
        // Lure glow intensifies when pulling
        enemy.glowIntensity = 1.0 + Math.sin(state.gameTime * 4) * 0.3;
      }
      break;
    }
    case "jellyfish": {
      enemy.shockCD = Math.max(0, enemy.shockCD - dt);
      if (enemy.shockCD <= 0 && distToPlayer < LEVIATHAN.JELLYFISH_SHOCK_RADIUS) {
        enemy.shockCD = LEVIATHAN.JELLYFISH_SHOCK_CD;
        if (p.invincibleTimer <= 0 && p.action !== "dead") {
          let shockDmg = LEVIATHAN.JELLYFISH_DAMAGE;
          if (p.blocking) shockDmg *= 0.3;
          p.hp = hpDamage(p.hp, shockDmg);
          state.stats.damageTaken += shockDmg;
          spawnParticles(state, p.pos, 5, "spark", 0xff88ff, 3, 0.4);
          flashScreen(state, "#ff88ff", 0.2, 0.1);
        }
      }
      break;
    }
    case "coral_golem": {
      enemy.slamCD = Math.max(0, enemy.slamCD - dt);
      if (enemy.slamCD <= 0 && distToPlayer < LEVIATHAN.CORAL_GOLEM_SLAM_RADIUS) {
        enemy.slamCD = LEVIATHAN.CORAL_GOLEM_SLAM_CD;
        if (p.invincibleTimer <= 0 && p.action !== "dead") {
          let dmg = LEVIATHAN.CORAL_GOLEM_SLAM_DAMAGE;
          if (p.blocking) dmg *= 0.3;
          p.hp = hpDamage(p.hp, dmg);
          state.stats.damageTaken += dmg;
        }
        addScreenShake(state, 8, 0.2);
        spawnParticles(state, enemy.pos, 12, "debris", 0x886655, 5, 0.6);
      }
      break;
    }
    case "tentacle": {
      // Tentacle grabs from a distance
      if (distToPlayer < LEVIATHAN.TENTACLE_GRAB_RANGE && p.action !== "grabbed" && p.action !== "dashing" && p.invincibleTimer <= 0) {
        if (enemy.grabTimer <= 0) {
          p.grabbedTimer = LEVIATHAN.TENTACLE_GRAB_DURATION;
          p.grabbedBy = enemy.id;
          p.action = "grabbed";
          enemy.grabTimer = LEVIATHAN.TENTACLE_GRAB_DURATION + 5; // cooldown after grab
          addNotification(state, "GRABBED!", 0xff4444);
        }
      }
      enemy.grabTimer = Math.max(0, enemy.grabTimer - dt);
      break;
    }
    case "siren": {
      enemy.fireCD = Math.max(0, enemy.fireCD - dt);
      // Strafe — maintain distance, circle around player
      if (distToPlayer < LEVIATHAN.SIREN_RANGE * 0.6 && enemy.aggroed) {
        // Too close — retreat
        const away = normalize3({ x: enemy.pos.x - p.pos.x, y: enemy.pos.y - p.pos.y, z: enemy.pos.z - p.pos.z });
        enemy.pos.x += away.x * enemy.speed * 1.5 * dt;
        enemy.pos.y += away.y * enemy.speed * 0.5 * dt;
        enemy.pos.z += away.z * enemy.speed * 1.5 * dt;
      } else if (distToPlayer < LEVIATHAN.SIREN_RANGE && enemy.aggroed) {
        // Strafe — orbit perpendicular to player direction
        const toP = normalize3({ x: p.pos.x - enemy.pos.x, y: 0, z: p.pos.z - enemy.pos.z });
        const perp = { x: -toP.z, y: 0, z: toP.x }; // perpendicular
        enemy.pos.x += perp.x * enemy.speed * dt;
        enemy.pos.z += perp.z * enemy.speed * dt;
      }
      if (enemy.fireCD <= 0 && distToPlayer < LEVIATHAN.SIREN_RANGE && enemy.aggroed) {
        enemy.fireCD = LEVIATHAN.SIREN_FIRE_CD;
        const dir = normalize3({ x: p.pos.x - enemy.pos.x, y: p.pos.y - enemy.pos.y, z: p.pos.z - enemy.pos.z });
        state.projectiles.push({
          id: genLeviathanId(state),
          pos: { ...enemy.pos },
          vel: { x: dir.x * LEVIATHAN.SIREN_SHOT_SPEED, y: dir.y * LEVIATHAN.SIREN_SHOT_SPEED, z: dir.z * LEVIATHAN.SIREN_SHOT_SPEED },
          damage: LEVIATHAN.SIREN_DAMAGE, life: 4.0,
          type: "siren_bolt", owner: "enemy", ownerId: enemy.id,
        });
        spawnParticles(state, enemy.pos, 3, "glow", 0xff44aa, 2, 0.4);
      }
      break;
    }
    case "abyssal_knight": {
      enemy.chargeCD = Math.max(0, enemy.chargeCD - dt);
      enemy.slamCD = Math.max(0, enemy.slamCD - dt);
      enemy.spawnCD = Math.max(0, enemy.spawnCD - dt);

      // Phase transitions
      const hpPct = enemy.hp / enemy.maxHp;
      if (hpPct <= LEVIATHAN.ABYSSAL_KNIGHT_PHASE3_HP && enemy.bossPhase < 2) {
        enemy.bossPhase = 2;
        enemy.speed *= LEVIATHAN.ABYSSAL_KNIGHT_ENRAGE_SPEED;
        enemy.damage *= LEVIATHAN.ABYSSAL_KNIGHT_ENRAGE_DAMAGE;
        addNotification(state, "THE KNIGHT ENRAGES!", 0xff4444);
        addScreenShake(state, 10, 0.3);
      } else if (hpPct <= LEVIATHAN.ABYSSAL_KNIGHT_PHASE2_HP && enemy.bossPhase < 1) {
        enemy.bossPhase = 1;
        addNotification(state, "ABYSSAL KNIGHT — PHASE 2", 0xff8844);
      }

      // Charge attack
      if (enemy.chargeCD <= 0 && distToPlayer > 5 && distToPlayer < 25) {
        enemy.chargeCD = LEVIATHAN.ABYSSAL_KNIGHT_CHARGE_CD;
        enemy.chargeTimer = LEVIATHAN.ABYSSAL_KNIGHT_CHARGE_DURATION;
        const dir = normalize3({ x: p.pos.x - enemy.pos.x, y: p.pos.y - enemy.pos.y, z: p.pos.z - enemy.pos.z });
        enemy.chargeDir = dir;
        enemy.behavior = "charging";
      }
      if (enemy.chargeTimer > 0) {
        enemy.chargeTimer -= dt;
        enemy.pos.x += enemy.chargeDir.x * LEVIATHAN.ABYSSAL_KNIGHT_CHARGE_SPEED * dt;
        enemy.pos.y += enemy.chargeDir.y * LEVIATHAN.ABYSSAL_KNIGHT_CHARGE_SPEED * dt;
        enemy.pos.z += enemy.chargeDir.z * LEVIATHAN.ABYSSAL_KNIGHT_CHARGE_SPEED * dt;
        // Charge hit
        if (dist3(enemy.pos, p.pos) < 3 && p.invincibleTimer <= 0 && p.action !== "dead") {
          let dmg = LEVIATHAN.ABYSSAL_KNIGHT_DAMAGE;
          if (p.blocking) dmg *= 0.3;
          p.hp = hpDamage(p.hp, dmg);
          state.stats.damageTaken += dmg;
          addScreenShake(state, 8, 0.2);
        }
      }

      // Spawn minions in phase 2+
      if (enemy.spawnCD <= 0 && enemy.bossPhase >= 1) {
        enemy.spawnCD = LEVIATHAN.ABYSSAL_KNIGHT_SPAWN_CD;
        for (let i = 0; i < 2; i++) {
          const angle = Math.random() * Math.PI * 2;
          _spawnEnemy(state, "angler", {
            x: enemy.pos.x + Math.cos(angle) * 5,
            y: enemy.pos.y,
            z: enemy.pos.z + Math.sin(angle) * 5,
          });
        }
      }
      break;
    }
  }
}

function _enemyAttack(state: LeviathanState, enemy: Enemy): void {
  const p = state.player;
  if (p.invincibleTimer > 0 || p.action === "dead" || p.action === "grabbed") return;

  let dmg = enemy.damage;
  if (p.blocking) { dmg *= 0.3; spawnParticles(state, p.pos, 3, "spark", 0xffffff, 3, 0.3); }
  p.hp = hpDamage(p.hp, dmg);
  state.stats.damageTaken += dmg;
  flashScreen(state, "#ff4444", 0.2, 0.1);

  if (p.hp <= 0) {
    p.hp = 0;
    p.action = "dead";
    state.deathSequenceTimer = LEVIATHAN.DEATH_SLOW_MO_DURATION;
  }
}

function _spawnEnemy(state: LeviathanState, type: EnemyType, pos: Vec3): void {
  const id = genLeviathanId(state);
  const baseStats: Record<EnemyType, { hp: number; damage: number; speed: number }> = {
    angler:          { hp: LEVIATHAN.ANGLER_HP, damage: LEVIATHAN.ANGLER_DAMAGE, speed: LEVIATHAN.ANGLER_SPEED },
    jellyfish:       { hp: LEVIATHAN.JELLYFISH_HP, damage: LEVIATHAN.JELLYFISH_DAMAGE, speed: LEVIATHAN.JELLYFISH_SPEED },
    coral_golem:     { hp: LEVIATHAN.CORAL_GOLEM_HP, damage: LEVIATHAN.CORAL_GOLEM_DAMAGE, speed: LEVIATHAN.CORAL_GOLEM_SPEED },
    tentacle:        { hp: LEVIATHAN.TENTACLE_HP, damage: LEVIATHAN.TENTACLE_DAMAGE, speed: 0 },
    siren:           { hp: LEVIATHAN.SIREN_HP, damage: LEVIATHAN.SIREN_DAMAGE, speed: LEVIATHAN.SIREN_SPEED },
    abyssal_knight:  { hp: LEVIATHAN.ABYSSAL_KNIGHT_HP, damage: LEVIATHAN.ABYSSAL_KNIGHT_DAMAGE, speed: LEVIATHAN.ABYSSAL_KNIGHT_SPEED },
  };
  const stats = baseStats[type];
  const diff = getDiffMult(state);
  // Scale enemy stats by difficulty and depth
  const depthScale = 1 + state.player.depthLevel * 0.08; // +8% stats per depth zone
  const hp = Math.ceil(stats.hp * diff.enemyHp * depthScale);
  const dmg = stats.damage * diff.enemyDmg * depthScale;

  const enemy: Enemy = {
    id, type, pos: { ...pos },
    vel: { x: 0, y: 0, z: 0 },
    rotation: Math.random() * Math.PI * 2,
    hp, maxHp: hp,
    damage: dmg, speed: stats.speed,
    behavior: "lurking",
    attackTimer: Math.random() * 1.0,
    stunTimer: 0, deathTimer: 0,
    revealed: false, revealTimer: 0,
    aggroed: false,
    colorVariant: Math.random(),
    hitFlash: 0, bobPhase: Math.random() * Math.PI * 2,
    glowIntensity: 0.3 + Math.random() * 0.3,
    fireCD: LEVIATHAN.SIREN_FIRE_CD * (0.5 + Math.random()),
    slamCD: 5 + Math.random() * 3,
    chargeCD: 8 + Math.random() * 4,
    chargeTimer: 0,
    chargeDir: { x: 0, y: 0, z: 0 },
    grabTimer: 0, shockCD: 0,
    spawnCD: LEVIATHAN.ABYSSAL_KNIGHT_SPAWN_CD,
    bossPhase: 0,
    knockbackVel: { x: 0, y: 0, z: 0 },
    knockbackTimer: 0,
  };

  state.enemies.set(id, enemy);

  if (type === "abyssal_knight") {
    state.bossId = id;
    addNotification(state, "THE ABYSSAL KNIGHT AWAKENS", 0xff4444);
    addScreenShake(state, 10, 0.3);
  }
}

// ========================================================================
// UPDATE: Projectiles
// ========================================================================

export function updateProjectiles(state: LeviathanState, dt: number): void {
  const p = state.player;
  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const proj = state.projectiles[i];
    proj.life -= dt;
    // Water drag on projectiles
    proj.vel.x *= 0.995;
    proj.vel.y *= 0.995;
    proj.vel.z *= 0.995;
    proj.pos.x += proj.vel.x * dt;
    proj.pos.y += proj.vel.y * dt;
    proj.pos.z += proj.vel.z * dt;
    // Harpoon trail bubbles
    if (proj.type === "harpoon" && state.tick % 3 === 0) {
      spawnParticles(state, proj.pos, 1, "bubble", 0x88ccdd, 0.5, 0.6);
    }
    // Siren bolt glow trail
    if (proj.type === "siren_bolt" && state.tick % 4 === 0) {
      spawnParticles(state, proj.pos, 1, "glow", 0xff44aa, 0.3, 0.4);
    }

    if (proj.life <= 0) { state.projectiles.splice(i, 1); continue; }

    if (proj.owner === "player") {
      for (const enemy of state.enemies.values()) {
        if (enemy.behavior === "dead") continue;
        if (dist3(proj.pos, enemy.pos) < 2) {
          // Synergy: harpoon deals 1.5x to stunned enemies
          let projDmg = proj.damage;
          if (proj.type === "harpoon" && enemy.stunTimer > 0) {
            projDmg *= LEVIATHAN.HARPOON_FROZEN_BONUS;
          }
          enemy.hp = hpDamage(enemy.hp, projDmg);
          enemy.hitFlash = 0.15;
          state.stats.damageDealt += projDmg;
          spawnDamageNumber(state, enemy.pos, projDmg, enemy.stunTimer > 0 ? 0xffcc44 : 0x44ccff, enemy.stunTimer > 0);
          spawnParticles(state, proj.pos, 4, "bubble", 0x88ccff, 3, 0.3);
          if (enemy.hp <= 0) _killEnemy(state, enemy);
          // Harpoon pierce: don't remove projectile, reduce damage
          if (proj.type === "harpoon" && p.harpoonLevel >= 2) {
            proj.damage *= 0.7; // 30% decay per pierce
            continue; // hit more enemies
          }
          state.projectiles.splice(i, 1);
          break;
        }
      }
    } else {
      if (dist3(proj.pos, p.pos) < 1.5 && p.invincibleTimer <= 0 && p.action !== "dead") {
        let dmg = proj.damage;
        if (p.blocking) { dmg *= 0.3; }
        p.hp = hpDamage(p.hp, dmg);
        state.stats.damageTaken += dmg;
        flashScreen(state, "#ff44aa", 0.2, 0.1);
        state.projectiles.splice(i, 1);
        if (p.hp <= 0) { p.hp = 0; p.action = "dead"; state.deathSequenceTimer = LEVIATHAN.DEATH_SLOW_MO_DURATION; }
      }
    }
  }
}

// ========================================================================
// UPDATE: Relic Shards
// ========================================================================

export function updateRelicShards(state: LeviathanState, dt: number): void {
  const p = state.player;
  for (let i = state.relicShards.length - 1; i >= 0; i--) {
    const shard = state.relicShards[i];
    shard.life -= dt;
    if (shard.life <= 0) { state.relicShards.splice(i, 1); continue; }
    shard.pos.x += shard.vel.x * dt;
    shard.pos.y += shard.vel.y * dt;
    shard.pos.z += shard.vel.z * dt;
    shard.vel.x *= 0.95; shard.vel.y *= 0.95; shard.vel.z *= 0.95;

    // Attract to player
    const d = dist3(p.pos, shard.pos);
    if (d < 8) {
      const dir = normalize3({ x: p.pos.x - shard.pos.x, y: p.pos.y - shard.pos.y, z: p.pos.z - shard.pos.z });
      const spd = 10 * (1 - d / 8);
      shard.pos.x += dir.x * spd * dt;
      shard.pos.y += dir.y * spd * dt;
      shard.pos.z += dir.z * spd * dt;
    }
    if (d < 1.5) {
      p.hp = Math.min(p.maxHp, p.hp + shard.hpRestore);
      p.oxygen = Math.min(p.maxOxygen, p.oxygen + shard.oxygenRestore);
      spawnParticles(state, shard.pos, 5, "glow", 0x44ffaa, 3, 0.4);
      state.relicShards.splice(i, 1);
    }
  }
}

// ========================================================================
// UPDATE: Sonar Pings
// ========================================================================

export function updateSonarPings(state: LeviathanState, dt: number): void {
  for (let i = state.sonarPings.length - 1; i >= 0; i--) {
    const ping = state.sonarPings[i];
    ping.timer -= dt;
    ping.radius += ping.maxRadius * dt / 1.5; // expand over 1.5s
    if (ping.timer <= 0) state.sonarPings.splice(i, 1);
  }
}

// ========================================================================
// UPDATE: Particles, Damage Numbers, Notifications
// ========================================================================

export function updateParticles(state: LeviathanState, dt: number): void {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const part = state.particles[i];
    part.life -= dt;
    if (part.life <= 0) { state.particles.splice(i, 1); continue; }
    part.pos.x += part.vel.x * dt;
    part.pos.y += part.vel.y * dt;
    part.pos.z += part.vel.z * dt;
    // Bubbles rise, debris sinks
    if (part.type === "bubble") part.vel.y += 2 * dt;
    else part.vel.y -= 1 * dt;
    // Water drag
    part.vel.x *= 0.97; part.vel.z *= 0.97;
  }
  if (state.particles.length > 500) state.particles.splice(0, state.particles.length - 500);

  // Ambient bubbles
  state.ambientParticleTimer -= dt;
  if (state.ambientParticleTimer <= 0) {
    state.ambientParticleTimer = 0.15 + Math.random() * 0.3;
    const half = LEVIATHAN.CATHEDRAL_WIDTH / 2;
    state.particles.push({
      pos: { x: (Math.random() - 0.5) * half, y: state.player.pos.y + (Math.random() - 0.5) * 20, z: (Math.random() - 0.5) * 15 },
      vel: { x: (Math.random() - 0.5) * 0.3, y: 0.5 + Math.random() * 1.5, z: (Math.random() - 0.5) * 0.3 },
      life: 3 + Math.random() * 3, maxLife: 4, color: 0x88bbcc,
      size: 0.05 + Math.random() * 0.15, type: "bubble",
    });
    // Silt particles near floor
    if (Math.random() < 0.3) {
      state.particles.push({
        pos: { x: (Math.random() - 0.5) * half, y: state.player.pos.y - 10 + Math.random() * 5, z: (Math.random() - 0.5) * 15 },
        vel: { x: (Math.random() - 0.5) * 0.5, y: -0.2, z: (Math.random() - 0.5) * 0.5 },
        life: 2 + Math.random() * 2, maxLife: 3, color: 0x665544,
        size: 0.1 + Math.random() * 0.1, type: "silt",
      });
    }

    // Air pocket rising bubbles (near each pocket)
    if (Math.random() < 0.4) {
      const pocket = state.airPockets[Math.floor(Math.random() * state.airPockets.length)];
      if (pocket) {
        state.particles.push({
          pos: {
            x: pocket.pos.x + (Math.random() - 0.5) * pocket.radius,
            y: pocket.pos.y - pocket.radius,
            z: pocket.pos.z + (Math.random() - 0.5) * pocket.radius,
          },
          vel: { x: (Math.random() - 0.5) * 0.3, y: 1.5 + Math.random() * 2, z: (Math.random() - 0.5) * 0.3 },
          life: 2 + Math.random() * 2, maxLife: 3, color: 0xaaddff,
          size: 0.08 + Math.random() * 0.12, type: "bubble",
        });
      }
    }

    // Current stream particles (flowing along current direction)
    if (Math.random() < 0.25 && state.currents.length > 0) {
      const current = state.currents[Math.floor(Math.random() * state.currents.length)];
      state.particles.push({
        pos: {
          x: current.startPos.x + (Math.random() - 0.5) * current.width,
          y: current.startPos.y + (Math.random() - 0.5) * 5,
          z: current.startPos.z + (Math.random() - 0.5) * current.width,
        },
        vel: {
          x: current.direction.x * current.speed * 2,
          y: current.direction.y * current.speed * 2,
          z: current.direction.z * current.speed * 2,
        },
        life: 1.5 + Math.random(), maxLife: 2, color: 0x66aacc,
        size: 0.04 + Math.random() * 0.06, type: "trail",
      });
    }

    // Escape phase: falling debris from ceiling
    if (state.escaping) {
      for (let d = 0; d < 3; d++) {
        state.particles.push({
          pos: {
            x: state.player.pos.x + (Math.random() - 0.5) * 20,
            y: state.player.pos.y + 10 + Math.random() * 5,
            z: state.player.pos.z + (Math.random() - 0.5) * 15,
          },
          vel: { x: (Math.random() - 0.5) * 1, y: -3 - Math.random() * 4, z: (Math.random() - 0.5) * 1 },
          life: 2 + Math.random() * 2, maxLife: 3,
          color: Math.random() < 0.5 ? 0x554433 : 0x443322,
          size: 0.15 + Math.random() * 0.25, type: "debris",
        });
      }
    }
  }
}

export function updateDamageNumbers(state: LeviathanState, dt: number): void {
  for (let i = state.damageNumbers.length - 1; i >= 0; i--) {
    const dn = state.damageNumbers[i];
    dn.timer -= dt;
    dn.pos.y += dt * 1.5;
    if (dn.timer <= 0) state.damageNumbers.splice(i, 1);
  }
}

export function updateNotifications(state: LeviathanState, dt: number): void {
  for (let i = state.notifications.length - 1; i >= 0; i--) {
    state.notifications[i].timer -= dt;
    if (state.notifications[i].timer <= 0) state.notifications.splice(i, 1);
  }
}

// ========================================================================
// UPDATE: Screen effects
// ========================================================================

export function updateScreenEffects(state: LeviathanState, dt: number): void {
  if (state.screenFlash.timer > 0) state.screenFlash.timer -= dt;
  if (state.screenShake > 0) {
    state.screenShake -= dt;
    if (state.screenShake <= 0) state.screenShakeIntensity = 0;
  }
  if (state.hitStopTimer > 0) state.hitStopTimer -= dt;
}

// ========================================================================
// UPDATE: Phase (spawn enemies, check game over)
// ========================================================================

export function updatePhase(state: LeviathanState, dt: number): void {
  if (state.phase !== "playing") return;

  // Death sequence
  if (state.deathSequenceTimer > 0) {
    state.deathSequenceTimer -= dt;
    state.hitStopScale = LEVIATHAN.DEATH_SLOW_MO_SCALE;
    if (state.deathSequenceTimer <= 0) {
      state.phase = "game_over";
    }
    return;
  }

  state.gameTime += 0; // tracked in game loop

  // Spawn enemies based on depth — deeper = more dangerous
  const p = state.player;
  const depthLvl = p.depthLevel;

  // Spawn check frequency scaled by difficulty
  const diff = getDiffMult(state);
  const spawnInterval = Math.max(60, Math.floor(180 / diff.spawnRate));
  if (state.tick % spawnInterval === 0) {
    const enemiesAlive = [...state.enemies.values()].filter(e => e.behavior !== "dead").length;
    const maxEnemies = Math.ceil((6 + depthLvl * 3) * diff.spawnRate);

    // More enemies during escape
    const escapeBonus = state.escaping ? 4 : 0;

    if (enemiesAlive < maxEnemies + escapeBonus) {
      // Choose enemy type based on depth
      const types: EnemyType[] = ["angler"];
      if (depthLvl >= 1) types.push("jellyfish", "siren");
      if (depthLvl >= 2) types.push("coral_golem", "tentacle");
      if (depthLvl >= 3) types.push("siren", "coral_golem");

      const type = types[Math.floor(Math.random() * types.length)];
      const angle = Math.random() * Math.PI * 2;
      const r = LEVIATHAN.ENEMY_SPAWN_RADIUS;
      const spawnPos: Vec3 = {
        x: p.pos.x + Math.cos(angle) * r,
        y: p.pos.y + (Math.random() - 0.5) * 10,
        z: p.pos.z + Math.sin(angle) * r * 0.5,
      };
      // Clamp to bounds
      spawnPos.x = Math.max(-LEVIATHAN.CATHEDRAL_WIDTH / 2, Math.min(LEVIATHAN.CATHEDRAL_WIDTH / 2, spawnPos.x));
      spawnPos.y = Math.max(-LEVIATHAN.MAX_DEPTH, Math.min(-1, spawnPos.y));
      spawnPos.z = Math.max(-15, Math.min(15, spawnPos.z));

      _spawnEnemy(state, type, spawnPos);
    }

    // Boss spawn at deepest depth level
    if (depthLvl >= LEVIATHAN.DEPTH_LEVELS - 1 && !state.bossSpawned) {
      state.bossSpawned = true;
      _spawnEnemy(state, "abyssal_knight", { x: 0, y: -LEVIATHAN.MAX_DEPTH + 10, z: 0 });
    }
  }
}

// ========================================================================
// UPGRADE: Purchase
// ========================================================================

export function purchaseUpgrade(state: LeviathanState, upgradeId: string): boolean {
  const upg = UPGRADES.find(u => u.id === upgradeId);
  if (!upg) return false;
  const p = state.player;
  const level = p[upg.field];
  const cost = getUpgradeCost(upg, level);
  if (p.relicPoints < cost || level >= upg.maxLevel) return false;

  p.relicPoints -= cost;
  (p as any)[upg.field] = level + 1;

  // Stat bonuses on upgrade
  if (upg.id === "armor") { p.maxHp += 15; p.hp += 15; }
  if (upg.id === "lung") { p.maxOxygen += 10; p.oxygen = Math.min(p.maxOxygen, p.oxygen + 10); }

  addNotification(state, `${upg.name} Lv${level + 1}`, 0x44ffaa);
  spawnParticles(state, p.pos, 8, "glow", 0x44ffaa, 3, 0.5);
  return true;
}
