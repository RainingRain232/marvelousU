// HP bar overlay for the castle base
import { Container, Graphics } from "pixi.js";
import type { Base } from "@sim/entities/Base";
import { BalanceConfig } from "@sim/config/BalanceConfig";

// ---------------------------------------------------------------------------
// Visual constants
// ---------------------------------------------------------------------------

// Castle is 4×4 tiles; HP bar spans its full width
const BAR_W_TILES = 4;

const BAR_H = 8;
const BAR_Y_OFF = -14; // above the castle top
const HP_BG = 0x330000;
const HP_FILL = 0x44ff44;
const HP_DANGER = 0xff4444;

// ---------------------------------------------------------------------------
// BaseView — one per Base entity
// ---------------------------------------------------------------------------

export class BaseView {
  readonly container = new Container();

  private _hpBg = new Graphics();
  private _hpFill = new Graphics();

  constructor(base: Base) {
    const ts = BalanceConfig.TILE_SIZE;
    const pw = BAR_W_TILES * ts;

    // --- HP bar background ---
    this._hpBg.rect(0, BAR_Y_OFF, pw, BAR_H).fill({ color: HP_BG });
    this.container.addChild(this._hpBg);

    // --- HP bar fill ---
    this.container.addChild(this._hpFill);

    // Position in world space (tile origin → pixels)
    this.container.position.set(base.position.x * ts, base.position.y * ts);

    this.update(base);
  }

  /** Sync to current base health (call every frame or on damage events). */
  update(base: Base): void {
    const ts = BalanceConfig.TILE_SIZE;
    const pw = BAR_W_TILES * ts;
    const pct = Math.max(0, base.health / base.maxHealth);
    const fillW = pw * pct;
    const hpColor = pct < 0.3 ? HP_DANGER : HP_FILL;

    this._hpFill.clear();
    if (fillW > 0) {
      this._hpFill.rect(0, BAR_Y_OFF, fillW, BAR_H).fill({ color: hpColor });
    }
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
