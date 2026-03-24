// ---------------------------------------------------------------------------
// Echo — Game systems
// Time-loop recording, ghost replay, enemy scaling, combat
// ---------------------------------------------------------------------------

import type { EchoState, EchoEnemy } from "../types";
import { EchoPhase } from "../types";
import { ECHO_BALANCE as B } from "../config/EchoBalance";

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}
function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

// ---------------------------------------------------------------------------
// Player movement
// ---------------------------------------------------------------------------

export function movePlayer(s: EchoState, dx: number, dy: number, dt: number): void {
  if (s.phase !== EchoPhase.RECORDING) return;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len > 0.01) {
    const speed = B.PLAYER_SPEED * Math.pow(B.UPGRADE_SPEED, s.upgradeSpeed);
    s.px = clamp(s.px + (dx / len) * speed * dt, B.PLAYER_RADIUS, s.arenaW - B.PLAYER_RADIUS);
    s.py = clamp(s.py + (dy / len) * speed * dt, B.PLAYER_RADIUS, s.arenaH - B.PLAYER_RADIUS);
  }
}

export function setAim(s: EchoState, dx: number, dy: number): void {
  if (dx !== 0 || dy !== 0) s.aimAngle = Math.atan2(dy, dx);
}

export function playerShoot(s: EchoState): boolean {
  if (s.phase !== EchoPhase.RECORDING || s.shootCooldown > 0) return false;
  const cdMult = Math.pow(B.UPGRADE_FIRE_RATE, s.upgradeFireRate);
  s.shootCooldown = B.SHOOT_COOLDOWN * cdMult;
  const sizeMult = Math.pow(B.UPGRADE_BULLET_SIZE, s.upgradeBulletSize);
  s.bullets.push({
    x: s.px, y: s.py,
    vx: Math.cos(s.aimAngle) * B.BULLET_SPEED, vy: Math.sin(s.aimAngle) * B.BULLET_SPEED,
    radius: B.BULLET_RADIUS * sizeMult, damage: B.BULLET_DAMAGE + s.upgradeBulletSize,
    color: B.COLOR_PLAYER, life: B.BULLET_LIFE, fromPlayer: true, fromGhost: false,
  });
  return true;
}

// ---------------------------------------------------------------------------
// Recording system
// ---------------------------------------------------------------------------

export function recordFrame(s: EchoState, shooting: boolean): void {
  if (s.phase !== EchoPhase.RECORDING) return;
  s.currentRecording.push({ x: s.px, y: s.py, aimAngle: s.aimAngle, shooting });
  s.recordingFrame++;
}

// ---------------------------------------------------------------------------
// Ghost replay
// ---------------------------------------------------------------------------

export function updateGhosts(s: EchoState): void {
  if (s.phase !== EchoPhase.RECORDING || s.hp <= 0) return;
  const frame = s.ghostFrame;

  for (const ghost of s.ghosts) {
    const fi = frame % ghost.frames.length;
    const f = ghost.frames[fi];
    // Ghost shooting — rate limited to avoid bullet spam
    if (f.shooting && frame % 3 === 0) {
      s.bullets.push({
        x: f.x, y: f.y,
        vx: Math.cos(f.aimAngle) * B.BULLET_SPEED, vy: Math.sin(f.aimAngle) * B.BULLET_SPEED,
        radius: B.BULLET_RADIUS, damage: B.BULLET_DAMAGE + 1 + Math.floor(s.ghosts.indexOf(ghost) * 0.5),
        color: ghost.color, life: B.BULLET_LIFE, fromPlayer: true, fromGhost: true,
      });
    }
  }

  s.ghostFrame++;
}

// ---------------------------------------------------------------------------
// Loop management
// ---------------------------------------------------------------------------

export function updateLoop(s: EchoState, dt: number): void {
  if (s.phase !== EchoPhase.RECORDING) return;

  // Slow-mo transition at loop end (last 0.8 seconds)
  if (s.loopTransitionTimer > 0) {
    s.loopTransitionTimer -= dt;
    if (s.loopTransitionTimer <= 0) {
      completeLoop(s);
    }
    return; // freeze game during transition
  }

  s.loopTimer += dt;

  // Trigger loop transition 0.8s before end
  if (s.loopTimer >= s.loopDuration) {
    s.loopTransitionTimer = 0.8;
    s.screenShake = 0.3;
    s.screenFlashColor = B.COLOR_LOOP;
    s.screenFlashTimer = B.FLASH_DURATION * 2;
    spawnParticles(s, s.px, s.py, 20, B.COLOR_LOOP);
    spawnFloatingText(s, s.arenaW / 2, s.arenaH / 2, "LOOP COMPLETE!", B.COLOR_LOOP);
  }
}

function completeLoop(s: EchoState): void {
  // Save current recording as a ghost
  if (s.currentRecording.length > 0) {
    const colorIdx = Math.min(s.ghosts.length, B.GHOST_COLORS.length - 1);
    s.ghosts.push({
      frames: [...s.currentRecording],
      color: B.GHOST_COLORS[colorIdx],
    });
  }

  s.loopNumber++;
  if (s.loopNumber > B.MAX_LOOPS) {
    s.phase = EchoPhase.VICTORY;
    return;
  }

  s.phase = EchoPhase.LOOP_COMPLETE;
  s.score += s.loopNumber * 100;
  spawnFloatingText(s, s.arenaW / 2, s.arenaH / 2 - 40, `LOOP ${s.loopNumber - 1} RECORDED!`, B.COLOR_LOOP);
  spawnFloatingText(s, s.arenaW / 2, s.arenaH / 2, `${s.ghosts.length} ghost${s.ghosts.length > 1 ? "s" : ""} now fighting with you`, B.COLOR_TEXT);
  s.screenFlashColor = B.COLOR_LOOP; s.screenFlashTimer = B.FLASH_DURATION * 3;
}

export function startNextLoop(s: EchoState): void {
  s.phase = EchoPhase.RECORDING;
  s.loopTimer = 0;
  s.ghostFrame = 0;
  s.currentRecording = [];
  s.recordingFrame = 0;
  s.px = s.arenaW / 2; s.py = s.arenaH / 2;
  s.enemies = []; s.bullets = [];
  s.enemySpawnTimer = s.loopNumber <= 2 ? 3.0 : 2.0;
  s.hp = s.loopNumber === 1 ? s.maxHp : Math.min(s.maxHp, s.hp + 2);
  s.bossSpawned = false; s.bossAlive = false;
  spawnFloatingText(s, s.arenaW / 2, s.arenaH / 2 + 20, `Loop ${s.loopNumber} — GO!`, B.COLOR_TIMER);
  // Announce ghost count
  if (s.ghosts.length > 0) {
    spawnFloatingText(s, s.arenaW / 2, s.arenaH / 2 + 40, `${s.ghosts.length} ghost${s.ghosts.length > 1 ? "s" : ""} active`, B.COLOR_LOOP);
  }
  // Time stop unlock announcement
  if (s.ghosts.length === 3) {
    spawnFloatingText(s, s.arenaW / 2, s.arenaH / 2 + 60, "TIME STOP unlocked! [Q]", B.COLOR_SUCCESS);
  }
}

// ---------------------------------------------------------------------------
// Enemy AI
// ---------------------------------------------------------------------------

export function updateEnemies(s: EchoState, dt: number): void {
  // Spawn enemies (skip if time stopped)
  if (s.phase === EchoPhase.RECORDING && s.timeStopActive <= 0) {
    s.enemySpawnTimer -= dt;
    const interval = Math.max(B.ENEMY_MIN_SPAWN_INTERVAL,
      B.ENEMY_SPAWN_INTERVAL + (s.loopNumber - 1) * B.ENEMY_SPAWN_INTERVAL_PER_LOOP);
    if (s.enemySpawnTimer <= 0) {
      s.enemySpawnTimer = interval;
      spawnEnemy(s);
    }
    // Boss spawn at BOSS_SPAWN_TIME into the loop
    if (!s.bossSpawned && s.loopTimer >= B.BOSS_SPAWN_TIME) {
      s.bossSpawned = true;
      spawnBoss(s);
    }
  }

  for (let i = s.enemies.length - 1; i >= 0; i--) {
    const e = s.enemies[i];
    if (!e.alive) { e.deathTimer -= dt; if (e.deathTimer <= 0) s.enemies.splice(i, 1); continue; }
    if (e.flashTimer > 0) e.flashTimer -= dt;

    // Time stop: enemies frozen
    if (s.timeStopActive > 0) continue;

    // Find nearest target (player or ghost)
    let tx = s.px, ty = s.py;
    let td = dist(e.x, e.y, s.px, s.py);
    // Also consider ghost positions as targets (enemies split attention)
    const frame = s.ghostFrame;
    for (const ghost of s.ghosts) {
      if (ghost.frames.length === 0) continue;
      const fi = frame % ghost.frames.length;
      const gf = ghost.frames[fi];
      const gd = dist(e.x, e.y, gf.x, gf.y);
      if (gd < td) { td = gd; tx = gf.x; ty = gf.y; }
    }

    const a = Math.atan2(ty - e.y, tx - e.x);
    // Enemy flinch: slow down briefly when hit by ghost bullets nearby
    let flinchMult = 1.0;
    for (const b of s.bullets) {
      if (b.fromGhost && dist(b.x, b.y, e.x, e.y) < e.radius * 3) {
        flinchMult = 0.5; break; // slow to 50% when ghost bullets are close
      }
    }
    e.x += Math.cos(a) * e.speed * flinchMult * dt;
    e.y += Math.sin(a) * e.speed * flinchMult * dt;

    // Wall clamp
    e.x = clamp(e.x, e.radius, s.arenaW - e.radius);
    e.y = clamp(e.y, e.radius, s.arenaH - e.radius);

    // Attack (shoot at target)
    e.attackTimer -= dt;
    if (e.attackTimer <= 0 && td < 250) {
      e.attackTimer = B.ENEMY_ATTACK_INTERVAL;
      s.bullets.push({
        x: e.x, y: e.y,
        vx: Math.cos(a) * B.ENEMY_PROJ_SPEED, vy: Math.sin(a) * B.ENEMY_PROJ_SPEED,
        radius: 3, damage: 1, color: B.COLOR_ENEMY_PROJ, life: 3, fromPlayer: false, fromGhost: false,
      });
    }

    // Collision with player
    if (dist(e.x, e.y, s.px, s.py) < e.radius + B.PLAYER_RADIUS && s.invincibleTimer <= 0) {
      damagePlayer(s, 1);
    }
  }
}

function spawnEnemy(s: EchoState): void {
  const side = Math.floor(Math.random() * 4);
  let x: number, y: number;
  switch (side) {
    case 0: x = Math.random() * s.arenaW; y = -30; break;
    case 1: x = s.arenaW + 30; y = Math.random() * s.arenaH; break;
    case 2: x = Math.random() * s.arenaW; y = s.arenaH + 30; break;
    default: x = -30; y = Math.random() * s.arenaH; break;
  }
  const tier = s.loopNumber;
  const roll = Math.random();

  // Determine variant
  let isElite = false, isRusher = false;
  let hpMult = 1, speedMult = 1, sizeMult = 1;
  let color: number = B.COLOR_ENEMY;

  if (tier >= 3 && roll < B.ELITE_CHANCE) {
    isElite = true; hpMult = B.ELITE_HP_MULT; sizeMult = B.ELITE_SIZE_MULT;
    color = B.ELITE_COLOR;
  } else if (tier >= 2 && roll < B.ELITE_CHANCE + B.RUSHER_CHANCE) {
    isRusher = true; hpMult = B.RUSHER_HP_MULT; speedMult = B.RUSHER_SPEED_MULT;
    color = B.RUSHER_COLOR;
  }

  const baseHp = B.ENEMY_BASE_HP + tier * B.ENEMY_HP_PER_LOOP;
  const baseSpeed = B.ENEMY_BASE_SPEED + tier * B.ENEMY_SPEED_PER_LOOP;

  s.enemies.push({
    x, y, vx: 0, vy: 0,
    hp: Math.ceil(baseHp * hpMult), maxHp: Math.ceil(baseHp * hpMult),
    radius: (B.ENEMY_RADIUS + tier) * sizeMult,
    speed: baseSpeed * speedMult,
    color, alive: true, deathTimer: 0, flashTimer: 0,
    attackTimer: isRusher ? 999 : B.ENEMY_ATTACK_INTERVAL * (0.5 + Math.random()),
    tier, isElite, isRusher, isBoss: false,
  });
}

function spawnBoss(s: EchoState): void {
  const tier = s.loopNumber;
  const side = Math.floor(Math.random() * 4);
  let x: number, y: number;
  switch (side) {
    case 0: x = s.arenaW / 2; y = -30; break;
    case 1: x = s.arenaW + 30; y = s.arenaH / 2; break;
    case 2: x = s.arenaW / 2; y = s.arenaH + 30; break;
    default: x = -30; y = s.arenaH / 2; break;
  }
  s.enemies.push({
    x, y, vx: 0, vy: 0,
    hp: B.BOSS_HP_BASE + tier * B.BOSS_HP_PER_LOOP,
    maxHp: B.BOSS_HP_BASE + tier * B.BOSS_HP_PER_LOOP,
    radius: B.BOSS_RADIUS, speed: B.BOSS_SPEED,
    color: B.BOSS_COLOR, alive: true, deathTimer: 0, flashTimer: 0,
    attackTimer: B.BOSS_ATTACK_INTERVAL,
    tier, isElite: false, isRusher: false, isBoss: true,
  });
  s.bossAlive = true;
  spawnFloatingText(s, s.arenaW / 2, s.arenaH / 2 - 30, "— CHRONO GUARDIAN —", B.BOSS_COLOR);
  s.screenShake = 0.3;
  s.screenFlashColor = B.BOSS_COLOR;
  s.screenFlashTimer = B.FLASH_DURATION * 2;
  spawnParticles(s, x, y, 15, B.BOSS_COLOR);
}

// ---------------------------------------------------------------------------
// Bullets
// ---------------------------------------------------------------------------

export function updateBullets(s: EchoState, dt: number): void {
  for (let i = s.bullets.length - 1; i >= 0; i--) {
    const b = s.bullets[i];
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (b.life <= 0 || b.x < -50 || b.x > s.arenaW + 50 || b.y < -50 || b.y > s.arenaH + 50) {
      s.bullets.splice(i, 1); continue;
    }
    if (b.fromPlayer) {
      for (const e of s.enemies) {
        if (!e.alive) continue;
        if (dist(b.x, b.y, e.x, e.y) < b.radius + e.radius) {
          // Crossfire bonus: count how many ghosts have line of fire near this enemy
          let crossfireBonus = 0;
          if (s.ghosts.length > 0) {
            const gf2 = s.ghostFrame;
            for (const gh of s.ghosts) {
              if (gh.frames.length === 0) continue;
              const gfi = gf2 % gh.frames.length;
              if (dist(gh.frames[gfi].x, gh.frames[gfi].y, e.x, e.y) < 100) crossfireBonus++;
            }
          }
          const totalDmg = b.damage + (crossfireBonus > 1 ? crossfireBonus - 1 : 0);
          e.hp -= totalDmg; e.flashTimer = 0.08;
          spawnParticles(s, e.x, e.y, 3 + crossfireBonus, b.color);
          if (crossfireBonus > 1) {
            spawnFloatingText(s, e.x, e.y - 15, `CROSSFIRE x${crossfireBonus}!`, B.COLOR_LOOP);
          }
          if (e.hp <= 0) {
            killEnemy(s, e);
            if (b.fromGhost) {
              s.ghostKills++;
              spawnFloatingText(s, e.x, e.y - 22, "GHOST ASSIST!", b.color);
            }
          }
          s.bullets.splice(i, 1); break;
        }
      }
    } else {
      if (dist(b.x, b.y, s.px, s.py) < b.radius + B.PLAYER_RADIUS && s.invincibleTimer <= 0) {
        damagePlayer(s, b.damage);
        s.bullets.splice(i, 1);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Damage
// ---------------------------------------------------------------------------

function damagePlayer(s: EchoState, dmg: number): void {
  if (s.invincibleTimer > 0) return;
  s.hp -= dmg; s.invincibleTimer = B.PLAYER_INVINCIBLE;
  s.screenShake = B.SHAKE_DURATION; s.screenFlashColor = B.COLOR_DANGER; s.screenFlashTimer = B.FLASH_DURATION;
  spawnParticles(s, s.px, s.py, 10, B.COLOR_DANGER);
  if (s.hp <= 0) { s.phase = EchoPhase.DEAD; spawnParticles(s, s.px, s.py, 25, B.COLOR_PLAYER); }
}

function killEnemy(s: EchoState, e: EchoEnemy): void {
  if (!e.alive) return;
  e.alive = false; e.deathTimer = 0.3; s.totalKills++;
  const baseScore = e.isBoss ? B.BOSS_SCORE : B.ENEMY_SCORE;
  const comboMult = 1 + Math.min(s.combo, 10) * 0.1;
  const pts = Math.floor(baseScore * comboMult * e.tier);
  s.score += pts; s.combo++; s.comboTimer = B.COMBO_WINDOW;
  if (s.combo > s.bestCombo) s.bestCombo = s.combo;
  spawnFloatingText(s, e.x, e.y - 8, `+${pts}`, s.combo > 3 ? B.COLOR_COMBO : B.COLOR_TEXT);
  // Boss kill
  if (e.isBoss) {
    s.bossAlive = false;
    s.screenShake = 0.4; s.screenFlashColor = B.COLOR_GOLD; s.screenFlashTimer = B.FLASH_DURATION * 3;
    spawnParticles(s, e.x, e.y, 25, B.COLOR_GOLD);
    spawnFloatingText(s, e.x, e.y - 20, "GUARDIAN SLAIN!", B.COLOR_GOLD);
    s.hp = Math.min(s.maxHp, s.hp + 2); // heal on boss kill
  }
  spawnParticles(s, e.x, e.y, 8, e.color);
}

// ---------------------------------------------------------------------------
// Timers, particles
// ---------------------------------------------------------------------------

export function updateTimers(s: EchoState, dt: number): void {
  s.time += dt;
  if (s.screenShake > 0) s.screenShake -= dt;
  if (s.screenFlashTimer > 0) s.screenFlashTimer -= dt;
  if (s.invincibleTimer > 0) s.invincibleTimer -= dt;
  if (s.shootCooldown > 0) s.shootCooldown -= dt;
  if (s.comboTimer > 0) { s.comboTimer -= dt; if (s.comboTimer <= 0) s.combo = 0; }
  if (s.timeStopActive > 0) s.timeStopActive -= dt;
  if (s.timeStopCooldown > 0) s.timeStopCooldown -= dt;
  // Time pressure (last 3 seconds of loop)
  const timeLeft = s.loopDuration - s.loopTimer;
  s.timePressure = timeLeft < 3 && s.phase === EchoPhase.RECORDING ? 1 - timeLeft / 3 : 0;
  // Intensity (based on alive enemy count)
  const aliveCount = s.enemies.filter(e => e.alive).length;
  s.intensity = Math.min(1, aliveCount / 12);
}

export function updateParticles(s: EchoState, dt: number): void {
  for (let i = s.particles.length - 1; i >= 0; i--) {
    const p = s.particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.97; p.vy *= 0.97; p.life -= dt;
    if (p.life <= 0) s.particles.splice(i, 1);
  }
}

export function updateFloatingTexts(s: EchoState, dt: number): void {
  for (let i = s.floatingTexts.length - 1; i >= 0; i--) {
    s.floatingTexts[i].y -= dt * 35; s.floatingTexts[i].life -= dt;
    if (s.floatingTexts[i].life <= 0) s.floatingTexts.splice(i, 1);
  }
}

export function spawnParticles(s: EchoState, x: number, y: number, count: number, color: number): void {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2, sp = 30 + Math.random() * 100;
    s.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: B.PARTICLE_LIFETIME + Math.random() * 0.3, maxLife: B.PARTICLE_LIFETIME + 0.3,
      color, size: 1.5 + Math.random() * 2.5 });
  }
}

export function spawnFloatingText(s: EchoState, x: number, y: number, text: string, color: number): void {
  s.floatingTexts.push({ x, y, text, color, life: 1.5, maxLife: 1.5 });
}

// ---------------------------------------------------------------------------
// Loop upgrade system
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Time stop ability (requires 3+ ghosts)
// ---------------------------------------------------------------------------

export function tryTimeStop(s: EchoState): boolean {
  if (s.phase !== EchoPhase.RECORDING || s.ghosts.length < 3 || s.timeStopCooldown > 0 || s.timeStopActive > 0) return false;
  s.timeStopActive = B.TIME_STOP_DURATION;
  s.timeStopCooldown = B.TIME_STOP_COOLDOWN;
  s.screenShake = 0.15;
  s.screenFlashColor = B.COLOR_TIMER;
  s.screenFlashTimer = B.FLASH_DURATION * 2;
  spawnParticles(s, s.px, s.py, 20, B.COLOR_TIMER);
  spawnFloatingText(s, s.px, s.py - 25, "TIME STOP!", B.COLOR_TIMER);
  return true;
}

export function applyLoopUpgrade(s: EchoState, choice: number): void {
  switch (choice) {
    case 0: s.upgradeFireRate++; spawnFloatingText(s, s.arenaW / 2, s.arenaH / 2, "+FIRE RATE", B.COLOR_PLAYER); break;
    case 1: s.upgradeBulletSize++; spawnFloatingText(s, s.arenaW / 2, s.arenaH / 2, "+BULLET POWER", B.COLOR_LOOP); break;
    case 2: s.upgradeSpeed++; spawnFloatingText(s, s.arenaW / 2, s.arenaH / 2, "+MOVE SPEED", B.COLOR_SUCCESS); break;
    case 3:
      s.upgradeMaxHp++;
      s.maxHp = B.PLAYER_HP + s.upgradeMaxHp * B.UPGRADE_MAX_HP;
      s.hp = Math.min(s.maxHp, s.hp + B.UPGRADE_MAX_HP);
      spawnFloatingText(s, s.arenaW / 2, s.arenaH / 2, "+MAX HP", B.COLOR_HP);
      break;
  }
  s.screenFlashColor = B.COLOR_LOOP; s.screenFlashTimer = B.FLASH_DURATION;
}
