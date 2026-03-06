// JRPG turn-based battle state
import type { AbilityType, TurnBattleAction, TurnBattlePhase, UnitType } from "@/types";
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
  position: number;
  isDefending: boolean;
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
  round: number;
  encounterType: "random" | "dungeon" | "boss";
  canFlee: boolean;
  xpReward: number;
  goldReward: number;
  lootReward: RPGItem[];
  log: string[];
  battleContext?: { biome?: string; dungeonFloor?: number; dungeonName?: string };
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
    round: 1,
    encounterType,
    canFlee: encounterType !== "boss",
    xpReward,
    goldReward,
    lootReward,
    log: [],
  };
}
