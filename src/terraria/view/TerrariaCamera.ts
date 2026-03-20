// ---------------------------------------------------------------------------
// Terraria – Camera (smooth follow + screen shake)
// ---------------------------------------------------------------------------

import { TB } from "../config/TerrariaBalance";

export class TerrariaCamera {
  x = 0;
  y = 0;
  screenW = 0;
  screenH = 0;
  worldWidth: number = TB.WORLD_WIDTH;

  private _shakeAmount = 0;
  private _shakeTimer = 0;
  private _shakeOffsetX = 0;
  private _shakeOffsetY = 0;

  // Lookahead: camera leads player in movement direction
  private _lookaheadX = 0;
  private _lookaheadY = 0;

  setScreenSize(w: number, h: number): void {
    this.screenW = w;
    this.screenH = h;
  }

  /** Smoothly follow a target position with lookahead. */
  follow(targetX: number, targetY: number, dt: number, vx = 0, vy = 0): void {
    // Lookahead: offset camera target in movement direction
    const lookaheadDist = 3.5;
    const targetLookX = Math.sign(vx) * Math.min(Math.abs(vx) * 0.3, lookaheadDist);
    const targetLookY = Math.sign(vy) * Math.min(Math.abs(vy) * 0.15, lookaheadDist * 0.5);
    const lookSmooth = 1 - Math.pow(0.08, dt);
    this._lookaheadX += (targetLookX - this._lookaheadX) * lookSmooth;
    this._lookaheadY += (targetLookY - this._lookaheadY) * lookSmooth;

    const finalTargetX = targetX + this._lookaheadX;
    const finalTargetY = targetY + this._lookaheadY;

    const lerp = 1 - Math.pow(0.02, dt);
    this.x += (finalTargetX - this.x) * lerp;
    this.y += (finalTargetY - this.y) * lerp;

    // Clamp to world bounds
    const halfW = (this.screenW / TB.TILE_SIZE) / 2;
    const halfH = (this.screenH / TB.TILE_SIZE) / 2;
    this.x = Math.max(halfW, Math.min(this.worldWidth - halfW, this.x));
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
