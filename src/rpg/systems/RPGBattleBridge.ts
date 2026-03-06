// Bridge RPG party members to the existing autobattle SimLoop
// Follows the same pattern as world/systems/BattleResolver.ts
import { Direction, GameMode, GamePhase, UnitState } from "@/types";
import type { PlayerId } from "@/types";
import { createGameState } from "@sim/state/GameState";
import type { GameState } from "@sim/state/GameState";
import { createPlayerState } from "@sim/state/PlayerState";
import { createUnit } from "@sim/entities/Unit";
import { createBase } from "@sim/entities/Base";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { UNIT_DEFINITIONS } from "@sim/config/UnitDefinitions";
import type { PartyMember, RPGState } from "@rpg/state/RPGState";
import { ENCOUNTER_DEFS } from "@rpg/config/EncounterDefs";
import type { EnemyDef } from "@rpg/config/EncounterDefs";
import { RPGBalance } from "@rpg/config/RPGBalanceConfig";
import { isCaster, spellPicksOnLevelUp, getSpellChoices } from "@rpg/systems/SpellLearningSystem";
import { EventBus } from "@sim/core/EventBus";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RPGBattleResult {
  victory: boolean;
  partySurvivors: { id: string; hp: number }[];
  xpReward: number;
  goldReward: number;
}

// ---------------------------------------------------------------------------
// Build battle state
// ---------------------------------------------------------------------------

function _placeBases(state: GameState): void {
  const gridW = BalanceConfig.GRID_WIDTH;
  const gridH = BalanceConfig.GRID_HEIGHT;
  const midY = Math.floor(gridH / 2);

  state.bases.set("base_p1", createBase({
    id: "base_p1",
    direction: Direction.WEST,
    owner: "p1" as PlayerId,
    position: { x: 0, y: midY - 1 },
    spawnOffset: { x: 2, y: 1 },
  }));

  state.bases.set("base_p2", createBase({
    id: "base_p2",
    direction: Direction.EAST,
    owner: "p2" as PlayerId,
    position: { x: gridW - 3, y: midY - 1 },
    spawnOffset: { x: 0, y: 1 },
  }));
}

export function buildRPGBattleState(
  party: PartyMember[],
  encounterId: string,
): GameState {
  const encounter = ENCOUNTER_DEFS[encounterId];
  if (!encounter) throw new Error(`Unknown encounter: ${encounterId}`);

  const state = createGameState(
    BalanceConfig.GRID_WIDTH,
    BalanceConfig.GRID_HEIGHT,
    0,
    GameMode.BATTLEFIELD,
    2,
  );

  // Both sides AI-controlled (autobattle)
  state.players.set("p1", createPlayerState("p1", Direction.WEST, 0, "nw", true));
  state.players.set("p2", createPlayerState("p2", Direction.EAST, 0, "se", true));

  _placeBases(state);

  // Spawn party members on west side
  _spawnPartyUnits(state, party);

  // Spawn enemies on east side
  _spawnEnemyUnits(state, encounter.enemies);

  // Skip PREP, start in BATTLE
  state.phase = GamePhase.BATTLE;
  state.phaseTimer = -1;

  return state;
}

// ---------------------------------------------------------------------------
// Spawn helpers
// ---------------------------------------------------------------------------

function _spawnPartyUnits(state: GameState, party: PartyMember[]): void {
  const gridH = BalanceConfig.GRID_HEIGHT;
  let row = Math.floor(gridH / 2) - Math.floor(party.length / 2);

  for (const member of party) {
    if (member.hp <= 0) continue; // Don't spawn dead party members

    const unit = createUnit({
      type: member.unitType,
      owner: "p1" as PlayerId,
      position: { x: 3, y: row },
      id: `rpg_party_${member.id}`,
    });

    // Apply RPG stat overrides
    unit.hp = member.hp;
    unit.maxHp = member.maxHp;
    unit.atk = member.atk;
    unit.speed = member.speed;

    state.units.set(unit.id, unit);
    row += 2;
  }
}

function _spawnEnemyUnits(state: GameState, enemies: EnemyDef[]): void {
  const gridW = BalanceConfig.GRID_WIDTH;
  const gridH = BalanceConfig.GRID_HEIGHT;
  let row = Math.floor(gridH / 2) - 3;

  for (const enemyDef of enemies) {
    const scale = 1 + RPGBalance.ENEMY_LEVEL_SCALE * (enemyDef.level - 1);

    for (let i = 0; i < enemyDef.count; i++) {
      const unit = createUnit({
        type: enemyDef.unitType,
        owner: "p2" as PlayerId,
        position: { x: gridW - 4 + (i % 3), y: row + Math.floor(i / 3) },
      });

      // Apply level scaling
      const unitDef = UNIT_DEFINITIONS[enemyDef.unitType];
      unit.hp = enemyDef.overrides?.hp ?? Math.ceil(unitDef.hp * scale);
      unit.maxHp = unit.hp;
      unit.atk = enemyDef.overrides?.atk ?? Math.ceil(unitDef.atk * scale);

      state.units.set(unit.id, unit);
    }
    row += Math.ceil(enemyDef.count / 3) + 1;
  }
}

// ---------------------------------------------------------------------------
// Extract results
// ---------------------------------------------------------------------------

export function extractRPGBattleResults(
  battleState: GameState,
  _party: PartyMember[],
  encounterId: string,
): RPGBattleResult {
  const encounter = ENCOUNTER_DEFS[encounterId];

  // Check survivors per side
  const p1Alive: { id: string; hp: number }[] = [];
  const p2Alive: string[] = [];

  for (const unit of battleState.units.values()) {
    if (unit.state === UnitState.DIE || unit.hp <= 0) continue;
    if (unit.owner === "p1") {
      // Map back to party member ID
      const memberId = unit.id.replace("rpg_party_", "");
      p1Alive.push({ id: memberId, hp: unit.hp });
    } else {
      p2Alive.push(unit.id);
    }
  }

  const victory = p2Alive.length === 0 && p1Alive.length > 0;

  return {
    victory,
    partySurvivors: p1Alive,
    xpReward: victory ? (encounter?.xpReward ?? 0) : 0,
    goldReward: victory ? (encounter?.goldReward ?? 0) : 0,
  };
}

// ---------------------------------------------------------------------------
// Apply results back to RPG state
// ---------------------------------------------------------------------------

export function applyRPGBattleResults(rpg: RPGState, result: RPGBattleResult): void {
  // Sync HP from battle
  for (const member of rpg.party) {
    const survivor = result.partySurvivors.find(s => s.id === member.id);
    if (survivor) {
      member.hp = survivor.hp;
    } else {
      member.hp = result.victory ? 1 : 1; // Revive with 1 HP
    }
  }

  if (result.victory) {
    rpg.gold += result.goldReward;

    // Distribute XP
    const aliveParty = rpg.party.filter(m => m.hp > 0);
    const xpEach = aliveParty.length > 0 ? Math.ceil(result.xpReward / aliveParty.length) : 0;

    for (const member of aliveParty) {
      member.xp += xpEach;
      while (member.xp >= member.xpToNext && member.level < RPGBalance.MAX_LEVEL) {
        member.xp -= member.xpToNext;
        member.level++;
        // Simple level-up stat boost
        const growth = RPGBalance.LEVEL_STAT_GROWTH;
        member.maxHp = Math.ceil(member.maxHp * (1 + growth));
        member.hp = member.maxHp;
        member.atk = Math.ceil(member.atk * (1 + growth));
        member.def = Math.ceil(member.def * (1 + growth));
        member.xpToNext = Math.ceil(member.xpToNext * RPGBalance.XP_SCALE_FACTOR);
        EventBus.emit("rpgLevelUp", { memberId: member.id, newLevel: member.level });

        // Trigger spell learning for casters
        if (isCaster(member.unitType)) {
          const picks = spellPicksOnLevelUp(member);
          const choices = getSpellChoices(member);
          if (picks > 0 && choices.length > 0) {
            EventBus.emit("rpgSpellLearnPrompt", {
              memberId: member.id,
              memberName: member.name,
              picks,
              choices: choices.map(s => s.id),
            });
          } else if (picks > 0 && choices.length === 0) {
            EventBus.emit("rpgAllSpellsKnown", {
              memberId: member.id,
              memberName: member.name,
              level: member.level,
            });
          }
        }
      }
    }

    EventBus.emit("rpgBattleEnded", { victory: true, xp: result.xpReward, gold: result.goldReward });
  } else {
    rpg.gold = Math.max(0, rpg.gold - Math.floor(rpg.gold * 0.2));
    EventBus.emit("rpgBattleEnded", { victory: false, xp: 0, gold: 0 });
  }
}
