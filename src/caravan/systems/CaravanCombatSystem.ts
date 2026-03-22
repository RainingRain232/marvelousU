// ---------------------------------------------------------------------------
// Caravan combat — player auto-attack, escort combat, enemy attacks,
// knockback, threat targeting, crits
// ---------------------------------------------------------------------------

import { CaravanBalance } from "../config/CaravanBalanceConfig";
import { CaravanSFX } from "./CaravanSFX";
import type { CaravanState, CaravanEnemy, CaravanEscort } from "../state/CaravanState";

type DamageCallback = ((x: number, y: number, amount: number, isCrit: boolean) => void) | null;
type PlayerHitCallback = (() => void) | null;
type CaravanHitCallback = (() => void) | null;
type KillCallback = ((x: number, y: number, isBoss: boolean) => void) | null;
type ClearCallback = ((bonusGold: number) => void) | null;
type EscortDeathCallback = ((name: string) => void) | null;

let _damageCallback: DamageCallback = null;
let _playerHitCallback: PlayerHitCallback = null;
let _caravanHitCallback: CaravanHitCallback = null;
let _killCallback: KillCallback = null;
let _clearCallback: ClearCallback = null;
let _escortDeathCallback: EscortDeathCallback = null;

let _lastAliveCount = 0;

/** Damage variance: ±15% */
function _dmgVariance(): number {
  return 0.85 + Math.random() * 0.3;
}

/** Apply defense reduction */
function _applyDefense(rawDmg: number, defense: number): number {
  return Math.max(1, Math.round(rawDmg * Math.max(0.3, 1 - defense * 0.02)));
}

function dist(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

// ---------------------------------------------------------------------------
// Threat-based targeting: prefer enemies attacking the caravan or near it
// ---------------------------------------------------------------------------

function _bestTarget(
  state: CaravanState, x: number, y: number, maxRange: number,
): CaravanEnemy | null {
  let best: CaravanEnemy | null = null;
  let bestScore = -Infinity;
  const cx = state.caravan.position.x;
  const cy = state.caravan.position.y;

  for (const e of state.enemies) {
    if (!e.alive) continue;
    const d = dist(x, y, e.position.x, e.position.y);
    if (d > maxRange) continue;

    // Score: closer = higher, threatening caravan = bonus, boss = bonus
    let score = (maxRange - d) * 10;
    if (e.targetType === "caravan") score += 30;
    const dToCaravan = dist(e.position.x, e.position.y, cx, cy);
    if (dToCaravan < 3) score += 20; // near caravan = high threat
    if (e.isBoss) score += 15;
    // Prefer low-HP enemies (finishable)
    if (e.hp < e.maxHp * 0.3) score += 10;

    if (score > bestScore) {
      bestScore = score;
      best = e;
    }
  }
  return best;
}

function nearestAliveEnemy(state: CaravanState, x: number, y: number, maxRange: number): CaravanEnemy | null {
  let best: CaravanEnemy | null = null;
  let bestD: number = maxRange;
  for (const e of state.enemies) {
    if (!e.alive) continue;
    const d = dist(x, y, e.position.x, e.position.y);
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}

export const CaravanCombatSystem = {
  setDamageCallback(cb: DamageCallback): void { _damageCallback = cb; },
  setPlayerHitCallback(cb: PlayerHitCallback): void { _playerHitCallback = cb; },
  setCaravanHitCallback(cb: CaravanHitCallback): void { _caravanHitCallback = cb; },
  setKillCallback(cb: KillCallback): void { _killCallback = cb; },
  setClearCallback(cb: ClearCallback): void { _clearCallback = cb; },
  setEscortDeathCallback(cb: EscortDeathCallback): void { _escortDeathCallback = cb; },

  update(state: CaravanState, dt: number): void {
    if (state.phase !== "travel") return;

    _playerCombat(state, dt);
    _escortCombat(state, dt);
    _enemyCombat(state, dt);

    // Update hit timers
    for (const e of state.enemies) {
      if (e.hitTimer > 0) e.hitTimer -= dt;
      if (!e.alive && e.deathTimer > 0) e.deathTimer -= dt;
    }
    for (const esc of state.escorts) {
      if (esc.hitTimer > 0) esc.hitTimer -= dt;
    }

    // Remove fully dead enemies (after death animation)
    state.enemies = state.enemies.filter((e) => e.alive || e.deathTimer > 0);

    // Check if boss wave is cleared
    if (state.bossActive && !state.enemies.some((e) => e.alive && e.isBoss)) {
      state.bossActive = false;
    }

    // Check encounter clear: all enemies killed → bonus
    const currentAlive = state.enemies.filter((e) => e.alive).length;
    if (_lastAliveCount > 0 && currentAlive === 0) {
      const bonus = 15 + state.segment * 10;
      state.gold += bonus;
      state.totalGoldEarned += bonus;
      _clearCallback?.(bonus);
    }
    _lastAliveCount = currentAlive;
  },
};

// ---------------------------------------------------------------------------
// Player combat — threat-based targeting, scaling crits
// ---------------------------------------------------------------------------

function _playerCombat(state: CaravanState, dt: number): void {
  const p = state.player;
  p.attackTimer -= dt;
  if (p.attackTimer > 0) return;

  // Threat-based targeting for player
  const target = _bestTarget(state, p.position.x, p.position.y, p.range);
  if (!target) return;

  p.attackTimer = p.attackCooldown;

  // Crit: 15% base + 2% per level
  const critChance = 0.15 + p.level * 0.02;
  const isCrit = Math.random() < critChance;
  const critMult = 1.5 + p.level * 0.1;
  const baseDmg = Math.round(p.atk * p.atkBuffMult * _dmgVariance());
  const damage = isCrit ? Math.round(baseDmg * critMult) : baseDmg;
  _dealDamageToEnemy(state, target, damage, isCrit, p.position.x, p.position.y);
}

// ---------------------------------------------------------------------------
// Escort combat — with crits and range validation
// ---------------------------------------------------------------------------

function _escortCombat(state: CaravanState, dt: number): void {
  for (const escort of state.escorts) {
    if (!escort.alive) continue;
    escort.attackTimer -= dt;
    if (escort.attackTimer > 0) continue;

    const target = nearestAliveEnemy(state, escort.position.x, escort.position.y, escort.range);
    if (!target) continue;

    // Verify range
    const d = dist(escort.position.x, escort.position.y, target.position.x, target.position.y);
    if (d > escort.range) continue;

    escort.attackTimer = escort.attackCooldown;

    // Escorts have 12% crit chance
    const isCrit = Math.random() < 0.12;
    const baseDmg = Math.round(escort.atk * (escort.atkBuffMult ?? 1) * _dmgVariance());
    const damage = isCrit ? Math.round(baseDmg * 1.4) : baseDmg;
    _dealDamageToEnemy(state, target, damage, isCrit, escort.position.x, escort.position.y);
  }
}

// ---------------------------------------------------------------------------
// Enemy combat
// ---------------------------------------------------------------------------

function _enemyCombat(state: CaravanState, dt: number): void {
  for (const enemy of state.enemies) {
    if (!enemy.alive) continue;
    if (enemy.stunTimer > 0) continue; // stunned enemies can't attack
    enemy.attackTimer -= dt;
    if (enemy.attackTimer > 0) continue;

    const px = state.player.position.x;
    const py = state.player.position.y;
    const cx = state.caravan.position.x;
    const cy = state.caravan.position.y;
    const ex = enemy.position.x;
    const ey = enemy.position.y;

    const dPlayer = dist(ex, ey, px, py);
    const dCaravan = dist(ex, ey, cx, cy);

    // Find closest escort
    let closestEscort: CaravanEscort | null = null;
    let dEscort = Infinity;
    for (const esc of state.escorts) {
      if (!esc.alive) continue;
      const d = dist(ex, ey, esc.position.x, esc.position.y);
      if (d < dEscort) {
        dEscort = d;
        closestEscort = esc;
      }
    }

    const range = enemy.range;

    // Priority: caravan first (they want to destroy cargo), then nearest
    const targets: { type: "player" | "caravan" | "escort"; d: number }[] = [];
    // Weight caravan higher — enemies prefer attacking the wagon
    targets.push({ type: "caravan", d: dCaravan * 0.8 }); // artificial weight
    targets.push({ type: "player", d: dPlayer });
    if (closestEscort) targets.push({ type: "escort", d: dEscort });
    targets.sort((a, b) => a.d - b.d);

    let attacked = false;
    for (const t of targets) {
      // Use actual distances for range check
      const actualD = t.type === "caravan" ? dCaravan : t.type === "player" ? dPlayer : dEscort;
      if (actualD > range) continue;

      if (t.type === "player" && state.player.invincibilityTimer <= 0) {
        enemy.attackTimer = enemy.attackCooldown;
        const dmg = _applyDefense(Math.round(enemy.atk * _dmgVariance()), state.defense);
        state.player.hp -= dmg;
        _damageCallback?.(px, py, dmg, false);
        _playerHitCallback?.();
        state.player.invincibilityTimer = CaravanBalance.PLAYER_INVINCIBILITY_TIME;
        if (state.player.hp <= 0) {
          state.player.hp = 0;
          state.gameOver = true;
          state.defeatReason = "hero_died";
        }
        attacked = true;
        break;
      } else if (t.type === "caravan") {
        enemy.attackTimer = enemy.attackCooldown;
        const cdmg = _applyDefense(Math.round(enemy.atk * _dmgVariance()), state.defense);
        state.caravan.hp -= cdmg;
        _damageCallback?.(cx, cy, cdmg, false);
        _caravanHitCallback?.();
        if (state.caravan.hp <= 0) {
          state.caravan.hp = 0;
          state.gameOver = true;
          state.defeatReason = "caravan_destroyed";
        }
        attacked = true;
        break;
      } else if (t.type === "escort" && closestEscort) {
        enemy.attackTimer = enemy.attackCooldown;
        closestEscort.hp -= enemy.atk;
        closestEscort.hitTimer = CaravanBalance.HIT_FLASH_DURATION;
        _damageCallback?.(closestEscort.position.x, closestEscort.position.y, enemy.atk, false);
        if (closestEscort.hp <= 0) {
          closestEscort.hp = 0;
          closestEscort.alive = false;
          CaravanSFX.escortDeath();
          _escortDeathCallback?.(closestEscort.def.name);
        }
        attacked = true;
        break;
      }
    }

    // Update movement target
    if (!attacked) {
      // Default to caravan (primary objective)
      enemy.targetType = "caravan";
      enemy.targetId = null;
      // But if an escort/player is blocking the path, aggro them
      if (dPlayer < dCaravan && dPlayer < 4) {
        enemy.targetType = "player";
      } else if (closestEscort && dEscort < dCaravan && dEscort < 3) {
        enemy.targetType = "escort";
        enemy.targetId = closestEscort.id;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Damage dealing with knockback
// ---------------------------------------------------------------------------

function _dealDamageToEnemy(
  state: CaravanState, enemy: CaravanEnemy, damage: number, isCrit: boolean,
  attackerX: number, attackerY: number,
): void {
  enemy.hp -= damage;
  enemy.hitTimer = CaravanBalance.HIT_FLASH_DURATION;
  _damageCallback?.(enemy.position.x, enemy.position.y, damage, isCrit);

  // Knockback — push enemy away from attacker
  const dx = enemy.position.x - attackerX;
  const dy = enemy.position.y - attackerY;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d > 0.01) {
    const knockStrength = isCrit ? 0.5 : 0.2;
    const bossResist = enemy.isBoss ? 0.3 : 1.0;
    enemy.position.x += (dx / d) * knockStrength * bossResist;
    enemy.position.y += (dy / d) * knockStrength * bossResist;
    // Clamp to map
    enemy.position.x = Math.max(0.5, Math.min(state.mapWidth - 0.5, enemy.position.x));
    enemy.position.y = Math.max(0.5, Math.min(state.mapHeight - 0.5, enemy.position.y));
  }

  if (enemy.hp <= 0) {
    enemy.hp = 0;
    enemy.alive = false;
    enemy.deathTimer = CaravanBalance.DEATH_ANIM_DURATION;
    state.totalKills++;
    state.killStreak++;
    state.killStreakTimer = 3; // 3 seconds to continue streak
    _killCallback?.(enemy.position.x, enemy.position.y, enemy.isBoss);

    // Drop loot (streak bonus: +50% gold at 5+ streak)
    const streakBonus = state.killStreak >= 5 ? 1.5 : 1.0;
    const goldReward = Math.round((enemy.goldReward + state.segment * CaravanBalance.KILL_GOLD_PER_SEGMENT) * streakBonus);
    state.loot.push({
      id: state.nextLootId++,
      position: { x: enemy.position.x, y: enemy.position.y },
      value: goldReward,
      alive: true,
      lifetime: 8, // 8 seconds to collect
    });
  }
}
