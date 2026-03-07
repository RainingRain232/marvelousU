// ---------------------------------------------------------------------------
// Survivor pickup system — XP gem & treasure chest collection
// ---------------------------------------------------------------------------

import { SurvivorBalance } from "../config/SurvivorBalanceConfig";
import type { SurvivorState } from "../state/SurvivorState";

function distSq(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

type ChestCallback = ((type: string, value: number) => void) | null;
let _chestCallback: ChestCallback = null;

export const SurvivorPickupSystem = {
  setChestCallback(cb: ChestCallback): void { _chestCallback = cb; },

  update(state: SurvivorState, dt: number): void {
    if (state.paused || state.levelUpPending || state.gameOver) return;

    const px = state.player.position.x;
    const py = state.player.position.y;
    const pickupR = state.player.pickupRadius;
    const magnetR = pickupR + state.player.magnetRadius;
    const pickupRSq = pickupR * pickupR;
    const magnetRSq = magnetR * magnetR;

    // XP Gems
    for (const gem of state.gems) {
      if (!gem.alive) continue;
      const dSq = distSq(px, py, gem.position.x, gem.position.y);

      if (dSq < pickupRSq) {
        gem.alive = false;
        const xpGain = gem.value * state.player.xpMultiplier;
        state.xp += xpGain;

        while (state.xp >= state.xpToNext) {
          state.xp -= state.xpToNext;
          state.level++;
          state.xpToNext = Math.floor(SurvivorBalance.XP_BASE * Math.pow(SurvivorBalance.XP_SCALE, state.level - 1));
          state.levelUpPending = true;
        }
        continue;
      }

      if (dSq < magnetRSq) {
        const d = Math.sqrt(dSq);
        const speed = SurvivorBalance.GEM_DRIFT_SPEED * dt;
        const dx = px - gem.position.x;
        const dy = py - gem.position.y;
        gem.position.x += (dx / d) * speed;
        gem.position.y += (dy / d) * speed;
      }
    }

    // Treasure chests
    const chestPickupRSq = 2.0 * 2.0; // 2 tile pickup range
    for (const chest of state.chests) {
      if (!chest.alive) continue;
      const dSq = distSq(px, py, chest.position.x, chest.position.y);
      if (dSq < chestPickupRSq) {
        chest.alive = false;
        switch (chest.type) {
          case "gold":
            state.gold += chest.value;
            break;
          case "heal":
            state.player.hp = state.player.maxHp;
            break;
          case "bomb":
            // Kill all enemies on screen (within 20 tile radius)
            for (const e of state.enemies) {
              if (!e.alive) continue;
              if (distSq(px, py, e.position.x, e.position.y) < 400) {
                e.alive = false;
                e.deathTimer = 0.5;
                state.totalKills++;
                state.gems.push({
                  id: state.nextGemId++,
                  position: { x: e.position.x, y: e.position.y },
                  value: SurvivorBalance.GEM_VALUES[e.tier] ?? 1,
                  tier: e.tier,
                  alive: true,
                });
              }
            }
            break;
        }
        _chestCallback?.(chest.type, chest.value);
      }
    }

    // Cleanup
    state.gems = state.gems.filter((g) => g.alive);
    state.chests = state.chests.filter((c) => c.alive);
  },
};
