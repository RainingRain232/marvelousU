// ---------------------------------------------------------------------------
// Survivor pickup system — XP gem collection
// ---------------------------------------------------------------------------

import { SurvivorBalance } from "../config/SurvivorBalanceConfig";
import type { SurvivorState } from "../state/SurvivorState";

function distSq(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export const SurvivorPickupSystem = {
  update(state: SurvivorState, dt: number): void {
    if (state.paused || state.levelUpPending || state.gameOver) return;

    const px = state.player.position.x;
    const py = state.player.position.y;
    const pickupR = state.player.pickupRadius;
    const magnetR = pickupR + state.player.magnetRadius;
    const pickupRSq = pickupR * pickupR;
    const magnetRSq = magnetR * magnetR;

    for (const gem of state.gems) {
      if (!gem.alive) continue;
      const dSq = distSq(px, py, gem.position.x, gem.position.y);

      // Pickup
      if (dSq < pickupRSq) {
        gem.alive = false;
        const xpGain = gem.value * state.player.xpMultiplier;
        state.xp += xpGain;

        // Check level up
        while (state.xp >= state.xpToNext) {
          state.xp -= state.xpToNext;
          state.level++;
          state.xpToNext = Math.floor(SurvivorBalance.XP_BASE * Math.pow(SurvivorBalance.XP_SCALE, state.level - 1));
          state.levelUpPending = true;
        }
        continue;
      }

      // Magnet drift
      if (dSq < magnetRSq) {
        const d = Math.sqrt(dSq);
        const speed = SurvivorBalance.GEM_DRIFT_SPEED * dt;
        const dx = px - gem.position.x;
        const dy = py - gem.position.y;
        gem.position.x += (dx / d) * speed;
        gem.position.y += (dy / d) * speed;
      }
    }

    // Cleanup collected gems
    state.gems = state.gems.filter((g) => g.alive);
  },
};
