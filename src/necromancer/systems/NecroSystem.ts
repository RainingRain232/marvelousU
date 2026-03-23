// ---------------------------------------------------------------------------
// Necromancer mode — game logic (dig, ritual, battle)
// ---------------------------------------------------------------------------

import type { NecroState, Undead, Crusader, Corpse } from "../state/NecroState";
import { findChimera } from "../state/NecroState";
import { CORPSES, CRUSADERS, NecroConfig, WAVES, generateEndlessWave } from "../config/NecroConfig";
import type { CorpseType, CrusaderType } from "../config/NecroConfig";

const BONE_WHITE = 0xccccbb;

// ── Dig phase ──────────────────────────────────────────────────────────────

export function updateDig(state: NecroState, dt: number): void {
  state.elapsed += dt;
  // Mana regen
  state.mana = Math.min(state.maxMana, state.mana + state.manaRegen * dt);

  for (const grave of state.graves) {
    if (!grave.digging || grave.dug) continue;
    grave.digProgress += dt / NecroConfig.DIG_TIME;
    if (grave.digProgress >= 1) {
      grave.dug = true;
      grave.digging = false;
      grave.digProgress = 1;
      if (grave.corpseType) {
        const corpse: Corpse = {
          id: state.corpseIdCounter++,
          type: grave.corpseType,
          slotIndex: state.corpses.length,
        };
        state.corpses.push(corpse);
        const def = CORPSES[grave.corpseType];
        state.announcements.push({ text: `Unearthed: ${def.name}`, color: 0x88cc88, timer: 1.5 });
        // Particles — dirt burst
        for (let i = 0; i < 8; i++) {
          state.particles.push({
            x: grave.x, y: grave.y,
            vx: (Math.random() - 0.5) * 80,
            vy: -40 - Math.random() * 40,
            life: 0.6, maxLife: 0.6,
            color: 0x554433, size: 2 + Math.random() * 2,
          });
        }
      }
    }
  }

  updateParticles(state, dt);
  updateAnnouncements(state, dt);
}

export function startDig(state: NecroState, graveId: number): void {
  const grave = state.graves.find(g => g.id === graveId);
  if (!grave || grave.dug || grave.digging) return;
  grave.digging = true;
}

// ── Ritual phase ───────────────────────────────────────────────────────────

export function updateRitual(state: NecroState, dt: number): void {
  state.elapsed += dt;
  state.mana = Math.min(state.maxMana, state.mana + state.manaRegen * dt);

  if (state.isRaising) {
    state.raisingProgress += dt / state.raiseTime;
    if (state.raisingProgress >= 1) {
      state.isRaising = false;
      state.raisingProgress = 0;
      raiseUndead(state);
    }
  }

  updateParticles(state, dt);
  updateAnnouncements(state, dt);
}

export function placeCorpseInSlot(state: NecroState, corpseId: number, slot: "a" | "b"): void {
  const idx = state.corpses.findIndex(c => c.id === corpseId);
  if (idx < 0) return;
  const corpse = state.corpses[idx];

  // Remove from other slot if already placed
  if (state.ritualSlotA?.id === corpseId) state.ritualSlotA = null;
  if (state.ritualSlotB?.id === corpseId) state.ritualSlotB = null;

  if (slot === "a") state.ritualSlotA = corpse;
  else state.ritualSlotB = corpse;
}

export function startRaise(state: NecroState): boolean {
  if (!state.ritualSlotA) return false;
  if (state.undead.length >= NecroConfig.MAX_ARMY) {
    state.announcements.push({ text: "Army full!", color: 0xff4444, timer: 1.5 });
    return false;
  }

  const defA = CORPSES[state.ritualSlotA.type];
  let totalCost = defA.manaCost;
  if (state.ritualSlotB) totalCost += CORPSES[state.ritualSlotB.type].manaCost;

  if (state.mana < totalCost) {
    state.announcements.push({ text: "Not enough mana!", color: 0xff4444, timer: 1.5 });
    return false;
  }

  // Check HP cost
  if (state.playerHp <= NecroConfig.RAISE_HP_COST) {
    state.announcements.push({ text: "Not enough life force!", color: 0xff4444, timer: 1.5 });
    return false;
  }

  state.mana -= totalCost;
  state.playerHp -= NecroConfig.RAISE_HP_COST;
  state.isRaising = true;
  state.raisingProgress = 0;

  // Green energy particles
  for (let i = 0; i < 12; i++) {
    state.particles.push({
      x: NecroConfig.FIELD_WIDTH / 2, y: NecroConfig.FIELD_HEIGHT / 2 + 40,
      vx: (Math.random() - 0.5) * 60,
      vy: -20 - Math.random() * 40,
      life: 1, maxLife: 1,
      color: 0x44ff88, size: 2 + Math.random() * 3,
    });
  }

  return true;
}

function raiseUndead(state: NecroState): void {
  const a = state.ritualSlotA!;
  const defA = CORPSES[a.type];
  let chimera = state.ritualSlotB ? findChimera(a.type, state.ritualSlotB.type) : null;

  const hpBonus = (state.powerLevels["bone_armor"] ?? 0) * 2;
  const dmgBonus = (state.powerLevels["death_grip"] ?? 0) * 1;

  let undead: Undead;
  if (chimera && state.ritualSlotB) {
    const defB = CORPSES[state.ritualSlotB.type];
    undead = {
      id: state.undeadIdCounter++,
      name: chimera.name,
      type: a.type,
      chimera,
      hp: defA.hp + defB.hp + chimera.hpBonus + hpBonus,
      maxHp: defA.hp + defB.hp + chimera.hpBonus + hpBonus,
      damage: defA.damage + defB.damage + chimera.damageBonus + dmgBonus,
      speed: Math.max(15, (defA.speed + defB.speed) / 2 + chimera.speedBonus),
      color: chimera.color,
      size: Math.max(defA.size, defB.size) + 2,
      x: 100 + Math.random() * 200,
      y: 200 + Math.random() * 100,
      targetId: -1,
      attackCooldown: 0,
      ability: chimera.ability,
      abilityCooldown: 5,
      alive: true,
      ranged: defA.ranged || defB.ranged,
      range: Math.max(defA.range, defB.range),
    };
    state.announcements.push({ text: `Raised: ${chimera.name}!`, color: 0xff88ff, timer: 2 });
  } else {
    undead = {
      id: state.undeadIdCounter++,
      name: `Undead ${defA.name}`,
      type: a.type,
      chimera: null,
      hp: defA.hp + hpBonus,
      maxHp: defA.hp + hpBonus,
      damage: defA.damage + dmgBonus,
      speed: defA.speed,
      color: defA.color,
      size: defA.size,
      x: 100 + Math.random() * 200,
      y: 200 + Math.random() * 100,
      targetId: -1,
      attackCooldown: 0,
      ability: null,
      abilityCooldown: 5,
      alive: true,
      ranged: defA.ranged,
      range: defA.range,
    };
    state.announcements.push({ text: `Raised: Undead ${defA.name}`, color: 0x44ff88, timer: 1.5 });
  }

  state.undead.push(undead);
  state.score += 10;

  // Remove corpses from inventory
  const removeIds = [a.id];
  if (state.ritualSlotB) removeIds.push(state.ritualSlotB.id);
  state.corpses = state.corpses.filter(c => !removeIds.includes(c.id));
  state.ritualSlotA = null;
  state.ritualSlotB = null;

  // Big green flash particles
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    state.particles.push({
      x: undead.x, y: undead.y,
      vx: Math.cos(angle) * 50,
      vy: Math.sin(angle) * 50,
      life: 0.8, maxLife: 0.8,
      color: chimera ? 0xff44ff : 0x44ff44, size: 3,
    });
  }
}

// ── Battle phase ───────────────────────────────────────────────────────────

export function updateBattle(state: NecroState, dt: number): void {
  state.elapsed += dt;
  state.battleTimer += dt;
  state.mana = Math.min(state.maxMana, state.mana + state.manaRegen * dt);

  // Nova cooldown
  if (state.novaCooldown > 0) state.novaCooldown -= dt;

  // Spawn crusaders from queue
  state.crusaderSpawnTimer -= dt;
  if (state.crusaderSpawnTimer <= 0 && state.crusaderSpawnQueue.length > 0) {
    const entry = state.crusaderSpawnQueue.shift()!;
    spawnCrusader(state, entry.type);
    state.crusaderSpawnTimer = NecroConfig.CRUSADER_SPAWN_INTERVAL;
  }

  // Move undead toward nearest enemy
  for (const u of state.undead) {
    if (!u.alive) continue;
    u.attackCooldown -= dt;
    if (u.abilityCooldown > 0) u.abilityCooldown -= dt;

    const target = findNearestCrusader(state, u.x, u.y);
    if (!target) continue;

    const dx = target.x - u.x, dy = target.y - u.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Ranged units stop at range and fire projectiles
    if (u.ranged && u.range > 0) {
      const stopDist = u.range * 0.8;
      if (dist > stopDist) {
        u.x += (dx / dist) * u.speed * dt;
        u.y += (dy / dist) * u.speed * dt;
      }
      if (dist < u.range && u.attackCooldown <= 0) {
        // Fire projectile
        const angle = Math.atan2(dy, dx);
        const speed = 200;
        state.projectiles.push({
          x: u.x, y: u.y,
          vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          damage: u.damage, life: 1.5, color: 0x9944ff, fromUndead: true,
        });
        u.attackCooldown = 1.8;
        // Muzzle flash
        state.particles.push({ x: u.x, y: u.y, vx: Math.cos(angle) * 20, vy: Math.sin(angle) * 20, life: 0.2, maxLife: 0.2, color: 0x9944ff, size: 3 });
      }
      continue;
    }

    if (dist > u.size + target.size + 2) {
      u.x += (dx / dist) * u.speed * dt;
      u.y += (dy / dist) * u.speed * dt;
    } else if (u.attackCooldown <= 0) {
      // Attack
      let dmg = u.damage;

      // Ability: frenzy — double damage at low HP
      if (u.ability === "frenzy" && u.hp < u.maxHp * 0.4) dmg *= 2;

      target.hp -= dmg;
      u.attackCooldown = 1.2;

      // Ability: drain — heal on hit
      if (u.ability === "drain" || (state.powerLevels["life_drain"] ?? 0) > 0) {
        u.hp = Math.min(u.maxHp, u.hp + 1);
      }

      // Ability: cleave — hit nearby enemies too
      if (u.ability === "cleave" && u.abilityCooldown <= 0) {
        for (const c of state.crusaders) {
          if (!c.alive || c.id === target.id) continue;
          const cdx = c.x - u.x, cdy = c.y - u.y;
          if (cdx * cdx + cdy * cdy < 40 * 40) {
            c.hp -= Math.ceil(dmg * 0.5);
          }
        }
        u.abilityCooldown = 4;
      }

      // Hit particles — slash line
      const slashAngle = Math.atan2(target.y - u.y, target.x - u.x);
      for (let si = 0; si < 3; si++) {
        state.particles.push({
          x: target.x + (Math.random() - 0.5) * 6, y: target.y + (Math.random() - 0.5) * 6,
          vx: Math.cos(slashAngle + (Math.random() - 0.5)) * 40, vy: -20 - Math.random() * 15,
          life: 0.25, maxLife: 0.25, color: 0xff4444, size: 1.5 + Math.random(),
        });
      }

      // Floating damage number
      state.damageNumbers.push({ x: target.x, y: target.y - 10, text: `-${dmg}`, color: 0xff4444, timer: 0.8, maxTimer: 0.8 });

      // Knockback
      const kbDist = 3;
      target.x += Math.cos(slashAngle) * kbDist;
      target.y += Math.sin(slashAngle) * kbDist;

      if (target.hp <= 0) {
        target.alive = false;
        state.gold += CRUSADERS[target.type].reward;
        state.score += CRUSADERS[target.type].reward * 2;
        state.waveKills++;
        state.totalKills++;

        // Soul harvest — mana recovery on kill
        state.mana = Math.min(state.maxMana, state.mana + NecroConfig.SOUL_HARVEST_MANA);
        state.particles.push({ x: target.x, y: target.y - 5, vx: 0, vy: -25, life: 0.5, maxLife: 0.5, color: 0x4466cc, size: 2 });
        // HP recovery every N kills
        if (state.waveKills % NecroConfig.SOUL_HARVEST_HP_INTERVAL === 0) {
          state.playerHp = Math.min(state.maxPlayerHp, state.playerHp + 1);
          state.announcements.push({ text: "+1 HP (Soul Harvest)", color: 0xff4488, timer: 1.5 });
        }

        // Ability: explode — area damage on kill
        if (u.ability === "explode" && u.abilityCooldown <= 0) {
          for (const c of state.crusaders) {
            if (!c.alive) continue;
            const edx = c.x - target.x, edy = c.y - target.y;
            if (edx * edx + edy * edy < 60 * 60) {
              c.hp -= u.damage * 2;
              if (c.hp <= 0) {
                c.alive = false;
                state.gold += CRUSADERS[c.type].reward;
                state.score += CRUSADERS[c.type].reward;
              }
            }
          }
          u.abilityCooldown = 6;
          // Explosion particles
          for (let i = 0; i < 16; i++) {
            const angle = (i / 16) * Math.PI * 2;
            state.particles.push({
              x: target.x, y: target.y,
              vx: Math.cos(angle) * 80, vy: Math.sin(angle) * 80,
              life: 0.5, maxLife: 0.5, color: 0xff6622, size: 3,
            });
          }
        }

        // Death particles
        for (let i = 0; i < 6; i++) {
          state.particles.push({
            x: target.x, y: target.y,
            vx: (Math.random() - 0.5) * 50, vy: -30 - Math.random() * 20,
            life: 0.5, maxLife: 0.5, color: 0xffd700, size: 2,
          });
        }
      }
    }
  }

  // Move crusaders toward nearest undead
  for (const c of state.crusaders) {
    if (!c.alive) continue;
    c.attackCooldown -= dt;
    if (c.abilityCooldown > 0) c.abilityCooldown -= dt;

    // Priest heal aura
    if (c.ability === "heal_aura" && c.abilityCooldown <= 0) {
      for (const ally of state.crusaders) {
        if (!ally.alive || ally.id === c.id) continue;
        const hdx = ally.x - c.x, hdy = ally.y - c.y;
        if (hdx * hdx + hdy * hdy < 80 * 80 && ally.hp < ally.maxHp) {
          ally.hp = Math.min(ally.maxHp, ally.hp + 2);
          state.particles.push({ x: ally.x, y: ally.y - 5, vx: 0, vy: -15, life: 0.4, maxLife: 0.4, color: 0xffff88, size: 2 });
        }
      }
      c.abilityCooldown = 4;
    }

    // Rally — buff nearby allies
    if (c.ability === "rally" && c.abilityCooldown <= 0) {
      for (const ally of state.crusaders) {
        if (!ally.alive || ally.id === c.id) continue;
        const rdx = ally.x - c.x, rdy = ally.y - c.y;
        if (rdx * rdx + rdy * rdy < 100 * 100) {
          // Temporary speed boost (handled via movement)
          ally.speed = CRUSADERS[ally.type].speed * 1.3;
        }
      }
      c.abilityCooldown = 8;
    }

    const target = findNearestUndead(state, c.x, c.y);
    if (!target) {
      // No undead left — attack the necromancer (player)
      // Crusaders march toward center-left
      const nx = 60, ny = NecroConfig.FIELD_HEIGHT / 2;
      const dx = nx - c.x, dy = ny - c.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 15) {
        c.x += (dx / dist) * c.speed * dt;
        c.y += (dy / dist) * c.speed * dt;
      } else if (c.attackCooldown <= 0) {
        state.playerHp -= c.damage;
        c.attackCooldown = 2;
        state.particles.push({ x: nx, y: ny, vx: 0, vy: -10, life: 0.3, maxLife: 0.3, color: 0xff2222, size: 3 });
        if (state.playerHp <= 0) {
          state.battleLost = true;
        }
      }
      continue;
    }

    const dx = target.x - c.x, dy = target.y - c.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > c.size + target.size + 2) {
      c.x += (dx / dist) * c.speed * dt;
      c.y += (dy / dist) * c.speed * dt;
    } else if (c.attackCooldown <= 0) {
      let dmg = c.damage;

      // Holy smite — bonus damage to chimeras
      if (c.ability === "holy_smite" && target.chimera) dmg += 3;

      // Shield ability — reduce incoming damage by 40%
      if (target.ability === "shield") dmg = Math.max(1, Math.ceil(dmg * 0.6));

      target.hp -= dmg;
      c.attackCooldown = 1.5;

      // Damage number
      state.damageNumbers.push({ x: target.x, y: target.y - 10, text: `-${dmg}`, color: 0x44ff88, timer: 0.8, maxTimer: 0.8 });

      // Hit particles with direction
      const cSlashAngle = Math.atan2(target.y - c.y, target.x - c.x);
      for (let si = 0; si < 3; si++) {
        state.particles.push({
          x: target.x + (Math.random() - 0.5) * 5, y: target.y + (Math.random() - 0.5) * 5,
          vx: Math.cos(cSlashAngle + (Math.random() - 0.5)) * 30, vy: -15 - Math.random() * 10,
          life: 0.2, maxLife: 0.2, color: 0x44ff44, size: 1.5,
        });
      }

      // Knockback
      target.x += Math.cos(cSlashAngle) * 2;
      target.y += Math.sin(cSlashAngle) * 2;

      if (target.hp <= 0) {
        target.alive = false;
        // Death burst — green soul wisps
        for (let i = 0; i < 8; i++) {
          const da = (i / 8) * Math.PI * 2;
          state.particles.push({
            x: target.x, y: target.y,
            vx: Math.cos(da) * 35, vy: Math.sin(da) * 35 - 15,
            life: 0.5, maxLife: 0.5, color: 0x44ff44, size: 2,
          });
        }
      }
    }
  }

  // Update bone walls
  for (let i = state.boneWalls.length - 1; i >= 0; i--) {
    const wall = state.boneWalls[i];
    wall.timer -= dt;
    if (wall.timer <= 0 || wall.hp <= 0) {
      // Wall crumble particles
      for (let pi = 0; pi < 6; pi++) {
        state.particles.push({
          x: wall.x + (Math.random() - 0.5) * 20, y: wall.y,
          vx: (Math.random() - 0.5) * 40, vy: -20 - Math.random() * 15,
          life: 0.4, maxLife: 0.4, color: BONE_WHITE, size: 2,
        });
      }
      state.boneWalls.splice(i, 1);
      continue;
    }
    // Crusaders collide with walls — stop and attack them
    for (const c of state.crusaders) {
      if (!c.alive) continue;
      const wdx = wall.x - c.x, wdy = wall.y - c.y;
      if (wdx * wdx + wdy * wdy < 25 * 25) {
        // Push crusader back
        const pushAngle = Math.atan2(c.y - wall.y, c.x - wall.x);
        c.x = wall.x + Math.cos(pushAngle) * 26;
        c.y = wall.y + Math.sin(pushAngle) * 26;
        // Crusader attacks wall
        if (c.attackCooldown <= 0) {
          wall.hp -= c.damage;
          c.attackCooldown = 1.5;
        }
      }
    }
  }
  if (state.boneWallCooldown > 0) state.boneWallCooldown -= dt;

  // Update projectiles
  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const p = state.projectiles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (p.life <= 0 || p.x < -10 || p.x > NecroConfig.FIELD_WIDTH + 10 || p.y < -10 || p.y > NecroConfig.FIELD_HEIGHT + 10) {
      state.projectiles.splice(i, 1);
      continue;
    }
    // Check collision
    if (p.fromUndead) {
      for (const c of state.crusaders) {
        if (!c.alive) continue;
        const pdx = p.x - c.x, pdy = p.y - c.y;
        if (pdx * pdx + pdy * pdy < (c.size + 3) * (c.size + 3)) {
          c.hp -= p.damage;
          state.damageNumbers.push({ x: c.x, y: c.y - 10, text: `-${p.damage}`, color: 0x9944ff, timer: 0.8, maxTimer: 0.8 });
          state.particles.push({ x: c.x, y: c.y, vx: (Math.random() - 0.5) * 20, vy: -15, life: 0.2, maxLife: 0.2, color: 0x9944ff, size: 2 });
          if (c.hp <= 0) {
            c.alive = false;
            state.gold += CRUSADERS[c.type].reward;
            state.score += CRUSADERS[c.type].reward * 2;
            state.waveKills++;
            state.totalKills++;
            state.mana = Math.min(state.maxMana, state.mana + NecroConfig.SOUL_HARVEST_MANA);
          }
          state.projectiles.splice(i, 1);
          break;
        }
      }
    }
  }

  // Inquisitor purge — dispels chimera abilities temporarily
  for (const c of state.crusaders) {
    if (!c.alive || c.ability !== "purge" || c.abilityCooldown > 0) continue;
    for (const u of state.undead) {
      if (!u.alive || !u.chimera) continue;
      const pdx = u.x - c.x, pdy = u.y - c.y;
      if (pdx * pdx + pdy * pdy < 80 * 80) {
        // Purge: deal bonus damage to chimeras
        u.hp -= 3;
        state.damageNumbers.push({ x: u.x, y: u.y - 12, text: "PURGE", color: 0xffaa00, timer: 1, maxTimer: 1 });
        state.particles.push({ x: u.x, y: u.y, vx: 0, vy: -20, life: 0.4, maxLife: 0.4, color: 0xffaa00, size: 3 });
        if (u.hp <= 0) u.alive = false;
      }
    }
    c.abilityCooldown = 6;
  }

  // Update damage numbers
  for (let i = state.damageNumbers.length - 1; i >= 0; i--) {
    const dn = state.damageNumbers[i];
    dn.timer -= dt;
    dn.y -= 20 * dt;
    if (dn.timer <= 0) state.damageNumbers.splice(i, 1);
  }

  // Clean dead
  state.undead = state.undead.filter(u => u.alive);
  state.crusaders = state.crusaders.filter(c => c.alive);

  // Check win/loss
  if (state.crusaders.length === 0 && state.crusaderSpawnQueue.length === 0) {
    state.battleWon = true;
  }
  if (state.battleTimer > NecroConfig.BATTLE_TIMEOUT) {
    // Timeout — partial win if more undead than crusaders
    if (state.undead.length > state.crusaders.length) state.battleWon = true;
    else state.battleLost = true;
  }

  updateParticles(state, dt);
  updateAnnouncements(state, dt);
}

export function castDarkNova(state: NecroState, wx: number, wy: number): void {
  if ((state.powerLevels["dark_nova"] ?? 0) < 1) return;
  if (state.novaCooldown > 0) return;
  if (state.mana < 15) {
    state.announcements.push({ text: "Not enough mana for Nova!", color: 0xff4444, timer: 1 });
    return;
  }

  state.mana -= 15;
  state.novaCooldown = 8;
  state.novaActive = true;

  // Damage all crusaders in radius
  const radius = 80;
  for (const c of state.crusaders) {
    if (!c.alive) continue;
    const dx = c.x - wx, dy = c.y - wy;
    if (dx * dx + dy * dy < radius * radius) {
      c.hp -= 8;
      if (c.hp <= 0) {
        c.alive = false;
        state.gold += CRUSADERS[c.type].reward;
        state.score += CRUSADERS[c.type].reward;
      }
    }
  }

  // Big purple explosion
  for (let i = 0; i < 24; i++) {
    const angle = (i / 24) * Math.PI * 2;
    const dist = 20 + Math.random() * 60;
    state.particles.push({
      x: wx, y: wy,
      vx: Math.cos(angle) * dist, vy: Math.sin(angle) * dist,
      life: 0.7, maxLife: 0.7, color: 0xaa44ff, size: 3 + Math.random() * 2,
    });
  }
  state.announcements.push({ text: "DARK NOVA!", color: 0xaa44ff, timer: 1.5 });
}

export function castBoneWall(state: NecroState, wx: number, wy: number): void {
  if (state.boneWallCooldown > 0) return;
  if (state.mana < 10) {
    state.announcements.push({ text: "Not enough mana!", color: 0xff4444, timer: 1 });
    return;
  }
  state.mana -= 10;
  state.boneWallCooldown = 6;
  state.boneWalls.push({ x: wx, y: wy, hp: 12, maxHp: 12, timer: 15 });
  // Bone wall rise particles
  for (let i = 0; i < 10; i++) {
    state.particles.push({
      x: wx + (Math.random() - 0.5) * 20, y: wy + 10,
      vx: (Math.random() - 0.5) * 15, vy: -30 - Math.random() * 20,
      life: 0.5, maxLife: 0.5, color: BONE_WHITE, size: 2,
    });
  }
  state.announcements.push({ text: "BONE WALL!", color: 0xccccbb, timer: 1 });
}

function spawnCrusader(state: NecroState, type: CrusaderType): void {
  const def = CRUSADERS[type];
  // Spawn from right side
  const y = 80 + Math.random() * (NecroConfig.FIELD_HEIGHT - 160);
  state.crusaders.push({
    id: state.crusaderIdCounter++,
    type,
    name: def.name,
    hp: def.hp + state.wave * 2, // Scale with wave
    maxHp: def.hp + state.wave * 2,
    damage: def.damage + Math.floor(state.wave / 2),
    speed: def.speed,
    color: def.color,
    size: def.size,
    x: NecroConfig.FIELD_WIDTH - 20,
    y,
    targetId: -1,
    attackCooldown: 1,
    alive: true,
    ability: def.ability ?? null,
    abilityCooldown: 3,
  });
}

export function prepareBattleWave(state: NecroState): void {
  const wave = state.wave < WAVES.length ? WAVES[state.wave] : generateEndlessWave(state.wave);
  state.crusaderSpawnQueue = [];
  let delay = 0;
  for (const entry of wave) {
    for (let i = 0; i < entry.count; i++) {
      state.crusaderSpawnQueue.push({ type: entry.type, delay });
      delay += NecroConfig.CRUSADER_SPAWN_INTERVAL;
    }
  }
  state.battleTimer = 0;
  state.battleWon = false;
  state.battleLost = false;
  state.crusaderSpawnTimer = 1;
  state.waveKills = 0;
  state.boneWalls = [];
  state.boneWallCooldown = 0;
  state.damageNumbers = [];
  state.projectiles = [];

  // Position undead on left side
  for (let i = 0; i < state.undead.length; i++) {
    state.undead[i].x = 80 + Math.random() * 120;
    state.undead[i].y = 60 + (i / state.undead.length) * (NecroConfig.FIELD_HEIGHT - 120);
    state.undead[i].alive = true;
    state.undead[i].attackCooldown = 0;
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function findNearestCrusader(state: NecroState, x: number, y: number): Crusader | null {
  let best: Crusader | null = null, bestDist = Infinity;
  for (const c of state.crusaders) {
    if (!c.alive) continue;
    const dx = c.x - x, dy = c.y - y;
    const d = dx * dx + dy * dy;
    if (d < bestDist) { bestDist = d; best = c; }
  }
  return best;
}

function findNearestUndead(state: NecroState, x: number, y: number): Undead | null {
  let best: Undead | null = null, bestDist = Infinity;
  for (const u of state.undead) {
    if (!u.alive) continue;
    const dx = u.x - x, dy = u.y - y;
    const d = dx * dx + dy * dy;
    if (d < bestDist) { bestDist = d; best = u; }
  }
  return best;
}

function updateParticles(state: NecroState, dt: number): void {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 30 * dt; p.life -= dt;
    if (p.life <= 0) state.particles.splice(i, 1);
  }
}

function updateAnnouncements(state: NecroState, dt: number): void {
  for (let i = state.announcements.length - 1; i >= 0; i--) {
    state.announcements[i].timer -= dt;
    if (state.announcements[i].timer <= 0) state.announcements.splice(i, 1);
  }
}
