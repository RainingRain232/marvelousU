// ---------------------------------------------------------------------------
// King of the Hill — game logic (v3: kiting, veterancy, guardian specials,
// war horn, charge reset, slash VFX, kill feed, smart targeting)
// ---------------------------------------------------------------------------

import type { KothState, KothUnit } from "../state/KothState";
import { KothPhase } from "../state/KothState";
import {
  KothConfig, UNITS, GUARDIANS, RELICS, CATACLYSMS,
  GUARDIAN_WAVES, ALL_UNIT_TYPES, GUARDIAN_SHAPES,
  DIFFICULTIES, UPGRADES,
  VET_KILLS, VET_BONUS_PER_LEVEL, VET_MAX_LEVEL,
  type UnitType, type GuardianType, type RelicType, type CataclysmType,
  type UpgradeId,
} from "../config/KothConfig";

// ---------------------------------------------------------------------------
// Spawn helpers
// ---------------------------------------------------------------------------

export function spawnUnit(state: KothState, owner: number, type: UnitType): boolean {
  const def = UNITS[type];
  const player = state.players[owner];
  if (player.gold < def.cost) return false;
  const count = state.units.filter(u => u.alive && u.owner === owner).length;
  if (count >= KothConfig.MAX_UNITS_PER_PLAYER) return false;

  player.gold -= def.cost;
  state.goldSpent[owner] += def.cost;
  state.unitsProduced[owner]++;

  const spread = 30;
  const sx = player.spawnX + (Math.random() - 0.5) * spread;
  const sy = player.spawnY + (Math.random() - 0.5) * spread * 2;

  let gx: number, gy: number;
  if (owner === 0 && state.hasRallyPoint) {
    gx = state.rallyX + (Math.random() - 0.5) * 20;
    gy = state.rallyY + (Math.random() - 0.5) * 20;
  } else {
    gx = KothConfig.HILL_CENTER_X + (Math.random() - 0.5) * KothConfig.HILL_RADIUS;
    gy = KothConfig.HILL_CENTER_Y + (Math.random() - 0.5) * KothConfig.HILL_RADIUS;
  }

  state.units.push({
    id: `u${state.unitIdCounter++}`,
    owner, type,
    hp: def.hp, maxHp: def.hp,
    baseAtk: def.atk, baseSpeed: def.speed,
    atk: def.atk, speed: def.speed,
    range: def.range, attackRate: def.attackRate,
    x: sx, y: sy,
    targetId: null, attackCooldown: 0,
    alive: true,
    size: def.size, color: state.players[owner].color,
    shape: def.shape,
    goalX: gx, goalY: gy,
    facingAngle: owner === 0 ? 0 : Math.PI, // face toward center
    hasCharged: false, idleTimer: 0, hitFlash: 0, slowDebuff: 0,
    vetKills: 0, vetLevel: 0,
    specialCooldown: 0,
    slashArc: 0, slashAngle: 0,
  });
  return true;
}

function spawnGuardian(state: KothState, type: GuardianType): void {
  const def = GUARDIANS[type];
  const diff = DIFFICULTIES[state.difficulty];
  const hp = Math.round(def.hp * diff.guardianHpMult);
  const atk = Math.round(def.atk * diff.guardianAtkMult);
  const angle = Math.random() * Math.PI * 2;
  const r = KothConfig.HILL_RADIUS * 0.5 * Math.random();
  state.units.push({
    id: `u${state.unitIdCounter++}`,
    owner: 2, type,
    hp, maxHp: hp,
    baseAtk: atk, baseSpeed: def.speed,
    atk: def.atk, speed: def.speed,
    range: 0, attackRate: def.attackRate,
    x: KothConfig.HILL_CENTER_X + Math.cos(angle) * r,
    y: KothConfig.HILL_CENTER_Y + Math.sin(angle) * r,
    targetId: null, attackCooldown: 0, alive: true,
    size: def.size, color: def.color, shape: GUARDIAN_SHAPES[type] ?? "circle",
    goalX: KothConfig.HILL_CENTER_X,
    goalY: KothConfig.HILL_CENTER_Y,
    facingAngle: Math.random() * Math.PI * 2,
    hasCharged: false, idleTimer: 0, hitFlash: 0, slowDebuff: 0,
    vetKills: 0, vetLevel: 0,
    specialCooldown: def.specialCooldown * 0.5, // start half-ready
    slashArc: 0, slashAngle: 0,
  });
}

function spawnRelic(state: KothState): void {
  const types: RelicType[] = ["speed", "damage", "armor", "gold", "heal"];
  const type = types[Math.floor(Math.random() * types.length)];
  const def = RELICS[type];
  const angle = Math.random() * Math.PI * 2;
  const r = KothConfig.HILL_RADIUS * 1.5 + Math.random() * 150;
  const x = clamp(KothConfig.HILL_CENTER_X + Math.cos(angle) * r, 30, KothConfig.ARENA_W - 30);
  const y = clamp(KothConfig.HILL_CENTER_Y + Math.sin(angle) * r, 30, KothConfig.ARENA_H - 30);
  state.relics.push({ id: `r${state.relicIdCounter++}`, type, x, y, alive: true });
  state.announcements.push({ text: `${def.name} appeared!`, color: def.color, timer: 2 });
}

// ---------------------------------------------------------------------------
// War Horn — player active ability
// ---------------------------------------------------------------------------

export function useWarHorn(state: KothState): boolean {
  if (state.warHornCooldown > 0 || state.warHornTimer > 0) return false;
  state.warHornTimer = KothConfig.WAR_HORN_DURATION;
  state.warHornCooldown = KothConfig.WAR_HORN_COOLDOWN;
  state.announcements.push({ text: "WAR HORN!", color: 0xffcc44, timer: 2 });
  state.shakeTimer = 0.3;
  state.shakeIntensity = 2;
  // Burst particles from spawn
  for (let i = 0; i < 12; i++) {
    state.particles.push({
      x: state.players[0].spawnX, y: state.players[0].spawnY,
      vx: 40 + Math.random() * 60, vy: (Math.random() - 0.5) * 80,
      life: 0.8, maxLife: 0.8, color: 0xffcc44, size: 3,
    });
  }
  return true;
}

// ---------------------------------------------------------------------------
// Main update
// ---------------------------------------------------------------------------

export function updateKoth(state: KothState, dt: number): void {
  if (state.phase !== KothPhase.PLAYING || state.paused) return;
  const sDt = dt * state.speedMult;
  state.elapsed += sDt;

  updateWarHorn(state, sDt);
  updateBuffTimers(state, sDt);
  recomputeUnitStats(state, sDt);
  updateEconomy(state, sDt);
  updateGuardians(state, sDt);
  updateGuardianSpecials(state, sDt);
  updateRelics(state, sDt);
  updateCataclysms(state, sDt);
  updateAI(state, sDt);
  updateKiting(state);
  updateMovement(state, sDt);
  updateSeparation(state, sDt);
  updateAbilities(state, sDt);
  updateCombat(state, sDt);
  updateProjectiles(state, sDt);
  updateHillControl(state, sDt);
  updateParticles(state, sDt);
  updateAnnouncements(state, sDt);
  updateKillFeed(state, sDt);
  updateRangedTrails(state, sDt);
  updateContestSparks(state, sDt);
  updateFloatingTexts(state, sDt);
  updateMultiKill(state, sDt);
  updateAutoSpawn(state, sDt);
  updateShake(state, sDt);
  cleanDead(state);
  checkVictory(state);
}

// ---------------------------------------------------------------------------
// Subsystems
// ---------------------------------------------------------------------------

function updateWarHorn(state: KothState, dt: number): void {
  if (state.warHornTimer > 0) state.warHornTimer = Math.max(0, state.warHornTimer - dt);
  if (state.warHornCooldown > 0) state.warHornCooldown = Math.max(0, state.warHornCooldown - dt);
}

function recomputeUnitStats(state: KothState, dt: number): void {
  for (const u of state.units) {
    if (!u.alive) continue;

    // Decay timers
    if (u.slowDebuff > 0) u.slowDebuff = Math.max(0, u.slowDebuff - dt * 0.1);
    if (u.hitFlash > 0) u.hitFlash = Math.max(0, u.hitFlash - dt);
    if (u.slashArc > 0) u.slashArc = Math.max(0, u.slashArc - dt);
    u.idleTimer += dt;

    if (u.owner === 2) {
      // Guardian: just apply slow
      u.speed = u.baseSpeed * (1 - u.slowDebuff);
      u.atk = u.baseAtk;
      u.specialCooldown = Math.max(0, u.specialCooldown - dt);
      continue;
    }

    const p = state.players[u.owner];
    let atkMult = 1;
    let spdMult = 1;

    // Relic buffs
    if (p.damageBuffTimer > 0) atkMult += 0.5;
    if (p.speedBuffTimer > 0) spdMult += 0.4;

    // War Horn buff (player 0 only)
    if (u.owner === 0 && state.warHornTimer > 0) {
      spdMult += KothConfig.WAR_HORN_SPEED_MULT;
      atkMult += KothConfig.WAR_HORN_ATK_MULT;
    }

    // Veterancy bonus
    if (u.vetLevel > 0) {
      const vetBonus = u.vetLevel * VET_BONUS_PER_LEVEL;
      atkMult += vetBonus;
    }

    const unitDef = UNITS[u.type as UnitType];

    // Player 0 upgrades
    if (u.owner === 0) {
      const up = state.upgrades;
      if (up.sharp_blades > 0 && unitDef && unitDef.range === 0) atkMult += up.sharp_blades * 0.1;
      if (up.blessed_weapons > 0 && unitDef && unitDef.range > 0) atkMult += up.blessed_weapons * 0.15;
      if (up.swift_boots > 0) spdMult += up.swift_boots * 0.08;
    }

    // Berserker frenzy
    if (unitDef?.passive === "frenzy" && u.hp < u.maxHp * 0.5) {
      atkMult += 0.5;
    }

    // Inspired: swordsman near paladin
    if (unitDef?.passive === "inspired") {
      for (const ally of state.units) {
        if (!ally.alive || ally.owner !== u.owner) continue;
        const ad = UNITS[ally.type as UnitType];
        if (ad?.passive === "aura_heal") {
          const dx = ally.x - u.x, dy = ally.y - u.y;
          if (dx * dx + dy * dy < KothConfig.PALADIN_HEAL_RADIUS * KothConfig.PALADIN_HEAL_RADIUS) {
            atkMult += 0.2;
            break;
          }
        }
      }
    }

    u.atk = Math.round(u.baseAtk * atkMult);
    u.speed = u.baseSpeed * spdMult * (1 - u.slowDebuff);

    // Veterancy + upgrade HP bonus
    {
      const baseHp = (unitDef?.hp ?? u.maxHp);
      let hpMult = 1;
      if (u.vetLevel > 0) hpMult += u.vetLevel * VET_BONUS_PER_LEVEL;
      if (u.owner === 0 && state.upgrades.thick_armor > 0) hpMult += state.upgrades.thick_armor * 0.12;
      const newMax = Math.round(baseHp * hpMult);
      if (newMax > u.maxHp) {
        const hpDiff = newMax - u.maxHp;
        u.maxHp = newMax;
        u.hp += hpDiff;
      }
    }

    // Cavalry charge reset: after 3s idle, reset charge
    if (unitDef?.passive === "charge" && u.hasCharged && u.idleTimer >= KothConfig.CHARGE_RESET_TIME) {
      u.hasCharged = false;
    }
  }
}

function updateBuffTimers(state: KothState, dt: number): void {
  for (const p of state.players) {
    if (p.speedBuffTimer > 0) p.speedBuffTimer = Math.max(0, p.speedBuffTimer - dt);
    if (p.damageBuffTimer > 0) p.damageBuffTimer = Math.max(0, p.damageBuffTimer - dt);
    if (p.armorBuffTimer > 0) p.armorBuffTimer = Math.max(0, p.armorBuffTimer - dt);
  }
}

function updateEconomy(state: KothState, dt: number): void {
  for (const p of state.players) {
    let income = KothConfig.PASSIVE_INCOME;
    if (p.controllingHill) income += KothConfig.HILL_INCOME_BONUS;
    // AI gets income multiplied by difficulty
    if (p.isAI) income *= DIFFICULTIES[state.difficulty].aiGoldMult;
    p.goldAccum += income * dt;
    const whole = Math.floor(p.goldAccum);
    if (whole > 0) { p.gold += whole; p.goldAccum -= whole; }
  }
}

function updateGuardians(state: KothState, dt: number): void {
  state.guardianTimer += dt;
  // Warning before spawn
  const timeUntilSpawn = KothConfig.GUARDIAN_RESPAWN_INTERVAL - state.guardianTimer;
  if (timeUntilSpawn <= KothConfig.GUARDIAN_WARNING_TIME && timeUntilSpawn > 0) {
    state.guardianWarning = timeUntilSpawn;
  } else {
    state.guardianWarning = 0;
  }
  if (state.guardianTimer >= KothConfig.GUARDIAN_RESPAWN_INTERVAL) {
    state.guardianTimer -= KothConfig.GUARDIAN_RESPAWN_INTERVAL;
    state.guardianWarning = 0;
    const minutes = state.elapsed / 60;
    let wave = GUARDIAN_WAVES[0];
    for (const w of GUARDIAN_WAVES) {
      if (minutes >= w.minuteThreshold) wave = w;
    }
    for (const g of wave.guardians) {
      for (let i = 0; i < g.count; i++) spawnGuardian(state, g.type);
    }
    state.announcements.push({ text: "Guardians arise!", color: 0x888877, timer: 2 });
    state.shakeTimer = 0.2;
    state.shakeIntensity = 1.5;
  }
}

// ---------------------------------------------------------------------------
// Guardian special abilities
// ---------------------------------------------------------------------------

function updateGuardianSpecials(state: KothState, _dt: number): void {
  for (const u of state.units) {
    if (!u.alive || u.owner !== 2) continue;
    if (u.specialCooldown > 0) continue;
    const gDef = GUARDIANS[u.type as GuardianType];
    if (!gDef) continue;

    // Find nearest non-guardian target for ability
    let nearestDist = Infinity;
    let nearestTarget: KothUnit | null = null;
    for (const other of state.units) {
      if (!other.alive || other.owner === 2) continue;
      const dx = other.x - u.x, dy = other.y - u.y;
      const d = dx * dx + dy * dy;
      if (d < nearestDist) { nearestDist = d; nearestTarget = other; }
    }
    if (!nearestTarget || nearestDist > 150 * 150) continue;

    switch (gDef.special) {
      case "ground_slam": { // Troll: AoE damage + slow around self
        const r2 = 50 * 50;
        for (const other of state.units) {
          if (!other.alive || other.owner === 2) continue;
          const dx = other.x - u.x, dy = other.y - u.y;
          if (dx * dx + dy * dy < r2) {
            other.hp -= 15;
            other.slowDebuff = Math.min(0.5, other.slowDebuff + 0.3);
            other.hitFlash = 0.15;
          }
        }
        // VFX: expanding ring
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          state.particles.push({
            x: u.x, y: u.y,
            vx: Math.cos(a) * 60, vy: Math.sin(a) * 60,
            life: 0.4, maxLife: 0.4, color: 0x886644, size: 4,
          });
        }
        state.shakeTimer = 0.2;
        state.shakeIntensity = 2;
        u.specialCooldown = gDef.specialCooldown;
        break;
      }
      case "fire_breath": { // Drake: cone damage in direction of target
        const dx = nearestTarget.x - u.x, dy = nearestTarget.y - u.y;
        const angle = Math.atan2(dy, dx);
        const coneHalf = Math.PI / 4; // 45-degree half-angle
        const range2 = 80 * 80;
        for (const other of state.units) {
          if (!other.alive || other.owner === 2) continue;
          const odx = other.x - u.x, ody = other.y - u.y;
          const od2 = odx * odx + ody * ody;
          if (od2 > range2) continue;
          const oAngle = Math.atan2(ody, odx);
          let angleDiff = Math.abs(oAngle - angle);
          if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
          if (angleDiff < coneHalf) {
            other.hp -= 12;
            other.hitFlash = 0.15;
          }
        }
        // Fire cone particles
        for (let i = 0; i < 10; i++) {
          const a = angle + (Math.random() - 0.5) * coneHalf * 2;
          const spd = 60 + Math.random() * 40;
          state.particles.push({
            x: u.x, y: u.y,
            vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
            life: 0.5, maxLife: 0.5, color: Math.random() > 0.5 ? 0xff6622 : 0xffaa44, size: 3,
          });
        }
        u.specialCooldown = gDef.specialCooldown;
        break;
      }
      case "pack_howl": { // Wolf: buff all wolves speed
        for (const other of state.units) {
          if (other.alive && other.owner === 2 && other.type === "wolf") {
            other.baseSpeed = GUARDIANS.wolf.speed * 1.3;
            // Howl particle
            state.particles.push({
              x: other.x, y: other.y - other.size,
              vx: 0, vy: -20, life: 0.5, maxLife: 0.5, color: 0xaaaaaa, size: 2,
            });
          }
        }
        u.specialCooldown = gDef.specialCooldown;
        break;
      }
      case "boulder": { // Elemental: ranged rock throw
        if (nearestTarget) {
          state.projectiles.push({
            x: u.x, y: u.y, targetId: nearestTarget.id,
            damage: 35, speed: 120, color: 0x886655, owner: 2,
            isSplash: false, sourceType: u.type,
          });
          state.particles.push({
            x: u.x, y: u.y - u.size,
            vx: 0, vy: -30, life: 0.3, maxLife: 0.3, color: 0x888877, size: 5,
          });
        }
        u.specialCooldown = gDef.specialCooldown;
        break;
      }
      case "dive_bomb": { // Wyvern: teleport to distant target, deal burst damage
        if (nearestDist > 40 * 40) { // only dive if target is far enough
          u.x = nearestTarget.x + (Math.random() - 0.5) * 10;
          u.y = nearestTarget.y + (Math.random() - 0.5) * 10;
          nearestTarget.hp -= 25;
          nearestTarget.hitFlash = 0.2;
          // Impact particles
          for (let i = 0; i < 6; i++) {
            state.particles.push({
              x: u.x, y: u.y,
              vx: (Math.random() - 0.5) * 80, vy: (Math.random() - 0.5) * 80,
              life: 0.4, maxLife: 0.4, color: 0x448888, size: 3,
            });
          }
          state.shakeTimer = 0.15;
          state.shakeIntensity = 1.5;
        }
        u.specialCooldown = gDef.specialCooldown;
        break;
      }
    }
  }
}

function updateRelics(state: KothState, dt: number): void {
  state.relicTimer += dt;
  if (state.relicTimer >= KothConfig.RELIC_SPAWN_INTERVAL) {
    state.relicTimer -= KothConfig.RELIC_SPAWN_INTERVAL;
    if (state.relics.filter(r => r.alive).length < 3) spawnRelic(state);
  }
  for (const relic of state.relics) {
    if (!relic.alive) continue;
    for (const unit of state.units) {
      if (!unit.alive || unit.owner === 2) continue;
      const dx = unit.x - relic.x, dy = unit.y - relic.y;
      if (dx * dx + dy * dy < KothConfig.RELIC_PICKUP_RADIUS * KothConfig.RELIC_PICKUP_RADIUS) {
        const rx = relic.x, ry = relic.y;
        relic.alive = false;
        applyRelic(state, unit.owner, relic.type, rx, ry);
        break;
      }
    }
  }
}

function applyRelic(state: KothState, owner: number, type: RelicType, rx: number, ry: number): void {
  const def = RELICS[type];
  const p = state.players[owner];
  switch (type) {
    case "speed":  p.speedBuffTimer = RELICS.speed.duration; break;
    case "damage": p.damageBuffTimer = RELICS.damage.duration; break;
    case "armor":  p.armorBuffTimer = RELICS.armor.duration; break;
    case "gold":   p.gold += 100; break;
    case "heal":
      for (const u of state.units) {
        if (u.alive && u.owner === owner) u.hp = Math.min(u.hp + u.maxHp * 0.4, u.maxHp);
      }
      break;
  }
  state.announcements.push({ text: `${p.name} found ${def.name}!`, color: def.color, timer: 2 });
  for (let i = 0; i < 8; i++) {
    state.particles.push({
      x: rx, y: ry,
      vx: (Math.random() - 0.5) * 80, vy: -40 - Math.random() * 40,
      life: 0.6, maxLife: 0.6, color: def.color, size: 3,
    });
  }
}

function updateCataclysms(state: KothState, dt: number): void {
  state.cataclysmTimer -= dt;
  if (state.cataclysmTimer <= 0 && !state.cataclysm) {
    state.cataclysmTimer = KothConfig.CATACLYSM_INTERVAL;
    const types: CataclysmType[] = ["meteor_shower", "earthquake", "dragon_flyover", "blizzard"];
    const type = types[Math.floor(Math.random() * types.length)];
    const def = CATACLYSMS[type];
    state.cataclysm = {
      type, timer: def.duration,
      x: KothConfig.HILL_CENTER_X + (Math.random() - 0.5) * 100,
      y: KothConfig.HILL_CENTER_Y + (Math.random() - 0.5) * 100,
    };
    state.announcements.push({ text: def.name + "!", color: def.color, timer: 2.5 });
    state.announcements.push({ text: def.desc, color: def.color, timer: 2 });
    state.shakeTimer = 0.4;
    state.shakeIntensity = KothConfig.SHAKE_INTENSITY;
  }
  if (state.cataclysm) {
    state.cataclysm.timer -= dt;
    applyCataclysmTick(state, dt);
    if (state.cataclysm.timer <= 0) state.cataclysm = null;
  }
}

function applyCataclysmTick(state: KothState, dt: number): void {
  const c = state.cataclysm!;
  switch (c.type) {
    case "meteor_shower": {
      if (Math.random() < dt * 3) {
        const mx = c.x + (Math.random() - 0.5) * KothConfig.HILL_RADIUS * 2;
        const my = c.y + (Math.random() - 0.5) * KothConfig.HILL_RADIUS * 2;
        for (const u of state.units) {
          if (!u.alive) continue;
          const dx = u.x - mx, dy = u.y - my;
          if (dx * dx + dy * dy < 40 * 40) { u.hp -= 20; u.hitFlash = 0.15; }
        }
        for (let i = 0; i < 6; i++) {
          state.particles.push({ x: mx, y: my, vx: (Math.random() - 0.5) * 100, vy: -50 - Math.random() * 50, life: 0.5, maxLife: 0.5, color: 0xff6622, size: 4 });
        }
        state.shakeTimer = 0.1;
        state.shakeIntensity = 1.5;
      }
      break;
    }
    case "earthquake": {
      for (const u of state.units) {
        if (!u.alive) continue;
        u.slowDebuff = Math.min(0.4, u.slowDebuff + dt * 0.15);
        const dx = u.x - KothConfig.HILL_CENTER_X, dy = u.y - KothConfig.HILL_CENTER_Y;
        if (dx * dx + dy * dy < KothConfig.HILL_RADIUS * KothConfig.HILL_RADIUS) {
          if (Math.random() < dt * 2) { u.hp -= 8; u.hitFlash = 0.1; }
        }
      }
      break;
    }
    case "dragon_flyover": {
      const progress = 1 - c.timer / CATACLYSMS.dragon_flyover.duration;
      const breathX = KothConfig.ARENA_W * progress;
      const breathY = KothConfig.HILL_CENTER_Y + Math.sin(progress * Math.PI) * 40;
      for (const u of state.units) {
        if (!u.alive) continue;
        const dx = u.x - breathX, dy = u.y - breathY;
        if (dx * dx + dy * dy < 50 * 50) { u.hp -= 30 * dt; u.hitFlash = 0.1; }
      }
      if (Math.random() < dt * 8) {
        state.particles.push({ x: breathX, y: breathY, vx: (Math.random() - 0.5) * 60, vy: 20 + Math.random() * 30, life: 0.4, maxLife: 0.4, color: 0xff4400, size: 5 });
      }
      break;
    }
    case "blizzard": {
      for (const u of state.units) {
        if (u.alive) u.slowDebuff = Math.min(0.5, u.slowDebuff + dt * 0.2);
      }
      if (Math.random() < dt * 15) {
        state.particles.push({ x: Math.random() * KothConfig.ARENA_W, y: 0, vx: -20 + Math.random() * 10, vy: 40 + Math.random() * 30, life: 2, maxLife: 2, color: 0xccddff, size: 2 });
      }
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// AI
// ---------------------------------------------------------------------------

function updateAI(state: KothState, dt: number): void {
  const ai = state.players[1];
  if (!ai.isAI) return;
  ai.aiTimer += dt;
  const aiInterval = KothConfig.AI_SPAWN_INTERVAL * DIFFICULTIES[state.difficulty].aiSpawnMult;
  if (ai.aiTimer < aiInterval) return;
  ai.aiTimer -= aiInterval;

  const myUnits = state.units.filter(u => u.alive && u.owner === 1);
  const enemyUnits = state.units.filter(u => u.alive && u.owner === 0);
  const affordable = ALL_UNIT_TYPES.filter(t => UNITS[t].cost <= ai.gold);
  if (affordable.length === 0) return;

  const scoreDiff = state.players[0].score - ai.score;
  if (scoreDiff > 150 && myUnits.length < 4 && ai.gold < 150) {
    ai.aiSaveMode = true;
  }
  if (ai.aiSaveMode && ai.gold >= 200) {
    ai.aiSaveMode = false;
  }
  if (ai.aiSaveMode) return;

  const enemyMelee = enemyUnits.filter(u => { const d = UNITS[u.type as UnitType]; return d && d.range === 0; }).length;
  const enemyRanged = enemyUnits.filter(u => { const d = UNITS[u.type as UnitType]; return d && d.range > 0; }).length;
  const enemyHeavy = enemyUnits.filter(u => u.type === "paladin" || u.type === "cavalry").length;

  let pick: UnitType;
  if (enemyRanged > enemyUnits.length * 0.4 && affordable.includes("cavalry")) {
    pick = "cavalry";
  } else if (enemyHeavy > 3 && affordable.includes("pikeman")) {
    pick = "pikeman";
  } else if (enemyMelee > enemyUnits.length * 0.5 && affordable.includes("archer")) {
    pick = "archer";
  } else if (myUnits.length < 3) {
    pick = affordable.includes("swordsman") ? "swordsman" : affordable[0];
  } else if (ai.gold > 200 && myUnits.length < 10 && affordable.includes("paladin")) {
    pick = Math.random() < 0.35 ? "paladin" : "mage";
  } else if (state.hillController === 0 && myUnits.length >= 8 && affordable.includes("berserker")) {
    pick = "berserker";
  } else {
    const weights: [UnitType, number][] = [
      ["swordsman", 3], ["archer", 2], ["pikeman", 2], ["cavalry", 1.5],
      ["mage", 1], ["berserker", 1.5], ["crossbow", 1], ["paladin", 0.5],
    ];
    const valid = weights.filter(([t]) => affordable.includes(t));
    const total = valid.reduce((s, [, w]) => s + w, 0);
    let r = Math.random() * total;
    pick = valid[valid.length - 1][0];
    for (const [t, w] of valid) { r -= w; if (r <= 0) { pick = t; break; } }
  }
  spawnUnit(state, 1, pick);
  if (ai.gold > 150 && Math.random() < 0.4) spawnUnit(state, 1, pick);
}

// ---------------------------------------------------------------------------
// Ranged kiting: ranged units retreat from approaching melee
// ---------------------------------------------------------------------------

function updateKiting(state: KothState): void {
  for (const u of state.units) {
    if (!u.alive || u.owner === 2) continue;
    const def = UNITS[u.type as UnitType];
    if (!def || def.range === 0) continue; // only ranged units kite

    // Check if any melee enemy is dangerously close
    let closestMeleeDist = Infinity;
    let threatX = 0, threatY = 0;
    for (const other of state.units) {
      if (!other.alive || other.owner === u.owner) continue;
      const otherDef = UNITS[other.type as UnitType];
      const otherRange = otherDef ? otherDef.range : 0;
      if (otherRange > 0) continue; // only flee from melee
      const dx = other.x - u.x, dy = other.y - u.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < closestMeleeDist) {
        closestMeleeDist = d;
        threatX = other.x;
        threatY = other.y;
      }
    }

    // If a melee unit is within kite trigger distance, retreat away from it
    if (closestMeleeDist < KothConfig.KITE_TRIGGER_DIST) {
      const dx = u.x - threatX, dy = u.y - threatY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0.1) {
        u.goalX = clamp(u.x + (dx / dist) * KothConfig.KITE_RETREAT_DIST, 10, KothConfig.ARENA_W - 10);
        u.goalY = clamp(u.y + (dy / dist) * KothConfig.KITE_RETREAT_DIST, 10, KothConfig.ARENA_H - 10);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Movement (with obstacle avoidance)
// ---------------------------------------------------------------------------

function updateMovement(state: KothState, dt: number): void {
  for (const u of state.units) {
    if (!u.alive) continue;

    if (u.targetId) {
      const target = state.units.find(t => t.id === u.targetId);
      if (target && target.alive) {
        const dx = target.x - u.x, dy = target.y - u.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const atkRange = u.range > 0 ? u.range : u.size + target.size + 4;
        if (dist <= atkRange) continue;
        u.goalX = target.x;
        u.goalY = target.y;
      }
    }

    const dx = u.goalX - u.x, dy = u.goalY - u.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    for (const obs of state.obstacles) {
      const ox = u.x - obs.x, oy = u.y - obs.y;
      const od = Math.sqrt(ox * ox + oy * oy);
      const clearance = obs.radius + u.size + 4;
      if (od < clearance && od > 0.1) {
        const pushStr = (clearance - od) / clearance * 80 * dt;
        u.x += (ox / od) * pushStr;
        u.y += (oy / od) * pushStr;
      }
    }

    if (dist > 3) {
      const moveSpeed = u.speed * dt;
      const step = Math.min(moveSpeed, dist);
      u.x += (dx / dist) * step;
      u.y += (dy / dist) * step;
      // Update facing angle toward movement direction
      u.facingAngle = Math.atan2(dy, dx);
    } else if (u.owner !== 2) {
      if (u.owner === 0 && state.hasRallyPoint) {
        u.goalX = state.rallyX + (Math.random() - 0.5) * 30;
        u.goalY = state.rallyY + (Math.random() - 0.5) * 30;
      } else {
        u.goalX = KothConfig.HILL_CENTER_X + (Math.random() - 0.5) * KothConfig.HILL_RADIUS * 1.2;
        u.goalY = KothConfig.HILL_CENTER_Y + (Math.random() - 0.5) * KothConfig.HILL_RADIUS * 1.2;
      }
    }
    u.x = clamp(u.x, 5, KothConfig.ARENA_W - 5);
    u.y = clamp(u.y, 5, KothConfig.ARENA_H - 5);
  }
}

function updateSeparation(state: KothState, dt: number): void {
  const units = state.units;
  for (let i = 0; i < units.length; i++) {
    const a = units[i];
    if (!a.alive) continue;
    for (let j = i + 1; j < units.length; j++) {
      const b = units[j];
      if (!b.alive) continue;
      const dx = a.x - b.x, dy = a.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = a.size + b.size + 2;
      if (dist < minDist && dist > 0.1) {
        const push = (minDist - dist) * 0.5 * KothConfig.UNIT_SEPARATION_FORCE * dt;
        const nx = dx / dist, ny = dy / dist;
        a.x += nx * push; a.y += ny * push;
        b.x -= nx * push; b.y -= ny * push;
      }
    }
  }
}

function updateAbilities(state: KothState, dt: number): void {
  for (const u of state.units) {
    if (!u.alive || u.owner === 2) continue;
    const def = UNITS[u.type as UnitType];
    if (!def) continue;
    if (def.passive === "aura_heal") {
      const r2 = KothConfig.PALADIN_HEAL_RADIUS * KothConfig.PALADIN_HEAL_RADIUS;
      for (const ally of state.units) {
        if (!ally.alive || ally.owner !== u.owner || ally.id === u.id) continue;
        const dx = ally.x - u.x, dy = ally.y - u.y;
        if (dx * dx + dy * dy < r2 && ally.hp < ally.maxHp) {
          ally.hp = Math.min(ally.maxHp, ally.hp + KothConfig.PALADIN_HEAL_PER_SEC * dt);
          if (Math.random() < dt * 2) {
            state.particles.push({ x: ally.x, y: ally.y - ally.size, vx: (Math.random() - 0.5) * 10, vy: -15, life: 0.4, maxLife: 0.4, color: 0x44ff88, size: 2 });
          }
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Combat (with smart targeting, passives, slash VFX, veterancy)
// ---------------------------------------------------------------------------

function updateCombat(state: KothState, dt: number): void {
  for (const u of state.units) {
    if (!u.alive) continue;
    u.attackCooldown -= dt;

    // Validate target
    if (u.targetId) {
      const t = state.units.find(t2 => t2.id === u.targetId);
      if (!t || !t.alive) u.targetId = null;
    }

    // Smart target acquisition
    if (!u.targetId) {
      let bestScore = -Infinity;
      const aggroRange = Math.max(u.range, 100);
      const ar2 = aggroRange * aggroRange;
      for (const other of state.units) {
        if (!other.alive || other.owner === u.owner) continue;
        if (u.owner !== 2 && other.owner === u.owner) continue;
        const dx = other.x - u.x, dy = other.y - u.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > ar2) continue;
        const dist = Math.sqrt(d2);
        // Score: prefer low HP, close distance, already targeting us
        let score = -dist * 0.5; // prefer closer
        score += (1 - other.hp / other.maxHp) * 80; // prefer low HP (focus fire)
        if (other.targetId === u.id) score += 30; // prefer units targeting us
        // Ranged units prefer low-HP targets more aggressively
        if (u.range > 0) score += (1 - other.hp / other.maxHp) * 40;
        if (score > bestScore) {
          bestScore = score;
          u.targetId = other.id;
        }
      }
    }

    // Attack
    if (u.targetId && u.attackCooldown <= 0) {
      const target = state.units.find(t => t.id === u.targetId);
      if (!target || !target.alive) { u.targetId = null; continue; }
      const dx = target.x - u.x, dy = target.y - u.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const atkRange = u.range > 0 ? u.range : u.size + target.size + 4;

      if (dist <= atkRange) {
        const def = UNITS[u.type as UnitType];
        let rate = u.attackRate;
        if (def?.passive === "frenzy" && u.hp < u.maxHp * 0.5) rate *= 2;
        u.attackCooldown = 1 / rate;
        u.idleTimer = 0; // reset idle timer on attack

        let damage = u.atk;

        // Cavalry charge
        if (def?.passive === "charge" && !u.hasCharged) {
          damage *= 3;
          u.hasCharged = true;
          state.particles.push({ x: target.x, y: target.y, vx: 0, vy: -20, life: 0.5, maxLife: 0.5, color: 0xffaa44, size: 6 });
          state.shakeTimer = 0.08;
          state.shakeIntensity = 1;
        }

        // Anti-cavalry
        if (def?.passive === "anti_cav" && target.type === "cavalry") {
          damage = Math.round(damage * 1.5);
        }

        // Pikeman brace vs cavalry
        if (def?.passive === "brace" && target.type === "cavalry") {
          damage = Math.round(damage * 1.8);
        }

        if (u.range > 0) {
          state.projectiles.push({
            x: u.x, y: u.y, targetId: target.id,
            damage, speed: 200, color: u.color, owner: u.owner,
            isSplash: false, sourceType: u.type,
          });
          // Ranged trail VFX
          state.rangedTrails.push({
            x1: u.x, y1: u.y, x2: target.x, y2: target.y,
            color: u.color, timer: KothConfig.RANGED_TRAIL_DURATION,
          });
          u.facingAngle = Math.atan2(dy, dx); // face target when shooting
        } else {
          applyDamage(state, target, damage, u.owner, u.type, u);
          u.hitFlash = 0.12;
          // Slash arc VFX
          u.slashArc = 0.15;
          u.slashAngle = Math.atan2(dy, dx);
        }
      }
    }
  }
}

function applyDamage(state: KothState, target: KothUnit, damage: number, attackerOwner: number, sourceType: UnitType | GuardianType, attacker?: KothUnit): void {
  // Armor buff
  if (target.owner < 2 && state.players[target.owner].armorBuffTimer > 0) {
    const srcDef = UNITS[sourceType as UnitType];
    if (!srcDef || srcDef.passive !== "pierce") {
      damage *= 0.6;
    }
  }

  // Pikeman brace: -30% melee damage taken
  const targetDef = UNITS[target.type as UnitType];
  if (targetDef?.passive === "brace") {
    const srcDef = UNITS[sourceType as UnitType];
    if (srcDef && srcDef.range === 0) damage *= 0.7;
  }

  damage = Math.round(damage);
  target.hp -= damage;
  target.hitFlash = 0.12;

  // Floating damage number
  if (damage >= 3) {
    const dmgColor = attackerOwner === 0 ? 0xffffff : attackerOwner === 1 ? 0xff8888 : 0xccccaa;
    state.floatingTexts.push({
      x: target.x + (Math.random() - 0.5) * 8, y: target.y - target.size - 4,
      text: `-${damage}`, color: dmgColor,
      timer: KothConfig.FLOAT_TEXT_DURATION, maxTimer: KothConfig.FLOAT_TEXT_DURATION,
    });
  }

  if (target.hp <= 0) {
    target.alive = false;
    // Kill rewards
    if (attackerOwner < 2) {
      const unitDef = UNITS[target.type as UnitType];
      const guardianDef = GUARDIANS[target.type as GuardianType];
      let goldEarned = 0;
      if (unitDef) {
        goldEarned = Math.round(unitDef.cost * KothConfig.KILL_GOLD_MULT);
      } else if (guardianDef) {
        goldEarned = guardianDef.reward;
        state.guardiansKilled[attackerOwner]++;
      }
      state.players[attackerOwner].gold += goldEarned;
      state.kills[attackerOwner]++;

      // Gold earned floating text
      if (goldEarned > 0 && attacker) {
        state.floatingTexts.push({
          x: target.x, y: target.y - target.size - 12,
          text: `+${goldEarned}g`, color: 0xffd700,
          timer: KothConfig.FLOAT_TEXT_DURATION * 1.2, maxTimer: KothConfig.FLOAT_TEXT_DURATION * 1.2,
        });
      }

      // Multi-kill tracking
      state.recentKillTimer[attackerOwner] = 0;
      state.killCombo[attackerOwner]++;

      // Veterancy: grant kill to attacker
      if (attacker && attacker.alive && attacker.owner < 2) {
        attacker.vetKills++;
        if (attacker.vetLevel < VET_MAX_LEVEL && attacker.vetKills >= VET_KILLS[attacker.vetLevel + 1]) {
          attacker.vetLevel++;
          // Level-up particles
          for (let i = 0; i < 6; i++) {
            state.particles.push({
              x: attacker.x, y: attacker.y,
              vx: (Math.random() - 0.5) * 40, vy: -20 - Math.random() * 20,
              life: 0.6, maxLife: 0.6, color: 0xffd700, size: 2.5,
            });
          }
        }
      }

      // Kill feed
      const killerName = attacker ? (UNITS[attacker.type as UnitType]?.name ?? attacker.type) : sourceType;
      const victimName = unitDef?.name ?? guardianDef?.name ?? target.type;
      state.killFeed.push({
        text: `${killerName} killed ${victimName}`,
        color: attackerOwner === 0 ? 0x4488cc : 0xcc4444,
        timer: KothConfig.KILL_FEED_DURATION,
      });
      if (state.killFeed.length > KothConfig.KILL_FEED_MAX) state.killFeed.shift();
    }

    // Death particles
    for (let i = 0; i < 5; i++) {
      state.particles.push({
        x: target.x, y: target.y,
        vx: (Math.random() - 0.5) * 80, vy: (Math.random() - 0.5) * 80,
        life: 0.5, maxLife: 0.5, color: target.color, size: 2.5,
      });
    }
  }
}

function updateProjectiles(state: KothState, dt: number): void {
  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const p = state.projectiles[i];
    const target = state.units.find(u => u.id === p.targetId);
    if (!target || !target.alive) { state.projectiles.splice(i, 1); continue; }
    const dx = target.x - p.x, dy = target.y - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const step = p.speed * dt;
    if (dist <= step + target.size) {
      applyDamage(state, target, p.damage, p.owner, p.sourceType);

      // Mage splash
      const srcDef = UNITS[p.sourceType as UnitType];
      if (srcDef?.passive === "splash" && !p.isSplash) {
        const sr2 = KothConfig.MAGE_SPLASH_RADIUS * KothConfig.MAGE_SPLASH_RADIUS;
        for (const other of state.units) {
          if (!other.alive || other.id === target.id || other.owner === p.owner) continue;
          const sdx = other.x - target.x, sdy = other.y - target.y;
          if (sdx * sdx + sdy * sdy < sr2) {
            applyDamage(state, other, Math.round(p.damage * KothConfig.MAGE_SPLASH_MULT), p.owner, p.sourceType);
          }
        }
        for (let si = 0; si < 4; si++) {
          state.particles.push({ x: target.x, y: target.y, vx: (Math.random() - 0.5) * 50, vy: (Math.random() - 0.5) * 50, life: 0.3, maxLife: 0.3, color: 0x8844cc, size: 3 });
        }
      }
      state.projectiles.splice(i, 1);
    } else {
      p.x += (dx / dist) * step;
      p.y += (dy / dist) * step;
    }
  }
}

// ---------------------------------------------------------------------------
// Hill capture meter
// ---------------------------------------------------------------------------

function updateHillControl(state: KothState, dt: number): void {
  state.hillContestPulse += dt;
  const hx = KothConfig.HILL_CENTER_X, hy = KothConfig.HILL_CENTER_Y;
  const hr2 = KothConfig.HILL_RADIUS * KothConfig.HILL_RADIUS;
  const counts = [0, 0];

  for (const u of state.units) {
    if (!u.alive || u.owner === 2) continue;
    const dx = u.x - hx, dy = u.y - hy;
    if (dx * dx + dy * dy <= hr2) counts[u.owner]++;
  }

  if (counts[0] > counts[1]) {
    state.captureMeter += (counts[0] - counts[1]) * KothConfig.CAPTURE_RATE * dt;
  } else if (counts[1] > counts[0]) {
    state.captureMeter -= (counts[1] - counts[0]) * KothConfig.CAPTURE_RATE * dt;
  } else {
    if (state.captureMeter > 0) state.captureMeter = Math.max(0, state.captureMeter - KothConfig.CAPTURE_DECAY * dt);
    else if (state.captureMeter < 0) state.captureMeter = Math.min(0, state.captureMeter + KothConfig.CAPTURE_DECAY * dt);
  }
  state.captureMeter = clamp(state.captureMeter, -100, 100);

  const prevController = state.hillController;
  if (state.captureMeter >= 60) state.hillController = 0;
  else if (state.captureMeter <= -60) state.hillController = 1;
  else state.hillController = -1;

  if (state.hillController >= 0) {
    if (state.streakOwner === state.hillController) {
      state.streakTimer += dt;
    } else {
      if (prevController !== state.hillController) {
        state.announcements.push({ text: `${state.players[state.hillController].name} seizes the hill!`, color: state.players[state.hillController].color, timer: 2 });
      }
      state.streakOwner = state.hillController;
      state.streakTimer = 0;
    }
    if (state.streakTimer > state.longestStreak[state.hillController]) {
      state.longestStreak[state.hillController] = state.streakTimer;
    }
    if (state.streakTimer >= KothConfig.STREAK_THRESHOLD && Math.floor((state.streakTimer - dt) / 10) < Math.floor(state.streakTimer / 10)) {
      const mult = Math.min(KothConfig.STREAK_MAX_MULT, 1 + Math.floor(state.streakTimer / 10) * KothConfig.STREAK_MULT_PER_10S);
      state.announcements.push({ text: `DOMINATION x${mult.toFixed(1)}!`, color: 0xffd700, timer: 1.5 });
    }
  } else {
    state.streakTimer = 0;
    state.streakOwner = -1;
  }

  for (const p of state.players) {
    p.controllingHill = state.hillController === p.id;
    if (p.controllingHill) {
      const minutes = state.elapsed / 60;
      let pointsPerSec = KothConfig.BASE_POINTS_PER_SEC + minutes * KothConfig.ESCALATION_RATE;
      if (state.streakTimer >= KothConfig.STREAK_THRESHOLD) {
        pointsPerSec *= Math.min(KothConfig.STREAK_MAX_MULT, 1 + Math.floor(state.streakTimer / 10) * KothConfig.STREAK_MULT_PER_10S);
      }
      p.score += pointsPerSec * dt;
      state.hillTimeHeld[p.id] += dt;
    }
  }
}

function updateParticles(state: KothState, dt: number): void {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.life -= dt;
    if (p.life <= 0) state.particles.splice(i, 1);
  }
}

function updateAnnouncements(state: KothState, dt: number): void {
  for (let i = state.announcements.length - 1; i >= 0; i--) {
    state.announcements[i].timer -= dt;
    if (state.announcements[i].timer <= 0) state.announcements.splice(i, 1);
  }
}

function updateKillFeed(state: KothState, dt: number): void {
  for (let i = state.killFeed.length - 1; i >= 0; i--) {
    state.killFeed[i].timer -= dt;
    if (state.killFeed[i].timer <= 0) state.killFeed.splice(i, 1);
  }
}

function updateFloatingTexts(state: KothState, dt: number): void {
  for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
    const ft = state.floatingTexts[i];
    ft.y -= KothConfig.FLOAT_TEXT_SPEED * dt;
    ft.timer -= dt;
    if (ft.timer <= 0) state.floatingTexts.splice(i, 1);
  }
}

function updateMultiKill(state: KothState, dt: number): void {
  for (let p = 0; p < 2; p++) {
    state.recentKillTimer[p] += dt;
    if (state.recentKillTimer[p] > KothConfig.MULTI_KILL_WINDOW && state.killCombo[p] > 0) {
      // Combo expired — check if it was notable
      const combo = state.killCombo[p];
      if (combo >= 2) {
        const labels = ["", "", "DOUBLE KILL!", "TRIPLE KILL!", "QUAD KILL!", "RAMPAGE!"];
        const label = combo >= labels.length ? `${combo}x KILL STREAK!` : labels[combo];
        const color = p === 0 ? 0x44ddff : 0xff6644;
        state.announcements.push({ text: label, color, timer: 2 });
      }
      state.killCombo[p] = 0;
    }
  }
}

let _autoSpawnAccum = 0;
function updateAutoSpawn(state: KothState, dt: number): void {
  if (!state.spaceHeld) { _autoSpawnAccum = 0; return; }
  _autoSpawnAccum += dt;
  if (_autoSpawnAccum >= KothConfig.AUTO_SPAWN_INTERVAL) {
    _autoSpawnAccum -= KothConfig.AUTO_SPAWN_INTERVAL;
    spawnUnit(state, 0, state.selectedUnit);
  }
}

function updateRangedTrails(state: KothState, dt: number): void {
  for (let i = state.rangedTrails.length - 1; i >= 0; i--) {
    state.rangedTrails[i].timer -= dt;
    if (state.rangedTrails[i].timer <= 0) state.rangedTrails.splice(i, 1);
  }
}

function updateContestSparks(state: KothState, dt: number): void {
  // When both players have units on the hill, emit clash sparks
  const hx = KothConfig.HILL_CENTER_X, hy = KothConfig.HILL_CENTER_Y;
  const hr2 = KothConfig.HILL_RADIUS * KothConfig.HILL_RADIUS;
  let p0Count = 0, p1Count = 0;
  for (const u of state.units) {
    if (!u.alive || u.owner === 2) continue;
    const dx = u.x - hx, dy = u.y - hy;
    if (dx * dx + dy * dy <= hr2) {
      if (u.owner === 0) p0Count++;
      else p1Count++;
    }
  }
  if (p0Count > 0 && p1Count > 0) {
    // Both armies on hill — spark!
    if (Math.random() < dt * KothConfig.CONTEST_SPARK_RATE) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * KothConfig.HILL_RADIUS * 0.7;
      const sx = hx + Math.cos(angle) * r, sy = hy + Math.sin(angle) * r;
      const sparkColor = Math.random() > 0.5 ? 0xffcc44 : 0xffffff;
      for (let i = 0; i < 3; i++) {
        state.particles.push({
          x: sx, y: sy,
          vx: (Math.random() - 0.5) * 60, vy: -20 - Math.random() * 30,
          life: 0.25, maxLife: 0.25, color: sparkColor, size: 2,
        });
      }
    }
  }
}

export function purchaseUpgrade(state: KothState, upgradeId: UpgradeId): boolean {
  const def = UPGRADES[upgradeId];
  const level = state.upgrades[upgradeId];
  if (level >= def.maxLevel) return false;
  const cost = def.cost * (level + 1); // escalating cost
  if (state.players[0].gold < cost) return false;
  state.players[0].gold -= cost;
  state.goldSpent[0] += cost;
  state.upgrades[upgradeId]++;
  state.announcements.push({ text: `${def.name} Lv${state.upgrades[upgradeId]}!`, color: def.color, timer: 2 });
  return true;
}

function updateShake(state: KothState, dt: number): void {
  if (state.shakeTimer > 0) state.shakeTimer = Math.max(0, state.shakeTimer - dt);
}

function cleanDead(state: KothState): void {
  state.units = state.units.filter(u => u.alive);
  state.relics = state.relics.filter(r => r.alive);
}

function checkVictory(state: KothState): void {
  const scoreLimit = DIFFICULTIES[state.difficulty].scoreLimit;
  for (const p of state.players) {
    if (p.score >= scoreLimit) {
      state.phase = KothPhase.VICTORY;
      state.winner = p.id;
      state.announcements.push({
        text: p.id === 0 ? "VICTORY!" : "DEFEAT!",
        color: p.id === 0 ? 0xffd700 : 0xff4444,
        timer: 5,
      });
      return;
    }
  }
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}
