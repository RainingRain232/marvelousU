// Dumb AI buyer for player 2 during PREP phase.
// Each tick it randomly decides whether to spend gold on a unit or a building.
import type { GameState } from "@sim/state/GameState";
import { GamePhase, BuildingState, BuildingType } from "@/types";
import { BUILDING_DEFINITIONS } from "@sim/config/BuildingDefs";
import { UNIT_DEFINITIONS } from "@sim/config/UnitDefinitions";
import { addToQueue } from "@sim/systems/SpawnSystem";
import { placeBuilding } from "@sim/systems/BuildingSystem";
import { getTile } from "@sim/core/Grid";
import { EventBus } from "@sim/core/EventBus";
import { BalanceConfig } from "@sim/config/BalanceConfig";

// How many times per second the AI considers spending gold.
const DECISION_RATE = 0.5; // decisions per second

class P2AIBuyer {
  private _enabled = false;
  private _timer = 0;
  private _lastPhase: GamePhase | null = null;

  get enabled(): boolean {
    return this._enabled;
  }

  setEnabled(v: boolean): void {
    this._enabled = v;
    this._timer = 0; // prevent burst-spending on toggle
  }

  update(state: GameState, dt: number): void {
    if (!this._enabled) return;

    // Reset timer on every fresh entry into PREP so that time accumulated
    // during BATTLE / RESOLVE doesn't cause a burst of back-to-back decisions.
    if (state.phase !== GamePhase.PREP) {
      this._lastPhase = state.phase;
      return;
    }
    if (this._lastPhase !== GamePhase.PREP) {
      this._timer = 0;
      this._lastPhase = GamePhase.PREP;
    }

    this._timer += dt;
    const interval = 1 / DECISION_RATE;
    if (this._timer < interval) return;
    this._timer -= interval;

    this._decide(state);
  }

  private _decide(state: GameState): void {
    const player = state.players.get("p2");
    if (!player) return;

    // Gather affordable actions
    const actions: Array<() => void> = [];

    // --- Unit purchases ---
    for (const building of state.buildings.values()) {
      if (building.owner !== "p2") continue;
      if (building.state !== BuildingState.ACTIVE) continue;
      for (const unitType of building.shopInventory) {
        const cost = UNIT_DEFINITIONS[unitType].cost;
        if (player.gold >= cost) {
          actions.push(() => {
            if (player.gold < cost) return;
            player.gold -= cost;
            addToQueue(state, building.id, unitType);
            EventBus.emit("goldChanged", {
              playerId: "p2",
              amount: player.gold,
            });
          });
        }
      }
    }

    // --- Building purchases (blueprints from castle) ---
    for (const building of state.buildings.values()) {
      if (building.owner !== "p2") continue;
      if (building.state !== BuildingState.ACTIVE) continue;
      for (const bpType of building.blueprints) {
        const def = BUILDING_DEFINITIONS[bpType];
        if (player.gold < def.cost) continue;

        // Skip if at max count for this type
        if (def.maxCount !== undefined) {
          const owned = this._countOwnedType(state, bpType);
          if (owned >= def.maxCount) continue;
        }

        // Skip if prerequisite not met
        if (def.prerequisite) {
          const prereqOwned = this._countOwnedType(state, def.prerequisite.type);
          if (prereqOwned < def.prerequisite.minCount) continue;
        }

        // Find a valid tile to place it in p2's zone (east side)
        const pos = this._findPlacementTile(
          state,
          def.footprint.w,
          def.footprint.h,
        );
        if (!pos) continue;

        actions.push(() => {
          placeBuilding(state, "p2", bpType, pos);
          EventBus.emit("goldChanged", { playerId: "p2", amount: player.gold });
        });
      }
    }

    if (actions.length === 0) return;

    // Pick a random action
    const action = actions[Math.floor(Math.random() * actions.length)];
    action();
  }

  /** Count how many active buildings of the given type p2 currently owns. */
  private _countOwnedType(state: GameState, type: BuildingType): number {
    const player = state.players.get("p2");
    if (!player) return 0;
    let count = 0;
    for (const id of player.ownedBuildings) {
      const b = state.buildings.get(id);
      if (b && b.type === type && b.state === BuildingState.ACTIVE) count++;
    }
    return count;
  }

  /** Scan east-side tiles for a w×h gap the AI can legally place a building. */
  private _findPlacementTile(
    state: GameState,
    w: number,
    h: number,
  ): { x: number; y: number } | null {
    const cols = BalanceConfig.GRID_WIDTH;
    const rows = BalanceConfig.GRID_HEIGHT;

    // Shuffle candidate top-left positions so placement looks less deterministic
    const candidates: Array<{ x: number; y: number }> = [];
    for (let y = 0; y <= rows - h; y++) {
      for (let x = 0; x <= cols - w; x++) {
        candidates.push({ x, y });
      }
    }
    // Fisher-Yates shuffle
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    for (const { x, y } of candidates) {
      // placeBuilding does all the real validation; do a lightweight pre-check
      // to avoid flooding error results: all tiles must be walkable & in east zone.
      let ok = true;
      for (let dy = 0; dy < h && ok; dy++) {
        for (let dx = 0; dx < w && ok; dx++) {
          const tile = getTile(state.battlefield, x + dx, y + dy);
          if (!tile || !tile.walkable || tile.buildingId !== null) {
            ok = false;
            break;
          }
          if (tile.zone !== "east") ok = false;
        }
      }
      if (ok) return { x, y };
    }
    return null;
  }
}

export const p2AIBuyer = new P2AIBuyer();
