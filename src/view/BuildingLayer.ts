// Manages BuildingView and BaseView instances — subscribes to EventBus
import { EventBus } from "@sim/core/EventBus";
import type { GameState } from "@sim/state/GameState";
import type { ViewManager } from "@view/ViewManager";
import { BuildingView } from "@view/entities/BuildingView";
import { BaseView } from "@view/entities/BaseView";

// ---------------------------------------------------------------------------
// BuildingLayer
// ---------------------------------------------------------------------------

/**
 * Owns all BuildingView and BaseView instances.
 *
 * Lifecycle:
 *   1. Call `init(vm, state)` after ViewManager is ready.
 *   2. Register `vm.onUpdate(layer.update)` to sync health bars + idle FX each frame.
 *   3. Call `destroy()` on teardown.
 *
 * EventBus subscriptions:
 *   - buildingPlaced    → create BuildingView + play placement animation
 *   - buildingDestroyed → play destruction animation, then remove after linger
 */
export class BuildingLayer {
  private _vm!: ViewManager;
  private _state!: GameState;

  private _buildingViews = new Map<string, BuildingView>();
  private _baseViews = new Map<string, BaseView>();

  private _unsubscribers: Array<() => void> = [];

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  init(vm: ViewManager, state: GameState): void {
    this._vm = vm;
    this._state = state;

    // Render bases that already exist (set up before the view layer boots)
    for (const base of state.bases.values()) {
      this._addBase(base.id);
    }

    // Render buildings that already exist (castles placed by initBases).
    // These are pre-existing so we skip the placement animation.
    for (const building of state.buildings.values()) {
      this._addBuilding(building.id, false);
    }

    // Subscribe to future events
    this._unsubscribers.push(
      EventBus.on("buildingPlaced", ({ buildingId }) => {
        // Player-placed buildings get the placement animation
        this._addBuilding(buildingId, true);
      }),
      EventBus.on("buildingDestroyed", ({ buildingId }) => {
        const view = this._buildingViews.get(buildingId);
        const building = state.buildings.get(buildingId);
        if (view && building) {
          view.update(building, 0);
          view.playDestruction();
        }
        // Remove after destruction animation (~800ms)
        setTimeout(() => this._removeBuilding(buildingId), 800);
      }),
    );
  }

  destroy(): void {
    for (const unsub of this._unsubscribers) unsub();
    this._unsubscribers = [];

    for (const view of this._buildingViews.values()) view.destroy();
    this._buildingViews.clear();

    for (const view of this._baseViews.values()) view.destroy();
    this._baseViews.clear();
  }

  // ---------------------------------------------------------------------------
  // Per-frame update (registered via vm.onUpdate)
  // ---------------------------------------------------------------------------

  readonly update = (state: GameState, dt: number): void => {
    for (const [id, view] of this._buildingViews) {
      const building = state.buildings.get(id);
      if (building) view.update(building, dt, state.phase);
    }
    for (const [id, view] of this._baseViews) {
      const base = state.bases.get(id);
      if (base) view.update(base);
    }
  };

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private _addBuilding(buildingId: string, animate: boolean): void {
    if (this._buildingViews.has(buildingId)) return;
    const building = this._state.buildings.get(buildingId);
    if (!building) return;

    const view = new BuildingView(building);
    this._buildingViews.set(buildingId, view);
    this._vm.addToLayer("buildings", view.container);

    if (animate) {
      view.playPlacement(this._vm.layers.fx);
    } else {
      // Pre-existing building: still register the fx layer for idle smoke
      // Access via the internal method through the public placement path.
      // We call playPlacement with duration=0 by passing the layer and
      // immediately resetting scale — simpler: expose a method for this.
      view.registerFxLayer(this._vm.layers.fx);
    }
  }

  private _removeBuilding(buildingId: string): void {
    const view = this._buildingViews.get(buildingId);
    if (!view) return;
    this._vm.removeFromLayer("buildings", view.container);
    view.destroy();
    this._buildingViews.delete(buildingId);
  }

  private _addBase(baseId: string): void {
    if (this._baseViews.has(baseId)) return;
    const base = this._state.bases.get(baseId);
    if (!base) return;

    const view = new BaseView(base);
    this._baseViews.set(baseId, view);
    this._vm.addToLayer("buildings", view.container);
  }
}

export const buildingLayer = new BuildingLayer();
