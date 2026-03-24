// ---------------------------------------------------------------------------
// Graviton — Core game systems (v2)
// Aimed fling, pull energy, enemy AI, bomb fuse, orbital capture
// ---------------------------------------------------------------------------

import type { GState, GBody, GEnemy } from "../types";
import { G } from "../config/GravitonBalance";

// ---------------------------------------------------------------------------
// Player movement + aim tracking + pull energy
// ---------------------------------------------------------------------------

export function updatePlayer(state: GState, dt: number, keys: Set<string>): void {
  let mx = 0, my = 0;
  if (keys.has("ArrowUp") || keys.has("KeyW")) my -= 1;
  if (keys.has("ArrowDown") || keys.has("KeyS")) my += 1;
  if (keys.has("ArrowLeft") || keys.has("KeyA")) mx -= 1;
  if (keys.has("ArrowRight") || keys.has("KeyD")) mx += 1;
  const len = Math.sqrt(mx * mx + my * my);
  if (len > 0) { mx /= len; my /= len; state.aimAngle = Math.atan2(my, mx); }

  // Pull slows movement
  const speedMult = state.pulling ? G.PULL_SPEED_PENALTY : 1.0;
  state.playerX += mx * G.PLAYER_SPEED * speedMult * dt;
  state.playerY += my * G.PLAYER_SPEED * speedMult * dt;

  // Constrain to arena
  const dx = state.playerX - state.arenaCX, dy = state.playerY - state.arenaCY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const maxDist = state.arenaRadius - state.playerRadius - 5;
  if (dist > maxDist) {
    state.playerX = state.arenaCX + (dx / dist) * maxDist;
    state.playerY = state.arenaCY + (dy / dist) * maxDist;
  }

  // Pull energy management
  if (state.pulling) {
    state.pullEnergy = Math.max(0, state.pullEnergy - G.PULL_ENERGY_DRAIN * state.pullDrainMult * dt);
    if (state.pullEnergy <= 0) state.pulling = false; // forced release
  } else {
    state.pullEnergy = Math.min(1, state.pullEnergy + G.PULL_ENERGY_REGEN * dt);
  }
}

// ---------------------------------------------------------------------------
// Body spawning + gravity + orbiting + bomb fuse
// ---------------------------------------------------------------------------

export function updateBodies(state: GState, dt: number): void {
  state.bodySpawnTimer -= dt;
  if (state.bodySpawnTimer <= 0 && state.bodies.length < G.BODY_MAX) {
    state.bodySpawnTimer = G.ASTEROID_SPAWN_INTERVAL;
    spawnBody(state);
  }

  const px = state.playerX, py = state.playerY;
  state.orbitCount = 0;

  for (const b of state.bodies) {
    b.life -= dt;

    if (b.orbiting) {
      state.orbitCount++;
      b.orbitAngle += G.ORBIT_SPEED * dt;
      b.x = px + Math.cos(b.orbitAngle) * b.orbitDist;
      b.y = py + Math.sin(b.orbitAngle) * b.orbitDist;

      // Bomb fuse countdown while orbiting
      if (b.kind === "bomb") {
        b.fuseTimer -= dt;
        if (b.fuseTimer <= 0) {
          // BOOM — damages player AND nearby enemies (sacrifice detonation)
          b.life = 0; b.orbiting = false;
          state.hp--;
          // AoE damage to nearby enemies
          let sacrificeKills = 0;
          for (const e2 of state.enemies) {
            if (!e2.alive) continue;
            const d2x = b.x - e2.x, d2y = b.y - e2.y;
            if (Math.sqrt(d2x * d2x + d2y * d2y) < G.BOMB_DAMAGE_RADIUS * (state.activeMutation === "volatile" ? 3 : 1)) {
              const wasAlive = e2.hp > 0;
              damageEnemy(state, e2, G.BOMB_AOE_DAMAGE);
              if (wasAlive && !e2.alive) sacrificeKills++; // count actual kills only
            }
          }
          spawnParticles(state, b.x, b.y, 20, G.COLOR_BOMB);
          spawnParticles(state, b.x, b.y, 10, 0xffaa44);
          if (sacrificeKills > 0) {
            spawnFloatText(state, b.x, b.y - 15, `SACRIFICE! x${sacrificeKills}`, 0xffaa44, 1.8);
          } else {
            spawnFloatText(state, px, py - 15, "BOMB!", G.COLOR_BOMB, 1.5);
          }
          state.screenShake = G.SHAKE_DURATION * 2;
          state.screenFlashColor = G.COLOR_BOMB;
          state.screenFlashTimer = G.FLASH_DURATION * 2;
        }
      }
      continue;
    }

    if (b.flung) {
      b.x += b.vx * dt; b.y += b.vy * dt;
      // Enemy collision
      for (const e of state.enemies) {
        if (!e.alive) continue;
        const edx = b.x - e.x, edy = b.y - e.y;
        if (Math.sqrt(edx * edx + edy * edy) < b.radius + e.radius) {
          if (b.kind === "bomb") {
            // Bomb AoE explosion
            for (const e2 of state.enemies) {
              if (!e2.alive) continue;
              const d2x = b.x - e2.x, d2y = b.y - e2.y;
              if (Math.sqrt(d2x * d2x + d2y * d2y) < G.BOMB_DAMAGE_RADIUS * (state.activeMutation === "volatile" ? 3 : 1)) {
                damageEnemy(state, e2, G.BOMB_AOE_DAMAGE);
              }
            }
            spawnParticles(state, b.x, b.y, 20, G.COLOR_BOMB);
            spawnParticles(state, b.x, b.y, 10, 0xffaa44);
            state.screenShake = G.SHAKE_DURATION * 1.5;
          } else {
            const baseDmg = b.kind === "gold_asteroid" ? G.GOLD_FLING_DAMAGE : G.FLING_DAMAGE;
            const dmg = Math.floor(baseDmg * state.flingDamageMult);
            const willKill = e.hp <= dmg && !e.armor;
            damageEnemy(state, e, dmg);
            spawnParticles(state, b.x, b.y, 6, G.COLOR_FLUNG);
            // Gold asteroid heal: +1 HP on kill
            if (b.kind === "gold_asteroid" && willKill && state.hp < state.maxHp) {
              state.hp = Math.min(state.maxHp, state.hp + 1);
              spawnFloatText(state, state.playerX, state.playerY - 20, "+1 HP", 0x44ff44, 1.5);
              spawnParticles(state, state.playerX, state.playerY, 6, 0x44ff44);
            }
          }
          b.life = 0;
          break;
        }
      }
      // Despawn outside arena
      const adx = b.x - state.arenaCX, ady = b.y - state.arenaCY;
      if (Math.sqrt(adx * adx + ady * ady) > state.arenaRadius + 30) b.life = 0;
      continue;
    }

    // Free floating
    b.x += b.vx * dt; b.y += b.vy * dt;

    // Gravity pull (only when pulling and has energy)
    if (state.pulling && state.pullEnergy > 0) {
      const gdx = px - b.x, gdy = py - b.y;
      const gDist = Math.sqrt(gdx * gdx + gdy * gdy);
      if (gDist < state.pullRadius && gDist > 0) {
        const pullForce = G.PULL_STRENGTH * (1 - gDist / state.pullRadius) * dt;
        b.vx += (gdx / gDist) * pullForce;
        b.vy += (gdy / gDist) * pullForce;
      }

      // Capture into orbit
      if (gDist < G.ORBIT_DIST_MAX + 5 && state.orbitCount < state.orbitCapacity) {
        b.orbiting = true;
        b.orbitAngle = Math.atan2(b.y - py, b.x - px);
        b.orbitDist = G.ORBIT_DIST_MIN + Math.random() * (G.ORBIT_DIST_MAX - G.ORBIT_DIST_MIN);
        b.vx = 0; b.vy = 0;
        if (b.kind === "bomb") {
          b.fuseTimer = G.BOMB_FUSE_DURATION; // start ticking!
          spawnFloatText(state, b.x, b.y - 10, "BOMB ARMED!", G.COLOR_BOMB, 1.3);
        }
        state.asteroidsCaptured++;
        const pts = b.kind === "gold_asteroid" ? G.SCORE_GOLD_CAPTURE : b.kind === "bomb" ? 0 : G.SCORE_CAPTURE;
        if (pts > 0) {
          state.score += pts;
          spawnFloatText(state, b.x, b.y - 10, `+${pts}`, b.kind === "gold_asteroid" ? G.COLOR_GOLD : G.COLOR_ASTEROID, 0.8);
        }
        spawnParticles(state, b.x, b.y, 4, G.COLOR_PLAYER);
        state.orbitCount++;
      }
    }

    // Arena bounce
    const adx = b.x - state.arenaCX, ady = b.y - state.arenaCY;
    const aDist = Math.sqrt(adx * adx + ady * ady);
    if (aDist > state.arenaRadius - b.radius) {
      const nx = adx / aDist, ny = ady / aDist;
      const dot = b.vx * nx + b.vy * ny;
      b.vx -= 2 * dot * nx; b.vy -= 2 * dot * ny;
      b.x = state.arenaCX + nx * (state.arenaRadius - b.radius - 1);
      b.y = state.arenaCY + ny * (state.arenaRadius - b.radius - 1);
    }
  }

  state.bodies = state.bodies.filter(b => b.life > 0);
}

function spawnBody(state: GState): void {
  const angle = Math.random() * Math.PI * 2;
  const r = state.arenaRadius - 10;
  const x = state.arenaCX + Math.cos(angle) * r;
  const y = state.arenaCY + Math.sin(angle) * r;
  const tx = state.arenaCX + (Math.random() - 0.5) * state.arenaRadius;
  const ty = state.arenaCY + (Math.random() - 0.5) * state.arenaRadius;
  const dx = tx - x, dy = ty - y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const speed = G.ASTEROID_SPEED + Math.random() * 15;

  const roll = Math.random();
  let kind: GBody["kind"] = "asteroid";
  const bombChance = state.bombChanceOverride >= 0 ? state.bombChanceOverride : G.BOMB_CHANCE;
  if (roll < bombChance) kind = "bomb";
  else if (roll < G.BOMB_CHANCE + G.GOLD_CHANCE) kind = "gold_asteroid";

  state.bodies.push({
    x, y, vx: (dx / len) * speed, vy: (dy / len) * speed,
    radius: kind === "bomb" ? G.BOMB_RADIUS : G.ASTEROID_RADIUS,
    kind, orbiting: false, orbitAngle: 0, orbitDist: 0,
    flung: false, life: G.BODY_LIFETIME, fuseTimer: 0,
  });
}

// ---------------------------------------------------------------------------
// Directional fling — aimed toward aimAngle with spread
// ---------------------------------------------------------------------------

export function tryFling(state: GState): boolean {
  if (state.flingCooldown > 0) return false;
  const orbiting = state.bodies.filter(b => b.orbiting);
  if (orbiting.length === 0) return false;

  state.flingCooldown = G.FLING_COOLDOWN;
  state.asteroidsLaunched += orbiting.length;

  const baseAngle = state.aimAngle;
  const spread = G.FLING_SPREAD;

  for (let i = 0; i < orbiting.length; i++) {
    const b = orbiting[i];
    b.orbiting = false; b.flung = true;
    // Spread evenly around aim direction
    const angleOffset = orbiting.length > 1
      ? (i / (orbiting.length - 1) - 0.5) * spread * 2
      : 0;
    const flingAngle = baseAngle + angleOffset;
    b.vx = Math.cos(flingAngle) * G.FLING_SPEED;
    b.vy = Math.sin(flingAngle) * G.FLING_SPEED;
    b.life = 3;
    spawnParticles(state, b.x, b.y, 2, G.COLOR_FLUNG);
  }

  state.screenShake = G.SHAKE_DURATION * 0.3;
  return true;
}

/** Snipe: fling only 1-2 objects (tap Shift) */
export function tryFlingPartial(state: GState): boolean {
  if (state.flingCooldown > 0) return false;
  const orbiting = state.bodies.filter(b => b.orbiting);
  if (orbiting.length === 0) return false;

  state.flingCooldown = G.FLING_PARTIAL_COOLDOWN;
  const count = Math.min(G.FLING_PARTIAL_COUNT, orbiting.length);
  state.asteroidsLaunched += count;

  const baseAngle = state.aimAngle;
  const toFling = orbiting.slice(0, count);

  for (let i = 0; i < toFling.length; i++) {
    const b = toFling[i];
    b.orbiting = false; b.flung = true;
    const angleOffset = toFling.length > 1 ? (i - 0.5) * 0.15 : 0;
    b.vx = Math.cos(baseAngle + angleOffset) * G.FLING_SPEED;
    b.vy = Math.sin(baseAngle + angleOffset) * G.FLING_SPEED;
    b.life = 3;
    spawnParticles(state, b.x, b.y, 2, G.COLOR_FLUNG);
  }

  state.screenShake = G.SHAKE_DURATION * 0.15;
  return true;
}

// ---------------------------------------------------------------------------
// Enemies — distinct AI per type
// ---------------------------------------------------------------------------

export function updateEnemies(state: GState, dt: number): boolean {
  let playerHit = false;

  state.enemySpawnTimer -= dt;
  const maxE = Math.min(G.ENEMY_MAX, 2 + state.wave);
  if (state.enemySpawnTimer <= 0 && state.enemies.filter(e => e.alive).length < maxE) {
    state.enemySpawnTimer = Math.max(1.0, G.ENEMY_SPAWN_INTERVAL - state.wave * 0.15);
    spawnEnemy(state);
  }

  const px = state.playerX, py = state.playerY;

  for (const e of state.enemies) {
    if (!e.alive) continue;
    if (e.flashTimer > 0) e.flashTimer -= dt;

    const dx = px - e.x, dy = py - e.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = dx / dist, ny = dy / dist;

    switch (e.kind) {
      case "scout": {
        // Scouts: approach → windup telegraph → charge
        if (e.state === "approach" && dist < G.SCOUT_CHARGE_DIST) {
          e.state = "windup"; e.stateTimer = 0.3; // brief telegraph
        }
        if (e.state === "windup") {
          e.stateTimer -= dt;
          // Freeze during windup (telegraph)
          if (e.stateTimer <= 0) { e.state = "charge"; e.stateTimer = 0.3; }
        } else {
          const speed = e.state === "charge" ? G.SCOUT_CHARGE_SPEED : G.SCOUT_SPEED;
          e.x += nx * speed * dt; e.y += ny * speed * dt;
        }
        if (e.state === "charge") {
          e.stateTimer -= dt;
          if (e.stateTimer <= 0) e.state = "approach";
        }
        break;
      }
      case "fighter": {
        // Fighters: orbit at distance, periodically dash inward
        if (e.state === "approach" && dist < G.FIGHTER_ORBIT_DIST) {
          e.state = "orbit"; e.stateTimer = G.FIGHTER_DASH_INTERVAL;
        }
        if (e.state === "orbit") {
          // Orbit tangentially
          const tangX = -ny, tangY = nx;
          const distCorrect = (G.FIGHTER_ORBIT_DIST - dist) * 0.03;
          e.x += (tangX * G.FIGHTER_SPEED + nx * distCorrect * G.FIGHTER_SPEED) * dt;
          e.y += (tangY * G.FIGHTER_SPEED + ny * distCorrect * G.FIGHTER_SPEED) * dt;
          e.stateTimer -= dt;
          if (e.stateTimer <= 0) { e.state = "windup"; e.stateTimer = 0.4; } // telegraph before dash
        } else if (e.state === "windup") {
          // Fighter telegraph: freeze and flash before dashing
          e.stateTimer -= dt;
          if (e.stateTimer <= 0) { e.state = "dash"; e.stateTimer = 0.5; }
        } else if (e.state === "dash") {
          e.x += nx * G.SCOUT_CHARGE_SPEED * dt; e.y += ny * G.SCOUT_CHARGE_SPEED * dt;
          e.stateTimer -= dt;
          if (e.stateTimer <= 0) { e.state = "orbit"; e.stateTimer = G.FIGHTER_DASH_INTERVAL; }
        } else {
          e.x += nx * G.FIGHTER_SPEED * dt; e.y += ny * G.FIGHTER_SPEED * dt;
        }
        break;
      }
      case "tank": {
        // Tanks: slow approach, armor deflects first hit
        e.x += nx * G.TANK_SPEED * dt; e.y += ny * G.TANK_SPEED * dt;
        break;
      }
    }

    // Collide with orbiting bodies (passive orbital damage)
    for (const b of state.bodies) {
      if (!b.orbiting) continue;
      const bdx = b.x - e.x, bdy = b.y - e.y;
      if (Math.sqrt(bdx * bdx + bdy * bdy) < b.radius + e.radius) {
        damageEnemy(state, e, 1);
        b.life = 0;
        spawnParticles(state, b.x, b.y, 4, G.COLOR_ASTEROID);
        break;
      }
    }

    // Hit player
    if (dist < state.playerRadius + e.radius) {
      state.hp--;
      e.alive = false;
      spawnParticles(state, px, py, 8, G.COLOR_DANGER);
      spawnFloatText(state, px, py - 15, "-1 HP", G.COLOR_DANGER, 1.3);
      state.screenShake = G.SHAKE_DURATION;
      state.screenFlashColor = G.COLOR_DANGER;
      state.screenFlashTimer = G.FLASH_DURATION * 2;
      if (state.hp <= 0) playerHit = true;
    }
  }

  state.enemies = state.enemies.filter(e => e.alive);
  return playerHit;
}

function spawnEnemy(state: GState): void {
  const angle = Math.random() * Math.PI * 2;
  const r = state.arenaRadius + 10;
  const x = state.arenaCX + Math.cos(angle) * r;
  const y = state.arenaCY + Math.sin(angle) * r;

  const roll = Math.random();
  let kind: GEnemy["kind"] = "scout"; let hp = G.SCOUT_HP; let radius = G.SCOUT_RADIUS;
  let armor = false;
  if (state.wave >= 3 && roll < 0.15) { kind = "tank"; hp = G.TANK_HP; radius = G.TANK_RADIUS; armor = true; }
  else if (state.wave >= 2 && roll < 0.4) { kind = "fighter"; hp = G.FIGHTER_HP; radius = G.FIGHTER_RADIUS; }

  state.enemies.push({ x, y, vx: 0, vy: 0, radius, hp, maxHp: hp, kind, alive: true, flashTimer: 0,
    state: "approach", stateTimer: 0, armor });
}

function damageEnemy(state: GState, e: GEnemy, dmg: number): void {
  // Tank armor deflects first hit
  if (e.armor && dmg > 0) {
    e.armor = false;
    e.flashTimer = 0.15;
    spawnParticles(state, e.x, e.y, 6, 0xaaaaaa);
    spawnFloatText(state, e.x, e.y - 10, "ARMOR!", 0xaaaaaa, 1.0);
    return; // damage absorbed by armor
  }

  e.hp -= dmg; e.flashTimer = 0.1;
  spawnParticles(state, e.x, e.y, 4, e.kind === "scout" ? G.COLOR_ENEMY_SCOUT : e.kind === "fighter" ? G.COLOR_ENEMY_FIGHTER : G.COLOR_ENEMY_TANK);
  if (e.hp <= 0) {
    e.alive = false; state.enemiesKilled++;
    // Combo system
    state.comboCount++;
    state.comboTimer = 2.0; // 2 seconds to keep combo alive
    const comboMult = 1 + state.comboCount * 0.5;
    const basePts = e.kind === "scout" ? G.SCORE_KILL_SCOUT : e.kind === "fighter" ? G.SCORE_KILL_FIGHTER : G.SCORE_KILL_TANK;
    const pts = Math.floor(basePts * comboMult);
    state.score += pts;
    const comboStr = state.comboCount >= 2 ? ` x${state.comboCount}` : "";
    spawnFloatText(state, e.x, e.y - 10, `+${pts}${comboStr}`, state.comboCount >= 3 ? 0xffdd44 : 0x44ff44, 1.0 + state.comboCount * 0.1);
    spawnParticles(state, e.x, e.y, 10, 0xff4466);
    state.screenShake = G.SHAKE_DURATION * (0.3 + state.comboCount * 0.05);
    // Hitstop on multi-kill (2+ in rapid succession)
    if (state.comboCount >= 2) {
      state.hitstopFrames = Math.min(4, state.comboCount);
    }
  }
}

// ---------------------------------------------------------------------------
// Waves
// ---------------------------------------------------------------------------

export function updateWave(state: GState, dt: number): void {
  state.waveTimer -= dt;
  if (state.waveTimer <= 0) {
    state.wave++; state.waveTimer = G.WAVE_INTERVAL;
    state.waveEvent = "";

    const isEvent = state.wave % G.WAVE_EVENT_INTERVAL === 0;

    if (isEvent) {
      // Wave events cycle: SWARM → ARMOR COLUMN → BOMBARDMENT → repeat
      const eventIdx = Math.floor(state.wave / G.WAVE_EVENT_INTERVAL) % 3;
      switch (eventIdx) {
        case 0: {
          // SWARM: many scouts
          state.waveEvent = "SWARM";
          const count = 5 + Math.floor(state.wave / 3);
          for (let i = 0; i < count; i++) {
            const a = Math.random() * Math.PI * 2;
            const r = state.arenaRadius + 10;
            state.enemies.push({ x: state.arenaCX + Math.cos(a) * r, y: state.arenaCY + Math.sin(a) * r,
              vx: 0, vy: 0, radius: G.SCOUT_RADIUS, hp: G.SCOUT_HP, maxHp: G.SCOUT_HP,
              kind: "scout", alive: true, flashTimer: 0, state: "approach", stateTimer: 0, armor: false });
          }
          spawnFloatText(state, state.arenaCX, state.arenaCY - 40, "SWARM INCOMING!", G.COLOR_ENEMY_SCOUT, 2.0);
          break;
        }
        case 1: {
          // ARMOR COLUMN: multiple tanks
          state.waveEvent = "ARMOR COLUMN";
          const tankCount = 2 + Math.floor(state.wave / 6);
          for (let i = 0; i < tankCount; i++) {
            const a = (i / tankCount) * Math.PI * 2 + Math.random() * 0.3;
            const r = state.arenaRadius + 10;
            state.enemies.push({ x: state.arenaCX + Math.cos(a) * r, y: state.arenaCY + Math.sin(a) * r,
              vx: 0, vy: 0, radius: G.TANK_RADIUS, hp: G.TANK_HP, maxHp: G.TANK_HP,
              kind: "tank", alive: true, flashTimer: 0, state: "approach", stateTimer: 0, armor: true });
          }
          spawnFloatText(state, state.arenaCX, state.arenaCY - 40, "ARMOR COLUMN!", G.COLOR_ENEMY_TANK, 2.0);
          break;
        }
        case 2: {
          // BOMBARDMENT: many asteroids + bombs
          state.waveEvent = "BOMBARDMENT";
          for (let i = 0; i < 8; i++) spawnBody(state);
          // Extra bombs
          for (let i = 0; i < 3; i++) {
            const a = Math.random() * Math.PI * 2;
            const r = state.arenaRadius - 10;
            state.bodies.push({ x: state.arenaCX + Math.cos(a) * r, y: state.arenaCY + Math.sin(a) * r,
              vx: (Math.random()-0.5) * 40, vy: (Math.random()-0.5) * 40,
              radius: G.BOMB_RADIUS, kind: "bomb", orbiting: false, orbitAngle: 0, orbitDist: 0,
              flung: false, life: G.BODY_LIFETIME, fuseTimer: 0 });
          }
          // Some enemies too
          for (let i = 0; i < 3; i++) spawnEnemy(state);
          spawnFloatText(state, state.arenaCX, state.arenaCY - 40, "BOMBARDMENT!", 0xffaa44, 2.0);
          break;
        }
      }
      state.screenShake = G.SHAKE_DURATION * 1.5;
    } else {
      // Regular wave
      const burst = 2 + Math.floor(state.wave / 2);
      for (let i = 0; i < burst; i++) spawnEnemy(state);
    }

    spawnFloatText(state, state.arenaCX, state.arenaCY - 30, `WAVE ${state.wave}`, 0xff8844, 1.5);
    state.screenShake = Math.max(state.screenShake, G.SHAKE_DURATION);
  }
}

// ---------------------------------------------------------------------------
// Timers + particles + float text
// ---------------------------------------------------------------------------

export function updateTimers(state: GState, dt: number): void {
  state.time += dt; state.score += G.SCORE_PER_SECOND * dt;
  if (state.flingCooldown > 0) state.flingCooldown -= dt;
  if (state.screenShake > 0) state.screenShake -= dt;
  if (state.screenFlashTimer > 0) state.screenFlashTimer -= dt;
  // Combo decay
  if (state.comboTimer > 0) { state.comboTimer -= dt; if (state.comboTimer <= 0) state.comboCount = 0; }
  // Hitstop
  if (state.hitstopFrames > 0) state.hitstopFrames--;
  // Threat level (0-1)
  const enemyCount = state.enemies.filter(e => e.alive).length;
  const hpRatio = 1 - state.hp / state.maxHp;
  state.threatLevel = Math.min(1, enemyCount * 0.08 + hpRatio * 0.4 + state.wave * 0.03);
}

// ---------------------------------------------------------------------------
// Mutation unlocks
// ---------------------------------------------------------------------------

import type { GMeta } from "../types";

interface MutationDef { id: string; name: string; desc: string; check: (m: GMeta) => boolean; }

const MUTATIONS: MutationDef[] = [
  { id: "dense_core", name: "Dense Core", desc: "Orbit +2, pull radius -20%", check: m => m.totalKills >= 50 },
  { id: "volatile", name: "Volatile", desc: "30% bomb chance, bombs 3x AoE", check: m => m.bestWave >= 8 },
  { id: "magnetar", name: "Magnetar", desc: "Pull +50%, energy drains 2x", check: m => m.totalKills >= 100 },
  { id: "glass_cannon", name: "Glass Cannon", desc: "2 HP, fling 2x damage", check: m => m.highScore >= 500 },
];

export function checkUnlocks(meta: GMeta): string[] {
  const newUnlocks: string[] = [];
  for (const mut of MUTATIONS) {
    if (!meta.unlocks.includes(mut.id) && mut.check(meta)) {
      meta.unlocks.push(mut.id);
      newUnlocks.push(mut.name);
    }
  }
  return newUnlocks;
}

export function getUnlockCount(meta: GMeta): number { return meta.unlocks.length; }

/** Apply mutation effects to state at game start */
export function applyMutation(state: GState): void {
  switch (state.activeMutation) {
    case "dense_core":
      state.orbitCapacity += 2;
      state.pullRadius *= 0.8;
      break;
    case "volatile":
      state.bombChanceOverride = 0.30;
      // Bomb AoE applied in collision code via check
      break;
    case "magnetar":
      state.pullRadius *= 1.5;
      state.pullDrainMult = 2.0;
      break;
    case "glass_cannon":
      state.hp = 2; state.maxHp = 2;
      state.flingDamageMult = 2.0;
      break;
  }
}

export function getMutationNames(): Array<{ id: string; name: string; desc: string }> {
  return MUTATIONS.map(m => ({ id: m.id, name: m.name, desc: m.desc }));
}
export function getTotalMutations(): number { return MUTATIONS.length; }

export function spawnParticles(state: GState, x: number, y: number, count: number, color: number): void {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2, spd = 30 + Math.random() * 60;
    state.particles.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
      life: G.PARTICLE_LIFETIME, maxLife: G.PARTICLE_LIFETIME, color, size: 1.5 + Math.random() * 3 });
  }
}

export function updateParticles(state: GState, dt: number): void {
  for (const p of state.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.94; p.vy *= 0.94; p.life -= dt; }
  state.particles = state.particles.filter(p => p.life > 0);
}

export function spawnFloatText(state: GState, x: number, y: number, text: string, color: number, scale: number): void {
  state.floatTexts.push({ x, y, text, color, life: 1.2, maxLife: 1.2, scale });
}

export function updateFloatTexts(state: GState, dt: number): void {
  for (const ft of state.floatTexts) { ft.y -= dt * 30; ft.life -= dt; }
  state.floatTexts = state.floatTexts.filter(ft => ft.life > 0);
}

export function spawnDeathEffect(state: GState): void {
  spawnParticles(state, state.playerX, state.playerY, 25, G.COLOR_PLAYER);
  spawnParticles(state, state.playerX, state.playerY, 15, G.COLOR_DANGER);
  state.screenShake = G.SHAKE_DURATION * 3;
  state.screenFlashColor = G.COLOR_DANGER; state.screenFlashTimer = G.FLASH_DURATION * 3;
}
