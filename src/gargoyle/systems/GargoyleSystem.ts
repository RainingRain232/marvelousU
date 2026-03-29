// ---------------------------------------------------------------------------
// Gargoyle: Cathedral Guardian — core game systems
// ---------------------------------------------------------------------------

import { GARG } from "../config/GargoyleConfig";
import type {
  GargoyleState, Demon, DemonType, Vec3, GargoyleParticle, SpawnEntry, WaveModifier,
} from "../state/GargoyleState";
import { genGargoyleId, WAVE_MODIFIER_NAMES, WAVE_MODIFIER_COLORS } from "../state/GargoyleState";
// Difficulty type used via GARG.DIFFICULTY indexed by state.difficulty string

// ---- Helpers ----

function dist3(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function distXZ(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x, dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

function normalize3(v: Vec3): Vec3 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len < 0.0001) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function addNotification(state: GargoyleState, text: string, color: number): void {
  state.notifications.push({ text, timer: 3.0, color });
  if (state.notifications.length > 6) state.notifications.shift();
}

function spawnParticles(
  state: GargoyleState, pos: Vec3, count: number,
  type: GargoyleParticle["type"], color: number, speed: number, life: number,
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

function flashScreen(state: GargoyleState, color: string, intensity: number, duration: number): void {
  state.screenFlash = { color, intensity, timer: duration };
}

function addScreenShake(state: GargoyleState, intensity: number, duration: number): void {
  state.screenShake = Math.max(state.screenShake, duration);
  state.screenShakeIntensity = Math.max(state.screenShakeIntensity, intensity);
}

function spawnDamageNumber(state: GargoyleState, pos: Vec3, value: number, color: number, crit: boolean): void {
  state.damageNumbers.push({
    pos: { x: pos.x + (Math.random() - 0.5) * 0.5, y: pos.y + 1.5, z: pos.z },
    value: Math.round(value), timer: 1.2, color, crit,
  });
}

function spawnSoulOrb(state: GargoyleState, pos: Vec3, value: number): void {
  const angle = Math.random() * Math.PI * 2;
  state.soulOrbs.push({
    pos: { ...pos, y: pos.y + 0.5 },
    vel: { x: Math.cos(angle) * 3, y: 4 + Math.random() * 2, z: Math.sin(angle) * 3 },
    value, life: GARG.SOUL_ORB_LIFE, attracted: false,
  });
}

function spawnHealthOrb(state: GargoyleState, pos: Vec3, heal: number): void {
  const angle = Math.random() * Math.PI * 2;
  state.healthOrbs.push({
    pos: { ...pos, y: pos.y + 0.5 },
    vel: { x: Math.cos(angle) * 2, y: 5, z: Math.sin(angle) * 2 },
    heal, life: GARG.HEALTH_ORB_LIFE,
  });
}

// ---- Cathedral collision ----

function cathedralCollide(pos: Vec3): Vec3 {
  const hw = GARG.CATHEDRAL_WIDTH / 2 + GARG.CATHEDRAL_COLLISION_PAD;
  const hl = GARG.CATHEDRAL_LENGTH / 2 + GARG.CATHEDRAL_COLLISION_PAD;
  const h = GARG.CATHEDRAL_HEIGHT + GARG.CATHEDRAL_COLLISION_PAD;

  // Only collide if inside cathedral bounding box
  if (Math.abs(pos.x) < hw && Math.abs(pos.z) < hl && pos.y < h && pos.y > 0) {
    // Push out from nearest face
    const dxL = pos.x + hw, dxR = hw - pos.x;
    const dzF = pos.z + hl, dzB = hl - pos.z;
    const dyT = h - pos.y;
    const min = Math.min(dxL, dxR, dzF, dzB, dyT);

    const result = { ...pos };
    if (min === dxL) result.x = -hw;
    else if (min === dxR) result.x = hw;
    else if (min === dzF) result.z = -hl;
    else if (min === dzB) result.z = hl;
    else result.y = h;
    return result;
  }
  return pos;
}

// ---- Combo System ----

function addCombo(state: GargoyleState): void {
  const p = state.player;
  p.combo++;
  p.comboTimer = GARG.COMBO_WINDOW;
  if (p.combo > p.maxCombo) p.maxCombo = p.combo;
  if (p.combo === 3) addNotification(state, "TRIPLE KILL!", 0xff8844);
  else if (p.combo === 5) addNotification(state, "PENTAKILL!", 0xff4444);
  else if (p.combo === 8) addNotification(state, "MASSACRE!", 0xff0000);
  else if (p.combo >= 10) addNotification(state, "UNSTOPPABLE!", 0xff00ff);
}

function getComboMultiplier(state: GargoyleState): number {
  return 1 + Math.min(state.player.combo, GARG.COMBO_MAX) * GARG.COMBO_DAMAGE_BONUS;
}

function getComboSoulBonus(state: GargoyleState): number {
  return 1 + Math.min(state.player.combo, GARG.COMBO_MAX) * GARG.COMBO_SOUL_BONUS;
}

// ---- Dawn slowdown factor ----

function getDawnSlowFactor(state: GargoyleState): number {
  if (state.phase !== "dawn") return 1;
  const progress = 1 - state.phaseTimer / GARG.DAWN_DURATION; // 0→1
  return 1 - progress * (1 - GARG.DAWN_SLOW_FACTOR);
}

// ---- Fury mode ----

function isFury(state: GargoyleState): boolean {
  const p = state.player;
  return p.hp > 0 && p.hp < p.maxHp * GARG.FURY_HP_THRESHOLD && state.phase !== "day" && state.phase !== "menu";
}

function getFuryDamageMult(state: GargoyleState): number {
  return isFury(state) ? GARG.FURY_DAMAGE_MULT : 1;
}

function getFurySpeedMult(state: GargoyleState): number {
  return isFury(state) ? GARG.FURY_SPEED_MULT : 1;
}

// ---- Difficulty helpers ----

function getDiffMult(state: GargoyleState): typeof GARG.DIFFICULTY.normal {
  return GARG.DIFFICULTY[state.difficulty] ?? GARG.DIFFICULTY.normal;
}

// ---- Night duration scaling ----

function getNightDuration(wave: number): number {
  return Math.max(GARG.NIGHT_DURATION_MIN, GARG.NIGHT_DURATION - (wave - 1) * GARG.NIGHT_DURATION_DECAY);
}

// ---- Perch type detection ----

function getPerchType(pos: Vec3): "tower" | "wall" | "spire" | "none" {
  const hw = GARG.CATHEDRAL_WIDTH / 2;
  const hl = GARG.CATHEDRAL_LENGTH / 2;
  // Spire — highest point
  if (pos.y > GARG.SPIRE_HEIGHT - 2) return "spire";
  // Tower — corner positions at tower height
  if (pos.y > GARG.TOWER_HEIGHT - 2) return "tower";
  // Wall — mid-height on sides
  if (Math.abs(pos.x) > hw - 1 || Math.abs(pos.z) > hl - 1) return "wall";
  return "none";
}

function getPerchBonusLabel(type: "tower" | "wall" | "spire" | "none"): string {
  switch (type) {
    case "tower": return "Tower: +ATK Speed";
    case "wall": return "Wall: +Armor";
    case "spire": return "Spire: +HP Regen";
    default: return "";
  }
}

// ---- Player Movement ----

export function updatePlayer(state: GargoyleState, dt: number): void {
  const p = state.player;
  const keys = state.keys;

  p.diveBombCD = Math.max(0, p.diveBombCD - dt);
  p.stoneBreathCD = Math.max(0, p.stoneBreathCD - dt);
  p.wingGustCD = Math.max(0, p.wingGustCD - dt);
  p.talonCD = Math.max(0, p.talonCD - dt);
  p.consecrateCD = Math.max(0, p.consecrateCD - dt);
  p.dashCD = Math.max(0, p.dashCD - dt);
  p.stoneSkinCD = Math.max(0, p.stoneSkinCD - dt);
  p.stoneSkinTimer = Math.max(0, p.stoneSkinTimer - dt);
  p.invincibleTimer = Math.max(0, p.invincibleTimer - dt);
  p.attackTimer = Math.max(0, p.attackTimer - dt);
  if (p.attackTimer <= 0) p.attacking = false;

  // Hit stop decay
  if (state.hitStopTimer > 0) {
    state.hitStopTimer -= dt;
    if (state.hitStopTimer <= 0) state.hitStopScale = 1;
  }

  // Screen flash decay
  if (state.screenFlash.timer > 0) state.screenFlash.timer -= dt;

  // Wave title decay
  if (state.waveTitle.timer > 0) state.waveTitle.timer -= dt;

  if (p.combo > 0 && state.hitStopTimer <= 0) {
    p.comboTimer -= dt;
    if (p.comboTimer <= 0) p.combo = 0;
  }

  state.screenShake = Math.max(0, state.screenShake - dt);
  if (state.screenShake <= 0) state.screenShakeIntensity = 0;

  if (p.action === "frozen") return;

  // Dawn petrification effect — stone particles spreading on player
  const dawnSlow = getDawnSlowFactor(state);
  if (state.phase === "dawn" && dawnSlow < 0.8 && state.tick % 8 === 0) {
    spawnParticles(state, p.pos, 1, "stone", 0xaaaaaa, 1, 0.4);
  }

  // Mouse look
  const sens = 0.002;
  if (state.pointerLocked) {
    p.yaw -= state.mouseDX * sens * GARG.TURN_SPEED * dawnSlow;
    p.pitch -= state.mouseDY * sens * GARG.PITCH_SPEED * dawnSlow;
    p.pitch = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 3, p.pitch));
  }
  state.mouseDX = 0;
  state.mouseDY = 0;

  const cosYaw = Math.cos(p.yaw);
  const sinYaw = Math.sin(p.yaw);
  const forward: Vec3 = { x: sinYaw, y: 0, z: cosYaw };
  const right: Vec3 = { x: -cosYaw, y: 0, z: sinYaw };

  const sprinting = keys.has("shift");
  const wingSpeedMult = 1 + p.wingLevel * 0.15;

  // Perch buff timer
  if (p.perchBuffTimer > 0) p.perchBuffTimer -= dt;
  else p.perchBuffType = "none";

  if (p.action === "perched") {
    // Determine perch type and set bonus
    const pType = getPerchType(p.pos);
    p.perchBuffType = pType;
    p.perchBonus = getPerchBonusLabel(pType);

    // Regen based on perch type
    const hpRegen = pType === "spire" ? GARG.PERCH_SPIRE_REGEN : GARG.HP_REGEN_PERCHED;
    p.hp = Math.min(p.maxHp, p.hp + hpRegen * dt);
    p.stamina = Math.min(p.maxStamina, p.stamina + GARG.STAMINA_REGEN * 2 * dt);

    if (keys.has(" ")) {
      p.action = "flying"; p.vel.y = 8;
      // Carry buff forward after takeoff
      if (pType !== "none") p.perchBuffTimer = GARG.PERCH_BUFF_DURATION;
    }
    return;
  }

  if (p.action === "diving") {
    p.vel.y = -GARG.DIVE_SPEED;
    p.vel.x *= 0.95;
    p.vel.z *= 0.95;

    if (state.tick % 2 === 0) {
      state.particles.push({
        pos: { x: p.pos.x + (Math.random() - 0.5) * 2, y: p.pos.y + 2, z: p.pos.z + (Math.random() - 0.5) * 2 },
        vel: { x: 0, y: 8, z: 0 }, life: 0.3, maxLife: 0.3, color: 0xffffff, size: 0.05, type: "speed_line",
      });
    }

    if (p.pos.y <= 1.0) {
      p.pos.y = 1.0; p.vel.y = 5; p.action = "flying";
      const dmgMult = 1 + p.diveBombLevel * 0.3;
      const radiusMult = 1 + p.diveBombLevel * 0.3;
      const dmg = GARG.DIVE_BOMB_DAMAGE * dmgMult * getComboMultiplier(state);
      const radius = GARG.DIVE_BOMB_RADIUS * radiusMult;

      state.demons.forEach(demon => {
        if (demon.behavior === "dead") return;
        const d = dist3(p.pos, demon.pos);
        if (d < radius) {
          const falloff = 1 - d / radius;
          damageDemon(state, demon, dmg * falloff);
          const dir = normalize3({ x: demon.pos.x - p.pos.x, y: 2, z: demon.pos.z - p.pos.z });
          demon.vel.x += dir.x * 10 * falloff;
          demon.vel.y += dir.y * 8 * falloff;
          demon.vel.z += dir.z * 10 * falloff;
        }
      });
      spawnParticles(state, p.pos, 40, "impact", 0x888888, 10, 1.2);
      spawnParticles(state, p.pos, 20, "debris", 0x666655, 8, 1.0);
      addScreenShake(state, GARG.DIVE_BOMB_SCREEN_SHAKE, 0.5);
      state.pendingCraters.push({ x: p.pos.x, z: p.pos.z });
      // Hit stop on multi-kill dive bomb
      let diveBombKills = 0;
      state.demons.forEach(d => { if (d.behavior === "dead" && d.deathTimer > 1.9) diveBombKills++; });
      if (diveBombKills >= 2) { state.hitStopTimer = GARG.HIT_STOP_DIVEBOMB; state.hitStopScale = GARG.HIT_STOP_SCALE; }
    }
    p.pos.x += p.vel.x * dt;
    p.pos.y += p.vel.y * dt;
    p.pos.z += p.vel.z * dt;
    return;
  }

  // Flying / Gliding
  const flySpeed = (sprinting ? GARG.SPRINT_FLY_SPEED : GARG.FLY_SPEED) * wingSpeedMult * dawnSlow * getFurySpeedMult(state);

  let moveX = 0, moveZ = 0, moveY = 0;
  if (keys.has("w")) { moveX += forward.x; moveZ += forward.z; }
  if (keys.has("s")) { moveX -= forward.x; moveZ -= forward.z; }
  if (keys.has("a")) { moveX -= right.x; moveZ -= right.z; }
  if (keys.has("d")) { moveX += right.x; moveZ += right.z; }
  if (keys.has(" ")) moveY += 1;
  if (keys.has("control")) moveY -= 1;

  const moving = moveX !== 0 || moveZ !== 0 || moveY !== 0;

  if (moving) {
    const drain = (sprinting ? GARG.STAMINA_SPRINT_DRAIN : GARG.STAMINA_FLY_DRAIN) / dawnSlow;
    p.stamina = Math.max(0, p.stamina - drain * dt);
    p.action = "flying";
    if (p.stamina <= 0) p.action = "gliding";
  } else {
    p.action = "gliding";
    p.stamina = Math.min(p.maxStamina, p.stamina + GARG.STAMINA_REGEN * dt);
  }

  const accel = flySpeed * 3;
  p.vel.x += moveX * accel * dt;
  p.vel.z += moveZ * accel * dt;
  p.vel.y += moveY * GARG.LIFT_FORCE * dawnSlow * dt;

  if (p.action === "gliding") {
    p.vel.y += GARG.GRAVITY * 0.15 * dt;
    p.stamina = Math.min(p.maxStamina, p.stamina + GARG.STAMINA_REGEN * 0.5 * dt);
  } else {
    p.vel.y += GARG.GRAVITY * 0.08 * dt;
  }

  p.vel.x *= GARG.AIR_DRAG; p.vel.z *= GARG.AIR_DRAG; p.vel.y *= 0.96;

  const hSpeed = Math.sqrt(p.vel.x * p.vel.x + p.vel.z * p.vel.z);
  if (hSpeed > flySpeed) {
    const scale = flySpeed / hSpeed;
    p.vel.x *= scale; p.vel.z *= scale;
  }

  p.pos.x += p.vel.x * dt;
  p.pos.y += p.vel.y * dt;
  p.pos.z += p.vel.z * dt;

  // Cathedral collision
  const corrected = cathedralCollide(p.pos);
  if (corrected.x !== p.pos.x) { p.vel.x = 0; p.pos.x = corrected.x; }
  if (corrected.y !== p.pos.y) { p.vel.y = 0; p.pos.y = corrected.y; }
  if (corrected.z !== p.pos.z) { p.vel.z = 0; p.pos.z = corrected.z; }

  if (p.pos.y < 1.5) { p.pos.y = 1.5; p.vel.y = Math.max(0, p.vel.y); }
  if (p.pos.y > 80) { p.pos.y = 80; p.vel.y = Math.min(0, p.vel.y); }

  const bound = GARG.GROUND_SIZE / 2 - 5;
  p.pos.x = Math.max(-bound, Math.min(bound, p.pos.x));
  p.pos.z = Math.max(-bound, Math.min(bound, p.pos.z));

  // Flight trail particles + sprint speed lines
  if ((p.action === "flying" || p.action === "gliding") && hSpeed > 6 && state.tick % 3 === 0) {
    state.particles.push({
      pos: { x: p.pos.x, y: p.pos.y - 0.5, z: p.pos.z },
      vel: { x: -p.vel.x * 0.1, y: 0.5, z: -p.vel.z * 0.1 },
      life: 0.5, maxLife: 0.5, color: 0x556688, size: 0.15, type: "trail",
    });
    // Speed lines when sprinting fast
    if (hSpeed > 14 && state.tick % 2 === 0) {
      state.particles.push({
        pos: { x: p.pos.x + (Math.random() - 0.5) * 1.5, y: p.pos.y + (Math.random() - 0.5), z: p.pos.z + (Math.random() - 0.5) * 1.5 },
        vel: { x: -p.vel.x * 0.3, y: 0, z: -p.vel.z * 0.3 },
        life: 0.15, maxLife: 0.15, color: 0xffffff, size: 0.04, type: "speed_line",
      });
    }
  }

  // Dash: Shift + direction while flying (double-tap shift or specific key)
  if (p.dashTimer > 0) {
    p.dashTimer -= dt;
    p.pos.x += p.dashDir.x * GARG.DASH_SPEED * dt;
    p.pos.y += p.dashDir.y * GARG.DASH_SPEED * dt * 0.5;
    p.pos.z += p.dashDir.z * GARG.DASH_SPEED * dt;
    p.invincibleTimer = Math.max(p.invincibleTimer, GARG.DASH_IFRAMES);
    // Dash trail
    if (state.tick % 2 === 0) {
      state.particles.push({
        pos: { ...p.pos }, vel: { x: -p.dashDir.x * 2, y: 0.5, z: -p.dashDir.z * 2 },
        life: 0.3, maxLife: 0.3, color: 0x88aaff, size: 0.2, type: "trail",
      });
    }
    if (p.dashTimer <= 0) { p.vel.x = p.dashDir.x * 8; p.vel.z = p.dashDir.z * 8; }
  } else if (keys.has("x") && p.dashCD <= 0 && p.stamina >= GARG.DASH_STAMINA_COST
    && (p.action === "flying" || p.action === "gliding")) {
    state.keys.delete("x");
    p.dashCD = GARG.DASH_COOLDOWN;
    p.dashTimer = GARG.DASH_DURATION;
    p.stamina -= GARG.DASH_STAMINA_COST;
    // Dash in facing direction
    p.dashDir = normalize3({ x: Math.sin(p.yaw), y: -Math.sin(p.pitch) * 0.3, z: Math.cos(p.yaw) });
    spawnParticles(state, p.pos, 8, "impact", 0x88aaff, 5, 0.4);
    state.stats.abilitiesUsed++;
  }

  // Perch
  if (keys.has("e")) {
    for (const pp of state.cathedral.perchPoints) {
      if (dist3(p.pos, pp.pos) < GARG.PERCH_SNAP_DIST) {
        p.pos = { ...pp.pos }; p.vel = { x: 0, y: 0, z: 0 }; p.action = "perched";
        break;
      }
    }
  }
}

// ---- Abilities ----

export function useAbilities(state: GargoyleState): void {
  const p = state.player;
  if (p.action === "frozen" || p.action === "perched") return;

  const comboMult = getComboMultiplier(state);
  const furyMult = getFuryDamageMult(state);
  // Tower perch buff: reduced cooldowns
  const cdMult = p.perchBuffType === "tower" ? (1 - GARG.PERCH_TOWER_ATK_SPEED) : 1;

  // Talon Strike: LMB
  if (state.mouseDown && p.talonCD <= 0) {
    p.talonCD = GARG.TALON_COOLDOWN * cdMult;
    state.stats.abilitiesUsed++;
    p.attacking = true; p.attackTimer = 0.3;
    const dmgMult = 1 + p.talonLevel * 0.25;
    const baseDmg = GARG.TALON_DAMAGE * dmgMult * comboMult * furyMult;
    const dir: Vec3 = { x: Math.sin(p.yaw), y: -Math.sin(p.pitch), z: Math.cos(p.yaw) };

    // Cleave: at high speed, wider range and more targets
    const speed = Math.sqrt(p.vel.x * p.vel.x + p.vel.y * p.vel.y + p.vel.z * p.vel.z);
    const isCleave = speed >= GARG.CLEAVE_SPEED_THRESHOLD;
    const talonRange = GARG.TALON_RANGE + (isCleave ? GARG.CLEAVE_BONUS_RANGE : 0);
    const maxHits = isCleave ? GARG.CLEAVE_CHAIN_MAX : 3;

    let hitCount = 0;
    state.demons.forEach(demon => {
      if (demon.behavior === "dead" || hitCount >= maxHits) return;
      const toD = { x: demon.pos.x - p.pos.x, y: demon.pos.y - p.pos.y, z: demon.pos.z - p.pos.z };
      const d = Math.sqrt(toD.x * toD.x + toD.y * toD.y + toD.z * toD.z);
      if (d > talonRange) return;
      const nToD = normalize3(toD);
      const dot = nToD.x * dir.x + nToD.y * dir.y + nToD.z * dir.z;
      if (dot < (isCleave ? 0.2 : 0.4)) return;  // wider cone during cleave

      const crit = speed > 10 && Math.random() < 0.3;
      const dmg = crit ? baseDmg * 2 : baseDmg;
      damageDemon(state, demon, dmg);
      spawnDamageNumber(state, demon.pos, dmg, crit ? 0xffcc00 : 0xff8844, crit);
      spawnParticles(state, demon.pos, 5, "impact", 0xffaa44, 3, 0.4);
      hitCount++;
      demon.vel.x += dir.x * 3; demon.vel.y += 2; demon.vel.z += dir.z * 3;
      // Hit stop on crit
      if (crit) { state.hitStopTimer = GARG.HIT_STOP_CRIT; state.hitStopScale = GARG.HIT_STOP_SCALE; }
    });
    if (hitCount > 0) addScreenShake(state, 0.15, 0.1);
    if (isCleave && hitCount >= 3) addNotification(state, `CLEAVE x${hitCount}!`, 0xccddff);
  }

  // Dive Bomb: Q
  if (state.keys.has("q") && p.diveBombCD <= 0 && p.pos.y > 5 && p.action !== "diving") {
    p.diveBombCD = GARG.DIVE_BOMB_COOLDOWN * cdMult;
    state.stats.abilitiesUsed++;
    p.action = "diving"; p.vel.x *= 0.3; p.vel.z *= 0.3;
    state.keys.delete("q");
  }

  // Stone Breath: RMB
  if (state.rightMouseDown && p.stoneBreathCD <= 0) {
    p.stoneBreathCD = GARG.STONE_BREATH_COOLDOWN * cdMult;
    state.stats.abilitiesUsed++;
    const rangeMult = 1 + p.breathLevel * 0.2;
    const stunDur = GARG.STONE_BREATH_DURATION + p.breathLevel * 1.0;
    const range = GARG.STONE_BREATH_RANGE * rangeMult;
    const dmg = GARG.STONE_BREATH_DAMAGE * comboMult * furyMult;
    const dir: Vec3 = { x: Math.sin(p.yaw), y: -Math.sin(p.pitch), z: Math.cos(p.yaw) };

    state.demons.forEach(demon => {
      if (demon.behavior === "dead") return;
      const toD = { x: demon.pos.x - p.pos.x, y: demon.pos.y - p.pos.y, z: demon.pos.z - p.pos.z };
      const d = Math.sqrt(toD.x * toD.x + toD.y * toD.y + toD.z * toD.z);
      if (d > range) return;
      const nToD = normalize3(toD);
      if (nToD.x * dir.x + nToD.y * dir.y + nToD.z * dir.z < Math.cos(GARG.STONE_BREATH_ANGLE)) return;
      demon.stunTimer = stunDur; demon.behavior = "stunned";
      damageDemon(state, demon, dmg);
      spawnDamageNumber(state, demon.pos, dmg, 0xaaaaaa, false);
      spawnParticles(state, demon.pos, 8, "stone", 0xaaaaaa, 2, 0.6);
    });
    state.pendingBreathCone = { yaw: p.yaw, pitch: p.pitch, range };
    flashScreen(state, "rgba(160,160,170,0.1)", 0.1, 0.2);
    for (let i = 0; i < 25; i++) {
      const spread = (Math.random() - 0.5) * GARG.STONE_BREATH_ANGLE * 2;
      const d = 2 + Math.random() * range;
      state.particles.push({
        pos: { ...p.pos }, vel: {
          x: (dir.x + Math.cos(spread) * 0.3) * d * 2,
          y: (dir.y + (Math.random() - 0.5) * 0.2) * d * 2,
          z: (dir.z + Math.sin(spread) * 0.3) * d * 2,
        }, life: 0.6, maxLife: 0.6, color: 0x999999 + Math.floor(Math.random() * 0x222222),
        size: 0.3 + Math.random() * 0.5, type: "stone",
      });
    }
  }

  // Wing Gust: F
  if (state.keys.has("f") && p.wingGustCD <= 0) {
    p.wingGustCD = GARG.WING_GUST_COOLDOWN * cdMult; state.keys.delete("f");
    state.stats.abilitiesUsed++;
    let gustHits = 0;
    state.demons.forEach(demon => {
      if (demon.behavior === "dead") return;
      const d = dist3(p.pos, demon.pos);
      if (d > GARG.WING_GUST_RANGE) return;
      const dir = normalize3({ x: demon.pos.x - p.pos.x, y: demon.pos.y - p.pos.y + 0.5, z: demon.pos.z - p.pos.z });
      const force = GARG.WING_GUST_FORCE * (1 - d / GARG.WING_GUST_RANGE);
      demon.vel.x += dir.x * force; demon.vel.y += dir.y * force + 5; demon.vel.z += dir.z * force;
      if (demon.behavior === "climbing") { demon.behavior = "approaching"; demon.pos.y = Math.max(0.5, demon.pos.y - 2); }
      if (demon.behavior === "charging") { demon.behavior = "approaching"; demon.chargeTimer = 0; }
      gustHits++;
    });
    spawnParticles(state, p.pos, 15, "impact", 0xccddff, 8, 0.6);
    state.pendingGustRing = true;
    flashScreen(state, "rgba(130,180,255,0.1)", 0.1, 0.2);
    if (gustHits > 0) addScreenShake(state, 0.2, 0.15);
  }

  // Consecrate: R (if unlocked)
  if (state.keys.has("r") && p.consecrateLevel > 0 && p.consecrateCD <= 0) {
    p.consecrateCD = GARG.CONSECRATE_COOLDOWN * cdMult;
    state.keys.delete("r");
    state.stats.abilitiesUsed++;
    const dmg = GARG.CONSECRATE_DAMAGE * (1 + (p.consecrateLevel - 1) * 0.4) * comboMult * furyMult;
    const radius = GARG.CONSECRATE_RADIUS;

    // Damage all demons near cathedral center
    state.demons.forEach(demon => {
      if (demon.behavior === "dead") return;
      const d = distXZ(demon.pos, { x: 0, y: 0, z: 0 });
      if (d > radius) return;
      const falloff = 1 - d / radius;
      damageDemon(state, demon, dmg * falloff);
      spawnDamageNumber(state, demon.pos, dmg * falloff, 0xffdd44, false);
      demon.vel.y += 8 * falloff;
    });

    // Heal cathedral
    const healAmt = GARG.CONSECRATE_HEAL * p.consecrateLevel;
    state.cathedral.hp = Math.min(state.cathedral.maxHp, state.cathedral.hp + healAmt);

    // Holy explosion particles
    for (let i = 0; i < 50; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * radius;
      state.particles.push({
        pos: { x: Math.cos(angle) * r, y: 1 + Math.random() * 5, z: Math.sin(angle) * r },
        vel: { x: 0, y: 5 + Math.random() * 5, z: 0 },
        life: 1.0, maxLife: 1.0, color: 0xffdd44, size: 0.3 + Math.random() * 0.3, type: "holy",
      });
    }
    addScreenShake(state, 0.3, 0.3);
    state.pendingConsecrateRing = true;
    flashScreen(state, "rgba(255,220,60,0.15)", 0.15, 0.4);
    addNotification(state, `Consecrate! +${healAmt} cathedral HP`, 0xffdd44);
  }

  // Stone Skin: Tab (panic button — invulnerable but immobile)
  if (state.keys.has("tab") && p.stoneSkinCD <= 0 && p.stoneSkinTimer <= 0) {
    state.keys.delete("tab");
    p.stoneSkinCD = GARG.STONE_SKIN_COOLDOWN;
    p.stoneSkinTimer = GARG.STONE_SKIN_DURATION;
    p.vel = { x: 0, y: 0, z: 0 };
    state.stats.abilitiesUsed++;
    spawnParticles(state, p.pos, 20, "stone", 0xaabbcc, 4, 0.8);
    addNotification(state, "Stone Skin!", 0xaabbcc);
  }

  // While stone skin is active: invulnerable, can't move
  if (p.stoneSkinTimer > 0) {
    p.invincibleTimer = Math.max(p.invincibleTimer, 0.1);
    p.vel = { x: 0, y: 0, z: 0 };
    // Stone particles
    if (state.tick % 6 === 0) {
      spawnParticles(state, p.pos, 2, "stone", 0x99aabb, 1.5, 0.5);
    }
  }
}

// ---- Demon Logic ----

function damageDemon(state: GargoyleState, demon: Demon, damage: number): void {
  const bloodMoonMult = state.waveModifier === "blood_moon" ? 2 : 1;
  const diffMult = getDiffMult(state);
  demon.hp -= damage;
  state.stats.damageDealt += damage;
  demon.hitFlash = 0.15;
  state.stats.damageDealt += damage;

  if (demon.hp <= 0 && demon.behavior !== "dead") {
    demon.behavior = "dead"; demon.deathTimer = 2.0;
    state.demonsKilled++; state.totalKills++;
    addCombo(state);

    // Proximity kill bonus
    const d = dist3(demon.pos, state.player.pos);
    const closeBonus = d < GARG.CLOSE_KILL_RANGE ? (1 + GARG.CLOSE_KILL_SOUL_BONUS) : 1;
    if (d < GARG.CLOSE_KILL_RANGE) state.stats.closeKills++;

    const soulMap: Record<DemonType, number> = {
      imp: GARG.SOUL_PER_IMP, fiend: GARG.SOUL_PER_FIEND, brute: GARG.SOUL_PER_BRUTE,
      wraith: GARG.SOUL_PER_WRAITH, hellion: GARG.SOUL_PER_HELLION,
      necromancer: GARG.SOUL_PER_WRAITH + 2,
    };
    const soulValue = Math.ceil(soulMap[demon.type] * getComboSoulBonus(state) * bloodMoonMult * closeBonus * diffMult.soulMult);
    state.stats.soulsEarned += soulValue;
    const orbCount = Math.min(soulValue, 5);
    const valuePerOrb = soulValue / orbCount;
    for (let i = 0; i < orbCount; i++) spawnSoulOrb(state, demon.pos, valuePerOrb);

    // Health orbs from big kills
    if (demon.type === "brute" && Math.random() < GARG.HEALTH_ORB_CHANCE_BRUTE) {
      spawnHealthOrb(state, demon.pos, GARG.HEALTH_ORB_HEAL);
    }
    if (demon.type === "hellion" && Math.random() < GARG.HEALTH_ORB_CHANCE_HELLION) {
      spawnHealthOrb(state, demon.pos, GARG.HEALTH_ORB_HEAL * 2);
      spawnHealthOrb(state, demon.pos, GARG.HEALTH_ORB_HEAL);
    }

    spawnParticles(state, demon.pos, 10, "soul", 0x8844ff, 5, 1.2);
    spawnParticles(state, demon.pos, 6, "fire", 0xff4422, 3, 0.6);

    // Track objective progress
    if (state.objective.active) {
      if (state.objective.type === "kills" || state.objective.type === "speed_kills") {
        state.objective.progress++;
        if (state.objective.progress >= state.objective.target) completeObjective(state);
      }
      if (state.objective.type === "close_kills" && d < GARG.CLOSE_KILL_RANGE) {
        state.objective.progress++;
        if (state.objective.progress >= state.objective.target) completeObjective(state);
      }
    }
  }
}

export function updateDemons(state: GargoyleState, dt: number): void {
  const catCenter: Vec3 = { x: 0, y: 0, z: 0 };
  const p = state.player;
  const toRemove: string[] = [];

  // Pre-compute imp positions for pack bonus
  const impPositions: Vec3[] = [];
  state.demons.forEach(d => { if (d.type === "imp" && d.behavior !== "dead" && d.behavior !== "stunned") impPositions.push(d.pos); });

  state.demons.forEach((demon, id) => {
    demon.hitFlash = Math.max(0, demon.hitFlash - dt);
    demon.bobPhase += dt * demon.speed * 2;

    if (demon.behavior === "dead") {
      demon.deathTimer -= dt; demon.pos.y -= dt * 2;
      if (demon.deathTimer <= 0) toRemove.push(id);
      return;
    }
    if (demon.behavior === "stunned") {
      demon.stunTimer -= dt;
      if (demon.stunTimer <= 0) demon.behavior = "approaching";
      return;
    }

    demon.attackTimer = Math.max(0, demon.attackTimer - dt);

    // --- Imp pack speed bonus ---
    let speedMult = 1;
    if (demon.type === "imp") {
      let nearbyImps = 0;
      for (const ip of impPositions) {
        if (ip !== demon.pos && dist3(demon.pos, ip) < GARG.IMP_PACK_RANGE) {
          nearbyImps++;
          if (nearbyImps >= 3) break;
        }
      }
      speedMult = 1 + nearbyImps * GARG.IMP_PACK_SPEED_BONUS;
    }

    // Physics
    if (!demon.flying && demon.behavior !== "charging") {
      demon.vel.y += GARG.GRAVITY * dt;
      demon.vel.x *= 0.9; demon.vel.z *= 0.9;
      demon.pos.x += demon.vel.x * dt;
      demon.pos.y += demon.vel.y * dt;
      demon.pos.z += demon.vel.z * dt;
      if (demon.pos.y < 0.5) { demon.pos.y = 0.5; demon.vel.y = 0; }
    } else if (demon.flying) {
      demon.vel.x *= 0.95; demon.vel.y *= 0.95; demon.vel.z *= 0.95;
      demon.pos.x += demon.vel.x * dt;
      demon.pos.y += demon.vel.y * dt;
      demon.pos.z += demon.vel.z * dt;
      if (demon.pos.y < 2) demon.pos.y = 2;
    }

    const hw = GARG.CATHEDRAL_WIDTH / 2 + 2;
    const hl = GARG.CATHEDRAL_LENGTH / 2 + 2;
    const nearCathedral = Math.abs(demon.pos.x) < hw && Math.abs(demon.pos.z) < hl;
    const distToPlayer = dist3(demon.pos, p.pos);
    const distToCathedral = distXZ(demon.pos, catCenter);

    // --- Hellion specials ---
    if (demon.type === "hellion") {
      demon.slamCD = Math.max(0, demon.slamCD - dt);
      demon.fireCD = Math.max(0, demon.fireCD - dt);
      if (demon.slamCD <= 0 && distToPlayer < GARG.HELLION_SLAM_RADIUS && p.action !== "frozen") {
        demon.slamCD = GARG.HELLION_SLAM_CD;
        spawnParticles(state, demon.pos, 25, "fire", 0xff4400, 8, 0.8);
        spawnParticles(state, demon.pos, 15, "debris", 0x553322, 6, 0.6);
        addScreenShake(state, 0.4, 0.4);
        const falloff = 1 - distToPlayer / GARG.HELLION_SLAM_RADIUS;
        if (falloff > 0) damagePlayer(state, GARG.HELLION_SLAM_DAMAGE * falloff);
      }
      if (demon.fireCD <= 0 && distToPlayer < GARG.HELLION_FIRE_RANGE && distToPlayer > 3 && p.action !== "frozen") {
        demon.fireCD = GARG.HELLION_FIRE_CD;
        const dir = normalize3({ x: p.pos.x - demon.pos.x, y: p.pos.y - demon.pos.y, z: p.pos.z - demon.pos.z });
        for (let i = 0; i < 30; i++) {
          const spread = (Math.random() - 0.5) * 0.4;
          const speed = 8 + Math.random() * 8;
          state.particles.push({
            pos: { ...demon.pos, y: demon.pos.y + 1 }, vel: {
              x: (dir.x + Math.cos(spread) * 0.2) * speed,
              y: (dir.y + (Math.random() - 0.5) * 0.2) * speed,
              z: (dir.z + Math.sin(spread) * 0.2) * speed,
            }, life: 0.8, maxLife: 0.8,
            color: [0xff4400, 0xff6600, 0xffaa00][Math.floor(Math.random() * 3)],
            size: 0.3 + Math.random() * 0.3, type: "fire",
          });
        }
        const toP = normalize3({ x: p.pos.x - demon.pos.x, y: p.pos.y - demon.pos.y, z: p.pos.z - demon.pos.z });
        if (toP.x * dir.x + toP.y * dir.y + toP.z * dir.z > 0.7) {
          damagePlayer(state, GARG.HELLION_FIRE_DAMAGE);
          addScreenShake(state, 0.3, 0.2);
        }
      }
    }

    // --- Fiend fireball ---
    if (demon.type === "fiend") {
      demon.fireballCD = Math.max(0, demon.fireballCD - dt);
      if (demon.fireballCD <= 0 && distToPlayer < GARG.FIEND_FIREBALL_RANGE
        && p.pos.y > GARG.FIEND_FIREBALL_MIN_HEIGHT && p.action !== "frozen"
        && (demon.behavior === "approaching" || demon.behavior === "attacking" || demon.behavior === "climbing")) {
        demon.fireballCD = GARG.FIEND_FIREBALL_CD;
        const dir = normalize3({ x: p.pos.x - demon.pos.x, y: p.pos.y - demon.pos.y, z: p.pos.z - demon.pos.z });
        state.projectiles.push({
          id: genGargoyleId(state), type: "fireball", ownerId: demon.id,
          pos: { x: demon.pos.x, y: demon.pos.y + 1, z: demon.pos.z },
          vel: { x: dir.x * GARG.FIEND_FIREBALL_SPEED, y: dir.y * GARG.FIEND_FIREBALL_SPEED, z: dir.z * GARG.FIEND_FIREBALL_SPEED },
          damage: GARG.FIEND_FIREBALL_DAMAGE, life: GARG.PROJECTILE_LIFE,
        });
        spawnParticles(state, demon.pos, 4, "fire", 0xff6600, 2, 0.3);
      }
    }

    // --- Brute charge ---
    if (demon.type === "brute") {
      demon.chargeCD = Math.max(0, demon.chargeCD - dt);

      if (demon.behavior === "charging") {
        demon.chargeTimer -= dt;
        demon.pos.x += demon.chargeDir.x * GARG.BRUTE_CHARGE_SPEED * dt;
        demon.pos.z += demon.chargeDir.z * GARG.BRUTE_CHARGE_SPEED * dt;
        demon.rotation = Math.atan2(demon.chargeDir.x, demon.chargeDir.z);

        // Charge trail
        if (state.tick % 3 === 0) spawnParticles(state, demon.pos, 2, "debris", 0x553322, 2, 0.3);

        // Hit cathedral
        if (nearCathedral) {
          state.cathedral.hp -= GARG.DEMON_CATHEDRAL_DAMAGE * GARG.BRUTE_CHARGE_DAMAGE_MULT * getDiffMult(state).demonDmg;
          spawnParticles(state, demon.pos, 12, "debris", 0x887766, 6, 0.8);
          addScreenShake(state, 0.35, 0.3);
          demon.behavior = "approaching"; demon.chargeTimer = 0;
          demon.vel = { x: -demon.chargeDir.x * 3, y: 2, z: -demon.chargeDir.z * 3 };
        }

        // Hit player
        if (distToPlayer < 3 && p.action !== "frozen") {
          damagePlayer(state, demon.damage * 1.5);
        }

        if (demon.chargeTimer <= 0) demon.behavior = "approaching";
        return;
      }

      // Initiate charge when approaching and not too close
      if (demon.chargeCD <= 0 && demon.behavior === "approaching" && distToCathedral > 15 && distToCathedral < 50) {
        demon.chargeCD = GARG.BRUTE_CHARGE_CD;
        demon.behavior = "charging";
        demon.chargeTimer = GARG.BRUTE_CHARGE_DURATION;
        demon.chargeDir = normalize3({ x: -demon.pos.x, y: 0, z: -demon.pos.z });
        spawnParticles(state, demon.pos, 6, "impact", 0xcc6622, 3, 0.5);
      }
    }

    // --- Necromancer behavior ---
    if (demon.type === "necromancer") {
      demon.resurrectCD = Math.max(0, demon.resurrectCD - dt);

      // Stay at distance from cathedral
      if (distToCathedral < GARG.NECRO_KEEP_DISTANCE) {
        // Back away
        const away = normalize3({ x: demon.pos.x, y: 0, z: demon.pos.z });
        demon.pos.x += away.x * demon.speed * dt;
        demon.pos.z += away.z * demon.speed * dt;
        demon.rotation = Math.atan2(away.x, away.z);
      } else if (distToCathedral > GARG.NECRO_KEEP_DISTANCE + 10) {
        // Approach
        const toC = normalize3({ x: -demon.pos.x, y: 0, z: -demon.pos.z });
        demon.pos.x += toC.x * demon.speed * dt;
        demon.pos.z += toC.z * demon.speed * dt;
        demon.rotation = Math.atan2(toC.x, toC.z);
      }

      // Resurrect nearby dead demons
      if (demon.resurrectCD <= 0 && demon.behavior !== "casting") {
        let targetDemon: Demon | null = null;
        state.demons.forEach(d => {
          if (d.behavior === "dead" && d.deathTimer > 0.5 && d.type !== "necromancer" && d.type !== "hellion") {
            if (dist3(demon.pos, d.pos) < GARG.NECRO_RESURRECT_RANGE && !targetDemon) {
              targetDemon = d;
            }
          }
        });
        if (targetDemon) {
          demon.behavior = "casting";
          demon.castTimer = 1.5;
          demon.resurrectCD = GARG.NECRO_RESURRECT_CD;
          spawnParticles(state, demon.pos, 10, "soul", 0x44ff88, 3, 0.8);
        }
      }

      // Casting resurrect
      if (demon.behavior === "casting") {
        demon.castTimer -= dt;
        if (state.tick % 4 === 0) spawnParticles(state, demon.pos, 2, "soul", 0x44ff88, 2, 0.5);
        if (demon.castTimer <= 0) {
          demon.behavior = "approaching";
          // Find the nearest dead demon and resurrect it
          let best: Demon | null = null;
          let bestDist = Infinity;
          state.demons.forEach(d => {
            if (d.behavior === "dead" && d.type !== "necromancer" && d.type !== "hellion") {
              const dd = dist3(demon.pos, d.pos);
              if (dd < GARG.NECRO_RESURRECT_RANGE && dd < bestDist) { best = d; bestDist = dd; }
            }
          });
          if (best) {
            const b = best as Demon;
            b.behavior = "approaching";
            b.hp = b.maxHp * GARG.NECRO_RESURRECT_HP_MULT;
            b.deathTimer = 0;
            b.stunTimer = 0;
            b.hitFlash = 0.3;
            spawnParticles(state, b.pos, 15, "portal", 0x44ff88, 5, 1.0);
            addNotification(state, "A demon has been resurrected!", 0x44ff88);
          }
        }
      }

      // Flee from player if close
      if (distToPlayer < 8 && p.action !== "frozen") {
        const away = normalize3({ x: demon.pos.x - p.pos.x, y: 0, z: demon.pos.z - p.pos.z });
        demon.pos.x += away.x * demon.speed * 1.5 * dt;
        demon.pos.z += away.z * demon.speed * 1.5 * dt;
      }

      // Chase player if very close (attack)
      if (distToPlayer < GARG.DEMON_ATTACK_RANGE && demon.attackTimer <= 0) {
        demon.attackTimer = GARG.DEMON_ATTACK_COOLDOWN;
        damagePlayer(state, demon.damage);
      }
      return;
    }

    // --- Retreating behavior (low HP) ---
    if (demon.behavior === "retreating") {
      const away = normalize3({ x: demon.pos.x, y: 0, z: demon.pos.z });
      demon.pos.x += away.x * demon.speed * 1.2 * dt;
      demon.pos.z += away.z * demon.speed * 1.2 * dt;
      demon.rotation = Math.atan2(away.x, away.z);
      // Stop retreating after getting far enough
      if (distToCathedral > 40) demon.behavior = "approaching";
      return;
    }

    // Low HP retreat check (non-brute, non-hellion)
    if (demon.hp < demon.maxHp * 0.2 && demon.type !== "brute" && demon.type !== "hellion" && Math.random() < 0.01) {
      demon.behavior = "retreating";
    }

    // --- Wraith zigzag ---
    if (demon.flying) {
      const zigzag = Math.sin(state.gameTime * 3 + demon.bobPhase) * 2;
      const target = p.action !== "frozen" && distToPlayer < 30 ? p.pos : { x: 0, y: GARG.CATHEDRAL_HEIGHT * 0.6, z: 0 };
      const toTarget = normalize3({ x: target.x - demon.pos.x, y: target.y - demon.pos.y, z: target.z - demon.pos.z });
      const perpX = -toTarget.z, perpZ = toTarget.x;
      demon.pos.x += (toTarget.x + perpX * zigzag * 0.1) * demon.speed * dt;
      demon.pos.y += toTarget.y * demon.speed * dt;
      demon.pos.z += (toTarget.z + perpZ * zigzag * 0.1) * demon.speed * dt;
      demon.rotation = Math.atan2(toTarget.x, toTarget.z);

      if (distToPlayer < GARG.DEMON_ATTACK_RANGE && demon.attackTimer <= 0) {
        demon.attackTimer = GARG.DEMON_ATTACK_COOLDOWN; damagePlayer(state, demon.damage);
      }
      if (nearCathedral && demon.pos.y > 3 && demon.attackTimer <= 0) {
        demon.attackTimer = GARG.DEMON_ATTACK_COOLDOWN;
        state.cathedral.hp -= GARG.DEMON_CATHEDRAL_DAMAGE * getDiffMult(state).demonDmg;
        spawnParticles(state, demon.pos, 3, "debris", 0x887766, 2, 0.4);
      }
      return;
    }

    // Ground behavior
    const effectiveSpeed = demon.speed * speedMult;
    switch (demon.behavior) {
      case "approaching": {
        const toC = normalize3({ x: -demon.pos.x, y: 0, z: -demon.pos.z });
        demon.pos.x += toC.x * effectiveSpeed * dt;
        demon.pos.z += toC.z * effectiveSpeed * dt;
        demon.rotation = Math.atan2(toC.x, toC.z);
        if (nearCathedral || distToCathedral < hw) {
          demon.behavior = "climbing";
          demon.targetY = GARG.CATHEDRAL_HEIGHT * (0.3 + Math.random() * 0.7);
        }
        break;
      }
      case "climbing": {
        demon.pos.y += GARG.DEMON_CLIMB_SPEED * dt; demon.vel.y = 0;
        if (demon.pos.y >= demon.targetY) demon.behavior = "attacking";
        if (distToPlayer < 5 && p.action !== "frozen") demon.behavior = "chasing";
        break;
      }
      case "attacking": {
        if (demon.attackTimer <= 0) {
          demon.attackTimer = GARG.DEMON_ATTACK_COOLDOWN;
          state.cathedral.hp -= GARG.DEMON_CATHEDRAL_DAMAGE * getDiffMult(state).demonDmg;
          spawnParticles(state, demon.pos, 4, "debris", 0x887766, 2, 0.4);
        }
        if (distToPlayer < 8 && p.action !== "frozen") demon.behavior = "chasing";
        break;
      }
      case "chasing": {
        const toP = normalize3({ x: p.pos.x - demon.pos.x, y: p.pos.y - demon.pos.y, z: p.pos.z - demon.pos.z });
        demon.pos.x += toP.x * effectiveSpeed * 1.3 * dt;
        demon.pos.z += toP.z * effectiveSpeed * 1.3 * dt;
        demon.rotation = Math.atan2(toP.x, toP.z);
        if (distToPlayer < GARG.DEMON_ATTACK_RANGE && demon.attackTimer <= 0) {
          demon.attackTimer = GARG.DEMON_ATTACK_COOLDOWN; damagePlayer(state, demon.damage);
        }
        if (distToPlayer > 20 || p.action === "frozen") demon.behavior = "approaching";
        break;
      }
    }
  });

  for (const id of toRemove) state.demons.delete(id);
}

function damagePlayer(state: GargoyleState, damage: number): void {
  const p = state.player;
  if (p.invincibleTimer > 0 || state.deathSequenceTimer > 0 || p.hp <= 0) return;
  let reduction = GARG.STONE_ARMOR + p.armorLevel * 0.1;
  // Wall perch armor buff
  if (p.perchBuffType === "wall") reduction += GARG.PERCH_WALL_ARMOR;
  const finalDmg = damage * (1 - Math.min(reduction, 0.85)); // cap at 85% DR
  p.hp -= finalDmg;
  p.invincibleTimer = 0.3;
  state.stats.damageTaken += finalDmg;
  addScreenShake(state, 0.25, 0.2);
  flashScreen(state, "rgba(255,40,20,0.2)", 0.2, 0.3);
  // Reset no_damage objective
  if (state.objective.active && state.objective.type === "no_damage") {
    state.objective.progress = 0;
  }
  if (p.hp <= 0) {
    p.hp = 0;
    if (state.deathSequenceTimer <= 0) {
      // Start death slow-mo
      state.deathSequenceTimer = GARG.DEATH_SLOW_MO_DURATION;
      state.hitStopTimer = GARG.DEATH_SLOW_MO_DURATION;
      state.hitStopScale = GARG.DEATH_SLOW_MO_SCALE;
      addScreenShake(state, 0.5, 0.5);
      spawnParticles(state, p.pos, 30, "stone", 0x888899, 8, 1.5);
      spawnParticles(state, p.pos, 15, "debris", 0x556677, 6, 1.0);
    }
  }
}

// ---- Projectiles ----

export function updateProjectiles(state: GargoyleState, dt: number): void {
  const p = state.player;
  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const proj = state.projectiles[i];
    proj.life -= dt;
    if (proj.life <= 0) { state.projectiles.splice(i, 1); continue; }

    proj.pos.x += proj.vel.x * dt;
    proj.pos.y += proj.vel.y * dt;
    proj.pos.z += proj.vel.z * dt;

    // Trail particles
    if (state.tick % 2 === 0) {
      state.particles.push({
        pos: { ...proj.pos }, vel: { x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2, z: (Math.random() - 0.5) * 2 },
        life: 0.3, maxLife: 0.3, color: 0xff6600, size: 0.15, type: "fire",
      });
    }

    // Hit player
    if (p.action !== "frozen" && dist3(proj.pos, p.pos) < 1.5) {
      damagePlayer(state, proj.damage);
      spawnParticles(state, proj.pos, 6, "fire", 0xff4400, 4, 0.5);
      state.projectiles.splice(i, 1);
      continue;
    }

    // Hit ground
    if (proj.pos.y < 0.5) {
      spawnParticles(state, proj.pos, 4, "fire", 0xff4400, 2, 0.3);
      state.projectiles.splice(i, 1);
    }
  }
}

// ---- Soul Orbs ----

export function updateSoulOrbs(state: GargoyleState, dt: number): void {
  const p = state.player;
  for (let i = state.soulOrbs.length - 1; i >= 0; i--) {
    const orb = state.soulOrbs[i];
    orb.life -= dt;
    if (orb.life <= 0) { state.soulOrbs.splice(i, 1); continue; }

    orb.vel.y -= 6 * dt; orb.vel.x *= 0.96; orb.vel.z *= 0.96;
    if (orb.pos.y < 0.5) { orb.pos.y = 0.5; orb.vel.y = Math.abs(orb.vel.y) * 0.4; }

    const d = dist3(orb.pos, p.pos);
    if (d < GARG.SOUL_ORB_ATTRACT_RANGE || orb.attracted) {
      orb.attracted = true;
      const dir = normalize3({ x: p.pos.x - orb.pos.x, y: p.pos.y - orb.pos.y, z: p.pos.z - orb.pos.z });
      const speed = GARG.SOUL_ORB_SPEED * (1 + (GARG.SOUL_ORB_ATTRACT_RANGE - Math.min(d, GARG.SOUL_ORB_ATTRACT_RANGE)) / GARG.SOUL_ORB_ATTRACT_RANGE);
      orb.vel.x = dir.x * speed; orb.vel.y = dir.y * speed; orb.vel.z = dir.z * speed;
    }
    orb.pos.x += orb.vel.x * dt; orb.pos.y += orb.vel.y * dt; orb.pos.z += orb.vel.z * dt;

    if (d < GARG.SOUL_ORB_COLLECT_RANGE) {
      p.soulEssence += Math.ceil(orb.value); state.soulOrbs.splice(i, 1);
      spawnParticles(state, orb.pos, 3, "soul", 0xbb66ff, 2, 0.3);
    }
  }
}

// ---- Health Orbs ----

export function updateHealthOrbs(state: GargoyleState, dt: number): void {
  const p = state.player;
  for (let i = state.healthOrbs.length - 1; i >= 0; i--) {
    const orb = state.healthOrbs[i];
    orb.life -= dt;
    if (orb.life <= 0) { state.healthOrbs.splice(i, 1); continue; }

    orb.vel.y -= 8 * dt; orb.vel.x *= 0.95; orb.vel.z *= 0.95;
    if (orb.pos.y < 0.5) { orb.pos.y = 0.5; orb.vel.y = Math.abs(orb.vel.y) * 0.3; }
    orb.pos.x += orb.vel.x * dt; orb.pos.y += orb.vel.y * dt; orb.pos.z += orb.vel.z * dt;

    const d = dist3(orb.pos, p.pos);
    if (d < 2.5) {
      const healed = Math.min(orb.heal, p.maxHp - p.hp);
      p.hp += healed;
      if (healed > 0) {
        spawnParticles(state, orb.pos, 6, "heal", 0x44ff44, 3, 0.5);
        spawnDamageNumber(state, orb.pos, healed, 0x44ff44, false);
        flashScreen(state, "rgba(40,255,60,0.12)", 0.12, 0.25);
      }
      state.healthOrbs.splice(i, 1);
    }
  }
}

// ---- Damage Numbers ----

export function updateDamageNumbers(state: GargoyleState, dt: number): void {
  for (let i = state.damageNumbers.length - 1; i >= 0; i--) {
    state.damageNumbers[i].timer -= dt;
    state.damageNumbers[i].pos.y += dt * 3;
    if (state.damageNumbers[i].timer <= 0) state.damageNumbers.splice(i, 1);
  }
}

// ---- Staggered Spawning ----

export function updateSpawnQueue(state: GargoyleState, dt: number): void {
  if (state.spawnQueue.length === 0) return;
  state.spawnTimer -= dt;
  if (state.spawnTimer > 0) return;
  state.spawnTimer = GARG.SPAWN_INTERVAL;
  const batch = Math.min(GARG.SPAWN_BATCH_SIZE, state.spawnQueue.length);
  for (let i = 0; i < batch; i++) {
    const entry = state.spawnQueue.shift();
    if (!entry) break;
    spawnSingleDemon(state, entry.type);
  }
}

function spawnSingleDemon(state: GargoyleState, type: DemonType): void {
  const wave = state.wave;
  const angle = Math.random() * Math.PI * 2;
  const radius = GARG.DEMON_SPAWN_RADIUS + Math.random() * 20;
  const pos: Vec3 = {
    x: Math.cos(angle) * radius,
    y: type === "wraith" ? 10 + Math.random() * 15 : 0.5,
    z: Math.sin(angle) * radius,
  };
  const stats: Record<DemonType, { hp: number; damage: number; speed: number }> = {
    imp: { hp: GARG.IMP_HP, damage: GARG.IMP_DAMAGE, speed: GARG.IMP_SPEED },
    fiend: { hp: GARG.FIEND_HP, damage: GARG.FIEND_DAMAGE, speed: GARG.FIEND_SPEED },
    brute: { hp: GARG.BRUTE_HP, damage: GARG.BRUTE_DAMAGE, speed: GARG.BRUTE_SPEED },
    wraith: { hp: GARG.WRAITH_HP, damage: GARG.WRAITH_DAMAGE, speed: GARG.WRAITH_SPEED },
    hellion: { hp: GARG.HELLION_HP, damage: GARG.HELLION_DAMAGE, speed: GARG.HELLION_SPEED },
    necromancer: { hp: GARG.NECRO_HP, damage: GARG.NECRO_DAMAGE, speed: GARG.NECRO_SPEED },
  };
  const s = stats[type];
  const diff = getDiffMult(state);
  const hpScale = (1 + (wave - 1) * 0.1) * diff.demonHp;
  const dmgScale = (1 + (wave - 1) * GARG.DEMON_DAMAGE_SCALE) * diff.demonDmg;

  const id = genGargoyleId(state);
  state.demons.set(id, {
    id, type, pos, vel: { x: 0, y: 0, z: 0 },
    rotation: Math.atan2(-pos.x, -pos.z),
    hp: s.hp * hpScale, maxHp: s.hp * hpScale, damage: s.damage * dmgScale, speed: s.speed,
    behavior: "approaching", attackTimer: 0, stunTimer: 0, deathTimer: 0, targetY: 0,
    flying: type === "wraith", colorVariant: Math.floor(Math.random() * 3),
    hitFlash: 0, bobPhase: Math.random() * Math.PI * 2,
    slamCD: GARG.HELLION_SLAM_CD * 0.5, fireCD: GARG.HELLION_FIRE_CD * 0.5,
    fireballCD: GARG.FIEND_FIREBALL_CD * (0.5 + Math.random()),
    chargeCD: GARG.BRUTE_CHARGE_CD * (0.3 + Math.random() * 0.5),
    chargeTimer: 0, chargeDir: { x: 0, y: 0, z: 0 },
    resurrectCD: GARG.NECRO_RESURRECT_CD * (0.3 + Math.random() * 0.5),
    castTimer: 0,
  });
  spawnParticles(state, pos, 8, "portal", type === "necromancer" ? 0x44ff88 : 0xff2244, 3, 1.0);
}

// ---- Wave Spawning ----

function pickWaveModifier(wave: number): WaveModifier {
  if (wave < GARG.MODIFIER_START_WAVE) return "none";
  const mods: WaveModifier[] = ["none", "blood_moon", "fog_night", "siege", "swarm", "spirit"];
  // Higher waves = more likely to get a modifier
  if (Math.random() < 0.3 + wave * 0.02) {
    return mods[1 + Math.floor(Math.random() * (mods.length - 1))];
  }
  return "none";
}

export function spawnWave(state: GargoyleState): void {
  state.wave++;
  const wave = state.wave;

  // Pick wave modifier
  state.waveModifier = pickWaveModifier(wave);
  const mod = state.waveModifier;

  const diff = getDiffMult(state);
  let totalDemons = Math.ceil((GARG.WAVE_BASE_DEMONS + (wave - 1) * GARG.WAVE_DEMON_SCALE) * diff.demonCount);
  if (mod === "blood_moon") totalDemons = Math.ceil(totalDemons * 1.5);
  if (mod === "swarm") totalDemons = Math.ceil(totalDemons * 1.8);

  addNotification(state, `Night ${wave} — ${totalDemons} demons approach!`, 0xff4444);
  state.waveTitle = { text: `NIGHT ${wave}`, timer: 3.0, color: mod === "blood_moon" ? "#ff2222" : mod === "spirit" ? "#8844ff" : "#9966ff" };
  if (mod !== "none") {
    addNotification(state, WAVE_MODIFIER_NAMES[mod], WAVE_MODIFIER_COLORS[mod]);
  }

  const queue: SpawnEntry[] = [];
  let remaining = totalDemons;

  if (wave % GARG.BOSS_EVERY_N_WAVES === 0) {
    const bossCount = Math.floor(wave / GARG.BOSS_EVERY_N_WAVES);
    for (let i = 0; i < bossCount; i++) { queue.push({ type: "hellion", delay: 0 }); remaining--; }
    addNotification(state, "A HELLION emerges from the abyss!", 0xff0000);
  }

  // Modifier-specific compositions
  if (mod === "siege") {
    // All brutes
    for (let i = 0; i < remaining; i++) queue.push({ type: "brute", delay: 0 });
    remaining = 0;
  } else if (mod === "swarm") {
    // All imps
    for (let i = 0; i < remaining; i++) queue.push({ type: "imp", delay: 0 });
    remaining = 0;
  } else if (mod === "spirit") {
    // All wraiths
    for (let i = 0; i < remaining; i++) queue.push({ type: "wraith", delay: 0 });
    remaining = 0;
  } else {
    // Normal composition
    if (wave >= GARG.NECRO_START_WAVE) {
      const c = Math.min(Math.max(1, Math.floor(remaining * 0.08)), remaining);
      for (let i = 0; i < c; i++) { queue.push({ type: "necromancer", delay: 0 }); remaining--; }
    }
    if (wave >= GARG.WRAITH_START_WAVE) {
      const c = Math.min(Math.floor(remaining * 0.2), remaining);
      for (let i = 0; i < c; i++) { queue.push({ type: "wraith", delay: 0 }); remaining--; }
    }
    if (wave >= GARG.BRUTE_START_WAVE) {
      const c = Math.min(Math.floor(remaining * 0.15), remaining);
      for (let i = 0; i < c; i++) { queue.push({ type: "brute", delay: 0 }); remaining--; }
    }
    for (let i = 0; i < remaining; i++) {
      queue.push({ type: Math.random() < 0.4 ? "imp" : "fiend", delay: 0 });
    }
  }

  // Shuffle
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }

  const immediate = Math.min(GARG.SPAWN_BATCH_SIZE + 2, queue.length);
  for (let i = 0; i < immediate; i++) spawnSingleDemon(state, queue.shift()!.type);

  state.spawnQueue = queue;
  state.spawnTimer = GARG.SPAWN_INTERVAL;

  // Generate objective for milestone waves
  generateObjective(state);
}

// ---- Particles ----

export function updateParticles(state: GargoyleState, dt: number): void {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.life -= dt;
    if (p.life <= 0) { state.particles.splice(i, 1); continue; }
    p.pos.x += p.vel.x * dt; p.pos.y += p.vel.y * dt; p.pos.z += p.vel.z * dt;

    if (p.type === "soul" || p.type === "heal") { p.vel.y -= 1 * dt; p.vel.x *= 0.95; p.vel.z *= 0.95; }
    else if (p.type === "speed_line" || p.type === "trail") { /* fade only */ }
    else if (p.type === "portal") { p.vel.y += 2 * dt; p.vel.x *= 0.9; p.vel.z *= 0.9; }
    else if (p.type === "holy") { p.vel.y -= 2 * dt; p.vel.x *= 0.95; p.vel.z *= 0.95; }
    else { p.vel.y -= 5 * dt; p.vel.x *= 0.98; p.vel.z *= 0.98; }
  }
}

// ---- Notifications ----

export function updateNotifications(state: GargoyleState, dt: number): void {
  for (let i = state.notifications.length - 1; i >= 0; i--) {
    state.notifications[i].timer -= dt;
    if (state.notifications[i].timer <= 0) state.notifications.splice(i, 1);
  }
}

// ---- Wave Objectives ----

export function generateObjective(state: GargoyleState): void {
  if (state.wave % GARG.OBJECTIVE_INTERVAL !== 0 || state.wave === 0) {
    state.objective.active = false;
    return;
  }
  const types: Array<{ type: "kills" | "speed_kills" | "close_kills" | "no_damage"; desc: string; target: number; timer: number }> = [
    { type: "kills", desc: "Kill 10 demons this night", target: 10, timer: 0 },
    { type: "speed_kills", desc: "Kill 5 demons in 15 seconds", target: 5, timer: 15 },
    { type: "close_kills", desc: "Get 4 close-range kills", target: 4, timer: 0 },
    { type: "no_damage", desc: "Take no damage for 20 seconds", target: 20, timer: 20 },
  ];
  const pick = types[Math.floor(Math.random() * types.length)];
  const reward = GARG.OBJECTIVE_REWARD_BASE + state.wave;
  state.objective = {
    description: pick.desc,
    progress: 0,
    target: pick.target,
    reward,
    active: true,
    type: pick.type,
    timer: pick.timer,
  };
  addNotification(state, `Objective: ${pick.desc} (+${reward} souls)`, 0xffcc44);
}

export function updateObjective(state: GargoyleState, dt: number): void {
  const obj = state.objective;
  if (!obj.active) return;

  switch (obj.type) {
    case "no_damage":
      // Timer counts up while not taking damage; resets on hit (tracked via damagePlayer)
      obj.progress += dt;
      if (obj.progress >= obj.target) {
        completeObjective(state);
      }
      break;
    case "speed_kills":
      if (obj.timer > 0) {
        obj.timer -= dt;
        if (obj.timer <= 0 && obj.progress < obj.target) {
          // Failed
          obj.active = false;
          addNotification(state, "Objective failed!", 0xff4444);
        }
      }
      break;
    // kills and close_kills tracked in damageDemon
  }
}

function completeObjective(state: GargoyleState): void {
  const obj = state.objective;
  state.player.soulEssence += obj.reward;
  state.stats.soulsEarned += obj.reward;
  addNotification(state, `Objective Complete! +${obj.reward} souls`, 0x44ff44);
  obj.active = false;
}

// ---- Tutorial Tips ----

export function initTutorialTips(state: GargoyleState): void {
  if (state.tutorialShown) return;
  state.tutorialShown = true;
  state.tutorialTips = [
    "WASD to fly, Space/Ctrl to ascend/descend",
    "LMB = Talon Strike, RMB = Stone Breath, Q = Dive Bomb",
    "Press E near the cathedral to perch and regenerate",
    "Find a perch before dawn or you'll take fall damage!",
    "X = Dash (iframes!), F = Wing Gust (knockback)",
  ];
}

// ---- Cathedral Bell ----

export function updateCathedralBell(state: GargoyleState): void {
  state.stats.cathedralDamage = Math.round(state.cathedral.maxHp - state.cathedral.hp);
  const hpPct = state.cathedral.hp / state.cathedral.maxHp;
  for (let i = 0; i < GARG.BELL_HP_THRESHOLDS.length; i++) {
    if (hpPct <= GARG.BELL_HP_THRESHOLDS[i] && !state.bellTriggered[i]) {
      state.bellTriggered[i] = true;
      // Stun all nearby demons
      state.demons.forEach(demon => {
        if (demon.behavior === "dead") return;
        const d = distXZ(demon.pos, { x: 0, y: 0, z: 0 });
        if (d < GARG.BELL_STUN_RADIUS) {
          demon.stunTimer = GARG.BELL_STUN_DURATION;
          demon.behavior = "stunned";
        }
      });
      spawnParticles(state, { x: 0, y: GARG.CATHEDRAL_HEIGHT, z: 0 }, 30, "holy", 0xffdd88, 10, 1.5);
      addScreenShake(state, 0.3, 0.4);
      addNotification(state, "The Cathedral Bell tolls!", 0xffdd44);
    }
  }
}

// ---- Reinforcements ----

export function updateReinforcements(state: GargoyleState, dt: number): void {
  if (state.phase !== "night" || state.wave < 3) return;
  state.reinforcementTimer -= dt;
  if (state.reinforcementTimer > 0) return;
  state.reinforcementTimer = GARG.REINFORCEMENT_CHECK_INTERVAL;

  if (Math.random() < GARG.REINFORCEMENT_CHANCE + state.wave * 0.01) {
    const count = GARG.REINFORCEMENT_COUNT + Math.floor(state.wave / 3);
    const types: DemonType[] = ["imp", "fiend"];
    if (state.wave >= GARG.BRUTE_START_WAVE) types.push("brute");
    if (state.wave >= GARG.WRAITH_START_WAVE) types.push("wraith");

    for (let i = 0; i < count; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      state.spawnQueue.push({ type, delay: 0 });
    }
    addNotification(state, `Reinforcements! +${count} demons!`, 0xff6644);
  }
}

// ---- Dawn Enrage ----

function applyDawnEnrage(state: GargoyleState): void {
  state.demons.forEach(demon => {
    if (demon.behavior === "dead" || demon.behavior === "stunned") return;
    demon.speed *= 1.4;
    demon.damage *= 1.3;
  });
}

// ---- Phase Logic ----

export function updatePhase(state: GargoyleState, dt: number): void {
  // Death sequence → game over after slow-mo ends
  if (state.deathSequenceTimer > 0) {
    state.deathSequenceTimer -= dt;
    if (state.deathSequenceTimer <= 0) {
      state.phase = "game_over";
      state.bestWave = Math.max(state.bestWave, state.wave);
    }
    return; // freeze phase transitions during death
  }

  state.phaseTimer -= dt;

  switch (state.phase) {
    case "night": {
      let allDead = true;
      state.demons.forEach(d => { if (d.behavior !== "dead") allDead = false; });
      const queueEmpty = state.spawnQueue.length === 0;

      if (state.phaseTimer <= 0 || (allDead && queueEmpty && state.demons.size > 0 && state.wave > 0)) {
        state.phase = "dawn"; state.phaseTimer = GARG.DAWN_DURATION;
        addNotification(state, "Dawn approaches... find a perch!", 0xffcc44);
        applyDawnEnrage(state);
      }
      if (state.cathedral.hp <= 0) {
        state.cathedral.hp = 0; state.phase = "game_over";
        state.bestWave = Math.max(state.bestWave, state.wave);
        addNotification(state, "The cathedral has fallen!", 0xff0000);
      }
      break;
    }
    case "dawn": {
      if (state.phaseTimer <= 0) {
        // Mid-air freeze penalty: if not perched, take fall damage
        if (state.player.action !== "perched") {
          const fallHeight = state.player.pos.y - 1.5;
          if (fallHeight > 3) {
            const fallDmg = fallHeight * 1.5;
            state.player.hp -= fallDmg;
            addNotification(state, `Petrified mid-flight! -${Math.round(fallDmg)} HP`, 0xff6644);
            if (state.player.hp <= 0) {
              state.player.hp = 0; state.phase = "game_over";
              state.bestWave = Math.max(state.bestWave, state.wave);
              break;
            }
          }
          // Drop to ground
          state.player.pos.y = 1.5;
        }
        state.phase = "day"; state.phaseTimer = GARG.DAY_DURATION;
        state.player.action = "frozen"; state.player.vel = { x: 0, y: 0, z: 0 };
        state.demons.clear(); state.spawnQueue = []; state.projectiles = [];
        state.waveModifier = "none";
        addNotification(state, "Daylight... you turn to stone", 0xffeeaa);
      }
      break;
    }
    case "day": {
      if (state.phaseTimer <= 0) {
        state.phase = "dusk"; state.phaseTimer = GARG.DUSK_DURATION;
        addNotification(state, "Darkness falls... you awaken!", 0x6644cc);
        flashScreen(state, "rgba(100,60,200,0.2)", 0.2, 0.6);
      }
      break;
    }
    case "dusk": {
      if (state.phaseTimer <= 0) {
        state.phase = "night"; state.phaseTimer = getNightDuration(state.wave + 1);
        state.player.action = "perched";
        state.reinforcementTimer = GARG.REINFORCEMENT_CHECK_INTERVAL;
        // Tutorial on first night + apply difficulty cathedral HP
        if (state.wave === 0) {
          initTutorialTips(state);
          const catHpMult = getDiffMult(state).cathedralHp;
          state.cathedral.maxHp = Math.round(GARG.CATHEDRAL_HP * catHpMult);
          state.cathedral.hp = state.cathedral.maxHp;
        }
        state.player.hp = Math.min(state.player.maxHp, state.player.hp + 20);
        state.player.stamina = state.player.maxStamina;
        state.player.combo = 0;
        state.demonsKilled = 0;

        // Cathedral repair: base + fortify upgrade
        const fortifyHeal = 30 + state.player.fortifyLevel * 25;
        state.cathedral.hp = Math.min(state.cathedral.maxHp, state.cathedral.hp + fortifyHeal);

        spawnWave(state);
      }
      break;
    }
  }
}

export { addNotification };
