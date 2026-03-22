// ---------------------------------------------------------------------------
// Caravan ability system — active player abilities with effects
// ---------------------------------------------------------------------------

import type { CaravanState, CaravanEnemy } from "../state/CaravanState";
import type { AbilityId } from "../config/CaravanHeroDefs";
import { CaravanBalance } from "../config/CaravanBalanceConfig";

type AbilityFxCallback = ((id: AbilityId, x: number, y: number) => void) | null;
let _fxCallback: AbilityFxCallback = null;

function dist(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

export const CaravanAbilitySystem = {
  setFxCallback(cb: AbilityFxCallback): void { _fxCallback = cb; },

  /** Tick cooldowns each frame */
  update(state: CaravanState, dt: number): void {
    for (const ab of state.player.abilities) {
      if (ab.cooldownTimer > 0) ab.cooldownTimer -= dt;
    }
    // Buff timers
    if (state.player.atkBuffTimer > 0) {
      state.player.atkBuffTimer -= dt;
      if (state.player.atkBuffTimer <= 0) state.player.atkBuffMult = 1;
    }
    for (const esc of state.escorts) {
      if (esc.atkBuffTimer > 0) {
        esc.atkBuffTimer -= dt;
        if (esc.atkBuffTimer <= 0) esc.atkBuffMult = 1;
      }
    }
    // Stun timers
    for (const e of state.enemies) {
      if (e.stunTimer > 0) e.stunTimer -= dt;
    }
  },

  /** Try to activate ability by index (0 or 1) */
  activate(state: CaravanState, index: number): boolean {
    if (index < 0 || index >= state.player.abilities.length) return false;
    const ab = state.player.abilities[index];
    if (ab.cooldownTimer > 0) return false;

    ab.cooldownTimer = ab.def.cooldown;
    _applyAbility(state, ab.def.id);
    _fxCallback?.(ab.def.id, state.player.position.x, state.player.position.y);
    return true;
  },
};

/** Handle ability kill — drops loot with 1.5x ability bonus */
function _abilityKillCheck(state: CaravanState, e: CaravanEnemy): void {
  if (e.hp <= 0 && e.alive) {
    e.hp = 0;
    e.alive = false;
    e.deathTimer = 0.4;
    state.totalKills++;
    state.killStreak++;
    state.killStreakTimer = 3;
    // Ability kills grant 1.5x gold
    const baseGold = e.goldReward + state.segment * CaravanBalance.KILL_GOLD_PER_SEGMENT;
    const abilityBonus = 1.5;
    const streakBonus = state.killStreak >= 5 ? 1.5 : 1.0;
    const gold = Math.round(baseGold * abilityBonus * streakBonus);
    state.loot.push({
      id: state.nextLootId++,
      position: { x: e.position.x, y: e.position.y },
      value: gold,
      alive: true,
      lifetime: 8,
    });
  }
}

function _applyAbility(state: CaravanState, id: AbilityId): void {
  const px = state.player.position.x;
  const py = state.player.position.y;
  const lvl = state.player.level;
  const atkScale = 1 + (lvl - 1) * 0.12; // +12% damage per level

  switch (id) {
    case "war_cry": {
      // Buff all escorts ATK (scales with level)
      const buffMult = 1.5 + lvl * 0.05;
      const buffDur = 5 + lvl * 0.5;
      for (const esc of state.escorts) {
        if (!esc.alive) continue;
        esc.atkBuffTimer = buffDur;
        esc.atkBuffMult = buffMult;
      }
      state.player.atkBuffTimer = buffDur;
      state.player.atkBuffMult = buffMult;
      break;
    }

    case "shield_bash": {
      // AoE knockback + stun enemies within 2.5 tiles
      const range = 2.5;
      for (const e of state.enemies) {
        if (!e.alive) continue;
        const d = dist(px, py, e.position.x, e.position.y);
        if (d > range) continue;
        // Knockback
        const dx = e.position.x - px;
        const dy = e.position.y - py;
        if (d > 0.01) {
          const push = e.isBoss ? 1.0 : 2.0;
          e.position.x += (dx / d) * push;
          e.position.y += (dy / d) * push;
        }
        // Stun
        e.stunTimer = e.isBoss ? 0.5 : 1.5;
        // Damage scales with level
        e.hp -= Math.round(state.player.atk * 0.5 * atkScale);
        _abilityKillCheck(state, e);
      }
      break;
    }

    case "arrow_volley": {
      // Hit all enemies in range for 2x damage
      const range = state.player.range;
      for (const e of state.enemies) {
        if (!e.alive) continue;
        const d = dist(px, py, e.position.x, e.position.y);
        if (d > range) continue;
        const dmg = Math.round(state.player.atk * 2 * atkScale);
        e.hp -= dmg;
        e.hitTimer = 0.15;
        _abilityKillCheck(state, e);
      }
      break;
    }

    case "fireball": {
      // Find nearest enemy, AoE explosion around them
      let nearest = state.enemies.find((e) => e.alive);
      let bestD = Infinity;
      for (const e of state.enemies) {
        if (!e.alive) continue;
        const d = dist(px, py, e.position.x, e.position.y);
        if (d < bestD) { bestD = d; nearest = e; }
      }
      if (nearest && nearest.alive) {
        const tx = nearest.position.x;
        const ty = nearest.position.y;
        const aoeRange = 2.5;
        for (const e of state.enemies) {
          if (!e.alive) continue;
          const d = dist(tx, ty, e.position.x, e.position.y);
          if (d > aoeRange) continue;
          const dmg = Math.round(state.player.atk * 3 * atkScale * (1 - d / aoeRange * 0.5));
          e.hp -= dmg;
          e.hitTimer = 0.2;
          _abilityKillCheck(state, e);
        }
      }
      break;
    }

    case "heal_aura": {
      // Heal caravan 50 HP + all escorts 30%
      state.caravan.hp = Math.min(state.caravan.maxHp, state.caravan.hp + 50);
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + 30);
      for (const esc of state.escorts) {
        if (!esc.alive) continue;
        esc.hp = Math.min(esc.maxHp, esc.hp + Math.round(esc.maxHp * 0.3));
      }
      break;
    }

    case "holy_smite": {
      // Massive single-target: 5x damage to nearest
      let nearest = state.enemies.find((e) => e.alive);
      let bestD = Infinity;
      for (const e of state.enemies) {
        if (!e.alive) continue;
        const d = dist(px, py, e.position.x, e.position.y);
        if (d < bestD) { bestD = d; nearest = e; }
      }
      if (nearest && nearest.alive) {
        const dmg = Math.round(state.player.atk * 5 * atkScale);
        nearest.hp -= dmg;
        nearest.hitTimer = 0.3;
        _abilityKillCheck(state, nearest);
      }
      break;
    }
  }
}
