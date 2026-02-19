// Projectile movement, collision, AoE damage, cleanup
import type { GameState } from "@sim/state/GameState";
import type { Projectile } from "@sim/entities/Projectile";
import { UnitState } from "@/types";
import { distanceSq } from "@sim/utils/math";
import { killUnit } from "@sim/systems/CombatSystem";
import { EventBus } from "@sim/core/EventBus";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Tile distance within which a projectile is considered to have "hit". */
const HIT_RADIUS = 0.4;
const HIT_RADIUS_SQ = HIT_RADIUS * HIT_RADIUS;

// ---------------------------------------------------------------------------
// Main system
// ---------------------------------------------------------------------------

export const ProjectileSystem = {
  update(state: GameState, dt: number): void {
    const toRemove: string[] = [];

    for (const proj of state.projectiles.values()) {
      _moveProjectile(proj, dt);

      const distToTargetSq = distanceSq(proj.position, proj.target);

      if (distToTargetSq <= HIT_RADIUS_SQ) {
        // Impact!
        _applyImpact(state, proj);
        toRemove.push(proj.id);
      }
    }

    for (const id of toRemove) {
      state.projectiles.delete(id);
    }
  },
};

// ---------------------------------------------------------------------------
// Movement
// ---------------------------------------------------------------------------

function _moveProjectile(proj: Projectile, dt: number): void {
  const dx = proj.target.x - proj.position.x;
  const dy = proj.target.y - proj.position.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist === 0) return;

  const step = proj.speed * dt;

  if (step >= dist) {
    // Snap to target this frame (avoid overshooting)
    proj.position.x = proj.target.x;
    proj.position.y = proj.target.y;
  } else {
    const nx = dx / dist;
    const ny = dy / dist;
    proj.position.x += nx * step;
    proj.position.y += ny * step;
  }
}

// ---------------------------------------------------------------------------
// Impact
// ---------------------------------------------------------------------------

function _applyImpact(state: GameState, proj: Projectile): void {
  if (proj.aoeRadius > 0) {
    _applyAoE(state, proj);
  } else {
    _applySingleHit(state, proj);
  }
}

function _applySingleHit(state: GameState, proj: Projectile): void {
  // Home-targeted projectile: damage the specific unit if still alive
  if (proj.targetId) {
    const target = state.units.get(proj.targetId);
    if (
      target &&
      target.state !== UnitState.DIE &&
      !proj.hitIds.has(target.id)
    ) {
      _damageUnit(state, proj, target.id, proj.damage);
    }
  }

  EventBus.emit("projectileHit", {
    projectileId: proj.id,
    targetId: proj.targetId ?? proj.id,
  });
}

function _applyAoE(state: GameState, proj: Projectile): void {
  const aoeRadiusSq = proj.aoeRadius * proj.aoeRadius;
  let primaryHitId = proj.targetId ?? proj.id;

  for (const unit of state.units.values()) {
    if (unit.state === UnitState.DIE) continue;
    if (proj.hitIds.has(unit.id)) continue;

    // Only damage enemies of the caster
    const caster = state.units.get(proj.ownerId);
    if (caster && unit.owner === caster.owner) continue;

    const dsq = distanceSq(proj.position, unit.position);
    if (dsq <= aoeRadiusSq) {
      _damageUnit(state, proj, unit.id, proj.damage);
      if (unit.id === proj.targetId) primaryHitId = unit.id;
    }
  }

  EventBus.emit("projectileHit", {
    projectileId: proj.id,
    targetId: primaryHitId,
  });
}

// ---------------------------------------------------------------------------
// Damage helper
// ---------------------------------------------------------------------------

function _damageUnit(
  state: GameState,
  proj: Projectile,
  unitId: string,
  damage: number,
): void {
  const unit = state.units.get(unitId);
  if (!unit || unit.state === UnitState.DIE) return;

  proj.hitIds.add(unitId);
  unit.hp -= damage;

  // Apply slow effect if the projectile carries one
  if (proj.slowDuration > 0) {
    unit.slowFactor = proj.slowFactor;
    // Refresh: always keep the longer remaining duration
    unit.slowTimer = Math.max(unit.slowTimer, proj.slowDuration);
  }

  EventBus.emit("unitDamaged", {
    unitId: unit.id,
    amount: damage,
    attackerId: proj.ownerId,
  });

  if (unit.hp <= 0) {
    unit.hp = 0;
    killUnit(unit, proj.ownerId);
  }
}
