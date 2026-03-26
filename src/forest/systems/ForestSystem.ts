// ---------------------------------------------------------------------------
// Forest of Camelot — core game systems (improved)
// ---------------------------------------------------------------------------

import { FOREST } from "../config/ForestConfig";
import type {
  ForestState, Enemy, EnemyType, Vec3, ForestParticle, WaveModifier,
  Season, ChallengeType, ObjectiveType, BuffId,
} from "../state/ForestState";
import { genForestId, WAVE_MODIFIER_NAMES, WAVE_MODIFIER_COLORS, BUFF_POOL, CHALLENGE_NAMES } from "../state/ForestState";

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

function addNotification(state: ForestState, text: string, color: number): void {
  state.notifications.push({ text, timer: 3.0, color });
  if (state.notifications.length > 8) state.notifications.shift();
}

function spawnParticles(
  state: ForestState, pos: Vec3, count: number,
  type: ForestParticle["type"], color: number, speed: number, life: number,
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

// Ring of particles on XZ plane
function spawnParticleRing(
  state: ForestState, center: Vec3, radius: number, count: number,
  type: ForestParticle["type"], color: number, speed: number, life: number,
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

function flashScreen(state: ForestState, color: string, intensity: number, duration: number): void {
  state.screenFlash = { color, intensity, timer: duration };
}

function addScreenShake(state: ForestState, intensity: number, duration: number): void {
  state.screenShake = Math.max(state.screenShake, duration);
  state.screenShakeIntensity = Math.max(state.screenShakeIntensity, intensity);
}

function spawnDamageNumber(state: ForestState, pos: Vec3, value: number, color: number, crit: boolean): void {
  state.damageNumbers.push({
    pos: { x: pos.x + (Math.random() - 0.5) * 0.5, y: pos.y + 1.5, z: pos.z },
    value: Math.round(value), timer: 1.2, color, crit,
  });
}

function spawnEssenceOrb(state: ForestState, pos: Vec3, value: number): void {
  const angle = Math.random() * Math.PI * 2;
  state.essenceOrbs.push({
    pos: { ...pos, y: pos.y + 0.5 },
    vel: { x: Math.cos(angle) * 3, y: 4 + Math.random() * 2, z: Math.sin(angle) * 3 },
    value, life: FOREST.ESSENCE_ORB_LIFE, attracted: false,
  });
}

function getSeasonDamageMult(state: ForestState): number {
  const base = state.season === "summer" ? FOREST.SUMMER_DAMAGE_MULT : 1.0;
  let groveBuff = 1.0;
  if (state.player.groveLevel >= 3) {
    const pureCount = state.groves.filter(g => g.status === "pure").length;
    groveBuff = 1 + pureCount * 0.05;
  }
  return base * getBuffDamageMult(state) * groveBuff;
}

function getSeasonEssenceMult(state: ForestState): number {
  const base = state.season === "autumn" ? FOREST.AUTUMN_ESSENCE_MULT : 1.0;
  return base * getBuffEssenceMult(state);
}

function getEnemySpeedMult(state: ForestState): number {
  let mult = 1.0;
  if (state.season === "winter") mult *= FOREST.WINTER_SLOW_ENEMIES;
  return mult;
}

function getCorruptionBuff(state: ForestState): number {
  return 1 + state.corruption * FOREST.CORRUPTION_ENEMY_BUFF * 10;
}

function getDiff(state: ForestState) {
  return FOREST.DIFFICULTY[state.difficulty] || FOREST.DIFFICULTY.normal;
}

// Wave modifier helpers
function getModDamageMult(state: ForestState): number {
  return state.waveModifier === "blood_blight" ? FOREST.BLOOD_BLIGHT_DAMAGE_MULT : 1.0;
}

function getModPlayerSpeedMult(state: ForestState): number {
  return state.waveModifier === "frostbite" ? FOREST.FROSTBITE_PLAYER_SLOW : 1.0;
}

function getModEnemyArmor(state: ForestState): number {
  return state.waveModifier === "frostbite" ? FOREST.FROSTBITE_ENEMY_ARMOR : 0;
}

function getPlayerFwd(state: ForestState): Vec3 {
  const p = state.player;
  return {
    x: -Math.sin(p.yaw) * Math.cos(p.pitch),
    y: Math.sin(p.pitch),
    z: -Math.cos(p.yaw) * Math.cos(p.pitch),
  };
}

// ---- Player Movement ----

export function updatePlayer(state: ForestState, dt: number): void {
  const p = state.player;
  if (p.action === "dead" || p.action === "root_travelling") return;

  // Cooldown ticks
  p.vineSnareCD = Math.max(0, p.vineSnareCD - dt);
  p.thornBarrageCD = Math.max(0, p.thornBarrageCD - dt);
  p.leafStormCD = Math.max(0, p.leafStormCD - dt);
  p.rootCrushCD = Math.max(0, p.rootCrushCD - dt);
  p.staffCD = Math.max(0, p.staffCD - dt);
  p.rootTravelCD = Math.max(0, p.rootTravelCD - dt);
  p.dodgeCD = Math.max(0, p.dodgeCD - dt);
  p.invincibleTimer = Math.max(0, p.invincibleTimer - dt);
  p.comboTimer = Math.max(0, p.comboTimer - dt);
  if (p.comboTimer <= 0 && p.combo > 0) {
    p.maxCombo = Math.max(p.maxCombo, p.combo);
    p.combo = 0;
  }

  // Staff combo timer decay
  p.staffComboTimer = Math.max(0, p.staffComboTimer - dt);
  if (p.staffComboTimer <= 0 && p.staffComboStep > 0) {
    p.staffComboStep = 0;
  }

  // Kill streak decay
  if (p.killStreakTimer > 0) {
    p.killStreakTimer -= dt;
    if (p.killStreakTimer <= 0) {
      p.killStreak = 0;
    }
  }

  // Block timer
  if (p.blockTimer > 0) {
    p.blockTimer -= dt;
    if (p.blockTimer <= 0) p.blocking = false;
  }

  // Leaf storm tick
  if (p.leafStormTimer > 0) {
    p.leafStormTimer -= dt;
    state.leafStormActive = true;
    p.leafStormTickTimer -= dt;
    if (p.leafStormTickTimer <= 0) {
      p.leafStormTickTimer = FOREST.LEAF_STORM_TICK;
      applyLeafStormDamage(state);
    }
  } else {
    state.leafStormActive = false;
  }

  // Root crush pending
  if (p.rootCrushPending > 0) {
    p.rootCrushPending -= dt;
    if (p.rootCrushPending <= 0 && p.rootCrushPos) {
      applyRootCrush(state);
    }
  }

  // Mouse look
  if (state.pointerLocked) {
    p.yaw -= state.mouseDX * 0.002 * FOREST.TURN_SPEED;
    p.pitch -= state.mouseDY * 0.002 * FOREST.PITCH_SPEED;
    p.pitch = Math.max(-1.2, Math.min(1.2, p.pitch));
  }
  state.mouseDX = 0;
  state.mouseDY = 0;

  // Dodge roll
  if (p.dodgeTimer > 0) {
    p.dodgeTimer -= dt;
    p.pos.x += p.dodgeDir.x * FOREST.DODGE_SPEED * dt;
    p.pos.z += p.dodgeDir.z * FOREST.DODGE_SPEED * dt;
    p.action = "dodging";
    if (p.dodgeTimer <= 0) p.action = "idle";
    return;
  }

  // Movement
  const keys = state.keys;
  let moveX = 0, moveZ = 0;
  const sinY = Math.sin(p.yaw), cosY = Math.cos(p.yaw);
  if (keys.has("w")) { moveX -= sinY; moveZ -= cosY; }
  if (keys.has("s")) { moveX += sinY; moveZ += cosY; }
  if (keys.has("a")) { moveX -= cosY; moveZ += sinY; }
  if (keys.has("d")) { moveX += cosY; moveZ -= sinY; }

  const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
  if (len > 0) { moveX /= len; moveZ /= len; }

  const sprinting = keys.has("shift") && p.stamina > 0 && len > 0;
  const speedMult = (1 + p.speedLevel * 0.12) * getModPlayerSpeedMult(state) * getBuffSpeedMult(state);
  const baseSpeed = sprinting ? FOREST.SPRINT_SPEED : FOREST.WALK_SPEED;
  const speed = baseSpeed * speedMult;

  if (len > 0) {
    p.vel.x += moveX * speed * dt * 8;
    p.vel.z += moveZ * speed * dt * 8;
    p.action = sprinting ? "sprinting" : "walking";
  } else {
    p.action = p.rootCrushPending > 0 ? "casting" : "idle";
  }

  // Stamina
  if (sprinting) {
    p.stamina -= FOREST.STAMINA_SPRINT_DRAIN * dt;
    p.stamina = Math.max(0, p.stamina);
  } else {
    p.stamina = Math.min(p.maxStamina, p.stamina + FOREST.STAMINA_REGEN * dt);
  }

  // Gravity & jump
  if (p.onGround && keys.has(" ")) {
    p.vel.y = FOREST.JUMP_FORCE;
    p.onGround = false;
  }
  if (!p.onGround) {
    p.vel.y += FOREST.GRAVITY * dt;
  }

  // Apply velocity
  p.pos.x += p.vel.x * dt;
  p.pos.y += p.vel.y * dt;
  p.pos.z += p.vel.z * dt;

  // Ground collision
  if (p.pos.y <= 0) {
    p.pos.y = 0;
    p.vel.y = 0;
    p.onGround = true;
  }

  // Drag
  const drag = p.onGround ? FOREST.GROUND_DRAG : FOREST.AIR_DRAG;
  p.vel.x *= drag;
  p.vel.z *= drag;

  // Clamp speed
  const hSpeed = Math.sqrt(p.vel.x * p.vel.x + p.vel.z * p.vel.z);
  if (hSpeed > speed * 1.2) {
    const scale = (speed * 1.2) / hSpeed;
    p.vel.x *= scale;
    p.vel.z *= scale;
  }

  // World bounds
  const half = FOREST.GROUND_SIZE / 2;
  p.pos.x = Math.max(-half, Math.min(half, p.pos.x));
  p.pos.z = Math.max(-half, Math.min(half, p.pos.z));

  // Great Oak collision — can't walk through the trunk
  const oakDist = Math.sqrt(p.pos.x * p.pos.x + p.pos.z * p.pos.z);
  if (oakDist < FOREST.GREAT_OAK_RADIUS && p.pos.y < FOREST.GREAT_OAK_HEIGHT * 0.3) {
    const pushDir = { x: p.pos.x / oakDist, z: p.pos.z / oakDist };
    p.pos.x = pushDir.x * FOREST.GREAT_OAK_RADIUS;
    p.pos.z = pushDir.z * FOREST.GREAT_OAK_RADIUS;
    p.vel.x *= 0.5;
    p.vel.z *= 0.5;
  }

  // Tree collision
  for (const tree of state.trees) {
    const treeDist = distXZ(p.pos, tree.pos);
    const treeRadius = tree.radius * 0.6;
    if (treeDist < treeRadius && p.pos.y < tree.height * 0.4) {
      const dx = p.pos.x - tree.pos.x;
      const dz = p.pos.z - tree.pos.z;
      const pushScale = treeRadius / treeDist;
      p.pos.x = tree.pos.x + dx * pushScale;
      p.pos.z = tree.pos.z + dz * pushScale;
      p.vel.x *= 0.5;
      p.vel.z *= 0.5;
    }
  }

  // Corrupted tree aura — slow + minor damage near corrupted trees
  let nearCorrupted = false;
  for (const tree of state.trees) {
    if (!tree.corrupted) continue;
    if (distXZ(p.pos, tree.pos) < 4) { nearCorrupted = true; break; }
  }
  if (nearCorrupted) {
    p.vel.x *= 0.92;
    p.vel.z *= 0.92;
    p.hp -= 1.0 * dt; // 1 HP per second, dt-based
    if (Math.random() < dt * 2) spawnParticles(state, p.pos, 1, "blight", 0x442244, 1, 0.3);
  }

  // HP regen near groves & spring bonus
  let regenRate = FOREST.HP_REGEN;
  if (state.season === "spring") regenRate *= FOREST.SPRING_REGEN_MULT;
  for (const grove of state.groves) {
    if (grove.status === "pure" && distXZ(p.pos, grove.pos) < FOREST.GROVE_HEAL_RANGE) {
      regenRate += FOREST.GROVE_HEAL_RATE;
    }
  }
  if (p.hp < p.maxHp && p.hp > 0) {
    p.hp = Math.min(p.maxHp, p.hp + regenRate * dt);
  }

  // Great Oak regen in spring
  if (state.season === "spring" && state.greatOak.hp < state.greatOak.maxHp) {
    state.greatOak.hp = Math.min(state.greatOak.maxHp, state.greatOak.hp + FOREST.GREAT_OAK_REGEN_SPRING * dt);
  }

  // Block (hold X) — reduces damage, can't attack, slows movement
  if (state.keys.has("x")) {
    if (!p.blocking) {
      // Fresh block — first 0.2s is a parry window (blockTimer tracks parry)
      p.blockTimer = 0.2 + (p.armorLevel >= 3 ? 0.15 : 0);
    }
    p.blocking = true;
    p.staffCD = Math.max(p.staffCD, 0.15);
    p.vel.x *= 0.7;
    p.vel.z *= 0.7;
  } else {
    p.blocking = false;
    p.blockTimer = 0;
  }

  // Dodge initiation (Ctrl)
  if (keys.has("control") && p.dodgeCD <= 0 && p.stamina >= FOREST.DODGE_STAMINA_COST && len > 0) {
    p.dodgeCD = FOREST.DODGE_COOLDOWN;
    p.dodgeTimer = FOREST.DODGE_DURATION;
    p.invincibleTimer = FOREST.DODGE_IFRAMES;
    p.dodgeDir = { x: moveX, y: 0, z: moveZ };
    p.stamina -= FOREST.DODGE_STAMINA_COST;
    spawnParticles(state, p.pos, 6, "trail", 0x88cc88, 3, 0.4);
    // Speed lv3 synergy: dodge fires thorns in all directions
    if (p.speedLevel >= 3) {
      const dmg = FOREST.THORN_BARRAGE_DAMAGE * 0.5;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        state.projectiles.push({
          id: genForestId(state),
          pos: { x: p.pos.x, y: p.pos.y + 1, z: p.pos.z },
          vel: { x: Math.cos(a) * 12, y: 1, z: Math.sin(a) * 12 },
          damage: dmg, life: 1.5, type: "thorn", owner: "player", ownerId: "player",
        });
      }
    }
  }

  // Hit stop
  if (state.hitStopTimer > 0) {
    state.hitStopTimer -= dt;
    if (state.hitStopTimer <= 0) state.hitStopScale = 1;
  }

  // Grove purification (hold G near corrupted grove)
  updatePurification(state, dt);
}

// ---- Grove Purification ----

function updatePurification(state: ForestState, dt: number): void {
  const p = state.player;
  if (!state.keys.has("g")) {
    p.purifyingGroveIdx = -1;
    return;
  }

  // Find nearest corrupted grove in range
  let targetIdx = -1;
  let minDist = Infinity;
  for (let i = 0; i < state.groves.length; i++) {
    const grove = state.groves[i];
    if (grove.status !== "corrupted") continue;
    const d = distXZ(p.pos, grove.pos);
    if (d < FOREST.PURIFY_RANGE && d < minDist) {
      minDist = d;
      targetIdx = i;
    }
  }

  if (targetIdx < 0) {
    p.purifyingGroveIdx = -1;
    return;
  }

  // Start purifying — costs essence once
  if (p.purifyingGroveIdx !== targetIdx) {
    if (p.essence < FOREST.PURIFY_COST) {
      p.purifyingGroveIdx = -1;
      return;
    }
    p.essence -= FOREST.PURIFY_COST;
    p.purifyingGroveIdx = targetIdx;
    addNotification(state, "PURIFYING...", 0x44ff88);
  }

  const grove = state.groves[targetIdx];
  grove.purifyProgress += FOREST.PURIFY_SPEED * dt;
  spawnParticles(state, grove.pos, 1, "heal", 0x44ff88, 2, 0.5);

  if (grove.purifyProgress >= 1) {
    grove.purifyProgress = 1;
    grove.status = "pure";
    grove.hp = grove.maxHp * FOREST.PURIFY_RESTORE_HP;
    state.corruption = Math.max(0, state.corruption - FOREST.CORRUPTION_DECAY_PURIFY);
    state.pendingPurifyGroveIdx = targetIdx;
    p.purifyingGroveIdx = -1;
    addNotification(state, "GROVE PURIFIED!", 0x44ff88);
    flashScreen(state, "#44ff88", 0.3, 0.2);
    spawnParticleRing(state, grove.pos, FOREST.GROVE_RADIUS, 24, "heal", 0x44ff88, 4, 1.0);
    addScreenShake(state, 3, 0.15);
  }
}

// ---- Abilities ----

export function useAbilities(state: ForestState): void {
  const p = state.player;
  if (p.action === "dead" || p.action === "root_travelling" || p.action === "dodging") return;

  const damageMult = getSeasonDamageMult(state);

  // Staff combo attack (LMB) — 3-hit chain with increasing damage & knockback
  if (state.mouseDown && p.staffCD <= 0) {
    const step = p.staffComboStep;
    const comboDmgMult = FOREST.STAFF_COMBO_DAMAGE_MULT[step] ?? 1;
    const comboRangeBonus = FOREST.STAFF_COMBO_RANGE_BONUS[step] ?? 0;
    const knockback = step >= 2 ? FOREST.STAFF_HEAVY_KNOCKBACK : FOREST.STAFF_KNOCKBACK;
    const staffDmg = FOREST.STAFF_DAMAGE * (1 + p.staffLevel * 0.25) * damageMult * comboDmgMult;
    const range = FOREST.STAFF_RANGE + comboRangeBonus;

    p.staffCD = FOREST.STAFF_COOLDOWN;
    p.staffComboStep = (step + 1) % FOREST.STAFF_COMBO_COUNT;
    p.staffComboTimer = FOREST.STAFF_COMBO_WINDOW;

    const fwd = getPlayerFwd(state);
    let hitCount = 0;
    for (const [, enemy] of state.enemies) {
      if (enemy.behavior === "dead") continue;
      const d = dist3(p.pos, enemy.pos);
      if (d < range) {
        const toE = normalize3({ x: enemy.pos.x - p.pos.x, y: enemy.pos.y - p.pos.y, z: enemy.pos.z - p.pos.z });
        const dot = fwd.x * toE.x + fwd.y * toE.y + fwd.z * toE.z;
        if (dot > 0.3) {
          const isCrit = step >= 2;
          damageEnemy(state, enemy, staffDmg, isCrit);
          // Knockback
          applyKnockback(enemy, normalize3({ x: enemy.pos.x - p.pos.x, y: 0.3, z: enemy.pos.z - p.pos.z }), knockback);
          hitCount++;
          // Staff lv3 synergy: essence on hit
          if (p.staffLevel >= 3) p.essence += 1;
        }
      }
    }
    if (hitCount > 0) {
      const colors = [0x88cc44, 0xaadd44, 0xffee44];
      spawnParticles(state, { x: p.pos.x + fwd.x * 2, y: p.pos.y + 1, z: p.pos.z + fwd.z * 2 },
        4 + step * 3, "impact", colors[step] ?? 0x88cc44, 4 + step * 2, 0.3 + step * 0.1);
      if (step >= 2) {
        addScreenShake(state, 4, 0.12);
      }
    }
    state.stats.abilitiesUsed++;
  }

  // Thorn Barrage (RMB)
  if (state.rightMouseDown && p.thornBarrageCD <= 0) {
    p.thornBarrageCD = FOREST.THORN_BARRAGE_COOLDOWN;
    const count = FOREST.THORN_BARRAGE_COUNT + p.thornLevel * 2;
    const dmg = FOREST.THORN_BARRAGE_DAMAGE * (1 + p.thornLevel * 0.3) * damageMult;
    const fwd = getPlayerFwd(state);
    for (let i = 0; i < count; i++) {
      const spread = 0.15;
      const dir: Vec3 = {
        x: fwd.x + (Math.random() - 0.5) * spread,
        y: fwd.y + (Math.random() - 0.5) * spread * 0.5,
        z: fwd.z + (Math.random() - 0.5) * spread,
      };
      const ndir = normalize3(dir);
      state.projectiles.push({
        id: genForestId(state),
        pos: { x: p.pos.x, y: p.pos.y + 1.2, z: p.pos.z },
        vel: { x: ndir.x * FOREST.THORN_BARRAGE_SPEED, y: ndir.y * FOREST.THORN_BARRAGE_SPEED, z: ndir.z * FOREST.THORN_BARRAGE_SPEED },
        damage: dmg,
        life: FOREST.PROJECTILE_LIFE,
        type: "thorn",
        owner: "player",
        ownerId: "player",
      });
    }
    spawnParticles(state, { x: p.pos.x + fwd.x, y: p.pos.y + 1, z: p.pos.z + fwd.z }, 6, "leaf", 0x44aa44, 5, 0.4);
    state.stats.abilitiesUsed++;
  }

  // Vine Snare (Q) — AoE root + damage at enemy cluster
  if (state.keys.has("q") && p.vineSnareCD <= 0) {
    p.vineSnareCD = FOREST.VINE_SNARE_COOLDOWN;
    // Find best cluster
    let bestPos: Vec3 = { x: p.pos.x, y: 0, z: p.pos.z };
    let bestCount = 0;
    for (const [, e] of state.enemies) {
      if (e.behavior === "dead") continue;
      if (distXZ(p.pos, e.pos) > 20) continue;
      let count = 0;
      for (const [, e2] of state.enemies) {
        if (e2.behavior === "dead") continue;
        if (distXZ(e.pos, e2.pos) < FOREST.VINE_SNARE_RADIUS) count++;
      }
      if (count > bestCount) {
        bestCount = count;
        bestPos = { x: e.pos.x, y: 0, z: e.pos.z };
      }
    }
    for (const [, enemy] of state.enemies) {
      if (enemy.behavior === "dead") continue;
      if (distXZ(enemy.pos, bestPos) < FOREST.VINE_SNARE_RADIUS) {
        enemy.snaredTimer = FOREST.VINE_SNARE_DURATION;
        enemy.stunTimer = Math.max(enemy.stunTimer, 0.5);
        damageEnemy(state, enemy, FOREST.VINE_SNARE_DAMAGE * damageMult, false);
      }
    }
    state.pendingVineSnarePos = bestPos;
    spawnParticleRing(state, bestPos, FOREST.VINE_SNARE_RADIUS, 20, "root", 0x228822, 3, 1.0);
    spawnParticles(state, bestPos, 15, "root", 0x228822, 4, 0.8);
    addNotification(state, "VINE SNARE", 0x44aa44);
    state.stats.abilitiesUsed++;
    state.keys.delete("q");
  }

  // Root Crush (E) — delayed AoE with ground crack
  if (state.keys.has("e") && p.rootCrushCD <= 0) {
    p.rootCrushCD = FOREST.ROOT_CRUSH_COOLDOWN;
    const fwd: Vec3 = { x: -Math.sin(p.yaw), y: 0, z: -Math.cos(p.yaw) };
    p.rootCrushPos = { x: p.pos.x + fwd.x * 8, y: 0, z: p.pos.z + fwd.z * 8 };
    p.rootCrushPending = FOREST.ROOT_CRUSH_DELAY;
    p.action = "casting";
    // Telegraph particles at target
    spawnParticleRing(state, p.rootCrushPos, FOREST.ROOT_CRUSH_RADIUS, 12, "root", 0x664422, 1, FOREST.ROOT_CRUSH_DELAY);
    state.stats.abilitiesUsed++;
    state.keys.delete("e");
  }

  // Leaf Storm (F) — sustained AoE around player
  if (state.keys.has("f") && p.leafStormCD <= 0) {
    p.leafStormCD = FOREST.LEAF_STORM_COOLDOWN;
    p.leafStormTimer = FOREST.LEAF_STORM_DURATION;
    p.leafStormTickTimer = 0;
    state.pendingLeafStormPos = { ...p.pos };
    state.leafStormActive = true;
    addNotification(state, "LEAF STORM", 0x88cc44);
    flashScreen(state, "#88cc44", 0.15, 0.1);
    state.stats.abilitiesUsed++;
    state.keys.delete("f");
  }

  // Root Travel (R)
  if (state.keys.has("r") && p.rootTravelCD <= 0) {
    let nearest: Vec3 | null = null;
    let nearDist = Infinity;
    for (const node of state.rootNodes) {
      if (!node.active) continue;
      const d = distXZ(p.pos, node.pos);
      if (d < 5) continue;
      if (d < nearDist && d > 15) { nearDist = d; nearest = node.pos; }
    }
    if (!nearest) {
      for (const node of state.rootNodes) {
        if (!node.active) continue;
        const d = distXZ(p.pos, node.pos);
        if (d > 5 && d < nearDist) { nearDist = d; nearest = node.pos; }
      }
    }
    if (nearest) {
      p.rootTravelCD = FOREST.ROOT_TRAVEL_COOLDOWN;
      p.rootTravelTarget = nearest;
      p.rootTravelTimer = nearDist / FOREST.ROOT_TRAVEL_SPEED;
      p.action = "root_travelling";
      p.invincibleTimer = p.rootTravelTimer + FOREST.ROOT_TRAVEL_INVULN;
      spawnParticles(state, p.pos, 12, "root", 0x228822, 5, 0.6);
      addNotification(state, "ROOT TRAVEL", 0x44cc88);
    }
    state.keys.delete("r");
  }

  // Recruit Wisp (T) — cost scales with current wisp count
  if (state.keys.has("t")) {
    const maxWisps = FOREST.WISP_ALLY_MAX + p.wispLevel;
    const wispCost = FOREST.WISP_ALLY_COST + state.wispAllies.length * 2;
    if (state.wispAllies.length < maxWisps && p.essence >= wispCost) {
      for (const grove of state.groves) {
        if (grove.status === "pure" && distXZ(p.pos, grove.pos) < FOREST.GROVE_HEAL_RANGE) {
          p.essence -= wispCost;
          state.wispAllies.push({
            id: genForestId(state),
            pos: { x: grove.pos.x, y: 2 + Math.random() * 2, z: grove.pos.z },
            vel: { x: 0, y: 0, z: 0 },
            hp: FOREST.WISP_ALLY_HP,
            maxHp: FOREST.WISP_ALLY_HP,
            attackTimer: 0,
            targetId: null,
            bobPhase: Math.random() * Math.PI * 2,
          });
          addNotification(state, "WISP RECRUITED", 0x88ffcc);
          spawnParticles(state, grove.pos, 8, "heal", 0x88ffcc, 4, 0.6);
          break;
        }
      }
    }
    state.keys.delete("t");
  }
}

function applyKnockback(enemy: Enemy, dir: Vec3, force: number): void {
  enemy.knockbackVel = { x: dir.x * force, y: dir.y * force, z: dir.z * force };
  enemy.knockbackTimer = 0.2;
}

function applyRootCrush(state: ForestState): void {
  const p = state.player;
  if (!p.rootCrushPos) return;
  const pos = p.rootCrushPos;
  const radius = FOREST.ROOT_CRUSH_RADIUS * (1 + p.rootLevel * 0.25);
  const dmg = FOREST.ROOT_CRUSH_DAMAGE * (1 + p.rootLevel * 0.25) * getSeasonDamageMult(state);

  let hitCount = 0;
  for (const [, enemy] of state.enemies) {
    if (enemy.behavior === "dead") continue;
    if (distXZ(enemy.pos, pos) < radius) {
      damageEnemy(state, enemy, dmg, true);
      enemy.stunTimer = Math.max(enemy.stunTimer, 1.0);
      // Upward knockback
      applyKnockback(enemy, normalize3({ x: enemy.pos.x - pos.x, y: 1, z: enemy.pos.z - pos.z }), 8);
      hitCount++;
      // Root lv3 synergy: essence per enemy hit
      if (state.player.rootLevel >= 3) spawnEssenceOrb(state, enemy.pos, 2);
    }
  }

  state.pendingRootCrush = { x: pos.x, z: pos.z };
  spawnParticles(state, { x: pos.x, y: 0.5, z: pos.z }, 25, "root", 0x664422, 8, 0.8);
  spawnParticleRing(state, { x: pos.x, y: 0, z: pos.z }, radius, 16, "impact", 0x885522, 5, 0.5);
  addScreenShake(state, 10, 0.35);
  if (hitCount > 0) {
    state.hitStopTimer = FOREST.HIT_STOP_ROOT_CRUSH;
    state.hitStopScale = FOREST.HIT_STOP_SCALE;
  }
  p.rootCrushPos = null;
  if (p.action === "casting") p.action = "idle";
}

function applyLeafStormDamage(state: ForestState): void {
  const p = state.player;
  const dmg = FOREST.LEAF_STORM_DAMAGE * getSeasonDamageMult(state);
  for (const [, enemy] of state.enemies) {
    if (enemy.behavior === "dead") continue;
    if (distXZ(p.pos, enemy.pos) < FOREST.LEAF_STORM_RADIUS) {
      damageEnemy(state, enemy, dmg, false);
      // Slight push away
      const dir = normalize3({ x: enemy.pos.x - p.pos.x, y: 0, z: enemy.pos.z - p.pos.z });
      applyKnockback(enemy, dir, 2);
    }
  }
  // Swirling leaf particles
  spawnParticleRing(state, { x: p.pos.x, y: 1, z: p.pos.z }, FOREST.LEAF_STORM_RADIUS * 0.6, 8, "leaf", 0x66aa33, 4, 0.4);
}

// ---- Root Travel Update ----

export function updateRootTravel(state: ForestState, dt: number): void {
  const p = state.player;
  if (p.action !== "root_travelling" || !p.rootTravelTarget) return;

  p.rootTravelTimer -= dt;
  if (p.rootTravelTimer <= 0) {
    p.pos.x = p.rootTravelTarget.x;
    p.pos.y = 0;
    p.pos.z = p.rootTravelTarget.z;
    p.vel = { x: 0, y: 0, z: 0 };
    p.rootTravelTarget = null;
    p.action = "idle";
    spawnParticles(state, p.pos, 15, "root", 0x44cc88, 6, 0.6);
    spawnParticleRing(state, p.pos, 2, 12, "heal", 0x44cc88, 3, 0.5);
  } else {
    p.pos.y = -3;
  }
}

// ---- Enemy Systems ----

export function updateEnemies(state: ForestState, dt: number): void {
  const p = state.player;
  const diff = getDiff(state);
  const speedMult = getEnemySpeedMult(state) * getCorruptionBuff(state);
  let aliveCount = 0;

  for (const [id, e] of state.enemies) {
    // Death
    if (e.behavior === "dead") {
      e.deathTimer -= dt;
      if (e.deathTimer <= 0) state.enemies.delete(id);
      continue;
    }

    aliveCount++;

    // Knockback
    if (e.knockbackTimer > 0) {
      e.knockbackTimer -= dt;
      e.pos.x += e.knockbackVel.x * dt;
      e.pos.y += e.knockbackVel.y * dt;
      e.pos.z += e.knockbackVel.z * dt;
      e.knockbackVel.x *= 0.85;
      e.knockbackVel.z *= 0.85;
      e.knockbackVel.y -= 15 * dt;
      if (e.pos.y < 0) e.pos.y = 0;
    }

    // Stun
    if (e.stunTimer > 0) {
      e.stunTimer -= dt;
      e.behavior = "stunned";
      if (e.stunTimer <= 0) e.behavior = "approaching";
      continue;
    }

    // Snare slow
    if (e.snaredTimer > 0) e.snaredTimer -= dt;
    const snareMult = e.snaredTimer > 0 ? 0.3 : 1.0;

    e.hitFlash = Math.max(0, e.hitFlash - dt * 5);
    e.bobPhase += dt * 3;

    // Determine target
    let targetPos: Vec3;
    if (e.target === "player") {
      targetPos = p.pos;
    } else if (e.target === "grove" && e.targetGroveIdx >= 0 && e.targetGroveIdx < state.groves.length) {
      const grove = state.groves[e.targetGroveIdx];
      if (grove.status === "corrupted" || grove.hp <= 0) {
        e.target = "oak";
        targetPos = { x: 0, y: 0, z: 0 };
      } else {
        targetPos = grove.pos;
      }
    } else {
      targetPos = { x: 0, y: 0, z: 0 };
    }

    const dToTarget = distXZ(e.pos, targetPos);
    const dToPlayer = distXZ(e.pos, p.pos);

    // Aggro switch
    if (dToPlayer < 8 && e.target !== "player" && e.type !== "wisp_corruptor") {
      e.target = "player";
      targetPos = p.pos;
    }

    // Type-specific AI
    switch (e.type) {
      case "blightling":
        updateBlightling(state, e, targetPos, dToPlayer, speedMult, snareMult, dt);
        break;
      case "rot_archer":
        updateRotArcher(state, e, targetPos, dToPlayer, speedMult, snareMult, diff, dt);
        break;
      case "bark_golem":
        updateBarkGolem(state, e, targetPos, dToTarget, dToPlayer, speedMult, snareMult, diff, dt);
        break;
      case "shadow_stag":
        updateShadowStag(state, e, targetPos, dToPlayer, speedMult, snareMult, diff, dt);
        break;
      case "blight_mother":
        updateBlightMother(state, e, targetPos, dToPlayer, speedMult, snareMult, diff, dt);
        break;
      case "wisp_corruptor":
        updateWispCorruptor(state, e, targetPos, dToPlayer, speedMult, snareMult, dt);
        break;
      case "corruption_avatar":
        updateCorruptionAvatar(state, e, targetPos, dToPlayer, speedMult, snareMult, diff, dt);
        break;
    }

    // Apply velocity
    if (e.knockbackTimer <= 0) {
      e.pos.x += e.vel.x * dt;
      e.pos.z += e.vel.z * dt;
    }
    if (e.pos.y < 0) e.pos.y = 0;

    // Great Oak collision for enemies
    const eOakDist = Math.sqrt(e.pos.x * e.pos.x + e.pos.z * e.pos.z);
    if (eOakDist < FOREST.GREAT_OAK_RADIUS * 0.8 && e.target !== "oak") {
      const pushDir = { x: e.pos.x / eOakDist, z: e.pos.z / eOakDist };
      e.pos.x = pushDir.x * FOREST.GREAT_OAK_RADIUS * 0.8;
      e.pos.z = pushDir.z * FOREST.GREAT_OAK_RADIUS * 0.8;
    }

    // World bounds
    const half = FOREST.GROUND_SIZE / 2;
    e.pos.x = Math.max(-half, Math.min(half, e.pos.x));
    e.pos.z = Math.max(-half, Math.min(half, e.pos.z));

    // Melee attack logic
    e.attackTimer = Math.max(0, e.attackTimer - dt);
    if (e.behavior !== "charging" && e.behavior !== "leaping" && e.behavior !== "casting" && e.knockbackTimer <= 0) {
      if (dToPlayer < FOREST.ENEMY_ATTACK_RANGE && e.attackTimer <= 0 && p.invincibleTimer <= 0 && p.action !== "root_travelling") {
        e.attackTimer = FOREST.ENEMY_ATTACK_COOLDOWN;
        hurtPlayer(state, e.damage * diff.enemyDmg * getModDamageMult(state));
        e.behavior = "attacking";
      } else if (e.target === "oak" && distXZ(e.pos, { x: 0, y: 0, z: 0 }) < FOREST.GREAT_OAK_RADIUS + 2 && e.attackTimer <= 0) {
        e.attackTimer = FOREST.ENEMY_ATTACK_COOLDOWN;
        const oakDmg = FOREST.ENEMY_OAK_DAMAGE * diff.enemyDmg * getCorruptionBuff(state);
        state.greatOak.hp -= oakDmg;
        state.stats.oakDamage += oakDmg;
        if (state.greatOak.hp <= 0) state.greatOak.hp = 0;
        spawnParticles(state, { x: e.pos.x, y: 2, z: e.pos.z }, 3, "blight", 0x442244, 2, 0.3);
      } else if (e.target === "grove" && e.targetGroveIdx >= 0 && e.targetGroveIdx < state.groves.length) {
        const grove = state.groves[e.targetGroveIdx];
        if (grove.status !== "corrupted" && distXZ(e.pos, grove.pos) < FOREST.GROVE_RADIUS + 2 && e.attackTimer <= 0) {
          e.attackTimer = FOREST.ENEMY_ATTACK_COOLDOWN;
          grove.hp -= FOREST.ENEMY_GROVE_DAMAGE * diff.enemyDmg;
          if (grove.status === "pure") grove.status = "contested";
          if (grove.hp <= 0) {
            grove.hp = 0;
            grove.status = "corrupted";
            grove.purifyProgress = 0;
            state.stats.grovesLost++;
            addNotification(state, "GROVE CORRUPTED!", 0xff2222);
            flashScreen(state, "#662244", 0.3, 0.2);
            addScreenShake(state, 5, 0.2);
            state.corruption = Math.min(1, state.corruption + 0.1);
            // Fail grove defense objective
            if (state.objective.active && state.objective.type === "grove_defense") {
              state.objective.active = false;
              addNotification(state, "OBJECTIVE FAILED", 0xff4444);
            }
          }
        }
      }
    }

    // Rotation
    if (Math.abs(e.vel.x) > 0.1 || Math.abs(e.vel.z) > 0.1) {
      e.rotation = Math.atan2(e.vel.x, e.vel.z);
    }
  }

  state.aliveEnemyCount = aliveCount;
}

// ---- Individual Enemy AI ----

function updateBlightling(state: ForestState, e: Enemy, targetPos: Vec3, _dToPlayer: number, speedMult: number, snareMult: number, _dt: number): void {
  // Pack speed bonus
  let packCount = 0;
  for (const [, other] of state.enemies) {
    if (other.id === e.id || other.type !== "blightling" || other.behavior === "dead") continue;
    if (distXZ(e.pos, other.pos) < FOREST.BLIGHTLING_PACK_RANGE) {
      packCount++;
      if (packCount >= 3) break;
    }
  }
  const packBonus = packCount * FOREST.BLIGHTLING_PACK_SPEED_BONUS;

  // Flanking: if close to player and other enemies are closer, offset approach angle
  if (e.target === "player" && _dToPlayer < 12 && _dToPlayer > 3) {
    let closerCount = 0;
    for (const [, other] of state.enemies) {
      if (other.id === e.id || other.behavior === "dead") continue;
      if (distXZ(other.pos, targetPos) < _dToPlayer) closerCount++;
      if (closerCount >= 2) break;
    }
    if (closerCount >= 2) {
      // Offset target to flank
      const angle = Math.atan2(targetPos.x - e.pos.x, targetPos.z - e.pos.z);
      const flankOffset = ((e.id.charCodeAt(4) % 2 === 0) ? 1 : -1) * 0.7;
      const flankedTarget: Vec3 = {
        x: targetPos.x + Math.cos(angle + flankOffset) * 4,
        y: 0,
        z: targetPos.z + Math.sin(angle + flankOffset) * 4,
      };
      moveToward(e, flankedTarget, speedMult * snareMult * (1 + packBonus));
      return;
    }
  }

  moveToward(e, targetPos, speedMult * snareMult * (1 + packBonus));
}

function updateRotArcher(state: ForestState, e: Enemy, targetPos: Vec3, dToPlayer: number, speedMult: number, snareMult: number, diff: ReturnType<typeof getDiff>, dt: number): void {
  e.fireCD = Math.max(0, e.fireCD - dt);
  const p = state.player;
  if (dToPlayer < FOREST.ROT_ARCHER_RANGE && e.fireCD <= 0 && p.action !== "root_travelling") {
    e.fireCD = FOREST.ROT_ARCHER_FIRE_CD;
    const dir = normalize3({ x: p.pos.x - e.pos.x, y: (p.pos.y + 1) - e.pos.y, z: p.pos.z - e.pos.z });
    state.projectiles.push({
      id: genForestId(state),
      pos: { x: e.pos.x, y: e.pos.y + 1.5, z: e.pos.z },
      vel: { x: dir.x * FOREST.ROT_ARCHER_ARROW_SPEED, y: dir.y * FOREST.ROT_ARCHER_ARROW_SPEED, z: dir.z * FOREST.ROT_ARCHER_ARROW_SPEED },
      damage: FOREST.ROT_ARCHER_DAMAGE * diff.enemyDmg * getCorruptionBuff(state) * getModDamageMult(state),
      life: FOREST.PROJECTILE_LIFE,
      type: "rot_arrow",
      owner: "enemy",
      ownerId: e.id,
    });
  }
  if (dToPlayer < 10) {
    const away = normalize3({ x: e.pos.x - p.pos.x, y: 0, z: e.pos.z - p.pos.z });
    // Strafe perpendicular while retreating
    const strafe = ((e.id.charCodeAt(4) % 2 === 0) ? 1 : -1);
    e.vel.x = (away.x * 0.6 + away.z * strafe * 0.4) * e.speed * speedMult * snareMult;
    e.vel.z = (away.z * 0.6 - away.x * strafe * 0.4) * e.speed * speedMult * snareMult;
    e.behavior = "retreating";
  } else {
    moveToward(e, targetPos, speedMult * snareMult);
  }
}

function updateBarkGolem(state: ForestState, e: Enemy, targetPos: Vec3, dToTarget: number, dToPlayer: number, speedMult: number, snareMult: number, diff: ReturnType<typeof getDiff>, dt: number): void {
  e.chargeCD = Math.max(0, e.chargeCD - dt);
  const p = state.player;
  if (e.behavior === "charging") {
    e.chargeTimer -= dt;
    e.pos.x += e.chargeDir.x * FOREST.BARK_GOLEM_CHARGE_SPEED * dt;
    e.pos.z += e.chargeDir.z * FOREST.BARK_GOLEM_CHARGE_SPEED * dt;
    // Trail particles
    if (state.tick % 2 === 0) spawnParticles(state, e.pos, 2, "impact", 0x554422, 2, 0.3);
    if (e.chargeTimer <= 0) {
      e.behavior = "approaching";
      addScreenShake(state, 3, 0.1);
    }
    if (dToPlayer < 3 && p.invincibleTimer <= 0 && p.action !== "root_travelling") {
      hurtPlayer(state, e.damage * 1.5 * diff.enemyDmg * getModDamageMult(state));
      addScreenShake(state, 5, 0.2);
    }
  } else if (e.chargeCD <= 0 && dToTarget < 25 && dToTarget > 8) {
    e.chargeCD = FOREST.BARK_GOLEM_CHARGE_CD;
    e.chargeTimer = FOREST.BARK_GOLEM_CHARGE_DURATION;
    e.chargeDir = normalize3({ x: targetPos.x - e.pos.x, y: 0, z: targetPos.z - e.pos.z });
    e.behavior = "charging";
    addScreenShake(state, 3, 0.2);
    addNotification(state, "GOLEM CHARGES!", 0xcc8844);
  } else {
    moveToward(e, targetPos, speedMult * snareMult);
  }
}

function updateShadowStag(state: ForestState, e: Enemy, targetPos: Vec3, dToPlayer: number, speedMult: number, snareMult: number, diff: ReturnType<typeof getDiff>, dt: number): void {
  e.leapCD = Math.max(0, e.leapCD - dt);
  const p = state.player;
  if (e.behavior === "leaping") {
    e.leapTimer -= dt;
    e.pos.x += e.vel.x * dt;
    e.pos.y += e.vel.y * dt;
    e.pos.z += e.vel.z * dt;
    e.vel.y += FOREST.GRAVITY * 0.5 * dt;
    if (e.pos.y <= 0) {
      e.pos.y = 0;
      e.behavior = "approaching";
      spawnParticles(state, e.pos, 6, "impact", 0x333355, 4, 0.3);
      if (dToPlayer < 4 && p.invincibleTimer <= 0 && p.action !== "root_travelling") {
        hurtPlayer(state, FOREST.SHADOW_STAG_LEAP_DAMAGE * diff.enemyDmg * getModDamageMult(state));
        addScreenShake(state, 4, 0.15);
      }
    }
  } else if (e.leapCD <= 0 && dToPlayer < 15 && dToPlayer > 5) {
    e.leapCD = FOREST.SHADOW_STAG_LEAP_CD;
    e.leapTimer = 0.8;
    const dir = normalize3({ x: p.pos.x - e.pos.x, y: 0, z: p.pos.z - e.pos.z });
    e.vel = { x: dir.x * 14, y: 8, z: dir.z * 14 };
    e.behavior = "leaping";
  } else {
    moveToward(e, targetPos, speedMult * snareMult);
  }
}

function updateBlightMother(state: ForestState, e: Enemy, targetPos: Vec3, dToPlayer: number, speedMult: number, snareMult: number, diff: ReturnType<typeof getDiff>, dt: number): void {
  e.slamCD = Math.max(0, e.slamCD - dt);
  e.spawnCD = Math.max(0, e.spawnCD - dt);
  e.spitCD = Math.max(0, e.spitCD - dt);
  const p = state.player;

  // Phase transitions
  const hpPct = e.hp / e.maxHp;
  if (hpPct <= FOREST.BLIGHT_MOTHER_PHASE3_HP && e.bossPhase < 2) {
    e.bossPhase = 2;
    state.pendingBossRoar = true;
    addNotification(state, "BLIGHT MOTHER ENRAGES!", 0xff2222);
    flashScreen(state, "#ff2222", 0.4, 0.3);
    addScreenShake(state, 8, 0.4);
    spawnParticles(state, e.pos, 30, "blight", 0xff2222, 10, 1.0);
  } else if (hpPct <= FOREST.BLIGHT_MOTHER_PHASE2_HP && e.bossPhase < 1) {
    e.bossPhase = 1;
    state.pendingBossRoar = true;
    addNotification(state, "BLIGHT MOTHER — PHASE 2", 0xcc4444);
    flashScreen(state, "#cc4444", 0.3, 0.2);
    addScreenShake(state, 6, 0.3);
    spawnParticles(state, e.pos, 20, "blight", 0xcc4444, 8, 0.8);
  }

  // Speed & damage scaling by phase
  const phaseSpeedMult = e.bossPhase >= 2 ? FOREST.BLIGHT_MOTHER_ENRAGE_SPEED : (e.bossPhase >= 1 ? 1.2 : 1.0);
  const phaseDmgMult = e.bossPhase >= 2 ? FOREST.BLIGHT_MOTHER_ENRAGE_DAMAGE : 1.0;

  // Slam AoE
  if (e.slamCD <= 0 && dToPlayer < FOREST.BLIGHT_MOTHER_SLAM_RADIUS + 2) {
    e.slamCD = FOREST.BLIGHT_MOTHER_SLAM_CD / (e.bossPhase >= 2 ? 1.5 : 1);
    if (dToPlayer < FOREST.BLIGHT_MOTHER_SLAM_RADIUS && p.invincibleTimer <= 0 && p.action !== "root_travelling") {
      hurtPlayer(state, FOREST.BLIGHT_MOTHER_SLAM_DAMAGE * diff.enemyDmg * phaseDmgMult * getModDamageMult(state));
    }
    spawnParticles(state, e.pos, 25, "blight", 0x442244, 10, 0.6);
    spawnParticleRing(state, e.pos, FOREST.BLIGHT_MOTHER_SLAM_RADIUS, 16, "impact", 0x662244, 5, 0.4);
    addScreenShake(state, 7, 0.35);
  }

  // Blight Spit (phase 1+) — fires projectiles in a spread
  if (e.bossPhase >= 1 && e.spitCD <= 0 && dToPlayer < 25) {
    e.spitCD = FOREST.BLIGHT_MOTHER_SPIT_CD;
    const toPlayer = normalize3({ x: p.pos.x - e.pos.x, y: 0.2, z: p.pos.z - e.pos.z });
    const count = FOREST.BLIGHT_MOTHER_SPIT_COUNT + (e.bossPhase >= 2 ? 3 : 0);
    for (let i = 0; i < count; i++) {
      const spreadAngle = (i - (count - 1) / 2) * 0.2;
      const cos = Math.cos(spreadAngle), sin = Math.sin(spreadAngle);
      const dir: Vec3 = {
        x: toPlayer.x * cos - toPlayer.z * sin,
        y: toPlayer.y,
        z: toPlayer.x * sin + toPlayer.z * cos,
      };
      state.projectiles.push({
        id: genForestId(state),
        pos: { x: e.pos.x, y: e.pos.y + 2, z: e.pos.z },
        vel: { x: dir.x * FOREST.BLIGHT_MOTHER_SPIT_SPEED, y: dir.y * FOREST.BLIGHT_MOTHER_SPIT_SPEED, z: dir.z * FOREST.BLIGHT_MOTHER_SPIT_SPEED },
        damage: FOREST.BLIGHT_MOTHER_SPIT_DAMAGE * diff.enemyDmg * phaseDmgMult,
        life: 3,
        type: "blight_spit",
        owner: "enemy",
        ownerId: e.id,
      });
    }
    addNotification(state, "BLIGHT SPIT!", 0x884488);
  }

  // Spawn minions
  if (e.spawnCD <= 0 && state.aliveEnemyCount < 40) {
    e.spawnCD = FOREST.BLIGHT_MOTHER_SPAWN_CD / (e.bossPhase >= 2 ? 1.5 : 1);
    const count = 2 + e.bossPhase;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      spawnEnemy(state, "blightling", { x: e.pos.x + Math.cos(angle) * 3, y: 0, z: e.pos.z + Math.sin(angle) * 3 }, -1);
    }
    addNotification(state, "BLIGHT SPAWNS!", 0xcc2233);
    spawnParticles(state, e.pos, 10, "blight", 0x662244, 5, 0.5);
  }

  moveToward(e, targetPos, speedMult * snareMult * phaseSpeedMult * 0.8);
}

function updateWispCorruptor(state: ForestState, e: Enemy, targetPos: Vec3, dToPlayer: number, speedMult: number, snareMult: number, dt: number): void {
  e.healCD = Math.max(0, e.healCD - dt);
  const p = state.player;

  if (e.healCD <= 0) {
    let healTarget: Enemy | null = null;
    let minRatio = 1;
    for (const [, other] of state.enemies) {
      if (other.id === e.id || other.behavior === "dead") continue;
      const ratio = other.hp / other.maxHp;
      if (ratio < minRatio && distXZ(e.pos, other.pos) < FOREST.WISP_CORRUPTOR_HEAL_RANGE) {
        minRatio = ratio;
        healTarget = other;
      }
    }
    if (healTarget && minRatio < 0.9) {
      e.healCD = FOREST.WISP_CORRUPTOR_HEAL_CD;
      healTarget.hp = Math.min(healTarget.maxHp, healTarget.hp + FOREST.WISP_CORRUPTOR_HEAL_AMOUNT);
      spawnParticles(state, healTarget.pos, 5, "blight", 0x662266, 3, 0.5);
      e.behavior = "casting";
    }
  }

  if (dToPlayer < FOREST.WISP_CORRUPTOR_KEEP_DIST) {
    const away = normalize3({ x: e.pos.x - p.pos.x, y: 0, z: e.pos.z - p.pos.z });
    e.vel.x = away.x * e.speed * speedMult * snareMult;
    e.vel.z = away.z * e.speed * speedMult * snareMult;
    e.behavior = "retreating";
  } else {
    moveToward(e, targetPos, speedMult * snareMult);
  }
}

function updateCorruptionAvatar(state: ForestState, e: Enemy, targetPos: Vec3, dToPlayer: number, speedMult: number, snareMult: number, diff: ReturnType<typeof getDiff>, dt: number): void {
  e.slamCD = Math.max(0, e.slamCD - dt);
  e.spawnCD = Math.max(0, e.spawnCD - dt);
  const p = state.player;

  // Corruption field: damages player in range, corrupts nearby groves
  if (e.spawnCD <= 0) {
    e.spawnCD = 6.0;
    // Damage player if close
    if (dToPlayer < 12 && p.invincibleTimer <= 0 && p.action !== "root_travelling") {
      hurtPlayer(state, 15 * diff.enemyDmg);
      addNotification(state, "CORRUPTION PULSE!", 0x884488);
    }
    // Damage nearby groves
    for (const grove of state.groves) {
      if (grove.status !== "corrupted" && distXZ(e.pos, grove.pos) < 20) {
        grove.hp -= 10;
        if (grove.hp <= 0) {
          grove.hp = 0;
          grove.status = "corrupted";
          grove.purifyProgress = 0;
          state.stats.grovesLost++;
          state.corruption = Math.min(1, state.corruption + 0.1);
          addNotification(state, "GROVE CORRUPTED!", 0xff2222);
        }
      }
    }
    spawnParticleRing(state, e.pos, 12, 20, "blight", 0x884488, 5, 0.6);
    addScreenShake(state, 4, 0.2);
  }

  // Slam attack (melee)
  if (e.slamCD <= 0 && dToPlayer < 6) {
    e.slamCD = 5.0;
    if (p.invincibleTimer <= 0 && p.action !== "root_travelling") {
      hurtPlayer(state, 50 * diff.enemyDmg);
    }
    spawnParticles(state, e.pos, 20, "blight", 0x662266, 8, 0.5);
    addScreenShake(state, 8, 0.3);
  }

  moveToward(e, targetPos, speedMult * snareMult * 0.7);
}

function moveToward(e: Enemy, target: Vec3, speedMult: number): void {
  const dx = target.x - e.pos.x;
  const dz = target.z - e.pos.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  if (dist > 1) {
    e.vel.x = (dx / dist) * e.speed * speedMult;
    e.vel.z = (dz / dist) * e.speed * speedMult;
    if (e.behavior !== "attacking") e.behavior = "approaching";
  } else {
    e.vel.x = 0;
    e.vel.z = 0;
  }
}

function damageEnemy(state: ForestState, enemy: Enemy, damage: number, crit: boolean): void {
  // Wave modifier: frostbite gives enemies armor
  const armor = getModEnemyArmor(state);
  // Crit hits deal 1.5x damage
  const critMult = crit ? 1.5 : 1.0;
  const finalDmg = damage * (1 - armor) * critMult;

  enemy.hp -= finalDmg;
  enemy.hitFlash = 1;
  const color = crit ? 0xff8844 : 0xffcc44;
  spawnDamageNumber(state, enemy.pos, finalDmg, color, crit);
  state.stats.damageDealt += finalDmg;

  // Wave modifier: blood blight — enemies lifesteal
  if (state.waveModifier === "blood_blight") {
    enemy.hp = Math.min(enemy.maxHp, enemy.hp + finalDmg * FOREST.BLOOD_BLIGHT_LIFESTEAL);
  }

  if (crit) {
    state.hitStopTimer = FOREST.HIT_STOP_CRIT;
    state.hitStopScale = FOREST.HIT_STOP_SCALE;
  }

  // Kill combo
  const p = state.player;
  p.combo = Math.min(FOREST.COMBO_MAX, p.combo + 1);
  p.comboTimer = FOREST.COMBO_WINDOW;

  if (enemy.hp <= 0) {
    killEnemy(state, enemy);
  }
}

function killEnemy(state: ForestState, enemy: Enemy): void {
  enemy.behavior = "dead";
  enemy.deathTimer = 0.6;
  state.enemiesKilled++;
  state.totalKills++;

  const p = state.player;
  const diff = getDiff(state);
  const essenceMult = diff.essenceMult * getSeasonEssenceMult(state) * (1 + p.combo * FOREST.COMBO_ESSENCE_BONUS);

  let baseEssence = FOREST.ESSENCE_PER_BLIGHTLING;
  switch (enemy.type) {
    case "rot_archer": baseEssence = FOREST.ESSENCE_PER_ROT_ARCHER; break;
    case "bark_golem": baseEssence = FOREST.ESSENCE_PER_BARK_GOLEM; break;
    case "shadow_stag": baseEssence = FOREST.ESSENCE_PER_SHADOW_STAG; break;
    case "blight_mother": baseEssence = FOREST.ESSENCE_PER_BLIGHT_MOTHER; break;
    case "wisp_corruptor": baseEssence = FOREST.ESSENCE_PER_WISP_CORRUPTOR; break;
  }
  spawnEssenceOrb(state, enemy.pos, Math.ceil(baseEssence * essenceMult));

  // Kill streak
  p.killStreak++;
  p.killStreakTimer = FOREST.STREAK_WINDOW;
  for (let i = FOREST.STREAK_THRESHOLDS.length - 1; i >= 0; i--) {
    if (p.killStreak === FOREST.STREAK_THRESHOLDS[i]) {
      const reward = FOREST.STREAK_REWARDS[i];
      spawnEssenceOrb(state, enemy.pos, reward);
      addNotification(state, `KILL STREAK x${p.killStreak}! +${reward} ESS`, 0xffaa44);
      flashScreen(state, "#ffaa44", 0.2, 0.15);
      break;
    }
  }

  // Heal sap drop
  const healChance = enemy.type === "bark_golem" ? 0.5 : enemy.type === "blight_mother" ? 1.0 : FOREST.HEAL_SAP_CHANCE;
  if (Math.random() < healChance) {
    const angle = Math.random() * Math.PI * 2;
    state.healSaps.push({
      pos: { ...enemy.pos, y: enemy.pos.y + 0.5 },
      vel: { x: Math.cos(angle) * 2, y: 3, z: Math.sin(angle) * 2 },
      heal: FOREST.HEAL_SAP_AMOUNT,
      life: FOREST.HEAL_SAP_LIFE,
    });
  }

  spawnParticles(state, enemy.pos, 12, "blight", 0x442244, 5, 0.6);

  // Track objective progress
  if (state.objective.active && state.objective.type === "kills") {
    state.objective.progress++;
  }
}

function hurtPlayer(state: ForestState, damage: number): void {
  const p = state.player;
  if (p.invincibleTimer > 0 || p.action === "root_travelling") return;

  // Perfect parry — blockTimer > 0 means within first 0.2s of block
  if (p.blocking && p.blockTimer > 0) {
    // Parry! Reflect damage, stun nearby enemies
    p.invincibleTimer = 0.5;
    addNotification(state, "PERFECT PARRY!", 0xffee44);
    flashScreen(state, "#ffee44", 0.4, 0.15);
    addScreenShake(state, 5, 0.15);
    spawnParticleRing(state, p.pos, 3, 16, "impact", 0xffee44, 6, 0.4);
    state.hitStopTimer = 0.08;
    state.hitStopScale = 0.1;
    // Parry objective
    if (state.objective.active && state.objective.type === "parry_kills") {
      state.objective.progress++;
    }
    // Stun nearby enemies
    for (const [, e] of state.enemies) {
      if (e.behavior === "dead") continue;
      if (distXZ(p.pos, e.pos) < 5) {
        e.stunTimer = Math.max(e.stunTimer, 1.5);
        damageEnemy(state, e, damage * 0.5, true);
      }
    }
    return;
  }

  // Normal block reduces damage by 70%
  const blockMult = p.blocking ? 0.3 : 1.0;
  const dr = p.armorLevel * 0.08 + getBuffDR(state);
  const finalDmg = damage * (1 - dr) * blockMult;
  p.hp -= finalDmg;
  state.stats.damageTaken += finalDmg;
  p.invincibleTimer = 0.3;

  if (p.blocking) {
    addScreenShake(state, 2, 0.1);
    spawnParticles(state, p.pos, 6, "impact", 0xaaaaaa, 4, 0.3);
    flashScreen(state, "#aaaacc", 0.15, 0.1);
  } else {
    flashScreen(state, "#ff2222", 0.3, 0.15);
    addScreenShake(state, 3, 0.15);
  }

  // Frostbite: chance to freeze player
  if (state.waveModifier === "frostbite" && Math.random() < FOREST.FROSTBITE_FREEZE_CHANCE) {
    p.invincibleTimer = 0; // freeze overrides iframes
    p.vel = { x: 0, y: 0, z: 0 };
    p.action = "idle";
    // Brief stun effect
    flashScreen(state, "#88ccff", 0.4, 0.2);
    addNotification(state, "FROZEN!", 0x88ccff);
  }

  if (p.hp <= 0) {
    p.hp = 0;
    p.action = "dead";
    state.deathSequenceTimer = FOREST.DEATH_SLOW_MO_DURATION;
    state.hitStopScale = FOREST.DEATH_SLOW_MO_SCALE;
    state.hitStopTimer = FOREST.DEATH_SLOW_MO_DURATION;
  }
}

// ---- Wisp Allies ----

export function updateWispAllies(state: ForestState, dt: number): void {
  const p = state.player;
  for (let i = state.wispAllies.length - 1; i >= 0; i--) {
    const w = state.wispAllies[i];
    w.bobPhase += dt * 4;
    // Wisp lv3 synergy: heal player 1HP/s per wisp
    if (p.wispLevel >= 3 && p.hp < p.maxHp) {
      p.hp = Math.min(p.maxHp, p.hp + 1.0 * dt);
    }
    w.attackTimer = Math.max(0, w.attackTimer - dt);

    let nearDist = Infinity;
    let nearEnemy: Enemy | null = null;
    for (const [, e] of state.enemies) {
      if (e.behavior === "dead") continue;
      const d = dist3(w.pos, e.pos);
      if (d < FOREST.WISP_ALLY_ATTACK_RANGE && d < nearDist) {
        nearDist = d;
        nearEnemy = e;
      }
    }

    if (nearEnemy && w.attackTimer <= 0) {
      w.attackTimer = 1.0;
      const wispDmg = FOREST.WISP_ALLY_DAMAGE * (1 + p.wispLevel * 0.2);
      damageEnemy(state, nearEnemy, wispDmg, false);
      spawnParticles(state, nearEnemy.pos, 3, "heal", 0x88ffcc, 3, 0.3);
      w.targetId = nearEnemy.id;
    }

    const dToPlayer = dist3(w.pos, p.pos);
    if (dToPlayer > 8) {
      const dir = normalize3({ x: p.pos.x - w.pos.x, y: (p.pos.y + 2) - w.pos.y, z: p.pos.z - w.pos.z });
      w.vel.x = dir.x * FOREST.WISP_ALLY_SPEED;
      w.vel.y = dir.y * FOREST.WISP_ALLY_SPEED * 0.5;
      w.vel.z = dir.z * FOREST.WISP_ALLY_SPEED;
    } else {
      w.vel.x = Math.sin(w.bobPhase) * 2;
      w.vel.z = Math.cos(w.bobPhase) * 2;
      w.pos.y = 2 + Math.sin(w.bobPhase * 0.7) * 0.5;
    }

    w.pos.x += w.vel.x * dt;
    w.pos.y += w.vel.y * dt;
    w.pos.z += w.vel.z * dt;

    if (w.hp <= 0) {
      spawnParticles(state, w.pos, 8, "heal", 0x88ffcc, 4, 0.5);
      state.wispAllies.splice(i, 1);
    }
  }
}

// ---- Projectiles ----

export function updateProjectiles(state: ForestState, dt: number): void {
  const p = state.player;
  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const proj = state.projectiles[i];
    proj.pos.x += proj.vel.x * dt;
    proj.pos.y += proj.vel.y * dt;
    proj.pos.z += proj.vel.z * dt;
    proj.life -= dt;

    if (proj.type === "rot_arrow") proj.vel.y -= 3 * dt;
    if (proj.type === "blight_spit") proj.vel.y -= 2 * dt;

    if (proj.life <= 0 || proj.pos.y < -1) {
      state.projectiles.splice(i, 1);
      continue;
    }

    if (proj.owner === "player") {
      for (const [, enemy] of state.enemies) {
        if (enemy.behavior === "dead") continue;
        if (dist3(proj.pos, enemy.pos) < 1.8) {
          damageEnemy(state, enemy, proj.damage, false);
          spawnParticles(state, proj.pos, 3, "leaf", 0x44aa44, 3, 0.2);
          state.projectiles.splice(i, 1);
          break;
        }
      }
    } else {
      if (p.invincibleTimer <= 0 && p.action !== "root_travelling" && dist3(proj.pos, { x: p.pos.x, y: p.pos.y + 1, z: p.pos.z }) < 1.5) {
        hurtPlayer(state, proj.damage);
        spawnParticles(state, proj.pos, 4, "blight", 0x442244, 3, 0.3);
        state.projectiles.splice(i, 1);
      }
    }
  }
}

// ---- Essence Orbs ----

export function updateEssenceOrbs(state: ForestState, dt: number): void {
  const p = state.player;
  for (let i = state.essenceOrbs.length - 1; i >= 0; i--) {
    const orb = state.essenceOrbs[i];
    orb.life -= dt;
    if (orb.life <= 0) { state.essenceOrbs.splice(i, 1); continue; }

    const d = dist3(orb.pos, p.pos);
    if (d < FOREST.ESSENCE_ORB_ATTRACT_RANGE) orb.attracted = true;

    if (orb.attracted) {
      const dir = normalize3({ x: p.pos.x - orb.pos.x, y: (p.pos.y + 0.5) - orb.pos.y, z: p.pos.z - orb.pos.z });
      orb.vel.x = dir.x * FOREST.ESSENCE_ORB_SPEED;
      orb.vel.y = dir.y * FOREST.ESSENCE_ORB_SPEED;
      orb.vel.z = dir.z * FOREST.ESSENCE_ORB_SPEED;
    } else {
      orb.vel.y -= 8 * dt;
      if (orb.pos.y < 0.5) { orb.pos.y = 0.5; orb.vel.y = 0; orb.vel.x *= 0.95; orb.vel.z *= 0.95; }
    }

    orb.pos.x += orb.vel.x * dt;
    orb.pos.y += orb.vel.y * dt;
    orb.pos.z += orb.vel.z * dt;

    if (d < FOREST.ESSENCE_ORB_COLLECT_RANGE) {
      p.essence += orb.value;
      state.stats.essenceEarned += orb.value;
      state.essenceOrbs.splice(i, 1);
    }
  }
}

// ---- Heal Saps ----

export function updateHealSaps(state: ForestState, dt: number): void {
  const p = state.player;
  for (let i = state.healSaps.length - 1; i >= 0; i--) {
    const sap = state.healSaps[i];
    sap.life -= dt;
    if (sap.life <= 0) { state.healSaps.splice(i, 1); continue; }

    sap.vel.y -= 8 * dt;
    sap.pos.x += sap.vel.x * dt;
    sap.pos.y += sap.vel.y * dt;
    sap.pos.z += sap.vel.z * dt;
    if (sap.pos.y < 0.3) { sap.pos.y = 0.3; sap.vel.y = 0; sap.vel.x *= 0.9; sap.vel.z *= 0.9; }

    if (dist3(sap.pos, p.pos) < 2) {
      p.hp = Math.min(p.maxHp, p.hp + sap.heal);
      spawnParticles(state, p.pos, 6, "heal", 0x44ff88, 3, 0.4);
      state.healSaps.splice(i, 1);
    }
  }
}

// ---- Damage Numbers ----

export function updateDamageNumbers(state: ForestState, dt: number): void {
  for (let i = state.damageNumbers.length - 1; i >= 0; i--) {
    state.damageNumbers[i].pos.y += 2 * dt;
    state.damageNumbers[i].timer -= dt;
    if (state.damageNumbers[i].timer <= 0) state.damageNumbers.splice(i, 1);
  }
}

// ---- Particles ----

export function updateParticles(state: ForestState, dt: number): void {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const pt = state.particles[i];
    pt.pos.x += pt.vel.x * dt;
    pt.pos.y += pt.vel.y * dt;
    pt.pos.z += pt.vel.z * dt;
    pt.vel.y -= 4 * dt;
    pt.life -= dt;
    if (pt.life <= 0) state.particles.splice(i, 1);
  }

  // Ambient season particles
  // Cap particles to prevent memory bloat
  if (state.particles.length > 1000) {
    state.particles.splice(0, state.particles.length - 800);
  }
  // Cap damage numbers
  if (state.damageNumbers.length > 200) {
    state.damageNumbers.splice(0, state.damageNumbers.length - 150);
  }

  // Ambient season particles (dt-based)
  state.ambientParticleTimer += dt;
  if (state.ambientParticleTimer >= 0.05 && state.phase === "playing") {
    state.ambientParticleTimer = 0;
    const px = state.player.pos.x + (Math.random() - 0.5) * 30;
    const pz = state.player.pos.z + (Math.random() - 0.5) * 30;
    switch (state.season) {
      case "spring":
        state.particles.push({
          pos: { x: px, y: 3 + Math.random() * 5, z: pz },
          vel: { x: (Math.random() - 0.5) * 2, y: -0.5, z: (Math.random() - 0.5) * 2 },
          life: 3, maxLife: 3, color: 0xff88aa, size: 0.15, type: "petal",
        });
        break;
      case "summer":
        state.particles.push({
          pos: { x: px, y: 0.5, z: pz },
          vel: { x: (Math.random() - 0.5), y: 1 + Math.random() * 2, z: (Math.random() - 0.5) },
          life: 2, maxLife: 2, color: 0xff8833, size: 0.1, type: "ember",
        });
        break;
      case "autumn":
        state.particles.push({
          pos: { x: px, y: 5 + Math.random() * 8, z: pz },
          vel: { x: (Math.random() - 0.5) * 3, y: -1 - Math.random(), z: (Math.random() - 0.5) * 3 },
          life: 4, maxLife: 4, color: [0xcc6622, 0xaa4411, 0xddaa22][Math.floor(Math.random() * 3)], size: 0.2, type: "leaf",
        });
        break;
      case "winter":
        state.particles.push({
          pos: { x: px, y: 6 + Math.random() * 6, z: pz },
          vel: { x: (Math.random() - 0.5) * 2, y: -1 - Math.random() * 0.5, z: (Math.random() - 0.5) * 2 },
          life: 5, maxLife: 5, color: 0xeeeeff, size: 0.12, type: "snow",
        });
        break;
    }
  }

  // Wildfire ambient embers
  if (state.waveModifier === "wildfire" && Math.random() < dt * 30) {
    const px = state.player.pos.x + (Math.random() - 0.5) * 20;
    const pz = state.player.pos.z + (Math.random() - 0.5) * 20;
    state.particles.push({
      pos: { x: px, y: 0.2, z: pz },
      vel: { x: (Math.random() - 0.5) * 2, y: 2 + Math.random() * 3, z: (Math.random() - 0.5) * 2 },
      life: 1.5, maxLife: 1.5, color: 0xff4422, size: 0.15, type: "ember",
    });
  }
}

// ---- Notifications ----

export function updateNotifications(state: ForestState, dt: number): void {
  for (let i = state.notifications.length - 1; i >= 0; i--) {
    state.notifications[i].timer -= dt;
    if (state.notifications[i].timer <= 0) state.notifications.splice(i, 1);
  }
  if (state.screenFlash.timer > 0) state.screenFlash.timer -= dt;
  if (state.screenShake > 0) {
    state.screenShake -= dt;
    if (state.screenShake <= 0) state.screenShakeIntensity = 0;
  }
  if (state.waveTitle.timer > 0) state.waveTitle.timer -= dt;
}

// ---- Season System ----

export function updateSeason(state: ForestState, dt: number): void {
  if (state.phase !== "playing") return;

  if (state.seasonTransition === "transitioning") {
    state.transitionTimer -= dt;
    if (state.transitionTimer <= 0) {
      state.season = state.nextSeason;
      state.seasonTransition = "active";
      const durations: Record<Season, number> = {
        spring: FOREST.SPRING_DURATION,
        summer: FOREST.SUMMER_DURATION,
        autumn: FOREST.AUTUMN_DURATION,
        winter: FOREST.WINTER_DURATION,
      };
      state.seasonTimer = durations[state.season];
      addNotification(state, `${state.season.toUpperCase()} HAS ARRIVED`, {
        spring: 0x88ff88, summer: 0xffaa44, autumn: 0xcc8833, winter: 0x88ccff,
      }[state.season]);
      flashScreen(state, {
        spring: "#88ff88", summer: "#ffaa44", autumn: "#cc8833", winter: "#88ccff",
      }[state.season], 0.2, 0.3);
    }
    return;
  }

  state.seasonTimer -= dt;
  if (state.seasonTimer <= 0) {
    const order: Season[] = ["spring", "summer", "autumn", "winter"];
    const idx = order.indexOf(state.season);
    state.nextSeason = order[(idx + 1) % 4];
    state.seasonTransition = "transitioning";
    state.transitionTimer = FOREST.TRANSITION_DURATION;
  }
}

// ---- Wave Modifier Effects (per-tick) ----

export function updateWaveModifiers(state: ForestState, dt: number): void {
  if (state.phase !== "playing") return;

  // Wildfire: periodic DoT to player, groves, and enemies
  if (state.waveModifier === "wildfire") {
    state.wildfireDotTimer -= dt;
    if (state.wildfireDotTimer <= 0) {
      state.wildfireDotTimer = FOREST.WILDFIRE_DOT_INTERVAL;
      // Player
      if (state.player.hp > 0 && state.player.action !== "root_travelling") {
        state.player.hp -= FOREST.WILDFIRE_PLAYER_DAMAGE;
        if (state.player.hp <= 0) {
          state.player.hp = 0;
          state.player.action = "dead";
          state.deathSequenceTimer = FOREST.DEATH_SLOW_MO_DURATION;
        }
      }
      // Groves
      for (const grove of state.groves) {
        if (grove.status !== "corrupted") {
          grove.hp -= FOREST.WILDFIRE_GROVE_DAMAGE;
          if (grove.hp <= 0) {
            grove.hp = 0;
            grove.status = "corrupted";
            grove.purifyProgress = 0;
            state.stats.grovesLost++;
            state.corruption = Math.min(1, state.corruption + 0.1);
          }
        }
      }
      // Enemies (wildfire hurts everyone)
      for (const [, e] of state.enemies) {
        if (e.behavior !== "dead") {
          e.hp -= FOREST.WILDFIRE_DOT_DAMAGE;
          if (e.hp <= 0) killEnemy(state, e);
        }
      }
    }
  }
}

// ---- Spawn System ----

export function updateSpawnQueue(state: ForestState, dt: number): void {
  if (state.phase !== "playing" || state.spawnQueue.length === 0) return;

  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    state.spawnTimer = FOREST.SPAWN_INTERVAL;
    const batch = Math.min(FOREST.SPAWN_BATCH_SIZE, state.spawnQueue.length);
    for (let i = 0; i < batch; i++) {
      const entry = state.spawnQueue.shift()!;
      const angle = Math.random() * Math.PI * 2;
      const pos: Vec3 = { x: Math.cos(angle) * FOREST.ENEMY_SPAWN_RADIUS, y: 0, z: Math.sin(angle) * FOREST.ENEMY_SPAWN_RADIUS };
      spawnEnemy(state, entry.type, pos, entry.targetGroveIdx);
    }
  }
}

function spawnEnemy(state: ForestState, type: EnemyType, pos: Vec3, targetGroveIdx: number): void {
  const diff = getDiff(state);
  const corruption = getCorruptionBuff(state);

  let hp: number, damage: number, speed: number;
  switch (type) {
    case "rot_archer": hp = FOREST.ROT_ARCHER_HP; damage = FOREST.ROT_ARCHER_DAMAGE; speed = FOREST.ROT_ARCHER_SPEED; break;
    case "bark_golem": hp = FOREST.BARK_GOLEM_HP; damage = FOREST.BARK_GOLEM_DAMAGE; speed = FOREST.BARK_GOLEM_SPEED; break;
    case "shadow_stag": hp = FOREST.SHADOW_STAG_HP; damage = FOREST.SHADOW_STAG_DAMAGE; speed = FOREST.SHADOW_STAG_SPEED; break;
    case "blight_mother": hp = FOREST.BLIGHT_MOTHER_HP; damage = FOREST.BLIGHT_MOTHER_DAMAGE; speed = FOREST.BLIGHT_MOTHER_SPEED; break;
    case "wisp_corruptor": hp = FOREST.WISP_CORRUPTOR_HP; damage = FOREST.WISP_CORRUPTOR_DAMAGE; speed = FOREST.WISP_CORRUPTOR_SPEED; break;
    case "corruption_avatar": hp = 800; damage = 40; speed = 1.8; break;
    default: hp = FOREST.BLIGHTLING_HP; damage = FOREST.BLIGHTLING_DAMAGE; speed = FOREST.BLIGHTLING_SPEED; break;
  }

  const enemy: Enemy = {
    id: genForestId(state), type,
    pos: { ...pos }, vel: { x: 0, y: 0, z: 0 }, rotation: 0,
    hp: hp * diff.enemyHp * corruption, maxHp: hp * diff.enemyHp * corruption,
    damage: damage * corruption, speed,
    behavior: "approaching", attackTimer: 0, stunTimer: 0, deathTimer: 0,
    target: targetGroveIdx >= 0 ? "grove" : "oak", targetGroveIdx,
    flying: type === "wisp_corruptor",
    colorVariant: Math.random(), hitFlash: 0, bobPhase: Math.random() * Math.PI * 2,
    fireCD: 0, chargeCD: 0, chargeTimer: 0, chargeDir: { x: 0, y: 0, z: 0 },
    leapCD: 0, leapTimer: 0, slamCD: 0, spawnCD: 0, healCD: 0, snaredTimer: 0,
    bossPhase: 0, spitCD: 0,
    knockbackVel: { x: 0, y: 0, z: 0 }, knockbackTimer: 0,
  };

  state.enemies.set(enemy.id, enemy);
}

// ---- Wave / Phase Management ----

export function updatePhase(state: ForestState, dt: number): void {
  if (state.phase === "menu" || state.phase === "game_over") return;

  if (state.deathSequenceTimer > 0) {
    state.deathSequenceTimer -= dt;
    if (state.deathSequenceTimer <= 0) {
      state.phase = "game_over";
      state.bestWave = Math.max(state.bestWave, state.wave);
    }
    return;
  }

  if (state.greatOak.hp <= 0) {
    state.phase = "game_over";
    state.bestWave = Math.max(state.bestWave, state.wave);
    addNotification(state, "THE GREAT OAK HAS FALLEN", 0xff2222);
    return;
  }

  // Track time survived
  if (state.phase === "playing") {
    state.timeSurvived += dt;
  }

  // Track grove threats
  state.groveUnderAttack = [];
  for (const [, e] of state.enemies) {
    if (e.behavior === "dead") continue;
    if (e.target === "grove" && e.targetGroveIdx >= 0) {
      const grove = state.groves[e.targetGroveIdx];
      if (grove && grove.status !== "corrupted" && distXZ(e.pos, grove.pos) < FOREST.GROVE_RADIUS + 8) {
        if (!state.groveUnderAttack.includes(e.targetGroveIdx)) {
          state.groveUnderAttack.push(e.targetGroveIdx);
        }
      }
    }
  }

  // Update objective progress
  if (state.objective.active && state.phase === "playing") {
    if (state.objective.type === "speed_clear") {
      state.objective.timer -= dt;
      if (state.objective.timer <= 0) {
        state.objective.active = false;
        addNotification(state, "OBJECTIVE FAILED", 0xff4444);
      }
    }
  }

  // Buff ticking (reduce temporary buff durations)
  for (let i = state.activeBuffs.length - 1; i >= 0; i--) {
    const b = state.activeBuffs[i];
    if (b.remaining > 0) {
      b.remaining -= dt;
      if (b.remaining <= 0) {
        // Remove expired buff and undo effects
        if (b.id === "stone_heart") {
          state.player.maxHp -= 40;
          state.player.hp = Math.min(state.player.hp, state.player.maxHp);
        }
        state.activeBuffs.splice(i, 1);
        addNotification(state, `${b.name} expired`, 0x888888);
      }
    }
  }

  // Thorn aura buff: damage nearby enemies
  if (hasBuff(state, "thorn_aura") && state.phase === "playing") {
    for (const [, e] of state.enemies) {
      if (e.behavior === "dead") continue;
      if (distXZ(state.player.pos, e.pos) < 4) {
        e.hp -= 3 * dt;
        if (e.hp <= 0) killEnemy(state, e);
      }
    }
  }

  // Wild growth buff: groves regen during combat
  if (hasBuff(state, "wild_growth") && state.phase === "playing") {
    for (const grove of state.groves) {
      if (grove.status === "pure" && grove.hp < grove.maxHp) {
        grove.hp = Math.min(grove.maxHp, grove.hp + 5 * dt);
      }
    }
  }

  if (state.phase === "playing") {
    let allDead = state.spawnQueue.length === 0;
    if (allDead) {
      for (const [, e] of state.enemies) {
        if (e.behavior !== "dead") { allDead = false; break; }
      }
    }
    // Blitz timer check
    if (state.challengeType === "blitz" && state.objective.active && state.objective.timer <= 0) {
      allDead = true; // end wave when blitz timer expires
    }
    if (allDead) {
      // Check objective completion
      if (state.objective.active) {
        const obj = state.objective;
        if (obj.progress >= obj.target) {
          state.player.essence += obj.reward;
          addNotification(state, `OBJECTIVE COMPLETE! +${obj.reward} ESS`, 0xffee44);
          flashScreen(state, "#ffee44", 0.2, 0.15);
        }
        state.objective.active = false;
      }
      state.corruption = Math.min(1, state.corruption + FOREST.CORRUPTION_PER_WAVE);

      // Offer buff choices every 2 waves
      if (state.wave >= 2 && state.wave % 2 === 0) {
        state.buffSelectActive = true;
        state.buffChoices = pickBuffChoices(state);
      }

      state.phase = "intermission";
      state.phaseTimer = 12;
      addNotification(state, "WAVE CLEAR", 0x44ff88);
      flashScreen(state, "#44ff88", 0.2, 0.2);
    }
  }

  if (state.phase === "intermission") {
    state.phaseTimer -= dt;
    for (const grove of state.groves) {
      if (grove.status === "pure" && grove.hp < grove.maxHp) {
        const groveRegen = 5 + state.player.groveLevel * 2;
        grove.hp = Math.min(grove.maxHp, grove.hp + groveRegen * dt);
      }
    }
    if (state.phaseTimer <= 0 && !state.buffSelectActive) {
      startNextWave(state);
    }
  }
}

// ---- Buff Helpers ----

function hasBuff(state: ForestState, id: BuffId): boolean {
  return state.activeBuffs.some(b => b.id === id);
}

export function getBuffDamageMult(state: ForestState): number {
  return hasBuff(state, "verdant_fury") ? 1.35 : 1.0;
}

export function getBuffDR(state: ForestState): number {
  return hasBuff(state, "iron_bark") ? 0.2 : 0;
}

export function getBuffSpeedMult(state: ForestState): number {
  return hasBuff(state, "swift_roots") ? 1.25 : 1.0;
}

export function getBuffEssenceMult(state: ForestState): number {
  return hasBuff(state, "essence_bloom") ? 1.5 : 1.0;
}

export function applyBuff(state: ForestState, buffId: BuffId): void {
  const def = BUFF_POOL.find(b => b.id === buffId);
  if (!def) return;
  // Don't stack same buff
  const existing = state.activeBuffs.find(b => b.id === buffId);
  if (existing) {
    if (existing.remaining > 0) existing.remaining = def.duration * 100; // refresh to waves
    return;
  }
  const waveDuration = def.duration === -1 ? -1 : def.duration * 100; // 100s per "wave"
  state.activeBuffs.push({
    id: def.id, name: def.name, description: def.description,
    duration: def.duration, remaining: waveDuration,
  });
  // Immediate effects
  if (buffId === "stone_heart") {
    state.player.maxHp += 40;
    state.player.hp += 40;
  }
  addNotification(state, `BUFF: ${def.name}`, 0x88ff88);
}

function pickBuffChoices(state: ForestState): typeof BUFF_POOL {
  const pool = BUFF_POOL.filter(b => !state.activeBuffs.some(ab => ab.id === b.id && ab.duration === -1));
  const choices: typeof BUFF_POOL = [];
  const copy = [...pool];
  for (let i = 0; i < 3 && copy.length > 0; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    choices.push(copy[idx]);
    copy.splice(idx, 1);
  }
  return choices;
}

// ---- Challenge & Objective Generation ----

function pickChallengeType(wave: number, state: ForestState): ChallengeType {
  if (wave % FOREST.BOSS_EVERY_N_WAVES === 0) return "boss_duel";
  if (wave < 3) return "normal";
  const types: ChallengeType[] = ["normal", "normal", "elite_rush", "blitz"];
  // Only add grove_siege if there are pure groves to defend
  const pureGroves = state.groves.filter(g => g.status !== "corrupted");
  if (pureGroves.length >= 2) types.push("grove_siege");
  return types[Math.floor(Math.random() * types.length)];
}

function generateObjective(state: ForestState): void {
  const wave = state.wave;
  if (wave < 2 || wave % 3 !== 0) {
    state.objective.active = false;
    return;
  }
  const types: ObjectiveType[] = ["kills", "speed_clear", "grove_defense", "parry_kills"];
  const type = types[Math.floor(Math.random() * types.length)];
  const reward = 5 + Math.floor(wave * 1.5);

  switch (type) {
    case "kills":
      state.objective = { description: `Kill ${10 + wave} enemies`, type, progress: 0, target: 10 + wave, reward, active: true, timer: 0 };
      break;
    case "speed_clear":
      state.objective = { description: "Clear wave in 40s", type, progress: 0, target: 1, reward: reward + 3, active: true, timer: 40 };
      break;
    case "grove_defense":
      state.objective = { description: "No groves lost this wave", type, progress: 0, target: 1, reward: reward + 5, active: true, timer: 0 };
      break;
    case "parry_kills":
      state.objective = { description: `Parry-stun ${3} enemies`, type, progress: 0, target: 3, reward: reward + 2, active: true, timer: 0 };
      break;
  }
  addNotification(state, `OBJECTIVE: ${state.objective.description} (+${reward} ess)`, 0xffee44);
}

function startNextWave(state: ForestState): void {
  state.wave++;
  state.phase = "playing";
  state.spawnTimer = 0;
  state.enemiesKilled = 0;
  state.wildfireDotTimer = FOREST.WILDFIRE_DOT_INTERVAL;

  const diff = getDiff(state);
  const baseCount = Math.floor((FOREST.WAVE_BASE_ENEMIES + state.wave * FOREST.WAVE_ENEMY_SCALE) * diff.enemyCount);

  // Challenge type
  state.challengeType = pickChallengeType(state.wave, state);

  // Wave modifier
  state.waveModifier = "none";
  if (state.wave >= FOREST.MODIFIER_START_WAVE && state.challengeType === "normal") {
    const mods: WaveModifier[] = ["blood_blight", "deep_fog", "swarm", "frostbite", "wildfire"];
    if (Math.random() < 0.35) {
      state.waveModifier = mods[Math.floor(Math.random() * mods.length)];
    }
  }

  // Build spawn queue based on challenge type
  state.spawnQueue = [];

  switch (state.challengeType) {
    case "elite_rush":
      // All shadow stags + a few archers
      for (let i = 0; i < baseCount; i++) {
        state.spawnQueue.push({ type: Math.random() < 0.7 ? "shadow_stag" : "rot_archer", delay: 0, targetGroveIdx: -1 });
      }
      break;

    case "boss_duel":
      // Boss + minimal support
      const bossCount = Math.max(1, Math.floor(state.wave / FOREST.BOSS_EVERY_N_WAVES));
      for (let b = 0; b < bossCount; b++) {
        state.spawnQueue.push({ type: "blight_mother", delay: 0, targetGroveIdx: -1 });
      }
      for (let i = 0; i < 4; i++) {
        state.spawnQueue.push({ type: "blightling", delay: 0, targetGroveIdx: -1 });
      }
      // Wave 20+ gets Corruption Avatar
      if (state.wave >= 20) {
        state.spawnQueue.push({ type: "corruption_avatar", delay: 0, targetGroveIdx: -1 });
        addNotification(state, "CORRUPTION AVATAR APPROACHES!", 0xff2222);
      }
      addNotification(state, "BOSS INCOMING!", 0xff4444);
      break;

    case "grove_siege":
      // All enemies target groves
      for (let i = 0; i < baseCount + 4; i++) {
        const types = getAvailableTypes(state.wave);
        const type = types[Math.floor(Math.random() * types.length)];
        const pureGroves = state.groves.map((g, idx) => ({ g, idx })).filter(gi => gi.g.status !== "corrupted");
        const targetGrove = pureGroves.length > 0 ? pureGroves[Math.floor(Math.random() * pureGroves.length)].idx : -1;
        state.spawnQueue.push({ type, delay: 0, targetGroveIdx: targetGrove });
      }
      break;

    case "blitz":
      // Many weak enemies, time limit
      for (let i = 0; i < baseCount * 2; i++) {
        state.spawnQueue.push({ type: "blightling", delay: 0, targetGroveIdx: -1 });
      }
      break;

    default: // normal
      for (let i = 0; i < baseCount; i++) {
        const types = getAvailableTypes(state.wave);
        const type = types[Math.floor(Math.random() * types.length)];
        const pureGroves = state.groves.map((g, idx) => ({ g, idx })).filter(gi => gi.g.status !== "corrupted");
        let targetGrove = -1;
        if (pureGroves.length > 0 && Math.random() < 0.5) {
          targetGrove = pureGroves[Math.floor(Math.random() * pureGroves.length)].idx;
        }
        state.spawnQueue.push({ type, delay: 0, targetGroveIdx: targetGrove });
      }
      if (state.wave % FOREST.BOSS_EVERY_N_WAVES === 0) {
        state.spawnQueue.push({ type: "blight_mother", delay: 0, targetGroveIdx: -1 });
        addNotification(state, "BOSS INCOMING!", 0xff4444);
      }
      break;
  }

  // Swarm modifier
  if (state.waveModifier === "swarm") {
    for (let i = 0; i < baseCount; i++) {
      state.spawnQueue.push({ type: "blightling", delay: 0, targetGroveIdx: -1 });
    }
  }

  // Generate objective
  generateObjective(state);

  // Wave title
  const modName = WAVE_MODIFIER_NAMES[state.waveModifier];
  const modColor = "#" + WAVE_MODIFIER_COLORS[state.waveModifier].toString(16).padStart(6, "0");
  const challengeName = CHALLENGE_NAMES[state.challengeType];

  let titleText = `WAVE ${state.wave}`;
  if (challengeName) titleText += ` — ${challengeName}`;
  else if (modName) titleText += ` — ${modName}`;

  state.waveTitle = {
    text: titleText,
    timer: 3.0,
    color: challengeName ? "#ff8844" : modName ? modColor : "#88ff88",
  };

  const modDescs: Record<string, string> = {
    blood_blight: "Enemies lifesteal & deal +20% DMG",
    deep_fog: "Thick fog limits visibility",
    swarm: "Double blightling count",
    frostbite: "You're slower, enemies have armor, freeze chance on hit",
    wildfire: "Fire damages everything — you, groves, and enemies",
  };
  if (modDescs[state.waveModifier]) {
    addNotification(state, modDescs[state.waveModifier], WAVE_MODIFIER_COLORS[state.waveModifier]);
  }
}

function getAvailableTypes(wave: number): EnemyType[] {
  const types: EnemyType[] = ["blightling"];
  types.push("rot_archer");
  if (wave >= FOREST.SHADOW_STAG_START_WAVE) types.push("shadow_stag");
  if (wave >= FOREST.BARK_GOLEM_START_WAVE) types.push("bark_golem");
  if (wave >= FOREST.WISP_CORRUPTOR_START_WAVE) types.push("wisp_corruptor");
  return types;
}

// ---- Corruption ----

export function updateCorruption(state: ForestState): void {
  const corruptThreshold = state.corruption;
  for (const tree of state.trees) {
    const d = Math.sqrt(tree.pos.x * tree.pos.x + tree.pos.z * tree.pos.z);
    const normalizedDist = d / (FOREST.GROUND_SIZE * 0.5);
    tree.corrupted = normalizedDist > (1 - corruptThreshold * 1.2);
  }

  // High corruption (>80%): corrupted trees damage nearby enemies instead
  if (state.corruption > 0.8 && state.phase === "playing") {
    for (const tree of state.trees) {
      if (!tree.corrupted) continue;
      for (const [, e] of state.enemies) {
        if (e.behavior === "dead") continue;
        if (distXZ({ x: tree.pos.x, y: 0, z: tree.pos.z }, e.pos) < 3) {
          e.hp -= 2 * 0.016; // ~2 HP/sec at 60fps, approximation
          if (e.hp <= 0) killEnemy(state, e);
        }
      }
    }
  }
}
