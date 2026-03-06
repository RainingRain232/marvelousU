// JRPG turn-based battle state
import type { AbilityType, TurnBattleAction, TurnBattlePhase, UnitType, UpgradeType } from "@/types";
import type { RPGItem, StatusEffect } from "./RPGState";

// ---------------------------------------------------------------------------
// Combatants
// ---------------------------------------------------------------------------

export interface TurnBattleCombatant {
  id: string;
  name: string;
  isPartyMember: boolean;
  unitType: UnitType;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  atk: number;
  def: number;
  speed: number;
  range: number;
  abilityTypes: AbilityType[];
  statusEffects: StatusEffect[];
  /** Chance (0–1) to block an incoming attack for zero damage. */
  blockChance: number;
  /** Bonus crit chance (0–1) added on top of the base CRITICAL_CHANCE. */
  critBonus: number;
  position: number;
  isDefending: boolean;
  /** Battle line: 1 = front, 2 = back */
  line: 1 | 2;
  /** Learned spells (UpgradeType keys) — copied from PartyMember.knownSpells. */
  knownSpells: UpgradeType[];
  /** True if this combatant was summoned during battle (temporary). */
  isSummoned: boolean;
  /** ID of the combatant who summoned this unit. */
  summonerId?: string;
}

// ---------------------------------------------------------------------------
// TurnBattleState
// ---------------------------------------------------------------------------

export interface TurnBattleState {
  phase: TurnBattlePhase;
  combatants: TurnBattleCombatant[];
  turnOrder: string[];
  currentTurnIndex: number;
  selectedAction: TurnBattleAction | null;
  selectedAbility: AbilityType | null;
  selectedTargetId: string | null;
  selectedItemId: string | null;
  round: number;
  encounterType: "random" | "dungeon" | "boss";
  canFlee: boolean;
  xpReward: number;
  goldReward: number;
  lootReward: RPGItem[];
  log: string[];
  battleContext?: { biome?: string; dungeonFloor?: number; dungeonName?: string };
  /** Current number of player-side summoned units. */
  playerSummonCount: number;
  /** Current number of enemy-side summoned units. */
  enemySummonCount: number;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createTurnBattleState(
  combatants: TurnBattleCombatant[],
  encounterType: "random" | "dungeon" | "boss",
  xpReward: number,
  goldReward: number,
  lootReward: RPGItem[],
): TurnBattleState {
  return {
    phase: "initiative" as TurnBattlePhase,
    combatants,
    turnOrder: [],
    currentTurnIndex: 0,
    selectedAction: null,
    selectedAbility: null,
    selectedTargetId: null,
    selectedItemId: null,
    round: 1,
    encounterType,
    canFlee: encounterType !== "boss",
    xpReward,
    goldReward,
    lootReward,
    log: [],
    playerSummonCount: 0,
    enemySummonCount: 0,
  };
}
