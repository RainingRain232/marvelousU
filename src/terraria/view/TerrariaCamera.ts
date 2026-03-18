// ---------------------------------------------------------------------------
// Terraria – Camera (smooth follow + screen shake)
// ---------------------------------------------------------------------------

import { TB } from "../config/TerrariaBalance";

export class TerrariaCamera {
  x = 0;  // world position (blocks) that camera centers on
  y = 0;
  screenW = 0;
  screenH = 0;

  private _shakeAmount = 0;
  private _shakeTimer = 0;
  private _shakeOffsetX = 0;
  private _shakeOffsetY = 0;

  setScreenSize(w: number, h: number): void {
    this.screenW = w;
    this.screenH = h;
  }

  /** Smoothly follow a target position. */
  follow(targetX: number, targetY: number, dt: number): void {
    const lerp = 1 - Math.pow(0.02, dt);
    this.x += (targetX - this.x) * lerp;
    this.y += (targetY - this.y) * lerp;

    // Clamp to world bounds
    const halfW = (this.screenW / TB.TILE_SIZE) / 2;
    const halfH = (this.screenH / TB.TILE_SIZE) / 2;
    this.x = Math.max(halfW, Math.min(TB.WORLD_WIDTH - halfW, this.x));
    this.y = Math.max(halfH, Math.min(TB.WORLD_HEIGHT - halfH, this.y));
  }

  shake(amount: number, duration: number): void {
    this._shakeAmount = amount;
    this._shakeTimer = duration;
  }

  update(dt: number): void {
    if (this._shakeTimer > 0) {
      this._shakeTimer -= dt;
      this._shakeOffsetX = (Math.random() - 0.5) * 2 * this._shakeAmount;
      this._shakeOffsetY = (Math.random() - 0.5) * 2 * this._shakeAmount;
    } else {
      this._shakeOffsetX = 0;
      this._shakeOffsetY = 0;
    }
  }

  /** Convert world block coordinates to screen pixel coordinates. */
  worldToScreen(wx: number, wy: number): { sx: number; sy: number } {
    const sx = (wx - this.x) * TB.TILE_SIZE + this.screenW / 2 + this._shakeOffsetX;
    // Y is flipped: world Y-up, screen Y-down
    const sy = (this.y - wy) * TB.TILE_SIZE + this.screenH / 2 + this._shakeOffsetY;
    return { sx, sy };
  }

  /** Convert screen pixel coordinates to world block coordinates. */
  screenToWorld(sx: number, sy: number): { wx: number; wy: number } {
    const wx = (sx - this.screenW / 2) / TB.TILE_SIZE + this.x;
    const wy = this.y - (sy - this.screenH / 2) / TB.TILE_SIZE;
    return { wx, wy };
  }

  /** Get visible block bounds. */
  getVisibleBounds(): { minX: number; maxX: number; minY: number; maxY: number } {
    const halfW = (this.screenW / TB.TILE_SIZE) / 2 + 2;
    const halfH = (this.screenH / TB.TILE_SIZE) / 2 + 2;
    return {
      minX: Math.floor(this.x - halfW),
      maxX: Math.ceil(this.x + halfW),
      minY: Math.floor(this.y - halfH),
      maxY: Math.ceil(this.y + halfH),
    };
  }
}
