// RTS selection mode — box-select, right-click commands, keyboard shortcuts
import type { GameState } from "@sim/state/GameState";
import type { Camera } from "@view/Camera";
import { BUILDING_DEFINITIONS } from "@sim/config/BuildingDefs";
import { BuildingState, GameMode, UnitState } from "@/types";
import type { PlayerId, Vec2 } from "@/types";
import { shopPanel } from "@view/ui/ShopPanel";
import { CommandType } from "@sim/state/CommandTypes";
import type { UnitCommand } from "@sim/state/CommandTypes";
import { EventBus } from "@sim/core/EventBus";
import { distanceSq } from "@sim/utils/math";

// ---------------------------------------------------------------------------
// SelectionMode
// ---------------------------------------------------------------------------

/**
 * Handles pointer clicks in the default (non-placement) game mode.
 *
 * In autobattler mode: left-click opens building shop panels.
 * In RTS mode: left-click selects units, right-click issues commands,
 * keyboard shortcuts for attack-move, hold, stop, patrol, control groups.
 */
export class SelectionMode {
  private _state!: GameState;
  private _camera!: Camera;
  private _localPlayerId: PlayerId = "";

  // Box-select state
  private _boxStart: Vec2 | null = null;
  private _boxEnd: Vec2 | null = null;
  private _isBoxSelecting = false;

  // Callbacks for view layer
  onSelectionChanged: (() => void) | null = null;
  onBoxSelectUpdate: ((start: Vec2, end: Vec2) => void) | null = null;
  onBoxSelectEnd: (() => void) | null = null;
  onMoveMarker: ((worldPos: Vec2) => void) | null = null;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  init(state: GameState, camera: Camera, localPlayerId: PlayerId): void {
    this._state = state;
    this._camera = camera;
    this._localPlayerId = localPlayerId;
  }

  setPlayerId(playerId: PlayerId): void {
    this._localPlayerId = playerId;
  }

  // ---------------------------------------------------------------------------
  // Accessors
  // ---------------------------------------------------------------------------

  get selectedUnitIds(): Set<string> {
    const sel = this._state.selection?.get(this._localPlayerId);
    return sel?.selectedUnitIds ?? new Set();
  }

  get controlGroups(): Map<number, Set<string>> {
    const sel = this._state.selection?.get(this._localPlayerId);
    return sel?.controlGroups ?? new Map();
  }

  // ---------------------------------------------------------------------------
  // Public: called by InputManager on left-click (non-drag)
  // ---------------------------------------------------------------------------

  handleClick(sx: number, sy: number): boolean {
    if (this._state.gameMode !== GameMode.RTS) {
      return this._handleAutobattlerClick(sx, sy);
    }
    return this._handleRTSLeftClick(sx, sy);
  }

  // ---------------------------------------------------------------------------
  // Public: called by InputManager on right-click
  // ---------------------------------------------------------------------------

  handleRightClick(sx: number, sy: number): boolean {
    if (this._state.gameMode !== GameMode.RTS) return false;

    const sel = this._getSelection();
    if (!sel || sel.selectedUnitIds.size === 0) return false;

    const world = this._camera.screenToWorld(sx, sy);
    const tx = world.x;
    const ty = world.y;

    // Check if right-clicked on an enemy unit or building
    const enemyUnit = this._findEnemyUnitAt(tx, ty);
    if (enemyUnit) {
      this._issueCommand({
        type: CommandType.ATTACK,
        targetEntityId: enemyUnit.id,
      });
      return true;
    }

    const enemyBuilding = this._findEnemyBuildingAt(tx, ty);
    if (enemyBuilding) {
      this._issueCommand({
        type: CommandType.ATTACK,
        targetEntityId: enemyBuilding.id,
      });
      return true;
    }

    // Check if right-clicked on a resource node (for workers)
    const resourceNode = this._findResourceNodeAt(tx, ty);
    if (resourceNode) {
      this._issueCommand({
        type: CommandType.GATHER,
        targetEntityId: resourceNode.id,
        targetPosition: { x: resourceNode.position.x, y: resourceNode.position.y },
      });
      return true;
    }

    // Default: move command
    const target = { x: Math.floor(tx), y: Math.floor(ty) };
    this._issueCommand({
      type: CommandType.MOVE,
      targetPosition: target,
    });
    this.onMoveMarker?.(target);
    return true;
  }

  // ---------------------------------------------------------------------------
  // Public: called by InputManager for attack-move click (A + left-click)
  // ---------------------------------------------------------------------------

  handleAttackMoveClick(sx: number, sy: number): boolean {
    if (this._state.gameMode !== GameMode.RTS) return false;

    const sel = this._getSelection();
    if (!sel || sel.selectedUnitIds.size === 0) return false;

    const world = this._camera.screenToWorld(sx, sy);
    const target = { x: Math.floor(world.x), y: Math.floor(world.y) };

    this._issueCommand({
      type: CommandType.ATTACK_MOVE,
      targetPosition: target,
    });
    return true;
  }

  // ---------------------------------------------------------------------------
  // Public: box-select lifecycle
  // ---------------------------------------------------------------------------

  startBoxSelect(sx: number, sy: number): void {
    if (this._state.gameMode !== GameMode.RTS) return;
    this._boxStart = { x: sx, y: sy };
    this._boxEnd = { x: sx, y: sy };
    this._isBoxSelecting = true;
  }

  updateBoxSelect(sx: number, sy: number): void {
    if (!this._isBoxSelecting || !this._boxStart) return;
    this._boxEnd = { x: sx, y: sy };
    this.onBoxSelectUpdate?.(this._boxStart, this._boxEnd);
  }

  finishBoxSelect(sx: number, sy: number, additive: boolean): void {
    if (!this._isBoxSelecting || !this._boxStart) return;
    this._boxEnd = { x: sx, y: sy };
    this._isBoxSelecting = false;
    this.onBoxSelectEnd?.();

    // Convert box corners to world coords
    const w1 = this._camera.screenToWorld(
      Math.min(this._boxStart.x, this._boxEnd.x),
      Math.min(this._boxStart.y, this._boxEnd.y),
    );
    const w2 = this._camera.screenToWorld(
      Math.max(this._boxStart.x, this._boxEnd.x),
      Math.max(this._boxStart.y, this._boxEnd.y),
    );

    const sel = this._getSelection();
    if (!sel) return;

    if (!additive) {
      sel.selectedUnitIds.clear();
    }

    // Select all owned units within the box
    for (const unit of this._state.units.values()) {
      if (unit.owner !== this._localPlayerId) continue;
      if (unit.state === UnitState.DIE) continue;
      if (
        unit.position.x >= w1.x && unit.position.x <= w2.x &&
        unit.position.y >= w1.y && unit.position.y <= w2.y
      ) {
        sel.selectedUnitIds.add(unit.id);
      }
    }

    this._emitSelectionChanged();
    this._boxStart = null;
    this._boxEnd = null;
  }

  get isBoxSelecting(): boolean {
    return this._isBoxSelecting;
  }

  // ---------------------------------------------------------------------------
  // Public: keyboard commands
  // ---------------------------------------------------------------------------

  handleHold(): void {
    this._issueCommand({ type: CommandType.HOLD });
  }

  handleStop(): void {
    this._issueCommand({ type: CommandType.STOP });
  }

  handlePatrol(sx: number, sy: number): void {
    const world = this._camera.screenToWorld(sx, sy);
    this._issueCommand({
      type: CommandType.PATROL,
      targetPosition: { x: Math.floor(world.x), y: Math.floor(world.y) },
    });
  }

  // ---------------------------------------------------------------------------
  // Public: control groups (Ctrl+1-9 to assign, 1-9 to recall)
  // ---------------------------------------------------------------------------

  assignControlGroup(groupNum: number): void {
    const sel = this._getSelection();
    if (!sel) return;
    sel.controlGroups.set(groupNum, new Set(sel.selectedUnitIds));
    EventBus.emit("controlGroupAssigned", {
      playerId: this._localPlayerId,
      group: groupNum,
      unitIds: [...sel.selectedUnitIds],
    });
  }

  recallControlGroup(groupNum: number): void {
    const sel = this._getSelection();
    if (!sel) return;
    const group = sel.controlGroups.get(groupNum);
    if (!group) return;

    // Filter out dead/removed units
    sel.selectedUnitIds.clear();
    for (const id of group) {
      const unit = this._state.units.get(id);
      if (unit && unit.state !== UnitState.DIE) {
        sel.selectedUnitIds.add(id);
      }
    }
    this._emitSelectionChanged();
  }

  selectAll(): void {
    const sel = this._getSelection();
    if (!sel) return;
    sel.selectedUnitIds.clear();
    for (const unit of this._state.units.values()) {
      if (unit.owner !== this._localPlayerId && unit.state !== UnitState.DIE) continue;
      if (unit.owner === this._localPlayerId) {
        sel.selectedUnitIds.add(unit.id);
      }
    }
    this._emitSelectionChanged();
  }

  // ---------------------------------------------------------------------------
  // Private: autobattler click (unchanged from original)
  // ---------------------------------------------------------------------------

  private _handleAutobattlerClick(sx: number, sy: number): boolean {
    if (shopPanel.container.visible) {
      if (this._isInsideShopPanel(sx, sy)) {
        return true;
      }
      shopPanel.close();
      return true;
    }

    const world = this._camera.screenToWorld(sx, sy);
    const tx = Math.floor(world.x);
    const ty = Math.floor(world.y);

    for (const building of this._state.buildings.values()) {
      if (building.state === BuildingState.DESTROYED) continue;
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
  // Private: RTS left-click
  // ---------------------------------------------------------------------------

  private _handleRTSLeftClick(sx: number, sy: number): boolean {
    // Close shop panel if open
    if (shopPanel.container.visible) {
      if (this._isInsideShopPanel(sx, sy)) return true;
      shopPanel.close();
      return true;
    }

    const sel = this._getSelection();
    if (!sel) return false;

    const world = this._camera.screenToWorld(sx, sy);
    const tx = world.x;
    const ty = world.y;

    // Try to select a single unit under cursor
    const clickedUnit = this._findOwnedUnitAt(tx, ty);
    if (clickedUnit) {
      sel.selectedUnitIds.clear();
      sel.selectedUnitIds.add(clickedUnit.id);
      this._emitSelectionChanged();
      return true;
    }

    // Try to click a building (open shop for owned buildings)
    for (const building of this._state.buildings.values()) {
      if (building.state === BuildingState.DESTROYED) continue;
      if (building.owner !== this._localPlayerId) continue;

      const def = BUILDING_DEFINITIONS[building.type];
      const itx = Math.floor(tx);
      const ity = Math.floor(ty);
      if (
        itx >= building.position.x &&
        itx < building.position.x + def.footprint.w &&
        ity >= building.position.y &&
        ity < building.position.y + def.footprint.h
      ) {
        shopPanel.open(building.id);
        return true;
      }
    }

    // Clicked empty space — deselect
    sel.selectedUnitIds.clear();
    this._emitSelectionChanged();
    return false;
  }

  // ---------------------------------------------------------------------------
  // Private: hit-testing helpers
  // ---------------------------------------------------------------------------

  private _findOwnedUnitAt(wx: number, wy: number) {
    const CLICK_RADIUS_SQ = 0.8; // tiles
    let closest = null;
    let closestDsq = CLICK_RADIUS_SQ;

    for (const unit of this._state.units.values()) {
      if (unit.owner !== this._localPlayerId) continue;
      if (unit.state === UnitState.DIE) continue;
      const dsq = distanceSq(unit.position, { x: wx, y: wy });
      if (dsq < closestDsq) {
        closestDsq = dsq;
        closest = unit;
      }
    }
    return closest;
  }

  private _findEnemyUnitAt(wx: number, wy: number) {
    const CLICK_RADIUS_SQ = 0.8;
    let closest = null;
    let closestDsq = CLICK_RADIUS_SQ;

    for (const unit of this._state.units.values()) {
      if (unit.owner === this._localPlayerId) continue;
      if (unit.state === UnitState.DIE) continue;
      const dsq = distanceSq(unit.position, { x: wx, y: wy });
      if (dsq < closestDsq) {
        closestDsq = dsq;
        closest = unit;
      }
    }
    return closest;
  }

  private _findEnemyBuildingAt(wx: number, wy: number) {
    const itx = Math.floor(wx);
    const ity = Math.floor(wy);

    for (const building of this._state.buildings.values()) {
      if (building.state === BuildingState.DESTROYED) continue;
      if (building.owner === this._localPlayerId) continue;
      if (building.owner === null) continue;

      const def = BUILDING_DEFINITIONS[building.type];
      if (
        itx >= building.position.x &&
        itx < building.position.x + def.footprint.w &&
        ity >= building.position.y &&
        ity < building.position.y + def.footprint.h
      ) {
        return building;
      }
    }
    return null;
  }

  private _findResourceNodeAt(wx: number, wy: number) {
    const CLICK_RADIUS_SQ = 1.5;
    let closest = null;
    let closestDsq = CLICK_RADIUS_SQ;

    for (const node of this._state.resourceNodes.values()) {
      if (node.remaining <= 0) continue;
      const dsq = distanceSq(node.position, { x: wx, y: wy });
      if (dsq < closestDsq) {
        closestDsq = dsq;
        closest = node;
      }
    }
    return closest;
  }

  // ---------------------------------------------------------------------------
  // Private: command issuing
  // ---------------------------------------------------------------------------

  private _issueCommand(cmd: UnitCommand): void {
    const sel = this._getSelection();
    if (!sel) return;

    for (const unitId of sel.selectedUnitIds) {
      const unit = this._state.units.get(unitId);
      if (!unit || unit.state === UnitState.DIE) continue;

      if (cmd.queued) {
        unit.commandQueue.push({ ...cmd });
      } else {
        unit.command = { ...cmd };
        unit.commandQueue = [];
      }
    }

    EventBus.emit("unitCommandIssued", {
      unitIds: [...sel.selectedUnitIds],
      command: cmd,
    });
  }

  // ---------------------------------------------------------------------------
  // Private: selection state access
  // ---------------------------------------------------------------------------

  private _getSelection() {
    return this._state.selection?.get(this._localPlayerId) ?? null;
  }

  private _emitSelectionChanged(): void {
    this.onSelectionChanged?.();
    EventBus.emit("selectionChanged", {
      playerId: this._localPlayerId,
      selectedIds: [...this.selectedUnitIds],
    });
  }

  // ---------------------------------------------------------------------------
  // Private: shop panel hit-test
  // ---------------------------------------------------------------------------

  private _isInsideShopPanel(sx: number, sy: number): boolean {
    const c = shopPanel.container;
    if (!c.visible) return false;
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
