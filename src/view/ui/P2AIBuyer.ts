// Dumb AI buyer for player 2 during PREP and BATTLE phases.
// Each tick it randomly decides whether to spend gold on a unit or a building.
import type { GameState } from "@sim/state/GameState";
import { GamePhase, BuildingState, BuildingType } from "@/types";
import { BUILDING_DEFINITIONS } from "@sim/config/BuildingDefs";
import { UNIT_DEFINITIONS } from "@sim/config/UnitDefinitions";
import { addToQueue } from "@sim/systems/SpawnSystem";
import { placeBuilding, BUILDING_MIN_GAP } from "@sim/systems/BuildingSystem";
import { getTile } from "@sim/core/Grid";
import { EventBus } from "@sim/core/EventBus";

// Seconds between AI decisions when gold is plentiful vs scarce.
const INTERVAL_MIN = 1.5; // shortest wait (flush with gold)
const INTERVAL_MAX = 5.0; // longest wait (barely enough for cheapest unit)
// Gold threshold below which the AI uses the longer end of the range.
const LOW_GOLD_THRESHOLD = 80;

class P2AIBuyer {
  private _enabled = false;
  private _timer = 0;
  private _interval = INTERVAL_MIN;
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

    // No buying during RESOLVE
    if (state.phase === GamePhase.RESOLVE) {
      this._lastPhase = state.phase;
      return;
    }

    // Reset timer on fresh entry into PREP to avoid burst-spending caused by
    // time accumulated during BATTLE / RESOLVE.
    if (state.phase === GamePhase.PREP && this._lastPhase !== GamePhase.PREP) {
      this._timer = 0;
      this._interval = INTERVAL_MIN;
    }
    this._lastPhase = state.phase;

    this._timer += dt;
    if (this._timer < this._interval) return;
    this._timer = 0;

    this._decide(state);
  }

  private _decide(state: GameState): void {
    const player = state.players.get("p2");
    if (!player) return;

    // Gather affordable unit and building actions separately so we can
    // weight them: prefer unit purchases over building purchases to ensure
    // the AI keeps training troops throughout PREP.
    const unitActions: Array<() => void> = [];
    const buildingActions: Array<() => void> = [];

    // --- Unit purchases ---
    for (const building of state.buildings.values()) {
      if (building.owner !== "p2") continue;
      if (building.state !== BuildingState.ACTIVE) continue;
      for (const unitType of building.shopInventory) {
        const cost = UNIT_DEFINITIONS[unitType].cost;
        if (player.gold >= cost) {
          unitActions.push(() => {
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

        buildingActions.push(() => {
          placeBuilding(state, "p2", bpType, pos);
          EventBus.emit("goldChanged", { playerId: "p2", amount: player.gold });
        });
      }
    }

    if (unitActions.length === 0 && buildingActions.length === 0) {
      // Nothing affordable — wait longer before checking again.
      this._interval = INTERVAL_MAX;
      return;
    }

    // Weight unit actions 3:1 over building actions so the AI reliably trains
    // troops rather than spending all gold on infrastructure early.
    const pool = [
      ...unitActions, ...unitActions, ...unitActions,
      ...buildingActions,
    ];
    const action = pool[Math.floor(Math.random() * pool.length)];
    action();

    // Scale the next wait based on remaining gold: low gold → longer pause.
    this._interval = this._nextInterval(player.gold);
  }

  /**
   * Pick a random wait before the next decision.
   * Scales between INTERVAL_MIN (flush) and INTERVAL_MAX (near-empty).
   */
  private _nextInterval(gold: number): number {
    const t = Math.max(0, Math.min(1, 1 - gold / LOW_GOLD_THRESHOLD));
    const base = INTERVAL_MIN + t * (INTERVAL_MAX - INTERVAL_MIN);
    // Add ±30% jitter so decisions don't all land on the same beat.
    const jitter = base * 0.3 * (Math.random() * 2 - 1);
    return Math.max(INTERVAL_MIN, base + jitter);
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
    const cols = state.battlefield.width;
    const rows = state.battlefield.height;

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
      // to avoid flooding error results: all tiles must be walkable, in east
      // zone, and no existing building within BUILDING_MIN_GAP of the footprint.
      let ok = true;
      outer:
      for (let dy = -BUILDING_MIN_GAP; dy < h + BUILDING_MIN_GAP && ok; dy++) {
        for (let dx = -BUILDING_MIN_GAP; dx < w + BUILDING_MIN_GAP && ok; dx++) {
          const tile = getTile(state.battlefield, x + dx, y + dy);
          const isFootprint = dx >= 0 && dx < w && dy >= 0 && dy < h;
          if (isFootprint) {
            if (!tile || !tile.walkable || tile.buildingId !== null || tile.zone !== "east") {
              ok = false;
              break outer;
            }
          } else {
            // Halo tile — just check for nearby buildings
            if (tile && tile.buildingId !== null) {
              ok = false;
              break outer;
            }
          }
        }
      }
      if (ok) return { x, y };
    }
    return null;
  }
}

export const p2AIBuyer = new P2AIBuyer();
