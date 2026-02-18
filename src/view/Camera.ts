// Pan, zoom, screen-to-world transforms
import type { Vec2 } from "@/types";
import { BalanceConfig } from "@sim/config/BalanceConfig";

export class Camera {
  x      = 0;
  y      = 0;
  zoom   = 1;

  screenToWorld(px: number, py: number): Vec2 {
    return {
      x: (px / this.zoom - this.x) / BalanceConfig.TILE_SIZE,
      y: (py / this.zoom - this.y) / BalanceConfig.TILE_SIZE,
    };
  }

  worldToScreen(x: number, y: number): Vec2 {
    return {
      x: (x * BalanceConfig.TILE_SIZE + this.x) * this.zoom,
      y: (y * BalanceConfig.TILE_SIZE + this.y) * this.zoom,
    };
  }
}
