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

// Ready-unit dots (queue mode only)
const DOT_R = 4;
const DOT_GAP = 3;
const DOT_Y = -30;
const DOT_FULL = 0xffdd44;

// Toggle button (sits to the right of the training bar)
const TOGGLE_W = 36;
const TOGGLE_H = 14;
const TOGGLE_Y = -18; // same row as training bar

const STYLE_TOGGLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 8,
  fill: 0xffffff,
  fontWeight: "bold",
});

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

  // Toggle button
  private _toggleBtn = new Container();
  private _toggleBg = new Graphics();
  private _toggleLabel = new Text({ text: "", style: STYLE_TOGGLE });

  private _barW: number;

  constructor(building: Building) {
    const def = BUILDING_DEFINITIONS[building.type];
    this._barW = def.footprint.w * TS;

    this.container.addChild(this._trainBg);
    this.container.addChild(this._trainFill);
    this.container.addChild(this._dots);

    this._deployLbl.anchor.set(0.5, 1);
    this._deployLbl.visible = false;
    this.container.addChild(this._deployLbl);

    // Toggle button
    this._toggleBtn.addChild(this._toggleBg);
    this._toggleLabel.anchor.set(0.5, 0.5);
    this._toggleLabel.position.set(TOGGLE_W / 2, TOGGLE_H / 2);
    this._toggleBtn.addChild(this._toggleLabel);
    this._toggleBtn.eventMode = "static";
    this._toggleBtn.cursor = "pointer";
    this._toggleBtn.position.set(this._barW + 3, TOGGLE_Y - 1);
    this._toggleBtn.on("pointerdown", (e) => {
      e.stopPropagation();
      building.spawnQueue.queueEnabled = !building.spawnQueue.queueEnabled;
      // When disabling queue, flush any accumulated readyUnits immediately:
      // SpawnSystem will pick them up next tick; just clear them so they
      // don't sit waiting. (They're already lost — no refund needed.)
      if (!building.spawnQueue.queueEnabled) {
        building.spawnQueue.readyUnits = [];
      }
      this._refreshToggle(building.spawnQueue.queueEnabled);
    });
    this.container.addChild(this._toggleBtn);

    // Position in world space at building top-left
    this.container.position.set(
      building.position.x * TS,
      building.position.y * TS,
    );

    this._refreshToggle(building.spawnQueue.queueEnabled);
    this.update(building);
  }

  update(building: Building): void {
    const queue = building.spawnQueue;

    // ---- Training bar ----
    this._trainBg.clear();
    this._trainFill.clear();

    // Narrow the bar slightly to leave room for the toggle button
    const barW = this._barW;

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

    // ---- Ready-unit dots (queue mode only) ----
    this._dots.clear();
    this._deployLbl.visible = false;

    if (queue.queueEnabled) {
      const threshold = queue.groupThreshold;
      const ready = queue.readyUnits.length;
      const atThreshold = ready >= threshold;

      const totalW = threshold * (DOT_R * 2 + DOT_GAP) - DOT_GAP;
      const startX = (barW - totalW) / 2 + DOT_R;

      for (let i = 0; i < threshold; i++) {
        const cx = startX + i * (DOT_R * 2 + DOT_GAP);
        const cy = DOT_Y;
        const filled = i < ready;
        const color = atThreshold ? DOT_FULL : filled ? TRAIN_FILL : 0x334455;

        this._dots.circle(cx, cy, DOT_R).fill({ color });
        if (!filled) {
          this._dots.circle(cx, cy, DOT_R).stroke({ color: 0x445566, width: 1 });
        }
      }

      this._deployLbl.visible = atThreshold;
      if (atThreshold) {
        this._deployLbl.position.set(barW / 2, DOT_Y - DOT_R - 3);
      }
    }

    // Hide entirely if nothing is happening
    this.container.visible =
      building.state !== BuildingState.DESTROYED &&
      (queue.entries.length > 0 || queue.readyUnits.length > 0 ||
       building.shopInventory.length > 0);
  }

  private _refreshToggle(enabled: boolean): void {
    this._toggleBg.clear();
    this._toggleBg
      .roundRect(0, 0, TOGGLE_W, TOGGLE_H, 3)
      .fill({ color: enabled ? 0x1a3a1a : 0x2a1a1a })
      .roundRect(0, 0, TOGGLE_W, TOGGLE_H, 3)
      .stroke({ color: enabled ? 0x44aa66 : 0xaa4444, width: 1 });
    this._toggleLabel.text = enabled ? "QUEUE" : "INST";
    this._toggleLabel.style.fill = enabled ? 0x88ffaa : 0xff8888;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}

// ---------------------------------------------------------------------------
// UnitQueueUI — manager
// ---------------------------------------------------------------------------

export class UnitQueueUI {
  private _vm!: ViewManager;
  private _overlays = new Map<string, BuildingQueueOverlay>();
  private _unsubscribers: Array<() => void> = [];

  init(vm: ViewManager, state: GameState): void {
    this._vm = vm;

    for (const building of state.buildings.values()) {
      this._addOverlay(building);
    }

    this._unsubscribers.push(
      EventBus.on("buildingPlaced", ({ buildingId }) => {
        const building = state.buildings.get(buildingId);
        if (building) this._addOverlay(building);
      }),
      EventBus.on("buildingDestroyed", ({ buildingId }) => {
        const overlay = this._overlays.get(buildingId);
        if (overlay) {
          this._vm.removeFromLayer("buildings", overlay.container);
          overlay.destroy();
          this._overlays.delete(buildingId);
        }
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

  readonly update = (state: GameState): void => {
    for (const [id, overlay] of this._overlays) {
      const building = state.buildings.get(id);
      if (building) overlay.update(building);
    }
  };

  private _addOverlay(building: Building): void {
    if (this._overlays.has(building.id)) return;
    const overlay = new BuildingQueueOverlay(building);
    this._overlays.set(building.id, overlay);
    this._vm.addToLayer("buildings", overlay.container);
  }
}

export const unitQueueUI = new UnitQueueUI();
