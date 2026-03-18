// ---------------------------------------------------------------------------
// Terraria – Player sprite rendering
// ---------------------------------------------------------------------------

import { Container, Graphics } from "pixi.js";
import { TB } from "../config/TerrariaBalance";
import type { TerrariaState } from "../state/TerrariaState";
import type { TerrariaCamera } from "./TerrariaCamera";

const TS = TB.TILE_SIZE;

export class TerrariaPlayerView {
  readonly container = new Container();
  private _bodyGfx = new Graphics();
  private _toolGfx = new Graphics();
  private _walkFrame = 0;

  constructor() {
    this.container.addChild(this._bodyGfx);
    this.container.addChild(this._toolGfx);
  }

  draw(state: TerrariaState, camera: TerrariaCamera, dt: number): void {
    const p = state.player;
    const { sx, sy } = camera.worldToScreen(p.x, p.y + TB.PLAYER_HEIGHT / 2);

    // Walking animation
    if (Math.abs(p.vx) > 0.5 && p.onGround) {
      this._walkFrame += dt * 8;
    } else {
      this._walkFrame = 0;
    }
    const legOffset = Math.sin(this._walkFrame) * 2;

    this._bodyGfx.clear();

    const pw = TB.PLAYER_WIDTH * TS;
    const ph = TB.PLAYER_HEIGHT * TS;
    const halfW = pw / 2;

    // Invulnerability flash
    if (p.invulnTimer > 0 && Math.floor(p.invulnTimer * 10) % 2 === 0) {
      this.container.alpha = 0.4;
    } else {
      this.container.alpha = 1;
    }

    // Body (tunic)
    this._bodyGfx.rect(sx - halfW, sy - ph * 0.3, pw, ph * 0.45);
    this._bodyGfx.fill(0x2255AA);

    // Head
    this._bodyGfx.rect(sx - halfW * 0.7, sy - ph * 0.3 - pw * 0.8, pw * 0.7, pw * 0.8);
    this._bodyGfx.fill(0xFFCC99);

    // Eyes
    const eyeX = p.facingRight ? sx + halfW * 0.15 : sx - halfW * 0.35;
    this._bodyGfx.rect(eyeX, sy - ph * 0.3 - pw * 0.5, 2, 2);
    this._bodyGfx.fill(0x000000);

    // Legs
    this._bodyGfx.rect(sx - halfW * 0.6 + legOffset, sy + ph * 0.15, pw * 0.3, ph * 0.3);
    this._bodyGfx.fill(0x8B6914);
    this._bodyGfx.rect(sx + halfW * 0.1 - legOffset, sy + ph * 0.15, pw * 0.3, ph * 0.3);
    this._bodyGfx.fill(0x8B6914);

    // Arm with tool swing
    this._toolGfx.clear();
    if (p.attackTimer > 0) {
      const swingAngle = (1 - p.attackTimer / TB.ATTACK_COOLDOWN) * Math.PI;
      const armLen = TS * 1.2;
      const dir = p.facingRight ? 1 : -1;
      const ax = sx + dir * halfW * 0.5;
      const ay = sy - ph * 0.1;
      const ex = ax + Math.cos(swingAngle * dir - Math.PI / 4) * armLen;
      const ey = ay - Math.sin(swingAngle * dir - Math.PI / 4) * armLen;

      this._toolGfx.moveTo(ax, ay);
      this._toolGfx.lineTo(ex, ey);
      this._toolGfx.stroke({ color: 0xCCCCCC, width: 2 });
    }
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
