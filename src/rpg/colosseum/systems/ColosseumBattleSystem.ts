// Colosseum battle system — creates battles from two teams, runs auto-battle
// Reuses TurnBattleSystem heavily.
import { TurnBattleAction, TurnBattlePhase } from "@/types";
import type { TurnBattleState, TurnBattleCombatant } from "@rpg/state/TurnBattleState";
import { createTurnBattleState } from "@rpg/state/TurnBattleState";
import type { PartyMember } from "@rpg/state/RPGState";
import {
  calculateInitiative,
  executeAction,
  executeEnemyTurn,
  advanceTurn,
  getValidTargets,
  isHealAbility,
} from "@rpg/systems/TurnBattleSystem";
import { getUnitElement } from "@rpg/config/ElementDefs";
import type { ColosseumTeam, ColosseumRuleset } from "../state/ColosseumState";

// ---------------------------------------------------------------------------
// PartyMember → TurnBattleCombatant (duplicated from TurnBattleSystem._partyToCombatant)
// ---------------------------------------------------------------------------

function _memberToCombatant(
  member: PartyMember,
  position: number,
  line: 1 | 2,
  isPartyMember: boolean,
): TurnBattleCombatant {
  // Compute equipment bonuses
  let atk = member.atk;
  let def = member.def;
  let speed = member.speed;
  let block = 0;
  let critBonus = 0;
  for (const item of Object.values(member.equipment)) {
    if (item?.stats.atk) atk += item.stats.atk;
    if (item?.stats.def) def += item.stats.def;
    if (item?.stats.speed) speed += item.stats.speed;
    if (item?.stats.block) block += item.stats.block;
    if (item?.stats.critChance) critBonus += item.stats.critChance;
  }
  block = Math.min(block, 0.5);
  critBonus += member.bonusCritChance;

  return {
    id: member.id,
    name: member.name,
    isPartyMember,
    unitType: member.unitType,
    hp: member.hp,
    maxHp: member.maxHp,
    mp: member.mp,
    maxMp: member.maxMp,
    atk,
    def,
    speed,
    range: member.range,
    abilityTypes: member.abilityTypes,
    statusEffects: [...member.statusEffects],
    blockChance: block,
    critBonus,
    position,
    isDefending: false,
    line,
    knownSpells: [...(member.knownSpells ?? [])],
    isSummoned: false,
    element: getUnitElement(member.unitType),
    limitGauge: 0,
    threat: 0,
    counterReady: false,
    tauntTurns: 0,
  };
}

// ---------------------------------------------------------------------------
// Create battle from two teams
// ---------------------------------------------------------------------------

export function createBattleFromTeams(
  team1: ColosseumTeam,
  team2: ColosseumTeam,
  _isPlayerMatch: boolean,
  ruleset: ColosseumRuleset,
): TurnBattleState {
  const combatants: TurnBattleCombatant[] = [];

  // Team 1 (party side = isPartyMember: true)
  const t1Members = ruleset.singleUnit ? [team1.members[0]] : team1.members;
  for (let i = 0; i < t1Members.length; i++) {
    const m = t1Members[i];
    const line = team1.formation[m.id] ?? (m.range <= 1 ? 1 : 2) as 1 | 2;
    combatants.push(_memberToCombatant(m, i, line, true));
  }

  // Team 2 (enemy side = isPartyMember: false)
  const t2Members = ruleset.singleUnit ? [team2.members[0]] : team2.members;
  for (let i = 0; i < t2Members.length; i++) {
    const m = t2Members[i];
    const line = team2.formation[m.id] ?? (m.range <= 1 ? 1 : 2) as 1 | 2;
    const c = _memberToCombatant(m, i, line, false);

    // Apply handicap
    if (ruleset.handicap !== 1.0) {
      c.atk = Math.floor(c.atk * ruleset.handicap);
      c.def = Math.floor(c.def * ruleset.handicap);
      c.maxHp = Math.floor(c.maxHp * ruleset.handicap);
      c.hp = c.maxHp;
    }

    combatants.push(c);
  }

  const state = createTurnBattleState(combatants, "random", 0, 0, []);
  state.canFlee = false; // No fleeing in the colosseum

  return state;
}

// ---------------------------------------------------------------------------
// Auto-battle (reuses RPGBoot._runAutoBattle pattern)
// ---------------------------------------------------------------------------

export function runColosseumAutoBattle(
  battle: TurnBattleState,
): { winningSide: "team1" | "team2"; turns: number } {
  calculateInitiative(battle);

  let turns = 0;
  while (turns < 200) {
    const p = battle.phase as string;
    if (p === TurnBattlePhase.VICTORY || p === TurnBattlePhase.DEFEAT || p === TurnBattlePhase.FLED) break;

    const currentId = battle.turnOrder[battle.currentTurnIndex];
    const current = battle.combatants.find(c => c.id === currentId);
    if (!current || current.hp <= 0) {
      advanceTurn(battle);
      turns++;
      continue;
    }

    if (current.isPartyMember) {
      // Team 1 AI
      const reachable = getValidTargets(battle, current.id);
      if (reachable.length === 0) break;
      reachable.sort((a, b) => a.hp - b.hp);
      const target = reachable[0];

      if (current.mp >= 10 && current.abilityTypes.length > 0 && !isHealAbility(current.abilityTypes[0])) {
        executeAction(battle, TurnBattleAction.ABILITY, target.id, current.abilityTypes[0], null, null as any);
      } else {
        executeAction(battle, TurnBattleAction.ATTACK, target.id, null, null, null as any);
      }
    } else {
      // Team 2 AI — use enemy turn logic
      executeEnemyTurn(battle, null as any);
    }

    turns++;
  }

  const victory = (battle.phase as string) === TurnBattlePhase.VICTORY;
  return { winningSide: victory ? "team1" : "team2", turns };
}
