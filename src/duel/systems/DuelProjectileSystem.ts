// ---------------------------------------------------------------------------
// Duel mode – projectile system
// ---------------------------------------------------------------------------

import { AttackHeight, DuelFighterState } from "../../types";
import { DuelBalance } from "../config/DuelBalanceConfig";
import type {
  DuelMoveDef,
  DuelProjectile,
  DuelState,
} from "../state/DuelState";

export const DuelProjectileSystem = {
  /** Spawn a projectile from a fighter's special move. */
  spawn(
    state: DuelState,
    ownerId: number,
    move: DuelMoveDef,
  ): void {
    if (state.projectiles.length >= DuelBalance.MAX_PROJECTILES) return;

    const fighter = state.fighters[ownerId];
    const dir = fighter.facingRight ? 1 : -1;
    const speed = move.projectileSpeed ?? 5;

    const proj: DuelProjectile = {
      id: state.nextProjectileId++,
      ownerId,
      moveId: move.id,
      position: {
        x: fighter.position.x + dir * (move.hitbox.x + 10),
        y: fighter.position.y + move.hitbox.y,
      },
      velocity: { x: dir * speed, y: 0 },
      hitbox: {
        x: 0,
        y: 0,
        width: move.hitbox.width,
        height: move.hitbox.height,
      },
      damage: move.damage,
      chipDamage: move.chipDamage,
      height: move.projectileHeight ?? AttackHeight.MID,
      hitstun: move.hitstun,
      blockstun: move.blockstun,
      knockback: move.knockback,
      lifetime: 180, // 3 seconds at 60fps
      active: true,
    };

    state.projectiles.push(proj);
  },

  /** Update all projectiles and check for hits. */
  update(state: DuelState): void {
    for (let i = state.projectiles.length - 1; i >= 0; i--) {
      const proj = state.projectiles[i];
      if (!proj.active) {
        state.projectiles.splice(i, 1);
        continue;
      }

      // Move
      proj.position.x += proj.velocity.x;
      proj.position.y += proj.velocity.y;
      proj.lifetime--;

      // Off-screen or expired
      if (
        proj.lifetime <= 0 ||
        proj.position.x < DuelBalance.STAGE_LEFT - DuelBalance.PROJECTILE_DESPAWN_X ||
        proj.position.x > DuelBalance.STAGE_RIGHT + DuelBalance.PROJECTILE_DESPAWN_X
      ) {
        state.projectiles.splice(i, 1);
        continue;
      }

      // Check collision with opponent
      const targetIdx = proj.ownerId === 0 ? 1 : 0;
      const target = state.fighters[targetIdx];

      if (target.invincibleFrames > 0) continue;
      if (
        target.state === DuelFighterState.KNOCKDOWN ||
        target.state === DuelFighterState.VICTORY ||
        target.state === DuelFighterState.DEFEAT
      ) continue;

      if (_projectileHits(proj, target)) {
        _applyProjectileHit(state, proj, target, targetIdx);
        state.projectiles.splice(i, 1);
      }
    }
  },
};

function _projectileHits(proj: DuelProjectile, target: { position: { x: number; y: number }; state: DuelFighterState }): boolean {
  const px = proj.position.x;
  const py = proj.position.y;
  const pw = proj.hitbox.width;
  const ph = proj.hitbox.height;

  const isCrouching =
    target.state === DuelFighterState.CROUCH ||
    target.state === DuelFighterState.CROUCH_IDLE ||
    target.state === DuelFighterState.BLOCK_CROUCH;
  const hurtH = isCrouching ? DuelBalance.CROUCH_HURTBOX_H : DuelBalance.STAND_HURTBOX_H;
  const hurtW = DuelBalance.STAND_HURTBOX_W;

  const tx = target.position.x - hurtW / 2;
  const ty = target.position.y - hurtH;

  return (
    px + pw / 2 > tx &&
    px - pw / 2 < tx + hurtW &&
    py + ph / 2 > ty &&
    py - ph / 2 < ty + hurtH
  );
}

function _applyProjectileHit(
  state: DuelState,
  proj: DuelProjectile,
  target: import("../state/DuelState").DuelFighter,
  _targetIdx: number,
): void {
  const isBlocking = _isBlockingProjectile(target, proj);

  if (isBlocking) {
    target.blockstunFrames = proj.blockstun;
    target.hp -= proj.chipDamage;
    target.state = target.state === DuelFighterState.BLOCK_CROUCH
      ? DuelFighterState.BLOCK_CROUCH
      : DuelFighterState.BLOCK_STAND;
  } else {
    const attacker = state.fighters[proj.ownerId];
    const scaling = attacker.comboDamageScaling;
    target.hp -= Math.max(1, Math.round(proj.damage * scaling));
    target.hitstunFrames = proj.hitstun;
    target.state = DuelFighterState.HIT_STUN;
    target.currentMove = null;

    // Knockback
    const dir = proj.velocity.x > 0 ? 1 : -1;
    target.position.x += dir * proj.knockback;
    target.position.x = Math.max(
      DuelBalance.STAGE_LEFT,
      Math.min(DuelBalance.STAGE_RIGHT, target.position.x),
    );

    // Combo tracking
    attacker.comboCount++;
    attacker.comboDamageScaling = Math.max(
      DuelBalance.MIN_DAMAGE_SCALING,
      attacker.comboDamageScaling * DuelBalance.COMBO_DAMAGE_SCALING,
    );

    // Hit freeze
    state.slowdownFrames = DuelBalance.HIT_FREEZE_FRAMES;
  }
}

function _isBlockingProjectile(
  target: import("../state/DuelState").DuelFighter,
  proj: DuelProjectile,
): boolean {
  if (target.state === DuelFighterState.BLOCK_STAND) {
    return proj.height !== AttackHeight.LOW;
  }
  if (target.state === DuelFighterState.BLOCK_CROUCH) {
    return proj.height !== AttackHeight.HIGH && proj.height !== AttackHeight.OVERHEAD;
  }
  return false;
}
