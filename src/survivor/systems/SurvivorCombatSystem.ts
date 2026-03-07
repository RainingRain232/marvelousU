// ---------------------------------------------------------------------------
// Survivor combat — weapon auto-fire & enemy contact damage
// ---------------------------------------------------------------------------

import { SurvivorBalance } from "../config/SurvivorBalanceConfig";
import { WEAPON_DEFS, EVOLUTION_DEFS } from "../config/SurvivorWeaponDefs";
import type {
  SurvivorState,
  SurvivorEnemy,
  SurvivorWeaponState,
} from "../state/SurvivorState";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function distSq(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function nearestEnemy(state: SurvivorState, x: number, y: number, maxRange: number): SurvivorEnemy | null {
  let best: SurvivorEnemy | null = null;
  let bestD = maxRange * maxRange;
  for (const e of state.enemies) {
    if (!e.alive) continue;
    const d = distSq(x, y, e.position.x, e.position.y);
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}

function enemiesInRadius(state: SurvivorState, x: number, y: number, radius: number): SurvivorEnemy[] {
  const rSq = radius * radius;
  return state.enemies.filter((e) => e.alive && distSq(x, y, e.position.x, e.position.y) < rSq);
}

function damageEnemy(state: SurvivorState, enemy: SurvivorEnemy, amount: number): void {
  const isCrit = Math.random() < state.player.critChance;
  const finalDmg = isCrit ? amount * 2.5 : amount;
  enemy.hp -= finalDmg;
  enemy.hitTimer = 0.1;
  state.totalDamageDealt += finalDmg;
  if (enemy.hp <= 0) {
    enemy.alive = false;
    enemy.deathTimer = 0.8;
    state.totalKills++;
    // Drop XP gem
    const gemTier = enemy.tier;
    state.gems.push({
      id: state.nextGemId++,
      position: { x: enemy.position.x, y: enemy.position.y },
      value: SurvivorBalance.GEM_VALUES[gemTier] ?? 1,
      tier: gemTier,
      alive: true,
    });
    // Gold
    state.gold += enemy.isBoss ? 50 : 1;
  }
}

function getWeaponDamage(ws: SurvivorWeaponState, player: SurvivorState["player"]): number {
  if (ws.evolved && ws.evolutionId) {
    const evo = EVOLUTION_DEFS[ws.evolutionId];
    return evo.damage * (player.atk / SurvivorBalance.PLAYER_BASE_ATK);
  }
  const def = WEAPON_DEFS[ws.id];
  return (def.baseDamage + def.damagePerLevel * (ws.level - 1)) * (player.atk / SurvivorBalance.PLAYER_BASE_ATK);
}

function getWeaponCooldown(ws: SurvivorWeaponState, player: SurvivorState["player"]): number {
  if (ws.evolved && ws.evolutionId) {
    return EVOLUTION_DEFS[ws.evolutionId].cooldown / player.attackSpeedMultiplier;
  }
  const def = WEAPON_DEFS[ws.id];
  return Math.max(0.1, def.baseCooldown - def.cooldownPerLevel * (ws.level - 1)) / player.attackSpeedMultiplier;
}

function getWeaponArea(ws: SurvivorWeaponState, player: SurvivorState["player"]): number {
  if (ws.evolved && ws.evolutionId) {
    return EVOLUTION_DEFS[ws.evolutionId].area * player.areaMultiplier;
  }
  const def = WEAPON_DEFS[ws.id];
  return (def.baseArea + def.areaPerLevel * (ws.level - 1)) * player.areaMultiplier;
}

function getWeaponCount(ws: SurvivorWeaponState): number {
  if (ws.evolved && ws.evolutionId) {
    return EVOLUTION_DEFS[ws.evolutionId].count;
  }
  const def = WEAPON_DEFS[ws.id];
  return def.baseCount + def.countPerLevel * (ws.level - 1);
}

// ---------------------------------------------------------------------------
// Weapon fire logic
// ---------------------------------------------------------------------------

function fireWeapon(state: SurvivorState, ws: SurvivorWeaponState): void {
  const px = state.player.position.x;
  const py = state.player.position.y;
  const damage = getWeaponDamage(ws, state.player);
  const area = getWeaponArea(ws, state.player);
  const count = getWeaponCount(ws);
  const def = WEAPON_DEFS[ws.id];

  switch (ws.id) {
    case "fireball_ring":
    case "spinning_blade": {
      // Orbiting projectiles — handled by view as visual, but we do instant AoE damage
      const enemies = enemiesInRadius(state, px, py, area);
      for (const e of enemies) {
        damageEnemy(state, e, damage);
      }
      break;
    }
    case "arrow_volley": {
      // Fire arrows at nearest enemies
      for (let i = 0; i < count; i++) {
        const target = nearestEnemy(state, px, py, 15);
        if (!target) break;
        const dx = target.position.x - px;
        const dy = target.position.y - py;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        state.projectiles.push({
          id: state.nextProjectileId++,
          position: { x: px, y: py },
          velocity: { x: (dx / len) * def.baseSpeed, y: (dy / len) * def.baseSpeed },
          damage,
          area: 0.5,
          pierce: def.basePierce + (ws.level - 1),
          lifetime: 3,
          weaponId: ws.id,
          hitEnemies: new Set(),
        });
      }
      break;
    }
    case "lightning_chain": {
      // Chain damage from nearest enemy outward
      const first = nearestEnemy(state, px, py, area);
      if (!first) break;
      damageEnemy(state, first, damage);
      let prev = first;
      for (let i = 1; i < count; i++) {
        const next = nearestEnemy(state, prev.position.x, prev.position.y, area * 0.8);
        if (!next || next === prev) break;
        damageEnemy(state, next, damage * 0.8);
        prev = next;
      }
      break;
    }
    case "ice_nova": {
      // AoE around player, applies slow
      const enemies = enemiesInRadius(state, px, py, area);
      for (const e of enemies) {
        damageEnemy(state, e, damage);
        e.slowFactor = 0.4;
        e.slowTimer = def.baseDuration + ws.level * 0.3;
      }
      break;
    }
    case "holy_circle": {
      // Damage aura
      const enemies = enemiesInRadius(state, px, py, area);
      for (const e of enemies) {
        damageEnemy(state, e, damage);
      }
      break;
    }
    case "catapult_strike": {
      // Drop boulders on random enemy clusters
      for (let i = 0; i < count; i++) {
        const target = nearestEnemy(state, px, py, 20);
        if (!target) break;
        const enemies = enemiesInRadius(state, target.position.x, target.position.y, area);
        for (const e of enemies) {
          damageEnemy(state, e, damage);
        }
      }
      break;
    }
    case "warp_field": {
      // AoE burst
      const enemies = enemiesInRadius(state, px, py, area);
      for (const e of enemies) {
        damageEnemy(state, e, damage);
      }
      break;
    }
    case "rune_circle": {
      // Random ground AoE
      for (let i = 0; i < count; i++) {
        const ox = px + (Math.random() * 2 - 1) * 8;
        const oy = py + (Math.random() * 2 - 1) * 8;
        const enemies = enemiesInRadius(state, ox, oy, area);
        for (const e of enemies) {
          damageEnemy(state, e, damage);
        }
      }
      break;
    }
    case "soul_drain": {
      // Lifesteal to nearest enemies
      for (let i = 0; i < count; i++) {
        const target = nearestEnemy(state, px, py, area);
        if (!target) break;
        damageEnemy(state, target, damage);
        state.player.hp = Math.min(state.player.maxHp, state.player.hp + damage * 0.3);
      }
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Main update
// ---------------------------------------------------------------------------

export const SurvivorCombatSystem = {
  update(state: SurvivorState, dt: number): void {
    if (state.paused || state.levelUpPending || state.gameOver) return;

    const px = state.player.position.x;
    const py = state.player.position.y;

    // Tick weapon cooldowns and fire
    for (const ws of state.weapons) {
      ws.cooldownTimer -= dt;
      if (ws.cooldownTimer <= 0) {
        const cd = getWeaponCooldown(ws, state.player);
        if (cd <= 0) {
          // Continuous weapons (spinning blade) — fire every tick
          ws.cooldownTimer = 0.1 / state.player.attackSpeedMultiplier;
        } else {
          ws.cooldownTimer = cd;
        }
        fireWeapon(state, ws);
      }
    }

    // Update projectiles
    for (const proj of state.projectiles) {
      proj.position.x += proj.velocity.x * dt;
      proj.position.y += proj.velocity.y * dt;
      proj.lifetime -= dt;

      // Check hits
      for (const e of state.enemies) {
        if (!e.alive) continue;
        if (proj.hitEnemies.has(e.id)) continue;
        if (distSq(proj.position.x, proj.position.y, e.position.x, e.position.y) < proj.area * proj.area) {
          damageEnemy(state, e, proj.damage);
          proj.hitEnemies.add(e.id);
          proj.pierce--;
          if (proj.pierce <= 0) {
            proj.lifetime = 0;
            break;
          }
        }
      }
    }
    state.projectiles = state.projectiles.filter((p) => p.lifetime > 0);

    // Enemy movement toward player
    for (const e of state.enemies) {
      if (!e.alive) {
        e.deathTimer -= dt;
        continue;
      }
      e.hitTimer = Math.max(0, e.hitTimer - dt);
      e.slowTimer = Math.max(0, e.slowTimer - dt);
      if (e.slowTimer <= 0) e.slowFactor = 1;

      const dx = px - e.position.x;
      const dy = py - e.position.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const spd = e.speed * e.slowFactor * dt;
      e.position.x += (dx / len) * spd;
      e.position.y += (dy / len) * spd;
    }

    // Enemy contact damage to player
    if (state.player.invincibilityTimer > 0) {
      state.player.invincibilityTimer -= dt;
    } else {
      const contactRange = SurvivorBalance.ENEMY_CONTACT_RANGE;
      const contactRangeSq = contactRange * contactRange;
      for (const e of state.enemies) {
        if (!e.alive) continue;
        if (distSq(px, py, e.position.x, e.position.y) < contactRangeSq) {
          const dmg = e.atk * SurvivorBalance.ENEMY_DAMAGE_TO_PLAYER_SCALE;
          state.player.hp -= dmg;
          state.player.invincibilityTimer = SurvivorBalance.PLAYER_INVINCIBILITY_TIME;
          if (state.player.hp <= 0) {
            state.player.hp = 0;
            state.gameOver = true;
          }
          break; // only take damage from one enemy per frame
        }
      }
    }

    // Player regen
    if (state.player.regenRate > 0 && state.player.hp < state.player.maxHp) {
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + state.player.regenRate * dt);
    }
  },
};
