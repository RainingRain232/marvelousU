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
 *   2. Register `vm.onUpdate(layer.update)` to sync health bars each frame.
 *   3. Call `destroy()` on teardown.
 *
 * EventBus subscriptions:
 *   - buildingPlaced    → create BuildingView
 *   - buildingDestroyed → update then schedule removal after a short delay
 */
export class BuildingLayer {
  private _vm!: ViewManager;
  private _state!: GameState;

  private _buildingViews = new Map<string, BuildingView>();
  private _baseViews     = new Map<string, BaseView>();

  private _unsubscribers: Array<() => void> = [];

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  init(vm: ViewManager, state: GameState): void {
    this._vm    = vm;
    this._state = state;

    // Render bases that already exist (set up before the view layer boots)
    for (const base of state.bases.values()) {
      this._addBase(base.id);
    }

    // Render buildings that already exist (e.g. castles placed by initBases)
    for (const building of state.buildings.values()) {
      this._addBuilding(building.id);
    }

    // Subscribe to future events
    this._unsubscribers.push(
      EventBus.on("buildingPlaced", ({ buildingId }) => {
        this._addBuilding(buildingId);
      }),
      EventBus.on("buildingDestroyed", ({ buildingId }) => {
        // Update visual to show destroyed state; remove after a short linger
        const view = this._buildingViews.get(buildingId);
        const building = state.buildings.get(buildingId);
        if (view && building) view.update(building);
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

  readonly update = (state: GameState): void => {
    for (const [id, view] of this._buildingViews) {
      const building = state.buildings.get(id);
      if (building) view.update(building);
    }
    for (const [id, view] of this._baseViews) {
      const base = state.bases.get(id);
      if (base) view.update(base);
    }
  };

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private _addBuilding(buildingId: string): void {
    if (this._buildingViews.has(buildingId)) return;
    const building = this._state.buildings.get(buildingId);
    if (!building) return;

    const view = new BuildingView(building);
    this._buildingViews.set(buildingId, view);
    this._vm.addToLayer("buildings", view.container);
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
