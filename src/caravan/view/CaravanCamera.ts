// ---------------------------------------------------------------------------
// Caravan camera — follow caravan with smooth lerp + screen shake
// ---------------------------------------------------------------------------

import { BalanceConfig } from "@sim/config/BalanceConfig";
import { viewManager } from "@view/ViewManager";
import { CaravanBalance } from "../config/CaravanBalanceConfig";
import type { CaravanState } from "../state/CaravanState";

const TS = BalanceConfig.TILE_SIZE;
const DT = CaravanBalance.SIM_TICK_MS / 1000;

export class CaravanCamera {
  private _shakeTimer = 0;
  private _shakeIntensity = 0;

  shake(intensity: number, duration: number): void {
    this._shakeTimer = Math.max(this._shakeTimer, duration);
    this._shakeIntensity = Math.max(this._shakeIntensity, intensity);
  }

  sync(s: CaravanState): void {
    const cam = viewManager.camera;

    // Follow the midpoint between player and caravan, biased toward caravan
    const mx = (s.player.position.x * 0.3 + s.caravan.position.x * 0.7) * TS;
    const my = (s.player.position.y * 0.3 + s.caravan.position.y * 0.7) * TS;

    const targetX = -mx + cam.screenW / (2 * cam.zoom);
    const targetY = -my + cam.screenH / (2 * cam.zoom);
    cam.x += (targetX - cam.x) * 0.1;
    cam.y += (targetY - cam.y) * 0.1;

    // Screen shake
    if (this._shakeTimer > 0) {
      this._shakeTimer -= DT;
      const shake = this._shakeIntensity * (this._shakeTimer / 0.2);
      cam.x += (Math.random() * 2 - 1) * shake;
      cam.y += (Math.random() * 2 - 1) * shake;
    }
  }
}
