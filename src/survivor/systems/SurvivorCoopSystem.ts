// ---------------------------------------------------------------------------
// Survivor co-op system — second player on same field, shared XP gems
// ---------------------------------------------------------------------------

import { SurvivorBalance } from "../config/SurvivorBalanceConfig";
import type { SurvivorState, SurvivorCoopPlayer } from "../state/SurvivorState";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function distSq(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

// ---------------------------------------------------------------------------
// Co-op input processing
// ---------------------------------------------------------------------------

function _updateCoopMovement(state: SurvivorState, dt: number): void {
  const coop = state.coopPlayer;
  if (!coop) return;

  // Dash
  if (coop.dashTimer > 0) {
    coop.dashTimer -= dt;
    coop.position.x += coop.dashDirX * SurvivorBalance.DASH_SPEED * dt;
    coop.position.y += coop.dashDirY * SurvivorBalance.DASH_SPEED * dt;
    coop.invincibilityTimer = Math.max(coop.invincibilityTimer, SurvivorBalance.DASH_IFRAMES);
  } else {
    // Normal movement from co-op input
    let dx = 0;
    let dy = 0;
    if (state.coopInput.left) dx -= 1;
    if (state.coopInput.right) dx += 1;
    if (state.coopInput.up) dy -= 1;
    if (state.coopInput.down) dy += 1;

    if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;
      coop.position.x += dx * coop.speed * dt;
      coop.position.y += dy * coop.speed * dt;
    }
  }

  // Clamp to map
  coop.position.x = Math.max(0.5, Math.min(state.mapWidth - 0.5, coop.position.x));
  coop.position.y = Math.max(0.5, Math.min(state.mapHeight - 0.5, coop.position.y));

  // Tick timers
  if (coop.invincibilityTimer > 0) coop.invincibilityTimer -= dt;
  if (coop.dashCooldownTimer > 0) coop.dashCooldownTimer -= dt;

  // Regen
  if (coop.regenRate > 0 && coop.hp < coop.maxHp) {
    coop.hp = Math.min(coop.maxHp, coop.hp + coop.regenRate * dt);
  }
}

// ---------------------------------------------------------------------------
// Co-op gem pickup — second player also picks up gems, shared XP
// ---------------------------------------------------------------------------

function _updateCoopPickups(state: SurvivorState, _dt: number): void {
  const coop = state.coopPlayer;
  if (!coop) return;

  const px = coop.position.x;
  const py = coop.position.y;
  const pickupR = coop.pickupRadius;
  const magnetR = pickupR + coop.magnetRadius;
  const pickupRSq = pickupR * pickupR;
  const magnetRSq = magnetR * magnetR;

  for (const gem of state.gems) {
    if (!gem.alive) continue;
    const dSq = distSq(px, py, gem.position.x, gem.position.y);

    if (dSq < pickupRSq) {
      gem.alive = false;
      // Shared XP — both players benefit from XP gains via state.xp
      const xpGain = gem.value * coop.xpMultiplier;
      state.xp += xpGain;

      while (state.xp >= state.xpToNext) {
        state.xp -= state.xpToNext;
        state.level++;
        state.xpToNext = Math.floor(
          SurvivorBalance.XP_BASE * Math.pow(SurvivorBalance.XP_SCALE, state.level - 1),
        );
        state.levelUpPending = true;
      }
      continue;
    }

    // Magnet drift toward co-op player (if closer than primary player)
    if (dSq < magnetRSq) {
      const primaryDSq = distSq(state.player.position.x, state.player.position.y, gem.position.x, gem.position.y);
      if (dSq < primaryDSq) {
        const d = Math.sqrt(dSq);
        const speed = SurvivorBalance.GEM_DRIFT_SPEED * _dt;
        const gdx = px - gem.position.x;
        const gdy = py - gem.position.y;
        gem.position.x += (gdx / d) * speed;
        gem.position.y += (gdy / d) * speed;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Co-op contact damage
// ---------------------------------------------------------------------------

function _updateCoopContactDamage(state: SurvivorState, _dt: number): void {
  const coop = state.coopPlayer;
  if (!coop || coop.invincibilityTimer > 0) return;

  const px = coop.position.x;
  const py = coop.position.y;
  const contactRange = SurvivorBalance.ENEMY_CONTACT_RANGE;
  const contactRangeSq = contactRange * contactRange;

  for (const e of state.enemies) {
    if (!e.alive) continue;
    if (distSq(px, py, e.position.x, e.position.y) < contactRangeSq) {
      const dmg = e.atk * SurvivorBalance.ENEMY_DAMAGE_TO_PLAYER_SCALE;
      coop.hp -= dmg;
      coop.invincibilityTimer = SurvivorBalance.PLAYER_INVINCIBILITY_TIME;

      if (coop.hp <= 0) {
        coop.hp = 0;
        // Co-op player is "downed" — can revive by staying alive
        // (Don't trigger game over for co-op player death)
      }
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Revive downed co-op player (if primary player is alive and near)
// ---------------------------------------------------------------------------

function _updateCoopRevive(state: SurvivorState, dt: number): void {
  const coop = state.coopPlayer;
  if (!coop || coop.hp > 0) return;

  const px = state.player.position.x;
  const py = state.player.position.y;
  const d = Math.sqrt(distSq(px, py, coop.position.x, coop.position.y));

  // Within 3 tiles to revive — takes about 5 seconds proximity
  if (d < 3) {
    coop.hp += coop.maxHp * 0.2 * dt; // 20% per second = 5 seconds to full
    if (coop.hp > coop.maxHp * 0.5) {
      coop.hp = coop.maxHp * 0.5; // revive at 50%
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const SurvivorCoopSystem = {
  update(state: SurvivorState, dt: number): void {
    if (!state.coopEnabled || !state.coopPlayer) return;
    if (state.paused || state.levelUpPending || state.gameOver || state.victory) return;

    _updateCoopMovement(state, dt);
    _updateCoopPickups(state, dt);
    _updateCoopContactDamage(state, dt);
    _updateCoopRevive(state, dt);
  },

  /** Check if co-op is fully dead (both players downed) */
  isBothPlayersDead(state: SurvivorState): boolean {
    if (!state.coopEnabled || !state.coopPlayer) return state.player.hp <= 0;
    return state.player.hp <= 0 && state.coopPlayer.hp <= 0;
  },
};
