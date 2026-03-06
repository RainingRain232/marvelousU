import type { RPGState } from "@rpg/state/RPGState";
import { getAvailableArenaTiers } from "@rpg/config/ArenaDefs";
import { SeededRandom } from "@sim/utils/random";

export function canFightInArena(rpg: RPGState): boolean {
  return rpg.arenaFightsLeft > 0;
}

export function getArenaEncounter(rpg: RPGState, tierIndex: number, betAmount: number): { encounterId: string; bet: number } | null {
  const avgLevel = rpg.party.length > 0
    ? Math.round(rpg.party.reduce((s, m) => s + m.level, 0) / rpg.party.length)
    : 1;
  const tiers = getAvailableArenaTiers(avgLevel);
  if (tierIndex >= tiers.length) return null;
  const tier = tiers[tierIndex];
  if (!tier.betAmounts.includes(betAmount)) return null;
  if (rpg.gold < betAmount) return null;

  const rng = new SeededRandom(rpg.seed + rpg.gameTime + betAmount);
  const encounterId = rng.pick(tier.encounters);
  return { encounterId, bet: betAmount };
}

export function applyArenaResult(rpg: RPGState, bet: number, victory: boolean): void {
  rpg.arenaFightsLeft--;
  if (victory) {
    rpg.gold += bet; // net gain = bet (already paid bet, now get 2x)
  }
  // If defeat, gold was already deducted before the fight
}
