// ---------------------------------------------------------------------------
// Survivor combat — weapon auto-fire, enemy AI, contact damage, arcana/synergy
// ---------------------------------------------------------------------------

import { SurvivorBalance } from "../config/SurvivorBalanceConfig";
import { WEAPON_DEFS, EVOLUTION_DEFS, SurvivorWeaponId } from "../config/SurvivorWeaponDefs";
import { ELITE_DEFS } from "../config/SurvivorEliteDefs";
import { SYNERGY_DEFS } from "../config/SurvivorSynergyDefs";
import { SurvivorChallengeSystem } from "./SurvivorChallengeSystem";
import { SurvivorFusionSystem } from "./SurvivorFusionSystem";
import { SurvivorBiomeSystem } from "./SurvivorBiomeSystem";
import type {
  SurvivorState,
  SurvivorEnemy,
  SurvivorWeaponState,
} from "../state/SurvivorState";

// ---------------------------------------------------------------------------
// Callbacks for VFX
// ---------------------------------------------------------------------------

type DamageCallback = ((x: number, y: number, amount: number, isCrit: boolean) => void) | null;
type WeaponFxCallback = ((x: number, y: number, color: number, radius: number, weaponId?: string) => void) | null;
type ChainFxCallback = ((points: { x: number; y: number }[], color: number) => void) | null;
type ArcFxCallback = ((sx: number, sy: number, tx: number, ty: number, color: number, area: number) => void) | null;
type PlayerHitCallback = (() => void) | null;
type BossKillCallback = ((enemy: SurvivorEnemy) => void) | null;

let _damageCallback: DamageCallback = null;
let _weaponFxCallback: WeaponFxCallback = null;
let _chainFxCallback: ChainFxCallback = null;
let _arcFxCallback: ArcFxCallback = null;
let _playerHitCallback: PlayerHitCallback = null;
let _bossKillCallback: BossKillCallback = null;

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
  // Giant Slayer arcana: +100% vs bosses/elites
  if (_hasArcana(state, "giant_slayer") && (enemy.isBoss || enemy.eliteType)) {
    amount *= 2.0;
  }

  // Synergy + arcana + fusion damage multipliers
  amount *= _getArcanaDamageMult(state);
  amount *= (1 + _getSynergyDamageBonus(state));
  amount *= (1 + SurvivorFusionSystem.getDamageBonus(state));

  // Excalibur's Blessing: +50% ATK near Sword in the Stone
  if (state.activeLandmarkBuffs.has("sword_stone")) amount *= 1.5;

  const isCrit = Math.random() < state.player.critChance;
  let finalDmg = isCrit ? amount * 2.5 : amount;

  // Shielded elites: shield absorbs damage before health
  if (enemy.shieldHp > 0) {
    if (finalDmg <= enemy.shieldHp) {
      enemy.shieldHp -= finalDmg;
      finalDmg = 0;
    } else {
      finalDmg -= enemy.shieldHp;
      enemy.shieldHp = 0;
    }
  }

  enemy.hp -= finalDmg;
  enemy.hitTimer = 0.1;
  state.totalDamageDealt += finalDmg;
  if (weaponId) {
    state.weaponDamageDealt[weaponId] = (state.weaponDamageDealt[weaponId] ?? 0) + finalDmg;
  }
  _damageCallback?.(enemy.position.x, enemy.position.y, finalDmg, isCrit);

  // Vampiric Aura: heal 3% of damage dealt (blocked by no-healing challenge)
  if (_hasArcana(state, "vampiric_aura") && !SurvivorChallengeSystem.isHealingDisabled(state)) {
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
      _bossKillCallback?.(enemy);
      return;
    }

    // Boss kill callback
    if (enemy.isBoss) {
      _bossKillCallback?.(enemy);
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

    // Challenge modifier: volatile corpses — enemies explode on death, can hurt player
    const challengeExplosion = SurvivorChallengeSystem.getExplosionOnDeath(state);
    if (challengeExplosion && !_hasArcana(state, "chain_explosion")) {
      const cExpDmg = enemy.maxHp * challengeExplosion.damagePct;
      const cNearby = enemiesInRadius(state, enemy.position.x, enemy.position.y, challengeExplosion.radius);
      for (const n of cNearby) {
        if (n.id === enemy.id || !n.alive) continue;
        n.hp -= cExpDmg;
        n.hitTimer = 0.1;
        _damageCallback?.(n.position.x, n.position.y, cExpDmg, false);
        if (n.hp <= 0) {
          n.alive = false;
          n.deathTimer = 0.8;
          state.totalKills++;
        }
      }
      // Also damages player if in range
      const pdx = state.player.position.x - enemy.position.x;
      const pdy = state.player.position.y - enemy.position.y;
      if (pdx * pdx + pdy * pdy < challengeExplosion.radius * challengeExplosion.radius) {
        if (state.player.invincibilityTimer <= 0) {
          state.player.hp -= cExpDmg * 0.5; // 50% to player
          state.player.invincibilityTimer = 0.2;
          _playerHitCallback?.();
        }
      }
      _weaponFxCallback?.(enemy.position.x, enemy.position.y, 0xff8844, challengeExplosion.radius);
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

// Minimum cooldown floor — prevents cooldowns from going negative or near-zero
// at high weapon levels, attack speed stacking, and arcana multipliers
const MIN_COOLDOWN = 0.1;

function getWeaponCooldown(ws: SurvivorWeaponState, player: SurvivorState["player"], state: SurvivorState): number {
  const arcanaMult = _getArcanaCooldownMult(state);
  // Wayland's Fury: +50% attack speed
  const waylandMult = state.activeLandmarkBuffs.has("wayland_fury") ? 1.5 : 1.0;
  const totalAtkSpeed = player.attackSpeedMultiplier * waylandMult;
  if (ws.evolved && ws.evolutionId) {
    const evoCd = EVOLUTION_DEFS[ws.evolutionId].cooldown / totalAtkSpeed * arcanaMult;
    return Math.max(MIN_COOLDOWN, evoCd);
  }
  const def = WEAPON_DEFS[ws.id];
  const baseCd = Math.max(MIN_COOLDOWN, def.baseCooldown - def.cooldownPerLevel * (ws.level - 1));
  return Math.max(MIN_COOLDOWN, baseCd / totalAtkSpeed * arcanaMult);
}

function getWeaponArea(ws: SurvivorWeaponState, player: SurvivorState["player"], state: SurvivorState): number {
  const arcanaMult = _getArcanaAreaMult(state);
  const synergyBonus = _getSynergyAreaBonus(state);
  const fusionBonus = SurvivorFusionSystem.getAreaBonus(state);
  if (ws.evolved && ws.evolutionId) {
    return EVOLUTION_DEFS[ws.evolutionId].area * player.areaMultiplier * arcanaMult * (1 + synergyBonus + fusionBonus);
  }
  const def = WEAPON_DEFS[ws.id];
  return (def.baseArea + def.areaPerLevel * (ws.level - 1)) * player.areaMultiplier * arcanaMult * (1 + synergyBonus + fusionBonus);
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
        // Blade Chalice fusion: spinning blade heals 2% of damage dealt
        if (ws.id === "spinning_blade" && SurvivorFusionSystem.hasFusion(state, "blade_chalice") && !SurvivorChallengeSystem.isHealingDisabled(state)) {
          state.player.hp = Math.min(state.player.maxHp, state.player.hp + damage * 0.02);
        }
      }
      if (enemies.length > 0) _weaponFxCallback?.(px, py, def.color, area, ws.id);
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
      _weaponFxCallback?.(first.position.x, first.position.y, def.color, 2, ws.id);
      chainPoints.push({ x: first.position.x, y: first.position.y });
      let prev = first;
      for (let i = 1; i < count; i++) {
        const next = nearestEnemyExcluding(state, prev.position.x, prev.position.y, area * 0.8, chainHitSet);
        if (!next) break;
        chainHitSet.add(next.id);
        damageEnemy(state, next, damage * 0.8, ws.id);
        _weaponFxCallback?.(next.position.x, next.position.y, def.color, 1.5, ws.id);
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
      if (enemies.length > 0) _weaponFxCallback?.(px, py, def.color, area, ws.id);
      break;
    }
    case "holy_circle": {
      const enemies = enemiesInRadius(state, px, py, area);
      for (const e of enemies) {
        damageEnemy(state, e, damage, ws.id);
      }
      if (enemies.length > 0) _weaponFxCallback?.(px, py, def.color, area, ws.id);
      break;
    }
    case "catapult_strike": {
      for (let i = 0; i < count; i++) {
        const target = nearestEnemy(state, px, py, 20);
        if (!target) break;
        const enemies = enemiesInRadius(state, target.position.x, target.position.y, area);
        for (const e of enemies) {
          damageEnemy(state, e, damage, ws.id);
          // Catapult Armor fusion: stun enemies on impact for 1.5s
          if (SurvivorFusionSystem.hasFusion(state, "catapult_armor")) {
            e.slowFactor = 0;
            e.slowTimer = Math.max(e.slowTimer, 1.5);
          }
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
      if (enemies.length > 0) _weaponFxCallback?.(px, py, def.color, area, ws.id);
      break;
    }
    case "rune_circle": {
      for (let i = 0; i < count; i++) {
        const ox = px + (Math.random() * 2 - 1) * 8;
        const oy = py + (Math.random() * 2 - 1) * 8;
        const enemies = enemiesInRadius(state, ox, oy, area);
        for (const e of enemies) {
          damageEnemy(state, e, damage, ws.id);
          // Arcane Lifesteal synergy: rune hits heal (blocked by no-healing challenge)
          if (_hasSynergy(state, "arcane_lifesteal") && !SurvivorChallengeSystem.isHealingDisabled(state)) {
            state.player.hp = Math.min(state.player.maxHp, state.player.hp + damage * 0.15);
          }
        }
        _weaponFxCallback?.(ox, oy, def.color, area, ws.id);
      }
      break;
    }
    case "soul_drain": {
      const healMult = _hasSynergy(state, "dark_arts") ? 0.45 : 0.3;
      const soulTomeBonus = SurvivorFusionSystem.hasFusion(state, "soul_tome") ? 2 : 0;
      const totalCount = count + soulTomeBonus;
      for (let i = 0; i < totalCount; i++) {
        const target = nearestEnemy(state, px, py, area);
        if (!target) break;
        damageEnemy(state, target, damage, ws.id);
        const healAmount = SurvivorChallengeSystem.filterHeal(state, damage * healMult);
        state.player.hp = Math.min(state.player.maxHp, state.player.hp + healAmount);
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

    // Tick charge timer — charger deals bonus damage on contact during charge
    if (e.chargeTimer > 0) {
      e.chargeTimer -= dt;
      e.position.x += e.chargeDirX * e.speed * 3 * dt;
      e.position.y += e.chargeDirY * e.speed * 3 * dt;

      // Charger bonus: deal 2x contact damage if colliding with player during charge
      if (e.eliteType === "charger" && state.player.invincibilityTimer <= 0) {
        const cdx = px - e.position.x;
        const cdy = py - e.position.y;
        if (cdx * cdx + cdy * cdy < 1.5 * 1.5) {
          const chargeDmg = e.atk * 2.0 * 0.5; // 2x base, scaled by ENEMY_DAMAGE_TO_PLAYER_SCALE
          state.player.hp -= chargeDmg;
          state.player.invincibilityTimer = 0.8;
          _playerHitCallback?.();
          if (state.player.hp <= 0) {
            if (_hasArcana(state, "resurrection")) {
              state.player.hp = state.player.maxHp * 0.3;
              const idx = state.arcana.findIndex((a) => a.specialRule === "resurrection");
              if (idx >= 0) state.arcana.splice(idx, 1);
            } else {
              state.player.hp = 0;
              state.gameOver = true;
            }
          }
          e.chargeTimer = 0; // stop charge after hit
        }
      }
      continue; // skip normal movement for charging enemies
    }

    e.eliteTimer -= dt;
    if (e.eliteTimer > 0) continue;

    const eliteDef = ELITE_DEFS[e.eliteType];
    e.eliteTimer = eliteDef.abilityCooldown;

    switch (e.eliteType) {
      case "charger": {
        // Lunge toward player at 3x speed for 0.3s with bonus damage on impact
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
        // Fire a projectile toward the player, then kite away
        const dx = px - e.position.x;
        const dy = py - e.position.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        // Fire projectile
        state.enemyProjectiles.push({
          id: state.nextEnemyProjId++,
          position: { x: e.position.x, y: e.position.y },
          velocity: { x: (dx / len) * 6, y: (dy / len) * 6 },
          damage: e.atk * 0.8,
          lifetime: 3,
        });
        // Kite: if player is close, push away (handled by retreating AI behavior)
        break;
      }
      case "shielded": {
        // Passive shield regen: regenerate 5% of max shield per cooldown tick
        const maxShield = e.maxHp * 0.3;
        if (e.shieldHp < maxShield) {
          e.shieldHp = Math.min(maxShield, e.shieldHp + maxShield * 0.05);
        }
        break;
      }
      case "summoner": {
        // Spawn 2-3 tier-0 minions nearby (count scales slightly with game time)
        const minionCount = 2 + (state.gameTime > 600 ? 1 : 0);
        for (let i = 0; i < minionCount; i++) {
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
            shieldHp: 0,
            isDeathBoss: false,
            displayName: null,
            aiBehavior: "direct",
            ambushRevealed: true,
            preferredRange: 0,
          });
        }
        break;
      }
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
  setBossKillCallback(cb: BossKillCallback): void { _bossKillCallback = cb; },

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

    // Enemy movement with varied AI behaviors (apply event + challenge + biome speed multipliers)
    const eventSpeedMult = state.activeEvent?.enemySpeedMultiplier ?? 1;
    const challengeSpeedMult = SurvivorChallengeSystem.getEnemySpeedMultiplier(state);
    const biomeSpeedMult = SurvivorBiomeSystem.getEnemySpeedMultiplier(state);
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
      const spd = e.speed * e.slowFactor * eventSpeedMult * challengeSpeedMult * biomeSpeedMult * dt;

      // Ambush behavior: stay hidden and don't move until player is within 5 tiles
      if (e.aiBehavior === "ambush" && !e.ambushRevealed) {
        if (len < 5) {
          e.ambushRevealed = true;
          // Burst of speed on reveal
          e.position.x += (dx / len) * spd * 2;
          e.position.y += (dy / len) * spd * 2;
        }
        continue; // stay still while hidden
      }

      let moveX = 0;
      let moveY = 0;

      switch (e.aiBehavior) {
        case "direct": {
          // Standard: walk straight toward player
          moveX = (dx / len) * spd;
          moveY = (dy / len) * spd;
          break;
        }
        case "flanking": {
          // Approach from the side: add a perpendicular component
          const perpX = -dy / len; // perpendicular to player direction
          const perpY = dx / len;
          // Use enemy ID to determine which side (deterministic per enemy)
          const side = (e.id % 2 === 0) ? 1 : -1;
          const flankWeight = len > 3 ? 0.6 : 0.1; // flank more when far, rush in when close
          moveX = ((dx / len) * (1 - flankWeight) + perpX * side * flankWeight) * spd;
          moveY = ((dy / len) * (1 - flankWeight) + perpY * side * flankWeight) * spd;
          break;
        }
        case "retreating": {
          // Back away when too close, approach when too far
          if (len < e.preferredRange) {
            // Retreat away from player
            moveX = -(dx / len) * spd;
            moveY = -(dy / len) * spd;
          } else if (len > e.preferredRange + 2) {
            // Approach to get into range
            moveX = (dx / len) * spd * 0.7;
            moveY = (dy / len) * spd * 0.7;
          }
          // else: stay roughly in place (small jitter)
          break;
        }
        case "circling": {
          // Circle the player at preferred range
          const perpX = -dy / len;
          const perpY = dx / len;
          const side = (e.id % 2 === 0) ? 1 : -1;
          // Radial component: approach or retreat to maintain preferred range
          let radialWeight = 0;
          if (len > e.preferredRange + 1) radialWeight = 0.8;
          else if (len < e.preferredRange - 1) radialWeight = -0.5;
          // Tangential component: circle around player
          const tangentWeight = 0.7;
          moveX = ((dx / len) * radialWeight + perpX * side * tangentWeight) * spd;
          moveY = ((dy / len) * radialWeight + perpY * side * tangentWeight) * spd;
          break;
        }
        case "pack": {
          // Move toward player but cluster with nearby same-behavior enemies
          // Find average position of nearby pack members
          let packX = 0, packY = 0, packCount = 0;
          for (const other of state.enemies) {
            if (!other.alive || other.id === e.id || other.aiBehavior !== "pack") continue;
            const odx = other.position.x - e.position.x;
            const ody = other.position.y - e.position.y;
            if (odx * odx + ody * ody < 25) { // within 5 tiles
              packX += other.position.x;
              packY += other.position.y;
              packCount++;
            }
          }
          if (packCount >= 2) {
            // Move toward midpoint between player and pack center
            packX /= packCount;
            packY /= packCount;
            const midX = (px + packX) * 0.5;
            const midY = (py + packY) * 0.5;
            const mdx = midX - e.position.x;
            const mdy = midY - e.position.y;
            const mlen = Math.sqrt(mdx * mdx + mdy * mdy) || 1;
            moveX = (mdx / mlen) * spd;
            moveY = (mdy / mlen) * spd;
          } else {
            // Not enough pack members, fall back to direct
            moveX = (dx / len) * spd;
            moveY = (dy / len) * spd;
          }
          break;
        }
        case "ambush": {
          // After reveal, rush the player at 1.5x speed
          moveX = (dx / len) * spd * 1.5;
          moveY = (dy / len) * spd * 1.5;
          break;
        }
        default: {
          moveX = (dx / len) * spd;
          moveY = (dy / len) * spd;
          break;
        }
      }

      e.position.x += moveX;
      e.position.y += moveY;
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

    // Player regen (blocked by no-healing challenge)
    if (state.player.regenRate > 0 && state.player.hp < state.player.maxHp && !SurvivorChallengeSystem.isHealingDisabled(state)) {
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + state.player.regenRate * dt);
    }
  },
};
