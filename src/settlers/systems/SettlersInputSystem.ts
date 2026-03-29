// ---------------------------------------------------------------------------
// Settlers – Input system (mouse/keyboard + raycasting tile pick)
// ---------------------------------------------------------------------------

import * as THREE from "three";
import { SB } from "../config/SettlersBalance";
import { SettlersCameraController } from "../view/SettlersCameraController";
import type { SettlersState } from "../state/SettlersState";

export class SettlersInputSystem {
  private _camera: SettlersCameraController;
  private _raycaster = new THREE.Raycaster();
  private _mouse = new THREE.Vector2();
  private _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private _terrainMesh: THREE.Mesh | null = null;

  // Bound handlers for cleanup
  private _onKeyDown: (e: KeyboardEvent) => void;
  private _onKeyUp: (e: KeyboardEvent) => void;
  private _onMouseMove: (e: MouseEvent) => void;
  private _onMouseDown: (e: MouseEvent) => void;
  private _onContextMenu: (e: MouseEvent) => void;
  private _onWheel: (e: WheelEvent) => void;
  private _canvas: HTMLCanvasElement | null = null;

  // Callbacks
  onLeftClick: ((tileX: number, tileZ: number) => void) | null = null;
  onRightClick: (() => void) | null = null;
  onEscape: (() => void) | null = null;
  onSave: (() => void) | null = null;
  onLoad: (() => void) | null = null;
  onToggleWiki: (() => void) | null = null;
  onToggleAudio: (() => void) | null = null;
  onSpeedChange: ((speed: number) => void) | null = null;

  constructor(camera: SettlersCameraController) {
    this._camera = camera;

    this._onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        this.onEscape?.();
        return;
      }
      this._camera.onKeyDown(e.code);

      // Tool shortcuts
      if (e.code === "KeyB") this._setTool("build");
      if (e.code === "KeyR") this._setTool("road");
      if (e.code === "KeyF") this._setTool("flag");
      if (e.code === "KeyX") this._setTool("demolish");
      if (e.code === "KeyT") this._setTool("attack");
      if (e.code === "Space") this._togglePause();
      if (e.code === "KeyH") this.onToggleWiki?.();
      if (e.code === "KeyM") this.onToggleAudio?.();
      if (e.code === "F5") { e.preventDefault(); this.onSave?.(); }
      if (e.code === "F9") { e.preventDefault(); this.onLoad?.(); }
      if (e.key === "+" || e.key === "=") this._changeSpeed(1.5);
      if (e.key === "-" || e.key === "_") this._changeSpeed(1 / 1.5);
      if (e.key === "9") this._camera.zoomBy(0.8);  // zoom in 20%
      if (e.key === "0") this._camera.zoomBy(1.2); // zoom out 20%
    };

    this._onKeyUp = (e: KeyboardEvent) => {
      this._camera.onKeyUp(e.code);
    };

    this._onMouseMove = (e: MouseEvent) => {
      this._mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this._mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    this._onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        // Left click – pick tile
        const tile = this._pickTile();
        if (tile && this.onLeftClick) {
          this.onLeftClick(tile.x, tile.z);
        }
      }
    };

    this._onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      this.onRightClick?.();
    };

    this._onWheel = (e: WheelEvent) => {
      e.preventDefault();
      this._camera.onWheel(e.deltaY);
    };
  }

  private _state: SettlersState | null = null;

  private _setTool(tool: string): void {
    if (!this._state) return;
    const validTools = ["select", "build", "road", "flag", "demolish", "attack"];
    if (!validTools.includes(tool)) return;
    this._state.selectedTool = tool as SettlersState["selectedTool"];
    if (tool !== "build") {
      this._state.selectedBuildingType = null;
    }
  }

  private _togglePause(): void {
    if (this._state) this._state.paused = !this._state.paused;
  }

  private _changeSpeed(factor: number): void {
    if (!this._state) return;
    const newSpeed = Math.round(this._state.gameSpeed * factor * 100) / 100;
    this._state.gameSpeed = Math.max(0.5, Math.min(10, newSpeed));
    this.onSpeedChange?.(this._state.gameSpeed);
  }

  setTerrainMesh(mesh: THREE.Mesh): void {
    this._terrainMesh = mesh;
  }

  setState(state: SettlersState): void {
    this._state = state;
  }

  init(canvas: HTMLCanvasElement): void {
    this._canvas = canvas;
    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
    canvas.addEventListener("mousemove", this._onMouseMove);
    canvas.addEventListener("mousedown", this._onMouseDown);
    canvas.addEventListener("contextmenu", this._onContextMenu);
    canvas.addEventListener("wheel", this._onWheel, { passive: false });
  }

  destroy(): void {
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
    if (this._canvas) {
      this._canvas.removeEventListener("mousemove", this._onMouseMove);
      this._canvas.removeEventListener("mousedown", this._onMouseDown);
      this._canvas.removeEventListener("contextmenu", this._onContextMenu);
      this._canvas.removeEventListener("wheel", this._onWheel);
      this._canvas = null;
    }
  }

  /** Update hovered tile each frame */
  update(state: SettlersState): void {
    this._state = state;
    const tile = this._pickTile();
    state.hoveredTile = tile;
  }

  /** Raycast against terrain to find which tile the mouse is over */
  private _pickTile(): { x: number; z: number } | null {
    this._raycaster.setFromCamera(this._mouse, this._camera.camera);

    if (this._terrainMesh) {
      const hits = this._raycaster.intersectObject(this._terrainMesh);
      if (hits.length > 0) {
        const p = hits[0].point;
        const tx = Math.floor(p.x / SB.TILE_SIZE);
        const tz = Math.floor(p.z / SB.TILE_SIZE);
        if (tx >= 0 && tx < SB.MAP_WIDTH && tz >= 0 && tz < SB.MAP_HEIGHT) {
          return { x: tx, z: tz };
        }
      }
    } else {
      // Fallback: intersect with ground plane
      const intersection = new THREE.Vector3();
      this._raycaster.ray.intersectPlane(this._groundPlane, intersection);
      if (intersection) {
        const tx = Math.floor(intersection.x / SB.TILE_SIZE);
        const tz = Math.floor(intersection.z / SB.TILE_SIZE);
        if (tx >= 0 && tx < SB.MAP_WIDTH && tz >= 0 && tz < SB.MAP_HEIGHT) {
          return { x: tx, z: tz };
        }
      }
    }
    return null;
  }
}
