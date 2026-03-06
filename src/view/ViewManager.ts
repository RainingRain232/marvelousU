// Initializes Pixi app, manages all view layers
import { Application, Container } from "pixi.js";
import type { GameState } from "@sim/state/GameState";
import { Camera } from "@view/Camera";

// ---------------------------------------------------------------------------
// Layer names (z-order, bottom to top)
// ---------------------------------------------------------------------------

export type LayerName = "background" | "buildings" | "groundfx" | "units" | "fx" | "ui";

const LAYER_ORDER: LayerName[] = [
  "background",
  "buildings",
  "groundfx",
  "units",
  "fx",
  "ui",
];

// ---------------------------------------------------------------------------
// ViewManager
// ---------------------------------------------------------------------------

/**
 * Owns the PixiJS Application and all display-layer containers.
 *
 * Layer stack (bottom → top):
 *   background  — terrain tiles, grid overlay
 *   buildings   — building sprites and health bars
 *   units       — unit sprites (depth-sorted each frame)
 *   fx          — spell effects, projectiles, particles
 *   ui          — HUD, shop panel, tooltips (always on top, not camera-transformed)
 *
 * Usage:
 *   const vm = new ViewManager();
 *   await vm.init(document.getElementById("pixi-container")!);
 *   // Each frame: vm.update(state, dt) — called from app.ticker
 */
export class ViewManager {
  app!: Application;
  camera: Camera = new Camera();

  // Named layer containers — use these in entity views
  readonly layers: Record<LayerName, Container> = {
    background: new Container(),
    buildings: new Container(),
    groundfx: new Container(),
    units: new Container(),
    fx: new Container(),
    ui: new Container(),
  };

  // World container: holds all camera-transformed layers (all except ui)
  private _world!: Container;

  // Per-frame update callbacks registered by entity views
  private _updateCallbacks: Array<(state: GameState, dt: number) => void> = [];

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Create the PixiJS application, append its canvas to `mountPoint`, and
   * set up the layer hierarchy. Must be awaited before any rendering occurs.
   */
  async init(mountPoint: HTMLElement): Promise<void> {
    this.app = new Application();

    await this.app.init({
      background: "#1a1a2e",
      resizeTo: window,
      antialias: false, // pixel-art style; disable for performance
      autoDensity: true,
      resolution: window.devicePixelRatio ?? 1,
    });

    mountPoint.appendChild(this.app.canvas);

    // World container receives camera transform
    this._world = new Container();
    this.app.stage.addChild(this._world);

    // Stack layers in order (background first, ui last)
    for (const name of LAYER_ORDER) {
      const layer = this.layers[name];
      if (name === "ui") {
        // UI lives directly on stage — unaffected by camera pan/zoom
        this.app.stage.addChild(layer);
      } else {
        this._world.addChild(layer);
      }
    }

    // Hook the render loop
    this.app.ticker.add(this._onTick);

    // Sync camera transform on resize and set initial screen size
    this.app.renderer.on("resize", this._onResize);
    this.camera.setScreenSize(this.app.screen.width, this.app.screen.height);

    // Attach camera input to the canvas
    this.camera.attach(this.app.canvas as HTMLCanvasElement);
  }

  /** Remove the canvas and all listeners. */
  destroy(): void {
    this.app.ticker.remove(this._onTick);
    this.app.renderer.off("resize", this._onResize);
    this.camera.detach();
    this.app.destroy(true, { children: true });
    this._updateCallbacks = [];
  }

  // ---------------------------------------------------------------------------
  // Camera
  // ---------------------------------------------------------------------------

  /** Apply current Camera values to the world container. */
  private _syncCamera = (): void => {
    this._world.scale.set(this.camera.zoom);
    this._world.position.set(
      this.camera.x * this.camera.zoom,
      this.camera.y * this.camera.zoom,
    );
  };

  /** Called on renderer resize — updates camera bounds then syncs transform. */
  private _onResize = (w: number, h: number): void => {
    this.camera.setScreenSize(w, h);
    this._syncCamera();
  };

  // ---------------------------------------------------------------------------
  // Update loop
  // ---------------------------------------------------------------------------

  /**
   * Register a per-frame callback (called by entity views to sync sprites).
   * Returns an unregister function.
   */
  onUpdate(cb: (state: GameState, dt: number) => void): () => void {
    this._updateCallbacks.push(cb);
    return () => {
      this._updateCallbacks = this._updateCallbacks.filter((c) => c !== cb);
    };
  }

  /**
   * Drive one visual frame. Normally called from the Pixi ticker, but
   * can also be driven externally (e.g., from SimLoop after a sim step).
   *
   * @param state - Current (read-only) simulation state.
   * @param dt    - Elapsed seconds since last frame.
   */
  update(state: GameState, dt: number): void {
    this._syncCamera();
    for (const cb of this._updateCallbacks) cb(state, dt);
  }

  // Internal ticker callback — drives keyboard pan and syncs camera transform.
  private _onTick = (ticker: { deltaTime: number; deltaMS: number }): void => {
    this.camera.update(ticker.deltaMS / 1000);
    this._syncCamera();
  };

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /** Pixel dimensions of the current renderer output. */
  get screenWidth(): number {
    return this.app.screen.width;
  }
  get screenHeight(): number {
    return this.app.screen.height;
  }

  /** Convenience: add a display object to a named layer. */
  addToLayer(
    name: LayerName,
    child: Parameters<Container["addChild"]>[0],
  ): void {
    this.layers[name].addChild(child);
  }

  /** Convenience: remove a display object from a named layer. */
  removeFromLayer(
    name: LayerName,
    child: Parameters<Container["removeChild"]>[0],
  ): void {
    this.layers[name].removeChild(child);
  }

  /**
   * Remove all children from world layers (background, buildings, groundfx,
   * units, fx) and clear per-frame update callbacks.  UI layer is left intact
   * so persistent screens (shop, menu) survive.  Call before re-running
   * `_bootGame` to ensure a clean visual slate.
   */
  clearWorld(): void {
    for (const name of ["background", "buildings", "groundfx", "units", "fx"] as LayerName[]) {
      this.layers[name].removeChildren();
    }
    this._updateCallbacks = [];
  }
}

// ---------------------------------------------------------------------------
// Singleton — one ViewManager per application
// ---------------------------------------------------------------------------

export const viewManager = new ViewManager();
