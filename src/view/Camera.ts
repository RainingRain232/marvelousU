// Pan, zoom, screen-to-world transforms
import type { Vec2 } from "@/types";
import { BalanceConfig } from "@sim/config/BalanceConfig";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ZOOM_MIN = 0.25;
const ZOOM_MAX = 3.0;
const ZOOM_STEP = 0.1; // zoom factor per scroll notch
const PAN_SPEED_PX = 400; // pixels per second for keyboard pan

// ---------------------------------------------------------------------------
// Camera
// ---------------------------------------------------------------------------

/**
 * Camera manages the viewport transform for the world container.
 *
 * Coordinate conventions (matching ViewManager._syncCamera):
 *   world.position = { x: camera.x * camera.zoom, y: camera.y * camera.zoom }
 *   world.scale    = camera.zoom
 *
 * So camera.x / camera.y are pre-zoom pixel offsets (top-left origin).
 *
 * Pan inputs:
 *   - Pointer drag (left button) on the canvas
 *   - WASD / arrow keys (velocity-based, call update(dt) each frame)
 *
 * Zoom inputs:
 *   - Mouse wheel (scroll) — zooms toward the cursor position
 */
export class Camera {
  x = 0;
  y = 0;
  zoom = 1;

  // Screen dimensions — must be set/updated when the renderer resizes
  screenW = 800;
  screenH = 600;

  // ---------------------------------------------------------------------------
  // Keyboard pan state
  // ---------------------------------------------------------------------------

  private _keys = { left: false, right: false, up: false, down: false };

  // ---------------------------------------------------------------------------
  // Drag pan state
  // ---------------------------------------------------------------------------

  private _dragging = false;
  private _dragStartX = 0;
  private _dragStartY = 0;
  private _camStartX = 0;
  private _camStartY = 0;

  // ---------------------------------------------------------------------------
  // DOM event handlers (stored so we can removeEventListener later)
  // ---------------------------------------------------------------------------

  private _canvas: HTMLCanvasElement | null = null;

  private _onWheel = this._handleWheel.bind(this);
  private _onPointerDown = this._handlePointerDown.bind(this);
  private _onPointerMove = this._handlePointerMove.bind(this);
  private _onPointerUp = this._handlePointerUp.bind(this);
  private _onKeyDown = this._handleKeyDown.bind(this);
  private _onKeyUp = this._handleKeyUp.bind(this);
  private _onContextMenu = (e: Event) => e.preventDefault();

  // ---------------------------------------------------------------------------
  // Transforms
  // ---------------------------------------------------------------------------

  /**
   * Convert a screen pixel position to a tile-space world coordinate.
   *
   *   world_px  = screen_px / zoom - camera.x
   *   tile      = world_px / TILE_SIZE
   */
  screenToWorld(px: number, py: number): Vec2 {
    return {
      x: (px / this.zoom - this.x) / BalanceConfig.TILE_SIZE,
      y: (py / this.zoom - this.y) / BalanceConfig.TILE_SIZE,
    };
  }

  /**
   * Convert a tile-space world coordinate to screen pixels.
   *
   *   screen_px = (tile * TILE_SIZE + camera.x) * zoom
   */
  worldToScreen(tx: number, ty: number): Vec2 {
    return {
      x: (tx * BalanceConfig.TILE_SIZE + this.x) * this.zoom,
      y: (ty * BalanceConfig.TILE_SIZE + this.y) * this.zoom,
    };
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Attach input listeners to the canvas and keyboard.
   * Call once after the Pixi Application is initialised.
   */
  attach(canvas: HTMLCanvasElement): void {
    if (this._canvas) this.detach();
    this._canvas = canvas;

    canvas.addEventListener("wheel", this._onWheel, { passive: false });
    canvas.addEventListener("pointerdown", this._onPointerDown);
    canvas.addEventListener("pointermove", this._onPointerMove);
    canvas.addEventListener("pointerup", this._onPointerUp);
    canvas.addEventListener("pointercancel", this._onPointerUp);
    canvas.addEventListener("contextmenu", this._onContextMenu);

    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
  }

  /** Remove all event listeners previously registered by attach(). */
  detach(): void {
    if (!this._canvas) return;
    const c = this._canvas;

    c.removeEventListener("wheel", this._onWheel);
    c.removeEventListener("pointerdown", this._onPointerDown);
    c.removeEventListener("pointermove", this._onPointerMove);
    c.removeEventListener("pointerup", this._onPointerUp);
    c.removeEventListener("pointercancel", this._onPointerUp);
    c.removeEventListener("contextmenu", this._onContextMenu);

    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);

    this._canvas = null;
    this._dragging = false;
  }

  /**
   * Per-frame update — drives keyboard panning.
   * Call from the render loop with the elapsed time in seconds.
   */
  update(dt: number): void {
    let dx = 0;
    let dy = 0;

    if (this._keys.left) dx -= 1;
    if (this._keys.right) dx += 1;
    if (this._keys.up) dy -= 1;
    if (this._keys.down) dy += 1;

    if (dx !== 0 || dy !== 0) {
      // Normalise diagonal movement, then scale by speed / zoom
      const len = Math.sqrt(dx * dx + dy * dy);
      const speed = PAN_SPEED_PX / this.zoom;
      this.x -= (dx / len) * speed * dt;
      this.y -= (dy / len) * speed * dt;
      this._clamp();
    }
  }

  /**
   * Set screen dimensions (call on renderer resize).
   * Reclamping is applied immediately.
   */
  setScreenSize(w: number, h: number): void {
    this.screenW = w;
    this.screenH = h;
    this._clamp();
  }

  // ---------------------------------------------------------------------------
  // Clamping
  // ---------------------------------------------------------------------------

  /**
   * Clamp camera.x/y so the world never scrolls beyond the grid extents.
   *
   * World size in pixels:
   *   worldPxW = GRID_WIDTH  * TILE_SIZE
   *   worldPxH = GRID_HEIGHT * TILE_SIZE
   *
   * The world container is rendered at zoom, so visible area in world-pixels:
   *   visW = screenW / zoom
   *   visH = screenH / zoom
   *
   * camera.x is the left edge of the view in pre-zoom world pixels (negated).
   * Valid range: -(worldPxW - visW) .. 0   (when world wider than screen)
   *              clamped to 0 when world narrower than screen (centred).
   */
  private _clamp(): void {
    const tileSize = BalanceConfig.TILE_SIZE;
    const worldPxW = BalanceConfig.GRID_WIDTH * tileSize;
    const worldPxH = BalanceConfig.GRID_HEIGHT * tileSize;
    const visW = this.screenW / this.zoom;
    const visH = this.screenH / this.zoom;

    const minX = -(worldPxW - Math.min(visW, worldPxW));
    const minY = -(worldPxH - Math.min(visH, worldPxH));

    this.x = Math.min(0, Math.max(minX, this.x));
    this.y = Math.min(0, Math.max(minY, this.y));
  }

  // ---------------------------------------------------------------------------
  // Event handlers — wheel (zoom)
  // ---------------------------------------------------------------------------

  private _handleWheel(e: WheelEvent): void {
    e.preventDefault();

    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    const newZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, this.zoom + delta));
    if (newZoom === this.zoom) return;

    // Zoom toward the cursor: keep the world point under the cursor fixed.
    // world_px = screen_px / zoom - camera
    // We want:  screen_px / newZoom - newCamera = screen_px / oldZoom - oldCamera
    //           newCamera = screen_px / newZoom - (screen_px / oldZoom - oldCamera)
    const cursorX = e.offsetX;
    const cursorY = e.offsetY;

    this.x = cursorX / newZoom - (cursorX / this.zoom - this.x);
    this.y = cursorY / newZoom - (cursorY / this.zoom - this.y);
    this.zoom = newZoom;

    this._clamp();
  }

  // ---------------------------------------------------------------------------
  // Event handlers — pointer drag (pan)
  // ---------------------------------------------------------------------------

  private _handlePointerDown(e: PointerEvent): void {
    // Left button only
    if (e.button !== 0) return;
    this._dragging = true;
    this._dragStartX = e.clientX;
    this._dragStartY = e.clientY;
    this._camStartX = this.x;
    this._camStartY = this.y;
    (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
  }

  private _handlePointerMove(e: PointerEvent): void {
    if (!this._dragging) return;
    // Convert screen-pixel drag to pre-zoom camera offset
    const dx = (e.clientX - this._dragStartX) / this.zoom;
    const dy = (e.clientY - this._dragStartY) / this.zoom;
    this.x = this._camStartX + dx;
    this.y = this._camStartY + dy;
    this._clamp();
  }

  private _handlePointerUp(e: PointerEvent): void {
    if (!this._dragging) return;
    this._dragging = false;
    (e.currentTarget as HTMLCanvasElement).releasePointerCapture(e.pointerId);
  }

  // ---------------------------------------------------------------------------
  // Event handlers — keyboard pan (WASD + arrow keys)
  // ---------------------------------------------------------------------------

  private _handleKeyDown(e: KeyboardEvent): void {
    this._setKey(e.code, true);
  }

  private _handleKeyUp(e: KeyboardEvent): void {
    this._setKey(e.code, false);
  }

  private _setKey(code: string, down: boolean): void {
    switch (code) {
      case "KeyA":
      case "ArrowLeft":
        this._keys.left = down;
        break;
      case "KeyD":
      case "ArrowRight":
        this._keys.right = down;
        break;
      case "KeyW":
      case "ArrowUp":
        this._keys.up = down;
        break;
      case "KeyS":
      case "ArrowDown":
        this._keys.down = down;
        break;
    }
  }
}
