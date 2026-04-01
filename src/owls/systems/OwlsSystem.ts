// ---------------------------------------------------------------------------
// Owls: Night Hunter — game systems (all simulation logic)
// ---------------------------------------------------------------------------

import { OWL } from "../config/OwlsConfig";
import type { OwlsState, Prey, PreyType, OwlParticle } from "../state/OwlsState";
import { nextPreyId, nextOrbId } from "../state/OwlsState";

// ---- Helpers ----
function dist2(ax: number, az: number, bx: number, bz: number): number {
  const dx = ax - bx, dz = az - bz;
  return Math.sqrt(dx * dx + dz * dz);
}
function dist3(ax: number, ay: number, az: number, bx: number, by: number, bz: number): number {
  const dx = ax - bx, dy = ay - by, dz = az - bz;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : v > hi ? hi : v; }
function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }

function spawnParticles(
  state: OwlsState, count: number, x: number, y: number, z: number,
  spread: number, color: number, type: OwlParticle["type"], life = 1.5, size = 0.3,
) {
  for (let i = 0; i < count; i++) {
    state.particles.push({
      x: x + (Math.random() - 0.5) * spread,
      y: y + (Math.random() - 0.5) * spread,
      z: z + (Math.random() - 0.5) * spread,
      vx: (Math.random() - 0.5) * 6,
      vy: Math.random() * 4 + 1,
      vz: (Math.random() - 0.5) * 6,
      life, maxLife: life, size, color, type,
    });
  }
}

function addCameraShake(state: OwlsState, intensity: number): void {
  state.cameraShakeIntensity = Math.max(state.cameraShakeIntensity, intensity);
}

function getDiffMult(state: OwlsState) { return OWL.DIFFICULTY[state.difficulty]; }
function getWaveMod(state: OwlsState) { return OWL.WAVE_MODIFIERS[state.waveModifierIndex]; }

function hasActiveBuff(state: OwlsState, id: string): boolean {
  return state.activeBuff !== null && state.activeBuff.id === id && state.activeBuff.timer > 0;
}

// ---- Player Movement ----
export function updateOwl(state: OwlsState, dt: number): void {
  const p = state.player;
  const sens = 0.002 * OWL.TURN_RATE;

  // Mouse look
  let yawDelta = 0;
  if (state.pointerLocked) {
    yawDelta = -state.mouseDX * sens;
    p.yaw += yawDelta;
    p.pitch -= state.mouseDY * sens;
    p.pitch = clamp(p.pitch, OWL.PITCH_MIN, OWL.PITCH_MAX);
  }
  state.mouseDX = 0;
  state.mouseDY = 0;

  // Bank angle
  let bankTarget = clamp(yawDelta * 15, -OWL.BANK_MAX, OWL.BANK_MAX);
  if (state.keys.has("a")) bankTarget = Math.min(bankTarget + OWL.BANK_MAX * 0.7, OWL.BANK_MAX);
  if (state.keys.has("d")) bankTarget = Math.max(bankTarget - OWL.BANK_MAX * 0.7, -OWL.BANK_MAX);
  p.bankAngle = lerp(p.bankAngle, bankTarget, dt * OWL.BANK_LERP);

  // Speed upgrades + swiftness buff (additive, not multiplicative)
  const upgradeSpeedBonus = p.upgrades.swift * 0.15;
  const buffSpeedBonus = hasActiveBuff(state, "swiftness") ? 0.4 : 0;
  const speedMult = 1 + upgradeSpeedBonus + buffSpeedBonus;
  const baseSpeed = OWL.FLY_SPEED * speedMult;
  const maxSpeed = OWL.FLY_SPEED_MAX * speedMult;

  // Barrel roll
  if (p.barrelRollCooldown > 0) p.barrelRollCooldown -= dt;
  if (state.keys.has("q") && p.barrelRollTimer <= 0 && p.barrelRollCooldown <= 0 && p.stamina >= OWL.BARREL_ROLL_STAMINA) {
    p.barrelRollTimer = OWL.BARREL_ROLL_DURATION;
    p.barrelRollCooldown = OWL.BARREL_ROLL_COOLDOWN;
    p.barrelRollAngle = 0;
    p.stamina -= OWL.BARREL_ROLL_STAMINA;
    spawnParticles(state, 8, p.x, p.y, p.z, 2, 0xaabb99, "feather", 1.5, 0.2);
    state.keys.delete("q");
  }
  if (p.barrelRollTimer > 0) {
    p.barrelRollTimer -= dt;
    p.barrelRollAngle = (1 - p.barrelRollTimer / OWL.BARREL_ROLL_DURATION) * Math.PI * 2;
  }

  // Diving
  const wantDive = state.keys.has(" ") && p.stamina > 0 && p.pitch < -0.2;
  if (wantDive && !p.isDiving) {
    p.isDiving = true;
    p.stamina -= OWL.DIVE_STAMINA_COST;
  }
  if (p.isDiving) {
    p.speed = Math.min(p.speed + OWL.DIVE_ACCEL * dt, OWL.DIVE_SPEED * speedMult);
    if (p.pitch > -0.1 || p.y <= OWL.MIN_HEIGHT + 1) p.isDiving = false;
  } else {
    if (p.speed > baseSpeed) p.speed = Math.max(p.speed - OWL.DIVE_ACCEL * 0.5 * dt, baseSpeed);
  }

  // Silent glide
  const silentDrainMult = 1 - p.upgrades.silent * 0.25;
  p.isSilentGlide = state.keys.has("shift") && p.stamina > 0 && !p.isDiving;
  if (p.isSilentGlide) {
    p.stamina -= OWL.SILENT_GLIDE_DRAIN * silentDrainMult * dt;
    p.speed = Math.max(p.speed * 0.97, baseSpeed * 0.6);
  }

  // WASD
  if (state.keys.has("w")) p.speed = Math.min(p.speed + 15 * dt, maxSpeed);
  if (state.keys.has("s")) p.speed = Math.max(p.speed - 20 * dt, baseSpeed * 0.4);

  // Direction
  const cosP = Math.cos(p.pitch), sinP = Math.sin(p.pitch);
  const cosY = Math.cos(p.yaw), sinY = Math.sin(p.yaw);
  const dirX = sinY * cosP, dirY = sinP, dirZ = cosY * cosP;

  // Banking
  const bankForce = 12;
  if (state.keys.has("a")) {
    p.vx += Math.cos(p.yaw + Math.PI / 2) * bankForce * dt;
    p.vz += -Math.sin(p.yaw + Math.PI / 2) * bankForce * dt;
  }
  if (state.keys.has("d")) {
    p.vx += Math.cos(p.yaw - Math.PI / 2) * bankForce * dt;
    p.vz += -Math.sin(p.yaw - Math.PI / 2) * bankForce * dt;
  }

  p.vx = dirX * p.speed;
  p.vy = dirY * p.speed;
  p.vz = dirZ * p.speed;

  if (!p.isDiving) {
    const liftForce = p.pitch > -0.1 ? OWL.LIFT : OWL.LIFT * 0.3;
    p.vy += (liftForce - OWL.GRAVITY) * dt;
    p.vy = clamp(p.vy, -OWL.DIVE_SPEED, OWL.FLY_SPEED_MAX * 0.5);
  }

  p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
  p.y = clamp(p.y, OWL.MIN_HEIGHT, OWL.MAX_HEIGHT);

  // Arena boundary
  const distFromCenter = dist2(p.x, p.z, 0, 0);
  if (distFromCenter > OWL.ARENA_RADIUS - 20) {
    const push = (distFromCenter - (OWL.ARENA_RADIUS - 20)) * 0.1;
    p.x += (-p.x / distFromCenter) * push;
    p.z += (-p.z / distFromCenter) * push;
  }

  // Stamina regen
  if (!p.isSilentGlide && !p.isDiving) {
    p.stamina = Math.min(p.stamina + OWL.STAMINA_REGEN * dt, OWL.STAMINA_MAX);
  }
  p.stamina = Math.max(p.stamina, 0);

  // HP regen (delayed after damage)
  p.lastHitTimer += dt;
  p.invulnTimer = Math.max(0, p.invulnTimer - dt);
  if (p.lastHitTimer > OWL.HP_REGEN_DELAY && p.hp < OWL.HP_MAX) {
    p.hp = Math.min(p.hp + OWL.HP_REGEN * dt, OWL.HP_MAX);
  }

  // Screech cooldown
  if (p.screechCooldown > 0) p.screechCooldown -= dt;

  // Combo decay
  if (p.combo > 0) {
    p.comboTimer -= dt;
    if (p.comboTimer <= 0) { p.combo = 0; p.comboTimer = 0; }
  }

  // Wing animation
  if (p.isDiving) {
    p.wingAngle = lerp(p.wingAngle, OWL.WING_DIVE_ANGLE, dt * 6);
    p.wingPhase += dt * OWL.WING_FLAP_SPEED * 0.3;
  } else if (p.isSilentGlide) {
    p.wingAngle = lerp(p.wingAngle, OWL.WING_GLIDE_ANGLE, dt * 4);
    p.wingPhase += dt * OWL.WING_FLAP_SPEED * 0.5;
  } else {
    p.wingAngle = lerp(p.wingAngle, 0, dt * 4);
    p.wingPhase += dt * OWL.WING_FLAP_SPEED;
  }

  // Wing trail particles
  p.wingTrailTimer -= dt;
  if (p.wingTrailTimer <= 0 && p.speed > OWL.FLY_SPEED * 0.8) {
    p.wingTrailTimer = OWL.WING_TRAIL_RATE;
    const leftX = Math.cos(p.yaw + Math.PI / 2);
    const leftZ = -Math.sin(p.yaw + Math.PI / 2);
    const wingSpan = 2;
    for (const side of [-1, 1]) {
      state.particles.push({
        x: p.x + leftX * side * wingSpan,
        y: p.y + 0.2,
        z: p.z + leftZ * side * wingSpan,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        vz: (Math.random() - 0.5) * 0.5,
        life: 0.8, maxLife: 0.8, size: 0.15,
        color: p.isSilentGlide ? 0x4488ff : 0xccaa77,
        type: "wing_trail",
      });
    }
  }

  // Speed lines when diving fast
  if (p.isDiving && p.speed > OWL.DIVE_SPEED * 0.7 && Math.random() < 0.4) {
    state.particles.push({
      x: p.x + (Math.random() - 0.5) * 9,
      y: p.y + (Math.random() - 0.5) * 6,
      z: p.z + (Math.random() - 0.5) * 9,
      vx: -p.vx * 0.3, vy: -p.vy * 0.3, vz: -p.vz * 0.3,
      life: 0.3, maxLife: 0.3, size: 0.1, color: 0xaaccff, type: "speed_line",
    });
  }
}

// ---- Damage Helper ----
function damageOwl(state: OwlsState, amount: number): void {
  const p = state.player;
  if (p.invulnTimer > 0 || p.barrelRollTimer > 0) return; // barrel roll = invuln
  const diff = getDiffMult(state);
  const dmg = amount * diff.damageMult;
  p.hp -= dmg;
  p.invulnTimer = OWL.INVULN_DURATION;
  p.lastHitTimer = 0;
  state.screenFlash = 0.3;
  state.screenFlashColor = "#ff2222";
  addCameraShake(state, OWL.CAMERA_SHAKE_TREE_HIT);
  if (p.hp <= 0) {
    p.hp = 0;
    state.phase = "game_over";
    state.bestWave = Math.max(state.bestWave, state.wave);
    state.notifications.push({ text: "YOUR OWL HAS FALLEN!", color: "#ff4444", timer: 4, y: 0 });
  }
}

// ---- Abilities ----
export function useAbilities(state: OwlsState): void {
  const p = state.player;

  if (state.keys.has("e") && p.screechCooldown <= 0 && p.stamina >= OWL.SCREECH_STAMINA_COST) {
    p.stamina -= OWL.SCREECH_STAMINA_COST;
    p.screechCooldown = OWL.SCREECH_COOLDOWN;
    state.pendingScreechRing = true;

    const screechRadiusMult = 1 + p.upgrades.screech * 0.3;
    const radius = OWL.SCREECH_RADIUS * screechRadiusMult;

    for (const prey of state.prey.values()) {
      if (prey.state === "caught") continue;
      const d = dist3(p.x, p.y, p.z, prey.x, prey.y, prey.z);
      if (d < radius) {
        prey.state = "stunned";
        prey.stunTimer = OWL.SCREECH_STUN_DURATION;
        prey.vx = 0; prey.vz = 0;
      }
    }

    spawnParticles(state, 20, p.x, p.y, p.z, 3, 0x88aaff, "stun_ring", 1.0, 0.5);
    state.notifications.push({ text: "SCREECH!", color: "#88aaff", timer: 1.5, y: 0 });
    addCameraShake(state, OWL.CAMERA_SHAKE_SCREECH);
    state.keys.delete("e");
  }
}

// ---- Prey AI ----
export function updatePrey(state: OwlsState, dt: number): void {
  const p = state.player;
  const diff = getDiffMult(state);
  const waveMod = getWaveMod(state);
  const detectMult = p.isSilentGlide ? OWL.SILENT_GLIDE_DETECT_MULT : 1;
  const frozen = hasActiveBuff(state, "timestop");

  for (const prey of state.prey.values()) {
    if (prey.state === "caught") {
      prey.catchAnim += dt * 3;
      prey.x = lerp(prey.x, p.x, dt * 8);
      prey.y = lerp(prey.y, p.y, dt * 8);
      prey.z = lerp(prey.z, p.z, dt * 8);
      if (prey.catchAnim >= 1) state.prey.delete(prey.id);
      continue;
    }

    // Frozen night buff — all prey frozen
    if (frozen) {
      prey.vx = 0; prey.vz = 0;
      continue;
    }

    if (prey.state === "stunned") {
      prey.stunTimer -= dt;
      if (prey.stunTimer <= 0) { prey.state = "roaming"; prey.stunTimer = 0; }
      prey.y = (prey.type === "moth" ? 5 : 0.2) + Math.sin(state.gameTime * 6) * 0.15;
      continue;
    }

    const def = OWL.PREY_TYPES[prey.type];
    const distToOwl = dist3(p.x, p.y, p.z, prey.x, prey.y, prey.z);
    const detectRadius = 30 * def.awareness * detectMult * diff.awarenessMult * waveMod.awarenessMult;

    if (prey.state === "roaming" && distToOwl < detectRadius) {
      prey.state = "alert";
      prey.alertTimer = 0.8;
      // Alert pulse visual
      state.alertPulses.push({ x: prey.x, y: prey.y + 0.5, z: prey.z, timer: 0.6, maxTimer: 0.6 });
      _herdAlert(state, prey);
    }
    if (prey.state === "alert") {
      prey.alertTimer -= dt;
      if (prey.alertTimer <= 0) prey.state = "fleeing";
      if (distToOwl > detectRadius * 1.5) prey.state = "roaming";
    }

    const speedMult = diff.preySpeedMult * waveMod.preySpeedMult;
    if (prey.state === "roaming") {
      prey.roamTimer -= dt;
      if (prey.roamTimer <= 0) {
        prey.roamAngle += (Math.random() - 0.5) * 2;
        prey.roamTimer = 1 + Math.random() * 3;
      }
      prey.vx = Math.cos(prey.roamAngle) * def.speed * speedMult;
      prey.vz = Math.sin(prey.roamAngle) * def.speed * speedMult;
    } else if (prey.state === "fleeing") {
      const dx = prey.x - p.x, dz = prey.z - p.z;
      const fleeAngle = Math.atan2(dz, dx);
      prey.vx = Math.cos(fleeAngle) * def.fleeSpeed * speedMult;
      prey.vz = Math.sin(fleeAngle) * def.fleeSpeed * speedMult;
      // Silent glide makes prey lose track sooner
      const fleeLoseDist = p.isSilentGlide ? detectRadius * 1.3 : detectRadius * 2;
      if (distToOwl > fleeLoseDist) prey.state = "roaming";
    }

    prey.x += prey.vx * dt;
    prey.z += prey.vz * dt;

    // Height per type
    if (prey.type === "frog") {
      prey.hopTimer -= dt;
      if (prey.hopTimer <= 0) { prey.hopTimer = 0.4 + Math.random() * 0.8; prey.y = 0.2; }
      else if (prey.hopTimer > 0.15) prey.y = 0.2 + Math.sin((1 - prey.hopTimer / 0.5) * Math.PI) * 0.8;
      else prey.y = 0.2;
    } else if (prey.type === "moth") {
      prey.y = 5 + Math.sin(state.gameTime * 1.5 + prey.x * 0.1) * 3;
    } else {
      prey.y = 0.2;
    }

    // Arena boundary
    const pd = dist2(prey.x, prey.z, 0, 0);
    if (pd > OWL.ARENA_RADIUS - 5) {
      prey.roamAngle = Math.atan2(-prey.z, -prey.x);
      prey.vx = Math.cos(prey.roamAngle) * def.speed * speedMult;
      prey.vz = Math.sin(prey.roamAngle) * def.speed * speedMult;
    }

    // Tree avoidance
    for (const tree of state.trees) {
      const td = dist2(prey.x, prey.z, tree.x, tree.z);
      if (td < tree.trunkRadius + 1.5) {
        prey.x += ((prey.x - tree.x) / td) * 2 * dt;
        prey.z += ((prey.z - tree.z) / td) * 2 * dt;
      }
    }
  }
}

function _herdAlert(state: OwlsState, alertedPrey: Prey): void {
  for (const other of state.prey.values()) {
    if (other.id === alertedPrey.id || other.state !== "roaming") continue;
    const d = dist2(alertedPrey.x, alertedPrey.z, other.x, other.z);
    if (d < OWL.HERD_ALERT_RADIUS) {
      other.state = "alert";
      other.alertTimer = 0.3 + Math.random() * 0.5;
    }
  }
}

// ---- Catch Detection ----
export function checkCatches(state: OwlsState): void {
  const p = state.player;
  const diff = getDiffMult(state);
  const magnetBuff = hasActiveBuff(state, "magnet") ? 2 : 1;
  const frenzyBuff = hasActiveBuff(state, "frenzy") ? 2 : 1;
  const keenMult = 1 + p.upgrades.keen * 0.2;
  const talonSpeedMult = 1 - p.upgrades.talons * 0.2;
  const catchRadius = OWL.CATCH_RADIUS * keenMult * (p.isDiving ? OWL.DIVE_CATCH_BONUS : 1) * magnetBuff;
  const minSpeed = OWL.CATCH_SPEED_MIN * talonSpeedMult;

  if (p.speed < minSpeed) return;

  let nearestMissDist = Infinity;

  for (const prey of state.prey.values()) {
    if (prey.state === "caught") continue;
    const d = dist3(p.x, p.y, p.z, prey.x, prey.y, prey.z);

    if (d < catchRadius) {
      prey.state = "caught";
      prey.catchAnim = 0;
      const def = OWL.PREY_TYPES[prey.type];

      p.combo++;
      p.comboTimer = OWL.COMBO_DECAY_TIME;
      p.bestCombo = Math.max(p.bestCombo, p.combo);
      const comboMult = 1 + (p.combo - 1) * OWL.COMBO_MULTIPLIER;
      const points = Math.round(def.points * comboMult * diff.scoreMult * frenzyBuff);
      p.score += points;
      p.totalCaught++;
      state.preyCaughtThisWave++;

      state.pendingCatchFlash = { x: prey.x, y: prey.y, z: prey.z };
      state.scorePopups.push({ x: prey.x, y: prey.y + 2, z: prey.z, value: points, timer: 2, combo: p.combo });
      // More dramatic particles — scale with combo
      const pCount = 12 + Math.min(p.combo * 2, 20);
      spawnParticles(state, pCount, prey.x, prey.y, prey.z, 2 + p.combo * 0.3, 0xffdd44, "catch_sparkle", 1.2, 0.4);

      state.hitStopTimer = OWL.HIT_STOP_DURATION;
      state.hitStopScale = OWL.HIT_STOP_SCALE;
      addCameraShake(state, OWL.CAMERA_SHAKE_CATCH + p.combo * 0.3);
      state.screenFlash = 0.3;
      state.screenFlashColor = p.combo >= 5 ? "#ff44ff" : "#ffdd44";

      if (p.combo >= OWL.STREAK_BONUS_THRESHOLD && p.combo % OWL.STREAK_BONUS_THRESHOLD === 0) {
        p.score += OWL.STREAK_BONUS_POINTS;
        state.notifications.push({ text: `${p.combo}x STREAK! +${OWL.STREAK_BONUS_POINTS}`, color: "#ffaa00", timer: 2, y: 0 });
      }

      _herdAlert(state, prey);
    } else if (d < OWL.NEAR_MISS_RADIUS && d < nearestMissDist) {
      nearestMissDist = d;
    }
  }

  if (nearestMissDist < OWL.NEAR_MISS_RADIUS && nearestMissDist > catchRadius && state.nearMissTimer <= 0) {
    state.nearMissTimer = 1.5;
    state.notifications.push({ text: "SO CLOSE!", color: "#ff8844", timer: 1, y: 0 });
  }
}

// ---- Moonlight Orbs ----
export function updateOrbs(state: OwlsState, dt: number): void {
  const p = state.player;

  // Spawn orbs periodically during hunting
  if (state.phase === "hunting") {
    state.orbSpawnTimer -= dt;
    if (state.orbSpawnTimer <= 0) {
      const diff2 = getDiffMult(state);
      state.orbSpawnTimer = OWL.ORB_SPAWN_INTERVAL * (0.8 + Math.random() * 0.4) * diff2.orbMult;
      const typeIdx = Math.floor(Math.random() * OWL.ORB_TYPES.length);
      const angle = Math.random() * Math.PI * 2;
      const r = OWL.CLEARING_RADIUS + Math.random() * (OWL.ARENA_RADIUS * 0.6);
      state.orbs.push({
        id: nextOrbId(),
        typeIndex: typeIdx,
        x: Math.cos(angle) * r,
        y: OWL.ORB_FLOAT_HEIGHT,
        z: Math.sin(angle) * r,
        life: OWL.ORB_LIFETIME,
        collected: false,
        collectAnim: 0,
        bobPhase: Math.random() * Math.PI * 2,
      });
    }
  }

  // Update existing orbs
  for (let i = state.orbs.length - 1; i >= 0; i--) {
    const orb = state.orbs[i];
    if (orb.collected) {
      orb.collectAnim += dt * 4;
      orb.y += dt * 8;
      if (orb.collectAnim >= 1) { state.orbs.splice(i, 1); continue; }
      continue;
    }

    orb.life -= dt;
    if (orb.life <= 0) { state.orbs.splice(i, 1); continue; }

    // Bob animation
    orb.bobPhase += dt * 2;
    orb.y = OWL.ORB_FLOAT_HEIGHT + Math.sin(orb.bobPhase) * 0.5;

    // Collection check
    const d = dist3(p.x, p.y, p.z, orb.x, orb.y, orb.z);
    if (d < OWL.ORB_COLLECT_RADIUS) {
      orb.collected = true;
      orb.collectAnim = 0;
      const orbType = OWL.ORB_TYPES[orb.typeIndex];

      // Apply buff
      if (orbType.id === "restore") {
        // Instant heal
        p.hp = Math.min(p.hp + 40, OWL.HP_MAX);
        state.notifications.push({ text: "HP RESTORED!", color: "#44ff44", timer: 2, y: 0 });
        spawnParticles(state, 15, p.x, p.y, p.z, 3, 0x44ff44, "catch_sparkle", 1, 0.4);
      } else {
        // Timed buff — replaces current
        state.activeBuff = {
          id: orbType.id,
          name: orbType.name,
          color: orbType.color,
          timer: orbType.duration,
          maxTimer: orbType.duration,
        };
        state.notifications.push({ text: orbType.name + "!", color: "#" + orbType.color.toString(16).padStart(6, "0"), timer: 2, y: 0 });
      }

      state.screenFlash = 0.2;
      state.screenFlashColor = "#" + orbType.color.toString(16).padStart(6, "0");
      spawnParticles(state, 10, orb.x, orb.y, orb.z, 2, orbType.color, "moonbeam", 1.5, 0.5);
    }
  }

  // Update active buff timer
  if (state.activeBuff) {
    state.activeBuff.timer -= dt;
    if (state.activeBuff.timer <= 0) {
      state.activeBuff = null;
    }
  }
}

// ---- Alert Pulses ----
export function updateAlertPulses(state: OwlsState, dt: number): void {
  for (let i = state.alertPulses.length - 1; i >= 0; i--) {
    const ap = state.alertPulses[i];
    ap.timer -= dt;
    if (ap.timer <= 0) state.alertPulses.splice(i, 1);
  }
}

// ---- Wave Spawning ----
export function spawnWave(state: OwlsState): void {
  state.wave++;
  state.preyCaughtThisWave = 0;
  state.player.waveScoreStart = state.player.score;
  state.player.bestCombo = 0;

  const diff = getDiffMult(state);

  // Wave modifier
  state.waveModifierIndex = state.wave <= 1 ? 0 : 1 + Math.floor(Math.random() * (OWL.WAVE_MODIFIERS.length - 1));
  const waveMod = getWaveMod(state);

  // Logarithmic prey scaling — linear up to wave 10, then log curve, capped
  const linearPrey = OWL.WAVE_BASE_PREY + (state.wave - 1) * OWL.WAVE_PREY_INCREMENT;
  const logPrey = state.wave <= 10 ? linearPrey
    : OWL.WAVE_BASE_PREY + 9 * OWL.WAVE_PREY_INCREMENT + Math.round(OWL.WAVE_PREY_INCREMENT * 3 * Math.log2(state.wave - 9));
  const totalPrey = Math.min(Math.round(logPrey * waveMod.preyCountMult), OWL.WAVE_PREY_CAP);
  state.preyTotalThisWave = totalPrey;
  state.quota = Math.ceil(totalPrey * diff.quotaMult);
  state.nightTimer = (OWL.NIGHT_DURATION + (state.wave - 1) * OWL.NIGHT_EXTENSION_PER_WAVE) * diff.timerMult;
  state.dawnProgress = 0;
  state.gracePeriod = false;
  state.gracePeriodTimer = 0;
  state.tutorialWave = state.wave === 1;

  state.prey.clear();
  state.orbs = [];
  state.orbSpawnTimer = OWL.ORB_SPAWN_INTERVAL * 0.3 * diff.orbMult;

  // Reset screech cooldown between waves
  state.player.screechCooldown = 0;
  state.player.barrelRollCooldown = 0;

  const types: PreyType[] = [];
  if (state.wave >= 1) types.push("mouse");
  if (state.wave >= 2) types.push("vole");
  if (state.wave >= 3) types.push("rabbit");
  if (state.wave >= 3) types.push("frog");
  if (state.wave >= 4) types.push("moth");

  for (let i = 0; i < totalPrey; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const angle = Math.random() * Math.PI * 2;
    const r = OWL.CLEARING_RADIUS * 0.5 + Math.random() * (OWL.ARENA_RADIUS * 0.7);
    const id = nextPreyId();
    state.prey.set(id, {
      id, type,
      x: Math.cos(angle) * r, y: type === "moth" ? 5 + Math.random() * 8 : 0.2, z: Math.sin(angle) * r,
      vx: 0, vy: 0, vz: 0, state: "roaming",
      alertTimer: 0, stunTimer: 0, catchAnim: 0,
      roamAngle: Math.random() * Math.PI * 2,
      roamTimer: 1 + Math.random() * 3,
      hopTimer: Math.random() * 2,
    });
  }

  let waveText = `WAVE ${state.wave} — Hunt ${state.quota} prey!`;
  if (waveMod.id !== "none") waveText = `WAVE ${state.wave}: ${waveMod.name} — Hunt ${state.quota}!`;
  state.notifications.push({ text: waveText, color: waveMod.id === "none" ? "#ffcc44" : waveMod.color, timer: 3, y: 0 });
}

// ---- Fireflies ----
export function updateFireflies(state: OwlsState, dt: number): void {
  for (const f of state.fireflies) {
    f.vx += (Math.random() - 0.5) * 2 * dt;
    f.vy += (Math.random() - 0.5) * 1 * dt;
    f.vz += (Math.random() - 0.5) * 2 * dt;
    f.vx *= 0.98; f.vy *= 0.98; f.vz *= 0.98;
    f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt;
    f.y = clamp(f.y, 1, 20);
    f.phase += dt * (1.5 + Math.random() * 0.5);
    f.brightness = 0.3 + 0.7 * Math.max(0, Math.sin(f.phase));
    const d = dist2(f.x, f.z, 0, 0);
    if (d > OWL.ARENA_RADIUS * 0.85) { f.vx -= f.x * 0.01; f.vz -= f.z * 0.01; }
  }
}

// ---- Ambient Leaves ----
export function updateAmbientLeaves(state: OwlsState, dt: number): void {
  if (state.ambientLeaves.length < OWL.LEAF_COUNT && Math.random() < 0.3) {
    const tree = state.trees[Math.floor(Math.random() * state.trees.length)];
    const angle = Math.random() * Math.PI * 2;
    const r = tree.canopyRadius * Math.random();
    const leafColors = [0x2a4a2a, 0x3a5a2a, 0x4a6a3a, 0x6a4a2a, 0x8a5a2a];
    state.ambientLeaves.push({
      x: tree.x + Math.cos(angle) * r,
      y: tree.height * 0.85 + Math.random() * tree.canopyRadius,
      z: tree.z + Math.sin(angle) * r,
      vx: (Math.random() - 0.5) * 2, vy: -1 - Math.random() * 1.5, vz: (Math.random() - 0.5) * 2,
      spin: Math.random() * Math.PI * 2, spinSpeed: (Math.random() - 0.5) * 4,
      life: 5 + Math.random() * 5, maxLife: 10,
      size: 0.15 + Math.random() * 0.15,
      color: leafColors[Math.floor(Math.random() * leafColors.length)],
    });
  }
  for (let i = state.ambientLeaves.length - 1; i >= 0; i--) {
    const l = state.ambientLeaves[i];
    l.life -= dt;
    if (l.life <= 0 || l.y <= 0) { state.ambientLeaves.splice(i, 1); continue; }
    l.vx += Math.sin(state.gameTime * 2 + l.spin) * 0.5 * dt;
    l.vz += Math.cos(state.gameTime * 1.5 + l.spin) * 0.5 * dt;
    l.vx *= 0.99; l.vz *= 0.99;
    l.x += l.vx * dt; l.y += l.vy * dt; l.z += l.vz * dt;
    l.spin += l.spinSpeed * dt;
  }
}

// ---- Particles ----
export function updateParticles(state: OwlsState, dt: number): void {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.life -= dt;
    if (p.life <= 0) { state.particles.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    if (p.type !== "speed_line" && p.type !== "wing_trail") p.vy -= 4 * dt;
    p.vx *= 0.97; p.vz *= 0.97;
  }
}

// ---- Score Popups ----
export function updateScorePopups(state: OwlsState, dt: number): void {
  for (let i = state.scorePopups.length - 1; i >= 0; i--) {
    const sp = state.scorePopups[i];
    sp.timer -= dt; sp.y += 3 * dt;
    if (sp.timer <= 0) state.scorePopups.splice(i, 1);
  }
}

// ---- Notifications ----
export function updateNotifications(state: OwlsState, dt: number): void {
  for (let i = state.notifications.length - 1; i >= 0; i--) {
    const n = state.notifications[i];
    n.timer -= dt; n.y -= 20 * dt;
    if (n.timer <= 0) state.notifications.splice(i, 1);
  }
}

// ---- Shooting Stars ----
export function updateShootingStars(state: OwlsState, dt: number): void {
  state.shootingStarTimer -= dt;
  if (state.shootingStarTimer <= 0 && !state.shootingStar) {
    const angle = Math.random() * Math.PI * 2;
    state.shootingStar = {
      x: Math.cos(angle) * 200, y: 70 + Math.random() * 20, z: Math.sin(angle) * 200,
      vx: -Math.cos(angle) * 120 + (Math.random() - 0.5) * 40,
      vy: -10 - Math.random() * 10,
      vz: -Math.sin(angle) * 120 + (Math.random() - 0.5) * 40,
      life: 1.5 + Math.random(),
    };
    state.shootingStarTimer = 15 + Math.random() * 30;
  }
  if (state.shootingStar) {
    const s = state.shootingStar;
    s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
    s.life -= dt;
    if (s.life <= 0) state.shootingStar = null;
  }
}

// ---- Camera Shake ----
export function updateCameraShake(state: OwlsState, dt: number): void {
  if (state.cameraShakeIntensity > 0) {
    state.cameraShakeIntensity -= OWL.CAMERA_SHAKE_DECAY * dt;
    if (state.cameraShakeIntensity < 0) state.cameraShakeIntensity = 0;
    state.cameraShakeX = (Math.random() - 0.5) * state.cameraShakeIntensity;
    state.cameraShakeY = (Math.random() - 0.5) * state.cameraShakeIntensity;
  } else {
    state.cameraShakeX = 0; state.cameraShakeY = 0;
  }
}

// ---- Hit Stop ----
export function updateHitStop(state: OwlsState, dt: number): void {
  if (state.hitStopTimer > 0) {
    state.hitStopTimer -= dt;
    if (state.hitStopTimer <= 0) { state.hitStopTimer = 0; state.hitStopScale = 1; }
  }
}

// ---- Screen Effects ----
export function updateScreenEffects(state: OwlsState, dt: number): void {
  if (state.screenFlash > 0) state.screenFlash -= dt * 3;
  if (state.nearMissTimer > 0) state.nearMissTimer -= dt;
}

// ---- Dawn Transition ----
export function updateDawnProgress(state: OwlsState): void {
  if (state.phase === "hunting" && state.nightTimer < OWL.DAWN_WARNING_TIME) {
    state.dawnProgress = clamp(1 - state.nightTimer / OWL.DAWN_WARNING_TIME, 0, 1);
  } else if (state.phase === "game_over") {
    state.dawnProgress = clamp(state.dawnProgress + 0.005, 0, 1);
  } else {
    state.dawnProgress = 0;
  }
}

// ---- Phase Management ----
export function updatePhase(state: OwlsState, dt: number): void {
  if (state.phase === "hunting") {
    state.nightTimer -= dt;

    const aliveCount = [...state.prey.values()].filter(p => p.state !== "caught").length;
    if (aliveCount === 0 && state.preyCaughtThisWave >= state.quota) {
      const isPerfect = state.preyCaughtThisWave >= state.preyTotalThisWave;
      if (isPerfect) {
        state.player.score += OWL.PERFECT_WAVE_BONUS * state.wave;
        state.notifications.push({ text: `PERFECT HUNT! +${OWL.PERFECT_WAVE_BONUS * state.wave}`, color: "#ffaa00", timer: 2.5, y: 0 });
      } else {
        state.notifications.push({ text: "ALL PREY CAUGHT!", color: "#44ff88", timer: 2, y: 0 });
      }
      state.player.score += 100 * state.wave;
      _transitionToRest(state, isPerfect);
      return;
    }

    if (state.nightTimer <= 0) {
      if (state.preyCaughtThisWave >= state.quota) {
        _transitionToRest(state, false);
      } else if (!state.gracePeriod) {
        // Start grace period — a few more seconds to meet quota
        state.gracePeriod = true;
        state.gracePeriodTimer = OWL.GRACE_PERIOD;
        state.notifications.push({ text: "DAWN APPROACHES! HURRY!", color: "#ff8844", timer: 2, y: 0 });
      } else {
        state.gracePeriodTimer -= dt;
        if (state.preyCaughtThisWave >= state.quota) {
          // Made it during grace!
          state.notifications.push({ text: "JUST IN TIME!", color: "#44ff88", timer: 2, y: 0 });
          _transitionToRest(state, false);
        } else if (state.gracePeriodTimer <= 0) {
          state.phase = "game_over";
          state.bestWave = Math.max(state.bestWave, state.wave);
          state.notifications.push({ text: "DAWN BREAKS... THE HUNT IS OVER", color: "#ff4444", timer: 4, y: 0 });
        }
      }
    }
  }
}

function _transitionToRest(state: OwlsState, perfectWave: boolean): void {
  state.lastWaveStats = {
    caught: state.preyCaughtThisWave, total: state.preyTotalThisWave, perfectWave,
    modifier: OWL.WAVE_MODIFIERS[state.waveModifierIndex].name,
    scoreEarned: state.player.score - state.player.waveScoreStart,
    bestCombo: state.player.bestCombo,
  };
  state.phase = "rest";
  state.nightTimer = OWL.REST_DURATION;
  state.prey.clear();
  state.orbs = [];
  state.activeBuff = null;
  state.player.x = 0; state.player.y = 35; state.player.z = 0;
  state.player.speed = OWL.FLY_SPEED;
  state.player.isDiving = false;
  state.player.combo = 0; state.player.comboTimer = 0;
  // Heal some HP on rest
  state.player.hp = Math.min(state.player.hp + 30, OWL.HP_MAX);
  state.bestWave = Math.max(state.bestWave, state.wave);
}

export function startHunting(state: OwlsState): void {
  state.phase = "hunting";
  spawnWave(state);
}

// ---- Tree Collision ----
export function checkTreeCollisions(state: OwlsState): void {
  const p = state.player;
  for (const tree of state.trees) {
    if (p.y > tree.height + tree.canopyRadius) continue;
    if (p.y < tree.height * 0.8) {
      const d = dist2(p.x, p.z, tree.x, tree.z);
      if (d < tree.trunkRadius + 1.2) {
        const nx = (p.x - tree.x) / d;
        const nz = (p.z - tree.z) / d;
        p.x = tree.x + nx * (tree.trunkRadius + 1.3);
        p.z = tree.z + nz * (tree.trunkRadius + 1.3);
        p.speed *= 0.5;
        spawnParticles(state, 8, p.x, p.y, p.z, 1.5, 0x55aa44, "leaf", 1.5, 0.3);
        damageOwl(state, OWL.TREE_DAMAGE);
      }
    }
  }
}
