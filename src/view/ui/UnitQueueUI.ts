// Spawn queue progress bars — rendered above each building in world space
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { GameState } from "@sim/state/GameState";
import type { ViewManager } from "@view/ViewManager";
import type { Building } from "@sim/entities/Building";
import { BUILDING_DEFINITIONS } from "@sim/config/BuildingDefs";
import { UNIT_DEFINITIONS } from "@sim/config/UnitDefinitions";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { EventBus } from "@sim/core/EventBus";
import { BuildingState } from "@/types";

// ---------------------------------------------------------------------------
// Layout constants (pixels, relative to building top-left in world space)
// ---------------------------------------------------------------------------

const TS = BalanceConfig.TILE_SIZE;

// Training bar (the active unit being trained)
const TRAIN_BAR_H = 5;
const TRAIN_BAR_Y = -18; // above building rect
const TRAIN_BG = 0x222233;
const TRAIN_FILL = 0x44aaff;

// Ready-unit dots (units that have finished training, waiting for threshold)
const DOT_R = 4; // dot radius
const DOT_GAP = 3; // gap between dots
const DOT_Y = -30; // above training bar
const DOT_FULL = 0xffdd44; // all dots filled → threshold met

// "DEPLOY!" label shown when group threshold is met
const DEPLOY_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 10,
  fill: 0xffdd44,
  fontWeight: "bold",
  letterSpacing: 1,
});

// ---------------------------------------------------------------------------
// Per-building queue overlay
// ---------------------------------------------------------------------------

class BuildingQueueOverlay {
  readonly container = new Container();

  private _trainBg = new Graphics();
  private _trainFill = new Graphics();
  private _dots = new Graphics();
  private _deployLbl = new Text({ text: "DEPLOY!", style: DEPLOY_STYLE });

  constructor(building: Building) {
    this.container.addChild(this._trainBg);
    this.container.addChild(this._trainFill);
    this.container.addChild(this._dots);

    this._deployLbl.anchor.set(0.5, 1);
    this._deployLbl.visible = false;
    this.container.addChild(this._deployLbl);

    // Position in world space at building top-left
    this.container.position.set(
      building.position.x * TS,
      building.position.y * TS,
    );

    this.update(building);
  }

  update(building: Building): void {
    const def = BUILDING_DEFINITIONS[building.type];
    const barW = def.footprint.w * TS;
    const queue = building.spawnQueue;

    // ---- Training bar (front entry) ----
    this._trainBg.clear();
    this._trainFill.clear();

    if (queue.entries.length > 0) {
      const entry = queue.entries[0];
      const unitDef = UNIT_DEFINITIONS[entry.unitType];
      const pct = Math.max(
        0,
        Math.min(1, 1 - entry.remainingTime / unitDef.spawnTime),
      );

      this._trainBg
        .rect(0, TRAIN_BAR_Y, barW, TRAIN_BAR_H)
        .fill({ color: TRAIN_BG });

      const fillW = barW * pct;
      if (fillW > 0) {
        this._trainFill
          .rect(0, TRAIN_BAR_Y, fillW, TRAIN_BAR_H)
          .fill({ color: TRAIN_FILL });
      }
    }

    // ---- Ready-unit dots ----
    this._dots.clear();

    const threshold = queue.groupThreshold;
    const ready = queue.readyUnits.length;
    const atThreshold = ready >= threshold;

    // Total dot slots = threshold; we show filled/empty
    const totalW = threshold * (DOT_R * 2 + DOT_GAP) - DOT_GAP;
    const startX = (barW - totalW) / 2 + DOT_R;

    for (let i = 0; i < threshold; i++) {
      const cx = startX + i * (DOT_R * 2 + DOT_GAP);
      const cy = DOT_Y;
      const filled = i < ready;
      const color = atThreshold ? DOT_FULL : filled ? TRAIN_FILL : 0x334455;

      this._dots.circle(cx, cy, DOT_R).fill({ color });

      if (!filled) {
        // Empty slot: draw ring
        this._dots.circle(cx, cy, DOT_R).stroke({ color: 0x445566, width: 1 });
      }
    }

    // ---- "DEPLOY!" label ----
    this._deployLbl.visible = atThreshold;
    if (atThreshold) {
      this._deployLbl.position.set(barW / 2, DOT_Y - DOT_R - 3);
    }

    // Hide entirely if queue is idle and no ready units
    this.container.visible =
      building.state !== BuildingState.DESTROYED &&
      (queue.entries.length > 0 || ready > 0);
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}

// ---------------------------------------------------------------------------
// UnitQueueUI — manager
// ---------------------------------------------------------------------------

/**
 * Renders a small queue overlay (training bar + ready dots + deploy label)
 * above every building that has a non-empty spawn queue.
 *
 * Lives in the `buildings` layer (world space / camera-transformed).
 *
 * Usage:
 *   unitQueueUI.init(vm, state);
 *   vm.onUpdate((s) => unitQueueUI.update(s));
 */
export class UnitQueueUI {
  private _vm!: ViewManager;
  private _overlays = new Map<string, BuildingQueueOverlay>();
  private _unsubscribers: Array<() => void> = [];

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  init(vm: ViewManager, state: GameState): void {
    this._vm = vm;

    // Render overlays for buildings that already exist
    for (const building of state.buildings.values()) {
      this._addOverlay(building);
    }

    // Subscribe to new buildings being placed
    this._unsubscribers.push(
      EventBus.on("buildingPlaced", ({ buildingId }) => {
        const building = state.buildings.get(buildingId);
        if (building) this._addOverlay(building);
      }),
      EventBus.on("buildingDestroyed", ({ buildingId }) => {
        // Let update() hide the overlay via BuildingState.DESTROYED check
        void buildingId;
      }),
    );
  }

  destroy(): void {
    for (const unsub of this._unsubscribers) unsub();
    this._unsubscribers = [];
    for (const overlay of this._overlays.values()) {
      this._vm.removeFromLayer("buildings", overlay.container);
      overlay.destroy();
    }
    this._overlays.clear();
  }

  // ---------------------------------------------------------------------------
  // Per-frame update
  // ---------------------------------------------------------------------------

  readonly update = (state: GameState): void => {
    for (const [id, overlay] of this._overlays) {
      const building = state.buildings.get(id);
      if (building) overlay.update(building);
    }
  };

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private _addOverlay(building: Building): void {
    if (this._overlays.has(building.id)) return;
    const overlay = new BuildingQueueOverlay(building);
    this._overlays.set(building.id, overlay);
    this._vm.addToLayer("buildings", overlay.container);
  }
}

export const unitQueueUI = new UnitQueueUI();
