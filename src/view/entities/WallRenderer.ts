// Procedural wall renderer for BuildingView.
//
// Draws a 1x3 stone wall section with:
//   • Multiple stone block rows with staggered mortar
//   • Crenellations along the top edge
//   • Moss patches at the base
//
// Since it's 1x3 (vertical), it can be used for building long vertical barriers.

import { Container, Graphics } from "pixi.js";
import { GamePhase } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TS = 64; // tile size
const WW = 1 * TS; // wall width
const WH = 3 * TS; // wall height (footprint is 1x3)

// Palette (matching Tower/Castle)
const COL_STONE = 0x8b8878;
const COL_STONE_LT = 0xa09d8f;
const COL_STONE_DK = 0x6b6860;
const COL_MORTAR = 0x9a9688;
const COL_MOSS = 0x4a6b3a;

// ---------------------------------------------------------------------------
// WallRenderer
// ---------------------------------------------------------------------------

export class WallRenderer {
    readonly container = new Container();
    private _base = new Graphics();

    constructor() {
        this._drawWall();
        this.container.addChild(this._base);
    }

    /** Wall is static, no tick animation needed for now. */
    tick(_dt: number, _phase: GamePhase): void { }

    private _drawWall(): void {
        const g = this._base;

        const bX = 10;
        const bW = WW - 20;
        const bH = WH;
        const bY = 0;

        // ── Main Wall Body ──
        g.rect(bX, bY, bW, bH)
            .fill({ color: COL_STONE })
            .stroke({ color: COL_STONE_DK, width: 2 });

        // Brick pattern (spanning the whole 1x3 height)
        this._drawBrickPattern(g, bX + 2, bY + 2, bW - 4, bH - 4);

        // ── Crenellations on top ──
        this._drawCrenellations(g, bX - 2, bY, bW + 4);

        // ── Moss at base ──
        this._drawMoss(g, bX + 4, WH - 5, 12);
        this._drawMoss(g, bX + bW - 14, WH - 8, 10);
        this._drawMoss(g, bX + 6, WH - 10, 8);
    }

    private _drawBrickPattern(g: Graphics, x: number, y: number, w: number, h: number): void {
        for (let row = 0; row < h; row += 12) {
            const offset = (Math.floor(row / 12) % 2) * 16;
            g.moveTo(x, y + row)
                .lineTo(x + w, y + row)
                .stroke({ color: COL_MORTAR, width: 0.4, alpha: 0.3 });

            for (let col = offset; col < w; col += 32) {
                g.moveTo(x + col, y + row)
                    .lineTo(x + col, y + row + 12)
                    .stroke({ color: COL_MORTAR, width: 0.4, alpha: 0.3 });
            }
        }
    }

    private _drawCrenellations(g: Graphics, x: number, y: number, w: number): void {
        const merlonW = 10;
        const merlonH = 8;
        const gap = 6;
        const step = merlonW + gap;
        for (let mx = x + 4; mx < x + w - merlonW; mx += step) {
            g.rect(mx, y - merlonH, merlonW, merlonH)
                .fill({ color: COL_STONE_LT })
                .stroke({ color: COL_STONE_DK, width: 1 });
        }
    }

    private _drawMoss(g: Graphics, x: number, y: number, w: number): void {
        g.ellipse(x + w / 2, y, w / 2, 3).fill({ color: COL_MOSS, alpha: 0.55 });
    }

    destroy(): void {
        this.container.destroy({ children: true });
    }
}
