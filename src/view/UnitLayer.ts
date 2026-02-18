// Manages UnitView instances — subscribes to EventBus unit lifecycle events
import { EventBus } from "@sim/core/EventBus";
import type { GameState } from "@sim/state/GameState";
import type { ViewManager } from "@view/ViewManager";
import { UnitView } from "@view/entities/UnitView";

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

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  init(vm: ViewManager, state: GameState): void {
    this._vm    = vm;
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
        // Linger briefly so the die animation can play, then remove
        setTimeout(() => this._removeUnit(unitId), 1000);
      }),
    );
  }

  destroy(): void {
    for (const unsub of this._unsubscribers) unsub();
    this._unsubscribers = [];

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
      if (unit) view.update(unit);
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
