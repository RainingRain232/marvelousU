// ---------------------------------------------------------------------------
// Siege mode — combat, waves, tower targeting
// ---------------------------------------------------------------------------

import type { SiegeState, Enemy, Projectile } from "../state/SiegeState";
import { SiegePhase, spawnEnemy } from "../state/SiegeState";
import { SiegeConfig, TOWERS, ENEMIES, WAVES, type TowerType } from "../config/SiegeConfig";

const T = SiegeConfig.TILE_SIZE;

export function placeTower(state: SiegeState, type: TowerType, col: number, row: number): boolean {
  if (col < 0 || col >= SiegeConfig.GRID_COLS || row < 0 || row >= SiegeConfig.GRID_ROWS) return false;
  const cell = state.grid[row][col];
  if (cell.type !== "buildable" || cell.towerId) return false;
  const def = TOWERS[type];
  if (state.gold < def.cost) return false;

  state.gold -= def.cost;
  const id = `tower_${state.towerIdCounter++}`;
  cell.towerId = id;
  state.towers.push({ id, type, x: col, y: row, cooldown: 0, kills: 0, level: 1 });
  return true;
}

export function sellTower(state: SiegeState, towerId: string): void {
  const idx = state.towers.findIndex(t => t.id === towerId);
  if (idx < 0) return;
  const tower = state.towers[idx];
  const def = TOWERS[tower.type];
  state.gold += Math.floor(def.cost * SiegeConfig.SELL_REFUND);
  state.grid[tower.y][tower.x].towerId = null;
  state.towers.splice(idx, 1);
}

export function startWave(state: SiegeState): void {
  if (state.wave >= WAVES.length) { state.phase = SiegePhase.VICTORY; return; }
  const wave = WAVES[state.wave];
  state.phase = SiegePhase.WAVE;
  state.spawnQueue = [];
  let delay = 0;
  for (const group of wave.enemies) {
    for (let i = 0; i < group.count; i++) {
      state.spawnQueue.push({ type: group.type, delay });
      delay += group.interval;
    }
  }
  state.spawnTimer = 0;
  state.announcements.push({ text: `Wave ${state.wave + 1}`, color: 0xff6644, timer: 2 });
}

export function updateSiege(state: SiegeState, dt: number): void {
  state.elapsedTime += dt;

  if (state.phase === SiegePhase.BUILDING) {
    state.waveTimer -= dt;
    if (state.waveTimer <= 0) startWave(state);
    updateParticles(state, dt);
    return;
  }

  if (state.phase !== SiegePhase.WAVE) return;

  // Spawn enemies from queue
  state.spawnTimer += dt;
  while (state.spawnQueue.length > 0 && state.spawnTimer >= state.spawnQueue[0].delay) {
    const next = state.spawnQueue.shift()!;
    spawnEnemy(state, next.type);
  }

  // Move enemies along path
  for (const enemy of state.enemies) {
    if (!enemy.alive || enemy.reachedEnd) continue;

    let speed = enemy.speed;
    if (enemy.slowTimer > 0) { speed *= (1 - enemy.slowAmount); enemy.slowTimer -= dt; }

    const target = state.path[enemy.pathIndex + 1];
    if (!target) { enemy.reachedEnd = true; state.lives--; continue; }

    const tx = target.x * T + T / 2, ty = target.y * T + T / 2;
    const dx = tx - enemy.x, dy = ty - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const step = speed * T * dt;

    if (dist <= step) {
      enemy.x = tx; enemy.y = ty;
      enemy.pathIndex++;
    } else {
      enemy.x += (dx / dist) * step;
      enemy.y += (dy / dist) * step;
    }
  }

  // Tower targeting & firing
  for (const tower of state.towers) {
    tower.cooldown -= dt;
    if (tower.cooldown > 0) continue;

    const def = TOWERS[tower.type];
    const tcx = tower.x * T + T / 2, tcy = tower.y * T + T / 2;
    const range = def.range * T;

    // Find closest alive enemy in range
    let closest: Enemy | null = null, closestDist = Infinity;
    for (const enemy of state.enemies) {
      if (!enemy.alive || enemy.reachedEnd) continue;
      const dx = enemy.x - tcx, dy = enemy.y - tcy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d <= range && d < closestDist) { closest = enemy; closestDist = d; }
    }

    if (closest) {
      // Level-up bonus: +20% damage per level
      const levelMult = 1 + (tower.level - 1) * 0.2;
      tower.cooldown = 1 / (def.fireRate * (1 + (tower.level - 1) * 0.1)); // faster at higher levels
      state.projectiles.push({
        x: tcx, y: tcy,
        targetId: closest.id,
        damage: Math.floor(def.damage * levelMult),
        speed: def.projectileSpeed * T,
        color: def.projectileColor,
        splashRadius: def.splashRadius * T,
        slowAmount: def.slowAmount,
        slowDuration: def.slowDuration,
        towerId: tower.id,
      });
    }
  }

  // Move projectiles
  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const proj = state.projectiles[i];
    const target = state.enemies.find(e => e.id === proj.targetId && e.alive);
    if (!target) { state.projectiles.splice(i, 1); continue; }

    const dx = target.x - proj.x, dy = target.y - proj.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const step = proj.speed * dt;

    if (dist <= step) {
      // Hit!
      applyDamage(state, target, proj);
      // Splash damage
      if (proj.splashRadius > 0) {
        for (const enemy of state.enemies) {
          if (enemy === target || !enemy.alive) continue;
          const sdx = enemy.x - target.x, sdy = enemy.y - target.y;
          if (sdx * sdx + sdy * sdy <= proj.splashRadius * proj.splashRadius) {
            applyDamage(state, enemy, proj, 0.5);
          }
        }
      }
      // Particle burst
      for (let pi = 0; pi < 4; pi++) {
        state.particles.push({
          x: target.x, y: target.y,
          vx: (Math.random() - 0.5) * 60, vy: -30 - Math.random() * 30,
          life: 0.3 + Math.random() * 0.2, maxLife: 0.5,
          color: proj.color, size: 2 + Math.random(),
        });
      }
      state.projectiles.splice(i, 1);
    } else {
      proj.x += (dx / dist) * step;
      proj.y += (dy / dist) * step;
    }
  }

  // Clean dead enemies
  for (const enemy of state.enemies) {
    if (enemy.reachedEnd && enemy.alive) { enemy.alive = false; }
  }

  // Check wave complete
  const allDone = state.spawnQueue.length === 0 && state.enemies.every(e => !e.alive || e.reachedEnd);
  if (allDone) {
    const wave = WAVES[state.wave];
    state.gold += wave.bonusGold;
    state.score += wave.bonusGold;
    state.wave++;
    state.announcements.push({ text: `Wave complete! +${wave.bonusGold}g`, color: 0x44ff44, timer: 2 });

    if (state.wave >= WAVES.length) {
      state.phase = SiegePhase.VICTORY;
      state.announcements.push({ text: "\u2726 VICTORY! Castle defended! \u2726", color: 0xffd700, timer: 4 });
    } else {
      state.phase = SiegePhase.BUILDING;
      state.waveTimer = SiegeConfig.WAVE_DELAY;
      state.enemies = [];
      state.projectiles = [];
    }
  }

  // Check defeat
  if (state.lives <= 0) {
    state.phase = SiegePhase.DEFEAT;
    state.announcements.push({ text: "\u2620 CASTLE FALLEN! \u2620", color: 0xff4444, timer: 4 });
  }

  updateParticles(state, dt);
}

function applyDamage(state: SiegeState, enemy: Enemy, proj: Projectile, mult = 1): void {
  const dmg = Math.max(1, proj.damage * mult - enemy.armor);
  enemy.hp -= dmg;
  if (proj.slowAmount > 0) { enemy.slowTimer = proj.slowDuration; enemy.slowAmount = proj.slowAmount; }
  if (enemy.hp <= 0 && enemy.alive) {
    enemy.alive = false;
    const def = ENEMIES[enemy.type];
    state.gold += def.reward;
    state.score += def.reward;
    state.totalKills++;
    // Credit kill to tower and check for level-up
    const tower = state.towers.find(t => t.id === proj.towerId);
    if (tower) {
      tower.kills++;
      const killsNeeded = tower.level * 5; // 5, 10, 15... kills per level
      if (tower.kills >= killsNeeded && tower.level < 5) {
        tower.level++;
        tower.kills = 0;
        state.announcements.push({ text: `${TOWERS[tower.type].name} Lv${tower.level}!`, color: 0xffd700, timer: 1.5 });
      }
    }
    // Death particles
    for (let i = 0; i < 6; i++) {
      state.particles.push({
        x: enemy.x, y: enemy.y,
        vx: (Math.random() - 0.5) * 80, vy: -40 - Math.random() * 40,
        life: 0.4 + Math.random() * 0.3, maxLife: 0.7,
        color: def.color, size: 2 + Math.random() * 2,
      });
    }
  }
}

function updateParticles(state: SiegeState, dt: number): void {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 60 * dt;
    p.life -= dt;
    if (p.life <= 0) state.particles.splice(i, 1);
  }
  for (let i = state.announcements.length - 1; i >= 0; i--) {
    state.announcements[i].timer -= dt;
    if (state.announcements[i].timer <= 0) state.announcements.splice(i, 1);
  }
}
