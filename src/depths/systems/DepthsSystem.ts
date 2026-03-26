// ---------------------------------------------------------------------------
// Depths of Avalon — simulation systems
// ---------------------------------------------------------------------------

import { DEPTHS } from "../config/DepthsConfig";
import type { DepthsState, DepthsEnemy, DepthsParticle, DepthsHarpoon, DepthsSirenProjectile } from "../state/DepthsState";

// ---------------------------------------------------------------------------
// Player movement
// ---------------------------------------------------------------------------

export function updatePlayer(state: DepthsState, dt: number): void {
  const p = state.player;
  const keys = state.keys;

  // Mouse look (only when pointer-locked)
  if (state.pointerLocked) {
    p.yaw -= state.mouseDX * 0.003 * DEPTHS.PLAYER_TURN_SPEED;
    p.pitch -= state.mouseDY * 0.003 * DEPTHS.PLAYER_PITCH_SPEED;
    p.pitch = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, p.pitch));
  }
  state.mouseDX = 0;
  state.mouseDY = 0;

  // Sprint
  p.sprinting = keys.has("shift");

  // Dash logic
  if (p.dashCooldown > 0) p.dashCooldown -= dt;
  if (p.dashTimer > 0) {
    // Currently dashing — override velocity
    p.vx = p.dashDirX * DEPTHS.DASH_SPEED;
    p.vy = p.dashDirY * DEPTHS.DASH_SPEED;
    p.vz = p.dashDirZ * DEPTHS.DASH_SPEED;
    p.dashTimer -= dt;
    if (DEPTHS.DASH_INVULN) p.invulnTimer = 0.1;

    // Dash trail particles
    _spawnParticle(state, {
      x: p.x + (Math.random() - 0.5) * 0.4,
      y: p.y + (Math.random() - 0.5) * 0.4,
      z: p.z + (Math.random() - 0.5) * 0.4,
      vx: -p.dashDirX * 3 + (Math.random() - 0.5),
      vy: -p.dashDirY * 3 + (Math.random() - 0.5),
      vz: -p.dashDirZ * 3 + (Math.random() - 0.5),
      life: 0.5, maxLife: 0.5, size: 0.15,
      color: 0x66ccff, type: "dash_trail",
    });

    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
  } else {
    // Normal movement
    const cosYaw = Math.cos(p.yaw);
    const sinYaw = Math.sin(p.yaw);
    const cosPitch = Math.cos(p.pitch);
    const sinPitch = Math.sin(p.pitch);

    const fwdX = sinYaw * cosPitch;
    const fwdY = -sinPitch;
    const fwdZ = cosYaw * cosPitch;
    const rightX = Math.cos(p.yaw);
    const rightZ = -Math.sin(p.yaw);

    let moveX = 0, moveY = 0, moveZ = 0;
    if (keys.has("w")) { moveX += fwdX; moveY += fwdY; moveZ += fwdZ; }
    if (keys.has("s")) { moveX -= fwdX; moveY -= fwdY; moveZ -= fwdZ; }
    if (keys.has("a")) { moveX -= rightX; moveZ -= rightZ; }
    if (keys.has("d")) { moveX += rightX; moveZ += rightZ; }
    if (keys.has(" ")) { moveY += 1; }
    if (keys.has("control")) { moveY -= 1; }

    const len = Math.sqrt(moveX * moveX + moveY * moveY + moveZ * moveZ);
    if (len > 0.001) {
      const inv = 1 / len;
      moveX *= inv; moveY *= inv; moveZ *= inv;
    }

    const upgSpeedBonus = state.upgrades.swim_speed * DEPTHS.UPGRADES.swim_speed.effect;
    const speed = (DEPTHS.PLAYER_SWIM_SPEED + upgSpeedBonus) * (p.sprinting ? DEPTHS.PLAYER_SPRINT_MULT : 1);

    // Ocean current
    const zone = DEPTHS.DEPTH_ZONES[state.depthZoneIndex];
    const currentT = Math.sin(state.gameTime * 0.3) * 0.5 + 0.5;
    const cx = zone.currentDir.x * zone.currentStrength * currentT;
    const cy = zone.currentDir.y * zone.currentStrength * currentT;
    const cz = zone.currentDir.z * zone.currentStrength * currentT;

    const drag = 4.0;
    p.vx += (moveX * speed + cx - p.vx) * drag * dt;
    p.vy += (moveY * speed + cy - p.vy) * drag * dt;
    p.vz += (moveZ * speed + cz - p.vz) * drag * dt;

    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
  }

  // Clamp to world bounds
  const R = DEPTHS.WORLD_RADIUS;
  const distXZ = Math.sqrt(p.x * p.x + p.z * p.z);
  if (distXZ > R) { p.x *= R / distXZ; p.z *= R / distXZ; }
  if (p.y > -0.5) p.y = -0.5;
  if (p.y < -175) p.y = -175;

  // Update depth
  state.currentDepth = -p.y;
  state.maxDepthReached = Math.max(state.maxDepthReached, state.currentDepth);
  if (state.currentDepth > state.bestDepth) state.bestDepth = state.currentDepth;

  // Depth zone
  for (let i = DEPTHS.DEPTH_ZONES.length - 1; i >= 0; i--) {
    if (state.currentDepth >= DEPTHS.DEPTH_ZONES[i].minDepth) {
      if (state.depthZoneIndex !== i) {
        state.depthZoneIndex = i;
        state.audioZoneTransition = true;
        _triggerFlash(state, "rgba(68,204,255,0.15)");
        state.notifications.push({
          text: `Entering: ${DEPTHS.DEPTH_ZONES[i].name}`,
          life: 3, color: "#44ccff",
        });
      }
      break;
    }
  }

  // Invulnerability timer
  if (p.invulnTimer > 0) p.invulnTimer -= dt;

  // Attack cooldown
  if (p.attackCooldown > 0) p.attackCooldown -= dt;

  // Harpoon cooldown
  if (p.harpoonCooldown > 0) p.harpoonCooldown -= dt;

  // Upgrade-based stats
  let armorBonus = state.upgrades.armor * DEPTHS.UPGRADES.armor.effect;
  if (state.collectedRelics.has("leviathan_scale")) armorBonus += state.player.maxHp * 0.3;
  p.maxHp = DEPTHS.PLAYER_MAX_HP + armorBonus;
  p.maxOxygen = DEPTHS.OXYGEN_MAX + state.upgrades.lung_capacity * DEPTHS.UPGRADES.lung_capacity.effect;
  p.damage = DEPTHS.PLAYER_ATTACK_DMG + state.upgrades.sword * DEPTHS.UPGRADES.sword.effect;
  let lightBonus = state.upgrades.light_radius * DEPTHS.UPGRADES.light_radius.effect;
  if (state.collectedRelics.has("abyssal_eye")) lightBonus += DEPTHS.PLAYER_LIGHT_RADIUS * 0.5;
  p.lightRadius = DEPTHS.PLAYER_LIGHT_RADIUS + lightBonus;
  if (state.activeCurses.has("darkness")) p.lightRadius *= 0.5;

  // FOV
  state.targetFov = DEPTHS.CAMERA_FOV;
  if (p.sprinting) state.targetFov += DEPTHS.FOV_SPRINT_BOOST;
  if (p.dashTimer > 0) state.targetFov += DEPTHS.FOV_DASH_BOOST;
  state.currentFov += (state.targetFov - state.currentFov) * DEPTHS.FOV_LERP * dt;

  // Vignette — increases at low HP or low O2
  const hpRatio = p.hp / p.maxHp;
  const o2Ratio = p.oxygen / p.maxOxygen;
  const targetVig = Math.max(0, Math.min(0.7, (1 - hpRatio) * 0.5 + (1 - o2Ratio) * 0.3));
  state.vignetteIntensity += (targetVig - state.vignetteIntensity) * 4 * dt;
}

// ---------------------------------------------------------------------------
// Dash (right-click)
// ---------------------------------------------------------------------------

export function tryDash(state: DepthsState): void {
  const p = state.player;
  if (!state.rightMouseDown) return;
  if (p.dashCooldown > 0 || p.dashTimer > 0) return;

  const cosYaw = Math.cos(p.yaw);
  const sinYaw = Math.sin(p.yaw);
  const cosPitch = Math.cos(p.pitch);
  const sinPitch = Math.sin(p.pitch);

  p.dashDirX = sinYaw * cosPitch;
  p.dashDirY = -sinPitch;
  p.dashDirZ = cosYaw * cosPitch;
  p.dashTimer = DEPTHS.DASH_DURATION;
  p.dashCooldown = DEPTHS.DASH_COOLDOWN;
  state.audioDash = true;

  // Burst particles
  const dashColor = state.collectedRelics.has("storm_pearl") ? 0xffcc44 : 0x88ddff;
  for (let i = 0; i < 10; i++) {
    _spawnParticle(state, {
      x: p.x + (Math.random() - 0.5),
      y: p.y + (Math.random() - 0.5),
      z: p.z + (Math.random() - 0.5),
      vx: -p.dashDirX * 5 + (Math.random() - 0.5) * 3,
      vy: -p.dashDirY * 5 + (Math.random() - 0.5) * 3,
      vz: -p.dashDirZ * 5 + (Math.random() - 0.5) * 3,
      life: 0.6, maxLife: 0.6, size: 0.2,
      color: dashColor, type: "dash_trail",
    });
  }

  // Storm Pearl / Depth Surge: damage enemies along dash path
  const dashDmg = state.unlockedAbilities.has("depth_surge") ? 45 : 15;
  const hasDashDmg = state.collectedRelics.has("storm_pearl") || state.unlockedAbilities.has("depth_surge");
  if (hasDashDmg) {
    for (const e of state.enemies) {
      if (!e.alive) continue;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const dz = e.z - p.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < 4 + e.radius) {
        _dealDamageToEnemy(state, e, dashDmg, e.x, e.y, e.z);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Harpoon (E key)
// ---------------------------------------------------------------------------

export function tryHarpoon(state: DepthsState): void {
  const p = state.player;
  if (!state.keys.has("e")) return;
  if (p.harpoonCooldown > 0) return;

  p.harpoonCooldown = DEPTHS.HARPOON_COOLDOWN;
  state.audioHarpoon = true;

  const cosYaw = Math.cos(p.yaw);
  const sinYaw = Math.sin(p.yaw);
  const cosPitch = Math.cos(p.pitch);
  const sinPitch = Math.sin(p.pitch);

  const fwdX = sinYaw * cosPitch;
  const fwdY = -sinPitch;
  const fwdZ = cosYaw * cosPitch;

  const harpDmg = DEPTHS.HARPOON_DMG + state.upgrades.harpoon * DEPTHS.UPGRADES.harpoon.effect;

  const h: DepthsHarpoon = {
    id: state.nextHarpoonId++,
    x: p.x + fwdX * 1.2,
    y: p.y + fwdY * 1.2,
    z: p.z + fwdZ * 1.2,
    vx: fwdX * DEPTHS.HARPOON_SPEED,
    vy: fwdY * DEPTHS.HARPOON_SPEED,
    vz: fwdZ * DEPTHS.HARPOON_SPEED,
    dmg: harpDmg,
    life: DEPTHS.HARPOON_RANGE / DEPTHS.HARPOON_SPEED,
    alive: true,
  };

  state.harpoons.push(h);

  // Trident Shot ability: fire 2 additional harpoons at slight angles
  if (state.unlockedAbilities.has("harpoon_spread")) {
    for (const angle of [-0.2, 0.2]) {
      const ca = Math.cos(angle), sa = Math.sin(angle);
      const sx = fwdX * ca - fwdZ * sa;
      const sz = fwdX * sa + fwdZ * ca;
      state.harpoons.push({
        id: state.nextHarpoonId++,
        x: p.x + sx * 1.2, y: p.y + fwdY * 1.2, z: p.z + sz * 1.2,
        vx: sx * DEPTHS.HARPOON_SPEED, vy: fwdY * DEPTHS.HARPOON_SPEED, vz: sz * DEPTHS.HARPOON_SPEED,
        dmg: Math.floor(harpDmg * 0.7), // side harpoons deal 70% damage
        life: DEPTHS.HARPOON_RANGE / DEPTHS.HARPOON_SPEED,
        alive: true,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Update harpoons
// ---------------------------------------------------------------------------

export function updateHarpoons(state: DepthsState, dt: number): void {
  for (const h of state.harpoons) {
    if (!h.alive) continue;

    h.x += h.vx * dt;
    h.y += h.vy * dt;
    h.z += h.vz * dt;
    h.life -= dt;

    if (h.life <= 0) { h.alive = false; continue; }

    // Trail
    if (Math.random() < 0.5) {
      _spawnParticle(state, {
        x: h.x + (Math.random() - 0.5) * 0.2,
        y: h.y + (Math.random() - 0.5) * 0.2,
        z: h.z + (Math.random() - 0.5) * 0.2,
        vx: (Math.random() - 0.5) * 0.5,
        vy: Math.random() * 0.5,
        vz: (Math.random() - 0.5) * 0.5,
        life: 0.4, maxLife: 0.4, size: 0.08,
        color: 0xaaddff, type: "harpoon_trail",
      });
    }

    // Hit check
    const pierces = state.collectedRelics.has("coral_heart");
    for (const e of state.enemies) {
      if (!e.alive) continue;
      const dx = e.x - h.x;
      const dy = e.y - h.y;
      const dz = e.z - h.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < e.radius + DEPTHS.HARPOON_RADIUS) {
        if (!pierces) h.alive = false;
        _dealDamageToEnemy(state, e, h.dmg, h.x, h.y, h.z);
        // Impact particles
        for (let i = 0; i < 6; i++) {
          _spawnParticle(state, {
            x: h.x + (Math.random() - 0.5) * 0.5,
            y: h.y + (Math.random() - 0.5) * 0.5,
            z: h.z + (Math.random() - 0.5) * 0.5,
            vx: (Math.random() - 0.5) * 5,
            vy: (Math.random() - 0.5) * 5,
            vz: (Math.random() - 0.5) * 5,
            life: 0.5, maxLife: 0.5, size: 0.15,
            color: 0x88ccff, type: "sparkle",
          });
        }
        break;
      }
    }
  }

  state.harpoons = state.harpoons.filter(h => h.alive);
}

// ---------------------------------------------------------------------------
// Oxygen
// ---------------------------------------------------------------------------

export function updateOxygen(state: DepthsState, dt: number): void {
  const p = state.player;
  let drain = DEPTHS.OXYGEN_DRAIN_PER_SEC;
  if (p.sprinting) drain *= DEPTHS.OXYGEN_SPRINT_DRAIN_MULT;
  if (state.collectedRelics.has("sirens_shell")) drain *= 0.6;
  if (state.activeCurses.has("breathless")) drain *= 2;

  p.oxygen -= drain * dt;
  if (p.oxygen <= 0) {
    p.oxygen = 0;
    p.hp -= DEPTHS.OXYGEN_DAMAGE_PER_SEC * dt;
  }

  if (p.hp <= 0) {
    p.hp = 0;
    if (state.deathAnimTimer <= 0) state.deathAnimTimer = 2.0; // start death animation
    state.deathCause = "Drowned — ran out of oxygen";
    state.notifications.push({ text: "You drowned in the depths...", life: 5, color: "#ff4444" });
  }
}

// ---------------------------------------------------------------------------
// Depth pressure
// ---------------------------------------------------------------------------

export function updatePressure(state: DepthsState, dt: number): void {
  if (state.currentDepth < DEPTHS.PRESSURE_START_DEPTH) return;
  if (state.collectedRelics.has("leviathan_scale")) return; // immune

  // Flat reduction per upgrade level (1.5 dmg/s reduced per level)
  const resist = state.upgrades.pressure_resist * DEPTHS.UPGRADES.pressure_resist.effect;
  const excess = state.currentDepth - DEPTHS.PRESSURE_START_DEPTH;
  const rawDmg = DEPTHS.PRESSURE_DMG_PER_SEC_BASE + excess * DEPTHS.PRESSURE_DMG_SCALE;
  const dmg = Math.max(0, rawDmg - resist);

  if (dmg > 0.01) {
    state.player.hp -= dmg * dt;
    // Subtle screen shake at extreme depths
    if (excess > 60 && Math.random() < 0.02) {
      state.screenShake.intensity = Math.max(state.screenShake.intensity, 0.1);
      state.screenShake.timer = Math.max(state.screenShake.timer, 0.15);
    }
  }

  if (state.player.hp <= 0) {
    state.player.hp = 0;
    if (state.deathAnimTimer <= 0) state.deathAnimTimer = 2.0; // start death animation
    state.deathCause = "Crushed by depth pressure";
    state.notifications.push({ text: "Crushed by the deep...", life: 5, color: "#ff4444" });
  }
}

// ---------------------------------------------------------------------------
// Kill combo
// ---------------------------------------------------------------------------

export function updateCombo(state: DepthsState, dt: number): void {
  if (state.combo.count > 0) {
    state.combo.timer -= dt;
    if (state.combo.timer <= 0) {
      if (state.combo.count >= 3) {
        state.notifications.push({
          text: `${state.combo.count}x Combo ended!`,
          life: 2, color: "#ff8844",
        });
      }
      state.combo.count = 0;
    }
  }
}

function _addComboKill(state: DepthsState): void {
  state.combo.count++;
  state.combo.timer = DEPTHS.COMBO_TIMEOUT;
  if (state.combo.count > state.combo.bestStreak) {
    state.combo.bestStreak = state.combo.count;
  }
}

function _comboMultiplier(state: DepthsState): number {
  return 1 + state.combo.count * DEPTHS.COMBO_XP_MULT;
}

function _comboGoldMultiplier(state: DepthsState): number {
  return 1 + state.combo.count * DEPTHS.COMBO_GOLD_MULT;
}

// ---------------------------------------------------------------------------
// Screen shake
// ---------------------------------------------------------------------------

export function updateScreenShake(state: DepthsState, dt: number): void {
  const ss = state.screenShake;
  if (ss.timer > 0) {
    ss.timer -= dt;
    ss.offsetX = (Math.random() - 0.5) * ss.intensity * 2;
    ss.offsetY = (Math.random() - 0.5) * ss.intensity * 2;
    ss.intensity *= (1 - DEPTHS.SHAKE_DECAY * dt);
  } else {
    ss.offsetX = 0;
    ss.offsetY = 0;
    ss.intensity = 0;
  }
}

function _triggerShake(state: DepthsState, intensity: number): void {
  state.screenShake.intensity = Math.max(state.screenShake.intensity, intensity);
  state.screenShake.timer = Math.max(state.screenShake.timer, intensity * 0.8);
}

// ---------------------------------------------------------------------------
// Damage indicators
// ---------------------------------------------------------------------------

export function updateDamageIndicators(state: DepthsState, dt: number): void {
  for (const di of state.damageIndicators) di.life -= dt;
  state.damageIndicators = state.damageIndicators.filter(d => d.life > 0);
}

function _addDamageIndicator(state: DepthsState, enemyX: number, enemyZ: number): void {
  const p = state.player;
  const dx = enemyX - p.x;
  const dz = enemyZ - p.z;
  const angle = Math.atan2(dx, dz) - p.yaw;
  state.damageIndicators.push({ angle, life: 1.0, intensity: 1.0 });
}

// ---------------------------------------------------------------------------
// Player attack
// ---------------------------------------------------------------------------

export function playerAttack(state: DepthsState): void {
  const p = state.player;
  if (p.attackCooldown > 0) return;
  if (!state.mouseDown) return;
  if (p.dashTimer > 0) return;
  if (p.charging) return; // don't fire normal attacks while charging

  const frenzyMult = state.bloodFrenzyTimer > 0 ? 0.5 : 1; // Blood Frenzy = 50% faster attacks
  p.attackCooldown = DEPTHS.PLAYER_ATTACK_COOLDOWN * frenzyMult;

  const cosYaw = Math.cos(p.yaw);
  const sinYaw = Math.sin(p.yaw);
  const cosPitch = Math.cos(p.pitch);
  const sinPitch = Math.sin(p.pitch);
  const fwdX = sinYaw * cosPitch;
  const fwdY = -sinPitch;
  const fwdZ = cosYaw * cosPitch;

  for (let i = 0; i < 5; i++) {
    _spawnParticle(state, {
      x: p.x + fwdX * 1.5 + (Math.random() - 0.5) * 0.5,
      y: p.y + fwdY * 1.5 + (Math.random() - 0.5) * 0.5,
      z: p.z + fwdZ * 1.5 + (Math.random() - 0.5) * 0.5,
      vx: fwdX * 8 + (Math.random() - 0.5) * 2,
      vy: fwdY * 8 + (Math.random() - 0.5) * 2,
      vz: fwdZ * 8 + (Math.random() - 0.5) * 2,
      life: 0.4, maxLife: 0.4, size: 0.15,
      color: 0x88ccff, type: "sparkle",
    });
  }

  const hasTrident = state.collectedRelics.has("trident_of_poseidon");
  let hitCount = 0;

  for (const e of state.enemies) {
    if (!e.alive) continue;
    const dx = e.x - p.x;
    const dy = e.y - p.y;
    const dz = e.z - p.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist > DEPTHS.PLAYER_ATTACK_RANGE + e.radius) continue;

    const dot = dx * fwdX + dy * fwdY + dz * fwdZ;
    const hasWhirlwind = state.unlockedAbilities.has("whirlwind");
    if (dot < 0 && !hasTrident && !hasWhirlwind) continue;

    // Critical hit
    const critBonus = state.collectedRelics.has("neptunes_crown") ? 0.25 : 0;
    const isCrit = Math.random() < (DEPTHS.CRIT_CHANCE + critBonus);
    const glassMult = state.activeCurses.has("glass_cannon") ? 2 : 1;
    const dmg = (isCrit ? Math.floor(p.damage * DEPTHS.CRIT_MULT) : p.damage) * glassMult;

    _dealDamageToEnemy(state, e, dmg, e.x, e.y, e.z, isCrit);

    // Knockback
    if (dist > 0.1) {
      const kb = (isCrit ? 8 : 5) / dist;
      e.vx += dx * kb;
      e.vy += dy * kb;
      e.vz += dz * kb;
    }

    hitCount++;
    state.hitStopTimer = isCrit ? 0.15 : 0.08;
    _triggerShake(state, isCrit ? DEPTHS.SHAKE_HIT_INTENSITY * 2 : DEPTHS.SHAKE_HIT_INTENSITY);

    if (!hasTrident) break; // Without trident, only hit one
  }

  if (hitCount > 0) {
    // FOV punch on hit
    state.targetFov = DEPTHS.CAMERA_FOV + DEPTHS.FOV_HIT_SHRINK;
  }
}

// ---------------------------------------------------------------------------
// Shared: deal damage to enemy
// ---------------------------------------------------------------------------

function _dealDamageToEnemy(state: DepthsState, e: DepthsEnemy, rawDmg: number, hitX: number, hitY: number, hitZ: number, isCrit = false): void {
  e.hp -= rawDmg;
  e.hitFlash = isCrit ? 0.4 : 0.2;
  if (isCrit) state.audioCritHit = true;
  else state.audioHit = true;

  state.damageNumbers.push({
    x: hitX, y: hitY + 1, z: hitZ,
    value: rawDmg, life: 1.0,
    color: isCrit ? 0xff8800 : 0xffcc00,
  });

  // Crit O2 restore (Neptune's Crown)
  if (isCrit && state.collectedRelics.has("neptunes_crown")) {
    state.player.oxygen = Math.min(state.player.maxOxygen, state.player.oxygen + 5);
  }

  // Blood particles
  for (let i = 0; i < 3; i++) {
    _spawnParticle(state, {
      x: e.x + (Math.random() - 0.5),
      y: e.y + (Math.random() - 0.5),
      z: e.z + (Math.random() - 0.5),
      vx: (Math.random() - 0.5) * 3,
      vy: Math.random() * 2,
      vz: (Math.random() - 0.5) * 3,
      life: 0.8, maxLife: 0.8, size: 0.1,
      color: 0xff2244, type: "blood",
    });
  }

  if (e.hp <= 0) {
    e.alive = false;
    state.enemiesKilled++;

    // Combo
    _addComboKill(state);
    const xpMult = _comboMultiplier(state);
    const goldMult = _comboGoldMultiplier(state);

    // Apply depth momentum multiplier
    const momMult = state.depthMomentumMult;
    const waveMult = state.waveActive ? DEPTHS.WAVE_BONUS_XP_MULT : 1;
    const cMult = state.curseMult;
    const xpGain = Math.floor(e.xp * xpMult * momMult * waveMult * cMult);
    const goldGain = Math.floor(e.xp * 0.5 * goldMult * momMult * cMult);
    if (state.waveActive) state.waveBonusXp += xpGain;

    state.xp += xpGain;
    state.gold += goldGain;
    state.totalGold += goldGain;

    if (state.combo.count >= 3) {
      state.notifications.push({
        text: `${state.combo.count}x COMBO! +${xpGain}xp +${goldGain}g`,
        life: 2, color: "#ff8844",
      });
    }

    // Lifesteal
    const lifestealPct = DEPTHS.LIFESTEAL_BASE + state.combo.count * DEPTHS.LIFESTEAL_PER_COMBO;
    if (lifestealPct > 0) {
      const heal = Math.floor(rawDmg * lifestealPct);
      if (heal > 0) state.player.hp = Math.min(state.player.maxHp, state.player.hp + heal);
    }

    // Mermaid's Tear relic: heal 5% max HP on kill
    if (state.collectedRelics.has("mermaids_tear")) {
      const heal = Math.floor(state.player.maxHp * 0.05);
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + heal);
    }

    // Boss kill — set checkpoint
    if (e.isBoss) {
      state.bossesDefeated.add(e.bossKey);
      state.bossesSlain++;
      state.activeBossId = null;
      const bossDef = DEPTHS.BOSSES[e.bossKey];
      if (bossDef) {
        state.gold += bossDef.goldReward;
        state.totalGold += bossDef.goldReward;
        state.notifications.push({
          text: `BOSS SLAIN: ${bossDef.name}! +${bossDef.goldReward}g`,
          life: 4, color: "#ff44ff",
        });
      }
      _triggerShake(state, DEPTHS.SHAKE_BOSS_INTENSITY);
      state.hitStopTimer = 0.5;
      // Set depth checkpoint
      if (bossDef) {
        state.depthCheckpoint = Math.max(state.depthCheckpoint, bossDef.triggerDepth);
        state.notifications.push({
          text: `Checkpoint: ${bossDef.triggerDepth}m`,
          life: 3, color: "#88ff88",
        });
      }
      // Achievements
      _tryAchievement(state, "first_boss");
      if (state.bossesSlain >= 4) _tryAchievement(state, "all_bosses");
      if (state.damageTakenDuringBoss === 0) _tryAchievement(state, "no_damage_boss");
    } else {
      _triggerShake(state, DEPTHS.SHAKE_KILL_INTENSITY);
    }

    // Elite kill tracking
    if (e.isElite) state.eliteKills++;

    // Blood Frenzy ability: kill streaks grant attack speed
    if (state.unlockedAbilities.has("blood_frenzy") && state.combo.count >= 3) {
      state.bloodFrenzyTimer = 8;
    }

    // Tidal Shield recharges on kill
    if (state.unlockedAbilities.has("tidal_shield") && !state.tidalShieldActive) {
      state.tidalShieldActive = true;
    }

    // Relic synergy: Life Current (harpoon kills heal 10% HP)
    if (state.activeSynergies.has("Life Current")) {
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + state.player.maxHp * 0.1);
    }

    // Relic synergy: Ocean's Grace (crits fully restore O2)
    if (isCrit && state.activeSynergies.has("Ocean's Grace")) {
      state.player.oxygen = state.player.maxOxygen;
    }

    // Death particles
    for (let i = 0; i < 10; i++) {
      _spawnParticle(state, {
        x: e.x + (Math.random() - 0.5) * 2,
        y: e.y + (Math.random() - 0.5) * 2,
        z: e.z + (Math.random() - 0.5) * 2,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        vz: (Math.random() - 0.5) * 4,
        life: 1.2, maxLife: 1.2, size: 0.2,
        color: e.glow, type: "sparkle",
      });
    }

    // Spawn drops
    if (Math.random() < DEPTHS.DROP_HP_CHANCE) {
      state.drops.push({
        id: state.nextDropId++,
        x: e.x + (Math.random() - 0.5) * 2, y: e.y, z: e.z + (Math.random() - 0.5) * 2,
        type: "hp", amount: DEPTHS.DROP_HP_AMOUNT,
        life: DEPTHS.DROP_LIFETIME, bobPhase: Math.random() * Math.PI * 2,
      });
    }
    if (Math.random() < DEPTHS.DROP_O2_CHANCE) {
      state.drops.push({
        id: state.nextDropId++,
        x: e.x + (Math.random() - 0.5) * 2, y: e.y, z: e.z + (Math.random() - 0.5) * 2,
        type: "o2", amount: DEPTHS.DROP_O2_AMOUNT,
        life: DEPTHS.DROP_LIFETIME, bobPhase: Math.random() * Math.PI * 2,
      });
    }

    // Level up check
    if (state.xp >= state.xpToNext) {
      state.level++;
      state.xp -= state.xpToNext;
      state.xpToNext = Math.floor(state.xpToNext * 1.5);
      state.player.hp = Math.min(state.player.hp + 20, state.player.maxHp);
      state.player.oxygen = Math.min(state.player.oxygen + 15, state.player.maxOxygen);
      state.notifications.push({
        text: `Level ${state.level}! HP & O2 restored`,
        life: 3, color: "#ffcc00",
      });
      state.hitStopTimer = 0.3;
      _triggerFlash(state, DEPTHS.FLASH_LEVELUP_COLOR);
    }
  }
}

// ---------------------------------------------------------------------------
// Enemy spawning
// ---------------------------------------------------------------------------

export function updateEnemySpawning(state: DepthsState, dt: number): void {
  state.enemySpawnTimer -= dt;
  if (state.enemySpawnTimer > 0) return;

  const zone = DEPTHS.DEPTH_ZONES[state.depthZoneIndex];
  // Difficulty scaling: spawns get faster per dive
  const diveScale = Math.max(0.5, 1 - state.diveCount * DEPTHS.DIVE_SPAWN_RATE_SCALE);
  const waveMult = state.waveActive ? (1 / DEPTHS.WAVE_SPAWN_MULT) : 1;
  const swarmedMult = state.activeCurses.has("swarmed") ? 0.5 : 1; // faster spawns
  state.enemySpawnTimer = zone.spawnRate * (0.7 + Math.random() * 0.6) * diveScale * waveMult * swarmedMult;

  const entries = Object.entries(DEPTHS.ENEMY_TYPES);
  const valid = entries.filter(([, def]) => state.currentDepth >= def.minDepth);
  if (valid.length === 0) return;

  const [typeKey, def] = valid[Math.floor(Math.random() * valid.length)];

  const angle = Math.random() * Math.PI * 2;
  const dist = 20 + Math.random() * 15;
  const yOff = (Math.random() - 0.5) * 10;

  // Difficulty scaling: enemies scale with both level AND dive count
  const diveHpBonus = state.diveCount * DEPTHS.DIVE_ENEMY_HP_SCALE;
  const diveDmgBonus = state.diveCount * DEPTHS.DIVE_ENEMY_DMG_SCALE;
  const totalHp = def.hp + state.level * 3 + diveHpBonus;
  const totalDmg = def.dmg + Math.floor(state.level * 0.5) + diveDmgBonus;

  const enemy: DepthsEnemy = {
    id: state.nextEnemyId++,
    type: typeKey,
    x: state.player.x + Math.cos(angle) * dist,
    y: state.player.y + yOff,
    z: state.player.z + Math.sin(angle) * dist,
    vx: 0, vy: 0, vz: 0,
    hp: totalHp,
    maxHp: totalHp,
    dmg: totalDmg,
    speed: def.speed,
    radius: def.radius,
    aggroRange: def.aggroRange,
    color: def.color,
    glow: def.glow,
    xp: def.xp,
    alive: true,
    attackCooldown: 1.0,
    wanderAngle: Math.random() * Math.PI * 2,
    wanderTimer: 2 + Math.random() * 3,
    hitFlash: 0,
    isBoss: false,
    bossKey: "",
    telegraphTimer: 0,
    isElite: false,
    eliteModifier: "",
  };

  // Elite variant chance
  if (Math.random() < DEPTHS.ELITE_CHANCE && state.currentDepth > 20) {
    enemy.isElite = true;
    enemy.eliteModifier = DEPTHS.ELITE_MODIFIERS[Math.floor(Math.random() * DEPTHS.ELITE_MODIFIERS.length)];
    enemy.hp = Math.floor(enemy.hp * DEPTHS.ELITE_HP_MULT);
    enemy.maxHp = enemy.hp;
    enemy.dmg = Math.floor(enemy.dmg * DEPTHS.ELITE_DMG_MULT);
    enemy.xp = Math.floor(enemy.xp * DEPTHS.ELITE_XP_MULT);
    if (enemy.eliteModifier === "swift") enemy.speed *= 1.5;
  }

  state.enemies.push(enemy);

  if (state.enemies.length > 30) {
    const dead = state.enemies.findIndex(e => !e.alive);
    if (dead >= 0) state.enemies.splice(dead, 1);
    else state.enemies.shift();
  }
}

// ---------------------------------------------------------------------------
// Boss spawning
// ---------------------------------------------------------------------------

export function updateBossSpawning(state: DepthsState): void {
  if (state.activeBossId !== null) return;

  for (const [key, def] of Object.entries(DEPTHS.BOSSES)) {
    if (state.bossesDefeated.has(key)) continue;
    if (state.currentDepth < def.triggerDepth - 5 || state.currentDepth > def.triggerDepth + 15) continue;

    // Check no existing boss of this type
    if (state.enemies.some(e => e.bossKey === key && e.alive)) continue;

    const angle = Math.random() * Math.PI * 2;
    const dist = 15;

    const boss: DepthsEnemy = {
      id: state.nextEnemyId++,
      type: key,
      x: state.player.x + Math.cos(angle) * dist,
      y: state.player.y + (Math.random() - 0.5) * 4,
      z: state.player.z + Math.sin(angle) * dist,
      vx: 0, vy: 0, vz: 0,
      hp: def.hp, maxHp: def.hp,
      dmg: def.dmg,
      speed: def.speed,
      radius: def.radius,
      aggroRange: def.aggroRange,
      color: def.color,
      glow: def.glow,
      xp: def.xp,
      alive: true,
      attackCooldown: 1.5,
      wanderAngle: 0,
      wanderTimer: 1,
      hitFlash: 0,
      isBoss: true,
      bossKey: key,
      telegraphTimer: 0,
      isElite: false,
      eliteModifier: "",
    };

    state.enemies.push(boss);
    state.activeBossId = boss.id;
    state.bossHpOnEngage = def.hp;
    state.damageTakenDuringBoss = 0;

    state.audioBossSpawn = true;
    state.notifications.push({
      text: `BOSS: ${def.name} approaches!`,
      life: 4, color: "#ff44ff",
    });

    _triggerShake(state, 0.8);
    state.hitStopTimer = 0.3;
    break;
  }
}

// ---------------------------------------------------------------------------
// Enemy AI & movement
// ---------------------------------------------------------------------------

export function updateEnemies(state: DepthsState, dt: number): void {
  const p = state.player;

  for (const e of state.enemies) {
    if (!e.alive) continue;

    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const dz = p.z - e.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Boss special behavior: circle-strafe with lunges
    if (e.isBoss && dist < e.aggroRange) {
      const orbitalAngle = Math.atan2(dx, dz) + Math.sin(state.gameTime * 1.5) * 0.8;
      const orbitalDist = e.radius + 5;
      const targetX = p.x - Math.sin(orbitalAngle) * orbitalDist;
      const targetZ = p.z - Math.cos(orbitalAngle) * orbitalDist;

      const tdx = targetX - e.x;
      const tdz = targetZ - e.z;
      const tdy = p.y - e.y;

      e.vx += (tdx * e.speed * 0.5 - e.vx) * 3 * dt;
      e.vy += (tdy * e.speed * 0.3 - e.vy) * 3 * dt;
      e.vz += (tdz * e.speed * 0.5 - e.vz) * 3 * dt;

      // Lunge attack
      e.attackCooldown -= dt;
      if (e.attackCooldown <= 0) {
        e.attackCooldown = 2.0 + Math.random();
        if (dist < e.aggroRange * 0.8) {
          // Lunge toward player
          const lungeStr = 15;
          if (dist > 0.1) {
            e.vx = dx / dist * lungeStr;
            e.vy = dy / dist * lungeStr;
            e.vz = dz / dist * lungeStr;
          }
        }
      }

      // Contact damage
      if (dist < e.radius + DEPTHS.PLAYER_RADIUS + 0.5 && p.invulnTimer <= 0) {
        const finalDmg = Math.max(1, e.dmg - state.upgrades.armor * 2);
        p.hp -= finalDmg;
        p.invulnTimer = DEPTHS.PLAYER_INVULN_TIME;
        state.damageNumbers.push({ x: p.x, y: p.y + 1, z: p.z, value: finalDmg, life: 1.0, color: 0xff4444 });
        _triggerShake(state, DEPTHS.SHAKE_HIT_INTENSITY * 1.5);
        _addDamageIndicator(state, e.x, e.z);
        state.hitStopTimer = 0.12;
        state.damageTakenDuringBoss += finalDmg;

        if (p.hp <= 0) {
          p.hp = 0;
          if (state.deathAnimTimer <= 0) state.deathAnimTimer = 2.0; // start death animation
          state.deathCause = "Slain by the creatures of the deep";
    state.notifications.push({ text: "Slain in the depths...", life: 5, color: "#ff4444" });
        }
      }
    } else if (dist < e.aggroRange) {
      // Type-specific AI behaviors
      switch (e.type) {
        case "abyssal_eel": {
          // Sinusoidal slither approach + fast lunge
          const slither = Math.sin(state.gameTime * 4 + e.id) * 3;
          const perpX = -dz / (dist + 0.01);
          const perpZ = dx / (dist + 0.01);
          const chaseInv = e.speed / (dist + 0.01);
          e.vx += (dx * chaseInv + perpX * slither - e.vx) * 3 * dt;
          e.vy += (dy * chaseInv * 0.5 - e.vy) * 3 * dt;
          e.vz += (dz * chaseInv + perpZ * slither - e.vz) * 3 * dt;

          e.attackCooldown -= dt;
          if (dist < 8 && e.attackCooldown <= 0) {
            // Fast lunge
            e.attackCooldown = 2.0;
            if (dist > 0.1) {
              e.vx = dx / dist * 18;
              e.vy = dy / dist * 18;
              e.vz = dz / dist * 18;
            }
          }
          // Contact damage
          _enemyContactDamage(state, e, p, dist);
          break;
        }
        case "kraken_tentacle": {
          // Slow approach, then overhead slam
          if (e.telegraphTimer <= 0) {
            const slowInv = e.speed * 0.4 / (dist + 0.01);
            e.vx += (dx * slowInv - e.vx) * 2 * dt;
            e.vy += (dy * slowInv - e.vy) * 2 * dt;
            e.vz += (dz * slowInv - e.vz) * 2 * dt;
          }

          e.attackCooldown -= dt;
          if (dist < 6 && e.attackCooldown <= 0 && e.telegraphTimer <= 0) {
            // Rise up then slam
            e.telegraphTimer = DEPTHS.TELEGRAPH_DURATION * 1.5;
            e.vy = 8; // rise up during telegraph
            e.attackCooldown = 0.1;
          }
          if (e.telegraphTimer > 0) {
            e.telegraphTimer -= dt;
            if (e.telegraphTimer <= 0) {
              // SLAM — AoE damage
              e.attackCooldown = 3.0;
              e.vy = -20; // slam down
              if (dist < 5 && p.invulnTimer <= 0) {
                _applyEnemyDamage(state, e, p, 1.5);
              }
              _triggerShake(state, 0.4);
            }
          }
          break;
        }
        case "phantom_leviathan": {
          // Blink teleport + charge
          e.attackCooldown -= dt;
          if (dist > 10 && e.attackCooldown <= 0) {
            // Teleport closer
            const angle = Math.atan2(dx, dz);
            e.x = p.x - Math.sin(angle) * 8;
            e.z = p.z - Math.cos(angle) * 8;
            e.y = p.y + (Math.random() - 0.5) * 3;
            e.attackCooldown = 0.5;
            // Teleport particles at destination
            for (let i = 0; i < 8; i++) {
              _spawnParticle(state, {
                x: e.x + (Math.random() - 0.5) * 3,
                y: e.y + (Math.random() - 0.5) * 3,
                z: e.z + (Math.random() - 0.5) * 3,
                vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, vz: (Math.random() - 0.5) * 4,
                life: 0.6, maxLife: 0.6, size: 0.2,
                color: 0x00ffff, type: "sparkle",
              });
            }
          } else if (dist <= 10) {
            // Charge straight at player
            const chargeInv = e.speed * 1.5 / (dist + 0.01);
            e.vx += (dx * chargeInv - e.vx) * 5 * dt;
            e.vy += (dy * chargeInv - e.vy) * 5 * dt;
            e.vz += (dz * chargeInv - e.vz) * 5 * dt;
            if (e.attackCooldown <= 0) e.attackCooldown = 2.5;
          }
          _enemyContactDamage(state, e, p, dist);
          break;
        }
        case "siren": {
          // Keep distance, circle strafe (ranged attacks handled by updateSirenProjectiles)
          const keepDist = 8;
          if (dist < keepDist) {
            // Retreat
            e.vx += (-dx / (dist + 0.01) * e.speed - e.vx) * 3 * dt;
            e.vz += (-dz / (dist + 0.01) * e.speed - e.vz) * 3 * dt;
          } else {
            // Orbit
            const orbAngle = Math.atan2(dx, dz) + Math.sin(state.gameTime * 2) * 1.2;
            const tx = p.x - Math.sin(orbAngle) * keepDist;
            const tz = p.z - Math.cos(orbAngle) * keepDist;
            e.vx += ((tx - e.x) * e.speed * 0.3 - e.vx) * 3 * dt;
            e.vz += ((tz - e.z) * e.speed * 0.3 - e.vz) * 3 * dt;
          }
          e.vy += ((p.y - e.y) * e.speed * 0.2 - e.vy) * 2 * dt;
          // Sirens don't melee — they use projectiles
          break;
        }
        default: {
          // Drowned knight: standard chase + telegraph attack
          if (dist > 0.1) {
            const inv = e.speed / dist;
            e.vx += (dx * inv - e.vx) * 3 * dt;
            e.vy += (dy * inv - e.vy) * 3 * dt;
            e.vz += (dz * inv - e.vz) * 3 * dt;
          }

          e.attackCooldown -= dt;
          if (dist < e.radius + DEPTHS.PLAYER_RADIUS + 2 && e.attackCooldown <= 0 && e.telegraphTimer <= 0) {
            e.telegraphTimer = DEPTHS.TELEGRAPH_DURATION;
            e.attackCooldown = 0.1;
          }
          if (e.telegraphTimer > 0) {
            e.telegraphTimer -= dt;
            if (e.telegraphTimer <= 0) {
              e.attackCooldown = 1.2;
              _applyEnemyDamage(state, e, p, 1.0);
            }
          }
          break;
        }
      }
    } else {
      // Wander
      e.wanderTimer -= dt;
      if (e.wanderTimer <= 0) {
        e.wanderAngle += (Math.random() - 0.5) * 2;
        e.wanderTimer = 2 + Math.random() * 3;
      }
      const ws = e.speed * 0.3;
      e.vx += (Math.cos(e.wanderAngle) * ws - e.vx) * 2 * dt;
      e.vy += (Math.sin(e.wanderAngle * 0.5) * ws * 0.3 - e.vy) * 2 * dt;
      e.vz += (Math.sin(e.wanderAngle) * ws - e.vz) * 2 * dt;
    }

    e.x += e.vx * dt;
    e.y += e.vy * dt;
    e.z += e.vz * dt;
    e.vx *= 0.95;
    e.vy *= 0.95;
    e.vz *= 0.95;

    if (e.hitFlash > 0) e.hitFlash -= dt;
    if (e.y > -1) e.y = -1;
    if (e.y < -175) e.y = -175;
  }

  // Clean up dead far-away enemies
  state.enemies = state.enemies.filter(e => {
    if (!e.alive) {
      const dx = p.x - e.x;
      const dz = p.z - e.z;
      return dx * dx + dz * dz < 400;
    }
    return true;
  });

  // Track active boss
  if (state.activeBossId !== null) {
    const boss = state.enemies.find(e => e.id === state.activeBossId);
    if (!boss || !boss.alive) state.activeBossId = null;
  }
}

// ---------------------------------------------------------------------------
// Air bubbles
// ---------------------------------------------------------------------------

export function updateAirBubbles(state: DepthsState, dt: number): void {
  const p = state.player;

  state.airBubbleSpawnTimer -= dt;
  if (state.airBubbleSpawnTimer <= 0 && state.airBubbles.filter(b => b.alive).length < DEPTHS.AIR_BUBBLE_MAX) {
    state.airBubbleSpawnTimer = DEPTHS.AIR_BUBBLE_SPAWN_INTERVAL;
    const angle = Math.random() * Math.PI * 2;
    const dist = 8 + Math.random() * 25;
    const y = p.y + (Math.random() - 0.5) * 10;
    state.airBubbles.push({
      id: state.nextBubbleId++,
      x: p.x + Math.cos(angle) * dist,
      y, z: p.z + Math.sin(angle) * dist,
      baseY: y, alive: true, timer: 0,
    });
  }

  for (const b of state.airBubbles) {
    if (!b.alive) continue;
    b.timer += dt;
    b.y = b.baseY + Math.sin(b.timer * DEPTHS.AIR_BUBBLE_BOB_SPEED) * DEPTHS.AIR_BUBBLE_BOB_AMP;

    const dx = p.x - b.x;
    const dy = p.y - b.y;
    const dz = p.z - b.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist < DEPTHS.AIR_BUBBLE_RADIUS + DEPTHS.PLAYER_RADIUS) {
      b.alive = false;
      state.audioCollect = true;
      p.oxygen = Math.min(p.maxOxygen, p.oxygen + DEPTHS.OXYGEN_BUBBLE_RESTORE);
      state.notifications.push({ text: "+O2", life: 1.5, color: "#44ddff" });

      for (let i = 0; i < 8; i++) {
        _spawnParticle(state, {
          x: b.x + (Math.random() - 0.5),
          y: b.y + (Math.random() - 0.5),
          z: b.z + (Math.random() - 0.5),
          vx: (Math.random() - 0.5) * 3,
          vy: Math.random() * 3,
          vz: (Math.random() - 0.5) * 3,
          life: 0.8, maxLife: 0.8, size: 0.15,
          color: 0x44ddff, type: "bubble",
        });
      }
    }
  }

  state.airBubbles = state.airBubbles.filter(b => b.alive);
}

// ---------------------------------------------------------------------------
// Treasures
// ---------------------------------------------------------------------------

export function updateTreasures(state: DepthsState, dt: number): void {
  const p = state.player;

  for (const t of state.treasures) {
    if (t.collected) continue;
    t.bobPhase += dt * 1.5;

    const dx = p.x - t.x;
    const dy = p.y - t.y;
    const dz = p.z - t.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Magnetic pull when close
    if (dist < 5 && dist > 0.1) {
      const pull = 3 / dist;
      t.x += dx * pull * dt;
      t.y += dy * pull * dt;
      t.z += dz * pull * dt;
    }

    if (dist < 2.0) {
      t.collected = true;
      state.audioCollect = true;
      const goldMult = _comboGoldMultiplier(state);
      const gain = Math.floor(t.value * goldMult);
      state.gold += gain;
      state.totalGold += gain;
      state.treasuresFound++;
      state.notifications.push({ text: `${t.name} +${gain}g`, life: 2.5, color: "#ffcc00" });

      for (let i = 0; i < 12; i++) {
        _spawnParticle(state, {
          x: t.x + (Math.random() - 0.5),
          y: t.y + (Math.random() - 0.5),
          z: t.z + (Math.random() - 0.5),
          vx: (Math.random() - 0.5) * 4,
          vy: Math.random() * 3,
          vz: (Math.random() - 0.5) * 4,
          life: 1.0, maxLife: 1.0, size: 0.12,
          color: t.color, type: "sparkle",
        });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Particles
// ---------------------------------------------------------------------------

export function updateParticles(state: DepthsState, dt: number): void {
  for (const p of state.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
    p.vx *= 0.96;
    p.vy *= 0.96;
    p.vz *= 0.96;
    p.life -= dt;
    if (p.type === "bubble") p.vy += 2 * dt;
  }
  state.particles = state.particles.filter(p => p.life > 0);
}

// ---------------------------------------------------------------------------
// Ambient bubble particles
// ---------------------------------------------------------------------------

export function spawnAmbientBubbles(state: DepthsState, dt: number): void {
  const p = state.player;
  const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy + p.vz * p.vz);

  // Normal breathing bubbles
  if (Math.random() < DEPTHS.BUBBLE_PARTICLE_RATE * dt) {
    _spawnParticle(state, {
      x: p.x + (Math.random() - 0.5) * 0.5,
      y: p.y + (Math.random() - 0.5) * 0.5,
      z: p.z + (Math.random() - 0.5) * 0.5,
      vx: (Math.random() - 0.5) * 0.5,
      vy: 0.5 + Math.random() * 1.5,
      vz: (Math.random() - 0.5) * 0.5,
      life: 2.0 + Math.random(), maxLife: 3.0,
      size: 0.04 + Math.random() * 0.08,
      color: 0xaaddff, type: "bubble",
    });
  }

  // Speed trail — streaky particles behind player when moving fast
  if (speed > 4 && Math.random() < speed * 0.08 * dt * 60) {
    const trailColor = p.sprinting ? 0x88ccff : 0x5599bb;
    _spawnParticle(state, {
      x: p.x - p.vx * 0.1 + (Math.random() - 0.5) * 0.3,
      y: p.y - p.vy * 0.1 + (Math.random() - 0.5) * 0.3,
      z: p.z - p.vz * 0.1 + (Math.random() - 0.5) * 0.3,
      vx: -p.vx * 0.3 + (Math.random() - 0.5) * 0.5,
      vy: -p.vy * 0.3 + (Math.random() - 0.5) * 0.5,
      vz: -p.vz * 0.3 + (Math.random() - 0.5) * 0.5,
      life: 0.4 + Math.random() * 0.3, maxLife: 0.7,
      size: 0.04 + speed * 0.005,
      color: trailColor, type: "dash_trail",
    });
  }

  // Low O2 breathing bubbles (bigger, more frequent)
  if (p.oxygen < DEPTHS.OXYGEN_LOW_THRESHOLD && Math.random() < 0.15) {
    _spawnParticle(state, {
      x: p.x + (Math.random() - 0.5) * 0.3,
      y: p.y + 0.5 + Math.random() * 0.3,
      z: p.z + (Math.random() - 0.5) * 0.3,
      vx: (Math.random() - 0.5) * 0.3,
      vy: 1.5 + Math.random() * 2,
      vz: (Math.random() - 0.5) * 0.3,
      life: 1.5, maxLife: 1.5,
      size: 0.08 + Math.random() * 0.1,
      color: 0xccddff, type: "bubble",
    });
  }

  for (const bs of state.bubbleStreams) {
    bs.timer -= dt;
    if (bs.timer <= 0) {
      bs.timer = bs.rate;
      _spawnParticle(state, {
        x: bs.x + (Math.random() - 0.5),
        y: bs.baseY,
        z: bs.z + (Math.random() - 0.5),
        vx: (Math.random() - 0.5) * 0.3,
        vy: 2 + Math.random() * 2,
        vz: (Math.random() - 0.5) * 0.3,
        life: 4 + Math.random() * 3, maxLife: 7,
        size: 0.06 + Math.random() * 0.12,
        color: 0x88ccff, type: "bubble",
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Damage numbers
// ---------------------------------------------------------------------------

export function updateDamageNumbers(state: DepthsState, dt: number): void {
  for (const dn of state.damageNumbers) {
    dn.y += 2 * dt;
    dn.life -= dt;
  }
  state.damageNumbers = state.damageNumbers.filter(d => d.life > 0);
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export function updateNotifications(state: DepthsState, dt: number): void {
  for (const n of state.notifications) n.life -= dt;
  state.notifications = state.notifications.filter(n => n.life > 0);
}

// ---------------------------------------------------------------------------
// Fish schools (decorative)
// ---------------------------------------------------------------------------

export function updateFishSchools(state: DepthsState, dt: number): void {
  const p = state.player;

  for (const school of state.fishSchools) {
    const dx = p.x - school.cx;
    const dy = p.y - school.cy;
    const dz = p.z - school.cz;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Flee from player
    if (dist < DEPTHS.FISH_FLEE_RANGE) {
      school.fleeing = true;
      const fleeAngle = Math.atan2(-dx, -dz);
      school.dirAngle += (fleeAngle - school.dirAngle) * 5 * dt;
      const speed = DEPTHS.FISH_FLEE_SPEED;
      school.cx += Math.sin(school.dirAngle) * speed * dt;
      school.cy += -dy * 0.3 * dt;
      school.cz += Math.cos(school.dirAngle) * speed * dt;
    } else {
      school.fleeing = false;
      school.turnTimer -= dt;
      if (school.turnTimer <= 0) {
        school.dirAngle += (Math.random() - 0.5) * 1.5;
        school.dirPitch = (Math.random() - 0.5) * 0.3;
        school.turnTimer = 3 + Math.random() * 5;
      }
      const speed = DEPTHS.FISH_SPEED;
      school.cx += Math.sin(school.dirAngle) * Math.cos(school.dirPitch) * speed * dt;
      school.cy += Math.sin(school.dirPitch) * speed * dt;
      school.cz += Math.cos(school.dirAngle) * Math.cos(school.dirPitch) * speed * dt;
    }

    // Clamp
    const R = DEPTHS.WORLD_RADIUS - 5;
    const distXZ = Math.sqrt(school.cx * school.cx + school.cz * school.cz);
    if (distXZ > R) { school.cx *= R / distXZ; school.cz *= R / distXZ; school.dirAngle += Math.PI; }
    if (school.cy > -2) school.cy = -2;
    if (school.cy < -160) school.cy = -160;

    // Animate individual fish offsets (subtle wobble)
    for (const f of school.fish) {
      f.phase += dt * (3 + Math.random() * 0.5);
      f.oy = Math.sin(f.phase) * 0.3;
    }
  }
}

// ---------------------------------------------------------------------------
// Enemy drops
// ---------------------------------------------------------------------------

export function updateDrops(state: DepthsState, dt: number): void {
  const p = state.player;

  for (const d of state.drops) {
    d.life -= dt;
    d.bobPhase += dt * 2;

    const dx = p.x - d.x;
    const dy = p.y - d.y;
    const dz = p.z - d.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Magnetic pull
    if (dist < DEPTHS.DROP_MAGNET_RANGE && dist > 0.1) {
      const pull = 5 / dist;
      d.x += dx * pull * dt;
      d.y += dy * pull * dt;
      d.z += dz * pull * dt;
    }

    // Collect
    if (dist < DEPTHS.DROP_COLLECT_RANGE) {
      d.life = 0; // mark for removal
      state.audioCollect = true;
      if (d.type === "hp") {
        p.hp = Math.min(p.maxHp, p.hp + d.amount);
        state.notifications.push({ text: `+${d.amount} HP`, life: 1.5, color: "#44cc66" });
      } else {
        p.oxygen = Math.min(p.maxOxygen, p.oxygen + d.amount);
        state.notifications.push({ text: `+${d.amount} O2`, life: 1.5, color: "#44aadd" });
      }
      for (let i = 0; i < 6; i++) {
        _spawnParticle(state, {
          x: d.x + (Math.random() - 0.5),
          y: d.y + (Math.random() - 0.5),
          z: d.z + (Math.random() - 0.5),
          vx: (Math.random() - 0.5) * 3, vy: Math.random() * 2, vz: (Math.random() - 0.5) * 3,
          life: 0.5, maxLife: 0.5, size: 0.12,
          color: d.type === "hp" ? 0x44ff66 : 0x44aaff, type: "sparkle",
        });
      }
    }
  }

  state.drops = state.drops.filter(d => d.life > 0);
}

// ---------------------------------------------------------------------------
// Whirlpools
// ---------------------------------------------------------------------------

export function updateWhirlpools(state: DepthsState, dt: number): void {
  const p = state.player;

  for (const w of state.whirlpools) {
    w.phase += w.rotSpeed * dt;

    const dx = w.x - p.x;
    const dy = w.y - p.y;
    const dz = w.z - p.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (dist < w.radius && dist > 0.1) {
      // Pull toward center
      const pullStr = DEPTHS.WHIRLPOOL_PULL_STRENGTH * (1 - dist / w.radius);
      const inv = pullStr / dist;
      p.vx += dx * inv * dt;
      p.vy += dy * inv * dt * 0.3;
      p.vz += dz * inv * dt;

      // Rotational force
      const tangentX = -dz / dist;
      const tangentZ = dx / dist;
      p.vx += tangentX * pullStr * 0.5 * dt;
      p.vz += tangentZ * pullStr * 0.5 * dt;

      // Core damage
      if (dist < DEPTHS.WHIRLPOOL_CORE_RADIUS && p.invulnTimer <= 0) {
        p.hp -= DEPTHS.WHIRLPOOL_DMG_PER_SEC * dt;
        if (Math.random() < 0.1) {
          _addDamageIndicator(state, w.x, w.z);
        }
      }

      if (p.hp <= 0) {
        p.hp = 0;
        if (state.deathAnimTimer <= 0) state.deathAnimTimer = 2.0; // start death animation
        state.deathCause = "Swallowed by a whirlpool";
        state.notifications.push({ text: "Swallowed by the whirlpool...", life: 5, color: "#ff4444" });
      }
    }

    // Ambient particles
    if (dist < w.radius * 2 && Math.random() < 0.3) {
      const angle = w.phase + Math.random() * Math.PI * 2;
      const r = Math.random() * w.radius;
      _spawnParticle(state, {
        x: w.x + Math.cos(angle) * r,
        y: w.y + (Math.random() - 0.5) * 2,
        z: w.z + Math.sin(angle) * r,
        vx: -Math.sin(angle) * w.rotSpeed * r * 0.3,
        vy: (Math.random() - 0.5) * 0.5,
        vz: Math.cos(angle) * w.rotSpeed * r * 0.3,
        life: 1.5, maxLife: 1.5, size: 0.08,
        color: 0x6688aa, type: "whirlpool",
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Siren projectiles
// ---------------------------------------------------------------------------

export function updateSirenProjectiles(state: DepthsState, dt: number): void {
  // Sirens shoot at player
  for (const e of state.enemies) {
    if (!e.alive || e.type !== "siren") continue;
    const dx = state.player.x - e.x;
    const dy = state.player.y - e.y;
    const dz = state.player.z - e.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist > DEPTHS.SIREN_PROJ_RANGE || dist < 3) continue;

    e.attackCooldown -= dt;
    if (e.attackCooldown <= 0) {
      e.attackCooldown = DEPTHS.SIREN_PROJ_COOLDOWN + Math.random();
      const inv = DEPTHS.SIREN_PROJ_SPEED / dist;
      const proj: DepthsSirenProjectile = {
        id: state.nextSirenProjId++,
        x: e.x, y: e.y, z: e.z,
        vx: dx * inv, vy: dy * inv, vz: dz * inv,
        life: DEPTHS.SIREN_PROJ_RANGE / DEPTHS.SIREN_PROJ_SPEED,
        alive: true,
      };
      state.sirenProjectiles.push(proj);

      // Spawn glow at origin
      for (let i = 0; i < 3; i++) {
        _spawnParticle(state, {
          x: e.x + (Math.random() - 0.5) * 0.3,
          y: e.y + (Math.random() - 0.5) * 0.3,
          z: e.z + (Math.random() - 0.5) * 0.3,
          vx: (Math.random() - 0.5), vy: (Math.random() - 0.5), vz: (Math.random() - 0.5),
          life: 0.4, maxLife: 0.4, size: 0.15,
          color: 0xbb66dd, type: "siren_proj",
        });
      }
    }
  }

  // Move and collide projectiles
  const p = state.player;
  for (const proj of state.sirenProjectiles) {
    if (!proj.alive) continue;
    proj.x += proj.vx * dt;
    proj.y += proj.vy * dt;
    proj.z += proj.vz * dt;
    proj.life -= dt;
    if (proj.life <= 0) { proj.alive = false; continue; }

    // Trail
    if (Math.random() < 0.4) {
      _spawnParticle(state, {
        x: proj.x, y: proj.y, z: proj.z,
        vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5, vz: (Math.random() - 0.5) * 0.5,
        life: 0.3, maxLife: 0.3, size: 0.1,
        color: 0xaa55cc, type: "siren_proj",
      });
    }

    // Hit player
    const dx = p.x - proj.x;
    const dy = p.y - proj.y;
    const dz = p.z - proj.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist < DEPTHS.SIREN_PROJ_RADIUS + DEPTHS.PLAYER_RADIUS && p.invulnTimer <= 0) {
      proj.alive = false;
      const finalDmg = Math.max(1, DEPTHS.SIREN_PROJ_DMG - state.upgrades.armor);
      p.hp -= finalDmg;
      p.invulnTimer = 0.3;
      state.damageNumbers.push({ x: p.x, y: p.y + 1, z: p.z, value: finalDmg, life: 1.0, color: 0xbb66dd });
      _addDamageIndicator(state, proj.x, proj.z);
      _triggerShake(state, 0.15);

      if (p.hp <= 0) {
        p.hp = 0;
        if (state.deathAnimTimer <= 0) state.deathAnimTimer = 2.0; // start death animation
        state.deathCause = "Enchanted by a siren's song";
        state.notifications.push({ text: "Enchanted by the siren's song...", life: 5, color: "#bb66dd" });
      }
    }
  }

  state.sirenProjectiles = state.sirenProjectiles.filter(pr => pr.alive);
}

// ---------------------------------------------------------------------------
// Relics
// ---------------------------------------------------------------------------

export function updateRelics(state: DepthsState, dt: number): void {
  const p = state.player;

  for (const r of state.relics) {
    if (r.collected) continue;
    r.bobPhase += dt * 2;

    const dx = p.x - r.x;
    const dy = p.y - r.y;
    const dz = p.z - r.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Glow particles when nearby
    if (dist < 8 && Math.random() < 0.15) {
      const def = DEPTHS.RELICS[r.key];
      if (def) {
        _spawnParticle(state, {
          x: r.x + (Math.random() - 0.5) * 1.5,
          y: r.y + (Math.random() - 0.5) * 1.5 + Math.sin(r.bobPhase) * 0.3,
          z: r.z + (Math.random() - 0.5) * 1.5,
          vx: (Math.random() - 0.5) * 0.5,
          vy: 0.5 + Math.random(),
          vz: (Math.random() - 0.5) * 0.5,
          life: 1.0, maxLife: 1.0, size: 0.12,
          color: def.color, type: "relic_glow",
        });
      }
    }

    if (dist < 2.5) {
      r.collected = true;
      state.collectedRelics.add(r.key);
      const def = DEPTHS.RELICS[r.key];
      if (def) {
        const rarityColor = def.rarity === "legendary" ? "#ffdd00" : def.rarity === "rare" ? "#4488ff" : "#88ccaa";
        state.notifications.push({
          text: `RELIC: ${def.name}`,
          life: 4, color: rarityColor,
        });
        state.notifications.push({
          text: def.desc,
          life: 4, color: "#aabbcc",
        });
      }

      // Pickup burst
      for (let i = 0; i < 20; i++) {
        _spawnParticle(state, {
          x: r.x + (Math.random() - 0.5) * 2,
          y: r.y + (Math.random() - 0.5) * 2,
          z: r.z + (Math.random() - 0.5) * 2,
          vx: (Math.random() - 0.5) * 6,
          vy: (Math.random() - 0.5) * 6,
          vz: (Math.random() - 0.5) * 6,
          life: 1.5, maxLife: 1.5, size: 0.2,
          color: def ? def.color : 0xffffff, type: "sparkle",
        });
      }

      _triggerShake(state, 0.4);
      state.hitStopTimer = 0.2;
      state.audioRelic = true;
      _triggerFlash(state, DEPTHS.FLASH_RELIC_COLOR);
    }
  }
}

// ---------------------------------------------------------------------------
// Charged attack (hold LMB)
// ---------------------------------------------------------------------------

export function updateChargedAttack(state: DepthsState, dt: number): void {
  const p = state.player;

  if (state.mouseDown && p.attackCooldown <= 0 && p.dashTimer <= 0) {
    p.charging = true;
    p.chargeTimer += dt;

    // Charge particles
    if (p.chargeTimer > 0.2 && Math.random() < p.chargeTimer * 2) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 1.5 + Math.random();
      _spawnParticle(state, {
        x: p.x + Math.cos(angle) * dist,
        y: p.y + (Math.random() - 0.5),
        z: p.z + Math.sin(angle) * dist,
        vx: -Math.cos(angle) * 3,
        vy: (Math.random() - 0.5),
        vz: -Math.sin(angle) * 3,
        life: 0.4, maxLife: 0.4, size: 0.1 + p.chargeTimer * 0.1,
        color: p.chargeTimer >= DEPTHS.CHARGE_TIME ? 0xffaa22 : 0x88ccff,
        type: "sparkle",
      });
    }
  } else if (p.charging) {
    // Release!
    p.charging = false;
    const charge = Math.min(p.chargeTimer / DEPTHS.CHARGE_TIME, 1);

    if (charge > 0.3) {
      // Charged slam
      state.audioChargeRelease = true;
      p.attackCooldown = DEPTHS.PLAYER_ATTACK_COOLDOWN * 1.5;
      const dmgMult = 1 + (DEPTHS.CHARGE_DMG_MULT - 1) * charge;
      const rangeMult = 1 + (DEPTHS.CHARGE_RANGE_MULT - 1) * charge;
      const aoe = DEPTHS.CHARGE_AOE_RADIUS * charge * rangeMult;
      const dmg = Math.floor(p.damage * dmgMult);

      // AOE slam effect
      for (let i = 0; i < 15; i++) {
        const a = (i / 15) * Math.PI * 2;
        _spawnParticle(state, {
          x: p.x + Math.cos(a) * 2,
          y: p.y,
          z: p.z + Math.sin(a) * 2,
          vx: Math.cos(a) * 6 * charge,
          vy: (Math.random() - 0.5) * 2,
          vz: Math.sin(a) * 6 * charge,
          life: 0.6, maxLife: 0.6, size: 0.2,
          color: charge >= 1 ? 0xffaa22 : 0x88ccff,
          type: "sparkle",
        });
      }

      // Hit all enemies in AOE
      for (const e of state.enemies) {
        if (!e.alive) continue;
        const dx = e.x - p.x;
        const dy = e.y - p.y;
        const dz = e.z - p.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist > aoe + e.radius) continue;

        const isCrit = charge >= 1 || Math.random() < DEPTHS.CRIT_CHANCE;
        const finalDmg = isCrit ? Math.floor(dmg * DEPTHS.CRIT_MULT) : dmg;
        _dealDamageToEnemy(state, e, finalDmg, e.x, e.y, e.z, isCrit);

        // Knockback
        if (dist > 0.1) {
          const kb = DEPTHS.CHARGE_KNOCKBACK * charge / dist;
          e.vx += dx * kb;
          e.vy += dy * kb + 3;
          e.vz += dz * kb;
        }
      }

      _triggerShake(state, 0.5 * charge + 0.2);
      state.hitStopTimer = 0.15 * charge;
      _triggerFlash(state, charge >= 1 ? DEPTHS.FLASH_CRIT_COLOR : "rgba(136,204,255,0.15)");
    }

    p.chargeTimer = 0;
  }
}

// ---------------------------------------------------------------------------
// Jellyfish
// ---------------------------------------------------------------------------

export function updateJellyfish(state: DepthsState, dt: number): void {
  const p = state.player;

  for (const jf of state.jellyfish) {
    // Drift
    jf.driftAngle += (Math.random() - 0.5) * 0.5 * dt;
    jf.vx += (Math.cos(jf.driftAngle) * DEPTHS.JELLYFISH_DRIFT_SPEED - jf.vx) * dt;
    jf.vy += (Math.sin(jf.pulsePhase * DEPTHS.JELLYFISH_PULSE_SPEED) * 0.3 - jf.vy) * 2 * dt;
    jf.vz += (Math.sin(jf.driftAngle) * DEPTHS.JELLYFISH_DRIFT_SPEED - jf.vz) * dt;

    jf.x += jf.vx * dt;
    jf.y += jf.vy * dt;
    jf.z += jf.vz * dt;
    jf.pulsePhase += dt;

    if (jf.shockCooldown > 0) jf.shockCooldown -= dt;

    // Shock on contact
    const dx = p.x - jf.x;
    const dy = p.y - jf.y;
    const dz = p.z - jf.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (dist < DEPTHS.JELLYFISH_SHOCK_RADIUS + DEPTHS.PLAYER_RADIUS && jf.shockCooldown <= 0 && p.invulnTimer <= 0) {
      jf.shockCooldown = DEPTHS.JELLYFISH_SHOCK_COOLDOWN;
      const dmg = DEPTHS.JELLYFISH_SHOCK_DMG;
      p.hp -= dmg;
      p.invulnTimer = 0.4;
      state.damageNumbers.push({ x: p.x, y: p.y + 1, z: p.z, value: dmg, life: 1.0, color: 0x44ddff });
      _addDamageIndicator(state, jf.x, jf.z);
      _triggerShake(state, 0.2);

      // Electric shock particles
      for (let i = 0; i < 8; i++) {
        _spawnParticle(state, {
          x: jf.x + (Math.random() - 0.5) * 2,
          y: jf.y + (Math.random() - 0.5) * 2,
          z: jf.z + (Math.random() - 0.5) * 2,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.5) * 8,
          vz: (Math.random() - 0.5) * 8,
          life: 0.3, maxLife: 0.3, size: 0.08,
          color: 0x88eeff, type: "sparkle",
        });
      }

      _triggerFlash(state, "rgba(100,200,255,0.2)");

      if (p.hp <= 0) {
        p.hp = 0;
        if (state.deathAnimTimer <= 0) state.deathAnimTimer = 2.0; // start death animation
        state.deathCause = "Electrocuted by jellyfish";
        state.notifications.push({ text: "Electrocuted by jellyfish...", life: 5, color: "#44ddff" });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Excalibur (win condition)
// ---------------------------------------------------------------------------

export function updateExcalibur(state: DepthsState, dt: number): void {
  const ex = state.excalibur;
  if (ex.retrieved) return;
  ex.glowPhase += dt;

  // Only accessible after defeating Lady of the Lake
  if (!state.bossesDefeated.has("lady_of_the_lake")) return;

  const p = state.player;
  const dx = p.x - ex.x;
  const dy = p.y - ex.y;
  const dz = p.z - ex.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

  // Glow particles when nearby
  if (dist < 15 && Math.random() < 0.3) {
    _spawnParticle(state, {
      x: ex.x + (Math.random() - 0.5) * 3,
      y: ex.y + Math.random() * 3,
      z: ex.z + (Math.random() - 0.5) * 3,
      vx: (Math.random() - 0.5), vy: 1 + Math.random(), vz: (Math.random() - 0.5),
      life: 1.5, maxLife: 1.5, size: 0.15,
      color: 0xffffff, type: "relic_glow",
    });
  }

  if (dist < DEPTHS.EXCALIBUR_RADIUS) {
    ex.retrieved = true;
    state.phase = "victory";
    _tryAchievement(state, "excalibur");
    state.audioExcalibur = true;
    _triggerFlash(state, DEPTHS.FLASH_EXCALIBUR_COLOR);
    _triggerShake(state, 1.5);
    state.hitStopTimer = 1.0;

    // Massive particle burst
    for (let i = 0; i < 50; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * 5;
      _spawnParticle(state, {
        x: ex.x + Math.cos(a) * r,
        y: ex.y + Math.random() * 5,
        z: ex.z + Math.sin(a) * r,
        vx: Math.cos(a) * 5,
        vy: 3 + Math.random() * 5,
        vz: Math.sin(a) * 5,
        life: 3, maxLife: 3, size: 0.25,
        color: [0xffffff, 0xffdd44, 0x88ccff][Math.floor(Math.random() * 3)],
        type: "sparkle",
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Achievements
// ---------------------------------------------------------------------------

export function checkAchievements(state: DepthsState): void {
  if (state.diveCount >= 1) _tryAchievement(state, "first_dive");
  if (state.currentDepth >= 30) _tryAchievement(state, "depth_30");
  if (state.currentDepth >= 70) _tryAchievement(state, "depth_70");
  if (state.currentDepth >= 120) _tryAchievement(state, "depth_120");
  if (state.currentDepth >= 170) _tryAchievement(state, "depth_170");
  if (state.combo.count >= 5) _tryAchievement(state, "combo_5");
  if (state.combo.count >= 10) _tryAchievement(state, "combo_10");
  if (state.collectedRelics.size >= 1) _tryAchievement(state, "first_relic");
  if (state.enemiesKilled >= 100) _tryAchievement(state, "kill_100");

  // Decay toasts
  for (const t of state.achievementToasts) t.life -= 0.016;
  state.achievementToasts = state.achievementToasts.filter(t => t.life > 0);
}

function _tryAchievement(state: DepthsState, id: string): void {
  if (state.unlockedAchievements.has(id)) return;
  state.unlockedAchievements.add(id);

  const def = DEPTHS.ACHIEVEMENTS.find(a => a.id === id);
  if (def) {
    state.achievementToasts.push({ name: def.name, desc: def.desc, life: 4 });
    state.notifications.push({ text: `[${def.icon}] ${def.name}`, life: 3, color: "#ffdd44" });
  }

  // Persist to localStorage
  try {
    const arr = Array.from(state.unlockedAchievements);
    localStorage.setItem("depths_achievements", JSON.stringify(arr));
  } catch { /* ignore storage errors */ }
}

export function loadAchievements(state: DepthsState): void {
  try {
    const raw = localStorage.getItem("depths_achievements");
    if (raw) {
      const arr = JSON.parse(raw) as string[];
      for (const id of arr) state.unlockedAchievements.add(id);
    }
    const cp = localStorage.getItem("depths_checkpoint");
    if (cp) state.depthCheckpoint = parseInt(cp, 10) || 0;
  } catch { /* ignore */ }
}

export function saveProgress(state: DepthsState): void {
  try {
    localStorage.setItem("depths_achievements", JSON.stringify(Array.from(state.unlockedAchievements)));
    if (state.depthCheckpoint > 0) {
      localStorage.setItem("depths_checkpoint", String(state.depthCheckpoint));
    }
  } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Screen flash
// ---------------------------------------------------------------------------

export function updateScreenFlash(state: DepthsState, dt: number): void {
  if (state.screenFlash.timer > 0) {
    state.screenFlash.timer -= dt;
  }
}

function _triggerFlash(state: DepthsState, color: string): void {
  state.screenFlash.color = color;
  state.screenFlash.timer = DEPTHS.FLASH_DURATION;
  state.screenFlash.maxTime = DEPTHS.FLASH_DURATION;
}

// ---------------------------------------------------------------------------
// Dive ability unlocks (at depth milestones)
// ---------------------------------------------------------------------------

export function updateDiveAbilities(state: DepthsState): void {
  for (const ab of DEPTHS.DIVE_ABILITIES) {
    if (state.unlockedAbilities.has(ab.id)) continue;
    if (state.currentDepth >= ab.depth) {
      state.unlockedAbilities.add(ab.id);
      state.notifications.push({
        text: `ABILITY UNLOCKED: ${ab.name}`,
        life: 4, color: ab.color,
      });
      state.notifications.push({
        text: ab.desc,
        life: 4, color: "#aabbcc",
      });
      _triggerShake(state, 0.3);
      _triggerFlash(state, `rgba(100,200,255,0.2)`);

      // Tidal Shield auto-activates
      if (ab.id === "tidal_shield") state.tidalShieldActive = true;
    }
  }

  // Blood Frenzy timer decay
  if (state.bloodFrenzyTimer > 0) state.bloodFrenzyTimer -= 0.016;
}

// ---------------------------------------------------------------------------
// Curse effects (apply debuffs during dive)
// ---------------------------------------------------------------------------

export function applyCurseEffects(state: DepthsState): void {
  // Curse reward multiplier
  let mult = 1;
  for (const curseId of state.activeCurses) {
    const def = DEPTHS.CURSES.find(c => c.id === curseId);
    if (def) mult *= def.rewardMult;
  }
  state.curseMult = mult;
}

// ---------------------------------------------------------------------------
// Relic synergy detection
// ---------------------------------------------------------------------------

export function updateRelicSynergies(state: DepthsState): void {
  state.activeSynergies.clear();
  for (const syn of DEPTHS.RELIC_SYNERGIES) {
    if (syn.relics.every(r => state.collectedRelics.has(r))) {
      if (!state.activeSynergies.has(syn.name)) {
        state.activeSynergies.add(syn.name);
        // Notify only once
        state.notifications.push({
          text: `SYNERGY: ${syn.name}`,
          life: 4, color: syn.color,
        });
        state.notifications.push({
          text: syn.desc,
          life: 4, color: "#aabbcc",
        });
        _triggerFlash(state, "rgba(200,150,255,0.25)");
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Tutorial messages (first dive only)
// ---------------------------------------------------------------------------

export function updateTutorial(state: DepthsState): void {
  if (!state.isFirstDive) return;

  const show = (id: string, text: string, depth: number) => {
    if (state.tutorialShown.has(id)) return;
    if (state.currentDepth >= depth) {
      state.tutorialShown.add(id);
      state.notifications.push({ text, life: 5, color: "#88ccaa" });
    }
  };

  show("welcome", "Swim deeper to find treasure. Watch your oxygen!", 1);
  show("combat", "Click to attack. Hold to charge a power strike.", 5);
  show("dash", "Right-click to dash. Press E for harpoon.", 8);
  show("oxygen", "Collect glowing air bubbles to restore oxygen.", 12);
  show("relic", "Ancient relics near ruins grant powerful abilities.", 20);
  show("boss", "Boss creatures guard each depth zone. Prepare yourself!", 25);

  if (state.enemiesKilled >= 1 && !state.tutorialShown.has("kill")) {
    state.tutorialShown.add("kill");
    state.notifications.push({ text: "Kill enemies for XP and gold. Chain kills for combos!", life: 4, color: "#88ccaa" });
  }
}

// ---------------------------------------------------------------------------
// Elite enemy effects (burning trail, vampiric heal, splitting)
// ---------------------------------------------------------------------------

export function updateEliteEffects(state: DepthsState, dt: number): void {
  for (const e of state.enemies) {
    if (!e.alive || !e.isElite) continue;

    switch (e.eliteModifier) {
      case "burning": {
        // Leave burning trail particles
        if (Math.random() < 0.3) {
          _spawnParticle(state, {
            x: e.x + (Math.random() - 0.5),
            y: e.y + (Math.random() - 0.5),
            z: e.z + (Math.random() - 0.5),
            vx: (Math.random() - 0.5) * 0.5,
            vy: 0.5 + Math.random(),
            vz: (Math.random() - 0.5) * 0.5,
            life: 0.8, maxLife: 0.8, size: 0.1,
            color: 0xff6622, type: "sparkle",
          });
        }
        // Burn nearby player
        const dx = state.player.x - e.x;
        const dy = state.player.y - e.y;
        const dz = state.player.z - e.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < 3 && state.player.invulnTimer <= 0) {
          state.player.hp -= 3 * dt;
        }
        break;
      }
      case "vampiric": {
        // Heal on hit — tracked in _applyEnemyDamage
        break;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Death animation
// ---------------------------------------------------------------------------

export function updateDeathAnimation(state: DepthsState, dt: number): void {
  if (state.deathAnimTimer <= 0 || state.phase === "game_over") return;

  state.deathAnimTimer -= dt;

  // Slow-motion during death
  state.hitStopScale = 0.15;
  state.hitStopTimer = Math.max(state.hitStopTimer, 0.1);

  // Increasing vignette
  state.vignetteIntensity = Math.min(0.9, (2 - state.deathAnimTimer) * 0.45);

  // Camera drift upward
  state.player.vy = 1.0;

  if (state.deathAnimTimer <= 0) {
    state.phase = "game_over";
    state.hitStopScale = 0.05;
    // Build run summary
    state.lastRunSummary = {
      depth: Math.floor(state.maxDepthReached),
      kills: state.enemiesKilled,
      gold: state.totalGold,
      time: Math.floor(state.gameTime),
      relics: Array.from(state.collectedRelics),
      bossesKilled: Array.from(state.bossesDefeated),
    };
  }
}

// ---------------------------------------------------------------------------
// Depth momentum (staying deep boosts rewards)
// ---------------------------------------------------------------------------

export function updateDepthMomentum(state: DepthsState): void {
  if (state.currentDepth > DEPTHS.MOMENTUM_START_DEPTH) {
    const bonus = Math.floor((state.currentDepth - DEPTHS.MOMENTUM_START_DEPTH) / 10) * DEPTHS.MOMENTUM_MULT_PER_10M;
    state.depthMomentumMult = Math.min(DEPTHS.MOMENTUM_MAX_MULT, 1 + bonus);
  } else {
    state.depthMomentumMult = 1;
  }
}

// ---------------------------------------------------------------------------
// Wave events (spawn surges at depth milestones)
// ---------------------------------------------------------------------------

export function updateWaveEvents(state: DepthsState, dt: number): void {
  // Check for wave triggers
  for (const triggerDepth of DEPTHS.WAVE_TRIGGER_DEPTHS) {
    if (state.waveDepthTriggered.has(triggerDepth)) continue;
    if (state.currentDepth >= triggerDepth && state.currentDepth < triggerDepth + 5) {
      state.waveDepthTriggered.add(triggerDepth);
      state.waveActive = true;
      state.waveTimer = DEPTHS.WAVE_DURATION;
      state.waveBonusXp = 0;
      state.notifications.push({
        text: `WAVE INCOMING! Survive for ${DEPTHS.WAVE_DURATION}s`,
        life: 3, color: "#ff6644",
      });
      _triggerShake(state, 0.6);
      break;
    }
  }

  // Wave countdown
  if (state.waveActive) {
    state.waveTimer -= dt;
    if (state.waveTimer <= 0) {
      state.waveActive = false;
      const bonusGold = Math.floor(state.waveBonusXp * 0.5);
      state.gold += bonusGold;
      state.totalGold += bonusGold;
      state.notifications.push({
        text: `Wave survived! +${bonusGold}g bonus`,
        life: 3, color: "#ffcc00",
      });
    }
  }
}

// ---------------------------------------------------------------------------
// New depth record
// ---------------------------------------------------------------------------

export function checkDepthRecord(state: DepthsState): void {
  if (state.currentDepth > state.bestDepth + 5 && !state.isNewDepthRecord) {
    state.isNewDepthRecord = true;
    state.notifications.push({
      text: "NEW DEPTH RECORD!",
      life: 3, color: "#ffdd44",
    });
  }
}

// ---------------------------------------------------------------------------
// Phase management
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Endless mode wave spawning
// ---------------------------------------------------------------------------

export function updateEndlessMode(state: DepthsState): void {
  if (!state.endlessMode || state.phase !== "diving") return;

  // Continuous wave escalation
  if (!state.waveActive) {
    state.waveActive = true;
    state.waveTimer = 30 + state.endlessWave * 5; // longer waves each time
    state.waveBonusXp = 0;
    state.notifications.push({
      text: `ENDLESS WAVE ${state.endlessWave}`,
      life: 3, color: "#ff88cc",
    });
  }

  if (state.waveActive && state.waveTimer <= 0) {
    // Wave survived — start next
    state.endlessWave++;
    const bonusGold = Math.floor(state.endlessWave * 25 * state.depthMomentumMult);
    state.gold += bonusGold;
    state.totalGold += bonusGold;
    state.notifications.push({
      text: `Wave ${state.endlessWave - 1} cleared! +${bonusGold}g`,
      life: 3, color: "#ffcc00",
    });
    state.waveActive = false; // will restart next frame
  }
}

export function updatePhase(state: DepthsState): void {
  if (state.phase === "diving" && state.currentDepth < 1 && state.gameTime > 2) {
    // Build run summary before transitioning
    state.lastRunSummary = {
      depth: Math.floor(state.maxDepthReached),
      kills: state.enemiesKilled,
      gold: state.totalGold,
      time: Math.floor(state.gameTime),
      relics: Array.from(state.collectedRelics),
      bossesKilled: Array.from(state.bossesDefeated),
    };
    state.phase = "shop";
    state.notifications.push({ text: "Surfaced! Visit the shop.", life: 3, color: "#88ff88" });
  }
}

// ---------------------------------------------------------------------------
// Shop: apply upgrade
// ---------------------------------------------------------------------------

export function buyUpgrade(state: DepthsState, key: string): boolean {
  const def = DEPTHS.UPGRADES[key];
  if (!def) return false;
  const lvl = state.upgrades[key as keyof typeof state.upgrades];
  if (lvl >= def.maxLevel) return false;
  const cost = Math.floor(def.baseCost * Math.pow(def.costMult, lvl));
  if (state.gold < cost) return false;
  state.gold -= cost;
  (state.upgrades as any)[key] = lvl + 1;
  return true;
}

// ---------------------------------------------------------------------------
// Start a new dive
// ---------------------------------------------------------------------------

export function startDive(state: DepthsState, useCheckpoint = false): void {
  state.phase = "diving";
  state.diveCount++;
  state.gameTime = 0;

  const startDepth = useCheckpoint && state.depthCheckpoint > 0 ? state.depthCheckpoint : 2;

  const p = state.player;
  p.x = 0; p.y = -startDepth; p.z = 0;
  p.vx = 0; p.vy = 0; p.vz = 0;
  p.yaw = 0; p.pitch = 0;
  p.hp = p.maxHp;
  p.oxygen = p.maxOxygen;
  p.attackCooldown = 0;
  p.invulnTimer = 0;
  p.dashCooldown = 0;
  p.dashTimer = 0;
  p.harpoonCooldown = 0;

  state.enemies = [];
  state.harpoons = [];
  state.sirenProjectiles = [];
  state.drops = [];

  // Reset jellyfish to fresh random positions
  for (const jf of state.jellyfish) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 5 + Math.random() * (DEPTHS.WORLD_RADIUS - 10);
    jf.x = Math.cos(angle) * dist;
    jf.y = -(5 + Math.random() * 150);
    jf.z = Math.sin(angle) * dist;
    jf.vx = 0; jf.vy = 0; jf.vz = 0;
    jf.driftAngle = Math.random() * Math.PI * 2;
    jf.shockCooldown = 0;
  }
  state.particles = [];
  state.damageNumbers = [];
  state.damageIndicators = [];
  state.airBubbles = [];
  state.enemySpawnTimer = 2.0;
  state.currentDepth = startDepth;
  state.maxDepthReached = 0;
  state.activeBossId = null;
  state.combo = { count: 0, timer: 0, bestStreak: 0 };
  state.screenShake = { intensity: 0, timer: 0, offsetX: 0, offsetY: 0 };
  state.currentFov = DEPTHS.CAMERA_FOV;
  state.targetFov = DEPTHS.CAMERA_FOV;
  state.vignetteIntensity = 0;

  // Relics reset per dive (roguelike — find them again)
  state.collectedRelics.clear();
  for (const r of state.relics) r.collected = false;

  // Treasures respawn each dive
  for (const t of state.treasures) t.collected = false;

  // Wave state reset
  state.waveActive = false;
  state.waveTimer = 0;
  state.waveDepthTriggered.clear();
  state.waveBonusXp = 0;

  // Momentum reset
  state.depthMomentumMult = 1;

  // Run tracking
  state.diveStartTime = Date.now();
  state.isNewDepthRecord = false;

  // Track per-dive kills for summary
  state.enemiesKilled = 0;

  // Fix: reset death animation
  state.deathAnimTimer = 0;

  // Abilities reset per dive
  state.unlockedAbilities.clear();
  state.tidalShieldActive = false;
  state.bloodFrenzyTimer = 0;
  state.eliteKills = 0;
  state.activeSynergies.clear();

  // First dive tracking
  if (state.diveCount <= 1) state.isFirstDive = true;
  else state.isFirstDive = false;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _enemyContactDamage(state: DepthsState, e: DepthsEnemy, p: DepthsState["player"], dist: number): void {
  if (dist < e.radius + DEPTHS.PLAYER_RADIUS + 0.5 && p.invulnTimer <= 0) {
    _applyEnemyDamage(state, e, p, 1.0);
  }
}

function _applyEnemyDamage(state: DepthsState, e: DepthsEnemy, p: DepthsState["player"], dmgMult: number): void {
  let curseDmgMult = 1;
  if (state.activeCurses.has("fragile")) curseDmgMult *= 1.5;
  if (state.activeCurses.has("glass_cannon")) curseDmgMult *= 2;

  // Tidal Shield blocks next hit
  if (state.tidalShieldActive && state.unlockedAbilities.has("tidal_shield")) {
    state.tidalShieldActive = false;
    state.notifications.push({ text: "Shield absorbed!", life: 1.5, color: "#ffcc44" });
    _triggerFlash(state, "rgba(255,200,50,0.2)");
    return;
  }

  const finalDmg = Math.max(1, Math.floor(e.dmg * dmgMult * curseDmgMult) - state.upgrades.armor * 2);
  p.hp -= finalDmg;
  p.invulnTimer = DEPTHS.PLAYER_INVULN_TIME;
  state.damageNumbers.push({ x: p.x, y: p.y + 1, z: p.z, value: finalDmg, life: 1.0, color: 0xff4444 });
  _triggerShake(state, DEPTHS.SHAKE_HIT_INTENSITY);
  _addDamageIndicator(state, e.x, e.z);
  state.hitStopTimer = 0.1;
  state.damageTakenDuringBoss += finalDmg;

  if (p.hp <= 0) {
    p.hp = 0;
    if (state.deathAnimTimer <= 0) state.deathAnimTimer = 2.0; // start death animation
    state.deathCause = "Slain by the creatures of the deep";
    state.notifications.push({ text: "Slain in the depths...", life: 5, color: "#ff4444" });
  }
}

function _spawnParticle(state: DepthsState, p: DepthsParticle): void {
  if (state.particles.length >= DEPTHS.PARTICLE_LIMIT) return;
  state.particles.push(p);
}
