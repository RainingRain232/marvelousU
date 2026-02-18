// Click buildings/units to inspect — hit-tests click against sim state
import type { GameState } from "@sim/state/GameState";
import type { Camera } from "@view/Camera";
import { BUILDING_DEFINITIONS } from "@sim/config/BuildingDefs";
import { BuildingState } from "@/types";
import type { PlayerId } from "@/types";
import { shopPanel } from "@view/ui/ShopPanel";

// ---------------------------------------------------------------------------
// SelectionMode
// ---------------------------------------------------------------------------

/**
 * Handles pointer clicks in the default (non-placement) game mode.
 *
 * On left-click:
 *   1. If ShopPanel is open and click is inside the panel → ignore (panel
 *      handles it internally via PixiJS interaction).
 *   2. If ShopPanel is open and click is outside → close it.
 *   3. Otherwise hit-test buildings; if a building owned by localPlayerId
 *      (or neutral) is clicked → open ShopPanel.
 *   4. Future: hit-test units → open Tooltip.
 *
 * This class has no canvas event listeners of its own — `InputManager`
 * calls `handleClick` after filtering drag gestures.
 */
export class SelectionMode {
  private _state!: GameState;
  private _camera!: Camera;
  private _localPlayerId: PlayerId = "";

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  init(state: GameState, camera: Camera, localPlayerId: PlayerId): void {
    this._state = state;
    this._camera = camera;
    this._localPlayerId = localPlayerId;
  }

  // ---------------------------------------------------------------------------
  // Public: called by InputManager on left-click (non-drag)
  // ---------------------------------------------------------------------------

  /**
   * Process a left-click at canvas-relative screen coords (sx, sy).
   * Returns true if the click was consumed (prevents camera-pan handling).
   */
  handleClick(sx: number, sy: number): boolean {
    // If shop panel is open, check if click was inside it
    if (shopPanel.container.visible) {
      if (this._isInsideShopPanel(sx, sy)) {
        return true; // panel's PixiJS interaction handles it
      }
      shopPanel.close();
      return true; // consumed — don't also trigger a world hit-test
    }

    // World hit-test
    const world = this._camera.screenToWorld(sx, sy);
    const tx = Math.floor(world.x);
    const ty = Math.floor(world.y);

    // Building hit-test (owned by local player, or neutral/unowned)
    for (const building of this._state.buildings.values()) {
      if (building.state === BuildingState.DESTROYED) continue;
      // Only open shop for player-owned buildings
      if (building.owner !== this._localPlayerId) continue;

      const def = BUILDING_DEFINITIONS[building.type];
      if (
        tx >= building.position.x &&
        tx < building.position.x + def.footprint.w &&
        ty >= building.position.y &&
        ty < building.position.y + def.footprint.h
      ) {
        shopPanel.open(building.id);
        return true;
      }
    }

    return false;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private _isInsideShopPanel(sx: number, sy: number): boolean {
    const c = shopPanel.container;
    if (!c.visible) return false;
    // The panel background is the first child (Graphics) — use its height
    const bg = c.children[0];
    if (!bg) return false;
    const bounds = bg.getBounds();
    return (
      sx >= bounds.x &&
      sx <= bounds.x + bounds.width &&
      sy >= bounds.y &&
      sy <= bounds.y + bounds.height
    );
  }
}

export const selectionMode = new SelectionMode();
