// Castle/base sprite with damage states
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { Base } from "@sim/entities/Base";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { Direction } from "@/types";

// ---------------------------------------------------------------------------
// Visual constants
// ---------------------------------------------------------------------------

/** Fill color per player direction (placeholder — west = blue, east = red). */
const BASE_COLORS: Partial<Record<Direction, number>> = {
  [Direction.WEST]: 0x1a4a8b, // deep blue
  [Direction.EAST]: 0x8b1a1a, // deep red
};
const BASE_COLOR_DEFAULT = 0x555555;

const BORDER_COLOR = 0xffd700; // gold border for the main base
const BORDER_WIDTH = 3;

// Footprint: bases use a 3×3 tile area
const BASE_FOOTPRINT_W = 3;
const BASE_FOOTPRINT_H = 3;

const BAR_H = 8;
const BAR_Y_OFF = -14; // above the base rect
const HP_BG = 0x330000;
const HP_FILL = 0x44ff44;
const HP_DANGER = 0xff4444;

const LABEL_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 12,
  fontWeight: "bold",
  fill: 0xffd700,
  align: "center",
});

// ---------------------------------------------------------------------------
// BaseView — one per Base entity
// ---------------------------------------------------------------------------

export class BaseView {
  readonly container = new Container();

  private _body = new Graphics();
  private _hpBg = new Graphics();
  private _hpFill = new Graphics();
  private _label = new Text({ text: "", style: LABEL_STYLE });

  constructor(base: Base) {
    const ts = BalanceConfig.TILE_SIZE;
    const pw = BASE_FOOTPRINT_W * ts;
    const ph = BASE_FOOTPRINT_H * ts;
    const color = BASE_COLORS[base.direction] ?? BASE_COLOR_DEFAULT;

    // --- Body ---
    this._body
      .rect(0, 0, pw, ph)
      .fill({ color })
      .rect(0, 0, pw, ph)
      .stroke({ color: BORDER_COLOR, width: BORDER_WIDTH });
    this.container.addChild(this._body);

    // --- HP bar background ---
    this._hpBg.rect(0, BAR_Y_OFF, pw, BAR_H).fill({ color: HP_BG });
    this.container.addChild(this._hpBg);

    // --- HP bar fill ---
    this.container.addChild(this._hpFill);

    // --- Label ---
    const side = base.direction === Direction.WEST ? "W" : "E";
    this._label.text = `BASE ${side}`;
    this._label.anchor.set(0.5, 0.5);
    this._label.position.set(pw / 2, ph / 2);
    this.container.addChild(this._label);

    // Position in world space (tile origin → pixels)
    this.container.position.set(base.position.x * ts, base.position.y * ts);

    this.update(base);
  }

  /** Sync to current base health (call every frame or on damage events). */
  update(base: Base): void {
    const ts = BalanceConfig.TILE_SIZE;
    const pw = BASE_FOOTPRINT_W * ts;
    const pct = Math.max(0, base.health / base.maxHealth);
    const fillW = pw * pct;
    const hpColor = pct < 0.3 ? HP_DANGER : HP_FILL;

    this._hpFill.clear();
    if (fillW > 0) {
      this._hpFill.rect(0, BAR_Y_OFF, fillW, BAR_H).fill({ color: hpColor });
    }

    // Dim heavily when base is nearly dead
    this._body.alpha = 0.4 + pct * 0.6;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
