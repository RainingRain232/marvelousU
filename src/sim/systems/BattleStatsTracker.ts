// BattleStatsTracker — listens to EventBus events and accumulates battle statistics.
// Call init(state) at the start of a battle to attach listeners, and reset() between battles.

import { EventBus } from "@sim/core/EventBus";
import type { GameState } from "@sim/state/GameState";
import type { PlayerId, UnitType } from "@/types";

// ---------------------------------------------------------------------------
// Stat shapes
// ---------------------------------------------------------------------------

export interface PlayerBattleStats {
  unitsSpawned: number;
  unitsLost: number;
  kills: number;
  damageDealt: number;
  damageReceived: number;
  healingDone: number;
  healthRegenerated: number;
  goldSpent: number;
  buildingsDestroyed: number;
  buildingsCaptured: number;
}

/** Per-unit-type damage breakdown for a single player. */
export interface UnitTypeDamageEntry {
  type: UnitType;
  damage: number;
  kills: number;
}

export interface BattleStats {
  perPlayer: Map<PlayerId, PlayerBattleStats>;
  /** Per-player per-unit-type damage breakdown. */
  unitTypeDamage: Map<PlayerId, Map<UnitType, UnitTypeDamageEntry>>;
  battleDurationTicks: number;
  totalUnitsSpawned: number;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function createPlayerStats(): PlayerBattleStats {
  return {
    unitsSpawned: 0,
    unitsLost: 0,
    kills: 0,
    damageDealt: 0,
    damageReceived: 0,
    healingDone: 0,
    healthRegenerated: 0,
    goldSpent: 0,
    buildingsDestroyed: 0,
    buildingsCaptured: 0,
  };
}

// ---------------------------------------------------------------------------
// BattleStatsTracker class
// ---------------------------------------------------------------------------

class BattleStatsTracker {
  private stats: BattleStats = {
    perPlayer: new Map(),
    unitTypeDamage: new Map(),
    battleDurationTicks: 0,
    totalUnitsSpawned: 0,
  };

  /** playerId → unitType → kill count; used to derive the MVP for each player. */
  private mvpKills: Map<PlayerId, Map<UnitType, number>> = new Map();

  /** Reference to the active GameState, set by init(). */
  private state: GameState | null = null;

  /** Unsubscribe functions returned by EventBus.on(). */
  private unsubs: (() => void)[] = [];

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /** Clear all accumulated stats and remove any active listeners. */
  reset(): void {
    this._detach();
    this.stats = {
      perPlayer: new Map(),
      unitTypeDamage: new Map(),
      battleDurationTicks: 0,
      totalUnitsSpawned: 0,
    };
    this.mvpKills = new Map();
    this.state = null;
  }

  /**
   * Attach to the EventBus and start tracking stats for the given state.
   * Call reset() first if re-using across battles.
   */
  init(state: GameState): void {
    this._detach(); // Ensure no stale listeners from a previous init()
    this.state = state;
    this._attach();
  }

  /** Returns a snapshot of all accumulated stats. */
  getStats(): BattleStats {
    return this.stats;
  }

  /**
   * Returns the UnitType that scored the most kills for the given player,
   * or null if that player has no recorded kills.
   */
  getMVP(playerId: PlayerId): UnitType | null {
    const killMap = this.mvpKills.get(playerId);
    if (!killMap || killMap.size === 0) return null;

    let bestType: UnitType | null = null;
    let bestCount = 0;
    for (const [unitType, count] of killMap) {
      if (count > bestCount) {
        bestCount = count;
        bestType = unitType;
      }
    }
    return bestType;
  }

  // -------------------------------------------------------------------------
  // Tick hook — call once per sim tick to update battleDurationTicks
  // -------------------------------------------------------------------------

  /** Increment the battle duration counter. Call this every sim tick during BATTLE phase. */
  tick(): void {
    this.stats.battleDurationTicks++;
  }

  // -------------------------------------------------------------------------
  // Listener management
  // -------------------------------------------------------------------------

  private _attach(): void {
    this.unsubs.push(
      EventBus.on("unitSpawned", ({ unitId }) => {
        const state = this.state;
        if (!state) return;
        const unit = state.units.get(unitId);
        if (!unit) return;
        this._playerStats(unit.owner).unitsSpawned++;
        this.stats.totalUnitsSpawned++;
      }),

      EventBus.on("groupSpawned", ({ unitIds }) => {
        // groupSpawned fires alongside individual unitSpawned events — we handle
        // counting inside "unitSpawned" to avoid double-counting. The only extra
        // information groupSpawned adds is the batch itself, which we don't need
        // for the current stat set. However we still handle units that may only
        // be covered by groupSpawned and not have a corresponding unitSpawned
        // emitted (future-proofing). For now we simply skip to avoid duplicates
        // since SpawnSystem always emits both.
        void unitIds;
      }),

      EventBus.on("unitDied", ({ unitId, killerUnitId }) => {
        const state = this.state;
        if (!state) return;

        // Increment unitsLost for the dead unit's owner.
        const deadUnit = state.units.get(unitId);
        if (deadUnit) {
          this._playerStats(deadUnit.owner).unitsLost++;
        }

        // Increment kills for the killer's owner.
        if (killerUnitId) {
          const killer = state.units.get(killerUnitId);
          if (killer) {
            this._playerStats(killer.owner).kills++;
            this._recordMvpKill(killer.owner, killer.type);
            this._unitTypeDamage(killer.owner, killer.type).kills++;
          }
        }
      }),

      EventBus.on("unitDamaged", ({ unitId, amount, attackerId }) => {
        const state = this.state;
        if (!state) return;

        const target = state.units.get(unitId);
        if (target) {
          this._playerStats(target.owner).damageReceived += amount;
        }

        const attacker = state.units.get(attackerId);
        if (attacker) {
          this._playerStats(attacker.owner).damageDealt += amount;
          this._unitTypeDamage(attacker.owner, attacker.type).damage += amount;
        }
      }),

      EventBus.on("unitHealed", ({ unitId, amount, isRegen }) => {
        const state = this.state;
        if (!state) return;
        const unit = state.units.get(unitId);
        if (!unit) return;
        if (isRegen) {
          this._playerStats(unit.owner).healthRegenerated += amount;
        } else {
          this._playerStats(unit.owner).healingDone += amount;
        }
      }),

      EventBus.on("goldChanged", ({ playerId, amount }) => {
        // Negative amounts represent gold being spent.
        if (amount < 0) {
          this._playerStats(playerId).goldSpent += Math.abs(amount);
        }
      }),

      EventBus.on("buildingCaptured", ({ buildingId, newOwner }) => {
        void buildingId;
        if (newOwner !== null) {
          this._playerStats(newOwner).buildingsCaptured++;
        }
      }),
    );
  }

  private _detach(): void {
    for (const unsub of this.unsubs) unsub();
    this.unsubs = [];
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  /** Return (or lazily create) the PlayerBattleStats for the given player. */
  private _playerStats(playerId: PlayerId): PlayerBattleStats {
    let ps = this.stats.perPlayer.get(playerId);
    if (!ps) {
      ps = createPlayerStats();
      this.stats.perPlayer.set(playerId, ps);
    }
    return ps;
  }

  /** Return (or lazily create) the UnitTypeDamageEntry for a given player + unit type. */
  private _unitTypeDamage(playerId: PlayerId, unitType: UnitType): UnitTypeDamageEntry {
    let playerMap = this.stats.unitTypeDamage.get(playerId);
    if (!playerMap) {
      playerMap = new Map();
      this.stats.unitTypeDamage.set(playerId, playerMap);
    }
    let entry = playerMap.get(unitType);
    if (!entry) {
      entry = { type: unitType, damage: 0, kills: 0 };
      playerMap.set(unitType, entry);
    }
    return entry;
  }

  /** Increment the kill count for the given (owner, unitType) pair in the MVP map. */
  private _recordMvpKill(owner: PlayerId, unitType: UnitType): void {
    let killMap = this.mvpKills.get(owner);
    if (!killMap) {
      killMap = new Map();
      this.mvpKills.set(owner, killMap);
    }
    killMap.set(unitType, (killMap.get(unitType) ?? 0) + 1);
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const battleStatsTracker = new BattleStatsTracker();
