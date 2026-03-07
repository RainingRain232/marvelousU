// ---------------------------------------------------------------------------
// Survivor minimap — bottom-right corner showing enemy positions
// ---------------------------------------------------------------------------

import { Container, Graphics } from "pixi.js";
import type { SurvivorState } from "../state/SurvivorState";

const MAP_SIZE = 120; // display pixels
const BORDER = 2;
const BG_COLOR = 0x0a0a18;
const BG_ALPHA = 0.75;
const BORDER_COLOR = 0x445566;

export class SurvivorMinimap {
  readonly container = new Container();
  private _bg = new Graphics();
  private _entities = new Graphics();
  private _scaleX = 1;
  private _scaleY = 1;

  init(mapW: number, mapH: number, screenW: number, screenH: number): void {
    this.container.removeChildren();
    this._scaleX = MAP_SIZE / mapW;
    this._scaleY = MAP_SIZE / mapH;

    // Position bottom-right
    this.container.position.set(
      screenW - MAP_SIZE - BORDER * 2 - 10,
      screenH - MAP_SIZE - BORDER * 2 - 10,
    );

    // Background
    this._bg = new Graphics()
      .roundRect(0, 0, MAP_SIZE + BORDER * 2, MAP_SIZE + BORDER * 2, 4)
      .fill({ color: BG_COLOR, alpha: BG_ALPHA })
      .roundRect(0, 0, MAP_SIZE + BORDER * 2, MAP_SIZE + BORDER * 2, 4)
      .stroke({ color: BORDER_COLOR, width: 1 });
    this.container.addChild(this._bg);

    this._entities = new Graphics();
    this._entities.position.set(BORDER, BORDER);
    this.container.addChild(this._entities);
  }

  update(state: SurvivorState): void {
    this._entities.clear();

    // Draw hazard zones (translucent)
    for (const h of state.hazards) {
      let color = 0x444444;
      if (h.type === "lava") color = 0xff4422;
      else if (h.type === "ice") color = 0x88ccff;
      else if (h.type === "fog") color = 0x448844;
      else if (h.type === "thorns") color = 0x228822;
      this._entities.circle(
        h.position.x * this._scaleX,
        h.position.y * this._scaleY,
        h.radius * this._scaleX,
      ).fill({ color, alpha: 0.3 });
    }

    // Draw enemies as red dots (bosses as yellow, elites as orange)
    for (const e of state.enemies) {
      if (!e.alive) continue;
      const ex = e.position.x * this._scaleX;
      const ey = e.position.y * this._scaleY;
      if (e.isBoss || e.isDeathBoss) {
        this._entities.circle(ex, ey, 3).fill({ color: 0xffdd00 });
      } else if (e.eliteType) {
        this._entities.circle(ex, ey, 2).fill({ color: 0xff8844 });
      } else {
        this._entities.circle(ex, ey, 1).fill({ color: 0xff4444, alpha: 0.7 });
      }
    }

    // Draw permanent landmarks as white diamonds
    for (const lm of state.landmarks) {
      const lx = lm.position.x * this._scaleX;
      const ly = lm.position.y * this._scaleY;
      const s = 4;
      this._entities.moveTo(lx, ly - s).lineTo(lx + s, ly).lineTo(lx, ly + s).lineTo(lx - s, ly).closePath()
        .fill({ color: 0xffffff, alpha: 0.9 });
    }

    // Draw temporary landmarks as colored diamonds (pulsing)
    const pulseAlpha = 0.6 + Math.sin(Date.now() * 0.005) * 0.3;
    for (const tl of state.tempLandmarks) {
      const lx = tl.position.x * this._scaleX;
      const ly = tl.position.y * this._scaleY;
      const s = 3;
      const color = tl.type === "faction_hall" ? 0x4488ff
        : tl.type === "blacksmith" ? 0xff8844
        : 0x44ddaa;
      const fadeAlpha = tl.remaining < 10 ? (tl.remaining / 10) * pulseAlpha : pulseAlpha;
      this._entities.moveTo(lx, ly - s).lineTo(lx + s, ly).lineTo(lx, ly + s).lineTo(lx - s, ly).closePath()
        .fill({ color, alpha: fadeAlpha });
    }

    // Draw player as green dot
    const px = state.player.position.x * this._scaleX;
    const py = state.player.position.y * this._scaleY;
    this._entities.circle(px, py, 3).fill({ color: 0x44ff44 });
  }

  destroy(): void {
    this.container.removeChildren();
    this._bg.destroy();
    this._entities.destroy();
  }
}
