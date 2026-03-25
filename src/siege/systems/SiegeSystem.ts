// ---------------------------------------------------------------------------
// Siege mode — combat, waves, tower targeting
// ---------------------------------------------------------------------------

import type { SiegeState, Enemy, Projectile } from "../state/SiegeState";
import { SiegePhase, spawnEnemy } from "../state/SiegeState";
import { SiegeConfig, TOWERS, ENEMIES, WAVES, TOWER_EFFECTIVENESS, TOWER_ABILITIES, type TowerType, type WaveModifier, WAVE_MODIFIER_DEFS, TILE_SZ } from "../config/SiegeConfig";

export function placeTower(state: SiegeState, type: TowerType, col: number, row: number): boolean {
  if (col < 0 || col >= SiegeConfig.GRID_COLS || row < 0 || row >= SiegeConfig.GRID_ROWS) return false;
  const cell = state.grid[row][col];
  if (cell.type !== "buildable" || cell.towerId) return false;
  const def = TOWERS[type];
  if (state.gold < def.cost) return false;

  state.gold -= def.cost;
  const id = `tower_${state.towerIdCounter++}`;
  cell.towerId = id;
  state.towers.push({ id, type, x: col, y: row, cooldown: 0, kills: 0, level: 1, targetPriority: "closest", totalInvested: def.cost });
  return true;
}

export function sellTower(state: SiegeState, towerId: string): void {
  const idx = state.towers.findIndex(t => t.id === towerId);
  if (idx < 0) return;
  const tower = state.towers[idx];
  state.gold += Math.floor(tower.totalInvested * SiegeConfig.SELL_REFUND);
  state.grid[tower.y][tower.x].towerId = null;
  state.towers.splice(idx, 1);
}

export function startWave(state: SiegeState): void {
  if (state.wave >= WAVES.length) { state.phase = SiegePhase.VICTORY; return; }
  const wave = WAVES[state.wave];
  state.phase = SiegePhase.WAVE;

  // Pick random wave modifier (30% chance after wave 2)
  const modPool: WaveModifier[] = ["none", "none", "fast", "armored", "horde", "rich", "regen", "shielded"];
  if (state.wave >= 5) modPool.push("boss_rush");
  state.waveModifier = state.wave >= 2 && Math.random() < 0.4 ? modPool[Math.floor(Math.random() * modPool.length)] : "none";

  state.spawnQueue = [];
  let delay = 0;
  const hordeMultiplier = state.waveModifier === "horde" ? 1.5 : 1;
  for (const group of wave.enemies) {
    const count = Math.ceil(group.count * hordeMultiplier);
    for (let i = 0; i < count; i++) {
      state.spawnQueue.push({ type: group.type, delay });
      delay += group.interval;
    }
  }
  state.spawnTimer = 0;

  const modDef = WAVE_MODIFIER_DEFS[state.waveModifier];
  if (state.waveModifier !== "none") {
    state.announcements.push({ text: `Wave ${state.wave + 1}: ${modDef.name}`, color: modDef.color, timer: 3 });
    state.announcements.push({ text: modDef.desc, color: modDef.color, timer: 2.5 });
  } else {
    state.announcements.push({ text: `Wave ${state.wave + 1}`, color: 0xff6644, timer: 2 });
  }
}

export function useMeteor(state: SiegeState, x: number, y: number): void {
  if (state.meteorCooldown > 0 || state.gold < 30) return;
  state.gold -= 30;
  state.meteorCooldown = 20;
  const radius = 3 * TILE_SZ;
  for (const enemy of state.enemies) {
    if (!enemy.alive) continue;
    const dx = enemy.x - x, dy = enemy.y - y;
    if (dx * dx + dy * dy <= radius * radius) {
      enemy.hp -= 50;
      if (enemy.hp <= 0) { enemy.alive = false; state.gold += ENEMIES[enemy.type].reward; state.score += ENEMIES[enemy.type].reward; state.totalKills++; }
    }
  }
  for (let pi = 0; pi < 12; pi++) {
    state.particles.push({ x, y, vx: (Math.random() - 0.5) * 120, vy: -60 - Math.random() * 60, life: 0.5 + Math.random() * 0.3, maxLife: 0.8, color: 0xff6622, size: 3 + Math.random() * 3 });
  }
  state.announcements.push({ text: "METEOR STRIKE!", color: 0xff4422, timer: 1.5 });
}

export function useFreeze(state: SiegeState): void {
  if (state.freezeTimer > 0 || state.gold < 20) return;
  state.gold -= 20;
  state.freezeTimer = 5;
  state.announcements.push({ text: "FREEZE!", color: 0x88ccff, timer: 1.5 });
}

export function useRally(state: SiegeState): void {
  if (state.rallyTimer > 0 || state.rallyCooldown > 0 || state.gold < 40) return;
  state.gold -= 40;
  state.rallyTimer = 8;
  state.rallyCooldown = 25;
  state.announcements.push({ text: "RALLY! +50% Fire Rate!", color: 0xff8800, timer: 2 });
}

export function updateSiege(state: SiegeState, dt: number): void {
  const effectiveDt = dt * state.speedMult;
  state.elapsedTime += effectiveDt;

  // Power-up timers
  if (state.freezeTimer > 0) state.freezeTimer -= effectiveDt;
  if (state.meteorCooldown > 0) state.meteorCooldown -= effectiveDt;
  if (state.rallyTimer > 0) state.rallyTimer -= effectiveDt;
  if (state.rallyCooldown > 0) state.rallyCooldown -= effectiveDt;

  if (state.phase === SiegePhase.BUILDING) {
    // Interest mechanic: earn 1% of current gold per second, capped at 10 gold/sec
    const interest = Math.min(state.gold * 0.01 * effectiveDt, 10 * effectiveDt);
    state.interestAccumulator += interest;
    if (state.interestAccumulator >= 1) {
      const earned = Math.floor(state.interestAccumulator);
      state.gold += earned;
      state.interestAccumulator -= earned;
    }

    state.waveTimer -= effectiveDt;
    if (state.waveTimer <= 0) startWave(state);
    updateParticles(state, effectiveDt);
    return;
  }

  if (state.phase !== SiegePhase.WAVE) return;

  // Spawn enemies from queue
  state.spawnTimer += effectiveDt;
  while (state.spawnQueue.length > 0 && state.spawnTimer >= state.spawnQueue[0].delay) {
    const next = state.spawnQueue.shift()!;
    spawnEnemy(state, next.type);
  }

  // Move enemies along path (frozen = skip movement)
  for (const enemy of state.enemies) {
    if (!enemy.alive || enemy.reachedEnd) continue;
    if (state.freezeTimer > 0) continue; // global freeze

    let speed = enemy.speed;
    if (enemy.slowTimer > 0) { speed *= (1 - enemy.slowAmount); enemy.slowTimer -= effectiveDt; }

    const target = state.path[enemy.pathIndex + 1];
    if (!target) { enemy.reachedEnd = true; state.lives--; continue; }

    const tx = target.x * TILE_SZ + TILE_SZ / 2, ty = target.y * TILE_SZ + TILE_SZ / 2;
    const dx = tx - enemy.x, dy = ty - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const step = speed * TILE_SZ * effectiveDt;

    if (dist <= step) {
      enemy.x = tx; enemy.y = ty;
      enemy.pathIndex++;
    } else {
      enemy.x += (dx / dist) * step;
      enemy.y += (dy / dist) * step;
    }
  }

  // Enemy abilities
  for (const enemy of state.enemies) {
    if (!enemy.alive || enemy.reachedEnd) continue;

    // Mage ability: periodically heal nearby enemies
    if (enemy.type === "mage") {
      enemy.healCooldown -= effectiveDt;
      if (enemy.healCooldown <= 0) {
        enemy.healCooldown = 3; // heal every 3 seconds
        for (const other of state.enemies) {
          if (other === enemy || !other.alive || other.reachedEnd) continue;
          const dx = other.x - enemy.x, dy = other.y - enemy.y;
          if (dx * dx + dy * dy <= (2 * TILE_SZ) * (2 * TILE_SZ)) {
            other.hp = Math.min(other.maxHp, other.hp + other.maxHp * 0.05);
          }
        }
      }
    }

    // Assassin ability: toggle invisibility periodically
    if (enemy.type === "assassin") {
      // Invisible for 2s every 5s cycle
      const cycle = state.elapsedTime % 5;
      enemy.invisible = cycle >= 3; // invisible during seconds 3-5 of cycle
    }

    // Cavalry ability: speed burst when below 50% hp
    if (enemy.type === "cavalry" && !enemy.cavalryBursted && enemy.hp < enemy.maxHp * 0.5) {
      enemy.cavalryBursted = true;
      enemy.speed *= 1.5;
    }

    // Regen wave modifier: enemies regenerate 1% HP per second
    if (state.waveModifier === "regen") {
      enemy.hp = Math.min(enemy.maxHp, enemy.hp + enemy.maxHp * 0.01 * effectiveDt);
    }
  }

  // Tower targeting & firing
  for (const tower of state.towers) {
    tower.cooldown -= effectiveDt;
    if (tower.cooldown > 0) continue;

    const def = TOWERS[tower.type];
    const tcx = tower.x * TILE_SZ + TILE_SZ / 2, tcy = tower.y * TILE_SZ + TILE_SZ / 2;
    const range = def.range * TILE_SZ;

    // Find target based on priority (skip invisible enemies)
    const inRange = state.enemies.filter(e => {
      if (!e.alive || e.reachedEnd || e.invisible) return false;
      const edx = e.x - tcx, edy = e.y - tcy;
      return edx * edx + edy * edy <= range * range;
    });
    if (inRange.length === 0) continue;

    let closest: Enemy;
    if (tower.targetPriority === "strongest") {
      closest = inRange.reduce((a, b) => a.maxHp > b.maxHp ? a : b);
    } else if (tower.targetPriority === "furthest") {
      closest = inRange.reduce((a, b) => (a as any).waypointIndex + (a as any).lap * 100 > (b as any).waypointIndex + (b as any).lap * 100 ? a : b);
    } else {
      let best = inRange[0], bestD = Infinity;
      for (const e of inRange) { const d = Math.sqrt((e.x - tcx) ** 2 + (e.y - tcy) ** 2); if (d < bestD) { bestD = d; best = e; } }
      closest = best;
    }

    {
      const levelMult = 1 + (tower.level - 1) * 0.2;
      const rallyMult = state.rallyTimer > 0 ? 1.5 : 1;
      tower.cooldown = 1 / (def.fireRate * (1 + (tower.level - 1) * 0.1) * rallyMult);
      const projDmg = Math.floor(def.damage * levelMult);
      // Cannon lv3: +50% splash radius
      const splashR = def.splashRadius * TILE_SZ * (tower.type === "cannon" && tower.level >= 3 ? 1.5 : 1);
      state.projectiles.push({
        x: tcx, y: tcy,
        targetId: closest.id,
        damage: projDmg,
        speed: def.projectileSpeed * TILE_SZ,
        color: def.projectileColor,
        splashRadius: splashR,
        slowAmount: def.slowAmount,
        slowDuration: def.slowDuration,
        towerId: tower.id,
      });
      // Arrow lv3: multishot — fire at a second target
      if (tower.type === "arrow" && tower.level >= 3 && inRange.length > 1) {
        const second = inRange.find(e => e.id !== closest.id);
        if (second) {
          state.projectiles.push({
            x: tcx, y: tcy, targetId: second.id,
            damage: Math.floor(projDmg * 0.7), speed: def.projectileSpeed * TILE_SZ,
            color: def.projectileColor, splashRadius: 0,
            slowAmount: 0, slowDuration: 0, towerId: tower.id,
          });
        }
      }
      // Lightning: chain damage to nearby enemies
      if (tower.type === "lightning" && inRange.length > 1) {
        const chainCount = tower.level >= 5 ? 4 : tower.level >= 3 ? 3 : 2;
        const chainDmgMult = tower.level >= 5 ? 0.78 : 0.6; // 60% base, 78% at lv5
        const chainedIds: string[] = [closest.id];
        let chainSource = closest;
        for (let ci = 0; ci < chainCount; ci++) {
          let bestChain: Enemy | null = null, bestDist = Infinity;
          for (const e of inRange) {
            if (chainedIds.indexOf(e.id) >= 0) continue;
            const cdx = e.x - chainSource.x, cdy = e.y - chainSource.y;
            const cd = cdx * cdx + cdy * cdy;
            if (cd < bestDist) { bestDist = cd; bestChain = e; }
          }
          if (!bestChain) break;
          chainedIds.push(bestChain.id);
          state.projectiles.push({
            x: chainSource.x, y: chainSource.y, targetId: bestChain.id,
            damage: Math.floor(projDmg * chainDmgMult), speed: def.projectileSpeed * TILE_SZ * 1.5,
            color: def.projectileColor, splashRadius: 0,
            slowAmount: 0, slowDuration: 0, towerId: tower.id,
          });
          chainSource = bestChain;
        }
      }
      // Ballista: pierce — hit enemies in a line behind the target
      if (tower.type === "ballista") {
        const pierceCount = tower.level >= 5 ? inRange.length : tower.level >= 3 ? 3 : 1;
        const pierceDmgMult = tower.level >= 5 ? 1.5 : 1;
        // Find enemies roughly in the same direction as the primary target
        const dirX = closest.x - tcx, dirY = closest.y - tcy;
        const dirLen = Math.sqrt(dirX * dirX + dirY * dirY);
        if (dirLen > 0 && pierceCount > 0) {
          const ndx = dirX / dirLen, ndy = dirY / dirLen;
          let pierced = 0;
          for (const e of inRange) {
            if (e.id === closest.id || pierced >= pierceCount) continue;
            // Check if enemy is roughly in the same direction (dot product > 0.7)
            const edx = e.x - tcx, edy = e.y - tcy;
            const elen = Math.sqrt(edx * edx + edy * edy);
            if (elen === 0) continue;
            const dot = (edx / elen) * ndx + (edy / elen) * ndy;
            if (dot > 0.7) {
              state.projectiles.push({
                x: tcx, y: tcy, targetId: e.id,
                damage: Math.floor(projDmg * pierceDmgMult * 0.8), speed: def.projectileSpeed * TILE_SZ,
                color: def.projectileColor, splashRadius: 0,
                slowAmount: 0, slowDuration: 0, towerId: tower.id,
              });
              pierced++;
            }
          }
        }
      }
    }
  }

  // Move projectiles
  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const proj = state.projectiles[i];
    const target = state.enemies.find(e => e.id === proj.targetId && e.alive);
    if (!target) { state.projectiles.splice(i, 1); continue; }

    const dx = target.x - proj.x, dy = target.y - proj.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const step = proj.speed * effectiveDt;

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

  // DoT tick (burn and poison)
  for (const enemy of state.enemies) {
    if (!enemy.alive) continue;
    // Burn tick
    if (enemy.burnTimer > 0) {
      enemy.hp -= enemy.burnDamage * effectiveDt;
      enemy.burnTimer -= effectiveDt;
      // Fire lv5 (wildfire): spread to nearby enemies
      if (enemy.burnDamage > 0) {
        for (const other of state.enemies) {
          if (other === enemy || !other.alive || other.burnTimer > 0) continue;
          const sdx = other.x - enemy.x, sdy = other.y - enemy.y;
          if (sdx * sdx + sdy * sdy < 30 * 30) {
            // Check if any fire tower is lv5
            const hasWildfire = state.towers.some(t => t.type === "fire" && t.level >= 5);
            if (hasWildfire) { other.burnTimer = 2; other.burnDamage = 2; }
          }
        }
      }
      if (enemy.hp <= 0 && enemy.alive) {
        enemy.alive = false;
        state.gold += ENEMIES[enemy.type].reward; state.score += ENEMIES[enemy.type].reward; state.totalKills++;
      }
    }
    // Poison tick
    if (enemy.poisonTimer > 0) {
      enemy.hp -= enemy.poisonDamage * effectiveDt;
      enemy.poisonTimer -= effectiveDt;
      // Poison lv5 (plague): spread to nearby
      for (const other of state.enemies) {
        if (other === enemy || !other.alive || other.poisonTimer > 0) continue;
        const sdx = other.x - enemy.x, sdy = other.y - enemy.y;
        if (sdx * sdx + sdy * sdy < 25 * 25) {
          const hasPlague = state.towers.some(t => t.type === "poison" && t.level >= 5);
          if (hasPlague) { other.poisonTimer = 2; other.poisonDamage = 1; }
        }
      }
      if (enemy.hp <= 0 && enemy.alive) {
        enemy.alive = false;
        state.gold += ENEMIES[enemy.type].reward; state.score += ENEMIES[enemy.type].reward; state.totalKills++;
      }
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
  const tower = state.towers.find(t => t.id === proj.towerId);
  const towerType = tower?.type;

  // Tower-enemy effectiveness multiplier
  let effectiveness = 1;
  if (towerType) {
    effectiveness = TOWER_EFFECTIVENESS[towerType]?.[enemy.type] ?? 1;
  }

  // Tower ability: piercing (lv5 arrow) ignores armor
  let armor = enemy.armor;
  if (towerType === "arrow" && tower && tower.level >= 5) armor = 0;

  let dmg = Math.max(1, proj.damage * mult * effectiveness - armor);

  // Shielded wave modifier: shield absorbs damage first
  if (enemy.shieldHp > 0) {
    if (dmg <= enemy.shieldHp) {
      enemy.shieldHp -= dmg;
      dmg = 0;
    } else {
      dmg -= enemy.shieldHp;
      enemy.shieldHp = 0;
    }
  }

  enemy.hp -= dmg;

  // Slow effects
  let slowAmount = proj.slowAmount;
  let slowDuration = proj.slowDuration;
  // Frost lv3: double slow duration; lv5: 80% slow
  if (towerType === "frost" && tower) {
    if (tower.level >= 3) slowDuration *= 2;
    if (tower.level >= 5) slowAmount = 0.8;
  }
  if (slowAmount > 0) { enemy.slowTimer = slowDuration; enemy.slowAmount = slowAmount; }

  // Cannon lv5: stun hit enemies for 1s
  if (towerType === "cannon" && tower && tower.level >= 5) {
    enemy.slowTimer = Math.max(enemy.slowTimer, 1);
    enemy.slowAmount = Math.max(enemy.slowAmount, 0.95);
  }

  // Fire lv3: apply burn DoT (3 damage/sec for 3s)
  if (towerType === "fire" && tower && tower.level >= 3) {
    enemy.burnTimer = 3;
    enemy.burnDamage = 3;
  }

  // Poison lv3: poison stacks (add to existing)
  if (towerType === "poison" && tower && tower.level >= 3) {
    enemy.poisonTimer = Math.max(enemy.poisonTimer, 4);
    enemy.poisonDamage += 1; // stacks!
  } else if (towerType === "poison") {
    enemy.poisonTimer = Math.max(enemy.poisonTimer, 3);
    enemy.poisonDamage = Math.max(enemy.poisonDamage, 2);
  }

  if (enemy.hp <= 0 && enemy.alive) {
    enemy.alive = false;
    const def = ENEMIES[enemy.type];
    // Wave modifier: rich wave doubles reward
    const rewardMult = state.waveModifier === "rich" ? 2 : 1;
    state.gold += def.reward * rewardMult;
    state.score += def.reward * rewardMult;
    state.totalKills++;

    // Holy lv5: heals 1 life on kill
    if (towerType === "holy" && tower && tower.level >= 5 && state.lives < SiegeConfig.STARTING_LIVES) {
      state.lives = Math.min(state.lives + 1, SiegeConfig.STARTING_LIVES);
    }

    // Credit kill to tower and check for level-up
    if (tower) {
      tower.kills++;
      const killsNeeded = tower.level * 5;
      if (tower.kills >= killsNeeded && tower.level < 5) {
        tower.level++;
        tower.kills = 0;
        const ability = tower.level === 3 ? TOWER_ABILITIES[tower.type].lv3Desc : tower.level === 5 ? TOWER_ABILITIES[tower.type].lv5Desc : "";
        state.announcements.push({ text: `${TOWERS[tower.type].name} Lv${tower.level}!${ability ? " " + ability : ""}`, color: 0xffd700, timer: 2 });
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
