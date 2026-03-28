// ---------------------------------------------------------------------------
// Rampart — game systems (towers, enemies, waves, projectiles, combat)
// ---------------------------------------------------------------------------

import { RAMPART, TOWER_DEFS, ENEMY_DEFS, getWaveComposition } from "../config/RampartConfig";
import type { TowerDef } from "../config/RampartConfig";
import type {
  RampartState, RampartEnemy, RampartTower, RampartProjectile,
  TargetMode,
} from "../state/RampartState";

const CS = RAMPART.CELL_SIZE;

// ---------------------------------------------------------------------------
// Tower placement
// ---------------------------------------------------------------------------

export function canPlaceTower(state: RampartState, col: number, row: number): boolean {
  if (col < 0 || col >= RAMPART.GRID_COLS || row < 0 || row >= RAMPART.GRID_ROWS) return false;
  return state.grid[row][col] === 0;
}

export function placeTower(state: RampartState, defId: string, col: number, row: number): boolean {
  const def = TOWER_DEFS[defId];
  if (!def) return false;
  if (!canPlaceTower(state, col, row)) return false;
  if (state.gold < def.cost) return false;

  state.gold -= def.cost;
  state.grid[row][col] = 2;

  const tower: RampartTower = {
    id: state.nextTowerId++,
    def,
    col,
    row,
    x: col * CS + CS / 2,
    z: row * CS + CS / 2,
    y: getTerrainHeight(row),
    cooldown: 0,
    kills: 0,
    totalDamage: 0,
    level: 1,
    targetMode: "first",
    muzzleFlash: 0,
  };

  state.towers.push(tower);
  state.audioBuild = true;
  return true;
}

export function sellTower(state: RampartState, towerId: number): boolean {
  const idx = state.towers.findIndex(t => t.id === towerId);
  if (idx < 0) return false;
  const tower = state.towers[idx];
  state.gold += getTowerSellValue(tower);
  state.grid[tower.row][tower.col] = 0;
  state.towers.splice(idx, 1);
  if (state.selectedPlacedTower === towerId) state.selectedPlacedTower = null;
  state.audioSell = true;
  return true;
}

export function getTowerSellValue(tower: RampartTower): number {
  const baseCost = tower.def.cost;
  const upgradeCost = getUpgradeTotalSpent(tower);
  return Math.floor((baseCost + upgradeCost) * RAMPART.SELL_REFUND_RATIO);
}

function getUpgradeTotalSpent(tower: RampartTower): number {
  let total = 0;
  for (let lvl = 1; lvl < tower.level; lvl++) {
    total += Math.floor(tower.def.cost * RAMPART.UPGRADE_COST_MULT * lvl);
  }
  return total;
}

export function getUpgradeCost(tower: RampartTower): number {
  return Math.floor(tower.def.cost * RAMPART.UPGRADE_COST_MULT * tower.level);
}

export function canUpgradeTower(state: RampartState, towerId: number): boolean {
  const tower = state.towers.find(t => t.id === towerId);
  if (!tower) return false;
  if (tower.level >= RAMPART.MAX_TOWER_LEVEL) return false;
  return state.gold >= getUpgradeCost(tower);
}

export function upgradeTower(state: RampartState, towerId: number): boolean {
  const tower = state.towers.find(t => t.id === towerId);
  if (!tower) return false;
  if (tower.level >= RAMPART.MAX_TOWER_LEVEL) return false;
  const cost = getUpgradeCost(tower);
  if (state.gold < cost) return false;
  state.gold -= cost;
  tower.level++;
  state.audioUpgrade = true;
  return true;
}

const TARGET_MODES: TargetMode[] = ["first", "strongest", "weakest", "closest"];

export function cycleTowerTargetMode(tower: RampartTower): void {
  const idx = TARGET_MODES.indexOf(tower.targetMode);
  tower.targetMode = TARGET_MODES[(idx + 1) % TARGET_MODES.length];
}

export function getTowerEffectiveDamage(tower: RampartTower): number {
  return tower.def.damage * (1 + (tower.level - 1) * RAMPART.UPGRADE_DAMAGE_MULT);
}

export function getTowerEffectiveRange(tower: RampartTower): number {
  return tower.def.range * (1 + (tower.level - 1) * RAMPART.UPGRADE_RANGE_MULT);
}

export function getTowerEffectiveFireRate(tower: RampartTower): number {
  return tower.def.fireRate * (1 + (tower.level - 1) * RAMPART.UPGRADE_FIRE_RATE_MULT);
}

// ---------------------------------------------------------------------------
// Terrain height
// ---------------------------------------------------------------------------

export function getTerrainHeight(row: number): number {
  // Higher at the top (castle) lower at bottom (spawn)
  const t = 1 - row / RAMPART.GRID_ROWS;
  return t * RAMPART.GRID_ROWS * RAMPART.TERRAIN_HEIGHT_SCALE;
}

// ---------------------------------------------------------------------------
// Wave management
// ---------------------------------------------------------------------------

export function startWave(state: RampartState): void {
  state.wave++;
  state.waveActive = true;
  state.audioWaveStart = true;

  const composition = getWaveComposition(state.wave);
  const queue: string[] = [];
  for (const entry of composition) {
    for (let i = 0; i < entry.count; i++) {
      queue.push(entry.enemyId);
    }
  }
  // Shuffle spawn order slightly
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }

  state.spawnQueue = queue;
  state.spawnTimer = 0;
}

export function updateWaveTimer(state: RampartState, dt: number): void {
  if (state.phase !== "prep" && state.phase !== "wave") return;

  if (state.phase === "prep") {
    state.waveTimer -= dt;
    if (state.waveTimer <= 0) {
      state.phase = "wave";
      startWave(state);
    }
    return;
  }

  // Spawning
  if (state.spawnQueue.length > 0) {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      spawnEnemy(state, state.spawnQueue.shift()!);
      state.spawnTimer = RAMPART.SPAWN_INTERVAL;
    }
  }

  // Check wave completion
  if (state.spawnQueue.length === 0 && state.enemiesAlive <= 0) {
    if (state.wave >= RAMPART.MAX_WAVES) {
      state.phase = "victory";
    } else {
      state.phase = "prep";
      state.waveTimer = RAMPART.WAVE_PREP_TIME;
      // Bonus gold between waves
      const bonus = 25 + state.wave * 5;
      state.gold += bonus;
      state.waveClearMessage = `Wave ${state.wave} cleared!  +${bonus}g bonus`;
      state.waveClearTimer = 3;
    }
  }

  // Decay wave clear message
  if (state.waveClearTimer > 0) {
    state.waveClearTimer -= dt;
  }
}

// ---------------------------------------------------------------------------
// Enemy spawning & movement
// ---------------------------------------------------------------------------

function spawnEnemy(state: RampartState, defId: string): void {
  const def = ENEMY_DEFS[defId];
  if (!def) return;

  const spawnNode = state.path[0];
  const waveScale = 1 + (state.wave - 1) * 0.08;

  const hpMult = state.difficulty.hpMult;
  const scaledHp = Math.floor(def.hp * waveScale * hpMult);

  const enemy: RampartEnemy = {
    id: state.nextEnemyId++,
    def,
    x: spawnNode.x + (Math.random() - 0.5) * 2,
    y: getTerrainHeight(spawnNode.row),
    z: spawnNode.z + (Math.random() - 0.5) * 2,
    hp: scaledHp,
    maxHp: scaledHp,
    speed: def.speed,
    slowTimer: 0,
    slowFactor: 1,
    alive: true,
    pathIndex: 0,
    reachedEnd: false,
    armor: def.armor,
  };

  state.enemies.push(enemy);
  state.enemiesAlive++;
}

export function updateEnemies(state: RampartState, dt: number): void {
  for (const enemy of state.enemies) {
    if (!enemy.alive) continue;

    // Slow effect
    if (enemy.slowTimer > 0) {
      enemy.slowTimer -= dt;
    } else {
      enemy.slowFactor = 1;
    }

    // Move along path
    if (enemy.pathIndex < state.path.length) {
      const target = state.path[enemy.pathIndex];
      const dx = target.x - enemy.x;
      const dz = target.z - enemy.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      const moveSpeed = enemy.speed * enemy.slowFactor * dt;

      if (dist < moveSpeed + 0.5) {
        enemy.pathIndex++;
        if (enemy.pathIndex >= state.path.length) {
          // Reached castle
          enemy.reachedEnd = true;
          enemy.alive = false;
          state.enemiesAlive--;
          state.castleHp -= enemy.def.damage;
          state.audioCastleDamage = true;
          state.camShake = Math.min(1, enemy.def.damage / 20); // proportional shake

          // Spawn impact particles at castle
          for (let i = 0; i < 8; i++) {
            state.particles.push({
              x: enemy.x,
              y: enemy.y + 2,
              z: enemy.z,
              vx: (Math.random() - 0.5) * 6,
              vy: Math.random() * 4,
              vz: (Math.random() - 0.5) * 6,
              life: 1,
              maxLife: 1,
              color: 0xff4400,
              size: 0.3,
            });
          }

          if (state.castleHp <= 0) {
            state.castleHp = 0;
            state.phase = "gameover";
          }
        }
      } else {
        enemy.x += (dx / dist) * moveSpeed;
        enemy.z += (dz / dist) * moveSpeed;
      }

      // Update Y to match terrain
      const rowEstimate = Math.floor(enemy.z / CS);
      enemy.y = getTerrainHeight(Math.max(0, Math.min(RAMPART.GRID_ROWS - 1, rowEstimate)));
    }
  }
}

// ---------------------------------------------------------------------------
// Tower targeting & shooting
// ---------------------------------------------------------------------------

export function updateTowers(state: RampartState, dt: number): void {
  for (const tower of state.towers) {
    tower.cooldown -= dt;
    if (tower.cooldown > 0) continue;

    const effectiveRange = getTowerEffectiveRange(tower);
    const rangeSq = effectiveRange * effectiveRange;

    // Collect enemies in range
    let bestEnemy: RampartEnemy | null = null;
    let bestScore = -Infinity;

    for (const enemy of state.enemies) {
      if (!enemy.alive) continue;
      const dx = tower.x - enemy.x;
      const dz = tower.z - enemy.z;
      const distSq = dx * dx + dz * dz;
      if (distSq > rangeSq) continue;

      let score: number;
      switch (tower.targetMode) {
        case "first":
          score = enemy.pathIndex;  // closest to castle
          break;
        case "strongest":
          score = enemy.hp;
          break;
        case "weakest":
          score = -enemy.hp;
          break;
        case "closest":
          score = -distSq;  // closest to tower
          break;
      }

      if (score > bestScore) {
        bestScore = score;
        bestEnemy = enemy;
      }
    }

    if (bestEnemy) {
      fireProjectile(state, tower, bestEnemy);
      tower.cooldown = 1 / getTowerEffectiveFireRate(tower);
      tower.muzzleFlash = 0.12;
    }

    // Decay muzzle flash
    if (tower.muzzleFlash > 0) tower.muzzleFlash -= dt;
  }
}

function fireProjectile(state: RampartState, tower: RampartTower, target: RampartEnemy): void {
  const speed = tower.def.id === "catapult" ? RAMPART.BOULDER_SPEED
    : tower.def.id === "mage" || tower.def.id === "flame" ? RAMPART.MAGIC_BOLT_SPEED
    : RAMPART.ARROW_SPEED;

  const proj: RampartProjectile = {
    id: state.nextProjectileId++,
    x: tower.x,
    y: tower.y + tower.def.height,
    z: tower.z,
    targetId: target.id,
    towerId: tower.id,
    tx: target.x,
    ty: target.y + 1,
    tz: target.z,
    speed,
    damage: Math.floor(getTowerEffectiveDamage(tower)),
    color: tower.def.projectileColor,
    splash: tower.def.splash,
    slowAmount: tower.def.slowAmount,
    alive: true,
  };

  state.projectiles.push(proj);
  state.audioShoot = true;
}

// ---------------------------------------------------------------------------
// Projectile movement & impact
// ---------------------------------------------------------------------------

export function updateProjectiles(state: RampartState, dt: number): void {
  for (const proj of state.projectiles) {
    if (!proj.alive) continue;

    // Update target position if target still alive
    const target = state.enemies.find(e => e.id === proj.targetId);
    if (target && target.alive) {
      proj.tx = target.x;
      proj.ty = target.y + 1;
      proj.tz = target.z;
    }

    const dx = proj.tx - proj.x;
    const dy = proj.ty - proj.y;
    const dz = proj.tz - proj.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (dist < 1) {
      // Impact
      proj.alive = false;

      if (proj.splash > 0) {
        // AoE damage
        for (const enemy of state.enemies) {
          if (!enemy.alive) continue;
          const ex = proj.tx - enemy.x;
          const ez = proj.tz - enemy.z;
          if (ex * ex + ez * ez < proj.splash * proj.splash) {
            applyDamage(state, enemy, proj.damage, proj.slowAmount, proj.towerId);
          }
        }
        // AoE explosion ring
        state.explosions.push({
          x: proj.tx,
          y: proj.ty - 0.5,
          z: proj.tz,
          radius: proj.splash,
          life: 0.5,
          maxLife: 0.5,
          color: proj.color,
        });

        // AoE particles
        for (let i = 0; i < 12; i++) {
          state.particles.push({
            x: proj.tx,
            y: proj.ty,
            z: proj.tz,
            vx: (Math.random() - 0.5) * 8,
            vy: Math.random() * 6,
            vz: (Math.random() - 0.5) * 8,
            life: 0.8,
            maxLife: 0.8,
            color: proj.color,
            size: 0.3,
          });
        }
      } else {
        // Single target
        if (target && target.alive) {
          applyDamage(state, target, proj.damage, proj.slowAmount, proj.towerId);
        }
        // Hit particles
        for (let i = 0; i < 4; i++) {
          state.particles.push({
            x: proj.tx,
            y: proj.ty,
            z: proj.tz,
            vx: (Math.random() - 0.5) * 4,
            vy: Math.random() * 3,
            vz: (Math.random() - 0.5) * 4,
            life: 0.5,
            maxLife: 0.5,
            color: proj.color,
            size: 0.15,
          });
        }
      }

      state.audioHit = true;
    } else {
      const move = proj.speed * dt;
      proj.x += (dx / dist) * move;
      proj.y += (dy / dist) * move;
      proj.z += (dz / dist) * move;

      // Projectile trail particles (every few frames for perf)
      if (state.tick % 3 === 0) {
        state.particles.push({
          x: proj.x,
          y: proj.y,
          z: proj.z,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          vz: (Math.random() - 0.5) * 0.5,
          life: 0.3,
          maxLife: 0.3,
          color: proj.color,
          size: proj.splash > 0 ? 0.15 : 0.08,
        });
      }
    }
  }

  // Cleanup dead projectiles
  state.projectiles = state.projectiles.filter(p => p.alive);
}

function applyDamage(state: RampartState, enemy: RampartEnemy, damage: number, slowAmount: number, towerId: number): void {
  const effectiveDamage = Math.max(1, damage - enemy.armor);
  enemy.hp -= effectiveDamage;

  // Track damage on source tower
  const srcTower = state.towers.find(t => t.id === towerId);
  if (srcTower) srcTower.totalDamage += effectiveDamage;

  // Color-coded damage numbers
  let dmgColor = 0xffffff;
  if (enemy.armor >= damage) {
    dmgColor = 0x888888; // heavily blocked — grey
  } else if (slowAmount > 0) {
    dmgColor = 0x66aaff; // magic/slow — blue
  } else if (effectiveDamage >= 30) {
    dmgColor = 0xff6644; // big hit — orange-red
  } else if (effectiveDamage >= 15) {
    dmgColor = 0xffcc00; // medium hit — gold
  }

  // Damage number
  state.damageNumbers.push({
    x: enemy.x + (Math.random() - 0.5) * 0.6,
    y: enemy.y + 2.5,
    z: enemy.z + (Math.random() - 0.5) * 0.6,
    value: effectiveDamage,
    life: 1,
    color: dmgColor,
  });

  // Slow
  if (slowAmount > 0) {
    enemy.slowFactor = 1 - slowAmount;
    enemy.slowTimer = 2;
  }

  if (enemy.hp <= 0) {
    enemy.alive = false;
    state.enemiesAlive--;
    const goldReward = Math.floor(enemy.def.goldReward * state.difficulty.goldMult);
    state.gold += goldReward;
    state.score += goldReward * 2;
    state.totalKills++;
    state.audioKill = true;
    if (srcTower) srcTower.kills++;

    // Gold reward floating number
    state.damageNumbers.push({
      x: enemy.x,
      y: enemy.y + 3.5,
      z: enemy.z,
      value: -goldReward, // negative = gold display
      life: 1.5,
      color: 0xffd700,
    });

    // Death particles
    for (let i = 0; i < 10; i++) {
      state.particles.push({
        x: enemy.x,
        y: enemy.y + 1,
        z: enemy.z,
        vx: (Math.random() - 0.5) * 5,
        vy: Math.random() * 5 + 1,
        vz: (Math.random() - 0.5) * 5,
        life: 1.2,
        maxLife: 1.2,
        color: enemy.def.color,
        size: 0.25,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Particles & damage numbers
// ---------------------------------------------------------------------------

export function updateParticles(state: RampartState, dt: number): void {
  for (const p of state.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
    p.vy -= 9.8 * dt;
    p.life -= dt;
  }
  state.particles = state.particles.filter(p => p.life > 0);

  // Decay explosions
  for (const e of state.explosions) {
    e.life -= dt;
  }
  state.explosions = state.explosions.filter(e => e.life > 0);

  // Decay camera shake
  if (state.camShake > 0) {
    state.camShake *= Math.max(0, 1 - dt * 5);
    if (state.camShake < 0.01) state.camShake = 0;
  }
}

export function updateDamageNumbers(state: RampartState, dt: number): void {
  for (const d of state.damageNumbers) {
    d.y += 2 * dt;
    d.life -= dt;
  }
  state.damageNumbers = state.damageNumbers.filter(d => d.life > 0);
}

// ---------------------------------------------------------------------------
// Cleanup dead entities
// ---------------------------------------------------------------------------

export function cleanupDead(state: RampartState): void {
  state.enemies = state.enemies.filter(e => e.alive || e.reachedEnd);
  // Remove reached-end enemies fully
  state.enemies = state.enemies.filter(e => e.alive);
}

// ---------------------------------------------------------------------------
// Start game
// ---------------------------------------------------------------------------

export function startGame(state: RampartState): void {
  state.phase = "prep";
  state.waveTimer = RAMPART.FIRST_WAVE_DELAY;
  state.gold = state.difficulty.startGold;
}
