// Placeholder circle/square per unit — colored by team, flipped by facing direction
import { Container, Graphics } from "pixi.js";
import type { Unit } from "@sim/entities/Unit";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { Direction, UnitState } from "@/types";

// ---------------------------------------------------------------------------
// Visual constants
// ---------------------------------------------------------------------------

const TS = BalanceConfig.TILE_SIZE;

// Team colors
const COLOR_WEST = 0x4488ff; // blue
const COLOR_EAST = 0xff4444; // red

// Unit shape radius (circle for most, square for knights)
const RADIUS = TS * 0.3;
const BORDER_COLOR = 0x000000;
const BORDER_ALPHA = 0.7;

// Health bar
const BAR_W = TS * 0.7;
const BAR_H = 4;
const BAR_Y_OFF = -(RADIUS + 8);
const HP_BG = 0x330000;
const HP_FILL = 0x44ff44;
const HP_DANGER = 0xff4444;

// Alpha states
const ALPHA_ALIVE = 1.0;
const ALPHA_DIE = 0.35;

// ---------------------------------------------------------------------------
// UnitView — one per unit entity
// ---------------------------------------------------------------------------

export class UnitView {
  readonly container = new Container();

  private _body = new Graphics();
  private _direction = new Graphics(); // small direction indicator triangle
  private _hpBg = new Graphics();
  private _hpFill = new Graphics();

  constructor(unit: Unit) {
    // Body
    this.container.addChild(this._body);

    // Direction indicator (small forward-pointing notch)
    this.container.addChild(this._direction);

    // HP bar background
    this._hpBg.rect(-BAR_W / 2, BAR_Y_OFF, BAR_W, BAR_H).fill({ color: HP_BG });
    this.container.addChild(this._hpBg);

    // HP fill (redrawn in update)
    this.container.addChild(this._hpFill);

    this._drawBody(unit);
    this.update(unit);
  }

  /** Sync position, flip, alpha, and HP bar to simulation data. */
  update(unit: Unit): void {
    const ts = TS;

    // World-space position (tile center)
    this.container.position.set(
      (unit.position.x + 0.5) * ts,
      (unit.position.y + 0.5) * ts,
    );

    // Depth sort key — set y as zIndex for sortable children
    this.container.zIndex = unit.position.y;

    // Flip horizontally when facing west
    this.container.scale.x = unit.facingDirection === Direction.WEST ? -1 : 1;

    // Alpha on death linger
    this.container.alpha =
      unit.state === UnitState.DIE ? ALPHA_DIE : ALPHA_ALIVE;

    // HP bar fill
    const pct = Math.max(0, unit.hp / unit.maxHp);
    const fillW = BAR_W * pct;
    const hpColor = pct < 0.3 ? HP_DANGER : HP_FILL;
    this._hpFill.clear();
    if (fillW > 0) {
      this._hpFill
        .rect(-BAR_W / 2, BAR_Y_OFF, fillW, BAR_H)
        .fill({ color: hpColor });
    }
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private _drawBody(unit: Unit): void {
    const color = unit.owner === "p1" ? COLOR_WEST : COLOR_EAST;

    this._body.clear();
    this._body
      .circle(0, 0, RADIUS)
      .fill({ color })
      .circle(0, 0, RADIUS)
      .stroke({ color: BORDER_COLOR, alpha: BORDER_ALPHA, width: 1.5 });

    // Small forward triangle pointing right (flipped via container.scale.x)
    this._direction.clear();
    this._direction
      .moveTo(RADIUS - 2, 0)
      .lineTo(RADIUS + 6, 0)
      .stroke({ color: 0xffffff, alpha: 0.8, width: 2 });
  }
}
