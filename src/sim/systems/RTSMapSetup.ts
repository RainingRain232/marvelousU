// RTS map initialization — places resource nodes and starting units for RTS mode.

import type { GameState } from "@sim/state/GameState";
import { createResourceNode, ResourceType } from "@sim/entities/ResourceNode";
import { createUnit } from "@sim/entities/Unit";
import { UnitType, GameMode } from "@/types";
import { createSelectionState } from "@sim/state/SelectionState";

/**
 * Set up the RTS map with resource nodes and starting units.
 * Called once after base/castle initialization.
 */
export function setupRTSMap(state: GameState): void {
  if (state.gameMode !== GameMode.RTS) return;

  // Initialize selection state per player
  for (const playerId of state.players.keys()) {
    state.selection.set(playerId, createSelectionState());
  }

  _placeResourceNodes(state);
  _spawnStartingUnits(state);
}

function _placeResourceNodes(state: GameState): void {
  const w = state.battlefield.width;
  const h = state.battlefield.height;

  // Gold mines — near each base + center
  const goldNodes = [
    { x: 8, y: 5 },   // Near west base (top)
    { x: 8, y: 18 },  // Near west base (bottom)
    { x: w - 9, y: 5 },  // Near east base (top)
    { x: w - 9, y: 18 }, // Near east base (bottom)
    { x: Math.floor(w / 2), y: Math.floor(h / 2) - 3 }, // Center top
    { x: Math.floor(w / 2), y: Math.floor(h / 2) + 3 }, // Center bottom
  ];

  for (const pos of goldNodes) {
    const node = createResourceNode({
      type: ResourceType.GOLD,
      position: pos,
      amount: 3000,
      gatherersMax: 8,
    });
    state.resourceNodes.set(node.id, node);
  }

  // Wood forests — scattered
  const woodNodes = [
    { x: 12, y: 3 },
    { x: 12, y: 21 },
    { x: Math.floor(w / 2) - 6, y: 8 },
    { x: Math.floor(w / 2) + 6, y: 8 },
    { x: Math.floor(w / 2) - 6, y: 16 },
    { x: Math.floor(w / 2) + 6, y: 16 },
    { x: w - 13, y: 3 },
    { x: w - 13, y: 21 },
  ];

  for (const pos of woodNodes) {
    const node = createResourceNode({
      type: ResourceType.WOOD,
      position: pos,
      amount: 2000,
      gatherersMax: 6,
    });
    state.resourceNodes.set(node.id, node);
  }

  // Stone quarries — fewer, near center
  const stoneNodes = [
    { x: Math.floor(w / 2) - 3, y: Math.floor(h / 2) },
    { x: Math.floor(w / 2) + 3, y: Math.floor(h / 2) },
    { x: 15, y: Math.floor(h / 2) },
    { x: w - 16, y: Math.floor(h / 2) },
  ];

  for (const pos of stoneNodes) {
    const node = createResourceNode({
      type: ResourceType.STONE,
      position: pos,
      amount: 1500,
      gatherersMax: 4,
    });
    state.resourceNodes.set(node.id, node);
  }
}

function _spawnStartingUnits(state: GameState): void {
  for (const [playerId] of state.players) {
    // Find this player's base
    const base = [...state.bases.values()].find((b) => b.owner === playerId);
    if (!base) continue;

    const spawnX = base.position.x + base.spawnOffset.x;
    const spawnY = base.position.y + base.spawnOffset.y;

    // Spawn 5 workers
    for (let i = 0; i < 5; i++) {
      const worker = createUnit({
        type: UnitType.SETTLER,
        owner: playerId,
        position: { x: spawnX + (i % 3), y: spawnY + Math.floor(i / 3) },
      });
      // In RTS mode, settlers are not diplomat-only — they're workers
      worker.diplomatOnly = false;
      state.units.set(worker.id, worker);
    }

    // Spawn 3 swordsmen for initial defense
    for (let i = 0; i < 3; i++) {
      const sword = createUnit({
        type: UnitType.SWORDSMAN,
        owner: playerId,
        position: { x: spawnX + i, y: spawnY + 2 },
      });
      state.units.set(sword.id, sword);
    }

    // Spawn 1 archer
    const archer = createUnit({
      type: UnitType.ARCHER,
      owner: playerId,
      position: { x: spawnX + 1, y: spawnY + 3 },
    });
    state.units.set(archer.id, archer);
  }
}
