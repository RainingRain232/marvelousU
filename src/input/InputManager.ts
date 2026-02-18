// Central input dispatcher — delegates pointer events to the active mode
import type { ViewManager } from "@view/ViewManager";
import type { PlayerId } from "@/types";
import type { GameState } from "@sim/state/GameState";
import { selectionMode } from "@input/SelectionMode";
import { buildingPlacer } from "@view/ui/BuildingPlacer";

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
 * Drag detection:
 *   Camera pan is handled directly by Camera.ts via its own pointer listeners.
 *   InputManager detects whether a pointerup was a "click" (moved < DRAG_THRESHOLD
 *   pixels) and only forwards genuine clicks to the active mode.
 *
 * Touch support:
 *   PointerEvents cover both mouse and touch; no separate touch handlers needed.
 */
export class InputManager {
  private _mode: InputModeId = "selection";

  // Drag detection state
  private _pointerDownX = 0;
  private _pointerDownY = 0;
  private _pointerMoved = false;

  private static readonly DRAG_THRESHOLD = 5; // pixels

  // Bound event handlers
  private _onPointerDown!: (e: PointerEvent) => void;
  private _onPointerMove!: (e: PointerEvent) => void;
  private _onPointerUp!: (e: PointerEvent) => void;
  private _onKeyDown!: (e: KeyboardEvent) => void;
  private _onContextMenu!: (e: Event) => void;

  private _canvas!: HTMLCanvasElement;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  init(vm: ViewManager, state: GameState, localPlayerId: PlayerId): void {
    const canvas = vm.app.canvas as HTMLCanvasElement;
    this._canvas = canvas;

    // Initialise selection mode
    selectionMode.init(state, vm.camera, localPlayerId);

    // Bind handlers
    this._onPointerDown = this._handlePointerDown.bind(this);
    this._onPointerMove = this._handlePointerMove.bind(this);
    this._onPointerUp = this._handlePointerUp.bind(this);
    this._onKeyDown = this._handleKeyDown.bind(this);
    this._onContextMenu = (e: Event) => e.preventDefault();

    canvas.addEventListener("pointerdown", this._onPointerDown);
    canvas.addEventListener("pointermove", this._onPointerMove);
    canvas.addEventListener("pointerup", this._onPointerUp);
    canvas.addEventListener("contextmenu", this._onContextMenu);
    window.addEventListener("keydown", this._onKeyDown);
  }

  destroy(): void {
    this._canvas.removeEventListener("pointerdown", this._onPointerDown);
    this._canvas.removeEventListener("pointermove", this._onPointerMove);
    this._canvas.removeEventListener("pointerup", this._onPointerUp);
    this._canvas.removeEventListener("contextmenu", this._onContextMenu);
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

  // ---------------------------------------------------------------------------
  // Private: pointer events
  // ---------------------------------------------------------------------------

  private _handlePointerDown(e: PointerEvent): void {
    // Track start position for drag detection (left button only)
    if (e.button === 0) {
      this._pointerDownX = e.clientX;
      this._pointerDownY = e.clientY;
      this._pointerMoved = false;
    }
  }

  private _handlePointerMove(e: PointerEvent): void {
    if (!(e.buttons & 1)) return; // left button not held
    const dx = e.clientX - this._pointerDownX;
    const dy = e.clientY - this._pointerDownY;
    if (Math.sqrt(dx * dx + dy * dy) > InputManager.DRAG_THRESHOLD) {
      this._pointerMoved = true;
    }
  }

  private _handlePointerUp(e: PointerEvent): void {
    if (e.button !== 0) return;
    if (this._pointerMoved) return; // was a drag, not a click

    // Compute canvas-relative coords
    const rect = this._canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    // Delegate to active mode
    if (this._mode === "placement") {
      // BuildingPlacer manages its own pointerdown (capture phase) for confirm;
      // InputManager just observes mode transitions via buildingPlacer.isActive.
      this._syncPlacementMode();
    } else {
      // SELECTION mode
      selectionMode.handleClick(sx, sy);
    }
  }

  private _handleKeyDown(e: KeyboardEvent): void {
    if (e.code === "Escape") {
      if (this._mode === "placement") {
        // BuildingPlacer handles ESC itself; sync mode after
        this._syncPlacementMode();
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Private: keep mode in sync with BuildingPlacer's active state
  // ---------------------------------------------------------------------------

  /**
   * Called after any placement-mode action to check if BuildingPlacer is
   * still active and update `_mode` accordingly.
   */
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
  }

  exitPlacementMode(): void {
    this._mode = "selection";
  }
}

export const inputManager = new InputManager();
