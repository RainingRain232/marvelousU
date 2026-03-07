// Central input dispatcher — delegates pointer events to the active mode
import type { ViewManager } from "@view/ViewManager";
import type { PlayerId } from "@/types";
import { GameMode, UpgradeType } from "@/types";
import type { GameState } from "@sim/state/GameState";
import { selectionMode } from "@input/SelectionMode";
import { buildingPlacer } from "@view/ui/BuildingPlacer";
import { hoverTooltip } from "@view/ui/HoverTooltip";
import { UpgradeSystem } from "@sim/systems/UpgradeSystem";
import { EventBus } from "@sim/core/EventBus";

const FLAG_USE_COST = 100;

// ---------------------------------------------------------------------------
// Input modes
// ---------------------------------------------------------------------------

export type InputModeId = "selection" | "placement";

// ---------------------------------------------------------------------------
// InputManager
// ---------------------------------------------------------------------------

/**
 * Owns all raw canvas pointer/keyboard listeners and dispatches them to the
 * currently active input mode.
 *
 * Mode switching:
 *   - Default mode: SELECTION
 *   - When BuildingPlacer.activate() is called → mode becomes PLACEMENT
 *   - When BuildingPlacer deactivates (confirm or cancel) → mode back to SELECTION
 *
 * RTS additions:
 *   - Right-click → issue move/attack command to selected units
 *   - Left-drag → box-select units
 *   - A key → attack-move mode (next left-click issues attack-move)
 *   - H key → hold position
 *   - S key → stop
 *   - Ctrl+1-9 → assign control group
 *   - 1-9 → recall control group
 *   - Ctrl+A → select all units
 */
export class InputManager {
  private _mode: InputModeId = "selection";

  // References stored from init
  private _vm!: ViewManager;
  private _state!: GameState;
  private _localPlayerId!: PlayerId;

  // Last known mouse position (canvas-relative pixels)
  private _mouseX = 0;
  private _mouseY = 0;

  // Drag detection state
  private _pointerDownX = 0;
  private _pointerDownY = 0;
  private _pointerMoved = false;
  private _pointerDownButton = 0;

  private static readonly DRAG_THRESHOLD = 5; // pixels

  // RTS: attack-move mode flag (A key pressed, awaiting click)
  private _attackMoveMode = false;

  // Bound event handlers
  private _onPointerDown!: (e: PointerEvent) => void;
  private _onPointerMove!: (e: PointerEvent) => void;
  private _onPointerUp!: (e: PointerEvent) => void;
  private _onKeyDown!: (e: KeyboardEvent) => void;
  private _onContextMenu!: (e: Event) => void;
  private _onMouseMove!: (e: MouseEvent) => void;

  private _canvas!: HTMLCanvasElement;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  init(vm: ViewManager, state: GameState, localPlayerId: PlayerId): void {
    const canvas = vm.app.canvas as HTMLCanvasElement;
    this._canvas = canvas;
    this._vm = vm;
    this._state = state;
    this._localPlayerId = localPlayerId;

    // Initialise selection mode
    selectionMode.init(state, vm.camera, localPlayerId);

    // Bind handlers
    this._onPointerDown = this._handlePointerDown.bind(this);
    this._onPointerMove = this._handlePointerMove.bind(this);
    this._onPointerUp = this._handlePointerUp.bind(this);
    this._onKeyDown = this._handleKeyDown.bind(this);
    this._onContextMenu = (e: Event) => e.preventDefault();
    this._onMouseMove = (e: MouseEvent) => {
      const rect = this._canvas.getBoundingClientRect();
      this._mouseX = e.clientX - rect.left;
      this._mouseY = e.clientY - rect.top;
    };

    canvas.addEventListener("pointerdown", this._onPointerDown);
    canvas.addEventListener("pointermove", this._onPointerMove);
    canvas.addEventListener("pointerup", this._onPointerUp);
    canvas.addEventListener("contextmenu", this._onContextMenu);
    canvas.addEventListener("mousemove", this._onMouseMove);
    window.addEventListener("keydown", this._onKeyDown);
  }

  destroy(): void {
    this._canvas.removeEventListener("pointerdown", this._onPointerDown);
    this._canvas.removeEventListener("pointermove", this._onPointerMove);
    this._canvas.removeEventListener("pointerup", this._onPointerUp);
    this._canvas.removeEventListener("contextmenu", this._onContextMenu);
    this._canvas.removeEventListener("mousemove", this._onMouseMove);
    window.removeEventListener("keydown", this._onKeyDown);
  }

  // ---------------------------------------------------------------------------
  // Mode management
  // ---------------------------------------------------------------------------

  get mode(): InputModeId {
    return this._mode;
  }

  setMode(mode: InputModeId): void {
    this._mode = mode;
  }

  setPlayerId(playerId: PlayerId): void {
    selectionMode.setPlayerId(playerId);
  }

  private get _isRTS(): boolean {
    return this._state.gameMode === GameMode.RTS;
  }

  // ---------------------------------------------------------------------------
  // Private: pointer events
  // ---------------------------------------------------------------------------

  private _handlePointerDown(e: PointerEvent): void {
    this._pointerDownX = e.clientX;
    this._pointerDownY = e.clientY;
    this._pointerMoved = false;
    this._pointerDownButton = e.button;

    // RTS: left-button starts potential box-select
    if (e.button === 0 && this._isRTS && this._mode === "selection" && !this._attackMoveMode) {
      const rect = this._canvas.getBoundingClientRect();
      selectionMode.startBoxSelect(e.clientX - rect.left, e.clientY - rect.top);
    }
  }

  private _handlePointerMove(e: PointerEvent): void {
    const dx = e.clientX - this._pointerDownX;
    const dy = e.clientY - this._pointerDownY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > InputManager.DRAG_THRESHOLD) {
      this._pointerMoved = true;
    }

    // RTS: update box-select while dragging
    if (this._isRTS && selectionMode.isBoxSelecting && this._pointerDownButton === 0) {
      const rect = this._canvas.getBoundingClientRect();
      selectionMode.updateBoxSelect(e.clientX - rect.left, e.clientY - rect.top);
    }
  }

  private _handlePointerUp(e: PointerEvent): void {
    const rect = this._canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    // RTS: right-click — issue command
    if (e.button === 2 && this._isRTS && this._mode === "selection") {
      this._attackMoveMode = false; // cancel attack-move on right-click
      selectionMode.handleRightClick(sx, sy);
      return;
    }

    // Left button
    if (e.button !== 0) return;

    // RTS: finish box-select if we dragged
    if (this._isRTS && this._pointerMoved && selectionMode.isBoxSelecting) {
      selectionMode.finishBoxSelect(sx, sy, e.shiftKey);
      return;
    }

    // Cancel box-select if it was a click (not a drag)
    if (this._isRTS && selectionMode.isBoxSelecting) {
      selectionMode.finishBoxSelect(sx, sy, e.shiftKey);
    }

    if (this._pointerMoved) return; // was a drag, not a click

    // RTS: attack-move click
    if (this._isRTS && this._attackMoveMode) {
      this._attackMoveMode = false;
      selectionMode.handleAttackMoveClick(sx, sy);
      return;
    }

    // Delegate to active mode
    if (this._mode === "placement") {
      this._syncPlacementMode();
    } else {
      selectionMode.handleClick(sx, sy);
    }
  }

  private _handleKeyDown(e: KeyboardEvent): void {
    if (e.code === "Escape") {
      if (this._mode === "placement") {
        this._syncPlacementMode();
      }
      if (this._attackMoveMode) {
        this._attackMoveMode = false;
      }
    }

    // Non-RTS keys
    if (e.code === "KeyF") {
      this._tryPlaceFlag();
    }

    // RTS-specific keys
    if (!this._isRTS) return;

    // A = attack-move mode
    if (e.code === "KeyA" && !e.ctrlKey && !e.metaKey) {
      this._attackMoveMode = true;
    }

    // H = hold position
    if (e.code === "KeyH") {
      selectionMode.handleHold();
    }

    // S = stop
    if (e.code === "KeyS" && !e.ctrlKey && !e.metaKey) {
      selectionMode.handleStop();
    }

    // Ctrl+A = select all
    if (e.code === "KeyA" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      selectionMode.selectAll();
    }

    // Control groups: Ctrl+1-9 to assign, 1-9 to recall
    const digitMatch = e.code.match(/^Digit(\d)$/);
    if (digitMatch) {
      const num = parseInt(digitMatch[1], 10);
      if (num >= 1 && num <= 9) {
        if (e.ctrlKey || e.metaKey) {
          selectionMode.assignControlGroup(num);
        } else {
          selectionMode.recallControlGroup(num);
        }
      }
    }
  }

  private _tryPlaceFlag(): void {
    const pid = this._localPlayerId;

    // Must have purchased the Flag upgrade
    if (UpgradeSystem.getUpgradeLevel(pid, UpgradeType.FLAG) <= 0) return;

    // Must have enough gold
    const player = this._state.players.get(pid);
    if (!player || player.gold < FLAG_USE_COST) return;

    // Convert mouse position to tile coordinates
    const world = this._vm.camera.screenToWorld(this._mouseX, this._mouseY);
    const tx = Math.floor(world.x);
    const ty = Math.floor(world.y);

    // Bounds check
    const { width, height } = this._state.battlefield;
    if (tx < 0 || tx >= width || ty < 0 || ty >= height) return;

    // Deduct gold
    player.gold -= FLAG_USE_COST;
    EventBus.emit("goldChanged", { playerId: pid, amount: player.gold });

    // Set rally flag position
    const pos = { x: tx, y: ty };
    this._state.rallyFlags.set(pid, pos);

    EventBus.emit("flagPlaced", { playerId: pid, position: pos });
  }

  // ---------------------------------------------------------------------------
  // Private: keep mode in sync with BuildingPlacer's active state
  // ---------------------------------------------------------------------------

  private _syncPlacementMode(): void {
    if (!buildingPlacer.isActive) {
      this._mode = "selection";
    }
  }

  // ---------------------------------------------------------------------------
  // Public: called by BuildingPlacer when it activates
  // ---------------------------------------------------------------------------

  enterPlacementMode(): void {
    this._mode = "placement";
    hoverTooltip.hide();
  }

  exitPlacementMode(): void {
    this._mode = "selection";
  }
}

export const inputManager = new InputManager();
