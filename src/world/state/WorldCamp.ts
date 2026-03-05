// Neutral camp (barbarian encounter) state for world mode.

import type { HexCoord } from "@world/hex/HexCoord";
import type { ArmyUnit } from "@world/state/WorldArmy";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WorldCamp {
  id: string;
  position: HexCoord;
  tier: 1 | 2 | 3;
  defenders: ArmyUnit[];
  goldReward: number;
  cleared: boolean;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createWorldCamp(
  id: string,
  position: HexCoord,
  tier: 1 | 2 | 3,
): WorldCamp {
  const defenders = _tierDefenders(tier);
  const goldReward = _tierGold(tier);

  return {
    id,
    position,
    tier,
    defenders,
    goldReward,
    cleared: false,
  };
}

// ---------------------------------------------------------------------------
// Tier definitions
// ---------------------------------------------------------------------------

function _tierDefenders(tier: 1 | 2 | 3): ArmyUnit[] {
  switch (tier) {
    case 1:
      return [{ unitType: "swordsman", count: 3, hpPerUnit: 100 }];
    case 2:
      return [
        { unitType: "swordsman", count: 5, hpPerUnit: 100 },
        { unitType: "archer", count: 2, hpPerUnit: 100 },
      ];
    case 3:
      return [
        { unitType: "swordsman", count: 4, hpPerUnit: 100 },
        { unitType: "archer", count: 3, hpPerUnit: 100 },
        { unitType: "knight", count: 1, hpPerUnit: 100 },
      ];
  }
}

function _tierGold(tier: 1 | 2 | 3): number {
  switch (tier) {
    case 1: return 75;
    case 2: return 150;
    case 3: return 300;
  }
}
