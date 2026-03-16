// Escalation system — stalemate prevention for STANDARD autobattler mode.
//
// Tracks total battle time across rounds. After ESCALATION_START_TIME seconds
// of cumulative battle time, neutral threat units begin spawning from map edges
// every ESCALATION_SPAWN_INTERVAL seconds. These neutrals attack BOTH players,
// forcing engagement. Their strength scales with elapsed time.

import type { GameState } from "@sim/state/GameState";
import { GamePhase, GameMode, UnitState, UnitType, Direction } from "@/types";
import { NEUTRAL_PLAYER } from "@/types";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { createUnit } from "@sim/entities/Unit";
import { EventBus } from "@sim/core/EventBus";

// ---------------------------------------------------------------------------
// Public system
// ---------------------------------------------------------------------------

export const EscalationSystem = {
  update(state: GameState, dt: number): void {
    // Only active in STANDARD mode during the BATTLE phase
    if (state.gameMode !== GameMode.STANDARD) return;
    if (state.phase !== GamePhase.BATTLE) return;

    // Accumulate battle time
    state.totalBattleTime += dt;

    // Check if escalation should activate
    if (!state.escalationActive) {
      if (state.totalBattleTime >= BalanceConfig.ESCALATION_START_TIME) {
        state.escalationActive = true;
        state.escalationSpawnTimer = 0; // spawn immediately on activation
        EventBus.emit("escalationStarted", {
          totalBattleTime: state.totalBattleTime,
        });
      }
      return;
    }

    // Tick spawn timer
    state.escalationSpawnTimer -= dt;
    if (state.escalationSpawnTimer <= 0) {
      _spawnNeutralThreats(state);
      state.escalationSpawnTimer = BalanceConfig.ESCALATION_SPAWN_INTERVAL;
    }
  },
};

// ---------------------------------------------------------------------------
// Neutral threat spawning
// ---------------------------------------------------------------------------

let _escalationIdCounter = 0;

/**
 * Spawn neutral threat units from all four map edges.
 * Strength scales with time past the escalation start.
 */
function _spawnNeutralThreats(state: GameState): void {
  const minutesPastStart =
    (state.totalBattleTime - BalanceConfig.ESCALATION_START_TIME) / 60;
  const scalingMult = 1 + minutesPastStart * BalanceConfig.ESCALATION_SCALING_PER_MINUTE;

  const hp = Math.floor(BalanceConfig.ESCALATION_BASE_HP * scalingMult);
  const atk = Math.floor(BalanceConfig.ESCALATION_BASE_ATK * scalingMult);
  const speed = BalanceConfig.ESCALATION_BASE_SPEED;

  const w = state.battlefield.width;
  const h = state.battlefield.height;
  const midX = Math.floor(w / 2);
  const midY = Math.floor(h / 2);

  // Spawn from each edge — one unit per edge, heading toward the center
  const spawnPoints: Array<{ pos: { x: number; y: number }; facing: Direction }> = [
    { pos: { x: 0, y: midY }, facing: Direction.EAST },           // west edge
    { pos: { x: w - 1, y: midY }, facing: Direction.WEST },       // east edge
    { pos: { x: midX, y: 0 }, facing: Direction.SOUTH },          // north edge
    { pos: { x: midX, y: h - 1 }, facing: Direction.NORTH },      // south edge
  ];

  for (const spawn of spawnPoints) {
    const id = `escalation-${++_escalationIdCounter}`;
    const unit = createUnit({
      type: UnitType.SWORDSMAN, // Uses swordsman as base template
      owner: NEUTRAL_PLAYER,
      position: { ...spawn.pos },
      id,
      facingDirection: spawn.facing,
    });

    // Override stats with scaled escalation values
    unit.hp = hp;
    unit.maxHp = hp;
    unit.atk = atk;
    unit.speed = speed;
    unit.range = 1.5;

    // Neutral threats march toward center — AISystem will handle targeting
    // since NEUTRAL_PLAYER is enemy to all players
    unit.state = UnitState.MOVE;
    unit.path = [{ x: midX, y: midY }];
    unit.pathIndex = 0;

    state.units.set(id, unit);

    EventBus.emit("escalationUnitSpawned", {
      unitId: id,
      position: spawn.pos,
      strength: scalingMult,
    });
  }
}
