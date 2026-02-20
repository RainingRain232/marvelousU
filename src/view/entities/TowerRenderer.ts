// Procedural tower renderer for BuildingView.
//
// Draws a detailed medieval fantasy tower with:
//   • Tapered stone body with brick patterns
//   • Pointed conical roof
//   • Crenellated top below the roof
//   • Player-colored flag at the tip
//   • Hopping green frog at the base
//
// All drawing uses PixiJS Graphics. The tower container is 1×TILE_SIZE wide
// and 1×TILE_SIZE tall (standard building footprint).
// Animations are driven by `tick(dt, phase)`.

import { Container, Graphics } from "pixi.js";
import { GamePhase } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TS = 64; // tile size
const TW = 1 * TS; // tower width
const TH = 1 * TS; // tower height (footprint is 1x1, but visual height is taller)

// Palette
const COL_STONE = 0x8b8878;
const COL_STONE_LT = 0xa09d8f;
const COL_STONE_DK = 0x6b6860;
const COL_MORTAR = 0x9a9688;
const COL_ROOF = 0x5a2d2d;
const COL_ROOF_DK = 0x3d1515;
const COL_WINDOW = 0x1a1a2e;
const COL_WINDOW_FRAME = 0x555555;
const COL_MOSS = 0x4a6b3a;
const COL_FROG = 0x44aa22;
const COL_FROG_EYE = 0x000000;

// Animation timing
const FLAG_SPEED = 3.2; // radians/sec
const FROG_HOP_INTERVAL = 4.0; // seconds between hops
const FROG_HOP_DURATION = 0.6; // duration of a single hop

// ---------------------------------------------------------------------------
// TowerRenderer
// ---------------------------------------------------------------------------

export class TowerRenderer {
    readonly container = new Container();

    private _base = new Graphics();    // tower body, static details
    private _flag = new Graphics();    // waving flag at the top
    private _frog = new Graphics();    // hopping frog mascot

    private _flagTime = 0;
    private _frogTimer = 0;
    private _frogY0 = 0; // base Y position of frog

    private _playerColor: number;

    constructor(owner: string | null) {
        this._playerColor = owner === "p1" ? 0x4488ff : 0xff4444;

        this._drawStaticTower();
        this._drawFlag();
        this._drawFrog();

        this.container.addChild(this._base);
        this.container.addChild(this._flag);
        this.container.addChild(this._frog);

        // Position frog at base
        this._frogY0 = TH - 6;
        this._frog.position.set(TW / 2 - 4, this._frogY0);
    }

    /**
     * Tick animations each frame.
     *  - Waving flag
     *  - Hopping frog
     */
    tick(dt: number, _phase: GamePhase): void {
        // Flag
        this._flagTime += dt * FLAG_SPEED;
        this._updateFlag(this._flagTime);

        // Frog
        this._frogTimer += dt;
        if (this._frogTimer > FROG_HOP_INTERVAL) {
            const hopT = this._frogTimer - FROG_HOP_INTERVAL;
            if (hopT < FROG_HOP_DURATION) {
                // Parabolic hop
                const progress = hopT / FROG_HOP_DURATION;
                const hopH = 15; // pixels
                const jump = Math.sin(progress * Math.PI) * hopH;
                this._frog.y = this._frogY0 - jump;
                // Squash and stretch
                const scale = 1 + Math.sin(progress * Math.PI) * 0.3;
                this._frog.scale.set(1 / scale, scale);
            } else {
                // Reset after hop
                this._frogTimer = 0;
                this._frog.y = this._frogY0;
                this._frog.scale.set(1);
            }
        }
    }

    private _drawStaticTower(): void {
        const g = this._base;

        const bX = 12;
        const bW = TW - 24;
        const bH = TH + 20; // taller than footprint
        const bY = TH - bH + 10;

        // ── Tower Body ──
        g.rect(bX, bY, bW, bH)
            .fill({ color: COL_STONE })
            .stroke({ color: COL_STONE_DK, width: 1.5 });

        // Brick pattern
        this._drawBrickPattern(g, bX + 2, bY + 2, bW - 4, bH - 4);

        // ── Crenellations ──
        this._drawCrenellations(g, bX - 2, bY, bW + 4);

        // ── Roof ──
        const rH = 35;
        const rY = bY - rH + 4;
        g.moveTo(bX - 6, bY + 4)
            .lineTo(TW / 2, rY)
            .lineTo(bX + bW + 6, bY + 4)
            .closePath()
            .fill({ color: COL_ROOF })
            .stroke({ color: COL_ROOF_DK, width: 1 });

        // Roof detail (highlight)
        g.moveTo(TW / 2, rY)
            .lineTo(TW / 2 + 5, bY + 2)
            .lineTo(TW / 2, bY + 2)
            .closePath()
            .fill({ color: COL_ROOF, alpha: 0.6 });

        // ── Windows ──
        this._drawWindow(g, TW / 2 - 8, bY + 25, 16, 20);
        this._drawSmallWindow(g, bX + 6, bY + 70);
        this._drawSmallWindow(g, bX + bW - 12, bY + 70);

        // ── Moss ──
        this._drawMoss(g, bX + 4, TH - 5, 8);
        this._drawMoss(g, bX + bW - 10, TH - 8, 6);
    }

    private _drawBrickPattern(g: Graphics, x: number, y: number, w: number, h: number): void {
        for (let row = 0; row < h; row += 8) {
            const offset = (Math.floor(row / 8) % 2) * 12;
            g.moveTo(x, y + row)
                .lineTo(x + w, y + row)
                .stroke({ color: COL_MORTAR, width: 0.3, alpha: 0.25 });

            for (let col = offset; col < w; col += 24) {
                g.moveTo(x + col, y + row)
                    .lineTo(x + col, y + row + 8)
                    .stroke({ color: COL_MORTAR, width: 0.3, alpha: 0.25 });
            }
        }
    }

    private _drawCrenellations(g: Graphics, x: number, y: number, w: number): void {
        const merlonW = 6;
        const merlonH = 6;
        const gap = 4;
        const step = merlonW + gap;
        for (let mx = x + 2; mx < x + w - merlonW; mx += step) {
            g.rect(mx, y - merlonH, merlonW, merlonH)
                .fill({ color: COL_STONE_LT })
                .stroke({ color: COL_STONE_DK, width: 0.5 });
        }
    }

    private _drawWindow(g: Graphics, x: number, y: number, w: number, h: number): void {
        g.rect(x - 2, y - 2, w + 4, h + 4).fill({ color: COL_WINDOW_FRAME });
        g.rect(x, y, w, h).fill({ color: COL_WINDOW });
        g.ellipse(x + w / 2, y + 2, w / 2, 4).fill({ color: COL_WINDOW_FRAME });
        // Ledges
        g.rect(x - 4, y + h, w + 8, 3).fill({ color: COL_STONE_DK });
    }

    private _drawSmallWindow(g: Graphics, x: number, y: number): void {
        g.rect(x, y, 6, 12).fill({ color: COL_WINDOW }).stroke({ color: COL_WINDOW_FRAME, width: 0.5 });
    }

    private _drawMoss(g: Graphics, x: number, y: number, w: number): void {
        g.ellipse(x + w / 2, y, w / 2, 2.5).fill({ color: COL_MOSS, alpha: 0.5 });
    }

    private _drawFlag(): void {
        const bY = TH - (TH + 20) + 10;
        const rH = 35;
        this._flag.position.set(TW / 2, bY - rH + 4);
    }

    private _updateFlag(time: number): void {
        const g = this._flag;
        g.clear();

        // Pole
        g.moveTo(0, 0).lineTo(0, -18).stroke({ color: 0x999999, width: 1.5 });

        // Wave
        const w1 = Math.sin(time) * 2;
        const w2 = Math.sin(time * 1.4 + 0.8) * 3;
        const w3 = Math.sin(time * 0.8 + 1.5) * 2;
        const fW = 14;
        const fH = 10;

        g.moveTo(0, -18)
            .bezierCurveTo(fW * 0.3, -18 + w1, fW * 0.7, -18 + w2, fW, -18 + w3)
            .lineTo(fW, -18 + fH + w3)
            .bezierCurveTo(fW * 0.7, -18 + fH + w2, fW * 0.3, -18 + fH + w1, 0, -18 + fH)
            .closePath()
            .fill({ color: this._playerColor });
    }

    private _drawFrog(): void {
        const g = this._frog;
        g.clear();

        // Body
        g.circle(0, 0, 4).fill({ color: COL_FROG });
        // Eyes
        g.circle(-2, -2, 1.5).fill({ color: 0xffffff }).circle(-2.2, -2.5, 0.6).fill({ color: COL_FROG_EYE });
        g.circle(2, -2, 1.5).fill({ color: 0xffffff }).circle(1.8, -2.5, 0.6).fill({ color: COL_FROG_EYE });
        // Legs
        g.moveTo(-4, 0).bezierCurveTo(-6, 2, -6, 4, -4, 4).stroke({ color: COL_FROG, width: 2 });
        g.moveTo(4, 0).bezierCurveTo(6, 2, 6, 4, 4, 4).stroke({ color: COL_FROG, width: 2 });

        g.pivot.set(0, 4); // pivot at feet for squash/stretch
    }

    destroy(): void {
        this.container.destroy({ children: true });
    }
}
