// ---------------------------------------------------------------------------
// Survivor camera — camera follow + screen shake
// ---------------------------------------------------------------------------

import { BalanceConfig } from "@sim/config/BalanceConfig";
import { viewManager } from "@view/ViewManager";
import { SurvivorBalance } from "../config/SurvivorBalanceConfig";
import type { SurvivorState } from "../state/SurvivorState";

const TS = BalanceConfig.TILE_SIZE;
const DT = SurvivorBalance.SIM_TICK_MS / 1000;

export class SurvivorCamera {
  private _shakeTimer = 0;
  private _shakeIntensity = 0;

  shake(intensity: number, duration: number): void {
    this._shakeTimer = Math.max(this._shakeTimer, duration);
    this._shakeIntensity = Math.max(this._shakeIntensity, intensity);
  }

  sync(s: SurvivorState): void {
    const cam = viewManager.camera;
    const px = s.player.position.x * TS;
    const py = s.player.position.y * TS;

    // Smooth follow
    const targetX = -px + cam.screenW / (2 * cam.zoom);
    const targetY = -py + cam.screenH / (2 * cam.zoom);
    cam.x += (targetX - cam.x) * 0.12;
    cam.y += (targetY - cam.y) * 0.12;

    // Screen shake
    if (this._shakeTimer > 0) {
      this._shakeTimer -= DT;
      const shake = this._shakeIntensity * (this._shakeTimer / 0.2);
      cam.x += (Math.random() * 2 - 1) * shake;
      cam.y += (Math.random() * 2 - 1) * shake;
    }
  }
}
