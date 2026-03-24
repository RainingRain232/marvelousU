// ---------------------------------------------------------------------------
// Flux — Game systems
// Gravity wells, momentum physics, collision damage, wave management
// ---------------------------------------------------------------------------

import type { FluxState, FluxEnemy, GravityWell } from "../types";
import { FluxPhase, EnemyType } from "../types";
import { FLUX_BALANCE as B } from "../config/FluxBalance";

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}
function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

// ---------------------------------------------------------------------------
// Player physics (momentum-based)
// ---------------------------------------------------------------------------

export function applyPlayerInput(s: FluxState, dx: number, dy: number, dt: number): void {
  if (s.phase !== FluxPhase.PLAYING) return;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len > 0.01) {
    s.pvx += (dx / len) * B.PLAYER_ACCEL * dt;
    s.pvy += (dy / len) * B.PLAYER_ACCEL * dt;
  }
  // Friction
  s.pvx *= Math.max(0, 1 - B.PLAYER_FRICTION * dt);
  s.pvy *= Math.max(0, 1 - B.PLAYER_FRICTION * dt);
  // Speed cap
  const sp = Math.sqrt(s.pvx * s.pvx + s.pvy * s.pvy);
  if (sp > B.PLAYER_MAX_SPEED) { s.pvx *= B.PLAYER_MAX_SPEED / sp; s.pvy *= B.PLAYER_MAX_SPEED / sp; }
  // Apply velocity
  s.px += s.pvx * dt; s.py += s.pvy * dt;
  // Wall bounce
  if (s.px < B.PLAYER_RADIUS) { s.px = B.PLAYER_RADIUS; s.pvx = Math.abs(s.pvx) * B.WALL_BOUNCE; }
  if (s.px > s.arenaW - B.PLAYER_RADIUS) { s.px = s.arenaW - B.PLAYER_RADIUS; s.pvx = -Math.abs(s.pvx) * B.WALL_BOUNCE; }
  if (s.py < B.PLAYER_RADIUS) { s.py = B.PLAYER_RADIUS; s.pvy = Math.abs(s.pvy) * B.WALL_BOUNCE; }
  if (s.py > s.arenaH - B.PLAYER_RADIUS) { s.py = s.arenaH - B.PLAYER_RADIUS; s.pvy = -Math.abs(s.pvy) * B.WALL_BOUNCE; }
}

// Gravity affects player too
export function applyGravityToPlayer(s: FluxState, dt: number): void {
  for (const w of s.wells) {
    const d = dist(s.px, s.py, w.x, w.y);
    if (d < w.radius && d > 5) {
      const force = w.strength * (1 - d / w.radius) * dt;
      const a = Math.atan2(w.y - s.py, w.x - s.px);
      s.pvx += Math.cos(a) * force * 0.3; // player is less affected than enemies
      s.pvy += Math.sin(a) * force * 0.3;
    }
  }
}

// ---------------------------------------------------------------------------
// Gravity well placement
// ---------------------------------------------------------------------------

export function placeWell(s: FluxState, aimAngle: number): boolean {
  if (s.phase !== FluxPhase.PLAYING || s.wellCharges <= 0) return false;
  const wx = s.px + Math.cos(aimAngle) * B.WELL_PLACE_RANGE;
  const wy = s.py + Math.sin(aimAngle) * B.WELL_PLACE_RANGE;
  const strMult = 1 + s.upgradeWellStrength * 0.2;
  const radMult = 1 + s.upgradeWellRadius * 0.15;
  s.wells.push({
    x: clamp(wx, 10, s.arenaW - 10), y: clamp(wy, 10, s.arenaH - 10),
    strength: B.WELL_STRENGTH * strMult, radius: B.WELL_RADIUS * radMult,
    life: B.WELL_DURATION, maxLife: B.WELL_DURATION,
  });
  s.wellCharges--;
  spawnParticles(s, wx, wy, 16, B.COLOR_WELL);
  s.screenShake = Math.max(s.screenShake, 0.1);
  s.screenFlashColor = B.COLOR_WELL;
  s.screenFlashTimer = 0.06;
  // Tutorial: placed first well
  if (s.tutorialStep === 0) { s.tutorialStep = 1; s.tutorialTimer = 6; }
  return true;
}

// Gravity Bomb (R key ultimate)
export function tryGravBomb(s: FluxState): boolean {
  if (s.phase !== FluxPhase.PLAYING || s.gravBombCharge < B.GRAV_BOMB_COST || s.gravBombActive > 0) return false;
  s.gravBombCharge = 0;
  s.gravBombActive = B.GRAV_BOMB_DURATION;
  // Create a super-well at player position
  s.wells.push({
    x: s.px, y: s.py,
    strength: B.GRAV_BOMB_STRENGTH,
    radius: B.GRAV_BOMB_RADIUS,
    life: B.GRAV_BOMB_DURATION, maxLife: B.GRAV_BOMB_DURATION,
  });
  s.invincibleTimer = Math.max(s.invincibleTimer, B.GRAV_BOMB_DURATION);
  s.screenShake = 0.4;
  s.screenFlashColor = B.COLOR_WELL_CORE;
  s.screenFlashTimer = B.FLASH_DURATION * 3;
  spawnParticles(s, s.px, s.py, 30, B.COLOR_WELL_CORE);
  spawnFloatingText(s, s.px, s.py - 30, "GRAVITY BOMB!", B.COLOR_WELL_CORE);
  // Damage all enemies in radius
  for (const e of s.enemies) {
    if (!e.alive) continue;
    const d = dist(e.x, e.y, s.px, s.py);
    if (d < B.GRAV_BOMB_RADIUS) {
      e.hp -= B.GRAV_BOMB_DAMAGE;
      e.flashTimer = 0.15;
      if (e.hp <= 0) killEnemy(s, e);
    }
  }
  return true;
}

// Repulsor: push everything away from player
export function tryRepulsor(s: FluxState): boolean {
  if (s.phase !== FluxPhase.PLAYING || s.repulsorCooldown > 0) return false;
  s.repulsorCooldown = B.REPULSOR_COOLDOWN;
  // Create a repulsor well (negative strength = push)
  s.wells.push({
    x: s.px, y: s.py,
    strength: -B.REPULSOR_STRENGTH, radius: B.REPULSOR_RADIUS,
    life: B.REPULSOR_DURATION, maxLife: B.REPULSOR_DURATION,
  });
  spawnParticles(s, s.px, s.py, 14, 0x44ddff);
  s.screenShake = 0.08;
  spawnFloatingText(s, s.px, s.py - 20, "REPULSE!", 0x44ddff);
  return true;
}

// Slingshot: dash toward nearest well
export function slingshot(s: FluxState): boolean {
  if (s.phase !== FluxPhase.PLAYING || s.dashCooldown > 0 || s.wells.length === 0) return false;
  let nearest: GravityWell | null = null;
  let nearDist = Infinity;
  for (const w of s.wells) {
    const d = dist(s.px, s.py, w.x, w.y);
    if (d < nearDist) { nearDist = d; nearest = w; }
  }
  if (!nearest) return false;
  const a = Math.atan2(nearest.y - s.py, nearest.x - s.px);
  s.pvx = Math.cos(a) * B.DASH_SPEED;
  s.pvy = Math.sin(a) * B.DASH_SPEED;
  s.dashCooldown = B.DASH_COOLDOWN;
  s.invincibleTimer = Math.max(s.invincibleTimer, B.DASH_INVINCIBLE);
  spawnParticles(s, s.px, s.py, 8, B.COLOR_PLAYER);
  s.screenShake = 0.06;
  if (s.tutorialStep === 3) { s.tutorialStep = 4; s.tutorialTimer = 4; }
  return true;
}

// ---------------------------------------------------------------------------
// Wave management
// ---------------------------------------------------------------------------

export function updateWaves(s: FluxState, dt: number): void {
  if (s.phase !== FluxPhase.PLAYING) return;
  if (s.waveClearTimer > 0) { s.waveClearTimer -= dt; if (s.waveClearTimer <= 0) startNextWave(s); return; }
  if (s.wave === 0) { s.waveTimer -= dt; if (s.waveTimer <= 0) startNextWave(s); return; }
  if (s.waveSpawnCount > 0) {
    s.waveSpawnTimer -= dt;
    if (s.waveSpawnTimer <= 0) { spawnEnemy(s); s.waveSpawnCount--; s.waveSpawnTimer = B.WAVE_SPAWN_INTERVAL; }
  }
  const aliveCount = s.enemies.filter(e => e.alive).length;
  if (s.waveSpawnCount <= 0 && aliveCount === 0) {
    if (s.wave >= B.MAX_WAVE) { s.phase = FluxPhase.VICTORY; return; }
    s.phase = FluxPhase.WAVE_CLEAR;
    s.waveClearTimer = B.WAVE_CLEAR_PAUSE;
    s.hp = Math.min(s.maxHp, s.hp + 1);
    s.score += s.wave * 40;
    spawnFloatingText(s, s.arenaW / 2, s.arenaH / 2 - 30, `Wave ${s.wave} Clear!`, B.COLOR_SUCCESS);
    s.screenFlashColor = B.COLOR_SUCCESS; s.screenFlashTimer = B.FLASH_DURATION * 2;
  }
}

function startNextWave(s: FluxState): void {
  s.wave++; s.phase = FluxPhase.PLAYING;
  // Gentler early waves: wave 1 = 3 enemies, wave 2 = 5, then normal scaling
  const count = s.wave <= 2 ? s.wave + 2 : B.ENEMIES_BASE + Math.floor(Math.sqrt(s.wave) * B.ENEMIES_PER_WAVE);
  s.waveSpawnCount = count;
  s.waveSpawnTimer = 0.5;
  spawnFloatingText(s, s.arenaW / 2, s.arenaH / 2 - 50, `— WAVE ${s.wave} —`, B.COLOR_PLAYER);

  // Tutorial hints for first-time mechanics
  if (s.wave === 1 && s.tutorialStep === 0) {
    s.tutorialStep = 0; s.tutorialTimer = 6;
  }
}

function spawnEnemy(s: FluxState): void {
  const side = Math.floor(Math.random() * 4);
  let x: number, y: number;
  // Spawn further out so enemies take longer to arrive (matching warning time)
  const spawnDist = 50;
  switch (side) {
    case 0: x = Math.random() * s.arenaW; y = -spawnDist; break;
    case 1: x = s.arenaW + spawnDist; y = Math.random() * s.arenaH; break;
    case 2: x = Math.random() * s.arenaW; y = s.arenaH + spawnDist; break;
    default: x = -spawnDist; y = Math.random() * s.arenaH; break;
  }
  // Spawn warning at arena edge
  const wx2 = clamp(x, 0, s.arenaW), wy2 = clamp(y, 0, s.arenaH);
  s.spawnWarnings.push({ x: wx2, y: wy2, timer: B.SPAWN_WARNING_TIME });
  let type: EnemyType;
  // Tutorial waves: wave 1 = shooters (learn redirect), wave 2 = drones (learn collision)
  if (s.wave === 1) {
    type = EnemyType.SHOOTER;
  } else if (s.wave === 2) {
    type = EnemyType.DRONE;
  } else {
    const roll = Math.random();
    if (s.wave >= 8 && roll < 0.12) type = EnemyType.BOMBER;
    else if (s.wave >= 5 && roll < 0.2) type = EnemyType.TANK;
    else if (roll < 0.3) type = EnemyType.SHOOTER;
    else if (roll < 0.45) type = EnemyType.SWARM;
    else type = EnemyType.DRONE;
  }

  const def = B.ENEMY_DEFS[type];
  const hpScale = 1 + s.wave * 0.08;
  s.enemies.push({
    x, y, vx: 0, vy: 0, type,
    hp: Math.ceil(def.hp * hpScale), maxHp: Math.ceil(def.hp * hpScale),
    radius: def.radius, mass: def.mass, speed: def.speed, color: def.color,
    alive: true, deathTimer: 0, flashTimer: 0,
    attackTimer: B.SHOOTER_ATTACK_INTERVAL * (0.5 + Math.random()),
    explodeRadius: type === EnemyType.BOMBER ? B.BOMBER_EXPLODE_RADIUS : 0,
  });
}

// ---------------------------------------------------------------------------
// Enemy AI + physics
// ---------------------------------------------------------------------------

export function updateEnemies(s: FluxState, dt: number): void {
  for (let i = s.enemies.length - 1; i >= 0; i--) {
    const e = s.enemies[i];
    if (!e.alive) {
      e.deathTimer -= dt;
      if (e.deathTimer <= 0) s.enemies.splice(i, 1);
      continue;
    }
    if (e.flashTimer > 0) e.flashTimer -= dt;

    // Check if caught in any gravity well
    let inWell = false;
    let wellPullX = 0, wellPullY = 0;
    for (const w of s.wells) {
      const wd = dist(e.x, e.y, w.x, w.y);
      if (wd < w.radius && wd > 3) {
        inWell = true;
        const force = w.strength * (1 - wd / w.radius) * 1.5 / e.mass; // strong pull
        const wa = Math.atan2(w.y - e.y, w.x - e.x);
        wellPullX += Math.cos(wa) * force;
        wellPullY += Math.sin(wa) * force;
      }
    }

    // AI thrust toward player — SUPPRESSED when caught in well
    const a = Math.atan2(s.py - e.y, s.px - e.x);
    const d = dist(e.x, e.y, s.px, s.py);
    const aiStrength = inWell ? 0.15 : 1.0; // enemies barely fight gravity
    e.vx += Math.cos(a) * e.speed * aiStrength * dt;
    e.vy += Math.sin(a) * e.speed * aiStrength * dt;

    // Apply accumulated gravity pull
    e.vx += wellPullX * dt;
    e.vy += wellPullY * dt;

    // Shooter: stop and fire
    if (e.type === EnemyType.SHOOTER && d < 200) {
      if (!inWell) { e.vx *= 0.92; e.vy *= 0.92; }
      e.attackTimer -= dt;
      if (e.attackTimer <= 0) {
        e.attackTimer = B.SHOOTER_ATTACK_INTERVAL;
        s.projectiles.push({
          x: e.x, y: e.y,
          vx: Math.cos(a) * B.SHOOTER_PROJ_SPEED, vy: Math.sin(a) * B.SHOOTER_PROJ_SPEED,
          radius: 4, damage: 1, color: B.COLOR_ENEMY_PROJ, life: 4,
          fromEnemy: true, redirected: false,
        });
      }
    }

    // Speed limit (higher to allow satisfying crashes)
    const sp = Math.sqrt(e.vx * e.vx + e.vy * e.vy);
    const maxSp = e.speed * 6;
    if (sp > maxSp) { e.vx *= maxSp / sp; e.vy *= maxSp / sp; }

    // Apply velocity
    e.x += e.vx * dt; e.y += e.vy * dt;

    // Wall bounce WITH damage
    const preSpeed = Math.sqrt(e.vx * e.vx + e.vy * e.vy);
    let wallHit = false;
    if (e.x < e.radius) { e.x = e.radius; e.vx = Math.abs(e.vx) * B.WALL_BOUNCE; wallHit = true; }
    if (e.x > s.arenaW - e.radius) { e.x = s.arenaW - e.radius; e.vx = -Math.abs(e.vx) * B.WALL_BOUNCE; wallHit = true; }
    if (e.y < e.radius) { e.y = e.radius; e.vy = Math.abs(e.vy) * B.WALL_BOUNCE; wallHit = true; }
    if (e.y > s.arenaH - e.radius) { e.y = s.arenaH - e.radius; e.vy = -Math.abs(e.vy) * B.WALL_BOUNCE; wallHit = true; }
    // Wall impact damage
    if (wallHit && preSpeed > B.COLLISION_DAMAGE_SPEED * 0.7) {
      const wallDmg = Math.max(1, Math.floor(preSpeed * B.COLLISION_DAMAGE_MULT * 1.5));
      e.hp -= wallDmg; e.flashTimer = 0.1;
      spawnParticles(s, e.x, e.y, 4, B.COLOR_COLLISION);
      spawnFloatingText(s, e.x, e.y - 8, `WALL!`, 0xaaaaaa);
      s.screenShake = Math.max(s.screenShake, 0.05);
      if (e.hp <= 0) killEnemy(s, e);
    }

    // Lighter friction (let momentum carry further)
    e.vx *= Math.max(0, 1 - 1.0 * dt);
    e.vy *= Math.max(0, 1 - 1.0 * dt);

    // Collision with player
    if (e.alive && d < e.radius + B.PLAYER_RADIUS && s.invincibleTimer <= 0) {
      damagePlayer(s, 1);
      e.vx += Math.cos(a + Math.PI) * 150;
      e.vy += Math.sin(a + Math.PI) * 150;
    }
  }

  // Enemy-enemy collisions (this is the core mechanic!)
  for (let i = 0; i < s.enemies.length; i++) {
    const a2 = s.enemies[i];
    if (!a2.alive) continue;
    for (let j = i + 1; j < s.enemies.length; j++) {
      const b = s.enemies[j];
      if (!b.alive) continue;
      const d2 = dist(a2.x, a2.y, b.x, b.y);
      if (d2 < a2.radius + b.radius && d2 > 0) {
        // Relative speed
        const relVx = a2.vx - b.vx, relVy = a2.vy - b.vy;
        const relSpeed = Math.sqrt(relVx * relVx + relVy * relVy);

        // Collision damage if fast enough
        if (relSpeed > B.COLLISION_DAMAGE_SPEED) {
          const dmg = Math.max(1, Math.floor(relSpeed * B.COLLISION_DAMAGE_MULT));
          a2.hp -= dmg; a2.flashTimer = 0.1;
          b.hp -= dmg; b.flashTimer = 0.1;
          s.screenShake = Math.max(s.screenShake, 0.08);
          spawnParticles(s, (a2.x + b.x) / 2, (a2.y + b.y) / 2, 6, B.COLOR_COLLISION);
          spawnFloatingText(s, (a2.x + b.x) / 2, (a2.y + b.y) / 2 - 10, `CRASH!`, B.COLOR_COLLISION);
          s.totalCollisions++;
          s.frameCollisions++;
          if (s.tutorialStep === 2) { s.tutorialStep = 3; s.tutorialTimer = 5; }

          if (a2.hp <= 0) killEnemy(s, a2);
          if (b.hp <= 0) killEnemy(s, b);
        }

        // Bounce
        const nx = (b.x - a2.x) / d2, ny = (b.y - a2.y) / d2;
        const overlap = a2.radius + b.radius - d2;
        a2.x -= nx * overlap * 0.5; a2.y -= ny * overlap * 0.5;
        b.x += nx * overlap * 0.5; b.y += ny * overlap * 0.5;
        // Elastic-ish bounce based on mass
        const totalMass = a2.mass + b.mass;
        const relDot = relVx * nx + relVy * ny;
        a2.vx -= nx * relDot * (2 * b.mass / totalMass) * B.ENEMY_ENEMY_BOUNCE;
        a2.vy -= ny * relDot * (2 * b.mass / totalMass) * B.ENEMY_ENEMY_BOUNCE;
        b.vx += nx * relDot * (2 * a2.mass / totalMass) * B.ENEMY_ENEMY_BOUNCE;
        b.vy += ny * relDot * (2 * a2.mass / totalMass) * B.ENEMY_ENEMY_BOUNCE;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Projectiles (gravity-affected!)
// ---------------------------------------------------------------------------

export function updateProjectiles(s: FluxState, dt: number): void {
  for (let i = s.projectiles.length - 1; i >= 0; i--) {
    const p = s.projectiles[i];

    // Gravity wells affect projectiles
    for (const w of s.wells) {
      const d = dist(p.x, p.y, w.x, w.y);
      if (d < w.radius && d > 3) {
        const force = w.strength * (1 - d / w.radius) * 2; // projectiles are very affected
        const a = Math.atan2(w.y - p.y, w.x - p.x);
        p.vx += Math.cos(a) * force * dt;
        p.vy += Math.sin(a) * force * dt;
        // Mark as redirected if enemy projectile changes direction significantly
        if (p.fromEnemy && !p.redirected) {
          p.redirected = true;
          p.color = B.COLOR_REDIRECT;
          s.totalRedirects++;
          s.frameRedirects++;
          if (s.tutorialStep === 1) { s.tutorialStep = 2; s.tutorialTimer = 5; }
          s.score += B.SCORE_REDIRECT_BONUS;
          spawnFloatingText(s, p.x, p.y, "REDIRECT!", B.COLOR_REDIRECT);
        }
      }
    }

    p.x += p.vx * dt; p.y += p.vy * dt;
    p.life -= dt;
    if (p.life <= 0 || p.x < -50 || p.x > s.arenaW + 50 || p.y < -50 || p.y > s.arenaH + 50) {
      s.projectiles.splice(i, 1); continue;
    }

    if (p.fromEnemy && !p.redirected) {
      // Enemy projectile → hit player
      if (dist(p.x, p.y, s.px, s.py) < p.radius + B.PLAYER_RADIUS && s.invincibleTimer <= 0) {
        damagePlayer(s, p.damage);
        s.projectiles.splice(i, 1);
      }
    } else if (p.redirected) {
      // Redirected projectile → hit enemies!
      for (const e of s.enemies) {
        if (!e.alive) continue;
        if (dist(p.x, p.y, e.x, e.y) < p.radius + e.radius) {
          e.hp -= p.damage * 2; // double damage for redirected
          e.flashTimer = 0.1;
          spawnParticles(s, e.x, e.y, 4, B.COLOR_REDIRECT);
          if (e.hp <= 0) killEnemy(s, e);
          s.projectiles.splice(i, 1);
          break;
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Damage / kills
// ---------------------------------------------------------------------------

function damagePlayer(s: FluxState, damage: number): void {
  if (s.invincibleTimer > 0) return;
  s.hp -= damage;
  s.invincibleTimer = B.PLAYER_INVINCIBLE;
  s.screenShake = B.SHAKE_DURATION; s.screenFlashColor = B.COLOR_DANGER; s.screenFlashTimer = B.FLASH_DURATION;
  spawnParticles(s, s.px, s.py, 12, B.COLOR_DANGER);
  if (s.hp <= 0) { s.phase = FluxPhase.DEAD; spawnParticles(s, s.px, s.py, 30, B.COLOR_PLAYER); }
}

function killEnemy(s: FluxState, e: FluxEnemy): void {
  if (!e.alive) return;
  e.alive = false; e.deathTimer = 0.3;
  s.totalKills++;
  s.frameKills++;
  const def = B.ENEMY_DEFS[e.type];
  const comboMult = 1 + Math.min(s.combo, 10) * 0.15;
  const pts = Math.floor(def.score * comboMult);
  s.score += pts; s.combo++; s.comboTimer = B.COMBO_WINDOW;
  if (s.combo > s.bestCombo) s.bestCombo = s.combo;
  spawnFloatingText(s, e.x, e.y - 10, `+${pts}`, s.combo > 3 ? B.COLOR_COMBO : B.COLOR_TEXT);
  spawnParticles(s, e.x, e.y, 12, e.color);

  // Gravity bomb charge
  s.gravBombCharge = Math.min(B.GRAV_BOMB_COST, s.gravBombCharge + B.GRAV_BOMB_CHARGE_PER_KILL);

  // Combo milestones
  if (s.combo === 5 || s.combo === 10 || s.combo === 20 || s.combo === 50) {
    spawnFloatingText(s, s.arenaW / 2, s.arenaH / 2 - 40, `${s.combo}x CHAIN!`, B.COLOR_GOLD);
    s.screenFlashColor = B.COLOR_GOLD; s.screenFlashTimer = B.FLASH_DURATION * 2;
    s.screenShake = 0.15;
    spawnParticles(s, s.arenaW / 2, s.arenaH / 2, 25, B.COLOR_GOLD);
    // Bonus HP at major milestones
    if (s.combo >= 20 && s.hp < s.maxHp) { s.hp++; spawnFloatingText(s, s.px, s.py - 15, "+1 HP", B.COLOR_HP); }
  }

  // Bomber explosion
  if (e.type === EnemyType.BOMBER) {
    for (const other of s.enemies) {
      if (!other.alive || other === e) continue;
      const d = dist(e.x, e.y, other.x, other.y);
      if (d < e.explodeRadius) {
        other.hp -= B.BOMBER_EXPLODE_DAMAGE;
        other.flashTimer = 0.1;
        const ka = Math.atan2(other.y - e.y, other.x - e.x);
        other.vx += Math.cos(ka) * 200; other.vy += Math.sin(ka) * 200;
        if (other.hp <= 0) killEnemy(s, other);
      }
    }
    spawnParticles(s, e.x, e.y, 20, 0xff8844);
    s.screenShake = 0.2; s.screenFlashColor = 0xff6633; s.screenFlashTimer = B.FLASH_DURATION;
    s.frameExplosions++;
  }
}

// ---------------------------------------------------------------------------
// Well merge: two wells close together combine into a super-well
// ---------------------------------------------------------------------------

export function checkWellMerge(s: FluxState): void {
  for (let i = 0; i < s.wells.length; i++) {
    for (let j = i + 1; j < s.wells.length; j++) {
      const a = s.wells[i], b = s.wells[j];
      const d = dist(a.x, a.y, b.x, b.y);
      if (d < 40) { // close enough to merge
        // Create super-well at midpoint
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        const superLife = Math.max(a.life, b.life) * 1.3;
        s.wells.splice(j, 1); s.wells.splice(i, 1);
        s.wells.push({
          x: mx, y: my,
          strength: B.WELL_STRENGTH * 1.8,
          radius: B.WELL_RADIUS * 1.4,
          life: superLife, maxLife: superLife,
        });
        spawnParticles(s, mx, my, 20, B.COLOR_WELL_CORE);
        spawnFloatingText(s, mx, my - 15, "MERGE!", B.COLOR_WELL_CORE);
        s.screenShake = 0.15;
        s.screenFlashColor = B.COLOR_WELL_CORE;
        s.screenFlashTimer = 0.08;
        return; // only one merge per frame
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Gravity wells update
// ---------------------------------------------------------------------------

export function updateWells(s: FluxState, dt: number): void {
  for (let i = s.wells.length - 1; i >= 0; i--) {
    s.wells[i].life -= dt;
    if (s.wells[i].life <= 0) { s.wells.splice(i, 1); }
  }
  // Recharge
  if (s.wellCharges < s.maxWellCharges) {
    s.wellRechargeTimer -= dt;
    if (s.wellRechargeTimer <= 0) {
      s.wellCharges = Math.min(s.maxWellCharges + s.upgradeMaxCharges, s.wellCharges + 1);
      s.wellRechargeTimer = B.WELL_RECHARGE_TIME * Math.max(0.4, 1 - s.upgradeRechargeSpeed * 0.15);
    }
  }
}

// ---------------------------------------------------------------------------
// Timers, particles
// ---------------------------------------------------------------------------

export function updateTimers(s: FluxState, dt: number): void {
  s.time += dt;
  if (s.screenShake > 0) s.screenShake -= dt;
  if (s.screenFlashTimer > 0) s.screenFlashTimer -= dt;
  if (s.invincibleTimer > 0) s.invincibleTimer -= dt;
  if (s.dashCooldown > 0) s.dashCooldown -= dt;
  if (s.comboTimer > 0) { s.comboTimer -= dt; if (s.comboTimer <= 0) s.combo = 0; }
  if (s.gravBombActive > 0) s.gravBombActive -= dt;
  if (s.repulsorCooldown > 0) s.repulsorCooldown -= dt;
  if (s.tutorialTimer > 0) s.tutorialTimer -= dt;
  if (s.phase === FluxPhase.PLAYING) s.score += B.SCORE_PER_SECOND * dt;
  s.arenaPulse = s.hp <= 2 ? s.arenaPulse + dt * 3 : 0;
  // Spawn warnings
  for (let i = s.spawnWarnings.length - 1; i >= 0; i--) {
    s.spawnWarnings[i].timer -= dt;
    if (s.spawnWarnings[i].timer <= 0) s.spawnWarnings.splice(i, 1);
  }
}

export function updateParticles(s: FluxState, dt: number): void {
  for (let i = s.particles.length - 1; i >= 0; i--) {
    const p = s.particles[i];
    p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.97; p.vy *= 0.97; p.life -= dt;
    if (p.life <= 0) s.particles.splice(i, 1);
  }
}

export function updateFloatingTexts(s: FluxState, dt: number): void {
  for (let i = s.floatingTexts.length - 1; i >= 0; i--) {
    s.floatingTexts[i].y -= dt * 35; s.floatingTexts[i].life -= dt;
    if (s.floatingTexts[i].life <= 0) s.floatingTexts.splice(i, 1);
  }
}

export function spawnParticles(s: FluxState, x: number, y: number, count: number, color: number): void {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2, sp = 30 + Math.random() * 100;
    s.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: B.PARTICLE_LIFETIME + Math.random() * 0.3, maxLife: B.PARTICLE_LIFETIME + 0.3,
      color, size: 1.5 + Math.random() * 2.5 });
  }
}

export function spawnFloatingText(s: FluxState, x: number, y: number, text: string, color: number): void {
  s.floatingTexts.push({ x, y, text, color, life: 1.4, maxLife: 1.4 });
}

// ---------------------------------------------------------------------------
// Wave upgrade system (called between waves)
// ---------------------------------------------------------------------------

export function applyWaveUpgrade(s: FluxState, choice: number): void {
  switch (choice) {
    case 0: s.upgradeWellStrength++; spawnFloatingText(s, s.arenaW / 2, s.arenaH / 2, "+WELL POWER", B.COLOR_WELL_CORE); break;
    case 1: s.upgradeWellRadius++; spawnFloatingText(s, s.arenaW / 2, s.arenaH / 2, "+WELL RANGE", B.COLOR_WELL_RING); break;
    case 2: s.upgradeRechargeSpeed++; spawnFloatingText(s, s.arenaW / 2, s.arenaH / 2, "+RECHARGE", B.COLOR_CHARGE); break;
    case 3: s.upgradeMaxCharges++; s.wellCharges++; spawnFloatingText(s, s.arenaW / 2, s.arenaH / 2, "+CHARGE SLOT", B.COLOR_CHARGE); break;
  }
  s.screenFlashColor = B.COLOR_WELL_CORE; s.screenFlashTimer = B.FLASH_DURATION;
}
