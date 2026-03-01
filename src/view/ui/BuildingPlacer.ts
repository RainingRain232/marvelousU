// Ghost building follows cursor, green/red validity highlight, confirm/cancel
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { GameState } from "@sim/state/GameState";
import type { ViewManager } from "@view/ViewManager";
import { BUILDING_DEFINITIONS } from "@sim/config/BuildingDefs";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { BuildingType } from "@/types";
import type { PlayerId } from "@/types";
import {
  canPlace,
  confirmPlacement,
  cancelPlacement,
} from "@input/PlacementMode";

// ---------------------------------------------------------------------------
// Visual constants
// ---------------------------------------------------------------------------

const TS = BalanceConfig.TILE_SIZE;

const COLOR_VALID = 0x22cc44; // green tint when placement OK
const COLOR_INVALID = 0xcc2222; // red tint when placement blocked
const GHOST_ALPHA = 0.55;
const HINT_ALPHA = 0.3; // footprint highlight behind ghost

// Building body colors (same palette as BuildingView)
const BUILDING_COLORS: Record<BuildingType, number> = {
  [BuildingType.CASTLE]: 0x8b6914,
  [BuildingType.BARRACKS]: 0x3a5c8b,
  [BuildingType.STABLES]: 0x5c3a1e,
  [BuildingType.MAGE_TOWER]: 0x6a1e8b,
  [BuildingType.ARCHERY_RANGE]: 0x2e6b2e,
  [BuildingType.SIEGE_WORKSHOP]: 0x7a5c2e,
  [BuildingType.BLACKSMITH]: 0x6b4a3a,
  [BuildingType.TOWN]: 0x6b8c3a,
  [BuildingType.CREATURE_DEN]: 0x3d2b1f,
  [BuildingType.TOWER]: 0x8b8b6e,
  [BuildingType.FARM]: 0x5a8a2e,
  [BuildingType.HAMLET]: 0x7aaa3e,
  [BuildingType.EMBASSY]: 0x3a6b8b,
  [BuildingType.TEMPLE]: 0xd8bfd8,
  [BuildingType.WALL]: 0x777777,
  [BuildingType.FIREPIT]: 0x333333,
  [BuildingType.MILL]: 0x8b7355,
  [BuildingType.ELITE_HALL]: 0xaa8844,
  [BuildingType.MARKET]: 0xaa7733,
  [BuildingType.FACTION_HALL]: 0x6655aa,
  [BuildingType.LIGHTNING_TOWER]: 0x4488ff,
  [BuildingType.ICE_TOWER]: 0xaaddff,
  [BuildingType.FIRE_TOWER]: 0xff6622,
};

const BUILDING_LABELS: Record<BuildingType, string> = {
  [BuildingType.CASTLE]: "CASTLE",
  [BuildingType.BARRACKS]: "BARRACKS",
  [BuildingType.STABLES]: "STABLES",
  [BuildingType.MAGE_TOWER]: "MAGE TWR",
  [BuildingType.ARCHERY_RANGE]: "ARCHERY",
  [BuildingType.SIEGE_WORKSHOP]: "SIEGE WRK",
  [BuildingType.BLACKSMITH]: "BLACKSMITH",
  [BuildingType.TOWN]: "TOWN",
  [BuildingType.CREATURE_DEN]: "CRTR DEN",
  [BuildingType.TOWER]: "TOWER",
  [BuildingType.FARM]: "FARM",
  [BuildingType.HAMLET]: "HAMLET",
  [BuildingType.EMBASSY]: "EMBASSY",
  [BuildingType.TEMPLE]: "TEMPLE",
  [BuildingType.WALL]: "WALL",
  [BuildingType.FIREPIT]: "FIREPIT",
  [BuildingType.MILL]: "MILL",
  [BuildingType.ELITE_HALL]: "ELITE HALL",
  [BuildingType.MARKET]: "MARKET",
  [BuildingType.FACTION_HALL]: "FACTION HALL",
  [BuildingType.LIGHTNING_TOWER]: "LIGHTNING",
  [BuildingType.ICE_TOWER]: "ICE TOWER",
  [BuildingType.FIRE_TOWER]: "FIRE TOWER",
};

const LABEL_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 10,
  fill: 0xffffff,
  align: "center",
});

const HINT_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 11,
  fill: 0xdddddd,
  align: "center",
});

// ---------------------------------------------------------------------------
// BuildingPlacer
// ---------------------------------------------------------------------------

/**
 * Manages the "ghost building" visual during placement mode.
 *
 * Lifecycle:
 *   1. `init(vm, state, playerId)` — registers canvas listeners.
 *   2. `activate(bpType)` — called by ShopPanel after gold is deducted.
 *      Shows ghost, enters placement mode.
 *   3. Left-click on valid tile  → `confirmPlacement`, deactivate.
 *   4. Right-click or ESC        → `cancelPlacement` (refund), deactivate.
 *
 * The ghost container lives in the `ui` layer so it isn't camera-transformed,
 * but its world position is computed from `camera.screenToWorld` so it snaps
 * to the correct grid tile in world space (drawn via `fx` layer).
 */
export class BuildingPlacer {
  // Ghost sits in the world (fx layer) so it transforms with the camera
  private _ghostContainer = new Container();
  // Hint bar sits in ui layer (screen-space)
  private _hintContainer = new Container();

  private _vm!: ViewManager;
  private _state!: GameState;
  private _localPlayerId: PlayerId = "";

  private _active = false;
  private _bpType: BuildingType = BuildingType.BARRACKS;
  private _cursorTx = 0;
  private _cursorTy = 0;
  private _isValid = false;

  // Ghost graphics (rebuilt once per activate)
  private _ghostBody = new Graphics();
  private _ghostHint = new Graphics(); // footprint validity overlay
  private _ghostLabel = new Text({ text: "", style: LABEL_STYLE });

  // Hint bar text
  private _hintText = new Text({ text: "", style: HINT_STYLE });

  // Canvas event handlers
  private _onMouseMove!: (e: PointerEvent) => void;
  private _onPointerDown!: (e: PointerEvent) => void;
  private _onKeyDown!: (e: KeyboardEvent) => void;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  init(vm: ViewManager, state: GameState, playerId: PlayerId): void {
    this._vm = vm;
    this._state = state;
    this._localPlayerId = playerId;

    // Ghost lives in the fx (world) layer so camera transforms apply
    this._ghostContainer.addChild(this._ghostHint);
    this._ghostContainer.addChild(this._ghostBody);
    this._ghostContainer.addChild(this._ghostLabel);
    this._ghostContainer.visible = false;
    vm.addToLayer("fx", this._ghostContainer);

    // Hint bar: centered at bottom of screen
    this._hintContainer.addChild(this._hintText);
    this._hintContainer.visible = false;
    vm.addToLayer("ui", this._hintContainer);

    // Register persistent canvas listeners
    const canvas = vm.app.canvas as HTMLCanvasElement;

    this._onMouseMove = (e: PointerEvent) => {
      if (!this._active) return;
      this._updateCursor(e.clientX, e.clientY);
    };
    this._onPointerDown = (e: PointerEvent) => {
      if (!this._active) return;
      if (e.button === 0) {
        e.stopPropagation();
        this._tryConfirm();
      } else if (e.button === 2) {
        e.stopPropagation();
        this._cancel();
      }
    };
    this._onKeyDown = (e: KeyboardEvent) => {
      if (!this._active) return;
      if (e.code === "Escape") this._cancel();
    };

    canvas.addEventListener("pointermove", this._onMouseMove);
    canvas.addEventListener("pointerdown", this._onPointerDown, {
      capture: true,
    });
    window.addEventListener("keydown", this._onKeyDown);
  }

  setPlayerId(playerId: PlayerId): void {
    this._localPlayerId = playerId;
  }

  destroy(): void {
    const canvas = this._vm.app.canvas as HTMLCanvasElement;
    canvas.removeEventListener("pointermove", this._onMouseMove);
    canvas.removeEventListener("pointerdown", this._onPointerDown, {
      capture: true,
    });
    window.removeEventListener("keydown", this._onKeyDown);
    this._ghostContainer.destroy({ children: true });
    this._hintContainer.destroy({ children: true });
  }

  // ---------------------------------------------------------------------------
  // Activate / deactivate
  // ---------------------------------------------------------------------------

  /**
   * Enter placement mode for the given building type.
   * Gold has already been deducted by ShopPanel._buyBlueprint.
   */
  activate(bpType: BuildingType): void {
    this._bpType = bpType;
    // Defer _active so the pointerdown that triggered the shop button purchase
    // does not immediately confirm placement on the same event.
    this._active = false;
    setTimeout(() => {
      this._active = true;
    }, 0);

    this._isValid = false;
    this._buildGhost();
    this._ghostContainer.visible = true;

    // Hint bar
    const def = BUILDING_DEFINITIONS[bpType];
    this._hintText.text = `Placing ${BUILDING_LABELS[bpType]} (${def.footprint.w}×${def.footprint.h})  ·  Left-click to place  ·  ESC / Right-click to cancel`;
    this._hintText.anchor.set(0.5, 1);
    this._hintContainer.visible = true;
    this._positionHintBar();
  }

  get isActive(): boolean {
    return this._active;
  }

  // ---------------------------------------------------------------------------
  // Private: ghost construction
  // ---------------------------------------------------------------------------

  private _buildGhost(): void {
    const def = BUILDING_DEFINITIONS[this._bpType];
    const pw = def.footprint.w * TS;
    const ph = def.footprint.h * TS;
    const color = BUILDING_COLORS[this._bpType];

    this._ghostBody.clear();
    // Only draw generic background for non-procedural buildings
    const isSpecial =
      this._bpType === BuildingType.TOWER ||
      this._bpType === BuildingType.CASTLE ||
      this._bpType === BuildingType.WALL ||
      this._bpType === BuildingType.FARM ||
      this._bpType === BuildingType.TOWN;
    if (!isSpecial) {
      this._ghostBody
        .rect(0, 0, pw, ph)
        .fill({ color, alpha: GHOST_ALPHA })
        .rect(0, 0, pw, ph)
        .stroke({ color: 0xffffff, alpha: 0.5, width: 1.5 });
    }

    this._ghostLabel.text = BUILDING_LABELS[this._bpType];
    this._ghostLabel.anchor.set(0.5, 0.5);
    this._ghostLabel.position.set(pw / 2, ph / 2);
  }

  // ---------------------------------------------------------------------------
  // Private: cursor tracking
  // ---------------------------------------------------------------------------

  private _updateCursor(clientX: number, clientY: number): void {
    const canvas = this._vm.app.canvas as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;

    const world = this._vm.camera.screenToWorld(screenX, screenY);
    this._cursorTx = Math.floor(world.x);
    this._cursorTy = Math.floor(world.y);

    this._isValid = canPlace(
      this._state,
      this._bpType,
      this._cursorTx,
      this._cursorTy,
      this._localPlayerId,
    );

    // Snap ghost to tile grid in world-pixel space
    this._ghostContainer.position.set(this._cursorTx * TS, this._cursorTy * TS);

    // Update validity overlay
    const def = BUILDING_DEFINITIONS[this._bpType];
    const pw = def.footprint.w * TS;
    const ph = def.footprint.h * TS;
    const hintColor = this._isValid ? COLOR_VALID : COLOR_INVALID;

    this._ghostHint.clear();
    this._ghostHint
      .rect(0, 0, pw, ph)
      .fill({ color: hintColor, alpha: HINT_ALPHA });

    this._ghostBody.tint = this._isValid ? 0xffffff : 0xff8888;
  }

  // ---------------------------------------------------------------------------
  // Private: confirm / cancel
  // ---------------------------------------------------------------------------

  private _tryConfirm(): void {
    if (!this._isValid) return;
    confirmPlacement(
      this._state,
      this._bpType,
      this._cursorTx,
      this._cursorTy,
      this._localPlayerId,
    );
    this._deactivate();
  }

  private _cancel(): void {
    cancelPlacement(this._state, this._bpType, this._localPlayerId);
    this._deactivate();
  }

  private _deactivate(): void {
    this._active = false;
    this._ghostContainer.visible = false;
    this._hintContainer.visible = false;
  }

  // ---------------------------------------------------------------------------
  // Private: hint bar position
  // ---------------------------------------------------------------------------

  private _positionHintBar(): void {
    const screenW = this._vm.screenWidth;
    const screenH = this._vm.screenHeight;
    this._hintText.position.set(screenW / 2, screenH - 12);
  }
}

export const buildingPlacer = new BuildingPlacer();
