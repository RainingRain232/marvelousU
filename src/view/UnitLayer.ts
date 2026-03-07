// Manages UnitView instances — subscribes to EventBus unit lifecycle events
import { EventBus } from "@sim/core/EventBus";
import type { GameState } from "@sim/state/GameState";
import type { ViewManager } from "@view/ViewManager";
import { UnitView, CORPSE_FADE_MS } from "@view/entities/UnitView";
import { deathFX } from "@view/fx/DeathFX";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { unitSelectionManager } from "@input/UnitSelectionManager";

// ---------------------------------------------------------------------------
// UnitLayer
// ---------------------------------------------------------------------------

/**
 * Owns all UnitView instances.
 *
 * Lifecycle:
 *   1. Call `init(vm, state)` after ViewManager is ready.
 *   2. Register `vm.onUpdate(layer.update)` to sync positions each frame.
 *   3. Call `destroy()` on teardown.
 *
 * EventBus subscriptions:
 *   - unitSpawned → create UnitView
 *   - unitDied    → schedule removal after UNIT_DEATH_LINGER visual window
 *
 * Depth sorting:
 *   The units layer has `sortableChildren = true`; each UnitView sets
 *   `container.zIndex = unit.position.y` so units lower on screen draw on top.
 */
export class UnitLayer {
  private _vm!: ViewManager;
  private _state!: GameState;

  private _unitViews = new Map<string, UnitView>();
  private _unsubscribers: Array<() => void> = [];
  private _pendingTimeouts: ReturnType<typeof setTimeout>[] = [];

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  init(vm: ViewManager, state: GameState): void {
    this._vm = vm;
    this._state = state;

    // Enable depth sorting on the units layer
    vm.layers.units.sortableChildren = true;

    // Render any units that already exist in state (e.g. in tests / hot-reload)
    for (const unit of state.units.values()) {
      this._addUnit(unit.id);
    }

    // Subscribe to future events
    this._unsubscribers.push(
      EventBus.on("unitSpawned", ({ unitId }) => {
        this._addUnit(unitId);
      }),
      EventBus.on("unitDied", ({ unitId }) => {
        const view = this._unitViews.get(unitId);
        if (!view) return;

        const unit = this._state.units.get(unitId);

        // 1. Emit per-type death particles at the unit's current screen position.
        if (unit) {
          const TS = BalanceConfig.TILE_SIZE;
          const screenX = (unit.position.x + 0.5) * TS;
          const screenY = (unit.position.y + 0.5) * TS;
          deathFX.play(unit.type, screenX, screenY);

          // 2. Start death sequence: plays DIE anim then fades corpse.
          view.startDeathSequence(unit);
        }

        // 3. Remove after DIE anim (~900ms) + corpse fade (CORPSE_FADE_MS) + small buffer.
        const lingerMs = 900 + CORPSE_FADE_MS + 200;
        const tid = setTimeout(() => {
          this._pendingTimeouts = this._pendingTimeouts.filter((t) => t !== tid);
          this._removeUnit(unitId);
        }, lingerMs);
        this._pendingTimeouts.push(tid);
      }),
    );
  }

  destroy(): void {
    for (const unsub of this._unsubscribers) unsub();
    this._unsubscribers = [];

    for (const tid of this._pendingTimeouts) clearTimeout(tid);
    this._pendingTimeouts = [];

    for (const view of this._unitViews.values()) {
      this._vm.removeFromLayer("units", view.container);
      view.destroy();
    }
    this._unitViews.clear();
  }

  // ---------------------------------------------------------------------------
  // Per-frame update (registered via vm.onUpdate)
  // ---------------------------------------------------------------------------

  readonly update = (state: GameState): void => {
    for (const [id, view] of this._unitViews) {
      const unit = state.units.get(id);
      if (unit) {
        view.update(unit);
        view.setSelected(unitSelectionManager.isSelected(id));
      }
    }
  };

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private _addUnit(unitId: string): void {
    if (this._unitViews.has(unitId)) return;
    const unit = this._state.units.get(unitId);
    if (!unit) return;

    const view = new UnitView(unit);
    this._unitViews.set(unitId, view);
    this._vm.addToLayer("units", view.container);
  }

  private _removeUnit(unitId: string): void {
    const view = this._unitViews.get(unitId);
    if (!view) return;
    this._vm.removeFromLayer("units", view.container);
    view.destroy();
    this._unitViews.delete(unitId);
  }
}

export const unitLayer = new UnitLayer();
