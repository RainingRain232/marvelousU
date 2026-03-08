export interface ArenaTier {
  name: string;
  requiredLevel: number;
  betAmounts: number[];
  encounters: string[]; // encounter IDs
}

export const ARENA_TIERS: ArenaTier[] = [
  {
    name: "Bronze Arena",
    requiredLevel: 1,
    betAmounts: [50, 100],
    encounters: ["forest_wolves", "goblin_patrol", "bandit_ambush", "field_bandits"],
  },
  {
    name: "Silver Arena",
    requiredLevel: 10,
    betAmounts: [100, 200],
    encounters: ["orc_warband", "dark_knight_squad", "desert_raiders", "elite_mercenaries"],
  },
  {
    name: "Gold Arena",
    requiredLevel: 20,
    betAmounts: [200, 500],
    encounters: ["dungeon_demon_guard", "dungeon_golems", "dungeon_vampires", "warlock_coven"],
  },
];

export function getAvailableArenaTiers(avgPartyLevel: number): ArenaTier[] {
  return ARENA_TIERS.filter(t => avgPartyLevel >= t.requiredLevel);
}
