// Gladiator progression — arena-specific XP and rank titles
import type { PartyMember } from "@rpg/state/RPGState";
import { RPGBalance } from "@rpg/config/RPGBalanceConfig";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ARENA_XP_MULTIPLIER = 1.5;
const LOSS_XP_FRACTION = 0.3;

// ---------------------------------------------------------------------------
// Arena XP
// ---------------------------------------------------------------------------

export interface ArenaXPResult {
  name: string;
  xpGained: number;
  leveledUp: boolean;
  newLevel: number;
}

export function applyArenaXP(
  party: PartyMember[],
  baseXP: number,
  won: boolean,
): ArenaXPResult[] {
  const results: ArenaXPResult[] = [];
  const xpTotal = Math.floor(baseXP * ARENA_XP_MULTIPLIER * (won ? 1 : LOSS_XP_FRACTION));
  const xpEach = Math.ceil(xpTotal / Math.max(1, party.length));

  for (const member of party) {
    if (member.level >= RPGBalance.MAX_LEVEL) {
      member.masteryPoints += xpEach;
      results.push({ name: member.name, xpGained: xpEach, leveledUp: false, newLevel: member.level });
      continue;
    }

    const prevLevel = member.level;
    member.xp += xpEach;
    member.battlesFought++;

    // Level-up loop (same formula as TurnBattleSystem._applyLevelUp)
    while (member.xp >= member.xpToNext && member.level < RPGBalance.MAX_LEVEL) {
      member.xp -= member.xpToNext;
      member.level++;
      member.maxHp = Math.ceil(member.maxHp * (1 + RPGBalance.LEVEL_STAT_GROWTH));
      member.atk = Math.ceil(member.atk * (1 + RPGBalance.LEVEL_STAT_GROWTH));
      member.def = Math.ceil(member.def * (1 + RPGBalance.LEVEL_STAT_GROWTH));
      member.xpToNext = Math.ceil(member.xpToNext * RPGBalance.XP_SCALE_FACTOR);
      member.hp = member.maxHp; // full restore on level-up
    }

    results.push({
      name: member.name,
      xpGained: xpEach,
      leveledUp: member.level > prevLevel,
      newLevel: member.level,
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Arena rank
// ---------------------------------------------------------------------------

export function getArenaRank(battlesFought: number): string {
  if (battlesFought >= 100) return "Champion";
  if (battlesFought >= 50) return "Veteran";
  if (battlesFought >= 25) return "Gladiator";
  if (battlesFought >= 10) return "Fighter";
  return "Novice";
}
