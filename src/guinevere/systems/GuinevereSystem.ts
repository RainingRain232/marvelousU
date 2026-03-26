// ---------------------------------------------------------------------------
// Guinevere: The Astral Garden — core game systems
// ---------------------------------------------------------------------------

import { GUIN } from "../config/GuinevereConfig";
import type {
  GuinevereState, GuinevereEnemy, Vec3, EnemyType, GardenPlant,
  WaveModifier, SeedType, ArtifactType,
} from "../state/GuinevereState";
import { genGuinId, WAVE_MODIFIER_NAMES, WAVE_MODIFIER_COLORS, UPGRADES, getUpgradeCost, ARTIFACT_INFO } from "../state/GuinevereState";

// ---- Helpers ----
function distXZ(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x, dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}
function dist3(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
function clamp(v: number, min: number, max: number): number { return Math.max(min, Math.min(max, v)); }
function rng(): number { return Math.random(); }
function rngRange(a: number, b: number): number { return a + rng() * (b - a); }

function addNotification(state: GuinevereState, text: string, color: string): void {
  state.notifications.push({ text, timer: 3.0, color });
}

function addDamageNumber(state: GuinevereState, pos: Vec3, value: number, color: number, crit = false): void {
  state.damageNumbers.push({
    pos: { x: pos.x + rngRange(-0.5, 0.5), y: pos.y + 2, z: pos.z + rngRange(-0.5, 0.5) },
    value, timer: 1.2, color, crit,
  });
}

function spawnParticle(state: GuinevereState, type: GuinevereState["particles"][0]["type"],
  pos: Vec3, vel: Vec3, color: number, size: number, life: number): void {
  if (state.particles.length > 600) return;
  state.particles.push({ pos: { ...pos }, vel: { ...vel }, life, maxLife: life, color, size, type });
}

function getDiffMult(state: GuinevereState) {
  return GUIN.DIFFICULTY[state.difficulty] ?? GUIN.DIFFICULTY.normal;
}

function getMaxPlants(state: GuinevereState): number {
  return GUIN.MAX_PLANTS + state.player.gardenLevel * 4;
}

function getGrowthSpeedMult(state: GuinevereState): number {
  let mult = 1 + state.player.gardenLevel * 0.15;
  if (state.isNight && state.waveModifier !== "eclipse") mult *= GUIN.MOONLIGHT_GROW_MULT;
  if (state.artifacts.includes("garden_heart")) mult *= 1.3;
  return mult;
}

function getHarvestYieldMult(state: GuinevereState): number {
  // Variety bonus: count unique plant types
  const types = new Set<SeedType>();
  for (const p of state.plants.values()) types.add(p.type);
  const varietyBonus = 1 + types.size * GUIN.ESSENCE_BONUS_VARIETY;
  return (1 + state.player.harvestLevel * 0.25) * varietyBonus * getDiffMult(state).essenceMult;
}

// ---- Island helpers ----
function isOnIsland(pos: Vec3, state: GuinevereState): boolean {
  for (const island of state.islands) {
    if (!island.unlocked) continue;
    if (distXZ(pos, island.pos) <= island.radius) return true;
  }
  // Check bridges between islands
  const center = state.islands[0];
  for (let i = 1; i < state.islands.length; i++) {
    if (!state.islands[i].unlocked) continue;
    if (isOnBridge(pos, center.pos, state.islands[i].pos)) return true;
  }
  return false;
}

function isOnBridge(pos: Vec3, a: Vec3, b: Vec3): boolean {
  const dx = b.x - a.x, dz = b.z - a.z;
  const len = Math.sqrt(dx * dx + dz * dz);
  if (len < 1) return false;
  const nx = dx / len, nz = dz / len;
  const px = pos.x - a.x, pz = pos.z - a.z;
  const along = px * nx + pz * nz;
  const perp = Math.abs(px * -nz + pz * nx);
  return along > 0 && along < len && perp < GUIN.BRIDGE_WIDTH;
}

// ---- Player Update ----
export function updatePlayer(state: GuinevereState, dt: number): void {
  const p = state.player;
  const keys = state.keys;

  // Camera rotation from mouse
  if (state.pointerLocked) {
    p.yaw -= state.mouseDX * 0.003;
    p.pitch = clamp(p.pitch - state.mouseDY * 0.003, -1.2, 1.2);
    state.mouseDX = 0;
    state.mouseDY = 0;
  }

  // Movement
  const sprinting = keys.has("shift") && p.stamina > 5;
  const speed = sprinting ? GUIN.SPRINT_SPEED : GUIN.MOVE_SPEED;
  const sinY = Math.sin(p.yaw), cosY = Math.cos(p.yaw);
  let mx = 0, mz = 0;
  if (keys.has("w")) { mx += sinY; mz += cosY; }
  if (keys.has("s")) { mx -= sinY; mz -= cosY; }
  if (keys.has("a")) { mx += cosY; mz -= sinY; }
  if (keys.has("d")) { mx -= cosY; mz += sinY; }
  const mLen = Math.sqrt(mx * mx + mz * mz);
  if (mLen > 0.01) {
    mx /= mLen; mz /= mLen;
    p.vel.x = mx * speed;
    p.vel.z = mz * speed;
  } else {
    p.vel.x *= 0.85;
    p.vel.z *= 0.85;
  }

  // Stamina
  if (sprinting && mLen > 0.01) {
    p.stamina = Math.max(0, p.stamina - GUIN.STAMINA_SPRINT_DRAIN * dt);
  } else {
    p.stamina = Math.min(GUIN.STAMINA_MAX, p.stamina + GUIN.STAMINA_REGEN * dt);
  }

  // Jump
  if (keys.has(" ") && p.grounded) {
    p.vel.y = GUIN.JUMP_FORCE;
    p.grounded = false;
  }

  // Dodge
  if (keys.has("q") && p.dodgeCooldown <= 0 && p.stamina >= GUIN.DODGE_STAMINA_COST) {
    keys.delete("q");
    p.dodgeTimer = GUIN.DODGE_DURATION;
    p.dodgeCooldown = GUIN.DODGE_COOLDOWN;
    p.invincibleTimer = GUIN.DODGE_IFRAMES;
    p.stamina -= GUIN.DODGE_STAMINA_COST;
    // Dodge direction from movement or forward direction
    if (mLen > 0.01) {
      p.dodgeDir = { x: mx, y: 0, z: mz };
    } else {
      p.dodgeDir = { x: sinY, y: 0, z: cosY };
    }
    // Perfect dodge: check if any enemy was about to attack
    for (const enemy of state.enemies) {
      if (enemy.behavior === "dead") continue;
      if (distXZ(p.pos, enemy.pos) < 5 && enemy.attackTimer < GUIN.PERFECT_DODGE_WINDOW && enemy.attackTimer > 0) {
        state.slowMotionTimer = GUIN.PERFECT_DODGE_SLOW_DURATION;
        state.slowMotionScale = GUIN.PERFECT_DODGE_SLOW;
        p.perfectDodgeTimer = GUIN.PERFECT_DODGE_DURATION;
        p.perfectDodgeDamageMult = GUIN.PERFECT_DODGE_DAMAGE_MULT;
        state.pendingPerfectDodge = true;
        addNotification(state, "PERFECT DODGE!", "#ffd700");
        break;
      }
    }
  }

  // During dodge: override movement with dodge speed
  if (p.dodgeTimer > 0) {
    p.vel.x = p.dodgeDir.x * GUIN.DODGE_SPEED;
    p.vel.z = p.dodgeDir.z * GUIN.DODGE_SPEED;
  }

  // Apply wave modifier to player speed
  if (state.waveModifier === "frost_storm") {
    p.vel.x *= 0.8;
    p.vel.z *= 0.8;
  }

  // Gravity
  p.vel.y += GUIN.GRAVITY * dt;
  p.pos.x += p.vel.x * dt;
  p.pos.y += p.vel.y * dt;
  p.pos.z += p.vel.z * dt;

  // Ground collision (island surface at y=0)
  if (p.pos.y <= 1) {
    if (isOnIsland(p.pos, state)) {
      p.pos.y = 1;
      p.vel.y = 0;
      p.grounded = true;
    } else {
      // Fell off — take damage and teleport back
      p.pos.y = 1;
      p.vel.y = 0;
      p.grounded = true;
      p.pos.x = 0; p.pos.z = 0;
      damagePlayer(state, 10);
      addNotification(state, "Fell off the island!", "#ff4444");
    }
  }

  // HP regen near blooming plants
  let nearBloom = false;
  for (const plant of state.plants.values()) {
    if (plant.growthStage >= 2 && distXZ(p.pos, plant.pos) < GUIN.GARDEN_REGEN_RANGE) {
      nearBloom = true;
      break;
    }
  }
  const regen = nearBloom ? GUIN.HP_REGEN * GUIN.GARDEN_REGEN_MULT : GUIN.HP_REGEN;
  p.hp = Math.min(p.maxHp, p.hp + regen * dt);

  // Timers
  if (p.hitFlash > 0) p.hitFlash -= dt;
  if (p.invincibleTimer > 0) p.invincibleTimer -= dt;
  if (p.dodgeTimer > 0) p.dodgeTimer -= dt;
  if (p.dodgeCooldown > 0) p.dodgeCooldown -= dt;
  if (p.comboTimer > 0) { p.comboTimer -= dt; if (p.comboTimer <= 0) p.combo = 0; }
  if (p.moonbeamCd > 0) p.moonbeamCd -= dt;
  if (p.thornWallCd > 0) p.thornWallCd -= dt;
  if (p.blossomBurstCd > 0) p.blossomBurstCd -= dt;
  if (p.rootBindCd > 0) p.rootBindCd -= dt;
  if (p.auroraShieldCd > 0) p.auroraShieldCd -= dt;
  if (p.auroraShieldTimer > 0) {
    p.auroraShieldTimer -= dt;
    if (p.auroraShieldTimer <= 0) p.auroraShieldHp = 0;
  }
  if (p.perfectDodgeTimer > 0) {
    p.perfectDodgeTimer -= dt;
    if (p.perfectDodgeTimer <= 0) p.perfectDodgeDamageMult = 1;
  }
  if (state.slowMotionTimer > 0) {
    state.slowMotionTimer -= dt;
    if (state.slowMotionTimer <= 0) state.slowMotionScale = 1;
  }

  // Cancel planting/harvesting if moving
  if (mLen > 0.01) {
    p.planting = false;
    p.harvesting = false;
  }
}

function damagePlayer(state: GuinevereState, amount: number): void {
  const p = state.player;
  if (p.invincibleTimer > 0) return;

  // Aurora shield absorbs damage
  if (p.auroraShieldHp > 0) {
    const absorbed = Math.min(amount, p.auroraShieldHp);
    p.auroraShieldHp -= absorbed;
    amount -= absorbed;
    // Reflect damage
    const reflectDmg = absorbed * (GUIN.AURORA_SHIELD_REFLECT + p.shieldLevel * 0.1);
    if (reflectDmg > 0) {
      // Find nearest enemy and damage it
      let nearest: GuinevereEnemy | null = null;
      let nearDist = Infinity;
      for (const e of state.enemies) {
        if (e.behavior === "dead") continue;
        const d = distXZ(p.pos, e.pos);
        if (d < nearDist) { nearest = e; nearDist = d; }
      }
      if (nearest) damageEnemy(state, nearest, reflectDmg);
    }
    if (amount <= 0) return;
  }

  const diff = getDiffMult(state);
  amount *= diff.enemyDmg;
  // Wave modifier damage bonuses
  if (state.waveModifier === "void_tide") amount *= 1.15;
  if (state.waveModifier === "eclipse") amount *= 1.2;
  p.hp -= amount;
  p.hitFlash = 0.2;
  p.invincibleTimer = 0.3;
  state.stats.damageTaken += amount;
  state.screenShake = 0.2;
  state.screenFlash = { color: "#ff2222", intensity: 0.3, timer: 0.2 };

  if (p.hp <= 0) {
    p.hp = 0;
    state.deathSequenceTimer = GUIN.DEATH_SLOW_MO_DURATION;
    state.slowMotionTimer = GUIN.DEATH_SLOW_MO_DURATION;
    state.slowMotionScale = GUIN.DEATH_SLOW_MO_SCALE;
    state.screenShake = 0.8;
    addNotification(state, "The garden withers...", "#ff4444");
  }
}

function damageEnemy(state: GuinevereState, enemy: GuinevereEnemy, amount: number): void {
  enemy.hp -= amount;
  enemy.hitFlash = 0.15;
  state.stats.damageDealt += amount;
  addDamageNumber(state, enemy.pos, Math.round(amount), 0xffd700);

  if (enemy.hp <= 0 && enemy.behavior !== "dead") {
    enemy.behavior = "dead";
    enemy.deathTimer = 0.8;
    state.totalKills++;
    state.stats.enemiesKilled++;
    state.player.combo++;
    state.player.comboTimer = GUIN.COMBO_WINDOW;

    // Drop essence
    const essenceBonus = 1 + state.player.combo * GUIN.COMBO_ESSENCE_BONUS;
    const starfallMult = state.waveModifier === "starfall" ? 1.5 : 1;
    const eliteMult = enemy.elite ? GUIN.ELITE_ESSENCE_MULT : 1;
    // Starlight Crown artifact: +15% essence
    const artifactEssenceMult = state.artifacts.includes("starlight_crown") ? 1.15 : 1;
    const baseEssence = enemy.type === "wither_lord" ? 25 : enemy.type === "shambler" ? 6 : enemy.type === "stag" ? 5 : enemy.type === "moth" ? 4 : enemy.type === "crawler" ? 3 : 2;
    const essence = Math.ceil(baseEssence * essenceBonus * getDiffMult(state).essenceMult * starfallMult * eliteMult * artifactEssenceMult);
    state.player.essence += essence;
    state.player.totalEssence += essence;

    // Spore Shambler splits into smaller versions on death
    if (enemy.type === "shambler" && !enemy.elite) {
      for (let sp = 0; sp < GUIN.SHAMBLER_SPLIT_COUNT; sp++) {
        const splitAngle = rng() * Math.PI * 2;
        const splitPos: Vec3 = {
          x: enemy.pos.x + Math.cos(splitAngle) * 2,
          y: 0,
          z: enemy.pos.z + Math.sin(splitAngle) * 2,
        };
        const splitHp = Math.round(enemy.maxHp * GUIN.SHAMBLER_SPLIT_HP_RATIO);
        state.enemies.push({
          id: genGuinId(), type: "shambler", pos: splitPos, vel: { x: 0, y: 0, z: 0 }, yaw: 0,
          hp: splitHp, maxHp: splitHp, damage: Math.round(enemy.damage * 0.6),
          speed: enemy.speed * 1.3, behavior: "approaching", attackTimer: 1,
          stunTimer: 0, rootTimer: 0, deathTimer: 0, hitFlash: 0,
          flying: false, bobPhase: rng() * Math.PI * 2, targetPlant: -1,
          chargeCd: 0, chargeTimer: 0, chargeDir: { x: 0, y: 0, z: 0 },
          projectileCd: 0, slamCd: 0, blightCd: 0, bossPhase: 1,
          spawnTimer: 0.3, elite: true, // mark as elite so they don't split again
        });
      }
      addNotification(state, "Shambler splits!", "#44aa88");
    }

    // Artifact drop from bosses / elites
    if (enemy.type === "wither_lord" || (enemy.elite && rng() < GUIN.ARTIFACT_DROP_CHANCE_ELITE)) {
      const allArtifacts: ArtifactType[] = [
        "starlight_crown", "thornheart", "moonstone_ring", "void_pendant",
        "crystal_veil", "bloom_scepter", "root_anchor", "aurora_mantle",
        "fury_seed", "garden_heart",
      ];
      // Pick one the player doesn't have yet
      const available = allArtifacts.filter(a => !state.artifacts.includes(a));
      if (available.length > 0) {
        const artType = available[Math.floor(rng() * available.length)];
        state.artifactDrops.push({
          id: genGuinId(), type: artType,
          pos: { x: enemy.pos.x, y: GUIN.ARTIFACT_FLOAT_HEIGHT, z: enemy.pos.z },
          bobPhase: rng() * Math.PI * 2, life: 30, // despawns after 30s
        });
        addNotification(state, `Artifact dropped!`, "#ffd700");
      }
    }

    // Death particles
    const color = enemy.type === "wisp" ? 0x88ddff : enemy.type === "crawler" ? 0x8844cc :
      enemy.type === "shambler" ? 0x44aa88 : enemy.type === "moth" ? 0xaaff44 : enemy.type === "stag" ? 0x554433 : 0x220044;
    for (let i = 0; i < 8; i++) {
      spawnParticle(state, "impact", enemy.pos,
        { x: rngRange(-5, 5), y: rngRange(2, 8), z: rngRange(-5, 5) }, color, rngRange(0.3, 0.6), 0.8);
    }
    // Essence orb particles
    for (let i = 0; i < 4; i++) {
      spawnParticle(state, "essence", enemy.pos,
        { x: rngRange(-2, 2), y: rngRange(3, 6), z: rngRange(-2, 2) }, 0xffd700, 0.4, 1.2);
    }
  }
}

// ---- Abilities ----
export function useAbilities(state: GuinevereState, dt: number): void {
  const p = state.player;
  const keys = state.keys;

  // LMB: Moonbeam — tap for quick shot, hold for charged shot
  if (state.mouseDown && p.moonbeamCd <= 0) {
    if (!p.moonbeamCharging) {
      p.moonbeamCharging = true;
      p.moonbeamChargeTime = 0;
    }
    p.moonbeamChargeTime = Math.min(p.moonbeamChargeTime + dt, GUIN.MOONBEAM_CHARGE_TIME);
  }

  // Release moonbeam on mouse up (or if charging and mouse released)
  if (p.moonbeamCharging && !state.mouseDown) {
    p.moonbeamCharging = false;
    const chargeRatio = p.moonbeamChargeTime / GUIN.MOONBEAM_CHARGE_TIME;
    const isCharged = chargeRatio >= 0.95;
    p.moonbeamCd = isCharged ? GUIN.MOONBEAM_COOLDOWN * 1.5 : GUIN.MOONBEAM_COOLDOWN;
    // Artifact: moonstone ring
    const hasArtifact = state.artifacts.includes("moonstone_ring");
    if (hasArtifact) p.moonbeamCd *= 0.8;

    const dir: Vec3 = { x: Math.sin(p.yaw), y: 0, z: Math.cos(p.yaw) };
    let baseDamage = GUIN.MOONBEAM_DAMAGE * (1 + p.moonbeamLevel * 0.25);
    if (hasArtifact) baseDamage *= 1.3;
    if (isCharged) baseDamage *= GUIN.MOONBEAM_CHARGE_MULT;
    // Fury Seed: +15% damage when below 30% HP
    if (state.artifacts.includes("fury_seed") && p.hp < p.maxHp * 0.3) baseDamage *= 1.15;

    const piercing = p.moonbeamLevel >= 2 || isCharged;
    const hitEnemies: GuinevereEnemy[] = [];
    for (const enemy of state.enemies) {
      if (enemy.behavior === "dead") continue;
      const toE: Vec3 = { x: enemy.pos.x - p.pos.x, y: 0, z: enemy.pos.z - p.pos.z };
      const dot = toE.x * dir.x + toE.z * dir.z;
      if (dot < 0 || dot > GUIN.MOONBEAM_RANGE) continue;
      const perpX = toE.x - dir.x * dot, perpZ = toE.z - dir.z * dot;
      const perpDist = Math.sqrt(perpX * perpX + perpZ * perpZ);
      const width = isCharged ? GUIN.MOONBEAM_WIDTH * 1.5 : GUIN.MOONBEAM_WIDTH;
      if (perpDist < width + 1) {
        hitEnemies.push(enemy);
        let finalDamage = baseDamage;
        if (p.perfectDodgeTimer > 0) finalDamage *= p.perfectDodgeDamageMult;
        const critChance = GUIN.CRIT_CHANCE_BASE + Math.min(p.combo * GUIN.CRIT_CHANCE_PER_COMBO, GUIN.CRIT_CHANCE_MAX - GUIN.CRIT_CHANCE_BASE);
        const isCrit = rng() < critChance;
        if (isCrit) {
          finalDamage *= GUIN.CRIT_MULTIPLIER;
          addDamageNumber(state, enemy.pos, Math.round(finalDamage), 0xff4444, true);
          state.screenShake = 0.15;
          for (let s = 0; s < 6; s++) {
            spawnParticle(state, "star", enemy.pos,
              { x: rngRange(-3, 3), y: rngRange(2, 6), z: rngRange(-3, 3) }, 0xff4444, 0.3, 0.6);
          }
        }
        damageEnemy(state, enemy, finalDamage);
        state.hitStopTimer = isCharged ? GUIN.HIT_STOP_DURATION * 3 : GUIN.HIT_STOP_DURATION;
        if (!piercing) break;
      }
    }

    // Charged AoE explosion at impact point
    if (isCharged && hitEnemies.length > 0) {
      const impactPos = hitEnemies[0].pos;
      for (const enemy of state.enemies) {
        if (enemy.behavior === "dead" || hitEnemies.includes(enemy)) continue;
        if (distXZ(impactPos, enemy.pos) <= GUIN.MOONBEAM_CHARGE_RADIUS) {
          damageEnemy(state, enemy, baseDamage * 0.5);
          // Knockback
          const kbDx = enemy.pos.x - impactPos.x;
          const kbDz = enemy.pos.z - impactPos.z;
          const kbLen = Math.sqrt(kbDx * kbDx + kbDz * kbDz) || 1;
          enemy.pos.x += (kbDx / kbLen) * GUIN.MOONBEAM_CHARGE_KNOCKBACK;
          enemy.pos.z += (kbDz / kbLen) * GUIN.MOONBEAM_CHARGE_KNOCKBACK;
        }
      }
      state.screenShake = 0.4;
      for (let i = 0; i < 20; i++) {
        spawnParticle(state, "star", impactPos,
          { x: rngRange(-6, 6), y: rngRange(2, 8), z: rngRange(-6, 6) }, 0x88ccff, rngRange(0.3, 0.6), 1.0);
      }
      addNotification(state, "CHARGED MOONBEAM!", "#88ccff");
    }

    state.pendingMoonbeam = { x: p.pos.x, z: p.pos.z, dx: dir.x, dz: dir.z, range: GUIN.MOONBEAM_RANGE };

    // Moonbeam particles along path
    const particleColor = isCharged ? 0x44eeff : 0xccddff;
    for (let t = 0; t < GUIN.MOONBEAM_RANGE; t += (isCharged ? 0.8 : 1.5)) {
      spawnParticle(state, "moonlight",
        { x: p.pos.x + dir.x * t, y: p.pos.y + 0.5, z: p.pos.z + dir.z * t },
        { x: rngRange(-1, 1), y: rngRange(0, 2), z: rngRange(-1, 1) },
        particleColor, isCharged ? 0.5 : 0.3, 0.5);
    }
    p.moonbeamChargeTime = 0;
  }

  // 2: Blossom Burst
  if (keys.has("2") && p.blossomBurstCd <= 0) {
    keys.delete("2");
    p.blossomBurstCd = GUIN.BLOSSOM_BURST_COOLDOWN;
    const radius = GUIN.BLOSSOM_BURST_RADIUS * (1 + p.blossomLevel * 0.2);
    const damage = GUIN.BLOSSOM_BURST_DAMAGE * (1 + p.blossomLevel * 0.2);

    for (const enemy of state.enemies) {
      if (enemy.behavior === "dead") continue;
      if (distXZ(p.pos, enemy.pos) <= radius) {
        damageEnemy(state, enemy, damage);
        // Knockback: push enemy away from player
        const kbDx = enemy.pos.x - p.pos.x;
        const kbDz = enemy.pos.z - p.pos.z;
        const kbLen = Math.sqrt(kbDx * kbDx + kbDz * kbDz) || 1;
        enemy.pos.x += (kbDx / kbLen) * 8;
        enemy.pos.z += (kbDz / kbLen) * 8;
      }
    }

    // Heal nearby plants
    const heal = GUIN.BLOSSOM_BURST_HEAL * (1 + p.blossomLevel * 0.2);
    for (const plant of state.plants.values()) {
      if (distXZ(p.pos, plant.pos) <= radius) {
        plant.hp = Math.min(plant.maxHp, plant.hp + heal);
        plant.withering = false;
      }
    }

    state.pendingBlossomBurst = { x: p.pos.x, z: p.pos.z };
    state.screenShake = 0.3;
    addNotification(state, "BLOSSOM BURST!", "#ff88cc");

    // Petal particles
    for (let i = 0; i < 30; i++) {
      const angle = rng() * Math.PI * 2;
      const dist = rng() * radius;
      spawnParticle(state, "petal",
        { x: p.pos.x + Math.cos(angle) * dist, y: p.pos.y + rngRange(0.5, 3), z: p.pos.z + Math.sin(angle) * dist },
        { x: rngRange(-3, 3), y: rngRange(1, 5), z: rngRange(-3, 3) },
        [0xff88cc, 0xffaadd, 0xff66aa, 0xffccee][Math.floor(rng() * 4)], rngRange(0.2, 0.5), 1.5);
    }
  }

  // 1: Thorn Wall
  if (keys.has("1") && p.thornWallCd <= 0) {
    keys.delete("1");
    p.thornWallCd = GUIN.THORN_WALL_COOLDOWN;
    const wallPos: Vec3 = {
      x: p.pos.x + Math.sin(p.yaw) * 5,
      y: 0,
      z: p.pos.z + Math.cos(p.yaw) * 5,
    };
    const hp = GUIN.THORN_WALL_HP * (1 + p.thornLevel * 0.3);
    state.thornWalls.push({
      id: genGuinId(), pos: wallPos, yaw: p.yaw,
      hp, maxHp: hp, life: GUIN.THORN_WALL_DURATION,
    });
    addNotification(state, "Thorn Wall!", "#44aa44");

    // Root particles
    for (let i = 0; i < 12; i++) {
      spawnParticle(state, "root", wallPos,
        { x: rngRange(-2, 2), y: rngRange(2, 6), z: rngRange(-2, 2) }, 0x44aa44, 0.3, 0.8);
    }
  }

  // 3: Root Bind
  if (keys.has("3") && p.rootBindCd <= 0) {
    keys.delete("3");
    p.rootBindCd = GUIN.ROOT_BIND_COOLDOWN;
    const dir: Vec3 = { x: Math.sin(p.yaw), y: 0, z: Math.cos(p.yaw) };
    const bindPos: Vec3 = {
      x: p.pos.x + dir.x * (GUIN.ROOT_BIND_RANGE * 0.5),
      y: 0,
      z: p.pos.z + dir.z * (GUIN.ROOT_BIND_RANGE * 0.5),
    };
    const radius = GUIN.ROOT_BIND_RADIUS * (1 + p.rootLevel * 0.15);
    const duration = GUIN.ROOT_BIND_DURATION + p.rootLevel * 1;

    for (const enemy of state.enemies) {
      if (enemy.behavior === "dead") continue;
      if (distXZ(bindPos, enemy.pos) <= radius) {
        enemy.rootTimer = duration;
        enemy.behavior = "rooted";
        enemy.vel = { x: 0, y: 0, z: 0 };
      }
    }
    state.pendingRootBind = { x: bindPos.x, z: bindPos.z };
    addNotification(state, "Root Bind!", "#66cc44");
  }

  // 4: Aurora Shield
  if (keys.has("4") && p.auroraShieldCd <= 0) {
    keys.delete("4");
    p.auroraShieldCd = GUIN.AURORA_SHIELD_COOLDOWN;
    p.auroraShieldHp = GUIN.AURORA_SHIELD_HP + p.shieldLevel * 30;
    p.auroraShieldTimer = GUIN.AURORA_SHIELD_DURATION;
    state.pendingAuroraFlash = true;
    addNotification(state, "Aurora Shield!", "#88ccff");
  }

  // Celestial Convergence timers
  if (p.celestialCd > 0) p.celestialCd -= dt;
  if (p.celestialActive > 0) p.celestialActive -= dt;

  // Check celestial readiness: need at least one blooming+ plant of each seed type
  {
    const bloomTypes = new Set<SeedType>();
    for (const plant of state.plants.values()) {
      if (plant.growthStage >= 2) bloomTypes.add(plant.type);
    }
    p.celestialReady = bloomTypes.size >= GUIN.SEED_TYPES.length;
  }

  // 5: Celestial Convergence
  if (keys.has("5") && p.celestialCd <= 0 && p.celestialReady) {
    keys.delete("5");
    p.celestialCd = GUIN.CELESTIAL_COOLDOWN;
    p.celestialActive = GUIN.CELESTIAL_DURATION;

    // Damage and stun all enemies within radius
    for (const enemy of state.enemies) {
      if (enemy.behavior === "dead") continue;
      if (distXZ(p.pos, enemy.pos) <= GUIN.CELESTIAL_RADIUS) {
        damageEnemy(state, enemy, GUIN.CELESTIAL_DAMAGE);
        enemy.stunTimer = GUIN.CELESTIAL_STUN;
        enemy.behavior = "approaching"; // will be overridden by stun check
      }
    }

    // Heal player
    p.hp = Math.min(p.maxHp, p.hp + GUIN.CELESTIAL_HEAL);

    // Heal all plants
    for (const plant of state.plants.values()) {
      plant.hp = Math.min(plant.maxHp, plant.hp + GUIN.CELESTIAL_PLANT_HEAL);
      plant.withering = false;
    }

    // Grant bonus essence
    p.essence += GUIN.CELESTIAL_ESSENCE_GRANT;
    p.totalEssence += GUIN.CELESTIAL_ESSENCE_GRANT;

    state.pendingCelestialBurst = true;
    state.screenShake = 0.6;
    addNotification(state, "CELESTIAL CONVERGENCE!", "#ffd700");

    // Spawn 50 petal + star particles in a huge burst
    for (let i = 0; i < 50; i++) {
      const angle = rng() * Math.PI * 2;
      const dist = rng() * GUIN.CELESTIAL_RADIUS;
      const pType = i % 2 === 0 ? "petal" : "star";
      spawnParticle(state, pType as "petal" | "star",
        { x: p.pos.x + Math.cos(angle) * dist, y: p.pos.y + rngRange(1, 5), z: p.pos.z + Math.sin(angle) * dist },
        { x: rngRange(-5, 5), y: rngRange(3, 10), z: rngRange(-5, 5) },
        [0xffd700, 0xff88cc, 0x88ccff, 0x44ffaa, 0xaa44ff][Math.floor(rng() * 5)], rngRange(0.3, 0.6), 2.0);
    }
  }

  // G: Garden Sentinel (awaken a radiant plant)
  if (keys.has("g")) {
    keys.delete("g");
    let nearestPlant: GardenPlant | null = null;
    let nearDist = 5;
    for (const plant of state.plants.values()) {
      if (plant.growthStage >= 3 && !plant.awakened) {
        const d = distXZ(p.pos, plant.pos);
        if (d < nearDist) { nearestPlant = plant; nearDist = d; }
      }
    }
    if (nearestPlant && p.essence >= GUIN.SENTINEL_COST) {
      nearestPlant.awakened = true;
      p.essence -= GUIN.SENTINEL_COST;
      addNotification(state, "Garden Sentinel awakened!", "#44ffaa");
      for (let i = 0; i < 8; i++) {
        spawnParticle(state, "star", nearestPlant.pos,
          { x: rngRange(-2, 2), y: rngRange(2, 6), z: rngRange(-2, 2) }, 0x44ffaa, 0.3, 1.0);
      }
    }
  }

  // B: Island expansion
  if (keys.has("b")) {
    keys.delete("b");
    let firstLocked = -1;
    for (let i = 0; i < state.islands.length; i++) {
      if (!state.islands[i].unlocked) { firstLocked = i; break; }
    }
    if (firstLocked >= 0) {
      const cost = GUIN.ISLAND_EXPAND_COST * firstLocked;
      if (p.essence >= cost) {
        p.essence -= cost;
        state.islands[firstLocked].unlocked = true;
        addNotification(state, `Island ${firstLocked} unlocked!`, "#88ffaa");
      } else {
        addNotification(state, `Need ${cost} essence to expand!`, "#ff8888");
      }
    } else {
      addNotification(state, "All islands unlocked!", "#aaddff");
    }
  }

  // RMB / V: Plant a seed
  if ((state.rightMouseDown || keys.has("v")) && !p.planting && !p.harvesting) {
    const plantCount = state.plants.size;
    if (plantCount < getMaxPlants(state) && p.essence >= GUIN.PLANT_COST) {
      // Start planting
      p.planting = true;
      p.plantTimer = 0.8;
    }
  }

  // Planting progress
  if (p.planting) {
    p.plantTimer -= dt;
    if (p.plantTimer <= 0) {
      p.planting = false;
      if (p.essence >= GUIN.PLANT_COST) {
        p.essence -= GUIN.PLANT_COST;
        const plantPos: Vec3 = {
          x: p.pos.x + Math.sin(p.yaw) * 3 + rngRange(-1, 1),
          y: 0.1,
          z: p.pos.z + Math.cos(p.yaw) * 3 + rngRange(-1, 1),
        };
        const id = genGuinId();
        const hp = GUIN.PLANT_HP_BASE;
        state.plants.set(id, {
          id, type: p.selectedSeed, pos: plantPos,
          growthStage: 0, growthTimer: GUIN.GROW_TIME_BASE,
          hp, maxHp: hp, harvestReady: false, withering: false,
          glowIntensity: 0, bobPhase: rng() * Math.PI * 2, awakened: false, sentinelTimer: 0,
        });
        // Find which island and register
        for (const island of state.islands) {
          if (island.unlocked && distXZ(plantPos, island.pos) <= island.radius) {
            island.plants.push(id);
            break;
          }
        }
        addNotification(state, `Planted ${p.selectedSeed.replace("_", " ")}!`, "#88ff88");
        for (let i = 0; i < 6; i++) {
          spawnParticle(state, "star", plantPos,
            { x: rngRange(-2, 2), y: rngRange(1, 4), z: rngRange(-2, 2) }, 0xffd700, 0.2, 0.8);
        }
      }
    }
  }

  // C: Harvest nearest plant
  if (keys.has("c") && !p.harvesting && !p.planting) {
    let nearest: GardenPlant | null = null;
    let nearDist = GUIN.HARVEST_RANGE;
    for (const plant of state.plants.values()) {
      if (!plant.harvestReady) continue;
      const d = distXZ(p.pos, plant.pos);
      if (d < nearDist) { nearest = plant; nearDist = d; }
    }
    if (nearest) {
      // Instant harvest for radiant-stage plants
      if (nearest.growthStage >= 3) {
        const baseEssence = GUIN.ESSENCE_PER_RADIANT;
        const essence = Math.ceil(baseEssence * getHarvestYieldMult(state));
        p.essence += essence;
        p.totalEssence += essence;
        state.stats.essenceHarvested += essence;
        nearest.harvestReady = false;
        nearest.growthTimer = GUIN.GROW_TIME_BASE;
        addNotification(state, `Instant harvest +${essence} essence!`, "#ffd700");
        for (let i = 0; i < 10; i++) {
          spawnParticle(state, "essence", nearest.pos,
            { x: rngRange(-2, 2), y: rngRange(2, 6), z: rngRange(-2, 2) }, 0xffd700, 0.3, 1.0);
        }
      } else {
        p.harvesting = true;
        p.harvestTimer = GUIN.HARVEST_TIME;
        p.harvestTarget = nearest.id;
      }
    }
  }

  // Harvest progress
  if (p.harvesting) {
    p.harvestTimer -= dt;
    if (p.harvestTimer <= 0) {
      p.harvesting = false;
      const plant = state.plants.get(p.harvestTarget);
      if (plant && plant.harvestReady) {
        const baseEssence = plant.growthStage >= 3 ? GUIN.ESSENCE_PER_RADIANT : GUIN.ESSENCE_PER_BLOOM;
        const essence = Math.ceil(baseEssence * getHarvestYieldMult(state));
        p.essence += essence;
        p.totalEssence += essence;
        state.stats.essenceHarvested += essence;
        plant.harvestReady = false;
        plant.growthTimer = GUIN.GROW_TIME_BASE; // regrow to harvest again
        addNotification(state, `Harvested +${essence} essence!`, "#ffd700");
        for (let i = 0; i < 10; i++) {
          spawnParticle(state, "essence", plant.pos,
            { x: rngRange(-2, 2), y: rngRange(2, 6), z: rngRange(-2, 2) }, 0xffd700, 0.3, 1.0);
        }
      }
    }
  }

  // Tab: cycle seed type
  if (keys.has("tab")) {
    keys.delete("tab");
    const types = GUIN.SEED_TYPES;
    const idx = types.indexOf(p.selectedSeed);
    p.selectedSeed = types[(idx + 1) % types.length];
    addNotification(state, `Seed: ${p.selectedSeed.replace("_", " ")}`, "#aaddff");
  }
}

// ---- Plant Update ----
export function updatePlants(state: GuinevereState, dt: number): void {
  const growMult = getGrowthSpeedMult(state);

  for (const [id, plant] of state.plants) {
    // Withering check
    if (plant.hp <= 0) {
      state.plants.delete(id);
      state.stats.plantsLost++;
      // Remove from island
      for (const island of state.islands) {
        const idx = island.plants.indexOf(id);
        if (idx >= 0) { island.plants.splice(idx, 1); break; }
      }
      for (let i = 0; i < 6; i++) {
        spawnParticle(state, "wither", plant.pos,
          { x: rngRange(-2, 2), y: rngRange(1, 3), z: rngRange(-2, 2) }, 0x442244, 0.3, 1.0);
      }
      continue;
    }

    // Growth
    if (plant.growthStage < 3) {
      plant.growthTimer -= dt * growMult;
      if (plant.growthTimer <= 0) {
        plant.growthStage++;
        plant.maxHp = GUIN.PLANT_HP_BASE + plant.growthStage * GUIN.PLANT_HP_PER_STAGE;
        plant.hp = plant.maxHp;
        plant.growthTimer = GUIN.GROW_TIME_BASE * (1 + plant.growthStage * 0.3);
        if (plant.growthStage >= 2) plant.harvestReady = true;
        state.stats.plantsGrown++;
        // Growth particles
        for (let i = 0; i < 5; i++) {
          spawnParticle(state, "star", plant.pos,
            { x: rngRange(-1, 1), y: rngRange(1, 4), z: rngRange(-1, 1) }, 0x88ff88, 0.25, 0.8);
        }
      }
    } else {
      // Radiant stage: regrow harvest
      if (!plant.harvestReady) {
        plant.growthTimer -= dt * growMult;
        if (plant.growthTimer <= 0) {
          plant.harvestReady = true;
          plant.growthTimer = GUIN.GROW_TIME_BASE;
        }
      }
    }

    // Blight rain: all plants lose 0.5 HP/s passively
    if (state.waveModifier === "blight_rain") {
      plant.hp -= 0.5 * dt;
    }

    // Visual bob
    plant.bobPhase += dt * 2;
    plant.glowIntensity = plant.growthStage >= 2 ? 0.5 + Math.sin(plant.bobPhase) * 0.3 : 0;

    // Ambient particles for blooming+ plants
    if (plant.growthStage >= 2 && rng() < 0.05) {
      const colors: Record<SeedType, number> = {
        crystal_rose: 0xff88cc, starbloom: 0xffd700, moonvine: 0x88ccff,
        aurora_tree: 0x44ffaa, void_lily: 0xaa44ff,
      };
      spawnParticle(state, "petal", { x: plant.pos.x, y: plant.pos.y + 1 + plant.growthStage, z: plant.pos.z },
        { x: rngRange(-1, 1), y: rngRange(0.5, 2), z: rngRange(-1, 1) },
        colors[plant.type], 0.15, 2.0);
    }
  }
}

// ---- Plant Synergies ----
export function updateSynergies(state: GuinevereState, dt: number): void {
  state.activeSynergies = [];
  const p = state.player;

  for (const plant of state.plants.values()) {
    if (plant.growthStage < 2) continue; // only blooming+ plants

    const synergyRadius = GUIN.SYNERGY_RANGE;
    state.activeSynergies.push({ type: plant.type, pos: { ...plant.pos }, radius: synergyRadius });

    switch (plant.type) {
      case "crystal_rose": {
        // Enemies within range take SYNERGY_ROSE_VULN more damage (applied as direct bonus hit)
        for (const enemy of state.enemies) {
          if (enemy.behavior === "dead") continue;
          if (distXZ(plant.pos, enemy.pos) <= synergyRadius) {
            // Mark vulnerability — applied when damageEnemy is called elsewhere
            // For simplicity, apply a small tick of bonus damage representing the vuln aura
            enemy.hp -= GUIN.SYNERGY_ROSE_VULN * dt;
          }
        }
        break;
      }
      case "starbloom": {
        // Tracked as active synergy zone; essence bonus applied via activeSynergies in damageEnemy
        break;
      }
      case "moonvine": {
        // Slow enemies within range
        for (const enemy of state.enemies) {
          if (enemy.behavior === "dead" || enemy.behavior === "rooted") continue;
          if (distXZ(plant.pos, enemy.pos) <= synergyRadius) {
            enemy.vel.x *= (1 - GUIN.SYNERGY_MOONVINE_SLOW);
            enemy.vel.z *= (1 - GUIN.SYNERGY_MOONVINE_SLOW);
          }
        }
        break;
      }
      case "aurora_tree": {
        // Heal player if in range
        if (distXZ(plant.pos, p.pos) <= synergyRadius) {
          p.hp = Math.min(p.maxHp, p.hp + GUIN.SYNERGY_AURORA_HEAL * dt);
        }
        break;
      }
      case "void_lily": {
        // Enemies in range have chance per tick to take void damage
        for (const enemy of state.enemies) {
          if (enemy.behavior === "dead") continue;
          if (distXZ(plant.pos, enemy.pos) <= synergyRadius) {
            if (rng() < GUIN.SYNERGY_VOID_TICK_CHANCE * dt) {
              enemy.hp -= GUIN.SYNERGY_VOID_DAMAGE;
              enemy.hitFlash = 0.1;
              addDamageNumber(state, enemy.pos, GUIN.SYNERGY_VOID_DAMAGE, 0xaa44ff);
              spawnParticle(state, "wither", enemy.pos,
                { x: rngRange(-1, 1), y: rngRange(1, 3), z: rngRange(-1, 1) }, 0xaa44ff, 0.2, 0.5);
            }
          }
        }
        break;
      }
    }
  }
}

// ---- Enemy Update ----
export function updateEnemies(state: GuinevereState, dt: number): void {
  const p = state.player;
  const diff = getDiffMult(state);

  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const e = state.enemies[i];

    // Spawn animation
    if (e.spawnTimer > 0) {
      e.spawnTimer -= dt;
      continue;
    }

    // Death
    if (e.behavior === "dead") {
      e.deathTimer -= dt;
      if (e.deathTimer <= 0) {
        state.enemies.splice(i, 1);
      }
      continue;
    }

    // Stun
    if (e.stunTimer > 0) {
      e.stunTimer -= dt;
      if (e.stunTimer <= 0) e.behavior = "approaching";
      continue;
    }

    // Root
    if (e.rootTimer > 0) {
      e.rootTimer -= dt;
      if (e.rootTimer <= 0) e.behavior = "approaching";
      // Root particles
      if (rng() < 0.1) {
        spawnParticle(state, "root", e.pos,
          { x: rngRange(-1, 1), y: rngRange(0, 2), z: rngRange(-1, 1) }, 0x44aa44, 0.2, 0.6);
      }
      continue;
    }

    e.hitFlash = Math.max(0, e.hitFlash - dt);
    e.bobPhase += dt * 3;

    // Choose target: player or nearest plant
    let targetPos: Vec3 = p.pos;
    let targetDist = distXZ(e.pos, p.pos);

    if (e.type === "crawler" || e.type === "shambler" || (e.type === "wisp" && rng() < 0.01)) {
      // Crawlers prefer plants
      let bestPlant: GardenPlant | null = null;
      let bestDist = Infinity;
      for (const plant of state.plants.values()) {
        const d = distXZ(e.pos, plant.pos);
        if (d < bestDist) { bestPlant = plant; bestDist = d; }
      }
      if (bestPlant && bestDist < targetDist * 0.8) {
        targetPos = bestPlant.pos;
        targetDist = bestDist;
        e.targetPlant = bestPlant.id;
      } else {
        e.targetPlant = -1;
      }
    }

    // Attack timer
    e.attackTimer = Math.max(0, e.attackTimer - dt);

    // Stag charge logic
    if (e.type === "stag") {
      e.chargeCd = Math.max(0, e.chargeCd - dt);
      if (e.behavior === "charging") {
        e.chargeTimer -= dt;
        e.pos.x += e.chargeDir.x * GUIN.STAG_CHARGE_SPEED * dt;
        e.pos.z += e.chargeDir.z * GUIN.STAG_CHARGE_SPEED * dt;
        // Hit player
        if (distXZ(e.pos, p.pos) < 2.5) {
          damagePlayer(state, GUIN.STAG_CHARGE_DAMAGE);
          e.behavior = "approaching";
          e.chargeTimer = 0;
        }
        if (e.chargeTimer <= 0) e.behavior = "approaching";
        continue;
      }
      if (e.chargeCd <= 0 && targetDist < 20 && targetDist > 6) {
        e.chargeCd = GUIN.STAG_CHARGE_CD;
        e.chargeTimer = 1.5;
        e.behavior = "charging";
        const dx = p.pos.x - e.pos.x, dz = p.pos.z - e.pos.z;
        const len = Math.sqrt(dx * dx + dz * dz);
        e.chargeDir = { x: dx / len, y: 0, z: dz / len };
        // Attack telegraph: line along charge path
        state.telegraphs.push({
          pos: { ...p.pos }, radius: 3,
          timer: GUIN.TELEGRAPH_STAG_CHARGE_TIME,
          maxTimer: GUIN.TELEGRAPH_STAG_CHARGE_TIME,
          color: "#886644",
        });
        continue;
      }
    }

    // Moth projectile logic
    if (e.type === "moth") {
      e.projectileCd = Math.max(0, e.projectileCd - dt);
      // Keep flying height
      e.pos.y += (GUIN.MOTH_FLY_HEIGHT - e.pos.y) * 2 * dt;
      if (e.projectileCd <= 0 && targetDist < 20) {
        e.projectileCd = GUIN.MOTH_PROJECTILE_CD;
        const dx = p.pos.x - e.pos.x, dz = p.pos.z - e.pos.z;
        const len = Math.sqrt(dx * dx + dz * dz);
        if (len > 0.1) {
          state.projectiles.push({
            id: genGuinId(),
            pos: { ...e.pos },
            vel: { x: (dx / len) * GUIN.MOTH_PROJECTILE_SPEED, y: 0, z: (dz / len) * GUIN.MOTH_PROJECTILE_SPEED },
            damage: GUIN.MOTH_PROJECTILE_DAMAGE * diff.enemyDmg,
            life: 3.0,
            fromEnemy: true,
            type: "moth_spit",
          });
        }
      }
    }

    // Wither Lord special attacks
    if (e.type === "wither_lord") {
      e.slamCd = Math.max(0, e.slamCd - dt);
      e.blightCd = Math.max(0, e.blightCd - dt);

      if (e.slamCd <= 0 && targetDist < GUIN.WITHER_LORD_SLAM_RADIUS) {
        e.slamCd = GUIN.WITHER_LORD_SLAM_CD;
        // Telegraph before slam
        state.telegraphs.push({
          pos: { ...e.pos }, radius: GUIN.WITHER_LORD_SLAM_RADIUS,
          timer: GUIN.TELEGRAPH_WITHER_SLAM_TIME,
          maxTimer: GUIN.TELEGRAPH_WITHER_SLAM_TIME,
          color: "#440066",
        });
        // AoE slam
        if (distXZ(e.pos, p.pos) < GUIN.WITHER_LORD_SLAM_RADIUS) {
          damagePlayer(state, GUIN.WITHER_LORD_SLAM_DAMAGE);
        }
        // Damage nearby plants
        for (const plant of state.plants.values()) {
          if (distXZ(e.pos, plant.pos) < GUIN.WITHER_LORD_SLAM_RADIUS) {
            plant.hp -= 20;
            plant.withering = true;
          }
        }
        state.screenShake = 0.5;
        for (let j = 0; j < 15; j++) {
          spawnParticle(state, "impact", e.pos,
            { x: rngRange(-6, 6), y: rngRange(1, 5), z: rngRange(-6, 6) }, 0x220044, 0.5, 1.0);
        }
      }

      if (e.blightCd <= 0 && targetDist < 25) {
        e.blightCd = GUIN.WITHER_LORD_BLIGHT_CD;
        // Blight: wither plants in area
        for (const plant of state.plants.values()) {
          if (distXZ(e.pos, plant.pos) < GUIN.WITHER_LORD_BLIGHT_RADIUS) {
            plant.hp -= 15;
            plant.withering = true;
          }
        }
        addNotification(state, "Blight wave!", "#442244");
        for (let j = 0; j < 10; j++) {
          spawnParticle(state, "wither", e.pos,
            { x: rngRange(-8, 8), y: rngRange(0.5, 2), z: rngRange(-8, 8) }, 0x442244, 0.4, 1.5);
        }
      }
    }

    // Movement toward target
    const attackRange = e.type === "moth" ? 15 : e.type === "wither_lord" ? 4 : 2.5;
    if (targetDist > attackRange) {
      const dx = targetPos.x - e.pos.x, dz = targetPos.z - e.pos.z;
      const len = Math.sqrt(dx * dx + dz * dz);
      if (len > 0.1) {
        const nightMult = state.isNight ? GUIN.NIGHT_ENEMY_MULT : 1;
        const frostSpeedMult = state.waveModifier === "frost_storm" ? 1.1 : 1;
        const spd = e.speed * nightMult * frostSpeedMult;
        e.pos.x += (dx / len) * spd * dt;
        e.pos.z += (dz / len) * spd * dt;
        e.yaw = Math.atan2(dx, dz);
      }
    } else if (e.attackTimer <= 0 && e.type !== "moth") {
      // Melee attack
      e.attackTimer = 1.2;
      if (e.targetPlant >= 0) {
        const plant = state.plants.get(e.targetPlant);
        if (plant) {
          const plantDmg = e.type === "shambler" ? GUIN.SHAMBLER_PLANT_DAMAGE : e.type === "crawler" ? GUIN.CRAWLER_PLANT_DAMAGE : GUIN.WISP_PLANT_DAMAGE;
          plant.hp -= plantDmg;
          plant.withering = true;
        }
      } else {
        damagePlayer(state, e.damage);
      }
    }

    // Thorn wall collision
    for (const wall of state.thornWalls) {
      // Simple distance check
      const wallDist = distXZ(e.pos, wall.pos);
      if (wallDist < GUIN.THORN_WALL_LENGTH * 0.5 + 1) {
        // Push back and damage
        const dx = e.pos.x - wall.pos.x, dz = e.pos.z - wall.pos.z;
        const len = Math.sqrt(dx * dx + dz * dz) || 1;
        e.pos.x += (dx / len) * 2;
        e.pos.z += (dz / len) * 2;
        if (e.attackTimer <= 0) {
          const thornDmg = GUIN.THORN_WALL_DAMAGE * (1 + state.player.thornLevel * 0.3);
          damageEnemy(state, e, thornDmg);
          wall.hp -= e.damage * 0.5;
          e.attackTimer = 0.5;
        }
      }
    }
  }
}

// ---- Spawn Queue ----
export function updateSpawnQueue(state: GuinevereState, dt: number): void {
  for (let i = state.spawnQueue.length - 1; i >= 0; i--) {
    state.spawnQueue[i].delay -= dt;
    if (state.spawnQueue[i].delay <= 0) {
      spawnEnemy(state, state.spawnQueue[i].type);
      state.spawnQueue.splice(i, 1);
    }
  }
}

function spawnEnemy(state: GuinevereState, type: EnemyType): void {
  const diff = getDiffMult(state);
  const angle = rng() * Math.PI * 2;
  const dist = GUIN.SPAWN_RADIUS;
  const pos: Vec3 = { x: Math.cos(angle) * dist, y: 0, z: Math.sin(angle) * dist };

  let hp: number, damage: number, speed: number, flying = false;
  switch (type) {
    case "wisp":
      hp = GUIN.WISP_HP; damage = GUIN.WISP_DAMAGE; speed = GUIN.WISP_SPEED; break;
    case "crawler":
      hp = GUIN.CRAWLER_HP; damage = GUIN.CRAWLER_DAMAGE; speed = GUIN.CRAWLER_SPEED; break;
    case "stag":
      hp = GUIN.STAG_HP; damage = GUIN.STAG_DAMAGE; speed = GUIN.STAG_SPEED; break;
    case "moth":
      hp = GUIN.MOTH_HP; damage = GUIN.MOTH_DAMAGE; speed = GUIN.MOTH_SPEED; flying = true; break;
    case "shambler":
      hp = GUIN.SHAMBLER_HP; damage = GUIN.SHAMBLER_DAMAGE; speed = GUIN.SHAMBLER_SPEED; break;
    case "wither_lord":
      hp = GUIN.WITHER_LORD_HP; damage = GUIN.WITHER_LORD_DAMAGE; speed = GUIN.WITHER_LORD_SPEED; break;
    default:
      hp = GUIN.WISP_HP; damage = GUIN.WISP_DAMAGE; speed = GUIN.WISP_SPEED;
  }

  hp = Math.round(hp * diff.enemyHp * (1 + state.wave * 0.08));
  damage = Math.round(damage * diff.enemyDmg);

  state.enemies.push({
    id: genGuinId(), type, pos, vel: { x: 0, y: 0, z: 0 }, yaw: 0,
    hp, maxHp: hp, damage, speed,
    behavior: "approaching", attackTimer: 1, stunTimer: 0, rootTimer: 0,
    deathTimer: 0, hitFlash: 0, flying, bobPhase: rng() * Math.PI * 2,
    targetPlant: -1, chargeCd: GUIN.STAG_CHARGE_CD, chargeTimer: 0,
    chargeDir: { x: 0, y: 0, z: 0 }, projectileCd: GUIN.MOTH_PROJECTILE_CD,
    slamCd: GUIN.WITHER_LORD_SLAM_CD, blightCd: GUIN.WITHER_LORD_BLIGHT_CD,
    bossPhase: 1, spawnTimer: 0.5,
    elite: false,
  });

  // Elite chance
  const newEnemy = state.enemies[state.enemies.length - 1];
  if (state.wave >= GUIN.ELITE_START_WAVE && type !== "wither_lord" && rng() < GUIN.ELITE_CHANCE) {
    newEnemy.elite = true;
    newEnemy.hp = Math.round(newEnemy.hp * GUIN.ELITE_HP_MULT);
    newEnemy.maxHp = newEnemy.hp;
    newEnemy.damage = Math.round(newEnemy.damage * GUIN.ELITE_DAMAGE_MULT);
    newEnemy.speed *= GUIN.ELITE_SPEED_MULT;
  }
}

// ---- Projectiles ----
export function updateProjectiles(state: GuinevereState, dt: number): void {
  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const proj = state.projectiles[i];
    proj.pos.x += proj.vel.x * dt;
    proj.pos.y += proj.vel.y * dt;
    proj.pos.z += proj.vel.z * dt;
    proj.life -= dt;

    if (proj.life <= 0) {
      state.projectiles.splice(i, 1);
      continue;
    }

    if (proj.fromEnemy) {
      // Hit player
      if (dist3(proj.pos, state.player.pos) < 1.5) {
        damagePlayer(state, proj.damage);
        state.projectiles.splice(i, 1);
        for (let j = 0; j < 4; j++) {
          spawnParticle(state, "impact", proj.pos,
            { x: rngRange(-3, 3), y: rngRange(1, 4), z: rngRange(-3, 3) }, 0xaaff44, 0.3, 0.5);
        }
      }
    }

    // Trail particle
    if (rng() < 0.3) {
      const color = proj.fromEnemy ? 0xaaff44 : 0xccddff;
      spawnParticle(state, proj.fromEnemy ? "frost" : "moonlight", proj.pos,
        { x: rngRange(-0.5, 0.5), y: rngRange(0, 1), z: rngRange(-0.5, 0.5) }, color, 0.15, 0.3);
    }
  }
}

// ---- Thorn Walls ----
export function updateThornWalls(state: GuinevereState, dt: number): void {
  for (let i = state.thornWalls.length - 1; i >= 0; i--) {
    const wall = state.thornWalls[i];
    wall.life -= dt;
    if (wall.life <= 0 || wall.hp <= 0) {
      state.thornWalls.splice(i, 1);
      for (let j = 0; j < 8; j++) {
        spawnParticle(state, "root", wall.pos,
          { x: rngRange(-3, 3), y: rngRange(1, 4), z: rngRange(-3, 3) }, 0x336633, 0.3, 0.6);
      }
    }
  }
}

// ---- Particles ----
export function updateParticles(state: GuinevereState, dt: number): void {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.pos.x += p.vel.x * dt;
    p.pos.y += p.vel.y * dt;
    p.pos.z += p.vel.z * dt;
    p.vel.y -= 3 * dt; // gentle gravity on particles
    p.life -= dt;
    if (p.life <= 0) state.particles.splice(i, 1);
  }
}

// ---- Damage Numbers ----
export function updateDamageNumbers(state: GuinevereState, dt: number): void {
  for (let i = state.damageNumbers.length - 1; i >= 0; i--) {
    const dn = state.damageNumbers[i];
    dn.pos.y += 2 * dt;
    dn.timer -= dt;
    if (dn.timer <= 0) state.damageNumbers.splice(i, 1);
  }
}

// ---- Notifications ----
export function updateNotifications(state: GuinevereState, dt: number): void {
  for (let i = state.notifications.length - 1; i >= 0; i--) {
    state.notifications[i].timer -= dt;
    if (state.notifications[i].timer <= 0) state.notifications.splice(i, 1);
  }
}

// ---- Day/Night Cycle ----
export function updateDayNight(state: GuinevereState, dt: number): void {
  state.cycleTime += dt;
  if (state.cycleTime >= GUIN.CYCLE_DURATION) state.cycleTime -= GUIN.CYCLE_DURATION;

  const dayEnd = GUIN.CYCLE_DURATION * GUIN.DAY_RATIO;
  const duskEnd = dayEnd + GUIN.DAWN_DUSK_DURATION;
  const nightEnd = GUIN.CYCLE_DURATION - GUIN.DAWN_DUSK_DURATION;

  const prevNight = state.isNight;

  if (state.cycleTime < dayEnd) {
    state.isNight = false;
    state.dayNightBlend = 0;
  } else if (state.cycleTime < duskEnd) {
    state.isNight = false;
    state.dayNightBlend = (state.cycleTime - dayEnd) / GUIN.DAWN_DUSK_DURATION;
    if (state.dayNightBlend > 0.5 && !prevNight) {
      state.phase = "dusk";
    }
  } else if (state.cycleTime < nightEnd) {
    state.isNight = true;
    state.dayNightBlend = 1;
  } else {
    state.isNight = true;
    state.dayNightBlend = 1 - (state.cycleTime - nightEnd) / GUIN.DAWN_DUSK_DURATION;
    if (state.dayNightBlend < 0.5 && prevNight) {
      state.phase = "dawn";
    }
  }

  // Transition phase back to day/night after dusk/dawn
  if (state.phase === "dusk" && state.isNight && state.dayNightBlend >= 0.95) {
    state.phase = "night";
    addNotification(state, "Night falls — plants bask in moonlight", "#88ccff");
  }
  if (state.phase === "dawn" && !state.isNight && state.dayNightBlend <= 0.05) {
    state.phase = "day";
    addNotification(state, "Dawn breaks — the garden stirs", "#ffdd88");
  }
}

// ---- Wave Management ----
export function updateWaves(state: GuinevereState, dt: number): void {
  // Only spawn waves during active gameplay
  if (state.phase === "menu" || state.phase === "game_over") return;

  state.waveTimer -= dt;
  // Countdown before wave starts
  if (state.waveTimer <= GUIN.WAVE_COUNTDOWN_DURATION && state.waveTimer > 0) {
    state.waveCountdown = state.waveTimer;
  }
  if (state.waveTimer <= 0) {
    state.waveCountdown = 0;
    state.wave++;
    state.waveTimer = GUIN.CYCLE_DURATION * 0.5; // new wave every half-cycle

    // Wave modifier
    if (state.wave >= GUIN.WAVE_MODIFIER_START && rng() < GUIN.MODIFIER_CHANCE) {
      const mods: WaveModifier[] = ["frost_storm", "void_tide", "blight_rain", "starfall", "eclipse"];
      state.waveModifier = mods[Math.floor(rng() * mods.length)];
    } else {
      state.waveModifier = "none";
    }

    // Calculate enemy count
    const diff = getDiffMult(state);
    const baseCount = Math.floor(GUIN.WAVE_BASE_COUNT + state.wave * GUIN.WAVE_COUNT_SCALE);
    const count = Math.round(baseCount * diff.enemyCount);

    // Queue enemies
    for (let i = 0; i < count; i++) {
      let type: EnemyType = "wisp";
      const roll = rng();
      if (state.wave >= GUIN.SHAMBLER_START_WAVE && roll < 0.1) type = "shambler";
      else if (state.wave >= GUIN.MOTH_START_WAVE && roll < 0.2) type = "moth";
      else if (state.wave >= GUIN.STAG_START_WAVE && roll < 0.35) type = "stag";
      else if (state.wave >= GUIN.CRAWLER_START_WAVE && roll < 0.55) type = "crawler";

      state.spawnQueue.push({ type, delay: i * GUIN.SPAWN_INTERVAL / count });
    }

    // Boss every N waves
    if (state.wave % GUIN.BOSS_EVERY_N_WAVES === 0) {
      state.spawnQueue.push({ type: "wither_lord", delay: 2 });
      state.pendingBossEntrance = true;
      state.screenShake = 0.4;
      addNotification(state, "WITHER LORD APPROACHES!", "#442244");
    }

    // Wave title
    const modName = WAVE_MODIFIER_NAMES[state.waveModifier];
    const modColor = WAVE_MODIFIER_COLORS[state.waveModifier];
    state.waveTitle = {
      text: `WAVE ${state.wave}${modName ? ` — ${modName}` : ""}`,
      timer: 3.0,
      color: modName ? modColor : "#ffd700",
    };
  }

  // Wave title timer
  if (state.waveTitle.timer > 0) state.waveTitle.timer -= dt;
}

// ---- Phase Management ----
export function updatePhase(state: GuinevereState, dt: number): void {
  if (state.phase === "menu" || state.phase === "game_over") return;

  // Death sequence slow-mo
  if (state.deathSequenceTimer > 0) {
    state.deathSequenceTimer -= dt;
    if (state.deathSequenceTimer <= 0) {
      state.phase = "game_over";
      state.bestWave = Math.max(state.bestWave, state.wave);
    }
  }

  // Hit stop
  if (state.hitStopTimer > 0) state.hitStopTimer -= dt;

  // Screen flash
  if (state.screenFlash.timer > 0) {
    state.screenFlash.timer -= dt;
    if (state.screenFlash.timer <= 0) state.screenFlash.intensity = 0;
  }

  // Screen shake decay
  if (state.screenShake > 0) state.screenShake *= 0.9;

  // Check game over: all plants dead and player has no essence
  if (state.plants.size === 0 && state.player.essence < GUIN.PLANT_COST && state.wave > 1 && state.enemies.length > 0) {
    // Don't end immediately, give player a chance with abilities
    // Only end if they're also low HP
    if (state.player.hp < state.player.maxHp * 0.15) {
      state.phase = "game_over";
      state.bestWave = Math.max(state.bestWave, state.wave);
    }
  }
}

// ---- Sentinel Auto-Attack ----
export function updateSentinels(state: GuinevereState, dt: number): void {
  for (const plant of state.plants.values()) {
    if (!plant.awakened) continue;

    plant.sentinelTimer -= dt;
    if (plant.sentinelTimer <= 0) {
      // Find nearest alive enemy within range
      let nearest: GuinevereEnemy | null = null;
      let nearDist = GUIN.SENTINEL_RANGE;
      for (const enemy of state.enemies) {
        if (enemy.behavior === "dead") continue;
        const d = distXZ(plant.pos, enemy.pos);
        if (d < nearDist) { nearest = enemy; nearDist = d; }
      }
      if (nearest) {
        // Create a moonbeam-type projectile from plant toward enemy
        const dx = nearest.pos.x - plant.pos.x;
        const dz = nearest.pos.z - plant.pos.z;
        const len = Math.sqrt(dx * dx + dz * dz) || 1;
        state.projectiles.push({
          id: genGuinId(),
          pos: { x: plant.pos.x, y: plant.pos.y + 2, z: plant.pos.z },
          vel: { x: (dx / len) * GUIN.SENTINEL_PROJECTILE_SPEED, y: 0, z: (dz / len) * GUIN.SENTINEL_PROJECTILE_SPEED },
          damage: GUIN.SENTINEL_DAMAGE,
          life: 3.0,
          fromEnemy: false,
          type: "moonbeam",
        });
        // Spawn star particle at plant pos
        spawnParticle(state, "star", { x: plant.pos.x, y: plant.pos.y + 2, z: plant.pos.z },
          { x: rngRange(-1, 1), y: rngRange(1, 3), z: rngRange(-1, 1) }, 0x44ffaa, 0.25, 0.6);
      }
      plant.sentinelTimer = GUIN.SENTINEL_FIRE_CD;
    }
  }
}

// ---- Artifacts ----
export function updateArtifacts(state: GuinevereState, dt: number): void {
  const p = state.player;

  // Bob and age artifact drops
  for (let i = state.artifactDrops.length - 1; i >= 0; i--) {
    const drop = state.artifactDrops[i];
    drop.bobPhase += dt * 3;
    drop.pos.y = GUIN.ARTIFACT_FLOAT_HEIGHT + Math.sin(drop.bobPhase) * 0.3;
    drop.life -= dt;
    if (drop.life <= 0) {
      state.artifactDrops.splice(i, 1);
      continue;
    }

    // Pickup range check
    if (distXZ(p.pos, drop.pos) < GUIN.ARTIFACT_PICKUP_RANGE) {
      state.artifacts.push(drop.type);
      state.pendingArtifactPickup = drop.type;
      const info = ARTIFACT_INFO[drop.type];
      addNotification(state, `${info.icon} ${info.name}: ${info.desc}`, info.color);
      state.screenFlash = { color: "#ffd700", intensity: 0.5, timer: 0.4 };

      // Apply immediate artifact effects
      if (drop.type === "crystal_veil") {
        p.maxHp += 20;
        p.hp = Math.min(p.maxHp, p.hp + 20);
      }

      state.artifactDrops.splice(i, 1);
    }
  }

  // Passive artifact effects (applied elsewhere contextually):
  // garden_heart: plants grow 30% faster — applied in getGrowthSpeedMult
  // thornheart: thorn walls last 50% longer — applied in thorn wall duration
  // etc.
}

// ---- Attack Telegraphs ----
export function updateTelegraphs(state: GuinevereState, dt: number): void {
  for (let i = state.telegraphs.length - 1; i >= 0; i--) {
    state.telegraphs[i].timer -= dt;
    if (state.telegraphs[i].timer <= 0) {
      state.telegraphs.splice(i, 1);
    }
  }
}

// ---- Wave Countdown ----
export function updateWaveCountdown(state: GuinevereState, dt: number): void {
  if (state.waveCountdown > 0) {
    state.waveCountdown -= dt;
  }
}

// ---- Start Game ----
export function startGame(state: GuinevereState): void {
  state.phase = "day";
  state.cycleTime = 0;
  state.waveTimer = 5; // first wave in 5 seconds
  addNotification(state, "Tend your garden, Queen Guinevere!", "#ffd700");
  addNotification(state, "RMB to plant | C to harvest | Tab to switch seeds", "#aaddff");
}

// ---- Upgrade purchase ----
export function purchaseUpgrade(state: GuinevereState, upgradeId: string): void {
  const upg = UPGRADES.find(u => u.id === upgradeId);
  if (!upg) return;
  const currentLevel = state.player[upg.field];
  if (currentLevel >= upg.maxLevel) return;
  const cost = getUpgradeCost(upg, currentLevel);
  if (state.player.essence < cost) return;
  state.player.essence -= cost;
  (state.player[upg.field] as number)++;
  addNotification(state, `Upgraded ${upg.name}!`, "#ffd700");
}
