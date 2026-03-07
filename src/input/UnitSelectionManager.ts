// RTS-style unit selection and command manager
// Owns the set of selected unit IDs (UI state) and issues player commands
// by mutating Unit fields (sim state).

import type { GameState } from "@sim/state/GameState";
import { isEnemy } from "@sim/state/GameState";
import type { Unit } from "@sim/entities/Unit";
import type { Camera } from "@view/Camera";
import type { PlayerId, Vec2 } from "@/types";
import { UnitState, BuildingState } from "@/types";
import { startMoving } from "@sim/systems/MovementSystem";
import { EventBus } from "@sim/core/EventBus";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Tile-space radius for single-click unit hit detection. */
const HIT_RADIUS = 0.6;
const HIT_RADIUS_SQ = HIT_RADIUS * HIT_RADIUS;

// ---------------------------------------------------------------------------
// UnitSelectionManager
// ---------------------------------------------------------------------------

class UnitSelectionManager {
  readonly selectedUnitIds = new Set<string>();

  // Box-select state (screen-space pixels)
  private _boxStartX = 0;
  private _boxStartY = 0;
  private _boxEndX = 0;
  private _boxEndY = 0;
  private _isBoxSelecting = false;

  private _unsubscribers: (() => void)[] = [];

  // -------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------

  init(): void {
    this._unsubscribers.push(
      EventBus.on("unitDied", ({ unitId }) => {
        this.selectedUnitIds.delete(unitId);
      }),
      EventBus.on("phaseChanged", () => {
        this.deselectAll();
      }),
    );
  }

  destroy(): void {
    for (const unsub of this._unsubscribers) unsub();
    this._unsubscribers.length = 0;
    this.selectedUnitIds.clear();
  }

  // -------------------------------------------------------------------
  // Selection
  // -------------------------------------------------------------------

  selectUnit(unitId: string): void {
    this.selectedUnitIds.clear();
    this.selectedUnitIds.add(unitId);
  }

  deselectAll(): void {
    this.selectedUnitIds.clear();
  }

  isSelected(unitId: string): boolean {
    return this.selectedUnitIds.has(unitId);
  }

  get hasSelection(): boolean {
    return this.selectedUnitIds.size > 0;
  }

  // -------------------------------------------------------------------
  // Box selection
  // -------------------------------------------------------------------

  startBox(sx: number, sy: number): void {
    this._boxStartX = sx;
    this._boxStartY = sy;
    this._boxEndX = sx;
    this._boxEndY = sy;
    this._isBoxSelecting = true;
  }

  updateBox(sx: number, sy: number): void {
    this._boxEndX = sx;
    this._boxEndY = sy;
  }

  cancelBox(): void {
    this._isBoxSelecting = false;
  }

  endBox(
    state: GameState,
    camera: Camera,
    localPlayerId: PlayerId,
  ): void {
    if (!this._isBoxSelecting) return;
    this._isBoxSelecting = false;

    // Convert screen corners to world (tile) coords
    const w0 = camera.screenToWorld(this._boxStartX, this._boxStartY);
    const w1 = camera.screenToWorld(this._boxEndX, this._boxEndY);

    const minX = Math.min(w0.x, w1.x);
    const maxX = Math.max(w0.x, w1.x);
    const minY = Math.min(w0.y, w1.y);
    const maxY = Math.max(w0.y, w1.y);

    this.selectedUnitIds.clear();

    for (const unit of state.units.values()) {
      if (unit.owner !== localPlayerId) continue;
      if (unit.state === UnitState.DIE) continue;
      const { x, y } = unit.position;
      if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
        this.selectedUnitIds.add(unit.id);
      }
    }
  }

  get isBoxSelecting(): boolean {
    return this._isBoxSelecting;
  }

  /** Returns screen-space box for rendering, or null. */
  get selectionBox(): { x1: number; y1: number; x2: number; y2: number } | null {
    if (!this._isBoxSelecting) return null;
    return {
      x1: this._boxStartX,
      y1: this._boxStartY,
      x2: this._boxEndX,
      y2: this._boxEndY,
    };
  }

  // -------------------------------------------------------------------
  // Hit-testing
  // -------------------------------------------------------------------

  /** Find the nearest unit to a world position within HIT_RADIUS. */
  hitTestUnit(
    state: GameState,
    worldX: number,
    worldY: number,
    filterOwner?: PlayerId,
  ): Unit | null {
    let nearest: Unit | null = null;
    let nearestDsq = HIT_RADIUS_SQ;

    for (const unit of state.units.values()) {
      if (unit.state === UnitState.DIE) continue;
      if (filterOwner !== undefined && unit.owner !== filterOwner) continue;
      const dx = unit.position.x - worldX;
      const dy = unit.position.y - worldY;
      const dsq = dx * dx + dy * dy;
      if (dsq < nearestDsq) {
        nearest = unit;
        nearestDsq = dsq;
      }
    }
    return nearest;
  }

  /** Find nearest enemy unit or building at a world position. */
  hitTestEnemy(
    state: GameState,
    worldX: number,
    worldY: number,
    localPlayerId: PlayerId,
  ): { id: string; position: Vec2 } | null {
    // Check enemy units first
    for (const unit of state.units.values()) {
      if (unit.state === UnitState.DIE) continue;
      if (!isEnemy(state, localPlayerId, unit.owner)) continue;
      const dx = unit.position.x - worldX;
      const dy = unit.position.y - worldY;
      if (dx * dx + dy * dy < HIT_RADIUS_SQ) {
        return { id: unit.id, position: { ...unit.position } };
      }
    }

    // Check enemy buildings
    const tx = Math.floor(worldX);
    const ty = Math.floor(worldY);
    for (const building of state.buildings.values()) {
      if (building.owner === null) continue;
      if (!isEnemy(state, localPlayerId, building.owner)) continue;
      if (building.state !== BuildingState.ACTIVE) continue;
      if (building.position.x === tx && building.position.y === ty) {
        return { id: building.id, position: { ...building.position } };
      }
    }

    return null;
  }

  // -------------------------------------------------------------------
  // Commands
  // -------------------------------------------------------------------

  /** Right-click on ground: move selected units to the position. */
  issueMoveTo(worldPos: Vec2, state: GameState): void {
    const ids = [...this.selectedUnitIds].filter((id) => {
      const u = state.units.get(id);
      return u && u.state !== UnitState.DIE;
    });
    if (ids.length === 0) return;

    for (const id of ids) {
      const unit = state.units.get(id)!;
      unit.playerCommandGoal = { ...worldPos };
      unit.playerCommandTargetId = null;
      unit.playerControlled = true;
      unit.groupId = null;
      unit.formationOffset = { x: 0, y: 0 };
      startMoving(state, unit, worldPos);
    }

    EventBus.emit("playerCommandIssued", { unitIds: ids, goal: worldPos });
  }

  /** Right-click on enemy: attack-move selected units toward it. */
  issueAttackTarget(
    targetId: string,
    targetPos: Vec2,
    state: GameState,
  ): void {
    const ids = [...this.selectedUnitIds].filter((id) => {
      const u = state.units.get(id);
      return u && u.state !== UnitState.DIE;
    });
    if (ids.length === 0) return;

    for (const id of ids) {
      const unit = state.units.get(id)!;
      unit.playerCommandGoal = null;
      unit.playerCommandTargetId = targetId;
      unit.playerControlled = true;
      startMoving(state, unit, targetPos);
    }

    EventBus.emit("playerCommandIssued", {
      unitIds: ids,
      goal: targetPos,
      targetId,
    });
  }
}

export const unitSelectionManager = new UnitSelectionManager();
