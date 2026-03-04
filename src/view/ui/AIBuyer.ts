// Generalized AI buyer — parameterized version of P2AIBuyer.
// Each instance manages buying for a specific AI player.
import type { GameState } from "@sim/state/GameState";
import { getPlayerZone } from "@sim/state/GameState";
import type { PlayerId } from "@/types";
import { GamePhase, BuildingState, BuildingType, UnitState } from "@/types";
import { BUILDING_DEFINITIONS } from "@sim/config/BuildingDefs";
import { UNIT_DEFINITIONS } from "@sim/config/UnitDefinitions";
import { addToQueue } from "@sim/systems/SpawnSystem";
import { placeBuilding, BUILDING_MIN_GAP } from "@sim/systems/BuildingSystem";
import { getTile } from "@sim/core/Grid";
import { EventBus } from "@sim/core/EventBus";
import type { TileZone } from "@sim/state/BattlefieldState";

// Seconds between AI decisions when gold is plentiful vs scarce.
const INTERVAL_MIN = 1.5;
const INTERVAL_MAX = 5.0;
const LOW_GOLD_THRESHOLD = 80;

export class AIBuyer {
  private _playerId: PlayerId;
  private _enabled = false;
  private _timer = 0;
  private _interval = INTERVAL_MIN;
  private _lastPhase: GamePhase | null = null;

  constructor(playerId: PlayerId) {
    this._playerId = playerId;
  }

  get playerId(): PlayerId {
    return this._playerId;
  }

  get enabled(): boolean {
    return this._enabled;
  }

  setEnabled(v: boolean): void {
    this._enabled = v;
    this._timer = 0;
  }

  update(state: GameState, dt: number): void {
    if (!this._enabled) return;

    if (state.phase === GamePhase.RESOLVE) {
      this._lastPhase = state.phase;
      return;
    }

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
    const player = state.players.get(this._playerId);
    if (!player) return;

    const unitActions: Array<() => void> = [];
    const buildingActions: Array<() => void> = [];

    // --- Unit purchases ---
    for (const building of state.buildings.values()) {
      if (building.owner !== this._playerId) continue;
      if (building.state !== BuildingState.ACTIVE) continue;
      for (const unitType of building.shopInventory) {
        const def = UNIT_DEFINITIONS[unitType];
        const cost = def.cost;
        if (player.gold >= cost) {
          if (def.maxCount !== undefined) {
            let owned = 0;
            for (const u of state.units.values()) {
              if (u.owner === this._playerId && u.type === unitType && u.state !== UnitState.DIE) owned++;
            }
            for (const b of state.buildings.values()) {
              if (b.owner !== this._playerId) continue;
              for (const entry of b.spawnQueue.entries) {
                if (entry.unitType === unitType) owned++;
              }
              for (const ready of b.spawnQueue.readyUnits) {
                if (ready === unitType) owned++;
              }
            }
            if (owned >= def.maxCount) continue;
          }
          unitActions.push(() => {
            if (player.gold < cost) return;
            player.gold -= cost;
            addToQueue(state, building.id, unitType);
            EventBus.emit("goldChanged", {
              playerId: this._playerId,
              amount: player.gold,
            });
          });
        }
      }
    }

    // --- Building purchases ---
    const zone = getPlayerZone(state, this._playerId);
    for (const building of state.buildings.values()) {
      if (building.owner !== this._playerId) continue;
      if (building.state !== BuildingState.ACTIVE) continue;
      for (const bpType of building.blueprints) {
        const def = BUILDING_DEFINITIONS[bpType];
        if (player.gold < def.cost) continue;

        if (def.maxCount !== undefined) {
          const owned = this._countOwnedType(state, bpType);
          if (owned >= def.maxCount) continue;
        }

        if (def.prerequisite) {
          const prereqMet = def.prerequisite.types.every(
            (type) =>
              this._countOwnedType(state, type) >= def.prerequisite!.minCount,
          );
          if (!prereqMet) continue;
        }

        const pos = this._findPlacementTile(state, def.footprint.w, def.footprint.h, zone);
        if (!pos) continue;

        buildingActions.push(() => {
          placeBuilding(state, this._playerId, bpType, pos);
          EventBus.emit("goldChanged", { playerId: this._playerId, amount: player.gold });
        });
      }
    }

    if (unitActions.length === 0 && buildingActions.length === 0) {
      this._interval = INTERVAL_MAX;
      return;
    }

    const pool = [
      ...unitActions,
      ...unitActions,
      ...unitActions,
      ...buildingActions,
    ];
    const action = pool[Math.floor(Math.random() * pool.length)];
    action();

    this._interval = this._nextInterval(player.gold);
  }

  private _nextInterval(gold: number): number {
    const t = Math.max(0, Math.min(1, 1 - gold / LOW_GOLD_THRESHOLD));
    const base = INTERVAL_MIN + t * (INTERVAL_MAX - INTERVAL_MIN);
    const jitter = base * 0.3 * (Math.random() * 2 - 1);
    return Math.max(INTERVAL_MIN, base + jitter);
  }

  private _countOwnedType(state: GameState, type: BuildingType): number {
    const player = state.players.get(this._playerId);
    if (!player) return 0;
    let count = 0;
    for (const id of player.ownedBuildings) {
      const b = state.buildings.get(id);
      if (b && b.type === type && b.state === BuildingState.ACTIVE) count++;
    }
    return count;
  }

  private _findPlacementTile(
    state: GameState,
    w: number,
    h: number,
    zone: TileZone,
  ): { x: number; y: number } | null {
    const cols = state.battlefield.width;
    const rows = state.battlefield.height;

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
      let ok = true;
      outer: for (
        let dy = -BUILDING_MIN_GAP;
        dy < h + BUILDING_MIN_GAP && ok;
        dy++
      ) {
        for (
          let dx = -BUILDING_MIN_GAP;
          dx < w + BUILDING_MIN_GAP && ok;
          dx++
        ) {
          const tile = getTile(state.battlefield, x + dx, y + dy);
          const isFootprint = dx >= 0 && dx < w && dy >= 0 && dy < h;
          if (isFootprint) {
            if (
              !tile ||
              !tile.walkable ||
              tile.buildingId !== null ||
              tile.zone !== zone
            ) {
              ok = false;
              break outer;
            }
          } else {
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
