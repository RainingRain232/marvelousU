// ---------------------------------------------------------------------------
// Void Knight — Core game systems (v2)
// Dash combat, multiplier, graze meter, boss spawners, reflect/bomb orbs
// ---------------------------------------------------------------------------

import { ProjectilePattern, VKPhase } from "../types";
import type { VKState, VKSpawner, VKOrb, VKPerk, VKWaveTemplate } from "../types";
import { VK } from "../config/VoidKnightBalance";

// ---------------------------------------------------------------------------
// Player movement
// ---------------------------------------------------------------------------

export function updatePlayer(state: VKState, dt: number, keys: Set<string>): void {
  let mx = 0, my = 0;
  if (keys.has("ArrowUp") || keys.has("KeyW")) my -= 1;
  if (keys.has("ArrowDown") || keys.has("KeyS")) my += 1;
  if (keys.has("ArrowLeft") || keys.has("KeyA")) mx -= 1;
  if (keys.has("ArrowRight") || keys.has("KeyD")) mx += 1;
  const len = Math.sqrt(mx * mx + my * my);
  if (len > 0) { mx /= len; my /= len; }

  const speed = state.dashTimer > 0 ? state.playerSpeed * VK.DASH_SPEED_MULT : state.playerSpeed;
  state.playerVX = mx * speed;
  state.playerVY = my * speed;

  if (state.dashTimer > 0) {
    state.playerX += state.dashDirX * speed * dt;
    state.playerY += state.dashDirY * speed * dt;
  } else {
    state.playerX += state.playerVX * dt;
    state.playerY += state.playerVY * dt;
  }

  // Constrain to arena
  const dx = state.playerX - state.arenaCenterX;
  const dy = state.playerY - state.arenaCenterY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const maxDist = state.arenaRadius - state.playerRadius - 2;
  if (dist > maxDist) {
    state.playerX = state.arenaCenterX + (dx / dist) * maxDist;
    state.playerY = state.arenaCenterY + (dy / dist) * maxDist;
  }
}

export function tryDash(state: VKState, keys: Set<string>): boolean {
  if (state.dashTimer > 0) return false;

  // Emergency dash: works during cooldown but costs multiplier
  if (state.dashCooldown > 0) {
    if (state.multiplier <= 1.1) return false; // need multiplier to spend
    state.multiplier *= (1.0 - VK.EMERGENCY_DASH_MULT_COST);
    if (state.multiplier < 1.0) state.multiplier = 1.0;
    spawnFloatText(state, state.playerX, state.playerY - 15, "EMERGENCY!", 0xff4444, 1.2);
  }

  let mx = 0, my = 0;
  if (keys.has("ArrowUp") || keys.has("KeyW")) my -= 1;
  if (keys.has("ArrowDown") || keys.has("KeyS")) my += 1;
  if (keys.has("ArrowLeft") || keys.has("KeyA")) mx -= 1;
  if (keys.has("ArrowRight") || keys.has("KeyD")) mx += 1;
  const len = Math.sqrt(mx * mx + my * my);
  if (len > 0) { mx /= len; my /= len; }
  else {
    const vlen = Math.sqrt(state.playerVX * state.playerVX + state.playerVY * state.playerVY);
    if (vlen > 0) { mx = state.playerVX / vlen; my = state.playerVY / vlen; }
    else { mx = 0; my = -1; }
  }

  state.dashDirX = mx; state.dashDirY = my;
  state.dashTimer = VK.DASH_DURATION * (state.selectedPerks.includes("longer_dash") ? 1.4 : 1.0);
  state.dashCooldown = VK.DASH_COOLDOWN * (state.selectedPerks.includes("dash_recharge") ? 0.75 : 1.0);
  state.dashKills = 0;

  for (let i = 0; i < VK.DASH_TRAIL_COUNT; i++) {
    spawnParticle(state, state.playerX, state.playerY,
      (Math.random() - 0.5) * 60 - mx * 80, (Math.random() - 0.5) * 60 - my * 80,
      VK.COLOR_PLAYER_DASH, 3 + Math.random() * 3);
  }
  return true;
}

// Graze burst (E key)
export function tryGrazeBurst(state: VKState): boolean {
  if (!state.grazeBurstReady || state.grazeMeter < VK.GRAZE_MAX) return false;
  state.grazeMeter = 0;
  state.grazeBurstReady = false;

  // Destroy all projectiles in radius + damage spawners
  const px = state.playerX, py = state.playerY;
  let destroyed = 0;
  for (const p of state.projectiles) {
    const dx = p.x - px, dy = p.y - py;
    if (Math.sqrt(dx * dx + dy * dy) < VK.GRAZE_BURST_RADIUS) {
      p.life = 0;
      spawnParticle(state, p.x, p.y, (Math.random()-0.5)*80, (Math.random()-0.5)*80, VK.COLOR_GRAZE, 3);
      destroyed++;
    }
  }

  // Damage nearby spawners
  const cx = state.arenaCenterX, cy = state.arenaCenterY, r = state.arenaRadius;
  for (const s of state.spawners) {
    if (!s.alive) continue;
    const sx = cx + Math.cos(s.angle) * r;
    const sy = cy + Math.sin(s.angle) * r;
    const dist = Math.sqrt((sx - px) * (sx - px) + (sy - py) * (sy - py));
    if (dist < VK.GRAZE_BURST_RADIUS + VK.SPAWNER_RADIUS) {
      damageSpawner(state, s);
    }
  }

  const pts = VK.SCORE_GRAZE_BURST * state.multiplier;
  state.score += pts;
  spawnFloatText(state, px, py - 20, `BURST! +${Math.floor(pts)} (${destroyed} cleared)`, VK.COLOR_GRAZE, 1.8);
  spawnParticles(state, px, py, 20, VK.COLOR_GRAZE);
  state.screenShake = VK.SHAKE_DURATION * 1.5;
  state.screenFlashColor = VK.COLOR_GRAZE; state.screenFlashTimer = VK.FLASH_DURATION * 2;
  state.hitstopTimer = Math.max(state.hitstopTimer, VK.HITSTOP_GRAZE_BURST);
  addMultiplier(state, VK.MULT_GAIN_DASH_KILL * destroyed);
  return true;
}

// ---------------------------------------------------------------------------
// Spawners
// ---------------------------------------------------------------------------

const WAVE_TEMPLATES: VKWaveTemplate[] = [
  { name: "The Void Awakens", spawners: [
    { pattern: ProjectilePattern.STRAIGHT, movement: "orbit" },
    { pattern: ProjectilePattern.STRAIGHT, movement: "orbit" },
    { pattern: ProjectilePattern.STRAIGHT, movement: "orbit" },
  ]},
  { name: "Spiral Dance", spawners: [
    { pattern: ProjectilePattern.SPIRAL, movement: "orbit" },
    { pattern: ProjectilePattern.SPIRAL, movement: "orbit" },
    { pattern: ProjectilePattern.SPIRAL, movement: "orbit" },
    { pattern: ProjectilePattern.SPIRAL, movement: "orbit" },
  ]},
  { name: "Crossfire", spawners: [
    { pattern: ProjectilePattern.AIMED, movement: "stationary" },
    { pattern: ProjectilePattern.AIMED, movement: "stationary" },
    { pattern: ProjectilePattern.STRAIGHT, movement: "orbit" },
  ]},
  { name: "Ring Around", spawners: [
    { pattern: ProjectilePattern.RING, movement: "orbit" },
    { pattern: ProjectilePattern.RING, movement: "orbit" },
    { pattern: ProjectilePattern.STRAIGHT, movement: "oscillate" },
  ], mutator: "gravity_well" },
  { name: "The Sentinel", spawners: [
    { pattern: ProjectilePattern.CROSS, movement: "orbit", isBoss: true },
    { pattern: ProjectilePattern.STRAIGHT, movement: "orbit" },
  ]},
  { name: "Phantom Menace", spawners: [
    { pattern: ProjectilePattern.AIMED, movement: "oscillate" },
    { pattern: ProjectilePattern.AIMED, movement: "oscillate" },
    { pattern: ProjectilePattern.SPIRAL, movement: "orbit" },
    { pattern: ProjectilePattern.WAVE, movement: "stationary" },
  ], mutator: "phantom" },
  { name: "Void Storm", spawners: [
    { pattern: ProjectilePattern.SPIRAL, movement: "orbit" },
    { pattern: ProjectilePattern.SPIRAL, movement: "orbit" },
    { pattern: ProjectilePattern.SPIRAL, movement: "orbit" },
    { pattern: ProjectilePattern.SPIRAL, movement: "orbit" },
    { pattern: ProjectilePattern.SPIRAL, movement: "orbit" },
    { pattern: ProjectilePattern.SPIRAL, movement: "orbit" },
  ], mutator: "gravity_well" },
  { name: "The Gauntlet", spawners: [
    { pattern: ProjectilePattern.AIMED, movement: "oscillate" },
    { pattern: ProjectilePattern.AIMED, movement: "oscillate" },
    { pattern: ProjectilePattern.AIMED, movement: "oscillate" },
    { pattern: ProjectilePattern.AIMED, movement: "oscillate" },
  ], mutator: "void_surge" },
  { name: "Mirror Match", spawners: [
    { pattern: ProjectilePattern.CROSS, movement: "orbit", isBoss: true },
    { pattern: ProjectilePattern.CROSS, movement: "orbit", isBoss: true },
  ]},
  { name: "Final Convergence", spawners: [
    { pattern: ProjectilePattern.RING, movement: "orbit" },
    { pattern: ProjectilePattern.SPIRAL, movement: "oscillate" },
    { pattern: ProjectilePattern.AIMED, movement: "stationary" },
    { pattern: ProjectilePattern.WAVE, movement: "orbit" },
    { pattern: ProjectilePattern.CROSS, movement: "orbit", isBoss: true },
  ], mutator: "ricochet" },
];

export function spawnWave(state: VKState): void {
  state.wave++;
  state.waveTimer = VK.WAVE_DURATION;
  state.arenaRadius = Math.max(VK.ARENA_MIN_RADIUS, VK.ARENA_BASE_RADIUS - (state.wave - 1) * VK.ARENA_SHRINK_PER_WAVE);

  // Use curated template for first 10 waves, then random from pool
  const template = state.wave <= WAVE_TEMPLATES.length
    ? WAVE_TEMPLATES[state.wave - 1]
    : WAVE_TEMPLATES[Math.floor(Math.random() * WAVE_TEMPLATES.length)];

  // Wave mutators — from template or random
  state.waveMutators = [];
  if (template.mutator) {
    state.waveMutators.push(template.mutator);
  } else if (state.wave >= VK.MUTATOR_START_WAVE) {
    const allMutators = ["void_surge", "fragile", "abundance", "phantom", "ricochet", "gravity_well"];
    const pick = allMutators[Math.floor(Math.random() * allMutators.length)];
    state.waveMutators.push(pick);
  }

  const fragile = state.waveMutators.includes("fragile");
  let hasBoss = false;

  // Spawn from template
  for (let i = 0; i < template.spawners.length; i++) {
    const ts = template.spawners[i];
    const angle = (i / template.spawners.length) * Math.PI * 2 + (state.wave * 0.7);
    const isBoss = ts.isBoss || false;
    const burstMap: Record<string, number> = { ring: 8, cross: 4, wave: 5 };
    const burstCount = isBoss ? 12 : (burstMap[ts.pattern] || 3);
    const baseHp = isBoss ? VK.BOSS_HP + Math.floor(state.wave / 5) : VK.SPAWNER_HP + Math.floor(state.wave / 4);
    const hp = fragile && !isBoss ? Math.max(1, Math.floor(baseHp / 2)) : baseHp;

    state.spawners.push({
      angle, fireTimer: isBoss ? 0.5 : (fragile ? 0.5 + Math.random() * 0.3 : 1.0 + Math.random() * 0.5),
      pattern: ts.pattern, burstCount, burstIndex: 0, burstDelay: 0,
      alive: true, hp, maxHp: hp,
      flashTimer: 0, isBoss,
      telegraphTimer: 0, damagedThisDash: false,
      movement: ts.movement, phase: 0,
    });

    if (isBoss) hasBoss = true;
  }

  // Extra spawners for later waves (scale beyond templates)
  if (state.wave > 10) {
    const extra = Math.floor((state.wave - 10) / 3);
    const extraPatterns = [ProjectilePattern.STRAIGHT, ProjectilePattern.SPIRAL, ProjectilePattern.AIMED, ProjectilePattern.WAVE];
    const extraMovements: Array<"orbit" | "oscillate" | "stationary"> = ["orbit", "oscillate", "stationary"];
    for (let i = 0; i < extra; i++) {
      const angle = Math.random() * Math.PI * 2;
      const pat = extraPatterns[(i + state.wave) % extraPatterns.length];
      const hp = fragile ? Math.max(1, Math.floor((VK.SPAWNER_HP + Math.floor(state.wave / 4)) / 2)) : VK.SPAWNER_HP + Math.floor(state.wave / 4);
      state.spawners.push({
        angle, fireTimer: 0.8 + Math.random() * 0.5,
        pattern: pat, burstCount: 3, burstIndex: 0, burstDelay: 0,
        alive: true, hp, maxHp: hp,
        flashTimer: 0, isBoss: false,
        telegraphTimer: 0, damagedThisDash: false,
        movement: extraMovements[i % extraMovements.length], phase: 0,
      });
    }
  }

  if (hasBoss) {
    spawnFloatText(state, state.arenaCenterX, state.arenaCenterY - 60, "VOID SENTINEL!", VK.COLOR_BOSS_SPAWNER, 2.5);
    state.screenShake = VK.SHAKE_DURATION * 2;
    state.screenFlashColor = VK.COLOR_BOSS_SPAWNER; state.screenFlashTimer = VK.FLASH_DURATION * 2;
  }

  // Wave name from template
  spawnFloatText(state, state.arenaCenterX, state.arenaCenterY - 40, `WAVE ${state.wave}: ${template.name}`, 0xff8844, 2.0);
  if (state.waveMutators.length > 0) {
    const mutatorNames: Record<string, string> = { void_surge: "VOID SURGE", fragile: "FRAGILE", abundance: "ABUNDANCE", phantom: "PHANTOM", ricochet: "RICOCHET", gravity_well: "GRAVITY WELL" };
    spawnFloatText(state, state.arenaCenterX, state.arenaCenterY - 20, mutatorNames[state.waveMutators[0]] || state.waveMutators[0], 0xcc66ff, 1.3);
  }
  state.screenShake = Math.max(state.screenShake, VK.SHAKE_DURATION);

  // Extra shield perk: gain +1 shield at wave start
  if (state.selectedPerks.includes("extra_shield")) {
    state.shieldHits = Math.min(state.shieldHits + 1, 3);
  }

  // Wave intro freeze — spawners visible but don't fire yet
  state.waveIntroTimer = VK.WAVE_INTRO_DURATION;
}

function damageSpawner(state: VKState, s: VKSpawner): void {
  s.hp--;
  s.flashTimer = 0.15;
  const cx = state.arenaCenterX, cy = state.arenaCenterY, r = state.arenaRadius;
  const sx = cx + Math.cos(s.angle) * r;
  const sy = cy + Math.sin(s.angle) * r;
  spawnParticles(state, sx, sy, VK.PARTICLE_COUNT_SPAWNER, s.isBoss ? VK.COLOR_BOSS_SPAWNER : VK.COLOR_SPAWNER);

  if (s.hp <= 0) {
    s.alive = false;
    state.spawnersDestroyed++;
    const pts = VK.SCORE_SPAWNER_KILL * state.multiplier * (s.isBoss ? 3 : 1);
    state.score += pts;
    spawnFloatText(state, sx, sy, `${s.isBoss ? "SENTINEL " : ""}DESTROYED! +${Math.floor(pts)}`, s.isBoss ? VK.COLOR_BOSS_SPAWNER : VK.COLOR_SPAWNER, s.isBoss ? 2.0 : 1.5);
    spawnParticles(state, sx, sy, s.isBoss ? 25 : 12, s.isBoss ? VK.COLOR_BOSS_SPAWNER : VK.COLOR_SPAWNER);
    state.shockwaves.push({ x: sx, y: sy, radius: 0, maxRadius: s.isBoss ? VK.SHOCKWAVE_MAX_RADIUS * 1.5 : VK.SHOCKWAVE_MAX_RADIUS, life: VK.SHOCKWAVE_LIFE, color: s.isBoss ? VK.COLOR_BOSS_SPAWNER : VK.COLOR_SPAWNER });
    state.screenShake = VK.SHAKE_DURATION * (s.isBoss ? 2 : 1);
    state.hitstopTimer = Math.max(state.hitstopTimer, VK.HITSTOP_SPAWNER_KILL);
    addMultiplier(state, VK.MULT_GAIN_DASH_KILL * 3);

    // Boss drops loot
    if (s.isBoss) {
      for (let i = 0; i < 3; i++) {
        const oa = Math.random() * Math.PI * 2;
        const od = 30 + Math.random() * 40;
        const kinds: VKOrb["kind"][] = ["score", "shield", "slow"];
        state.orbs.push({ x: sx + Math.cos(oa) * od, y: sy + Math.sin(oa) * od, kind: kinds[i], age: 0, pulse: Math.random() * Math.PI * 2 });
      }
    }
  } else {
    spawnFloatText(state, sx, sy, `${s.hp}/${s.maxHp}`, s.isBoss ? VK.COLOR_BOSS_SPAWNER : VK.COLOR_SPAWNER, 0.8);
  }
}

export function updateSpawners(state: VKState, dt: number): void {
  const cx = state.arenaCenterX, cy = state.arenaCenterY, r = state.arenaRadius;

  for (const s of state.spawners) {
    if (!s.alive) continue;
    if (s.flashTimer > 0) s.flashTimer -= dt;
    if (s.telegraphTimer > 0) s.telegraphTimer -= dt;

    // Movement variety
    if (s.movement === "orbit") {
      s.angle += dt * (s.isBoss ? 0.08 : 0.15);
    } else if (s.movement === "oscillate") {
      s.angle += dt * 0.1 + Math.sin(state.time * 1.5 + s.angle * 3) * dt * 0.3;
    }
    // stationary: no angle change

    const sx = cx + Math.cos(s.angle) * r;
    const sy = cy + Math.sin(s.angle) * r;

    s.fireTimer -= dt;

    // Boss phase transitions
    if (s.isBoss && s.maxHp > 0) {
      const hpRatio = s.hp / s.maxHp;
      const oldPhase = s.phase;
      if (hpRatio <= VK.BOSS_PHASE_3_HP_RATIO) s.phase = 2;
      else if (hpRatio <= VK.BOSS_PHASE_2_HP_RATIO) s.phase = 1;
      else s.phase = 0;

      if (s.phase !== oldPhase) {
        // Phase transition — change pattern, announce
        const phasePatterns = [ProjectilePattern.CROSS, ProjectilePattern.SPIRAL, ProjectilePattern.AIMED];
        s.pattern = phasePatterns[s.phase] || ProjectilePattern.CROSS;
        s.burstCount = s.phase === 2 ? 16 : s.phase === 1 ? 10 : 12;
        s.burstIndex = 0;
        spawnFloatText(state, sx, sy, s.phase === 2 ? "RAGE MODE!" : "PHASE SHIFT!", VK.COLOR_BOSS_SPAWNER, 1.8);
        spawnParticles(state, sx, sy, 10, VK.COLOR_BOSS_SPAWNER);
        state.hitstopTimer = Math.max(state.hitstopTimer, 0.08);
        state.screenShake = VK.SHAKE_DURATION;
        // Boss orbits faster in later phases
        if (s.phase === 2) s.movement = "oscillate";
      }
    }

    // Telegraph before firing
    if (s.fireTimer <= VK.TELEGRAPH_DURATION && s.fireTimer > 0 && s.burstIndex === 0) {
      s.telegraphTimer = s.fireTimer;
    }

    if (s.fireTimer <= 0 && s.burstIndex < s.burstCount && state.waveIntroTimer <= 0) {
      s.burstDelay -= dt;
      if (s.burstDelay <= 0) {
        fireProjectile(state, sx, sy, s);
        s.burstIndex++;
        const bossSpeedMult = s.isBoss ? (s.phase === 2 ? 0.4 : s.phase === 1 ? 0.5 : 0.6) : 1.0;
        s.burstDelay = VK.SPAWNER_BURST_DELAY * bossSpeedMult;
        if (s.burstIndex >= s.burstCount) {
          s.burstIndex = 0;
          const speedUp = Math.max(0.4, VK.SPAWNER_FIRE_INTERVAL - state.wave * 0.05);
          s.fireTimer = (s.isBoss ? speedUp * bossSpeedMult : speedUp) + Math.random() * 0.3;
        }
      }
    }

    // Dash-through damage (fixed: once per dash per spawner)
    if (state.dashTimer > 0 && !s.damagedThisDash) {
      const pdx = state.playerX - sx, pdy = state.playerY - sy;
      const pdist = Math.sqrt(pdx * pdx + pdy * pdy);
      if (pdist < VK.SPAWNER_RADIUS + state.playerRadius + 5) {
        const dmg = state.selectedPerks.includes("heavy_dash") ? 2 : 1;
        for (let d = 0; d < dmg && s.alive; d++) damageSpawner(state, s);
        s.damagedThisDash = true;
        state.dashKills++;
      }
    }
    if (state.dashTimer <= 0) s.damagedThisDash = false;
  }

  state.spawners = state.spawners.filter(s => s.alive);
}

function fireProjectile(state: VKState, sx: number, sy: number, spawner: VKSpawner): void {
  const cx = state.arenaCenterX, cy = state.arenaCenterY;
  const slowMult = state.slowTimer > 0 ? VK.SLOW_FACTOR : 1.0;
  const baseSpeed = (VK.PROJ_BASE_SPEED + state.wave * 5) * slowMult;

  switch (spawner.pattern) {
    case ProjectilePattern.STRAIGHT: {
      const dx = cx - sx, dy = cy - sy;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      state.projectiles.push({ x: sx, y: sy, vx: (dx/len)*baseSpeed, vy: (dy/len)*baseSpeed,
        radius: VK.PROJ_RADIUS, color: VK.COLOR_PROJ_DEFAULT, life: VK.PROJ_LIFETIME, pattern: spawner.pattern, grazed: false });
      break;
    }
    case ProjectilePattern.AIMED: {
      const dx = state.playerX - sx, dy = state.playerY - sy;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      state.projectiles.push({ x: sx, y: sy, vx: (dx/len)*baseSpeed*1.2, vy: (dy/len)*baseSpeed*1.2,
        radius: VK.PROJ_RADIUS*0.8, color: VK.COLOR_PROJ_AIMED, life: VK.PROJ_LIFETIME, pattern: spawner.pattern, grazed: false });
      break;
    }
    case ProjectilePattern.SPIRAL: {
      const a = spawner.angle + spawner.burstIndex * 0.6;
      state.projectiles.push({ x: sx, y: sy, vx: Math.cos(a)*baseSpeed*0.8, vy: Math.sin(a)*baseSpeed*0.8,
        radius: VK.PROJ_RADIUS*0.7, color: VK.COLOR_PROJ_SPIRAL, life: VK.PROJ_LIFETIME, pattern: spawner.pattern, grazed: false });
      break;
    }
    case ProjectilePattern.RING: {
      const a = (spawner.burstIndex / spawner.burstCount) * Math.PI * 2 + state.time;
      state.projectiles.push({ x: cx, y: cy, vx: Math.cos(a)*baseSpeed*0.7, vy: Math.sin(a)*baseSpeed*0.7,
        radius: VK.PROJ_RADIUS*0.6, color: VK.COLOR_PROJ_RING, life: VK.PROJ_LIFETIME*0.7, pattern: spawner.pattern, grazed: false });
      break;
    }
    case ProjectilePattern.WAVE: {
      const a = spawner.angle + spawner.burstIndex * 0.3;
      const perpX = Math.cos(a + Math.PI/2) * 20 * Math.sin(spawner.burstIndex * 1.5);
      const perpY = Math.sin(a + Math.PI/2) * 20 * Math.sin(spawner.burstIndex * 1.5);
      const dx = cx - sx, dy = cy - sy;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      state.projectiles.push({ x: sx+perpX, y: sy+perpY, vx: (dx/len)*baseSpeed*0.6, vy: (dy/len)*baseSpeed*0.6,
        radius: VK.PROJ_RADIUS*0.9, color: VK.COLOR_PROJ_WAVE, life: VK.PROJ_LIFETIME, pattern: spawner.pattern, grazed: false });
      break;
    }
    case ProjectilePattern.CROSS: {
      // Fire in 4 directions (cross pattern), rotating each burst
      const baseA = spawner.burstIndex * 0.4 + state.time * 0.5;
      for (let d = 0; d < 4; d++) {
        const a = baseA + d * Math.PI / 2;
        state.projectiles.push({ x: sx, y: sy, vx: Math.cos(a)*baseSpeed*0.9, vy: Math.sin(a)*baseSpeed*0.9,
          radius: VK.PROJ_RADIUS*0.85, color: VK.COLOR_BOSS_SPAWNER, life: VK.PROJ_LIFETIME, pattern: spawner.pattern, grazed: false });
      }
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Projectile update + collision + dash combat
// ---------------------------------------------------------------------------

export function updateProjectiles(state: VKState, dt: number): boolean {
  const slowMult = state.slowTimer > 0 ? VK.SLOW_FACTOR : 1.0;
  let died = false;
  let grazing = false;

  for (const p of state.projectiles) {
    // Reflect: reverse projectile direction (once per projectile)
    if (state.reflectTimer > 0 && !p.grazed && p.vx !== 0 && p.vy !== 0) {
      const pdx = p.x - state.playerX, pdy = p.y - state.playerY;
      const pDist = Math.sqrt(pdx * pdx + pdy * pdy);
      if (pDist < state.playerRadius + 30 && pDist > state.playerRadius) {
        const nx = pdx / pDist, ny = pdy / pDist;
        const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        p.vx = nx * spd; p.vy = ny * spd;
        p.color = VK.COLOR_ORB_REFLECT;
        p.grazed = true; // repurpose flag to prevent double-reflect
      }
    }

    // Mutator: void_surge = 30% faster
    const speedMult = state.waveMutators.includes("void_surge") ? 1.3 : 1.0;
    p.x += p.vx * dt * slowMult * speedMult;
    p.y += p.vy * dt * slowMult * speedMult;
    p.life -= dt;

    // Mutator: gravity_well (projectiles curve toward center)
    if (state.waveMutators.includes("gravity_well")) {
      const gx = state.arenaCenterX - p.x, gy = state.arenaCenterY - p.y;
      const gDist = Math.sqrt(gx * gx + gy * gy) || 1;
      const gForce = 30 * dt;
      p.vx += (gx / gDist) * gForce;
      p.vy += (gy / gDist) * gForce;
    }

    const dx = p.x - state.arenaCenterX, dy = p.y - state.arenaCenterY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Mutator: ricochet (bounce off arena walls once)
    if (state.waveMutators.includes("ricochet") && dist > state.arenaRadius - 5 && p.life > 1) {
      // Reflect velocity off arena wall (normal is toward center)
      const nx = -dx / dist, ny = -dy / dist;
      const dot = p.vx * nx + p.vy * ny;
      p.vx -= 2 * dot * nx; p.vy -= 2 * dot * ny;
      p.x = state.arenaCenterX + (dx / dist) * (state.arenaRadius - 6);
      p.y = state.arenaCenterY + (dy / dist) * (state.arenaRadius - 6);
      p.life = Math.min(p.life, 3); // only one bounce (reduced life)
    }

    if (dist > state.arenaRadius + 30) { p.life = 0; continue; }

    // Dash combat: destroy projectiles near player during dash
    if (state.dashTimer > 0) {
      const pdx = p.x - state.playerX, pdy = p.y - state.playerY;
      const pDist = Math.sqrt(pdx * pdx + pdy * pdy);
      if (pDist < VK.DASH_DESTROY_RADIUS) {
        p.life = 0;
        state.dashKills++;
        state.dashKillsTotal++;
        state.score += VK.SCORE_DASH_KILL * state.multiplier;
        addMultiplier(state, VK.MULT_GAIN_DASH_KILL);
        spawnParticle(state, p.x, p.y, (Math.random()-0.5)*60, (Math.random()-0.5)*60, VK.COLOR_PLAYER_DASH, 3);
      }
      if (pDist < VK.NEAR_MISS_DISTANCE) state.totalDodged++;
      continue;
    }

    // Player collision
    const pdx = p.x - state.playerX, pdy = p.y - state.playerY;
    const pDist = Math.sqrt(pdx * pdx + pdy * pdy);

    if (pDist < state.playerRadius + p.radius) {
      p.life = 0;
      if (state.shieldHits > 0) {
        state.shieldHits--;
        spawnParticles(state, p.x, p.y, 6, VK.COLOR_SHIELD);
        spawnFloatText(state, p.x, p.y - 10, "SHIELD!", VK.COLOR_SHIELD, 1.2);
        state.screenShake = VK.SHAKE_DURATION * 0.5;
      } else {
        // Last Stand: if graze meter is high enough and not yet used, survive
        if (!state.lastStandUsed && state.grazeMeter >= VK.LAST_STAND_GRAZE_COST) {
          state.lastStandUsed = true;
          state.lastStandActive = true;
          state.grazeMeter = 0;
          state.grazeBurstReady = false;
          state.multiplier = 1.0;
          state.multiplierDecay = 0;
          // Emergency burst — clear nearby projectiles
          for (const q of state.projectiles) {
            const qdx = q.x - state.playerX, qdy = q.y - state.playerY;
            if (Math.sqrt(qdx * qdx + qdy * qdy) < VK.GRAZE_BURST_RADIUS) {
              q.life = 0;
              spawnParticle(state, q.x, q.y, (Math.random()-0.5)*60, (Math.random()-0.5)*60, VK.COLOR_DANGER, 3);
            }
          }
          spawnParticles(state, state.playerX, state.playerY, 25, VK.COLOR_DANGER);
          spawnParticles(state, state.playerX, state.playerY, 15, VK.COLOR_GRAZE);
          spawnFloatText(state, state.playerX, state.playerY - 25, "LAST STAND!", VK.COLOR_DANGER, 2.5);
          state.hitstopTimer = VK.LAST_STAND_HITSTOP;
          state.screenShake = VK.SHAKE_DURATION * 3;
          state.screenFlashColor = VK.COLOR_DANGER; state.screenFlashTimer = VK.FLASH_DURATION * 3;
          state.shieldHits = 0; // no freebies after
        } else {
          died = true;
          triggerDeathReplay(state, p.x, p.y, p.color);
        }
      }
    } else if (pDist < VK.NEAR_MISS_DISTANCE) {
      // Near miss
      if (!p.grazed) {
        state.nearMisses++;
        state.totalDodged++;
        state.nearMissStreak++;
        state.nearMissStreakTimer = VK.STREAK_TIMEOUT;
        const nearBonus = state.selectedPerks.includes("near_bonus") ? 2 : 1;
        const pts = Math.floor(VK.SCORE_NEAR_MISS * state.multiplier * nearBonus);
        state.score += pts;
        state.nearMissFlash = VK.NEAR_MISS_FLASH_DUR;
        addMultiplier(state, VK.MULT_GAIN_NEAR_MISS + (state.selectedPerks.includes("wider_graze") ? 0.05 : 0));
        spawnParticle(state, state.playerX + (Math.random()-0.5)*8, state.playerY + (Math.random()-0.5)*8,
          (Math.random()-0.5)*30, (Math.random()-0.5)*30, VK.COLOR_NEAR_MISS, 2);
        p.grazed = true;

        // Escalating combo announcer
        const streak = state.nearMissStreak;
        if (streak === 3) spawnFloatText(state, state.playerX, state.playerY - 15, "CLOSE!", VK.COLOR_NEAR_MISS, 1.0);
        else if (streak === 7) { spawnFloatText(state, state.playerX, state.playerY - 15, "FEARLESS!", VK.COLOR_NEAR_MISS, 1.3); state.hitstopTimer = Math.max(state.hitstopTimer, VK.HITSTOP_NEAR_MISS_STREAK); }
        else if (streak === 12) { spawnFloatText(state, state.playerX, state.playerY - 20, "UNTOUCHABLE!", 0xffaa00, 1.6); state.hitstopTimer = Math.max(state.hitstopTimer, VK.HITSTOP_NEAR_MISS_STREAK * 2); }
        else if (streak === 20) { spawnFloatText(state, state.playerX, state.playerY - 20, "VOID WALKER!", 0xff44ff, 2.0); state.hitstopTimer = Math.max(state.hitstopTimer, VK.HITSTOP_NEAR_MISS_STREAK * 3); state.score += 50 * state.multiplier; }
        else if (streak % 10 === 0 && streak > 20) { spawnFloatText(state, state.playerX, state.playerY - 20, `${streak}x NEAR!`, 0xff44ff, 1.5); }
      }
    } else if (pDist < VK.GRAZE_DISTANCE * (state.selectedPerks.includes("wider_graze") ? 1.3 : 1.0)) {
      // Graze (wider zone, fills meter)
      grazing = true;
      if (!p.grazed) {
        const grazeFillMult = state.selectedPerks.includes("graze_regen") ? 1.5 : 1.0;
        state.grazeMeter = Math.min(VK.GRAZE_MAX, state.grazeMeter + VK.GRAZE_FILL_RATE * dt * grazeFillMult);
        addMultiplier(state, VK.MULT_GAIN_GRAZE * dt);
      }
    }
  }

  // Graze meter management
  if (!grazing && state.grazeMeter > 0) {
    state.grazeMeter = Math.max(0, state.grazeMeter - VK.GRAZE_DRAIN_RATE * dt);
  }
  state.grazeBurstReady = state.grazeMeter >= VK.GRAZE_MAX;

  // Dash end bonus
  if (state.dashTimer <= 0 && state.dashKills > 0) {
    if (state.dashKills >= 3) {
      spawnFloatText(state, state.playerX, state.playerY - 20, `DASH x${state.dashKills}!`, VK.COLOR_PLAYER, 1.5);
      state.hitstopTimer = Math.max(state.hitstopTimer, VK.HITSTOP_DASH_MULTI);
    }
    state.dashKills = 0;
  }

  state.projectiles = state.projectiles.filter(p => p.life > 0);
  return died;
}

// ---------------------------------------------------------------------------
// Multiplier
// ---------------------------------------------------------------------------

function addMultiplier(state: VKState, amount: number): void {
  state.multiplier = Math.min(VK.MULT_MAX, state.multiplier + amount);
  state.multiplierDecay = VK.MULT_DECAY_DELAY;
  if (state.multiplier > state.peakMultiplier) state.peakMultiplier = state.multiplier;
}

export function updateMultiplier(state: VKState, dt: number): void {
  if (state.multiplierDecay > 0) {
    state.multiplierDecay -= dt;
  } else if (state.multiplier > 1.0) {
    const decayMult = state.selectedPerks.includes("mult_anchor") ? 0.5 : 1.0;
    state.multiplier = Math.max(1.0, state.multiplier - VK.MULT_DECAY_RATE * dt * decayMult);
  }
}

// ---------------------------------------------------------------------------
// Orbs
// ---------------------------------------------------------------------------

export function updateOrbs(state: VKState, dt: number): void {
  const abundanceMult = state.waveMutators.includes("abundance") ? 3.0 : 1.0;
  state.orbTimer -= dt * abundanceMult;
  if (state.orbTimer <= 0 && state.orbs.length < VK.ORB_MAX_COUNT) {
    state.orbTimer = VK.ORB_SPAWN_INTERVAL;
    const w = VK.ORB_WEIGHTS;
    let total = 0; for (const k in w) total += w[k];
    let r = Math.random() * total;
    let kind: VKOrb["kind"] = "score";
    for (const k in w) { r -= w[k]; if (r <= 0) { kind = k as VKOrb["kind"]; break; } }

    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * (state.arenaRadius * 0.7);
    state.orbs.push({ x: state.arenaCenterX + Math.cos(angle) * dist, y: state.arenaCenterY + Math.sin(angle) * dist,
      kind, age: 0, pulse: Math.random() * Math.PI * 2 });
  }

  // Passive orb magnet from perk
  if (state.selectedPerks.includes("orb_magnet")) {
    for (const o of state.orbs) {
      const dx = state.playerX - o.x, dy = state.playerY - o.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 50 && dist > 0) {
        const pull = (1.0 - dist / 50) * 80 * dt;
        o.x += (dx / dist) * pull; o.y += (dy / dist) * pull;
      }
    }
  }

  if (state.magnetTimer > 0) {
    for (const o of state.orbs) {
      const dx = state.playerX - o.x, dy = state.playerY - o.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < VK.MAGNET_RADIUS && dist > 0) {
        const pull = (1.0 - dist / VK.MAGNET_RADIUS) * 150 * dt;
        o.x += (dx / dist) * pull; o.y += (dy / dist) * pull;
      }
    }
  }

  for (const o of state.orbs) {
    o.age += dt;
    const dx = state.playerX - o.x, dy = state.playerY - o.y;
    if (Math.sqrt(dx * dx + dy * dy) < state.playerRadius + VK.ORB_RADIUS) {
      collectOrb(state, o);
      o.age = VK.ORB_LIFETIME + 1;
    }
  }
  state.orbs = state.orbs.filter(o => o.age < VK.ORB_LIFETIME);
}

function collectOrb(state: VKState, orb: VKOrb): void {
  state.orbsCollected++;
  const color = orbColor(orb.kind);
  spawnParticles(state, orb.x, orb.y, VK.PARTICLE_COUNT_ORB, color);

  switch (orb.kind) {
    case "score": {
      const pts = Math.floor(VK.SCORE_ORB * state.multiplier);
      state.score += pts;
      spawnFloatText(state, orb.x, orb.y - 10, `+${pts}`, VK.COLOR_ORB_SCORE, 1.0);
      break;
    }
    case "shield":
      state.shieldHits = Math.min(state.shieldHits + 1, 3);
      spawnFloatText(state, orb.x, orb.y - 10, "SHIELD!", VK.COLOR_ORB_SHIELD, 1.3);
      state.screenFlashColor = VK.COLOR_SHIELD; state.screenFlashTimer = VK.FLASH_DURATION;
      break;
    case "slow":
      state.slowTimer = VK.SLOW_DURATION;
      spawnFloatText(state, orb.x, orb.y - 10, "TIME SLOW!", VK.COLOR_ORB_SLOW, 1.3);
      state.screenFlashColor = VK.COLOR_SLOW_TINT; state.screenFlashTimer = VK.FLASH_DURATION;
      break;
    case "magnet":
      state.magnetTimer = VK.MAGNET_DURATION;
      spawnFloatText(state, orb.x, orb.y - 10, "MAGNET!", VK.COLOR_ORB_MAGNET, 1.3);
      state.screenFlashColor = VK.COLOR_ORB_MAGNET; state.screenFlashTimer = VK.FLASH_DURATION;
      break;
    case "reflect":
      state.reflectTimer = VK.REFLECT_DURATION;
      spawnFloatText(state, orb.x, orb.y - 10, "REFLECT!", VK.COLOR_ORB_REFLECT, 1.5);
      state.screenFlashColor = VK.COLOR_ORB_REFLECT; state.screenFlashTimer = VK.FLASH_DURATION;
      break;
    case "bomb": {
      // Area clear
      let cleared = 0;
      for (const p of state.projectiles) {
        const dx = p.x - orb.x, dy = p.y - orb.y;
        if (Math.sqrt(dx * dx + dy * dy) < VK.BOMB_RADIUS) {
          p.life = 0; cleared++;
          spawnParticle(state, p.x, p.y, (Math.random()-0.5)*50, (Math.random()-0.5)*50, VK.COLOR_ORB_BOMB, 2);
        }
      }
      spawnFloatText(state, orb.x, orb.y - 10, `BOMB! ${cleared} cleared`, VK.COLOR_ORB_BOMB, 1.5);
      state.screenShake = VK.SHAKE_DURATION * 1.5;
      state.screenFlashColor = VK.COLOR_ORB_BOMB; state.screenFlashTimer = VK.FLASH_DURATION * 2;
      break;
    }
  }
}

function orbColor(kind: VKOrb["kind"]): number {
  switch (kind) {
    case "score": return VK.COLOR_ORB_SCORE;
    case "shield": return VK.COLOR_ORB_SHIELD;
    case "slow": return VK.COLOR_ORB_SLOW;
    case "magnet": return VK.COLOR_ORB_MAGNET;
    case "reflect": return VK.COLOR_ORB_REFLECT;
    case "bomb": return VK.COLOR_ORB_BOMB;
  }
}

// ---------------------------------------------------------------------------
// Wave management
// ---------------------------------------------------------------------------

export function updateWave(state: VKState, dt: number): void {
  state.waveTimer -= dt;
  if (state.spawners.length === 0 && state.wave > 0 && state.waveTimer < VK.WAVE_DURATION - 2) {
    // Breathing room: only trigger wave clear if at least 2s have passed
    state.score += VK.SCORE_WAVE_CLEAR * state.multiplier;
    state.wavesCleared++;
    spawnFloatText(state, state.arenaCenterX, state.arenaCenterY, `WAVE CLEAR! +${Math.floor(VK.SCORE_WAVE_CLEAR * state.multiplier)}`, 0x44ff44, 2.0);
    state.screenFlashColor = 0x44ff44; state.screenFlashTimer = VK.FLASH_DURATION * 2;
    for (const p of state.projectiles) spawnParticle(state, p.x, p.y, (Math.random()-0.5)*60, (Math.random()-0.5)*60, p.color, 2);
    state.projectiles = [];
    // Brief delay before next wave (set waveTimer to 1.5s so player has breathing room)
    state.waveTimer = 1.5;
    return;
  }
  if (state.waveTimer <= 0) {
    state.projectiles = [];
    spawnWave(state);
  }
}

// ---------------------------------------------------------------------------
// Timers
// ---------------------------------------------------------------------------

export function updateTimers(state: VKState, dt: number): void {
  state.time += dt;
  state.score += VK.SCORE_PER_SECOND * dt * state.multiplier;
  if (state.dashCooldown > 0) state.dashCooldown -= dt;
  if (state.dashTimer > 0) state.dashTimer -= dt;
  if (state.slowTimer > 0) state.slowTimer -= dt;
  if (state.magnetTimer > 0) state.magnetTimer -= dt;
  if (state.reflectTimer > 0) state.reflectTimer -= dt;
  if (state.screenShake > 0) state.screenShake -= dt;
  if (state.screenFlashTimer > 0) state.screenFlashTimer -= dt;
  if (state.nearMissFlash > 0) state.nearMissFlash -= dt;
  if (state.hitstopTimer > 0) state.hitstopTimer -= dt;
  if (state.waveIntroTimer > 0) state.waveIntroTimer -= dt;
  if (state.deathSlowTimer > 0) state.deathSlowTimer -= dt;
}

// ---------------------------------------------------------------------------
// Particles + float text
// ---------------------------------------------------------------------------

export function spawnParticle(state: VKState, x: number, y: number, vx: number, vy: number, color: number, size: number): void {
  state.particles.push({ x, y, vx, vy, life: VK.PARTICLE_LIFETIME, maxLife: VK.PARTICLE_LIFETIME, color, size });
}

export function spawnParticles(state: VKState, x: number, y: number, count: number, color: number): void {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2, spd = 40 + Math.random() * 80;
    spawnParticle(state, x, y, Math.cos(a) * spd, Math.sin(a) * spd, color, 2 + Math.random() * 4);
  }
}

export function updateParticles(state: VKState, dt: number): void {
  for (const p of state.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.95; p.vy *= 0.95; p.life -= dt; }
  state.particles = state.particles.filter(p => p.life > 0);
}

export function spawnFloatText(state: VKState, x: number, y: number, text: string, color: number, scale: number): void {
  state.floatTexts.push({ x, y, text, color, life: 1.2, maxLife: 1.2, scale });
}

export function updateFloatTexts(state: VKState, dt: number): void {
  for (const ft of state.floatTexts) { ft.y -= dt * 40; ft.life -= dt; }
  state.floatTexts = state.floatTexts.filter(ft => ft.life > 0);
}

export function spawnDeathEffect(state: VKState): void {
  spawnParticles(state, state.playerX, state.playerY, VK.PARTICLE_COUNT_DEATH, VK.COLOR_PLAYER);
  spawnParticles(state, state.playerX, state.playerY, 15, VK.COLOR_DANGER);
  state.shockwaves.push({ x: state.playerX, y: state.playerY, radius: 0, maxRadius: 150, life: 0.6, color: VK.COLOR_DANGER });
  state.screenShake = VK.SHAKE_DURATION * 3;
  state.screenFlashColor = VK.COLOR_DANGER;
  state.screenFlashTimer = VK.FLASH_DURATION * 3;
  state.hitstopTimer = VK.HITSTOP_DEATH;
}

// ---------------------------------------------------------------------------
// Shockwaves
// ---------------------------------------------------------------------------

export function updateShockwaves(state: VKState, dt: number): void {
  for (const sw of state.shockwaves) {
    sw.radius += VK.SHOCKWAVE_SPEED * dt;
    sw.life -= dt;
  }
  state.shockwaves = state.shockwaves.filter(sw => sw.life > 0);
}

// ---------------------------------------------------------------------------
// Near-miss streak timer
// ---------------------------------------------------------------------------

export function updateStreak(state: VKState, dt: number): void {
  if (state.nearMissStreakTimer > 0) {
    state.nearMissStreakTimer -= dt;
    if (state.nearMissStreakTimer <= 0) state.nearMissStreak = 0;
  }
}

// ---------------------------------------------------------------------------
// Perk system — offered between waves
// ---------------------------------------------------------------------------

const ALL_PERKS: VKPerk[] = [
  { id: "longer_dash", name: "Longer Dash", desc: "Dash duration +40%", color: 0xeebb33 },
  { id: "dash_recharge", name: "Dash Recharge", desc: "Dash cooldown -25%", color: 0xeebb33 },
  { id: "wider_graze", name: "Wider Graze", desc: "Graze zone +30%, bonus mult gain", color: VK.COLOR_GRAZE },
  { id: "orb_magnet", name: "Orb Magnetism", desc: "Passive small magnet radius", color: VK.COLOR_ORB_MAGNET },
  { id: "mult_anchor", name: "Multiplier Anchor", desc: "Mult decay rate halved", color: VK.COLOR_MULTIPLIER },
  { id: "extra_shield", name: "Extra Shield", desc: "Start each wave with +1 shield", color: VK.COLOR_SHIELD },
  { id: "heavy_dash", name: "Heavy Dash", desc: "Dash deals 2x spawner damage", color: 0xff4466 },
  { id: "swift_feet", name: "Swift Feet", desc: "Move speed +15%", color: 0x88ff88 },
  { id: "graze_regen", name: "Graze Regen", desc: "Graze meter fills 50% faster", color: VK.COLOR_GRAZE },
  { id: "near_bonus", name: "Near-Miss Bonus", desc: "Near-miss score doubled", color: VK.COLOR_NEAR_MISS },
];

export function generatePerkChoices(state: VKState): VKPerk[] {
  const available = ALL_PERKS.filter(p => !state.selectedPerks.includes(p.id));
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }
  return available.slice(0, Math.min(3, available.length));
}

export function preparePerkChoice(state: VKState): void {
  state.perkChoices = generatePerkChoices(state);
  if (state.perkChoices.length > 0) {
    state.phase = VKPhase.UPGRADE;
  }
}

export function selectPerk(state: VKState, index: number): void {
  if (index < 0 || index >= state.perkChoices.length) return;
  const perk = state.perkChoices[index];
  state.selectedPerks.push(perk.id);

  // Apply immediate effects
  switch (perk.id) {
    case "longer_dash": // Applied dynamically in tryDash
      break;
    case "dash_recharge": // Applied dynamically in tryDash
      break;
    case "swift_feet":
      state.playerSpeed *= 1.15;
      break;
    case "extra_shield":
      state.shieldHits = Math.min(state.shieldHits + 1, 3);
      break;
  }

  spawnFloatText(state, state.playerX, state.playerY - 20, perk.name + "!", perk.color, 1.8);
  state.screenFlashColor = perk.color; state.screenFlashTimer = VK.FLASH_DURATION * 2;
  state.perkChoices = [];
  state.phase = VKPhase.PLAYING;
}

// ---------------------------------------------------------------------------
// Meta-progression — unlock checking
// ---------------------------------------------------------------------------

interface VKUnlockDef { id: string; name: string; check: (meta: VKMeta) => boolean; }

import type { VKMeta } from "../types";

const UNLOCK_DEFS: VKUnlockDef[] = [
  { id: "veteran", name: "Veteran", check: m => m.gamesPlayed >= 10 },
  { id: "graze_master", name: "Graze Master", check: m => m.totalNearMisses >= 200 },
  { id: "destroyer", name: "Destroyer", check: m => m.totalSpawnersDestroyed >= 50 },
  { id: "collector", name: "Collector", check: m => m.totalOrbsCollected >= 100 },
  { id: "wave_10", name: "Wave 10 Reached", check: m => m.bestWave >= 10 },
  { id: "mult_6", name: "6x Multiplier", check: m => m.bestMultiplier >= 6 },
  { id: "score_2000", name: "Score 2000+", check: m => m.highScore >= 2000 },
];

export function checkUnlocks(meta: VKMeta): string[] {
  const newUnlocks: string[] = [];
  for (const def of UNLOCK_DEFS) {
    if (!meta.unlocks.includes(def.id) && def.check(meta)) {
      meta.unlocks.push(def.id);
      newUnlocks.push(def.name);
    }
  }
  return newUnlocks;
}

export function getUnlockCount(meta: VKMeta): number {
  return meta.unlocks.length;
}

export function getTotalUnlocks(): number {
  return UNLOCK_DEFS.length;
}

// ---------------------------------------------------------------------------
// Tutorial (Wave 0 for first-time players)
// ---------------------------------------------------------------------------

export function startTutorial(state: VKState): void {
  state.tutorialStep = 1;
  state.tutorialTimer = VK.TUTORIAL_STEP_DURATION;
  state.tutorialSpawned = false;
}

export function updateTutorial(state: VKState, dt: number): void {
  if (state.tutorialStep <= 0 || state.tutorialStep > 3) return;

  state.tutorialTimer -= dt;

  switch (state.tutorialStep) {
    case 1: // Move phase — spawn a single slow projectile
      if (!state.tutorialSpawned) {
        state.tutorialSpawned = true;
        const cx = state.arenaCenterX, r = state.arenaRadius;
        state.projectiles.push({
          x: cx + r - 20, y: state.arenaCenterY,
          vx: -50, vy: 0,
          radius: VK.PROJ_RADIUS * 1.5, color: VK.COLOR_PROJ_DEFAULT,
          life: 8, pattern: ProjectilePattern.STRAIGHT, grazed: false,
        });
      }
      if (state.tutorialTimer <= 0) {
        state.tutorialStep = 2;
        state.tutorialTimer = VK.TUTORIAL_STEP_DURATION;
        state.tutorialSpawned = false;
        state.projectiles = [];
      }
      break;

    case 2: // Dash phase — spawn a cluster of projectiles
      if (!state.tutorialSpawned) {
        state.tutorialSpawned = true;
        const cx = state.arenaCenterX, cy = state.arenaCenterY;
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const dist = 80;
          state.projectiles.push({
            x: cx + Math.cos(a) * dist, y: cy + Math.sin(a) * dist,
            vx: -Math.cos(a) * 30, vy: -Math.sin(a) * 30,
            radius: VK.PROJ_RADIUS, color: VK.COLOR_PROJ_SPIRAL,
            life: 10, pattern: ProjectilePattern.SPIRAL, grazed: false,
          });
        }
      }
      // Advance if player destroys most projectiles via dash or time expires
      if (state.projectiles.length <= 1 || state.tutorialTimer <= 0) {
        state.tutorialStep = 3;
        state.tutorialTimer = VK.TUTORIAL_STEP_DURATION + 2;
        state.tutorialSpawned = false;
        state.projectiles = [];
      }
      break;

    case 3: // Spawner phase — spawn one stationary spawner
      if (!state.tutorialSpawned) {
        state.tutorialSpawned = true;
        state.spawners.push({
          angle: 0, fireTimer: 2.0,
          pattern: ProjectilePattern.STRAIGHT, burstCount: 2, burstIndex: 0, burstDelay: 0,
          alive: true, hp: 1, maxHp: 1,
          flashTimer: 0, isBoss: false,
          telegraphTimer: 0, damagedThisDash: false,
          movement: "stationary", phase: 0,
        });
        state.waveIntroTimer = 0; // let it fire
      }
      // Advance when spawner is dead or time expires
      if (state.spawners.length === 0 || state.tutorialTimer <= 0) {
        state.tutorialStep = 4; // done
        state.projectiles = [];
        state.spawners = [];
        spawnFloatText(state, state.arenaCenterX, state.arenaCenterY, "Good. Now survive the void.", 0xffffff, 1.8);
        // Start real wave 1 after a brief pause
        state.waveTimer = 1.5;
        state.wave = 0; // spawnWave will increment to 1
      }
      break;
  }
}

export const TUTORIAL_PROMPTS = [
  "", // step 0
  "Move with WASD to dodge",
  "Press SPACE to dash through them!",
  "Dash INTO the spawner to destroy it!",
  "Good. Now survive the void.",
];

// ---------------------------------------------------------------------------
// Death replay — track killer info
// ---------------------------------------------------------------------------

export function triggerDeathReplay(state: VKState, killerX: number, killerY: number, killerColor: number): void {
  state.deathSlowTimer = VK.DEATH_SLOW_DURATION;
  state.deathX = state.playerX;
  state.deathY = state.playerY;
  state.killerX = killerX;
  state.killerY = killerY;
  state.killerColor = killerColor;
}
