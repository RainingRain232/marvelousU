// RTS selection visuals: selection rings on units, box-select rectangle, move markers
import { Container, Graphics } from "pixi.js";
import gsap from "gsap";
import type { GameState } from "@sim/state/GameState";
import type { ViewManager } from "@view/ViewManager";
import type { PlayerId, Vec2 } from "@/types";
import { GameMode, UnitState } from "@/types";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { selectionMode } from "@input/SelectionMode";
import { EventBus } from "@sim/core/EventBus";

const TS = BalanceConfig.TILE_SIZE;
const RING_COLOR = 0x00ff88;
const RING_ALPHA = 0.7;
const RING_WIDTH = 2;
const RING_RADIUS = TS * 0.35;

const BOX_BORDER_COLOR = 0x00ff88;
const BOX_FILL_COLOR = 0x00ff88;
const BOX_FILL_ALPHA = 0.12;
const BOX_BORDER_ALPHA = 0.7;

const MOVE_MARKER_COLOR = 0x00ff88;
const MOVE_MARKER_RADIUS = 8;

// ---------------------------------------------------------------------------
// SelectionView
// ---------------------------------------------------------------------------

export class SelectionView {
  readonly container = new Container();

  private _rings: Map<string, Graphics> = new Map();
  private _boxRect = new Graphics();
  private _vm!: ViewManager;
  private _state!: GameState;
  private _unsubscribers: Array<() => void> = [];

  init(vm: ViewManager, state: GameState, _localPlayerId: PlayerId): void {
    this._vm = vm;
    this._state = state;

    if (state.gameMode !== GameMode.RTS) return;

    // Box-select rectangle lives in ui layer (screen space)
    this._boxRect.visible = false;
    vm.addToLayer("ui", this._boxRect);

    // Selection rings live in groundfx layer (world space)
    vm.addToLayer("groundfx", this.container);

    // Wire callbacks from SelectionMode
    selectionMode.onSelectionChanged = () => this._syncRings();
    selectionMode.onBoxSelectUpdate = (s, e) => this._drawBoxRect(s, e);
    selectionMode.onBoxSelectEnd = () => { this._boxRect.visible = false; this._boxRect.clear(); };
    selectionMode.onMoveMarker = (pos) => this._spawnMoveMarker(pos);

    this._unsubscribers.push(
      EventBus.on("selectionChanged", () => this._syncRings()),
    );
  }

  destroy(): void {
    for (const unsub of this._unsubscribers) unsub();
    this._unsubscribers = [];
    selectionMode.onSelectionChanged = null;
    selectionMode.onBoxSelectUpdate = null;
    selectionMode.onBoxSelectEnd = null;
    selectionMode.onMoveMarker = null;
    this._boxRect.destroy();
    this.container.destroy({ children: true });
  }

  /** Call every render frame to keep rings positioned correctly. */
  update(): void {
    if (this._state.gameMode !== GameMode.RTS) return;

    const selected = selectionMode.selectedUnitIds;

    // Update ring positions
    for (const [unitId, ring] of this._rings) {
      const unit = this._state.units.get(unitId);
      if (!unit || unit.state === UnitState.DIE || !selected.has(unitId)) {
        ring.destroy();
        this._rings.delete(unitId);
        continue;
      }
      ring.position.set(
        (unit.position.x + 0.5) * TS,
        (unit.position.y + 0.5) * TS,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private _syncRings(): void {
    const selected = selectionMode.selectedUnitIds;

    // Remove rings for deselected units
    for (const [unitId, ring] of this._rings) {
      if (!selected.has(unitId)) {
        ring.destroy();
        this._rings.delete(unitId);
      }
    }

    // Add rings for newly selected units
    for (const unitId of selected) {
      if (this._rings.has(unitId)) continue;

      const unit = this._state.units.get(unitId);
      if (!unit || unit.state === UnitState.DIE) continue;

      const ring = new Graphics();
      ring.circle(0, 0, RING_RADIUS)
        .stroke({ color: RING_COLOR, alpha: RING_ALPHA, width: RING_WIDTH });
      ring.position.set(
        (unit.position.x + 0.5) * TS,
        (unit.position.y + 0.5) * TS,
      );

      this.container.addChild(ring);
      this._rings.set(unitId, ring);
    }
  }

  private _drawBoxRect(start: Vec2, end: Vec2): void {
    this._boxRect.clear();
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const w = Math.abs(end.x - start.x);
    const h = Math.abs(end.y - start.y);

    if (w < 3 && h < 3) {
      this._boxRect.visible = false;
      return;
    }

    this._boxRect
      .rect(x, y, w, h)
      .fill({ color: BOX_FILL_COLOR, alpha: BOX_FILL_ALPHA })
      .rect(x, y, w, h)
      .stroke({ color: BOX_BORDER_COLOR, alpha: BOX_BORDER_ALPHA, width: 1.5 });
    this._boxRect.visible = true;
  }

  private _spawnMoveMarker(worldPos: Vec2): void {
    const marker = new Graphics();
    marker.circle(0, 0, MOVE_MARKER_RADIUS)
      .stroke({ color: MOVE_MARKER_COLOR, alpha: 0.8, width: 2 });
    marker.position.set(
      (worldPos.x + 0.5) * TS,
      (worldPos.y + 0.5) * TS,
    );
    marker.alpha = 1;

    this._vm.addToLayer("groundfx", marker);

    gsap.to(marker, {
      alpha: 0,
      duration: 0.8,
      ease: "power1.out",
      onComplete: () => {
        if (marker.parent) marker.parent.removeChild(marker);
        marker.destroy();
      },
    });
    gsap.to(marker.scale, {
      x: 1.5,
      y: 1.5,
      duration: 0.8,
      ease: "power1.out",
    });
  }
}

export const selectionView = new SelectionView();
