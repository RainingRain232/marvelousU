// ---------------------------------------------------------------------------
// Survivor combat — weapon auto-fire, enemy AI, contact damage, arcana/synergy
// ---------------------------------------------------------------------------

import { SurvivorBalance } from "../config/SurvivorBalanceConfig";
import { WEAPON_DEFS, EVOLUTION_DEFS, SurvivorWeaponId } from "../config/SurvivorWeaponDefs";
import { ELITE_DEFS } from "../config/SurvivorEliteDefs";
import { SYNERGY_DEFS } from "../config/SurvivorSynergyDefs";
import type {
  SurvivorState,
  SurvivorEnemy,
  SurvivorWeaponState,
} from "../state/SurvivorState";

// ---------------------------------------------------------------------------
// Callbacks for VFX
// ---------------------------------------------------------------------------

type DamageCallback = ((x: number, y: number, amount: number, isCrit: boolean) => void) | null;
type WeaponFxCallback = ((x: number, y: number, color: number, radius: number) => void) | null;
type ChainFxCallback = ((points: { x: number; y: number }[], color: number) => void) | null;
type ArcFxCallback = ((sx: number, sy: number, tx: number, ty: number, color: number, area: number) => void) | null;
type PlayerHitCallback = (() => void) | null;

let _damageCallback: DamageCallback = null;
let _weaponFxCallback: WeaponFxCallback = null;
let _chainFxCallback: ChainFxCallback = null;
let _arcFxCallback: ArcFxCallback = null;
let _playerHitCallback: PlayerHitCallback = null;

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

function nearestEnemyExcluding(state: SurvivorState, x: number, y: number, maxRange: number, excludeIds: Set<number>): SurvivorEnemy | null {
  let best: SurvivorEnemy | null = null;
  let bestD = maxRange * maxRange;
  for (const e of state.enemies) {
    if (!e.alive || excludeIds.has(e.id)) continue;
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

// ---------------------------------------------------------------------------
// Arcana/synergy helpers
// ---------------------------------------------------------------------------

function _hasArcana(state: SurvivorState, rule: string): boolean {
  return state.arcana.some((a) => a.specialRule === rule);
}

function _hasSynergy(state: SurvivorState, id: string): boolean {
  return state.activeSynergies.includes(id);
}

function _getArcanaDamageMult(state: SurvivorState): number {
  let mult = 1.0;
  for (const a of state.arcana) {
    mult *= a.damageMultiplier;
  }
  return mult;
}

function _getArcanaCooldownMult(state: SurvivorState): number {
  let mult = 1.0;
  for (const a of state.arcana) {
    mult *= a.cooldownMultiplier;
  }
  return mult;
}

function _getArcanaAreaMult(state: SurvivorState): number {
  let mult = 1.0;
  for (const a of state.arcana) {
    mult *= a.areaMultiplier;
  }
  return mult;
}

function _getSynergyDamageBonus(state: SurvivorState): number {
  let bonus = 0;
  for (const id of state.activeSynergies) {
    const syn = SYNERGY_DEFS.find((s) => s.id === id);
    if (syn) bonus += syn.damageBonus;
  }
  return bonus;
}

function _getSynergyAreaBonus(state: SurvivorState): number {
  let bonus = 0;
  for (const id of state.activeSynergies) {
    const syn = SYNERGY_DEFS.find((s) => s.id === id);
    if (syn) bonus += syn.areaBonus;
  }
  return bonus;
}

// ---------------------------------------------------------------------------
// Damage dealing
// ---------------------------------------------------------------------------

function damageEnemy(state: SurvivorState, enemy: SurvivorEnemy, amount: number, weaponId?: string): void {
  // Shielded elites take 50% damage
  if (enemy.eliteType === "shielded") amount *= 0.5;

  // Giant Slayer arcana: +100% vs bosses/elites
  if (_hasArcana(state, "giant_slayer") && (enemy.isBoss || enemy.eliteType)) {
    amount *= 2.0;
  }

  // Synergy + arcana damage multipliers
  amount *= _getArcanaDamageMult(state);
  amount *= (1 + _getSynergyDamageBonus(state));

  // Excalibur's Blessing: +50% ATK near Sword in the Stone
  if (state.activeLandmarkBuffs.has("sword_stone")) amount *= 1.5;

  const isCrit = Math.random() < state.player.critChance;
  const finalDmg = isCrit ? amount * 2.5 : amount;
  enemy.hp -= finalDmg;
  enemy.hitTimer = 0.1;
  state.totalDamageDealt += finalDmg;
  if (weaponId) {
    state.weaponDamageDealt[weaponId] = (state.weaponDamageDealt[weaponId] ?? 0) + finalDmg;
  }
  _damageCallback?.(enemy.position.x, enemy.position.y, finalDmg, isCrit);

  // Vampiric Aura: heal 3% of damage dealt
  if (_hasArcana(state, "vampiric_aura")) {
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + finalDmg * 0.03);
  }

  // Eternal Frost: 20% chance to freeze
  if (_hasArcana(state, "eternal_frost") && Math.random() < 0.2) {
    enemy.slowFactor = 0;
    enemy.slowTimer = Math.max(enemy.slowTimer, 1.0);
  }

  if (enemy.hp <= 0) {
    enemy.alive = false;
    enemy.deathTimer = 0.8;
    state.totalKills++;

    // Victory check — Death boss killed
    if (enemy.isDeathBoss) {
      state.victory = true;
      return;
    }

    // Chain Explosion arcana: enemies explode on death
    if (_hasArcana(state, "chain_explosion")) {
      const explosionDmg = enemy.maxHp * 0.2;
      const nearby = enemiesInRadius(state, enemy.position.x, enemy.position.y, 2.0);
      for (const n of nearby) {
        if (n.id === enemy.id || !n.alive) continue;
        n.hp -= explosionDmg;
        n.hitTimer = 0.1;
        _damageCallback?.(n.position.x, n.position.y, explosionDmg, false);
        if (n.hp <= 0) {
          n.alive = false;
          n.deathTimer = 0.8;
          state.totalKills++;
        }
      }
      _weaponFxCallback?.(enemy.position.x, enemy.position.y, 0xff6600, 2.0);
    }

    // Drop XP gem (elites drop one tier higher)
    const gemTierBonus = enemy.eliteType ? 1 : 0;
    const gemTier = Math.min(4, enemy.tier + gemTierBonus);
    state.gems.push({
      id: state.nextGemId++,
      position: { x: enemy.position.x, y: enemy.position.y },
      value: SurvivorBalance.GEM_VALUES[gemTier] ?? 1,
      tier: gemTier,
      alive: true,
    });

    // Gold (with multiplier)
    const goldMult = state.goldMultiplier * (_hasArcana(state, "golden_touch") ? 3.0 : 1.0);
    state.gold += Math.round((enemy.isBoss ? 50 : 1) * goldMult);

    // Boss drops treasure chest (arcana chest if arcana slots available)
    if (enemy.isBoss) {
      const hasArcanaSlot = state.arcana.length < 3;
      const chestType = hasArcanaSlot ? "arcana" : (["gold", "heal", "bomb"] as const)[Math.floor(Math.random() * 3)];
      state.chests.push({
        id: state.nextChestId++,
        position: { x: enemy.position.x, y: enemy.position.y },
        alive: true,
        type: chestType,
        value: 100 + Math.floor(state.gameTime / 60) * 50,
      });
    }

    // Regular enemy chest drops (luck-scaled)
    if (!enemy.isBoss) {
      const baseChance = SurvivorBalance.CHEST_DROP_CHANCE;
      const luckBonus = state.player.critChance * SurvivorBalance.CHEST_DROP_LUCK_SCALE;
      if (Math.random() < baseChance + luckBonus) {
        const chestTypes = ["gold", "heal", "bomb"] as const;
        state.chests.push({
          id: state.nextChestId++,
          position: { x: enemy.position.x, y: enemy.position.y },
          alive: true,
          type: chestTypes[Math.floor(Math.random() * chestTypes.length)],
          value: 20 + Math.floor(state.gameTime / 60) * 10,
        });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Weapon stat getters (with arcana/synergy modifiers)
// ---------------------------------------------------------------------------

function getWeaponDamage(ws: SurvivorWeaponState, player: SurvivorState["player"]): number {
  if (ws.evolved && ws.evolutionId) {
    const evo = EVOLUTION_DEFS[ws.evolutionId];
    return evo.damage * (player.atk / SurvivorBalance.PLAYER_BASE_ATK);
  }
  const def = WEAPON_DEFS[ws.id];
  return (def.baseDamage + def.damagePerLevel * (ws.level - 1)) * (player.atk / SurvivorBalance.PLAYER_BASE_ATK);
}

function getWeaponCooldown(ws: SurvivorWeaponState, player: SurvivorState["player"], state: SurvivorState): number {
  const arcanaMult = _getArcanaCooldownMult(state);
  // Wayland's Fury: +50% attack speed
  const waylandMult = state.activeLandmarkBuffs.has("wayland_fury") ? 1.5 : 1.0;
  const totalAtkSpeed = player.attackSpeedMultiplier * waylandMult;
  if (ws.evolved && ws.evolutionId) {
    return EVOLUTION_DEFS[ws.evolutionId].cooldown / totalAtkSpeed * arcanaMult;
  }
  const def = WEAPON_DEFS[ws.id];
  return Math.max(0.1, def.baseCooldown - def.cooldownPerLevel * (ws.level - 1)) / totalAtkSpeed * arcanaMult;
}

function getWeaponArea(ws: SurvivorWeaponState, player: SurvivorState["player"], state: SurvivorState): number {
  const arcanaMult = _getArcanaAreaMult(state);
  const synergyBonus = _getSynergyAreaBonus(state);
  if (ws.evolved && ws.evolutionId) {
    return EVOLUTION_DEFS[ws.evolutionId].area * player.areaMultiplier * arcanaMult * (1 + synergyBonus);
  }
  const def = WEAPON_DEFS[ws.id];
  return (def.baseArea + def.areaPerLevel * (ws.level - 1)) * player.areaMultiplier * arcanaMult * (1 + synergyBonus);
}

function getWeaponCount(ws: SurvivorWeaponState, state: SurvivorState): number {
  let count: number;
  if (ws.evolved && ws.evolutionId) {
    count = EVOLUTION_DEFS[ws.evolutionId].count;
  } else {
    const def = WEAPON_DEFS[ws.id];
    count = def.baseCount + def.countPerLevel * (ws.level - 1);
  }
  // Storm of Blades synergy: +2 arrows
  if (ws.id === SurvivorWeaponId.ARROW_VOLLEY && _hasSynergy(state, "storm_of_blades")) {
    count += 2;
  }
  return count;
}

// ---------------------------------------------------------------------------
// Weapon fire logic
// ---------------------------------------------------------------------------

function fireWeapon(state: SurvivorState, ws: SurvivorWeaponState): void {
  const px = state.player.position.x;
  const py = state.player.position.y;
  const damage = getWeaponDamage(ws, state.player);
  const area = getWeaponArea(ws, state.player, state);
  const count = getWeaponCount(ws, state);
  const def = WEAPON_DEFS[ws.id];

  switch (ws.id) {
    case "fireball_ring":
    case "spinning_blade": {
      const enemies = enemiesInRadius(state, px, py, area);
      for (const e of enemies) {
        damageEnemy(state, e, damage, ws.id);
      }
      if (enemies.length > 0) _weaponFxCallback?.(px, py, def.color, area);
      break;
    }
    case "arrow_volley": {
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
      const first = nearestEnemy(state, px, py, area);
      if (!first) break;
      const chainHitSet = new Set<number>([first.id]);
      const chainPoints: { x: number; y: number }[] = [{ x: px, y: py }];
      damageEnemy(state, first, damage, ws.id);
      _weaponFxCallback?.(first.position.x, first.position.y, def.color, 2);
      chainPoints.push({ x: first.position.x, y: first.position.y });
      let prev = first;
      for (let i = 1; i < count; i++) {
        const next = nearestEnemyExcluding(state, prev.position.x, prev.position.y, area * 0.8, chainHitSet);
        if (!next) break;
        chainHitSet.add(next.id);
        damageEnemy(state, next, damage * 0.8, ws.id);
        _weaponFxCallback?.(next.position.x, next.position.y, def.color, 1.5);
        chainPoints.push({ x: next.position.x, y: next.position.y });
        prev = next;
      }
      _chainFxCallback?.(chainPoints, def.color);
      break;
    }
    case "ice_nova": {
      const enemies = enemiesInRadius(state, px, py, area);
      for (const e of enemies) {
        damageEnemy(state, e, damage, ws.id);
        e.slowFactor = 0.4;
        e.slowTimer = def.baseDuration + ws.level * 0.3;
      }
      if (enemies.length > 0) _weaponFxCallback?.(px, py, def.color, area);
      break;
    }
    case "holy_circle": {
      const enemies = enemiesInRadius(state, px, py, area);
      for (const e of enemies) {
        damageEnemy(state, e, damage, ws.id);
      }
      break;
    }
    case "catapult_strike": {
      for (let i = 0; i < count; i++) {
        const target = nearestEnemy(state, px, py, 20);
        if (!target) break;
        const enemies = enemiesInRadius(state, target.position.x, target.position.y, area);
        for (const e of enemies) {
          damageEnemy(state, e, damage, ws.id);
        }
        _arcFxCallback?.(px, py, target.position.x, target.position.y, def.color, area);
      }
      break;
    }
    case "warp_field": {
      const enemies = enemiesInRadius(state, px, py, area);
      for (const e of enemies) {
        damageEnemy(state, e, damage, ws.id);
      }
      if (enemies.length > 0) _weaponFxCallback?.(px, py, def.color, area);
      break;
    }
    case "rune_circle": {
      for (let i = 0; i < count; i++) {
        const ox = px + (Math.random() * 2 - 1) * 8;
        const oy = py + (Math.random() * 2 - 1) * 8;
        const enemies = enemiesInRadius(state, ox, oy, area);
        for (const e of enemies) {
          damageEnemy(state, e, damage, ws.id);
          // Arcane Lifesteal synergy: rune hits heal
          if (_hasSynergy(state, "arcane_lifesteal")) {
            state.player.hp = Math.min(state.player.maxHp, state.player.hp + damage * 0.15);
          }
        }
        _weaponFxCallback?.(ox, oy, def.color, area);
      }
      break;
    }
    case "soul_drain": {
      const healMult = _hasSynergy(state, "dark_arts") ? 0.45 : 0.3;
      for (let i = 0; i < count; i++) {
        const target = nearestEnemy(state, px, py, area);
        if (!target) break;
        damageEnemy(state, target, damage, ws.id);
        state.player.hp = Math.min(state.player.maxHp, state.player.hp + damage * healMult);
      }
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Elite enemy abilities
// ---------------------------------------------------------------------------

function _updateEliteAbilities(state: SurvivorState, dt: number): void {
  const px = state.player.position.x;
  const py = state.player.position.y;

  for (const e of state.enemies) {
    if (!e.alive || !e.eliteType) continue;

    // Tick charge timer
    if (e.chargeTimer > 0) {
      e.chargeTimer -= dt;
      e.position.x += e.chargeDirX * e.speed * 3 * dt;
      e.position.y += e.chargeDirY * e.speed * 3 * dt;
      continue; // skip normal movement for charging enemies
    }

    e.eliteTimer -= dt;
    if (e.eliteTimer > 0) continue;

    const eliteDef = ELITE_DEFS[e.eliteType];
    e.eliteTimer = eliteDef.abilityCooldown;

    switch (e.eliteType) {
      case "charger": {
        // Lunge toward player at 3x speed for 0.3s
        const dx = px - e.position.x;
        const dy = py - e.position.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        if (len > 5) { // only charge from distance
          e.chargeDirX = dx / len;
          e.chargeDirY = dy / len;
          e.chargeTimer = 0.3;
        }
        break;
      }
      case "ranged": {
        // Fire a projectile toward the player
        const dx = px - e.position.x;
        const dy = py - e.position.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        state.enemyProjectiles.push({
          id: state.nextEnemyProjId++,
          position: { x: e.position.x, y: e.position.y },
          velocity: { x: (dx / len) * 6, y: (dy / len) * 6 },
          damage: e.atk * 0.8,
          lifetime: 3,
        });
        break;
      }
      case "summoner": {
        // Spawn 2 tier-0 minions nearby
        for (let i = 0; i < 2; i++) {
          const ox = e.position.x + (Math.random() * 2 - 1) * 2;
          const oy = e.position.y + (Math.random() * 2 - 1) * 2;
          state.enemies.push({
            id: state.nextEnemyId++,
            type: e.type,
            position: { x: ox, y: oy },
            hp: e.maxHp * 0.2,
            maxHp: e.maxHp * 0.2,
            atk: e.atk * 0.5,
            speed: e.speed * 1.2,
            tier: 0,
            isBoss: false,
            alive: true,
            hitTimer: 0,
            slowFactor: 1,
            slowTimer: 0,
            deathTimer: 0,
            eliteType: null,
            eliteTimer: 0,
            chargeTimer: 0,
            chargeDirX: 0,
            chargeDirY: 0,
            isDeathBoss: false,
            displayName: null,
          });
        }
        break;
      }
      // shielded is passive (50% DR handled in damageEnemy)
    }
  }
}

// ---------------------------------------------------------------------------
// Enemy projectile update
// ---------------------------------------------------------------------------

function _updateEnemyProjectiles(state: SurvivorState, dt: number): void {
  const px = state.player.position.x;
  const py = state.player.position.y;

  for (const proj of state.enemyProjectiles) {
    proj.position.x += proj.velocity.x * dt;
    proj.position.y += proj.velocity.y * dt;
    proj.lifetime -= dt;

    // Hit player
    if (state.player.invincibilityTimer <= 0 && distSq(proj.position.x, proj.position.y, px, py) < 1.0) {
      let projDmg = proj.damage * SurvivorBalance.ENEMY_DAMAGE_TO_PLAYER_SCALE;
      if (state.activeLandmarkBuffs.has("camelot_shield")) projDmg *= 0.7;
      state.player.hp -= projDmg;
      state.player.invincibilityTimer = SurvivorBalance.PLAYER_INVINCIBILITY_TIME;
      _playerHitCallback?.();
      if (state.player.hp <= 0) {
        // Resurrection arcana check
        if (_hasArcana(state, "resurrection")) {
          state.player.hp = state.player.maxHp * 0.3;
          // Remove the arcana so it only works once
          const idx = state.arcana.findIndex((a) => a.specialRule === "resurrection");
          if (idx >= 0) state.arcana.splice(idx, 1);
        } else {
          state.player.hp = 0;
          state.gameOver = true;
        }
      }
      proj.lifetime = 0;
    }
  }
  state.enemyProjectiles = state.enemyProjectiles.filter((p) => p.lifetime > 0);
}

// ---------------------------------------------------------------------------
// Main update
// ---------------------------------------------------------------------------

export const SurvivorCombatSystem = {
  setDamageCallback(cb: DamageCallback): void { _damageCallback = cb; },
  setWeaponFxCallback(cb: WeaponFxCallback): void { _weaponFxCallback = cb; },
  setChainFxCallback(cb: ChainFxCallback): void { _chainFxCallback = cb; },
  setArcFxCallback(cb: ArcFxCallback): void { _arcFxCallback = cb; },
  setPlayerHitCallback(cb: PlayerHitCallback): void { _playerHitCallback = cb; },

  update(state: SurvivorState, dt: number): void {
    if (state.paused || state.levelUpPending || state.gameOver || state.victory) return;

    const px = state.player.position.x;
    const py = state.player.position.y;

    // Tick weapon cooldowns and fire
    for (const ws of state.weapons) {
      ws.cooldownTimer -= dt;
      if (ws.cooldownTimer <= 0) {
        const cd = getWeaponCooldown(ws, state.player, state);
        if (cd <= 0) {
          ws.cooldownTimer = 0.1 / state.player.attackSpeedMultiplier;
        } else {
          ws.cooldownTimer = cd;
        }
        fireWeapon(state, ws);
      }
    }

    // Update player projectiles
    for (const proj of state.projectiles) {
      proj.position.x += proj.velocity.x * dt;
      proj.position.y += proj.velocity.y * dt;
      proj.lifetime -= dt;

      for (const e of state.enemies) {
        if (!e.alive) continue;
        if (proj.hitEnemies.has(e.id)) continue;
        if (distSq(proj.position.x, proj.position.y, e.position.x, e.position.y) < proj.area * proj.area) {
          damageEnemy(state, e, proj.damage, proj.weaponId);
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

    // Elite abilities
    _updateEliteAbilities(state, dt);

    // Enemy projectiles
    _updateEnemyProjectiles(state, dt);

    // Enemy movement toward player (apply event speed multiplier)
    const eventSpeedMult = state.activeEvent?.enemySpeedMultiplier ?? 1;
    for (const e of state.enemies) {
      if (!e.alive) {
        e.deathTimer -= dt;
        continue;
      }
      e.hitTimer = Math.max(0, e.hitTimer - dt);
      e.slowTimer = Math.max(0, e.slowTimer - dt);
      if (e.slowTimer <= 0) e.slowFactor = 1;

      // Skip movement for charging enemies
      if (e.chargeTimer > 0) continue;

      const dx = px - e.position.x;
      const dy = py - e.position.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const spd = e.speed * e.slowFactor * eventSpeedMult * dt;
      e.position.x += (dx / len) * spd;
      e.position.y += (dy / len) * spd;
    }

    // Enemy separation
    const SEP_RADIUS = 0.8;
    const SEP_FORCE = 2.0;
    const SEP_R_SQ = SEP_RADIUS * SEP_RADIUS;
    for (let i = 0; i < state.enemies.length; i++) {
      const a = state.enemies[i];
      if (!a.alive) continue;
      for (let j = i + 1; j < state.enemies.length; j++) {
        const b = state.enemies[j];
        if (!b.alive) continue;
        const sdx = a.position.x - b.position.x;
        const sdy = a.position.y - b.position.y;
        const dSq = sdx * sdx + sdy * sdy;
        if (dSq < SEP_R_SQ && dSq > 0.001) {
          const d = Math.sqrt(dSq);
          const force = (1 - d / SEP_RADIUS) * SEP_FORCE * dt;
          const nx = sdx / d;
          const ny = sdy / d;
          a.position.x += nx * force * 0.5;
          a.position.y += ny * force * 0.5;
          b.position.x -= nx * force * 0.5;
          b.position.y -= ny * force * 0.5;
        }
      }
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
          let dmg = e.atk * SurvivorBalance.ENEMY_DAMAGE_TO_PLAYER_SCALE;
          if (state.activeLandmarkBuffs.has("camelot_shield")) dmg *= 0.7;
          state.player.hp -= dmg;
          state.player.invincibilityTimer = SurvivorBalance.PLAYER_INVINCIBILITY_TIME;
          _playerHitCallback?.();
          if (state.player.hp <= 0) {
            // Resurrection arcana
            if (_hasArcana(state, "resurrection")) {
              state.player.hp = state.player.maxHp * 0.3;
              const idx = state.arcana.findIndex((a) => a.specialRule === "resurrection");
              if (idx >= 0) state.arcana.splice(idx, 1);
            } else {
              state.player.hp = 0;
              state.gameOver = true;
            }
          }
          break;
        }
      }
    }

    // Player regen
    if (state.player.regenRate > 0 && state.player.hp < state.player.maxHp) {
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + state.player.regenRate * dt);
    }
  },
};
